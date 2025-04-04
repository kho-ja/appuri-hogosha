import { router, Stack } from 'expo-router'
import React from 'react'
import { Ionicons } from '@expo/vector-icons'
import { Pressable } from 'react-native'

const Layout = () => {
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
								<Ionicons name={'chevron-back'} size={24} color='black' />
							</Pressable>
						)
					},
				}}
			/>
		</Stack>
	)
}

export default Layout
