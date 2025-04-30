import React, { useContext } from 'react';
import { Student } from '@/constants/types';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Pressable, StyleSheet, Image, View, Text } from 'react-native';
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
                <Image
                  source={{
                    uri: 'https://vectorenok.ru/wp-content/uploads/2021/12/%D0%B2%D0%B5%D0%BA%D1%82_%D1%84%D0%BE%D0%BD.png',
                  }}
                  style={styles.studentAvatar}
                />
                <ThemedView
                  style={{
                    flexDirection: 'row',
                    flex: 1,
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <View>
                    <ThemedText style={styles.studentName}>
                      {student.given_name}
                    </ThemedText>
                    <ThemedText style={styles.studentEmail}>
                      {student.email}
                    </ThemedText>
                  </View>
                  <ThemedView
                    style={{
                      width: 25,
                      height: 25,
                      borderRadius: 15,
                      backgroundColor: '#005678',
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <ThemedText
                      style={{
                        fontSize: 12,
                        color: '#fff',
                        fontWeight: 'bold',
                      }}
                    >
                      {student.messageCount}
                    </ThemedText>
                  </ThemedView>
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
  },
  studentName: {
    fontSize: 16,
    fontWeight: '600',
  },
  studentEmail: {
    fontSize: 14,
    color: 'gray',
  },
});
