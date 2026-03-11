import { useState, useCallback } from 'react';
import {
  makeStyles,
  tokens,
  Button,
  ProgressBar,
  Text,
  Badge,
  Card,
  CardHeader,
} from '@fluentui/react-components';
import {
  ArrowExportRegular,
  FolderOpenRegular,
  DocumentTableRegular,
} from '@fluentui/react-icons';
import { ExportJob, DirectoryHandle } from '../../engine/ExportJob';
import { ExportResult, ExportProgress } from '../../types/table';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  info: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    padding: '8px',
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
  value: {
    fontWeight: 600,
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
  dirButton: {
    width: '100%',
    justifyContent: 'flex-start',
  },
  dirPath: {
    fontSize: '11px',
    color: tokens.colorNeutralForeground3,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
});

interface ExportPanelProps {
  isExporting: boolean;
  progress: ExportProgress | null;
  directoryHandle: FileSystemDirectoryHandle | null;
  onDirectorySelect: (handle: FileSystemDirectoryHandle) => void;
  onExportStart: () => void;
  onExportComplete: (result: ExportResult) => void;
  onProgress: (progress: ExportProgress) => void;
}

export function ExportPanel({
  isExporting,
  progress,
  directoryHandle,
  onDirectorySelect,
  onExportStart,
  onExportComplete,
  onProgress,
}: ExportPanelProps) {
  const styles = useStyles();
  const [dirName, setDirName] = useState<string>('');

  const handleSelectDirectory = useCallback(async () => {
    try {
      // File System Access API
      const handle = await (window as unknown as { showDirectoryPicker(): Promise<FileSystemDirectoryHandle> }).showDirectoryPicker();
      onDirectorySelect(handle);
      setDirName(handle.name);
    } catch (err) {
      // 用户取消选择
      console.log('目录选择取消', err);
    }
  }, [onDirectorySelect]);

  const handleExport = useCallback(async () => {
    onExportStart();

    const job = new ExportJob(
      onProgress,
      directoryHandle as unknown as DirectoryHandle
    );

    const result = await job.runExport();
    onExportComplete(result);
  }, [directoryHandle, onExportStart, onExportComplete, onProgress]);

  const progressValue = progress
    ? progress.step / progress.totalSteps
    : 0;

  return (
    <Card size="small">
      <CardHeader
        image={<DocumentTableRegular />}
        header={<Text weight="semibold">数据导出</Text>}
      />
      <div className={styles.container}>
        {/* 选择输出目录 */}
        <Button
          className={styles.dirButton}
          icon={<FolderOpenRegular />}
          appearance="subtle"
          onClick={handleSelectDirectory}
          disabled={isExporting}
        >
          {dirName ? `输出目录: ${dirName}` : '选择输出目录...'}
        </Button>

        {/* 导出按钮 */}
        <Button
          icon={<ArrowExportRegular />}
          appearance="primary"
          onClick={handleExport}
          disabled={isExporting}
        >
          {isExporting ? '导出中...' : '开始导出'}
        </Button>

        {/* 进度条 */}
        {isExporting && progress && (
          <div className={styles.progressArea}>
            <ProgressBar value={progressValue} />
            <Text className={styles.progressText}>
              [{progress.step}/{progress.totalSteps}] {progress.message}
            </Text>
          </div>
        )}
      </div>
    </Card>
  );
}
