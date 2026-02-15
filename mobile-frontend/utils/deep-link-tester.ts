import * as Linking from 'expo-linking';
import { Alert, Platform } from 'react-native';

/**
 * Utility function to test deep links based on app's structure
 * @param {string} path - The path to test (e.g., 'home', 'student/123/message/456')
 * @param {Object} params - Optional parameters to include in the URL
 */
export const testDeepLink = (
  path: string,
  params: Record<string, string> = {}
) => {
  // Construct URL with the app scheme
  const baseUrl = 'jduapp://';

  // Construct query parameters if any
  const queryParams =
    Object.keys(params).length > 0
      ? '?' +
        Object.entries(params)
          .map(
            ([key, value]) =>
              `${encodeURIComponent(key)}=${encodeURIComponent(value)}`
          )
          .join('&')
      : '';

  const url = `${baseUrl}${path}${queryParams}`;

  console.log(`Testing deep link: ${url}`);

  // Open the URL
  Linking.openURL(url)
    .then(() => {
      console.log('Deep link test successful');
      if (__DEV__) {
        Alert.alert('Deep Link Test', `Successfully opened: ${url}`);
      }
    })
    .catch(err => {
      console.error('Error opening deep link:', err);
      if (__DEV__) {
        Alert.alert(
          'Deep Link Error',
          `Failed to open: ${url}\n\nError: ${err.message}`
        );
      }
    });
};

/**
 * Utility function to log the initial URL that opened the app
 */
export const logInitialURL = async () => {
  try {
    const initialURL = await Linking.getInitialURL();
    console.log('App was opened with URL:', initialURL);
    return initialURL;
  } catch (e) {
    console.error('Error getting initial URL:', e);
    return null;
  }
};

/**
 * Command-line instructions to test deep links
 */
export const getExternalTestCommands = () => {
  const commands = {
    android: [
      'adb shell am start -a android.intent.action.VIEW -d "jduapp://home" com.jduapp.parentnotification',
      'adb shell am start -a android.intent.action.VIEW -d "jduapp://student/123/message/456" com.jduapp.parentnotification',
      'adb shell am start -a android.intent.action.VIEW -d "https://parents.jdu.uz/parentnotification/student/123/message/456" com.jduapp.parentnotification',
    ],
    ios: [
      'xcrun simctl openurl booted "jduapp://home"',
      'xcrun simctl openurl booted "jduapp://student/123/message/456"',
      'xcrun simctl openurl booted "https://parents.jdu.uz/parentnotification/student/123/message/456"',
    ],
  };

  return Platform.OS === 'ios' ? commands.ios : commands.android;
};

/**
 * Helper for testing deep links based on app structure
 */
export const DeepLinkDebugHelper = {
  // Tab navigation links
  testHomeTab: () => testDeepLink('home'),
  testMessageDetail: (studentId: string = '123', id: string = '456') =>
    testDeepLink(`student/${studentId}/message/${id}`),
  testStudentTab: () => testDeepLink('student'),
  testStudentDetail: (id: string = '456') => testDeepLink(`student/${id}`),

  // Settings links
  testSettings: () => testDeepLink('settings'),
  testSettingsProfile: () => testDeepLink('settings/profile'),

  // Links with parameters
  testWithNotificationParams: () =>
    testDeepLink('home', {
      notificationId: '789',
      type: 'reminder',
    }),

  // Web URL format (for testing universal links)
  testWebUrl: () => {
    const url =
      'https://parents.jdu.uz/parentnotification/student/123/message/456';
    console.log(`Testing web URL: ${url}`);
    Linking.openURL(url)
      .then(() => console.log('Web URL test successful'))
      .catch(err => console.error('Error opening web URL:', err));
  },
};
