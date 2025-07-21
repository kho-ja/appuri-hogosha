import { Stack } from 'expo-router';
import React, { useContext } from 'react';
import { Text, View } from 'react-native';
import { useMessageContext } from '@/contexts/message-context';
import { useStudents } from '@/contexts/student-context';
import { I18nContext } from '@/contexts/i18n-context';
import { useTheme } from '@rneui/themed';

const Layout = () => {
  const { unreadCount } = useMessageContext();
  const { students } = useStudents();
  const { language, i18n } = useContext(I18nContext);
  const { theme } = useTheme();

  return (
    <Stack>
      <Stack.Screen 
        name='index' 
        options={{ 
          headerTitle: i18n[language].SelectStudent,
          headerTitleAlign: 'center',
          headerStyle: {
            backgroundColor: 'rgb(59, 129, 246)'
          },
          headerTitleStyle: {
            color: 'white',
            fontWeight: 'bold'
          },
          headerTintColor: 'white'
        }} 
      />
      <Stack.Screen
        name='student/[id]'
        options={({ route }: any) => {
          const studentId = route.params?.id;

          // Find the student by ID to get their name
          const student = students?.find(s => s.id === Number(studentId));
          const studentName = student ? `${student.given_name} ${student.family_name}` : 'Student';

          return {
            headerTitle: studentName,
            headerTitleAlign: 'center',
            headerRight: () => {
              if (unreadCount === 0) {
                return null;
              }

              return (
                <View
                  style={{
                    width: 30,
                    height: 30,
                    backgroundColor: theme.mode === 'dark' ? 'rgb(59, 129, 246)' : 'rgba(26, 74, 172, 1)',
                    borderRadius: 15,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <Text
                    style={{
                      color: 'white',
                      fontSize: 18,
                      textAlign: 'center',
                      fontWeight: 'bold',
                    }}
                  >
                    {unreadCount}
                  </Text>
                </View>
              );
            },
          };
        }}
      />
      <Stack.Screen
        name='message/[id]'
        options={({ route }) => {
          return {
            headerTitle: i18n[language].detailedView,
            headerTitleAlign: 'center',
          };
        }}
      />
    </Stack>
  );
};

export default Layout;
