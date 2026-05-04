import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Breadcrumb } from '@/components/shell/Breadcrumb';
import { SectionCard } from '@/components/entity/SectionCard';
import { classes } from '@/mocks';
import type { GradeLevel } from '@/types';

const GRADE_GROUPS: { label: string; levels: GradeLevel[] }[] = [
  { label: 'Pre-Elementary', levels: ['N1', 'N2', 'K'] },
  { label: 'Elementary', levels: ['I', 'II', 'III', 'IV', 'V', 'VI'] },
  { label: 'Junior High School', levels: ['VII', 'VIII', 'IX', 'X'] },
  {
    label: 'Senior High School',
    levels: ['XI-GAS', 'XI-HUMSS', 'XI-STEM', 'XI-ABM', 'XII-GAS', 'XII-HUMSS', 'XII-STEM', 'XII-ABM'],
  },
  { label: 'SPED', levels: ['S'] },
];

export default function SetupSections() {
  const navigate = useNavigate();

  return (
    <>
      <Breadcrumb items={[{ label: 'Setup', to: '/setup' }, { label: 'Sections' }]} />
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-ink-primary">Sections</h1>
          <p className="text-[13px] text-ink-secondary mt-1">
            Saint-named section master list. Sections persist across SYs; assign per-SY which grade level uses which.
          </p>
        </div>
        <Button onClick={() => navigate('/classes/new')}>
          <Plus className="w-3.5 h-3.5 mr-1" /> Add Section
        </Button>
      </div>

      <div className="flex flex-col gap-4">
        {GRADE_GROUPS.map((group) => {
          const groupClasses = classes.filter((c) => group.levels.includes(c.gradeLevel));
          if (groupClasses.length === 0) return null;
          return (
            <SectionCard key={group.label} heading={`${group.label} · ${groupClasses.length} sections`}>
              <table className="w-full text-[12.5px]">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-[0.04em] text-ink-muted border-b border-border">
                    <th className="py-1.5 pr-3 w-[15%]">Grade</th>
                    <th className="py-1.5 pr-3">Section</th>
                    <th className="py-1.5 pr-3">Adviser</th>
                    <th className="py-1.5 pr-3 w-[15%]">Curriculum</th>
                    <th className="py-1.5 text-right w-[12%]">Roster</th>
                  </tr>
                </thead>
                <tbody>
                  {groupClasses.map((c) => (
                    <tr
                      key={c.id}
                      onClick={() => navigate(`/classes/${c.id}`)}
                      className="border-b border-border-soft last:border-0 cursor-pointer hover:bg-app"
                    >
                      <td className="py-1.5 pr-3 font-mono text-ink-secondary">{c.gradeLevel}</td>
                      <td className="py-1.5 pr-3 font-medium">{c.sectionName}</td>
                      <td className="py-1.5 pr-3">
                        {c.adviser.title} {c.adviser.familyName}
                      </td>
                      <td className="py-1.5 pr-3 text-ink-secondary">{c.curriculum}</td>
                      <td className="py-1.5 text-right tabular-nums">{c.studentLrns.length}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </SectionCard>
          );
        })}
      </div>
    </>
  );
}
