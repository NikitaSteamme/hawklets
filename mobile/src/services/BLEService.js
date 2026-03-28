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

    // Tracker event callbacks — set by the active workout screen
    this.onRepUpdate   = null; // (repCount, exerciseId) => void
    this.onSetDone     = null; // (restSec) => void
    this.onRestEnd     = null; // () => void
    this.onWorkoutDone = null; // () => void

    // Log download state machine
    this._isDownloading    = false;
    this._downloadBuffer   = [];
    this._downloadFilename = null;
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
      await this.device.discoverAllServicesAndCharacteristics();
      this._connected = true;
      this._setupNotifications();
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
    this._isDownloading = false;
    this._downloadBuffer = [];
    this._downloadFilename = null;
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
   * Returns an array of response lines.
   */
  sendCommand(command) {
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
          const line = this._decodeBase64(char.value)?.trim() ?? '';
          lines.push(line);

          if (
            line === 'END' ||
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

      this.device
        .writeCharacteristicWithResponseForService(
          this.SERVICE,
          this.RX_CHAR,
          this._encodeBase64(command),
        )
        .catch(err => {
          clearTimeout(timer);
          subscription?.remove();
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
          const msg = this._decodeBase64(char.value)?.trim() ?? '';
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
          this._encodeBase64(`UPLOAD ${filename}`),
        )
        .catch(err => { clearTimeout(timer); subscription?.remove(); reject(err); });
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

  // ─── Persistent notification listener ──────────────────────────────────────

  async _setupNotifications() {
    try {
      await this.device.monitorCharacteristicForService(
        this.SERVICE,
        this.TX_CHAR,
        (error, characteristic) => {
          if (error) {
            console.error('Notification error:', error);
            return;
          }
          if (!characteristic?.value) return;

          const raw = this._decodeBase64(characteristic.value);
          if (!raw) return;

          // Always fire raw callback (DeviceConnectionScreen log pane)
          if (this.onDataReceived) this.onDataReceived(raw);

          if (raw.trimStart().startsWith('{')) {
            try {
              const event = JSON.parse(raw);
              this._handleTrackerEvent(event);
            } catch (e) {
              console.warn('BLE JSON parse error:', e.message);
            }
          } else {
            this._handleCommandResponse(raw);
          }
        }
      );
    } catch (error) {
      console.error('Setup notifications error:', error);
    }
  }

  // ─── Tracker event dispatcher ───────────────────────────────────────────────

  _handleTrackerEvent(event) {
    switch (event.e) {
      case 'rep':
        if (this.onRepUpdate) this.onRepUpdate(event.count ?? 1, event.exercise_id ?? null);
        break;
      case 'set_done':
        if (this.onSetDone) this.onSetDone(event.rest_sec ?? 60);
        break;
      case 'rest_end':
        if (this.onRestEnd) this.onRestEnd();
        break;
      case 'workout_done':
        if (this.onWorkoutDone) this.onWorkoutDone();
        if (event.log) this._downloadLogsAndUpload(event.log);
        break;
      default:
        console.warn('Unknown tracker event:', event.e);
    }
  }

  // ─── Log download state machine ────────────────────────────────────────────

  _handleCommandResponse(raw) {
    if (!this._isDownloading) return;
    if (raw.trim() === 'END_OF_FILE') {
      this._isDownloading = false;
      const content = this._downloadBuffer.join('');
      const filename = this._downloadFilename;
      this._downloadBuffer = [];
      this._downloadFilename = null;
      this._uploadLogToApi(filename, content);
    } else {
      this._downloadBuffer.push(raw);
    }
  }

  async _downloadLogsAndUpload(filename) {
    this._isDownloading = true;
    this._downloadBuffer = [];
    this._downloadFilename = filename;
    console.log('Requesting log download:', filename);
    await this.sendData(`DOWNLOAD ${filename}`);
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
      const binaryString = atob(base64String);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return new TextDecoder().decode(bytes);
    } catch (e) {
      console.error('BLE decode error:', e);
      return null;
    }
  }

  _encodeBase64(text) {
    try {
      const encoder = new TextEncoder();
      const bytes = encoder.encode(text);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
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
