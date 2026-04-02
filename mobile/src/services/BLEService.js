import { Platform, PermissionsAndroid } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://hawklets.com/api';
const API_KEY = process.env.EXPO_PUBLIC_API_KEY || 'your-api-key-change-in-production';

const COMMAND_TIMEOUT_MS = 10000;
const CHUNK_SIZE = 100; // bytes, must match firmware

let BleManager;
let manager;

try {
  BleManager = require('react-native-ble-plx').BleManager;
  manager = new BleManager();
} catch (error) {
  console.warn('BLE not available:', error.message);
}

class BLEService {
  constructor() {
    this.manager = manager || null;
    this.device = null;

    // NUS (Nordic UART Service) UUIDs
    this.serviceUUID          = '6E400001-B5A3-F393-E0A9-E50E24DCCA9E';
    this.txCharacteristicUUID = '6E400002-B5A3-F393-E0A9-E50E24DCCA9E'; // phone → tracker (WRITE)
    this.rxCharacteristicUUID = '6E400003-B5A3-F393-E0A9-E50E24DCCA9E'; // tracker → phone (NOTIFY)

    // Aliases used by sendCommand / uploadFile (tracker perspective naming)
    this.SERVICE  = this.serviceUUID;
    this.RX_CHAR  = this.txCharacteristicUUID; // tracker's RX = phone's TX
    this.TX_CHAR  = this.rxCharacteristicUUID; // tracker's TX = phone's RX

    // Internal connection flag (use isConnected() method externally)
    this._connected = false;

    // Raw data callback — used by DeviceConnectionScreen for the log pane
    this.onDataReceived = null;
    // Called when connection state changes (true = connected, false = disconnected)
    this.onConnectionStateChange = null;
    // Called once after connection + notifications are fully set up
    this.onConnected = null;

    // Tracker event callbacks
    this.onRepUpdate   = null; // (repCount, exerciseName) => void
    this.onSetDone     = null; // (restSec, exerciseName, setNum, repsCompleted) => void
    this.onRestEnd     = null; // () => void
    this.onWorkoutDone = null; // () => void

    // Single-slot for the currently-awaited command response.
    // sendCommand / uploadFile set this instead of creating a second subscription.
    this._pendingCommandHandler = null;
  }

  // ─── Public API ────────────────────────────────────────────────────────────

  isConnected() {
    return this._connected;
  }

  async requestPermissions() {
    if (Platform.OS !== 'android') return true;

    try {
      // Android 12+ (API 31+) requires BLUETOOTH_SCAN and BLUETOOTH_CONNECT
      // at runtime in addition to location.
      if (Platform.Version >= 31) {
        const results = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ]);
        const allGranted = Object.values(results).every(
          r => r === PermissionsAndroid.RESULTS.GRANTED
        );
        if (!allGranted) {
          console.warn('BLE permissions not fully granted:', results);
        }
        return allGranted;
      }

      // Android < 12 — only location needed
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Bluetooth Permission',
          message: 'This app needs location permission to scan for Bluetooth devices.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      console.error('Permission request error:', err);
      return false;
    }
  }

  startScanning(onDeviceFound) {
    this.manager.startDeviceScan(null, null, (error, device) => {
      if (error) {
        console.error('Scan error:', error);
        return;
      }
      // Show all devices that have a visible name so the user can pick their tracker.
      // Anonymous BLE beacons (no name) are skipped to keep the list clean.
      if (device.name) {
        onDeviceFound(device);
      }
    });
  }

  stopScanning() {
    this.manager.stopDeviceScan();
  }

  async connectToDevice(deviceId) {
    try {
      this.device = await this.manager.connectToDevice(deviceId);
      // Negotiate larger MTU so firmware's 100-byte BLE notifications arrive intact.
      // Default MTU is 23 bytes (20 usable); without this, chunks are silently truncated.
      try {
        await this.device.requestMTU(512);
        console.log('MTU negotiated');
      } catch (mtuErr) {
        console.warn('MTU negotiation failed (continuing):', mtuErr.message);
      }
      await this.device.discoverAllServicesAndCharacteristics();
      this._connected = true;
      await this._setupNotifications();
      if (this.onConnectionStateChange) this.onConnectionStateChange(true);
      if (this.onConnected) this.onConnected();
      console.log('Connected to device:', deviceId);
      return true;
    } catch (error) {
      console.error('Connection error:', error);
      this._connected = false;
      return false;
    }
  }

  async disconnect() {
    if (this.device) {
      try {
        await this.device.cancelConnection();
      } catch (error) {
        console.error('Disconnect error:', error);
      }
    }
    this.device = null;
    this._connected = false;
    this._pendingCommandHandler = null;
    if (this.onConnectionStateChange) this.onConnectionStateChange(false);
  }

  getDeviceInfo() {
    if (!this.device) return null;
    return {
      id: this.device.id,
      name: this.device.name || 'Unknown Device',
      isConnected: this._connected,
    };
  }

  // ─── Command / file transfer API (used by WorkoutSyncService) ─────────────

  /**
   * Sends a text command and collects response lines until:
   *   - a line is "END"
   *   - a line starts with OK:, FAIL:, or CRC32:
   *   - timeout (COMMAND_TIMEOUT_MS)
   *
   * Creates its own subscription for the duration of the command so it works
   * independently of the persistent _setupNotifications subscription.
   */
  sendCommand(command) {
    return new Promise((resolve, reject) => {
      const lines = [];
      const timer = setTimeout(() => {
        this._pendingCommandHandler = null;
        reject(new Error(`BLE command timeout: ${command}`));
      }, COMMAND_TIMEOUT_MS);

      this._pendingCommandHandler = (line) => {
        lines.push(line);
        if (
          line === 'END' ||
          line.startsWith('OK:') ||
          line.startsWith('FAIL:') ||
          line.startsWith('CRC32:')
        ) {
          clearTimeout(timer);
          this._pendingCommandHandler = null;
          resolve(lines);
        }
      };

      this.device
        .writeCharacteristicWithResponseForService(
          this.SERVICE,
          this.RX_CHAR,
          this._encodeBase64(command),
        )
        .catch(err => {
          clearTimeout(timer);
          this._pendingCommandHandler = null;
          reject(err);
        });
    });
  }

  /**
   * Uploads a file to the tracker using the UPLOAD / chunks / END protocol.
   * Throws if the tracker responds with FAIL: or no OK:.
   */
  async uploadFile(filename, content) {
    // Send UPLOAD command and wait for READY
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this._pendingCommandHandler = null;
        reject(new Error('Upload READY timeout'));
      }, 5000);

      this._pendingCommandHandler = (msg) => {
        if (msg === 'READY') {
          clearTimeout(timer);
          this._pendingCommandHandler = null;
          resolve();
        } else if (msg.startsWith('FAIL:')) {
          clearTimeout(timer);
          this._pendingCommandHandler = null;
          reject(new Error(msg));
        }
      };

      this.device
        .writeCharacteristicWithResponseForService(
          this.SERVICE,
          this.RX_CHAR,
          this._encodeBase64(`UPLOAD ${filename}`),
        )
        .catch(err => {
          clearTimeout(timer);
          this._pendingCommandHandler = null;
          reject(err);
        });
    });

    // Send content in chunks
    for (let i = 0; i < content.length; i += CHUNK_SIZE) {
      const chunk = content.slice(i, i + CHUNK_SIZE);
      await this.device.writeCharacteristicWithResponseForService(
        this.SERVICE,
        this.RX_CHAR,
        this._encodeBase64(chunk),
      );
      // Small delay for tracker to process and ACK
      await new Promise(r => setTimeout(r, 60));
    }

    // Send END and wait for OK:/FAIL:
    const result = await this.sendCommand('END');
    const last = result.find(l => l.startsWith('OK:') || l.startsWith('FAIL:'));
    if (!last?.startsWith('OK:')) {
      throw new Error(`Upload failed: ${last ?? 'no response'}`);
    }
  }

  /** Write raw data without expecting a structured response */
  async sendData(data) {
    if (!this.device || !this._connected) {
      console.error('Not connected to device');
      return false;
    }
    try {
      await this.device.writeCharacteristicWithResponseForService(
        this.SERVICE,
        this.RX_CHAR,
        this._encodeBase64(data),
      );
      return true;
    } catch (error) {
      console.error('Send data error:', error);
      return false;
    }
  }

  destroy() {
    this.disconnect();
    if (this.manager) this.manager.destroy();
  }

  // ─── Single persistent notification subscription ───────────────────────────
  //
  // ONE subscription handles everything to avoid ble-plx multi-monitor conflicts.
  // Returns a Promise resolved once the CCCD write is confirmed (first callback
  // fires, or 600 ms safety timeout) so callers can await before sending commands.

  _setupNotifications() {
    return new Promise((resolve) => {
      let resolved = false;
      const resolveOnce = () => { if (!resolved) { resolved = true; resolve(); } };
      const fallback = setTimeout(resolveOnce, 600);

      this.device.monitorCharacteristicForService(
        this.SERVICE,
        this.TX_CHAR,
        (error, characteristic) => {
          // Any callback (including errors) confirms CCCD write completed
          clearTimeout(fallback);
          resolveOnce();

          if (error) {
            console.error('Notification error:', error);
            this._pendingCommandHandler = null;
            return;
          }
          if (!characteristic?.value) return;

          const raw = this._decodeBase64(characteristic.value);
          if (!raw) return;

          if (this.onDataReceived) this.onDataReceived(raw);

          const trimmed = raw.trim();

          // If a command is in-flight, forward to its handler
          if (this._pendingCommandHandler) {
            this._pendingCommandHandler(trimmed);
            return;
          }

          // Otherwise dispatch JSON tracker events
          if (trimmed.startsWith('{')) {
            try {
              this._handleTrackerEvent(JSON.parse(trimmed));
            } catch (e) {
              console.warn('BLE JSON parse error:', e.message);
            }
          }
        },
      );
    });
  }

  // ─── Tracker event dispatcher ───────────────────────────────────────────────

  _handleTrackerEvent(event) {
    switch (event.e) {
      case 'rep':
        // Firmware sends: {"e":"rep","n":repCount,"set":currentSet}
        if (this.onRepUpdate) this.onRepUpdate(event.n ?? 1, event.ex ?? null);
        break;
      case 'set_done':
        // Firmware sends: {"e":"set_done","rest":restSec,"ex":"name","set":N,"reps":N}
        if (this.onSetDone) this.onSetDone(event.rest ?? 60, event.ex ?? null, event.set ?? 1, event.reps ?? 0);
        break;
      case 'rest_end':
        if (this.onRestEnd) this.onRestEnd();
        break;
      case 'workout_done':
        // Firmware sends: {"e":"workout_done"} — no log filename
        if (this.onWorkoutDone) this.onWorkoutDone();
        break;
      case 'ex_start':
        // Informational — tracker started an exercise; no action needed on mobile
        console.log('[BLE] ex_start:', event.ex, 'set', event.set);
        break;
      default:
        console.warn('Unknown tracker event:', event.e);
    }
  }


  async _uploadLogToApi(filename, content) {
    try {
      const token = await AsyncStorage.getItem('accessToken') || await AsyncStorage.getItem('userToken');
      const response = await fetch(`${API_BASE_URL}/imu/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY,
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ filename, content }),
      });
      if (response.ok) {
        console.log('IMU log uploaded successfully:', filename);
      } else {
        console.error('IMU upload failed, status:', response.status);
      }
    } catch (e) {
      console.error('IMU upload error:', e.message);
    }
  }

  // ─── Encoding helpers ──────────────────────────────────────────────────────

  _decodeBase64(base64String) {
    try {
      // atob is available in Hermes; TextDecoder is not — decode UTF-8 manually
      const binaryString = atob(base64String);
      let result = '';
      let i = 0;
      while (i < binaryString.length) {
        const byte1 = binaryString.charCodeAt(i++);
        if (byte1 < 0x80) {
          result += String.fromCharCode(byte1);
        } else if (byte1 < 0xE0) {
          const byte2 = binaryString.charCodeAt(i++) & 0x3F;
          result += String.fromCharCode(((byte1 & 0x1F) << 6) | byte2);
        } else if (byte1 < 0xF0) {
          const byte2 = binaryString.charCodeAt(i++) & 0x3F;
          const byte3 = binaryString.charCodeAt(i++) & 0x3F;
          result += String.fromCharCode(((byte1 & 0x0F) << 12) | (byte2 << 6) | byte3);
        } else {
          // 4-byte sequence → encode as surrogate pair
          const byte2 = binaryString.charCodeAt(i++) & 0x3F;
          const byte3 = binaryString.charCodeAt(i++) & 0x3F;
          const byte4 = binaryString.charCodeAt(i++) & 0x3F;
          const codePoint = (((byte1 & 0x07) << 18) | (byte2 << 12) | (byte3 << 6) | byte4) - 0x10000;
          result += String.fromCharCode(0xD800 + (codePoint >> 10), 0xDC00 + (codePoint & 0x3FF));
        }
      }
      return result;
    } catch (e) {
      console.error('BLE decode error:', e);
      return null;
    }
  }

  _encodeBase64(text) {
    try {
      // Encode string to UTF-8 bytes manually (TextEncoder not available in Hermes)
      let binary = '';
      for (let i = 0; i < text.length; i++) {
        let code = text.charCodeAt(i);
        // Handle surrogate pairs
        if (code >= 0xD800 && code <= 0xDBFF && i + 1 < text.length) {
          const low = text.charCodeAt(i + 1);
          if (low >= 0xDC00 && low <= 0xDFFF) {
            code = 0x10000 + ((code - 0xD800) << 10) + (low - 0xDC00);
            i++;
          }
        }
        if (code < 0x80) {
          binary += String.fromCharCode(code);
        } else if (code < 0x800) {
          binary += String.fromCharCode(0xC0 | (code >> 6), 0x80 | (code & 0x3F));
        } else if (code < 0x10000) {
          binary += String.fromCharCode(0xE0 | (code >> 12), 0x80 | ((code >> 6) & 0x3F), 0x80 | (code & 0x3F));
        } else {
          binary += String.fromCharCode(0xF0 | (code >> 18), 0x80 | ((code >> 12) & 0x3F), 0x80 | ((code >> 6) & 0x3F), 0x80 | (code & 0x3F));
        }
      }
      return btoa(binary);
    } catch (error) {
      console.error('Encode error:', error);
      return '';
    }
  }
}

const bleService = new BLEService();
export default bleService;
