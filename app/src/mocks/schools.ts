import { schoolIdFromLrn } from '@/lib/lrn';
import { students } from './students';

export interface SchoolRecord {
  id: string; // 6-digit DepEd School ID (matches LRN[0:6])
  name: string;
  address: string;
  district: string;
  division: string;
  region: string;
  type: 'Public' | 'Private' | 'SUC';
}

// MOCK note: school metadata (address/district/division/region/type) is faked.
// School IDs are real (derived from the actual LRNs in our roster, which encode
// each student's school of original enrollment per legacy catalog Batch 11).
export const schools: SchoolRecord[] = [
  {
    id: '403875',
    name: 'Naga Parochial School',
    address: 'Caceres St., Naga City',
    district: 'Naga City',
    division: 'Naga City',
    region: 'V',
    type: 'Private',
  },
  {
    id: '403870',
    name: 'San Francisco Elementary School',
    address: 'San Francisco, Naga City',
    district: 'Naga City',
    division: 'Naga City',
    region: 'V',
    type: 'Public',
  },
  {
    id: '410553',
    name: 'Calabanga Central School',
    address: 'Calabanga, Camarines Sur',
    district: 'Calabanga',
    division: 'Camarines Sur',
    region: 'V',
    type: 'Public',
  },
  {
    id: '433591',
    name: 'St. Joseph Academy',
    address: 'Iriga City',
    district: 'Iriga',
    division: 'Iriga City',
    region: 'V',
    type: 'Private',
  },
  {
    id: '436513',
    name: 'Holy Rosary Minor Seminary',
    address: 'Naga City',
    district: 'Naga City',
    division: 'Naga City',
    region: 'V',
    type: 'Private',
  },
  {
    id: '436534',
    name: 'Bicol University Integrated Laboratory School',
    address: 'Legazpi City',
    district: 'Legazpi',
    division: 'Albay',
    region: 'V',
    type: 'SUC',
  },
];

export function studentsFromSchool(schoolId: string) {
  return students.filter((s) => schoolIdFromLrn(s.lrn) === schoolId);
}
