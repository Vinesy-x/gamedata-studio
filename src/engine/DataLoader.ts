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

    // 预筛选需要加载的表名
    const tableNames: string[] = [];
    for (const [chineseName, tableInfo] of config.tablesToProcess) {
      if (!tableInfo.shouldOutput) {
        logger.info(`跳过表 ${chineseName}: 输出开关关闭`);
        continue;
      }
      if (tableInfo.versionRange && !versionFilter.isVersionInRange(tableInfo.versionRange)) {
        logger.info(`跳过表 ${chineseName}: 版本不在区间 ${tableInfo.versionRange} 内`);
        continue;
      }
      tableNames.push(chineseName);
    }

    if (tableNames.length === 0) return result;

    // 批量加载所有工作表（仅 2 次 context.sync，而非 2N 次）
    await Excel.run(async (context) => {
      const snapshots = await excelHelper.loadSheetSnapshotsBatch(context, tableNames);

      for (const chineseName of tableNames) {
        const snap = snapshots.get(chineseName);
        if (!snap || snap.values.length === 0) {
          this.errorHandler.log(
            ErrorCode.SOURCE_SHEET_NOT_FOUND, 'warning', chineseName,
            `找不到工作表「${chineseName}」`, 'DataLoader.loadAll'
          );
          continue;
        }

        try {
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

    // 定位关键标记（找到即停，重复检测交给校验引擎）
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
      logger.info(`工作表「${chineseName}」找不到 version_r 标记，默认包含所有行`);
    }

    // 查找 #配置区域#（在 version_r 所在行扫描，仅当 version_r 存在时）
    if (versionRRow >= 0) {
      for (let c = 0; c < totalCols; c++) {
        const val = String(allValues[versionRRow][c] ?? '').trim();
        if (val === '#配置区域#') {
          configAreaCol = c;
          break;
        }
      }
    }

    if (configAreaCol === -1) {
      logger.info(`工作表「${chineseName}」找不到 #配置区域# 标记，默认使用整个工作表范围`);
    }

    // 查找 version_c（在 version_r 之前的行中查找，仅当 version_r 存在时）
    let hasVersionCol = false;
    if (versionRRow > 0) {
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
    }

    if (versionRRow >= 0 && !hasVersionCol) {
      logger.info(`工作表「${chineseName}」找不到 version_c 标记，默认包含所有列`);
    }

    // 提取主数据区
    // 当 #配置区域# 存在时：右侧为数据区；否则从第0列开始（整个工作表）
    const dataStartCol = configAreaCol >= 0 ? configAreaCol + 1 : 0;
    // 当 version_r 存在时：从其所在行开始；否则从第0行开始（整个工作表）
    const dataStartRow = versionRRow >= 0 ? versionRRow : 0;

    // 确定数据区右边界：从 #配置区域# 后的表头行扫描连续非空单元格
    // 只导出 currentRegion 内的列，避免备注等额外内容被导出
    let dataEndCol = totalCols;
    if (configAreaCol >= 0 && versionRRow >= 0) {
      dataEndCol = dataStartCol;
      for (let c = dataStartCol; c < totalCols; c++) {
        const val = String(allValues[versionRRow][c] ?? '').trim();
        if (val === '') break;
        dataEndCol = c + 1;
      }
    }

    // 动态检测数据起始行：version_r 后面的描述行在 A 列是纯文本（无数字/~），
    // 数据行在 A 列包含版本号（有数字或~）或为空。跳过所有描述行（支持隐藏行等导致的额外描述行）。
    // 注意：必须检查 A 列（版本列），而非 dataStartCol（数据列可能本身就是数字）。
    let dataRowOffset = dataStartRow + 1; // 至少跳过 version_r 行本身
    if (versionRRow >= 0) {
      for (let r = dataStartRow + 1; r < totalRows; r++) {
        const cellVal = String(allValues[r]?.[0] ?? '').trim();
        // 非空且不含数字/~ → 描述行，继续跳过
        if (cellVal && !/[\d~]/.test(cellVal)) {
          dataRowOffset = r + 1;
          continue;
        }
        break;
      }
    }
    let dataEndRow = totalRows;
    if (configAreaCol >= 0 && versionRRow >= 0) {
      dataEndRow = dataRowOffset;
      for (let r = dataRowOffset; r < totalRows; r++) {
        const firstCell = allValues[r]?.[dataStartCol];
        if (firstCell == null || String(firstCell).trim() === '') break;
        dataEndRow = r + 1;
      }
      // 表头行始终包含
      dataEndRow = Math.max(dataEndRow, dataRowOffset);
    }

    const mainData: CellValue[][] = [];
    for (let r = dataStartRow; r < dataEndRow; r++) {
      const row: CellValue[] = [];
      for (let c = dataStartCol; c < dataEndCol; c++) {
        row.push(allValues[r][c] ?? null);
      }
      mainData.push(row);
    }

    // 提取行版本控制数据（A列到 #配置区域# 前的列，version_r 所在行起）
    // 当 #配置区域# 不存在时，没有版本行数据列可提取
    const versionRowData: CellValue[][] = [];
    const versionRowEndCol = configAreaCol >= 0 ? configAreaCol : 0;
    for (let r = dataStartRow; r < dataEndRow; r++) {
      const row: CellValue[] = [];
      for (let c = 0; c < versionRowEndCol; c++) {
        row.push(allValues[r][c] ?? null);
      }
      versionRowData.push(row);
    }

    // 提取列版本控制数据（version_c 区域）
    let versionColData: CellValue[][] | null = null;
    let versionColLabels: CellValue[] | null = null;
    if (hasVersionCol && versionRRow >= 0) {
      versionColData = [];
      // 提取各行左侧标签（version_c 所在列的值，用于识别 roads_0/roads_X）
      versionColLabels = [];
      const vcDataCols = dataEndCol - dataStartCol;
      for (let r = versionCRow; r < versionRRow; r++) {
        // 标签在 version_c 所在列（第一行是 "version_c" 本身，后续行可能有 roads_0 等）
        versionColLabels.push(allValues[r][versionCCol] ?? null);
        const row: CellValue[] = [];
        for (let c = versionCCol + 1; c < versionCCol + 1 + vcDataCols; c++) {
          row.push(c < totalCols ? (allValues[r][c] ?? null) : null);
        }
        versionColData.push(row);
      }
    }

    const hasVersionRow = versionRRow >= 0;

    return {
      sourceSheetName: chineseName,
      mainData,
      versionRowData: hasVersionRow ? versionRowData : null,
      versionColData,
      versionColLabels,
      hasVersionRowFlag: hasVersionRow,
      hasVersionColFlag: hasVersionCol,
    };
  }
}
