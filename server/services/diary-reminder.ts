import { db } from '../db';
import { scheduledPushNotifications, systemSettings } from '../../shared/schema';
import { and, eq, inArray } from 'drizzle-orm';
import { logServerError } from '../middleware/audit-logger';

export interface ReminderTime {
  hour: number;
  minute: number;
}

export interface DiaryReminderData {
  type: 'health';
  category: 'health';
  kind: 'vaccination' | 'medication';
  itemId: string;
  petId: string;
  actionUrl: string;
  reminderLabel: 'D-1' | '당일';
}

const DEFAULT_REMINDER: ReminderTime = { hour: 9, minute: 0 };
const SETTING_KEY_PREFIX = 'user_reminder_time:';
const SETTING_CATEGORY = 'notifications';

const cache = new Map<number, ReminderTime>();

function settingKey(userId: number): string {
  return `${SETTING_KEY_PREFIX}${userId}`;
}

function clampTime(hour: number, minute: number): ReminderTime {
  return {
    hour: Math.max(0, Math.min(23, Math.floor(hour))),
    minute: Math.max(0, Math.min(59, Math.floor(minute))),
  };
}

function parseStoredValue(value: string | null | undefined): ReminderTime | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    if (
      parsed &&
      typeof parsed === 'object' &&
      typeof parsed.hour === 'number' &&
      typeof parsed.minute === 'number'
    ) {
      return clampTime(parsed.hour, parsed.minute);
    }
  } catch {
    // fall through
  }
  return null;
}

export async function getUserReminderTime(userId: number): Promise<ReminderTime> {
  const cached = cache.get(userId);
  if (cached) return { ...cached };

  try {
    const rows = await db
      .select({ value: systemSettings.value })
      .from(systemSettings)
      .where(eq(systemSettings.key, settingKey(userId)))
      .limit(1);
    const stored = parseStoredValue(rows[0]?.value);
    if (stored) {
      cache.set(userId, stored);
      return { ...stored };
    }
  } catch (err) {
    logServerError('[Diary Reminder] 알림 시각 조회 실패:', err);
  }

  return { ...DEFAULT_REMINDER };
}

export async function setUserReminderTime(
  userId: number,
  hour: number,
  minute: number,
): Promise<ReminderTime> {
  const value = clampTime(hour, minute);
  const key = settingKey(userId);
  const serialized = JSON.stringify(value);

  try {
    const existing = await db
      .select({ id: systemSettings.id })
      .from(systemSettings)
      .where(eq(systemSettings.key, key))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(systemSettings)
        .set({ value: serialized, updatedAt: new Date() })
        .where(eq(systemSettings.id, existing[0].id));
    } else {
      await db.insert(systemSettings).values({
        key,
        value: serialized,
        category: SETTING_CATEGORY,
        description: '사용자별 다이어리 리마인더 발송 시각 (HH:MM)',
        isActive: true,
      });
    }
    cache.set(userId, value);
  } catch (err) {
    logServerError('[Diary Reminder] 알림 시각 저장 실패:', err);
    throw err;
  }

  return { ...value };
}

function buildScheduledDate(
  targetDateStr: string,
  time: ReminderTime,
  daysOffset: number,
): Date | null {
  if (!targetDateStr) return null;
  const base = new Date(targetDateStr);
  if (isNaN(base.getTime())) return null;
  base.setDate(base.getDate() + daysOffset);
  base.setHours(time.hour, time.minute, 0, 0);
  return base;
}

export interface ScheduleInput {
  userId: number;
  petName: string;
  petId: number;
  targetDate: string;
  kind: 'vaccination' | 'medication';
  itemId: number;
  itemName: string;
  actionUrl: string;
}

/**
 * D-1 / 당일 푸시 알림 예약. 이미 지난 시점은 스킵.
 * @returns 생성된 scheduled_push_notifications row id 배열
 */
export async function scheduleHealthReminders(input: ScheduleInput): Promise<number[]> {
  try {
    const time = await getUserReminderTime(input.userId);
    const now = new Date();
    const offsets: { offset: number; label: 'D-1' | '당일' }[] = [
      { offset: -1, label: 'D-1' },
      { offset: 0, label: '당일' },
    ];

    const rows: (typeof scheduledPushNotifications.$inferInsert)[] = [];
    for (const { offset, label } of offsets) {
      const scheduledAt = buildScheduledDate(input.targetDate, time, offset);
      if (!scheduledAt) continue;
      if (scheduledAt.getTime() <= now.getTime()) continue;

      const titlePrefix = input.kind === 'vaccination' ? '예방접종' : '약 복용';
      const title =
        label === '당일'
          ? `[오늘] ${input.petName} ${titlePrefix} 일정`
          : `[내일] ${input.petName} ${titlePrefix} 알림`;
      const message =
        label === '당일'
          ? `오늘은 ${input.petName}의 ${input.itemName} 일정입니다.`
          : `내일은 ${input.petName}의 ${input.itemName} 일정입니다.`;

      const data: DiaryReminderData = {
        type: 'health',
        category: 'health',
        kind: input.kind,
        itemId: String(input.itemId),
        petId: String(input.petId),
        actionUrl: input.actionUrl,
        reminderLabel: label,
      };

      rows.push({
        userId: input.userId,
        title,
        message,
        scheduledAt,
        status: 'pending',
        data,
      });
    }

    if (rows.length === 0) return [];

    const inserted = await db
      .insert(scheduledPushNotifications)
      .values(rows)
      .returning({ id: scheduledPushNotifications.id });
    return inserted.map((r) => r.id);
  } catch (err) {
    logServerError('[Diary Reminder] 예약 생성 실패:', err);
    return [];
  }
}

/**
 * 예약 알림 취소 (status = 'pending'인 것만 cancelled 로 변경)
 */
export async function cancelScheduledReminders(
  ids: number[] | undefined | null,
): Promise<void> {
  if (!ids || ids.length === 0) return;
  try {
    await db
      .update(scheduledPushNotifications)
      .set({ status: 'cancelled' })
      .where(
        and(
          inArray(scheduledPushNotifications.id, ids),
          eq(scheduledPushNotifications.status, 'pending'),
        ),
      );
  } catch (err) {
    logServerError('[Diary Reminder] 예약 취소 실패:', err);
  }
}
