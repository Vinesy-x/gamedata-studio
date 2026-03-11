import { useState, useEffect, useCallback } from 'react';
import {
  makeStyles,
  tokens,
  Tab,
  TabList,
  Text,
  Spinner,
} from '@fluentui/react-components';
import {
  ArrowExportRegular,
  EyeRegular,
  CheckboxCheckedRegular,
  BranchRegular,
  InfoRegular,
} from '@fluentui/react-icons';
import { ExportTab } from './components/ExportTab';
import { GitPanel } from './components/GitPanel';
import { ConfigPanel } from './components/ConfigPanel';
import { useConfig } from './hooks/useConfig';
import { ExportResult, ExportProgress } from '../types/table';

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
  header: {
    display: 'flex',
    alignItems: 'center',
    padding: '10px 14px',
    backgroundColor: '#0078d4',
    color: 'white',
  },
  title: {
    fontSize: '15px',
    fontWeight: 600,
    color: 'white',
    fontStyle: 'italic',
  },
  headerIcon: {
    marginLeft: 'auto',
    cursor: 'pointer',
    color: 'white',
    opacity: 0.8,
    ':hover': { opacity: 1 },
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

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const handleExportComplete = useCallback((result: ExportResult) => {
    setExportResult(result);
    setIsExporting(false);
    setProgress(null);
  }, []);

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
        <div className={styles.header}>
          <Text className={styles.title}>GameData Studio</Text>
        </div>
        <div className={styles.errorBox}>
          <Text weight="semibold">配置加载失败</Text>
          <br /><br />
          {error}
          <br /><br />
          <Text size={200}>请检查工作簿是否包含「表格输出」「配置设置表」「表名对照」三张表。</Text>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <Text className={styles.title}>GameData Studio</Text>
        <InfoRegular className={styles.headerIcon} fontSize={18} />
      </div>

      <div className={styles.tabBar}>
        <TabList
          selectedValue={selectedTab}
          onTabSelect={(_, data) => setSelectedTab(data.value as string)}
          size="small"
        >
          <Tab value="export" icon={<ArrowExportRegular fontSize={14} />}>导出</Tab>
          <Tab value="preview" icon={<EyeRegular fontSize={14} />}>预览</Tab>
          <Tab value="validate" icon={<CheckboxCheckedRegular fontSize={14} />}>校验</Tab>
          <Tab value="git" icon={<BranchRegular fontSize={14} />}>Git</Tab>
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
          />
        )}

        {selectedTab === 'preview' && (
          <div style={{ padding: '16px', color: tokens.colorNeutralForeground3, fontSize: '12px' }}>
            预览功能开发中...
          </div>
        )}

        {selectedTab === 'validate' && (
          <div style={{ padding: '16px', color: tokens.colorNeutralForeground3, fontSize: '12px' }}>
            独立校验功能开发中...
          </div>
        )}

        {selectedTab === 'git' && config && (
          <GitPanel
            config={config}
            modifiedFiles={exportResult?.modifiedFiles || []}
            outputDirectory={config.outputSettings.outputDirectory || ''}
          />
        )}
      </div>
    </div>
  );
}
