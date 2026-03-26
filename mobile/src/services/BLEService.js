import { Platform, PermissionsAndroid } from 'react-native';

// Check if we're in a web environment
const isWeb = typeof window !== 'undefined' && window.navigator && window.navigator.product === 'ReactNative';

let BleManager;
let manager;

if (!isWeb) {
  try {
    BleManager = require('react-native-ble-plx').BleManager;
    manager = new BleManager();
  } catch (error) {
    console.warn('BLE not available:', error.message);
  }
}

class BLEService {
  constructor() {
    this.manager = manager || null;
    this.device = null;
    this.serviceUUID = '6E400001-B5A3-F393-E0A9-E50E24DCCA9E'; // UART service UUID
    this.txCharacteristicUUID = '6E400002-B5A3-F393-E0A9-E50E24DCCA9E'; // TX characteristic
    this.rxCharacteristicUUID = '6E400003-B5A3-F393-E0A9-E50E24DCCA9E'; // RX characteristic
    this.isConnected = false;
    this.onDataReceived = null;
    this.onConnectionStateChange = null;
    this.isWeb = isWeb;
  }

  // Request Bluetooth permissions
  async requestPermissions() {
    if (Platform.OS === 'android') {
      try {
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
    return true; // iOS handles permissions differently
  }

  // Scan for devices
  startScanning(onDeviceFound) {
    this.manager.startDeviceScan(null, null, (error, device) => {
      if (error) {
        console.error('Scan error:', error);
        return;
      }

      // Filter for devices with specific name or service
      if (device.name && device.name.includes('Hawklets') || device.name?.includes('Fitness')) {
        onDeviceFound(device);
      }
    });
  }

  // Stop scanning
  stopScanning() {
    this.manager.stopDeviceScan();
  }

  // Connect to a device
  async connectToDevice(deviceId) {
    try {
      this.device = await this.manager.connectToDevice(deviceId);
      await this.device.discoverAllServicesAndCharacteristics();
      
      this.isConnected = true;
      this.setupNotifications();
      
      if (this.onConnectionStateChange) {
        this.onConnectionStateChange(true);
      }
      
      console.log('Connected to device:', deviceId);
      return true;
    } catch (error) {
      console.error('Connection error:', error);
      this.isConnected = false;
      return false;
    }
  }

  // Setup notifications for incoming data
  async setupNotifications() {
    try {
      await this.device.monitorCharacteristicForService(
        this.serviceUUID,
        this.rxCharacteristicUUID,
        (error, characteristic) => {
          if (error) {
            console.error('Notification error:', error);
            return;
          }
          
          if (characteristic?.value) {
            const data = this.decodeData(characteristic.value);
            if (this.onDataReceived) {
              this.onDataReceived(data);
            }
          }
        }
      );
    } catch (error) {
      console.error('Setup notifications error:', error);
    }
  }

  // Send data to device
  async sendData(data) {
    if (!this.device || !this.isConnected) {
      console.error('Not connected to device');
      return false;
    }

    try {
      const encodedData = this.encodeData(data);
      await this.device.writeCharacteristicWithResponseForService(
        this.serviceUUID,
        this.txCharacteristicUUID,
        encodedData
      );
      return true;
    } catch (error) {
      console.error('Send data error:', error);
      return false;
    }
  }

  // Decode base64 data
  decodeData(base64String) {
    try {
      const binaryString = atob(base64String);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return new TextDecoder().decode(bytes);
    } catch (error) {
      console.error('Decode error:', error);
      return null;
    }
  }

  // Encode data to base64
  encodeData(text) {
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

  // Disconnect from device
  async disconnect() {
    if (this.device) {
      try {
        await this.device.cancelConnection();
      } catch (error) {
        console.error('Disconnect error:', error);
      }
    }
    
    this.device = null;
    this.isConnected = false;
    
    if (this.onConnectionStateChange) {
      this.onConnectionStateChange(false);
    }
  }

  // Get device info
  getDeviceInfo() {
    if (!this.device) return null;
    
    return {
      id: this.device.id,
      name: this.device.name || 'Unknown Device',
      isConnected: this.isConnected,
    };
  }

  // Cleanup
  destroy() {
    this.disconnect();
    this.manager.destroy();
  }
}

// Create singleton instance
const bleService = new BLEService();
export default bleService;