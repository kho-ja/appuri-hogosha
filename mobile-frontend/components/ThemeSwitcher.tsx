import React, { useContext } from 'react';
import { View, Switch, StyleSheet } from 'react-native';
import { useThemeMode } from '@rneui/themed';
import { ThemedText } from '@/components/ThemedText';
import { Ionicons } from '@expo/vector-icons';
import { I18nContext } from '@/contexts/i18n-context';

export default function ThemeSwitcher() {
  const { mode, setMode } = useThemeMode();
  const { language, i18n } = useContext(I18nContext);

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
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View
          style={[
            styles.switchWrapper,
            {
              backgroundColor: mode === 'dark' ? '#226fc9' : '#D1D5DB',
            },
          ]}
        >
          <Switch
            value={mode === 'dark'}
            onValueChange={toggleTheme}
            trackColor={{
              false: mode === 'dark' ? '#226fc9' : '#D1D5DB',
              true: mode === 'dark' ? '#226fc9' : '#D1D5DB',
            }}
            thumbColor={'#fff'}
            style={{ alignSelf: 'center' }}
          />
        </View>
      </View>
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
  switchWrapper: {
    width: 50,
    height: 30,
    borderRadius: 15,
    marginRight: 8,
    justifyContent: 'center',
  },
});
