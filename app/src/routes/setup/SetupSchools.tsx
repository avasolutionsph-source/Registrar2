import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Breadcrumb } from '@/components/shell/Breadcrumb';
import { DataTable, type Column } from '@/components/tables/DataTable';
import { StatusBadge } from '@/components/entity/StatusBadge';
import { schools, studentsFromSchool } from '@/mocks';
import type { SchoolRecord } from '@/mocks/schools';

const toneForType = (t: SchoolRecord['type']): 'ok' | 'pending' | 'na' =>
  t === 'Private' ? 'ok' : t === 'Public' ? 'pending' : 'na';

export default function SetupSchools() {
  const cols: Column<SchoolRecord>[] = [
    {
      key: 'id',
      header: 'School ID',
      width: '12%',
      render: (s) => <span className="font-mono">{s.id}</span>,
    },
    { key: 'name', header: 'Name', width: '32%', render: (s) => s.name },
    {
      key: 'addr',
      header: 'Address',
      width: '24%',
      render: (s) => <span className="text-ink-secondary">{s.address}</span>,
    },
    { key: 'div', header: 'Division', width: '14%', render: (s) => s.division },
    {
      key: 'type',
      header: 'Type',
      width: '10%',
      render: (s) => <StatusBadge tone={toneForType(s.type)}>{s.type}</StatusBadge>,
    },
    {
      key: 'count',
      header: 'Origins',
      width: '8%',
      render: (s) => (
        <span className="tabular-nums text-right block">{studentsFromSchool(s.id).length}</span>
      ),
    },
  ];

  return (
    <>
      <Breadcrumb items={[{ label: 'Setup', to: '/setup' }, { label: 'Schools' }]} />
      <div className="mb-4">
        <h1 className="text-xl font-bold text-ink-primary">Schools</h1>
        <p className="text-[13px] text-ink-secondary mt-1">
          Master list of schools. The first 6 digits of every student's LRN map to a record here (their school of original enrollment).
        </p>
      </div>
      <DataTable<SchoolRecord>
        data={schools}
        columns={cols}
        searchableText={(s) => `${s.id} ${s.name} ${s.address} ${s.division}`}
        searchPlaceholder="Search by School ID, name, or division…"
        rightActions={
          <Button>
            <Plus className="w-3.5 h-3.5 mr-1" /> Add School
          </Button>
        }
      />
    </>
  );
}
