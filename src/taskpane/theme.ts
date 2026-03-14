/**
 * GameData Studio Design Tokens
 *
 * Three themes: light (default), dark, game (RPG style)
 */

import { createLightTheme, createDarkTheme, type BrandVariants } from '@fluentui/react-components';

// --- Brand Palette (Cyan) ---
const gdsBrand: BrandVariants = {
  10: '#001F26',
  20: '#00333D',
  30: '#004D5C',
  40: '#00677A',
  50: '#007A91',
  60: '#0891B2',
  70: '#0EA5C9',
  80: '#22D3EE',
  90: '#67E8F9',
  100: '#A5F3FC',
  110: '#CFFAFE',
  120: '#E0FCFF',
  130: '#F0FDFF',
  140: '#F8FFFE',
  150: '#FCFFFE',
  160: '#FFFFFF',
};

// --- Fluent Custom Themes ---
export const gdsLightTheme = {
  ...createLightTheme(gdsBrand),
};

export const gdsDarkTheme = {
  ...createDarkTheme(gdsBrand),
};

// Game theme: deep purple base with neon overrides
export const gdsGameTheme = {
  ...createDarkTheme(gdsBrand),
  colorNeutralBackground1: '#1A1530',
  colorNeutralBackground2: '#0D0B1A',
  colorNeutralBackground3: '#241E3A',
  colorNeutralBackground6: '#2D2550',
  colorNeutralForeground1: '#E0E0FF',
  colorNeutralForeground2: '#B0B0D0',
  colorNeutralForeground3: '#7A7A9E',
  colorNeutralForeground4: '#5A5A7E',
  colorNeutralStroke1: '#3D2E6B',
  colorNeutralStroke2: '#2E2450',
  colorNeutralStroke3: '#241E3A',
  colorBrandBackground: '#00F0FF',
  colorBrandForeground1: '#00F0FF',
  colorBrandForeground2: '#BF5AF2',
  colorNeutralForegroundOnBrand: '#0D0B1A',
  colorPaletteGreenForeground1: '#00FF88',
  colorPaletteRedForeground1: '#FF4466',
  colorPaletteRedBackground1: '#2A0015',
};

// Cute theme: soft pink base
const cuteBrand: BrandVariants = {
  10: '#2D0A1E',
  20: '#4A1230',
  30: '#6B1A45',
  40: '#8C225A',
  50: '#AD2A70',
  60: '#E91E8C',
  70: '#F06AB0',
  80: '#F48CC8',
  90: '#F8AED9',
  100: '#FBC8E5',
  110: '#FDE0F0',
  120: '#FEF0F7',
  130: '#FFF5FB',
  140: '#FFFAFD',
  150: '#FFFCFE',
  160: '#FFFFFF',
};

export const gdsCuteTheme = {
  ...createLightTheme(cuteBrand),
  colorNeutralBackground1: '#FFFFFF',
  colorNeutralBackground2: '#FFF5F9',
  colorNeutralBackground3: '#FFE8F0',
  colorNeutralForeground1: '#4A2040',
  colorNeutralForeground2: '#7A4068',
  colorNeutralForeground3: '#AA7098',
  colorNeutralStroke1: '#F0C0D8',
  colorNeutralStroke2: '#F8D8E8',
  colorNeutralStroke3: '#FCE8F0',
  colorBrandBackground: '#E91E8C',
  colorBrandForeground1: '#E91E8C',
  colorPaletteGreenForeground1: '#2E9E5A',
  colorPaletteRedForeground1: '#D94080',
};

// Cyberpunk theme: dark base with neon pink/blue/green
const cyberBrand: BrandVariants = {
  10: '#0A0A12',
  20: '#12121F',
  30: '#1A1A2E',
  40: '#22223D',
  50: '#2A2A4C',
  60: '#FF2D95',
  70: '#FF4DA8',
  80: '#FF6DBB',
  90: '#FF8DCD',
  100: '#FFADE0',
  110: '#FFCDE9',
  120: '#FFE0F2',
  130: '#FFF0F8',
  140: '#FFF5FB',
  150: '#FFFAFE',
  160: '#FFFFFF',
};

export const gdsCyberTheme = {
  ...createDarkTheme(cyberBrand),
  colorNeutralBackground1: '#0F0F1A',
  colorNeutralBackground2: '#0A0A12',
  colorNeutralBackground3: '#1A1A2E',
  colorNeutralBackground6: '#1E1E35',
  colorNeutralForeground1: '#E0E0F0',
  colorNeutralForeground2: '#B0B0CC',
  colorNeutralForeground3: '#7A7A99',
  colorNeutralForeground4: '#5A5A77',
  colorNeutralStroke1: '#2A2A4C',
  colorNeutralStroke2: '#1E1E35',
  colorNeutralStroke3: '#1A1A2E',
  colorBrandBackground: '#FF2D95',
  colorBrandForeground1: '#FF2D95',
  colorBrandForeground2: '#00D4FF',
  colorNeutralForegroundOnBrand: '#0A0A12',
  colorPaletteGreenForeground1: '#ADFF2F',
  colorPaletteRedForeground1: '#FF2D95',
  colorPaletteRedBackground1: '#1A0010',
};

// --- Semantic Color Tokens ---
export const gdsTokens = {
  banner: {
    gradient: 'linear-gradient(135deg, #0891B2 0%, #0E7490 40%, #155E75 100%)',
    shimmer: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.04) 45%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 55%, transparent 100%)',
    iconColor: 'rgba(255,255,255,0.65)',
    dotColor: 'rgba(255,255,255,0.25)',
  },

  success: {
    bg: '#E6F9F0',
    bgDark: '#064E3B',
    border: '#A7F3D0',
    text: '#059669',
    textDark: '#34D399',
    icon: '#059669',
  },

  warning: {
    bg: '#FFF8E1',
    bgDark: '#78350F',
    border: '#FFE082',
    text: '#9D5D00',
    textDark: '#FBBF24',
    icon: '#D97706',
    itemText: '#6B4000',
  },

  error: {
    bg: '#FFF5F5',
    bgDark: '#7F1D1D',
    border: '#FFCDD2',
    text: '#DC2626',
    textDark: '#F87171',
    icon: '#DC2626',
  },

  info: {
    bg: '#E8F4FD',
    bgDark: '#1E3A5F',
    border: '#B3D9F2',
    text: '#2563EB',
    textDark: '#60A5FA',
    icon: '#2563EB',
  },

  accent: {
    light: '#7C3AED',
    dark: '#A78BFA',
    muted: '#EDE9FE',
  },

  fontMono: '"JetBrains Mono", "Cascadia Code", "Fira Code", Consolas, monospace',
  fontSerif: 'Georgia, "Times New Roman", serif',

  shadow: {
    sm: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)',
    md: '0 4px 6px rgba(0,0,0,0.07)',
  },

  badge: {
    error: { bg: '#FDE7E9', text: '#DC2626' },
    warning: { bg: '#FFF4CE', text: '#9D5D00' },
    info: { bg: '#E8F4FD', text: '#2563EB' },
    success: { bg: '#E6F9F0', text: '#059669' },
    secondary: { bg: '#F1F5F9', text: '#64748B' },
    new: { bg: '#E8F5FE', text: '#0891B2' },
  },

  // --- Game Theme Extras ---
  game: {
    bg: '#0D0B1A',
    surface: '#1A1530',
    surfaceGlow: '#241E3A',
    neonCyan: '#00F0FF',
    neonPurple: '#BF5AF2',
    neonGreen: '#00FF88',
    neonOrange: '#FF8C00',
    neonPink: '#FF4466',
    neonGold: '#FFD700',
    textPrimary: '#E0E0FF',
    textSecondary: '#B0B0D0',
    textMuted: '#7A7A9E',
    border: '#3D2E6B',
    borderGlow: '0 0 8px rgba(191,90,242,0.3)',
    cardBg: '#1A1530',
    cardBorder: '1px solid #3D2E6B',
    cardShadow: '0 0 12px rgba(191,90,242,0.15), 0 2px 8px rgba(0,0,0,0.3)',
    banner: 'linear-gradient(135deg, #7C3AED 0%, #06B6D4 100%)',
    progressGradient: 'linear-gradient(90deg, #A855F7, #06B6D4)',
    xpTrackBg: '#2D2550',
    xpBarBg: '#1A143280',
    xpBarBorder: '1px solid #A855F750',
    xpColor: '#FFD700',
    xpAccent: '#06B6D4',
    xpCyan: '#06B6D4',
    xpPurple: '#A855F7',
    tabIndicator: '#A855F7',
  },

  // --- Cute Theme Extras ---
  cute: {
    bg: '#FFF5F9',
    surface: '#FFFFFF',
    cardBg: '#FFFFFF',
    cardBorder: '1px solid #F0C0D8',
    cardShadow: 'none',
    banner: 'linear-gradient(135deg, #F48CC8 0%, #C850A0 50%, #A855F7 100%)',
    progressGradient: 'linear-gradient(90deg, #F472B6, #E91E8C)',
    xpTrackBg: '#FCE4EC',
    xpBarBg: '#FFF0F5',
    xpBarBorder: '1px solid #F8BBD0',
    xpColor: '#E91E8C',
    xpAccent: '#F48CC8',
    textPrimary: '#4A2040',
    textMuted: '#AA7098',
  },
  // --- Cyberpunk Theme Extras ---
  cyber: {
    bg: '#0A0A12',
    surface: '#0F0F1A',
    cardBg: '#0F0F1A',
    cardBorder: '1px solid #2A2A4C',
    cardShadow: '0 0 12px rgba(255,45,149,0.1), 0 2px 8px rgba(0,0,0,0.3)',
    banner: 'linear-gradient(135deg, #FF2D95 0%, #00D4FF 100%)',
    progressGradient: 'linear-gradient(90deg, #FF2D95, #00D4FF)',
    xpTrackBg: '#1E1E35',
    xpBarBg: '#0F0F1A80',
    xpBarBorder: '1px solid #FF2D9550',
    xpColor: '#ADFF2F',
    xpAccent: '#00D4FF',
    textPrimary: '#E0E0F0',
    textMuted: '#7A7A99',
  },
} as const;

// 文本字典已迁移至 src/taskpane/locales/
// 使用方式: import { useThemeText } from './locales';
//           const t = useThemeText();
//           t.tabExport, t.export.exportBtn, etc.
