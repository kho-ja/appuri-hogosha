import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance } from 'react-native';

type ThemeMode = 'light' | 'dark';

interface ThemeModeContextProps {
  themeMode: ThemeMode;
  toggleTheme: () => void;
  setThemeMode: (mode: ThemeMode) => void;
}

const ThemeModeContext = createContext<ThemeModeContextProps | undefined>(
  undefined
);

export const ThemeModeProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [themeMode, setThemeMode] = useState<ThemeMode>('light');
  const storageKey = 'themeMode';

  // ✅ Load saved theme (or system default)
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const saved = await AsyncStorage.getItem(storageKey);
        if (saved === 'light' || saved === 'dark') {
          setThemeMode(saved);
        } else {
          // fallback: use system color scheme
          const system = Appearance.getColorScheme();
          setThemeMode(system === 'dark' ? 'dark' : 'light');
        }
      } catch (err) {
        console.warn('Failed to load theme:', err);
      }
    };
    loadTheme();
  }, []);

  // ✅ Save theme when changed
  useEffect(() => {
    AsyncStorage.setItem(storageKey, themeMode).catch(err =>
      console.warn('Failed to save theme:', err)
    );
  }, [themeMode]);

  const toggleTheme = () =>
    setThemeMode(prev => (prev === 'light' ? 'dark' : 'light'));

  return (
    <ThemeModeContext.Provider
      value={{
        themeMode,
        toggleTheme,
        setThemeMode,
      }}
    >
      {children}
    </ThemeModeContext.Provider>
  );
};

export const useThemeModeContext = (): ThemeModeContextProps => {
  const context = useContext(ThemeModeContext);
  if (!context) {
    throw new Error(
      'useThemeModeContext must be used within ThemeModeProvider'
    );
  }
  return context;
};
