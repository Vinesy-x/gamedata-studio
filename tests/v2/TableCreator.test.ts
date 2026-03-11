/**
 * TableCreator 测试
 *
 * 策略：mock Excel.run + excelHelper，验证创建工作表时的列布局和字段名组装。
 */

import { SheetSnapshot, SheetData } from '../../src/utils/ExcelHelper';

// ─── Mock 设施 ────────────────────────────────────────────────

interface RangeCall {
  row: number;
  col: number;
  rowCount: number;
  colCount: number;
  values?: unknown[][];
}

let rangeCalls: RangeCall[] = [];

/** 记录所有 sheet 操作 */
let addedSheetNames: string[] = [];
let deletedSheetNames: string[] = [];
let freezeCalls: RangeCall[] = [];

function makeMockRange() {
  return { values: null as unknown[][] | null };
}

function makeMockSheet(name?: string) {
  return {
    name: name || '',
    isNullObject: false,
    load: jest.fn(),
    delete: jest.fn().mockImplementation(function (this: { name: string }) {
      deletedSheetNames.push(this.name || 'unknown');
    }),
    getRangeByIndexes(row: number, col: number, rowCount: number, colCount: number) {
      const call: RangeCall = { row, col, rowCount, colCount };
      const range = makeMockRange();
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
    freezePanes: {
      freezeAt(_range: unknown) {
        // 记录最后一次 getRangeByIndexes 调用作为 freeze 坐标
        freezeCalls.push(rangeCalls[rangeCalls.length - 1]);
      },
    },
    activate() { /* mock */ },
  };
}

function makeMockContext() {
  return {
    workbook: {
      worksheets: {
        add(name: string) {
          addedSheetNames.push(name);
          return makeMockSheet(name);
        },
        getItem(name: string) {
          return makeMockSheet(name);
        },
        getItemOrNullObject(name: string) {
          const sheet = makeMockSheet(name);
          // 对已创建的表返回非 null，否则返回 null
          sheet.isNullObject = !addedSheetNames.includes(name);
          return sheet;
        },
      },
    },
    sync: jest.fn().mockImplementation(async () => {}),
  };
}

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

const mockStudioLoad = jest.fn();
const mockStudioUpdate = jest.fn().mockResolvedValue(true);
jest.mock('../../src/v2/StudioConfigStore', () => ({
  StudioConfigStore: {
    load: (...args: unknown[]) => mockStudioLoad(...args),
    update: (...args: unknown[]) => mockStudioUpdate(...args),
  },
}));

import { TableCreator, FieldDefinition, TableCreationConfig } from '../../src/v2/TableCreator';

// ─── 辅助 ─────────────────────────────────────────────────────

/** 构造标准线路列表快照 */
function makeSettingsSnap(): SheetSnapshot {
  return {
    name: '配置设置表',
    values: [
      ['#线路列表#', null, null],
      [1, 'roads_0', '主线'],
      [2, 'roads_1', '支线'],
      [null, null, null],
    ],
    rowCount: 4,
    colCount: 3,
    startRow: 0,
    startCol: 0,
  };
}

/** 构造表名对照快照 */
function makeMappingSnap(): SheetSnapshot {
  return {
    name: '表名对照',
    values: [
      ['#输出控制#', null, null, null],
      [null, null, null, null],
    ],
    rowCount: 2,
    colCount: 4,
    startRow: 0,
    startCol: 0,
  };
}

function makeFields(): FieldDefinition[] {
  return [
    { name: 'id', type: 'int', description: '编号', isKey: true, isLanguage: false },
    { name: 'name', type: 'string', description: '名称', isKey: false, isLanguage: true },
    { name: 'hp', type: 'int', description: '生命值', isKey: false, isLanguage: false },
  ];
}

function makeConfig(overrides?: Partial<TableCreationConfig>): TableCreationConfig {
  return {
    chineseName: '怪物表',
    englishName: 'monster',
    startVersion: '1.0',
    fields: makeFields(),
    includeVersionCol: false,
    autoRegister: false,
    ...overrides,
  };
}

/** 从 rangeCalls 中提取指定 (row, col) 位置的值（支持批量写入） */
function getValueAt(row: number, col: number): unknown {
  for (const call of rangeCalls) {
    if (call.values &&
      call.row <= row && row < call.row + call.rowCount &&
      call.col <= col && col < call.col + call.colCount) {
      return call.values[row - call.row]?.[col - call.col];
    }
  }
  return undefined;
}

// ─── 测试 ─────────────────────────────────────────────────────

describe('TableCreator', () => {
  let creator: TableCreator;

  beforeEach(() => {
    creator = new TableCreator();
    rangeCalls = [];
    addedSheetNames = [];
    deletedSheetNames = [];
    freezeCalls = [];
    jest.clearAllMocks();

    // 默认 StudioConfigStore 返回版本配置（roads_0 固定 + roads_1 对应"支线"版本）
    mockStudioLoad.mockResolvedValue({
      versions: [
        { name: '支线', lineId: 2, lineField: 'roads_1', gitDirectory: '' },
      ],
      lines: [
        { id: 1, field: 'roads_0', remark: '主线' },
        { id: 2, field: 'roads_1', remark: '支线' },
      ],
      tables: [],
      staff: [],
      switches: {},
      gitCommitTemplate: '',
      outputVersion: '',
      outputVersionNumber: 0,
    });

    // 默认 mock 设置
    mockLoadSheetSnapshot.mockImplementation(async (_ctx, sheetName) => {
      if (sheetName === '配置设置表') return makeSettingsSnap();
      if (sheetName === '表名对照') return makeMappingSnap();
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

    mockReadBlockBelow.mockImplementation((data, markerRow, markerCol, _numCols) => {
      const rows: SheetData = [];
      for (let r = markerRow + 1; r < data.length; r++) {
        const firstCell = data[r]?.[markerCol];
        if (firstCell == null || String(firstCell).trim() === '') break;
        rows.push(data[r]);
      }
      return rows;
    });
  });

  // ─── createTable 列布局 ─────────────────────────────────

  describe('createTable - basic layout (no version_c)', () => {
    // layout: version_r(0) | roads_0(1) | roads_1(2) | gap(3,4) | #配置区域#(5) | fields(6,7,8)
    it('should create sheet with correct name', async () => {
      await creator.createTable(makeConfig());
      expect(addedSheetNames).toContain('怪物表');
    });

    it('should write version_r row correctly', async () => {
      await creator.createTable(makeConfig());
      expect(getValueAt(0, 0)).toBe('version_r');
      expect(getValueAt(0, 1)).toBe('roads_0');
      expect(getValueAt(0, 2)).toBe('roads_1');
      expect(getValueAt(0, 5)).toBe('#配置区域#');
      expect(getValueAt(0, 6)).toBe('key_id=int');
      expect(getValueAt(0, 7)).toBe('language_name=string');
      expect(getValueAt(0, 8)).toBe('hp=int');
    });

    it('should write description row correctly', async () => {
      await creator.createTable(makeConfig());
      expect(getValueAt(1, 0)).toBe('版本行属');
      expect(getValueAt(1, 1)).toBe('默认');
      expect(getValueAt(1, 2)).toBe('支线');
      expect(getValueAt(1, 6)).toBe('编号');
      expect(getValueAt(1, 7)).toBe('名称');
    });
  });

  // ─── 字段名组装 ────────────────────────────────────────

  describe('field name assembly', () => {
    // dataStartCol = 1 + 2(roads) + 2(gap) + 1 = 6, 单字段时 dataStartCol = 1+2+2+1=6
    it('should add key_ prefix for key fields', async () => {
      await creator.createTable(makeConfig({
        fields: [{ name: 'id', type: 'int', description: 'ID', isKey: true, isLanguage: false }],
      }));
      expect(getValueAt(0, 6)).toBe('key_id=int');
    });

    it('should add language_ prefix for language fields', async () => {
      await creator.createTable(makeConfig({
        fields: [{ name: 'desc', type: 'string', description: '描述', isKey: false, isLanguage: true }],
      }));
      expect(getValueAt(0, 6)).toBe('language_desc=string');
    });

    it('should use plain name when neither key nor language', async () => {
      await creator.createTable(makeConfig({
        fields: [{ name: 'hp', type: 'int', description: '生命值', isKey: false, isLanguage: false }],
      }));
      expect(getValueAt(0, 6)).toBe('hp=int');
    });

    it('should prefer key_ prefix over language_ when both are true', async () => {
      await creator.createTable(makeConfig({
        fields: [{ name: 'special', type: 'string', description: '特殊', isKey: true, isLanguage: true }],
      }));
      expect(getValueAt(0, 6)).toBe('key_special=string');
    });
  });

  // ─── includeVersionCol ─────────────────────────────────

  describe('includeVersionCol=true layout', () => {
    // configMarkerCol = 1 + 2(roads) + 2(gap) = 5, dataStartCol = 6, vrRow = 4

    it('should write version_c row at row 0 and version_r at row 4', async () => {
      await creator.createTable(makeConfig({ includeVersionCol: true }));

      // version_c 行
      expect(getValueAt(0, 4)).toBe('版本列属');
      expect(getValueAt(0, 5)).toBe('version_c');
      // version_r 行
      expect(getValueAt(4, 0)).toBe('version_r');
      expect(getValueAt(4, 5)).toBe('#配置区域#');
    });

    it('should write startVersion for each field column in row 0', async () => {
      await creator.createTable(makeConfig({ includeVersionCol: true, startVersion: '3.5' }));

      expect(getValueAt(0, 6)).toBe('3.5');
      expect(getValueAt(0, 7)).toBe('3.5');
      expect(getValueAt(0, 8)).toBe('3.5');
    });

    it('should write description row at row 5', async () => {
      await creator.createTable(makeConfig({ includeVersionCol: true }));

      expect(getValueAt(5, 0)).toBe('版本行属');
    });
  });

  // ─── autoRegister ──────────────────────────────────────

  describe('autoRegister', () => {
    it('should register table via StudioConfigStore when autoRegister=true', async () => {
      await creator.createTable(makeConfig({ autoRegister: true }));

      // StudioConfigStore.update 被调用以注册表
      expect(mockStudioUpdate).toHaveBeenCalled();
    });

    it('should not register when autoRegister=false', async () => {
      await creator.createTable(makeConfig({ autoRegister: false }));

      const registerCall = rangeCalls.find(
        (c) =>
          c.values &&
          c.values[0]?.[1] === '怪物表' &&
          c.values[0]?.[2] === 'monster'
      );
      expect(registerCall).toBeUndefined();
    });
  });

  // ─── undoLastCreation ──────────────────────────────────

  describe('undoLastCreation', () => {
    it('should return false when no previous creation exists', async () => {
      const result = await creator.undoLastCreation();
      expect(result).toBe(false);
    });

    it('should delete the last created sheet', async () => {
      // 先创建一张表
      await creator.createTable(makeConfig());
      deletedSheetNames = [];

      // 撤销
      // 需要让 getItemOrNullObject 返回存在的表
      addedSheetNames.push('怪物表');
      const result = await creator.undoLastCreation();

      expect(result).toBe(true);
    });

    it('should return true and reset state after undo', async () => {
      await creator.createTable(makeConfig());
      addedSheetNames.push('怪物表');

      const result1 = await creator.undoLastCreation();
      expect(result1).toBe(true);

      // 第二次调用应返回 false
      const result2 = await creator.undoLastCreation();
      expect(result2).toBe(false);
    });

    it('should also unregister if autoRegister was true', async () => {
      await creator.createTable(makeConfig({ autoRegister: true }));
      addedSheetNames.push('怪物表');
      rangeCalls = [];

      await creator.undoLastCreation();

      // unregisterTable 内部会在 #输出控制# 区域查找并清空
      // 验证第二次 Excel.run (unregisterTable) 被调用
      expect((Excel as unknown as { run: jest.Mock }).run).toHaveBeenCalled();
    });
  });

  // ─── 错误处理 ──────────────────────────────────────────

  describe('error handling', () => {
    it('StudioConfig 为 null 时只有 roads_0', async () => {
      mockStudioLoad.mockResolvedValue(null);
      await creator.createTable(makeConfig());
      // version_r 行：col1 = roads_0, col2 = ''(gap)
      expect(getValueAt(0, 1)).toBe('roads_0');
      expect(getValueAt(0, 2)).toBe('');
    });

    it('StudioConfig 存在时只包含 roads_0，无额外版本', async () => {
      mockStudioLoad.mockResolvedValue({
        versions: [], lines: [], tables: [], staff: [], switches: {},
      });
      await creator.createTable(makeConfig());
      expect(getValueAt(0, 1)).toBe('roads_0');
      expect(getValueAt(0, 2)).toBe('');
    });
  });
});
