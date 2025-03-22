import { Text, type TextProps, StyleSheet } from 'react-native'

import { useThemeColor } from '@/hooks/useThemeColor'

export type ThemedTextProps = TextProps & {
	lightColor?: string
	darkColor?: string
	type?:
		| 'default'
		| 'title'
		| 'defaultSemiBold'
		| 'subtitle'
		| 'link'
		| 'smaller'
}

export function ThemedText({
	style,
	lightColor,
	darkColor,
	type = 'default',
	...rest
}: ThemedTextProps) {
	const color = useThemeColor({ light: lightColor, dark: darkColor }, 'text')

	return (
		<Text
			style={[
				{ color },
				type === 'default' ? styles.default : undefined,
				type === 'title' ? styles.title : undefined,
				type === 'defaultSemiBold' ? styles.defaultSemiBold : undefined,
				type === 'subtitle' ? styles.subtitle : undefined,
				type === 'link' ? styles.link : undefined,
				type === 'link' ? styles.smaller : undefined,
				style,
			]}
			{...rest}
		/>
	)
}

const styles = StyleSheet.create({
	default: {
		fontSize: 16,
	},
	defaultSemiBold: {
		fontSize: 16,
	},
	title: {
		fontSize: 32,
	},
	subtitle: {
		fontSize: 20,
	},
	link: {
		lineHeight: 30,
		color: '#059669',
	},
	smaller: {
		fontSize: 15,
	},
})
