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
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '10px',
    marginTop: '6px',
  },
  th: {
    textAlign: 'left',
    padding: '3px 6px',
    backgroundColor: tokens.colorNeutralBackground3,
    fontWeight: 600,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  td: {
    padding: '3px 6px',
    borderBottom: `1px solid ${tokens.colorNeutralStroke3}`,
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

  return (
    <div className={styles.container}>
      {/* 快速入门 */}
      <div className={styles.section}>
        <Text className={styles.sectionTitle}>
          <TableRegular fontSize={14} /> 快速入门
        </Text>
        <div className={styles.sectionBody}>
          <p style={{ margin: '0 0 6px' }}>
            GameData Studio 是一款 Excel 加载项，用于管理和导出游戏数据表。
            每张数据表是一个独立的工作表，包含版本控制区和主数据区。
          </p>
          <p style={{ margin: '0 0 6px' }}>
            <strong>首次使用：</strong>在空白工作簿中点击「初始化工作簿」，
            将自动创建 StudioConfig 配置表、表名对照和示例数据表。
            表名对照中的功能表名带有超链接，点击可直接跳转到对应工作表。
          </p>
        </div>
      </div>

      <Divider />

      {/* 导出 */}
      <div className={styles.section} style={{ marginTop: '12px' }}>
        <Text className={styles.sectionTitle}>
          <ArrowExportRegular fontSize={14} /> 导出
        </Text>
        <div className={styles.sectionBody}>
          <dl style={{ margin: 0 }}>
            <dt className={styles.dt}>导出流程</dt>
            <dd className={styles.dd}>
              选择版本 → 设置输出目录 → 点击导出。系统自动加载配置、筛选数据、
              对比差异（Delta），仅输出有变更的表。支持大表并行分块上传，单表最大可支持数万行。
            </dd>
            <dt className={styles.dt}>输出目录</dt>
            <dd className={styles.dd}>
              在「管理」选项卡中配置。支持变量替换：<span className={styles.code}>{'{0}'}</span> = 版本号（如 2.1），
              <span className={styles.code}>{'{1}'}</span> = 版本名（如 默认）。
              <br />
              示例：<span className={styles.code}>/data/{'{1}'}/{'{0}'}</span> → <span className={styles.code}>/data/默认/2.1</span>
            </dd>
            <dt className={styles.dt}>Git 自动推送</dt>
            <dd className={styles.dd}>
              导出完成后，如果本地文件服务器（file-server）正在运行，系统会自动执行 Git add、commit、push。
              提交信息可在「管理」中自定义模板。若 file-server 未运行，可手动复制 Git 命令执行。
            </dd>
          </dl>
        </div>
      </div>

      <Divider />

      {/* 协同导出 */}
      <div className={styles.section} style={{ marginTop: '12px' }}>
        <Text className={styles.sectionTitle}>
          <PeopleTeamRegular fontSize={14} /> 协同导出
        </Text>
        <div className={styles.sectionBody}>
          <dl style={{ margin: 0 }}>
            <dt className={styles.dt}>工作原理</dt>
            <dd className={styles.dd}>
              通过 StudioConfig 工作表实现多人协同导出。网页端用户在 StudioConfig 中填写输出版本、版本号，
              并在「操作人」栏写入名字触发导出。桌面端加载项检测到后自动执行导出 + Git 推送，结果回写到工作表。
            </dd>
            <dt className={styles.dt}>协同监听</dt>
            <dd className={styles.dd}>
              默认开启，以 5 秒间隔轮询 StudioConfig 表。可在导出页通过开关控制。
              状态指示：绿色 = 监听中，蓝色 = 正在协同导出，灰色 = 已关闭。
            </dd>
            <dt className={styles.dt}>StudioConfig 协同区</dt>
            <dd className={styles.dd}>
              <span className={styles.code}>#输出版本#</span> — 选择导出的版本名<br />
              <span className={styles.code}>#输出版本号#</span> — 填写版本号<br />
              <span className={styles.code}>#操作人#</span> — 写入名字触发导出（导出后自动清空）<br />
              <span className={styles.code}>#工作状态#</span> — 系统回写导出状态<br />
              <span className={styles.code}>#导出结果#</span> — 系统回写导出结果详情
            </dd>
          </dl>
        </div>
      </div>

      <Divider />

      {/* 管理 */}
      <div className={styles.section} style={{ marginTop: '12px' }}>
        <Text className={styles.sectionTitle}>
          <SettingsRegular fontSize={14} /> 管理
        </Text>
        <div className={styles.sectionBody}>
          <dl style={{ margin: 0 }}>
            <dt className={styles.dt}>配置</dt>
            <dd className={styles.dd}>
              管理操作员、版本模板（版本名 + 线路 + Git 目录）、人员代码、Git 提交模板和功能开关。
              添加新版本后点击「同步线路」为所有数据表补充对应的 roads 列。
            </dd>
            <dt className={styles.dt}>表管理</dt>
            <dd className={styles.dd}>
              数据来源为「表名对照」工作表，直接在 Excel 中编辑表名对照即可实时同步。
              支持版本号行内编辑、version_c 三态切换（R → R+c → R+C）。
              功能表名自动带超链接，点击可跳转到对应工作表。
            </dd>
            <dt className={styles.dt}>新建表</dt>
            <dd className={styles.dd}>
              通过向导创建符合规范的数据表工作表，自动注册到表名对照并添加超链接。
            </dd>
          </dl>
        </div>
      </div>

      <Divider />

      {/* 校验 */}
      <div className={styles.section} style={{ marginTop: '12px' }}>
        <Text className={styles.sectionTitle}>
          <ShieldCheckmarkRegular fontSize={14} /> 校验
        </Text>
        <div className={styles.sectionBody}>
          <p style={{ margin: '0 0 6px' }}>对选中的数据表执行 8 条校验规则：</p>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th}>规则</th>
                <th className={styles.th}>说明</th>
              </tr>
            </thead>
            <tbody>
              <tr><td className={styles.td}>版本区间格式</td><td className={styles.td}>检测行/列版本区间格式是否合法</td></tr>
              <tr><td className={styles.td}>版本区间分隔符</td><td className={styles.td}>检测是否误用横线 - 代替波浪号 ~</td></tr>
              <tr><td className={styles.td}>数据类型</td><td className={styles.td}>按字段定义（int/float/string/数组）校验数据值，支持自定义分隔符</td></tr>
              <tr><td className={styles.td}>数组分隔符</td><td className={styles.td}>数组字段应使用自定义分隔符（默认 | 和 ;），而非逗号</td></tr>
              <tr><td className={styles.td}>版本覆盖完整性</td><td className={styles.td}>同 Key 多行的版本区间是否连续无间隙</td></tr>
              <tr><td className={styles.td}>同Key版本顺序</td><td className={styles.td}>同 Key 多行是否按版本号递增排列</td></tr>
              <tr><td className={styles.td}>必填字段</td><td className={styles.td}>检测主键等必填字段是否存在空值</td></tr>
              <tr><td className={styles.td}>Roads 一致性</td><td className={styles.td}>roads_0=0 时 roads_N 不应为 1</td></tr>
            </tbody>
          </table>
          <p style={{ margin: '6px 0 0' }}>
            <strong>类型分隔符配置：</strong>点击「数据类型匹配」右侧的齿轮图标，
            可自定义各数组类型的分隔符（如 <span className={styles.code}>int[][]</span> 使用 <span className={styles.code}>|</span> 和 <span className={styles.code}>;</span>）。
            配置保存在 StudioConfig 中，全工作簿共享。
          </p>
          <p style={{ margin: '4px 0 0' }}>
            点击校验结果可自动定位到问题单元格。同时会检测 Excel 引用错误（#REF!、#N/A 等）。
          </p>
        </div>
      </div>

      <Divider />

      {/* 预览 */}
      <div className={styles.section} style={{ marginTop: '12px' }}>
        <Text className={styles.sectionTitle}>
          <EyeRegular fontSize={14} /> 预览
        </Text>
        <div className={styles.sectionBody}>
          <dl style={{ margin: 0 }}>
            <dt className={styles.dt}>版本预览</dt>
            <dd className={styles.dd}>
              选择版本和版本号，查看各表的筛选结果（保留/排除的行列数、被覆盖的重复 Key 行）。
              点击表名自动跳转到该工作表。
            </dd>
            <dt className={styles.dt}>数据清洗</dt>
            <dd className={styles.dd}>
              通过条件格式在 Excel 中高亮标记排除行（灰色+删除线）和被覆盖行（黄色+删除线），
              不影响原有单元格格式。点击「清洗结束」还原。
            </dd>
          </dl>
        </div>
      </div>

      <Divider />

      {/* 数据表结构 */}
      <div className={styles.section} style={{ marginTop: '12px' }}>
        <Text className={styles.sectionTitle}>
          <BranchRegular fontSize={14} /> 数据表结构
        </Text>
        <div className={styles.sectionBody}>
          <dl style={{ margin: 0 }}>
            <dt className={styles.dt}>工作表布局</dt>
            <dd className={styles.dd}>
              version_c 区域（可选）→ version_r 行 → 描述行 → 数据行。
              左侧为版本控制列（version_r、roads_0~N），<span className={styles.code}>#配置区域#</span> 右侧为主数据区。
            </dd>
            <dt className={styles.dt}>字段定义</dt>
            <dd className={styles.dd}>
              格式：<span className={styles.code}>[前缀_]字段名=类型</span>，
              前缀 <span className={styles.code}>key_</span> 表示主键，
              <span className={styles.code}>language_</span> 表示多语言字段。
              <br />
              类型：int, float, string, int[], float[], string[], int[][], float[][]
            </dd>
            <dt className={styles.dt}>版本区间</dt>
            <dd className={styles.dd}>
              左闭右开 [min, max)。
              <span className={styles.code}>1.0</span> → 从 1.0 起永久生效，
              <span className={styles.code}>1.0~2.5</span> → 仅 1.0 至 2.5 前生效，
              <span className={styles.code}>~2.5</span> → 2.5 之前所有版本，
              空值 → 几乎不导出。末尾字母为人员标记（如 <span className={styles.code}>3.5a</span>）。
            </dd>
            <dt className={styles.dt}>线路控制</dt>
            <dd className={styles.dd}>
              roads_0 为总开关（所有版本检查），roads_N 为地区专属线路。
              值：1=启用，0/空=禁用，版本区间字符串=条件启用。
              筛选条件为 AND 关系：版本区间 ∧ roads_0 ∧ roads_N 全部通过才保留。
            </dd>
          </dl>
        </div>
      </div>

      <div className={styles.footer}>
        GameData Studio v3.0
      </div>
    </div>
  );
}
