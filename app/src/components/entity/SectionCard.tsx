import type { ReactNode } from 'react';

export function SectionCard({
  id,
  heading,
  children,
}: {
  id?: string;
  heading: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="bg-panel border border-border rounded-md p-4">
      <h2 className="text-label uppercase font-bold text-ink-muted mb-2.5">{heading}</h2>
      {children}
    </section>
  );
}
