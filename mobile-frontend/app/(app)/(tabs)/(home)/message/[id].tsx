import React, { useContext, useEffect, useState } from 'react'
import {
  ScrollView,
  StyleSheet,
  View,
  Modal,
  TouchableOpacity,
  Text,
  Pressable, ActivityIndicator,
} from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { ThemedText } from '@/components/ThemedText'
import { useSQLiteContext } from 'expo-sqlite'
import { useSession } from '@/contexts/auth-context'
import { I18nContext } from '@/contexts/i18n-context'
import { useNetwork } from '@/contexts/network-context'
import { fetchMessageFromDB, saveMessageToDB } from '@/utils/queries'
import { DatabaseMessage, Student } from '@/constants/types'
import formatMessageDate from '@/utils/format'
import { Autolink } from 'react-native-autolink'
import { useThemeColor } from '@/hooks/useThemeColor'
import { Image } from 'expo-image'
import ImageViewer from 'react-native-image-zoom-viewer'

const styles = StyleSheet.create({
	container: {
		flex: 1,
		padding: 10,
	},
	titleRow: {
		flexDirection: 'row',
		marginTop: 5,
	},
	title: {
		fontSize: 18,
		fontWeight: '600',
		textAlign: 'center',
	},
	dateRow: {
		flexDirection: 'row',
		alignItems: 'center',
		marginTop: 5,
		gap: 10,
	},
	dateText: {
		fontSize: 12,
		fontWeight: '300',
	},
	descriptionRow: {
		flexDirection: 'row',
		alignItems: 'center',
		marginTop: 5,
		paddingBottom: 50,
	},
	importanceBadge: {
		padding: 5,
		borderRadius: 5,
		backgroundColor: 'red',
		color: 'white',
		fontSize: 12,
	},
	groupStyle: {
		backgroundColor: '#059669',
		color: 'white',
		fontSize: 12,
		padding: 5,
		borderRadius: 5,
	},
	image: {
		flex: 1,
		width: '100%',
		height: 200,
	},
	closeButton: {
		position: 'absolute',
		top: 40,
		right: 20,
		zIndex: 10,
		backgroundColor: 'rgba(0, 0, 0, 0.5)',
		borderRadius: 20,
		padding: 10,
	},
	closeButtonText: {
		color: 'white',
		fontSize: 16,
		fontWeight: 'bold',
	},
})

export default function DetailsScreen() {
	const [message, setMessage] = useState<DatabaseMessage | null>(null)
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [zoomVisible, setZoomVisible] = useState(false)
	const [currentImageIndex, setCurrentImageIndex] = useState(0)

	const { id } = useLocalSearchParams()
	const { language, i18n } = useContext(I18nContext)
	const { session } = useSession()
	const { isOnline } = useNetwork()
	const db = useSQLiteContext()
	const textColor = useThemeColor({}, 'text')

	const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000'
	const imageUrl = process.env.EXPO_PUBLIC_S3_BASE_URL

	const markMessageAsRead = async (messageId: number, studentId: number) => {
		const currentTime = new Date().toISOString()

		try {
			// Update local DB
			await db.runAsync(
				'UPDATE message SET read_status = 1, read_time = ?, sent_status = ? WHERE id = ?',
				[currentTime, isOnline ? 1 : 0, messageId]
			)

			// Sync with backend if online
			if (isOnline) {
				const response = await fetch(`${apiUrl}/view`, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${session}`,
					},
					body: JSON.stringify({
						post_id: messageId,
						student_id: studentId,
						viewed_at: currentTime,
					}),
				})

				if (!response.ok) {
					console.error(
						'Failed to sync read status with backend:',
						await response.text()
					)
					await db.runAsync('UPDATE message SET sent_status = 0 WHERE id = ?', [
						messageId,
					])
				}
			}
		} catch (error) {
			console.error('Error updating read status:', error)
			await db
				.runAsync('UPDATE message SET sent_status = 0 WHERE id = ?', [
					messageId,
				])
				.catch(err => console.error('Error updating sent_status:', err))
		}
	}

	useEffect(() => {
		const fetchMessage = async () => {
			if (!id) {
				setError('Invalid message ID')
				setLoading(false)
				return
			}

			try {
				let fullMessage: DatabaseMessage | null = null
				const localMessage = await fetchMessageFromDB(db, Number(id))

				if (localMessage) {
					fullMessage = localMessage
				} else if (isOnline) {
					const response = await fetch(`${apiUrl}/posts/${id}`, {
						method: 'GET',
						headers: {
							'Content-Type': 'application/json',
							Authorization: `Bearer ${session}`,
						},
					})

					if (!response.ok) {
						throw new Error('Failed to fetch message from server')
					}

					const messageData = await response.json()
					const activeStudent =
						(await db.getFirstAsync<Student>(
							'SELECT * FROM student WHERE id = (SELECT student_id FROM message WHERE id = ?)',
							[Number(id)]
						)) ||
						(await db.getFirstAsync<Student>('SELECT * FROM student LIMIT 1'))

					if (!activeStudent) {
						throw new Error('No student found for this message')
					}

					await saveMessageToDB(
						db,
						messageData,
						activeStudent.student_number,
						activeStudent.id
					)
					fullMessage = await fetchMessageFromDB(db, Number(id))
					if (!fullMessage) {
						throw new Error('Failed to save message to database')
					}
				} else {
					setError('Message not found and offline')
					return
				}

				setMessage(fullMessage)
				if (!fullMessage.sent_status) {
					await markMessageAsRead(fullMessage.id, fullMessage.student_id)
				}
			} catch (error) {
				console.error('Error in fetchMessage:', error)
				setError('Failed to retrieve message')
			} finally {
				setLoading(false)
			}
		}

		fetchMessage()
	}, [id, apiUrl, db, isOnline, session])

	if (loading) return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color="#adb5bd"  />
      <ThemedText>Loading...</ThemedText>
    </View>
  )
	if (error) return <ThemedText>{error}</ThemedText>
	if (!message) return <ThemedText>{i18n[language].messageNotFound}</ThemedText>

	const imageArray = Array.isArray(message.images)
		? message.images
		: message.images
			? [message.images]
			: []
	const imagesForZoomViewer = imageArray.map(filename => ({
		url: `${imageUrl}/${filename}`,
	}))

	return (
		<ScrollView style={styles.container}>
			<View style={styles.titleRow}>
				<ThemedText style={styles.title}>{message.title}</ThemedText>
			</View>
			<View style={styles.dateRow}>
				<ThemedText style={styles.dateText}>
					{formatMessageDate(new Date(message.sent_time), language)}
				</ThemedText>
			</View>
			<View style={styles.descriptionRow}>
				<Autolink
					email
					hashtag='instagram'
					mention='instagram'
					text={message.content}
					style={{ color: textColor, fontSize: 16 }}
				/>
			</View>
			{imageArray.length > 0 && (
				<View>
					{imageArray.map((filename, idx) => (
						<TouchableOpacity
							key={idx}
							onPress={() => {
								setCurrentImageIndex(idx)
								setZoomVisible(true)
							}}
						>
							<Image
								style={styles.image}
								source={{ uri: `${imageUrl}/${filename}` }}
								contentFit='contain'
								transition={300}
							/>
						</TouchableOpacity>
					))}
				</View>
			)}
			<Modal
				visible={zoomVisible}
				transparent={true}
				onRequestClose={() => setZoomVisible(false)}
			>
				<Pressable
					style={styles.closeButton}
					onPress={() => setZoomVisible(false)}
					hitSlop={20}
				>
					<Text style={styles.closeButtonText}>✕</Text>
				</Pressable>
				<ImageViewer
					imageUrls={imagesForZoomViewer}
					index={currentImageIndex}
					onCancel={() => setZoomVisible(false)}
					enableSwipeDown={true}
					onSwipeDown={() => setZoomVisible(false)}
				/>
			</Modal>
		</ScrollView>
	)
}
