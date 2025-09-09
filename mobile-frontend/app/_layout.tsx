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
import { redirectSystemPath, getSmartNavigationPath } from '../native-intent';

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
    const handleNavigation = async (
      redirectPath: string,
      isInitial: boolean = false,
      originalUrl?: string
    ) => {
      console.log(
        `Handling navigation to: ${redirectPath} (initial: ${isInitial})`
      );

      // Apply smart navigation logic for single student scenarios
      const smartPath = await getSmartNavigationPath(redirectPath);
      console.log(`Smart navigation path: ${smartPath}`);

      // Determine if this is an HTTPS deep link (production) vs dev schemes
      const isHttpsDeepLink = originalUrl?.startsWith('https://');

      // Check if it's a message deep link that needs proper navigation history
      const messageMatch = smartPath.match(
        /^\/student\/(\d+)\/message\/(\d+)$/
      );
      if (messageMatch) {
        const [, studentId, messageId] = messageMatch;
        console.log('Creating navigation history for message deep link');

        // For initial URLs, add a longer delay to ensure app is fully loaded
        const delay = isInitial ? 1000 : 0;

        setTimeout(() => {
          if (isHttpsDeepLink) {
            // HTTPS deep links: Check if we have single student
            console.log(
              'HTTPS deep link: Creating navigation stack for message'
            );
            
            // Always start with home, but the auto-navigation logic will handle single student case
            router.replace('/');

            setTimeout(() => {
              // If this was originally a smart path redirect and we have only one student,
              // the home page will auto-navigate to student page, so we just need to push the message
              if (smartPath !== redirectPath) {
                // This means we had smart navigation (single student case)
                console.log('Single student case: Direct message navigation');
                setTimeout(() => {
                  router.push(`/student/${studentId}/message/${messageId}`);
                }, 500); // Give more time for auto-navigation
              } else {
                // Multiple students case: normal flow
                router.push(`/student/${studentId}`);
                setTimeout(() => {
                  router.push(`/student/${studentId}/message/${messageId}`);
                }, 100);
              }
            }, 50);
          } else {
            // Dev schemes (exp, jduapp): Use original logic
            console.log('Dev scheme: Using replace + push logic');
            router.replace(`/student/${studentId}`);

            setTimeout(() => {
              router.push(`/student/${studentId}/message/${messageId}`);
            }, 100);
          }
        }, delay);
      } else {
        // Check if it's a student page (not message)
        const studentMatch = smartPath.match(/^\/student\/(\d+)$/);
        if (studentMatch) {
          console.log('Deep link to student page');
          const delay = isInitial ? 1000 : 0;
          setTimeout(() => {
            if (isHttpsDeepLink) {
              // HTTPS: Create proper stack Home → Student
              console.log('HTTPS deep link: Creating Home → Student stack');
              router.replace('/');
              setTimeout(() => {
                router.push(smartPath as any);
              }, 50);
            } else {
              // Dev schemes: Direct replace
              console.log('Dev scheme: Direct replace to student');
              router.replace(smartPath as any);
            }
          }, delay);
        } else {
          // For other deep links, navigate directly
          const delay = isInitial ? 1000 : 0;
          const navigationMethod = isInitial ? router.replace : router.push;
          setTimeout(() => {
            navigationMethod(smartPath as any);
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
          const redirectPath = redirectSystemPath({
            path: initialURL,
            initial: true,
          });
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
    const subscription = Linking.addEventListener('url', ({ url }) => {
      console.log('Deep link received:', url);
      const redirectPath = redirectSystemPath({
        path: url,
        initial: false,
      });

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
