import { useState, useEffect, useCallback, useRef } from 'react';
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
import { GitHandler } from '../git/GitHandler';
import { GitExecutor } from '../git/GitExecutor';
import { configManager } from '../v2/ConfigManager';

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
    backgroundImage: 'linear-gradient(135deg, #0078d4 0%, #1565c0 40%, #0d47a1 100%)',
    color: 'rgba(255,255,255,0.65)',
    position: 'relative' as const,
    overflow: 'hidden' as const,
  },
  bannerShimmer: {
    position: 'absolute' as const,
    top: 0,
    left: '-100%',
    width: '200%',
    height: '100%',
    backgroundImage: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.04) 45%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 55%, transparent 100%)',
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
    backgroundColor: 'rgba(255,255,255,0.25)',
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
    fontFamily: '"Cascadia Code", "Fira Code", Consolas, monospace',
    letterSpacing: '1px',
    userSelect: 'none' as const,
    opacity: 0.35,
  },
});

export function App() {
  const styles = useStyles();
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

  const handleExportComplete = useCallback((result: ExportResult) => {
    setExportResult(result);
    setIsExporting(false);
    setProgress(null);
  }, []);

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

      // 准备状态文本
      let statusText = result.success ? '导出完成' : '导出失败';
      const resultText = result.success
        ? (result.changedTables > 0 ? `${result.changedTables} 张表已更新` : '无任何修改')
        : `错误: ${result.errors.filter(e => e.severity === 'error').map(e => e.message).join('; ')}`;

      // 自动 Git push
      if (result.success && result.modifiedFiles.length > 0) {
        const fileServerBase = await GitExecutor.detect();
        if (fileServerBase) {
          await loadConfig(); // 刷新以获取最新序列号
          const freshConfig = await new Promise<typeof config>((resolve) => {
            // loadConfig 是异步的，直接用当前 config 即可
            resolve(config);
          });

          const outputDir = freshConfig?.outputSettings.outputDirectory || '';
          if (outputDir) {
            const gitHandler = new GitHandler(outputDir);
            const commitMsg = gitHandler.generateCommitMessage(
              freshConfig?.gitCommitTemplate || '',
              params.version,
              params.versionNumber,
              freshConfig?.outputSettings.versionSequence || 0
            );
            const commands = gitHandler.generatePushCommands(result.modifiedFiles, commitMsg);
            const executor = new GitExecutor(fileServerBase);
            const gitResult = await executor.execute(outputDir, commands);
            if (!gitResult.ok) {
              statusText = `导出完成(Git失败: ${gitResult.error || 'unknown'})`;
            }
          }
        } else {
          statusText = '导出完成(Git跳过: file-server未运行)';
        }
      }

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
  }, [config, loadConfig, monitorEnabled]);

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
            当前工作簿尚未初始化。点击下方按钮自动创建配置，即可开始管理游戏数据表。
          </Text>
          <Button
            appearance="primary"
            icon={initializing ? <Spinner size="tiny" /> : <AddRegular />}
            disabled={initializing}
            onClick={handleInitialize}
            size="large"
          >
            {initializing ? '正在初始化...' : '初始化工作簿'}
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
      <div className={styles.banner}>
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
          <Tab value="export" icon={<ArrowExportRegular fontSize={14} />}>导出</Tab>
          <Tab value="manage" icon={<SettingsRegular fontSize={14} />}>管理</Tab>
          <Tab value="validate" icon={<ShieldCheckmarkRegular fontSize={14} />}>校验</Tab>
          <Tab value="preview" icon={<EyeRegular fontSize={14} />}>预览</Tab>
        </TabList>
      </div>

      <div className={styles.tabContent}>
        {selectedTab === 'export' && config && (
          <ExportTab
            config={config}
            isExporting={isExporting}
            progress={progress}
            exportResult={exportResult}
            onExportStart={() => setIsExporting(true)}
            onExportComplete={handleExportComplete}
            onProgress={setProgress}
            onReloadConfig={loadConfig}
            onClearResult={() => setExportResult(null)}
            monitorEnabled={monitorEnabled}
            monitorStatus={monitorStatus}
            onToggleMonitor={handleToggleMonitor}
            onNavigateToManage={() => setSelectedTab('manage')}
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
