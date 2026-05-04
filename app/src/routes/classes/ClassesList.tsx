import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Breadcrumb } from '@/components/shell/Breadcrumb';
import { classes, students } from '@/mocks';
import type { ClassRecord, GradeLevel } from '@/types';

function rosterCount(c: ClassRecord) {
  return c.studentLrns.length || students.filter((s) => s.currentClassId === c.id).length;
}

const GRADE_GROUPS: { label: string; levels: GradeLevel[] }[] = [
  { label: 'Pre-Elem', levels: ['N1', 'N2', 'K'] },
  { label: 'Elementary', levels: ['I', 'II', 'III', 'IV', 'V', 'VI'] },
  { label: 'Junior HS', levels: ['VII', 'VIII', 'IX', 'X'] },
  {
    label: 'Senior HS',
    levels: [
      'XI-GAS',
      'XI-HUMSS',
      'XI-STEM',
      'XI-ABM',
      'XII-GAS',
      'XII-HUMSS',
      'XII-STEM',
      'XII-ABM',
    ],
  },
  { label: 'SPED', levels: ['S'] },
];

export default function ClassesList() {
  const navigate = useNavigate();

  return (
    <>
      <Breadcrumb items={[{ label: 'Classes' }]} />
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-ink-primary">Classes</h1>
          <p className="text-[13px] text-ink-secondary mt-1">
            {classes.length} sections in SY 2025–2026
          </p>
        </div>
        <Button onClick={() => navigate('/classes/new')}>
          <Plus className="w-3.5 h-3.5 mr-1" /> Add Class
        </Button>
      </div>

      <div className="flex flex-col gap-5">
        {GRADE_GROUPS.map((group) => {
          const groupClasses = classes.filter((c) => group.levels.includes(c.gradeLevel));
          if (groupClasses.length === 0) return null;
          return (
            <section key={group.label}>
              <h2 className="text-label uppercase font-bold text-ink-muted mb-2 px-1">
                {group.label}
              </h2>
              <div className="grid grid-cols-3 gap-3">
                {groupClasses.map((c) => {
                  const count = rosterCount(c);
                  return (
                    <button
                      key={c.id}
                      onClick={() => navigate(`/classes/${c.id}`)}
                      className="text-left bg-panel border border-border rounded-md p-3.5 hover:bg-panel-alt transition-colors"
                    >
                      <div className="text-[11px] uppercase tracking-[0.04em] text-ink-muted">
                        Grade {c.gradeLevel}
                      </div>
                      <div className="text-[14px] font-semibold text-ink-primary mt-0.5">
                        {c.sectionName}
                      </div>
                      <div className="text-[12px] text-ink-secondary mt-2">
                        {c.adviser.title} {c.adviser.familyName}
                      </div>
                      <div className="text-[11.5px] text-ink-muted mt-1">
                        {count} {count === 1 ? 'learner' : 'learners'}
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
