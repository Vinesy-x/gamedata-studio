/* global Excel */

import { useState, useCallback, useMemo, useEffect, useRef, useContext } from 'react';
import {
  makeStyles,
  tokens,
  Button,
  Dropdown,
  Option,
  Input,
  Spinner,
  Text,
} from '@fluentui/react-components';
import {
  EyeRegular,
  EyeOffRegular,
  PlayRegular,
  ArrowSyncRegular,
} from '@fluentui/react-icons';
import { Config } from '../../types/config';
import { VersionPreviewer, PreviewResult } from '../../v3/VersionPreviewer';
import { gdsTokens } from '../theme';
import { useThemeText } from '../locales';
import { ThemeContext } from '../index';
import { grantPreviewXp } from '../services/PlayerStats';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0',
    minHeight: '100%',
  },
  // 版本选择区域
  configSection: {
    padding: '12px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  sectionTitle: {
    fontSize: '12px',
    fontWeight: 600,
    color: tokens.colorNeutralForeground3,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
  },
  fieldRow: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '12px',
    gap: '8px',
  },
  fieldLabel: {
    color: tokens.colorNeutralForeground3,
    minWidth: '60px',
    fontSize: '12px',
  },
  // 操作按钮区域
  actionSection: {
    padding: '0 14px 12px',
  },
  previewBtn: {
    width: '100%',
  },
  // 汇总表格
  tableSection: {
    padding: '0 14px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  tableHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryTable: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    fontSize: '11px',
  },
  th: {
    padding: '5px 6px',
    fontSize: '10px',
    fontWeight: 600,
    color: tokens.colorNeutralForeground3,
    textAlign: 'left' as const,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    whiteSpace: 'nowrap' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.3px',
    backgroundColor: tokens.colorNeutralBackground3,
  },
  td: {
    padding: '4px 6px',
    fontSize: '11px',
    color: tokens.colorNeutralForeground2,
    borderBottom: `1px solid ${tokens.colorNeutralStroke3}`,
    whiteSpace: 'nowrap' as const,
  },
  tdNumber: {
    textAlign: 'right' as const,
    fontVariantNumeric: 'tabular-nums',
  },
  tableRow: {
    cursor: 'pointer',
    ':hover': {
      backgroundColor: tokens.colorNeutralBackground1Hover,
    },
  },
  tableRowSelected: {
    cursor: 'pointer',
    backgroundColor: tokens.colorBrandBackground2,
    ':hover': {
      backgroundColor: tokens.colorBrandBackground2Hover,
    },
  },
  tableName: {
    fontWeight: 500,
    color: tokens.colorNeutralForeground1,
    maxWidth: '80px',
    overflow: 'hidden' as const,
    textOverflow: 'ellipsis' as const,
  },
  // 颜色图例
  legendSection: {
    padding: '0 14px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  legendRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '11px',
    color: tokens.colorNeutralForeground3,
  },
  legendSwatch: {
    width: '14px',
    height: '14px',
    borderRadius: '3px',
    flexShrink: 0,
  },
  legendSwatchGray: {
    backgroundColor: gdsTokens.badge.secondary.bg,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  legendSwatchYellow: {
    backgroundColor: gdsTokens.warning.bg,
    border: `1px solid ${gdsTokens.warning.border}`,
    textDecoration: 'line-through',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '8px',
    color: gdsTokens.warning.itemText,
  },
  // 无结果提示
  emptyHint: {
    padding: '24px 14px',
    textAlign: 'center' as const,
    color: tokens.colorNeutralForeground3,
    fontSize: '12px',
  },
  // 淡入动画
  fadeIn: {
    animationName: {
      from: { opacity: 0, transform: 'translateY(8px)' },
      to: { opacity: 1, transform: 'translateY(0)' },
    },
    animationDuration: '0.35s',
    animationTimingFunction: 'ease-out',
    animationFillMode: 'both',
  },
  // 有非零排除/覆盖的数字高亮
  highlightNumber: {
    color: tokens.colorPaletteRedForeground1,
    fontWeight: 600,
  },
});

interface PreviewPanelProps {
  config: Config;
}

export function PreviewPanel({ config }: PreviewPanelProps) {
  const { mode: themeMode } = useContext(ThemeContext);
  const isGame = themeMode === 'game';
  const isCute = themeMode === 'cute';
  const isSpecial = isGame || isCute;
  const t = useThemeText();
  const styles = useStyles();

  // 版本选择
  const versionNames = useMemo(
    () => Array.from(config.versionTemplates.keys()),
    [config.versionTemplates]
  );
  const [selectedVersion, setSelectedVersion] = useState(
    config.outputSettings.versionName
  );
  const [versionNumber, setVersionNumber] = useState(
    config.outputSettings.versionNumber
  );

  // 预览状态
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [results, setResults] = useState<PreviewResult[]>([]);
  const [selectedTableIdx, setSelectedTableIdx] = useState<number | null>(null);

  // 高亮状态
  const [highlightedSheet, setHighlightedSheet] = useState<string | null>(null);
  const previewerRef = useRef(new VersionPreviewer());

  // 切换选中表时，自动还原之前高亮的表
  useEffect(() => {
    const previewer = previewerRef.current;
    if (highlightedSheet) {
      const currentTable = selectedTableIdx !== null ? results[selectedTableIdx]?.tableName : null;
      if (currentTable !== highlightedSheet) {
        previewer.clearHighlights(highlightedSheet).then(() => {
          setHighlightedSheet(null);
        });
      }
    }
  }, [selectedTableIdx, results, highlightedSheet]);

  // 用 ref 跟踪最新的 highlightedSheet，供卸载时使用
  const highlightedSheetRef = useRef(highlightedSheet);
  highlightedSheetRef.current = highlightedSheet;

  // 组件卸载时还原高亮
  useEffect(() => {
    const previewer = previewerRef.current;
    return () => {
      if (highlightedSheetRef.current) {
        previewer.clearHighlights(highlightedSheetRef.current);
      }
    };
  }, []);

  // 获取需要输出的表名
  const outputTableNames = useMemo(() => {
    const names = new Set<string>();
    for (const [name, info] of config.tablesToProcess) {
      if (info.shouldOutput) {
        names.add(name);
      }
    }
    return names;
  }, [config.tablesToProcess]);

  // 执行预览
  const handlePreview = useCallback(async () => {
    setIsPreviewing(true);
    setResults([]);
    setSelectedTableIdx(null);
    setHighlightedSheet(null);

    try {
      const previewer = new VersionPreviewer();
      const previewResults = await previewer.preview(
        selectedVersion,
        versionNumber,
        config,
        outputTableNames
      );
      setResults(previewResults);
        // Grant XP for special themes
        grantPreviewXp();
    } catch {
      // 错误已在 VersionPreviewer 内部日志记录
    } finally {
      setIsPreviewing(false);
    }
  }, [selectedVersion, versionNumber, config, outputTableNames]);

  // 点击表名时：选中 + 跳转到该工作表
  const handleSelectTable = useCallback(async (idx: number) => {
    setSelectedTableIdx(idx);
    const tableName = results[idx]?.tableName;
    if (!tableName) return;
    try {
      await Excel.run(async (context) => {
        const sheet = context.workbook.worksheets.getItem(tableName);
        sheet.activate();
        await context.sync();
      });
    } catch {
      // ignore
    }
  }, [results]);

  // 高亮当前表
  const handleHighlight = useCallback(async () => {
    if (selectedTableIdx === null || !results[selectedTableIdx]) return;

    const result = results[selectedTableIdx];
    try {
      await previewerRef.current.highlightInExcel(result);
      setHighlightedSheet(result.tableName);
    } catch {
      // ignore
    }
  }, [selectedTableIdx, results]);

  // 清除高亮
  const handleClearHighlight = useCallback(async () => {
    if (selectedTableIdx === null || !results[selectedTableIdx]) return;

    const sheetName = results[selectedTableIdx].tableName;
    try {
      await previewerRef.current.clearHighlights(sheetName);
      setHighlightedSheet(null);
    } catch {
      // ignore
    }
  }, [selectedTableIdx, results]);

  return (
    <div className={styles.container}>
      {/* 版本选择 */}
      <div className={styles.configSection}>
        <Text className={styles.sectionTitle}>{t.preview.title}</Text>
        <div className={styles.fieldRow}>
          <span className={styles.fieldLabel}>{t.help.terms.version}</span>
          <Dropdown
            size="small"
            value={selectedVersion}
            onOptionSelect={(_, d) =>
              setSelectedVersion(d.optionValue || selectedVersion)
            }
            disabled={isPreviewing}
            style={{ minWidth: 120 }}
          >
            {versionNames.map((name) => (
              <Option key={name} value={name} text={name}>
                {name}
              </Option>
            ))}
          </Dropdown>
        </div>
        <div className={styles.fieldRow}>
          <span className={styles.fieldLabel}>{t.help.terms.versionNumber}</span>
          <Input
            size="small"
            type="number"
            value={String(versionNumber)}
            onChange={(_, d) => {
              const num = parseFloat(d.value);
              if (!isNaN(num)) setVersionNumber(num);
            }}
            disabled={isPreviewing}
            style={{ width: 80 }}
          />
        </div>
      </div>

      {/* 预览按钮 */}
      <div className={styles.actionSection}>
        <Button
          className={styles.previewBtn}
          icon={isPreviewing ? <ArrowSyncRegular /> : <PlayRegular />}
          appearance="primary"
          onClick={handlePreview}
          disabled={isPreviewing || outputTableNames.size === 0}
          size="medium"
        >
          {isPreviewing ? (
            <>
              <Spinner size="tiny" style={{ marginRight: 6 }} />
              {t.preview.runningBtn}
            </>
          ) : (
            t.preview.runBtn(outputTableNames.size)
          )}
        </Button>
      </div>

      {/* 汇总表格 */}
      {results.length > 0 && (
        <div className={`${styles.tableSection} ${styles.fadeIn}`}>
          <div className={styles.tableHeader}>
            <Text className={styles.sectionTitle}>
              {t.preview.statsTitle} ({results.length})
            </Text>
            <div style={{ display: 'flex', gap: '6px', marginLeft: 'auto' }}>
              <Button
                icon={<EyeRegular />}
                appearance="secondary"
                size="small"
                onClick={handleHighlight}
                disabled={selectedTableIdx === null}
              >
                数据清洗
              </Button>
              <Button
                icon={<EyeOffRegular />}
                appearance="subtle"
                size="small"
                onClick={handleClearHighlight}
                disabled={selectedTableIdx === null}
              >
                清洗结束
              </Button>
            </div>
          </div>

          <table className={styles.summaryTable}>
            <thead>
              <tr>
                <th className={styles.th}>{t.preview.colHeaders[0]}</th>
                <th className={`${styles.th} ${styles.tdNumber}`}>原始行列</th>
                <th className={`${styles.th} ${styles.tdNumber}`}>筛选行列</th>
                <th className={`${styles.th} ${styles.tdNumber}`}>排除行列</th>
                <th className={`${styles.th} ${styles.tdNumber}`}>覆盖行列</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r, idx) => (
                <tr
                  key={r.tableName}
                  className={
                    selectedTableIdx === idx
                      ? styles.tableRowSelected
                      : styles.tableRow
                  }
                  onClick={() => handleSelectTable(idx)}
                >
                  <td className={`${styles.td} ${styles.tableName}`} title={r.tableName}>
                    {r.tableName}
                  </td>
                  <td className={`${styles.td} ${styles.tdNumber}`}>
                    {r.originalRows},{r.originalCols}
                  </td>
                  <td className={`${styles.td} ${styles.tdNumber}`}>
                    {r.filteredRows},{r.filteredCols}
                  </td>
                  <td
                    className={`${styles.td} ${styles.tdNumber} ${
                      r.excludedRows.length > 0 || r.excludedCols.length > 0 ? styles.highlightNumber : ''
                    }`}
                  >
                    {r.excludedRows.length},{r.excludedCols.length}
                  </td>
                  <td
                    className={`${styles.td} ${styles.tdNumber} ${
                      r.overriddenRows.length > 0 ? styles.highlightNumber : ''
                    }`}
                  >
                    {r.overriddenRows.length},0
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 颜色图例 */}
      {results.length > 0 && (
        <div className={`${styles.legendSection} ${styles.fadeIn}`}>
          <Text
            style={{
              fontSize: '11px',
              fontWeight: 600,
              color: tokens.colorNeutralForeground3,
              marginBottom: '2px',
            }}
          >
            图例
          </Text>
          <div className={styles.legendRow}>
            <span
              className={`${styles.legendSwatch} ${styles.legendSwatchGray}`}
            />
            <span>{t.preview.legendExcluded}</span>
          </div>
          <div className={styles.legendRow}>
            <span
              className={`${styles.legendSwatch} ${styles.legendSwatchYellow}`}
            >
              ab
            </span>
            <span>黄色 + 删除线 = 被覆盖的重复 Key 行</span>
          </div>
        </div>
      )}

      {/* 无结果提示 */}
      {!isPreviewing && results.length === 0 && (
        <div className={styles.emptyHint}>
          <Text>
            {t.preview.emptyHint}
          </Text>
        </div>
      )}
    </div>
  );
}
