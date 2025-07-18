require('dotenv').config();
const packageJson = require('./package.json');

const getVariant = () =>
  process.env.APP_VARIANT || process.env.EAS_BUILD_PROFILE || 'development';

const variant = getVariant();

const configByVariant = {
  development: {
    name: 'Parent Notification (Dev)',
    androidPackage: 'com.jduapp.parentnotification.dev',
    iosBundleId: 'com.jduapp.parentnotification.dev',
    icon: './assets/images/icon-dev.png',
    adaptiveIcon: './assets/images/adaptive-icon-dev.png',
    scheme: 'jduapp-dev',
  },
  preview: {
    name: 'Parent Notification (Preview)',
    androidPackage: 'com.jduapp.parentnotification.preview',
    iosBundleId: 'com.jduapp.parentnotification.preview',
    icon: './assets/images/icon-prev.png',
    adaptiveIcon: './assets/images/adaptive-icon-prev.png',
    scheme: 'jduapp-preview',
  },
  production: {
    name: 'Parent Notification',
    androidPackage: 'com.jduapp.parentnotification',
    iosBundleId: 'com.jduapp.parentnotification',
    icon: './assets/images/icon.png',
    adaptiveIcon: './assets/images/adaptive-icon.png',
    scheme: 'jduapp',
  },
};

const variantConfig = configByVariant[variant] || configByVariant.development;

console.log(`Using variant: ${variant}`);
console.log(`App name: ${variantConfig.name}`);
console.log(`PackageJson version: ${packageJson.version}`);

module.exports = ({ config }) => {
  return {
    ...config,
    runtimeVersion: packageJson.version,
    name: variantConfig.name,
    slug: 'parent-notification',
    version: packageJson.version,
    orientation: 'portrait',
    icon: variantConfig.icon,
    scheme: variantConfig.scheme,
    platforms: ['ios', 'android', 'web'],
    userInterfaceStyle: 'automatic',
    updates: {
      url: 'https://u.expo.dev/61968ac8-e70b-44e4-a5ed-00d5521eec81',
    },
    splash: {
      image: './assets/images/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: variantConfig.iosBundleId,
      googleServicesFile:
        process.env.GOOGLE_SERVICES_PLIST ?? './GoogleService-Info.plist',
      infoPlist: {
        CFBundleAllowMixedLocalizations: true,
        ITSAppUsesNonExemptEncryption: false,
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: variantConfig.adaptiveIcon,
        backgroundColor: '#ffffff',
      },
      package: variantConfig.androidPackage,
      googleServicesFile:
        process.env.GOOGLE_SERVICES_JSON ?? './google-services.json',
      intentFilters: [
        {
          autoVerify: true,
          action: 'VIEW',
          data: [
            {
              scheme: 'https',
              host: 'appuri-hogosha.vercel.app',
              pathPrefix: '/parentnotification',
            },
          ],
          category: ['BROWSABLE', 'DEFAULT'],
        },
      ],
    },
    web: {
      bundler: 'metro',
      output: 'static',
      favicon: './assets/images/favicon.png',
    },
    plugins: [
      [
        'expo-notifications',
        {
          icon: './assets/images/icon.png',
          color: '#000000',
        },
      ],
      'expo-router',
      'expo-font',
      'expo-localization',
      'expo-sqlite',
      'expo-web-browser',
    ],
    experiments: {},
    extra: {
      router: {
        origin: false,
      },
      eas: {
        projectId: process.env.EAS_PROJECT_ID || '61968ac8-e70b-44e4-a5ed-00d5521eec81',
      },
    },
  };
};
