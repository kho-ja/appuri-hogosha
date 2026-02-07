import React from 'react';
import { Keyboard, TouchableWithoutFeedback } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { OtpInput } from 'react-native-otp-entry';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useTheme, Button } from '@rneui/themed';
import { forgotPasswordStyles } from './styles';

interface OtpVerificationScreenTranslations {
  resetPasswordTitle: string;
  verificationCodeSent: string;
  enterVerificationCode: string;
  codeWillExpire: string;
  resendCode: string;
  continueText: string;
}

interface OtpVerificationScreenProps {
  maskedPhoneNumber: string;
  verificationCode: string;
  isLoading: boolean;
  countdown: number;
  canResend: boolean;
  resendCount: number;
  translations: OtpVerificationScreenTranslations;
  onOtpChange: (code: string) => void;
  onOtpComplete: (code: string) => void;
  onVerifyCode: () => void;
  onResendCode: () => void;
}

export const OtpVerificationScreen: React.FC<OtpVerificationScreenProps> = ({
  maskedPhoneNumber,
  verificationCode,
  isLoading,
  countdown,
  canResend,
  resendCount,
  translations,
  onOtpChange,
  onOtpComplete,
  onVerifyCode,
  onResendCode,
}) => {
  const { theme } = useTheme();
  const backgroundColor = theme.colors.background;

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView
        style={[forgotPasswordStyles.container, { backgroundColor }]}
      >
        <ThemedView style={forgotPasswordStyles.container}>
          <ThemedView style={forgotPasswordStyles.header}>
            <ThemedText style={forgotPasswordStyles.title}>
              {translations.resetPasswordTitle}
            </ThemedText>
            <ThemedText style={forgotPasswordStyles.description}>
              {translations.verificationCodeSent}
            </ThemedText>
            <ThemedText style={forgotPasswordStyles.phoneNumberDisplay}>
              {maskedPhoneNumber}
            </ThemedText>
          </ThemedView>

          <ThemedText style={forgotPasswordStyles.label}>
            {translations.enterVerificationCode}
          </ThemedText>

          <OtpInput
            numberOfDigits={6}
            onTextChange={onOtpChange}
            onFilled={onOtpComplete}
            autoFocus
            focusColor={theme.colors.primary}
            focusStickBlinkingDuration={500}
            theme={{
              containerStyle: forgotPasswordStyles.codeContainer,
              pinCodeContainerStyle: {
                ...forgotPasswordStyles.codeInput,
                backgroundColor: theme.colors.background,
              },
              pinCodeTextStyle: {
                ...forgotPasswordStyles.otpText,
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
            }}
          />

          {countdown > 0 ? (
            <ThemedText style={forgotPasswordStyles.countdown}>
              {translations.codeWillExpire.replace(
                '{seconds}',
                countdown.toString()
              )}
            </ThemedText>
          ) : (
            <ThemedView style={forgotPasswordStyles.resendContainer}>
              <Button
                onPress={onResendCode}
                title={`${translations.resendCode}${resendCount > 0 ? ` (${resendCount + 1})` : ''}`}
                type='clear'
                disabled={!canResend || isLoading}
                loading={isLoading}
                titleStyle={[
                  forgotPasswordStyles.resendText,
                  {
                    color: canResend && !isLoading ? '#4285F4' : '#9CA3AF',
                  },
                ]}
              />
            </ThemedView>
          )}

          <Button
            onPress={onVerifyCode}
            title={translations.continueText}
            buttonStyle={forgotPasswordStyles.submitButton}
            titleStyle={forgotPasswordStyles.buttonText}
            disabledTitleStyle={{
              color: '#999999',
            }}
            disabledStyle={{
              backgroundColor: '#4285F4',
              opacity: 0.5,
            }}
            disabled={isLoading || verificationCode.length !== 6}
            loading={isLoading}
          />
        </ThemedView>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
};
