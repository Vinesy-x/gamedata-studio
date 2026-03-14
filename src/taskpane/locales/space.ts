import type { ThemeTextMap } from './types';

/**
 * 飞船航行主题文本
 *
 * 核心概念映射:
 *   版本(version) → 航线    版本名 → 航线名    版本号 → 航线编号
 *   线路(roads_X) → 航段    序列号 → 航班号
 *   表(table)     → 设备    操作员 → 舰长
 *   导出          → 发射    校验 → 维修    预览 → 试飞
 *   Git           → 星际传送
 */
export const spaceText: ThemeTextMap = {
  tabExport: '发射',
  tabManage: '舰桥',
  tabValidate: '维修',
  tabPreview: '试飞',

  export: {
    sectionTitle: '发射准备',
    exportBtn: '发射！',
    exportingBtn: '发射中...',
    disabledBtn: '请先设定着陆坐标',
    gitBtn: '星际传送',
    gitFailBtn: '传送失败',
    resultSuccess: '航行成功！',
    resultNoChange: '无任何修改',
    resultFail: '发射失败',
    statFiles: (n) => `${n} 个设备`,
    statWarnings: (n) => `${n} 个异常`,
    statErrors: (n) => `${n} 个故障`,
    config: {
      version: '航线',
      versionNumber: '航线编号',
      sequence: '航班号',
      operator: '舰长',
      monitor: '雷达监听',
      outputDir: '着陆坐标',
      noOutputDir: '点击设定着陆坐标',
      monitoring: '扫描中',
      monitorExporting: '协同发射中...',
      monitorOff: '雷达关闭',
    },
  },

  manage: {
    subNav: ['舰桥指挥', '设备库', '组装'],
    sectionTitle: '飞船配置',
    operator: '舰长',
    gitTemplate: '传送协议',
    staff: '船员编制',
    versionListTitle: (n) => `航线列表 (${n})`,
    colVersion: '航线名',
    colRoute: '航段',
    colGitDir: '传送坐标',
    syncRoutes: '同步航段',
    syncingRoutes: '同步中...',
    addVersion: '添加航线',
    tablesSectionTitle: '设备管理',
    searchPlaceholder: '搜索设备...',
    colChineseName: '设备名',
    colEnglishName: '代号',
    colTableVersion: '航线',
    colControl: '控制',
    tableSummary: (f, t) => `共 ${f} 台设备` + (f < t ? ` (筛选自 ${t} 台)` : ''),
    wizardTitle: '设备组装向导',
    wizardChineseName: '设备名称',
    wizardEnglishName: '设备代号',
    wizardStartVersion: '起始航线编号',
    wizardIncludeVersionC: '包含 version_c',
    wizardAutoRegister: '自动注册',
    wizardCreateBtn: '组装设备',
    wizardCreatingBtn: '组装中...',
    addVersionHint: '添加新航线后点击「同步航段」为所有设备补充航段列',
    gitDirPlaceholder: '传送坐标路径（必填）',
    versionNamePlaceholder: '航线名称',
    statusGitDirRequired: '必须配置传送坐标，没有着陆坐标的航线没有意义',
    statusVersionAdded: (name, field) => `已添加航线「${name}」(${field})`,
    statusVersionDeleted: (name) => `已删除航线「${name}」`,
    statusSyncResult: (n) => `航段同步完成: ${n} 台设备已同步`,
    statusTableCreated: (name) => `设备「${name}」组装成功！`,
    variableHint: '{0}=航线编号 {1}=航线名',
  },

  validate: {
    title: '维修日志',
    scope: ['当前设备', '全部设备'],
    selectAll: '全选',
    deselectAll: '取消全选',
    runBtn: '开始检修',
    runningBtn: '检修中...',
    emptyHint: '选择设备和检修项后，点击「开始检修」',
    ruleLabels: ['航线区间格式', '航线覆盖完整性', '数据类型匹配', '数组分隔符', '同Key航线顺序', '必填字段', '航段一致性'],
    validatingProgress: '正在检修',
    passedMessage: '检修完成，一切正常',
  },

  preview: {
    title: '航线预览',
    runBtn: (n) => `点火 (${n}台设备)`,
    runningBtn: '点火中...',
    colHeaders: ['设备名', '载荷', '状态'],
    statsTitle: '试飞报告',
    legendExcluded: '灰色 + 删除线 = 排除的载荷（航线区间或航段不匹配）',
    emptyHint: '选择航线后，点击「点火」开始试飞',
  },

  setup: {
    description: '飞船控制台尚未初始化。点击下方按钮自动创建配置，即可开始管理飞船设备。',
    initBtn: '初始化飞船',
    initializingBtn: '初始化中...',
  },

  help: {
    quickStart: {
      title: '舰长手册',
      body: 'GameData Studio 是您的星际飞船控制台，用于管理和发射飞船设备数据。每台设备是一个独立的工作表，包含航线控制区和主数据区。\n\n首次登舰：在空白工作簿中点击「初始化工作簿」，将自动创建飞船配置表、设备清单和示例设备。',
    },
    exportSection: {
      title: '发射',
      flow: '选择航线 → 设定着陆坐标 → 点击发射。系统自动加载配置、筛选数据、对比差异（Delta），仅输出有变更的设备。',
      outputDir: '在「舰桥」中配置。支持变量替换：{0} = 航线编号，{1} = 航线名。',
      git: '发射完成后，如果本地传送站正在运行，系统会自动执行星际传送（add、commit、push）。传送协议可在「舰桥」中自定义。',
    },
    collab: {
      title: '协同发射',
      howItWorks: '通过 StudioConfig 工作表实现多人协同发射。网页端船员在 StudioConfig 中填写航线、航线编号，并在「舰长」栏写入名字触发发射。',
      monitor: '默认开启，以 5 秒间隔扫描 StudioConfig 表。状态指示：绿色 = 扫描中，蓝色 = 协同发射中，灰色 = 雷达关闭。',
    },
    manageSection: {
      title: '舰桥',
      config: '管理舰长、航线模板（航线名 + 航段 + 传送坐标）、船员编制、传送协议和功能开关。添加新航线后点击「同步航段」为所有设备补充对应的航段列。',
      tableManage: '数据来源为「设备清单」工作表，直接在 Excel 中编辑设备清单即可实时同步。',
      newTable: '通过向导组装新设备，自动注册到设备清单并添加超链接。',
    },
    validateSection: {
      title: '维修',
      intro: '对选中的设备执行检修规则，检测航线区间格式、数据类型、必填字段、航段一致性等问题。点击检修结果可自动定位到故障单元格。',
    },
    previewSection: {
      title: '试飞',
      preview: '选择航线和航线编号，查看各设备的筛选结果（保留/排除的载荷数、被覆盖的重复 Key 行）。点击设备名自动跳转到该工作表。',
      highlight: '通过条件格式在 Excel 中高亮标记排除行和被覆盖行，不影响原有单元格格式。点击「清洗结束」还原。',
    },
    structure: {
      title: '设备结构',
      layout: 'version_c 区域（可选）→ version_r 行 → 描述行 → 数据行。左侧为航线控制列。',
      fields: '格式：[前缀_]字段名=类型，前缀 key_ 表示主键，language_ 表示多语言字段。',
      versionRange: '左闭右开 [min, max)。1.0 → 从 1.0 起永久生效，1.0~2.5 → 仅该区间生效，空值 → 几乎不发射。',
      routes: 'roads_0 为总开关，roads_N 为地区专属航段。值：1=启用，0/空=禁用，航线区间=条件启用。',
    },
    terms: {
      table: '设备',
      version: '航线',
      versionNumber: '航线编号',
      route: '航段',
      operator: '舰长',
      export: '发射',
      validate: '检修',
      preview: '试飞',
      git: '星际传送',
      outputDir: '着陆坐标',
    },
  },
};
