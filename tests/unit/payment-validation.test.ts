import {
  parsePaymentIntentForPersistence,
  deriveIdempotencyKey,
  assertPaymentOwnership,
  isUniqueViolation,
} from '../../server/services/payment-validation';

const makePI = (overrides: Partial<{ amount: number; metadata: Record<string, string> }> = {}) =>
  ({
    amount: overrides.amount ?? 10000,
    metadata: overrides.metadata ?? { type: 'course', courseId: '42', courseTitle: '훈련 강의' },
  });

describe('parsePaymentIntentForPersistence', () => {
  it('정상 강의 결제 메타데이터를 파싱한다 (성공 케이스)', () => {
    const result = parsePaymentIntentForPersistence(makePI(), 7);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.type).toBe('course');
      expect(result.userId).toBe(7);
      expect(result.itemId).toBe(42);
      expect(result.amount).toBe(100); // 10000 / 100
      expect(result.itemName).toBe('훈련 강의');
    }
  });

  it('정상 상품 결제 메타데이터를 파싱한다', () => {
    const result = parsePaymentIntentForPersistence(
      makePI({ amount: 5000, metadata: { type: 'product', productId: '99', productName: '간식' } }),
      '12'
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.type).toBe('product');
      expect(result.userId).toBe(12);
      expect(result.itemId).toBe(99);
      expect(result.amount).toBe(50);
    }
  });

  it('userId가 없으면 NO_USER 에러를 반환한다 (webhook에서 metadata.userId 누락 시나리오)', () => {
    const result = parsePaymentIntentForPersistence(makePI(), undefined);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('NO_USER');
  });

  it('userId 문자열이 NaN이면 NO_USER 에러를 반환한다', () => {
    const result = parsePaymentIntentForPersistence(makePI(), 'not-a-number');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('NO_USER');
  });

  it('item id가 없으면 NO_ITEM_ID 에러를 반환한다', () => {
    const result = parsePaymentIntentForPersistence(
      makePI({ metadata: { type: 'course' } }),
      1
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('NO_ITEM_ID');
  });

  it('item id가 유효한 숫자가 아니면 INVALID_ITEM_ID 에러를 반환한다', () => {
    const result = parsePaymentIntentForPersistence(
      makePI({ metadata: { type: 'course', courseId: 'abc' } }),
      1
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('INVALID_ITEM_ID');
  });

  it('amount가 없으면 0으로 처리한다 (방어적 처리)', () => {
    const result = parsePaymentIntentForPersistence(
      { amount: 0, metadata: { type: 'course', courseId: '1' } },
      1
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.amount).toBe(0);
  });
});

describe('deriveIdempotencyKey', () => {
  it('동일 paymentIntentId에 대해 동일한 키를 반환한다 (멱등성)', () => {
    expect(deriveIdempotencyKey('pi_123')).toBe(deriveIdempotencyKey('pi_123'));
  });

  it('서로 다른 paymentIntentId는 서로 다른 키가 된다', () => {
    expect(deriveIdempotencyKey('pi_123')).not.toBe(deriveIdempotencyKey('pi_456'));
  });

  it('빈 문자열은 에러를 던진다', () => {
    expect(() => deriveIdempotencyKey('')).toThrow();
  });
});

describe('assertPaymentOwnership (IDOR 방어)', () => {
  it('로그인하지 않은 사용자는 401을 반환한다', () => {
    const result = assertPaymentOwnership('5', undefined);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(401);
  });

  it('metadata.userId가 세션 사용자와 일치하면 통과한다', () => {
    const result = assertPaymentOwnership('5', 5);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.authoritativeUserId).toBe(5);
  });

  it('metadata.userId가 세션 사용자와 다르면 403을 반환한다 (IDOR 방어)', () => {
    const result = assertPaymentOwnership('99', 5);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(403);
  });

  it('metadata.userId가 없으면 세션 userId를 권위 값으로 사용한다 (구버전 호환)', () => {
    const result = assertPaymentOwnership(undefined, 5);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.authoritativeUserId).toBe(5);
  });

  it('metadata.userId가 잘못된 형식이면 403을 반환한다', () => {
    const result = assertPaymentOwnership('not-a-number', 5);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(403);
  });

  it('숫자 metadata.userId도 정상 비교한다', () => {
    const result = assertPaymentOwnership(7, 7);
    expect(result.ok).toBe(true);
  });
});

describe('isUniqueViolation (멱등 동시성 보호)', () => {
  it('Postgres 코드 23505를 감지한다', () => {
    expect(isUniqueViolation({ code: '23505', message: 'duplicate key value' })).toBe(true);
  });

  it('"duplicate key" 메시지를 감지한다', () => {
    expect(isUniqueViolation(new Error('duplicate key value violates unique constraint'))).toBe(true);
  });

  it('관련 없는 에러는 false를 반환한다', () => {
    expect(isUniqueViolation(new Error('connection refused'))).toBe(false);
    expect(isUniqueViolation(null)).toBe(false);
    expect(isUniqueViolation(undefined)).toBe(false);
    expect(isUniqueViolation('string error')).toBe(false);
  });
});
