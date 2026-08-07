import { Fragment, useState } from 'react';
import { SectionCard } from '@/components/entity/SectionCard';
import { Input } from '@/components/ui/input';
import { formatLastFirstMiddle } from '@/lib/format';
import { groupRosterBySex } from '@/lib/roster';
import { saveStudentNcae } from '@/lib/db';
import { enterMovesToNextCell } from '@/lib/gridKeys';
import { NCAE_AREAS, type NcaeKey } from '@/lib/forms';
import type { ClassRecord, Student } from '@/types';

// NCAE is administered in Grade 10.
function isNcaeGrade(gradeLevel: string): boolean {
  return (gradeLevel || '').split('-')[0] === 'X';
}

// Scores live on the learner's own `ncae` JSONB — the same column the JHS
// coordinator's Student Records page reads through acad_class_ncae, so what is
// typed here shows up there with no extra plumbing.
export function NcaeTab({ klass, roster }: { klass: ClassRecord; roster: Student[] }) {
  const eligible = isNcaeGrade(klass.gradeLevel);
  // Seeded from the roster that is already loaded — no second fetch, and no
  // flash of empty inputs over real scores.
  const [scores, setScores] = useState<Record<string, Partial<Record<NcaeKey, number>>>>(() =>
    Object.fromEntries(roster.map((s) => [s.lrn, { ...(s.ncae ?? {}) }])),
  );
  const [savingLrn, setSavingLrn] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const setCell = (lrn: string, key: NcaeKey, raw: string) => {
    setScores((prev) => {
      const row = { ...(prev[lrn] ?? {}) };
      if (raw.trim() === '') delete row[key];
      else row[key] = Number(raw);
      return { ...prev, [lrn]: row };
    });
  };

  // Saved when the row loses focus, like the NAT sheet — one write per learner
  // instead of one per keystroke.
  async function saveRow(lrn: string) {
    setSavingLrn(lrn);
    setError(null);
    try {
      await saveStudentNcae(lrn, scores[lrn] ?? {});
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save.');
    } finally {
      setSavingLrn(null);
    }
  }

  if (!eligible) {
    return (
      <SectionCard heading="NCAE scores (DepEd National Career Assessment Exam)">
        <p className="text-[12.5px] text-ink-secondary">
          Grade {klass.gradeLevel} does not take the NCAE. The National Career Assessment Exam is
          administered in <span className="font-medium">Grade 10</span>.
        </p>
      </SectionCard>
    );
  }

  const cell = 'w-16 text-center tabular-nums';

  return (
    <SectionCard heading={`NCAE scores · Grade ${klass.gradeLevel} ${klass.sectionName}`}>
      <p className="text-[12.5px] text-ink-secondary mb-3">
        Enter each learner&apos;s NCAE score per area. Scores save when you leave a row, and appear
        in the JHS coordinator&apos;s Student Records straight away. Press{' '}
        <kbd className="rounded border border-border bg-app px-1 py-0.5 text-[10.5px]">Enter</kbd> to move
        to the next column on the same row.
      </p>
      {error && (
        <p className="mb-3 text-[12.5px] text-nps-red bg-nps-red/10 border border-nps-red/20 rounded-md px-3 py-2">
          {error}
        </p>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-[12px]" onKeyDown={enterMovesToNextCell}>
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-[0.04em] text-ink-muted border-b border-border">
              <th className="py-1.5 pr-3">Name</th>
              <th className="py-1.5 pr-3">LRN</th>
              {NCAE_AREAS.map((a) => (
                <th key={a.key} className="py-1.5 pr-3 text-center">{a.label}</th>
              ))}
              <th className="py-1.5 w-16" />
            </tr>
          </thead>
          <tbody>
            {groupRosterBySex(roster).map((grp) => (
              <Fragment key={grp.key}>
                <tr>
                  <td
                    colSpan={NCAE_AREAS.length + 3}
                    className={`px-2 py-1 text-[11px] font-bold uppercase tracking-wider ${
                      grp.key === 'Unspecified' ? 'bg-amber-100 text-amber-800' : 'bg-app'
                    }`}
                  >
                    {grp.label} · {grp.students.length}
                  </td>
                </tr>
                {grp.students.map((s) => (
                  <tr
                    key={s.lrn}
                    className="border-b border-border-soft last:border-0 hover:bg-app"
                    // React's onBlur is focusout, so it fires on every cell-to-cell
                    // hop as well. Only save once focus has actually left the row.
                    onBlur={(e) => {
                      if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
                      void saveRow(s.lrn);
                    }}
                  >
                    <td className="py-1.5 pr-3">{formatLastFirstMiddle(s)}</td>
                    <td className="py-1.5 pr-3 font-mono">{s.lrn}</td>
                    {NCAE_AREAS.map((a) => (
                      <td key={a.key} className="py-1.5 pr-3 text-center">
                        <Input
                          className={cell}
                          inputMode="decimal"
                          value={scores[s.lrn]?.[a.key] ?? ''}
                          onChange={(e) => setCell(s.lrn, a.key, e.target.value)}
                        />
                      </td>
                    ))}
                    <td className="py-1.5 text-[11px] text-ink-muted">
                      {savingLrn === s.lrn ? 'Saving…' : ''}
                    </td>
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}
