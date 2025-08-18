import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { router } from 'expo-router';

interface Message {
  id: number;
  title: string;
  content: string;
  student_id: number;
}

const MessageListTester = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const db = useSQLiteContext();

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const result = await db.getAllAsync<Message>(
          'SELECT id, title, content, student_id FROM message LIMIT 10'
        );
        setMessages(result || []);
      } catch (error) {
        console.error('Error fetching messages:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
  }, [db]);

  const testMessage = (messageId: number) => {
    console.log(`Testing navigation to message: ${messageId}`);
    router.push(`/student/message/${messageId}` as any);
  };

  const testDeepLink = (messageId: number) => {
    const url = `jduapp://student/10/message/${messageId}`;
    Alert.alert(
      'Test Deep Link',
      `This would be the deep link:\n\n${url}\n\nTesting navigation...`,
      [
        { text: 'Cancel' },
        { text: 'Test', onPress: () => testMessage(messageId) },
      ]
    );
  };

  if (!__DEV__) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>📨 Available Messages for Testing</Text>

      {loading ? (
        <Text style={styles.loadingText}>Loading messages...</Text>
      ) : messages.length === 0 ? (
        <Text style={styles.noMessages}>No messages found in database</Text>
      ) : (
        <>
          <Text style={styles.subtitle}>Found {messages.length} messages:</Text>
          {messages.slice(0, 5).map(message => (
            <View key={message.id} style={styles.messageItem}>
              <Text style={styles.messageId}>ID: {message.id}</Text>
              <Text style={styles.messageTitle} numberOfLines={2}>
                {message.title}
              </Text>
              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={styles.testButton}
                  onPress={() => testMessage(message.id)}
                >
                  <Text style={styles.buttonText}>Test Navigation</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deepLinkButton}
                  onPress={() => testDeepLink(message.id)}
                >
                  <Text style={styles.buttonText}>Test Deep Link</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#fff3cd',
    margin: 10,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#ffc107',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#856404',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
    color: '#856404',
  },
  loadingText: {
    textAlign: 'center',
    color: '#856404',
    fontStyle: 'italic',
  },
  noMessages: {
    textAlign: 'center',
    color: '#856404',
    fontStyle: 'italic',
  },
  messageItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    padding: 12,
    marginBottom: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ffc107',
  },
  messageId: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  messageTitle: {
    fontSize: 14,
    color: '#333',
    marginVertical: 4,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  testButton: {
    flex: 1,
    backgroundColor: '#28a745',
    padding: 8,
    borderRadius: 4,
    alignItems: 'center',
  },
  deepLinkButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    padding: 8,
    borderRadius: 4,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default MessageListTester;
