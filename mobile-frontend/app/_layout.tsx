import React from 'react'
import * as Notifications from 'expo-notifications'
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

Notifications.setNotificationHandler({
	handleNotification: async () => ({
		shouldShowAlert: true,
		shouldPlaySound: true,
		shouldSetBadge: true,
	}),
})

function useNotificationObserver() {
	React.useEffect(() => {
		let isMounted = true

		function redirect(notification: Notifications.Notification) {
			const url = notification.request.content.data?.url
			if (url) {
				router.push(url)
			}
		}

		Notifications.getLastNotificationResponseAsync().then(response => {
			if (!isMounted || !response?.notification) {
				return
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
	}, [])

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
