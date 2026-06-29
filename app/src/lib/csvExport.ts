// Client-side CSV export. RFC 4180 quoting; UTF-8 BOM so Excel opens Filipino
// names / ñ correctly. CSV is intentionally dependency-free — it opens directly
// in Excel/Sheets, covering the registrar's "Excel or CSV" request.

export interface CsvColumn<T> {
  header: string;
  value: (row: T) => string | number | null | undefined;
}

function escapeCell(v: unknown): string {
  const s = v == null ? '' : String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const head = columns.map((c) => escapeCell(c.header)).join(',');
  const body = rows
    .map((r) => columns.map((c) => escapeCell(c.value(r))).join(','))
    .join('\r\n');
  return body ? `${head}\r\n${body}` : head;
}

export function downloadCsv(filename: string, csv: string): void {
  const name = filename.toLowerCase().endsWith('.csv') ? filename : `${filename}.csv`;
  const BOM = '﻿'; // UTF-8 byte-order mark so Excel reads ñ / é correctly
  const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
