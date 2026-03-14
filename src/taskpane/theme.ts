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
    xpCyan: '#06B6D4',
    xpPurple: '#A855F7',
    tabIndicator: '#A855F7',
  },
} as const;

// --- Game Text Mapping (飞船航行主题) ---
//
// 核心概念映射:
//   版本(version) → 航线    版本名 → 航线名    版本号 → 航线编号
//   线路(roads_X) → 航段    序列号 → 航班号
//   表(table)     → 设备    操作员 → 舰长
//   导出          → 发射    校验 → 维修    预览 → 试飞
//   Git           → 星际传送
//
export const gameText = {
  // Tab names
  tabExport: '发射',
  tabManage: '舰桥',
  tabValidate: '维修',
  tabPreview: '试飞',

  // ExportTab — 发射准备
  sectionTitle: '发射准备',
  exportBtn: '发射！',
  exportingBtn: '发射中...',
  gitBtn: '星际传送',
  resultSuccess: '航行成功！',
  resultFail: '发射失败',
  resultXp: (n: number) => `+${n} 航程`,
  statFiles: (n: number) => `${n} 个设备`,
  statWarnings: (n: number) => `${n} 个异常`,
  statErrors: (n: number) => `${n} 个故障`,
  levelLabel: (lv: number) => `LV.${lv}  星际领航员`,
  configLabels: {
    version: '航线',
    versionNumber: '航线编号',
    sequence: '航班号',
    operator: '舰长',
    monitor: '雷达监听',
    outputDir: '着陆坐标',
    noOutputDir: '点击设定着陆坐标',
    monitoring: '扫描中',
    monitorExporting: '协同发射中...',
    monitorOff: '雷达关闭',
  },

  // ManageTab — 舰桥
  manageSubNav: ['舰桥指挥', '设备库', '组装'] as const,
  manageLabels: {
    gitTemplate: '传送协议',
    staff: '船员编制',
    versionList: '航线列表',
    tableCount: (n: number) => `航线列表 (${n})`,
    colVersion: '航线名',
    colRoute: '航段',
    colGitDir: '传送坐标',
    syncRoutes: '同步航段',
    addVersion: '添加航线',
    tableList: '设备列表',
    tableListCount: (n: number) => `设备列表 (${n})`,
    addTable: '装载设备',
  },

  // ValidationPanel — 维修
  validationTitle: '维修日志',
  validationScope: ['当前设备', '全部设备'] as const,
  validationRun: '开始检修',
  validationRunning: '检修中...',
  validationProgress: (done: number, total: number) => `检修进度  ${done}/${total}`,
  validationXpTotal: (xp: number) => `总经验值: ${xp}`,
  ruleXp: [50, 75, 30, 40, 60, 25, 35] as const,
  validationEmpty: '选择设备和检修项后，点击「开始检修」',

  // PreviewPanel — 试飞
  previewTitle: '航线预览',
  previewBtn: (n: number) => `点火 (${n}台设备)`,
  previewRunning: '点火中...',
  previewColHeaders: ['设备名', '载荷', '状态'] as const,
  previewStats: '试飞报告',
  previewRank: 'S',
  previewEmpty: '选择航线后，点击「点火」开始试飞',
} as const;
