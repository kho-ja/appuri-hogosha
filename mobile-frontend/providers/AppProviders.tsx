import React from 'react';
import { View } from 'react-native';
import { RootSiblingParent } from 'react-native-root-siblings';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SQLiteProvider } from 'expo-sqlite';
import { ThemeProvider } from '@rneui/themed';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NetworkProvider } from '@/contexts/network-context';
import { I18nProvider } from '@/contexts/i18n-context';
import {
  ThemeModeProvider,
  useThemeModeContext,
} from '@/contexts/theme-context';
import { StatusBarBackground } from '@/components/StatusBarBackground';
import { theme } from '@/constants/theme';
import { migrateDbIfNeeded } from '@/lib/database-migrations';
import AppWithNotifications from '@/app/AppWithNotifications';

function ThemedApp() {
  const { themeMode } = useThemeModeContext();
  const memoizedTheme = React.useMemo(
    () => ({ ...theme, mode: themeMode }),
    [themeMode]
  );

  return (
    <ThemeProvider theme={memoizedTheme}>
      <AppWithNotifications />
    </ThemeProvider>
  );
}

function InnerProviders({
  isDeepLinkNavigating,
}: {
  isDeepLinkNavigating: boolean;
}) {
  const { themeMode } = useThemeModeContext();

  return (
    <StatusBarBackground isDark={themeMode === 'dark'}>
      <NetworkProvider>
        <I18nProvider>
          {isDeepLinkNavigating ? (
            <View
              style={{
                flex: 1,
                backgroundColor: themeMode === 'dark' ? '#1A4AAC' : '#3B81F6',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            />
          ) : (
            <ThemedApp />
          )}
        </I18nProvider>
      </NetworkProvider>
    </StatusBarBackground>
  );
}

export function AppProviders({
  isDeepLinkNavigating,
}: {
  isDeepLinkNavigating: boolean;
}) {
  return (
    <RootSiblingParent>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <SQLiteProvider
            databaseName='maria.db'
            assetSource={{ assetId: require('../assets/database/maria.db') }}
            onInit={migrateDbIfNeeded}
          >
            <ThemeModeProvider>
              <InnerProviders isDeepLinkNavigating={isDeepLinkNavigating} />
            </ThemeModeProvider>
          </SQLiteProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </RootSiblingParent>
  );
}
