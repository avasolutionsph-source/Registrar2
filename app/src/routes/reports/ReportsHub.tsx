import { useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Award,
  GraduationCap,
  UserPlus,
  UserMinus,
  Hash,
  Heart,
  Cake,
  Route as RouteIcon,
  ClipboardList,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Breadcrumb } from '@/components/shell/Breadcrumb';

interface Tile {
  to: string;
  icon: LucideIcon;
  label: string;
  desc: string;
}

const TILES: Tile[] = [
  {
    to: '/reports/statistics',
    icon: BarChart3,
    label: 'Statistics',
    desc: 'Enrollment counts per grade level × section, per SY',
  },
  {
    to: '/reports/alumni',
    icon: Award,
    label: 'Alumni',
    desc: 'Forward-looking — current Grade 6, 10, 12 students about to graduate',
  },
  {
    to: '/reports/new-enrollees',
    icon: UserPlus,
    label: 'New Enrollees',
    desc: 'Incoming students with prior school info',
  },
  {
    to: '/reports/not-enrolled',
    icon: UserMinus,
    label: 'Not Enrolled',
    desc: "Students from prior years' DB who haven't re-enrolled",
  },
  {
    to: '/reports/student-no',
    icon: Hash,
    label: 'Student No.',
    desc: 'Lookup table — Student No. ↔ Name ↔ Grade/Section ↔ LRN',
  },
  {
    to: '/reports/honors',
    icon: GraduationCap,
    label: 'Academic Excellence Award',
    desc: 'GA ≥ 90, no grade below 80 — per term / year-end; verify vs. adviser lists',
  },
  {
    to: '/reports/loyalty',
    icon: Heart,
    label: 'Loyalty Awardees',
    desc: 'Students with continuous NPS enrollment, filtered per terminal grade',
  },
  {
    to: '/reports/tracking',
    icon: RouteIcon,
    label: 'Tracking Records',
    desc: 'Transferred-out / leaver / graduate destination records (print + CSV)',
  },
  {
    to: '/reports/birthdays',
    icon: Cake,
    label: 'Birthdays',
    desc: 'Active learners with birthdays per month (for SCO) — print + CSV',
  },
  {
    to: '/reports/teaching-assignments',
    icon: ClipboardList,
    label: 'Teaching Assignments',
    desc: 'Every subject × section and its teacher (as set by the Academic Coordinators); flags unassigned',
  },
];

export default function ReportsHub() {
  const navigate = useNavigate();
  return (
    <>
      <Breadcrumb items={[{ label: 'Reports' }]} />
      <div className="mb-5">
        <h1 className="text-xl font-bold text-ink-primary">Reports</h1>
        <p className="text-[13px] text-ink-secondary mt-1">
          Read-only views derived from the registrar's data.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {TILES.map(({ to, icon: Icon, label, desc }) => (
          <button
            key={to}
            onClick={() => navigate(to)}
            className="flex items-start gap-3 text-left bg-panel border border-border rounded-md p-4 hover:bg-panel-alt transition-colors"
          >
            <div className="w-9 h-9 rounded bg-sidebar grid place-items-center shrink-0">
              <Icon className="w-4 h-4 text-ink-primary" />
            </div>
            <div>
              <div className="text-[13.5px] font-semibold text-ink-primary">{label}</div>
              <div className="text-[12px] text-ink-secondary mt-0.5 leading-snug">{desc}</div>
            </div>
          </button>
        ))}
      </div>
    </>
  );
}
