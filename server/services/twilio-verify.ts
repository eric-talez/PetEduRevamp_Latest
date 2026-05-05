/**
 * twilio-verify.ts
 * Twilio Verify SMS OTP 발송/검증 서비스 + 경량 속도 제한
 */
import twilio from 'twilio';
import jwt from 'jsonwebtoken';
import { logServerError } from '../middleware/audit-logger';

const logger = {
  info: (msg: string) => console.log(msg),
  warn: (msg: string) => console.warn(msg),
  error: (msg: string, err?: unknown) => logServerError(msg, err),
};

const ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const VERIFY_SERVICE_SID = process.env.TWILIO_VERIFY_SERVICE_SID;

const PHONE_VERIFY_JWT_SECRET =
  process.env.PHONE_VERIFY_JWT_SECRET ||
  process.env.JWT_SECRET ||
  (process.env.NODE_ENV === 'production' ? '' : 'dev-only-phone-verify-secret');

if (process.env.NODE_ENV === 'production' && !PHONE_VERIFY_JWT_SECRET) {
  logger.error('[PhoneVerify] JWT_SECRET 미설정. 휴대폰 인증 토큰을 안전하게 발급할 수 없습니다.');
}

export const PHONE_VERIFY_TOKEN_TTL_SECONDS = 10 * 60; // 10분

let twilioClient: ReturnType<typeof twilio> | null = null;
function getClient() {
  if (!ACCOUNT_SID || !AUTH_TOKEN || !VERIFY_SERVICE_SID) {
    throw new TwilioConfigError(
      'SMS 인증 서비스가 구성되지 않았습니다. 관리자에게 문의해주세요. ' +
        '(TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_VERIFY_SERVICE_SID 필요)',
    );
  }
  if (!twilioClient) {
    twilioClient = twilio(ACCOUNT_SID, AUTH_TOKEN);
  }
  return twilioClient;
}

export class TwilioConfigError extends Error {
  code = 'SMS_NOT_CONFIGURED';
}
export class RateLimitError extends Error {
  code = 'RATE_LIMITED';
  constructor(message: string, public retryAfterSec: number) {
    super(message);
  }
}
export class InvalidPhoneError extends Error {
  code = 'INVALID_PHONE';
}

/**
 * 한국식 휴대폰 번호를 E.164 형식(+82...)으로 정규화합니다.
 * - 입력 예: 010-1234-5678, 01012345678, +821012345678
 * - 출력 예: +821012345678
 */
export function normalizePhoneNumber(input: string): string {
  if (!input) throw new InvalidPhoneError('휴대폰 번호를 입력해주세요.');
  const trimmed = String(input).trim();

  if (trimmed.startsWith('+')) {
    const digitsOnly = '+' + trimmed.slice(1).replace(/\D/g, '');
    if (digitsOnly.length < 9 || digitsOnly.length > 16) {
      throw new InvalidPhoneError('올바른 휴대폰 번호 형식이 아닙니다.');
    }
    return digitsOnly;
  }

  const digits = trimmed.replace(/\D/g, '');

  // 한국 번호: 010/011 등으로 시작하는 10~11자리
  if (/^01[016789]\d{7,8}$/.test(digits)) {
    return '+82' + digits.slice(1);
  }
  // 이미 국가코드 82가 붙은 경우
  if (/^821[016789]\d{7,8}$/.test(digits)) {
    return '+' + digits;
  }
  throw new InvalidPhoneError('올바른 휴대폰 번호 형식이 아닙니다. (예: 010-1234-5678)');
}

/**
 * 표시용 마스킹 번호 (로그/응답용)
 * +821012345678 → +82 10-1234-****
 */
export function maskPhoneNumber(e164: string): string {
  if (!e164 || e164.length < 8) return e164;
  return e164.slice(0, e164.length - 4) + '****';
}

// ────────────────────────────────────────────────────────────────────────────
// 속도 제한 (인메모리)
// ────────────────────────────────────────────────────────────────────────────
type SendRecord = {
  lastSentAt: number;
  countToday: number;
  dayStartedAt: number;
};
type VerifyRecord = {
  attempts: number;
  windowStartedAt: number;
};

const SEND_COOLDOWN_MS = 60 * 1000; // 60초
const SEND_DAILY_LIMIT = 5; // 휴대폰당 1일 5회
const SEND_DAILY_LIMIT_PER_IP = 20; // IP당 1일 20회
const VERIFY_MAX_ATTEMPTS = 5; // 코드 검증 5회
const VERIFY_WINDOW_MS = 10 * 60 * 1000; // 10분 윈도우

const sendByPhone = new Map<string, SendRecord>();
const sendByIp = new Map<string, SendRecord>();
const verifyByPhone = new Map<string, VerifyRecord>();

function bumpSend(map: Map<string, SendRecord>, key: string, dailyLimit: number) {
  const now = Date.now();
  const rec = map.get(key);
  const oneDay = 24 * 60 * 60 * 1000;

  if (!rec) {
    map.set(key, { lastSentAt: now, countToday: 1, dayStartedAt: now });
    return;
  }
  if (now - rec.dayStartedAt > oneDay) {
    rec.dayStartedAt = now;
    rec.countToday = 0;
  }
  const sinceLast = now - rec.lastSentAt;
  if (sinceLast < SEND_COOLDOWN_MS) {
    throw new RateLimitError(
      `너무 자주 요청하셨습니다. ${Math.ceil((SEND_COOLDOWN_MS - sinceLast) / 1000)}초 후 다시 시도해주세요.`,
      Math.ceil((SEND_COOLDOWN_MS - sinceLast) / 1000),
    );
  }
  if (rec.countToday >= dailyLimit) {
    throw new RateLimitError(
      '오늘 인증번호 요청 한도를 초과했습니다. 내일 다시 시도해주세요.',
      Math.ceil((rec.dayStartedAt + oneDay - now) / 1000),
    );
  }
  rec.countToday += 1;
  rec.lastSentAt = now;
}

function checkVerifyLimit(phone: string) {
  const now = Date.now();
  const rec = verifyByPhone.get(phone);
  if (!rec || now - rec.windowStartedAt > VERIFY_WINDOW_MS) {
    verifyByPhone.set(phone, { attempts: 1, windowStartedAt: now });
    return;
  }
  if (rec.attempts >= VERIFY_MAX_ATTEMPTS) {
    throw new RateLimitError(
      '인증 시도 횟수를 초과했습니다. 잠시 후 새 인증번호를 받아 다시 시도해주세요.',
      Math.ceil((rec.windowStartedAt + VERIFY_WINDOW_MS - now) / 1000),
    );
  }
  rec.attempts += 1;
}

function clearVerifyLimit(phone: string) {
  verifyByPhone.delete(phone);
}

// ────────────────────────────────────────────────────────────────────────────
// Twilio API 호출
// ────────────────────────────────────────────────────────────────────────────
export async function sendVerificationCode(rawPhone: string, ip?: string) {
  const phone = normalizePhoneNumber(rawPhone);
  bumpSend(sendByPhone, phone, SEND_DAILY_LIMIT);
  if (ip) bumpSend(sendByIp, ip, SEND_DAILY_LIMIT_PER_IP);

  const client = getClient();
  const verification = await client.verify.v2
    .services(VERIFY_SERVICE_SID!)
    .verifications.create({ to: phone, channel: 'sms' });

  logger.info(
    `[PhoneVerify] OTP 발송 → ${maskPhoneNumber(phone)} status=${verification.status}`,
  );
  return { phone, status: verification.status };
}

/**
 * Twilio Verify 코드 검증.
 * 성공 시 짧은 수명(10분)의 서명 토큰을 발급해 가입/재설정 단계에서 재사용합니다.
 */
export async function verifyCode(rawPhone: string, code: string, purpose: 'register' | 'reset') {
  const phone = normalizePhoneNumber(rawPhone);
  if (!code || !/^\d{4,8}$/.test(String(code))) {
    throw new InvalidPhoneError('올바른 인증번호 형식이 아닙니다.');
  }
  checkVerifyLimit(phone);

  const client = getClient();
  const check = await client.verify.v2
    .services(VERIFY_SERVICE_SID!)
    .verificationChecks.create({ to: phone, code: String(code) });

  if (check.status !== 'approved') {
    logger.warn(
      `[PhoneVerify] 검증 실패 ${maskPhoneNumber(phone)} status=${check.status}`,
    );
    return { ok: false as const, status: check.status };
  }

  clearVerifyLimit(phone);
  const token = jwt.sign(
    { phone, purpose, kind: 'phone-verify' },
    PHONE_VERIFY_JWT_SECRET,
    { expiresIn: PHONE_VERIFY_TOKEN_TTL_SECONDS },
  );
  logger.info(`[PhoneVerify] OTP 검증 성공 ${maskPhoneNumber(phone)} purpose=${purpose}`);
  return { ok: true as const, phone, token };
}

/**
 * 가입/재설정 단계에서 클라이언트가 보내준 서명 토큰을 검증합니다.
 */
export function verifyPhoneToken(token: string, purpose: 'register' | 'reset'): string {
  if (!token) throw new Error('휴대폰 인증 토큰이 필요합니다.');
  const decoded = jwt.verify(token, PHONE_VERIFY_JWT_SECRET) as any;
  if (decoded.kind !== 'phone-verify' || decoded.purpose !== purpose || !decoded.phone) {
    throw new Error('휴대폰 인증 토큰이 유효하지 않습니다.');
  }
  return decoded.phone as string;
}

export function isTwilioConfigured(): boolean {
  return !!(ACCOUNT_SID && AUTH_TOKEN && VERIFY_SERVICE_SID);
}
