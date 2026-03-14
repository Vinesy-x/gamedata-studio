/* global Excel */

import { useState, useCallback, useEffect } from 'react';
import {
  makeStyles,
  tokens,
  Text,
  Button,
  Divider,
  Input,
  Label,
  Switch,
  Spinner,
  Dropdown,
  Option,
  Textarea,
} from '@fluentui/react-components';
import {
  SettingsRegular,
  TableRegular,
  AddRegular,
  ArrowSyncRegular,
  DeleteRegular,
  SearchRegular,
  CheckmarkRegular,
  DismissRegular,
} from '@fluentui/react-icons';
import { Config, VersionTemplate, TableInfo } from '../../types/config';
import { ManageSubPage, TableCreationConfig } from '../../types/studio';
import { configManager } from '../../v2/ConfigManager';
import { tableRegistry } from '../../v2/TableRegistry';
import { TableCreator } from '../../v2/TableCreator';
import { lineSyncer } from '../../v2/LineSyncer';
import { SHEET_CONFIG } from '../../v2/TemplateFactory';
import { operatorIdentity } from '../../v2/OperatorIdentity';
import { excelHelper } from '../../utils/ExcelHelper';
import { logger } from '../../utils/Logger';
import { gdsTokens } from '../theme';
import { useThemeText } from '../locales';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100%',
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
    overflowX: 'hidden',
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
    fontSize: '12px',
    fontWeight: 600,
    color: tokens.colorNeutralForeground3,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
  },
  card: {
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: '8px',
    padding: '10px 12px',
    marginBottom: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)',
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    overflow: 'hidden',
  },
  table: {
    fontSize: '11px',
    borderCollapse: 'collapse',
    width: '100%',
    tableLayout: 'fixed' as const,
  },
  th: {
    textAlign: 'left',
    padding: '5px 6px',
    backgroundColor: tokens.colorNeutralBackground3,
    fontWeight: 600,
    fontSize: '10px',
    color: tokens.colorNeutralForeground3,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.3px',
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  td: {
    padding: '5px 6px',
    borderBottom: `1px solid ${tokens.colorNeutralStroke3}`,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    wordBreak: 'break-all' as const,
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
  badgeNew: {
    backgroundColor: gdsTokens.badge.new.bg,
    color: tokens.colorBrandForeground1,
  },
  actionRow: {
    display: 'flex',
    gap: '4px',
  },
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
  switchRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '4px 0',
  },
  statusMsg: {
    fontSize: '11px',
    padding: '8px 10px',
    borderRadius: '6px',
    marginBottom: '8px',
  },
  statusSuccess: {
    backgroundColor: gdsTokens.success.bg,
    color: gdsTokens.success.text,
    border: `1px solid ${gdsTokens.success.border}`,
  },
  statusError: {
    backgroundColor: gdsTokens.error.bg,
    color: gdsTokens.error.text,
    border: `1px solid ${gdsTokens.error.border}`,
  },
});

interface ManageTabProps {
  config: Config;
  onReloadConfig: () => void;
}

export function ManageTab({ config, onReloadConfig }: ManageTabProps) {
  const t = useThemeText();
  const styles = useStyles();
  const [subPage, setSubPage] = useState<ManageSubPage>('config');
  const [searchTerm, setSearchTerm] = useState('');

  return (
    <div className={styles.container}>
      <div className={styles.subNav}>
        <div
          className={`${styles.subNavItem} ${subPage === 'config' ? styles.subNavActive : ''}`}
          onClick={() => setSubPage('config')}
        >
          <SettingsRegular fontSize={13} />
          {t.manage.subNav[0]}
        </div>
        <div
          className={`${styles.subNavItem} ${subPage === 'tables' ? styles.subNavActive : ''}`}
          onClick={() => setSubPage('tables')}
        >
          <TableRegular fontSize={13} />
          {t.manage.subNav[1]}
        </div>
        <div
          className={`${styles.subNavItem} ${subPage === 'wizard' ? styles.subNavActive : ''}`}
          onClick={() => setSubPage('wizard')}
        >
          <AddRegular fontSize={13} />
          {t.manage.subNav[2]}
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

// ─── 线路字段显示名 ───
function roadsDisplayName(lineField: string): string {
  return lineField;
}

// ─── 配置管理子面板 ───

function ConfigSubPage({ config, onReload, styles }: {
  config: Config;
  onReload: () => void;
  styles: ReturnType<typeof useStyles>;
}) {
  const t = useThemeText();
  const [editingGit, setEditingGit] = useState(false);
  const [gitTemplate, setGitTemplate] = useState(config.gitCommitTemplate || '');
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // 操作员：默认取第一个人员
  const staffList = Array.from(config.staffCodes.values());
  const defaultOperator = operatorIdentity.get() || (staffList.length > 0 ? staffList[0].name : '');
  const [operator, setOperator] = useState(defaultOperator);

  // 如果还没设置过操作员且有人员列表，自动设置默认值
  useEffect(() => {
    if (!operatorIdentity.get() && defaultOperator) {
      operatorIdentity.set(defaultOperator);
    }
  }, [defaultOperator]);

  // 添加版本表单
  const [addingVersion, setAddingVersion] = useState(false);
  const [newVersionName, setNewVersionName] = useState('');
  const [newVersionGitDir, setNewVersionGitDir] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [studioConfigVisible, setStudioConfigVisible] = useState(false);

  // Git 目录行内编辑
  const [editingGitDir, setEditingGitDir] = useState<string | null>(null);
  const [editGitDirValue, setEditGitDirValue] = useState('');

  // 人员代码编辑
  const [editingStaff, setEditingStaff] = useState<string | null>(null); // 正在编辑的人员名
  const [editStaffName, setEditStaffName] = useState('');
  const [editStaffCode, setEditStaffCode] = useState('');
  const [addingStaff, setAddingStaff] = useState(false);
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffCode, setNewStaffCode] = useState('');

  const handleSaveGitDir = useCallback(async (vt: VersionTemplate) => {
    const newDir = editGitDirValue.trim();
    setEditingGitDir(null);
    if (newDir === (vt.gitDirectory || '')) return;
    try {
      await configManager.updateVersion(vt.name, { ...vt, gitDirectory: newDir });
      onReload();
    } catch (err) {
      setStatusMsg({ text: `更新Git目录失败: ${err instanceof Error ? err.message : String(err)}`, type: 'error' });
    }
  }, [editGitDirValue, onReload]);

  // 保存人员修改
  const handleSaveStaff = useCallback(async (originalName: string) => {
    const name = editStaffName.trim();
    const code = editStaffCode.trim();
    setEditingStaff(null);
    if (!name || !code) return;
    const staff = staffList.find(s => s.name === originalName);
    if (!staff) return;
    if (name === staff.name && code === staff.code) return;
    try {
      await configManager.updateStaff(originalName, { ...staff, name, code });
      setStatusMsg({ text: `已更新人员「${originalName}」`, type: 'success' });
      onReload();
    } catch (err) {
      setStatusMsg({ text: `更新失败: ${err instanceof Error ? err.message : String(err)}`, type: 'error' });
    }
  }, [editStaffName, editStaffCode, staffList, onReload]);

  // 添加新人员
  const handleAddStaff = useCallback(async () => {
    const name = newStaffName.trim();
    const code = newStaffCode.trim();
    if (!name || !code) return;
    setSaving(true);
    try {
      const nextId = staffList.length > 0 ? Math.max(...staffList.map(s => s.id)) + 1 : 1;
      await configManager.addStaff({ id: nextId, name, code, machineCode: '' });
      setNewStaffName('');
      setNewStaffCode('');
      setAddingStaff(false);
      setStatusMsg({ text: `已添加人员「${name}」`, type: 'success' });
      onReload();
    } catch (err) {
      setStatusMsg({ text: `添加失败: ${err instanceof Error ? err.message : String(err)}`, type: 'error' });
    } finally {
      setSaving(false);
    }
  }, [newStaffName, newStaffCode, staffList, onReload]);

  const handleSaveGitTemplate = useCallback(async () => {
    setSaving(true);
    try {
      await configManager.setGitCommitTemplate(gitTemplate);
      setEditingGit(false);
      onReload();
    } catch (err) {
      logger.error('保存 Git 模板失败', err);
    } finally {
      setSaving(false);
    }
  }, [gitTemplate, onReload]);

  const handleToggleSwitch = useCallback(async (name: string, value: boolean) => {
    try {
      await configManager.setSwitch(name, value);
      onReload();
    } catch (err) {
      logger.error(`切换开关「${name}」失败`, err);
    }
  }, [onReload]);

  const handleSaveOperator = useCallback(async (name: string) => {
    setOperator(name);
    await operatorIdentity.set(name);
  }, []);

  // 添加版本
  const handleAddVersion = useCallback(async () => {
    if (!newVersionName.trim()) return;
    if (!newVersionGitDir.trim()) {
      setStatusMsg({ text: '必须配置 Git 目录，没有输出目录的线路没有意义', type: 'error' });
      return;
    }
    setSaving(true);
    setStatusMsg(null);
    try {
      // 取当前所有线路编号的最大值 + 1
      const existingNums = Array.from(config.versionTemplates.values())
        .map(v => parseInt(v.lineField.replace('roads_', ''), 10))
        .filter(n => !isNaN(n));
      const nextId = existingNums.length > 0 ? Math.max(...existingNums) + 1 : 1;
      const lineField = `roads_${nextId}`;

      await configManager.addVersion({
        name: newVersionName.trim(),
        lineId: nextId,
        lineField,
        gitDirectory: newVersionGitDir.trim(),
      });

      // 同时添加线路到配置设置表
      await configManager.addLine({ id: nextId, field: lineField, remark: newVersionName.trim() });

      setNewVersionName('');
      setNewVersionGitDir('');
      setAddingVersion(false);
      setStatusMsg({ text: `已添加版本「${newVersionName}」(${lineField})`, type: 'success' });
      onReload();
    } catch (err) {
      setStatusMsg({ text: `添加失败: ${err instanceof Error ? err.message : String(err)}`, type: 'error' });
    } finally {
      setSaving(false);
    }
  }, [newVersionName, newVersionGitDir, config.versionTemplates, onReload]);

  // 删除版本
  const handleDeleteVersion = useCallback(async (vt: VersionTemplate) => {
    setStatusMsg(null);
    try {
      await configManager.deleteVersion(vt.name);
      setStatusMsg({ text: `已删除版本「${vt.name}」`, type: 'success' });
      onReload();
    } catch (err) {
      setStatusMsg({ text: `删除失败: ${err instanceof Error ? err.message : String(err)}`, type: 'error' });
    }
  }, [onReload]);

  // 同步线路到所有表
  const handleSyncLines = useCallback(async () => {
    setSyncing(true);
    setStatusMsg(null);
    try {
      const tableNames = Array.from(config.tablesToProcess.keys());
      const result = await lineSyncer.syncAllTables(config.versionTemplates, tableNames);
      const msg = `线路同步完成: ${result.synced} 张表已同步` +
        (result.errors.length > 0 ? `, ${result.errors.length} 张失败: ${result.errors.join('、')}` : '');
      setStatusMsg({ text: msg, type: result.errors.length > 0 ? 'error' : 'success' });
    } catch (err) {
      setStatusMsg({ text: `同步失败: ${err instanceof Error ? err.message : String(err)}`, type: 'error' });
    } finally {
      setSyncing(false);
    }
  }, [config.versionTemplates, config.tablesToProcess]);

  const versions = Array.from(config.versionTemplates.values());

  return (
    <>
      <div className={styles.sectionHeader}>
        <Text className={styles.sectionTitle}>{t.manage.sectionTitle}</Text>
        <Button icon={<ArrowSyncRegular />} appearance="subtle" size="small" onClick={onReload}>
          {'刷新'}
        </Button>
      </div>

      {statusMsg && (
        <div className={`${styles.statusMsg} ${statusMsg.type === 'success' ? styles.statusSuccess : styles.statusError}`}>
          {statusMsg.text}
        </div>
      )}

      {/* 操作员 */}
      <div className={styles.section}>
        <Text style={{ fontSize: '12px', fontWeight: 600 }}>{t.manage.operator}</Text>
        <div className={styles.card}>
          <Dropdown
            size="small"
            value={operator}
            onOptionSelect={(_, d) => handleSaveOperator(d.optionValue || '')}
            style={{ width: '100%', minWidth: 0, maxWidth: '100%', boxSizing: 'border-box' }}
          >
            {staffList.map(s => (
              <Option key={s.name} value={s.name} text={s.name}>{s.name} ({s.code})</Option>
            ))}
          </Dropdown>
        </div>
      </div>

      {/* 版本模板 */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <Text style={{ fontSize: '12px', fontWeight: 600 }}>
            {t.manage.versionListTitle(versions.length)}
          </Text>
          <div className={styles.actionRow}>
            <Button
              icon={<ArrowSyncRegular />}
              appearance="subtle"
              size="small"
              onClick={handleSyncLines}
              disabled={syncing}
            >
              {syncing ? t.manage.syncingRoutes : t.manage.syncRoutes}
            </Button>
            <Button
              icon={<AddRegular />}
              appearance="subtle"
              size="small"
              onClick={() => setAddingVersion(true)}
              disabled={addingVersion}
            >
              {t.manage.addVersion}
            </Button>
          </div>
        </div>

        <div className={styles.card}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th} style={{ width: '28%' }}>{t.manage.colVersion}</th>
                <th className={styles.th} style={{ width: '24%' }}>{t.manage.colRoute}</th>
                <th className={styles.th} style={{ width: '38%' }}>{t.manage.colGitDir}</th>
                <th className={styles.th} style={{ width: '10%' }}></th>
              </tr>
            </thead>
            <tbody>
              {versions.map((vt) => (
                <tr key={vt.name}>
                  <td className={styles.td}>
                    <strong>{vt.name}</strong>
                  </td>
                  <td className={styles.td}>{roadsDisplayName(vt.lineField)}</td>
                  <td className={styles.td} style={{ fontSize: '10px' }}>
                    {editingGitDir === vt.name ? (
                      <div>
                        <Input
                          size="small"
                          value={editGitDirValue}
                          onChange={(_, d) => setEditGitDirValue(d.value)}
                          onBlur={() => handleSaveGitDir(vt)}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleSaveGitDir(vt); if (e.key === 'Escape') setEditingGitDir(null); }}
                          style={{ width: '100%', fontSize: '10px' }}
                          autoFocus
                        />
                        <span style={{ fontSize: '9px', color: '#999', lineHeight: '1.4', display: 'block', marginTop: '2px' }}>
                          {'{0}'}=版本号 {'{1}'}=版本名
                        </span>
                      </div>
                    ) : (
                      <span
                        onClick={() => { setEditingGitDir(vt.name); setEditGitDirValue(vt.gitDirectory || ''); }}
                        style={{ cursor: 'pointer', minWidth: 30, display: 'inline-block' }}
                      >
                        {vt.gitDirectory || '-'}
                      </span>
                    )}
                  </td>
                  <td className={styles.td}>
                    {vt.lineField !== 'roads_0' && (
                      <Button
                        icon={<DeleteRegular />}
                        appearance="subtle"
                        size="small"
                        onClick={() => handleDeleteVersion(vt)}
                        style={{ minWidth: 'auto', padding: '0 2px' }}
                      />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* 添加版本表单 */}
          {addingVersion && (
            <div style={{ marginTop: '8px', padding: '8px', backgroundColor: tokens.colorNeutralBackground3, borderRadius: '4px' }}>
              <div style={{ display: 'flex', gap: '6px', marginBottom: '6px' }}>
                <Input
                  size="small"
                  value={newVersionName}
                  onChange={(_, d) => setNewVersionName(d.value)}
                  placeholder={t.manage.versionNamePlaceholder}
                  style={{ flex: 1 }}
                />
              </div>
              <div style={{ marginBottom: '6px' }}>
                <Input
                  size="small"
                  value={newVersionGitDir}
                  onChange={(_, d) => setNewVersionGitDir(d.value)}
                  placeholder={t.manage.gitDirPlaceholder}
                  style={{ width: '100%' }}
                />
                <span style={{ fontSize: '9px', color: '#999', lineHeight: '1.4', display: 'block', marginTop: '2px' }}>
                  支持变量: {'{0}'}=版本号 {'{1}'}=版本名，如 /data/{'{1}'}/{'{0}'} → /data/默认/2.1
                </span>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <Button appearance="primary" size="small" onClick={handleAddVersion} disabled={saving || !newVersionName.trim() || !newVersionGitDir.trim()}>
                  {saving ? '添加中...' : '确定'}
                </Button>
                <Button appearance="subtle" size="small" onClick={() => setAddingVersion(false)}>
                  取消
                </Button>
              </div>
            </div>
          )}
        </div>

        <Text style={{ fontSize: '10px', color: tokens.colorNeutralForeground3 }}>
          {t.manage.addVersionHint}
        </Text>
      </div>

      {/* 人员代码 */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <Text style={{ fontSize: '12px', fontWeight: 600 }}>
            {t.manage.staff} ({config.staffCodes.size})
          </Text>
          <Button
            icon={<AddRegular />}
            appearance="subtle"
            size="small"
            onClick={() => setAddingStaff(true)}
            disabled={addingStaff}
          >
            添加
          </Button>
        </div>
        <div className={styles.card}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th}>姓名</th>
                <th className={styles.th}>代码</th>
              </tr>
            </thead>
            <tbody>
              {staffList.map((s) => (
                <tr key={s.name}>
                  <td className={styles.td}>
                    {editingStaff === s.name ? (
                      <Input
                        size="small"
                        value={editStaffName}
                        onChange={(_, d) => setEditStaffName(d.value)}
                        onBlur={() => handleSaveStaff(s.name)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSaveStaff(s.name); if (e.key === 'Escape') setEditingStaff(null); }}
                        style={{ width: '100%', fontSize: '11px' }}
                        autoFocus
                      />
                    ) : (
                      <span
                        onClick={() => { setEditingStaff(s.name); setEditStaffName(s.name); setEditStaffCode(s.code); }}
                        style={{ cursor: 'pointer' }}
                      >
                        {s.name}
                      </span>
                    )}
                  </td>
                  <td className={styles.td}>
                    {editingStaff === s.name ? (
                      <Input
                        size="small"
                        value={editStaffCode}
                        onChange={(_, d) => setEditStaffCode(d.value)}
                        onBlur={() => handleSaveStaff(s.name)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSaveStaff(s.name); if (e.key === 'Escape') setEditingStaff(null); }}
                        style={{ width: '100%', fontSize: '11px' }}
                      />
                    ) : (
                      <span
                        onClick={() => { setEditingStaff(s.name); setEditStaffName(s.name); setEditStaffCode(s.code); }}
                        style={{ cursor: 'pointer' }}
                      >
                        {s.code}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* 添加人员表单 */}
          {addingStaff && (
            <div style={{ marginTop: '8px', padding: '8px', backgroundColor: tokens.colorNeutralBackground3, borderRadius: '4px' }}>
              <div style={{ display: 'flex', gap: '6px', marginBottom: '6px' }}>
                <Input
                  size="small"
                  value={newStaffName}
                  onChange={(_, d) => setNewStaffName(d.value)}
                  placeholder="姓名"
                  style={{ flex: 1 }}
                />
                <Input
                  size="small"
                  value={newStaffCode}
                  onChange={(_, d) => setNewStaffCode(d.value)}
                  placeholder="代码"
                  style={{ flex: 1 }}
                />
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <Button appearance="primary" size="small" onClick={handleAddStaff} disabled={saving || !newStaffName.trim() || !newStaffCode.trim()}>
                  {saving ? '添加中...' : '确定'}
                </Button>
                <Button appearance="subtle" size="small" onClick={() => setAddingStaff(false)}>
                  取消
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Git 提交模板 */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <Text style={{ fontSize: '12px', fontWeight: 600 }}>{t.manage.gitTemplate}</Text>
          {!editingGit && (
            <Button appearance="subtle" size="small" onClick={() => { setGitTemplate(config.gitCommitTemplate || ''); setEditingGit(true); }}>
              编辑
            </Button>
          )}
        </div>
        <div className={styles.card}>
          {editingGit ? (
            <>
              <Textarea
                size="small"
                value={gitTemplate}
                onChange={(_, d) => setGitTemplate(d.value)}
                style={{ width: '100%', fontSize: '11px', fontFamily: 'Consolas, monospace' }}
                rows={3}
              />
              <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                <Button appearance="primary" size="small" onClick={handleSaveGitTemplate} disabled={saving}>
                  {saving ? '保存中...' : '保存'}
                </Button>
                <Button appearance="subtle" size="small" onClick={() => setEditingGit(false)}>
                  取消
                </Button>
              </div>
            </>
          ) : (
            <Text style={{ fontSize: '11px', fontFamily: 'Consolas, monospace' }}>
              {config.gitCommitTemplate || '(未配置)'}
            </Text>
          )}
        </div>
      </div>

      {/* 功能开关 */}
      <div className={styles.section}>
        <Text style={{ fontSize: '12px', fontWeight: 600 }}>功能开关</Text>
        <div className={styles.card}>
          <div className={styles.switchRow}>
            <Text style={{ fontSize: '11px' }}>自动弹出路径</Text>
            <Switch
              checked={config.showResourcePopup}
              onChange={(_, d) => handleToggleSwitch('自动弹出路径', d.checked)}
            />
          </div>
        </div>
      </div>

      {/* StudioConfig 工具 */}
      <div className={styles.section}>
        <Text style={{ fontSize: '12px', fontWeight: 600 }}>StudioConfig</Text>
        <div className={styles.card}>
          <div className={styles.switchRow}>
            <Text style={{ fontSize: '11px' }}>显示配置表</Text>
            <Switch
              checked={studioConfigVisible}
              onChange={async (_, d) => {
                try {
                  await Excel.run(async (context) => {
                    const sheet = context.workbook.worksheets.getItemOrNullObject(SHEET_CONFIG);
                    sheet.load('isNullObject');
                    await context.sync();
                    if (!sheet.isNullObject) {
                      sheet.visibility = d.checked
                        ? Excel.SheetVisibility.visible
                        : Excel.SheetVisibility.hidden;
                      await context.sync();
                    }
                  });
                  setStudioConfigVisible(d.checked);
                } catch (err) {
                  logger.error('切换 StudioConfig 可见性失败', err);
                }
              }}
            />
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
  const t = useThemeText();

  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // 监听「表名对照」工作表变更，自动刷新
  useEffect(() => {
    let handler: OfficeExtension.EventHandlerResult<Excel.WorksheetChangedEventArgs> | null = null;
    let cancelled = false;
    const setup = async () => {
      try {
        await Excel.run(async (context) => {
          const sheet = context.workbook.worksheets.getItemOrNullObject('表名对照');
          sheet.load('isNullObject');
          await context.sync();
          if (sheet.isNullObject || cancelled) return;
          handler = sheet.onChanged.add(async () => {
            if (!cancelled) onReload();
          });
          await context.sync();
        });
      } catch {
        // 表名对照可能不存在，忽略
      }
    };
    setup();
    return () => {
      cancelled = true;
      if (handler) {
        Excel.run(async (context) => {
          handler!.remove();
          await context.sync();
        }).catch(() => {});
      }
    };
  }, [onReload]);

  // version_c 三态检测: 'R' = 仅行控制, 'R+c' = 行+简单列(仅版本区间), 'R+C' = 行+完整列(含roads)
  type VCState = 'R' | 'R+c' | 'R+C';
  const [versionCMap, setVersionCMap] = useState<Map<string, VCState>>(new Map());
  const [loadingVC, setLoadingVC] = useState(false);

  // 版本号行内编辑
  const [editingVersion, setEditingVersion] = useState<string | null>(null);
  const [editVersionValue, setEditVersionValue] = useState('');

  const tables = Array.from(config.tablesToProcess.values());
  const filtered = searchTerm
    ? tables.filter(t =>
        t.chineseName.includes(searchTerm) ||
        t.englishName.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : tables;

  // 检测各表的 version_c 状态（三态）
  const tableNamesKey = tables.map(tbl => tbl.chineseName).join(',');
  useEffect(() => {
    if (tables.length === 0) return;
    let cancelled = false;
    const detect = async () => {
      setLoadingVC(true);
      try {
        const result = new Map<string, VCState>();
        await Excel.run(async (context) => {
          for (const t of tables) {
            const snap = await excelHelper.loadSheetSnapshot(context, t.chineseName);
            if (!snap) { result.set(t.chineseName, 'R'); continue; }
            let vcRow = -1, vrRow = -1;
            for (let r = 0; r < Math.min(snap.values.length, 30); r++) {
              const colLimit = snap.values[r]?.length || 0;
              for (let c = 0; c < colLimit; c++) {
                const v = String(snap.values[r][c] ?? '').trim();
                if (v === 'version_c' && vcRow < 0) vcRow = r;
                if (v === 'version_r' && vrRow < 0) vrRow = r;
              }
            }
            if (vcRow < 0 || vrRow <= vcRow) {
              result.set(t.chineseName, 'R');
            } else {
              // 检查 version_c 和 version_r 之间是否有 roads_ 行
              let hasRoads = false;
              const vcColIdx = (() => {
                for (let c = 0; c < (snap.values[vcRow]?.length || 0); c++) {
                  if (String(snap.values[vcRow][c] ?? '').trim() === 'version_c') return c;
                }
                return -1;
              })();
              for (let r = vcRow + 1; r < vrRow; r++) {
                const v = String(snap.values[r]?.[vcColIdx] ?? '').trim();
                if (v.startsWith('roads_')) { hasRoads = true; break; }
              }
              result.set(t.chineseName, hasRoads ? 'R+C' : 'R+c');
            }
          }
        });
        if (!cancelled) setVersionCMap(result);
      } catch (err) {
        logger.error('检测 version_c 失败', err);
      } finally {
        if (!cancelled) setLoadingVC(false);
      }
    };
    detect();
    return () => { cancelled = true; };
  }, [tableNamesKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // 保存版本号
  const handleSaveVersion = useCallback(async (t: TableInfo) => {
    const newVer = editVersionValue.trim();
    setEditingVersion(null);
    if (newVer === (t.versionRange || '')) return;
    try {
      await tableRegistry.updateTable(t.chineseName, { versionRange: newVer });
      setStatusMsg({ text: `已更新「${t.chineseName}」版本号为 ${newVer || '(空)'}`, type: 'success' });
      onReload();
    } catch (err) {
      setStatusMsg({ text: `修改版本失败: ${err instanceof Error ? err.message : String(err)}`, type: 'error' });
    }
  }, [editVersionValue, onReload]);

  // 三态切换 version_c: R → R+c → R+C → R
  const handleToggleVersionC = useCallback(async (chineseName: string, currentState: VCState) => {
    try {
      // 先同步该表的线路（确保 version_r 的 roads 列与配置一致）
      setLoadingVC(true);
      await lineSyncer.syncAllTables(config.versionTemplates, [chineseName]);

      await Excel.run(async (context) => {
        const snap = await excelHelper.loadSheetSnapshot(context, chineseName);
        if (!snap) throw new Error('找不到工作表');
        const sheet = context.workbook.worksheets.getItem(chineseName);

        // 查找 version_r 和 version_c 的位置（version_c 可能在较远的列）
        let vrRow = -1, vrCol = -1, vcRow = -1;
        for (let r = 0; r < Math.min(snap.values.length, 30); r++) {
          const colLimit = snap.values[r]?.length || 0;
          for (let c = 0; c < colLimit; c++) {
            const v = String(snap.values[r][c] ?? '').trim();
            if (v === 'version_r' && vrRow < 0) { vrRow = r; vrCol = c; }
            if (v === 'version_c' && vcRow < 0) vcRow = r;
          }
        }
        if (vrRow < 0) throw new Error('找不到 version_r');

        // 从版本配置构建正确的 roads 列表（不依赖工作表中可能过时的 roads）
        const configRoads: Array<{ field: string; name: string }> = [{ field: 'roads_0', name: '默认' }];
        for (const vt of config.versionTemplates.values()) {
          const field = vt.lineField || config.lineTemplates.get(vt.lineId)?.field || '';
          if (field && field !== 'roads_0' && field.startsWith('roads_')) {
            configRoads.push({ field, name: vt.name });
          }
        }
        configRoads.sort((a, b) =>
          parseInt(a.field.replace('roads_', '')) - parseInt(b.field.replace('roads_', ''))
        );
        const existingRoads = configRoads.map(r => r.field);
        const roadsNameMap = new Map(configRoads.map(r => [r.field, r.name]));

        // 找到 #配置区域# 以确定数据列起始
        let configMarkerCol = -1;
        for (let c = vrCol; c < (snap.values[vrRow]?.length || 0); c++) {
          if (String(snap.values[vrRow][c] ?? '').trim() === '#配置区域#') {
            configMarkerCol = c; break;
          }
        }
        const dataStartCol = configMarkerCol >= 0 ? configMarkerCol + 1 : vrCol + existingRoads.length + 3;
        // 计算实际数据列数（遇到空列停止，不用 snapshot 尾部空列）
        let dataColCount = 0;
        for (let c = dataStartCol; c < (snap.values[vrRow]?.length || 0); c++) {
          const v = snap.values[vrRow]?.[c];
          if (v == null || String(v).trim() === '') break;
          dataColCount++;
        }

        if (currentState === 'R') {
          // R → R+c: 在 version_r 上方插入3行（version_c行 + 2空行间隔）
          // version_c 与 #配置区域# 同列，"版本列属"在其左一列
          if (configMarkerCol < 0) throw new Error('找不到 #配置区域# 标记');
          const insertCount = 3; // 1行 version_c + 2行空行
          const absRow = vrRow + snap.startRow;
          sheet.getRangeByIndexes(absRow, 0, insertCount, 1).getEntireRow().insert(Excel.InsertShiftDirection.down);
          await context.sync();
          // 写入标记：版本列属(configMarkerCol-1) + version_c(configMarkerCol)（第1行，后面2行留空）
          sheet.getRangeByIndexes(absRow, configMarkerCol - 1 + snap.startCol, 1, 1).values = [['版本列属']];
          sheet.getRangeByIndexes(absRow, configMarkerCol + snap.startCol, 1, 1).values = [['version_c']];
          // 数据列默认值全部设为 1
          if (dataColCount > 0) {
            const defaults = Array.from({ length: dataColCount }, () => 1);
            sheet.getRangeByIndexes(absRow, dataStartCol + snap.startCol, 1, dataColCount).values = [defaults];
          }
          await context.sync();

        } else if (currentState === 'R+c') {
          // R+c → R+C: 在 version_c 和 version_r 之间插入 roads 行（空行之前）
          if (configMarkerCol < 0) throw new Error('找不到 #配置区域# 标记');
          const roadsCount = existingRoads.length;
          if (roadsCount > 0) {
            // version_c 在 vcRow，在其下一行插入 roads 行
            const insertAbsRow = vcRow + 1 + snap.startRow;
            sheet.getRangeByIndexes(insertAbsRow, 0, roadsCount, 1).getEntireRow().insert(Excel.InsertShiftDirection.down);
            await context.sync();
            // 写入 roads 行标记和默认值
            for (let i = 0; i < roadsCount; i++) {
              const roadField = existingRoads[i];
              const rowAbsIdx = insertAbsRow + i;
              // roads 字段名写在 version_c 同列（configMarkerCol）
              sheet.getRangeByIndexes(rowAbsIdx, configMarkerCol + snap.startCol, 1, 1).values = [[roadField]];
              // 版本名标签写在 version_c 左一列（configMarkerCol-1）
              const versionName = roadsNameMap.get(roadField) || '';
              if (versionName) {
                sheet.getRangeByIndexes(rowAbsIdx, configMarkerCol - 1 + snap.startCol, 1, 1).values = [[versionName]];
              }
              // 数据列默认值全部设为 1
              if (dataColCount > 0) {
                const defaults = Array.from({ length: dataColCount }, () => 1);
                sheet.getRangeByIndexes(rowAbsIdx, dataStartCol + snap.startCol, 1, dataColCount).values = [defaults];
              }
            }
            await context.sync();
          }

        } else {
          // R+C → R: 删除 version_c 到 version_r 之间的所有行（包括空行）
          if (vcRow >= 0 && vrRow > vcRow) {
            const rowCount = vrRow - vcRow;
            const absRow = vcRow + snap.startRow;
            sheet.getRangeByIndexes(absRow, 0, rowCount, 1).getEntireRow().delete(Excel.DeleteShiftDirection.up);
            await context.sync();
          }
        }
      });

      // 更新本地状态
      const nextState: VCState = currentState === 'R' ? 'R+c' : currentState === 'R+c' ? 'R+C' : 'R';
      setVersionCMap(prev => {
        const next = new Map(prev);
        next.set(chineseName, nextState);
        return next;
      });
      const labels = { 'R': '仅行控制', 'R+c': '行+版本列控制', 'R+C': '行+完整列控制' };
      setStatusMsg({ text: `「${chineseName}」已切换为 ${labels[nextState]}`, type: 'success' });
    } catch (err) {
      setStatusMsg({ text: `操作失败: ${err instanceof Error ? err.message : String(err)}`, type: 'error' });
    } finally {
      setLoadingVC(false);
    }
  }, [config.versionTemplates, config.lineTemplates]);


  const handleUnregister = useCallback(async (chineseName: string) => {
    try {
      await tableRegistry.unregisterTable(chineseName, true);
      setStatusMsg({ text: `已删除「${chineseName}」`, type: 'success' });
      setConfirmDelete(null);
      onReload();
    } catch (err) {
      setStatusMsg({ text: `删除失败: ${err instanceof Error ? err.message : String(err)}`, type: 'error' });
      setConfirmDelete(null);
    }
  }, [onReload]);

  return (
    <>
      <div className={styles.sectionHeader}>
        <Text className={styles.sectionTitle}>{t.manage.tablesSectionTitle}</Text>
        <Button icon={<ArrowSyncRegular />} appearance="subtle" size="small" onClick={onReload}>
          刷新
        </Button>
      </div>

      {statusMsg && (
        <div className={`${styles.statusMsg} ${statusMsg.type === 'success' ? styles.statusSuccess : styles.statusError}`}>
          {statusMsg.text}
        </div>
      )}

      <div className={styles.searchBox}>
        <Input
          contentBefore={<SearchRegular fontSize={14} />}
          placeholder={t.manage.searchPlaceholder}
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
              <th className={styles.th} style={{ width: '24%' }}>{t.manage.colChineseName}</th>
              <th className={styles.th} style={{ width: '28%' }}>{t.manage.colEnglishName}</th>
              <th className={styles.th} style={{ width: '16%' }}>{t.manage.colTableVersion}</th>
              <th className={styles.th} style={{ width: '20%' }}>{t.manage.colControl}</th>
              <th className={styles.th} style={{ width: '12%' }}></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((tbl) => {
              const vcState = versionCMap.get(tbl.chineseName) ?? 'R';
              const badgeStyle = vcState === 'R+C' ? styles.badgeOn : vcState === 'R+c' ? styles.badgeNew : styles.badgeOff;
              return (
                <tr key={tbl.chineseName}>
                  <td className={styles.td}>{tbl.chineseName}</td>
                  <td className={styles.td}>{tbl.englishName}</td>
                  <td className={styles.td}>
                    {editingVersion === tbl.chineseName ? (
                      <Input
                        size="small"
                        value={editVersionValue}
                        onChange={(_, d) => setEditVersionValue(d.value)}
                        onBlur={() => handleSaveVersion(tbl)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSaveVersion(tbl); if (e.key === 'Escape') setEditingVersion(null); }}
                        style={{ width: 60, fontSize: '11px' }}
                        autoFocus
                      />
                    ) : (
                      <span
                        onClick={() => { setEditingVersion(tbl.chineseName); setEditVersionValue(tbl.versionRange || ''); }}
                        style={{ cursor: 'pointer', minWidth: 20, display: 'inline-block' }}
                      >
                        {tbl.versionRange || '-'}
                      </span>
                    )}
                  </td>
                  <td className={styles.td}>
                    <span
                      className={`${styles.badge} ${badgeStyle}`}
                      onClick={() => handleToggleVersionC(tbl.chineseName, vcState)}
                      style={{ cursor: 'pointer' }}
                      title={vcState === 'R' ? '仅行控制 → 点击添加版本列控制' : vcState === 'R+c' ? '行+版本列控制 → 点击升级为完整列控制' : '完整行列控制 → 点击移除列控制'}
                    >
                      {loadingVC ? '...' : vcState}
                    </span>
                  </td>
                  <td className={styles.td}>
                    {confirmDelete === tbl.chineseName ? (
                      <span style={{ display: 'flex', gap: '2px' }}>
                        <Button
                          icon={<CheckmarkRegular />}
                          appearance="subtle"
                          size="small"
                          onClick={() => handleUnregister(tbl.chineseName)}
                          style={{ minWidth: 'auto', padding: '0 2px', color: tokens.colorPaletteRedForeground1 }}
                          title="确认删除"
                        />
                        <Button
                          icon={<DismissRegular />}
                          appearance="subtle"
                          size="small"
                          onClick={() => setConfirmDelete(null)}
                          style={{ minWidth: 'auto', padding: '0 2px' }}
                          title="取消"
                        />
                      </span>
                    ) : (
                      <Button
                        icon={<DeleteRegular />}
                        appearance="subtle"
                        size="small"
                        onClick={() => setConfirmDelete(tbl.chineseName)}
                        style={{ minWidth: 'auto', padding: '0 2px' }}
                      />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Text style={{ fontSize: '11px', color: tokens.colorNeutralForeground3, marginTop: '4px' }}>
        {t.manage.tableSummary(filtered.length, tables.length)}
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

const tableCreator = new TableCreator();

function WizardSubPage({ config, onReload, styles }: {
  config: Config;
  onReload: () => void;
  styles: ReturnType<typeof useStyles>;
}) {
  const t = useThemeText();
  const [chineseName, setChineseName] = useState('');
  const [englishName, setEnglishName] = useState('');
  const [startVersion, setStartVersion] = useState('1');
  const [includeVersionCol, setIncludeVersionCol] = useState(false);
  const [autoRegister, setAutoRegister] = useState(true);
  const [fields, setFields] = useState<WizardField[]>([
    { name: 'id', type: 'int', description: 'ID', isKey: true, isLanguage: false },
  ]);
  const [creating, setCreating] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

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

  const handleCreate = useCallback(async () => {
    if (!chineseName || !englishName || fields.length === 0) return;
    setCreating(true);
    setStatusMsg(null);

    try {
      const creationConfig: TableCreationConfig = {
        chineseName,
        englishName,
        startVersion,
        fields: fields.map(f => ({
          name: f.name,
          type: f.type,
          description: f.description,
          isKey: f.isKey,
          isLanguage: f.isLanguage,
        })),
        includeVersionCol,
        autoRegister,
      };

      await tableCreator.createTable(creationConfig);
      setStatusMsg({ text: `工作表「${chineseName}」创建成功！`, type: 'success' });
      // 重置表单
      setChineseName('');
      setEnglishName('');
      setStartVersion('1');
      setFields([{ name: 'id', type: 'int', description: 'ID', isKey: true, isLanguage: false }]);
      onReload();
    } catch (err) {
      setStatusMsg({ text: `创建失败: ${err instanceof Error ? err.message : String(err)}`, type: 'error' });
    } finally {
      setCreating(false);
    }
  }, [chineseName, englishName, startVersion, fields, includeVersionCol, autoRegister, onReload]);

  const handleUndo = useCallback(async () => {
    try {
      const ok = await tableCreator.undoLastCreation();
      if (ok) {
        setStatusMsg({ text: '已撤销上次创建', type: 'success' });
        onReload();
      } else {
        setStatusMsg({ text: '没有可撤销的操作', type: 'error' });
      }
    } catch (err) {
      setStatusMsg({ text: `撤销失败: ${err instanceof Error ? err.message : String(err)}`, type: 'error' });
    }
  }, [onReload]);

  const typeOptions = ['int', 'string', 'float', 'bool', 'int[]', 'string[]', 'float[]'];

  return (
    <>
      <div className={styles.sectionHeader}>
        <Text className={styles.sectionTitle}>{t.manage.wizardTitle}</Text>
        <Button appearance="subtle" size="small" onClick={handleUndo}>
          撤销上次
        </Button>
      </div>

      {statusMsg && (
        <div className={`${styles.statusMsg} ${statusMsg.type === 'success' ? styles.statusSuccess : styles.statusError}`}>
          {statusMsg.text}
        </div>
      )}

      <div style={{ marginTop: '4px' }}>
        <div className={styles.formField}>
          <Label className={styles.formLabel}>{t.manage.wizardChineseName}</Label>
          <Input
            size="small"
            value={chineseName}
            onChange={(_, d) => setChineseName(d.value)}
            placeholder="如：怪物表"
          />
        </div>

        <div className={styles.formField}>
          <Label className={styles.formLabel}>{t.manage.wizardEnglishName}</Label>
          <Input
            size="small"
            value={englishName}
            onChange={(_, d) => setEnglishName(d.value)}
            placeholder="如：Monsters"
          />
        </div>

        <div className={styles.formField}>
          <Label className={styles.formLabel}>{t.manage.wizardStartVersion}</Label>
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
            <Text style={{ fontSize: '11px' }}>{t.manage.wizardIncludeVersionC}</Text>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Switch
              checked={autoRegister}
              onChange={(_, d) => setAutoRegister(d.checked)}
            />
            <Text style={{ fontSize: '11px' }}>{t.manage.wizardAutoRegister}</Text>
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
            {i === 0 && <Text style={{ fontSize: '12px', color: '#e6a817', flexShrink: 0 }}>★</Text>}
            <Input
              className={styles.fieldInput}
              size="small"
              value={f.name}
              onChange={(_, d) => updateField(i, 'name', d.value)}
              placeholder="字段名"
              style={{ maxWidth: 80 }}
            />
            <Dropdown
              size="small"
              value={f.type}
              onOptionSelect={(_, d) => updateField(i, 'type', d.optionValue || 'string')}
              style={{ minWidth: 65 }}
            >
              {typeOptions.map(tp => <Option key={tp} value={tp} text={tp}>{tp}</Option>)}
            </Dropdown>
            <Input
              className={styles.fieldInput}
              size="small"
              value={f.description}
              onChange={(_, d) => updateField(i, 'description', d.value)}
              placeholder="中文描述"
              style={{ maxWidth: 80 }}
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
          disabled={!chineseName || !englishName || fields.length === 0 || creating}
          style={{ width: '100%', marginTop: '12px' }}
        >
          {creating ? <><Spinner size="tiny" /> {t.manage.wizardCreatingBtn}</> : t.manage.wizardCreateBtn}
        </Button>
      </div>
    </>
  );
}
