import { randomBytes } from 'crypto';

// 혼동 문자 제외: O, 0, I, 1, L
const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
const PREFIX = 'PTS-';
const BODY_LEN = 6;

export function generatePetUid(): string {
  const bytes = randomBytes(BODY_LEN);
  let body = '';
  for (let i = 0; i < BODY_LEN; i++) {
    body += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return PREFIX + body;
}

export function isValidPetUid(uid: unknown): uid is string {
  if (typeof uid !== 'string') return false;
  if (!uid.startsWith(PREFIX)) return false;
  const body = uid.slice(PREFIX.length);
  if (body.length < 5 || body.length > 8) return false;
  for (const c of body) {
    if (!ALPHABET.includes(c)) return false;
  }
  return true;
}

export async function generateUniquePetUid(
  exists: (uid: string) => Promise<boolean> | boolean,
  maxAttempts = 12,
): Promise<string> {
  for (let i = 0; i < maxAttempts; i++) {
    const candidate = generatePetUid();
    const taken = await exists(candidate);
    if (!taken) return candidate;
  }
  throw new Error('펫 UID 생성에 실패했습니다 (충돌 한도 초과)');
}
