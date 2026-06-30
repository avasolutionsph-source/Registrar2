import { useEffect, useState } from 'react';
import { Heart } from 'lucide-react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { Breadcrumb } from '@/components/shell/Breadcrumb';
import { SectionCard } from '@/components/entity/SectionCard';
import { StatusBadge } from '@/components/entity/StatusBadge';
import { ExportCsvButton } from '@/components/ExportCsvButton';
import { listStudentsLite, listClasses } from '@/lib/db';
import { formatLastFirstMiddle } from '@/lib/format';
import { isAllTime } from '@/types';
import type { Student, ClassRecord, SchoolYear } from '@/types';

// A "loyalty awardee" is a student whose continuous NPS years (loyaltyYears) fall
// in a medal band for their terminal grade. Per the registrar:
//   • Grade 10 — Gold: continuous since N1/Kinder.
//   • Grade 12 — Gold: continuous since N1/Kinder; Silver: enrolled at NPS from
//     Grade 10 through Grade 12 (3 continuous years) but not the full program.
// Grade 6 is intentionally excluded to keep the list short. maxYears bounds a
// band so a Gold awardee never also appears under Silver.
const TIERS = [
  { id: 'X-gold', gradeKey: 'X', medal: 'Gold', label: 'Junior HS (Grade 10) · Gold', minYears: 11, maxYears: Infinity },
  { id: 'XII-gold', gradeKey: 'XII', medal: 'Gold', label: 'Senior HS (Grade 12) · Gold', minYears: 13, maxYears: Infinity },
  { id: 'XII-silver', gradeKey: 'XII', medal: 'Silver', label: 'Senior HS (Grade 12) · Silver', minYears: 3, maxYears: 12 },
];

export default function Loyalty() {
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
        /* leave empty — tiers show "no qualifying students" */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const eligibleFor = (tier: (typeof TIERS)[number]) =>
    students.filter((s) => {
      const klass = classes.find((c) => c.id === s.currentClassId);
      if (!klass) return false;
      if (!isAllTime(currentSY) && klass.sy !== currentSY?.code) return false;
      const matches =
        tier.gradeKey === 'X' ? klass.gradeLevel === 'X' : klass.gradeLevel.startsWith('XII');
      return matches && s.loyaltyYears >= tier.minYears && s.loyaltyYears <= tier.maxYears;
    });

  const awardees = TIERS.flatMap((tier) =>
    eligibleFor(tier).map((s) => ({
      tier: tier.label,
      medal: tier.medal,
      lrn: s.lrn,
      name: formatLastFirstMiddle(s),
      section: classes.find((c) => c.id === s.currentClassId)?.sectionName ?? '',
      years: s.loyaltyYears,
    })),
  );

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
        <ExportCsvButton
          rows={awardees}
          columns={[
            { header: 'Tier', value: (r) => r.tier },
            { header: 'Medal', value: (r) => r.medal },
            { header: 'LRN', value: (r) => r.lrn },
            { header: 'Name', value: (r) => r.name },
            { header: 'Section', value: (r) => r.section },
            { header: 'Years (NPS)', value: (r) => r.years },
          ]}
          filename={`loyalty-awardees-${currentSY?.code ?? 'all'}`}
        />
      </div>

      <div className="flex flex-col gap-3.5">
        {TIERS.map((tier) => {
          const eligible = eligibleFor(tier);
          return (
            <SectionCard
              key={tier.id}
              heading={`${tier.label} · ${eligible.length} awardee${eligible.length === 1 ? '' : 's'}`}
            >
              {eligible.length === 0 ? (
                <div className="flex items-center gap-2 text-[12.5px] text-ink-secondary px-1">
                  <Heart className="w-3.5 h-3.5 text-ink-muted" />
                  <span>
                    No qualifying students for this terminal grade in {currentSY?.label ?? 'any year'} (need {tier.minYears} continuous years).
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
