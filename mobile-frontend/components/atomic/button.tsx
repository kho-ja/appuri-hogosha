import React from 'react'
import { Pressable, StyleSheet } from 'react-native'
import { ThemedText } from '@/components/ThemedText'

export default function Button(props: {
	onPress: any
	title?: string
	type?: 'default' | 'primary' | 'secondary' | 'tertiary' | 'danger'
	disabled?: boolean
}) {
	const { onPress, title = 'Save', type, disabled = false } = props

	return (
		<Pressable
			style={[
				styles.button,
				type === 'danger' ? styles.danger : undefined,
				disabled ? styles.disabled : undefined,
			]}
			onPress={!disabled ? onPress : undefined}
			disabled={disabled}
		>
			<ThemedText style={styles.text}>{title}</ThemedText>
		</Pressable>
	)
}

const styles = StyleSheet.create({
	button: {
		alignItems: 'center',
		justifyContent: 'center',
		padding: 16,
		borderRadius: 4,
		elevation: 1,
		backgroundColor: '#059669',
	},
	text: {
		fontSize: 16,
		lineHeight: 20,
		fontWeight: 'bold',
		letterSpacing: 0.25,
		color: 'white',
	},
	danger: {
		backgroundColor: '#DC2626',
	},
	disabled: {
		backgroundColor: '#A0A0A0',
	},
})
