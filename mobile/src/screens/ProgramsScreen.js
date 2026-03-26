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
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import ProgramService from '../services/ProgramService';
import CreateProgramModal from '../components/CreateProgramModal';

// ── Create Routine Modal ─────────────────────────────────────────────────────

function CreateRoutineModal({ visible, workouts, onClose, onSave }) {
  const [routineName, setRoutineName] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);

  useEffect(() => {
    if (visible) {
      setRoutineName('');
      setSelectedIds([]);
    }
  }, [visible]);

  const toggleWorkout = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSave = () => {
    if (!routineName.trim()) {
      Alert.alert('Validation', 'Please enter a routine name');
      return;
    }
    if (selectedIds.length === 0) {
      Alert.alert('Validation', 'Please select at least one workout');
      return;
    }
    const selectedWorkouts = workouts.filter(w => selectedIds.includes(w.id || w._id));
    onSave({ name: routineName.trim(), workouts: selectedWorkouts });
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={rmStyles.container}>
        <View style={rmStyles.header}>
          <TouchableOpacity onPress={onClose} style={rmStyles.iconBtn}>
            <Ionicons name="close" size={28} color="#333" />
          </TouchableOpacity>
          <Text style={rmStyles.headerTitle}>New Routine</Text>
          <TouchableOpacity onPress={handleSave} style={rmStyles.iconBtn}>
            <Ionicons name="checkmark-sharp" size={28} color="#4CAF50" />
          </TouchableOpacity>
        </View>

        <ScrollView style={rmStyles.body} showsVerticalScrollIndicator={false}>
          <Text style={rmStyles.label}>Routine Name</Text>
          <TextInput
            style={rmStyles.input}
            placeholder="e.g. 5-Day Power Block"
            value={routineName}
            onChangeText={setRoutineName}
          />

          <Text style={[rmStyles.label, { marginTop: 24 }]}>Add Workouts</Text>
          {workouts.length === 0 ? (
            <View style={rmStyles.emptyWorkouts}>
              <Text style={rmStyles.emptyWorkoutsText}>
                No workouts yet. Create some workouts first.
              </Text>
            </View>
          ) : (
            workouts.map((w) => {
              const id = w.id || w._id;
              const selected = selectedIds.includes(id);
              return (
                <TouchableOpacity
                  key={id}
                  style={[rmStyles.workoutRow, selected && rmStyles.workoutRowSelected]}
                  onPress={() => toggleWorkout(id)}
                >
                  <View style={rmStyles.workoutRowLeft}>
                    <Ionicons
                      name={selected ? 'checkbox' : 'square-outline'}
                      size={22}
                      color={selected ? '#4CAF50' : '#ccc'}
                    />
                    <Text style={[rmStyles.workoutRowText, selected && rmStyles.workoutRowTextSelected]}>
                      {w.title}
                    </Text>
                  </View>
                  <Text style={rmStyles.workoutRowMeta}>
                    {w.items?.length || 0} exercises
                  </Text>
                </TouchableOpacity>
              );
            })
          )}
          <View style={{ height: 80 }} />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const rmStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  iconBtn: { padding: 8 },
  headerTitle: { fontSize: 20, fontWeight: 'bold' },
  body: { padding: 16 },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  emptyWorkouts: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
  },
  emptyWorkoutsText: { color: '#999', fontStyle: 'italic' },
  workoutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 10,
    marginBottom: 10,
    backgroundColor: '#fff',
  },
  workoutRowSelected: { borderColor: '#4CAF50', backgroundColor: '#f1f8f1' },
  workoutRowLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  workoutRowText: { fontSize: 16, color: '#333', marginLeft: 12 },
  workoutRowTextSelected: { color: '#2E7D32', fontWeight: '600' },
  workoutRowMeta: { fontSize: 12, color: '#999' },
});

// ── Workouts Screen ──────────────────────────────────────────────────────────

const WorkoutsScreen = () => {
  const [workouts, setWorkouts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [routines, setRoutines] = useState([]);

  const [isWorkoutModalVisible, setIsWorkoutModalVisible] = useState(false);
  const [isRoutineModalVisible, setIsRoutineModalVisible] = useState(false);

  const fetchWorkouts = async () => {
    try {
      const response = await ProgramService.getPrograms(1, 100);
      setWorkouts(response.items || []);
    } catch (error) {
      console.log('Error fetching workouts:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchWorkouts();
  }, []);

  const onRefresh = () => {
    setIsRefreshing(true);
    fetchWorkouts();
  };

  const getStyling = (index) => {
    const palette = [
      { color: '#4CAF50', icon: 'barbell' },
      { color: '#2196F3', icon: 'flash' },
      { color: '#9C27B0', icon: 'body' },
      { color: '#FF9800', icon: 'trending-up' },
    ];
    return palette[index % palette.length];
  };

  const handleRoutineCreated = (routine) => {
    setRoutines(prev => [...prev, routine]);
  };

  const activeRoutine = routines[0] ?? null;

  const renderWorkoutCard = ({ item, index }) => {
    const s = getStyling(index);
    const exerciseCount = item.items?.length || 0;
    return (
      <TouchableOpacity style={styles.workoutCard}>
        <LinearGradient
          colors={[s.color + '20', s.color + '40']}
          style={styles.workoutGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.workoutHeader}>
            <View style={[styles.workoutIcon, { backgroundColor: s.color + '30' }]}>
              <Ionicons name={s.icon} size={24} color={s.color} />
            </View>
            <View style={styles.workoutInfo}>
              <Text style={styles.workoutTitle}>{item.title}</Text>
              <Text style={styles.workoutDescription}>
                {item.description || 'Custom workout'}
              </Text>
            </View>
          </View>
          <View style={styles.workoutDetails}>
            <View style={styles.detailItem}>
              <Ionicons name="documents-outline" size={16} color="#666" />
              <Text style={styles.detailText}>{exerciseCount} Exercises</Text>
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
            <Text style={styles.title}>My Routines</Text>
            <Text style={styles.subtitle}>Manage your training routines</Text>
          </View>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setIsRoutineModalVisible(true)}
          >
            <Ionicons name="add" size={24} color="white" />
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <ActivityIndicator size="large" color="#4CAF50" style={{ marginTop: 50 }} />
        ) : (
          <>
            {/* Active Routine */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Active Routine</Text>
              <LinearGradient
                colors={['#4CAF50', '#2E7D32']}
                style={styles.activeRoutineCard}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <View style={styles.activeRoutineContent}>
                  <View>
                    <Text style={styles.activeRoutineName}>
                      {activeRoutine ? activeRoutine.name : 'No active routine'}
                    </Text>
                    <View style={styles.streakRow}>
                      <Ionicons name="flame" size={16} color="rgba(255,255,255,0.9)" />
                      <Text style={styles.activeRoutineStreak}>
                        Current Streak: 999 days
                      </Text>
                    </View>
                  </View>
                  {!activeRoutine && (
                    <TouchableOpacity
                      style={styles.createInlineBtn}
                      onPress={() => setIsRoutineModalVisible(true)}
                    >
                      <Text style={styles.createInlineBtnText}>Create</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </LinearGradient>
            </View>

            {/* Available Workouts */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Available Workouts</Text>
                <TouchableOpacity
                  style={styles.newWorkoutBtn}
                  onPress={() => setIsWorkoutModalVisible(true)}
                >
                  <Ionicons name="add" size={18} color="#fff" />
                  <Text style={styles.newWorkoutBtnText}>New Workout</Text>
                </TouchableOpacity>
              </View>

              {workouts.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>
                    No workouts yet. Tap "New Workout" to create one!
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={workouts}
                  renderItem={renderWorkoutCard}
                  keyExtractor={(item) => item.id || item._id || Math.random().toString()}
                  scrollEnabled={false}
                />
              )}
            </View>
          </>
        )}
      </ScrollView>

      <CreateProgramModal
        visible={isWorkoutModalVisible}
        onClose={() => setIsWorkoutModalVisible(false)}
        onSaveSuccess={onRefresh}
      />

      <CreateRoutineModal
        visible={isRoutineModalVisible}
        workouts={workouts}
        onClose={() => setIsRoutineModalVisible(false)}
        onSave={handleRoutineCreated}
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 12 },
  activeRoutineCard: { borderRadius: 16, padding: 20 },
  activeRoutineContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  activeRoutineName: { fontSize: 20, fontWeight: 'bold', color: 'white', marginBottom: 6 },
  streakRow: { flexDirection: 'row', alignItems: 'center' },
  activeRoutineStreak: { fontSize: 14, color: 'rgba(255,255,255,0.9)', marginLeft: 6 },
  createInlineBtn: {
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  createInlineBtnText: { color: '#4CAF50', fontWeight: 'bold', fontSize: 14 },
  newWorkoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  newWorkoutBtnText: { color: '#fff', fontWeight: 'bold', marginLeft: 4, fontSize: 14 },
  emptyState: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  emptyStateText: { color: '#666', textAlign: 'center' },
  workoutCard: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  workoutGradient: { padding: 20 },
  workoutHeader: { flexDirection: 'row', marginBottom: 16 },
  workoutIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  workoutInfo: { flex: 1 },
  workoutTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  workoutDescription: { fontSize: 14, color: '#666', lineHeight: 20 },
  workoutDetails: { flexDirection: 'row' },
  detailItem: { flexDirection: 'row', alignItems: 'center', marginRight: 20 },
  detailText: { fontSize: 14, color: '#666', marginLeft: 6 },
});

export default WorkoutsScreen;
