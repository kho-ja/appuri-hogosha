import React from 'react'
import { View, StyleSheet } from 'react-native'
import { useStudents } from '@/contexts/student-context' // Your student context
import { ThemedText } from '@/components/ThemedText'
import { SafeAreaView } from 'react-native-safe-area-context'
import { StudentSelector } from '@/components/StudentSelector' // Your selector component
import MessageList from '@/components/MessageList'

const HomeScreen = () => {
	const { students } = useStudents() // Fetch students from context

	// Loading state while students are being fetched
	if (!students || students.length === 0) {
		return (
			<View style={styles.loadingContainer}>
				<ThemedText>Loading...</ThemedText>
			</View>
		)
	}

	// If there's only one student, show their messages directly
	if (students.length === 1) {
		return <MessageList studentId={students[0].id} />
	}

	// If there are multiple students, show the selection list
	return (
		<SafeAreaView style={styles.safeArea}>
			<StudentSelector students={students} />
		</SafeAreaView>
	)
}

const styles = StyleSheet.create({
	loadingContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
	},
	safeArea: {
		flex: 1,
	},
})

export default HomeScreen
