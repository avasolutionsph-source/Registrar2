import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Breadcrumb } from '@/components/shell/Breadcrumb';
import { SectionCard } from '@/components/entity/SectionCard';
import { StatusBadge } from '@/components/entity/StatusBadge';
import { subjects } from '@/mocks';
import type { SubjectCategory } from '@/types';

const CATEGORIES: SubjectCategory[] = ['Core', 'Specialized', 'Applied', 'Elective'];

const toneFor = (cat: SubjectCategory): 'ok' | 'pending' | 'na' =>
  cat === 'Core' ? 'ok' : cat === 'Specialized' ? 'pending' : 'na';

export default function SetupSubjects() {
  return (
    <>
      <Breadcrumb items={[{ label: 'Setup', to: '/setup' }, { label: 'Subjects' }]} />
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-ink-primary">Subjects</h1>
          <p className="text-[13px] text-ink-secondary mt-1">
            Master subject catalog. SETS and Order Subjects (per-SY assignment) live in their own sub-pages.
          </p>
        </div>
        <Button>
          <Plus className="w-3.5 h-3.5 mr-1" /> Add Subject
        </Button>
      </div>

      <div className="flex gap-2 mb-3 flex-wrap text-[12px]">
        <span className="text-ink-muted self-center">Tabs (legacy 3-tier):</span>
        <button className="px-3 py-1 rounded bg-accent text-white">Add Subjects</button>
        <button className="px-3 py-1 rounded bg-panel border border-border text-ink-secondary hover:bg-panel-alt">
          Setup Subjects (per-SY items + %)
        </button>
        <button className="px-3 py-1 rounded bg-panel border border-border text-ink-secondary hover:bg-panel-alt">
          Order Subjects (set → grade)
        </button>
      </div>

      <div className="flex flex-col gap-3.5">
        {CATEGORIES.map((cat) => {
          const rows = subjects.filter((s) => s.category === cat);
          if (rows.length === 0) return null;
          return (
            <SectionCard key={cat} heading={`${cat} · ${rows.length} subjects`}>
              <table className="w-full text-[12.5px]">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-[0.04em] text-ink-muted border-b border-border">
                    <th className="py-1.5 pr-3 w-[12%]">Code</th>
                    <th className="py-1.5 pr-3">Full Name</th>
                    <th className="py-1.5 pr-3 w-[14%]">Abbr</th>
                    <th className="py-1.5 w-[14%]">Category</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((s) => (
                    <tr key={s.code} className="border-b border-border-soft last:border-0">
                      <td className="py-1.5 pr-3 font-mono text-ink-secondary">{s.code}</td>
                      <td className="py-1.5 pr-3">{s.fullName}</td>
                      <td className="py-1.5 pr-3 text-ink-secondary">{s.abbreviation}</td>
                      <td className="py-1.5">
                        <StatusBadge tone={toneFor(s.category)}>{s.category}</StatusBadge>
                      </td>
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
