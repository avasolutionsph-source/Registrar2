import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Breadcrumb } from '@/components/shell/Breadcrumb';
import { SectionCard } from '@/components/entity/SectionCard';
import { getStudent } from '@/lib/db';
import { formatLastFirstMiddle } from '@/lib/format';
import { gradeLabel, formatSy } from '@/lib/forms';
import type { Student } from '@/types';

const ACTION_LABEL: Record<string, string> = {
  promoted: 'Promoted',
  retained: 'Retained',
  irregular: 'Irregular',
};

export default function EnrolmentDetails() {
  const { lrn } = useParams<{ lrn: string }>();
  const navigate = useNavigate();
  const [student, setStudent] = useState<Student | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!lrn) {
        setStudent(null);
        return;
      }
      try {
        const s = await getStudent(lrn);
        if (!cancelled) setStudent(s);
      } catch {
        if (!cancelled) setStudent(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [lrn]);

  if (student === undefined) {
    return (
      <div>
        <Breadcrumb items={[{ label: 'Students', to: '/students' }, { label: '…' }]} />
        <p className="text-ink-secondary text-sm">Loading…</p>
      </div>
    );
  }
  if (!student) {
    return (
      <div>
        <Breadcrumb items={[{ label: 'Students', to: '/students' }, { label: 'Not found' }]} />
        <p className="text-ink-secondary text-sm">No student with LRN {lrn}.</p>
      </div>
    );
  }

  const fullName = formatLastFirstMiddle(student);
  const history = [...(student.enrolmentHistory ?? [])].sort((a, b) => a.sy.localeCompare(b.sy));

  return (
    <div>
      <Breadcrumb
        items={[
          { label: 'Students', to: '/students' },
          { label: fullName, to: `/students/${student.lrn}` },
          { label: 'Enrolment details' },
        ]}
      />

      <div className="mb-3 flex items-center justify-between">
        <div>
          <h1 className="text-[16px] font-semibold text-ink-primary">Enrolment Details</h1>
          <p className="text-[12.5px] text-ink-secondary">
            {fullName} · LRN <span className="font-mono">{student.lrn}</span> · {history.length} year
            {history.length === 1 ? '' : 's'} on record
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate(`/students/${student.lrn}`)} className="gap-2">
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </Button>
      </div>

      <SectionCard heading="Year-by-year enrolment history">
        {history.length === 0 ? (
          <p className="text-[12.5px] text-ink-secondary px-1">No enrolment history on record.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-[0.04em] text-ink-muted border-b border-border">
                  <th className="py-1.5 pr-3">S.Y.</th>
                  <th className="py-1.5 pr-3">Grade</th>
                  <th className="py-1.5 pr-3">Section</th>
                  <th className="py-1.5 pr-3">School</th>
                  <th className="py-1.5 pr-3">Adviser</th>
                  <th className="py-1.5 pr-3 text-right">Days Present</th>
                  <th className="py-1.5 pr-3 text-right">Gen. Avg</th>
                  <th className="py-1.5">Action</th>
                </tr>
              </thead>
              <tbody>
                {history.map((e, i) => (
                  <tr key={`${e.sy}-${i}`} className="border-b border-border-soft last:border-0">
                    <td className="py-1.5 pr-3 font-mono whitespace-nowrap">{formatSy(e.sy)}</td>
                    <td className="py-1.5 pr-3 whitespace-nowrap">{gradeLabel(e.gradeLevel)}</td>
                    <td className="py-1.5 pr-3">{e.sectionName || '—'}</td>
                    <td className="py-1.5 pr-3 text-ink-secondary">{e.schoolName || '—'}</td>
                    <td className="py-1.5 pr-3 text-ink-secondary">{e.adviserName || '—'}</td>
                    <td className="py-1.5 pr-3 text-right tabular-nums">{e.daysPresent ?? '—'}</td>
                    <td className="py-1.5 pr-3 text-right tabular-nums">{e.generalAverage ?? '—'}</td>
                    <td className="py-1.5">{e.action ? ACTION_LABEL[e.action] ?? e.action : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
