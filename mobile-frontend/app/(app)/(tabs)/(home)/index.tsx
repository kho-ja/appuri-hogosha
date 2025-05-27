import React from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { useStudents } from '@/contexts/student-context'; // Your student context
import { ThemedText } from '@/components/ThemedText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StudentSelector } from '@/components/StudentSelector'; // Your selector component
// import MessageList from '@/components/MessageList';
import { useTheme } from '@rneui/themed';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import { RefreshControl, ScrollView } from 'react-native-gesture-handler';

const HomeScreen = () => {
  const { students, refetch, isLoading } = useStudents(); // Fetch students from context
  const { theme } = useTheme();
  const backgroundColor = theme.colors.background;
  // Loading state while students are being fetched

  useFocusEffect(
    useCallback(() => {
      refetch(); // ✅ triggers fetch again when screen is focused
    }, [refetch])
  );

  const onRefresh = async () => {
    try {
      await refetch();
    } catch (error) {
      console.error('Refresh failed:', error);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size='large' color='#adb5bd' />
        <ThemedText>Loading students...</ThemedText>
      </View>
    );
  }

  // If there's only one student, show their messages directly
  // if (students.length === 1) {
  //   return <MessageList studentId={students[0].id} />;
  // }

  // If there are multiple students, show the selection list
  return (
    <ScrollView
      refreshControl={
        <RefreshControl refreshing={isLoading} onRefresh={onRefresh} />
      }
      style={{ backgroundColor }}
    >
      <SafeAreaView style={[styles.safeArea, { backgroundColor }]}>
        <StudentSelector students={students} />
      </SafeAreaView>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  safeArea: {
    flex: 1,
  },
});

export default HomeScreen;
