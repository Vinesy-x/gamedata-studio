/* global Office */

import { createContext, useState, useCallback, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { FluentProvider } from '@fluentui/react-components';
import { App } from './App';
import { gdsLightTheme, gdsDarkTheme, gdsGameTheme, gdsCuteTheme, gdsCyberTheme, gdsPixelTheme } from './theme';

export type ThemeMode = 'light' | 'dark' | 'game' | 'cute' | 'cyber' | 'pixel';

const THEME_ORDER: ThemeMode[] = ['light', 'dark', 'game', 'cute', 'cyber', 'pixel'];

const themeMap = {
  light: gdsLightTheme,
  dark: gdsDarkTheme,
  game: gdsGameTheme,
  cute: gdsCuteTheme,
  cyber: gdsCyberTheme,
  pixel: gdsPixelTheme,
} as const;

export const ThemeContext = createContext<{
  mode: ThemeMode;
  toggle: () => void;
  setMode: (mode: ThemeMode) => void;
}>({ mode: 'light', toggle: () => {}, setMode: () => {} });

const STORAGE_KEY = 'gds-theme';

const THEME_OPTIONS: { mode: ThemeMode; icon: string; label: string; desc: string; gradient: string }[] = [
  { mode: 'light', icon: '☀', label: '经典浅色', desc: '简洁专业', gradient: 'linear-gradient(135deg, #f8fafc, #e2e8f0)' },
  { mode: 'dark', icon: '🌙', label: '经典深色', desc: '护眼暗色', gradient: 'linear-gradient(135deg, #1e293b, #0f172a)' },
  { mode: 'game', icon: '🚀', label: '飞船航行', desc: '星际冒险风格', gradient: 'linear-gradient(135deg, #7C3AED, #06B6D4)' },
  { mode: 'cute', icon: '♡', label: '二次元冒险', desc: '可爱粉色风格', gradient: 'linear-gradient(135deg, #F48CC8, #A855F7)' },
  { mode: 'cyber', icon: '//>', label: '赛博朋克', desc: '霓虹暗夜风格', gradient: 'linear-gradient(135deg, #FF2D95, #00D4FF)' },
  { mode: 'pixel', icon: '8B', label: '像素复古', desc: '终端绿+琥珀黄', gradient: 'linear-gradient(135deg, #39FF14, #FFB000)' },
];

function ThemePicker({ onSelect }: { onSelect: (mode: ThemeMode) => void }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      padding: '20px',
      background: 'linear-gradient(180deg, #f8fafc 0%, #e2e8f0 100%)',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4, color: '#0f172a' }}>
        GameData Studio
      </div>
      <div style={{ fontSize: 12, color: '#64748b', marginBottom: 20 }}>
        选择你喜欢的主题风格
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 260 }}>
        {THEME_OPTIONS.map((opt) => (
          <button
            key={opt.mode}
            onClick={() => onSelect(opt.mode)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '12px 14px',
              border: '1px solid #e2e8f0',
              borderRadius: 10,
              background: '#fff',
              cursor: 'pointer',
              transition: 'all 0.15s',
              textAlign: 'left',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#94a3b8';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#e2e8f0';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <div style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: opt.gradient,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 16,
              flexShrink: 0,
            }}>
              {opt.icon}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{opt.label}</div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>{opt.desc}</div>
            </div>
          </button>
        ))}
      </div>
      <div style={{ fontSize: 10, color: '#cbd5e1', marginTop: 16 }}>
        随时可在底部切换主题
      </div>
    </div>
  );
}

function Root() {
  const [mode, setModeState] = useState<ThemeMode | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as ThemeMode;
      if (THEME_ORDER.includes(saved)) return saved;
    } catch { /* ignore */ }
    return null; // 首次访问
  });

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    try { localStorage.setItem(STORAGE_KEY, next); } catch { /* ignore */ }
  }, []);

  const toggle = useCallback(() => {
    setModeState((prev) => {
      const idx = THEME_ORDER.indexOf(prev || 'light');
      const next = THEME_ORDER[(idx + 1) % THEME_ORDER.length];
      try { localStorage.setItem(STORAGE_KEY, next); } catch { /* ignore */ }
      return next;
    });
  }, []);

  // 首次访问 → 显示主题选择
  if (mode === null) {
    return <ThemePicker onSelect={setMode} />;
  }

  const ctx = useMemo(() => ({ mode, toggle, setMode }), [mode, toggle, setMode]);

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
