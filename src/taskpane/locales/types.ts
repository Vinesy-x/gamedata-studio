/**
 * ThemeTextMap — 主题文本字典类型
 *
 * 每个主题需要提供一套完整的文本映射。
 * 新增主题只需创建一个实现此接口的文件。
 */
export interface ThemeTextMap {
  // --- Tabs ---
  tabExport: string;
  tabManage: string;
  tabValidate: string;
  tabPreview: string;

  // --- ExportTab ---
  export: {
    sectionTitle: string;
    exportBtn: string;
    exportingBtn: string;
    disabledBtn: string;
    gitBtn: string;
    gitFailBtn: string;
    resultSuccess: string;
    resultNoChange: string;
    resultFail: string;
    statFiles: (n: number) => string;
    statWarnings: (n: number) => string;
    statErrors: (n: number) => string;
    config: {
      version: string;
      versionNumber: string;
      sequence: string;
      operator: string;
      monitor: string;
      outputDir: string;
      noOutputDir: string;
      monitoring: string;
      monitorExporting: string;
      monitorOff: string;
    };
  };

  // --- ManageTab ---
  manage: {
    subNav: readonly [string, string, string];
    sectionTitle: string;
    operator: string;
    gitTemplate: string;
    staff: string;
    versionListTitle: (n: number) => string;
    colVersion: string;
    colRoute: string;
    colGitDir: string;
    syncRoutes: string;
    addVersion: string;
  };

  // --- ValidationPanel ---
  validate: {
    title: string;
    scope: readonly [string, string];
    selectAll: string;
    deselectAll: string;
    runBtn: string;
    runningBtn: string;
    emptyHint: string;
  };

  // --- PreviewPanel ---
  preview: {
    title: string;
    runBtn: (n: number) => string;
    runningBtn: string;
    colHeaders: readonly [string, string, string];
    statsTitle: string;
    emptyHint: string;
  };
}
