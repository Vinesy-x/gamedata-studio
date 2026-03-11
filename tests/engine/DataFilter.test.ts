import { DataFilter } from '../../src/engine/DataFilter';
import { VersionFilter } from '../../src/engine/VersionFilter';
import { InMemoryTableData, CellValue } from '../../src/types/table';

describe('DataFilter', () => {
  describe('applyFilters - 行筛选', () => {
    it('基本行版本筛选', () => {
      const vf = new VersionFilter(7.5, 'roads_1');
      const df = new DataFilter(vf);

      const tableData: InMemoryTableData = {
        sourceSheetName: '测试表',
        mainData: [
          // Row 0: 字段定义行
          ['id=int', 'name=string', 'value=int'],
          // Row 1: 中文描述行
          ['ID', '名称', '数值'],
          // Row 2: 数据行 - 版本1.0+ → 保留
          [1, '物品A', 100],
          // Row 3: 数据行 - 版本8.0+ → 排除
          [2, '物品B', 200],
          // Row 4: 数据行 - 版本1.0~5.0 → 排除
          [3, '物品C', 300],
        ],
        versionRowData: [
          // Row 0: 表头（version_r, roads_0, roads_1）
          ['version_r', 'roads_0', 'roads_1'],
          // Row 1: 中文描述行
          ['版本行属', '简体', '简体中文线路'],
          // Row 2: 版本1.0+, roads_0=1, roads_1=1
          ['1', '1', '1'],
          // Row 3: 版本8.0+, roads_0=1, roads_1=1
          ['8', '1', '1'],
          // Row 4: 版本1.0~5.0, roads_0=1, roads_1=1
          ['1~5', '1', '1'],
        ],
        versionColData: null,
        versionColLabels: null,
        hasVersionRowFlag: true,
        hasVersionColFlag: false,
      };

      const result = df.applyFilters(tableData);

      // 应保留表头2行 + 第一行数据 = 3行
      expect(result.rowCount).toBe(3);
      expect(result.data[2][0]).toBe(1); // 物品A
    });

    it('线路筛选 - roads_0 排除', () => {
      const vf = new VersionFilter(7.5, 'roads_1');
      const df = new DataFilter(vf);

      const tableData: InMemoryTableData = {
        sourceSheetName: '测试表',
        mainData: [
          ['id=int', 'name=string'],
          ['ID', '名称'],
          [1, '保留'],
          [2, '排除'],
        ],
        versionRowData: [
          ['version_r', 'roads_0', 'roads_1'],
          ['版本行属', '简体', '简体中文'],
          ['1', '1', '1'],   // roads_0=1, roads_1=1 → 保留
          ['1', '0', '1'],   // roads_0=0 → 排除
        ],
        versionColData: null,
        versionColLabels: null,
        hasVersionRowFlag: true,
        hasVersionColFlag: false,
      };

      const result = df.applyFilters(tableData);
      expect(result.rowCount).toBe(3); // 2表头 + 1数据
    });

    it('目标线路排除', () => {
      const vf = new VersionFilter(7.5, 'roads_1');
      const df = new DataFilter(vf);

      const tableData: InMemoryTableData = {
        sourceSheetName: '测试表',
        mainData: [
          ['id=int', 'name=string'],
          ['ID', '名称'],
          [1, '保留'],
          [2, '排除'],
        ],
        versionRowData: [
          ['version_r', 'roads_0', 'roads_1'],
          ['版本行属', '简体', '简体中文'],
          ['1', '1', '1'],   // → 保留
          ['1', '1', '0'],   // roads_1=0 → 排除
        ],
        versionColData: null,
        versionColLabels: null,
        hasVersionRowFlag: true,
        hasVersionColFlag: false,
      };

      const result = df.applyFilters(tableData);
      expect(result.rowCount).toBe(3);
      expect(result.data[2][1]).toBe('保留');
    });
  });

  describe('applyFilters - 重复Key处理', () => {
    it('相同Key保留后面的行', () => {
      const vf = new VersionFilter(7.5, 'roads_1');
      const df = new DataFilter(vf);

      const tableData: InMemoryTableData = {
        sourceSheetName: '配置表',
        mainData: [
          ['id=int', 'param=string', 'value=string'],
          ['ID', '参数名', '参数值'],
          [3, 'SUMMONS', '旧值'],
          [3, 'SUMMONS', '新值'], // 相同Key，应覆盖
          [4, 'OTHER', '其他'],
        ],
        versionRowData: [
          ['version_r', 'roads_0', 'roads_1'],
          ['版本行属', '简体', '简体中文'],
          ['1', '1', '1'],
          ['1.2', '1', '1'],
          ['1', '1', '1'],
        ],
        versionColData: null,
        versionColLabels: null,
        hasVersionRowFlag: true,
        hasVersionColFlag: false,
      };

      const result = df.applyFilters(tableData);

      // 2表头 + 2数据（id=3去重为1行 + id=4为1行）
      expect(result.rowCount).toBe(4);
      // id=3 应该是新值
      const row3 = result.data.find(r => r[0] === 3);
      expect(row3![2]).toBe('新值');
    });
  });

  describe('applyFilters - 无数据', () => {
    it('空数据表', () => {
      const vf = new VersionFilter(7.5, 'roads_0');
      const df = new DataFilter(vf);

      const tableData: InMemoryTableData = {
        sourceSheetName: '空表',
        mainData: [],
        versionRowData: null,
        versionColData: null,
        versionColLabels: null,
        hasVersionRowFlag: false,
        hasVersionColFlag: false,
      };

      const result = df.applyFilters(tableData);
      expect(result.shouldOutput).toBe(false);
    });

    it('只有表头无数据行', () => {
      const vf = new VersionFilter(7.5, 'roads_0');
      const df = new DataFilter(vf);

      const tableData: InMemoryTableData = {
        sourceSheetName: '只有表头',
        mainData: [
          ['id=int', 'name=string'],
          ['ID', '名称'],
        ],
        versionRowData: [
          ['version_r', 'roads_0'],
          ['版本行属', '简体'],
        ],
        versionColData: null,
        versionColLabels: null,
        hasVersionRowFlag: true,
        hasVersionColFlag: false,
      };

      const result = df.applyFilters(tableData);
      expect(result.shouldOutput).toBe(false);
    });
  });

  describe('applyFilters - 列筛选 (version_c)', () => {
    it('列版本区间筛选 — 排除高版本列', () => {
      const vf = new VersionFilter(1.5, 'roads_1');
      const df = new DataFilter(vf);

      const tableData: InMemoryTableData = {
        sourceSheetName: '列筛选表',
        mainData: [
          // 字段定义行：4列数据
          ['id=int', 'col_a=string', 'col_b=string', 'col_c=string'],
          // 中文描述行
          ['ID', '列A', '列B', '列C'],
          // 数据行
          [1, 'a1', 'b1', 'c1'],
          [2, 'a2', 'b2', 'c2'],
        ],
        versionRowData: [
          ['version_r', 'roads_0', 'roads_1'],
          ['版本行属', '简体', '简体中文'],
          ['1', '1', '1'],
          ['1', '1', '1'],
        ],
        // version_c 区域：第一行是版本区间，对应 mainData 的4列
        versionColData: [
          ['1', '1', '3.0', '1'],    // version_c 行：col_b 版本3.0+（排除）
          ['1', '1', '1', '1'],      // roads_0 行
          ['1', '1', '1', '1'],      // roads_1 行
        ],
        versionColLabels: ['version_c', 'roads_0', 'roads_1'],
        hasVersionRowFlag: true,
        hasVersionColFlag: true,
      };

      const result = df.applyFilters(tableData);

      // col_b (index=2) 因版本3.0+ 超过1.5被排除，剩余3列
      expect(result.colCount).toBe(3);
      expect(result.data[0]).toEqual(['id=int', 'col_a=string', 'col_c=string']);
      expect(result.data[2]).toEqual([1, 'a1', 'c1']);
    });

    it('列线路筛选 — roads_0=0 排除列', () => {
      const vf = new VersionFilter(7.5, 'roads_1');
      const df = new DataFilter(vf);

      const tableData: InMemoryTableData = {
        sourceSheetName: '列线路筛选',
        mainData: [
          ['id=int', 'col_a=string', 'col_b=string'],
          ['ID', '列A', '列B'],
          [1, 'a1', 'b1'],
        ],
        versionRowData: [
          ['version_r', 'roads_0', 'roads_1'],
          ['版本行属', '简体', '简体中文'],
          ['1', '1', '1'],
        ],
        versionColData: [
          ['1', '1', '1'],     // version_c 行：所有列版本通过
          ['1', '1', '0'],     // roads_0：col_b(index=2) roads_0=0 → 排除
          ['1', '1', '1'],     // roads_1
        ],
        versionColLabels: ['version_c', 'roads_0', 'roads_1'],
        hasVersionRowFlag: true,
        hasVersionColFlag: true,
      };

      const result = df.applyFilters(tableData);
      expect(result.colCount).toBe(2);
      expect(result.data[0]).toEqual(['id=int', 'col_a=string']);
    });
  });

  describe('applyFilters - 行+列同时筛选', () => {
    it('行和列同时被版本筛选', () => {
      const vf = new VersionFilter(2.0, 'roads_0');
      const df = new DataFilter(vf);

      const tableData: InMemoryTableData = {
        sourceSheetName: '行列组合筛选',
        mainData: [
          ['id=int', 'col_a=string', 'col_b=string', 'col_c=string'],
          ['ID', '列A', '列B', '列C'],
          [1, 'a1', 'b1', 'c1'],   // 行版本1.0+ → 保留
          [2, 'a2', 'b2', 'c2'],   // 行版本3.0+ → 排除
          [3, 'a3', 'b3', 'c3'],   // 行版本1.0~2.5 → 保留
        ],
        versionRowData: [
          ['version_r', 'roads_0'],
          ['版本行属', '简体'],
          ['1', '1'],       // 行版本1.0+ → 保留
          ['3', '1'],       // 行版本3.0+ → 排除（2.0 < 3.0）
          ['1~2.5', '1'],   // 行版本1.0~2.5 → 保留（2.0 在范围内）
        ],
        versionColData: [
          ['1', '1', '5.0', '1~3'],  // col_b版本5.0+排除，col_c版本1~3保留
        ],
        versionColLabels: ['version_c'],
        hasVersionRowFlag: true,
        hasVersionColFlag: true,
      };

      const result = df.applyFilters(tableData);

      // 行：保留表头2行 + 数据行0、2 = 4行
      expect(result.rowCount).toBe(4);
      // 列：col_b被排除（版本5.0+），剩3列
      expect(result.colCount).toBe(3);
      expect(result.data[0]).toEqual(['id=int', 'col_a=string', 'col_c=string']);
      expect(result.data[2]).toEqual([1, 'a1', 'c1']);
      expect(result.data[3]).toEqual([3, 'a3', 'c3']);
    });
  });

  describe('applyFilters - 边界版本值测试', () => {
    it('版本0 — 只有空值行通过', () => {
      const vf = new VersionFilter(0, 'roads_0');
      const df = new DataFilter(vf);

      const tableData: InMemoryTableData = {
        sourceSheetName: '版本0测试',
        mainData: [
          ['id=int', 'name=string'],
          ['ID', '名称'],
          [1, '空版本行'],    // version_r 为空 → {0, 0.1} → 0 在范围内
          [2, '版本1行'],     // version_r 为 "1" → {1, 99} → 0 不在范围内
        ],
        versionRowData: [
          ['version_r', 'roads_0'],
          ['版本行属', '简体'],
          ['', '1'],
          ['1', '1'],
        ],
        versionColData: null,
        versionColLabels: null,
        hasVersionRowFlag: true,
        hasVersionColFlag: false,
      };

      const result = df.applyFilters(tableData);
      expect(result.rowCount).toBe(3); // 2表头 + 1空版本行
      expect(result.data[2][0]).toBe(1);
    });

    it('版本0.05 — 空值行通过', () => {
      const vf = new VersionFilter(0.05, 'roads_0');
      const df = new DataFilter(vf);

      const tableData: InMemoryTableData = {
        sourceSheetName: '版本0.05测试',
        mainData: [
          ['id=int', 'name=string'],
          ['ID', '名称'],
          [1, '空版本行'],
          [2, '版本1行'],
        ],
        versionRowData: [
          ['version_r', 'roads_0'],
          ['版本行属', '简体'],
          ['', '1'],    // {0, 0.1} → 0.05 在范围内
          ['1', '1'],   // {1, 99} → 0.05 不在范围内
        ],
        versionColData: null,
        versionColLabels: null,
        hasVersionRowFlag: true,
        hasVersionColFlag: false,
      };

      const result = df.applyFilters(tableData);
      expect(result.rowCount).toBe(3);
      expect(result.data[2][0]).toBe(1);
    });

    it('版本99 — 单数字区间 {N, 99} 右开排除', () => {
      const vf = new VersionFilter(99, 'roads_0');
      const df = new DataFilter(vf);

      const tableData: InMemoryTableData = {
        sourceSheetName: '版本99测试',
        mainData: [
          ['id=int', 'name=string'],
          ['ID', '名称'],
          [1, '版本1行'],     // "1" → {1, 99}，99 不在范围内
          [2, '版本1~100行'], // "1~100" → {1, 100}，99 在范围内
        ],
        versionRowData: [
          ['version_r', 'roads_0'],
          ['版本行属', '简体'],
          ['1', '1'],
          ['1~100', '1'],
        ],
        versionColData: null,
        versionColLabels: null,
        hasVersionRowFlag: true,
        hasVersionColFlag: false,
      };

      const result = df.applyFilters(tableData);
      expect(result.rowCount).toBe(3); // 2表头 + 1数据行
      expect(result.data[2][0]).toBe(2); // 只有 "1~100" 的行通过
    });
  });

  describe('applyFilters - 无 version_r 的表全量输出', () => {
    it('模拟技能buff表 — 无版本筛选，全量输出', () => {
      const vf = new VersionFilter(1.09, 'roads_1');
      const df = new DataFilter(vf);

      const tableData: InMemoryTableData = {
        sourceSheetName: '技能buff表',
        mainData: [
          ['id=int', 'buff_name=string', 'duration=int'],
          ['ID', 'Buff名称', '持续时间'],
          [1, '加速', 10],
          [2, '减速', 5],
          [3, '中毒', 8],
        ],
        versionRowData: null,
        versionColData: null,
        versionColLabels: null,
        hasVersionRowFlag: false,
        hasVersionColFlag: false,
      };

      const result = df.applyFilters(tableData);
      expect(result.shouldOutput).toBe(true);
      expect(result.rowCount).toBe(5); // 2表头 + 3数据行
      expect(result.data).toEqual(tableData.mainData);
    });
  });

  describe('applyFilters - 版本区间带字母后缀', () => {
    it('"3.5a" 版本区间筛选', () => {
      const vf = new VersionFilter(4.0, 'roads_0');
      const df = new DataFilter(vf);

      const tableData: InMemoryTableData = {
        sourceSheetName: '字母版本表',
        mainData: [
          ['id=int', 'name=string'],
          ['ID', '名称'],
          [1, '保留'],   // "3.5a" → {3.5, 99} → 4.0在范围内
          [2, '排除'],   // "5.0a" → {5.0, 99} → 4.0不在范围内
          [3, '保留2'],  // "1.2s~4.5s" → {1.2, 4.5} → 4.0在范围内
        ],
        versionRowData: [
          ['version_r', 'roads_0'],
          ['版本行属', '简体'],
          ['3.5a', '1'],
          ['5.0a', '1'],
          ['1.2s~4.5s', '1'],
        ],
        versionColData: null,
        versionColLabels: null,
        hasVersionRowFlag: true,
        hasVersionColFlag: false,
      };

      const result = df.applyFilters(tableData);
      expect(result.rowCount).toBe(4); // 2表头 + 2数据行
      expect(result.data[2][0]).toBe(1);
      expect(result.data[3][0]).toBe(3);
    });
  });
});
