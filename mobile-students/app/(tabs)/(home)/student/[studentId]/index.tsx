import { useMemo, useState } from 'react';
import { StyleSheet, View, ScrollView, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';

type MessageItem = {
  id: number;
  title: string;
  preview: string;
  sentAt: string;
  priority: 'high' | 'medium' | 'low';
  isUnread?: boolean;
};

const MOCK_MESSAGES: MessageItem[] = [
  {
    id: 1,
    title: 'Portfolio Update',
    preview: 'Please review your child\'s latest portfolio items and teacher comments.',
    sentAt: '2026-04-21 10:30',
    priority: 'high',
    isUnread: true,
  },
  {
    id: 2,
    title: 'Homework Reminder',
    preview: 'Mathematics homework must be submitted by Friday, 5:00 PM.',
    sentAt: '2026-04-20 16:15',
    priority: 'low',
  },
  {
    id: 3,
    title: 'Class Schedule Change',
    preview: 'Tomorrow\'s class times have changed. Please check the updated schedule.',
    sentAt: '2026-04-19 09:00',
    priority: 'medium',
  },
  {
    id: 4,
    title: 'Sports Event',
    preview: 'The school sports event will take place this Saturday.',
    sentAt: '2026-04-18 14:25',
    priority: 'low',
  },
  {
    id: 5,
    title: 'Exam Reminder',
    preview: 'The mathematics exam starts on Monday at 09:00.',
    sentAt: '2026-04-17 08:45',
    priority: 'high',
  },
  {
    id: 6,
    title: 'Tuition Payment Notice',
    preview: 'Updated information for the April tuition payment is now available.',
    sentAt: '2026-04-16 11:10',
    priority: 'low',
  },
];

function formatDateTime(value: string) {
  const [datePart = '', timePart = ''] = value.split(' ');
  const [year = '', month = '', day = ''] = datePart.split('-');

  if (!year || !month || !day) {
    return value;
  }

  return `${day}.${month}.${year}   ${timePart}`;
}

function getImportanceLabel(priority: MessageItem['priority']) {
  const mapping: Record<MessageItem['priority'], string> = {
    high: 'majburiy',
    medium: 'muhim',
    low: 'oddiy',
  };

  return mapping[priority];
}

function getImportanceBadgeStyle(priority: MessageItem['priority'], isRead: boolean) {
  const baseStyle = {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 15,
    color: 'white',
    fontSize: 12,
    textAlign: 'center' as const,
    opacity: isRead ? 0.6 : 1,
  };

  switch (priority) {
    case 'high':
      return { ...baseStyle, backgroundColor: 'red' };
    case 'medium':
      return { ...baseStyle, backgroundColor: 'orange' };
    case 'low':
      return { ...baseStyle, backgroundColor: 'green' };
    default:
      return baseStyle;
  }
}

export default function StudentMessagesScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const backgroundColor = Colors[colorScheme].background;
  const [visibleCount, setVisibleCount] = useState(3);
  const { studentId } = useLocalSearchParams<{
    studentId?: string;
    givenName?: string;
    familyName?: string;
  }>();

  const visibleMessages = useMemo(
    () => MOCK_MESSAGES.slice(0, visibleCount),
    [visibleCount]
  );

  const canLoadMore = visibleCount < MOCK_MESSAGES.length;

  return (
    <ThemedView style={[styles.container, { backgroundColor }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {visibleMessages.map(message => {
          const isRead = !message.isUnread;

          return (
            <Pressable
              key={message.id}
              onPress={() =>
                router.push({
                  pathname: '/(tabs)/(home)/student/[studentId]/message/[id]',
                  params: {
                    studentId: studentId ?? '',
                    id: String(message.id),
                    title: message.title,
                    preview: message.preview,
                    sentAt: message.sentAt,
                    priority: message.priority,
                  },
                })
              }
              style={[
                styles.card,
                {
                  backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#FFFFFF',
                  borderColor: !isRead
                    ? '#1A4AAC'
                    : colorScheme === 'dark'
                      ? '#2C2C2E'
                      : '#E5E5EA',
                  borderWidth: !isRead ? 1.5 : 1,
                },
              ]}
            >
              <View style={styles.titleRow}>
                <ThemedText style={[styles.title, isRead && styles.readOpacity]}>{message.title}</ThemedText>
                <View style={styles.headerRight}>
                  <ThemedText style={getImportanceBadgeStyle(message.priority, isRead)}>
                    {getImportanceLabel(message.priority)}
                  </ThemedText>
                </View>
              </View>

              <ThemedText style={[styles.preview, isRead && styles.readOpacity]}>{message.preview}</ThemedText>

              <View style={styles.bottomRow}>
                <View style={styles.dateAndStatus}>
                  <ThemedText
                    style={[
                      styles.date,
                      {
                        color: colorScheme === 'dark' ? '#8E8E93' : '#666666',
                      },
                      isRead && styles.readOpacity,
                    ]}
                  >
                    {formatDateTime(message.sentAt)}
                  </ThemedText>

                  <Ionicons
                    name={isRead ? 'checkmark-done' : 'checkmark'}
                    size={16}
                    color={colorScheme === 'dark' ? '#0A84FF' : '#2089dc'}
                    style={{ opacity: isRead ? 1 : 0.8 }}
                  />
                </View>

                <Pressable
                  style={styles.readMoreButton}
                  onPress={() =>
                    router.push({
                      pathname: '/(tabs)/(home)/student/[studentId]/message/[id]',
                      params: {
                        studentId: studentId ?? '',
                        id: String(message.id),
                        title: message.title,
                        preview: message.preview,
                        sentAt: message.sentAt,
                        priority: message.priority,
                      },
                    })
                  }
                >
                  <ThemedText style={[styles.readMoreText, { color: colorScheme === 'dark' ? '#0A84FF' : '#2089dc' }]}>
                    Davom etish
                  </ThemedText>
                  <Ionicons
                    name='chevron-forward'
                    size={16}
                    color={colorScheme === 'dark' ? '#0A84FF' : '#2089dc'}
                    style={{ marginLeft: 4 }}
                  />
                </Pressable>
              </View>
            </Pressable>
          );
        })}

        {canLoadMore && (
          <Pressable style={styles.loadMoreButton} onPress={() => setVisibleCount(prev => prev + 3)}>
            <ThemedText style={styles.loadMoreText}>Ko'proq xabarlar</ThemedText>
          </Pressable>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: 24,
  },
  card: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 50,
    zIndex: 1,
    position: 'relative',
    marginHorizontal: 15,
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.09,
    shadowRadius: 1,
    elevation: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 5,
    marginRight: 15,
    width: '100%',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
    marginRight: 20,
  },
  preview: {
    fontSize: 16,
    lineHeight: 21,
    marginTop: 5,
  },
  date: {
    fontSize: 12,
    fontWeight: '300',
  },
  readOpacity: {
    opacity: 0.6,
  },
  dateAndStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    gap: 10,
    flexWrap: 'wrap',
  },
  readMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
  },
  readMoreText: {
    fontWeight: '600',
    fontSize: 33 / 2,
  },
  loadMoreButton: {
    marginTop: 10,
    marginHorizontal: 15,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#005678',
  },
  loadMoreText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
});
