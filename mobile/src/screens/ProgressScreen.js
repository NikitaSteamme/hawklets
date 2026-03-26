import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { LineChart, BarChart, ProgressChart } from 'react-native-chart-kit';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';

const ProgressScreen = ({ navigation }) => {
  const [timeRange, setTimeRange] = useState('week');
  const [selectedMetric, setSelectedMetric] = useState('strength');

  const timeRanges = [
    { id: 'week', label: 'Week' },
    { id: 'month', label: 'Month' },
    { id: 'quarter', label: 'Quarter' },
    { id: 'year', label: 'Year' },
  ];

  const metrics = [
    { id: 'strength', label: 'Strength', icon: 'barbell', color: '#4CAF50' },
    { id: 'endurance', label: 'Endurance', icon: 'heart', color: '#2196F3' },
    { id: 'flexibility', label: 'Flexibility', icon: 'body', color: '#9C27B0' },
    { id: 'consistency', label: 'Consistency', icon: 'calendar', color: '#FF9800' },
  ];

  const weeklyStrengthData = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [
      {
        data: [65, 70, 68, 72, 75, 78, 80],
        color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`,
        strokeWidth: 2,
      },
    ],
  };

  const monthlyConsistencyData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        data: [65, 59, 80, 81, 56, 55],
      },
    ],
  };

  const progressData = {
    labels: ['Strength', 'Endurance', 'Flexibility', 'Consistency'],
    data: [0.8, 0.65, 0.45, 0.9],
    colors: ['#4CAF50', '#2196F3', '#9C27B0', '#FF9800'],
  };

  const achievements = [
    { id: 1, title: '30 Day Streak', description: 'Worked out for 30 consecutive days', icon: 'trophy', date: 'Jan 15, 2026' },
    { id: 2, title: 'Strength Milestone', description: 'Increased bench press by 20%', icon: 'barbell', date: 'Jan 10, 2026' },
    { id: 3, title: 'Cardio Champion', description: 'Ran 50km in a month', icon: 'heart', date: 'Dec 28, 2025' },
    { id: 4, title: 'Flexibility Master', description: 'Achieved full splits', icon: 'body', date: 'Dec 15, 2025' },
  ];

  const personalRecords = [
    { exercise: 'Bench Press', weight: '185 lbs', date: 'Jan 20, 2026', improvement: '+10 lbs' },
    { exercise: 'Squat', weight: '225 lbs', date: 'Jan 18, 2026', improvement: '+15 lbs' },
    { exercise: 'Deadlift', weight: '275 lbs', date: 'Jan 15, 2026', improvement: '+20 lbs' },
    { exercise: '5K Run', weight: '22:45 min', date: 'Jan 12, 2026', improvement: '-1:30 min' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>My Progress</Text>
            <Text style={styles.subtitle}>Track your fitness journey</Text>
          </View>
          <TouchableOpacity style={styles.shareButton}>
            <Ionicons name="share-outline" size={24} color="#4CAF50" />
          </TouchableOpacity>
        </View>

        {/* Time Range Selector */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Time Range</Text>
          <View style={styles.timeRangeContainer}>
            {timeRanges.map((range) => (
              <TouchableOpacity
                key={range.id}
                style={[
                  styles.timeRangeButton,
                  timeRange === range.id && styles.timeRangeButtonActive,
                ]}
                onPress={() => setTimeRange(range.id)}
              >
                <Text
                  style={[
                    styles.timeRangeText,
                    timeRange === range.id && styles.timeRangeTextActive,
                  ]}
                >
                  {range.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Progress Chart */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Overall Progress</Text>
          <ProgressChart
            data={progressData}
            width={Dimensions.get('window').width - 48}
            height={220}
            strokeWidth={16}
            radius={32}
            chartConfig={{
              backgroundColor: '#ffffff',
              backgroundGradientFrom: '#ffffff',
              backgroundGradientTo: '#ffffff',
              decimalPlaces: 2,
              color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              style: {
                borderRadius: 16,
              },
            }}
            hideLegend={false}
            style={styles.chart}
          />
        </View>

        {/* Metric Selector */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Focus Metric</Text>
          <View style={styles.metricsContainer}>
            {metrics.map((metric) => (
              <TouchableOpacity
                key={metric.id}
                style={[
                  styles.metricButton,
                  selectedMetric === metric.id && styles.metricButtonActive,
                  { borderColor: metric.color },
                ]}
                onPress={() => setSelectedMetric(metric.id)}
              >
                <Ionicons
                  name={metric.icon}
                  size={20}
                  color={selectedMetric === metric.id ? 'white' : metric.color}
                />
                <Text
                  style={[
                    styles.metricText,
                    selectedMetric === metric.id && styles.metricTextActive,
                  ]}
                >
                  {metric.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Strength Trend Chart */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Strength Trend</Text>
            <TouchableOpacity onPress={() => navigation.navigate('TrainingAnalytics')}>
              <Text style={styles.seeAll}>View Details</Text>
            </TouchableOpacity>
          </View>
          <LineChart
            data={weeklyStrengthData}
            width={Dimensions.get('window').width - 48}
            height={200}
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

        {/* Personal Records */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Personal Records</Text>
            <TouchableOpacity>
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          </View>
          {personalRecords.map((record, index) => (
            <LinearGradient
              key={index}
              colors={['#ffffff', '#f8f9fa']}
              style={styles.recordCard}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <View style={styles.recordInfo}>
                <Text style={styles.recordExercise}>{record.exercise}</Text>
                <Text style={styles.recordDate}>{record.date}</Text>
              </View>
              <View style={styles.recordStats}>
                <Text style={styles.recordWeight}>{record.weight}</Text>
                <Text style={styles.recordImprovement}>{record.improvement}</Text>
              </View>
            </LinearGradient>
          ))}
        </View>

        {/* Achievements */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Achievements</Text>
            <TouchableOpacity>
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {achievements.map((achievement) => (
              <LinearGradient
                key={achievement.id}
                colors={['#4CAF50', '#2E7D32']}
                style={styles.achievementCard}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.achievementIcon}>
                  <Ionicons name={achievement.icon} size={32} color="white" />
                </View>
                <Text style={styles.achievementTitle}>{achievement.title}</Text>
                <Text style={styles.achievementDescription}>{achievement.description}</Text>
                <Text style={styles.achievementDate}>{achievement.date}</Text>
              </LinearGradient>
            ))}
          </ScrollView>
        </View>

        {/* Insights */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Insights</Text>
          <View style={styles.insightCard}>
            <Ionicons name="bulb-outline" size={24} color="#FFC107" />
            <View style={styles.insightContent}>
              <Text style={styles.insightTitle}>You're strongest on Wednesdays</Text>
              <Text style={styles.insightText}>
                Your performance data shows a 15% increase in strength metrics on
                Wednesdays compared to other weekdays.
              </Text>
            </View>
          </View>
          <View style={styles.insightCard}>
            <Ionicons name="trending-up" size={24} color="#4CAF50" />
            <View style={styles.insightContent}>
              <Text style={styles.insightTitle}>Consistency is improving</Text>
              <Text style={styles.insightText}>
                Your workout consistency has increased by 25% over the last month.
                Keep it up!
              </Text>
            </View>
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
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  shareButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
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
    marginBottom: 16,
  },
  seeAll: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
  },
  timeRangeContainer: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    padding: 4,
  },
  timeRangeButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  timeRangeButtonActive: {
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  timeRangeText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  timeRangeTextActive: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  chart: {
    borderRadius: 16,
    paddingRight: 16,
  },
  metricsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metricButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    backgroundColor: 'white',
  },
  metricButtonActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  metricText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  metricTextActive: {
    color: 'white',
  },
  recordCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  recordInfo: {
    flex: 1,
  },
  recordExercise: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  recordDate: {
    fontSize: 12,
    color: '#999',
  },
  recordStats: {
    alignItems: 'flex-end',
  },
  recordWeight: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 4,
  },
  recordImprovement: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '600',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  achievementCard: {
    width: 200,
    padding: 20,
    borderRadius: 16,
    marginRight: 16,
  },
  achievementIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  achievementTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  achievementDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 12,
    lineHeight: 20,
  },
  achievementDate: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  insightCard: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: '#eee',
  },
  insightContent: {
    flex: 1,
    marginLeft: 16,
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  insightText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});

export default ProgressScreen;