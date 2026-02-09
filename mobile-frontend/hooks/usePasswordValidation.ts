import { useMemo } from 'react';

export interface PasswordValidation {
  minLength: boolean;
  hasNumber: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasSpecialChar: boolean;
  isValid: boolean;
}

export interface PasswordStrength {
  score: number;
  level: 'weak' | 'medium' | 'strong';
  percentage: number;
}

// Special characters regex pattern (shared with PasswordRequirements component)
const SPECIAL_CHAR_REGEX = /[!@#%&/\\,><':;|_~`+=^$.()[\]{}?" -]/;

/**
 * Validates password against all requirements
 */
export function validatePassword(password: string): PasswordValidation {
  const minLength = password.length >= 8;
  const hasNumber = /\d/.test(password);
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasSpecialChar = SPECIAL_CHAR_REGEX.test(password);

  return {
    minLength,
    hasNumber,
    hasUppercase,
    hasLowercase,
    hasSpecialChar,
    isValid:
      minLength && hasNumber && hasUppercase && hasLowercase && hasSpecialChar,
  };
}

/**
 * Calculates password strength based on met requirements
 */
export function calculatePasswordStrength(password: string): PasswordStrength {
  const validation = validatePassword(password);

  let score = 0;
  if (validation.minLength) score++;
  if (validation.hasNumber) score++;
  if (validation.hasUppercase) score++;
  if (validation.hasLowercase) score++;
  if (validation.hasSpecialChar) score++;

  const percentage = score * 20;

  if (score <= 2) {
    return { score, level: 'weak', percentage };
  } else if (score <= 4) {
    return { score, level: 'medium', percentage };
  } else {
    return { score, level: 'strong', percentage };
  }
}

/**
 * Legacy regex check for backward compatibility
 * Matches the regex used in new-psswd.tsx and change-psswd.tsx
 */
export function isPasswordValidLegacy(password: string): boolean {
  const passwordRegex =
    /^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#%&/\\,><':;|_~`+=^$.()[\]{}?" ])(?=.{8,})/;
  return passwordRegex.test(password);
}

export interface UsePasswordValidationResult {
  validation: PasswordValidation;
  strength: PasswordStrength;
  isValid: boolean;
}

/**
 * React hook for password validation with memoization
 * @param password - The password to validate
 * @returns Validation result with detailed checks and strength
 */
export function usePasswordValidation(
  password: string
): UsePasswordValidationResult {
  return useMemo(() => {
    const validation = validatePassword(password);
    const strength = calculatePasswordStrength(password);

    return {
      validation,
      strength,
      isValid: validation.isValid,
    };
  }, [password]);
}
