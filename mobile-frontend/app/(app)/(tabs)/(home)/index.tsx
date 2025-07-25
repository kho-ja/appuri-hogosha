import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { useStudents } from '@/contexts/student-context';
import { ThemedText } from '@/components/ThemedText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StudentSelector } from '@/components/StudentSelector';
import { useTheme } from '@rneui/themed';
import { useFocusEffect } from '@react-navigation/native';
import { RefreshControl, ScrollView } from 'react-native-gesture-handler';
import NoStudentsScreen from '@/components/NoStudentsScreen';

const HomeScreen = () => {
  const [refreshing, setRefreshing] = useState(false);
  const { students, refetch, isLoading } = useStudents();
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
      await refetch();
    } catch (error) {
      console.error('Refresh failed:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // Show loading spinner while initially loading
  if (isLoading && !students) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size='large' color='#adb5bd' />
        <ThemedText>Loading students...</ThemedText>
      </View>
    );
  }

  // Show no students screen if no students are available
  if (!isLoading && (!students || students.length === 0)) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor }]}>
        <NoStudentsScreen onRefresh={onRefresh} isRefreshing={refreshing} />
      </SafeAreaView>
    );
  }

  // Show main screen with students
  return (
    <>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        style={{ backgroundColor }}
      >
        <SafeAreaView style={[styles.safeArea, { backgroundColor }]}>
          <StudentSelector students={students} />
        </SafeAreaView>
      </ScrollView>
    </>
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
