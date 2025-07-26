import { StatusBar, Platform } from 'react-native';
import { useTheme } from '@rneui/themed';
import { useFocusEffect } from '@react-navigation/native';

export function useGlobalStatusBar() {
  const { theme } = useTheme();

  useFocusEffect(() => {
    // This runs whenever any screen comes into focus
    if (Platform.OS === 'android') {
      StatusBar.setBarStyle('light-content', true);
      StatusBar.setBackgroundColor(
        theme.mode === 'dark' ? '#1A4AAC' : '#3B81F6',
        true
      );
      StatusBar.setTranslucent(false);
    } else if (Platform.OS === 'ios') {
      StatusBar.setBarStyle('light-content', true);
    }
  });
}
