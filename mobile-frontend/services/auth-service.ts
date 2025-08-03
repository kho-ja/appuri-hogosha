// Create this file: mobile-frontend/services/auth-service.ts

const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

export interface ForgotPasswordInitiateResponse {
  message: string;
}

export interface ForgotPasswordConfirmResponse {
  message: string;
}

export interface ApiError {
  error: string;
}

/**
 * Send verification code to user's phone number for password reset
 */
export const sendVerificationCode = async (
  countryCode: string,
  phoneNumber: string
): Promise<ForgotPasswordInitiateResponse> => {
  const fullPhoneNumber = `${countryCode}${phoneNumber.replaceAll(' ', '')}`;

  const response = await fetch(`${apiUrl}/forgot-password-initiate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      phone_number: fullPhoneNumber,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to send verification code');
  }

  return data;
};

/**
 * Verify reset code sent to user's phone
 */
export const verifyResetCode = async (
  phoneNumber: string,
  code: string
): Promise<boolean> => {
  // Note: This is just verification, we don't actually call an API yet
  // The actual password reset happens in resetPassword function
  // But we can simulate verification if needed

  if (code.length !== 6) {
    throw new Error('Verification code must be 6 digits');
  }

  // For now, we'll just validate the format
  // The actual verification happens in the confirm step
  return true;
};

/**
 * Reset password with verification code and new password
 */
export const resetPassword = async (
  phoneNumber: string,
  verificationCode: string,
  newPassword: string
): Promise<ForgotPasswordConfirmResponse> => {
  // Parse phone number to get country code and clean number
  // Assuming phoneNumber is in format like "+1234567890" or "1234567890"
  const fullPhoneNumber = phoneNumber.startsWith('+')
    ? phoneNumber
    : `+${phoneNumber}`;

  const response = await fetch(`${apiUrl}/forgot-password-confirm`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      phone_number: fullPhoneNumber,
      verification_code: verificationCode,
      new_password: newPassword,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to reset password');
  }

  return data;
};
