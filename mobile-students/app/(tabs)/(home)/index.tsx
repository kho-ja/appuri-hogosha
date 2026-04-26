import { Redirect } from 'expo-router';

export default function HomeScreen() {
  return (
    <Redirect
      href={{
        pathname: '/(tabs)/(home)/student/[studentId]',
        params: {
          studentId: '222528',
          givenName: 'Abdulaziz',
          familyName: 'Ikramov',
        },
      }}
    />
  );
}
