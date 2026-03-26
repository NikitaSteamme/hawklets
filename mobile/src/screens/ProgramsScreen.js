import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import ProgramService from '../services/ProgramService';
import CreateProgramModal from '../components/CreateProgramModal';

const ProgramsScreen = () => {
  const [activeProgram, setActiveProgram] = useState(0);
  const [programs, setPrograms] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const [isModalVisible, setIsModalVisible] = useState(false);

  const fetchPrograms = async () => {
    try {
      const response = await ProgramService.getPrograms(1, 100);
      setPrograms(response.items || []);
    } catch (error) {
      console.log('Error fetching programs:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPrograms();
  }, []);

  const onRefresh = () => {
    setIsRefreshing(true);
    fetchPrograms();
  };

  // Helper to assign reliable colors and icons based on index
  const getStyling = (index) => {
    const styles = [
      { color: '#4CAF50', icon: 'barbell' },
      { color: '#2196F3', icon: 'flash' },
      { color: '#9C27B0', icon: 'body' },
      { color: '#FF9800', icon: 'trending-up' },
    ];
    return styles[index % styles.length];
  };

  const renderProgramCard = ({ item, index }) => {
    const styleRef = getStyling(index);
    const exerciseCount = item.items ? item.items.length : 0;
    
    return (
      <TouchableOpacity
        style={[styles.programCard, activeProgram === index && { borderColor: styleRef.color }]}
        onPress={() => setActiveProgram(index)}
      >
        <LinearGradient
          colors={[styleRef.color + '20', styleRef.color + '40']}
          style={styles.programGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.programHeader}>
            <View style={[styles.programIcon, { backgroundColor: styleRef.color + '30' }]}>
              <Ionicons name={styleRef.icon} size={24} color={styleRef.color} />
            </View>
            <View style={styles.programInfo}>
              <Text style={styles.programTitle}>{item.title}</Text>
              <Text style={styles.programDescription}>{item.description || 'Custom User Program'}</Text>
            </View>
          </View>

          <View style={styles.programDetails}>
            <View style={styles.detailItem}>
              <Ionicons name="documents-outline" size={16} color="#666" />
              <Text style={styles.detailText}>{exerciseCount} Exercises</Text>
            </View>
            <View style={styles.detailItem}>
              <Ionicons name="speedometer-outline" size={16} color="#666" />
              <Text style={styles.detailText}>Custom</Text>
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>My Programs</Text>
            <Text style={styles.subtitle}>Track and manage your training plans</Text>
          </View>
          <TouchableOpacity style={styles.addButton} onPress={() => setIsModalVisible(true)}>
            <Ionicons name="add" size={24} color="white" />
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <ActivityIndicator size="large" color="#4CAF50" style={{ marginTop: 50 }} />
        ) : (
          <>
            {/* Active Program Highlight */}
            {programs.length > 0 && programs[activeProgram] && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Active Program</Text>
                <LinearGradient
                  colors={['#4CAF50', '#2E7D32']}
                  style={styles.activeProgramHighlight}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <View style={styles.activeProgramContent}>
                    <View>
                      <Text style={styles.activeProgramTitle}>{programs[activeProgram].title}</Text>
                      <Text style={styles.activeProgramSubtitle}>
                        {programs[activeProgram].items?.length || 0} Exercises Built
                      </Text>
                    </View>
                    <TouchableOpacity style={styles.resumeButton}>
                      <Text style={styles.resumeButtonText}>Start</Text>
                    </TouchableOpacity>
                  </View>
                </LinearGradient>
              </View>
            )}

            {/* All Programs */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Available Programs</Text>
              </View>
              {programs.length === 0 ? (
                <View style={{ padding: 20, alignItems: 'center' }}>
                  <Text style={{ color: '#666' }}>No programs yet. Tap the + to create one!</Text>
                </View>
              ) : (
                <FlatList
                  data={programs}
                  renderItem={renderProgramCard}
                  keyExtractor={(item) => item.id || item._id || Math.random().toString()}
                  scrollEnabled={false}
                />
              )}
            </View>
          </>
        )}
      </ScrollView>

      {/* Create Program Modal */}
      <CreateProgramModal 
        visible={isModalVisible} 
        onClose={() => setIsModalVisible(false)} 
        onSaveSuccess={onRefresh} 
      />
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
  title: { fontSize: 28, fontWeight: 'bold', color: '#333' },
  subtitle: { fontSize: 14, color: '#666', marginTop: 4 },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  section: { paddingHorizontal: 24, marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  activeProgramHighlight: { borderRadius: 16, padding: 20 },
  activeProgramContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  activeProgramTitle: { fontSize: 20, fontWeight: 'bold', color: 'white' },
  activeProgramSubtitle: { fontSize: 14, color: 'rgba(255, 255, 255, 0.9)', marginTop: 4 },
  resumeButton: { backgroundColor: 'white', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 },
  resumeButtonText: { color: '#4CAF50', fontWeight: 'bold', fontSize: 14 },
  programCard: { marginBottom: 16, borderRadius: 16, overflow: 'hidden', borderWidth: 2, borderColor: 'transparent' },
  programGradient: { padding: 20 },
  programHeader: { flexDirection: 'row', marginBottom: 16 },
  programIcon: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  programInfo: { flex: 1 },
  programTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  programDescription: { fontSize: 14, color: '#666', lineHeight: 20 },
  programDetails: { flexDirection: 'row', marginBottom: 8 },
  detailItem: { flexDirection: 'row', alignItems: 'center', marginRight: 20 },
  detailText: { fontSize: 14, color: '#666', marginLeft: 6 },
});

export default ProgramsScreen;