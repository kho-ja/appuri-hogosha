import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';

interface PasswordRequirement {
  met: boolean;
  text: string;
}

interface PasswordRequirementsProps {
  password: string;
  requirements: {
    minLength: string;
    hasNumber: string;
    hasUppercase: string;
    hasLowercase: string;
    hasSpecialChar: string;
  };
}

export const PasswordRequirements: React.FC<PasswordRequirementsProps> = ({
  password,
  requirements,
}) => {
  const checkRequirements = (password: string): PasswordRequirement[] => {
    return [
      {
        met: password.length >= 8,
        text: requirements.minLength,
      },
      {
        met: /[0-9]/.test(password),
        text: requirements.hasNumber,
      },
      {
        met: /[A-Z]/.test(password),
        text: requirements.hasUppercase,
      },
      {
        met: /[a-z]/.test(password),
        text: requirements.hasLowercase,
      },
      {
        met: /[!@#%&/\\,><':;|_~`+=^$.()[\]{}?" ]/.test(password),
        text: requirements.hasSpecialChar,
      },
    ];
  };

  const requirementsList = checkRequirements(password);

  return (
    <View style={styles.container}>
      {requirementsList.map((requirement, index) => (
        <View key={index} style={styles.requirementRow}>
          <Ionicons
            name={requirement.met ? 'checkmark-circle' : 'close-circle'}
            size={20}
            color={requirement.met ? '#059669' : '#DC2626'}
            style={styles.icon}
          />
          <ThemedText
            style={[
              styles.requirementText,
              { color: requirement.met ? '#059669' : '#DC2626' },
            ]}
          >
            {requirement.text}
          </ThemedText>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 10,
    marginBottom: 20,
    padding: 15,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  requirementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  icon: {
    marginRight: 10,
  },
  requirementText: {
    fontSize: 14,
    flex: 1,
  },
});
