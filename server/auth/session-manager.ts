/**
 * session-manager.ts
 *
 * 사용자 활성 세션 추적 / 자동 로그아웃 / 다중 기기 관리 서비스.
 * Express 세션 ID와 1:1 대응되는 user_sessions 행을 통해
 *  - 마지막 활동 시각, 만료 시각을 추적하고
 *  - 강제 로그아웃(revoke) 시 다음 요청부터 거부합니다.
 */
import type { Request, Response, NextFunction } from "express";
import { db } from "../db";
import { userSessions, type UserSession, type User } from "../../shared/schema";
import { and, eq, isNull, desc, ne, gt, lt, or, isNotNull, sql as drizzleSql } from "drizzle-orm";
import { logServerError } from '../middleware/audit-logger';

type AuthedUser = Pick<User, "id">;
function getUserId(req: Request): number | undefined {
  const u = req.user as AuthedUser | undefined;
  return typeof u?.id === "number" ? u.id : undefined;
}

// 30분 유휴 시 자동 로그아웃
export const IDLE_TIMEOUT_MS = 30 * 60 * 1000;
// 활동 갱신 throttle (DB 쓰기 줄이기 위해 1분 단위)
const ACTIVITY_UPDATE_THROTTLE_MS = 60 * 1000;

const recentActivityTouch = new Map<string, number>();

function parseDeviceLabel(ua: string | undefined): string {
  if (!ua) return "알 수 없는 기기";
  const lower = ua.toLowerCase();
  let os = "Unknown OS";
  if (lower.includes("windows")) os = "Windows";
  else if (lower.includes("iphone") || lower.includes("ios")) os = "iPhone";
  else if (lower.includes("ipad")) os = "iPad";
  else if (lower.includes("android")) os = "Android";
  else if (lower.includes("mac os") || lower.includes("macintosh")) os = "macOS";
  else if (lower.includes("linux")) os = "Linux";

  let browser = "Browser";
  if (lower.includes("edg/")) browser = "Edge";
  else if (lower.includes("chrome/") && !lower.includes("edg/")) browser = "Chrome";
  else if (lower.includes("safari/") && !lower.includes("chrome/")) browser = "Safari";
  else if (lower.includes("firefox/")) browser = "Firefox";
  else if (lower.includes("kakaotalk")) browser = "KakaoTalk";
  else if (lower.includes("naver")) browser = "Naver App";

  return `${os} · ${browser}`;
}

function clientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0].trim();
  }
  return req.ip || "";
}

/**
 * 시작 시 user_sessions 테이블 존재 보장 + 인덱스. 실패 시 throw.
 * (drizzle-kit push가 interactive 환경에서 동작 불가하여 idempotent SQL로 보장)
 */
export async function ensureUserSessionsSchema(): Promise<void> {
  await db.execute(drizzleSql`
    CREATE TABLE IF NOT EXISTS user_sessions (
      id SERIAL PRIMARY KEY,
      session_id TEXT NOT NULL UNIQUE,
      user_id INTEGER NOT NULL,
      user_agent TEXT,
      ip_address TEXT,
      device_label TEXT,
      last_activity TIMESTAMP NOT NULL DEFAULT NOW(),
      expires_at TIMESTAMP NOT NULL,
      revoked_at TIMESTAMP,
      revoked_reason TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  await db.execute(drizzleSql`CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id)`);
  await db.execute(drizzleSql`CREATE INDEX IF NOT EXISTS idx_user_sessions_session_id ON user_sessions(session_id)`);

  // 검증: 컬럼이 모두 존재하는지 확인 — 없으면 throw해서 startup 실패
  const result = await db.execute(drizzleSql`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'user_sessions'
  `);
  const rows = (result as { rows?: Array<{ column_name: string }> }).rows || [];
  const cols = new Set(rows.map((r) => r.column_name));
  const required = ["session_id", "user_id", "last_activity", "expires_at", "revoked_at"];
  for (const c of required) {
    if (!cols.has(c)) {
      throw new Error(`[SessionManager] user_sessions 스키마 검증 실패: ${c} 컬럼 없음`);
    }
  }
  console.log("[SessionManager] user_sessions 스키마 검증 완료");
}

/**
 * 로그인 직후 호출. 새로운 세션 행을 만들거나 기존 행을 갱신합니다.
 * 동시 로그인 정책: 신규 로그인 시 같은 사용자의 다른 활성 세션을 모두 revoke 처리.
 */
export async function registerLoginSession(req: Request, userId: number): Promise<void> {
  if (!req.sessionID) return;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + IDLE_TIMEOUT_MS);
  const userAgent = (req.headers["user-agent"] as string | undefined) || "";
  const deviceLabel = parseDeviceLabel(userAgent);
  const ip = clientIp(req).slice(0, 64);

  try {
    // 동시 로그인 정책: 같은 사용자의 다른 활성 세션을 모두 revoke
    await db
      .update(userSessions)
      .set({ revokedAt: now, revokedReason: "concurrent_login" })
      .where(
        and(
          eq(userSessions.userId, userId),
          ne(userSessions.sessionId, req.sessionID),
          isNull(userSessions.revokedAt),
        ),
      );

    const existing = await db
      .select()
      .from(userSessions)
      .where(eq(userSessions.sessionId, req.sessionID))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(userSessions)
        .set({
          userId,
          userAgent,
          deviceLabel,
          ipAddress: ip,
          lastActivity: now,
          expiresAt,
          revokedAt: null,
          revokedReason: null,
        })
        .where(eq(userSessions.sessionId, req.sessionID));
    } else {
      await db.insert(userSessions).values({
        sessionId: req.sessionID,
        userId,
        userAgent,
        deviceLabel,
        ipAddress: ip,
        lastActivity: now,
        expiresAt,
      });
    }
    recentActivityTouch.set(req.sessionID, now.getTime());
  } catch (error) {
    logServerError("[SessionManager] 로그인 세션 등록 오류:", error, req);
  }
}

/**
 * 인증된 요청에서 세션 활동 시각을 갱신하거나, 만료/취소된 세션을 거부합니다.
 */
export function activitySessionMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  // 인증되지 않은 경로는 통과 (로그인/회원가입 등은 자유롭게 통과)
  const isAuthFn = (req as Request & { isAuthenticated?: () => boolean }).isAuthenticated;
  const authed = typeof isAuthFn === "function" && isAuthFn.call(req);
  const userId = getUserId(req);
  if (!authed || !req.sessionID || userId === undefined) {
    return next();
  }

  void (async () => {
    try {
      const sessionId = req.sessionID;
      const rows = await db
        .select()
        .from(userSessions)
        .where(eq(userSessions.sessionId, sessionId))
        .limit(1);

      const now = new Date();
      const row = rows[0];

      if (!row) {
        // 세션이 user_sessions에 없으면(예: 마이그레이션 이전 세션) 새로 등록
        await registerLoginSession(req, userId);
        return next();
      }

      // 강제 로그아웃 처리
      if (row.revokedAt) {
        return destroyAndReject(req, res, "이 세션은 로그아웃 처리되었습니다.", "revoked");
      }

      // 유휴 만료 처리
      const lastActivityMs = row.lastActivity ? new Date(row.lastActivity).getTime() : 0;
      const idleMs = now.getTime() - lastActivityMs;
      if (idleMs > IDLE_TIMEOUT_MS) {
        await markRevoked(row.id, "idle");
        return destroyAndReject(req, res, "장시간 사용하지 않아 자동 로그아웃되었습니다.", "idle");
      }

      // throttle된 활동 갱신
      const last = recentActivityTouch.get(sessionId) || 0;
      if (now.getTime() - last > ACTIVITY_UPDATE_THROTTLE_MS) {
        recentActivityTouch.set(sessionId, now.getTime());
        await db
          .update(userSessions)
          .set({
            lastActivity: now,
            expiresAt: new Date(now.getTime() + IDLE_TIMEOUT_MS),
          })
          .where(eq(userSessions.id, row.id));
      }

      next();
    } catch (error) {
      logServerError("[SessionManager] activitySessionMiddleware 오류:", error, req);
      next();
    }
  })();
}

function destroyAndReject(req: Request, res: Response, message: string, reason: string) {
  recentActivityTouch.delete(req.sessionID || "");
  const sendResponse = () => {
    res.clearCookie("talez.sid");
    res.status(401).json({
      success: false,
      code: "SESSION_EXPIRED",
      reason,
      message,
    });
  };
  const logoutFn = (req as Request & { logout?: (cb: (err?: unknown) => void) => void })
    .logout;
  if (typeof logoutFn === "function") {
    try {
      logoutFn.call(req, () => {
        req.session?.destroy(sendResponse);
      });
      return;
    } catch {
      // fallthrough
    }
  }
  req.session?.destroy(sendResponse);
}

async function markRevoked(id: number, reason: string) {
  try {
    await db
      .update(userSessions)
      .set({ revokedAt: new Date(), revokedReason: reason })
      .where(eq(userSessions.id, id));
  } catch (error) {
    logServerError("[SessionManager] markRevoked 오류:", error);
  }
}

/**
 * 현재 사용자의 활성 세션 목록 조회 (현재 세션 표시 포함)
 */
export async function listActiveSessions(userId: number, currentSessionId?: string) {
  const idleThreshold = new Date(Date.now() - IDLE_TIMEOUT_MS);
  const rows = await db
    .select()
    .from(userSessions)
    .where(
      and(
        eq(userSessions.userId, userId),
        isNull(userSessions.revokedAt),
        gt(userSessions.lastActivity, idleThreshold),
        gt(userSessions.expiresAt, new Date()),
      ),
    )
    .orderBy(desc(userSessions.lastActivity));

  return rows.map((row) => ({
    id: row.id,
    deviceLabel: row.deviceLabel || "알 수 없는 기기",
    userAgent: row.userAgent,
    ipAddress: row.ipAddress,
    lastActivity: row.lastActivity,
    expiresAt: row.expiresAt,
    createdAt: row.createdAt,
    isCurrent: !!currentSessionId && row.sessionId === currentSessionId,
  }));
}

/**
 * 특정 세션 강제 종료 (현재 세션 제외 가능)
 */
export async function revokeSessionById(
  userId: number,
  sessionRowId: number,
  reason: string = "manual",
): Promise<UserSession | null> {
  const rows = await db
    .select()
    .from(userSessions)
    .where(and(eq(userSessions.id, sessionRowId), eq(userSessions.userId, userId)))
    .limit(1);
  if (!rows[0]) return null;
  await markRevoked(sessionRowId, reason);
  return rows[0];
}

/**
 * 로그아웃 시 현재 세션을 즉시 revoke 처리
 */
export async function revokeCurrentSession(sessionId: string | undefined, reason: string = "logout") {
  if (!sessionId) return;
  recentActivityTouch.delete(sessionId);
  try {
    await db
      .update(userSessions)
      .set({ revokedAt: new Date(), revokedReason: reason })
      .where(eq(userSessions.sessionId, sessionId));
  } catch (error) {
    logServerError("[SessionManager] revokeCurrentSession 오류:", error);
  }
}

/**
 * 만료/폐기된 user_sessions 행을 정리합니다.
 * - expires_at이 retentionDays일 이전인 행
 * - revoked_at이 retentionDays일 이전인 행
 * 두 조건 중 하나라도 만족하는 행을 삭제합니다.
 */
export async function cleanupExpiredUserSessions(retentionDays: number = 7): Promise<number> {
  const threshold = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
  try {
    const result = await db
      .delete(userSessions)
      .where(
        or(
          lt(userSessions.expiresAt, threshold),
          and(isNotNull(userSessions.revokedAt), lt(userSessions.revokedAt, threshold)),
        ),
      )
      .returning({ id: userSessions.id });
    const deleted = result.length;
    console.log(
      `[SessionManager] 오래된 세션 정리 완료: ${deleted}건 삭제 (기준: ${retentionDays}일, threshold=${threshold.toISOString()})`,
    );
    // 메모리 캐시도 정리 (만료된 세션 ID 제거)
    if (deleted > 0) {
      const now = Date.now();
      for (const [sid, ts] of recentActivityTouch.entries()) {
        if (now - ts > IDLE_TIMEOUT_MS) recentActivityTouch.delete(sid);
      }
    }
    return deleted;
  } catch (error) {
    logServerError("[SessionManager] cleanupExpiredUserSessions 오류:", error);
    return 0;
  }
}

let cleanupTimer: NodeJS.Timeout | null = null;

/**
 * 주기적으로 cleanupExpiredUserSessions를 실행하는 스케줄러.
 * 기본값: 24시간마다, 만료/폐기 후 7일 지난 행 삭제.
 * 서버 시작 직후 1회 즉시 실행.
 */
export function startUserSessionCleanupScheduler(options?: {
  intervalMs?: number;
  retentionDays?: number;
}): void {
  const intervalMs = options?.intervalMs ?? 24 * 60 * 60 * 1000;
  const retentionDays = options?.retentionDays ?? 7;

  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
  }

  console.log(
    `[SessionManager] 세션 정리 스케줄러 시작 (주기: ${Math.round(intervalMs / 1000 / 60)}분, 보관: ${retentionDays}일)`,
  );

  // 시작 시 1회 즉시 실행
  void cleanupExpiredUserSessions(retentionDays);

  cleanupTimer = setInterval(() => {
    void cleanupExpiredUserSessions(retentionDays);
  }, intervalMs);

  // Node가 이 타이머 때문에 종료되지 않도록 unref
  if (typeof cleanupTimer.unref === "function") cleanupTimer.unref();
}

export function stopUserSessionCleanupScheduler(): void {
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
  }
}

/**
 * 세션 활동 갱신만 수행 (heartbeat용)
 */
export async function touchSessionActivity(sessionId: string | undefined) {
  if (!sessionId) return;
  const now = new Date();
  recentActivityTouch.set(sessionId, now.getTime());
  try {
    await db
      .update(userSessions)
      .set({
        lastActivity: now,
        expiresAt: new Date(now.getTime() + IDLE_TIMEOUT_MS),
      })
      .where(eq(userSessions.sessionId, sessionId));
  } catch (error) {
    logServerError("[SessionManager] touchSessionActivity 오류:", error);
  }
}
