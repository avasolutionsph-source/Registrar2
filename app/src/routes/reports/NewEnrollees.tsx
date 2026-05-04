import { useNavigate } from 'react-router-dom';
import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Breadcrumb } from '@/components/shell/Breadcrumb';
import { SectionCard } from '@/components/entity/SectionCard';
import { students, classes } from '@/mocks';
import { formatLastFirstMiddle } from '@/lib/format';
import { schoolIdFromLrn } from '@/lib/lrn';

export default function NewEnrollees() {
  const navigate = useNavigate();

  // First-time NPS enrollees = loyaltyYears <= 1 (joined this SY).
  const newOnes = students.filter((s) => s.loyaltyYears <= 1);

  return (
    <>
      <Breadcrumb items={[{ label: 'Reports', to: '/reports' }, { label: 'New Enrollees' }]} />
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-ink-primary">New Enrollees</h1>
          <p className="text-[13px] text-ink-secondary mt-1">
            Incoming students for SY 2025–2026, with their prior school info (derived from LRN[0:6] when no Elementary record is on file).
          </p>
        </div>
        <Button variant="outline" className="gap-2">
          <Printer className="w-3.5 h-3.5" /> Export PDF
        </Button>
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
                      {schoolIdFromLrn(s.lrn)}
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
