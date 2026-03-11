/* global Excel */

export type SheetData = (string | number | boolean | null)[][];

export interface SheetSnapshot {
  name: string;
  values: SheetData;
  rowCount: number;
  colCount: number;
  startRow: number;  // usedRange 起始行（0-based，用于 getRangeByIndexes 偏移修正）
  startCol: number;  // usedRange 起始列（0-based）
}

export class ExcelHelper {
  /**
   * 读取工作表的 UsedRange 到内存
   */
  async loadSheetSnapshot(
    context: Excel.RequestContext,
    sheetName: string
  ): Promise<SheetSnapshot | null> {
    const sheet = context.workbook.worksheets.getItemOrNullObject(sheetName);
    sheet.load('isNullObject');
    await context.sync();

    if (sheet.isNullObject) return null;

    const usedRange = sheet.getUsedRangeOrNullObject(true);
    usedRange.load('values,rowCount,columnCount,rowIndex,columnIndex');
    await context.sync();

    if (usedRange.isNullObject) {
      return { name: sheetName, values: [], rowCount: 0, colCount: 0, startRow: 0, startCol: 0 };
    }

    return {
      name: sheetName,
      values: usedRange.values,
      rowCount: usedRange.rowCount,
      colCount: usedRange.columnCount,
      startRow: usedRange.rowIndex,
      startCol: usedRange.columnIndex,
    };
  }

  /**
   * 在内存数据中查找标记文字，返回 {row, col} (0-indexed)
   */
  findMarkerInData(
    data: SheetData,
    markerText: string
  ): { row: number; col: number } | null {
    const target = markerText.toLowerCase();
    for (let r = 0; r < data.length; r++) {
      for (let c = 0; c < data[r].length; c++) {
        const val = data[r][c];
        if (val != null && String(val).trim().toLowerCase() === target) {
          return { row: r, col: c };
        }
      }
    }
    return null;
  }

  /**
   * 从标记位置向下读取数据块（到空行为止）
   */
  readBlockBelow(
    data: SheetData,
    markerRow: number,
    markerCol: number,
    numColumns: number
  ): SheetData {
    const rows: SheetData = [];
    for (let r = markerRow + 1; r < data.length; r++) {
      const firstCell = data[r]?.[markerCol];
      if (firstCell == null || String(firstCell).trim() === '') {
        break;
      }
      const row: (string | number | boolean | null)[] = [];
      for (let c = markerCol; c < markerCol + numColumns && c < (data[r]?.length || 0); c++) {
        row.push(data[r][c] ?? null);
      }
      rows.push(row);
    }
    return rows;
  }

  /**
   * 读取标记右侧一格的值
   */
  getValueRight(
    data: SheetData,
    markerRow: number,
    markerCol: number
  ): string | number | boolean | null {
    if (markerRow < data.length && markerCol + 1 < data[markerRow].length) {
      return data[markerRow][markerCol + 1];
    }
    return null;
  }

  /**
   * 写入值到指定范围
   */
  async writeValues(
    context: Excel.RequestContext,
    sheetName: string,
    startRow: number,
    startCol: number,
    values: (string | number | boolean | null)[][]
  ): Promise<void> {
    if (values.length === 0) return;
    const sheet = context.workbook.worksheets.getItem(sheetName);
    const rowCount = values.length;
    const colCount = values[0].length;
    const range = sheet.getRangeByIndexes(startRow, startCol, rowCount, colCount);
    range.values = values as (string | number | boolean)[][];
    await context.sync();
  }

  /**
   * 跳转到指定单元格
   */
  async navigateToCell(
    sheetName: string,
    row: number,
    column: number
  ): Promise<void> {
    await Excel.run(async (context) => {
      const sheet = context.workbook.worksheets.getItem(sheetName);
      const cell = sheet.getRangeByIndexes(row - 1, column - 1, 1, 1);
      sheet.activate();
      cell.select();
      await context.sync();
    });
  }
}

export const excelHelper = new ExcelHelper();
