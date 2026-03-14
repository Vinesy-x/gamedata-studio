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
    const newHash = this.computeDataHash(filteredData);
    return this.hasHashChanged(newHash, manifest, englishName);
  }

  /**
   * 基于预计算的哈希值判断是否有变更（避免重复计算哈希）
   */
  hasHashChanged(
    newHash: string,
    manifest: HashManifest,
    englishName: string
  ): boolean {
    const oldEntry = manifest[englishName];
    if (!oldEntry) return true;

    const oldHash = getManifestHash(oldEntry);
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
    // 动态导入 exceljs（~925KB），避免阻塞首屏加载
    const ExcelJS = await import('exceljs');
    const workbook = new ExcelJS.default.Workbook();
    const sheet = workbook.addWorksheet(englishName);

    // 整列设置文本格式（避免逐单元格设置 numFmt）
    const colCount = filteredData[0]?.length ?? 0;
    for (let c = 1; c <= colCount; c++) {
      sheet.getColumn(c).numFmt = '@';
    }

    // GameConfig 特殊处理：第3行第3列替换为版本号.序列号
    if (englishName === 'GameConfig' && filteredData.length > 2 && filteredData[2].length > 2) {
      filteredData[2][2] = `${config.outputSettings.versionNumber}.${config.outputSettings.versionSequence}`;
    }

    // 批量添加行（比逐行 getRow/getCell 快很多）
    sheet.addRows(filteredData as unknown[]);

    const buffer = await workbook.xlsx.writeBuffer();
    return buffer as ArrayBuffer;
  }
}

export const exportWriter = new ExportWriter();
