/**
 * phone-verification.ts
 * 휴대폰(SMS) 인증 라우트:
 *  - POST /api/auth/phone/send-code        가입용 OTP 발송
 *  - POST /api/auth/phone/verify-code      가입용 OTP 검증 → 토큰 발급
 *  - POST /api/auth/password-reset/send-code     재설정용 OTP 발송
 *  - POST /api/auth/password-reset/verify-code   재설정용 OTP 검증 → 토큰 발급
 *  - POST /api/auth/password-reset/confirm       토큰 + 새 비밀번호로 재설정 완료
 */
import { Router, Request, Response } from 'express';
import { storage } from '../storage';
import { hashPassword } from './local-auth';
import {
  ApiErrorCode,
  HTTP_STATUS,
  extendResponse,
} from '../middleware/api-standards';
import { logServerError } from '../middleware/audit-logger';
import {
  sendVerificationCode,
  verifyCode,
  verifyPhoneToken,
  normalizePhoneNumber,
  maskPhoneNumber,
  TwilioConfigError,
  RateLimitError,
  InvalidPhoneError,
  PHONE_VERIFY_TOKEN_TTL_SECONDS,
} from '../services/twilio-verify';

function getClientIp(req: Request): string {
  const fwd = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim();
  return fwd || req.ip || 'unknown';
}

function handleVerifyError(res: Response, error: unknown, action: string) {
  if (error instanceof RateLimitError) {
    return res.error(
      ApiErrorCode.VALIDATION_ERROR,
      error.message,
      { retryAfterSec: error.retryAfterSec },
      429,
    );
  }
  if (error instanceof InvalidPhoneError) {
    return res.error(ApiErrorCode.VALIDATION_ERROR, error.message);
  }
  if (error instanceof TwilioConfigError) {
    return res.error(
      ApiErrorCode.INTERNAL_SERVER_ERROR,
      error.message,
      { code: 'SMS_NOT_CONFIGURED' },
      HTTP_STATUS.SERVICE_UNAVAILABLE,
    );
  }
  // Twilio 인증/구성 오류 (잘못된 ACCOUNT_SID/AUTH_TOKEN/VERIFY_SERVICE_SID)
  const msg = (error as any)?.message || '';
  const status = (error as any)?.status;
  if (status === 401 || status === 403 || /Authentication Error|invalid username/i.test(msg)) {
    logServerError(`[PhoneVerify] Twilio 인증 실패:`, error);
    return res.error(
      ApiErrorCode.INTERNAL_SERVER_ERROR,
      'SMS 인증 서비스 자격 증명이 올바르지 않습니다. 관리자에게 문의해주세요.',
      { code: 'SMS_AUTH_FAILED' },
      HTTP_STATUS.SERVICE_UNAVAILABLE,
    );
  }
  if (status === 400 && /not a valid|not a mobile/i.test(msg)) {
    return res.error(
      ApiErrorCode.VALIDATION_ERROR,
      '입력하신 휴대폰 번호로는 SMS를 발송할 수 없습니다. 번호를 확인해주세요.',
    );
  }
  logServerError(`[PhoneVerify] ${action} 오류:`, error);
  return res.error(
    ApiErrorCode.INTERNAL_SERVER_ERROR,
    `${action} 처리 중 오류가 발생했습니다.`,
  );
}

export function setupPhoneVerificationRoutes(app: import('express').Express) {
  const router = Router();
  router.use(extendResponse);

  // ────────── 회원가입 OTP ──────────
  router.post('/phone/send-code', async (req, res) => {
    try {
      const { phoneNumber } = req.body ?? {};
      if (!phoneNumber) {
        return res.error(ApiErrorCode.MISSING_REQUIRED_FIELD, '휴대폰 번호를 입력해주세요.');
      }
      const phone = normalizePhoneNumber(phoneNumber);

      // 동일 번호로 이미 가입된 사용자가 있다면 차단 (이메일/비밀번호 가입 사용자만)
      const existing = await storage.getUserByPhoneNumber?.(phone);
      if (existing && !existing.provider) {
        return res.error(
          ApiErrorCode.RESOURCE_ALREADY_EXISTS,
          '이미 해당 휴대폰 번호로 가입된 계정이 있습니다. 로그인 또는 비밀번호 재설정을 이용해주세요.',
        );
      }

      const result = await sendVerificationCode(phone, getClientIp(req));
      return res.success(
        { phoneMasked: maskPhoneNumber(result.phone), status: result.status },
        '인증번호를 발송했습니다. 잠시 후 SMS를 확인해주세요.',
      );
    } catch (error) {
      return handleVerifyError(res, error, '인증번호 발송');
    }
  });

  router.post('/phone/verify-code', async (req, res) => {
    try {
      const { phoneNumber, code } = req.body ?? {};
      if (!phoneNumber || !code) {
        return res.error(ApiErrorCode.MISSING_REQUIRED_FIELD, '휴대폰 번호와 인증번호를 입력해주세요.');
      }
      const result = await verifyCode(phoneNumber, code, 'register');
      if (!result.ok) {
        return res.error(
          ApiErrorCode.VALIDATION_ERROR,
          '인증번호가 올바르지 않거나 만료되었습니다. 다시 시도해주세요.',
        );
      }
      return res.success(
        {
          phoneVerificationToken: result.token,
          expiresInSec: PHONE_VERIFY_TOKEN_TTL_SECONDS,
          phoneMasked: maskPhoneNumber(result.phone),
        },
        '휴대폰 인증이 완료되었습니다.',
      );
    } catch (error) {
      return handleVerifyError(res, error, '인증번호 검증');
    }
  });

  // ────────── 비밀번호 재설정 OTP ──────────
  router.post('/password-reset/send-code', async (req, res) => {
    try {
      const { email, phoneNumber } = req.body ?? {};
      if (!email && !phoneNumber) {
        return res.error(
          ApiErrorCode.MISSING_REQUIRED_FIELD,
          '이메일 또는 휴대폰 번호를 입력해주세요.',
        );
      }

      // 사용자 식별: 이메일 우선, 그다음 번호
      let user: any = null;
      if (email) user = await storage.getUserByUsername(email);
      let phone: string | null = null;

      if (phoneNumber) {
        phone = normalizePhoneNumber(phoneNumber);
        if (!user) user = await storage.getUserByPhoneNumber?.(phone);
      } else if (user) {
        try {
          phone = user.phoneNumber ? normalizePhoneNumber(user.phoneNumber) : null;
        } catch {
          phone = null;
        }
      }

      // 보안상, 사용자 존재 여부와 무관하게 동일 응답을 주되 SMS는 가능한 경우만 발송
      if (user?.provider) {
        return res.success(
          { sent: false },
          '소셜 로그인 계정은 해당 소셜 서비스(카카오/네이버/구글)에서 로그인해주세요.',
        );
      }
      if (!user || !phone) {
        return res.success(
          { sent: false },
          '입력하신 정보로 가입된 계정이 있다면 SMS로 인증번호가 발송됩니다.',
        );
      }

      const result = await sendVerificationCode(phone, getClientIp(req));
      return res.success(
        { sent: true, phoneMasked: maskPhoneNumber(result.phone) },
        '등록된 휴대폰으로 인증번호를 발송했습니다.',
      );
    } catch (error) {
      return handleVerifyError(res, error, '비밀번호 재설정 인증번호 발송');
    }
  });

  router.post('/password-reset/verify-code', async (req, res) => {
    try {
      const { phoneNumber, code } = req.body ?? {};
      if (!phoneNumber || !code) {
        return res.error(ApiErrorCode.MISSING_REQUIRED_FIELD, '휴대폰 번호와 인증번호를 입력해주세요.');
      }
      const result = await verifyCode(phoneNumber, code, 'reset');
      if (!result.ok) {
        return res.error(
          ApiErrorCode.VALIDATION_ERROR,
          '인증번호가 올바르지 않거나 만료되었습니다. 다시 시도해주세요.',
        );
      }
      const user = await storage.getUserByPhoneNumber?.(result.phone);
      if (!user || user.provider) {
        return res.error(
          ApiErrorCode.RESOURCE_NOT_FOUND,
          '해당 휴대폰 번호로 가입된 계정을 찾을 수 없습니다.',
        );
      }
      return res.success(
        {
          resetToken: result.token,
          expiresInSec: PHONE_VERIFY_TOKEN_TTL_SECONDS,
          username: user.username,
        },
        '휴대폰 인증이 완료되었습니다. 새 비밀번호를 설정해주세요.',
      );
    } catch (error) {
      return handleVerifyError(res, error, '비밀번호 재설정 인증번호 검증');
    }
  });

  router.post('/password-reset/confirm', async (req, res) => {
    try {
      const { resetToken, newPassword } = req.body ?? {};
      if (!resetToken || !newPassword) {
        return res.error(ApiErrorCode.MISSING_REQUIRED_FIELD, '인증 토큰과 새 비밀번호를 입력해주세요.');
      }
      if (newPassword.length < 6) {
        return res.error(ApiErrorCode.VALIDATION_ERROR, '비밀번호는 6자 이상이어야 합니다.');
      }
      let phone: string;
      try {
        phone = verifyPhoneToken(resetToken, 'reset');
      } catch {
        return res.error(
          ApiErrorCode.VALIDATION_ERROR,
          '인증 토큰이 만료되었습니다. 다시 인증을 진행해주세요.',
        );
      }
      const user = await storage.getUserByPhoneNumber?.(phone);
      if (!user || user.provider) {
        return res.error(
          ApiErrorCode.RESOURCE_NOT_FOUND,
          '해당 사용자를 찾을 수 없습니다.',
        );
      }
      const hashed = await hashPassword(newPassword);
      await storage.updateUserPassword?.(user.id, hashed);
      return res.success({ ok: true }, '비밀번호가 성공적으로 재설정되었습니다.');
    } catch (error) {
      return handleVerifyError(res, error, '비밀번호 재설정');
    }
  });

  app.use('/api/auth', router);
  console.log('[Auth] 휴대폰 인증 라우트 등록 완료');
}
