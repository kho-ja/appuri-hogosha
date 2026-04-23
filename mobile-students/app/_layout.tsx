import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import React from 'react';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ThemeProvider as RNEThemeProvider } from '@rneui/themed';
import { I18nProvider } from '@/contexts/i18n-context';
import { ThemeModeProvider, useThemeModeContext } from '@/contexts/theme-context';
import { FontSizeProvider } from '@/contexts/FontSizeContext';
import { SessionProvider } from '@/contexts/auth-context';
import { SQLiteProvider } from 'expo-sqlite';
import { theme } from '@/constants/rneui-theme';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RootSiblingParent } from 'react-native-root-siblings';

const queryClient = new QueryClient();

export const unstable_settings = {
  initialRouteName: 'sign-in',
  anchor: 'sign-in',
};

export default function RootLayout() {
  return (
    <RootSiblingParent>
      <QueryClientProvider client={queryClient}>
        <SQLiteProvider databaseName="dummy.db">
          <SessionProvider>
            <ThemeModeProvider>
              <FontSizeProvider>
                <I18nProvider>
                  <ThemedApp />
                </I18nProvider>
              </FontSizeProvider>
            </ThemeModeProvider>
          </SessionProvider>
        </SQLiteProvider>
      </QueryClientProvider>
    </RootSiblingParent>
  );
}

function ThemedApp() {
  const colorScheme = useColorScheme();
  const { themeMode } = useThemeModeContext();
  const memoizedTheme = React.useMemo(
    () => ({ ...theme, mode: themeMode }),
    [themeMode]
  );

  return (
    <RNEThemeProvider theme={memoizedTheme}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="sign-in" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </RNEThemeProvider>
  );
}
