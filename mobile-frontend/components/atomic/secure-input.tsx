import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Input, { AdvancedInputProps } from '@/components/atomic/input';
import { useTheme } from '@rneui/themed';

const styles = StyleSheet.create({
  inputIcon: {
    position: 'absolute',
    right: 10,
    top: '55%',
    transform: [{ translateY: -12 }],
  },
});

const SecureInput: React.FC<AdvancedInputProps> = props => {
  const { theme } = useTheme();
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const handleIconPress = () => {
    setIsPasswordVisible(!isPasswordVisible);
  };

  return (
    <View>
      <Input
        {...props}
        secureTextEntry={!isPasswordVisible}
        style={{ color: theme.mode === 'light' ? 'black' : 'white' }}
      />
      <TouchableOpacity style={styles.inputIcon} onPress={handleIconPress}>
        <MaterialIcons
          name={isPasswordVisible ? 'visibility' : 'visibility-off'}
          size={24}
          color={theme.mode === 'light' ? 'black' : 'white'}
        />
      </TouchableOpacity>
    </View>
  );
};

export default SecureInput;
