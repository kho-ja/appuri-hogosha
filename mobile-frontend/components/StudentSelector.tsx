import React, { useContext, useCallback } from 'react';
import { Student } from '@/constants/types';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Pressable, StyleSheet, View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { I18nContext } from '@/contexts/i18n-context';
import { useTheme } from '@rneui/themed';
import { useThemeColor } from '@/hooks/useThemeColor';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface StudentSelectorProps {
  students: Student[] | null;
}

export const StudentSelector: React.FC<StudentSelectorProps> = React.memo(
  ({ students }) => {
    const router = useRouter();
    const { language, i18n } = useContext(I18nContext);
    const [hasAutoNavigated, setHasAutoNavigated] = React.useState(false);
    const [isDeepLinkNavigation, setIsDeepLinkNavigation] =
      React.useState(false);
    const { theme } = useTheme();
    const textColor = useThemeColor({}, 'text');

    // Check if we're in a deep link navigation scenario
    React.useEffect(() => {
      const checkDeepLinkFlag = async () => {
        const isDeepLink = await AsyncStorage.getItem('isDeepLinkNavigation');
        setIsDeepLinkNavigation(isDeepLink === 'true');
        if (isDeepLink === 'true') {
          // Clear the flag after reading
          await AsyncStorage.removeItem('isDeepLinkNavigation');
        }
      };
      checkDeepLinkFlag();
    }, []);

    const handleStudentSelect = useCallback(
      (student: Student, autoNavigation = false) => {
        if (autoNavigation && students?.length === 1) {
          // Use replace for auto-navigation to prevent back button issues
          router.replace({
            pathname: `/(tabs)/(home)/student/${student.id}`,
            params: {
              unread_count: student.unread_count as number,
              isOnlyStudent: 'true',
            },
          });
        } else {
          router.push({
            pathname: `/(tabs)/(home)/student/${student.id}`,
            params: {
              unread_count: student.unread_count as number,
              isOnlyStudent: students?.length === 1 ? 'true' : 'false',
            },
          });
        }
      },
      [router, students]
    );

    // Auto-navigate if there's only one student (only once)
    // Skip auto-navigation during deep link scenarios
    React.useEffect(() => {
      if (
        students?.length === 1 &&
        !hasAutoNavigated &&
        !isDeepLinkNavigation
      ) {
        setHasAutoNavigated(true);
        // Navigate immediately
        handleStudentSelect(students[0], true);
      } else if (students?.length !== 1) {
        setHasAutoNavigated(false);
      }
    }, [students, handleStudentSelect, hasAutoNavigated, isDeepLinkNavigation]);

    // Don't render anything if single student - we're auto-navigating
    if (students?.length === 1) {
      return null;
    }

    const avatarColors = [
      '#fc958d',
      '#fc9abc',
      '#c45ad6',
      '#8191eb',
      '#03a9f4',
      '#68bab3',
      '#7feb83',
      '#f7c274',
      '#f2b49d',
      '#e1f296',
      '#f7a6a6',
    ];

    const getConsistentAvatarColor = (id: number) => {
      const key = id.toString();
      let hash = 0;
      for (let i = 0; i < key.length; i++) {
        hash = key.charCodeAt(i) + ((hash << 5) - hash);
      }
      const index = Math.abs(hash % avatarColors.length);
      return avatarColors[index];
    };

    return (
      <View style={styles.studentList}>
        {students?.map(student => (
          <React.Fragment key={student.id}>
            <Pressable
              style={[
                styles.studentEntry,
                {
                  backgroundColor:
                    theme.mode === 'dark' ? '#1E1E1E' : '#FFFFFF',
                  borderColor:
                    theme.mode === 'dark' ? '#3a3a3c' : 'rgb(228, 231, 235)',
                },
              ]}
              onPress={() => handleStudentSelect(student)}
            >
              <ThemedView
                style={[
                  styles.studentAvatar,
                  {
                    backgroundColor: getConsistentAvatarColor(student.id),
                    borderColor: 'transparent',
                  },
                ]}
              >
                <Text style={{ fontWeight: 'bold', color: '#fff' }}>
                  {student.given_name.charAt(0).toUpperCase()}
                  {student.family_name?.charAt(0).toUpperCase() ||
                    student.given_name.charAt(1)}
                </Text>
              </ThemedView>
              <ThemedView
                style={[
                  styles.StudentContainer,
                  { backgroundColor: 'transparent' },
                ]}
              >
                <View style={{ maxWidth: '85%' }}>
                  <ThemedText
                    style={[styles.studentName, { color: textColor }]}
                  >
                    {student.given_name} {student.family_name}
                  </ThemedText>
                  <ThemedText
                    style={[
                      styles.studentId,
                      { color: theme.mode === 'dark' ? '#8E8E93' : 'gray' },
                    ]}
                  >
                    {(i18n as any).StudentIdLabel ||
                      (language === 'ja'
                        ? '学生ID:'
                        : language === 'uz'
                          ? 'Talaba ID raqami:'
                          : 'Student ID:')}{' '}
                    <Text style={{ fontWeight: '600', color: textColor }}>
                      {student.student_number}
                    </Text>
                  </ThemedText>
                </View>
                <ThemedText style={{ width: 25, height: 25 }}>
                  {student.unread_count ? (
                    <ThemedView style={styles.MessageCount}>
                      <ThemedText style={styles.MessageCountText}>
                        {student.unread_count}
                      </ThemedText>
                    </ThemedView>
                  ) : null}
                </ThemedText>
              </ThemedView>
            </Pressable>
          </React.Fragment>
        ))}
      </View>
    );
  }
);

StudentSelector.displayName = 'StudentSelector';

const styles = StyleSheet.create({
  studentList: {
    marginBottom: 16,
  },
  studentEntry: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    marginLeft: 16,
    marginRight: 16,
    borderRadius: 8,
    borderWidth: 1,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  studentAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  studentName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  studentId: {
    fontSize: 14,
    marginBottom: 4,
  },
  MessageCount: {
    width: '100%',
    height: '100%',
    borderRadius: 15,
    backgroundColor: '#3B81F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  MessageCountText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: 'bold',
  },
  StudentContainer: {
    flexDirection: 'row',
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
