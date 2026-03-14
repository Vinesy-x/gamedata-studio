import {
  makeStyles,
  tokens,
  Text,
  Button,
  Divider,
} from '@fluentui/react-components';
import { ArrowSyncRegular } from '@fluentui/react-icons';
import { Config } from '../../types/config';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  sectionTitle: {
    fontSize: '12px',
    fontWeight: 600,
    color: tokens.colorNeutralForeground1,
  },
  table: {
    fontSize: '11px',
    borderCollapse: 'collapse',
    width: '100%',
  },
  th: {
    textAlign: 'left',
    padding: '3px 6px',
    backgroundColor: tokens.colorNeutralBackground3,
    fontWeight: 600,
    borderBottom: `1px solid ${tokens.colorNeutralStroke1}`,
  },
  td: {
    padding: '3px 6px',
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  badge: {
    display: 'inline-block',
    padding: '1px 6px',
    borderRadius: '3px',
    fontSize: '10px',
    fontWeight: 600,
  },
  badgeOn: {
    backgroundColor: tokens.colorPaletteGreenBackground1,
    color: tokens.colorPaletteGreenForeground1,
  },
  badgeOff: {
    backgroundColor: tokens.colorNeutralBackground3,
    color: tokens.colorNeutralForeground3,
  },
});

interface ConfigPanelProps {
  config: Config;
  onReload: () => void;
}

export function ConfigPanel({ config, onReload }: ConfigPanelProps) {
  const styles = useStyles();

  return (
    <div className={styles.container}>
      <Button icon={<ArrowSyncRegular />} appearance="subtle" size="small" onClick={onReload}>
        重新加载配置
      </Button>

      {/* 输出设置 */}
      <div className={styles.section}>
        <Text className={styles.sectionTitle}>输出设置</Text>
        <table className={styles.table}>
          <tbody>
            <tr>
              <td className={styles.td}>输出版本</td>
              <td className={styles.td}><strong>{config.outputSettings.versionName}</strong></td>
            </tr>
            <tr>
              <td className={styles.td}>版本号</td>
              <td className={styles.td}><strong>{config.outputSettings.versionNumber}</strong></td>
            </tr>
            <tr>
              <td className={styles.td}>序列号</td>
              <td className={styles.td}><strong>{config.outputSettings.versionSequence}</strong></td>
            </tr>
            {config.outputSettings.outputDirectory && (
              <tr>
                <td className={styles.td}>输出目录</td>
                <td className={styles.td} style={{ wordBreak: 'break-all' }}>
                  {config.outputSettings.outputDirectory}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Divider />

      {/* 版本模板 */}
      <div className={styles.section}>
        <Text className={styles.sectionTitle}>版本模板 ({config.versionTemplates.size})</Text>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>版本名</th>
              <th className={styles.th}>线路</th>
              <th className={styles.th}>字段</th>
            </tr>
          </thead>
          <tbody>
            {Array.from(config.versionTemplates.values()).map((vt) => (
              <tr key={vt.name}>
                <td className={styles.td}>
                  {vt.name === config.outputSettings.versionName
                    ? <strong>{vt.name} *</strong>
                    : vt.name
                  }
                </td>
                <td className={styles.td}>{vt.lineId}</td>
                <td className={styles.td}>{vt.lineField || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Divider />

      {/* 待处理表格 */}
      <div className={styles.section}>
        <Text className={styles.sectionTitle}>数据表 ({config.tablesToProcess.size})</Text>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>中文名</th>
              <th className={styles.th}>英文名</th>
              <th className={styles.th}>状态</th>
            </tr>
          </thead>
          <tbody>
            {Array.from(config.tablesToProcess.values()).map((t) => (
              <tr key={t.chineseName}>
                <td className={styles.td}>{t.chineseName}</td>
                <td className={styles.td}>{t.englishName}</td>
                <td className={styles.td}>
                  <span className={`${styles.badge} ${t.shouldOutput ? styles.badgeOn : styles.badgeOff}`}>
                    {t.shouldOutput ? '输出' : '跳过'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
