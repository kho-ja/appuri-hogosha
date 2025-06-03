import React, { createContext, ReactNode, useState } from 'react';
import translation from '@/translations/translation';
import { getLocales } from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Language, Translations, TranslationKeys } from '@/types/i18n';
export type { Language, TranslationKeys };

export interface I18nContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  i18n: Translations;
  t: (key: keyof TranslationKeys) => string; // Helper function for getting translations
}

const i18n: Translations = translation;

export const I18nContext = createContext<I18nContextType>({
  language: 'en',
  setLanguage: () => {},
  i18n: i18n,
  t: (key: keyof TranslationKeys) => '',
});

interface I18nProviderProps {
  children: ReactNode;
}

const getInitialLanguage = async (): Promise<Language> => {
  const locale = getLocales()[0].languageCode;
  const allowedLanguages: Language[] = ['en', 'ja', 'uz'];
  const storedLanguage = await AsyncStorage.getItem('language');
  if (storedLanguage && allowedLanguages.includes(storedLanguage as Language)) {
    return storedLanguage as Language;
  }
  return allowedLanguages.includes(locale as Language)
    ? (locale as Language)
    : 'en';
};

export const I18nProvider = ({ children }: I18nProviderProps) => {
  const [language, setLanguage] = useState<Language>('en');

  React.useEffect(() => {
    const fetchInitialLanguage = async () => {
      const initialLanguage = await getInitialLanguage();
      setLanguage(initialLanguage);
    };

    fetchInitialLanguage();
  }, []);

  // Helper function to get translation by key
  const t = (key: keyof TranslationKeys): string => {
    return i18n[language][key] || key;
  };

  return (
    <I18nContext.Provider value={{ language, setLanguage, i18n, t }}>
      {children}
    </I18nContext.Provider>
  );
};
