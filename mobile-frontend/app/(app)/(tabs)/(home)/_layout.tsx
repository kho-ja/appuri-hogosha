import { Stack } from 'expo-router'
import React from 'react'

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
				options={{ headerTitle: 'Detailed view', headerTitleAlign: 'center' }}
			/>
		</Stack>
	)
}

export default Layout
