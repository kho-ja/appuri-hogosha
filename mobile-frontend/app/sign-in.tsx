// app/(app)/sign-in.tsx
import React, { useCallback, useContext, useState } from 'react';
import {
  BackHandler,
  Keyboard,
  StyleSheet,
  TouchableWithoutFeedback,
} from 'react-native';
import { useSession } from '@/contexts/auth-context';
import { SafeAreaView } from 'react-native-safe-area-context';
import Select from '@/components/atomic/select';
import Input from '@/components/atomic/input';
import SecureInput from '@/components/atomic/secure-input';
import { I18nContext } from '@/contexts/i18n-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@rneui/themed';
import Toast from 'react-native-root-toast';
import { useTheme } from '@rneui/themed';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [backPressCount, setBackPressCount] = useState(0);
  const { signIn } = useSession();
  const { theme } = useTheme();
  const { language, i18n, setLanguage } = useContext(I18nContext);

  const menuOptions = [
    {
      label: 'English',
      action: async () => {
        setLanguage('en');
        await AsyncStorage.setItem('language', 'en');
      },
    },
    {
      label: '日本語',
      action: async () => {
        setLanguage('ja');
        await AsyncStorage.setItem('language', 'ja');
      },
    },
    {
      label: "O'zbek",
      action: async () => {
        setLanguage('uz');
        await AsyncStorage.setItem('language', 'uz');
      },
    },
  ];

  React.useEffect(() => {
    const loadCredentials = async () => {
      try {
        const storedEmail = await AsyncStorage.getItem('email');
        if (storedEmail) {
          setEmail(storedEmail);
        }
      } catch (error) {
        console.error('Failed to load credentials from AsyncStorage', error);
      }
    };

    const initialize = async () => {
      await loadCredentials();
    };
    initialize();
  }, []);

  const handleBackPress = useCallback(() => {
    if (backPressCount === 0) {
      Toast.show(i18n[language].pressBackAgainToExit, {
        duration: Toast.durations.SHORT,
        position: Toast.positions.BOTTOM,
        shadow: true,
        animation: true,
        hideOnPress: true,
        textColor: 'white',
        containerStyle: {
          backgroundColor: 'gray',
          borderRadius: 5,
        },
      });
      setBackPressCount(1);
      setTimeout(() => {
        setBackPressCount(0);
      }, 2000);
      return true;
    } else {
      BackHandler.exitApp();
      return true;
    }
  }, [backPressCount, i18n, language]);

  React.useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      handleBackPress
    );
    return () => backHandler.remove();
  }, [handleBackPress]);

  const { mutate, isPending } = useMutation({
    mutationFn: async () => await signIn(email, password),
    onError: (error) => {
      Toast.show(i18n[language].loginFailed, {
        duration: Toast.durations.LONG,
        position: Toast.positions.BOTTOM,
        shadow: true,
        animation: true,
        hideOnPress: true,
        textColor: 'white',
        containerStyle: {
          backgroundColor: 'red',
          borderRadius: 5,
        },
      });
    },
    onSuccess: async () => {
      Toast.show(i18n[language].loginSuccess, {
        duration: Toast.durations.SHORT,
        position: Toast.positions.BOTTOM,
        shadow: true,
        animation: true,
        hideOnPress: true,
        textColor: 'white',
        containerStyle: {
          backgroundColor: 'green',
          borderRadius: 5,
        },
      });
    },
  });

  const backgroundColor = theme.colors.background;

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView style={[styles.container, { backgroundColor }]}>
        <ThemedView style={styles.container}>
          <ThemedView style={styles.header}>
            <ThemedView>
              <ThemedText style={styles.title}>{i18n[language].welcome}</ThemedText>
              <ThemedText style={styles.subtitle}>{i18n[language].login}</ThemedText>
            </ThemedView>
            <ThemedView>
              <Select
                options={menuOptions}
                selectedValue={
                  language === 'en'
                    ? menuOptions[0]
                    : language === 'ja'
                      ? menuOptions[1]
                      : menuOptions[2]
                }
              />
            </ThemedView>
          </ThemedView>
          <Input
            textContentType="emailAddress"
            keyboardType="email-address"
            autoCapitalize="none"
            maxLength={50}
            selectTextOnFocus={true}
            label={i18n[language].email}
            placeholder={i18n[language].enterEmail}
            placeholderTextColor="grey"
            onChangeText={setEmail}
            value={email}
          />
          <SecureInput
            label={i18n[language].password}
            placeholder={i18n[language].enterPassword}
            placeholderTextColor="grey"
            onChangeText={setPassword}
            maxLength={50}
            value={password}
            selectTextOnFocus
            keyboardType="numbers-and-punctuation"
            textContentType="password"
            autoCapitalize="none"
          />
          <Button
            onPress={() => mutate()}
            title={i18n[language].loginToAccount}
            buttonStyle={styles.submitButton}
            disabled={isPending}
            loading={isPending}
          />
        </ThemedView>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 12,
    alignContent: 'center',
  },
  submitButton: {
    padding: 16,
    borderRadius: 4,
    alignItems: 'center',
    backgroundColor:'#059669'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 10,
    marginBottom: 80,
  },
  title: {
    fontWeight: 'bold',
    fontSize: 20,
  },
  subtitle: {
    color: 'gray',
    fontSize: 16,
  },
});
