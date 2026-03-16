import { useState, useEffect, useCallback, useRef, useContext } from 'react';
import {
  makeStyles,
  tokens,
  Tab,
  TabList,
  Text,
  Spinner,
  Button,
} from '@fluentui/react-components';
import {
  ArrowExportRegular,
  SettingsRegular,
  ShieldCheckmarkRegular,
  EyeRegular,
  AddRegular,
  GridRegular,
  NumberSymbolRegular,
  DataBarVerticalRegular,
  TableSimpleRegular,
  RocketRegular,
  WindowWrenchRegular,
  AirplaneTakeOffRegular,
  HeartRegular,
  StarRegular,
  SparkleRegular,
  SendRegular,
  BugRegular,
  FlagCheckeredRegular,
  WandRegular,
  CompassNorthwestRegular,
} from '@fluentui/react-icons';
import { ExportTab } from './components/ExportTab';
import { IdleAnimation } from './components/IdleAnimation';
import { ManageTab } from './components/ManageTab';
import { ValidationPanel } from './components/ValidationPanel';
import { PreviewPanel } from './components/PreviewPanel';
// HelpPanel is now shown via dialog from ExportTab
import { useConfig } from './hooks/useConfig';
import { ExportResult, ExportProgress } from '../types/table';
import { StudioConfigStore } from '../v2/StudioConfigStore';
import { CollaborationMonitor, CollabTriggerParams } from '../v3/CollaborationMonitor';
import { ExportJob } from '../engine/ExportJob';
import { configManager } from '../v2/ConfigManager';
import { gdsTokens } from './theme';
import { useThemeText } from './locales';
import { ThemeContext } from './index';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    minWidth: '280px',
    boxSizing: 'border-box',
    fontFamily: tokens.fontFamilyBase,
    backgroundColor: tokens.colorNeutralBackground2,
    overflow: 'hidden',
  },
  banner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '14px',
    padding: '8px 14px',
    backgroundImage: gdsTokens.banner.gradient,
    color: gdsTokens.banner.iconColor,
    position: 'relative' as const,
    overflow: 'hidden' as const,
  },
  bannerShimmer: {
    position: 'absolute' as const,
    top: 0,
    left: '-100%',
    width: '200%',
    height: '100%',
    backgroundImage: gdsTokens.banner.shimmer,
    animationName: {
      from: { transform: 'translateX(-30%)' },
      to: { transform: 'translateX(30%)' },
    },
    animationDuration: '6s',
    animationIterationCount: 'infinite',
    animationTimingFunction: 'ease-in-out',
  },
  bannerIcon: {
    fontSize: '16px',
    position: 'relative' as const,
  },
  bannerDot: {
    width: '3px',
    height: '3px',
    borderRadius: '50%',
    backgroundColor: gdsTokens.banner.dotColor,
    position: 'relative' as const,
  },
  tabBar: {
    backgroundColor: tokens.colorNeutralBackground1,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  tabContent: {
    flex: 1,
    overflow: 'auto',
    padding: '0',
    minHeight: 0,
  },
  errorBox: {
    padding: '12px',
    backgroundColor: tokens.colorPaletteRedBackground1,
    borderRadius: '4px',
    margin: '12px',
    fontSize: '12px',
    whiteSpace: 'pre-wrap',
  },
  setupBox: {
    padding: '32px 20px 0',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '14px',
    textAlign: 'center' as const,
  },
  setupIcon: {
    width: '64px',
    height: '64px',
    objectFit: 'contain' as const,
  },
  setupDesc: {
    fontSize: '12px',
    color: tokens.colorNeutralForeground3,
    lineHeight: '1.6',
    maxWidth: '240px',
  },
  loading: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    gap: '12px',
  },
  footer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    padding: '8px 14px',
    marginTop: 'auto',
    fontSize: '10px',
    color: tokens.colorNeutralForeground4,
    fontFamily: gdsTokens.fontMono,
    letterSpacing: '1px',
    userSelect: 'none' as const,
    opacity: 0.35,
  },
});

export function App() {
  const styles = useStyles();
  const { mode: themeMode } = useContext(ThemeContext);
  const t = useThemeText();
  const specialTokens = (gdsTokens as Record<string, unknown>)[themeMode] as typeof gdsTokens.game | undefined;
  const isSpecial = !!specialTokens;
  const { config, loading, error, loadConfig } = useConfig();
  const [selectedTab, setSelectedTab] = useState<string>('export');
  const [exportResult, setExportResult] = useState<ExportResult | null>(null);
  const [progress, setProgress] = useState<ExportProgress | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [monitorEnabled, setMonitorEnabled] = useState(true);
  const [monitorStatus, setMonitorStatus] = useState<'idle' | 'watching' | 'exporting'>('idle');
  const monitorRef = useRef<CollaborationMonitor | null>(null);
  const isExportingRef = useRef(false);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  // 保持 isExportingRef 同步
  useEffect(() => {
    isExportingRef.current = isExporting;
  }, [isExporting]);

  const handleExportStart = useCallback(() => setIsExporting(true), []);
  const handleClearResult = useCallback(() => setExportResult(null), []);
  const handleNavigateToManage = useCallback(() => setSelectedTab('manage'), []);

  const handleExportComplete = useCallback((result: ExportResult) => {
    setExportResult(result);
    setIsExporting(false);
    setProgress(null);
    // 重新加载配置以更新序列号等导出后变化的字段
    loadConfig();
  }, [loadConfig]);

  // 协同导出触发回调
  const handleCollabTrigger = useCallback(async (params: CollabTriggerParams) => {
    setMonitorStatus('exporting');
    setIsExporting(true);

    try {
      // 覆盖版本配置
      await configManager.setOutputVersion(params.version);
      await configManager.setOutputVersionNumber(params.versionNumber);

      // 执行导出
      const job = new ExportJob((p) => setProgress(p));
      const result = await job.runExport();
      setExportResult(result);
      setIsExporting(false);
      setProgress(null);

      // 准备状态文本（Git pull/push 已由 ExportJob 内部自动处理）
      const statusText = result.success ? '导出完成' : '导出失败';
      const resultText = result.success
        ? (result.changedTables > 0 ? `${result.changedTables} 张表已更新` : '无任何修改')
        : `错误: ${result.errors.filter(e => e.severity === 'error').map(e => e.message).join('; ')}`;

      // 回写状态到 StudioConfig
      await Excel.run(async (context) => {
        await StudioConfigStore.writeCollabStatus(context, statusText, resultText, false);
      });

      await loadConfig();
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setIsExporting(false);
      setProgress(null);

      // 回写错误状态
      try {
        await Excel.run(async (context) => {
          await StudioConfigStore.writeCollabStatus(context, `导出失败: ${errMsg}`, '', false);
        });
      } catch { /* ignore */ }
    } finally {
      setMonitorStatus(monitorEnabled ? 'watching' : 'idle');
    }
  }, [loadConfig, monitorEnabled]);

  // 切换协同监听
  const handleToggleMonitor = useCallback((enabled: boolean) => {
    setMonitorEnabled(enabled);
    if (enabled) {
      if (!monitorRef.current) {
        monitorRef.current = new CollaborationMonitor({
          onTrigger: handleCollabTrigger,
          isExporting: () => isExportingRef.current,
        });
      }
      monitorRef.current.start();
      setMonitorStatus('watching');
    } else {
      monitorRef.current?.stop();
      setMonitorStatus('idle');
    }
  }, [handleCollabTrigger]);

  // 配置加载后自动启动协同监听
  useEffect(() => {
    if (config && monitorEnabled && !monitorRef.current) {
      handleToggleMonitor(true);
    }
  }, [config, monitorEnabled, handleToggleMonitor]);

  // 清理 monitor
  useEffect(() => {
    return () => {
      monitorRef.current?.stop();
    };
  }, []);

  const handleInitialize = useCallback(async () => {
    setInitializing(true);
    setInitError(null);
    try {
      await Excel.run(async (context) => {
        await StudioConfigStore.create(context);
      });
      await loadConfig();
    } catch (err) {
      setInitError(err instanceof Error ? err.message : String(err));
    } finally {
      setInitializing(false);
    }
  }, [loadConfig]);

  if (loading) {
    return (
      <div className={styles.root}>
        <div className={styles.loading}>
          <Spinner size="medium" />
          <Text size={200}>正在加载配置...</Text>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.root}>
        <div className={styles.setupBox}>
          <img src="assets/gds-80.png" alt="GameData Studio" className={styles.setupIcon} />
          <Text weight="semibold" size={400}>欢迎使用 GameData Studio</Text>
          <Text className={styles.setupDesc}>
            {t.setup.description}
          </Text>
          <Button
            appearance="primary"
            icon={initializing ? <Spinner size="tiny" /> : <AddRegular />}
            disabled={initializing}
            onClick={handleInitialize}
            size="large"
          >
            {initializing ? t.setup.initializingBtn : t.setup.initBtn}
          </Button>
          {initError && (
            <div className={styles.errorBox}>
              {initError}
            </div>
          )}
        </div>
        <IdleAnimation />
        <div className={styles.footer}>vin {__APP_VERSION__}</div>
      </div>
    );
  }

  return (
    <div className={styles.root}>
      <div className={styles.banner} style={specialTokens ? { backgroundImage: specialTokens.banner } : undefined}>
        <span className={styles.bannerShimmer} />
        <GridRegular className={styles.bannerIcon} />
        <span className={styles.bannerDot} />
        <NumberSymbolRegular className={styles.bannerIcon} />
        <span className={styles.bannerDot} />
        <DataBarVerticalRegular className={styles.bannerIcon} />
        <span className={styles.bannerDot} />
        <TableSimpleRegular className={styles.bannerIcon} />
      </div>

      <div className={styles.tabBar}>
        <TabList
          selectedValue={selectedTab}
          onTabSelect={(_, data) => setSelectedTab(data.value as string)}
          size="small"
        >
          <Tab value="export" icon={(({ game: <RocketRegular fontSize={14} />, cute: <HeartRegular fontSize={14} />, cyber: <SendRegular fontSize={14} />, pixel: <FlagCheckeredRegular fontSize={14} /> } as Record<string, JSX.Element>)[themeMode] || <ArrowExportRegular fontSize={14} />) as JSX.Element}>{t.tabExport}</Tab>
          <Tab value="manage" icon={<SettingsRegular fontSize={14} />}>{t.tabManage}</Tab>
          <Tab value="validate" icon={(({ game: <WindowWrenchRegular fontSize={14} />, cute: <StarRegular fontSize={14} />, cyber: <BugRegular fontSize={14} />, pixel: <WandRegular fontSize={14} /> } as Record<string, JSX.Element>)[themeMode] || <ShieldCheckmarkRegular fontSize={14} />) as JSX.Element}>{t.tabValidate}</Tab>
          <Tab value="preview" icon={(({ game: <AirplaneTakeOffRegular fontSize={14} />, cute: <SparkleRegular fontSize={14} />, pixel: <CompassNorthwestRegular fontSize={14} /> } as Record<string, JSX.Element>)[themeMode] || <EyeRegular fontSize={14} />) as JSX.Element}>{t.tabPreview}</Tab>
        </TabList>
      </div>

      <div className={styles.tabContent}>
        {selectedTab === 'export' && config && (
          <ExportTab
            config={config}
            isExporting={isExporting}
            progress={progress}
            exportResult={exportResult}
            onExportStart={handleExportStart}
            onExportComplete={handleExportComplete}
            onProgress={setProgress}
            onReloadConfig={loadConfig}
            onClearResult={handleClearResult}
            monitorEnabled={monitorEnabled}
            monitorStatus={monitorStatus}
            onToggleMonitor={handleToggleMonitor}
            onNavigateToManage={handleNavigateToManage}
          />
        )}

        {selectedTab === 'validate' && config && (
          <ValidationPanel config={config} />
        )}

        {selectedTab === 'preview' && config && (
          <PreviewPanel config={config} />
        )}

        {selectedTab === 'manage' && config && (
          <ManageTab
            config={config}
            onReloadConfig={loadConfig}
          />
        )}

        {/* help tab removed — ? button is now in ExportTab footer */}
      </div>
    </div>
  );
}
