import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { db } from '../db';
import { auditLogs, type InsertAuditLog } from '../../shared/schema';
import { logger } from '../monitoring/logger';
import { desc, and, eq, gte, lte, ilike, sql, type SQL } from 'drizzle-orm';

/**
 * 민감 필드 마스킹 — 비밀번호/토큰/카드 정보 등
 */
const SENSITIVE_KEY_PATTERNS = [
  /password/i,
  /passwd/i,
  /pwd/i,
  /secret/i,
  /token/i,
  /authorization/i,
  /api[_-]?key/i,
  /access[_-]?key/i,
  /refresh[_-]?token/i,
  /session/i,
  /cookie/i,
  /card[_-]?number/i,
  /cardnumber/i,
  /cvc/i,
  /cvv/i,
  /ssn/i,
  /social[_-]?id/i,
  /jwt/i,
  /bearer/i,
];

const MAX_DEPTH = 6;
const MAX_STRING = 4000;

export function maskSensitive(value: any, depth = 0): any {
  if (value == null) return value;
  if (depth > MAX_DEPTH) return '[Truncated]';

  if (typeof value === 'string') {
    return value.length > MAX_STRING ? value.slice(0, MAX_STRING) + '...[truncated]' : value;
  }

  if (Array.isArray(value)) {
    return value.slice(0, 100).map((v) => maskSensitive(v, depth + 1));
  }

  if (typeof value === 'object') {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) {
      if (SENSITIVE_KEY_PATTERNS.some((re) => re.test(k))) {
        out[k] = '***MASKED***';
      } else {
        out[k] = maskSensitive(v, depth + 1);
      }
    }
    return out;
  }

  return value;
}

/**
 * 요청 ID + 사용자/경로 컨텍스트를 첨부하는 미들웨어.
 * 모든 요청에 고유 reqId 를 부여하고 응답 헤더로도 노출.
 */
export function requestContextMiddleware(req: any, res: Response, next: NextFunction) {
  const incoming = req.get('X-Request-Id');
  const requestId = (typeof incoming === 'string' && incoming.length > 0 && incoming.length < 64)
    ? incoming
    : randomUUID();
  req.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);
  next();
}

/**
 * 통합 에러 로깅 helper. console.error 대용.
 */
export function logServerError(message: string, error: unknown, req?: Request) {
  const err: any = error instanceof Error ? error : new Error(String(error));
  logger.error(message, {
    err: err.message,
    stack: err.stack,
    requestId: (req as any)?.requestId,
    userId: (req as any)?.user?.id,
    role: (req as any)?.user?.role,
    method: req?.method,
    url: req?.originalUrl || req?.url,
    ip: req?.ip,
  });
}

/**
 * 감사 로그 기록 — 관리자/민감 행위 전용.
 * payload 는 자동으로 민감 필드 마스킹.
 */
export interface AuditLogParams {
  action: string;
  targetType?: string;
  targetId?: string | number | null;
  targetName?: string | null;
  payload?: Record<string, any> | null;
  status?: 'success' | 'failure';
  errorMessage?: string | null;
}

export async function recordAuditLog(req: Request, params: AuditLogParams): Promise<void> {
  try {
    const user = (req as any).user || (req as any).session?.user;
    const masked = params.payload ? maskSensitive(params.payload) : null;

    const row: InsertAuditLog = {
      actorId: user?.id ?? null,
      actorRole: user?.role ?? null,
      actorName: user?.name ?? user?.username ?? user?.email ?? null,
      action: params.action,
      targetType: params.targetType ?? null,
      targetId: params.targetId != null ? String(params.targetId) : null,
      targetName: params.targetName ?? null,
      payload: masked,
      ip: req.ip ?? null,
      userAgent: req.get('User-Agent') ?? null,
      requestId: (req as any).requestId ?? null,
      route: `${req.method} ${req.originalUrl || req.url}`.slice(0, 200),
      status: params.status ?? 'success',
      errorMessage: params.errorMessage ?? null,
    };

    await db.insert(auditLogs).values(row);
  } catch (err) {
    logServerError('[Audit] 감사 로그 기록 실패', err, req);
  }
}

/**
 * 감사 로그 조회 (관리자 화면용)
 */
export interface ListAuditLogsQuery {
  actorId?: number;
  action?: string;
  targetType?: string;
  search?: string;
  from?: Date;
  to?: Date;
  limit?: number;
  offset?: number;
}

export async function listAuditLogs(q: ListAuditLogsQuery) {
  const conditions: SQL[] = [];
  if (q.actorId) conditions.push(eq(auditLogs.actorId, q.actorId));
  if (q.action) conditions.push(ilike(auditLogs.action, `%${q.action}%`));
  if (q.targetType) conditions.push(eq(auditLogs.targetType, q.targetType));
  if (q.search) {
    conditions.push(sql`(${auditLogs.actorName} ILIKE ${'%' + q.search + '%'} OR ${auditLogs.targetName} ILIKE ${'%' + q.search + '%'} OR ${auditLogs.targetId} ILIKE ${'%' + q.search + '%'})`);
  }
  if (q.from) conditions.push(gte(auditLogs.createdAt, q.from));
  if (q.to) conditions.push(lte(auditLogs.createdAt, q.to));

  const where: SQL | undefined = conditions.length ? and(...conditions) : undefined;
  const limit = Math.min(Math.max(q.limit ?? 50, 1), 200);
  const offset = Math.max(q.offset ?? 0, 0);

  const rowsQuery = db.select().from(auditLogs);
  const rows = await (where ? rowsQuery.where(where) : rowsQuery)
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit)
    .offset(offset);

  const countQuery = db
    .select({ count: sql<number>`count(*)::int` })
    .from(auditLogs);
  const [{ count }] = await (where ? countQuery.where(where) : countQuery);

  return { items: rows, total: count, limit, offset };
}
