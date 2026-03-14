/* global Excel */

/**
 * v3.0 校验结果定位跳转
 *
 * 提供跳转到指定单元格并临时高亮的功能，
 * 用于用户点击校验结果时快速定位问题位置。
 */

import { CellLocation } from '../types/validation';

export class ValidationNavigator {
  /** 高亮持续时间（毫秒） */
  private highlightDuration: number;

  constructor(highlightDuration: number = 3000) {
    this.highlightDuration = highlightDuration;
  }

  /**
   * 跳转到指定单元格并临时高亮
   * 激活工作表 → 选中单元格 → 设置金色背景 → 3秒后清除
   */
  async navigateTo(location: CellLocation): Promise<void> {
    await Excel.run(async (context) => {
      const sheet = context.workbook.worksheets.getItem(location.sheetName);
      sheet.activate();

      const cell = sheet.getCell(location.row - 1, location.column - 1);
      cell.select();
      cell.format.fill.color = '#FFD700'; // 金色高亮
      await context.sync();

      // 延时后清除高亮
      setTimeout(async () => {
        try {
          await Excel.run(async (ctx) => {
            ctx.workbook.worksheets
              .getItem(location.sheetName)
              .getCell(location.row - 1, location.column - 1)
              .format.fill.clear();
            await ctx.sync();
          });
        } catch {
          // 清除高亮失败不影响主流程（可能用户已切换工作表）
        }
      }, this.highlightDuration);
    });
  }
}
