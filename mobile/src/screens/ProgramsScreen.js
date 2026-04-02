import React, { useState, useEffect, useRef } from 'react';
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
import WorkoutService from '../services/ProgramService';
import CreateProgramModal from '../components/CreateProgramModal';
import bleService from '../services/BLEService';
import { WorkoutSyncService } from '../services/WorkoutSyncService';

// Module-level singleton so sync state persists across renders
const syncService = new WorkoutSyncService(bleService);

// ── Create Routine Modal ─────────────────────────────────────────────────────

function CreateRoutineModal({ visible, workouts, routines, onClose, onSave, onSetActive, onDelete }) {
  const [tab, setTab] = useState('new'); // 'new' | 'manage'
  const [routineName, setRoutineName] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);

  useEffect(() => {
    if (visible) {
      setTab('new');
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
    onSave(routineName.trim(), selectedIds);
    onClose();
  };

  const handleDelete = (routine) => {
    Alert.alert(
      'Delete Routine',
      `Delete "${routine.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => onDelete(routine.id) },
      ]
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={rmStyles.container}>
        <View style={rmStyles.header}>
          <TouchableOpacity onPress={onClose} style={rmStyles.iconBtn}>
            <Ionicons name="close" size={28} color="#333" />
          </TouchableOpacity>
          <Text style={rmStyles.headerTitle}>Routines</Text>
          {tab === 'new' ? (
            <TouchableOpacity onPress={handleSave} style={rmStyles.iconBtn}>
              <Ionicons name="checkmark-sharp" size={28} color="#4CAF50" />
            </TouchableOpacity>
          ) : (
            <View style={rmStyles.iconBtn} />
          )}
        </View>

        {/* Tabs */}
        <View style={rmStyles.tabs}>
          <TouchableOpacity
            style={[rmStyles.tab, tab === 'new' && rmStyles.tabActive]}
            onPress={() => setTab('new')}
          >
            <Text style={[rmStyles.tabText, tab === 'new' && rmStyles.tabTextActive]}>New</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[rmStyles.tab, tab === 'manage' && rmStyles.tabActive]}
            onPress={() => setTab('manage')}
          >
            <Text style={[rmStyles.tabText, tab === 'manage' && rmStyles.tabTextActive]}>
              My Routines{routines.length > 0 ? ` (${routines.length})` : ''}
            </Text>
          </TouchableOpacity>
        </View>

        {tab === 'new' ? (
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
        ) : (
          <ScrollView style={rmStyles.body} showsVerticalScrollIndicator={false}>
            {routines.length === 0 ? (
              <View style={rmStyles.emptyWorkouts}>
                <Text style={rmStyles.emptyWorkoutsText}>No routines yet. Create one first.</Text>
              </View>
            ) : (
              routines.map((r) => (
                <View key={r.id} style={[rmStyles.routineRow, r.is_active && rmStyles.routineRowActive]}>
                  <View style={rmStyles.routineRowInfo}>
                    {r.is_active && (
                      <View style={rmStyles.activeBadge}>
                        <Text style={rmStyles.activeBadgeText}>Active</Text>
                      </View>
                    )}
                    <Text style={[rmStyles.routineRowName, r.is_active && rmStyles.routineRowNameActive]}>
                      {r.name}
                    </Text>
                    <Text style={rmStyles.routineRowMeta}>
                      {r.workout_ids?.length || 0} workouts
                    </Text>
                  </View>
                  <View style={rmStyles.routineRowActions}>
                    {!r.is_active && (
                      <TouchableOpacity
                        style={rmStyles.setActiveBtn}
                        onPress={() => onSetActive(r.id)}
                      >
                        <Text style={rmStyles.setActiveBtnText}>Set Active</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={[rmStyles.deleteBtn, r.is_active && rmStyles.deleteBtnDisabled]}
                      onPress={() => !r.is_active && handleDelete(r)}
                      disabled={r.is_active}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={20}
                        color={r.is_active ? '#ccc' : '#e53935'}
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
            <View style={{ height: 80 }} />
          </ScrollView>
        )}
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
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#fff',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#4CAF50',
  },
  tabText: { fontSize: 14, color: '#999', fontWeight: '500' },
  tabTextActive: { color: '#4CAF50', fontWeight: '700' },
  routineRow: {
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
  routineRowActive: { borderColor: '#4CAF50', backgroundColor: '#f1f8f1' },
  routineRowInfo: { flex: 1 },
  activeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#4CAF50',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginBottom: 4,
  },
  activeBadgeText: { fontSize: 10, color: '#fff', fontWeight: '700' },
  routineRowName: { fontSize: 16, color: '#333', fontWeight: '500' },
  routineRowNameActive: { color: '#2E7D32', fontWeight: '700' },
  routineRowMeta: { fontSize: 12, color: '#999', marginTop: 2 },
  routineRowActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  setActiveBtn: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  setActiveBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  deleteBtn: { padding: 6 },
  deleteBtnDisabled: { opacity: 0.3 },
});

// ── Workouts Screen ──────────────────────────────────────────────────────────

const WorkoutsScreen = () => {
  const [workouts, setWorkouts] = useState([]);
  const [routines, setRoutines] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [isWorkoutModalVisible, setIsWorkoutModalVisible] = useState(false);
  const [isRoutineModalVisible, setIsRoutineModalVisible] = useState(false);
  const [editingWorkout, setEditingWorkout] = useState(null);

  // Keep refs so BLE callbacks always see fresh data without stale captures.
  const workoutsRef = useRef([]);
  const routinesRef = useRef([]);

  const fetchData = async () => {
    try {
      const [workoutsRes, routinesRes] = await Promise.all([
        WorkoutService.getWorkouts(),
        WorkoutService.getRoutines(),
      ]);
      const newWorkouts = workoutsRes.items || [];
      const newRoutines = routinesRes || [];
      setWorkouts(newWorkouts);
      workoutsRef.current = newWorkouts;
      setRoutines(newRoutines);
      routinesRef.current = newRoutines;
      return newWorkouts;
    } catch (error) {
      console.log('Error fetching data:', error);
      return workoutsRef.current;
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Trigger sync whenever the tracker connects — only active routine's workouts
    bleService.onConnected = () => {
      const allWorkouts = workoutsRef.current;
      const allRoutines = routinesRef.current;
      const activeRoutine = allRoutines.find(r => r.is_active) ?? allRoutines[0] ?? null;
      const routineWorkouts = activeRoutine?.workout_ids?.length
        ? allWorkouts.filter(w => activeRoutine.workout_ids.includes(w.id || w._id))
        : allWorkouts;
      console.log('[Sync] Active routine:', activeRoutine?.name, '— workouts:', routineWorkouts.length);

      if (routineWorkouts.length === 0) {
        Alert.alert('Tracker connected', 'No workouts to sync. Create workouts and add them to an active routine first.');
        return;
      }

      syncService.syncOnConnect(routineWorkouts)
        .then(() => Alert.alert('Tracker synced', `${routineWorkouts.length} workout(s) from "${activeRoutine?.name ?? 'your routine'}" synced.`))
        .catch(e => Alert.alert('Sync failed', e.message || 'Could not sync workouts to tracker.'));
    };
    return () => {
      bleService.onConnected = null;
    };
  }, []);

  const onRefresh = () => {
    setIsRefreshing(true);
    fetchData();
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

  const handleRoutineCreated = async (name, workoutIds) => {
    try {
      const created = await WorkoutService.createRoutine(name, workoutIds);
      setRoutines(prev => [...prev, created]);
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to create routine');
    }
  };

  // Called by CreateProgramModal with the newly created workout object
  const handleWorkoutSaveSuccess = async (createdWorkout) => {
    const newWorkouts = await fetchData();
    syncService.onWorkoutChanged('upsert', createdWorkout, newWorkouts).catch(e =>
      console.warn('[Sync] create workout sync error:', e.message)
    );
  };

  const handleSetActive = async (routineId) => {
    try {
      await WorkoutService.setActiveRoutine(routineId);
      setRoutines(prev => prev.map(r => ({ ...r, is_active: r.id === routineId })));
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to set active routine');
    }
  };

  const handleDeleteWorkout = (workout) => {
    Alert.alert(
      'Delete Workout',
      `Delete "${workout.title}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive', onPress: async () => {
            try {
              const id = workout.id || workout._id;
              await WorkoutService.deleteWorkout(id);
              const newWorkouts = await fetchData();
              syncService.onWorkoutChanged('delete', workout, newWorkouts).catch(() => {});
            } catch (error) {
              Alert.alert('Error', error.message || 'Failed to delete workout');
            }
          },
        },
      ],
    );
  };

  const handleDeleteRoutine = async (routineId) => {
    try {
      await WorkoutService.deleteRoutine(routineId);
      setRoutines(prev => prev.filter(r => r.id !== routineId));
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to delete routine');
    }
  };

  const activeRoutine = routines.find(r => r.is_active) ?? routines[0] ?? null;

  const renderWorkoutCard = ({ item, index }) => {
    const s = getStyling(index);
    const exerciseCount = item.items?.length || 0;
    return (
      <TouchableOpacity
        style={styles.workoutCard}
        onPress={() => { setEditingWorkout(item); setIsWorkoutModalVisible(true); }}
        onLongPress={() => handleDeleteWorkout(item)}
        delayLongPress={500}
      >
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
        onClose={() => { setIsWorkoutModalVisible(false); setEditingWorkout(null); }}
        onSaveSuccess={handleWorkoutSaveSuccess}
        editWorkout={editingWorkout}
      />

      <CreateRoutineModal
        visible={isRoutineModalVisible}
        workouts={workouts}
        routines={routines}
        onClose={() => setIsRoutineModalVisible(false)}
        onSave={handleRoutineCreated}
        onSetActive={handleSetActive}
        onDelete={handleDeleteRoutine}
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
