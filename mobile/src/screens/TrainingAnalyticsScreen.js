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
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';

const screenWidth = Dimensions.get('window').width;

const TrainingAnalyticsScreen = ({ navigation }) => {
  const [selectedPeriod, setSelectedPeriod] = useState('week');
  const [selectedMetric, setSelectedMetric] = useState('performance');

  // Mock data for charts
  const weeklyData = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [
      {
        data: [65, 78, 82, 75, 90, 85, 88],
        color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`,
        strokeWidth: 2,
      },
    ],
  };

  const monthlyData = {
    labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
    datasets: [
      {
        data: [75, 82, 78, 85],
        color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`,
        strokeWidth: 2,
      },
    ],
  };

  const exerciseDistribution = [
    {
      name: 'Strength',
      population: 35,
      color: '#4CAF50',
      legendFontColor: '#333',
      legendFontSize: 12,
    },
    {
      name: 'Cardio',
      population: 25,
      color: '#2196F3',
      legendFontColor: '#333',
      legendFontSize: 12,
    },
    {
      name: 'Flexibility',
      population: 20,
      color: '#9C27B0',
      legendFontColor: '#333',
      legendFontSize: 12,
    },
    {
      name: 'Balance',
      population: 15,
      color: '#FF9800',
      legendFontColor: '#333',
      legendFontSize: 12,
    },
    {
      name: 'Recovery',
      population: 5,
      color: '#F44336',
      legendFontColor: '#333',
      legendFontSize: 12,
    },
  ];

  const techniqueMetrics = [
    { name: 'Form Accuracy', value: 85, target: 90, unit: '%' },
    { name: 'Range of Motion', value: 78, target: 85, unit: '%' },
    { name: 'Tempo Control', value: 92, target: 88, unit: '%' },
    { name: 'Breathing Sync', value: 65, target: 80, unit: '%' },
    { name: 'Muscle Activation', value: 88, target: 85, unit: '%' },
  ];

  const performanceMetrics = [
    { label: 'Avg Heart Rate', value: '142', unit: 'bpm', trend: '+2%' },
    { label: 'Calories Burned', value: '420', unit: 'kcal', trend: '+5%' },
    { label: 'Workout Duration', value: '45', unit: 'min', trend: '-3%' },
    { label: 'Recovery Time', value: '28', unit: 'hrs', trend: '-8%' },
    { label: 'Max Load', value: '85', unit: 'kg', trend: '+12%' },
    { label: 'Rep Consistency', value: '92', unit: '%', trend: '+4%' },
  ];

  const tips = [
    'Focus on maintaining proper form during squats to prevent knee strain.',
    'Increase your warm-up duration by 5 minutes to improve muscle activation.',
    'Try interval training to boost cardiovascular endurance.',
    'Incorporate more protein in your post-workout meals for better recovery.',
    'Consider adding yoga sessions to improve flexibility and balance.',
  ];

  const chartConfig = {
    backgroundColor: '#FFFFFF',
    backgroundGradientFrom: '#FFFFFF',
    backgroundGradientTo: '#FFFFFF',
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
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Training Analytics</Text>
        <TouchableOpacity>
          <Icon name="export" size={24} color="#4CAF50" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Period Selector */}
        <View style={styles.periodSelector}>
          {['day', 'week', 'month', 'year'].map((period) => (
            <TouchableOpacity
              key={period}
              style={[
                styles.periodButton,
                selectedPeriod === period && styles.periodButtonActive,
              ]}
              onPress={() => setSelectedPeriod(period)}
            >
              <Text
                style={[
                  styles.periodButtonText,
                  selectedPeriod === period && styles.periodButtonTextActive,
                ]}
              >
                {period.charAt(0).toUpperCase() + period.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Performance Chart */}
        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <Text style={styles.chartTitle}>Performance Trend</Text>
            <View style={styles.metricSelector}>
              {['performance', 'calories', 'heartrate'].map((metric) => (
                <TouchableOpacity
                  key={metric}
                  style={[
                    styles.metricButton,
                    selectedMetric === metric && styles.metricButtonActive,
                  ]}
                  onPress={() => setSelectedMetric(metric)}
                >
                  <Text
                    style={[
                      styles.metricButtonText,
                      selectedMetric === metric && styles.metricButtonTextActive,
                    ]}
                  >
                    {metric.charAt(0).toUpperCase() + metric.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          
          <LineChart
            data={selectedPeriod === 'week' ? weeklyData : monthlyData}
            width={screenWidth - 48}
            height={220}
            chartConfig={chartConfig}
            bezier
            style={styles.chart}
          />
        </View>

        {/* Performance Metrics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Performance Metrics</Text>
          <View style={styles.metricsGrid}>
            {performanceMetrics.map((metric, index) => (
              <View key={index} style={styles.metricCard}>
                <Text style={styles.metricLabel}>{metric.label}</Text>
                <View style={styles.metricValueRow}>
                  <Text style={styles.metricValue}>{metric.value}</Text>
                  <Text style={styles.metricUnit}>{metric.unit}</Text>
                </View>
                <Text style={[
                  styles.metricTrend,
                  metric.trend.startsWith('+') ? styles.trendPositive : styles.trendNegative
                ]}>
                  {metric.trend}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Exercise Distribution */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Exercise Distribution</Text>
          <View style={styles.distributionCard}>
            <PieChart
              data={exerciseDistribution}
              width={screenWidth - 48}
              height={180}
              chartConfig={chartConfig}
              accessor="population"
              backgroundColor="transparent"
              paddingLeft="15"
              absolute
            />
            <View style={styles.distributionLegend}>
              {exerciseDistribution.map((item, index) => (
                <View key={index} style={styles.legendItem}>
                  <View style={[styles.legendColor, { backgroundColor: item.color }]} />
                  <Text style={styles.legendText}>{item.name}: {item.population}%</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Technique Analysis */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Technique Analysis</Text>
          <LinearGradient
            colors={['#4CAF50', '#2E7D32']}
            style={styles.techniqueCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.techniqueTitle}>Overall Technique Score</Text>
            <Text style={styles.techniqueScore}>81%</Text>
            <Text style={styles.techniqueSubtitle}>Good - Room for improvement</Text>
            
            {techniqueMetrics.map((metric, index) => (
              <View key={index} style={styles.techniqueMetric}>
                <View style={styles.techniqueMetricHeader}>
                  <Text style={styles.techniqueMetricName}>{metric.name}</Text>
                  <Text style={styles.techniqueMetricValue}>
                    {metric.value}{metric.unit} / {metric.target}{metric.unit}
                  </Text>
                </View>
                <View style={styles.progressBar}>
                  <View 
                    style={[
                      styles.progressFill,
                      { 
                        width: `${(metric.value / metric.target) * 100 > 100 ? 100 : (metric.value / metric.target) * 100}%`,
                        backgroundColor: metric.value >= metric.target ? '#FFEB3B' : '#FF9800'
                      }
                    ]} 
                  />
                </View>
              </View>
            ))}
          </LinearGradient>
        </View>

        {/* Improvement Tips */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Improvement Tips</Text>
          {tips.map((tip, index) => (
            <View key={index} style={styles.tipCard}>
              <Icon name="lightbulb-outline" size={24} color="#FFC107" />
              <Text style={styles.tipText}>{tip}</Text>
            </View>
          ))}
        </View>

        {/* Comparison */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Peer Comparison</Text>
          <View style={styles.comparisonCard}>
            <View style={styles.comparisonItem}>
              <Text style={styles.comparisonLabel}>Your Rank</Text>
              <Text style={styles.comparisonValue}>Top 15%</Text>
            </View>
            <View style={styles.comparisonDivider} />
            <View style={styles.comparisonItem}>
              <Text style={styles.comparisonLabel}>Avg. in Group</Text>
              <Text style={styles.comparisonValue}>72%</Text>
            </View>
            <View style={styles.comparisonDivider} />
            <View style={styles.comparisonItem}>
              <Text style={styles.comparisonLabel}>Best in Group</Text>
              <Text style={styles.comparisonValue}>94%</Text>
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
  periodSelector: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    marginTop: 8,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
    marginHorizontal: 4,
  },
  periodButtonActive: {
    backgroundColor: '#4CAF50',
  },
  periodButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  periodButtonTextActive: {
    color: '#FFF',
  },
  chartCard: {
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  metricSelector: {
    flexDirection: 'row',
  },
  metricButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 8,
  },
  metricButtonActive: {
    backgroundColor: '#4CAF50',
  },
  metricButtonText: {
    fontSize: 12,
    color: '#666',
  },
  metricButtonTextActive: {
    color: '#FFF',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 8,
  },
  section: {
    paddingHorizontal: 16,
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  metricCard: {
    width: '48%',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  metricLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
    textAlign: 'center',
  },
  metricValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  metricUnit: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  metricTrend: {
    fontSize: 12,
    fontWeight: '600',
  },
  trendPositive: {
    color: '#4CAF50',
  },
  trendNegative: {
    color: '#F44336',
  },
  distributionCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  distributionLegend: {
    marginTop: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  legendText: {
    fontSize: 14,
    color: '#333',
  },
  techniqueCard: {
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  techniqueTitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 4,
  },
  techniqueScore: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 4,
  },
  techniqueSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 20,
  },
  techniqueMetric: {
    marginBottom: 16,
  },
  techniqueMetricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  techniqueMetricName: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  techniqueMetricValue: {
    fontSize: 14,
    color: '#FFF',
    fontWeight: '600',
  },
  progressBar: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    marginLeft: 12,
    lineHeight: 20,
  },
  comparisonCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  comparisonItem: {
    flex: 1,
    alignItems: 'center',
  },
  comparisonDivider: {
    width: 1,
    backgroundColor: '#E0E0E0',
  },
  comparisonLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  comparisonValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
});

export default TrainingAnalyticsScreen;