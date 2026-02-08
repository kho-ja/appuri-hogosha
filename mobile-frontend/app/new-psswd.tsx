import { router } from 'expo-router';
import {
  Keyboard,
  StyleSheet,
  TouchableWithoutFeedback,
  ScrollView,
} from 'react-native';
import { useSession } from '@/contexts/auth-context';
import { SafeAreaView } from 'react-native-safe-area-context';
import SecureInput from '@/components/atomic/secure-input';
import { I18nContext } from '@/contexts/i18n-context';
import React, { useContext, useState } from 'react';
import { Session } from '@/constants/types';
import { useSQLiteContext } from 'expo-sqlite';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { registerForPushNotificationsAsync } from '@/utils/notifications';
import { ICountry } from 'react-native-international-phone-number';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Button, useTheme } from '@rneui/themed';
import { showSuccessToast } from '@/utils/toast';
import { PasswordRequirements } from '@/components/PasswordRequirements';
import apiClient from '@/services/api-client';
import { usePasswordValidation } from '@/hooks/usePasswordValidation';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 12,
    alignContent: 'center',
  },
  scrollContainer: {
    flexGrow: 1,
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
    paddingBottom: 10,
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
    color: 'red',
    marginTop: 10,
    fontSize: 14,
  },
});

export default function NewPassword() {
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { language, i18n } = useContext(I18nContext);
  const { setSession } = useSession();
  const db = useSQLiteContext();
  const { theme } = useTheme();
  const backgroundColor = theme.colors.background;
  const { isValid: isPasswordValid } = usePasswordValidation(password);

  const handlePress = async () => {
    setErrorMessage('');

    if (!isPasswordValid) {
      setErrorMessage('Please ensure all password requirements are met');
      return;
    }

    setIsLoading(true);

    try {
      let token = await AsyncStorage.getItem('expoPushToken');
      if (!token) {
        token = (await registerForPushNotificationsAsync()) || null;
        if (!token) {
          setErrorMessage('Failed to retrieve push token');
          return;
        }
      }

      const phoneNumber = await AsyncStorage.getItem('phoneNumber');
      const country = JSON.parse(
        (await AsyncStorage.getItem('country')) as string
      ) as ICountry;

      const response = await apiClient.post<Session>(
        '/change-temp-password',
        {
          phone_number: country.callingCode + phoneNumber?.replaceAll(' ', ''),
          temp_password: await AsyncStorage.getItem('temp_password'),
          new_password: password,
          token: token,
        },
        { requiresAuth: false }
      );

      const data = response.data;
      setSession(data.access_token);

      if (data.refresh_token) {
        await AsyncStorage.setItem('refresh_token', data.refresh_token);
      }

      await AsyncStorage.removeItem('temp_password');

      // Clear existing user data and insert new
      await db.execAsync('DELETE FROM user');
      await db.runAsync(
        'INSERT INTO user (given_name, family_name, phone_number, email) VALUES (?, ?, ?, ?)',
        [
          data.user.given_name,
          data.user.family_name,
          data.user.phone_number,
          data.user.email,
        ]
      );

      showSuccessToast('Password changed successfully!');

      router.replace('/');
    } catch (error) {
      console.error('Error changing password:', error);
      setErrorMessage(
        error instanceof Error ? error.message : 'An error occurred'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView style={[styles.container, { backgroundColor }]}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          <ThemedView style={styles.header}>
            <ThemedView>
              <ThemedText style={styles.title}>
                {i18n[language].createNewPassword}
              </ThemedText>
              <ThemedText style={styles.subtitle}>
                Please create a secure password for your account
              </ThemedText>
            </ThemedView>
          </ThemedView>

          <SecureInput
            label={i18n[language].newpassword}
            placeholder={i18n[language].enterPassword}
            onChangeText={setPassword}
            maxLength={100}
            value={password}
            selectTextOnFocus
            textContentType='newPassword'
            autoCapitalize='none'
          />

          {password.length > 0 && (
            <PasswordRequirements
              password={password}
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
            onPress={handlePress}
            title={i18n[language].savePassword}
            buttonStyle={[
              styles.submitButton,
              { opacity: isPasswordValid ? 1 : 0.6 },
            ]}
            disabled={!isPasswordValid || isLoading}
            loading={isLoading}
          />

          {errorMessage !== '' && (
            <ThemedText style={styles.errorText}>{errorMessage}</ThemedText>
          )}
        </ScrollView>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}
