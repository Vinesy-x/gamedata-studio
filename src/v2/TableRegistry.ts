/* global Excel */

import { TableInfo } from '../types/config';
import { excelHelper, SheetData } from '../utils/ExcelHelper';
import { logger } from '../utils/Logger';

// 工作表名常量
const SHEET_MAPPING = '表名对照';

// 系统表（不参与扫描）
const SYSTEM_SHEETS = new Set([
  '表格输出',
  '配置设置表',
  '表名对照',
  '模板说明',
  '说明表',
]);

export interface UnregisteredTable {
  sheetName: string;
  hasConfigMarker: boolean;
}

export class TableRegistry {
  /**
   * 扫描未注册的数据表
   * 遍历所有工作表，排除系统表，检查是否含 #配置区域# 标记但未在「表名对照」中注册
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
        // 跳过系统表和已注册表
        if (SYSTEM_SHEETS.has(sheet.name) || registeredNames.has(sheet.name)) {
          continue;
        }

        // 加载工作表快照检查 #配置区域# 标记
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
   * 注册新表到「表名对照」
   * 在 #输出控制# 区域最后一行下方追加新行
   */
  async registerTable(info: TableInfo): Promise<void> {
    await Excel.run(async (context) => {
      const snap = await excelHelper.loadSheetSnapshot(context, SHEET_MAPPING);
      if (!snap || snap.values.length === 0) {
        throw new Error(`找不到工作表「${SHEET_MAPPING}」或为空`);
      }

      const pos = excelHelper.findMarkerInData(snap.values, '#输出控制#');
      if (!pos) {
        throw new Error('未找到 #输出控制# 标记');
      }

      // 读取已有数据行数
      const rows = excelHelper.readBlockBelow(snap.values, pos.row, pos.col, 4);
      // 新行位于标记行 + 1（标题后）+ 已有数据行数
      const newRowIndex = pos.row + 1 + rows.length + snap.startRow;
      const startCol = pos.col + snap.startCol;

      await excelHelper.writeValues(
        context,
        SHEET_MAPPING,
        newRowIndex,
        startCol,
        [[info.versionRange, info.chineseName, info.englishName, info.shouldOutput]]
      );

      logger.info(`已注册表「${info.chineseName}」→「${info.englishName}」`);
    });
  }

  /**
   * 修改已注册表的信息
   * 在 #输出控制# 区域中找到 chineseName 匹配的行并更新
   */
  async updateTable(chineseName: string, updates: Partial<TableInfo>): Promise<void> {
    await Excel.run(async (context) => {
      const snap = await excelHelper.loadSheetSnapshot(context, SHEET_MAPPING);
      if (!snap || snap.values.length === 0) {
        throw new Error(`找不到工作表「${SHEET_MAPPING}」或为空`);
      }

      const pos = excelHelper.findMarkerInData(snap.values, '#输出控制#');
      if (!pos) {
        throw new Error('未找到 #输出控制# 标记');
      }

      // 遍历数据行查找匹配的 chineseName
      // 列布局: col+0=versionRange, col+1=chineseName, col+2=englishName, col+3=shouldOutput
      for (let r = pos.row + 1; r < snap.values.length; r++) {
        const firstCell = snap.values[r]?.[pos.col];
        if (firstCell == null || String(firstCell).trim() === '') break;

        const currentName = String(snap.values[r]?.[pos.col + 1] ?? '').trim();
        if (currentName !== chineseName) continue;

        // 构建更新后的行数据
        const newRow: (string | number | boolean | null)[] = [
          updates.versionRange !== undefined
            ? updates.versionRange
            : snap.values[r]?.[pos.col] ?? null,
          updates.chineseName !== undefined
            ? updates.chineseName
            : snap.values[r]?.[pos.col + 1] ?? null,
          updates.englishName !== undefined
            ? updates.englishName
            : snap.values[r]?.[pos.col + 2] ?? null,
          updates.shouldOutput !== undefined
            ? updates.shouldOutput
            : snap.values[r]?.[pos.col + 3] ?? null,
        ];

        const absRow = r + snap.startRow;
        const absCol = pos.col + snap.startCol;

        await excelHelper.writeValues(
          context,
          SHEET_MAPPING,
          absRow,
          absCol,
          [newRow]
        );

        logger.info(`已更新表「${chineseName}」的注册信息`);
        return;
      }

      throw new Error(`未找到已注册的表「${chineseName}」`);
    });
  }

  /**
   * 取消注册（清空对应行内容，不删除工作表）
   */
  async unregisterTable(chineseName: string): Promise<void> {
    await Excel.run(async (context) => {
      const snap = await excelHelper.loadSheetSnapshot(context, SHEET_MAPPING);
      if (!snap || snap.values.length === 0) {
        throw new Error(`找不到工作表「${SHEET_MAPPING}」或为空`);
      }

      const pos = excelHelper.findMarkerInData(snap.values, '#输出控制#');
      if (!pos) {
        throw new Error('未找到 #输出控制# 标记');
      }

      for (let r = pos.row + 1; r < snap.values.length; r++) {
        const firstCell = snap.values[r]?.[pos.col];
        if (firstCell == null || String(firstCell).trim() === '') break;

        const currentName = String(snap.values[r]?.[pos.col + 1] ?? '').trim();
        if (currentName !== chineseName) continue;

        // 清空该行的 4 列
        const absRow = r + snap.startRow;
        const absCol = pos.col + snap.startCol;

        const sheet = context.workbook.worksheets.getItem(SHEET_MAPPING);
        const range = sheet.getRangeByIndexes(absRow, absCol, 1, 4);
        range.clear(Excel.ClearApplyTo.contents);
        await context.sync();

        logger.info(`已取消注册表「${chineseName}」`);
        return;
      }

      throw new Error(`未找到已注册的表「${chineseName}」`);
    });
  }

  /**
   * 获取所有已注册表列表（复用 ConfigLoader 的解析逻辑）
   */
  async getRegisteredTables(): Promise<Map<string, TableInfo>> {
    return await Excel.run(async (context) => {
      const snap = await excelHelper.loadSheetSnapshot(context, SHEET_MAPPING);
      if (!snap || snap.values.length === 0) {
        logger.warn(`找不到工作表「${SHEET_MAPPING}」或为空`);
        return new Map<string, TableInfo>();
      }

      return this.parseTableList(snap.values);
    });
  }

  /**
   * 解析表名对照数据（与 ConfigLoader.parseTableList 逻辑一致）
   */
  private parseTableList(data: SheetData): Map<string, TableInfo> {
    const pos = excelHelper.findMarkerInData(data, '#输出控制#');
    if (!pos) {
      logger.warn('找不到 #输出控制# 标记');
      return new Map<string, TableInfo>();
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

    return tables;
  }
}

export const tableRegistry = new TableRegistry();
