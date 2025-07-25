import React, { useContext, useEffect } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  TouchableOpacity,
  View,
  BackHandler,
} from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { I18nContext } from '@/contexts/i18n-context';
import { useTheme } from '@rneui/themed';
import Ionicons from 'react-native-vector-icons/Ionicons';

const languageData = [
  { language: "O'zbekcha", flag: '🇺🇿', code: 'uz' },
  { language: '日本語', flag: '🇯🇵', code: 'ja' },
  { language: 'English', flag: '🇬🇧', code: 'en' },
];

export default function LanguageSelect() {
  const router = useRouter();
  const { setLanguage } = useContext(I18nContext);
  const { theme } = useTheme();

  // Agar avval login qilgan bo'lsa, to'g'ridan-to'g'ri sign-in pagega o'tkazish
  useEffect(() => {
    const checkLoginHistory = async () => {
      try {
        const hasEverLoggedIn = await AsyncStorage.getItem('hasEverLoggedIn');
        if (hasEverLoggedIn === 'true') {
          router.replace('/sign-in');
        }
      } catch (error) {
        console.error('Error checking login history:', error);
      }
    };

    checkLoginHistory();
  }, []);

  const handleSelect = async (langCode: 'en' | 'ja' | 'uz') => {
    await AsyncStorage.setItem('language', langCode);
    await AsyncStorage.setItem('languageSelected', 'true');
    setLanguage(langCode);
    router.replace('/sign-in');
  };

  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        BackHandler.exitApp();
        return true;
      }
    );
    return () => backHandler.remove();
  }, []);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <View style={styles.innerContainer}>
        {languageData.map(({ language, flag, code }) => (
          <TouchableOpacity
            key={code}
            style={styles.languageItem}
            onPress={() => handleSelect(code as 'en' | 'ja' | 'uz')}
            activeOpacity={0.8}
          >
            <View style={styles.row}>
              <ThemedText style={styles.flag}>{flag}</ThemedText>
              <ThemedText>{language}</ThemedText>
            </View>
            <Ionicons color='#226fc9' name='chevron-forward' size={20} />
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  innerContainer: {
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  languageItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 15,
    backgroundColor: '#EAF2FF',
  },
  flag: {
    fontSize: 22,
    marginRight: 12,
  },
});