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

const CommunityService = {
  // ── Challenges ────────────────────────────────────────────────────────────
  getChallenges: async () =>
    apiRequest('/community/challenges'),

  // ── Leaderboard ───────────────────────────────────────────────────────────
  getLeaderboard: async () =>
    apiRequest('/community/leaderboard'),

  // ── Friends ───────────────────────────────────────────────────────────────
  getFriends: async () =>
    apiRequest('/community/friends'),

  getSuggestions: async () =>
    apiRequest('/community/suggestions'),

  inviteFriend: async (userId) =>
    apiRequest(`/community/friends/invite/${userId}`, { method: 'POST' }),

  acceptFriendRequest: async (notificationId) =>
    apiRequest(`/community/friends/accept/${notificationId}`, { method: 'POST' }),

  // ── Notifications ─────────────────────────────────────────────────────────
  getNotifications: async () =>
    apiRequest('/community/notifications'),

  markNotificationRead: async (notificationId) =>
    apiRequest(`/community/notifications/${notificationId}/read`, { method: 'POST' }),
};

export default CommunityService;
