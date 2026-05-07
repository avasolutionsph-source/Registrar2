import { NavLink, useNavigate } from 'react-router-dom';
import { Users, GraduationCap, UserCog, Settings, BarChart3, LogOut } from 'lucide-react';
import { SchoolYearSelector } from './SchoolYearSelector';
import npsLogo from '@/assets/nps-logo.png';
import type { SchoolYear } from '@/types';

interface Props {
  currentSY: SchoolYear;
  onSYChange: (sy: SchoolYear) => void;
  onNavigate?: () => void;
}

const navItems = [
  { to: '/students', label: 'Students', icon: Users },
  { to: '/classes', label: 'Classes', icon: GraduationCap },
  { to: '/teachers', label: 'Teachers', icon: UserCog },
  { to: '/setup', label: 'Setup', icon: Settings },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
];

export function Sidebar({ currentSY, onSYChange, onNavigate }: Props) {
  const navigate = useNavigate();
  return (
    <aside className="w-[200px] shrink-0 bg-sidebar border-r border-border p-3 flex flex-col gap-3 h-full">
      <div className="flex items-center gap-2 px-1 py-1">
        <img
          src={npsLogo}
          alt="Naga Parochial School seal"
          className="w-9 h-9 shrink-0"
          loading="eager"
        />
        <div className="leading-tight">
          <div className="text-[11px] font-bold text-ink-primary">Naga Parochial</div>
          <div className="text-[10.5px] text-ink-muted tracking-[0.04em] uppercase">Registrar</div>
        </div>
      </div>
      <SchoolYearSelector value={currentSY} onChange={onSYChange} />
      <nav className="flex flex-col gap-0.5">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={() => onNavigate?.()}
            className={({ isActive }) =>
              [
                'flex items-center gap-2.5 px-2.5 py-2 rounded text-[12.5px]',
                isActive ? 'bg-accent text-white' : 'text-ink-secondary hover:bg-panel/60',
              ].join(' ')
            }
          >
            <Icon className="w-3.5 h-3.5 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto pt-3 border-t border-border-soft flex flex-col gap-2">
        <div className="flex items-center gap-2 px-1">
          <div className="w-7 h-7 rounded-full bg-panel border border-border grid place-items-center text-[11px] font-bold text-ink-secondary">
            R
          </div>
          <div className="leading-tight">
            <div className="text-[12px] text-ink-primary font-medium">Registrar</div>
            <div className="text-[10.5px] text-ink-muted">Single role · prototype</div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            onNavigate?.();
            navigate('/login');
          }}
          className="flex items-center gap-2 px-2 py-1.5 rounded text-[12px] text-ink-secondary hover:bg-panel/60 hover:text-ink-primary"
        >
          <LogOut className="w-3.5 h-3.5" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
