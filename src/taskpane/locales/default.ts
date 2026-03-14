import type { ThemeTextMap } from './types';

/** 默认文本 — 用于 light / dark 主题 */
export const defaultText: ThemeTextMap = {
  tabExport: '导出',
  tabManage: '管理',
  tabValidate: '校验',
  tabPreview: '预览',

  export: {
    sectionTitle: 'Export Settings',
    exportBtn: '开始导出',
    exportingBtn: '导出中...',
    disabledBtn: '请先选择导出目录',
    gitBtn: 'Git',
    gitFailBtn: 'Git 失败',
    resultSuccess: '导出成功',
    resultNoChange: '无任何修改',
    resultFail: '导出失败',
    statFiles: (n) => `${n} files`,
    statWarnings: (n) => `${n} warnings`,
    statErrors: (n) => `${n} errors`,
    config: {
      version: '输出版本',
      versionNumber: '版本号',
      sequence: '序列号',
      operator: '操作员',
      monitor: '协同监听',
      outputDir: '导出目录',
      noOutputDir: '点击前往配置',
      monitoring: '监听中',
      monitorExporting: '正在协同导出...',
      monitorOff: '已关闭',
    },
  },

  manage: {
    subNav: ['配置', '表管理', '新建表'],
    sectionTitle: '配置管理',
    operator: '操作员',
    gitTemplate: 'Git 提交模板',
    staff: '人员代码',
    versionListTitle: (n) => `版本管理 (${n})`,
    colVersion: '版本名',
    colRoute: '线路',
    colGitDir: 'Git 目录',
    syncRoutes: '同步线路',
    addVersion: '添加',
  },

  validate: {
    title: '校验规则',
    scope: ['当前表', '已注册表'],
    selectAll: '全选',
    deselectAll: '取消全选',
    runBtn: '运行校验',
    runningBtn: '校验中...',
    emptyHint: '选择校验范围和规则后，点击「运行校验」',
  },

  preview: {
    title: '版本预览',
    runBtn: (n) => `预览 (${n} 张表)`,
    runningBtn: '预览中...',
    colHeaders: ['表名', '原始行列', '筛选行列'],
    statsTitle: '预览结果',
    emptyHint: '选择版本后，点击「预览」查看数据',
  },
};
