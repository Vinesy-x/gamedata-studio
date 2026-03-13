/* global Excel */

import { Config } from '../types/config';
import { ExportResult, ExportProgress, InMemoryTableData, TableDiff } from '../types/table';
import { ErrorCode } from '../types/errors';
import { ConfigLoader } from './ConfigLoader';
import { VersionFilter } from './VersionFilter';
import { DataLoader } from './DataLoader';
import { DataFilter } from './DataFilter';
import { ExportWriter, HashManifest, getManifestRows } from './ExportWriter';
import { ErrorHandler } from '../utils/ErrorHandler';
import { excelHelper, isExcelError } from '../utils/ExcelHelper';
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
  private fileServerBase = '';  // '' = same origin

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
    const tableDiffs: TableDiff[] = [];
    let totalTables = 0;
    let changedTables = 0;

    try {
      // 初始阶段 totalSteps 未知，先用估计值；加载数据后重新计算
      let totalSteps = 10;

      // 步骤1: 加载配置
      this.emitProgress(1, totalSteps, '正在加载配置...');
      const config = await this.configLoader.loadConfig();
      if (!config) {
        return this.buildResult(false, modifiedFiles, startTime, 0, 0, tableDiffs);
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
        return this.buildResult(false, modifiedFiles, startTime, 0, 0, tableDiffs);
      }

      // 检测写入模式：优先用 dev server API，不可用时切换到 File System Access API
      await this.detectWriteMode(outputDir);

      // 步骤2: 创建版本筛选器
      this.emitProgress(2, totalSteps, '正在初始化筛选器...');
      const lineField = this.configLoader.determineOutputLineField(config);
      const versionFilter = new VersionFilter(
        config.outputSettings.versionNumber,
        lineField
      );

      logger.info(`筛选参数: 版本=${config.outputSettings.versionNumber}, 线路=${lineField}`);
      logger.info(`输出目录: ${outputDir}`);

      // 步骤3: 加载所有源数据到内存
      this.emitProgress(3, totalSteps, '正在加载数据表...');
      const inMemoryData = await this.dataLoader.loadAll(config, versionFilter);

      if (inMemoryData.size === 0) {
        logger.warn('没有表需要处理');
        return this.buildResult(true, modifiedFiles, startTime, 0, 0, tableDiffs);
      }

      totalTables = inMemoryData.size;
      // 重新计算总步数: 5 setup + N tables + 2 finalize
      totalSteps = 5 + totalTables + 2;

      // 步骤4: 导出前校验
      this.emitProgress(4, totalSteps, '正在执行校验...');
      this.runValidation(inMemoryData, versionFilter);

      // 步骤5: 加载哈希清单（用于差异对比）
      this.emitProgress(5, totalSteps, '正在准备输出...');
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

      // 逐表处理（每张表占一个进度步骤）
      const dataFilter = new DataFilter(versionFilter);
      let tableIndex = 0;

      for (const [chineseName, tableData] of inMemoryData) {
        tableIndex++;
        const tableInfo = config.tablesToProcess.get(chineseName);
        if (!tableInfo) continue;

        const englishName = tableInfo.englishName;
        this.emitProgress(5 + tableIndex, totalSteps, `正在处理 ${chineseName} (${tableIndex}/${totalTables})...`, chineseName);

        try {
          // 筛选
          const filtered = dataFilter.applyFilters(tableData);

          if (!filtered.shouldOutput) {
            logger.info(`表 ${chineseName} 筛选后无数据，跳过`);
            continue;
          }

          // 哈希对比（计算一次，复用于清单更新）
          const newHash = this.exportWriter.computeDataHash(filtered.data);
          const hasChanged = this.exportWriter.hasHashChanged(newHash, manifest, englishName);

          if (!hasChanged) {
            logger.info(`表 ${chineseName} 无变化，跳过`);
            continue;
          }

          // 当前行数（减去表头行）
          const currentRows = Math.max(0, filtered.data.length - 1);
          // 上次导出的行数
          const oldEntry = manifest[englishName];
          const previousRows = oldEntry ? getManifestRows(oldEntry) : 0;
          const isNew = !oldEntry;

          // 记录 diff 信息
          tableDiffs.push({
            tableName: englishName,
            chineseName,
            totalRows: currentRows,
            previousRows,
            status: isNew ? 'new' : 'modified',
          });

          // 生成独立 xlsx
          const fileBuffer = await this.exportWriter.writeIndividualFile(
            filtered.data, englishName, config
          );

          // 写入输出目录
          const fileName = `${englishName}.xlsx`;
          await this.writeFileToServer(outputDir, fileName, fileBuffer);

          // 更新哈希清单（复用已计算的哈希）
          manifest[englishName] = {
            hash: newHash,
            rows: currentRows,
          };

          modifiedFiles.push(fileName);
          changedTables++;
          logger.info(`表 ${chineseName} → ${fileName} 已导出`);
        } catch (err) {
          const errDetail = err instanceof Error ? `${err.message}\n${err.stack}` : String(err);
          logger.error(`处理表「${chineseName}」失败`, err);
          this.errorHandler.logError({
            code: ErrorCode.FILE_WRITE_FAILED,
            severity: 'warning',
            tableName: chineseName,
            message: `处理表「${chineseName}」失败: ${errDetail}`,
            procedure: 'ExportJob.processTable',
          });
        }
      }

      // 保存哈希清单
      this.emitProgress(totalSteps - 1, totalSteps, '正在保存清单...');
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

      // 收尾
      this.emitProgress(totalSteps, totalSteps, '正在更新状态...');
      if (changedTables > 0) {
        await this.configLoader.incrementSequence(config);
      }
      await this.updateExportResults(modifiedFiles);

      return this.buildResult(true, modifiedFiles, startTime, totalTables, changedTables, tableDiffs);
    } catch (err) {
      logger.error('导出失败', err);
      this.errorHandler.logError({
        code: ErrorCode.FILE_WRITE_FAILED,
        severity: 'error',
        tableName: '',
        message: err instanceof Error ? err.message : String(err),
        procedure: 'ExportJob.runExport',
      });
      return this.buildResult(false, modifiedFiles, startTime, totalTables, changedTables, tableDiffs);
    }
  }

  private async fetchWithTimeout(url: string, timeoutMs = 5000): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    return fetch(url, { signal: controller.signal }).finally(() => clearTimeout(timer));
  }

  private async fetchWithRetry(url: string, timeoutMs = 10000, retries = 2): Promise<Response> {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await this.fetchWithTimeout(url, timeoutMs);
      } catch (err) {
        if (attempt === retries) throw err;
        logger.warn(`请求失败，重试 ${attempt + 1}/${retries}: ${err instanceof Error ? err.message : err}`);
        await new Promise(r => setTimeout(r, 500));
      }
    }
    throw new Error('unreachable');
  }

  /**
   * 检测文件服务（直接连接 https://localhost:9876，绕过 Office 代理）
   */
  private async detectWriteMode(_outputDir: string): Promise<void> {
    const bases = ['https://localhost:9876', 'http://localhost:9876'];
    for (const base of bases) {
      try {
        const resp = await this.fetchWithTimeout(`${base}/api/read-file?directory=.&fileName=_probe`);
        if (resp.ok || resp.status === 404) {
          this.fileServerBase = base;
          logger.info(`使用本地文件服务: ${base}`);
          return;
        }
      } catch { /* try next */ }
    }
    throw new Error('无法连接文件服务。请先启动：python3 ~/.gamedata-studio/file-server.py');
  }

  /**
   * 写入文件到磁盘（GET 分片上传，绕过 Office 代理的 POST 405 限制）
   */
  private async writeFileToServer(
    directory: string,
    fileName: string,
    buffer: ArrayBuffer
  ): Promise<void> {
    const base64 = this.arrayBufferToBase64(buffer);
    const base = this.fileServerBase;

    // 1. 开始写入会话
    const startResp = await this.fetchWithTimeout(
      `${base}/api/write-start?directory=${encodeURIComponent(directory)}&fileName=${encodeURIComponent(fileName)}`
    );
    if (!startResp.ok) {
      throw new Error(`写入文件失败 (write-start HTTP ${startResp.status})`);
    }
    const { id } = await startResp.json();

    // 2. 分片发送 base64 数据（每片 ~8KB 确保 URL 编码后不超限，6 路并行）
    const CHUNK_SIZE = 8000;
    const CONCURRENCY = 6;
    const totalChunks = Math.ceil(base64.length / CHUNK_SIZE) || 1;

    const sendChunk = async (i: number) => {
      const chunk = base64.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
      const chunkResp = await this.fetchWithRetry(
        `${base}/api/write-chunk?id=${encodeURIComponent(id)}&index=${i}&data=${encodeURIComponent(chunk)}`,
        15000
      );
      if (!chunkResp.ok) {
        throw new Error(`写入文件失败 (write-chunk ${i}/${totalChunks} HTTP ${chunkResp.status})`);
      }
    };

    // 并行上传，每批 CONCURRENCY 个
    for (let start = 0; start < totalChunks; start += CONCURRENCY) {
      const batch = [];
      for (let j = start; j < Math.min(start + CONCURRENCY, totalChunks); j++) {
        batch.push(sendChunk(j));
      }
      await Promise.all(batch);
    }

    // 3. 完成写入
    const finishResp = await this.fetchWithRetry(
      `${base}/api/write-finish?id=${encodeURIComponent(id)}`
    );
    if (!finishResp.ok) {
      const text = await finishResp.text().catch(() => finishResp.statusText);
      throw new Error(`写入文件失败 (write-finish HTTP ${finishResp.status}): ${text}`);
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

  private runValidation(
    inMemoryData: Map<string, InMemoryTableData>,
    versionFilter: VersionFilter,
  ): void {
    for (const [chineseName, tableData] of inMemoryData) {
      // ── 1. 校验配置区域（versionRowData）── 只检查列0（版本区间列），不检查 roads 列
      if (tableData.versionRowData) {
        for (let r = 2; r < tableData.versionRowData.length; r++) {
          const raw = tableData.versionRowData[r][0];
          const loc = { sheetName: chineseName, row: r + 1, column: 1, cellValue: String(raw ?? '') };

          if (isExcelError(raw)) {
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

      // ── 2. 校验列版本区间（version_c 区域）── 只检查第0行（版本区间行），不检查 roads 行
      if (tableData.versionColData && tableData.versionColData.length > 0) {
        const vcRow = tableData.versionColData[0];
        for (let c = 0; c < vcRow.length; c++) {
          const raw = vcRow[c];
          const loc = { sheetName: chineseName, row: 1, column: c + 1, cellValue: String(raw ?? '') };

          if (isExcelError(raw)) {
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

            if (isExcelError(raw)) {
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
    changedTables: number,
    tableDiffs: TableDiff[] = []
  ): ExportResult {
    return {
      success,
      modifiedFiles,
      errors: this.errorHandler.getErrors(),
      duration: (Date.now() - startTime) / 1000,
      totalTables,
      changedTables,
      tableDiffs,
    };
  }

  getErrorHandler(): ErrorHandler {
    return this.errorHandler;
  }
}
