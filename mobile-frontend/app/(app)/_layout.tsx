import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React from 'react';
import 'react-native-reanimated';
import { useThemeMode } from '@rneui/themed';
import { MessageProvider } from '@/contexts/message-context';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { mode } = useThemeMode(); // Use @rneui/themed mode
  const [loaded] = useFonts({
    SpaceMono: require('../../assets/fonts/SpaceMono-Regular.ttf'),
  });

  React.useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <ThemeProvider value={mode === 'dark' ? DarkTheme : DefaultTheme}>
      <MessageProvider>
        <Stack initialRouteName='(tabs)'>
          <Stack.Screen name='(tabs)' options={{ headerShown: false }} />
        </Stack>
      </MessageProvider>
    </ThemeProvider>
  );
}
