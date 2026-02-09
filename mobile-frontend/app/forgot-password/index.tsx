import React, { useContext, useState, useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ICountry } from 'react-native-international-phone-number';
import { ICountryCca2 } from 'react-native-international-phone-number/lib/interfaces/countryCca2';
import { ICountryName } from 'react-native-international-phone-number/lib/interfaces/countryName';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { I18nContext } from '@/contexts/i18n-context';
import { showSuccessToast, showErrorToast } from '@/utils/toast';
import {
  sendVerificationCode,
  verifyResetCode,
  resetPassword,
} from '@/services/auth-service';

import { PhoneInputScreen } from '../../features/forgot-password/PhoneInputScreen';
import { OtpVerificationScreen } from '../../features/forgot-password/OtpVerificationScreen';
import { ResetPasswordScreen } from '../../features/forgot-password/ResetPasswordScreen';
import {
  ForgotPasswordStep,
  maskPhoneNumber,
  normalizePhoneNumber,
  validatePassword,
  EXPIRY_KEY,
} from '../../features/forgot-password/types';

export default function ForgotPassword() {
  const { language, i18n } = useContext(I18nContext);
  const router = useRouter();
  const params = useLocalSearchParams<{ phone?: string; code?: string }>();

  const [currentStep, setCurrentStep] = useState<ForgotPasswordStep>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<ICountry>({
    callingCode: '+998',
    cca2: 'UZ' as ICountryCca2,
    flag: '🇺🇿',
    name: { en: 'Uzbekistan' } as ICountryName,
  } as ICountry);
  const [verificationCode, setVerificationCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [canResend, setCanResend] = useState(true);
  const [resendCount, setResendCount] = useState(0);
  const [expiryAt, setExpiryAt] = useState<number | null>(null);

  // Countdown timer effect
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;

    if (expiryAt && expiryAt > Date.now()) {
      interval = setInterval(() => {
        const remaining = Math.max(
          0,
          Math.floor((expiryAt - Date.now()) / 1000)
        );
        setCountdown(remaining);
        if (remaining === 0) {
          setCanResend(true);
          setExpiryAt(null);
          AsyncStorage.removeItem(EXPIRY_KEY).catch(() => {});
        }
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [expiryAt]);

  // Check if code is still valid on mount
  useEffect(() => {
    const checkExpiry = async () => {
      const stored = await AsyncStorage.getItem(EXPIRY_KEY);
      if (stored) {
        const expiryTime = parseInt(stored, 10);
        const now = Date.now();

        if (now < expiryTime) {
          setExpiryAt(expiryTime);
          const remainingSec = Math.floor((expiryTime - now) / 1000);
          setCountdown(remainingSec);
          setCanResend(false);
        } else {
          await AsyncStorage.removeItem(EXPIRY_KEY);
          setExpiryAt(null);
        }
      }
    };
    checkExpiry();
  }, [currentStep]);

  // Pre-fill from deep link params if present
  useEffect(() => {
    const phone = (params?.phone as string) || '';
    const code = (params?.code as string) || '';
    if (phone) {
      if (phone.startsWith('+998')) {
        setSelectedCountry({
          callingCode: '+998',
          cca2: 'UZ' as ICountryCca2,
          flag: '🇺🇿',
          name: { en: 'Uzbekistan' } as ICountryName,
        } as ICountry);
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

  const getMaskedPhoneNumber = () => {
    return selectedCountry
      ? maskPhoneNumber(phoneNumber, selectedCountry.callingCode)
      : phoneNumber;
  };

  const handleSendCode = async () => {
    try {
      setIsLoading(true);
      const fullPhoneNumber = normalizePhoneNumber(
        phoneNumber,
        selectedCountry?.callingCode || '+998'
      );

      await sendVerificationCode(
        selectedCountry?.callingCode || '+998',
        fullPhoneNumber.replace(selectedCountry?.callingCode || '+998', '')
      );

      setIsLoading(false);
      setCurrentStep('verify');

      // Set countdown with increasing delay for multiple attempts
      const delay = Math.min(60 + resendCount * 30, 300);
      const newExpiry = Date.now() + delay * 1000;
      setExpiryAt(newExpiry);
      AsyncStorage.setItem(EXPIRY_KEY, String(newExpiry)).catch(() => {});
      setCanResend(false);
      setVerificationCode('');

      showSuccessToast(
        resendCount === 0
          ? 'Verification code sent successfully'
          : `Verification code resent successfully (Attempt ${resendCount + 1})`,
        { duration: 'long' }
      );
    } catch (error) {
      setIsLoading(false);
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Failed to send verification code';
      showErrorToast(errorMessage);
    }
  };

  const handleResendCode = async () => {
    if (!canResend || isLoading) return;
    setResendCount(prev => prev + 1);
    setVerificationCode('');
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
      showErrorToast('Please enter all 6 digits');
      return;
    }

    try {
      setIsLoading(true);
      const fullPhoneNumber = normalizePhoneNumber(
        phoneNumber,
        selectedCountry?.callingCode || '+998'
      );

      await verifyResetCode(fullPhoneNumber, finalCode);

      setIsLoading(false);
      setCurrentStep('newPassword');

      setExpiryAt(null);
      AsyncStorage.removeItem(EXPIRY_KEY).catch(() => {});

      showSuccessToast('Code verified successfully');
    } catch (error) {
      setIsLoading(false);
      const errorMessage =
        error instanceof Error ? error.message : 'Invalid verification code';
      showErrorToast(errorMessage);

      // Clear OTP on error
      setVerificationCode('');
    }
  };

  const handleSavePassword = async () => {
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      showErrorToast(i18n[language].passwordRequirementsNotMet);
      return;
    }

    try {
      setIsLoading(true);
      const fullPhoneNumber = normalizePhoneNumber(
        phoneNumber,
        selectedCountry?.callingCode || '+998'
      );

      await resetPassword(fullPhoneNumber, verificationCode, newPassword);

      setIsLoading(false);
      showSuccessToast(i18n[language].passwordCreatedSuccessfully, {
        duration: 'long',
      });

      // Navigate back to sign-in after successful password reset
      setExpiryAt(null);
      AsyncStorage.removeItem(EXPIRY_KEY).catch(() => {});
      router.push('/sign-in');
    } catch (error) {
      setIsLoading(false);
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to reset password';
      showErrorToast(errorMessage);
    }
  };

  if (currentStep === 'phone') {
    return (
      <PhoneInputScreen
        phoneNumber={phoneNumber}
        selectedCountry={selectedCountry}
        isLoading={isLoading}
        translations={{
          resetPasswordTitle: i18n[language].resetPasswordTitle,
          enterPhoneNumberText: i18n[language].enterPhoneNumberText,
          phoneNumber: i18n[language].phoneNumber,
          sendCode: i18n[language].sendCode,
          backToSignIn: i18n[language].backToSignIn,
        }}
        onPhoneChange={setPhoneNumber}
        onCountryChange={setSelectedCountry}
        onSendCode={handleSendCode}
      />
    );
  }

  if (currentStep === 'verify') {
    return (
      <OtpVerificationScreen
        maskedPhoneNumber={getMaskedPhoneNumber()}
        verificationCode={verificationCode}
        isLoading={isLoading}
        countdown={countdown}
        canResend={canResend}
        resendCount={resendCount}
        translations={{
          resetPasswordTitle: i18n[language].resetPasswordTitle,
          verificationCodeSent: i18n[language].verificationCodeSent,
          enterVerificationCode: i18n[language].enterVerificationCode,
          codeWillExpire: i18n[language].codeWillExpire,
          resendCode: i18n[language].resendCode,
          continueText: i18n[language].continueText,
        }}
        onOtpChange={setVerificationCode}
        onOtpComplete={handleOTPComplete}
        onVerifyCode={handleVerifyCode}
        onResendCode={handleResendCode}
      />
    );
  }

  return (
    <ResetPasswordScreen
      newPassword={newPassword}
      isLoading={isLoading}
      translations={{
        createNewPasswordTitle: i18n[language].createNewPasswordTitle,
        enterNewPasswordText: i18n[language].enterNewPasswordText,
        newPassword: i18n[language].newPassword,
        enterNewPassword: i18n[language].enterNewPassword,
        saveNewPassword: i18n[language].saveNewPassword,
        requirements: {
          minLength: i18n[language].minLength,
          hasNumber: i18n[language].hasNumber,
          hasUppercase: i18n[language].hasUppercase,
          hasLowercase: i18n[language].hasLowercase,
          hasSpecialChar: i18n[language].hasSpecialChar,
          passwordStrength: i18n[language].passwordStrength,
          weak: i18n[language].weak,
          medium: i18n[language].medium,
          strong: i18n[language].strong,
        },
      }}
      onPasswordChange={setNewPassword}
      onSavePassword={handleSavePassword}
    />
  );
}
