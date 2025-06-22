import type { ReasonMapping } from '@/types/i18n';

export default {
  en: {
    /*sign in page*/
    welcome: 'Welcome Back',
    login: 'Login to access your account',
    email: 'Email',
    enterEmail: 'Enter email here',
    password: 'Password',
    enterPassword: 'Enter password here',
    loginToAccount: 'Login to Account',
    forgotPassword: 'Forgot your password?',
    resetPassword: 'reset password',
    noaccount: "Don't have an account?",
    justregister: 'Register',
    loginFailed: 'Invalid email or password',
    loginSuccess: 'Logged in successfully',
    /*sign in page*/

    /*tab bar layout*/
    home: 'Home',
    form: 'Form',
    settings: 'Settings',
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
    language: 'Language',
    logout: 'Logout',
    passwordChangedSuccess: 'Password changed successfully',
    changePassword: 'Change Password',
    savePassword: 'Save Password',
    textSize: 'Text Size',
    lightMode: 'Light Mode',
    darkMode: 'Dark Mode',
    batteryOptimization: 'Battery Optimization',
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

    /*error messages*/
    chooseCorrectDate: 'Please choose a correct date',
    /*error messages*/

    /*states*/
    loading: 'Loading...',
    /*states*/

    pressBackAgainToExit: 'Press back again to exit',

    /*student select page*/
    SelectStudent: 'Select Student',

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
      'Different Android manufacturers have different settings:\n\n• Samsung: Settings → Apps → [App] → Battery → Optimize battery usage\n• Xiaomi: Settings → Apps → Manage apps → [App] → Battery saver\n• OnePlus: Settings → Apps → [App] → Battery → Battery optimization\n• Huawei: Settings → Apps → [App] → Battery → App launch',
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
  },
  ja: {
    /*sign in page*/
    welcome: 'お帰りなさい',
    login: 'アカウントにログイン',
    email: 'メールアドレス',
    enterEmail: 'メールアドレスを入力',
    password: 'パスワード',
    enterPassword: 'パスワードを入力',
    loginToAccount: 'アカウントにログイン',
    forgotPassword: 'パスワードを忘れましたか？',
    resetPassword: 'パスワードをリセット',
    noaccount: 'アカウントをお持ちでないですか？',
    justregister: '登録',
    loginFailed: '無効なメールアドレスまたはパスワード',
    loginSuccess: 'ログインに成功しました',
    /*sign in page*/

    /*tab bar layout*/
    home: 'ホーム',
    form: 'フォーム',
    settings: '設定',
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
    language: '言語',
    logout: 'ログアウト',
    passwordChangedSuccess: 'パスワードが正常に変更されました',
    changePassword: 'パスワードを変更',
    savePassword: 'パスワードを保存',
    textSize: '文字サイズ',
    lightMode: 'ライトモード',
    darkMode: 'ダークモード',
    batteryOptimization: 'バッテリー最適化',
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

    /*error messages*/
    chooseCorrectDate: '正しい日付を選択してください',
    /*error messages*/

    /*states*/
    loading: '読み込み中...',
    /*states*/

    pressBackAgainToExit: 'もう一度押して終了',

    /*student select page*/
    SelectStudent: '学生を選びなさい',

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
      'Androidメーカーごとに設定が異なります：\n\n• Samsung：設定→アプリ→[アプリ]→バッテリー→バッテリー使用量の最適化\n• Xiaomi：設定→アプリ→アプリの管理→[アプリ]→バッテリーセーバー\n• OnePlus：設定→アプリ→[アプリ]→バッテリー→バッテリー最適化\n• Huawei：設定→アプリ→[アプリ]→バッテリー→アプリ起動',
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
  },
  uz: {
    /*sign in page*/
    welcome: 'Xush kelibsiz',
    login: 'Hisobingizga kirish',
    email: 'Elektron pochta',
    enterEmail: 'Elektron pochtangizni kiriting',
    password: 'Parol',
    enterPassword: 'Parolni kiriting',
    loginToAccount: 'Hisobga kirish',
    forgotPassword: 'Parolingizni unutdingizmi?',
    resetPassword: 'parolni tiklash',
    noaccount: "Hisobingiz yo'qmi?",
    justregister: "Ro'yxatdan o'ting",
    loginFailed: "Noto'g'ri elektron pochta yoki parol",
    loginSuccess: 'Muvaffaqiyatli kirdingiz',
    /*sign in page*/

    /*tab bar layout*/
    home: 'Bosh sahifa',
    form: 'Forma',
    settings: 'Sozlamalar',
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
    phoneNumber: 'Telefon raqami',
    preferences: 'Sozlamalar',
    language: 'Til',
    logout: 'Chiqish',
    passwordChangedSuccess: "Parol muvaffaqiyatli o'zgartirildi",
    changePassword: "Parolni o'zgartirish",
    savePassword: 'Parolni saqlash',
    textSize: "Matn o'lchami",
    lightMode: "Yorug' rejim",
    darkMode: "Qorong'u rejim",
    batteryOptimization: 'Batareya optimizatsiyasi',
    /*settings page*/

    /*message*/
    critical: 'majburiy',
    important: 'muhim',
    ordinary: 'oddiy',
    group: 'Guruh',
    continueReading: 'Davom etish',
    loadMoreMessages: "Ko'proq xabarlar",
    messageNotFound: 'Xabar topilmadi',
    noMessagesYet: "Hali xabarlar yo'q",
    noMessagesDescription:
      "Maktabdan xabar kelganida, ular shu yerda ko'rsatiladi. Yangilash uchun pastga torting.",
    errorLoadingMessages:
      "Xabarlarni yuklashda xatolik yuz berdi. Iltimos, qayta urinib ko'ring.",
    tryAgain: 'Qayta urinish',
    /*message*/

    /*error messages*/
    chooseCorrectDate: "Iltimos, to'g'ri sanani tanlang",
    /*error messages*/

    /*states*/
    loading: 'Yuklanmoqda...',
    /*states*/

    pressBackAgainToExit: 'Chiqish uchun yana bir marta bosing',

    /*student select page*/
    SelectStudent: "O'quvchini tanlang",

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
      'Turli Android ishlab chiqaruvchilarining turli sozlamalari bor:\n\n• Samsung: Sozlamalar → Ilovalar → [Ilova] → Batareya → Batareya ishlatishini optimallashtirish\n• Xiaomi: Sozlamalar → Ilovalar → Ilovalarni boshqarish → [Ilova] → Batareya tejagich\n• OnePlus: Sozlamalar → Ilovalar → [Ilova] → Batareya → Batareya optimizatsiyasi\n• Huawei: Sozlamalar → Ilovalar → [Ilova] → Batareya → Ilova ishga tushirish',
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
  },
};

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
};
