import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { IdleAnimation } from './IdleAnimation';
import { HelpPanel } from './HelpPanel';
import { CommitHistoryPanel } from './CommitHistoryPanel';
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
  Dialog,
  DialogSurface,
  DialogBody,
  DialogContent,
} from '@fluentui/react-components';
import {
  ArrowExportRegular,
  SendRegular,
  HeartRegular,
  CheckmarkCircleRegular,
  DismissCircleRegular,
  WarningRegular,
  DocumentRegular,
  NavigationRegular,
  FolderOpenRegular,
  QuestionCircleRegular,
  WeatherMoonRegular,
  WeatherSunnyRegular,
  BugRegular,
  MegaphoneRegular,
  RocketRegular,
  StarRegular,
  FlagCheckeredRegular,
  JoystickRegular,
  HistoryRegular,
  ChevronRightRegular,
  ChevronDownRegular,
  DismissRegular,
  ArrowUploadRegular,
  ArrowSyncRegular,
} from '@fluentui/react-icons';
import { DiffDetailPanel } from './DiffDetailPanel';
import { ThemeContext } from '../index';
import { Config } from '../../types/config';
import { ExportJob } from '../../engine/ExportJob';
import { GitHandler } from '../../git/GitHandler';
import { GitExecutor } from '../../git/GitExecutor';
import { ExportResult, ExportProgress } from '../../types/table';
import { ExportError } from '../../types/errors';
import { excelHelper } from '../../utils/ExcelHelper';
import { configManager } from '../../v2/ConfigManager';
import { logger } from '../../utils/Logger';
import { gdsTokens } from '../theme';
import { useThemeText, themeExtraData } from '../locales';
import { getLevelInfo, grantExportXp } from '../services/PlayerStats';

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
    padding: '12px 14px 8px',
  },
  sectionTitle: {
    fontSize: '10px',
    fontWeight: 600,
    color: tokens.colorNeutralForeground3,
    letterSpacing: '0.5px',
    marginBottom: '8px',
    textTransform: 'uppercase' as const,
  },
  configCard: {
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: '8px',
    padding: '10px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    boxShadow: gdsTokens.shadow.sm,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  configRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontSize: '12px',
  },
  configLabel: {
    color: tokens.colorNeutralForeground1,
    minWidth: '60px',
    fontSize: '12px',
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
  dismissBtn: {
    minWidth: 'auto',
    padding: '2px',
    marginLeft: 'auto',
    color: tokens.colorNeutralForeground3,
    ':hover': {
      color: tokens.colorNeutralForeground1,
    },
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
  // 跟踪导出完成动画的触发时机
  const [showCompletionAnim, setShowCompletionAnim] = useState(false);
  const isGame = mode === 'game';
  const isCute = mode === 'cute';
  const isCyber = mode === 'cyber';
  const isPixel = mode === 'pixel';
  const isSpecial = isGame || isCute || isCyber || isPixel;
  // 特殊主题的 token 快捷访问
  const st = isGame ? gdsTokens.game : isCyber ? gdsTokens.cyber : isPixel ? gdsTokens.pixel : gdsTokens.cute;
  const extraData = isGame ? themeExtraData.game : isCyber ? themeExtraData.cyber : isPixel ? themeExtraData.pixel : themeExtraData.cute;
  const [levelInfo, setLevelInfo] = useState(() => getLevelInfo());
  const [earnedXp, setEarnedXp] = useState(0);
  const t = useThemeText();
  const prevExportingRef = useRef(isExporting);

  // 当新的导出开始时，重置隐藏状态；当导出完成时，触发动画
  useEffect(() => {
    if (isExporting && !prevExportingRef.current) {
      setShowCompletionAnim(false);
    }
    if (!isExporting && prevExportingRef.current && exportResult) {
      // 导出刚完成 → 触发完成动画
      setShowCompletionAnim(true);
        // Grant XP for special themes
        if (exportResult?.success) {
          const xp = grantExportXp(exportResult.changedTables, exportResult.modifiedFiles.length);
          setEarnedXp(xp);
          setLevelInfo(getLevelInfo());
        }
    }
    prevExportingRef.current = isExporting;
  }, [isExporting, exportResult]);

  // config 更新时同步本地版本号
  useEffect(() => {
    setLocalVersionNumber(String(config.outputSettings.versionNumber));
  }, [config.outputSettings.versionNumber]);

  const versionNames = useMemo(
    () => Array.from(config.versionTemplates.keys()),
    [config.versionTemplates]
  );

  // 检测 file-server 是否在线
  const [serverOnline, setServerOnline] = useState<boolean | null>(null);
  useEffect(() => {
    const check = async () => {
      for (const base of ['https://localhost:9876', 'http://localhost:9876']) {
        try {
          const ctrl = new AbortController();
          const timer = setTimeout(() => ctrl.abort(), 3000);
          const resp = await fetch(`${base}/api/read-file?directory=.&fileName=_probe`, { signal: ctrl.signal }).finally(() => clearTimeout(timer));
          if (resp.ok || resp.status === 404) { setServerOnline(true); return; }
        } catch { /* try next */ }
      }
      setServerOnline(false);
    };
    check();
  }, []);

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
    setGitPushDone(false);
    onExportStart();
    const job = new ExportJob(onProgress);
    const result = await job.runExport();
    onExportComplete(result);
  }, [localVersionNumber, config.outputSettings.versionNumber, onReloadConfig, onClearResult, onExportStart, onExportComplete, onProgress]);

  const progressValue = progress ? progress.step / progress.totalSteps : 0;
  const outputDir = config.outputSettings.outputDirectory || '';

  const warnings = useMemo(() => exportResult?.errors.filter(e => e.severity === 'warning') || [], [exportResult?.errors]);
  const errors = useMemo(() => exportResult?.errors.filter(e => e.severity === 'error') || [], [exportResult?.errors]);

  const handleNavigate = async (error: ExportError) => {
    if (error.location) {
      await excelHelper.navigateToCell(
        error.location.sheetName,
        error.location.row,
        error.location.column
      );
    }
  };

  const [expandedTable, setExpandedTable] = useState<string | null>(null);
  const [gitPushing, setGitPushing] = useState(false);
  const [gitPushDone, setGitPushDone] = useState(false);

  const handleManualGitPush = useCallback(async () => {
    if (!exportResult || gitPushing) return;
    setGitPushing(true);
    try {
      const gitHandler = new GitHandler(outputDir);
      const gitExecutor = new GitExecutor('https://localhost:9876');
      const commitMessage = gitHandler.generateCommitMessage(
        config.gitCommitTemplate,
        config.outputSettings.versionName,
        config.outputSettings.versionNumber,
        config.outputSettings.versionSequence
      );
      const result = await gitExecutor.execute(outputDir, gitHandler.generatePushCommands(exportResult.modifiedFiles, commitMessage));
      if (result.ok) {
        setGitPushDone(true);
        logger.info('手动 Git 推送成功');
      } else {
        logger.error(`手动 Git 推送失败: ${result.error}`);
      }
    } catch (err) {
      logger.error('手动 Git 推送异常', err);
    } finally {
      setGitPushing(false);
    }
  }, [exportResult, gitPushing, outputDir, config]);

  const [helpOpen, setHelpOpen] = useState(false);
  const [devLogOpen, setDevLogOpen] = useState(false);
  const [changelogOpen, setChangelogOpen] = useState(false);
  const [devLogTab, setDevLogTab] = useState<'key' | 'all'>('key');
  const [historyOpen, setHistoryOpen] = useState(false);

  return (
    <div className={styles.container}>
      {/* 当前配置 */}
      <div className={styles.configSection}>
        <div className={styles.sectionTitle}>{t.export.sectionTitle}</div>
        {isSpecial && (
          <div style={{
            background: st.xpBarBg,
            borderRadius: 6,
            padding: '8px 12px',
            marginBottom: 8,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            border: st.xpBarBorder,
          }}>
            <span style={{ fontSize: 11, color: st.xpColor, fontWeight: 700, fontFamily: gdsTokens.fontMono, whiteSpace: 'nowrap' }}>
              {extraData.levelLabel(levelInfo.level)}
            </span>
            <div style={{
              flex: 1,
              height: 8,
              borderRadius: 4,
              background: st.xpTrackBg,
              overflow: 'hidden',
            }}>
              <div style={{
                width: `${Math.min(levelInfo.progress * 100, 100)}%`,
                height: '100%',
                borderRadius: 4,
                background: st.progressGradient,
              }} />
            </div>
          </div>
        )}
        <div className={styles.configCard} style={isSpecial ? {
          border: st.cardBorder,
          boxShadow: st.cardShadow,
          backgroundColor: st.cardBg,
        } : undefined}>
          <div className={styles.configRow}>
            <span className={styles.configLabel}>{t.export.config.version}</span>
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
            <span className={styles.configLabel}>{t.export.config.versionNumber}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '2px', minWidth: 100, justifyContent: 'flex-end' }}>
              <Input
                size="small"
                value={localVersionNumber}
                onChange={(_, d) => setLocalVersionNumber(d.value)}
                onBlur={(e) => handleVersionNumberChange(e.target.value)}
                disabled={isExporting}
                style={{ width: 68 }}
              />
              <Button
                appearance="transparent"
                size="small"
                icon={<HistoryRegular fontSize={14} />}
                onClick={() => setHistoryOpen(true)}
                title={t.commitHistory.title}
                disabled={!outputDir}
                style={{ minWidth: 'auto', padding: '2px' }}
              />
            </div>
          </div>
          <div className={styles.configRow}>
            <span className={styles.configLabel}>{t.export.config.sequence}</span>
            <span className={styles.configValue}>
              {config.outputSettings.versionSequence}
            </span>
          </div>
          <div className={styles.configRow} style={{ borderBottom: 'none' }}>
            <span className={styles.configLabel}>{t.export.config.outputDir}</span>
            {outputDir ? (
              <span className={styles.configValuePath} onClick={onNavigateToManage} style={{ cursor: 'pointer' }}>
                {outputDir}
              </span>
            ) : (
              <span className={styles.configValueEmpty} onClick={onNavigateToManage}>
                <FolderOpenRegular fontSize={12} />
                {t.export.config.noOutputDir}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 导出按钮 / 导出结果摘要（完成后覆盖按钮区域） */}
      <div className={styles.actionSection}>
        {exportResult && !isExporting ? (
          <div className={`${styles.resultSummary} ${styles.resultFadeIn}`} style={isSpecial ? {
            border: st.cardBorder,
            boxShadow: st.cardShadow,
            backgroundColor: st.cardBg,
          } : undefined}>
            <div className={styles.resultSummaryRow}>
              {isSpecial ? (
                <StarRegular style={{ fontSize: 18, color: st.xpColor, flexShrink: 0 }} />
              ) : exportResult.success ? (
                <CheckmarkCircleRegular
                  className={`${styles.resultStatusIcon} ${styles.successColor} ${showCompletionAnim ? styles.successCheckAnim : ''}`}
                />
              ) : (
                <DismissCircleRegular className={`${styles.resultStatusIcon} ${styles.failColor}`} />
              )}
              <span className={styles.resultStatusText} style={isSpecial ? { color: st.xpColor } : undefined}>
                {exportResult.success
                  ? (exportResult.changedTables > 0 ? t.export.resultSuccess : t.export.resultNoChange)
                  : t.export.resultFail}
              </span>
              <span className={styles.resultDuration}>
                {exportResult.duration.toFixed(1)}s
              </span>
              {isSpecial && exportResult.success && (
                <>
                  <StarRegular style={{ fontSize: 16, color: (st as typeof gdsTokens.game).xpAccent || (st as typeof gdsTokens.game).xpColor }} />
                  <span style={{ color: (st as typeof gdsTokens.game).xpAccent || (st as typeof gdsTokens.game).xpColor, fontSize: 11, fontWeight: 700 }}>
                    {extraData.resultXp(earnedXp)}
                  </span>
                </>
              )}
              {exportResult.success && exportResult.changedTables > 0 && !exportResult.gitPushed && !gitPushDone && (
                <Button
                  className={styles.dismissBtn}
                  appearance="transparent"
                  size="small"
                  icon={<ArrowUploadRegular fontSize={14} />}
                  onClick={handleManualGitPush}
                  disabled={gitPushing}
                  title="上传到 Git"
                />
              )}
              {gitPushDone && (
                <span style={{ fontSize: '10px', color: gdsTokens.success.text, marginLeft: 'auto' }}>已上传</span>
              )}
              <Button
                className={styles.dismissBtn}
                appearance="transparent"
                size="small"
                icon={<DismissRegular fontSize={14} />}
                onClick={onClearResult}
              />
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
        ) : serverOnline === false ? (
          <div style={{
            padding: '10px 12px',
            fontSize: '11px',
            lineHeight: '1.6',
            backgroundColor: gdsTokens.warning.bg,
            borderRadius: '8px',
            border: `1px solid ${gdsTokens.warning.border}`,
            color: gdsTokens.warning.text,
          }}>
            <div style={{ fontWeight: 600, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <WarningRegular fontSize={14} />
              文件服务未启动
            </div>
            <div>Windows：重启电脑或运行开始菜单中的 GameData Studio Server</div>
            <div>Mac：终端执行 <code style={{ fontSize: '10px', backgroundColor: 'rgba(0,0,0,0.06)', padding: '1px 4px', borderRadius: '2px' }}>python3 ~/.gamedata-studio/file-server.py &</code></div>
            <Button size="small" appearance="primary" icon={<ArrowSyncRegular />} style={{ marginTop: '6px' }} onClick={() => { setServerOnline(null); setTimeout(() => { fetch('https://localhost:9876/api/read-file?directory=.&fileName=_probe').then(() => setServerOnline(true)).catch(() => setServerOnline(false)); }, 500); }}>
              重新检测
            </Button>
          </div>
        ) : (
          <>
            <div className={styles.actionRow}>
              <Button
                className={styles.exportBtn}
                icon={isGame ? <RocketRegular /> : isCute ? <HeartRegular /> : isCyber ? <SendRegular /> : isPixel ? <FlagCheckeredRegular /> : <ArrowExportRegular />}
                appearance="primary"
                onClick={handleExport}
                disabled={isExporting || !outputDir}
                size="large"
              >
                {isExporting ? t.export.exportingBtn : !outputDir ? t.export.disabledBtn : t.export.exportBtn}
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
          </>
        )}
      </div>

      {/* 导出结果详情 / 空闲占位 — 可滚动区域 */}
      <div className={styles.resultScrollArea}>
        {exportResult && !isExporting ? (
          <div className={`${styles.resultSection} ${styles.resultFadeIn}`}>

            {/* 修改文件列表 */}
            {exportResult.changedTables > 0 && (
              <div className={styles.resultCard}>
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
          <IdleAnimation active={!isExporting && !exportResult} />
        )}
      </div>

      {/* 底部签名行 */}
      <div className={styles.footer}>
        <div style={{ display: 'flex', gap: '2px' }}>
          <Button
            className={styles.helpBtn}
            appearance="transparent"
            size="small"
            icon={<MegaphoneRegular fontSize={16} />}
            onClick={() => setChangelogOpen(true)}
            title="更新公告"
          />
          <Button
            className={styles.helpBtn}
            appearance="transparent"
            size="small"
            icon={mode === 'pixel' ? <JoystickRegular fontSize={16} /> : mode === 'cyber' ? <BugRegular fontSize={16} /> : mode === 'cute' ? <HeartRegular fontSize={16} /> : mode === 'game' ? <RocketRegular fontSize={16} /> : mode === 'light' ? <WeatherMoonRegular fontSize={16} /> : <WeatherSunnyRegular fontSize={16} />}
            onClick={toggleTheme}
            title={mode === 'light' ? '深色模式' : mode === 'dark' ? '游戏模式' : mode === 'game' ? '可爱模式' : mode === 'cute' ? '赛博朋克' : mode === 'cyber' ? '像素复古' : '浅色模式'}
          />
          <Button
            className={styles.helpBtn}
            appearance="transparent"
            size="small"
            icon={<QuestionCircleRegular fontSize={16} />}
            onClick={() => setHelpOpen(true)}
            title="帮助说明"
          />
          <Button
            className={styles.helpBtn}
            appearance="transparent"
            size="small"
            icon={<BugRegular fontSize={16} />}
            onClick={() => setDevLogOpen(true)}
            title="开发者日志"
          />
        </div>
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

      {/* 开发者日志对话框 */}
      <Dialog open={devLogOpen} onOpenChange={(_, data) => setDevLogOpen(data.open)}>
        <DialogSurface style={{ maxWidth: '100%', width: '100%', margin: 0, borderRadius: 0, maxHeight: '100vh' }}>
          <DialogBody style={{ padding: 0 }}>
            <DialogContent style={{ padding: '12px', overflow: 'auto', maxHeight: '80vh' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <Button size="small" appearance={devLogTab === 'key' ? 'primary' : 'subtle'} onClick={() => setDevLogTab('key')}>关键进度</Button>
                  <Button size="small" appearance={devLogTab === 'all' ? 'primary' : 'subtle'} onClick={() => setDevLogTab('all')}>全部日志</Button>
                </div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <Button size="small" appearance="outline" onClick={async () => {
                    for (const base of ['https://localhost:9876', 'http://localhost:9876']) {
                      try { await fetch(`${base}/api/restart`); logger.info('文件服务重启请求已发送'); return; } catch { /* try next */ }
                    }
                    logger.warn('文件服务不可用，无法重启');
                  }}>重启文件服务</Button>
                  <Button size="small" appearance="outline" onClick={() => { logger.clear(); setDevLogOpen(false); setTimeout(() => setDevLogOpen(true), 0); }}>清空</Button>
                  <Button size="small" appearance="outline" onClick={() => { localStorage.removeItem('gds-theme'); localStorage.removeItem('gds-player-stats'); window.location.reload(); }}>重置主题</Button>
                </div>
              </div>
              <pre style={{
                fontSize: '11px',
                fontFamily: '"Cascadia Code", "Fira Code", Consolas, monospace',
                lineHeight: '1.5',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
                margin: 0,
                color: tokens.colorNeutralForeground1,
              }}>
                {(devLogTab === 'key' ? logger.getKeyLogs() : logger.getLogs()).join('\n') || '（暂无日志）'}
              </pre>
            </DialogContent>
          </DialogBody>
        </DialogSurface>
      </Dialog>

      {/* 提交历史对话框 */}
      <Dialog open={historyOpen} onOpenChange={(_, data) => setHistoryOpen(data.open)}>
        <DialogSurface style={{ maxWidth: '100%', width: '100%', margin: 0, borderRadius: 0, maxHeight: '100vh' }}>
          <DialogBody style={{ padding: 0 }}>
            <DialogContent style={{ padding: 0, overflow: 'auto', maxHeight: '80vh' }}>
              {historyOpen && outputDir && (
                <CommitHistoryPanel outputDirectory={outputDir} />
              )}
            </DialogContent>
          </DialogBody>
        </DialogSurface>
      </Dialog>

      {/* 更新公告对话框 */}
      <Dialog open={changelogOpen} onOpenChange={(_, data) => setChangelogOpen(data.open)}>
        <DialogSurface style={{ maxWidth: '100%', width: '100%', margin: 0, borderRadius: 0, maxHeight: '100vh' }}>
          <DialogBody style={{ padding: 0 }}>
            <DialogContent style={{ padding: '16px', overflow: 'auto', maxHeight: '80vh' }}>
              <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <MegaphoneRegular fontSize={18} />
                <span style={{ fontWeight: 600, fontSize: '14px' }}>更新公告</span>
              </div>
              <div style={{
                fontSize: '12px',
                lineHeight: '1.8',
                color: tokens.colorNeutralForeground1,
              }}>
                <div style={{ fontWeight: 600, marginBottom: '4px' }}>v1.4.0 — 导出 Diff 详情 & 体验优化</div>
                <ul style={{ margin: '0 0 12px 0', paddingLeft: '18px' }}>
                  <li>导出 Diff 详情：点击文件行展开查看逐行变更，新增/删除/修改的 key 一目了然</li>
                  <li>单元格级对比：修改行显示具体字段变化（旧值 → 新值）</li>
                  <li>导出结果覆盖按钮区域，关闭按钮一键回到待导出状态</li>
                  <li>提交历史查看与回退功能，自动 push 的安全网</li>
                  <li>结果列表隐藏 _manifest.json，只显示数据表</li>
                  <li>新增赛博朋克、像素复古两套主题</li>
                </ul>
                <div style={{ fontWeight: 600, marginBottom: '4px' }}>v1.3.0 — 多主题系统 & 设计升级</div>
                <ul style={{ margin: '0 0 12px 0', paddingLeft: '18px' }}>
                  <li>全新主题系统：支持 4 种主题循环切换（浅色 → 深色 → 飞船航行 → 二次元冒险）</li>
                  <li>飞船航行主题：版本→航线、表→设备、校验→维修、预览→试飞，完整 RPG 风格</li>
                  <li>二次元冒险主题：版本→世界、表→宝典、操作员→冒险者，粉色可爱风格</li>
                  <li>GDS 设计系统：集中式 design tokens，青色品牌色替换默认蓝</li>
                  <li>主题文本字典化：locales 架构，新增主题只需一个文件</li>
                  <li>等级/经验值系统：游戏主题显示 LV 等级条、规则经验值、成就解锁</li>
                  <li>帮助说明全面适配主题文案</li>
                  <li>Tab 图标按主题切换（Rocket/Heart/Star 等）</li>
                </ul>
                <div style={{ fontWeight: 600, marginBottom: '4px' }}>v1.2.0 — 性能大幅优化 & 多项修复</div>
                <ul style={{ margin: '0 0 12px 0', paddingLeft: '18px' }}>
                  <li>导出速度提升：POST 单次写入替代 GET 分片，批量 Excel 加载，并行写入</li>
                  <li>校验速度提升：4条规则合并为单次遍历，大表不再卡死</li>
                  <li>空值等价配置：null/NULL 等值可自定义</li>
                  <li>线路修正：roads_0 不再是总线路开关，各线路独立控制</li>
                  <li>隐藏行兼容：动态检测数据起始行</li>
                </ul>
              </div>
            </DialogContent>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </div>
  );
}
