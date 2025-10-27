import React, { useCallback, useContext, useState } from 'react';
import {
  BackHandler,
  Keyboard,
  StyleSheet,
  TouchableWithoutFeedback,
  TouchableOpacity,
} from 'react-native';
import { useSession } from '@/contexts/auth-context';
import { SafeAreaView } from 'react-native-safe-area-context';
import SecureInput from '@/components/atomic/secure-input';
import { I18nContext } from '@/contexts/i18n-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMutation } from '@tanstack/react-query';
import { Button, useTheme } from '@rneui/themed';
import Toast from 'react-native-root-toast';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import ThemedPhoneInput from '@/components/atomic/ThemedPhoneInput';
import { ICountry } from 'react-native-international-phone-number';
import { ICountryCca2 } from 'react-native-international-phone-number/lib/interfaces/countryCca2';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ICountryName } from 'react-native-international-phone-number/lib/interfaces/countryName';

export default function SignIn() {
  const [password, setPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<ICountry | null>(null);
  const [backPressCount, setBackPressCount] = useState(0);
  const { signIn } = useSession();
  const { theme } = useTheme();
  const { language, i18n } = useContext(I18nContext);
  const router = useRouter();
  const params = useLocalSearchParams<{ phone?: string; code?: string }>();

  React.useEffect(() => {
    const loadCredentials = async () => {
      try {
        const storedPhoneNumber = await AsyncStorage.getItem('phoneNumber');
        const storedCountry = await AsyncStorage.getItem('country');
        if (storedPhoneNumber) setPhoneNumber(storedPhoneNumber);
        if (storedCountry) setSelectedCountry(JSON.parse(storedCountry));
      } catch (error) {
        console.error('Failed to load credentials from AsyncStorage', error);
      }
    };

    const initialize = async () => {
      await loadCredentials();
    };
    initialize();
  }, []);

  // If deep link provides ?phone= and/or ?code=, pre-fill inputs for convenience
  React.useEffect(() => {
    const phone = (params?.phone as string) || '';
    const code = (params?.code as string) || '';

    if (phone) {
      // Handle E.164 (e.g., +99890XXXXXXX) for Uzbekistan by default
      if (phone.startsWith('+998')) {
        setSelectedCountry({
          callingCode: '+998',
          cca2: 'UZ' as ICountryCca2,
          flag: '🇺🇿',
          name: { en: 'Uzbekistan' } as ICountryName,
        });
        setPhoneNumber(phone.replace('+998', ''));
      } else {
        // Fallback: keep as-is; user can adjust country selector
        setPhoneNumber(phone.replace(/^\+/, ''));
      }
    }
    if (code) {
      // For invites, code may be a temporary password
      setPassword(code);
    }
  }, [params]);

  const handleBackPress = useCallback(() => {
    if (backPressCount === 0) {
      Toast.show(i18n[language].pressBackAgainToExit, {
        duration: Toast.durations.SHORT,
        position: Toast.positions.BOTTOM,
        shadow: true,
        animation: true,
        hideOnPress: true,
        textColor: 'white',
        containerStyle: {
          backgroundColor: 'gray',
          borderRadius: 5,
        },
      });
      setBackPressCount(1);
      setTimeout(() => {
        setBackPressCount(0);
      }, 2000);
      return true;
    } else {
      BackHandler.exitApp();
      return true;
    }
  }, [backPressCount, i18n, language]);

  React.useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      handleBackPress
    );
    return () => backHandler.remove();
  }, [handleBackPress]);

  const { mutate, isPending } = useMutation({
    mutationFn: async () =>
      await signIn(selectedCountry, phoneNumber.replaceAll(' ', ''), password),
    onError: error => {
      // Check if this is a notification permission error
      if (
        error instanceof Error &&
        (error.name === 'NotificationPermissionError' ||
          error.message === 'NOTIFICATION_PERMISSION_DENIED')
      ) {
        Toast.show(i18n[language].loginFailedNotifications, {
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
      } else {
        Toast.show(i18n[language].loginFailed, {
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
    },
    onSuccess: async () => {
      await AsyncStorage.setItem('hasEverLoggedIn', 'true');

      Toast.show(i18n[language].loginSuccess, {
        duration: Toast.durations.SHORT,
        position: Toast.positions.BOTTOM - 120,
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

  const backgroundColor = theme.colors.background;

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView style={[styles.container, { backgroundColor }]}>
        <ThemedView style={styles.container}>
          <ThemedView style={styles.header}>
            <ThemedText style={styles.title}>
              {i18n[language].welcome.replace(', ', ',\n')}
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
          <SecureInput
            label={i18n[language].password}
            placeholder={i18n[language].enterPassword}
            placeholderTextColor='grey'
            onChangeText={setPassword}
            maxLength={50}
            value={password}
            selectTextOnFocus
            keyboardType='numbers-and-punctuation'
            textContentType='password'
            autoCapitalize='none'
          />
          <TouchableOpacity
            style={styles.forgotPasswordContainer}
            onPress={() => router.push('/forgot-password')}
          >
            <ThemedText style={styles.forgotPasswordText}>
              {i18n[language].forgotPasswordLink}
            </ThemedText>
          </TouchableOpacity>
          <Button
            onPress={() => mutate()}
            title={i18n[language].loginToAccount}
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
    fontSize: 40,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  forgotPasswordContainer: {
    alignItems: 'center',
    marginTop: 16,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: '#4285F4',
    textDecorationLine: 'underline',
  },
});
