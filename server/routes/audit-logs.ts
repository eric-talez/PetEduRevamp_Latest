import type { Express } from 'express';
import { listAuditLogs, logServerError } from '../middleware/audit-logger';

function requireAdmin(req: any, res: any, next: any) {
  if (!req.user) {
    return res.status(401).json({ success: false, message: '로그인이 필요합니다.' });
  }
  if (req.user.role !== 'admin' && req.user.role !== 'super-admin') {
    return res.status(403).json({ success: false, message: '관리자 권한이 필요합니다.' });
  }
  next();
}

export function registerAuditLogRoutes(app: Express) {
  app.get('/api/admin/audit-logs', requireAdmin, async (req, res) => {
    try {
      const {
        actorId,
        action,
        targetType,
        search,
        from,
        to,
        limit,
        offset,
      } = req.query as Record<string, string | undefined>;

      const result = await listAuditLogs({
        actorId: actorId ? parseInt(actorId, 10) : undefined,
        action: action || undefined,
        targetType: targetType || undefined,
        search: search || undefined,
        from: from ? new Date(from) : undefined,
        to: to ? new Date(to) : undefined,
        limit: limit ? parseInt(limit, 10) : 50,
        offset: offset ? parseInt(offset, 10) : 0,
      });

      res.json({ success: true, ...result });
    } catch (error) {
      logServerError('[AuditLogs] 조회 오류', error, req);
      res.status(500).json({ success: false, message: '감사 로그 조회에 실패했습니다.' });
    }
  });
}
