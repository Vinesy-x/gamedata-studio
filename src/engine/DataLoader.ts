/* global Excel */

import { Config } from '../types/config';
import { InMemoryTableData, CellValue } from '../types/table';
import { ErrorCode } from '../types/errors';
import { VersionFilter } from './VersionFilter';
import { excelHelper, SheetData } from '../utils/ExcelHelper';
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

    await Excel.run(async (context) => {
      for (const [chineseName, tableInfo] of config.tablesToProcess) {
        if (!tableInfo.shouldOutput) {
          logger.info(`跳过表 ${chineseName}: 输出开关关闭`);
          continue;
        }

        if (tableInfo.versionRange && !versionFilter.isVersionInRange(tableInfo.versionRange)) {
          logger.info(`跳过表 ${chineseName}: 版本不在区间 ${tableInfo.versionRange} 内`);
          continue;
        }

        try {
          const snap = await excelHelper.loadSheetSnapshot(context, chineseName);
          if (!snap || snap.values.length === 0) {
            this.errorHandler.log(
              ErrorCode.SOURCE_SHEET_NOT_FOUND, 'warning', chineseName,
              `找不到工作表「${chineseName}」`, 'DataLoader.loadAll'
            );
            continue;
          }

          const tableData = this.parseTableData(snap.values, chineseName);
          if (tableData) {
            result.set(chineseName, tableData);
            logger.info(`已加载表 ${chineseName}, 数据行数: ${tableData.mainData.length}`);
          }
        } catch (err) {
          this.errorHandler.log(
            ErrorCode.SOURCE_SHEET_NOT_FOUND, 'warning', chineseName,
            `加载工作表「${chineseName}」失败: ${err instanceof Error ? err.message : String(err)}`,
            'DataLoader.loadAll'
          );
        }
      }
    });

    logger.info(`共加载 ${result.size} 张表到内存`);
    return result;
  }

  /**
   * 从内存数据中解析表结构
   */
  private parseTableData(
    allValues: SheetData,
    chineseName: string
  ): InMemoryTableData | null {
    const totalRows = allValues.length;
    const totalCols = allValues[0]?.length || 0;

    // 定位关键标记
    let versionRRow = -1;
    let configAreaCol = -1;
    let versionCRow = -1;
    let versionCCol = -1;

    // 查找 version_r（在任意列，但通常在A列）
    for (let r = 0; r < totalRows; r++) {
      for (let c = 0; c < totalCols; c++) {
        const val = String(allValues[r][c] ?? '').trim();
        if (val === 'version_r') {
          versionRRow = r;
          break;
        }
      }
      if (versionRRow >= 0) break;
    }

    if (versionRRow === -1) {
      this.errorHandler.log(
        ErrorCode.VERSION_R_MARKER_NOT_FOUND, 'warning', chineseName,
        `工作表「${chineseName}」找不到 version_r 标记`, 'DataLoader.parseTableData'
      );
      return null;
    }

    // 查找 #配置区域#（在 version_r 所在行扫描）
    for (let c = 0; c < totalCols; c++) {
      const val = String(allValues[versionRRow][c] ?? '').trim();
      if (val === '#配置区域#') {
        configAreaCol = c;
        break;
      }
    }

    if (configAreaCol === -1) {
      this.errorHandler.log(
        ErrorCode.CONFIG_AREA_MARKER_NOT_FOUND, 'warning', chineseName,
        `工作表「${chineseName}」找不到 #配置区域# 标记`, 'DataLoader.parseTableData'
      );
      return null;
    }

    if (configAreaCol + 1 >= totalCols) {
      this.errorHandler.log(
        ErrorCode.DATA_AREA_EMPTY, 'warning', chineseName,
        `工作表「${chineseName}」#配置区域# 右侧无数据列`, 'DataLoader.parseTableData'
      );
      return null;
    }

    // 查找 version_c（在 version_r 之前的行中查找）
    let hasVersionCol = false;
    for (let r = 0; r < versionRRow; r++) {
      for (let c = 0; c < totalCols; c++) {
        const val = String(allValues[r][c] ?? '').trim();
        if (val === 'version_c') {
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
        row.push(allValues[r][c] ?? null);
      }
      mainData.push(row);
    }

    // 提取行版本控制数据（A列到 #配置区域# 前的列，version_r 所在行起）
    const versionRowData: CellValue[][] = [];
    for (let r = versionRRow; r < totalRows; r++) {
      const row: CellValue[] = [];
      for (let c = 0; c < configAreaCol; c++) {
        row.push(allValues[r][c] ?? null);
      }
      versionRowData.push(row);
    }

    // 提取列版本控制数据（version_c 区域）
    let versionColData: CellValue[][] | null = null;
    let versionColLabels: CellValue[] | null = null;
    if (hasVersionCol) {
      versionColData = [];
      // 提取各行左侧标签（version_c 所在列的值，用于识别 roads_0/roads_X）
      versionColLabels = [];
      for (let r = versionCRow; r < versionRRow; r++) {
        // 标签在 version_c 所在列（第一行是 "version_c" 本身，后续行可能有 roads_0 等）
        versionColLabels.push(allValues[r][versionCCol] ?? null);
        const row: CellValue[] = [];
        for (let c = versionCCol + 1; c < versionCCol + 1 + (totalCols - dataStartCol); c++) {
          row.push(c < totalCols ? (allValues[r][c] ?? null) : null);
        }
        versionColData.push(row);
      }
    }

    return {
      sourceSheetName: chineseName,
      mainData,
      versionRowData,
      versionColData,
      versionColLabels,
      hasVersionRowFlag: true,
      hasVersionColFlag: hasVersionCol,
    };
  }
}
