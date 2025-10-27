import React, {
  useCallback,
  useMemo,
  useState,
  useContext,
  useEffect,
} from 'react';
import {
  Platform,
  TouchableOpacity,
  View,
  Text,
  Modal,
  Dimensions,
  StatusBar,
  Image,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import { Ionicons } from '@expo/vector-icons';
import { I18nContext } from '@/contexts/i18n-context';
import Alert from '@/utils/customAlert';

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
  const [scale, setScale] = useState(1);
  const [lastScale, setLastScale] = useState(1);
  const [translateX, setTranslateX] = useState(0);
  const [translateY, setTranslateY] = useState(0);
  const [lastTranslateX, setLastTranslateX] = useState(0);
  const [lastTranslateY, setLastTranslateY] = useState(0);

  // Update index when initialIndex changes
  useEffect(() => {
    setIndex(initialIndex);
  }, [initialIndex]);

  // Reset scale when index changes
  useEffect(() => {
    try {
      setScale(1);
      setLastScale(1);
      setTranslateX(0);
      setTranslateY(0);
      setLastTranslateX(0);
      setLastTranslateY(0);
    } catch (error) {
      console.warn('Error resetting scale on index change:', error);
    }
  }, [index]);

  // Log when modal opens
  useEffect(() => {
    if (visible) {
      try {
        console.log(
          'ZoomGallery: Modal opened, index:',
          index,
          'image:',
          images[index]?.uri
        );
        // Reset scale when modal opens
        setScale(1);
        setLastScale(1);
        setTranslateX(0);
        setTranslateY(0);
        setLastTranslateX(0);
        setLastTranslateY(0);
      } catch (error) {
        console.warn('Error on modal open:', error);
      }
    }
  }, [visible, index, images]);

  const onPinchGestureEvent = (event: any) => {
    try {
      if (!event || typeof event.scale !== 'number') return;

      const newScale = lastScale * event.scale;
      // Limit scale between 1 and 3
      const clampedScale = Math.min(Math.max(newScale, 1), 3);

      if (isFinite(clampedScale)) {
        setScale(clampedScale);

        // Reset position when scale is back to 1
        if (clampedScale <= 1) {
          setTranslateX(0);
          setTranslateY(0);
        }
      }
    } catch (error) {
      console.warn('Pinch gesture error:', error);
    }
  };

  const onPinchEnd = () => {
    try {
      if (isFinite(scale)) {
        setLastScale(scale);

        // Reset position and ensure scale is exactly 1 when close to 1
        if (scale <= 1.1) {
          setScale(1);
          setLastScale(1);
          setTranslateX(0);
          setTranslateY(0);
          setLastTranslateX(0);
          setLastTranslateY(0);
        } else {
          // Update translation state when pinch ends
          setLastTranslateX(translateX);
          setLastTranslateY(translateY);
        }
      }
    } catch (error) {
      console.warn('Pinch end error:', error);
    }
  };

  const onPanGestureEvent = (event: any) => {
    try {
      if (
        !event ||
        typeof event.translationX !== 'number' ||
        typeof event.translationY !== 'number'
      )
        return;

      // Only allow pan when zoomed in (scale > 1.1 to avoid small movements)
      if (scale > 1.1) {
        const newTranslateX = lastTranslateX + event.translationX;
        const newTranslateY = lastTranslateY + event.translationY;

        // Limit translation to prevent moving too far
        const maxTranslate = 100 * scale; // Adjust this value as needed

        setTranslateX(
          Math.min(Math.max(newTranslateX, -maxTranslate), maxTranslate)
        );
        setTranslateY(
          Math.min(Math.max(newTranslateY, -maxTranslate), maxTranslate)
        );
      }
    } catch (error) {
      console.warn('Pan gesture error:', error);
    }
  };

  const onPanEnd = () => {
    try {
      setLastTranslateX(translateX);
      setLastTranslateY(translateY);
    } catch (error) {
      console.warn('Pan end error:', error);
    }
  };

  // Create gestures using new API with error handling
  const pinchGesture = Gesture.Pinch()
    .onUpdate(onPinchGestureEvent)
    .onEnd(onPinchEnd)
    .runOnJS(true);

  const panGesture = Gesture.Pan()
    .onUpdate(onPanGestureEvent)
    .onEnd(onPanEnd)
    .runOnJS(true);

  // Combine gestures
  const combinedGesture = Gesture.Simultaneous(pinchGesture, panGesture);

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
      const localPath = (FileSystem.cacheDirectory || '') + filename;

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
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
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
    <Modal
      visible={visible}
      transparent={true}
      animationType='fade'
      onRequestClose={onRequestClose}
      statusBarTranslucent={true}
    >
      <StatusBar hidden={true} />
      <View style={{ flex: 1, backgroundColor: 'black' }}>
        <View
          style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
        >
          {images[index] && (
            <GestureDetector gesture={combinedGesture}>
              <View
                style={{
                  transform: [
                    { scale: isFinite(scale) && scale > 0 ? scale : 1 },
                    { translateX: isFinite(translateX) ? translateX : 0 },
                    { translateY: isFinite(translateY) ? translateY : 0 },
                  ],
                }}
              >
                <Image
                  source={{ uri: images[index].uri }}
                  style={{
                    width: Dimensions.get('window').width,
                    height: Dimensions.get('window').height - 100,
                  }}
                  resizeMode='contain'
                  onError={error => {
                    console.log('Image load error:', error);
                  }}
                  onLoad={() => {
                    console.log('Image loaded successfully');
                  }}
                />
              </View>
            </GestureDetector>
          )}
          {!images[index] && (
            <Text style={{ color: 'white', fontSize: 16 }}>
              No image available
            </Text>
          )}
        </View>

        {/* Header placed after content to be on top */}
        {Header}

        {/* Navigation buttons */}
        {images.length > 1 && (
          <>
            {index > 0 && (
              <TouchableOpacity
                style={{
                  position: 'absolute',
                  left: 20,
                  top: '50%',
                  width: 50,
                  height: 50,
                  borderRadius: 25,
                  backgroundColor: 'rgba(0,0,0,0.5)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 999,
                }}
                onPress={() => setIndex(index - 1)}
              >
                <Ionicons name='chevron-back' size={30} color='#fff' />
              </TouchableOpacity>
            )}

            {index < images.length - 1 && (
              <TouchableOpacity
                style={{
                  position: 'absolute',
                  right: 20,
                  top: '50%',
                  width: 50,
                  height: 50,
                  borderRadius: 25,
                  backgroundColor: 'rgba(0,0,0,0.5)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 999,
                }}
                onPress={() => setIndex(index + 1)}
              >
                <Ionicons name='chevron-forward' size={30} color='#fff' />
              </TouchableOpacity>
            )}
          </>
        )}

        {/* Image counter */}
        {images.length > 1 && (
          <View
            style={{
              position: 'absolute',
              bottom: 50,
              alignSelf: 'center',
              backgroundColor: 'rgba(0,0,0,0.5)',
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 15,
              zIndex: 999,
            }}
          >
            <Text style={{ color: '#fff', fontSize: 14, fontWeight: '500' }}>
              {index + 1} / {images.length}
            </Text>
          </View>
        )}
      </View>
    </Modal>
  );
}
