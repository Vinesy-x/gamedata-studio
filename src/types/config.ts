export interface VersionTemplate {
  name: string;
  lineId: number;
  lineField: string;
  gitDirectory: string;
}

export interface LineTemplate {
  id: number;
  field: string;
  remark: string;
}

export interface TableInfo {
  chineseName: string;
  englishName: string;
  shouldOutput: boolean;
  versionRange: string;
}

export interface OutputSettings {
  versionName: string;
  versionNumber: number;
  versionSequence: number;
  outputDirectory: string;
}

export interface StaffInfo {
  id: number;
  name: string;
  code: string;
  machineCode: string;
}

export interface Config {
  versionTemplates: Map<string, VersionTemplate>;
  lineTemplates: Map<number, LineTemplate>;
  tablesToProcess: Map<string, TableInfo>;
  outputSettings: OutputSettings;
  gitCommitTemplate: string;
  staffCodes: Map<string, StaffInfo>;
  showResourcePopup: boolean;
  detailedDiff: boolean;
}
