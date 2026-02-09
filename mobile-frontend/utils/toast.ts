import Toast from 'react-native-root-toast';
import { colors } from '@/constants/Colors';

// Default toast position (bottom with offset)
const TOAST_POSITION = Toast.positions.BOTTOM - 30;

// Semantic colors for toast
const ToastColors = {
  success: colors.success,
  error: colors.error,
  neutral: 'gray',
} as const;

type ToastColor = keyof typeof ToastColors;

interface ToastOptions {
  duration?: 'short' | 'long';
  position?: number;
}

const getToastDuration = (duration: 'short' | 'long' = 'short') => {
  return duration === 'long' ? Toast.durations.LONG : Toast.durations.SHORT;
};

const showToast = (
  message: string,
  color: ToastColor,
  options: ToastOptions = {}
) => {
  const { duration = 'short', position = TOAST_POSITION } = options;

  return Toast.show(message, {
    duration: getToastDuration(duration),
    position,
    shadow: true,
    animation: true,
    hideOnPress: true,
    textColor: 'white',
    containerStyle: {
      backgroundColor: ToastColors[color],
      borderRadius: 5,
    },
  });
};

/**
 * Show a success toast (green)
 */
export const showSuccessToast = (message: string, options?: ToastOptions) => {
  return showToast(message, 'success', options);
};

/**
 * Show an error toast (red)
 */
export const showErrorToast = (message: string, options?: ToastOptions) => {
  return showToast(message, 'error', { duration: 'long', ...options });
};

/**
 * Show a neutral toast (gray) - useful for non-critical messages like "press back again to exit"
 */
export const showNeutralToast = (message: string, options?: ToastOptions) => {
  return showToast(message, 'neutral', options);
};

// Export for cases where direct access to position constant is needed
export { TOAST_POSITION, ToastColors };
