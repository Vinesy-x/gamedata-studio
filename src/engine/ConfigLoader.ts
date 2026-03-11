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
import { excelHelper } from '../utils/ExcelHelper';
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

  async loadConfig(): Promise<Config | null> {
    return await Excel.run(async (context) => {
      // 验证三张元数据表存在
      const controlSheet = this.getRequiredSheet(context.workbook, SHEET_CONTROL, ErrorCode.CONTROL_SHEET_NOT_FOUND);
      const settingsSheet = this.getRequiredSheet(context.workbook, SHEET_SETTINGS, ErrorCode.CONFIG_SETTINGS_NOT_FOUND);
      const mappingSheet = this.getRequiredSheet(context.workbook, SHEET_MAPPING, ErrorCode.MAPPING_SHEET_NOT_FOUND);

      if (!controlSheet || !settingsSheet || !mappingSheet) {
        return null;
      }

      // 并行加载各配置区
      const [
        versionTemplatesResult,
        lineTemplatesResult,
        staffCodesResult,
        outputSettingsResult,
        tableListResult,
        gitCommitResult,
        switchResult,
      ] = await Promise.allSettled([
        this.loadVersionTemplates(settingsSheet),
        this.loadLineTemplates(settingsSheet),
        this.loadStaffCodes(settingsSheet),
        this.loadOutputSettings(controlSheet),
        this.loadTableList(mappingSheet),
        this.loadGitCommitTemplate(settingsSheet),
        this.loadConfigSwitch(settingsSheet),
      ]);

      // 检查关键配置是否成功加载
      const versionTemplates = this.unwrapResult(versionTemplatesResult);
      const lineTemplates = this.unwrapResult(lineTemplatesResult);
      const staffCodes = this.unwrapResult(staffCodesResult);
      const outputSettings = this.unwrapResult(outputSettingsResult);
      const tablesToProcess = this.unwrapResult(tableListResult);
      const gitCommitTemplate = this.unwrapResult(gitCommitResult);
      const showResourcePopup = this.unwrapResult(switchResult);

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

      // 计算输出目录
      const currentVT = versionTemplates.get(outputSettings.versionName);
      if (currentVT && currentVT.gitDirectory) {
        outputSettings.outputDirectory = currentVT.gitDirectory
          .replace('{0}', String(outputSettings.versionNumber))
          .replace('{1}', '');
      }

      const config: Config = {
        versionTemplates,
        lineTemplates,
        tablesToProcess,
        outputSettings,
        gitCommitTemplate: gitCommitTemplate || '',
        staffCodes: staffCodes || new Map(),
        showResourcePopup: showResourcePopup ?? false,
      };

      logger.info('配置加载完成', config);
      return config;
    });
  }

  private getRequiredSheet(
    workbook: Excel.Workbook,
    name: string,
    errorCode: number
  ): Excel.Worksheet | null {
    try {
      return workbook.worksheets.getItem(name);
    } catch {
      this.errorHandler.logError({
        code: errorCode,
        severity: 'error',
        tableName: '',
        message: `找不到工作表「${name}」`,
        procedure: 'ConfigLoader.loadConfig',
      });
      return null;
    }
  }

  /**
   * 加载版本模板（#版本列表#）
   */
  async loadVersionTemplates(sheet: Excel.Worksheet): Promise<Map<string, VersionTemplate>> {
    const marker = await excelHelper.findMarker(sheet, '#版本列表#');
    if (!marker) {
      await this.errorHandler.log(
        ErrorCode.VERSION_LIST_MARKER_NOT_FOUND, 'error', '',
        '找不到 #版本列表# 标记', 'ConfigLoader.loadVersionTemplates'
      );
      throw new Error('VERSION_LIST_MARKER_NOT_FOUND');
    }

    const rows = await excelHelper.readBlockBelow(sheet, marker, 4);
    const templates = new Map<string, VersionTemplate>();

    for (const row of rows) {
      const name = String(row[0]).trim();
      if (!name) continue;

      if (templates.has(name)) {
        await this.errorHandler.log(
          ErrorCode.DUPLICATE_VERSION_NAME, 'warning', '',
          `版本列表中发现重复版本名: ${name}`, 'ConfigLoader.loadVersionTemplates'
        );
        continue;
      }

      templates.set(name, {
        name,
        lineId: Number(row[1]) || 0,
        lineField: '',
        gitDirectory: String(row[2] || '').trim(),
      });
    }

    logger.info(`加载了 ${templates.size} 个版本模板`);
    return templates;
  }

  /**
   * 加载线路模板（#线路列表#）
   */
  async loadLineTemplates(sheet: Excel.Worksheet): Promise<Map<number, LineTemplate>> {
    const marker = await excelHelper.findMarker(sheet, '#线路列表#');
    if (!marker) {
      await this.errorHandler.log(
        ErrorCode.LINE_LIST_MARKER_NOT_FOUND, 'error', '',
        '找不到 #线路列表# 标记', 'ConfigLoader.loadLineTemplates'
      );
      throw new Error('LINE_LIST_MARKER_NOT_FOUND');
    }

    const rows = await excelHelper.readBlockBelow(sheet, marker, 3);
    const templates = new Map<number, LineTemplate>();

    for (const row of rows) {
      const id = Number(row[0]);
      if (isNaN(id) || id === 0) continue;

      if (templates.has(id)) {
        await this.errorHandler.log(
          ErrorCode.DUPLICATE_LINE_ID, 'warning', '',
          `线路列表中发现重复线路ID: ${id}`, 'ConfigLoader.loadLineTemplates'
        );
        continue;
      }

      templates.set(id, {
        id,
        field: String(row[1] || '').trim(),
        remark: String(row[2] || '').trim(),
      });
    }

    logger.info(`加载了 ${templates.size} 个线路模板`);
    return templates;
  }

  /**
   * 加载人员代码（#人员代码#）
   */
  async loadStaffCodes(sheet: Excel.Worksheet): Promise<Map<string, StaffInfo>> {
    const marker = await excelHelper.findMarker(sheet, '#人员代码#');
    if (!marker) {
      await this.errorHandler.log(
        ErrorCode.STAFF_CODE_MARKER_NOT_FOUND, 'warning', '',
        '找不到 #人员代码# 标记', 'ConfigLoader.loadStaffCodes'
      );
      return new Map();
    }

    const rows = await excelHelper.readBlockBelow(sheet, marker, 4);
    const staffMap = new Map<string, StaffInfo>();

    for (const row of rows) {
      const name = String(row[1] || '').trim();
      if (!name) continue;
      staffMap.set(name, {
        id: Number(row[0]) || 0,
        name,
        code: String(row[2] || '').trim(),
        machineCode: String(row[3] || '').trim(),
      });
    }

    return staffMap;
  }

  /**
   * 加载输出设置（从表格输出表读取）
   */
  async loadOutputSettings(sheet: Excel.Worksheet): Promise<OutputSettings> {
    // 查找输出版本名
    const versionNameMarker = await excelHelper.findMarker(sheet, '#输出版本#');
    if (!versionNameMarker) {
      await this.errorHandler.log(
        ErrorCode.OUTPUT_VERSION_MARKER_NOT_FOUND, 'error', '',
        '找不到 #输出版本# 标记', 'ConfigLoader.loadOutputSettings'
      );
      throw new Error('OUTPUT_VERSION_MARKER_NOT_FOUND');
    }

    versionNameMarker.load('rowIndex,columnIndex');
    await sheet.context.sync();

    // 版本名在标记右侧一列
    const versionNameCell = sheet.getRangeByIndexes(
      versionNameMarker.rowIndex, versionNameMarker.columnIndex + 1, 1, 1
    );
    versionNameCell.load('values');
    await sheet.context.sync();
    const versionName = String(versionNameCell.values[0][0] || '').trim();

    if (!versionName) {
      await this.errorHandler.log(
        ErrorCode.OUTPUT_VERSION_EMPTY, 'error', '',
        '输出版本名称为空', 'ConfigLoader.loadOutputSettings'
      );
      throw new Error('OUTPUT_VERSION_EMPTY');
    }

    // 查找输出版本号
    const versionNumMarker = await excelHelper.findMarker(sheet, '#输出版本号#');
    if (!versionNumMarker) {
      await this.errorHandler.log(
        ErrorCode.OUTPUT_VERSION_NUM_MARKER_NOT_FOUND, 'error', '',
        '找不到 #输出版本号# 标记', 'ConfigLoader.loadOutputSettings'
      );
      throw new Error('OUTPUT_VERSION_NUM_MARKER_NOT_FOUND');
    }

    versionNumMarker.load('rowIndex,columnIndex');
    await sheet.context.sync();

    const versionNumCell = sheet.getRangeByIndexes(
      versionNumMarker.rowIndex, versionNumMarker.columnIndex + 1, 1, 1
    );
    versionNumCell.load('values');
    await sheet.context.sync();
    const versionNumber = Number(versionNumCell.values[0][0]);

    if (isNaN(versionNumber)) {
      await this.errorHandler.log(
        ErrorCode.OUTPUT_VERSION_NUM_NOT_NUMBER, 'error', '',
        '输出版本号非数字', 'ConfigLoader.loadOutputSettings'
      );
      throw new Error('OUTPUT_VERSION_NUM_NOT_NUMBER');
    }

    // 查找版本序列号
    const seqMarker = await excelHelper.findMarker(sheet, '#数据表版本#');
    let versionSequence = 0;
    if (seqMarker) {
      seqMarker.load('rowIndex,columnIndex');
      await sheet.context.sync();

      // 序列号存储在标记的偏移位置
      const seqCell = sheet.getRangeByIndexes(
        seqMarker.rowIndex + 1, seqMarker.columnIndex + 1, 1, 1
      );
      seqCell.load('values');
      await sheet.context.sync();

      const seqValue = seqCell.values[0][0];
      const seqStr = String(seqValue || '');
      // 版本号格式可能是 "7.5.1152"，取最后一段
      const parts = seqStr.split('.');
      versionSequence = Number(parts[parts.length - 1]) || 0;
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
   * 加载表名对照（#输出控制#）
   */
  async loadTableList(sheet: Excel.Worksheet): Promise<Map<string, TableInfo>> {
    const marker = await excelHelper.findMarker(sheet, '#输出控制#');
    if (!marker) {
      await this.errorHandler.log(
        ErrorCode.OUTPUT_CONTROL_MARKER_NOT_FOUND, 'error', '',
        '找不到 #输出控制# 标记', 'ConfigLoader.loadTableList'
      );
      throw new Error('OUTPUT_CONTROL_MARKER_NOT_FOUND');
    }

    const rows = await excelHelper.readBlockBelow(sheet, marker, 4);
    const tables = new Map<string, TableInfo>();

    for (const row of rows) {
      const versionRange = String(row[0] || '').trim();
      const chineseName = String(row[1] || '').trim();
      const englishName = String(row[2] || '').trim();
      const shouldOutput = String(row[3] || '').trim().toLowerCase() === 'true';

      if (!chineseName) {
        await this.errorHandler.log(
          ErrorCode.TABLE_CHINESE_NAME_EMPTY, 'warning', '',
          '表名对照中某行中文表名为空', 'ConfigLoader.loadTableList'
        );
        continue;
      }

      if (!englishName) {
        await this.errorHandler.log(
          ErrorCode.TABLE_ENGLISH_NAME_EMPTY, 'warning', '',
          `表名对照中 ${chineseName} 的英文表名为空`, 'ConfigLoader.loadTableList'
        );
        continue;
      }

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
   * 加载Git提交日志模板
   */
  async loadGitCommitTemplate(sheet: Excel.Worksheet): Promise<string> {
    const marker = await excelHelper.findMarker(sheet, '#Git通用提交日志#');
    if (!marker) {
      await this.errorHandler.log(
        ErrorCode.GIT_COMMIT_LOG_MARKER_NOT_FOUND, 'warning', '',
        '找不到 #Git通用提交日志# 标记', 'ConfigLoader.loadGitCommitTemplate'
      );
      return '';
    }

    const rows = await excelHelper.readBlockBelow(sheet, marker, 1);
    return rows.length > 0 ? String(rows[0][0] || '').trim() : '';
  }

  /**
   * 加载配置开关
   */
  async loadConfigSwitch(sheet: Excel.Worksheet): Promise<boolean> {
    const marker = await excelHelper.findMarker(sheet, '#配置开关#');
    if (!marker) return false;

    const rows = await excelHelper.readBlockBelow(sheet, marker, 2);
    for (const row of rows) {
      if (String(row[0]).includes('自动弹出路径')) {
        return String(row[1]).trim().toLowerCase() === 'true';
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
        const sheet = context.workbook.worksheets.getItem(SHEET_CONTROL);
        const marker = await excelHelper.findMarker(sheet, '#数据表版本#');
        if (!marker) return;

        marker.load('rowIndex,columnIndex');
        await context.sync();

        const seqCell = sheet.getRangeByIndexes(
          marker.rowIndex + 1, marker.columnIndex + 1, 1, 1
        );

        const newSeq = config.outputSettings.versionSequence + 1;
        const newValue = `${config.outputSettings.versionNumber}.${newSeq}`;
        seqCell.values = [[newValue]];
        await context.sync();

        config.outputSettings.versionSequence = newSeq;
        logger.info(`版本序列号更新为 ${newValue}`);
      });
    } catch (err) {
      logger.error('更新版本序列号失败', err);
    }
  }

  private unwrapResult<T>(result: PromiseSettledResult<T>): T | null {
    if (result.status === 'fulfilled') return result.value;
    logger.error('配置加载子任务失败', result.reason);
    return null;
  }
}
