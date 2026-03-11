/* global Excel */

import { VersionTemplate, LineTemplate, StaffInfo } from '../types/config';
import { excelHelper, SheetSnapshot } from '../utils/ExcelHelper';
import { logger } from '../utils/Logger';

// 工作表名常量
const SHEET_CONTROL = '表格输出';
const SHEET_SETTINGS = '配置设置表';

/**
 * ConfigManager — v2.0 配置双写管理器
 *
 * 负责将侧边栏的配置变更写回 Excel 工作表，
 * 同时维护内存侧状态的同步。
 */
export class ConfigManager {
  // ─── 版本模板管理（#版本列表#）──────────────────────────

  /**
   * 在 #版本列表# 区域最后一行下方追加一个版本模板
   */
  async addVersion(version: VersionTemplate): Promise<void> {
    await Excel.run(async (context) => {
      const snap = await excelHelper.loadSheetSnapshot(context, SHEET_SETTINGS);
      if (!snap) {
        logger.error('addVersion: 无法加载配置设置表');
        return;
      }

      const pos = excelHelper.findMarkerInData(snap.values, '#版本列表#');
      if (!pos) {
        logger.error('addVersion: 找不到 #版本列表# 标记');
        return;
      }

      const rows = excelHelper.readBlockBelow(snap.values, pos.row, pos.col, 4);
      const insertRow = pos.row + 1 + rows.length;

      const sheet = context.workbook.worksheets.getItem(SHEET_SETTINGS);
      const absRow = insertRow + snap.startRow;
      const absCol = pos.col + snap.startCol;

      const range = sheet.getRangeByIndexes(absRow, absCol, 1, 4);
      range.values = [[
        version.name,
        version.lineId,
        version.gitDirectory,
        version.lineField,
      ]];

      await context.sync();
      logger.info(`addVersion: 已追加版本「${version.name}」`);
    });
  }

  /**
   * 根据旧名称找到对应行并更新版本模板
   */
  async updateVersion(oldName: string, updated: VersionTemplate): Promise<void> {
    await Excel.run(async (context) => {
      const snap = await excelHelper.loadSheetSnapshot(context, SHEET_SETTINGS);
      if (!snap) {
        logger.error('updateVersion: 无法加载配置设置表');
        return;
      }

      const pos = excelHelper.findMarkerInData(snap.values, '#版本列表#');
      if (!pos) {
        logger.error('updateVersion: 找不到 #版本列表# 标记');
        return;
      }

      const rows = excelHelper.readBlockBelow(snap.values, pos.row, pos.col, 4);
      const matchIndex = rows.findIndex(
        (row) => String(row[0] ?? '').trim() === oldName
      );

      if (matchIndex === -1) {
        logger.warn(`updateVersion: 未找到版本「${oldName}」`);
        return;
      }

      const targetRow = pos.row + 1 + matchIndex;
      const sheet = context.workbook.worksheets.getItem(SHEET_SETTINGS);
      const absRow = targetRow + snap.startRow;
      const absCol = pos.col + snap.startCol;

      const range = sheet.getRangeByIndexes(absRow, absCol, 1, 4);
      range.values = [[
        updated.name,
        updated.lineId,
        updated.gitDirectory,
        updated.lineField,
      ]];

      await context.sync();
      logger.info(`updateVersion: 已更新版本「${oldName}」→「${updated.name}」`);
    });
  }

  /**
   * 根据名称找到对应行并清空内容（删除版本）
   */
  async deleteVersion(name: string): Promise<void> {
    await Excel.run(async (context) => {
      const snap = await excelHelper.loadSheetSnapshot(context, SHEET_SETTINGS);
      if (!snap) {
        logger.error('deleteVersion: 无法加载配置设置表');
        return;
      }

      const pos = excelHelper.findMarkerInData(snap.values, '#版本列表#');
      if (!pos) {
        logger.error('deleteVersion: 找不到 #版本列表# 标记');
        return;
      }

      const rows = excelHelper.readBlockBelow(snap.values, pos.row, pos.col, 4);
      const matchIndex = rows.findIndex(
        (row) => String(row[0] ?? '').trim() === name
      );

      if (matchIndex === -1) {
        logger.warn(`deleteVersion: 未找到版本「${name}」`);
        return;
      }

      const targetRow = pos.row + 1 + matchIndex;
      const sheet = context.workbook.worksheets.getItem(SHEET_SETTINGS);
      const absRow = targetRow + snap.startRow;
      const absCol = pos.col + snap.startCol;

      const range = sheet.getRangeByIndexes(absRow, absCol, 1, 4);
      range.values = [['', '', '', '']];

      await context.sync();
      logger.info(`deleteVersion: 已删除版本「${name}」`);
    });
  }

  // ─── 线路模板管理（#线路列表#）──────────────────────────

  /**
   * 在 #线路列表# 区域最后一行下方追加一条线路
   */
  async addLine(line: LineTemplate): Promise<void> {
    await Excel.run(async (context) => {
      const snap = await excelHelper.loadSheetSnapshot(context, SHEET_SETTINGS);
      if (!snap) {
        logger.error('addLine: 无法加载配置设置表');
        return;
      }

      const pos = excelHelper.findMarkerInData(snap.values, '#线路列表#');
      if (!pos) {
        logger.error('addLine: 找不到 #线路列表# 标记');
        return;
      }

      const rows = excelHelper.readBlockBelow(snap.values, pos.row, pos.col, 3);
      const insertRow = pos.row + 1 + rows.length;

      const sheet = context.workbook.worksheets.getItem(SHEET_SETTINGS);
      const absRow = insertRow + snap.startRow;
      const absCol = pos.col + snap.startCol;

      const range = sheet.getRangeByIndexes(absRow, absCol, 1, 3);
      range.values = [[line.id, line.field, line.remark]];

      await context.sync();
      logger.info(`addLine: 已追加线路 id=${line.id}`);
    });
  }

  /**
   * 根据 id 找到对应行并更新线路模板
   */
  async updateLine(id: number, updated: LineTemplate): Promise<void> {
    await Excel.run(async (context) => {
      const snap = await excelHelper.loadSheetSnapshot(context, SHEET_SETTINGS);
      if (!snap) {
        logger.error('updateLine: 无法加载配置设置表');
        return;
      }

      const pos = excelHelper.findMarkerInData(snap.values, '#线路列表#');
      if (!pos) {
        logger.error('updateLine: 找不到 #线路列表# 标记');
        return;
      }

      const rows = excelHelper.readBlockBelow(snap.values, pos.row, pos.col, 3);
      const matchIndex = rows.findIndex((row) => Number(row[0]) === id);

      if (matchIndex === -1) {
        logger.warn(`updateLine: 未找到线路 id=${id}`);
        return;
      }

      const targetRow = pos.row + 1 + matchIndex;
      const sheet = context.workbook.worksheets.getItem(SHEET_SETTINGS);
      const absRow = targetRow + snap.startRow;
      const absCol = pos.col + snap.startCol;

      const range = sheet.getRangeByIndexes(absRow, absCol, 1, 3);
      range.values = [[updated.id, updated.field, updated.remark]];

      await context.sync();
      logger.info(`updateLine: 已更新线路 id=${id}`);
    });
  }

  // ─── 人员代码管理（#人员代码#）──────────────────────────

  /**
   * 在 #人员代码# 区域最后一行下方追加一条人员
   */
  async addStaff(staff: StaffInfo): Promise<void> {
    await Excel.run(async (context) => {
      const snap = await excelHelper.loadSheetSnapshot(context, SHEET_SETTINGS);
      if (!snap) {
        logger.error('addStaff: 无法加载配置设置表');
        return;
      }

      const pos = excelHelper.findMarkerInData(snap.values, '#人员代码#');
      if (!pos) {
        logger.error('addStaff: 找不到 #人员代码# 标记');
        return;
      }

      const rows = excelHelper.readBlockBelow(snap.values, pos.row, pos.col, 4);
      const insertRow = pos.row + 1 + rows.length;

      const sheet = context.workbook.worksheets.getItem(SHEET_SETTINGS);
      const absRow = insertRow + snap.startRow;
      const absCol = pos.col + snap.startCol;

      const range = sheet.getRangeByIndexes(absRow, absCol, 1, 4);
      range.values = [[staff.id, staff.name, staff.code, staff.machineCode]];

      await context.sync();
      logger.info(`addStaff: 已追加人员「${staff.name}」`);
    });
  }

  /**
   * 根据姓名找到对应行并更新人员信息
   */
  async updateStaff(name: string, updated: StaffInfo): Promise<void> {
    await Excel.run(async (context) => {
      const snap = await excelHelper.loadSheetSnapshot(context, SHEET_SETTINGS);
      if (!snap) {
        logger.error('updateStaff: 无法加载配置设置表');
        return;
      }

      const pos = excelHelper.findMarkerInData(snap.values, '#人员代码#');
      if (!pos) {
        logger.error('updateStaff: 找不到 #人员代码# 标记');
        return;
      }

      const rows = excelHelper.readBlockBelow(snap.values, pos.row, pos.col, 4);
      // 人员代码区：第 0 列=id，第 1 列=name（与 ConfigLoader 解析一致）
      const matchIndex = rows.findIndex(
        (row) => String(row[1] ?? '').trim() === name
      );

      if (matchIndex === -1) {
        logger.warn(`updateStaff: 未找到人员「${name}」`);
        return;
      }

      const targetRow = pos.row + 1 + matchIndex;
      const sheet = context.workbook.worksheets.getItem(SHEET_SETTINGS);
      const absRow = targetRow + snap.startRow;
      const absCol = pos.col + snap.startCol;

      const range = sheet.getRangeByIndexes(absRow, absCol, 1, 4);
      range.values = [[updated.id, updated.name, updated.code, updated.machineCode]];

      await context.sync();
      logger.info(`updateStaff: 已更新人员「${name}」→「${updated.name}」`);
    });
  }

  // ─── Git 提交模板（#Git通用提交日志#）────────────────────

  /**
   * 设置 Git 通用提交日志模板（写到标记下一行）
   */
  async setGitCommitTemplate(template: string): Promise<void> {
    await Excel.run(async (context) => {
      const snap = await excelHelper.loadSheetSnapshot(context, SHEET_SETTINGS);
      if (!snap) {
        logger.error('setGitCommitTemplate: 无法加载配置设置表');
        return;
      }

      const pos = excelHelper.findMarkerInData(snap.values, '#Git通用提交日志#');
      if (!pos) {
        logger.error('setGitCommitTemplate: 找不到 #Git通用提交日志# 标记');
        return;
      }

      const sheet = context.workbook.worksheets.getItem(SHEET_SETTINGS);
      const absRow = pos.row + 1 + snap.startRow;
      const absCol = pos.col + snap.startCol;

      const range = sheet.getRangeByIndexes(absRow, absCol, 1, 1);
      range.values = [[template]];

      await context.sync();
      logger.info('setGitCommitTemplate: 已更新 Git 提交模板');
    });
  }

  // ─── 功能开关（#配置开关#）──────────────────────────────

  /**
   * 设置配置开关（在 #配置开关# 区域找到对应名称行，写入布尔值）
   */
  async setSwitch(name: string, value: boolean): Promise<void> {
    await Excel.run(async (context) => {
      const snap = await excelHelper.loadSheetSnapshot(context, SHEET_SETTINGS);
      if (!snap) {
        logger.error('setSwitch: 无法加载配置设置表');
        return;
      }

      const pos = excelHelper.findMarkerInData(snap.values, '#配置开关#');
      if (!pos) {
        logger.error('setSwitch: 找不到 #配置开关# 标记');
        return;
      }

      const rows = excelHelper.readBlockBelow(snap.values, pos.row, pos.col, 2);
      const matchIndex = rows.findIndex(
        (row) => String(row[0] ?? '').includes(name)
      );

      if (matchIndex === -1) {
        logger.warn(`setSwitch: 未找到开关「${name}」`);
        return;
      }

      const targetRow = pos.row + 1 + matchIndex;
      const sheet = context.workbook.worksheets.getItem(SHEET_SETTINGS);
      const absRow = targetRow + snap.startRow;
      // 值在开关名称右侧一列
      const absCol = pos.col + 1 + snap.startCol;

      const range = sheet.getRangeByIndexes(absRow, absCol, 1, 1);
      range.values = [[String(value)]];

      await context.sync();
      logger.info(`setSwitch: 已设置开关「${name}」= ${value}`);
    });
  }

  // ─── 输出设置双写（表格输出 工作表）─────────────────────

  /**
   * 设置输出版本名称（写 #输出版本# 右侧单元格）
   */
  async setOutputVersion(versionName: string): Promise<void> {
    await this.writeControlMarkerRight('#输出版本#', versionName, 'setOutputVersion');
  }

  /**
   * 设置输出版本号（写 #输出版本号# 右侧单元格）
   */
  async setOutputVersionNumber(versionNumber: number): Promise<void> {
    await this.writeControlMarkerRight('#输出版本号#', versionNumber, 'setOutputVersionNumber');
  }

  /**
   * 内部辅助：在 表格输出 工作表中找到标记，写入其右侧单元格
   */
  private async writeControlMarkerRight(
    marker: string,
    value: string | number,
    caller: string
  ): Promise<void> {
    await Excel.run(async (context) => {
      const snap = await excelHelper.loadSheetSnapshot(context, SHEET_CONTROL);
      if (!snap) {
        logger.error(`${caller}: 无法加载表格输出工作表`);
        return;
      }

      const pos = excelHelper.findMarkerInData(snap.values, marker);
      if (!pos) {
        logger.error(`${caller}: 找不到 ${marker} 标记`);
        return;
      }

      const sheet = context.workbook.worksheets.getItem(SHEET_CONTROL);
      const absRow = pos.row + snap.startRow;
      const absCol = pos.col + 1 + snap.startCol;

      const range = sheet.getRangeByIndexes(absRow, absCol, 1, 1);
      range.values = [[value]];

      await context.sync();
      logger.info(`${caller}: 已写入 ${marker} → ${value}`);
    });
  }
}

export const configManager = new ConfigManager();
