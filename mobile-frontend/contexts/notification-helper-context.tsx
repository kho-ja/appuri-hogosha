import React, { createContext, useContext, useState, useEffect } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BatteryOptimizationHelper from '@/components/BatteryOptimizationHelper';

interface NotificationHelperContextType {
  showBatteryHelper: () => void;
  hideBatteryHelper: () => void;
  isVisible: boolean;
}

const NotificationHelperContext = createContext<NotificationHelperContextType>({
  showBatteryHelper: () => {},
  hideBatteryHelper: () => {},
  isVisible: false,
});

export const useNotificationHelper = () =>
  useContext(NotificationHelperContext);

export const NotificationHelperProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [isVisible, setIsVisible] = useState(false);

  // Check if we should auto-show the helper
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const checkAutoShow = async () => {
      try {
        const hasShown = await AsyncStorage.getItem(
          'battery_helper_auto_shown'
        );
        const lastShown = await AsyncStorage.getItem(
          'battery_helper_last_shown'
        );
        const now = Date.now();
        const oneWeek = 7 * 24 * 60 * 60 * 1000;

        // Auto-show if never shown, or if it's been more than a week
        if (!hasShown || (lastShown && now - parseInt(lastShown) > oneWeek)) {
          // Delay to let the app load
          setTimeout(() => setIsVisible(true), 3000);
        }
      } catch (error) {
        console.error('Error checking battery helper auto-show:', error);
      }
    };

    checkAutoShow();
  }, []);

  const showBatteryHelper = () => {
    setIsVisible(true);
  };

  const hideBatteryHelper = async () => {
    setIsVisible(false);
    await AsyncStorage.setItem('battery_helper_auto_shown', 'true');
    await AsyncStorage.setItem(
      'battery_helper_last_shown',
      Date.now().toString()
    );
  };

  return (
    <NotificationHelperContext.Provider
      value={{
        showBatteryHelper,
        hideBatteryHelper,
        isVisible,
      }}
    >
      {children}

      {/* Global Battery Optimization Helper */}
      <BatteryOptimizationHelper
        visible={isVisible}
        onDismiss={hideBatteryHelper}
      />
    </NotificationHelperContext.Provider>
  );
};

// Usage example in any component:
// const { showBatteryHelper } = useNotificationHelper();
// showBatteryHelper(); // Call this to show the helper
