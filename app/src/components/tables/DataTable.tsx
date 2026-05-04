import { useMemo, useState, type ReactNode } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  sortable?: boolean;
  width?: string;
}

interface Props<T> {
  data: T[];
  columns: Column<T>[];
  searchableText: (row: T) => string;
  onRowClick?: (row: T) => void;
  searchPlaceholder?: string;
  emptyText?: string;
  rightActions?: ReactNode;
}

export function DataTable<T>({
  data,
  columns,
  searchableText,
  onRowClick,
  searchPlaceholder = 'Search…',
  emptyText = 'No results.',
  rightActions,
}: Props<T>) {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return data;
    return data.filter((row) => searchableText(row).toLowerCase().includes(q));
  }, [data, query, searchableText]);

  return (
    <div>
      <div className="flex gap-2 mb-3 items-center">
        <div className="relative flex-1 max-w-xs">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none" />
          <Input
            placeholder={searchPlaceholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-8"
          />
        </div>
        {rightActions && <div className="ml-auto flex gap-2">{rightActions}</div>}
      </div>
      <div className="bg-panel border border-border rounded-md overflow-hidden">
        <table className="w-full text-[12.5px]">
          <thead>
            <tr className="bg-panel-alt border-b border-border">
              {columns.map((c) => (
                <th
                  key={c.key}
                  className="text-left text-[11px] uppercase tracking-[0.04em] text-ink-muted font-semibold px-3.5 py-2"
                  style={{ width: c.width }}
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-3.5 py-6 text-center text-ink-secondary"
                >
                  {emptyText}
                </td>
              </tr>
            ) : (
              filtered.map((row, i) => (
                <tr
                  key={i}
                  onClick={() => onRowClick?.(row)}
                  className={[
                    'border-b border-border-soft last:border-0',
                    onRowClick ? 'cursor-pointer hover:bg-app' : '',
                  ].join(' ')}
                >
                  {columns.map((c) => (
                    <td key={c.key} className="px-3.5 py-2 text-ink-primary">
                      {c.render(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-ink-muted mt-2">
        {filtered.length} of {data.length} {data.length === 1 ? 'record' : 'records'}
      </p>
    </div>
  );
}
