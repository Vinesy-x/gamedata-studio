import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { IdleAnimation } from './IdleAnimation';
import { HelpPanel } from './HelpPanel';
import {
  makeStyles,
  tokens,
  Button,
  ProgressBar,
  Text,
  Dropdown,
  Option,
  Input,
  Switch,
  Spinner,
  Dialog,
  DialogSurface,
  DialogBody,
  DialogContent,
} from '@fluentui/react-components';
import {
  ArrowExportRegular,
  ArrowUploadRegular,
  CheckmarkCircleRegular,
  DismissCircleRegular,
  WarningRegular,
  DocumentRegular,
  NavigationRegular,
  PersonRegular,
  FolderOpenRegular,
  QuestionCircleRegular,
  WeatherMoonRegular,
  WeatherSunnyRegular,
} from '@fluentui/react-icons';
import { ThemeContext } from '../index';
import { Config } from '../../types/config';
import { ExportJob } from '../../engine/ExportJob';
import { GitHandler } from '../../git/GitHandler';
import { ExportResult, ExportProgress } from '../../types/table';
import { ExportError } from '../../types/errors';
import { excelHelper } from '../../utils/ExcelHelper';
import { configManager } from '../../v2/ConfigManager';
import { operatorIdentity } from '../../v2/OperatorIdentity';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0',
    height: '100%',
    overflow: 'hidden',
  },
  // 当前配置区域
  configSection: {
    padding: '14px 14px 10px',
  },
  configCard: {
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: '8px',
    padding: '0',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)',
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    overflow: 'hidden' as const,
  },
  configRow: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '12px',
    padding: '8px 12px',
    borderBottom: `1px solid ${tokens.colorNeutralStroke3}`,
    ':last-child': {
      borderBottom: 'none',
    },
  },
  configLabel: {
    color: tokens.colorNeutralForeground3,
    minWidth: '60px',
    fontSize: '11px',
  },
  configValue: {
    fontWeight: 600,
    color: tokens.colorNeutralForeground1,
  },
  configValuePath: {
    fontSize: '11px',
    color: tokens.colorNeutralForeground2,
    wordBreak: 'break-all',
    lineHeight: '1.4',
  },
  configValueEmpty: {
    fontSize: '11px',
    color: tokens.colorBrandForeground1,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    ':hover': {
      textDecorationLine: 'underline',
    },
  },
  // 操作按钮区域
  actionSection: {
    padding: '4px 14px 14px',
  },
  actionRow: {
    display: 'flex',
    gap: '8px',
  },
  exportBtn: {
    flex: 1,
  },
  gitBtn: {
    minWidth: 'auto',
    paddingLeft: '12px',
    paddingRight: '12px',
  },
  progressArea: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    marginTop: '8px',
  },
  progressText: {
    fontSize: '11px',
    color: tokens.colorNeutralForeground3,
  },
  // 导出结果区域
  resultSection: {
    padding: '0 14px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  // 结果摘要行：成功/失败 + 耗时 + 统计图标
  resultSummary: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 12px',
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)',
    border: `1px solid ${tokens.colorNeutralStroke2}`,
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
    gap: '10px',
    marginLeft: 'auto',
    flexShrink: 0,
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
    color: '#9D5D00',
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
    boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)',
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
  // 警告/错误
  warningCard: {
    backgroundColor: '#FFF8E1',
    borderRadius: '8px',
    padding: '10px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    border: '1px solid #FFE082',
  },
  warningHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '12px',
    fontWeight: 600,
    color: '#9D5D00',
  },
  warningItem: {
    fontSize: '11px',
    color: '#6B4000',
    lineHeight: '1.4',
    wordBreak: 'break-all',
  },
  errorCard: {
    backgroundColor: '#FFF5F5',
    borderRadius: '8px',
    padding: '10px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    border: '1px solid #FFCDD2',
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
  // 导出完成时的淡入动画
  resultFadeIn: {
    animationName: {
      from: { opacity: 0, transform: 'translateY(8px)' },
      to: { opacity: 1, transform: 'translateY(0)' },
    },
    animationDuration: '0.35s',
    animationTimingFunction: 'ease-out',
    animationFillMode: 'both',
  },
  // 成功勾选动画
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
  // 文件数量徽标
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
  footer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 14px',
    marginTop: 'auto',
    fontSize: '10px',
    color: tokens.colorNeutralForeground4,
    fontFamily: '"Cascadia Code", "Fira Code", Consolas, monospace',
    letterSpacing: '1px',
    userSelect: 'none' as const,
  },
  helpBtn: {
    minWidth: 'auto',
    padding: '0',
    width: '20px',
    height: '20px',
    color: tokens.colorNeutralForeground4,
    ':hover': {
      color: tokens.colorBrandForeground1,
    },
  },
  helpDialogContent: {
    maxHeight: '70vh',
    overflowY: 'auto' as const,
    padding: '0',
  },
  // 结果区域需要可滚动
  resultScrollArea: {
    flex: 1,
    overflowY: 'auto' as const,
    minHeight: 0,
  },
});

interface ExportTabProps {
  config: Config;
  isExporting: boolean;
  progress: ExportProgress | null;
  exportResult: ExportResult | null;
  onExportStart: () => void;
  onExportComplete: (result: ExportResult) => void;
  onProgress: (progress: ExportProgress) => void;
  onReloadConfig: () => void;
  onClearResult: () => void;
  monitorEnabled: boolean;
  monitorStatus: 'idle' | 'watching' | 'exporting';
  onToggleMonitor: (enabled: boolean) => void;
  onNavigateToManage: () => void;
}

export function ExportTab({
  config,
  isExporting,
  progress,
  exportResult,
  onExportStart,
  onExportComplete,
  onProgress,
  onReloadConfig,
  onClearResult,
  monitorEnabled,
  monitorStatus,
  onToggleMonitor,
  onNavigateToManage,
}: ExportTabProps) {
  const styles = useStyles();
  const { mode, toggle: toggleTheme } = useContext(ThemeContext);
  const [changingVersion, setChangingVersion] = useState(false);
  // 版本号本地输入状态（受控模式，确保点导出时能拿到最新值）
  const [localVersionNumber, setLocalVersionNumber] = useState(String(config.outputSettings.versionNumber));
  // 本地状态：Git 上传后隐藏导出结果，恢复空闲界面
  const [resultDismissed, setResultDismissed] = useState(false);
  // 跟踪导出完成动画的触发时机
  const [showCompletionAnim, setShowCompletionAnim] = useState(false);
  const prevExportingRef = useRef(isExporting);
  // Git 按钮错误提示
  const [gitError, setGitError] = useState(false);

  // 当新的导出开始时，重置隐藏状态；当导出完成时，触发动画
  useEffect(() => {
    if (isExporting && !prevExportingRef.current) {
      // 导出开始 → 重置隐藏状态
      setResultDismissed(false);
      setShowCompletionAnim(false);
    }
    if (!isExporting && prevExportingRef.current && exportResult) {
      // 导出刚完成 → 触发完成动画
      setShowCompletionAnim(true);
    }
    prevExportingRef.current = isExporting;
  }, [isExporting, exportResult]);

  // config 更新时同步本地版本号
  useEffect(() => {
    setLocalVersionNumber(String(config.outputSettings.versionNumber));
  }, [config.outputSettings.versionNumber]);

  const currentOperator = operatorIdentity.get();
  const versionNames = useMemo(
    () => Array.from(config.versionTemplates.keys()),
    [config.versionTemplates]
  );

  const handleVersionChange = useCallback(async (newVersionName: string) => {
    if (newVersionName === config.outputSettings.versionName) return;
    setChangingVersion(true);
    try {
      await configManager.setOutputVersion(newVersionName);
      onReloadConfig();
    } finally {
      setChangingVersion(false);
    }
  }, [config.outputSettings.versionName, onReloadConfig]);

  const handleVersionNumberChange = useCallback(async (newNum: string) => {
    const num = parseFloat(newNum);
    if (isNaN(num) || num === config.outputSettings.versionNumber) return;
    try {
      await configManager.setOutputVersionNumber(num);
      onReloadConfig();
    } catch { /* ignore */ }
  }, [config.outputSettings.versionNumber, onReloadConfig]);


  const handleExport = useCallback(async () => {
    // 导出前先同步本地版本号（用户可能输入了但没按 Enter/blur）
    const num = parseFloat(localVersionNumber);
    if (!isNaN(num) && num !== config.outputSettings.versionNumber) {
      await configManager.setOutputVersionNumber(num);
      onReloadConfig();
    }

    onClearResult();
    setResultDismissed(false);
    onExportStart();
    const job = new ExportJob(onProgress);
    const result = await job.runExport();
    onExportComplete(result);
  }, [localVersionNumber, config.outputSettings.versionNumber, onReloadConfig, onClearResult, onExportStart, onExportComplete, onProgress]);

  const gitHandler = useMemo(
    () => new GitHandler(config.outputSettings.outputDirectory || ''),
    [config.outputSettings.outputDirectory]
  );

  const handleGitPush = useCallback(async () => {
    if (!exportResult || exportResult.modifiedFiles.length === 0) return;

    // 检查输出目录是否已配置（无目录则无法 git 操作）
    const outDir = config.outputSettings.outputDirectory || '';
    if (!outDir) {
      setGitError(true);
      setTimeout(() => setGitError(false), 3000);
      setResultDismissed(true);
      return;
    }

    const commitMessage = gitHandler.generateCommitMessage(
      config.gitCommitTemplate,
      config.outputSettings.versionName,
      config.outputSettings.versionNumber,
      config.outputSettings.versionSequence
    );
    const script = gitHandler.getFullPushScript(exportResult.modifiedFiles, commitMessage);

    if (!script) {
      setGitError(true);
      setTimeout(() => setGitError(false), 3000);
      setResultDismissed(true);
      return;
    }

    try {
      await navigator.clipboard.writeText(script);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = script;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }

    // Git 上传后，重置导出结果区域回到空闲状态
    setResultDismissed(true);
    onClearResult();
  }, [exportResult, gitHandler, config, onClearResult]);

  const progressValue = progress ? progress.step / progress.totalSteps : 0;
  const outputDir = config.outputSettings.outputDirectory || '';

  const warnings = exportResult?.errors.filter(e => e.severity === 'warning') || [];
  const errors = exportResult?.errors.filter(e => e.severity === 'error') || [];

  const handleNavigate = async (error: ExportError) => {
    if (error.location) {
      await excelHelper.navigateToCell(
        error.location.sheetName,
        error.location.row,
        error.location.column
      );
    }
  };

  const [helpOpen, setHelpOpen] = useState(false);

  // 当结果被用户（Git 上传后）主动隐藏时，不显示导出结果
  const visibleResult = resultDismissed ? null : exportResult;
  const canGitPush = visibleResult && !isExporting && visibleResult.success && visibleResult.modifiedFiles.length > 0;

  return (
    <div className={styles.container}>
      {/* 当前配置 */}
      <div className={styles.configSection}>
        <div className={styles.configCard}>
          <div className={styles.configRow}>
            <span className={styles.configLabel}>输出版本</span>
            <Dropdown
              size="small"
              value={config.outputSettings.versionName}
              onOptionSelect={(_, d) => handleVersionChange(d.optionValue || '')}
              disabled={isExporting || changingVersion}
              style={{ minWidth: 100 }}
            >
              {versionNames.map(name => (
                <Option key={name} value={name} text={name}>{name}</Option>
              ))}
            </Dropdown>
          </div>
          <div className={styles.configRow}>
            <span className={styles.configLabel}>版本号</span>
            <Input
              size="small"
              value={localVersionNumber}
              onChange={(_, d) => setLocalVersionNumber(d.value)}
              onBlur={(e) => handleVersionNumberChange(e.target.value)}
              disabled={isExporting}
              style={{ width: 80 }}
            />
          </div>
          <div className={styles.configRow}>
            <span className={styles.configLabel}>序列号</span>
            <span className={styles.configValue}>
              {config.outputSettings.versionSequence}
            </span>
          </div>
          {currentOperator && (
            <div className={styles.configRow}>
              <span className={styles.configLabel}>操作员</span>
              <span className={styles.configValue}>
                <PersonRegular fontSize={12} style={{ marginRight: 3 }} />
                {currentOperator}
              </span>
            </div>
          )}
          <div className={styles.configRow}>
            <span className={styles.configLabel}>协同监听</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Switch
                checked={monitorEnabled}
                onChange={(_, data) => onToggleMonitor(data.checked)}
                disabled={isExporting && !monitorEnabled}
              />
              {monitorStatus === 'watching' && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#107C10' }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#107C10', display: 'inline-block' }} />
                  监听中
                </span>
              )}
              {monitorStatus === 'exporting' && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: tokens.colorBrandForeground1 }}>
                  <Spinner size="extra-tiny" />
                  正在协同导出...
                </span>
              )}
              {monitorStatus === 'idle' && !monitorEnabled && (
                <span style={{ fontSize: '11px', color: tokens.colorNeutralForeground4 }}>
                  已关闭
                </span>
              )}
            </div>
          </div>
          <div className={styles.configRow} style={{ borderBottom: 'none' }}>
            <span className={styles.configLabel}>导出目录</span>
            {outputDir ? (
              <span className={styles.configValuePath} onClick={onNavigateToManage} style={{ cursor: 'pointer' }}>
                {outputDir}
              </span>
            ) : (
              <span className={styles.configValueEmpty} onClick={onNavigateToManage}>
                <FolderOpenRegular fontSize={12} />
                点击前往配置
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 导出 + Git上传 按钮并排 */}
      <div className={styles.actionSection}>
        <div className={styles.actionRow}>
          <Button
            className={styles.exportBtn}
            icon={<ArrowExportRegular />}
            appearance="primary"
            onClick={handleExport}
            disabled={isExporting || !outputDir}
            size="large"
          >
            {isExporting ? '导出中...' : !outputDir ? '请先选择导出目录' : '开始导出'}
          </Button>
          <Button
            className={styles.gitBtn}
            icon={<ArrowUploadRegular />}
            appearance="secondary"
            onClick={handleGitPush}
            disabled={!canGitPush && !gitError}
            size="large"
            style={gitError ? { color: tokens.colorPaletteRedForeground1, borderColor: tokens.colorPaletteRedBorder1 } : undefined}
          >
            {gitError ? 'Git 失败' : 'Git'}
          </Button>
        </div>

        {isExporting && progress && (
          <div className={styles.progressArea}>
            <ProgressBar value={progressValue} />
            <Text className={styles.progressText}>
              [{progress.step}/{progress.totalSteps}] {progress.message}
            </Text>
          </div>
        )}
      </div>

      {/* 导出结果 / 空闲占位 — 可滚动区域 */}
      <div className={styles.resultScrollArea}>
        {visibleResult && !isExporting ? (
          <div className={`${styles.resultSection} ${styles.resultFadeIn}`}>
            {/* 摘要行：状态 + 耗时 + 统计 */}
            <div className={styles.resultSummary}>
              {visibleResult.success ? (
                <CheckmarkCircleRegular
                  className={`${styles.resultStatusIcon} ${styles.successColor} ${showCompletionAnim ? styles.successCheckAnim : ''}`}
                />
              ) : (
                <DismissCircleRegular className={`${styles.resultStatusIcon} ${styles.failColor}`} />
              )}
              <span className={styles.resultStatusText}>
                {visibleResult.success ? '导出成功' : '导出失败'}
              </span>
              <span className={styles.resultDuration}>
                {visibleResult.duration.toFixed(1)}s
              </span>
              <div className={styles.resultStats}>
                {visibleResult.modifiedFiles.length > 0 && (
                  <span className={`${styles.statItem} ${styles.statFiles}`}>
                    <DocumentRegular fontSize={13} />
                    <span className={styles.fileCountBadge}>{visibleResult.modifiedFiles.length}</span>
                  </span>
                )}
                {warnings.length > 0 && (
                  <span className={`${styles.statItem} ${styles.statWarnings}`}>
                    <WarningRegular fontSize={13} />
                    {warnings.length}
                  </span>
                )}
                {errors.length > 0 && (
                  <span className={`${styles.statItem} ${styles.statErrors}`}>
                    <DismissCircleRegular fontSize={13} />
                    {errors.length}
                  </span>
                )}
              </div>
            </div>

            {/* 修改文件列表 */}
            {visibleResult.modifiedFiles.length > 0 && (
              <div className={styles.resultCard}>
                <div className={styles.fileList}>
                  {visibleResult.modifiedFiles.map((file, i) => {
                    const diff = visibleResult.tableDiffs?.find(d => d.tableName + '.xlsx' === file);
                    const rowDelta = diff ? diff.totalRows - diff.previousRows : 0;
                    return (
                      <div key={i} className={styles.fileItem}>
                        <DocumentRegular className={styles.fileIcon} fontSize={13} />
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
                    );
                  })}
                </div>
              </div>
            )}

            {/* 校验警告 */}
            {warnings.length > 0 && (
              <div className={styles.warningCard}>
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

            {/* 错误 */}
            {errors.length > 0 && (
              <div className={styles.errorCard}>
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
        ) : !isExporting && (
          <IdleAnimation active={!isExporting && !(exportResult && !resultDismissed)} />
        )}
      </div>

      {/* 底部签名行 */}
      <div className={styles.footer}>
        <Button
          className={styles.helpBtn}
          appearance="transparent"
          size="small"
          icon={<QuestionCircleRegular fontSize={16} />}
          onClick={() => setHelpOpen(true)}
        />
        <Button
          className={styles.helpBtn}
          appearance="transparent"
          size="small"
          icon={mode === 'light' ? <WeatherMoonRegular fontSize={16} /> : <WeatherSunnyRegular fontSize={16} />}
          onClick={toggleTheme}
          title={mode === 'light' ? '切换到深色模式' : '切换到浅色模式'}
        />
        <span style={{ opacity: 0.35 }}>vin {__APP_VERSION__}</span>
      </div>

      {/* 帮助对话框 */}
      <Dialog open={helpOpen} onOpenChange={(_, data) => setHelpOpen(data.open)}>
        <DialogSurface style={{ maxWidth: '100%', width: '100%', margin: 0, borderRadius: 0, maxHeight: '100vh' }}>
          <DialogBody style={{ padding: 0 }}>
            <DialogContent className={styles.helpDialogContent}>
              <HelpPanel />
            </DialogContent>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </div>
  );
}
