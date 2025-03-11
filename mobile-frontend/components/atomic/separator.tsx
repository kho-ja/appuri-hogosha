import * as React from 'react'
import { useColorScheme, View, ViewStyle } from 'react-native'
import { ThemedView } from '@/components/ThemedView'

type SeparatorProps = {
	style?: ViewStyle
	orientation?: 'horizontal' | 'vertical'
}

const Separator = React.forwardRef<View, SeparatorProps>(
	({ style, orientation = 'horizontal', ...props }, _) => {
		const theme = useColorScheme() ?? 'light'
		const separatorStyle: ViewStyle = {
			backgroundColor: theme === 'light' ? '#eee' : '#434343',
			flexShrink: 0,
			...(orientation === 'horizontal'
				? { height: 1, width: '100%' }
				: { height: '100%', width: 2 }),
			...style,
		}

		return <ThemedView style={separatorStyle} {...props} />
	}
)

Separator.displayName = 'Separator'

export { Separator }
