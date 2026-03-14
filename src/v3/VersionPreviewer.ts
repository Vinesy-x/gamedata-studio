/* global Excel */

import { Config } from '../types/config';
import { CellValue } from '../types/table';
import { VersionFilter } from '../engine/VersionFilter';
import { excelHelper, SheetData } from '../utils/ExcelHelper';
import { logger } from '../utils/Logger';

export interface PreviewResult {
  tableName: string;
  originalRows: number;
  originalCols: number;
  filteredRows: number;
  filteredCols: number;
  excludedRows: number[];      // 被排除的行号（0-indexed，相对于数据区）
  excludedCols: number[];      // 被排除的列号
  overriddenRows: number[];    // 被重复Key覆盖的行号
}

// 条件格式标记公式
const CF_MARKER_EXCLUDED = '=1=1';
const CF_MARKER_OVERRIDDEN = '=2=2';

// 记录哪些表当前有预览高亮
const highlightedSheets = new Set<string>();

export class VersionPreviewer {
  /**
   * 预览指定版本的筛选结果（不执行导出）
   *
   * @param versionName  版本名称（用于查找线路字段）
   * @param versionNumber 目标版本号
   * @param config 全局配置
   * @param tableNames 要预览的表名集合
   */
  async preview(
    versionName: string,
    versionNumber: number,
    config: Config,
    tableNames: Set<string>
  ): Promise<PreviewResult[]> {
    const results: PreviewResult[] = [];

    // 确定目标线路字段
    const lineField = this.determineLineField(versionName, config);
    const versionFilter = new VersionFilter(versionNumber, lineField);

    await Excel.run(async (context) => {
      for (const tableName of tableNames) {
        try {
          const snap = await excelHelper.loadSheetSnapshot(context, tableName);
          if (!snap || snap.values.length === 0) {
            logger.warn(`预览跳过表「${tableName}」: 工作表不存在或为空`);
            continue;
          }

          const result = this.analyzeTable(tableName, snap.values, versionFilter);
          if (result) {
            results.push(result);
          }
        } catch (err) {
          logger.error(`预览表「${tableName}」失败: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    });

    logger.info(`版本预览完成: ${results.length} 张表`);
    return results;
  }

  /**
   * 纯计算版本的 preview，不依赖 Excel.run，直接接受 snapshot 数据
   * 用于测试和无 Excel 环境场景
   */
  previewFromSnapshots(
    versionName: string,
    versionNumber: number,
    config: Config,
    snapshots: Map<string, SheetData>
  ): PreviewResult[] {
    const results: PreviewResult[] = [];
    const lineField = this.determineLineField(versionName, config);
    const versionFilter = new VersionFilter(versionNumber, lineField);

    for (const [tableName, values] of snapshots) {
      if (values.length === 0) continue;
      const result = this.analyzeTable(tableName, values, versionFilter);
      if (result) {
        results.push(result);
      }
    }

    return results;
  }

  /**
   * 分析单张表的筛选结果
   */
  private analyzeTable(
    tableName: string,
    allValues: SheetData,
    versionFilter: VersionFilter
  ): PreviewResult | null {
    const totalRows = allValues.length;
    const totalCols = allValues[0]?.length || 0;

    // 定位关键标记
    const versionRPos = excelHelper.findMarkerInData(allValues, 'version_r');
    if (!versionRPos) {
      // 没有 version_r 的表：全量输出，无排除
      return {
        tableName,
        originalRows: totalRows,
        originalCols: totalCols,
        filteredRows: totalRows,
        filteredCols: totalCols,
        excludedRows: [],
        excludedCols: [],
        overriddenRows: [],
      };
    }

    const versionRRow = versionRPos.row;

    // 查找 #配置区域#（在 version_r 所在行扫描）
    let configAreaCol = -1;
    for (let c = 0; c < totalCols; c++) {
      const val = String(allValues[versionRRow][c] ?? '').trim();
      if (val === '#配置区域#') {
        configAreaCol = c;
        break;
      }
    }

    if (configAreaCol === -1 || configAreaCol + 1 >= totalCols) {
      logger.warn(`表「${tableName}」找不到 #配置区域# 或右侧无数据列`);
      return null;
    }

    const dataStartCol = configAreaCol + 1;

    // 查找 version_c
    let versionCRow = -1;
    let versionCCol = -1;
    for (let r = 0; r < versionRRow; r++) {
      for (let c = 0; c < totalCols; c++) {
        const val = String(allValues[r][c] ?? '').trim();
        if (val === 'version_c') {
          versionCRow = r;
          versionCCol = c;
          break;
        }
      }
      if (versionCRow >= 0) break;
    }

    // ── 行筛选 ──
    // 数据区从 versionRRow 开始，前两行是表头（字段定义行 + 描述行）
    // 数据行从 versionRRow + 2 开始
    const dataRowStart = versionRRow + 2;
    const originalDataRows = totalRows - dataRowStart;
    const dataCols = totalCols - dataStartCol;

    // 提取行版本控制区域的表头（version_r 所在行的 A 到 configAreaCol 前的列）
    const versionRowHeader: CellValue[] = [];
    for (let c = 0; c < configAreaCol; c++) {
      versionRowHeader.push(allValues[versionRRow][c] ?? null);
    }

    // 找到目标线路列索引
    const targetLineField = versionFilter.getTargetLineField();
    let targetRoadColIdx = -1;
    for (let c = 0; c < versionRowHeader.length; c++) {
      const val = String(versionRowHeader[c] || '').trim();
      if (val === targetLineField) { targetRoadColIdx = c; break; }
    }

    const excludedRows: number[] = [];
    const keptDataRowIndices: number[] = [];

    for (let r = dataRowStart; r < totalRows; r++) {
      const dataRowIdx = r - dataRowStart;

      // 版本区间检查（A列）
      const versionRangeStr = String(allValues[r][0] ?? '').trim();
      if (versionRangeStr && !versionFilter.isVersionInRange(versionRangeStr)) {
        excludedRows.push(dataRowIdx);
        continue;
      }

      // 目标线路检查
      if (targetRoadColIdx >= 0 && targetRoadColIdx < configAreaCol) {
        const targetRoadVal = allValues[r][targetRoadColIdx];
        if (!versionFilter.isLineValuePassed(targetRoadVal)) {
          excludedRows.push(dataRowIdx);
          continue;
        }
      }

      keptDataRowIndices.push(r);
    }

    // ── 列筛选 ──
    const excludedCols: number[] = [];

    if (versionCRow >= 0 && versionCCol >= 0) {
      // version_c 区域的标签（左侧列）
      const colLabels: CellValue[] = [];
      for (let r = versionCRow; r < versionRRow; r++) {
        colLabels.push(allValues[r][versionCCol] ?? null);
      }

      // version_c 数据行
      const versionColData: CellValue[][] = [];
      for (let r = versionCRow; r < versionRRow; r++) {
        const row: CellValue[] = [];
        for (let c = versionCCol + 1; c < versionCCol + 1 + dataCols; c++) {
          row.push(c < totalCols ? (allValues[r][c] ?? null) : null);
        }
        versionColData.push(row);
      }

      // 找到目标线路行索引
      let colTargetRoadRowIdx = -1;
      for (let r = 0; r < colLabels.length; r++) {
        const label = String(colLabels[r] || '').trim();
        if (label === targetLineField) { colTargetRoadRowIdx = r; break; }
      }

      // version_c 第1行（index 0）是版本区间值
      const versionRow = versionColData[0];

      for (let c = 0; c < dataCols; c++) {
        if (c >= (versionRow?.length ?? 0)) continue;

        // 版本区间检查
        const colVersionStr = String(versionRow[c] ?? '').trim();
        if (colVersionStr && !versionFilter.isVersionInRange(colVersionStr)) {
          excludedCols.push(c);
          continue;
        }

        // 目标线路检查
        if (colTargetRoadRowIdx >= 0 && colTargetRoadRowIdx < versionColData.length) {
          const targetRoadVal = versionColData[colTargetRoadRowIdx][c];
          if (!versionFilter.isLineValuePassed(targetRoadVal)) {
            excludedCols.push(c);
            continue;
          }
        }
      }
    }

    // ── 重复Key覆盖检测 ──
    // 在保留的数据行中检测重复Key
    const overriddenRows: number[] = [];
    const keptKeys: { absRow: number; dataRowIdx: number; key: string }[] = [];

    for (const absRow of keptDataRowIndices) {
      const dataRowIdx = absRow - dataRowStart;
      const key = String(allValues[absRow][dataStartCol] ?? '').trim();
      keptKeys.push({ absRow, dataRowIdx, key });
    }

    // 按顺序扫描，相同Key的前面行被覆盖
    for (let i = 0; i < keptKeys.length; i++) {
      if (!keptKeys[i].key) continue;
      for (let j = i + 1; j < keptKeys.length; j++) {
        if (keptKeys[j].key === keptKeys[i].key) {
          // i 行被 j 行覆盖
          overriddenRows.push(keptKeys[i].dataRowIdx);
          break;
        }
      }
    }

    const filteredRows = 2 + keptDataRowIndices.length - overriddenRows.length; // 2行表头 + 保留数据行 - 被覆盖行
    const filteredCols = dataCols - excludedCols.length;

    return {
      tableName,
      originalRows: originalDataRows,
      originalCols: dataCols,
      filteredRows,
      filteredCols,
      excludedRows,
      excludedCols,
      overriddenRows,
    };
  }

  /**
   * 在 Excel 中通过条件格式高亮预览结果
   * 使用标记公式（=1=1 / =2=2）识别规则，清除时按公式匹配删除
   */
  async highlightInExcel(result: PreviewResult): Promise<void> {
    // 如果该表已有高亮，先清除
    if (highlightedSheets.has(result.tableName)) {
      await this.clearHighlights(result.tableName);
    }

    await Excel.run(async (context) => {
      const sheet = context.workbook.worksheets.getItem(result.tableName);

      const usedRange = sheet.getUsedRangeOrNullObject(true);
      usedRange.load('values,rowIndex,columnIndex');
      await context.sync();

      if (usedRange.isNullObject) return;

      const allValues = usedRange.values;
      const startRow = usedRange.rowIndex;
      const startCol = usedRange.columnIndex;

      // 定位 version_r
      const versionRPos = excelHelper.findMarkerInData(allValues, 'version_r');
      if (!versionRPos) return;

      // 定位 #配置区域#
      let configAreaCol = -1;
      for (let c = 0; c < allValues[versionRPos.row].length; c++) {
        if (String(allValues[versionRPos.row][c] ?? '').trim() === '#配置区域#') {
          configAreaCol = c;
          break;
        }
      }
      if (configAreaCol === -1) return;

      const dataStartCol = configAreaCol + 1;
      const dataRowStart = versionRPos.row + 2;
      const totalCols = allValues[0]?.length || 0;
      const totalUsedRows = allValues.length;

      // 灰色背景 + 灰色字体 + 删除线：被排除的行
      for (const dataRowIdx of result.excludedRows) {
        const absRow = startRow + dataRowStart + dataRowIdx;
        const range = sheet.getRangeByIndexes(absRow, startCol, 1, totalCols);
        const cf = range.conditionalFormats.add(Excel.ConditionalFormatType.custom);
        cf.custom.rule.formula = CF_MARKER_EXCLUDED;
        cf.custom.format.fill.color = '#E0E0E0';
        cf.custom.format.font.color = '#999999';
        cf.custom.format.font.strikethrough = true;
      }

      // 黄色背景 + 删除线：被重复Key覆盖的行
      for (const dataRowIdx of result.overriddenRows) {
        const absRow = startRow + dataRowStart + dataRowIdx;
        const range = sheet.getRangeByIndexes(absRow, startCol, 1, totalCols);
        const cf = range.conditionalFormats.add(Excel.ConditionalFormatType.custom);
        cf.custom.rule.formula = CF_MARKER_OVERRIDDEN;
        cf.custom.format.fill.color = '#FFF3CD';
        cf.custom.format.font.color = '#996600';
        cf.custom.format.font.strikethrough = true;
      }

      // 灰色背景：被排除的列
      for (const colIdx of result.excludedCols) {
        const absCol = startCol + dataStartCol + colIdx;
        const range = sheet.getRangeByIndexes(startRow, absCol, totalUsedRows, 1);
        const cf = range.conditionalFormats.add(Excel.ConditionalFormatType.custom);
        cf.custom.rule.formula = CF_MARKER_EXCLUDED;
        cf.custom.format.fill.color = '#E0E0E0';
      }

      await context.sync();
    });

    highlightedSheets.add(result.tableName);
    logger.info(`已高亮表「${result.tableName}」`);
  }

  /**
   * 清除高亮：清除数据区所有条件格式
   */
  async clearHighlights(sheetName: string): Promise<void> {
    await Excel.run(async (context) => {
      const sheet = context.workbook.worksheets.getItem(sheetName);
      const usedRange = sheet.getUsedRangeOrNullObject(true);
      usedRange.load('isNullObject');
      await context.sync();
      if (usedRange.isNullObject) return;

      usedRange.conditionalFormats.clearAll();
      await context.sync();
    });

    highlightedSheets.delete(sheetName);
    logger.info(`已清除表「${sheetName}」的预览高亮`);
  }

  /**
   * 确定输出线路字段名
   */
  private determineLineField(versionName: string, config: Config): string {
    const vt = config.versionTemplates.get(versionName);
    if (!vt) return 'roads_0';
    return vt.lineField || 'roads_0';
  }
}
