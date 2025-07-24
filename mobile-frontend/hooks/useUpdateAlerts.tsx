// Fixed version for Dev Client testing
import React, { useEffect } from 'react';
import * as Updates from 'expo-updates';
import { Alert } from 'react-native';
import { Button } from '@rneui/themed';

export const useUpdateAlerts = () => {
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
            'Update Available 🚀',
            `New update found on branch: ${Updates.channel || 'default'}`,
            [
              { text: 'Later', style: 'cancel' },
              {
                text: 'Download',
                onPress: async () => {
                  try {
                    console.log('[Updates] Starting download...');
                    Alert.alert(
                      'Downloading...',
                      'Please wait while update downloads.'
                    );

                    const result = await Updates.fetchUpdateAsync();
                    console.log('[Updates] Download result:', result);

                    if (result.isNew) {
                      Alert.alert(
                        'Update Downloaded! ✅',
                        'The update has been downloaded successfully. Restart to apply changes?',
                        [
                          { text: 'Later', style: 'cancel' },
                          {
                            text: 'Restart Now',
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
                        'Update Complete',
                        'You already have the latest version.'
                      );
                    }
                  } catch (error: unknown) {
                    console.error('[Updates] Download error:', error);
                    const errorMessage =
                      error instanceof Error
                        ? error.message
                        : 'Unknown error occurred';
                    Alert.alert('Download Failed', `Error: ${errorMessage}`);
                  }
                },
              },
            ]
          );
        } else {
          console.log('[Updates] No updates available');
          // Uncomment to see "no updates" message:
          // Alert.alert('No Updates', 'You already have the latest version!');
        }
      } catch (error: unknown) {
        console.error('[Updates] Check error:', error);
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error occurred';
        Alert.alert('Update Check Failed', `Error: ${errorMessage}`);
      }
    };

    // Check after 3 seconds
    const timer = setTimeout(checkAndAlertUpdates, 3000);
    return () => clearTimeout(timer);
  }, []);
};

// Manual update button for testing
export const UpdateButton = ({
  title = 'Check for Updates',
}: {
  title?: string;
}) => {
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
            'Update Downloaded! ✅',
            'Manual update complete. Restart to apply?',
            [
              { text: 'Later', style: 'cancel' },
              { text: 'Restart', onPress: () => Updates.reloadAsync() },
            ]
          );
        }
      } else {
        Alert.alert('No Updates', 'You have the latest version!');
      }
    } catch (error: unknown) {
      console.error('[Updates] Manual check error:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      Alert.alert('Update Failed', `Error: ${errorMessage}`);
    } finally {
      setChecking(false);
    }
  };

  return (
    <Button
      title={checking ? 'Checking...' : title}
      onPress={handleUpdate}
      disabled={checking}
    />
  );
};
