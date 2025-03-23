import React, {
	useCallback,
	useContext,
	useEffect,
	useRef,
	useState,
} from 'react'
import {
	Pressable,
	SafeAreaView,
	ScrollView,
	StyleSheet,
	TouchableOpacity,
	useColorScheme,
	View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { ThemedText } from '@/components/ThemedText'
import { useSession } from '@/contexts/auth-context'
import {
	BottomSheetModal,
	BottomSheetModalProvider,
} from '@gorhom/bottom-sheet'
import { I18nContext } from '@/contexts/i18n-context'
import { Button } from '@rneui/themed'
import { User } from '@/constants/types'
import { useSQLiteContext } from 'expo-sqlite'
import { ThemedView } from '@/components/ThemedView'
import { Href, router } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'

interface LanguageSelectionProps {
	language: string
	selectedLanguage: string
	onSelect: (language: string) => void
}

const LanguageSelection: React.FC<LanguageSelectionProps> = ({
	language,
	selectedLanguage,
	onSelect,
}) => (
	<TouchableOpacity
		key={language}
		style={{
			display: 'flex',
			flexDirection: 'row',
			justifyContent: 'space-between',
			borderRadius: 4,
			width: '100%',
			backgroundColor:
				selectedLanguage === language ? '#059669' : 'transparent',
			padding: 10,
			marginBottom: 10,
		}}
		onPress={() => onSelect(language)}
	>
		<ThemedText>{language}</ThemedText>
		<Ionicons
			name={'checkmark'}
			size={20}
			color={selectedLanguage === language ? '#059669' : 'transparent'}
		/>
	</TouchableOpacity>
)

export default function SettingsScreen() {
	const { language, i18n, setLanguage } = useContext(I18nContext)
	const { signOut } = useSession()
	const db = useSQLiteContext()
	const [user, setUser] = useState<User | null>(null)
	const theme = useColorScheme() ?? 'light'
	const [, setIsOpen] = useState(false)
	const [selectedLanguage, setSelectedLanguage] = useState(
		language === 'en' ? 'English' : language === 'ja' ? '日本語' : "O'zbekcha"
	)
	const bottomSheetModalRef = useRef(null)
	const snapPoints = ['40%', '50%']
	const languages = ['English', '日本語', "O'zbekcha"]
	const handleLanguageSelect = async (
		language: React.SetStateAction<string>
	) => {
		const languageCode =
			language === 'English' ? 'en' : language === '日本語' ? 'ja' : 'uz'
		setLanguage(languageCode)
		setSelectedLanguage(language)
		await AsyncStorage.setItem('language', languageCode)
	}
	const handlePresentModal = useCallback(() => {
		// @ts-ignore
		bottomSheetModalRef.current?.present()
		setTimeout(() => {
			setIsOpen(true)
		}, 100)
	}, [])
	useEffect(() => {
		const fetchUser = async () => {
			const userData: User | null = await db.getFirstSync('SELECT * FROM user')
			setUser(userData)
		}

		fetchUser()
	}, [db])
	const handlePress = useCallback(() => {
		signOut()
	}, [signOut])
	return (
		<SafeAreaView style={styles.container}>
			<BottomSheetModalProvider>
				<ScrollView showsVerticalScrollIndicator={false}>
					<View style={styles.profile}>
						<View>
							<ThemedText style={styles.profileName}>
								{i18n[language].settings}
							</ThemedText>
						</View>
					</View>
					<ThemedText style={styles.sectionTitle}>
						{i18n[language].information}
					</ThemedText>

					<View
						style={[
							styles.infoContainer,
							{ backgroundColor: theme === 'light' ? '#eee' : '#2c2c2e' },
						]}
					>
						<ThemedText style={styles.label}>
							{i18n[language].firstName}
						</ThemedText>
						<ThemedText style={styles.value}>
							{user && user.given_name}
						</ThemedText>
					</View>
					<View
						style={[
							styles.infoContainer,
							{ backgroundColor: theme === 'light' ? '#eee' : '#2c2c2e' },
						]}
					>
						<ThemedText style={styles.label}>
							{i18n[language].lastName}
						</ThemedText>
						<ThemedText style={styles.value}>
							{user && user.family_name}
						</ThemedText>
					</View>
					<View
						style={[
							styles.infoContainer,
							{ backgroundColor: theme === 'light' ? '#eee' : '#2c2c2e' },
						]}
					>
						<ThemedText style={styles.label}>
							{i18n[language].phoneNumber}
						</ThemedText>
						<ThemedText style={styles.value}>
							{user && user.phone_number}
						</ThemedText>
					</View>
					<View
						style={[
							styles.infoContainer,
							{ backgroundColor: theme === 'light' ? '#eee' : '#2c2c2e' },
						]}
					>
						<ThemedText style={styles.label}>
							{i18n[language].emailaddress}
						</ThemedText>
						<ThemedText style={styles.value}>{user && user.email}</ThemedText>
					</View>

					<ThemedText style={styles.sectionTitle}>
						{i18n[language].preferences}
					</ThemedText>
					<Pressable onPress={handlePresentModal} style={styles.row}>
						<View style={[styles.rowIcon, { backgroundColor: '#fe9400' }]}>
							<Ionicons color='#fff' name='globe' size={20} />
						</View>

						<ThemedText style={styles.rowLabel}>
							{i18n[language].language}
						</ThemedText>

						<View style={styles.rowSpacer} />

						<Ionicons color='#C6C6C6' name='chevron-forward' size={20} />
					</Pressable>
					<Pressable
						onPress={() => router.navigate('change-psswd' as Href)}
						style={styles.row}
					>
						<View style={[styles.rowIcon, { backgroundColor: '#d0b783' }]}>
							<Ionicons color='#fff' name='key' size={20} />
						</View>

						<ThemedText style={styles.rowLabel}>
							{i18n[language].changePassword}
						</ThemedText>

						<View style={styles.rowSpacer} />

						<Ionicons color='#C6C6C6' name='chevron-forward' size={20} />
					</Pressable>
					<BottomSheetModal
						ref={bottomSheetModalRef}
						index={1}
						snapPoints={snapPoints}
						backgroundStyle={{ backgroundColor: '#eee' }}
						onDismiss={() => setIsOpen(false)}
					>
						<ThemedView style={styles.contentContainer}>
							<ThemedView style={styles.row}></ThemedView>
							<ThemedView>
								{languages.map(language => (
									<LanguageSelection
										key={language}
										language={language}
										selectedLanguage={selectedLanguage}
										onSelect={handleLanguageSelect}
									/>
								))}
							</ThemedView>
						</ThemedView>
					</BottomSheetModal>
					<View style={{ marginTop: 15 }}>
						<Button
							buttonStyle={styles.submitButton}
							onPress={handlePress}
							title={i18n[language].logout}
							color='secondary'
						/>
					</View>
				</ScrollView>
			</BottomSheetModalProvider>
		</SafeAreaView>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		padding: 10,
		rowGap: 10,
		flexGrow: 1,
		flexShrink: 1,
		flexBasis: 0,
	},
	submitButton: {
		padding: 16,
		borderRadius: 4,
		alignItems: 'center',
	},
	profile: {
		padding: 24,
		flexDirection: 'column',
		alignItems: 'center',
		justifyContent: 'center',
	},
	profileName: {
		marginTop: 20,
		fontSize: 19,
		fontWeight: '600',
		textAlign: 'center',
	},
	sectionTitle: {
		paddingVertical: 12,
		fontSize: 12,
		fontWeight: '600',
		textTransform: 'uppercase',
		letterSpacing: 1.1,
	},
	infoContainer: {
		position: 'relative',
		borderRadius: 10,
		alignItems: 'flex-start',
		padding: 10,
		paddingTop: 30,
		marginBottom: 10,
	},
	label: {
		position: 'absolute',
		top: 10,
		left: 10,
		color: '#b0b0ba',
		fontSize: 12,
	},
	value: {
		fontWeight: 'bold',
	},
	row: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'flex-start',
		height: 50,
		borderRadius: 8,
		paddingLeft: 12,
		paddingRight: 12,
	},
	rowIcon: {
		width: 32,
		height: 32,
		borderRadius: 9999,
		marginRight: 12,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
	},
	rowLabel: {
		fontSize: 17,
		fontWeight: '400',
	},
	rowSpacer: {
		flexGrow: 1,
		flexShrink: 1,
		flexBasis: 0,
	},
	contentContainer: {
		flex: 1,
		alignItems: 'center',
		paddingHorizontal: 15,
	},
	title: {
		fontWeight: '900',
		letterSpacing: 0.5,
		fontSize: 16,
	},
	inputContainer: {
		display: 'flex',
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginVertical: 10,
		paddingHorizontal: 15,
	},
	input: {
		width: '70%',
		height: 40,
		marginVertical: 12,
		borderWidth: 1,
		padding: 10,
		borderRadius: 4,
		borderColor: 'grey',
	},
	button: {
		height: 'auto',
		width: 'auto',
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#059669',
	},
	text: {
		fontWeight: 'bold',
		color: 'white',
	},
})
