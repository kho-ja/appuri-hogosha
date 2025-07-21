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
import { Message } from '@/constants/types';
import { cn } from '@/utils/utils';
import { Ionicons } from '@expo/vector-icons';
import { useSQLiteContext } from 'expo-sqlite';
import { useThemeColor } from '@/hooks/useThemeColor';
import Autolink from 'react-native-autolink';
import { ThemedView } from '@/components/ThemedView';
import { DateTime } from 'luxon';
import { useFontSize } from '@/contexts/FontSizeContext';
import { useTheme } from '@rneui/themed';

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
  const { multiplier } = useFontSize();
  const { theme } = useTheme();
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
    const baseStyle = {
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 15,
      color: 'white',
      fontSize: 12 * multiplier,
      textAlign: 'center' as const,
      opacity: isRead ? 0.6 : 1, // apply opacity based on read status icon
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
  };

  const autolinkStyles: StyleProp<TextStyle> = {
    color: theme.mode === 'dark' ? '#8E8E93' : '#666666',
    fontSize: 16 * multiplier,
    opacity: isRead ? 0.6 : 1,
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
      <View style={[
        styles.container, 
        { 
          backgroundColor: theme.mode === 'dark' ? '#1C1C1E' : '#FFFFFF',
          borderColor: theme.mode === 'dark' ? '#2C2C2E' : '#E5E5EA',
        }
      ]}>
        <View style={styles.titleRow}>
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
                    ? { fontWeight: 'bold', opacity: 0.6 }
                    : { marginRight: 20, fontWeight: 'bold' },
                  { color: textColor }
                )}
              >
                {firstMessage.title}
              </ThemedText>
            </View>
          </ThemedView>
          <ThemedView
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              backgroundColor: 'transparent',
            }}
          >
            <ThemedText style={getImportanceBadgeStyle(firstMessage.priority)}>
              {getImportanceLabel(firstMessage.priority)}
            </ThemedText>
          </ThemedView>
        </View>
        <View style={styles.dateRow}>
          {groupNames.map((groupName, index) => (
            <ThemedText key={index} type='smaller' style={styles.groupStyle}>
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
            numberOfLines={2}
            style={autolinkStyles}
            textProps={{ style: autolinkStyles }}
          />
        </View>
        <View style={styles.bottomRow}>
          <ThemedText type='smaller' style={[styles.dateText, { 
            color: theme.mode === 'dark' ? '#8E8E93' : '#666666',
            opacity: isRead ? 0.6 : 1
          }]}>
            {localDateTime.toFormat('dd.MM.yyyy   HH:mm')}
          </ThemedText>
          <TouchableOpacity style={[styles.readMoreButton, { opacity: 1 }]} onPress={handlePress}>
            <ThemedText
              style={[styles.readMoreText, { 
                color: theme.mode === 'dark' ? '#0A84FF' : '#2089dc',
                opacity: 1 
              }]}
              numberOfLines={1}
              ellipsizeMode='tail'
            >
              {i18n[language].continueReading}
            </ThemedText>
            <Ionicons
              name='chevron-forward'
              size={16}
              color={theme.mode === 'dark' ? '#0A84FF' : '#2089dc'}
              style={{ marginLeft: 4, opacity: 1 }}
            />
          </TouchableOpacity>
        </View>
      </View>
    </Pressable>
  );
};

export default Card;

const styles = StyleSheet.create({
  container: {
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
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
    gap: 10,
  },
  dateText: {
    fontWeight: '300',
  },
  descriptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  readMoreButton: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 5,
    gap: 10,
  },
  dateContainer: {
    marginTop: 5,
    alignItems: 'flex-end',
  },
  readMoreText: {
    fontWeight: '600',
  },
  groupStyle: {
    backgroundColor: '#059669',
    color: 'white',
    padding: 5,
    borderRadius: 5,
  },
});
