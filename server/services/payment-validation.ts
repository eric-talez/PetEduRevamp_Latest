import type Stripe from 'stripe';

export type ParsedPaymentMetadata =
  | { ok: true; type: 'course'; userId: number; itemId: number; itemName: string; amount: number }
  | { ok: true; type: 'product'; userId: number; itemId: number; itemName: string; amount: number }
  | { ok: false; error: string; code: 'NO_USER' | 'NO_ITEM_ID' | 'INVALID_ITEM_ID' };

export function parsePaymentIntentForPersistence(
  paymentIntent: Pick<Stripe.PaymentIntent, 'amount' | 'metadata'>,
  sessionUserId?: number | string
): ParsedPaymentMetadata {
  const metadata = paymentIntent.metadata || {};
  const itemType = metadata.type === 'product' ? 'product' : 'course';
  const rawItemId = metadata.courseId || metadata.productId || metadata.itemId;
  const itemName = metadata.courseTitle || metadata.productName || '결제 항목';
  const amount = (paymentIntent.amount || 0) / 100;

  const userIdNum = typeof sessionUserId === 'string' ? parseInt(sessionUserId, 10) : sessionUserId;
  if (!userIdNum || Number.isNaN(userIdNum)) {
    return { ok: false, error: '결제 기록을 저장할 사용자 정보가 없습니다.', code: 'NO_USER' };
  }

  if (!rawItemId) {
    return { ok: false, error: '결제 항목 ID가 누락되었습니다.', code: 'NO_ITEM_ID' };
  }

  const parsedItemId = parseInt(String(rawItemId), 10);
  if (Number.isNaN(parsedItemId)) {
    return {
      ok: false,
      error: itemType === 'course' ? '유효하지 않은 강의 ID입니다.' : '유효하지 않은 상품 ID입니다.',
      code: 'INVALID_ITEM_ID',
    };
  }

  return { ok: true, type: itemType, userId: userIdNum, itemId: parsedItemId, itemName, amount };
}

export function deriveIdempotencyKey(paymentIntentId: string): string {
  if (!paymentIntentId || typeof paymentIntentId !== 'string') {
    throw new Error('paymentIntentId가 필요합니다.');
  }
  return paymentIntentId;
}

export type OwnershipCheckResult =
  | { ok: true; authoritativeUserId: number }
  | { ok: false; status: 401 | 403; error: string };

/**
 * 결제 확정 시 소유권 검증.
 * - 로그인하지 않은 경우 401 반환.
 * - paymentIntent.metadata.userId가 있으면 권위 값으로 사용, 세션 userId와 불일치 시 403.
 * - metadata.userId가 없으면 세션 userId만 사용 (구버전 호환).
 */
export function assertPaymentOwnership(
  metadataUserId: string | number | undefined | null,
  sessionUserId: number | undefined | null
): OwnershipCheckResult {
  if (!sessionUserId || Number.isNaN(Number(sessionUserId))) {
    return { ok: false, status: 401, error: '로그인이 필요합니다.' };
  }
  const sessionId = Number(sessionUserId);

  if (metadataUserId === undefined || metadataUserId === null || metadataUserId === '') {
    return { ok: true, authoritativeUserId: sessionId };
  }

  const metaId = typeof metadataUserId === 'string' ? parseInt(metadataUserId, 10) : metadataUserId;
  if (Number.isNaN(metaId)) {
    return { ok: false, status: 403, error: '결제 정보의 사용자 식별에 실패했습니다.' };
  }
  if (metaId !== sessionId) {
    return { ok: false, status: 403, error: '본인 결제만 확정할 수 있습니다.' };
  }

  return { ok: true, authoritativeUserId: metaId };
}

/**
 * Postgres 유니크 제약 위반 여부 판정 (멱등성 보호용).
 * Drizzle/Neon은 코드 23505 또는 메시지에 'duplicate key'가 포함됨.
 */
export function isUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const e = error as { code?: string; message?: string };
  if (e.code === '23505') return true;
  if (typeof e.message === 'string' && e.message.toLowerCase().includes('duplicate key')) return true;
  return false;
}
