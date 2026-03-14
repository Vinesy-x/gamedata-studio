/* global Office */

import { logger } from '../utils/Logger';

const SETTINGS_KEY_OPERATOR = 'gamedata_studio_operator';

/**
 * OperatorIdentity — 操作员身份持久化
 *
 * 使用 Office.context.document.settings 在文档级别存储当前操作员，
 * 同一文档不同会话间保持一致。
 */
export class OperatorIdentity {
  /**
   * 获取当前操作员名称
   * 返回 null 表示尚未设置
   */
  get(): string | null {
    try {
      const val = Office.context.document.settings.get(SETTINGS_KEY_OPERATOR);
      return val ? String(val) : null;
    } catch {
      logger.warn('OperatorIdentity.get: 无法读取 settings');
      return null;
    }
  }

  /**
   * 设置当前操作员名称并持久化
   */
  async set(name: string): Promise<void> {
    try {
      Office.context.document.settings.set(SETTINGS_KEY_OPERATOR, name);
      await this.saveAsync();
      logger.info(`OperatorIdentity: 已设置操作员为「${name}」`);
    } catch (err) {
      logger.error(`OperatorIdentity.set: ${err}`);
    }
  }

  /**
   * 清除操作员身份
   */
  async clear(): Promise<void> {
    try {
      Office.context.document.settings.remove(SETTINGS_KEY_OPERATOR);
      await this.saveAsync();
      logger.info('OperatorIdentity: 已清除操作员');
    } catch (err) {
      logger.error(`OperatorIdentity.clear: ${err}`);
    }
  }

  private saveAsync(): Promise<void> {
    return new Promise((resolve, reject) => {
      Office.context.document.settings.saveAsync((result) => {
        if (result.status === Office.AsyncResultStatus.Succeeded) {
          resolve();
        } else {
          reject(new Error(result.error?.message || 'Settings save failed'));
        }
      });
    });
  }
}

export const operatorIdentity = new OperatorIdentity();
