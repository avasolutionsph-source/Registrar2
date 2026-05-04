import { useLocation } from 'react-router-dom';
import { Wrench } from 'lucide-react';
import { Breadcrumb } from '@/components/shell/Breadcrumb';
import { SectionCard } from '@/components/entity/SectionCard';

const SETUP_LABELS: Record<string, { title: string; desc: string }> = {
  'grade-levels': {
    title: 'Grade & Year Levels',
    desc: 'Manage active grade/year levels (Pre-K → Grade 12 + SPED), IN/OUT toggle, and legacy codes used for transferee compatibility.',
  },
  sections: {
    title: 'Sections',
    desc: 'Saint-named section master list. Per-SY assignment of sections to grade levels.',
  },
  subjects: {
    title: 'Subjects',
    desc: 'Master subject catalog (Core / Specialized / Applied / Elective), SETS (predefined ordered subject lists), and Order Subjects (set → grade level mapping).',
  },
  schools: {
    title: 'Schools',
    desc: "Master list of schools referenced by transferee origin (LRN's first 6 digits map to a school here).",
  },
  admin: {
    title: 'Admin',
    desc: 'Assign teachers to school positions (Registrar, Principal, Coordinators, Director, Finance) and Subject Area Coordinators. Drives auto-populated signatures on Form 137 / Form 138.',
  },
  teachers: {
    title: 'Teachers (Setup view)',
    desc: 'Teacher accounts and adviser assignments. The Teachers sidebar bucket has the same data — this Setup entry is a shortcut.',
  },
};

const REPORTS_LABELS: Record<string, { title: string; desc: string }> = {
  alumni: {
    title: 'Alumni',
    desc: 'Forward-looking — current Grade 6, 10, and 12 students about to graduate. Filter by terminal grade.',
  },
  'new-enrollees': {
    title: 'New Enrollees',
    desc: 'Incoming students with their prior school information for the current SY.',
  },
  'not-enrolled': {
    title: 'Not Enrolled',
    desc: "Students from prior years' DB who haven't re-enrolled this SY. Includes their last-year grade and section.",
  },
  'student-no': {
    title: 'Student No. Lookup',
    desc: 'Comprehensive lookup table — Student No. ↔ Name ↔ Grade/Section ↔ LRN. Useful for resolving record inquiries.',
  },
  loyalty: {
    title: 'Loyalty Awardees',
    desc: 'Students with continuous NPS enrollment from N1/K through their current grade. Filter per terminal grade (6 / 10 / 12).',
  },
};

function lookupLabels(scope: 'setup' | 'reports', key: string) {
  const dict = scope === 'setup' ? SETUP_LABELS : REPORTS_LABELS;
  return (
    dict[key] ?? {
      title: key.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      desc: 'This page will be built out next.',
    }
  );
}

export default function ComingSoon() {
  const { pathname } = useLocation();
  const segments = pathname.replace(/^\/+|\/+$/g, '').split('/');
  const scope = segments[0] === 'setup' || segments[0] === 'reports' ? segments[0] : 'setup';
  const key = segments[1] ?? '';
  const meta = lookupLabels(scope as 'setup' | 'reports', key);
  const parentLabel = scope === 'setup' ? 'Setup' : 'Reports';

  return (
    <>
      <Breadcrumb
        items={[
          { label: parentLabel, to: `/${scope}` },
          { label: meta.title },
        ]}
      />
      <div className="mb-5">
        <h1 className="text-xl font-bold text-ink-primary">{meta.title}</h1>
        <p className="text-[13px] text-ink-secondary mt-1">{meta.desc}</p>
      </div>

      <SectionCard heading="Not yet built">
        <div className="flex items-start gap-3 px-1 py-1">
          <div className="w-9 h-9 rounded bg-sidebar grid place-items-center shrink-0">
            <Wrench className="w-4 h-4 text-ink-primary" />
          </div>
          <div className="text-[12.5px] text-ink-secondary leading-relaxed">
            <p>
              This sub-page is a known item but hasn't been built yet — kept on the tile grid so the
              full navigation structure is visible. Per the project's <em>less-is-better</em> rule,
              we extend pages on demand rather than scaffolding placeholders for every legacy
              feature up front.
            </p>
            <p className="mt-2">
              Tell me <span className="font-semibold">"build the {meta.title} page"</span> and I'll
              scaffold it next.
            </p>
          </div>
        </div>
      </SectionCard>
    </>
  );
}
