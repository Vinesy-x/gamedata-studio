import { useCallback, useMemo, useState } from 'react';
import { Input, tokens } from '@fluentui/react-components';
import { CommitHistoryPanel } from './CommitHistoryPanel';
import { Config } from '../../types/config';

interface ExportLogSubPageProps {
  config: Config;
}

/**
 * 从输出目录模板和版本号解析 git 仓库根目录。
 * 直接替换模板变量后截取到 {0} 段结尾，不依赖分支名。
 */
function resolveGitRoot(gitDirectory: string, versionNumber: number): string {
  if (!gitDirectory) return '';
  let versionStr = String(versionNumber);
  if (!versionStr.includes('.')) versionStr += '.0';
  const idx = gitDirectory.indexOf('{0}');
  if (idx < 0) return '';
  const afterTag = idx + 3;
  const nextSep = gitDirectory.indexOf('/', afterTag) !== -1
    ? gitDirectory.indexOf('/', afterTag)
    : gitDirectory.indexOf('\\', afterTag);
  const template = nextSep > 0 ? gitDirectory.substring(0, nextSep) : gitDirectory;
  return template.replace('{0}', versionStr).replace(/\{1\}/g, '');
}

export function ExportLogSubPage({ config }: ExportLogSubPageProps) {
  const [localVersion, setLocalVersion] = useState(String(config.outputSettings.versionNumber));
  const [activeVersion, setActiveVersion] = useState(config.outputSettings.versionNumber);

  const gitRoot = useMemo(
    () => resolveGitRoot(config.gitDirectory || '', activeVersion),
    [config.gitDirectory, activeVersion]
  );

  const handleVersionBlur = useCallback(() => {
    const num = parseFloat(localVersion);
    if (!isNaN(num) && num !== activeVersion) {
      setActiveVersion(num);
    }
  }, [localVersion, activeVersion]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    }
  }, []);

  if (!gitRoot) {
    return (
      <div style={{ padding: '24px 14px', fontSize: '12px', color: '#999', textAlign: 'center' }}>
        请先配置输出目录
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, borderBottom: `1px solid ${tokens.colorNeutralStroke2}` }}>
        <span style={{ fontSize: '12px', color: tokens.colorNeutralForeground3, whiteSpace: 'nowrap' }}>本地文件夹分支</span>
        <Input
          size="small"
          value={localVersion}
          onChange={(_, d) => setLocalVersion(d.value)}
          onBlur={handleVersionBlur}
          onKeyDown={handleKeyDown}
          style={{ width: 70 }}
        />
      </div>
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <CommitHistoryPanel key={gitRoot} outputDirectory={gitRoot} />
      </div>
    </div>
  );
}
