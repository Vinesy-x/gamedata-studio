import type { ThemeTextMap } from './types';

/**
 * 像素游戏主题文本
 *
 * 核心概念映射:
 *   版本(version) → 副本    版本名 → 副本名    版本号 → 副本编号
 *   线路(roads_X) → 路线    序列号 → 回合
 *   表(table)     → 精灵    操作员 → 勇者
 *   导出          → 过关    校验 → 鉴定      预览 → 探索
 *   Git           → 传送阵
 */
export const pixelText: ThemeTextMap = {
  tabExport: '过关',
  tabManage: '营地',
  tabValidate: '鉴定',
  tabPreview: '探索',

  export: {
    sectionTitle: '过关准备',
    exportBtn: 'GO!',
    exportingBtn: '过关中...',
    disabledBtn: '请先设定宝箱位置',
    gitBtn: '传送阵',
    gitFailBtn: '传送失败',
    resultSuccess: 'STAGE CLEAR!',
    resultNoChange: 'NO CHANGE',
    resultFail: 'GAME OVER',
    statFiles: (n) => `${n} 个精灵`,
    statWarnings: (n) => `${n} 个陷阱`,
    statErrors: (n) => `${n} 个MISS`,
    config: {
      version: '副本',
      versionNumber: '副本编号',
      sequence: '回合',
      operator: '勇者',
      monitor: '巡逻哨兵',
      outputDir: '宝箱位置',
      noOutputDir: '点击设定宝箱位置',
      monitoring: '巡逻中',
      monitorExporting: '哨兵正在过关...',
      monitorOff: '哨兵休息中',
    },
  },

  manage: {
    subNav: ['营地设置', '精灵图鉴', '锻造炉'],
    sectionTitle: '营地管理',
    operator: '勇者',
    gitTemplate: '传送咒语',
    staff: '冒险队伍',
    versionListTitle: (n) => `副本列表 (${n})`,
    colVersion: '副本名',
    colRoute: '路线',
    colGitDir: '传送阵坐标',
    syncRoutes: '同步路线',
    syncingRoutes: '同步中...',
    addVersion: '开启新副本',
    tablesSectionTitle: '精灵管理',
    searchPlaceholder: '搜索精灵...',
    colChineseName: '精灵名',
    colEnglishName: '编号',
    colTableVersion: '副本',
    colControl: '控制',
    tableSummary: (f, t) => `共 ${f} 个精灵` + (f < t ? ` (筛选自 ${t} 个)` : ''),
    wizardTitle: '精灵锻造炉',
    wizardChineseName: '精灵名称',
    wizardEnglishName: '精灵编号',
    wizardStartVersion: '起始副本编号',
    wizardIncludeVersionC: '包含 version_c',
    wizardAutoRegister: '自动收录',
    wizardCreateBtn: '锻造精灵',
    wizardCreatingBtn: '锻造中...',
    addVersionHint: '开启新副本后点击「同步路线」为所有精灵补充路线列',
    gitDirPlaceholder: '传送阵坐标（必填）',
    versionNamePlaceholder: '副本名称',
    statusGitDirRequired: '必须配置传送阵坐标，没有传送阵的副本无法通关',
    statusVersionAdded: (name, field) => `副本「${name}」(${field}) 已开启`,
    statusVersionDeleted: (name) => `副本「${name}」已关闭`,
    statusSyncResult: (n) => `路线同步完成: ${n} 个精灵已更新`,
    statusTableCreated: (name) => `精灵「${name}」锻造成功!`,
    variableHint: '{0}=副本编号 {1}=副本名',
  },

  validate: {
    title: '鉴定报告',
    scope: ['当前精灵', '全部精灵'],
    selectAll: '全选',
    deselectAll: '取消全选',
    runBtn: '开始鉴定',
    runningBtn: '鉴定中...',
    emptyHint: '选择精灵和鉴定项后，点击「开始鉴定」',
    ruleLabels: ['副本区间格式', '副本覆盖完整性', '数据类型匹配', '数组分隔符', '同Key副本顺序', '必填字段', '路线一致性'],
    validatingProgress: '正在鉴定',
    passedMessage: 'PERFECT! 全部通过',
  },

  preview: {
    title: '选择副本',
    runBtn: (n) => `出发探索 (${n}个精灵)`,
    runningBtn: '加载地图...',
    colHeaders: ['精灵名', '记录数', '评分'],
    statsTitle: 'GAME STATS',
    legendExcluded: '灰色 + 删除线 = 排除的记录（副本区间或路线不匹配）',
    emptyHint: '选择副本后，点击「出发探索」开始冒险',
  },

  setup: {
    description: '冒险尚未开始! 点击下方按钮创建存档，选择你的勇者开始像素冒险吧!',
    initBtn: 'NEW GAME',
    initializingBtn: 'LOADING...',
  },

  commitHistory: {
    title: 'SAVE LIST',
    loading: 'LOADING...',
    empty: 'NO SAVE DATA',
    rollbackBtn: 'LOAD',
    confirmTitle: 'LOAD SAVE?',
    confirmMessage: (hash) => `确定要读取存档 ${hash} 吗？当前进度将被覆盖！`,
    confirmBtn: 'YES',
    cancelBtn: 'NO',
    rolling: 'LOADING...',
    rollbackSuccess: 'LOAD OK!',
    rollbackFail: 'LOAD FAILED',
    serverError: '传送阵无响应',
  },

  help: {
    quickStart: {
      title: '勇者手册',
      body: 'GameData Studio 是你的像素冒险工作台，用于管理和输出游戏精灵数据。每个精灵是一个独立的工作表，包含副本控制区和主数据区。\n\n首次冒险：在空白工作簿中点击「初始化工作簿」，系统自动创建配置表、精灵图鉴和示例精灵。',
    },
    exportSection: {
      title: '过关',
      flow: '选择副本 → 设定宝箱位置 → 点击 GO! 系统自动加载配置、筛选数据、对比差异，仅输出有变更的精灵。',
      outputDir: '在「营地」中配置。支持变量替换：{0} = 副本编号，{1} = 副本名。',
      git: '过关完成后，如果传送阵可用，系统会自动传送。传送咒语可在「营地」中自定义。',
    },
    collab: {
      title: '多人组队',
      howItWorks: '通过 StudioConfig 工作表实现多人组队过关。网页端队友在配置表中填写副本、编号，并在「勇者」栏写入名字触发过关。',
      monitor: '巡逻哨兵默认开启，以 5 秒间隔巡逻。状态：绿色 = 巡逻中，蓝色 = 正在过关，灰色 = 休息中。',
    },
    manageSection: {
      title: '营地管理',
      config: '管理勇者、副本模板（副本名 + 路线 + 传送阵坐标）、冒险队伍、传送咒语和功能开关。开启新副本后点击「同步路线」。',
      tableManage: '数据来源为「精灵图鉴」工作表，直接在 Excel 中编辑即可实时同步。',
      newTable: '通过锻造炉创建新精灵，自动收录到图鉴并添加快捷链接。',
    },
    validateSection: {
      title: '鉴定',
      intro: '对选中的精灵执行鉴定检查，检测副本格式、数据类型、必填字段等问题。点击结果可自动定位到问题单元格。',
    },
    previewSection: {
      title: '探索',
      preview: '选择副本和编号，查看各精灵的筛选情况。点击精灵名可直接跳转。',
      highlight: '通过条件格式在 Excel 中高亮标记，不影响原有格式。点击「清洗结束」还原。',
    },
    structure: {
      title: '精灵结构',
      layout: 'version_c 区域（可选）→ version_r 行 → 描述行 → 数据行。左侧为副本控制列。',
      fields: '格式：[前缀_]字段名=类型，前缀 key_ 表示主键，language_ 表示多语言字段。',
      versionRange: '左闭右开 [min, max)。1.0 → 从 1.0 起永久生效，1.0~2.5 → 仅该区间生效，空值 → 不输出。',
      routes: 'roads_0 为总开关，roads_N 为区域路线。值：1=启用，0/空=禁用，副本区间=条件启用。',
    },
    terms: {
      table: '精灵',
      version: '副本',
      versionNumber: '副本编号',
      route: '路线',
      operator: '勇者',
      export: '过关',
      validate: '鉴定',
      preview: '探索',
      git: '传送阵',
      outputDir: '宝箱位置',
    },
  },
};
