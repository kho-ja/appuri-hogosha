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
import {
  redirectSystemPath,
  getNavigationPathForSingleStudent,
} from '../native-intent';

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
    // Helper function to handle navigation with proper history
    const handleNavigation = (
      redirectPath: string,
      isInitial: boolean = false,
      originalUrl?: string
    ) => {
      console.log(
        `Handling navigation to: ${redirectPath} (initial: ${isInitial})`
      );

      // Check if it's a message deep link that needs proper navigation history
      const messageMatch = redirectPath.match(
        /^\/student\/(\d+)\/message\/(\d+)$/
      );
      if (messageMatch) {
        const [, studentId, messageId] = messageMatch;
        console.log('Creating navigation history for message deep link');

        // For initial URLs, add a longer delay to ensure app is fully loaded
        const delay = isInitial ? 1500 : 0;

        setTimeout(async () => {
          try {
            const studentsCount = await AsyncStorage.getItem('students_count');

            if (studentsCount && parseInt(studentsCount) > 1) {
              console.log(
                'Multiple students: Creating Home → Student → Message navigation'
              );
              // Create full navigation history: Home → Student → Message
              router.replace('/');

              setTimeout(() => {
                router.push(`/student/${studentId}`);

                setTimeout(() => {
                  router.push(`/student/${studentId}/message/${messageId}`);
                }, 200);
              }, 300);
            } else {
              console.log(
                'Single student: Creating Student → Message navigation'
              );
              // For single student: Student → Message
              router.replace(`/student/${studentId}`);

              setTimeout(() => {
                router.push(`/student/${studentId}/message/${messageId}`);
              }, 300);
            }
          } catch (error) {
            console.error('Error in message navigation:', error);
            // Fallback to original logic
            router.replace(`/student/${studentId}`);
            setTimeout(() => {
              router.push(`/student/${studentId}/message/${messageId}`);
            }, 300);
          }
        }, delay);
      } else {
        // Check if it's a student page (not message)
        const studentMatch = redirectPath.match(/^\/student\/(\d+)$/);
        if (studentMatch) {
          console.log('Deep link to student page');
          const delay = isInitial ? 1500 : 0;

          setTimeout(async () => {
            // Check if user has multiple students - create proper navigation history
            try {
              const studentsCount =
                await AsyncStorage.getItem('students_count');

              if (studentsCount && parseInt(studentsCount) > 1) {
                console.log(
                  'Multiple students: Creating Home → Student navigation'
                );
                // First navigate to home, then push student page to create proper history
                router.replace('/');

                setTimeout(() => {
                  router.push(redirectPath as any);
                }, 300);
              } else {
                // Single student or unknown count: direct navigation
                console.log('Single/unknown students: Direct navigation');
                router.replace(redirectPath as any);
              }
            } catch (error) {
              console.error('Error checking student count:', error);
              router.replace(redirectPath as any);
            }
          }, delay);
        } else {
          // For other deep links, navigate directly
          const delay = isInitial ? 1500 : 0;
          const navigationMethod = isInitial ? router.replace : router.push;
          setTimeout(() => {
            navigationMethod(redirectPath as any);
          }, delay);
        }
      }
    };

    // Handle initial URL if app was opened via deep link
    const handleInitialURL = async () => {
      try {
        const initialURL = await Linking.getInitialURL();
        if (initialURL) {
          console.log('App opened with initial URL:', initialURL);

          // Set deeplink flag to prevent auto-navigation
          await AsyncStorage.setItem('is_deeplink_navigation', 'true');

          let redirectPath = redirectSystemPath({
            path: initialURL,
            initial: true,
          });

          // Check if we need to handle single student case
          redirectPath = await getNavigationPathForSingleStudent(redirectPath);

          if (redirectPath !== '/unexpected-error') {
            handleNavigation(redirectPath, true, initialURL);
          }
        }
      } catch (error) {
        console.error('Error handling initial URL:', error);
      }
    };

    handleInitialURL();

    // Handle deep links when app is already running
    const subscription = Linking.addEventListener('url', async ({ url }) => {
      console.log('Deep link received:', url);

      // Set deeplink flag to prevent auto-navigation
      await AsyncStorage.setItem('is_deeplink_navigation', 'true');

      let redirectPath = redirectSystemPath({
        path: url,
        initial: false,
      });

      // Check if we need to handle single student case
      redirectPath = await getNavigationPathForSingleStudent(redirectPath);

      if (redirectPath !== '/unexpected-error') {
        handleNavigation(redirectPath, false, url);
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
