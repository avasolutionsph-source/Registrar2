import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Check, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  type SasGap,
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

const DEPT_LABEL: Record<string, string> = Object.fromEntries(
  SAS_DEPTS.map((d) => [d.value, d.label]),
);

const emptyScope = (role: string): SasAreaScope => ({ role, depts: [], subjectCodes: [] });
const sameSet = (a: string[], b: string[]) =>
  a.length === b.length && [...a].sort().join('|') === [...b].sort().join('|');

type ScopeMap = Record<string, SasAreaScope>;

export default function SetupSubjectAreas() {
  // Two copies on purpose: `saved` is what the database holds, `draft` is what
  // is on screen. Without the pair there is no way to tell a real edit from a
  // reload, and no way to offer Discard.
  const [saved, setSaved] = useState<ScopeMap | null>(null);
  const [draft, setDraft] = useState<ScopeMap | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [holders, setHolders] = useState<Record<string, string[]>>({});
  const [gaps, setGaps] = useState<SasGap[]>([]);
  const [openArea, setOpenArea] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [savingRole, setSavingRole] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [rows, subs, roles, missing] = await Promise.all([
          listSasScope(),
          listSubjects(),
          listUserRoles().catch(() => []),
          listUnsupervisedSubjects().catch(() => [] as SasGap[]),
        ]);
        if (cancelled) return;
        const byRole: ScopeMap = {};
        for (const a of AREAS) byRole[a.role] = emptyScope(a.role);
        for (const r of rows) byRole[r.role] = r;
        setSaved(byRole);
        setDraft(structuredClone(byRole));
        setSubjects(subs);
        setGaps(missing);
        const held: Record<string, string[]> = {};
        for (const r of roles) {
          if (r.role.startsWith('sas_')) (held[r.role] ??= []).push(r.email);
        }
        setHolders(held);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load the supervisor areas.');
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const dirtyRole = useMemo(() => {
    if (!saved || !draft) return null;
    for (const a of AREAS) {
      const s = saved[a.role] ?? emptyScope(a.role);
      const d = draft[a.role] ?? emptyScope(a.role);
      if (!sameSet(s.depts, d.depts) || !sameSet(s.subjectCodes, d.subjectCodes)) return a.role;
    }
    return null;
  }, [saved, draft]);

  // Which area (if any) already claims a subject — a code may only belong to
  // one, or two supervisors would check the same sheet.
  const ownerOf = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of Object.values(draft ?? {})) {
      for (const code of s.subjectCodes) m.set(code.toUpperCase(), s.role);
    }
    return m;
  }, [draft]);

  const subjectName = useMemo(() => {
    const m = new Map(subjects.map((s) => [s.code.toUpperCase(), s.fullName]));
    return (code: string) => m.get(code.toUpperCase()) ?? code;
  }, [subjects]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return subjects;
    return subjects.filter(
      (s) => s.code.toLowerCase().includes(q) || s.fullName.toLowerCase().includes(q),
    );
  }, [subjects, query]);

  function edit(role: string, patch: (cur: SasAreaScope) => SasAreaScope) {
    setDraft((prev) => (prev ? { ...prev, [role]: patch(prev[role] ?? emptyScope(role)) } : prev));
    setSavedFlash(null);
  }

  const toggleDept = (role: string, dept: string) =>
    edit(role, (cur) => ({
      ...cur,
      depts: cur.depts.includes(dept) ? cur.depts.filter((d) => d !== dept) : [...cur.depts, dept],
    }));

  const toggleSubject = (role: string, code: string) =>
    edit(role, (cur) => {
      const has = cur.subjectCodes.some((c) => c.toUpperCase() === code.toUpperCase());
      return {
        ...cur,
        subjectCodes: has
          ? cur.subjectCodes.filter((c) => c.toUpperCase() !== code.toUpperCase())
          : [...cur.subjectCodes, code],
      };
    });

  function discard(role: string) {
    if (!saved) return;
    setDraft((prev) => (prev ? { ...prev, [role]: structuredClone(saved[role] ?? emptyScope(role)) } : prev));
    setSavedFlash(null);
  }

  async function save(role: string) {
    const cur = draft?.[role];
    if (!cur) return;
    setSavingRole(role);
    setError(null);
    try {
      await saveSasAreaDepts(role, cur.depts);
      await saveSasAreaSubjects(role, cur.subjectCodes);
      setSaved((prev) => (prev ? { ...prev, [role]: structuredClone(cur) } : prev));
      setSavedFlash(role);
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

      {/* The failure this page exists to prevent: a subject being taught at a
          level some area supervises, that no area actually claims. Levels no
          area covers at all (Senior High today) are not listed — those are the
          Academic Coordinator's, and reporting them cried wolf. */}
      {gaps.length > 0 && (
        <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 px-3 py-2.5">
          <p className="text-[12.5px] font-semibold text-amber-900 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {gaps.length} subject{gaps.length === 1 ? '' : 's'} being taught with no supervisor
          </p>
          <p className="text-[12px] text-amber-800 mt-1">
            These reach no one for checking:{' '}
            {gaps
              .map((g) => `${g.subjectCode} (${subjectName(g.subjectCode)}) — ${DEPT_LABEL[g.dept] ?? g.dept}`)
              .join('; ')}
            . Add each to the area it belongs to, or widen that area&apos;s levels.
          </p>
        </div>
      )}

      {draft === null ? (
        <p className="text-[12.5px] text-ink-secondary">Loading…</p>
      ) : (
        <div className="space-y-3">
          {AREAS.map((area) => {
            const cur = draft[area.role] ?? emptyScope(area.role);
            const who = holders[area.role] ?? [];
            const open = openArea === area.role;
            const isDirty = dirtyRole === area.role;
            // One area at a time while there are unsaved edits: leaving them
            // behind in another card is how they get lost.
            const blocked = !!dirtyRole && !isDirty;
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
                    {isDirty && <span className="ml-2 text-amber-700 font-medium">Unsaved</span>}
                  </p>
                  <div className="flex items-center gap-2">
                    {savedFlash === area.role && (
                      <span className="text-[12px] text-ok-fg inline-flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Saved
                      </span>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={blocked}
                      title={blocked ? 'Save or discard your unsaved changes first' : undefined}
                      onClick={() => {
                        // A search left over from another area would silently
                        // hide most of this one's subjects.
                        setQuery('');
                        setOpenArea(open ? null : area.role);
                      }}
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

                    <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                        Subjects · {cur.subjectCodes.length} selected
                      </p>
                      <Input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search code or name…"
                        className="w-[220px] text-[12.5px]"
                      />
                    </div>
                    <div className="max-h-[280px] overflow-y-auto rounded border border-border p-2 mb-3">
                      {shown.length === 0 ? (
                        <p className="text-[12.5px] text-ink-secondary py-2 px-1">
                          No subject matches “{query}”.
                        </p>
                      ) : (
                        <div className="grid sm:grid-cols-2 gap-x-4">
                          {shown.map((s) => {
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
                      )}
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        disabled={!isDirty || savingRole === area.role}
                        onClick={() => discard(area.role)}
                      >
                        Discard
                      </Button>
                      <Button
                        className="gap-1.5"
                        disabled={!isDirty || savingRole === area.role}
                        onClick={() => save(area.role)}
                      >
                        <Save className="w-3.5 h-3.5" />
                        {savingRole === area.role ? 'Saving…' : 'Save'}
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
