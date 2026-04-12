import { useState } from 'react';
import { useRouter } from 'expo-router';
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function SignInScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';

  const palette = {
    inputBg: colorScheme === 'dark' ? '#151718' : '#f8f9fa',
    inputBorder: colorScheme === 'dark' ? '#374151' : '#D1D5DB',
    primary: '#4285F4',
    muted: colorScheme === 'dark' ? '#9CA3AF' : '#6B7280',
  };

  const handleEmailLogin = () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Fill all fields', 'Please enter your email and password.');
      return;
    }

    Alert.alert('Prototype', 'Email login is UI-only for now.', [
      { text: 'OK', onPress: () => router.replace('/(tabs)') },
    ]);
  };

  const handleGoogleLogin = () => {
    Alert.alert('Prototype', 'Google login is UI-only for now.', [
      { text: 'OK', onPress: () => router.replace('/(tabs)') },
    ]);
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <ThemedView style={styles.screen}>
        <SafeAreaView style={styles.safeArea}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.safeArea}
          >
            <View style={styles.headerBlock}>
              <ThemedText style={styles.title}>Welcome,{"\n"}Student</ThemedText>
            </View>

            <View style={styles.inputBlock}>
              <ThemedText style={styles.label}>Gmail</ThemedText>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="student@gmail.com"
                placeholderTextColor={palette.muted}
                style={[
                  styles.input,
                  { backgroundColor: palette.inputBg, borderColor: palette.inputBorder },
                ]}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputBlock}>
              <ThemedText style={styles.label}>Password</ThemedText>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Enter password"
                placeholderTextColor={palette.muted}
                style={[
                  styles.input,
                  { backgroundColor: palette.inputBg, borderColor: palette.inputBorder },
                ]}
                secureTextEntry
              />
            </View>

            <Pressable
              style={[styles.primaryButton, { backgroundColor: palette.primary }]}
              onPress={handleEmailLogin}
            >
              <ThemedText style={styles.primaryButtonText}>Sign in</ThemedText>
            </Pressable>

            <Pressable
              style={[styles.googleButton, { borderColor: palette.inputBorder }]}
              onPress={handleGoogleLogin}
            >
              <Ionicons name="logo-google" size={20} color={Colors[colorScheme].text} />
              <ThemedText style={styles.googleButtonText}>Sign in with Google</ThemedText>
            </Pressable>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </ThemedView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    padding: 12,
  },
  headerBlock: {
    marginTop: 28,
    marginBottom: 60,
  },
  title: {
    fontWeight: '600',
    fontSize: 40,
    lineHeight: 48,
    includeFontPadding: false,
  },
  inputBlock: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  input: {
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 16,
  },
  primaryButton: {
    marginTop: 24,
    padding: 16,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  googleButton: {
    marginTop: 12,
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});