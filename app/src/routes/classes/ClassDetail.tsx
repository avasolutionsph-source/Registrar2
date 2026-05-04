import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Printer, FileText, Users as UsersIcon, Check, X, Pencil } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { PrintPreview } from '@/components/ui/print-preview';
import { Breadcrumb } from '@/components/shell/Breadcrumb';
import { EntityRail } from '@/components/entity/EntityRail';
import { SectionCard } from '@/components/entity/SectionCard';
import { StatusBadge } from '@/components/entity/StatusBadge';
import { classes, students } from '@/mocks';
import { schoolIdFromLrn } from '@/lib/lrn';
import { formatLastFirstMiddle } from '@/lib/format';

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
  const klass = classes.find((c) => c.id === id);
  const navigate = useNavigate();
  const [printDoc, setPrintDoc] = useState<string | null>(null);

  if (!klass) {
    return (
      <div>
        <Breadcrumb items={[{ label: 'Classes', to: '/classes' }, { label: 'Not found' }]} />
        <p className="text-ink-secondary text-sm">No class with id {id}.</p>
      </div>
    );
  }

  const roster = students.filter((s) => klass.studentLrns.includes(s.lrn));
  const males = roster.filter((s) => s.gender === 'Male');
  const females = roster.filter((s) => s.gender === 'Female');
  const adviserName = `${klass.adviser.title} ${klass.adviser.familyName}, ${klass.adviser.firstName} ${klass.adviser.middleInitial}`;

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
                onClick={() => setPrintDoc('Form 1 — School Register (DepEd SF 1)')}
              >
                <FileText className="w-3.5 h-3.5" /> Print Form 1
              </Button>
              <Button
                variant="outline"
                className="justify-start gap-2 w-full"
                onClick={() => setPrintDoc('Form 5 — Report on Promotion (DepEd SF 5)')}
              >
                <FileText className="w-3.5 h-3.5" /> Print Form 5
              </Button>
              <Button
                variant="outline"
                className="justify-start gap-2 w-full"
                onClick={() => setPrintDoc('Report Cards — Batch print for all learners')}
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
                <div className="grid grid-cols-2 gap-x-4">
                  <div>
                    <div className="bg-panel-alt -mx-4 px-4 py-2 border-b border-border text-label uppercase font-bold text-ink-muted">
                      Male · {males.length}
                    </div>
                    {males.map((s, i) => (
                      <div
                        key={s.lrn}
                        onClick={() => navigate(`/students/${s.lrn}`)}
                        className="flex gap-2.5 py-1.5 -mx-4 px-4 cursor-pointer hover:bg-app text-[12.5px]"
                      >
                        <span className="text-ink-muted w-5 tabular-nums">{i + 1}</span>
                        <span>{formatLastFirstMiddle(s)}</span>
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
                        className="flex gap-2.5 py-1.5 -mx-4 px-4 cursor-pointer hover:bg-app text-[12.5px]"
                      >
                        <span className="text-ink-muted w-5 tabular-nums">{i + 1}</span>
                        <span>{formatLastFirstMiddle(s)}</span>
                      </div>
                    ))}
                  </div>
                </div>
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
                  Generates SF 9 / Form 138 PDFs for the entire roster. PDF generation is wired to the backend in phase 2.
                </p>
                <div className="flex justify-end mb-3">
                  <Button variant="outline" className="gap-2">
                    <Printer className="w-3.5 h-3.5" /> Print all
                  </Button>
                </div>
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-[0.04em] text-ink-muted border-b border-border">
                      <th className="py-1.5 pr-3 w-[18%]">LRN</th>
                      <th className="py-1.5 pr-3">Learner's Name</th>
                      <th className="py-1.5 pr-3 w-[14%]">Quarter status</th>
                      <th className="py-1.5 w-[12%] text-right"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {roster.map((s) => (
                      <tr key={s.lrn} className="border-b border-border-soft last:border-0">
                        <td className="py-1.5 pr-3 font-mono">{s.lrn}</td>
                        <td className="py-1.5 pr-3">{formatLastFirstMiddle(s)}</td>
                        <td className="py-1.5 pr-3">
                          <StatusBadge tone="pending">awaiting Q1</StatusBadge>
                        </td>
                        <td className="py-1.5 text-right">
                          <Button variant="outline" size="sm">
                            Print
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </SectionCard>
            </TabsContent>

            <TabsContent value="esc">
              <SectionCard heading="ESC Billing — Education Service Contracting">
                <p className="text-[11.5px] text-ink-muted mb-3 px-1">
                  Government subsidy program for private schools. Track per-student ESC eligibility for reimbursement claims.
                </p>
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-[0.04em] text-ink-muted border-b border-border">
                      <th className="py-1.5 pr-3 w-[18%]">LRN</th>
                      <th className="py-1.5 pr-3">Learner's Name</th>
                      <th className="py-1.5 pr-3 w-[14%]">Eligibility</th>
                      <th className="py-1.5 w-[14%] text-right">Subsidy</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roster.map((s) => (
                      <tr key={s.lrn} className="border-b border-border-soft last:border-0">
                        <td className="py-1.5 pr-3 font-mono">{s.lrn}</td>
                        <td className="py-1.5 pr-3">{formatLastFirstMiddle(s)}</td>
                        <td className="py-1.5 pr-3">
                          <StatusBadge tone="na">N/A — Elem</StatusBadge>
                        </td>
                        <td className="py-1.5 text-right text-ink-muted">—</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </SectionCard>
            </TabsContent>

            <TabsContent value="transferees">
              <SectionCard heading="Class Transferees">
                <p className="text-[11.5px] text-ink-muted mb-3 px-1">
                  Class-scoped log of students who transferred IN or OUT of this section during the SY.
                </p>
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-[0.04em] text-ink-muted border-b border-border">
                      <th className="py-1.5 pr-3">Name</th>
                      <th className="py-1.5 pr-3 w-[14%]">Direction</th>
                      <th className="py-1.5 pr-3 w-[18%]">Date</th>
                      <th className="py-1.5">Other school</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-ink-secondary">
                        No transferees recorded for this section in SY 2025–2026.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </SectionCard>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      <PrintPreview
        open={printDoc !== null}
        title={printDoc ?? ''}
        subtitle={`Grade ${klass.gradeLevel} · ${klass.sectionName} · SY ${klass.sy}`}
        onClose={() => setPrintDoc(null)}
      />
    </>
  );
}
