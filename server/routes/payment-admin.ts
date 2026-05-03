
import type { Express } from "express";
import { IStorage } from "../storage";
import crypto from 'crypto';
import { logServerError } from '../middleware/audit-logger';

export function registerPaymentAdminRoutes(app: Express, storage: IStorage) {
  console.log('[PaymentAdminRoutes] 관리자 결제 관리 라우트 등록 시작');

  // 결제 제공업체 설정 조회
  app.get("/api/admin/payment/providers", async (req, res) => {
    try {
      if (!req.isAuthenticated() || req.user?.role !== 'admin') {
        return res.status(403).json({ error: '관리자 권한이 필요합니다' });
      }

      // 임시 데이터 - 실제로는 DB에서 가져와야 함
      const providers = [
        {
          id: 'toss',
          name: '토스페이먼츠',
          type: 'card',
          status: 'active',
          testMode: true
        },
        {
          id: 'danal',
          name: '다날',
          type: 'phone',
          status: 'inactive',
          testMode: true
        }
      ];

      res.json(providers);
    } catch (error) {
      logServerError('결제 제공업체 조회 오류:', error, req);
      res.status(500).json({ error: '서버 오류가 발생했습니다' });
    }
  });

  // 결제 제공업체 설정 저장
  app.put("/api/admin/payment/providers/:provider", async (req, res) => {
    try {
      if (!req.isAuthenticated() || req.user?.role !== 'admin') {
        return res.status(403).json({ error: '관리자 권한이 필요합니다' });
      }

      const { provider } = req.params;
      const settings = req.body;

      console.log(`[PaymentAdmin] ${provider} 설정 저장:`, settings);

      // 실제로는 DB에 저장해야 함
      // await storage.savePaymentProviderSettings(provider, settings);

      res.json({ success: true, message: '설정이 저장되었습니다' });
    } catch (error) {
      logServerError('결제 제공업체 설정 저장 오류:', error, req);
      res.status(500).json({ error: '설정 저장에 실패했습니다' });
    }
  });

  // 결제 거래 내역 조회
  app.get("/api/admin/payment/transactions", async (req, res) => {
    try {
      if (!req.isAuthenticated() || req.user?.role !== 'admin') {
        return res.status(403).json({ error: '관리자 권한이 필요합니다' });
      }

      // 임시 데이터 - 실제로는 DB에서 가져와야 함
      const transactions = [
        {
          id: '1',
          orderId: 'TEST_ORDER_001',
          amount: 1000,
          status: 'success',
          paymentMethod: '카드',
          provider: 'toss',
          userRole: 'pet_owner',
          createdAt: new Date().toISOString(),
          paymentKey: 'test_payment_key_001'
        },
        {
          id: '2',
          orderId: 'TEST_ORDER_002',
          amount: 5000,
          status: 'failed',
          paymentMethod: '휴대폰',
          provider: 'danal',
          userRole: 'trainer',
          createdAt: new Date().toISOString()
        }
      ];

      res.json(transactions);
    } catch (error) {
      logServerError('결제 거래 내역 조회 오류:', error, req);
      res.status(500).json({ error: '서버 오류가 발생했습니다' });
    }
  });

  // 토스페이먼츠 테스트 결제
  app.post("/api/admin/payment/test/toss", async (req, res) => {
    try {
      if (!req.isAuthenticated() || req.user?.role !== 'admin') {
        return res.status(403).json({ error: '관리자 권한이 필요합니다' });
      }

      const { amount, orderId, orderName } = req.body;

      // 토스페이먼츠 테스트 API 호출 시뮬레이션
      const testResult = {
        success: true,
        orderId,
        amount,
        paymentKey: 'test_payment_key_' + Date.now(),
        status: 'DONE',
        approvedAt: new Date().toISOString(),
        method: 'CARD',
        message: '테스트 결제가 성공했습니다'
      };

      console.log('[PaymentAdmin] 토스 테스트 결제 결과:', testResult);

      res.json(testResult);
    } catch (error) {
      logServerError('토스 테스트 결제 오류:', error, req);
      res.status(500).json({ 
        success: false, 
        error: '테스트 결제에 실패했습니다' 
      });
    }
  });

  // 다날 테스트 인증
  app.post("/api/admin/payment/test/danal", async (req, res) => {
    try {
      if (!req.isAuthenticated() || req.user?.role !== 'admin') {
        return res.status(403).json({ error: '관리자 권한이 필요합니다' });
      }

      // 다날 휴대폰 인증 테스트 시뮬레이션
      const testResult = {
        success: true,
        authKey: 'test_auth_key_' + Date.now(),
        status: 'SUCCESS',
        message: '휴대폰 인증 테스트가 성공했습니다',
        phoneNumber: '010-****-1234'
      };

      console.log('[PaymentAdmin] 다날 테스트 인증 결과:', testResult);

      res.json(testResult);
    } catch (error) {
      logServerError('다날 테스트 인증 오류:', error, req);
      res.status(500).json({ 
        success: false, 
        error: '인증 테스트에 실패했습니다' 
      });
    }
  });

  // 결제 취소
  app.post("/api/admin/payment/cancel/:paymentKey", async (req, res) => {
    try {
      if (!req.isAuthenticated() || req.user?.role !== 'admin') {
        return res.status(403).json({ error: '관리자 권한이 필요합니다' });
      }

      const { paymentKey } = req.params;
      const { cancelReason } = req.body;

      console.log(`[PaymentAdmin] 결제 취소 요청: ${paymentKey}, 사유: ${cancelReason}`);

      // 실제 결제 취소 API 호출 시뮬레이션
      const cancelResult = {
        success: true,
        paymentKey,
        status: 'CANCELLED',
        cancelReason,
        cancelledAt: new Date().toISOString()
      };

      res.json(cancelResult);
    } catch (error) {
      logServerError('결제 취소 오류:', error, req);
      res.status(500).json({ error: '결제 취소에 실패했습니다' });
    }
  });

  // 웹훅 로그 조회
  app.get("/api/admin/payment/webhook/logs", async (req, res) => {
    try {
      if (!req.isAuthenticated() || req.user?.role !== 'admin') {
        return res.status(403).json({ error: '관리자 권한이 필요합니다' });
      }

      // 임시 웹훅 로그 데이터
      const webhookLogs = [
        {
          id: '1',
          provider: 'toss',
          eventType: 'PAYMENT_APPROVED',
          status: 'processed',
          timestamp: new Date().toISOString(),
          data: {
            paymentKey: 'test_payment_key_001',
            orderId: 'TEST_ORDER_001',
            amount: 1000,
            status: 'DONE'
          }
        },
        {
          id: '2',
          provider: 'danal',
          eventType: 'AUTH_SUCCESS',
          status: 'received',
          timestamp: new Date().toISOString(),
          data: {
            authKey: 'test_auth_key_001',
            phoneNumber: '010-****-1234'
          }
        }
      ];

      res.json(webhookLogs);
    } catch (error) {
      logServerError('웹훅 로그 조회 오류:', error, req);
      res.status(500).json({ error: '서버 오류가 발생했습니다' });
    }
  });

  // 토스페이먼츠 웹훅 수신
  app.post("/api/admin/payment/webhook/toss", async (req, res) => {
    try {
      console.log('[PaymentAdmin] 토스 웹훅 수신:', req.body);

      // 웹훅 데이터 저장
      // await storage.saveWebhookLog('toss', req.body);

      res.json({ success: true, message: 'Webhook received' });
    } catch (error) {
      logServerError('토스 웹훅 처리 오류:', error, req);
      res.status(500).json({ error: '웹훅 처리에 실패했습니다' });
    }
  });

  // 다날 웹훅 수신
  app.post("/api/admin/payment/webhook/danal", async (req, res) => {
    try {
      console.log('[PaymentAdmin] 다날 웹훅 수신:', req.body);

      // 웹훅 데이터 저장
      // await storage.saveWebhookLog('danal', req.body);

      res.json({ success: true, message: 'Webhook received' });
    } catch (error) {
      logServerError('다날 웹훅 처리 오류:', error, req);
      res.status(500).json({ error: '웹훅 처리에 실패했습니다' });
    }
  });

  // 권한별 결제 통계
  app.get("/api/admin/payment/stats/by-role", async (req, res) => {
    try {
      if (!req.isAuthenticated() || req.user?.role !== 'admin') {
        return res.status(403).json({ error: '관리자 권한이 필요합니다' });
      }

      // 권한별 결제 통계 임시 데이터
      const stats = {
        pet_owner: {
          totalAmount: 150000,
          transactionCount: 25,
          successRate: 95.2
        },
        trainer: {
          totalAmount: 75000,
          transactionCount: 12,
          successRate: 91.7
        },
        institute_admin: {
          totalAmount: 300000,
          transactionCount: 8,
          successRate: 100.0
        }
      };

      res.json(stats);
    } catch (error) {
      logServerError('권한별 결제 통계 조회 오류:', error, req);
      res.status(500).json({ error: '서버 오류가 발생했습니다' });
    }
  });

  console.log('[PaymentAdminRoutes] 관리자 결제 관리 라우트 등록 완료');
}
