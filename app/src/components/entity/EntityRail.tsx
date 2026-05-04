import type { ReactNode } from 'react';

export interface RailAnchor {
  id: string;
  label: string;
}

export function EntityRail({
  avatar,
  name,
  subtitle,
  ids,
  actions,
  anchors,
  activeAnchor,
}: {
  avatar: ReactNode;
  name: string;
  subtitle: string;
  ids: { label: string; value: ReactNode }[];
  actions: ReactNode;
  anchors: RailAnchor[];
  activeAnchor?: string;
}) {
  return (
    <aside className="w-[240px] shrink-0 bg-panel border border-border rounded-md p-4 self-start sticky top-6">
      <div className="flex justify-center mb-2.5">{avatar}</div>
      <div className="text-center font-bold text-[14px] text-ink-primary">{name}</div>
      <div className="text-center text-[11.5px] text-ink-secondary mb-3">{subtitle}</div>

      <div className="border-t border-border-soft pt-2.5 mb-3">
        {ids.map((row, i) => (
          <div key={i} className="flex justify-between items-center text-[11.5px] py-1">
            <span className="text-ink-muted">{row.label}</span>
            <span className="text-ink-primary">{row.value}</span>
          </div>
        ))}
      </div>

      <div className="border-t border-border-soft pt-2.5 mb-3 flex flex-col gap-1.5">
        {actions}
      </div>

      {anchors.length > 0 && (
        <div className="border-t border-border-soft pt-2.5 flex flex-col">
          {anchors.map((a) => (
            <a
              key={a.id}
              href={`#${a.id}`}
              className={[
                'block px-2 py-1.5 rounded text-[12px]',
                a.id === activeAnchor
                  ? 'bg-sidebar text-ink-primary font-semibold'
                  : 'text-ink-secondary hover:bg-app',
              ].join(' ')}
            >
              {a.label}
            </a>
          ))}
        </div>
      )}
    </aside>
  );
}
