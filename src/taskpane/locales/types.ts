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
    diff: {
      added: (n: number) => string;
      removed: (n: number) => string;
      modified: (n: number) => string;
      truncated: (shown: number, total: number) => string;
      newRow: string;
      removedRow: string;
    };
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
    syncingRoutes: string;
    addVersion: string;
    // TablesSubPage
    tablesSectionTitle: string;
    searchPlaceholder: string;
    colChineseName: string;
    colEnglishName: string;
    colTableVersion: string;
    colControl: string;
    tableSummary: (filtered: number, total: number) => string;
    // WizardSubPage
    wizardTitle: string;
    wizardChineseName: string;
    wizardEnglishName: string;
    wizardStartVersion: string;
    wizardIncludeVersionC: string;
    wizardAutoRegister: string;
    wizardCreateBtn: string;
    wizardCreatingBtn: string;
    // Hints
    addVersionHint: string;
    gitDirPlaceholder: string;
    versionNamePlaceholder: string;
    // Status messages
    statusGitDirRequired: string;
    statusVersionAdded: (name: string, field: string) => string;
    statusVersionDeleted: (name: string) => string;
    statusSyncResult: (synced: number) => string;
    statusTableCreated: (name: string) => string;
    variableHint: string;
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
    ruleLabels: readonly string[];
    validatingProgress: string;
    passedMessage: string;
  };

  // --- PreviewPanel ---
  preview: {
    title: string;
    runBtn: (n: number) => string;
    runningBtn: string;
    colHeaders: readonly [string, string, string];
    statsTitle: string;
    legendExcluded: string;
    emptyHint: string;
  };

  // --- Setup (uninitialized workbook) ---
  setup: {
    description: string;
    initBtn: string;
    initializingBtn: string;
  };

  // --- CommitHistoryPanel ---
  commitHistory: {
    title: string;
    loading: string;
    empty: string;
    rollbackBtn: string;
    confirmTitle: string;
    confirmMessage: (hash: string) => string;
    confirmBtn: string;
    cancelBtn: string;
    rolling: string;
    rollbackSuccess: string;
    rollbackFail: string;
    serverError: string;
  };

  // --- HelpPanel ---
  help: {
    quickStart: { title: string; body: string };
    exportSection: { title: string; flow: string; outputDir: string; git: string };
    collab: { title: string; howItWorks: string; monitor: string };
    manageSection: { title: string; config: string; tableManage: string; newTable: string };
    validateSection: { title: string; intro: string };
    previewSection: { title: string; preview: string; highlight: string };
    structure: { title: string; layout: string; fields: string; versionRange: string; routes: string };
    /** 通用术语：组件内的关键词替换 */
    terms: {
      table: string;        // 表 → 设备
      version: string;      // 版本 → 航线
      versionNumber: string; // 版本号 → 航线编号
      route: string;        // 线路 → 航段
      operator: string;     // 操作员 → 舰长
      export: string;       // 导出 → 发射
      validate: string;     // 校验 → 维修/检修
      preview: string;      // 预览 → 试飞
      git: string;          // Git → 星际传送
      outputDir: string;    // 导出目录 → 着陆坐标
    };
  };
}
