import {
  makeStyles,
  tokens,
  Text,
  Badge,
  Card,
  CardHeader,
  Button,
} from '@fluentui/react-components';
import {
  CheckmarkCircleRegular,
  DismissCircleRegular,
  WarningRegular,
  NavigationRegular,
  DocumentRegular,
} from '@fluentui/react-icons';
import { ExportResult } from '../../types/table';
import { ExportError } from '../../types/errors';
import { excelHelper } from '../../utils/ExcelHelper';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginTop: '8px',
  },
  summary: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px',
    borderRadius: '4px',
  },
  summarySuccess: {
    backgroundColor: tokens.colorPaletteGreenBackground1,
  },
  summaryError: {
    backgroundColor: tokens.colorPaletteRedBackground1,
  },
  fileList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    padding: '4px 0',
  },
  fileItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '12px',
    padding: '2px 4px',
    ':hover': {
      backgroundColor: tokens.colorNeutralBackground2,
    },
  },
  warningList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  warningItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '4px',
    fontSize: '11px',
    padding: '4px',
    backgroundColor: tokens.colorPaletteYellowBackground1,
    borderRadius: '2px',
  },
  errorItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '4px',
    fontSize: '11px',
    padding: '4px',
    backgroundColor: tokens.colorPaletteRedBackground1,
    borderRadius: '2px',
  },
  warningText: {
    flex: 1,
    wordBreak: 'break-all',
  },
  navigateBtn: {
    minWidth: 'auto',
    padding: '0 4px',
    fontSize: '10px',
  },
  sectionTitle: {
    fontSize: '12px',
    fontWeight: 600,
    marginTop: '8px',
    marginBottom: '4px',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  duration: {
    fontSize: '11px',
    color: tokens.colorNeutralForeground3,
  },
});

interface ResultPanelProps {
  result: ExportResult;
}

export function ResultPanel({ result }: ResultPanelProps) {
  const styles = useStyles();

  const warnings = result.errors.filter(e => e.severity === 'warning');
  const errors = result.errors.filter(e => e.severity === 'error');

  const handleNavigate = async (error: ExportError) => {
    if (error.location) {
      await excelHelper.navigateToCell(
        error.location.sheetName,
        error.location.row,
        error.location.column
      );
    }
  };

  return (
    <div className={styles.container}>
      {/* 导出摘要 */}
      <div className={`${styles.summary} ${result.success ? styles.summarySuccess : styles.summaryError}`}>
        {result.success ? <CheckmarkCircleRegular /> : <DismissCircleRegular />}
        <Text size={200} weight="semibold">
          {result.success ? '导出完成' : '导出失败'}
        </Text>
        <Text size={200}>
          变更: {result.changedTables} / {result.totalTables} 张表
        </Text>
        <Text className={styles.duration}>
          耗时: {result.duration.toFixed(1)}s
        </Text>
      </div>

      {/* 变更文件列表 */}
      {result.modifiedFiles.length > 0 && (
        <>
          <div className={styles.sectionTitle}>
            <DocumentRegular />
            变更文件 ({result.modifiedFiles.length})
          </div>
          <div className={styles.fileList}>
            {result.modifiedFiles.map((file, i) => (
              <div key={i} className={styles.fileItem}>
                <DocumentRegular fontSize={12} />
                <Text size={200}>{file}</Text>
              </div>
            ))}
          </div>
        </>
      )}

      {/* 校验警告 */}
      {warnings.length > 0 && (
        <>
          <div className={styles.sectionTitle}>
            <WarningRegular />
            校验警告 ({warnings.length})
          </div>
          <div className={styles.warningList}>
            {warnings.slice(0, 50).map((w, i) => (
              <div key={i} className={styles.warningItem}>
                <WarningRegular fontSize={14} />
                <span className={styles.warningText}>
                  {w.tableName} {w.location ? `行${w.location.row} 列${w.location.column}` : ''}: {w.message}
                </span>
                {w.location && (
                  <Button
                    className={styles.navigateBtn}
                    size="small"
                    appearance="subtle"
                    icon={<NavigationRegular fontSize={12} />}
                    onClick={() => handleNavigate(w)}
                  >
                    定位
                  </Button>
                )}
              </div>
            ))}
            {warnings.length > 50 && (
              <Text size={100}>...还有 {warnings.length - 50} 条警告</Text>
            )}
          </div>
        </>
      )}

      {/* 错误 */}
      {errors.length > 0 && (
        <>
          <div className={styles.sectionTitle}>
            <DismissCircleRegular />
            错误 ({errors.length})
          </div>
          <div className={styles.warningList}>
            {errors.map((e, i) => (
              <div key={i} className={styles.errorItem}>
                <DismissCircleRegular fontSize={14} />
                <span className={styles.warningText}>
                  [{e.code}] {e.tableName}: {e.message}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
