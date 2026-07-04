import type { Subject } from '@/types';

// 3-letter subject codes from legacy catalog (Batch 9). Subset used in mocks.
// These are Elementary / Junior High subjects — no SHS category (Core/Applied/
// Specialized only apply to Senior High School).
export const subjects: Subject[] = [
  { code: 'CLE', fullName: 'Christian Living Education', abbreviation: 'CLE', order: 1 },
  { code: 'LAN', fullName: 'Language', abbreviation: 'Lang', order: 2 },
  { code: 'REA', fullName: 'Reading', abbreviation: 'Rdg', order: 3 },
  { code: 'MAT', fullName: 'Mathematics', abbreviation: 'Math', order: 4 },
  { code: 'FIL', fullName: 'Filipino', abbreviation: 'Fil', order: 5 },
  // MAPEH is graded through its two components; the MAPEH line is derived.
  { code: 'MUA', fullName: 'Music & Arts', abbreviation: 'MAPEH', order: 6 },
  { code: 'PEH', fullName: 'Physical Education & Health', abbreviation: 'MAPEH', order: 7 },
  { code: 'SCI', fullName: 'Science', abbreviation: 'Sci', order: 8 },
  { code: 'ESP', fullName: 'Edukasyon sa Pagpapakatao', abbreviation: 'EsP', order: 9 },
  {
    code: 'EPP',
    fullName: 'Edukasyong Pantahanan at Pangkabuhayan',
    abbreviation: 'EPP',
    order: 10,
  },
  { code: 'GMC', fullName: 'Good Moral Conduct', abbreviation: 'GMC', order: 11 },
];
