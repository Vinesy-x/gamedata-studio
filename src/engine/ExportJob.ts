/* global Excel */

import ExcelJS from 'exceljs';
import { Config } from '../types/config';
import { ExportResult, ExportProgress, InMemoryTableData } from '../types/table';
import { ErrorCode } from '../types/errors';
import { ConfigLoader } from './ConfigLoader';
import { VersionFilter } from './VersionFilter';
import { DataLoader } from './DataLoader';
import { DataFilter } from './DataFilter';
import { ExportWriter } from './ExportWriter';
import { ErrorHandler } from '../utils/ErrorHandler';
import { excelHelper } from '../utils/ExcelHelper';
import { logger } from '../utils/Logger';

export type ProgressCallback = (progress: ExportProgress) => void;

export interface FileHandle {
  getFile(): Promise<File>;
  createWritable(): Promise<WritableStream & { write(data: unknown): Promise<void>; close(): Promise<void> }>;
}

export interface DirectoryHandle {
  getFileHandle(name: string, options?: { create?: boolean }): Promise<FileHandle>;
}

export class ExportJob {
  private errorHandler: ErrorHandler;
  private configLoader: ConfigLoader;
  private dataLoader: DataLoader;
  private exportWriter: ExportWriter;
  private onProgress: ProgressCallback;
  private directoryHandle: DirectoryHandle | null;

  constructor(
    onProgress: ProgressCallback,
    directoryHandle: DirectoryHandle | null = null
  ) {
    this.errorHandler = new ErrorHandler();
    this.configLoader = new ConfigLoader(this.errorHandler);
    this.dataLoader = new DataLoader(this.errorHandler);
    this.exportWriter = new ExportWriter();
    this.onProgress = onProgress;
    this.directoryHandle = directoryHandle;
  }

  /**
   * 执行完整导出流程
   */
  async runExport(): Promise<ExportResult> {
    const startTime = Date.now();
    this.errorHandler.clear();
    await this.errorHandler.clearSheetErrors();

    const modifiedFiles: string[] = [];
    let totalTables = 0;
    let changedTables = 0;

    try {
      // 步骤1: 加载配置
      this.emitProgress(1, 10, '正在加载配置...');
      const config = await this.configLoader.loadConfig();
      if (!config) {
        return this.buildResult(false, modifiedFiles, startTime, 0, 0);
      }

      // 步骤2: 创建版本筛选器
      this.emitProgress(2, 10, '正在初始化筛选器...');
      const lineField = this.configLoader.determineOutputLineField(config);
      const versionFilter = new VersionFilter(
        config.outputSettings.versionNumber,
        lineField
      );

      logger.info(`筛选参数: 版本=${config.outputSettings.versionNumber}, 线路=${lineField}`);

      // 步骤3: 加载所有源数据到内存
      this.emitProgress(3, 10, '正在加载数据表...');
      const inMemoryData = await this.dataLoader.loadAll(config, versionFilter);

      if (inMemoryData.size === 0) {
        logger.warn('没有表需要处理');
        return this.buildResult(true, modifiedFiles, startTime, 0, 0);
      }

      totalTables = inMemoryData.size;

      // 步骤4: 导出前校验
      this.emitProgress(4, 10, '正在执行校验...');
      await this.runValidation(inMemoryData, versionFilter, config);

      // 步骤5: 准备输出目录（打开全部表.xlsx）
      this.emitProgress(5, 10, '正在准备输出...');
      let allTablesWb: ExcelJS.Workbook;

      if (this.directoryHandle) {
        try {
          const fileHandle = await this.directoryHandle.getFileHandle('全部表.xlsx');
          const file = await fileHandle.getFile();
          const buffer = await file.arrayBuffer();
          allTablesWb = await this.exportWriter.loadAllTablesWorkbook(buffer);
          logger.info('已加载现有「全部表.xlsx」');
        } catch {
          allTablesWb = this.exportWriter.createEmptyAllTablesWorkbook();
          logger.info('创建新的「全部表.xlsx」');
        }
      } else {
        allTablesWb = this.exportWriter.createEmptyAllTablesWorkbook();
      }

      // 步骤6-8: 逐表处理
      const dataFilter = new DataFilter(versionFilter);
      let tableIndex = 0;

      for (const [chineseName, tableData] of inMemoryData) {
        tableIndex++;
        const tableInfo = config.tablesToProcess.get(chineseName);
        if (!tableInfo) continue;

        const englishName = tableInfo.englishName;
        this.emitProgress(6, 10, `正在处理 ${chineseName} (${tableIndex}/${totalTables})...`, chineseName);

        try {
          // 筛选
          const filtered = dataFilter.applyFilters(tableData);

          if (!filtered.shouldOutput) {
            logger.info(`表 ${chineseName} 筛选后无数据，跳过`);
            continue;
          }

          // 差异对比
          const hasChanged = this.exportWriter.compareWithOldData(
            filtered.data,
            allTablesWb,
            englishName
          );

          if (!hasChanged) {
            logger.info(`表 ${chineseName} 无变化，跳过`);
            continue;
          }

          // 写入独立文件
          const fileBuffer = await this.exportWriter.writeIndividualFile(
            filtered.data, englishName, config
          );

          // 写入输出目录
          if (this.directoryHandle) {
            await this.writeFile(this.directoryHandle, `${englishName}.xlsx`, fileBuffer);
          }

          // 更新全部表
          this.exportWriter.updateAllTablesSheet(
            filtered.data, allTablesWb, englishName, config
          );

          modifiedFiles.push(`${englishName}.xlsx`);
          changedTables++;
          logger.info(`表 ${chineseName} → ${englishName}.xlsx 已导出`);
        } catch (err) {
          await this.errorHandler.log(
            ErrorCode.FILE_WRITE_FAILED, 'warning', chineseName,
            `处理表「${chineseName}」失败: ${err instanceof Error ? err.message : String(err)}`,
            'ExportJob.processTable'
          );
        }
      }

      // 步骤9: 保存全部表
      this.emitProgress(9, 10, '正在保存全部表...');
      if (changedTables > 0) {
        try {
          const allTablesBuffer = await this.exportWriter.saveAllTablesWorkbook(allTablesWb);
          if (this.directoryHandle) {
            await this.writeFile(this.directoryHandle, '全部表.xlsx', allTablesBuffer);
          }
          modifiedFiles.push('全部表.xlsx');
          logger.info('全部表.xlsx 已保存');
        } catch (err) {
          await this.errorHandler.log(
            ErrorCode.ALL_TABLES_SAVE_FAILED, 'error', '',
            `保存全部表失败: ${err instanceof Error ? err.message : String(err)}`,
            'ExportJob.saveAllTables'
          );
        }
      }

      // 步骤10: 收尾
      this.emitProgress(10, 10, '正在更新状态...');
      if (changedTables > 0) {
        await this.configLoader.incrementSequence(config);
      }
      await this.updateExportResults(config, modifiedFiles);

      return this.buildResult(true, modifiedFiles, startTime, totalTables, changedTables);
    } catch (err) {
      logger.error('导出失败', err);
      return this.buildResult(false, modifiedFiles, startTime, totalTables, changedTables);
    }
  }

  /**
   * 导出前校验
   */
  private async runValidation(
    inMemoryData: Map<string, InMemoryTableData>,
    versionFilter: VersionFilter,
    config: Config
  ): Promise<void> {
    for (const [chineseName, tableData] of inMemoryData) {
      // 校验行版本区间格式
      if (tableData.versionRowData) {
        for (let r = 2; r < tableData.versionRowData.length; r++) {
          const rangeStr = String(tableData.versionRowData[r][0] || '').trim();
          if (!rangeStr) continue;

          const validation = versionFilter.validateRangeFormat(rangeStr);
          if (!validation.valid && validation.errorCode) {
            await this.errorHandler.log(
              validation.errorCode, 'warning', chineseName,
              validation.message || '版本区间格式错误',
              'ExportJob.runValidation',
              { sheetName: chineseName, row: r + 1, column: 1, cellValue: rangeStr }
            );
          }
        }
      }

      // 校验数据区空值
      if (tableData.mainData && tableData.mainData.length > 2) {
        for (let r = 2; r < tableData.mainData.length; r++) {
          for (let c = 0; c < tableData.mainData[r].length; c++) {
            const val = tableData.mainData[r][c];
            if (val == null || String(val).trim() === '') {
              await this.errorHandler.log(
                ErrorCode.DATA_CELL_EMPTY, 'warning', chineseName,
                `数据区单元格为空`,
                'ExportJob.runValidation',
                { sheetName: chineseName, row: r + 1, column: c + 1, cellValue: '' }
              );
            }
          }
        }
      }
    }
  }

  /**
   * 更新导出结果到「表格输出」工作表
   */
  private async updateExportResults(
    config: Config,
    modifiedFiles: string[]
  ): Promise<void> {
    try {
      await Excel.run(async (context) => {
        const sheet = context.workbook.worksheets.getItem('表格输出');

        // 更新工作状态
        const statusMarker = await excelHelper.findMarker(sheet, '#工作状态#');
        if (statusMarker) {
          statusMarker.load('rowIndex,columnIndex');
          await context.sync();
          const statusCell = sheet.getRangeByIndexes(
            statusMarker.rowIndex, statusMarker.columnIndex + 1, 1, 1
          );
          statusCell.values = [['导出完成']];
        }

        // 更新输出表格数
        const countMarker = await excelHelper.findMarker(sheet, '#输出表格结果#');
        if (countMarker) {
          countMarker.load('rowIndex,columnIndex');
          await context.sync();
          const countCell = sheet.getRangeByIndexes(
            countMarker.rowIndex + 1, countMarker.columnIndex + 1, 1, 1
          );
          countCell.values = [[modifiedFiles.length]];
        }

        // 更新输出表格列表
        const listMarker = await excelHelper.findMarker(sheet, '#输出表格列表#');
        if (listMarker) {
          listMarker.load('rowIndex,columnIndex');
          await context.sync();

          // 先清空旧列表
          const clearRange = sheet.getRangeByIndexes(
            listMarker.rowIndex + 1, listMarker.columnIndex, 100, 1
          );
          clearRange.clear(Excel.ClearApplyTo.contents);

          // 写入新列表
          for (let i = 0; i < modifiedFiles.length; i++) {
            const cell = sheet.getRangeByIndexes(
              listMarker.rowIndex + 1 + i, listMarker.columnIndex, 1, 1
            );
            cell.values = [[modifiedFiles[i]]];
            cell.format.font.color = '#FF0000';
          }
        }

        await context.sync();
      });
    } catch (err) {
      logger.error('更新导出结果失败', err);
    }
  }

  /**
   * 写入文件到输出目录
   */
  private async writeFile(
    dirHandle: DirectoryHandle,
    fileName: string,
    buffer: ArrayBuffer
  ): Promise<void> {
    const fileHandle = await dirHandle.getFileHandle(fileName, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(buffer);
    await writable.close();
  }

  private emitProgress(step: number, totalSteps: number, message: string, tableName?: string): void {
    this.onProgress({ step, totalSteps, message, tableName });
  }

  private buildResult(
    success: boolean,
    modifiedFiles: string[],
    startTime: number,
    totalTables: number,
    changedTables: number
  ): ExportResult {
    return {
      success,
      modifiedFiles,
      errors: this.errorHandler.getErrors(),
      duration: (Date.now() - startTime) / 1000,
      totalTables,
      changedTables,
    };
  }

  getErrorHandler(): ErrorHandler {
    return this.errorHandler;
  }
}
