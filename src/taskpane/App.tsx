import { useState, useEffect, useCallback } from 'react';
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
  QuestionCircleRegular,
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
import { HelpPanel } from './components/HelpPanel';
import { useConfig } from './hooks/useConfig';
import { ExportResult, ExportProgress } from '../types/table';
import { StudioConfigStore } from '../v2/StudioConfigStore';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    boxSizing: 'border-box',
    fontFamily: tokens.fontFamilyBase,
    backgroundColor: tokens.colorNeutralBackground1,
    overflow: 'hidden',
  },
  banner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '14px',
    padding: '6px 14px',
    backgroundColor: '#0078d4',
    color: 'rgba(255,255,255,0.55)',
  },
  bannerIcon: {
    fontSize: '16px',
  },
  bannerDot: {
    width: '3px',
    height: '3px',
    borderRadius: '50%',
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  tabBar: {
    borderBottom: `1px solid ${tokens.colorNeutralStroke1}`,
  },
  tabContent: {
    flex: 1,
    overflow: 'auto',
    padding: '0',
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

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const handleExportComplete = useCallback((result: ExportResult) => {
    setExportResult(result);
    setIsExporting(false);
    setProgress(null);
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
      </div>
    );
  }

  return (
    <div className={styles.root}>
      <div className={styles.banner}>
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
          <Tab value="help" icon={<QuestionCircleRegular fontSize={14} />}>帮助</Tab>
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

        {selectedTab === 'help' && <HelpPanel />}
      </div>
    </div>
  );
}
