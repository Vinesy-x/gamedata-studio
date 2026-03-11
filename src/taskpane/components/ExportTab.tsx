import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  makeStyles,
  tokens,
  Button,
  ProgressBar,
  Text,
  Dropdown,
  Option,
  Input,
} from '@fluentui/react-components';
import {
  ArrowExportRegular,
  ArrowSyncRegular,
  ArrowUploadRegular,
  CheckmarkCircleRegular,
  DismissCircleRegular,
  WarningRegular,
  DocumentRegular,
  NavigationRegular,
  PersonRegular,
} from '@fluentui/react-icons';
import { Config } from '../../types/config';
import { ExportJob } from '../../engine/ExportJob';
import { GitHandler } from '../../git/GitHandler';
import { ExportResult, ExportProgress } from '../../types/table';
import { ExportError } from '../../types/errors';
import { excelHelper } from '../../utils/ExcelHelper';
import { configManager } from '../../v2/ConfigManager';
import { operatorIdentity } from '../../v2/OperatorIdentity';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0',
    minHeight: '100%',
  },
  // 当前配置区域
  configSection: {
    padding: '12px 14px',
  },
  configHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginBottom: '10px',
  },
  configTitle: {
    fontSize: '13px',
    fontWeight: 600,
    color: tokens.colorNeutralForeground1,
  },
  configCard: {
    backgroundColor: tokens.colorNeutralBackground2,
    borderRadius: '6px',
    padding: '10px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  configRow: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '12px',
  },
  configLabel: {
    color: tokens.colorNeutralForeground3,
    minWidth: '60px',
  },
  configValue: {
    fontWeight: 600,
    color: tokens.colorNeutralForeground1,
  },
  configValuePath: {
    fontSize: '11px',
    color: tokens.colorNeutralForeground2,
    wordBreak: 'break-all',
    lineHeight: '1.4',
  },
  // 操作按钮区域
  actionSection: {
    padding: '0 14px 12px',
  },
  actionRow: {
    display: 'flex',
    gap: '8px',
  },
  exportBtn: {
    flex: 1,
  },
  gitBtn: {
    minWidth: 'auto',
    paddingLeft: '12px',
    paddingRight: '12px',
  },
  progressArea: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    marginTop: '8px',
  },
  progressText: {
    fontSize: '11px',
    color: tokens.colorNeutralForeground3,
  },
  // 导出结果区域
  resultSection: {
    padding: '0 14px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  // 结果摘要行：成功/失败 + 耗时 + 统计图标
  resultSummary: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '8px 12px',
    backgroundColor: tokens.colorNeutralBackground2,
    borderRadius: '6px',
  },
  resultStatusIcon: {
    fontSize: '18px',
    flexShrink: 0,
  },
  successColor: {
    color: tokens.colorPaletteGreenForeground1,
  },
  failColor: {
    color: tokens.colorPaletteRedForeground1,
  },
  resultStatusText: {
    fontSize: '13px',
    fontWeight: 600,
  },
  resultDuration: {
    fontSize: '11px',
    color: tokens.colorNeutralForeground3,
  },
  resultStats: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginLeft: 'auto',
    flexShrink: 0,
  },
  statItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '3px',
    fontSize: '11px',
  },
  statFiles: {
    color: tokens.colorBrandForeground1,
  },
  statWarnings: {
    color: '#9D5D00',
  },
  statErrors: {
    color: tokens.colorPaletteRedForeground1,
  },
  // 文件列表
  resultCard: {
    backgroundColor: tokens.colorNeutralBackground2,
    borderRadius: '6px',
    padding: '10px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  fileList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1px',
  },
  fileItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '6px',
    fontSize: '11px',
    padding: '3px 0',
    color: tokens.colorNeutralForeground2,
  },
  fileIcon: {
    color: tokens.colorNeutralForeground3,
    marginTop: '2px',
    flexShrink: 0,
  },
  filePath: {
    wordBreak: 'break-all',
    lineHeight: '1.4',
  },
  // 警告/错误
  warningCard: {
    backgroundColor: '#FFF4CE',
    borderRadius: '6px',
    padding: '10px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  warningHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '12px',
    fontWeight: 600,
    color: '#9D5D00',
  },
  warningItem: {
    fontSize: '11px',
    color: '#6B4000',
    lineHeight: '1.4',
    wordBreak: 'break-all',
  },
  errorCard: {
    backgroundColor: tokens.colorPaletteRedBackground1,
    borderRadius: '6px',
    padding: '10px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  errorHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '12px',
    fontWeight: 600,
    color: tokens.colorPaletteRedForeground1,
  },
  errorItem: {
    fontSize: '11px',
    color: tokens.colorPaletteRedForeground1,
    lineHeight: '1.4',
    wordBreak: 'break-all',
  },
  navigateLink: {
    minWidth: 'auto',
    padding: '0 2px',
    fontSize: '10px',
    height: 'auto',
  },
  // ─── 空闲区域 - 6种动画场景轮播 + Tips ───
  idleArea: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px 16px 8px',
    flex: 1,
    minHeight: '260px',
    gap: '14px',
  },
  animStage: {
    position: 'relative' as const,
    width: '100%',
    height: '140px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden' as const,
  },
  sceneFadeIn: {
    animationName: {
      from: { opacity: 0 },
      to: { opacity: 1 },
    },
    animationDuration: '1s',
    animationTimingFunction: 'ease-in',
    animationFillMode: 'both' as const,
  },
  // Scene 1: 正弦波
  waveContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100px',
    gap: '3px',
  },
  waveBar: {
    width: '3px',
    borderRadius: '2px',
    backgroundColor: tokens.colorBrandForeground2,
    animationName: {
      '0%, 100%': { height: '6px', opacity: 0.15 },
      '50%': { height: '60px', opacity: 0.5 },
    },
    animationDuration: '2.2s',
    animationIterationCount: 'infinite',
    animationTimingFunction: 'ease-in-out',
  },
  // Scene 2: 脉冲环
  pulseRing: {
    position: 'absolute' as const,
    top: '50%',
    left: '50%',
    borderRadius: '50%',
    border: `1.5px solid ${tokens.colorBrandForeground2}`,
    animationName: {
      '0%': { width: '8px', height: '8px', marginTop: '-4px', marginLeft: '-4px', opacity: 0.6 },
      '100%': { width: '130px', height: '130px', marginTop: '-65px', marginLeft: '-65px', opacity: 0 },
    },
    animationDuration: '3s',
    animationIterationCount: 'infinite',
    animationTimingFunction: 'ease-out',
  },
  // Scene 3: 轨道原子
  orbitArm: {
    position: 'absolute' as const,
    top: '50%',
    left: '50%',
    width: 0,
    height: 0,
    animationName: {
      from: { transform: 'rotate(0deg)' },
      to: { transform: 'rotate(360deg)' },
    },
    animationIterationCount: 'infinite',
    animationTimingFunction: 'linear',
  },
  orbitDot: {
    position: 'absolute' as const,
    borderRadius: '50%',
    backgroundColor: tokens.colorBrandForeground2,
    top: '-3px',
  },
  orbitCenter: {
    position: 'absolute' as const,
    top: '50%',
    left: '50%',
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: tokens.colorBrandForeground2,
    opacity: 0.4,
    transform: 'translate(-50%, -50%)',
  },
  orbitRing: {
    position: 'absolute' as const,
    top: '50%',
    left: '50%',
    borderRadius: '50%',
    border: `1px solid ${tokens.colorNeutralForeground4}`,
    opacity: 0.08,
  },
  // Scene 4: 网格脉冲
  gridContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(8, 1fr)',
    gap: '7px',
    padding: '8px',
  },
  gridDot: {
    width: '5px',
    height: '5px',
    borderRadius: '50%',
    backgroundColor: tokens.colorBrandForeground2,
    animationName: {
      '0%, 100%': { opacity: 0.08, transform: 'scale(0.4)' },
      '50%': { opacity: 0.55, transform: 'scale(1.5)' },
    },
    animationDuration: '2.5s',
    animationIterationCount: 'infinite',
    animationTimingFunction: 'ease-in-out',
  },
  // Scene 5: 钟摆波
  pendulumContainer: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    height: '120px',
    gap: '7px',
    paddingTop: '4px',
  },
  pendulumArm: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    transformOrigin: '50% 0',
    animationName: {
      '0%': { transform: 'rotate(28deg)' },
      '50%': { transform: 'rotate(-28deg)' },
      '100%': { transform: 'rotate(28deg)' },
    },
    animationIterationCount: 'infinite',
    animationTimingFunction: 'ease-in-out',
  },
  pendulumString: {
    width: '1px',
    backgroundColor: tokens.colorNeutralForeground4,
    opacity: 0.25,
  },
  pendulumBob: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    backgroundColor: tokens.colorBrandForeground2,
    opacity: 0.5,
  },
  // Scene 6: 公式呼吸
  formulaContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '14px',
    height: '100%',
    userSelect: 'none' as const,
  },
  formulaText: {
    fontFamily: 'Georgia, "Times New Roman", serif',
    color: tokens.colorNeutralForeground3,
    animationName: {
      '0%, 100%': { opacity: 0.1, transform: 'scale(0.95)' },
      '50%': { opacity: 0.4, transform: 'scale(1.05)' },
    },
    animationIterationCount: 'infinite',
    animationTimingFunction: 'ease-in-out',
  },
  // Tips
  tipContainer: {
    minHeight: '44px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0 12px',
  },
  tipText: {
    fontSize: '11px',
    color: tokens.colorNeutralForeground3,
    textAlign: 'center' as const,
    lineHeight: '1.6',
    maxWidth: '280px',
    fontFamily: '"Cascadia Code", "Fira Code", "JetBrains Mono", Consolas, monospace',
    transitionProperty: 'opacity',
    transitionDuration: '0.5s',
    transitionTimingFunction: 'ease',
    letterSpacing: '-0.2px',
  },
  // 导出完成时的淡入动画
  resultFadeIn: {
    animationName: {
      from: { opacity: 0, transform: 'translateY(8px)' },
      to: { opacity: 1, transform: 'translateY(0)' },
    },
    animationDuration: '0.35s',
    animationTimingFunction: 'ease-out',
    animationFillMode: 'both',
  },
  // 成功勾选动画
  successCheckAnim: {
    animationName: {
      '0%': { transform: 'scale(0.5)', opacity: 0 },
      '60%': { transform: 'scale(1.15)' },
      '100%': { transform: 'scale(1)', opacity: 1 },
    },
    animationDuration: '0.4s',
    animationTimingFunction: 'ease-out',
    animationFillMode: 'both',
  },
  // 底部签名水印 - 置底
  watermark: {
    textAlign: 'right' as const,
    padding: '8px 14px',
    fontSize: '10px',
    color: tokens.colorNeutralForeground4,
    letterSpacing: '1px',
    opacity: 0.45,
    userSelect: 'none' as const,
    marginTop: 'auto',
  },
  // 文件数量徽标
  fileCountBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tokens.colorBrandBackground,
    color: tokens.colorNeutralForegroundOnBrand,
    fontSize: '10px',
    fontWeight: 700,
    borderRadius: '10px',
    padding: '1px 7px',
    minWidth: '18px',
    marginLeft: '4px',
  },
});

// ─── 数值策划 Tips ─────────────────────────────────────────
const IDLE_TIPS = [
  // 数值设计哲学
  '好的数值设计，玩家感受不到它的存在',
  '数值策划的终极目标：让玩家觉得自己在做选择',
  '当你在调一个数值时，你其实在调整一种体验',
  '最好的平衡不是所有选择都一样强，而是都有价值',
  '数值策划：用理性创造感性的体验',
  '每一个「太简单了」背后，是一个未发现的策略',
  '概率不会说谎，但玩家的记忆会',
  '一个好的随机系统，需要让坏运气有上限',
  '玩家不在乎绝对值，他们只在乎相对感受',
  '数值膨胀不是问题，感受膨胀才是',
  '所有RPG的尽头都是数学',
  '经济系统崩溃的根因：产出 > 消耗',
  // 数学公式
  'damage = ATK × (1 - DEF/(DEF+K))  经典减伤公式',
  'E = mc²  能量守恒，游戏经济也是',
  'f(x) = ax² + bx + c  成长曲线的基本形态',
  '∑(reward × prob) = 期望收益  别忘了方差',
  'P(A|B) = P(B|A)·P(A) / P(B)  贝叶斯：先验很重要',
  '∫₀^∞ fun(t)dt = 一个好游戏',
  'lim(n→∞) 调参次数 = ∞  但截止日期是有限的',
  'y = log₂(x)  对数增长是人类直觉的天敌',
  'Fibonacci: 1,1,2,3,5,8...  自然界的数值策划',
  'e^(iπ) + 1 = 0  数学中最美的等式',
  'σ² = E(X²) - [E(X)]²  方差比期望更重要',
  'PV = nRT  理想气体方程，也是理想经济方程',
  // 理科梗
  '黄金分割 0.618：不仅适用于美学，也适用于数值',
  'π = 3.14159...  无理数，如同玩家的行为',
  '递归：见「递归」',
  '指数增长是毒药，对数增长才是解药',
  '蒙特卡洛模拟：当你算不出来时，就让电脑算',
  '正态分布告诉我们：大多数玩家都很普通',
  '世界上有10种人，懂二进制的和不懂的',
  '薛定谔的数值：不测试就不知道是否平衡',
  '热力学第二定律：系统的混乱度只会增加',
  '海森堡：你越精确地观察数据，它就越不自然',
  '熵增定律：没有外力维护，系统只会越来越乱',
  '奥卡姆剃刀：如无必要，勿增实体（和系统）',
  // 程序员/开发者
  'while(bug) { fix(); coffee(); }',
  '所有模型都是错的，但有些是有用的 —— Box',
  'ROI = 快乐 / 肝度  这个比率要大于1',
  '99 little bugs in the code... fix one... 127 bugs',
  'TODO: 优化这个公式  // 写于2019年',
  '// 不要删除这行，删了就崩（没人知道为什么）',
  'git commit -m "final version"  第47次',
  '需求变更是唯一不变的需求',
  'If it works, don\'t touch it  维护的艺术',
  '测试覆盖率100%，但玩家还是找到了bug',
  '加班到凌晨三点，只为了把1.05改成1.06',
  '数值表里的每个数字，都是一个不眠之夜',
];

const ANIM_SCENE_COUNT = 6;

interface ExportTabProps {
  config: Config;
  isExporting: boolean;
  progress: ExportProgress | null;
  exportResult: ExportResult | null;
  onExportStart: () => void;
  onExportComplete: (result: ExportResult) => void;
  onProgress: (progress: ExportProgress) => void;
  onReloadConfig: () => void;
}

export function ExportTab({
  config,
  isExporting,
  progress,
  exportResult,
  onExportStart,
  onExportComplete,
  onProgress,
  onReloadConfig,
}: ExportTabProps) {
  const styles = useStyles();
  const [changingVersion, setChangingVersion] = useState(false);
  // 本地状态：Git 上传后隐藏导出结果，恢复空闲界面
  const [resultDismissed, setResultDismissed] = useState(false);
  // 跟踪导出完成动画的触发时机
  const [showCompletionAnim, setShowCompletionAnim] = useState(false);
  const prevExportingRef = useRef(isExporting);
  // Git 按钮错误提示
  const [gitError, setGitError] = useState(false);

  // Tips 轮播
  const [tipIndex, setTipIndex] = useState(() => Math.floor(Math.random() * IDLE_TIPS.length));
  const [tipVisible, setTipVisible] = useState(true);

  // 动画场景轮播
  const [animScene, setAnimScene] = useState(() => Math.floor(Math.random() * ANIM_SCENE_COUNT));

  useEffect(() => {
    if (isExporting || (exportResult && !resultDismissed)) return;
    // Tips 切换
    const tipInterval = setInterval(() => {
      setTipVisible(false);
      setTimeout(() => {
        setTipIndex(prev => {
          let next;
          do { next = Math.floor(Math.random() * IDLE_TIPS.length); } while (next === prev && IDLE_TIPS.length > 1);
          return next;
        });
        setTipVisible(true);
      }, 500);
    }, 5000);
    // 场景切换
    const sceneInterval = setInterval(() => {
      setAnimScene(prev => (prev + 1) % ANIM_SCENE_COUNT);
    }, 10000);
    return () => { clearInterval(tipInterval); clearInterval(sceneInterval); };
  }, [isExporting, exportResult, resultDismissed]);

  // 当新的导出开始时，重置隐藏状态；当导出完成时，触发动画
  useEffect(() => {
    if (isExporting && !prevExportingRef.current) {
      // 导出开始 → 重置隐藏状态
      setResultDismissed(false);
      setShowCompletionAnim(false);
    }
    if (!isExporting && prevExportingRef.current && exportResult) {
      // 导出刚完成 → 触发完成动画
      setShowCompletionAnim(true);
    }
    prevExportingRef.current = isExporting;
  }, [isExporting, exportResult]);

  const currentOperator = operatorIdentity.get();
  const versionNames = useMemo(
    () => Array.from(config.versionTemplates.keys()),
    [config.versionTemplates]
  );

  const handleVersionChange = useCallback(async (newVersionName: string) => {
    if (newVersionName === config.outputSettings.versionName) return;
    setChangingVersion(true);
    try {
      await configManager.setOutputVersion(newVersionName);
      onReloadConfig();
    } finally {
      setChangingVersion(false);
    }
  }, [config.outputSettings.versionName, onReloadConfig]);

  const handleVersionNumberChange = useCallback(async (newNum: string) => {
    const num = parseFloat(newNum);
    if (isNaN(num) || num === config.outputSettings.versionNumber) return;
    try {
      await configManager.setOutputVersionNumber(num);
      onReloadConfig();
    } catch { /* ignore */ }
  }, [config.outputSettings.versionNumber, onReloadConfig]);

  const handleExport = useCallback(async () => {
    onExportStart();
    const job = new ExportJob(onProgress);
    const result = await job.runExport();
    onExportComplete(result);
  }, [onExportStart, onExportComplete, onProgress]);

  const gitHandler = useMemo(
    () => new GitHandler(config.outputSettings.outputDirectory || ''),
    [config.outputSettings.outputDirectory]
  );

  const handleGitPush = useCallback(async () => {
    if (!exportResult || exportResult.modifiedFiles.length === 0) return;

    // 检查输出目录是否已配置（无目录则无法 git 操作）
    const outDir = config.outputSettings.outputDirectory || '';
    if (!outDir) {
      setGitError(true);
      setTimeout(() => setGitError(false), 3000);
      setResultDismissed(true);
      return;
    }

    const commitMessage = gitHandler.generateCommitMessage(
      config.gitCommitTemplate,
      config.outputSettings.versionName,
      config.outputSettings.versionNumber,
      config.outputSettings.versionSequence
    );
    const script = gitHandler.getFullPushScript(exportResult.modifiedFiles, commitMessage);

    if (!script) {
      setGitError(true);
      setTimeout(() => setGitError(false), 3000);
      setResultDismissed(true);
      return;
    }

    try {
      await navigator.clipboard.writeText(script);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = script;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }

    // Git 上传后，重置导出结果区域回到空闲状态
    setResultDismissed(true);
  }, [exportResult, gitHandler, config]);

  const progressValue = progress ? progress.step / progress.totalSteps : 0;
  const outputDir = config.outputSettings.outputDirectory || '';

  const warnings = exportResult?.errors.filter(e => e.severity === 'warning') || [];
  const errors = exportResult?.errors.filter(e => e.severity === 'error') || [];

  const handleNavigate = async (error: ExportError) => {
    if (error.location) {
      await excelHelper.navigateToCell(
        error.location.sheetName,
        error.location.row,
        error.location.column
      );
    }
  };

  // 当结果被用户（Git 上传后）主动隐藏时，不显示导出结果
  const visibleResult = resultDismissed ? null : exportResult;
  const canGitPush = visibleResult && !isExporting && visibleResult.success && visibleResult.modifiedFiles.length > 0;

  return (
    <div className={styles.container}>
      {/* 当前配置 */}
      <div className={styles.configSection}>
        <div className={styles.configHeader}>
          <Text className={styles.configTitle}>当前配置</Text>
          <Button
            icon={<ArrowSyncRegular />}
            appearance="transparent"
            size="small"
            onClick={onReloadConfig}
            style={{ minWidth: 'auto', padding: '0 4px' }}
          />
        </div>
        <div className={styles.configCard}>
          <div className={styles.configRow}>
            <span className={styles.configLabel}>输出版本</span>
            <Dropdown
              size="small"
              value={config.outputSettings.versionName}
              onOptionSelect={(_, d) => handleVersionChange(d.optionValue || '')}
              disabled={isExporting || changingVersion}
              style={{ minWidth: 100 }}
            >
              {versionNames.map(name => (
                <Option key={name} value={name} text={name}>{name}</Option>
              ))}
            </Dropdown>
          </div>
          <div className={styles.configRow}>
            <span className={styles.configLabel}>版本号</span>
            <Input
              size="small"
              defaultValue={String(config.outputSettings.versionNumber)}
              onBlur={(e) => handleVersionNumberChange(e.target.value)}
              disabled={isExporting}
              style={{ width: 80 }}
            />
          </div>
          <div className={styles.configRow}>
            <span className={styles.configLabel}>序列号</span>
            <span className={styles.configValue}>
              {config.outputSettings.versionSequence}
            </span>
          </div>
          {currentOperator && (
            <div className={styles.configRow}>
              <span className={styles.configLabel}>操作员</span>
              <span className={styles.configValue}>
                <PersonRegular fontSize={12} style={{ marginRight: 3 }} />
                {currentOperator}
              </span>
            </div>
          )}
          {outputDir && (
            <div className={styles.configRow}>
              <span className={styles.configLabel}>导出目录</span>
              <span className={styles.configValuePath}>{outputDir}</span>
            </div>
          )}
        </div>
      </div>

      {/* 导出 + Git上传 按钮并排 */}
      <div className={styles.actionSection}>
        <div className={styles.actionRow}>
          <Button
            className={styles.exportBtn}
            icon={<ArrowExportRegular />}
            appearance="primary"
            onClick={handleExport}
            disabled={isExporting}
            size="large"
          >
            {isExporting ? '导出中...' : '开始导出'}
          </Button>
          <Button
            className={styles.gitBtn}
            icon={<ArrowUploadRegular />}
            appearance="secondary"
            onClick={handleGitPush}
            disabled={!canGitPush && !gitError}
            size="large"
            style={gitError ? { color: tokens.colorPaletteRedForeground1, borderColor: tokens.colorPaletteRedBorder1 } : undefined}
          >
            {gitError ? 'Git 失败' : 'Git'}
          </Button>
        </div>

        {isExporting && progress && (
          <div className={styles.progressArea}>
            <ProgressBar value={progressValue} />
            <Text className={styles.progressText}>
              [{progress.step}/{progress.totalSteps}] {progress.message}
            </Text>
          </div>
        )}
      </div>

      {/* 导出结果 / 空闲占位 */}
      {visibleResult && !isExporting ? (
        <div className={`${styles.resultSection} ${styles.resultFadeIn}`}>
          {/* 摘要行：状态 + 耗时 + 统计 */}
          <div className={styles.resultSummary}>
            {visibleResult.success ? (
              <CheckmarkCircleRegular
                className={`${styles.resultStatusIcon} ${styles.successColor} ${showCompletionAnim ? styles.successCheckAnim : ''}`}
              />
            ) : (
              <DismissCircleRegular className={`${styles.resultStatusIcon} ${styles.failColor}`} />
            )}
            <span className={styles.resultStatusText}>
              {visibleResult.success ? '导出成功' : '导出失败'}
            </span>
            <span className={styles.resultDuration}>
              {visibleResult.duration.toFixed(1)}s
            </span>
            <div className={styles.resultStats}>
              {visibleResult.modifiedFiles.length > 0 && (
                <span className={`${styles.statItem} ${styles.statFiles}`}>
                  <DocumentRegular fontSize={13} />
                  <span className={styles.fileCountBadge}>{visibleResult.modifiedFiles.length}</span>
                </span>
              )}
              {warnings.length > 0 && (
                <span className={`${styles.statItem} ${styles.statWarnings}`}>
                  <WarningRegular fontSize={13} />
                  {warnings.length}
                </span>
              )}
              {errors.length > 0 && (
                <span className={`${styles.statItem} ${styles.statErrors}`}>
                  <DismissCircleRegular fontSize={13} />
                  {errors.length}
                </span>
              )}
            </div>
          </div>

          {/* 修改文件列表 */}
          {visibleResult.modifiedFiles.length > 0 && (
            <div className={styles.resultCard}>
              <div className={styles.fileList}>
                {visibleResult.modifiedFiles.map((file, i) => (
                  <div key={i} className={styles.fileItem}>
                    <DocumentRegular className={styles.fileIcon} fontSize={13} />
                    <span className={styles.filePath}>{file}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 校验警告 */}
          {warnings.length > 0 && (
            <div className={styles.warningCard}>
              <div className={styles.warningHeader}>
                <WarningRegular fontSize={16} />
                <span>[dataValidation] 共 {warnings.length} 处警告</span>
              </div>
              {warnings.slice(0, 10).map((w, i) => (
                <div key={i} className={styles.warningItem}>
                  [{w.code}] {w.message}
                  {w.tableName && ` (工作表: ${w.tableName})`}
                  {w.location && (
                    <Button
                      className={styles.navigateLink}
                      appearance="transparent"
                      size="small"
                      icon={<NavigationRegular fontSize={10} />}
                      onClick={() => handleNavigate(w)}
                    />
                  )}
                </div>
              ))}
              {warnings.length > 10 && (
                <div className={styles.warningItem}>
                  ...等共 {warnings.length} 处
                </div>
              )}
            </div>
          )}

          {/* 错误 */}
          {errors.length > 0 && (
            <div className={styles.errorCard}>
              <div className={styles.errorHeader}>
                <DismissCircleRegular fontSize={16} />
                <span>错误 ({errors.length})</span>
              </div>
              {errors.map((e, i) => (
                <div key={i} className={styles.errorItem}>
                  [{e.code}] {e.message}
                  {e.tableName && ` (工作表: ${e.tableName})`}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : !isExporting && (
        /* 空闲状态：6种趣味动画场景轮播 + 数值Tips */
        <div className={styles.idleArea}>
          {/* 动画舞台 — key 变化触发淡入 */}
          <div className={`${styles.animStage} ${styles.sceneFadeIn}`} key={`scene-${animScene}`}>

            {/* Scene 0: 正弦波 */}
            {animScene === 0 && (
              <div className={styles.waveContainer}>
                {Array.from({ length: 24 }, (_, i) => (
                  <span key={i} className={styles.waveBar} style={{ animationDelay: `${i * 0.09}s` }} />
                ))}
              </div>
            )}

            {/* Scene 1: 脉冲环 */}
            {animScene === 1 && (
              <>
                {[0, 0.7, 1.4, 2.1].map((delay, i) => (
                  <span key={i} className={styles.pulseRing} style={{ animationDelay: `${delay}s` }} />
                ))}
              </>
            )}

            {/* Scene 2: 轨道原子 */}
            {animScene === 2 && (
              <>
                <span className={styles.orbitCenter} />
                {[
                  { radius: 22, size: 5, dur: 3, opacity: 0.55 },
                  { radius: 38, size: 4, dur: 5, opacity: 0.4 },
                  { radius: 55, size: 6, dur: 8, opacity: 0.35 },
                  { radius: 32, size: 3, dur: 6.5, opacity: 0.3 },
                  { radius: 48, size: 4, dur: 10, opacity: 0.25 },
                ].map((o, i) => (
                  <div key={i} className={styles.orbitArm} style={{ animationDuration: `${o.dur}s` }}>
                    <span className={styles.orbitDot} style={{ left: o.radius, width: o.size, height: o.size, opacity: o.opacity }} />
                  </div>
                ))}
                {[22, 38, 55].map((r, i) => (
                  <span key={i} className={styles.orbitRing} style={{ width: r * 2, height: r * 2, marginTop: -r, marginLeft: -r }} />
                ))}
              </>
            )}

            {/* Scene 3: 网格脉冲 */}
            {animScene === 3 && (
              <div className={styles.gridContainer}>
                {Array.from({ length: 48 }, (_, i) => {
                  const row = Math.floor(i / 8);
                  const col = i % 8;
                  const delay = (row + col) * 0.15;
                  return <span key={i} className={styles.gridDot} style={{ animationDelay: `${delay}s` }} />;
                })}
              </div>
            )}

            {/* Scene 4: 钟摆波 */}
            {animScene === 4 && (
              <div className={styles.pendulumContainer}>
                {Array.from({ length: 14 }, (_, i) => {
                  const length = 25 + i * 5;
                  const duration = 1.4 + i * 0.07;
                  return (
                    <div key={i} className={styles.pendulumArm} style={{ animationDuration: `${duration}s` }}>
                      <div className={styles.pendulumString} style={{ height: length }} />
                      <span className={styles.pendulumBob} />
                    </div>
                  );
                })}
              </div>
            )}

            {/* Scene 5: 公式呼吸 */}
            {animScene === 5 && (
              <div className={styles.formulaContainer}>
                <span className={styles.formulaText} style={{ fontSize: '26px', animationDuration: '4s', animationDelay: '0s' }}>
                  e<sup>iπ</sup> + 1 = 0
                </span>
                <span className={styles.formulaText} style={{ fontSize: '15px', animationDuration: '5s', animationDelay: '1.2s' }}>
                  ∑ᵢ₌₁ⁿ xᵢ / n = x̄
                </span>
                <span className={styles.formulaText} style={{ fontSize: '18px', animationDuration: '4.5s', animationDelay: '2.5s' }}>
                  F = G · m₁m₂ / r²
                </span>
              </div>
            )}
          </div>

          {/* 数值策划 Tips */}
          <div className={styles.tipContainer}>
            <Text className={styles.tipText} style={{ opacity: tipVisible ? 1 : 0 }}>
              {IDLE_TIPS[tipIndex]}
            </Text>
          </div>
        </div>
      )}

      {/* 签名水印 */}
      <div className={styles.watermark}>vin</div>
    </div>
  );
}
