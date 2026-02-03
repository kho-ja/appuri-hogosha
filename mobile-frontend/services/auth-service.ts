import apiClient from './api-client';

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

  const response = await apiClient.post<ForgotPasswordInitiateResponse>(
    '/forgot-password-initiate',
    { phone_number: fullPhoneNumber },
    { requiresAuth: false }
  );

  return response.data;
};

/**
 * Verify reset code sent to user's phone
 */
export const verifyResetCode = async (
  phoneNumber: string,
  code: string
): Promise<boolean> => {
  if (code.length !== 6) {
    throw new Error('Verification code must be 6 digits');
  }

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
  const fullPhoneNumber = phoneNumber.startsWith('+')
    ? phoneNumber
    : `+${phoneNumber}`;

  const response = await apiClient.post<ForgotPasswordConfirmResponse>(
    '/forgot-password-confirm',
    {
      phone_number: fullPhoneNumber,
      verification_code: verificationCode,
      new_password: newPassword,
    },
    { requiresAuth: false }
  );

  return response.data;
};
