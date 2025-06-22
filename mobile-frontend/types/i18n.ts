export type TranslationKeys = {
  // Sign in page
  welcome: string;
  login: string;
  email: string;
  enterEmail: string;
  password: string;
  enterPassword: string;
  loginToAccount: string;
  forgotPassword: string;
  resetPassword: string;
  noaccount: string;
  justregister: string;
  loginFailed: string;
  loginSuccess: string;

  // Tab bar layout
  home: string;
  form: string;
  settings: string;

  // Register page
  register: string;
  alreadyaccount: string;
  justlogin: string;
  enterotp: string;
  otp: string;
  newpassword: string;

  // Form page
  form_message: string;
  reason: string;
  absense: string;
  lateness: string;
  leaving: string;
  other: string;
  chooseDate: string;
  additionalMessage: string;
  submitForm: string;
  message_placeholder: string;
  choose_student: string;

  // Settings page
  information: string;
  firstName: string;
  lastName: string;
  emailaddress: string;
  phoneNumber: string;
  preferences: string;
  language: string;
  logout: string;
  passwordChangedSuccess: string;
  changePassword: string;
  savePassword: string;
  textSize: string;
  lightMode: string;
  darkMode: string;
  batteryOptimization: string;

  // Messages
  critical: string;
  important: string;
  ordinary: string;
  group: string;
  continueReading: string;
  loadMoreMessages: string;
  messageNotFound: string;
  noMessagesYet: string;
  noMessagesDescription: string;
  errorLoadingMessages: string;
  tryAgain: string;

  // Error messages
  chooseCorrectDate: string;

  // States
  loading: string;

  // Navigation
  pressBackAgainToExit: string;

  // Student select page
  SelectStudent: string;

  // No students screen
  noStudentsFound: string;
  noStudentsDescription: string;
  refresh: string;
  needHelp: string;
  checkCorrectAccount: string;
  contactSchool: string;
  checkInternet: string;

  // Battery optimization
  improveNotificationDelivery: string;
  batteryOptimizationDescription: string;
  openSettings: string;
  deviceGuide: string;
  dismiss: string;
  batteryOptimizationSettings: string;
  batteryOptimizationInstructions: string;
  deviceSpecificInstructions: string;
  deviceInstructionsText: string;
  gotIt: string;

  // Notification alerts
  notificationsDisabled: string;
  notificationsDisabledMessage: string;
  notificationsNotWorking: string;
  batteryOptimizationAlert: string;
  later: string;
  ok: string;
  cancel: string;

  /*password requirements*/
  passwordRequirements: string;
  minLength: string;
  hasNumber: string;
  hasUppercase: string;
  hasLowercase: string;
  hasSpecialChar: string;
  passwordStrength: string;
  weak: string;
  medium: string;
  strong: string;
  createNewPassword: string;

  /*Logout alert*/
  confirmLogout: string;
  logoutMessage: string;
};

export type Language = 'en' | 'ja' | 'uz';

export type Translations = {
  [K in Language]: TranslationKeys;
};

export type ReasonMapping = {
  [K in Language]: {
    [key: string]: string;
  };
};
