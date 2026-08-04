import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Paired with useUnsavedGuard (in lib) — spread its `dialogProps` here.
// Deliberately offers BOTH doors, with the safe one first: staying is the
// default action, but leaving is never blocked — the encoder may genuinely want
// to abandon what they typed.
export function UnsavedChangesDialog({
  open,
  onStay,
  onLeave,
  what = 'Your changes',
}: {
  open: boolean;
  onStay: () => void;
  onLeave: () => void;
  what?: string;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/50 z-50 grid place-items-center px-4">
      <div className="bg-surface rounded-xl max-w-md w-full p-5 shadow-2xl">
        <div className="flex items-start gap-2.5">
          <AlertTriangle className="w-5 h-5 shrink-0 text-amber-500 mt-0.5" />
          <div>
            <h3 className="text-[15px] font-bold text-ink-primary">Leave without saving?</h3>
            <p className="text-[13px] text-ink-secondary mt-1.5">
              {what} on this page have not been saved yet. Leaving now discards them.
            </p>
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={onLeave}>Leave anyway</Button>
          <Button onClick={onStay}>Stay and save</Button>
        </div>
      </div>
    </div>
  );
}
