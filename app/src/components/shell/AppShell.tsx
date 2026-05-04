import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { schoolYears } from '@/mocks';
import npsLogo from '@/assets/nps-logo.png';
import type { SchoolYear } from '@/types';

const activeSY = schoolYears.find((sy) => sy.isActive)!;

export function AppShell() {
  const [currentSY, setCurrentSY] = useState<SchoolYear>(activeSY);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Lock scroll when drawer open
  useEffect(() => {
    if (!mobileOpen) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  const closeDrawer = () => setMobileOpen(false);

  return (
    <div className="flex h-screen bg-app">
      {/* Desktop sidebar — always visible >= md */}
      <div className="hidden md:flex">
        <Sidebar currentSY={currentSY} onSYChange={setCurrentSY} />
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-ink-primary/40"
          onClick={closeDrawer}
        >
          <div className="h-full w-[220px] shadow-lg" onClick={(e) => e.stopPropagation()}>
            <Sidebar
              currentSY={currentSY}
              onSYChange={setCurrentSY}
              onNavigate={closeDrawer}
            />
          </div>
        </div>
      )}

      <main className="flex-1 overflow-auto">
        {/* Mobile top bar with hamburger */}
        <div className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-border bg-sidebar">
          <button
            onClick={() => setMobileOpen((o) => !o)}
            className="p-1.5 rounded hover:bg-panel/60 text-ink-primary"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
          <img src={npsLogo} alt="" className="w-7 h-7" />
          <span className="text-[12px] font-bold text-ink-primary">NPS Registrar</span>
          <span className="text-[11px] text-ink-secondary ml-auto">{currentSY.label}</span>
        </div>
        <div className="px-4 md:px-7 py-5 md:py-6 max-w-[1280px]">
          <Outlet context={{ currentSY }} />
        </div>
      </main>
    </div>
  );
}
