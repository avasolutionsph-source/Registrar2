import { describe, it, expect } from 'vitest';
import {
  AREA_WEIGHTS,
  componentPercent,
  initialGrade,
  transmute,
  computeGrade,
  descriptorFor,
  promotionStatus,
  classifyArea,
  isDescriptiveLevel,
} from '../grading';

describe('componentPercent', () => {
  it('is points earned over total, 0..100', () => {
    expect(componentPercent({ earned: 45, total: 50 })).toBe(90);
    expect(componentPercent({ earned: 0, total: 0 })).toBeNull(); // no items yet
    expect(componentPercent(null)).toBeNull();
  });
});

describe('transmute (SY 2026-2027 table)', () => {
  it('maps the published bands', () => {
    expect(transmute(100)).toBe(100);
    expect(transmute(99.5)).toBe(100);
    expect(transmute(95.4)).toBe(97);
    expect(transmute(75.5)).toBe(77); // 75.00–75.99 → 77
    expect(transmute(74.99)).toBe(76); // 73.00–74.99 → 76
    expect(transmute(70)).toBe(75); // 70.00–72.99 → 75 (passing line)
    expect(transmute(69.99)).toBe(74);
    expect(transmute(30)).toBe(60); // 25.00–39.99 → 60
    expect(transmute(0)).toBe(60); // default minimum
  });
  it('passes through null', () => {
    expect(transmute(null)).toBeNull();
  });
});

describe('initialGrade + computeGrade', () => {
  it('weights core 20/50/30 and re-normalises missing components', () => {
    const core = AREA_WEIGHTS.core;
    // all three encoded: 90*.2 + 80*.5 + 100*.3 = 18 + 40 + 30 = 88
    expect(initialGrade(
      { ww: { earned: 90, total: 100 }, pt: { earned: 80, total: 100 }, st: { earned: 100, total: 100 } },
      core,
    )).toBeCloseTo(88, 5);
    // only WW + PT in → re-normalise over 70: (90*20 + 80*50)/70 = 82.857…
    expect(initialGrade(
      { ww: { earned: 90, total: 100 }, pt: { earned: 80, total: 100 } },
      core,
    )).toBeCloseTo((90 * 20 + 80 * 50) / 70, 5);
    expect(initialGrade({}, core)).toBeNull();
  });

  it('computeGrade transmutes the weighted initial grade', () => {
    // initial 88 → transmuted 90
    expect(computeGrade(
      { ww: { earned: 90, total: 100 }, pt: { earned: 80, total: 100 }, st: { earned: 100, total: 100 } },
      'core',
    )).toBe(90);
  });
});

describe('descriptors & promotion', () => {
  it('numeric descriptor bands', () => {
    expect(descriptorFor(92)?.label).toBe('Advancing');
    expect(descriptorFor(77)?.label).toBe('Connecting');
    expect(descriptorFor(60)?.label).toBe('Emerging');
  });
  it('promotion: remedial when failing at most two areas', () => {
    expect(promotionStatus([90, 88, 76])).toBe('promoted');
    expect(promotionStatus([90, 74, 70])).toBe('remedial'); // 2 fails
    expect(promotionStatus([90, 74, 70, 60])).toBe('retained'); // 3 fails
  });
});

describe('classification & key stage', () => {
  it('routes MAPEH/TLE to the 20/60/20 group, academics to core', () => {
    expect(classifyArea({ code: 'MAP', fullName: 'MAPEH' })).toBe('mapeh-tle');
    expect(classifyArea({ code: 'TLE', fullName: 'Technology and Livelihood Education' })).toBe('mapeh-tle');
    expect(classifyArea({ code: 'MAT', fullName: 'Mathematics' })).toBe('core');
    expect(classifyArea({ code: 'ESP', fullName: 'Edukasyon sa Pagpapakatao' })).toBe('core');
  });
  it('marks Kinder–Grade 3 as descriptive', () => {
    expect(isDescriptiveLevel('I')).toBe(true); // Grade 1
    expect(isDescriptiveLevel('K')).toBe(true);
    expect(isDescriptiveLevel('IV')).toBe(false); // Grade 4 → numerical
    expect(isDescriptiveLevel('X')).toBe(false);
  });
});
