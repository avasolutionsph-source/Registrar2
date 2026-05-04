import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  School,
  Users as UsersIcon,
  BookOpen,
  Layers,
  Building2,
  ShieldCheck,
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
    to: '/setup/school-year',
    icon: Calendar,
    label: 'School Year',
    desc: 'SY date range, school days per month, encoding deadlines per quarter',
  },
  {
    to: '/setup/grade-levels',
    icon: Layers,
    label: 'Grade & Year Levels',
    desc: 'Active levels (Pre-K → Grade 12 + SPED), IN/OUT toggle, legacy codes',
  },
  {
    to: '/setup/sections',
    icon: UsersIcon,
    label: 'Sections',
    desc: 'Saint-named sections; per-SY grade assignment',
  },
  {
    to: '/setup/subjects',
    icon: BookOpen,
    label: 'Subjects',
    desc: 'Master catalog (Core / Specialized / Applied / Elective) + SETS + Order',
  },
  {
    to: '/setup/schools',
    icon: School,
    label: 'Schools',
    desc: 'Master list of schools (referenced by transferee origin)',
  },
  {
    to: '/setup/admin',
    icon: ShieldCheck,
    label: 'Admin',
    desc: 'School positions (Registrar, Principal, Coordinators) and signatories',
  },
  {
    to: '/setup/teachers',
    icon: Building2,
    label: 'Teachers',
    desc: 'Teacher accounts and adviser assignments',
  },
];

export default function SetupHub() {
  const navigate = useNavigate();
  return (
    <>
      <Breadcrumb items={[{ label: 'Setup' }]} />
      <div className="mb-5">
        <h1 className="text-xl font-bold text-ink-primary">Setup</h1>
        <p className="text-[13px] text-ink-secondary mt-1">
          Once-a-year configuration. Touched rarely; touched carefully.
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
