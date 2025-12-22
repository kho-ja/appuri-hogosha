import React, { useCallback, useContext, useState } from 'react';
import {
  BackHandler,
  Keyboard,
  StyleSheet,
  TouchableWithoutFeedback,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSession } from '@/contexts/auth-context';
import { SafeAreaView } from 'react-native-safe-area-context';
import { I18nContext } from '@/contexts/i18n-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMutation } from '@tanstack/react-query';
import { Button, useTheme } from '@rneui/themed';
import Toast from 'react-native-root-toast';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import ThemedPhoneInput from '@/components/atomic/ThemedPhoneInput';
import { ICountry } from 'react-native-international-phone-number';
import { ICountryCca2 } from 'react-native-international-phone-number/lib/interfaces/countryCca2';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ICountryName } from 'react-native-international-phone-number/lib/interfaces/countryName';
import { AuthErrorHandler } from '@/lib/errorHandler';
import SecureInput from '@/components/atomic/secure-input';

export default function SignIn() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<ICountry | null>(null);
  const [backPressCount, setBackPressCount] = useState(0);
  const [usePassword, setUsePassword] = useState(false);
  const { signIn } = useSession();
  const { theme } = useTheme();
  const { language, i18n } = useContext(I18nContext);
  const router = useRouter();
  const params = useLocalSearchParams<{ phone?: string }>();
  const TOAST_POSITION = Toast.positions.BOTTOM - 30;

  React.useEffect(() => {
    const loadCredentials = async () => {
      try {
        const storedPhoneNumber = await AsyncStorage.getItem('phoneNumber');
        const storedCountry = await AsyncStorage.getItem('country');
        if (storedPhoneNumber) setPhoneNumber(storedPhoneNumber);
        if (storedCountry) setSelectedCountry(JSON.parse(storedCountry));
      } catch (error) {
        console.error('Failed to load credentials from AsyncStorage', error);
      }
    };

    const initialize = async () => {
      await loadCredentials();
    };
    initialize();
  }, []);

  React.useEffect(() => {
    const phone = (params?.phone as string) || '';

    if (phone) {
      // Handle E.164 (e.g., +99890XXXXXXX) for Uzbekistan by default
      if (phone.startsWith('+998')) {
        setSelectedCountry({
          callingCode: '+998',
          cca2: 'UZ' as ICountryCca2,
          flag: '🇺🇿',
          name: { en: 'Uzbekistan' } as ICountryName,
        });
        setPhoneNumber(phone.replace('+998', ''));
      } else {
        // Fallback: keep as-is; user can adjust country selector
        setPhoneNumber(phone.replace(/^\+/, ''));
      }
    }
  }, [params]);

  const handleBackPress = useCallback(() => {
    if (backPressCount === 0) {
      Toast.show(i18n[language].pressBackAgainToExit, {
        duration: Toast.durations.SHORT,
        position: TOAST_POSITION,
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
  }, [backPressCount, i18n, language, TOAST_POSITION]);

  React.useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      handleBackPress
    );
    return () => backHandler.remove();
  }, [handleBackPress]);

  // OTP Login mutation
  const otpMutation = useMutation({
    mutationFn: async () => {
      return await signIn(selectedCountry, phoneNumber.replaceAll(' ', ''));
    },
    onError: error => {
      // Check if this is a notification permission error
      if (
        error instanceof Error &&
        (error.name === 'NotificationPermissionError' ||
          error.message === 'NOTIFICATION_PERMISSION_DENIED')
      ) {
        Toast.show(i18n[language].loginFailedNotifications, {
          duration: Toast.durations.LONG,
          position: TOAST_POSITION,
          shadow: true,
          animation: true,
          hideOnPress: true,
          textColor: 'white',
          containerStyle: {
            backgroundColor: 'red',
            borderRadius: 5,
          },
        });
      } else {
        const parsedError = AuthErrorHandler.parseError(error);
        const errorMessageKey =
          parsedError.userMessage as keyof (typeof i18n)[typeof language];
        const errorMessage =
          (i18n[language][errorMessageKey] as string | undefined) ||
          i18n[language].loginFailed ||
          parsedError.userMessage;

        Toast.show(String(errorMessage), {
          duration: Toast.durations.LONG,
          position: TOAST_POSITION,
          shadow: true,
          animation: true,
          hideOnPress: true,
          textColor: 'white',
          containerStyle: {
            backgroundColor: 'red',
            borderRadius: 5,
          },
        });
      }
    },
    onSuccess: async data => {
      if (data?.session) {
        Toast.show('Verification code sent', {
          duration: Toast.durations.SHORT,
          position: TOAST_POSITION,
          containerStyle: { backgroundColor: 'green', borderRadius: 5 },
          textColor: 'white',
        });
        // Navigate to verify-otp screen with params
        router.push({
          pathname: '/verify-otp',
          params: {
            country: JSON.stringify(selectedCountry),
            phone: phoneNumber.replaceAll(' ', ''),
            session: data.session,
          },
        });
      }
    },
  });

  // Password Login mutation
  const passwordMutation = useMutation({
    mutationFn: async () => {
      return await signIn(
        selectedCountry,
        phoneNumber.replaceAll(' ', ''),
        password
      );
    },
    onError: error => {
      const parsedError = AuthErrorHandler.parseError(error);
      const errorMessageKey =
        parsedError.userMessage as keyof (typeof i18n)[typeof language];
      const errorMessage =
        (i18n[language][errorMessageKey] as string | undefined) ||
        i18n[language].loginFailed ||
        parsedError.userMessage;

      Toast.show(String(errorMessage), {
        duration: Toast.durations.LONG,
        position: TOAST_POSITION,
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
        position: TOAST_POSITION,
        containerStyle: { backgroundColor: 'green', borderRadius: 5 },
        textColor: 'white',
      });
      // Navigate to main app tabs
      router.replace('/(tabs)');
    },
  });

  const handleSubmit = () => {
    if (usePassword) {
      passwordMutation.mutate();
    } else {
      otpMutation.mutate();
    }
  };

  const isPending = otpMutation.isPending || passwordMutation.isPending;

  const backgroundColor = theme.colors.background;

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView style={[styles.container, { backgroundColor }]}>
        <ThemedView style={styles.container}>
          <ThemedView style={styles.header}>
            <ThemedText style={styles.title}>
              {i18n[language].welcome.replace(', ', ',\n')}
            </ThemedText>
          </ThemedView>
          <ThemedPhoneInput
            label={i18n[language].phoneNumber}
            value={phoneNumber}
            onChangePhoneNumber={setPhoneNumber}
            selectedCountry={selectedCountry}
            onChangeSelectedCountry={setSelectedCountry}
            placeholder={i18n[language].phoneNumber}
            defaultCountry={'UZ' as ICountryCca2}
          />

          {usePassword && (
            <SecureInput
              style={styles.passwordContainer}
              label={i18n[language].password}
              value={password}
              onChangeText={setPassword}
              placeholder={i18n[language].enterPassword}
              autoCapitalize='none'
            />
          )}

          {usePassword && (
            <TouchableOpacity
              style={styles.forgotPasswordContainer}
              onPress={() => router.push('/forgot-password')}
            >
              <ThemedText style={styles.forgotPasswordText}>
                {i18n[language].forgotPasswordLink}
              </ThemedText>
            </TouchableOpacity>
          )}

          <Button
            onPress={handleSubmit}
            title={
              usePassword
                ? i18n[language].loginToAccount
                : i18n[language].sendCode
            }
            buttonStyle={styles.submitButton}
            titleStyle={styles.buttonText}
            disabled={isPending}
            loading={isPending}
          />

          <TouchableOpacity
            onPress={() => setUsePassword(!usePassword)}
            style={styles.linkButton}
          >
            <ThemedText style={styles.linkText}>
              {usePassword
                ? i18n[language].useOtpInstead ||
                  'Use verification code instead'
                : i18n[language].usePasswordInstead || 'Use password instead'}
            </ThemedText>
          </TouchableOpacity>
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
    borderRadius: 12,
    marginTop: 40,
    backgroundColor: '#4285F4',
  },
  header: {
    marginBottom: 60,
  },
  title: {
    fontWeight: '600',
    fontSize: 40,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  passwordContainer: {
    marginTop: 20,
    marginBottom: 10,
  },
  forgotPasswordContainer: {
    alignItems: 'center',
    marginTop: 8,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: '#4285F4',
    textDecorationLine: 'underline',
    fontWeight: '500',
  },
  label: {
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '500',
  },
  linkButton: {
    marginTop: 20,
    alignItems: 'center',
    padding: 10,
  },
  linkText: {
    color: '#4285F4',
    fontSize: 16,
    fontWeight: '500',
  },
});
