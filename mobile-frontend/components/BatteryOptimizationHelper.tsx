import React, { useState, useEffect, useContext } from 'react';
import { View, StyleSheet, Platform, Alert, Linking } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { Button } from '@rneui/themed';
import { I18nContext } from '@/contexts/i18n-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface BatteryOptimizationHelperProps {
  visible?: boolean;
  onDismiss?: () => void;
}

const BatteryOptimizationHelper: React.FC<
  BatteryOptimizationHelperProps
> = props => {
  const { visible = false, onDismiss } = props;
  const { language, i18n } = useContext(I18nContext);
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    checkIfShouldShow();
  }, []);

  const checkIfShouldShow = async () => {
    if (Platform.OS !== 'android') return;

    const lastShown = await AsyncStorage.getItem('battery_helper_last_shown');
    const now = Date.now();
    const oneWeek = 7 * 24 * 60 * 60 * 1000;

    if (!lastShown || now - parseInt(lastShown) > oneWeek) {
      setShouldShow(true);
    }
  };

  const handleOpenSettings = () => {
    Alert.alert(
      i18n[language].batteryOptimizationSettings,
      i18n[language].batteryOptimizationInstructions,
      [
        { text: i18n[language].cancel, style: 'cancel' },
        {
          text: i18n[language].openSettings,
          onPress: () => {
            // Try to open app settings
            Linking.openSettings().catch(err =>
              console.error('Failed to open settings:', err)
            );
          },
        },
      ]
    );
  };

  const handleDismiss = async () => {
    await AsyncStorage.setItem(
      'battery_helper_last_shown',
      Date.now().toString()
    );
    setShouldShow(false);
    if (onDismiss) {
      onDismiss();
    }
  };

  const openManufacturerGuide = () => {
    // You could detect the manufacturer and provide specific instructions
    Alert.alert(
      i18n[language].deviceSpecificInstructions,
      i18n[language].deviceInstructionsText,
      [{ text: i18n[language].gotIt, style: 'default' }]
    );
  };

  // Don't render if platform is not Android or if not visible/should show
  if (Platform.OS !== 'android' || (!visible && !shouldShow)) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <ThemedText style={styles.title}>
          📱 {i18n[language].improveNotificationDelivery}
        </ThemedText>

        <ThemedText style={styles.description}>
          {i18n[language].batteryOptimizationDescription}
        </ThemedText>

        <View style={styles.buttonContainer}>
          <Button
            title={i18n[language].openSettings}
            onPress={handleOpenSettings}
            buttonStyle={[styles.button, styles.primaryButton]}
            titleStyle={styles.buttonText}
          />

          <Button
            title={i18n[language].deviceGuide}
            onPress={openManufacturerGuide}
            buttonStyle={[styles.button, styles.secondaryButton]}
            titleStyle={[styles.buttonText, styles.secondaryButtonText]}
          />
        </View>

        <Button
          title={i18n[language].dismiss}
          onPress={handleDismiss}
          buttonStyle={styles.dismissButton}
          titleStyle={styles.dismissButtonText}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    margin: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
    color: '#333',
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 20,
    color: '#666',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 12,
  },
  button: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 12,
  },
  primaryButton: {
    backgroundColor: '#005678',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#005678',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: '#005678',
  },
  dismissButton: {
    backgroundColor: 'transparent',
    paddingVertical: 8,
  },
  dismissButtonText: {
    color: '#999',
    fontSize: 12,
  },
});

export default BatteryOptimizationHelper;
export type { BatteryOptimizationHelperProps };
