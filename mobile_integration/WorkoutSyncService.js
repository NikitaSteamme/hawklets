/**
 * WorkoutSyncService.js
 *
 * Синхронизирует тренировки между приложением и трекером.
 * Вызывается из BLEService при подключении устройства,
 * и явно — при изменении тренировок в приложении.
 *
 * Зависимости:
 *   - react-native-ble-plx (через BLEService)
 *   - @react-native-async-storage/async-storage
 *   - crc-32 (npm install crc-32) ИЛИ встроенный полифил ниже
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Константы ──────────────────────────────────────────────────────────────

export const TRACKER_FORMAT_VERSION = 1;
export const MAX_TRACKER_WORKOUTS = 4;

// Ключ очереди отложенной синхронизации в AsyncStorage
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
 * ВАЖНО: при изменении структуры увеличивайте TRACKER_FORMAT_VERSION
 * и обновляйте прошивку (WORKOUT_FORMAT.md).
 *
 * @param {object} apiWorkout — тренировка из API
 * @returns {string} JSON-строка для загрузки на трекер
 */
export function formatWorkoutForTracker(apiWorkout) {
  const tracker = {
    tracker_format: TRACKER_FORMAT_VERSION,
    title: apiWorkout.title,
    restBetweenExercisesSec: apiWorkout.restBetweenExercisesSec ?? 60,
    exercises: (apiWorkout.exercises ?? []).map(ex => {
      const base = {
        name: ex.name,
        type: ex.type,             // "imu" | "cardio" | "timed"
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
          repDurationSec: ex.repDurationSec,
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
 * Используем ID воркаута чтобы переименование тайтла не создавало дубликаты.
 */
export function workoutFilename(workoutId) {
  return `w_${workoutId}.json`;
}

// ─── Основной сервис синхронизации ───────────────────────────────────────────

export class WorkoutSyncService {
  /**
   * @param {object} bleService — ваш BLEService (должен предоставлять
   *   sendCommand(cmd): Promise<string[]> — отправляет команду и собирает
   *   строки ответа до получения строки "END" или таймаута.
   *   uploadFile(filename, content): Promise<void> — реализует протокол
   *   UPLOAD / chunks / END.
   */
  constructor(bleService) {
    this.ble = bleService;
  }

  /**
   * Вызывать при каждом подключении к трекеру.
   * Сравнивает содержимое трекера с очередью синхронизации
   * и актуальным списком тренировок из приложения.
   *
   * @param {object[]} appWorkouts — список тренировок из приложения/API
   *   [{id, title, ...}], максимум MAX_TRACKER_WORKOUTS
   */
  async syncOnConnect(appWorkouts) {
    console.log('[Sync] Starting workout sync');

    // 1. Получаем что сейчас на трекере
    const trackerFiles = await this._listDetail();
    console.log('[Sync] Tracker files:', trackerFiles);

    // 2. Определяем целевой набор (макс. 4)
    const targetWorkouts = appWorkouts.slice(0, MAX_TRACKER_WORKOUTS);

    // 3. Вычисляем ожидаемый CRC для каждой целевой тренировки
    const targetMap = new Map(); // filename → { workout, content, crc32 }
    for (const w of targetWorkouts) {
      const filename = workoutFilename(w.id);
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
  }

  /**
   * Вызывать когда тренировка изменена/создана/удалена в приложении.
   * Если трекер подключён — синхронизируем сразу.
   * Если нет — добавляем в очередь, синхронизируем при следующем подключении.
   *
   * @param {'upsert'|'delete'} action
   * @param {object} workout — тренировка из API
   * @param {object[]} allWorkouts — полный текущий список тренировок
   */
  async onWorkoutChanged(action, workout, allWorkouts) {
    if (this.ble.isConnected()) {
      await this.syncOnConnect(allWorkouts);
    } else {
      await this._enqueueSync(workout.id, action);
    }
  }

  /**
   * Проверяет есть ли отложенные изменения и синхронизирует их.
   * Вызывать после syncOnConnect если хотите обработать очередь отдельно,
   * или просто передавать полный список тренировок в syncOnConnect.
   */
  async hasPendingSync() {
    const queue = await this._getPendingQueue();
    return queue.length > 0;
  }

  // ─── Парсинг ответа LIST_DETAIL ─────────────────────────────────────────

  async _listDetail() {
    const lines = await this.ble.sendCommand('LIST_DETAIL');
    const files = [];
    for (const line of lines) {
      if (line === 'END' || line === '') continue;
      const parts = line.split(':');
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
    // Убираем дубликаты для того же ID
    const filtered = queue.filter(item => item.workoutId !== workoutId);
    filtered.push({ workoutId, action, ts: Date.now() });
    await AsyncStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(filtered));
  }

  async _clearPendingQueue() {
    await AsyncStorage.removeItem(PENDING_SYNC_KEY);
  }
}
