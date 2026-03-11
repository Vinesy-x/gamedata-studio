import { useState, useCallback } from 'react';
import {
  makeStyles,
  tokens,
  Button,
  Text,
  Card,
  CardHeader,
  Textarea,
} from '@fluentui/react-components';
import {
  BranchRegular,
  CopyRegular,
  CheckmarkRegular,
} from '@fluentui/react-icons';
import { GitHandler } from '../../git/GitHandler';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginTop: '8px',
  },
  commandBlock: {
    fontFamily: 'Consolas, Monaco, monospace',
    fontSize: '11px',
    backgroundColor: tokens.colorNeutralBackground3,
    padding: '8px',
    borderRadius: '4px',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-all',
    maxHeight: '120px',
    overflow: 'auto',
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  label: {
    fontSize: '12px',
    fontWeight: 600,
    marginBottom: '4px',
  },
  hint: {
    fontSize: '11px',
    color: tokens.colorNeutralForeground3,
    lineHeight: '1.4',
  },
});

interface GitPanelProps {
  modifiedFiles: string[];
  outputDirectory: string;
}

export function GitPanel({ modifiedFiles, outputDirectory }: GitPanelProps) {
  const styles = useStyles();
  const [copied, setCopied] = useState(false);

  const gitHandler = new GitHandler(outputDirectory);
  const commitMessage = gitHandler.generateCommitMessage(
    '', '', 0, 0
  );
  const pushScript = gitHandler.getFullPushScript(modifiedFiles, commitMessage);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(pushScript);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 降级方案
      const textarea = document.createElement('textarea');
      textarea.value = pushScript;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [pushScript]);

  return (
    <Card size="small">
      <CardHeader
        image={<BranchRegular />}
        header={<Text weight="semibold">Git 操作</Text>}
      />
      <div className={styles.container}>
        <Text className={styles.hint}>
          v1.0 版本暂不支持自动 Git 操作。请复制以下命令在终端中执行。
        </Text>

        <div className={styles.label}>提交推送命令:</div>
        <div className={styles.commandBlock}>{pushScript || '(无变更文件)'}</div>

        <Button
          icon={copied ? <CheckmarkRegular /> : <CopyRegular />}
          appearance="subtle"
          onClick={handleCopy}
          disabled={!pushScript}
        >
          {copied ? '已复制' : '复制命令'}
        </Button>

        <Text className={styles.hint}>
          变更文件 ({modifiedFiles.length} 个):
          {modifiedFiles.map((f, i) => (
            <span key={i}><br />  - {f}</span>
          ))}
        </Text>
      </div>
    </Card>
  );
}
