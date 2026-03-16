/**
 * 客户端级设置（localStorage）
 * 每个客户端独立维护，不影响其他协同用户
 */

const PREFIX = 'gds-setting-';

const defaults: Record<string, boolean> = {
  autoGitPush: true,
  detailedDiff: false,
  showResourcePopup: false,
};

export const clientSettings = {
  get(key: string): boolean {
    try {
      const val = localStorage.getItem(PREFIX + key);
      if (val === null) return defaults[key] ?? false;
      return val === '1';
    } catch {
      return defaults[key] ?? false;
    }
  },

  set(key: string, value: boolean): void {
    try {
      localStorage.setItem(PREFIX + key, value ? '1' : '0');
    } catch { /* ignore */ }
  },
};
