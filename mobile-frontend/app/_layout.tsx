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
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  redirectSystemPath,
  getNavigationPathForSingleStudent,
} from '../native-intent';

// Set up the notification handler BEFORE the app starts
setupNotificationHandler();

export default function Root() {
  const [themeMode, setThemeMode] = React.useState<'light' | 'dark'>('light');
  const [isDeepLinkNavigating, setIsDeepLinkNavigating] = React.useState(false);
  const [appStartTime] = React.useState(() => Date.now());
  const [hasProcessedInitialUrl, setHasProcessedInitialUrl] =
    React.useState(false);
  const [processedInitialUrl, setProcessedInitialUrl] = React.useState<
    string | null
  >(null);

  // Protection mechanism: reset loading state after 5 seconds
  React.useEffect(() => {
    if (isDeepLinkNavigating) {
      const fallbackTimer = setTimeout(() => {
        console.warn('Fallback: Resetting navigation state after timeout');
        setIsDeepLinkNavigating(false);
      }, 5000);

      return () => clearTimeout(fallbackTimer);
    }
  }, [isDeepLinkNavigating]);

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
    // Helper function to determine if this should be treated as an initial deep link
    const isEffectivelyInitial = (
      receivedTime: number,
      providedInitial: boolean
    ): boolean => {
      // If it's already marked as initial, trust that
      if (providedInitial) return true;

      // If we haven't processed any initial URL yet and this comes within 2 seconds of app start,
      // treat it as initial (this handles iOS jduapp:// scheme issue)
      if (!hasProcessedInitialUrl && receivedTime - appStartTime < 2000) {
        console.log('Treating early addEventListener URL as initial');
        return true;
      }

      return false;
    };

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
      originalUrl?: string,
      receivedTime: number = Date.now()
    ) => {
      // Prevent duplicate processing of the same initial URL
      if (isInitial && originalUrl) {
        if (processedInitialUrl === originalUrl) {
          console.log(
            'Skipping duplicate initial URL processing:',
            originalUrl
          );
          return;
        }
        setProcessedInitialUrl(originalUrl);
      }

      // Determine effective initial state
      const effectivelyInitial = isEffectivelyInitial(receivedTime, isInitial);

      console.log(
        `Handling navigation to: ${redirectPath} (provided initial: ${isInitial}, effectively initial: ${effectivelyInitial})`
      );

      // Mark that we've processed an initial URL to prevent future false positives
      if (effectivelyInitial) {
        setHasProcessedInitialUrl(true);
      }

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
        const delay = effectivelyInitial ? 50 : 0;
        setTimeout(() => {
          // For message links
          const messageMatch = optimizedPath.match(
            /^\/student\/(\d+)\/message\/(\d+)$/
          );
          if (messageMatch) {
            const [, studentId, messageId] = messageMatch;

            // Validate student and message IDs
            if (
              !studentId ||
              !messageId ||
              isNaN(Number(studentId)) ||
              isNaN(Number(messageId))
            ) {
              console.error('Invalid studentId or messageId:', {
                studentId,
                messageId,
              });
              setIsDeepLinkNavigating(false);
              return;
            }

            console.log('Single student: Creating navigation for message');

            if (effectivelyInitial) {
              // App starting fresh - safe full stack creation
              console.log(
                'Fresh app start: Creating Student → Message history safely'
              );
              // Hide interface during navigation
              setIsDeepLinkNavigating(true);

              try {
                // First we switch to the student and wait for completion
                router.replace(`/student/${studentId}`);

                // Wait a bit to ensure navigation is processed
                setTimeout(() => {
                  router.push(`/student/${studentId}/message/${messageId}`);

                  // Show interface shortly after navigation
                  setTimeout(() => {
                    setIsDeepLinkNavigating(false);
                  }, 100);
                }, 100);
              } catch (error) {
                console.error('Navigation error:', error);
                // Fallback: show interface even on error
                setIsDeepLinkNavigating(false);
              }
            } else {
              // App already running - different logic for HTTPS vs dev schemes
              if (isHttpsDeepLink) {
                // HTTPS: create navigation history for running app
                console.log(
                  'HTTPS app running: Creating navigation history for message'
                );

                try {
                  // Create history for HTTPS when app is running
                  router.replace(`/student/${studentId}`);

                  // Small delay, then navigate to message
                  setTimeout(() => {
                    router.push(`/student/${studentId}/message/${messageId}`);
                  }, 50);
                } catch (error) {
                  console.error(
                    'HTTPS navigation error in running app:',
                    error
                  );
                  // Fallback: direct navigation on error
                  router.replace(
                    `/student/${studentId}/message/${messageId}` as any
                  );
                }
              } else {
                // Dev schemes (jduapp): direct navigation without extra pages
                console.log(
                  'Dev scheme app running: Direct navigation to message'
                );
                router.replace(
                  `/student/${studentId}/message/${messageId}` as any
                );
              }
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
        // But for dev schemes use smaller delay
        const delay = effectivelyInitial ? (isHttpsDeepLink ? 1000 : 50) : 0;

        // For all schemes when app is closed, hide interface during navigation
        if (effectivelyInitial) {
          setIsDeepLinkNavigating(true);
        }

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
            // Dev schemes (exp, jduapp): Different logic for closed/open app
            if (effectivelyInitial) {
              // App closed: create full navigation history Home → Student → Message
              console.log(
                'Dev scheme (app closed): Creating full navigation stack Home → Student → Message'
              );
              router.replace('/');

              setTimeout(() => {
                router.push(`/student/${studentId}`);

                setTimeout(() => {
                  router.push(`/student/${studentId}/message/${messageId}`);
                  // Show interface after navigation completion
                  setTimeout(() => {
                    setIsDeepLinkNavigating(false);
                  }, 100);
                }, 100);
              }, 50);
            } else {
              // App open: direct navigation Student → Message
              console.log(
                'Dev scheme (app open): Creating Student → Message navigation'
              );
              router.replace(`/student/${studentId}`);

              setTimeout(() => {
                router.push(`/student/${studentId}/message/${messageId}`);
              }, 100);
            }
          }
        }, delay);
      } else {
        // Check if it's a student page (not message)
        const studentMatch = redirectPath.match(/^\/student\/(\d+)$/);
        if (studentMatch) {
          console.log('Deep link to student page');
          const delay = effectivelyInitial ? 1000 : 0;
          setTimeout(() => {
            if (isHttpsDeepLink) {
              // HTTPS: Create proper stack Home → Student
              console.log('HTTPS deep link: Creating Home → Student stack');
              router.replace('/');
              setTimeout(() => {
                router.push(redirectPath as any);
              }, 50);
            } else {
              // Dev schemes: Different logic for closed/open app
              if (effectivelyInitial) {
                // App closed: create navigation history Home → Student
                console.log(
                  'Dev scheme (app closed): Creating Home → Student stack'
                );
                router.replace('/');
                setTimeout(() => {
                  router.push(redirectPath as any);
                }, 50);
              } else {
                // App open: direct navigation to student
                console.log(
                  'Dev scheme (app open): Direct navigation to student'
                );
                router.replace(redirectPath as any);
              }
            }
          }, delay);
        } else {
          // For other deep links, navigate directly
          const delay = effectivelyInitial ? 1000 : 0;
          const navigationMethod = effectivelyInitial
            ? router.replace
            : router.push;
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
            handleNavigation(redirectPath, true, initialURL, appStartTime);
          }
        }
      } catch (error) {
        console.error('Error handling initial URL:', error);
      }
    };

    handleInitialURL();

    // Handle deep links when app is already running
    const subscription = Linking.addEventListener('url', ({ url }) => {
      const receivedTime = Date.now();
      console.log('Deep link received:', url, 'at time:', receivedTime);
      const redirectPath = redirectSystemPath({
        path: url,
        initial: false,
      });

      if (redirectPath !== '/unexpected-error') {
        handleNavigation(redirectPath, false, url, receivedTime);
      }
    });

    return () => subscription.remove();
  }, [appStartTime, hasProcessedInitialUrl, processedInitialUrl]);

  const memoizedTheme = React.useMemo(
    () => ({ ...theme, mode: themeMode }),
    [themeMode]
  );

  return (
    <RootSiblingParent>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
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
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </RootSiblingParent>
  );
}
