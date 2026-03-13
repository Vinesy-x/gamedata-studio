import ExcelJS from 'exceljs';
import { CellValue } from '../types/table';
import { Config } from '../types/config';
import { logger } from '../utils/Logger';

/** 哈希清单条目：支持旧格式(纯字符串)和新格式(含行数) */
export type HashManifestEntry = string | { hash: string; rows: number };

/** 哈希清单：记录每张表的数据哈希 */
export interface HashManifest {
  [englishName: string]: HashManifestEntry;
}

/** 从清单条目中提取哈希值（兼容旧格式） */
export function getManifestHash(entry: HashManifestEntry): string {
  return typeof entry === 'string' ? entry : entry.hash;
}

/** 从清单条目中提取行数（旧格式返回 0） */
export function getManifestRows(entry: HashManifestEntry): number {
  return typeof entry === 'string' ? 0 : entry.rows;
}

export class ExportWriter {
  /**
   * 计算表数据的哈希值（简单高效的 djb2 字符串哈希）
   * 将二维数组序列化后计算哈希，用于快速判断数据是否变更
   */
  computeDataHash(filteredData: CellValue[][]): string {
    let hash = 5381;
    for (let r = 0; r < filteredData.length; r++) {
      for (let c = 0; c < filteredData[r].length; c++) {
        const str = String(filteredData[r][c] ?? '');
        for (let i = 0; i < str.length; i++) {
          hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
        }
        hash = ((hash << 5) + hash + 0x1f) | 0; // cell separator
      }
      hash = ((hash << 5) + hash + 0x1e) | 0; // row separator
    }
    // 转为16进制无符号字符串
    return (hash >>> 0).toString(16).padStart(8, '0');
  }

  /**
   * 基于哈希清单判断数据是否有变更
   */
  hasDataChanged(
    filteredData: CellValue[][],
    manifest: HashManifest,
    englishName: string
  ): boolean {
    // GameConfig 总是判定为变更（含动态版本号注入）
    if (englishName === 'GameConfig') return true;

    const oldEntry = manifest[englishName];
    if (!oldEntry) return true;

    const oldHash = getManifestHash(oldEntry);
    const newHash = this.computeDataHash(filteredData);
    return newHash !== oldHash;
  }

  /**
   * 生成独立的 .xlsx 文件（返回 ArrayBuffer）
   */
  async writeIndividualFile(
    filteredData: CellValue[][],
    englishName: string,
    config: Config
  ): Promise<ArrayBuffer> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(englishName);

    for (let r = 0; r < filteredData.length; r++) {
      const row = sheet.getRow(r + 1);
      for (let c = 0; c < filteredData[r].length; c++) {
        const cell = row.getCell(c + 1);
        let value = filteredData[r][c];

        // GameConfig 特殊处理：第3行第3列替换为版本号.序列号
        if (
          englishName === 'GameConfig' &&
          r === 2 && c === 2
        ) {
          value = `${config.outputSettings.versionNumber}.${config.outputSettings.versionSequence}`;
        }

        cell.value = value as ExcelJS.CellValue;
        cell.numFmt = '@'; // 文本格式
      }
      row.commit();
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return buffer as ArrayBuffer;
  }
}

export const exportWriter = new ExportWriter();
