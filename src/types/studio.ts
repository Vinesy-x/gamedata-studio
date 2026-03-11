import { ExportResult } from './table';
import { ExportError } from './errors';

/** v2.0 Studio 控制面板状态 */
export interface StudioState {
  // 导出配置（替代「表格输出」中的标记单元格）
  outputVersion: string;
  outputVersionNumber: number;
  versionSequence: number;
  operator: string;
  selectedTables: Set<string>;

  // 运行状态
  status: 'idle' | 'exporting' | 'uploading' | 'error';
  statusMessage: string;
  progress: number;

  // 结果
  lastExportResult: ExportResult | null;

  // 错误
  errorLogs: ExportError[];
}

/** 新表创建配置 */
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

/** 未注册表信息 */
export interface UnregisteredTable {
  sheetName: string;
  hasConfigMarker: boolean;
}

/** 管理面板子页面 */
export type ManageSubPage = 'config' | 'tables' | 'wizard';
