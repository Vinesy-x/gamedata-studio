/* global Excel */

import { VersionTemplate, LineTemplate, StaffInfo } from '../types/config';
import { excelHelper, SheetSnapshot } from '../utils/ExcelHelper';
import { logger } from '../utils/Logger';
import { StudioConfigStore } from './StudioConfigStore';
import { SHEET_CONFIG } from './TemplateFactory';

// 旧格式兼容
const LEGACY_CONTROL = '表格输出';
const LEGACY_SETTINGS = '配置设置表';

/**
 * ConfigManager — v2.0 配置管理器
 *
 * 优先通过 StudioConfigStore (JSON) 读写，
 * 若 StudioConfig 不存在则回退到旧格式标记方式。
 */
export class ConfigManager {
  // ─── 旧格式兼容辅助 ──────────────────────────────────

  private async loadLegacySnap(
    context: Excel.RequestContext,
    marker: string,
    legacySheet: string
  ): Promise<{ snap: SheetSnapshot; sheetName: string } | null> {
    const legacySnap = await excelHelper.loadSheetSnapshot(context, legacySheet);
    if (legacySnap && excelHelper.findMarkerInData(legacySnap.values, marker)) {
      return { snap: legacySnap, sheetName: legacySheet };
    }
    return null;
  }

  // ─── 版本模板管理 ───────────────────────────────────

  async addVersion(version: VersionTemplate): Promise<void> {
    await Excel.run(async (context) => {
      const updated = await StudioConfigStore.update(context, (data) => {
        data.versions.push(version);
      });
      if (updated) {
        logger.info(`addVersion: 已追加版本「${version.name}」`);
        return;
      }

      // 旧格式回退
      const r = await this.loadLegacySnap(context, '#版本列表#', LEGACY_SETTINGS);
      if (!r) { logger.error('addVersion: 找不到 #版本列表#'); return; }
      const pos = excelHelper.findMarkerInData(r.snap.values, '#版本列表#')!;
      const rows = excelHelper.readBlockBelow(r.snap.values, pos.row, pos.col, 4);
      const absRow = pos.row + 1 + rows.length + r.snap.startRow;
      const absCol = pos.col + r.snap.startCol;
      const sheet = context.workbook.worksheets.getItem(r.sheetName);
      sheet.getRangeByIndexes(absRow, absCol, 1, 4).values = [[version.name, version.lineId, version.gitDirectory, version.lineField]];
      await context.sync();
      logger.info(`addVersion: 已追加版本「${version.name}」(旧格式)`);
    });
  }

  async updateVersion(oldName: string, updated: VersionTemplate): Promise<void> {
    await Excel.run(async (context) => {
      const ok = await StudioConfigStore.update(context, (data) => {
        const idx = data.versions.findIndex(v => v.name === oldName);
        if (idx !== -1) data.versions[idx] = updated;
      });
      if (ok) {
        logger.info(`updateVersion: 已更新「${oldName}」→「${updated.name}」`);
        return;
      }

      // 旧格式回退
      const r = await this.loadLegacySnap(context, '#版本列表#', LEGACY_SETTINGS);
      if (!r) { logger.error('updateVersion: 找不到 #版本列表#'); return; }
      const pos = excelHelper.findMarkerInData(r.snap.values, '#版本列表#')!;
      const rows = excelHelper.readBlockBelow(r.snap.values, pos.row, pos.col, 4);
      const idx = rows.findIndex(row => String(row[0] ?? '').trim() === oldName);
      if (idx === -1) { logger.warn(`updateVersion: 未找到「${oldName}」`); return; }
      const absRow = pos.row + 1 + idx + r.snap.startRow;
      const absCol = pos.col + r.snap.startCol;
      const sheet = context.workbook.worksheets.getItem(r.sheetName);
      sheet.getRangeByIndexes(absRow, absCol, 1, 4).values = [[updated.name, updated.lineId, updated.gitDirectory, updated.lineField]];
      await context.sync();
    });
  }

  async deleteVersion(name: string): Promise<void> {
    await Excel.run(async (context) => {
      const ok = await StudioConfigStore.update(context, (data) => {
        data.versions = data.versions.filter(v => v.name !== name);
      });
      if (ok) {
        logger.info(`deleteVersion: 已删除「${name}」`);
        return;
      }

      // 旧格式回退
      const r = await this.loadLegacySnap(context, '#版本列表#', LEGACY_SETTINGS);
      if (!r) { logger.error('deleteVersion: 找不到 #版本列表#'); return; }
      const pos = excelHelper.findMarkerInData(r.snap.values, '#版本列表#')!;
      const rows = excelHelper.readBlockBelow(r.snap.values, pos.row, pos.col, 4);
      const idx = rows.findIndex(row => String(row[0] ?? '').trim() === name);
      if (idx === -1) { logger.warn(`deleteVersion: 未找到「${name}」`); return; }
      const absRow = pos.row + 1 + idx + r.snap.startRow;
      const absCol = pos.col + r.snap.startCol;
      const sheet = context.workbook.worksheets.getItem(r.sheetName);
      sheet.getRangeByIndexes(absRow, absCol, 1, 4).values = [['', '', '', '']];
      await context.sync();
    });
  }

  // ─── 线路模板管理 ───────────────────────────────────

  async addLine(line: LineTemplate): Promise<void> {
    await Excel.run(async (context) => {
      const ok = await StudioConfigStore.update(context, (data) => {
        data.lines.push(line);
      });
      if (ok) {
        logger.info(`addLine: 已追加线路 id=${line.id}`);
        return;
      }

      const r = await this.loadLegacySnap(context, '#线路列表#', LEGACY_SETTINGS);
      if (!r) { logger.error('addLine: 找不到 #线路列表#'); return; }
      const pos = excelHelper.findMarkerInData(r.snap.values, '#线路列表#')!;
      const rows = excelHelper.readBlockBelow(r.snap.values, pos.row, pos.col, 3);
      const absRow = pos.row + 1 + rows.length + r.snap.startRow;
      const absCol = pos.col + r.snap.startCol;
      const sheet = context.workbook.worksheets.getItem(r.sheetName);
      sheet.getRangeByIndexes(absRow, absCol, 1, 3).values = [[line.id, line.field, line.remark]];
      await context.sync();
    });
  }

  async updateLine(id: number, updated: LineTemplate): Promise<void> {
    await Excel.run(async (context) => {
      const ok = await StudioConfigStore.update(context, (data) => {
        const idx = data.lines.findIndex(l => l.id === id);
        if (idx !== -1) data.lines[idx] = updated;
      });
      if (ok) {
        logger.info(`updateLine: 已更新线路 id=${id}`);
        return;
      }

      const r = await this.loadLegacySnap(context, '#线路列表#', LEGACY_SETTINGS);
      if (!r) { logger.error('updateLine: 找不到 #线路列表#'); return; }
      const pos = excelHelper.findMarkerInData(r.snap.values, '#线路列表#')!;
      const rows = excelHelper.readBlockBelow(r.snap.values, pos.row, pos.col, 3);
      const idx = rows.findIndex(row => Number(row[0]) === id);
      if (idx === -1) { logger.warn(`updateLine: 未找到 id=${id}`); return; }
      const absRow = pos.row + 1 + idx + r.snap.startRow;
      const absCol = pos.col + r.snap.startCol;
      const sheet = context.workbook.worksheets.getItem(r.sheetName);
      sheet.getRangeByIndexes(absRow, absCol, 1, 3).values = [[updated.id, updated.field, updated.remark]];
      await context.sync();
    });
  }

  // ─── 人员代码管理 ───────────────────────────────────

  async addStaff(staff: StaffInfo): Promise<void> {
    await Excel.run(async (context) => {
      const ok = await StudioConfigStore.update(context, (data) => {
        data.staff.push(staff);
      });
      if (ok) {
        logger.info(`addStaff: 已追加人员「${staff.name}」`);
        return;
      }

      const r = await this.loadLegacySnap(context, '#人员代码#', LEGACY_SETTINGS);
      if (!r) { logger.error('addStaff: 找不到 #人员代码#'); return; }
      const pos = excelHelper.findMarkerInData(r.snap.values, '#人员代码#')!;
      const rows = excelHelper.readBlockBelow(r.snap.values, pos.row, pos.col, 4);
      const absRow = pos.row + 1 + rows.length + r.snap.startRow;
      const absCol = pos.col + r.snap.startCol;
      const sheet = context.workbook.worksheets.getItem(r.sheetName);
      sheet.getRangeByIndexes(absRow, absCol, 1, 4).values = [[staff.id, staff.name, staff.code, staff.machineCode]];
      await context.sync();
    });
  }

  async updateStaff(name: string, updated: StaffInfo): Promise<void> {
    await Excel.run(async (context) => {
      const ok = await StudioConfigStore.update(context, (data) => {
        const idx = data.staff.findIndex(s => s.name === name);
        if (idx !== -1) data.staff[idx] = updated;
      });
      if (ok) {
        logger.info(`updateStaff: 已更新人员「${name}」→「${updated.name}」`);
        return;
      }

      const r = await this.loadLegacySnap(context, '#人员代码#', LEGACY_SETTINGS);
      if (!r) { logger.error('updateStaff: 找不到 #人员代码#'); return; }
      const pos = excelHelper.findMarkerInData(r.snap.values, '#人员代码#')!;
      const rows = excelHelper.readBlockBelow(r.snap.values, pos.row, pos.col, 4);
      const idx = rows.findIndex(row => String(row[1] ?? '').trim() === name);
      if (idx === -1) { logger.warn(`updateStaff: 未找到「${name}」`); return; }
      const absRow = pos.row + 1 + idx + r.snap.startRow;
      const absCol = pos.col + r.snap.startCol;
      const sheet = context.workbook.worksheets.getItem(r.sheetName);
      sheet.getRangeByIndexes(absRow, absCol, 1, 4).values = [[updated.id, updated.name, updated.code, updated.machineCode]];
      await context.sync();
    });
  }

  // ─── Git 提交模板 ───────────────────────────────────

  async setGitCommitTemplate(template: string): Promise<void> {
    await Excel.run(async (context) => {
      const ok = await StudioConfigStore.update(context, (data) => {
        data.gitCommitTemplate = template;
      });
      if (ok) {
        logger.info('setGitCommitTemplate: 已更新');
        return;
      }

      const r = await this.loadLegacySnap(context, '#Git通用提交日志#', LEGACY_SETTINGS);
      if (!r) { logger.error('setGitCommitTemplate: 找不到标记'); return; }
      const pos = excelHelper.findMarkerInData(r.snap.values, '#Git通用提交日志#')!;
      const sheet = context.workbook.worksheets.getItem(r.sheetName);
      sheet.getRangeByIndexes(pos.row + 1 + r.snap.startRow, pos.col + r.snap.startCol, 1, 1).values = [[template]];
      await context.sync();
    });
  }

  // ─── 功能开关 ───────────────────────────────────────

  async setSwitch(name: string, value: boolean): Promise<void> {
    await Excel.run(async (context) => {
      const ok = await StudioConfigStore.update(context, (data) => {
        data.switches[name] = value;
      });
      if (ok) {
        logger.info(`setSwitch: 「${name}」= ${value}`);
        return;
      }

      const r = await this.loadLegacySnap(context, '#配置开关#', LEGACY_SETTINGS);
      if (!r) { logger.error('setSwitch: 找不到 #配置开关#'); return; }
      const pos = excelHelper.findMarkerInData(r.snap.values, '#配置开关#')!;
      const rows = excelHelper.readBlockBelow(r.snap.values, pos.row, pos.col, 2);
      const idx = rows.findIndex(row => String(row[0] ?? '').includes(name));
      if (idx === -1) { logger.warn(`setSwitch: 未找到「${name}」`); return; }
      const absRow = pos.row + 1 + idx + r.snap.startRow;
      const absCol = pos.col + 1 + r.snap.startCol;
      const sheet = context.workbook.worksheets.getItem(r.sheetName);
      sheet.getRangeByIndexes(absRow, absCol, 1, 1).values = [[String(value)]];
      await context.sync();
    });
  }

  // ─── 输出设置 ───────────────────────────────────────

  async setOutputVersion(versionName: string): Promise<void> {
    await Excel.run(async (context) => {
      const ok = await StudioConfigStore.update(context, (data) => {
        data.outputVersion = versionName;
      });
      if (ok) { logger.info(`setOutputVersion: → ${versionName}`); return; }
      await this.writeLegacyMarkerRight(context, '#输出版本#', versionName, LEGACY_CONTROL);
    });
  }

  async setOutputVersionNumber(versionNumber: number): Promise<void> {
    await Excel.run(async (context) => {
      const ok = await StudioConfigStore.update(context, (data) => {
        data.outputVersionNumber = versionNumber;
      });
      if (ok) { logger.info(`setOutputVersionNumber: → ${versionNumber}`); return; }
      await this.writeLegacyMarkerRight(context, '#输出版本号#', versionNumber, LEGACY_CONTROL);
    });
  }

  private async writeLegacyMarkerRight(
    context: Excel.RequestContext,
    marker: string,
    value: string | number,
    legacySheet: string
  ): Promise<void> {
    const r = await this.loadLegacySnap(context, marker, legacySheet);
    if (!r) { logger.error(`writeLegacyMarkerRight: 找不到 ${marker}`); return; }
    const pos = excelHelper.findMarkerInData(r.snap.values, marker)!;
    const sheet = context.workbook.worksheets.getItem(r.sheetName);
    sheet.getRangeByIndexes(pos.row + r.snap.startRow, pos.col + 1 + r.snap.startCol, 1, 1).values = [[value]];
    await context.sync();
  }
}

export const configManager = new ConfigManager();
