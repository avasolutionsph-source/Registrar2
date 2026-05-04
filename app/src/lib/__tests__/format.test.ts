import { describe, it, expect } from 'vitest';
import { formatFullName, formatLastFirstMiddle, formatBirthdate, ageOnDate } from '../format';

describe('Name formatting', () => {
  it('formats full name as Last, First Middle', () => {
    expect(
      formatLastFirstMiddle({
        firstName: 'Marcuz Karmelo',
        middleName: 'Delos Reyes',
        lastName: 'Abordo',
      }),
    ).toBe('ABORDO, Marcuz Karmelo Delos Reyes');
  });

  it('handles names with extension', () => {
    expect(
      formatLastFirstMiddle({
        firstName: 'Juan',
        middleName: 'Cruz',
        lastName: 'Dela Cruz',
        extension: 'Jr.',
      }),
    ).toBe('DELA CRUZ, Juan Cruz, Jr.');
  });

  it('First Middle Last without comma format', () => {
    expect(
      formatFullName({
        firstName: 'Marcuz Karmelo',
        middleName: 'Delos Reyes',
        lastName: 'Abordo',
      }),
    ).toBe('Marcuz Karmelo Delos Reyes Abordo');
  });
});

describe('Birthdate formatting', () => {
  it('formats ISO date as locale-friendly', () => {
    expect(formatBirthdate('2019-03-03')).toBe('3 Mar 2019');
  });

  it('age on a given reference date', () => {
    // Marcuz born 2019-03-03; on 2026-05-04 he is 7
    expect(ageOnDate('2019-03-03', '2026-05-04')).toBe(7);
    // Edge: birthday hasn't passed yet this year
    expect(ageOnDate('2019-06-15', '2026-05-04')).toBe(6);
    // Edge: exactly birthday
    expect(ageOnDate('2019-05-04', '2026-05-04')).toBe(7);
  });
});
