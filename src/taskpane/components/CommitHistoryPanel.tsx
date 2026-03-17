import { useCallback, useEffect, useState } from 'react';
import {
  makeStyles,
  tokens,
  Button,
  Spinner,
  Text,
} from '@fluentui/react-components';
import { ArrowResetRegular } from '@fluentui/react-icons';
import { GitHandler } from '../../git/GitHandler';
import { GitExecutor } from '../../git/GitExecutor';
import { useThemeText } from '../locales';
import { logger } from '../../utils/Logger';
import { gdsTokens } from '../theme';

interface CommitEntry {
  hash: string;
  shortHash: string;
  date: string;
  author: string;
  message: string;
}

function formatDate(raw: string): string {
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw;
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${mm}-${dd} ${hh}:${min}`;
}

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 12px 8px 12px',
    flexShrink: 0,
  },
  title: {
    fontSize: '14px',
    fontWeight: 600,
  },
  scrollArea: {
    flex: 1,
    overflow: 'auto',
    padding: '0 12px 12px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  card: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    padding: '8px 10px',
    borderRadius: '6px',
    backgroundColor: tokens.colorNeutralBackground1,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    boxShadow: gdsTokens.shadow.sm,
    cursor: 'pointer',
    transitionProperty: 'border-color',
    transitionDuration: '0.15s',
  },
  cardRow1: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  commitHash: {
    fontSize: '11px',
    fontFamily: '"Cascadia Code", "Fira Code", Consolas, monospace',
    color: tokens.colorBrandForeground1,
    fontWeight: 600,
  },
  commitDate: {
    fontSize: '10px',
    color: tokens.colorNeutralForeground3,
  },
  commitMessage: {
    fontSize: '12px',
    color: tokens.colorNeutralForeground1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  commitAuthor: {
    fontSize: '10px',
    color: tokens.colorNeutralForeground3,
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
    padding: '4px 0',
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
      if (parts.length < 4) return null;
      const hash = parts[0];
      const date = parts[1];
      const author = parts[2];
      const message = parts.slice(3).join('||');
      return {
        hash,
        shortHash: hash.substring(0, 7),
        date: date.trim(),
        author: author.trim(),
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
  const [selectedHash, setSelectedHash] = useState<string | null>(null);
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

      // 先检查目录是否在有效的 git 仓库内
      const checkResult = await executor.execute(outputDirectory, handler.generateCheckGitRepoCommands());
      if (!checkResult.ok) {
        setCommits([]);
        return; // 非 git 仓库，静默返回空
      }
      // 验证 .git 在输出目录或其上 1-2 级父目录内（不接受更远的祖先）
      // 例如输出目录 /data/1.06/主干版本，.git 可以在 /data/1.06/ 下
      const repoRoot = checkResult.output.trim().replace(/\\/g, '/').replace(/\/$/, '');
      const normalizedDir = outputDirectory.replace(/\\/g, '/').replace(/\/$/, '');
      const depth = normalizedDir.replace(repoRoot, '').split('/').filter(Boolean).length;
      if (!normalizedDir.startsWith(repoRoot) || depth > 2) {
        setCommits([]);
        return;
      }

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
      logger.info(`[CommitHistory] rollback to ${hash}`);
      const result = await executor.execute(outputDirectory, cmds);
      if (result.ok) {
        setStatusMsg(t.commitHistory.rollbackSuccess);
        setSelectedHash(null);
        await loadCommits();
      } else {
        setStatusMsg(`${t.commitHistory.rollbackFail}: ${result.error || ''}`);
        logger.error(`[CommitHistory] rollback failed: ${result.error}`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setStatusMsg(`${t.commitHistory.rollbackFail}: ${msg}`);
    } finally {
      setRolling(false);
    }
  }, [outputDirectory, loadCommits, t.commitHistory]);

  return (
    <div className={styles.root}>
      {/* Fixed header */}
      <div className={styles.header}>
        <Text className={styles.title}>{t.commitHistory.title}</Text>
        {selectedHash && (
          <Button
            size="small"
            appearance="primary"
            icon={<ArrowResetRegular fontSize={14} />}
            onClick={() => handleRollback(selectedHash)}
            disabled={rolling}
          >
            {rolling ? t.commitHistory.rolling : t.commitHistory.rollbackBtn}
          </Button>
        )}
      </div>

      {/* Scrollable card list */}
      <div className={styles.scrollArea}>
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
          <div
            key={commit.hash}
            className={styles.card}
            style={selectedHash === commit.hash
              ? { outline: `1.5px solid ${tokens.colorBrandForeground1}`, outlineOffset: '-1px' }
              : undefined}
            onClick={() => {
              setSelectedHash(selectedHash === commit.hash ? null : commit.hash);
              setStatusMsg('');
            }}
          >
            <div className={styles.cardRow1}>
              <span className={styles.commitHash}>{commit.shortHash}</span>
              <span className={styles.commitDate}>{formatDate(commit.date)}</span>
            </div>
            <span className={styles.commitMessage} title={commit.message}>{commit.message}</span>
            <span className={styles.commitAuthor}>{commit.author}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
