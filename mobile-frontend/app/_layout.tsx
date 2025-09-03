import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { RootSiblingParent } from 'react-native-root-siblings';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SQLiteProvider } from 'expo-sqlite';
import { ThemeProvider } from '@rneui/themed';
import { NetworkProvider } from '@/contexts/network-context';
import { I18nProvider } from '@/contexts/i18n-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme } from '@/constants/theme';
import { setupNotificationHandler } from '@/utils/notifications';
import AppWithNotifications from './AppWithNotifications';
import { StatusBarBackground } from '@/components/StatusBarBackground';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { redirectSystemPath } from '../native-intent';

// Set up the notification handler BEFORE the app starts
setupNotificationHandler();

export default function Root() {
  const [themeMode, setThemeMode] = React.useState<'light' | 'dark'>('light');

  React.useEffect(() => {
    // Load saved theme
    AsyncStorage.getItem('themeMode').then(savedMode => {
      if (savedMode === 'light' || savedMode === 'dark') {
        setThemeMode(savedMode);
      }
    });
  }, []);

  React.useEffect(() => {
    // Save theme when it changes
    AsyncStorage.setItem('themeMode', themeMode);
  }, [themeMode]);

  // Handle deep links
  React.useEffect(() => {
    // Handle initial URL if app was opened via deep link
    const handleInitialURL = async () => {
      try {
        const initialURL = await Linking.getInitialURL();
        if (initialURL) {
          console.log('App opened with initial URL:', initialURL);
          const redirectPath = redirectSystemPath({
            path: initialURL,
            initial: true,
          });
          if (redirectPath !== '/unexpected-error') {
            // Check if it's a message deep link that needs proper navigation history
            const messageMatch = redirectPath.match(
              /^\/student\/(\d+)\/message\/(\d+)$/
            );
            if (messageMatch) {
              const [, studentId, messageId] = messageMatch;
              console.log('Creating navigation history for message deep link');

              // Create proper navigation stack: Home -> Student -> Message
              setTimeout(() => {
                router.replace('/(app)/(tabs)/(home)'); // Start from home
                setTimeout(() => {
                  router.push(`/student/${studentId}`); // Push student page
                  setTimeout(() => {
                    router.push(`/student/${studentId}/message/${messageId}`); // Push message
                  }, 100);
                }, 100);
              }, 1000);
            } else {
              // Check if it's a student page
              const studentMatch = redirectPath.match(/^\/student\/(\d+)$/);
              if (studentMatch) {
                console.log('Creating navigation history for student deep link');
                
                // Create proper navigation stack: Home -> Student
                setTimeout(() => {
                  router.replace('/(app)/(tabs)/(home)'); // Start from home
                  setTimeout(() => {
                    router.push(redirectPath as any); // Push student page
                  }, 100);
                }, 1000);
              } else {
                // For other deep links, navigate directly
                setTimeout(() => {
                  router.replace(redirectPath as any);
                }, 1000);
              }
            }
          }
        }
      } catch (error) {
        console.error('Error handling initial URL:', error);
      }
    };

    handleInitialURL();

    // Handle deep links when app is already running
    const subscription = Linking.addEventListener('url', ({ url }) => {
      console.log('Deep link received:', url);
      const redirectPath = redirectSystemPath({
        path: url,
        initial: false,
      });

      if (redirectPath !== '/unexpected-error') {
        // Check if it's a message deep link that needs proper navigation history
        const messageMatch = redirectPath.match(
          /^\/student\/(\d+)\/message\/(\d+)$/
        );
        if (messageMatch) {
          const [, studentId, messageId] = messageMatch;
          console.log(
            'Creating navigation history for runtime message deep link'
          );

          // Replace current screen with student page, then push message
          router.replace(`/student/${studentId}`);
          // Small delay to ensure student page is loaded
          setTimeout(() => {
            router.push(`/student/${studentId}/message/${messageId}`);
          }, 50);
        } else {
          // Check if it's a student page (not message)
          const studentMatch = redirectPath.match(/^\/student\/(\d+)$/);
          if (studentMatch) {
            console.log('Deep link to student page, using replace');
            router.replace(redirectPath as any);
          } else {
            // For other deep links, navigate directly
            router.push(redirectPath as any);
          }
        }
      }
    });

    return () => subscription.remove();
  }, []);

  const memoizedTheme = React.useMemo(
    () => ({ ...theme, mode: themeMode }),
    [themeMode]
  );

  return (
    <RootSiblingParent>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SQLiteProvider
          databaseName='maria.db'
          assetSource={{ assetId: require('../assets/database/maria.db') }}
        >
          <ThemeProvider theme={memoizedTheme}>
            <StatusBarBackground>
              {/* Global status bar with blue background */}
              <StatusBar
                style='light'
                backgroundColor={themeMode === 'dark' ? '#1A4AAC' : '#3B81F6'}
                translucent={false}
              />
              <NetworkProvider>
                <I18nProvider>
                  <AppWithNotifications />
                </I18nProvider>
              </NetworkProvider>
            </StatusBarBackground>
          </ThemeProvider>
        </SQLiteProvider>
      </GestureHandlerRootView>
    </RootSiblingParent>
  );
}
