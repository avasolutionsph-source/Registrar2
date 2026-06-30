import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Field } from '@/components/ui/field';
import { Breadcrumb } from '@/components/shell/Breadcrumb';
import { SectionCard } from '@/components/entity/SectionCard';
import { getStudent, saveEnrolmentHistory } from '@/lib/db';
import { formatLastFirstMiddle } from '@/lib/format';
import { gradeLabel, formatSy } from '@/lib/forms';
import type { Student, EnrolmentEntry, GradeLevel, SchoolYearCode } from '@/types';

const NPS_SCHOOL_ID = '403875';

// Grade codes a transferee may arrive from (no SHS tracks needed here — kept simple).
const GRADE_CODES = ['N1', 'N2', 'K', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

const ACTIONS: { value: '' | EnrolmentEntry['action']; label: string }[] = [
  { value: '', label: '—' },
  { value: 'promoted', label: 'Promoted' },
  { value: 'retained', label: 'Retained' },
  { value: 'irregular', label: 'Irregular' },
];

const isNps = (e: EnrolmentEntry) => e.schoolId === NPS_SCHOOL_ID;

export default function ReceivedSf10() {
  const { lrn } = useParams<{ lrn: string }>();
  const navigate = useNavigate();
  const [student, setStudent] = useState<Student | null | undefined>(undefined);
  const [history, setHistory] = useState<EnrolmentEntry[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formErr, setFormErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!lrn) {
        setStudent(null);
        return;
      }
      try {
        const s = await getStudent(lrn);
        if (cancelled) return;
        setStudent(s);
        setHistory([...(s?.enrolmentHistory ?? [])]);
      } catch {
        if (!cancelled) setStudent(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [lrn]);

  const sorted = useMemo(
    () => [...history].sort((a, b) => String(a.sy).localeCompare(String(b.sy))),
    [history],
  );

  function addEntry(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormErr(null);
    const fd = new FormData(e.currentTarget);
    const get = (k: string) => String(fd.get(k) ?? '').trim();
    const sy = get('sy');
    const gradeLevel = get('gradeLevel');
    const schoolName = get('schoolName');
    if (!/^\d{4}-\d{4}$/.test(sy)) {
      setFormErr('School Year must look like 2023-2024.');
      return;
    }
    if (!gradeLevel || !schoolName) {
      setFormErr('Grade level and school name are required.');
      return;
    }
    const ga = get('generalAverage');
    const days = get('daysPresent');
    const schoolId = get('schoolId');
    if (schoolId === NPS_SCHOOL_ID) {
      setFormErr('This is for records from OTHER schools — do not use the NPS School ID.');
      return;
    }
    const entry: EnrolmentEntry = {
      sy: sy as SchoolYearCode,
      gradeLevel: gradeLevel as GradeLevel,
      sectionName: get('sectionName'),
      adviserName: get('adviserName'),
      schoolName,
      schoolId: schoolId || undefined,
      generalAverage: ga ? Number(ga) : undefined,
      daysPresent: days ? Number(days) : undefined,
      action: (get('action') || undefined) as EnrolmentEntry['action'],
    };
    setHistory((h) => [...h.filter((x) => x.sy !== entry.sy), entry]);
    setSaved(false);
    e.currentTarget.reset();
  }

  function removeEntry(sy: string) {
    setHistory((h) => h.filter((x) => x.sy !== sy));
    setSaved(false);
  }

  async function save() {
    if (!student) return;
    setSaving(true);
    setError(null);
    try {
      await saveEnrolmentHistory(student.lrn, history);
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save the records.');
    } finally {
      setSaving(false);
    }
  }

  if (student === undefined) {
    return (
      <div>
        <Breadcrumb items={[{ label: 'Students', to: '/students' }, { label: '…' }]} />
        <p className="text-ink-secondary text-sm">Loading…</p>
      </div>
    );
  }
  if (!student) {
    return (
      <div>
        <Breadcrumb items={[{ label: 'Students', to: '/students' }, { label: 'Not found' }]} />
        <p className="text-ink-secondary text-sm">No student with LRN {lrn}.</p>
      </div>
    );
  }

  const fullName = formatLastFirstMiddle(student);

  return (
    <div className="max-w-[820px]">
      <Breadcrumb
        items={[
          { label: 'Students', to: '/students' },
          { label: fullName, to: `/students/${student.lrn}` },
          { label: 'Received SF 10' },
        ]}
      />

      <div className="mb-3 flex items-center justify-between">
        <div>
          <h1 className="text-[16px] font-semibold text-ink-primary">Encode Received SF 10</h1>
          <p className="text-[12.5px] text-ink-secondary">
            Record the prior-school years from an SF 10 received for {fullName}. Type the
            adviser/teacher name (signatures are not affixed for other schools).
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate(`/students/${student.lrn}`)} className="gap-2">
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </Button>
      </div>

      <SectionCard heading="Add a prior-school year">
        <form onSubmit={addEntry} className="grid grid-cols-12 gap-x-3 gap-y-2 px-1 items-end">
          <div className="col-span-3">
            <Field label="School Year">
              <Input name="sy" placeholder="2023-2024" required />
            </Field>
          </div>
          <div className="col-span-3">
            <Field label="Grade Level">
              <Select name="gradeLevel" defaultValue="">
                <option value="" disabled>
                  Choose…
                </option>
                {GRADE_CODES.map((c) => (
                  <option key={c} value={c}>
                    {gradeLabel(c)}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="col-span-6">
            <Field label="School Attended (other school)">
              <Input name="schoolName" placeholder="e.g. Arborvitae Plains Montessori" required />
            </Field>
          </div>
          <div className="col-span-3">
            <Field label="School ID (DepEd, optional)">
              <Input name="schoolId" placeholder="6-digit" />
            </Field>
          </div>
          <div className="col-span-3">
            <Field label="Section">
              <Input name="sectionName" placeholder="optional" />
            </Field>
          </div>
          <div className="col-span-6">
            <Field label="Adviser / Teacher (name only)">
              <Input name="adviserName" placeholder="Type name — no signature" />
            </Field>
          </div>
          <div className="col-span-3">
            <Field label="General Average">
              <Input name="generalAverage" type="number" step="0.01" placeholder="e.g. 88.5" />
            </Field>
          </div>
          <div className="col-span-3">
            <Field label="Days Present">
              <Input name="daysPresent" type="number" placeholder="optional" />
            </Field>
          </div>
          <div className="col-span-3">
            <Field label="Action Taken">
              <Select name="action" defaultValue="">
                {ACTIONS.map((a) => (
                  <option key={a.label} value={a.value ?? ''}>
                    {a.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="col-span-3">
            <Button type="submit" className="gap-2 w-full">
              <Plus className="w-3.5 h-3.5" /> Add year
            </Button>
          </div>
        </form>
        {formErr && <p className="mt-2 px-1 text-[12.5px] text-nps-red">{formErr}</p>}
      </SectionCard>

      <div className="mt-3.5">
        <SectionCard heading={`Enrolment history (${sorted.length} year${sorted.length === 1 ? '' : 's'})`}>
          {sorted.length === 0 ? (
            <p className="text-[12.5px] text-ink-secondary px-1">No years recorded yet.</p>
          ) : (
            <table className="w-full text-[12.5px]">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-[0.04em] text-ink-muted border-b border-border">
                  <th className="py-1.5 pr-3 w-[14%]">SY</th>
                  <th className="py-1.5 pr-3 w-[14%]">Grade</th>
                  <th className="py-1.5 pr-3">School</th>
                  <th className="py-1.5 pr-3 w-[10%]">Gen. Ave.</th>
                  <th className="py-1.5 w-[8%]" />
                </tr>
              </thead>
              <tbody>
                {sorted.map((e) => (
                  <tr key={e.sy} className="border-b border-border-soft last:border-0">
                    <td className="py-1.5 pr-3 tabular-nums">{formatSy(e.sy)}</td>
                    <td className="py-1.5 pr-3">{gradeLabel(e.gradeLevel)}</td>
                    <td className="py-1.5 pr-3">
                      {e.schoolName || '—'}
                      {isNps(e) && (
                        <span className="ml-1.5 text-[10px] uppercase tracking-wide text-ok-fg">NPS</span>
                      )}
                    </td>
                    <td className="py-1.5 pr-3 tabular-nums">{e.generalAverage ?? '—'}</td>
                    <td className="py-1.5">
                      {isNps(e) ? (
                        <span className="text-[11px] text-ink-muted">locked</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => removeEntry(e.sy)}
                          className="text-ink-muted hover:text-nps-red"
                          aria-label="Remove year"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div className="flex items-center gap-3 mt-3 px-1">
            <Button onClick={save} disabled={saving} className="gap-2">
              <FileText className="w-3.5 h-3.5" /> {saving ? 'Saving…' : 'Save records'}
            </Button>
            {saved && <span className="text-[12px] text-ok-fg">✓ Saved</span>}
            {error && <span className="text-[12px] text-nps-red">{error}</span>}
            <span className="text-[11.5px] text-ink-muted">
              NPS years stay locked — only externally received years can be edited here.
            </span>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
