import { Stack } from 'expo-router';
import { Platform } from 'react-native';

export default function HomeLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="student/[studentId]/index"
        options={({ route }: any) => {
          const givenName = route.params?.givenName ?? '';
          const familyName = route.params?.familyName ?? '';
          const studentName = `${givenName} ${familyName}`.trim() || 'Student';

          return {
            headerTitle: studentName,
            headerTitleAlign: 'center',
            headerShadowVisible: false,
            headerStyle: {
              backgroundColor: '#1A4AAC',
            },
            headerTintColor: '#fff',
            headerTitleStyle: {
              color: '#fff',
              fontWeight: 'bold',
              fontSize: Platform.OS === 'android' ? 18 : 17,
            },
            ...(Platform.OS === 'android' && {
              headerStatusBarHeight: 0,
            }),
          };
        }}
      />
      <Stack.Screen
        name="student/[studentId]/message/[id]"
        options={{
          headerTitle: "Batafsil ko'rish",
          headerTitleAlign: 'center',
          headerBackButtonDisplayMode: 'minimal',
          headerShadowVisible: false,
          headerStyle: {
            backgroundColor: '#1A4AAC',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            color: '#fff',
            fontWeight: 'bold',
            fontSize: Platform.OS === 'android' ? 18 : 17,
          },
          ...(Platform.OS === 'android' && {
            headerStatusBarHeight: 0,
          }),
        }}
      />
    </Stack>
  );
}
