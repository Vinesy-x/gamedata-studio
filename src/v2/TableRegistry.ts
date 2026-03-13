/* global Excel */

import { TableInfo } from '../types/config';
import { excelHelper } from '../utils/ExcelHelper';
import { logger } from '../utils/Logger';
import { UnregisteredTable } from '../types/studio';
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
   * 注册新表（写入表名对照，同步到 StudioConfig）
   */
  async registerTable(info: TableInfo): Promise<void> {
    await Excel.run(async (context) => {
      let snap = await excelHelper.loadSheetSnapshot(context, LEGACY_MAPPING);
      if (!snap) {
        await this.createLegacyMappingSheet(context);
        snap = await excelHelper.loadSheetSnapshot(context, LEGACY_MAPPING);
        if (!snap) throw new Error('创建表名对照失败');
      }
      const pos = excelHelper.findMarkerInData(snap.values, '#输出控制#');
      if (!pos) throw new Error('未找到 #输出控制# 标记');
      const rows = excelHelper.readBlockBelow(snap.values, pos.row, pos.col, 4);
      const newRowIndex = pos.row + 1 + rows.length + snap.startRow;
      const startCol = pos.col + snap.startCol;
      await excelHelper.writeValues(context, LEGACY_MAPPING, newRowIndex, startCol,
        [[info.versionRange, info.chineseName, info.englishName, info.shouldOutput]]);

      // 为功能表名添加超链接（跳转到对应工作表），保持原有文本和格式
      const mappingSheet = context.workbook.worksheets.getItem(LEGACY_MAPPING);
      const hyperlinkCell = mappingSheet.getRangeByIndexes(newRowIndex, startCol + 1, 1, 1);
      hyperlinkCell.hyperlink = {
        documentReference: `'${info.chineseName}'!A1`,
        textToDisplay: info.chineseName,
        screenTip: `跳转到「${info.chineseName}」`,
      };
      // 恢复默认字体格式（去除超链接的蓝色+下划线）
      hyperlinkCell.format.font.color = '#000000';
      hyperlinkCell.format.font.underline = 'None';

      // 同步到 StudioConfig JSON
      await this.syncToStudioConfig(context);
      logger.info(`已注册表「${info.chineseName}」→「${info.englishName}」`);
    });
  }

  /**
   * 修改已注册表的信息（写入表名对照，同步到 StudioConfig）
   */
  async updateTable(chineseName: string, updates: Partial<TableInfo>): Promise<void> {
    await Excel.run(async (context) => {
      const snap = await excelHelper.loadSheetSnapshot(context, LEGACY_MAPPING);
      if (!snap) throw new Error('找不到表名对照工作表');
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
        await this.syncToStudioConfig(context);
        logger.info(`已更新表「${chineseName}」的注册信息`);
        return;
      }
      throw new Error(`未找到已注册的表「${chineseName}」`);
    });
  }

  /**
   * 取消注册（从表名对照删除，同步到 StudioConfig）
   */
  async unregisterTable(chineseName: string, deleteSheet = false): Promise<void> {
    await Excel.run(async (context) => {
      const snap = await excelHelper.loadSheetSnapshot(context, LEGACY_MAPPING);
      if (!snap) throw new Error('找不到表名对照工作表');
      const pos = excelHelper.findMarkerInData(snap.values, '#输出控制#');
      if (!pos) throw new Error('未找到 #输出控制# 标记');

      let found = false;
      for (let r = pos.row + 1; r < snap.values.length; r++) {
        const firstCell = snap.values[r]?.[pos.col];
        if (firstCell == null || String(firstCell).trim() === '') break;
        const currentName = String(snap.values[r]?.[pos.col + 1] ?? '').trim();
        if (currentName !== chineseName) continue;
        const sheet = context.workbook.worksheets.getItem(LEGACY_MAPPING);
        sheet.getRangeByIndexes(r + snap.startRow, 0, 1, 1).getEntireRow().delete(Excel.DeleteShiftDirection.up);
        await context.sync();
        found = true;
        break;
      }
      if (!found) throw new Error(`未找到已注册的表「${chineseName}」`);

      // 同步到 StudioConfig JSON
      await this.syncToStudioConfig(context);

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
   * 获取所有已注册表（始终从表名对照读取）
   */
  async getRegisteredTables(): Promise<Map<string, TableInfo>> {
    return await Excel.run(async (context) => {
      const snap = await excelHelper.loadSheetSnapshot(context, LEGACY_MAPPING);
      if (!snap) {
        logger.warn('找不到表名对照工作表');
        return new Map<string, TableInfo>();
      }
      return this.parseLegacyTableList(snap.values);
    });
  }

  /**
   * 将表名对照的数据同步到 StudioConfig JSON
   */
  private async syncToStudioConfig(context: Excel.RequestContext): Promise<void> {
    const snap = await excelHelper.loadSheetSnapshot(context, LEGACY_MAPPING);
    if (!snap) return;

    const tables = this.parseLegacyTableList(snap.values);
    const tableArray = Array.from(tables.values());

    await StudioConfigStore.update(context, (data) => {
      data.tables = tableArray;
    });
  }

  /**
   * 创建表名对照工作表
   *
   * 格式（参考已有工作簿）：
   *   A1: #输出控制#  B1: 功能表名  C1: 输出表名  D1: 是否输出表
   *   A2 起: 版本区间 | 中文名 | 英文名 | TRUE/FALSE
   */
  private async createLegacyMappingSheet(context: Excel.RequestContext): Promise<void> {
    const sheet = context.workbook.worksheets.add(LEGACY_MAPPING);
    sheet.position = 0;

    // 表头行：蓝色背景白色文字
    const headerRange = sheet.getRangeByIndexes(0, 0, 1, 4);
    headerRange.values = [['#输出控制#', '功能表名', '输出表名', '是否输出表']];
    headerRange.format.font.bold = true;
    headerRange.format.fill.color = '#00B0F0';
    headerRange.format.font.color = '#FFFFFF';
    headerRange.format.borders.getItem('EdgeBottom').style = 'Continuous';

    // 「是否输出表」列头橙色背景
    const outputHeader = sheet.getRangeByIndexes(0, 3, 1, 1);
    outputHeader.format.fill.color = '#FFA500';

    // 列宽
    sheet.getRangeByIndexes(0, 0, 1, 1).format.columnWidth = 100;
    sheet.getRangeByIndexes(0, 1, 1, 1).format.columnWidth = 140;
    sheet.getRangeByIndexes(0, 2, 1, 1).format.columnWidth = 160;
    sheet.getRangeByIndexes(0, 3, 1, 1).format.columnWidth = 100;

    await context.sync();
    logger.info('已自动创建「表名对照」工作表');
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
