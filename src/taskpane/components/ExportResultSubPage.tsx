import { useState, useMemo } from 'react';
import { makeStyles, tokens, Button, Text } from '@fluentui/react-components';
import {
  CheckmarkCircleRegular, DismissCircleRegular, WarningRegular,
  DocumentRegular, NavigationRegular, ChevronRightRegular, ChevronDownRegular,
  ArrowUploadRegular, StarRegular, FolderOpenRegular,
} from '@fluentui/react-icons';
import { DiffDetailPanel } from './DiffDetailPanel';
import { Config } from '../../types/config';
import { ExportResult } from '../../types/table';
import { ExportError } from '../../types/errors';
import { excelHelper } from '../../utils/ExcelHelper';
import { gdsTokens } from '../theme';
import { useThemeText, themeExtraData } from '../locales';

interface ExportResultSubPageProps {
  config: Config;
  exportResult: ExportResult | null;
  isExporting: boolean;
  showCompletionAnim: boolean;
  outputDir: string;
  // Git push
  commitMessage: string;
  onCommitMessageChange: (msg: string) => void;
  onGitPush: () => void;
  gitPushing: boolean;
  gitPushDone: boolean;
  // Theme
  mode: string;
}

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    overflowY: 'auto',
    padding: '0 14px 14px',
    gap: '10px',
  },
  outputDir: {
    fontSize: '11px',
    color: tokens.colorNeutralForeground3,
    wordBreak: 'break-all',
    lineHeight: '1.4',
    padding: '6px 0 0',
  },
  // 提交面板
  commitCard: {
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: '8px',
    padding: '10px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    boxShadow: gdsTokens.shadow.sm,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  commitTextarea: {
    fontSize: '12px',
    fontFamily: 'monospace',
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: '6px',
    width: '100%',
    resize: 'vertical' as const,
    minHeight: '48px',
    padding: '6px 8px',
    backgroundColor: tokens.colorNeutralBackground1,
    color: tokens.colorNeutralForeground1,
    outline: 'none',
    boxSizing: 'border-box' as const,
  },
  commitActions: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: '8px',
  },
  pushDoneText: {
    fontSize: '10px',
    color: gdsTokens.success.text,
  },
  placeholder: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 0',
    fontSize: '12px',
    color: tokens.colorNeutralForeground3,
  },
  // 结果摘要
  resultSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  resultSummary: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    padding: '10px 12px',
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: '8px',
    boxShadow: gdsTokens.shadow.sm,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  resultSummaryRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  resultStatusIcon: {
    fontSize: '18px',
    flexShrink: 0,
  },
  successColor: {
    color: tokens.colorPaletteGreenForeground1,
  },
  failColor: {
    color: tokens.colorPaletteRedForeground1,
  },
  resultStatusText: {
    fontSize: '13px',
    fontWeight: 600,
  },
  resultDuration: {
    fontSize: '11px',
    color: tokens.colorNeutralForeground3,
  },
  resultStats: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  statItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '3px',
    fontSize: '11px',
  },
  statFiles: {
    color: tokens.colorBrandForeground1,
  },
  statWarnings: {
    color: gdsTokens.warning.text,
  },
  statErrors: {
    color: tokens.colorPaletteRedForeground1,
  },
  // 文件列表
  resultCard: {
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: '8px',
    padding: '10px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    boxShadow: gdsTokens.shadow.sm,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  fileList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1px',
  },
  fileItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '6px',
    fontSize: '11px',
    padding: '3px 0',
    color: tokens.colorNeutralForeground2,
  },
  fileIcon: {
    color: tokens.colorNeutralForeground3,
    marginTop: '2px',
    flexShrink: 0,
  },
  filePath: {
    wordBreak: 'break-all',
    lineHeight: '1.4',
  },
  diffInfo: {
    fontSize: '10px',
    color: tokens.colorNeutralForeground3,
    marginLeft: 'auto',
    whiteSpace: 'nowrap' as const,
    flexShrink: 0,
  },
  diffPositive: {
    color: tokens.colorPaletteGreenForeground1,
    fontWeight: 600,
  },
  diffNegative: {
    color: tokens.colorPaletteRedForeground1,
    fontWeight: 600,
  },
  diffNewBadge: {
    fontSize: '10px',
    color: tokens.colorPaletteGreenForeground1,
    fontWeight: 600,
  },
  fileNameGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '1px',
    minWidth: 0,
    flex: 1,
  },
  chineseName: {
    fontSize: '10px',
    color: tokens.colorNeutralForeground3,
  },
  fileItemClickable: {
    cursor: 'pointer',
    ':hover': {
      backgroundColor: tokens.colorNeutralBackground1Hover,
    },
  },
  chevron: {
    color: tokens.colorNeutralForeground3,
    marginTop: '2px',
    flexShrink: 0,
    transition: 'transform 0.15s ease',
  },
  // 警告/错误
  warningCard: {
    backgroundColor: gdsTokens.warning.bg,
    borderRadius: '8px',
    padding: '10px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    border: `1px solid ${gdsTokens.warning.border}`,
  },
  warningHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '12px',
    fontWeight: 600,
    color: gdsTokens.warning.text,
  },
  warningItem: {
    fontSize: '11px',
    color: gdsTokens.warning.itemText,
    lineHeight: '1.4',
    wordBreak: 'break-all',
  },
  errorCard: {
    backgroundColor: gdsTokens.error.bg,
    borderRadius: '8px',
    padding: '10px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    border: `1px solid ${gdsTokens.error.border}`,
  },
  errorHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '12px',
    fontWeight: 600,
    color: tokens.colorPaletteRedForeground1,
  },
  errorItem: {
    fontSize: '11px',
    color: tokens.colorPaletteRedForeground1,
    lineHeight: '1.4',
    wordBreak: 'break-all',
  },
  navigateLink: {
    minWidth: 'auto',
    padding: '0 2px',
    fontSize: '10px',
    height: 'auto',
  },
  // 动画
  resultFadeIn: {
    animationName: {
      from: { opacity: 0, transform: 'translateY(8px)' },
      to: { opacity: 1, transform: 'translateY(0)' },
    },
    animationDuration: '0.35s',
    animationTimingFunction: 'ease-out',
    animationFillMode: 'both',
  },
  successCheckAnim: {
    animationName: {
      '0%': { transform: 'scale(0.5)', opacity: 0 },
      '60%': { transform: 'scale(1.15)' },
      '100%': { transform: 'scale(1)', opacity: 1 },
    },
    animationDuration: '0.4s',
    animationTimingFunction: 'ease-out',
    animationFillMode: 'both',
  },
  fileCountBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tokens.colorBrandBackground,
    color: tokens.colorNeutralForegroundOnBrand,
    fontSize: '10px',
    fontWeight: 700,
    borderRadius: '10px',
    padding: '1px 7px',
    minWidth: '18px',
    marginLeft: '4px',
  },
});

type SpecialMode = 'game' | 'cute' | 'cyber' | 'pixel';

function isSpecialMode(mode: string): mode is SpecialMode {
  return mode === 'game' || mode === 'cute' || mode === 'cyber' || mode === 'pixel';
}

export const ExportResultSubPage: React.FC<ExportResultSubPageProps> = ({
  config,
  exportResult,
  isExporting,
  showCompletionAnim,
  outputDir,
  commitMessage,
  onCommitMessageChange,
  onGitPush,
  gitPushing,
  gitPushDone,
  mode,
}) => {
  const styles = useStyles();
  const t = useThemeText();
  const [expandedTable, setExpandedTable] = useState<string | null>(null);

  const isSpecial = isSpecialMode(mode);
  const st = isSpecial ? gdsTokens[mode] : null;
  const extraData = isSpecial ? themeExtraData[mode] : null;

  const warnings = useMemo(
    () => exportResult?.errors.filter(e => e.severity === 'warning') ?? [],
    [exportResult],
  );
  const errors = useMemo(
    () => exportResult?.errors.filter(e => e.severity === 'error') ?? [],
    [exportResult],
  );

  const handleNavigate = async (error: ExportError) => {
    if (error.location) {
      await excelHelper.navigateToCell(
        error.location.sheetName,
        error.location.row,
        error.location.column,
      );
    }
  };

  const showCommitPanel =
    exportResult &&
    !isExporting &&
    exportResult.success &&
    exportResult.changedTables > 0;

  // --- Render ---

  if (!exportResult && !isExporting) {
    return (
      <div className={styles.root}>
        <div className={styles.placeholder}>导出完成后在此查看结果</div>
      </div>
    );
  }

  return (
    <div className={styles.root}>
      {/* 1. 导出目录 */}
      {outputDir && (
        <div className={styles.outputDir}>
          <FolderOpenRegular fontSize={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
          {outputDir}
        </div>
      )}

      {/* 2. 提交面板 */}
      {showCommitPanel && (
        <div className={styles.commitCard} style={isSpecial && st ? {
          border: st.cardBorder,
          boxShadow: st.cardShadow,
          backgroundColor: st.cardBg,
        } : undefined}>
          <textarea
            className={styles.commitTextarea}
            value={commitMessage}
            onChange={e => onCommitMessageChange(e.target.value)}
            disabled={gitPushing || gitPushDone}
            placeholder="提交信息..."
          />
          <div className={styles.commitActions}>
            {gitPushDone ? (
              <span className={styles.pushDoneText}>{t.export.pushDone}</span>
            ) : (
              <Button
                appearance="primary"
                size="small"
                icon={<ArrowUploadRegular fontSize={14} />}
                onClick={onGitPush}
                disabled={gitPushing || !commitMessage.trim()}
              >
                {gitPushing ? t.export.pushingBtn : t.export.pushBtn}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* 3. 结果摘要卡片 */}
      {exportResult && !isExporting && (
        <div className={`${styles.resultSummary} ${styles.resultFadeIn}`} style={isSpecial && st ? {
          border: st.cardBorder,
          boxShadow: st.cardShadow,
          backgroundColor: st.cardBg,
        } : undefined}>
          <div className={styles.resultSummaryRow}>
            {isSpecial && st ? (
              <StarRegular style={{ fontSize: 18, color: st.xpColor, flexShrink: 0 }} />
            ) : exportResult.success ? (
              <CheckmarkCircleRegular
                className={`${styles.resultStatusIcon} ${styles.successColor} ${showCompletionAnim ? styles.successCheckAnim : ''}`}
              />
            ) : (
              <DismissCircleRegular className={`${styles.resultStatusIcon} ${styles.failColor}`} />
            )}
            <span className={styles.resultStatusText} style={isSpecial && st ? { color: st.xpColor } : undefined}>
              {exportResult.success
                ? (exportResult.changedTables > 0 ? t.export.resultSuccess : t.export.resultNoChange)
                : t.export.resultFail}
            </span>
            <span className={styles.resultDuration}>
              {exportResult.duration.toFixed(1)}s
            </span>
            {isSpecial && st && extraData && exportResult.success && (
              <>
                <StarRegular style={{ fontSize: 16, color: (st as typeof gdsTokens.game).xpAccent || st.xpColor }} />
              </>
            )}
          </div>
          <div className={styles.resultStats}>
            {exportResult.changedTables > 0 && (
              <span className={`${styles.statItem} ${styles.statFiles}`}>
                {t.export.statFiles(exportResult.changedTables)}
              </span>
            )}
            {warnings.length > 0 && (
              <span className={`${styles.statItem} ${styles.statWarnings}`}>
                {t.export.statWarnings(warnings.length)}
              </span>
            )}
            {errors.length > 0 && (
              <span className={`${styles.statItem} ${styles.statErrors}`}>
                {t.export.statErrors(errors.length)}
              </span>
            )}
            {errors.length === 0 && (
              <span className={`${styles.statItem} ${styles.statErrors}`} style={{ color: gdsTokens.success.text }}>
                {t.export.statErrors(0)}
              </span>
            )}
          </div>
        </div>
      )}

      {/* 4. 文件列表卡片 */}
      {exportResult && !isExporting && exportResult.changedTables > 0 && (
        <div className={`${styles.resultCard} ${styles.resultFadeIn}`}>
          <div className={styles.fileList}>
            {exportResult.modifiedFiles.filter(f => !f.startsWith('_')).map((file) => {
              const diff = exportResult.tableDiffs?.find(d => d.tableName + '.xlsx' === file);
              const rowDelta = diff ? diff.totalRows - diff.previousRows : 0;
              const hasDiffDetail = !!diff?.diffDetail;
              const isExpanded = expandedTable === file;
              return (
                <div key={file}>
                  <div
                    className={`${styles.fileItem} ${hasDiffDetail ? styles.fileItemClickable : ''}`}
                    onClick={hasDiffDetail ? () => setExpandedTable(isExpanded ? null : file) : undefined}
                  >
                    {hasDiffDetail ? (
                      isExpanded
                        ? <ChevronDownRegular className={styles.chevron} fontSize={13} />
                        : <ChevronRightRegular className={styles.chevron} fontSize={13} />
                    ) : (
                      <DocumentRegular className={styles.fileIcon} fontSize={13} />
                    )}
                    <div className={styles.fileNameGroup}>
                      <span className={styles.filePath}>{file}</span>
                      {diff && <span className={styles.chineseName}>{diff.chineseName}</span>}
                    </div>
                    {diff && (
                      <span className={styles.diffInfo}>
                        {diff.status === 'new' ? (
                          <span className={styles.diffNewBadge}>{diff.totalRows} 行</span>
                        ) : diff.previousRows > 0 ? (
                          <>
                            {diff.previousRows} → {diff.totalRows} 行{' '}
                            {rowDelta !== 0 && (
                              <span className={rowDelta > 0 ? styles.diffPositive : styles.diffNegative}>
                                ({rowDelta > 0 ? '+' : ''}{rowDelta})
                              </span>
                            )}
                          </>
                        ) : (
                          <>{diff.totalRows} 行</>
                        )}
                      </span>
                    )}
                  </div>
                  {isExpanded && diff?.diffDetail && (
                    <DiffDetailPanel diffDetail={diff.diffDetail} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. 警告卡片 */}
      {exportResult && !isExporting && warnings.length > 0 && (
        <div className={`${styles.warningCard} ${styles.resultFadeIn}`}>
          <div className={styles.warningHeader}>
            <WarningRegular fontSize={16} />
            <span>[dataValidation] 共 {warnings.length} 处警告</span>
          </div>
          {warnings.slice(0, 10).map((w, i) => (
            <div key={i} className={styles.warningItem}>
              [{w.code}] {w.message}
              {w.tableName && ` (工作表: ${w.tableName})`}
              {w.location && (
                <Button
                  className={styles.navigateLink}
                  appearance="transparent"
                  size="small"
                  icon={<NavigationRegular fontSize={10} />}
                  onClick={() => handleNavigate(w)}
                />
              )}
            </div>
          ))}
          {warnings.length > 10 && (
            <div className={styles.warningItem}>
              ...等共 {warnings.length} 处
            </div>
          )}
        </div>
      )}

      {/* 6. 错误卡片 */}
      {exportResult && !isExporting && errors.length > 0 && (
        <div className={`${styles.errorCard} ${styles.resultFadeIn}`}>
          <div className={styles.errorHeader}>
            <DismissCircleRegular fontSize={16} />
            <span>错误 ({errors.length})</span>
          </div>
          {errors.map((e, i) => (
            <div key={i} className={styles.errorItem}>
              [{e.code}] {e.message}
              {e.tableName && ` (工作表: ${e.tableName})`}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
