import React, { useCallback, useMemo, useState, useContext } from 'react';
import { Alert, Platform, TouchableOpacity, View, Text } from 'react-native';
import ImageViewing from 'react-native-image-viewing';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { Ionicons } from '@expo/vector-icons';
import { I18nContext } from '@/contexts/i18n-context';

type Img = { uri: string };

interface Props {
  visible: boolean;
  images: Img[];
  initialIndex?: number;
  onRequestClose: () => void;
  albumName?: string;
}

export default function ZoomGallery({
  visible,
  images,
  initialIndex = 0,
  onRequestClose,
}: Props) {
  const [index, setIndex] = useState(initialIndex);
  const current = useMemo(() => images[index]?.uri ?? '', [images, index]);
  const { language, i18n } = useContext(I18nContext);

  const saveToLibrary = useCallback(
    async (localUri: string) => {
      // For Android 13+ (API 33+), we need different permissions
      try {
        const { status, canAskAgain } =
          await MediaLibrary.requestPermissionsAsync();

        if (status !== 'granted') {
          if (canAskAgain) {
            const retry = await MediaLibrary.requestPermissionsAsync();
            if (retry.status !== 'granted') {
              throw new Error(
                i18n[language].permissionDenied ||
                  'Permission denied. Please enable photo access in Settings.'
              );
            }
          } else {
            throw new Error(
              i18n[language].permissionDenied ||
                'Permission denied. Please enable photo access in Settings.'
            );
          }
        }

        // save to library
        await MediaLibrary.saveToLibraryAsync(localUri);
      } catch (error: any) {
        // If MediaLibrary fails, try alternative approach for Android
        if (Platform.OS === 'android') {
          console.warn(
            'MediaLibrary failed, trying FileSystem approach:',
            error
          );
          throw new Error(
            i18n[language].unableToSaveInDevelopment ||
              'Unable to save image. This may be due to Android permission restrictions in development builds. Please try a production build.'
          );
        }
        throw error;
      }
    },
    [i18n, language]
  );

  const downloadCurrent = useCallback(async () => {
    try {
      if (!current) return;

      // Web download
      if (Platform.OS === 'web') {
        const a = document.createElement('a');
        a.href = current;
        a.download = `image-${Date.now()}.jpg`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        return;
      }

      // Native download
      const filename = `image-${Date.now()}.jpg`;
      const localPath = FileSystem.Paths.cache.toString() + filename;

      // Download the image
      const downloadResult = await FileSystem.downloadAsync(
        current,
        localPath,
        {}
      );

      // Save to gallery
      await saveToLibrary(downloadResult.uri);

      Alert.alert(
        i18n[language].imageSaved || 'Saved',
        i18n[language].imageSavedMessage || 'Image saved to your Photos.'
      );
    } catch (err: any) {
      console.error('Download error:', err);

      // More specific error messages
      let errorMessage =
        i18n[language].downloadError || 'Could not save the image.';

      if (err?.message?.includes('Permission denied')) {
        errorMessage =
          i18n[language].permissionDenied ||
          'Permission denied. Please allow photo access in your device settings.';
      } else if (err?.message?.includes('development builds')) {
        errorMessage =
          i18n[language].unableToSaveInDevelopment ||
          'Unable to save in development build. Try a production build or check permissions.';
      } else if (Platform.OS === 'android') {
        errorMessage =
          i18n[language].permissionDenied ||
          'Unable to save image. Please ensure photo permissions are granted in Settings.';
      }

      Alert.alert(
        i18n[language].downloadFailedImage || 'Download failed',
        errorMessage
      );
    }
  }, [current, saveToLibrary, i18n, language]);

  const Header = (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        paddingTop: 50,
      }}
    >
      <TouchableOpacity
        onPress={onRequestClose}
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: 'rgba(0,0,0,0.5)',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name='close' size={24} color='#fff' />
      </TouchableOpacity>

      <TouchableOpacity
        onPress={downloadCurrent}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: 'rgba(0,0,0,0.5)',
          paddingHorizontal: 12,
          paddingVertical: 8,
          borderRadius: 20,
          gap: 6,
        }}
      >
        <Ionicons name='download-outline' size={20} color='#fff' />
        <Text style={{ color: '#fff', fontWeight: '600' }}>
          {i18n[language].download || 'Download'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <ImageViewing
      images={images}
      imageIndex={index}
      visible={visible}
      onRequestClose={onRequestClose}
      onImageIndexChange={setIndex}
      HeaderComponent={() => Header}
    />
  );
}
