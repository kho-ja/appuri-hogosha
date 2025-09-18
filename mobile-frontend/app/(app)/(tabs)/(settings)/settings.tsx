import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  useMemo,
} from 'react';
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { useSession } from '@/contexts/auth-context';
import { I18nContext } from '@/contexts/i18n-context';
import { Button, useTheme } from '@rneui/themed';
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
  const [isLanguageModalVisible, setIsLanguageModalVisible] = useState(false);
  const [isFontSizeModalVisible, setIsFontSizeModalVisible] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState(
    language === 'en'
      ? 'English'
      : language === 'ja'
        ? '日本語'
        : language === 'ru'
          ? 'Русский'
          : "O'zbekcha"
  );

  const { multiplier } = useFontSize();

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
    setIsLanguageModalVisible(false);
  };
  const handlePresentModal = useCallback(() => {
    setIsLanguageModalVisible(true);
  }, []);

  const handlePresentFontSizeModal = useCallback(() => {
    setIsFontSizeModalVisible(true);
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
  const backgroundColor = theme.colors.background;

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
              <View style={styles.row}>
                <Ionicons
                  name='call-outline'
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
        </ScrollView>
        
        {/* Language Selection Modal */}
        <Modal
          visible={isLanguageModalVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setIsLanguageModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <Pressable 
              style={styles.modalBackdrop} 
              onPress={() => setIsLanguageModalVisible(false)}
            />
            <View style={[styles.modalContent, { backgroundColor: theme.colors.background }]}>
              <View style={styles.modalHeader}>
                <ThemedText style={styles.modalTitle}>
                  {i18n[language].language}
                </ThemedText>
                <Pressable onPress={() => setIsLanguageModalVisible(false)} style={styles.closeButton}>
                  <Ionicons name="close" size={24} color={theme.colors.grey1} />
                </Pressable>
              </View>
              <View style={styles.modalBody}>
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
              </View>
            </View>
          </View>
        </Modal>

        {/* Font Size Modal */}
        <Modal
          visible={isFontSizeModalVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setIsFontSizeModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <Pressable 
              style={styles.modalBackdrop} 
              onPress={() => setIsFontSizeModalVisible(false)}
            />
            <View style={[styles.modalContent, { backgroundColor: theme.colors.background }]}>
              <View style={styles.modalHeader}>
                <ThemedText style={styles.modalTitle}>
                  {i18n[language].textSize}
                </ThemedText>
                <Pressable onPress={() => setIsFontSizeModalVisible(false)} style={styles.closeButton}>
                  <Ionicons name="close" size={24} color={theme.colors.grey1} />
                </Pressable>
              </View>
              <View style={styles.modalBody}>
                <View style={styles.fontSizeContainer}>
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
                      <FontSizeSlider />
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
                  />
                </View>
              </View>
            </View>
          </View>
        </Modal>

        <View style={{ marginTop: 40, marginBottom: 20 }}>
          <Button
            buttonStyle={[
              styles.submitButton,
              { backgroundColor: theme.colors.background },
            ]}
            onPress={handlePress}
            title={i18n[language].logout}
            titleStyle={styles.text}
            icon={
              <Ionicons name='log-out-outline' size={30} color='#FF4444' />
            }
          />
        </View>
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
  // Modal styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalBackdrop: {
    flex: 1,
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '60%',
    minHeight: '40%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    padding: 5,
  },
  modalBody: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
});
