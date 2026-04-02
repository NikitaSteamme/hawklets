import React, { useState, useEffect, useCallback } from 'react';
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
import { useFocusEffect } from '@react-navigation/native';
import bleService from '../services/BLEService';
import WorkoutService from '../services/ProgramService';
import AuthService from '../services/AuthService';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
};

const getCurrentDateString = () => {
  const now = new Date();
  return `${DAYS[now.getDay()]}, ${MONTHS[now.getMonth()]} ${now.getDate()}`;
};

const DashboardScreen = ({ currentUser, navigation }) => {
  const [ironPoints, setIronPoints] = useState(currentUser?.iron_points ?? 0);
  const [endurancePoints, setEndurancePoints] = useState(currentUser?.endurance_points ?? 0);
  const [streak, setStreak] = useState(0);
  const [streakTarget, setStreakTarget] = useState(3);
  const [connectedDevice, setConnectedDevice] = useState(bleService.isConnected());
  const [activeMinutes, setActiveMinutes] = useState(0);
  const [weeklyLogs, setWeeklyLogs] = useState([0, 0, 0, 0, 0, 0, 0]);

  const [currentTipIndex, setCurrentTipIndex] = useState(0);

  const tipsOfTheDay = [
    'Keep your back straight during squats to prevent injury.',
    'Hydrate well before and after workouts for better performance.',
    'Track your rest periods to maximize intensity.',
    'Focus on form over weight to build proper muscle memory.',
  ];

  const fetchDashboardData = async () => {
    try {
      const [user, routines, logs] = await Promise.all([
        AuthService.getCurrentUser(),
        WorkoutService.getRoutines(),
        WorkoutService.getWorkoutLogs(50),
      ]);

      console.log('[Dashboard] user:', user?.iron_points, user?.endurance_points);
      setIronPoints(user.iron_points ?? 0);
      setEndurancePoints(user.endurance_points ?? 0);

      const activeRoutine = routines.find(r => r.is_active) ?? routines[0] ?? null;
      setStreak(activeRoutine?.streak ?? 0);
      setStreakTarget(activeRoutine?.workouts_per_week ?? 3);

      // Build workouts-per-day chart for the current week (Mon–Sun)
      const today = new Date();
      const monday = new Date(today);
      monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
      monday.setHours(0, 0, 0, 0);

      const counts = [0, 0, 0, 0, 0, 0, 0];
      (logs.items ?? logs ?? []).forEach(log => {
        const d = new Date(log.logged_at);
        const diff = Math.floor((d - monday) / 86400000);
        if (diff >= 0 && diff <= 6) counts[diff]++;
      });
      setWeeklyLogs(counts);
    } catch (e) {
      console.warn('[Dashboard] fetch error:', e?.message, e?.status, JSON.stringify(e?.data));
    }
  };

  // Refetch whenever the screen comes into focus (e.g. after a workout session)
  useFocusEffect(useCallback(() => {
    fetchDashboardData();
  }, []));

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTipIndex(prev => (prev + 1) % tipsOfTheDay.length);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const prevCallback = bleService.onConnectionStateChange;
    bleService.onConnectionStateChange = (isConnected) => {
      setConnectedDevice(isConnected);
      if (prevCallback) prevCallback(isConnected);
    };
    return () => { bleService.onConnectionStateChange = prevCallback; };
  }, []);

  const weeklyData = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [{
      data: weeklyLogs.map(v => Math.max(v, 0)),
      color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`,
      strokeWidth: 2,
    }],
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>
              {currentUser?.first_name
                ? `${getGreeting()}, ${currentUser.first_name}!`
                : `${getGreeting()}!`}
            </Text>
            <Text style={styles.date}>{getCurrentDateString()}</Text>
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
              <Text style={styles.streakLabel}>Streak · {streakTarget}×/week</Text>
              <Text style={styles.streakValue}>{streak} {streak === 1 ? 'week' : 'weeks'}</Text>
            </View>
          </LinearGradient>

          <TouchableOpacity
            style={[styles.deviceCard, connectedDevice && styles.deviceCardConnected]}
            onPress={() => navigation.navigate('DeviceConnection')}
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
            <Text style={styles.sectionTitle}>Points</Text>
            <TouchableOpacity onPress={fetchDashboardData}>
              <Ionicons name="refresh" size={20} color="#4CAF50" />
            </TouchableOpacity>
          </View>
          <View style={styles.activityGrid}>
            <View style={styles.activityCard}>
              <Ionicons name="barbell" size={32} color="#4CAF50" />
              <Text style={styles.activityValue}>{ironPoints.toLocaleString()}</Text>
              <Text style={styles.activityLabel}>Iron Points</Text>
            </View>
            <View style={styles.activityCard}>
              <Ionicons name="bicycle" size={32} color="#FF9800" />
              <Text style={styles.activityValue}>{endurancePoints.toLocaleString()}</Text>
              <Text style={styles.activityLabel}>Endurance</Text>
            </View>
            <View style={styles.activityCard}>
              <Ionicons name="trophy-outline" size={32} color="#2196F3" />
              <Text style={styles.activityValue}>{ironPoints + endurancePoints}</Text>
              <Text style={styles.activityLabel}>Total</Text>
            </View>
          </View>
        </View>

        {/* Weekly Workouts Chart */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>This Week's Workouts</Text>
          <LineChart
            data={weeklyData}
            width={Dimensions.get('window').width - 48}
            height={180}
            chartConfig={{
              backgroundColor: '#ffffff',
              backgroundGradientFrom: '#ffffff',
              backgroundGradientTo: '#ffffff',
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              style: { borderRadius: 16 },
              propsForDots: { r: '6', strokeWidth: '2', stroke: '#4CAF50' },
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
                style={[styles.tipDot, index === currentTipIndex && styles.tipDotActive]}
              />
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
  },
  greeting: { fontSize: 24, fontWeight: 'bold', color: '#333' },
  date: { fontSize: 14, color: '#666', marginTop: 4 },
  avatarContainer: { position: 'relative' },
  avatar: {
    width: 56, height: 56, borderRadius: 28,
    borderWidth: 2, borderColor: '#4CAF50',
  },
  onlineIndicator: {
    position: 'absolute', bottom: 2, right: 2,
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: '#4CAF50', borderWidth: 2, borderColor: 'white',
  },
  statsRow: { flexDirection: 'row', paddingHorizontal: 24, marginBottom: 24 },
  streakCard: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    padding: 16, borderRadius: 16, marginRight: 12,
  },
  streakInfo: { marginLeft: 12 },
  streakLabel: { color: 'white', fontSize: 12, opacity: 0.9 },
  streakValue: { color: 'white', fontSize: 22, fontWeight: 'bold' },
  deviceCard: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    padding: 16, borderRadius: 16, backgroundColor: '#fff',
    borderWidth: 1, borderColor: '#ddd',
  },
  deviceCardConnected: { borderColor: '#4CAF50', backgroundColor: '#E8F5E9' },
  deviceInfo: { marginLeft: 12 },
  deviceLabel: { fontSize: 12, color: '#666' },
  deviceStatus: { fontSize: 16, fontWeight: '600', color: '#333' },
  section: { paddingHorizontal: 24, marginBottom: 24 },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 16,
  },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  activityGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  activityCard: {
    flex: 1, backgroundColor: 'white', borderRadius: 16,
    padding: 20, alignItems: 'center', marginHorizontal: 6,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 3,
  },
  activityValue: { fontSize: 22, fontWeight: 'bold', color: '#333', marginTop: 8 },
  activityLabel: { fontSize: 12, color: '#666', marginTop: 4, textAlign: 'center' },
  chart: { marginVertical: 8, borderRadius: 16, paddingRight: 16 },
  tipCard: {
    flexDirection: 'row', alignItems: 'center',
    padding: 20, borderRadius: 16, marginBottom: 12,
  },
  tipText: { flex: 1, fontSize: 16, color: '#2E7D32', marginLeft: 16, fontWeight: '500' },
  tipIndicators: { flexDirection: 'row', justifyContent: 'center' },
  tipDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: '#ddd', marginHorizontal: 4,
  },
  tipDotActive: { backgroundColor: '#4CAF50', width: 16 },
});

export default DashboardScreen;
