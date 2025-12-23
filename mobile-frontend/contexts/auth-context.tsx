import React from 'react';
import { useStorageState } from '@/hooks/useStorageState';
import { router } from 'expo-router';
import { Session } from '@/constants/types';
import { useSQLiteContext } from 'expo-sqlite';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { registerForPushNotificationsAsync } from '@/utils/notifications';
import { ICountry } from 'react-native-international-phone-number';
import { useQueryClient } from '@tanstack/react-query';
import DemoModeService from '@/services/demo-mode-service';
import { normalizePhone } from '@/utils/phone';

const AuthContext = React.createContext<{
  signIn: (
    country: ICountry | null,
    phoneNumber: string,
    password?: string
  ) => Promise<any>;
  verifyOtp: (
    country: ICountry | null,
    phoneNumber: string,
    code: string,
    session: string
  ) => Promise<any>;
  signOut: () => void;
  session?: string | null;
  refreshToken: () => void;
  setSession: (session: string | null) => void;
  isLoading: boolean;
  isDemoMode: boolean;
}>({
  signIn: () => new Promise(() => null),
  verifyOtp: () => new Promise(() => null),
  signOut: () => null,
  session: null,
  refreshToken: () => null,
  setSession: () => null,
  isLoading: false,
  isDemoMode: false,
});

export function useSession() {
  const value = React.useContext(AuthContext);
  if (process.env.NODE_ENV !== 'production') {
    if (!value) {
      throw new Error('useSession must be wrapped in a <SessionProvider />');
    }
  }

  return value;
}

export function SessionProvider(props: React.PropsWithChildren) {
  const [[isLoading, session], setSession] = useStorageState('session');
  const [isDemoMode, setIsDemoMode] = React.useState(false);
  const db = useSQLiteContext();
  const queryClient = useQueryClient();
  const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
  const previousSessionRef = React.useRef<string | null>(session);

  // Initialize demo mode state on mount
  React.useEffect(() => {
    const initializeDemoMode = async () => {
      const demoActive = await DemoModeService.isDemoModeActive();
      setIsDemoMode(demoActive);
    };
    initializeDemoMode();
  }, []);

  // Track session changes and invalidate queries when session becomes available after being null
  React.useEffect(() => {
    if (previousSessionRef.current === null && session) {
      // Session just became available after being null - wait longer to ensure student data is loaded
      setTimeout(async () => {
        // Force refetch both messages and students by enabling queries regardless of current state
        await queryClient.refetchQueries({
          queryKey: ['messages'],
          type: 'all', // This forces refetch even for disabled queries
        });
        await queryClient.refetchQueries({
          queryKey: ['students'],
          type: 'all', // This forces refetch even for disabled queries
        });
        console.log(
          '[Auth] Session restored, force refetched message and student queries'
        );
      }, 500); // Increased timeout to allow student data to load
    }
    previousSessionRef.current = session;
  }, [session, queryClient]);

  return (
    <AuthContext.Provider
      value={{
        signIn: async (country, phoneNumber, password) => {
          const fullPhoneNumber = normalizePhone(country, phoneNumber);

          // Check if demo credentials (password-based demo)
          if (
            password &&
            DemoModeService.isDemoCredentials(fullPhoneNumber, password)
          ) {
            // Enable demo mode
            await DemoModeService.enableDemoMode();
            setIsDemoMode(true);

            // Simulate network delay for realistic experience
            await DemoModeService.simulateNetworkDelay();

            // Get demo session data
            const demoSession = DemoModeService.getDemoSessionData();

            // Store demo credentials
            await AsyncStorage.setItem('phoneNumber', phoneNumber);
            await AsyncStorage.setItem('country', JSON.stringify(country));
            await AsyncStorage.setItem('password', password);

            // Set demo session
            setSession(demoSession.access_token);
            await AsyncStorage.setItem(
              'refresh_token',
              demoSession.refresh_token
            );

            // Clear existing user data and insert demo user
            await db.execAsync('DELETE FROM user');
            await db.runAsync(
              'INSERT INTO user (given_name, family_name, phone_number, email) VALUES (?, ?, ?, ?)',
              [
                demoSession.user.given_name,
                demoSession.user.family_name,
                demoSession.user.phone_number,
                demoSession.user.email,
              ]
            );

            router.replace('/');
            return;
          }

          // Check if demo OTP phone (OTP-based demo)
          if (!password && DemoModeService.isDemoOtpPhone(fullPhoneNumber)) {
            // Store demo credentials for OTP flow
            await AsyncStorage.setItem('phoneNumber', phoneNumber);
            await AsyncStorage.setItem('country', JSON.stringify(country));

            // Simulate network delay for realistic experience
            await DemoModeService.simulateNetworkDelay();

            // Return demo session for OTP verification
            const demoSession = DemoModeService.getDemoSessionData();
            return {
              session: demoSession.access_token,
            };
          }

          // Regular authentication flow
          await AsyncStorage.setItem('phoneNumber', phoneNumber);
          await AsyncStorage.setItem('country', JSON.stringify(country));
          if (password) {
            await AsyncStorage.setItem('password', password);
          }
          try {
            // First, check and request push notification permissions
            const token = await registerForPushNotificationsAsync();

            // If we get here, notifications are enabled and we have a token
            // Now proceed with login request
            const response = await fetch(`${apiUrl}/login`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                phone_number: fullPhoneNumber,
                password,
                token,
              }),
            });

            if (response.status === 403) {
              await AsyncStorage.setItem('phoneNumber', phoneNumber);
              if (password)
                await AsyncStorage.setItem('temp_password', password);
              return router.push('/new-psswd');
            }

            if (!response.ok) {
              const errorData = await response.json();
              throw Error(errorData.error || 'Internal server error');
            }

            const data = await response.json();

            // OTP Flow: If session is returned, return it to the caller
            if (data.session) {
              return data;
            }

            // Standard Login Flow
            const sessionData: Session = data;
            setSession(sessionData.access_token);
            await AsyncStorage.setItem(
              'refresh_token',
              sessionData.refresh_token
            );

            // Clear existing user data and insert new
            await db.execAsync('DELETE FROM user');
            await db.runAsync(
              'INSERT INTO user (given_name, family_name, phone_number, email) VALUES (?, ?, ?, ?)',
              [
                data.user.given_name,
                data.user.family_name,
                data.user.phone_number,
                data.user.email,
              ]
            );
            router.replace('/');
          } catch (error) {
            console.error('Error during sign in:', error);
            if (error instanceof Error) {
              // Check if error is related to push notifications
              if (
                error.message.includes('Permission not granted') ||
                error.message.includes('push notification') ||
                error.message.includes('notification')
              ) {
                // Create a custom error for notification permission issues
                const notificationError = new Error(
                  'NOTIFICATION_PERMISSION_DENIED'
                );
                notificationError.name = 'NotificationPermissionError';
                throw notificationError;
              }
              throw error;
            } else {
              throw new Error('An unknown error occurred');
            }
          }
        },
        verifyOtp: async (country, phoneNumber, code, session) => {
          try {
            const fullPhoneNumber = normalizePhone(country, phoneNumber);

            // Check if demo OTP credentials
            if (DemoModeService.isDemoOtpCredentials(fullPhoneNumber, code)) {
              // Enable demo mode
              await DemoModeService.enableDemoMode();
              setIsDemoMode(true);

              // Simulate network delay for realistic experience
              await DemoModeService.simulateNetworkDelay();

              // Get demo session data
              const demoSession = DemoModeService.getDemoSessionData();

              // Set demo session
              setSession(demoSession.access_token);
              await AsyncStorage.setItem(
                'refresh_token',
                demoSession.refresh_token
              );

              // Clear existing user data and insert demo user
              await db.execAsync('DELETE FROM user');
              await db.runAsync(
                'INSERT INTO user (given_name, family_name, phone_number, email) VALUES (?, ?, ?, ?)',
                [
                  demoSession.user.given_name,
                  demoSession.user.family_name,
                  demoSession.user.phone_number,
                  demoSession.user.email,
                ]
              );

              router.replace('/');
              return demoSession;
            }

            // Regular OTP verification flow
            const token = await registerForPushNotificationsAsync();

            const response = await fetch(`${apiUrl}/verify-otp`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                phone_number: fullPhoneNumber,
                code,
                session,
                token,
              }),
            });

            if (!response.ok) {
              const errorData = await response.json();
              throw Error(errorData.error || 'Invalid OTP');
            }

            const data: Session = await response.json();
            setSession(data.access_token);
            await AsyncStorage.setItem('refresh_token', data.refresh_token);

            // Clear existing user data and insert new
            await db.execAsync('DELETE FROM user');
            await db.runAsync(
              'INSERT INTO user (given_name, family_name, phone_number, email) VALUES (?, ?, ?, ?)',
              [
                data.user.given_name,
                data.user.family_name,
                data.user.phone_number,
                data.user.email,
              ]
            );
            router.replace('/');
          } catch (error) {
            console.error('Error verifying OTP:', error);
            throw error;
          }
        },
        refreshToken: async () => {
          // Skip refresh for demo mode
          if (isDemoMode) {
            return;
          }

          try {
            const refreshToken = await AsyncStorage.getItem('refresh_token');
            if (!refreshToken) {
              console.error('No refresh token found');
            }

            const response = await fetch(`${apiUrl}/refresh-token`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                refresh_token: refreshToken,
              }),
            });
            if (!response.ok) {
              try {
                // Clear all cached data
                queryClient.clear();

                await db.execAsync('DELETE FROM user');
                await db.execAsync('DELETE FROM student');
                await db.execAsync('DELETE FROM message');

                // Clear AsyncStorage student cache
                await AsyncStorage.removeItem('students');
                await AsyncStorage.removeItem('studentId');
                await AsyncStorage.removeItem('selectedStudent');
              } catch (error) {
                console.error('Error during token refresh cleanup:', error);
              } finally {
                setSession(null);
              }
            }
            const data: Session = await response.json();
            setSession(data.access_token);
            await AsyncStorage.setItem('refresh_token', data.refresh_token);
          } catch (error) {
            console.error('Error refreshing token:', error);
          }
        },
        signOut: async () => {
          try {
            // Handle demo mode sign out
            if (isDemoMode) {
              await DemoModeService.disableDemoMode();
              setIsDemoMode(false);
            }

            // Clear ALL cached queries to prevent old data from showing
            queryClient.clear();

            // Delete all user-related data from database
            await db.execAsync('DELETE FROM user');
            await db.execAsync('DELETE FROM student');
            await db.execAsync('DELETE FROM message');

            if (!isDemoMode) {
              const refreshToken = await AsyncStorage.getItem('refresh_token');
              if (refreshToken) {
                await fetch(`${apiUrl}/revoke`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ refresh_token: refreshToken }),
                });
              }
            }

            // Clear AsyncStorage
            await AsyncStorage.multiRemove([
              'phoneNumber',
              'country',
              'password',
              'refresh_token',
              'students',
              'studentId',
              'selectedStudent',
              'isDeepLinkNavigation',
            ]);
          } catch (error) {
            console.error('Error during sign out:', error);
          } finally {
            setSession(null);
          }
        },
        session,
        setSession,
        isLoading,
        isDemoMode,
      }}
    >
      {props.children}
    </AuthContext.Provider>
  );
}
