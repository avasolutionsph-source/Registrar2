import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Check, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Breadcrumb } from '@/components/shell/Breadcrumb';
import { SectionCard } from '@/components/entity/SectionCard';
import {
  listSasScope,
  saveSasAreaDepts,
  saveSasAreaSubjects,
  listUnsupervisedSubjects,
  listSubjects,
  listUserRoles,
  SAS_DEPTS,
  type SasAreaScope,
} from '@/lib/db';
import type { Subject } from '@/types';

// Setup → Subject Area Supervisors. Which subjects and which levels each
// supervisor area covers.
//
// Both halves used to be out of reach: the subject list lived only in a seeded
// SQL table, and the level rule was hardcoded inside sas_teacher_loads. A
// subject added to the curriculum therefore reached NO supervisor, silently —
// which is what the coverage warning at the top of this page is for.
//
// What is set here is the whole of what a supervisor sees: the sas_* RPCs read
// these two tables through sas_my_scope(). Registrar-only, enforced by RLS.

const AREAS: { role: string; label: string }[] = [
  { role: 'sas_clve', label: 'Christian Living and Values Education' },
  { role: 'sas_english', label: 'Communication Arts / English' },
  { role: 'sas_math', label: 'Mathematics' },
  { role: 'sas_science', label: 'Science' },
  { role: 'sas_ap', label: 'Araling Panlipunan' },
  { role: 'sas_filipino', label: 'Filipino' },
  { role: 'sas_mapeh', label: 'MAPEH' },
  { role: 'sas_ict', label: 'Information and Communication Technology (ICT)' },
  { role: 'sas_epp_tle', label: 'EPP / TLE' },
];

const emptyScope = (role: string): SasAreaScope => ({ role, depts: [], subjectCodes: [] });

export default function SetupSubjectAreas() {
  const [scope, setScope] = useState<Record<string, SasAreaScope> | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [holders, setHolders] = useState<Record<string, string[]>>({});
  const [gaps, setGaps] = useState<string[]>([]);
  const [openArea, setOpenArea] = useState<string | null>(null);
  const [savingRole, setSavingRole] = useState<string | null>(null);
  const [savedRole, setSavedRole] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [rows, subs, roles, missing] = await Promise.all([
          listSasScope(),
          listSubjects(),
          listUserRoles().catch(() => []),
          listUnsupervisedSubjects().catch(() => []),
        ]);
        if (cancelled) return;
        const byRole: Record<string, SasAreaScope> = {};
        for (const a of AREAS) byRole[a.role] = emptyScope(a.role);
        for (const r of rows) byRole[r.role] = r;
        setScope(byRole);
        setSubjects(subs);
        setGaps(missing);
        const held: Record<string, string[]> = {};
        for (const r of roles) {
          if (r.role.startsWith('sas_')) (held[r.role] ??= []).push(r.email);
        }
        setHolders(held);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load the supervisor areas.');
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Which area (if any) already claims a subject — a code may only belong to
  // one, or two supervisors would check the same sheet.
  const ownerOf = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of Object.values(scope ?? {})) {
      for (const code of s.subjectCodes) m.set(code.toUpperCase(), s.role);
    }
    return m;
  }, [scope]);

  const subjectName = useMemo(() => {
    const m = new Map(subjects.map((s) => [s.code.toUpperCase(), s.fullName]));
    return (code: string) => m.get(code.toUpperCase()) ?? code;
  }, [subjects]);

  function toggleDept(role: string, dept: string) {
    setScope((prev) => {
      if (!prev) return prev;
      const cur = prev[role] ?? emptyScope(role);
      const has = cur.depts.includes(dept);
      return {
        ...prev,
        [role]: { ...cur, depts: has ? cur.depts.filter((d) => d !== dept) : [...cur.depts, dept] },
      };
    });
    setSavedRole(null);
  }

  function toggleSubject(role: string, code: string) {
    setScope((prev) => {
      if (!prev) return prev;
      const cur = prev[role] ?? emptyScope(role);
      const has = cur.subjectCodes.some((c) => c.toUpperCase() === code.toUpperCase());
      return {
        ...prev,
        [role]: {
          ...cur,
          subjectCodes: has
            ? cur.subjectCodes.filter((c) => c.toUpperCase() !== code.toUpperCase())
            : [...cur.subjectCodes, code],
        },
      };
    });
    setSavedRole(null);
  }

  async function save(role: string) {
    const cur = scope?.[role];
    if (!cur) return;
    setSavingRole(role);
    setError(null);
    try {
      await saveSasAreaDepts(role, cur.depts);
      await saveSasAreaSubjects(role, cur.subjectCodes);
      setSavedRole(role);
      // The gap list is derived from what was just written.
      setGaps(await listUnsupervisedSubjects().catch(() => gaps));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save.');
    } finally {
      setSavingRole(null);
    }
  }

  return (
    <>
      <Breadcrumb items={[{ label: 'Setup', to: '/setup' }, { label: 'Subject Area Supervisors' }]} />
      <div className="mb-5">
        <h1 className="text-xl font-bold text-ink-primary">Subject Area Supervisors</h1>
        <p className="text-[13px] text-ink-secondary mt-1">
          Which subjects and which levels each supervisor checks. A supervisor sees a teacher only
          where the two overlap — a Science supervisor set to Junior High does not see Grade School
          Science. Assign who holds each area in{' '}
          <span className="font-medium">Setup ▸ Accounts &amp; Roles</span>.
        </p>
      </div>

      {error && (
        <p className="mb-4 text-[12.5px] text-nps-red bg-nps-red/10 border border-nps-red/20 rounded-md px-3 py-2">
          {error}
        </p>
      )}

      {/* The failure this page exists to prevent: a subject being taught that
          no supervisor can see, which nothing else in the system reports. */}
      {gaps.length > 0 && (
        <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 px-3 py-2.5">
          <p className="text-[12.5px] font-semibold text-amber-900 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {gaps.length} subject{gaps.length === 1 ? '' : 's'} being taught with no supervisor
          </p>
          <p className="text-[12px] text-amber-800 mt-1">
            These reach no one for checking: {gaps.map((c) => `${c} (${subjectName(c)})`).join(', ')}.
            Add each to the area it belongs to below.
          </p>
        </div>
      )}

      {scope === null ? (
        <p className="text-[12.5px] text-ink-secondary">Loading…</p>
      ) : (
        <div className="space-y-3">
          {AREAS.map((area) => {
            const cur = scope[area.role] ?? emptyScope(area.role);
            const who = holders[area.role] ?? [];
            const open = openArea === area.role;
            return (
              <SectionCard key={area.role} heading={area.label}>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <p className="text-[12px] text-ink-secondary">
                    {cur.subjectCodes.length} subject{cur.subjectCodes.length === 1 ? '' : 's'} ·{' '}
                    {cur.depts.length
                      ? SAS_DEPTS.filter((d) => cur.depts.includes(d.value)).map((d) => d.label).join(', ')
                      : 'no levels — this area sees nothing'}
                    {' · '}
                    {who.length ? who.join(', ') : (
                      <span className="text-amber-700 font-medium">nobody assigned</span>
                    )}
                  </p>
                  <div className="flex items-center gap-2">
                    {savedRole === area.role && (
                      <span className="text-[12px] text-ok-fg inline-flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Saved
                      </span>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setOpenArea(open ? null : area.role)}
                    >
                      {open ? 'Close' : 'Edit'}
                    </Button>
                  </div>
                </div>

                {open && (
                  <>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-ink-muted mb-1.5">
                      Levels
                    </p>
                    <div className="flex flex-wrap gap-3 mb-4">
                      {SAS_DEPTS.map((d) => (
                        <label key={d.value} className="flex items-center gap-1.5 text-[12.5px] cursor-pointer">
                          <input
                            type="checkbox"
                            checked={cur.depts.includes(d.value)}
                            onChange={() => toggleDept(area.role, d.value)}
                          />
                          {d.label}
                        </label>
                      ))}
                    </div>

                    <p className="text-[11px] font-bold uppercase tracking-wider text-ink-muted mb-1.5">
                      Subjects
                    </p>
                    <div className="max-h-[280px] overflow-y-auto rounded border border-border p-2 mb-3">
                      <div className="grid sm:grid-cols-2 gap-x-4">
                        {subjects.map((s) => {
                          const owner = ownerOf.get(s.code.toUpperCase());
                          const mine = owner === area.role;
                          // Claimed by another area: shown, but not takeable
                          // here — move it from that area first.
                          const taken = !!owner && !mine;
                          return (
                            <label
                              key={s.code}
                              title={
                                taken
                                  ? `Already in ${AREAS.find((a) => a.role === owner)?.label ?? owner}`
                                  : undefined
                              }
                              className={`flex items-center gap-1.5 py-0.5 text-[12.5px] ${
                                taken ? 'text-ink-muted cursor-not-allowed' : 'cursor-pointer'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={mine}
                                disabled={taken}
                                onChange={() => toggleSubject(area.role, s.code)}
                              />
                              <span className="font-mono">{s.code}</span>
                              <span className="truncate">{s.fullName}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button
                        className="gap-1.5"
                        disabled={savingRole === area.role}
                        onClick={() => save(area.role)}
                      >
                        <Save className="w-3.5 h-3.5" />
                        {savingRole === area.role ? 'Saving…' : `Save ${area.label}`}
                      </Button>
                    </div>
                  </>
                )}
              </SectionCard>
            );
          })}
        </div>
      )}
    </>
  );
}
