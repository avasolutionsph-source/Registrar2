import type { Subject } from '@/types';

// 3-letter subject codes from legacy catalog (Batch 9). Subset used in mocks.
export const subjects: Subject[] = [
  { code: 'CLE', fullName: 'Christian Living Education', abbreviation: 'CLE', category: 'Core', order: 1 },
  { code: 'LAN', fullName: 'Language', abbreviation: 'Lang', category: 'Core', order: 2 },
  { code: 'REA', fullName: 'Reading', abbreviation: 'Rdg', category: 'Core', order: 3 },
  { code: 'MAT', fullName: 'Mathematics', abbreviation: 'Math', category: 'Core', order: 4 },
  { code: 'FIL', fullName: 'Filipino', abbreviation: 'Fil', category: 'Core', order: 5 },
  // MAPEH is graded through its two components; the MAPEH line is derived.
  { code: 'MUA', fullName: 'Music & Arts', abbreviation: 'MAPEH', category: 'Core', order: 6 },
  { code: 'PEH', fullName: 'Physical Education & Health', abbreviation: 'MAPEH', category: 'Core', order: 7 },
  { code: 'SCI', fullName: 'Science', abbreviation: 'Sci', category: 'Core', order: 8 },
  { code: 'ESP', fullName: 'Edukasyon sa Pagpapakatao', abbreviation: 'EsP', category: 'Core', order: 9 },
  {
    code: 'EPP',
    fullName: 'Edukasyong Pantahanan at Pangkabuhayan',
    abbreviation: 'EPP',
    category: 'Core',
    order: 10,
  },
  { code: 'GMC', fullName: 'Good Moral Conduct', abbreviation: 'GMC', category: 'Core', order: 11 },
];
