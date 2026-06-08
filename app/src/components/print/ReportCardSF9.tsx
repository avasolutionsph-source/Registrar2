import type { Student, Subject } from '@/types';
import {
  buildSubjectRows,
  subjectIndex,
  generalAverage,
  gradeLabel,
  formatSy,
  latestGradedSy,
  gradesForSy,
  conductForSy,
  MONTHS,
  VALUE_TRAITS,
} from '@/lib/forms';
import { Letterhead, LearnerInfo, SignatureBlock } from './parts';

const QUARTERS = ['1', '2', '3', '4'];

const fmtQ = (v?: number) => (typeof v === 'number' ? String(Math.round(v)) : '');

function descriptor(final?: number): string {
  if (final == null) return '';
  if (final >= 90) return 'Outstanding';
  if (final >= 85) return 'Very Satisfactory';
  if (final >= 80) return 'Satisfactory';
  if (final >= 75) return 'Fairly Satisfactory';
  return 'Did Not Meet Expectations';
}

interface Props {
  student: Student;
  subjects: Subject[];
  sy?: string;
}

export function ReportCardSF9({ student, subjects, sy }: Props) {
  const year = sy ?? latestGradedSy(student) ?? student.currentSY;
  const rows = buildSubjectRows(gradesForSy(student, year), subjectIndex(subjects));
  const ga = generalAverage(rows);
  const entry = (student.enrolmentHistory ?? []).find((e) => e.sy === year);
  const conduct = conductForSy(student, year);
  const att = conduct.attendance;
  const values = conduct.values?.q;

  return (
    <div className="font-serif">
      <Letterhead docTitle="Report Card · SF 9" docSubtitle={`School Year ${formatSy(year)}`} />
      <LearnerInfo student={student} />

      <div className="mt-2 flex justify-between text-[10.5px]">
        <span>
          <span className="text-zinc-500">Grade &amp; Section: </span>
          <span className="font-medium">
            {gradeLabel(entry?.gradeLevel)}
            {entry?.sectionName ? ` · ${entry.sectionName}` : ''}
          </span>
        </span>
        <span>
          <span className="text-zinc-500">Adviser: </span>
          <span className="font-medium">{entry?.adviserName || '—'}</span>
        </span>
      </div>

      <h3 className="mt-3 text-center text-[11px] font-bold uppercase tracking-wide">
        Report on Learning Progress and Achievement
      </h3>
      <table className="mt-1 w-full border-collapse text-[10.5px]">
        <thead>
          <tr className="bg-zinc-100 text-[9px] uppercase tracking-wide">
            <th className="border border-zinc-400 px-1.5 py-1 text-left">Learning Areas</th>
            <th className="w-9 border border-zinc-400 px-1 py-1">Q1</th>
            <th className="w-9 border border-zinc-400 px-1 py-1">Q2</th>
            <th className="w-9 border border-zinc-400 px-1 py-1">Q3</th>
            <th className="w-9 border border-zinc-400 px-1 py-1">Q4</th>
            <th className="w-12 border border-zinc-400 px-1 py-1">Final</th>
            <th className="w-32 border border-zinc-400 px-1.5 py-1">Remarks</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td className="border border-zinc-400 px-1.5 py-2 text-center text-zinc-500" colSpan={7}>
                No grades encoded for this school year.
              </td>
            </tr>
          ) : (
            rows.map((r) => (
              <tr key={r.subjectCode}>
                <td className="border border-zinc-400 px-1.5 py-1">{r.name}</td>
                <td className="border border-zinc-400 px-1 py-1 text-center">{fmtQ(r.q1)}</td>
                <td className="border border-zinc-400 px-1 py-1 text-center">{fmtQ(r.q2)}</td>
                <td className="border border-zinc-400 px-1 py-1 text-center">{fmtQ(r.q3)}</td>
                <td className="border border-zinc-400 px-1 py-1 text-center">{fmtQ(r.q4)}</td>
                <td className="border border-zinc-400 px-1 py-1 text-center font-semibold">
                  {fmtQ(r.final)}
                </td>
                <td className="border border-zinc-400 px-1.5 py-1">{descriptor(r.final)}</td>
              </tr>
            ))
          )}
          {rows.length > 0 && (
            <tr className="bg-zinc-50 font-semibold">
              <td className="border border-zinc-400 px-1.5 py-1 text-right uppercase text-[9.5px]">
                General Average
              </td>
              <td className="border border-zinc-400" colSpan={4} />
              <td className="border border-zinc-400 px-1 py-1 text-center">{ga ?? ''}</td>
              <td className="border border-zinc-400 px-1.5 py-1">{descriptor(ga ?? undefined)}</td>
            </tr>
          )}
        </tbody>
      </table>

      <div className="mt-3 flex gap-4">
        {att && (att.present || att.tardy) && (
          <div className="flex-1">
            <h4 className="text-[9.5px] font-bold uppercase tracking-wide">Record of Attendance</h4>
            <table className="mt-1 w-full border-collapse text-[8px]">
              <thead>
                <tr className="bg-zinc-100">
                  <th className="border border-zinc-400 px-1 py-0.5 text-left"> </th>
                  {MONTHS.map((m) => (
                    <th key={m.key} className="border border-zinc-400 px-0.5 py-0.5">
                      {m.label}
                    </th>
                  ))}
                  <th className="border border-zinc-400 px-0.5 py-0.5">Tot</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-zinc-400 px-1 py-0.5">Days Present</td>
                  {MONTHS.map((m) => (
                    <td key={m.key} className="border border-zinc-400 px-0.5 py-0.5 text-center">
                      {att.present?.[m.key] ?? ''}
                    </td>
                  ))}
                  <td className="border border-zinc-400 px-0.5 py-0.5 text-center font-semibold">
                    {att.totalPresent ?? ''}
                  </td>
                </tr>
                <tr>
                  <td className="border border-zinc-400 px-1 py-0.5">Times Tardy</td>
                  {MONTHS.map((m) => (
                    <td key={m.key} className="border border-zinc-400 px-0.5 py-0.5 text-center">
                      {att.tardy?.[m.key] ?? ''}
                    </td>
                  ))}
                  <td className="border border-zinc-400 px-0.5 py-0.5 text-center font-semibold">
                    {att.totalTardy ?? ''}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {values && (
        <div className="mt-3">
          <h4 className="text-[9.5px] font-bold uppercase tracking-wide">
            Learner&rsquo;s Observed Values
          </h4>
          <table className="mt-1 w-full border-collapse text-[9px]">
            <thead>
              <tr className="bg-zinc-100 text-[8.5px] uppercase">
                <th className="border border-zinc-400 px-1.5 py-0.5 text-left">Core Values</th>
                {QUARTERS.map((q) => (
                  <th key={q} className="w-9 border border-zinc-400 px-0.5 py-0.5">
                    Q{q}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {VALUE_TRAITS.map((t) => (
                <tr key={t.key}>
                  <td className="border border-zinc-400 px-1.5 py-0.5">{t.label}</td>
                  {QUARTERS.map((q) => (
                    <td key={q} className="border border-zinc-400 px-0.5 py-0.5 text-center">
                      {values[q]?.[t.key] ?? ''}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-3 text-[8.5px] leading-snug text-zinc-500">
        <span className="font-semibold uppercase">Descriptors:</span> 90–100 Outstanding · 85–89 Very
        Satisfactory · 80–84 Satisfactory · 75–79 Fairly Satisfactory · Below 75 Did Not Meet
        Expectations.
      </div>

      <SignatureBlock leftRole="Class Adviser" rightRole="School Principal" />
    </div>
  );
}
