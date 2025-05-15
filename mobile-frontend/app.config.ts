import { ExpoConfig } from '@expo/config-types';
import { config as dotEnvConfig } from 'dotenv'; // Renamed import to avoid conflict
dotEnvConfig(); // Called imported function

// Values will now be primarily derived from the 'config' object (app.json)
// and then dynamically adjusted by getDynamicAppConfig.

export default function ({ config }: { config: ExpoConfig }): ExpoConfig {
  const env =
    (process.env.APP_ENV as 'development' | 'preview' | 'production') ||
    'development';

  // Pass the initial config (from app.json) to getDynamicAppConfig
  const dynamicValues = getDynamicAppConfig(env, config);

  // Start with a copy of the initial config to make modifications
  const finalConfig: ExpoConfig = { ...config };

  // Apply general top-level overrides from dynamicValues
  finalConfig.name = dynamicValues.name;
  finalConfig.icon = dynamicValues.icon; // Overrides expo.icon
  finalConfig.scheme = dynamicValues.scheme; // Overrides expo.scheme

  // Apply iOS specific overrides, ensuring the ios object exists and preserving other iOS settings
  finalConfig.ios = {
    ...(finalConfig.ios || {}),
    bundleIdentifier: dynamicValues.bundleIdentifier, // Overrides/sets ios.bundleIdentifier
  };

  // Apply Android specific overrides, ensuring android object exists and preserving other Android settings
  finalConfig.android = {
    ...(finalConfig.android || {}),
    package: dynamicValues.packageName, // Overrides/sets android.package
  };

  // Ensure android.adaptiveIcon is an object before assigning foregroundImage
  // and preserve other adaptiveIcon properties like backgroundColor
  if (finalConfig.android) {
    finalConfig.android.adaptiveIcon = {
      ...(finalConfig.android.adaptiveIcon || {}),
      foregroundImage: dynamicValues.adaptiveIconPath, // Overrides/sets android.adaptiveIcon.foregroundImage
    };
  }

  // Handle EAS Project ID, ensuring extra and extra.eas objects exist
  if (process.env.EAS_PROJECT_ID) {
    finalConfig.extra = finalConfig.extra || {};
    finalConfig.extra.eas = finalConfig.extra.eas || {};
    finalConfig.extra.eas.projectId = process.env.EAS_PROJECT_ID;
  }

  return finalConfig; // Return the fully constructed and modified config
}

// Dynamically configure the app based on the environment, using base values from app.json.
export const getDynamicAppConfig = (
  environment: 'development' | 'preview' | 'production',
  baseConfig: ExpoConfig // Accept baseConfig (from app.json)
) => {
  // Extract base values from baseConfig, providing fallbacks if properties are missing
  const baseName = baseConfig.name || 'DefaultAppName';
  const baseBundleId =
    baseConfig.ios?.bundleIdentifier || 'com.default.bundleid';
  const basePackageName = baseConfig.android?.package || 'com.default.package';
  const baseScheme = baseConfig.scheme || 'defaultscheme';
  const baseIcon = baseConfig.icon || './assets/icon.png'; // Fallback if not in app.json
  const baseAdaptiveIconPath =
    baseConfig.android?.adaptiveIcon?.foregroundImage ||
    './assets/adaptive-icon.png'; // Fallback

  if (environment === 'production') {
    return {
      name: baseName,
      bundleIdentifier: baseBundleId,
      packageName: basePackageName,
      icon: baseIcon,
      adaptiveIconPath: baseAdaptiveIconPath,
      scheme: baseScheme,
    };
  }

  // For preview and development, use base names/ids/schemes derived from app.json,
  // but use specific icon paths for these environments.
  if (environment === 'preview') {
    return {
      name: `${baseName} Preview`,
      bundleIdentifier: `${baseBundleId}.preview`,
      packageName: `${basePackageName}.preview`,
      icon: './assets/images/icon-Prev.png', // Specific preview icon
      adaptiveIconPath: './assets/images/adaptive-icon-Prev.png', // Specific preview adaptive icon
      scheme: `${baseScheme}-prev`,
    };
  }

  // Development environment
  return {
    name: `${baseName} Development`,
    bundleIdentifier: `${baseBundleId}.dev`,
    packageName: `${basePackageName}.dev`,
    icon: './assets/images/icon-Dev.png', // Specific dev icon
    adaptiveIconPath: './assets/images/adaptive-icon-Dev.png', // Specific dev adaptive icon
    scheme: `${baseScheme}-dev`,
  };
};
