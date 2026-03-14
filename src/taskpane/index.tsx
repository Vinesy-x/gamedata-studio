/* global Office */

import { createContext, useState, useCallback, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { FluentProvider } from '@fluentui/react-components';
import { App } from './App';
import { gdsLightTheme, gdsDarkTheme, gdsGameTheme, gdsCuteTheme } from './theme';

export type ThemeMode = 'light' | 'dark' | 'game' | 'cute';

const THEME_ORDER: ThemeMode[] = ['light', 'dark', 'game', 'cute'];

const themeMap = {
  light: gdsLightTheme,
  dark: gdsDarkTheme,
  game: gdsGameTheme,
  cute: gdsCuteTheme,
} as const;

export const ThemeContext = createContext<{
  mode: ThemeMode;
  toggle: () => void;
}>({ mode: 'light', toggle: () => {} });

const STORAGE_KEY = 'gds-theme';

function Root() {
  const [mode, setMode] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as ThemeMode;
      if (THEME_ORDER.includes(saved)) return saved;
    } catch { /* ignore */ }
    return 'light';
  });

  const toggle = useCallback(() => {
    setMode((prev) => {
      const idx = THEME_ORDER.indexOf(prev);
      const next = THEME_ORDER[(idx + 1) % THEME_ORDER.length];
      try { localStorage.setItem(STORAGE_KEY, next); } catch { /* ignore */ }
      return next;
    });
  }, []);

  const ctx = useMemo(() => ({ mode, toggle }), [mode, toggle]);

  return (
    <ThemeContext.Provider value={ctx}>
      <FluentProvider theme={themeMap[mode]}>
        <App />
      </FluentProvider>
    </ThemeContext.Provider>
  );
}

Office.onReady(() => {
  const root = createRoot(document.getElementById('root')!);
  root.render(<Root />);
});
