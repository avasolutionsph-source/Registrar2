import { useEffect, useState, type FormEvent } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Field } from '@/components/ui/field';
import { Breadcrumb } from '@/components/shell/Breadcrumb';
import { SectionCard } from '@/components/entity/SectionCard';
import { listUserRoles, addUserRole, deleteUserRole, listTeachers, type UserRoleRow } from '@/lib/db';

// Every office role the portal recognises (portalAuth.jsx ROLE_HOME).
const ROLES: { value: string; label: string }[] = [
  { value: 'admin', label: 'Administrator' },
  { value: 'registrar', label: 'Registrar' },
  { value: 'principal', label: 'Principal' },
  { value: 'director', label: 'Director' },
  { value: 'hr', label: 'HR' },
  { value: 'finance', label: 'Finance' },
  { value: 'guidance', label: 'Guidance' },
  { value: 'guidance_elementary', label: 'Guidance (Elementary)' },
  { value: 'acad_pre', label: 'Academic Coordinator — Preschool' },
  { value: 'acad_gs', label: 'Academic Coordinator — Grade School' },
  { value: 'acad_jhs', label: 'Academic Coordinator — Junior High' },
  { value: 'acad_shs', label: 'Academic Coordinator — Senior High' },
  { value: 'property', label: 'Property / CMDO' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'admissions', label: 'Admissions' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'teacher', label: 'Teacher' },
  { value: 'sas_clve', label: 'Subject Area Supervisor — Christian Living and Values Education' },
  { value: 'sas_english', label: 'Subject Area Supervisor — Communication Arts / English' },
  { value: 'sas_math', label: 'Subject Area Supervisor — Mathematics' },
  { value: 'sas_science', label: 'Subject Area Supervisor — Science' },
  { value: 'sas_ap', label: 'Subject Area Supervisor — Araling Panlipunan' },
  { value: 'sas_filipino', label: 'Subject Area Supervisor — Filipino' },
  { value: 'sas_mapeh', label: 'Subject Area Supervisor — MAPEH' },
  { value: 'sas_ict', label: 'Subject Area Supervisor — Information and Communication Technology (ICT)' },
  { value: 'sas_epp_tle', label: 'Subject Area Supervisor — EPP / TLE' },
];
const roleLabel = (v: string) => ROLES.find((r) => r.value === v)?.label ?? v;

// What each role actually opens for the account — shown so that whoever sets a
// teacher's roles can immediately see the access those roles grant.
const ROLE_ACCESS: Record<string, string> = {
  admin: 'Full admin — every office',
  registrar: 'Registrar system',
  // The Principal signs off Completion / Change of Grade forms. That workflow is
  // not built yet, so today the role grants nothing beyond portal access — say
  // so plainly rather than imply an office that does not exist. This role is the
  // LOGIN identity; the Principal's printed NAME on Form 137/138 is a separate
  // thing set in Setup → Admin.
  principal: 'Portal access only — grade-approval office not built yet',
  director: 'Office of the Director — payroll final approval',
  hr: 'HR / Payroll',
  finance: 'Finance',
  guidance: 'Guidance dashboards',
  guidance_elementary: 'Guidance (Preschool & Elementary)',
  // Preschool has no coordinator office in the portal yet (unlike GS/JHS/SHS),
  // so the role can be granted but opens nothing. Say so rather than imply an
  // office that does not exist.
  acad_pre: 'Academic Coordinator office — Preschool (teaching loads, routed grade approval)',
  acad_gs: 'Academic Coordinator office — Grade School (teaching loads)',
  acad_jhs: 'Academic Coordinator office — Junior High (teaching loads)',
  acad_shs: 'Academic Coordinator office — Senior High (teaching loads)',
  property: 'Property / CMDO inventory',
  marketing: 'Marketing office',
  admissions: 'Admissions office',
  maintenance: 'Facilities / Equipment',
  // Static: what the ROLE grants, not what this account happens to hold today.
  // Not every teacher advises a section, so the advisory record is conditional.
  teacher: 'Teacher portal — Gradebook; advisory class record kung naka-assign bilang adviser',
};
const roleAccess = (v: string) => ROLE_ACCESS[v] ?? 'Portal access';

export default function SetupAccounts() {
  const [rows, setRows] = useState<UserRoleRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('teacher');
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');
  // Teacher roster (name + email) — feeds the email suggestions only.
  const [teachers, setTeachers] = useState<{ email: string; name: string }[]>([]);
  // Whether the custom suggestion dropdown is open (own dropdown, NOT a native
  // datalist — the native one can't be height-capped and Chrome injects its own
  // "Manage addresses" autofill entries into it).
  const [showSug, setShowSug] = useState(false);

  async function load() {
    setError(null);
    try {
      setRows(await listUserRoles());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load accounts.');
    }
  }
  useEffect(() => {
    load();
    // Suggestions are a convenience — the form still works if this fails.
    listTeachers()
      .then((ts) =>
        setTeachers(
          ts
            .filter((t) => (t.email || '').trim())
            .map((t) => ({
              email: t.email.trim().toLowerCase(),
              name: `${t.title} ${t.familyName}, ${t.firstName}`.replace(/\s+/g, ' ').trim(),
            })),
        ),
      )
      .catch(() => {});
  }, []);

  // Every email the registrar is likely to mean, for the datalist: the teacher
  // roster first (name shown beside the address), then accounts that already
  // hold a role. De-duplicated; the browser filters as the registrar types.
  const emailSuggestions = (() => {
    const seen = new Map<string, string>();
    for (const t of teachers) if (!seen.has(t.email)) seen.set(t.email, t.name);
    for (const r of rows ?? []) {
      const em = r.email.trim().toLowerCase();
      if (!seen.has(em)) seen.set(em, '');
    }
    return Array.from(seen, ([em, label]) => ({ email: em, label })).sort((a, b) =>
      a.email.localeCompare(b.email),
    );
  })();

  // What the dropdown shows: suggestions matching the typed text against the
  // email or the teacher's name. Nothing shows until the registrar starts
  // typing — an all-accounts dropdown would just duplicate the accounts list
  // right below the form. About five rows are visible at a time; the rest
  // scroll (the dropdown itself is height-capped).
  const typedEmail = email.trim().toLowerCase();
  const sugMatches = typedEmail
    ? emailSuggestions.filter(
        (s) => s.email.includes(typedEmail) || s.label.toLowerCase().includes(typedEmail),
      )
    : [];

  async function assign(e: FormEvent) {
    e.preventDefault();
    const em = email.trim().toLowerCase();
    if (!em) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await addUserRole(em, role);
      setNotice(`${em} now has the ${roleLabel(role)} role.`);
      setEmail('');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to assign the role.');
    } finally {
      setBusy(false);
    }
  }

  async function remove(em: string, r: string) {
    setError(null);
    try {
      await deleteUserRole(em, r);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to remove the role.');
    }
  }

  const filtered = (rows ?? []).filter(
    (r) => !search.trim() || `${r.email} ${r.role}`.toLowerCase().includes(search.trim().toLowerCase()),
  );

  // Group the flat (email, role) rows into one entry per account so that the
  // full set of roles — and the access each one grants — is visible together.
  const accounts = Array.from(
    filtered.reduce((map, r) => {
      const list = map.get(r.email) ?? [];
      list.push(r.role);
      map.set(r.email, list);
      return map;
    }, new Map<string, string[]>()),
  )
    .map(([email, roleList]) => ({ email, roles: roleList.slice().sort() }))
    .sort((a, b) => a.email.localeCompare(b.email));

  return (
    <>
      <Breadcrumb items={[{ label: 'Setup', to: '/setup' }, { label: 'Accounts & Roles' }]} />
      <div className="mb-4">
        <h1 className="text-xl font-bold text-ink-primary">Accounts &amp; Roles</h1>
        <p className="text-[13px] text-ink-secondary mt-1 max-w-[620px]">
          Grant any office role to an account by email. An account may hold several roles — assigning
          another one adds it, it doesn't replace the existing role. The account must already exist in
          Supabase Auth — this only sets which offices it can access.
        </p>
      </div>

      {error && (
        <p className="mb-3 text-[13px] text-nps-red bg-nps-red/10 border border-nps-red/20 rounded-md px-3 py-2">
          {error}
        </p>
      )}
      {notice && (
        <p className="mb-3 text-[13px] text-ok-fg bg-ok-fg/10 border border-ok-fg/20 rounded-md px-3 py-2">
          {notice}
        </p>
      )}

      <SectionCard heading="Assign a role">
        <form onSubmit={assign} className="grid grid-cols-12 gap-x-3 gap-y-2 px-1 items-end">
          <div className="col-span-5">
            <Field label="Email">
              <div className="relative">
                <Input
                  type="email"
                  autoComplete="off"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setShowSug(true); }}
                  onFocus={() => setShowSug(true)}
                  onBlur={() => setTimeout(() => setShowSug(false), 120)}
                  onKeyDown={(e) => { if (e.key === 'Escape') setShowSug(false); }}
                  placeholder="name@nps.edu.ph"
                  required
                />
                {showSug && sugMatches.length > 0 && (
                  <div className="absolute z-20 mt-1 w-full max-h-[190px] overflow-y-auto rounded-md border border-border bg-panel shadow-lg">
                    {sugMatches.map((s) => (
                      <button
                        type="button"
                        key={s.email}
                        // onMouseDown (not onClick) so the pick lands before the
                        // input's blur closes the dropdown.
                        onMouseDown={(e) => { e.preventDefault(); setEmail(s.email); setShowSug(false); }}
                        className="block w-full text-left px-2.5 py-1.5 hover:bg-app"
                      >
                        <span className="block text-[13px] text-ink-primary">{s.email}</span>
                        {s.label && <span className="block text-[11.5px] text-ink-secondary">{s.label}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </Field>
          </div>
          <div className="col-span-5">
            <Field label="Role">
              <Select value={role} onChange={(e) => setRole(e.target.value)}>
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="col-span-2">
            <Button type="submit" disabled={busy} className="gap-2 w-full">
              <Plus className="w-3.5 h-3.5" /> {busy ? 'Saving…' : 'Assign'}
            </Button>
          </div>
        </form>
      </SectionCard>

      <div className="mt-3.5">
        <SectionCard
          heading={rows === null ? 'Loading…' : `${accounts.length} account${accounts.length === 1 ? '' : 's'}`}
        >
          <div className="flex justify-end mb-2 px-1">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search email or role…"
              className="max-w-[260px]"
            />
          </div>
          <div className="divide-y divide-border-soft">
            {accounts.map((acc) => (
              <div key={acc.email} className="py-2.5">
                <div className="text-[13px] font-medium text-ink-primary">{acc.email}</div>
                <ul className="mt-1.5 space-y-1">
                  {acc.roles.map((r) => (
                    <li key={r} className="flex items-start gap-2">
                      <span className="mt-0.5 inline-flex shrink-0 items-center rounded-full bg-app px-2 py-0.5 text-[11px] font-medium text-ink-primary border border-border">
                        {roleLabel(r)}
                      </span>
                      <span className="text-[12px] text-ink-secondary flex-1">Access: {roleAccess(r)}</span>
                      <button
                        type="button"
                        onClick={() => remove(acc.email, r)}
                        className="p-1 rounded text-ink-muted hover:text-nps-red hover:bg-app"
                        aria-label={`Remove ${roleLabel(r)} role`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {rows !== null && accounts.length === 0 && (
              <div className="py-6 text-center text-ink-secondary">No accounts.</div>
            )}
          </div>
        </SectionCard>
      </div>
    </>
  );
}
