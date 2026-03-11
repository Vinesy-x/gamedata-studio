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
        hasVersionRowFlag: true,
        hasVersionColFlag: false,
      };

      const result = df.applyFilters(tableData);
      expect(result.shouldOutput).toBe(false);
    });
  });
});
