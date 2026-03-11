/* global Excel */

import { VersionTemplate, LineTemplate, TableInfo, StaffInfo } from '../types/config';
import { logger } from '../utils/Logger';
import { SHEET_CONFIG } from './TemplateFactory';

// ─── JSON 数据结构 ──────────────────────────────────────

export interface StudioConfigData {
  /** 输出版本名 */
  outputVersion: string;
  /** 输出版本号 */
  outputVersionNumber: number;
  /** 版本序列号 */
  versionSequence: number;
  /** 完整版本号字符串 (如 "7.5.1152") */
  fullVersion: string;
  /** 工作状态 */
  workStatus: string;
  /** 输出表格结果数量 */
  resultCount: number;

  /** 版本列表 */
  versions: VersionTemplate[];
  /** 线路列表 */
  lines: LineTemplate[];
  /** 人员代码 */
  staff: StaffInfo[];

  /** Git 提交模板 */
  gitCommitTemplate: string;
  /** 功能开关 */
  switches: Record<string, boolean>;
  /** 输出控制（表名对照） */
  tables: TableInfo[];
}

// ─── 默认配置 ──────────────────────────────────────────

export function createDefaultConfig(): StudioConfigData {
  return {
    outputVersion: '默认',
    outputVersionNumber: 1,
    versionSequence: 0,
    fullVersion: '1.0',
    workStatus: '',
    resultCount: 0,
    versions: [{ name: '默认', lineId: 0, lineField: 'roads_0', gitDirectory: '' }],
    lines: [{ id: 0, field: 'roads_0', remark: '默认线路' }],
    staff: [{ id: 1, name: '默认用户', code: 'default', machineCode: '' }],
    gitCommitTemplate: 'update: v{version} data export',
    switches: { '自动弹出路径': false },
    tables: [],
  };
}

// ─── 读写核心 ──────────────────────────────────────────

/**
 * StudioConfigStore — JSON 序列化存储
 *
 * StudioConfig 工作表 A1 单元格存储完整 JSON 配置。
 * 所有配置读写通过 load → 修改 → save 模式完成。
 */
export class StudioConfigStore {
  /**
   * 从 StudioConfig 工作表 A1 读取 JSON 配置
   * @returns 配置数据，若工作表不存在返回 null
   */
  static async load(context: Excel.RequestContext): Promise<StudioConfigData | null> {
    const sheet = context.workbook.worksheets.getItemOrNullObject(SHEET_CONFIG);
    sheet.load('isNullObject');
    await context.sync();

    if (sheet.isNullObject) return null;

    const cell = sheet.getRange('A1');
    cell.load('values');
    await context.sync();

    const raw = cell.values[0][0];
    if (raw == null || String(raw).trim() === '') return null;

    try {
      return JSON.parse(String(raw)) as StudioConfigData;
    } catch {
      logger.error('StudioConfigStore.load: JSON 解析失败');
      return null;
    }
  }

  /**
   * 将配置数据序列化为 JSON 写入 StudioConfig A1
   */
  static async save(context: Excel.RequestContext, data: StudioConfigData): Promise<void> {
    const sheet = context.workbook.worksheets.getItemOrNullObject(SHEET_CONFIG);
    sheet.load('isNullObject');
    await context.sync();

    if (sheet.isNullObject) {
      throw new Error(`工作表「${SHEET_CONFIG}」不存在`);
    }

    const json = JSON.stringify(data);
    sheet.getRange('A1').values = [[json]];
    await context.sync();
  }

  /**
   * 创建 StudioConfig 工作表并写入默认配置
   */
  static async create(context: Excel.RequestContext, data?: StudioConfigData): Promise<void> {
    const existing = context.workbook.worksheets.getItemOrNullObject(SHEET_CONFIG);
    existing.load('isNullObject');
    await context.sync();

    if (!existing.isNullObject) {
      throw new Error(`工作表「${SHEET_CONFIG}」已存在`);
    }

    const sheet = context.workbook.worksheets.add(SHEET_CONFIG);
    const configData = data ?? createDefaultConfig();
    sheet.getRange('A1').values = [[JSON.stringify(configData)]];
    sheet.visibility = Excel.SheetVisibility.hidden;
    await context.sync();

    logger.info('StudioConfig 创建完成 (JSON 格式)');
  }

  /**
   * 便捷方法：load → mutate → save
   * 如果 StudioConfig 不存在返回 false
   */
  static async update(
    context: Excel.RequestContext,
    mutator: (data: StudioConfigData) => void
  ): Promise<boolean> {
    const data = await this.load(context);
    if (!data) return false;
    mutator(data);
    await this.save(context, data);
    return true;
  }
}
