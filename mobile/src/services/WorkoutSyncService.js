/**
 * WorkoutSyncService.js
 *
 * Синхронизирует тренировки между приложением и трекером.
 * Вызывается из BLEService при подключении устройства,
 * и явно — при изменении тренировок в приложении.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Константы ──────────────────────────────────────────────────────────────

export const TRACKER_FORMAT_VERSION = 1;
export const MAX_TRACKER_WORKOUTS = 4;

const PENDING_SYNC_KEY = '@tracker_pending_sync';

// ─── CRC32 (стандартный полином 0xEDB88320) ─────────────────────────────────
// Должен совпадать с реализацией на стороне прошивки (computeFileCrc32).

function crc32(str) {
  let crc = 0xffffffff;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i);
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return ((crc ^ 0xffffffff) >>> 0).toString(16).padStart(8, '0');
}

// ─── Форматирование тренировки для трекера ───────────────────────────────────

/**
 * Конвертирует объект тренировки из формата API в формат трекера.
 *
 * Поддерживает два входных формата:
 *   1. Расширенный: { title, exercises: [{name, type, sets, ...}] }
 *   2. API-формат:  { title, items: [{exercise_id, target_sets, ...}] }
 *
 * ВАЖНО: при изменении структуры увеличивайте TRACKER_FORMAT_VERSION
 * и обновляйте прошивку одновременно.
 */
export function formatWorkoutForTracker(apiWorkout) {
  // Normalize exercises array from either format
  let rawExercises;
  if (apiWorkout.exercises) {
    rawExercises = apiWorkout.exercises;
  } else {
    // Map from our API items format
    rawExercises = (apiWorkout.items ?? []).map(item => {
      // exercise_type comes from exercises_global.default_tracking.type (populated by backend)
      // Fall back to duration-based heuristic only if type is completely absent
      const type = item.exercise_type || (item.target_duration_sec ? 'timed' : 'imu');
      console.log(`[Sync] Exercise "${item.exercise_name || item.exercise_id}": type=${type} (exercise_type=${item.exercise_type}, duration=${item.target_duration_sec})`);
      return {
        name: item.exercise_name || item.exercise_id,
        type,
        sets: item.target_sets ?? 3,
        restAfterSetSec: item.rest_sec ?? 90,
        reps: item.target_reps_min ?? item.target_reps_max ?? 10,
        durationSec: item.target_duration_sec ?? null,
        inactivityTimeoutMs: 45000,
      };
    });
  }

  const tracker = {
    tracker_format: TRACKER_FORMAT_VERSION,
    title: apiWorkout.title,
    restBetweenExercisesSec: apiWorkout.restBetweenExercisesSec ?? 60,
    exercises: rawExercises.map(ex => {
      const base = {
        name: ex.name,
        type: ex.type,
        sets: ex.sets,
        restAfterSetSec: ex.restAfterSetSec ?? 90,
      };

      if (ex.type === 'imu') {
        return {
          ...base,
          reps: String(ex.reps ?? 10),
          inactivityTimeoutMs: ex.inactivityTimeoutMs ?? 45000,
        };
      }
      if (ex.type === 'cardio') {
        return { ...base, durationSec: ex.durationSec };
      }
      if (ex.type === 'timed') {
        return {
          ...base,
          reps: String(ex.reps ?? 3),
          repDurationSec: ex.repDurationSec ?? ex.durationSec,
          restAfterRepSec: ex.restAfterRepSec ?? 30,
        };
      }
      return base;
    }),
  };

  return JSON.stringify(tracker);
}

/**
 * Возвращает стабильное имя файла для тренировки на трекере.
 * SPIFFS на ESP32 поддерживает максимум 31 символ включая ведущий '/'.
 * Берём первые 24 символа UUID (без дефисов) → "w_" + 24 + ".json" = 30 символов.
 */
export function workoutFilename(workoutId) {
  // SPIFFS on ESP32 allows max 31 chars for the full path including leading '/'.
  // '/w_' (3) + id (20) + '.json' (5) = 28 chars — safely under the limit.
  const short = String(workoutId).replace(/-/g, '').slice(0, 20);
  return `w_${short}.json`;
}

// ─── Основной сервис синхронизации ───────────────────────────────────────────

export class WorkoutSyncService {
  /**
   * @param {object} bleService — BLEService instance, должен предоставлять:
   *   sendCommand(cmd): Promise<string[]>
   *   uploadFile(filename, content): Promise<void>
   *   isConnected(): boolean
   */
  constructor(bleService) {
    this.ble = bleService;
  }

  /**
   * Вызывать при каждом подключении к трекеру.
   * Сравнивает содержимое трекера с актуальным списком тренировок из приложения.
   *
   * @param {object[]} appWorkouts — список тренировок из API, макс. MAX_TRACKER_WORKOUTS
   */
  async syncOnConnect(appWorkouts) {
    if (!appWorkouts || appWorkouts.length === 0) {
      console.log('[Sync] No workouts to sync');
      return;
    }
    console.log('[Sync] Starting workout sync');

    try {
      // 1. Получаем что сейчас на трекере
      const trackerFiles = await this._listDetail();
      console.log('[Sync] Tracker files:', trackerFiles);

      // 2. Целевой набор (макс. MAX_TRACKER_WORKOUTS)
      const targetWorkouts = appWorkouts.slice(0, MAX_TRACKER_WORKOUTS);

      // 3. Вычисляем ожидаемый CRC для каждой целевой тренировки
      const targetMap = new Map(); // filename → { workout, content, crc }
      for (const w of targetWorkouts) {
        const id = w.id || w._id;
        const filename = workoutFilename(id);
        const content = formatWorkoutForTracker(w);
        const crc = crc32(content);
        targetMap.set(filename, { workout: w, content, crc });
      }

      // 4. Удаляем файлы которых не должно быть на трекере
      for (const tf of trackerFiles) {
        if (!targetMap.has(tf.name)) {
          console.log('[Sync] Deleting', tf.name);
          await this.ble.sendCommand(`DELETE ${tf.name}`);
        }
      }

      // 5. Загружаем новые или изменённые тренировки
      const trackerMap = new Map(trackerFiles.map(f => [f.name, f]));
      for (const [filename, { content, crc }] of targetMap) {
        const existing = trackerMap.get(filename);
        if (existing && existing.crc32 === crc) {
          console.log('[Sync] Up to date:', filename);
          continue;
        }
        console.log('[Sync] Uploading:', filename, existing ? '(changed)' : '(new)');
        await this.ble.uploadFile(filename, content);
      }

      // 6. Сбрасываем очередь отложенной синхронизации
      await this._clearPendingQueue();
      console.log('[Sync] Sync complete');
    } catch (err) {
      console.error('[Sync] Sync error:', err.message);
      throw err; // propagate so the caller can show the failure alert
    }
  }

  /**
   * Вызывать когда тренировка изменена/создана/удалена в приложении.
   * Если трекер подключён — синхронизируем сразу.
   * Если нет — добавляем в очередь (синхронизируется при следующем подключении).
   *
   * @param {'upsert'|'delete'} action
   * @param {object} workout — изменённая тренировка
   * @param {object[]} allWorkouts — полный актуальный список тренировок
   */
  async onWorkoutChanged(action, workout, allWorkouts) {
    if (this.ble.isConnected()) {
      await this.syncOnConnect(allWorkouts);
    } else {
      const id = workout?.id || workout?._id;
      if (id) await this._enqueueSync(id, action);
    }
  }

  async hasPendingSync() {
    const queue = await this._getPendingQueue();
    return queue.length > 0;
  }

  // ─── Парсинг ответа LIST_DETAIL ─────────────────────────────────────────

  async _listDetail() {
    const chunks = await this.ble.sendCommand('LIST_DETAIL');

    // Firmware sends LIST_DETAIL as 100-char BLE notifications, with \n-separated
    // entries inside each chunk. A single entry may span two chunks.
    // Concatenate all chunks (excluding the terminal "END") then split on newlines.
    const rawText = chunks.filter(c => c !== 'END').join('');
    const files = [];
    for (const line of rawText.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const parts = trimmed.split(':');
      if (parts.length === 3) {
        files.push({
          name: parts[0],
          size: parseInt(parts[1], 10),
          crc32: parts[2],
        });
      }
    }
    return files;
  }

  // ─── Очередь отложенной синхронизации (AsyncStorage) ────────────────────

  async _getPendingQueue() {
    try {
      const raw = await AsyncStorage.getItem(PENDING_SYNC_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  async _enqueueSync(workoutId, action) {
    const queue = await this._getPendingQueue();
    const filtered = queue.filter(item => item.workoutId !== workoutId);
    filtered.push({ workoutId, action, ts: Date.now() });
    await AsyncStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(filtered));
  }

  async _clearPendingQueue() {
    await AsyncStorage.removeItem(PENDING_SYNC_KEY);
  }
}
