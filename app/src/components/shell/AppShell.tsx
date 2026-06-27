import { useState, useEffect, useMemo } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu, X, WifiOff } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { listSchoolYears, syncToDevice } from '@/lib/db';
import { getOfflineMeta } from '@/lib/offlineCache';
import npsLogo from '@/assets/nps-logo.png';
import type { SchoolYear } from '@/types';

// Two top-level modes: the active SY ("Current") vs every archived year
// ("Old System"). The whole app filters by the one effective school year.
export type RegMode = 'current' | 'old';

const STALE_MS = 2 * 60 * 60 * 1000; // refresh an existing offline copy if older than 2h

export function AppShell() {
  const [years, setYears] = useState<SchoolYear[] | null>(null);
  const [currentSY, setCurrentSY] = useState<SchoolYear | null>(null);
  const [mode, setMode] = useState<RegMode>('current');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);

  // Real school years from Supabase (replaces the old mock list).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await listSchoolYears();
        if (cancelled) return;
        setYears(list);
        setCurrentSY(list.find((sy) => sy.isActive) ?? list[list.length - 1] ?? null);
      } catch {
        if (!cancelled) setYears([]); // render the shell even if SY load fails
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Lock scroll when drawer open
  useEffect(() => {
    if (!mobileOpen) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  // Track connectivity for the offline banner.
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  // Keep an EXISTING offline copy fresh in the background (after the registrar has
  // opted in once on the Offline page). Never creates the first copy automatically.
  useEffect(() => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;
    let cancelled = false;
    getOfflineMeta()
      .then((m) => {
        if (cancelled || !m) return;
        if (Date.now() - new Date(m.lastSyncedAt).getTime() > STALE_MS) {
          syncToDevice().catch(() => {});
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const closeDrawer = () => setMobileOpen(false);

  // Split the years: the active one drives the "Current" tab; the rest are the
  // browsable "Old System" archive (newest first).
  const activeYear = useMemo(
    () => (years ? years.find((sy) => sy.isActive) ?? years[years.length - 1] ?? null : null),
    [years],
  );
  const oldYears = useMemo(
    () =>
      years
        ? years
            .filter((sy) => sy.code !== activeYear?.code)
            .sort((a, b) => b.code.localeCompare(a.code))
        : [],
    [years, activeYear],
  );

  const selectCurrent = () => {
    setMode('current');
    setCurrentSY(activeYear);
  };
  const selectOld = (sy: SchoolYear) => {
    setMode('old');
    setCurrentSY(sy);
  };

  if (years === null) {
    return (
      <div className="min-h-screen grid place-items-center bg-app">
        <div className="w-9 h-9 border-2 border-border border-t-nps-red rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-app">
      {/* Desktop sidebar — always visible >= md */}
      <div className="hidden md:flex">
        <Sidebar
          mode={mode}
          activeYear={activeYear}
          oldYears={oldYears}
          currentSY={currentSY}
          onSelectCurrent={selectCurrent}
          onSelectOld={selectOld}
        />
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-ink-primary/40"
          onClick={closeDrawer}
        >
          <div className="h-full w-[220px] shadow-lg" onClick={(e) => e.stopPropagation()}>
            <Sidebar
              mode={mode}
              activeYear={activeYear}
              oldYears={oldYears}
              currentSY={currentSY}
              onSelectCurrent={selectCurrent}
              onSelectOld={selectOld}
              onNavigate={closeDrawer}
            />
          </div>
        </div>
      )}

      <main className="flex-1 overflow-auto">
        {!online && (
          <div className="bg-amber-100 border-b border-amber-200 text-amber-800 text-[12px] px-4 py-1.5 flex items-center gap-2">
            <WifiOff className="w-3.5 h-3.5 shrink-0" />
            Offline — view &amp; print only. Adding or editing needs internet.
          </div>
        )}
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
          <span className="text-[11px] text-ink-secondary ml-auto">{currentSY?.label ?? ''}</span>
        </div>
        <div className="px-4 md:px-7 py-5 md:py-6 max-w-[1280px]">
          <Outlet context={{ currentSY, mode }} />
        </div>
      </main>
    </div>
  );
}
