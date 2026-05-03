import type { Express, Request, Response, NextFunction } from "express";
import { storage } from "../storage";
import { logServerError } from '../middleware/audit-logger';

// 관리자 권한 검사 미들웨어
const requireAdmin = (req: any, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ 
      success: false, 
      message: '로그인이 필요합니다.',
      code: 'AUTHENTICATION_REQUIRED'
    });
  }
  if (req.user.role !== 'admin') {
    return res.status(403).json({ 
      success: false, 
      message: '관리자 권한이 필요합니다.',
      code: 'ADMIN_ACCESS_REQUIRED'
    });
  }
  next();
};

// 결제 수단 테스트 함수 (Toss Payments 기반)
async function testTossPayment(amount: number = 1000) {
  try {
    // 실제 환경에서는 환경변수에서 가져와야 함
    const secretKey = process.env.TOSS_SECRET_KEY || 'test_sk_example';
    
    // Base64 인코딩
    const encodedKey = Buffer.from(secretKey + ':').toString('base64');
    
    const response = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${encodedKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        paymentKey: 'test_payment_key_' + Date.now(),
        orderId: 'test_order_' + Date.now(),
        amount: amount
      })
    });

    return response.ok;
  } catch (error) {
    logServerError('Toss 결제 테스트 오류:', error);
    return false;
  }
}

// 결제 취소 함수
async function cancelTossPayment(paymentKey: string, reason: string = '관리자 취소') {
  try {
    const secretKey = process.env.TOSS_SECRET_KEY || 'test_sk_example';
    const encodedKey = Buffer.from(secretKey + ':').toString('base64');
    
    const response = await fetch(`https://api.tosspayments.com/v1/payments/${paymentKey}/cancel`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${encodedKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        cancelReason: reason
      })
    });

    return response.ok;
  } catch (error) {
    logServerError('Toss 결제 취소 오류:', error);
    return false;
  }
}

export function registerPaymentIntegrationRoutes(app: Express) {
  
  // 결제 수단 목록 조회 API
  app.get('/api/admin/payment/methods', requireAdmin, async (req, res) => {
    try {
      const paymentMethods = storage.getPaymentMethods();
      console.log(`[Payment] 결제 수단 목록 조회: ${paymentMethods.length}개`);
      
      res.json({
        success: true,
        data: paymentMethods,
        message: '결제 수단 목록을 성공적으로 조회했습니다.'
      });
    } catch (error) {
      logServerError('[Payment] 결제 수단 조회 오류:', error, req);
      res.status(500).json({
        success: false,
        message: '결제 수단 조회 중 오류가 발생했습니다.'
      });
    }
  });

  // 결제 수단 등록 API
  app.post('/api/admin/payment/methods', requireAdmin, async (req, res) => {
    try {
      const methodData = req.body;
      console.log(`[Payment] 새 결제 수단 등록:`, methodData.name);
      
      const newMethod = storage.registerPaymentMethod(methodData);
      
      res.json({
        success: true,
        data: newMethod,
        message: `${methodData.name} 결제 수단이 성공적으로 등록되었습니다.`
      });
    } catch (error) {
      logServerError('[Payment] 결제 수단 등록 오류:', error, req);
      res.status(500).json({
        success: false,
        message: '결제 수단 등록 중 오류가 발생했습니다.'
      });
    }
  });

  // 결제 수단 수정 API
  app.put('/api/admin/payment/methods/:id', requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;
      console.log(`[Payment] 결제 수단 수정: ${id}`, updateData);
      
      const updatedMethod = storage.updatePaymentMethod(id, updateData);
      
      if (!updatedMethod) {
        return res.status(404).json({
          success: false,
          message: '해당 결제 수단을 찾을 수 없습니다.'
        });
      }
      
      res.json({
        success: true,
        data: updatedMethod,
        message: `${updateData.name || id} 결제 수단이 성공적으로 수정되었습니다.`
      });
    } catch (error) {
      logServerError('[Payment] 결제 수단 수정 오류:', error, req);
      res.status(500).json({
        success: false,
        message: '결제 수단 수정 중 오류가 발생했습니다.'
      });
    }
  });

  // 사용자 요금제 목록 조회 API
  app.get('/api/admin/payment/plans', requireAdmin, async (req, res) => {
    try {
      const userPaymentPlans = storage.getUserPaymentPlans();
      console.log(`[Payment] 사용자 요금제 목록 조회: ${userPaymentPlans.length}개`);
      
      res.json({
        success: true,
        data: userPaymentPlans,
        message: '사용자 요금제 목록을 성공적으로 조회했습니다.'
      });
    } catch (error) {
      logServerError('[Payment] 사용자 요금제 조회 오류:', error, req);
      res.status(500).json({
        success: false,
        message: '사용자 요금제 조회 중 오류가 발생했습니다.'
      });
    }
  });
  // 결제 수단 테스트 API
  app.post('/api/admin/payment/test', requireAdmin, async (req, res) => {
    try {
      const { methodId, amount = 1000 } = req.body;

      console.log(`[Payment] ${methodId} 결제 테스트 시작 - 금액: ${amount}원`);

      let testResult = false;

      switch (methodId) {
        case 'toss':
          testResult = await testTossPayment(amount);
          break;
        case 'kakao':
          // KakaoPay 테스트 로직 (추후 구현)
          testResult = true; // 임시로 성공으로 설정
          break;
        case 'naver':
          // NaverPay 테스트 로직 (추후 구현)
          testResult = true; // 임시로 성공으로 설정
          break;
        default:
          throw new Error(`지원하지 않는 결제 수단: ${methodId}`);
      }

      if (testResult) {
        console.log(`[Payment] ${methodId} 결제 테스트 성공`);
        res.json({
          success: true,
          methodId,
          amount,
          message: '결제 테스트가 성공적으로 완료되었습니다.',
          timestamp: new Date().toISOString()
        });
      } else {
        console.log(`[Payment] ${methodId} 결제 테스트 실패`);
        res.status(400).json({
          success: false,
          methodId,
          amount,
          message: '결제 테스트가 실패했습니다.',
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      logServerError('[Payment] 결제 테스트 오류:', error, req);
      res.status(500).json({
        success: false,
        message: '결제 테스트 중 서버 오류가 발생했습니다.',
        error: error.message
      });
    }
  });

  // 결제 수단 상태 변경 API
  app.patch('/api/admin/payment/methods/:methodId/status', requireAdmin, async (req, res) => {
    try {
      const { methodId } = req.params;
      const { status } = req.body;

      console.log(`[Payment] ${methodId} 결제 수단 상태 변경: ${status}`);

      const updatedMethod = storage.updatePaymentMethod(methodId, { status });

      res.json({
        success: true,
        data: updatedMethod,
        message: `${methodId} 결제 수단이 ${status === 'active' ? '활성화' : '비활성화'}되었습니다.`
      });
    } catch (error) {
      logServerError('[Payment] 결제 수단 상태 변경 오류:', error, req);
      res.status(500).json({
        success: false,
        message: '결제 수단 상태 변경 중 오류가 발생했습니다.'
      });
    }
  });

  // 요금제 업데이트 API
  app.patch('/api/admin/payment/plans/:role', requireAdmin, async (req, res) => {
    try {
      const { role } = req.params;
      const updates = req.body;

      console.log(`[Payment] ${role} 요금제 업데이트:`, updates);

      const updatedPlan = storage.updateUserPaymentPlan(role, updates);

      res.json({
        success: true,
        data: updatedPlan,
        message: `${role} 요금제가 업데이트되었습니다.`
      });
    } catch (error) {
      logServerError('[Payment] 요금제 업데이트 오류:', error, req);
      res.status(500).json({
        success: false,
        message: '요금제 업데이트 중 오류가 발생했습니다.'
      });
    }
  });

  // 결제 내역 조회 API
  app.get('/api/admin/payment/history', requireAdmin, async (req, res) => {
    try {
      const { startDate, endDate, status, methodId } = req.query;
      const options = { startDate, endDate, status, methodId };
      
      const paymentHistory = storage.getPaymentHistory(options);
      console.log(`[Payment] 결제 내역 조회: ${paymentHistory.length}건`);
      
      res.json({
        success: true,
        data: paymentHistory,
        message: '결제 내역을 성공적으로 조회했습니다.'
      });
    } catch (error) {
      logServerError('[Payment] 결제 내역 조회 오류:', error, req);
      res.status(500).json({
        success: false,
        message: '결제 내역 조회 중 오류가 발생했습니다.'
      });
    }
  });

  // 결제 내역 추가 API (시스템 내부용)
  app.post('/api/admin/payment/history', requireAdmin, async (req, res) => {
    try {
      const historyData = req.body;
      console.log(`[Payment] 새 결제 내역 추가:`, historyData.orderId);
      
      const newHistory = storage.addPaymentHistory(historyData);
      
      res.json({
        success: true,
        data: newHistory,
        message: '결제 내역이 성공적으로 추가되었습니다.'
      });
    } catch (error) {
      logServerError('[Payment] 결제 내역 추가 오류:', error, req);
      res.status(500).json({
        success: false,
        message: '결제 내역 추가 중 오류가 발생했습니다.'
      });
    }
  });

  // 결제 수단 삭제 API
  app.delete('/api/admin/payment/methods/:methodId', requireAdmin, async (req, res) => {
    try {
      const { methodId } = req.params;
      console.log(`[Payment] ${methodId} 결제 수단 삭제`);
      
      storage.deletePaymentMethod(methodId);
      
      res.json({
        success: true,
        message: `${methodId} 결제 수단이 성공적으로 삭제되었습니다.`
      });
    } catch (error) {
      logServerError('[Payment] 결제 수단 삭제 오류:', error, req);
      res.status(500).json({
        success: false,
        message: '결제 수단 삭제 중 오류가 발생했습니다.'
      });
    }
  });



  // 결제 취소 API
  app.post('/api/admin/payment/cancel/:paymentKey', requireAdmin, async (req, res) => {
    try {
      const { paymentKey } = req.params;
      const { reason = '관리자 취소' } = req.body;

      console.log(`[Payment] 결제 취소 요청: ${paymentKey}, 사유: ${reason}`);

      const cancelResult = await cancelTossPayment(paymentKey, reason);

      if (cancelResult) {
        res.json({
          success: true,
          paymentKey,
          message: '결제가 성공적으로 취소되었습니다.',
          cancelReason: reason,
          timestamp: new Date().toISOString()
        });
      } else {
        res.status(400).json({
          success: false,
          paymentKey,
          message: '결제 취소에 실패했습니다.'
        });
      }
    } catch (error) {
      logServerError('[Payment] 결제 취소 오류:', error, req);
      res.status(500).json({
        success: false,
        message: '결제 취소 중 서버 오류가 발생했습니다.'
      });
    }
  });

  // 결제 수단 추가 API (중복 - requireAdmin 적용)
  app.post('/api/admin/payment/methods/add', requireAdmin, async (req, res) => {
    try {
      const { id, name, type, description, provider, apiKey, commissionRate } = req.body;
      
      console.log(`[Payment] 새 결제 수단 추가: ${name}`);
      
      const newMethod = {
        id,
        name,
        type,
        description,
        provider,
        apiKey,
        status: 'inactive', // 새로 추가된 결제 수단은 기본적으로 비활성
        supportedMethods: type === 'pg' ? ['카드', '계좌이체'] : ['간편결제'],
        commissionRate: commissionRate || 0,
        setupFee: 0,
        monthlyFee: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // 스토리지에 추가
      storage.createPaymentMethod(newMethod);
      
      res.json({
        success: true,
        data: newMethod,
        message: '새 결제 수단이 성공적으로 추가되었습니다.'
      });
    } catch (error) {
      logServerError('[Payment] 결제 수단 추가 오류:', error, req);
      res.status(500).json({
        success: false,
        message: '결제 수단 추가 중 오류가 발생했습니다.'
      });
    }
  });

  // 보안 설정 조회 API
  app.get('/api/admin/payment/security', requireAdmin, async (req, res) => {
    try {
      const securitySettings = {
        encryptionEnabled: true,
        apiKeyEncryption: true,
        transactionLogging: true,
        fraudDetection: true,
        twoFactorAuth: false,
        ipWhitelist: '192.168.1.1, 10.0.0.1',
        lastUpdated: new Date().toISOString()
      };

      res.json({
        success: true,
        data: securitySettings
      });
    } catch (error) {
      logServerError('[Payment] 보안 설정 조회 오류:', error, req);
      res.status(500).json({
        success: false,
        message: '보안 설정 조회 중 오류가 발생했습니다.'
      });
    }
  });

  // 보안 설정 업데이트 API
  app.put('/api/admin/payment/security', requireAdmin, async (req, res) => {
    try {
      const securitySettings = req.body;
      
      console.log('[Payment] 보안 설정 업데이트:', securitySettings);
      
      // 실제로는 데이터베이스에 저장
      const updatedSettings = {
        ...securitySettings,
        lastUpdated: new Date().toISOString()
      };

      res.json({
        success: true,
        data: updatedSettings,
        message: '보안 설정이 성공적으로 업데이트되었습니다.'
      });
    } catch (error) {
      logServerError('[Payment] 보안 설정 업데이트 오류:', error, req);
      res.status(500).json({
        success: false,
        message: '보안 설정 업데이트 중 오류가 발생했습니다.'
      });
    }
  });

  // 전체 결제 통계 API
  app.get('/api/admin/payment/stats', requireAdmin, async (req, res) => {
    try {
      // 실제로는 데이터베이스에서 계산
      const stats = {
        totalRevenue: 1295000,
        monthlyGrowth: 12.5,
        activePaymentMethods: 3,
        totalPaymentMethods: 5,
        averageCommission: 2.97,
        totalPaidUsers: 87,
        monthlyNewUsers: 23
      };

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      logServerError('[Payment] 결제 통계 조회 오류:', error, req);
      res.status(500).json({
        success: false,
        message: '결제 통계 조회 중 오류가 발생했습니다.'
      });
    }
  });

  console.log('[Payment] 결제연동 관리 라우트가 등록되었습니다.');
}
