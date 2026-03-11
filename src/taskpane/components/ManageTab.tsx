import { useState, useCallback } from 'react';
import {
  makeStyles,
  tokens,
  Text,
  Button,
  Divider,
  Input,
  Label,
  Switch,
  Dialog,
  DialogTrigger,
  DialogSurface,
  DialogTitle,
  DialogBody,
  DialogActions,
  DialogContent,
  Dropdown,
  Option,
} from '@fluentui/react-components';
import {
  SettingsRegular,
  TableRegular,
  AddRegular,
  ArrowSyncRegular,
  EditRegular,
  DeleteRegular,
  SearchRegular,
  ChevronRightRegular,
  ChevronDownRegular,
} from '@fluentui/react-icons';
import { Config, VersionTemplate, TableInfo } from '../../types/config';
import { ManageSubPage } from '../../types/studio';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  },
  subNav: {
    display: 'flex',
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  subNavItem: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4px',
    padding: '8px 0',
    fontSize: '12px',
    cursor: 'pointer',
    color: tokens.colorNeutralForeground3,
    borderBottom: '2px solid transparent',
    ':hover': {
      color: tokens.colorNeutralForeground1,
      backgroundColor: tokens.colorNeutralBackground2,
    },
  },
  subNavActive: {
    color: tokens.colorBrandForeground1,
    borderBottomColor: tokens.colorBrandForeground1,
    fontWeight: 600,
  },
  content: {
    flex: 1,
    overflow: 'auto',
    padding: '12px 14px',
  },
  section: {
    marginBottom: '16px',
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '8px',
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
    marginBottom: '8px',
  },
  table: {
    fontSize: '11px',
    borderCollapse: 'collapse',
    width: '100%',
  },
  th: {
    textAlign: 'left',
    padding: '4px 6px',
    backgroundColor: tokens.colorNeutralBackground3,
    fontWeight: 600,
    borderBottom: `1px solid ${tokens.colorNeutralStroke1}`,
  },
  td: {
    padding: '4px 6px',
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
  actionRow: {
    display: 'flex',
    gap: '4px',
  },
  emptyHint: {
    fontSize: '12px',
    color: tokens.colorNeutralForeground3,
    padding: '16px',
    textAlign: 'center' as const,
  },
  // 向导表单
  formField: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    marginBottom: '10px',
  },
  formLabel: {
    fontSize: '12px',
    color: tokens.colorNeutralForeground2,
  },
  fieldRow: {
    display: 'flex',
    gap: '6px',
    alignItems: 'center',
    marginBottom: '4px',
    fontSize: '11px',
  },
  fieldInput: {
    flex: 1,
  },
  searchBox: {
    marginBottom: '8px',
  },
});

interface ManageTabProps {
  config: Config;
  onReloadConfig: () => void;
}

export function ManageTab({ config, onReloadConfig }: ManageTabProps) {
  const styles = useStyles();
  const [subPage, setSubPage] = useState<ManageSubPage>('config');
  const [searchTerm, setSearchTerm] = useState('');

  return (
    <div className={styles.container}>
      {/* 子导航 */}
      <div className={styles.subNav}>
        <div
          className={`${styles.subNavItem} ${subPage === 'config' ? styles.subNavActive : ''}`}
          onClick={() => setSubPage('config')}
        >
          <SettingsRegular fontSize={13} />
          配置
        </div>
        <div
          className={`${styles.subNavItem} ${subPage === 'tables' ? styles.subNavActive : ''}`}
          onClick={() => setSubPage('tables')}
        >
          <TableRegular fontSize={13} />
          表管理
        </div>
        <div
          className={`${styles.subNavItem} ${subPage === 'wizard' ? styles.subNavActive : ''}`}
          onClick={() => setSubPage('wizard')}
        >
          <AddRegular fontSize={13} />
          新建表
        </div>
      </div>

      <div className={styles.content}>
        {subPage === 'config' && (
          <ConfigSubPage config={config} onReload={onReloadConfig} styles={styles} />
        )}
        {subPage === 'tables' && (
          <TablesSubPage
            config={config}
            onReload={onReloadConfig}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            styles={styles}
          />
        )}
        {subPage === 'wizard' && (
          <WizardSubPage config={config} onReload={onReloadConfig} styles={styles} />
        )}
      </div>
    </div>
  );
}

// ─── 配置管理子面板 ───

function ConfigSubPage({ config, onReload, styles }: {
  config: Config;
  onReload: () => void;
  styles: ReturnType<typeof useStyles>;
}) {
  return (
    <>
      <div className={styles.sectionHeader}>
        <Text className={styles.sectionTitle}>配置管理</Text>
        <Button icon={<ArrowSyncRegular />} appearance="subtle" size="small" onClick={onReload}>
          刷新
        </Button>
      </div>

      {/* 版本模板 */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <Text style={{ fontSize: '12px', fontWeight: 600 }}>
            版本模板 ({config.versionTemplates.size})
          </Text>
          <Button icon={<AddRegular />} appearance="subtle" size="small" disabled>
            添加
          </Button>
        </div>
        <div className={styles.card}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th}>版本名</th>
                <th className={styles.th}>线路ID</th>
                <th className={styles.th}>Git目录</th>
              </tr>
            </thead>
            <tbody>
              {Array.from(config.versionTemplates.values()).map((vt) => (
                <tr key={vt.name}>
                  <td className={styles.td}>
                    <strong>{vt.name}</strong>
                    {vt.name === config.outputSettings.versionName && ' *'}
                  </td>
                  <td className={styles.td}>{vt.lineId}</td>
                  <td className={styles.td} style={{ wordBreak: 'break-all', maxWidth: 120 }}>
                    {vt.gitDirectory ? vt.gitDirectory.substring(0, 40) + '...' : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 线路模板 */}
      <div className={styles.section}>
        <Text style={{ fontSize: '12px', fontWeight: 600 }}>
          线路列表 ({config.lineTemplates.size})
        </Text>
        <div className={styles.card}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th}>ID</th>
                <th className={styles.th}>字段</th>
                <th className={styles.th}>备注</th>
              </tr>
            </thead>
            <tbody>
              {Array.from(config.lineTemplates.values())
                .sort((a, b) => a.id - b.id)
                .map((lt) => (
                  <tr key={lt.id}>
                    <td className={styles.td}>{lt.id}</td>
                    <td className={styles.td}>{lt.field}</td>
                    <td className={styles.td}>{lt.remark || '-'}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 人员代码 */}
      <div className={styles.section}>
        <Text style={{ fontSize: '12px', fontWeight: 600 }}>
          人员代码 ({config.staffCodes.size})
        </Text>
        <div className={styles.card}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th}>姓名</th>
                <th className={styles.th}>代码</th>
              </tr>
            </thead>
            <tbody>
              {Array.from(config.staffCodes.values()).map((s) => (
                <tr key={s.name}>
                  <td className={styles.td}>{s.name}</td>
                  <td className={styles.td}>{s.code}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Git 提交模板 */}
      <div className={styles.section}>
        <Text style={{ fontSize: '12px', fontWeight: 600 }}>Git 提交模板</Text>
        <div className={styles.card}>
          <Text style={{ fontSize: '11px', fontFamily: 'Consolas, monospace' }}>
            {config.gitCommitTemplate || '(未配置)'}
          </Text>
        </div>
      </div>

      {/* 功能开关 */}
      <div className={styles.section}>
        <Text style={{ fontSize: '12px', fontWeight: 600 }}>功能开关</Text>
        <div className={styles.card}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: '11px' }}>自动弹出路径</Text>
            <Switch checked={config.showResourcePopup} disabled />
          </div>
        </div>
      </div>
    </>
  );
}

// ─── 表管理子面板 ───

function TablesSubPage({ config, onReload, searchTerm, onSearchChange, styles }: {
  config: Config;
  onReload: () => void;
  searchTerm: string;
  onSearchChange: (val: string) => void;
  styles: ReturnType<typeof useStyles>;
}) {
  const tables = Array.from(config.tablesToProcess.values());
  const filtered = searchTerm
    ? tables.filter(t =>
        t.chineseName.includes(searchTerm) ||
        t.englishName.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : tables;

  return (
    <>
      <div className={styles.sectionHeader}>
        <Text className={styles.sectionTitle}>数据表管理</Text>
        <Button icon={<ArrowSyncRegular />} appearance="subtle" size="small" onClick={onReload}>
          刷新
        </Button>
      </div>

      <div className={styles.searchBox}>
        <Input
          contentBefore={<SearchRegular fontSize={14} />}
          placeholder="搜索表名..."
          size="small"
          value={searchTerm}
          onChange={(_, data) => onSearchChange(data.value)}
          style={{ width: '100%' }}
        />
      </div>

      <div className={styles.card}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>中文名</th>
              <th className={styles.th}>英文名</th>
              <th className={styles.th}>版本</th>
              <th className={styles.th}>状态</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((t) => (
              <tr key={t.chineseName}>
                <td className={styles.td}>{t.chineseName}</td>
                <td className={styles.td}>{t.englishName}</td>
                <td className={styles.td}>{t.versionRange || '-'}</td>
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

      <Text style={{ fontSize: '11px', color: tokens.colorNeutralForeground3, marginTop: '4px' }}>
        共 {filtered.length} 张表{searchTerm ? `（筛选自 ${tables.length} 张）` : ''}
      </Text>
    </>
  );
}

// ─── 新表创建向导子面板 ───

interface WizardField {
  name: string;
  type: string;
  description: string;
  isKey: boolean;
  isLanguage: boolean;
}

function WizardSubPage({ config, onReload, styles }: {
  config: Config;
  onReload: () => void;
  styles: ReturnType<typeof useStyles>;
}) {
  const [chineseName, setChineseName] = useState('');
  const [englishName, setEnglishName] = useState('');
  const [startVersion, setStartVersion] = useState('1');
  const [includeVersionCol, setIncludeVersionCol] = useState(false);
  const [autoRegister, setAutoRegister] = useState(true);
  const [fields, setFields] = useState<WizardField[]>([
    { name: 'id', type: 'int', description: 'ID', isKey: true, isLanguage: false },
  ]);

  const addField = () => {
    setFields([...fields, { name: '', type: 'string', description: '', isKey: false, isLanguage: false }]);
  };

  const removeField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  const updateField = (index: number, key: keyof WizardField, value: string | boolean) => {
    const updated = [...fields];
    (updated[index] as any)[key] = value;
    setFields(updated);
  };

  const handleCreate = async () => {
    if (!chineseName || !englishName || fields.length === 0) return;
    // TODO: 接入 TableCreator
    alert(`创建表「${chineseName}」(${englishName}) 功能即将上线`);
  };

  const typeOptions = ['int', 'string', 'float', 'bool', 'int[]', 'string[]', 'float[]'];

  return (
    <>
      <Text className={styles.sectionTitle}>新表创建向导</Text>

      <div style={{ marginTop: '12px' }}>
        <div className={styles.formField}>
          <Label className={styles.formLabel}>中文表名</Label>
          <Input
            size="small"
            value={chineseName}
            onChange={(_, d) => setChineseName(d.value)}
            placeholder="如：怪物表"
          />
        </div>

        <div className={styles.formField}>
          <Label className={styles.formLabel}>英文表名</Label>
          <Input
            size="small"
            value={englishName}
            onChange={(_, d) => setEnglishName(d.value)}
            placeholder="如：Monsters"
          />
        </div>

        <div className={styles.formField}>
          <Label className={styles.formLabel}>起始版本号</Label>
          <Input
            size="small"
            value={startVersion}
            onChange={(_, d) => setStartVersion(d.value)}
            placeholder="如：1.09"
          />
        </div>

        <div style={{ display: 'flex', gap: '16px', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Switch
              checked={includeVersionCol}
              onChange={(_, d) => setIncludeVersionCol(d.checked)}
            />
            <Text style={{ fontSize: '11px' }}>包含 version_c</Text>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Switch
              checked={autoRegister}
              onChange={(_, d) => setAutoRegister(d.checked)}
            />
            <Text style={{ fontSize: '11px' }}>自动注册</Text>
          </div>
        </div>

        <Divider />

        <div className={styles.sectionHeader} style={{ marginTop: '12px' }}>
          <Text style={{ fontSize: '12px', fontWeight: 600 }}>字段列表 ({fields.length})</Text>
          <Button icon={<AddRegular />} appearance="subtle" size="small" onClick={addField}>
            添加字段
          </Button>
        </div>

        {fields.map((f, i) => (
          <div key={i} className={styles.fieldRow}>
            <Input
              className={styles.fieldInput}
              size="small"
              value={f.name}
              onChange={(_, d) => updateField(i, 'name', d.value)}
              placeholder="字段名"
            />
            <Dropdown
              size="small"
              value={f.type}
              onOptionSelect={(_, d) => updateField(i, 'type', d.optionValue || 'string')}
              style={{ minWidth: 70 }}
            >
              {typeOptions.map(t => <Option key={t} value={t}>{t}</Option>)}
            </Dropdown>
            <Input
              className={styles.fieldInput}
              size="small"
              value={f.description}
              onChange={(_, d) => updateField(i, 'description', d.value)}
              placeholder="中文描述"
            />
            <Switch
              checked={f.isKey}
              onChange={(_, d) => updateField(i, 'isKey', d.checked)}
              label="Key"
              style={{ fontSize: '10px' }}
            />
            <Button
              icon={<DeleteRegular />}
              appearance="subtle"
              size="small"
              onClick={() => removeField(i)}
              disabled={fields.length <= 1}
            />
          </div>
        ))}

        <Button
          appearance="primary"
          size="medium"
          onClick={handleCreate}
          disabled={!chineseName || !englishName || fields.length === 0}
          style={{ width: '100%', marginTop: '12px' }}
        >
          创建工作表
        </Button>
      </div>
    </>
  );
}
