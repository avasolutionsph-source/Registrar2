import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Pencil, Printer, FileText, IdCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PrintPreview } from '@/components/ui/print-preview';
import { Breadcrumb } from '@/components/shell/Breadcrumb';
import { EntityRail } from '@/components/entity/EntityRail';
import { SectionCard } from '@/components/entity/SectionCard';
import { KeyValueGrid } from '@/components/entity/KeyValueGrid';
import { StatusBadge } from '@/components/entity/StatusBadge';
import { getStudentByLrn, getClassById } from '@/lib/studentLookup';
import { formatLastFirstMiddle, formatBirthdate, ageOnDate } from '@/lib/format';
import type { CredentialState } from '@/types';

const REF_DATE = '2026-05-04'; // mocked "today"

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
  const student = lrn ? getStudentByLrn(lrn) : undefined;
  const [printDoc, setPrintDoc] = useState<string | null>(null);
  const openPrintPreview = (docName: string) => setPrintDoc(docName);

  if (!student) {
    return (
      <div>
        <Breadcrumb
          items={[{ label: 'Students', to: '/students' }, { label: 'Not found' }]}
        />
        <p className="text-ink-secondary text-sm">No student with LRN {lrn}.</p>
      </div>
    );
  }

  const klass = getClassById(student.currentClassId);
  const fullName = formatLastFirstMiddle(student);
  const initials = student.firstName.charAt(0) + student.lastName.charAt(0);
  const age = ageOnDate(student.birthdate, REF_DATE);

  const anchors = [
    { id: 'profile', label: 'Profile' },
    { id: 'family', label: 'Family' },
    { id: 'enrolment', label: 'Enrolment' },
    { id: 'grades', label: 'Grades' },
    { id: 'credentials', label: 'Credentials' },
    { id: 'tests', label: 'Tests' },
  ];

  const isElem = klass && ['I', 'II', 'III', 'IV', 'V', 'VI'].includes(klass.gradeLevel);

  return (
    <>
      <Breadcrumb items={[{ label: 'Students', to: '/students' }, { label: fullName }]} />
      <div className="flex gap-5">
        <EntityRail
          avatar={
            <div className="w-[84px] h-[84px] rounded-full bg-border grid place-items-center text-ink-muted font-bold text-[28px]">
              {initials}
            </div>
          }
          name={`${student.firstName} ${student.lastName}`}
          subtitle={klass ? `Grade ${klass.gradeLevel} · ${klass.sectionName}` : '—'}
          ids={[
            { label: 'LRN', value: <span className="font-mono">{student.lrn}</span> },
            { label: 'Student No.', value: <span className="font-mono">{student.studentNo}</span> },
            { label: 'Status', value: <StatusBadge tone="ok">{student.status}</StatusBadge> },
          ]}
          actions={
            <>
              <Button
                variant="outline"
                className="justify-start gap-2 w-full"
                onClick={() => navigate(`/students/${student.lrn}/edit`)}
              >
                <Pencil className="w-3.5 h-3.5" /> Edit profile
              </Button>
              <Button
                variant="outline"
                className="justify-start gap-2 w-full"
                onClick={() => openPrintPreview('Report Card / SF 9 — Form 138')}
              >
                <Printer className="w-3.5 h-3.5" /> Print Report Card
              </Button>
              <Button
                variant="outline"
                className="justify-start gap-2 w-full"
                onClick={() => openPrintPreview('Student ID')}
              >
                <IdCard className="w-3.5 h-3.5" /> Print ID
              </Button>
              <Button
                variant="outline"
                className="justify-start gap-2 w-full"
                onClick={() => openPrintPreview('Form 137 — Permanent Record')}
              >
                <FileText className="w-3.5 h-3.5" /> Form 137
              </Button>
              <Button
                variant="outline"
                className="justify-start gap-2 w-full"
                onClick={() => openPrintPreview('SF 10 — Learner\'s Permanent Record')}
              >
                <FileText className="w-3.5 h-3.5" /> SF 10
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
                  value: `${formatBirthdate(student.birthdate)} (${age} yrs)`,
                },
                { label: 'Gender', value: student.gender },
                { label: 'Religion', value: student.religion },
                { label: 'Address', value: student.address },
                { label: 'Contact', value: student.contactNumber },
                { label: 'Curriculum', value: student.curriculum },
              ]}
            />
          </SectionCard>

          <SectionCard id="family" heading="Family">
            <KeyValueGrid
              rows={[
                { label: 'Father', value: student.fatherName },
                { label: 'Mother (maiden)', value: student.motherMaidenName },
                { label: 'Guardian', value: student.guardianRelation },
                { label: 'Parent contact', value: student.contactNumber },
              ]}
            />
          </SectionCard>

          <SectionCard id="enrolment" heading="Enrolment">
            <KeyValueGrid
              rows={[
                { label: 'Current SY', value: student.currentSY },
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
          </SectionCard>

          <SectionCard id="grades" heading="Grades — SY 2025–2026">
            <p className="text-[12.5px] text-ink-secondary px-1">
              No grades encoded yet. Encoding window opens after the 1st quarter end date.
            </p>
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
        </div>
      </div>
      <PrintPreview
        open={printDoc !== null}
        title={printDoc ?? ''}
        subtitle={`${student.firstName} ${student.lastName} · LRN ${student.lrn}`}
        onClose={() => setPrintDoc(null)}
      />
    </>
  );
}
