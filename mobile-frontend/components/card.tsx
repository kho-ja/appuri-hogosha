import {
  Pressable,
  StyleProp,
  StyleSheet,
  TextStyle,
  TouchableOpacity,
  View,
} from 'react-native';
import React, { useContext } from 'react';
import { ThemedText } from '@/components/ThemedText';
import { useRouter } from 'expo-router';
import { I18nContext } from '@/contexts/i18n-context';
import formatMessageDate from '@/utils/format';
import { Message } from '@/constants/types';
import { cn } from '@/utils/utils';
import { Ionicons } from '@expo/vector-icons';
import { useSQLiteContext } from 'expo-sqlite';
import { useThemeColor } from '@/hooks/useThemeColor';
import Autolink from 'react-native-autolink';
import { ThemedView } from '@/components/ThemedView';
import { DateTime } from 'luxon';

const Card = ({
  messageGroup,
  studentId,
}: {
  messageGroup: Message[];
  studentId: number;
}) => {
  const router = useRouter();
  const { language, i18n } = useContext(I18nContext);
  const db = useSQLiteContext();
  // const isRead = message.read_status === 1 || !!message.viewed_at // Derive directly from prop
  const textColor = useThemeColor({}, 'text');
  const firstMessage = messageGroup[0];
  const groupNames = [
    ...new Set(messageGroup.map(m => m.group_name).filter(Boolean)),
  ];
  const isRead = messageGroup.every(m => m.read_status === 1 || !!m.viewed_at);

  const handlePress = async () => {
    // Mark message as read in the database
    for (const message of messageGroup) {
      if (!isRead) {
        await db.runAsync(
          'UPDATE message SET read_status = 1, read_time = ? WHERE id = ?',
          [new Date().toISOString(), message.id]
        );
      }
      // router.push({ pathname: `message/${firstMessage.id}` as Href });
      router.push({
        pathname: `message/${firstMessage.id}`,
        params: { studentId: studentId },
      });
    }
  };

  const getImportanceLabel = (priority: string) => {
    const mapping: { [key: string]: string } = {
      high: i18n[language].critical,
      medium: i18n[language].important,
      low: i18n[language].ordinary,
    };
    return mapping[priority] || 'unknown';
  };

  const getImportanceBadgeStyle = (priority: string) => {
    switch (priority) {
      case 'high':
        return { ...styles.importanceBadge, backgroundColor: 'red' };
      case 'medium':
        return { ...styles.importanceBadge, backgroundColor: 'orange' };
      case 'low':
        return { ...styles.importanceBadge, backgroundColor: 'green' };
      default:
        return styles.importanceBadge;
    }
  };

  const autolinkStyles: StyleProp<TextStyle> = {
    color: textColor,
    fontSize: 16,
  };

  const sentTimeString = firstMessage.sent_time;
  const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const utcDateTime = DateTime.fromFormat(sentTimeString, 'yyyy-MM-dd HH:mm', {
    zone: 'utc',
  });
  const localDateTime = utcDateTime.setZone(userTimeZone);
  const formattedTime = localDateTime.toFormat('yyyy-MM-dd HH:mm');

  return (
    <Pressable onPress={handlePress}>
      <View style={[styles.container, { opacity: isRead ? 0.5 : 1 }]}>
        <View style={styles.titleRow}>
          {!isRead ? (
            <View style={styles.iconContainer}>
              <ThemedText style={{ fontSize: 10, color: '#fff' }}>
                New
              </ThemedText>
            </View>
          ) : null}
          <ThemedView
            style={{
              flexDirection: 'row',
              flex: 1,
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: 'transparent',
              marginRight: 10,
            }}
          >
            <View style={styles.MessageTitleContainer}>
              <ThemedText
                type='default'
                numberOfLines={1}
                style={cn(
                  isRead
                    ? { fontWeight: 'bold' }
                    : { marginRight: 20, fontWeight: 'bold' },
                  { color: textColor }
                )}
              >
                {firstMessage.title}
              </ThemedText>
            </View>
          </ThemedView>
          <ThemedView
            style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}
          >
            <ThemedText style={getImportanceBadgeStyle(firstMessage.priority)}>
              {getImportanceLabel(firstMessage.priority)}
            </ThemedText>
            {isRead ? (
              <View style={styles.iconReadContainer}>
                <Ionicons name='checkmark' size={15} color='white' />
              </View>
            ) : null}
          </ThemedView>
        </View>
        <View style={styles.dateRow}>
          {groupNames.map((groupName, index) => (
            <ThemedText key={index} style={styles.groupStyle}>
              {groupName}
            </ThemedText>
          ))}
        </View>
        <View style={styles.descriptionRow}>
          <Autolink
            email
            hashtag='instagram'
            mention='instagram'
            text={firstMessage.content}
            numberOfLines={5}
            style={autolinkStyles}
            textProps={{ style: autolinkStyles }}
          />
        </View>
        <TouchableOpacity style={styles.readMoreButton}>
          <ThemedText style={styles.readMoreText} onPress={handlePress}>
            {i18n[language].continueReading}
          </ThemedText>
          <ThemedText style={styles.dateText}>
            {formatMessageDate(new Date(formattedTime), language)}
          </ThemedText>
        </TouchableOpacity>
      </View>
    </Pressable>
  );
};

export default Card;

const styles = StyleSheet.create({
  container: {
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    minHeight: 50,
    zIndex: 1,
    position: 'relative',
    marginHorizontal: 15,
    marginTop: 10,
  },
  MessageTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    backgroundColor: 'transparent',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 5,
    marginRight: 15,
    width: '100%',
  },
  iconContainer: {
    marginRight: 8,
    backgroundColor: '#FF0000',
    borderRadius: 10,
    height: 25,
    width: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconReadContainer: {
    backgroundColor: '#808080',
    borderRadius: 20,
    height: 25,
    width: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
    gap: 10,
  },
  dateText: {
    fontSize: 12,
    fontWeight: '300',
  },
  descriptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  readMoreButton: {
    marginTop: 5,
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  readMoreText: {
    color: '#2089dc',
    fontWeight: '600',
  },
  importanceBadge: {
    padding: 5,
    borderRadius: 5,
    backgroundColor: 'red',
    color: 'white',
    fontSize: 12,
  },
  groupStyle: {
    backgroundColor: '#059669',
    color: 'white',
    fontSize: 12,
    padding: 5,
    borderRadius: 5,
  },
});
