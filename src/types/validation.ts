/**
 * v3.0 数据校验相关类型定义
 */

/** 校验规则名称 */
export type ValidationRuleName =
  | '版本区间格式'
  | '版本覆盖完整性'
  | '数据类型'
  | '数组分隔符'
  | '同Key版本顺序'
  | '必填字段'
  | 'Roads一致性'
  | '版本区间分隔符'
  | '结果截断';

/** 校验规则配置 */
export interface ValidationRuleConfig {
  name: ValidationRuleName;
  label: string;
  enabled: boolean;
  description: string;
}

/** 校验结果严重程度 */
export type ValidationSeverity = 'error' | 'warning' | 'info';

/** 单元格位置（1-indexed） */
export interface CellLocation {
  sheetName: string;
  row: number;     // 1-indexed
  column: number;  // 1-indexed
}

/** 单条校验结果 */
export interface ValidationResult {
  severity: ValidationSeverity;
  ruleName: ValidationRuleName;
  tableName: string;
  location: CellLocation | null;
  message: string;
}

/** 单表的校验数据（从 Excel 工作表解析得到） */
export interface TableValidationData {
  /** version_r 所在行号（1-indexed） */
  versionRowStart: number;
  /** 第一行数据行号（version_r + 2，跳过描述行） */
  dataRowStart: number;
  /** 第一数据列列号（#配置区域# + 1，1-indexed） */
  dataColStart: number;
  /** A 列版本区间值（从 version_r 行开始） */
  versionValues: string[];
  /** B-J 列 roads 值（每行一个数组） */
  roadsValues: string[][];
  /** 字段名（去掉 =type 后缀） */
  fieldNames: string[];
  /** 字段类型（从字段定义行的 =type 提取） */
  fieldTypes: string[];
  /** 数据区域值（不含表头，从 version_r+2 开始） */
  dataValues: (string | number | boolean | null)[][];
  /** 版本区间列号（1-indexed，通常为 A 列） */
  versionColStart: number;
  /** version_c 列版本区间值（每列一个值，仅在有 version_c 时存在） */
  versionCValues?: string[];
  /** version_c 所在行号（1-indexed，仅在有 version_c 时存在） */
  versionCRowStart?: number;
}
