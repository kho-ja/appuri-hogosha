import { Link, Stack, useLocalSearchParams } from 'expo-router';
import { StyleSheet } from 'react-native';
import { useContext } from 'react';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { I18nContext } from '@/contexts/i18n-context';

export default function NotFoundScreen() {
  const { title, message } = useLocalSearchParams();
  const { language, i18n } = useContext(I18nContext);

  const displayTitle = Array.isArray(title)
    ? title[0]
    : title || i18n[language].pageNotFound;
  const displayMessage = Array.isArray(message)
    ? message[0]
    : message || i18n[language].pageNotFoundMessage;

  return (
    <>
      <Stack.Screen options={{ title: '404 Not Found' }} />
      <ThemedView style={styles.container}>
        <ThemedText style={styles.errorCode}>404</ThemedText>
        <ThemedText type='title' style={styles.title}>
          {displayTitle}
        </ThemedText>
        <ThemedText style={styles.message}>{displayMessage}</ThemedText>
        <Link href='/' style={styles.link}>
          <ThemedText type='link'>{i18n[language].goToHomeScreen}</ThemedText>
        </Link>
      </ThemedView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  errorCode: {
    fontSize: 72,
    fontWeight: 'bold',
    marginBottom: 16,
    opacity: 0.8,
  },
  title: {
    marginBottom: 16,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ff3b30',
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
    opacity: 0.8,
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
  },
});
