import type { ReactNode } from 'react';

export function Field({
  label,
  hint,
  required,
  children,
  span,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
  span?: 1 | 2;
}) {
  const colSpan = span === 2 ? 'col-span-2' : '';
  return (
    <label className={`block ${colSpan}`}>
      <span className="text-[12px] text-ink-secondary block mb-1">
        {label}
        {required && <span className="text-pending-fg ml-1">*</span>}
      </span>
      {children}
      {hint && <span className="text-[11px] text-ink-muted block mt-1">{hint}</span>}
    </label>
  );
}
