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

    it('"0" 和 "1" 作为线路开关跳过校验', () => {
      expect(vf.validateRangeFormat('0').valid).toBe(true);
      expect(vf.validateRangeFormat('1').valid).toBe(true);
    });

    it('无效版本格式报错', () => {
      // 字母开头
      const r1 = vf.validateRangeFormat('abc');
      expect(r1.valid).toBe(false);
      expect(r1.errorCode).toBe(1003);

      // 多个小数点
      const r2 = vf.validateRangeFormat('3.5.6');
      expect(r2.valid).toBe(false);
      expect(r2.errorCode).toBe(1003);

      // 区间左侧无效
      const r3 = vf.validateRangeFormat('abc~2.0');
      expect(r3.valid).toBe(false);
      expect(r3.errorCode).toBe(1003);

      // 区间右侧无效
      const r4 = vf.validateRangeFormat('1.0~xyz');
      expect(r4.valid).toBe(false);
      expect(r4.errorCode).toBe(1003);
    });
  });

  describe('isValidVersion', () => {
    const vf = new VersionFilter(7.5, 'roads_0');

    it('合法版本号', () => {
      expect(vf.isValidVersion('3')).toBe(true);
      expect(vf.isValidVersion('3.5')).toBe(true);
      expect(vf.isValidVersion('3.5a')).toBe(true);
      expect(vf.isValidVersion('12')).toBe(true);
      expect(vf.isValidVersion('2.0')).toBe(true);
    });

    it('非法版本号', () => {
      expect(vf.isValidVersion('')).toBe(false);
      expect(vf.isValidVersion('abc')).toBe(false);
      expect(vf.isValidVersion('.5')).toBe(false);
      expect(vf.isValidVersion('3.5.6')).toBe(false);
      expect(vf.isValidVersion('a3')).toBe(false);
      expect(vf.isValidVersion('3ab')).toBe(false); // 多个字母
      expect(vf.isValidVersion('7.43.2a')).toBe(false); // 两个小数点
    });

    it('validateRangeFormat 检测多小数点版本号', () => {
      const result = vf.validateRangeFormat('7.43.2a');
      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe(1003);
      expect(result.message).toContain('7.43.2a');
    });
  });

  describe('边界版本组合', () => {
    it('版本恰好等于区间左端点 → 包含（左闭）', () => {
      const vf = new VersionFilter(2.0, 'roads_0');
      expect(vf.isVersionInRange('2.0~5.0')).toBe(true);
    });

    it('版本恰好等于区间右端点 → 排除（右开）', () => {
      const vf = new VersionFilter(5.0, 'roads_0');
      expect(vf.isVersionInRange('2.0~5.0')).toBe(false);
    });

    it('版本0的特殊处理 — 空值范围{0,0.1}内', () => {
      const vf0 = new VersionFilter(0, 'roads_0');
      expect(vf0.isVersionInRange('')).toBe(true);  // {0, 0.1}，0 >= 0 && 0 < 0.1
    });

    it('版本0对非空区间的判定', () => {
      const vf0 = new VersionFilter(0, 'roads_0');
      expect(vf0.isVersionInRange('1')).toBe(false);      // {1, 99}，0 < 1
      expect(vf0.isVersionInRange('0.05~1')).toBe(false);  // 0 < 0.05
      expect(vf0.isVersionInRange('~1')).toBe(true);       // {0, 1}，0 >= 0 && 0 < 1
    });

    it('版本0.05对空值范围的判定', () => {
      const vf = new VersionFilter(0.05, 'roads_0');
      expect(vf.isVersionInRange('')).toBe(true);  // {0, 0.1}，0.05 在范围内
    });

    it('版本0.1对空值范围的判定 — 右开排除', () => {
      const vf = new VersionFilter(0.1, 'roads_0');
      expect(vf.isVersionInRange('')).toBe(false);  // {0, 0.1}，0.1 不在范围内
    });

    it('大版本号（99）恰好等于单数字区间的max → 排除', () => {
      const vf99 = new VersionFilter(99, 'roads_0');
      expect(vf99.isVersionInRange('1')).toBe(false);  // {1, 99}，99 >= 99 → false
    });

    it('大版本号（98.9）仍在单数字区间内', () => {
      const vf = new VersionFilter(98.9, 'roads_0');
      expect(vf.isVersionInRange('1')).toBe(true);  // {1, 99}
    });

    it('版本100超出默认max=99的范围', () => {
      const vf100 = new VersionFilter(100, 'roads_0');
      expect(vf100.isVersionInRange('1')).toBe(false);   // {1, 99}
      expect(vf100.isVersionInRange('1~101')).toBe(true); // {1, 101}
    });
  });

  describe('extractNumber 边界值', () => {
    const vf = new VersionFilter(1, 'roads_0');

    it('undefined 返回0', () => {
      expect(vf.extractNumber(undefined as unknown as string)).toBe(0);
    });

    it('纯字母返回0', () => {
      expect(vf.extractNumber('abc')).toBe(0);
    });

    it('小数点开头解析为0.5（extractNumber不校验格式）', () => {
      expect(vf.extractNumber('.5')).toBe(0.5);
    });
  });

  describe('parseRange 带字母后缀的区间', () => {
    const vf = new VersionFilter(1, 'roads_0');

    it('"3.5a~7.0" → {3.5, 7.0}', () => {
      expect(vf.parseRange('3.5a~7.0')).toEqual({ min: 3.5, max: 7 });
    });

    it('"~3.5a" → {0, 3.5}', () => {
      expect(vf.parseRange('~3.5a')).toEqual({ min: 0, max: 3.5 });
    });

    it('"3.5a~3.5a" → min=max → null（左闭右开区间为空）', () => {
      // min=3.5, max=3.5 → min > max? 否, min == max → 不为 null
      // 但实际上 3.5 >= 3.5 && 3.5 < 3.5 → false
      const range = vf.parseRange('3.5a~3.5a');
      expect(range).toEqual({ min: 3.5, max: 3.5 });
      // 虽然 parseRange 返回了，但 isVersionInRange 不会匹配任何版本
      const vf2 = new VersionFilter(3.5, 'roads_0');
      expect(vf2.isVersionInRange('3.5a~3.5a')).toBe(false);
    });
  });
});
