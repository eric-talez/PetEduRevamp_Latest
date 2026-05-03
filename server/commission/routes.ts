import { Express, Request, Response, NextFunction } from "express";
import { storage } from "../storage";
import { recordAuditLog, logServerError } from "../middleware/audit-logger";

function requireAdmin(req: any, res: Response, next: NextFunction) {
  const user = req.user || req.session?.user;
  if (!user) {
    return res.status(401).json({ success: false, message: '로그인이 필요합니다.' });
  }
  if (user.role !== 'admin' && user.role !== 'super-admin') {
    return res.status(403).json({ success: false, message: '관리자 권한이 필요합니다.' });
  }
  next();
}

export function setupCommissionRoutes(app: Express) {
  // 정산 승인 API 라우트 (관리자 전용)
  app.post("/api/commission/settlements/:id/approve", requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id);
    const { referrerId, amount, period } = req.body || {};
    try {
      console.log(`[정산 승인] ID: ${id}, 추천인: ${referrerId}, 금액: ${amount}원, 기간: ${period}`);

      // 실제 정산 처리 로직 (시뮬레이션)
      await new Promise(resolve => setTimeout(resolve, 1000));

      console.log(`[정산 완료] ID: ${id} - 정산 처리 완료`);

      // 성공 시점에 감사 로그 기록
      await recordAuditLog(req, {
        action: 'admin.settlement.approve',
        targetType: 'settlement',
        targetId: id,
        targetName: '추천인 정산',
        payload: { referrerId, amount, period },
        status: 'success',
      });

      res.json({
        success: true,
        message: '정산이 성공적으로 처리되었습니다.',
        settlement: {
          id: id,
          referrerId: referrerId,
          amount: amount,
          period: period,
          status: 'paid',
          processedAt: new Date().toISOString()
        }
      });
    } catch (error: any) {
      logServerError('정산 승인 오류', error, req);
      await recordAuditLog(req, {
        action: 'admin.settlement.approve',
        targetType: 'settlement',
        targetId: id,
        targetName: '추천인 정산',
        payload: { referrerId, amount, period },
        status: 'failure',
        errorMessage: error?.message || String(error),
      });
      res.status(500).json({
        success: false,
        error: error.message || "정산 승인 처리 중 오류가 발생했습니다."
      });
    }
  });
}
