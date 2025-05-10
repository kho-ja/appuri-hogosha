import React, { createContext, ReactNode, useState } from 'react';
import translation from '@/translations/translation';
import { getLocales } from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type Language = 'en' | 'ja' | 'uz';

export interface I18nContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  i18n: {
    [key in Language]: {
      welcome: string;
      login: string;
      email: string;
      enterEmail: string;
      password: string;
      enterPassword: string;
      loginToAccount: string;
      forgotPassword: string;
      resetPassword: string;
      noaccount: string;
      justregister: string;
      loginSuccess: string;
      loginFailed: string;

      home: string;
      form: string;
      settings: string;

      register: string;
      alreadyaccount: string;
      justlogin: string;
      enterotp: string;
      otp: string;
      newpassword: string;

      form_message: string;
      reason: string;
      absense: string;
      lateness: string;
      leaving: string;
      other: string;
      chooseDate: string;
      additionalMessage: string;
      submitForm: string;
      message_placeholder: string;

      /*message*/
      critical: string;
      important: string;
      ordinary: string;
      group: string;
      continueReading: string;
      loadMoreMessages: string;
      messageNotFound: string;
      /*message*/

      /*settings*/
      information: string;
      firstName: string;
      lastName: string;
      emailaddress: string;
      phoneNumber: string;
      preferences: string;
      language: string;
      logout: string;
      passwordChangedSuccess: string;
      changePassword: string;
      savePassword: string;
      textSize: string;
      lightMode: string;
      darkMode: string;
      /*settings*/

      chooseCorrectDate: string;
      choose_student: string;

      /*state*/
      loading: string;

      pressBackAgainToExit: string;

      /*select student page*/
      SelectStudent: string;
    };
  };
}

const i18n: I18nContextType['i18n'] = translation;

export const I18nContext = createContext<I18nContextType>({
  language: 'en',
  setLanguage: () => {},
  i18n: i18n,
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
  return (
    <I18nContext.Provider value={{ language, setLanguage, i18n }}>
      {children}
    </I18nContext.Provider>
  );
};
