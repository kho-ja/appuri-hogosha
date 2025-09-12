import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { useStudents } from '@/contexts/student-context';
import { ThemedText } from '@/components/ThemedText';
import { StudentSelector } from '@/components/StudentSelector';
import { useTheme } from '@rneui/themed';
import { useFocusEffect } from '@react-navigation/native';
import { RefreshControl, ScrollView } from 'react-native-gesture-handler';
import NoStudentsScreen from '@/components/NoStudentsScreen';
import { useSession } from '@/contexts/auth-context';

const HomeScreen = () => {
  const [refreshing, setRefreshing] = useState(false);
  const { students, refetch, isLoading } = useStudents();
  const { theme } = useTheme();
  const { session } = useSession();
  const backgroundColor = theme.colors.background;

  useFocusEffect(
    useCallback(() => {
      if (session) {
        refetch();
      }
    }, [refetch, session])
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
  if (!session) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size='large' color='#adb5bd' />
        <ThemedText>Authenticating...</ThemedText>
      </View>
    );
  }

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
