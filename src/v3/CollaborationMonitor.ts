/* global Excel */

import { StudioConfigStore, CollabConfig } from '../v2/StudioConfigStore';
import { operatorIdentity } from '../v2/OperatorIdentity';
import { logger } from '../utils/Logger';

export interface CollabTriggerParams {
  version: string;
  versionNumber: number;
  operator: string;
}

export interface CollabCallbacks {
  onTrigger: (params: CollabTriggerParams) => Promise<void>;
  isExporting: () => boolean;
}

/**
 * 协同导出监听器
 *
 * 轮询 StudioConfig 表的协同配置区，检测 #操作人# 有值时触发导出。
 * 流程：
 * 1. 每 5 秒读取 StudioConfig A3:B8
 * 2. 检测 #操作人# (B6) 是否有值
 * 3. 有值且非 "正在导出..." → 立即清空操作人 + 回写状态 → 触发回调
 * 4. 触发后 10 秒冷却期
 */
export class CollaborationMonitor {
  private callbacks: CollabCallbacks;
  private timer: ReturnType<typeof setInterval> | null = null;
  private cooldownUntil = 0;

  private static readonly POLL_INTERVAL = 5000;
  private static readonly COOLDOWN_MS = 10000;

  constructor(callbacks: CollabCallbacks) {
    this.callbacks = callbacks;
  }

  start(): void {
    if (this.timer) return;
    logger.info('CollaborationMonitor: 开始监听');
    this.timer = setInterval(() => this.poll(), CollaborationMonitor.POLL_INTERVAL);
    // 立即执行一次
    this.poll();
  }

  stop(): void {
    if (!this.timer) return;
    clearInterval(this.timer);
    this.timer = null;
    logger.info('CollaborationMonitor: 停止监听');
  }

  isRunning(): boolean {
    return this.timer !== null;
  }

  private async poll(): Promise<void> {
    // 冷却期内跳过
    if (Date.now() < this.cooldownUntil) return;

    // 正在导出时跳过
    if (this.callbacks.isExporting()) return;

    try {
      const config = await this.readCollab();
      if (!config) return;

      const operator = config.operator;
      if (!operator || operator === '正在导出...') return;

      // 匹配本地操作员：只有操作人与本地一致时才触发
      const localOperator = operatorIdentity.get();
      if (!localOperator) return;
      if (operator !== localOperator) return;

      logger.info(`CollaborationMonitor: 检测到操作人「${operator}」匹配本地，触发导出`);

      // 立即回写状态：清空操作人 + 标记正在导出
      await this.writeStatus('正在导出...', '');

      // 设置冷却
      this.cooldownUntil = Date.now() + CollaborationMonitor.COOLDOWN_MS;

      // 触发回调
      await this.callbacks.onTrigger({
        version: config.version,
        versionNumber: config.versionNumber,
        operator,
      });
    } catch (err) {
      logger.error('CollaborationMonitor.poll 错误', err);
    }
  }

  private async readCollab(): Promise<CollabConfig | null> {
    try {
      return await Excel.run(async (context) => {
        return StudioConfigStore.readCollabConfig(context);
      });
    } catch {
      return null;
    }
  }

  private async writeStatus(status: string, result: string): Promise<void> {
    try {
      await Excel.run(async (context) => {
        await StudioConfigStore.writeCollabStatus(context, status, result, true);
      });
    } catch (err) {
      logger.error('CollaborationMonitor.writeStatus 错误', err);
    }
  }
}
