/**
 * LineSyncer 测试 — 三阶段同步
 *
 * 第一阶段：version_r 列同步（整列增删）
 * 第二阶段：version_c 行同步（整行增删，仅 R+C 模式）
 * 第三阶段：版本名同步
 */

import { SheetSnapshot } from '../../src/utils/ExcelHelper';
import { VersionTemplate } from '../../src/types/config';

// ─── Mock ────────────────────────────────────────────────

interface RangeCall {
  row: number;
  col: number;
  rowCount: number;
  colCount: number;
  values?: unknown[][];
  colDeleted?: boolean;
  colInserted?: boolean;
  rowDeleted?: boolean;
  rowInserted?: boolean;
}

let rangeCalls: RangeCall[] = [];

function makeMockSheet() {
  return {
    getRangeByIndexes(row: number, col: number, rowCount: number, colCount: number) {
      const call: RangeCall = { row, col, rowCount, colCount };
      const rangeObj = {
        values: null as unknown[][] | null,
        getEntireColumn() {
          return {
            delete() { call.colDeleted = true; },
            insert() { call.colInserted = true; },
          };
        },
        getEntireRow() {
          return {
            delete() { call.rowDeleted = true; },
            insert() { call.rowInserted = true; },
          };
        },
      };
      const proxy = new Proxy(rangeObj, {
        set(_t, prop, value) {
          if (prop === 'values') call.values = value;
          return Reflect.set(_t, prop, value);
        },
      });
      rangeCalls.push(call);
      return proxy;
    },
  };
}

(globalThis as Record<string, unknown>).Excel = {
  run: jest.fn().mockImplementation(async (cb: (ctx: unknown) => Promise<unknown>) =>
    cb({
      workbook: { worksheets: {
        getItem() { return makeMockSheet(); },
        getItemOrNullObject() { return { ...makeMockSheet(), isNullObject: false, load: jest.fn() }; },
      } },
      sync: jest.fn().mockResolvedValue(undefined),
    })
  ),
  DeleteShiftDirection: { left: 'left', up: 'up' },
  InsertShiftDirection: { right: 'right', down: 'down' },
};

const mockLoadSnap = jest.fn<Promise<SheetSnapshot | null>, [unknown, string]>();
jest.mock('../../src/utils/ExcelHelper', () => ({
  excelHelper: { loadSheetSnapshot: (...a: unknown[]) => mockLoadSnap(a[0], a[1] as string) },
}));
jest.mock('../../src/utils/Logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import { LineSyncer } from '../../src/v2/LineSyncer';

// ─── 辅助 ────────────────────────────────────────────────

function vt(entries: Array<{ name: string; field: string }>): Map<string, VersionTemplate> {
  const m = new Map<string, VersionTemplate>();
  for (const e of entries) {
    const id = parseInt(e.field.replace('roads_', ''));
    m.set(e.name, { name: e.name, lineId: id, lineField: e.field, gitDirectory: '' });
  }
  return m;
}

/** 布局B：仅 version_r */
function snapB(name: string, roads: string[], descs?: string[]): SheetSnapshot {
  const r0: (string | null)[] = ['version_r', ...roads, '', '#配置区域#', 'id=int'];
  const r1: (string | null)[] = ['版本行属', ...(descs || roads.map(() => '')), '', '', '编号'];
  return { name, values: [r0, r1], rowCount: 2, colCount: r0.length, startRow: 0, startCol: 0 };
}

/** 布局A：version_c + roads 行 + gap + version_r */
function snapA(
  name: string,
  vrRoads: string[],
  vcRoads: Array<{ label: string; field: string }>,
  descs?: string[],
): SheetSnapshot {
  const cfgCol = 1 + vrRoads.length + 1;
  const w = cfgCol + 1 + 2;
  const fill = () => Array(w).fill(null) as (string | number | null)[];

  const vcRow = fill();
  vcRow[cfgCol - 1] = '版本列属'; vcRow[cfgCol] = 'version_c'; vcRow[cfgCol + 1] = 1; vcRow[cfgCol + 2] = 1;

  const vcRows = vcRoads.map(vr => {
    const r = fill(); r[cfgCol - 1] = vr.label; r[cfgCol] = vr.field; r[cfgCol + 1] = 1; r[cfgCol + 2] = 1;
    return r;
  });

  const vrRow = fill();
  vrRow[0] = 'version_r';
  vrRoads.forEach((rd, i) => { vrRow[1 + i] = rd; });
  vrRow[cfgCol] = '#配置区域#'; vrRow[cfgCol + 1] = 'id=int'; vrRow[cfgCol + 2] = 'name=string';

  const descRow = fill();
  descRow[0] = '版本行属';
  (descs || vrRoads.map(() => '')).forEach((d, i) => { descRow[1 + i] = d; });

  const values = [vcRow, ...vcRows, fill(), fill(), vrRow, descRow];
  return { name, values, rowCount: values.length, colCount: w, startRow: 0, startCol: 0 };
}

// ─── 测试 ────────────────────────────────────────────────

describe('LineSyncer', () => {
  let syncer: LineSyncer;
  beforeEach(() => { syncer = new LineSyncer(); rangeCalls = []; jest.clearAllMocks(); });

  describe('计数', () => {
    it('所有表算已同步', async () => {
      mockLoadSnap.mockResolvedValue(snapB('T', ['roads_0']));
      const r = await syncer.syncAllTables(vt([]), ['T']);
      expect(r.synced).toBe(1);
      expect(r.skipped).toBe(0);
    });

    it('异常计入 errors', async () => {
      mockLoadSnap.mockRejectedValue(new Error('x'));
      const r = await syncer.syncAllTables(vt([]), ['T']);
      expect(r.errors).toEqual(['T']);
    });
  });

  describe('第一阶段：version_r 列同步', () => {
    it('删除多余的 roads 列（整列）', async () => {
      mockLoadSnap.mockResolvedValue(snapB('T', ['roads_0', 'roads_1', 'roads_2']));
      await syncer.syncAllTables(vt([]), ['T']); // 只需要 roads_0

      const delCalls = rangeCalls.filter(c => c.colDeleted);
      expect(delCalls.length).toBe(2);
    });

    it('添加缺失的 roads 列（整列）', async () => {
      mockLoadSnap.mockResolvedValue(snapB('T', ['roads_0']));
      await syncer.syncAllTables(vt([{ name: '国内', field: 'roads_1' }, { name: '韩国', field: 'roads_2' }]), ['T']);

      const insCalls = rangeCalls.filter(c => c.colInserted);
      // 批量插入：1 次调用插入 2 列（colCount=2）
      expect(insCalls.length).toBe(1);
      expect(insCalls[0].colCount).toBe(2);
    });

    it('完全匹配时不增删列', async () => {
      mockLoadSnap.mockResolvedValue(snapB('T', ['roads_0', 'roads_1'], ['默认', '国内']));
      await syncer.syncAllTables(vt([{ name: '国内', field: 'roads_1' }]), ['T']);

      expect(rangeCalls.filter(c => c.colDeleted).length).toBe(0);
      expect(rangeCalls.filter(c => c.colInserted).length).toBe(0);
    });
  });

  describe('第二阶段：version_c 行同步', () => {
    it('删除多余的 roads 行（整行）', async () => {
      // version_c 有 roads_0, roads_1, roads_2，但只需要 roads_0, roads_1
      const snap = snapA('S', ['roads_0', 'roads_1'],
        [{ label: '默认', field: 'roads_0' }, { label: '国内', field: 'roads_1' }, { label: '多余', field: 'roads_2' }],
        ['默认', '国内'],
      );
      mockLoadSnap.mockResolvedValue(snap);

      await syncer.syncAllTables(vt([{ name: '国内', field: 'roads_1' }]), ['S']);

      const rowDels = rangeCalls.filter(c => c.rowDeleted);
      expect(rowDels.length).toBe(1);
    });

    it('添加缺失的 roads 行（整行）', async () => {
      // version_c 只有 roads_0，缺 roads_1
      const snap = snapA('S', ['roads_0', 'roads_1'],
        [{ label: '默认', field: 'roads_0' }],
        ['默认', '国内'],
      );
      mockLoadSnap.mockResolvedValue(snap);

      await syncer.syncAllTables(vt([{ name: '国内', field: 'roads_1' }]), ['S']);

      const rowIns = rangeCalls.filter(c => c.rowInserted);
      expect(rowIns.length).toBe(1);
    });

    it('无 version_c 时跳过行同步', async () => {
      mockLoadSnap.mockResolvedValue(snapB('T', ['roads_0', 'roads_1'], ['默认', '国内']));
      await syncer.syncAllTables(vt([{ name: '国内', field: 'roads_1' }]), ['T']);

      expect(rangeCalls.filter(c => c.rowDeleted).length).toBe(0);
      expect(rangeCalls.filter(c => c.rowInserted).length).toBe(0);
    });

    it('R+c 模式（无 roads 行）不触发行增删', async () => {
      // version_c 存在但没有 roads 行（只有空行间隔）
      const snap = snapA('S', ['roads_0', 'roads_1'], [], ['默认', '国内']);
      mockLoadSnap.mockResolvedValue(snap);

      await syncer.syncAllTables(vt([{ name: '国内', field: 'roads_1' }]), ['S']);

      expect(rangeCalls.filter(c => c.rowDeleted).length).toBe(0);
      expect(rangeCalls.filter(c => c.rowInserted).length).toBe(0);
    });
  });

  describe('第三阶段：版本名同步', () => {
    it('roads_0 固定写"默认"', async () => {
      mockLoadSnap.mockResolvedValue(snapB('T', ['roads_0', 'roads_1'], ['', '']));
      await syncer.syncAllTables(vt([{ name: '国内', field: 'roads_1' }]), ['T']);

      expect(rangeCalls.find(c => c.row === 1 && c.col === 1 && c.values?.[0]?.[0] === '默认')).toBeDefined();
      expect(rangeCalls.find(c => c.row === 1 && c.col === 2 && c.values?.[0]?.[0] === '国内')).toBeDefined();
    });

    it('已正确则不写入', async () => {
      mockLoadSnap.mockResolvedValue(snapB('T', ['roads_0', 'roads_1'], ['默认', '国内']));
      await syncer.syncAllTables(vt([{ name: '国内', field: 'roads_1' }]), ['T']);

      expect(rangeCalls.filter(c => c.values).length).toBe(0);
    });

    it('更新 version_c 标签', async () => {
      const snap = snapA('S', ['roads_0', 'roads_1'],
        [{ label: '', field: 'roads_0' }, { label: '', field: 'roads_1' }],
        ['默认', '国内'],
      );
      mockLoadSnap.mockResolvedValue(snap);

      await syncer.syncAllTables(vt([{ name: '国内', field: 'roads_1' }]), ['S']);

      const cfgCol = 1 + 2 + 1; // = 4
      const labelCol = cfgCol - 1; // = 3
      const labelWrites = rangeCalls.filter(c => c.col === labelCol && c.values);
      const labels = labelWrites.map(c => c.values![0][0]);
      expect(labels).toContain('默认');
      expect(labels).toContain('国内');
    });
  });

  describe('搜索范围', () => {
    it('version_r 在第15行也能找到', async () => {
      const rows: (string | number | null)[][] = [];
      for (let i = 0; i < 15; i++) rows.push([null]);
      rows.push(['version_r', 'roads_0', '', '#配置区域#', 'id=int']);
      rows.push(['版本行属', '', '', '', '编号']);

      mockLoadSnap.mockResolvedValue({ name: 'D', values: rows, rowCount: rows.length, colCount: 5, startRow: 0, startCol: 0 });
      const r = await syncer.syncAllTables(vt([]), ['D']);
      expect(r.synced).toBe(1);
      expect(rangeCalls.find(c => c.row === 16 && c.values?.[0]?.[0] === '默认')).toBeDefined();
    });
  });
});
