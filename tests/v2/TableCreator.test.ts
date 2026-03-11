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
    it('should create sheet with correct name', async () => {
      await creator.createTable(makeConfig());

      expect(addedSheetNames).toContain('怪物表');
    });

    it('should write version_r at row 0, col 0', async () => {
      await creator.createTable(makeConfig());

      const vrCall = rangeCalls.find(
        (c) => c.row === 0 && c.col === 0 && c.values?.[0]?.[0] === 'version_r'
      );
      expect(vrCall).toBeDefined();
    });

    it('should write roads columns after version_r', async () => {
      await creator.createTable(makeConfig());

      // 2 lines (roads_0, roads_1), so cols 1 and 2
      const road0 = rangeCalls.find(
        (c) => c.row === 0 && c.col === 1 && c.values?.[0]?.[0] === 'roads_0'
      );
      const road1 = rangeCalls.find(
        (c) => c.row === 0 && c.col === 2 && c.values?.[0]?.[0] === 'roads_1'
      );
      expect(road0).toBeDefined();
      expect(road1).toBeDefined();
    });

    it('should write #配置区域# marker at correct column', async () => {
      // layout: version_r(col0) + roads(col1,2) + gap(col3,4) + #配置区域#(col5)
      await creator.createTable(makeConfig());

      const configMarker = rangeCalls.find(
        (c) => c.values?.[0]?.[0] === '#配置区域#'
      );
      expect(configMarker).toBeDefined();
      expect(configMarker!.row).toBe(0);
      // configMarkerCol = 1 + 2(roads) + 2(gap) = 5
      expect(configMarker!.col).toBe(5);
    });

    it('should write field definitions after #配置区域#', async () => {
      await creator.createTable(makeConfig());

      // dataStartCol = configMarkerCol + 1 = 6
      const idField = rangeCalls.find(
        (c) => c.row === 0 && c.col === 6 && c.values?.[0]?.[0] === 'key_id=int'
      );
      const nameField = rangeCalls.find(
        (c) => c.row === 0 && c.col === 7 && c.values?.[0]?.[0] === 'language_name=string'
      );
      const hpField = rangeCalls.find(
        (c) => c.row === 0 && c.col === 8 && c.values?.[0]?.[0] === 'hp=int'
      );
      expect(idField).toBeDefined();
      expect(nameField).toBeDefined();
      expect(hpField).toBeDefined();
    });

    it('should write description row below field definitions', async () => {
      await creator.createTable(makeConfig());

      // descRow = vrRow(0) + 1 = 1
      const verRowAttr = rangeCalls.find(
        (c) => c.row === 1 && c.col === 0 && c.values?.[0]?.[0] === '版本行属'
      );
      expect(verRowAttr).toBeDefined();

      // road remarks at descRow
      const roadRemark0 = rangeCalls.find(
        (c) => c.row === 1 && c.col === 1 && c.values?.[0]?.[0] === '主线'
      );
      const roadRemark1 = rangeCalls.find(
        (c) => c.row === 1 && c.col === 2 && c.values?.[0]?.[0] === '支线'
      );
      expect(roadRemark0).toBeDefined();
      expect(roadRemark1).toBeDefined();

      // field descriptions
      const descId = rangeCalls.find(
        (c) => c.row === 1 && c.col === 6 && c.values?.[0]?.[0] === '编号'
      );
      const descName = rangeCalls.find(
        (c) => c.row === 1 && c.col === 7 && c.values?.[0]?.[0] === '名称'
      );
      expect(descId).toBeDefined();
      expect(descName).toBeDefined();
    });
  });

  // ─── 字段名组装 ────────────────────────────────────────

  describe('field name assembly', () => {
    it('should add key_ prefix for key fields', async () => {
      const config = makeConfig({
        fields: [
          { name: 'id', type: 'int', description: 'ID', isKey: true, isLanguage: false },
        ],
      });

      await creator.createTable(config);

      const keyField = rangeCalls.find(
        (c) => c.values?.[0]?.[0] === 'key_id=int'
      );
      expect(keyField).toBeDefined();
    });

    it('should add language_ prefix for language fields', async () => {
      const config = makeConfig({
        fields: [
          { name: 'desc', type: 'string', description: '描述', isKey: false, isLanguage: true },
        ],
      });

      await creator.createTable(config);

      const langField = rangeCalls.find(
        (c) => c.values?.[0]?.[0] === 'language_desc=string'
      );
      expect(langField).toBeDefined();
    });

    it('should use plain name when neither key nor language', async () => {
      const config = makeConfig({
        fields: [
          { name: 'hp', type: 'int', description: '生命值', isKey: false, isLanguage: false },
        ],
      });

      await creator.createTable(config);

      const plainField = rangeCalls.find(
        (c) => c.values?.[0]?.[0] === 'hp=int'
      );
      expect(plainField).toBeDefined();
    });

    it('should prefer key_ prefix over language_ when both are true', async () => {
      // Based on buildFieldString logic: if (isKey) ... else if (isLanguage)
      const config = makeConfig({
        fields: [
          { name: 'special', type: 'string', description: '特殊', isKey: true, isLanguage: true },
        ],
      });

      await creator.createTable(config);

      const field = rangeCalls.find(
        (c) => c.values?.[0]?.[0] === 'key_special=string'
      );
      expect(field).toBeDefined();
    });
  });

  // ─── includeVersionCol ─────────────────────────────────

  describe('includeVersionCol=true layout', () => {
    it('should shift version_r to row 4', async () => {
      await creator.createTable(makeConfig({ includeVersionCol: true }));

      const vrCall = rangeCalls.find(
        (c) => c.row === 4 && c.col === 0 && c.values?.[0]?.[0] === 'version_r'
      );
      expect(vrCall).toBeDefined();
    });

    it('should write version_c header at row 0', async () => {
      await creator.createTable(makeConfig({ includeVersionCol: true }));

      // configMarkerCol = 1 + 2(roads) + 2(gap) = 5
      // Row 0, col 4 (configMarkerCol-1): 版本列属
      const colAttr = rangeCalls.find(
        (c) => c.row === 0 && c.col === 4 && c.values?.[0]?.[0] === '版本列属'
      );
      expect(colAttr).toBeDefined();

      // Row 0, col 5 (configMarkerCol): version_c
      const vc = rangeCalls.find(
        (c) => c.row === 0 && c.col === 5 && c.values?.[0]?.[0] === 'version_c'
      );
      expect(vc).toBeDefined();
    });

    it('should write startVersion for each field column in row 0', async () => {
      const fields = makeFields();
      await creator.createTable(makeConfig({ includeVersionCol: true, startVersion: '3.5' }));

      // dataStartCol = configMarkerCol + 1 = 1 + 2(roads) + 2(gap) + 1 = 6
      for (let i = 0; i < fields.length; i++) {
        const versionCell = rangeCalls.find(
          (c) => c.row === 0 && c.col === 6 + i && c.values?.[0]?.[0] === '3.5'
        );
        expect(versionCell).toBeDefined();
      }
    });

    it('should write #配置区域# at row 4', async () => {
      await creator.createTable(makeConfig({ includeVersionCol: true }));

      const marker = rangeCalls.find(
        (c) => c.row === 4 && c.values?.[0]?.[0] === '#配置区域#'
      );
      expect(marker).toBeDefined();
    });

    it('should write description row at row 5', async () => {
      await creator.createTable(makeConfig({ includeVersionCol: true }));

      const descRow = rangeCalls.find(
        (c) => c.row === 5 && c.col === 0 && c.values?.[0]?.[0] === '版本行属'
      );
      expect(descRow).toBeDefined();
    });
  });

  // ─── autoRegister ──────────────────────────────────────

  describe('autoRegister', () => {
    it('should register table to 表名对照 when autoRegister=true', async () => {
      mockWriteValues.mockResolvedValue(undefined);

      await creator.createTable(makeConfig({ autoRegister: true }));

      // createTable 第二次 Excel.run 内调用 registerTable
      // 它使用 getRangeByIndexes 写入 [versionRange, chineseName, englishName, shouldOutput]
      const registerCall = rangeCalls.find(
        (c) =>
          c.values &&
          c.values[0]?.[1] === '怪物表' &&
          c.values[0]?.[2] === 'monster'
      );
      expect(registerCall).toBeDefined();
      expect(registerCall!.values![0][0]).toBe('1.0');
      expect(registerCall!.values![0][3]).toBe(true);
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
    it('should throw when 配置设置表 snapshot is null', async () => {
      mockLoadSheetSnapshot.mockResolvedValue(null);

      await expect(creator.createTable(makeConfig())).rejects.toThrow();
    });

    it('should throw when #线路列表# marker not found', async () => {
      mockLoadSheetSnapshot.mockResolvedValue({
        name: '配置设置表',
        values: [['no marker here']],
        rowCount: 1,
        colCount: 1,
        startRow: 0,
        startCol: 0,
      });
      mockFindMarkerInData.mockReturnValue(null);

      await expect(creator.createTable(makeConfig())).rejects.toThrow();
    });
  });
});
