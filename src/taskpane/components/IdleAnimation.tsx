import { useState, useEffect } from 'react';
import { makeStyles, tokens, Text } from '@fluentui/react-components';

// ─── 数值策划 Tips ─────────────────────────────────────────
export const IDLE_TIPS = [
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

const useStyles = makeStyles({
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
});

interface IdleAnimationProps {
  active?: boolean;
}

export function IdleAnimation({ active = true }: IdleAnimationProps) {
  const styles = useStyles();
  const [tipIndex, setTipIndex] = useState(() => Math.floor(Math.random() * IDLE_TIPS.length));
  const [tipVisible, setTipVisible] = useState(true);
  const [animScene, setAnimScene] = useState(() => Math.floor(Math.random() * ANIM_SCENE_COUNT));

  useEffect(() => {
    if (!active) return;
    const tipInterval = setInterval(() => {
      setTipVisible(false);
      setTimeout(() => {
        setTipIndex(prev => {
          let next: number;
          do { next = Math.floor(Math.random() * IDLE_TIPS.length); } while (next === prev && IDLE_TIPS.length > 1);
          return next;
        });
        setTipVisible(true);
      }, 500);
    }, 5000);
    const sceneInterval = setInterval(() => {
      setAnimScene(prev => (prev + 1) % ANIM_SCENE_COUNT);
    }, 10000);
    return () => { clearInterval(tipInterval); clearInterval(sceneInterval); };
  }, [active]);

  return (
    <>
      <div className={styles.idleArea}>
        <div className={`${styles.animStage} ${styles.sceneFadeIn}`} key={`scene-${animScene}`}>
          {animScene === 0 && (
            <div className={styles.waveContainer}>
              {Array.from({ length: 24 }, (_, i) => (
                <span key={i} className={styles.waveBar} style={{ animationDelay: `${i * 0.09}s` }} />
              ))}
            </div>
          )}
          {animScene === 1 && (
            <>
              {[0, 0.7, 1.4, 2.1].map((delay, i) => (
                <span key={i} className={styles.pulseRing} style={{ animationDelay: `${delay}s` }} />
              ))}
            </>
          )}
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
        <div className={styles.tipContainer}>
          <Text className={styles.tipText} style={{ opacity: tipVisible ? 1 : 0 }}>
            {IDLE_TIPS[tipIndex]}
          </Text>
        </div>
      </div>
      <div className={styles.watermark}>vin {__APP_VERSION__}</div>
    </>
  );
}
