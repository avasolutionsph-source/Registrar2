import { describe, it, expect } from 'vitest';
import { encryptArchive, decryptArchive } from '../archive';

const meta = {
  exportedAt: '2026-06-09T00:00:00Z',
  scope: 'all',
  scopeLabel: 'All students',
  studentCount: 2,
};
const payload = {
  kind: 'students',
  students: [
    { lrn: '403875150432', firstName: 'Ana', address: 'Top-Secret Street 1', birthdate: '2009-05-20' },
    { lrn: '403875150999', firstName: 'Boy', address: 'Hidden Ave 2' },
  ],
};

describe('archive encryption', () => {
  it('round-trips the payload with the correct password', async () => {
    const env = await encryptArchive(payload, 'a-strong-pass', meta);
    expect(env.format).toBe('nps-registrar-archive');
    expect(env.meta.studentCount).toBe(2);
    // PII must not be readable in the envelope
    expect(JSON.stringify(env)).not.toContain('Top-Secret Street');
    const back = await decryptArchive(env, 'a-strong-pass');
    expect(back).toEqual(payload);
  });

  it('rejects a wrong password (auth tag fails)', async () => {
    const env = await encryptArchive(payload, 'correct-horse', meta);
    await expect(decryptArchive(env, 'wrong-pass')).rejects.toThrow();
  });

  it('produces a different ciphertext each time (random salt + IV)', async () => {
    const a = await encryptArchive(payload, 'same-pass', meta);
    const b = await encryptArchive(payload, 'same-pass', meta);
    expect(a.ciphertext).not.toBe(b.ciphertext);
    expect(a.salt).not.toBe(b.salt);
    expect(a.iv).not.toBe(b.iv);
  });
});
