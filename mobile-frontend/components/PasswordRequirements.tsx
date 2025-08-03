import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@rneui/themed';

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
    passwordStrength: string;
    weak: string;
    medium: string;
    strong: string;
  };
}

export const PasswordRequirements: React.FC<PasswordRequirementsProps> = ({
  password,
  requirements,
}) => {
  const { theme } = useTheme();

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
        label: requirements.weak,
        color: '#DC2626',
      };
    } else if (score <= 4) {
      return {
        score: score * 20,
        label: requirements.medium,
        color: '#F59E0B',
      };
    } else {
      return {
        score: score * 20,
        label: requirements.strong,
        color: '#059669',
      };
    }
  };

  const requirementsList = checkRequirements(password);
  const passwordStrength = calculatePasswordStrength(password);

  return (
    <>
      {/* Password Strength Indicator - separate from requirements */}
      {password.length > 0 && (
        <View style={styles.strengthContainer}>
          <ThemedText style={styles.strengthLabel}>
            {requirements.passwordStrength}
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
            style={[styles.strengthText, { color: passwordStrength.color }]}
          >
            {passwordStrength.label}
          </ThemedText>
        </View>
      )}

      {/* Requirements List */}
      <View
        style={[
          styles.container,
          {
            backgroundColor: theme.mode === 'light' ? '#f8f9fa' : '#374151',
            borderColor: theme.mode === 'light' ? '#e9ecef' : '#4B5563',
          },
        ]}
      >
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
    </>
  );
};

const styles = StyleSheet.create({
  strengthContainer: {
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  strengthLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  strengthBar: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  strengthFill: {
    height: '100%',
    borderRadius: 4,
  },
  strengthText: {
    fontSize: 14,
    fontWeight: '600',
  },
  container: {
    marginTop: 10,
    marginBottom: 20,
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
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
