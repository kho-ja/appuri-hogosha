import React from 'react';
import { TextInput, View, Text, TextInputProps } from 'react-native';
import { useTheme } from '@rneui/themed';
import { colors } from '@/constants/Colors';

export interface AdvancedInputProps extends TextInputProps {
  label?: string;
  style?: object;
}

const Input: React.FC<AdvancedInputProps> = ({ label, style, ...props }) => {
  const { theme } = useTheme();

  return (
    <View style={{ ...style, width: '100%', marginBottom: 16 }}>
      {label && (
        <Text
          style={{
            fontSize: 16,
            marginBottom: 4,
            color: theme.mode === 'light' ? '#4f5259' : 'white',
            fontWeight: '500',
          }}
        >
          {label}
        </Text>
      )}
      <TextInput
        style={{
          height: 58,
          borderRadius: 10,
          justifyContent: 'center',
          paddingHorizontal: 10,
          borderWidth: 1,
          borderColor: colors.gray300,
          color: theme.mode === 'light' ? 'black' : 'white',
        }}
        placeholderTextColor={
          theme.mode === 'light' ? colors.gray500 : colors.gray400
        }
        {...props}
      />
    </View>
  );
};

export default Input;
