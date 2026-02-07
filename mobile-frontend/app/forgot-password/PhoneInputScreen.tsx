import React from 'react';
import {
  Keyboard,
  TouchableWithoutFeedback,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ICountry } from 'react-native-international-phone-number';
import { ICountryCca2 } from 'react-native-international-phone-number/lib/interfaces/countryCca2';
import ThemedPhoneInput from '@/components/atomic/ThemedPhoneInput';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useTheme, Button } from '@rneui/themed';
import { useRouter } from 'expo-router';
import { forgotPasswordStyles } from './styles';

interface PhoneInputScreenTranslations {
  resetPasswordTitle: string;
  enterPhoneNumberText: string;
  phoneNumber: string;
  sendCode: string;
  backToSignIn: string;
}

interface PhoneInputScreenProps {
  phoneNumber: string;
  selectedCountry: ICountry;
  isLoading: boolean;
  translations: PhoneInputScreenTranslations;
  onPhoneChange: (number: string) => void;
  onCountryChange: (country: ICountry) => void;
  onSendCode: () => void;
}

export const PhoneInputScreen: React.FC<PhoneInputScreenProps> = ({
  phoneNumber,
  selectedCountry,
  isLoading,
  translations,
  onPhoneChange,
  onCountryChange,
  onSendCode,
}) => {
  const { theme } = useTheme();
  const router = useRouter();
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
              {translations.enterPhoneNumberText}
            </ThemedText>
          </ThemedView>

          <ThemedPhoneInput
            label={translations.phoneNumber}
            value={phoneNumber}
            onChangePhoneNumber={onPhoneChange}
            selectedCountry={selectedCountry}
            onChangeSelectedCountry={onCountryChange}
            placeholder={translations.phoneNumber}
            defaultCountry={'UZ' as ICountryCca2}
          />

          <Button
            onPress={onSendCode}
            title={translations.sendCode}
            buttonStyle={forgotPasswordStyles.submitButton}
            titleStyle={forgotPasswordStyles.buttonText}
            disabled={isLoading}
            loading={isLoading}
          />

          <TouchableOpacity
            style={forgotPasswordStyles.backToSignInContainer}
            onPress={() => router.push('/sign-in')}
          >
            <ThemedText style={forgotPasswordStyles.backToSignInText}>
              {translations.backToSignIn}
            </ThemedText>
          </TouchableOpacity>
        </ThemedView>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
};
