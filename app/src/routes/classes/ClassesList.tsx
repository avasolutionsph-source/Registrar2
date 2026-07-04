import { useEffect, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Breadcrumb } from '@/components/shell/Breadcrumb';
import { listClasses, listStudentsLite } from '@/lib/db';
import { isAllTime } from '@/types';
import type { ClassRecord, GradeLevel, SchoolYear } from '@/types';

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
      // New strands (legacy kept so prior-year sections still group here)
      'XI-ASSH',
      'XI-STEM-ENG',
      'XI-STEM-HA',
      'XII-ASSH',
      'XII-STEM-ENG',
      'XII-STEM-HA',
    ],
  },
  { label: 'SNED', levels: ['S'] },
];

export default function ClassesList() {
  const navigate = useNavigate();
  const { currentSY } = useOutletContext<{ currentSY: SchoolYear | null }>();
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [countByClass, setCountByClass] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [cls, students] = await Promise.all([listClasses(), listStudentsLite()]);
        if (cancelled) return;
        setClasses(cls);
        const counts = new Map<string, number>();
        for (const s of students) {
          if (s.currentClassId) counts.set(s.currentClassId, (counts.get(s.currentClassId) ?? 0) + 1);
        }
        setCountByClass(counts);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load classes.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Filter the sections to the selected school year ("All time" shows every year).
  const visibleClasses = isAllTime(currentSY)
    ? classes
    : classes.filter((c) => c.sy === currentSY!.code);

  return (
    <>
      <Breadcrumb items={[{ label: 'Classes' }]} />
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-ink-primary">Classes</h1>
          <p className="text-[13px] text-ink-secondary mt-1">
            {loading
              ? 'Loading…'
              : `${visibleClasses.length} section${visibleClasses.length === 1 ? '' : 's'}` +
                (isAllTime(currentSY) ? ' · all years' : ` · ${currentSY!.label}`)}
          </p>
        </div>
        <Button onClick={() => navigate('/classes/new')}>
          <Plus className="w-3.5 h-3.5 mr-1" /> Add Class
        </Button>
      </div>

      {error ? (
        <p className="text-[13px] text-nps-red bg-nps-red/10 border border-nps-red/20 rounded-md px-3 py-2">
          {error}
        </p>
      ) : !loading && visibleClasses.length === 0 ? (
        <p className="text-[13px] text-ink-secondary">
          {classes.length === 0
            ? 'No classes yet. Click “Add Class” to create one.'
            : `No sections for ${currentSY?.label ?? 'this school year'}. Switch tabs (Old System) to browse another year.`}
        </p>
      ) : (
        <div className="flex flex-col gap-5">
          {GRADE_GROUPS.map((group) => {
            const groupClasses = visibleClasses.filter((c) => group.levels.includes(c.gradeLevel));
            if (groupClasses.length === 0) return null;
            return (
              <section key={group.label}>
                <h2 className="text-label uppercase font-bold text-ink-muted mb-2 px-1">
                  {group.label}
                </h2>
                <div className="grid grid-cols-3 gap-3">
                  {groupClasses.map((c) => {
                    const count = countByClass.get(c.id) ?? 0;
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
      )}
    </>
  );
}
