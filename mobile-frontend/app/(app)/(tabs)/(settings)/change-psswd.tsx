import { router } from 'expo-router';
import {
  StyleSheet,
  View,
  ScrollView,
} from 'react-native';
import { useSession } from '@/contexts/auth-context';
import { SafeAreaView } from 'react-native-safe-area-context';
import SecureInput from '@/components/atomic/secure-input';
import { I18nContext } from '@/contexts/i18n-context';
import React, { useContext, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-root-toast';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Button, useTheme } from '@rneui/themed';
import { useMutation } from '@tanstack/react-query';
import { PasswordRequirements } from '@/components/PasswordRequirements';

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
  },
  scrollContainer: {
    flexGrow: 1,
    minHeight: '100%',
  },
  submitButton: {
    padding: 16,
    borderRadius: 4,
    alignItems: 'center',
    backgroundColor: '#059669',
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
    color: '#DC2626',
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
  strengthContainer: {
    marginBottom: 10,
  },
  strengthLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  strengthBar: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#e9ecef',
    overflow: 'hidden',
  },
  strengthFill: {
    height: '100%',
    borderRadius: 4,
  },
  strengthText: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 5,
  },
});

export default function Index() {
  const { session } = useSession();
  const { language, i18n } = useContext(I18nContext);
  const { theme } = useTheme();
  const backgroundColor = theme.colors.background;
  const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
  
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isStrengthIndicatorHidden, setIsStrengthIndicatorHidden] = useState(false);

  // Password strength calculation
  const calculatePasswordStrength = (
    password: string
  ): { score: number; label: string; color: string } => {
    let score = 0;

    if (password.length >= 8) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[!@#%&/\\,><':;|_~`+=^$.()[\]{}?" ]/.test(password)) score++;

    if (score <= 2) {
      return {
        score: score * 20,
        label: i18n[language].weak,
        color: '#DC2626',
      };
    } else if (score <= 4) {
      return {
        score: score * 20,
        label: i18n[language].medium,
        color: '#F59E0B',
      };
    } else {
      return {
        score: score * 20,
        label: i18n[language].strong,
        color: '#059669',
      };
    }
  };

  const passwordStrength = calculatePasswordStrength(newPassword);

  const isPasswordValid = () => {
    const passwordRegex =
      /^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#%&/\\,><':;|_~`+=^$.()[\]{}?" ])(?=.{8,})/;
    return passwordRegex.test(newPassword);
  };

  const changePassword = async () => {
    const response = await fetch(`${apiUrl}/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session}`,
      },
      body: JSON.stringify({
        previous_password: oldPassword,
        new_password: newPassword,
      }),
    });

    const responseData = await response.json();

    if (!response.ok) {
      throw new Error(responseData.error);
    }

    return responseData;
  };

  const { mutate, isPending } = useMutation({
    mutationFn: changePassword,
    onSuccess: () => {
      Toast.show(i18n[language].passwordChangedSuccess, {
        duration: Toast.durations.SHORT,
        position: Toast.positions.BOTTOM,
        shadow: true,
        animation: true,
        hideOnPress: true,
        containerStyle: {
          backgroundColor: '#059669',
          borderRadius: 5,
        },
      });

      router.back();
    },
    onError: (error: Error) => {
      setErrorMessage(error.message);
      console.error(error);
    },
  });

  const handlePress = () => {
    setErrorMessage('');

    // Validation
    if (!oldPassword.trim()) {
      setErrorMessage(i18n[language].enterOldPassword);
      return;
    }

    if (!isPasswordValid()) {
      setErrorMessage(i18n[language].pleaseEnsurePasswordRequirements);
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage(i18n[language].passwordsDoNotMatch);
      return;
    }

    if (oldPassword === newPassword) {
      setErrorMessage(i18n[language].newPasswordMustBeDifferent);
      return;
    }
    mutate();
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor }]}
      contentContainerStyle={styles.scrollContainer}
      showsVerticalScrollIndicator={false}
    >
      <SafeAreaView style={[styles.container, { backgroundColor }]}>
        <View style={[styles.contentContainer, { backgroundColor }]}>
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
            <ThemedText style={[
              styles.errorText,
              {
                backgroundColor: theme.mode === 'light' ? '#FEF2F2' : '#450A0A',
                borderColor: theme.mode === 'light' ? '#FECACA' : '#7F1D1D',
              }
            ]}>
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
            onChangeText={(text) => {
              setNewPassword(text);
              // if the password is empty or weak, show the strength indicator
              if (text.length === 0 || calculatePasswordStrength(text).score < 100) {
                setIsStrengthIndicatorHidden(false);
              }
            }}
            value={newPassword}
            textContentType='newPassword'
            autoCapitalize='none'
          />

          {newPassword.length > 0 && !isStrengthIndicatorHidden && (
            <View style={styles.strengthAndRequirementsContainer}>
              <ThemedView style={styles.strengthContainer}>
                <ThemedText style={styles.strengthLabel}>
                  {i18n[language].passwordStrength}
                </ThemedText>
                <View style={styles.strengthBar}>
                  <View
                    style={[
                      styles.strengthFill,
                      {
                        width: `${passwordStrength.score}%`,
                        backgroundColor: passwordStrength.color,
                      },
                    ]}
                  />
                </View>
                <ThemedText
                  style={[
                    styles.strengthText,
                    { color: passwordStrength.color },
                  ]}
                >
                  {passwordStrength.label}
                </ThemedText>
              </ThemedView>

              <PasswordRequirements
                password={newPassword}
                requirements={{
                  minLength: i18n[language].minLength,
                  hasNumber: i18n[language].hasNumber,
                  hasUppercase: i18n[language].hasUppercase,
                  hasLowercase: i18n[language].hasLowercase,
                  hasSpecialChar: i18n[language].hasSpecialChar,
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
            onFocus={() => {
              // if the password is strong, hide the strength indicator
              if (passwordStrength.score >= 100) {
                setIsStrengthIndicatorHidden(true);
              }
            }}
          />

          <Button
            onPress={handlePress}
            title={i18n[language].savePassword}
            buttonStyle={styles.submitButton}
            disabled={isPending}
            loading={isPending}
          />
        </View>
      </SafeAreaView>
    </ScrollView>
  );
}
