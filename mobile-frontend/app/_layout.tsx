import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { RootSiblingParent } from 'react-native-root-siblings';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SQLiteProvider } from 'expo-sqlite';
import { SessionProvider } from '@/contexts/auth-context';
import { ThemeProvider, useThemeMode } from '@rneui/themed';
import { NetworkProvider } from '@/contexts/network-context';
import { I18nProvider } from '@/contexts/i18n-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme } from '@/constants/theme';
import { setupNotificationHandler } from '@/utils/notifications';
import AppWithNotifications from './AppWithNotifications';

// Set up the notification handler BEFORE the app starts
setupNotificationHandler();

// Component that manages status bar based on theme
function StatusBarManager() {
  const { mode } = useThemeMode();

  return (
    <StatusBar
      style={mode === 'dark' ? 'light' : 'dark'}
      backgroundColor={mode === 'dark' ? '#151718' : '#ffffff'}
    />
  );
}

export default function Root() {
  const [themeMode, setThemeMode] = React.useState<'light' | 'dark'>('light');

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

  const memoizedTheme = React.useMemo(
    () => ({ ...theme, mode: themeMode }),
    [themeMode]
  );

  return (
    <RootSiblingParent>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SQLiteProvider
          databaseName='maria.db'
          assetSource={{ assetId: require('../assets/database/maria.db') }}
        >
          <SessionProvider>
            <ThemeProvider theme={memoizedTheme}>
              <StatusBarManager />
              <NetworkProvider>
                <I18nProvider>
                  <AppWithNotifications />
                </I18nProvider>
              </NetworkProvider>
            </ThemeProvider>
          </SessionProvider>
        </SQLiteProvider>
      </GestureHandlerRootView>
    </RootSiblingParent>
  );
}
