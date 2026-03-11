/**
 * ValidationEngine 测试
 *
 * 策略：直接调用各校验方法（不依赖 Excel.run），
 * 构造 TableValidationData 模拟各种数据场景，
 * 覆盖全部 7 条规则的正向和反向用例。
 */

import { VersionFilter } from '../../src/engine/VersionFilter';
import { ValidationEngine } from '../../src/v3/ValidationEngine';
import { TableValidationData, ValidationResult } from '../../src/types/validation';

// ─── Mock 设施 ────────────────────────────────────────────────

// Mock Logger（避免输出干扰）
jest.mock('../../src/utils/Logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock ExcelHelper（parseValidationData 中会调用 findMarkerInData）
jest.mock('../../src/utils/ExcelHelper', () => ({
  excelHelper: {
    loadSheetSnapshot: jest.fn(),
    findMarkerInData: jest.fn(),
  },
}));

// ─── 辅助函数 ─────────────────────────────────────────────────

/**
 * 创建一个标准的 VersionFilter 实例（校验引擎需要）
 * targetVersion 和 lineField 在校验场景中不重要，只用其 parseRange 方法
 */
function createEngine(): ValidationEngine {
  const vf = new VersionFilter(1, 'roads_0');
  return new ValidationEngine(vf);
}

/**
 * 构造最小化的 TableValidationData
 */
function makeData(overrides: Partial<TableValidationData> = {}): TableValidationData {
  return {
    versionRowStart: 5,      // version_r 在第5行（1-indexed）
    dataRowStart: 7,         // 数据从第7行开始
    dataColStart: 11,        // 数据从第11列开始（1-indexed）
    versionValues: [],       // A 列版本值
    roadsValues: [],         // roads 值
    fieldNames: [],
    fieldTypes: [],
    dataValues: [],
    ...overrides,
  };
}

// ─── 测试 ─────────────────────────────────────────────────────

describe('ValidationEngine', () => {
  let engine: ValidationEngine;

  beforeEach(() => {
    engine = createEngine();
  });

  // ════════════════════════════════════════════════════════════
  // 规则1：版本区间格式检查
  // ════════════════════════════════════════════════════════════

  describe('validateVersionFormat', () => {
    it('正常版本区间不应报错', () => {
      const data = makeData({
        versionValues: ['version_r', '描述行', '1.0', '1.5~2.0', '~3.0', '2.0~', ''],
      });
      const results = engine.validateVersionFormat('测试表', data);
      expect(results).toHaveLength(0);
    });

    it('使用横线的版本区间应报错', () => {
      const data = makeData({
        versionValues: ['version_r', '描述行', '1.0-2.0'],
      });
      const results = engine.validateVersionFormat('测试表', data);
      expect(results).toHaveLength(1);
      expect(results[0].severity).toBe('error');
      expect(results[0].ruleName).toBe('版本区间分隔符');
      expect(results[0].message).toContain('横线');
    });

    it('波浪号两侧都为空应报格式无效', () => {
      const data = makeData({
        versionValues: ['version_r', '描述行', '~'],
      });
      const results = engine.validateVersionFormat('测试表', data);
      expect(results).toHaveLength(1);
      expect(results[0].severity).toBe('error');
      expect(results[0].ruleName).toBe('版本区间格式');
    });

    it('min > max 的版本区间应报格式无效', () => {
      const data = makeData({
        versionValues: ['version_r', '描述行', '5~2'],
      });
      const results = engine.validateVersionFormat('测试表', data);
      expect(results).toHaveLength(1);
      expect(results[0].severity).toBe('error');
    });

    it('version_r 标记本身应被跳过', () => {
      const data = makeData({
        versionValues: ['version_r'],
      });
      const results = engine.validateVersionFormat('测试表', data);
      expect(results).toHaveLength(0);
    });

    it('空值应被跳过', () => {
      const data = makeData({
        versionValues: ['version_r', '', ''],
      });
      const results = engine.validateVersionFormat('测试表', data);
      expect(results).toHaveLength(0);
    });

    it('线路开关值 0 和 1 应被跳过', () => {
      const data = makeData({
        versionValues: ['version_r', '描述行', '0', '1'],
      });
      const results = engine.validateVersionFormat('测试表', data);
      expect(results).toHaveLength(0);
    });

    it('带字母后缀的版本号应正常通过', () => {
      const data = makeData({
        versionValues: ['version_r', '描述行', '1s', '2.5a'],
      });
      const results = engine.validateVersionFormat('测试表', data);
      expect(results).toHaveLength(0);
    });

    it('错误定位应正确（行号 = versionRowStart + index）', () => {
      const data = makeData({
        versionRowStart: 10,
        versionValues: ['version_r', '描述行', '1.0-2.0'],
      });
      const results = engine.validateVersionFormat('测试表', data);
      expect(results[0].location).toEqual({
        sheetName: '测试表',
        row: 12, // 10 + 2
        column: 1,
      });
    });
  });

  // ════════════════════════════════════════════════════════════
  // 规则2：数据类型匹配检查
  // ════════════════════════════════════════════════════════════

  describe('validateDataTypes', () => {
    it('int 类型匹配正确值不应报错', () => {
      const data = makeData({
        fieldNames: ['id'],
        fieldTypes: ['int'],
        dataValues: [['100'], ['-5'], ['0']],
      });
      const results = engine.validateDataTypes('测试表', data);
      expect(results).toHaveLength(0);
    });

    it('int 类型不匹配应报 warning', () => {
      const data = makeData({
        fieldNames: ['id'],
        fieldTypes: ['int'],
        dataValues: [['abc'], ['1.5']],
      });
      const results = engine.validateDataTypes('测试表', data);
      expect(results).toHaveLength(2);
      expect(results[0].severity).toBe('warning');
      expect(results[0].ruleName).toBe('数据类型');
      expect(results[0].message).toContain('不是有效整数');
    });

    it('float 类型匹配正确', () => {
      const data = makeData({
        fieldNames: ['ratio'],
        fieldTypes: ['float'],
        dataValues: [['1.5'], ['-0.3'], ['100']],
      });
      const results = engine.validateDataTypes('测试表', data);
      expect(results).toHaveLength(0);
    });

    it('float 类型不匹配应报 warning', () => {
      const data = makeData({
        fieldNames: ['ratio'],
        fieldTypes: ['float'],
        dataValues: [['abc']],
      });
      const results = engine.validateDataTypes('测试表', data);
      expect(results).toHaveLength(1);
      expect(results[0].message).toContain('不是有效数字');
    });

    it('int[] 正确格式不应报错', () => {
      const data = makeData({
        fieldNames: ['ids'],
        fieldTypes: ['int[]'],
        dataValues: [['1|2|3'], ['-1|0|5']],
      });
      const results = engine.validateDataTypes('测试表', data);
      expect(results).toHaveLength(0);
    });

    it('int[] 错误格式应报 warning', () => {
      const data = makeData({
        fieldNames: ['ids'],
        fieldTypes: ['int[]'],
        dataValues: [['1,2,3']],
      });
      const results = engine.validateDataTypes('测试表', data);
      expect(results).toHaveLength(1);
      expect(results[0].message).toContain('N|N|N');
    });

    it('int[][] 正确格式不应报错', () => {
      const data = makeData({
        fieldNames: ['matrix'],
        fieldTypes: ['int[][]'],
        dataValues: [['1|2;3|4']],
      });
      const results = engine.validateDataTypes('测试表', data);
      expect(results).toHaveLength(0);
    });

    it('int[][] 错误格式应报 warning', () => {
      const data = makeData({
        fieldNames: ['matrix'],
        fieldTypes: ['int[][]'],
        dataValues: [['1,2;3,4']],
      });
      const results = engine.validateDataTypes('测试表', data);
      expect(results).toHaveLength(1);
    });

    it('string 类型不做校验', () => {
      const data = makeData({
        fieldNames: ['name'],
        fieldTypes: ['string'],
        dataValues: [['anything'], ['123'], ['']],
      });
      const results = engine.validateDataTypes('测试表', data);
      expect(results).toHaveLength(0);
    });

    it('空值和 null 应被跳过', () => {
      const data = makeData({
        fieldNames: ['id'],
        fieldTypes: ['int'],
        dataValues: [[''], [null]],
      });
      const results = engine.validateDataTypes('测试表', data);
      expect(results).toHaveLength(0);
    });

    it('无类型定义的字段应跳过', () => {
      const data = makeData({
        fieldNames: ['unknown'],
        fieldTypes: [''],
        dataValues: [['abc']],
      });
      const results = engine.validateDataTypes('测试表', data);
      expect(results).toHaveLength(0);
    });
  });

  // ════════════════════════════════════════════════════════════
  // 规则3：数组分隔符检查
  // ════════════════════════════════════════════════════════════

  describe('validateArrayFormats', () => {
    it('使用竖线分隔的数组不应报错', () => {
      const data = makeData({
        fieldNames: ['ids'],
        fieldTypes: ['int[]'],
        dataValues: [['1|2|3']],
      });
      const results = engine.validateArrayFormats('测试表', data);
      expect(results).toHaveLength(0);
    });

    it('使用逗号分隔的数组应报 warning', () => {
      const data = makeData({
        fieldNames: ['ids'],
        fieldTypes: ['int[]'],
        dataValues: [['1,2,3']],
      });
      const results = engine.validateArrayFormats('测试表', data);
      expect(results).toHaveLength(1);
      expect(results[0].severity).toBe('warning');
      expect(results[0].ruleName).toBe('数组分隔符');
      expect(results[0].message).toContain('逗号');
    });

    it('同时有逗号和竖线不应报错（可能是混合格式）', () => {
      const data = makeData({
        fieldNames: ['ids'],
        fieldTypes: ['int[]'],
        dataValues: [['1|2,3']],
      });
      const results = engine.validateArrayFormats('测试表', data);
      expect(results).toHaveLength(0);
    });

    it('非数组类型字段应跳过', () => {
      const data = makeData({
        fieldNames: ['name'],
        fieldTypes: ['string'],
        dataValues: [['a,b,c']],
      });
      const results = engine.validateArrayFormats('测试表', data);
      expect(results).toHaveLength(0);
    });

    it('空值应被跳过', () => {
      const data = makeData({
        fieldNames: ['ids'],
        fieldTypes: ['int[]'],
        dataValues: [['']],
      });
      const results = engine.validateArrayFormats('测试表', data);
      expect(results).toHaveLength(0);
    });

    it('int[][] 类型也应检查逗号', () => {
      const data = makeData({
        fieldNames: ['matrix'],
        fieldTypes: ['int[][]'],
        dataValues: [['1,2;3,4']],
      });
      const results = engine.validateArrayFormats('测试表', data);
      expect(results).toHaveLength(1);
    });
  });

  // ════════════════════════════════════════════════════════════
  // 规则4：版本覆盖完整性检查（核心功能）
  // ════════════════════════════════════════════════════════════

  describe('validateVersionCoverage', () => {
    it('单行 Key 不应报错', () => {
      const data = makeData({
        versionValues: ['version_r', '描述行', '1'],
        dataValues: [['100000', '数据']],
      });
      const results = engine.validateVersionCoverage('测试表', data);
      expect(results).toHaveLength(0);
    });

    it('简写模式连续的多行 Key 不应报错', () => {
      // "1" → [1, 99), "1.3" → [1.3, 99)
      // 第二行的 min(1.3) < 第一行的 max(99)，连续（有重叠）
      const data = makeData({
        versionValues: ['version_r', '描述行', '1', '1.3'],
        dataValues: [
          ['3', '数据A'],
          ['3', '数据B'],
        ],
      });
      const results = engine.validateVersionCoverage('测试表', data);
      // 两行重叠 → info 级别
      const errors = results.filter(r => r.severity === 'error');
      expect(errors).toHaveLength(0);
    });

    it('有间隙的版本区间应报 error', () => {
      // "1~1.2" → [1, 1.2), "1.5" → [1.5, 99)
      // 间隙：1.2 ~ 1.5
      const data = makeData({
        dataRowStart: 7,
        versionValues: ['version_r', '描述行', '1~1.2', '1.5'],
        dataValues: [
          ['3', '数据A'],
          ['3', '数据B'],
        ],
      });
      const results = engine.validateVersionCoverage('测试表', data);
      const errors = results.filter(r => r.severity === 'error');
      expect(errors).toHaveLength(1);
      expect(errors[0].ruleName).toBe('版本覆盖完整性');
      expect(errors[0].message).toContain('Key=3');
      expect(errors[0].message).toContain('1.2');
      expect(errors[0].message).toContain('1.5');
    });

    it('有重叠的版本区间应报 info', () => {
      // "1~2.0" → [1, 2.0), "1.5" → [1.5, 99)
      // 重叠：1.5 ~ 2.0
      const data = makeData({
        versionValues: ['version_r', '描述行', '1~2.0', '1.5'],
        dataValues: [
          ['3', '数据A'],
          ['3', '数据B'],
        ],
      });
      const results = engine.validateVersionCoverage('测试表', data);
      const infos = results.filter(r => r.severity === 'info');
      expect(infos).toHaveLength(1);
      expect(infos[0].message).toContain('重叠');
    });

    it('空版本值的行不参与覆盖检查', () => {
      const data = makeData({
        versionValues: ['version_r', '描述行', '', ''],
        dataValues: [
          ['5', '数据A'],
          ['5', '数据B'],
        ],
      });
      const results = engine.validateVersionCoverage('测试表', data);
      // 空版本会被 parseRange 解析为 {0, 0.1}，两行都是 [0, 0.1) → 连续（相等不算间隙也不算重叠）
      const errors = results.filter(r => r.severity === 'error');
      expect(errors).toHaveLength(0);
    });

    it('不同 Key 不互相影响', () => {
      const data = makeData({
        versionValues: ['version_r', '描述行', '1~1.2', '1.5', '1~1.2', '2'],
        dataValues: [
          ['A', '数据'],
          ['A', '数据'],
          ['B', '数据'],
          ['B', '数据'],
        ],
      });
      const results = engine.validateVersionCoverage('测试表', data);
      // Key=A 有间隙，Key=B 无间隙（1.2 < 2 有间隙）
      const errors = results.filter(r => r.severity === 'error');
      expect(errors).toHaveLength(2); // A 和 B 各有间隙
    });

    it('带字母后缀的版本号应正常处理', () => {
      // "1s" → [1, 99), "2s" → [2, 99)
      // 重叠：2 ~ 99
      const data = makeData({
        versionValues: ['version_r', '描述行', '1s', '2s'],
        dataValues: [
          ['6', '数据A'],
          ['6', '数据B'],
        ],
      });
      const results = engine.validateVersionCoverage('测试表', data);
      const errors = results.filter(r => r.severity === 'error');
      expect(errors).toHaveLength(0);
    });

    it('带字母后缀的间隙应报错', () => {
      // "1~1.5s" → [1, 1.5), "2s" → [2, 99)
      // 间隙：1.5 ~ 2
      const data = makeData({
        versionValues: ['version_r', '描述行', '1~1.5s', '2s'],
        dataValues: [
          ['7', '数据A'],
          ['7', '数据B'],
        ],
      });
      const results = engine.validateVersionCoverage('测试表', data);
      const errors = results.filter(r => r.severity === 'error');
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toContain('Key=7');
    });

    it('精确连续的版本区间不应报错和提示', () => {
      // "1~1.5" → [1, 1.5), "1.5~2.0" → [1.5, 2.0)
      // 无间隙无重叠
      const data = makeData({
        versionValues: ['version_r', '描述行', '1~1.5', '1.5~2.0'],
        dataValues: [
          ['10', '数据A'],
          ['10', '数据B'],
        ],
      });
      const results = engine.validateVersionCoverage('测试表', data);
      expect(results).toHaveLength(0);
    });

    it('三行同 Key 的多间隙场景', () => {
      // "1~1.2" → [1, 1.2), "1.5~1.8" → [1.5, 1.8), "2.0" → [2.0, 99)
      // 间隙1：1.2~1.5，间隙2：1.8~2.0
      const data = makeData({
        versionValues: ['version_r', '描述行', '1~1.2', '1.5~1.8', '2.0'],
        dataValues: [
          ['20', '数据A'],
          ['20', '数据B'],
          ['20', '数据C'],
        ],
      });
      const results = engine.validateVersionCoverage('测试表', data);
      const errors = results.filter(r => r.severity === 'error');
      expect(errors).toHaveLength(2);
    });
  });

  // ════════════════════════════════════════════════════════════
  // 规则5：同Key版本顺序检查
  // ════════════════════════════════════════════════════════════

  describe('validateKeyVersionOrder', () => {
    it('版本递增排列不应报错', () => {
      const data = makeData({
        versionValues: ['version_r', '描述行', '1', '1.5', '2.0'],
        dataValues: [
          ['A', '数据'],
          ['A', '数据'],
          ['A', '数据'],
        ],
      });
      const results = engine.validateKeyVersionOrder('测试表', data);
      expect(results).toHaveLength(0);
    });

    it('版本递减排列应报 warning', () => {
      const data = makeData({
        versionValues: ['version_r', '描述行', '2.0', '1.0'],
        dataValues: [
          ['A', '数据'],
          ['A', '数据'],
        ],
      });
      const results = engine.validateKeyVersionOrder('测试表', data);
      expect(results).toHaveLength(1);
      expect(results[0].severity).toBe('warning');
      expect(results[0].ruleName).toBe('同Key版本顺序');
    });

    it('单行 Key 不应报错', () => {
      const data = makeData({
        versionValues: ['version_r', '描述行', '1.0'],
        dataValues: [['A', '数据']],
      });
      const results = engine.validateKeyVersionOrder('测试表', data);
      expect(results).toHaveLength(0);
    });

    it('不同 Key 不互相影响', () => {
      const data = makeData({
        versionValues: ['version_r', '描述行', '2.0', '1.0', '1.0', '2.0'],
        dataValues: [
          ['A', '数据'],
          ['A', '数据'],
          ['B', '数据'],
          ['B', '数据'],
        ],
      });
      const results = engine.validateKeyVersionOrder('测试表', data);
      // 只有 Key=A 有顺序问题
      expect(results).toHaveLength(1);
      expect(results[0].message).toContain('Key=A');
    });

    it('相同版本号不应报错', () => {
      const data = makeData({
        versionValues: ['version_r', '描述行', '1.0', '1.0'],
        dataValues: [
          ['A', '数据'],
          ['A', '数据'],
        ],
      });
      const results = engine.validateKeyVersionOrder('测试表', data);
      expect(results).toHaveLength(0);
    });
  });

  // ════════════════════════════════════════════════════════════
  // 规则6：必填字段检查
  // ════════════════════════════════════════════════════════════

  describe('validateRequiredFields', () => {
    it('所有字段都有值不应报错', () => {
      const data = makeData({
        fieldNames: ['id', 'name'],
        dataValues: [['100', '测试']],
      });
      const results = engine.validateRequiredFields('测试表', data);
      expect(results).toHaveLength(0);
    });

    it('空字符串字段应报 warning', () => {
      const data = makeData({
        fieldNames: ['id', 'name'],
        dataValues: [['100', '']],
      });
      const results = engine.validateRequiredFields('测试表', data);
      expect(results).toHaveLength(1);
      expect(results[0].severity).toBe('warning');
      expect(results[0].ruleName).toBe('必填字段');
      expect(results[0].message).toContain('name');
    });

    it('null 字段应报 warning', () => {
      const data = makeData({
        fieldNames: ['id'],
        dataValues: [[null]],
      });
      const results = engine.validateRequiredFields('测试表', data);
      expect(results).toHaveLength(1);
    });

    it('多行多列的空值应全部报出', () => {
      const data = makeData({
        fieldNames: ['id', 'name', 'value'],
        dataValues: [
          ['', 'a', null],
          ['1', '', ''],
        ],
      });
      const results = engine.validateRequiredFields('测试表', data);
      expect(results).toHaveLength(4); // row0: col0+col2, row1: col1+col2
    });

    it('定位信息应正确', () => {
      const data = makeData({
        dataRowStart: 10,
        dataColStart: 5,
        fieldNames: ['id', 'name'],
        dataValues: [['ok', ''], ['', 'ok']],
      });
      const results = engine.validateRequiredFields('测试表', data);
      expect(results).toHaveLength(2);
      // 第一个空值：row 0, col 1 → 行号 10, 列号 5+1=6
      expect(results[0].location).toEqual({
        sheetName: '测试表',
        row: 10,
        column: 6,
      });
      // 第二个空值：row 1, col 0 → 行号 11, 列号 5
      expect(results[1].location).toEqual({
        sheetName: '测试表',
        row: 11,
        column: 5,
      });
    });
  });

  // ════════════════════════════════════════════════════════════
  // 规则7：Roads 一致性检查
  // ════════════════════════════════════════════════════════════

  describe('validateRoadsConsistency', () => {
    it('roads_0=1 时子线路启用不应报错', () => {
      const data = makeData({
        // roadsValues 索引从 version_r 行开始，数据行从 index 2 开始
        roadsValues: [
          ['version_r', 'roads_0', 'roads_1'],  // 表头行
          ['描述', '', ''],                       // 描述行
          ['1', '1', '1'],                        // 数据行：roads_0=1, roads_1=1
        ],
      });
      const results = engine.validateRoadsConsistency('测试表', data);
      expect(results).toHaveLength(0);
    });

    it('roads_0=0 且 roads_N=1 应报 warning', () => {
      const data = makeData({
        versionRowStart: 5,
        roadsValues: [
          ['version_r', 'roads_0', 'roads_1'],
          ['描述', '', ''],
          ['0', '1'],  // roads_0=0 但 roads_1=1
        ],
      });
      const results = engine.validateRoadsConsistency('测试表', data);
      expect(results).toHaveLength(1);
      expect(results[0].severity).toBe('warning');
      expect(results[0].ruleName).toBe('Roads一致性');
      expect(results[0].message).toContain('roads_0=0');
      expect(results[0].message).toContain('roads_1=1');
    });

    it('roads_0=0 且所有子线路都为 0 不应报错', () => {
      const data = makeData({
        roadsValues: [
          ['version_r', 'roads_0', 'roads_1'],
          ['描述', '', ''],
          ['0', '0'],
        ],
      });
      const results = engine.validateRoadsConsistency('测试表', data);
      expect(results).toHaveLength(0);
    });

    it('roads_0 为空且子线路启用应报 warning', () => {
      const data = makeData({
        versionRowStart: 5,
        roadsValues: [
          ['version_r', 'roads_0', 'roads_1'],
          ['描述', '', ''],
          ['', '1'],  // roads_0=空 但 roads_1=1
        ],
      });
      const results = engine.validateRoadsConsistency('测试表', data);
      expect(results).toHaveLength(1);
    });

    it('空 roads 行应被跳过', () => {
      const data = makeData({
        roadsValues: [[]],
      });
      const results = engine.validateRoadsConsistency('测试表', data);
      expect(results).toHaveLength(0);
    });

    it('多行矛盾应分别报出', () => {
      const data = makeData({
        versionRowStart: 5,
        roadsValues: [
          ['version_r', 'roads_0', 'roads_1', 'roads_2'],
          ['描述', '', '', ''],
          ['0', '1', '0'],  // 矛盾：roads_0=0 但 roads_1=1
          ['0', '0', '1'],  // 矛盾：roads_0=0 但 roads_2=1
        ],
      });
      const results = engine.validateRoadsConsistency('测试表', data);
      expect(results).toHaveLength(2);
    });

    it('定位行号应正确（versionRowStart + index + 2）', () => {
      const data = makeData({
        versionRowStart: 10,
        roadsValues: [
          ['version_r', 'roads_0', 'roads_1'],
          ['描述', '', ''],
          ['0', '1'],
        ],
      });
      const results = engine.validateRoadsConsistency('测试表', data);
      expect(results[0].location!.row).toBe(14); // 10 + 2 + 2
    });
  });

  // ════════════════════════════════════════════════════════════
  // checkType 辅助方法
  // ════════════════════════════════════════════════════════════

  describe('checkType', () => {
    it('int 类型正负整数均通过', () => {
      expect(engine.checkType('123', 'int')).toBeNull();
      expect(engine.checkType('-5', 'int')).toBeNull();
      expect(engine.checkType('0', 'int')).toBeNull();
    });

    it('int 类型小数和字母不通过', () => {
      expect(engine.checkType('1.5', 'int')).toBe('不是有效整数');
      expect(engine.checkType('abc', 'int')).toBe('不是有效整数');
    });

    it('float 类型数字均通过', () => {
      expect(engine.checkType('1.5', 'float')).toBeNull();
      expect(engine.checkType('-0.3', 'float')).toBeNull();
      expect(engine.checkType('100', 'float')).toBeNull();
    });

    it('float 类型非数字不通过', () => {
      expect(engine.checkType('abc', 'float')).toBe('不是有效数字');
    });

    it('int[] 竖线分隔整数通过', () => {
      expect(engine.checkType('1|2|3', 'int[]')).toBeNull();
      expect(engine.checkType('-1|0|5', 'int[]')).toBeNull();
      expect(engine.checkType('42', 'int[]')).toBeNull();
    });

    it('int[] 逗号分隔不通过', () => {
      expect(engine.checkType('1,2,3', 'int[]')).toBe('格式应为 N|N|N');
    });

    it('int[][] 分号+竖线分隔通过', () => {
      expect(engine.checkType('1|2;3|4', 'int[][]')).toBeNull();
      expect(engine.checkType('1;2', 'int[][]')).toBeNull();
    });

    it('int[][] 逗号分隔不通过', () => {
      expect(engine.checkType('1,2;3,4', 'int[][]')).toBe('格式应为 N|N;N|N');
    });

    it('未知类型返回 null（不校验）', () => {
      expect(engine.checkType('anything', 'string')).toBeNull();
      expect(engine.checkType('anything', 'unknown')).toBeNull();
    });
  });

  // ════════════════════════════════════════════════════════════
  // parseValidationData（数据解析）
  // ════════════════════════════════════════════════════════════

  describe('parseValidationData', () => {
    // 需要 mock excelHelper.findMarkerInData
    const { excelHelper } = require('../../src/utils/ExcelHelper');

    it('应正确解析标准表结构', () => {
      // 模拟一个标准表：
      // Row 0: [... 一些无关数据 ...]
      // Row 3: [version_r, roads_0, roads_1, #配置区域#, id=int, name=string]
      // Row 4: [描述, 总线路, 子线路1, 配置区域, ID描述, 名称描述]
      // Row 5: [1.0, 1, 1, null, 100, '测试']
      const sheetData = [
        [null, null, null, null, null, null],
        [null, null, null, null, null, null],
        [null, null, null, null, null, null],
        ['version_r', 'roads_0', 'roads_1', '#配置区域#', 'id=int', 'name=string'],
        ['描述', '总线路', '子线路1', '配置区域', 'ID', '名称'],
        ['1.0', '1', '1', null, 100, '测试'],
      ];

      excelHelper.findMarkerInData
        .mockReturnValueOnce({ row: 3, col: 0 })   // version_r
        .mockReturnValueOnce({ row: 3, col: 3 });   // #配置区域#

      const result = engine.parseValidationData(sheetData, '测试表', 0);

      expect(result).not.toBeNull();
      expect(result!.versionRowStart).toBe(4);  // row 3 + 1 (1-indexed)
      expect(result!.dataRowStart).toBe(6);      // versionRowStart + 2
      expect(result!.dataColStart).toBe(5);      // configAreaCol(3) + 1 + 1 (1-indexed)
      expect(result!.fieldNames).toEqual(['id', 'name']);
      expect(result!.fieldTypes).toEqual(['int', 'string']);
      expect(result!.dataValues).toHaveLength(1);
      expect(result!.dataValues[0]).toEqual([100, '测试']);
    });

    it('找不到 version_r 应返回 null', () => {
      excelHelper.findMarkerInData.mockReturnValue(null);
      const result = engine.parseValidationData([[]], '测试表');
      expect(result).toBeNull();
    });

    it('找不到 #配置区域# 应返回 null', () => {
      excelHelper.findMarkerInData
        .mockReturnValueOnce({ row: 0, col: 0 })
        .mockReturnValueOnce(null);
      const result = engine.parseValidationData([['version_r']], '测试表');
      expect(result).toBeNull();
    });
  });
});
