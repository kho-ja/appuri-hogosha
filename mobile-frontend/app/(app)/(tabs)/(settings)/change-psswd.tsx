import { router } from 'expo-router'
import {
	Keyboard,
	StyleSheet,
	TextInput,
	TouchableWithoutFeedback,
	useColorScheme,
	View,
} from 'react-native'
import { useSession } from '@/contexts/auth-context'
import { SafeAreaView } from 'react-native-safe-area-context'
import { I18nContext } from '@/contexts/i18n-context'
import React, { useContext, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import Toast from 'react-native-root-toast'
import { ThemedText } from '@/components/ThemedText'
import { Button } from '@rneui/themed'
import { useMutation } from '@tanstack/react-query'

const styles = StyleSheet.create({
	container: {
		flex: 1,
		padding: 12,
		alignContent: 'center',
	},
	submitButton: {
		padding: 16,
		borderRadius: 4,
		alignItems: 'center',
	},
	title: {
		fontWeight: 'bold',
		fontSize: 20,
	},
	errorText: {
		color: 'red',
	},
	header: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		paddingBottom: 10,
		marginBottom: 50,
	},
	buttonContainer: {
		flexDirection: 'row',
		justifyContent: 'center',
		gap: 2,
		paddingTop: 10,
	},
	textInput: {
		borderColor: 'grey',
		borderWidth: 1,
		borderRadius: 4,
		padding: 8,
		textAlignVertical: 'center',
		marginBottom: 10,
	},
})

export default function Index() {
	const { session } = useSession()
	const { language, i18n } = useContext(I18nContext)
	const theme = useColorScheme() ?? 'light'
	const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000'
	const [password, setPassword] = useState('')
	const [errorMessage, setErrorMessage] = useState('')

	const changePassword = async () => {
		const response = await fetch(`${apiUrl}/change-password`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${session}`,
			},
			body: JSON.stringify({
				previous_password: await AsyncStorage.getItem('password'),
				new_password: password,
			}),
		})

		const responseData = await response.json()

		if (!response.ok) {
			throw new Error(responseData.error)
		}

		return responseData
	}
	const { mutate, isPending } = useMutation({
		mutationFn: changePassword,
		onSuccess: () => {
			Toast.show(i18n[language].passwordChangedSuccess, {
				duration: Toast.durations.SHORT,
				position: Toast.positions.BOTTOM,
				shadow: true,
				animation: true,
				hideOnPress: true,
				containerStyle: {
					backgroundColor: '#059669',
					borderRadius: 5,
				},
			})

			router.back()
		},
		onError: (error: Error) => {
			setErrorMessage(error.message)
			console.error(error)
		},
	})
	const handlePress = () => {
		setErrorMessage('')
		mutate()
	}
	return (
		<TouchableWithoutFeedback onPress={Keyboard.dismiss}>
			<SafeAreaView style={styles.container}>
				<View style={styles.container}>
					<View style={styles.header}>
						<View>
							<ThemedText style={styles.title}>
								{i18n[language].newpassword}
							</ThemedText>
						</View>
					</View>
					<TextInput
						style={[
							styles.textInput,
							{ color: theme === 'light' ? 'black' : 'white' },
						]}
						placeholder={i18n[language].enterPassword}
						placeholderTextColor='grey'
						onChangeText={setPassword}
					/>
					<Button
						onPress={handlePress}
						title={i18n[language].savePassword}
						buttonStyle={styles.submitButton}
						disabled={isPending}
						loading={isPending}
					/>
					{errorMessage !== '' && (
						<ThemedText style={styles.errorText}>{errorMessage}</ThemedText>
					)}
				</View>
			</SafeAreaView>
		</TouchableWithoutFeedback>
	)
}
