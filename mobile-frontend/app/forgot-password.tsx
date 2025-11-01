import React, { useContext, useState, useEffect } from 'react';
import {
  StyleSheet,
  Keyboard,
  TouchableWithoutFeedback,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { I18nContext } from '@/contexts/i18n-context';
import { Button, useTheme } from '@rneui/themed';
import Toast from 'react-native-root-toast';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import ThemedPhoneInput from '@/components/atomic/ThemedPhoneInput';
import SecureInput from '@/components/atomic/secure-input';
import { PasswordRequirements } from '@/components/PasswordRequirements';
import { ICountry } from 'react-native-international-phone-number';
import { ICountryCca2 } from 'react-native-international-phone-number/lib/interfaces/countryCca2';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  sendVerificationCode,
  verifyResetCode,
  resetPassword,
} from '@/services/auth-service';
import { ICountryName } from 'react-native-international-phone-number/lib/interfaces/countryName';

// Import the OTP input package
import { OtpInput } from 'react-native-otp-entry';

type Step = 'phone' | 'verify' | 'newPassword';

// Function to mask phone number
const maskPhoneNumber = (phoneNumber: string, countryCode: string) => {
  if (!phoneNumber) return '';

  const cleanNumber = phoneNumber.replace(/\D/g, '');
  if (cleanNumber.length < 4) return `${countryCode} ${phoneNumber}`;

  const visibleStart = cleanNumber.substring(0, 2);
  const visibleEnd = cleanNumber.substring(cleanNumber.length - 2);
  const middleMask = '*'.repeat(Math.max(0, cleanNumber.length - 4));

  return `${countryCode} ${visibleStart} ${middleMask} ${visibleEnd}`;
};

// Password validation functions
const validatePassword = (password: string) => {
  const minLength = password.length >= 8;
  const hasNumber = /\d/.test(password);
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasSpecialChar = /[!@#%&/\\,><':;|_~`+=^$.()[\]{}?"*-]/.test(password);

  return {
    minLength,
    hasNumber,
    hasUppercase,
    hasLowercase,
    hasSpecialChar,
    isValid:
      minLength && hasNumber && hasUppercase && hasLowercase && hasSpecialChar,
  };
};

const normalizePhoneNumber = (
  rawPhone: string,
  callingCode: string
): string => {
  if (!rawPhone) return callingCode;

  let phone = rawPhone.replace(/\s+/g, '').replace(/-/g, ''); // bo'shliq va chiziqlarni olib tashlash

  // Agar 00 bilan boshlangan bo‘lsa → + ga o‘zgartiramiz
  if (phone.startsWith('00')) {
    phone = `+${phone.slice(2)}`;
  }

  // Agar + bilan boshlangan bo‘lsa → to‘g‘ridan-to‘g‘ri qaytaramiz
  if (phone.startsWith('+')) {
    return phone;
  }

  // Agar 0 bilan boshlangan bo‘lsa → uni olib tashlaymiz
  if (phone.startsWith('0')) {
    phone = phone.slice(1);
  }

  // Oxirida country code ni oldiga qo‘shamiz
  return `${callingCode}${phone}`;
};

export default function ForgotPasswordScreen() {
  const { language, i18n } = useContext(I18nContext);
  const { theme } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ phone?: string; code?: string }>();

  // State variables
  const [currentStep, setCurrentStep] = useState<Step>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<ICountry>({
    callingCode: '+998',
    cca2: 'UZ' as ICountryCca2,
    flag: '🇺🇿',
    name: { en: 'Uzbekistan' } as ICountryName,
  });
  // Changed: Use string instead of array for OTP
  const [verificationCode, setVerificationCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [canResend, setCanResend] = useState(false);
  const [resendCount, setResendCount] = useState(0);
  const TOAST_POSITION = Toast.positions.BOTTOM - 30;

  // No ref needed for react-native-otp-entry

  // Countdown effect
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      setCanResend(false);
    } else {
      setCanResend(true);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  // Page 1: Phone number input
  const handleSendCode = async () => {
    if (!phoneNumber.trim()) {
      Toast.show('Please enter your phone number', {
        duration: Toast.durations.SHORT,
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
      return;
    }

    setIsLoading(true);
    try {
      const fullPhoneNumber = normalizePhoneNumber(
        phoneNumber,
        selectedCountry?.callingCode || '+1'
      );

      await sendVerificationCode(
        selectedCountry?.callingCode || '+1',
        fullPhoneNumber.replace(selectedCountry?.callingCode || '+1', '')
      );

      setIsLoading(false);
      setCurrentStep('verify');

      // Set countdown with increasing delay for multiple attempts
      const delay = Math.min(60 + resendCount * 30, 300); // 60s, 90s, 120s... max 5min
      setCountdown(delay);
      setCanResend(false);

      // Clear OTP
      setVerificationCode('');

      Toast.show(
        resendCount === 0
          ? 'Verification code sent successfully'
          : `Verification code resent successfully (Attempt ${resendCount + 1})`,
        {
          duration: Toast.durations.LONG,
          position: TOAST_POSITION,
          shadow: true,
          animation: true,
          hideOnPress: true,
          textColor: 'white',
          containerStyle: {
            backgroundColor: 'green',
            borderRadius: 5,
          },
        }
      );
    } catch (error) {
      setIsLoading(false);
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Failed to send verification code';
      Toast.show(errorMessage, {
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
  };

  // Pre-fill from deep link params if present
  useEffect(() => {
    const phone = (params?.phone as string) || '';
    const code = (params?.code as string) || '';
    if (phone) {
      // If E.164 with +998, set defaults accordingly
      if (phone.startsWith('+998')) {
        setSelectedCountry({
          callingCode: '+998',
          cca2: 'UZ' as ICountryCca2,
          flag: '🇺🇿',
          name: { en: 'Uzbekistan' } as ICountryName,
        });
        setPhoneNumber(phone.replace('+998', ''));
      } else {
        setPhoneNumber(phone.replace(/^\+/, ''));
      }
    }
    if (code) {
      setVerificationCode(code);
      setCurrentStep('verify');
    }
  }, [params]);

  // Handle resend code
  const handleResendCode = async () => {
    if (!canResend || isLoading) return;

    setResendCount(prev => prev + 1);

    // Clear previous code
    setVerificationCode('');

    // Call the same send code function
    await handleSendCode();
  };
  const handleOTPComplete = (code: string) => {
    setVerificationCode(code);
    // Auto verify when code is complete
    setTimeout(() => {
      handleVerifyCode(code);
    }, 500);
  };

  const handleVerifyCode = async (code?: string) => {
    const finalCode = code || verificationCode;

    if (finalCode.length !== 6) {
      Toast.show('Please enter all 6 digits', {
        duration: Toast.durations.SHORT,
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
      return;
    }

    setIsLoading(true);
    try {
      // Verify the code format (basic validation)
      await verifyResetCode(phoneNumber, finalCode);

      setIsLoading(false);
      setCurrentStep('newPassword');

      Toast.show('Code verified successfully', {
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
    } catch (error) {
      setIsLoading(false);
      const errorMessage =
        error instanceof Error ? error.message : 'Invalid verification code';
      Toast.show(errorMessage, {
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

      // Clear OTP on error
      setVerificationCode('');
    }
  };

  // Page 3: New password
  const passwordValidation = validatePassword(newPassword);

  const handleSavePassword = async () => {
    if (!passwordValidation.isValid) {
      Toast.show(i18n[language].passwordRequirementsNotMet, {
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
      return;
    }

    setIsLoading(true);
    try {
      // Build full phone number with country code
      const fullPhoneNumber = normalizePhoneNumber(
        phoneNumber,
        selectedCountry?.callingCode || '+1'
      );

      await resetPassword(
        fullPhoneNumber,
        verificationCode, // Now it's a string
        newPassword
      );

      setIsLoading(false);
      Toast.show(i18n[language].passwordCreatedSuccessfully, {
        duration: Toast.durations.LONG,
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

      // Navigate back to sign-in after successful password reset
      router.push('/sign-in');
    } catch (error) {
      setIsLoading(false);
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to reset password';
      Toast.show(errorMessage, {
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
  };

  const backgroundColor = theme.colors.background;

  // Render page 1: Phone number
  if (currentStep === 'phone') {
    return (
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <SafeAreaView style={[styles.container, { backgroundColor }]}>
          <ThemedView style={styles.container}>
            <ThemedView style={styles.header}>
              <ThemedText style={styles.title}>
                {i18n[language].resetPasswordTitle}
              </ThemedText>
              <ThemedText style={styles.description}>
                {i18n[language].enterPhoneNumberText}
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

            <Button
              onPress={handleSendCode}
              title={i18n[language].sendCode}
              buttonStyle={styles.submitButton}
              titleStyle={styles.buttonText}
              disabled={isLoading}
              loading={isLoading}
            />

            <TouchableOpacity
              style={styles.backToSignInContainer}
              onPress={() => router.push('/sign-in')}
            >
              <ThemedText style={styles.backToSignInText}>
                {i18n[language].backToSignIn}
              </ThemedText>
            </TouchableOpacity>
          </ThemedView>
        </SafeAreaView>
      </TouchableWithoutFeedback>
    );
  }

  // Render page 2: Verification code
  if (currentStep === 'verify') {
    const maskedPhoneNumber = selectedCountry
      ? maskPhoneNumber(phoneNumber, selectedCountry.callingCode)
      : phoneNumber;

    return (
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <SafeAreaView style={[styles.container, { backgroundColor }]}>
          <ThemedView style={styles.container}>
            <ThemedView style={styles.header}>
              <ThemedText style={styles.title}>
                {i18n[language].resetPasswordTitle}
              </ThemedText>
              <ThemedText style={styles.description}>
                {i18n[language].verificationCodeSent}
              </ThemedText>
              <ThemedText style={styles.phoneNumberDisplay}>
                {maskedPhoneNumber}
              </ThemedText>
            </ThemedView>

            <ThemedText style={styles.label}>
              {i18n[language].enterVerificationCode}
            </ThemedText>

            {/* Use react-native-otp-entry with correct props */}
            <OtpInput
              numberOfDigits={6}
              onTextChange={setVerificationCode}
              onFilled={handleOTPComplete}
              autoFocus
              focusColor={theme.colors.primary}
              focusStickBlinkingDuration={500}
              theme={{
                containerStyle: styles.codeContainer,
                pinCodeContainerStyle: {
                  ...styles.codeInput,
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
                textContentType: 'oneTimeCode', // iOS SMS auto-fill
                autoComplete: 'sms-otp', // Android SMS auto-fill
              }}
            />

            {countdown > 0 ? (
              <ThemedText style={styles.countdown}>
                {i18n[language].codeWillExpire.replace(
                  '{seconds}',
                  countdown.toString()
                )}
              </ThemedText>
            ) : (
              <ThemedView style={styles.resendContainer}>
                <Button
                  onPress={handleResendCode}
                  title={`${i18n[language].resendCode}${resendCount > 0 ? ` (${resendCount + 1})` : ''}`}
                  type='clear'
                  disabled={!canResend || isLoading}
                  loading={isLoading}
                  titleStyle={[
                    styles.resendText,
                    {
                      color: canResend && !isLoading ? '#4285F4' : '#9CA3AF',
                    },
                  ]}
                />
              </ThemedView>
            )}

            <Button
              onPress={() => handleVerifyCode()}
              title={i18n[language].continueText}
              buttonStyle={[
                styles.submitButton,
                verificationCode.length !== 6 && styles.disabledButton,
              ]}
              titleStyle={styles.buttonText}
              disabled={isLoading || verificationCode.length !== 6}
              loading={isLoading}
            />
          </ThemedView>
        </SafeAreaView>
      </TouchableWithoutFeedback>
    );
  }

  // Render page 3: New password
  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView style={[styles.container, { backgroundColor }]}>
        <ThemedView style={styles.container}>
          <ThemedView style={styles.header}>
            <ThemedText style={styles.title}>
              {i18n[language].createNewPasswordTitle}
            </ThemedText>
            <ThemedText style={styles.description}>
              {i18n[language].enterNewPasswordText}
            </ThemedText>
          </ThemedView>

          <SecureInput
            label={i18n[language].newPassword}
            placeholder={i18n[language].enterNewPassword}
            placeholderTextColor='grey'
            onChangeText={setNewPassword}
            maxLength={50}
            value={newPassword}
            selectTextOnFocus
            keyboardType='default'
            textContentType='newPassword'
            autoCapitalize='none'
          />

          {newPassword.length > 0 && (
            <PasswordRequirements
              password={newPassword}
              requirements={{
                minLength: i18n[language].minLength,
                hasNumber: i18n[language].hasNumber,
                hasUppercase: i18n[language].hasUppercase,
                hasLowercase: i18n[language].hasLowercase,
                hasSpecialChar: i18n[language].hasSpecialChar,
                passwordStrength: i18n[language].passwordStrength,
                weak: i18n[language].weak,
                medium: i18n[language].medium,
                strong: i18n[language].strong,
              }}
            />
          )}

          <Button
            onPress={handleSavePassword}
            title={i18n[language].saveNewPassword}
            buttonStyle={styles.submitButton}
            titleStyle={styles.buttonText}
            disabled={isLoading || !passwordValidation.isValid}
            loading={isLoading}
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
    fontSize: 32,
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    opacity: 0.7,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Verification step styles
  phoneNumberDisplay: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 8,
    color: '#4285F4',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  codeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  codeInput: {
    width: 45,
    height: 50,
    borderWidth: 2,
    borderRadius: 8,
    fontSize: 18,
    fontWeight: '600',
    borderColor: '#D1D5DB',
  },
  // New styles for OTP input to match your design
  otpContainer: {
    width: '100%',
  },
  otpInputsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  otpText: {
    fontSize: 18,
    fontWeight: '600',
  },
  countdown: {
    textAlign: 'center',
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 20,
  },
  expiredText: {
    fontSize: 14,
    color: 'red',
    marginBottom: 16,
    textAlign: 'center',
  },
  disabledButton: {
    backgroundColor: '#4285F4',
    opacity: 0.6,
  },
  // Resend functionality styles
  resendContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  resendHelpText: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 8,
    textAlign: 'center',
  },
  resendText: {
    fontSize: 16,
    fontWeight: '600',
  },
  backToSignInContainer: {
    alignItems: 'center',
    marginTop: 16,
  },
  backToSignInText: {
    fontSize: 14,
    color: '#4285F4',
    textDecorationLine: 'underline',
  },
});
