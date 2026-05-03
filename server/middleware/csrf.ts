/**
 * csrf.ts
 * Modern CSRF protection implementation
 * Replaces deprecated csurf package with custom secure solution
 */
import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { logServerError } from './audit-logger';

// CSRF 토큰 생성
export function generateCSRFToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// CSRF 토큰 검증 (안전한 파싱 with try/catch)
export function verifyCSRFToken(token: string, sessionToken: string): boolean {
  if (!token || !sessionToken) return false;
  
  try {
    // 토큰이 유효한 hex 문자열인지 확인
    if (!/^[0-9a-fA-F]+$/.test(token) || !/^[0-9a-fA-F]+$/.test(sessionToken)) {
      return false;
    }
    
    // 토큰 길이가 같지 않으면 false
    if (token.length !== sessionToken.length) {
      return false;
    }
    
    const tokenBuffer = Buffer.from(token, 'hex');
    const sessionBuffer = Buffer.from(sessionToken, 'hex');
    
    return crypto.timingSafeEqual(tokenBuffer, sessionBuffer);
  } catch (error) {
    logServerError('CSRF 토큰 검증 오류:', error);
    return false;
  }
}

// CSRF 토큰 미들웨어
export function csrfProtection(req: Request, res: Response, next: NextFunction) {
  // GET, HEAD, OPTIONS 요청은 CSRF 보호 제외
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // 세션에 CSRF 토큰이 없으면 생성
  if (!req.session.csrfToken) {
    req.session.csrfToken = generateCSRFToken();
  }

  // 요청에서 CSRF 토큰 추출
  const token = req.headers['x-csrf-token'] || 
                req.body._csrf || 
                req.query._csrf;

  // 토큰 검증
  if (!verifyCSRFToken(token as string, req.session.csrfToken)) {
    return res.status(403).json({
      success: false,
      message: 'CSRF 토큰이 유효하지 않습니다.',
      code: 'INVALID_CSRF_TOKEN'
    });
  }

  next();
}

// CSRF 토큰 조회 엔드포인트
export function getCSRFToken(req: Request, res: Response) {
  // 세션에 CSRF 토큰이 없으면 생성
  if (!req.session.csrfToken) {
    req.session.csrfToken = generateCSRFToken();
  }

  res.json({
    csrfToken: req.session.csrfToken
  });
}

// Express session 타입 확장
declare module 'express-session' {
  interface SessionData {
    csrfToken?: string;
  }
}