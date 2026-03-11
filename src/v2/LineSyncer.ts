/* global Excel */

import { VersionTemplate } from '../types/config';
import { excelHelper } from '../utils/ExcelHelper';
import { logger } from '../utils/Logger';

/**
 * LineSyncer — 线路同步器
 *
 * 三阶段同步：
 * 1. version_r 列同步：整列增删，使 roads 列与配置一致
 * 2. version_c 行同步：整行增删，使 roads 行与配置一致（仅 R+C 模式）
 * 3. 版本名同步：更新 version_r 描述行 + version_c 标签列
 *
 * 每个阶段完成后 reload 快照，确保位置信息准确。
 */
export class LineSyncer {
  async syncAllTables(
    versionTemplates: Map<string, VersionTemplate>,
    tableSheetNames: string[]
  ): Promise<{ synced: number; skipped: number; errors: string[] }> {
    // 收集所有需要的 roads（含 roads_0），跳过无效的 lineField
    const requiredRoads = new Set<string>();
    requiredRoads.add('roads_0');
    for (const vt of versionTemplates.values()) {
      if (vt.lineField && vt.lineField.startsWith('roads_')) {
        requiredRoads.add(vt.lineField);
      }
    }
    const sortedRoads = Array.from(requiredRoads).sort((a, b) => {
      return parseInt(a.replace('roads_', '')) - parseInt(b.replace('roads_', ''));
    });

    // roads → 版本名 映射
    const roadsToName = new Map<string, string>();
    roadsToName.set('roads_0', '默认');
    for (const vt of versionTemplates.values()) {
      if (vt.lineField && vt.lineField.startsWith('roads_') && vt.lineField !== 'roads_0') {
        roadsToName.set(vt.lineField, vt.name);
      }
    }

    let synced = 0;
    const errors: string[] = [];

    for (const sheetName of tableSheetNames) {
      try {
        await this.syncSingleTable(sheetName, sortedRoads, roadsToName);
        synced++;
      } catch (err) {
        errors.push(sheetName);
        logger.error(`同步线路失败「${sheetName}」: ${err}`);
      }
    }

    logger.info(`线路同步完成: 同步 ${synced}, 失败 ${errors.length}`);
    return { synced, skipped: 0, errors };
  }

  private async syncSingleTable(
    sheetName: string,
    requiredRoads: string[],
    roadsToName: Map<string, string>
  ): Promise<void> {
    await Excel.run(async (context) => {
      const sheetObj = context.workbook.worksheets.getItemOrNullObject(sheetName);
      sheetObj.load('isNullObject');
      await context.sync();
      if (sheetObj.isNullObject) {
        logger.warn(`工作表「${sheetName}」不存在，跳过同步`);
        return;
      }
      const sheet = sheetObj;

      // ════════════════════════════════════════════════════
      // 第一阶段：version_r 列同步（整列增删）
      // ════════════════════════════════════════════════════
      let snap = await excelHelper.loadSheetSnapshot(context, sheetName);
      if (!snap || snap.values.length === 0) return;

      let vrPos = this.findMarker(snap.values, 'version_r');
      if (!vrPos) return;

      // 1a. 收集 version_r 行现有的 roads 列
      const existingCols = this.collectRoadsCols(snap.values, vrPos);

      // 1b. 删除多余的列（从右往左，整列删除）
      const extraFields = Array.from(existingCols.keys()).filter(f => !requiredRoads.includes(f));
      if (extraFields.length > 0) {
        const cols = extraFields.map(f => existingCols.get(f)!).sort((a, b) => b - a);
        for (const c of cols) {
          sheet.getRangeByIndexes(0, c + snap.startCol, 1, 1).getEntireColumn().delete(Excel.DeleteShiftDirection.left);
        }
        await context.sync();
        logger.info(`表「${sheetName}」删除 ${extraFields.length} 列: ${extraFields.join(', ')}`);
      }

      // 1c. 添加缺失的列（整列插入）
      // 先 reload 拿到删除后的最新位置
      if (extraFields.length > 0) {
        snap = await excelHelper.loadSheetSnapshot(context, sheetName);
        if (!snap) return;
        vrPos = this.findMarker(snap.values, 'version_r');
        if (!vrPos) return;
      }

      const currentCols = this.collectRoadsCols(snap.values, vrPos);
      const missingFields = requiredRoads.filter(f => !currentCols.has(f));

      if (missingFields.length > 0) {
        // 找 roads_0 列用于复制默认值
        const roads0Col = currentCols.get('roads_0');
        // 找最后一个 roads 列的位置
        let lastRoadCol = vrPos.col;
        for (const c of currentCols.values()) {
          if (c > lastRoadCol) lastRoadCol = c;
        }
        const insertCol = lastRoadCol + 1;
        const N = missingFields.length;

        // 批量插入 N 个整列（与行处理方式一致）
        sheet.getRangeByIndexes(0, insertCol + snap.startCol, 1, N)
          .getEntireColumn().insert(Excel.InsertShiftDirection.right);

        // 插入后，新列位于 insertCol ~ insertCol+N-1（绝对位置）
        // 直接写入字段名和数据，无需 reload 扫描空列
        const descRow = vrPos.row + 1;
        for (let i = 0; i < N; i++) {
          const field = missingFields[i];
          const absCol = insertCol + i + snap.startCol;

          // 写入字段名到 version_r 行
          sheet.getRangeByIndexes(vrPos.row + snap.startRow, absCol, 1, 1).values = [[field]];

          // 写入版本名到描述行
          if (descRow < snap.values.length) {
            const name = roadsToName.get(field) || '';
            sheet.getRangeByIndexes(descRow + snap.startRow, absCol, 1, 1).values = [[name]];
          }
        }

        // 批量复制 roads_0 数据列到所有新列
        if (roads0Col !== undefined) {
          const dataStartRow = descRow + 1;
          if (dataStartRow < snap.values.length) {
            for (let i = 0; i < N; i++) {
              const absCol = insertCol + i + snap.startCol;
              const colData: unknown[][] = [];
              for (let r = dataStartRow; r < snap.values.length; r++) {
                colData.push([snap.values[r]?.[roads0Col] ?? null]);
              }
              sheet.getRangeByIndexes(dataStartRow + snap.startRow, absCol, colData.length, 1).values = colData;
            }
          }
        }

        await context.sync();
        logger.info(`表「${sheetName}」添加 ${N} 列: ${missingFields.join(', ')}`);
      }

      // ════════════════════════════════════════════════════
      // 第二阶段：version_c 行同步（整行增删）
      // ════════════════════════════════════════════════════
      // 全新 reload
      snap = await excelHelper.loadSheetSnapshot(context, sheetName);
      if (!snap) return;
      vrPos = this.findMarker(snap.values, 'version_r');
      if (!vrPos) return;
      let vcPos = this.findMarker(snap.values, 'version_c');
      if (!vcPos) {
        // 没有 version_c，跳过第二阶段
      } else {
        // 收集 version_c 区域中现有的 roads 行
        const existingRows = this.collectRoadsRows(snap.values, vcPos, vrPos);

        if (existingRows.size > 0) {
          // 有 roads 行 → R+C 模式，需要同步

          // 2a. 删除多余的 roads 行（从下往上，整行删除）
          const extraRowFields = Array.from(existingRows.keys()).filter(f => !requiredRoads.includes(f));
          if (extraRowFields.length > 0) {
            const rows = extraRowFields.map(f => existingRows.get(f)!).sort((a, b) => b - a);
            for (const r of rows) {
              sheet.getRangeByIndexes(r + snap.startRow, 0, 1, 1).getEntireRow().delete(Excel.DeleteShiftDirection.up);
            }
            await context.sync();
            logger.info(`表「${sheetName}」删除 ${extraRowFields.length} 行: ${extraRowFields.join(', ')}`);
          }

          // 2b. 添加缺失的 roads 行
          // reload 拿最新位置
          snap = await excelHelper.loadSheetSnapshot(context, sheetName);
          if (!snap) return;
          vrPos = this.findMarker(snap.values, 'version_r');
          vcPos = this.findMarker(snap.values, 'version_c');
          if (!vrPos || !vcPos) return;

          const currentRows = this.collectRoadsRows(snap.values, vcPos, vrPos);
          const missingRowFields = requiredRoads.filter(f => !currentRows.has(f));

          if (missingRowFields.length > 0) {
            // 找最后一个 roads 行
            let lastRoadRow = vcPos.row;
            for (const r of currentRows.values()) {
              if (r > lastRoadRow) lastRoadRow = r;
            }
            const insertRow = lastRoadRow + 1;

            // 整行插入
            sheet.getRangeByIndexes(insertRow + snap.startRow, 0, missingRowFields.length, 1)
              .getEntireRow().insert(Excel.InsertShiftDirection.down);
            await context.sync();

            // reload 后写入数据
            snap = await excelHelper.loadSheetSnapshot(context, sheetName);
            if (!snap) return;
            vrPos = this.findMarker(snap.values, 'version_r');
            vcPos = this.findMarker(snap.values, 'version_c');
            if (!vrPos || !vcPos) return;

            // 从 version_r 行的 #配置区域# 后统计实际数据字段数（可靠源，不受 vc 表头污染）
            let cfgCol = -1;
            for (let c = 0; c < (snap.values[vrPos.row]?.length || 0); c++) {
              if (String(snap.values[vrPos.row][c] ?? '').trim() === '#配置区域#') { cfgCol = c; break; }
            }
            let vcDataCols = 0;
            if (cfgCol >= 0) {
              for (let c = cfgCol + 1; c < (snap.values[vrPos.row]?.length || 0); c++) {
                const v = snap.values[vrPos.row]?.[c];
                if (v == null || String(v).trim() === '') break;
                vcDataCols++;
              }
            }
            const vcDataStart = vcPos.col + 1;
            const labelCol = vcPos.col - 1;

            // 写入新行数据
            for (let i = 0; i < missingRowFields.length; i++) {
              const field = missingRowFields[i];
              const absRow = (insertRow + i) + snap.startRow;

              // 写入 roads 字段名（version_c 同列）
              sheet.getRangeByIndexes(absRow, vcPos.col + snap.startCol, 1, 1).values = [[field]];

              // 写入版本名标签（version_c 左一列）
              if (labelCol >= 0) {
                const name = roadsToName.get(field) || '';
                if (name) {
                  sheet.getRangeByIndexes(absRow, labelCol + snap.startCol, 1, 1).values = [[name]];
                }
              }

              // 数据列默认值 1（从 version_c 字段列后一列开始，列数与表头行一致）
              if (vcDataCols > 0) {
                const defaults = Array.from({ length: vcDataCols }, () => 1);
                sheet.getRangeByIndexes(absRow, vcDataStart + snap.startCol, 1, vcDataCols).values = [defaults];
              }
            }
            await context.sync();
            logger.info(`表「${sheetName}」添加 ${missingRowFields.length} 行: ${missingRowFields.join(', ')}`);
          }
        }
      }

      // ════════════════════════════════════════════════════
      // 第三阶段：同步版本名（全新 reload）
      // ════════════════════════════════════════════════════
      snap = await excelHelper.loadSheetSnapshot(context, sheetName);
      if (!snap) return;
      vrPos = this.findMarker(snap.values, 'version_r');
      if (!vrPos) return;

      let changed = false;

      // 3a. version_r 描述行版本名
      const descRow = vrPos.row + 1;
      if (descRow < snap.values.length) {
        for (let c = vrPos.col + 1; c < (snap.values[vrPos.row]?.length || 0); c++) {
          const field = String(snap.values[vrPos.row][c] ?? '').trim();
          if (!field.startsWith('roads_')) {
            if (field === '' || field === '#配置区域#') break;
            continue;
          }
          const expected = roadsToName.get(field);
          if (!expected) continue;
          const current = String(snap.values[descRow]?.[c] ?? '').trim();
          if (current !== expected) {
            sheet.getRangeByIndexes(descRow + snap.startRow, c + snap.startCol, 1, 1).values = [[expected]];
            changed = true;
          }
        }
      }

      // 3b. version_c 标签列版本名
      vcPos = this.findMarker(snap.values, 'version_c');
      if (vcPos && vcPos.col > 0) {
        const labelCol = vcPos.col - 1;
        for (let r = vcPos.row + 1; r < vrPos.row; r++) {
          const field = String(snap.values[r]?.[vcPos.col] ?? '').trim();
          if (!field.startsWith('roads_')) continue;
          const expected = roadsToName.get(field);
          if (!expected) continue;
          const current = String(snap.values[r]?.[labelCol] ?? '').trim();
          if (current !== expected) {
            sheet.getRangeByIndexes(r + snap.startRow, labelCol + snap.startCol, 1, 1).values = [[expected]];
            changed = true;
          }
        }
      }

      if (changed) {
        await context.sync();
        logger.info(`表「${sheetName}」已同步版本名`);
      }
    });
  }

  // ─── 工具方法 ───────────────────────────────────────────

  /** 在 version_r 行中收集 roads 列：field → colIndex */
  private collectRoadsCols(
    data: (string | number | boolean | null)[][],
    vrPos: { row: number; col: number }
  ): Map<string, number> {
    const map = new Map<string, number>();
    for (let c = vrPos.col + 1; c < (data[vrPos.row]?.length || 0); c++) {
      const v = String(data[vrPos.row][c] ?? '').trim();
      if (v.startsWith('roads_')) {
        map.set(v, c);
      } else if (v === '' || v === '#配置区域#') {
        break;
      }
    }
    return map;
  }

  /** 在 version_c 和 version_r 之间收集 roads 行：field → rowIndex */
  private collectRoadsRows(
    data: (string | number | boolean | null)[][],
    vcPos: { row: number; col: number },
    vrPos: { row: number; col: number }
  ): Map<string, number> {
    const map = new Map<string, number>();
    for (let r = vcPos.row + 1; r < vrPos.row; r++) {
      const v = String(data[r]?.[vcPos.col] ?? '').trim();
      if (v.startsWith('roads_')) {
        map.set(v, r);
      }
    }
    return map;
  }

  /** 查找标记文字位置（前30行） */
  private findMarker(
    data: (string | number | boolean | null)[][],
    marker: string
  ): { row: number; col: number } | null {
    const colLimit = marker === 'version_r' ? 5 : undefined; // version_r 在前几列，version_c 可能在较远列
    for (let r = 0; r < Math.min(data.length, 30); r++) {
      const limit = colLimit ?? (data[r]?.length || 0);
      for (let c = 0; c < limit; c++) {
        if (String(data[r]?.[c] ?? '').trim() === marker) {
          return { row: r, col: c };
        }
      }
    }
    return null;
  }
}

export const lineSyncer = new LineSyncer();
