import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Printer, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  open: boolean;
  docTitle: string;
  onClose: () => void;
  children: ReactNode;
}

// Full-screen preview that renders an actual document on a paper-sized sheet.
// "Print / Save as PDF" calls the browser's print dialog; the global @media
// print rules (index.css) hide the app shell so only #print-root is printed.
export function PrintHost({ open, docTitle, onClose, children }: Props) {
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

  return createPortal(
    <div className="fixed inset-0 z-50 overflow-auto bg-zinc-800/60 p-4 sm:p-6 print:static print:overflow-visible print:bg-white print:p-0">
      {/* toolbar — never printed */}
      <div className="no-print sticky top-0 z-10 mx-auto mb-4 flex max-w-[210mm] items-center justify-between rounded-lg border border-border bg-panel px-3 py-2 shadow-lg">
        <div className="text-[13px] font-semibold text-ink-primary">{docTitle}</div>
        <div className="flex items-center gap-2">
          <Button onClick={() => window.print()} className="gap-2">
            <Printer className="h-3.5 w-3.5" /> Print / Save as PDF
          </Button>
          <Button variant="outline" onClick={onClose} className="gap-2">
            <X className="h-3.5 w-3.5" /> Close
          </Button>
        </div>
      </div>

      {/* the document sheet */}
      <div
        id="print-root"
        className="mx-auto bg-white text-black shadow-xl w-[210mm] p-[14mm] print:w-auto print:p-0 print:shadow-none"
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
