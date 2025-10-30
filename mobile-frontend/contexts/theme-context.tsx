import React, { createContext, useContext } from 'react';

export const ThemeModeContext = createContext({
  themeMode: 'light',
  setThemeMode: (mode: 'light' | 'dark') => {},
});

export const useThemeModeContext = () => useContext(ThemeModeContext);
