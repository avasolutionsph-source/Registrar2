// Password-based encryption for downloadable student archives.
//
// Exports decrypt PII out of the cloud into a local file, so the file MUST be
// encrypted at rest — otherwise we'd just be moving minors' plaintext PII onto a
// laptop/USB. We use the browser's Web Crypto: PBKDF2-SHA256 (210k iters) to turn
// the password into an AES-256-GCM key, then encrypt the JSON payload. Without the
// password the file is unreadable; if the password is lost the file is unrecoverable.

const ENC = new TextEncoder();
const DEC = new TextDecoder();
const ITERATIONS = 210_000;

// TS 5.7's DOM lib narrows BufferSource to ArrayBuffer-backed views; our
// Uint8Arrays are always ArrayBuffer-backed at runtime, so this cast is safe.
const bs = (u: Uint8Array): BufferSource => u as unknown as BufferSource;

function toB64(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

function fromB64(s: string): Uint8Array {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey('raw', bs(ENC.encode(password)), 'PBKDF2', false, [
    'deriveKey',
  ]);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: bs(salt), iterations: ITERATIONS, hash: 'SHA-256' },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

export interface ArchiveMeta {
  exportedAt: string; // ISO timestamp
  scope: string; // 'all' or a school-year code
  scopeLabel: string; // human label
  studentCount: number;
}

export interface ArchiveEnvelope {
  format: 'nps-registrar-archive';
  version: 1;
  encryption: 'AES-GCM-256 / PBKDF2-SHA256';
  iterations: number;
  salt: string;
  iv: string;
  ciphertext: string;
  meta: ArchiveMeta;
}

// Encrypt any JSON-serialisable payload into a self-describing envelope.
export async function encryptArchive(
  payload: unknown,
  password: string,
  meta: ArchiveMeta,
): Promise<ArchiveEnvelope> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);
  const ct = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: bs(iv) },
    key,
    bs(ENC.encode(JSON.stringify(payload))),
  );
  return {
    format: 'nps-registrar-archive',
    version: 1,
    encryption: 'AES-GCM-256 / PBKDF2-SHA256',
    iterations: ITERATIONS,
    salt: toB64(salt),
    iv: toB64(iv),
    ciphertext: toB64(ct),
    meta,
  };
}

// Decrypt an envelope back to its payload. Throws a friendly error on wrong
// password / corrupt file (AES-GCM auth tag fails).
export async function decryptArchive<T = unknown>(
  env: ArchiveEnvelope,
  password: string,
): Promise<T> {
  if (env?.format !== 'nps-registrar-archive') {
    throw new Error('Hindi ito NPS archive file.');
  }
  const key = await deriveKey(password, fromB64(env.salt));
  let pt: ArrayBuffer;
  try {
    pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: bs(fromB64(env.iv)) }, key, bs(fromB64(env.ciphertext)));
  } catch {
    throw new Error('Maling password o sira ang file.');
  }
  return JSON.parse(DEC.decode(pt)) as T;
}
