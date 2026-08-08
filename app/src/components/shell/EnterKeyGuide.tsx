import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

// Paired with useEnterGuide (in lib). Shown once, the first time someone opens
// an encoding sheet, because the keystroke cannot be discovered by looking.
//
// Kept to two sentences and one picture on purpose: a guide nobody finishes
// reading teaches nothing. The primary button is focused on open, so the very
// first Enter a first-timer presses dismisses it — the key teaches itself.

// Three stacked cells with the caret on the first: the whole idea at a glance.
function DownArrowSketch() {
  return (
    <div aria-hidden className="mb-4 flex justify-center rounded-lg border border-border bg-app py-4">
      <div className="flex flex-col items-center gap-1">
        <div className="flex h-7 w-16 items-center justify-center rounded border-2 border-nps-red bg-panel text-[12.5px] font-semibold text-ink-primary tabular-nums">
          88
        </div>
        <span className="text-[13px] leading-none text-nps-red">↓</span>
        <div className="flex h-7 w-16 items-center justify-center rounded border border-border bg-panel text-[12.5px] text-ink-muted">
          —
        </div>
        <span className="text-[13px] leading-none text-ink-muted">↓</span>
        <div className="flex h-7 w-16 items-center justify-center rounded border border-border bg-panel text-[12.5px] text-ink-muted">
          —
        </div>
      </div>
    </div>
  );
}

export function EnterKeyGuide({
  open,
  onClose,
  rowNoun = 'learner',
}: {
  open: boolean;
  onClose: () => void;
  /** What one row stands for on this sheet — "learner", "subject", … */
  rowNoun?: string;
}) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 grid place-items-center px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="enter-guide-title"
    >
      <div className="bg-surface rounded-xl max-w-xs w-full p-5 shadow-2xl">
        <DownArrowSketch />

        <h3 id="enter-guide-title" className="text-[15px] font-bold text-ink-primary">
          Press Enter to move down
        </h3>
        <p className="text-[13px] text-ink-secondary mt-1.5">
          After typing a score, Enter jumps to the box below — the next {rowNoun}, same column. Tab
          moves across.
        </p>

        <div className="mt-4 flex justify-end">
          <Button autoFocus onClick={onClose}>
            Got it
          </Button>
        </div>
      </div>
    </div>
  );
}
