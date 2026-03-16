/**
 * ConfigManager 测试
 *
 * 策略：mock Excel.run 直接执行回调，mock excelHelper 返回预构造的快照数据，
 * 验证 getRangeByIndexes 被调用的参数和写入值。
 */

import { SheetSnapshot, SheetData } from '../../src/utils/ExcelHelper';

// ─── Mock 设施 ────────────────────────────────────────────────

/** 记录 getRangeByIndexes 调用 */
interface RangeCall {
  row: number;
  col: number;
  rowCount: number;
  colCount: number;
  values?: unknown[][];
}

let rangeCalls: RangeCall[] = [];
let syncCount = 0;

/** mock range 对象 */
function makeMockRange(): { values: unknown[][] | null } {
  const rangeObj: { values: unknown[][] | null } = { values: null };
  return rangeObj;
}

/** mock sheet 对象 */
function makeMockSheet() {
  return {
    getRangeByIndexes(row: number, col: number, rowCount: number, colCount: number) {
      const range = makeMockRange();
      const call: RangeCall = { row, col, rowCount, colCount };
      // 使用 Proxy 捕获 values 赋值
      const proxy = new Proxy(range, {
        set(_target, prop, value) {
          if (prop === 'values') {
            call.values = value;
          }
          return Reflect.set(_target, prop, value);
        },
      });
      rangeCalls.push(call);
      return proxy;
    },
  };
}

/** mock context 对象 */
function makeMockContext() {
  return {
    workbook: {
      worksheets: {
        getItem(_name: string) {
          return makeMockSheet();
        },
        getItemOrNullObject(_name: string) {
          // StudioConfig 不存在，触发旧格式回退
          return { isNullObject: true, load: jest.fn() };
        },
      },
    },
    sync: jest.fn().mockImplementation(async () => { syncCount++; }),
  };
}

// Mock Excel.run —— 直接执行传入的回调
(globalThis as Record<string, unknown>).Excel = {
  run: jest.fn().mockImplementation(async (callback: (ctx: unknown) => Promise<unknown>) => {
    const ctx = makeMockContext();
    return callback(ctx);
  }),
};

// Mock excelHelper
const mockLoadSheetSnapshot = jest.fn<Promise<SheetSnapshot | null>, [unknown, string]>();
const mockFindMarkerInData = jest.fn<{ row: number; col: number } | null, [SheetData, string]>();
const mockReadBlockBelow = jest.fn<SheetData, [SheetData, number, number, number]>();
const mockWriteValues = jest.fn<Promise<void>, [unknown, string, number, number, unknown[][]]>();

jest.mock('../../src/utils/ExcelHelper', () => ({
  excelHelper: {
    loadSheetSnapshot: (...args: unknown[]) => mockLoadSheetSnapshot(args[0], args[1] as string),
    findMarkerInData: (...args: unknown[]) => mockFindMarkerInData(args[0] as SheetData, args[1] as string),
    readBlockBelow: (...args: unknown[]) => mockReadBlockBelow(args[0] as SheetData, args[1] as number, args[2] as number, args[3] as number),
    writeValues: (...args: unknown[]) => mockWriteValues(args[0], args[1] as string, args[2] as number, args[3] as number, args[4] as unknown[][]),
  },
}));

jest.mock('../../src/utils/Logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

import { ConfigManager } from '../../src/v2/ConfigManager';
import { logger } from '../../src/utils/Logger';

// ─── 测试 ─────────────────────────────────────────────────────

describe('ConfigManager', () => {
  let cm: ConfigManager;

  beforeEach(() => {
    cm = new ConfigManager();
    rangeCalls = [];
    syncCount = 0;
    jest.clearAllMocks();
  });

  // ─── 辅助：构造标准快照 ──────────────────────────────────

  function makeControlSnap(marker: string, markerRow: number, markerCol: number, extraValues: SheetData = []): SheetSnapshot {
    // 构造一个简单的 values 数组，把标记放在指定位置
    const values: SheetData = [];
    for (let r = 0; r <= markerRow + extraValues.length; r++) {
      values.push([]);
    }
    // 确保标记位置有值
    while ((values[markerRow]?.length ?? 0) <= markerCol) {
      values[markerRow].push(null);
    }
    values[markerRow][markerCol] = marker;
    // 把额外数据行放在标记下方
    for (let i = 0; i < extraValues.length; i++) {
      values[markerRow + 1 + i] = extraValues[i];
    }
    return {
      name: '表格输出',
      values,
      rowCount: values.length,
      colCount: 10,
      startRow: 0,
      startCol: 0,
    };
  }

  // ─── setOutputVersion ───────────────────────────────────

  describe('setOutputVersion', () => {
    it('should write version name to the cell right of #输出版本# marker', async () => {
      const snap = makeControlSnap('#输出版本#', 2, 3);
      mockLoadSheetSnapshot.mockResolvedValue(snap);
      mockFindMarkerInData.mockReturnValue({ row: 2, col: 3 });

      await cm.setOutputVersion('正式版');

      expect(rangeCalls).toHaveLength(1);
      expect(rangeCalls[0].row).toBe(2);    // markerRow + startRow
      expect(rangeCalls[0].col).toBe(4);    // markerCol + 1 + startCol
      expect(rangeCalls[0].rowCount).toBe(1);
      expect(rangeCalls[0].colCount).toBe(1);
      expect(rangeCalls[0].values).toEqual([['正式版']]);
    });

    it('should handle startRow/startCol offset correctly', async () => {
      const snap = makeControlSnap('#输出版本#', 1, 2);
      snap.startRow = 5;
      snap.startCol = 3;
      mockLoadSheetSnapshot.mockResolvedValue(snap);
      mockFindMarkerInData.mockReturnValue({ row: 1, col: 2 });

      await cm.setOutputVersion('测试版');

      expect(rangeCalls[0].row).toBe(6);    // 1 + 5
      expect(rangeCalls[0].col).toBe(6);    // 2 + 1 + 3
    });

    it('should log error when snapshot is null', async () => {
      mockLoadSheetSnapshot.mockResolvedValue(null);

      await cm.setOutputVersion('测试版');

      expect(rangeCalls).toHaveLength(0);
      expect(logger.error).toHaveBeenCalled();
    });

    it('should log error when marker is not found', async () => {
      const snap = makeControlSnap('#输出版本#', 0, 0);
      mockLoadSheetSnapshot.mockResolvedValue(snap);
      mockFindMarkerInData.mockReturnValue(null);

      await cm.setOutputVersion('测试版');

      expect(rangeCalls).toHaveLength(0);
      expect(logger.error).toHaveBeenCalled();
    });
  });

  // ─── setOutputVersionNumber ─────────────────────────────

  describe('setOutputVersionNumber', () => {
    it('should write version number to the cell right of #输出版本号# marker', async () => {
      const snap = makeControlSnap('#输出版本号#', 3, 1);
      mockLoadSheetSnapshot.mockResolvedValue(snap);
      mockFindMarkerInData.mockReturnValue({ row: 3, col: 1 });

      await cm.setOutputVersionNumber(42);

      expect(rangeCalls).toHaveLength(1);
      expect(rangeCalls[0].row).toBe(3);
      expect(rangeCalls[0].col).toBe(2);   // col + 1
      expect(rangeCalls[0].values).toEqual([[42]]);
    });
  });

  // ─── setGitCommitTemplate ───────────────────────────────

  describe('setGitCommitTemplate', () => {
    it('should write template to the row below #Git通用提交日志# marker', async () => {
      const snap: SheetSnapshot = {
        name: '配置设置表',
        values: [
          [null, null],
          ['#Git通用提交日志#', null],
          ['old template', null],
        ],
        rowCount: 3,
        colCount: 2,
        startRow: 0,
        startCol: 0,
      };
      mockLoadSheetSnapshot.mockResolvedValue(snap);
      mockFindMarkerInData.mockReturnValue({ row: 1, col: 0 });

      await cm.setGitCommitTemplate('fix: update config ${version}');

      expect(rangeCalls).toHaveLength(1);
      expect(rangeCalls[0].row).toBe(2);     // markerRow + 1 + startRow
      expect(rangeCalls[0].col).toBe(0);     // markerCol + startCol
      expect(rangeCalls[0].rowCount).toBe(1);
      expect(rangeCalls[0].colCount).toBe(1);
      expect(rangeCalls[0].values).toEqual([['fix: update config ${version}']]);
    });

    it('should handle startRow offset', async () => {
      const snap: SheetSnapshot = {
        name: '配置设置表',
        values: [
          ['#Git通用提交日志#'],
          ['old'],
        ],
        rowCount: 2,
        colCount: 1,
        startRow: 10,
        startCol: 2,
      };
      mockLoadSheetSnapshot.mockResolvedValue(snap);
      mockFindMarkerInData.mockReturnValue({ row: 0, col: 0 });

      await cm.setGitCommitTemplate('new template');

      expect(rangeCalls[0].row).toBe(11);   // 0 + 1 + 10
      expect(rangeCalls[0].col).toBe(2);    // 0 + 2
    });
  });

  // ─── addVersion ─────────────────────────────────────────

  describe('addVersion', () => {
    it('should append version at the end of #版本列表# block', async () => {
      const snap: SheetSnapshot = {
        name: '配置设置表',
        values: [
          ['#版本列表#', null, null, null],
          ['v1', 1, '/dir1', 'field1'],
          ['v2', 2, '/dir2', 'field2'],
          [null, null, null, null],
        ],
        rowCount: 4,
        colCount: 4,
        startRow: 0,
        startCol: 0,
      };
      mockLoadSheetSnapshot.mockResolvedValue(snap);
      mockFindMarkerInData.mockReturnValue({ row: 0, col: 0 });
      mockReadBlockBelow.mockReturnValue([
        ['v1', 1, '/dir1', 'field1'],
        ['v2', 2, '/dir2', 'field2'],
      ]);

      await cm.addVersion({
        name: 'v3',
        lineId: 3,
        gitDirectory: '/dir3',
        lineField: 'field3',
      });

      // insertRow = markerRow(0) + 1 + existingRows(2) = 3
      expect(rangeCalls).toHaveLength(1);
      expect(rangeCalls[0].row).toBe(3);
      expect(rangeCalls[0].col).toBe(0);
      expect(rangeCalls[0].rowCount).toBe(1);
      expect(rangeCalls[0].colCount).toBe(4);
      expect(rangeCalls[0].values).toEqual([['v3', 3, '/dir3', 'field3']]);
    });

    it('should handle empty version list', async () => {
      const snap: SheetSnapshot = {
        name: '配置设置表',
        values: [['#版本列表#', null, null, null], [null]],
        rowCount: 2,
        colCount: 4,
        startRow: 0,
        startCol: 0,
      };
      mockLoadSheetSnapshot.mockResolvedValue(snap);
      mockFindMarkerInData.mockReturnValue({ row: 0, col: 0 });
      mockReadBlockBelow.mockReturnValue([]);

      await cm.addVersion({
        name: 'v1',
        lineId: 1,
        gitDirectory: '/dir1',
        lineField: 'field1',
      });

      // insertRow = 0 + 1 + 0 = 1
      expect(rangeCalls[0].row).toBe(1);
      expect(rangeCalls[0].values).toEqual([['v1', 1, '/dir1', 'field1']]);
    });

    it('should log error when marker not found', async () => {
      const snap: SheetSnapshot = {
        name: '配置设置表',
        values: [[null]],
        rowCount: 1,
        colCount: 1,
        startRow: 0,
        startCol: 0,
      };
      mockLoadSheetSnapshot.mockResolvedValue(snap);
      mockFindMarkerInData.mockReturnValue(null);

      await cm.addVersion({
        name: 'v1',
        lineId: 1,
        gitDirectory: '/dir1',
        lineField: 'field1',
      });

      expect(rangeCalls).toHaveLength(0);
      expect(logger.error).toHaveBeenCalled();
    });
  });

  // ─── updateVersion ──────────────────────────────────────

  describe('updateVersion', () => {
    it('should find version by old name and update the row', async () => {
      const snap: SheetSnapshot = {
        name: '配置设置表',
        values: [
          ['#版本列表#', null, null, null],
          ['v1', 1, '/dir1', 'field1'],
          ['v2', 2, '/dir2', 'field2'],
        ],
        rowCount: 3,
        colCount: 4,
        startRow: 0,
        startCol: 0,
      };
      mockLoadSheetSnapshot.mockResolvedValue(snap);
      mockFindMarkerInData.mockReturnValue({ row: 0, col: 0 });
      mockReadBlockBelow.mockReturnValue([
        ['v1', 1, '/dir1', 'field1'],
        ['v2', 2, '/dir2', 'field2'],
      ]);

      await cm.updateVersion('v2', {
        name: 'v2-new',
        lineId: 20,
        gitDirectory: '/newdir',
        lineField: 'newfield',
      });

      // matchIndex = 1, targetRow = 0 + 1 + 1 = 2
      expect(rangeCalls).toHaveLength(1);
      expect(rangeCalls[0].row).toBe(2);
      expect(rangeCalls[0].values).toEqual([['v2-new', 20, '/newdir', 'newfield']]);
    });

    it('should log warning when version not found', async () => {
      const snap: SheetSnapshot = {
        name: '配置设置表',
        values: [['#版本列表#'], ['v1', 1, '/d', 'f']],
        rowCount: 2,
        colCount: 4,
        startRow: 0,
        startCol: 0,
      };
      mockLoadSheetSnapshot.mockResolvedValue(snap);
      mockFindMarkerInData.mockReturnValue({ row: 0, col: 0 });
      mockReadBlockBelow.mockReturnValue([['v1', 1, '/d', 'f']]);

      await cm.updateVersion('nonexistent', {
        name: 'x',
        lineId: 0,
        gitDirectory: '',
        lineField: '',
      });

      expect(rangeCalls).toHaveLength(0);
      expect(logger.warn).toHaveBeenCalled();
    });
  });

  // ─── deleteVersion ──────────────────────────────────────

  describe('deleteVersion', () => {
    it('should clear the row matching the version name', async () => {
      const snap: SheetSnapshot = {
        name: '配置设置表',
        values: [
          ['#版本列表#', null, null, null],
          ['v1', 1, '/dir1', 'field1'],
        ],
        rowCount: 2,
        colCount: 4,
        startRow: 0,
        startCol: 0,
      };
      mockLoadSheetSnapshot.mockResolvedValue(snap);
      mockFindMarkerInData.mockReturnValue({ row: 0, col: 0 });
      mockReadBlockBelow.mockReturnValue([['v1', 1, '/dir1', 'field1']]);

      await cm.deleteVersion('v1');

      expect(rangeCalls).toHaveLength(1);
      expect(rangeCalls[0].row).toBe(1);
      expect(rangeCalls[0].values).toEqual([['', '', '', '']]);
    });
  });

  // ─── addLine ────────────────────────────────────────────

  describe('addLine', () => {
    it('should append a line template after #线路列表# block', async () => {
      const snap: SheetSnapshot = {
        name: '配置设置表',
        values: [
          ['#线路列表#', null, null],
          [1, 'roads_0', '主线'],
        ],
        rowCount: 2,
        colCount: 3,
        startRow: 0,
        startCol: 0,
      };
      mockLoadSheetSnapshot.mockResolvedValue(snap);
      mockFindMarkerInData.mockReturnValue({ row: 0, col: 0 });
      mockReadBlockBelow.mockReturnValue([[1, 'roads_0', '主线']]);

      await cm.addLine({ id: 2, field: 'roads_1', remark: '支线' });

      expect(rangeCalls[0].row).toBe(2);  // 0 + 1 + 1
      expect(rangeCalls[0].colCount).toBe(3);
      expect(rangeCalls[0].values).toEqual([[2, 'roads_1', '支线']]);
    });
  });

  // ─── setSwitch ──────────────────────────────────────────

  describe('setSwitch', () => {
    it('should write boolean value to column right of matched switch name', async () => {
      const snap: SheetSnapshot = {
        name: '配置设置表',
        values: [
          ['#配置开关#', null],
          ['显示资源弹窗', 'true'],
          ['启用自动保存', 'false'],
        ],
        rowCount: 3,
        colCount: 2,
        startRow: 0,
        startCol: 0,
      };
      mockLoadSheetSnapshot.mockResolvedValue(snap);
      mockFindMarkerInData.mockReturnValue({ row: 0, col: 0 });
      mockReadBlockBelow.mockReturnValue([
        ['显示资源弹窗', 'true'],
        ['启用自动保存', 'false'],
      ]);

      await cm.setSwitch('启用自动保存', true);

      // matchIndex = 1, targetRow = 0 + 1 + 1 = 2
      // absCol = markerCol(0) + 1 + startCol(0) = 1
      expect(rangeCalls[0].row).toBe(2);
      expect(rangeCalls[0].col).toBe(1);
      expect(rangeCalls[0].values).toEqual([['true']]);
    });

    it('should log warning when switch name not found', async () => {
      const snap: SheetSnapshot = {
        name: '配置设置表',
        values: [['#配置开关#'], ['显示资源弹窗', 'true']],
        rowCount: 2,
        colCount: 2,
        startRow: 0,
        startCol: 0,
      };
      mockLoadSheetSnapshot.mockResolvedValue(snap);
      mockFindMarkerInData.mockReturnValue({ row: 0, col: 0 });
      mockReadBlockBelow.mockReturnValue([['显示资源弹窗', 'true']]);

      await cm.setSwitch('不存在的开关', false);

      expect(rangeCalls).toHaveLength(0);
      expect(logger.warn).toHaveBeenCalled();
    });
  });

  // ─── addStaff ───────────────────────────────────────────

  describe('addStaff', () => {
    it('should append staff info after #人员代码# block', async () => {
      const snap: SheetSnapshot = {
        name: '配置设置表',
        values: [
          ['#人员代码#', null, null, null],
          [1, '张三', 'zs', 'MC001'],
        ],
        rowCount: 2,
        colCount: 4,
        startRow: 0,
        startCol: 0,
      };
      mockLoadSheetSnapshot.mockResolvedValue(snap);
      mockFindMarkerInData.mockReturnValue({ row: 0, col: 0 });
      mockReadBlockBelow.mockReturnValue([[1, '张三', 'zs']]);

      await cm.addStaff({ id: 2, name: '李四', code: 'ls' });

      expect(rangeCalls[0].row).toBe(2);
      expect(rangeCalls[0].colCount).toBe(3);
      expect(rangeCalls[0].values).toEqual([[2, '李四', 'ls']]);
    });
  });

  // ─── updateStaff ────────────────────────────────────────

  describe('updateStaff', () => {
    it('should find staff by name and update the row', async () => {
      const snap: SheetSnapshot = {
        name: '配置设置表',
        values: [
          ['#人员代码#', null, null],
          [1, '张三', 'zs'],
          [2, '李四', 'ls'],
        ],
        rowCount: 3,
        colCount: 3,
        startRow: 0,
        startCol: 0,
      };
      mockLoadSheetSnapshot.mockResolvedValue(snap);
      mockFindMarkerInData.mockReturnValue({ row: 0, col: 0 });
      mockReadBlockBelow.mockReturnValue([
        [1, '张三', 'zs'],
        [2, '李四', 'ls'],
      ]);

      await cm.updateStaff('李四', { id: 2, name: '李四改', code: 'ls2' });

      // matchIndex = 1 (row[1] === '李四'), targetRow = 0 + 1 + 1 = 2
      expect(rangeCalls[0].row).toBe(2);
      expect(rangeCalls[0].values).toEqual([[2, '李四改', 'ls2']]);
    });
  });
});
