import { useMemo } from 'react';
import {
  makeStyles,
  tokens,
  Text,
  Label,
} from '@fluentui/react-components';
import {
  FolderRegular,
  TextDescriptionRegular,
} from '@fluentui/react-icons';
import { Config } from '../../types/config';
import { GitHandler } from '../../git/GitHandler';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    padding: '14px',
  },
  sectionTitle: {
    fontSize: '13px',
    fontWeight: 600,
    color: tokens.colorNeutralForeground1,
  },
  card: {
    backgroundColor: tokens.colorNeutralBackground2,
    borderRadius: '6px',
    padding: '10px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  fieldRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  fieldLabel: {
    fontSize: '12px',
    color: tokens.colorNeutralForeground3,
  },
  previewText: {
    fontSize: '11px',
    color: tokens.colorNeutralForeground2,
    fontFamily: 'Consolas, Monaco, monospace',
    backgroundColor: tokens.colorNeutralBackground3,
    padding: '6px 8px',
    borderRadius: '4px',
    wordBreak: 'break-all',
    lineHeight: '1.4',
  },
  hint: {
    fontSize: '11px',
    color: tokens.colorNeutralForeground3,
    padding: '6px 8px',
    backgroundColor: tokens.colorNeutralBackground2,
    borderRadius: '4px',
  },
});

interface GitPanelProps {
  config: Config;
  modifiedFiles: string[];
  outputDirectory: string;
}

export function GitPanel({ config, outputDirectory }: GitPanelProps) {
  const styles = useStyles();

  const gitHandler = useMemo(
    () => new GitHandler(config.outputSettings.outputDirectory || outputDirectory),
    [config, outputDirectory]
  );

  const commitMessage = useMemo(
    () => gitHandler.generateCommitMessage(
      config.gitCommitTemplate,
      config.outputSettings.versionName,
      config.outputSettings.versionNumber,
      config.outputSettings.versionSequence,
      config.operator
    ),
    [gitHandler, config]
  );

  const repoPath = config.outputSettings.outputDirectory || outputDirectory || '(未配置)';

  return (
    <div className={styles.container}>
      <Text className={styles.sectionTitle}>Git 设置</Text>

      <div className={styles.card}>
        <div className={styles.fieldRow}>
          <Label className={styles.fieldLabel} htmlFor="git-repo">
            <FolderRegular fontSize={12} style={{ marginRight: 4 }} />
            仓库目录
          </Label>
          <div className={styles.previewText}>{repoPath}</div>
        </div>

        <div className={styles.fieldRow}>
          <Label className={styles.fieldLabel} htmlFor="git-commit">
            <TextDescriptionRegular fontSize={12} style={{ marginRight: 4 }} />
            提交信息预览
          </Label>
          <div className={styles.previewText}>{commitMessage}</div>
        </div>
      </div>

      <Text className={styles.hint}>
        导出时自动同步仓库（pull）并在完成后自动提交推送（push）。
      </Text>
    </div>
  );
}
