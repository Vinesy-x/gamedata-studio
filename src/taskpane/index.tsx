/* global Office */

import { createContext, useState, useCallback, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { FluentProvider, webLightTheme, webDarkTheme } from '@fluentui/react-components';
import { App } from './App';

type ThemeMode = 'light' | 'dark';

export const ThemeContext = createContext<{
  mode: ThemeMode;
  toggle: () => void;
}>({ mode: 'light', toggle: () => {} });

const STORAGE_KEY = 'gds-theme';

function Root() {
  const [mode, setMode] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'dark' || saved === 'light') return saved;
    } catch { /* ignore */ }
    return 'light';
  });

  const toggle = useCallback(() => {
    setMode((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      try { localStorage.setItem(STORAGE_KEY, next); } catch { /* ignore */ }
      return next;
    });
  }, []);

  const ctx = useMemo(() => ({ mode, toggle }), [mode, toggle]);

  return (
    <ThemeContext.Provider value={ctx}>
      <FluentProvider theme={mode === 'light' ? webLightTheme : webDarkTheme}>
        <App />
      </FluentProvider>
    </ThemeContext.Provider>
  );
}

Office.onReady(() => {
  const root = createRoot(document.getElementById('root')!);
  root.render(<Root />);
});
