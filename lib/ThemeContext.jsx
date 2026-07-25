import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, StyleSheet, useColorScheme, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { darkColors, lightColors } from './theme';

const STORAGE_KEY = 'venn_theme_mode';

// 'system' follows the OS; 'light'/'dark' pin it regardless.
const ThemeContext = createContext({
  mode: 'system',
  scheme: 'light',
  colors: lightColors,
  isDark: false,
  setMode: () => {},
});

export function ThemeProvider({ children }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState('system');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => {
        if (saved === 'light' || saved === 'dark' || saved === 'system') {
          setModeState(saved);
        }
      })
      .catch(() => {});
  }, []);

  const scheme = mode === 'system' ? (systemScheme ?? 'light') : mode;

  // Flash-mask a theme switch so the recolor reads as a crossfade instead of
  // an instant snap. Lives here (the app root, above the Stack/Tabs) rather
  // than on the screen that owns the toggle — the floating tab bar renders
  // as a sibling of screen content, so a screen-local overlay never covered
  // it and it visibly recolored a beat later than the rest of the page.
  const flashAnim = useRef(new Animated.Value(0)).current;
  const [flashColor, setFlashColor] = useState(null);

  const setMode = (next) => {
    const nextScheme = next === 'system' ? (systemScheme ?? 'light') : next;

    if (nextScheme === scheme) {
      // No visible recolor (e.g. picking 'system' while it already matches
      // the current scheme) — skip the flash.
      setModeState(next);
      AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
      return;
    }

    setFlashColor(nextScheme === 'dark' ? darkColors.canvas : lightColors.canvas);
    Animated.timing(flashAnim, { toValue: 1, duration: 150, useNativeDriver: true }).start(() => {
      setModeState(next);
      AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
      Animated.timing(flashAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start();
    });
  };

  const value = useMemo(() => ({
    mode,
    scheme,
    isDark: scheme === 'dark',
    colors: scheme === 'dark' ? darkColors : lightColors,
    setMode,
  }), [mode, scheme]);

  return (
    <ThemeContext.Provider value={value}>
      <View style={{ flex: 1 }}>
        {children}
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: flashColor || value.colors.canvas, opacity: flashAnim, zIndex: 999, elevation: 999 },
          ]}
        />
      </View>
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);

/**
 * Builds a StyleSheet from the active palette and memoises it per theme.
 * Screens call this instead of a module-level StyleSheet.create, which would
 * snapshot colours at import time and never respond to a theme change.
 */
export function useThemedStyles(factory) {
  const { colors } = useTheme();
  return useMemo(() => factory(colors), [colors, factory]);
}
