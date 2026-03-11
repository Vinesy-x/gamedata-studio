/* global Excel */

import { useState, useCallback, useMemo } from 'react';
import {
  makeStyles,
  tokens,
  Button,
  Checkbox,
  Spinner,
  Text,
} from '@fluentui/react-components';
import {
  CheckmarkCircleRegular,
  DismissCircleRegular,
  WarningRegular,
  InfoRegular,
  PlayRegular,
  SearchRegular,
} from '@fluentui/react-icons';
import { Config } from '../../types/config';
import { ValidationResult, ValidationSeverity } from '../../types/validation';
import { ValidationEngine } from '../../v3/ValidationEngine';
import { ValidationNavigator } from '../../v3/ValidationNavigator';
import { VersionFilter } from '../../engine/VersionFilter';

// ─── 校验规则定义 ───────────────────────────────────────

interface RuleDef {
  key: string;
  label: string;
}

const VALIDATION_RULES: RuleDef[] = [
  { key: 'versionFormat', label: '版本区间格式' },
  { key: 'versionCoverage', label: '版本覆盖完整性' },
  { key: 'dataType', label: '数据类型匹配' },
  { key: 'arrayDelimiter', label: '数组分隔符' },
  { key: 'keyVersionOrder', label: '同Key版本顺序' },
  { key: 'requiredFields', label: '必填字段' },
  { key: 'roadsConsistency', label: 'Roads一致性' },
];

// ─── 样式 ────────────────────────────────────────────────

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0',
    minHeight: '100%',
  },

  // 区块通用
  section: {
    padding: '12px 14px',
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginBottom: '8px',
  },
  sectionTitle: {
    fontSize: '13px',
    fontWeight: 600,
    color: tokens.colorNeutralForeground1,
  },
  divider: {
    height: '1px',
    backgroundColor: tokens.colorNeutralStroke2,
    marginLeft: '14px',
    marginRight: '14px',
  },

  // 校验范围按钮组
  scopeRow: {
    display: 'flex',
    gap: '6px',
  },
  scopeBtn: {
    flex: 1,
    minWidth: 0,
    fontSize: '12px',
  },
  scopeBtnActive: {
    flex: 1,
    minWidth: 0,
    fontSize: '12px',
  },

  // 规则复选框
  rulesGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  ruleCheckbox: {
    fontSize: '12px',
  },

  // 运行按钮
  runBtn: {
    width: '100%',
    marginTop: '4px',
  },

  // 汇总徽章行
  summaryRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '8px 12px',
    backgroundColor: tokens.colorNeutralBackground2,
    borderRadius: '6px',
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '12px',
    fontWeight: 600,
    padding: '2px 8px',
    borderRadius: '10px',
  },
  badgeError: {
    backgroundColor: '#FDE7E9',
    color: tokens.colorPaletteRedForeground1,
  },
  badgeWarning: {
    backgroundColor: '#FFF4CE',
    color: '#9D5D00',
  },
  badgeInfo: {
    backgroundColor: '#E8F4FD',
    color: tokens.colorBrandForeground1,
  },
  summaryTotal: {
    fontSize: '12px',
    color: tokens.colorNeutralForeground3,
    marginLeft: 'auto',
  },

  // 结果列表
  resultList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    maxHeight: '400px',
    overflowY: 'auto',
  },
  resultItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '6px',
    padding: '6px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    lineHeight: '1.4',
    cursor: 'pointer',
    ':hover': {
      backgroundColor: tokens.colorNeutralBackground2,
    },
  },
  resultIcon: {
    flexShrink: 0,
    marginTop: '2px',
  },
  resultIconError: {
    color: tokens.colorPaletteRedForeground1,
  },
  resultIconWarning: {
    color: '#9D5D00',
  },
  resultIconInfo: {
    color: tokens.colorBrandForeground1,
  },
  resultBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1px',
    flex: 1,
    minWidth: 0,
  },
  resultMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '11px',
    color: tokens.colorNeutralForeground3,
  },
  resultTableName: {
    fontWeight: 600,
    color: tokens.colorNeutralForeground2,
  },
  resultRuleName: {
    fontSize: '10px',
    padding: '0 4px',
    borderRadius: '3px',
    backgroundColor: tokens.colorNeutralBackground3,
    color: tokens.colorNeutralForeground3,
  },
  resultMessage: {
    fontSize: '12px',
    color: tokens.colorNeutralForeground1,
    wordBreak: 'break-all',
  },

  // 分组标题
  groupHeader: {
    fontSize: '11px',
    fontWeight: 600,
    padding: '6px 8px 2px',
    color: tokens.colorNeutralForeground3,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },

  // 空状态
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '32px 16px',
    gap: '8px',
    color: tokens.colorNeutralForeground3,
  },
  emptyIcon: {
    fontSize: '32px',
    opacity: 0.4,
  },
  emptyText: {
    fontSize: '12px',
    textAlign: 'center' as const,
  },

  // 成功状态
  successState: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px',
    backgroundColor: '#DFF6DD',
    borderRadius: '6px',
  },
  successIcon: {
    color: tokens.colorPaletteGreenForeground1,
    fontSize: '18px',
  },
  successText: {
    fontSize: '13px',
    fontWeight: 600,
    color: tokens.colorPaletteGreenForeground1,
  },

  // Spinner 区域
  spinnerArea: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px 16px',
    gap: '10px',
  },
  spinnerText: {
    fontSize: '12px',
    color: tokens.colorNeutralForeground3,
  },

  // 淡入动画
  fadeIn: {
    animationName: {
      from: { opacity: 0, transform: 'translateY(6px)' },
      to: { opacity: 1, transform: 'translateY(0)' },
    },
    animationDuration: '0.3s',
    animationTimingFunction: 'ease-out',
    animationFillMode: 'both',
  },
});

// ─── 校验范围枚举 ────────────────────────────────────────

type ScopeType = 'active' | 'registered' | 'checked';

// ─── 组件 ────────────────────────────────────────────────

interface ValidationPanelProps {
  config: Config;
}

export function ValidationPanel({ config }: ValidationPanelProps) {
  const styles = useStyles();

  // 校验范围
  const [scope, setScope] = useState<ScopeType>('registered');

  // 规则开关（默认全选）
  const [enabledRules, setEnabledRules] = useState<Set<string>>(
    () => new Set(VALIDATION_RULES.map((r) => r.key))
  );

  // 运行状态
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<ValidationResult[] | null>(null);

  // Navigator 实例（单例复用）
  const navigator = useMemo(() => new ValidationNavigator(), []);

  // ─── 规则开关 ──────────────────────────────

  const toggleRule = useCallback((key: string) => {
    setEnabledRules((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const toggleAllRules = useCallback(() => {
    setEnabledRules((prev) => {
      if (prev.size === VALIDATION_RULES.length) {
        return new Set<string>();
      }
      return new Set(VALIDATION_RULES.map((r) => r.key));
    });
  }, []);

  // ─── 获取校验范围表名 ─────────────────────

  const getSelectedTables = useCallback(async (): Promise<Set<string>> => {
    if (scope === 'active') {
      // 当前选中表
      let activeSheetName = '';
      await Excel.run(async (context) => {
        const activeSheet = context.workbook.worksheets.getActiveWorksheet();
        activeSheet.load('name');
        await context.sync();
        activeSheetName = activeSheet.name;
      });
      return new Set(activeSheetName ? [activeSheetName] : []);
    }

    if (scope === 'registered') {
      // 已注册表
      return new Set(config.tablesToProcess.keys());
    }

    // checked: 勾选表（shouldOutput === true）
    const checkedTables = new Set<string>();
    config.tablesToProcess.forEach((info, name) => {
      if (info.shouldOutput) {
        checkedTables.add(name);
      }
    });
    return checkedTables;
  }, [scope, config.tablesToProcess]);

  // ─── 运行校验 ─────────────────────────────

  const handleRunValidation = useCallback(async () => {
    setIsRunning(true);
    setResults(null);

    try {
      const tables = await getSelectedTables();
      if (tables.size === 0) {
        setResults([]);
        return;
      }

      const versionFilter = new VersionFilter(
        config.outputSettings.versionNumber,
        'roads_0'
      );
      const engine = new ValidationEngine(versionFilter);

      const allResults = await engine.runValidation(tables);

      // 按启用的规则过滤
      const ruleNameMap: Record<string, string> = {
        versionFormat: '版本区间分隔符',
        versionCoverage: '版本覆盖完整性',
        dataType: '数据类型',
        arrayDelimiter: '数组分隔符',
        keyVersionOrder: '同Key版本顺序',
        requiredFields: '必填字段',
        roadsConsistency: 'Roads一致性',
      };

      // 同时匹配「版本区间格式」规则的两个 ruleName
      const enabledRuleNames = new Set<string>();
      enabledRules.forEach((key) => {
        const mapped = ruleNameMap[key];
        if (mapped) enabledRuleNames.add(mapped);
      });
      // versionFormat 规则映射两个 ruleName
      if (enabledRules.has('versionFormat')) {
        enabledRuleNames.add('版本区间格式');
      }

      const filtered = allResults.filter((r) => enabledRuleNames.has(r.ruleName));
      setResults(filtered);
    } catch (err) {
      console.error('校验运行失败', err);
      setResults([]);
    } finally {
      setIsRunning(false);
    }
  }, [getSelectedTables, config.outputSettings.versionNumber, enabledRules]);

  // ─── 点击结果跳转 ─────────────────────────

  const handleResultClick = useCallback(
    async (result: ValidationResult) => {
      if (result.location) {
        await navigator.navigateTo(result.location);
      }
    },
    [navigator]
  );

  // ─── 统计数据 ─────────────────────────────

  const counts = useMemo(() => {
    if (!results) return null;
    const error = results.filter((r) => r.severity === 'error').length;
    const warning = results.filter((r) => r.severity === 'warning').length;
    const info = results.filter((r) => r.severity === 'info').length;
    return { error, warning, info, total: results.length };
  }, [results]);

  // 按严重度分组排序
  const groupedResults = useMemo(() => {
    if (!results) return null;

    const severityOrder: Record<ValidationSeverity, number> = {
      error: 0,
      warning: 1,
      info: 2,
    };

    const sorted = [...results].sort(
      (a, b) => severityOrder[a.severity] - severityOrder[b.severity]
    );

    const groups: { severity: ValidationSeverity; items: ValidationResult[] }[] = [];
    let currentSeverity: ValidationSeverity | null = null;

    for (const item of sorted) {
      if (item.severity !== currentSeverity) {
        currentSeverity = item.severity;
        groups.push({ severity: item.severity, items: [] });
      }
      groups[groups.length - 1].items.push(item);
    }

    return groups;
  }, [results]);

  // ─── 严重度 → 图标 ────────────────────────

  const getSeverityIcon = (severity: ValidationSeverity) => {
    switch (severity) {
      case 'error':
        return <DismissCircleRegular className={`${styles.resultIcon} ${styles.resultIconError}`} fontSize={14} />;
      case 'warning':
        return <WarningRegular className={`${styles.resultIcon} ${styles.resultIconWarning}`} fontSize={14} />;
      case 'info':
        return <InfoRegular className={`${styles.resultIcon} ${styles.resultIconInfo}`} fontSize={14} />;
    }
  };

  const getSeverityLabel = (severity: ValidationSeverity): string => {
    switch (severity) {
      case 'error': return '错误';
      case 'warning': return '警告';
      case 'info': return '提示';
    }
  };

  // ─── 渲染 ─────────────────────────────────

  return (
    <div className={styles.container}>
      {/* 校验范围 */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <SearchRegular fontSize={14} />
          <Text className={styles.sectionTitle}>校验范围</Text>
        </div>
        <div className={styles.scopeRow}>
          <Button
            className={scope === 'active' ? styles.scopeBtnActive : styles.scopeBtn}
            appearance={scope === 'active' ? 'primary' : 'secondary'}
            size="small"
            onClick={() => setScope('active')}
            disabled={isRunning}
          >
            当前表
          </Button>
          <Button
            className={scope === 'registered' ? styles.scopeBtnActive : styles.scopeBtn}
            appearance={scope === 'registered' ? 'primary' : 'secondary'}
            size="small"
            onClick={() => setScope('registered')}
            disabled={isRunning}
          >
            已注册表
          </Button>
          <Button
            className={scope === 'checked' ? styles.scopeBtnActive : styles.scopeBtn}
            appearance={scope === 'checked' ? 'primary' : 'secondary'}
            size="small"
            onClick={() => setScope('checked')}
            disabled={isRunning}
          >
            勾选表
          </Button>
        </div>
      </div>

      <div className={styles.divider} />

      {/* 校验规则 */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <Text className={styles.sectionTitle}>校验规则</Text>
          <Button
            appearance="transparent"
            size="small"
            onClick={toggleAllRules}
            style={{ minWidth: 'auto', padding: '0 4px', fontSize: '11px' }}
          >
            {enabledRules.size === VALIDATION_RULES.length ? '取消全选' : '全选'}
          </Button>
        </div>
        <div className={styles.rulesGrid}>
          {VALIDATION_RULES.map((rule) => (
            <Checkbox
              key={rule.key}
              className={styles.ruleCheckbox}
              label={rule.label}
              checked={enabledRules.has(rule.key)}
              onChange={() => toggleRule(rule.key)}
              disabled={isRunning}
              size="medium"
            />
          ))}
        </div>
      </div>

      <div className={styles.divider} />

      {/* 运行按钮 */}
      <div className={styles.section}>
        <Button
          className={styles.runBtn}
          icon={<PlayRegular />}
          appearance="primary"
          size="large"
          onClick={handleRunValidation}
          disabled={isRunning || enabledRules.size === 0}
        >
          {isRunning ? '校验中...' : '运行校验'}
        </Button>
      </div>

      {/* 运行中 */}
      {isRunning && (
        <div className={styles.spinnerArea}>
          <Spinner size="small" />
          <Text className={styles.spinnerText}>正在校验数据表...</Text>
        </div>
      )}

      {/* 校验结果 */}
      {!isRunning && results !== null && (
        <div className={styles.fadeIn}>
          <div className={styles.divider} />

          {/* 汇总 */}
          <div className={styles.section}>
            {counts && counts.total === 0 ? (
              <div className={styles.successState}>
                <CheckmarkCircleRegular className={styles.successIcon} />
                <Text className={styles.successText}>校验通过，未发现问题</Text>
              </div>
            ) : counts && (
              <div className={styles.summaryRow}>
                {counts.error > 0 && (
                  <span className={`${styles.badge} ${styles.badgeError}`}>
                    <DismissCircleRegular fontSize={13} />
                    错误 {counts.error}
                  </span>
                )}
                {counts.warning > 0 && (
                  <span className={`${styles.badge} ${styles.badgeWarning}`}>
                    <WarningRegular fontSize={13} />
                    警告 {counts.warning}
                  </span>
                )}
                {counts.info > 0 && (
                  <span className={`${styles.badge} ${styles.badgeInfo}`}>
                    <InfoRegular fontSize={13} />
                    提示 {counts.info}
                  </span>
                )}
                <Text className={styles.summaryTotal}>
                  共 {counts.total} 项
                </Text>
              </div>
            )}
          </div>

          {/* 结果列表 */}
          {groupedResults && groupedResults.length > 0 && (
            <div className={styles.section} style={{ paddingTop: 0 }}>
              <div className={styles.resultList}>
                {groupedResults.map((group) => (
                  <div key={group.severity}>
                    <div className={styles.groupHeader}>
                      {getSeverityLabel(group.severity)} ({group.items.length})
                    </div>
                    {group.items.map((item, idx) => (
                      <div
                        key={`${group.severity}-${idx}`}
                        className={styles.resultItem}
                        onClick={() => handleResultClick(item)}
                        title={item.location ? '点击跳转到单元格' : undefined}
                      >
                        {getSeverityIcon(item.severity)}
                        <div className={styles.resultBody}>
                          <div className={styles.resultMeta}>
                            <span className={styles.resultTableName}>{item.tableName}</span>
                            <span className={styles.resultRuleName}>{item.ruleName}</span>
                          </div>
                          <span className={styles.resultMessage}>{item.message}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 初始空状态 */}
      {!isRunning && results === null && (
        <div className={styles.emptyState}>
          <SearchRegular className={styles.emptyIcon} />
          <Text className={styles.emptyText}>
            选择校验范围和规则后，点击「运行校验」
          </Text>
        </div>
      )}
    </div>
  );
}
