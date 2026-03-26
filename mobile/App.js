import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';

// Import screens
import DashboardScreen from './src/screens/DashboardScreen';
import ProgramsScreen from './src/screens/ProgramsScreen';
import ProgressScreen from './src/screens/ProgressScreen';
import AccountScreen from './src/screens/AccountScreen';
import CommunityScreen from './src/screens/CommunityScreen';
import LoginScreen from './src/screens/LoginScreen';
import RegistrationScreen from './src/screens/RegistrationScreen';
import DeviceConnectionScreen from './src/screens/DeviceConnectionScreen';
import TrainingAnalyticsScreen from './src/screens/TrainingAnalyticsScreen';
import notificationsService from './src/services/NotificationsService';
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Account Stack Navigator
function AccountStack({ onLogout }) {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AccountMain">
        {() => <AccountScreen onLogout={onLogout} />}
      </Stack.Screen>
      <Stack.Screen name="DeviceConnection" component={DeviceConnectionScreen} />
    </Stack.Navigator>
  );
}

// Progress Stack Navigator
function ProgressStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ProgressMain" component={ProgressScreen} />
      <Stack.Screen name="TrainingAnalytics" component={TrainingAnalyticsScreen} />
    </Stack.Navigator>
  );
}

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showRegistration, setShowRegistration] = useState(false);

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

  const checkLoginStatus = async () => {
    try {
      // Check for new token format (accessToken) first, then fallback to legacy token
      const accessToken = await AsyncStorage.getItem('accessToken');
      const legacyToken = await AsyncStorage.getItem('userToken');
      setIsLoggedIn(!!accessToken || !!legacyToken);
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
    // Remove all authentication tokens
    await AsyncStorage.removeItem('accessToken');
    await AsyncStorage.removeItem('refreshToken');
    await AsyncStorage.removeItem('userToken'); // Legacy token
    setIsLoggedIn(false);
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
                } else if (route.name === 'Programs') {
                  iconName = focused ? 'barbell' : 'barbell-outline';
                } else if (route.name === 'Progress') {
                  iconName = focused ? 'stats-chart' : 'stats-chart-outline';
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
            <Tab.Screen name="Dashboard" component={DashboardScreen} />
            <Tab.Screen name="Programs" component={ProgramsScreen} />
            <Tab.Screen name="Progress" component={ProgressStack} />
            <Tab.Screen name="Community" component={CommunityScreen} />
            <Tab.Screen name="Account">
              {() => <AccountStack onLogout={handleLogout} />}
            </Tab.Screen>
          </Tab.Navigator>
        )}
      </NavigationContainer>
    </SafeAreaProvider>
  );
}