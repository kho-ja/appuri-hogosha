import { Stack } from 'expo-router';
import React from 'react';

const Layout = () => {
  return (
    <Stack>
      <Stack.Screen name='settings' options={{ headerShown: false }} />
      <Stack.Screen
        name='change-psswd'
        options={{ headerTitle: 'Change Password', headerTitleAlign: 'center' }}
      />
    </Stack>
  );
};

export default Layout;
