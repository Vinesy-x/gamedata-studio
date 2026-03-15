import { VersionPreviewer, PreviewResult } from '../../src/v3/VersionPreviewer';
import { Config, VersionTemplate, LineTemplate } from '../../src/types/config';
import { SheetData } from '../../src/utils/ExcelHelper';

/**
 * 创建最小化的 Config 对象用于测试
 */
function makeConfig(overrides: {
  versionName?: string;
  lineField?: string;
} = {}): Config {
  const versionTemplates = new Map<string, VersionTemplate>();
  versionTemplates.set('测试版本', {
    name: '测试版本',
    lineId: 1,
    lineField: overrides.lineField || 'roads_0',
    gitDirectory: '',
  });

  const lineTemplates = new Map<number, LineTemplate>();
  lineTemplates.set(1, { id: 1, field: overrides.lineField || 'roads_0', remark: '测试' });

  return {
    versionTemplates,
    lineTemplates,
    tablesToProcess: new Map(),
    outputSettings: {
      versionName: overrides.versionName || '测试版本',
      versionNumber: 0,
      versionSequence: 0,
      outputDirectory: '',
    },
    gitCommitTemplate: '',
    staffCodes: new Map(),
    showResourcePopup: false,
  };
}

/**
 * 构建典型的表数据 snapshot
 *
 * 表结构布局：
 *   Row 0: [version_r, roads_0, roads_1, #配置区域#, field1, field2, ...]
 *   Row 1: [版本行属,  简体,    中文,    '',         描述1,  描述2,  ...]
 *   Row 2+: 数据行 [版本区间, roads_0值, roads_1值, '', 数据1, 数据2, ...]
 */
function makeSheetData(opts: {
  headers?: string[];
  descriptions?: string[];
  dataRows: {
    versionRange: string;
    roads0?: string | number;
    roads1?: string | number;
    values: (string | number | null)[];
  }[];
  versionC?: {
    labels: string[];
    data: (string | number | null)[][];
  };
}): SheetData {
  const headers = opts.headers || ['id=int', 'name=string', 'value=int'];
  const descriptions = opts.descriptions || ['ID', '名称', '数值'];
  const hasRoads1 = opts.dataRows.some(r => r.roads1 !== undefined);

  const rows: SheetData = [];
  const versionCRows = opts.versionC ? opts.versionC.labels.length : 0;

  // version_c 行（如果有）
  if (opts.versionC) {
    for (let i = 0; i < opts.versionC.labels.length; i++) {
      const label = opts.versionC.labels[i];
      // version_c 区域位于 version_r 之上
      // 左侧列放标签，右侧对齐数据列
      const row: (string | number | boolean | null)[] = [];
      // A列留空（version_c 标签不在 A 列，通常在某个固定列）
      // 为简化测试，把 version_c 标签放在 col 0，数据从 col 1 开始
      // 但实际上 version_c 的数据需要对齐 mainData 的数据列
      // 按照 DataLoader 的逻辑，version_c 数据列从 versionCCol+1 开始，对齐 dataStartCol
      // 这里我们把 version_c 放在 configAreaCol 的位置（即 col 3 如果有 roads_1，col 2 如果没有）
      const configAreaCol = hasRoads1 ? 3 : 2;
      for (let c = 0; c < configAreaCol; c++) {
        row.push(null);
      }
      row.push(label); // configAreaCol 位置放标签
      // 数据列
      for (const val of opts.versionC.data[i]) {
        row.push(val);
      }
      rows.push(row);
    }
  }

  // version_r 行（表头行0）
  const configAreaCol = hasRoads1 ? 3 : 2;
  const vrRow: (string | number | boolean | null)[] = ['version_r', 'roads_0'];
  if (hasRoads1) vrRow.push('roads_1');
  vrRow.push('#配置区域#');
  for (const h of headers) vrRow.push(h);
  rows.push(vrRow);

  // 描述行（表头行1）
  const descRow: (string | number | boolean | null)[] = ['版本行属', '简体'];
  if (hasRoads1) descRow.push('简体中文');
  descRow.push('');
  for (const d of descriptions) descRow.push(d);
  rows.push(descRow);

  // 数据行
  for (const dr of opts.dataRows) {
    const row: (string | number | boolean | null)[] = [
      dr.versionRange,
      dr.roads0 ?? '1',
    ];
    if (hasRoads1) row.push(dr.roads1 ?? '1');
    row.push(''); // #配置区域# 列为空
    for (const v of dr.values) row.push(v);
    rows.push(row);
  }

  return rows;
}

describe('VersionPreviewer', () => {
  let previewer: VersionPreviewer;

  beforeEach(() => {
    previewer = new VersionPreviewer();
  });

  describe('基本版本筛选（行排除）', () => {
    it('排除版本区间外的行', () => {
      const config = makeConfig();
      const snapshots = new Map<string, SheetData>();

      snapshots.set('测试表', makeSheetData({
        dataRows: [
          { versionRange: '1', values: [1, '物品A', 100] },         // 版本1.0+ → 7.5 在范围内 → 保留
          { versionRange: '8', values: [2, '物品B', 200] },         // 版本8.0+ → 7.5 不在范围内 → 排除
          { versionRange: '1~5', values: [3, '物品C', 300] },       // 版本1~5 → 7.5 不在范围内 → 排除
          { versionRange: '7~8', values: [4, '物品D', 400] },       // 版本7~8 → 7.5 在范围内 → 保留
        ],
      }));

      const results = previewer.previewFromSnapshots('测试版本', 7.5, config, snapshots);

      expect(results).toHaveLength(1);
      const r = results[0];
      expect(r.tableName).toBe('测试表');
      expect(r.originalRows).toBe(4);
      expect(r.excludedRows).toEqual([1, 2]); // dataRow index 1 和 2 被排除
      expect(r.filteredRows).toBe(4); // 2表头 + 2保留数据行
    });

    it('空版本区间行在版本0时通过', () => {
      const config = makeConfig();
      const snapshots = new Map<string, SheetData>();

      snapshots.set('测试表', makeSheetData({
        dataRows: [
          { versionRange: '', values: [1, '空版本', 100] },    // {0, 0.1} → 0 在范围内
          { versionRange: '1', values: [2, '版本1', 200] },    // {1, 99} → 0 不在范围内
        ],
      }));

      const results = previewer.previewFromSnapshots('测试版本', 0, config, snapshots);

      expect(results).toHaveLength(1);
      expect(results[0].excludedRows).toEqual([1]);
      expect(results[0].filteredRows).toBe(3); // 2表头 + 1数据行
    });

    it('带字母后缀的版本区间', () => {
      const config = makeConfig();
      const snapshots = new Map<string, SheetData>();

      snapshots.set('测试表', makeSheetData({
        dataRows: [
          { versionRange: '3.5a', values: [1, '保留', 100] },       // {3.5, 99} → 4.0 在范围内
          { versionRange: '5.0a', values: [2, '排除', 200] },       // {5.0, 99} → 4.0 不在范围内
          { versionRange: '1.2s~4.5s', values: [3, '保留2', 300] }, // {1.2, 4.5} → 4.0 在范围内
        ],
      }));

      const results = previewer.previewFromSnapshots('测试版本', 4.0, config, snapshots);

      expect(results[0].excludedRows).toEqual([1]);
      expect(results[0].filteredRows).toBe(4); // 2表头 + 2数据行
    });
  });

  describe('列版本筛选（有 version_c 时）', () => {
    it('排除版本区间外的列', () => {
      const config = makeConfig();
      const snapshots = new Map<string, SheetData>();

      // version_c 的数据列对应 mainData 的3个数据列
      snapshots.set('列筛选表', makeSheetData({
        headers: ['id=int', 'col_a=string', 'col_b=string'],
        descriptions: ['ID', '列A', '列B'],
        dataRows: [
          { versionRange: '1', values: [1, 'a1', 'b1'] },
          { versionRange: '1', values: [2, 'a2', 'b2'] },
        ],
        versionC: {
          labels: ['version_c'],
          data: [
            ['1', '1', '5.0'],  // col_b 版本5.0+ → 1.5 不在范围内 → 排除
          ],
        },
      }));

      const results = previewer.previewFromSnapshots('测试版本', 1.5, config, snapshots);

      expect(results).toHaveLength(1);
      expect(results[0].excludedCols).toEqual([2]); // col_b (index 2) 被排除
      expect(results[0].filteredCols).toBe(2); // 3列 - 1排除 = 2列
    });

    it('列线路筛选 — roads_0=0 排除列', () => {
      const config = makeConfig();
      const snapshots = new Map<string, SheetData>();

      snapshots.set('列线路表', makeSheetData({
        headers: ['id=int', 'col_a=string', 'col_b=string'],
        descriptions: ['ID', '列A', '列B'],
        dataRows: [
          { versionRange: '1', values: [1, 'a1', 'b1'] },
        ],
        versionC: {
          labels: ['version_c', 'roads_0'],
          data: [
            ['1', '1', '1'],   // version_c: 所有列版本通过
            ['1', '1', '0'],   // roads_0: col_b=0 → 排除
          ],
        },
      }));

      const results = previewer.previewFromSnapshots('测试版本', 7.5, config, snapshots);

      expect(results[0].excludedCols).toEqual([2]); // col_b 被排除
    });
  });

  describe('重复 Key 覆盖检测', () => {
    it('检测同 Key 被后面的行覆盖', () => {
      const config = makeConfig();
      const snapshots = new Map<string, SheetData>();

      snapshots.set('重复Key表', makeSheetData({
        dataRows: [
          { versionRange: '1', values: [3, '旧值', 100] },       // Key=3，被下一行覆盖
          { versionRange: '1.2', values: [3, '新值', 200] },     // Key=3，覆盖上一行
          { versionRange: '1', values: [4, '其他', 300] },       // Key=4，不重复
        ],
      }));

      const results = previewer.previewFromSnapshots('测试版本', 7.5, config, snapshots);

      expect(results[0].overriddenRows).toEqual([0]); // 第0行数据被覆盖
      expect(results[0].filteredRows).toBe(4); // 2表头 + 3保留数据行 - 1被覆盖行 = 4
    });

    it('被排除行不参与重复Key检测', () => {
      const config = makeConfig();
      const snapshots = new Map<string, SheetData>();

      snapshots.set('排除后Key表', makeSheetData({
        dataRows: [
          { versionRange: '1', values: [3, '旧值', 100] },       // Key=3, 保留
          { versionRange: '8', values: [3, '高版本值', 200] },   // Key=3, 但被版本排除
          { versionRange: '1', values: [4, '其他', 300] },       // Key=4
        ],
      }));

      const results = previewer.previewFromSnapshots('测试版本', 7.5, config, snapshots);

      // 行1被版本排除，剩余保留行中 Key=3 只有1行，不存在覆盖
      expect(results[0].excludedRows).toEqual([1]);
      expect(results[0].overriddenRows).toEqual([]);
    });

    it('多行相同Key，只有最后一行保留', () => {
      const config = makeConfig();
      const snapshots = new Map<string, SheetData>();

      snapshots.set('多重复Key表', makeSheetData({
        dataRows: [
          { versionRange: '1', values: [5, '第一版', 100] },
          { versionRange: '1.5', values: [5, '第二版', 200] },
          { versionRange: '2', values: [5, '第三版', 300] },
        ],
      }));

      const results = previewer.previewFromSnapshots('测试版本', 7.5, config, snapshots);

      // 前两行都被覆盖
      expect(results[0].overriddenRows).toEqual([0, 1]);
      expect(results[0].filteredRows).toBe(3); // 2表头 + 3 - 2覆盖 = 3
    });
  });

  describe('roads 线路筛选', () => {
    it('roads_0=0 排除行', () => {
      const config = makeConfig();
      const snapshots = new Map<string, SheetData>();

      snapshots.set('线路表', makeSheetData({
        dataRows: [
          { versionRange: '1', roads0: '1', values: [1, '保留', 100] },
          { versionRange: '1', roads0: '0', values: [2, '排除', 200] },
          { versionRange: '1', roads0: '1', values: [3, '保留2', 300] },
        ],
      }));

      const results = previewer.previewFromSnapshots('测试版本', 7.5, config, snapshots);

      expect(results[0].excludedRows).toEqual([1]);
    });

    it('目标线路筛选 — roads_1=0 排除行', () => {
      const config = makeConfig({ lineField: 'roads_1' });
      const snapshots = new Map<string, SheetData>();

      snapshots.set('目标线路表', makeSheetData({
        dataRows: [
          { versionRange: '1', roads0: '1', roads1: '1', values: [1, '保留', 100] },
          { versionRange: '1', roads0: '1', roads1: '0', values: [2, '排除', 200] },
        ],
      }));

      const results = previewer.previewFromSnapshots('测试版本', 7.5, config, snapshots);

      expect(results[0].excludedRows).toEqual([1]);
    });

    it('roads_0 不再是总线路 — roads_0=0 不影响目标 roads_1', () => {
      const config = makeConfig({ lineField: 'roads_1' });
      const snapshots = new Map<string, SheetData>();

      snapshots.set('独立线路表', makeSheetData({
        dataRows: [
          { versionRange: '1', roads0: '0', roads1: '1', values: [1, '保留', 100] },
        ],
      }));

      const results = previewer.previewFromSnapshots('测试版本', 7.5, config, snapshots);

      // roads_0=0 但目标是 roads_1=1，行应保留
      expect(results[0].excludedRows).toEqual([]);
    });
  });

  describe('空表/无 version_r 表的处理', () => {
    it('空 snapshot 被跳过', () => {
      const config = makeConfig();
      const snapshots = new Map<string, SheetData>();
      snapshots.set('空表', []);

      const results = previewer.previewFromSnapshots('测试版本', 7.5, config, snapshots);

      expect(results).toHaveLength(0);
    });

    it('无 version_r 的表全量输出', () => {
      const config = makeConfig();
      const snapshots = new Map<string, SheetData>();

      // 不包含 version_r 标记的表
      snapshots.set('全量表', [
        ['id=int', 'name=string', 'value=int'],
        ['ID', '名称', '数值'],
        [1, '物品A', 100],
        [2, '物品B', 200],
        [3, '物品C', 300],
      ]);

      const results = previewer.previewFromSnapshots('测试版本', 7.5, config, snapshots);

      expect(results).toHaveLength(1);
      const r = results[0];
      expect(r.excludedRows).toEqual([]);
      expect(r.excludedCols).toEqual([]);
      expect(r.overriddenRows).toEqual([]);
      expect(r.originalRows).toBe(5);
      expect(r.filteredRows).toBe(5);
    });

    it('version_r 存在但无 #配置区域# 标记返回 null', () => {
      const config = makeConfig();
      const snapshots = new Map<string, SheetData>();

      snapshots.set('缺失配置区域', [
        ['version_r', 'roads_0'],
        ['版本行属', '简体'],
        ['1', '1'],
      ]);

      const results = previewer.previewFromSnapshots('测试版本', 7.5, config, snapshots);

      // analyzeTable 返回 null，不加入结果
      expect(results).toHaveLength(0);
    });
  });

  describe('综合场景', () => {
    it('多张表同时预览', () => {
      const config = makeConfig();
      const snapshots = new Map<string, SheetData>();

      snapshots.set('表1', makeSheetData({
        dataRows: [
          { versionRange: '1', values: [1, '保留', 100] },
          { versionRange: '8', values: [2, '排除', 200] },
        ],
      }));

      snapshots.set('表2', makeSheetData({
        dataRows: [
          { versionRange: '1', values: [10, '全保留', 500] },
          { versionRange: '2', values: [20, '全保留', 600] },
        ],
      }));

      const results = previewer.previewFromSnapshots('测试版本', 7.5, config, snapshots);

      expect(results).toHaveLength(2);
      expect(results[0].excludedRows).toEqual([1]);
      expect(results[1].excludedRows).toEqual([]);
    });

    it('行列同时筛选 + 重复Key', () => {
      const config = makeConfig();
      const snapshots = new Map<string, SheetData>();

      snapshots.set('综合表', makeSheetData({
        headers: ['id=int', 'col_a=string', 'col_b=string'],
        descriptions: ['ID', '列A', '列B'],
        dataRows: [
          { versionRange: '1', values: [1, 'a1', 'b1'] },       // 保留
          { versionRange: '3', values: [2, 'a2', 'b2'] },       // 版本排除
          { versionRange: '1.5', values: [1, 'a3', 'b3'] },     // 保留, 覆盖 row 0
        ],
        versionC: {
          labels: ['version_c'],
          data: [
            ['1', '1', '5.0'],  // col_b 版本5.0+ → 排除
          ],
        },
      }));

      const results = previewer.previewFromSnapshots('测试版本', 2.0, config, snapshots);

      expect(results).toHaveLength(1);
      const r = results[0];
      expect(r.excludedRows).toEqual([1]);        // 行1版本排除
      expect(r.excludedCols).toEqual([2]);         // col_b 列排除
      expect(r.overriddenRows).toEqual([0]);       // 行0被行2覆盖（Key=1）
    });
  });

  describe('determineLineField 回退逻辑', () => {
    it('版本名不在配置中时回退为 roads_0', () => {
      const config = makeConfig();
      const snapshots = new Map<string, SheetData>();

      snapshots.set('回退表', makeSheetData({
        dataRows: [
          { versionRange: '1', roads0: '0', values: [1, '排除', 100] },
          { versionRange: '1', roads0: '1', values: [2, '保留', 200] },
        ],
      }));

      // 使用一个不存在的版本名，应回退到 roads_0
      const results = previewer.previewFromSnapshots('不存在的版本', 7.5, config, snapshots);

      expect(results).toHaveLength(1);
      expect(results[0].excludedRows).toEqual([0]); // roads_0=0 被排除
    });
  });

  describe('列筛选 — 目标线路排除列', () => {
    it('version_c 中 roads_1=0 排除列（目标线路非 roads_0）', () => {
      const config = makeConfig({ lineField: 'roads_1' });
      const snapshots = new Map<string, SheetData>();

      snapshots.set('列目标线路表', makeSheetData({
        headers: ['id=int', 'col_a=string', 'col_b=string'],
        descriptions: ['ID', '列A', '列B'],
        dataRows: [
          { versionRange: '1', roads0: '1', roads1: '1', values: [1, 'a1', 'b1'] },
        ],
        versionC: {
          labels: ['version_c', 'roads_0', 'roads_1'],
          data: [
            ['1', '1', '1'],   // version_c: 全部通过
            ['1', '1', '1'],   // roads_0: 全部通过
            ['1', '0', '1'],   // roads_1: col_a=0 → 排除
          ],
        },
      }));

      const results = previewer.previewFromSnapshots('测试版本', 7.5, config, snapshots);

      expect(results).toHaveLength(1);
      expect(results[0].excludedCols).toEqual([1]); // col_a (index 1) 被 roads_1=0 排除
    });

    it('列版本区间+目标线路双重过滤（roads_0 不再是总线路）', () => {
      const config = makeConfig({ lineField: 'roads_1' });
      const snapshots = new Map<string, SheetData>();

      snapshots.set('双重列过滤', makeSheetData({
        headers: ['id=int', 'col_a=string', 'col_b=string', 'col_c=string'],
        descriptions: ['ID', '列A', '列B', '列C'],
        dataRows: [
          { versionRange: '1', roads0: '1', roads1: '1', values: [1, 'a1', 'b1', 'c1'] },
        ],
        versionC: {
          labels: ['version_c', 'roads_0', 'roads_1'],
          data: [
            ['1', '1', '8',  '1'],     // version_c: col_b 版本8+ → 排除
            ['1', '1', '1',  '0'],     // roads_0: col_c=0（但不检查，不是目标线路）
            ['1', '1', '1',  '0'],     // roads_1: col_c=0 → 排除
          ],
        },
      }));

      const results = previewer.previewFromSnapshots('测试版本', 3.0, config, snapshots);

      expect(results).toHaveLength(1);
      // col_b(idx 2) 被版本排除, col_c(idx 3) 被 roads_1=0 排除
      expect(results[0].excludedCols).toEqual(expect.arrayContaining([2, 3]));
      expect(results[0].excludedCols).toHaveLength(2);
      expect(results[0].filteredCols).toBe(2); // 4 - 2 = 2
    });
  });

  describe('边界场景', () => {
    it('所有数据行都被排除', () => {
      const config = makeConfig();
      const snapshots = new Map<string, SheetData>();

      snapshots.set('全排除表', makeSheetData({
        dataRows: [
          { versionRange: '8', values: [1, '排除1', 100] },
          { versionRange: '9', values: [2, '排除2', 200] },
        ],
      }));

      const results = previewer.previewFromSnapshots('测试版本', 2.0, config, snapshots);

      expect(results).toHaveLength(1);
      expect(results[0].excludedRows).toEqual([0, 1]);
      expect(results[0].overriddenRows).toEqual([]);
      expect(results[0].filteredRows).toBe(2); // 2表头 + 0数据行
    });

    it('所有数据列都被排除', () => {
      const config = makeConfig();
      const snapshots = new Map<string, SheetData>();

      snapshots.set('全列排除表', makeSheetData({
        headers: ['id=int', 'col_a=string'],
        descriptions: ['ID', '列A'],
        dataRows: [
          { versionRange: '1', values: [1, 'a1'] },
        ],
        versionC: {
          labels: ['version_c'],
          data: [
            ['8', '8'],  // 所有列版本8+ → 版本2不在范围 → 全排除
          ],
        },
      }));

      const results = previewer.previewFromSnapshots('测试版本', 2.0, config, snapshots);

      expect(results).toHaveLength(1);
      expect(results[0].excludedCols).toEqual([0, 1]);
      expect(results[0].filteredCols).toBe(0);
    });

    it('空 Key 行不参与覆盖检测', () => {
      const config = makeConfig();
      const snapshots = new Map<string, SheetData>();

      snapshots.set('空Key表', makeSheetData({
        dataRows: [
          { versionRange: '1', values: [null, '空Key1', 100] },
          { versionRange: '1', values: [null, '空Key2', 200] },
          { versionRange: '1', values: [1, '有Key', 300] },
        ],
      }));

      const results = previewer.previewFromSnapshots('测试版本', 7.5, config, snapshots);

      expect(results).toHaveLength(1);
      // 空 Key 行不参与覆盖检测
      expect(results[0].overriddenRows).toEqual([]);
    });

    it('roads_0 值为版本区间字符串（非0/1）', () => {
      const config = makeConfig();
      const snapshots = new Map<string, SheetData>();

      snapshots.set('区间线路表', makeSheetData({
        dataRows: [
          { versionRange: '1', roads0: '1~5', values: [1, '排除', 100] },   // 版本7.5不在1~5 → 排除
          { versionRange: '1', roads0: '1~10', values: [2, '保留', 200] },  // 版本7.5在1~10 → 保留
        ],
      }));

      const results = previewer.previewFromSnapshots('测试版本', 7.5, config, snapshots);

      expect(results[0].excludedRows).toEqual([0]);
    });

    it('单行数据无重复Key', () => {
      const config = makeConfig();
      const snapshots = new Map<string, SheetData>();

      snapshots.set('单行表', makeSheetData({
        dataRows: [
          { versionRange: '1', values: [1, '唯一', 100] },
        ],
      }));

      const results = previewer.previewFromSnapshots('测试版本', 7.5, config, snapshots);

      expect(results).toHaveLength(1);
      expect(results[0].originalRows).toBe(1);
      expect(results[0].excludedRows).toEqual([]);
      expect(results[0].overriddenRows).toEqual([]);
      expect(results[0].filteredRows).toBe(3); // 2表头 + 1数据行
    });
  });
});
