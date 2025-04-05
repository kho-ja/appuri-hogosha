import { router, Stack } from 'expo-router'
import React from 'react'
import { Ionicons } from '@expo/vector-icons'
import { useColorScheme } from '@/hooks/useColorScheme'
import { Pressable } from 'react-native'
import { Colors } from '@/constants/Colors'

const Layout = () => {
	const colorScheme = useColorScheme()
	const iconColor = Colors[colorScheme]?.tint
	return (
		<Stack>
			<Stack.Screen name='index' options={{ headerShown: false }} />
			<Stack.Screen
				name='student/[id]'
				options={{ headerTitle: 'Student', headerTitleAlign: 'center' }}
			/>
			<Stack.Screen
				name='message/[id]'
				options={{
					headerTitle: 'Detailed view',
					headerTitleAlign: 'center',
					headerLeft: () => {
						return (
							<Pressable
								onPress={() => router.navigate('/')}
								style={{ marginLeft: 10 }}
							>
								<Ionicons name={'arrow-back-outline'} size={24} color={iconColor}/>
							</Pressable>
						)
					},
				}}
			/>
		</Stack>
	)
}

export default Layout
