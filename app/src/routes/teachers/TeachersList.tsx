import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Breadcrumb } from '@/components/shell/Breadcrumb';
import { DataTable, type Column } from '@/components/tables/DataTable';
import { StatusBadge } from '@/components/entity/StatusBadge';
import { teachers, classes } from '@/mocks';
import type { Teacher } from '@/types';

function advisedSection(t: Teacher) {
  const klass = classes.find((c) => c.adviser.id === t.id);
  return klass ? `Grade ${klass.gradeLevel} · ${klass.sectionName}` : '—';
}

export default function TeachersList() {
  const navigate = useNavigate();

  const cols: Column<Teacher>[] = [
    {
      key: 'name',
      header: 'Name',
      width: '30%',
      render: (t) => `${t.title} ${t.familyName}, ${t.firstName} ${t.middleInitial}`,
    },
    { key: 'email', header: 'Email', width: '24%', render: (t) => <span className="text-ink-secondary">{t.email}</span> },
    { key: 'years', header: 'Years', width: '12%', render: (t) => `${t.yearStarted} – ${t.yearEnded === 0 ? 'present' : t.yearEnded}` },
    { key: 'adviser', header: 'Advisory', width: '24%', render: (t) => advisedSection(t) },
    {
      key: 'status',
      header: 'Status',
      width: '10%',
      render: (t) => (
        <StatusBadge tone={t.yearEnded === 0 ? 'ok' : 'na'}>
          {t.yearEnded === 0 ? 'Active' : 'Ended'}
        </StatusBadge>
      ),
    },
  ];

  return (
    <>
      <Breadcrumb items={[{ label: 'Teachers' }]} />
      <div className="mb-4">
        <h1 className="text-xl font-bold text-ink-primary">Teachers</h1>
        <p className="text-[13px] text-ink-secondary mt-1">{teachers.length} on roster</p>
      </div>
      <DataTable<Teacher>
        data={teachers}
        columns={cols}
        searchableText={(t) => `${t.familyName} ${t.firstName} ${t.email}`}
        onRowClick={(t) => navigate(`/teachers/${t.id}`)}
        searchPlaceholder="Search by name or email…"
        rightActions={
          <Button onClick={() => navigate('/teachers/new')}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Add Teacher
          </Button>
        }
      />
    </>
  );
}
