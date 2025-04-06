import React from 'react'
import * as Notifications from 'expo-notifications'
import * as Linking from 'expo-linking';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
	registerForPushNotificationsAsync,
	sendPushTokenToBackend,
} from '@/utils/utils'
import { router, Slot } from 'expo-router'
import { StudentProvider } from '@/contexts/student-context'
import { RootSiblingParent } from 'react-native-root-siblings'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SQLiteProvider } from 'expo-sqlite'
import { SessionProvider } from '@/contexts/auth-context'
import { ThemeProvider } from '@rneui/themed'
import { NetworkProvider } from '@/contexts/network-context'
import { I18nProvider } from '@/contexts/i18n-context'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { redirectSystemPath } from '@/+native-intent'

Notifications.setNotificationHandler({
	handleNotification: async () => ({
		shouldShowAlert: true,
		shouldPlaySound: true,
		shouldSetBadge: true,
	}),
})

function useNotificationObserver() {
  const hasRedirected = React.useRef(false);
	React.useEffect(() => {
		let isMounted = true

		function redirect(notification: Notifications.Notification) {
      const fullUrl = notification.request.content.data?.url;
      if (fullUrl) {
        const processedPath = redirectSystemPath({ path: fullUrl, initial: false });
        hasRedirected.current = true;
        router.push(processedPath);
      }
		}

		Notifications.getLastNotificationResponseAsync().then(response => {
			if (!isMounted || !response?.notification) {
				return;
			}
			redirect(response?.notification)
		})

		const subscription = Notifications.addNotificationResponseReceivedListener(
			response => {
				redirect(response.notification)
			}
		)

		// Listener for received notifications (foreground)
		const receivedSubscription = Notifications.addNotificationReceivedListener(
			async notification => {
				// Custom handling for foreground notifications
				// Optional: Add custom in-app UI or handling logic
				// For example, you might want to show a custom toast or update app state
			}
		)

		return () => {
			isMounted = false
			subscription.remove()
			receivedSubscription.remove()
		}
	}, [])
}
export default function Root() {
	React.useEffect(() => {
		registerForPushNotificationsAsync()
			.then(token => AsyncStorage.setItem('expoPushToken', token ?? ''))
			.catch((error: any) => console.error(`${error}`))
		const subscription = Notifications.addPushTokenListener(
			sendPushTokenToBackend
		)
		return () => subscription.remove()
	}, []);
  React.useEffect(() => {
    const handleDeepLink = ({ url }) => {
      if (url) {
        const processedPath = redirectSystemPath({ path: url, initial: false });
        router.push(processedPath);
      }
    };
    Linking.getInitialURL().then((url) => {
      if (url) {
        const processedPath = redirectSystemPath({ path: url, initial: true });
        router.push(processedPath);
      }
    });
    const subscription = Linking.addEventListener('url', handleDeepLink);
    return () => subscription.remove();
  }, []);
	useNotificationObserver()

	const queryClient = new QueryClient()
	return (
		<RootSiblingParent>
      <GestureHandlerRootView style={{ flex: 1 }}>
				<SQLiteProvider
					databaseName='maria.db'
					assetSource={{ assetId: require('../assets/database/maria.db') }}
				>
					<SessionProvider>
						<ThemeProvider>
							<NetworkProvider>
								<I18nProvider>
									<QueryClientProvider client={queryClient}>
										<StudentProvider>
                      <Slot />
										</StudentProvider>
									</QueryClientProvider>
								</I18nProvider>
							</NetworkProvider>
						</ThemeProvider>
					</SessionProvider>
				</SQLiteProvider>
			</GestureHandlerRootView>
		</RootSiblingParent>
	)
}
