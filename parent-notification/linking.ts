import { LinkingOptions } from '@react-navigation/native';
import * as Linking from 'expo-linking';

const linking: LinkingOptions = {
  prefixes: [
    'jduapp://',
    'https://appuri-hogosha.vercel.app/parentnotification'
  ],
  config: {
    screens: {
      '(app)': {
        screens: {
          '(tabs)': {
            screens: {
              '(home)': {
                screens: {
                  message: {
                    screens: {
                      id: 'message/:id?',
                    }
                  },
                  index: 'home',
                }
              },
              student: {
                screens: {
                  index: 'student',
                  id: 'student/:id',
                }
              },
            }
          },
          '(settings)': {
            screens: {
              index: 'settings',
            }
          },
        }
      },
      NotFound: '*',
    }
  },

  getInitialURL: async () => {
    return await Linking.getInitialURL();
  },
  subscribe(listener:any) {
    const subscription = Linking.addEventListener('url', event => {
      listener(event.url);
    });
    return () => subscription.remove();
  },

};

export default linking;
