import { useNavigate } from 'react-router-dom';
import { Breadcrumb } from '@/components/shell/Breadcrumb';
import { DataTable, type Column } from '@/components/tables/DataTable';
import { students, classes } from '@/mocks';
import { formatLastFirstMiddle } from '@/lib/format';
import type { Student } from '@/types';

export default function StudentNo() {
  const navigate = useNavigate();

  const cols: Column<Student>[] = [
    {
      key: 'sno',
      header: 'Student No.',
      width: '14%',
      render: (s) => <span className="font-mono">{s.studentNo}</span>,
    },
    { key: 'name', header: 'Name', width: '32%', render: (s) => formatLastFirstMiddle(s) },
    {
      key: 'grade',
      header: 'Grade · Section',
      width: '24%',
      render: (s) => {
        const c = classes.find((c) => c.id === s.currentClassId);
        return c ? `Grade ${c.gradeLevel} · ${c.sectionName}` : '—';
      },
    },
    {
      key: 'lrn',
      header: 'LRN',
      width: '16%',
      render: (s) => <span className="font-mono text-ink-secondary">{s.lrn}</span>,
    },
    { key: 'gender', header: 'Sex', width: '6%', render: (s) => s.gender.charAt(0) },
    { key: 'yrs', header: 'Yrs', width: '8%', render: (s) => s.loyaltyYears },
  ];

  return (
    <>
      <Breadcrumb items={[{ label: 'Reports', to: '/reports' }, { label: 'Student No.' }]} />
      <div className="mb-4">
        <h1 className="text-xl font-bold text-ink-primary">Student No. Lookup</h1>
        <p className="text-[13px] text-ink-secondary mt-1">
          Comprehensive lookup. Student No. format <span className="font-mono">YY1YY2&#123;seq&#125;</span> encodes the SY of first NPS enrolment.
        </p>
      </div>
      <DataTable<Student>
        data={students}
        columns={cols}
        searchableText={(s) => `${s.studentNo} ${s.lrn} ${formatLastFirstMiddle(s)}`}
        onRowClick={(s) => navigate(`/students/${s.lrn}`)}
        searchPlaceholder="Search by Student No., name, or LRN…"
      />
    </>
  );
}
