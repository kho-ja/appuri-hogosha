import React, { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { useStudents } from '@/contexts/student-context';
import { ThemedText } from '@/components/ThemedText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StudentSelector } from '@/components/StudentSelector';
import { useTheme } from '@rneui/themed';
import { useFocusEffect } from '@react-navigation/native';
import { RefreshControl, ScrollView } from 'react-native-gesture-handler';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BatteryOptimizationHelper from '@/components/BatteryOptimizationHelper';
import NoStudentsScreen from '@/components/NoStudentsScreen';

const HomeScreen = () => {
  const [refreshing, setRefreshing] = useState(false);
  const [showBatteryHelper, setShowBatteryHelper] = useState(false);
  const { students, refetch, isLoading } = useStudents();
  const { theme } = useTheme();
  const backgroundColor = theme.colors.background;

  useFocusEffect(
    useCallback(() => {
      refetch(); // ✅ triggers fetch again when screen is focused
    }, [refetch])
  );

  // Check if we should show the battery optimization helper
  useEffect(() => {
    const checkBatteryHelper = async () => {
      try {
        const hasShown = await AsyncStorage.getItem('battery_helper_shown');
        const lastShown = await AsyncStorage.getItem(
          'battery_helper_last_shown'
        );
        const now = Date.now();
        const oneWeek = 7 * 24 * 60 * 60 * 1000;

        // Show if never shown, or if it's been more than a week
        if (!hasShown || (lastShown && now - parseInt(lastShown) > oneWeek)) {
          // Add a small delay so the screen loads first
          setTimeout(() => setShowBatteryHelper(true), 2000);
        }
      } catch (error) {
        console.error('Error checking battery helper status:', error);
      }
    };

    checkBatteryHelper();
  }, []);

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

  const handleBatteryHelperDismiss = async () => {
    setShowBatteryHelper(false);
    await AsyncStorage.setItem('battery_helper_shown', 'true');
    await AsyncStorage.setItem(
      'battery_helper_last_shown',
      Date.now().toString()
    );
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
      <>
        <SafeAreaView style={[styles.container, { backgroundColor }]}>
          <NoStudentsScreen onRefresh={onRefresh} isRefreshing={refreshing} />
        </SafeAreaView>

        {/* Battery Optimization Helper */}
        <BatteryOptimizationHelper
          visible={showBatteryHelper}
          onDismiss={handleBatteryHelperDismiss}
        />
      </>
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

      {/* Battery Optimization Helper */}
      <BatteryOptimizationHelper
        visible={showBatteryHelper}
        onDismiss={handleBatteryHelperDismiss}
      />
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
