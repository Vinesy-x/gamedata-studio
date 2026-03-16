/* global Office */

import { createContext, useState, useCallback, useMemo, useEffect } from 'react';
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

// 各主题的滚动条配色（track / thumb）
const scrollbarColors: Record<ThemeMode, { track: string; thumb: string; thumbHover: string }> = {
  light: { track: '#f5f5f5', thumb: '#c0c0c0', thumbHover: '#a0a0a0' },
  dark:  { track: '#1a1a1a', thumb: '#444444', thumbHover: '#555555' },
  game:  { track: '#0D0B1A', thumb: '#3D2E6B', thumbHover: '#5A4A8A' },
  cute:  { track: '#FFF5F9', thumb: '#F0C0D8', thumbHover: '#E8A0C8' },
  cyber: { track: '#0A0A12', thumb: '#2A2A4C', thumbHover: '#3A3A5C' },
  pixel: { track: '#050505', thumb: '#1E3A1E', thumbHover: '#2E4A2E' },
};

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
  { mode: 'pixel', icon: '8B', label: '像素冒险', desc: '像素RPG风格', gradient: 'linear-gradient(135deg, #39FF14, #FFB000)' },
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

  const ctx = useMemo(() => ({ mode: mode || 'light', toggle, setMode }), [mode, toggle, setMode]);

  // 根据主题动态注入滚动条样式
  useEffect(() => {
    const m = mode || 'light';
    const sc = scrollbarColors[m];
    const id = 'gds-scrollbar-style';
    let style = document.getElementById(id) as HTMLStyleElement | null;
    if (!style) {
      style = document.createElement('style');
      style.id = id;
      document.head.appendChild(style);
    }
    style.textContent = `
      ::-webkit-scrollbar { width: 6px; height: 6px; }
      ::-webkit-scrollbar-track { background: ${sc.track}; }
      ::-webkit-scrollbar-thumb { background: ${sc.thumb}; border-radius: 3px; }
      ::-webkit-scrollbar-thumb:hover { background: ${sc.thumbHover}; }
    `;
  }, [mode]);

  // 首次访问 → 显示主题选择
  if (mode === null) {
    return <ThemePicker onSelect={setMode} />;
  }

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
