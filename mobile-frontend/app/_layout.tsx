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
import { View } from 'react-native';
import {
  redirectSystemPath,
  getNavigationPathForSingleStudent,
} from '../native-intent';

// Set up the notification handler BEFORE the app starts
setupNotificationHandler();

export default function Root() {
  const [themeMode, setThemeMode] = React.useState<'light' | 'dark'>('light');
  const [isDeepLinkNavigating, setIsDeepLinkNavigating] = React.useState(false);

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
    // Helper function to get student count from AsyncStorage
    const getStudentInfo = async (): Promise<{
      count: number;
      firstStudentId?: number;
    }> => {
      try {
        const studentsData = await AsyncStorage.getItem('students');
        if (studentsData) {
          const students = JSON.parse(studentsData);
          return {
            count: students.length,
            firstStudentId: students.length === 1 ? students[0].id : undefined,
          };
        }
      } catch (error) {
        console.error('Error getting student info:', error);
      }
      return { count: 0 };
    };

    // Helper function to handle navigation with proper history
    const handleNavigation = async (
      redirectPath: string,
      isInitial: boolean = false,
      originalUrl?: string
    ) => {
      console.log(
        `Handling navigation to: ${redirectPath} (initial: ${isInitial})`
      );

      const studentInfo = await getStudentInfo();
      console.log('Student info:', studentInfo);

      // Special logic for single student
      if (studentInfo.count === 1 && studentInfo.firstStudentId) {
        // Set deep link flag to prevent auto-navigation in StudentSelector
        await AsyncStorage.setItem('isDeepLinkNavigation', 'true');

        const optimizedPath = getNavigationPathForSingleStudent(
          redirectPath,
          studentInfo.firstStudentId
        );
        console.log('Single student optimized path:', optimizedPath);

        // Determine if this is an HTTPS deep link vs dev schemes
        const isHttpsDeepLink = originalUrl?.startsWith('https://');

        // For single student, different logic for HTTPS vs dev schemes
        const delay = isInitial ? 50 : 0; // Уменьшаем задержку для начального запуска
        setTimeout(() => {
          // For message links
          const messageMatch = optimizedPath.match(
            /^\/student\/(\d+)\/message\/(\d+)$/
          );
          if (messageMatch) {
            const [, studentId, messageId] = messageMatch;
            console.log('Single student: Creating navigation for message');

            if (isInitial) {
              // App starting fresh - мгновенное создание истории
              console.log(
                'Fresh app start: Creating Student → Message history instantly'
              );
              // Скрываем интерфейс во время навигации
              setIsDeepLinkNavigating(true);
              // Мгновенно создаем историю без видимых переходов
              router.replace(`/student/${studentId}`);
              // Сразу же переходим к сообщению (без задержки)
              router.push(`/student/${studentId}/message/${messageId}`);
              // Показываем интерфейс после навигации
              setTimeout(() => {
                setIsDeepLinkNavigating(false);
              }, 50);
            } else {
              // App already running - direct navigation to avoid extra pages
              console.log('App running: Direct navigation to message');
              router.replace(
                `/student/${studentId}/message/${messageId}` as any
              );
            }
          } else {
            // For student pages
            const studentMatch = optimizedPath.match(/^\/student\/(\d+)$/);
            if (studentMatch) {
              if (isHttpsDeepLink) {
                console.log(
                  'HTTPS single student: Simple navigation to student page'
                );
                // For HTTPS, direct navigation to avoid complex history
                router.replace(optimizedPath as any);
              } else {
                console.log(
                  'Dev scheme single student: Creating history for student page'
                );
                // For dev schemes, for single student: direct to student page
                // because student page IS the home for single student
                router.replace(optimizedPath as any);
              }
            } else {
              // For other links, navigate directly
              console.log('Single student: Direct navigation');
              router.replace(optimizedPath as any);
            }
          }
        }, delay);
        return;
      }

      // Original logic for multiple students
      // Determine if this is an HTTPS deep link (production) vs dev schemes
      const isHttpsDeepLink = originalUrl?.startsWith('https://');

      // Check if it's a message deep link that needs proper navigation history
      const messageMatch = redirectPath.match(
        /^\/student\/(\d+)\/message\/(\d+)$/
      );
      if (messageMatch) {
        const [, studentId, messageId] = messageMatch;
        console.log('Creating navigation history for message deep link');

        // For initial URLs, add a longer delay to ensure app is fully loaded
        const delay = isInitial ? 1000 : 0;

        setTimeout(() => {
          if (isHttpsDeepLink) {
            // HTTPS deep links: Create full navigation stack Home → Student → Message
            console.log('HTTPS deep link: Creating full navigation stack');
            router.replace('/');

            setTimeout(() => {
              router.push(`/student/${studentId}`);

              setTimeout(() => {
                router.push(`/student/${studentId}/message/${messageId}`);
              }, 100);
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
        const studentMatch = redirectPath.match(/^\/student\/(\d+)$/);
        if (studentMatch) {
          console.log('Deep link to student page');
          const delay = isInitial ? 1000 : 0;
          setTimeout(() => {
            if (isHttpsDeepLink) {
              // HTTPS: Create proper stack Home → Student
              console.log('HTTPS deep link: Creating Home → Student stack');
              router.replace('/');
              setTimeout(() => {
                router.push(redirectPath as any);
              }, 50);
            } else {
              // Dev schemes: Direct replace
              console.log('Dev scheme: Direct replace to student');
              router.replace(redirectPath as any);
            }
          }, delay);
        } else {
          // For other deep links, navigate directly
          const delay = isInitial ? 1000 : 0;
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
                  {isDeepLinkNavigating ? (
                    <View
                      style={{
                        flex: 1,
                        backgroundColor:
                          themeMode === 'dark' ? '#1A4AAC' : '#3B81F6',
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}
                    >
                      {/* Empty screen during navigation */}
                    </View>
                  ) : (
                    <AppWithNotifications />
                  )}
                </I18nProvider>
              </NetworkProvider>
            </StatusBarBackground>
          </ThemeProvider>
        </SQLiteProvider>
      </GestureHandlerRootView>
    </RootSiblingParent>
  );
}
