import { LinkingOptions } from '@react-navigation/native'
import * as Linking from 'expo-linking'

const linking: LinkingOptions = {
  prefixes: [
    Linking.createURL('/'), // For Expo Go
    'jduapp://',
    'https:///appuri-hogosha.vercel.app/parentnotification' // Web fallback https://appuri-hogosha.vercel.app/parentnotification
  ],
  config: {
    screens: {
      Home: '',
      Profile: 'profile/:id',
      Notifications: 'notifications',
      NotFound: '*'
    }
  }
}

export default linking

