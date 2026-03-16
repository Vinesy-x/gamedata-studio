import { useCallback, useMemo, useState } from 'react';
import { Input, tokens } from '@fluentui/react-components';
import { CommitHistoryPanel } from './CommitHistoryPanel';
import { Config, VersionTemplate } from '../../types/config';

interface ExportLogSubPageProps {
  config: Config;
}

function resolveOutputDir(vt: VersionTemplate | undefined, versionNumber: number, versionName: string): string {
  if (!vt?.gitDirectory) return '';
  let versionStr = String(versionNumber);
  if (!versionStr.includes('.')) versionStr += '.0';
  return vt.gitDirectory.replace('{0}', versionStr).replace('{1}', versionName);
}

export function ExportLogSubPage({ config }: ExportLogSubPageProps) {
  const currentVN = config.outputSettings.versionName;
  const currentVT = config.versionTemplates.get(currentVN);
  const [localVersion, setLocalVersion] = useState(String(config.outputSettings.versionNumber));
  const [activeVersion, setActiveVersion] = useState(config.outputSettings.versionNumber);

  const outputDir = useMemo(
    () => resolveOutputDir(currentVT, activeVersion, currentVN),
    [currentVT, activeVersion, currentVN]
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

  if (!currentVT?.gitDirectory) {
    return (
      <div style={{ padding: '24px 14px', fontSize: '12px', color: '#999', textAlign: 'center' }}>
        请先配置输出目录
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, borderBottom: `1px solid ${tokens.colorNeutralStroke2}` }}>
        <span style={{ fontSize: '12px', color: tokens.colorNeutralForeground3 }}>{currentVN}</span>
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
        <CommitHistoryPanel key={outputDir} outputDirectory={outputDir} />
      </div>
    </div>
  );
}
