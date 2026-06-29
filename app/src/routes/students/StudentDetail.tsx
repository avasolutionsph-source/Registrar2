import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Pencil, Printer, FileText, IdCard, Upload, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PrintHost } from '@/components/print/PrintHost';
import { Form137 } from '@/components/print/Form137';
import { ReportCardSF9 } from '@/components/print/ReportCardSF9';
import { GoodMoral } from '@/components/print/GoodMoral';
import { CertEnrollment } from '@/components/print/CertEnrollment';
import { StudentId } from '@/components/print/StudentId';
import { Breadcrumb } from '@/components/shell/Breadcrumb';
import { EntityRail } from '@/components/entity/EntityRail';
import { SectionCard } from '@/components/entity/SectionCard';
import { KeyValueGrid } from '@/components/entity/KeyValueGrid';
import { StatusBadge } from '@/components/entity/StatusBadge';
import {
  getStudent,
  listClasses,
  listSubjects,
  listForm137Log,
  uploadStudentPhoto,
  getPhotoSignedUrl,
  type Form137Release,
} from '@/lib/db';
import {
  subjectIndex,
  buildSubjectRows,
  generalAverage,
  latestGradedSy,
  gradesForSy,
  periodsForSy,
  formatSy,
} from '@/lib/forms';
import { formatLastFirstMiddle, formatBirthdate, ageOnDate } from '@/lib/format';
import type { CredentialState, ClassRecord, Student, Subject } from '@/types';

const REF_DATE = '2026-05-04'; // reference "today" for age display
const fmtQ = (v?: number) => (typeof v === 'number' ? String(Math.round(v)) : '—');
type DocKind = 'form137' | 'sf10' | 'sf9' | 'gmc' | 'coe' | 'id';

const credLabels: Record<string, string> = {
  bc: 'BC · Birth Certificate',
  bp: 'BP · Baptismal',
  hc: 'HC · Health Cert',
  pix: 'Pix · 1×1 Photo',
  rf: 'RF · Recommendation Form',
  f137: 'F137 · Form 137',
  rc: 'RC · Report Card',
  gmc: 'GMC · Good Moral',
};

const credTone = (s: CredentialState): 'ok' | 'pending' | 'na' =>
  s === 'on-file' ? 'ok' : s === 'pending' ? 'pending' : 'na';
const credText = (s: CredentialState) =>
  s === 'on-file' ? 'on file' : s === 'pending' ? 'pending' : 'N/A';

export default function StudentDetail() {
  const { lrn } = useParams<{ lrn: string }>();
  const navigate = useNavigate();
  const [student, setStudent] = useState<Student | null | undefined>(undefined); // undefined = loading
  const [klass, setKlass] = useState<ClassRecord | undefined>();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [releases, setReleases] = useState<Form137Release[]>([]);
  const [doc, setDoc] = useState<DocKind | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setPhotoUrl(null);
      if (!lrn) {
        setStudent(null);
        return;
      }
      try {
        const [s, classes, subs, rel] = await Promise.all([
          getStudent(lrn),
          listClasses(),
          listSubjects(),
          listForm137Log(lrn),
        ]);
        if (cancelled) return;
        setStudent(s);
        setSubjects(subs);
        setReleases(rel);
        setKlass(s ? classes.find((c) => c.id === s.currentClassId) : undefined);
        if (s?.photoPath) {
          const url = await getPhotoSignedUrl(s.photoPath);
          if (!cancelled) setPhotoUrl(url);
        }
      } catch {
        if (!cancelled) setStudent(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [lrn]);

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
  const initials = (student.firstName.charAt(0) + student.lastName.charAt(0)) || '?';
  const age = student.birthdate ? ageOnDate(student.birthdate, REF_DATE) : null;

  const anchors = [
    { id: 'profile', label: 'Profile' },
    { id: 'family', label: 'Family' },
    { id: 'enrolment', label: 'Enrolment' },
    { id: 'grades', label: 'Grades' },
    { id: 'credentials', label: 'Credentials' },
    { id: 'tests', label: 'Tests' },
    { id: 'releases', label: 'Form 137 Log' },
  ];

  const isElem = klass && ['I', 'II', 'III', 'IV', 'V', 'VI'].includes(klass.gradeLevel);

  const gradedSy = latestGradedSy(student);
  const gradePeriods = periodsForSy(gradedSy ?? student.currentSY);
  const gradeRows = gradedSy
    ? buildSubjectRows(gradesForSy(student, gradedSy), subjectIndex(subjects))
    : [];
  const gradeGA = generalAverage(gradeRows);

  async function onPhotoPicked(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (fileRef.current) fileRef.current.value = '';
    if (!file || !student) return;
    setPhotoBusy(true);
    try {
      const path = await uploadStudentPhoto(student.lrn, file);
      const url = await getPhotoSignedUrl(path);
      setStudent({ ...student, photoPath: path });
      setPhotoUrl(url);
    } catch {
      // upload failed — leave the existing photo/state untouched
    } finally {
      setPhotoBusy(false);
    }
  }

  return (
    <>
      <Breadcrumb items={[{ label: 'Students', to: '/students' }, { label: fullName }]} />
      <div className="flex gap-5">
        <EntityRail
          avatar={
            photoUrl ? (
              <img
                src={photoUrl}
                alt=""
                className="w-[84px] h-[84px] rounded-full object-cover border border-border"
              />
            ) : (
              <div className="w-[84px] h-[84px] rounded-full bg-border grid place-items-center text-ink-muted font-bold text-[28px]">
                {initials}
              </div>
            )
          }
          name={`${student.firstName} ${student.lastName}`}
          subtitle={klass ? `Grade ${klass.gradeLevel} · ${klass.sectionName}` : '—'}
          ids={[
            { label: 'LRN', value: <span className="font-mono">{student.lrn}</span> },
            { label: 'Student No.', value: <span className="font-mono">{student.studentNo || '—'}</span> },
            { label: 'Status', value: <StatusBadge tone="ok">{student.status}</StatusBadge> },
          ]}
          actions={
            <>
              <Button
                className="justify-start gap-2 w-full"
                onClick={() => navigate(`/students/${student.lrn}/enroll`)}
              >
                <GraduationCap className="w-3.5 h-3.5" /> Enroll for current SY
              </Button>
              <Button
                variant="outline"
                className="justify-start gap-2 w-full"
                onClick={() => navigate(`/students/${student.lrn}/edit`)}
              >
                <Pencil className="w-3.5 h-3.5" /> Edit profile
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={onPhotoPicked}
              />
              <Button
                variant="outline"
                className="justify-start gap-2 w-full"
                disabled={photoBusy}
                onClick={() => fileRef.current?.click()}
              >
                <Upload className="w-3.5 h-3.5" />{' '}
                {photoBusy ? 'Uploading…' : photoUrl ? 'Change photo' : 'Upload photo'}
              </Button>
              <Button
                variant="outline"
                className="justify-start gap-2 w-full"
                onClick={() => setDoc('sf9')}
              >
                <Printer className="w-3.5 h-3.5" /> Report Card (SF 9)
              </Button>
              <Button
                variant="outline"
                className="justify-start gap-2 w-full"
                onClick={() => setDoc('form137')}
              >
                <FileText className="w-3.5 h-3.5" /> Form 137
              </Button>
              <Button
                variant="outline"
                className="justify-start gap-2 w-full"
                onClick={() => setDoc('sf10')}
              >
                <FileText className="w-3.5 h-3.5" /> SF 10
              </Button>
              <Button
                variant="outline"
                className="justify-start gap-2 w-full"
                onClick={() => setDoc('gmc')}
              >
                <FileText className="w-3.5 h-3.5" /> Good Moral
              </Button>
              <Button
                variant="outline"
                className="justify-start gap-2 w-full"
                onClick={() => setDoc('coe')}
              >
                <FileText className="w-3.5 h-3.5" /> Cert. of Enrollment
              </Button>
              <Button
                variant="outline"
                className="justify-start gap-2 w-full"
                onClick={() => setDoc('id')}
              >
                <IdCard className="w-3.5 h-3.5" /> Student ID
              </Button>
            </>
          }
          anchors={anchors}
          activeAnchor="profile"
        />
        <div className="flex flex-col gap-3.5 flex-1 min-w-0">
          <SectionCard id="profile" heading="Profile">
            <KeyValueGrid
              rows={[
                {
                  label: 'Birthdate',
                  value: student.birthdate
                    ? `${formatBirthdate(student.birthdate)}${age != null ? ` (${age} yrs)` : ''}`
                    : '—',
                },
                { label: 'Gender', value: student.gender },
                { label: 'Religion', value: student.religion || '—' },
                { label: 'Address', value: student.address || '—' },
                { label: 'Contact', value: student.contactNumber || '—' },
                { label: 'Curriculum', value: student.curriculum || '—' },
              ]}
            />
          </SectionCard>

          <SectionCard id="family" heading="Family">
            <KeyValueGrid
              rows={[
                { label: 'Father', value: student.fatherName || '—' },
                { label: 'Mother (maiden)', value: student.motherMaidenName || '—' },
                { label: 'Guardian', value: student.guardianRelation },
                { label: 'Parent contact', value: student.contactNumber || '—' },
              ]}
            />
          </SectionCard>

          <SectionCard id="enrolment" heading="Enrolment">
            <KeyValueGrid
              rows={[
                { label: 'Current SY', value: student.currentSY || '—' },
                {
                  label: 'Class',
                  value: klass ? `Grade ${klass.gradeLevel} · ${klass.sectionName}` : '—',
                },
                {
                  label: 'Adviser',
                  value: klass
                    ? `${klass.adviser.title} ${klass.adviser.familyName}, ${klass.adviser.firstName} ${klass.adviser.middleInitial}`
                    : '—',
                },
                { label: 'Loyalty Years', value: `${student.loyaltyYears}` },
                {
                  label: 'Origin School',
                  value: student.elemSchoolGraduatedFrom || '— (first year at NPS)',
                },
                { label: 'School Type', value: student.schoolType || '—' },
              ]}
            />
            {(student.enrolmentHistory?.length ?? 0) > 0 && (
              <div className="flex justify-end mt-2 px-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => navigate(`/students/${student.lrn}/enrolment`)}
                >
                  <FileText className="w-3.5 h-3.5" /> View full history ({student.enrolmentHistory.length} yrs)
                </Button>
              </div>
            )}
          </SectionCard>

          <SectionCard
            id="grades"
            heading={gradedSy ? `Grades — SY ${formatSy(gradedSy)}` : 'Grades'}
          >
            <div className="flex justify-end mb-2 px-1">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => navigate(`/students/${student.lrn}/grades`)}
              >
                <Pencil className="w-3.5 h-3.5" /> Encode / Edit grades
              </Button>
            </div>
            {gradeRows.length === 0 ? (
              <p className="text-[12.5px] text-ink-secondary px-1">No grades on record for this learner.</p>
            ) : (
              <div className="px-1">
                <table className="w-full text-[12.5px]">
                  <thead>
                    <tr className="text-ink-muted text-[11px] uppercase">
                      <th className="text-left font-medium py-1">Subject</th>
                      {gradePeriods.map((p) => (
                        <th key={p.key} className="w-10 font-medium">
                          {p.label}
                        </th>
                      ))}
                      <th className="w-12 font-medium">Final</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gradeRows.map((r) => (
                      <tr key={r.subjectCode} className="border-t border-border">
                        <td className={`py-1 text-ink-primary ${r.isMapehComponent ? 'pl-4 italic text-ink-secondary' : ''} ${r.isMapehParent ? 'font-semibold' : ''}`}>
                          {r.name}
                        </td>
                        {gradePeriods.map((p) => (
                          <td key={p.key} className="text-center text-ink-secondary">
                            {fmtQ(r[p.key])}
                          </td>
                        ))}
                        <td className="text-center font-semibold text-ink-primary">{fmtQ(r.final)}</td>
                      </tr>
                    ))}
                    <tr className="border-t border-border font-semibold">
                      <td className="py-1 text-right text-ink-secondary text-[11px] uppercase">
                        General Average
                      </td>
                      <td colSpan={gradePeriods.length} />
                      <td className="text-center text-ink-primary">{gradeGA ?? '—'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>

          <SectionCard id="credentials" heading="Credentials">
            <KeyValueGrid
              rows={Object.entries(student.credentials).map(([key, status]) => ({
                label: credLabels[key] ?? key,
                value: <StatusBadge tone={credTone(status)}>{credText(status)}</StatusBadge>,
              }))}
            />
          </SectionCard>

          <SectionCard id="tests" heading="Standardized tests">
            <p className="text-[12.5px] text-ink-secondary px-1">
              {isElem
                ? 'NCAE / NAT not applicable for this grade level.'
                : 'No scores recorded.'}
            </p>
          </SectionCard>

          <SectionCard id="releases" heading="Form 137 — Release Log">
            {releases.length === 0 ? (
              <p className="text-[12.5px] text-ink-secondary px-1">
                No Form 137 release on record for this learner.
              </p>
            ) : (
              <div className="px-1">
                <table className="w-full text-[12.5px]">
                  <thead>
                    <tr className="text-ink-muted text-[11px] uppercase">
                      <th className="text-left font-medium py-1 pr-3">Date released</th>
                      <th className="text-left font-medium pr-3">Requesting school / destination</th>
                      <th className="text-left font-medium">Purpose</th>
                    </tr>
                  </thead>
                  <tbody>
                    {releases.map((r) => (
                      <tr key={r.id} className="border-t border-border align-top">
                        <td className="py-1 pr-3 text-ink-primary whitespace-nowrap">
                          {r.releasedDate ? formatBirthdate(r.releasedDate) : r.releasedText || '—'}
                        </td>
                        <td className="py-1 pr-3 text-ink-secondary">{r.requestingSchool || '—'}</td>
                        <td className="py-1 text-ink-secondary">{r.purpose || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="mt-2 text-[11px] text-ink-muted">
                  {releases.length} release{releases.length === 1 ? '' : 's'} on record.
                </p>
              </div>
            )}
          </SectionCard>
        </div>
      </div>
      <PrintHost
        open={doc !== null}
        docTitle={
          doc === 'sf9'
            ? `Report Card (SF 9) · ${student.lastName}, ${student.firstName}`
            : doc === 'sf10'
              ? `SF 10 · ${student.lastName}, ${student.firstName}`
              : doc === 'gmc'
                ? `Good Moral · ${student.lastName}, ${student.firstName}`
                : doc === 'coe'
                  ? `Certificate of Enrollment · ${student.lastName}, ${student.firstName}`
                  : doc === 'id'
                    ? `Student ID · ${student.lastName}, ${student.firstName}`
                    : `Form 137 · ${student.lastName}, ${student.firstName}`
        }
        onClose={() => setDoc(null)}
      >
        {doc === 'sf9' ? (
          <ReportCardSF9 student={student} subjects={subjects} />
        ) : doc === 'gmc' ? (
          <GoodMoral student={student} />
        ) : doc === 'coe' ? (
          <CertEnrollment student={student} klass={klass} />
        ) : doc === 'id' ? (
          <StudentId student={student} klass={klass} photoUrl={photoUrl ?? undefined} />
        ) : (
          <Form137 student={student} subjects={subjects} variant={doc === 'sf10' ? 'sf10' : 'form137'} />
        )}
      </PrintHost>
    </>
  );
}
