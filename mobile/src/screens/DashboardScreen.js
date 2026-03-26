import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { LineChart } from 'react-native-chart-kit';

const DashboardScreen = () => {
  const [streak, setStreak] = useState(7);
  const [connectedDevice, setConnectedDevice] = useState(true);
  const [todaySteps, setTodaySteps] = useState(8452);
  const [caloriesBurned, setCaloriesBurned] = useState(420);
  const [activeMinutes, setActiveMinutes] = useState(65);

  const weeklyData = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [
      {
        data: [65, 59, 80, 81, 56, 55, 40],
        color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`,
        strokeWidth: 2,
      },
    ],
  };

  const tipsOfTheDay = [
    'Keep your back straight during squats to prevent injury.',
    'Hydrate well before and after workouts for better performance.',
    'Track your rest periods to maximize intensity.',
    'Focus on form over weight to build proper muscle memory.',
  ];

  const [currentTipIndex, setCurrentTipIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTipIndex((prev) => (prev + 1) % tipsOfTheDay.length);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  const handleConnectDevice = () => {
    setConnectedDevice(!connectedDevice);
  };

  const handleRefresh = () => {
    // Simulate data refresh
    setTodaySteps(prev => prev + 100);
    setCaloriesBurned(prev => prev + 10);
    setActiveMinutes(prev => prev + 2);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Good morning, Alex!</Text>
            <Text style={styles.date}>Wednesday, January 22</Text>
          </View>
          <TouchableOpacity style={styles.avatarContainer}>
            <Image
              source={require('../../assets/avatar.png')}
              style={styles.avatar}
              resizeMode="cover"
            />
            <View style={styles.onlineIndicator} />
          </TouchableOpacity>
        </View>

        {/* Streak & Connection */}
        <View style={styles.statsRow}>
          <LinearGradient
            colors={['#FF9800', '#FF5722']}
            style={styles.streakCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Ionicons name="flame" size={24} color="white" />
            <View style={styles.streakInfo}>
              <Text style={styles.streakLabel}>Current Streak</Text>
              <Text style={styles.streakValue}>{streak} days</Text>
            </View>
          </LinearGradient>

          <TouchableOpacity
            style={[styles.deviceCard, connectedDevice && styles.deviceCardConnected]}
            onPress={handleConnectDevice}
          >
            <Ionicons
              name={connectedDevice ? 'bluetooth' : 'bluetooth-outline'}
              size={24}
              color={connectedDevice ? '#4CAF50' : '#666'}
            />
            <View style={styles.deviceInfo}>
              <Text style={styles.deviceLabel}>Tracker</Text>
              <Text style={styles.deviceStatus}>
                {connectedDevice ? 'Connected' : 'Disconnected'}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Today's Stats */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Today's Activity</Text>
            <TouchableOpacity onPress={handleRefresh}>
              <Ionicons name="refresh" size={20} color="#4CAF50" />
            </TouchableOpacity>
          </View>
          <View style={styles.activityGrid}>
            <View style={styles.activityCard}>
              <Ionicons name="walk" size={32} color="#4CAF50" />
              <Text style={styles.activityValue}>{todaySteps.toLocaleString()}</Text>
              <Text style={styles.activityLabel}>Steps</Text>
            </View>
            <View style={styles.activityCard}>
              <Ionicons name="flame-outline" size={32} color="#FF9800" />
              <Text style={styles.activityValue}>{caloriesBurned}</Text>
              <Text style={styles.activityLabel}>Calories</Text>
            </View>
            <View style={styles.activityCard}>
              <Ionicons name="time-outline" size={32} color="#2196F3" />
              <Text style={styles.activityValue}>{activeMinutes} min</Text>
              <Text style={styles.activityLabel}>Active</Text>
            </View>
          </View>
        </View>

        {/* Weekly Progress Chart */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Weekly Activity Trend</Text>
          <LineChart
            data={weeklyData}
            width={Dimensions.get('window').width - 48}
            height={220}
            chartConfig={{
              backgroundColor: '#ffffff',
              backgroundGradientFrom: '#ffffff',
              backgroundGradientTo: '#ffffff',
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              style: {
                borderRadius: 16,
              },
              propsForDots: {
                r: '6',
                strokeWidth: '2',
                stroke: '#4CAF50',
              },
            }}
            bezier
            style={styles.chart}
          />
        </View>

        {/* Tips of the Day */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Tip of the Day</Text>
            <Ionicons name="bulb-outline" size={20} color="#FFC107" />
          </View>
          <LinearGradient
            colors={['#E8F5E9', '#C8E6C9']}
            style={styles.tipCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Ionicons name="information-circle" size={24} color="#2E7D32" />
            <Text style={styles.tipText}>{tipsOfTheDay[currentTipIndex]}</Text>
          </LinearGradient>
          <View style={styles.tipIndicators}>
            {tipsOfTheDay.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.tipDot,
                  index === currentTipIndex && styles.tipDotActive,
                ]}
              />
            ))}
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.actionButton}>
              <Ionicons name="add-circle" size={28} color="#4CAF50" />
              <Text style={styles.actionText}>Log Workout</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <Ionicons name="stats-chart" size={28} color="#2196F3" />
              <Text style={styles.actionText}>View Report</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <Ionicons name="notifications" size={28} color="#FF9800" />
              <Text style={styles.actionText}>Notifications</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <Ionicons name="share-social" size={28} color="#9C27B0" />
              <Text style={styles.actionText}>Share Progress</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  date: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: 'white',
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  streakCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginRight: 12,
  },
  streakInfo: {
    marginLeft: 12,
  },
  streakLabel: {
    color: 'white',
    fontSize: 12,
    opacity: 0.9,
  },
  streakValue: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  deviceCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  deviceCardConnected: {
    borderColor: '#4CAF50',
    backgroundColor: '#E8F5E9',
  },
  deviceInfo: {
    marginLeft: 12,
  },
  deviceLabel: {
    fontSize: 12,
    color: '#666',
  },
  deviceStatus: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  section: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  activityGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  activityCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginHorizontal: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  activityValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
  },
  activityLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
    paddingRight: 16,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    marginBottom: 12,
  },
  tipText: {
    flex: 1,
    fontSize: 16,
    color: '#2E7D32',
    marginLeft: 16,
    fontWeight: '500',
  },
  tipIndicators: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  tipDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ddd',
    marginHorizontal: 4,
  },
  tipDotActive: {
    backgroundColor: '#4CAF50',
    width: 16,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    width: '23%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  actionText: {
    fontSize: 12,
    color: '#333',
    marginTop: 8,
    textAlign: 'center',
  },
});

export default DashboardScreen;