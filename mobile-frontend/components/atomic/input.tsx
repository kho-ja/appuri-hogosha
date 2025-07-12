import React from 'react';
import { TextInput, View, Text, TextInputProps } from 'react-native';
import { useTheme } from '@rneui/themed';

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
            color: theme.mode === 'light' ? 'black' : 'white',
          }}
        >
          {label}
        </Text>
      )}
      <TextInput
        style={{
          height: 48,
          borderRadius: 4,
          justifyContent: 'center',
          paddingHorizontal: 10,
          borderWidth: 1,
          borderColor: '#D1D5DB',
          color: theme.mode === 'light' ? 'black' : 'white',
        }}
        placeholderTextColor={theme.mode === 'light' ? '#6B7280' : '#9CA3AF'}
        {...props}
      />
    </View>
  );
};

export default Input;
