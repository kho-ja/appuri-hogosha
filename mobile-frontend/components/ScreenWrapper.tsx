import React from 'react';
import { View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@rneui/themed';
import { useGlobalStatusBar } from '@/hooks/useGlobalStatusBar';

interface ScreenWrapperProps {
  children: React.ReactNode;
  style?: ViewStyle;
  fullscreen?: boolean; // For camera screens
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
}

export function ScreenWrapper({
  children,
  style,
  fullscreen = false,
  edges = ['top', 'left', 'right', 'bottom'],
}: ScreenWrapperProps) {
  const { theme } = useTheme();

  // Automatically handle status bar for all screens
  useGlobalStatusBar();

  if (fullscreen) {
    // For camera screens - no safe area
    return (
      <View
        style={[{ flex: 1, backgroundColor: theme.colors.background }, style]}
      >
        {children}
      </View>
    );
  }

  return (
    <SafeAreaView
      style={[{ flex: 1, backgroundColor: theme.colors.background }, style]}
      edges={edges}
    >
      {children}
    </SafeAreaView>
  );
}
