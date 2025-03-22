import React, { useState } from 'react'
import {
	View,
	Text,
	TouchableOpacity,
	StyleSheet,
	Pressable,
} from 'react-native'
import { TabBarIcon } from '@/components/navigation/TabBarIcon'

const PopupMenu = ({
	options,
	selectedValue,
}: {
	options: { label: string; action: () => void }[]
	selectedValue: { label: string; action: () => void }
}) => {
	const [showMenu, setShowMenu] = useState(false)
	const [selectedOption, setSelectedOption] = useState(
		selectedValue || options[0]
	)
	const handleToggleMenu = () => setShowMenu(!showMenu)
	const handleMenuOption = (option: any) => {
		option.action()
		handleSelectOption(option)
	}
	const handleSelectOption = (option: any) => {
		setSelectedOption(option)
		setShowMenu(false)
	}
	return (
		<View style={styles.container}>
			<Pressable onPress={handleToggleMenu} style={styles.selectPlaceholder}>
				<Text>{selectedOption.label}</Text>
				<TabBarIcon name={showMenu ? 'chevron-up' : 'chevron-down'} size={18} />
			</Pressable>

			{showMenu && (
				<View style={styles.menu}>
					{options.map((option, index) => (
						<TouchableOpacity
							key={index}
							style={styles.option}
							onPress={() => handleMenuOption(option)}
						>
							<Text style={styles.optionText}>{option.label}</Text>
						</TouchableOpacity>
					))}
				</View>
			)}
		</View>
	)
}
export default PopupMenu

const styles = StyleSheet.create({
	container: {
		position: 'relative',
		flexDirection: 'row',
	},
	menu: {
		width: 'auto',
		backgroundColor: 'white',
		shadowColor: '#000',
		shadowOffset: {
			width: 0,
			height: 2,
		},
		shadowOpacity: 0.25,
		shadowRadius: 3.84,
		elevation: 5,
		borderRadius: 4,
		padding: 8,
		position: 'absolute',
		top: '100%',
		left: 82,
		marginLeft: -80,
		borderColor: '#D1D5DB',
		borderWidth: 1,
	},
	option: {
		flexDirection: 'row',
		alignItems: 'center',
		padding: 8,
	},
	optionText: {
		color: '#4A5568',
	},
	selectPlaceholder: {
		padding: 8,
		borderRadius: 4,
		borderColor: '#D1D5DB',
		borderWidth: 1,
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
	},
})
