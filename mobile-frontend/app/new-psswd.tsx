import { router } from 'expo-router';
import {
  Keyboard,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
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
import { registerForPushNotificationsAsync } from '@/utils/utils';
import { ICountry } from 'react-native-international-phone-number';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Button } from '@rneui/themed';
import { useTheme } from '@rneui/themed';
import Toast from 'react-native-root-toast';
import { PasswordRequirements } from '@/components/PasswordRequirements';

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
  strengthContainer: {
    marginTop: 15,
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

export default function NewPassword() {
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { language, i18n } = useContext(I18nContext);
  const { setSession } = useSession();
  const db = useSQLiteContext();
  const { theme } = useTheme();
  const backgroundColor = theme.colors.background;
  const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

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

  const passwordStrength = calculatePasswordStrength(password);

  const isPasswordValid = () => {
    const passwordRegex =
      /^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#%&/\\,><':;|_~`+=^$.()[\]{}?" ])(?=.{8,})/;
    return passwordRegex.test(password);
  };

  const handlePress = async () => {
    setErrorMessage('');

    if (!isPasswordValid()) {
      setErrorMessage('Please ensure all password requirements are met');
      return;
    }

    setIsLoading(true);

    try {
      let token = await AsyncStorage.getItem('expoPushToken');
      if (!token) {
        token = await registerForPushNotificationsAsync();
        if (!token) {
          setErrorMessage('Failed to retrieve push token');
          return;
        }
      }

      const phoneNumber = await AsyncStorage.getItem('phoneNumber');
      const country = JSON.parse(
        (await AsyncStorage.getItem('country')) as string
      ) as ICountry;

      const response = await fetch(`${apiUrl}/change-temp-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'Application/json',
        },
        body: JSON.stringify({
          phone_number: country.callingCode + phoneNumber?.replaceAll(' ', ''),
          temp_password: await AsyncStorage.getItem('temp_password'),
          new_password: password,
          token: token,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to change password');
      }

      const data: Session = await response.json();
      setSession(data.access_token);

      if (data.refresh_token) {
        await AsyncStorage.setItem('refresh_token', data.refresh_token);
      }

      await AsyncStorage.removeItem('temp_password');

      await db.runAsync(
        'INSERT INTO user (given_name, family_name, phone_number, email) VALUES ($given_name, $family_name, $phone_number, $email)',
        [
          data.user.given_name,
          data.user.family_name,
          data.user.phone_number,
          data.user.email,
        ]
      );

      Toast.show('Password changed successfully!', {
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
            <>
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
                password={password}
                requirements={{
                  minLength: i18n[language].minLength,
                  hasNumber: i18n[language].hasNumber,
                  hasUppercase: i18n[language].hasUppercase,
                  hasLowercase: i18n[language].hasLowercase,
                  hasSpecialChar: i18n[language].hasSpecialChar,
                }}
              />
            </>
          )}

          <Button
            onPress={handlePress}
            title={i18n[language].savePassword}
            buttonStyle={[
              styles.submitButton,
              { opacity: isPasswordValid() ? 1 : 0.6 },
            ]}
            disabled={!isPasswordValid() || isLoading}
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
