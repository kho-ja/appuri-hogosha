import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { initiateStudentLogin } from "@/services/student-auth";
import { useAuth } from "@/contexts/auth-context";
import { Ionicons } from '@expo/vector-icons';

export default function SignInScreen() {
  const [step, setStep] = useState<"email" | "password">("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, isSignedIn, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (!isAuthLoading && isSignedIn) {
      router.replace("/(tabs)/(home)");
    }
  }, [isAuthLoading, isSignedIn, router]);

  const colorScheme = useColorScheme() ?? "light";

  const palette = {
    inputBg: colorScheme === "dark" ? "#151718" : "#f8f9fa",
    inputBorder: colorScheme === "dark" ? "#374151" : "#D1D5DB",
    primary: "#2563EB",
    muted: colorScheme === "dark" ? "#9CA3AF" : "#6B7280",
    error: "#DC2626",
    info: "#2563EB",
  };

  const handleEmailNext = async () => {
    if (!email.trim()) {
      setError("Email kiriting");
      return;
    }

    try {
      console.log('[sign-in] Next pressed', {
        step,
        email: email.trim().toLowerCase(),
      });
      setIsLoading(true);
      setError("");
      setInfo("");

      const response = await initiateStudentLogin(email.trim().toLowerCase());
      console.log('[sign-in] login initiate success', response);
      setInfo(response.message || "Emailga temporary password yuborildi.");
      setStep("password");
    } catch (e: any) {
      console.error('[sign-in] login initiate failed', {
        message: e?.message,
        status: e?.status,
        name: e?.name,
        error: e,
      });
      setError(e?.message || "Email tekshirishda xatolik yuz berdi");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailLogin = async () => {
    if (!password.trim()) {
      setError("Temporary password kiriting");
      return;
    }

    try {
      console.log('[sign-in] Sign in pressed', {
        step,
        email: email.trim().toLowerCase(),
        hasPassword: !!password.trim(),
      });
      setIsLoading(true);
      setError("");

      await signIn(email.trim().toLowerCase(), password);

      console.log('[sign-in] login success, navigating home');

      router.replace("/(tabs)/(home)");
    } catch (e: any) {
      console.error('[sign-in] login failed', {
        message: e?.message,
        status: e?.status,
        name: e?.name,
        error: e,
      });
      setError(e?.message || "Login xatoligi");
    } finally {
      setIsLoading(false);
    }
  };

  //   const handleGoogleLogin = () => {
  //   router.replace('/(tabs)/(home)');
  // };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <ThemedView style={styles.screen}>
        <SafeAreaView style={styles.safeArea}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.safeArea}
          >
            <View style={styles.headerBlock}>
              <ThemedText style={styles.title}>
                Welcome,{"\n"}Student
              </ThemedText>
            </View>

             <Pressable
              style={[styles.googleButton, { backgroundColor: palette.inputBg, borderColor: palette.inputBorder }]}
              // onPress={handleGoogleLogin}
            >
              <Ionicons name="logo-google" size={20} color="#4285F4" />
              <ThemedText style={[styles.googleButtonText, { color: Colors[colorScheme].text }]}>Sign in with Google</ThemedText>
            </Pressable>

            <View style={[styles.divider, { borderTopColor: palette.inputBorder }]}>
              <View style={[styles.dividerDot, { backgroundColor: palette.inputBorder }]} />
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
                  {
                    backgroundColor: palette.inputBg,
                    borderColor: palette.inputBorder,
                  },
                ]}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={step === "email" && !isLoading}
              />
            </View>

            {step === "password" ? (
              <View style={styles.inputBlock}>
                <ThemedText style={styles.label}>Temporary password</ThemedText>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Emailga kelgan password"
                  placeholderTextColor={palette.muted}
                  style={[
                    styles.input,
                    {
                      backgroundColor: palette.inputBg,
                      borderColor: palette.inputBorder,
                    },
                  ]}
                  secureTextEntry
                  editable={!isLoading}
                />
              </View>
            ) : null}

            {info ? (
              <ThemedText
                style={[styles.feedbackText, { color: palette.info }]}
              >
                {info}
              </ThemedText>
            ) : null}

            {error ? (
              <ThemedText
                style={[styles.feedbackText, { color: palette.error }]}
              >
                {error}
              </ThemedText>
            ) : null}

            <Pressable
              style={[
                styles.primaryButton,
                { backgroundColor: palette.primary },
              ]}
              onPress={step === "email" ? handleEmailNext : handleEmailLogin}
              disabled={isLoading}
            >
              <ThemedText style={styles.primaryButtonText}>
                {isLoading
                  ? "Loading..."
                  : step === "email"
                    ? "Next"
                    : "Sign in"}
              </ThemedText>
            </Pressable>

            {step === "password" ? (
              <Pressable
                style={styles.secondaryButton}
                onPress={() => {
                  setStep("email");
                  setPassword("");
                  setError("");
                  setInfo("");
                  setEmail("");
                }}
                disabled={isLoading}
              >
                <ThemedText style={{ color: Colors[colorScheme].text }}>
                  Back
                </ThemedText>
              </Pressable>
            ) : null}
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
    fontWeight: "600",
    fontSize: 40,
    lineHeight: 48,
    includeFontPadding: false,
  },
  inputBlock: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
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
    justifyContent: "center",
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  feedbackText: {
    marginTop: 8,
    fontSize: 13,
  },
    googleButton: {
    marginTop: 12,
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
    dividerDot: {
    position: 'absolute',
    alignSelf: 'center',
    left: '50%',
    marginLeft: -6,
    width: 12,
    height: 12,
    borderRadius: 6,
  },
   divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
    borderTopWidth: 1,
    paddingHorizontal: 0,
  },
  secondaryButton: {
    marginTop: 12,
    alignItems: "center",
  },
});
