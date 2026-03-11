/* global Excel */

import { VersionTemplate } from '../types/config';
import { excelHelper } from '../utils/ExcelHelper';
import { logger } from '../utils/Logger';

/**
 * LineSyncer — 线路同步器
 *
 * 当版本模板变更（新增/删除版本）时，
 * 批量为所有拥有 version_r 的数据表补充或清理线路列。
 * 新线路列的配置值默认复制 roads_0（默认线路）。
 * 同时同步版本名到 version_r 下方的描述行。
 */
export class LineSyncer {
  /**
   * 同步所有数据表的线路列
   * @param versionTemplates 当前所有版本模板
   * @param tableSheetNames 所有需要同步的数据表中文名
   * @returns 同步结果: { synced: 成功数, skipped: 跳过数, errors: 失败表名[] }
   */
  async syncAllTables(
    versionTemplates: Map<string, VersionTemplate>,
    tableSheetNames: string[]
  ): Promise<{ synced: number; skipped: number; errors: string[] }> {
    // 收集所有需要的 roads 字段
    const requiredRoads = new Set<string>();
    requiredRoads.add('roads_0'); // 默认线路始终存在
    for (const vt of versionTemplates.values()) {
      requiredRoads.add(vt.lineField);
    }
    const sortedRoads = Array.from(requiredRoads).sort((a, b) => {
      const na = parseInt(a.replace('roads_', ''));
      const nb = parseInt(b.replace('roads_', ''));
      return na - nb;
    });

    // 构建 roads → 版本名 映射
    const roadsToVersionName = new Map<string, string>();
    roadsToVersionName.set('roads_0', '默认'); // roads_0 固定描述为"默认"
    for (const vt of versionTemplates.values()) {
      if (vt.lineField !== 'roads_0') {
        roadsToVersionName.set(vt.lineField, vt.name);
      }
    }

    let synced = 0;
    const errors: string[] = [];

    for (const sheetName of tableSheetNames) {
      try {
        await this.syncSingleTable(sheetName, sortedRoads, roadsToVersionName);
        synced++;
      } catch (err) {
        errors.push(sheetName);
        logger.error(`同步线路失败「${sheetName}」: ${err}`);
      }
    }

    logger.info(`线路同步完成: 同步 ${synced}, 失败 ${errors.length}`);
    return { synced, skipped: 0, errors };
  }

  /**
   * 同步单张表的线路列
   * @returns true=有变更, false=无需变更(跳过)
   */
  private async syncSingleTable(
    sheetName: string,
    requiredRoads: string[],
    roadsToVersionName: Map<string, string>
  ): Promise<void> {
    await Excel.run(async (context) => {
      let snap = await excelHelper.loadSheetSnapshot(context, sheetName);
      if (!snap || snap.values.length === 0) {
        logger.info(`表「${sheetName}」快照为空`);
        return;
      }

      let vrPos = this.findVersionR(snap.values);
      if (!vrPos) {
        logger.info(`表「${sheetName}」无 version_r`);
        return;
      }

      const vrRow = vrPos.row;
      const vrCol = vrPos.col;

      // 收集现有线路列: { fieldName → colIndex }
      const existingRoads = new Map<string, number>();
      for (let c = vrCol + 1; c < (snap.values[vrRow]?.length || 0); c++) {
        const cellVal = String(snap.values[vrRow][c] ?? '').trim();
        if (cellVal.startsWith('roads_')) {
          existingRoads.set(cellVal, c);
        } else if (cellVal === '' || cellVal === '#配置区域#') {
          break;
        }
      }

      // 找出缺失的线路和多余的线路
      const missingRoads = requiredRoads.filter(r => !existingRoads.has(r));
      const extraRoads = Array.from(existingRoads.keys()).filter(r => !requiredRoads.includes(r));

      const hasColumnChanges = missingRoads.length > 0 || extraRoads.length > 0;
      const sheet = context.workbook.worksheets.getItem(sheetName);

      // ── 第一步：删除多余的线路列（从右往左删，避免索引偏移）──
      if (extraRoads.length > 0) {
        const extraCols = extraRoads
          .map(r => existingRoads.get(r)!)
          .sort((a, b) => b - a); // 从右往左

        for (const col of extraCols) {
          const absCol = col + snap.startCol;
          const colRange = sheet.getRangeByIndexes(0, absCol, 1, 1).getEntireColumn();
          colRange.delete(Excel.DeleteShiftDirection.left);
        }

        await context.sync();
        logger.info(`表「${sheetName}」已删除 ${extraRoads.length} 条多余线路: ${extraRoads.join(', ')}`);
      }

      // ── 第二步：添加缺失的线路列 ──
      if (missingRoads.length > 0) {
        // 删除列后需要重新加载快照
        const snap2 = await excelHelper.loadSheetSnapshot(context, sheetName);
        if (!snap2 || snap2.values.length === 0) return;

        const vrPos2 = this.findVersionR(snap2.values);
        if (!vrPos2) return;

        // 获取 roads_0 的列索引，用于复制默认值
        let roads0Col: number | undefined;
        let lastRoadCol = vrPos2.col;
        for (let c = vrPos2.col + 1; c < (snap2.values[vrPos2.row]?.length || 0); c++) {
          const cellVal = String(snap2.values[vrPos2.row][c] ?? '').trim();
          if (cellVal.startsWith('roads_')) {
            if (cellVal === 'roads_0') roads0Col = c;
            lastRoadCol = c;
          } else if (cellVal === '' || cellVal === '#配置区域#') {
            break;
          }
        }

        if (roads0Col === undefined) {
          logger.warn(`表「${sheetName}」缺少 roads_0 列，跳过添加`);
          return;
        }

        // 获取 roads_0 的所有行值
        const roads0Values: (string | number | boolean | null)[] = [];
        for (let r = 0; r < snap2.values.length; r++) {
          roads0Values.push(snap2.values[r]?.[roads0Col] ?? null);
        }

        const insertStartCol = lastRoadCol + 1;

        // 插入新列
        for (let i = 0; i < missingRoads.length; i++) {
          const absCol = insertStartCol + i + snap2.startCol;
          const insertRange = sheet.getRangeByIndexes(0, absCol, 1, 1).getEntireColumn();
          insertRange.insert(Excel.InsertShiftDirection.right);
        }
        await context.sync();

        // 重新加载快照写入数据
        const snap3 = await excelHelper.loadSheetSnapshot(context, sheetName);
        if (!snap3) return;

        const vrPos3 = this.findVersionR(snap3.values);
        if (!vrPos3) return;

        const descRow3 = vrPos3.row + 1;

        for (let i = 0; i < missingRoads.length; i++) {
          const roadField = missingRoads[i];
          const absCol = (insertStartCol + i) + snap3.startCol;

          // 写入线路字段名
          sheet.getRangeByIndexes(vrPos3.row + snap3.startRow, absCol, 1, 1).values = [[roadField]];

          // 写入描述行（版本名）
          if (descRow3 < snap3.values.length) {
            const versionName = roadsToVersionName.get(roadField) || roads0Values[descRow3] || '';
            sheet.getRangeByIndexes(descRow3 + snap3.startRow, absCol, 1, 1).values = [[versionName]];
          }

          // 复制 roads_0 的数据行值
          for (let r = descRow3 + 1; r < roads0Values.length; r++) {
            const val = roads0Values[r];
            if (val == null || String(val).trim() === '') continue;
            sheet.getRangeByIndexes(r + snap3.startRow, absCol, 1, 1).values = [[val]];
          }
        }

        await context.sync();
        logger.info(`表「${sheetName}」已添加 ${missingRoads.length} 条线路: ${missingRoads.join(', ')}`);
      }

      // ── 第三步：同步所有线路列的版本名到描述行 ──
      // 无论是否有列变更，都更新版本名
      if (hasColumnChanges) {
        // 列结构变了，需要重新加载
        snap = await excelHelper.loadSheetSnapshot(context, sheetName);
        if (!snap) return;
        vrPos = this.findVersionR(snap.values);
        if (!vrPos) return;
      }

      const descRow = vrPos.row + 1;
      let namesSynced = false;

      // 3a. 同步 version_r 描述行的版本名
      if (descRow < snap.values.length) {
        for (let c = vrPos.col + 1; c < (snap.values[vrPos.row]?.length || 0); c++) {
          const cellVal = String(snap.values[vrPos.row][c] ?? '').trim();
          if (!cellVal.startsWith('roads_')) {
            if (cellVal === '' || cellVal === '#配置区域#') break;
            continue;
          }
          const expectedName = roadsToVersionName.get(cellVal);
          if (!expectedName) continue;
          const currentVal = String(snap.values[descRow]?.[c] ?? '').trim();
          if (currentVal !== expectedName) {
            sheet.getRangeByIndexes(descRow + snap.startRow, c + snap.startCol, 1, 1).values = [[expectedName]];
            namesSynced = true;
          }
        }
      }

      // 3b. 同步 version_c 区域
      let vcPos = this.findVersionC(snap.values);
      if (vcPos) {
        const labelCol = vcPos.col - 1; // 版本名写在 version_c 列的左边一列

        // 收集 version_c 区域中现有的 roads 行
        const existingVCRoads = new Map<string, number>(); // roadField → row
        for (let r = vcPos.row + 1; r < vrPos.row; r++) {
          const roadField = String(snap.values[r]?.[vcPos.col] ?? '').trim();
          if (roadField.startsWith('roads_')) {
            existingVCRoads.set(roadField, r);
          }
        }
        const hasRoadsRows = existingVCRoads.size > 0;

        if (hasRoadsRows) {
          // R+C 模式：同步 roads 行（增删 + 更新版本名标签）

          // 删除多余的 roads 行（从下往上删）
          const extraVCRoads = Array.from(existingVCRoads.keys()).filter(r => !requiredRoads.includes(r));
          if (extraVCRoads.length > 0) {
            const extraRows = extraVCRoads
              .map(r => existingVCRoads.get(r)!)
              .sort((a, b) => b - a);
            for (const row of extraRows) {
              sheet.getRangeByIndexes(row + snap.startRow, 0, 1, 1).getEntireRow().delete(Excel.DeleteShiftDirection.up);
            }
            await context.sync();
          }

          // 添加缺失的 roads 行
          const missingVCRoads = requiredRoads.filter(r => r !== 'roads_0' || existingVCRoads.has(r))
            .filter(r => !existingVCRoads.has(r));
          if (missingVCRoads.length > 0) {
            // 重新加载快照
            snap = await excelHelper.loadSheetSnapshot(context, sheetName);
            if (!snap) return;
            vrPos = this.findVersionR(snap.values);
            vcPos = this.findVersionC(snap.values);
            if (!vrPos || !vcPos) return;

            // 找到 #配置区域# 列以确定数据列范围
            let cfgCol = -1;
            for (let c = 0; c < (snap.values[vrPos.row]?.length || 0); c++) {
              if (String(snap.values[vrPos.row][c] ?? '').trim() === '#配置区域#') { cfgCol = c; break; }
            }
            const dataStart = cfgCol >= 0 ? cfgCol + 1 : -1;
            const dataCols = dataStart >= 0 ? Math.max(0, (snap.values[vrPos.row]?.length || 0) - dataStart) : 0;

            // 在最后一个 roads 行的下方插入
            let lastRoadRow = vcPos.row; // 至少从 version_c 行开始
            for (let r = vcPos.row + 1; r < vrPos.row; r++) {
              const v = String(snap.values[r]?.[vcPos.col] ?? '').trim();
              if (v.startsWith('roads_')) lastRoadRow = r;
            }
            const insertAbsRow = lastRoadRow + 1 + snap.startRow;
            sheet.getRangeByIndexes(insertAbsRow, 0, missingVCRoads.length, 1).getEntireRow().insert(Excel.InsertShiftDirection.down);
            await context.sync();
            for (let i = 0; i < missingVCRoads.length; i++) {
              const roadField = missingVCRoads[i];
              const rowAbs = insertAbsRow + i;
              sheet.getRangeByIndexes(rowAbs, vcPos.col + snap.startCol, 1, 1).values = [[roadField]];
              const vName = roadsToVersionName.get(roadField) || '';
              if (vName && labelCol >= 0) {
                sheet.getRangeByIndexes(rowAbs, labelCol + snap.startCol, 1, 1).values = [[vName]];
              }
              // 数据列默认值 1
              if (dataCols > 0) {
                const defaults = Array.from({ length: dataCols }, () => 1);
                sheet.getRangeByIndexes(rowAbs, dataStart + snap.startCol, 1, dataCols).values = [defaults];
              }
            }
            await context.sync();
          }

          // 重新加载后更新所有 roads 行的版本名标签
          snap = await excelHelper.loadSheetSnapshot(context, sheetName);
          if (!snap) return true;
          vrPos = this.findVersionR(snap.values);
          vcPos = this.findVersionC(snap.values);
          if (!vrPos || !vcPos) return true;

          if (labelCol >= 0) {
            for (let r = vcPos.row + 1; r < vrPos.row; r++) {
              const roadField = String(snap.values[r]?.[vcPos.col] ?? '').trim();
              if (!roadField.startsWith('roads_')) continue;
              const expectedName = roadsToVersionName.get(roadField);
              if (!expectedName) continue;
              const currentLabel = String(snap.values[r]?.[vcPos.col - 1] ?? '').trim();
              if (currentLabel !== expectedName) {
                sheet.getRangeByIndexes(r + snap.startRow, (vcPos.col - 1) + snap.startCol, 1, 1).values = [[expectedName]];
                namesSynced = true;
              }
            }
          }
        }
      }

      if (namesSynced) {
        await context.sync();
        logger.info(`表「${sheetName}」已同步版本名`);
      }

    });
  }

  /**
   * 在数据中查找 version_r 位置
   */
  private findVersionR(data: (string | number | boolean | null)[][]): { row: number; col: number } | null {
    for (let r = 0; r < Math.min(data.length, 30); r++) {
      for (let c = 0; c < Math.min(data[r]?.length || 0, 5); c++) {
        if (String(data[r][c] ?? '').trim() === 'version_r') {
          return { row: r, col: c };
        }
      }
    }
    return null;
  }

  /**
   * 在数据中查找 version_c 位置
   */
  private findVersionC(data: (string | number | boolean | null)[][]): { row: number; col: number } | null {
    for (let r = 0; r < Math.min(data.length, 30); r++) {
      const colLimit = data[r]?.length || 0;
      for (let c = 0; c < colLimit; c++) {
        if (String(data[r][c] ?? '').trim() === 'version_c') {
          return { row: r, col: c };
        }
      }
    }
    return null;
  }
}

export const lineSyncer = new LineSyncer();
