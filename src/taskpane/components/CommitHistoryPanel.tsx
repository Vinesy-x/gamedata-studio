import { useCallback, useEffect, useState } from 'react';
import {
  makeStyles,
  tokens,
  Button,
  Spinner,
  Text,
} from '@fluentui/react-components';
import {
  ArrowResetRegular,
  WarningRegular,
} from '@fluentui/react-icons';
import { GitHandler } from '../../git/GitHandler';
import { GitExecutor } from '../../git/GitExecutor';
import { useThemeText } from '../locales';
import { logger } from '../../utils/Logger';
import { gdsTokens } from '../theme';

interface CommitEntry {
  hash: string;
  shortHash: string;
  date: string;
  message: string;
}

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    padding: '12px',
    height: '100%',
    overflow: 'auto',
  },
  title: {
    fontSize: '14px',
    fontWeight: 600,
    marginBottom: '4px',
  },
  commitItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 10px',
    borderRadius: '6px',
    backgroundColor: tokens.colorNeutralBackground1,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    boxShadow: gdsTokens.shadow.sm,
  },
  commitInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    minWidth: 0,
  },
  commitHash: {
    fontSize: '11px',
    fontFamily: '"Cascadia Code", "Fira Code", Consolas, monospace',
    color: tokens.colorBrandForeground1,
    fontWeight: 600,
  },
  commitMessage: {
    fontSize: '12px',
    color: tokens.colorNeutralForeground1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  commitDate: {
    fontSize: '10px',
    color: tokens.colorNeutralForeground3,
  },
  rollbackBtn: {
    minWidth: 'auto',
    flexShrink: 0,
  },
  confirmBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 10px',
    borderRadius: '6px',
    backgroundColor: gdsTokens.error.bg,
    border: `1px solid ${gdsTokens.error.border}`,
  },
  confirmText: {
    fontSize: '11px',
    color: tokens.colorPaletteRedForeground1,
    flex: 1,
  },
  emptyText: {
    fontSize: '12px',
    color: tokens.colorNeutralForeground3,
    textAlign: 'center' as const,
    padding: '24px 0',
  },
  statusText: {
    fontSize: '11px',
    textAlign: 'center' as const,
    padding: '8px 0',
  },
});

async function detectFileServer(): Promise<string | null> {
  const bases = ['https://localhost:9876', 'http://localhost:9876'];
  for (const base of bases) {
    try {
      const resp = await fetch(`${base}/api/read-file?directory=.&fileName=_probe`);
      if (resp.ok || resp.status === 404) return base;
    } catch { /* try next */ }
  }
  return null;
}

function parseCommitLog(output: string): CommitEntry[] {
  return output
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const parts = line.split('||');
      if (parts.length < 3) return null;
      const hash = parts[0];
      const date = parts[1];
      const message = parts.slice(2).join('||');
      return {
        hash,
        shortHash: hash.substring(0, 7),
        date: date.trim(),
        message: message.trim(),
      };
    })
    .filter((e): e is CommitEntry => e !== null);
}

interface CommitHistoryPanelProps {
  outputDirectory: string;
}

export function CommitHistoryPanel({ outputDirectory }: CommitHistoryPanelProps) {
  const styles = useStyles();
  const t = useThemeText();
  const [commits, setCommits] = useState<CommitEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirmHash, setConfirmHash] = useState<string | null>(null);
  const [rolling, setRolling] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  const loadCommits = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const base = await detectFileServer();
      if (!base) {
        setError(t.commitHistory.serverError);
        return;
      }
      const handler = new GitHandler(outputDirectory);
      const executor = new GitExecutor(base);
      const cmds = handler.generateLogCommands();
      const result = await executor.execute(outputDirectory, cmds);
      if (result.ok) {
        setCommits(parseCommitLog(result.output));
      } else {
        setError(result.error || 'git log failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [outputDirectory, t.commitHistory.serverError]);

  useEffect(() => {
    loadCommits();
  }, [loadCommits]);

  const handleRollback = useCallback(async (hash: string) => {
    setRolling(true);
    setStatusMsg('');
    try {
      const base = await detectFileServer();
      if (!base) {
        setStatusMsg(t.commitHistory.serverError);
        return;
      }
      const handler = new GitHandler(outputDirectory);
      const executor = new GitExecutor(base);
      const cmds = handler.generateResetCommands(hash);
      logger.info(`[CommitHistory] 回退到 ${hash}`);
      const result = await executor.execute(outputDirectory, cmds);
      if (result.ok) {
        setStatusMsg(t.commitHistory.rollbackSuccess);
        setConfirmHash(null);
        await loadCommits();
      } else {
        setStatusMsg(`${t.commitHistory.rollbackFail}: ${result.error || ''}`);
        logger.error(`[CommitHistory] 回退失败: ${result.error}`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setStatusMsg(`${t.commitHistory.rollbackFail}: ${msg}`);
    } finally {
      setRolling(false);
    }
  }, [outputDirectory, loadCommits, t.commitHistory]);

  return (
    <div className={styles.container}>
      <Text className={styles.title}>{t.commitHistory.title}</Text>

      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
          <Spinner size="small" label={t.commitHistory.loading} />
        </div>
      )}

      {error && (
        <div className={styles.statusText} style={{ color: tokens.colorPaletteRedForeground1 }}>
          {error}
        </div>
      )}

      {statusMsg && (
        <div className={styles.statusText} style={{
          color: statusMsg.includes(t.commitHistory.rollbackSuccess)
            ? gdsTokens.success.text
            : tokens.colorPaletteRedForeground1,
        }}>
          {statusMsg}
        </div>
      )}

      {!loading && !error && commits.length === 0 && (
        <div className={styles.emptyText}>{t.commitHistory.empty}</div>
      )}

      {commits.map((commit) => (
        <div key={commit.hash}>
          <div className={styles.commitItem}>
            <div className={styles.commitInfo}>
              <span className={styles.commitHash}>{commit.shortHash}</span>
              <span className={styles.commitMessage} title={commit.message}>{commit.message}</span>
              <span className={styles.commitDate}>{commit.date}</span>
            </div>
            {confirmHash !== commit.hash && (
              <Button
                className={styles.rollbackBtn}
                size="small"
                appearance="subtle"
                icon={<ArrowResetRegular fontSize={14} />}
                onClick={() => { setConfirmHash(commit.hash); setStatusMsg(''); }}
                disabled={rolling}
              >
                {t.commitHistory.rollbackBtn}
              </Button>
            )}
          </div>
          {confirmHash === commit.hash && (
            <div className={styles.confirmBar} style={{ marginTop: 4 }}>
              <WarningRegular fontSize={16} style={{ color: tokens.colorPaletteRedForeground1, flexShrink: 0 }} />
              <span className={styles.confirmText}>
                {t.commitHistory.confirmMessage(commit.shortHash)}
              </span>
              <Button
                size="small"
                appearance="primary"
                style={{ backgroundColor: tokens.colorPaletteRedBackground3, flexShrink: 0 }}
                onClick={() => handleRollback(commit.hash)}
                disabled={rolling}
              >
                {rolling ? t.commitHistory.rolling : t.commitHistory.confirmBtn}
              </Button>
              <Button
                size="small"
                appearance="subtle"
                onClick={() => setConfirmHash(null)}
                disabled={rolling}
                style={{ flexShrink: 0 }}
              >
                {t.commitHistory.cancelBtn}
              </Button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
