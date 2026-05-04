import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Breadcrumb } from '@/components/shell/Breadcrumb';
import { SectionCard } from '@/components/entity/SectionCard';
import { schoolYears } from '@/mocks';

const QUARTERS = ['1st Quarter', '2nd Quarter', '3rd Quarter', '4th Quarter'];
const MONTHS = ['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May'];

export default function SetupSchoolYear() {
  const active = schoolYears.find((sy) => sy.isActive)!;
  const [, setSelected] = useState(active.code);

  return (
    <>
      <Breadcrumb
        items={[{ label: 'Setup', to: '/setup' }, { label: 'School Year' }]}
      />
      <div className="mb-5">
        <h1 className="text-xl font-bold text-ink-primary">School Year</h1>
        <p className="text-[13px] text-ink-secondary mt-1">
          Configure SY date range, school days per month, and grade-encoding deadlines per quarter.
        </p>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        {schoolYears.map((sy) => (
          <button
            key={sy.code}
            onClick={() => setSelected(sy.code)}
            className={[
              'px-3 py-1.5 rounded text-[12.5px] border',
              sy.isActive
                ? 'bg-accent text-white border-accent'
                : 'bg-panel text-ink-secondary border-border hover:bg-panel-alt',
            ].join(' ')}
          >
            {sy.label}
            {sy.isActive && <CheckCircle2 className="w-3.5 h-3.5 inline-block ml-1.5 -translate-y-px" />}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3.5 max-w-3xl">
        <SectionCard heading="Date range">
          <div className="grid grid-cols-2 gap-3 px-1">
            <label className="block">
              <span className="text-[12px] text-ink-secondary block mb-1">Start date</span>
              <Input type="date" defaultValue={active.startDate} />
            </label>
            <label className="block">
              <span className="text-[12px] text-ink-secondary block mb-1">End date</span>
              <Input type="date" defaultValue={active.endDate} />
            </label>
          </div>
        </SectionCard>

        <SectionCard heading="School days per month">
          <p className="text-[11.5px] text-ink-muted mb-2 px-1">
            Drives attendance reports. Holidays and suspensions subtract from these.
          </p>
          <div className="grid grid-cols-6 gap-2 px-1">
            {MONTHS.map((m) => (
              <label key={m} className="block">
                <span className="text-[11px] text-ink-secondary block mb-0.5">{m}</span>
                <Input type="number" min={0} max={31} defaultValue={m === 'Apr' ? 5 : m === 'May' || m === 'Jun' ? 0 : 20} />
              </label>
            ))}
          </div>
        </SectionCard>

        <SectionCard heading="Grade-encoding deadlines">
          <p className="text-[11.5px] text-ink-muted mb-2 px-1">
            Encoding window opens 5 days after each quarter's start date (legacy NPS rule).
          </p>
          <div className="grid grid-cols-2 gap-3 px-1">
            {QUARTERS.map((q) => (
              <label key={q} className="block">
                <span className="text-[12px] text-ink-secondary block mb-1">{q}</span>
                <Input type="date" />
              </label>
            ))}
          </div>
        </SectionCard>

        <div className="flex gap-2 justify-end">
          <Button variant="outline">Cancel</Button>
          <Button>Save changes</Button>
        </div>
      </div>
    </>
  );
}
