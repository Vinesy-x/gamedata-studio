import { useCallback } from 'react';
import {
  makeStyles,
  tokens,
  Button,
  ProgressBar,
  Text,
} from '@fluentui/react-components';
import { ArrowExportRegular } from '@fluentui/react-icons';
import { Config } from '../../types/config';
import { ExportJob } from '../../engine/ExportJob';
import { ExportResult, ExportProgress } from '../../types/table';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  infoBox: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    padding: '8px 10px',
    backgroundColor: tokens.colorNeutralBackground2,
    borderRadius: '4px',
    fontSize: '12px',
  },
  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
  },
  label: {
    color: tokens.colorNeutralForeground3,
  },
  progressArea: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  progressText: {
    fontSize: '11px',
    color: tokens.colorNeutralForeground3,
  },
});

interface ExportPanelProps {
  config: Config;
  isExporting: boolean;
  progress: ExportProgress | null;
  onExportStart: () => void;
  onExportComplete: (result: ExportResult) => void;
  onProgress: (progress: ExportProgress) => void;
}

export function ExportPanel({
  config,
  isExporting,
  progress,
  onExportStart,
  onExportComplete,
  onProgress,
}: ExportPanelProps) {
  const styles = useStyles();

  const handleExport = useCallback(async () => {
    onExportStart();
    const job = new ExportJob(onProgress);
    const result = await job.runExport();
    onExportComplete(result);
  }, [onExportStart, onExportComplete, onProgress]);

  const progressValue = progress ? progress.step / progress.totalSteps : 0;

  return (
    <div className={styles.container}>
      <div className={styles.infoBox}>
        <div className={styles.infoRow}>
          <span className={styles.label}>输出版本</span>
          <strong>{config.outputSettings.versionName}</strong>
        </div>
        <div className={styles.infoRow}>
          <span className={styles.label}>版本号</span>
          <strong>{config.outputSettings.versionNumber}</strong>
        </div>
        <div className={styles.infoRow}>
          <span className={styles.label}>序列号</span>
          <strong>{config.outputSettings.versionSequence}</strong>
        </div>
        <div className={styles.infoRow}>
          <span className={styles.label}>待处理表</span>
          <strong>{config.tablesToProcess.size} 张</strong>
        </div>
        {config.outputSettings.outputDirectory && (
          <div className={styles.infoRow}>
            <span className={styles.label}>输出目录</span>
            <span style={{ fontSize: '10px', wordBreak: 'break-all' }}>
              {config.outputSettings.outputDirectory}
            </span>
          </div>
        )}
      </div>

      <Button
        icon={<ArrowExportRegular />}
        appearance="primary"
        onClick={handleExport}
        disabled={isExporting}
      >
        {isExporting ? '导出中...' : '开始导出'}
      </Button>

      {isExporting && progress && (
        <div className={styles.progressArea}>
          <ProgressBar value={progressValue} />
          <Text className={styles.progressText}>
            [{progress.step}/{progress.totalSteps}] {progress.message}
          </Text>
        </div>
      )}
    </div>
  );
}
