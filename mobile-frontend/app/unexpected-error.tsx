import { View, Text } from 'react-native';

export default function UnexpectedError() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>An unexpected error occurred. Please try again.</Text>
    </View>
  );
}
