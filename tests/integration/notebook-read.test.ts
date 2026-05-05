/**
 * Task #110: 알림장 읽음 처리 API 회귀 테스트.
 *
 * 다음 4개 시나리오를 server/routes/notebook-read.ts 의 실제 핸들러로 검증한다:
 *   1) readAt 불변성
 *   2) lastViewedAt 단조 증가
 *   3) PATCH /api/notebook/entries/:id/read 의 OWNER_ONLY 차단
 *   4) GET  /api/trainer/journals/unread-count 의 정확성
 */

jest.mock('@neondatabase/serverless', () => {
  class FakePool {
    on() {}
    query() { return Promise.resolve({ rows: [], rowCount: 0 }); }
    connect() { return Promise.resolve({ release() {}, query: this.query }); }
    end() { return Promise.resolve(); }
  }
  return { Pool: FakePool, neonConfig: {}, neon: () => () => Promise.resolve([]) };
});

jest.mock('drizzle-orm/neon-serverless', () => {
  type Chain = (...args: unknown[]) => Chain;
  const handler: ProxyHandler<Chain> = {
    get: (_t, prop) => {
      if (prop === 'then') return (resolve: (v: unknown) => unknown) => Promise.resolve([]).then(resolve);
      return chain;
    },
    apply: () => chain,
  };
  const chain: Chain = new Proxy(((() => chain) as Chain), handler);
  return { drizzle: () => chain };
});

jest.mock('drizzle-orm/mysql2', () => ({ drizzle: () => ({}) }));
jest.mock('mysql2/promise', () => ({
  createPool: () => ({ query: async () => [[], []], end: async () => undefined }),
}));

import express, { type NextFunction, type Request, type RequestHandler, type Response } from 'express';
import request from 'supertest';
import { storage } from '../../server/storage';
import { registerNotebookReadRoutes } from '../../server/routes/notebook-read';

interface SessionUser { id: number; role: 'pet-owner' | 'trainer' | 'admin' }

interface TestJournal {
  id: number;
  trainerId: number;
  petOwnerId: number;
  petId: number;
  title: string;
  isRead: boolean;
  readAt: string | null;
  lastViewedAt: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface StorageWithJournals {
  trainingJournals?: TestJournal[];
}

function journalsList(): TestJournal[] {
  const s = storage as unknown as StorageWithJournals;
  if (!s.trainingJournals) s.trainingJournals = [];
  return s.trainingJournals;
}

function makeJournal(overrides: Partial<TestJournal> = {}): TestJournal {
  const id = Math.floor(Date.now() % 1_000_000) + Math.floor(Math.random() * 1_000_000);
  const now = new Date().toISOString();
  const j: TestJournal = {
    id,
    trainerId: 99001,
    petOwnerId: 88001,
    petId: 1,
    title: '테스트 일지',
    isRead: false,
    readAt: null,
    lastViewedAt: null,
    status: 'unread',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
  journalsList().push(j);
  return j;
}

function removeJournal(id: number): void {
  const list = journalsList();
  const idx = list.findIndex((j) => j.id === id);
  if (idx !== -1) list.splice(idx, 1);
}

function spin(ms: number): void {
  const end = Date.now() + ms;
  while (Date.now() < end) { /* advance wall clock */ }
}

/**
 * server/routes.ts 의 requireAuth 와 동일한 401/403 응답 계약을 가진 팩토리.
 * 테스트마다 주입된 세션 유저를 기준으로 통과/차단을 결정한다.
 */
function makeRequireAuth(getUser: () => SessionUser | null) {
  return (...allowedRoles: string[]): RequestHandler => (req, res, next) => {
    const u = getUser();
    if (!u) {
      return res.status(401).json({
        error: '인증이 필요합니다. 로그인 후 다시 시도해주세요.',
        code: 'AUTHENTICATION_REQUIRED',
      });
    }
    if (allowedRoles.length > 0 && !allowedRoles.includes(u.role)) {
      return res.status(403).json({
        error: `다음 권한 중 하나가 필요합니다: ${allowedRoles.join(', ')}`,
        code: 'INSUFFICIENT_PERMISSIONS',
      });
    }
    (req as Request & { session: { user: SessionUser } }).session = { user: u } as never;
    next();
  };
}

function buildTestApp(getUser: () => SessionUser | null): express.Express {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next: NextFunction) => {
    const u = getUser();
    (req as Request & { session: { user?: SessionUser } }).session =
      (u ? { user: u } : {}) as never;
    next();
  });
  registerNotebookReadRoutes(app, makeRequireAuth(getUser));
  return app;
}

describe('알림장 읽음 처리 회귀 테스트 (Task #110)', () => {
  describe('storage.markJournalRead', () => {
    it('1) readAt 은 최초 1회만 기록되고 두 번째 호출에서도 변경되지 않는다', () => {
      const j = makeJournal();
      try {
        const first = storage.markJournalRead(j.id);
        expect(first).not.toBeNull();
        expect(first!.isRead).toBe(true);
        expect(first!.readAt).toBeTruthy();
        const firstReadAt = first!.readAt;

        spin(5);

        const second = storage.markJournalRead(j.id);
        expect(second).not.toBeNull();
        expect(second!.readAt).toBe(firstReadAt);
      } finally {
        removeJournal(j.id);
      }
    });

    it('2) lastViewedAt 은 호출마다 갱신되며 이전보다 작아지지 않는다', () => {
      const j = makeJournal();
      try {
        const t1 = new Date(storage.markJournalRead(j.id)!.lastViewedAt).getTime();
        spin(8);
        const t2 = new Date(storage.markJournalRead(j.id)!.lastViewedAt).getTime();
        expect(t2).toBeGreaterThanOrEqual(t1);
        spin(8);
        const t3 = new Date(storage.markJournalRead(j.id)!.lastViewedAt).getTime();
        expect(t3).toBeGreaterThanOrEqual(t2);
      } finally {
        removeJournal(j.id);
      }
    });

    it('존재하지 않는 일지에 대해서는 null 을 반환한다', () => {
      expect(storage.markJournalRead(-987654)).toBeNull();
    });
  });

  describe('PATCH /api/notebook/entries/:id/read (OWNER_ONLY)', () => {
    it('3a) 본인 펫의 보호자는 200 + readAt/lastViewedAt 을 받는다', async () => {
      const owner: SessionUser = { id: 77001, role: 'pet-owner' };
      const j = makeJournal({ petOwnerId: owner.id });
      try {
        const res = await request(buildTestApp(() => owner))
          .patch(`/api/notebook/entries/${j.id}/read`);
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.isRead).toBe(true);
        expect(res.body.data.readAt).toBeTruthy();
        expect(res.body.data.lastViewedAt).toBeTruthy();
      } finally {
        removeJournal(j.id);
      }
    });

    it('3b) 트레이너 역할은 403 + OWNER_ONLY 로 차단된다', async () => {
      const trainer: SessionUser = { id: 77002, role: 'trainer' };
      const j = makeJournal();
      try {
        const res = await request(buildTestApp(() => trainer))
          .patch(`/api/notebook/entries/${j.id}/read`);
        expect(res.status).toBe(403);
        expect(res.body.code).toBe('OWNER_ONLY');
      } finally {
        removeJournal(j.id);
      }
    });

    it('3c) 관리자(admin) 역할도 403 + OWNER_ONLY 로 차단된다', async () => {
      const admin: SessionUser = { id: 77003, role: 'admin' };
      const j = makeJournal();
      try {
        const res = await request(buildTestApp(() => admin))
          .patch(`/api/notebook/entries/${j.id}/read`);
        expect(res.status).toBe(403);
        expect(res.body.code).toBe('OWNER_ONLY');
      } finally {
        removeJournal(j.id);
      }
    });

    it('3d) 다른 보호자가 본인 펫이 아닌 알림장을 호출하면 403 + OWNER_ONLY', async () => {
      const owner: SessionUser = { id: 77004, role: 'pet-owner' };
      const j = makeJournal({ petOwnerId: 99999 });
      try {
        const res = await request(buildTestApp(() => owner))
          .patch(`/api/notebook/entries/${j.id}/read`);
        expect(res.status).toBe(403);
        expect(res.body.code).toBe('OWNER_ONLY');
      } finally {
        removeJournal(j.id);
      }
    });

    it('비인증 호출은 401 을 반환한다', async () => {
      const j = makeJournal();
      try {
        const res = await request(buildTestApp(() => null))
          .patch(`/api/notebook/entries/${j.id}/read`);
        expect(res.status).toBe(401);
        expect(res.body.code).toBe('AUTHENTICATION_REQUIRED');
      } finally {
        removeJournal(j.id);
      }
    });
  });

  describe('GET /api/trainer/journals/unread-count', () => {
    it('4) 트레이너별 미읽음 카운트를 정확히 반환하고, 읽음 처리 후 감소한다', async () => {
      const trainerId = 66001;
      const otherTrainerId = 66002;
      const ownerId = 55001;
      const baseline = storage.getUnreadJournalCountForTrainer(trainerId);

      const j1 = makeJournal({ trainerId, petOwnerId: ownerId });
      const j2 = makeJournal({ trainerId, petOwnerId: ownerId });
      const jOther = makeJournal({ trainerId: otherTrainerId, petOwnerId: ownerId });

      try {
        expect(storage.getUnreadJournalCountForTrainer(trainerId)).toBe(baseline + 2);
        expect(storage.getUnreadJournalCountForTrainer(otherTrainerId)).toBeGreaterThanOrEqual(1);

        const trainerApp = buildTestApp(() => ({ id: trainerId, role: 'trainer' }));
        const before = await request(trainerApp).get('/api/trainer/journals/unread-count');
        expect(before.status).toBe(200);
        expect(before.body.success).toBe(true);
        expect(before.body.count).toBe(baseline + 2);

        const ownerApp = buildTestApp(() => ({ id: ownerId, role: 'pet-owner' }));
        const mark = await request(ownerApp).patch(`/api/notebook/entries/${j1.id}/read`);
        expect(mark.status).toBe(200);
        expect(storage.getUnreadJournalCountForTrainer(trainerId)).toBe(baseline + 1);

        const after = await request(trainerApp).get('/api/trainer/journals/unread-count');
        expect(after.body.count).toBe(baseline + 1);

        const markAgain = await request(ownerApp).patch(`/api/notebook/entries/${j1.id}/read`);
        expect(markAgain.status).toBe(200);
        expect(storage.getUnreadJournalCountForTrainer(trainerId)).toBe(baseline + 1);

        void j2;
      } finally {
        removeJournal(j1.id);
        removeJournal(j2.id);
        removeJournal(jOther.id);
      }
    });

    it('트레이너가 아닌 역할은 GET 호출 시 403 + INSUFFICIENT_PERMISSIONS', async () => {
      const owner: SessionUser = { id: 55002, role: 'pet-owner' };
      const res = await request(buildTestApp(() => owner))
        .get('/api/trainer/journals/unread-count');
      expect(res.status).toBe(403);
      expect(res.body.code).toBe('INSUFFICIENT_PERMISSIONS');
    });
  });
});
