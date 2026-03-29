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

export interface ForgotPasswordVerifyResponse {
  message: string;
  reset_token: string;
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
): Promise<ForgotPasswordVerifyResponse> => {  // ✅ tip o'zgardi
  const fullPhoneNumber = phoneNumber.startsWith('+')
    ? phoneNumber
    : `+${phoneNumber}`;

  const response = await apiClient.post<ForgotPasswordVerifyResponse>(
    '/forgot-password-verify-code',
    {
      phone_number: fullPhoneNumber,
      verification_code: code,
    },
    { requiresAuth: false }
  );

  return response.data;
};

/**
 * Reset password with verification code and new password
 */
export const resetPassword = async (
  phoneNumber: string,
  newPassword: string,
  resetToken: string
): Promise<ForgotPasswordConfirmResponse> => {
  const fullPhoneNumber = phoneNumber.startsWith('+')
    ? phoneNumber
    : `+${phoneNumber}`;

  const response = await apiClient.post<ForgotPasswordConfirmResponse>(
    '/forgot-password-set-password',
    {
      phone_number: fullPhoneNumber,
      new_password: newPassword,
      reset_token: resetToken,
    },
    { requiresAuth: false }
  );

  return response.data;
};
