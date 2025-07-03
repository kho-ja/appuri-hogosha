import { router, Stack } from 'expo-router';
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMessageContext } from '@/contexts/message-context';
import { useStudents } from '@/contexts/student-context';
import { useFontSize } from '@/contexts/FontSizeContext';

const Layout = () => {
  const { unreadCount } = useMessageContext();
  const { students } = useStudents();
  const { multiplier } = useFontSize();

  return (
    <Stack>
      <Stack.Screen name='index' options={{ headerShown: false }} />
      <Stack.Screen
        name='student/[id]'
        options={({ route }: any) => {
          const { isOnlyStudent } = route.params || {};
          const studentId = route.params?.id;

          // Find the student by ID to get their name
          const student = students?.find(s => s.id === Number(studentId));
          const studentName = student?.given_name || 'Student';

          return {
            headerTitle: studentName,
            headerTitleAlign: 'center',
            headerLeft:
              isOnlyStudent === 'true'
                ? undefined
                : () => (
                    <Pressable
                      onPress={() => {
                        router.replace('/');
                      }}
                      style={{ marginLeft: 10 }}
                    >
                      <Ionicons
                        name={'arrow-back-outline'}
                        size={24}
                        color='#adb5bd'
                      />
                    </Pressable>
                  ),
            headerRight: () => {
              if (unreadCount === 0) {
                return null;
              }

              const fontSize = 12 * multiplier;
              const containerSize = Math.max(25, fontSize + 16);

              return (
                <View
                  style={{
                    width: containerSize,
                    height: containerSize,
                    backgroundColor: '#005678',
                    borderRadius: containerSize / 2,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <Text
                    style={{
                      color: 'white',
                      fontSize: fontSize,
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
          const { studentId } = route.params as { studentId?: string };

          return {
            headerTitle: 'Detailed view',
            headerTitleAlign: 'center',
            headerLeft: () => (
              <Pressable
                onPress={() => {
                  if (studentId) {
                    router.replace(`/student/${studentId}`);
                  } else {
                    router.back();
                  }
                }}
                style={{ marginLeft: 10 }}
              >
                <Ionicons
                  name={'arrow-back-outline'}
                  size={24}
                  color='#adb5bd'
                />
              </Pressable>
            ),
          };
        }}
      />
    </Stack>
  );
};

export default Layout;
