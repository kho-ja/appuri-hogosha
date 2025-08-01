import React, { useContext, useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Keyboard,
  TouchableWithoutFeedback,
  View,
  TextInput,
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
import { useRouter } from 'expo-router';

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
  const hasSpecialChar = /[!@#%&/\\,><':;|_~`+=^$.()[\]{}?" ]/.test(password);

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

export default function ForgotPassword() {
  const [currentStep, setCurrentStep] = useState<Step>('phone');

  // Phone step state
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<ICountry | null>(null);

  // Verification step state
  const [verificationCode, setVerificationCode] = useState([
    '',
    '',
    '',
    '',
    '',
    '',
  ]);
  const [countdown, setCountdown] = useState(60); // 60 seconds
  const codeInputRefs = useRef<(TextInput | null)[]>([]);

  // New password step state
  const [newPassword, setNewPassword] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const { theme } = useTheme();
  const { language, i18n } = useContext(I18nContext);
  const router = useRouter();

  // Timer for verification step
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (currentStep === 'verify') {
      timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 0) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [currentStep]);

  // Page 1: Phone number
  const handleSendCode = async () => {
    if (!phoneNumber.trim() || !selectedCountry) {
      Toast.show('Please enter a valid phone number', {
        duration: Toast.durations.SHORT,
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
      return;
    }

    setIsLoading(true);
    try {
      // TODO: Implement API call to send verification code
      // await sendVerificationCode(selectedCountry, phoneNumber.replaceAll(' ', ''));

      setTimeout(() => {
        setIsLoading(false);
        setCurrentStep('verify');
        setCountdown(60);
      }, 1000);
    } catch {
      setIsLoading(false);
      Toast.show('Failed to send verification code', {
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
    }
  };

  // Page 2: Verification code
  const handleCodeChange = (text: string, index: number) => {
    const newCode = [...verificationCode];

    // If there's already a digit and user types a new one, replace it
    if (text.length > 0) {
      newCode[index] = text.slice(-1); // Take only the last character
    } else {
      newCode[index] = text;
    }

    setVerificationCode(newCode);

    // Auto focus next input when digit is entered
    if (text && index < 5) {
      codeInputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    // Move to previous input on backspace if current input is empty
    if (key === 'Backspace' && !verificationCode[index] && index > 0) {
      codeInputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyCode = async () => {
    const code = verificationCode.join('');
    if (code.length !== 6) {
      Toast.show('Please enter all 6 digits', {
        duration: Toast.durations.SHORT,
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
      return;
    }

    setIsLoading(true);
    try {
      // TODO: Implement API call to verify code
      // await verifyResetCode(phoneNumber, code);

      setTimeout(() => {
        setIsLoading(false);
        setCurrentStep('newPassword');
      }, 1000);
    } catch {
      setIsLoading(false);
      Toast.show('Invalid verification code', {
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
    }
  };

  // Page 3: New password
  const passwordValidation = validatePassword(newPassword);

  const handleSavePassword = async () => {
    if (!passwordValidation.isValid) {
      Toast.show(i18n[language].passwordRequirementsNotMet, {
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
      return;
    }

    setIsLoading(true);
    try {
      // TODO: Implement API call to reset password
      // await resetPassword(phoneNumber, verificationCode.join(''), newPassword);

      setTimeout(() => {
        setIsLoading(false);
        Toast.show(i18n[language].passwordCreatedSuccessfully, {
          duration: Toast.durations.LONG,
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

        router.push('/sign-in');
      }, 1000);
    } catch {
      setIsLoading(false);
      Toast.show('Failed to reset password', {
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

            <View style={styles.codeContainer}>
              {verificationCode.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={ref => {
                    codeInputRefs.current[index] = ref;
                  }}
                  style={[
                    styles.codeInput,
                    {
                      borderColor: digit ? theme.colors.primary : '#D1D5DB',
                      color: theme.colors.black,
                    },
                  ]}
                  value={digit}
                  onChangeText={text => {
                    // Only allow single digit
                    const cleanText = text.replace(/[^0-9]/g, '').slice(0, 1);
                    handleCodeChange(cleanText, index);
                  }}
                  onKeyPress={({ nativeEvent }) => {
                    handleKeyPress(nativeEvent.key, index);
                  }}
                  keyboardType='numeric'
                  maxLength={1}
                  textAlign='center'
                  selectTextOnFocus
                  autoFocus={index === 0}
                />
              ))}
            </View>

            {countdown > 0 ? (
              <ThemedText style={styles.countdown}>
                {i18n[language].codeWillExpire.replace(
                  '{seconds}',
                  countdown.toString()
                )}
              </ThemedText>
            ) : (
              <ThemedText style={styles.expiredText}>
                {i18n[language].codeExpired || 'code expired'}
              </ThemedText>
            )}

            <Button
              onPress={handleVerifyCode}
              title={i18n[language].continueText}
              buttonStyle={[
                styles.submitButton,
                verificationCode.join('').length !== 6 && styles.disabledButton,
              ]}
              titleStyle={styles.buttonText}
              disabled={isLoading || verificationCode.join('').length !== 6}
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
});
