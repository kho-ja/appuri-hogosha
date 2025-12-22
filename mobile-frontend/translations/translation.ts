import type { ReasonMapping, Translations } from '@/types/i18n';

const translations: Translations = {
  en: {
    /*sign in page*/
    welcome: 'Welcome Back',
    login: 'Login to access your account',
    email: 'Email',
    enterEmail: 'Enter email here',
    password: 'Password',
    enterPassword: 'Enter password here',
    loginToAccount: 'Login',
    forgotPassword: 'Forgot your password?',
    resetPassword: 'reset password',
    forgotPasswordLink: 'Forgot your password? Reset it.',
    noaccount: "Don't have an account?",
    justregister: 'Register',
    loginFailed: 'Invalid phone number or password',
    loginFailedNotifications:
      'Please enable notifications to continue. Check your device settings.',
    loginSuccess: 'Logged in successfully',
    usePasswordInstead: 'Use password instead',
    useOtpInstead: 'Use verification code instead',
    // Error messages - Authentication
    authenticationFailed: 'Authentication failed. Please try again.',
    incorrectCredentials: 'Incorrect phone number or password.',
    authConfigError:
      'Authentication service is not properly configured. Please contact support.',
    // Error messages - Phone number
    phoneNumberNotFound:
      'This phone number is not registered. Please check and try again.',
    invalidPhoneNumber: 'Please enter a valid phone number.',
    invalidPhoneFormat: 'Invalid phone number format.',
    // Error messages - OTP
    invalidOtp: 'Invalid verification code. Please try again.',
    otpExpired: 'Verification code has expired. Please request a new one.',
    // Error messages - Password
    invalidPassword: 'Invalid password.',
    passwordTooShort: 'Password must be at least 8 characters.',
    temporaryPasswordRequired:
      'Temporary password needs to be changed. Please set a new password.',
    // Error messages - Input
    invalidInput: 'Invalid input. Please check your entries.',
    // Error messages - Network
    networkError:
      'Network connection error. Please check your internet connection.',
    requestTimeout: 'Request timed out. Please try again.',
    serviceUnavailable:
      'Service temporarily unavailable. Please try again later.',
    serverError: 'Server error. Please try again later.',
    // Error messages - General
    accessDenied: 'Access denied.',
    notFound: 'Resource not found.',
    tooManyAttempts:
      'Too many login attempts. Please try again in a few minutes.',
    /*sign in page*/

    /*forgot password pages*/
    resetPasswordTitle: 'Secret Code Recovery',
    enterPhoneNumberText:
      'Please enter your phone number. A verification code will be sent to this number.',
    sendCode: 'Send Code',
    verificationCodeSent:
      'Verification code sent to your phone number. Please enter the code.',
    enterVerificationCode: 'Enter verification code',
    verificationCode: 'Verification code',
    continueText: 'Continue',
    codeWillExpire: 'Code will expire in {seconds} seconds.',
    codeExpired: 'Code has expired',
    resendCode: 'Resend Code',
    verify: 'Verify',
    createNewPasswordTitle: 'Create New Password',
    passwordCreatedSuccessfully:
      'Password created successfully! You can now log in with your new password.',
    enterNewPasswordText: 'Please create a secure password for your account.',
    confirmNewPassword: 'Confirm new password',
    saveNewPassword: 'Save',
    backToSignIn: 'Back to Sign In',
    /*forgot password pages*/

    /*tab bar layout*/
    home: 'Home',
    form: 'Form',
    settings: 'Settings',
    personalInfo: 'Personal Info',
    /*tab bar layout*/

    /*register page*/
    register: 'Register',
    alreadyaccount: 'Already have an account?',
    justlogin: 'Login',
    enterotp: 'Enter one time password sent to your email',
    otp: 'One Time Password',
    newpassword: 'Create New Password',
    /*register page*/

    /*form page*/
    form_message: 'Please submit applications by the 8:30 of that day',
    reason: 'Reason for application',
    absense: 'absense',
    lateness: 'lateness',
    leaving: 'leaving',
    other: 'other',
    chooseDate: 'Choose a date',
    additionalMessage: 'Additional message',
    submitForm: 'Submit form',
    message_placeholder: 'Please enter your message here',
    choose_student: 'Choose a student to submit the form',
    /*form page*/

    /*settings page*/
    information: 'Information',
    firstName: 'First name',
    lastName: 'Last name',
    emailaddress: 'Email address',
    phoneNumber: 'Phone number',
    preferences: 'Preferences',
    language: 'Language Change',
    logout: 'Logout',
    passwordChangedSuccess: 'Password changed successfully',
    changePassword: 'Change Password',
    changePasswordText:
      'Please enter your current password and create a new secure password',
    savePassword: 'Save Password',
    enterOldPassword: 'Enter current password',
    enterNewPassword: 'Enter new password',
    confirmPassword: 'Confirm Password',
    enterConfirmPassword: 'Confirm your new password',
    passwordsDoNotMatch: 'Passwords do not match',
    currentPassword: 'Current Password',
    newPassword: 'New Password',
    invalidCurrentPassword: 'Invalid current password',
    passwordRequirementsNotMet: 'New password does not meet requirements',
    newPasswordMustBeDifferent:
      'New password must be different from current password',
    pleaseEnsurePasswordRequirements:
      'Please ensure all password requirements are met',
    textSize: 'Text Size',
    sampleText:
      'Choose the text size that suits you best for a more comfortable reading experience.',
    lightMode: 'Light Mode',
    darkMode: 'Dark Mode',
    batteryOptimization: 'Battery Optimization',
    name: 'Name',
    /*settings page*/

    /*message*/
    critical: 'critical',
    important: 'important',
    ordinary: 'ordinary',
    group: 'Group',
    continueReading: 'Continue reading',
    loadMoreMessages: 'Load More Messages',
    messageNotFound: 'Message not found',
    noMessagesYet: 'No Messages Yet',
    noMessagesDescription:
      'When you receive messages from school, they will appear here. Pull down to refresh.',
    errorLoadingMessages: 'Error loading messages. Please try again.',
    tryAgain: 'Try Again',
    /*message*/

    /*404 error page*/
    pageNotFound: 'Page Not Found',
    pageNotFoundMessage:
      "The page you're looking for doesn't exist or you don't have access to it.",
    studentNotFound: 'Student Not Found',
    studentNotFoundMessage: 'This student may not be assigned to your account.',
    messageNotFoundTitle: 'Message Not Found',
    messageNotAvailable: 'Message Not Available',
    goToHomeScreen: 'Go to home screen',
    /*404 error page*/

    /*error messages*/
    chooseCorrectDate: 'Please choose a correct date',
    failedToRetrieveMessage: 'Failed to retrieve message',
    messageDoesNotBelongToStudent: 'This message does not belong to student',
    /*error messages*/

    /*states*/
    loading: 'Loading...',
    /*states*/

    pressBackAgainToExit: 'Press back again to exit',

    /*student select page*/
    SelectStudent: 'Select Your Child',

    /*no students screen*/
    noStudentsFound: 'No Students Found',
    noStudentsDescription:
      'It looks like no students are assigned to your account yet. Please contact your school administrator or try refreshing.',
    refresh: 'Refresh',
    needHelp: 'Need Help?',
    checkCorrectAccount: "Make sure you're logged in with the correct account",
    contactSchool: 'Contact your school if this problem persists',
    checkInternet: 'Check your internet connection',
    /*no students screen*/

    /*battery optimization*/
    improveNotificationDelivery: 'Improve Notification Delivery',
    batteryOptimizationDescription:
      'Some Android devices may delay or block notifications to save battery. For the best experience, please disable battery optimization for this app.',
    openSettings: 'Open Settings',
    deviceGuide: 'Device Guide',
    dismiss: 'Dismiss',
    batteryOptimizationSettings: 'Battery Optimization Settings',
    batteryOptimizationInstructions:
      'To ensure you receive all notifications:\n\n1. Find this app in the list\n2. Select "Don\'t optimize" or "Allow"\n3. Restart the app\n\nNote: Steps may vary by device manufacturer.',
    deviceSpecificInstructions: 'Device-Specific Instructions',
    deviceInstructionsText:
      'Different Android manufacturers have different settings:\n\n• Samsung: Settings \u2192 Apps \u2192 [App] \u2192 Battery \u2192 Optimize battery usage\n• Xiaomi: Settings \u2192 Apps \u2192 Manage apps \u2192 [App] \u2192 Battery saver\n• OnePlus: Settings \u2192 Apps \u2192 [App] \u2192 Battery \u2192 Battery optimization\n• Huawei: Settings \u2192 Apps \u2192 [App] \u2192 Battery \u2192 App launch',
    gotIt: 'Got it',
    /*battery optimization*/

    /*notification alerts*/
    notificationsDisabled: 'Notifications Disabled',
    notificationsDisabledMessage:
      "You won't receive important updates. You can enable notifications in Settings.",
    notificationsNotWorking: 'Notifications Not Working?',
    batteryOptimizationAlert:
      'For reliable notifications, please disable battery optimization for this app in your device settings.',
    later: 'Later',
    ok: 'OK',
    cancel: 'Cancel',
    /*notification alerts*/

    /*password requirements*/
    passwordRequirements: 'Password Requirements',
    minLength: 'At least 8 characters',
    hasNumber: 'At least 1 number',
    hasUppercase: 'At least 1 uppercase letter',
    hasLowercase: 'At least 1 lowercase letter',
    hasSpecialChar:
      'At least 1 special character (!@#%&/\\,><\':;|_~`+=^$.()[]{}?" )',
    passwordStrength: 'Password Strength',
    weak: 'Weak',
    medium: 'Medium',
    strong: 'Strong',
    createNewPassword: 'Create New Password',
    /*password requirements*/

    /*Logout alert*/
    confirmLogout: 'Confirm Logout',
    logoutMessage: 'Are you sure you want to logout?',
    /*Logout alert*/

    /*message detail*/
    detailedView: 'Detailed view',
    contractFile: 'Contract.pdf',
    /*message detail*/

    /*update alerts*/
    updateAvailable: 'Update Available 🚀',
    updateAvailableMessage:
      'A new version of the app is available. Would you like to download it now?',
    download: 'Download',
    downloading: 'Downloading...',
    downloadingMessage: 'Please wait while the update downloads.',
    updateDownloaded: 'Update Downloaded! ✅',
    updateDownloadedMessage:
      'The update has been downloaded successfully. Restart to apply changes?',
    restartNow: 'Restart Now',
    restart: 'Restart',
    updateComplete: 'Update Complete',
    updateCompleteMessage: 'You already have the latest version.',
    downloadFailed: 'Download Failed',
    error: 'Error',
    updateCheckFailed: 'Update Check Failed',
    noUpdates: 'No Updates',
    latestVersion: 'You have the latest version!',
    checkForUpdates: 'Check for Updates',
    checking: 'Checking...',
    updateFailed: 'Update Failed',
    manualUpdateComplete: 'Manual update complete. Restart to apply?',
    /*update alerts*/

    /*image alerts*/
    imageSaved: 'Saved',
    imageSavedMessage: 'Image saved to your Photos.',
    downloadFailedImage: 'Download failed',
    unableToSaveInDevelopment:
      'Unable to save in development build. Try a production build or check permissions.',
    permissionDenied: 'Permission denied to access photo library.',
    downloadError: 'Failed to download image.',
    /*image alerts*/
  },
  ja: {
    /*sign in page*/
    welcome: 'お帰りなさい',
    login: 'アカウントにログイン',
    email: 'メールアドレス',
    enterEmail: 'メールアドレスを入力',
    password: 'パスワード',
    enterPassword: 'パスワードを入力してください',
    loginToAccount: 'ログイン',
    forgotPassword: 'パスワードを忘れましたか？',
    resetPassword: 'パスワードをリセット',
    forgotPasswordLink: 'パスワードを忘れましたか？リセットしてください。',
    noaccount: 'アカウントをお持ちでないですか？',
    justregister: '登録',
    loginFailed: '無効な電話番号またはパスワード',
    loginFailedNotifications:
      '続行するには通知を有効にしてください。デバイスの設定を確認してください。',
    loginSuccess: 'ログインに成功しました',
    usePasswordInstead: 'パスワードを使用する',
    useOtpInstead: '確認コードを使用する',
    // Error messages - Authentication
    authenticationFailed: '認証に失敗しました。もう一度試してください。',
    incorrectCredentials: '電話番号またはパスワードが間違っています。',
    authConfigError:
      '認証サービスが正しく設定されていません。サポートにお問い合わせください。',
    // Error messages - Phone number
    phoneNumberNotFound:
      'この電話番号は登録されていません。確認してもう一度試してください。',
    invalidPhoneNumber: '有効な電話番号を入力してください。',
    invalidPhoneFormat: '電話番号の形式が無効です。',
    // Error messages - OTP
    invalidOtp: '無効な確認コード。もう一度試してください。',
    otpExpired:
      '確認コードの有効期限が切れました。新しいコードをリクエストしてください。',
    // Error messages - Password
    invalidPassword: '無効なパスワード。',
    passwordTooShort: 'パスワードは8文字以上である必要があります。',
    temporaryPasswordRequired:
      '一時パスワードを変更する必要があります。新しいパスワードを設定してください。',
    // Error messages - Input
    invalidInput: '無効な入力。エントリを確認してください。',
    // Error messages - Network
    networkError:
      'ネットワーク接続エラー。インターネット接続を確認してください。',
    requestTimeout:
      'リクエストがタイムアウトしました。もう一度試してください。',
    serviceUnavailable:
      'サービスは一時的に利用できません。後でもう一度試してください。',
    serverError: 'サーバーエラー。後でもう一度試してください。',
    // Error messages - General
    accessDenied: 'アクセスが拒否されました。',
    notFound: 'リソースが見つかりません。',
    tooManyAttempts:
      'ログイン試行が多すぎます。数分後にもう一度試してください。',
    /*sign in page*/

    /*forgot password pages*/
    resetPasswordTitle: '秘密コードの復元',
    enterPhoneNumberText:
      '電話番号を入力してください。この番号に確認コードが送信されます。',
    sendCode: 'コードを送信',
    verificationCodeSent:
      '確認コードが電話番号に送信されました。コードを入力してください。',
    enterVerificationCode: '確認コードを入力',
    verificationCode: '確認コード',
    continueText: '続ける',
    codeExpired: 'コードの有効期限が切れました',
    resendCode: 'コードを再送信',
    codeWillExpire: 'コードは{seconds}秒で期限切れになります。',
    verify: '確認',
    createNewPasswordTitle: '新しいパスワードを作成',
    passwordCreatedSuccessfully:
      'パスワードが正常に作成されました！新しいパスワードでログインできます。',
    enterNewPasswordText: 'アカウント用の安全なパスワードを作成してください。',
    confirmNewPassword: '新しいパスワードを確認',
    saveNewPassword: '保存',
    backToSignIn: '登録ページに戻る',
    /*forgot password pages*/

    /*tab bar layout*/
    home: 'ホーム',
    form: 'フォーム',
    settings: '設定',
    personalInfo: '個人情報',
    /*tab bar layout*/

    /*register page*/
    register: '登録',
    alreadyaccount: 'アカウントをお持ちですか？',
    justlogin: 'ログイン',
    enterotp: 'メールに送信されたワンタイムパスワードを入力してください',
    otp: 'ワンタイムパスワード',
    newpassword: '新しいパスワードを作成',
    /*register page*/

    /*form page*/
    form_message: 'その日の8:30までに申請を提出してください',
    reason: '申請理由',
    absense: '欠席',
    lateness: '遅刻',
    leaving: '早退',
    other: 'その他',
    chooseDate: '日付を選択',
    additionalMessage: '追加メッセージ',
    submitForm: 'フォームを送信',
    message_placeholder: 'ここにメッセージを入力してください',
    choose_student: 'フォームを送信する学生を選択してください',
    /*form page*/

    /*settings page*/
    information: '情報',
    firstName: '名',
    lastName: '姓',
    emailaddress: 'メールアドレス',
    phoneNumber: '電話番号',
    preferences: '設定',
    language: '言語の変更',
    logout: 'ログアウト',
    passwordChangedSuccess: 'パスワードが正常に変更されました',
    changePassword: 'パスワードを変更',
    changePasswordText:
      '現在のパスワードを入力し、新しい安全なパスワードを作成してください',
    savePassword: 'パスワードを保存',
    enterOldPassword: '現在のパスワードを入力',
    enterNewPassword: '新しいパスワードを入力してください',
    confirmPassword: 'パスワードを確認',
    enterConfirmPassword: '新しいパスワードを確認',
    passwordsDoNotMatch: 'パスワードが一致しません',
    currentPassword: '現在のパスワード',
    newPassword: '新しいパスワード',
    invalidCurrentPassword: '現在のパスワードが正しくありません',
    passwordRequirementsNotMet: '新しいパスワードが要件を満たしていません',
    newPasswordMustBeDifferent:
      '新しいパスワードは現在のパスワードと異なる必要があります',
    pleaseEnsurePasswordRequirements:
      'すべてのパスワード要件が満たされていることを確認してください',
    textSize: '文字サイズ',
    sampleText: '読みやすさのために、自分に合った文字サイズを選んでください。',
    lightMode: 'ライトモード',
    darkMode: 'ダークモード',
    batteryOptimization: 'バッテリー最適化',
    name: '名前',
    /*settings page*/

    /*message*/
    critical: '高',
    important: '中',
    ordinary: '低',
    group: 'グループ',
    continueReading: '続きを読む',
    loadMoreMessages: 'もっと見る',
    messageNotFound: 'メッセージが見つかりません',
    noMessagesYet: 'まだメッセージがありません',
    noMessagesDescription:
      '学校からのメッセージを受信すると、ここに表示されます。下にスワイプして更新してください。',
    errorLoadingMessages:
      'メッセージの読み込み中にエラーが発生しました。もう一度お試しください。',
    tryAgain: 'もう一度試す',
    /*message*/

    /*404 error page*/
    pageNotFound: 'ページが見つかりません',
    pageNotFoundMessage:
      'お探しのページは存在しないか、アクセスする権限がありません。',
    studentNotFound: '学生が見つかりません',
    studentNotFoundMessage:
      'この学生はあなたのアカウントに割り当てられていない可能性があります。',
    messageNotFoundTitle: 'メッセージが見つかりません',
    messageNotAvailable: 'メッセージが利用できません',
    goToHomeScreen: 'ホーム画面に戻る',
    /*404 error page*/

    /*error messages*/
    chooseCorrectDate: '正しい日付を選択してください',
    failedToRetrieveMessage: 'メッセージの取得に失敗しました',
    messageDoesNotBelongToStudent: 'このメッセージは学生に属していません',
    /*error messages*/

    /*states*/
    loading: '読み込み中...',
    /*states*/

    pressBackAgainToExit: 'もう一度押して終了',

    /*student select page*/
    SelectStudent: 'お子様を選択してください',

    /*no students screen*/
    noStudentsFound: '学生が見つかりません',
    noStudentsDescription:
      'まだあなたのアカウントに学生が割り当てられていないようです。学校の管理者にお問い合わせいただくか、更新してみてください。',
    refresh: '更新',
    needHelp: 'ヘルプが必要ですか？',
    checkCorrectAccount:
      '正しいアカウントでログインしていることを確認してください',
    contactSchool: 'この問題が続く場合は学校にお問い合わせください',
    checkInternet: 'インターネット接続を確認してください',
    /*no students screen*/

    /*battery optimization*/
    improveNotificationDelivery: '通知配信を改善',
    batteryOptimizationDescription:
      '一部のAndroidデバイスは、バッテリーを節約するために通知を遅延またはブロックする場合があります。最高のエクスペリエンスのために、このアプリのバッテリー最適化を無効にしてください。',
    openSettings: '設定を開く',
    deviceGuide: 'デバイスガイド',
    dismiss: '閉じる',
    batteryOptimizationSettings: 'バッテリー最適化設定',
    batteryOptimizationInstructions:
      'すべての通知を確実に受信するために：\n\n1. リストでこのアプリを見つけます\n2. "最適化しない"または"許可"を選択します\n3. アプリを再起動します\n\n注：手順はデバイスメーカーによって異なる場合があります。',
    deviceSpecificInstructions: 'デバイス固有の手順',
    deviceInstructionsText:
      'Androidメーカーごとに設定が異なります：\n\n• Samsung：設定\u2192アプリ\u2192[アプリ]\u2192バッテリー\u2192バッテリー使用量の最適化\n• Xiaomi：設定\u2192アプリ\u2192アプリの管理\u2192[アプリ]\u2192バッテリーセーバー\n• OnePlus：設定\u2192アプリ\u2192[アプリ]\u2192バッテリー\u2192バッテリー最適化\n• Huawei：設定\u2192アプリ\u2192[アプリ]\u2192バッテリー\u2192アプリ起動',
    gotIt: 'わかりました',
    /*battery optimization*/

    /*notification alerts*/
    notificationsDisabled: '通知が無効',
    notificationsDisabledMessage:
      '重要な更新を受信できません。設定で通知を有効にできます。',
    notificationsNotWorking: '通知が機能しませんか？',
    batteryOptimizationAlert:
      '信頼性の高い通知のために、デバイス設定でこのアプリのバッテリー最適化を無効にしてください。',
    later: '後で',
    ok: 'OK',
    cancel: 'キャンセル',
    /*notification alerts*/

    /*password requirements*/
    passwordRequirements: 'パスワード要件',
    minLength: '8文字以上',
    hasNumber: '数字を1つ以上',
    hasUppercase: '大文字を1つ以上',
    hasLowercase: '小文字を1つ以上',
    hasSpecialChar: '特殊文字を1つ以上 (!@#%&/\\,><\':;|_~`+=^$.()[]{}?" )',
    passwordStrength: 'パスワード強度',
    weak: '弱い',
    medium: '中程度',
    strong: '強い',
    createNewPassword: '新しいパスワードを作成',
    /*password requirements*/

    /*Logout alert*/
    confirmLogout: 'ログアウトの確認',
    logoutMessage: '本当にログアウトしますか？',
    /*Logout alert*/

    /*message detail*/
    detailedView: '詳細表示',
    contractFile: '契約書.pdf',
    /*message detail*/

    /*update alerts*/
    updateAvailable: 'アップデート利用可能 🚀',
    updateAvailableMessage:
      'アプリの新しいバージョンが利用可能です。今すぐダウンロードしますか？',
    download: 'ダウンロード',
    downloading: 'ダウンロード中...',
    downloadingMessage: 'アップデートのダウンロードをお待ちください。',
    updateDownloaded: 'アップデート完了！ ✅',
    updateDownloadedMessage:
      'アップデートが正常にダウンロードされました。変更を適用するために再起動しますか？',
    restartNow: '今すぐ再起動',
    restart: '再起動',
    updateComplete: 'アップデート完了',
    updateCompleteMessage: '最新バージョンをお使いです。',
    downloadFailed: 'ダウンロード失敗',
    error: 'エラー',
    updateCheckFailed: 'アップデート確認失敗',
    noUpdates: 'アップデートなし',
    latestVersion: '最新バージョンをお使いです！',
    checkForUpdates: 'アップデート確認',
    checking: '確認中...',
    updateFailed: 'アップデート失敗',
    manualUpdateComplete:
      '手動アップデート完了。適用するために再起動しますか？',
    /*update alerts*/

    /*image alerts*/
    imageSaved: '保存完了',
    imageSavedMessage: '画像がフォトライブラリに保存されました。',
    downloadFailedImage: 'ダウンロード失敗',
    unableToSaveInDevelopment:
      '開発ビルドでは保存できません。本番ビルドを試すか、権限を確認してください。',
    permissionDenied: 'フォトライブラリへのアクセス権限が拒否されました。',
    downloadError: '画像のダウンロードに失敗しました。',
    /*image alerts*/
  },
  uz: {
    /*sign in page*/
    welcome: 'Salom, xush kelibsiz',
    login: 'Hisobingizga kirish',
    email: 'Elektron pochta',
    enterEmail: 'Elektron pochtangizni kiriting',
    password: 'Parol',
    enterPassword: 'Parolni kiriting',
    loginToAccount: 'Kirish',
    forgotPassword: 'Parolingizni unutdingizmi?',
    resetPassword: 'parolni tiklash',
    forgotPasswordLink: 'Parolni unutdingizmi? Parolni tiklang.',
    noaccount: "Hisobingiz yo'qmi?",
    justregister: "Ro'yxatdan o'ting",
    loginFailed: "Noto'g'ri telefon raqam yoki parol kiritilgan",
    loginFailedNotifications:
      'Davom etish uchun bildirishnomalarni yoqing. Qurilma sozlamalarini tekshiring.',
    loginSuccess: 'Muvaffaqiyatli kirdingiz',
    usePasswordInstead: 'Parol bilan kirish',
    useOtpInstead: 'Tasdiqlash kodi bilan kirish',
    // Error messages - Authentication
    authenticationFailed:
      "Autentifikatsiya amalga oshmadi. Iltimos, qayta urinib ko'ring.",
    incorrectCredentials: "Noto'g'ri telefon raqam yoki parol.",
    authConfigError:
      "Autentifikatsiya xizmati to'g'ri sozlanmagan. Iltimos, qo'llab-quvvatlagichga murojaat qiling.",
    // Error messages - Phone number
    phoneNumberNotFound:
      "Bu telefon raqami ro'yxatdan o'tmagan. Iltimos, tekshiring va qayta urinib ko'ring.",
    invalidPhoneNumber: "Iltimos, to'g'ri telefon raqamini kiriting.",
    invalidPhoneFormat: "Noto'g'ri telefon raqam formati.",
    // Error messages - OTP
    invalidOtp: "Noto'g'ri tasdiqlash kodi. Iltimos, qayta urinib ko'ring.",
    otpExpired:
      "Tasdiqlash kodining muddati tugadi. Iltimos, yangi kod so'rang.",
    // Error messages - Password
    invalidPassword: "Parol noto'g'ri.",
    passwordTooShort: "Parol kamida 8 ta belgidan iborat bo'lishi kerak.",
    temporaryPasswordRequired:
      "Vaqtinchalik parolni o'zgartirish kerak. Iltimos, yangi parol o'rnating.",
    // Error messages - Input
    invalidInput: "Noto'g'ri kiritish. Iltimos, yozuvlarni tekshiring.",
    // Error messages - Network
    networkError:
      'Internet ulanishi bilan muammo. Iltimos, internet ulanishingizni tekshiring.',
    requestTimeout: "Sorov vaqti tugadi. Iltimos, qayta urinib ko'ring.",
    serviceUnavailable:
      "Xizmat vaqtincha ishlamaydi. Iltimos, keyinroq urinib ko'ring.",
    serverError: "Server xatosi. Iltimos, qayta urinib ko'ring.",
    // Error messages - General
    accessDenied: 'Kirish man etilgan.',
    notFound: 'Resurs topilmadi.',
    tooManyAttempts:
      "Juda ko'p urinish. Iltimos, bir necha daqiqadan keyin qayta urinib ko'ring.",
    /*sign in page*/

    /*forgot password pages*/
    resetPasswordTitle: 'Maxfiy kodni tiklash',
    enterPhoneNumberText:
      'Iltimos, telefon raqamingizni kiriting. Shu raqam orqali sizga tasdiqlash kodi yuboriladi.',
    sendCode: 'Davom etish',
    verificationCodeSent: 'Tasdiqlash kodi yuborildi. Iltimos, kodni kiriting.',
    enterVerificationCode: 'Kodni kiriting',
    verificationCode: 'Tasdiqlash kodi',
    continueText: 'Davom etish',
    codeExpired: 'Kodning muddati tugadi',
    resendCode: 'Kodni qayta yuborish',
    codeWillExpire:
      'Kodni qayta yuborish {seconds} soniyadan keyin faollashadi.',
    verify: 'Tasdiqlash',
    createNewPasswordTitle: 'Parol yaratish',
    passwordCreatedSuccessfully:
      'Parol muvaffaqiyatli yaratildi! Endi yangi parolingiz bilan kirishingiz mumkin.',
    enterNewPasswordText: 'Iltimos, hisobingiz uchun xavfsiz parol yarating',
    confirmNewPassword: 'Parolni takrorlang',
    saveNewPassword: 'Saqlash',
    backToSignIn: "Ro'yxatdan o'tish sahifasiga qaytish",
    /*forgot password pages*/

    /*tab bar layout*/
    home: 'Bosh sahifa',
    form: 'Forma',
    settings: 'Sozlamalar',
    personalInfo: "Shaxsiy ma'lumotlar",
    /*tab bar layout*/

    /*register page*/
    register: "Ro'yxatdan o'tish",
    alreadyaccount: 'Hisobingiz bormi?',
    justlogin: 'Kirish',
    enterotp: 'Elektron pochtangizga yuborilgan bir martalik parolni kiriting',
    otp: 'Bir Martalik Parol',
    newpassword: 'Yangi parol yaratish',
    /*register page*/

    /*form page*/
    form_message: 'Ushbu kun soat 8:30 gacha arizalarni topshiring',
    reason: 'Ariza sababi',
    absense: 'dars qoldirish',
    lateness: 'darsga kechikish',
    leaving: 'erta ketish',
    other: 'boshqa sabab',
    chooseDate: 'Sana tanlash',
    additionalMessage: "Qo'shimcha xabar",
    submitForm: 'Formani yuborish',
    message_placeholder: 'Iltimos, xabaringizni shu joyga kiriting',
    choose_student: 'Formani yuborish uchun talaba tanlang',
    /*form page*/

    /*settings page*/
    information: "Ma'lumot",
    firstName: 'Ism',
    lastName: 'Familiya',
    emailaddress: 'Elektron pochta',
    phoneNumber: 'Telefon raqam',
    preferences: 'Sozlamalar',
    language: 'Ilova tili',
    logout: 'Chiqish',
    passwordChangedSuccess: "Parol muvaffaqiyatli o'zgartirildi",
    changePassword: "Parolni o'zgartirish",
    changePasswordText:
      'Joriy parolingizni kiriting va yangi xavfsiz parol yarating',
    savePassword: 'Parolni saqlash',
    enterOldPassword: 'Joriy parolni kiriting',
    enterNewPassword: 'Yangi parolni kiriting',
    confirmPassword: 'Parolni tasdiqlash',
    enterConfirmPassword: 'Yangi parolni tasdiqlang',
    passwordsDoNotMatch: 'Parollar mos kelmaydi',
    currentPassword: 'Joriy parol',
    newPassword: 'Yangi parol',
    invalidCurrentPassword: "Joriy parol noto'g'ri",
    passwordRequirementsNotMet: 'Yangi parol talablarga javob bermaydi',
    newPasswordMustBeDifferent:
      "Yangi parol joriy paroldan farqli bo'lishi kerak",
    pleaseEnsurePasswordRequirements:
      'Barcha parol talablari bajarilganligini tekshiring',
    textSize: "Matn o'lchami",
    sampleText:
      "O'zingizga qulay bo'lgan matn hajmini tanlang — o'qish yanada qulay bo'ladi.",
    lightMode: "Yorug' rejim",
    darkMode: "Qorong'u rejim",
    batteryOptimization: 'Batareya optimizatsiyasi',
    name: 'Ism',
    /*settings page*/

    /*message*/
    critical: 'majburiy',
    important: 'muhim',
    ordinary: 'oddiy',
    group: 'Guruh',
    continueReading: 'Davom etish',
    loadMoreMessages: "Ko'proq xabarlar",
    messageNotFound: 'Xabar topilmadi',
    noMessagesYet: "Hozircha yangi xabar yo'q",
    noMessagesDescription: "Keyinroq qayta urinib ko'ring.",
    errorLoadingMessages:
      "Xabarlarni yuklashda xatolik yuz berdi. Iltimos, qayta urinib ko'ring.",
    tryAgain: 'Qayta urinish',
    /*message*/

    /*404 error page*/
    pageNotFound: 'Sahifa topilmadi',
    pageNotFoundMessage:
      "Siz izlayotgan sahifa mavjud emas yoki unga kirishga ruxsatingiz yo'q.",
    studentNotFound: 'Student topilmadi',
    studentNotFoundMessage:
      "Bu student sizning hisobingizga tayinlanmagan bo'lishi mumkin.",
    messageNotFoundTitle: 'Xabar topilmadi',
    messageNotAvailable: 'Xabar mavjud emas',
    goToHomeScreen: "Bosh sahifaga o'tish",
    /*404 error page*/

    /*error messages*/
    chooseCorrectDate: "Iltimos, to'g'ri sanani tanlang",
    failedToRetrieveMessage: 'Xabarni olishda xatolik yuz berdi',
    messageDoesNotBelongToStudent: 'Bu xabar studentga tegishli emas',
    /*error messages*/

    /*states*/
    loading: 'Yuklanmoqda...',
    /*states*/

    pressBackAgainToExit: 'Chiqish uchun yana bir marta bosing',

    /*student select page*/
    SelectStudent: 'Farzandingizni tanlang',

    /*no students screen*/
    noStudentsFound: "O'quvchilar topilmadi",
    noStudentsDescription:
      "Hisobingizga hali hech qanday o'quvchi tayinlanmaganga o'xshaydi. Maktab ma'muriga murojaat qiling yoki yangilashga harakat qiling.",
    refresh: 'Yangilash',
    needHelp: 'Yordam kerakmi?',
    checkCorrectAccount: "To'g'ri hisob bilan kirganingizni tekshiring",
    contactSchool: 'Agar bu muammo davom etsa, maktabingizga murojaat qiling',
    checkInternet: 'Internet ulanishingizni tekshiring',
    /*no students screen*/

    /*battery optimization*/
    improveNotificationDelivery: 'Bildirishnoma yetkazishni yaxshilash',
    batteryOptimizationDescription:
      "Ba'zi Android qurilmalari batareyani tejash uchun bildirishnomalarni kechiktirishi yoki bloklashi mumkin. Eng yaxshi tajriba uchun, ushbu ilova uchun batareya optimizatsiyasini o'chiring.",
    openSettings: 'Sozlamalarni ochish',
    deviceGuide: "Qurilma qo'llanmasi",
    dismiss: 'Yopish',
    batteryOptimizationSettings: 'Batareya optimizatsiyasi sozlamalari',
    batteryOptimizationInstructions:
      'Barcha bildirishnomalarni olishingizni ta\'minlash uchun:\n\n1. Ro\'yxatdan ushbu ilovani toping\n2. "Optimallashtirmaslik" yoki "Ruxsat berish"ni tanlang\n3. Ilovani qayta ishga tushiring\n\nEslatma: Qadamlar qurilma ishlab chiqaruvchisiga qarab farq qilishi mumkin.',
    deviceSpecificInstructions: "Qurilmaga xos ko'rsatmalar",
    deviceInstructionsText:
      'Turli Android ishlab chiqaruvchilarining turli sozlamalari bor:\n\n• Samsung: Sozlamalar \u2192 Ilovalar \u2192 [Ilova] \u2192 Batareya \u2192 Batareya ishlatishini optimallashtirish\n• Xiaomi: Sozlamalar \u2192 Ilovalar \u2192 Ilovalarni boshqarish \u2192 [Ilova] \u2192 Batareya tejagich\n• OnePlus: Sozlamalar \u2192 Ilovalar \u2192 [Ilova] \u2192 Batareya \u2192 Batareya optimizatsiyasi\n• Huawei: Sozlamalar \u2192 Ilovalar \u2192 [Ilova] \u2192 Batareya \u2192 Ilova ishga tushirish',
    gotIt: 'Tushunarli',
    /*battery optimization*/

    /*notification alerts*/
    notificationsDisabled: "Bildirishnomalar o'chirilgan",
    notificationsDisabledMessage:
      'Siz muhim yangilanishlarni olmaysiz. Sozlamalarda bildirishnomalarni yoqishingiz mumkin.',
    notificationsNotWorking: 'Bildirishnomalar ishlamayaptimi?',
    batteryOptimizationAlert:
      "Ishonchli bildirishnomalar uchun qurilma sozlamalarida ushbu ilova uchun batareya optimizatsiyasini o'chiring.",
    later: 'Keyinroq',
    ok: 'OK',
    cancel: 'Bekor qilish',
    /*notification alerts*/

    /*password requirements*/
    passwordRequirements: 'Parol talablari',
    minLength: 'Kamida 8 ta belgi',
    hasNumber: 'Kamida 1 ta raqam',
    hasUppercase: 'Kamida 1 ta katta harf',
    hasLowercase: 'Kamida 1 ta kichik harf',
    hasSpecialChar:
      'Kamida 1 ta maxsus belgi (!@#%&/\\,><\':;|_~`+=^$.()[]{}?" )',
    passwordStrength: 'Parol kuchi',
    weak: 'Zaif',
    medium: "O'rtacha",
    strong: 'Kuchli',
    createNewPassword: 'Yangi parol yaratish',
    /*password requirements*/

    /*Logout alert*/
    confirmLogout: 'Chiqishni tasdiqlash',
    logoutMessage: 'Haqiqatan ham chiqmoqchimisiz?',
    /*Logout alert*/

    /*message detail*/
    detailedView: 'Batafsil ko‘rish',
    contractFile: 'Shartnoma.pdf',
    /*message detail*/

    /*update alerts*/
    updateAvailable: 'Yangilanish mavjud 🚀',
    updateAvailableMessage:
      'Ilovaning yangi versiyasi mavjud. Hozir yuklab olasizmi?',
    download: 'Yuklab olish',
    downloading: 'Yuklab olinmoqda...',
    downloadingMessage: 'Yangilanish yuklab olinayotganda kuting.',
    updateDownloaded: 'Yangilanish yuklandi! ✅',
    updateDownloadedMessage:
      "Yangilanish muvaffaqiyatli yuklandi. O'zgarishlarni qo'llash uchun qayta ishga tushirasizmi?",
    restartNow: 'Hozir qayta ishga tushirish',
    restart: 'Qayta ishga tushirish',
    updateComplete: 'Yangilanish tugallandi',
    updateCompleteMessage: "Sizda eng so'nggi versiya mavjud.",
    downloadFailed: 'Yuklab olish muvaffaqiyatsiz',
    error: 'Xato',
    updateCheckFailed: 'Yangilanishni tekshirish muvaffaqiyatsiz',
    noUpdates: "Yangilanishlar yo'q",
    latestVersion: "Sizda eng so'nggi versiya mavjud!",
    checkForUpdates: 'Yangilanishlarni tekshirish',
    checking: 'Tekshirilmoqda...',
    updateFailed: 'Yangilanish muvaffaqiyatsiz',
    manualUpdateComplete:
      "Qo'lda yangilanish tugallandi. Qo'llash uchun qayta ishga tushirasizmi?",
    /*update alerts*/

    /*image alerts*/
    imageSaved: 'Saqlandi',
    imageSavedMessage: 'Rasm gallereyaga saqlandi.',
    downloadFailedImage: 'Yuklab olish muvaffaqiyatsiz',
    unableToSaveInDevelopment:
      "Development buildda saqlab bo'lmaydi. Production buildni sinab ko'ring yoki ruxsatlarni tekshiring.",
    permissionDenied: 'Foto kutubxonasiga kirish ruxsati berilmadi.',
    downloadError: 'Rasmni yuklab olishda xatolik.',
    /*image alerts*/
  },
  ru: {
    /*sign in page*/
    welcome: 'Здравствуйте, добро пожаловать',
    login: 'Вход в аккаунт',
    email: 'Электронная почта',
    enterEmail: 'Введите свою электронную почту',
    password: 'Пароль',
    enterPassword: 'Введите пароль',
    loginToAccount: 'Войти',
    forgotPassword: 'Забыли пароль?',
    resetPassword: 'Восстановить пароль',
    forgotPasswordLink: 'Забыли пароль? Восстановить.',
    noaccount: 'Нет аккаунта?',
    justregister: 'Зарегистрируйтесь',
    loginFailed: 'Введен неверный номер телефона или пароль',
    loginFailedNotifications:
      'Для продолжения включите уведомления. Проверьте настройки устройства.',
    loginSuccess: 'Вы успешно вошли',
    usePasswordInstead: 'Использовать пароль',
    useOtpInstead: 'Использовать код подтверждения',
    // Error messages - Authentication
    authenticationFailed:
      'Ошибка аутентификации. Пожалуйста, попробуйте снова.',
    incorrectCredentials: 'Неверный номер телефона или пароль.',
    authConfigError:
      'Служба аутентификации неправильно настроена. Пожалуйста, обратитесь в поддержку.',
    // Error messages - Phone number
    phoneNumberNotFound:
      'Этот номер телефона не зарегистрирован. Пожалуйста, проверьте и попробуйте снова.',
    invalidPhoneNumber: 'Пожалуйста, введите корректный номер телефона.',
    invalidPhoneFormat: 'Неверный формат номера телефона.',
    // Error messages - OTP
    invalidOtp: 'Неверный код подтверждения. Пожалуйста, попробуйте снова.',
    otpExpired:
      'Срок действия кода подтверждения истек. Пожалуйста, запросите новый код.',
    // Error messages - Password
    invalidPassword: 'Неверный пароль.',
    passwordTooShort: 'Пароль должен содержать не менее 8 символов.',
    temporaryPasswordRequired:
      'Временный пароль должен быть изменен. Пожалуйста, установите новый пароль.',
    // Error messages - Input
    invalidInput: 'Неверный ввод. Пожалуйста, проверьте свои записи.',
    // Error messages - Network
    networkError:
      'Ошибка подключения к сети. Пожалуйста, проверьте ваше интернет-соединение.',
    requestTimeout:
      'Время ожидания запроса истекло. Пожалуйста, попробуйте снова.',
    serviceUnavailable:
      'Сервис временно недоступен. Пожалуйста, попробуйте позже.',
    serverError: 'Ошибка сервера. Пожалуйста, попробуйте снова.',
    // Error messages - General
    accessDenied: 'Доступ запрещен.',
    notFound: 'Ресурс не найден.',
    tooManyAttempts:
      'Слишком много попыток входа. Пожалуйста, попробуйте снова через несколько минут.',
    /*sign in page*/

    /*forgot password pages*/
    resetPasswordTitle: 'Восстановление секретного кода',
    enterPhoneNumberText:
      'Пожалуйста, введите ваш номер телефона. На этот номер будет отправлен код подтверждения.',
    sendCode: 'Отправить код',
    verificationCodeSent:
      'Код подтверждения отправлен на ваш номер телефона. Пожалуйста, введите код.',
    enterVerificationCode: 'Введите код подтверждения',
    verificationCode: 'Код подтверждения',
    continueText: 'Продолжить',
    codeExpired: 'Код истек',
    resendCode: 'Отправить код заново',
    codeWillExpire: 'Код истечет через {seconds} секунд.',
    verify: 'Подтвердить',
    createNewPasswordTitle: 'Создать новый пароль',
    passwordCreatedSuccessfully:
      'Пароль успешно создан! Теперь вы можете войти с новым паролем.',
    enterNewPasswordText:
      'Пожалуйста, создайте безопасный пароль для вашего аккаунта.',
    confirmNewPassword: 'Подтвердите новый пароль',
    saveNewPassword: 'Сохранить',
    backToSignIn: 'Вернуться на страницу регистрации',
    /*forgot password pages*/

    /*tab bar layout*/
    home: 'Главная',
    form: 'Форма',
    settings: 'Настройки',
    personalInfo: 'Личная информация',
    /*tab bar layout*/

    /*register page*/
    register: 'Регистрация',
    alreadyaccount: 'Уже есть аккаунт?',
    justlogin: 'Войти',
    enterotp:
      'Введите одноразовый пароль, отправленный на вашу электронную почту',
    otp: 'Одноразовый пароль',
    newpassword: 'Создать новый пароль',
    /*register page*/

    /*form page*/
    form_message: 'Подайте заявки до 8:30 этого дня',
    reason: 'Причина заявки',
    absense: 'пропуск занятия',
    lateness: 'опоздание на занятие',
    leaving: 'уход пораньше',
    other: 'другая причина',
    chooseDate: 'Выбрать дату',
    additionalMessage: 'Дополнительное сообщение',
    submitForm: 'Отправить форму',
    message_placeholder: 'Пожалуйста, введите свое сообщение здесь',
    choose_student: 'Выберите ученика для отправки формы',
    /*form page*/

    /*settings page*/
    information: 'Информация',
    firstName: 'Имя',
    lastName: 'Фамилия',
    emailaddress: 'Электронная почта',
    phoneNumber: 'Номер телефона',
    preferences: 'Настройки',
    language: 'Язык приложения',
    logout: 'Выйти',
    passwordChangedSuccess: 'Пароль успешно изменен',
    changePassword: 'Изменить пароль',
    changePasswordText:
      'Введите текущий пароль и создайте новый безопасный пароль',
    savePassword: 'Сохранить пароль',
    enterOldPassword: 'Введите текущий пароль',
    enterNewPassword: 'Введите новый пароль',
    confirmPassword: 'Подтвердите пароль',
    enterConfirmPassword: 'Подтвердите новый пароль',
    passwordsDoNotMatch: 'Пароли не совпадают',
    currentPassword: 'Текущий пароль',
    newPassword: 'Новый пароль',
    invalidCurrentPassword: 'Неверный текущий пароль',
    passwordRequirementsNotMet: 'Новый пароль не соответствует требованиям',
    newPasswordMustBeDifferent: 'Новый пароль должен отличаться от текущего',
    pleaseEnsurePasswordRequirements:
      'Пожалуйста, убедитесь, что все требования к паролю выполнены',
    textSize: 'Размер текста',
    sampleText:
      'Выберите удобный для себя размер текста — чтение станет проще.',
    lightMode: 'Светлый режим',
    darkMode: 'Темный режим',
    batteryOptimization: 'Оптимизация батареи',
    name: 'Имя',
    /*settings page*/

    /*message*/
    critical: 'обязательно',
    important: 'важно',
    ordinary: 'обычно',
    group: 'Группа',
    continueReading: 'Продолжить чтение',
    loadMoreMessages: 'Загрузить больше сообщений',
    messageNotFound: 'Сообщение не найдено',
    noMessagesYet: 'Сообщений пока нет',
    noMessagesDescription:
      'Когда придет сообщение из школы, оно отобразится здесь. Потяните вниз, чтобы обновить.',
    errorLoadingMessages:
      'Ошибка при загрузке сообщений. Пожалуйста, попробуйте снова.',
    tryAgain: 'Попробовать снова',
    /*message*/

    /*404 error page*/
    pageNotFound: 'Страница не найдена',
    pageNotFoundMessage:
      'Страница, которую вы ищете, не существует или у вас нет к ней доступа.',
    studentNotFound: 'Студент не найден',
    studentNotFoundMessage:
      'Этот студент может быть не назначен на ваш аккаунт.',
    messageNotFoundTitle: 'Сообщение не найдено',
    messageNotAvailable: 'Сообщение недоступно',
    goToHomeScreen: 'Перейти на главную',
    /*404 error page*/

    /*error messages*/
    chooseCorrectDate: 'Пожалуйста, выберите правильную дату',
    failedToRetrieveMessage: 'Не удалось получить сообщение',
    messageDoesNotBelongToStudent: 'Это сообщение не принадлежит студенту',
    /*error messages*/

    /*states*/
    loading: 'Загрузка...',
    /*states*/

    pressBackAgainToExit: 'Нажмите еще раз, чтобы выйти',

    /*student select page*/
    SelectStudent: 'Выберите ученика',

    /*no students screen*/
    noStudentsFound: 'Ученики не найдены',
    noStudentsDescription:
      'Похоже, к вашему аккаунту еще не привязан ни один ученик. Обратитесь к администрации школы или попробуйте обновить.',
    refresh: 'Обновить',
    needHelp: 'Нужна помощь?',
    checkCorrectAccount: 'Проверьте, вошли ли вы под правильным аккаунтом',
    contactSchool: 'Если проблема сохраняется, свяжитесь с вашей школой',
    checkInternet: 'Проверьте подключение к интернету',
    /*no students screen*/

    /*battery optimization*/
    improveNotificationDelivery: 'Улучшить доставку уведомлений',
    batteryOptimizationDescription:
      'Некоторые Android-устройства могут задерживать или блокировать уведомления для экономии батареи. Для лучшего опыта отключите оптимизацию батареи для этого приложения.',
    openSettings: 'Открыть настройки',
    deviceGuide: 'Руководство по устройству',
    dismiss: 'Закрыть',
    batteryOptimizationSettings: 'Настройки оптимизации батареи',
    batteryOptimizationInstructions:
      'Чтобы получать все уведомления:\n\n1. Найдите это приложение в списке\n2. Выберите "Не оптимизировать" или "Разрешить"\n3. Перезапустите приложение\n\nПримечание: шаги могут отличаться в зависимости от производителя устройства.',
    deviceSpecificInstructions: 'Инструкции для конкретных устройств',
    deviceInstructionsText:
      'У разных производителей Android разные настройки:\n\n• Samsung: Настройки \u2192 Приложения \u2192 [Приложение] \u2192 Батарея \u2192 Оптимизация использования батареи\n• Xiaomi: Настройки \u2192 Приложения \u2192 Управление приложениями \u2192 [Приложение] \u2192 Экономия батареи\n• OnePlus: Настройки \u2192 Приложения \u2192 [Приложение] \u2192 Батарея \u2192 Оптимизация батареи\n• Huawei: Настройки \u2192 Приложения \u2192 [Приложение] \u2192 Батарея \u2192 Автозапуск',
    gotIt: 'Понятно',
    /*battery optimization*/

    /*notification alerts*/
    notificationsDisabled: 'Уведомления отключены',
    notificationsDisabledMessage:
      'Вы не будете получать важные обновления. Вы можете включить уведомления в настройках.',
    notificationsNotWorking: 'Уведомления не работают?',
    batteryOptimizationAlert:
      'Для надежных уведомлений отключите оптимизацию батареи для этого приложения в настройках устройства.',
    later: 'Позже',
    ok: 'ОК',
    cancel: 'Отмена',
    /*notification alerts*/

    /*password requirements*/
    passwordRequirements: 'Требования к паролю',
    minLength: 'Минимум 8 символов',
    hasNumber: 'Минимум 1 цифра',
    hasUppercase: 'Минимум 1 заглавная буква',
    hasLowercase: 'Минимум 1 строчная буква',
    hasSpecialChar:
      'Минимум 1 специальный символ (!@#%&/\\,><\':;|_~`+=^$.()[]{}?" )',
    passwordStrength: 'Надежность пароля',
    weak: 'Слабый',
    medium: 'Средний',
    strong: 'Сильный',
    createNewPassword: 'Создать новый пароль',
    /*password requirements*/

    /*Logout alert*/
    confirmLogout: 'Подтвердите выход',
    logoutMessage: 'Вы действительно хотите выйти?',
    /*Logout alert*/

    /*message detail*/
    detailedView: 'Подробный просмотр',
    contractFile: 'Договор.pdf',
    /*message detail*/

    /*update alerts*/
    updateAvailable: 'Доступно обновление 🚀',
    updateAvailableMessage:
      'Доступна новая версия приложения. Хотите скачать её сейчас?',
    download: 'Скачать',
    downloading: 'Загрузка...',
    downloadingMessage: 'Пожалуйста, подождите, пока загружается обновление.',
    updateDownloaded: 'Обновление загружено! ✅',
    updateDownloadedMessage:
      'Обновление успешно загружено. Перезапустить приложение для применения изменений?',
    restartNow: 'Перезапустить сейчас',
    restart: 'Перезапустить',
    updateComplete: 'Обновление завершено',
    updateCompleteMessage: 'У вас уже установлена последняя версия.',
    downloadFailed: 'Ошибка загрузки',
    error: 'Ошибка',
    updateCheckFailed: 'Ошибка проверки обновлений',
    noUpdates: 'Нет обновлений',
    latestVersion: 'У вас установлена последняя версия!',
    checkForUpdates: 'Проверить обновления',
    checking: 'Проверка...',
    updateFailed: 'Ошибка обновления',
    manualUpdateComplete:
      'Ручное обновление завершено. Перезапустить для применения изменений?',
    /*update alerts*/

    /*image alerts*/
    imageSaved: 'Сохранено',
    imageSavedMessage: 'Изображение сохранено в галерею.',
    downloadFailedImage: 'Ошибка загрузки',
    unableToSaveInDevelopment:
      'Невозможно сохранить в development сборке. Попробуйте production сборку или проверьте разрешения.',
    permissionDenied: 'Доступ к фотогалерее запрещен.',
    downloadError: 'Ошибка загрузки изображения.',
    /*image alerts*/
  },
};
export default translations;

export const reasonMapping: ReasonMapping = {
  en: {
    absense: 'absense',
    lateness: 'lateness',
    leaving: 'leaving early',
    other: 'other',
  },
  ja: {
    absense: '欠席',
    lateness: '遅刻',
    leaving: '早退',
    other: 'その他',
  },
  uz: {
    absense: 'dars qoldirish',
    lateness: 'darsga kechikish',
    leaving: 'erta ketish',
    other: 'boshqa sabab',
  },
  ru: {
    absense: 'пропуск занятия',
    lateness: 'опоздание на занятие',
    leaving: 'уход пораньше',
    other: 'другая причина',
  },
};
