import type { ThemeTextMap } from './types';

/**
 * 像素复古主题文本
 *
 * 核心概念映射:
 *   版本(version) → 关卡    版本名 → 关卡名    版本号 → 关卡编号
 *   线路(roads_X) → 频道    序列号 → 存档编号
 *   表(table)     → 卡带    操作员 → 玩家P1
 *   导出          → 存档    校验 → Debug      预览 → 试玩
 *   Git           → 存档点
 */
export const pixelText: ThemeTextMap = {
  tabExport: '存档',
  tabManage: '设置',
  tabValidate: 'Debug',
  tabPreview: '试玩',

  export: {
    sectionTitle: '存档准备',
    exportBtn: 'SAVE',
    exportingBtn: 'SAVING...',
    disabledBtn: '请先设定存档路径',
    gitBtn: '同步存档点',
    gitFailBtn: '同步失败',
    resultSuccess: 'SAVE COMPLETE!',
    resultNoChange: 'NO CHANGE',
    resultFail: 'SAVE FAILED',
    statFiles: (n) => `${n} 个卡带`,
    statWarnings: (n) => `${n} 个警告`,
    statErrors: (n) => `${n} 个错误`,
    config: {
      version: '关卡',
      versionNumber: '关卡编号',
      sequence: '存档编号',
      operator: '玩家P1',
      monitor: '自动存档',
      outputDir: '存档路径',
      noOutputDir: '点击设定存档路径',
      monitoring: '监听中',
      monitorExporting: '自动存档中...',
      monitorOff: '自动存档关闭',
    },
  },

  manage: {
    subNav: ['游戏设置', '卡带库', '烧录器'],
    sectionTitle: '游戏设置',
    operator: '玩家P1',
    gitTemplate: '存档格式',
    staff: '玩家列表',
    versionListTitle: (n) => `关卡列表 (${n})`,
    colVersion: '关卡名',
    colRoute: '频道',
    colGitDir: '存档点路径',
    syncRoutes: '同步频道',
    syncingRoutes: '同步中...',
    addVersion: '添加关卡',
    tablesSectionTitle: '卡带管理',
    searchPlaceholder: '搜索卡带...',
    colChineseName: '卡带名',
    colEnglishName: '代号',
    colTableVersion: '关卡',
    colControl: '控制',
    tableSummary: (f, t) => `共 ${f} 个卡带` + (f < t ? ` (筛选自 ${t} 个)` : ''),
    wizardTitle: '卡带烧录器',
    wizardChineseName: '卡带名称',
    wizardEnglishName: '卡带代号',
    wizardStartVersion: '起始关卡编号',
    wizardIncludeVersionC: '包含 version_c',
    wizardAutoRegister: '自动注册',
    wizardCreateBtn: '烧录卡带',
    wizardCreatingBtn: '烧录中...',
    addVersionHint: '添加新关卡后点击「同步频道」为所有卡带补充频道列',
    gitDirPlaceholder: '存档点路径（必填）',
    versionNamePlaceholder: '关卡名称',
    statusGitDirRequired: '必须配置存档点路径，否则无法同步存档',
    statusVersionAdded: (name, field) => `关卡「${name}」(${field}) 已添加`,
    statusVersionDeleted: (name) => `关卡「${name}」已删除`,
    statusSyncResult: (n) => `频道同步完成: ${n} 个卡带已更新`,
    statusTableCreated: (name) => `卡带「${name}」烧录成功!`,
    variableHint: '{0}=关卡编号 {1}=关卡名',
  },

  validate: {
    title: 'Debug Log',
    scope: ['当前卡带', '全部卡带'],
    selectAll: '全选',
    deselectAll: '取消全选',
    runBtn: 'RUN DEBUG',
    runningBtn: 'DEBUGGING...',
    emptyHint: '选择卡带和检查项后，点击「RUN DEBUG」',
    ruleLabels: ['关卡区间格式', '关卡覆盖完整性', '数据类型匹配', '数组分隔符', '同Key关卡顺序', '必填字段', '频道一致性'],
    validatingProgress: 'DEBUG IN PROGRESS',
    passedMessage: 'ALL TESTS PASSED!',
  },

  preview: {
    title: '选择关卡',
    runBtn: (n) => `START (${n}个卡带)`,
    runningBtn: 'LOADING...',
    colHeaders: ['卡带名', '记录数', '状态'],
    statsTitle: 'GAME STATS',
    legendExcluded: '灰色 + 删除线 = 排除的记录（关卡区间或频道不匹配）',
    emptyHint: '选择关卡后，点击「START」开始试玩',
  },

  setup: {
    description: '游戏尚未初始化。点击下方按钮创建存档，即可开始游戏。',
    initBtn: 'NEW GAME',
    initializingBtn: 'LOADING...',
  },

  help: {
    quickStart: {
      title: 'PLAYER GUIDE',
      body: 'GameData Studio 是你的复古游戏终端，用于管理和存档游戏数据卡带。每个卡带是一个独立的工作表，包含关卡控制区和主数据区。\n\n首次进入：在空白工作簿中点击「初始化工作簿」，系统自动创建配置表、卡带目录和示例卡带。',
    },
    exportSection: {
      title: '存档',
      flow: '选择关卡 → 设定存档路径 → 点击 SAVE。系统自动加载配置、筛选数据、对比差异，仅存档有变更的卡带。',
      outputDir: '在「设置」中配置。支持变量替换：{0} = 关卡编号，{1} = 关卡名。',
      git: '存档完成后，如果存档点可用，系统会自动同步。存档格式可在「设置」中自定义。',
    },
    collab: {
      title: '多人联机',
      howItWorks: '通过 StudioConfig 工作表实现多人联机存档。网页端玩家在配置表中填写关卡、编号，并在「玩家P1」栏写入名字触发存档。',
      monitor: '自动存档默认开启，以 5 秒间隔检测。状态：绿色 = 监听中，蓝色 = 自动存档中，灰色 = 关闭。',
    },
    manageSection: {
      title: '游戏设置',
      config: '管理玩家、关卡模板（关卡名 + 频道 + 存档点路径）、玩家列表、存档格式和功能开关。添加新关卡后点击「同步频道」。',
      tableManage: '数据来源为「卡带目录」工作表，直接在 Excel 中编辑即可实时同步。',
      newTable: '通过烧录器创建新卡带，自动注册到目录并添加快捷链接。',
    },
    validateSection: {
      title: 'Debug',
      intro: '对选中的卡带执行 Debug 检查，检测关卡格式、数据类型、必填字段等问题。点击结果可自动定位到问题单元格。',
    },
    previewSection: {
      title: '试玩',
      preview: '选择关卡和编号，查看各卡带的筛选情况。点击卡带名可直接跳转。',
      highlight: '通过条件格式在 Excel 中高亮标记，不影响原有格式。点击「清洗结束」还原。',
    },
    structure: {
      title: '卡带结构',
      layout: 'version_c 区域（可选）→ version_r 行 → 描述行 → 数据行。左侧为关卡控制列。',
      fields: '格式：[前缀_]字段名=类型，前缀 key_ 表示主键，language_ 表示多语言字段。',
      versionRange: '左闭右开 [min, max)。1.0 → 从 1.0 起永久生效，1.0~2.5 → 仅该区间生效，空值 → 不存档。',
      routes: 'roads_0 为总开关，roads_N 为区域频道。值：1=启用，0/空=禁用，关卡区间=条件启用。',
    },
    terms: {
      table: '卡带',
      version: '关卡',
      versionNumber: '关卡编号',
      route: '频道',
      operator: '玩家P1',
      export: '存档',
      validate: 'Debug',
      preview: '试玩',
      git: '存档点',
      outputDir: '存档路径',
    },
  },
};
