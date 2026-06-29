import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Breadcrumb } from '@/components/shell/Breadcrumb';
import { SectionCard } from '@/components/entity/SectionCard';
import { ExportCsvButton } from '@/components/ExportCsvButton';
import { PrintHost } from '@/components/print/PrintHost';
import { TrackingRecord, type TrackingKind, type TrackingRow } from '@/components/print/TrackingRecord';
import { listStudentsLite, listClasses } from '@/lib/db';
import { formatLastFirstMiddle } from '@/lib/format';
import { gradeLabel } from '@/lib/forms';
import type { Student, ClassRecord, SchoolYear } from '@/types';

const KINDS: { key: TrackingKind; label: string; status: Student['status']; desc: string }[] = [
  { key: 'transfer', label: 'Transferred-Out', status: 'Transferred', desc: 'Students who transferred to another school' },
  { key: 'leavers', label: 'School Leavers', status: 'Dropped', desc: 'Students who left before completing' },
  { key: 'graduates', label: 'Graduates / Completers', status: 'Graduated', desc: 'Students who completed their terminal grade' },
];

export default function Tracking() {
  const navigate = useNavigate();
  const { currentSY } = useOutletContext<{ currentSY: SchoolYear | null }>();
  const [kind, setKind] = useState<TrackingKind>('transfer');
  const [students, setStudents] = useState<Student[]>([]);
  const [classById, setClassById] = useState<Map<string, ClassRecord>>(new Map());
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [s, c] = await Promise.all([listStudentsLite(), listClasses()]);
        if (cancelled) return;
        setStudents(s);
        setClassById(new Map(c.map((k) => [k.id, k])));
      } catch {
        /* leave empty — page shows "no students" */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const active = KINDS.find((k) => k.key === kind)!;

  const rows = useMemo<TrackingRow[]>(() => {
    return students
      .filter((s) => s.status === active.status)
      .map((s) => {
        const c = classById.get(s.currentClassId);
        return {
          name: formatLastFirstMiddle(s),
          lrn: s.lrn,
          gradeSection: c ? `${gradeLabel(c.gradeLevel)}${c.sectionName ? ` · ${c.sectionName}` : ''}` : '',
        };
      });
  }, [students, classById, active.status]);

  return (
    <>
      <Breadcrumb items={[{ label: 'Reports', to: '/reports' }, { label: 'Tracking Records' }]} />
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-ink-primary">Destination Tracking Records</h1>
          <p className="text-[13px] text-ink-secondary mt-1">
            Registrar's-office records for transferred-out, leaver, and graduate/completer students.
          </p>
        </div>
        <div className="flex gap-2">
          <ExportCsvButton
            rows={rows}
            columns={[
              { header: 'No.', value: (r) => rows.indexOf(r) + 1 },
              { header: 'Student Name', value: (r) => r.name },
              { header: 'LRN', value: (r) => r.lrn },
              { header: active.key === 'transfer' ? 'Grade/Section' : 'Grade/Section Completed', value: (r) => r.gradeSection },
            ]}
            filename={`${active.key}-tracking-${currentSY?.code ?? 'all'}`}
          />
          <Button className="gap-2" disabled={rows.length === 0} onClick={() => setPrinting(true)}>
            <Printer className="w-3.5 h-3.5" /> Print
          </Button>
        </div>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        {KINDS.map((k) => (
          <button
            key={k.key}
            onClick={() => setKind(k.key)}
            className={[
              'px-3 py-1.5 rounded text-[12.5px] border',
              kind === k.key
                ? 'bg-accent text-white border-accent'
                : 'bg-panel text-ink-secondary border-border hover:bg-panel-alt',
            ].join(' ')}
          >
            {k.label}
          </button>
        ))}
      </div>

      <SectionCard heading={`${active.label} · ${rows.length} student${rows.length === 1 ? '' : 's'}`}>
        <p className="text-[12px] text-ink-secondary px-1 mb-2">{active.desc}.</p>
        {rows.length === 0 ? (
          <p className="text-[12.5px] text-ink-secondary px-1">
            No students with status "{active.status}" yet. Receiving-school / reason / remarks are
            filled in on the printed form.
          </p>
        ) : (
          <table className="w-full text-[12.5px]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-[0.04em] text-ink-muted border-b border-border">
                <th className="py-1.5 pr-3 w-[6%]">No.</th>
                <th className="py-1.5 pr-3">Name</th>
                <th className="py-1.5 pr-3 w-[18%]">LRN</th>
                <th className="py-1.5 w-[28%]">
                  {active.key === 'transfer' ? 'Grade/Section' : 'Grade/Section Completed'}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr
                  key={r.lrn || i}
                  onClick={() => r.lrn && navigate(`/students/${r.lrn}`)}
                  className="border-b border-border-soft last:border-0 cursor-pointer hover:bg-app"
                >
                  <td className="py-1.5 pr-3 tabular-nums">{i + 1}</td>
                  <td className="py-1.5 pr-3">{r.name}</td>
                  <td className="py-1.5 pr-3 font-mono">{r.lrn}</td>
                  <td className="py-1.5 text-ink-secondary">{r.gradeSection}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </SectionCard>

      <PrintHost open={printing} docTitle={active.label} onClose={() => setPrinting(false)}>
        <TrackingRecord
          kind={kind}
          rows={rows}
          syLabel={kind !== 'transfer' ? (currentSY?.label ?? undefined) : undefined}
        />
      </PrintHost>
    </>
  );
}
