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
    addVersion: '添加航线',
  },

  validate: {
    title: '维修日志',
    scope: ['当前设备', '全部设备'],
    selectAll: '全选',
    deselectAll: '取消全选',
    runBtn: '开始检修',
    runningBtn: '检修中...',
    emptyHint: '选择设备和检修项后，点击「开始检修」',
  },

  preview: {
    title: '航线预览',
    runBtn: (n) => `点火 (${n}台设备)`,
    runningBtn: '点火中...',
    colHeaders: ['设备名', '载荷', '状态'],
    statsTitle: '试飞报告',
    emptyHint: '选择航线后，点击「点火」开始试飞',
  },
};
