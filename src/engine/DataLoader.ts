/* global Excel */

import { Config, TableInfo } from '../types/config';
import { InMemoryTableData, CellValue } from '../types/table';
import { ErrorCode } from '../types/errors';
import { VersionFilter } from './VersionFilter';
import { excelHelper } from '../utils/ExcelHelper';
import { ErrorHandler } from '../utils/ErrorHandler';
import { logger } from '../utils/Logger';

export class DataLoader {
  private errorHandler: ErrorHandler;

  constructor(errorHandler: ErrorHandler) {
    this.errorHandler = errorHandler;
  }

  /**
   * 批量加载所有待处理表的数据到内存
   */
  async loadAll(
    config: Config,
    versionFilter: VersionFilter
  ): Promise<Map<string, InMemoryTableData>> {
    const result = new Map<string, InMemoryTableData>();

    return await Excel.run(async (context) => {
      for (const [chineseName, tableInfo] of config.tablesToProcess) {
        // 检查是否应该输出
        if (!tableInfo.shouldOutput) {
          logger.info(`跳过表 ${chineseName}: 输出开关关闭`);
          continue;
        }

        // 检查版本区间
        if (tableInfo.versionRange && !versionFilter.isVersionInRange(tableInfo.versionRange)) {
          logger.info(`跳过表 ${chineseName}: 版本 ${config.outputSettings.versionNumber} 不在区间 ${tableInfo.versionRange} 内`);
          continue;
        }

        try {
          const tableData = await this.loadTableData(context, chineseName, tableInfo);
          if (tableData) {
            result.set(chineseName, tableData);
            logger.info(`已加载表 ${chineseName} (${tableInfo.englishName}), 数据行数: ${tableData.mainData.length}`);
          }
        } catch (err) {
          await this.errorHandler.log(
            ErrorCode.SOURCE_SHEET_NOT_FOUND, 'warning', chineseName,
            `加载工作表「${chineseName}」失败: ${err instanceof Error ? err.message : String(err)}`,
            'DataLoader.loadAll'
          );
        }
      }

      logger.info(`共加载 ${result.size} 张表到内存`);
      return result;
    });
  }

  /**
   * 加载单张数据表到内存
   */
  private async loadTableData(
    context: Excel.RequestContext,
    chineseName: string,
    tableInfo: TableInfo
  ): Promise<InMemoryTableData | null> {
    // 获取工作表
    const sheet = context.workbook.worksheets.getItemOrNullObject(chineseName);
    sheet.load('isNullObject');
    await context.sync();

    if (sheet.isNullObject) {
      await this.errorHandler.log(
        ErrorCode.SOURCE_SHEET_NOT_FOUND, 'warning', chineseName,
        `找不到工作表「${chineseName}」`, 'DataLoader.loadTableData'
      );
      return null;
    }

    // 读取整个 UsedRange
    const usedRange = sheet.getUsedRangeOrNullObject(true);
    usedRange.load('values,rowCount,columnCount');
    await context.sync();

    if (usedRange.isNullObject || usedRange.rowCount === 0) {
      await this.errorHandler.log(
        ErrorCode.DATA_AREA_EMPTY, 'warning', chineseName,
        `工作表「${chineseName}」数据区域为空`, 'DataLoader.loadTableData'
      );
      return null;
    }

    const allValues = usedRange.values as CellValue[][];
    const totalRows = usedRange.rowCount;
    const totalCols = usedRange.columnCount;

    // 定位关键标记
    let versionRRow = -1;
    let configAreaCol = -1;
    let versionCRow = -1;
    let versionCCol = -1;

    // 查找 version_r（在A列）
    for (let r = 0; r < totalRows; r++) {
      const cellVal = String(allValues[r][0] || '').trim();
      if (cellVal === 'version_r') {
        versionRRow = r;
        break;
      }
    }

    if (versionRRow === -1) {
      await this.errorHandler.log(
        ErrorCode.VERSION_R_MARKER_NOT_FOUND, 'warning', chineseName,
        `工作表「${chineseName}」找不到 version_r 标记`, 'DataLoader.loadTableData'
      );
      return null;
    }

    // 查找 #配置区域#（在 version_r 所在行扫描）
    for (let c = 0; c < totalCols; c++) {
      const cellVal = String(allValues[versionRRow][c] || '').trim();
      if (cellVal === '#配置区域#') {
        configAreaCol = c;
        break;
      }
    }

    if (configAreaCol === -1) {
      await this.errorHandler.log(
        ErrorCode.CONFIG_AREA_MARKER_NOT_FOUND, 'warning', chineseName,
        `工作表「${chineseName}」找不到 #配置区域# 标记`, 'DataLoader.loadTableData'
      );
      return null;
    }

    // 检查数据区是否有列
    if (configAreaCol + 1 >= totalCols) {
      await this.errorHandler.log(
        ErrorCode.DATA_AREA_EMPTY, 'warning', chineseName,
        `工作表「${chineseName}」#配置区域# 右侧无数据列`, 'DataLoader.loadTableData'
      );
      return null;
    }

    // 查找 version_c（在 version_r 之前的行中查找）
    let hasVersionCol = false;
    for (let r = 0; r < versionRRow; r++) {
      for (let c = 0; c < totalCols; c++) {
        const cellVal = String(allValues[r][c] || '').trim();
        if (cellVal === 'version_c') {
          versionCRow = r;
          versionCCol = c;
          hasVersionCol = true;
          break;
        }
      }
      if (hasVersionCol) break;
    }

    // 提取主数据区（#配置区域# 右侧，version_r 所在行起）
    const dataStartCol = configAreaCol + 1;
    const mainData: CellValue[][] = [];
    for (let r = versionRRow; r < totalRows; r++) {
      const row: CellValue[] = [];
      for (let c = dataStartCol; c < totalCols; c++) {
        row.push(allValues[r][c]);
      }
      mainData.push(row);
    }

    // 提取行版本控制数据（A列到 #配置区域# 前的列，version_r 所在行起）
    const versionRowData: CellValue[][] = [];
    for (let r = versionRRow; r < totalRows; r++) {
      const row: CellValue[] = [];
      for (let c = 0; c < configAreaCol; c++) {
        row.push(allValues[r][c]);
      }
      versionRowData.push(row);
    }

    // 提取列版本控制数据（version_c 区域）
    let versionColData: CellValue[][] | null = null;
    if (hasVersionCol) {
      versionColData = [];
      // version_c 行到 version_r 行之前的所有行
      for (let r = versionCRow; r < versionRRow; r++) {
        const row: CellValue[] = [];
        // 从 version_c 右侧开始，对应每个数据列
        for (let c = versionCCol + 1; c < versionCCol + 1 + (totalCols - dataStartCol); c++) {
          row.push(c < totalCols ? allValues[r][c] : null);
        }
        versionColData.push(row);
      }
    }

    return {
      sourceSheetName: chineseName,
      mainData,
      versionRowData,
      versionColData,
      hasVersionRowFlag: true,
      hasVersionColFlag: hasVersionCol,
    };
  }
}
