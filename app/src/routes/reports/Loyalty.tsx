import { Printer, Heart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Breadcrumb } from '@/components/shell/Breadcrumb';
import { SectionCard } from '@/components/entity/SectionCard';
import { StatusBadge } from '@/components/entity/StatusBadge';
import { students, classes } from '@/mocks';
import { formatLastFirstMiddle } from '@/lib/format';

// A "loyalty awardee" is a student whose loyaltyYears equals or exceeds the
// current grade level's full-program length (ie. continuous NPS enrollment).
const TIERS = [
  { key: 'VI', label: 'Elementary (Grade 6)', minYears: 7 },
  { key: 'X', label: 'Junior HS (Grade 10)', minYears: 11 },
  { key: 'XII', label: 'Senior HS (Grade 12)', minYears: 13 },
];

export default function Loyalty() {
  const navigate = useNavigate();

  return (
    <>
      <Breadcrumb items={[{ label: 'Reports', to: '/reports' }, { label: 'Loyalty Awardees' }]} />
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-ink-primary">Loyalty Awardees</h1>
          <p className="text-[13px] text-ink-secondary mt-1">
            Students with continuous NPS enrolment from N1/Kinder through their current grade.
          </p>
        </div>
        <Button variant="outline" className="gap-2">
          <Printer className="w-3.5 h-3.5" /> Export PDF
        </Button>
      </div>

      <div className="flex flex-col gap-3.5">
        {TIERS.map((tier) => {
          const eligible = students.filter((s) => {
            const klass = classes.find((c) => c.id === s.currentClassId);
            if (!klass) return false;
            const matches =
              tier.key === 'VI'
                ? klass.gradeLevel === 'VI'
                : tier.key === 'X'
                  ? klass.gradeLevel === 'X'
                  : klass.gradeLevel.startsWith('XII');
            return matches && s.loyaltyYears >= tier.minYears;
          });
          return (
            <SectionCard
              key={tier.key}
              heading={`${tier.label} · ${eligible.length} awardee${eligible.length === 1 ? '' : 's'}`}
            >
              {eligible.length === 0 ? (
                <div className="flex items-center gap-2 text-[12.5px] text-ink-secondary px-1">
                  <Heart className="w-3.5 h-3.5 text-ink-muted" />
                  <span>
                    No qualifying students for this terminal grade in SY 2025–2026 (need {tier.minYears} continuous years).
                  </span>
                </div>
              ) : (
                <table className="w-full text-[12.5px]">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-[0.04em] text-ink-muted border-b border-border">
                      <th className="py-1.5 pr-3 w-[14%]">LRN</th>
                      <th className="py-1.5 pr-3">Name</th>
                      <th className="py-1.5 pr-3 w-[22%]">Section</th>
                      <th className="py-1.5 w-[12%]">Yrs(NPS)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {eligible.map((s) => {
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
                            {klass?.sectionName ?? '—'}
                          </td>
                          <td className="py-1.5">
                            <StatusBadge tone="ok">{s.loyaltyYears}</StatusBadge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </SectionCard>
          );
        })}
      </div>
    </>
  );
}
