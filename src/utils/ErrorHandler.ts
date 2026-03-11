/* global Excel */

import { ExportError, ErrorSeverity } from '../types/errors';
import { excelHelper } from './ExcelHelper';

export class ErrorHandler {
  private errors: ExportError[] = [];

  /**
   * 记录错误，同时写入内存列表和「表格输出」工作表
   */
  async logError(error: ExportError): Promise<void> {
    this.errors.push(error);

    try {
      await Excel.run(async (context) => {
        const sheet = context.workbook.worksheets.getItemOrNullObject('表格输出');
        sheet.load('isNullObject');
        await context.sync();
        if (sheet.isNullObject) return;

        const marker = await excelHelper.findMarker(sheet, '#输出错误列表#');
        if (!marker) return;

        marker.load('rowIndex,columnIndex');
        await context.sync();

        // 找到下一个空行
        const errorRow = this.errors.length;
        const targetRow = marker.rowIndex + errorRow;
        const targetCol = marker.columnIndex;

        const range = sheet.getRangeByIndexes(targetRow, targetCol, 1, 6);
        range.values = [[
          new Date().toLocaleString('zh-CN'),
          error.code,
          error.procedure,
          error.tableName,
          error.location
            ? `行${error.location.row} 列${error.location.column}`
            : '',
          error.message,
        ]];

        if (error.severity === 'error') {
          range.format.fill.color = '#FFE6E6';
        } else {
          range.format.fill.color = '#FFF3E6';
        }

        await context.sync();
      });
    } catch {
      console.warn('[ErrorHandler] 写入错误日志到工作表失败:', error.code, error.message);
    }
  }

  /**
   * 创建 ExportError 并记录
   */
  async log(
    code: number,
    severity: ErrorSeverity,
    tableName: string,
    message: string,
    procedure: string,
    location?: ExportError['location']
  ): Promise<void> {
    await this.logError({ code, severity, tableName, message, procedure, location });
  }

  getErrors(): ExportError[] {
    return [...this.errors];
  }

  getWarnings(): ExportError[] {
    return this.errors.filter(e => e.severity === 'warning');
  }

  getCriticalErrors(): ExportError[] {
    return this.errors.filter(e => e.severity === 'error');
  }

  hasCriticalErrors(): boolean {
    return this.errors.some(e => e.severity === 'error');
  }

  clear(): void {
    this.errors = [];
  }

  /**
   * 清空工作表中的错误列表区域
   */
  async clearSheetErrors(): Promise<void> {
    try {
      await Excel.run(async (context) => {
        const sheet = context.workbook.worksheets.getItemOrNullObject('表格输出');
        sheet.load('isNullObject');
        await context.sync();
        if (sheet.isNullObject) return;

        const marker = await excelHelper.findMarker(sheet, '#输出错误列表#');
        if (!marker) return;

        marker.load('rowIndex,columnIndex');
        await context.sync();

        // 清除标记下方的内容（最多100行）
        const clearRange = sheet.getRangeByIndexes(
          marker.rowIndex + 1, marker.columnIndex, 100, 6
        );
        clearRange.clear(Excel.ClearApplyTo.contents);
        clearRange.format.fill.clear();
        await context.sync();
      });
    } catch {
      console.warn('[ErrorHandler] 清空工作表错误列表失败');
    }
  }
}
