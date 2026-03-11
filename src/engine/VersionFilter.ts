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
   * 校验单个版本字符串的格式（与 VBA IsValidVersion 一致）
   * 合法格式: 数字 + 可选小数点+数字 + 可选末尾单个字母
   * 例: "3.5a", "12", "2.0", "1" → valid
   *     "abc", "3.5.6", "a3", ".5", "" → invalid
   */
  isValidVersion(versionStr: string): boolean {
    if (!versionStr || versionStr.length === 0) return false;

    let hasDecimal = false;
    let hasLetter = false;
    let digitEncountered = false;

    for (let i = 0; i < versionStr.length; i++) {
      const ch = versionStr[i];

      if (ch >= '0' && ch <= '9') {
        digitEncountered = true;
        if (hasLetter) return false; // 数字不能出现在字母之后
      } else if (ch === '.') {
        if (hasDecimal || hasLetter) return false; // 不能有多个小数点，小数点不能在字母后
        if (!digitEncountered) return false; // 小数点前必须有数字
        hasDecimal = true;
      } else if ((ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z')) {
        if (hasLetter) return false; // 只允许末尾一个字母
        if (!digitEncountered) return false; // 字母前必须有数字
        hasLetter = true;
      } else {
        return false; // 不允许其他字符
      }
    }

    return digitEncountered;
  }

  /**
   * 校验版本区间格式，返回错误信息（用于导出前校验）
   */
  validateRangeFormat(rangeStr: string): { valid: boolean; errorCode?: number; message?: string } {
    if (rangeStr == null || String(rangeStr).trim() === '') {
      return { valid: true };
    }

    const s = String(rangeStr).trim();

    // "0" 和 "1" 是线路开关值，不是版本区间，跳过校验
    if (s === '0' || s === '1') {
      return { valid: true };
    }

    // 检查是否使用了横线而非波浪号
    if (s.includes('-') && !s.includes('~')) {
      if (/\d-\d/.test(s)) {
        return {
          valid: false,
          errorCode: 2101,
          message: `版本区间 "${s}" 使用了横线 - 而非波浪号 ~`,
        };
      }
    }

    // 解析并校验各部分的格式
    const tildeIndex = s.indexOf('~');
    if (tildeIndex === -1) {
      // 没有波浪号，单个版本号
      if (!this.isValidVersion(s)) {
        return {
          valid: false,
          errorCode: 1003,
          message: `版本号格式无效: "${s}"`,
        };
      }
    } else {
      const leftPart = s.substring(0, tildeIndex).trim();
      const rightPart = s.substring(tildeIndex + 1).trim();

      // 波浪号两侧同时为空
      if (leftPart === '' && rightPart === '') {
        return {
          valid: false,
          errorCode: 2104,
          message: `版本区间 "${s}" 波浪号两侧同时为空`,
        };
      }

      // 校验左侧版本号格式
      if (leftPart !== '' && !this.isValidVersion(leftPart)) {
        return {
          valid: false,
          errorCode: 1003,
          message: `版本区间左侧格式无效: "${leftPart}"`,
        };
      }

      // 校验右侧版本号格式
      if (rightPart !== '' && !this.isValidVersion(rightPart)) {
        return {
          valid: false,
          errorCode: 1003,
          message: `版本区间右侧格式无效: "${rightPart}"`,
        };
      }
    }

    // 解析后检查 min <= max
    const range = this.parseRange(s);
    if (!range) {
      return {
        valid: false,
        errorCode: 2103,
        message: `版本区间 "${s}" 最小值大于最大值`,
      };
    }

    return { valid: true };
  }
}
