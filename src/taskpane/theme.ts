/**
 * GameData Studio Design Tokens
 *
 * Centralized color tokens for consistent theming across components.
 * Based on PDS (Pencil Design System) with cyan primary + purple accent.
 *
 * Usage:
 *   import { gdsTokens } from '../theme';
 *   backgroundColor: gdsTokens.warning.bg,
 */

import { createLightTheme, createDarkTheme, type BrandVariants } from '@fluentui/react-components';

// --- Brand Palette (Cyan) ---
const gdsBrand: BrandVariants = {
  10: '#001F26',
  20: '#00333D',
  30: '#004D5C',
  40: '#00677A',
  50: '#007A91',
  60: '#0891B2',  // primary light
  70: '#0EA5C9',
  80: '#22D3EE',  // primary dark
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

// --- Semantic Color Tokens ---
export const gdsTokens = {
  // Banner gradient
  banner: {
    gradient: 'linear-gradient(135deg, #0891B2 0%, #0E7490 40%, #155E75 100%)',
    shimmer: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.04) 45%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 55%, transparent 100%)',
    iconColor: 'rgba(255,255,255,0.65)',
    dotColor: 'rgba(255,255,255,0.25)',
  },

  // Semantic: Success
  success: {
    bg: '#E6F9F0',
    bgDark: '#064E3B',
    border: '#A7F3D0',
    text: '#059669',
    textDark: '#34D399',
    icon: '#059669',
  },

  // Semantic: Warning
  warning: {
    bg: '#FFF8E1',
    bgDark: '#78350F',
    border: '#FFE082',
    text: '#9D5D00',
    textDark: '#FBBF24',
    icon: '#D97706',
    itemText: '#6B4000',
  },

  // Semantic: Error
  error: {
    bg: '#FFF5F5',
    bgDark: '#7F1D1D',
    border: '#FFCDD2',
    text: '#DC2626',
    textDark: '#F87171',
    icon: '#DC2626',
  },

  // Semantic: Info
  info: {
    bg: '#E8F4FD',
    bgDark: '#1E3A5F',
    border: '#B3D9F2',
    text: '#2563EB',
    textDark: '#60A5FA',
    icon: '#2563EB',
  },

  // Accent (Purple)
  accent: {
    light: '#7C3AED',
    dark: '#A78BFA',
    muted: '#EDE9FE',
  },

  // Fonts
  fontMono: '"JetBrains Mono", "Cascadia Code", "Fira Code", Consolas, monospace',
  fontSerif: 'Georgia, "Times New Roman", serif',

  // Card shadows
  shadow: {
    sm: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)',
    md: '0 4px 6px rgba(0,0,0,0.07)',
  },

  // Badge colors (for validation results)
  badge: {
    error: { bg: '#FDE7E9', text: '#DC2626' },
    warning: { bg: '#FFF4CE', text: '#9D5D00' },
    info: { bg: '#E8F4FD', text: '#2563EB' },
    success: { bg: '#E6F9F0', text: '#059669' },
    secondary: { bg: '#F1F5F9', text: '#64748B' },
    new: { bg: '#E8F5FE', text: '#0891B2' },
  },
} as const;
