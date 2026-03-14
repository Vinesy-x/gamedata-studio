/* global Excel */

import { logger } from '../utils/Logger';

// 系统表列表（可控制显示/隐藏）
const SYSTEM_SHEETS = ['表格输出', '配置设置表', '表名对照'];

export type VisibilityState = 'visible' | 'hidden' | 'veryHidden';

/**
 * SheetVisibility — 工作表显隐控制
 *
 * 提供系统表（表格输出、配置设置表、表名对照）的显隐切换，
 * 以及批量设置数据表的可见性。
 */
export class SheetVisibility {
  /**
   * 获取所有工作表的可见性状态
   */
  async getAll(): Promise<Map<string, VisibilityState>> {
    const result = new Map<string, VisibilityState>();

    await Excel.run(async (context) => {
      const sheets = context.workbook.worksheets;
      sheets.load('items/name,items/visibility');
      await context.sync();

      for (const sheet of sheets.items) {
        let state: VisibilityState = 'visible';
        if (sheet.visibility === Excel.SheetVisibility.hidden) {
          state = 'hidden';
        } else if (sheet.visibility === Excel.SheetVisibility.veryHidden) {
          state = 'veryHidden';
        }
        result.set(sheet.name, state);
      }
    });

    return result;
  }

  /**
   * 切换系统表（表格输出等）的显隐状态
   * @param visible true=显示, false=隐藏
   */
  async toggleSystemSheets(visible: boolean): Promise<void> {
    await Excel.run(async (context) => {
      const sheets = context.workbook.worksheets;
      sheets.load('items/name');
      await context.sync();

      for (const sheet of sheets.items) {
        if (SYSTEM_SHEETS.includes(sheet.name)) {
          sheet.visibility = visible
            ? Excel.SheetVisibility.visible
            : Excel.SheetVisibility.hidden;
        }
      }

      await context.sync();
      logger.info(`系统表已${visible ? '显示' : '隐藏'}`);
    });
  }

  /**
   * 设置单个工作表的可见性
   */
  async setVisibility(sheetName: string, state: VisibilityState): Promise<void> {
    await Excel.run(async (context) => {
      const sheet = context.workbook.worksheets.getItemOrNullObject(sheetName);
      sheet.load('isNullObject');
      await context.sync();

      if (sheet.isNullObject) {
        logger.warn(`工作表「${sheetName}」不存在`);
        return;
      }

      switch (state) {
        case 'visible':
          sheet.visibility = Excel.SheetVisibility.visible;
          break;
        case 'hidden':
          sheet.visibility = Excel.SheetVisibility.hidden;
          break;
        case 'veryHidden':
          sheet.visibility = Excel.SheetVisibility.veryHidden;
          break;
      }

      await context.sync();
      logger.info(`工作表「${sheetName}」可见性已设为 ${state}`);
    });
  }

  /**
   * 检查系统表当前是否可见
   */
  async areSystemSheetsVisible(): Promise<boolean> {
    const states = await this.getAll();
    return SYSTEM_SHEETS.every(name => states.get(name) === 'visible');
  }
}

export const sheetVisibility = new SheetVisibility();
