// 환경 변수 먼저 로드
import dotenv from 'dotenv';
import { logger } from './monitoring/logger';
dotenv.config();

import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { registerAIProxyRoutes } from "./routes/ai-proxy";
import { registerAdminAIRoutes } from "./routes/admin-ai";
import { registerEnhancedAnalysisRoutes } from "./routes/enhanced-analysis";
import { registerMediaAnalysisRoutes } from "./routes/ai-media";
import { registerExperienceRoutes } from "./routes/experience";
import { registerInstituteRoutes } from "./institutes/routes";
import { setupVite, serveStatic } from "./vite";
import { storage } from "./storage";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import passport from "passport";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";
import { setupPerformance } from "./performance";
import { registerAdminRoutes } from "./routes/admin";
import { registerPaymentIntegrationRoutes } from "./routes/payment-integration";
import { setupAuth } from "./auth";
import { activitySessionMiddleware, ensureUserSessionsSchema, startUserSessionCleanupScheduler } from "./auth/session-manager";
import { extendResponse } from "./middleware/api-standards";
import { errorHandler, notFoundHandler } from "./middleware/error-handler";
import { requestContextMiddleware, logServerError } from './middleware/audit-logger';
import { closeDatabasePool } from "./db";
import path from 'path'; // path 모듈 추가
import locationRoutes from './location/routes';
import { registerEventRoutes } from './events/routes';
import aiLocationCrawlerRoutes from './routes/ai-location-crawler';

const app = express();
const PORT = parseInt(process.env.PORT || "5000", 10);
const HOST = process.env.HOST || "0.0.0.0";

// 필수 환경 변수 확인 (프로덕션에서는 JWT_SECRET 필수)
const isProductionEnv = process.env.NODE_ENV === 'production';
const requiredEnvVars = isProductionEnv 
  ? ['DATABASE_URL', 'SESSION_SECRET', 'JWT_SECRET']
  : ['DATABASE_URL', 'SESSION_SECRET'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  logServerError('❌ 필수 환경 변수 누락:', missingEnvVars.join(', '));
  logger.error('Replit Secrets에서 다음 변수들을 설정해주세요:');
  missingEnvVars.forEach(varName => logger.error(`  - ${varName}`));
  process.exit(1);
}

// Google Maps API Key 확인 (선택사항, 경고만 표시)
if (!process.env.GOOGLE_MAPS_API_KEY && !process.env.VITE_GOOGLE_MAPS_API_KEY) {
  console.warn('⚠️ GOOGLE_MAPS_API_KEY 또는 VITE_GOOGLE_MAPS_API_KEY가 설정되지 않았습니다.');
  console.warn('   지도 기능이 제한될 수 있습니다.');
}


// Production proxy compatibility - CRITICAL for production deployment
app.set('trust proxy', 1);

// CSP 설정: 개발 환경에서는 비활성화, 프로덕션에서는 필요한 소스만 허용
if (process.env.NODE_ENV === 'production') {
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        // Google Maps API: 스크립트 및 인라인 스크립트 허용
        scriptSrc: [
          "'self'", 
          "'unsafe-inline'",
          "'unsafe-eval'",
          "https://maps.googleapis.com",
          "https://maps.gstatic.com",
          "https://*.googleapis.com"
        ],
        // Google Maps: 이미지 및 타일
        imgSrc: [
          "'self'", 
          "data:", 
          "https:", 
          "https://maps.googleapis.com",
          "https://maps.gstatic.com",
          "https://*.googleapis.com",
          "https://*.gstatic.com"
        ],
        // Google Maps API 연결
        connectSrc: [
          "'self'", 
          "ws:", 
          "wss:", 
          "https://maps.googleapis.com",
          "https://*.googleapis.com"
        ],
        frameSrc: ["'self'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        upgradeInsecureRequests: [],
      },
    },
  }));
} else {
  // 개발 환경: 기본 Helmet만 사용 (CSP 비활성화)
  app.use(helmet({
    contentSecurityPolicy: false
  }));
}

// CORS 설정 개선
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? [
      'https://hitalez.com',
      'https://www.hitalez.com',
      'https://funnytalez.com',
      'https://www.funnytalez.com',
      'https://*.replit.app',
      'https://*.replit.dev',
      'https://*.repl.co'
    ]
  : [
      'http://localhost:3000',
      'http://localhost:5000',
      'http://localhost:5173',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5000',
      'http://127.0.0.1:5173',
      'https://localhost:3000',
      'https://localhost:5173',
      'https://*.replit.dev',
      'https://*.repl.co',
      'https://*.replit.app'
    ];

app.use(cors({
  origin: function(origin, callback) {
    // 개발 환경에서는 origin이 없을 수 있음 (같은 도메인)
    if (!origin && process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }

    // 허용된 origin 목록 체크
    const isAllowed = allowedOrigins.some(allowedOrigin => {
      if (allowedOrigin.includes('*')) {
        const pattern = allowedOrigin.replace(/\*/g, '.*');
        return new RegExp(pattern).test(origin || '');
      }
      return allowedOrigin === origin;
    });

    if (isAllowed || !origin) {
      callback(null, true);
    } else {
      console.warn(`CORS 차단된 origin: ${origin}`);
      callback(new Error('CORS policy violation'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'Accept', 'Origin', 'X-Requested-With'],
  preflightContinue: false,
  optionsSuccessStatus: 200
}));

// 운영 환경 보안 헤더
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    // Google Maps API에서 지오로케이션 사용을 허용하도록 수정
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=(), interest-cohort=()');
    next();
  });
}

// =============================================================================
// Rate Limiters (개발 환경에서도 활성화하여 코드 경로 검증)
// =============================================================================
const isProdRL = process.env.NODE_ENV === 'production';

// 정적 자산 (대용량 업/다운로드 남용 방지)
const staticAssetLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: isProdRL ? 300 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 'STATIC_RATE_LIMIT', message: '정적 자산 요청이 너무 많습니다.' },
    meta: { timestamp: new Date().toISOString() }
  }
});

// AI/분석 등 고비용 엔드포인트
const aiHeavyLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: isProdRL ? 20 : 60,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: any) => req.session?.user?.id || req.ip,
  message: {
    success: false,
    error: { code: 'AI_RATE_LIMIT', message: 'AI 요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.' },
    meta: { timestamp: new Date().toISOString() }
  }
});

// (AI 라우트용 limiter 는 세션/인증 미들웨어 이후에 적용 — 아래 setupAuth 직후 등록됨)

// 정적 자산 limiter 후 정적 서빙
app.use('/uploads', staticAssetLimiter, express.static('uploads'));

// 레거시 정적 쇼핑 HTML → React SPA 리다이렉트 (정적 서빙 이전에 처리)
const legacyShopRedirects: Record<string, string> = {
  '/shop.html': '/shop',
  '/checkout.html': '/shop/checkout',
  '/product-detail.html': '/shop',
  '/category.html': '/shop',
  '/naver-style-shop.html': '/shop',
  '/price-alert.html': '/shop',
};
for (const [from, to] of Object.entries(legacyShopRedirects)) {
  app.get(from, (req, res) => {
    const qs = req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '';
    res.redirect(301, `${to}${qs}`);
  });
}

// 로고 및 기타 정적 파일 제공
app.use(express.static('public'));

// 로그인 엔드포인트 보안 강화를 위한 레이트 리미터
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15분
  max: 5, // 15분 동안 최대 5회 로그인 시도
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_LOGIN_ATTEMPTS',
      message: '너무 많은 로그인 시도입니다. 15분 후 다시 시도해주세요.'
    },
    meta: {
      timestamp: new Date().toISOString()
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true
});

// 로그인 엔드포인트에만 적용
app.use('/api/auth/login', loginLimiter);

// 일반 API 레이트 리미터 - 운영/개발 모두 활성화 (개발은 완화 값)
const generalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProdRL ? 300 : 2000,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 'API_RATE_LIMIT', message: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' },
    meta: { timestamp: new Date().toISOString() }
  }
});
app.use('/api/', generalApiLimiter);

// 성능 최적화 설정 (압축, 캐시, 모니터링)
setupPerformance(app);

// Body parsing middleware
app.use(express.json({
  limit: '10mb',
  verify: (req: any, _res, buf) => {
    if (req.url && req.url.startsWith('/api/stripe/')) {
      req.rawBody = buf;
    }
  },
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static file serving for images and assets (BEFORE Vite middleware)
app.use('/images', staticAssetLimiter, express.static('public/images'));
app.use('/assets', staticAssetLimiter, express.static('public/assets'));
app.use('/uploads', staticAssetLimiter, express.static('public/uploads'));
app.use('/attached_assets', staticAssetLimiter, express.static('attached_assets'));

// 로고 파일 직접 제공
app.get('/logo.svg', (req, res) => {
  res.sendFile('logo.svg', { root: 'public' });
});

app.get('/logo-compact.svg', (req, res) => {
  res.sendFile('logo-compact.svg', { root: 'public' });
});

app.get('/favicon.svg', (req, res) => {
  res.sendFile('favicon.svg', { root: 'public' });
});

// 첨부 파일 이미지 직접 제공
app.get('/attached_assets/:filename', (req, res) => {
  const filename = req.params.filename;

  try {
    // 적절한 Content-Type 설정
    if (filename.endsWith('.png')) {
      res.setHeader('Content-Type', 'image/png');
    } else if (filename.endsWith('.jpg') || filename.endsWith('.jpeg')) {
      res.setHeader('Content-Type', 'image/jpeg');
    } else if (filename.endsWith('.svg')) {
      res.setHeader('Content-Type', 'image/svg+xml');
    }

    res.sendFile(filename, { root: 'attached_assets' });
  } catch (error) {
    logServerError('첨부 파일 제공 오류:', error, req);
    res.status(404).send('File not found');
  }
});

// 세션 설정 - PostgreSQL 세션 저장소 사용 (서버 재시작해도 세션 유지)
const isProduction = process.env.NODE_ENV === 'production';
const PgSession = connectPgSimple(session);

// PostgreSQL 세션 저장소 설정
const pgSessionStore = new PgSession({
  conString: process.env.DATABASE_URL,
  tableName: 'session', // 세션 테이블 이름
  createTableIfMissing: true, // 테이블 자동 생성
  pruneSessionInterval: 60 * 15, // 15분마다 만료된 세션 정리
  errorLog: console.error.bind(console)
});

const sessionConfig: session.SessionOptions = {
  store: pgSessionStore,
  secret: process.env.SESSION_SECRET || 'talez-super-secure-session-secret-2025-production-ready',
  resave: false,
  saveUninitialized: false,
  name: 'talez.sid', // 기본 세션 이름 변경으로 보안 강화
  cookie: {
    secure: isProduction, // HTTPS에서만 secure 쿠키
    httpOnly: true,
    sameSite: isProduction ? 'none' as const : 'lax' as const, // 프로덕션에서는 크로스사이트 허용
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    // 도메인 설정 (같은 2차 도메인 사용 시)
    ...(isProduction && process.env.COOKIE_DOMAIN && {
      domain: process.env.COOKIE_DOMAIN
    })
  }
};

console.log('✅ PostgreSQL 세션 저장소 초기화 완료');

// 세션 미들웨어를 먼저 설정
app.use(session(sessionConfig));

// Passport initialization
app.use(passport.initialize());
app.use(passport.session());

// Session to req.user middleware - MUST run before auth routes
app.use((req: any, res: any, next: any) => {
  try {
    if (req.session?.user && !req.user) {
      req.user = req.session.user;
    }
    next();
  } catch (error) {
    logServerError('Session middleware error:', error, req);
    next();
  }
});

// API 표준화 미들웨어 적용 - Response 객체에 표준 메서드 추가
app.use(extendResponse);

// 요청 컨텍스트(요청 ID) 미들웨어 - 모든 로그/감사 기록에 요청 ID 포함
app.use(requestContextMiddleware);

// 세션 활동 추적 / 자동 로그아웃 미들웨어
// (express-session + passport.session 이후, 모든 /api 라우트(인증 포함)에 적용)
app.use('/api', activitySessionMiddleware);

// user_sessions 테이블 존재 확인 (없으면 생성, 검증 실패 시 startup 중단)
ensureUserSessionsSchema()
  .then(() => {
    // 만료/폐기 후 7일 지난 세션 행을 매일 정리
    startUserSessionCleanupScheduler({
      intervalMs: 24 * 60 * 60 * 1000,
      retentionDays: 7,
    });
  })
  .catch((err) => {
    logServerError('[Startup] user_sessions 스키마 보장 실패:', err);
    process.exit(1);
  });

// Setup authentication system
setupAuth(app);

// AI 고비용 라우트 limiter — 세션/인증 미들웨어 이후에 등록되어야
// keyGenerator 가 로그인 사용자 ID 를 정확히 사용함 (비로그인은 IP 폴백)
app.use('/api/ai-proxy', aiHeavyLimiter);
app.use('/api/ai', aiHeavyLimiter);
app.use('/api/ai-fix', aiHeavyLimiter);
app.use('/api/enhanced-analysis', aiHeavyLimiter);
app.use('/api/dog-ai-analysis', aiHeavyLimiter);
app.use('/api/admin/ai', aiHeavyLimiter);

// REMOVED: Critical security fix - these endpoints have been moved to routes.ts with proper authentication

// 인증 관련 라우트는 setupAuth()에서 처리됨
// /api/auth/login, /api/auth/register, /api/auth/logout, /api/auth/me

// Graceful shutdown handling - HTTP 서버 close 후 DB 풀 정리
let httpServerRef: import('http').Server | null = null;
let isShuttingDown = false;

async function gracefulShutdown(signal: string, exitCode: number = 0) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`👋 ${signal} received, shutting down gracefully...`);

  // 강제 종료 안전장치 (25초) — close 가 멈춰도 반드시 종료
  const forceExit = setTimeout(() => {
    logger.error('⛔ Graceful shutdown timeout, forcing exit');
    process.exit(exitCode === 0 ? 1 : exitCode);
  }, 25_000);
  forceExit.unref();

  try {
    if (httpServerRef) {
      await new Promise<void>((resolve) => {
        httpServerRef!.close((err) => {
          if (err) logServerError('HTTP server close error:', err);
          else console.log('✅ HTTP server closed (no new connections)');
          resolve();
        });
      });
    }
  } catch (err) {
    logServerError('HTTP shutdown 에러:', err);
  }

  try {
    await closeDatabasePool();
  } catch (err) {
    logServerError('DB pool 종료 에러:', err);
  }

  clearTimeout(forceExit);
  console.log('👋 Shutdown complete');
  process.exit(exitCode);
}

process.on('SIGTERM', () => { void gracefulShutdown('SIGTERM'); });
process.on('SIGINT', () => { void gracefulShutdown('SIGINT'); });

// uncaughtException: Node 권장대로 프로세스 상태가 손상되었을 수 있으므로
// 로깅 후 graceful shutdown 을 트리거하고 exit(1) 로 종료한다.
// 외부 프로세스 매니저(systemd/PM2/Replit 워크플로)가 재시작하도록 fail-fast.
process.on('uncaughtException', (err) => {
  logServerError('🚨 Uncaught Exception:', err);
  void gracefulShutdown('uncaughtException', 1);
});

// unhandledRejection: 기본은 fail-fast(1) 로 종료. 운영 정책에 따라
// UNHANDLED_REJECTION_POLICY=log 로 설정하면 로깅만 하고 유지한다.
process.on('unhandledRejection', (reason) => {
  logServerError('🚨 Unhandled Promise Rejection:', reason);
  if ((process.env.UNHANDLED_REJECTION_POLICY || 'shutdown') === 'shutdown') {
    void gracefulShutdown('unhandledRejection', 1);
  }
});

// Start the server
// 메모리 초기화 함수 (레거시 - 데이터베이스 마이그레이션으로 비활성화됨)
// 등록 신청은 이제 registrationApplications 테이블을 사용합니다
async function initializeMemoryData() {
  // 데이터베이스 마이그레이션 완료 - global.registrationApplications 더 이상 사용하지 않음
  console.log('✅ 등록 신청 데이터는 이제 데이터베이스(registration_applications 테이블)를 사용합니다.');
  return;
  
  // 아래 코드는 레거시 코드로 비활성화됨
  if (false) {
    const sampleTrainerApplications = [
      {
        id: 'trainer_' + Date.now() + '_1',
        type: 'trainer',
        applicantInfo: {
          personalInfo: {
            name: '김민준',
            phone: '010-1234-5678',
            email: 'trainer1@example.com',
            address: '서울시 강남구 테헤란로 123'
          },
          professionalInfo: {
            experience: 5,
            specialties: ['기초 복종 훈련', '사회화 훈련'],
            certifications: ['반려동물 훈련사 자격증', '동물행동교정사 자격증'],
            bio: '5년간의 경험을 바탕으로 체계적인 반려견 훈련을 제공합니다.',
            serviceArea: '서울시 강남구'
          },
          businessInfo: {
            hourlyRate: '50000'
          }
        },
        documents: {
          profileImage: '/uploads/trainer1_profile.jpg',
          certificationDocs: ['/uploads/trainer1_cert1.pdf', '/uploads/trainer1_cert2.pdf'],
          portfolioImages: ['/uploads/trainer1_portfolio1.jpg']
        },
        status: 'pending',
        submittedAt: new Date(Date.now() - 86400000).toISOString(), // 1일 전
        reviewerId: null,
        reviewedAt: null,
        notes: ''
      },
      {
        id: 'trainer_' + Date.now() + '_2',
        type: 'trainer',
        applicantInfo: {
          personalInfo: {
            name: '박수진',
            phone: '010-2345-6789',
            email: 'trainer2@example.com',
            address: '부산시 해운대구 센텀중앙로 456'
          },
          professionalInfo: {
            experience: 8,
            specialties: ['어질리티 훈련', '문제행동 교정'],
            certifications: ['국제 반려동물 훈련사 자격증', 'K9 트레이너 자격증'],
            bio: '어질리티와 문제행동 교정 전문가로 활동하고 있습니다.',
            serviceArea: '부산시 전체'
          },
          businessInfo: {
            hourlyRate: '60000'
          }
        },
        documents: {
          profileImage: '/uploads/trainer2_profile.jpg',
          certificationDocs: ['/uploads/trainer2_cert1.pdf'],
          portfolioImages: ['/uploads/trainer2_portfolio1.jpg', '/uploads/trainer2_portfolio2.jpg']
        },
        status: 'approved',
        submittedAt: new Date(Date.now() - 172800000).toISOString(), // 2일 전
        reviewerId: 'admin',
        reviewedAt: new Date(Date.now() - 86400000).toISOString(), // 1일 전
        notes: '우수한 경력과 자격을 갖춘 훈련사입니다. 승인합니다.'
      },
      {
        id: 'trainer_' + Date.now() + '_3',
        type: 'trainer',
        applicantInfo: {
          personalInfo: {
            name: '강동훈',
            phone: '010-4765-1909',
            email: 'donghoong@wangzzang.com',
            address: '경북 구미시 구평동 661 (왕짱 스쿨)'
          },
          professionalInfo: {
            experience: 10,
            specialties: ['국가자격증 훈련 (오비디언스 훈련)', '정서안정 및 동물교감 교육', '문제행동 교정', '퍼피 사회화 교육'],
            certifications: [
              '반려동물행동지도사 국가자격증 2급',
              '경기대학교 대체의학대학원 동물매개자연치유전공 석사',
              '한국애견연맹 사회공헌위원회 위원',
              '펫헬스케어아카데미 협회 공동대표'
            ],
            bio: '국가자격증 훈련부터 반려동물 교감 교육까지! 반려견과 보호자의 "진짜 관계"를 만들어 드립니다. 이해와 신뢰 중심의 훈련 철학으로 단순한 훈련이 아닌 반려견과 보호자가 진짜로 "함께 살아가는 법"을 교육합니다.',
            serviceArea: '경북 구미시, 칠곡군'
          },
          businessInfo: {
            hourlyRate: '70000'
          },
          additionalInfo: {
            businessLocations: [
              '경북 구미시 구평동 661 (왕짱 스쿨)',
              '경북 칠곡군 석적읍 북중리 10길 17 (왕짱애견유치원)'
            ],
            specialPrograms: [
              '구미시 2025 미래교육지구 마을학교 "반려꿈터" 운영',
              '정신건강 및 특수교육 대상자를 위한 교감 활동',
              '경북소방본부, 교육기관 대상 강의 및 상담',
              '수제간식 교육 및 반려견 건강식 제안'
            ],
            contentCreation: '교육 영상, 실습 시연 영상 등 직접 촬영·제작하여 시각 중심의 실전 교육 콘텐츠 제공'
          }
        },
        documents: {
          profileImage: '/uploads/trainer_kangdonghoon_profile.jpg',
          certificationDocs: [
            '/uploads/trainer_kangdonghoon_national_cert.pdf',
            '/uploads/trainer_kangdonghoon_masters_degree.pdf',
            '/uploads/trainer_kangdonghoon_association_cert.pdf'
          ],
          portfolioImages: [
            '/uploads/wangzzang_school_facility1.jpg',
            '/uploads/wangzzang_kindergarten_facility2.jpg',
            '/uploads/training_content_video_samples.jpg'
          ]
        },
        status: 'pending',
        submittedAt: new Date().toISOString(), // 방금 신청
        reviewerId: null,
        reviewedAt: null,
        notes: ''
      }
    ];

    const sampleInstituteApplications = [
      {
        id: 'institute_' + Date.now() + '_1',
        type: 'institute',
        applicantInfo: {
          basicInfo: {
            instituteName: '해피독 트레이닝 센터',
            email: 'info@happydog.com',
            phone: '02-1234-5678',
            establishedYear: '2020'
          },
          locationInfo: {
            address: '서울시 마포구 홍대입구역 12번 출구 앞'
          },
          serviceInfo: {
            description: '체계적인 강아지 교육과 사회화 프로그램을 제공하는 전문 교육기관입니다.',
            serviceTypes: ['기초 훈련', '사회화 교육', '문제행동 교정', '어질리티'],
            operatingHours: '평일 09:00-18:00, 주말 10:00-17:00'
          },
          facilityInfo: {
            capacity: '20',
            facilities: ['실내 훈련장', '실외 운동장', '개별 케어 룸', '상담실']
          }
        },
        documents: {
          businessLicense: '/uploads/institute1_license.pdf',
          facilityImages: ['/uploads/institute1_facility1.jpg', '/uploads/institute1_facility2.jpg']
        },
        status: 'pending',
        submittedAt: new Date(Date.now() - 43200000).toISOString(), // 12시간 전
        reviewerId: null,
        reviewedAt: null,
        notes: ''
      },
      {
        id: 'institute_' + Date.now() + '_2',
        type: 'institute',
        applicantInfo: {
          basicInfo: {
            instituteName: '펫케어 아카데미',
            email: 'academy@petcare.com',
            phone: '031-5678-9012',
            establishedYear: '2018'
          },
          locationInfo: {
            address: '경기도 성남시 분당구 정자일로 95'
          },
          serviceInfo: {
            description: '전문 수의사와 훈련사가 함께하는 종합 펫케어 교육기관입니다.',
            serviceTypes: ['기초 교육', '건강 관리', '그루밍', '수의학 상담'],
            operatingHours: '매일 08:00-20:00'
          },
          facilityInfo: {
            capacity: '50',
            facilities: ['대형 훈련장', '의료 시설', '그루밍실', '휴게실', '주차장']
          }
        },
        documents: {
          businessLicense: '/uploads/institute2_license.pdf',
          facilityImages: ['/uploads/institute2_facility1.jpg', '/uploads/institute2_facility2.jpg', '/uploads/institute2_facility3.jpg']
        },
        status: 'rejected',
        submittedAt: new Date(Date.now() - 259200000).toISOString(), // 3일 전
        reviewerId: 'admin',
        reviewedAt: new Date(Date.now() - 172800000).toISOString(), // 2일 전
        notes: '시설 기준이 미흡합니다. 안전 시설 보완 후 재신청 바랍니다.'
      }
    ];

    global.registrationApplications.push(
      ...sampleTrainerApplications,
      ...sampleInstituteApplications
    );

    console.log('✅ 등록 신청 데이터 초기화 완료:', global.registrationApplications.length, '건');
  }
}

async function startServer() {
  try {
    // 메모리 데이터 초기화 (데이터베이스 사용으로 비활성화)
    // initializeMemoryData();

    console.log('🔧 개발 환경: PostgreSQL 연결 설정');
    console.log('🔄 운영 환경용 메모리 저장소 초기화...');

    // Storage 생성자에서 자동으로 데이터 초기화됨

    // Register other API routes BEFORE Vite
    const server = await registerRoutes(app);

    // Register AI routes
    registerAIProxyRoutes(app); // registerAIProxyRoutes 호출
    registerAdminAIRoutes(app);
    registerEnhancedAnalysisRoutes(app);
    registerMediaAnalysisRoutes(app);
    registerExperienceRoutes(app);
    registerInstituteRoutes(app, storage);
    registerAdminRoutes(app);
    registerPaymentIntegrationRoutes(app);
    registerEventRoutes(app);

    // AI 위치 크롤러 라우트 등록
    app.use(aiLocationCrawlerRoutes);
    
    // Zoom Meeting SDK 라우트 등록
    const googleMeetRoutes = (await import('./routes/google-meet')).default;
    app.use('/api/google-meet', googleMeetRoutes);
    console.log('[Google Meet] Google Meet 라우트가 등록되었습니다.');

    // 라이브 스트리밍 라우트 등록
    const liveStreamingRoutes = (await import('./routes/live-streaming')).default;
    app.use('/api/live-streaming', liveStreamingRoutes);
    console.log('[Live Streaming] 라이브 스트리밍 라우트가 등록되었습니다.');

    // 라이브 스트리밍 관리자 메트릭 라우트
    const adminLiveStreamingRoutes = (await import('./routes/admin-live-streaming')).default;
    app.use('/api/admin/live-streaming', adminLiveStreamingRoutes);
    console.log('[Admin Live Streaming] 관리자 라이브 스트리밍 메트릭 라우트가 등록되었습니다.');

    // Setup Vite for development or serve static files for production
    // This MUST come AFTER API routes to prevent catch-all from intercepting API calls
    if (process.env.NODE_ENV === "development") {
      await setupVite(app, server);
    } else {
      // 정적 파일 서빙 - MIME 타입 명시
      // 배포 시 server/public 디렉토리에서 정적 파일 제공
      const staticPath = path.join(process.cwd(), 'server/public');
      console.log(`[Production] Serving static files from: ${staticPath}`);

      app.use(express.static(staticPath, {
        setHeaders: (res, filePath) => {
          if (filePath.endsWith('.css')) {
            res.setHeader('Content-Type', 'text/css');
          } else if (filePath.endsWith('.js')) {
            res.setHeader('Content-Type', 'application/javascript');
          } else if (filePath.endsWith('.json')) {
            res.setHeader('Content-Type', 'application/json');
          }
        }
      }));
      app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
      serveStatic(app);
    }

    // 404 핸들러 (모든 라우트 후에 적용)
    app.use(notFoundHandler);

    // 글로벌 에러 핸들러 (맨 마지막에 적용)
    app.use(errorHandler);

    // Start the server
    httpServerRef = server;
    server.listen(PORT, HOST, async () => {
      // 푸시 알림 예약 발송 스케줄러 시작
      try {
        const { pushSchedulerService } = await import('./services/push-scheduler');
        pushSchedulerService.start();
        console.log('📬 Push notification scheduler started');
      } catch (error) {
        console.warn('[Push Scheduler] 스케줄러 시작 실패:', error);
      }

      if (process.env.NODE_ENV === 'production') {
        console.log('🚀 Server running on port 5000 in PRODUCTION mode');
        console.log('📊 Production monitoring active');
      } else {
        console.log('🚀 Server running on port 5000 in development mode');
      }
    });

  } catch (error) {
    logServerError("❌ Failed to start server:", error);
    process.exit(1);
  }
}

startServer();