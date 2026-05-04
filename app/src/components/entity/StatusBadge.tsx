import type { ReactNode } from 'react';

type Tone = 'ok' | 'pending' | 'na';

const toneClasses: Record<Tone, string> = {
  ok: 'bg-ok-bg text-ok-fg',
  pending: 'bg-pending-bg text-pending-fg',
  na: 'bg-na-bg text-na-fg',
};

export function StatusBadge({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-medium ${toneClasses[tone]}`}
    >
      {children}
    </span>
  );
}
