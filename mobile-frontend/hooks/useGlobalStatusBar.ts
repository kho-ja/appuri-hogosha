import { StatusBar, Platform } from 'react-native';
import { useTheme } from '@rneui/themed';
import { useFocusEffect } from '@react-navigation/native';

export function useGlobalStatusBar() {
  const { theme } = useTheme();

  useFocusEffect(() => {
    // This runs whenever any screen comes into focus
    if (Platform.OS === 'android') {
      StatusBar.setBarStyle(
        theme.mode === 'dark' ? 'light-content' : 'dark-content',
        true
      );
      StatusBar.setBackgroundColor('transparent', true);
      StatusBar.setTranslucent(true);
    } else if (Platform.OS === 'ios') {
      StatusBar.setBarStyle(
        theme.mode === 'dark' ? 'light-content' : 'dark-content',
        true
      );
    }
  });
}
