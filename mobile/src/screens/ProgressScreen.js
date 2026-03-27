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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import WorkoutService from '../services/ProgramService';

// ── Log Workout Modal ─────────────────────────────────────────────────────────

function LogWorkoutModal({ visible, workouts, onClose, onSave }) {
  const [workoutName, setWorkoutName] = useState('');
  const [selectedWorkoutId, setSelectedWorkoutId] = useState(null);
  const [duration, setDuration] = useState('');
  const [notes, setNotes] = useState('');
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    if (visible) {
      setWorkoutName('');
      setSelectedWorkoutId(null);
      setDuration('');
      setNotes('');
      setShowPicker(false);
    }
  }, [visible]);

  const selectWorkout = (w) => {
    const id = w.id || w._id;
    setSelectedWorkoutId(id);
    setWorkoutName(w.title);
    setShowPicker(false);
  };

  const handleSave = () => {
    if (!workoutName.trim()) {
      Alert.alert('Validation', 'Please enter a workout name');
      return;
    }
    const mins = duration ? parseInt(duration, 10) : null;
    if (duration && (isNaN(mins) || mins <= 0)) {
      Alert.alert('Validation', 'Duration must be a positive number');
      return;
    }
    onSave({
      workoutName: workoutName.trim(),
      workoutId: selectedWorkoutId,
      durationMinutes: mins,
      notes: notes.trim() || null,
    });
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={lmStyles.container}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={lmStyles.header}>
            <TouchableOpacity onPress={onClose} style={lmStyles.iconBtn}>
              <Ionicons name="close" size={28} color="#333" />
            </TouchableOpacity>
            <Text style={lmStyles.headerTitle}>Log Workout</Text>
            <TouchableOpacity onPress={handleSave} style={lmStyles.iconBtn}>
              <Ionicons name="checkmark-sharp" size={28} color="#4CAF50" />
            </TouchableOpacity>
          </View>

          <ScrollView style={lmStyles.body} showsVerticalScrollIndicator={false}>
            <Text style={lmStyles.label}>Workout</Text>
            <TextInput
              style={lmStyles.input}
              placeholder="e.g. Morning Push Day"
              value={workoutName}
              onChangeText={(t) => { setWorkoutName(t); setSelectedWorkoutId(null); }}
            />

            {workouts.length > 0 && (
              <>
                <TouchableOpacity
                  style={lmStyles.pickerToggle}
                  onPress={() => setShowPicker(v => !v)}
                >
                  <Ionicons name="list-outline" size={16} color="#4CAF50" />
                  <Text style={lmStyles.pickerToggleText}>
                    {showPicker ? 'Hide workout list' : 'Pick from your workouts'}
                  </Text>
                  <Ionicons
                    name={showPicker ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color="#4CAF50"
                  />
                </TouchableOpacity>

                {showPicker && workouts.map((w) => {
                  const id = w.id || w._id;
                  const selected = selectedWorkoutId === id;
                  return (
                    <TouchableOpacity
                      key={id}
                      style={[lmStyles.workoutOption, selected && lmStyles.workoutOptionSelected]}
                      onPress={() => selectWorkout(w)}
                    >
                      <Ionicons
                        name={selected ? 'radio-button-on' : 'radio-button-off'}
                        size={18}
                        color={selected ? '#4CAF50' : '#ccc'}
                      />
                      <Text style={[lmStyles.workoutOptionText, selected && lmStyles.workoutOptionTextSelected]}>
                        {w.title}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </>
            )}

            <Text style={[lmStyles.label, { marginTop: 24 }]}>Duration (minutes)</Text>
            <TextInput
              style={lmStyles.input}
              placeholder="e.g. 45"
              value={duration}
              onChangeText={setDuration}
              keyboardType="number-pad"
            />

            <Text style={[lmStyles.label, { marginTop: 24 }]}>Notes (optional)</Text>
            <TextInput
              style={[lmStyles.input, lmStyles.notesInput]}
              placeholder="How did it go?"
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <View style={{ height: 80 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const lmStyles = StyleSheet.create({
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
  notesInput: { minHeight: 100, paddingTop: 12 },
  pickerToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 8,
    gap: 6,
  },
  pickerToggleText: { fontSize: 14, color: '#4CAF50', fontWeight: '500', flex: 1 },
  workoutOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    marginBottom: 6,
    backgroundColor: '#fff',
    gap: 10,
  },
  workoutOptionSelected: { borderColor: '#4CAF50', backgroundColor: '#f1f8f1' },
  workoutOptionText: { fontSize: 15, color: '#333' },
  workoutOptionTextSelected: { color: '#2E7D32', fontWeight: '600' },
});

// ── Journal Screen ────────────────────────────────────────────────────────────

const CARD_ACCENTS = ['#4CAF50', '#2196F3', '#9C27B0', '#FF9800', '#E91E63'];

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

const JournalScreen = () => {
  const [logs, setLogs] = useState([]);
  const [workouts, setWorkouts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);

  const fetchData = async () => {
    try {
      const [logsRes, workoutsRes] = await Promise.all([
        WorkoutService.getWorkoutLogs(),
        WorkoutService.getWorkouts(),
      ]);
      setLogs(Array.isArray(logsRes) ? logsRes : []);
      setWorkouts(workoutsRes.items || []);
    } catch (error) {
      console.log('Error fetching journal data:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = () => {
    setIsRefreshing(true);
    fetchData();
  };

  const handleSaveLog = async ({ workoutName, workoutId, durationMinutes, notes }) => {
    try {
      const created = await WorkoutService.createWorkoutLog(
        workoutName,
        workoutId,
        null,
        durationMinutes,
        notes
      );
      setLogs(prev => [created, ...prev]);
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to save workout log');
    }
  };

  const handleDelete = (log) => {
    Alert.alert(
      'Delete Entry',
      `Remove "${log.workout_name}" from your journal?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await WorkoutService.deleteWorkoutLog(log.id);
              setLogs(prev => prev.filter(l => l.id !== log.id));
            } catch (error) {
              Alert.alert('Error', error.message || 'Failed to delete entry');
            }
          },
        },
      ]
    );
  };

  const renderLogCard = ({ item, index }) => {
    const accent = CARD_ACCENTS[index % CARD_ACCENTS.length];
    return (
      <View style={[styles.card, { borderLeftColor: accent }]}>
        <View style={styles.cardTop}>
          <View style={styles.cardLeft}>
            <Text style={styles.cardWorkout}>{item.workout_name}</Text>
            <Text style={styles.cardDate}>{formatDate(item.logged_at)}</Text>
          </View>
          <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item)}>
            <Ionicons name="trash-outline" size={18} color="#ccc" />
          </TouchableOpacity>
        </View>
        <View style={styles.cardMeta}>
          {item.duration_minutes != null && (
            <View style={[styles.badge, { backgroundColor: accent + '20' }]}>
              <Ionicons name="time-outline" size={13} color={accent} />
              <Text style={[styles.badgeText, { color: accent }]}>{item.duration_minutes} min</Text>
            </View>
          )}
        </View>
        {!!item.notes && (
          <Text style={styles.cardNotes} numberOfLines={2}>{item.notes}</Text>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Journal</Text>
          <Text style={styles.subtitle}>Your training history</Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setIsModalVisible(true)}
        >
          <Ionicons name="add" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color="#4CAF50" style={{ marginTop: 60 }} />
      ) : logs.length === 0 ? (
        <View style={styles.emptyState}>
          <LinearGradient
            colors={['#E8F5E9', '#F1F8E9']}
            style={styles.emptyIcon}
          >
            <Ionicons name="journal-outline" size={48} color="#4CAF50" />
          </LinearGradient>
          <Text style={styles.emptyTitle}>No workouts logged yet</Text>
          <Text style={styles.emptySubtitle}>
            Tap the + button to record your first session
          </Text>
          <TouchableOpacity
            style={styles.emptyBtn}
            onPress={() => setIsModalVisible(true)}
          >
            <Text style={styles.emptyBtnText}>Log Workout</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={logs}
          renderItem={renderLogCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
        />
      )}

      <LogWorkoutModal
        visible={isModalVisible}
        workouts={workouts}
        onClose={() => setIsModalVisible(false)}
        onSave={handleSaveLog}
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
  list: { paddingHorizontal: 24, paddingBottom: 24 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardLeft: { flex: 1 },
  cardWorkout: { fontSize: 17, fontWeight: '700', color: '#222', marginBottom: 4 },
  cardDate: { fontSize: 13, color: '#999' },
  deleteBtn: { padding: 4, marginLeft: 8 },
  cardMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 4,
  },
  badgeText: { fontSize: 12, fontWeight: '600' },
  cardNotes: { fontSize: 14, color: '#666', marginTop: 10, lineHeight: 20 },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: '#999', textAlign: 'center', lineHeight: 20, marginBottom: 28 },
  emptyBtn: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 14,
  },
  emptyBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});

export default JournalScreen;
