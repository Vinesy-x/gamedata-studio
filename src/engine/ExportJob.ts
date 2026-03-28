/* global Excel */

import { Config } from '../types/config';
import { CellValue, ExportResult, ExportProgress, InMemoryTableData, TableDiff, TableDiffDetail } from '../types/table';
import { ErrorCode } from '../types/errors';
import { ConfigLoader } from './ConfigLoader';
import { VersionFilter } from './VersionFilter';
import { DataLoader } from './DataLoader';
import { DataFilter } from './DataFilter';
import { ExportWriter, HashManifest, getManifestRows, getManifestHash } from './ExportWriter';
import { ErrorHandler } from '../utils/ErrorHandler';
import { excelHelper, isExcelError } from '../utils/ExcelHelper';
import { logger } from '../utils/Logger';
import { StudioConfigStore } from '../v2/StudioConfigStore';
import { GitHandler } from '../git/GitHandler';
import { GitExecutor } from '../git/GitExecutor';
import { computeTableDiff } from './DiffComputer';
import { clientSettings } from '../utils/ClientSettings';

const MANIFEST_FILE = '_manifest.json';

export type ProgressCallback = (progress: ExportProgress) => void;

export class ExportJob {
  private errorHandler: ErrorHandler;
  private configLoader: ConfigLoader;
  private dataLoader: DataLoader;
  private exportWriter: ExportWriter;
  private onProgress: ProgressCallback;
  private fileServerBase = '';  // '' = same origin
  private usePost = false;      // POST 可用时单次上传，比 GET 分片快很多
  private forceGitPush = false; // 协同触发时强制 push，无视本地开关

  constructor(onProgress: ProgressCallback, options?: { forceGitPush?: boolean }) {
    this.errorHandler = new ErrorHandler();
    this.configLoader = new ConfigLoader(this.errorHandler);
    this.dataLoader = new DataLoader(this.errorHandler);
    this.exportWriter = new ExportWriter();
    this.onProgress = onProgress;
    this.forceGitPush = options?.forceGitPush ?? false;
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
      const t0 = Date.now();
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

      logger.info(`⏱ 加载配置: ${Date.now() - t0}ms`);

      // 检测写入模式：优先用 dev server API，不可用时切换到 File System Access API
      const t1 = Date.now();
      await this.detectWriteMode(outputDir);
      logger.info(`⏱ 检测写入模式: ${Date.now() - t1}ms`);

      // 创建 Git 工具实例（pull 和 push 共用）
      const gitHandler = this.fileServerBase ? new GitHandler(outputDir) : null;
      const gitExecutor = this.fileServerBase ? new GitExecutor(this.fileServerBase) : null;

      // 步骤2+4 并行: Git pull（网络 I/O）与数据加载（Excel 读取）无依赖，同时执行
      this.emitProgress(2, totalSteps, '正在同步仓库 & 加载数据...');
      const lineField = this.configLoader.determineOutputLineField(config);
      const versionFilter = new VersionFilter(
        config.outputSettings.versionNumber,
        lineField
      );
      logger.info(`筛选参数: 版本=${config.outputSettings.versionNumber}, 线路=${lineField}`);
      logger.info(`输出目录: ${outputDir}`);

      const t2 = Date.now();
      const gitPullPromise = (gitExecutor && gitHandler)
        ? this.executeGit(gitExecutor, outputDir, gitHandler.generatePullCommands(), 'Git pull')
        : Promise.resolve({ ok: false, error: '文件服务不可用' } as { ok: boolean; error?: string });

      const dataLoadPromise = this.dataLoader.loadAll(config, versionFilter);

      const [pullResult, inMemoryData] = await Promise.all([gitPullPromise, dataLoadPromise]);
      logger.info(`⏱ 并行加载(pull+数据): ${Date.now() - t2}ms (${inMemoryData.size} 张表)`);

      if (gitExecutor && !pullResult.ok) {
        this.errorHandler.logError({
          code: ErrorCode.FILE_WRITE_FAILED,
          severity: 'warning',
          tableName: '',
          message: `Git 同步失败 (继续导出): ${pullResult.error}`,
          procedure: 'ExportJob.gitPull',
        });
      } else if (!gitExecutor) {
        logger.warn('文件服务不可用，跳过 Git 同步');
      }

      if (inMemoryData.size === 0) {
        logger.warn('没有表需要处理');
        return this.buildResult(true, modifiedFiles, startTime, 0, 0, tableDiffs);
      }

      totalTables = inMemoryData.size;
      // 重新计算总步数: 6 setup + N tables + 3 finalize (含 git push)
      totalSteps = 6 + totalTables + 3;

      // 注：Excel 自动计算已在 loadSheetSnapshotsBatch 中通过
      // suspendApiCalculationUntilNextSync 按批次暂停，无需全局切换

      // 步骤5: 导出前校验
      this.emitProgress(5, totalSteps, '正在执行校验...');
      const t3 = Date.now();
      this.runValidation(inMemoryData, versionFilter, config);
      logger.info(`⏱ 导出前校验: ${Date.now() - t3}ms`);

      // 步骤6: 加载哈希清单（用于差异对比）
      this.emitProgress(6, totalSteps, '正在准备输出...');
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

      // ── 阶段A：筛选 + 哈希对比（纯 CPU）
      const t4 = Date.now();
      const dataFilter = new DataFilter(versionFilter);
      let tableIndex = 0;

      interface PendingWrite {
        chineseName: string;
        englishName: string;
        filteredData: CellValue[][];
        newHash: string;
        currentRows: number;
        previousRows: number;
        isNew: boolean;
        diffDetail?: TableDiffDetail;
      }
      const pendingWrites: PendingWrite[] = [];

      // GameConfig 的筛选数据暂存，用于后续注入版本号
      let gameConfigEntry: { chineseName: string; data: CellValue[][]; idx: number } | null = null;

      for (const [chineseName, tableData] of inMemoryData) {
        tableIndex++;
        const tableInfo = config.tablesToProcess.get(chineseName);
        if (!tableInfo) continue;

        const englishName = tableInfo.englishName;
        this.emitProgress(6 + tableIndex, totalSteps, `正在筛选 ${chineseName} (${tableIndex}/${totalTables})...`, chineseName);

        try {
          const filtered = dataFilter.applyFilters(tableData);
          if (!filtered.shouldOutput) {
            logger.info(`表 ${chineseName} 筛选后无数据，跳过`);
            continue;
          }

          // 所有表正常做哈希对比（GameConfig 此时不注入版本号，用原始数据对比）
          const newHash = this.exportWriter.computeDataHash(filtered.data);
          const hasChanged = this.exportWriter.hasHashChanged(newHash, manifest, englishName);
          if (englishName === 'GameConfig') {
            const oldEntry = manifest[englishName];
            logger.info(`GameConfig 哈希对比: new=${newHash} old=${oldEntry ? getManifestHash(oldEntry) : '无'} changed=${hasChanged}`);
          }
          if (!hasChanged) {
            continue;
          }

          const currentRows = Math.max(0, filtered.data.length - 1);
          const oldEntry = manifest[englishName];
          const previousRows = oldEntry ? getManifestRows(oldEntry) : 0;
          const isNew = !oldEntry;

          pendingWrites.push({ chineseName, englishName, filteredData: filtered.data, newHash, currentRows, previousRows, isNew });

          // 记录 GameConfig 在写入队列中的位置
          if (englishName === 'GameConfig') {
            gameConfigEntry = { chineseName, data: filtered.data, idx: pendingWrites.length - 1 };
          }
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

      // 有数据变更 → 递增序列号 → 注入版本号到 GameConfig
      if (pendingWrites.length > 0) {
        await this.configLoader.incrementSequence(config);
        const newSeq = config.outputSettings.versionSequence;

        if (gameConfigEntry) {
          // GameConfig 已在写入队列中（自身数据有变更），注入版本号
          // 注意：不重算哈希，manifest 存原始数据哈希，下次对比才不会误判
          const data = gameConfigEntry.data;
          if (data.length > 2 && data[2].length > 2) {
            data[2][2] = `${config.outputSettings.versionNumber}.${newSeq}`;
          }
        } else {
          // GameConfig 自身数据没变，但其他表有变更，需要注入新版本号并导出
          const gcTableData = inMemoryData.get(
            Array.from(config.tablesToProcess.entries()).find(([, v]) => v.englishName === 'GameConfig')?.[0] || ''
          );
          if (gcTableData) {
            const filtered = dataFilter.applyFilters(gcTableData);
            if (filtered.shouldOutput && filtered.data.length > 2 && filtered.data[2].length > 2) {
              // 先记录原始哈希（注入前），用于 manifest 存储
              const originalHash = this.exportWriter.computeDataHash(filtered.data);
              filtered.data[2][2] = `${config.outputSettings.versionNumber}.${newSeq}`;
              const oldEntry = manifest['GameConfig'];
              pendingWrites.push({
                chineseName: Array.from(config.tablesToProcess.entries()).find(([, v]) => v.englishName === 'GameConfig')?.[0] || 'GameConfig',
                englishName: 'GameConfig',
                filteredData: filtered.data,
                newHash: originalHash,
                currentRows: Math.max(0, filtered.data.length - 1),
                previousRows: oldEntry ? getManifestRows(oldEntry) : 0,
                isNew: !oldEntry,
              });
            }
          }
        }
      }

      logger.info(`⏱ 阶段A筛选+哈希: ${Date.now() - t4}ms (${pendingWrites.length} 张表需写入)`);

      // 预加载 ExcelJS 模块（阶段B写入时直接使用，避免每张表重复 await import）
      if (pendingWrites.length > 0) {
        await this.exportWriter.preloadExcelJs();
      }

      // ── 阶段A2：并行读取旧文件计算 diff（仅在开启详细差异对比时执行）
      const t4b = Date.now();
      const diffTasks = clientSettings.get('detailedDiff') ? pendingWrites.filter(pw => !pw.isNew) : [];
      if (diffTasks.length > 0) {
        const diffResults = await Promise.allSettled(
          diffTasks.map(async (pw) => {
            const oldBuffer = await this.readFileFromServer(outputDir, `${pw.englishName}.xlsx`);
            if (!oldBuffer) return;
            const oldData = await this.parseXlsxBuffer(oldBuffer);
            pw.diffDetail = computeTableDiff(oldData, pw.filteredData);
          })
        );
        for (let i = 0; i < diffResults.length; i++) {
          if (diffResults[i].status === 'rejected') {
            logger.warn(`Diff 计算失败: ${diffTasks[i].englishName}`, (diffResults[i] as PromiseRejectedResult).reason);
          }
        }
        logger.info(`⏱ 阶段A2 diff计算: ${Date.now() - t4b}ms (${diffTasks.length} 张表)`);
      }

      // ── 阶段B：并行生成 xlsx + 写入文件（I/O 密集，16 路并发）
      const t5 = Date.now();
      const WRITE_CONCURRENCY = 16;
      const writeTable = async (pw: PendingWrite) => {
        const tw = Date.now();
        const fileBuffer = await this.exportWriter.writeIndividualFile(
          pw.filteredData, pw.englishName, config
        );
        const genMs = Date.now() - tw;
        const fileName = `${pw.englishName}.xlsx`;
        await this.writeFileToServer(outputDir, fileName, fileBuffer);
        const totalMs = Date.now() - tw;

        tableDiffs.push({
          tableName: pw.englishName,
          chineseName: pw.chineseName,
          totalRows: pw.currentRows,
          previousRows: pw.previousRows,
          status: pw.isNew ? 'new' : 'modified',
          diffDetail: pw.diffDetail,
        });

        manifest[pw.englishName] = { hash: pw.newHash, rows: pw.currentRows };
        modifiedFiles.push(fileName);
        changedTables++;
        logger.info(`表 ${pw.chineseName} → ${fileName} (${pw.currentRows}行, 生成${genMs}ms, 写入${totalMs}ms)`);
      };

      // 分批并行写入
      for (let i = 0; i < pendingWrites.length; i += WRITE_CONCURRENCY) {
        const batch = pendingWrites.slice(i, i + WRITE_CONCURRENCY);
        const batchNames = batch.map(pw => pw.chineseName).join('、');
        this.emitProgress(
          6 + totalTables + Math.floor(i / WRITE_CONCURRENCY),
          totalSteps,
          `正在写入 ${batchNames}...`
        );

        const results = await Promise.allSettled(batch.map(pw => writeTable(pw)));
        for (let j = 0; j < results.length; j++) {
          if (results[j].status === 'rejected') {
            const err = (results[j] as PromiseRejectedResult).reason;
            const pw = batch[j];
            const errMsg = err instanceof Error ? err.message : String(err);
            const hint = /permission|denied|EBUSY|locked/i.test(errMsg)
              ? '（文件可能被 Excel 或其他程序占用，请关闭后重试）'
              : '';
            logger.error(`写入表「${pw.chineseName}」失败`, err);
            this.errorHandler.logError({
              code: ErrorCode.FILE_WRITE_FAILED,
              severity: 'warning',
              tableName: pw.chineseName,
              message: `写入「${pw.englishName}.xlsx」失败: ${errMsg}${hint}`,
              procedure: 'ExportJob.writeTable',
            });
          }
        }
      }

      logger.info(`⏱ 阶段B写入文件: ${Date.now() - t5}ms`);

      // 保存哈希清单
      this.emitProgress(totalSteps - 2, totalSteps, '正在保存清单...');
      if (changedTables > 0) {
        try {
          const manifestJson = JSON.stringify(manifest, null, 2);
          const manifestBuffer = new TextEncoder().encode(manifestJson).buffer;
          await this.writeFileToServer(outputDir, MANIFEST_FILE, manifestBuffer);
          modifiedFiles.push(MANIFEST_FILE);
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

      // 自动 Git Push（仅在开关打开时执行）
      let gitPushed = false;
      this.emitProgress(totalSteps - 1, totalSteps, '正在上传到仓库...');
      if (changedTables > 0 && (this.forceGitPush || clientSettings.get('autoGitPush')) && gitExecutor && gitHandler) {
        const commitMessage = gitHandler.generateCommitMessage(
          config.gitCommitTemplate,
          config.outputSettings.versionName,
          config.outputSettings.versionNumber,
          config.outputSettings.versionSequence,
          config.operator
        );
        const pushResult = await this.executeGit(gitExecutor, outputDir, gitHandler.generatePushCommands(modifiedFiles, commitMessage, config.operator), 'Git push');
        if (pushResult.ok) {
          gitPushed = true;
        } else {
          this.errorHandler.logError({
            code: ErrorCode.FILE_WRITE_FAILED,
            severity: 'warning',
            tableName: '',
            message: `Git 推送失败: ${pushResult.error}`,
            procedure: 'ExportJob.gitPush',
          });
        }
      }

      // 收尾
      this.emitProgress(totalSteps, totalSteps, '正在更新状态...');
      await this.updateExportResults(modifiedFiles);

      return this.buildResult(true, modifiedFiles, startTime, totalTables, changedTables, tableDiffs, gitPushed, config.outputSettings.versionSequence);
    } catch (err) {
      const errMsg = err instanceof Error ? `${err.message}\n${err.stack}` : String(err);
      logger.error(`导出失败: ${errMsg}`);
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

  private async fetchWithTimeout(url: string, timeoutMs = 5000, init?: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    return fetch(url, { ...init, signal: controller.signal }).finally(() => clearTimeout(timer));
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
   * 执行 git 命令并记录日志
   */
  private async executeGit(executor: GitExecutor, directory: string, commands: string[], label: string): Promise<{ ok: boolean; error?: string }> {
    const t = Date.now();
    try {
      const result = await executor.execute(directory, commands);
      if (result.ok) {
        logger.info(`⏱ ${label} 完成: ${Date.now() - t}ms`);
      } else {
        logger.error(`${label} 失败: ${result.error}`);
      }
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error(`${label} 异常: ${msg}`);
      return { ok: false, error: msg };
    }
  }

  /**
   * 检测文件服务（直接连接 https://localhost:9876，绕过 Office 代理）
   */
  private async detectWriteMode(_outputDir: string): Promise<void> {
    const bases = ['https://localhost:9876', 'http://localhost:9876'];
    const errors: string[] = [];
    for (const base of bases) {
      try {
        const resp = await this.fetchWithTimeout(`${base}/api/read-file?directory=.&fileName=_probe`);
        if (resp.ok || resp.status === 404) {
          this.fileServerBase = base;
          // 检测 POST 是否可用（Office WebView 有时会拦截 POST）
          try {
            const postResp = await this.fetchWithTimeout(`${base}/api/write-file`, 3000, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({}),
            });
            // 400 = 服务端收到了请求但参数缺失，说明 POST 通路可用
            this.usePost = postResp.status === 400 || postResp.ok;
          } catch {
            this.usePost = false;
          }
          logger.info(`使用本地文件服务: ${base} (POST=${this.usePost})`);
          return;
        }
        errors.push(`${base} → HTTP ${resp.status}`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`${base} → ${msg}`);
      }
    }
    const detail = errors.join('; ');
    logger.error(`文件服务检测失败: ${detail}`);
    throw new Error(`无法连接文件服务 (${detail})。请先启动：python3 ~/.gamedata-studio/file-server.py`);
  }

  /**
   * 写入文件到磁盘（优先 POST 单次上传，不可用时 GET 分片）
   */
  private async writeFileToServer(
    directory: string,
    fileName: string,
    buffer: ArrayBuffer
  ): Promise<void> {
    const base64 = this.arrayBufferToBase64(buffer);
    const base = this.fileServerBase;

    // POST 模式：单次请求写入整个文件
    if (this.usePost) {
      const resp = await this.fetchWithTimeout(`${base}/api/write-file`, 30000, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ directory, fileName, data: base64 }),
      });
      if (!resp.ok) {
        throw new Error(`写入文件失败 (POST HTTP ${resp.status})`);
      }
      return;
    }

    // GET 分片模式（Office WebView 拦截 POST 时的 fallback）
    // 1. 开始写入会话
    const startResp = await this.fetchWithTimeout(
      `${base}/api/write-start?directory=${encodeURIComponent(directory)}&fileName=${encodeURIComponent(fileName)}`
    );
    if (!startResp.ok) {
      throw new Error(`写入文件失败 (write-start HTTP ${startResp.status})`);
    }
    const { id } = await startResp.json();

    // 2. 分片发送 base64 数据（每片 256KB，6 路并行）
    const CHUNK_SIZE = 256000;
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

  /**
   * Parse xlsx buffer into CellValue[][] using ExcelJS
   */
  private async parseXlsxBuffer(buffer: ArrayBuffer): Promise<CellValue[][]> {
    const ExcelJS = await import('exceljs');
    const workbook = new ExcelJS.default.Workbook();
    await workbook.xlsx.load(buffer);
    const ws = workbook.worksheets[0];
    if (!ws) return [];

    const data: CellValue[][] = [];
    ws.eachRow((row, _rowNumber) => {
      // ExcelJS values is 1-indexed, slice(1) to get 0-indexed array
      const cells = row.values as (string | number | boolean | null | undefined)[];
      data.push(cells.slice(1).map(v => v ?? null));
    });
    return data;
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    const chunks: string[] = [];
    for (let i = 0; i < bytes.length; i += 8192) {
      chunks.push(String.fromCharCode(...bytes.subarray(i, i + 8192)));
    }
    return btoa(chunks.join(''));
  }

  private runValidation(
    inMemoryData: Map<string, InMemoryTableData>,
    versionFilter: VersionFilter,
    config?: Config,
  ): void {
    const allowEmpty = config?.switches?.['允许空格'] ?? false;
    for (const [chineseName, tableData] of inMemoryData) {
      // ── 1. 校验行版本区间（versionRowData 列0）
      if (tableData.versionRowData) {
        const cells: { raw: CellValue; row: number; col: number }[] = [];
        for (let r = 2; r < tableData.versionRowData.length; r++) {
          cells.push({ raw: tableData.versionRowData[r][0], row: r + 1, col: 1 });
        }
        this.validateVersionCells(cells, chineseName, versionFilter);
      }

      // ── 2. 校验列版本区间（versionColData 第0行）
      if (tableData.versionColData && tableData.versionColData.length > 0) {
        const cells: { raw: CellValue; row: number; col: number }[] = [];
        const vcRow = tableData.versionColData[0];
        for (let c = 0; c < vcRow.length; c++) {
          cells.push({ raw: vcRow[c], row: 1, col: c + 1 });
        }
        this.validateVersionCells(cells, chineseName, versionFilter);
      }

      // ── 3. 校验主数据区（mainData）── 只检测有字段定义的列 + 有Key的行（Ctrl+A 有效区域）
      if (tableData.mainData.length > 2) {
        const fieldRow = tableData.mainData[0];
        let validColCount = 0;
        for (let c = 0; c < fieldRow.length; c++) {
          const val = String(fieldRow[c] ?? '').trim();
          if (!val) break;
          validColCount = c + 1;
        }

        // mainData 内部索引 → 工作表实际行列（1-indexed）
        const rowOffset = tableData.dataStartRow; // mainData[r] 对应工作表第 rowOffset + r 行（0-indexed）
        const colOffset = tableData.dataStartCol; // mainData[c] 对应工作表第 colOffset + c 列（0-indexed）

        let cellErrors = 0;
        const MAX_CELL_ERRORS = 100;
        for (let r = 2; r < tableData.mainData.length && cellErrors < MAX_CELL_ERRORS; r++) {
          const firstCell = tableData.mainData[r][0];
          if (firstCell == null || String(firstCell).trim() === '') break;

          for (let c = 0; c < validColCount && cellErrors < MAX_CELL_ERRORS; c++) {
            const raw = tableData.mainData[r][c];
            const absRow = rowOffset + r + 1; // 1-indexed
            const absCol = colOffset + c + 1; // 1-indexed

            if (isExcelError(raw)) {
              cellErrors++;
              this.errorHandler.logError({
                code: ErrorCode.CELL_EXCEL_ERROR,
                severity: 'warning',
                tableName: chineseName,
                message: `数据区域单元格包含错误值「${raw}」`,
                procedure: 'ExportJob.runValidation',
                location: { sheetName: chineseName, row: absRow, column: absCol, cellValue: String(raw ?? '') },
              });
              continue;
            }

            if (!allowEmpty && (raw === null || raw === undefined || raw === '')) {
              cellErrors++;
              const fieldName = String(tableData.mainData[0]?.[c] ?? '').split('=')[0];
              this.errorHandler.logError({
                code: ErrorCode.CELL_WHITESPACE_ONLY,
                severity: 'warning',
                tableName: chineseName,
                message: `"${fieldName}" 字段为空`,
                procedure: 'ExportJob.runValidation',
                location: { sheetName: chineseName, row: absRow, column: absCol, cellValue: '' },
              });
              continue;
            }

            if (!allowEmpty && typeof raw === 'string' && raw.length > 0 && raw.trim() === '') {
              cellErrors++;
              this.errorHandler.logError({
                code: ErrorCode.CELL_WHITESPACE_ONLY,
                severity: 'warning',
                tableName: chineseName,
                message: '数据区域单元格仅包含空格',
                procedure: 'ExportJob.runValidation',
                location: { sheetName: chineseName, row: absRow, column: absCol, cellValue: String(raw ?? '') },
              });
            }
          }
        }
      }
    }
  }

  /**
   * 校验版本区间单元格：检查 Excel 错误值和格式合法性
   */
  private validateVersionCells(
    cells: { raw: CellValue; row: number; col: number }[],
    chineseName: string,
    versionFilter: VersionFilter,
  ): void {
    for (const { raw, row, col } of cells) {
      const str = String(raw ?? '').trim();
      if (!str) continue;

      const loc = { sheetName: chineseName, row, column: col, cellValue: str };

      if (isExcelError(raw)) {
        this.errorHandler.logError({
          code: ErrorCode.CELL_EXCEL_ERROR,
          severity: 'warning',
          tableName: chineseName,
          message: `版本区间单元格包含错误值「${str}」`,
          procedure: 'ExportJob.runValidation',
          location: loc,
        });
        continue;
      }

      const validation = versionFilter.validateRangeFormat(str);
      if (!validation.valid) {
        this.errorHandler.logError({
          code: validation.errorCode ?? ErrorCode.VERSION_DATA_FORMAT_ERROR,
          severity: 'warning',
          tableName: chineseName,
          message: validation.message ?? `版本区间格式不正确「${str}」`,
          procedure: 'ExportJob.runValidation',
          location: loc,
        });
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
    tableDiffs: TableDiff[] = [],
    gitPushed = false,
    finalSequence?: number
  ): ExportResult {
    return {
      success,
      modifiedFiles,
      errors: this.errorHandler.getErrors(),
      duration: (Date.now() - startTime) / 1000,
      totalTables,
      changedTables,
      tableDiffs,
      gitPushed,
      finalSequence,
    };
  }

  getErrorHandler(): ErrorHandler {
    return this.errorHandler;
  }
}
