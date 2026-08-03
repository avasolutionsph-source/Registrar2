import { Fragment, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Printer, FileText, Users as UsersIcon, Check, X, Pencil, Plus, Trash2, Save, Copy } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { PrintHost } from '@/components/print/PrintHost';
import { ClassForm1 } from '@/components/print/ClassForm1';
import { NatTab } from './NatTab';
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
  listGradeSubjects,
  listStudentsLite,
  bulkEnrollForSy,
  listAttitudeScale,
  unenrollFromClass,
  type Transfer,
} from '@/lib/db';
import type { AttitudeBand } from '@/lib/grading';
import { periodsForSy, subjectFitsSection, MAPEH_COMPONENT_CODES } from '@/lib/forms';
import { groupRosterBySex } from '@/lib/roster';
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

// Standard DepEd class-list grouping (MALE → FEMALE → Unspecified) — the
// shared system-wide helper, so every roster splits the same way.
const groupBySex = groupRosterBySex;

// Separator row for a grouped roster table: MALE / FEMALE / UNSPECIFIED header
// spanning the whole table, matching the existing directory tabs.
function SexRow({ grp, colSpan }: { grp: ReturnType<typeof groupBySex>[number]; colSpan: number }) {
  return (
    <tr>
      {/* The band spans the whole table, so sticking the CELL does nothing — its
          left edge is already at 0 and it simply scrolls away with everything
          else. Pinning the LABEL inside it is what keeps MALE / FEMALE readable
          after the table is scrolled sideways. A no-op on narrow tables. */}
      <td
        colSpan={colSpan}
        className={`py-1 text-[11px] font-bold uppercase tracking-wider ${
          grp.key === 'Unspecified' ? 'bg-amber-100 text-amber-800' : 'bg-app'
        }`}
      >
        <span className="sticky left-0 inline-block px-2">
          {grp.label} · {grp.students.length}
        </span>
      </td>
    </tr>
  );
}

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
  const [copied, setCopied] = useState(false); // "Copy list" feedback
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [attitudeScale, setAttitudeScale] = useState<AttitudeBand[] | undefined>(undefined);
  const [load, setLoad] = useState<Record<string, number | null>>({}); // subjectCode -> teacherId | null (assigned subjects)
  // Registrar-curated subject codes for this grade/strand, in curriculum order
  // (Setup ▸ Subjects — Order per Grade). Drives which subjects the load tab lists.
  const [gradeOrder, setGradeOrder] = useState<string[]>([]);
  // Subject codes as SAVED for this section — off-curriculum rows list from
  // this (not the live draft), so an unticked one stays visible until Save.
  const [savedCodes, setSavedCodes] = useState<string[]>([]);
  const [loadBusy, setLoadBusy] = useState(false);
  // Rotating subjects: THIS SECTION's term breakdown (ano ang itinuturo bawat
  // term dito) — { [SUBJECTCODE]: { q1: 'EPP', … } }, keys UPPERCASED so a
  // stored code and its catalog entry always meet. KAILANGAN kumpleto (bawat
  // period ng SY) bago ma-save ang load; sections may run the terms in
  // different order.
  const [termNames, setTermNames] = useState<Record<string, Record<string, string>>>({});
  // Rotating subjects: tig-isang TEACHER bawat term ng section na ito —
  // { [SUBJECTCODE]: { q1: 160, … } }, null/wala = walang guro pa sa term.
  // Kapareho ng shape ng reg_class_subjects.term_teachers (na siya ring
  // binabasa ng coordinator at ng teacher gradebook), kaya ang dito i-set ay
  // agad na lalabas sa kabilang system.
  const [loadTermTeachers, setLoadTermTeachers] = useState<Record<string, Record<string, number | null>>>({});
  // MAPEH pair (GS): sino ang MAUUNA sa section na ito, per pares (key =
  // sorted UPPER codes joined '|', value = UPPER code ng Term 1 subject).
  // LAGING naka-rotate ang pares — ang una ay Term 1+2 ('q1,q2'), ang kapareha
  // ay Term 2+3 ('q2,q3'), at PAREHO sila sa Term 2 kung saan ang average ng
  // dalawa ang MAPEH grade. Walang entry = default sa curriculum order.
  const [pairFirst, setPairFirst] = useState<Record<string, string>>({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadSaved, setLoadSaved] = useState(false);
  const [removingLrn, setRemovingLrn] = useState<string | null>(null);

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
        listAttitudeScale(c?.sy).then((s) => { if (!cancelled) setAttitudeScale(s); }).catch(() => {});
        // Keys UPPERCASED so stored-vs-catalog code casing can never split a
        // subject into two entries.
        setLoad(Object.fromEntries(classSubs.map((a) => [a.subjectCode.toUpperCase(), a.teacherId])));
        setSavedCodes(classSubs.map((a) => a.subjectCode));
        setTermNames(Object.fromEntries(
          classSubs
            .filter((a) => a.termLabels)
            .map((a) => [a.subjectCode.toUpperCase(), { ...(a.termLabels as Record<string, string>) }]),
        ));
        // Per-term teachers ng rotating subjects. Legacy na rotating row na
        // isahang teacher pa (walang map): i-prefill ang BAWAT term ng
        // teacher na iyon para walang tahimik na maaalis sa susunod na save.
        {
          const rotatingCodes = new Set(
            subs.filter((s) => s.isRotating).map((s) => s.code.toUpperCase()),
          );
          const seeded: Record<string, Record<string, number | null>> = {};
          for (const a of classSubs) {
            const k = a.subjectCode.toUpperCase();
            if (a.termTeachers) seeded[k] = { ...a.termTeachers };
            else if (rotatingCodes.has(k) && a.teacherId != null) {
              seeded[k] = Object.fromEntries(periodsForSy(c?.sy).map((p) => [p.key, a.teacherId]));
            }
          }
          setLoadTermTeachers(seeded);
        }
        // MAPEH pair: basahin kung sino ang naunang na-save mula sa term
        // coverage ng dalawang row ('q1,q2' ang una, 'q2,q3' ang pangalawa).
        // Walang naka-store na rotation = walang entry — ang render ang
        // magde-default sa curriculum order.
        {
          const pk = periodsForSy(c?.sy).map((p) => p.key);
          const covFirst = pk.slice(0, 2).join(',');
          const covSecond = pk.slice(-2).join(',');
          const subByCode = new Map(subs.map((s) => [s.code.toUpperCase(), s]));
          const termByCode = new Map(classSubs.map((a) => [a.subjectCode.toUpperCase(), a.term ?? null]));
          const firsts: Record<string, string> = {};
          for (const s of subs) {
            const partner = s.pairedWith ? subByCode.get(s.pairedWith.toUpperCase()) : undefined;
            if (!partner) continue;
            const a = s.code.toUpperCase();
            const b = partner.code.toUpperCase();
            const key = [a, b].sort().join('|');
            if (firsts[key] || pk.length !== 3) continue;
            const ta = termByCode.get(a);
            const tb = termByCode.get(b);
            if (ta === covFirst && tb === covSecond) firsts[key] = a;
            else if (tb === covFirst && ta === covSecond) firsts[key] = b;
          }
          setPairFirst(firsts);
        }
        if (c) {
          listGradeSubjects(c.gradeLevel)
            .then((codes) => { if (!cancelled) setGradeOrder(codes); })
            .catch(() => { if (!cancelled) setGradeOrder([]); });
        }
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

  // The load tab mirrors "Setup ▸ Subjects — Order per Grade": exactly this
  // grade/strand's curriculum subjects, in curriculum order. Subjects already
  // saved for the section but no longer in the curriculum stay visible (flagged)
  // so nothing silently disappears. Grades with no curriculum configured yet
  // fall back to the level-filtered catalog. MUST stay above the early returns
  // below — a hook after them changes the hook count between renders (React #310).
  const loadSubjects = useMemo(() => {
    if (!klass) return [] as { subject: Subject; inCurriculum: boolean }[];
    if (!gradeOrder.length) {
      return subjects
        .filter((s) => subjectFitsSection(s.level, klass.gradeLevel))
        .map((subject) => ({ subject, inCurriculum: true }));
    }
    const byCode = new Map(subjects.map((s) => [s.code.toUpperCase(), s]));
    const seen = new Set<string>();
    const rows: { subject: Subject; inCurriculum: boolean }[] = [];
    for (const code of gradeOrder) {
      const subject = byCode.get(code.toUpperCase());
      if (!subject || seen.has(code.toUpperCase())) continue;
      seen.add(code.toUpperCase());
      rows.push({ subject, inCurriculum: true });
    }
    for (const code of savedCodes) {
      const subject = byCode.get(code.toUpperCase());
      if (!subject || seen.has(code.toUpperCase())) continue;
      seen.add(code.toUpperCase());
      rows.push({ subject, inCurriculum: false });
    }
    return rows;
  }, [klass, subjects, gradeOrder, savedCodes]);

  // MAPEH pair (GS): pares na PAREHONG nasa listahan ng section — iisang
  // "MAPEH" block sila sa table (isang checkbox, isang teacher, schedule per
  // term). Ang unang miyembro sa curriculum order ang nagre-render ng block
  // (primary); nilalaktawan ang kapareha. MUST stay above the early returns
  // below (React #310).
  const pairOf = useMemo(() => {
    const present = new Set(loadSubjects.map((r) => r.subject.code.toUpperCase()));
    const m = new Map<string, { partner: string; primary: boolean }>();
    for (const { subject } of loadSubjects) {
      const code = subject.code.toUpperCase();
      const partner = subject.pairedWith?.toUpperCase();
      if (!partner || !present.has(partner) || m.has(code) || m.has(partner)) continue;
      m.set(code, { partner, primary: true });
      m.set(partner, { partner: code, primary: false });
    }
    return m;
  }, [loadSubjects]);

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

  // ── Copy the class list for Word / Excel ─────────────────────────────────
  // Rendering the roster as a <table> is not enough on its own: a drag-select
  // copy hands Word whatever the browser decides to serialise, which still
  // carries the hidden "Remove" button text and can flatten the columns. This
  // builds the exact HTML we want and puts it on the clipboard itself, so the
  // paste is the same every time — two columns, names only.
  async function copyClassList() {
    const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const line = (s: Student | undefined, i: number) =>
      s ? `${i + 1}. ${formatLastFirstMiddle(s)}` : '';

    const lines: string[] = [`MALE · ${males.length}\tFEMALE · ${females.length}`];
    let html =
      '<table style="border-collapse:collapse" cellpadding="4">' +
      `<tr><td><b>MALE &middot; ${males.length}</b></td>` +
      `<td><b>FEMALE &middot; ${females.length}</b></td></tr>`;
    for (let i = 0; i < Math.max(males.length, females.length); i++) {
      html += `<tr><td>${esc(line(males[i], i))}</td><td>${esc(line(females[i], i))}</td></tr>`;
      lines.push(`${line(males[i], i)}\t${line(females[i], i)}`);
    }
    html += '</table>';
    const text = lines.join('\n');

    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': new Blob([html], { type: 'text/html' }),
          'text/plain': new Blob([text], { type: 'text/plain' }),
        }),
      ]);
    } catch {
      // Browsers without the async clipboard (or with it blocked): select a
      // hidden copy of the table and use the old command, which still carries
      // rich text through to Word.
      const holder = document.createElement('div');
      holder.innerHTML = html;
      holder.setAttribute('style', 'position:fixed;left:-9999px;top:0');
      document.body.appendChild(holder);
      const range = document.createRange();
      range.selectNodeContents(holder);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
      try {
        document.execCommand('copy');
      } catch {
        /* clipboard unavailable — the on-screen table can still be drag-copied */
      }
      sel?.removeAllRanges();
      holder.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  // One learner line in the Class List table. Kept as a plain render helper (not
  // a component) so it closes over navigate/unenroll without remounting on
  // every keystroke elsewhere on the page.
  const rosterCell = (s: Student, i: number) => (
    <div
      onClick={() => navigate(`/students/${s.lrn}`)}
      className="group flex items-center gap-2.5 px-4 py-1.5 cursor-pointer hover:bg-app"
    >
      {/* The explicit space survives into the clipboard — without it the
          number and the surname paste into Word glued together ("1ALBIA").
          Whitespace-only text is not a flex item, so nothing moves on screen. */}
      <span className="text-ink-muted w-5 shrink-0 tabular-nums">{i + 1}</span>{' '}
      <span className="flex-1">{formatLastFirstMiddle(s)}</span>
      <button
        type="button"
        disabled={removingLrn === s.lrn}
        onClick={(e) => {
          e.stopPropagation();
          void unenroll(s);
        }}
        // select-none keeps the word "Remove" out of a drag-select copy, so a
        // roster pasted into Word is names only.
        className="select-none opacity-0 group-hover:opacity-100 text-nps-red hover:underline text-[11px] font-medium shrink-0"
        title="Remove from this class"
      >
        {removingLrn === s.lrn ? '…' : 'Remove'}
      </button>
    </div>
  );
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

  const isOffered = (code: string) =>
    Object.prototype.hasOwnProperty.call(load, code.toUpperCase());
  const toggleOffered = (code: string, offered: boolean) => {
    const k = code.toUpperCase();
    setLoad((l) => {
      const next = { ...l };
      if (offered) next[k] = next[k] ?? null;
      else delete next[k];
      return next;
    });
    setLoadSaved(false);
  };
  // Select-all for the Taken column: ticks every CURRICULUM subject at once but
  // never touches the teacher — existing assignments stay, new ticks open as
  // "Not assigned yet". Off-curriculum rows are never (re)added — removal is
  // their only direction. Unticking clears the whole load list.
  const toggleAllOffered = (offered: boolean) => {
    setLoad((l) => {
      if (!offered) return {};
      const next = { ...l };
      for (const { subject, inCurriculum } of loadSubjects) {
        const k = subject.code.toUpperCase();
        if (inCurriculum) next[k] = next[k] ?? null;
      }
      return next;
    });
    setLoadSaved(false);
  };
  const setSubjectTeacher = (code: string, teacherId: number | null) => {
    setLoad((l) => ({ ...l, [code.toUpperCase()]: teacherId }));
    setLoadSaved(false);
  };
  // Rotating subject: itakda ang guro ng ISANG term (pwedeng maulit ang
  // teacher sa ibang term; null = walang guro sa term na iyon).
  const setTermTeacher = (code: string, periodKey: string, teacherId: number | null) => {
    const k = code.toUpperCase();
    setLoadTermTeachers((cur) => ({ ...cur, [k]: { ...(cur[k] ?? {}), [periodKey]: teacherId } }));
    setLoadSaved(false);
  };
  // The current breakdown of one rotating subject (UPPERCASED code), or null
  // while ANY period of this class's SY is still unnamed.
  const breakdownOf = (codeUpper: string) => {
    const t = termNames[codeUpper];
    if (!t) return null;
    const out: Record<string, string> = {};
    for (const p of periodsForSy(klass?.sy)) {
      const v = (t[p.key] ?? '').trim();
      if (!v) return null;
      out[p.key] = v;
    }
    return out;
  };
  // MAPEH pair: sino ang mauuna sa pares ('|'-joined sorted key) at ang term
  // coverage ng isang miyembro ayon dito. LAGING naka-rotate sa 3-period SY;
  // sa iba (4-quarter legacy) ay null (buong taon) ang coverage.
  const pairKeyOf = (aUpper: string, bUpper: string) => [aUpper, bUpper].sort().join('|');
  const pairFirstOf = (key: string, fallbackFirst: string) => pairFirst[key] ?? fallbackFirst;
  const pairCoverage = (key: string, codeUpper: string, primaryUpper: string): string | null => {
    if (periods.length !== 3) return null;
    const pk = periods.map((p) => p.key);
    return pairFirstOf(key, primaryUpper) === codeUpper
      ? `${pk[0]},${pk[1]}`
      : `${pk[1]},${pk[2]}`;
  };

  async function saveLoad() {
    if (!klass) return;
    setLoadError(null);
    // KAILANGAN: every ticked rotating subject must state what is taught in
    // each term of THIS section — an unset breakdown blocks the save.
    // (Everything keyed UPPERCASE; the canonical catalog code is emitted.)
    const rotatingByCode = new Map(
      loadSubjects
        .filter(({ subject }) => subject.isRotating)
        .map(({ subject }) => [subject.code.toUpperCase(), subject]),
    );
    const canonical = new Map(
      loadSubjects.map(({ subject }) => [subject.code.toUpperCase(), subject.code]),
    );
    // Ang pair membership ang nananaig sa isang subject na sabay na naka-flag
    // na rotating AT paired — pair block ang nakikita ng registrar, kaya ang
    // pair path din ang sine-save (hindi hinihingi ang breakdown).
    const missing = Object.keys(load)
      .filter((k) => rotatingByCode.has(k) && !pairOf.has(k) && breakdownOf(k) == null)
      .map((k) => rotatingByCode.get(k)?.fullName ?? k);
    if (missing.length) {
      setLoadError(
        `Incomplete ${periodWord} breakdown for rotating subject: ${missing.join(', ')}. ` +
        `Enter what is taught in each ${periodWord.toLowerCase()} of this section before saving.`,
      );
      return;
    }
    setLoadBusy(true);
    try {
      await saveClassSubjects(
        klass.id,
        Object.entries(load).map(([k, teacherId]) => {
          // MAPEH pair member: isulat ang term coverage ayon sa rotation
          // (una → 'q1,q2', pangalawa → 'q2,q3'). Ang mga hindi pares ay
          // hindi ginagalaw (undefined = keep stored).
          const pr = pairOf.get(k);
          // Rotating subject: tig-isang teacher bawat term. Ang teacher_id ng
          // row ay ang guro ng UNANG term na may nakatalaga (kapareho ng
          // acad_assign_combo), ang term ay ang mga term na may guro. Ang pair
          // member ay HINDI dadaan dito kahit naka-flag ding rotating — ang
          // pair select (load[k]) ang pinananaig, tugma sa nakikitang UI.
          const rot = rotatingByCode.has(k) && !pr;
          const rotMap = rot ? loadTermTeachers[k] ?? {} : {};
          const rotAssigned = rot
            ? periodsForSy(klass.sy).map((p) => p.key).filter((pk) => rotMap[pk] != null)
            : [];
          return {
            subjectCode: canonical.get(k) ?? k,
            teacherId: rot
              ? (rotAssigned.length ? (rotMap[rotAssigned[0]] as number) : null)
              : teacherId,
            // Rotating subjects carry their breakdown; others keep what is stored.
            termLabels: rot ? breakdownOf(k) : undefined,
            ...(rot
              ? {
                  termTeachers: rotAssigned.length
                    ? Object.fromEntries(rotAssigned.map((pk) => [pk, rotMap[pk] as number]))
                    : null,
                  term: rotAssigned.length ? rotAssigned.join(',') : null,
                }
              : {}),
            ...(pr
              ? { term: pairCoverage(pairKeyOf(k, pr.partner), k, pr.primary ? k : pr.partner) }
              : {}),
          };
        }),
      );
      setLoadSaved(true);
      // Removed off-curriculum rows are gone for real now — drop them from view.
      setSavedCodes(Object.keys(load));
    } catch {
      setLoadError('The load could not be saved — please try again.');
      // keep edits for retry
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
                <div className="flex justify-end gap-2 mb-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => void copyClassList()}
                    disabled={roster.length === 0}
                    title="Copy the list, then paste into Word or Excel — it arrives as two columns"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5" /> Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" /> Copy list
                      </>
                    )}
                  </Button>
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

                {/* A REAL table, not a CSS grid of divs. Word, Excel and Google
                    Docs all understand <table> and paste this as two columns;
                    a grid is invisible to them, so the same drag-select used to
                    arrive as one long list. Rows pair male[i] with female[i], so
                    the shorter column simply runs out of names. */}
                <div className="-mx-4">
                  <table className="w-full table-fixed border-collapse text-[12.5px]">
                    <thead>
                      <tr>
                        <th className="w-1/2 bg-panel-alt px-4 py-2 border-b border-border text-left text-label uppercase font-bold text-ink-muted">
                          Male · {males.length}
                        </th>
                        <th className="w-1/2 bg-panel-alt px-4 py-2 border-b border-border text-left text-label uppercase font-bold text-ink-muted">
                          Female · {females.length}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from(
                        { length: Math.max(males.length, females.length) },
                        (_, i) => (
                          <tr key={i}>
                            {[males[i], females[i]].map((s, col) => (
                              <td key={col} className="align-top p-0">
                                {s && rosterCell(s, i)}
                              </td>
                            ))}
                          </tr>
                        ),
                      )}
                    </tbody>
                  </table>
                </div>
                {roster.length === 0 && (
                  <p className="text-[12.5px] text-ink-secondary px-1 pt-3">
                    No learners assigned to this class yet. Set a student's class from their record.
                  </p>
                )}
              </SectionCard>
            </TabsContent>

            <TabsContent value="form1">
              {/* The columns are exactly what the school's Form 1 requires —
                  identity, parents, and every way to reach the guardian. Wide,
                  so the table scrolls sideways instead of squeezing. */}
              <SectionCard heading={`Form 1 — DepEd SF 1 (Adviser: ${adviserName})`}>
                {/* Wide table: LRN and Name stay PINNED while the rest scrolls
                    sideways, so a row never loses its owner, and the whole row
                    lights up on hover to carry the eye across ten columns. The
                    pinned cells repeat the row background (and its hover) or
                    the scrolling text would show through them. */}
                <div className="overflow-x-auto">
                <table className="w-full min-w-[1240px] text-[12px]">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-[0.04em] text-ink-muted border-b border-border">
                      <th className="sticky left-0 z-20 bg-panel py-1.5 pr-3 w-[104px] min-w-[104px]">LRN</th>
                      <th className="sticky left-[104px] z-20 bg-panel py-1.5 pr-3 w-[210px] min-w-[210px]">Name</th>
                      <th className="py-1.5 pr-3">Gender</th>
                      <th className="py-1.5 pr-3">Birthdate</th>
                      <th className="py-1.5 pr-3">Father&apos;s Name</th>
                      <th className="py-1.5 pr-3">Mother&apos;s Maiden Name</th>
                      <th className="py-1.5 pr-3">Address</th>
                      <th className="py-1.5 pr-3">Contact</th>
                      <th className="py-1.5 pr-3">Email</th>
                      <th className="py-1.5">Messenger</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupBySex(roster).map((grp) => (
                      <Fragment key={grp.key}>
                        <SexRow grp={grp} colSpan={10} />
                        {grp.students.map((s) => (
                          <tr key={s.lrn} className="group border-b border-border-soft last:border-0 hover:bg-app">
                            <td className="sticky left-0 z-10 bg-panel group-hover:bg-app py-1.5 pr-3 font-mono w-[104px] min-w-[104px]">{s.lrn}</td>
                            <td className="sticky left-[104px] z-10 bg-panel group-hover:bg-app py-1.5 pr-3 w-[210px] min-w-[210px]">{formatLastFirstMiddle(s)}</td>
                            <td className="py-1.5 pr-3">{s.gender.charAt(0)}</td>
                            <td className="py-1.5 pr-3">{s.birthdate}</td>
                            <td className="py-1.5 pr-3">{s.fatherName}</td>
                            <td className="py-1.5 pr-3">{s.motherMaidenName}</td>
                            <td className="py-1.5 pr-3">{s.address}</td>
                            <td className="py-1.5 pr-3">{s.contactNumber}</td>
                            <td className="py-1.5 pr-3">{s.email || '—'}</td>
                            <td className="py-1.5">{s.messenger || '—'}</td>
                          </tr>
                        ))}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
                </div>
              </SectionCard>
            </TabsContent>

            <TabsContent value="nat">
              <NatTab klass={klass} roster={roster} />
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
                    {groupBySex(roster).map((grp) => (
                      <Fragment key={grp.key}>
                        <tr>
                          <td colSpan={3} className={`px-2 py-1 text-[11px] font-bold uppercase tracking-wider ${grp.key === 'Unspecified' ? 'bg-amber-100 text-amber-800' : 'bg-app'}`}>
                            {grp.label} · {grp.students.length}
                          </td>
                        </tr>
                        {grp.students.map((s, i) => (
                          <tr
                            key={s.lrn}
                            onClick={() => navigate(`/students/${s.lrn}`)}
                            className="border-b border-border-soft last:border-0 cursor-pointer hover:bg-app"
                          >
                            <td className="py-1.5 pr-3">{i + 1}. {formatLastFirstMiddle(s)}</td>
                            <td className="py-1.5 pr-3 text-ink-secondary">{s.address}</td>
                            <td className="py-1.5 font-mono">{s.contactNumber}</td>
                          </tr>
                        ))}
                      </Fragment>
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
                    {groupBySex(roster).map((grp) => (
                      <Fragment key={grp.key}>
                        <tr>
                          <td colSpan={4} className={`px-2 py-1 text-[11px] font-bold uppercase tracking-wider ${grp.key === 'Unspecified' ? 'bg-amber-100 text-amber-800' : 'bg-app'}`}>
                            {grp.label} · {grp.students.length}
                          </td>
                        </tr>
                        {grp.students.map((s, i) => (
                          <tr key={s.lrn} className="border-b border-border-soft last:border-0">
                            <td className="py-1.5 pr-3">{i + 1}. {formatLastFirstMiddle(s)}</td>
                            {/* Only the parent named as guardian is shown. When
                                the record says the guardian is someone else,
                                the learner has no guardian NAME on file — the
                                mother's maiden name was being printed there,
                                which is the wrong person on an ID sheet. */}
                            <td className="py-1.5 pr-3 text-ink-secondary">
                              {s.guardianRelation === 'Father' ? s.fatherName
                                : s.guardianRelation === 'Mother' ? s.motherMaidenName
                                : <span className="text-ink-muted" title="Guardian is neither parent — no name recorded">— guardian not named</span>}
                            </td>
                            <td className="py-1.5 pr-3 text-ink-secondary">{s.address}</td>
                            <td className="py-1.5 font-mono">{s.contactNumber}</td>
                          </tr>
                        ))}
                      </Fragment>
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
                      <th className="py-1.5 pr-3 w-[7%]">Gender</th>
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
                    {groupBySex(roster).map((grp) => (
                      <Fragment key={grp.key}>
                        <SexRow grp={grp} colSpan={1 + CRED_KEYS.length} />
                        {grp.students.map((s) => (
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
                      </Fragment>
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
                      {groupBySex(roster).map((grp) => (
                        <Fragment key={grp.key}>
                          <SexRow grp={grp} colSpan={4} />
                          {grp.students.map((s) => (
                            <tr key={s.lrn} className="border-b border-border-soft last:border-0">
                              <td className="py-1.5 pr-3 font-mono">{s.lrn}</td>
                              <td className="py-1.5 pr-3">{formatLastFirstMiddle(s)}</td>
                              <td className="py-1.5 pr-3 text-right tabular-nums text-ink-muted">—</td>
                              <td className="py-1.5">
                                <StatusBadge tone="ok">promoted</StatusBadge>
                              </td>
                            </tr>
                          ))}
                        </Fragment>
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
                    {groupBySex(roster).map((grp) => (
                      <Fragment key={grp.key}>
                        <SexRow grp={grp} colSpan={6} />
                        {grp.students.map((s) => (
                          <tr key={s.lrn} className="border-b border-border-soft last:border-0">
                            <td className="py-1.5 pr-3">{formatLastFirstMiddle(s)}</td>
                            <td className="py-1.5 pr-3 font-mono">{s.lrn}</td>
                            <td className="py-1.5 pr-3 text-right text-ink-muted">—</td>
                            <td className="py-1.5 pr-3 text-right text-ink-muted">—</td>
                            <td className="py-1.5 pr-3 text-right text-ink-muted">—</td>
                            <td className="py-1.5 text-right text-ink-muted">—</td>
                          </tr>
                        ))}
                      </Fragment>
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
                    {groupBySex(roster).map((grp) => (
                      <Fragment key={grp.key}>
                        <SexRow grp={grp} colSpan={4} />
                        {grp.students.map((s) => (
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
                      </Fragment>
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
                    subjects are saved. The list follows this grade&apos;s subjects and order
                    from Setup ▸ Subjects.
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
                {loadError && (
                  <p className="mb-3 px-1 text-[12.5px] text-nps-red bg-nps-red/10 border border-nps-red/20 rounded-md py-2">
                    {loadError}
                  </p>
                )}
                <table className="w-full text-[12.5px]">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-[0.04em] text-ink-muted border-b border-border">
                      <th className="py-1.5 pr-3 w-[10%] text-center">
                        <span className="inline-flex items-center justify-center gap-1.5">
                          {loadSubjects.length > 0 && (
                            <input
                              type="checkbox"
                              checked={loadSubjects.every(({ subject }) => isOffered(subject.code))}
                              ref={(el) => {
                                if (el) {
                                  const some = loadSubjects.some(({ subject }) => isOffered(subject.code));
                                  const all = loadSubjects.every(({ subject }) => isOffered(subject.code));
                                  el.indeterminate = some && !all;
                                }
                              }}
                              onChange={(e) => toggleAllOffered(e.target.checked)}
                              title="Select all subjects — teachers stay unassigned"
                              className="h-3.5 w-3.5 accent-nps-red align-middle"
                            />
                          )}
                          Select All
                        </span>
                      </th>
                      <th className="py-1.5 pr-3">Subject</th>
                      <th className="py-1.5 w-[45%]">Teacher</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadSubjects.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="py-6 text-center text-ink-secondary">
                          No subjects for this grade yet. Set the grade&apos;s subjects and
                          order in Setup ▸ Subjects.
                        </td>
                      </tr>
                    ) : (
                      loadSubjects.map(({ subject: s, inCurriculum }) => {
                        const codeUpper = s.code.toUpperCase();
                        const offered = isOffered(s.code);
                        const rotating = !!s.isRotating;
                        const breakdownDone = breakdownOf(codeUpper) != null;
                        // Rotating: buod ng mga napiling guro bawat term para
                        // sa Teacher column (ang pagpili ay sa breakdown box).
                        const rotTeachers = loadTermTeachers[codeUpper] ?? {};
                        const rotSummary = periods
                          .filter((p) => rotTeachers[p.key] != null)
                          .map((p) => {
                            const t = teachers.find((x) => x.id === rotTeachers[p.key]);
                            return `${p.label}: ${t ? t.familyName : `#${rotTeachers[p.key]}`}`;
                          });
                        // ── MAPEH pair (GS): ang dalawang kapareha ay IISANG
                        // block — isang checkbox, isang teacher, at schedule
                        // per term. Ang kapareha (non-primary) ay hindi na
                        // hiwalay na row. ──
                        const pairInfo = pairOf.get(codeUpper);
                        if (pairInfo && !pairInfo.primary) return null;
                        const partnerRow = pairInfo
                          ? loadSubjects.find((r) => r.subject.code.toUpperCase() === pairInfo.partner)
                          : undefined;
                        if (pairInfo && partnerRow) {
                          const b = partnerRow.subject;
                          const bUpper = b.code.toUpperCase();
                          const key = pairKeyOf(codeUpper, bUpper);
                          const first = pairFirstOf(key, codeUpper);
                          const offeredB = isOffered(b.code);
                          const bothOffered = offered && offeredB;
                          const someOffered = offered || offeredB;
                          const canTick =
                            (inCurriculum || offered) && (partnerRow.inCurriculum || offeredB);
                          const isMapehPair =
                            MAPEH_COMPONENT_CODES.has(codeUpper) && MAPEH_COMPONENT_CODES.has(bUpper);
                          const pairName = isMapehPair
                            ? 'MAPEH'
                            : `${s.abbreviation || s.code} + ${b.abbreviation || b.code}`;
                          const firstSubject = first === codeUpper ? s : b;
                          const secondSubject = first === codeUpper ? b : s;
                          const setFirst = (v: string) => {
                            setPairFirst((cur) => ({ ...cur, [key]: v }));
                            setLoadSaved(false);
                          };
                          return (
                            <Fragment key={s.code}>
                              <tr>
                                <td className="py-1.5 pr-3 text-center align-top pt-2.5">
                                  {/* Isang check para sa DALAWA — sabay silang
                                      naidaragdag/naaalis sa load. */}
                                  <input
                                    type="checkbox"
                                    checked={bothOffered}
                                    ref={(el) => { if (el) el.indeterminate = someOffered && !bothOffered; }}
                                    disabled={!canTick && !someOffered}
                                    onChange={(e) => {
                                      toggleOffered(s.code, e.target.checked);
                                      toggleOffered(b.code, e.target.checked);
                                    }}
                                    title={`One tick covers the pair — ${s.fullName} and ${b.fullName}`}
                                    className="h-3.5 w-3.5 accent-nps-red align-middle disabled:opacity-40"
                                  />
                                </td>
                                <td className="py-1.5 pr-3">
                                  <span className="inline-flex items-center gap-2 flex-wrap">
                                    <span className="rounded-full bg-ok-fg/10 text-ok-fg text-[11px] font-bold px-2 py-0.5">
                                      {pairName} · paired
                                    </span>
                                    <span>
                                      <span className="font-mono text-ink-secondary mr-1.5">{s.code}</span>
                                      {s.fullName}
                                      <span className="text-ink-muted mx-1.5">+</span>
                                      <span className="font-mono text-ink-secondary mr-1.5">{b.code}</span>
                                      {b.fullName}
                                    </span>
                                  </span>
                                  <span className="block text-[11px] text-ink-muted mt-0.5">
                                    One teacher for both subjects (Grade School) or one per subject (JHS);
                                    the {pairName} grade is the average of the two each {periodWord.toLowerCase()}.
                                  </span>
                                </td>
                                <td className="py-1.5">
                                  {/* Tig-isang teacher select bawat subject. GS
                                      convenience: kapag blangko pa ang kabila,
                                      kinokopya ang pinili — palitan na lang ang
                                      isa para sa JHS na magkaibang teacher. */}
                                  <div className="flex flex-col gap-1">
                                    {[
                                      { subj: s, upper: codeUpper, other: b, otherUpper: bUpper },
                                      { subj: b, upper: bUpper, other: s, otherUpper: codeUpper },
                                    ].map(({ subj, upper, other, otherUpper }) => (
                                      <label key={upper} className="flex items-center gap-1.5">
                                        <span
                                          className="w-14 shrink-0 text-[11px] font-mono text-ink-muted"
                                          title={subj.fullName}
                                        >
                                          {subj.code}
                                        </span>
                                        <select
                                          value={load[upper] ?? ''}
                                          disabled={!someOffered}
                                          onChange={(e) => {
                                            const v = e.target.value ? Number(e.target.value) : null;
                                            setSubjectTeacher(subj.code, v);
                                            if (v != null && (load[otherUpper] ?? null) == null) {
                                              setSubjectTeacher(other.code, v);
                                            }
                                          }}
                                          className="w-full max-w-[260px] rounded border border-border bg-panel px-2 py-1 text-[12.5px] text-ink-primary disabled:opacity-50"
                                        >
                                          <option value="">— Not assigned yet</option>
                                          {activeTeachers.map((t) => (
                                            <option key={t.id} value={t.id}>
                                              {teacherLabel(t)}
                                            </option>
                                          ))}
                                        </select>
                                      </label>
                                    ))}
                                  </div>
                                </td>
                              </tr>
                              {/* Schedule NG SECTION NA ITO — alin ang mauuna.
                                  Ang gitnang term ay laging PAREHO (average =
                                  MAPEH), kaya Term 1 at Term 3 lang ang
                                  pinipili. */}
                              {someOffered && (
                                <tr className="border-b border-border-soft last:border-0">
                                  <td />
                                  <td colSpan={2} className="pb-2.5 pt-0.5">
                                    <div className="rounded-md border border-border-soft bg-panel-alt p-2.5">
                                      <p className="text-[11px] font-semibold text-ink-secondary mb-1.5">
                                        {periodWord} rotation — which subject comes first in this section
                                      </p>
                                      {periods.length === 3 ? (
                                        <div className="flex flex-wrap items-end gap-3">
                                          <label className="text-[12px] text-ink-secondary">
                                            <span className="block text-[10.5px] font-semibold uppercase tracking-[0.04em] text-ink-muted mb-0.5">
                                              {periods[0]?.label}
                                            </span>
                                            <select
                                              value={first}
                                              onChange={(e) => setFirst(e.target.value)}
                                              className="rounded border border-border bg-panel px-2 py-1 text-[12.5px] text-ink-primary"
                                            >
                                              <option value={codeUpper}>{s.fullName}</option>
                                              <option value={bUpper}>{b.fullName}</option>
                                            </select>
                                          </label>
                                          <div className="text-[12px] text-ink-secondary">
                                            <span className="block text-[10.5px] font-semibold uppercase tracking-[0.04em] text-ink-muted mb-0.5">
                                              {periods[1]?.label}
                                            </span>
                                            {/* Sumusunod sa Term 1 order ang banggit para hindi
                                                nakalilito; sa computation ay walang order — average
                                                lang ng dalawa. */}
                                            <span className="inline-block rounded border border-border-soft bg-panel px-2 py-1">
                                              Both — {firstSubject.abbreviation || firstSubject.code} +{' '}
                                              {secondSubject.abbreviation || secondSubject.code}{' '}
                                              <span className="text-ink-muted">(average = {pairName})</span>
                                            </span>
                                          </div>
                                          <label className="text-[12px] text-ink-secondary">
                                            <span className="block text-[10.5px] font-semibold uppercase tracking-[0.04em] text-ink-muted mb-0.5">
                                              {periods[2]?.label}
                                            </span>
                                            <select
                                              value={secondSubject.code.toUpperCase()}
                                              onChange={(e) => setFirst(e.target.value === codeUpper ? bUpper : codeUpper)}
                                              className="rounded border border-border bg-panel px-2 py-1 text-[12.5px] text-ink-primary"
                                            >
                                              <option value={codeUpper}>{s.fullName}</option>
                                              <option value={bUpper}>{b.fullName}</option>
                                            </select>
                                          </label>
                                        </div>
                                      ) : (
                                        <p className="text-[12px] text-ink-muted">
                                          Rotation applies to a 3-{periodWord.toLowerCase()} school year —
                                          both subjects run all year in this SY.
                                        </p>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </Fragment>
                          );
                        }
                        return (
                          <Fragment key={s.code}>
                          <tr className={rotating && offered ? '' : 'border-b border-border-soft last:border-0'}>
                            <td className="py-1.5 pr-3 text-center">
                              {/* Off-curriculum subjects can only be REMOVED:
                                  the box unticks while it is still saved, but a
                                  removed one can never be ticked back on. */}
                              <input
                                type="checkbox"
                                checked={offered}
                                disabled={!inCurriculum && !offered}
                                title={
                                  !inCurriculum
                                    ? offered
                                      ? "Not in this grade's curriculum — untick and Save load to remove it."
                                      : "Not in this grade's curriculum — it can no longer be added."
                                    : undefined
                                }
                                onChange={(e) => toggleOffered(s.code, e.target.checked)}
                                className="h-3.5 w-3.5 accent-nps-red align-middle disabled:opacity-40"
                              />
                            </td>
                            <td className="py-1.5 pr-3">
                              <span className="font-mono text-ink-secondary mr-2">{s.code}</span>
                              {s.fullName}
                              {!inCurriculum && (
                                <span className="ml-2 inline-block align-middle">
                                  <StatusBadge tone="pending">not in grade curriculum</StatusBadge>
                                </span>
                              )}
                            </td>
                            <td className="py-1.5">
                              {rotating ? (
                                // Tig-isang teacher BAWAT TERM — ang pagpili ay
                                // nasa breakdown box sa ibaba; buod lang dito.
                                <span className={`text-[12px] ${rotSummary.length ? 'text-ink-secondary' : 'text-ink-muted'}`}>
                                  {offered
                                    ? rotSummary.length
                                      ? rotSummary.join(' · ')
                                      : `One teacher per ${periodWord.toLowerCase()} — assign in the ${periodWord} breakdown below.`
                                    : '—'}
                                </span>
                              ) : (
                              <select
                                value={load[codeUpper] ?? ''}
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
                              )}
                            </td>
                          </tr>
                          {/* Rotating subject: THIS SECTION's term breakdown —
                              ano ang itinuturo bawat term dito. KAILANGAN
                              kumpleto bago ma-save ang load; sections may run
                              the terms in a different order. */}
                          {rotating && offered && (
                            <tr className="border-b border-border-soft last:border-0">
                              <td />
                              <td colSpan={2} className="pb-2.5 pt-0.5">
                                <div className={`rounded-md border p-2.5 ${
                                  breakdownDone ? 'border-border-soft bg-panel-alt' : 'border-amber-200 bg-amber-50'
                                }`}>
                                  <p className={`text-[11px] font-semibold mb-1.5 ${
                                    breakdownDone ? 'text-ink-secondary' : 'text-amber-900'
                                  }`}>
                                    {periodWord} breakdown — subject taught and assigned teacher for each {periodWord.toLowerCase()} in this section
                                    {!breakdownDone && <span className="ml-1 font-bold">· required before the load can be saved</span>}
                                    <span className="ml-1 font-normal text-ink-muted">· the same teacher may handle more than one {periodWord.toLowerCase()}; leave blank if not yet assigned</span>
                                  </p>
                                  <div className="flex flex-wrap gap-3">
                                    {periods.map((p, i) => (
                                      <div key={p.key} className="flex flex-col gap-1">
                                        <label className="flex items-center gap-1.5 text-[12px] text-ink-secondary">
                                          {p.label}
                                          <input
                                            value={termNames[codeUpper]?.[p.key] ?? ''}
                                            onChange={(e) => {
                                              const v = e.target.value;
                                              setTermNames((cur) => ({
                                                ...cur,
                                                [codeUpper]: { ...(cur[codeUpper] ?? {}), [p.key]: v },
                                              }));
                                              setLoadSaved(false);
                                            }}
                                            placeholder={i === periods.length - 1 ? 'e.g. ICT' : 'e.g. EPP'}
                                            className="w-28 rounded border border-border bg-panel px-2 py-1 text-[12.5px] text-ink-primary"
                                          />
                                        </label>
                                        {/* Ang guro ng term na ito — lalabas ang
                                            load sa gradebook ng bawat napiling
                                            guro, sa kanilang term lang. */}
                                        <select
                                          value={loadTermTeachers[codeUpper]?.[p.key] ?? ''}
                                          onChange={(e) =>
                                            setTermTeacher(s.code, p.key, e.target.value ? Number(e.target.value) : null)
                                          }
                                          title={`Teacher for ${p.label}`}
                                          className="w-full max-w-[230px] rounded border border-border bg-panel px-2 py-1 text-[12.5px] text-ink-primary"
                                        >
                                          <option value="">— No teacher assigned yet</option>
                                          {activeTeachers.map((t) => (
                                            <option key={t.id} value={t.id}>
                                              {teacherLabel(t)}
                                            </option>
                                          ))}
                                        </select>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                          </Fragment>
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
                      groupBySex(roster).map((grp) => (
                        <Fragment key={grp.key}>
                          <SexRow grp={grp} colSpan={4} />
                          {grp.students.map((s) => {
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
                          })}
                        </Fragment>
                      ))
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
