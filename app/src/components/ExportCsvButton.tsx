import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toCsv, downloadCsv, type CsvColumn } from '@/lib/csvExport';

interface Props<T> {
  rows: T[];
  columns: CsvColumn<T>[];
  filename: string;
  label?: string;
  disabled?: boolean;
}

// One-click CSV download of a tabular dataset. Disabled when there is nothing
// to export.
export function ExportCsvButton<T>({ rows, columns, filename, label = 'Export CSV', disabled }: Props<T>) {
  return (
    <Button
      variant="outline"
      className="gap-2"
      disabled={disabled || rows.length === 0}
      onClick={() => downloadCsv(filename, toCsv(rows, columns))}
    >
      <Download className="w-3.5 h-3.5" /> {label}
    </Button>
  );
}
