import { Redirect } from 'expo-router';

// This file handles the /home deep link path by redirecting to the home tab
export default function HomeRedirect() {
  return <Redirect href='/(tabs)/' />;
}
