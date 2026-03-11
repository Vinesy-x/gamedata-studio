/* global Excel */

import { TableInfo, LineTemplate, VersionTemplate } from '../types/config';
import { excelHelper } from '../utils/ExcelHelper';
import { logger } from '../utils/Logger';
import { StudioConfigStore } from './StudioConfigStore';
import { SHEET_CONFIG } from './TemplateFactory';

// ─── 接口定义 ───────────────────────────────────────────────

export interface FieldDefinition {
  name: string;
  type: string;
  description: string;
  isKey: boolean;
  isLanguage: boolean;
}

export interface TableCreationConfig {
  chineseName: string;
  englishName: string;
  startVersion: string;
  fields: FieldDefinition[];
  includeVersionCol: boolean;
  autoRegister: boolean;
}

const LEGACY_SETTINGS = '配置设置表';
const LEGACY_MAPPING = '表名对照';

// ─── TableCreator ────────────────────────────────────────────

export class TableCreator {
  private lastCreatedSheet: string | null = null;
  private lastAutoRegistered = false;

  async createTable(config: TableCreationConfig): Promise<void> {
    await Excel.run(async (context) => {
      // 从版本配置构建 roads 列表（仅包含当前配置的版本，非全部线路）
      const roads = await this.loadVersionRoads(context);
      const roadsCount = roads.length;

      const gapCols = 2;
      const configMarkerCol = 1 + roadsCount + gapCols;
      const dataStartCol = configMarkerCol + 1;

      const sheet = context.workbook.worksheets.add(config.chineseName);

      let vrRow = 0;

      if (config.includeVersionCol) {
        vrRow = 4;
        // version_c 与 #配置区域# 同列，"版本列属"在其左一列
        sheet.getRangeByIndexes(0, configMarkerCol - 1, 1, 1).values = [['版本列属']];
        sheet.getRangeByIndexes(0, configMarkerCol, 1, 1).values = [['version_c']];
        for (let i = 0; i < config.fields.length; i++) {
          sheet.getRangeByIndexes(0, dataStartCol + i, 1, 1).values = [[config.startVersion]];
        }
      }

      sheet.getRangeByIndexes(vrRow, 0, 1, 1).values = [['version_r']];
      for (let i = 0; i < roads.length; i++) {
        sheet.getRangeByIndexes(vrRow, 1 + i, 1, 1).values = [[roads[i].field]];
      }

      sheet.getRangeByIndexes(vrRow, configMarkerCol, 1, 1).values = [['#配置区域#']];

      for (let i = 0; i < config.fields.length; i++) {
        const f = config.fields[i];
        const fieldStr = this.buildFieldString(f);
        sheet.getRangeByIndexes(vrRow, dataStartCol + i, 1, 1).values = [[fieldStr]];
      }

      const descRow = vrRow + 1;
      sheet.getRangeByIndexes(descRow, 0, 1, 1).values = [['版本行属']];
      for (let i = 0; i < roads.length; i++) {
        sheet.getRangeByIndexes(descRow, 1 + i, 1, 1).values = [[roads[i].name]];
      }
      for (let i = 0; i < config.fields.length; i++) {
        sheet.getRangeByIndexes(descRow, dataStartCol + i, 1, 1).values = [[config.fields[i].description]];
      }

      // 激活新建的工作表，确保用户能直接看到内容
      sheet.activate();

      await context.sync();

      this.lastCreatedSheet = config.chineseName;
      this.lastAutoRegistered = false;

      logger.info(`工作表「${config.chineseName}」创建完成，共 ${config.fields.length} 个字段`);
    });

    if (config.autoRegister) {
      await this.registerTable({
        chineseName: config.chineseName,
        englishName: config.englishName,
        shouldOutput: true,
        versionRange: config.startVersion,
      });
      this.lastAutoRegistered = true;
      logger.info(`工作表「${config.chineseName}」已注册到表名对照`);
    }
  }

  async undoLastCreation(): Promise<boolean> {
    if (!this.lastCreatedSheet) {
      logger.warn('没有可撤销的创建操作');
      return false;
    }

    const sheetName = this.lastCreatedSheet;

    await Excel.run(async (context) => {
      const sheet = context.workbook.worksheets.getItemOrNullObject(sheetName);
      sheet.load('isNullObject');
      await context.sync();

      if (!sheet.isNullObject) {
        sheet.delete();
        await context.sync();
        logger.info(`已删除工作表「${sheetName}」`);
      }
    });

    if (this.lastAutoRegistered) {
      await this.unregisterTable(sheetName);
      logger.info(`已从表名对照中取消注册「${sheetName}」`);
    }

    this.lastCreatedSheet = null;
    this.lastAutoRegistered = false;
    return true;
  }

  // ─── 私有方法 ───────────────────────────────────────────────

  /** 从 StudioConfig 版本配置构建 roads 列表：roads_0(默认) + 各版本对应的 roads，按编号排序 */
  private async loadVersionRoads(
    context: Excel.RequestContext
  ): Promise<Array<{ field: string; name: string }>> {
    const roads: Array<{ field: string; name: string }> = [
      { field: 'roads_0', name: '默认' },
    ];

    const data = await StudioConfigStore.load(context);
    if (data) {
      for (const v of data.versions) {
        if (v.lineField !== 'roads_0') {
          roads.push({ field: v.lineField, name: v.name });
        }
      }
    }

    roads.sort((a, b) => {
      const na = parseInt(a.field.replace('roads_', ''));
      const nb = parseInt(b.field.replace('roads_', ''));
      return na - nb;
    });

    return roads;
  }

  private async loadLineTemplates(
    context: Excel.RequestContext
  ): Promise<LineTemplate[]> {
    // 优先 JSON
    const data = await StudioConfigStore.load(context);
    if (data) {
      return [...data.lines].sort((a, b) => a.id - b.id);
    }

    // 旧格式回退
    let snap = await excelHelper.loadSheetSnapshot(context, SHEET_CONFIG);
    if (!snap || !excelHelper.findMarkerInData(snap.values, '#线路列表#')) {
      snap = await excelHelper.loadSheetSnapshot(context, LEGACY_SETTINGS);
    }
    if (!snap || snap.values.length === 0) {
      throw new Error('找不到包含 #线路列表# 的工作表');
    }

    const pos = excelHelper.findMarkerInData(snap.values, '#线路列表#');
    if (!pos) throw new Error('找不到 #线路列表# 标记');

    const rows = excelHelper.readBlockBelow(snap.values, pos.row, pos.col, 3);
    const lines: LineTemplate[] = [];

    for (const row of rows) {
      const id = Number(row[0]);
      if (isNaN(id) || id === 0) continue;
      lines.push({
        id,
        field: String(row[1] ?? '').trim(),
        remark: String(row[2] ?? '').trim(),
      });
    }

    lines.sort((a, b) => a.id - b.id);
    return lines;
  }

  private buildFieldString(f: FieldDefinition): string {
    let fieldName = f.name;
    if (f.isKey) {
      fieldName = `key_${fieldName}`;
    } else if (f.isLanguage) {
      fieldName = `language_${fieldName}`;
    }
    return `${fieldName}=${f.type}`;
  }

  private async registerTable(info: TableInfo): Promise<void> {
    await Excel.run(async (context) => {
      // 优先 JSON
      const ok = await StudioConfigStore.update(context, (data) => {
        data.tables.push(info);
      });
      if (ok) return;

      // 旧格式回退
      let snap = await excelHelper.loadSheetSnapshot(context, SHEET_CONFIG);
      let mappingSheet = SHEET_CONFIG;
      if (!snap || !excelHelper.findMarkerInData(snap.values, '#输出控制#')) {
        snap = await excelHelper.loadSheetSnapshot(context, LEGACY_MAPPING);
        mappingSheet = LEGACY_MAPPING;
      }
      if (!snap || snap.values.length === 0) {
        throw new Error('找不到包含 #输出控制# 的工作表');
      }

      const pos = excelHelper.findMarkerInData(snap.values, '#输出控制#');
      if (!pos) throw new Error('未找到 #输出控制# 标记');

      const rows = excelHelper.readBlockBelow(snap.values, pos.row, pos.col, 4);
      const insertRowOffset = pos.row + 1 + rows.length;
      const absRow = insertRowOffset + snap.startRow;
      const absCol = pos.col + snap.startCol;

      const sheet = context.workbook.worksheets.getItem(mappingSheet);
      sheet.getRangeByIndexes(absRow, absCol, 1, 4).values = [[
        info.versionRange, info.chineseName, info.englishName, info.shouldOutput,
      ]];
      await context.sync();
    });
  }

  private async unregisterTable(chineseName: string): Promise<void> {
    await Excel.run(async (context) => {
      // 优先 JSON
      const ok = await StudioConfigStore.update(context, (data) => {
        data.tables = data.tables.filter(t => t.chineseName !== chineseName);
      });
      if (ok) return;

      // 旧格式回退
      let snap = await excelHelper.loadSheetSnapshot(context, SHEET_CONFIG);
      let mappingSheet = SHEET_CONFIG;
      if (!snap || !excelHelper.findMarkerInData(snap.values, '#输出控制#')) {
        snap = await excelHelper.loadSheetSnapshot(context, LEGACY_MAPPING);
        mappingSheet = LEGACY_MAPPING;
      }
      if (!snap || snap.values.length === 0) return;

      const pos = excelHelper.findMarkerInData(snap.values, '#输出控制#');
      if (!pos) return;

      const data = snap.values;
      for (let r = pos.row + 1; r < data.length; r++) {
        const cellValue = String(data[r]?.[pos.col + 1] ?? '').trim();
        if (cellValue === chineseName) {
          const sheet = context.workbook.worksheets.getItem(mappingSheet);
          sheet.getRangeByIndexes(r + snap.startRow, pos.col + snap.startCol, 1, 4).values = [['', '', '', '']];
          await context.sync();
          return;
        }
      }
    });
  }
}
