/**
 * TableRegistry 测试
 *
 * 策略：mock Excel.run + excelHelper，验证扫描、注册、取消注册逻辑。
 */

import { SheetSnapshot, SheetData } from '../../src/utils/ExcelHelper';

// ─── Mock 设施 ────────────────────────────────────────────────

interface RangeCall {
  row: number;
  col: number;
  rowCount: number;
  colCount: number;
  values?: unknown[][];
  cleared?: boolean;
}

let rangeCalls: RangeCall[] = [];

function makeMockSheet() {
  return {
    getRangeByIndexes(row: number, col: number, rowCount: number, colCount: number) {
      const call: RangeCall = { row, col, rowCount, colCount };
      const rangeObj = {
        values: null as unknown[][] | null,
        hyperlink: null as unknown,
        format: { font: { color: '', underline: '' } },
        clear(applyTo?: string) {
          call.cleared = true;
          void applyTo;
        },
        getEntireRow() {
          return {
            delete(_shift?: unknown) { void _shift; },
          };
        },
      };
      const proxy = new Proxy(rangeObj, {
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

/** 工作表列表（模拟 worksheets.items）*/
let mockSheetItems: { name: string }[] = [];

function makeMockContext() {
  return {
    workbook: {
      worksheets: {
        items: mockSheetItems,
        load: jest.fn(),
        getItem(_name: string) {
          return makeMockSheet();
        },
        getItemOrNullObject(_name: string) {
          // StudioConfig 不存在，触发旧格式回退
          return { isNullObject: true, load: jest.fn() };
        },
      },
    },
    sync: jest.fn().mockImplementation(async () => {}),
  };
}

// Mock Excel.run
(globalThis as Record<string, unknown>).Excel = {
  run: jest.fn().mockImplementation(async (callback: (ctx: unknown) => Promise<unknown>) => {
    const ctx = makeMockContext();
    return callback(ctx);
  }),
  ClearApplyTo: { contents: 'contents' },
  DeleteShiftDirection: { up: 'up' },
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

import { TableRegistry } from '../../src/v2/TableRegistry';

// ─── 测试 ─────────────────────────────────────────────────────

describe('TableRegistry', () => {
  let registry: TableRegistry;

  beforeEach(() => {
    registry = new TableRegistry();
    rangeCalls = [];
    mockSheetItems = [];
    jest.clearAllMocks();
  });

  // ─── scanUnregistered ───────────────────────────────────

  describe('scanUnregistered', () => {
    it('should exclude system sheets from scan results', async () => {
      // getRegisteredTables 需要先被调用——它也调用 Excel.run
      // 第一次 Excel.run 是 getRegisteredTables，返回空 Map
      // 第二次 Excel.run 是 scanUnregistered 主体
      const mappingSnap: SheetSnapshot = {
        name: '表名对照',
        values: [['#输出控制#'], [null]],
        rowCount: 2,
        colCount: 4,
        startRow: 0,
        startCol: 0,
      };

      // 设置 mockSheetItems：包含系统表和普通表
      mockSheetItems = [
        { name: '表格输出' },
        { name: '配置设置表' },
        { name: '表名对照' },
        { name: '模板说明' },
        { name: '说明表' },
        { name: '怪物表' },
        { name: '道具表' },
      ];

      // getRegisteredTables 的调用链
      let callCount = 0;
      mockLoadSheetSnapshot.mockImplementation(async (_ctx, sheetName) => {
        if (sheetName === '表名对照') {
          return mappingSnap;
        }
        // 非系统表的快照
        callCount++;
        if (sheetName === '怪物表') {
          return {
            name: '怪物表',
            values: [['#配置区域#', 'id=int']],
            rowCount: 1,
            colCount: 2,
            startRow: 0,
            startCol: 0,
          };
        }
        if (sheetName === '道具表') {
          return {
            name: '道具表',
            values: [['普通数据', '无标记']],
            rowCount: 1,
            colCount: 2,
            startRow: 0,
            startCol: 0,
          };
        }
        return null;
      });

      // findMarkerInData 用于 parseTableList 中查找 #输出控制# 和 scanUnregistered 中查找 #配置区域#
      mockFindMarkerInData.mockImplementation((data, marker) => {
        if (marker === '#输出控制#') {
          // 检查 data 中是否有 #输出控制#
          for (let r = 0; r < data.length; r++) {
            for (let c = 0; c < (data[r]?.length ?? 0); c++) {
              if (data[r][c] === '#输出控制#') return { row: r, col: c };
            }
          }
          return null;
        }
        if (marker === '#配置区域#') {
          for (let r = 0; r < data.length; r++) {
            for (let c = 0; c < (data[r]?.length ?? 0); c++) {
              if (data[r][c] === '#配置区域#') return { row: r, col: c };
            }
          }
          return null;
        }
        return null;
      });

      mockReadBlockBelow.mockReturnValue([]);

      const result = await registry.scanUnregistered();

      // 只有怪物表有 #配置区域# 标记且不是系统表
      expect(result.length).toBe(1);
      expect(result[0].sheetName).toBe('怪物表');
      expect(result[0].hasConfigMarker).toBe(true);
    });

    it('should detect sheets with #配置区域# marker', async () => {
      const mappingSnap: SheetSnapshot = {
        name: '表名对照',
        values: [['#输出控制#'], [null]],
        rowCount: 2,
        colCount: 4,
        startRow: 0,
        startCol: 0,
      };

      mockSheetItems = [
        { name: '新表A' },
        { name: '新表B' },
      ];

      mockLoadSheetSnapshot.mockImplementation(async (_ctx, sheetName) => {
        if (sheetName === '表名对照') return mappingSnap;
        if (sheetName === '新表A') {
          return {
            name: '新表A',
            values: [['version_r', 'roads_0', null, null, '#配置区域#', 'id=int']],
            rowCount: 1,
            colCount: 6,
            startRow: 0,
            startCol: 0,
          };
        }
        if (sheetName === '新表B') {
          return {
            name: '新表B',
            values: [['version_r', 'roads_0', null, null, '#配置区域#', 'name=string']],
            rowCount: 1,
            colCount: 6,
            startRow: 0,
            startCol: 0,
          };
        }
        return null;
      });

      mockFindMarkerInData.mockImplementation((data, marker) => {
        for (let r = 0; r < data.length; r++) {
          for (let c = 0; c < (data[r]?.length ?? 0); c++) {
            if (data[r][c] === marker) return { row: r, col: c };
          }
        }
        return null;
      });
      mockReadBlockBelow.mockReturnValue([]);

      const result = await registry.scanUnregistered();

      expect(result.length).toBe(2);
      expect(result.map((r) => r.sheetName).sort()).toEqual(['新表A', '新表B']);
    });
  });

  // ─── registerTable ──────────────────────────────────────

  describe('registerTable', () => {
    it('should append table info after existing rows in #输出控制# block', async () => {
      const snap: SheetSnapshot = {
        name: '表名对照',
        values: [
          ['#输出控制#', null, null, null],
          ['1.0', '怪物表', 'monster', true],
          [null, null, null, null],
        ],
        rowCount: 3,
        colCount: 4,
        startRow: 0,
        startCol: 0,
      };

      mockLoadSheetSnapshot.mockResolvedValue(snap);
      mockFindMarkerInData.mockReturnValue({ row: 0, col: 0 });
      mockReadBlockBelow.mockReturnValue([['1.0', '怪物表', 'monster', true]]);
      mockWriteValues.mockResolvedValue(undefined);

      await registry.registerTable({
        chineseName: '道具表',
        englishName: 'item',
        shouldOutput: true,
        versionRange: '2.0',
      });

      // newRowIndex = markerRow(0) + 1 + existingRows(1) + startRow(0) = 2
      expect(mockWriteValues).toHaveBeenCalledWith(
        expect.anything(),
        '表名对照',
        2,
        0,
        [['2.0', '道具表', 'item', true]]
      );
    });

    it('should handle startRow offset', async () => {
      const snap: SheetSnapshot = {
        name: '表名对照',
        values: [
          ['#输出控制#', null, null, null],
        ],
        rowCount: 1,
        colCount: 4,
        startRow: 5,
        startCol: 2,
      };

      mockLoadSheetSnapshot.mockResolvedValue(snap);
      mockFindMarkerInData.mockReturnValue({ row: 0, col: 0 });
      mockReadBlockBelow.mockReturnValue([]);
      mockWriteValues.mockResolvedValue(undefined);

      await registry.registerTable({
        chineseName: '技能表',
        englishName: 'skill',
        shouldOutput: false,
        versionRange: '1.0',
      });

      // newRowIndex = 0 + 1 + 0 + 5 = 6
      // startCol = 0 + 2 = 2
      expect(mockWriteValues).toHaveBeenCalledWith(
        expect.anything(),
        '表名对照',
        6,
        2,
        [['1.0', '技能表', 'skill', false]]
      );
    });

    it('should throw when snapshot is empty', async () => {
      mockLoadSheetSnapshot.mockResolvedValue(null);

      await expect(
        registry.registerTable({
          chineseName: '测试',
          englishName: 'test',
          shouldOutput: true,
          versionRange: '1.0',
        })
      ).rejects.toThrow();
    });
  });

  // ─── unregisterTable ────────────────────────────────────

  describe('unregisterTable', () => {
    it('should clear the row matching chineseName in #输出控制# block', async () => {
      const snap: SheetSnapshot = {
        name: '表名对照',
        values: [
          ['#输出控制#', null, null, null],
          ['1.0', '怪物表', 'monster', true],
          ['2.0', '道具表', 'item', true],
          [null, null, null, null],
        ],
        rowCount: 4,
        colCount: 4,
        startRow: 0,
        startCol: 0,
      };

      mockLoadSheetSnapshot.mockResolvedValue(snap);
      mockFindMarkerInData.mockReturnValue({ row: 0, col: 0 });

      await registry.unregisterTable('道具表');

      // 道具表在 row 2, col+1 = 1 -> chineseName matches
      // unregisterTable 使用 getEntireRow().delete() 删除整行
      expect(rangeCalls).toHaveLength(1);
      expect(rangeCalls[0].row).toBe(2);     // r=2 + startRow=0
      expect(rangeCalls[0].col).toBe(0);
      expect(rangeCalls[0].rowCount).toBe(1);
      expect(rangeCalls[0].colCount).toBe(1);
    });

    it('should throw when table not found', async () => {
      const snap: SheetSnapshot = {
        name: '表名对照',
        values: [
          ['#输出控制#', null, null, null],
          ['1.0', '怪物表', 'monster', true],
          [null, null, null, null],
        ],
        rowCount: 3,
        colCount: 4,
        startRow: 0,
        startCol: 0,
      };

      mockLoadSheetSnapshot.mockResolvedValue(snap);
      mockFindMarkerInData.mockReturnValue({ row: 0, col: 0 });

      await expect(registry.unregisterTable('不存在的表')).rejects.toThrow('未找到已注册的表');
    });
  });

  // ─── getRegisteredTables ────────────────────────────────

  describe('getRegisteredTables', () => {
    it('should return correct map of registered tables', async () => {
      const snap: SheetSnapshot = {
        name: '表名对照',
        values: [
          ['#输出控制#', null, null, null],
          ['1.0', '怪物表', 'monster', 'true'],
          ['2.0', '道具表', 'item', 'false'],
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
        ['1.0', '怪物表', 'monster', 'true'],
        ['2.0', '道具表', 'item', 'false'],
      ]);

      const result = await registry.getRegisteredTables();

      expect(result.size).toBe(2);

      const monster = result.get('怪物表');
      expect(monster).toBeDefined();
      expect(monster!.englishName).toBe('monster');
      expect(monster!.shouldOutput).toBe(true);
      expect(monster!.versionRange).toBe('1.0');

      const item = result.get('道具表');
      expect(item).toBeDefined();
      expect(item!.englishName).toBe('item');
      expect(item!.shouldOutput).toBe(false);
    });

    it('should return empty map when sheet is empty', async () => {
      mockLoadSheetSnapshot.mockResolvedValue(null);

      const result = await registry.getRegisteredTables();
      expect(result.size).toBe(0);
    });

    it('should skip rows with empty chineseName or englishName', async () => {
      const snap: SheetSnapshot = {
        name: '表名对照',
        values: [
          ['#输出控制#', null, null, null],
          ['1.0', '怪物表', 'monster', 'true'],
          ['2.0', '', 'item', 'true'],
          ['3.0', '技能表', '', 'true'],
        ],
        rowCount: 4,
        colCount: 4,
        startRow: 0,
        startCol: 0,
      };

      mockLoadSheetSnapshot.mockResolvedValue(snap);
      mockFindMarkerInData.mockReturnValue({ row: 0, col: 0 });
      mockReadBlockBelow.mockReturnValue([
        ['1.0', '怪物表', 'monster', 'true'],
        ['2.0', '', 'item', 'true'],
        ['3.0', '技能表', '', 'true'],
      ]);

      const result = await registry.getRegisteredTables();

      expect(result.size).toBe(1);
      expect(result.has('怪物表')).toBe(true);
    });
  });
});
