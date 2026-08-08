import { Fragment, useEffect, useMemo, useState } from 'react';
import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SectionCard } from '@/components/entity/SectionCard';
import { Input } from '@/components/ui/input';
import { ExportCsvButton } from '@/components/ExportCsvButton';
import { PrintHost } from '@/components/print/PrintHost';
import { NatSheet } from '@/components/print/NatSheet';
import { formatLastFirstMiddle } from '@/lib/format';
import { groupRosterBySex } from '@/lib/roster';
import { schoolIdFromLrn, displayLrn } from '@/lib/lrn';
import { isNatGrade } from '@/lib/nat';
import { listNatScores, saveNatRow, NAT_SUBJECTS, type NatRow, type NatSubjectKey } from '@/lib/db';
import { enterMovesDown } from '@/lib/gridKeys';
import { useEnterGuide } from '@/lib/useEnterGuide';
import { EnterKeyGuide } from '@/components/shell/EnterKeyGuide';
import type { ClassRecord, Student } from '@/types';

export function NatTab({ klass, roster }: { klass: ClassRecord; roster: Student[] }) {
  const eligible = isNatGrade(klass.gradeLevel);
  const [scores, setScores] = useState<Record<string, NatRow>>({});
  const [loading, setLoading] = useState(true);
  const [savingLrn, setSavingLrn] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [printing, setPrinting] = useState(false);
  const guide = useEnterGuide();

  useEffect(() => {
    // An ineligible section renders the "not a NAT grade" card and never reaches
    // the loading state, so there is nothing to clear here. `loading` starts
    // true and is only ever cleared — a class page shows one class, so this
    // never re-runs against an already-loaded sheet.
    if (!eligible) return;
    let cancelled = false;
    listNatScores(klass.sy)
      .then((m) => { if (!cancelled) setScores(m); })
      .catch((e) => { if (!cancelled) setError(e?.message ?? 'Failed to load NAT scores.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [klass.sy, eligible]);

  const setCell = (lrn: string, key: NatSubjectKey, raw: string) => {
    setScores((prev) => {
      const row = { ...(prev[lrn] ?? {}) };
      if (raw.trim() === '') delete row[key];
      else row[key] = Number(raw);
      return { ...prev, [lrn]: row };
    });
  };

  async function saveRow(lrn: string) {
    setSavingLrn(lrn);
    setError(null);
    try {
      await saveNatRow(klass.sy, lrn, scores[lrn] ?? {});
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save.');
    } finally {
      setSavingLrn(null);
    }
  }

  // Mean Percentage Score per subject across learners who have a value.
  const mps = useMemo(() => {
    const out: Partial<Record<NatSubjectKey, number>> = {};
    for (const s of NAT_SUBJECTS) {
      const vals = roster
        .map((r) => scores[r.lrn]?.[s.key])
        .filter((v): v is number => typeof v === 'number' && !Number.isNaN(v));
      if (vals.length) out[s.key] = Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100;
    }
    return out;
  }, [scores, roster]);

  if (!eligible) {
    return (
      <SectionCard heading="NAT scores (DepEd National Achievement Test)">
        <p className="text-[12.5px] text-ink-secondary">
          Grade {klass.gradeLevel} does not take the NAT. NPS administers the National Achievement
          Test in <span className="font-medium">Grade 6</span>.
        </p>
      </SectionCard>
    );
  }

  const cell = 'w-16 text-center tabular-nums';

  return (
    <SectionCard heading={`NAT scores · Grade ${klass.gradeLevel} ${klass.sectionName}`}>
      <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
        <p className="text-[12.5px] text-ink-secondary max-w-[62ch]">
          Enter each learner's National Achievement Test score (0–100) per learning area. Scores save
          when you leave a row. The <span className="font-medium">MPS</span> row is the mean per subject.{' '}
          <kbd className="rounded border border-border bg-app px-1 py-0.5 text-[10.5px]">Enter</kbd> moves down,{' '}
          <kbd className="rounded border border-border bg-app px-1 py-0.5 text-[10.5px]">Tab</kbd> moves across.{' '}
          <button type="button" onClick={guide.show} className="underline underline-offset-2 hover:text-ink-primary">
            Show the guide
          </button>
        </p>
        <div className="flex items-center gap-2">
          <ExportCsvButton
            rows={groupRosterBySex(roster).flatMap((g) => g.students)}
            columns={[
              { header: 'Name', value: (s) => formatLastFirstMiddle(s) },
              { header: 'LRN', value: (s) => displayLrn(s.lrn) },
              ...NAT_SUBJECTS.map((sub) => ({
                header: sub.label,
                value: (s: Student) => scores[s.lrn]?.[sub.key] ?? '',
              })),
              { header: 'School ID', value: (s) => schoolIdFromLrn(s.lrn) },
            ]}
            filename={`nat-grade-6-${klass.sectionName}-${klass.sy}`}
          />
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            disabled={roster.length === 0}
            onClick={() => setPrinting(true)}
          >
            <Printer className="w-3.5 h-3.5" /> Print NAT list
          </Button>
        </div>
      </div>
      {/* First-timers only: opens once per browser, on the first sheet they encode. */}
      <EnterKeyGuide open={guide.open} onClose={guide.close} />
      {error && <p className="mb-3 text-[12.5px] text-nps-red bg-nps-red/10 border border-nps-red/20 rounded-md px-3 py-2">{error}</p>}

      {loading ? (
        <p className="text-[12.5px] text-ink-secondary">Loading…</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]" onKeyDown={enterMovesDown}>
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-[0.04em] text-ink-muted border-b border-border">
                <th className="py-1.5 pr-3 min-w-[200px]">Name</th>
                <th className="py-1.5 pr-3">LRN</th>
                {NAT_SUBJECTS.map((s) => (
                  <th key={s.key} className="py-1.5 px-1 text-center" title={s.full}>
                    {s.label}
                  </th>
                ))}
                <th className="py-1.5 pl-3">School ID</th>
              </tr>
            </thead>
            <tbody onBlur={(e) => {
              // Save the row when focus leaves it — not on every cell-to-cell hop
              // inside the same row, which onBlur (focusout) also reports.
              const row = (e.target as HTMLElement).closest('tr');
              if (!row || row.contains(e.relatedTarget as Node | null)) return;
              const lrn = row.dataset.lrn;
              if (lrn) saveRow(lrn);
            }}>
              {groupRosterBySex(roster).map((grp) => (
                <Fragment key={grp.key}>
                  <tr>
                    <td
                      colSpan={3 + NAT_SUBJECTS.length}
                      className={`px-2 py-1 text-[11px] font-bold uppercase tracking-wider ${
                        grp.key === 'Unspecified' ? 'bg-amber-100 text-amber-800' : 'bg-app'
                      }`}
                    >
                      {grp.label} · {grp.students.length}
                    </td>
                  </tr>
                  {grp.students.map((s) => (
                    <tr key={s.lrn} data-lrn={s.lrn} className="border-b border-border-soft last:border-0">
                      <td className="py-1.5 pr-3">
                        {formatLastFirstMiddle(s)}
                        {savingLrn === s.lrn && <span className="ml-2 text-[11px] text-ink-muted">saving…</span>}
                      </td>
                      <td className="py-1.5 pr-3 font-mono text-ink-secondary">{displayLrn(s.lrn)}</td>
                      {NAT_SUBJECTS.map((sub) => (
                        <td key={sub.key} className="py-1 px-1 text-center">
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            value={scores[s.lrn]?.[sub.key] ?? ''}
                            onChange={(e) => setCell(s.lrn, sub.key, e.target.value)}
                            className={cell}
                          />
                        </td>
                      ))}
                      {/* LRN[0:6] — the school that FIRST enrolled this learner
                          in the DepEd system, which is where DepEd aggregates
                          their NAT result. Not NPS's own ID: a section holds
                          learners from several originating schools. */}
                      <td className="py-1.5 pl-3 font-mono text-ink-secondary">
                        {schoolIdFromLrn(s.lrn)}
                      </td>
                    </tr>
                  ))}
                </Fragment>
              ))}
              {roster.length === 0 && (
                <tr>
                  <td colSpan={3 + NAT_SUBJECTS.length} className="py-6 text-center text-ink-secondary">
                    No learners in this section yet.
                  </td>
                </tr>
              )}
            </tbody>
            {roster.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-border font-semibold">
                  <td className="py-2 pr-3" colSpan={2}>Mean Percentage Score (MPS)</td>
                  {NAT_SUBJECTS.map((s) => (
                    <td key={s.key} className="py-2 px-1 text-center tabular-nums">
                      {mps[s.key] ?? '—'}
                    </td>
                  ))}
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}

      <PrintHost
        open={printing}
        docTitle={`NAT · Grade 6 ${klass.sectionName} · ${klass.sy}`}
        onClose={() => setPrinting(false)}
      >
        <NatSheet klass={klass} roster={roster} scores={scores} mps={mps} />
      </PrintHost>
    </SectionCard>
  );
}
