import React, { useEffect, useContext } from 'react';
import * as Updates from 'expo-updates';
import { Alert } from 'react-native';
import { Button } from '@rneui/themed';
import { I18nContext } from '@/contexts/i18n-context';

export const useUpdateAlerts = () => {
  const { language, i18n } = useContext(I18nContext);

  useEffect(() => {
    const checkAndAlertUpdates = async () => {
      try {
        console.log('[Updates] Checking for updates...');
        console.log('[Updates] Current channel:', Updates.channel);
        console.log('[Updates] Runtime version:', Updates.runtimeVersion);

        const update = await Updates.checkForUpdateAsync();
        console.log('[Updates] Check result:', update);

        if (update.isAvailable) {
          console.log('[Updates] Update available!');
          Alert.alert(
            i18n[language].updateAvailable,
            i18n[language].updateAvailableMessage,
            [
              {
                text: i18n[language].later,
                style: 'cancel',
              },
              {
                text: i18n[language].download,
                onPress: async () => {
                  try {
                    console.log('[Updates] Starting download...');
                    Alert.alert(
                      i18n[language].downloading,
                      i18n[language].downloadingMessage
                    );

                    const result = await Updates.fetchUpdateAsync();
                    console.log('[Updates] Download result:', result);

                    if (result.isNew) {
                      Alert.alert(
                        i18n[language].updateDownloaded,
                        i18n[language].updateDownloadedMessage,
                        [
                          {
                            text: i18n[language].later,
                            style: 'cancel',
                          },
                          {
                            text: i18n[language].restartNow,
                            onPress: async () => {
                              console.log('[Updates] Reloading app...');
                              await Updates.reloadAsync();
                            },
                          },
                        ]
                      );
                    } else {
                      console.log('[Updates] No new update after download');
                      Alert.alert(
                        i18n[language].updateComplete,
                        i18n[language].updateCompleteMessage
                      );
                    }
                  } catch (error: unknown) {
                    console.error('[Updates] Download error:', error);
                    const errorMessage =
                      error instanceof Error
                        ? error.message
                        : 'Unknown error occurred';
                    Alert.alert(
                      i18n[language].downloadFailed,
                      `${i18n[language].error}: ${errorMessage}`
                    );
                  }
                },
              },
            ]
          );
        } else {
          console.log('[Updates] No updates available');
          // Uncomment to see "no updates" message:
          // Alert.alert(i18n[language].noUpdates || 'No Updates', i18n[language].latestVersion || 'You already have the latest version!');
        }
      } catch (error: unknown) {
        console.error('[Updates] Check error:', error);
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error occurred';
        Alert.alert(
          i18n[language].updateCheckFailed,
          `${i18n[language].error}: ${errorMessage}`
        );
      }
    };

    // Check after 3 seconds
    const timer = setTimeout(checkAndAlertUpdates, 3000);
    return () => clearTimeout(timer);
  }, [language, i18n]);
};

// Manual update button for testing
export const UpdateButton = ({ title }: { title?: string }) => {
  const { language, i18n } = useContext(I18nContext);
  const [checking, setChecking] = React.useState(false);

  const handleUpdate = async () => {
    if (checking) return;

    setChecking(true);
    console.log('[Updates] Manual check initiated');

    try {
      const update = await Updates.checkForUpdateAsync();
      console.log('[Updates] Manual check result:', update);

      if (update.isAvailable) {
        console.log('[Updates] Manual update available');
        const result = await Updates.fetchUpdateAsync();

        if (result.isNew) {
          Alert.alert(
            i18n[language].updateDownloaded,
            i18n[language].manualUpdateComplete,
            [
              {
                text: i18n[language].later,
                style: 'cancel',
              },
              {
                text: i18n[language].restart,
                onPress: () => Updates.reloadAsync(),
              },
            ]
          );
        }
      } else {
        Alert.alert(i18n[language].noUpdates, i18n[language].latestVersion);
      }
    } catch (error: unknown) {
      console.error('[Updates] Manual check error:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      Alert.alert(
        i18n[language].updateFailed,
        `${i18n[language].error}: ${errorMessage}`
      );
    } finally {
      setChecking(false);
    }
  };

  const buttonTitle = title || i18n[language].checkForUpdates;

  return (
    <Button
      title={checking ? i18n[language].checking : buttonTitle}
      onPress={handleUpdate}
      disabled={checking}
    />
  );
};
