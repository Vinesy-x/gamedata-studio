/**
 * 端到端导出测试：模拟完整导出流程
 * 使用 ExcelJS 读取 DM数据表.xlsm，执行筛选、对比、写入
 */
import * as ExcelJS from 'exceljs';
import * as path from 'path';
import { ExcelHelper, SheetData } from '../../src/utils/ExcelHelper';
import { VersionFilter } from '../../src/engine/VersionFilter';
import { DataFilter } from '../../src/engine/DataFilter';
import { ExportWriter } from '../../src/engine/ExportWriter';
import { CellValue, InMemoryTableData } from '../../src/types/table';

const TEMPLATE_PATH = path.resolve(__dirname, '../../docs/DM数据表.xlsm');

// 将 ExcelJS Worksheet 转为内存数组
function sheetToArray(sheet: ExcelJS.Worksheet): SheetData {
  const data: SheetData = [];
  for (let r = 1; r <= sheet.rowCount; r++) {
    const row: (string | number | boolean | null)[] = [];
    const excelRow = sheet.getRow(r);
    for (let c = 1; c <= sheet.columnCount; c++) {
      const cell = excelRow.getCell(c);
      let val = cell.value;
      if (val && typeof val === 'object' && 'result' in val) val = (val as any).result;
      if (val && typeof val === 'object' && 'formula' in val) val = (val as any).result ?? null;
      row.push(val as string | number | boolean | null);
    }
    data.push(row);
  }
  return data;
}

// 模拟 DataLoader.parseTableData 的逻辑
function parseTableData(allValues: SheetData, sheetName: string): InMemoryTableData | null {
  const totalRows = allValues.length;
  const totalCols = allValues[0]?.length || 0;

  let versionRRow = -1;
  let configAreaCol = -1;
  let versionCRow = -1;
  let versionCCol = -1;

  for (let r = 0; r < totalRows; r++) {
    for (let c = 0; c < totalCols; c++) {
      if (String(allValues[r][c] ?? '').trim() === 'version_r') {
        versionRRow = r;
        break;
      }
    }
    if (versionRRow >= 0) break;
  }

  // 没有 version_r 的表（如技能buff表）：全量输出
  if (versionRRow === -1) {
    // 找 #配置区域# 来确定数据起始列
    for (let r = 0; r < Math.min(totalRows, 5); r++) {
      for (let c = 0; c < totalCols; c++) {
        if (String(allValues[r][c] ?? '').trim() === '#配置区域#') {
          configAreaCol = c;
          break;
        }
      }
      if (configAreaCol >= 0) break;
    }
    // 如果也找不到配置区域，直接返回全部数据
    const startCol = configAreaCol >= 0 ? configAreaCol + 1 : 0;
    const mainData: CellValue[][] = [];
    for (let r = 0; r < totalRows; r++) {
      const row: CellValue[] = [];
      for (let c = startCol; c < totalCols; c++) {
        row.push(allValues[r][c] ?? null);
      }
      mainData.push(row);
    }
    return {
      sourceSheetName: sheetName,
      mainData,
      versionRowData: null,
      versionColData: null,
      versionColLabels: null,
      hasVersionRowFlag: false,
      hasVersionColFlag: false,
    };
  }

  for (let c = 0; c < totalCols; c++) {
    if (String(allValues[versionRRow][c] ?? '').trim() === '#配置区域#') {
      configAreaCol = c;
      break;
    }
  }
  if (configAreaCol === -1) return null;

  let hasVersionCol = false;
  for (let r = 0; r < versionRRow; r++) {
    for (let c = 0; c < totalCols; c++) {
      if (String(allValues[r][c] ?? '').trim() === 'version_c') {
        versionCRow = r;
        versionCCol = c;
        hasVersionCol = true;
        break;
      }
    }
    if (hasVersionCol) break;
  }

  const dataStartCol = configAreaCol + 1;
  const mainData: CellValue[][] = [];
  for (let r = versionRRow; r < totalRows; r++) {
    const row: CellValue[] = [];
    for (let c = dataStartCol; c < totalCols; c++) {
      row.push(allValues[r][c] ?? null);
    }
    mainData.push(row);
  }

  const versionRowData: CellValue[][] = [];
  for (let r = versionRRow; r < totalRows; r++) {
    const row: CellValue[] = [];
    for (let c = 0; c < configAreaCol; c++) {
      row.push(allValues[r][c] ?? null);
    }
    versionRowData.push(row);
  }

  let versionColData: CellValue[][] | null = null;
  let versionColLabels: CellValue[] | null = null;
  if (hasVersionCol) {
    versionColData = [];
    versionColLabels = [];
    for (let r = versionCRow; r < versionRRow; r++) {
      versionColLabels.push(allValues[r][versionCCol] ?? null);
      const row: CellValue[] = [];
      for (let c = versionCCol + 1; c < versionCCol + 1 + (totalCols - dataStartCol); c++) {
        row.push(c < totalCols ? (allValues[r][c] ?? null) : null);
      }
      versionColData.push(row);
    }
  }

  return {
    sourceSheetName: sheetName,
    mainData,
    versionRowData,
    versionColData,
    versionColLabels,
    hasVersionRowFlag: true,
    hasVersionColFlag: hasVersionCol,
  };
}

// DM数据表 的 32 张表
const TABLE_LIST = [
  { chinese: '语言表', english: 'LanguageWord' },
  { chinese: '系统表', english: 'SystemInfo' },
  { chinese: '系统跳转表', english: 'SystemJump' },
  { chinese: '配置表', english: 'GameConfig' },
  { chinese: '物品表', english: 'Item' },
  { chinese: '宝箱表', english: 'Box' },
  { chinese: '职业表', english: 'Occupation' },
  { chinese: '关卡表', english: 'Mission' },
  { chinese: '商店表', english: 'Shop' },
  { chinese: '固定曲线表', english: 'Curve' },
  { chinese: '任务表', english: 'Task' },
  { chinese: '标签表', english: 'Tags' },
  { chinese: '装备表', english: 'Equipment' },
  { chinese: '玉石表', english: 'Jade' },
  { chinese: '怪物表', english: 'Monsters' },
  { chinese: '弹道表', english: 'Bullet' },
  { chinese: '时装表', english: 'FashionSuit' },
  { chinese: '古董表', english: 'Antique' },
  { chinese: '古董部位表', english: 'AntiqueParts' },
  { chinese: '藏品表', english: 'Collection' },
  { chinese: '掉落物表', english: 'DropItem' },
  { chinese: '掉落表', english: 'Drop' },
  { chinese: '龙灵表', english: 'DragonPet' },
  { chinese: '套装表', english: 'Suit' },
  { chinese: '属性表', english: 'Attribute' },
  { chinese: '词缀表', english: 'Entry' },
  { chinese: '技能表', english: 'Skills' },
  { chinese: '技能buff表', english: 'SkillsBuff' },
  { chinese: '异常状态表', english: 'Ailment' },
  { chinese: '昵称表', english: 'PlayerName' },
  { chinese: '付费项表', english: 'Paid' },
  { chinese: '邮件表', english: 'Email' },
];

// 无 version_r 的特殊表
const TABLES_WITHOUT_VERSION_R = ['技能buff表'];

describe('端到端导出测试 - DM数据表', () => {
  let workbook: ExcelJS.Workbook;

  // DM数据表较大，整个 describe 设置 120s 超时
  jest.setTimeout(120000);

  beforeAll(async () => {
    workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(TEMPLATE_PATH);
  });

  describe('数据加载和解析', () => {
    it('所有32张表都能正确解析结构', () => {
      for (const { chinese } of TABLE_LIST) {
        const sheet = workbook.getWorksheet(chinese)!;
        expect(sheet).toBeDefined();

        const data = sheetToArray(sheet);
        const tableData = parseTableData(data, chinese);
        expect(tableData).not.toBeNull();
        expect(tableData!.mainData.length).toBeGreaterThan(0);
      }
    });

    it('有version_r的表能正确提取版本行数据', () => {
      for (const { chinese } of TABLE_LIST) {
        if (TABLES_WITHOUT_VERSION_R.includes(chinese)) continue;

        const sheet = workbook.getWorksheet(chinese)!;
        const data = sheetToArray(sheet);
        const tableData = parseTableData(data, chinese)!;

        expect(tableData.hasVersionRowFlag).toBe(true);
        expect(tableData.versionRowData).not.toBeNull();
        expect(tableData.versionRowData!.length).toBeGreaterThan(0);
        // 第一行应该包含 version_r 标识
        expect(String(tableData.versionRowData![0][0]).trim()).toBe('version_r');
      }
    });

    it('技能buff表作为无version_r的表能正确加载', () => {
      const sheet = workbook.getWorksheet('技能buff表')!;
      const data = sheetToArray(sheet);
      const tableData = parseTableData(data, '技能buff表')!;

      expect(tableData.hasVersionRowFlag).toBe(false);
      expect(tableData.versionRowData).toBeNull();
      expect(tableData.mainData.length).toBeGreaterThan(0);
    });
  });

  describe('版本筛选（version=1.09, line=roads_1）', () => {
    const vf = new VersionFilter(1.09, 'roads_1');
    const df = new DataFilter(vf);

    it('有version_r的表筛选后都有输出', () => {
      for (const { chinese } of TABLE_LIST) {
        if (TABLES_WITHOUT_VERSION_R.includes(chinese)) continue;

        const sheet = workbook.getWorksheet(chinese)!;
        const data = sheetToArray(sheet);
        const tableData = parseTableData(data, chinese)!;

        const result = df.applyFilters(tableData);
        expect(result.shouldOutput).toBe(true);
        expect(result.data.length).toBeGreaterThan(2);
      }
    });

    it('无version_r的表全量输出', () => {
      const sheet = workbook.getWorksheet('技能buff表')!;
      const data = sheetToArray(sheet);
      const tableData = parseTableData(data, '技能buff表')!;

      const result = df.applyFilters(tableData);
      // 无版本筛选，数据量应该等于原始行数（至少要有表头+数据）
      expect(result.data.length).toBeGreaterThan(0);
    });

    it('筛选后数据列数一致', () => {
      for (const { chinese } of TABLE_LIST) {
        const sheet = workbook.getWorksheet(chinese)!;
        const data = sheetToArray(sheet);
        const tableData = parseTableData(data, chinese)!;

        const result = df.applyFilters(tableData);
        if (result.data.length === 0) continue;
        const colCount = result.data[0]?.length || 0;
        for (const row of result.data) {
          expect(row.length).toBe(colCount);
        }
      }
    });
  });

  describe('差异对比', () => {
    const writer = new ExportWriter();
    const vf = new VersionFilter(1.09, 'roads_1');
    const df = new DataFilter(vf);

    it('对空工作簿，所有表都检测为变更', () => {
      const emptyWb = writer.createEmptyAllTablesWorkbook();

      for (const { chinese, english } of TABLE_LIST) {
        if (TABLES_WITHOUT_VERSION_R.includes(chinese)) continue;

        const sheet = workbook.getWorksheet(chinese)!;
        const data = sheetToArray(sheet);
        const tableData = parseTableData(data, chinese)!;
        const filtered = df.applyFilters(tableData);

        const changed = writer.compareWithOldData(filtered.data, emptyWb, english);
        expect(changed).toBe(true);
      }
    });

    it('写入后再对比，非GameConfig应检测为无变更', () => {
      const allTablesWb = writer.createEmptyAllTablesWorkbook();
      const config = {
        outputSettings: { versionNumber: 1.09, versionSequence: 1746, versionName: '国内', outputDirectory: '' },
        versionTemplates: new Map(),
        lineTemplates: new Map(),
        tablesToProcess: new Map(),
        gitCommitTemplate: '',
        staffCodes: new Map(),
        showResourcePopup: false,
      };

      // 先写入所有表
      for (const { chinese, english } of TABLE_LIST) {
        if (TABLES_WITHOUT_VERSION_R.includes(chinese)) continue;

        const sheet = workbook.getWorksheet(chinese)!;
        const data = sheetToArray(sheet);
        const tableData = parseTableData(data, chinese)!;
        const filtered = df.applyFilters(tableData);
        writer.updateAllTablesSheet(filtered.data, allTablesWb, english, config);
      }

      // 再次对比
      for (const { chinese, english } of TABLE_LIST) {
        if (TABLES_WITHOUT_VERSION_R.includes(chinese)) continue;

        const sheet = workbook.getWorksheet(chinese)!;
        const data = sheetToArray(sheet);
        const tableData = parseTableData(data, chinese)!;
        const filtered = df.applyFilters(tableData);

        const changed = writer.compareWithOldData(filtered.data, allTablesWb, english);
        if (english === 'GameConfig') {
          expect(changed).toBe(true); // GameConfig always changed
        } else {
          expect(changed).toBe(false);
        }
      }
    });
  });

  describe('文件生成', () => {
    const writer = new ExportWriter();
    const vf = new VersionFilter(1.09, 'roads_1');
    const df = new DataFilter(vf);
    const config = {
      outputSettings: { versionNumber: 1.09, versionSequence: 1746, versionName: '国内', outputDirectory: '' },
      versionTemplates: new Map(),
      lineTemplates: new Map(),
      tablesToProcess: new Map(),
      gitCommitTemplate: '',
      staffCodes: new Map(),
      showResourcePopup: false,
    };

    it('能为每张表生成有效的 xlsx buffer', async () => {
      for (const { chinese, english } of TABLE_LIST) {
        if (TABLES_WITHOUT_VERSION_R.includes(chinese)) continue;

        const sheet = workbook.getWorksheet(chinese)!;
        const data = sheetToArray(sheet);
        const tableData = parseTableData(data, chinese)!;
        const filtered = df.applyFilters(tableData);

        const buffer = await writer.writeIndividualFile(filtered.data, english, config);
        expect(buffer).toBeDefined();
        expect(buffer.byteLength).toBeGreaterThan(0);

        // 验证生成的 xlsx 可读
        const checkWb = new ExcelJS.Workbook();
        await checkWb.xlsx.load(buffer);
        const checkSheet = checkWb.getWorksheet(english);
        expect(checkSheet).toBeDefined();
        expect(checkSheet!.rowCount).toBe(filtered.data.length);
      }
    });

    it('GameConfig 第3行第3列注入版本号', async () => {
      const sheet = workbook.getWorksheet('配置表')!;
      const data = sheetToArray(sheet);
      const tableData = parseTableData(data, '配置表')!;
      const filtered = df.applyFilters(tableData);

      const buffer = await writer.writeIndividualFile(filtered.data, 'GameConfig', config);
      const checkWb = new ExcelJS.Workbook();
      await checkWb.xlsx.load(buffer);
      const checkSheet = checkWb.getWorksheet('GameConfig')!;
      const versionCell = checkSheet.getRow(3).getCell(3).value;
      expect(String(versionCell)).toBe('1.09.1746');
    });

    it('能生成全部表工作簿', async () => {
      const allTablesWb = writer.createEmptyAllTablesWorkbook();

      for (const { chinese, english } of TABLE_LIST) {
        if (TABLES_WITHOUT_VERSION_R.includes(chinese)) continue;

        const sheet = workbook.getWorksheet(chinese)!;
        const data = sheetToArray(sheet);
        const tableData = parseTableData(data, chinese)!;
        const filtered = df.applyFilters(tableData);
        writer.updateAllTablesSheet(filtered.data, allTablesWb, english, config);
      }

      const buffer = await writer.saveAllTablesWorkbook(allTablesWb);
      expect(buffer.byteLength).toBeGreaterThan(0);

      // 验证包含所有有version_r的工作表
      const checkWb = new ExcelJS.Workbook();
      await checkWb.xlsx.load(buffer);
      for (const { chinese, english } of TABLE_LIST) {
        if (TABLES_WITHOUT_VERSION_R.includes(chinese)) continue;
        expect(checkWb.getWorksheet(english)).toBeDefined();
      }
    });
  });
});
