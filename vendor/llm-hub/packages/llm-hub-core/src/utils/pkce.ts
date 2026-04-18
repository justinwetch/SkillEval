import { createHash, randomBytes } from 'node:crypto';

function toBase64Url(value: Buffer): string {
  return value
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

export function createRandomId(size = 16): string {
  return toBase64Url(randomBytes(size));
}

export function createCodeVerifier(): string {
  return createRandomId(32);
}

export function createCodeChallenge(verifier: string): string {
  const hash = createHash('sha256').update(verifier).digest();
  return toBase64Url(hash);
}
