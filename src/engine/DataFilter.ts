import { InMemoryTableData, FilteredResult, CellValue } from '../types/table';
import { VersionFilter } from './VersionFilter';
import { logger } from '../utils/Logger';

export class DataFilter {
  private versionFilter: VersionFilter;

  constructor(versionFilter: VersionFilter) {
    this.versionFilter = versionFilter;
  }

  /**
   * 对加载到内存的表数据执行行列筛选和重复Key处理
   */
  applyFilters(tableData: InMemoryTableData): FilteredResult {
    const { mainData, versionRowData, versionColData } = tableData;

    if (!mainData || mainData.length < 2) {
      return { data: [], rowCount: 0, colCount: 0, shouldOutput: false };
    }

    // 第1步：行版本筛选
    const rowMask = this.filterRows(mainData, versionRowData);

    // 第2步：列版本筛选
    const colMask = this.filterColumns(mainData, versionColData);

    // 第3步：应用筛选掩码
    const filteredData = this.applyMasks(mainData, rowMask, colMask);

    if (filteredData.length === 0 || (filteredData.length > 0 && filteredData[0].length === 0)) {
      return { data: [], rowCount: 0, colCount: 0, shouldOutput: false };
    }

    // 第4步：重复Key处理
    const deduped = this.deduplicateKeys(filteredData);

    return {
      data: deduped,
      rowCount: deduped.length,
      colCount: deduped[0]?.length || 0,
      shouldOutput: deduped.length > 2, // 至少要有2行表头+1行数据
    };
  }

  /**
   * 行版本筛选
   * 前2行（字段定义行+中文描述行）始终保留
   * 从第3行起（数据行），检查版本区间和线路
   */
  private filterRows(
    mainData: CellValue[][],
    versionRowData: CellValue[][] | null
  ): boolean[] {
    const rowCount = mainData.length;
    const mask = new Array<boolean>(rowCount).fill(true);

    if (!versionRowData || versionRowData.length === 0) {
      return mask;
    }

    const targetLineField = this.versionFilter.getTargetLineField();

    // 找到 version_r 行中各线路列的索引
    const headerRow = versionRowData[0];
    let roads0ColIdx = -1;
    let targetRoadColIdx = -1;

    for (let c = 0; c < headerRow.length; c++) {
      const val = String(headerRow[c] || '').trim();
      if (val === 'roads_0') roads0ColIdx = c;
      if (val === targetLineField) targetRoadColIdx = c;
    }

    // 从第3行起（index=2）执行筛选
    for (let r = 2; r < rowCount; r++) {
      if (r >= versionRowData.length) break;

      const vRow = versionRowData[r];

      // 条件1：版本区间检查（A列 = version_r 列）
      const versionRangeStr = String(vRow[0] || '').trim();
      if (versionRangeStr && !this.versionFilter.isVersionInRange(versionRangeStr)) {
        mask[r] = false;
        continue;
      }

      // 条件2：roads_0（总线路）检查
      if (roads0ColIdx >= 0 && roads0ColIdx < vRow.length) {
        if (!this.versionFilter.isLineValuePassed(vRow[roads0ColIdx])) {
          mask[r] = false;
          continue;
        }
      }

      // 条件3：目标线路检查（仅当非 roads_0 时）
      if (targetLineField !== 'roads_0' && targetRoadColIdx >= 0 && targetRoadColIdx < vRow.length) {
        if (!this.versionFilter.isLineValuePassed(vRow[targetRoadColIdx])) {
          mask[r] = false;
          continue;
        }
      }
    }

    return mask;
  }

  /**
   * 列版本筛选
   * 仅当存在 version_c 数据时执行
   */
  private filterColumns(
    mainData: CellValue[][],
    versionColData: CellValue[][] | null
  ): boolean[] {
    if (!mainData[0]) return [];
    const colCount = mainData[0].length;
    const mask = new Array<boolean>(colCount).fill(true);

    if (!versionColData || versionColData.length === 0) {
      return mask;
    }

    const targetLineField = this.versionFilter.getTargetLineField();

    // version_c 第1行是版本区间值
    // 后续行可能是线路控制值
    const versionRow = versionColData[0];

    // 查找线路行的索引（如果有多行）
    let roads0RowIdx = -1;
    let targetRoadRowIdx = -1;

    if (versionColData.length > 1) {
      // version_c 下方的行头部可能包含线路标识
      // 这里需要从 versionRowData 的同列读取线路名，但 version_c 的行结构可能不同
      // 简化处理：假设 version_c 的第2行起与行版本控制的线路列对称
      for (let r = 1; r < versionColData.length; r++) {
        // 需要额外的上下文来确定线路行，暂用位置推断
        // 实际实现中，线路行的标识在 version_c 左侧列
        if (r === 1) roads0RowIdx = r;
        if (r === 2) targetRoadRowIdx = r;
      }
    }

    for (let c = 0; c < colCount; c++) {
      if (c >= versionRow.length) continue;

      // 条件1：版本区间检查
      const colVersionStr = String(versionRow[c] || '').trim();
      if (colVersionStr && !this.versionFilter.isVersionInRange(colVersionStr)) {
        mask[c] = false;
        continue;
      }

      // 条件2：roads_0 检查
      if (roads0RowIdx >= 0 && roads0RowIdx < versionColData.length) {
        const roads0Val = versionColData[roads0RowIdx][c];
        if (!this.versionFilter.isLineValuePassed(roads0Val)) {
          mask[c] = false;
          continue;
        }
      }

      // 条件3：目标线路检查 (修正VBA bug: 使用 includeCol 而非 includeRow)
      if (targetLineField !== 'roads_0' && targetRoadRowIdx >= 0 && targetRoadRowIdx < versionColData.length) {
        const targetRoadVal = versionColData[targetRoadRowIdx][c];
        if (!this.versionFilter.isLineValuePassed(targetRoadVal)) {
          mask[c] = false;
          continue;
        }
      }
    }

    return mask;
  }

  /**
   * 应用行列筛选掩码，生成筛选后的数据
   */
  private applyMasks(
    mainData: CellValue[][],
    rowMask: boolean[],
    colMask: boolean[]
  ): CellValue[][] {
    const result: CellValue[][] = [];

    for (let r = 0; r < mainData.length; r++) {
      if (!rowMask[r]) continue;

      const newRow: CellValue[] = [];
      for (let c = 0; c < mainData[r].length; c++) {
        if (colMask.length === 0 || colMask[c]) {
          newRow.push(mainData[r][c]);
        }
      }
      result.push(newRow);
    }

    return result;
  }

  /**
   * 重复Key处理
   * 第1列为Key，从第3行起（跳过2行表头）
   * 如果当前行Key与前一行相同，用当前行覆盖前一行
   */
  private deduplicateKeys(data: CellValue[][]): CellValue[][] {
    if (data.length <= 2) return data;

    // 保留表头
    const result: CellValue[][] = [data[0], data[1]];

    for (let i = 2; i < data.length; i++) {
      const currentKey = String(data[i][0] || '').trim();
      const prevKey = result.length > 2
        ? String(result[result.length - 1][0] || '').trim()
        : '';

      if (currentKey && currentKey === prevKey) {
        // 覆盖前一行
        result[result.length - 1] = data[i];
      } else {
        result.push(data[i]);
      }
    }

    return result;
  }
}
