import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { logServerError } from '../middleware/audit-logger';

const router = Router();

const SSO_SECRET = process.env.SSO_SHARED_SECRET || '';

interface SSOTokenPayload {
  userId: number;
  username: string;
  name: string;
  email: string;
  role: string;
  platform: string;
  iat: number;
  exp: number;
}

const allowedOrigins = [
  'https://talezaitool.com',
  'https://www.talezaitool.com',
  'https://talez.co.kr',
  'https://www.talez.co.kr'
];

const corsMiddleware = (req: any, res: any, next: any) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
};

router.options('/api/sso/verify', corsMiddleware);

router.get('/api/sso/token', (req, res) => {
  try {
    if (!req.session?.user) {
      return res.status(401).json({ error: '로그인이 필요합니다.' });
    }

    if (!SSO_SECRET) {
      return res.status(500).json({ error: 'SSO 설정이 완료되지 않았습니다.' });
    }

    const user = req.session.user;
    
    const payload = {
      userId: user.id,
      username: user.username,
      name: user.name || user.username,
      email: user.email || '',
      role: user.role || 'user',
      platform: 'talez'
    };

    const token = jwt.sign(payload, SSO_SECRET, {
      expiresIn: '1h',
      issuer: 'talez',
      audience: 'talezaitool'
    });

    console.log('[SSO] 토큰 생성 완료:', { userId: user.id, username: user.username });

    res.json({ 
      success: true, 
      token,
      expiresIn: 3600
    });
  } catch (error) {
    logServerError('[SSO] 토큰 생성 오류:', error, req);
    res.status(500).json({ error: 'SSO 토큰 생성 실패' });
  }
});

router.post('/api/sso/verify', corsMiddleware, (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: '토큰이 필요합니다.' });
    }

    if (!SSO_SECRET) {
      return res.status(500).json({ error: 'SSO 설정이 완료되지 않았습니다.' });
    }

    const decoded = jwt.verify(token, SSO_SECRET, {
      issuer: 'talez',
      audience: 'talezaitool'
    }) as SSOTokenPayload;

    console.log('[SSO] 토큰 검증 성공:', { userId: decoded.userId, username: decoded.username });

    res.json({
      success: true,
      user: {
        userId: decoded.userId,
        username: decoded.username,
        name: decoded.name,
        email: decoded.email,
        role: decoded.role,
        platform: decoded.platform
      }
    });
  } catch (error: any) {
    logServerError('[SSO] 토큰 검증 오류:', error.message, req);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: '토큰이 만료되었습니다.' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: '유효하지 않은 토큰입니다.' });
    }
    
    res.status(500).json({ error: 'SSO 토큰 검증 실패' });
  }
});

export default router;

console.log('[SSO] SSO 라우트가 등록되었습니다.');
console.log('  - GET /api/sso/token (SSO 토큰 발급)');
console.log('  - POST /api/sso/verify (SSO 토큰 검증)');
