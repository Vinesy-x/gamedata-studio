import { ExportError } from './errors';

export type CellValue = string | number | boolean | null;

export interface InMemoryTableData {
  sourceSheetName: string;
  mainData: CellValue[][];
  versionRowData: CellValue[][] | null;
  versionColData: CellValue[][] | null;
  /** version_c 各行的左侧标签（用于识别 roads_0/roads_X） */
  versionColLabels: CellValue[] | null;
  hasVersionRowFlag: boolean;
  hasVersionColFlag: boolean;
}

export interface FilteredResult {
  data: CellValue[][];
  rowCount: number;
  colCount: number;
  shouldOutput: boolean;
}

export interface GitEnvironment {
  available: boolean;
  repoRoot?: string;
  reason?: string;
  errorCode?: number;
}

export interface TableDiff {
  tableName: string;       // English name
  chineseName: string;     // Chinese name
  totalRows: number;       // rows in current export
  previousRows: number;    // rows in previous export (0 if new)
  status: 'new' | 'modified' | 'unchanged';
}

export interface ExportResult {
  success: boolean;
  modifiedFiles: string[];
  errors: ExportError[];
  duration: number;
  totalTables: number;
  changedTables: number;
  tableDiffs: TableDiff[];
}

export interface ExportProgress {
  step: number;
  totalSteps: number;
  message: string;
  tableName?: string;
}
