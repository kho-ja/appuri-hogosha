import React, { useContext } from 'react';
import { Student } from '@/constants/types';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Pressable, StyleSheet, View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { Separator } from './atomic/separator';
import { I18nContext } from '@/contexts/i18n-context';
import { useTheme } from '@rneui/themed';

interface StudentSelectorProps {
  students: Student[] | null;
}

export const StudentSelector: React.FC<StudentSelectorProps> = React.memo(
  ({ students }) => {
    const router = useRouter();
    const { language, i18n } = useContext(I18nContext);
    const handleStudentSelect = (student: Student) => {
      router.push(`/(tabs)/(home)/student/${student.id}`);
    };
    const { theme } = useTheme();
    const backgroundColor = theme.colors.background;
    const borderColor = theme.colors.black;
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
      <View style={[styles.card, { backgroundColor }]}>
        <ThemedText>{i18n[language].SelectStudent}</ThemedText>
        <View style={styles.studentList}>
          {students?.map(student => (
            <React.Fragment key={student.id}>
              <Separator />
              <Pressable
                style={styles.studentEntry}
                onPress={() => handleStudentSelect(student)}
              >
                <ThemedView
                  style={[
                    styles.studentAvatar,
                    {
                      backgroundColor: getConsistentAvatarColor(student.id),
                      borderColor: borderColor,
                    },
                  ]}
                >
                  <Text style={{ fontWeight: 'bold' }}>
                    {student.given_name.charAt(0).toUpperCase()}
                    {student.given_name.charAt(1)}
                  </Text>
                </ThemedView>
                <ThemedView style={styles.StudentContainer}>
                  <View>
                    <ThemedText style={styles.studentName}>
                      {student.given_name}
                    </ThemedText>
                    <ThemedText style={styles.studentEmail}>
                      {student.email}
                    </ThemedText>
                  </View>
                  <ThemedText>
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
          <Separator orientation='horizontal' />
        </View>
      </View>
    );
  }
);

StudentSelector.displayName = 'StudentSelector';

const styles = StyleSheet.create({
  card: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 25,
    padding: 16,
    margin: 16,
  },
  studentList: {
    marginBottom: 16,
  },
  studentEntry: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 12,
  },
  studentAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    borderStyle: 'solid',
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  studentName: {
    fontSize: 16,
    fontWeight: '600',
  },
  studentEmail: {
    fontSize: 14,
    color: 'gray',
  },
  MessageCount: {
    width: 25,
    height: 25,
    borderRadius: 15,
    backgroundColor: '#005678',
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
