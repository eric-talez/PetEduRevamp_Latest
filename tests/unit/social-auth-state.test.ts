import { generateOAuthState, verifyOAuthState } from '../../server/auth/oauth-state';

function makeReq(sessionState: string | undefined, queryState: string | undefined) {
  return {
    session: sessionState !== undefined
      ? { oauthState: { kakao: sessionState } }
      : {},
    query: queryState !== undefined ? { state: queryState } : {},
  } as any;
}

function makeRes() {
  const res: any = { redirected: null };
  res.redirect = (url: string) => { res.redirected = url; };
  return res;
}

describe('OAuth state CSRF 보호', () => {
  describe('generateOAuthState', () => {
    it('충분히 긴 임의의 문자열을 생성해야 함', () => {
      const a = generateOAuthState();
      const b = generateOAuthState();
      expect(a).toHaveLength(64);
      expect(b).toHaveLength(64);
      expect(a).not.toEqual(b);
    });
  });

  describe('verifyOAuthState', () => {
    it('세션과 query state가 일치하면 true를 반환하고 세션 값은 1회용으로 삭제되어야 함', () => {
      const state = generateOAuthState();
      const req = makeReq(state, state);
      const res = makeRes();
      expect(verifyOAuthState('kakao', req, res)).toBe(true);
      expect(res.redirected).toBeNull();
      expect(req.session.oauthState.kakao).toBeUndefined();
    });

    it('state가 위·변조되어 일치하지 않으면 false 반환과 실패 리다이렉트가 일어나야 함', () => {
      const state = generateOAuthState();
      const req = makeReq(state, generateOAuthState());
      const res = makeRes();
      expect(verifyOAuthState('kakao', req, res)).toBe(false);
      expect(res.redirected).toBe('/auth?error=invalid-state');
      expect(req.session.oauthState.kakao).toBeUndefined();
    });

    it('세션에 state가 없으면 거부되어야 함 (세션 고정/재사용 방어)', () => {
      const req = makeReq(undefined, generateOAuthState());
      const res = makeRes();
      expect(verifyOAuthState('kakao', req, res)).toBe(false);
      expect(res.redirected).toBe('/auth?error=invalid-state');
    });

    it('query에 state가 없으면 거부되어야 함', () => {
      const state = generateOAuthState();
      const req = makeReq(state, undefined);
      const res = makeRes();
      expect(verifyOAuthState('kakao', req, res)).toBe(false);
      expect(res.redirected).toBe('/auth?error=invalid-state');
    });

    it('길이가 다른 state는 timingSafeEqual 호출 전 거부되어야 함', () => {
      const req = makeReq('short', 'much-longer-state-value-xxxxxxxx');
      const res = makeRes();
      expect(verifyOAuthState('kakao', req, res)).toBe(false);
      expect(res.redirected).toBe('/auth?error=invalid-state');
    });
  });
});
