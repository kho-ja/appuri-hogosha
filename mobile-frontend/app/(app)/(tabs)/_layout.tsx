import { TabBarIcon } from '@/components/navigation/TabBarIcon'
import { ThemedText } from '@/components/ThemedText'
import { Colors } from '@/constants/Colors'
import { useSession } from '@/contexts/auth-context'
import { I18nContext } from '@/contexts/i18n-context'
import { useColorScheme } from '@/hooks/useColorScheme'
import { Redirect, Tabs } from 'expo-router'
import React, { useContext } from 'react'

export default function TabLayout() {
	const { language, i18n } = useContext(I18nContext)
	const colorScheme = useColorScheme()
	const { session, isLoading } = useSession()
	if (isLoading) {
		return (
			<ThemedText style={{ alignContent: 'center', justifyContent: 'center' }}>
				Loading...
			</ThemedText>
		)
	}
	if (!session) {
		return <Redirect href='/sign-in' />
	}
	return (
		<Tabs
			screenOptions={{
				tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
				headerShown: false,
			}}
		>
			<Tabs.Screen
				name='(home)'
				options={{
					title: i18n[language].home,
					tabBarIcon: ({ color, focused }) => (
						<TabBarIcon
							name={focused ? 'home' : 'home-outline'}
							color={color}
						/>
					),
					headerShown: false,
				}}
			/>
			<Tabs.Screen
				name='(settings)'
				options={{
					title: i18n[language].settings,
					tabBarIcon: ({ color, focused }) => (
						<TabBarIcon
							name={focused ? 'settings' : 'settings-outline'}
							color={color}
						/>
					),
				}}
			/>
		</Tabs>
	)
}
