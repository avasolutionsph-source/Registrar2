import type { Subject } from '@/types';

// 3-letter subject codes from legacy catalog (Batch 9). Subset used in mocks.
export const subjects: Subject[] = [
  { code: 'CLE', fullName: 'Christian Living Education', abbreviation: 'CLE', category: 'Core' },
  { code: 'LAN', fullName: 'Language', abbreviation: 'Lang', category: 'Core' },
  { code: 'REA', fullName: 'Reading', abbreviation: 'Rdg', category: 'Core' },
  { code: 'MAT', fullName: 'Mathematics', abbreviation: 'Math', category: 'Core' },
  { code: 'FIL', fullName: 'Filipino', abbreviation: 'Fil', category: 'Core' },
  { code: 'MAPEH', fullName: 'MAPEH', abbreviation: 'MAPEH', category: 'Core' },
  { code: 'SCI', fullName: 'Science', abbreviation: 'Sci', category: 'Core' },
  { code: 'ESP', fullName: 'Edukasyon sa Pagpapakatao', abbreviation: 'EsP', category: 'Core' },
  {
    code: 'EPP',
    fullName: 'Edukasyong Pantahanan at Pangkabuhayan',
    abbreviation: 'EPP',
    category: 'Core',
  },
  { code: 'GMC', fullName: 'Good Moral Conduct', abbreviation: 'GMC', category: 'Core' },
];
