import React, {
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from 'react';
import {
  ScrollView,
  RefreshControl,
  StyleSheet,
  View,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useFocusEffect } from '@react-navigation/native';
import { Message, Student } from '@/constants/types';
import { colors } from '@/constants/Colors';
import { useNetwork } from '@/contexts/network-context';
import { useSession } from '@/contexts/auth-context';
import { I18nContext } from '@/contexts/i18n-context';
import Card from '@/components/card';
import { ThemedText } from '@/components/ThemedText';
import { Button, useTheme } from '@rneui/themed';
import {
  fetchMessagesFromDB,
  fetchReadButNotSentMessages,
  saveMessagesToDB,
} from '@/utils/queries';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useMessageContext } from '@/contexts/message-context';
import { useStudents } from '@/contexts/student-context';
import demoModeService from '@/services/demo-mode-service';
import apiClient, {
  UnauthorizedError,
  ForbiddenError,
} from '@/services/api-client';

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
    justifyContent: 'flex-start',
    alignItems: 'center',
    padding: 40,
  },
  noMessagesIllustration: {
    marginBottom: 2,
    alignItems: 'center',
    width: '100%',
  },
  illustrationImage: {
    width: '100%',
    height: 250,
    resizeMode: 'contain',
  },
  noMessagesIcon: {
    marginBottom: 20,
    opacity: 0.6,
  },
  noMessagesTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  noMessagesText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    opacity: 0.7,
    marginBottom: 40,
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
      {/* Illustration */}
      <View style={styles.noMessagesIllustration}>
        <Image
          source={require('@/assets/images/parentandchildren.png')}
          style={styles.illustrationImage}
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
        buttonStyle={[
          styles.refreshButton,
          {
            backgroundColor:
              theme.mode === 'dark'
                ? colors.tintLight
                : `${colors.tintLight}1A`,
          },
        ]}
        disabledStyle={[
          styles.refreshButton,
          {
            backgroundColor:
              theme.mode === 'dark' ? '#2563EB' : `${colors.tintLight}0D`,
          },
        ]}
        titleStyle={{
          color: theme.mode === 'dark' ? 'white' : colors.tintLight,
        }}
        loading={isRefreshing}
        disabled={isRefreshing}
        loadingProps={{
          color: theme.mode === 'dark' ? 'white' : 'rgb(59, 129, 246)',
        }}
        icon={
          !isRefreshing ? (
            <Ionicons
              name='refresh-outline'
              size={20}
              color={theme.mode === 'dark' ? 'white' : 'rgb(59, 129, 246)'}
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

const MessageList = ({
  studentId,
  onRefreshStudents,
}: {
  studentId: number;
  onRefreshStudents?: () => void;
}) => {
  // Contexts and hooks
  const db = useSQLiteContext();
  const { isOnline } = useNetwork();
  const { session, refreshToken, signOut, isDemoMode } = useSession();
  const { language, i18n } = useContext(I18nContext);
  const { theme } = useTheme();
  const textColor = useThemeColor({}, 'text');
  const { setUnreadCount } = useMessageContext();
  const { clearAndRefetch } = useStudents();

  // State management
  const [student, setStudent] = useState<Student | null>(null);
  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  // Track if offline data has been loaded for current offline session
  const [hasLoadedOffline, setHasLoadedOffline] = useState(false);
  // Track previous online state to detect transitions
  const wasOnlineRef = useRef(isOnline);
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

  // Fetch messages from API (online mode) or demo mode
  const fetchMessagesFromAPI = async ({
    pageParam,
  }: {
    pageParam: { last_post_id: number; last_sent_at: string | null } | null;
  }) => {
    if (!student) return [];

    // Handle demo mode
    if (isDemoMode) {
      await demoModeService.simulateNetworkDelay(300, 800);

      const offset = pageParam?.last_post_id || 0;
      const limit = 10;
      const demoMessages = demoModeService.getDemoMessages(
        student.id,
        offset,
        limit
      );

      // Save demo messages to local database for consistency
      if (demoMessages.length > 0) {
        await saveMessagesToDB(
          db,
          demoMessages,
          student.student_number,
          student.id
        );
      }

      return demoMessages;
    }

    try {
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

      const response = await apiClient.post<{ posts: any[] }>(
        '/posts',
        requestBody
      );
      const data = response.data;
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
      if (error instanceof UnauthorizedError) {
        await signOut();
        return [];
      } else if (error instanceof ForbiddenError) {
        await signOut();
        return [];
      }
      console.error('Error fetching messages from API:', error);
      throw new Error('Failed to fetch messages');
    }
  };

  // Infinite query setup for message fetching (online, offline, and demo modes)
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
    isLoading,
    isError,
  } = useInfiniteQuery({
    queryKey: ['messages', student?.id, isDemoMode ? 'demo' : 'regular'],
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
    enabled: Boolean(student && session && (isDemoMode || isOnline)),
    retry: isDemoMode ? 0 : 2, // No retry in demo mode
    retryDelay: 1000,
    staleTime: isDemoMode ? 0 : 2 * 60 * 1000, // Always fresh in demo mode
    refetchInterval: isDemoMode ? false : undefined, // No auto-refetch in demo mode
  });

  // Update refetch ref when it changes
  useEffect(() => {
    refetchRef.current = refetch;
  }, [refetch]);

  // Load offline messages when component mounts or goes offline
  useEffect(() => {
    const loadOfflineData = async () => {
      if (!student) {
        return;
      }

      wasOnlineRef.current = isOnline;

      if (isDemoMode || isOnline) {
        setHasLoadedOffline(true);
        return;
      }

      // Load from DB in background, but don't block UI if we have cached data
      try {
        const messages = await fetchMessagesFromDB(db, student.student_number);
        setLocalMessages(messages);
      } catch (error) {
        console.error('Error loading offline messages:', error);
      } finally {
        setHasLoadedOffline(true);
      }
    };
    loadOfflineData();
  }, [student, isOnline, isDemoMode, db]);

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

  // Fetch unread count from API (online mode)
  const fetchUnreadCount = async () => {
    if (!student) return 0;

    if (isDemoMode) {
      // Demo mode: get unread count from demo service
      return demoModeService.getDemoUnreadCount(student.id);
    } else if (isOnline && session) {
      try {
        const response = await apiClient.get<any[]>('/unread');
        const list = response.data;
        const entry = Array.isArray(list)
          ? list.find((s: any) => s.id === student.id)
          : null;
        return entry?.unread_count ?? 0;
      } catch (error) {
        if (error instanceof UnauthorizedError) {
          await signOut();
          return 0;
        } else if (error instanceof ForbiddenError) {
          await signOut();
          return 0;
        }
        throw error;
      }
    } else {
      // Offline mode: get unread_count from student table (cached from server)
      // This contains the actual count from the server, not just loaded messages
      const row = await db.getFirstAsync<{ unread_count: number }>(
        'SELECT unread_count FROM student WHERE id = ?',
        [student.id]
      );
      return row?.unread_count ?? 0;
    }
  };

  // Use React Query to fetch unread count
  const { refetch: refetchUnreadCount } = useQuery({
    queryKey: ['unreadCount', student?.id, isDemoMode ? 'demo' : 'regular'],
    queryFn: async () => {
      const count = await fetchUnreadCount();
      setUnreadCount(count);
      return count;
    },
    enabled: Boolean(student),
    staleTime: isDemoMode ? 0 : 30 * 1000, // 30 seconds for online, always fresh for demo
    retry: isDemoMode ? 0 : 1,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });

  // Refetch unread count when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      refetchUnreadCount();
    }, [refetchUnreadCount])
  );

  // Refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      const refreshData = async () => {
        if (!student) return;
        if (isDemoMode) {
          // No need to refresh, data is static
        } else if (isOnline && session) {
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
        refetchUnreadCount();
      };
      refreshData();
    }, [student, isDemoMode, isOnline, db, session, refetchUnreadCount])
  );

  // Handle pull-to-refresh
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      // Clear cache and refresh students list only when online
      if (isOnline && !isDemoMode) {
        await clearAndRefetch();
      }

      if (isDemoMode) {
        // Demo mode: simulate refresh but don't actually fetch new data
        await demoModeService.simulateNetworkDelay(300, 600);
        await refetchRef.current(); // This will use demo data
      } else if (isOnline && session) {
        readButNotSentMessageIDs.current = await fetchReadButNotSentMessages(
          db,
          student!.student_number
        );
        await refetchRef.current();
      } else if (student) {
        const messages = await fetchMessagesFromDB(db, student.student_number);
        setLocalMessages(messages);
      }
      await refetchUnreadCount();
    } catch (error) {
      console.error('Refresh failed:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // Load more messages (infinite scrolling)
  const handleLoadMore = async () => {
    if (isDemoMode) {
      // Demo mode: use infinite query (which handles demo mode)
      if (hasNextPage && !isFetchingNextPage) {
        await fetchNextPage();
      }
    } else if (isOnline) {
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
    // When online or demo mode, use data from query
    if (isDemoMode || isOnline) {
      return groupMessages(data?.pages.flat() || []);
    }
    // When offline, prefer localMessages, but fallback to cached query data if available
    if (localMessages.length > 0) {
      return groupMessages(localMessages);
    }
    // If we have cached query data, use it while loading from DB
    if (data?.pages.flat().length) {
      return groupMessages(data.pages.flat());
    }
    return groupMessages([]);
  }, [isDemoMode, isOnline, data, localMessages]);

  // Check if we have any cached data available (either from React Query or local DB)
  const hasCachedData =
    (data?.pages.flat().length ?? 0) > 0 || localMessages.length > 0;

  // Show loading state during initial load
  // Don't show loading if we have cached data to display
  if (
    !student ||
    (!isDemoMode && isOnline && !session) ||
    (isLoading && (isDemoMode || (isOnline && session)) && !hasCachedData) ||
    (!isOnline && !isDemoMode && !hasLoadedOffline && !hasCachedData)
  ) {
    return <MessageListLoading />;
  }

  // Show error state if needed (but not for demo mode)
  if (isError && !isDemoMode && isOnline) {
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
      <View
        style={[
          styles.container,
          { backgroundColor: theme.mode === 'dark' ? '#000000' : '#FFFFFF' },
        ]}
      >
        <ScrollView
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={{ flex: 1, paddingTop: 16 }}
        >
          <NoMessagesState onRefresh={onRefresh} isRefreshing={refreshing} />
        </ScrollView>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: theme.mode === 'dark' ? '#000000' : '#FFFFFF' }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      contentContainerStyle={[styles.messageListContainer, { paddingTop: 16 }]}
    >
      <View>
        {messageGroups.map(group => (
          <React.Fragment key={group.key}>
            <Card messageGroup={group.messages} studentId={student?.id || 0} />
          </React.Fragment>
        ))}

        {/* Load more button */}
        {(hasNextPage ||
          (!isDemoMode && !isOnline && localMessages.length >= 10)) && (
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
              isDemoMode || isOnline
                ? !hasNextPage || isFetchingNextPage
                : isLoadingMoreOffline
            }
            loading={
              isDemoMode || isOnline ? isFetchingNextPage : isLoadingMoreOffline
            }
            loadingProps={{
              color: theme.mode === 'dark' ? '#4a90a4' : '#ffffff',
            }}
          />
        )}
      </View>
    </ScrollView>
  );
};

export default MessageList;
