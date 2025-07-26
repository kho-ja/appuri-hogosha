import { Stack } from 'expo-router';
import React, { useContext, useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { useMessageContext } from '@/contexts/message-context';
import { useStudents } from '@/contexts/student-context';
import { I18nContext } from '@/contexts/i18n-context';
import BatteryOptimizationHelper from '@/components/BatteryOptimizationHelper';
import AsyncStorage from '@react-native-async-storage/async-storage';

const Layout = () => {
  const [showBatteryHelper, setShowBatteryHelper] = useState(false);
  const { unreadCount } = useMessageContext();
  const { students } = useStudents();
  const { language, i18n } = useContext(I18nContext);
  const { theme } = useTheme();

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

  const handleBatteryHelperDismiss = async () => {
    setShowBatteryHelper(false);
    await AsyncStorage.setItem('battery_helper_shown', 'true');
    await AsyncStorage.setItem(
      'battery_helper_last_shown',
      Date.now().toString()
    );
  };

  return (
    <Stack>
      <Stack.Screen
        name='index'
        options={{
          title: i18n[language].SelectStudent,
          headerStyle: {
            backgroundColor: theme.mode === 'dark' ? '#1A4AAC' : '#3B81F6',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
            fontSize: Platform.OS === 'android' ? 16 : 17,
          },
          headerShadowVisible: false,
          headerTitleAlign: 'center',
        }}
      />
      <Stack.Screen
        name='student/[id]'
        options={({ route }: any) => {
          const studentId = route.params?.id;

          // Find the student by ID to get their name
          const student = students?.find(s => s.id === Number(studentId));
          const studentName = student
            ? `${student.given_name} ${student.family_name}`
            : 'Student';

          return {
            headerTitle: studentName,
            headerTitleAlign: 'center',
            headerStyle: {
              backgroundColor: theme.mode === 'dark' ? '#1A4AAC' : '#3B81F6',
            },
            headerTitleStyle: {
              color: 'white',
              fontWeight: 'bold',
              fontSize: Platform.OS === 'android' ? 18 : 17,
            },
            headerTintColor: 'white',
            ...(Platform.OS === 'android' && {
              headerStatusBarHeight: 0,
            }),
            headerRight: () => {
              if (unreadCount === 0) {
                return null;
              }

              return (
                <View
                  style={{
                    width: 30,
                    height: 30,
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    borderRadius: 15,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <Text
                    style={{
                      color: 'white',
                      fontSize: 18,
                      textAlign: 'center',
                      fontWeight: 'bold',
                    }}
                  >
                    {unreadCount}
                  </Text>
                </View>
              );
            },
          };
        }}
      />
      <Stack.Screen
        name='message/[id]'
        options={({ route }) => {
          return {
            headerTitle: i18n[language].detailedView,
            headerTitleAlign: 'center',
            headerStyle: {
              backgroundColor: theme.mode === 'dark' ? '#1A4AAC' : '#3B81F6',
            },
            headerTitleStyle: {
              color: 'white',
              fontWeight: 'bold',
              fontSize: Platform.OS === 'android' ? 18 : 17,
            },
            headerTintColor: 'white',
            ...(Platform.OS === 'android' && {
              headerStatusBarHeight: 0,
            }),
          };
        }}
      />

      {/* Battery Optimization Helper */}
      <BatteryOptimizationHelper
        visible={showBatteryHelper}
        onDismiss={handleBatteryHelperDismiss}
      />
    </Stack>
  );
};

export default Layout;
