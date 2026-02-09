import React from 'react';
import { Keyboard, TouchableWithoutFeedback } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SecureInput from '@/components/atomic/secure-input';
import { PasswordRequirements } from '@/components/PasswordRequirements';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useTheme, Button } from '@rneui/themed';
import { forgotPasswordStyles } from './styles';
import { colors } from '@/constants/Colors';
import { validatePassword } from './types';

interface PasswordRequirementsTranslations {
  minLength: string;
  hasNumber: string;
  hasUppercase: string;
  hasLowercase: string;
  hasSpecialChar: string;
  passwordStrength: string;
  weak: string;
  medium: string;
  strong: string;
}

interface ResetPasswordScreenTranslations {
  createNewPasswordTitle: string;
  enterNewPasswordText: string;
  newPassword: string;
  enterNewPassword: string;
  saveNewPassword: string;
  requirements: PasswordRequirementsTranslations;
}

interface ResetPasswordScreenProps {
  newPassword: string;
  isLoading: boolean;
  translations: ResetPasswordScreenTranslations;
  onPasswordChange: (password: string) => void;
  onSavePassword: () => void;
}

export const ResetPasswordScreen: React.FC<ResetPasswordScreenProps> = ({
  newPassword,
  isLoading,
  translations,
  onPasswordChange,
  onSavePassword,
}) => {
  const { theme } = useTheme();
  const backgroundColor = theme.colors.background;
  const passwordValidation = validatePassword(newPassword);

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView
        style={[forgotPasswordStyles.container, { backgroundColor }]}
      >
        <ThemedView style={forgotPasswordStyles.container}>
          <ThemedView style={forgotPasswordStyles.header}>
            <ThemedText style={forgotPasswordStyles.title}>
              {translations.createNewPasswordTitle}
            </ThemedText>
            <ThemedText style={forgotPasswordStyles.description}>
              {translations.enterNewPasswordText}
            </ThemedText>
          </ThemedView>

          <SecureInput
            label={translations.newPassword}
            placeholder={translations.enterNewPassword}
            placeholderTextColor='grey'
            onChangeText={onPasswordChange}
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
              requirements={translations.requirements}
            />
          )}

          <Button
            onPress={onSavePassword}
            title={translations.saveNewPassword}
            buttonStyle={forgotPasswordStyles.submitButton}
            titleStyle={forgotPasswordStyles.buttonText}
            disabledTitleStyle={{
              color: '#999999',
            }}
            disabledStyle={{
              backgroundColor: colors.primary,
              opacity: 0.5,
            }}
            disabled={isLoading || !passwordValidation.isValid}
            loading={isLoading}
          />
        </ThemedView>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
};
