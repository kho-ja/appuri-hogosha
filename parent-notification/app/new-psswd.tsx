import { router } from 'expo-router'
import {
	Keyboard,
	StyleSheet,
	Text,
	TouchableWithoutFeedback,
	View,
} from 'react-native'
import { useSession } from '@/contexts/auth-context'
import { SafeAreaView } from 'react-native-safe-area-context'
import Input from '@/components/atomic/input'
import Button from '@/components/atomic/button'
import { I18nContext } from '@/contexts/i18n-context'
import React, { useContext, useState } from 'react'
import { Session } from '@/constants/types'
import { useSQLiteContext } from 'expo-sqlite'
import AsyncStorage from '@react-native-async-storage/async-storage'

import { registerForPushNotificationsAsync } from '@/utils/utils'

const styles = StyleSheet.create({
	container: {
		flex: 1,
		padding: 12,
		backgroundColor: 'white',
		alignContent: 'center',
	},
	header: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		paddingBottom: 10,
		marginBottom: 50,
	},
	title: {
		color: 'black',
		fontWeight: 'bold',
		fontSize: 20,
	},
	subtitle: {
		color: 'gray',
		fontSize: 16,
	},
	inputContainer: {
		paddingTop: 4,
	},
	buttonContainer: {
		flexDirection: 'row',
		justifyContent: 'center',
		gap: 2,
		paddingTop: 10,
	},
	resetPassword: {
		fontWeight: 'bold',
		color: '#059669',
	},
})

export default function Index() {
	const [password, setPassword] = useState('')
	const [errorMessage, setErrorMessage] = useState('')
	const { language, i18n } = useContext(I18nContext)
	const { setSession } = useSession()
	const db = useSQLiteContext()
	const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000'
	const handlePress = async () => {
		let token = await AsyncStorage.getItem('expoPushToken')
		if (!token) {
			token = await registerForPushNotificationsAsync()
			if (!token) {
				setErrorMessage('Failed to retrieve push token')
				return
			}
		}
		await fetch(`${apiUrl}/change-temp-password`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Accept: 'Application/json',
			},
			body: JSON.stringify({
				email: await AsyncStorage.getItem('email'),
				temp_password: await AsyncStorage.getItem('temp_password'),
				new_password: password,
				token: token,
			}),
		})
			.then(response => {
				if (!response.ok) {
					throw new Error('Failed to change password')
				}
				return response.json()
			})
			.then(async (data: Session) => {
				setSession(data.access_token)
				if (data.refresh_token) {
					await AsyncStorage.setItem('refresh_token', data.refresh_token)
				}
				await AsyncStorage.removeItem('temp_password')
				await db.runAsync(
					'INSERT INTO user (given_name, family_name, phone_number, email) VALUES ($given_name, $family_name, $phone_number, $email)',
					[
						data.user.given_name,
						data.user.family_name,
						data.user.phone_number,
						data.user.email,
					]
				)
				router.replace('/')
			})
			.catch(error => {
				setErrorMessage(error.message)
				throw new Error(error.message)
			})
	}

	return (
		<TouchableWithoutFeedback onPress={Keyboard.dismiss}>
			<SafeAreaView style={styles.container}>
				<View style={styles.container}>
					<View style={styles.header}>
						<View>
							<Text style={styles.title}>{i18n[language].newpassword}</Text>
						</View>
					</View>
					<Input
						label={'Create new password'}
						placeholder={i18n[language].enterPassword}
						onChangeText={setPassword}
					/>
					<Button onPress={handlePress} title={'Save password'} />
					{errorMessage !== '' && (
						<Text style={{ color: 'red' }}>{errorMessage}</Text>
					)}
				</View>
			</SafeAreaView>
		</TouchableWithoutFeedback>
	)
}
