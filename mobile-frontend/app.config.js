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
    iosIconTinted: './assets/images/icon-dev/ios-tinted-dev.png',
    iosIconDark: './assets/images/icon-dev/ios-dark-dev.png',
    iosIconLight: './assets/images/icon-dev/ios-light-dev.png',
    splashLight: './assets/images/icon-dev/splash-icon-light-dev.png',
    splashDark: './assets/images/icon-dev/splash-icon-dark-dev.png',
    adaptiveIcon: './assets/images/icon-dev/adaptive-icon-dev.png',
    scheme: 'jduapp-dev',
  },
  preview: {
    name: 'Parent Notification (Preview)',
    androidPackage: 'com.jduapp.parentnotification.preview',
    iosBundleId: 'com.jduapp.parentnotification.preview',
    iosIconTinted: './assets/images/icon-prev/ios-tinted-preview.png',
    iosIconDark: './assets/images/icon-prev/ios-dark-preview.png',
    iosIconLight: './assets/images/icon-prev/ios-light-preview.png',
    splashLight: './assets/images/icon-prev/splash-icon-light-preview.png',
    splashDark: './assets/images/icon-prev/splash-icon-dark-preview.png',
    adaptiveIcon: './assets/images/icon-prev/adaptive-icon-preview.png',
    scheme: 'jduapp-preview',
  },
  production: {
    name: 'Parent Notification',
    androidPackage: 'com.jduapp.parentnotification',
    iosBundleId: 'com.jduapp.parentnotification',
    iosIconTinted: './assets/images/icon/ios-tinted.png',
    iosIconDark: './assets/images/icon/ios-dark.png',
    iosIconLight: './assets/images/icon/ios-light.png',
    splashLight: './assets/images/icon/splash-icon-light.png',
    splashDark: './assets/images/icon/splash-icon-dark.png',
    adaptiveIcon: './assets/images/icon/adaptive-icon.png',
    scheme: 'jduapp',
  },
};

const variantConfig = configByVariant[variant] || configByVariant.development;

console.log(`Using variant: ${variant}`);

module.exports = ({ config }) => {
  return {
    ...config,
    runtimeVersion: packageJson.version,
    name: variantConfig.name,
    slug: 'parent-notification',
    version: packageJson.version,
    orientation: 'portrait',
    icon: variantConfig.iosIconLight,
    scheme: variantConfig.scheme,
    platforms: ['ios', 'android', 'web'],
    userInterfaceStyle: 'automatic',
    updates: {
      url: 'https://u.expo.dev/61968ac8-e70b-44e4-a5ed-00d5521eec81',
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: variantConfig.iosBundleId,
      icon: {
        light: variantConfig.iosIconLight,
        dark: variantConfig.iosIconDark,
        tinted: variantConfig.iosIconTinted,
      },
      ...(process.env.GOOGLE_SERVICES_PLIST && {
        googleServicesFile: process.env.GOOGLE_SERVICES_PLIST,
      }),
      infoPlist: {
        CFBundleAllowMixedLocalizations: true,
        ITSAppUsesNonExemptEncryption: false,
        UIStatusBarStyle: 'UIStatusBarStyleLightContent',
        UIViewControllerBasedStatusBarAppearance: false,
        NSPhotoLibraryAddUsageDescription:
          'We need access to your photo library to save images to your gallery.',
        // Add URL schemes for all custom schemes (not just current variant)
        // This allows dev app to handle production URLs and vice versa
        CFBundleURLTypes: [
          {
            CFBundleURLName: 'jduapp',
            CFBundleURLSchemes: ['jduapp', 'jduapp-dev', 'jduapp-preview'],
          },
        ],
      },
      associatedDomains: [
        'applinks:appuri-hogosha.vercel.app',
        // Optionally add specific paths if needed
        'applinks:appuri-hogosha.vercel.app/parentnotification/*',
      ],
      // CRITICAL: Add push notification entitlements for iOS preview builds
      entitlements: {
        'aps-environment':
          variant === 'production' ? 'production' : 'development',
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: variantConfig.adaptiveIcon,
        monochromeImage: variantConfig.adaptiveIcon,
        backgroundColor: '#ffffff',
      },
      package: variantConfig.androidPackage,
      googleServicesFile:
        process.env.GOOGLE_SERVICES_JSON ?? './google-services.json',
      statusBar: {
        barStyle: 'light-content',
        backgroundColor: '#3B81F6',
      },
      navigationBar: {
        visible: false,
      },
      permissions: [
        'WRITE_EXTERNAL_STORAGE',
        'READ_EXTERNAL_STORAGE',
        'READ_MEDIA_IMAGES',
        'WRITE_MEDIA_STORAGE',
      ],
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
        // Add support for all custom schemes in all app variants
        {
          action: 'VIEW',
          data: [
            { scheme: 'jduapp' },
            { scheme: 'jduapp-dev' },
            { scheme: 'jduapp-preview' },
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
        'expo-splash-screen',
        {
          backgroundColor: '#ffffff',
          image: variantConfig.splashLight,
          imageWidth: 200,
          resizeMode: 'contain',
          dark: {
            image: variantConfig.splashDark,
            backgroundColor: '#000000',
            imageWidth: 200,
          },
          ios: {
            backgroundColor: '#ffffff',
            image: variantConfig.splashLight,
            imageWidth: 120,
            resizeMode: 'contain',
            dark: {
              image: variantConfig.splashDark,
              backgroundColor: '#000000',
              imageWidth: 120,
            },
          },
        },
      ],
      [
        'expo-notifications',
        {
          icon: variantConfig.iosIconLight,
          color: '#000000',
        },
      ],
      'expo-router',
      'expo-font',
      'expo-localization',
      'expo-sqlite',
      'expo-web-browser',
      [
        'expo-media-library',
        {
          photosPermission:
            'We need access to your photo library to save images to your gallery.',
          savePhotosPermission:
            'We need access to your photo library to save images to your gallery.',
          isAccessMediaLocationEnabled: true,
        },
      ],
    ],
    experiments: {},
    extra: {
      router: {
        origin: false,
      },
      eas: {
        projectId:
          process.env.EAS_PROJECT_ID || '61968ac8-e70b-44e4-a5ed-00d5521eec81',
      },
    },
  };
};
