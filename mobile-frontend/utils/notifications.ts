import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type PushPermission =
  | 'granted'
  | 'denied'
  | 'undetermined'
  | 'device_unsupported'
  | 'error';

export interface PushInitResult {
  status: PushPermission;
  token?: string;
  error?: unknown;
}

export async function initPushNotifications(): Promise<PushInitResult> {
  try {
    if (!Device.isDevice) {
      return { status: 'device_unsupported' };
    }

    // 1️⃣ Android: Create high-priority channels BEFORE asking for permission
    if (Platform.OS === 'android') {
      // Create multiple channels for different notification types
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default Notifications',
        importance: Notifications.AndroidImportance.MAX, // Changed from DEFAULT to MAX
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
        sound: 'default',
        enableVibrate: true,
        enableLights: true,
        showBadge: true,
      });

      // Create a high-priority channel for important notifications
      await Notifications.setNotificationChannelAsync('high-priority', {
        name: 'Important Messages',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 500, 250, 500],
        lightColor: '#FF0000',
        sound: 'default',
        enableVibrate: true,
        enableLights: true,
        showBadge: true,
      });

      // Create channel for critical notifications
      await Notifications.setNotificationChannelAsync('critical', {
        name: 'Critical Alerts',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 1000, 500, 1000],
        lightColor: '#FF0000',
        sound: 'default',
        enableVibrate: true,
        enableLights: true,
        showBadge: true,
      });
    }

    // 2️⃣ Request permissions with all options
    const { status } = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
        allowDisplayInCarPlay: true,
        allowCriticalAlerts: false, // Set to true if you need critical alerts
        provideAppNotificationSettings: true,
        allowProvisional: false,
      },
    });

    if (status !== 'granted') {
      return { status };
    }

    // 3️⃣ Get the native device token
    const { data: token } = await Notifications.getExpoPushTokenAsync();
    console.log('[Push] Device token →', token);

    return { status: 'granted', token };
  } catch (error) {
    console.error('[Push] Init error →', error);
    return { status: 'error', error };
  }
}

// Enhanced notification handler with better Android support
export function setupNotificationHandler() {
  Notifications.setNotificationHandler({
    handleNotification: async notification => {
      return {
        shouldShowAlert: false, // Deprecated but kept for compatibility
        shouldShowBanner: true, // New property for banner notifications
        shouldShowList: true, // New property for notification list
        shouldPlaySound: true,
        shouldSetBadge: true,
      };
    },
  });
}

// Helper function to send notifications with proper channel and priority
export async function sendLocalNotification(
  title: string,
  body: string,
  data: any = {},
  priority: 'default' | 'high' | 'critical' = 'default'
) {
  const channelId =
    priority === 'critical'
      ? 'critical'
      : priority === 'high'
        ? 'high-priority'
        : 'default';

  const notificationContent: any = {
    title,
    body,
    data,
    sound: 'default',
    badge: 1,
  };

  // Add Android-specific properties
  if (Platform.OS === 'android') {
    notificationContent.android = {
      channelId,
      priority: Notifications.AndroidNotificationPriority.MAX,
    };
  }

  await Notifications.scheduleNotificationAsync({
    content: notificationContent,
    trigger: null, // Send immediately
  });
}

// Function to check and guide users to disable battery optimization
export async function checkBatteryOptimization(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;

  // Note: There's no direct API to check battery optimization status
  // You'll need to guide users manually or use a native module
  console.log('Battery optimization should be checked by user');
  return true;
}

// Function to guide users to notification settings
export async function openNotificationSettings() {
  try {
    if (Platform.OS === 'android') {
      // For Android, we'll use Linking to open app settings
      await Linking.openSettings();
    } else {
      // For iOS, we'll use Linking to open app settings
      await Linking.openURL('app-settings:');
    }
  } catch (error) {
    console.error('Failed to open settings:', error);
  }
}

/**
 * Upload the push‑token to your backend.
 * Returns `true` when the request was accepted (2xx),
 * `false` on any other outcome — but never *throws*.
 */
export async function sendPushTokenToBackend(token: string): Promise<boolean> {
  try {
    const session = await AsyncStorage.getItem('session');
    if (!session) {
      console.log('[Push] No session yet - will retry when user logs in');
      return false;
    }

    const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/device-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session}`,
      },
      body: JSON.stringify({ token }),
    });

    if (!res.ok) {
      const detail = await res.json().catch(() => ({}));
      console.warn('[Push] Upload failed →', detail);
      return false;
    }

    return true;
  } catch (err) {
    console.error('[Push] Network error while uploading token →', err);
    return false;
  }
}

/**
 * Legacy function for backward compatibility.
 * Use initPushNotifications() instead for better error handling and features.
 */
export async function registerForPushNotificationsAsync() {
  const result = await initPushNotifications();

  if (result.status === 'granted' && result.token) {
    return result.token;
  }

  // Handle different error cases like the original function
  if (result.status === 'device_unsupported') {
    throw new Error('Must use physical device for push notifications');
  } else if (result.status === 'denied') {
    throw new Error(
      'Permission not granted to get push token for push notification!'
    );
  } else if (result.error) {
    throw new Error(`${result.error}`);
  }

  return undefined;
}
