import React from 'react';
import { useStorageState } from '@/hooks/useStorageState';
import { router } from 'expo-router';
import { Session } from '@/constants/types';
import { useSQLiteContext } from 'expo-sqlite';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { registerForPushNotificationsAsync } from '@/utils/utils';
import { ICountry } from 'react-native-international-phone-number';

const AuthContext = React.createContext<{
  signIn: (
    country: ICountry | null,
    phoneNumber: string,
    password: string
  ) => Promise<any>;
  signOut: () => void;
  session?: string | null;
  refreshToken: () => void;
  setSession: (session: string | null) => void;
  isLoading: boolean;
}>({
  signIn: () => new Promise(() => null),
  signOut: () => null,
  session: null,
  refreshToken: () => null,
  setSession: () => null,
  isLoading: false,
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
  const db = useSQLiteContext();
  const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
  return (
    <AuthContext.Provider
      value={{
        signIn: async (country, phoneNumber, password) => {
          phoneNumber = phoneNumber.startsWith('0')
            ? phoneNumber.slice(1)
            : phoneNumber;
          await AsyncStorage.setItem('phoneNumber', phoneNumber);
          await AsyncStorage.setItem('country', JSON.stringify(country));
          await AsyncStorage.setItem('password', password);
          try {
            await registerForPushNotificationsAsync().then(async token => {
              const response = await fetch(`${apiUrl}/login`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  phone_number:
                    country?.callingCode + phoneNumber.replaceAll(' ', ''),
                  password,
                  token,
                }),
              });
              if (response.status === 403) {
                await AsyncStorage.setItem('phoneNumber', phoneNumber);
                await AsyncStorage.setItem('temp_password', password);
                return router.push('/new-psswd');
              }
              if (!response.ok) {
                const errorData = await response.json();
                throw Error(errorData.error || 'Internal server error');
              }
              const data: Session = await response.json();
              setSession(data.access_token);
              await AsyncStorage.setItem('refresh_token', data.refresh_token);
              await db.runAsync(
                'INSERT INTO user (given_name, family_name, phone_number, email) VALUES ($given_name, $family_name, $phone_number, $email)',
                [
                  data.user.given_name,
                  data.user.family_name,
                  data.user.phone_number,
                  data.user.email,
                ]
              );
              router.replace('/');
            });
          } catch (error) {
            console.error('Error during sign in:', error);
            if (error instanceof Error) {
              throw error;
            } else {
              console.error('An unknown error occurred');
            }
          }
        },
        refreshToken: async () => {
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
                await db.execAsync('DELETE FROM user');
                await db.execAsync('DELETE FROM student');
                await db.execAsync('DELETE FROM message');
              } catch (error) {
                console.error('Error during sign out:', error);
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
            await db.execAsync('DELETE FROM user');
            await db.execAsync('DELETE FROM student');
            await db.execAsync('DELETE FROM message');

            const refreshToken = await AsyncStorage.getItem('refresh_token');
            if (refreshToken) {
              await fetch(`${apiUrl}/revoke`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refresh_token: refreshToken }),
              });
            }

            // Clear AsyncStorage
            await AsyncStorage.removeItem('phoneNumber');
            await AsyncStorage.removeItem('country');
            await AsyncStorage.removeItem('password');
            await AsyncStorage.removeItem('refresh_token');
          } catch (error) {
            console.error('Error during sign out:', error);
          } finally {
            setSession(null);
          }
        },
        session,
        setSession,
        isLoading,
      }}
    >
      {props.children}
    </AuthContext.Provider>
  );
}
