import { LinkingOptions } from '@react-navigation/native';
import * as Linking from 'expo-linking';

const linking: LinkingOptions<ReactNavigation.RootParamList> = {
  prefixes: [
    'jduapp://',
    'https://appuri-hogosha.vercel.app/parentnotification'
  ],
  config: {
    screens: {
      // Map to actual navigation structure
      '(app)': {
        screens: {
          '(tabs)': {
            screens: {
              '(home)': {
                screens: {
                  index: 'home',
                  message: 'message/:id?',
                }
              },
              student: {
                screens: {
                  index: 'student',
                  detail: 'student/:id',
                }
              },
            }
          },
          '(settings)': {
            screens: {
              index: 'settings',
              profile: 'settings/profile',
            }
          },
        }
      },
      NotFound: '*',
    },
  },
  // Modern way to get initial URL
  getInitialURL() {
    return Linking.getInitialURL();
  },
  // Modern subscription method
  subscribe(listener) {
    const subscription = Linking.addEventListener('url', ({ url }) => {
      listener(url);
    });
    return () => subscription.remove();
  },
};

export default linking;
