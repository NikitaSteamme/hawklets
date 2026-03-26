import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import bleService from '../services/BLEService';

const DeviceConnectionScreen = ({ navigation }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [devices, setDevices] = useState([]);
  const [connectedDevice, setConnectedDevice] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [receivedData, setReceivedData] = useState([]);

  useEffect(() => {
    // Request permissions on mount
    bleService.requestPermissions();
    
    // Set up data receiver callback
    bleService.onDataReceived = (data) => {
      if (data) {
        const timestamp = new Date().toLocaleTimeString();
        setReceivedData(prev => [
          { id: Date.now().toString(), data, timestamp },
          ...prev.slice(0, 9) // Keep last 10 items
        ]);
      }
    };

    // Set up connection state callback
    bleService.onConnectionStateChange = (isConnected) => {
      if (!isConnected) {
        setConnectedDevice(null);
      }
    };

    // Check if already connected
    const deviceInfo = bleService.getDeviceInfo();
    if (deviceInfo?.isConnected) {
      setConnectedDevice(deviceInfo);
    }

    return () => {
      bleService.stopScanning();
    };
  }, []);

  const startScan = () => {
    setIsScanning(true);
    setDevices([]);
    
    bleService.startScanning((device) => {
      setDevices(prevDevices => {
        // Check if device already exists
        const exists = prevDevices.some(d => d.id === device.id);
        if (!exists) {
          return [...prevDevices, {
            id: device.id,
            name: device.name || 'Unknown Device',
            rssi: device.rssi,
            isConnectable: device.isConnectable,
          }];
        }
        return prevDevices;
      });
    });

    // Stop scanning after 10 seconds
    setTimeout(() => {
      stopScan();
    }, 10000);
  };

  const stopScan = () => {
    bleService.stopScanning();
    setIsScanning(false);
  };

  const connectToDevice = async (device) => {
    setIsConnecting(true);
    
    try {
      const success = await bleService.connectToDevice(device.id);
      
      if (success) {
        setConnectedDevice({
          id: device.id,
          name: device.name,
          isConnected: true,
        });
        Alert.alert('Success', `Connected to ${device.name}`);
      } else {
        Alert.alert('Error', 'Failed to connect to device');
      }
    } catch (error) {
      Alert.alert('Error', `Connection failed: ${error.message}`);
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectDevice = async () => {
    await bleService.disconnect();
    setConnectedDevice(null);
    setReceivedData([]);
    Alert.alert('Disconnected', 'Device disconnected successfully');
  };

  const sendTestData = async () => {
    if (!connectedDevice) {
      Alert.alert('Error', 'No device connected');
      return;
    }

    const testData = 'GET_SENSOR_DATA';
    const success = await bleService.sendData(testData);
    
    if (success) {
      Alert.alert('Success', 'Data sent to device');
    } else {
      Alert.alert('Error', 'Failed to send data');
    }
  };

  const renderDeviceItem = ({ item }) => (
    <TouchableOpacity
      style={styles.deviceItem}
      onPress={() => connectToDevice(item)}
      disabled={isConnecting}
    >
      <View style={styles.deviceInfo}>
        <Icon name="bluetooth" size={24} color="#4A90E2" />
        <View style={styles.deviceDetails}>
          <Text style={styles.deviceName}>{item.name}</Text>
          <Text style={styles.deviceId}>ID: {item.id.substring(0, 8)}...</Text>
          <Text style={styles.deviceRssi}>Signal: {item.rssi} dBm</Text>
        </View>
      </View>
      {isConnecting ? (
        <ActivityIndicator size="small" color="#4A90E2" />
      ) : (
        <Icon name="chevron-right" size={24} color="#666" />
      )}
    </TouchableOpacity>
  );

  const renderDataItem = ({ item }) => (
    <View style={styles.dataItem}>
      <Text style={styles.dataTimestamp}>{item.timestamp}</Text>
      <Text style={styles.dataContent}>{item.data}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Device Connection</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        {/* Connection Status */}
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <Icon 
              name={connectedDevice ? "bluetooth-connect" : "bluetooth-off"} 
              size={32} 
              color={connectedDevice ? "#4CAF50" : "#F44336"} 
            />
            <View style={styles.statusInfo}>
              <Text style={styles.statusTitle}>
                {connectedDevice ? 'Connected' : 'Disconnected'}
              </Text>
              <Text style={styles.statusSubtitle}>
                {connectedDevice 
                  ? `Connected to ${connectedDevice.name}`
                  : 'No device connected'
                }
              </Text>
            </View>
          </View>
          
          {connectedDevice && (
            <View style={styles.connectionActions}>
              <TouchableOpacity 
                style={[styles.actionButton, styles.disconnectButton]}
                onPress={disconnectDevice}
              >
                <Icon name="link-off" size={20} color="#FFF" />
                <Text style={styles.actionButtonText}>Disconnect</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.actionButton, styles.sendButton]}
                onPress={sendTestData}
              >
                <Icon name="send" size={20} color="#FFF" />
                <Text style={styles.actionButtonText}>Send Test</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Scan Controls */}
        <View style={styles.scanSection}>
          <Text style={styles.sectionTitle}>Scan for Devices</Text>
          <View style={styles.scanControls}>
            <TouchableOpacity
              style={[styles.scanButton, isScanning && styles.scanningButton]}
              onPress={isScanning ? stopScan : startScan}
              disabled={isConnecting}
            >
              <Icon 
                name={isScanning ? "stop" : "magnify"} 
                size={20} 
                color="#FFF" 
              />
              <Text style={styles.scanButtonText}>
                {isScanning ? 'Stop Scan' : 'Start Scan'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.refreshButton}
              onPress={() => setDevices([])}
            >
              <Icon name="refresh" size={20} color="#4A90E2" />
              <Text style={styles.refreshButtonText}>Clear List</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Device List */}
        <View style={styles.deviceListSection}>
          <Text style={styles.sectionTitle}>
            Available Devices ({devices.length})
          </Text>
          {devices.length === 0 ? (
            <View style={styles.emptyState}>
              <Icon name="bluetooth-search" size={48} color="#CCC" />
              <Text style={styles.emptyStateText}>
                {isScanning 
                  ? 'Scanning for devices...' 
                  : 'No devices found. Start scanning to discover devices.'
                }
              </Text>
            </View>
          ) : (
            <FlatList
              data={devices}
              renderItem={renderDeviceItem}
              keyExtractor={item => item.id}
              style={styles.deviceList}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>

        {/* Received Data */}
        {receivedData.length > 0 && (
          <View style={styles.dataSection}>
            <Text style={styles.sectionTitle}>Received Data</Text>
            <FlatList
              data={receivedData}
              renderItem={renderDataItem}
              keyExtractor={item => item.id}
              style={styles.dataList}
              showsVerticalScrollIndicator={false}
            />
          </View>
        )}
      </View>

      {isConnecting && (
        <View style={styles.connectingOverlay}>
          <ActivityIndicator size="large" color="#4A90E2" />
          <Text style={styles.connectingText}>Connecting to device...</Text>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  statusCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusInfo: {
    marginLeft: 12,
    flex: 1,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  statusSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  connectionActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 4,
  },
  disconnectButton: {
    backgroundColor: '#F44336',
  },
  sendButton: {
    backgroundColor: '#4CAF50',
  },
  actionButtonText: {
    color: '#FFF',
    fontWeight: '600',
    marginLeft: 8,
  },
  scanSection: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  scanControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4A90E2',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
    marginRight: 8,
  },
  scanningButton: {
    backgroundColor: '#FF9800',
  },
  scanButtonText: {
    color: '#FFF',
    fontWeight: '600',
    marginLeft: 8,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#4A90E2',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  refreshButtonText: {
    color: '#4A90E2',
    fontWeight: '600',
    marginLeft: 8,
  },
  deviceListSection: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 12,
    maxWidth: 200,
  },
  deviceList: {
    flex: 1,
  },
  deviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  deviceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  deviceDetails: {
    marginLeft: 12,
    flex: 1,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  deviceId: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  deviceRssi: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  dataSection: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dataList: {
    maxHeight: 200,
  },
  dataItem: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  dataTimestamp: {
    fontSize: 11,
    color: '#888',
    marginBottom: 2,
  },
  dataContent: {
    fontSize: 13,
    color: '#333',
    fontFamily: 'monospace',
  },
  connectingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectingText: {
    color: '#FFF',
    fontSize: 16,
    marginTop: 12,
    fontWeight: '500',
  },
});

export default DeviceConnectionScreen;