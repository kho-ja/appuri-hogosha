import React, { useCallback, useContext, useState } from 'react'
import {
	BackHandler,
	Keyboard,
	StyleSheet,
	Text,
	TouchableWithoutFeedback,
	View,
} from 'react-native'
import { useSession } from '@/contexts/auth-context'
import { SafeAreaView } from 'react-native-safe-area-context'
import Select from '@/components/atomic/select'
import Input from '@/components/atomic/input'
import SecureInput from '@/components/atomic/secure-input'
import { I18nContext } from '@/contexts/i18n-context'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useMutation } from '@tanstack/react-query'
import { Button } from '@rneui/themed'
import Toast from 'react-native-root-toast'

export default function SignIn() {
	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')
	const [backPressCount, setBackPressCount] = useState(0)
	const { signIn } = useSession()
	const { language, i18n, setLanguage } = useContext(I18nContext)
	const menuOptions = [
		{
			label: 'English',
			action: async () => {
				setLanguage('en')
				await AsyncStorage.setItem('language', 'en')
			},
		},
		{
			label: '日本語',
			action: async () => {
				setLanguage('ja')
				await AsyncStorage.setItem('language', 'ja')
			},
		},
		{
			label: "O'zbek",
			action: async () => {
				setLanguage('uz')
				await AsyncStorage.setItem('language', 'uz')
			},
		},
	]
	React.useEffect(() => {
		const loadCredentials = async () => {
			try {
				const storedEmail = await AsyncStorage.getItem('email')
				if (storedEmail) {
					setEmail(storedEmail)
				}
			} catch (error) {
				console.error('Failed to load credentials from AsyncStorage', error)
			}
		}

		const initialize = async () => {
			await loadCredentials()
		}
		initialize()
	}, [])

	const handleBackPress = useCallback(() => {
		if (backPressCount === 0) {
			// First back press - show exit hint
			Toast.show(i18n[language].pressBackAgainToExit, {
				duration: Toast.durations.SHORT,
				position: Toast.positions.BOTTOM,
				shadow: true,
				animation: true,
				hideOnPress: true,
				textColor: 'white',
				containerStyle: {
					backgroundColor: 'gray',
					borderRadius: 5,
				},
			})
			setBackPressCount(1)

			// Reset back press count after 2 seconds
			setTimeout(() => {
				setBackPressCount(0)
			}, 2000)

			return true
		} else {
			// Second back press within 2 seconds - exit app
			BackHandler.exitApp()
			return true
		}
	}, [backPressCount, i18n, language]) // Add dependencies used inside the callback

	React.useEffect(() => {
		const backHandler = BackHandler.addEventListener(
			'hardwareBackPress',
			handleBackPress
		)

		return () => backHandler.remove()
	}, [handleBackPress])

	const { mutate, isPending } = useMutation({
		mutationFn: async () => await signIn(email, password),
		onError: error => {
			Toast.show(i18n[language].loginFailed, {
				duration: Toast.durations.LONG,
				position: Toast.positions.BOTTOM,
				shadow: true,
				animation: true,
				hideOnPress: true,
				textColor: 'white',
				containerStyle: {
					backgroundColor: 'red',
					borderRadius: 5,
				},
			})
		},
		onSuccess: async () => {
			Toast.show(i18n[language].loginSuccess, {
				duration: Toast.durations.SHORT,
				position: Toast.positions.BOTTOM,
				shadow: true,
				animation: true,
				hideOnPress: true,
				textColor: 'white',
				containerStyle: {
					backgroundColor: 'green',
					borderRadius: 5,
				},
			})
		},
	})
	return (
		<TouchableWithoutFeedback onPress={Keyboard.dismiss}>
			<SafeAreaView style={styles.container}>
				<View style={styles.container}>
					<View style={styles.header}>
						<View>
							<Text style={styles.title}>{i18n[language].welcome}</Text>
							<Text style={styles.subtitle}>{i18n[language].login}</Text>
						</View>
						<View>
							<Select
								options={menuOptions}
								selectedValue={
									language === 'en'
										? menuOptions[0]
										: language === 'ja'
											? menuOptions[1]
											: menuOptions[2]
								}
							/>
						</View>
					</View>
					<Input
						textContentType='emailAddress'
						keyboardType='email-address'
						autoCapitalize='none'
						maxLength={50}
						selectTextOnFocus={true}
						label={i18n[language].email}
						placeholder={i18n[language].enterEmail}
						onChangeText={setEmail}
						value={email}
					/>
					<SecureInput
						label={i18n[language].password}
						placeholder={i18n[language].enterPassword}
						onChangeText={setPassword}
						maxLength={50}
						value={password}
						selectTextOnFocus
						keyboardType='numbers-and-punctuation'
						textContentType='password'
						autoCapitalize='none'
					/>
					<Button
						onPress={() => mutate()}
						title={i18n[language].loginToAccount}
						buttonStyle={styles.submitButton}
						disabled={isPending}
						loading={isPending}
					/>
				</View>
			</SafeAreaView>
		</TouchableWithoutFeedback>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		padding: 12,
		backgroundColor: 'white',
		alignContent: 'center',
	},
	submitButton: {
		padding: 16,
		borderRadius: 4,
		alignItems: 'center',
	},
	header: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		paddingBottom: 10,
		marginBottom: 80,
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
