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
  albumName = 'Downloads',
}: Props) {
  const [index, setIndex] = useState(initialIndex);
  const current = useMemo(() => images[index]?.uri ?? '', [images, index]);
  const { language, i18n } = useContext(I18nContext);

  const saveToLibrary = useCallback(async (localUri: string) => {
    const { status, canAskAgain } =
      await MediaLibrary.requestPermissionsAsync();
    if (status !== 'granted') {
      if (canAskAgain) {
        const retry = await MediaLibrary.requestPermissionsAsync();
        if (retry.status !== 'granted') throw new Error('Permission denied');
      } else {
        throw new Error('Permission denied');
      }
    }

    // Просто сохраняем в галерею без создания альбома
    await MediaLibrary.saveToLibraryAsync(localUri);
  }, []);

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
      const localPath = (FileSystem.cacheDirectory || '') + filename;

      // Правильный синтаксис для FileSystem.downloadAsync
      const downloadResult = await FileSystem.downloadAsync(
        current,
        localPath,
        {}
      );
      await saveToLibrary(downloadResult.uri);

      Alert.alert('Saved', 'Image saved to your Photos.');
    } catch (err: any) {
      console.error('Download error:', err);
      Alert.alert(
        'Download failed',
        err?.message || 'Could not save the image.'
      );
    }
  }, [current, saveToLibrary]);

  const Header = (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        paddingTop: 50, // отступ от status bar
      }}
    >
      {/* Кнопка закрытия слева */}
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

      {/* Кнопка Download справа */}
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
