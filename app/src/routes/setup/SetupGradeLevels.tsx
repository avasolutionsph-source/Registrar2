import { Breadcrumb } from '@/components/shell/Breadcrumb';
import { SectionCard } from '@/components/entity/SectionCard';
import { StatusBadge } from '@/components/entity/StatusBadge';

interface Level {
  code: string;
  label: string;
  tier: 1 | 2 | 3 | 4;
  status: 'IN' | 'OUT';
  note?: string;
}

const LEVELS: Level[] = [
  // IN — currently used by NPS
  { code: 'N1', label: 'Nursery 1', tier: 1, status: 'IN' },
  { code: 'N2', label: 'Nursery 2', tier: 1, status: 'IN' },
  { code: 'K', label: 'Kinder', tier: 1, status: 'IN' },
  { code: 'I', label: 'Grade I', tier: 2, status: 'IN' },
  { code: 'II', label: 'Grade II', tier: 2, status: 'IN' },
  { code: 'III', label: 'Grade III', tier: 2, status: 'IN' },
  { code: 'IV', label: 'Grade IV', tier: 2, status: 'IN' },
  { code: 'V', label: 'Grade V', tier: 2, status: 'IN' },
  { code: 'VI', label: 'Grade VI', tier: 2, status: 'IN' },
  { code: 'VII', label: 'Grade VII', tier: 3, status: 'IN' },
  { code: 'VIII', label: 'Grade VIII', tier: 3, status: 'IN' },
  { code: 'IX', label: 'Grade IX', tier: 3, status: 'IN' },
  { code: 'X', label: 'Grade X', tier: 3, status: 'IN' },
  { code: '11-1', label: 'Grade XI · GAS', tier: 4, status: 'IN' },
  { code: '11-2', label: 'Grade XI · HUMSS', tier: 4, status: 'IN' },
  { code: '11-3', label: 'Grade XI · STEM', tier: 4, status: 'IN' },
  { code: '11-4', label: 'Grade XI · ABM', tier: 4, status: 'IN' },
  { code: '12-1', label: 'Grade XII · GAS', tier: 4, status: 'IN' },
  { code: '12-2', label: 'Grade XII · HUMSS', tier: 4, status: 'IN' },
  { code: '12-3', label: 'Grade XII · STEM', tier: 4, status: 'IN' },
  { code: '12-4', label: 'Grade XII · ABM', tier: 4, status: 'IN' },
  { code: 'S', label: 'SPED', tier: 2, status: 'IN', note: 'Special Education' },
  // OUT — legacy codes, kept for transferee compatibility
  { code: 'JC', label: 'Junior Casa', tier: 1, status: 'OUT', note: 'Legacy pre-elementary' },
  { code: 'AC', label: 'Advanced Casa', tier: 1, status: 'OUT', note: 'Legacy pre-elementary' },
  { code: 'SC', label: 'Senior Casa', tier: 1, status: 'OUT', note: 'Legacy pre-elementary' },
  { code: '1Y', label: '1st Year', tier: 3, status: 'OUT', note: 'Pre-K12 HS' },
  { code: '2Y', label: '2nd Year', tier: 3, status: 'OUT', note: 'Pre-K12 HS' },
  { code: '3Y', label: '3rd Year', tier: 3, status: 'OUT', note: 'Pre-K12 HS' },
  { code: '4Y', label: '4th Year', tier: 3, status: 'OUT', note: 'Pre-K12 HS' },
];

const TIER_LABELS: Record<number, string> = {
  1: 'Pre-Elementary (Tier 1)',
  2: 'Elementary (Tier 2)',
  3: 'Junior High School (Tier 3)',
  4: 'Senior High School (Tier 4)',
};

export default function SetupGradeLevels() {
  const inLevels = LEVELS.filter((l) => l.status === 'IN');
  const outLevels = LEVELS.filter((l) => l.status === 'OUT');

  return (
    <>
      <Breadcrumb items={[{ label: 'Setup', to: '/setup' }, { label: 'Grade & Year Levels' }]} />
      <div className="mb-5">
        <h1 className="text-xl font-bold text-ink-primary">Grade & Year Levels</h1>
        <p className="text-[13px] text-ink-secondary mt-1">
          Active levels are used in the current curriculum. Inactive (OUT) levels are kept only so transferees from
          pre-K12 schools can be cataloged with their original grade.
        </p>
      </div>

      <div className="flex flex-col gap-3.5">
        <SectionCard heading={`Active levels (IN) · ${inLevels.length}`}>
          {[1, 2, 3, 4].map((tier) => {
            const rows = inLevels.filter((l) => l.tier === tier);
            if (rows.length === 0) return null;
            return (
              <div key={tier} className="mb-3 last:mb-0">
                <div className="text-label uppercase font-bold text-ink-muted mb-1.5 px-1">
                  {TIER_LABELS[tier]}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {rows.map((l) => (
                    <div
                      key={l.code}
                      className="flex items-center justify-between bg-app border border-border-soft rounded px-3 py-2"
                    >
                      <div>
                        <div className="text-[12.5px] font-medium text-ink-primary">{l.label}</div>
                        <div className="text-[11px] font-mono text-ink-muted">{l.code}</div>
                      </div>
                      <StatusBadge tone="ok">IN</StatusBadge>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </SectionCard>

        <SectionCard heading={`Legacy levels (OUT) · ${outLevels.length}`}>
          <p className="text-[11.5px] text-ink-muted mb-2 px-1">
            Read-only. Used for transferee records only — students with these codes can't enroll into them.
          </p>
          <div className="grid grid-cols-3 gap-2">
            {outLevels.map((l) => (
              <div
                key={l.code}
                className="flex items-center justify-between bg-panel-alt border border-border-soft rounded px-3 py-2 opacity-80"
              >
                <div>
                  <div className="text-[12.5px] text-ink-primary">{l.label}</div>
                  <div className="text-[11px] font-mono text-ink-muted">{l.code}</div>
                </div>
                <StatusBadge tone="na">OUT</StatusBadge>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </>
  );
}
