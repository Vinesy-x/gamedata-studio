import { logger } from '../utils/Logger';

const STORAGE_KEY = 'gds-operator';

/**
 * OperatorIdentity — 操作员身份持久化
 *
 * 使用 localStorage 在客户端级别存储当前操作员，
 * 每个客户端独立维护自己的操作员身份，协同监听据此判断触发者。
 */
export class OperatorIdentity {
  get(): string | null {
    try {
      return localStorage.getItem(STORAGE_KEY) || null;
    } catch {
      return null;
    }
  }

  async set(name: string): Promise<void> {
    try {
      localStorage.setItem(STORAGE_KEY, name);
      logger.info(`OperatorIdentity: 已设置操作员为「${name}」`);
    } catch (err) {
      logger.error(`OperatorIdentity.set: ${err}`);
    }
  }

  async clear(): Promise<void> {
    try {
      localStorage.removeItem(STORAGE_KEY);
      logger.info('OperatorIdentity: 已清除操作员');
    } catch (err) {
      logger.error(`OperatorIdentity.clear: ${err}`);
    }
  }
}

export const operatorIdentity = new OperatorIdentity();
