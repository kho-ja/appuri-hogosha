import React, { useContext } from 'react';
import { View, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Button } from '@rneui/themed';
import { Ionicons } from '@expo/vector-icons';
import { I18nContext } from '@/contexts/i18n-context';
import { useTheme } from '@rneui/themed';

interface NoStudentsScreenProps {
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

const NoStudentsScreen: React.FC<NoStudentsScreenProps> = ({
  onRefresh,
  isRefreshing = false,
}) => {
  const { language, i18n } = useContext(I18nContext);
  const { theme } = useTheme();

  return (
    <ThemedView style={styles.container}>
      <View style={styles.iconContainer}>
        <Ionicons
          name='people-outline'
          size={80}
          color={theme.colors.disabled}
        />
      </View>

      <ThemedText style={styles.title}>
        {i18n[language].noStudentsFound}
      </ThemedText>

      <ThemedText style={styles.description}>
        {i18n[language].noStudentsDescription}
      </ThemedText>

      <View style={styles.buttonContainer}>
        <Button
          title={i18n[language].refresh}
          onPress={onRefresh}
          buttonStyle={[
            styles.refreshButton,
            { backgroundColor: theme.colors.primary },
          ]}
          loading={isRefreshing}
          disabled={isRefreshing}
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

      <View style={styles.helpContainer}>
        <ThemedText style={styles.helpTitle}>
          {i18n[language].needHelp}
        </ThemedText>

        <View style={styles.helpItem}>
          <Ionicons
            name='checkmark-circle-outline'
            size={20}
            color={theme.colors.success || '#059669'}
            style={styles.helpIcon}
          />
          <ThemedText style={styles.helpText}>
            {i18n[language].checkCorrectAccount}
          </ThemedText>
        </View>

        <View style={styles.helpItem}>
          <Ionicons
            name='checkmark-circle-outline'
            size={20}
            color={theme.colors.success || '#059669'}
            style={styles.helpIcon}
          />
          <ThemedText style={styles.helpText}>
            {i18n[language].contactSchool}
          </ThemedText>
        </View>

        <View style={styles.helpItem}>
          <Ionicons
            name='checkmark-circle-outline'
            size={20}
            color={theme.colors.success || '#059669'}
            style={styles.helpIcon}
          />
          <ThemedText style={styles.helpText}>
            {i18n[language].checkInternet}
          </ThemedText>
        </View>
      </View>
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  iconContainer: {
    marginBottom: 24,
    opacity: 0.6,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
    opacity: 0.8,
    paddingHorizontal: 16,
  },
  buttonContainer: {
    marginBottom: 48,
    width: '100%',
    maxWidth: 200,
  },
  refreshButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  helpContainer: {
    width: '100%',
    maxWidth: 400,
  },
  helpTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  helpItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  helpIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  helpText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.8,
  },
});

export default NoStudentsScreen;
