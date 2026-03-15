import { CellValue, CellDiff, RowDiff, TableDiffDetail } from '../types/table';

const MAX_DIFF_ROWS = 100;

function cellToString(value: CellValue): string {
  if (value == null) return '';
  return String(value);
}

/**
 * Compute row-level and cell-level diff between old and new table data.
 * Pure function, no I/O.
 *
 * Data layout: row 0 = headers, row 1 = description, row 2+ = data rows.
 * Column 0 = key.
 */
export function computeTableDiff(
  oldData: CellValue[][],
  newData: CellValue[][],
  maxRows = MAX_DIFF_ROWS
): TableDiffDetail {
  const headers = newData[0] || [];

  // Build key → row maps (from row 2 onwards)
  const buildMap = (data: CellValue[][]) => {
    const map = new Map<string, CellValue[]>();
    for (let r = 2; r < data.length; r++) {
      const row = data[r];
      const key = cellToString(row?.[0]);
      if (!key) continue;
      map.set(key, row);
    }
    return map;
  };

  const oldMap = buildMap(oldData);
  const newMap = buildMap(newData);

  const rows: RowDiff[] = [];
  let addedCount = 0;
  let removedCount = 0;
  let modifiedCount = 0;

  // Check new keys: added or modified
  for (const [key, newRow] of newMap) {
    const oldRow = oldMap.get(key);
    if (!oldRow) {
      rows.push({ key, status: 'added' });
      addedCount++;
    } else {
      // Compare cells
      const maxCols = Math.max(oldRow.length, newRow.length);
      const cells: CellDiff[] = [];
      for (let c = 1; c < maxCols; c++) {
        const oldVal = cellToString(oldRow[c]);
        const newVal = cellToString(newRow[c]);
        if (oldVal !== newVal) {
          cells.push({
            colIndex: c,
            colName: cellToString(headers[c]) || `col_${c}`,
            oldValue: oldVal,
            newValue: newVal,
          });
        }
      }
      if (cells.length > 0) {
        rows.push({ key, status: 'modified', cells });
        modifiedCount++;
      }
    }
  }

  // Check removed keys
  for (const key of oldMap.keys()) {
    if (!newMap.has(key)) {
      rows.push({ key, status: 'removed' });
      removedCount++;
    }
  }

  // Sort: removed → modified → added
  const order: Record<string, number> = { removed: 0, modified: 1, added: 2 };
  rows.sort((a, b) => order[a.status] - order[b.status]);

  const totalChanges = rows.length;
  const truncated = rows.length > maxRows;

  return {
    addedCount,
    removedCount,
    modifiedCount,
    rows: truncated ? rows.slice(0, maxRows) : rows,
    totalChanges,
    truncated,
  };
}
