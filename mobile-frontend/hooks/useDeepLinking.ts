import React from 'react';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  redirectSystemPath,
  getNavigationPathForSingleStudent,
} from '../native-intent';

interface DeepLinkState {
  isDeepLinkNavigating: boolean;
}

async function getStudentInfo(): Promise<{
  count: number;
  firstStudentId?: number;
}> {
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
}

export function useDeepLinking(): DeepLinkState {
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
    const isEffectivelyInitial = (
      receivedTime: number,
      providedInitial: boolean
    ): boolean => {
      if (providedInitial) return true;

      if (!hasProcessedInitialUrl && receivedTime - appStartTime < 2000) {
        console.log('Treating early addEventListener URL as initial');
        return true;
      }

      return false;
    };

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

      const effectivelyInitial = isEffectivelyInitial(receivedTime, isInitial);

      console.log(
        `Handling navigation to: ${redirectPath} (provided initial: ${isInitial}, effectively initial: ${effectivelyInitial})`
      );

      if (effectivelyInitial) {
        setHasProcessedInitialUrl(true);
      }

      const studentInfo = await getStudentInfo();
      console.log('Student info:', studentInfo);

      // Special logic for single student
      if (studentInfo.count === 1 && studentInfo.firstStudentId) {
        await handleSingleStudentNavigation(
          redirectPath,
          studentInfo.firstStudentId,
          effectivelyInitial,
          originalUrl
        );
        return;
      }

      // Multiple students logic
      handleMultiStudentNavigation(
        redirectPath,
        effectivelyInitial,
        originalUrl
      );
    };

    const handleSingleStudentNavigation = async (
      redirectPath: string,
      firstStudentId: number,
      effectivelyInitial: boolean,
      originalUrl?: string
    ) => {
      await AsyncStorage.setItem('isDeepLinkNavigation', 'true');

      const optimizedPath = getNavigationPathForSingleStudent(
        redirectPath,
        firstStudentId
      );
      console.log('Single student optimized path:', optimizedPath);

      const isHttpsDeepLink = originalUrl?.startsWith('https://');
      const delay = effectivelyInitial ? 50 : 0;

      setTimeout(() => {
        const messageMatch = optimizedPath.match(
          /^\/student\/(\d+)\/message\/(\d+)$/
        );
        if (messageMatch) {
          const [, studentId, messageId] = messageMatch;

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
            console.log(
              'Fresh app start: Creating Student → Message history safely'
            );
            setIsDeepLinkNavigating(true);

            try {
              router.replace(`/student/${studentId}`);
              setTimeout(() => {
                router.push(`/student/${studentId}/message/${messageId}`);
                setTimeout(() => {
                  setIsDeepLinkNavigating(false);
                }, 100);
              }, 100);
            } catch (error) {
              console.error('Navigation error:', error);
              setIsDeepLinkNavigating(false);
            }
          } else if (isHttpsDeepLink) {
            console.log(
              'HTTPS app running: Creating navigation history for message'
            );
            try {
              router.replace(`/student/${studentId}`);
              setTimeout(() => {
                router.push(`/student/${studentId}/message/${messageId}`);
              }, 50);
            } catch (error) {
              console.error('HTTPS navigation error in running app:', error);
              router.replace(
                `/student/${studentId}/message/${messageId}` as any
              );
            }
          } else {
            console.log('Dev scheme app running: Direct navigation to message');
            router.replace(`/student/${studentId}/message/${messageId}` as any);
          }
        } else {
          const studentMatch = optimizedPath.match(/^\/student\/(\d+)$/);
          if (studentMatch) {
            if (isHttpsDeepLink) {
              console.log(
                'HTTPS single student: Simple navigation to student page'
              );
            } else {
              console.log(
                'Dev scheme single student: Creating history for student page'
              );
            }
            router.replace(optimizedPath as any);
          } else {
            console.log('Single student: Direct navigation');
            router.replace(optimizedPath as any);
          }
        }
      }, delay);
    };

    const handleMultiStudentNavigation = (
      redirectPath: string,
      effectivelyInitial: boolean,
      originalUrl?: string
    ) => {
      const isHttpsDeepLink = originalUrl?.startsWith('https://');

      const messageMatch = redirectPath.match(
        /^\/student\/(\d+)\/message\/(\d+)$/
      );
      if (messageMatch) {
        const [, studentId, messageId] = messageMatch;
        console.log('Creating navigation history for message deep link');

        const delay = effectivelyInitial ? (isHttpsDeepLink ? 1000 : 50) : 0;

        if (effectivelyInitial) {
          setIsDeepLinkNavigating(true);
        }

        setTimeout(() => {
          if (isHttpsDeepLink) {
            console.log('HTTPS deep link: Creating full navigation stack');
            router.replace('/');
            setTimeout(() => {
              router.push(`/student/${studentId}`);
              setTimeout(() => {
                router.push(`/student/${studentId}/message/${messageId}`);
              }, 100);
            }, 50);
          } else if (effectivelyInitial) {
            console.log(
              'Dev scheme (app closed): Creating full navigation stack Home → Student → Message'
            );
            router.replace('/');
            setTimeout(() => {
              router.push(`/student/${studentId}`);
              setTimeout(() => {
                router.push(`/student/${studentId}/message/${messageId}`);
                setTimeout(() => {
                  setIsDeepLinkNavigating(false);
                }, 100);
              }, 100);
            }, 50);
          } else {
            console.log(
              'Dev scheme (app open): Creating Student → Message navigation'
            );
            router.replace(`/student/${studentId}`);
            setTimeout(() => {
              router.push(`/student/${studentId}/message/${messageId}`);
            }, 100);
          }
        }, delay);
      } else {
        const studentMatch = redirectPath.match(/^\/student\/(\d+)$/);
        if (studentMatch) {
          console.log('Deep link to student page');
          const delay = effectivelyInitial ? 1000 : 0;
          setTimeout(() => {
            if (isHttpsDeepLink) {
              console.log('HTTPS deep link: Creating Home → Student stack');
              router.replace('/');
              setTimeout(() => {
                router.push(redirectPath as any);
              }, 50);
            } else if (effectivelyInitial) {
              console.log(
                'Dev scheme (app closed): Creating Home → Student stack'
              );
              router.replace('/');
              setTimeout(() => {
                router.push(redirectPath as any);
              }, 50);
            } else {
              console.log(
                'Dev scheme (app open): Direct navigation to student'
              );
              router.replace(redirectPath as any);
            }
          }, delay);
        } else {
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

  return { isDeepLinkNavigating };
}
