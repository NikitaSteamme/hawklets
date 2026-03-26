import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

class NotificationsService {
  constructor() {
    this.notificationListener = null;
    this.responseListener = null;
    
    // Configure notification handler
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
  }

  // Request notification permissions
  async requestPermissions() {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    return finalStatus === 'granted';
  }

  // Schedule a notification
  async scheduleNotification(notification) {
    const {
      title = 'Hawklets Fitness',
      body = '',
      data = {},
      trigger = null,
      identifier = null,
    } = notification;

    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: trigger || {
          seconds: 60, // Default: 1 minute from now
          repeats: false,
        },
        identifier,
      });

      console.log('Notification scheduled:', notificationId);
      return notificationId;
    } catch (error) {
      console.error('Error scheduling notification:', error);
      return null;
    }
  }

  // Schedule workout reminder
  async scheduleWorkoutReminder(time, daysOfWeek = []) {
    const hour = time.getHours();
    const minute = time.getMinutes();
    
    const notificationId = await this.scheduleNotification({
      title: '🏋️‍♂️ Time for your workout!',
      body: 'Your scheduled workout session is starting soon. Get ready to crush your goals!',
      data: { type: 'workout_reminder' },
      trigger: {
        hour,
        minute,
        repeats: true,
      },
      identifier: 'workout_reminder',
    });

    // Store reminder settings
    await AsyncStorage.setItem('workout_reminder', JSON.stringify({
      enabled: true,
      time: { hour, minute },
      daysOfWeek,
    }));

    return notificationId;
  }

  // Schedule hydration reminder
  async scheduleHydrationReminder() {
    const notificationId = await this.scheduleNotification({
      title: '💧 Stay Hydrated!',
      body: 'Remember to drink water to keep your performance at its peak.',
      data: { type: 'hydration_reminder' },
      trigger: {
        hour: 9,
        minute: 0,
        repeats: true,
      },
      identifier: 'hydration_morning',
    });

    // Schedule additional hydration reminders
    await this.scheduleNotification({
      title: '💧 Hydration Check',
      body: 'Time for another glass of water to stay hydrated during your day.',
      data: { type: 'hydration_reminder' },
      trigger: {
        hour: 14,
        minute: 0,
        repeats: true,
      },
      identifier: 'hydration_afternoon',
    });

    await this.scheduleNotification({
      title: '💧 Evening Hydration',
      body: 'Don\'t forget to drink water before your evening activities.',
      data: { type: 'hydration_reminder' },
      trigger: {
        hour: 18,
        minute: 0,
        repeats: true,
      },
      identifier: 'hydration_evening',
    });

    return notificationId;
  }

  // Schedule recovery reminder
  async scheduleRecoveryReminder() {
    return await this.scheduleNotification({
      title: '🛌 Recovery Time',
      body: 'Make sure to get enough rest and recovery for optimal performance tomorrow.',
      data: { type: 'recovery_reminder' },
      trigger: {
        hour: 21,
        minute: 0,
        repeats: true,
      },
      identifier: 'recovery_reminder',
    });
  }

  // Schedule streak reminder
  async scheduleStreakReminder() {
    return await this.scheduleNotification({
      title: '🔥 Keep Your Streak Alive!',
      body: 'You\'re on a roll! Don\'t break your workout streak.',
      data: { type: 'streak_reminder' },
      trigger: {
        hour: 19,
        minute: 0,
        repeats: true,
      },
      identifier: 'streak_reminder',
    });
  }

  // Schedule device connection reminder
  async scheduleDeviceConnectionReminder() {
    return await this.scheduleNotification({
      title: '📱 Connect Your Tracker',
      body: 'Remember to connect your fitness tracker for accurate workout data.',
      data: { type: 'device_reminder' },
      trigger: {
        hour: 8,
        minute: 30,
        repeats: true,
      },
      identifier: 'device_reminder',
    });
  }

  // Send immediate notification (for testing or events)
  async sendImmediateNotification(title, body, data = {}) {
    return await this.scheduleNotification({
      title,
      body,
      data,
      trigger: {
        seconds: 1,
      },
    });
  }

  // Cancel a specific notification
  async cancelNotification(identifier) {
    await Notifications.cancelScheduledNotificationAsync(identifier);
    console.log('Notification cancelled:', identifier);
  }

  // Cancel all notifications
  async cancelAllNotifications() {
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log('All notifications cancelled');
  }

  // Get all scheduled notifications
  async getAllScheduledNotifications() {
    return await Notifications.getAllScheduledNotificationsAsync();
  }

  // Set up notification listeners
  setupNotificationListeners(onNotificationReceived, onNotificationResponse) {
    // Remove existing listeners
    if (this.notificationListener) {
      this.notificationListener.remove();
    }
    if (this.responseListener) {
      this.responseListener.remove();
    }

    // Listen for notifications received while app is foregrounded
    this.notificationListener = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log('Notification received:', notification);
        if (onNotificationReceived) {
          onNotificationReceived(notification);
        }
      }
    );

    // Listen for notification responses (user taps on notification)
    this.responseListener = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        console.log('Notification response:', response);
        if (onNotificationResponse) {
          onNotificationResponse(response);
        }
      }
    );
  }

  // Clean up listeners
  cleanup() {
    if (this.notificationListener) {
      this.notificationListener.remove();
    }
    if (this.responseListener) {
      this.responseListener.remove();
    }
  }

  // Initialize default notifications
  async initializeDefaultNotifications() {
    const notificationsEnabled = await AsyncStorage.getItem('notifications_enabled');
    
    if (notificationsEnabled !== 'false') {
      // Schedule default reminders
      await this.scheduleHydrationReminder();
      await this.scheduleRecoveryReminder();
      await this.scheduleStreakReminder();
      await this.scheduleDeviceConnectionReminder();
      
      // Set workout reminder for 7 AM daily
      const workoutTime = new Date();
      workoutTime.setHours(7, 0, 0, 0);
      await this.scheduleWorkoutReminder(workoutTime, [1, 2, 3, 4, 5]); // Monday to Friday
      
      await AsyncStorage.setItem('notifications_enabled', 'true');
    }
  }

  // Toggle notifications on/off
  async toggleNotifications(enabled) {
    if (enabled) {
      await this.initializeDefaultNotifications();
    } else {
      await this.cancelAllNotifications();
    }
    await AsyncStorage.setItem('notifications_enabled', enabled ? 'true' : 'false');
  }

  // Check if notifications are enabled
  async areNotificationsEnabled() {
    const enabled = await AsyncStorage.getItem('notifications_enabled');
    return enabled !== 'false';
  }
}

// Create singleton instance
const notificationsService = new NotificationsService();
export default notificationsService;