import React, { useContext } from 'react';
import * as Notifications from 'expo-notifications';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SessionProvider, useSession } from '@/contexts/auth-context';
import {
  sendPushTokenToBackend,
  initPushNotifications,
  setupNotificationHandler,
} from '@/utils/notifications';
import { router, Slot } from 'expo-router';
import { StudentProvider } from '@/contexts/student-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FontSizeProvider } from '@/contexts/FontSizeContext';
import {
  Platform,
  Alert,
  Linking,
  AppState,
  AppStateStatus,
} from 'react-native';
import { I18nContext } from '@/contexts/i18n-context';
import { useUpdateAlerts } from '@/hooks/useUpdateAlerts';

// Helper function to guide users for battery optimization
const showBatteryOptimizationAlert = async (i18n: any, language: string) => {
  if (Platform.OS === 'android') {
    Alert.alert(
      i18n[language].notificationsNotWorking,
      i18n[language].batteryOptimizationAlert,
      [
        { text: i18n[language].later, style: 'cancel' },
        {
          text: i18n[language].openSettings,
          onPress: async () => {
            try {
              await Linking.openSettings();
            } catch (error) {
              console.error('Failed to open settings:', error);
            }
          },
        },
      ]
    );
  }
};

function useNotificationObserver() {
  React.useEffect(() => {
    let isMounted = true;

    function redirect(notification: Notifications.Notification) {
      const url = notification.request.content.data?.url as string;
      console.log('Notification URL:', url);
      if (url) {
        router.push(url);
      }
    }

    Notifications.getLastNotificationResponseAsync().then(response => {
      if (!isMounted || !response?.notification) {
        return;
      }
      redirect(response?.notification);
    });

    const subscription = Notifications.addNotificationResponseReceivedListener(
      response => {
        redirect(response.notification);
      }
    );

    const receivedSubscription = Notifications.addNotificationReceivedListener(
      async notification => {
        console.log('Notification received in foreground:', notification);

        if (Platform.OS === 'android') {
          // Custom handling for Android foreground notifications
        }
      }
    );

    return () => {
      isMounted = false;
      subscription.remove();
      receivedSubscription.remove();
    };
  }, []);
}

// Component that handles session-dependent push token logic
const SessionDependentPushTokenHandler: React.FC<{
  pushToken: string | null;
}> = ({ pushToken }) => {
  const { session } = useSession();

  // Retry token registration when session becomes available
  React.useEffect(() => {
    if (session && pushToken) {
      (async () => {
        console.log('[Push] Session available, retrying token registration');
        const success = await sendPushTokenToBackend(pushToken);
        if (success) {
          console.log('[Push] Token successfully registered after login');
        } else {
          console.warn('[Push] Token registration failed even with session');
        }
      })();
    }
  }, [session, pushToken]);

  return null; // This component only handles side effects
};

const AppWithNotifications: React.FC = () => {
  const { language, i18n } = useContext(I18nContext);
  const [pushToken, setPushToken] = React.useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = React.useState(false);
  const [shouldShowBatteryAlert, setShouldShowBatteryAlert] =
    React.useState(false);
  const hasInitialized = React.useRef(false);
  const permissionAlertShown = React.useRef(false);
  const appState = React.useRef(AppState.currentState);

  useUpdateAlerts();

  // Separate effect to show permission denied alert with current language (only once)
  React.useEffect(() => {
    if (permissionDenied && !permissionAlertShown.current) {
      permissionAlertShown.current = true;
      setTimeout(() => {
        Alert.alert(
          i18n[language].notificationsDisabled,
          i18n[language].notificationsDisabledMessage,
          [
            { text: i18n[language].ok, style: 'cancel' },
            {
              text: i18n[language].openSettings,
              onPress: async () => {
                try {
                  await Linking.openSettings();
                } catch (error) {
                  console.error('Failed to open settings:', error);
                }
              },
            },
          ]
        );
      }, 3000);
    }
  }, [permissionDenied, language, i18n]);

  // Separate effect to show battery optimization alert
  React.useEffect(() => {
    if (shouldShowBatteryAlert) {
      setTimeout(() => showBatteryOptimizationAlert(i18n, language), 5000);
      setShouldShowBatteryAlert(false);
    }
  }, [shouldShowBatteryAlert, language, i18n]);

  // Listen to app state changes to refetch data when app returns to foreground
  const handleAppStateChange = (nextState: AppStateStatus) => {
    const previousState = appState.current;

    if (previousState.match(/inactive|background/) && nextState === 'active') {
      console.log(
        '[AppState] App returned to foreground - refetching students'
      );
      // Trigger a refetch by invalidating the students query
      // This will be done in StudentProvider through a separate mechanism
    }

    appState.current = nextState;
  };

  React.useEffect(() => {
    const subscription = AppState.addEventListener(
      'change',
      handleAppStateChange
    );
    return () => {
      subscription.remove();
    };
  }, []);

  // Initialize push notifications once (without language dependencies)
  React.useEffect(() => {
    if (hasInitialized.current) {
      return;
    }
    hasInitialized.current = true;

    // Set up notification handler FIRST (critical for iOS foreground notifications)
    setupNotificationHandler();

    (async () => {
      const result = await initPushNotifications();

      if (result.status === 'granted' && result.token) {
        setPushToken(result.token);

        // Try to send token immediately (will work if already logged in)
        const success = await sendPushTokenToBackend(result.token);
        if (!success) {
          console.log('[Push] Token registration will retry after login');
        }
      } else if (result.status === 'denied') {
        console.log('[Push] User denied permission');
        setPermissionDenied(true);
      } else if (result.status === 'device_unsupported') {
        console.log('[Push] Running in simulator - notifications disabled');
      } else if (result.status === 'error') {
        console.error('[Push] Setup failed:', result.error);
      }

      // Show battery optimization alert for Android users after setup
      if (Platform.OS === 'android' && result.status === 'granted') {
        const shouldShowAlert = await AsyncStorage.getItem(
          'battery_opt_alert_shown'
        );
        if (!shouldShowAlert) {
          setShouldShowBatteryAlert(true);
          await AsyncStorage.setItem('battery_opt_alert_shown', 'true');
        }
      }
    })();

    // Keep backend in sync when token rotates
    const sub = Notifications.addPushTokenListener(async ({ data }) => {
      const success = await sendPushTokenToBackend(data);
      if (!success) {
        console.warn('[Push] Failed to update token with backend');
      }
    });

    return () => sub.remove();
  }, []);

  useNotificationObserver();

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: (failureCount, error) => {
          if (error instanceof Error && error.message.includes('4')) {
            return false;
          }
          return failureCount < 3;
        },
      },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <SessionDependentPushTokenHandler pushToken={pushToken} />
        <StudentProvider>
          <FontSizeProvider>
            <Slot />
          </FontSizeProvider>
        </StudentProvider>
      </SessionProvider>
    </QueryClientProvider>
  );
};

export default AppWithNotifications;
