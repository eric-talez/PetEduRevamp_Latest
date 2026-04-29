import { Strategy as KakaoStrategy } from 'passport-kakao';
import { Strategy as NaverStrategy } from 'passport-naver';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { UserRole } from '@shared/schema';
import { storage } from '../storage';
import { Express, Request, Response, NextFunction } from 'express';
import passport from 'passport';

/**
 * 현재 환경의 공개 도메인을 반환합니다.
 * 우선순위: OAUTH_CALLBACK_BASE_URL > REPLIT_DEV_DOMAIN > REPLIT_DOMAINS(첫 항목)
 */
function getPublicBaseUrl(): string | null {
  if (process.env.OAUTH_CALLBACK_BASE_URL) {
    return process.env.OAUTH_CALLBACK_BASE_URL.replace(/\/+$/, '');
  }
  if (process.env.REPLIT_DEV_DOMAIN) {
    return `https://${process.env.REPLIT_DEV_DOMAIN}`;
  }
  if (process.env.REPLIT_DOMAINS) {
    const first = process.env.REPLIT_DOMAINS.split(',')[0]?.trim();
    if (first) return `https://${first}`;
  }
  return null;
}

function buildCallbackUrl(path: string): string {
  const base = getPublicBaseUrl();
  return base ? `${base}${path}` : path;
}

/**
 * 요청에서 실제 사용된 호스트를 감지하여 콜백 URL을 동적으로 생성합니다.
 * 사용자가 실제로 접속한 도메인(hitalez.com 등)을 그대로 사용해
 * Google/Kakao/Naver의 redirect_uri 검증을 통과합니다.
 * 우선순위: OAUTH_CALLBACK_BASE_URL(명시적 강제) > 요청 호스트 > 환경 변수 fallback
 */
function getDynamicCallbackUrl(req: Request, path: string): string {
  if (process.env.OAUTH_CALLBACK_BASE_URL) {
    return `${process.env.OAUTH_CALLBACK_BASE_URL.replace(/\/+$/, '')}${path}`;
  }
  const forwardedProto = (req.headers['x-forwarded-proto'] as string)?.split(',')[0]?.trim();
  const forwardedHost = (req.headers['x-forwarded-host'] as string)?.split(',')[0]?.trim();
  const protocol = forwardedProto || req.protocol || 'https';
  const host = forwardedHost || req.get('host');
  if (host) {
    return `${protocol}://${host}${path}`;
  }
  return buildCallbackUrl(path);
}

/**
 * 소셜 로그인 전략 설정
 */
export function setupSocialAuth(app: Express) {
  // 카카오 로그인 전략 설정
  if (process.env.KAKAO_CLIENT_ID) {
    passport.use(
      new KakaoStrategy(
        {
          clientID: process.env.KAKAO_CLIENT_ID,
          callbackURL: buildCallbackUrl('/api/auth/kakao/callback'),
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            // profile.id는 카카오에서 제공하는 고유 ID입니다
            const kakaoId = profile.id;
            const email = profile._json?.kakao_account?.email || '';
            const nickname = profile.displayName || profile._json?.properties?.nickname || '';
            
            console.log('카카오 로그인 정보:', { kakaoId, email, nickname });
            
            // 기존 사용자 확인 (소셜 ID로)
            let user = await storage.getUserBySocialId('kakao', kakaoId);
            
            if (!user) {
              // 신규 사용자: 회원가입 페이지로 리다이렉트하기 위해 빈 객체 반환
              console.log('[SocialAuth] 신규 카카오 사용자 - 회원가입 페이지로 리다이렉트');
              return done(null, {
                isNewUser: true,
                provider: 'kakao',
                socialId: kakaoId,
                email: email,
                name: nickname
              } as any);
            } else {
              console.log('기존 사용자 확인:', user.id);
              return done(null, user);
            }
          } catch (error) {
            console.error('카카오 로그인 오류:', error);
            return done(error as Error);
          }
        }
      )
    );
    
    // 카카오 로그인 라우트 (동적 콜백 URL 사용)
    app.get('/api/auth/kakao', (req, res, next) => {
      const callbackURL = getDynamicCallbackUrl(req, '/api/auth/kakao/callback');
      passport.authenticate('kakao', { callbackURL } as any)(req, res, next);
    });
    
    // 카카오 로그인 콜백 라우트 (동적 콜백 URL 사용)
    app.get(
      '/api/auth/kakao/callback',
      (req, res, next) => {
        const callbackURL = getDynamicCallbackUrl(req, '/api/auth/kakao/callback');
        passport.authenticate('kakao', {
          failureRedirect: '/auth?error=social-login-failed',
          callbackURL,
        } as any)(req, res, next);
      },
      (req, res) => {
        const user = req.user as any;
        
        // 신규 사용자인 경우 회원가입 페이지로 리다이렉트
        if (user && user.isNewUser) {
          // 소셜 로그인 정보를 세션에 저장
          req.session.socialSignup = {
            provider: user.provider,
            socialId: user.socialId,
            email: user.email,
            name: user.name
          };
          
          console.log('세션에 카카오 가입 정보 저장:', req.session.socialSignup);
          
          // 회원가입 페이지로 리다이렉트
          return res.redirect('/auth/register?social=kakao');
        }
        
        // 기존 사용자는 대시보드로 리다이렉트
        res.redirect('/dashboard');
      }
    );
    
    console.log('[SocialAuth] 카카오 로그인 설정 완료');
  } else {
    console.warn('[SocialAuth] KAKAO_CLIENT_ID가 설정되지 않아 카카오 로그인 기능이 비활성화됩니다.');
  }
  
  // 네이버 로그인 전략 설정
  if (process.env.NAVER_CLIENT_ID && process.env.NAVER_CLIENT_SECRET) {
    passport.use(
      new NaverStrategy(
        {
          clientID: process.env.NAVER_CLIENT_ID,
          clientSecret: process.env.NAVER_CLIENT_SECRET,
          callbackURL: buildCallbackUrl('/api/auth/naver/callback'),
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            // profile.id는 네이버에서 제공하는 고유 ID입니다
            const naverId = profile.id;
            const email = profile._json?.email || '';
            const nickname = profile.displayName || profile._json?.nickname || '';
            const mobile = profile._json?.mobile || '';
            const birthyear = profile._json?.birthyear || '';
            const birthday = profile._json?.birthday || '';
            const gender = profile._json?.gender || '';
            
            console.log('네이버 로그인 정보:', { naverId, email, nickname, mobile });
            
            // 기존 사용자 확인 (소셜 ID로)
            let user = await storage.getUserBySocialId('naver', naverId);
            
            if (!user) {
              // 신규 사용자 - 회원가입 페이지로 리다이렉트하기 위해 정보만 반환
              console.log('신규 네이버 사용자 - 회원가입 페이지로 이동');
              return done(null, {
                isNewUser: true,
                provider: 'naver',
                socialId: naverId,
                email: email,
                name: nickname,
                mobile: mobile,
                birthyear: birthyear,
                birthday: birthday,
                gender: gender === 'M' ? 'male' : gender === 'F' ? 'female' : ''
              } as any);
            } else {
              console.log('기존 사용자 확인:', user.id);
              return done(null, user);
            }
          } catch (error) {
            console.error('네이버 로그인 오류:', error);
            return done(error as Error);
          }
        }
      )
    );
    
    // 네이버 로그인 라우트 (동적 콜백 URL 사용)
    app.get('/api/auth/naver', (req, res, next) => {
      const callbackURL = getDynamicCallbackUrl(req, '/api/auth/naver/callback');
      passport.authenticate('naver', { callbackURL } as any)(req, res, next);
    });
    
    // 네이버 로그인 콜백 라우트 (동적 콜백 URL 사용)
    app.get(
      '/api/auth/naver/callback',
      (req, res, next) => {
        const callbackURL = getDynamicCallbackUrl(req, '/api/auth/naver/callback');
        passport.authenticate('naver', {
          failureRedirect: '/auth?error=social-login-failed',
          callbackURL,
        } as any)(req, res, next);
      },
      (req, res) => {
        const user = req.user as any;
        
        // 신규 사용자인 경우 회원가입 페이지로 리다이렉트
        if (user && user.isNewUser) {
          // 소셜 로그인 정보를 세션에 저장
          req.session.socialSignup = {
            provider: user.provider,
            socialId: user.socialId,
            email: user.email,
            name: user.name,
            mobile: user.mobile,
            birthyear: user.birthyear,
            birthday: user.birthday,
            gender: user.gender
          };
          
          console.log('세션에 소셜 가입 정보 저장:', req.session.socialSignup);
          
          // 회원가입 페이지로 리다이렉트
          return res.redirect('/auth/register?social=naver');
        }
        
        // 기존 사용자는 대시보드로 리다이렉트
        res.redirect('/dashboard');
      }
    );
    
    console.log('[SocialAuth] 네이버 로그인 설정 완료');
  } else {
    console.warn('[SocialAuth] NAVER_CLIENT_ID 또는 NAVER_CLIENT_SECRET이 설정되지 않아 네이버 로그인 기능이 비활성화됩니다.');
  }
  
  // 구글 로그인 전략 설정
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          callbackURL: buildCallbackUrl('/api/auth/google/callback'),
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            // profile.id는 구글에서 제공하는 고유 ID입니다
            const googleId = profile.id;
            const email = profile.emails?.[0]?.value || '';
            const name = profile.displayName || '';
            
            console.log('구글 로그인 정보:', { googleId, email, name });
            
            // 기존 사용자 확인 (소셜 ID로)
            let user = await storage.getUserBySocialId('google', googleId);
            
            if (!user) {
              // 신규 사용자: 회원가입 페이지로 리다이렉트하기 위해 빈 객체 반환
              console.log('[SocialAuth] 신규 구글 사용자 - 회원가입 페이지로 리다이렉트');
              return done(null, {
                isNewUser: true,
                provider: 'google',
                socialId: googleId,
                email: email,
                name: name
              } as any);
            } else {
              console.log('기존 사용자 확인:', user.id);
              return done(null, user);
            }
          } catch (error) {
            console.error('구글 로그인 오류:', error);
            return done(error as Error);
          }
        }
      )
    );
    
    // 구글 로그인 라우트 (state CSRF 보호 + 동적 콜백 URL 사용)
    app.get('/api/auth/google', (req, res, next) => {
      const callbackURL = getDynamicCallbackUrl(req, '/api/auth/google/callback');
      passport.authenticate('google', {
        scope: ['profile', 'email'],
        state: true,
        callbackURL,
      } as any)(req, res, next);
    });
    
    // 구글 로그인 콜백 라우트 (동적 콜백 URL 사용)
    app.get(
      '/api/auth/google/callback',
      (req, res, next) => {
        const callbackURL = getDynamicCallbackUrl(req, '/api/auth/google/callback');
        passport.authenticate('google', {
          failureRedirect: '/auth?error=social-login-failed',
          state: true,
          callbackURL,
        } as any)(req, res, next);
      },
      (req, res) => {
        const user = req.user as any;
        
        // 신규 사용자인 경우 회원가입 페이지로 리다이렉트
        if (user && user.isNewUser) {
          // 소셜 로그인 정보를 세션에 저장
          req.session.socialSignup = {
            provider: user.provider,
            socialId: user.socialId,
            email: user.email,
            name: user.name
          };
          
          console.log('세션에 구글 가입 정보 저장:', req.session.socialSignup);
          
          // 회원가입 페이지로 리다이렉트
          return res.redirect('/auth/register?social=google');
        }
        
        // 기존 사용자는 대시보드로 리다이렉트
        res.redirect('/dashboard');
      }
    );
    
    console.log('[SocialAuth] 구글 로그인 설정 완료');
  } else {
    console.warn('[SocialAuth] GOOGLE_CLIENT_ID 또는 GOOGLE_CLIENT_SECRET이 설정되지 않아 구글 로그인 기능이 비활성화됩니다.');
  }
  
  // 소셜 로그인 정보를 세션에 추가하는 미들웨어
  app.use((req, res, next) => {
    if (req.isAuthenticated() && req.user) {
      // 소셜 로그인 정보가 있으면 세션에 추가
      if (req.user.provider && req.user.socialId) {
        // @ts-ignore
        req.session.social = {
          provider: req.user.provider,
          socialId: req.user.socialId
        };
      }
    }
    next();
  });
}