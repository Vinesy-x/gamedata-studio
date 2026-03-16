import { CommitHistoryPanel } from './CommitHistoryPanel';

interface ExportLogSubPageProps {
  outputDirectory: string;
}

export function ExportLogSubPage({ outputDirectory }: ExportLogSubPageProps) {
  if (!outputDirectory) {
    return (
      <div style={{ padding: '24px 14px', fontSize: '12px', color: '#999', textAlign: 'center' }}>
        请先配置输出目录
      </div>
    );
  }
  return <CommitHistoryPanel outputDirectory={outputDirectory} />;
}
