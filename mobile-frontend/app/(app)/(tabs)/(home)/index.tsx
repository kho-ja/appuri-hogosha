import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStudents } from '@/contexts/student-context';
import { StudentSelector } from '@/components/StudentSelector';
import { useTheme } from '@rneui/themed';
import { useFocusEffect } from '@react-navigation/native';
import { RefreshControl, ScrollView } from 'react-native-gesture-handler';
import NoStudentsScreen from '@/components/NoStudentsScreen';

const HomeScreen = () => {
  const [refreshing, setRefreshing] = useState(false);
  const { students, refetch, isLoading, clearAndRefetch } = useStudents();
  const { theme } = useTheme();
  const backgroundColor = theme.colors.background;

  useFocusEffect(
    useCallback(() => {
      refetch(); // ✅ triggers fetch again when screen is focused
    }, [refetch])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await clearAndRefetch(); // Clear cache and fetch fresh data
    } catch (error) {
      console.error('Refresh failed:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // Show loading spinner while loading (either initializing or fetching without cache)
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size='large' color='#adb5bd' />
      </View>
    );
  }

  // Show no students screen ONLY after loading is complete and no students
  if (!students || students.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor }]}>
        <NoStudentsScreen onRefresh={onRefresh} isRefreshing={refreshing} />
      </SafeAreaView>
    );
  }

  // If only one student, StudentSelector will auto-navigate
  // Return minimal UI that won't be visible during navigation
  if (students.length === 1) {
    return (
      <View style={[styles.container, { backgroundColor }]}>
        <StudentSelector students={students} />
      </View>
    );
  }

  // Show main screen with students list (2+ students)
  return (
    <View style={[styles.container, { backgroundColor }]}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={{
          paddingTop: 32,
          paddingHorizontal: 16,
          paddingBottom: 20,
        }}
        showsVerticalScrollIndicator={false}
      >
        <StudentSelector students={students} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
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
