import * as React from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'

type UseStateHook<T> = [[boolean, T | null], (value: T | null) => void]

function useAsyncState<T>(
	initialValue: [boolean, T | null] = [true, null]
): UseStateHook<T> {
	return React.useReducer(
		(
			_state: [boolean, T | null],
			action: T | null = null
		): [boolean, T | null] => [false, action],
		initialValue
	) as UseStateHook<T>
}

export async function setStorageItemAsync(key: string, value: string | null) {
	if (value == null) {
		await AsyncStorage.removeItem(key)
	} else {
		await AsyncStorage.setItem(key, value)
	}
}

export function useStorageState(key: string): UseStateHook<string> {
	// Public
	const [state, setState] = useAsyncState<string>()

	// Get
	React.useEffect(() => {
		AsyncStorage.getItem(key).then((value: string | null) => {
			setState(value)
		})
	}, [key, setState])

	// Set
	const setValue = React.useCallback(
		(value: string | null) => {
			setState(value)
			setStorageItemAsync(key, value)
		},
		[key, setState]
	)

	return [state, setValue]
}
