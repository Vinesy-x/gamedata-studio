import {
  makeStyles,
  tokens,
  Text,
  Divider,
} from '@fluentui/react-components';
import {
  ArrowExportRegular,
  SettingsRegular,
  ShieldCheckmarkRegular,
  EyeRegular,
  TableRegular,
  BranchRegular,
  PeopleTeamRegular,
} from '@fluentui/react-icons';
import { useThemeText } from '../locales';

const useStyles = makeStyles({
  container: {
    padding: '14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '0',
  },
  section: {
    marginBottom: '14px',
  },
  sectionTitle: {
    fontSize: '13px',
    fontWeight: 600,
    color: tokens.colorNeutralForeground1,
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginBottom: '6px',
  },
  sectionBody: {
    fontSize: '11px',
    color: tokens.colorNeutralForeground2,
    lineHeight: '1.7',
  },
  dt: {
    fontWeight: 600,
    color: tokens.colorNeutralForeground1,
    marginTop: '6px',
  },
  dd: {
    marginLeft: '0',
    marginBottom: '4px',
  },
  code: {
    fontFamily: 'Consolas, monospace',
    fontSize: '10px',
    backgroundColor: tokens.colorNeutralBackground3,
    padding: '1px 4px',
    borderRadius: '3px',
  },
  footer: {
    padding: '12px 0 4px',
    fontSize: '10px',
    color: tokens.colorNeutralForeground3,
    textAlign: 'center',
  },
});

export function HelpPanel() {
  const styles = useStyles();
  const t = useThemeText();
  const h = t.help;

  return (
    <div className={styles.container}>
      {/* 快速入门 */}
      <div className={styles.section}>
        <Text className={styles.sectionTitle}>
          <TableRegular fontSize={14} /> {h.quickStart.title}
        </Text>
        <div className={styles.sectionBody}>
          {h.quickStart.body.split('\n\n').map((p, i) => (
            <p key={i} style={{ margin: '0 0 6px' }}>{p}</p>
          ))}
        </div>
      </div>

      <Divider />

      {/* 导出/发射 */}
      <div className={styles.section} style={{ marginTop: '12px' }}>
        <Text className={styles.sectionTitle}>
          <ArrowExportRegular fontSize={14} /> {h.exportSection.title}
        </Text>
        <div className={styles.sectionBody}>
          <dl style={{ margin: 0 }}>
            <dt className={styles.dt}>{h.terms.export}流程</dt>
            <dd className={styles.dd}>{h.exportSection.flow}</dd>
            <dt className={styles.dt}>{h.terms.outputDir}</dt>
            <dd className={styles.dd}>{h.exportSection.outputDir}</dd>
            <dt className={styles.dt}>{h.terms.git}推送</dt>
            <dd className={styles.dd}>{h.exportSection.git}</dd>
          </dl>
        </div>
      </div>

      <Divider />

      {/* 协同 */}
      <div className={styles.section} style={{ marginTop: '12px' }}>
        <Text className={styles.sectionTitle}>
          <PeopleTeamRegular fontSize={14} /> {h.collab.title}
        </Text>
        <div className={styles.sectionBody}>
          <dl style={{ margin: 0 }}>
            <dt className={styles.dt}>工作原理</dt>
            <dd className={styles.dd}>{h.collab.howItWorks}</dd>
            <dt className={styles.dt}>{t.export.config.monitor}</dt>
            <dd className={styles.dd}>{h.collab.monitor}</dd>
          </dl>
        </div>
      </div>

      <Divider />

      {/* 管理/舰桥 */}
      <div className={styles.section} style={{ marginTop: '12px' }}>
        <Text className={styles.sectionTitle}>
          <SettingsRegular fontSize={14} /> {h.manageSection.title}
        </Text>
        <div className={styles.sectionBody}>
          <dl style={{ margin: 0 }}>
            <dt className={styles.dt}>{t.manage.subNav[0]}</dt>
            <dd className={styles.dd}>{h.manageSection.config}</dd>
            <dt className={styles.dt}>{t.manage.subNav[1]}</dt>
            <dd className={styles.dd}>{h.manageSection.tableManage}</dd>
            <dt className={styles.dt}>{t.manage.subNav[2]}</dt>
            <dd className={styles.dd}>{h.manageSection.newTable}</dd>
          </dl>
        </div>
      </div>

      <Divider />

      {/* 校验/维修 */}
      <div className={styles.section} style={{ marginTop: '12px' }}>
        <Text className={styles.sectionTitle}>
          <ShieldCheckmarkRegular fontSize={14} /> {h.validateSection.title}
        </Text>
        <div className={styles.sectionBody}>
          <p style={{ margin: '0 0 6px' }}>{h.validateSection.intro}</p>
        </div>
      </div>

      <Divider />

      {/* 预览/试飞 */}
      <div className={styles.section} style={{ marginTop: '12px' }}>
        <Text className={styles.sectionTitle}>
          <EyeRegular fontSize={14} /> {h.previewSection.title}
        </Text>
        <div className={styles.sectionBody}>
          <dl style={{ margin: 0 }}>
            <dt className={styles.dt}>{h.terms.preview}</dt>
            <dd className={styles.dd}>{h.previewSection.preview}</dd>
            <dt className={styles.dt}>数据清洗</dt>
            <dd className={styles.dd}>{h.previewSection.highlight}</dd>
          </dl>
        </div>
      </div>

      <Divider />

      {/* 数据表/设备结构 */}
      <div className={styles.section} style={{ marginTop: '12px' }}>
        <Text className={styles.sectionTitle}>
          <BranchRegular fontSize={14} /> {h.structure.title}
        </Text>
        <div className={styles.sectionBody}>
          <dl style={{ margin: 0 }}>
            <dt className={styles.dt}>工作表布局</dt>
            <dd className={styles.dd}>{h.structure.layout}</dd>
            <dt className={styles.dt}>字段定义</dt>
            <dd className={styles.dd}>{h.structure.fields}</dd>
            <dt className={styles.dt}>{h.terms.version}区间</dt>
            <dd className={styles.dd}>{h.structure.versionRange}</dd>
            <dt className={styles.dt}>{h.terms.route}控制</dt>
            <dd className={styles.dd}>{h.structure.routes}</dd>
          </dl>
        </div>
      </div>

      <div className={styles.footer}>
        GameData Studio v1.8
      </div>
    </div>
  );
}
