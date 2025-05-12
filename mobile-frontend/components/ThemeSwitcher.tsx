// components/ThemeSwitcher.tsx
import React, { useContext } from 'react';
import { View, Switch, StyleSheet } from 'react-native';
import { useThemeMode } from '@rneui/themed';
import { ThemedText } from '@/components/ThemedText';
import { Ionicons } from '@expo/vector-icons';
import { I18nContext } from '@/contexts/i18n-context';

export default function ThemeSwitcher() {
  const { mode, setMode } = useThemeMode();
  const { language, i18n, setLanguage } = useContext(I18nContext);

  const toggleTheme = () => {
    setMode(mode === 'light' ? 'dark' : 'light');
  };

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Ionicons
          name={mode === 'light' ? 'sunny' : 'moon'}
          size={20}
          color='#fff'
        />
      </View>
      <ThemedText style={styles.label}>
        {mode === 'light' ? i18n[language].lightMode : i18n[language].darkMode}
      </ThemedText>
      <View style={styles.rowSpacer} />
      <Switch
        value={mode === 'dark'}
        onValueChange={toggleTheme}
        trackColor={{ false: '#767577', true: '#81b0ff' }}
        thumbColor={mode === 'dark' ? '#f5dd4b' : '#f4f3f4'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 5,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 3,
    marginRight: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#64748B',
  },
  rowSpacer: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
  },
});
