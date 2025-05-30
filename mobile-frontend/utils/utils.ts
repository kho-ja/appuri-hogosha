import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

type Style = { [key: string]: any } | undefined | null | false;
export function cn(...styles: (Style | Style[])[]): Style {
  return styles.reduce<Style>((acc, style) => {
    if (Array.isArray(style)) {
      return { ...acc, ...cn(...style) };
    } else if (style) {
      return { ...acc, ...style };
    }
    return acc;
  }, {});
}

export function formatDate(input: string | number): string {
  const date = new Date(input);
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
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

export async function registerForPushNotificationsAsync() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }
  if (Device.isDevice) {
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      handleRegistrationError(
        'Permission not granted to get push token for push notification!'
      );
      return;
    }
    try {
      return (await Notifications.getDevicePushTokenAsync()).data;
    } catch (e: unknown) {
      handleRegistrationError(`${e}`);
    }
  } else {
    handleRegistrationError('Must use physical device for push notifications');
  }
}

function handleRegistrationError(errorMessage: string) {
  // alert(errorMessage)
  throw new Error(errorMessage);
}
