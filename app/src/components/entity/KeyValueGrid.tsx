import type { ReactNode } from 'react';

export interface KVRow {
  label: string;
  value: ReactNode;
}

export function KeyValueGrid({ rows, columns = 2 }: { rows: KVRow[]; columns?: 1 | 2 }) {
  const cls = columns === 2 ? 'grid grid-cols-2 gap-x-4' : 'flex flex-col';
  return (
    <div className={cls}>
      {rows.map((r, i) => (
        <div
          key={i}
          className="flex items-center justify-between gap-3 py-2 px-1 text-[12.5px] border-b border-border-soft last:border-0"
        >
          <span className="text-ink-secondary shrink-0">{r.label}</span>
          <span className="text-ink-primary font-medium text-right">{r.value}</span>
        </div>
      ))}
    </div>
  );
}
