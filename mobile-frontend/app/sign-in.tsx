import React, { useCallback, useContext, useState } from 'react';
import {
  BackHandler,
  Keyboard,
  StyleSheet,
  TouchableWithoutFeedback,
  TouchableOpacity,
} from 'react-native';
import { useSession } from '@/contexts/auth-context';
import { SafeAreaView } from 'react-native-safe-area-context';
import SecureInput from '@/components/atomic/secure-input';
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

export default function SignIn() {
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState(1);
  const [session, setSession] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<ICountry | null>(null);
  const [backPressCount, setBackPressCount] = useState(0);
  const { signIn, verifyOtp } = useSession();
  const { theme } = useTheme();
  const { language, i18n } = useContext(I18nContext);
  const router = useRouter();
  const params = useLocalSearchParams<{ phone?: string; code?: string }>();
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
    const code = (params?.code as string) || '';

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
    if (code) {
      // For invites, code may be a temporary password
      setPassword(code);
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
  }, [backPressCount, i18n, language]);

  React.useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      handleBackPress
    );
    return () => backHandler.remove();
  }, [handleBackPress]);

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      if (step === 1) {
        return await signIn(selectedCountry, phoneNumber.replaceAll(' ', ''));
      } else {
        const fullPhone = selectedCountry?.callingCode + phoneNumber.replaceAll(' ', '');
        return await verifyOtp(fullPhone, otp, session);
      }
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
        Toast.show(i18n[language].loginFailed, {
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
    onSuccess: async (data) => {
      if (step === 1 && data?.session) {
        setSession(data.session);
        setStep(2);
        Toast.show('Verification code sent', {
          duration: Toast.durations.SHORT,
          position: TOAST_POSITION,
          containerStyle: { backgroundColor: 'green', borderRadius: 5 },
          textColor: 'white'
        });
      } else {
        await AsyncStorage.setItem('hasEverLoggedIn', 'true');

        Toast.show(i18n[language].loginSuccess, {
          duration: Toast.durations.SHORT,
          position: TOAST_POSITION,
          shadow: true,
          animation: true,
          hideOnPress: true,
          textColor: 'white',
          containerStyle: {
            backgroundColor: 'green',
            borderRadius: 5,
          },
        });
      }
    },
  });

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
          {step === 1 ? (
            <>
              <ThemedPhoneInput
                label={i18n[language].phoneNumber}
                value={phoneNumber}
                onChangePhoneNumber={setPhoneNumber}
                selectedCountry={selectedCountry}
                onChangeSelectedCountry={setSelectedCountry}
                placeholder={i18n[language].phoneNumber}
                defaultCountry={'UZ' as ICountryCca2}
              />
              {/* Optional: Link to password login if needed */}
            </>
          ) : (
            <SecureInput
              label="Verification Code"
              placeholder="Enter 6-digit code"
              placeholderTextColor='grey'
              onChangeText={setOtp}
              maxLength={6}
              value={otp}
              keyboardType='number-pad'
              textContentType='oneTimeCode'
              autoCapitalize='none'
            />
          )}

          {/* Hidden Password Input for Demo Mode or Fallback (optional, removing for now to enforce OTP) */}

          {step === 1 && (
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
            onPress={() => mutate()}
            title={step === 1 ? "Send Code" : "Verify"}
            buttonStyle={styles.submitButton}
            titleStyle={styles.buttonText}
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
  forgotPasswordContainer: {
    alignItems: 'center',
    marginTop: 16,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: '#4285F4',
    textDecorationLine: 'underline',
  },
});
