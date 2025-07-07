import { router, Stack } from 'expo-router';
import React, { useContext } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMessageContext } from '@/contexts/message-context';
import { useStudents } from '@/contexts/student-context';
import { I18nContext } from '@/contexts/i18n-context';

const Layout = () => {
  const { unreadCount } = useMessageContext();
  const { students } = useStudents();
  const { language, i18n} = useContext(I18nContext);

  return (
    <Stack>
      <Stack.Screen name='index' options={{ headerShown: false }} />
      <Stack.Screen
        name='student/[id]'
        options={({ route }: any) => {
          const studentId = route.params?.id;

          // Find the student by ID to get their name
          const student = students?.find(s => s.id === Number(studentId));
          const studentName = student?.given_name || 'Student';

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
                    backgroundColor: '#005678',
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
