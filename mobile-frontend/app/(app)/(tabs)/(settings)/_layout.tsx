import { Stack } from 'expo-router';
import React, { useContext } from 'react';
import { Platform } from 'react-native';
import { I18nContext } from '@/contexts/i18n-context';
import { useTheme } from '@rneui/themed';

const Layout = () => {
  const { language, i18n } = useContext(I18nContext);
  const { theme } = useTheme();

  return (
    <Stack>
      <Stack.Screen
        name='settings'
        options={{
          title: i18n[language].settings,
          headerStyle: {
            backgroundColor: theme.mode === 'dark' ? '#1A4AAC' : '#3B81F6',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
            fontSize: Platform.OS === 'android' ? 16 : 17,
          },
          headerShadowVisible: false,
          headerTitleAlign: 'center',
        }}
      />
      <Stack.Screen
        name='change-psswd'
        options={{
          headerTitle: i18n[language].changePassword,
          headerTitleAlign: 'center',
          headerStyle: {
            backgroundColor: theme.mode === 'dark' ? '#1A4AAC' : '#3B81F6',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
            fontSize: Platform.OS === 'android' ? 16 : 17,
          },
          headerShadowVisible: false,
        }}
      />
    </Stack>
  );
};

export default Layout;
