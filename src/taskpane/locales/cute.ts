import type { ThemeTextMap } from './types';

/**
 * 二次元可爱冒险主题文本
 *
 * 核心概念映射:
 *   版本(version) → 世界    版本名 → 世界名    版本号 → 章节
 *   线路(roads_X) → 路线    序列号 → 冒险编号
 *   表(table)     → 宝典    操作员 → 冒险者
 *   导出          → 出发    校验 → 守护      预览 → 冒险
 *   Git           → 魔法书架
 */
export const cuteText: ThemeTextMap = {
  tabExport: '出发',
  tabManage: '小窝',
  tabValidate: '守护',
  tabPreview: '冒险',

  export: {
    subNav: ['出发', '成果', '日记'] as const,
    sectionTitle: '冒险准备',
    exportBtn: '出发吧~',
    exportingBtn: '出发中...',
    disabledBtn: '请先设定宝物存放处',
    gitBtn: '魔法书架',
    gitFailBtn: '书架故障了',
    pushBtn: '送出宝典~',
    pushingBtn: '飞奔中...',
    pushDone: '送达啦~',
    resultSuccess: '成就解锁!',
    resultNoChange: '什么都没变呢~',
    resultFail: '呜呜，失败了...',
    statFiles: (n) => `${n} 个宝物`,
    statWarnings: (n) => `${n} 个小麻烦`,
    statErrors: (n) => `${n} 个小问题`,
    diff: {
      added: (n) => `+${n} 新发现~`,
      removed: (n) => `-${n} 消失了`,
      modified: (n) => `~${n} 变化了`,
      truncated: (shown, total) => `显示 ${shown} / 共 ${total} 条变化~`,
      newRow: '新发现',
      removedRow: '消失了',
    },
    config: {
      version: '小伙伴',
      versionNumber: '章节',
      sequence: '冒险编号',
      operator: '冒险者',
      monitor: '守护精灵',
      outputDir: '宝物存放处',
      noOutputDir: '点击设定宝物存放处',
      monitoring: '守护中~',
      monitorExporting: '小精灵正在帮忙...',
      monitorOff: '精灵休息中',
    },
  },

  manage: {
    subNav: ['小窝设置', '百宝箱', '制作间'],
    sectionTitle: '小窝管理',
    operator: '冒险者',
    gitSettings: '魔法书架设置',
    staff: '小伙伴们',
    channelListTitle: (n) => `小伙伴列表 (${n})`,
    colChannel: '小伙伴名',
    colChannelId: '小伙伴编号',
    syncChannels: '同步小伙伴',
    syncingChannels: '同步中~',
    addChannel: '添加小伙伴',
    tablesSectionTitle: '宝典管理',
    searchPlaceholder: '搜索宝典...',
    colChineseName: '宝典名',
    colEnglishName: '编号',
    colTableVersion: '世界',
    colControl: '守护',
    tableSummary: (f, t) => `共 ${f} 本宝典` + (f < t ? ` (筛选自 ${t} 本)` : ''),
    wizardTitle: '宝典制作间',
    wizardChineseName: '宝典名称',
    wizardEnglishName: '宝典编号',
    wizardStartVersion: '起始章节号',
    wizardIncludeVersionC: '包含 version_c',
    wizardAutoRegister: '自动收录',
    wizardCreateBtn: '制作宝典',
    wizardCreatingBtn: '制作中~',
    addChannelHint: '添加小伙伴后点击「同步小伙伴」为所有宝典补充小伙伴列~',
    gitDirLabel: '魔法书架位置',
    gitDirPlaceholder: '魔法书架位置（必填）',
    channelNamePlaceholder: '小伙伴名称',
    statusChannelAdded: (name, field) => `小伙伴「${name}」(${field}) 已加入~`,
    statusChannelDeleted: (name) => `小伙伴「${name}」已离开~`,
    statusSyncResult: (n) => `路线同步完成: ${n} 本宝典已更新~`,
    statusTableCreated: (name) => `宝典「${name}」制作成功！`,
    variableHint: '{0}=章节 {1}=小伙伴名',
  },

  validate: {
    title: '冒险日记',
    scope: ['当前宝典', '已收集宝典'],
    selectAll: '全选',
    deselectAll: '取消全选',
    runBtn: '开始守护检查~',
    runningBtn: '检查中...',
    emptyHint: '选择宝典和检查项后，点击「开始守护检查」',
    ruleLabels: ['冒险范围确认', '世界覆盖完整性', '数据类型匹配', '数组分隔符', '同Key世界顺序', '必填字段', '路线一致性'],
    validatingProgress: '守护检查中',
    passedMessage: '检查完成，一切安好~',
  },

  preview: {
    title: '选择关卡',
    runBtn: (n) => `出发冒险! (${n}张表)`,
    runningBtn: '冒险准备中...',
    colHeaders: ['表名', '行数', '分数'],
    statsTitle: '♡ 冒险统计',
    legendExcluded: '灰色 + 删除线 = 排除的部分（世界区间或路线不匹配）',
    emptyHint: '选择世界后，点击「出发冒险」开始探索~',
  },

  setup: {
    description: '冒险小屋还没准备好呢~ 点击下方按钮自动创建配置，就可以开始收集宝典啦！',
    initBtn: '开始准备',
    initializingBtn: '准备中~',
  },

  commitHistory: {
    title: '冒险日记',
    loading: '翻页中~',
    empty: '还没有冒险记录呢~',
    rollbackBtn: '回到过去',
    confirmTitle: '确认回到过去',
    confirmMessage: (hash) => `真的要回到 ${hash} 那一刻吗？回去之后就不能反悔了哦~`,
    confirmBtn: '确认回去',
    cancelBtn: '算了算了',
    rolling: '穿越中~',
    rollbackSuccess: '回到过去成功啦~',
    rollbackFail: '呜呜，穿越失败了...',
    serverError: '魔法书架连不上了~',
  },

  help: {
    quickStart: {
      title: '冒险者手册',
      body: 'GameData Studio 是你的冒险小助手，帮你管理和整理游戏数据宝典~ 每本宝典是一个独立的工作表，包含世界设定区和主数据区。\n\n第一次冒险：在空白工作簿中点击「初始化工作簿」，精灵会自动创建配置表、宝典目录和示例宝典哦~',
    },
    exportSection: {
      title: '出发冒险',
      flow: '选择世界 → 设定宝物存放处 → 点击出发。小精灵会自动加载配置、筛选数据、对比差异，只整理有变化的宝典~',
      outputDir: '在「小窝设置」中配置。支持变量替换：{0} = 章节号，{1} = 世界名。',
      git: '出发完成后，如果魔法书架可用，精灵会自动帮你整理和上架。咒语模板可在「小窝设置」中自定义~',
    },
    collab: {
      title: '组队冒险',
      howItWorks: '通过 StudioConfig 工作表实现小伙伴们一起冒险~ 网页端伙伴在配置表中填写世界、章节，并在「冒险者」栏写入名字就能触发出发。',
      monitor: '守护精灵默认开启，每 5 秒巡逻一次。状态：绿色 = 守护中~，蓝色 = 帮忙出发中，灰色 = 休息中。',
    },
    manageSection: {
      title: '小窝管理',
      config: '管理冒险者、世界模板（世界名 + 路线 + 魔法书架位置）、小伙伴名册、魔法卷轴和功能开关。开辟新世界后记得点击「同步路线」~',
      tableManage: '数据来源为「宝典目录」工作表，直接在 Excel 中编辑即可实时同步。',
      newTable: '通过制作间创建新宝典，自动登记到宝典目录并添加快捷链接~',
    },
    validateSection: {
      title: '守护检查',
      intro: '对选中的宝典执行守护检查，检测咒语格式、数据类型、必填字段等问题。点击结果可自动找到问题所在~',
    },
    previewSection: {
      title: '冒险预览',
      preview: '选择世界和章节，查看各宝典的筛选情况。点击宝典名可直接跳转~',
      highlight: '通过条件格式在 Excel 中高亮标记，不影响原有格式。点击「清洗结束」还原。',
    },
    structure: {
      title: '宝典结构',
      layout: 'version_c 区域（可选）→ version_r 行 → 描述行 → 数据行。左侧为世界控制列。',
      fields: '格式：[前缀_]字段名=类型，前缀 key_ 表示主键，language_ 表示多语言字段。',
      versionRange: '左闭右开 [min, max)。1.0 → 从第一章起永久生效，1.0~2.5 → 仅该区间生效，空值 → 几乎不收录。',
      routes: 'roads_0 为总开关，roads_N 为地区专属路线。值：1=启用，0/空=禁用，区间=条件启用。',
    },
    terms: {
      table: '宝典',
      version: '小伙伴',
      versionNumber: '章节',
      route: '小伙伴',
      operator: '冒险者',
      export: '出发',
      validate: '守护检查',
      preview: '冒险',
      git: '魔法书架',
      outputDir: '宝物存放处',
    },
  },
};
