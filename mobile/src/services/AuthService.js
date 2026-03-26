import AsyncStorage from '@react-native-async-storage/async-storage';

// API Configuration
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://hawklets.com/api';
const API_KEY = process.env.EXPO_PUBLIC_API_KEY || 'your-api-key-change-in-production';

// Helper function for API requests
const apiRequest = async (endpoint, options = {}) => {
  const {
    method = 'GET',
    data = null,
    requiresAuth = false,
    isRefreshToken = false,
  } = options;

  const headers = {
    'X-API-Key': API_KEY,
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Add authorization header if required
  if (requiresAuth && !isRefreshToken) {
    try {
      const token = await AsyncStorage.getItem('accessToken');
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error getting token from storage:', error);
    }
  }

  const config = {
    method,
    headers,
  };

  if (data) {
    config.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    
    // Handle 401 Unauthorized - try to refresh token
    if (response.status === 401 && requiresAuth && !isRefreshToken) {
      const refreshed = await handleTokenRefresh();
      if (refreshed) {
        // Retry original request with new token
        return apiRequest(endpoint, options);
      }
    }

    const responseData = await response.json();

    if (!response.ok) {
      throw new Error(responseData.detail || responseData.message || `Request failed with status ${response.status}`);
    }

    return responseData;
  } catch (error) {
    throw handleApiError(error);
  }
};

// Handle token refresh
const handleTokenRefresh = async () => {
  try {
    const refreshToken = await AsyncStorage.getItem('refreshToken');
    if (!refreshToken) {
      return false;
    }

    const response = await apiRequest('/auth/refresh', {
      method: 'POST',
      data: { refresh_token: refreshToken },
      isRefreshToken: true,
    });

    const { access_token } = response;
    await AsyncStorage.setItem('accessToken', access_token);
    return true;
  } catch (error) {
    console.error('Token refresh failed:', error);
    // If refresh fails, logout user
    await logout();
    return false;
  }
};

// Authentication Services
export const AuthService = {
  // Register new user
  register: async (email, displayName, password) => {
    try {
      const response = await apiRequest('/auth/register', {
        method: 'POST',
        data: {
          email,
          display_name: displayName,
          password,
        },
      });
      return response;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Login user
  login: async (email, password) => {
    try {
      const response = await apiRequest('/auth/login', {
        method: 'POST',
        data: {
          email,
          password,
        },
      });
      
      // Store tokens
      const { access_token, refresh_token } = response;
      await AsyncStorage.setItem('accessToken', access_token);
      await AsyncStorage.setItem('refreshToken', refresh_token);
      
      return response;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Get current user info
  getCurrentUser: async () => {
    try {
      const response = await apiRequest('/auth/me', {
        requiresAuth: true,
      });
      return response;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Update user account
  updateAccount: async ({ displayName, firstName, lastName, password } = {}) => {
    try {
      const updateData = {};
      if (displayName !== undefined) updateData.display_name = displayName;
      if (firstName !== undefined) updateData.first_name = firstName;
      if (lastName !== undefined) updateData.last_name = lastName;
      if (password !== undefined) updateData.password = password;

      const response = await apiRequest('/auth/update', {
        method: 'PUT',
        data: updateData,
        requiresAuth: true,
      });
      return response;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Delete account
  deleteAccount: async () => {
    try {
      const response = await apiRequest('/auth/delete', {
        method: 'DELETE',
        data: { confirm: true },
        requiresAuth: true,
      });
      await logout();
      return response;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Logout user
  logout: async () => {
    await logout();
  },

  // Check if user is authenticated
  isAuthenticated: async () => {
    try {
      const token = await AsyncStorage.getItem('accessToken');
      return !!token;
    } catch (error) {
      return false;
    }
  },

  // Get stored tokens
  getTokens: async () => {
    try {
      const accessToken = await AsyncStorage.getItem('accessToken');
      const refreshToken = await AsyncStorage.getItem('refreshToken');
      return { accessToken, refreshToken };
    } catch (error) {
      return { accessToken: null, refreshToken: null };
    }
  },
};

// Helper function to logout
const logout = async () => {
  try {
    await AsyncStorage.removeItem('accessToken');
    await AsyncStorage.removeItem('refreshToken');
    await AsyncStorage.removeItem('userToken'); // Legacy token
  } catch (error) {
    console.error('Error during logout:', error);
  }
};

// Error handling helper
const handleApiError = (error) => {
  if (error.message.includes('Network request failed')) {
    return new Error('Network error. Please check your internet connection.');
  }
  
  if (error.message.includes('Failed to fetch')) {
    return new Error('Cannot connect to server. Please try again later.');
  }
  
  // Return the original error if it's already an Error object with a message
  if (error instanceof Error) {
    return error;
  }
  
  return new Error(error.message || 'An unexpected error occurred.');
};

export default AuthService;