export interface VersionRange {
  min: number;
  max: number;
}

export class VersionFilter {
  private targetVersion: number;
  private targetLineField: string;

  constructor(targetVersion: number, targetLineField: string) {
    this.targetVersion = targetVersion;
    this.targetLineField = targetLineField;
  }

  getTargetVersion(): number {
    return this.targetVersion;
  }

  getTargetLineField(): string {
    return this.targetLineField;
  }

  /**
   * 从版本字符串中提取数字部分
   * "3.5a" → 3.5, "2s" → 2, "1.2s" → 1.2
   */
  extractNumber(versionStr: string): number {
    if (versionStr == null) return 0;
    const s = String(versionStr).trim();
    if (s === '') return 0;

    let result = '';
    let hasDecimal = false;
    for (const ch of s) {
      if (ch >= '0' && ch <= '9') {
        result += ch;
      } else if (ch === '.' && !hasDecimal) {
        hasDecimal = true;
        result += ch;
      } else if (ch >= 'a' && ch <= 'z' || ch >= 'A' && ch <= 'Z') {
        break;
      } else if (ch === '~' || ch === '-') {
        break;
      }
    }

    if (result === '' || result === '.') return 0;
    return parseFloat(result);
  }

  /**
   * 解析版本区间字符串
   * "" → {0, 0.1}
   * "1.0" → {1.0, 99}
   * "1.0~2.5" → {1.0, 2.5}
   * "~2.5" → {0, 2.5}
   * "1.0~" → {1.0, 99}
   */
  parseRange(rangeStr: string): VersionRange | null {
    if (rangeStr == null) return { min: 0, max: 0.1 };
    const s = String(rangeStr).trim();

    if (s === '') return { min: 0, max: 0.1 };

    // 检查是否包含波浪号
    const tildeIndex = s.indexOf('~');
    if (tildeIndex === -1) {
      // 没有波浪号，单个版本号
      const num = this.extractNumber(s);
      return { min: num, max: 99 };
    }

    const leftPart = s.substring(0, tildeIndex).trim();
    const rightPart = s.substring(tildeIndex + 1).trim();

    // 波浪号两侧同时为空
    if (leftPart === '' && rightPart === '') {
      return null;
    }

    const min = leftPart === '' ? 0 : this.extractNumber(leftPart);
    const max = rightPart === '' ? 99 : this.extractNumber(rightPart);

    if (min > max) return null;

    return { min, max };
  }

  /**
   * 检查目标版本是否在版本区间内（左闭右开）
   */
  isVersionInRange(rangeStr: string): boolean {
    const range = this.parseRange(rangeStr);
    if (!range) return false;
    return this.targetVersion >= range.min && this.targetVersion < range.max;
  }

  /**
   * 检查线路值是否通过
   * "1" → 视为在所有版本启用 → true
   * "0" 或 空 → 排除
   * 其他 → 作为版本区间解析
   */
  isLineValuePassed(value: unknown): boolean {
    if (value == null) return false;
    const s = String(value).trim();
    if (s === '' || s === '0') return false;
    if (s === '1') return true;
    return this.isVersionInRange(s);
  }

  /**
   * 校验版本区间格式，返回错误信息（用于导出前校验）
   */
  validateRangeFormat(rangeStr: string): { valid: boolean; errorCode?: number; message?: string } {
    if (rangeStr == null || String(rangeStr).trim() === '') {
      return { valid: true };
    }

    const s = String(rangeStr).trim();

    // 检查是否使用了横线而非波浪号
    if (s.includes('-') && !s.includes('~')) {
      const dashCount = (s.match(/-/g) || []).length;
      if (dashCount > 0 && /\d-\d/.test(s)) {
        return {
          valid: false,
          errorCode: 2101,
          message: `版本区间 "${s}" 使用了横线 - 而非波浪号 ~`,
        };
      }
    }

    const range = this.parseRange(s);
    if (!range) {
      if (s === '~') {
        return {
          valid: false,
          errorCode: 2104,
          message: `版本区间 "${s}" 波浪号两侧同时为空`,
        };
      }
      return {
        valid: false,
        errorCode: 2103,
        message: `版本区间 "${s}" 最小值大于最大值`,
      };
    }

    return { valid: true };
  }
}
