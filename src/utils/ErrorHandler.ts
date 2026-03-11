import { ExportError, ErrorSeverity } from '../types/errors';

export class ErrorHandler {
  private errors: ExportError[] = [];

  logError(error: ExportError): void {
    this.errors.push(error);
  }

  log(
    code: number,
    severity: ErrorSeverity,
    tableName: string,
    message: string,
    procedure: string,
    location?: ExportError['location']
  ): void {
    this.logError({ code, severity, tableName, message, procedure, location });
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
   * 将错误列表写入「表格输出」工作表（导出完成后调用一次）
   */
  async writeErrorsToSheet(): Promise<void> {
    if (this.errors.length === 0) return;

    try {
      await (globalThis as any).Excel.run(async (context: any) => {
        const sheet = context.workbook.worksheets.getItemOrNullObject('表格输出');
        sheet.load('isNullObject');
        await context.sync();
        if (sheet.isNullObject) return;

        // 读取整个工作表找到 #输出错误列表# 标记
        const usedRange = sheet.getUsedRangeOrNullObject(true);
        usedRange.load('values,rowIndex,columnIndex');
        await context.sync();
        if (usedRange.isNullObject) return;

        const values = usedRange.values;
        const oR = usedRange.rowIndex;   // usedRange 起始行偏移
        const oC = usedRange.columnIndex; // usedRange 起始列偏移
        let markerRow = -1;
        let markerCol = -1;
        for (let r = 0; r < values.length; r++) {
          for (let c = 0; c < values[r].length; c++) {
            if (String(values[r][c] ?? '').trim() === '#输出错误列表#') {
              markerRow = r;
              markerCol = c;
              break;
            }
          }
          if (markerRow >= 0) break;
        }

        if (markerRow < 0) return;

        // 写入错误列表（标记下方第2行起，跳过表头行）
        const startRow = markerRow + oR + 2;
        for (let i = 0; i < this.errors.length && i < 100; i++) {
          const err = this.errors[i];
          const range = sheet.getRangeByIndexes(startRow + i, markerCol + oC, 1, 6);
          range.values = [[
            new Date().toLocaleString('zh-CN'),
            err.code,
            err.procedure,
            err.tableName,
            err.location ? `行${err.location.row} 列${err.location.column}` : '',
            err.message,
          ]];
          if (err.severity === 'error') {
            range.format.fill.color = '#FFE6E6';
          }
        }

        await context.sync();
      });
    } catch {
      console.warn('[ErrorHandler] 写入错误日志到工作表失败');
    }
  }
}
