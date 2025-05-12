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
    borderRadius: 4,
    alignItems: 'center',
    backgroundColor: '#005678',
  },
});

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
  const apiUrl = process.env.EXPO_PUBLIC_API_URL;

  // State management
  const [student, setStudent] = useState<Student | null>(null);
  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [isLoadingMoreOffline, setIsLoadingMoreOffline] = useState(false);
  const readButNotSentMessageIDs = useRef<number[]>([]);
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
  const fetchMessagesFromAPI = async ({ pageParam = 0 }) => {
    if (!student) return [];
    try {
      const response = await fetch(`${apiUrl}/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session}`,
        },
        body: JSON.stringify({
          student_id: student.id,
          last_post_id: pageParam,
          read_post_ids: readButNotSentMessageIDs.current,
        }),
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
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, refetch } =
    useInfiniteQuery({
      queryKey: ['messages', student?.id],
      queryFn: fetchMessagesFromAPI,
      initialPageParam: 0,
      getNextPageParam: lastPage => {
        if (lastPage && lastPage.length > 0) {
          return lastPage[lastPage.length - 1].id;
        }
        return undefined;
      },
    });

  // Load initial data when component mounts or online status changes
  useEffect(() => {
    const loadData = async () => {
      if (!student) return;
      if (!isOnline) {
        try {
          const messages = await fetchMessagesFromDB(
            db,
            student.student_number
          );
          setLocalMessages(messages);
        } catch (error) {
          console.error('Error loading offline messages:', error);
        } finally {
        }
      } else {
        try {
          readButNotSentMessageIDs.current = await fetchReadButNotSentMessages(
            db,
            student.student_number
          );
          await refetch();
        } catch (error) {
          console.error('Error syncing read statuses:', error);
        }
      }
    };
    loadData();
  }, [student, isOnline, db, refetch]);

  // Refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      const refreshData = async () => {
        if (!student) return;
        if (isOnline) {
          readButNotSentMessageIDs.current = await fetchReadButNotSentMessages(
            db,
            student.student_number
          );
          await refetch();
        } else {
          const messages = await fetchMessagesFromDB(
            db,
            student.student_number
          );
          setLocalMessages(messages);
        }
      };
      refreshData();
    }, [student, isOnline, db, refetch])
  );

  // Handle pull-to-refresh
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      if (isOnline) {
        readButNotSentMessageIDs.current = await fetchReadButNotSentMessages(
          db,
          student!.student_number
        );
        await refetch();
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

  // Loading state while fetching student data
  if (!student) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size='large' color='#adb5bd' />
        <ThemedText>Loading messages...</ThemedText>
      </View>
    );
  }

  return (
    <SafeAreaView>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={{ paddingBottom: 80, position: 'relative' }}
      >
        {messageGroups.map(group => (
          <React.Fragment key={group.key}>
            <Card messageGroup={group.messages} />
          </React.Fragment>
        ))}
        <Button
          title={i18n[language].loadMoreMessages}
          onPress={handleLoadMore}
          buttonStyle={styles.loadMoreButton}
          disabled={
            isOnline ? !hasNextPage || isFetchingNextPage : isLoadingMoreOffline
          }
          loading={isOnline ? isFetchingNextPage : isLoadingMoreOffline}
        />
      </ScrollView>
    </SafeAreaView>
  );
};

export default MessageList;
