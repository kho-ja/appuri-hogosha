import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { useSession } from '@/contexts/auth-context';

const DemoBanner: React.FC = () => {
  const { isDemo } = useSession();
  if (!isDemo) return null;
  return (
    <View style={styles.banner}>
      <ThemedText style={styles.text}>
        {"Demo data – changes won't sync."}
      </ThemedText>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#FDE68A',
    paddingVertical: 4,
    alignItems: 'center',
  },
  text: {
    color: '#92400E',
    fontSize: 12,
  },
});

export default DemoBanner;
