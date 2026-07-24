import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { X } from 'lucide-react';
import { FullSheet } from '@/components/gradesheet/FullSheet';
import { listClasses, listSubjects, listStudentsByClass, listGradeSubjects } from '@/lib/db';
import { gradeLabel } from '@/lib/forms';
import type { ClassRecord, Student, Subject } from '@/types';

// Full-screen page (opens in its OWN TAB from Reports ▸ Class Grades — no
// sidebar shell) so the detailed grade sheet has the whole screen to fit in.
// One subject at a time, switched with the chips; each sheet is the shared
// FullSheet — identical to the teacher portal's, with the registrar's gated
// Edit grades on top.
export default function ClassGradesheetsFull() {
  const { classId } = useParams<{ classId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

  const [cls, setCls] = useState<ClassRecord | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [codes, setCodes] = useState<string[] | null>(null); // null = loading
  // ?subject=CODE deep-links straight to ONE sheet — the "someone asked for a
  // correction on THIS gradesheet" path, no need to walk through the others.
  const [selected, setSelected] = useState(() => (searchParams.get('subject') ?? '').toUpperCase());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!classId) return;
    let cancelled = false;
    (async () => {
      try {
        const [cs, subs, roster] = await Promise.all([
          listClasses(),
          listSubjects(),
          listStudentsByClass(classId),
        ]);
        if (cancelled) return;
        const c = cs.find((x) => x.id === classId) ?? null;
        setCls(c);
        setSubjects(subs);
        // Curriculum order (Setup ▸ Subjects) first, then any extra subject
        // that already has encoded grades — nothing is hidden from the checker.
        const present = new Set<string>();
        for (const s of roster) {
          for (const g of s.grades?.[(c?.sy ?? '') as keyof Student['grades']] ?? []) {
            present.add(g.subjectCode.toUpperCase());
          }
        }
        const order = c ? await listGradeSubjects(c.gradeLevel).catch(() => [] as string[]) : [];
        if (cancelled) return;
        const ordered: string[] = [];
        for (const gc of order) {
          const u = gc.toUpperCase();
          if (!ordered.includes(u)) ordered.push(u);
          present.delete(u);
        }
        const all = [...ordered, ...[...present].sort()];
        setCodes(all);
        // Keep a valid ?subject= deep link; otherwise start on the first one.
        setSelected((cur) => (cur && all.includes(cur) ? cur : all[0] || ''));
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load the section.');
          setCodes([]);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [classId]);

  const subjIndex = useMemo(() => new Map(subjects.map((s) => [s.code.toUpperCase(), s])), [subjects]);

  return (
    <div className="min-h-screen bg-app text-ink-primary">
      {/* ── Zone 1: the PICKER — a sticky control bar, visually its own band.
          Everything here only CHOOSES what to open; nothing here is the sheet. ── */}
      <div className="sticky top-0 z-10 border-b border-border bg-surface px-6 py-4 shadow-sm">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="text-[10.5px] font-bold uppercase tracking-[0.08em] text-ink-muted">
              Full Grade Sheets · Pick a subject
            </div>
            <h1 className="text-lg font-bold mt-0.5">
              {cls ? `${gradeLabel(cls.gradeLevel)} · ${cls.sectionName} · SY ${cls.sy}` : 'Full Grade Sheets'}
            </h1>
          </div>
          <button
            onClick={() => window.close()}
            className="h-9 rounded-md border border-border bg-panel px-3 text-[13px] hover:bg-panel-alt inline-flex items-center gap-1.5"
            title="Close this tab"
          >
            <X className="w-3.5 h-3.5" /> Close
          </button>
        </div>

        {error && (
          <p className="mt-3 text-[13px] text-nps-red bg-nps-red/10 border border-nps-red/20 rounded-md px-3 py-2">
            {error}
          </p>
        )}

        {codes !== null && codes.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span className="text-[12px] font-semibold text-ink-secondary mr-1">Subject:</span>
            {codes.map((c) => {
              const s = subjIndex.get(c);
              return (
                <button
                  key={c}
                  onClick={() => {
                    setSelected(c);
                    // Keep the URL pointing at the open sheet, so the tab can
                    // be refreshed or its link shared without losing the spot.
                    setSearchParams({ subject: c }, { replace: true });
                  }}
                  title={s?.fullName || c}
                  className={`h-8 rounded-md border px-3 text-[12.5px] font-medium transition-colors ${
                    selected === c
                      ? 'bg-nps-red text-white border-nps-red'
                      : 'border-border bg-panel text-ink-secondary hover:bg-panel-alt'
                  }`}
                >
                  {s?.abbreviation || c}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Zone 2: the SHEET itself — a separate document card on the page
          background, clearly distinct from the picker bar above. ── */}
      <div className="px-6 py-5">
        {codes === null ? (
          <p className="text-[13px] text-ink-secondary">Loading…</p>
        ) : codes.length === 0 ? (
          !error && <p className="text-[13px] text-ink-secondary">No subjects found for this section.</p>
        ) : classId && selected ? (
          <div className="rounded-xl border border-border bg-panel p-4 sm:p-5 shadow-sm">
            <div className="mb-4 pb-3 border-b border-border-soft text-[10.5px] font-bold uppercase tracking-[0.08em] text-ink-muted">
              Grade Sheet — {subjIndex.get(selected)?.fullName || selected}
            </div>
            {/* Remount per subject so each sheet seeds cleanly from its own data. */}
            <FullSheet key={selected} classId={classId} subjectCode={selected} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
