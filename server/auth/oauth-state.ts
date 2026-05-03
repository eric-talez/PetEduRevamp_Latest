import crypto from 'crypto';
import type { Request, Response } from 'express';

export type OAuthStateProvider = 'kakao' | 'naver';

/**
 * OAuth state(CSRF) 보호용 토큰 생성
 */
export function generateOAuthState(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * 세션에 저장된 OAuth state와 콜백 query.state를 비교해 검증합니다.
 * 검증 후에는 세션 값을 제거하여 재사용을 방지합니다.
 * 일치하지 않으면 실패 리다이렉트로 응답합니다.
 */
export function verifyOAuthState(
  provider: OAuthStateProvider,
  req: Request,
  res: Response,
): boolean {
  const queryState = typeof req.query.state === 'string' ? req.query.state : '';
  const sessionState = req.session?.oauthState?.[provider];

  if (req.session?.oauthState) {
    delete req.session.oauthState[provider];
  }

  if (
    !sessionState ||
    !queryState ||
    sessionState.length !== queryState.length ||
    !crypto.timingSafeEqual(Buffer.from(sessionState), Buffer.from(queryState))
  ) {
    console.warn(`[SocialAuth] ${provider} OAuth state 불일치 - CSRF 가능성 있음`);
    res.redirect('/auth?error=invalid-state');
    return false;
  }
  return true;
}
