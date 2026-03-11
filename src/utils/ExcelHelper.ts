/* global Excel */

export class ExcelHelper {
  /**
   * 在工作表中查找包含指定文本的单元格
   */
  async findMarker(
    sheet: Excel.Worksheet,
    markerText: string
  ): Promise<Excel.Range | null> {
    const usedRange = sheet.getUsedRangeOrNullObject(true);
    const found = usedRange.find(markerText, {
      completeMatch: true,
      matchCase: false,
    });
    found.load('address,rowIndex,columnIndex');

    try {
      await sheet.context.sync();
      if (found.isNullObject) return null;
      return found;
    } catch {
      return null;
    }
  }

  /**
   * 安全获取工作表
   */
  getSheet(
    workbook: Excel.Workbook,
    name: string
  ): Excel.Worksheet | null {
    try {
      const sheet = workbook.worksheets.getItemOrNullObject(name);
      return sheet;
    } catch {
      return null;
    }
  }

  /**
   * 读取从指定单元格开始的区域数据（使用 getSurroundingRegion）
   */
  async getRegionValues(
    range: Excel.Range
  ): Promise<(string | number | boolean)[][]> {
    const region = range.getSurroundingRegion();
    region.load('values');
    await range.context.sync();
    return region.values;
  }

  /**
   * 读取从标记位置向下到空行的数据块
   */
  async readBlockBelow(
    sheet: Excel.Worksheet,
    markerRange: Excel.Range,
    maxColumns: number
  ): Promise<(string | number | boolean)[][]> {
    markerRange.load('rowIndex,columnIndex');
    await sheet.context.sync();

    const startRow = markerRange.rowIndex + 1;
    const startCol = markerRange.columnIndex;

    const rows: (string | number | boolean)[][] = [];
    let emptyCount = 0;
    let currentRow = startRow;

    while (emptyCount < 2) {
      const rowRange = sheet.getRangeByIndexes(currentRow, startCol, 1, maxColumns);
      rowRange.load('values');
      await sheet.context.sync();

      const rowValues = rowRange.values[0];
      const firstCell = rowValues[0];

      if (firstCell == null || String(firstCell).trim() === '') {
        emptyCount++;
        currentRow++;
        continue;
      }

      emptyCount = 0;
      rows.push(rowValues);
      currentRow++;
    }

    return rows;
  }

  /**
   * 读取工作表的 UsedRange 数据
   */
  async getUsedRangeValues(
    sheet: Excel.Worksheet
  ): Promise<{ values: (string | number | boolean)[][]; rowCount: number; columnCount: number }> {
    const usedRange = sheet.getUsedRangeOrNullObject(true);
    usedRange.load('values,rowCount,columnCount');
    await sheet.context.sync();

    if (usedRange.isNullObject) {
      return { values: [], rowCount: 0, columnCount: 0 };
    }

    return {
      values: usedRange.values,
      rowCount: usedRange.rowCount,
      columnCount: usedRange.columnCount,
    };
  }

  /**
   * 暂停/恢复 Excel 计算
   */
  async suspendCalculation(
    context: Excel.RequestContext,
    suspend: boolean
  ): Promise<void> {
    const app = context.workbook.application;
    app.calculationMode = suspend ? Excel.CalculationMode.manual : Excel.CalculationMode.automatic;
    await context.sync();
  }

  /**
   * 写入值到指定范围
   */
  async writeValues(
    sheet: Excel.Worksheet,
    startRow: number,
    startCol: number,
    values: (string | number | boolean | null)[][]
  ): Promise<void> {
    if (values.length === 0) return;
    const rowCount = values.length;
    const colCount = values[0].length;
    const range = sheet.getRangeByIndexes(startRow, startCol, rowCount, colCount);
    range.values = values as (string | number | boolean)[][];
    await sheet.context.sync();
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
