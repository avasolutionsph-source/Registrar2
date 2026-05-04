import { Printer, FileSearch } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Breadcrumb } from '@/components/shell/Breadcrumb';
import { SectionCard } from '@/components/entity/SectionCard';

export default function NotEnrolled() {
  return (
    <>
      <Breadcrumb items={[{ label: 'Reports', to: '/reports' }, { label: 'Not Enrolled' }]} />
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-ink-primary">Not Enrolled</h1>
          <p className="text-[13px] text-ink-secondary mt-1">
            Students from prior years' database who haven't re-enrolled this SY. Useful for follow-up calls before the enrolment window closes.
          </p>
        </div>
        <Button variant="outline" className="gap-2">
          <Printer className="w-3.5 h-3.5" /> Export PDF
        </Button>
      </div>

      <SectionCard heading="0 students did not enrol for SY 2025–2026">
        <div className="flex items-start gap-3 px-1 py-2">
          <div className="w-9 h-9 rounded bg-sidebar grid place-items-center shrink-0">
            <FileSearch className="w-4 h-4 text-ink-primary" />
          </div>
          <div className="text-[12.5px] text-ink-secondary leading-relaxed">
            <p>
              Empty in the prototype because the mock database only carries the SY 2025–2026 roster.
              When real data is wired in, this page will compare last-SY enrolment against the current SY
              and list students with no current enrolment record, alongside the grade and section they
              were last in.
            </p>
            <p className="mt-2 text-[11.5px] text-ink-muted">
              Legacy header: <span className="font-mono">DID NOT ENROL FOR THIS SCHOOL YEAR</span>.
            </p>
          </div>
        </div>
      </SectionCard>
    </>
  );
}
