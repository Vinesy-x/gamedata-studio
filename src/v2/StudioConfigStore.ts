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

  /**
   * 数据表工作表格式说明（纯文档，不参与业务逻辑）
   * 供 AI 或外部工具按照此规范自动生成数据表
   */
  tableSchema?: TableSchemaDoc;
}

// ─── 表格格式说明文档 ────────────────────────────────────

export interface TableSchemaDoc {
  _description: string;
  sheetLayout: SheetLayoutDoc;
  fieldFormat: FieldFormatDoc;
  versionRange: VersionRangeDoc;
  roadsControl: RoadsControlDoc;
  examples: TableExampleDoc[];
}

export interface SheetLayoutDoc {
  _description: string;
  versionC: {
    _description: string;
    optional: boolean;
    structure: string[];
  };
  versionR: {
    _description: string;
    structure: string[];
  };
  descriptionRow: {
    _description: string;
    structure: string[];
  };
  dataRows: {
    _description: string;
    structure: string[];
  };
  configMarker: {
    _description: string;
    symbol: string;
    rules: string[];
  };
}

export interface FieldFormatDoc {
  _description: string;
  syntax: string;
  prefixes: { prefix: string; meaning: string; example: string }[];
  types: { type: string; description: string; separator?: string }[];
}

export interface VersionRangeDoc {
  _description: string;
  rule: string;
  examples: { input: string; parsed: string; meaning: string }[];
}

export interface RoadsControlDoc {
  _description: string;
  roads0: { role: string; values: string[] };
  roadsN: { role: string; values: string[] };
  filterLogic: string;
}

export interface TableExampleDoc {
  name: string;
  mode: string;
  grid: string[][];
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
    tableSchema: createTableSchema(),
  };
}

/**
 * 创建表格格式说明文档
 * 此数据为纯文档性质，描述数据表工作表的完整布局规范。
 * AI 或外部工具可根据此说明自动生成符合规范的数据表。
 */
export function createTableSchema(): TableSchemaDoc {
  return {
    _description: '游戏数据表工作表格式规范。每张数据表是一个 Excel 工作表，包含版本控制区和主数据区。此说明为纯文档，不参与业务逻辑。',

    sheetLayout: {
      _description: '工作表由上到下分为：可选的 version_c 区域 → version_r 行 → 描述行 → 数据行。左右分为：版本控制区（A列起） → 空隙列 → #配置区域# 标记 → 主数据区。',

      versionC: {
        _description: '列版本控制区（可选）。位于 version_r 行上方，控制每个数据列在不同版本/线路下是否导出。',
        optional: true,
        structure: [
          'Row 0: [...空列] | 版本列属 | version_c | {列1版本值} | {列2版本值} | ...',
          'Row 1: [...空列] | {线路名}  | roads_0   | {列1控制值} | {列2控制值} | ...',
          'Row 2: [...空列] | {线路名}  | roads_N   | {列1控制值} | {列2控制值} | ...',
          '...(可有多行 roads，每行对应一条线路)',
          '「版本列属」位于 version_c 左一列，是标签列',
          '「version_c」所在列下方各行为 roads 字段名（roads_0, roads_1, ...）',
          'version_c 行中 #配置区域# 右侧各列的值为版本区间字符串，控制该列在哪些版本下导出',
          'roads 行中各列的值为 0/1 或版本区间字符串，控制该列在对应线路下是否导出',
        ],
      },

      versionR: {
        _description: 'version_r 行是表的核心结构行，定义了所有列的含义。无 version_c 时位于第 0 行，有 version_c 时位于第 4 行（中间可有空行）。',
        structure: [
          'version_r | roads_0 | roads_1 | ... | roads_N | [空列] | [空列] | #配置区域# | {字段定义1} | {字段定义2} | ...',
          'A列固定为「version_r」标记文字',
          'B列起为线路字段名（roads_0 必有，roads_1~roads_N 按配置的版本数量递增）',
          '线路列后有 2 列空隙（gap）',
          '空隙后为 #配置区域# 标记',
          '#配置区域# 右侧为字段定义（格式见 fieldFormat）',
        ],
      },

      descriptionRow: {
        _description: '紧跟 version_r 行下方的描述行，提供中文说明。',
        structure: [
          '版本行属 | {线路1中文名} | {线路2中文名} | ... | [空列] | [空列] | [空] | {字段1中文描述} | {字段2中文描述} | ...',
          'A列固定为「版本行属」标记文字',
          'B列起为各线路的中文名（如「默认」「韩国」「日本」）',
          '#配置区域# 右侧为各字段的中文描述（如「编号」「名称」「生命值」）',
        ],
      },

      dataRows: {
        _description: '描述行下方为数据行，每行一条游戏数据记录。',
        structure: [
          '{版本区间} | {roads_0值} | {roads_1值} | ... | [空列] | [空列] | [空] | {数据值1} | {数据值2} | ...',
          'A列为版本区间字符串（如「1.0」「1.0~2.5」），控制该行在哪些版本下导出',
          'roads 列为 0/1 或版本区间，控制该行在对应线路下是否导出',
          '#配置区域# 右侧为实际的游戏数据',
          '首行数据从描述行的下一行开始',
        ],
      },

      configMarker: {
        _description: '#配置区域# 是分隔版本控制区和主数据区的标记。',
        symbol: '#配置区域#',
        rules: [
          '必须存在于 version_r 行中',
          '位置不固定，取决于线路列数量和空隙列',
          '计算公式：configMarkerCol = 1(version_r) + roadsCount(线路数) + 2(空隙列)',
          '其右侧第一列即为主数据区的起始列（dataStartCol = configMarkerCol + 1）',
        ],
      },
    },

    fieldFormat: {
      _description: '字段定义位于 version_r 行 #配置区域# 右侧，格式为「[前缀]字段名=类型」。',
      syntax: '[prefix_]fieldName=type',
      prefixes: [
        { prefix: 'key_', meaning: '主键字段，用于数据去重（同 key 保留后面的行覆盖前面的）', example: 'key_id=int' },
        { prefix: 'language_', meaning: '多语言字段，导出时需要多语言处理', example: 'language_name=string' },
        { prefix: '(无前缀)', meaning: '普通数据字段', example: 'hp=int' },
      ],
      types: [
        { type: 'int', description: '整数' },
        { type: 'float', description: '浮点数' },
        { type: 'string', description: '文本字符串' },
        { type: 'int[]', description: '整数数组', separator: '|' },
        { type: 'float[]', description: '浮点数数组', separator: '|' },
        { type: 'string[]', description: '文本数组', separator: '|' },
        { type: 'int[][]', description: '二维整数数组', separator: '行;列|' },
        { type: 'float[][]', description: '二维浮点数组', separator: '行;列|' },
      ],
    },

    versionRange: {
      _description: '版本区间采用左闭右开规则 [min, max)，用于行/列的版本筛选。',
      rule: '左闭右开 [min, max)：min <= version < max',
      examples: [
        { input: '(空值)', parsed: '[0, 0.1)', meaning: '几乎不导出' },
        { input: '1.0', parsed: '[1.0, 99)', meaning: '从 1.0 版本起永久生效' },
        { input: '1.0~2.5', parsed: '[1.0, 2.5)', meaning: '仅在 1.0 到 2.5 之前的版本生效' },
        { input: '~2.5', parsed: '[0, 2.5)', meaning: '2.5 之前的所有版本生效' },
        { input: '1.0~', parsed: '[1.0, 99)', meaning: '从 1.0 起永久生效（同纯数字）' },
        { input: '3.5a', parsed: '[3.5, 99)', meaning: '字母后缀被忽略（人员代码标记），提取 3.5' },
      ],
    },

    roadsControl: {
      _description: '线路控制列决定每行/列数据在哪些地区版本下导出，筛选时各条件为 AND 关系。',
      roads0: {
        role: '总线路开关，所有版本都会检查此列',
        values: [
          '1 = 该行在所有版本中启用',
          '0 或空 = 该行在所有版本中禁用',
          '版本区间字符串 = 该行仅在指定版本区间内启用',
        ],
      },
      roadsN: {
        role: '地区专属线路（如国内 roads_1、韩国 roads_9、日本 roads_11），导出时只检查当前版本对应的线路列',
        values: [
          '1 = 该行在该线路中启用',
          '0 或空 = 该行在该线路中禁用',
          '版本区间字符串 = 仅在指定版本区间内启用',
        ],
      },
      filterLogic: '行导出条件 = 版本区间通过(A列) AND roads_0通过 AND 当前线路roads_N通过；三个条件全部满足才保留该行',
    },

    examples: [
      {
        name: '仅行控制模式（无 version_c）',
        mode: 'R',
        grid: [
          ['version_r', 'roads_0', 'roads_1', '', '', '#配置区域#', 'key_id=int', 'name=string', 'hp=int'],
          ['版本行属', '默认', '韩国', '', '', '', '编号', '名称', '生命值'],
          ['1.0', '1', '1', '', '', '', '1001', '史莱姆', '100'],
          ['1.5', '1', '0', '', '', '', '1002', '哥布林', '200'],
          ['2.0', '1', '1', '', '', '', '1003', '龙王', '9999'],
        ],
      },
      {
        name: '行列双控模式（有 version_c）',
        mode: 'R+C',
        grid: [
          ['', '', '', '', '版本列属', 'version_c', '1.0', '1.0', '2.0'],
          ['', '', '', '', '', 'roads_0', '1', '1', '1'],
          ['', '', '', '', '', 'roads_1', '1', '1', '0'],
          ['', '', '', '', '', '', '', '', ''],
          ['version_r', 'roads_0', 'roads_1', '', '', '#配置区域#', 'key_id=int', 'name=string', 'reward=int[]'],
          ['版本行属', '默认', '韩国', '', '', '', '编号', '名称', '奖励'],
          ['1.0', '1', '1', '', '', '', '2001', '新手礼包', '100|200|300'],
          ['2.0', '1', '0', '', '', '', '2002', '周年礼包', '500|600'],
        ],
      },
    ],
  };
}

// ─── 工具方法 ──────────────────────────────────────────

/**
 * 从 StudioConfigData 构建完整的 roads 列表（含 lineId→lineField 映射）
 * 统一入口，所有需要 roads 列表的地方都应调用此方法，避免重复逻辑。
 */
export function buildRoadsFromConfig(
  data: StudioConfigData
): Array<{ field: string; name: string }> {
  // 构建 lineId → field 映射（lines 是真实来源）
  const lineFieldMap = new Map<number, string>();
  for (const l of data.lines) {
    lineFieldMap.set(l.id, l.field);
  }

  const roads: Array<{ field: string; name: string }> = [
    { field: 'roads_0', name: '默认' },
  ];

  for (const v of data.versions) {
    // 优先用 lines 中的 field（可靠），其次用 version 自带的 lineField
    const field = lineFieldMap.get(v.lineId) || v.lineField || '';
    if (field && field !== 'roads_0' && field.startsWith('roads_')) {
      roads.push({ field, name: v.name });
    }
  }

  roads.sort((a, b) =>
    parseInt(a.field.replace('roads_', '')) - parseInt(b.field.replace('roads_', ''))
  );

  return roads;
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
      const data = JSON.parse(String(raw)) as StudioConfigData;
      // 自动补全 tableSchema（确保已有配置也包含格式说明）
      if (!data.tableSchema) {
        data.tableSchema = createTableSchema();
        sheet.getRange('A1').values = [[JSON.stringify(data)]];
        await context.sync();
      }
      return data;
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

    // 每次保存时确保 tableSchema 为最新版本
    data.tableSchema = createTableSchema();
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

    // 1. 创建 StudioConfig 隐藏表（JSON 配置）
    const sheet = context.workbook.worksheets.add(SHEET_CONFIG);
    const configData = data ?? createDefaultConfig();

    // 默认注册 配置表 GameConfig
    if (configData.tables.length === 0) {
      configData.tables.push({
        chineseName: '配置表',
        englishName: 'GameConfig',
        shouldOutput: true,
        versionRange: '1.0',
      });
    }

    sheet.getRange('A1').values = [[JSON.stringify(configData)]];
    sheet.visibility = Excel.SheetVisibility.hidden;
    await context.sync();
    logger.info('StudioConfig 创建完成 (JSON 格式)');

    // 2. 创建 配置表 (GameConfig) 数据表
    await this.createGameConfigSheet(context);

    // 3. 创建 表名对照
    await this.createMappingSheet(context, configData);
  }

  /**
   * 创建配置表 (GameConfig) — 含一行 CONFIG_VERSION 数据
   */
  private static async createGameConfigSheet(context: Excel.RequestContext): Promise<void> {
    const existing = context.workbook.worksheets.getItemOrNullObject('配置表');
    existing.load('isNullObject');
    await context.sync();
    if (!existing.isNullObject) return;

    // 从配置构建 roads 列表
    const data = await this.load(context);
    const roads = data ? buildRoadsFromConfig(data) : [{ field: 'roads_0', name: '默认' }];
    const roadsCount = roads.length;
    const gapCols = 2;
    const configMarkerCol = 1 + roadsCount + gapCols;
    const dataStartCol = configMarkerCol + 1;

    const fields = ['key_id=int', 'param=string', 'value=string'];
    const fieldDescs = ['key_序号', '参数名', '参数值'];
    const totalCols = dataStartCol + fields.length;

    const sheet = context.workbook.worksheets.add('配置表');

    // version_r 行（R控制方式）
    const vrRow: (string | number)[] = new Array(totalCols).fill('');
    vrRow[0] = 'version_r';
    for (let i = 0; i < roadsCount; i++) {
      vrRow[1 + i] = roads[i].field;
    }
    vrRow[configMarkerCol] = '#配置区域#';
    for (let i = 0; i < fields.length; i++) {
      vrRow[dataStartCol + i] = fields[i];
    }
    sheet.getRangeByIndexes(0, 0, 1, totalCols).values = [vrRow];

    // 描述行
    const descRow: (string | number)[] = new Array(totalCols).fill('');
    descRow[0] = '版本行属';
    for (let i = 0; i < roadsCount; i++) {
      descRow[1 + i] = roads[i].name;
    }
    for (let i = 0; i < fieldDescs.length; i++) {
      descRow[dataStartCol + i] = fieldDescs[i];
    }
    sheet.getRangeByIndexes(1, 0, 1, totalCols).values = [descRow];

    // 数据行（版本行属 + 所有roads列都填1）
    const dataRow: (string | number)[] = new Array(totalCols).fill('');
    dataRow[0] = 1;
    for (let i = 0; i < roadsCount; i++) {
      dataRow[1 + i] = 1;
    }
    dataRow[dataStartCol] = 1;
    dataRow[dataStartCol + 1] = 'CONFIG_VERSION';
    dataRow[dataStartCol + 2] = '0';
    sheet.getRangeByIndexes(2, 0, 1, totalCols).values = [dataRow];

    // 列宽
    sheet.getRangeByIndexes(0, 0, 1, 1).format.columnWidth = 80;
    for (let i = 0; i < roadsCount; i++) {
      sheet.getRangeByIndexes(0, 1 + i, 1, 1).format.columnWidth = 80;
    }
    sheet.getRangeByIndexes(0, configMarkerCol, 1, 1).format.columnWidth = 80;
    for (let i = 0; i < fields.length; i++) {
      sheet.getRangeByIndexes(0, dataStartCol + i, 1, 1).format.columnWidth = 160;
    }

    sheet.activate();
    await context.sync();
    logger.info('已创建「配置表」(GameConfig) — R控制方式');
  }

  /**
   * 创建表名对照工作表（含表头和初始数据）
   */
  private static async createMappingSheet(
    context: Excel.RequestContext,
    configData: StudioConfigData
  ): Promise<void> {
    const existing = context.workbook.worksheets.getItemOrNullObject('表名对照');
    existing.load('isNullObject');
    await context.sync();
    if (!existing.isNullObject) return;

    // 尝试重用 Sheet1（空白工作簿默认sheet），避免多出一个空白sheet
    const sheet1 = context.workbook.worksheets.getItemOrNullObject('Sheet1');
    sheet1.load('isNullObject');
    await context.sync();

    let sheet: Excel.Worksheet;
    if (!sheet1.isNullObject) {
      sheet1.name = '表名对照';
      sheet = sheet1;
    } else {
      sheet = context.workbook.worksheets.add('表名对照');
    }
    // 移到最前面
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

    // 写入已注册的表数据（无背景色）
    if (configData.tables.length > 0) {
      const rows = configData.tables.map(t => [t.versionRange, t.chineseName, t.englishName, t.shouldOutput]);
      sheet.getRangeByIndexes(1, 0, rows.length, 4).values = rows;
    }

    // 列宽
    sheet.getRangeByIndexes(0, 0, 1, 1).format.columnWidth = 100;
    sheet.getRangeByIndexes(0, 1, 1, 1).format.columnWidth = 140;
    sheet.getRangeByIndexes(0, 2, 1, 1).format.columnWidth = 160;
    sheet.getRangeByIndexes(0, 3, 1, 1).format.columnWidth = 100;

    await context.sync();
    logger.info('已创建「表名对照」工作表');
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
