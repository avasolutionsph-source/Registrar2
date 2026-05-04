import { describe, it, expect } from 'vitest';
import { parseLrn, isValidLrn, schoolIdFromLrn } from '../lrn';

describe('LRN parsing', () => {
  it('rejects LRNs that are not exactly 12 digits', () => {
    expect(isValidLrn('40387524000')).toBe(false); // 11 digits
    expect(isValidLrn('4038752400011')).toBe(false); // 13 digits
    expect(isValidLrn('40387524000a')).toBe(false); // non-digit
    expect(isValidLrn('')).toBe(false);
  });

  it('accepts a well-formed 12-digit LRN', () => {
    expect(isValidLrn('403875240001')).toBe(true);
  });

  it('extracts the school ID as the first 6 digits', () => {
    expect(schoolIdFromLrn('403875240001')).toBe('403875');
    expect(schoolIdFromLrn('436534240018')).toBe('436534');
  });

  it('throws on invalid LRN when extracting school ID', () => {
    expect(() => schoolIdFromLrn('invalid')).toThrow();
  });

  it('parseLrn returns school ID, year segment, and sequence', () => {
    expect(parseLrn('403875240001')).toEqual({
      schoolId: '403875',
      yearSegment: '24',
      sequence: '0001',
    });
  });
});
