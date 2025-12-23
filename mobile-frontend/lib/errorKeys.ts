/**
 * Error message keys for translations
 * These are the keys that will be looked up in the i18n translation objects
 */

export const ERROR_MESSAGE_KEYS = {
  // Authentication errors
  LOGIN_FAILED: 'loginFailed',
  AUTH_FAILED: 'authenticationFailed',
  INCORRECT_CREDENTIALS: 'incorrectCredentials',

  // Phone number errors
  PHONE_NOT_FOUND: 'phoneNumberNotFound',
  INVALID_PHONE: 'invalidPhoneNumber',

  // OTP errors
  INVALID_OTP: 'invalidOtp',
  OTP_EXPIRED: 'otpExpired',

  // Network errors
  NETWORK_ERROR: 'networkError',
  TIMEOUT: 'requestTimeout',
  SERVICE_UNAVAILABLE: 'serviceUnavailable',
  SERVER_ERROR: 'serverError',

  // Rate limit
  TOO_MANY_ATTEMPTS: 'tooManyAttempts',
} as const;
