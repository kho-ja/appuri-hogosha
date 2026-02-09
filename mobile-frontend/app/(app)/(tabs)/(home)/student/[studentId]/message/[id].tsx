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
import apiClient from '@/services/api-client';

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

          // Force update of unread count for demo mode
          queryClient.invalidateQueries({
            queryKey: ['unread-count', targetStudentId],
          });

          // Force a refetch to ensure immediate UI update
          queryClient.refetchQueries({
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

        // Decrement unread_count in student table (ensure it doesn't go below 0)
        await db.runAsync(
          `UPDATE student SET unread_count = CASE WHEN unread_count > 0 THEN unread_count - 1 ELSE 0 END WHERE id = ?`,
          [targetStudentId]
        );

        // Sync with backend if online
        if (isOnline && session) {
          try {
            await apiClient.post('/view', {
              post_id: messageId,
              student_id: targetStudentId,
            });
          } catch (error) {
            console.error('Failed to sync read status with backend:', error);
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

        // Invalidate queries to update message list UI and unread count
        queryClient.invalidateQueries({
          queryKey: [
            'messages',
            targetStudentId,
            isDemoMode ? 'demo' : 'regular',
          ],
        });

        // Force update of unread count by invalidating unread count queries too
        queryClient.invalidateQueries({
          queryKey: ['unread-count', targetStudentId],
        });

        // Force a refetch to ensure immediate UI update
        queryClient.refetchQueries({
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
    [db, isDemoMode, isOnline, session, queryClient]
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
                `Message ${id} belongs to student ${localMessage.student_id}, but requested for student ${actualStudentId}`
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
              const response = await apiClient.get<{ post: any }>(
                `/post/${id}`
              );
              messageData = response.data.post;
            } catch (fetchError) {
              if (
                fetchError instanceof Error &&
                fetchError.name === 'AbortError'
              ) {
                throw new Error(
                  'Request timed out. Please check your connection.'
                );
              }
              console.error('Failed to fetch message:', fetchError);
              throw new Error('Failed to fetch message from server');
            }

            // Get the specific student for whom the message is intended
            activeStudent = await db.getFirstAsync<Student>(
              'SELECT * FROM student WHERE id = ?',
              [actualStudentId]
            );

            if (!activeStudent) {
              throw new Error(
                `Target student ${actualStudentId} not found in database. Please sync students first.`
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

        // Find all messages in the same group (same title, content, sent_time) that are unread
        const unreadGroupMessages = (await db.getAllAsync(
          'SELECT id, read_status FROM message WHERE student_id = ? AND title = ? AND content = ? AND sent_time = ? AND read_status = 0',
          [
            fullMessage.student_id,
            fullMessage.title || '',
            fullMessage.content || '',
            fullMessage.sent_time || '',
          ]
        )) as { id: number; read_status: number }[];

        // Mark all unread messages in the group as read
        if (unreadGroupMessages.length > 0) {
          for (const unreadMsg of unreadGroupMessages) {
            await markMessageAsRead(unreadMsg.id, fullMessage.student_id);
          }
        }
      } catch (error) {
        console.error('Error in fetchMessage:', error);
        setError(i18n[language].failedToRetrieveMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchMessage();
    // markMessageAsRead is intentionally excluded to prevent infinite re-renders
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, actualStudentId, db, isDemoMode, isOnline, session, i18n, language]);

  // Force refresh message list when this component unmounts or when message is marked as read
  useEffect(() => {
    return () => {
      // When leaving the message detail screen, invalidate the message list to ensure
      // the read status is updated in the list view
      queryClient.invalidateQueries({
        queryKey: [
          'messages',
          actualStudentId,
          isDemoMode ? 'demo' : 'regular',
        ],
      });
    };
  }, [actualStudentId, isDemoMode, queryClient]);

  // Additional effect to refresh message list when opened via deeplink
  useEffect(() => {
    // Small delay to ensure message is loaded and marked as read
    const timer = setTimeout(() => {
      queryClient.invalidateQueries({
        queryKey: [
          'messages',
          actualStudentId,
          isDemoMode ? 'demo' : 'regular',
        ],
      });
      queryClient.invalidateQueries({
        queryKey: ['unread-count', actualStudentId],
      });
    }, 1000);

    return () => clearTimeout(timer);
  }, [actualStudentId, isDemoMode, queryClient]);

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
