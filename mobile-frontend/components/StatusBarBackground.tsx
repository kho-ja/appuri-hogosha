import React from 'react';
import { View, Platform, Dimensions, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@rneui/themed';

interface StatusBarBackgroundProps {
  children?: React.ReactNode;
}

export function StatusBarBackground({ children }: StatusBarBackgroundProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = Dimensions.get('window');

  // Status bar background colors
  const statusBarBackgroundColor = theme.mode === 'dark' ? '#1A4AAC' : '#3B81F6';

  return (
    <View style={{ flex: 1 }}>
      {/* Status Bar Background for both iOS and Android */}
      {Platform.OS === 'ios' ? (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            width: width,
            height: insets.top,
            backgroundColor: statusBarBackgroundColor,
            zIndex: 9999,
          }}
        />
      ) : null}
      {children}
    </View>
  );
}
