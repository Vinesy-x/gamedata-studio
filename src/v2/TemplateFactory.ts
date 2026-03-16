/* global Excel */

import { excelHelper, SheetData } from '../utils/ExcelHelper';
import { logger } from '../utils/Logger';
import { StudioConfigStore, StudioConfigData, createDefaultConfig } from './StudioConfigStore';

/**
 * StudioConfig 工作表名常量
 */
export const SHEET_CONFIG = 'StudioConfig';

/**
 * TemplateFactory — 一键创建数据模版
 *
 * StudioConfig 工作表 A1 存储 JSON 配置。
 * 创建模版 / 旧格式迁移都通过此类完成。
 */
export class TemplateFactory {
  /**
   * 一键创建完整模版（JSON 格式）
   */
  async createTemplate(): Promise<void> {
    await Excel.run(async (context) => {
      await StudioConfigStore.create(context);
    });
  }

  /**
   * 检查当前工作簿是否已有 StudioConfig
   */
  async exists(): Promise<boolean> {
    return await Excel.run(async (context) => {
      const sheet = context.workbook.worksheets.getItemOrNullObject(SHEET_CONFIG);
      sheet.load('isNullObject');
      await context.sync();
      return !sheet.isNullObject;
    });
  }

  /**
   * 从旧格式迁移到 StudioConfig (JSON)
   * 读取 表格输出 + 配置设置表 + 表名对照 → 构建 StudioConfigData → 写入 A1
   */
  async migrateFromLegacy(): Promise<void> {
    await Excel.run(async (context) => {
      // 检查是否已存在
      const existing = context.workbook.worksheets.getItemOrNullObject(SHEET_CONFIG);
      existing.load('isNullObject');
      await context.sync();
      if (!existing.isNullObject) {
        logger.info('migrateFromLegacy: StudioConfig 已存在，跳过');
        return;
      }

      // 加载旧格式三表
      const controlSnap = await excelHelper.loadSheetSnapshot(context, '表格输出');
      const settingsSnap = await excelHelper.loadSheetSnapshot(context, '配置设置表');
      const mappingSnap = await excelHelper.loadSheetSnapshot(context, '表名对照');

      if (!controlSnap && !settingsSnap && !mappingSnap) {
        logger.warn('migrateFromLegacy: 旧格式三表均不存在');
        return;
      }

      const data = createDefaultConfig();
      const controlData = controlSnap?.values || [];
      const settingsData = settingsSnap?.values || [];
      const mappingData = mappingSnap?.values || [];

      // ── 输出设置 ──
      data.outputVersion = String(this.readMarkerRight(controlData, '#输出版本#') ?? '默认');
      data.outputVersionNumber = Number(this.readMarkerRight(controlData, '#输出版本号#') ?? 1) || 1;

      const seqPos = excelHelper.findMarkerInData(controlData, '#数据表版本#');
      if (seqPos) {
        data.fullVersion = String(controlData[seqPos.row]?.[seqPos.col + 1] ?? '1.0');
        if (seqPos.row > 0) {
          data.versionSequence = Number(controlData[seqPos.row - 1]?.[seqPos.col + 1] ?? 0) || 0;
        }
      }
      data.workStatus = String(this.readMarkerRight(controlData, '#工作状态#') ?? '');

      // ── 版本列表 ──
      const versionRows = this.readBlockData(settingsData, '#版本列表#', 4);
      if (versionRows.length > 0) {
        data.versions = versionRows.map(r => ({
          name: String(r[0] ?? '').trim(),
          lineId: Number(r[1]) || 0,
          gitDirectory: String(r[2] ?? '').trim(),
          lineField: String(r[3] ?? '').trim(),
        })).filter(v => v.name);
      }

      // ── 线路列表 ──
      const lineRows = this.readBlockData(settingsData, '#线路列表#', 3);
      if (lineRows.length > 0) {
        data.lines = lineRows.map(r => ({
          id: Number(r[0]) || 0,
          field: String(r[1] ?? '').trim(),
          remark: String(r[2] ?? '').trim(),
        })).filter(l => l.field);
      }

      // ── 人员代码 ──
      const staffRows = this.readBlockData(settingsData, '#人员代码#', 4);
      if (staffRows.length > 0) {
        data.staff = staffRows.map(r => ({
          id: Number(r[0]) || 0,
          name: String(r[1] ?? '').trim(),
          code: String(r[2] ?? '').trim(),
          machineCode: String(r[3] ?? '').trim(),
        })).filter(s => s.name);
      }

      // ── Git 模板 ──
      const gitRows = this.readBlockData(settingsData, '#Git通用提交日志#', 1);
      if (gitRows.length > 0) {
        data.gitCommitTemplate = String(gitRows[0][0] ?? '').trim() || data.gitCommitTemplate;
      }

      // ── 配置开关 ──
      const switchRows = this.readBlockData(settingsData, '#配置开关#', 2);
      for (const sr of switchRows) {
        const key = String(sr[0] ?? '').trim();
        const val = String(sr[1] ?? '').trim().toLowerCase() === 'true';
        if (key) data.switches[key] = val;
      }

      // ── 输出控制 —— tables 不再存入 JSON，表名对照是单一数据源 ──

      await StudioConfigStore.create(context, data);
      logger.info('migrateFromLegacy: 迁移完成 (JSON 格式)');
    });
  }

  // ─── 迁移辅助方法 ──────────────────────────────────────

  private readMarkerRight(data: SheetData, marker: string): string | number | boolean | null {
    const pos = excelHelper.findMarkerInData(data, marker);
    if (!pos) return null;
    return data[pos.row]?.[pos.col + 1] ?? null;
  }

  private readBlockData(data: SheetData, marker: string, cols: number): SheetData {
    const pos = excelHelper.findMarkerInData(data, marker);
    if (!pos) return [];
    return excelHelper.readBlockBelow(data, pos.row, pos.col, cols);
  }
}

export const templateFactory = new TemplateFactory();
