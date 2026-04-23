/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

const tintColorLight = '#3B81F6';
const tintColorDark = '#1A4AAC';

export const Colors = {
  light: {
    text: '#11181C',
    background: '#fff',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
  },
};

// ── Semantic color constants ─────────────────────────────
// Use these instead of hardcoded hex values throughout the app.
//
// Usage:
//   import { colors } from '@/constants/Colors';
//   style={{ backgroundColor: colors.success }}

export const colors = {
  /** Green — success states, confirmations, met requirements */
  success: '#059669',
  /** Red — errors, destructive actions, unmet requirements */
  error: '#DC2626',
  /** Blue — primary actions, buttons, links */
  primary: '#4285F4',
  /** Light-mode tint / header background */
  tintLight: tintColorLight,
  /** Dark-mode tint / header background */
  tintDark: tintColorDark,

  // ── Neutral palette ──────────────────────────────────
  /** Placeholder text (light mode) */
  gray500: '#6B7280',
  /** Placeholder text (dark mode), disabled text */
  gray400: '#9CA3AF',
  /** Borders (light mode) */
  gray300: '#D1D5DB',
  /** Dividers, subtle backgrounds (light mode) */
  gray200: '#E5E7EB',
  /** Card backgrounds (dark mode), dark borders */
  gray700: '#374151',
  /** Subtle background (light mode) */
  gray50: '#f8f9fa',
} as const;

/** Pick header/tint background color by theme mode */
export const headerBg = (mode: 'light' | 'dark') =>
  mode === 'dark' ? colors.tintDark : colors.tintLight;
