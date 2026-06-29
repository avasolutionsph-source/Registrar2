import { useEffect, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { Breadcrumb } from '@/components/shell/Breadcrumb';
import { SectionCard } from '@/components/entity/SectionCard';
import { ExportCsvButton } from '@/components/ExportCsvButton';
import { listStudentsLite, listClasses } from '@/lib/db';
import { formatLastFirstMiddle } from '@/lib/format';
import { schoolIdFromLrn } from '@/lib/lrn';
import type { Student, ClassRecord, SchoolYear } from '@/types';

export default function NewEnrollees() {
  const navigate = useNavigate();
  const { currentSY } = useOutletContext<{ currentSY: SchoolYear | null }>();
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassRecord[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [s, c] = await Promise.all([listStudentsLite(), listClasses()]);
        if (cancelled) return;
        setStudents(s);
        setClasses(c);
      } catch {
        /* leave empty — page shows "no new enrollees" */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // First-time NPS enrollees = loyaltyYears <= 1 (joined this SY).
  const newOnes = students.filter((s) => s.loyaltyYears <= 1);

  return (
    <>
      <Breadcrumb items={[{ label: 'Reports', to: '/reports' }, { label: 'New Enrollees' }]} />
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-ink-primary">New Enrollees</h1>
          <p className="text-[13px] text-ink-secondary mt-1">
            Incoming students for {currentSY?.label ?? 'this year'}, with their prior school info (derived from LRN[0:6] when no Elementary record is on file).
          </p>
        </div>
        <ExportCsvButton
          rows={newOnes}
          columns={[
            { header: 'LRN', value: (s) => s.lrn },
            { header: 'Name', value: (s) => formatLastFirstMiddle(s) },
            {
              header: 'Class',
              value: (s) => {
                const c = classes.find((k) => k.id === s.currentClassId);
                return c ? `Grade ${c.gradeLevel} · ${c.sectionName}` : '';
              },
            },
            { header: 'From School ID', value: (s) => (/^\d{12}$/.test(s.lrn) ? schoolIdFromLrn(s.lrn) : '') },
            { header: 'Elem School', value: (s) => s.elemSchoolGraduatedFrom },
          ]}
          filename={`new-enrollees-${currentSY?.code ?? 'all'}`}
        />
      </div>

      <SectionCard heading={`${newOnes.length} new enrollee${newOnes.length === 1 ? '' : 's'}`}>
        {newOnes.length === 0 ? (
          <p className="text-[12.5px] text-ink-secondary px-1">No new enrollees this SY.</p>
        ) : (
          <table className="w-full text-[12.5px]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-[0.04em] text-ink-muted border-b border-border">
                <th className="py-1.5 pr-3 w-[14%]">LRN</th>
                <th className="py-1.5 pr-3">Name</th>
                <th className="py-1.5 pr-3 w-[18%]">Class</th>
                <th className="py-1.5 pr-3 w-[14%]">From School ID</th>
                <th className="py-1.5 w-[20%]">Elem School (if any)</th>
              </tr>
            </thead>
            <tbody>
              {newOnes.map((s) => {
                const klass = classes.find((c) => c.id === s.currentClassId);
                return (
                  <tr
                    key={s.lrn}
                    onClick={() => navigate(`/students/${s.lrn}`)}
                    className="border-b border-border-soft last:border-0 cursor-pointer hover:bg-app"
                  >
                    <td className="py-1.5 pr-3 font-mono">{s.lrn}</td>
                    <td className="py-1.5 pr-3">{formatLastFirstMiddle(s)}</td>
                    <td className="py-1.5 pr-3 text-ink-secondary">
                      {klass ? `Grade ${klass.gradeLevel} · ${klass.sectionName}` : '—'}
                    </td>
                    <td className="py-1.5 pr-3 font-mono text-ink-secondary">
                      {/^\d{12}$/.test(s.lrn) ? schoolIdFromLrn(s.lrn) : '—'}
                    </td>
                    <td className="py-1.5 text-ink-secondary">
                      {s.elemSchoolGraduatedFrom || (
                        <span className="text-ink-muted">— (first year of schooling)</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </SectionCard>
    </>
  );
}
