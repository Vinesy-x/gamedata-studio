import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { IdleAnimation } from './IdleAnimation';
import { HelpPanel } from './HelpPanel';
import { ExportResultSubPage } from './ExportResultSubPage';
import { ExportLogSubPage } from './ExportLogSubPage';
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
  WarningRegular,
  FolderOpenRegular,
  QuestionCircleRegular,
  WeatherMoonRegular,
  WeatherSunnyRegular,
  BugRegular,
  MegaphoneRegular,
  RocketRegular,
  FlagCheckeredRegular,
  JoystickRegular,
  ArrowSyncRegular,
  ArrowExportFilled,
  DocumentCheckmarkRegular,
  HistoryRegular,
} from '@fluentui/react-icons';
import { ThemeContext } from '../index';
import { Config } from '../../types/config';
import { ExportJob } from '../../engine/ExportJob';
import { GitHandler } from '../../git/GitHandler';
import { GitExecutor } from '../../git/GitExecutor';
import { ExportResult, ExportProgress } from '../../types/table';
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
    minWidth: '28px',
    minHeight: '28px',
    padding: '4px',
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
  subNav: {
    display: 'flex',
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  subNavItem: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4px',
    padding: '8px 0',
    fontSize: '12px',
    color: tokens.colorNeutralForeground3,
    cursor: 'pointer',
    borderBottom: '2px solid transparent',
    userSelect: 'none' as const,
    ':hover': {
      backgroundColor: tokens.colorNeutralBackground2,
    },
  },
  subNavActive: {
    color: tokens.colorBrandForeground1,
    borderBottomColor: tokens.colorBrandForeground1,
    fontWeight: 600,
  },
  subPageContent: {
    flex: 1,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
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
  const displaySequence = exportResult?.finalSequence ?? config.outputSettings.versionSequence;
  const [subPage, setSubPage] = useState<'export' | 'result' | 'log'>(() => exportResult ? 'result' : 'export');
  const [commitMessage, setCommitMessage] = useState(() => {
    if (!exportResult) return '';
    const gitHandler = new GitHandler(config.outputSettings.outputDirectory || '');
    return gitHandler.generateCommitMessage(
      config.gitCommitTemplate, config.outputSettings.versionName,
      config.outputSettings.versionNumber, displaySequence, config.operator
    );
  });

  // 当新的导出开始时，重置隐藏状态；当导出完成时，触发动画
  useEffect(() => {
    if (isExporting && !prevExportingRef.current) {
      setShowCompletionAnim(false);
    }
    if (!isExporting && prevExportingRef.current && exportResult) {
      // 导出刚完成 → 切到结果页 + 生成提交信息
      setShowCompletionAnim(true);
      setSubPage('result');
      setGitPushDone(!!exportResult.gitPushed);
      const gitHandler = new GitHandler(outputDir);
      setCommitMessage(gitHandler.generateCommitMessage(
        config.gitCommitTemplate,
        config.outputSettings.versionName,
        config.outputSettings.versionNumber,
        displaySequence,
        config.operator
      ));
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

  const [gitPushing, setGitPushing] = useState(false);
  const [gitPushDone, setGitPushDone] = useState(() => !!exportResult?.gitPushed);

  const handleManualGitPush = useCallback(async () => {
    if (!exportResult || gitPushing) return;
    setGitPushing(true);
    try {
      const gitHandler = new GitHandler(outputDir);
      // 检测可用的 file-server 地址
      let serverBase = '';
      for (const base of ['https://localhost:9876', 'http://localhost:9876']) {
        try {
          const resp = await fetch(`${base}/api/read-file?directory=.&fileName=_probe`);
          if (resp.ok || resp.status === 404) { serverBase = base; break; }
        } catch { /* try next */ }
      }
      if (!serverBase) {
        logger.error('手动 Git 推送失败: 文件服务不可用');
        setGitPushing(false);
        return;
      }
      const gitExecutor = new GitExecutor(serverBase);
      const result = await gitExecutor.execute(outputDir, gitHandler.generatePushCommands(exportResult.modifiedFiles, commitMessage, config.operator));
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
  }, [exportResult, gitPushing, outputDir, commitMessage, config.operator]);

  const [helpOpen, setHelpOpen] = useState(false);
  const [devLogOpen, setDevLogOpen] = useState(false);
  const [changelogOpen, setChangelogOpen] = useState(false);
  const [devLogTab, setDevLogTab] = useState<'key' | 'all'>('key');

  return (
    <div className={styles.container}>
      {/* 子页签导航 */}
      <div className={styles.subNav}>
        <div
          className={`${styles.subNavItem} ${subPage === 'export' ? styles.subNavActive : ''}`}
          onClick={() => setSubPage('export')}
        >
          <ArrowExportFilled fontSize={13} />
          {t.export.subNav[0]}
        </div>
        <div
          className={`${styles.subNavItem} ${subPage === 'result' ? styles.subNavActive : ''}`}
          onClick={() => setSubPage('result')}
        >
          <DocumentCheckmarkRegular fontSize={13} />
          {t.export.subNav[1]}
        </div>
        <div
          className={`${styles.subNavItem} ${subPage === 'log' ? styles.subNavActive : ''}`}
          onClick={() => setSubPage('log')}
        >
          <HistoryRegular fontSize={13} />
          {t.export.subNav[2]}
        </div>
      </div>

      {/* 子页内容 */}
      <div className={styles.subPageContent}>
        {subPage === 'export' && (
          <>
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
                  <span className={styles.configLabel}>{t.export.config.sequence}</span>
                  <span className={styles.configValue}>
                    {displaySequence}
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

            {/* 导出按钮 */}
            <div className={styles.actionSection}>
              {serverOnline === false ? (
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

            {/* 空闲动画 */}
            <div className={styles.resultScrollArea}>
              <IdleAnimation active={!isExporting && !exportResult} />
            </div>
          </>
        )}

        {subPage === 'result' && (
          <ExportResultSubPage
            config={config}
            exportResult={exportResult}
            isExporting={isExporting}
            showCompletionAnim={showCompletionAnim}
            outputDir={outputDir}
            commitMessage={commitMessage}
            onCommitMessageChange={setCommitMessage}
            onGitPush={handleManualGitPush}
            gitPushing={gitPushing}
            gitPushDone={gitPushDone}
            mode={mode}
          />
        )}

        {subPage === 'log' && (
          <ExportLogSubPage config={config} />
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

      {/* 开发者工具对话框 */}
      <Dialog open={devLogOpen} onOpenChange={(_, data) => setDevLogOpen(data.open)}>
        <DialogSurface style={{ maxWidth: '100%', width: '100%', margin: 0, borderRadius: 0, maxHeight: '100vh' }}>
          <DialogBody style={{ padding: 0, display: 'flex', flexDirection: 'column', maxHeight: '85vh' }}>
            {/* 固定工具栏 */}
            <div style={{ padding: '10px 12px 0', flexShrink: 0 }}>
              <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>开发者工具</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '10px' }}>
                <Button size="small" appearance="outline" onClick={async () => {
                  for (const base of ['https://localhost:9876', 'http://localhost:9876']) {
                    try { await fetch(`${base}/api/restart`); logger.info('文件服务重启请求已发送'); return; } catch { /* try next */ }
                  }
                  logger.warn('文件服务不可用，无法重启');
                }}>重启文件服务</Button>
                <Button size="small" appearance="outline" onClick={() => { localStorage.removeItem('gds-theme'); localStorage.removeItem('gds-player-stats'); window.location.reload(); }}>重置主题</Button>
                <Button size="small" appearance="outline" onClick={async () => {
                  try {
                    await Excel.run(async (context) => {
                      const sheets = context.workbook.worksheets;
                      sheets.load('items/name');
                      await context.sync();
                      let trimmed = 0;
                      for (const sheet of sheets.items) {
                        const used = sheet.getUsedRangeOrNullObject(true);
                        used.load('values,rowCount,columnCount');
                        await context.sync();
                        if (used.isNullObject) continue;
                        // 找到实际数据边界：从右下角往回扫描
                        const values = used.values;
                        let lastRow = 0;
                        let lastCol = 0;
                        for (let r = values.length - 1; r >= 0; r--) {
                          for (let c = values[r].length - 1; c >= 0; c--) {
                            if (values[r][c] != null && String(values[r][c]).trim() !== '') {
                              lastRow = Math.max(lastRow, r);
                              lastCol = Math.max(lastCol, c);
                            }
                          }
                        }
                        const actualRows = lastRow + 1;
                        const actualCols = lastCol + 1;
                        if (used.rowCount > actualRows + 10 || used.columnCount > actualCols + 10) {
                          // 删除多余的行和列
                          if (used.rowCount > actualRows + 1) {
                            const excessRows = sheet.getRangeByIndexes(actualRows + 1, 0, used.rowCount - actualRows - 1, 1);
                            excessRows.getEntireRow().delete(Excel.DeleteShiftDirection.up);
                          }
                          if (used.columnCount > actualCols + 1) {
                            const excessCols = sheet.getRangeByIndexes(0, actualCols + 1, 1, used.columnCount - actualCols - 1);
                            excessCols.getEntireColumn().delete(Excel.DeleteShiftDirection.left);
                          }
                          trimmed++;
                          logger.info(`裁剪「${sheet.name}」: ${used.rowCount}×${used.columnCount} → ${actualRows}×${actualCols}`);
                        }
                      }
                      await context.sync();
                      logger.info(trimmed > 0 ? `⏱ 裁剪完成: ${trimmed} 张表已修复，请保存文件` : '所有工作表范围正常，无需裁剪');
                    });
                  } catch (err) {
                    logger.error(`裁剪失败: ${err instanceof Error ? err.message : err}`);
                  }
                  setDevLogOpen(false);
                  setTimeout(() => setDevLogOpen(true), 0);
                }}>裁剪空范围</Button>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: `1px solid ${tokens.colorNeutralStroke2}`, paddingTop: '8px' }}>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <Button size="small" appearance={devLogTab === 'key' ? 'primary' : 'subtle'} onClick={() => setDevLogTab('key')}>关键</Button>
                  <Button size="small" appearance={devLogTab === 'all' ? 'primary' : 'subtle'} onClick={() => setDevLogTab('all')}>全部</Button>
                </div>
                <Button size="small" appearance="subtle" onClick={() => { logger.clear(); setDevLogOpen(false); setTimeout(() => setDevLogOpen(true), 0); }}>清空</Button>
              </div>
            </div>
            {/* 可滚动日志区 */}
            <DialogContent style={{ padding: '8px 12px 12px', overflow: 'auto', flex: 1 }}>
              <pre style={{
                fontSize: '10px',
                fontFamily: '"Cascadia Code", "Fira Code", Consolas, monospace',
                lineHeight: '1.5',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
                margin: 0,
                color: tokens.colorNeutralForeground2,
              }}>
                {(devLogTab === 'key' ? logger.getKeyLogs() : logger.getLogs()).join('\n') || '（暂无日志）'}
              </pre>
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
                <div style={{ fontWeight: 600, marginBottom: '4px' }}>v1.7 — 性能优化 & 渠道管理 & 协同增强</div>
                <ul style={{ margin: '0 0 12px 0', paddingLeft: '18px' }}>
                  <li>导出性能大幅提升：暂停 Excel 自动计算、Git pull 与数据加载并行、16路并发写入</li>
                  <li>Git pull 优化：快速 ff-only 拉取 + 自动恢复本地删除的文件</li>
                  <li>导出界面拆分为 导出 | 结果 | 日志 三个子页面</li>
                  <li>Git 提交模板支持参数：{'{0}'}=版本号.序列号 {'{1}'}=渠道名 {'{2}'}=操作员</li>
                  <li>Git 提交作者自动使用当前操作人名字</li>
                  <li>版本管理重命名为渠道管理，Git 目录提升为全局配置</li>
                  <li>各主题术语全面统一（导出/管理/校验）</li>
                  <li>GameConfig 版本注入逻辑重构，修复序列号不递增等问题</li>
                  <li>开发者工具：裁剪空范围按钮，修复 usedRange 膨胀导致文件暴增</li>
                  <li>校验面板选择项保存到本地，切换页面不丢失</li>
                  <li>所有单元格值导出为文本类型，修复 Unity 读取报错</li>
                  <li>文件服务自动更新重启机制</li>
                </ul>
                <div style={{ fontWeight: 600, marginBottom: '4px' }}>v1.4 — 导出 Diff 详情 & 体验优化</div>
                <ul style={{ margin: '0 0 12px 0', paddingLeft: '18px' }}>
                  <li>导出 Diff 详情：点击文件行展开查看逐行变更</li>
                  <li>单元格级对比：修改行显示具体字段变化（旧值 → 新值）</li>
                  <li>提交历史查看与回退功能</li>
                  <li>新增赛博朋克、像素复古两套主题</li>
                </ul>
                <div style={{ fontWeight: 600, marginBottom: '4px' }}>v1.3 — 多主题系统 & 设计升级</div>
                <ul style={{ margin: '0 0 12px 0', paddingLeft: '18px' }}>
                  <li>6 种主题循环切换：浅色/深色/飞船航行/二次元冒险/赛博朋克/像素复古</li>
                  <li>等级/经验值系统，游戏主题显示 LV 等级条</li>
                </ul>
                <div style={{ fontWeight: 600, marginBottom: '4px' }}>v1.2 — 性能优化 & 多项修复</div>
                <ul style={{ margin: '0 0 12px 0', paddingLeft: '18px' }}>
                  <li>批量 Excel 加载、POST 单次写入、并行文件写入</li>
                  <li>校验速度提升、空值等价配置、隐藏行兼容</li>
                </ul>
              </div>
            </DialogContent>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </div>
  );
}
