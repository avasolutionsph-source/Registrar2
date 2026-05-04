import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Breadcrumb } from '@/components/shell/Breadcrumb';
import { DataTable, type Column } from '@/components/tables/DataTable';
import { StatusBadge } from '@/components/entity/StatusBadge';
import { students, classes } from '@/mocks';
import type { Student } from '@/types';
import { formatLastFirstMiddle } from '@/lib/format';

export default function StudentsList() {
  const navigate = useNavigate();

  const cols: Column<Student>[] = [
    {
      key: 'name',
      header: 'Name',
      width: '32%',
      render: (s) => formatLastFirstMiddle(s),
    },
    {
      key: 'lrn',
      header: 'LRN',
      width: '15%',
      render: (s) => <span className="font-mono">{s.lrn}</span>,
    },
    {
      key: 'class',
      header: 'Class',
      width: '24%',
      render: (s) => {
        const c = classes.find((c) => c.id === s.currentClassId);
        return c ? `Grade ${c.gradeLevel} · ${c.sectionName}` : '—';
      },
    },
    { key: 'gender', header: 'Sex', width: '7%', render: (s) => s.gender.charAt(0) },
    {
      key: 'status',
      header: 'Status',
      width: '12%',
      render: (s) => <StatusBadge tone="ok">{s.status}</StatusBadge>,
    },
  ];

  return (
    <>
      <Breadcrumb items={[{ label: 'Students' }]} />
      <div className="mb-4">
        <h1 className="text-xl font-bold text-ink-primary">Students</h1>
        <p className="text-[13px] text-ink-secondary mt-1">
          {students.length} learners in SY 2025–2026
        </p>
      </div>
      <DataTable<Student>
        data={students}
        columns={cols}
        searchableText={(s) => `${formatLastFirstMiddle(s)} ${s.lrn} ${s.studentNo}`}
        onRowClick={(s) => navigate(`/students/${s.lrn}`)}
        searchPlaceholder="Search by name, LRN, or Student No.…"
        rightActions={
          <Button onClick={() => navigate('/students/new')}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Add Student
          </Button>
        }
      />
    </>
  );
}
