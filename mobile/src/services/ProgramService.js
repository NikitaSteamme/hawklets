import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://hawklets.com/api';
const API_KEY = process.env.EXPO_PUBLIC_API_KEY || 'your-api-key-change-in-production';

const apiRequest = async (endpoint, options = {}) => {
  try {
    const token = await AsyncStorage.getItem('accessToken') || await AsyncStorage.getItem('userToken');

    const headers = {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY,
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...options.headers,
    };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw {
        status: response.status,
        message: data.detail || data.message || 'API request failed',
        data,
      };
    }

    return data;
  } catch (error) {
    if (error.status) throw error;
    throw {
      status: 500,
      message: error.message || 'Network error occurred',
    };
  }
};

const WorkoutService = {
  // ── Workouts ────────────────────────────────────────────────────────────────

  getWorkouts: async (page = 1, pageSize = 100) => {
    return apiRequest(`/workouts?page=${page}&page_size=${pageSize}`);
  },

  getWorkout: async (workoutId) => {
    return apiRequest(`/workouts/${workoutId}`);
  },

  createWorkout: async (title, description, items) => {
    return apiRequest('/workouts', {
      method: 'POST',
      body: JSON.stringify({ title, description, visibility: 'private', items }),
    });
  },

  updateWorkout: async (workoutId, fields) => {
    return apiRequest(`/workouts/${workoutId}`, {
      method: 'PUT',
      body: JSON.stringify(fields),
    });
  },

  deleteWorkout: async (workoutId) => {
    return apiRequest(`/workouts/${workoutId}`, { method: 'DELETE' });
  },

  duplicateWorkout: async (workoutId) => {
    return apiRequest(`/workouts/${workoutId}/duplicate`, { method: 'POST' });
  },

  getWorkoutByShareCode: async (shareCode) => {
    return apiRequest(`/workouts/shared/${shareCode}`);
  },

  // ── Routines ─────────────────────────────────────────────────────────────────

  getRoutines: async () => {
    return apiRequest('/routines');
  },

  getRoutine: async (routineId) => {
    return apiRequest(`/routines/${routineId}`);
  },

  createRoutine: async (name, workoutIds) => {
    return apiRequest('/routines', {
      method: 'POST',
      body: JSON.stringify({ name, workout_ids: workoutIds }),
    });
  },

  updateRoutine: async (routineId, fields) => {
    return apiRequest(`/routines/${routineId}`, {
      method: 'PUT',
      body: JSON.stringify(fields),
    });
  },

  setActiveRoutine: async (routineId) => {
    return apiRequest(`/routines/${routineId}/set-active`, { method: 'POST' });
  },

  deleteRoutine: async (routineId) => {
    return apiRequest(`/routines/${routineId}`, { method: 'DELETE' });
  },

  // ── Workout Logs (Journal) ───────────────────────────────────────────────────

  getWorkoutLogs: async (limit = 50) => {
    return apiRequest(`/workout-logs?limit=${limit}`);
  },

  createWorkoutLog: async (workoutName, workoutId, loggedAt, durationMinutes, notes) => {
    return apiRequest('/workout-logs', {
      method: 'POST',
      body: JSON.stringify({
        workout_name: workoutName,
        workout_id: workoutId || null,
        logged_at: loggedAt || null,
        duration_minutes: durationMinutes || null,
        notes: notes || null,
      }),
    });
  },

  deleteWorkoutLog: async (logId) => {
    return apiRequest(`/workout-logs/${logId}`, { method: 'DELETE' });
  },

  // ── Exercises ────────────────────────────────────────────────────────────────

  getGlobalExercises: async () => {
    return apiRequest('/exercises/global');
  },
};

export default WorkoutService;
