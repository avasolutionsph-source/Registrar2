import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Breadcrumb } from '@/components/shell/Breadcrumb';
import { DataTable, type Column } from '@/components/tables/DataTable';
import { StatusBadge } from '@/components/entity/StatusBadge';
import { listSchools, listStudentsLite, type SchoolRecord } from '@/lib/db';

const toneForType = (t: SchoolRecord['type']): 'ok' | 'pending' | 'na' =>
  t === 'Private' ? 'ok' : t === 'Public' ? 'pending' : 'na';

export default function SetupSchools() {
  const [schools, setSchools] = useState<SchoolRecord[]>([]);
  const [originCounts, setOriginCounts] = useState<Map<string, number>>(new Map());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [sch, students] = await Promise.all([listSchools(), listStudentsLite()]);
        if (cancelled) return;
        setSchools(sch);
        const counts = new Map<string, number>();
        for (const s of students) {
          if (!/^\d{12}$/.test(s.lrn)) continue;
          const id = s.lrn.slice(0, 6);
          counts.set(id, (counts.get(id) ?? 0) + 1);
        }
        setOriginCounts(counts);
      } catch {
        /* leave empty */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const cols: Column<SchoolRecord>[] = [
    {
      key: 'id',
      header: 'School ID',
      width: '12%',
      render: (s) => <span className="font-mono">{s.id}</span>,
    },
    { key: 'name', header: 'Name', width: '28%', render: (s) => s.name },
    {
      key: 'addr',
      header: 'Address',
      width: '22%',
      render: (s) => <span className="text-ink-secondary">{s.address}</span>,
    },
    { key: 'district', header: 'District', width: '13%', render: (s) => s.district },
    { key: 'div', header: 'Division', width: '13%', render: (s) => s.division },
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
        <span className="tabular-nums text-right block">{originCounts.get(s.id) ?? 0}</span>
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
        searchableText={(s) => `${s.id} ${s.name} ${s.address} ${s.district} ${s.division}`}
        searchPlaceholder="Search by School ID, name, district, or division…"
        rightActions={
          <Button>
            <Plus className="w-3.5 h-3.5 mr-1" /> Add School
          </Button>
        }
      />
    </>
  );
}
