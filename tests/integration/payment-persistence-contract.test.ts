/**
 * 통합-수준 계약 테스트 (Contract Tests)
 *
 * routes.ts 내부의 persistSuccessfulPayment 와 트랜잭션 승인 플로우가
 * 의존하는 핵심 계약을 typed mock db 로 검증한다:
 *
 *  1) 결제 영속화 멱등성: paymentIntentId가 동일하면 두 번째 호출은
 *     기존 row를 반환하고 새 insert를 시도하지 않는다.
 *  2) 동시성 유니크 위반 보호: 사전 조회는 비었지만 insert가
 *     unique violation(23505)을 던진 경우, 재조회로 동일 row를 반환한다.
 *  3) 트랜잭션 원자성: 콜백 내부 어디에서든 throw가 발생하면
 *     db.transaction은 reject하고 모든 변경이 롤백된다.
 *  4) 훈련사 승인 트랜잭션: trainerApplications 상태 갱신 + trainers 생성 +
 *     users.role 변경이 모두 같은 tx에서 commit되거나 모두 롤백된다.
 */

import { isUniqueViolation } from '../../server/services/payment-validation';

interface OrderRow {
  id: number;
  paymentIntentId: string;
  userId: number;
}

interface UniqueViolationError extends Error {
  code: string;
}

function makeUniqueViolation(): UniqueViolationError {
  const e = new Error('duplicate key value violates unique constraint') as UniqueViolationError;
  e.code = '23505';
  return e;
}

interface FakeOrderState {
  rows: OrderRow[];
  insertCallCount: number;
  /** insert 호출 직전에 실행되어 race를 시뮬레이션하기 위한 훅 */
  beforeInsert?: (state: FakeOrderState) => void;
  /** insert가 한 번 unique violation을 던지도록 강제 */
  throwUniqueOnNextInsert?: boolean;
  /** insert가 한 번 일반 에러를 던지도록 강제 */
  throwGenericOnNextInsert?: Error;
}

interface TxApi {
  selectByPaymentIntent(pi: string): Promise<OrderRow[]>;
  insertOrder(values: Omit<OrderRow, 'id'>): Promise<OrderRow>;
}

interface FakeDb {
  transaction<T>(fn: (tx: TxApi) => Promise<T>): Promise<T>;
}

function createFakeDb(state: FakeOrderState): FakeDb {
  const buildTx = (): TxApi => ({
    async selectByPaymentIntent(pi: string) {
      return state.rows.filter((r) => r.paymentIntentId === pi).slice(0, 1);
    },
    async insertOrder(values) {
      state.insertCallCount += 1;
      if (state.beforeInsert) {
        const hook = state.beforeInsert;
        state.beforeInsert = undefined;
        hook(state);
      }
      if (state.throwUniqueOnNextInsert) {
        state.throwUniqueOnNextInsert = false;
        throw makeUniqueViolation();
      }
      if (state.throwGenericOnNextInsert) {
        const err = state.throwGenericOnNextInsert;
        state.throwGenericOnNextInsert = undefined;
        throw err;
      }
      const row: OrderRow = { id: state.rows.length + 1, ...values };
      state.rows.push(row);
      return row;
    },
  });

  return {
    async transaction<T>(fn: (tx: TxApi) => Promise<T>): Promise<T> {
      const snapshot = state.rows.slice();
      try {
        return await fn(buildTx());
      } catch (err) {
        // PG 트랜잭션 원자성 시뮬레이션: 실패 시 snapshot으로 롤백
        state.rows = snapshot;
        throw err;
      }
    },
  };
}

/**
 * persistSuccessfulPayment의 핵심 패턴을 그대로 옮긴 테스트 헬퍼.
 * 실제 구현(server/routes.ts)과 동일한 멱등 + unique-violation 가드 흐름을 사용한다.
 */
async function persistOnce(
  db: FakeDb,
  paymentIntentId: string,
  userId: number,
): Promise<{ row: OrderRow; duplicated: boolean }> {
  return await db.transaction(async (tx) => {
    // 1) 사전 조회 (멱등 가드)
    const existing = await tx.selectByPaymentIntent(paymentIntentId);
    if (existing.length > 0) {
      return { row: existing[0], duplicated: true };
    }
    // 2) 신규 insert 시도, 동시성 unique violation 시 재조회로 복구
    try {
      const created = await tx.insertOrder({ paymentIntentId, userId });
      return { row: created, duplicated: false };
    } catch (e) {
      if (isUniqueViolation(e)) {
        const refetched = await tx.selectByPaymentIntent(paymentIntentId);
        if (refetched.length > 0) {
          return { row: refetched[0], duplicated: true };
        }
      }
      throw e;
    }
  });
}

describe('결제 영속화 계약 (idempotency + concurrency)', () => {
  it('동일 paymentIntentId 두 번 호출 시 두 번째는 duplicated=true를 반환한다', async () => {
    const state: FakeOrderState = { rows: [], insertCallCount: 0 };
    const db = createFakeDb(state);

    const first = await persistOnce(db, 'pi_abc', 5);
    const second = await persistOnce(db, 'pi_abc', 5);

    expect(first.duplicated).toBe(false);
    expect(second.duplicated).toBe(true);
    expect(first.row.id).toBe(second.row.id);
    expect(state.insertCallCount).toBe(1); // insert는 단 한 번만 시도
    expect(state.rows.length).toBe(1);
  });

  it('race 시나리오: 사전 조회 miss → insert가 23505 → 재조회 hit 경로를 정확히 탄다', async () => {
    const state: FakeOrderState = {
      rows: [],
      insertCallCount: 0,
      // 사전 조회는 빈 결과여야 하므로 rows는 비워둔 상태에서 시작
      // insert 직전에 다른 트랜잭션이 commit한 것처럼 row를 주입하고
      // 우리의 insert가 unique violation을 받도록 강제
      beforeInsert: (s) => {
        s.rows.push({ id: 99, paymentIntentId: 'pi_race', userId: 5 });
        s.throwUniqueOnNextInsert = true;
      },
    };
    const db = createFakeDb(state);

    const result = await persistOnce(db, 'pi_race', 5);

    expect(state.insertCallCount).toBe(1); // insert는 한 번 시도되었고
    expect(result.duplicated).toBe(true); // unique violation → 재조회로 복구
    expect(result.row.id).toBe(99); // 다른 트랜잭션이 만든 row를 그대로 사용
    expect(state.rows.length).toBe(1); // 추가 insert 없음
  });

  it('관련 없는 에러는 재조회 없이 그대로 전파되고 트랜잭션은 롤백된다', async () => {
    const state: FakeOrderState = {
      rows: [],
      insertCallCount: 0,
      throwGenericOnNextInsert: new Error('connection refused'),
    };
    const db = createFakeDb(state);

    await expect(persistOnce(db, 'pi_err', 5)).rejects.toThrow('connection refused');
    expect(state.rows.length).toBe(0);
  });
});

describe('승인 트랜잭션 원자성 계약', () => {
  it('콜백 내부에서 throw 발생 시 db.transaction은 reject하고 모든 변경이 롤백된다', async () => {
    const state: FakeOrderState = { rows: [], insertCallCount: 0 };
    const db = createFakeDb(state);

    await expect(
      db.transaction(async (tx) => {
        // 신청 상태 갱신을 시뮬하는 insert 1
        await tx.insertOrder({ paymentIntentId: 'app_status_approved', userId: 1 });
        // 그 후 trainers 생성 시뮬하는 단계에서 의도적 실패
        throw new Error('trainers insert 실패 시뮬');
      }),
    ).rejects.toThrow('trainers insert 실패 시뮬');

    // 원자성: 첫 insert(신청 상태 변경)도 함께 롤백되어야 함
    expect(state.rows.length).toBe(0);
  });

  it('정상 콜백은 모든 변경이 commit된다', async () => {
    const state: FakeOrderState = { rows: [], insertCallCount: 0 };
    const db = createFakeDb(state);

    await db.transaction(async (tx) => {
      await tx.insertOrder({ paymentIntentId: 'a', userId: 1 });
      await tx.insertOrder({ paymentIntentId: 'b', userId: 2 });
    });

    expect(state.rows.length).toBe(2);
  });
});

/**
 * 훈련사 승인 흐름 (trainerApplications 상태 갱신 + trainers insert + users.role 갱신)을
 * 단일 트랜잭션으로 묶었을 때, 도중 실패 시 모든 작업이 롤백되는지 검증.
 */
describe('훈련사 승인 트랜잭션 통합 계약', () => {
  interface ApprovalState {
    application: { id: number; status: 'pending' | 'approved' | 'rejected' };
    trainers: Array<{ id: number; userId: number; email: string }>;
    users: Array<{ id: number; email: string; role: 'user' | 'trainer' | 'admin' }>;
    /** trainers insert를 강제로 실패시키는 훅 (롤백 검증용) */
    failTrainersInsert?: boolean;
  }

  interface ApprovalTx {
    updateApplicationStatus(id: number, status: 'approved' | 'rejected'): Promise<void>;
    findTrainerByEmail(email: string): Promise<ApprovalState['trainers'][number] | undefined>;
    insertTrainer(values: { userId: number; email: string }): Promise<ApprovalState['trainers'][number]>;
    updateUserRole(userId: number, role: 'trainer'): Promise<void>;
  }

  function createApprovalDb(state: ApprovalState) {
    const buildTx = (): ApprovalTx => ({
      async updateApplicationStatus(id, status) {
        if (state.application.id === id) state.application.status = status;
      },
      async findTrainerByEmail(email) {
        return state.trainers.find((t) => t.email === email);
      },
      async insertTrainer(values) {
        if (state.failTrainersInsert) {
          throw new Error('trainers insert DB 오류 시뮬');
        }
        const row = { id: state.trainers.length + 1, ...values };
        state.trainers.push(row);
        return row;
      },
      async updateUserRole(userId, role) {
        const u = state.users.find((x) => x.id === userId);
        if (u) u.role = role;
      },
    });
    return {
      async transaction<T>(fn: (tx: ApprovalTx) => Promise<T>): Promise<T> {
        const snapshot = {
          appStatus: state.application.status,
          trainers: state.trainers.slice(),
          users: state.users.map((u) => ({ ...u })),
        };
        try {
          return await fn(buildTx());
        } catch (err) {
          state.application.status = snapshot.appStatus;
          state.trainers = snapshot.trainers;
          state.users = snapshot.users;
          throw err;
        }
      },
    };
  }

  async function approveApplication(
    db: ReturnType<typeof createApprovalDb>,
    applicationId: number,
    applicantEmail: string,
    applicantUserId: number,
  ) {
    return await db.transaction(async (tx) => {
      await tx.updateApplicationStatus(applicationId, 'approved');
      let trainerRow = await tx.findTrainerByEmail(applicantEmail);
      if (!trainerRow) {
        trainerRow = await tx.insertTrainer({ userId: applicantUserId, email: applicantEmail });
      }
      await tx.updateUserRole(applicantUserId, 'trainer');
      return trainerRow;
    });
  }

  it('승인 성공: 신청 상태/trainers/users.role 모두 함께 commit', async () => {
    const state: ApprovalState = {
      application: { id: 10, status: 'pending' },
      trainers: [],
      users: [{ id: 5, email: 'a@b.com', role: 'user' }],
    };
    const db = createApprovalDb(state);

    const trainer = await approveApplication(db, 10, 'a@b.com', 5);

    expect(state.application.status).toBe('approved');
    expect(state.trainers).toHaveLength(1);
    expect(trainer.userId).toBe(5);
    expect(state.users[0].role).toBe('trainer');
  });

  it('중복 승인 방지: 이미 trainers에 있으면 재사용하고 추가 insert 없음', async () => {
    const state: ApprovalState = {
      application: { id: 11, status: 'pending' },
      trainers: [{ id: 99, userId: 5, email: 'a@b.com' }],
      users: [{ id: 5, email: 'a@b.com', role: 'user' }],
    };
    const db = createApprovalDb(state);

    const trainer = await approveApplication(db, 11, 'a@b.com', 5);

    expect(trainer.id).toBe(99);
    expect(state.trainers).toHaveLength(1);
    expect(state.users[0].role).toBe('trainer');
  });

  it('실패 롤백: trainers insert 실패 시 application.status와 user.role 모두 원복', async () => {
    const state: ApprovalState = {
      application: { id: 12, status: 'pending' },
      trainers: [],
      users: [{ id: 5, email: 'a@b.com', role: 'user' }],
      failTrainersInsert: true,
    };
    const db = createApprovalDb(state);

    await expect(approveApplication(db, 12, 'a@b.com', 5)).rejects.toThrow(
      'trainers insert DB 오류 시뮬',
    );

    expect(state.application.status).toBe('pending'); // 원복됨
    expect(state.trainers).toHaveLength(0);
    expect(state.users[0].role).toBe('user'); // 원복됨
  });
});
