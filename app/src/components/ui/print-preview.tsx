import { useEffect } from 'react';
import { X, Printer, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
}

export function PrintPreview({ open, title, subtitle, onClose }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-ink-primary/40"
      onClick={onClose}
    >
      <div
        className="bg-panel border border-border rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between p-4 border-b border-border">
          <div>
            <div className="text-[14px] font-semibold text-ink-primary">{title}</div>
            {subtitle && (
              <div className="text-[12px] text-ink-secondary mt-0.5">{subtitle}</div>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-app text-ink-muted hover:text-ink-primary"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4">
          <div className="bg-app border border-border rounded p-6 min-h-[420px] flex flex-col items-center justify-center text-center gap-3">
            <div className="w-12 h-12 rounded-full bg-panel border border-border grid place-items-center">
              <Printer className="w-5 h-5 text-ink-muted" />
            </div>
            <div className="text-[13px] font-semibold text-ink-primary">Preview not available yet</div>
            <p className="text-[12px] text-ink-secondary max-w-sm leading-relaxed">
              The PDF generation pipeline runs server-side and gets wired in the backend phase.
              For now this modal confirms which document would be produced and its target student.
            </p>
            <p className="text-[11px] text-ink-muted">
              Form layouts will mirror DepEd's official templates (SF 1 / SF 5 / SF 9 / SF 10 / Form 137).
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 p-3 border-t border-border bg-panel-alt">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button disabled className="gap-2">
            <Download className="w-3.5 h-3.5" /> Download PDF (backend-only)
          </Button>
        </div>
      </div>
    </div>
  );
}
