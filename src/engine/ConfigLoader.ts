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
import { excelHelper, SheetData, SheetSnapshot } from '../utils/ExcelHelper';
import { ErrorHandler } from '../utils/ErrorHandler';
import { logger } from '../utils/Logger';

// 工作表名常量
const SHEET_CONTROL = '表格输出';
const SHEET_SETTINGS = '配置设置表';
const SHEET_MAPPING = '表名对照';

export class ConfigLoader {
  private errorHandler: ErrorHandler;

  constructor(errorHandler: ErrorHandler) {
    this.errorHandler = errorHandler;
  }

  /**
   * 加载全部配置（一次性读取所有工作表到内存再解析）
   */
  async loadConfig(): Promise<Config | null> {
    return await Excel.run(async (context) => {
      // 一次性加载三张元数据表
      const controlSnap = await excelHelper.loadSheetSnapshot(context, SHEET_CONTROL);
      const settingsSnap = await excelHelper.loadSheetSnapshot(context, SHEET_SETTINGS);
      const mappingSnap = await excelHelper.loadSheetSnapshot(context, SHEET_MAPPING);

      if (!controlSnap || controlSnap.values.length === 0) {
        await this.errorHandler.log(
          ErrorCode.CONTROL_SHEET_NOT_FOUND, 'error', '',
          `找不到工作表「${SHEET_CONTROL}」或为空`, 'ConfigLoader.loadConfig'
        );
        return null;
      }
      if (!settingsSnap || settingsSnap.values.length === 0) {
        await this.errorHandler.log(
          ErrorCode.CONFIG_SETTINGS_NOT_FOUND, 'error', '',
          `找不到工作表「${SHEET_SETTINGS}」或为空`, 'ConfigLoader.loadConfig'
        );
        return null;
      }
      if (!mappingSnap || mappingSnap.values.length === 0) {
        await this.errorHandler.log(
          ErrorCode.MAPPING_SHEET_NOT_FOUND, 'error', '',
          `找不到工作表「${SHEET_MAPPING}」或为空`, 'ConfigLoader.loadConfig'
        );
        return null;
      }

      // 在内存中解析各配置区
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

      // 映射线路字段到版本模板
      for (const [, vt] of versionTemplates) {
        const lt = lineTemplates.get(vt.lineId);
        if (lt) {
          vt.lineField = lt.field;
        }
      }

      // 计算输出目录（与 VBA CalculateOutputDirectory 一致）
      const currentVT = versionTemplates.get(outputSettings.versionName);
      if (currentVT && currentVT.gitDirectory) {
        // VBA: 版本号不含小数点时补 .0（如 3 → "3.0"）
        let versionStr = String(outputSettings.versionNumber);
        if (!versionStr.includes('.')) {
          versionStr += '.0';
        }
        outputSettings.outputDirectory = currentVT.gitDirectory
          .replace('{0}', versionStr)
          .replace('{1}', '');
      }

      const config: Config = {
        versionTemplates,
        lineTemplates,
        tablesToProcess,
        outputSettings,
        gitCommitTemplate: gitCommitTemplate || '',
        staffCodes: staffCodes || new Map(),
        showResourcePopup: showResourcePopup,
      };

      logger.info('配置加载完成');
      return config;
    });
  }

  /**
   * 解析版本模板（#版本列表#）
   */
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

  /**
   * 解析线路模板（#线路列表#）
   */
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

  /**
   * 解析人员代码（#人员代码#）
   */
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

  /**
   * 解析输出设置（从表格输出表读取）
   * 实际布局:
   *   R6:C5=1152 (序列号，在 #数据表版本# 上一行的右一列)
   *   R7:C4=#数据表版本#
   *   R8:C4=#输出版本# | C5=国内
   *   R9:C4=#输出版本号# | C5=7.5
   */
  private parseOutputSettings(data: SheetData): OutputSettings | null {
    // 查找 #输出版本#
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

    // 查找 #输出版本号#
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

    // 查找版本序列号: #数据表版本# 标记上一行右一列
    let versionSequence = 0;
    const seqPos = excelHelper.findMarkerInData(data, '#数据表版本#');
    if (seqPos && seqPos.row > 0) {
      // 序列号在标记上一行的右一列 (offset -1, +1)
      const seqVal = data[seqPos.row - 1]?.[seqPos.col + 1];
      if (seqVal != null) {
        versionSequence = Number(seqVal) || 0;
      }
    }

    logger.info(`输出设置: 版本=${versionName}, 版本号=${versionNumber}, 序列号=${versionSequence}`);

    return {
      versionName,
      versionNumber,
      versionSequence,
      outputDirectory: '',
    };
  }

  /**
   * 解析表名对照（#输出控制#）
   * 实际布局: R1:C1=#输出控制# | C2=功能表名 | C3=输出表名 | C4=是否输出表
   *           R2起: 数据行
   */
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

      if (!chineseName) continue;
      if (!englishName) continue;

      tables.set(chineseName, {
        chineseName,
        englishName,
        shouldOutput,
        versionRange,
      });
    }

    logger.info(`加载了 ${tables.size} 张表的对照信息`);
    return tables;
  }

  /**
   * 解析Git提交日志模板
   */
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

  /**
   * 解析配置开关
   */
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
        const snap = await excelHelper.loadSheetSnapshot(context, SHEET_CONTROL);
        if (!snap) return;

        const seqPos = excelHelper.findMarkerInData(snap.values, '#数据表版本#');
        if (!seqPos || seqPos.row === 0) return;

        const newSeq = config.outputSettings.versionSequence + 1;
        const sheet = context.workbook.worksheets.getItem(SHEET_CONTROL);

        // 将 usedRange 内的相对索引转换为 sheet 上的绝对索引
        const absRow = seqPos.row + snap.startRow;
        const absCol = seqPos.col + snap.startCol;

        // VBA: versionSeqCell.Offset(-1, 1).Value = newSeq
        // 即 #数据表版本# 标记上一行、右一列
        const seqCell = sheet.getRangeByIndexes(absRow - 1, absCol + 1, 1, 1);
        seqCell.values = [[newSeq]];

        // 同时更新 #数据表版本# 右侧的版本全串（如 7.5.1152 → 7.5.1153）
        const versionFullCell = sheet.getRangeByIndexes(absRow, absCol + 1, 1, 1);
        const versionStr = String(config.outputSettings.versionNumber);
        versionFullCell.values = [[`${versionStr}.${newSeq}`]];

        await context.sync();

        config.outputSettings.versionSequence = newSeq;
        logger.info(`版本序列号更新为 ${newSeq}`);
      });
    } catch (err) {
      logger.error('更新版本序列号失败', err);
    }
  }
}
