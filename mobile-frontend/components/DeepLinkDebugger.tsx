import React, { useState, useEffect } from 'react';
import { View, Alert, Platform } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { Button } from '@rneui/themed';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import Constants from 'expo-constants';

// Add this component to any screen for testing deep links
export const DeepLinkDebugger: React.FC = () => {
  const [expoUrl, setExpoUrl] = useState<string>('');

  useEffect(() => {
    // Get the current Expo development URL
    const url = Constants.linkingUri;
    setExpoUrl(url);
    console.log('Expo linking URL:', url);
  }, []);

  const getTestLinks = () => {
    const isExpoGo = Constants.appOwnership === 'expo';

    if (isExpoGo && expoUrl) {
      // For Expo Go, use the development URL format
      const baseUrl = expoUrl.replace('exp://', '').replace(':/', '://');
      return [
        {
          name: 'Home (Expo Go)',
          url: `exp://${baseUrl}--/`,
          path: '/',
        },
        {
          name: 'Student 1 (Expo Go)',
          url: `exp://${baseUrl}--/student/1`,
          path: '/student/1',
        },
        {
          name: 'Message 123 (Expo Go)',
          url: `exp://${baseUrl}--/message/123`,
          path: '/message/123',
        },
      ];
    } else {
      // For standalone builds
      return [
        {
          name: 'Home',
          url: 'jduapp:///',
          path: '/',
        },
        {
          name: 'Student 1',
          url: 'jduapp://student/1',
          path: '/student/1',
        },
        {
          name: 'Message 123',
          url: 'jduapp://message/123',
          path: '/message/123',
        },
        {
          name: 'HTTPS Universal Link',
          url: 'https://appuri-hogosha.vercel.app/parentnotification/student/1',
          path: '/student/1',
        },
      ];
    }
  };

  const testDeepLink = async (url: string, path: string) => {
    try {
      console.log(`Testing: ${url}`);

      let command = '';
      if (Platform.OS === 'android') {
        if (Constants.appOwnership === 'expo') {
          command = `adb shell am start -a android.intent.action.VIEW -d "${url}" host.exp.exponent`;
        } else {
          command = `adb shell am start -a android.intent.action.VIEW -d "${url}" com.jduapp.parentnotification`;
        }
      } else {
        command = `xcrun simctl openurl booted "${url}"`;
      }

      Alert.alert('Test Deep Link', `External test command:\n\n${command}`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Navigate Directly',
          onPress: () => router.push(path as any),
        },
        {
          text: 'Copy Command',
          onPress: () => {
            // You could use clipboard here if needed
            console.log('Command to copy:', command);
          },
        },
      ]);
    } catch (error) {
      console.error('Deep link test error:', error);
      Alert.alert('Error', `Failed to test deep link: ${error}`);
    }
  };

  const getCurrentURL = async () => {
    try {
      const url = await Linking.getInitialURL();
      Alert.alert('Current URL', url || 'No initial URL');
      console.log('Current initial URL:', url);
    } catch (error) {
      Alert.alert('Error', `Failed to get URL: ${error}`);
    }
  };

  if (!__DEV__) {
    return null; // Only show in development
  }

  const testLinks = getTestLinks();
  const isExpoGo = Constants.appOwnership === 'expo';

  return (
    <View
      style={{
        padding: 20,
        backgroundColor: '#f0f0f0',
        margin: 10,
        borderRadius: 8,
      }}
    >
      <ThemedText
        style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 10 }}
      >
        🔗 Deep Link Debugger ({isExpoGo ? 'Expo Go' : 'Standalone'})
      </ThemedText>

      {isExpoGo && (
        <ThemedText style={{ fontSize: 12, marginBottom: 10, color: 'orange' }}>
          Running in Expo Go. Custom schemes won't work. Use exp:// URLs.
        </ThemedText>
      )}

      <ThemedText style={{ fontSize: 12, marginBottom: 10 }}>
        Expo URL: {expoUrl}
      </ThemedText>

      <Button
        title='Get Initial URL'
        onPress={getCurrentURL}
        buttonStyle={{ marginBottom: 10 }}
      />

      {testLinks.map((link, index) => (
        <Button
          key={index}
          title={`Test: ${link.name}`}
          onPress={() => testDeepLink(link.url, link.path)}
          buttonStyle={{ marginBottom: 5 }}
        />
      ))}

      <ThemedText style={{ fontSize: 12, marginTop: 10, opacity: 0.7 }}>
        {isExpoGo
          ? 'For Expo Go: Use the exp:// URLs shown in alerts'
          : 'For standalone: Use custom scheme or universal links'}
      </ThemedText>
    </View>
  );
};
