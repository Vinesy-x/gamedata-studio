import type { ThemeTextMap } from './types';

/**
 * 赛博朋克主题文本
 *
 * 核心概念映射:
 *   版本(version) → 协议    版本名 → 协议名    版本号 → 协议版本
 *   线路(roads_X) → 链路    序列号 → 序列号
 *   表(table)     → 数据体  操作员 → 黑客
 *   导出          → 上传    校验 → 扫描      预览 → 解码
 *   Git           → 暗网节点
 */
export const cyberText: ThemeTextMap = {
  tabExport: '上传',
  tabManage: '终端',
  tabValidate: '扫描',
  tabPreview: '解码',

  export: {
    sectionTitle: '上传准备',
    exportBtn: '开始上传',
    exportingBtn: '上传中...',
    disabledBtn: '请先配置上传节点',
    gitBtn: '暗网推送',
    gitFailBtn: '推送失败',
    resultSuccess: '上传完成',
    resultNoChange: '无数据变更',
    resultFail: '上传失败',
    statFiles: (n) => `${n} 个数据体`,
    statWarnings: (n) => `${n} 个警告`,
    statErrors: (n) => `${n} 个异常`,
    config: {
      version: '协议',
      versionNumber: '协议版本',
      sequence: '序列号',
      operator: '黑客',
      monitor: '入侵检测',
      outputDir: '上传节点',
      noOutputDir: '点击配置上传节点',
      monitoring: '监听中',
      monitorExporting: '协同上传中...',
      monitorOff: '监听关闭',
    },
  },

  manage: {
    subNav: ['终端配置', '数据库', '编译器'],
    sectionTitle: '终端管理',
    operator: '黑客',
    gitTemplate: '推送脚本',
    staff: '黑客名册',
    versionListTitle: (n) => `协议列表 (${n})`,
    colVersion: '协议名',
    colRoute: '链路',
    colGitDir: '暗网路径',
    syncRoutes: '同步链路',
    syncingRoutes: '同步中...',
    addVersion: '添加协议',
    tablesSectionTitle: '数据体管理',
    searchPlaceholder: '搜索数据体...',
    colChineseName: '数据体名',
    colEnglishName: '标识符',
    colTableVersion: '协议',
    colControl: '控制',
    tableSummary: (f, t) => `共 ${f} 个数据体` + (f < t ? ` (筛选自 ${t} 个)` : ''),
    wizardTitle: '数据体编译器',
    wizardChineseName: '数据体名称',
    wizardEnglishName: '数据体标识',
    wizardStartVersion: '起始协议版本',
    wizardIncludeVersionC: '包含 version_c',
    wizardAutoRegister: '自动注册',
    wizardCreateBtn: '编译数据体',
    wizardCreatingBtn: '编译中...',
    addVersionHint: '添加新协议后点击「同步链路」为所有数据体补充链路列',
    gitDirPlaceholder: '暗网路径（必填）',
    versionNamePlaceholder: '协议名称',
    statusGitDirRequired: '必须配置暗网路径，无路径的协议无法推送',
    statusVersionAdded: (name, field) => `协议「${name}」(${field}) 已注册`,
    statusVersionDeleted: (name) => `协议「${name}」已注销`,
    statusSyncResult: (n) => `链路同步完成: ${n} 个数据体已更新`,
    statusTableCreated: (name) => `数据体「${name}」编译成功`,
    variableHint: '{0}=协议版本 {1}=协议名',
  },

  validate: {
    title: '扫描日志',
    scope: ['当前数据体', '全部数据体'],
    selectAll: '全选',
    deselectAll: '取消全选',
    runBtn: '启动扫描',
    runningBtn: '扫描中...',
    emptyHint: '选择数据体和扫描项后，点击「启动扫描」',
    ruleLabels: ['协议区间格式', '协议覆盖完整性', '数据类型匹配', '数组分隔符', '同Key协议顺序', '必填字段', '链路一致性'],
    validatingProgress: '正在扫描',
    passedMessage: '扫描完成，未发现异常',
  },

  preview: {
    title: '选择协议',
    runBtn: (n) => `解码 (${n}个数据体)`,
    runningBtn: '解码中...',
    colHeaders: ['数据体', '记录数', '状态'],
    statsTitle: '解码报告',
    legendExcluded: '灰色 + 删除线 = 排除的记录（协议区间或链路不匹配）',
    emptyHint: '选择协议后，点击「解码」开始分析',
  },

  setup: {
    description: '终端尚未初始化。点击下方按钮自动创建配置，即可接入数据网络。',
    initBtn: '初始化终端',
    initializingBtn: '初始化中...',
  },

  help: {
    quickStart: {
      title: '黑客手册',
      body: 'GameData Studio 是你的赛博终端，用于管理和上传游戏数据体。每个数据体是一个独立的工作表，包含协议控制区和主数据区。\n\n首次接入：在空白工作簿中点击「初始化工作簿」，系统将自动创建配置表、数据体目录和示例数据体。',
    },
    exportSection: {
      title: '上传',
      flow: '选择协议 → 配置上传节点 → 点击上传。系统自动加载配置、筛选数据、对比差异，仅上传有变更的数据体。',
      outputDir: '在「终端」中配置。支持变量替换：{0} = 协议版本，{1} = 协议名。',
      git: '上传完成后，如果暗网节点可用，系统会自动推送。推送脚本可在「终端」中自定义。',
    },
    collab: {
      title: '协同上传',
      howItWorks: '通过 StudioConfig 工作表实现多人协同上传。网页端黑客在配置表中填写协议、版本，并在「黑客」栏写入名字触发上传。',
      monitor: '入侵检测默认开启，以 5 秒间隔扫描。状态：绿色 = 监听中，蓝色 = 协同上传中，灰色 = 监听关闭。',
    },
    manageSection: {
      title: '终端管理',
      config: '管理黑客、协议模板（协议名 + 链路 + 暗网路径）、黑客名册、推送脚本和功能开关。添加新协议后点击「同步链路」。',
      tableManage: '数据来源为「数据体目录」工作表，直接在 Excel 中编辑即可实时同步。',
      newTable: '通过编译器创建新数据体，自动注册到目录并添加快捷链接。',
    },
    validateSection: {
      title: '扫描',
      intro: '对选中的数据体执行扫描规则，检测协议格式、数据类型、必填字段等问题。点击结果可自动定位到异常单元格。',
    },
    previewSection: {
      title: '解码',
      preview: '选择协议和版本，查看各数据体的筛选情况。点击数据体名可直接跳转。',
      highlight: '通过条件格式在 Excel 中高亮标记，不影响原有格式。点击「清洗结束」还原。',
    },
    structure: {
      title: '数据体结构',
      layout: 'version_c 区域（可选）→ version_r 行 → 描述行 → 数据行。左侧为协议控制列。',
      fields: '格式：[前缀_]字段名=类型，前缀 key_ 表示主键，language_ 表示多语言字段。',
      versionRange: '左闭右开 [min, max)。1.0 → 从 1.0 起永久生效，1.0~2.5 → 仅该区间生效，空值 → 不上传。',
      routes: 'roads_0 为总开关，roads_N 为区域链路。值：1=启用，0/空=禁用，协议区间=条件启用。',
    },
    terms: {
      table: '数据体',
      version: '协议',
      versionNumber: '协议版本',
      route: '链路',
      operator: '黑客',
      export: '上传',
      validate: '扫描',
      preview: '解码',
      git: '暗网节点',
      outputDir: '上传节点',
    },
  },
};
