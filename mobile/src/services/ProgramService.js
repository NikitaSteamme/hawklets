import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://hawklets.com/api';
const API_KEY = process.env.EXPO_PUBLIC_API_KEY || 'your-api-key-change-in-production';

// Helper function for API requests
const apiRequest = async (endpoint, options = {}) => {
  try {
    const token = await AsyncStorage.getItem('userToken');
    
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
        data
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

const ProgramService = {
  // --- Workout Templates (Programs) ---
  
  /**
   * Fetch user's workout templates (programs)
   */
  getPrograms: async (page = 1, pageSize = 20) => {
    return await apiRequest(`/templates?page=${page}&page_size=${pageSize}`, {
      method: 'GET',
    });
  },

  /**
   * Create a new workout template
   */
  createProgram: async (title, description, items) => {
    return await apiRequest('/templates', {
      method: 'POST',
      body: JSON.stringify({
        title,
        description,
        visibility: 'private',
        items,
      }),
    });
  },

  /**
   * Fetch global exercises from the database
   */
  getGlobalExercises: async () => {
    return await apiRequest('/exercises/global', {
      method: 'GET',
    });
  },
};

export default ProgramService;
