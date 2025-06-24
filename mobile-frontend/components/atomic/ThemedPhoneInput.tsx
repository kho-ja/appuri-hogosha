import React from 'react';
import { View, Text, ViewStyle, StyleSheet } from 'react-native';
import PhoneInput, { ICountry } from 'react-native-international-phone-number';
import { useTheme } from '@rneui/themed';
import { ICountryCca2 } from 'react-native-international-phone-number/lib/interfaces/countryCca2';

interface ThemedPhoneInputProps {
  label?: string;
  value: string;
  onChangePhoneNumber: (phoneNumber: string) => void;
  selectedCountry: ICountry | null;
  onChangeSelectedCountry: (country: ICountry) => void;
  placeholder?: string;
  defaultCountry?: ICountryCca2;
  style?: ViewStyle;
  maxLength?: number;
  keyboardType?: 'phone-pad' | 'numeric' | 'default';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  selectTextOnFocus?: boolean;
  textContentType?: 'telephoneNumber' | 'none';
}

const ThemedPhoneInput: React.FC<ThemedPhoneInputProps> = ({
  label,
  value,
  onChangePhoneNumber,
  selectedCountry,
  onChangeSelectedCountry,
  placeholder,
  defaultCountry = 'UZ' as ICountryCca2,
  style,
  maxLength = 50,
  keyboardType = 'phone-pad',
  autoCapitalize = 'none',
  selectTextOnFocus = true,
  textContentType = 'telephoneNumber',
}) => {
  const { theme } = useTheme();

  const styles = StyleSheet.create({
    container: {
      marginBottom: 16,
    },
    label: {
      fontSize: 16,
      marginBottom: 4,
      color: theme.mode === 'light' ? 'black' : 'white',
    },
    phoneInputContainer: {
      backgroundColor: theme.colors.background,
      borderColor: theme.mode === 'light' ? '#D1D5DB' : '#374151',
      borderWidth: 1,
      borderRadius: 4,
      height: 48,
    },
  });

  return (
    <View style={[styles.container, style]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={styles.phoneInputContainer}>
        <PhoneInput
          defaultCountry={defaultCountry}
          value={value}
          onChangePhoneNumber={onChangePhoneNumber}
          selectedCountry={selectedCountry}
          onChangeSelectedCountry={onChangeSelectedCountry}
          textContentType={textContentType}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          maxLength={maxLength}
          selectTextOnFocus={selectTextOnFocus}
          placeholder={placeholder}
          placeholderTextColor='grey'
          phoneInputStyles={{
            container: {
              backgroundColor: 'transparent',
              borderWidth: 0,
            },
            input: {
              color: theme.mode === 'light' ? 'black' : 'white',
              backgroundColor: 'transparent',
            },
            flagContainer: {
              backgroundColor: 'transparent',
            },
            callingCode: {
              backgroundColor: theme.colors.background,
              color: theme.mode === 'light' ? 'black' : 'white',
            },
            caret: {
              color: theme.mode === 'light' ? 'black' : 'white',
            },
          }}
          modalStyles={{
            modal: {
              backgroundColor: theme.colors.background,
            },
            backdrop: {
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
            },
            divider: {
              backgroundColor: theme.mode === 'light' ? '#E5E7EB' : '#374151',
            },
            countryButton: {
              backgroundColor: theme.colors.background,
              borderBottomColor: theme.mode === 'light' ? '#E5E7EB' : '#374151',
            },
            searchInput: {
              backgroundColor: theme.colors.background,
              color: theme.mode === 'light' ? 'black' : 'white',
              borderColor: theme.mode === 'light' ? '#D1D5DB' : '#374151',
            },
            countryName: {
              color: theme.mode === 'light' ? 'black' : 'white',
            },
            callingCode: {
              color: theme.mode === 'light' ? 'black' : 'white',
            },
          }}
        />
      </View>
    </View>
  );
};

export default ThemedPhoneInput;
