import React, { useContext } from 'react';
import { View, Switch, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { Ionicons } from '@expo/vector-icons';
import { I18nContext } from '@/contexts/i18n-context';
import { useTheme } from '@/contexts/theme-context';

export default function ThemeSwitcher() {
  const { language, i18n } = useContext(I18nContext);

  const { themeMode, toggleTheme } = useTheme();

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Ionicons
          name={themeMode === 'light' ? 'sunny' : 'moon'}
          size={20}
          color='#fff'
        />
      </View>
      <ThemedText style={styles.label}>
        {themeMode === 'light'
          ? i18n[language].lightMode
          : i18n[language].darkMode}
      </ThemedText>
      <View style={styles.rowSpacer} />
      <Switch
        value={themeMode === 'dark'}
        onValueChange={toggleTheme}
        trackColor={{
          false: '#D1D5DB',
          true: '#226fc9',
        }}
        thumbColor={'#fff'}
        ios_backgroundColor={'#D1D5DB'}
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
    fontWeight: '400',
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
