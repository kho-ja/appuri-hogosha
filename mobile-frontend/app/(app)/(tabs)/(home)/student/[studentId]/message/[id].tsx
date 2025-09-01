import React, { useContext, useEffect, useState, useCallback } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  TouchableOpacity,
  Text,
  Pressable,
  ActivityIndicator,
  ToastAndroid,
  Image,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { useSQLiteContext } from 'expo-sqlite';
import { useSession } from '@/contexts/auth-context';
import { I18nContext } from '@/contexts/i18n-context';
import { useNetwork } from '@/contexts/network-context';
import { fetchMessageFromDB, saveMessageToDB } from '@/utils/queries';
import { DatabaseMessage, Student } from '@/constants/types';
import { Autolink } from 'react-native-autolink';
import { useThemeColor } from '@/hooks/useThemeColor';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useTheme } from '@rneui/themed';
import { DateTime } from 'luxon';
import { useFontSize } from '@/contexts/FontSizeContext';
import ZoomGallery from '@/components/ZoomGallery';
import demoModeService from '@/services/demo-mode-service';
import { useQueryClient } from '@tanstack/react-query';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 25,
    paddingBottom: 25,
  },
  titleRow: {
    flexDirection: 'row',
    marginTop: 5,
    justifyContent: 'space-between',
  },
  title: {
    width: '80%',
    fontWeight: '600',
    textAlign: 'center',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 15,
    gap: 10,
  },
  dateText: {
    fontWeight: '300',
  },
  descriptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
    paddingBottom: 20,
  },
  image: {
    flex: 1,
    width: '100%',
    height: 260,
  },
  copyButton: {
    marginTop: -15,
    marginBottom: 20,
    backgroundColor: '#005678',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    display: 'flex',
    alignSelf: 'flex-end',
  },
  imageContainer: {
    marginVertical: 15,
  },
  imageItem: {
    position: 'relative',
  },
  imageWrapper: {
    borderRadius: 12,
    overflow: 'hidden',
  },
});

export default function DetailsScreen() {
  const [message, setMessage] = useState<DatabaseMessage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [zoomVisible, setZoomVisible] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const { id, studentId } = useLocalSearchParams();
  const actualStudentId = studentId ? Number(studentId) : undefined;
  const { language, i18n } = useContext(I18nContext);
  const { session, isDemoMode } = useSession();
  const { isOnline } = useNetwork();
  const db = useSQLiteContext();
  const queryClient = useQueryClient();
  const textColor = useThemeColor({}, 'text');
  const { theme } = useTheme();
  const backgroundColor = theme.colors.background;
  const { multiplier } = useFontSize();

  const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
  const imageUrl = process.env.EXPO_PUBLIC_S3_BASE_URL;

  const markMessageAsRead = useCallback(
    async (messageId: number, targetStudentId: number) => {
      const currentTime = new Date().toISOString();

      try {
        if (isDemoMode) {
          // Demo mode: mark message as read in demo service
          demoModeService.markDemoMessageAsRead(targetStudentId, messageId);

          // Also update local DB for consistency
          await db.runAsync(
            'UPDATE message SET read_status = 1, read_time = ? WHERE id = ?',
            [currentTime, messageId]
          );

          // Update local state
          setMessage(prevMessage =>
            prevMessage
              ? {
                  ...prevMessage,
                  read_status: 1,
                  viewed_at: currentTime,
                }
              : prevMessage
          );

          // Invalidate queries to update message list UI
          queryClient.invalidateQueries({
            queryKey: [
              'messages',
              targetStudentId,
              isDemoMode ? 'demo' : 'regular',
            ],
          });
          return;
        }

        // Update local DB
        await db.runAsync(
          'UPDATE message SET read_status = 1, read_time = ?, sent_status = ? WHERE id = ?',
          [currentTime, isOnline ? 1 : 0, messageId]
        );

        // Sync with backend if online
        if (isOnline && session) {
          const response = await fetch(`${apiUrl}/read-messages`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session}`,
            },
            body: JSON.stringify({
              post_id: messageId,
              student_id: targetStudentId,
              viewed_at: currentTime,
            }),
          });

          if (!response.ok) {
            console.error(
              'Failed to sync read status with backend:',
              await response.text()
            );
            await db.runAsync(
              'UPDATE message SET sent_status = 0 WHERE id = ?',
              [messageId]
            );
          }
        }

        // Update local state
        setMessage(prevMessage =>
          prevMessage
            ? {
                ...prevMessage,
                read_status: 1,
                viewed_at: currentTime,
              }
            : prevMessage
        );

        // Invalidate queries to update message list UI
        queryClient.invalidateQueries({
          queryKey: [
            'messages',
            targetStudentId,
            isDemoMode ? 'demo' : 'regular',
          ],
        });
      } catch (error) {
        console.error('Error updating read status:', error);
        if (!isDemoMode) {
          await db
            .runAsync('UPDATE message SET sent_status = 0 WHERE id = ?', [
              messageId,
            ])
            .catch(err => console.error('Error updating sent_status:', err));
        }
      }
    },
    [apiUrl, db, isDemoMode, isOnline, session, queryClient]
  );

  useEffect(() => {
    const fetchMessage = async () => {
      if (!id) {
        setError('Invalid message ID');
        setLoading(false);
        return;
      }

      // Validate studentId parameter
      if (!actualStudentId) {
        setError('Student ID is required to view message');
        setLoading(false);
        return;
      }

      try {
        let fullMessage: DatabaseMessage | null = null;

        if (isDemoMode) {
          // Demo mode: get message from demo service
          fullMessage = demoModeService.getDemoMessage(
            actualStudentId,
            Number(id)
          );

          if (!fullMessage) {
            setError('Demo message not found');
            setLoading(false);
            return;
          }
        } else {
          const localMessage = await fetchMessageFromDB(db, Number(id));

          if (localMessage) {
            // Check if message belongs to the specified student
            if (localMessage.student_id !== actualStudentId) {
              console.warn(
                `[MessageDetails] Message ${id} belongs to student ${localMessage.student_id}, but requested for student ${actualStudentId}`
              );
              setError(
                `${i18n[language].messageDoesNotBelongToStudent} ${actualStudentId}`
              );
              setLoading(false);
              return;
            }
            fullMessage = localMessage;
          } else if (isOnline) {
            // The message ID from notification is a PostParent ID
            // Use the /post/:id endpoint to fetch the message
            let messageData: any = null;
            let activeStudent: Student | null = null;

            try {
              // Add timeout to prevent infinite loading
              const controller = new AbortController();
              const timeoutId = setTimeout(() => {
                controller.abort();
              }, 10000);

              const response = await fetch(`${apiUrl}/post/${id}`, {
                method: 'GET',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${session}`,
                },
                signal: controller.signal,
              });

              clearTimeout(timeoutId);

              if (response.ok) {
                const responseData = await response.json();
                messageData = responseData.post;
              } else {
                const errorText = await response.text();
                console.error(
                  `Failed to fetch message: ${response.status} - ${errorText}`
                );
                throw new Error(
                  `Failed to fetch message from server: ${response.status}`
                );
              }
            } catch (fetchError) {
              if (
                fetchError instanceof Error &&
                fetchError.name === 'AbortError'
              ) {
                throw new Error(
                  'Request timed out. Please check your connection.'
                );
              }
              throw new Error('Failed to fetch message from server');
            }

            // Get any available student to save the message
            activeStudent = await db.getFirstAsync<Student>(
              'SELECT * FROM student LIMIT 1'
            );

            if (!activeStudent) {
              throw new Error(
                'No students found in database. Please sync students first.'
              );
            }

            // Adapt the message data to match the expected Message interface
            const adaptedMessage = {
              id: messageData.id,
              title: messageData.title,
              content: messageData.content,
              priority: messageData.priority,
              group_name: messageData.group_name,
              edited_at: messageData.edited_at,
              images: messageData.image ? [messageData.image] : null,
              sent_time: messageData.sent_time,
              viewed_at: messageData.viewed_at,
              read_status: (messageData.viewed_at ? 1 : 0) as 0 | 1,
            };

            await saveMessageToDB(
              db,
              adaptedMessage,
              activeStudent.student_number,
              activeStudent.id
            );

            // Retrieve the saved message
            fullMessage = await fetchMessageFromDB(db, Number(id));
            if (!fullMessage) {
              // Fallback: try to find by the actual post ID
              fullMessage = await fetchMessageFromDB(db, messageData.id);
            }

            if (!fullMessage) {
              throw new Error(
                'Failed to save or retrieve message from database'
              );
            }
          } else {
            setError('Message not found and offline');
            return;
          }
        }

        setMessage(fullMessage);
        // Mark message as read if it hasn't been read yet
        if (fullMessage.read_status === 0) {
          await markMessageAsRead(fullMessage.id, fullMessage.student_id);
        }
      } catch (error) {
        console.error('Error in fetchMessage:', error);
        setError(i18n[language].failedToRetrieveMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchMessage();
  }, [
    id,
    actualStudentId,
    apiUrl,
    db,
    isDemoMode,
    isOnline,
    session,
    markMessageAsRead,
    i18n,
    language,
  ]);

  if (loading)
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size='large' color='#adb5bd' />
        <ThemedText>Loading...</ThemedText>
      </View>
    );

  if (error) {
    // Redirect to 404 with custom message
    router.replace({
      pathname: '/+not-found',
      params: {
        title: i18n[language].messageNotFoundTitle,
        message: error,
      },
    });
    return null;
  }

  if (!message) {
    // Redirect to 404 with custom message
    router.replace({
      pathname: '/+not-found',
      params: {
        title: i18n[language].messageNotAvailable,
        message: i18n[language].messageNotFound,
      },
    });
    return null;
  }

  const getImportanceLabel = (priority: string) => {
    const mapping: { [key: string]: string } = {
      high: i18n[language].critical,
      medium: i18n[language].important,
      low: i18n[language].ordinary,
    };
    return mapping[priority] || 'unknown';
  };

  const imageArray = Array.isArray(message.images)
    ? message.images
    : message.images
      ? [message.images]
      : [];

  const imagesForZoomGallery = imageArray.map(filename => ({
    uri: isDemoMode
      ? filename // Demo images are already full URLs
      : `${imageUrl}/${filename}`, // Regular images need S3 base URL
  }));

  const copyToClipboard = async () => {
    if (message?.content) {
      await Clipboard.setStringAsync(message.content);

      ToastAndroid.show('Text copied to clipboard!', ToastAndroid.SHORT);
    }
  };

  const sentTimeString = message.sent_time;
  const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  // Handle both ISO format (demo data) and database format (regular data)
  let utcDateTime;
  if (sentTimeString.includes('T')) {
    // ISO format: 2025-08-30T10:30:00Z
    utcDateTime = DateTime.fromISO(sentTimeString, { zone: 'utc' });
  } else {
    // Database format: 2025-08-30 10:30
    utcDateTime = DateTime.fromFormat(sentTimeString, 'yyyy-MM-dd HH:mm', {
      zone: 'utc',
    });
  }

  const localDateTime = utcDateTime.setZone(userTimeZone);
  const formattedTime = localDateTime.toFormat('dd.MM.yyyy   HH:mm');

  return (
    <View style={{ flex: 1, backgroundColor }}>
      <ScrollView
        style={[styles.container, { backgroundColor }]}
        contentContainerStyle={{ paddingTop: 16 }}
      >
        <View
          style={[
            styles.titleRow,
            multiplier > 1
              ? { flexDirection: 'column-reverse', alignItems: 'flex-start' }
              : {
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                },
          ]}
        >
          <ThemedText
            style={[
              styles.title,
              {
                fontSize: 18 * multiplier,
                textAlign: 'left',
                flex: 1,
                width: multiplier > 1 ? '100%' : 'auto',
              },
            ]}
          >
            {message.title}
          </ThemedText>
          <View
            style={{
              backgroundColor:
                message.priority === 'high'
                  ? 'red'
                  : message.priority === 'medium'
                    ? 'orange'
                    : 'green',
              borderRadius: 4,
              paddingHorizontal: 6 * multiplier,
              paddingVertical: 4 * multiplier,
              justifyContent: 'center',
              alignItems: 'center',
              marginLeft: multiplier > 1 ? 0 : 10,
              alignSelf: multiplier > 1 ? 'flex-end' : 'center',
            }}
          >
            <ThemedText
              style={{
                color: 'white',
                fontSize: 11 * multiplier,
                textAlign: 'center',
                fontWeight: '500',
              }}
            >
              {getImportanceLabel(message.priority)}
            </ThemedText>
          </View>
        </View>

        {/* Images section - moved between title and description */}
        {imageArray.length > 0 && (
          <View style={styles.imageContainer}>
            {imageArray.map((filename, idx) => (
              <View key={idx} style={styles.imageItem}>
                <TouchableOpacity
                  onPress={() => {
                    setCurrentImageIndex(idx);
                    setZoomVisible(true);
                  }}
                >
                  <View style={styles.imageWrapper}>
                    <Image
                      style={styles.image}
                      source={{
                        uri: isDemoMode
                          ? filename // Demo images are already full URLs
                          : `${imageUrl}/${filename}`, // Regular images need S3 base URL
                      }}
                      resizeMode='cover'
                    />
                  </View>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        <View style={styles.descriptionRow}>
          <Autolink
            email
            hashtag='instagram'
            mention='instagram'
            text={message.content}
            style={{ color: textColor, fontSize: 16 * multiplier }}
          />
        </View>

        {/* Date and Copy button on the same level */}
        <View
          style={[
            styles.dateRow,
            {
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: 10,
            },
          ]}
        >
          <ThemedText
            style={[
              styles.dateText,
              { fontSize: 14 * multiplier, color: '#666' },
            ]}
          >
            {formattedTime}
          </ThemedText>

          <Pressable
            style={[
              styles.copyButton,
              { marginTop: 0, marginBottom: 0, backgroundColor: 'transparent' },
            ]}
            onPress={copyToClipboard}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name='copy-outline' size={20} color='#007AFF' />
              <Text
                style={{
                  color: '#007AFF',
                  marginLeft: 5,
                  fontSize: 14 * multiplier,
                }}
              >
                Copy
              </Text>
            </View>
          </Pressable>
        </View>
        <ZoomGallery
          visible={zoomVisible}
          images={imagesForZoomGallery}
          initialIndex={currentImageIndex}
          onRequestClose={() => setZoomVisible(false)}
          albumName='Downloads'
        />
      </ScrollView>
    </View>
  );
}
