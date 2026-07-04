import { useEffect, useState, type FormEvent } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Field } from '@/components/ui/field';
import { Breadcrumb } from '@/components/shell/Breadcrumb';
import { SectionCard } from '@/components/entity/SectionCard';
import { listUserRoles, setUserRole, deleteUserRole, type UserRoleRow } from '@/lib/db';

// Every office role the portal recognises (portalAuth.jsx ROLE_HOME).
const ROLES: { value: string; label: string }[] = [
  { value: 'admin', label: 'Administrator' },
  { value: 'registrar', label: 'Registrar' },
  { value: 'hr', label: 'HR' },
  { value: 'finance', label: 'Finance' },
  { value: 'guidance', label: 'Guidance' },
  { value: 'guidance_elementary', label: 'Guidance (Elementary)' },
  { value: 'acad_gs', label: 'Academic Coordinator — Grade School' },
  { value: 'acad_jhs', label: 'Academic Coordinator — Junior High' },
  { value: 'property', label: 'Property / CMDO' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'admissions', label: 'Admissions' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'teacher', label: 'Teacher' },
];
const roleLabel = (v: string) => ROLES.find((r) => r.value === v)?.label ?? v;

export default function SetupAccounts() {
  const [rows, setRows] = useState<UserRoleRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('teacher');
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');

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
  }, []);

  async function assign(e: FormEvent) {
    e.preventDefault();
    const em = email.trim().toLowerCase();
    if (!em) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await setUserRole(em, role);
      setNotice(`${em} is now ${roleLabel(role)}.`);
      setEmail('');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to assign the role.');
    } finally {
      setBusy(false);
    }
  }

  async function changeRole(em: string, newRole: string) {
    setError(null);
    try {
      await setUserRole(em, newRole);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update the role.');
    }
  }

  async function remove(em: string) {
    setError(null);
    try {
      await deleteUserRole(em);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to remove the role.');
    }
  }

  const filtered = (rows ?? []).filter(
    (r) => !search.trim() || `${r.email} ${r.role}`.toLowerCase().includes(search.trim().toLowerCase()),
  );

  return (
    <>
      <Breadcrumb items={[{ label: 'Setup', to: '/setup' }, { label: 'Accounts & Roles' }]} />
      <div className="mb-4">
        <h1 className="text-xl font-bold text-ink-primary">Accounts &amp; Roles</h1>
        <p className="text-[13px] text-ink-secondary mt-1 max-w-[620px]">
          Assign any office role to an account by email (one role per email). The account must
          already exist in Supabase Auth — this only sets which office it can access.
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
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@nps.edu.ph" required />
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
          heading={rows === null ? 'Loading…' : `${filtered.length} account${filtered.length === 1 ? '' : 's'}`}
        >
          <div className="flex justify-end mb-2 px-1">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search email or role…"
              className="max-w-[260px]"
            />
          </div>
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-[0.04em] text-ink-muted border-b border-border">
                <th className="py-1.5 pr-3">Email</th>
                <th className="py-1.5 pr-3 w-[42%]">Role</th>
                <th className="py-1.5 w-10" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.email} className="border-b border-border-soft last:border-0">
                  <td className="py-1.5 pr-3 text-ink-primary">{r.email}</td>
                  <td className="py-1.5 pr-3">
                    <Select value={r.role} onChange={(e) => changeRole(r.email, e.target.value)}>
                      {ROLES.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </Select>
                  </td>
                  <td className="py-1.5 text-right">
                    <button
                      type="button"
                      onClick={() => remove(r.email)}
                      className="p-1 rounded text-ink-muted hover:text-nps-red hover:bg-app"
                      aria-label="Remove role"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
              {rows !== null && filtered.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-6 text-center text-ink-secondary">
                    No accounts.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </SectionCard>
      </div>
    </>
  );
}
