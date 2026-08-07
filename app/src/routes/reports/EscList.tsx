import { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Breadcrumb } from '@/components/shell/Breadcrumb';
import { ExportCsvButton } from '@/components/ExportCsvButton';
import { PrintHost } from '@/components/print/PrintHost';
import { Letterhead } from '@/components/print/parts';
import { listClasses, listStudentsForClasses } from '@/lib/db';
import { formatBirthdateMdy } from '@/lib/format';
import { gradeLabel } from '@/lib/forms';
import { isAllTime } from '@/types';
import type { ClassRecord, GradeLevel, SchoolYear, Student } from '@/types';

// ESC (Educational Service Contracting) learner list — the roster NPS submits
// for the DepEd subsidy, Grade 7 to Grade 10 only.
//
// The prior-school column changes meaning with the grade level: an incoming
// Grade 7 reports the ELEMENTARY SCHOOL GRADUATED FROM, while Grades 8–10
// report the SCHOOL LAST ATTENDED (which is NPS itself for a continuing
// learner). Both answer the same question of the data — what school did this
// learner come from — so one column carries both, relabelled per grade.
const ESC_LEVELS: GradeLevel[] = ['VII', 'VIII', 'IX', 'X'];

const NPS_NAME = 'Naga Parochial School';

// "2026-2027" → "2025-2026". Returns '' for anything that is not a year pair.
function prevSy(sy: string): string {
  const [a, b] = (sy ?? '').split('-').map(Number);
  return Number.isFinite(a) && Number.isFinite(b) ? `${a - 1}-${b - 1}` : '';
}

interface EscRow {
  student: Student;
  gradeLevel: GradeLevel;
  sectionName: string;
  sy: string;
  school: string;
  schoolType: string;
  // True when the value was read off last year's enrolment record because the
  // learner's own prior-school fields are blank. Flagged on screen so the
  // registrar can see what still has to be entered on the learner's record.
  derived: boolean;
}

// The learner's prior school. Their own record wins; when it is blank we fall
// back to last school year's enrolment entry, which is the same fact recorded
// from the other side.
function priorSchool(s: Student, sy: string): { school: string; schoolType: string; derived: boolean } {
  const own = (s.elemSchoolGraduatedFrom ?? '').trim();
  const ownType = (s.schoolType ?? '').trim();
  if (own) return { school: own, schoolType: ownType, derived: false };

  const history = s.enrolmentHistory ?? [];
  const want = prevSy(sy);
  const entry =
    history.find((e) => e.sy === want && (e.schoolName ?? '').trim()) ??
    [...history]
      .filter((e) => e.sy < sy && (e.schoolName ?? '').trim())
      .sort((a, b) => b.sy.localeCompare(a.sy))[0];

  const school = (entry?.schoolName ?? '').trim();
  if (!school) return { school: '', schoolType: ownType, derived: false };
  // NPS is the only school we can classify without being told — it is ours.
  const type = ownType || (school === NPS_NAME ? 'Private' : '');
  return { school, schoolType: type, derived: true };
}

export default function EscList() {
  const { currentSY } = useOutletContext<{ currentSY: SchoolYear | null }>();
  const [level, setLevel] = useState<GradeLevel>('VII');
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [classesReady, setClassesReady] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [printing, setPrinting] = useState(false);

  const syCode = currentSY?.code;

  // Sections of the selected grade, in the SY the header bar is set to.
  const escClasses = useMemo(
    () =>
      classes
        .filter((c) => ESC_LEVELS.includes(c.gradeLevel))
        .filter((c) => isAllTime(currentSY) || c.sy === syCode)
        .sort(
          (a, b) =>
            ESC_LEVELS.indexOf(a.gradeLevel) - ESC_LEVELS.indexOf(b.gradeLevel) ||
            a.sy.localeCompare(b.sy) ||
            a.sectionName.localeCompare(b.sectionName),
        ),
    [classes, currentSY, syCode],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const cls = await listClasses();
        if (cancelled) return;
        setClasses(cls);
        setClassesReady(true); // only on success — a failure must not be cleared
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load classes.');
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Rosters are pulled once for every ESC section, not per tab — switching
  // Grade 7 → 8 then has nothing to wait for.
  useEffect(() => {
    if (!classesReady) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const roster = await listStudentsForClasses(escClasses.map((c) => c.id));
        if (!cancelled) setStudents(roster);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load learners.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [classesReady, escClasses]);

  // One group per section of the selected grade, learners sorted by last name
  // the way the submitted list is read.
  const groups = useMemo(() => {
    return escClasses
      .filter((c) => c.gradeLevel === level)
      .map((c) => {
        const rows: EscRow[] = students
          .filter((s) => s.currentClassId === c.id && s.status === 'Active')
          .sort(
            (a, b) =>
              a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName),
          )
          .map((s) => ({
            student: s,
            gradeLevel: c.gradeLevel,
            sectionName: c.sectionName,
            sy: c.sy,
            ...priorSchool(s, c.sy),
          }));
        return { klass: c, rows };
      })
      .filter((g) => g.rows.length > 0);
  }, [escClasses, students, level]);

  const flat = useMemo(() => groups.flatMap((g) => g.rows), [groups]);

  // Grade 7 reports the elementary school; Grades 8–10 the school last attended.
  const schoolHeader = level === 'VII' ? 'Elem. School Graduated From' : 'School Last Attended';

  // What a registrar has to fix before the list can be submitted.
  const gaps = useMemo(
    () => ({
      school: flat.filter((r) => !r.school).length,
      schoolType: flat.filter((r) => !r.schoolType).length,
      lrn: flat.filter((r) => !/^\d{12}$/.test(r.student.lrn)).length,
      birthdate: flat.filter((r) => !r.student.birthdate).length,
    }),
    [flat],
  );
  const gapNotes = [
    gaps.lrn && `${gaps.lrn} without a 12-digit LRN`,
    gaps.birthdate && `${gaps.birthdate} without a birthdate`,
    gaps.school && `${gaps.school} without a prior school`,
    gaps.schoolType && `${gaps.schoolType} without a school type`,
  ].filter(Boolean) as string[];

  const bd = 'border border-zinc-400';
  const th = `${bd} px-1.5 py-1 text-left text-[10px] uppercase tracking-[0.02em] font-bold`;
  const td = `${bd} px-1.5 py-1 align-top`;

  // The sheet itself — print-safe colours so the same markup serves the on-screen
  // report and the #print-root portal. The portal renders onto a 210 mm sheet,
  // where ten columns only fit at a smaller size, so the caller sets the scale.
  const sheetAt = (size: string) => (
    <div className="text-black">
      {groups.map((g, gi) => (
        <section
          key={g.klass.id}
          className={gi > 0 ? 'mt-6' : ''}
          // Each section starts its own page on paper; ESC lists are filed per section.
          style={gi > 0 ? { breakBefore: 'page' } : undefined}
        >
          <div className="text-[11px] leading-tight mb-1.5">
            <div>
              <span className="text-zinc-600">School Year: </span>
              <span className="font-bold">{g.klass.sy}</span>
            </div>
            <div>
              <span className="text-zinc-600">Grade/Year: </span>
              <span className="font-bold">
                Grade {g.klass.gradeLevel} - {g.klass.sectionName}
              </span>
            </div>
          </div>

          <table className={`w-full border-collapse ${size}`}>
            <thead>
              <tr className="bg-zinc-100">
                <th className={`${th} w-[4%] text-center`}>&nbsp;</th>
                <th className={th}>First Name</th>
                <th className={th}>Middle Name</th>
                <th className={th}>Last Name</th>
                <th className={`${th} w-[5%]`}>Ext</th>
                <th className={`${th} w-[10%]`}>Birthdate</th>
                <th className={`${th} w-[8%]`}>Gender</th>
                <th className={`${th} w-[17%]`}>{schoolHeader}</th>
                <th className={`${th} w-[9%]`}>School Type</th>
                <th className={`${th} w-[12%]`}>LRN</th>
              </tr>
            </thead>
            <tbody>
              {g.rows.map((r, i) => {
                const s = r.student;
                const noLrn = !/^\d{12}$/.test(s.lrn);
                return (
                  <tr key={s.lrn}>
                    <td className={`${td} text-center tabular-nums`}>{i + 1}.</td>
                    <td className={`${td} uppercase`}>{s.firstName}</td>
                    <td className={`${td} uppercase`}>{s.middleName}</td>
                    <td className={`${td} uppercase font-medium`}>{s.lastName}</td>
                    <td className={`${td} uppercase`}>{s.extension}</td>
                    <td className={`${td} tabular-nums`}>{formatBirthdateMdy(s.birthdate)}</td>
                    <td className={`${td} uppercase`}>{s.gender}</td>
                    <td className={r.derived ? `${td} text-zinc-600 italic` : td}>{r.school}</td>
                    <td className={td}>{r.schoolType}</td>
                    <td className={`${td} font-mono ${noLrn ? 'text-zinc-400' : ''}`}>
                      {noLrn ? '' : s.lrn}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="mt-1 text-[9.5px] text-zinc-600">
            {g.rows.length} learner{g.rows.length === 1 ? '' : 's'} ·{' '}
            {g.rows.filter((r) => r.student.gender === 'Male').length} male ·{' '}
            {g.rows.filter((r) => r.student.gender === 'Female').length} female
          </div>
        </section>
      ))}
    </div>
  );

  return (
    <>
      <Breadcrumb items={[{ label: 'Reports', to: '/reports' }, { label: 'ESC List' }]} />
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-ink-primary">ESC List (Grade 7–10)</h1>
          <p className="text-[13px] text-ink-secondary mt-1">
            Educational Service Contracting roster per section · {currentSY?.label ?? 'All years'}.
            Active learners only.
          </p>
        </div>
        <div className="flex gap-2">
          <ExportCsvButton
            rows={flat}
            columns={[
              { header: 'Grade', value: (r) => gradeLabel(r.gradeLevel) },
              { header: 'Section', value: (r) => r.sectionName },
              { header: 'First Name', value: (r) => r.student.firstName },
              { header: 'Middle Name', value: (r) => r.student.middleName },
              { header: 'Last Name', value: (r) => r.student.lastName },
              { header: 'Ext', value: (r) => r.student.extension },
              { header: 'Birthdate', value: (r) => formatBirthdateMdy(r.student.birthdate) },
              { header: 'Gender', value: (r) => r.student.gender.toUpperCase() },
              { header: schoolHeader, value: (r) => r.school },
              { header: 'School Type', value: (r) => r.schoolType },
              { header: 'LRN', value: (r) => (/^\d{12}$/.test(r.student.lrn) ? r.student.lrn : '') },
            ]}
            filename={`esc-grade-${gradeLabel(level).replace(/\D+/g, '')}-${syCode ?? 'all'}`}
          />
          <Button className="gap-2" disabled={flat.length === 0} onClick={() => setPrinting(true)}>
            <Printer className="w-3.5 h-3.5" /> Print
          </Button>
        </div>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        {ESC_LEVELS.map((lv) => {
          const count = escClasses
            .filter((c) => c.gradeLevel === lv)
            .reduce(
              (n, c) =>
                n + students.filter((s) => s.currentClassId === c.id && s.status === 'Active').length,
              0,
            );
          return (
            <button
              key={lv}
              onClick={() => setLevel(lv)}
              className={[
                'px-3 py-1.5 rounded text-[12.5px] border',
                level === lv
                  ? 'bg-accent text-white border-accent'
                  : 'bg-panel text-ink-secondary border-border hover:bg-panel-alt',
              ].join(' ')}
            >
              {gradeLabel(lv)}
              <span className="ml-1.5 text-[10.5px] opacity-70 tabular-nums">{count}</span>
            </button>
          );
        })}
      </div>

      {gapNotes.length > 0 && (
        <p className="mb-3 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[12.5px] text-ink-primary">
          <span className="font-semibold">Incomplete for submission:</span> {gapNotes.join(', ')}.
          Fill these in on the learner's record before filing the list. Entries shown in{' '}
          <span className="italic text-ink-secondary">italics</span> were taken from last year's
          enrolment record.
        </p>
      )}

      {error ? (
        <p className="text-[13px] text-nps-red bg-nps-red/10 border border-nps-red/20 rounded-md px-3 py-2">
          {error}
        </p>
      ) : loading ? (
        <p className="text-[13px] text-ink-secondary">Loading…</p>
      ) : flat.length === 0 ? (
        <p className="text-[13px] text-ink-secondary">
          No active learners in {gradeLabel(level)} for {currentSY?.label ?? 'the selected year'}.
        </p>
      ) : (
        <div className="rounded-md border border-border bg-white p-4 overflow-x-auto">
          {sheetAt('text-[11.5px]')}
        </div>
      )}

      <PrintHost
        open={printing}
        docTitle={`ESC List · ${gradeLabel(level)} · ${syCode ?? ''}`}
        onClose={() => setPrinting(false)}
      >
        <Letterhead
          docTitle="Educational Service Contracting (ESC) List"
          docSubtitle={`${gradeLabel(level)} · School Year ${syCode ?? ''}`}
        />
        <div className="mt-3">{sheetAt('text-[8px]')}</div>
      </PrintHost>
    </>
  );
}
