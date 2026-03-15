/**
 * PlayerStats — 玩家经验/等级持久化服务
 *
 * 使用 localStorage 持久化，跨工作簿共享。
 * 经验曲线：升级所需 XP = floor(100 × level^1.8)，高等级越来越难。
 */

const STORAGE_KEY = 'gds-player-stats';

export interface PlayerStatsData {
  totalXp: number;
  exportCount: number;
  validateCount: number;
  previewCount: number;
}

const DEFAULT_STATS: PlayerStatsData = {
  totalXp: 0,
  exportCount: 0,
  validateCount: 0,
  previewCount: 0,
};

/** 计算从 level N 升到 level N+1 所需的 XP */
function xpForLevel(level: number): number {
  return Math.floor(100 * Math.pow(level, 1.8));
}

/** 根据总 XP 计算当前等级和进度 */
export function calcLevel(totalXp: number): { level: number; currentLevelXp: number; nextLevelXp: number; progress: number } {
  let level = 1;
  let accumulated = 0;

  while (true) {
    const needed = xpForLevel(level);
    if (accumulated + needed > totalXp) {
      const currentLevelXp = totalXp - accumulated;
      return {
        level,
        currentLevelXp,
        nextLevelXp: needed,
        progress: needed > 0 ? currentLevelXp / needed : 0,
      };
    }
    accumulated += needed;
    level++;
  }
}

/** 加载玩家数据 */
function load(): PlayerStatsData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_STATS, ...parsed };
    }
  } catch { /* ignore */ }
  return { ...DEFAULT_STATS };
}

/** 保存玩家数据 */
function save(data: PlayerStatsData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch { /* ignore */ }
}

/** 获取当前数据（只读） */
export function getStats(): PlayerStatsData {
  return load();
}

/** 获取当前等级信息 */
export function getLevelInfo() {
  const stats = load();
  return { ...calcLevel(stats.totalXp), ...stats };
}

/**
 * 导出完成时增加经验
 * @returns 本次获得的经验值
 */
export function grantExportXp(changedTables: number, modifiedFiles: number): number {
  const xp = changedTables * 10 + modifiedFiles * 2;
  if (xp <= 0) return 0;
  const data = load();
  data.totalXp += xp;
  data.exportCount += 1;
  save(data);
  return xp;
}

/**
 * 校验完成时增加经验
 * @returns 本次获得的经验值
 */
export function grantValidateXp(_rulesCount: number): number {
  const xp = 1;
  const data = load();
  data.totalXp += xp;
  data.validateCount += 1;
  save(data);
  return xp;
}

/**
 * 预览完成时增加经验
 * @returns 本次获得的经验值
 */
export function grantPreviewXp(): number {
  const xp = 5;
  const data = load();
  data.totalXp += xp;
  data.previewCount += 1;
  save(data);
  return xp;
}
