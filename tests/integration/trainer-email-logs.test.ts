/**
 * 트레이너 수료증 이메일 발송 내역 / 재발송 요청 라우트 통합 테스트
 *
 * 검증 대상:
 *   - GET  /api/trainer/email-logs/certificates
 *       → 본인 코스(trainerId === 본인) 발송 건만 응답에 포함되어야 한다.
 *       → listEmailLogs 호출 시 templateKey/trainerId 필터가 항상 주입되어야 한다.
 *   - POST /api/trainer/email-logs/:id/request-resend
 *       → 본인 코스가 아닌 발송 건은 403
 *       → 본인 코스 + status=failed + 수료증 템플릿이면 모든 admin 에게
 *         notificationService.sendNotification 이 호출되어야 한다.
 *
 * 외부 의존성(DB / SendGrid / 이메일 서비스 내부)은 인-메모리 스텁으로 대체한다.
 */

process.env.NODE_ENV = 'test';
process.env.SESSION_SECRET = 'test-session-secret';

interface FakeEmailLog {
  id: number;
  recipient: string;
  templateKey: string;
  status: string;
  payload: Record<string, any>;
}

const store = {
  emailLogs: [] as FakeEmailLog[],
  users: [] as Array<{ id: number; role: string }>,
};

const listEmailLogsMock = jest.fn(async (q: any) => {
  let rows = store.emailLogs.slice();
  if (q.templateKey) rows = rows.filter((r) => r.templateKey === q.templateKey);
  if (q.status) rows = rows.filter((r) => r.status === q.status);
  if (q.trainerId !== undefined && q.trainerId !== null) {
    rows = rows.filter(
      (r) => Number(r.payload?.trainerId) === Number(q.trainerId),
    );
  }
  return { logs: rows, total: rows.length };
});

jest.mock('../../server/services/email-service', () => ({
  __esModule: true,
  ensureEmailSystemInitialized: jest.fn(async () => undefined),
  queueEmail: jest.fn(),
  listEmailLogs: (q: any) => listEmailLogsMock(q),
  resendEmail: jest.fn(),
  previewTemplate: jest.fn(),
  getEmailServiceStatus: jest.fn(() => ({ ok: true })),
}));

const sendNotificationMock = jest.fn(async () => undefined);

jest.mock('../../server/notifications/notification-service', () => ({
  __esModule: true,
  notificationService: {
    sendNotification: (...args: unknown[]) => sendNotificationMock(...(args as [unknown])),
  },
}));

jest.mock('drizzle-orm', () => {
  const actual = jest.requireActual('drizzle-orm');
  return {
    ...actual,
    // route 코드가 사용하는 eq 만 가로채 모의 db 가 해석할 수 있는
    // 단순 객체로 변환한다. 그 외 헬퍼는 실제 구현을 그대로 사용한다.
    eq: (column: any, value: any) => ({ __op: 'eq', column, value }),
  };
});

jest.mock('../../server/db', () => {
  type AnyRow = Record<string, unknown>;
  const tableArrays = new Map<unknown, AnyRow[]>();
  const tableColumns = new Map<unknown, Record<string, unknown>>();
  let bound = false;
  function ensureBound(): void {
    if (bound) return;
    const schema = require('../../shared/schema');
    tableArrays.set(schema.emailLogs, store.emailLogs as unknown as AnyRow[]);
    tableArrays.set(schema.users, store.users as unknown as AnyRow[]);
    tableArrays.set(schema.emailTemplates, [] as AnyRow[]);
    tableArrays.set(schema.emailNotificationPreferences, [] as AnyRow[]);
    tableColumns.set(schema.emailLogs, {
      id: 'id',
      status: 'status',
      templateKey: 'templateKey',
      recipient: 'recipient',
    });
    tableColumns.set(schema.users, { id: 'id', role: 'role' });
    bound = true;
  }
  function resolveTable(t: unknown): AnyRow[] {
    ensureBound();
    return tableArrays.get(t) ?? [];
  }
  function columnKey(table: unknown, column: any): string | null {
    ensureBound();
    const cols = tableColumns.get(table);
    if (!cols) return null;
    for (const [k, v] of Object.entries(cols)) {
      if (v === column || k === column) return k;
    }
    // drizzle Column 객체에서 name 속성으로 매칭 시도
    if (column && typeof column === 'object' && 'name' in column) {
      const name = (column as any).name;
      for (const k of Object.keys(cols)) {
        if (k === name || k.toLowerCase() === String(name).toLowerCase()) return k;
      }
    }
    return null;
  }

  // 라우트 내부에서 사용되는 패턴:
  //   db.select().from(emailLogs).where(eq(emailLogs.id, id)).limit(1)
  //   db.select({id: users.id}).from(users).where(eq(users.role, 'admin'))
  // where 절의 eq() 표현을 실제로 평가하여 행을 필터링한다.
  const db = {
    select: (_cols?: unknown) => {
      let arr: AnyRow[] = [];
      let table: unknown = null;
      const filters: Array<(r: AnyRow) => boolean> = [];
      const chain: any = {
        from: (t: unknown) => {
          table = t;
          arr = resolveTable(t);
          return chain;
        },
        where: (cond: any) => {
          if (cond && cond.__op === 'eq') {
            const key = columnKey(table, cond.column);
            const expected = cond.value;
            if (key) {
              filters.push((r) => (r as any)[key] === expected);
            }
          }
          return chain;
        },
        applyFilters: () => {
          let result = arr.slice();
          for (const f of filters) result = result.filter(f);
          return result;
        },
        limit: (n: number) => Promise.resolve(chain.applyFilters().slice(0, n)),
        then: (resolve: (v: AnyRow[]) => void) => resolve(chain.applyFilters()),
      };
      return chain;
    },
  };
  return { db, pgPool: { query: jest.fn() }, mariaPool: { query: jest.fn() } };
});

import express from 'express';
import request from 'supertest';
import { registerEmailNotificationRoutes } from '../../server/routes/email-notifications';

function buildApp(user: { id: number; role: string; name?: string; email?: string } | null) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    if (user) (req as any).user = user;
    next();
  });
  registerEmailNotificationRoutes(app);
  return app;
}

const TRAINER_A = { id: 11, role: 'trainer', name: '트레이너 A', email: 'a@t.com' };
const TRAINER_B = { id: 22, role: 'trainer', name: '트레이너 B', email: 'b@t.com' };

function seedLogs() {
  store.emailLogs.length = 0;
  store.emailLogs.push(
    {
      id: 1,
      recipient: 'guardian1@example.com',
      templateKey: 'course_completion_certificate',
      status: 'sent',
      payload: { trainerId: TRAINER_A.id, courseId: 100, courseTitle: '코스 A1' },
    },
    {
      id: 2,
      recipient: 'guardian2@example.com',
      templateKey: 'course_completion_certificate',
      status: 'failed',
      payload: { trainerId: TRAINER_A.id, courseId: 100, courseTitle: '코스 A2' },
    },
    {
      id: 3,
      recipient: 'guardian3@example.com',
      templateKey: 'course_completion_certificate',
      status: 'failed',
      payload: { trainerId: TRAINER_B.id, courseId: 200, courseTitle: '코스 B1' },
    },
    {
      id: 4,
      recipient: 'noisy@example.com',
      templateKey: 'payment_receipt',
      status: 'sent',
      payload: { trainerId: TRAINER_A.id },
    },
  );
  store.users.length = 0;
  store.users.push(
    { id: 99, role: 'admin' },
    { id: 98, role: 'admin' },
    { id: TRAINER_A.id, role: 'trainer' },
    { id: TRAINER_B.id, role: 'trainer' },
  );
}

describe('트레이너 수료증 이메일 발송 내역 라우트', () => {
  beforeEach(() => {
    listEmailLogsMock.mockClear();
    sendNotificationMock.mockClear();
    seedLogs();
  });

  describe('GET /api/trainer/email-logs/certificates', () => {
    it('인증되지 않은 요청은 401 을 반환한다', async () => {
      const app = buildApp(null);
      const res = await request(app).get('/api/trainer/email-logs/certificates');
      expect(res.status).toBe(401);
    });

    it('일반 사용자(pet-owner)는 403 을 반환한다', async () => {
      const app = buildApp({ id: 5, role: 'pet-owner' });
      const res = await request(app).get('/api/trainer/email-logs/certificates');
      expect(res.status).toBe(403);
    });

    it('트레이너 본인 코스의 수료증 발송 건만 반환한다', async () => {
      const app = buildApp(TRAINER_A);
      const res = await request(app).get('/api/trainer/email-logs/certificates');
      expect(res.status).toBe(200);

      // listEmailLogs 호출 시 항상 trainerId/templateKey 필터가 주입되어야 한다.
      expect(listEmailLogsMock).toHaveBeenCalledTimes(1);
      const callArg = listEmailLogsMock.mock.calls[0][0];
      expect(callArg.templateKey).toBe('course_completion_certificate');
      expect(callArg.trainerId).toBe(TRAINER_A.id);

      const ids = (res.body.logs as Array<{ id: number }>).map((l) => l.id).sort();
      expect(ids).toEqual([1, 2]);
      // 다른 트레이너(B) 의 건과 다른 템플릿(payment_receipt) 은 제외되어야 한다.
      expect(ids).not.toContain(3);
      expect(ids).not.toContain(4);
      expect(res.body.total).toBe(2);
    });

    it('status 쿼리 파라미터가 listEmailLogs 로 그대로 전달된다', async () => {
      const app = buildApp(TRAINER_A);
      const res = await request(app)
        .get('/api/trainer/email-logs/certificates')
        .query({ status: 'failed' });
      expect(res.status).toBe(200);
      const callArg = listEmailLogsMock.mock.calls[0][0];
      expect(callArg.status).toBe('failed');
      expect(callArg.trainerId).toBe(TRAINER_A.id);
      const ids = (res.body.logs as Array<{ id: number }>).map((l) => l.id);
      expect(ids).toEqual([2]);
    });
  });

  describe('POST /api/trainer/email-logs/:id/request-resend', () => {
    it('잘못된 id 는 400 을 반환한다', async () => {
      const app = buildApp(TRAINER_A);
      const res = await request(app).post('/api/trainer/email-logs/abc/request-resend');
      expect(res.status).toBe(400);
    });

    it('존재하지 않는 로그는 404 를 반환한다', async () => {
      const app = buildApp(TRAINER_A);
      const res = await request(app).post('/api/trainer/email-logs/9999/request-resend');
      expect(res.status).toBe(404);
      expect(sendNotificationMock).not.toHaveBeenCalled();
    });

    it('본인 코스가 아닌 실패 건에 대해 403 을 반환하고 알림이 생성되지 않는다', async () => {
      const app = buildApp(TRAINER_A);
      const res = await request(app).post('/api/trainer/email-logs/3/request-resend');
      expect(res.status).toBe(403);
      expect(sendNotificationMock).not.toHaveBeenCalled();
    });

    it('수료증 템플릿이 아닌 건은 400 을 반환한다', async () => {
      const app = buildApp(TRAINER_A);
      const res = await request(app).post('/api/trainer/email-logs/4/request-resend');
      expect(res.status).toBe(400);
      expect(sendNotificationMock).not.toHaveBeenCalled();
    });

    it('status 가 failed 가 아닌 본인 건은 400 을 반환한다', async () => {
      const app = buildApp(TRAINER_A);
      const res = await request(app).post('/api/trainer/email-logs/1/request-resend');
      expect(res.status).toBe(400);
      expect(sendNotificationMock).not.toHaveBeenCalled();
    });

    it('본인 코스의 실패한 수료증 건은 모든 admin 에게 알림을 생성한다', async () => {
      const app = buildApp(TRAINER_A);
      const res = await request(app).post('/api/trainer/email-logs/2/request-resend');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // 시드된 admin 2명에게 모두 알림이 전송되어야 한다.
      expect(sendNotificationMock).toHaveBeenCalledTimes(2);
      const calls = sendNotificationMock.mock.calls.map((c) => c[0] as any);
      const adminIds = calls.map((c) => c.userId).sort();
      expect(adminIds).toEqual([98, 99]);
      for (const payload of calls) {
        expect(payload.type).toBe('system');
        expect(payload.title).toBe('수료증 이메일 재발송 요청');
        expect(payload.message).toContain('코스 A2');
        expect(payload.message).toContain('guardian2@example.com');
        expect(payload.actionUrl).toBe('/admin/email-notifications');
        expect(payload.data).toMatchObject({
          source: 'trainer-cert-resend-request',
          emailLogId: 2,
          trainerId: TRAINER_A.id,
          recipient: 'guardian2@example.com',
          courseId: 100,
        });
      }
    });
  });
});
