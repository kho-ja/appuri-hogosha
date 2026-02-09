import React from 'react';
import { View, Platform, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { headerBg } from '@/constants/Colors';

interface StatusBarBackgroundProps {
  children?: React.ReactNode;
  isDark?: boolean;
}

export function StatusBarBackground({
  children,
  isDark = false,
}: StatusBarBackgroundProps) {
  const insets = useSafeAreaInsets();

  const bgColor = headerBg(isDark ? 'dark' : 'light');
  const statusBarHeight = insets.top || (Platform.OS === 'ios' ? 44 : 25);

  React.useEffect(() => {
    // For both platforms
    StatusBar.setBarStyle('light-content', true);

    if (Platform.OS === 'android') {
      StatusBar.setBackgroundColor(bgColor, true);
    }
  }, [bgColor, isDark]);

  return (
    <View style={{ flex: 1 }}>
      {/* iOS: render colored bar at top */}
      {Platform.OS === 'ios' && (
        <View
          style={{
            width: '100%',
            height: statusBarHeight,
            backgroundColor: bgColor,
          }}
        />
      )}
      {children}
    </View>
  );
}
