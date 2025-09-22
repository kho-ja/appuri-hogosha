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
  forgotPasswordLink: string;
  noaccount: string;
  justregister: string;
  loginFailed: string;
  loginFailedNotifications: string;
  loginSuccess: string;

  // Forgot password pages
  resetPasswordTitle: string;
  enterPhoneNumberText: string;
  sendCode: string;
  verificationCodeSent: string;
  enterVerificationCode: string;
  verificationCode: string;
  continueText: string;
  codeExpired: string;
  resendCode: string;
  codeWillExpire: string;
  createNewPasswordTitle: string;
  passwordCreatedSuccessfully: string;
  enterNewPasswordText: string;
  confirmNewPassword: string;
  saveNewPassword: string;
  detailedView: string;
  contractFile: string;
  backToSignIn: string;

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
  changePasswordText: string;
  savePassword: string;
  enterOldPassword: string;
  enterNewPassword: string;
  enterConfirmPassword: string;
  passwordsDoNotMatch: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  invalidCurrentPassword: string;
  passwordRequirementsNotMet: string;
  newPasswordMustBeDifferent: string;
  pleaseEnsurePasswordRequirements: string;
  textSize: string;
  lightMode: string;
  darkMode: string;
  batteryOptimization: string;
  personalInfo: string;
  name: string;

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

  // 404 error page
  pageNotFound: string;
  pageNotFoundMessage: string;
  studentNotFound: string;
  studentNotFoundMessage: string;
  messageNotFoundTitle: string;
  messageNotAvailable: string;
  goToHomeScreen: string;

  // Error messages
  chooseCorrectDate: string;
  failedToRetrieveMessage: string;
  messageDoesNotBelongToStudent: string;

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

  /*update alerts*/
  updateAvailable: string;
  updateAvailableMessage: string;
  download: string;
  downloading: string;
  downloadingMessage: string;
  updateDownloaded: string;
  updateDownloadedMessage: string;
  restartNow: string;
  restart: string;
  updateComplete: string;
  updateCompleteMessage: string;
  downloadFailed: string;
  error: string;
  updateCheckFailed: string;
  noUpdates: string;
  latestVersion: string;
  checkForUpdates: string;
  checking: string;
  updateFailed: string;
  manualUpdateComplete: string;

  /*image alerts*/
  imageSaved: string;
  imageSavedMessage: string;
  downloadFailedImage: string;
  unableToSaveInDevelopment: string;
  permissionDenied: string;
  downloadError: string;
};

export type Language = 'en' | 'ja' | 'uz' | 'ru';

export type Translations = {
  [K in Language]: TranslationKeys;
};

export type ReasonMapping = {
  [K in Language]: {
    [key: string]: string;
  };
};
