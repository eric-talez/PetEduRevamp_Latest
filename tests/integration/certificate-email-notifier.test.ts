/**
 * 수료증 첨부 이메일 자동 발송 통합 테스트
 *
 * 검증 흐름:
 *   recomputeProgress(active → completed)
 *     → notifyCertificateEmailForCourse
 *       → triggerCertificateEmail
 *         → email-service.queueEmail
 *           → emailLogs INSERT (course_completion_certificate)
 *
 * 외부 의존성(SendGrid / 실제 PostgreSQL / PDF 렌더링)은 인-메모리 스텁으로 대체하여
 * 결정적으로 emailLogs 의 영속화 결과를 직접 검증한다.
 */

process.env.SENDGRID_API_KEY = 'SG.test-key';
process.env.SENDGRID_FROM_EMAIL = 'no-reply@talez.app';
process.env.NODE_ENV = 'test';

interface FakeEmailLog {
  id: number;
  userId: number | null;
  recipient: string;
  templateKey: string;
  subject: string | null;
  payload: Record<string, unknown>;
  status: string;
  attempts: number;
  lastError: string | null;
  providerMessageId: string | null;
  scheduledFor: Date | null;
  sentAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface FakeUser {
  id: number;
  email?: string | null;
}

interface FakeStore {
  emailLogs: FakeEmailLog[];
  users: FakeUser[];
}

const sgSendMock = jest.fn(async () => [
  { headers: { 'x-message-id': 'msg-test-1' } },
  {},
]);

jest.mock('@sendgrid/mail', () => ({
  __esModule: true,
  default: {
    setApiKey: jest.fn(),
    send: (...args: unknown[]) => sgSendMock(...(args as [unknown])),
  },
}));

jest.mock('../../server/services/certificate-pdf', () => ({
  generateCertificatePdf: jest.fn(async () => Buffer.from('fake-pdf-bytes')),
}));

jest.mock('../../server/middleware/audit-logger', () => ({
  logServerError: jest.fn(),
  recordAuditLog: jest.fn(async () => undefined),
  requestContextMiddleware: (
    _req: unknown,
    _res: unknown,
    next: () => void,
  ) => next(),
  maskSensitive: (v: unknown) => v,
}));

// 리뷰 요청 알림은 본 테스트의 검증 대상이 아니며 별도 emailLogs 항목을 만들어
// 단일 트리거 검증을 어렵게 만들 수 있으므로 no-op 으로 치환한다.
jest.mock('../../server/services/review-request-notifier', () => ({
  triggerReviewRequestNotification: jest.fn(async () => undefined),
}));

jest.mock('../../server/db', () => {
  type AnyRow = Record<string, unknown>;

  interface FakeTemplate {
    id: number;
    key: string;
    name: string;
    category: string;
    subject: string;
    bodyHtml: string;
    enabled: boolean;
    sendgridTemplateId: string | null;
  }

  const certTemplate: FakeTemplate = {
    id: 1,
    key: 'course_completion_certificate',
    name: '수료증',
    category: 'system',
    subject: '[TALEZ] {{courseTitle}} 수료증',
    bodyHtml: '<p>{{name}} 보호자님, {{petName}}의 수료를 축하합니다.</p>',
    enabled: true,
    sendgridTemplateId: null,
  };

  const internalStore = {
    emailLogs: [] as AnyRow[],
    emailTemplates: [certTemplate] as AnyRow[],
    emailNotificationPreferences: [] as AnyRow[],
    users: [] as AnyRow[],
  };

  const tableArrays = new Map<unknown, AnyRow[]>();
  let bound = false;
  function ensureBound(): void {
    if (bound) return;
    const schema = require('../../shared/schema');
    tableArrays.set(schema.emailLogs, internalStore.emailLogs);
    tableArrays.set(schema.emailTemplates, internalStore.emailTemplates);
    tableArrays.set(
      schema.emailNotificationPreferences,
      internalStore.emailNotificationPreferences,
    );
    tableArrays.set(schema.users, internalStore.users);
    bound = true;
  }

  function resolveTable(t: unknown): AnyRow[] {
    ensureBound();
    return tableArrays.get(t) ?? [];
  }

  const db = {
    select: (_cols?: unknown) => {
      let arr: AnyRow[] = [];
      const chain: {
        from: (t: unknown) => typeof chain;
        where: (...args: unknown[]) => typeof chain;
        limit: (n: number) => Promise<AnyRow[]>;
      } = {
        from: (t: unknown) => {
          arr = resolveTable(t);
          return chain;
        },
        where: () => chain,
        limit: (n: number) => Promise.resolve(arr.slice(0, n)),
      };
      return chain;
    },
    insert: (t: unknown) => ({
      values: (vals: AnyRow) => ({
        returning: async () => {
          const arr = resolveTable(t);
          const row: AnyRow = {
            id: arr.length + 1,
            createdAt: new Date(),
            updatedAt: new Date(),
            attempts: 0,
            ...vals,
          };
          arr.push(row);
          return [row];
        },
      }),
    }),
    update: (t: unknown) => ({
      set: (vals: AnyRow) => ({
        where: async () => {
          const arr = resolveTable(t);
          for (const r of arr) Object.assign(r, vals);
        },
      }),
    }),
  };

  return {
    db,
    pgPool: { query: jest.fn() },
    mariaPool: { query: jest.fn() },
    __testStore: internalStore as unknown as FakeStore,
  };
});

const { __testStore: store } = jest.requireMock('../../server/db') as {
  __testStore: FakeStore;
};

import { storage } from '../../server/storage';
import {
  recomputeProgress,
  notifyCertificateEmailForCourse,
} from '../../server/routes/course-attendance';
import { __resetSentGuardForTests } from '../../server/services/certificate-email-notifier';

const CERT_TEMPLATE_KEY = 'course_completion_certificate';

function resetWorld(): void {
  store.emailLogs.length = 0;
  store.users.length = 0;
  storage.users.length = 0;
  storage.pets.length = 0;
  storage.courses.length = 0;
  storage.coursePurchases.length = 0;
  storage.courseProgress.length = 0;
  storage.courseSessions.length = 0;
  storage.sessionAttendance.length = 0;
  sgSendMock.mockClear();
  __resetSentGuardForTests();
}

function seedCourseWithSessions(courseId: number, sessionsCount: number): void {
  storage.courses.push({ id: courseId, title: '기초 훈련 코스', instructorId: 200 });
  for (let i = 1; i <= sessionsCount; i++) {
    storage.courseSessions.push({
      id: courseId * 100 + i,
      courseId,
      sessionNumber: i,
      title: `회차 ${i}`,
      description: null,
      scheduledDate: null,
      durationMinutes: 60,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }
}

function markAllPresent(courseId: number, userId: number): void {
  for (const s of storage.courseSessions.filter(
    (x: { courseId: number }) => x.courseId === courseId,
  )) {
    storage.sessionAttendance.push({
      id: storage.sessionAttendance.length + 1,
      sessionId: s.id,
      courseId,
      userId,
      petId: null,
      status: 'present',
      memo: null,
      checkedBy: 200,
      checkedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }
}

describe('수료증 첨부 이메일 자동 발송 - recomputeProgress 통합', () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    resetWorld();
  });

  it('출석을 모두 present 로 채워 수료 전환되면 emailLogs 에 course_completion_certificate 레코드가 1건 생성된다', async () => {
    const userId = 100;
    const courseId = 9;
    storage.users.push({ id: userId, name: '보호자', email: 'guardian@example.com' });
    store.users.push({ id: userId, email: 'guardian@example.com' });
    storage.pets.push({ id: 1, ownerId: userId, name: '뽀삐' });
    storage.coursePurchases.push({ id: 1, userId, courseId });
    seedCourseWithSessions(courseId, 3);
    markAllPresent(courseId, userId);

    const result = recomputeProgress(userId, courseId);
    expect(result.progress.status).toBe('completed');
    expect(result.progress.completedAt).not.toBeNull();
    await Promise.all(result.pendingNotifications);

    const certLogs = store.emailLogs.filter(
      (l) => l.templateKey === CERT_TEMPLATE_KEY,
    );
    expect(certLogs).toHaveLength(1);
    expect(certLogs[0].recipient).toBe('guardian@example.com');
    expect(certLogs[0].userId).toBe(userId);
    expect(certLogs[0].payload.certificateNo).toMatch(/^WZ-9-100-/);
    expect(certLogs[0].payload.courseTitle).toBe('기초 훈련 코스');
    // SendGrid 호출 시 PDF 첨부가 동봉되었는지 검증
    expect(sgSendMock).toHaveBeenCalledTimes(1);
    const sentMsg = sgSendMock.mock.calls[0][0] as {
      attachments?: Array<{ filename: string; type: string }>;
    };
    expect(sentMsg.attachments).toBeDefined();
    expect(sentMsg.attachments![0].type).toBe('application/pdf');
  });

  it('기존 active progress 가 완전 출석으로 인해 active → completed 로 전환되는 분기에서도 1건만 발송된다', async () => {
    const userId = 102;
    const courseId = 12;
    storage.users.push({ id: userId, name: '보호자', email: 'guardian2@example.com' });
    store.users.push({ id: userId, email: 'guardian2@example.com' });
    storage.coursePurchases.push({ id: 1, userId, courseId });
    seedCourseWithSessions(courseId, 2);

    // 1) 부분 출석 - 1/2 만 present 로 마킹하여 active 상태 progress 행을 생성
    const sess = storage.courseSessions.filter(
      (s: { courseId: number }) => s.courseId === courseId,
    );
    storage.sessionAttendance.push({
      id: storage.sessionAttendance.length + 1,
      sessionId: sess[0].id,
      courseId,
      userId,
      petId: null,
      status: 'present',
      memo: null,
      checkedBy: 200,
      checkedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    const partial = recomputeProgress(userId, courseId);
    expect(partial.progress.status).toBe('active');
    expect(partial.pendingNotifications).toHaveLength(0);
    await Promise.all(partial.pendingNotifications);
    expect(
      store.emailLogs.filter((l) => l.templateKey === CERT_TEMPLATE_KEY),
    ).toHaveLength(0);

    // 2) 나머지 회차도 present 로 마킹 → active 행이 completed 로 전환
    storage.sessionAttendance.push({
      id: storage.sessionAttendance.length + 1,
      sessionId: sess[1].id,
      courseId,
      userId,
      petId: null,
      status: 'present',
      memo: null,
      checkedBy: 200,
      checkedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    const transitioned = recomputeProgress(userId, courseId);
    expect(transitioned.progress.status).toBe('completed');
    expect(transitioned.pendingNotifications.length).toBeGreaterThan(0);
    await Promise.all(transitioned.pendingNotifications);

    const certLogs = store.emailLogs.filter(
      (l) => l.templateKey === CERT_TEMPLATE_KEY,
    );
    expect(certLogs).toHaveLength(1);
    expect(certLogs[0].userId).toBe(userId);
    expect(certLogs[0].recipient).toBe('guardian2@example.com');
  });

  it('동일 코스에서 recomputeProgress 가 다시 호출돼도 추가 이메일 로그가 생성되지 않는다 (멱등성)', async () => {
    const userId = 100;
    const courseId = 9;
    storage.users.push({ id: userId, name: '보호자', email: 'guardian@example.com' });
    store.users.push({ id: userId, email: 'guardian@example.com' });
    storage.coursePurchases.push({ id: 1, userId, courseId });
    seedCourseWithSessions(courseId, 2);
    markAllPresent(courseId, userId);

    const first = recomputeProgress(userId, courseId);
    await Promise.all(first.pendingNotifications);
    expect(
      store.emailLogs.filter((l) => l.templateKey === CERT_TEMPLATE_KEY),
    ).toHaveLength(1);

    // 다시 호출 - 라우트 가드(이미 completed)로 notify 가 트리거되지 않음을 검증
    const second = recomputeProgress(userId, courseId);
    expect(second.progress.status).toBe('completed');
    expect(second.pendingNotifications).toHaveLength(0);
    await Promise.all(second.pendingNotifications);

    // 방어적으로 같은 certificateNo 로 직접 트리거되는 시나리오(서버 재기동 후 재시도 등)도 검증.
    await notifyCertificateEmailForCourse(
      userId,
      courseId,
      second.totalSessions,
      second.completedSessions,
      second.progress.completedAt,
    );

    const certLogs = store.emailLogs.filter(
      (l) => l.templateKey === CERT_TEMPLATE_KEY,
    );
    expect(certLogs).toHaveLength(1);
    expect(sgSendMock).toHaveBeenCalledTimes(1);
  });

  it('보호자에게 email 이 없는 경우 발송 시도가 스킵되어 emailLogs 에 레코드가 추가되지 않는다', async () => {
    const userId = 101;
    const courseId = 11;
    // storage.users 도 mocked db users 도 이메일 없음
    storage.users.push({ id: userId, name: '이메일없음' });
    store.users.push({ id: userId, email: null });
    storage.coursePurchases.push({ id: 1, userId, courseId });
    seedCourseWithSessions(courseId, 2);
    markAllPresent(courseId, userId);

    const result = recomputeProgress(userId, courseId);
    expect(result.progress.status).toBe('completed');
    await Promise.all(result.pendingNotifications);

    const certLogs = store.emailLogs.filter(
      (l) => l.templateKey === CERT_TEMPLATE_KEY,
    );
    expect(certLogs).toHaveLength(0);
    expect(sgSendMock).not.toHaveBeenCalled();
  });
});
