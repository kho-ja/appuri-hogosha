import React, { useCallback, useContext, useState } from 'react';
import {
  BackHandler,
  Keyboard,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useSession } from '@/contexts/auth-context';
import { SafeAreaView } from 'react-native-safe-area-context';
import { I18nContext } from '@/contexts/i18n-context';
import { useMutation } from '@tanstack/react-query';
import { Button, useTheme } from '@rneui/themed';
import Toast from 'react-native-root-toast';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { ICountry } from 'react-native-international-phone-number';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { OtpInput } from 'react-native-otp-entry';
import { Ionicons } from '@expo/vector-icons';
import { AuthErrorHandler } from '@/lib/errorHandler';

export default function VerifyOtp() {
  const [otp, setOtp] = useState('');
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const { signIn, verifyOtp } = useSession();
  const { theme } = useTheme();
  const { language, i18n } = useContext(I18nContext);
  const router = useRouter();
  const params = useLocalSearchParams<{
    country?: string;
    phone?: string;
    session?: string;
  }>();
  const TOAST_POSITION = Toast.positions.BOTTOM - 30;

  const selectedCountry: ICountry | null = params.country
    ? JSON.parse(params.country)
    : null;
  const phoneNumber = params.phone || '';
  const session = params.session || '';

  // Auto-submit OTP when complete
  const handleOTPComplete = (code: string) => {
    setOtp(code);
    setTimeout(() => {
      mutate();
    }, 300);
  };

  // Countdown timer effect
  React.useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      setCanResend(false);
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      setCanResend(true);
    }
  }, [countdown]);

  // Resend code handler
  const handleResendCode = async () => {
    if (!canResend || isPending) return;

    setOtp('');
    setCountdown(60);
    setCanResend(false);

    try {
      const data = await signIn(
        selectedCountry,
        phoneNumber.replaceAll(' ', '')
      );
      if (data?.session) {
        Toast.show('Verification code resent', {
          duration: Toast.durations.SHORT,
          position: TOAST_POSITION,
          containerStyle: { backgroundColor: 'green', borderRadius: 5 },
          textColor: 'white',
        });
      }
    } catch {
      Toast.show('Failed to resend code', {
        duration: Toast.durations.SHORT,
        position: TOAST_POSITION,
        containerStyle: { backgroundColor: 'red', borderRadius: 5 },
        textColor: 'white',
      });
    }
  };

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      return await verifyOtp(
        selectedCountry,
        phoneNumber.replaceAll(' ', ''),
        otp,
        session
      );
    },
    onError: error => {
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
    onSuccess: async () => {
      await Toast.show(i18n[language].loginSuccess, {
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
    },
  });

  const handleBackPress = useCallback(() => {
    router.back();
    return true;
  }, [router]);

  React.useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      handleBackPress
    );
    return () => backHandler.remove();
  }, [handleBackPress]);

  const backgroundColor = theme.colors.background;

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView style={[styles.container, { backgroundColor }]}>
        <ThemedView style={styles.container}>
          <View style={styles.headerContainer}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backButton}
            >
              <Ionicons
                name='arrow-back'
                size={24}
                color={theme.colors.black}
              />
            </TouchableOpacity>
            <ThemedView style={styles.header}>
              <ThemedText style={styles.title}>
                {i18n[language].verificationCode}
              </ThemedText>
            </ThemedView>
          </View>

          <ThemedText style={styles.label}>
            {i18n[language].enterVerificationCode}
          </ThemedText>
          <ThemedText style={styles.phoneNumberDisplay}>
            {selectedCountry?.callingCode}{' '}
            {phoneNumber.replace(/(\d{2})(\d+)(\d{2})/, '$1***$3')}
          </ThemedText>

          <OtpInput
            numberOfDigits={6}
            onTextChange={setOtp}
            onFilled={handleOTPComplete}
            autoFocus
            focusColor={theme.colors.primary}
            focusStickBlinkingDuration={500}
            theme={{
              containerStyle: styles.otpContainer,
              pinCodeContainerStyle: {
                ...styles.otpInput,
                backgroundColor: theme.colors.background,
              },
              pinCodeTextStyle: {
                ...styles.otpText,
                color: theme.colors.black,
              },
              focusedPinCodeContainerStyle: {
                borderColor: theme.colors.primary,
                borderWidth: 2,
              },
            }}
            textInputProps={{
              textContentType: 'oneTimeCode',
              autoComplete: 'sms-otp',
              keyboardType: 'number-pad',
            }}
          />

          {countdown > 0 ? (
            <ThemedText style={styles.countdown}>
              {i18n[language].codeWillExpire?.replace(
                '{seconds}',
                countdown.toString()
              )}
            </ThemedText>
          ) : (
            <View style={styles.resendContainer}>
              <Button
                onPress={handleResendCode}
                title={i18n[language].resendCode}
                type='clear'
                disabled={!canResend || isPending}
                loading={isPending}
                titleStyle={[
                  styles.resendText,
                  {
                    color: canResend && !isPending ? '#4285F4' : '#9CA3AF',
                  },
                ]}
              />
            </View>
          )}

          <Button
            onPress={() => mutate()}
            title={i18n[language].verify}
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
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 40,
  },
  backButton: {
    padding: 8,
    marginRight: 12,
  },
  submitButton: {
    padding: 16,
    borderRadius: 12,
    marginTop: 40,
    backgroundColor: '#4285F4',
  },
  header: {
    flex: 1,
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
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  phoneNumberDisplay: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 24,
    color: '#4285F4',
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  otpInput: {
    width: 45,
    height: 50,
    borderWidth: 2,
    borderRadius: 8,
    borderColor: '#D1D5DB',
  },
  otpText: {
    fontSize: 18,
    fontWeight: '600',
  },
  countdown: {
    textAlign: 'center',
    fontSize: 14,
    opacity: 0.7,
    marginTop: 16,
    marginBottom: 20,
  },
  resendContainer: {
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 20,
  },
  resendText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
