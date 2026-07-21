import { useEffect, useMemo, useState } from 'react';
import { Printer, FileSearch } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Breadcrumb } from '@/components/shell/Breadcrumb';
import { SectionCard } from '@/components/entity/SectionCard';
import { ExportCsvButton } from '@/components/ExportCsvButton';
import { PrintHost } from '@/components/print/PrintHost';
import { Letterhead } from '@/components/print/parts';
import { listStudents, listClasses } from '@/lib/db';
import { formatLastFirstMiddle } from '@/lib/format';
import { gradeLabel } from '@/lib/forms';
import { isAllTime } from '@/types';
import type { SchoolYear, Student, ClassRecord } from '@/types';

interface Row {
  lrn: string;
  name: string;
  lastSy: string;
  lastGrade: string;
  lastSection: string;
  status: Student['status'];
}

export default function NotEnrolled() {
  const { currentSY } = useOutletContext<{ currentSY: SchoolYear | null }>();
  const code = currentSY?.code;
  const allTime = isAllTime(currentSY);

  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [st, cls] = await Promise.all([listStudents(), listClasses()]);
        if (cancelled) return;
        setStudents(st);
        setClasses(cls);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load students.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const rows = useMemo<Row[]>(() => {
    if (!code || allTime) return [];
    const classById = new Map(classes.map((c) => [c.id, c]));
    const out: Row[] = [];
    for (const s of students) {
      const hist = s.enrolmentHistory ?? [];
      if (hist.length === 0) continue; // never enrolled here → not a returnee
      // Enrolled this SY if their active class is a current-SY class, or history
      // already carries a current-SY row.
      const currentClassSy = s.currentClassId ? classById.get(s.currentClassId)?.sy : undefined;
      const enrolledNow = currentClassSy === code || hist.some((h) => String(h.sy) === code);
      if (enrolledNow) continue;
      if (s.status === 'Graduated') continue; // finished — not expected to re-enrol
      // Most recent prior enrolment (drives the "last in" columns).
      const last = [...hist].sort((a, b) => String(b.sy).localeCompare(String(a.sy)))[0];
      out.push({
        lrn: s.lrn,
        name: formatLastFirstMiddle(s),
        lastSy: String(last?.sy ?? '—'),
        lastGrade: last?.gradeLevel ?? '—',
        lastSection: last?.sectionName ?? '—',
        status: s.status,
      });
    }
    return out.sort(
      (a, b) => a.lastGrade.localeCompare(b.lastGrade) || a.name.localeCompare(b.name),
    );
  }, [students, classes, code, allTime]);

  const table = (
    <table className="w-full text-[12.5px] border-collapse text-black">
      <thead>
        <tr className="text-[11px] uppercase tracking-[0.03em] bg-zinc-100">
          <th className="border border-zinc-400 px-2 py-1.5 text-right w-8">#</th>
          <th className="border border-zinc-400 px-2 py-1.5 text-left">Name</th>
          <th className="border border-zinc-400 px-2 py-1.5 text-left">LRN</th>
          <th className="border border-zinc-400 px-2 py-1.5 text-left">Last SY</th>
          <th className="border border-zinc-400 px-2 py-1.5 text-left">Last Grade &amp; Section</th>
          <th className="border border-zinc-400 px-2 py-1.5 text-left">Status</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={r.lrn}>
            <td className="border border-zinc-400 px-2 py-1 text-right tabular-nums">{i + 1}</td>
            <td className="border border-zinc-400 px-2 py-1">{r.name}</td>
            <td className="border border-zinc-400 px-2 py-1 font-mono">{r.lrn}</td>
            <td className="border border-zinc-400 px-2 py-1">{r.lastSy}</td>
            <td className="border border-zinc-400 px-2 py-1">{gradeLabel(r.lastGrade)} · {r.lastSection}</td>
            <td className="border border-zinc-400 px-2 py-1">{r.status}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <>
      <Breadcrumb items={[{ label: 'Reports', to: '/reports' }, { label: 'Not Enrolled' }]} />
      <div className="mb-4 flex items-start justify-between print:hidden">
        <div>
          <h1 className="text-xl font-bold text-ink-primary">Not Enrolled</h1>
          <p className="text-[13px] text-ink-secondary mt-1 max-w-2xl">
            Students from prior years who have not re-enrolled for {currentSY?.label ?? 'this year'}.
            For follow-up before the enrolment window closes.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" disabled={rows.length === 0} onClick={() => setPrinting(true)}>
            <Printer className="w-3.5 h-3.5" /> Print
          </Button>
          <ExportCsvButton
            rows={rows}
            columns={[
              { header: 'Name', value: (r) => r.name },
              { header: 'LRN', value: (r) => r.lrn },
              { header: 'Last SY', value: (r) => r.lastSy },
              { header: 'Last Grade', value: (r) => gradeLabel(r.lastGrade) },
              { header: 'Last Section', value: (r) => r.lastSection },
              { header: 'Status', value: (r) => r.status },
            ]}
            filename={`not-enrolled-${code ?? 'sy'}`}
          />
        </div>
      </div>

      {error ? (
        <p className="text-[13px] text-nps-red bg-nps-red/10 border border-nps-red/20 rounded-md px-3 py-2">{error}</p>
      ) : allTime ? (
        <SectionCard heading="Pick a school year">
          <p className="text-[12.5px] text-ink-secondary px-1 py-2">
            Choose a specific school year (not “All years”) to see who has not re-enrolled for it.
          </p>
        </SectionCard>
      ) : loading ? (
        <p className="text-[13px] text-ink-secondary">Loading…</p>
      ) : rows.length === 0 ? (
        <SectionCard heading={`Everyone from prior years is accounted for in ${currentSY?.label ?? 'this year'}`}>
          <div className="flex items-start gap-3 px-1 py-2">
            <div className="w-9 h-9 rounded bg-sidebar grid place-items-center shrink-0">
              <FileSearch className="w-4 h-4 text-ink-primary" />
            </div>
            <p className="text-[12.5px] text-ink-secondary leading-relaxed">
              No prior-year student is missing a current-SY enrolment. Graduated learners are excluded.
            </p>
          </div>
        </SectionCard>
      ) : (
        <SectionCard heading={`${rows.length} student${rows.length === 1 ? '' : 's'} did not enrol for ${currentSY?.label ?? 'this year'}`}>
          <div className="overflow-x-auto">{table}</div>
        </SectionCard>
      )}

      <PrintHost
        open={printing}
        docTitle={`Not Enrolled · SY ${code ?? ''}`}
        onClose={() => setPrinting(false)}
      >
        <Letterhead docTitle="Did Not Enrol For This School Year" docSubtitle={`School Year ${code ?? ''}`} />
        <div className="mt-3">{table}</div>
      </PrintHost>
    </>
  );
}
