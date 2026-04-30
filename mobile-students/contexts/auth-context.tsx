import React, { createContext, useContext, useEffect, useState } from "react";
import { loginStudentWithTemporaryPassword } from "@/services/student-auth";
import {
  clearSession,
  loadSession,
  saveSession,
} from "@/services/secure-store";
import type { StudentUser } from "@/types/auth";

interface AuthContextType {
  user: StudentUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  isSignedIn: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  restoreToken: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<StudentUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore token on app startup
  const restoreToken = async () => {
    try {
      setIsLoading(true);
      const session = await loadSession();

      if (session) {
        setAccessToken(session.accessToken);
        setRefreshToken(session.refreshToken);
        setUser(session.user);
      }
    } catch (error) {
      console.error("Error restoring token:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Restore token on mount
  useEffect(() => {
    restoreToken();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const response = await loginStudentWithTemporaryPassword(email, password);

      await saveSession({
        accessToken: response.access_token,
        refreshToken: response.refresh_token,
        user: response.user,
      });

      setAccessToken(response.access_token);
      setRefreshToken(response.refresh_token);
      setUser(response.user);
    } catch (error) {
      console.error("Sign in error:", error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await clearSession();

      setAccessToken(null);
      setRefreshToken(null);
      setUser(null);
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  const value: AuthContextType = {
    user,
    accessToken,
    refreshToken,
    isLoading,
    isSignedIn: !!accessToken && !!user,
    signIn,
    signOut,
    restoreToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
