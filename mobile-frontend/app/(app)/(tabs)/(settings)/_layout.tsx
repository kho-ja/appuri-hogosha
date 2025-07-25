import { Stack } from 'expo-router';
import React, { useContext } from 'react';
import { I18nContext } from '@/contexts/i18n-context';

const Layout = () => {
  const { language, i18n } = useContext(I18nContext);

  return (
    <Stack>
      <Stack.Screen name='settings' options={{ headerShown: false }} />
      <Stack.Screen
        name='change-psswd'
        options={{
          headerTitle: i18n[language].changePassword,
          headerTitleAlign: 'center',
        }}
      />
    </Stack>
  );
};

export default Layout;
