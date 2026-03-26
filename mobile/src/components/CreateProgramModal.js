import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import WorkoutService from '../services/ProgramService';

const CreateProgramModal = ({ visible, onClose, onSaveSuccess }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [globalRestSec, setGlobalRestSec] = useState('60');
  
  const [availableExercises, setAvailableExercises] = useState([]);
  const [selectedExercises, setSelectedExercises] = useState([]);
  
  // Filtering States
  const [searchText, setSearchText] = useState('');
  const [selectedType, setSelectedType] = useState('All');
  const [selectedMuscle, setSelectedMuscle] = useState('All');
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [showExercisePicker, setShowExercisePicker] = useState(false);

  useEffect(() => {
    if (visible) {
      fetchExercises();
      setTitle('');
      setDescription('');
      setGlobalRestSec('60');
      setSelectedExercises([]);
      setShowExercisePicker(false);
      setSearchText('');
      setSelectedType('All');
      setSelectedMuscle('All');
    }
  }, [visible]);

  const fetchExercises = async () => {
    try {
      setIsLoading(true);
      const data = await WorkoutService.getGlobalExercises();
      setAvailableExercises(data || []);
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch exercises: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddExercise = (exercise) => {
    // Default form fields depending on exercise type
    const trackingType = exercise.default_tracking?.type || 'IMU';
    
    setSelectedExercises([
      ...selectedExercises,
      {
        exercise: exercise,
        id: Math.random().toString(),
        trackingType: trackingType,
        sets: '3',
        repsMin: '8',
        repsMax: '12',
        restSec: globalRestSec,
        weightKg: '0',
        durationSec: '60',
      }
    ]);
    setShowExercisePicker(false);
  };

  const updateExerciseField = (id, field, value) => {
    setSelectedExercises(prev => 
      prev.map(ex => ex.id === id ? { ...ex, [field]: value } : ex)
    );
  };

  const removeExercise = (id) => {
    setSelectedExercises(prev => prev.filter(ex => ex.id !== id));
  };

  const handleSave = async () => {
    if (!title) {
      Alert.alert('Validation Error', 'Please enter a workout title');
      return;
    }
    
    if (selectedExercises.length === 0) {
      Alert.alert('Validation Error', 'Please add at least one exercise');
      return;
    }

    try {
      setIsSaving(true);
      const itemsPayload = selectedExercises.map((ex, index) => {
        const base = {
          exercise_id: ex.exercise._id || ex.exercise.name, // backend prefers ID if available, using name/id
          order_index: index,
          rest_sec: parseInt(ex.restSec) || parseInt(globalRestSec) || 60,
        };
        
        if (ex.trackingType === 'IMU') {
          return {
            ...base,
            target_sets: parseInt(ex.sets) || 3,
            target_reps_min: parseInt(ex.repsMin) || 8,
            target_reps_max: parseInt(ex.repsMax) || 12,
            target_weight_kg: parseFloat(ex.weightKg) || null,
          };
        } else {
          return {
            ...base,
            target_sets: 1,
            target_duration_sec: parseInt(ex.durationSec) || 60,
          };
        }
      });

      await WorkoutService.createWorkout(title, description, itemsPayload);
      Alert.alert('Success', 'Workout created successfully!');
      onSaveSuccess();
      onClose();
    } catch (error) {
      Alert.alert('Error', 'Failed to create workout: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Filter Logic
  const filteredExercises = availableExercises.filter(ex => {
    const matchesSearch = ex.name.toLowerCase().includes(searchText.toLowerCase());
    
    // ex.default_tracking.type is usually "IMU" or "timed"
    const exType = ex.default_tracking?.type === 'timed' ? 'Timed' : 'Weights';
    const matchesType = selectedType === 'All' || selectedType === exType;
    
    // Grouping
    const matchesMuscle = selectedMuscle === 'All' || (ex.muscle_groups && ex.muscle_groups.some(m => m.toLowerCase() === selectedMuscle.toLowerCase()));
    
    return matchesSearch && matchesType && matchesMuscle;
  });

  const muscleGroups = ['All', 'Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core', 'Cardio'];
  const types = ['All', 'Weights', 'Timed'];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.iconButton}>
            <Ionicons name="close" size={28} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>New Workout</Text>
          <TouchableOpacity onPress={handleSave} disabled={isSaving} style={styles.iconButton}>
            <Ionicons name="checkmark-sharp" size={28} color="#4CAF50" />
          </TouchableOpacity>
        </View>

        {showExercisePicker ? (
          <View style={styles.pickerContainer}>
            <Text style={styles.sectionTitle}>Select Exercise</Text>
            
            {/* Search Input */}
            <View style={styles.searchInputContainer}>
              <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search exercises..."
                value={searchText}
                onChangeText={setSearchText}
              />
            </View>

            {/* Filter Chips */}
            <View style={styles.filtersWrapper}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
                {types.map(type => (
                  <TouchableOpacity
                    key={`type-${type}`}
                    style={[styles.chip, selectedType === type && styles.chipActive]}
                    onPress={() => setSelectedType(type)}
                  >
                    <Text style={[styles.chipText, selectedType === type && styles.chipTextActive]}>{type}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
                {muscleGroups.map(group => (
                  <TouchableOpacity
                    key={`muscle-${group}`}
                    style={[styles.chip, selectedMuscle === group && styles.chipActive]}
                    onPress={() => setSelectedMuscle(group)}
                  >
                    <Text style={[styles.chipText, selectedMuscle === group && styles.chipTextActive]}>{group}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {isLoading ? (
              <ActivityIndicator size="large" color="#4CAF50" style={{marginTop: 50}} />
            ) : (
              <ScrollView style={{ marginTop: 10 }}>
                {filteredExercises.map((ex, idx) => (
                  <TouchableOpacity 
                    key={ex._id || idx} 
                    style={styles.pickerItem}
                    onPress={() => handleAddExercise(ex)}
                  >
                    <Text style={styles.pickerItemText}>{ex.name}</Text>
                    <Text style={styles.pickerTypeBadge}>
                      {ex.default_tracking?.type === 'timed' ? '⏱ Timed' : '🏋️‍♂️ Weights/Reps'}
                    </Text>
                  </TouchableOpacity>
                ))}
                {filteredExercises.length === 0 && (
                   <Text style={{textAlign: 'center', marginTop: 20, color: '#999'}}>No exercises found for these filters.</Text>
                )}
                
                <TouchableOpacity
                  style={styles.cancelPickerBtn}
                  onPress={() => setShowExercisePicker(false)}
                >
                  <Text style={styles.cancelPickerBtnText}>Back to Workout</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        ) : (
          <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Workout Title</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Full Body Smash"
                value={title}
                onChangeText={setTitle}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Description (Optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="What is this workout for?"
                multiline
                numberOfLines={3}
                value={description}
                onChangeText={setDescription}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Global Rest Between Exercises (sec)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 60"
                keyboardType="numeric"
                value={globalRestSec}
                onChangeText={setGlobalRestSec}
              />
            </View>

            <View style={styles.exercisesHeader}>
              <Text style={styles.sectionTitle}>Exercises</Text>
              <TouchableOpacity style={styles.addBtn} onPress={() => setShowExercisePicker(true)}>
                <Ionicons name="add" size={20} color="#fff" />
                <Text style={styles.addBtnText}>Add</Text>
              </TouchableOpacity>
            </View>

            {selectedExercises.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>No exercises added yet.</Text>
              </View>
            ) : (
              selectedExercises.map((item, index) => (
                <View key={item.id} style={styles.exerciseCard}>
                  <View style={styles.exerciseCardHeader}>
                    <Text style={styles.exerciseCardTitle}>{index + 1}. {item.exercise.name}</Text>
                    <TouchableOpacity onPress={() => removeExercise(item.id)}>
                      <Ionicons name="trash-outline" size={20} color="#F44336" />
                    </TouchableOpacity>
                  </View>

                  {item.trackingType === 'IMU' ? (
                    <View style={styles.exerciseFieldsRow}>
                      <View style={styles.flexField}>
                        <Text style={styles.fieldLabel}>Sets</Text>
                        <TextInput style={styles.smallInput} keyboardType="numeric" value={item.sets} onChangeText={(v) => updateExerciseField(item.id, 'sets', v)} />
                      </View>
                      <View style={styles.flexField}>
                        <Text style={styles.fieldLabel}>Reps</Text>
                        <TextInput style={styles.smallInput} keyboardType="numeric" value={item.repsMin} onChangeText={(v) => updateExerciseField(item.id, 'repsMin', v)} />
                      </View>
                      <View style={styles.flexField}>
                        <Text style={styles.fieldLabel}>Rest (s)</Text>
                        <TextInput style={styles.smallInput} keyboardType="numeric" value={item.restSec} onChangeText={(v) => updateExerciseField(item.id, 'restSec', v)} />
                      </View>
                      <View style={styles.flexField}>
                        <Text style={styles.fieldLabel}>Weight (kg)</Text>
                        <TextInput style={styles.smallInput} keyboardType="numeric" value={item.weightKg} onChangeText={(v) => updateExerciseField(item.id, 'weightKg', v)} />
                      </View>
                    </View>
                  ) : (
                    <View style={styles.exerciseFieldsRow}>
                      <View style={styles.flexField}>
                        <Text style={styles.fieldLabel}>Duration (s)</Text>
                        <TextInput style={styles.smallInput} keyboardType="numeric" value={item.durationSec} onChangeText={(v) => updateExerciseField(item.id, 'durationSec', v)} />
                      </View>
                      <View style={styles.flexField}>
                        <Text style={styles.fieldLabel}>Rest After (s)</Text>
                        <TextInput style={styles.smallInput} keyboardType="numeric" value={item.restSec} onChangeText={(v) => updateExerciseField(item.id, 'restSec', v)} />
                      </View>
                    </View>
                  )}
                </View>
              ))
            )}
            
            <View style={{height: 100}} /> 
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  iconButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  formContainer: {
    padding: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  exercisesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  addBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 4,
  },
  emptyState: {
    padding: 30,
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
  },
  emptyStateText: {
    color: '#999',
    fontStyle: 'italic',
  },
  exerciseCard: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  exerciseCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  exerciseCardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  exerciseFieldsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  flexField: {
    flex: 1,
    paddingHorizontal: 4,
  },
  fieldLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  smallInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 14,
    textAlign: 'center',
  },
  pickerContainer: {
    flex: 1,
    padding: 16,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    marginTop: 12,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
  },
  filtersWrapper: {
    marginTop: 12,
  },
  filterScroll: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  chip: {
    backgroundColor: '#eee',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 8,
  },
  chipActive: {
    backgroundColor: '#4CAF50',
  },
  chipText: {
    color: '#666',
    fontWeight: '600',
    fontSize: 13,
  },
  chipTextActive: {
    color: '#fff',
  },
  pickerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    alignItems: 'center',
  },
  pickerItemText: {
    fontSize: 16,
  },
  pickerTypeBadge: {
    fontSize: 12,
    backgroundColor: '#e3f2fd',
    color: '#1976d2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  cancelPickerBtn: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#eee',
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelPickerBtnText: {
    fontWeight: 'bold',
    color: '#333',
  }
});

export default CreateProgramModal;
