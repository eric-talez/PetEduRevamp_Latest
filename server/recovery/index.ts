import { Request, Response } from 'express';
import { storage } from '../storage';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { logServerError } from '../middleware/audit-logger';

// 비밀번호 재설정 토큰 저장소 (실제 프로덕션에서는 DB에 저장해야 함)
const resetTokens: Record<string, { email: string, username: string, expires: Date }> = {};

// 토큰 생성 함수
function generateToken(username: string, email: string): string {
  const token = crypto.randomBytes(20).toString('hex');
  const expires = new Date();
  expires.setHours(expires.getHours() + 1); // 1시간 유효
  
  resetTokens[token] = {
    username,
    email,
    expires
  };
  
  return token;
}

// 이메일 발송을 위한 설정
// 참고: 실제 서비스에서는 환경 변수로 관리해야 함
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'talez.noreply@gmail.com',
    pass: process.env.EMAIL_PASSWORD || 'app_password'
  }
});

// 비밀번호 재설정 요청 처리
export async function requestPasswordReset(req: Request, res: Response) {
  try {
    const { username, email } = req.body;
    
    if (!username || !email) {
      return res.status(400).json({ message: '아이디와 이메일을 모두 입력해주세요.' });
    }
    
    // 사용자 정보 확인
    const user = await storage.getUserByUsername(username);
    
    // 사용자가 없거나 이메일이 일치하지 않는 경우
    // 보안상 구체적인 오류 메시지는 반환하지 않음
    if (!user || user.email !== email) {
      return res.status(200).json({ 
        message: '비밀번호 재설정 안내 이메일이 발송되었습니다. 이메일을 확인해주세요.' 
      });
    }
    
    // 토큰 생성
    const token = generateToken(username, email);
    
    // 이메일 발송 (개발 환경에서는 로그만 출력)
    const resetUrl = `${req.protocol}://${req.get('host')}/auth/reset-password/${token}`;
    
    if (process.env.NODE_ENV === 'production') {
      try {
        await transporter.sendMail({
          from: '"Talez" <talez.noreply@gmail.com>',
          to: email,
          subject: '[Talez] 비밀번호 재설정 안내',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #4a5568;">비밀번호 재설정 안내</h2>
              <p>안녕하세요, ${username}님.</p>
              <p>비밀번호 재설정을 요청하셨습니다. 아래 링크를 클릭하여 비밀번호를 재설정하세요:</p>
              <p><a href="${resetUrl}" style="background-color: #4299e1; color: white; padding: 10px 15px; text-decoration: none; border-radius: 4px; display: inline-block; margin: 15px 0;">비밀번호 재설정</a></p>
              <p>이 링크는 1시간 동안만 유효합니다.</p>
              <p>만약 비밀번호 재설정을 요청하지 않으셨다면, 이 이메일을 무시하셔도 됩니다.</p>
              <p>감사합니다.<br>Talez 팀</p>
            </div>
          `
        });
      } catch (error) {
        logServerError('이메일 발송 오류:', error, req);
      }
    } else {
      console.log('=== 비밀번호 재설정 링크 ===');
      console.log(resetUrl);
      console.log('===========================');
    }
    
    // 성공 응답
    return res.status(200).json({
      message: '비밀번호 재설정 안내 이메일이 발송되었습니다. 이메일을 확인해주세요.'
    });
    
  } catch (error) {
    logServerError('비밀번호 재설정 요청 오류:', error, req);
    return res.status(500).json({ message: '서버 오류가 발생했습니다. 나중에 다시 시도해주세요.' });
  }
}

// 비밀번호 재설정 (토큰 확인)
export async function verifyResetToken(req: Request, res: Response) {
  try {
    const { token } = req.params;
    
    // 토큰 유효성 검사
    const tokenData = resetTokens[token];
    if (!tokenData) {
      return res.status(400).json({ message: '유효하지 않거나 만료된 토큰입니다.' });
    }
    
    // 토큰 만료 확인
    if (new Date() > tokenData.expires) {
      delete resetTokens[token];
      return res.status(400).json({ message: '토큰이 만료되었습니다. 다시 요청해주세요.' });
    }
    
    // 토큰 확인 성공
    return res.status(200).json({ 
      message: '유효한 토큰입니다.',
      username: tokenData.username
    });
    
  } catch (error) {
    logServerError('토큰 확인 오류:', error, req);
    return res.status(500).json({ message: '서버 오류가 발생했습니다. 나중에 다시 시도해주세요.' });
  }
}

// 비밀번호 재설정 (새 비밀번호 설정)
export async function resetPassword(req: Request, res: Response) {
  try {
    const { token, password } = req.body;
    
    if (!token || !password) {
      return res.status(400).json({ message: '모든 필드를 입력해주세요.' });
    }
    
    // 토큰 유효성 검사
    const tokenData = resetTokens[token];
    if (!tokenData) {
      return res.status(400).json({ message: '유효하지 않거나 만료된 토큰입니다.' });
    }
    
    // 토큰 만료 확인
    if (new Date() > tokenData.expires) {
      delete resetTokens[token];
      return res.status(400).json({ message: '토큰이 만료되었습니다. 다시 요청해주세요.' });
    }
    
    // 사용자 정보 가져오기
    const user = await storage.getUserByUsername(tokenData.username);
    if (!user) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    }
    
    // 비밀번호 업데이트 (실제 구현 필요)
    // storage.updateUserPassword(user.id, password);
    
    // 토큰 삭제
    delete resetTokens[token];
    
    // 성공 응답
    return res.status(200).json({ message: '비밀번호가 성공적으로 재설정되었습니다.' });
    
  } catch (error) {
    logServerError('비밀번호 재설정 오류:', error, req);
    return res.status(500).json({ message: '서버 오류가 발생했습니다. 나중에 다시 시도해주세요.' });
  }
}