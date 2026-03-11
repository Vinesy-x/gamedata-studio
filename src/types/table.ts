import { ExportError } from './errors';

export type CellValue = string | number | boolean | null;

export interface InMemoryTableData {
  sourceSheetName: string;
  mainData: CellValue[][];
  versionRowData: CellValue[][] | null;
  versionColData: CellValue[][] | null;
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

export interface ExportResult {
  success: boolean;
  modifiedFiles: string[];
  errors: ExportError[];
  duration: number;
  totalTables: number;
  changedTables: number;
}

export interface ExportProgress {
  step: number;
  totalSteps: number;
  message: string;
  tableName?: string;
}
