/* global Excel */

/**
 * v3.0 数据校验引擎
 *
 * 对选中的数据表执行 7 条校验规则，返回校验结果列表。
 * 复用 v1.0 的 VersionFilter 解析版本区间，
 * 使用 excelHelper 加载表数据。
 */

import { VersionFilter } from '../engine/VersionFilter';
import { excelHelper, SheetData, isExcelError } from '../utils/ExcelHelper';
import { ValidationResult, TableValidationData } from '../types/validation';
import { ValidationConfig, TypeDelimiterConfig } from '../v2/StudioConfigStore';
import { logger } from '../utils/Logger';

export class ValidationEngine {
  private versionFilter: VersionFilter;
  private validationConfig?: ValidationConfig;

  constructor(versionFilter: VersionFilter, validationConfig?: ValidationConfig) {
    this.versionFilter = versionFilter;
    this.validationConfig = validationConfig;
  }

  // ──────────── 公开接口 ────────────

  /**
   * 运行全部规则校验
   * 仅手动触发（点击「校验」按钮）
   */
  async runValidation(tableNames: Set<string>): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];

    // Batch load all tables in a single Excel.run to reduce context switching overhead
    const dataMap = await this.loadAllTableData(tableNames);

    for (const tableName of tableNames) {
      const data = dataMap.get(tableName);
      if (!data) continue;

      results.push(...this.validateExcelErrors(tableName, data));
      results.push(...this.validateVersionFormat(tableName, data));
      // 规则2+3 合并为单次遍历
      results.push(...this.validateDataTypesAndArrayFormats(tableName, data, true, true));
      // 规则4+5 共享分组
      results.push(...this.validateVersionCoverageAndOrder(tableName, data));
      results.push(...this.validateRequiredFields(tableName, data));
      results.push(...this.validateRoadsConsistency(tableName, data));
    }

    return results;
  }

  // ──────────── Excel 错误值校验 ────────────

  /**
   * 规则0：Excel 错误值检查
   * 检测数据区域中的 #REF!, #N/A 等引用错误
   */
  validateExcelErrors(tableName: string, data: TableValidationData): ValidationResult[] {
    const results: ValidationResult[] = [];

    // 检查数据区域
    for (let row = 0; row < data.dataValues.length; row++) {
      for (let col = 0; col < data.dataValues[row].length; col++) {
        const value = data.dataValues[row][col];
        if (isExcelError(value)) {
          results.push({
            severity: 'error',
            ruleName: '数据类型',
            tableName,
            location: {
              sheetName: tableName,
              row: data.dataRowStart + row,
              column: data.dataColStart + col,
            },
            message: `单元格包含 Excel 错误值「${value}」`,
          });
        }
      }
    }

    // 检查版本区间列
    for (let i = 0; i < data.versionValues.length; i++) {
      if (isExcelError(data.versionValues[i])) {
        results.push({
          severity: 'error',
          ruleName: '版本区间格式',
          tableName,
          location: { sheetName: tableName, row: data.versionRowStart + i, column: data.versionColStart },
          message: `版本区间单元格包含 Excel 错误值「${data.versionValues[i]}」`,
        });
      }
    }

    return results;
  }

  // ──────────── 格式校验 ────────────

  /**
   * 规则1：版本区间格式检查
   * 检测横线（应用波浪号~）、解析失败等情况
   */
  validateVersionFormat(tableName: string, data: TableValidationData): ValidationResult[] {
    const results: ValidationResult[] = [];

    // 行版本区间校验（A列，从数据行开始，跳过 version_r 和描述行）
    for (let i = 2; i < data.versionValues.length; i++) {
      const value = String(data.versionValues[i] ?? '');
      if (value === '') continue;

      const validation = this.versionFilter.validateRangeFormat(value);
      if (!validation.valid) {
        results.push({
          severity: 'error',
          ruleName: validation.errorCode === 2101 ? '版本区间分隔符' : '版本区间格式',
          tableName,
          location: { sheetName: tableName, row: data.versionRowStart + i, column: data.versionColStart },
          message: validation.message || `行版本区间 "${value}" 格式无效`,
        });
      }
    }

    // 列版本区间校验（version_c 行，仅在有 version_c 时）
    if (data.versionCValues && data.versionCRowStart != null) {
      for (let c = 0; c < data.versionCValues.length; c++) {
        const value = data.versionCValues[c];
        if (value === '') continue;

        const validation = this.versionFilter.validateRangeFormat(value);
        if (!validation.valid) {
          results.push({
            severity: 'error',
            ruleName: validation.errorCode === 2101 ? '版本区间分隔符' : '版本区间格式',
            tableName,
            location: { sheetName: tableName, row: data.versionCRowStart, column: data.dataColStart + c },
            message: validation.message || `列版本区间 "${value}" 格式无效`,
          });
        }
      }
    }

    return results;
  }

  /**
   * 规则2：数据类型匹配检查
   * 按字段定义的类型（int/float/string/int[]/int[][]）校验数据值
   */
  validateDataTypes(tableName: string, data: TableValidationData): ValidationResult[] {
    return this.validateDataTypesAndArrayFormats(tableName, data, true, false);
  }

  /**
   * 获取类型的分隔符配置
   */
  private getDelimiters(type: string): TypeDelimiterConfig | undefined {
    return this.validationConfig?.typeDelimiters?.[type];
  }

  /**
   * 类型检查辅助方法
   * 返回错误描述，null 表示通过
   */
  checkType(value: string, type: string): string | null {
    // 基础类型
    if (type === 'int') {
      return /^-?\d+$/.test(value) ? null : '不是有效整数';
    }
    if (type === 'float') {
      return isNaN(Number(value)) ? '不是有效数字' : null;
    }

    // 一维数组类型 (int[], float[], string[])
    if (type.endsWith('[]') && !type.endsWith('[][]')) {
      const baseType = type.slice(0, -2); // "int", "float", "string"
      const delim = this.getDelimiters(type);
      const sep = delim?.primary || '|';

      if (baseType === 'string') return null; // string[] 只检查分隔符存在性

      const parts = value.split(sep);
      for (const part of parts) {
        const trimmed = part.trim();
        if (trimmed === '') continue;
        if (baseType === 'int' && !/^-?\d+$/.test(trimmed)) {
          return `格式应为 N${sep}N${sep}N（分隔符: ${sep}）`;
        }
        if (baseType === 'float' && isNaN(Number(trimmed))) {
          return `格式应为 N${sep}N${sep}N（分隔符: ${sep}）`;
        }
      }
      // 检查是否误用了其他分隔符
      if (sep !== ',' && value.includes(',') && !value.includes(sep)) {
        return `使用了逗号分隔，应使用 "${sep}" 分隔`;
      }
      return null;
    }

    // 二维数组类型 (int[][], float[][], string[][])
    if (type.endsWith('[][]')) {
      const baseType = type.slice(0, -4);
      const delim = this.getDelimiters(type);
      const sep1 = delim?.primary || '|';
      const sep2 = delim?.secondary || ';';

      if (baseType === 'string') return null;

      const groups = value.split(sep2);
      for (const group of groups) {
        const parts = group.split(sep1);
        for (const part of parts) {
          const trimmed = part.trim();
          if (trimmed === '') continue;
          if (baseType === 'int' && !/^-?\d+$/.test(trimmed)) {
            return `格式应为 N${sep1}N${sep2}N${sep1}N（一维: ${sep1}, 二维: ${sep2}）`;
          }
          if (baseType === 'float' && isNaN(Number(trimmed))) {
            return `格式应为 N${sep1}N${sep2}N${sep1}N（一维: ${sep1}, 二维: ${sep2}）`;
          }
        }
      }
      return null;
    }

    return null; // 未知类型不做校验
  }

  /**
   * 规则3：数组分隔符检查
   * 数组类型字段中使用逗号分隔的，应改用 | 和 ;
   */
  validateArrayFormats(tableName: string, data: TableValidationData): ValidationResult[] {
    return this.validateDataTypesAndArrayFormats(tableName, data, false, true);
  }

  /**
   * 合并执行数据类型和数组分隔符检查（单次遍历）
   */
  private validateDataTypesAndArrayFormats(
    tableName: string,
    data: TableValidationData,
    checkTypes: boolean,
    checkArraySep: boolean
  ): ValidationResult[] {
    const results: ValidationResult[] = [];

    for (let col = 0; col < data.fieldTypes.length; col++) {
      const expectedType = data.fieldTypes[col];
      if (!expectedType) continue;

      const isArray = expectedType.includes('[]');

      for (let row = 0; row < data.dataValues.length; row++) {
        const value = data.dataValues[row][col];
        if (value === '' || value === null || value === undefined) continue;
        const strValue = String(value);

        // 数据类型检查
        if (checkTypes) {
          const error = this.checkType(strValue, expectedType);
          if (error) {
            results.push({
              severity: 'warning',
              ruleName: '数据类型',
              tableName,
              location: { sheetName: tableName, row: data.dataRowStart + row, column: data.dataColStart + col },
              message: `字段 "${data.fieldNames[col]}" 定义为 ${expectedType}，但值 "${value}" ${error}`,
            });
          }
        }

        // 数组分隔符检查
        if (checkArraySep && isArray) {
          if (strValue.includes(',') && !strValue.includes('|')) {
            results.push({
              severity: 'warning',
              ruleName: '数组分隔符',
              tableName,
              location: { sheetName: tableName, row: data.dataRowStart + row, column: data.dataColStart + col },
              message: `字段 "${data.fieldNames[col]}" 使用了逗号分隔，应使用 | 和 ; 分隔`,
            });
          }
        }
      }
    }
    return results;
  }

  // ──────────── 逻辑校验 ────────────

  /**
   * 规则4：版本覆盖完整性检查（独立入口，供测试调用）
   */
  validateVersionCoverage(tableName: string, data: TableValidationData): ValidationResult[] {
    return this.validateVersionCoverageAndOrder(tableName, data).filter(
      r => r.ruleName === '版本覆盖完整性'
    );
  }

  /**
   * 规则5：同Key版本顺序检查（独立入口，供测试调用）
   */
  validateKeyVersionOrder(tableName: string, data: TableValidationData): ValidationResult[] {
    return this.validateVersionCoverageAndOrder(tableName, data).filter(
      r => r.ruleName === '同Key版本顺序'
    );
  }

  /**
   * 规则4+5 合并：单次分组 + 单次 parseRange，同时检查覆盖完整性和版本顺序
   */
  private validateVersionCoverageAndOrder(tableName: string, data: TableValidationData): ValidationResult[] {
    const results: ValidationResult[] = [];
    const targetRoadIdx = this.resolveTargetRoadIdx(data);

    // 单次遍历构建分组，同时解析版本区间
    const keyGroups = new Map<string, { row: number; min: number; max: number }[]>();

    for (let i = 0; i < data.dataValues.length; i++) {
      if (!this.isRowInScope(data, i, targetRoadIdx)) continue;
      const key = String(data.dataValues[i][0] ?? '');
      if (!key) continue;
      const verStr = String(data.versionValues[i + 2] ?? '');
      const parsed = this.versionFilter.parseRange(verStr);
      if (!parsed) continue;
      if (!keyGroups.has(key)) keyGroups.set(key, []);
      keyGroups.get(key)!.push({ row: data.dataRowStart + i, min: parsed.min, max: parsed.max });
    }

    for (const [key, rows] of keyGroups) {
      if (rows.length <= 1) continue;

      // 规则5：检查原始顺序是否递增
      for (let i = 1; i < rows.length; i++) {
        if (rows[i].min < rows[i - 1].min) {
          results.push({
            severity: 'warning',
            ruleName: '同Key版本顺序',
            tableName,
            location: { sheetName: tableName, row: rows[i].row, column: data.versionColStart },
            message: `Key=${key} 第 ${rows[i].row} 行的版本号比第 ${rows[i - 1].row} 行小，简写模式下可能导致覆盖逻辑异常`,
          });
        }
      }

      // 规则4：按版本号排序后检查间隙
      const sorted = [...rows].sort((a, b) => a.min - b.min);
      for (let i = 1; i < sorted.length; i++) {
        if (sorted[i].min > sorted[i - 1].max) {
          results.push({
            severity: 'error',
            ruleName: '版本覆盖完整性',
            tableName,
            location: { sheetName: tableName, row: sorted[i].row, column: data.versionColStart },
            message: `Key=${key} 在版本 ${sorted[i - 1].max}~${sorted[i].min} 之间无配置数据，导出该区间版本时此 Key 将不存在`,
          });
        }
      }
    }
    return results;
  }

  /**
   * 规则6：必填字段检查
   * 数据区域空单元格（severity 为 warning）
   */
  validateRequiredFields(tableName: string, data: TableValidationData): ValidationResult[] {
    const results: ValidationResult[] = [];
    for (let row = 0; row < data.dataValues.length; row++) {
      for (let col = 0; col < data.dataValues[row].length; col++) {
        const value = data.dataValues[row][col];
        if (value === '' || value === null || value === undefined) {
          results.push({
            severity: 'warning',
            ruleName: '必填字段',
            tableName,
            location: {
              sheetName: tableName,
              row: data.dataRowStart + row,
              column: data.dataColStart + col,
            },
            message: `第 ${data.dataRowStart + row} 行 "${data.fieldNames[col] ?? ''}" 字段为空`,
          });
        }
      }
    }
    return results;
  }

  /**
   * 规则7：Roads 一致性检查
   * roads_0=0 但 roads_N=1 的矛盾（总线路禁用但子线路启用）
   */
  validateRoadsConsistency(tableName: string, data: TableValidationData): ValidationResult[] {
    const results: ValidationResult[] = [];
    for (let i = 0; i < data.roadsValues.length; i++) {
      const roads = data.roadsValues[i];
      if (!roads || roads.length === 0) continue;
      const roads0 = String(roads[0]);
      if (roads0 === '0' || roads0 === '') {
        for (let j = 1; j < roads.length; j++) {
          if (String(roads[j]) === '1') {
            results.push({
              severity: 'warning',
              ruleName: 'Roads一致性',
              tableName,
              location: { sheetName: tableName, row: data.versionRowStart + i + 2, column: data.versionColStart + 1 },
              message: `第 ${data.versionRowStart + i + 2} 行 roads_0=0（总线路禁用），但 roads_${j}=1，该行在所有版本中都不会导出`,
            });
            break; // 每行只报一次
          }
        }
      }
    }
    return results;
  }

  // ──────────── 行筛选（与导出逻辑对齐） ────────────

  /**
   * 判断数据行是否在当前导出 roads 范围内
   * 不做版本区间筛选，因为覆盖完整性和顺序检查是跨版本的全局校验
   * @param data 校验数据
   * @param dataIndex 数据行索引（0-based，对应 dataValues）
   * @param targetRoadIdx 目标线路在 roadsValues 中的列索引（-1 表示无需检查）
   */
  private isRowInScope(data: TableValidationData, dataIndex: number, targetRoadIdx: number): boolean {
    // roadsValues 前 2 项是表头行，数据对应 roadsValues[dataIndex + 2]
    const roads = data.roadsValues[dataIndex + 2];
    if (roads && roads.length > 0) {
      // roads_0（总线路）检查，使用 isLineValuePassed 支持版本区间值
      if (!this.versionFilter.isLineValuePassed(roads[0])) return false;

      // 目标线路检查
      if (targetRoadIdx >= 0 && roads[targetRoadIdx] !== undefined) {
        if (!this.versionFilter.isLineValuePassed(roads[targetRoadIdx])) return false;
      }
    }

    return true;
  }

  /** 从 roadsValues 表头行查找目标线路列索引（调用方缓存结果） */
  private resolveTargetRoadIdx(data: TableValidationData): number {
    const targetField = this.versionFilter.getTargetLineField();
    if (targetField === 'roads_0') return -1;
    const headerRoads = data.roadsValues[0];
    return headerRoads ? headerRoads.indexOf(targetField) : -1;
  }

  // ──────────── 数据加载 ────────────

  /**
   * 批量加载多表的校验数据（单次 Excel.run）
   * 避免每张表各开一次 Excel.run，减少上下文切换开销
   */
  async loadAllTableData(tableNames: Set<string>): Promise<Map<string, TableValidationData>> {
    const dataMap = new Map<string, TableValidationData>();

    await Excel.run(async (context) => {
      for (const tableName of tableNames) {
        const snap = await excelHelper.loadSheetSnapshot(context, tableName);
        if (!snap || snap.values.length === 0) {
          logger.warn(`校验：找不到工作表「${tableName}」或数据为空`);
          continue;
        }

        const data = this.parseValidationData(snap.values, tableName, snap.startRow, snap.startCol);
        if (data) dataMap.set(tableName, data);
      }
    });

    return dataMap;
  }

  /**
   * 加载单表的校验数据
   * 从 Excel 工作表中读取并解析出校验所需的结构化数据
   */
  async loadTableData(tableName: string): Promise<TableValidationData | null> {
    let result: TableValidationData | null = null;

    await Excel.run(async (context) => {
      const snap = await excelHelper.loadSheetSnapshot(context, tableName);
      if (!snap || snap.values.length === 0) {
        logger.warn(`校验：找不到工作表「${tableName}」或数据为空`);
        return;
      }

      result = this.parseValidationData(snap.values, tableName, snap.startRow, snap.startCol);
    });

    return result;
  }

  /**
   * 从内存数据中解析校验所需的结构化数据
   * 可直接在测试中调用（不依赖 Excel.run）
   */
  parseValidationData(
    allValues: SheetData,
    tableName: string,
    startRow: number = 0,
    startCol: number = 0
  ): TableValidationData | null {
    // 定位 version_r 标记
    const versionRPos = excelHelper.findMarkerInData(allValues, 'version_r');
    if (!versionRPos) {
      logger.warn(`校验：工作表「${tableName}」找不到 version_r 标记`);
      return null;
    }

    // 定位 #配置区域# 标记（在 version_r 所在行）
    const configAreaPos = excelHelper.findMarkerInData(allValues, '#配置区域#');
    if (!configAreaPos) {
      logger.warn(`校验：工作表「${tableName}」找不到 #配置区域# 标记`);
      return null;
    }

    const versionRRow = versionRPos.row;        // 0-indexed in allValues
    const configAreaCol = configAreaPos.col;     // 0-indexed in allValues
    const dataStartCol = configAreaCol + 1;      // 数据区域起始列（0-indexed）

    // 定位 version_c（可选，在 version_r 上方）
    const versionCPos = excelHelper.findMarkerInData(allValues, 'version_c');

    // version_r 所在行号（1-indexed，用于结果定位）
    const versionRowStart = versionRRow + 1 + startRow;
    // 数据从 version_r + 2 行开始（跳过字段定义行和中文描述行）
    const dataRowStart = versionRowStart + 2;
    // 数据列起始（1-indexed）
    const dataColStart = dataStartCol + 1 + startCol;

    // 确定数据区域的实际行范围（到首列空单元格为止，与导出逻辑一致）
    // version_r 行 + 字段定义行 + 描述行 = 表头，之后为数据行
    const dataRowOffset = versionRRow + 2;
    let dataEndRow = dataRowOffset;
    for (let r = dataRowOffset; r < allValues.length; r++) {
      const firstCell = allValues[r]?.[dataStartCol];
      if (firstCell == null || String(firstCell).trim() === '') break;
      dataEndRow = r + 1;
    }
    // 表头行（version_r、字段定义、描述）始终包含
    const endRow = Math.max(dataEndRow, dataRowOffset);

    // 提取 A 列版本区间值（从 version_r 行到数据结束行）
    const versionValues: string[] = [];
    for (let r = versionRRow; r < endRow; r++) {
      versionValues.push(String(allValues[r]?.[0] ?? ''));
    }

    // 提取 roads 值（version_r 行到数据结束行，B 列到 #配置区域# 前的列）
    const roadsValues: string[][] = [];
    for (let r = versionRRow; r < endRow; r++) {
      const roads: string[] = [];
      for (let c = 1; c < configAreaCol; c++) {
        roads.push(String(allValues[r]?.[c] ?? ''));
      }
      roadsValues.push(roads);
    }

    // 确定数据区域的实际列范围（version_r 行字段头遇到空单元格即停止）
    const rawTotalCols = allValues[versionRRow]?.length ?? 0;
    let dataEndCol = dataStartCol;
    for (let c = dataStartCol; c < rawTotalCols; c++) {
      const header = String(allValues[versionRRow][c] ?? '').trim();
      if (header === '') break;
      dataEndCol = c + 1;
    }

    // 提取字段名和字段类型（从 version_r 行的数据列读取）
    const fieldNames: string[] = [];
    const fieldTypes: string[] = [];
    for (let c = dataStartCol; c < dataEndCol; c++) {
      const raw = String(allValues[versionRRow][c] ?? '');
      const eqIdx = raw.indexOf('=');
      if (eqIdx >= 0) {
        fieldNames.push(raw.substring(0, eqIdx));
        fieldTypes.push(raw.substring(eqIdx + 1));
      } else {
        fieldNames.push(raw);
        fieldTypes.push('');
      }
    }

    // 提取数据区域值（从 version_r + 2 行到数据结束行，列范围到 dataEndCol）
    const dataValues: (string | number | boolean | null)[][] = [];
    for (let r = dataRowOffset; r < endRow; r++) {
      const row: (string | number | boolean | null)[] = [];
      for (let c = dataStartCol; c < dataEndCol; c++) {
        row.push(allValues[r]?.[c] ?? null);
      }
      dataValues.push(row);
    }

    // 提取 version_c 列版本区间值（可选）
    let versionCValues: string[] | undefined;
    let versionCRowStart: number | undefined;
    if (versionCPos && versionCPos.row < versionRRow) {
      versionCRowStart = versionCPos.row + 1 + startRow; // 1-indexed
      versionCValues = [];
      for (let c = dataStartCol; c < dataEndCol; c++) {
        versionCValues.push(String(allValues[versionCPos.row]?.[c] ?? ''));
      }
    }

    return {
      versionRowStart,
      dataRowStart,
      dataColStart: dataStartCol + 1 + startCol, // 转为 1-indexed，加上工作表起始列偏移
      versionColStart: 1 + startCol, // 版本区间列（1-indexed）
      versionValues,
      roadsValues,
      fieldNames,
      fieldTypes,
      dataValues,
      versionCValues,
      versionCRowStart,
    };
  }
}
