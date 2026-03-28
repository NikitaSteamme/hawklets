import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';

// Import screens
import DashboardScreen from './src/screens/DashboardScreen';
import WorkoutsScreen from './src/screens/ProgramsScreen';
import JournalScreen from './src/screens/ProgressScreen';
import AccountScreen from './src/screens/AccountScreen';
import CommunityScreen from './src/screens/CommunityScreen';
import LoginScreen from './src/screens/LoginScreen';
import RegistrationScreen from './src/screens/RegistrationScreen';
import DeviceConnectionScreen from './src/screens/DeviceConnectionScreen';
import notificationsService from './src/services/NotificationsService';
import bleService from './src/services/BLEService';
import AuthService from './src/services/AuthService';
import { useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://hawklets.com/api';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Dashboard Stack Navigator
function DashboardStack({ currentUser }) {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="DashboardMain">
        {({ navigation }) => (
          <DashboardScreen currentUser={currentUser} navigation={navigation} />
        )}
      </Stack.Screen>
      <Stack.Screen name="DeviceConnection" component={DeviceConnectionScreen} />
    </Stack.Navigator>
  );
}

// Account Stack Navigator
function AccountStack({ onLogout, currentUser, onUserUpdate }) {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AccountMain">
        {() => (
          <AccountScreen
            onLogout={onLogout}
            currentUser={currentUser}
            onUserUpdate={onUserUpdate}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="DeviceConnection" component={DeviceConnectionScreen} />
    </Stack.Navigator>
  );
}

// Journal Stack Navigator
function JournalStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="JournalMain" component={JournalScreen} />
    </Stack.Navigator>
  );
}

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showRegistration, setShowRegistration] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  // ── Tracker session state (accumulated set_done events for IP calc) ──────────
  const sessionSetsRef = useRef([]); // [{ ex, reps }]

  // Send accumulated session IP to backend and log the workout
  const submitWorkoutSession = async () => {
    const sets = sessionSetsRef.current;
    sessionSetsRef.current = [];
    if (sets.length === 0) return;

    try {
      const token = await AsyncStorage.getItem('accessToken') || await AsyncStorage.getItem('userToken');
      if (!token) return;

      // IP = sum of reps across all sets (weight unknown from BLE — tracker tracks reps only)
      const totalReps = sets.reduce((sum, s) => sum + (s.reps || 0), 0);
      const ironPoints = totalReps; // 1 IP per rep; weight-based calc requires manual log

      if (ironPoints > 0) {
        await fetch(`${API_BASE_URL}/auth/me/points`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ iron_points: ironPoints, endurance_points: 0 }),
        });
        console.log('[Session] Awarded', ironPoints, 'IP');
      }

      // Log workout completion
      const exerciseNames = [...new Set(sets.map(s => s.ex).filter(Boolean))];
      await fetch(`${API_BASE_URL}/workout-logs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          workout_name: exerciseNames.length > 0
            ? `Tracker workout (${exerciseNames.slice(0, 2).join(', ')}${exerciseNames.length > 2 ? '...' : ''})`
            : 'Tracker workout',
          notes: `${sets.length} sets completed via tracker`,
        }),
      });
    } catch (e) {
      console.error('[Session] Submit error:', e.message);
    }
  };

  // ── Wire BLE tracker event callbacks ─────────────────────────────────────────
  useEffect(() => {
    bleService.onSetDone = (restSec, exerciseName, setNum, repsCompleted) => {
      // Accumulate for IP calculation
      sessionSetsRef.current = [...sessionSetsRef.current, { ex: exerciseName, reps: repsCompleted }];

      const exLabel = exerciseName ? ` · ${exerciseName}` : '';
      notificationsService.sendImmediateNotification(
        `Set ${setNum} complete${exLabel}`,
        `${repsCompleted} reps done. Rest ${restSec}s`,
        { type: 'set_done' },
      ).catch(() => {});
    };

    bleService.onRestEnd = () => {
      notificationsService.sendImmediateNotification(
        'Rest complete!',
        'Time for your next set.',
        { type: 'rest_end' },
      ).catch(() => {});
    };

    bleService.onWorkoutDone = () => {
      notificationsService.sendImmediateNotification(
        'Workout complete!',
        'Great work! Saving your session...',
        { type: 'workout_done' },
      ).catch(() => {});
      submitWorkoutSession();
    };

    return () => {
      bleService.onSetDone = null;
      bleService.onRestEnd = null;
      bleService.onWorkoutDone = null;
    };
  }, []);

  useEffect(() => {
    checkLoginStatus();

    // Setup notification listeners
    notificationsService.setupNotificationListeners(
      (notification) => {
        console.log('Notification received:', notification);
        // Handle notification received while app is in foreground
      },
      (response) => {
        console.log('Notification response:', response);
        // Handle user tapping on notification
        // Could navigate to specific screen based on notification data
      }
    );

    // Cleanup on unmount
    return () => {
      notificationsService.cleanup();
    };
  }, []);

  const loadUserData = async () => {
    try {
      const user = await AuthService.getCurrentUser();
      setCurrentUser(user);
    } catch (error) {
      console.error('Failed to load user data:', error);
    }
  };

  const checkLoginStatus = async () => {
    try {
      const accessToken = await AsyncStorage.getItem('accessToken');
      const legacyToken = await AsyncStorage.getItem('userToken');
      const loggedIn = !!accessToken || !!legacyToken;
      setIsLoggedIn(loggedIn);
      if (loggedIn) {
        await loadUserData();
      }
    } catch (error) {
      console.error('Error checking login status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (token) => {
    // Store token in new format (accessToken) and legacy format for compatibility
    await AsyncStorage.setItem('accessToken', token);
    await AsyncStorage.setItem('userToken', token); // Legacy support
    setIsLoggedIn(true);
    await loadUserData();

    // Initialize notifications after login
    try {
      const permissionsGranted = await notificationsService.requestPermissions();
      if (permissionsGranted) {
        await notificationsService.initializeDefaultNotifications();
        console.log('Notifications initialized');
      }
    } catch (error) {
      console.error('Error initializing notifications:', error);
    }
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem('accessToken');
    await AsyncStorage.removeItem('refreshToken');
    await AsyncStorage.removeItem('userToken');
    setCurrentUser(null);
    setIsLoggedIn(false);
  };

  const handleUserUpdate = async () => {
    await loadUserData();
  };

  if (isLoading) {
    return null; // Or a loading screen
  }

  const showRegistrationScreen = () => {
    setShowRegistration(true);
  };

  const showLoginScreen = () => {
    setShowRegistration(false);
  };

  const handleRegistrationSuccess = () => {
    setShowRegistration(false);
    // Optionally auto-login or show success message
  };

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        {!isLoggedIn ? (
          showRegistration ? (
            <RegistrationScreen
              onRegistrationSuccess={handleRegistrationSuccess}
              onBackToLogin={showLoginScreen}
            />
          ) : (
            <LoginScreen
              onLogin={handleLogin}
              onSignUp={showRegistrationScreen}
            />
          )
        ) : (
          <Tab.Navigator
            screenOptions={({ route }) => ({
              tabBarIcon: ({ focused, color, size }) => {
                let iconName;
                if (route.name === 'Dashboard') {
                  iconName = focused ? 'home' : 'home-outline';
                } else if (route.name === 'Workouts') {
                  iconName = focused ? 'barbell' : 'barbell-outline';
                } else if (route.name === 'Journal') {
                  iconName = focused ? 'journal' : 'journal-outline';
                } else if (route.name === 'Account') {
                  iconName = focused ? 'person' : 'person-outline';
                } else if (route.name === 'Community') {
                  iconName = focused ? 'people' : 'people-outline';
                }
                return <Ionicons name={iconName} size={size} color={color} />;
              },
              tabBarActiveTintColor: '#4CAF50',
              tabBarInactiveTintColor: 'gray',
              headerShown: false,
            })}
          >
            <Tab.Screen name="Dashboard">
              {() => <DashboardStack currentUser={currentUser} />}
            </Tab.Screen>
            <Tab.Screen name="Workouts" component={WorkoutsScreen} />
            <Tab.Screen name="Journal" component={JournalStack} />
            <Tab.Screen name="Community" component={CommunityScreen} />
            <Tab.Screen name="Account">
              {() => (
                <AccountStack
                  onLogout={handleLogout}
                  currentUser={currentUser}
                  onUserUpdate={handleUserUpdate}
                />
              )}
            </Tab.Screen>
          </Tab.Navigator>
        )}
      </NavigationContainer>
    </SafeAreaProvider>
  );
}