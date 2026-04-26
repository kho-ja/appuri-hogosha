import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useColorScheme } from '@/hooks/use-color-scheme';

function normalizeParam(value?: string | string[]) {
  if (Array.isArray(value)) {
    return value[0] ?? '';
  }

  return value ?? '';
}

function formatDateTime(value: string) {
  if (!value) {
    return '';
  }

  const [datePart = '', timePart = ''] = value.split(' ');
  const [year = '', month = '', day = ''] = datePart.split('-');

  if (!year || !month || !day) {
    return value;
  }

  return `${day}.${month}.${year}  ${timePart}`;
}

function getPriorityLabel(priority: string) {
  if (priority === 'high') {
    return 'majburiy';
  }

  if (priority === 'medium') {
    return 'muhim';
  }

  return 'oddiy';
}

function getPriorityBadgeColor(priority: string) {
  if (priority === 'high') {
    return '#FF2B2B';
  }

  if (priority === 'medium') {
    return '#F59E0B';
  }

  return '#16A34A';
}

export default function MessageDetailScreen() {
  const colorScheme = useColorScheme() ?? 'dark';
  const isDark = colorScheme === 'dark';

  const params = useLocalSearchParams<{
    title?: string | string[];
    preview?: string | string[];
    sentAt?: string | string[];
    priority?: string | string[];
  }>();

  const title = normalizeParam(params.title) || 'Xabar';
  const preview = normalizeParam(params.preview) || 'Xabar matni mavjud emas';
  const sentAt = normalizeParam(params.sentAt);
  const priority = normalizeParam(params.priority) || 'high';

  const formattedDate = useMemo(() => formatDateTime(sentAt), [sentAt]);

  const handleCopy = async () => {
    await Clipboard.setStringAsync(preview);
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor: isDark ? '#111215' : '#F3F6FA' }]}>
      <View style={[styles.card, { backgroundColor: isDark ? '#111215' : '#FFFFFF' }]}>
        <View style={styles.titleRow}>
          <ThemedText style={[styles.title, { color: isDark ? '#FFFFFF' : '#111827' }]}>{title}</ThemedText>
          <View style={[styles.badge, { backgroundColor: getPriorityBadgeColor(priority) }]}>
            <ThemedText style={styles.badgeText}>{getPriorityLabel(priority)}</ThemedText>
          </View>
        </View>

        <ThemedText style={[styles.preview, { color: isDark ? '#E5E7EB' : '#1F2937' }]}>{preview}</ThemedText>

        <View style={styles.footerRow}>
          <ThemedText style={[styles.date, { color: isDark ? '#6B7280' : '#6B7280' }]}>{formattedDate}</ThemedText>

          <Pressable onPress={handleCopy} style={styles.copyButton}>
            <Ionicons name="copy-outline" size={20} color="#0A84FF" />
            <ThemedText style={styles.copyText}>Copy</ThemedText>
          </Pressable>
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  card: {
    borderRadius: 8,
    padding: 0,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  title: {
    fontSize: 36 / 2,
    fontWeight: '700',
    flex: 1,
  },
  badge: {
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'lowercase',
  },
  preview: {
    marginTop: 8,
    fontSize: 36 / 2,
    lineHeight: 26,
  },
  footerRow: {
    marginTop: 44,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  date: {
    fontSize: 32 / 2,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  copyText: {
    color: '#0A84FF',
    fontSize: 18,
    fontWeight: '500',
  },
});
