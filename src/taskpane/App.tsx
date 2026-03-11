import { useState } from 'react';
import {
  makeStyles,
  tokens,
  Title3,
  Divider,
} from '@fluentui/react-components';
import { ExportPanel } from './components/ExportPanel';
import { ResultPanel } from './components/ResultPanel';
import { GitPanel } from './components/GitPanel';
import { ExportResult, ExportProgress } from '../types/table';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    padding: '12px',
    boxSizing: 'border-box',
    fontFamily: tokens.fontFamilyBase,
    backgroundColor: tokens.colorNeutralBackground1,
    overflow: 'auto',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '12px',
  },
  title: {
    fontSize: '16px',
    fontWeight: 600,
  },
  version: {
    fontSize: '11px',
    color: tokens.colorNeutralForeground3,
    marginLeft: 'auto',
  },
  section: {
    marginBottom: '12px',
  },
});

export function App() {
  const styles = useStyles();
  const [exportResult, setExportResult] = useState<ExportResult | null>(null);
  const [progress, setProgress] = useState<ExportProgress | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [directoryHandle, setDirectoryHandle] = useState<FileSystemDirectoryHandle | null>(null);

  const handleExportComplete = (result: ExportResult) => {
    setExportResult(result);
    setIsExporting(false);
    setProgress(null);
  };

  const handleProgress = (p: ExportProgress) => {
    setProgress(p);
  };

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <Title3 className={styles.title}>GameData Studio</Title3>
        <span className={styles.version}>v1.0</span>
      </div>

      <div className={styles.section}>
        <ExportPanel
          isExporting={isExporting}
          progress={progress}
          directoryHandle={directoryHandle}
          onDirectorySelect={setDirectoryHandle}
          onExportStart={() => setIsExporting(true)}
          onExportComplete={handleExportComplete}
          onProgress={handleProgress}
        />
      </div>

      <Divider />

      {exportResult && (
        <div className={styles.section}>
          <ResultPanel result={exportResult} />
        </div>
      )}

      {exportResult && exportResult.modifiedFiles.length > 0 && (
        <>
          <Divider />
          <div className={styles.section}>
            <GitPanel
              modifiedFiles={exportResult.modifiedFiles}
              outputDirectory={directoryHandle ? '(已选择输出目录)' : ''}
            />
          </div>
        </>
      )}
    </div>
  );
}
