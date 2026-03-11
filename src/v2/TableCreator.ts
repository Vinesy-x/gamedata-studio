/* global Excel */

import { TableInfo, LineTemplate } from '../types/config';
import { excelHelper, SheetData } from '../utils/ExcelHelper';
import { logger } from '../utils/Logger';

// ─── 接口定义 ───────────────────────────────────────────────

export interface FieldDefinition {
  name: string;          // 如 "id"
  type: string;          // 如 "int"
  description: string;   // 如 "怪物ID"
  isKey: boolean;        // 加 key_ 前缀
  isLanguage: boolean;   // 加 language_ 前缀
}

export interface TableCreationConfig {
  chineseName: string;
  englishName: string;
  startVersion: string;
  fields: FieldDefinition[];
  includeVersionCol: boolean;  // 是否包含 version_c
  autoRegister: boolean;       // 是否自动注册到表名对照
}

// ─── 工作表名常量 ────────────────────────────────────────────

const SHEET_SETTINGS = '配置设置表';
const SHEET_MAPPING = '表名对照';

// ─── TableCreator ────────────────────────────────────────────

export class TableCreator {
  /** 上次创建的工作表名（用于撤销） */
  private lastCreatedSheet: string | null = null;
  /** 上次是否执行了自动注册（用于撤销） */
  private lastAutoRegistered = false;

  /**
   * 创建新数据表工作表
   *
   * 无 version_c 时生成：
   *   Row 0: version_r | roads_0~roads_N | 空列 | 空列 | #配置区域# | 字段定义...
   *   Row 1: 版本行属  | 线路中文名...   |      |      |            | 中文描述...
   *
   * 有 version_c 时生成：
   *   Row 0: 空 | 版本列属 | version_c | 各列版本值...
   *   Row 1-3: 空行
   *   Row 4: version_r | roads_0~roads_N | 空列 | 空列 | #配置区域# | 字段定义...
   *   Row 5: 版本行属  | 线路中文名...   |      |      |            | 中文描述...
   */
  async createTable(config: TableCreationConfig): Promise<void> {
    await Excel.run(async (context) => {
      // 1. 读取线路列表（从 配置设置表 的 #线路列表# 区域）
      const sortedLines = await this.loadLineTemplates(context);
      const roadsCount = sortedLines.length;

      // 2. 计算列布局
      const gapCols = 2;
      const configMarkerCol = 1 + roadsCount + gapCols; // version_r(1) + roads(N) + 间隔(2)
      const dataStartCol = configMarkerCol + 1;

      // 3. 创建新工作表
      const sheet = context.workbook.worksheets.add(config.chineseName);

      // 4. 确定 version_r 所在行（0-indexed）
      let vrRow = 0;

      if (config.includeVersionCol) {
        vrRow = 4;
        // 写入 version_c 区域（Row 0）
        // Row 0: 空 | 版本列属 | version_c | 各列版本值...
        sheet.getRangeByIndexes(0, 1, 1, 1).values = [['版本列属']];
        sheet.getRangeByIndexes(0, 2, 1, 1).values = [['version_c']];
        // 为每个字段列写入起始版本号
        for (let i = 0; i < config.fields.length; i++) {
          sheet.getRangeByIndexes(0, dataStartCol + i, 1, 1).values = [[config.startVersion]];
        }
      }

      // 5. 写入 version_r + roads 列头
      sheet.getRangeByIndexes(vrRow, 0, 1, 1).values = [['version_r']];
      for (let i = 0; i < sortedLines.length; i++) {
        sheet.getRangeByIndexes(vrRow, 1 + i, 1, 1).values = [[sortedLines[i].field]];
      }

      // 6. 写入 #配置区域# 标记
      sheet.getRangeByIndexes(vrRow, configMarkerCol, 1, 1).values = [['#配置区域#']];

      // 7. 写入字段定义行
      for (let i = 0; i < config.fields.length; i++) {
        const f = config.fields[i];
        const fieldStr = this.buildFieldString(f);
        sheet.getRangeByIndexes(vrRow, dataStartCol + i, 1, 1).values = [[fieldStr]];
      }

      // 8. 写入版本行属 + 中文描述行
      const descRow = vrRow + 1;
      sheet.getRangeByIndexes(descRow, 0, 1, 1).values = [['版本行属']];
      for (let i = 0; i < sortedLines.length; i++) {
        sheet.getRangeByIndexes(descRow, 1 + i, 1, 1).values = [[sortedLines[i].remark]];
      }
      for (let i = 0; i < config.fields.length; i++) {
        sheet.getRangeByIndexes(descRow, dataStartCol + i, 1, 1).values = [[config.fields[i].description]];
      }

      // 9. 设置冻结窗格：冻结在数据区左上角
      const freezeRow = descRow + 1;
      const freezeCol = dataStartCol;
      sheet.freezePanes.freezeAt(
        sheet.getRangeByIndexes(freezeRow, freezeCol, 1, 1)
      );

      await context.sync();

      this.lastCreatedSheet = config.chineseName;
      this.lastAutoRegistered = false;

      logger.info(`工作表「${config.chineseName}」创建完成，共 ${config.fields.length} 个字段`);
    });

    // 10. 自动注册到表名对照
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

  /**
   * 撤销上次创建
   * - 删除上次创建的工作表
   * - 取消注册（如果已注册）
   */
  async undoLastCreation(): Promise<boolean> {
    if (!this.lastCreatedSheet) {
      logger.warn('没有可撤销的创建操作');
      return false;
    }

    const sheetName = this.lastCreatedSheet;

    // 删除工作表
    await Excel.run(async (context) => {
      const sheet = context.workbook.worksheets.getItemOrNullObject(sheetName);
      sheet.load('isNullObject');
      await context.sync();

      if (!sheet.isNullObject) {
        sheet.delete();
        await context.sync();
        logger.info(`已删除工作表「${sheetName}」`);
      } else {
        logger.warn(`工作表「${sheetName}」不存在，跳过删除`);
      }
    });

    // 取消注册
    if (this.lastAutoRegistered) {
      await this.unregisterTable(sheetName);
      logger.info(`已从表名对照中取消注册「${sheetName}」`);
    }

    this.lastCreatedSheet = null;
    this.lastAutoRegistered = false;
    return true;
  }

  // ─── 私有方法 ───────────────────────────────────────────────

  /**
   * 从 配置设置表 的 #线路列表# 区域加载线路模板，按 id 排序返回
   */
  private async loadLineTemplates(
    context: Excel.RequestContext
  ): Promise<LineTemplate[]> {
    const snap = await excelHelper.loadSheetSnapshot(context, SHEET_SETTINGS);
    if (!snap || snap.values.length === 0) {
      throw new Error(`找不到工作表「${SHEET_SETTINGS}」或为空`);
    }

    const pos = excelHelper.findMarkerInData(snap.values, '#线路列表#');
    if (!pos) {
      throw new Error('找不到 #线路列表# 标记');
    }

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

  /**
   * 组装字段定义字符串
   * key 前缀: key_name=type
   * language 前缀: language_name=type
   * 普通: name=type
   */
  private buildFieldString(f: FieldDefinition): string {
    let fieldName = f.name;
    if (f.isKey) {
      fieldName = `key_${fieldName}`;
    } else if (f.isLanguage) {
      fieldName = `language_${fieldName}`;
    }
    return `${fieldName}=${f.type}`;
  }

  /**
   * 注册表到「表名对照」工作表的 #输出控制# 区域
   *
   * 注意：这里直接实现注册逻辑，避免对尚未创建的 TableRegistry 的依赖。
   * 后续 TableRegistry 模块就绪后可重构为委托调用。
   */
  private async registerTable(info: TableInfo): Promise<void> {
    await Excel.run(async (context) => {
      const snap = await excelHelper.loadSheetSnapshot(context, SHEET_MAPPING);
      if (!snap || snap.values.length === 0) {
        throw new Error(`找不到工作表「${SHEET_MAPPING}」或为空`);
      }

      const pos = excelHelper.findMarkerInData(snap.values, '#输出控制#');
      if (!pos) {
        throw new Error('未找到 #输出控制# 标记');
      }

      // 找到数据块末尾（标记下方第一个空行）
      const rows = excelHelper.readBlockBelow(snap.values, pos.row, pos.col, 4);
      const insertRowOffset = pos.row + 1 + rows.length; // 标记行 + 1（跳过标记） + 数据行数

      // 转换为工作表绝对坐标
      const absRow = insertRowOffset + snap.startRow;
      const absCol = pos.col + snap.startCol;

      const sheet = context.workbook.worksheets.getItem(SHEET_MAPPING);
      const range = sheet.getRangeByIndexes(absRow, absCol, 1, 4);
      range.values = [[
        info.versionRange,
        info.chineseName,
        info.englishName,
        info.shouldOutput,
      ]];

      await context.sync();
    });
  }

  /**
   * 从「表名对照」中取消注册指定表（清空对应行）
   */
  private async unregisterTable(chineseName: string): Promise<void> {
    await Excel.run(async (context) => {
      const snap = await excelHelper.loadSheetSnapshot(context, SHEET_MAPPING);
      if (!snap || snap.values.length === 0) return;

      const pos = excelHelper.findMarkerInData(snap.values, '#输出控制#');
      if (!pos) return;

      // 在数据块中查找目标行
      const data = snap.values;
      for (let r = pos.row + 1; r < data.length; r++) {
        const cellValue = String(data[r]?.[pos.col + 1] ?? '').trim();
        if (cellValue === chineseName) {
          // 清空该行的 4 列
          const absRow = r + snap.startRow;
          const absCol = pos.col + snap.startCol;
          const sheet = context.workbook.worksheets.getItem(SHEET_MAPPING);
          const range = sheet.getRangeByIndexes(absRow, absCol, 1, 4);
          range.values = [['', '', '', '']];
          await context.sync();
          return;
        }
      }
    });
  }
}
