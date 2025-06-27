import React, {
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from 'react';
import {
  ScrollView,
  RefreshControl,
  StyleSheet,
  View,
  ActivityIndicator,
} from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useFocusEffect } from '@react-navigation/native';
import { Message, Student } from '@/constants/types';
import { useNetwork } from '@/contexts/network-context';
import { useSession } from '@/contexts/auth-context';
import { I18nContext } from '@/contexts/i18n-context';
import Card from '@/components/card';
import { ThemedText } from '@/components/ThemedText';
import { Button } from '@rneui/themed';
import {
  fetchMessagesFromDB,
  fetchReadButNotSentMessages,
  saveMessagesToDB,
} from '@/utils/queries';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@rneui/themed';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useMessageContext } from '@/contexts/message-context';

// Styles for the component
const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
  },
  loadMoreButton: {
    marginTop: 10,
    marginHorizontal: 15,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  noMessagesContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  noMessagesIcon: {
    marginBottom: 20,
    opacity: 0.6,
  },
  noMessagesTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  noMessagesText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    opacity: 0.7,
    marginBottom: 30,
  },
  refreshButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  messageListContainer: {
    paddingBottom: 80,
    position: 'relative',
  },
  loadingSpinner: {
    marginTop: 20,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
});

// Loading component for initial message loading
const MessageListLoading: React.FC = () => {
  const { language, i18n } = useContext(I18nContext);
  const { theme } = useTheme();
  const textColor = useThemeColor({}, 'text');

  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator
        size='large'
        color={theme.colors.primary || '#005678'}
      />
      <ThemedText
        style={{
          marginTop: 12,
          color: textColor,
        }}
      >
        {i18n[language].loading}
      </ThemedText>
    </View>
  );
};

// No messages component
const NoMessagesState: React.FC<{
  onRefresh: () => void;
  isRefreshing: boolean;
}> = ({ onRefresh, isRefreshing }) => {
  const { language, i18n } = useContext(I18nContext);
  const { theme } = useTheme();
  const textColor = useThemeColor({}, 'text');

  return (
    <View style={styles.noMessagesContainer}>
      <View style={styles.noMessagesIcon}>
        <Ionicons
          name='mail-outline'
          size={80}
          color={
            theme.colors.disabled ||
            (theme.mode === 'dark' ? '#6c757d' : '#adb5bd')
          }
        />
      </View>

      <ThemedText style={[styles.noMessagesTitle, { color: textColor }]}>
        {i18n[language].noMessagesYet}
      </ThemedText>

      <ThemedText style={[styles.noMessagesText, { color: textColor }]}>
        {i18n[language].noMessagesDescription}
      </ThemedText>

      <Button
        title={i18n[language].refresh}
        onPress={onRefresh}
        buttonStyle={[styles.refreshButton, { backgroundColor: '#005678' }]}
        disabledStyle={[styles.refreshButton, { backgroundColor: '#003d56' }]}
        loading={isRefreshing}
        disabled={isRefreshing}
        loadingProps={{
          color: theme.mode === 'dark' ? '#4a90a4' : '#ffffff',
        }}
        icon={
          !isRefreshing ? (
            <Ionicons
              name='refresh-outline'
              size={20}
              color='white'
              style={{ marginRight: 8 }}
            />
          ) : undefined
        }
      />
    </View>
  );
};

// Group messages by title, content, and sent_time
const groupMessages = (
  messages: Message[]
): { key: string; messages: Message[] }[] => {
  const messageMap = new Map<string, Message[]>();

  messages.forEach(message => {
    const sentTimestamp = message.sent_time
      ? new Date(message.sent_time).toISOString()
      : '';
    const compositeKey = `${message.title || ''}|-|${message.content || ''}|-|${sentTimestamp}`;
    if (!messageMap.has(compositeKey)) {
      messageMap.set(compositeKey, []);
    }
    messageMap.get(compositeKey)!.push(message);
  });

  return Array.from(messageMap, ([key, messages]) => ({ key, messages }));
};

const MessageList = ({ studentId }: { studentId: number }) => {
  // Contexts and hooks
  const db = useSQLiteContext();
  const { isOnline } = useNetwork();
  const { session, refreshToken, signOut } = useSession();
  const { language, i18n } = useContext(I18nContext);
  const { theme } = useTheme();
  const textColor = useThemeColor({}, 'text');
  const apiUrl = process.env.EXPO_PUBLIC_API_URL;

  // State management
  const [student, setStudent] = useState<Student | null>(null);
  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [isLoadingMoreOffline, setIsLoadingMoreOffline] = useState(false);
  const readButNotSentMessageIDs = useRef<number[]>([]);
  const refetchRef = useRef<() => Promise<any>>(() => Promise.resolve());

  // Fetch student details based on studentId
  useEffect(() => {
    const loadStudent = async () => {
      try {
        const result = await db.getFirstAsync<Student>(
          'SELECT * FROM student WHERE id = ?',
          [studentId]
        );
        setStudent(result);
      } catch (error) {
        console.error('Error fetching student:', error);
      }
    };
    loadStudent();
  }, [db, studentId]);

  // Fetch messages from API (online mode)
  const fetchMessagesFromAPI = async ({
    pageParam,
  }: {
    pageParam: { last_post_id: number; last_sent_at: string | null } | null;
  }) => {
    if (!student) return [];

    const requestBody: any = {
      student_id: student.id,
      read_post_ids: readButNotSentMessageIDs.current,
    };

    // Add pagination parameters if we have them
    if (pageParam) {
      requestBody.last_post_id = pageParam.last_post_id;
      requestBody.last_sent_at = pageParam.last_sent_at;
    } else {
      requestBody.last_post_id = 0;
    }

    try {
      const response = await fetch(`${apiUrl}/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (response.status === 401) {
        refreshToken();
        return [];
      } else if (response.status === 403) {
        signOut();
        return [];
      }

      const data = await response.json();
      const adaptedPosts: Message[] = data.posts.map((post: any) => ({
        ...post,
        images: post.image ? [post.image] : null,
      }));

      // Save messages to local database and sync read statuses
      await saveMessagesToDB(
        db,
        adaptedPosts,
        student.student_number,
        student.id
      );
      if (readButNotSentMessageIDs.current.length > 0) {
        await db.runAsync(
          `UPDATE message SET sent_status = 1 WHERE id IN (${readButNotSentMessageIDs.current.join(',')})`
        );
        readButNotSentMessageIDs.current = [];
      }
      return adaptedPosts;
    } catch (error) {
      console.error('Error fetching messages from API:', error);
      throw new Error('Failed to fetch messages');
    }
  };

  // Infinite query setup for online message fetching
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
    isLoading,
    isError,
  } = useInfiniteQuery({
    queryKey: ['messages', student?.id],
    queryFn: fetchMessagesFromAPI,
    initialPageParam: null,
    getNextPageParam: lastPage => {
      if (lastPage && lastPage.length > 0) {
        const lastMessage = lastPage[lastPage.length - 1];
        return {
          last_post_id: lastMessage.id,
          last_sent_at: lastMessage.sent_time,
        };
      }
      return undefined;
    },
    enabled: Boolean(student && isOnline && session),
    retry: 2,
    retryDelay: 1000,
  });

  // Update refetch ref when it changes
  useEffect(() => {
    refetchRef.current = refetch;
  }, [refetch]);

  // Load offline messages when component mounts or goes offline
  useEffect(() => {
    const loadOfflineData = async () => {
      if (!student || isOnline) return;

      try {
        const messages = await fetchMessagesFromDB(db, student.student_number);
        setLocalMessages(messages);
      } catch (error) {
        console.error('Error loading offline messages:', error);
      }
    };
    loadOfflineData();
  }, [student, isOnline, db]);

  // Prepare read messages data for online mode
  useEffect(() => {
    const prepareOnlineData = async () => {
      if (!student || !isOnline || !session) return;

      try {
        readButNotSentMessageIDs.current = await fetchReadButNotSentMessages(
          db,
          student.student_number
        );
      } catch (error) {
        console.error('Error syncing read statuses:', error);
      }
    };
    prepareOnlineData();
  }, [student, isOnline, db, session]);

  // Refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      const refreshData = async () => {
        if (!student) return;
        if (isOnline && session) {
          readButNotSentMessageIDs.current = await fetchReadButNotSentMessages(
            db,
            student.student_number
          );
          refetchRef.current();
        } else if (!isOnline) {
          const messages = await fetchMessagesFromDB(
            db,
            student.student_number
          );
          setLocalMessages(messages);
        }
      };
      refreshData();
    }, [student, isOnline, db, session])
  );

  // Handle pull-to-refresh
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      if (isOnline && session) {
        readButNotSentMessageIDs.current = await fetchReadButNotSentMessages(
          db,
          student!.student_number
        );
        await refetchRef.current();
      } else if (student) {
        const messages = await fetchMessagesFromDB(db, student.student_number);
        setLocalMessages(messages);
      }
    } catch (error) {
      console.error('Refresh failed:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // Load more messages (infinite scrolling)
  const handleLoadMore = async () => {
    if (isOnline) {
      if (hasNextPage && !isFetchingNextPage) {
        await fetchNextPage();
      }
    } else if (student) {
      setIsLoadingMoreOffline(true);
      try {
        const newMessages = await fetchMessagesFromDB(
          db,
          student.student_number,
          localMessages.length // Offset for pagination
        );
        setLocalMessages(prev => [...prev, ...newMessages]);
      } catch (error) {
        console.error('Error loading more offline messages:', error);
      } finally {
        setIsLoadingMoreOffline(false);
      }
    }
  };

  const messageGroups = useMemo(() => {
    const allMessages = isOnline ? data?.pages.flat() || [] : localMessages;
    return groupMessages(allMessages);
  }, [isOnline, data, localMessages]);

  const { setUnreadCount } = useMessageContext();
  useEffect(() => {
    const message_group = messageGroups.map(m => m.messages);
    const unreadMessages = message_group.filter(m => m[0].viewed_at === null);
    setUnreadCount(unreadMessages.length);
  }, [messageGroups, setUnreadCount]);

  // Show loading state during initial load
  if (
    !student ||
    (isOnline && !session) ||
    (isLoading && isOnline && session)
  ) {
    return <MessageListLoading />;
  }

  // Show error state if needed
  if (isError && isOnline) {
    return (
      <View style={styles.errorContainer}>
        <ThemedText
          style={[styles.errorText, { color: theme.colors.error || textColor }]}
        >
          {i18n[language].errorLoadingMessages}
        </ThemedText>
        <Button
          title={i18n[language].tryAgain}
          onPress={() => refetchRef.current()}
          buttonStyle={[styles.refreshButton, { backgroundColor: '#005678' }]}
          disabledStyle={[styles.refreshButton, { backgroundColor: '#003d56' }]}
          loadingProps={{
            color: theme.mode === 'dark' ? '#4a90a4' : '#ffffff',
          }}
        />
      </View>
    );
  }

  // Show no messages state
  if (messageGroups.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={{ flex: 1 }}
        >
          <NoMessagesState onRefresh={onRefresh} isRefreshing={refreshing} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.messageListContainer}
      >
        {messageGroups.map(group => (
          <React.Fragment key={group.key}>
            <Card messageGroup={group.messages} studentId={student?.id || 0} />
          </React.Fragment>
        ))}

        {/* Load more button */}
        {(hasNextPage || (!isOnline && localMessages.length >= 10)) && (
          <Button
            title={i18n[language].loadMoreMessages}
            onPress={handleLoadMore}
            buttonStyle={[
              styles.loadMoreButton,
              { backgroundColor: '#005678' },
            ]}
            disabledStyle={[
              styles.loadMoreButton,
              { backgroundColor: '#003d56' },
            ]}
            disabled={
              isOnline
                ? !hasNextPage || isFetchingNextPage
                : isLoadingMoreOffline
            }
            loading={isOnline ? isFetchingNextPage : isLoadingMoreOffline}
            loadingProps={{
              color: theme.mode === 'dark' ? '#4a90a4' : '#ffffff',
            }}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default MessageList;
