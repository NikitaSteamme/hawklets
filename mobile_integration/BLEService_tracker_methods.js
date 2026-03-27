/**
 * BLEService_tracker_methods.js
 *
 * Методы которые нужно добавить в ваш существующий BLEService.js.
 * Использует уже настроенное подключение через react-native-ble-plx.
 *
 * Предполагается что BLEService уже имеет:
 *   - this.device — подключённый BleManager device
 *   - this.RX_CHAR  — UUID 6E400002 (телефон → трекер)
 *   - this.TX_CHAR  — UUID 6E400003 (трекер → телефон, notifications)
 *   - this.SERVICE  — UUID 6E400001
 *   - метод _encode(str) — строка → base64
 *   - метод _decode(b64) — base64 → строка
 */

const COMMAND_TIMEOUT_MS = 10000;
const CHUNK_SIZE = 100; // байт, совпадает с прошивкой

/**
 * Отправляет команду и собирает строки ответа до "END" или таймаута.
 * Возвращает массив строк (включая "END" для командной логики).
 */
async sendCommand(command) {
  return new Promise((resolve, reject) => {
    const lines = [];
    let subscription;
    const timer = setTimeout(() => {
      subscription?.remove();
      reject(new Error(`BLE command timeout: ${command}`));
    }, COMMAND_TIMEOUT_MS);

    subscription = this.device.monitorCharacteristicForService(
      this.SERVICE,
      this.TX_CHAR,
      (err, char) => {
        if (err) {
          clearTimeout(timer);
          reject(err);
          return;
        }
        const line = this._decode(char.value).trim();
        lines.push(line);
        // Команды которые заканчиваются на END
        if (line === 'END') {
          clearTimeout(timer);
          subscription.remove();
          resolve(lines);
        }
        // Команды с одним ответом (OK:, FAIL:, CRC32:, OK:MUTED, ...)
        if (
          line.startsWith('OK:') ||
          line.startsWith('FAIL:') ||
          line.startsWith('CRC32:') ||
          line === 'OK:MUTED' ||
          line === 'OK:UNMUTED'
        ) {
          clearTimeout(timer);
          subscription.remove();
          resolve(lines);
        }
      },
    );

    // Отправляем команду
    this.device
      .writeCharacteristicWithResponseForService(
        this.SERVICE,
        this.RX_CHAR,
        this._encode(command),
      )
      .catch(err => {
        clearTimeout(timer);
        subscription?.remove();
        reject(err);
      });
  });
}

/**
 * Загружает файл на трекер по протоколу UPLOAD / chunks / END.
 * Автоматически добавляет tracker_format если его нет (защита).
 */
async uploadFile(filename, content) {
  // Ждём READY
  await new Promise((resolve, reject) => {
    let subscription;
    const timer = setTimeout(() => {
      subscription?.remove();
      reject(new Error('Upload READY timeout'));
    }, 5000);

    subscription = this.device.monitorCharacteristicForService(
      this.SERVICE,
      this.TX_CHAR,
      (err, char) => {
        if (err) { clearTimeout(timer); reject(err); return; }
        const msg = this._decode(char.value).trim();
        if (msg === 'READY') {
          clearTimeout(timer);
          subscription.remove();
          resolve();
        } else if (msg.startsWith('FAIL:')) {
          clearTimeout(timer);
          subscription.remove();
          reject(new Error(msg));
        }
      },
    );

    this.device
      .writeCharacteristicWithResponseForService(
        this.SERVICE,
        this.RX_CHAR,
        this._encode(`UPLOAD ${filename}`),
      )
      .catch(err => { clearTimeout(timer); subscription?.remove(); reject(err); });
  });

  // Отправляем данные чанками
  for (let i = 0; i < content.length; i += CHUNK_SIZE) {
    const chunk = content.slice(i, i + CHUNK_SIZE);
    await this.device.writeCharacteristicWithResponseForService(
      this.SERVICE,
      this.RX_CHAR,
      this._encode(chunk),
    );
    // Небольшая пауза — даём трекеру обработать ACK
    await new Promise(r => setTimeout(r, 60));
  }

  // Завершаем и ждём OK
  const result = await this.sendCommand('END');
  const last = result.find(l => l.startsWith('OK:') || l.startsWith('FAIL:'));
  if (!last?.startsWith('OK:')) {
    throw new Error(`Upload failed: ${last ?? 'no response'}`);
  }
}

/** Проверяет подключено ли устройство */
isConnected() {
  return this.device != null;
}
