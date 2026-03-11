import ExcelJS from 'exceljs';
import { CellValue } from '../types/table';
import { Config } from '../types/config';
import { logger } from '../utils/Logger';

export interface WriteResult {
  changed: boolean;
  fileName: string;
  buffer?: ArrayBuffer;
}

export class ExportWriter {
  /**
   * 与旧数据对比，判断是否有变更
   */
  compareWithOldData(
    filteredData: CellValue[][],
    oldWorkbook: ExcelJS.Workbook | null,
    englishName: string
  ): boolean {
    // GameConfig 总是判定为变更
    if (englishName === 'GameConfig') return true;

    if (!oldWorkbook) return true;

    const oldSheet = oldWorkbook.getWorksheet(englishName);
    if (!oldSheet) return true;

    // 读取旧数据
    const oldRowCount = oldSheet.rowCount;
    const oldColCount = oldSheet.columnCount;

    if (oldRowCount !== filteredData.length) return true;
    if (filteredData.length > 0 && oldColCount !== filteredData[0].length) return true;

    // 逐单元格对比
    for (let r = 0; r < filteredData.length; r++) {
      const oldRow = oldSheet.getRow(r + 1);
      for (let c = 0; c < filteredData[r].length; c++) {
        const newVal = String(filteredData[r][c] ?? '');
        const oldVal = String(oldRow.getCell(c + 1).value ?? '');
        if (newVal !== oldVal) return true;
      }
    }

    return false;
  }

  /**
   * 生成独立的 .xlsx 文件（返回 ArrayBuffer）
   */
  async writeIndividualFile(
    filteredData: CellValue[][],
    englishName: string,
    config: Config
  ): Promise<ArrayBuffer> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(englishName);

    for (let r = 0; r < filteredData.length; r++) {
      const row = sheet.getRow(r + 1);
      for (let c = 0; c < filteredData[r].length; c++) {
        const cell = row.getCell(c + 1);
        let value = filteredData[r][c];

        // GameConfig 特殊处理：第3行第3列替换为版本号.序列号
        if (
          englishName === 'GameConfig' &&
          r === 2 && c === 2
        ) {
          value = `${config.outputSettings.versionNumber}.${config.outputSettings.versionSequence}`;
        }

        cell.value = value as ExcelJS.CellValue;
        cell.numFmt = '@'; // 文本格式
      }
      row.commit();
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return buffer as ArrayBuffer;
  }

  /**
   * 更新全部表工作簿中的指定工作表
   */
  updateAllTablesSheet(
    filteredData: CellValue[][],
    allTablesWb: ExcelJS.Workbook,
    englishName: string,
    config: Config
  ): void {
    // 查找或创建工作表
    let sheet = allTablesWb.getWorksheet(englishName);
    if (sheet) {
      // 清空旧数据
      const rowCount = sheet.rowCount;
      for (let r = rowCount; r >= 1; r--) {
        sheet.spliceRows(r, 1);
      }
    } else {
      sheet = allTablesWb.addWorksheet(englishName);
    }

    // 写入新数据
    for (let r = 0; r < filteredData.length; r++) {
      const row = sheet.getRow(r + 1);
      for (let c = 0; c < filteredData[r].length; c++) {
        const cell = row.getCell(c + 1);
        let value = filteredData[r][c];

        // GameConfig 版本号注入
        if (
          englishName === 'GameConfig' &&
          r === 2 && c === 2
        ) {
          value = `${config.outputSettings.versionNumber}.${config.outputSettings.versionSequence}`;
        }

        cell.value = value as ExcelJS.CellValue;
        cell.numFmt = '@';
      }
      row.commit();
    }
  }

  /**
   * 将全部表工作簿导出为 ArrayBuffer
   */
  async saveAllTablesWorkbook(workbook: ExcelJS.Workbook): Promise<ArrayBuffer> {
    const buffer = await workbook.xlsx.writeBuffer();
    return buffer as ArrayBuffer;
  }

  /**
   * 从 ArrayBuffer 加载全部表工作簿
   */
  async loadAllTablesWorkbook(buffer: ArrayBuffer): Promise<ExcelJS.Workbook> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    return workbook;
  }

  /**
   * 创建空的全部表工作簿
   */
  createEmptyAllTablesWorkbook(): ExcelJS.Workbook {
    return new ExcelJS.Workbook();
  }
}

export const exportWriter = new ExportWriter();
