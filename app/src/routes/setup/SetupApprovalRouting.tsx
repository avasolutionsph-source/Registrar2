import { useEffect, useMemo, useState } from 'react';
import { Pencil, Save, X, History, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Breadcrumb } from '@/components/shell/Breadcrumb';
import { SectionCard } from '@/components/entity/SectionCard';
import {
  listRoutingRules,
  saveRoutingRules,
  listRoutingAudit,
  type RoutingRule,
  type RoutingAuditRow,
} from '@/lib/db';

// Setup → Grade Approval Routing. Whose grades each role checks.
//
// This page decides who can approve grades, so whoever opens it could grant
// themselves approval access — the most sensitive page in the system. Access is
// registrar-only and enforced in the database (RLS on reg_approval_routing),
// not by hiding this card.
//
// The rules drive access directly: assign a role as approver and every account
// holding it can see and approve the sheets that rule covers, immediately. No
// second permission list to keep in sync.

const SOURCE_LABEL: Record<string, string> = {
  teacher: 'Teacher',
  sas: 'Subject Area Supervisor',
  acad_pre: 'Academic Coordinator — Preschool',
  acad_gs: 'Academic Coordinator — Grade School',
  acad_jhs: 'Academic Coordinator — Junior High',
  acad_shs: 'Academic Coordinator — Senior High',
};
const SCOPE_LABEL: Record<string, string> = {
  preschool: 'Preschool',
  gs: 'Grade School',
  jhs: 'Junior High',
  shs: 'Senior High',
};
const DERIVE_LABEL: Record<string, string> = {
  sas_of_subject: 'the SAS of the grade sheet’s SUBJECT',
  ac_of_section_level: 'the Academic Coordinator of the SECTION’s level',
};
// Roles that can be named as a fixed approver.
const FIXED_ROLES = ['principal', 'acad_pre', 'acad_gs', 'acad_jhs', 'acad_shs'];

// How an approver reads in the table.
const describe = (r: RoutingRule) =>
  r.approverKind === 'derived'
    ? DERIVE_LABEL[r.approverDerive ?? ''] ?? r.approverDerive ?? ''
    : r.approverKind === 'fixed'
      ? SOURCE_LABEL[r.approverRole ?? ''] ?? r.approverRole ?? ''
      : 'Not set yet';

const sameRule = (a: RoutingRule, b: RoutingRule) =>
  a.approverKind === b.approverKind &&
  a.approverRole === b.approverRole &&
  a.approverDerive === b.approverDerive;

export default function SetupApprovalRouting() {
  const [saved, setSaved] = useState<RoutingRule[]>([]); // last persisted state
  const [draft, setDraft] = useState<RoutingRule[]>([]);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [audit, setAudit] = useState<RoutingAuditRow[]>([]);
  const [showAudit, setShowAudit] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rows = await listRoutingRules();
        if (cancelled) return;
        setSaved(rows);
        setDraft(rows.map((r) => ({ ...r })));
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load the rules.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const dirty = useMemo(
    () => draft.some((d, i) => !saved[i] || !sameRule(d, saved[i])),
    [draft, saved],
  );

  // Warn before the browser discards unsaved work (Part H.5).
  useEffect(() => {
    if (!dirty) return;
    const onLeave = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', onLeave);
    return () => window.removeEventListener('beforeunload', onLeave);
  }, [dirty]);

  // A rule pointing at a role the encoder also holds would send a sheet back to
  // its own author. The database escalates to the Principal at approval time,
  // but a rule that ALWAYS self-approves is a configuration error, so block it
  // here: a coordinator's own sheets must not route to that same coordinator.
  const selfCheck = useMemo(
    () =>
      draft.filter(
        (r) => r.approverKind === 'fixed' && r.approverRole === r.sourceRole,
      ),
    [draft],
  );
  // A → B while B → A leaves two people waiting on each other.
  const circular = useMemo(() => {
    const fixed = new Map(
      draft.filter((r) => r.approverKind === 'fixed').map((r) => [r.sourceRole, r.approverRole]),
    );
    return draft.filter(
      (r) =>
        r.approverKind === 'fixed' &&
        r.approverRole != null &&
        fixed.get(r.approverRole) === r.sourceRole,
    );
  }, [draft]);
  const unset = draft.filter((r) => r.approverKind === 'unset');
  const invalid = selfCheck.length > 0 || circular.length > 0;

  const patch = (id: number, p: Partial<RoutingRule>) => {
    setDraft((rs) => rs.map((r) => (r.id === id ? { ...r, ...p } : r)));
    setNotice(null);
  };

  function cancel() {
    if (dirty && !window.confirm('Discard your changes to the approval routing?')) return;
    setDraft(saved.map((r) => ({ ...r })));
    setEditing(false);
    setError(null);
  }

  async function commit() {
    setSaving(true);
    setError(null);
    try {
      await saveRoutingRules(draft);
      const fresh = await listRoutingRules();
      setSaved(fresh);
      setDraft(fresh.map((r) => ({ ...r })));
      setEditing(false);
      setConfirm(false);
      setNotice('Routing saved. Access for the affected accounts has changed.');
    } catch (e) {
      // Keep the draft: never throw away the user's work on a failed save.
      setError(e instanceof Error ? e.message : 'Failed to save. Your changes are still here.');
      setConfirm(false);
    } finally {
      setSaving(false);
    }
  }

  async function openAudit() {
    setShowAudit(true);
    try { setAudit(await listRoutingAudit()); } catch { /* registrar-only; empty is fine */ }
  }

  return (
    <>
      <Breadcrumb items={[{ label: 'Setup', to: '/setup' }, { label: 'Grade Approval Routing' }]} />
      <div className="mb-4 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-ink-primary">Grade Approval Routing</h1>
          <p className="text-[13px] text-ink-secondary mt-1 max-w-[680px]">
            Whose grades each role checks. One approver stands between the teacher and the
            Registrar. Changing a rule changes who can see and approve those grade sheets
            straight away — approvers get view and approve only, never edit.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {!editing ? (
            <Button variant="outline" onClick={() => setEditing(true)} className="gap-2">
              <Pencil className="w-3.5 h-3.5" /> Edit
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={cancel} className="gap-2">
                <X className="w-3.5 h-3.5" /> Cancel
              </Button>
              <Button onClick={() => setConfirm(true)} disabled={!dirty || invalid || saving} className="gap-2">
                <Save className="w-3.5 h-3.5" /> Save
              </Button>
            </>
          )}
        </div>
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

      {/* Precedence, stated up front so the table is not a puzzle (Part D.3). */}
      <div className="mb-4 rounded-md border border-border bg-app px-3 py-2.5 text-[12.5px] text-ink-secondary">
        <span className="font-semibold text-ink-primary">How a rule is picked:</span> by the
        encoder's <span className="font-semibold">highest</span> role — Principal, then Academic
        Coordinator, then Subject Area Supervisor, then Teacher. So a teacher who is also a
        supervisor is routed by the supervisor rule. Where two rules could match, the one with a
        level beats the one covering every level.
      </div>

      {(selfCheck.length > 0 || circular.length > 0 || unset.length > 0) && (
        <div className={`mb-4 rounded-md border px-3 py-2.5 text-[12.5px] ${
          invalid ? 'border-nps-red/30 bg-nps-red/5 text-nps-red' : 'border-amber-300 bg-amber-50 text-amber-900'
        }`}>
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              {selfCheck.map((r) => (
                <div key={`s${r.id}`}>
                  <span className="font-semibold">{SOURCE_LABEL[r.sourceRole]}</span> would approve
                  its own grade sheets. Pick a different approver.
                </div>
              ))}
              {circular.map((r) => (
                <div key={`c${r.id}`}>
                  <span className="font-semibold">{SOURCE_LABEL[r.sourceRole]}</span> and{' '}
                  <span className="font-semibold">{SOURCE_LABEL[r.approverRole ?? '']}</span> check
                  each other. One of them must route elsewhere.
                </div>
              ))}
              {unset.map((r) => (
                <div key={`u${r.id}`}>
                  <span className="font-semibold">{SOURCE_LABEL[r.sourceRole]}</span> has no
                  approver set. Their grade sheets are held and reported, never skipped.
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-[13px] text-ink-secondary">Loading…</p>
      ) : (
        <SectionCard heading={`${draft.length} rules`}>
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-[0.04em] text-ink-muted border-b border-border">
                <th className="py-2 pr-3 w-[30%]">Whose grades</th>
                <th className="py-2 pr-3 w-[16%]">Level</th>
                <th className="py-2">Checked by</th>
              </tr>
            </thead>
            <tbody>
              {draft.map((r) => (
                <tr key={r.id} className="border-b border-border-soft last:border-0">
                  <td className="py-2 pr-3 text-ink-primary font-medium">
                    {SOURCE_LABEL[r.sourceRole] ?? r.sourceRole}
                  </td>
                  <td className="py-2 pr-3 text-ink-secondary">
                    {r.sourceScope ? SCOPE_LABEL[r.sourceScope] : 'Every level'}
                  </td>
                  <td className="py-2">
                    {!editing ? (
                      <span className={r.approverKind === 'unset' ? 'text-nps-red' : 'text-ink-primary'}>
                        {describe(r)}
                      </span>
                    ) : (
                      <div className="flex items-center gap-2 flex-wrap">
                        <select
                          value={r.approverKind}
                          onChange={(e) => {
                            const kind = e.target.value as RoutingRule['approverKind'];
                            patch(r.id, {
                              approverKind: kind,
                              approverRole: kind === 'fixed' ? (r.approverRole ?? 'principal') : null,
                              approverDerive:
                                kind === 'derived' ? (r.approverDerive ?? 'sas_of_subject') : null,
                            });
                          }}
                          className="h-8 rounded-md border border-border bg-surface px-2 text-[12.5px]"
                        >
                          <option value="fixed">A specific role</option>
                          <option value="derived">Depends on the grade sheet</option>
                          <option value="unset">Not set yet</option>
                        </select>
                        {r.approverKind === 'fixed' && (
                          <select
                            value={r.approverRole ?? ''}
                            onChange={(e) => patch(r.id, { approverRole: e.target.value })}
                            className="h-8 rounded-md border border-border bg-surface px-2 text-[12.5px]"
                          >
                            {FIXED_ROLES.map((v) => (
                              <option key={v} value={v}>{SOURCE_LABEL[v] ?? v}</option>
                            ))}
                          </select>
                        )}
                        {r.approverKind === 'derived' && (
                          <select
                            value={r.approverDerive ?? ''}
                            onChange={(e) => patch(r.id, { approverDerive: e.target.value })}
                            className="h-8 rounded-md border border-border bg-surface px-2 text-[12.5px]"
                          >
                            {Object.entries(DERIVE_LABEL).map(([v, l]) => (
                              <option key={v} value={v}>{l}</option>
                            ))}
                          </select>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </SectionCard>
      )}

      {confirm && (
        <div className="fixed inset-0 bg-black/50 z-50 grid place-items-center px-4">
          <div className="bg-surface rounded-xl max-w-md w-full p-5 shadow-2xl">
            <h3 className="text-[15px] font-bold text-ink-primary">Save the approval routing?</h3>
            <p className="text-[13px] text-ink-secondary mt-2">
              Every account holding an affected role gains or loses the ability to see and approve
              those grade sheets as soon as you save. Approvals already recorded keep the name of
              whoever made them.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setConfirm(false)}>Cancel</Button>
              <Button onClick={commit} disabled={saving}>
                {saving ? 'Saving…' : 'Save routing'}
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-4">
        {!showAudit ? (
          <Button variant="outline" size="sm" onClick={openAudit} className="gap-1.5">
            <History className="w-3.5 h-3.5" /> Show change history
          </Button>
        ) : (
          <SectionCard heading={`${audit.length} routing changes`}>
            {audit.length === 0 ? (
              <p className="text-[13px] text-ink-secondary">No routing changes recorded yet.</p>
            ) : (
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-[0.04em] text-ink-muted border-b border-border">
                    <th className="py-2 pr-3">When</th>
                    <th className="py-2 pr-3">Who</th>
                    <th className="py-2 pr-3">Rule</th>
                    <th className="py-2">Old → new</th>
                  </tr>
                </thead>
                <tbody>
                  {audit.map((a) => (
                    <tr key={a.id} className="border-b border-border-soft last:border-0">
                      <td className="py-2 pr-3 text-ink-secondary whitespace-nowrap">
                        {new Date(a.changedAt).toLocaleString()}
                      </td>
                      <td className="py-2 pr-3 text-ink-secondary">{a.changedBy}</td>
                      <td className="py-2 pr-3 text-ink-primary">
                        {SOURCE_LABEL[a.sourceRole] ?? a.sourceRole}
                        {a.sourceScope ? ` · ${SCOPE_LABEL[a.sourceScope]}` : ''}
                      </td>
                      <td className="py-2 text-ink-primary">
                        {a.oldRule ? `${a.oldRule} → ${a.newRule}` : `set to ${a.newRule}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </SectionCard>
        )}
      </div>
    </>
  );
}
