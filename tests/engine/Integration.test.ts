/**
 * 集成测试：使用实际模版数据验证核心逻辑
 * 读取 DM数据表.xlsm 的数据，验证 ConfigLoader 解析逻辑和 DataFilter 筛选逻辑
 */
import * as ExcelJS from 'exceljs';
import * as path from 'path';
import { ExcelHelper, SheetData } from '../../src/utils/ExcelHelper';
import { ErrorHandler } from '../../src/utils/ErrorHandler';
import { VersionFilter } from '../../src/engine/VersionFilter';
import { DataFilter } from '../../src/engine/DataFilter';
import { CellValue, InMemoryTableData } from '../../src/types/table';

const TEMPLATE_PATH = path.resolve(__dirname, '../../docs/DM数据表.xlsm');

// 辅助：将 ExcelJS 工作表转为 SheetData 数组
function sheetToArray(sheet: ExcelJS.Worksheet): SheetData {
  const data: SheetData = [];
  const rowCount = sheet.rowCount;
  const colCount = sheet.columnCount;

  for (let r = 1; r <= rowCount; r++) {
    const row: (string | number | boolean | null)[] = [];
    const excelRow = sheet.getRow(r);
    for (let c = 1; c <= colCount; c++) {
      const cell = excelRow.getCell(c);
      let val = cell.value;
      if (val && typeof val === 'object' && 'result' in val) {
        val = (val as any).result;
      }
      if (val && typeof val === 'object' && 'formula' in val) {
        val = (val as any).result ?? null;
      }
      row.push(val as string | number | boolean | null);
    }
    data.push(row);
  }
  return data;
}

describe('集成测试 - DM数据表', () => {
  let workbook: ExcelJS.Workbook;
  let helper: ExcelHelper;

  beforeAll(async () => {
    workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(TEMPLATE_PATH);
    helper = new ExcelHelper();
  });

  describe('配置设置表解析', () => {
    let settingsData: SheetData;

    beforeAll(() => {
      const sheet = workbook.getWorksheet('配置设置表')!;
      settingsData = sheetToArray(sheet);
    });

    it('能找到 #版本列表# 标记', () => {
      const pos = helper.findMarkerInData(settingsData, '#版本列表#');
      expect(pos).not.toBeNull();
    });

    it('能读取版本列表数据', () => {
      const pos = helper.findMarkerInData(settingsData, '#版本列表#')!;
      const rows = helper.readBlockBelow(settingsData, pos.row, pos.col, 4);
      expect(rows.length).toBeGreaterThanOrEqual(8);
      expect(String(rows[0][0]).trim()).toBe('主干版本');
      expect(String(rows[1][0]).trim()).toBe('国内');
      expect(Number(rows[1][1])).toBe(2);
    });

    it('能找到 #线路列表# 标记并读取', () => {
      const pos = helper.findMarkerInData(settingsData, '#线路列表#')!;
      expect(pos).not.toBeNull();
      const rows = helper.readBlockBelow(settingsData, pos.row, pos.col, 3);
      expect(rows.length).toBeGreaterThanOrEqual(9);
      expect(Number(rows[0][0])).toBe(1);
      expect(String(rows[0][1]).trim()).toBe('roads_0');
      expect(Number(rows[1][0])).toBe(2);
      expect(String(rows[1][1]).trim()).toBe('roads_1');
    });

    it('能找到 #人员代码# 标记', () => {
      expect(helper.findMarkerInData(settingsData, '#人员代码#')).not.toBeNull();
    });

    it('能找到 #Git通用提交日志# 标记', () => {
      expect(helper.findMarkerInData(settingsData, '#Git通用提交日志#')).not.toBeNull();
    });

    it('能找到 #配置开关# 标记', () => {
      expect(helper.findMarkerInData(settingsData, '#配置开关#')).not.toBeNull();
    });

    it('国内版本的Git目录模板包含{0}占位符', () => {
      const pos = helper.findMarkerInData(settingsData, '#版本列表#')!;
      const rows = helper.readBlockBelow(settingsData, pos.row, pos.col, 4);
      const guoneiRow = rows.find(r => String(r[0]).trim() === '国内');
      expect(guoneiRow).toBeDefined();
      expect(String(guoneiRow![2])).toContain('{0}');
    });
  });

  describe('表格输出解析', () => {
    let controlData: SheetData;

    beforeAll(() => {
      const sheet = workbook.getWorksheet('表格输出')!;
      controlData = sheetToArray(sheet);
    });

    it('能找到 #输出版本# 且值为"国内"', () => {
      const pos = helper.findMarkerInData(controlData, '#输出版本#')!;
      expect(pos).not.toBeNull();
      const val = helper.getValueRight(controlData, pos.row, pos.col);
      expect(String(val).trim()).toBe('国内');
    });

    it('能找到 #输出版本号# 且值为1.09', () => {
      const pos = helper.findMarkerInData(controlData, '#输出版本号#')!;
      expect(pos).not.toBeNull();
      const val = helper.getValueRight(controlData, pos.row, pos.col);
      expect(Number(val)).toBeCloseTo(1.09);
    });

    it('序列号在 #数据表版本# 标记上一行右一列', () => {
      const pos = helper.findMarkerInData(controlData, '#数据表版本#')!;
      expect(pos).not.toBeNull();
      const seqVal = controlData[pos.row - 1]?.[pos.col + 1];
      expect(Number(seqVal)).toBe(1746);
    });

    it('#数据表版本# 右侧为完整版本串', () => {
      const pos = helper.findMarkerInData(controlData, '#数据表版本#')!;
      const fullVer = helper.getValueRight(controlData, pos.row, pos.col);
      expect(String(fullVer)).toBe('1.09.1746');
    });

    it('能找到所有UI标记', () => {
      expect(helper.findMarkerInData(controlData, '#工作状态#')).not.toBeNull();
      expect(helper.findMarkerInData(controlData, '#输出表格结果#')).not.toBeNull();
      expect(helper.findMarkerInData(controlData, '#输出错误列表#')).not.toBeNull();
      expect(helper.findMarkerInData(controlData, '#输出表格列表#')).not.toBeNull();
    });
  });

  describe('表名对照解析', () => {
    let mappingData: SheetData;

    beforeAll(() => {
      const sheet = workbook.getWorksheet('表名对照')!;
      mappingData = sheetToArray(sheet);
    });

    it('能找到 #输出控制# 标记', () => {
      const pos = helper.findMarkerInData(mappingData, '#输出控制#');
      expect(pos).not.toBeNull();
    });

    it('能读取32张表的对照信息', () => {
      const pos = helper.findMarkerInData(mappingData, '#输出控制#')!;
      const rows = helper.readBlockBelow(mappingData, pos.row, pos.col, 4);
      expect(rows.length).toBe(32);
    });

    it('表名对照包含关键表', () => {
      const pos = helper.findMarkerInData(mappingData, '#输出控制#')!;
      const rows = helper.readBlockBelow(mappingData, pos.row, pos.col, 4);
      const names = rows.map(r => String(r[2]).trim());
      expect(names).toContain('SystemInfo');
      expect(names).toContain('GameConfig');
      expect(names).toContain('Item');
      expect(names).toContain('LanguageWord');
      expect(names).toContain('Equipment');
    });
  });

  describe('数据表结构检测', () => {
    it('所有数据表都能在工作簿中找到', () => {
      const mapping = workbook.getWorksheet('表名对照')!;
      const data = sheetToArray(mapping);
      const pos = helper.findMarkerInData(data, '#输出控制#')!;
      const rows = helper.readBlockBelow(data, pos.row, pos.col, 4);

      for (const row of rows) {
        const chinese = String(row[1]).trim();
        const sheet = workbook.getWorksheet(chinese);
        expect(sheet).toBeDefined();
      }
    });

    it('技能buff表没有 version_r（特殊情况）', () => {
      const sheet = workbook.getWorksheet('技能buff表')!;
      const data = sheetToArray(sheet);
      const vrPos = helper.findMarkerInData(data, 'version_r');
      expect(vrPos).toBeNull();
    });

    it('其他数据表都有 version_r', () => {
      const tablesWithoutVR = ['技能buff表'];
      const mapping = workbook.getWorksheet('表名对照')!;
      const mData = sheetToArray(mapping);
      const pos = helper.findMarkerInData(mData, '#输出控制#')!;
      const rows = helper.readBlockBelow(mData, pos.row, pos.col, 4);

      for (const row of rows) {
        const chinese = String(row[1]).trim();
        if (tablesWithoutVR.includes(chinese)) continue;

        const sheet = workbook.getWorksheet(chinese)!;
        const data = sheetToArray(sheet);
        const vrPos = helper.findMarkerInData(data, 'version_r');
        expect(vrPos).not.toBeNull();
      }
    });
  });

  describe('版本筛选', () => {
    it('版本1.09筛选系统表', () => {
      const sheet = workbook.getWorksheet('系统表')!;
      const data = sheetToArray(sheet);

      const vrPos = helper.findMarkerInData(data, 'version_r')!;
      const configPos = helper.findMarkerInData(data, '#配置区域#')!;
      const dataStartCol = configPos.col + 1;

      const mainData: CellValue[][] = [];
      for (let r = vrPos.row; r < data.length; r++) {
        const row: CellValue[] = [];
        for (let c = dataStartCol; c < data[r].length; c++) {
          row.push(data[r][c]);
        }
        mainData.push(row);
      }

      const versionRowData: CellValue[][] = [];
      for (let r = vrPos.row; r < data.length; r++) {
        const row: CellValue[] = [];
        for (let c = 0; c < configPos.col; c++) {
          row.push(data[r][c]);
        }
        versionRowData.push(row);
      }

      const tableData: InMemoryTableData = {
        sourceSheetName: '系统表',
        mainData,
        versionRowData,
        versionColData: null,
        versionColLabels: null,
        hasVersionRowFlag: true,
        hasVersionColFlag: false,
      };

      const vf = new VersionFilter(1.09, 'roads_1');
      const df = new DataFilter(vf);
      const result = df.applyFilters(tableData);

      expect(result.shouldOutput).toBe(true);
      expect(result.rowCount).toBeGreaterThan(2);
      expect(String(result.data[0][0])).toContain('=');
    });

    it('配置表重复Key处理', () => {
      const sheet = workbook.getWorksheet('配置表')!;
      const data = sheetToArray(sheet);

      const vrPos = helper.findMarkerInData(data, 'version_r')!;
      const configPos = helper.findMarkerInData(data, '#配置区域#')!;
      const dataStartCol = configPos.col + 1;

      const mainData: CellValue[][] = [];
      for (let r = vrPos.row; r < data.length; r++) {
        const row: CellValue[] = [];
        for (let c = dataStartCol; c < data[r].length; c++) {
          row.push(data[r][c]);
        }
        mainData.push(row);
      }

      const versionRowData: CellValue[][] = [];
      for (let r = vrPos.row; r < data.length; r++) {
        const row: CellValue[] = [];
        for (let c = 0; c < configPos.col; c++) {
          row.push(data[r][c]);
        }
        versionRowData.push(row);
      }

      const tableData: InMemoryTableData = {
        sourceSheetName: '配置表',
        mainData,
        versionRowData,
        versionColData: null,
        versionColLabels: null,
        hasVersionRowFlag: true,
        hasVersionColFlag: false,
      };

      const vf = new VersionFilter(1.09, 'roads_1');
      const df = new DataFilter(vf);
      const result = df.applyFilters(tableData);

      expect(result.shouldOutput).toBe(true);

      // 验证无重复Key
      const keys = result.data.slice(2).map(r => String(r[0]));
      const uniqueKeys = new Set(keys);
      expect(keys.length).toBe(uniqueKeys.size);
    });
  });
});
