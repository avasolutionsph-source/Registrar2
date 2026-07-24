import type { Student } from '@/types';

// Standard DepEd class-list grouping used across the whole system (portal
// grade sheet, registrar sheets, class lists): MALE first, then FEMALE, each
// alphabetical with its OWN numbering. Gender is matched by first letter so
// legacy values ('M', 'F') still bucket correctly; learners with no usable
// gender fall to an "Unspecified" group at the END (never dropped), so a data
// problem stays visible instead of silently hidden.
export interface SexGroup {
  key: 'Male' | 'Female' | 'Unspecified';
  label: string;
  students: Student[];
}

export function groupRosterBySex(roster: Student[]): SexGroup[] {
  const bucket = (g?: string): SexGroup['key'] => {
    const v = (g || '').trim().charAt(0).toUpperCase();
    return v === 'M' ? 'Male' : v === 'F' ? 'Female' : 'Unspecified';
  };
  const buckets: Record<SexGroup['key'], Student[]> = { Male: [], Female: [], Unspecified: [] };
  for (const s of roster) buckets[bucket(s.gender)].push(s);
  const byName = (a: Student, b: Student) =>
    a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName);
  return (
    [
      { key: 'Male', label: 'Male' },
      { key: 'Female', label: 'Female' },
      { key: 'Unspecified', label: 'Unspecified' },
    ] as const
  )
    .map((g) => ({ ...g, students: buckets[g.key].slice().sort(byName) }))
    .filter((g) => g.students.length > 0);
}

// Shared styling for the MALE / FEMALE separator row in a roster table.
export const sexRowCls = (key: SexGroup['key']) =>
  `px-2 py-1 text-[11px] font-bold uppercase tracking-wider ${
    key === 'Unspecified' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'
  }`;
