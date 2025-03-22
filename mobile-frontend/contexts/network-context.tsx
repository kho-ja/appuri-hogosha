import React, { createContext, useContext, useEffect, useState } from 'react'
import NetInfo from '@react-native-community/netinfo'

interface NetworkContextProps {
	isOnline: boolean | null
}

const NetworkContext = createContext<NetworkContextProps>({ isOnline: null })

export const useNetwork = () => useContext(NetworkContext)

export const NetworkProvider: React.FC<React.PropsWithChildren> = ({
	children,
}) => {
	const [isOnline, setIsOnline] = useState<boolean | null>(null)

	useEffect(() => {
		const unsubscribe = NetInfo.addEventListener(state => {
			setIsOnline(state.isConnected)
		})
		return () => unsubscribe()
	}, [])

	return (
		<NetworkContext.Provider value={{ isOnline }}>
			{children}
		</NetworkContext.Provider>
	)
}
