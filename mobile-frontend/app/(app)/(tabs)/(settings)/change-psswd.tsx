import { router } from 'expo-router';
import { colors } from '@/constants/Colors';
import {
  StyleSheet,
  View,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import SecureInput from '@/components/atomic/secure-input';
import { I18nContext } from '@/contexts/i18n-context';
import React, { useContext, useState, useRef } from 'react';
import { showSuccessToast, showErrorToast } from '@/utils/toast';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Button, useTheme } from '@rneui/themed';
import { useMutation } from '@tanstack/react-query';
import { PasswordRequirements } from '@/components/PasswordRequirements';
import apiClient from '@/services/api-client';
import { usePasswordValidation } from '@/hooks/usePasswordValidation';

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeAreaContainer: {
    flex: 1,
    padding: 16,
  },
  contentContainer: {
    padding: 16,
    flex: 1,
    paddingBottom: 120,
  },
  scrollContainer: {
    flexGrow: 1,
    minHeight: '100%',
  },
  submitButton: {
    padding: 16,
    borderRadius: 4,
    alignItems: 'center',
    backgroundColor: colors.success,
    marginTop: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  title: {
    fontWeight: 'bold',
    fontSize: 24,
  },
  subtitle: {
    color: 'gray',
    fontSize: 16,
    marginTop: 5,
  },
  errorText: {
    color: colors.error,
    marginTop: 10,
    marginBottom: 15,
    fontSize: 14,
    textAlign: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  strengthAndRequirementsContainer: {
    marginTop: 15,
    marginBottom: 10,
  },
  inputsContainer: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  buttonWrapper: {
    flexShrink: 0,
    marginTop: 'auto',
  },
});

export default function Index() {
  const { language, i18n } = useContext(I18nContext);
  const { theme } = useTheme();
  const backgroundColor = theme.colors.background;
  const scrollViewRef = useRef<ScrollView>(null);

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const { isValid: isPasswordValid } = usePasswordValidation(newPassword);

  const changePassword = async () => {
    const response = await apiClient.post('/change-password', {
      previous_password: oldPassword,
      new_password: newPassword,
    });

    return response.data;
  };

  const { mutate, isPending } = useMutation({
    mutationFn: changePassword,
    onSuccess: () => {
      showSuccessToast(i18n[language].passwordChangedSuccess);

      router.back();
    },
    onError: (error: any) => {
      let translatedMessage = i18n[language].invalidCurrentPassword;

      // Debug: check error structure
      console.log('Error details:', {
        status: error.response?.status,
        errorStatus: error.status,
        message: error.message,
      });

      // If not 401, show password requirements message
      if (error.response?.status !== 401 && error.status !== 401) {
        translatedMessage = i18n[language].passwordRequirementsNotMet;
      }

      setErrorMessage(translatedMessage);
      console.error(error);
    },
  });

  const handlePress = () => {
    setErrorMessage('');

    const validations = [
      {
        condition: !oldPassword.trim(),
        message: i18n[language].enterOldPassword,
      },
      {
        condition: !isPasswordValid,
        message: i18n[language].pleaseEnsurePasswordRequirements,
      },
      {
        condition: newPassword !== confirmPassword,
        message: i18n[language].passwordsDoNotMatch,
      },
      {
        condition: oldPassword === newPassword,
        message: i18n[language].newPasswordMustBeDifferent,
      },
    ];

    for (const validation of validations) {
      if (validation.condition) {
        setErrorMessage(validation.message);
        showErrorToast(validation.message);
        return;
      }
    }

    mutate();
  };

  const handleConfirmPasswordFocus = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 200);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor }]}
      enabled={true}
    >
      <ScrollView
        ref={scrollViewRef}
        style={[styles.container, { backgroundColor }]}
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps='handled'
        scrollEnabled={true}
      >
        <View style={[styles.contentContainer, { backgroundColor }]}>
          <View style={styles.inputsContainer}>
            <ThemedView style={styles.header}>
              <ThemedView>
                <ThemedText style={styles.title}>
                  {i18n[language].changePassword}
                </ThemedText>
                <ThemedText style={styles.subtitle}>
                  {i18n[language].changePasswordText}
                </ThemedText>
              </ThemedView>
            </ThemedView>

            {errorMessage !== '' && (
              <ThemedText
                style={[
                  styles.errorText,
                  {
                    backgroundColor:
                      theme.mode === 'light' ? '#FEF2F2' : '#450A0A',
                    borderColor: theme.mode === 'light' ? '#FECACA' : '#7F1D1D',
                  },
                ]}
              >
                {errorMessage}
              </ThemedText>
            )}

            <SecureInput
              label={i18n[language].currentPassword}
              placeholder={i18n[language].enterOldPassword}
              onChangeText={setOldPassword}
              value={oldPassword}
              textContentType='password'
              autoCapitalize='none'
            />

            <SecureInput
              label={i18n[language].newPassword}
              placeholder={i18n[language].enterNewPassword}
              onChangeText={setNewPassword}
              value={newPassword}
              textContentType='newPassword'
              autoCapitalize='none'
            />

            {newPassword.length > 0 && (
              <View style={styles.strengthAndRequirementsContainer}>
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
              </View>
            )}

            <SecureInput
              label={i18n[language].confirmPassword}
              placeholder={i18n[language].enterConfirmPassword}
              onChangeText={setConfirmPassword}
              value={confirmPassword}
              textContentType='newPassword'
              autoCapitalize='none'
              onFocus={handleConfirmPasswordFocus}
            />
          </View>

          <View style={styles.buttonWrapper}>
            <Button
              onPress={handlePress}
              title={i18n[language].savePassword}
              buttonStyle={styles.submitButton}
              disabled={isPending}
              loading={isPending}
            />
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
