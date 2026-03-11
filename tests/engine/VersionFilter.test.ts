import { VersionFilter } from '../../src/engine/VersionFilter';

describe('VersionFilter', () => {
  describe('extractNumber', () => {
    const vf = new VersionFilter(1, 'roads_0');

    it('空字符串返回0', () => {
      expect(vf.extractNumber('')).toBe(0);
    });

    it('null返回0', () => {
      expect(vf.extractNumber(null as unknown as string)).toBe(0);
    });

    it('纯数字', () => {
      expect(vf.extractNumber('1')).toBe(1);
      expect(vf.extractNumber('7.5')).toBe(7.5);
      expect(vf.extractNumber('1.0')).toBe(1);
    });

    it('带字母后缀', () => {
      expect(vf.extractNumber('3.5a')).toBe(3.5);
      expect(vf.extractNumber('2s')).toBe(2);
      expect(vf.extractNumber('1.2s')).toBe(1.2);
    });
  });

  describe('parseRange', () => {
    const vf = new VersionFilter(1, 'roads_0');

    it('空值 → {0, 0.1}', () => {
      expect(vf.parseRange('')).toEqual({ min: 0, max: 0.1 });
      expect(vf.parseRange(null as unknown as string)).toEqual({ min: 0, max: 0.1 });
    });

    it('"1.0" → {1.0, 99}', () => {
      expect(vf.parseRange('1.0')).toEqual({ min: 1, max: 99 });
    });

    it('"1" → {1, 99}', () => {
      expect(vf.parseRange('1')).toEqual({ min: 1, max: 99 });
    });

    it('"1.0~2.5" → {1.0, 2.5}', () => {
      expect(vf.parseRange('1.0~2.5')).toEqual({ min: 1, max: 2.5 });
    });

    it('"~2.5" → {0, 2.5}', () => {
      expect(vf.parseRange('~2.5')).toEqual({ min: 0, max: 2.5 });
    });

    it('"1.0~" → {1.0, 99}', () => {
      expect(vf.parseRange('1.0~')).toEqual({ min: 1, max: 99 });
    });

    it('"3.5a" → {3.5, 99}', () => {
      expect(vf.parseRange('3.5a')).toEqual({ min: 3.5, max: 99 });
    });

    it('"1.2s~1.5s" → {1.2, 1.5}', () => {
      expect(vf.parseRange('1.2s~1.5s')).toEqual({ min: 1.2, max: 1.5 });
    });

    it('"~" → null (两侧同时为空)', () => {
      expect(vf.parseRange('~')).toBeNull();
    });

    it('"2.0~1.0" → null (min > max)', () => {
      expect(vf.parseRange('2.0~1.0')).toBeNull();
    });
  });

  describe('isVersionInRange', () => {
    it('空值 → 几乎不导出', () => {
      const vf = new VersionFilter(0.05, 'roads_0');
      expect(vf.isVersionInRange('')).toBe(true);

      const vf2 = new VersionFilter(1.0, 'roads_0');
      expect(vf2.isVersionInRange('')).toBe(false);
    });

    it('"1" → 1.0及以上', () => {
      const vf = new VersionFilter(0.5, 'roads_0');
      expect(vf.isVersionInRange('1')).toBe(false);

      const vf2 = new VersionFilter(1.0, 'roads_0');
      expect(vf2.isVersionInRange('1')).toBe(true);

      const vf3 = new VersionFilter(7.5, 'roads_0');
      expect(vf3.isVersionInRange('1')).toBe(true);
    });

    it('"1.0~2.5" → 左闭右开', () => {
      const vf1 = new VersionFilter(1.0, 'roads_0');
      expect(vf1.isVersionInRange('1.0~2.5')).toBe(true);

      const vf2 = new VersionFilter(2.0, 'roads_0');
      expect(vf2.isVersionInRange('1.0~2.5')).toBe(true);

      const vf3 = new VersionFilter(2.5, 'roads_0');
      expect(vf3.isVersionInRange('1.0~2.5')).toBe(false);

      const vf4 = new VersionFilter(0.9, 'roads_0');
      expect(vf4.isVersionInRange('1.0~2.5')).toBe(false);
    });

    it('"~2.5" → 2.5以下', () => {
      const vf1 = new VersionFilter(0, 'roads_0');
      expect(vf1.isVersionInRange('~2.5')).toBe(true);

      const vf2 = new VersionFilter(2.4, 'roads_0');
      expect(vf2.isVersionInRange('~2.5')).toBe(true);

      const vf3 = new VersionFilter(2.5, 'roads_0');
      expect(vf3.isVersionInRange('~2.5')).toBe(false);
    });

    it('"~1" 带波浪号前缀表示版本1.0前', () => {
      const vf = new VersionFilter(0.5, 'roads_0');
      expect(vf.isVersionInRange('~1')).toBe(true);

      const vf2 = new VersionFilter(1.0, 'roads_0');
      expect(vf2.isVersionInRange('~1')).toBe(false);
    });
  });

  describe('isLineValuePassed', () => {
    const vf = new VersionFilter(7.5, 'roads_1');

    it('"1" → 通过', () => {
      expect(vf.isLineValuePassed('1')).toBe(true);
    });

    it('"0" → 不通过', () => {
      expect(vf.isLineValuePassed('0')).toBe(false);
    });

    it('空 → 不通过', () => {
      expect(vf.isLineValuePassed('')).toBe(false);
      expect(vf.isLineValuePassed(null)).toBe(false);
    });

    it('版本区间字符串 → 按版本判定', () => {
      expect(vf.isLineValuePassed('1.0~8.0')).toBe(true);
      expect(vf.isLineValuePassed('1.0~5.0')).toBe(false);
    });
  });

  describe('validateRangeFormat', () => {
    const vf = new VersionFilter(7.5, 'roads_0');

    it('正常格式通过', () => {
      expect(vf.validateRangeFormat('1.0').valid).toBe(true);
      expect(vf.validateRangeFormat('1.0~2.5').valid).toBe(true);
      expect(vf.validateRangeFormat('').valid).toBe(true);
    });

    it('使用横线报错', () => {
      const result = vf.validateRangeFormat('1.0-2.5');
      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe(2101);
    });

    it('min > max 报错', () => {
      const result = vf.validateRangeFormat('5.0~2.0');
      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe(2103);
    });
  });
});
