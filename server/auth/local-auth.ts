/**
 * local-auth.ts
 * 일반 아이디/비밀번호 로그인을 위한 인증 설정 파일
 */
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import bcrypt from 'bcrypt';
import { storage } from '../storage';
import { User as SelectUser } from '@shared/schema';
import { logServerError } from '../middleware/audit-logger';

export async function hashPassword(password: string) {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
}

export async function comparePasswords(supplied: string, stored: string) {
  return await bcrypt.compare(supplied, stored);
}

export function setupLocalAuth() {
  // 로컬 전략 설정
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        // 개발 환경에서만 테스트 계정 허용
        if (process.env.NODE_ENV === 'development') {
          const testAccounts = getTestAccounts();
          const testUser = testAccounts[username];
          
          if (testUser && testUser.password === password) {
            console.log(`테스트 계정 로그인 성공: '${username}'`);
            return done(null, {
              id: testUser.id,
              username,
              name: testUser.name,
              email: testUser.email,
              role: testUser.role,
              password: await hashPassword(password), // 보안을 위해 해시된 비밀번호 저장
              verified: true
            });
          }
        }
        
        // 실제 사용자 조회 (프로덕션 환경 또는 등록된 사용자)
        const user = await storage.getUserByUsername(username);
        
        if (!user) {
          console.log(`로그인 실패: 사용자 '${username}' 없음`);
          return done(null, false, { message: '아이디 또는 비밀번호가 일치하지 않습니다.' });
        }
        
        // bcrypt를 사용한 비밀번호 검증
        const isPasswordValid = await comparePasswords(password, user.password);
          
        if (!isPasswordValid) {
          console.log(`로그인 실패: '${username}' 비밀번호 불일치`);
          return done(null, false, { message: '아이디 또는 비밀번호가 일치하지 않습니다.' });
        }
        
        // 승인 상태 확인
        const approvalStatus = (user as any).approvalStatus;
        if (approvalStatus === 'pending') {
          console.log(`로그인 실패: '${username}' 승인 대기 중`);
          return done(null, false, { message: '관리자 승인 대기 중입니다. 승인 후 로그인이 가능합니다.' });
        }
        
        if (approvalStatus === 'rejected') {
          console.log(`로그인 실패: '${username}' 가입 거부됨`);
          return done(null, false, { message: '회원가입이 거부되었습니다. 관리자에게 문의해주세요.' });
        }
        
        console.log(`로그인 성공: '${username}'`);
        return done(null, user);
      } catch (error) {
        logServerError('로컬 인증 오류:', error);
        return done(error as Error);
      }
    })
  );
}

// 환경 변수 기반 테스트 계정 정보
export function getTestAccounts(): Record<string, { password: string; role: string; name: string; email: string; id: number }> {
  return {
    'admin': { 
      password: process.env.TEST_ADMIN_PASSWORD || 'admin123', 
      role: 'admin', 
      name: '관리자',
      email: 'admin@talez.com',
      id: 1
    },
    '관리자': { 
      password: process.env.TEST_ADMIN_PASSWORD || 'admin123', 
      role: 'admin', 
      name: '관리자',
      email: 'admin@talez.com',
      id: 1
    },
    'trainer': { 
      password: process.env.TEST_TRAINER_PASSWORD || 'trainer123', 
      role: 'trainer', 
      name: '강동훈',
      email: 'kang@talez.com',
      id: 4
    },
    '강동훈': { 
      password: process.env.TEST_TRAINER_PASSWORD || 'trainer123', 
      role: 'trainer', 
      name: '강동훈',
      email: 'kang@talez.com',
      id: 4
    },
    'test': { 
      password: process.env.TEST_USER_PASSWORD || 'test123', 
      role: 'pet-owner', 
      name: '테스트 사용자',
      email: 'test@test.com',
      id: 3
    },
    'institute': {
      password: process.env.TEST_INSTITUTE_PASSWORD || 'institute123',
      role: 'institute-admin',
      name: '테스트 기관',
      email: 'institute@talez.com',
      id: 5
    }
  };
}