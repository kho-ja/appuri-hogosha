import { ICountry } from 'react-native-international-phone-number';

export type ForgotPasswordStep = 'phone' | 'verify' | 'newPassword';

export interface ForgotPasswordState {
  phoneNumber: string;
  selectedCountry: ICountry;
  verificationCode: string;
  newPassword: string;
  isLoading: boolean;
  countdown: number;
  canResend: boolean;
  resendCount: number;
  expiryAt: number | null;
}

// Function to mask phone number
export const maskPhoneNumber = (
  phoneNumber: string,
  countryCode: string
): string => {
  if (!phoneNumber) return '';

  const cleanNumber = phoneNumber.replace(/\D/g, '');
  if (cleanNumber.length < 4) return `${countryCode} ${phoneNumber}`;

  const visibleStart = cleanNumber.substring(0, 2);
  const visibleEnd = cleanNumber.substring(cleanNumber.length - 2);
  const middleMask = '*'.repeat(Math.max(0, cleanNumber.length - 4));

  return `${countryCode} ${visibleStart} ${middleMask} ${visibleEnd}`;
};

// Password validation functions
export const validatePassword = (password: string) => {
  const minLength = password.length >= 8;
  const hasNumber = /\d/.test(password);
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasSpecialChar = /[!@#%&/\\,><':;|_~`+=^$.()[\]{}?"*-]/.test(password);

  return {
    minLength,
    hasNumber,
    hasUppercase,
    hasLowercase,
    hasSpecialChar,
    isValid:
      minLength && hasNumber && hasUppercase && hasLowercase && hasSpecialChar,
  };
};

export const normalizePhoneNumber = (
  rawPhone: string,
  callingCode: string
): string => {
  if (!rawPhone) return callingCode;

  let phone = rawPhone.replace(/\s+/g, '').replace(/-/g, '');

  // If starts with 00 → change to +
  if (phone.startsWith('00')) {
    phone = `+${phone.slice(2)}`;
  }

  // If starts with + → return directly
  if (phone.startsWith('+')) {
    return phone;
  }

  // If starts with 0 → remove it
  if (phone.startsWith('0')) {
    phone = phone.slice(1);
  }

  // Add country code at the beginning
  return `${callingCode}${phone}`;
};

export const EXPIRY_KEY = 'forgot_password_code_expiry';
