/* global Excel */

import { Config } from '../types/config';
import { ExportResult, ExportProgress, InMemoryTableData } from '../types/table';
import { ErrorCode } from '../types/errors';
import { ConfigLoader } from './ConfigLoader';
import { VersionFilter } from './VersionFilter';
import { DataLoader } from './DataLoader';
import { DataFilter } from './DataFilter';
import { ExportWriter, HashManifest } from './ExportWriter';
import { ErrorHandler } from '../utils/ErrorHandler';
import { excelHelper } from '../utils/ExcelHelper';
import { logger } from '../utils/Logger';
import { StudioConfigStore } from '../v2/StudioConfigStore';

const MANIFEST_FILE = '_manifest.json';

export type ProgressCallback = (progress: ExportProgress) => void;

export class ExportJob {
  private errorHandler: ErrorHandler;
  private configLoader: ConfigLoader;
  private dataLoader: DataLoader;
  private exportWriter: ExportWriter;
  private onProgress: ProgressCallback;
  private fileServerBase = '';  // '' = same origin, or 'http://localhost:9876'

  constructor(onProgress: ProgressCallback) {
    this.errorHandler = new ErrorHandler();
    this.configLoader = new ConfigLoader(this.errorHandler);
    this.dataLoader = new DataLoader(this.errorHandler);
    this.exportWriter = new ExportWriter();
    this.onProgress = onProgress;
  }

  /**
   * 执行完整导出流程
   */
  async runExport(): Promise<ExportResult> {
    const startTime = Date.now();
    this.errorHandler.clear();

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

      const outputDir = config.outputSettings.outputDirectory;
      if (!outputDir) {
        this.errorHandler.logError({
          code: ErrorCode.OUTPUT_DIR_EMPTY,
          severity: 'error',
          tableName: '',
          message: '输出目录为空，无法导出。请检查配置设置表中的版本模板目录。',
          procedure: 'ExportJob.runExport',
        });
        return this.buildResult(false, modifiedFiles, startTime, 0, 0);
      }

      // 检测写入模式：优先用 dev server API，不可用时切换到 File System Access API
      await this.detectWriteMode(outputDir);

      // 步骤2: 创建版本筛选器
      this.emitProgress(2, 10, '正在初始化筛选器...');
      const lineField = this.configLoader.determineOutputLineField(config);
      const versionFilter = new VersionFilter(
        config.outputSettings.versionNumber,
        lineField
      );

      logger.info(`筛选参数: 版本=${config.outputSettings.versionNumber}, 线路=${lineField}`);
      logger.info(`输出目录: ${outputDir}`);

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
      this.runValidation(inMemoryData, versionFilter);

      // 步骤5: 加载哈希清单（用于差异对比）
      this.emitProgress(5, 10, '正在准备输出...');
      let manifest: HashManifest = {};

      try {
        const existing = await this.readFileFromServer(outputDir, MANIFEST_FILE);
        if (existing) {
          const text = new TextDecoder().decode(existing);
          manifest = JSON.parse(text);
          logger.info(`已加载哈希清单，包含 ${Object.keys(manifest).length} 张表`);
        }
      } catch {
        logger.info('创建新的哈希清单');
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

          // 哈希对比
          const hasChanged = this.exportWriter.hasDataChanged(
            filtered.data,
            manifest,
            englishName
          );

          if (!hasChanged) {
            logger.info(`表 ${chineseName} 无变化，跳过`);
            continue;
          }

          // 生成独立 xlsx
          const fileBuffer = await this.exportWriter.writeIndividualFile(
            filtered.data, englishName, config
          );

          // 写入输出目录
          const fileName = `${englishName}.xlsx`;
          await this.writeFileToServer(outputDir, fileName, fileBuffer);

          // 更新哈希清单
          manifest[englishName] = this.exportWriter.computeDataHash(filtered.data);

          modifiedFiles.push(fileName);
          changedTables++;
          logger.info(`表 ${chineseName} → ${fileName} 已导出`);
        } catch (err) {
          this.errorHandler.logError({
            code: ErrorCode.FILE_WRITE_FAILED,
            severity: 'warning',
            tableName: chineseName,
            message: `处理表「${chineseName}」失败: ${err instanceof Error ? err.message : String(err)}`,
            procedure: 'ExportJob.processTable',
          });
        }
      }

      // 步骤9: 保存哈希清单
      this.emitProgress(9, 10, '正在保存清单...');
      if (changedTables > 0) {
        try {
          const manifestJson = JSON.stringify(manifest, null, 2);
          const manifestBuffer = new TextEncoder().encode(manifestJson).buffer;
          await this.writeFileToServer(outputDir, MANIFEST_FILE, manifestBuffer);
          logger.info(`哈希清单已保存，共 ${Object.keys(manifest).length} 张表`);
        } catch (err) {
          this.errorHandler.logError({
            code: ErrorCode.ALL_TABLES_SAVE_FAILED,
            severity: 'error',
            tableName: '',
            message: `保存哈希清单失败: ${err instanceof Error ? err.message : String(err)}`,
            procedure: 'ExportJob.saveManifest',
          });
        }
      }

      // 步骤10: 收尾
      this.emitProgress(10, 10, '正在更新状态...');
      if (changedTables > 0) {
        await this.configLoader.incrementSequence(config);
      }
      await this.updateExportResults(modifiedFiles);

      return this.buildResult(true, modifiedFiles, startTime, totalTables, changedTables);
    } catch (err) {
      logger.error('导出失败', err);
      return this.buildResult(false, modifiedFiles, startTime, totalTables, changedTables);
    }
  }

  /**
   * 检测文件服务器：优先同源 dev server，其次 localhost:9876 轻量服务
   */
  private async detectWriteMode(_outputDir: string): Promise<void> {
    // 1. 尝试同源 dev server (npm start) — 仅在 localhost 下才有意义
    const host = typeof window !== 'undefined' ? window.location.hostname : '';
    if (host === 'localhost' || host === '127.0.0.1') {
      try {
        const resp = await fetch('/api/read-file?directory=.&fileName=package.json', { signal: AbortSignal.timeout(1500) });
        if (resp.ok || resp.status === 404) {
          this.fileServerBase = '';
          logger.info('使用 Dev Server 写入文件');
          return;
        }
      } catch { /* not available */ }
    }

    // 2. 尝试本地文件服务 (file-server.py)
    try {
      const resp = await fetch('http://localhost:9876/api/read-file?directory=.&fileName=_probe', { signal: AbortSignal.timeout(1500) });
      if (resp.ok || resp.status === 404) {
        this.fileServerBase = 'http://localhost:9876';
        logger.info('使用本地文件服务 (localhost:9876) 写入文件');
        return;
      }
    } catch { /* not available */ }

    throw new Error('无法写入文件。请先启动本地文件服务：\npython3 scripts/file-server.py');
  }

  /**
   * 写入文件到磁盘
   */
  private async writeFileToServer(
    directory: string,
    fileName: string,
    buffer: ArrayBuffer
  ): Promise<void> {
    const base64 = this.arrayBufferToBase64(buffer);
    const resp = await fetch(`${this.fileServerBase}/api/write-file`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ directory, fileName, data: base64 }),
    });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ error: resp.statusText }));
      throw new Error(`写入文件失败: ${err.error}`);
    }
  }

  /**
   * 读取已有文件（用于差异对比）
   */
  private async readFileFromServer(
    directory: string,
    fileName: string
  ): Promise<ArrayBuffer | null> {
    try {
      const resp = await fetch(`${this.fileServerBase}/api/read-file?directory=${encodeURIComponent(directory)}&fileName=${encodeURIComponent(fileName)}`);
      if (!resp.ok) return null;
      return await resp.arrayBuffer();
    } catch {
      return null;
    }
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * 导出前校验
   */
  /** 检测单元格值是否为 Excel 错误值 */
  private isExcelError(val: unknown): boolean {
    if (val == null) return false;
    const s = String(val).trim();
    return s === '#N/A' || s === '#REF!' || s === '#VALUE!'
      || s === '#DIV/0!' || s === '#NAME?' || s === '#NULL!'
      || s === '#NUM!' || s === '#GETTING_DATA' || s === '#SPILL!';
  }

  private runValidation(
    inMemoryData: Map<string, InMemoryTableData>,
    versionFilter: VersionFilter,
  ): void {
    for (const [chineseName, tableData] of inMemoryData) {
      // ── 1. 校验配置区域（versionRowData）── 空值允许（代表0/不筛选），只检测错误值和格式
      if (tableData.versionRowData) {
        for (let r = 2; r < tableData.versionRowData.length; r++) {
          const row = tableData.versionRowData[r];
          for (let c = 0; c < row.length; c++) {
            const raw = row[c];
            const loc = { sheetName: chineseName, row: r + 1, column: c + 1, cellValue: String(raw ?? '') };

            if (this.isExcelError(raw)) {
              this.errorHandler.logError({
                code: ErrorCode.CELL_EXCEL_ERROR,
                severity: 'warning',
                tableName: chineseName,
                message: `配置区域单元格包含错误值「${raw}」`,
                procedure: 'ExportJob.runValidation',
                location: loc,
              });
              continue;
            }

            const cellVal = String(raw ?? '').trim();
            if (!cellVal) continue; // 空值在配置区域是合法的（等同于0）

            const validation = versionFilter.validateRangeFormat(cellVal);
            if (!validation.valid && validation.errorCode) {
              this.errorHandler.logError({
                code: validation.errorCode,
                severity: 'warning',
                tableName: chineseName,
                message: validation.message || '版本区间格式错误',
                procedure: 'ExportJob.runValidation',
                location: loc,
              });
            }
          }
        }
      }

      // ── 2. 校验列版本区间（version_c 区域）── 同上，空值允许
      if (tableData.versionColData) {
        for (let r = 0; r < tableData.versionColData.length; r++) {
          for (let c = 0; c < tableData.versionColData[r].length; c++) {
            const raw = tableData.versionColData[r][c];
            const loc = { sheetName: chineseName, row: r + 1, column: c + 1, cellValue: String(raw ?? '') };

            if (this.isExcelError(raw)) {
              this.errorHandler.logError({
                code: ErrorCode.CELL_EXCEL_ERROR,
                severity: 'warning',
                tableName: chineseName,
                message: `列版本区域单元格包含错误值「${raw}」`,
                procedure: 'ExportJob.runValidation',
                location: loc,
              });
              continue;
            }

            const cellVal = String(raw ?? '').trim();
            if (!cellVal) continue;

            const validation = versionFilter.validateRangeFormat(cellVal);
            if (!validation.valid && validation.errorCode) {
              this.errorHandler.logError({
                code: validation.errorCode,
                severity: 'warning',
                tableName: chineseName,
                message: validation.message || '版本区间格式错误',
                procedure: 'ExportJob.runValidation',
                location: loc,
              });
            }
          }
        }
      }

      // ── 3. 校验主数据区（mainData）── 只检测有字段定义的列 + 有Key的行（Ctrl+A 有效区域）
      if (tableData.mainData.length > 2) {
        // 确定有效列数：字段定义行（row 0）中非空的列
        const fieldRow = tableData.mainData[0];
        let validColCount = 0;
        for (let c = 0; c < fieldRow.length; c++) {
          const val = String(fieldRow[c] ?? '').trim();
          if (!val) break; // 遇到空字段定义即为数据区右边界
          validColCount = c + 1;
        }

        // 从第3行（索引2）开始检测数据行，遇到首列为空即停止（数据区下边界）
        for (let r = 2; r < tableData.mainData.length; r++) {
          const firstCell = tableData.mainData[r][0];
          if (firstCell == null || String(firstCell).trim() === '') break;

          for (let c = 0; c < validColCount; c++) {
            const raw = tableData.mainData[r][c];
            const loc = { sheetName: chineseName, row: r + 1, column: c + 1, cellValue: String(raw ?? '') };

            if (this.isExcelError(raw)) {
              this.errorHandler.logError({
                code: ErrorCode.CELL_EXCEL_ERROR,
                severity: 'warning',
                tableName: chineseName,
                message: `数据区域单元格包含错误值「${raw}」`,
                procedure: 'ExportJob.runValidation',
                location: loc,
              });
              continue;
            }

            if (raw != null && typeof raw === 'string' && raw.length > 0 && raw.trim() === '') {
              this.errorHandler.logError({
                code: ErrorCode.CELL_WHITESPACE_ONLY,
                severity: 'warning',
                tableName: chineseName,
                message: '数据区域单元格仅包含空格',
                procedure: 'ExportJob.runValidation',
                location: loc,
              });
            }
          }
        }
      }
    }
  }

  /**
   * 更新导出结果到「表格输出」工作表
   */
  /**
   * 更新导出状态到「表格输出」工作表（仅更新工作状态和结果计数，列表和报错已在UI中展示）
   */
  private async updateExportResults(modifiedFiles: string[]): Promise<void> {
    try {
      await Excel.run(async (context) => {
        // 优先 JSON
        const ok = await StudioConfigStore.update(context, (data) => {
          data.workStatus = '导出完成';
          data.resultCount = modifiedFiles.length;
        });
        if (ok) return;

        // 旧格式回退
        const snap = await excelHelper.loadSheetSnapshot(context, '表格输出');
        if (!snap) return;

        const sheet = context.workbook.worksheets.getItem('表格输出');
        const oR = snap.startRow;
        const oC = snap.startCol;

        const statusPos = excelHelper.findMarkerInData(snap.values, '#工作状态#');
        const countPos = excelHelper.findMarkerInData(snap.values, '#输出表格结果#');

        if (statusPos) {
          sheet.getRangeByIndexes(statusPos.row + oR, statusPos.col + oC + 1, 1, 1).values = [['导出完成']];
        }

        if (countPos) {
          sheet.getRangeByIndexes(countPos.row + oR + 1, countPos.col + oC + 1, 1, 1).values = [[modifiedFiles.length]];
        }

        await context.sync();
      });
    } catch (err) {
      logger.error('更新导出结果失败', err);
    }
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
