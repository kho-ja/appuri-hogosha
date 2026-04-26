import { StyleSheet, Pressable } from "react-native";
import { useRouter } from "expo-router";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors } from "@/constants/theme";
import { useAuth } from "@/contexts/auth-context";

export default function SettingsScreen() {
  const router = useRouter();
  const { signOut } = useAuth();
  const colorScheme = useColorScheme() ?? "light";
  const backgroundColor = Colors[colorScheme].background;
  const errorColor = "#DC2626";

  const handleLogout = async () => {
    await signOut();
    router.replace("/sign-in");
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor }]}>
      <Pressable
        style={[styles.logoutButton, { backgroundColor: errorColor }]}
        onPress={handleLogout}
      >
        <ThemedText style={styles.logoutButtonText}>Log out</ThemedText>
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    justifyContent: "flex-end",
    paddingBottom: 32,
  },
  logoutButton: {
    padding: 16,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  logoutButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
