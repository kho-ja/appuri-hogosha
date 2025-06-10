import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform, Linking } from 'react-native';

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

    // 3️⃣ Get the FCM registration token
    // `eas.projectId` is exposed via Constants in EAS builds. During development
    // we also allow an explicit env variable so the dev client can fetch the FCM
    // token. Environment variables must be prefixed with `EXPO_PUBLIC_` to be
    // accessible at runtime.
    const projectId =
        Constants.expoConfig?.extra?.eas?.projectId ??
        (Constants as any).easConfig?.projectId ??
        process.env.EXPO_PUBLIC_EAS_PROJECT_ID ??
        process.env.EAS_PROJECT_ID;

    if (!projectId) {
      console.warn(
        '[Push] No projectId found; set EAS_PROJECT_ID to retrieve FCM token'
      );
    }

    // The current typings for expo-notifications do not accept parameters for
    // `getDevicePushTokenAsync`, but recent versions support providing a
    // project ID to obtain an FCM token. Cast to `any` so compilation succeeds
    // while still passing the projectId at runtime.
    const tokenResponse = await (
      Notifications.getDevicePushTokenAsync as any
    )({ projectId });

    console.log('[Push] Received push token type:', tokenResponse.type);
    const { data: token } = tokenResponse;

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
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
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
