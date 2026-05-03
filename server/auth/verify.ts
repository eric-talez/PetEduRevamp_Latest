import { Request, Response } from 'express';
import axios from 'axios';
import { storage } from '../storage';
import { logger } from '../monitoring/logger';
import { logServerError } from '../middleware/audit-logger';

/**
 * Toss 본인확인 API를 통해 본인인증 완료 후 받은 코드를 검증하고
 * 사용자 정보를 가져오는 함수
 */
export async function verifyIdentity(req: Request, res: Response) {
  try {
    const { code } = req.body;
    
    if (!code) {
      return res.status(400).json({ message: '인증 코드가 전달되지 않았습니다.' });
    }
    
    // 환경 변수에서 Toss 클라이언트 정보 가져오기
    const TOSS_CLIENT_ID = process.env.TOSS_CLIENT_ID;
    const TOSS_CLIENT_SECRET = process.env.TOSS_CLIENT_SECRET;
    const REDIRECT_URI = `${process.env.APP_URL || 'http://localhost:3000'}/auth/verify/callback`;
    
    if (!TOSS_CLIENT_ID || !TOSS_CLIENT_SECRET) {
      logger.error('Toss 인증 정보가 설정되지 않았습니다.');
      return res.status(500).json({ message: '서버 설정 오류가 발생했습니다.' });
    }
    
    // 1. 인증 코드를 토큰으로 교환
    const tokenResponse = await axios.post('https://auth.tosspayments.com/oauth/token', 
      {
        code,
        grant_type: 'authorization_code',
        client_id: TOSS_CLIENT_ID,
        client_secret: TOSS_CLIENT_SECRET,
        redirect_uri: REDIRECT_URI
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (!tokenResponse.data.access_token) {
      return res.status(400).json({ message: '토큰 교환 실패: 인증 정보가 올바르지 않습니다.' });
    }
    
    const accessToken = tokenResponse.data.access_token;
    
    // 2. 액세스 토큰으로 사용자 정보 조회
    const userInfoResponse = await axios.get('https://auth.tosspayments.com/userinfo', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    const userData = userInfoResponse.data;
    
    // 3. 필요한 사용자 정보 추출
    const userInfo = {
      ci: userData.ci,
      name: userData.name,
      birth: userData.birthdate,
      phone: userData.phone_number,
      gender: userData.gender,
      is_adult: userData.is_adult
    };
    
    // 4. 로그인된 사용자라면 해당 사용자 정보에 인증 정보 업데이트
    if (req.session?.user?.id) {
      const userId = req.session.user.id;
      
      // 기존 CI 중복 확인 (다른 사용자가 이미 이 CI로 인증되어 있는지)
      const existingUserWithCI = await storage.getUserByCi(userInfo.ci);
      if (existingUserWithCI && existingUserWithCI.id !== userId) {
        return res.status(409).json({ 
          message: '이미 다른 계정에 연결된 본인인증 정보입니다.' 
        });
      }
      
      // 사용자 정보 업데이트
      await storage.updateUserVerification(userId, {
        ci: userInfo.ci,
        verified: true,
        verifiedAt: new Date(),
        // 추가 정보는 선택적으로 저장
        verificationName: userInfo.name,
        verificationBirth: userInfo.birth,
        verificationPhone: userInfo.phone
      });
    }
    
    // 5. 인증 결과 반환
    return res.status(200).json(userInfo);
    
  } catch (error: any) {
    logServerError('본인인증 처리 오류:', error, req);
    
    // 오류 응답 정제
    const errorMessage = error.response?.data?.error_description || 
                         error.response?.data?.message || 
                         error.message || 
                         '알 수 없는 오류가 발생했습니다.';
    
    return res.status(500).json({ message: errorMessage });
  }
}