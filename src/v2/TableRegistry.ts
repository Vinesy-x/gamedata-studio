/* global Excel */

import { TableInfo } from '../types/config';
import { excelHelper, SheetSnapshot } from '../utils/ExcelHelper';
import { logger } from '../utils/Logger';
import { StudioConfigStore } from './StudioConfigStore';
import { SHEET_CONFIG } from './TemplateFactory';

// 旧格式兼容
const LEGACY_MAPPING = '表名对照';

// 系统表（不参与扫描）
const SYSTEM_SHEETS = new Set([
  '表格输出',
  '配置设置表',
  '表名对照',
  '模板说明',
  '说明表',
  SHEET_CONFIG,
]);

export interface UnregisteredTable {
  sheetName: string;
  hasConfigMarker: boolean;
}

export class TableRegistry {
  /**
   * 扫描未注册的数据表
   */
  async scanUnregistered(): Promise<UnregisteredTable[]> {
    const registered = await this.getRegisteredTables();
    const registeredNames = new Set(registered.keys());
    const unregistered: UnregisteredTable[] = [];

    await Excel.run(async (context) => {
      const sheets = context.workbook.worksheets;
      sheets.load('items/name');
      await context.sync();

      for (const sheet of sheets.items) {
        if (SYSTEM_SHEETS.has(sheet.name) || registeredNames.has(sheet.name)) continue;

        const snap = await excelHelper.loadSheetSnapshot(context, sheet.name);
        if (!snap || snap.values.length === 0) continue;

        const hasMarker = excelHelper.findMarkerInData(snap.values, '#配置区域#') !== null;
        if (hasMarker) {
          unregistered.push({ sheetName: sheet.name, hasConfigMarker: true });
        }
      }
    });

    logger.info(`扫描到 ${unregistered.length} 张未注册数据表`);
    return unregistered;
  }

  /**
   * 注册新表
   */
  async registerTable(info: TableInfo): Promise<void> {
    await Excel.run(async (context) => {
      const ok = await StudioConfigStore.update(context, (data) => {
        data.tables.push(info);
      });
      if (!ok) {
        // 旧格式回退
        const snap = await excelHelper.loadSheetSnapshot(context, LEGACY_MAPPING);
        if (!snap) throw new Error('找不到包含 #输出控制# 的工作表');
        const pos = excelHelper.findMarkerInData(snap.values, '#输出控制#');
        if (!pos) throw new Error('未找到 #输出控制# 标记');
        const rows = excelHelper.readBlockBelow(snap.values, pos.row, pos.col, 4);
        const newRowIndex = pos.row + 1 + rows.length + snap.startRow;
        const startCol = pos.col + snap.startCol;
        await excelHelper.writeValues(context, LEGACY_MAPPING, newRowIndex, startCol,
          [[info.versionRange, info.chineseName, info.englishName, info.shouldOutput]]);
      }
      // JSON 更新成功后也同步到表名对照
      await this.syncToLegacyMapping(context);
      logger.info(`已注册表「${info.chineseName}」→「${info.englishName}」`);
    });
  }

  /**
   * 修改已注册表的信息
   */
  async updateTable(chineseName: string, updates: Partial<TableInfo>): Promise<void> {
    await Excel.run(async (context) => {
      const ok = await StudioConfigStore.update(context, (data) => {
        const idx = data.tables.findIndex(t => t.chineseName === chineseName);
        if (idx === -1) throw new Error(`未找到已注册的表「${chineseName}」`);
        Object.assign(data.tables[idx], updates);
      });
      if (!ok) {
        // 旧格式回退
        const snap = await excelHelper.loadSheetSnapshot(context, LEGACY_MAPPING);
        if (!snap) throw new Error('找不到包含 #输出控制# 的工作表');
        const pos = excelHelper.findMarkerInData(snap.values, '#输出控制#');
        if (!pos) throw new Error('未找到 #输出控制# 标记');
        for (let r = pos.row + 1; r < snap.values.length; r++) {
          const firstCell = snap.values[r]?.[pos.col];
          if (firstCell == null || String(firstCell).trim() === '') break;
          const currentName = String(snap.values[r]?.[pos.col + 1] ?? '').trim();
          if (currentName !== chineseName) continue;
          const newRow = [
            updates.versionRange ?? snap.values[r]?.[pos.col] ?? null,
            updates.chineseName ?? snap.values[r]?.[pos.col + 1] ?? null,
            updates.englishName ?? snap.values[r]?.[pos.col + 2] ?? null,
            updates.shouldOutput ?? snap.values[r]?.[pos.col + 3] ?? null,
          ];
          await excelHelper.writeValues(context, LEGACY_MAPPING, r + snap.startRow, pos.col + snap.startCol, [newRow]);
          logger.info(`已更新表「${chineseName}」的注册信息`);
          return;
        }
        throw new Error(`未找到已注册的表「${chineseName}」`);
      }
      // JSON 更新成功后也同步到表名对照
      await this.syncToLegacyMapping(context);
      logger.info(`已更新表「${chineseName}」的注册信息`);
    });
  }

  /**
   * 取消注册
   */
  async unregisterTable(chineseName: string, deleteSheet = false): Promise<void> {
    await Excel.run(async (context) => {
      const ok = await StudioConfigStore.update(context, (data) => {
        const idx = data.tables.findIndex(t => t.chineseName === chineseName);
        if (idx === -1) throw new Error(`未找到已注册的表「${chineseName}」`);
        data.tables.splice(idx, 1);
      });
      if (!ok) {
        // 旧格式回退
        const snap = await excelHelper.loadSheetSnapshot(context, LEGACY_MAPPING);
        if (!snap) throw new Error('找不到包含 #输出控制# 的工作表');
        const pos = excelHelper.findMarkerInData(snap.values, '#输出控制#');
        if (!pos) throw new Error('未找到 #输出控制# 标记');
        let found = false;
        for (let r = pos.row + 1; r < snap.values.length; r++) {
          const firstCell = snap.values[r]?.[pos.col];
          if (firstCell == null || String(firstCell).trim() === '') break;
          const currentName = String(snap.values[r]?.[pos.col + 1] ?? '').trim();
          if (currentName !== chineseName) continue;
          const sheet = context.workbook.worksheets.getItem(LEGACY_MAPPING);
          sheet.getRangeByIndexes(r + snap.startRow, pos.col + snap.startCol, 1, 4).clear(Excel.ClearApplyTo.contents);
          await context.sync();
          found = true;
          break;
        }
        if (!found) throw new Error(`未找到已注册的表「${chineseName}」`);
      } else {
        // JSON 更新成功后也同步到表名对照
        await this.syncToLegacyMapping(context);
      }

      // 删除实际工作表
      if (deleteSheet) {
        const ws = context.workbook.worksheets.getItemOrNullObject(chineseName);
        ws.load('isNullObject');
        await context.sync();
        if (!ws.isNullObject) {
          ws.delete();
          await context.sync();
          logger.info(`已删除工作表「${chineseName}」`);
        }
      }

      logger.info(`已取消注册表「${chineseName}」`);
    });
  }

  /**
   * 获取所有已注册表
   */
  async getRegisteredTables(): Promise<Map<string, TableInfo>> {
    return await Excel.run(async (context) => {
      // 优先 JSON
      const data = await StudioConfigStore.load(context);
      if (data) {
        const map = new Map<string, TableInfo>();
        for (const t of data.tables) {
          if (t.chineseName && t.englishName) {
            map.set(t.chineseName, t);
          }
        }
        return map;
      }

      // 旧格式回退
      const snap = await excelHelper.loadSheetSnapshot(context, LEGACY_MAPPING);
      if (!snap) {
        logger.warn('找不到包含 #输出控制# 的工作表');
        return new Map<string, TableInfo>();
      }
      return this.parseLegacyTableList(snap.values);
    });
  }

  /**
   * 将 StudioConfig 中的 tables 全量同步到表名对照工作表
   */
  private async syncToLegacyMapping(context: Excel.RequestContext): Promise<void> {
    const data = await StudioConfigStore.load(context);
    if (!data) return;

    const snap = await excelHelper.loadSheetSnapshot(context, LEGACY_MAPPING);
    if (!snap) return;
    const pos = excelHelper.findMarkerInData(snap.values, '#输出控制#');
    if (!pos) return;

    const sheet = context.workbook.worksheets.getItem(LEGACY_MAPPING);

    // 清除旧数据（#输出控制# 标记下方所有行）
    const oldRows = excelHelper.readBlockBelow(snap.values, pos.row, pos.col, 4);
    if (oldRows.length > 0) {
      sheet.getRangeByIndexes(pos.row + 1 + snap.startRow, pos.col + snap.startCol, oldRows.length, 4)
        .clear(Excel.ClearApplyTo.contents);
    }

    // 写入最新数据
    if (data.tables.length > 0) {
      const rows = data.tables.map(t => [t.versionRange, t.chineseName, t.englishName, t.shouldOutput]);
      sheet.getRangeByIndexes(pos.row + 1 + snap.startRow, pos.col + snap.startCol, rows.length, 4)
        .values = rows;
    }

    await context.sync();
  }

  private parseLegacyTableList(data: (string | number | boolean | null)[][]): Map<string, TableInfo> {
    const pos = excelHelper.findMarkerInData(data, '#输出控制#');
    if (!pos) return new Map();

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
    return tables;
  }
}

export const tableRegistry = new TableRegistry();
