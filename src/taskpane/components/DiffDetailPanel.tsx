import { memo } from 'react';
import { makeStyles, tokens } from '@fluentui/react-components';
import { TableDiffDetail } from '../../types/table';
import { useThemeText } from '../locales';

const useStyles = makeStyles({
  container: {
    padding: '8px 0 4px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  summary: {
    display: 'flex',
    gap: '10px',
    fontSize: '11px',
    fontWeight: 600,
  },
  added: { color: tokens.colorPaletteGreenForeground1 },
  removed: { color: tokens.colorPaletteRedForeground1 },
  modified: { color: tokens.colorPaletteYellowForeground2 },
  rowList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  rowItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    lineHeight: '1.4',
  },
  rowAdded: {
    borderLeft: `3px solid ${tokens.colorPaletteGreenForeground1}`,
    backgroundColor: tokens.colorPaletteGreenBackground1,
  },
  rowRemoved: {
    borderLeft: `3px solid ${tokens.colorPaletteRedForeground1}`,
    backgroundColor: tokens.colorPaletteRedBackground1,
  },
  rowModified: {
    borderLeft: `3px solid ${tokens.colorPaletteYellowForeground2}`,
    backgroundColor: tokens.colorPaletteYellowBackground1,
  },
  rowHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  rowKey: {
    fontWeight: 600,
    color: tokens.colorNeutralForeground1,
  },
  badge: {
    fontSize: '10px',
    fontWeight: 600,
    padding: '0 4px',
    borderRadius: '3px',
  },
  badgeAdded: {
    color: tokens.colorPaletteGreenForeground1,
    backgroundColor: tokens.colorPaletteGreenBackground2,
  },
  badgeRemoved: {
    color: tokens.colorPaletteRedForeground1,
    backgroundColor: tokens.colorPaletteRedBackground2,
  },
  cellDiff: {
    fontSize: '10px',
    color: tokens.colorNeutralForeground2,
    paddingLeft: '8px',
  },
  oldValue: {
    color: tokens.colorPaletteRedForeground1,
    textDecorationLine: 'line-through',
  },
  newValue: {
    color: tokens.colorPaletteGreenForeground1,
  },
  truncated: {
    fontSize: '10px',
    color: tokens.colorNeutralForeground3,
    textAlign: 'center' as const,
    padding: '4px 0',
  },
});

interface DiffDetailPanelProps {
  diffDetail: TableDiffDetail;
}

export const DiffDetailPanel = memo(function DiffDetailPanel({ diffDetail }: DiffDetailPanelProps) {
  const styles = useStyles();
  const t = useThemeText();

  return (
    <div className={styles.container}>
      <div className={styles.summary}>
        {diffDetail.addedCount > 0 && (
          <span className={styles.added}>{t.export.diff.added(diffDetail.addedCount)}</span>
        )}
        {diffDetail.removedCount > 0 && (
          <span className={styles.removed}>{t.export.diff.removed(diffDetail.removedCount)}</span>
        )}
        {diffDetail.modifiedCount > 0 && (
          <span className={styles.modified}>{t.export.diff.modified(diffDetail.modifiedCount)}</span>
        )}
      </div>

      <div className={styles.rowList}>
        {diffDetail.rows.map((row) => (
          <div
            key={`${row.status}-${row.key}`}
            className={`${styles.rowItem} ${
              row.status === 'added' ? styles.rowAdded :
              row.status === 'removed' ? styles.rowRemoved :
              styles.rowModified
            }`}
          >
            <div className={styles.rowHeader}>
              <span className={styles.rowKey}>{row.key}</span>
              {row.status === 'added' && (
                <span className={`${styles.badge} ${styles.badgeAdded}`}>{t.export.diff.newRow}</span>
              )}
              {row.status === 'removed' && (
                <span className={`${styles.badge} ${styles.badgeRemoved}`}>{t.export.diff.removedRow}</span>
              )}
            </div>
            {row.status === 'modified' && row.cells && row.cells.map((cell, j) => (
              <div key={j} className={styles.cellDiff}>
                {cell.colName}:{' '}
                <span className={styles.oldValue}>{cell.oldValue || '(empty)'}</span>
                {' → '}
                <span className={styles.newValue}>{cell.newValue || '(empty)'}</span>
              </div>
            ))}
          </div>
        ))}
      </div>

      {diffDetail.truncated && (
        <div className={styles.truncated}>
          {t.export.diff.truncated(diffDetail.rows.length, diffDetail.totalChanges)}
        </div>
      )}
    </div>
  );
});
