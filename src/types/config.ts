export interface VersionTemplate {
  name: string;
  lineId: number;
  lineField: string;
  gitDirectory?: string;
  /** 渠道目录名，默认与渠道名相同，用于 git 目录模板的 {1} 替换 */
  channelDirectory?: string;
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
}

export interface Config {
  versionTemplates: Map<string, VersionTemplate>;
  lineTemplates: Map<number, LineTemplate>;
  tablesToProcess: Map<string, TableInfo>;
  outputSettings: OutputSettings;
  gitDirectory: string;
  gitCommitTemplate: string;
  operator: string;
  staffCodes: Map<string, StaffInfo>;
  switches: Record<string, boolean>;
}
