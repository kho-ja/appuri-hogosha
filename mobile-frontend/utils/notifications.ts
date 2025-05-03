import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

export type PushPermission =
  | 'granted'
  | 'denied'
  | 'undetermined'
  | 'device_unsupported'
  | 'error';

export interface PushInitResult {
  status: PushPermission;
  token?: string; // present only when status === 'granted'
  error?: unknown; // present only when status === 'error'
}

/**
 * Ask for permission, create an Android channel, and return
 * a native FCM/APNs token — all wrapped in a single helper
 * that never *throws*.  Check `result.status`.
 */
export async function initPushNotifications(): Promise<PushInitResult> {
  try {
    if (!Device.isDevice) {
      return { status: 'device_unsupported' };
    }

    // 1️⃣  Android requires a channel *before* the runtime prompt appears.
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    // 2️⃣  Ask for permission (Android 13+ runtime, iOS alert)
    const { status } = await Notifications.requestPermissionsAsync();

    if (status !== 'granted') {
      return { status };
    }

    // 3️⃣  Fetch the native token (works for Firebase)
    const { data: token } = await Notifications.getDevicePushTokenAsync();

    return { status: 'granted', token };
  } catch (error) {
    console.error('[Push] init error →', error);
    return { status: 'error', error };
  }
}
