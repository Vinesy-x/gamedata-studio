/* global Excel */

import {
  Config,
  VersionTemplate,
  LineTemplate,
  TableInfo,
  OutputSettings,
  StaffInfo,
} from '../types/config';
import { ErrorCode } from '../types/errors';
import { excelHelper, SheetData } from '../utils/ExcelHelper';
import { ErrorHandler } from '../utils/ErrorHandler';
import { logger } from '../utils/Logger';

import { SHEET_CONFIG, templateFactory } from '../v2/TemplateFactory';
import { StudioConfigStore, StudioConfigData } from '../v2/StudioConfigStore';

export class ConfigLoader {
  private errorHandler: ErrorHandler;

  constructor(errorHandler: ErrorHandler) {
    this.errorHandler = errorHandler;
  }

  /**
   * 加载全部配置
   * 优先从 StudioConfig JSON 读取，否则尝试自动迁移，最后回退旧格式
   */
  async loadConfig(): Promise<Config | null> {
    return await Excel.run(async (context) => {
      // 1. 尝试从 JSON 加载
      let jsonData = await StudioConfigStore.load(context);

      // 2. JSON 不存在 → 尝试自动迁移
      if (!jsonData) {
        try {
          await templateFactory.migrateFromLegacy();
          jsonData = await StudioConfigStore.load(context);
        } catch (err) {
          logger.warn(`自动迁移失败: ${err instanceof Error ? err.message : String(err)}`);
        }
      }

      // 3. JSON 加载成功 → 从 JSON 构建 Config
      if (jsonData) {
        // 表列表始终从表名对照读取（单一数据源）
        const snap = await excelHelper.loadSheetSnapshot(context, '表名对照');
        return this.buildConfigFromJson(jsonData, snap?.values);
      }

      // 4. 最终回退：旧格式三表
      return this.loadFromLegacy(context);
    });
  }

  /**
   * 从 JSON 数据构建 Config 对象
   */
  private buildConfigFromJson(data: StudioConfigData, mappingValues?: SheetData): Config {
    // 版本模板
    const versionTemplates = new Map<string, VersionTemplate>();
    for (const v of data.versions) {
      if (!v.name) continue;
      versionTemplates.set(v.name, { ...v });
    }

    // 线路模板
    const lineTemplates = new Map<number, LineTemplate>();
    for (const l of data.lines) {
      lineTemplates.set(l.id, { ...l });
    }

    // 映射线路字段到版本模板
    for (const [, vt] of versionTemplates) {
      const lt = lineTemplates.get(vt.lineId);
      if (lt) vt.lineField = lt.field;
    }

    // 输出设置
    const outputSettings: OutputSettings = {
      versionName: data.outputVersion,
      versionNumber: data.outputVersionNumber,
      versionSequence: data.versionSequence,
      outputDirectory: '',
    };

    // 计算输出目录
    const currentVT = versionTemplates.get(outputSettings.versionName);
    if (currentVT && currentVT.gitDirectory) {
      let versionStr = String(outputSettings.versionNumber);
      if (!versionStr.includes('.')) versionStr += '.0';
      outputSettings.outputDirectory = currentVT.gitDirectory
        .replace('{0}', versionStr).replace('{1}', outputSettings.versionName);
    }

    // 表列表（优先从表名对照读取，保证与工作表实时同步）
    const tablesToProcess = new Map<string, TableInfo>();
    if (mappingValues) {
      const tables = this.parseTableList(mappingValues);
      if (tables) {
        for (const [name, info] of tables) {
          tablesToProcess.set(name, info);
        }
      }
    }
    // 回退到 JSON 中的表列表
    if (tablesToProcess.size === 0) {
      for (const t of data.tables) {
        if (t.chineseName && t.englishName) {
          tablesToProcess.set(t.chineseName, { ...t });
        }
      }
    }

    // 人员代码
    const staffCodes = new Map<string, StaffInfo>();
    for (const s of data.staff) {
      if (s.name) staffCodes.set(s.name, { ...s });
    }

    // 配置开关
    const showResourcePopup = data.switches['自动弹出路径'] ?? false;
    const detailedDiff = data.switches['详细差异对比'] ?? false;

    logger.info('配置加载完成 (JSON 格式)');
    return {
      versionTemplates,
      lineTemplates,
      tablesToProcess,
      outputSettings,
      gitCommitTemplate: data.gitCommitTemplate || '',
      staffCodes,
      showResourcePopup,
      detailedDiff,
    };
  }

  /**
   * 从旧格式三表加载配置（最终回退）
   */
  private async loadFromLegacy(context: Excel.RequestContext): Promise<Config | null> {
    const controlSnap = await excelHelper.loadSheetSnapshot(context, '表格输出');
    const settingsSnap = await excelHelper.loadSheetSnapshot(context, '配置设置表');
    const mappingSnap = await excelHelper.loadSheetSnapshot(context, '表名对照');

    if (!controlSnap || !settingsSnap || !mappingSnap ||
        controlSnap.values.length === 0 || settingsSnap.values.length === 0 || mappingSnap.values.length === 0) {
      await this.errorHandler.log(
        ErrorCode.CONFIG_SETTINGS_NOT_FOUND, 'error', '',
        `找不到「${SHEET_CONFIG}」工作表，也找不到旧格式（表格输出/配置设置表/表名对照）`, 'ConfigLoader.loadConfig'
      );
      return null;
    }

    const versionTemplates = this.parseVersionTemplates(settingsSnap.values);
    const lineTemplates = this.parseLineTemplates(settingsSnap.values);
    const staffCodes = this.parseStaffCodes(settingsSnap.values);
    const outputSettings = this.parseOutputSettings(controlSnap.values);
    const tablesToProcess = this.parseTableList(mappingSnap.values);
    const gitCommitTemplate = this.parseGitCommitTemplate(settingsSnap.values);
    const showResourcePopup = this.parseConfigSwitch(settingsSnap.values);

    if (!versionTemplates || !lineTemplates || !outputSettings || !tablesToProcess) {
      return null;
    }

    for (const [, vt] of versionTemplates) {
      const lt = lineTemplates.get(vt.lineId);
      if (lt) vt.lineField = lt.field;
    }

    const currentVT = versionTemplates.get(outputSettings.versionName);
    if (currentVT && currentVT.gitDirectory) {
      let versionStr = String(outputSettings.versionNumber);
      if (!versionStr.includes('.')) versionStr += '.0';
      outputSettings.outputDirectory = currentVT.gitDirectory
        .replace('{0}', versionStr).replace('{1}', outputSettings.versionName);
    }

    logger.info('配置加载完成（旧格式兼容模式）');
    return {
      versionTemplates, lineTemplates, tablesToProcess, outputSettings,
      gitCommitTemplate: gitCommitTemplate || '', staffCodes: staffCodes || new Map(),
      showResourcePopup, detailedDiff: false,
    };
  }

  // ─── 旧格式解析方法（保留用于兼容）───────────────────

  private parseVersionTemplates(data: SheetData): Map<string, VersionTemplate> | null {
    const pos = excelHelper.findMarkerInData(data, '#版本列表#');
    if (!pos) {
      this.errorHandler.logError({
        code: ErrorCode.VERSION_LIST_MARKER_NOT_FOUND, severity: 'error', tableName: '',
        message: '找不到 #版本列表# 标记', procedure: 'ConfigLoader.parseVersionTemplates',
      });
      return null;
    }

    const rows = excelHelper.readBlockBelow(data, pos.row, pos.col, 4);
    const templates = new Map<string, VersionTemplate>();

    for (const row of rows) {
      const name = String(row[0] ?? '').trim();
      if (!name) continue;

      if (templates.has(name)) {
        this.errorHandler.logError({
          code: ErrorCode.DUPLICATE_VERSION_NAME, severity: 'warning', tableName: '',
          message: `版本列表中发现重复版本名: ${name}`, procedure: 'ConfigLoader.parseVersionTemplates',
        });
        continue;
      }

      templates.set(name, {
        name,
        lineId: Number(row[1]) || 0,
        lineField: '',
        gitDirectory: String(row[2] ?? '').trim(),
      });
    }

    logger.info(`加载了 ${templates.size} 个版本模板`);
    return templates;
  }

  private parseLineTemplates(data: SheetData): Map<number, LineTemplate> | null {
    const pos = excelHelper.findMarkerInData(data, '#线路列表#');
    if (!pos) {
      this.errorHandler.logError({
        code: ErrorCode.LINE_LIST_MARKER_NOT_FOUND, severity: 'error', tableName: '',
        message: '找不到 #线路列表# 标记', procedure: 'ConfigLoader.parseLineTemplates',
      });
      return null;
    }

    const rows = excelHelper.readBlockBelow(data, pos.row, pos.col, 3);
    const templates = new Map<number, LineTemplate>();

    for (const row of rows) {
      const id = Number(row[0]);
      if (isNaN(id) || id === 0) continue;

      templates.set(id, {
        id,
        field: String(row[1] ?? '').trim(),
        remark: String(row[2] ?? '').trim(),
      });
    }

    logger.info(`加载了 ${templates.size} 个线路模板`);
    return templates;
  }

  private parseStaffCodes(data: SheetData): Map<string, StaffInfo> {
    const pos = excelHelper.findMarkerInData(data, '#人员代码#');
    if (!pos) {
      this.errorHandler.logError({
        code: ErrorCode.STAFF_CODE_MARKER_NOT_FOUND, severity: 'warning', tableName: '',
        message: '找不到 #人员代码# 标记', procedure: 'ConfigLoader.parseStaffCodes',
      });
      return new Map();
    }

    const rows = excelHelper.readBlockBelow(data, pos.row, pos.col, 4);
    const staffMap = new Map<string, StaffInfo>();

    for (const row of rows) {
      const name = String(row[1] ?? '').trim();
      if (!name) continue;
      staffMap.set(name, {
        id: Number(row[0]) || 0,
        name,
        code: String(row[2] ?? '').trim(),
        machineCode: String(row[3] ?? '').trim(),
      });
    }

    return staffMap;
  }

  private parseOutputSettings(data: SheetData): OutputSettings | null {
    const versionNamePos = excelHelper.findMarkerInData(data, '#输出版本#');
    if (!versionNamePos) {
      this.errorHandler.logError({
        code: ErrorCode.OUTPUT_VERSION_MARKER_NOT_FOUND, severity: 'error', tableName: '',
        message: '找不到 #输出版本# 标记', procedure: 'ConfigLoader.parseOutputSettings',
      });
      return null;
    }
    const versionName = String(excelHelper.getValueRight(data, versionNamePos.row, versionNamePos.col) ?? '').trim();

    if (!versionName) {
      this.errorHandler.logError({
        code: ErrorCode.OUTPUT_VERSION_EMPTY, severity: 'error', tableName: '',
        message: '输出版本名称为空', procedure: 'ConfigLoader.parseOutputSettings',
      });
      return null;
    }

    const versionNumPos = excelHelper.findMarkerInData(data, '#输出版本号#');
    if (!versionNumPos) {
      this.errorHandler.logError({
        code: ErrorCode.OUTPUT_VERSION_NUM_MARKER_NOT_FOUND, severity: 'error', tableName: '',
        message: '找不到 #输出版本号# 标记', procedure: 'ConfigLoader.parseOutputSettings',
      });
      return null;
    }
    const versionNumber = Number(excelHelper.getValueRight(data, versionNumPos.row, versionNumPos.col));

    if (isNaN(versionNumber)) {
      this.errorHandler.logError({
        code: ErrorCode.OUTPUT_VERSION_NUM_NOT_NUMBER, severity: 'error', tableName: '',
        message: '输出版本号非数字', procedure: 'ConfigLoader.parseOutputSettings',
      });
      return null;
    }

    let versionSequence = 0;
    const seqPos = excelHelper.findMarkerInData(data, '#数据表版本#');
    if (seqPos && seqPos.row > 0) {
      const seqVal = data[seqPos.row - 1]?.[seqPos.col + 1];
      if (seqVal != null) {
        versionSequence = Number(seqVal) || 0;
      }
    }

    return { versionName, versionNumber, versionSequence, outputDirectory: '' };
  }

  private parseTableList(data: SheetData): Map<string, TableInfo> | null {
    const pos = excelHelper.findMarkerInData(data, '#输出控制#');
    if (!pos) {
      this.errorHandler.logError({
        code: ErrorCode.OUTPUT_CONTROL_MARKER_NOT_FOUND, severity: 'error', tableName: '',
        message: '找不到 #输出控制# 标记', procedure: 'ConfigLoader.parseTableList',
      });
      return null;
    }

    const rows = excelHelper.readBlockBelow(data, pos.row, pos.col, 4);
    const tables = new Map<string, TableInfo>();

    for (const row of rows) {
      const versionRange = String(row[0] ?? '').trim();
      const chineseName = String(row[1] ?? '').trim();
      const englishName = String(row[2] ?? '').trim();
      const shouldOutput = String(row[3] ?? '').trim().toLowerCase() === 'true';
      if (!chineseName || !englishName) continue;
      tables.set(chineseName, { chineseName, englishName, shouldOutput, versionRange });
    }

    logger.info(`加载了 ${tables.size} 张表的对照信息`);
    return tables;
  }

  private parseGitCommitTemplate(data: SheetData): string {
    const pos = excelHelper.findMarkerInData(data, '#Git通用提交日志#');
    if (!pos) {
      this.errorHandler.logError({
        code: ErrorCode.GIT_COMMIT_LOG_MARKER_NOT_FOUND, severity: 'warning', tableName: '',
        message: '找不到 #Git通用提交日志# 标记', procedure: 'ConfigLoader.parseGitCommitTemplate',
      });
      return '';
    }

    const rows = excelHelper.readBlockBelow(data, pos.row, pos.col, 1);
    return rows.length > 0 ? String(rows[0][0] ?? '').trim() : '';
  }

  private parseConfigSwitch(data: SheetData): boolean {
    const pos = excelHelper.findMarkerInData(data, '#配置开关#');
    if (!pos) return false;

    const rows = excelHelper.readBlockBelow(data, pos.row, pos.col, 2);
    for (const row of rows) {
      if (String(row[0] ?? '').includes('自动弹出路径')) {
        return String(row[1] ?? '').trim().toLowerCase() === 'true';
      }
    }
    return false;
  }

  /**
   * 确定输出线路字段名
   */
  determineOutputLineField(config: Config): string {
    const vt = config.versionTemplates.get(config.outputSettings.versionName);
    if (!vt) return 'roads_0';
    return vt.lineField || 'roads_0';
  }

  /**
   * 导出完成后自增版本序列号
   */
  async incrementSequence(config: Config): Promise<void> {
    try {
      await Excel.run(async (context) => {
        const newSeq = config.outputSettings.versionSequence + 1;
        const versionStr = String(config.outputSettings.versionNumber);

        // 优先 JSON
        const ok = await StudioConfigStore.update(context, (data) => {
          data.versionSequence = newSeq;
          data.fullVersion = `${versionStr}.${newSeq}`;
        });

        if (!ok) {
          // 旧格式回退
          const snap = await excelHelper.loadSheetSnapshot(context, '表格输出');
          if (!snap) return;
          const seqPos = excelHelper.findMarkerInData(snap.values, '#数据表版本#');
          if (!seqPos || seqPos.row === 0) return;

          const sheet = context.workbook.worksheets.getItem('表格输出');
          const absRow = seqPos.row + snap.startRow;
          const absCol = seqPos.col + snap.startCol;

          sheet.getRangeByIndexes(absRow - 1, absCol + 1, 1, 1).values = [[newSeq]];
          sheet.getRangeByIndexes(absRow, absCol + 1, 1, 1).values = [[`${versionStr}.${newSeq}`]];
          await context.sync();
        }

        config.outputSettings.versionSequence = newSeq;
        logger.info(`版本序列号更新为 ${newSeq}`);
      });
    } catch (err) {
      logger.error('更新版本序列号失败', err);
    }
  }
}
