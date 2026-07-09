import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Printer, FileText, Users as UsersIcon, Check, X, Pencil, Plus, Trash2, Save } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { PrintHost } from '@/components/print/PrintHost';
import { ClassForm1 } from '@/components/print/ClassForm1';
import { ClassForm5 } from '@/components/print/ClassForm5';
import { BatchReportCards } from '@/components/print/BatchReportCards';
import { ReportCardSF9 } from '@/components/print/ReportCardSF9';
import { Breadcrumb } from '@/components/shell/Breadcrumb';
import { EntityRail } from '@/components/entity/EntityRail';
import { SectionCard } from '@/components/entity/SectionCard';
import { StatusBadge } from '@/components/entity/StatusBadge';
import {
  getClass,
  listStudentsByClass,
  listSubjects,
  listTransfersForClass,
  addTransfer,
  deleteTransfer,
  listEscForClass,
  saveEsc,
  listTeachers,
  listClassSubjects,
  saveClassSubjects,
  listStudentsLite,
  bulkEnrollForSy,
  listAttitudeScale,
  unenrollFromClass,
  type Transfer,
} from '@/lib/db';
import type { AttitudeBand } from '@/lib/grading';
import { schoolIdFromLrn } from '@/lib/lrn';
import { periodsForSy } from '@/lib/forms';
import { formatLastFirstMiddle, formatBirthdate } from '@/lib/format';
import type { ClassRecord, Student, Subject, Teacher } from '@/types';

type ClassDoc =
  | { kind: 'sf1' }
  | { kind: 'sf5' }
  | { kind: 'batch' }
  | { kind: 'one'; student: Student };

const TAB_KEYS = [
  'list',
  'form1',
  'pupils',
  'idinfo',
  'parents',
  'credentials',
  'form5',
  'ncae',
  'nat',
  'reportcard',
  'load',
  'esc',
  'transferees',
] as const;

const TAB_LABELS: Record<(typeof TAB_KEYS)[number], string> = {
  list: 'List',
  form1: 'Form 1',
  pupils: 'Pupils',
  idinfo: 'ID Info',
  parents: 'Parents',
  credentials: 'Credentials',
  form5: 'Form 5',
  ncae: 'NCAE',
  nat: 'NAT',
  reportcard: 'Report Card',
  load: 'Subjects & Teachers',
  esc: 'ESC Billing',
  transferees: 'Transferees',
};

const CRED_KEYS: ['bc', 'bp', 'hc', 'pix', 'rf', 'f137', 'rc', 'gmc'] = [
  'bc',
  'bp',
  'hc',
  'pix',
  'rf',
  'f137',
  'rc',
  'gmc',
];

export default function ClassDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [klass, setKlass] = useState<ClassRecord | null | undefined>(undefined); // undefined = loading
  const [roster, setRoster] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [doc, setDoc] = useState<ClassDoc | null>(null);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [tForm, setTForm] = useState({ name: '', direction: 'in' as 'in' | 'out', date: '', school: '' });
  const [tBusy, setTBusy] = useState(false);
  const [escState, setEscState] = useState<Record<string, { grantee: boolean; escNo: string }>>({});
  const [escBusy, setEscBusy] = useState(false);
  const [escSaved, setEscSaved] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [allLite, setAllLite] = useState<Student[] | null>(null);
  const [addSearch, setAddSearch] = useState('');
  const [addSel, setAddSel] = useState<Set<string>>(new Set());
  const [addBusy, setAddBusy] = useState(false);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [attitudeScale, setAttitudeScale] = useState<AttitudeBand[] | undefined>(undefined);
  const [load, setLoad] = useState<Record<string, number | null>>({}); // subjectCode -> teacherId | null (assigned subjects)
  const [loadBusy, setLoadBusy] = useState(false);
  const [loadSaved, setLoadSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!id) {
        setKlass(null);
        return;
      }
      try {
        const [c, roster, subs, trans, tchs, classSubs] = await Promise.all([
          getClass(id),
          listStudentsByClass(id),
          listSubjects(),
          listTransfersForClass(id),
          listTeachers(),
          listClassSubjects(id),
        ]);
        if (cancelled) return;
        const rosterList = c ? roster : [];
        setKlass(c);
        setSubjects(subs);
        setTransfers(trans);
        setRoster(rosterList);
        setTeachers(tchs);
        listAttitudeScale().then((s) => { if (!cancelled) setAttitudeScale(s); }).catch(() => {});
        setLoad(Object.fromEntries(classSubs.map((a) => [a.subjectCode, a.teacherId])));
        if (c && rosterList.length) {
          const esc = await listEscForClass(rosterList.map((s) => s.lrn), c.sy);
          if (cancelled) return;
          const init: Record<string, { grantee: boolean; escNo: string }> = {};
          for (const s of rosterList) init[s.lrn] = esc[s.lrn] ?? { grantee: false, escNo: '' };
          setEscState(init);
        }
      } catch {
        if (!cancelled) setKlass(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (klass === undefined) {
    return (
      <div>
        <Breadcrumb items={[{ label: 'Classes', to: '/classes' }, { label: '…' }]} />
        <p className="text-ink-secondary text-sm">Loading…</p>
      </div>
    );
  }

  if (!klass) {
    return (
      <div>
        <Breadcrumb items={[{ label: 'Classes', to: '/classes' }, { label: 'Not found' }]} />
        <p className="text-ink-secondary text-sm">No class with id {id}.</p>
      </div>
    );
  }

  const males = roster.filter((s) => s.gender === 'Male');
  const females = roster.filter((s) => s.gender === 'Female');
  const adviserName = `${klass.adviser.title} ${klass.adviser.familyName}, ${klass.adviser.firstName} ${klass.adviser.middleInitial}`;
  const periods = periodsForSy(klass.sy);
  const periodWord = periods.length === 3 ? 'Term' : 'Quarter';
  const firstPeriodLabel = periods[0]?.label ?? 'Term 1';

  async function submitTransfer() {
    if (!klass || !tForm.name.trim()) return;
    setTBusy(true);
    try {
      await addTransfer({
        classId: klass.id,
        learnerName: tForm.name.trim(),
        sy: klass.sy,
        direction: tForm.direction,
        transferDate: tForm.date || null,
        otherSchool: tForm.school.trim() || undefined,
      });
      setTransfers(await listTransfersForClass(klass.id));
      setTForm({ name: '', direction: 'in', date: '', school: '' });
    } catch {
      // ignore — keep the form as-is so the user can retry
    } finally {
      setTBusy(false);
    }
  }

  async function removeTransfer(tid: number) {
    try {
      await deleteTransfer(tid);
      setTransfers((ts) => ts.filter((t) => t.id !== tid));
    } catch {
      // ignore
    }
  }

  const setEscGrantee = (lrn: string, v: boolean) => {
    setEscState((s) => ({ ...s, [lrn]: { ...(s[lrn] ?? { grantee: false, escNo: '' }), grantee: v } }));
    setEscSaved(false);
  };
  const setEscNo = (lrn: string, v: string) => {
    setEscState((s) => ({ ...s, [lrn]: { ...(s[lrn] ?? { grantee: false, escNo: '' }), escNo: v } }));
    setEscSaved(false);
  };
  async function saveEscRecords() {
    if (!klass) return;
    setEscBusy(true);
    try {
      await saveEsc(
        roster.map((s) => ({
          lrn: s.lrn,
          sy: klass.sy,
          grantee: escState[s.lrn]?.grantee ?? false,
          escNo: escState[s.lrn]?.escNo ?? '',
        })),
      );
      setEscSaved(true);
    } catch {
      // ignore — leave edits in place for retry
    } finally {
      setEscBusy(false);
    }
  }

  const activeTeachers = teachers.filter((t) => t.yearEnded === 0);
  const teacherLabel = (t: Teacher) => `${t.title} ${t.familyName}, ${t.firstName} ${t.middleInitial}`.trim();

  const isOffered = (code: string) => Object.prototype.hasOwnProperty.call(load, code);
  const toggleOffered = (code: string, offered: boolean) => {
    setLoad((l) => {
      const next = { ...l };
      if (offered) next[code] = next[code] ?? null;
      else delete next[code];
      return next;
    });
    setLoadSaved(false);
  };
  const setSubjectTeacher = (code: string, teacherId: number | null) => {
    setLoad((l) => ({ ...l, [code]: teacherId }));
    setLoadSaved(false);
  };
  async function saveLoad() {
    if (!klass) return;
    setLoadBusy(true);
    try {
      await saveClassSubjects(
        klass.id,
        Object.entries(load).map(([subjectCode, teacherId]) => ({ subjectCode, teacherId })),
      );
      setLoadSaved(true);
    } catch {
      // ignore — keep edits for retry
    } finally {
      setLoadBusy(false);
    }
  }

  const rosterLrns = new Set(roster.map((s) => s.lrn));
  const addResults = (() => {
    if (!allLite) return [];
    const q = addSearch.trim().toLowerCase();
    return allLite
      .filter((s) => !rosterLrns.has(s.lrn))
      .filter((s) =>
        !q
          ? false
          : `${s.lastName} ${s.firstName} ${s.lrn}`.toLowerCase().includes(q),
      )
      .slice(0, 40);
  })();

  async function openAdd() {
    setAddOpen((v) => !v);
    if (allLite === null) {
      try {
        setAllLite(await listStudentsLite());
      } catch {
        setAllLite([]);
      }
    }
  }
  const toggleAdd = (lrn: string) =>
    setAddSel((s) => {
      const next = new Set(s);
      if (next.has(lrn)) next.delete(lrn);
      else next.add(lrn);
      return next;
    });
  const [removingLrn, setRemovingLrn] = useState<string | null>(null);
  async function unenroll(s: Student) {
    if (!klass) return;
    if (
      !window.confirm(
        `Remove ${formatLastFirstMiddle(s)} from ${klass.gradeLevel} · ${klass.sectionName}?\n\n` +
          'They stay a learner (record and grades are kept) but drop off this class list. ' +
          'You can re-add or reassign them anytime.',
      )
    )
      return;
    setRemovingLrn(s.lrn);
    try {
      await unenrollFromClass(s.lrn, klass.id);
      setRoster((r) => r.filter((x) => x.lrn !== s.lrn));
    } catch {
      window.alert('Could not remove the learner. Check your connection and try again.');
    } finally {
      setRemovingLrn(null);
    }
  }

  async function enrollSelected() {
    if (!klass || addSel.size === 0) return;
    setAddBusy(true);
    try {
      const adviserName = `${klass.adviser.title} ${klass.adviser.familyName}, ${klass.adviser.firstName} ${klass.adviser.middleInitial}`
        .replace(/\s+/g, ' ')
        .trim();
      await bulkEnrollForSy([...addSel], {
        sy: klass.sy,
        classId: klass.id,
        gradeLevel: klass.gradeLevel,
        sectionName: klass.sectionName,
        adviserName,
        action: 'promoted',
      });
      const fresh = await listStudentsByClass(klass.id);
      setRoster(fresh);
      setAddSel(new Set());
      setAddSearch('');
      setAddOpen(false);
    } catch {
      // keep selection for retry
    } finally {
      setAddBusy(false);
    }
  }

  return (
    <>
      <Breadcrumb
        items={[
          { label: 'Classes', to: '/classes' },
          { label: `Grade ${klass.gradeLevel} · ${klass.sectionName}` },
        ]}
      />
      <div className="flex gap-5">
        <EntityRail
          avatar={
            <div className="w-[84px] h-[84px] rounded-full bg-border grid place-items-center text-ink-muted">
              <UsersIcon className="w-9 h-9" />
            </div>
          }
          name={klass.sectionName}
          subtitle={`Grade ${klass.gradeLevel} · ${klass.sy}`}
          ids={[
            { label: 'Adviser', value: klass.adviser.familyName },
            { label: 'Curriculum', value: klass.curriculum },
            {
              label: 'Roster',
              value: <StatusBadge tone="ok">{roster.length} learners</StatusBadge>,
            },
          ]}
          actions={
            <>
              <Button
                variant="outline"
                className="justify-start gap-2 w-full"
                onClick={() => navigate(`/classes/${klass.id}/edit`)}
              >
                <Pencil className="w-3.5 h-3.5" /> Edit class
              </Button>
              <Button
                variant="outline"
                className="justify-start gap-2 w-full"
                onClick={() => setDoc({ kind: 'sf1' })}
              >
                <FileText className="w-3.5 h-3.5" /> Print Form 1
              </Button>
              <Button
                variant="outline"
                className="justify-start gap-2 w-full"
                onClick={() => setDoc({ kind: 'sf5' })}
              >
                <FileText className="w-3.5 h-3.5" /> Print Form 5
              </Button>
              <Button
                variant="outline"
                className="justify-start gap-2 w-full"
                onClick={() => setDoc({ kind: 'batch' })}
              >
                <Printer className="w-3.5 h-3.5" /> Print Report Cards
              </Button>
            </>
          }
          anchors={[]}
        />
        <div className="flex-1 min-w-0">
          <Tabs defaultValue="list">
            <TabsList className="bg-panel border border-border-soft p-0.5 mb-3 rounded-md">
              {TAB_KEYS.map((k) => (
                <TabsTrigger key={k} value={k}>
                  {TAB_LABELS[k]}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="list">
              <SectionCard heading="Class List">
                <div className="flex justify-end mb-3">
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={openAdd}>
                    <Plus className="w-3.5 h-3.5" /> Add learners
                  </Button>
                </div>

                {addOpen && (
                  <div className="mb-4 rounded-md border border-border bg-app/40 p-3">
                    <p className="text-[11.5px] text-ink-muted mb-2">
                      Search learners by name or LRN, tick them, then enroll into{' '}
                      <span className="font-medium">
                        Grade {klass.gradeLevel} · {klass.sectionName}
                      </span>{' '}
                      for SY {klass.sy}.
                    </p>
                    <input
                      value={addSearch}
                      onChange={(e) => setAddSearch(e.target.value)}
                      placeholder={allLite === null ? 'Loading learners…' : 'Type a name or LRN…'}
                      disabled={allLite === null}
                      className="w-full rounded border border-border bg-panel px-2.5 py-1.5 text-[12.5px] text-ink-primary mb-2"
                    />
                    <div className="max-h-[220px] overflow-y-auto">
                      {addSearch.trim() === '' ? (
                        <p className="text-[12px] text-ink-muted px-1 py-2">Start typing to find learners.</p>
                      ) : addResults.length === 0 ? (
                        <p className="text-[12px] text-ink-muted px-1 py-2">No matches (already-enrolled learners are hidden).</p>
                      ) : (
                        addResults.map((s) => (
                          <label
                            key={s.lrn}
                            className="flex items-center gap-2 py-1 px-1 text-[12.5px] cursor-pointer hover:bg-app rounded"
                          >
                            <input
                              type="checkbox"
                              checked={addSel.has(s.lrn)}
                              onChange={() => toggleAdd(s.lrn)}
                              className="h-3.5 w-3.5 accent-nps-red"
                            />
                            <span className="flex-1">{formatLastFirstMiddle(s)}</span>
                            <span className="font-mono text-ink-muted text-[11px]">{s.lrn}</span>
                          </label>
                        ))
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border-soft">
                      <Button size="sm" disabled={addBusy || addSel.size === 0} onClick={enrollSelected}>
                        {addBusy ? 'Enrolling…' : `Enroll ${addSel.size} learner${addSel.size === 1 ? '' : 's'}`}
                      </Button>
                      <button
                        type="button"
                        onClick={() => setAddOpen(false)}
                        className="text-[12px] text-ink-muted hover:text-ink-primary"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-x-4">
                  <div>
                    <div className="bg-panel-alt -mx-4 px-4 py-2 border-b border-border text-label uppercase font-bold text-ink-muted">
                      Male · {males.length}
                    </div>
                    {males.map((s, i) => (
                      <div
                        key={s.lrn}
                        onClick={() => navigate(`/students/${s.lrn}`)}
                        className="group flex items-center gap-2.5 py-1.5 -mx-4 px-4 cursor-pointer hover:bg-app text-[12.5px]"
                      >
                        <span className="text-ink-muted w-5 tabular-nums">{i + 1}</span>
                        <span className="flex-1">{formatLastFirstMiddle(s)}</span>
                        <button
                          type="button"
                          disabled={removingLrn === s.lrn}
                          onClick={(e) => {
                            e.stopPropagation();
                            void unenroll(s);
                          }}
                          className="opacity-0 group-hover:opacity-100 text-nps-red hover:underline text-[11px] font-medium shrink-0"
                          title="Remove from this class"
                        >
                          {removingLrn === s.lrn ? '…' : 'Remove'}
                        </button>
                      </div>
                    ))}
                  </div>
                  <div>
                    <div className="bg-panel-alt -mx-4 px-4 py-2 border-b border-border text-label uppercase font-bold text-ink-muted">
                      Female · {females.length}
                    </div>
                    {females.map((s, i) => (
                      <div
                        key={s.lrn}
                        onClick={() => navigate(`/students/${s.lrn}`)}
                        className="group flex items-center gap-2.5 py-1.5 -mx-4 px-4 cursor-pointer hover:bg-app text-[12.5px]"
                      >
                        <span className="text-ink-muted w-5 tabular-nums">{i + 1}</span>
                        <span className="flex-1">{formatLastFirstMiddle(s)}</span>
                        <button
                          type="button"
                          disabled={removingLrn === s.lrn}
                          onClick={(e) => {
                            e.stopPropagation();
                            void unenroll(s);
                          }}
                          className="opacity-0 group-hover:opacity-100 text-nps-red hover:underline text-[11px] font-medium shrink-0"
                          title="Remove from this class"
                        >
                          {removingLrn === s.lrn ? '…' : 'Remove'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
                {roster.length === 0 && (
                  <p className="text-[12.5px] text-ink-secondary px-1 pt-3">
                    No learners assigned to this class yet. Set a student's class from their record.
                  </p>
                )}
              </SectionCard>
            </TabsContent>

            <TabsContent value="form1">
              <SectionCard heading={`Form 1 — DepEd SF 1 (Adviser: ${adviserName})`}>
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-[0.04em] text-ink-muted border-b border-border">
                      <th className="py-1.5 pr-3">LRN</th>
                      <th className="py-1.5 pr-3">Name</th>
                      <th className="py-1.5 pr-3">Sex</th>
                      <th className="py-1.5 pr-3">Birthdate</th>
                      <th className="py-1.5 pr-3">Father</th>
                      <th className="py-1.5">Mother (maiden)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roster.map((s) => (
                      <tr key={s.lrn} className="border-b border-border-soft last:border-0">
                        <td className="py-1.5 pr-3 font-mono">{s.lrn}</td>
                        <td className="py-1.5 pr-3">{formatLastFirstMiddle(s)}</td>
                        <td className="py-1.5 pr-3">{s.gender.charAt(0)}</td>
                        <td className="py-1.5 pr-3">{s.birthdate}</td>
                        <td className="py-1.5 pr-3">{s.fatherName}</td>
                        <td className="py-1.5">{s.motherMaidenName}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </SectionCard>
            </TabsContent>

            <TabsContent value="nat">
              <SectionCard heading="NAT scores (DepEd National Achievement Test)">
                <p className="text-[12.5px] text-ink-secondary mb-3">
                  Grade {klass.gradeLevel} is not eligible for NAT. Page shown for completeness;
                  SCHOOL ID column is derived from <span className="font-mono">LRN[0:6]</span>.
                </p>
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-[0.04em] text-ink-muted border-b border-border">
                      <th className="py-1.5 pr-3">Name</th>
                      <th className="py-1.5 pr-3">LRN</th>
                      <th className="py-1.5 pr-3">School ID (from LRN)</th>
                      <th className="py-1.5">Filipino</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roster.map((s) => (
                      <tr key={s.lrn} className="border-b border-border-soft last:border-0">
                        <td className="py-1.5 pr-3">{formatLastFirstMiddle(s)}</td>
                        <td className="py-1.5 pr-3 font-mono">{s.lrn}</td>
                        <td className="py-1.5 pr-3 font-mono text-ink-secondary">
                          {schoolIdFromLrn(s.lrn)}
                        </td>
                        <td className="py-1.5 text-ink-muted">—</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </SectionCard>
            </TabsContent>

            <TabsContent value="pupils">
              <SectionCard heading="Pupils Directory">
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-[0.04em] text-ink-muted border-b border-border">
                      <th className="py-1.5 pr-3">Name</th>
                      <th className="py-1.5 pr-3">Address</th>
                      <th className="py-1.5">Contact</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roster.map((s) => (
                      <tr
                        key={s.lrn}
                        onClick={() => navigate(`/students/${s.lrn}`)}
                        className="border-b border-border-soft last:border-0 cursor-pointer hover:bg-app"
                      >
                        <td className="py-1.5 pr-3">{formatLastFirstMiddle(s)}</td>
                        <td className="py-1.5 pr-3 text-ink-secondary">{s.address}</td>
                        <td className="py-1.5 font-mono">{s.contactNumber}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </SectionCard>
            </TabsContent>

            <TabsContent value="idinfo">
              <SectionCard heading="ID Info — for printing student IDs">
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-[0.04em] text-ink-muted border-b border-border">
                      <th className="py-1.5 pr-3">Student Name</th>
                      <th className="py-1.5 pr-3">Parent / Guardian</th>
                      <th className="py-1.5 pr-3">Address</th>
                      <th className="py-1.5">Contact No.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roster.map((s) => (
                      <tr key={s.lrn} className="border-b border-border-soft last:border-0">
                        <td className="py-1.5 pr-3">{formatLastFirstMiddle(s)}</td>
                        <td className="py-1.5 pr-3 text-ink-secondary">
                          {s.guardianRelation === 'Father' ? s.fatherName : s.motherMaidenName}
                        </td>
                        <td className="py-1.5 pr-3 text-ink-secondary">{s.address}</td>
                        <td className="py-1.5 font-mono">{s.contactNumber}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </SectionCard>
            </TabsContent>

            <TabsContent value="parents">
              <SectionCard heading="Parents' Directory">
                <p className="text-[11.5px] text-ink-muted mb-3 px-1">
                  Per-pupil identity + origin info — what parents care about. Continuous numbering, no Boys/Girls split (legacy convention for this view).
                </p>
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-[0.04em] text-ink-muted border-b border-border">
                      <th className="py-1.5 pr-2 w-[5%]">#</th>
                      <th className="py-1.5 pr-3">First Name</th>
                      <th className="py-1.5 pr-3">Middle Name</th>
                      <th className="py-1.5 pr-3">Last Name</th>
                      <th className="py-1.5 pr-3 w-[12%]">Birthdate</th>
                      <th className="py-1.5 pr-3 w-[7%]">Sex</th>
                      <th className="py-1.5 w-[16%]">LRN</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roster.map((s, i) => (
                      <tr key={s.lrn} className="border-b border-border-soft last:border-0">
                        <td className="py-1.5 pr-2 text-ink-muted tabular-nums">{i + 1}</td>
                        <td className="py-1.5 pr-3">{s.firstName}</td>
                        <td className="py-1.5 pr-3 text-ink-secondary">{s.middleName}</td>
                        <td className="py-1.5 pr-3">{s.lastName.toUpperCase()}</td>
                        <td className="py-1.5 pr-3 font-mono">{s.birthdate}</td>
                        <td className="py-1.5 pr-3">{s.gender.charAt(0)}</td>
                        <td className="py-1.5 font-mono">{s.lrn}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </SectionCard>
            </TabsContent>

            <TabsContent value="credentials">
              <SectionCard heading="Credentials submitted">
                <p className="text-[11.5px] text-ink-muted mb-3 px-1">
                  Check = on file. <span className="text-pending-fg">×</span> = pending. <span className="font-mono">—</span> = not applicable for this grade.
                </p>
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-[0.04em] text-ink-muted border-b border-border">
                      <th className="py-1.5 pr-3">Name</th>
                      {CRED_KEYS.map((k) => (
                        <th key={k} className="py-1.5 pr-2 text-center w-[6%]">
                          {k.toUpperCase()}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {roster.map((s) => (
                      <tr key={s.lrn} className="border-b border-border-soft last:border-0">
                        <td className="py-1.5 pr-3">{formatLastFirstMiddle(s)}</td>
                        {CRED_KEYS.map((k) => {
                          const v = s.credentials[k];
                          return (
                            <td key={k} className="py-1.5 pr-2 text-center">
                              {v === 'on-file' ? (
                                <Check className="w-3.5 h-3.5 text-ok-fg inline-block" />
                              ) : v === 'pending' ? (
                                <X className="w-3.5 h-3.5 text-pending-fg inline-block" />
                              ) : (
                                <span className="text-ink-muted">—</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </SectionCard>
            </TabsContent>

            <TabsContent value="form5">
              <SectionCard heading="Form 5 — DepEd SF 5 Report on Promotion">
                <div className="grid grid-cols-[1fr_auto] gap-6">
                  <table className="text-[12px]">
                    <thead>
                      <tr className="text-left text-[11px] uppercase tracking-[0.04em] text-ink-muted border-b border-border">
                        <th className="py-1.5 pr-3 w-[18%]">LRN</th>
                        <th className="py-1.5 pr-3">Learner's Name</th>
                        <th className="py-1.5 pr-3 w-[14%] text-right">Gen Avg</th>
                        <th className="py-1.5 w-[18%]">Action Taken</th>
                      </tr>
                    </thead>
                    <tbody>
                      {roster.map((s) => (
                        <tr key={s.lrn} className="border-b border-border-soft last:border-0">
                          <td className="py-1.5 pr-3 font-mono">{s.lrn}</td>
                          <td className="py-1.5 pr-3">{formatLastFirstMiddle(s)}</td>
                          <td className="py-1.5 pr-3 text-right tabular-nums text-ink-muted">—</td>
                          <td className="py-1.5">
                            <StatusBadge tone="ok">promoted</StatusBadge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="flex flex-col gap-3 self-start min-w-[240px]">
                    <div className="bg-panel-alt border border-border-soft rounded p-3">
                      <div className="text-label uppercase font-bold text-ink-muted mb-2">Status summary</div>
                      <div className="grid grid-cols-4 text-[11.5px] gap-y-1">
                        <span></span>
                        <span className="text-right text-ink-muted">M</span>
                        <span className="text-right text-ink-muted">F</span>
                        <span className="text-right text-ink-muted">Total</span>
                        <span className="text-ink-secondary">Promoted</span>
                        <span className="text-right tabular-nums">{males.length}</span>
                        <span className="text-right tabular-nums">{females.length}</span>
                        <span className="text-right tabular-nums font-semibold">{roster.length}</span>
                        <span className="text-ink-secondary">Irregular</span>
                        <span className="text-right tabular-nums">0</span>
                        <span className="text-right tabular-nums">0</span>
                        <span className="text-right tabular-nums">0</span>
                        <span className="text-ink-secondary">Retained</span>
                        <span className="text-right tabular-nums">0</span>
                        <span className="text-right tabular-nums">0</span>
                        <span className="text-right tabular-nums">0</span>
                      </div>
                    </div>
                    <div className="bg-panel-alt border border-border-soft rounded p-3">
                      <div className="text-label uppercase font-bold text-ink-muted mb-2">Proficiency</div>
                      <div className="text-[11.5px] text-ink-secondary">
                        Beginning · Developing · Approaching · Proficient · Advanced — populated when grades are encoded.
                      </div>
                    </div>
                  </div>
                </div>
              </SectionCard>
            </TabsContent>

            <TabsContent value="ncae">
              <SectionCard heading="NCAE scores (DepEd National Career Assessment Exam)">
                <p className="text-[12.5px] text-ink-secondary mb-3">
                  Grade {klass.gradeLevel} is not eligible for NCAE (taken at Grade 9 / 10). Page shown for completeness.
                </p>
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-[0.04em] text-ink-muted border-b border-border">
                      <th className="py-1.5 pr-3">Name</th>
                      <th className="py-1.5 pr-3">LRN</th>
                      <th className="py-1.5 pr-3 text-right">GMC</th>
                      <th className="py-1.5 pr-3 text-right">FIL</th>
                      <th className="py-1.5 pr-3 text-right">MAPEH</th>
                      <th className="py-1.5 text-right">TOTAL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roster.map((s) => (
                      <tr key={s.lrn} className="border-b border-border-soft last:border-0">
                        <td className="py-1.5 pr-3">{formatLastFirstMiddle(s)}</td>
                        <td className="py-1.5 pr-3 font-mono">{s.lrn}</td>
                        <td className="py-1.5 pr-3 text-right text-ink-muted">—</td>
                        <td className="py-1.5 pr-3 text-right text-ink-muted">—</td>
                        <td className="py-1.5 pr-3 text-right text-ink-muted">—</td>
                        <td className="py-1.5 text-right text-ink-muted">—</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </SectionCard>
            </TabsContent>

            <TabsContent value="reportcard">
              <SectionCard heading="Report Card — batch print queue">
                <p className="text-[11.5px] text-ink-muted mb-3 px-1">
                  Print SF 9 / Form 138 report cards for the whole roster (one per page) or a single
                  learner. Use your browser&rsquo;s &ldquo;Save as PDF&rdquo; to export.
                </p>
                <div className="flex justify-end mb-3">
                  <Button variant="outline" className="gap-2" onClick={() => setDoc({ kind: 'batch' })}>
                    <Printer className="w-3.5 h-3.5" /> Print all
                  </Button>
                </div>
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-[0.04em] text-ink-muted border-b border-border">
                      <th className="py-1.5 pr-3 w-[18%]">LRN</th>
                      <th className="py-1.5 pr-3">Learner's Name</th>
                      <th className="py-1.5 pr-3 w-[14%]">{periodWord} status</th>
                      <th className="py-1.5 w-[12%] text-right"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {roster.map((s) => (
                      <tr key={s.lrn} className="border-b border-border-soft last:border-0">
                        <td className="py-1.5 pr-3 font-mono">{s.lrn}</td>
                        <td className="py-1.5 pr-3">{formatLastFirstMiddle(s)}</td>
                        <td className="py-1.5 pr-3">
                          <StatusBadge tone="pending">awaiting {firstPeriodLabel}</StatusBadge>
                        </td>
                        <td className="py-1.5 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setDoc({ kind: 'one', student: s })}
                          >
                            Print
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </SectionCard>
            </TabsContent>

            <TabsContent value="load">
              <SectionCard heading="Subjects & Teachers — this section's teaching load">
                <div className="flex items-start justify-between gap-3 mb-3 px-1">
                  <p className="text-[11.5px] text-ink-muted max-w-[560px]">
                    Tick the subjects taken by this section and choose who teaches each. The
                    assigned teacher is who encodes the grades for that subject. Only ticked
                    subjects are saved.
                  </p>
                  <div className="flex items-center gap-2 shrink-0">
                    {loadSaved && <span className="text-[12px] text-ok-fg">✓ Saved</span>}
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      disabled={loadBusy}
                      onClick={saveLoad}
                    >
                      <Save className="w-3.5 h-3.5" /> {loadBusy ? 'Saving…' : 'Save load'}
                    </Button>
                  </div>
                </div>
                <table className="w-full text-[12.5px]">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-[0.04em] text-ink-muted border-b border-border">
                      <th className="py-1.5 pr-3 w-[10%] text-center">Taken</th>
                      <th className="py-1.5 pr-3">Subject</th>
                      <th className="py-1.5 w-[45%]">Teacher</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subjects.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="py-6 text-center text-ink-secondary">
                          No subjects in the catalog yet. Add them in Setup ▸ Subjects.
                        </td>
                      </tr>
                    ) : (
                      subjects.map((s) => {
                        const offered = isOffered(s.code);
                        return (
                          <tr key={s.code} className="border-b border-border-soft last:border-0">
                            <td className="py-1.5 pr-3 text-center">
                              <input
                                type="checkbox"
                                checked={offered}
                                onChange={(e) => toggleOffered(s.code, e.target.checked)}
                                className="h-3.5 w-3.5 accent-nps-red align-middle"
                              />
                            </td>
                            <td className="py-1.5 pr-3">
                              <span className="font-mono text-ink-secondary mr-2">{s.code}</span>
                              {s.fullName}
                            </td>
                            <td className="py-1.5">
                              <select
                                value={load[s.code] ?? ''}
                                disabled={!offered}
                                onChange={(e) =>
                                  setSubjectTeacher(s.code, e.target.value ? Number(e.target.value) : null)
                                }
                                className="w-full max-w-[320px] rounded border border-border bg-panel px-2 py-1 text-[12.5px] text-ink-primary disabled:opacity-50"
                              >
                                <option value="">— Not assigned yet</option>
                                {activeTeachers.map((t) => (
                                  <option key={t.id} value={t.id}>
                                    {teacherLabel(t)}
                                  </option>
                                ))}
                              </select>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </SectionCard>
            </TabsContent>

            <TabsContent value="esc">
              <SectionCard heading="ESC Billing — Education Service Contracting">
                <div className="flex items-start justify-between gap-3 mb-3 px-1">
                  <p className="text-[11.5px] text-ink-muted">
                    Mark ESC grantees for SY {klass.sy} and record each certificate number. The subsidy
                    amount is the fixed government rate (not stored here).
                  </p>
                  <div className="flex items-center gap-2 shrink-0">
                    {escSaved && <span className="text-[12px] text-ok-fg">✓ Saved</span>}
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      disabled={escBusy}
                      onClick={saveEscRecords}
                    >
                      <Save className="w-3.5 h-3.5" /> {escBusy ? 'Saving…' : 'Save ESC'}
                    </Button>
                  </div>
                </div>
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-[0.04em] text-ink-muted border-b border-border">
                      <th className="py-1.5 pr-3 w-[18%]">LRN</th>
                      <th className="py-1.5 pr-3">Learner's Name</th>
                      <th className="py-1.5 pr-3 w-[12%] text-center">ESC Grantee</th>
                      <th className="py-1.5 w-[26%]">ESC No.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roster.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-6 text-center text-ink-secondary">
                          No learners in this section.
                        </td>
                      </tr>
                    ) : (
                      roster.map((s) => {
                        const e = escState[s.lrn] ?? { grantee: false, escNo: '' };
                        return (
                          <tr key={s.lrn} className="border-b border-border-soft last:border-0">
                            <td className="py-1.5 pr-3 font-mono">{s.lrn}</td>
                            <td className="py-1.5 pr-3">{formatLastFirstMiddle(s)}</td>
                            <td className="py-1.5 pr-3 text-center">
                              <input
                                type="checkbox"
                                checked={e.grantee}
                                onChange={(ev) => setEscGrantee(s.lrn, ev.target.checked)}
                                className="h-3.5 w-3.5 accent-nps-red align-middle"
                              />
                            </td>
                            <td className="py-1.5">
                              <input
                                value={e.escNo}
                                onChange={(ev) => setEscNo(s.lrn, ev.target.value)}
                                placeholder={e.grantee ? 'Certificate / QVR no.' : ''}
                                disabled={!e.grantee}
                                className="w-full max-w-[240px] rounded border border-border bg-panel px-2 py-1 text-[12.5px] text-ink-primary disabled:opacity-50"
                              />
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </SectionCard>
            </TabsContent>

            <TabsContent value="transferees">
              <SectionCard heading="Class Transferees">
                <p className="text-[11.5px] text-ink-muted mb-3 px-1">
                  Log of learners who transferred IN or OUT of this section during SY {klass.sy}.
                </p>

                <div className="flex flex-wrap items-end gap-2 mb-3 px-1">
                  <input
                    value={tForm.name}
                    onChange={(e) => setTForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="Learner name"
                    className="flex-1 min-w-[180px] rounded border border-border bg-panel px-2 py-1 text-[12.5px] text-ink-primary"
                  />
                  <select
                    value={tForm.direction}
                    onChange={(e) => setTForm((f) => ({ ...f, direction: e.target.value as 'in' | 'out' }))}
                    className="rounded border border-border bg-panel px-2 py-1 text-[12.5px] text-ink-primary"
                  >
                    <option value="in">Transferred IN</option>
                    <option value="out">Transferred OUT</option>
                  </select>
                  <input
                    type="date"
                    value={tForm.date}
                    onChange={(e) => setTForm((f) => ({ ...f, date: e.target.value }))}
                    className="rounded border border-border bg-panel px-2 py-1 text-[12.5px] text-ink-primary"
                  />
                  <input
                    value={tForm.school}
                    onChange={(e) => setTForm((f) => ({ ...f, school: e.target.value }))}
                    placeholder="Other school (from / to)"
                    className="flex-1 min-w-[160px] rounded border border-border bg-panel px-2 py-1 text-[12.5px] text-ink-primary"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    disabled={tBusy || !tForm.name.trim()}
                    onClick={submitTransfer}
                  >
                    <Plus className="w-3.5 h-3.5" /> Add
                  </Button>
                </div>

                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-[0.04em] text-ink-muted border-b border-border">
                      <th className="py-1.5 pr-3">Name</th>
                      <th className="py-1.5 pr-3 w-[12%]">Direction</th>
                      <th className="py-1.5 pr-3 w-[18%]">Date</th>
                      <th className="py-1.5">Other school</th>
                      <th className="py-1.5 w-8" />
                    </tr>
                  </thead>
                  <tbody>
                    {transfers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-ink-secondary">
                          No transferees recorded for this section.
                        </td>
                      </tr>
                    ) : (
                      transfers.map((t) => (
                        <tr key={t.id} className="border-b border-border-soft last:border-0">
                          <td className="py-1.5 pr-3">{t.learnerName}</td>
                          <td className="py-1.5 pr-3">
                            <StatusBadge tone={t.direction === 'in' ? 'ok' : 'pending'}>
                              {t.direction === 'in' ? 'IN' : 'OUT'}
                            </StatusBadge>
                          </td>
                          <td className="py-1.5 pr-3 font-mono whitespace-nowrap">
                            {t.transferDate ? formatBirthdate(t.transferDate) : '—'}
                          </td>
                          <td className="py-1.5 text-ink-secondary">{t.otherSchool || '—'}</td>
                          <td className="py-1.5 text-right">
                            <button
                              onClick={() => removeTransfer(t.id)}
                              className="p-1 rounded text-ink-muted hover:text-destructive hover:bg-app"
                              aria-label="Delete transferee"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </SectionCard>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      <PrintHost
        open={doc !== null}
        docTitle={
          doc?.kind === 'sf1'
            ? `SF 1 (School Register) · Grade ${klass.gradeLevel} ${klass.sectionName}`
            : doc?.kind === 'sf5'
              ? `SF 5 (Promotion) · Grade ${klass.gradeLevel} ${klass.sectionName}`
              : doc?.kind === 'batch'
                ? `Report Cards · Grade ${klass.gradeLevel} ${klass.sectionName}`
                : doc?.kind === 'one'
                  ? `Report Card · ${doc.student.lastName}, ${doc.student.firstName}`
                  : ''
        }
        onClose={() => setDoc(null)}
      >
        {doc?.kind === 'sf1' ? (
          <ClassForm1 klass={klass} roster={roster} />
        ) : doc?.kind === 'sf5' ? (
          <ClassForm5 klass={klass} roster={roster} subjects={subjects} />
        ) : doc?.kind === 'batch' ? (
          <BatchReportCards klass={klass} roster={roster} subjects={subjects} attitudeScale={attitudeScale} />
        ) : doc?.kind === 'one' ? (
          <ReportCardSF9 student={doc.student} subjects={subjects} sy={klass.sy} attitudeScale={attitudeScale} />
        ) : null}
      </PrintHost>
    </>
  );
}
