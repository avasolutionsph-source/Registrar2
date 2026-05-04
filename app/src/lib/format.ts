const MONTH_ABBR = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

interface NameParts {
  firstName: string;
  middleName: string;
  lastName: string;
  extension?: string;
}

export function formatLastFirstMiddle(p: NameParts): string {
  const ext = p.extension ? `, ${p.extension}` : '';
  return `${p.lastName.toUpperCase()}, ${p.firstName} ${p.middleName}${ext}`.trim();
}

export function formatFullName(p: NameParts): string {
  const ext = p.extension ? ` ${p.extension}` : '';
  return `${p.firstName} ${p.middleName} ${p.lastName}${ext}`.trim();
}

export function formatBirthdate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${MONTH_ABBR[m - 1]} ${y}`;
}

export function ageOnDate(birthIso: string, refIso: string): number {
  const [by, bm, bd] = birthIso.split('-').map(Number);
  const [ry, rm, rd] = refIso.split('-').map(Number);
  let age = ry - by;
  if (rm < bm || (rm === bm && rd < bd)) age -= 1;
  return age;
}
