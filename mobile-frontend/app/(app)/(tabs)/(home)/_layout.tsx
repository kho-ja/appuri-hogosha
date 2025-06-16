import { router, Stack } from 'expo-router';
import React from 'react';
import { Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const Layout = () => {
  return (
    <Stack>
      <Stack.Screen name='index' options={{ headerShown: false }} />
      <Stack.Screen
        name='student/[id]'
        options={{
          headerTitle: 'Student',
          headerTitleAlign: 'center',
          headerLeft: () => (
            <Pressable
              onPress={() => {
                router.replace('/');
              }}
              style={{ marginLeft: 10 }}
            >
              <Ionicons name={'arrow-back-outline'} size={24} color='#adb5bd' />
            </Pressable>
          ),
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
