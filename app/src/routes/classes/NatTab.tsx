import { Fragment, useEffect, useMemo, useState } from 'react';
import { SectionCard } from '@/components/entity/SectionCard';
import { Input } from '@/components/ui/input';
import { formatLastFirstMiddle } from '@/lib/format';
import { groupRosterBySex } from '@/lib/roster';
import { listNatScores, saveNatRow, NAT_SUBJECTS, type NatRow, type NatSubjectKey } from '@/lib/db';
import type { ClassRecord, Student } from '@/types';

// NAT is administered at the exit grades only (Grade 6, 10, 12).
function isNatGrade(gradeLevel: string): boolean {
  const base = (gradeLevel || '').split('-')[0];
  return base === 'VI' || base === 'X' || base === 'XII';
}

export function NatTab({ klass, roster }: { klass: ClassRecord; roster: Student[] }) {
  const eligible = isNatGrade(klass.gradeLevel);
  const [scores, setScores] = useState<Record<string, NatRow>>({});
  const [loading, setLoading] = useState(true);
  const [savingLrn, setSavingLrn] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!eligible) { setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
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
          Grade {klass.gradeLevel} is not a NAT grade. The National Achievement Test is administered
          at the exit levels — <span className="font-medium">Grade 6, Grade 10 and Grade 12</span>.
        </p>
      </SectionCard>
    );
  }

  const cell = 'w-16 text-center tabular-nums';

  return (
    <SectionCard heading={`NAT scores · Grade ${klass.gradeLevel} ${klass.sectionName}`}>
      <p className="text-[12.5px] text-ink-secondary mb-3">
        Enter each learner's National Achievement Test score (0–100) per learning area. Scores save
        when you leave a row. The <span className="font-medium">MPS</span> row is the mean per subject.
      </p>
      {error && <p className="mb-3 text-[12.5px] text-nps-red bg-nps-red/10 border border-nps-red/20 rounded-md px-3 py-2">{error}</p>}

      {loading ? (
        <p className="text-[12.5px] text-ink-secondary">Loading…</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-[0.04em] text-ink-muted border-b border-border">
                <th className="py-1.5 pr-3 min-w-[200px]">Name</th>
                <th className="py-1.5 pr-3">LRN</th>
                {NAT_SUBJECTS.map((s) => (
                  <th key={s.key} className="py-1.5 px-1 text-center">{s.label}</th>
                ))}
              </tr>
            </thead>
            <tbody onBlur={(e) => {
              // Save the row when focus leaves any of its inputs.
              const lrn = (e.target as HTMLElement).closest('tr')?.dataset.lrn;
              if (lrn) saveRow(lrn);
            }}>
              {groupRosterBySex(roster).map((grp) => (
                <Fragment key={grp.key}>
                  <tr>
                    <td
                      colSpan={2 + NAT_SUBJECTS.length}
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
                      <td className="py-1.5 pr-3 font-mono text-ink-secondary">{s.lrn}</td>
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
                    </tr>
                  ))}
                </Fragment>
              ))}
              {roster.length === 0 && (
                <tr>
                  <td colSpan={2 + NAT_SUBJECTS.length} className="py-6 text-center text-ink-secondary">
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
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}
    </SectionCard>
  );
}
