import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { useSession } from '@/contexts/auth-context';
import { BottomSheet, Button, useTheme } from '@rneui/themed';
import { I18nContext } from '@/contexts/i18n-context';
import { User } from '@/constants/types';
import { useSQLiteContext } from 'expo-sqlite';
import { ThemedView } from '@/components/ThemedView';
import { Href, router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FontSizeSlider, SampleText } from '@/components/FontSizeSlider';
import translation from '@/translations/translation';
import ThemeSwitcher from '@/components/ThemeSwitcher';
import { useFontSize } from '@/contexts/FontSizeContext';

const languageData = [
  {
    language: "O'zbekcha",
    flag: '🇺🇿',
  },
  {
    language: 'Русский',
    flag: '🇷🇺',
  },
  {
    language: '日本語',
    flag: '🇯🇵',
  },
  {
    language: 'English',
    flag: '🇬🇧',
  },
];

const RadioCircle = ({ selected }: { selected: boolean }) => (
  <View
    style={{
      height: 22,
      width: 22,
      borderRadius: 11,
      borderWidth: 2,
      borderColor: selected ? '#3887FE' : '#C6C6C6',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'transparent',
    }}
  >
    {selected ? (
      <View
        style={{
          height: 12,
          width: 12,
          borderRadius: 6,
          backgroundColor: '#3887FE',
        }}
      />
    ) : null}
  </View>
);

interface LanguageSelectionProps {
  language: string;
  selectedLanguage: string;
  onSelect: (language: string) => void;
  flag: string;
}

const LanguageSelection: React.FC<
  LanguageSelectionProps & { isDark: boolean }
> = ({ language, selectedLanguage, onSelect, flag, isDark }) => {
  const selected = selectedLanguage === language;
  return (
    <TouchableOpacity
      key={language}
      style={[
        styles.container1,
        selected && { backgroundColor: isDark ? '#226fc9' : '#EAF2FF' },
      ]}
      onPress={() => onSelect(language)}
      activeOpacity={0.8}
    >
      <View style={styles.row}>
        <ThemedText style={styles.flag}>{flag}</ThemedText>
        <ThemedText style={{ fontSize: 16 }}>{language}</ThemedText>
      </View>
      <RadioCircle selected={selected} />
    </TouchableOpacity>
  );
};

export default function SettingsScreen() {
  const { language, i18n, setLanguage } = useContext(I18nContext);
  const { signOut } = useSession();
  const db = useSQLiteContext();
  const [user, setUser] = useState<User | null>(null);
  const { theme } = useTheme();
  const isDark = theme.mode === 'dark';
  const [isLanguageOpen, setIsLanguageOpen] = useState(false);
  const [isFontSizeOpen, setIsFontSizeOpen] = useState(false);
  // live preview for font size slider while dragging
  const [fontPreviewMultiplier, setFontPreviewMultiplier] = useState<
    number | undefined
  >(undefined);
  const [selectedLanguage, setSelectedLanguage] = useState(
    language === 'en'
      ? 'English'
      : language === 'ja'
        ? '日本語'
        : language === 'ru'
          ? 'Русский'
          : "O'zbekcha"
  );
  // RNE BottomSheet uses simple isVisible toggles; no refs/snap points needed

  useFontSize();

  const handleLanguageSelect = async (
    language: React.SetStateAction<string>
  ) => {
    const languageCode =
      language === 'English'
        ? 'en'
        : language === '日本語'
          ? 'ja'
          : language === 'Русский'
            ? 'ru'
            : 'uz';

    setLanguage(languageCode);
    setSelectedLanguage(language);
    await AsyncStorage.setItem('language', languageCode);
    setIsLanguageOpen(false);
  };
  const handlePresentModal = useCallback(() => {
    setIsLanguageOpen(true);
  }, []);

  const handlePresentFontSizeModal = useCallback(() => {
    setIsFontSizeOpen(true);
  }, []);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const userData: User | null =
          await db.getFirstSync('SELECT * FROM user');
        setUser(userData);
      } catch (error) {
        console.error('Error fetching user data:', error);
        setUser(null);
      }
    };

    fetchUser();
  }, [db]);

  // Compute display name and hide the name row if both parts are empty/blank
  const displayName = useMemo(() => {
    const given = (user?.given_name ?? '').trim();
    const family = (user?.family_name ?? '').trim();
    const combined = [given, family].filter(Boolean).join(' ');
    return combined || '';
  }, [user]);

  const handlePress = useCallback(() => {
    Alert.alert(
      i18n[language].confirmLogout || 'Confirm Logout',
      i18n[language].logoutMessage || 'Are you sure you want to log out?',
      [
        {
          text: i18n[language].cancel || 'Cancel',
          style: 'cancel',
        },
        {
          text: i18n[language].logout || 'Logout',
          style: 'destructive',
          onPress: () => signOut(),
        },
      ]
    );
  }, [signOut, i18n, language]);

  const backgroundColor = theme.colors.background;

  // Backdrop press is handled via BottomSheetBackdrop 'pressBehavior="close"'

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: 16 }}
      >
        <View style={styles.infoCard}>
          <ThemedText style={styles.sectionTitle}>
            {i18n[language].personalInfo}
          </ThemedText>
          <View style={styles.infoRow}>
            {displayName ? (
              <View style={styles.row}>
                <Ionicons
                  name='person-outline'
                  size={22}
                  color={theme.colors.grey1}
                  style={styles.infoIcon}
                />
                <View>
                  <ThemedText
                    style={[
                      styles.profileInitial,
                      { color: theme.colors.grey1 },
                    ]}
                  >
                    {i18n[language].name}
                  </ThemedText>
                  <ThemedText style={styles.profileText}>
                    {user && `${user.given_name} ${user.family_name}`}
                  </ThemedText>
                </View>
              </View>
            ) : null}
            <View style={styles.row}>
              <Ionicons
                name='call-outline'
                size={22}
                color={theme.colors.grey1}
                style={styles.infoIcon}
              />
              <View>
                <ThemedText
                  style={[styles.profileInitial, { color: theme.colors.grey1 }]}
                >
                  {i18n[language].phoneNumber}
                </ThemedText>
                <ThemedText style={styles.profileText}>
                  +{user && user.phone_number}
                </ThemedText>
              </View>
            </View>
          </View>
        </View>
        <View style={styles.infoCard}>
          <ThemedText style={styles.sectionTitle}>
            {i18n[language].preferences}
          </ThemedText>
          <Pressable onPress={handlePresentModal} style={styles.row}>
            <View style={[styles.rowIcon, { backgroundColor: '#64748B' }]}>
              <Ionicons color='#fff' name='language-outline' size={20} />
            </View>
            <ThemedText style={styles.rowLabel}>
              {i18n[language].language}
            </ThemedText>
            <View style={styles.rowSpacer} />
            <Ionicons color='#C6C6C6' name='chevron-forward' size={20} />
          </Pressable>
          <Pressable
            onPress={() => router.navigate('change-psswd' as Href)}
            style={styles.row}
          >
            <View style={[styles.rowIcon, { backgroundColor: '#64748B' }]}>
              <Ionicons color='#fff' name='lock-closed-outline' size={20} />
            </View>
            <ThemedText style={styles.rowLabel}>
              {i18n[language].changePassword}
            </ThemedText>
            <View style={styles.rowSpacer} />
            <Ionicons color='#C6C6C6' name='chevron-forward' size={20} />
          </Pressable>
          <Pressable style={styles.row} onPress={handlePresentFontSizeModal}>
            <View style={[styles.rowIcon, { backgroundColor: '#64748B' }]}>
              <Ionicons color='#fff' name='text' size={20} />
            </View>
            <ThemedText style={styles.rowLabel}>
              {i18n[language].textSize}
            </ThemedText>
            <View style={styles.rowSpacer} />
            <Ionicons color='#C6C6C6' name='chevron-forward' size={20} />
          </Pressable>
          <ThemeSwitcher />
        </View>
        <BottomSheet
          isVisible={isLanguageOpen}
          onBackdropPress={() => setIsLanguageOpen(false)}
          modalProps={{
            transparent: true,
            statusBarTranslucent: true,
            // Disable slide so the backdrop doesn't animate from bottom
            animationType: 'none',
          }}
          containerStyle={{ backgroundColor: 'rgba(0,0,0,0.35)' }}
        >
          <ThemedView
            style={[
              styles.contentContainer,
              {
                backgroundColor: theme.colors.background,
                borderTopLeftRadius: 16,
                borderTopRightRadius: 16,
                paddingTop: 8,
              },
            ]}
          >
            <ThemedText
              style={{
                marginTop: 18,
                marginBottom: 18,
                fontSize: 18,
                alignSelf: 'flex-start',
              }}
            >
              {i18n[language].language}
            </ThemedText>
            <ThemedView style={{ width: '100%' }}>
              {languageData.map(l => (
                <LanguageSelection
                  key={l.language}
                  language={l.language}
                  selectedLanguage={selectedLanguage}
                  onSelect={handleLanguageSelect}
                  flag={l.flag}
                  isDark={isDark}
                />
              ))}
            </ThemedView>
          </ThemedView>
        </BottomSheet>
        <BottomSheet
          isVisible={isFontSizeOpen}
          onBackdropPress={() => setIsFontSizeOpen(false)}
          backdropStyle={{ opacity: 0 }}
          modalProps={{
            transparent: true,
            statusBarTranslucent: true,
            animationType: 'slide',
          }}
          containerStyle={{ backgroundColor: 'rgba(0,0,0,0.35)' }}
        >
          <ThemedView
            style={[
              styles.contentContainer,
              {
                backgroundColor: theme.colors.background,
                borderTopLeftRadius: 16,
                borderTopRightRadius: 16,
                paddingTop: 8,
              },
            ]}
          >
            <ThemedView style={styles.row}></ThemedView>
            <ThemedView style={styles.fontSizeContainer}>
              <View style={styles.sliderWithLabels}>
                <ThemedText
                  style={{
                    fontSize: 14,
                    color: '#8E8E93',
                    fontWeight: '500',
                  }}
                >
                  A
                </ThemedText>
                <View style={styles.sliderFixedContainer}>
                  <FontSizeSlider onPreviewChange={setFontPreviewMultiplier} />
                </View>
                <ThemedText
                  style={{
                    fontSize: 24,
                    color: '#8E8E93',
                    fontWeight: '600',
                  }}
                >
                  A
                </ThemedText>
              </View>

              <SampleText
                text={
                  translation[language as keyof typeof translation]
                    ?.sampleText ||
                  'Choose the text size that suits you best for a more comfortable reading experience.'
                }
                overrideMultiplier={fontPreviewMultiplier}
              />
            </ThemedView>
          </ThemedView>
        </BottomSheet>
        <View style={{ marginTop: 40, marginBottom: 20 }}>
          <Button
            buttonStyle={styles.submitButton}
            onPress={handlePress}
            title={i18n[language].logout}
            titleStyle={styles.text}
            icon={<Ionicons name='log-out-outline' size={30} color='#FF4444' />}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    rowGap: 10,
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
  },
  submitButton: {
    padding: 10,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 25,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: '#FF4444',
    backgroundColor: 'transparent',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 20,
  },
  infoRow: {
    gap: 20,
  },
  infoIcon: {
    marginRight: 15,
  },
  profileText: {
    fontSize: 16,
    fontWeight: '400',
    width: 280,
  },
  profileInitial: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  infoCard: {
    marginHorizontal: 20,
    marginTop: 20,
    padding: 15,
    borderWidth: 1,
    borderColor: '#bec0c2',
    borderRadius: 20,
    alignItems: 'flex-start',
    position: 'relative',
  },
  container1: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 4,
    width: '100%',
    backgroundColor: 'transparent',
    paddingVertical: 7,
    paddingHorizontal: 16,
  },
  selected: {
    backgroundColor: '#EAF2FF',
  },
  flag: {
    fontSize: 22,
    marginRight: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    height: 50,
    borderRadius: 8,
    marginHorizontal: 5,
  },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: 3,
    marginRight: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: {
    fontSize: 17,
    fontWeight: '400',
  },
  rowSpacer: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
  },
  contentContainer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 15,
  },
  title: {
    fontWeight: '900',
    letterSpacing: 0.5,
    fontSize: 16,
  },
  text: {
    marginLeft: 12,
    fontWeight: 'bold',
    color: '#FF4444',
  },
  // Font Size Sheet styles
  fontSizeContainer: {
    paddingVertical: 20,
  },
  sliderWithLabels: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },
  sliderFixedContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 10,
  },
});
