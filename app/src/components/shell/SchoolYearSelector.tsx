import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { schoolYears } from '@/mocks';
import type { SchoolYear } from '@/types';

interface Props {
  value: SchoolYear;
  onChange: (sy: SchoolYear) => void;
}

export function SchoolYearSelector({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-3 py-2 bg-panel border border-border rounded text-xs text-ink-secondary hover:bg-panel-alt"
      >
        <span>{value.label}</span>
        <ChevronDown className="w-3.5 h-3.5" />
      </button>
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-panel border border-border rounded shadow-sm z-10 overflow-hidden">
          {schoolYears.map((sy) => (
            <button
              key={sy.code}
              onClick={() => {
                onChange(sy);
                setOpen(false);
              }}
              className="w-full text-left px-3 py-2 text-xs text-ink-secondary hover:bg-app"
            >
              {sy.label}
              {sy.isActive && <span className="ml-2 text-ok-fg">· current</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
