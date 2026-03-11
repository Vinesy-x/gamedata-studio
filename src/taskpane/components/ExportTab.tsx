import { useCallback, useMemo } from 'react';
import {
  makeStyles,
  tokens,
  Button,
  ProgressBar,
  Text,
} from '@fluentui/react-components';
import {
  ArrowExportRegular,
  ArrowSyncRegular,
  ArrowUploadRegular,
  CheckmarkCircleRegular,
  DismissCircleRegular,
  WarningRegular,
  DocumentRegular,
  NavigationRegular,
} from '@fluentui/react-icons';
import { Config } from '../../types/config';
import { ExportJob } from '../../engine/ExportJob';
import { GitHandler } from '../../git/GitHandler';
import { ExportResult, ExportProgress } from '../../types/table';
import { ExportError } from '../../types/errors';
import { excelHelper } from '../../utils/ExcelHelper';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0',
  },
  // 当前配置区域
  configSection: {
    padding: '12px 14px',
  },
  configHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginBottom: '10px',
  },
  configTitle: {
    fontSize: '13px',
    fontWeight: 600,
    color: tokens.colorNeutralForeground1,
  },
  configCard: {
    backgroundColor: tokens.colorNeutralBackground2,
    borderRadius: '6px',
    padding: '10px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  configRow: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '12px',
  },
  configLabel: {
    color: tokens.colorNeutralForeground3,
    minWidth: '60px',
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
  // 操作按钮区域
  actionSection: {
    padding: '0 14px 12px',
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
    padding: '8px 12px',
    backgroundColor: tokens.colorNeutralBackground2,
    borderRadius: '6px',
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
    backgroundColor: tokens.colorNeutralBackground2,
    borderRadius: '6px',
    padding: '10px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
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
  // 警告/错误
  warningCard: {
    backgroundColor: '#FFF4CE',
    borderRadius: '6px',
    padding: '10px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
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
    backgroundColor: tokens.colorPaletteRedBackground1,
    borderRadius: '6px',
    padding: '10px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
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
}: ExportTabProps) {
  const styles = useStyles();

  const handleExport = useCallback(async () => {
    onExportStart();
    const job = new ExportJob(onProgress);
    const result = await job.runExport();
    onExportComplete(result);
  }, [onExportStart, onExportComplete, onProgress]);

  const gitHandler = useMemo(
    () => new GitHandler(config.outputSettings.outputDirectory || ''),
    [config.outputSettings.outputDirectory]
  );

  const handleGitPush = useCallback(async () => {
    if (!exportResult || exportResult.modifiedFiles.length === 0) return;

    const commitMessage = gitHandler.generateCommitMessage(
      config.gitCommitTemplate,
      config.outputSettings.versionName,
      config.outputSettings.versionNumber,
      config.outputSettings.versionSequence
    );
    const script = gitHandler.getFullPushScript(exportResult.modifiedFiles, commitMessage);

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

    // TODO: v2.0 接入 companion server 自动执行
    alert('Git 推送命令已复制到剪贴板，请在终端中粘贴执行。');
  }, [exportResult, gitHandler, config]);

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

  const canGitPush = exportResult && !isExporting && exportResult.success && exportResult.modifiedFiles.length > 0;

  return (
    <div className={styles.container}>
      {/* 当前配置 */}
      <div className={styles.configSection}>
        <div className={styles.configHeader}>
          <Text className={styles.configTitle}>当前配置</Text>
          <Button
            icon={<ArrowSyncRegular />}
            appearance="transparent"
            size="small"
            onClick={onReloadConfig}
            style={{ minWidth: 'auto', padding: '0 4px' }}
          />
        </div>
        <div className={styles.configCard}>
          <div className={styles.configRow}>
            <span className={styles.configLabel}>输出版本</span>
            <span className={styles.configValue}>{config.outputSettings.versionName}</span>
          </div>
          <div className={styles.configRow}>
            <span className={styles.configLabel}>版本号</span>
            <span className={styles.configValue}>{config.outputSettings.versionNumber}</span>
          </div>
          <div className={styles.configRow}>
            <span className={styles.configLabel}>序列号</span>
            <span className={styles.configValue}>
              {config.outputSettings.versionNumber}.{config.outputSettings.versionSequence}
            </span>
          </div>
          {outputDir && (
            <div className={styles.configRow}>
              <span className={styles.configLabel}>导出目录</span>
              <span className={styles.configValuePath}>{outputDir}</span>
            </div>
          )}
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
            disabled={isExporting}
            size="large"
          >
            {isExporting ? '导出中...' : '开始导出'}
          </Button>
          <Button
            className={styles.gitBtn}
            icon={<ArrowUploadRegular />}
            appearance="secondary"
            onClick={handleGitPush}
            disabled={!canGitPush}
            size="large"
          >
            Git
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

      {/* 导出结果 */}
      {exportResult && !isExporting && (
        <div className={styles.resultSection}>
          {/* 摘要行：状态 + 耗时 + 统计 */}
          <div className={styles.resultSummary}>
            {exportResult.success ? (
              <CheckmarkCircleRegular className={`${styles.resultStatusIcon} ${styles.successColor}`} />
            ) : (
              <DismissCircleRegular className={`${styles.resultStatusIcon} ${styles.failColor}`} />
            )}
            <span className={styles.resultStatusText}>
              {exportResult.success ? '导出成功' : '导出失败'}
            </span>
            <span className={styles.resultDuration}>
              {exportResult.duration.toFixed(1)}s
            </span>
            <div className={styles.resultStats}>
              {exportResult.modifiedFiles.length > 0 && (
                <span className={`${styles.statItem} ${styles.statFiles}`}>
                  <DocumentRegular fontSize={13} />
                  {exportResult.modifiedFiles.length}
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
          {exportResult.modifiedFiles.length > 0 && (
            <div className={styles.resultCard}>
              <div className={styles.fileList}>
                {exportResult.modifiedFiles.map((file, i) => (
                  <div key={i} className={styles.fileItem}>
                    <DocumentRegular className={styles.fileIcon} fontSize={13} />
                    <span className={styles.filePath}>{file}</span>
                  </div>
                ))}
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
      )}
    </div>
  );
}
