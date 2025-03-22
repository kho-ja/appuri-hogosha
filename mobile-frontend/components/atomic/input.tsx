import React from 'react'
import { TextInput, View, Text } from 'react-native'
import { TextInputProps } from 'react-native'

export interface AdvancedInputProps extends TextInputProps {
	label?: string
	style?: object
}

const Input: React.FC<AdvancedInputProps> = ({ label, style, ...props }) => {
	return (
		<View style={{ ...style, width: '100%', marginBottom: 16 }}>
			{label && <Text style={{ fontSize: 16, marginBottom: 4 }}>{label}</Text>}
			<TextInput
				style={{
					height: 48,
					borderRadius: 4,
					justifyContent: 'center',
					paddingHorizontal: 10,
					borderWidth: 1,
					borderColor: '#D1D5DB',
					color: 'black',
				}}
				{...props}
			/>
		</View>
	)
}

export default Input
