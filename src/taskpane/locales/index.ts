import { useContext } from 'react';
import { ThemeContext } from '../index';
import type { ThemeTextMap } from './types';
import type { ThemeMode } from '../index';
import { defaultText } from './default';
import { spaceText } from './space';
import { cuteText } from './cute';
import { cyberText } from './cyber';
import { pixelText } from './pixel';

export type { ThemeTextMap };

/** 主题 → 文本字典映射。新增主题只需在此注册。 */
const textMap: Record<ThemeMode, ThemeTextMap> = {
  light: defaultText,
  dark: defaultText,
  game: spaceText,
  cute: cuteText,
  cyber: cyberText,
  pixel: pixelText,
};

/** 获取当前主题的文本字典。组件中直接 `const t = useThemeText()` 使用。 */
export function useThemeText(): ThemeTextMap {
  const { mode } = useContext(ThemeContext);
  return textMap[mode];
}

/**
 * 游戏主题专属数据（非文本，如经验值、等级等）。
 * 仅在 isGame 时使用，不属于通用文本字典。
 */
/** 特殊主题专属数据（非文本，如经验值、等级等）。按主题模式返回不同数据。 */
const DEFAULT_RULE_XP = [50, 75, 30, 40, 60, 25, 35] as const;

export const themeExtraData = {
  game: {
    ruleXp: DEFAULT_RULE_XP,
    levelLabel: (lv: number) => `LV.${lv}  星际领航员`,
    resultXp: (n: number) => `+${n} 航程`,
    xpTotal: (xp: number) => `总经验值: ${xp}`,
    progressLabel: (done: number, total: number) => `检修进度  ${done}/${total}`,
    previewRank: 'S',
  },
  cute: {
    ruleXp: DEFAULT_RULE_XP,
    levelLabel: (lv: number) => `Lv.${lv}  数据小精灵 ✿`,
    resultXp: (n: number) => `+${n} 经验`,
    xpTotal: (xp: number) => `总经验值: ${xp} ♡`,
    progressLabel: (done: number, total: number) => `任务进度 ✿  ${done}/${total}`,
    previewRank: 'S☆',
  },
  cyber: {
    ruleXp: DEFAULT_RULE_XP,
    levelLabel: (lv: number) => `LV.${lv}  DATA_HACKER`,
    resultXp: (n: number) => `+${n} EXP`,
    xpTotal: (xp: number) => `TOTAL_EXP: ${xp}`,
    progressLabel: (done: number, total: number) => `SCAN  ${done}/${total}`,
    previewRank: 'S+',
  },
  pixel: {
    ruleXp: DEFAULT_RULE_XP,
    levelLabel: (lv: number) => `LV.${lv}  像素勇者`,
    resultXp: (n: number) => `+${n} EXP`,
    xpTotal: (xp: number) => `SCORE: ${xp}`,
    progressLabel: (done: number, total: number) => `鉴定进度  ${done}/${total}`,
    previewRank: 'SS',
  },
} as const;
