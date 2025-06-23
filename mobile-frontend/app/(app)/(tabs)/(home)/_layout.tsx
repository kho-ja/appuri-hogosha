import { router, Stack } from 'expo-router';
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMessageContext } from '@/contexts/message-context';

const Layout = () => {
  const { unreadCount } = useMessageContext();

  return (
    <Stack>
      <Stack.Screen name='index' options={{ headerShown: false }} />
      <Stack.Screen
        name='student/[id]'
        options={({ route }: any) => {
          return {
            headerTitle: 'Student',
            headerTitleAlign: 'center',
            headerLeft: () => (
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
              return (
                <View
                  style={{
                    width: 25,
                    height: 25,
                    backgroundColor: '#005678',
                    borderRadius: '50%',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: 'white' }}>{unreadCount}</Text>
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
