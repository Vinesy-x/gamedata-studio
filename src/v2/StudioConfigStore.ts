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

  /** 校验配置 */
  validationConfig?: ValidationConfig;
}

/** 校验自定义配置 */
export interface ValidationConfig {
  /** 各数组类型的分隔符配置 */
  typeDelimiters: Record<string, TypeDelimiterConfig>;
}

/** 单个类型的分隔符定义 */
export interface TypeDelimiterConfig {
  /** 一维分隔符 (如 "|") */
  primary: string;
  /** 二维分隔符 (如 ";")，仅 [][] 类型使用 */
  secondary?: string;
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
  emptyCellRule: string;
}

export interface TableExampleDoc {
  name: string;
  mode: string;
  grid: string[][];
}

// ─── 协同导出配置类型 ────────────────────────────────────

export interface CollabConfig {
  version: string;
  versionNumber: number;
  sequence: number;
  operator: string;
  workStatus: string;
  exportResult: string;
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
    validationConfig: createDefaultValidationConfig(),
  };
}

/**
 * 创建表格格式说明文档
 * 此数据为纯文档性质，描述数据表工作表的完整布局规范。
 * AI 或外部工具可根据此说明自动生成符合规范的数据表。
 */
export function createDefaultValidationConfig(): ValidationConfig {
  return {
    typeDelimiters: {
      'int[]': { primary: '|' },
      'float[]': { primary: '|' },
      'string[]': { primary: '|' },
      'int[][]': { primary: '|', secondary: ';' },
      'float[][]': { primary: '|', secondary: ';' },
      'string[][]': { primary: '|', secondary: ';' },
    },
  };
}

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
          '【重要】主数据区（#配置区域# 右侧）不允许出现空单元格，空单元格会导致数据边界判定错误或导出数据缺失',
          '【重要】行列控制区（A列版本区间 + roads列）允许空单元格，空值等同于 0（不导出）',
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
      emptyCellRule: '行列控制区的空单元格等同于 0（不导出），允许留空；主数据区（#配置区域# 右侧的实际数值）不允许空单元格',
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

    // 同步协同导出区域的下拉列表和值
    this.syncCollabDropdowns(sheet, data);

    await context.sync();
  }

  /**
   * 同步协同区域下拉列表 + 序列号等只读值
   * 每次 save() 时自动调用，确保版本/人员变更后下拉选项同步
   */
  private static syncCollabDropdowns(sheet: Excel.Worksheet, data: StudioConfigData): void {
    // 检查协同区域是否存在（A3 是否为标题）
    // 因为 save 在 create 之前也可能调用，此处做防御
    const R = this.ROW;

    // 同步序列号（只读值）
    sheet.getRangeByIndexes(R.SEQUENCE, 1, 1, 1).values = [[data.versionSequence]];

    // 同步输出版本下拉
    const versionNames = data.versions.map(v => v.name).join(',');
    if (versionNames) {
      const versionCell = sheet.getRangeByIndexes(R.VERSION, 1, 1, 1);
      versionCell.dataValidation.clear();
      versionCell.dataValidation.rule = {
        list: { inCellDropDown: true, source: versionNames },
      };
    }

    // 同步操作人下拉
    const staffNames = data.staff.map(s => s.name).join(',');
    if (staffNames) {
      const operatorCell = sheet.getRangeByIndexes(R.OPERATOR, 1, 1, 1);
      operatorCell.dataValidation.clear();
      operatorCell.dataValidation.rule = {
        list: { inCellDropDown: true, source: staffNames },
      };
    }
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

    // 1. 创建 StudioConfig 表（JSON 配置 + 协同导出区域）
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
    // 表可见，供网页端用户查看协同导出区域
    sheet.visibility = Excel.SheetVisibility.visible;
    // StudioConfig 放在最前面
    sheet.position = 0;

    // 写入协同导出区域 A3:B8
    this.writeCollabArea(sheet, configData);

    await context.sync();
    logger.info('StudioConfig 创建完成 (JSON 格式 + 协同导出区域)');

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
    let isSheet1Empty = false;
    if (!sheet1.isNullObject) {
      const usedRange = sheet1.getUsedRangeOrNullObject();
      usedRange.load('isNullObject');
      await context.sync();
      isSheet1Empty = usedRange.isNullObject;
    }

    if (!sheet1.isNullObject && isSheet1Empty) {
      sheet1.name = '表名对照';
      sheet = sheet1;
    } else {
      sheet = context.workbook.worksheets.add('表名对照');
    }
    // 移到 StudioConfig 后面（第二位）
    sheet.position = 1;

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

      // TODO: 超链接功能暂时屏蔽，待修复后恢复
      // for (let i = 0; i < configData.tables.length; i++) {
      //   const cellRange = sheet.getRangeByIndexes(1 + i, 1, 1, 1);
      //   cellRange.hyperlink = {
      //     documentReference: `'${configData.tables[i].chineseName}'!A1`,
      //     screenTip: `跳转到「${configData.tables[i].chineseName}」`,
      //   };
      // }
    }

    // 列宽
    sheet.getRangeByIndexes(0, 0, 1, 1).format.columnWidth = 100;
    sheet.getRangeByIndexes(0, 1, 1, 1).format.columnWidth = 140;
    sheet.getRangeByIndexes(0, 2, 1, 1).format.columnWidth = 160;
    sheet.getRangeByIndexes(0, 3, 1, 1).format.columnWidth = 100;

    // 初始化后默认显示表名对照
    sheet.activate();

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

  // ─── 协同导出区域 ──────────────────────────────────────

  /**
   * 协同导出区域布局（A3 起）:
   *   A3: #协同导出#     (标题行, 蓝色背景白字, 合并A3:B3)
   *   ── 配置参数区 ──
   *   A4: #输出版本#     B4: {版本名}     ← 下拉选择
   *   A5: #输出版本号#   B5: {版本号}
   *   A6: #序列号#       B6: {序列号}
   *   A7: #操作人#       B7: {空}         ← 下拉选择, 写入触发导出
   *   ── 空行分隔 ──
   *   A8: (空)
   *   ── 状态结果区 ──
   *   A9:  #工作状态#    B9:  {空}        ← 本地回写
   *   A10: #导出结果#    B10: {空}        ← 本地回写
   */

  /** 协同区域起始行 (0-indexed) */
  private static readonly COLLAB_START_ROW = 2;

  /**
   * 写入协同导出区域到工作表
   */
  private static writeCollabArea(sheet: Excel.Worksheet, data: StudioConfigData): void {
    // ── 0. 全屏白底 + 清除网格 ──
    const canvas = sheet.getRangeByIndexes(0, 0, 30, 10);
    canvas.format.fill.color = '#FFFFFF';
    canvas.format.font.color = '#333333';
    canvas.format.borders.getItem('InsideHorizontal').style = Excel.BorderLineStyle.none;
    canvas.format.borders.getItem('InsideVertical').style = Excel.BorderLineStyle.none;

    // 隐藏 Row 0~1 (JSON + 空行)
    sheet.getRangeByIndexes(0, 0, 2, 1).format.rowHeight = 0;

    // ── 列宽 ──
    sheet.getRangeByIndexes(0, 0, 1, 1).format.columnWidth = 100;  // A: 标签
    sheet.getRangeByIndexes(0, 1, 1, 1).format.columnWidth = 280;  // B: 值（加宽，下拉箭头更大）

    // ── 1. 标题行 A3 ──
    const titleRange = sheet.getRangeByIndexes(2, 0, 1, 2);
    titleRange.merge(false);
    titleRange.values = [['#协同导出#', '']];
    titleRange.format.fill.color = '#0078D4';
    titleRange.format.font.color = '#FFFFFF';
    titleRange.format.font.bold = true;
    titleRange.format.font.size = 13;
    titleRange.format.horizontalAlignment = Excel.HorizontalAlignment.center;
    titleRange.format.verticalAlignment = Excel.VerticalAlignment.center;
    titleRange.format.rowHeight = 36;

    // ── 2. 配置参数区 A4:B7 ──
    const configValues: (string | number)[][] = [
      ['#输出版本#', data.outputVersion],
      ['#输出版本号#', data.outputVersionNumber],
      ['#序列号#', data.versionSequence],
      ['#操作人#', ''],
    ];
    sheet.getRangeByIndexes(3, 0, 4, 2).values = configValues;

    // 行高：下拉行 (版本/操作人) 特别加高，下拉箭头和列表项跟行高成比例
    sheet.getRangeByIndexes(3, 0, 1, 1).format.rowHeight = 44;  // #输出版本# — 下拉
    sheet.getRangeByIndexes(4, 0, 1, 1).format.rowHeight = 32;  // #输出版本号#
    sheet.getRangeByIndexes(5, 0, 1, 1).format.rowHeight = 32;  // #序列号#
    sheet.getRangeByIndexes(6, 0, 1, 1).format.rowHeight = 44;  // #操作人# — 下拉

    // 标签列 A4:A7
    const labels = sheet.getRangeByIndexes(3, 0, 4, 1);
    labels.format.font.color = '#5C6370';
    labels.format.font.size = 13;
    labels.format.horizontalAlignment = Excel.HorizontalAlignment.right;
    labels.format.verticalAlignment = Excel.VerticalAlignment.center;
    labels.format.fill.color = '#F8F9FA';

    // 值列 B4:B7 — 基础样式
    const vals = sheet.getRangeByIndexes(3, 1, 4, 1);
    vals.format.font.size = 15;
    vals.format.font.color = '#1A1A1A';
    vals.format.horizontalAlignment = Excel.HorizontalAlignment.left;
    vals.format.verticalAlignment = Excel.VerticalAlignment.center;
    vals.format.indentLevel = 1;

    // 版本名 — 大字加粗，下拉列表项也会跟着变大
    const versionCell = sheet.getRangeByIndexes(3, 1, 1, 1);
    versionCell.format.font.bold = true;
    versionCell.format.font.size = 18;

    // 序列号 — 灰色只读样式
    const seqCell = sheet.getRangeByIndexes(5, 1, 1, 1);
    seqCell.format.font.color = '#9CA3AF';
    seqCell.format.fill.color = '#F3F4F6';
    // 禁止编辑：用自定义验证阻止输入
    seqCell.dataValidation.rule = {
      custom: { formula: '=FALSE' },
    };
    seqCell.dataValidation.errorAlert = {
      showAlert: true,
      title: '禁止修改',
      message: '序列号由系统自动管理，请勿手动修改。',
      style: Excel.DataValidationAlertStyle.stop,
    };

    // 操作人单元格 — 浅蓝底 + 大字号(下拉列表项也变大)
    const operatorCell = sheet.getRangeByIndexes(6, 1, 1, 1);
    operatorCell.format.fill.color = '#EBF5FF';
    operatorCell.format.font.bold = true;
    operatorCell.format.font.size = 18;
    operatorCell.format.font.color = '#0078D4';
    operatorCell.format.borders.getItem('EdgeLeft').style = Excel.BorderLineStyle.continuous;
    operatorCell.format.borders.getItem('EdgeLeft').color = '#0078D4';
    operatorCell.format.borders.getItem('EdgeLeft').weight = Excel.BorderWeight.thick;

    // 配置区行间细线
    for (let r = 3; r <= 5; r++) {
      const row = sheet.getRangeByIndexes(r, 0, 1, 2);
      row.format.borders.getItem('EdgeBottom').style = Excel.BorderLineStyle.continuous;
      row.format.borders.getItem('EdgeBottom').color = '#F0F0F0';
    }

    // ── 3. 分隔空行 A8 ──
    sheet.getRangeByIndexes(7, 0, 1, 2).format.rowHeight = 6;

    // ── 4. 状态结果区 A9:B10 ──
    sheet.getRangeByIndexes(8, 0, 2, 2).values = [
      ['#工作状态#', ''],
      ['#导出结果#', ''],
    ];
    sheet.getRangeByIndexes(8, 0, 1, 1).format.rowHeight = 26;
    sheet.getRangeByIndexes(9, 0, 1, 1).format.rowHeight = 26;

    // 状态标签 A9:A10
    const statusLabels = sheet.getRangeByIndexes(8, 0, 2, 1);
    statusLabels.format.font.color = '#9CA3AF';
    statusLabels.format.font.size = 11;
    statusLabels.format.horizontalAlignment = Excel.HorizontalAlignment.right;
    statusLabels.format.verticalAlignment = Excel.VerticalAlignment.center;
    statusLabels.format.fill.color = '#FAFAFA';

    // 状态值 B9:B10
    const statusVals = sheet.getRangeByIndexes(8, 1, 2, 1);
    statusVals.format.font.size = 11;
    statusVals.format.font.color = '#6B7280';
    statusVals.format.horizontalAlignment = Excel.HorizontalAlignment.left;
    statusVals.format.verticalAlignment = Excel.VerticalAlignment.center;
    statusVals.format.indentLevel = 1;

    // 状态区顶部细线
    sheet.getRangeByIndexes(8, 0, 1, 2).format.borders.getItem('EdgeTop').style = Excel.BorderLineStyle.continuous;
    sheet.getRangeByIndexes(8, 0, 1, 2).format.borders.getItem('EdgeTop').color = '#E5E7EB';

    // 状态区行间细线
    sheet.getRangeByIndexes(8, 0, 1, 2).format.borders.getItem('EdgeBottom').style = Excel.BorderLineStyle.continuous;
    sheet.getRangeByIndexes(8, 0, 1, 2).format.borders.getItem('EdgeBottom').color = '#F0F0F0';

    // ── 5. 整体卡片边框 (A3:B10) ──
    const card = sheet.getRangeByIndexes(2, 0, 8, 2);
    for (const edge of ['EdgeTop', 'EdgeBottom', 'EdgeLeft', 'EdgeRight']) {
      const border = card.format.borders.getItem(edge as Excel.BorderIndex);
      border.style = Excel.BorderLineStyle.continuous;
      border.color = '#E5E7EB';
    }

    // ── 6. 数据验证: 输出版本下拉 ──
    const versionNames = data.versions.map(v => v.name).join(',');
    if (versionNames) {
      versionCell.dataValidation.rule = {
        list: { inCellDropDown: true, source: versionNames },
      };
    }

    // ── 7. 数据验证: 操作人下拉 ──
    const staffNames = data.staff.map(s => s.name).join(',');
    if (staffNames) {
      operatorCell.dataValidation.rule = {
        list: { inCellDropDown: true, source: staffNames },
      };
    }

    // ── 8. 状态区也禁止手动编辑 ──
    for (let r = 8; r <= 9; r++) {
      const cell = sheet.getRangeByIndexes(r, 1, 1, 1);
      cell.dataValidation.rule = { custom: { formula: '=FALSE' } };
      cell.dataValidation.errorAlert = {
        showAlert: true,
        title: '禁止修改',
        message: '此字段由系统自动更新。',
        style: Excel.DataValidationAlertStyle.stop,
      };
    }
  }

  /**
   * 确保已有工作簿包含协同导出区域（迁移方法）
   * 如果 A3 不是 #协同导出#，自动补写
   */
  static async ensureCollabArea(context: Excel.RequestContext): Promise<void> {
    const sheet = context.workbook.worksheets.getItemOrNullObject(SHEET_CONFIG);
    sheet.load('isNullObject');
    await context.sync();
    if (sheet.isNullObject) return;

    const a3 = sheet.getRange('A3');
    a3.load('values');
    await context.sync();

    if (String(a3.values[0][0]).trim() === '#协同导出#') return;

    // 需要迁移：读取当前配置写入协同区域
    const data = await this.load(context);
    if (!data) return;

    this.writeCollabArea(sheet, data);

    // 确保表可见
    sheet.visibility = Excel.SheetVisibility.visible;
    await context.sync();
    logger.info('已迁移: 补写协同导出区域到 StudioConfig');
  }

  /**
   * 行号映射 (0-indexed):
   *   Row 0-1: A1 JSON + 空行 (隐藏)
   *   Row 2:   #协同导出# 标题
   *   Row 3:   #输出版本#   B: 版本名
   *   Row 4:   #输出版本号# B: 版本号
   *   Row 5:   #序列号#     B: 序列号
   *   Row 6:   #操作人#     B: 操作人 (触发)
   *   Row 7:   空行分隔
   *   Row 8:   #工作状态#   B: 状态
   *   Row 9:   #导出结果#   B: 结果
   */
  private static readonly ROW = {
    VERSION: 3,
    VERSION_NUM: 4,
    SEQUENCE: 5,
    OPERATOR: 6,
    STATUS: 8,
    RESULT: 9,
  };

  /**
   * 读取协同导出配置
   */
  static async readCollabConfig(context: Excel.RequestContext): Promise<CollabConfig | null> {
    const sheet = context.workbook.worksheets.getItemOrNullObject(SHEET_CONFIG);
    sheet.load('isNullObject');
    await context.sync();
    if (sheet.isNullObject) return null;

    // 读取 A3:B10 (row 2~9, 共 8 行)
    const range = sheet.getRangeByIndexes(2, 0, 8, 2);
    range.load('values');
    await context.sync();

    const v = range.values;
    // 验证区域标记
    if (String(v[0][0]).trim() !== '#协同导出#') return null;

    return {
      version: String(v[1][1] ?? ''),         // Row 3: #输出版本#
      versionNumber: Number(v[2][1]) || 0,    // Row 4: #输出版本号#
      sequence: Number(v[3][1]) || 0,         // Row 5: #序列号#
      operator: String(v[4][1] ?? '').trim(),  // Row 6: #操作人#
      workStatus: String(v[6][1] ?? ''),       // Row 8: #工作状态#
      exportResult: String(v[7][1] ?? ''),     // Row 9: #导出结果#
    };
  }

  /**
   * 回写协同导出状态和结果，并可选清空操作人
   */
  static async writeCollabStatus(
    context: Excel.RequestContext,
    status: string,
    result: string,
    clearOperator = true
  ): Promise<void> {
    const sheet = context.workbook.worksheets.getItemOrNullObject(SHEET_CONFIG);
    sheet.load('isNullObject');
    await context.sync();
    if (sheet.isNullObject) return;

    const R = this.ROW;
    if (clearOperator) {
      sheet.getRangeByIndexes(R.OPERATOR, 1, 1, 1).values = [['']];
    }
    sheet.getRangeByIndexes(R.STATUS, 1, 1, 1).values = [[status]];
    sheet.getRangeByIndexes(R.RESULT, 1, 1, 1).values = [[result]];
    await context.sync();
  }

  /**
   * 更新协同区域的单个字段
   */
  static async writeCollabField(
    context: Excel.RequestContext,
    field: '操作人' | '工作状态' | '导出结果',
    value: string
  ): Promise<void> {
    const sheet = context.workbook.worksheets.getItemOrNullObject(SHEET_CONFIG);
    sheet.load('isNullObject');
    await context.sync();
    if (sheet.isNullObject) return;

    const R = this.ROW;
    const rowMap = { '操作人': R.OPERATOR, '工作状态': R.STATUS, '导出结果': R.RESULT };
    sheet.getRangeByIndexes(rowMap[field], 1, 1, 1).values = [[value]];
    await context.sync();
  }
}
