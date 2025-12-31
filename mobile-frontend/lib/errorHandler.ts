/**
 * Error handling and message mapping for authentication flows
 * Maps backend error codes/messages to user-friendly i18n strings
 */

export interface AuthError {
  code?: string;
  message: string;
  status?: number;
  userMessage: string; // User-friendly message key or text
}

export class AuthErrorHandler {
  /**
   * Parse and map API error responses to user-friendly messages
   */
  static parseError(error: any): AuthError {
    // Handle network/fetch errors
    if (error instanceof TypeError) {
      return {
        message: error.message,
        userMessage: 'networkError',
      };
    }

    // Handle errors with explicit status
    if (error.status) {
      return {
        status: error.status,
        message: error.message,
        userMessage: this.mapErrorByStatus(error.status, error.message),
      };
    }

    // Handle JSON response errors
    if (error.response?.status) {
      return {
        status: error.response.status,
        message: error.response.data?.error || error.message,
        userMessage: this.mapErrorByStatus(
          error.response.status,
          error.response.data?.error
        ),
      };
    }

    // Handle generic errors - check message for common patterns
    const errorMessage = error.message || String(error);
    const lowerMessage = errorMessage.toLowerCase();

    // Check for specific error patterns in the message
    if (
      lowerMessage.includes('too many') ||
      lowerMessage.includes('rate limit')
    ) {
      return {
        message: errorMessage,
        userMessage: 'tooManyAttempts',
      };
    }

    if (
      lowerMessage.includes('network') ||
      lowerMessage.includes('connection')
    ) {
      return {
        message: errorMessage,
        userMessage: 'networkError',
      };
    }

    if (lowerMessage.includes('timeout')) {
      return {
        message: errorMessage,
        userMessage: 'requestTimeout',
      };
    }

    if (lowerMessage.includes('not found') && lowerMessage.includes('user')) {
      return {
        message: errorMessage,
        userMessage: 'phoneNumberNotFound',
      };
    }

    if (
      lowerMessage.includes('invalid otp') ||
      lowerMessage.includes('invalid verification code')
    ) {
      return {
        message: errorMessage,
        userMessage: 'invalidOtp',
      };
    }

    if (
      lowerMessage.includes('expired') &&
      (lowerMessage.includes('code') || lowerMessage.includes('otp'))
    ) {
      return {
        message: errorMessage,
        userMessage: 'otpExpired',
      };
    }

    // Handle generic errors
    return {
      message: errorMessage,
      userMessage: 'loginFailed',
    };
  }

  /**
   * Map HTTP status codes and error messages to user-friendly messages
   */
  private static mapErrorByStatus(status: number, message?: string): string {
    const lowerMessage = (message || '').toLowerCase();

    switch (status) {
      case 400:
        // Bad request errors
        if (lowerMessage.includes('invalid parameter')) {
          return 'invalidPhoneFormat';
        }
        if (lowerMessage.includes('phone')) {
          return 'invalidPhoneNumber';
        }
        if (lowerMessage.includes('password')) {
          return 'invalidPassword';
        }
        return 'invalidInput';

      case 401:
        // Unauthorized - could be various auth issues
        if (lowerMessage.includes('user not found')) {
          return 'phoneNumberNotFound';
        }
        if (lowerMessage.includes('invalid otp')) {
          return 'invalidOtp';
        }
        if (lowerMessage.includes('verification code has expired')) {
          return 'otpExpired';
        }
        if (lowerMessage.includes('invalid verification code')) {
          return 'invalidOtp';
        }
        if (
          lowerMessage.includes('incorrect') ||
          lowerMessage.includes('invalid')
        ) {
          return 'incorrectCredentials';
        }
        if (lowerMessage.includes('custom auth flow')) {
          return 'authConfigError';
        }
        return 'authenticationFailed';

      case 403:
        // Forbidden
        if (lowerMessage.includes('temporary password')) {
          return 'temporaryPasswordRequired';
        }
        return 'accessDenied';

      case 404:
        // Not found
        if (lowerMessage.includes('user')) {
          return 'phoneNumberNotFound';
        }
        return 'notFound';

      case 429:
        // Too many requests - rate limited
        return 'tooManyAttempts';

      case 500:
        // Server error
        if (lowerMessage.includes('timeout')) {
          return 'requestTimeout';
        }
        return 'serverError';

      case 503:
        // Service unavailable
        return 'serviceUnavailable';

      default:
        return 'loginFailed';
    }
  }

  /**
   * Get a user-friendly error message from error code/key
   */
  static getUserMessage(
    errorKey: string,
    i18n?: Record<string, string>
  ): string {
    if (!i18n) {
      // Return the key itself if no i18n provided
      return errorKey;
    }

    // Try to get the translation
    return i18n[errorKey] || i18n['loginFailed'] || 'An error occurred';
  }

  /**
   * Check if error is retryable
   */
  static isRetryable(error: AuthError): boolean {
    const retryableMessages = [
      'networkError',
      'requestTimeout',
      'serviceUnavailable',
      'serverError',
    ];
    return retryableMessages.includes(error.userMessage);
  }

  /**
   * Check if error requires user input correction
   */
  static requiresUserCorrection(error: AuthError): boolean {
    const correctionMessages = [
      'phoneNumberNotFound',
      'invalidPhoneNumber',
      'invalidOtp',
      'invalidPassword',
      'incorrectCredentials',
      'invalidInput',
      'invalidPhoneFormat',
    ];
    return correctionMessages.includes(error.userMessage);
  }

  /**
   * Check if error is temporary (like OTP expiration)
   */
  static isTemporaryError(error: AuthError): boolean {
    const temporaryMessages = [
      'otpExpired',
      'tooManyAttempts',
      'requestTimeout',
      'serviceUnavailable',
    ];
    return temporaryMessages.includes(error.userMessage);
  }
}

/**
 * Default i18n error messages
 * These can be overridden with actual translations from translation files
 */
export const defaultErrorMessages: Record<string, string> = {
  // Authentication errors
  loginFailed: 'Login failed. Please try again.',
  authenticationFailed: 'Authentication failed.',
  incorrectCredentials: 'Incorrect phone number or password.',
  authConfigError:
    'Authentication service is not properly configured. Please contact support.',

  // Phone number errors
  phoneNumberNotFound: 'This phone number is not registered.',
  invalidPhoneNumber: 'Please enter a valid phone number.',
  invalidPhoneFormat: 'Invalid phone number format.',

  // OTP errors
  invalidOtp: 'Invalid verification code. Please try again.',
  otpExpired: 'Verification code has expired. Please request a new one.',
  tooManyAttempts:
    'Too many login attempts. Please try again in a few minutes.',

  // Password errors
  invalidPassword: 'Invalid password.',
  passwordTooShort: 'Password must be at least 8 characters.',
  temporaryPasswordRequired:
    'Temporary password needs to be changed. Please set a new password.',

  // Input errors
  invalidInput: 'Invalid input. Please check your entries.',

  // Network errors
  networkError:
    'Network connection error. Please check your internet connection.',
  requestTimeout: 'Request timed out. Please try again.',
  serviceUnavailable:
    'Service temporarily unavailable. Please try again later.',
  serverError: 'Server error. Please try again later.',

  // General errors
  accessDenied: 'Access denied.',
  notFound: 'Resource not found.',
};
