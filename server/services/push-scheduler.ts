import { db } from '../db';
import { 
  pushCampaigns, 
  scheduledPushNotifications, 
  pushNotificationLogs,
  fcmTokens,
  users
} from '../../shared/schema';
import { eq, and, lte, inArray, sql } from 'drizzle-orm';
import { fcmService } from './fcm-service';
import { logServerError } from '../middleware/audit-logger';

class PushSchedulerService {
  private static instance: PushSchedulerService;
  private isRunning: boolean = false;
  private intervalId: NodeJS.Timeout | null = null;
  private readonly CHECK_INTERVAL = 60000; // 1분마다 체크

  private constructor() {}

  static getInstance(): PushSchedulerService {
    if (!PushSchedulerService.instance) {
      PushSchedulerService.instance = new PushSchedulerService();
    }
    return PushSchedulerService.instance;
  }

  start() {
    if (this.isRunning) {
      console.log('[Push Scheduler] 이미 실행 중입니다.');
      return;
    }

    this.isRunning = true;
    console.log('[Push Scheduler] 예약 발송 스케줄러가 시작되었습니다.');

    // 즉시 한 번 실행
    this.processScheduledCampaigns();
    this.processScheduledNotifications();

    // 주기적으로 실행
    this.intervalId = setInterval(() => {
      this.processScheduledCampaigns();
      this.processScheduledNotifications();
    }, this.CHECK_INTERVAL);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('[Push Scheduler] 예약 발송 스케줄러가 중지되었습니다.');
  }

  /**
   * 예약된 캠페인 처리
   */
  private async processScheduledCampaigns() {
    try {
      const now = new Date();

      // 예약 시간이 지난 캠페인 조회
      const scheduledCampaigns = await db
        .select()
        .from(pushCampaigns)
        .where(and(
          eq(pushCampaigns.status, 'scheduled'),
          lte(pushCampaigns.scheduledAt, now)
        ))
        .limit(10);

      for (const campaign of scheduledCampaigns) {
        console.log(`[Push Scheduler] 캠페인 ${campaign.id} 발송 시작`);
        await this.sendCampaign(campaign);
      }
    } catch (error) {
      logServerError('[Push Scheduler] 예약 캠페인 처리 오류:', error);
    }
  }

  /**
   * 개별 예약 알림 처리
   */
  private async processScheduledNotifications() {
    try {
      const now = new Date();

      // 예약 시간이 지난 개별 알림 조회
      const scheduledNotifs = await db
        .select()
        .from(scheduledPushNotifications)
        .where(and(
          eq(scheduledPushNotifications.status, 'pending'),
          lte(scheduledPushNotifications.scheduledAt, now)
        ))
        .limit(50);

      for (const notif of scheduledNotifs) {
        await this.sendScheduledNotification(notif);
      }
    } catch (error) {
      logServerError('[Push Scheduler] 예약 알림 처리 오류:', error);
    }
  }

  /**
   * 캠페인 발송 실행
   */
  private async sendCampaign(campaign: typeof pushCampaigns.$inferSelect) {
    try {
      // 상태를 sending으로 변경
      await db
        .update(pushCampaigns)
        .set({ status: 'sending', updatedAt: new Date() })
        .where(eq(pushCampaigns.id, campaign.id));

      // 대상 토큰 조회
      const tokens = await this.getTargetTokens(
        campaign.targetType, 
        campaign.targetCriteria as any
      );

      if (tokens.length === 0) {
        await db
          .update(pushCampaigns)
          .set({ 
            status: 'completed',
            sentAt: new Date(),
            totalRecipients: 0,
            updatedAt: new Date()
          })
          .where(eq(pushCampaigns.id, campaign.id));
        
        console.log(`[Push Scheduler] 캠페인 ${campaign.id} 발송 대상 없음`);
        return;
      }

      let successCount = 0;
      let failureCount = 0;
      const invalidTokenIds: number[] = [];

      // 배치 발송
      const batchSize = 500;
      for (let i = 0; i < tokens.length; i += batchSize) {
        const batch = tokens.slice(i, i + batchSize);
        const tokenStrings = batch.map(t => t.token);

        const result = await fcmService.sendToMultipleDevices(
          tokenStrings,
          campaign.title,
          campaign.message,
          campaign.data as Record<string, string> | undefined
        );

        successCount += result.successCount;
        failureCount += result.failureCount;

        for (const invalidToken of result.invalidTokens) {
          const found = batch.find(t => t.token === invalidToken);
          if (found) {
            invalidTokenIds.push(found.tokenId);
          }
        }

        // 로그 기록
        for (const t of batch) {
          const isSuccess = !result.invalidTokens.includes(t.token);
          await db.insert(pushNotificationLogs).values({
            campaignId: campaign.id,
            userId: t.userId,
            tokenId: t.tokenId,
            title: campaign.title,
            message: campaign.message,
            status: isSuccess ? 'success' : 'failed',
            errorMessage: isSuccess ? null : 'Token invalid or unregistered'
          });
        }
      }

      // 무효 토큰 비활성화
      if (invalidTokenIds.length > 0) {
        await db
          .update(fcmTokens)
          .set({ isActive: false, updatedAt: new Date() })
          .where(inArray(fcmTokens.id, invalidTokenIds));
      }

      // 캠페인 완료
      await db
        .update(pushCampaigns)
        .set({
          status: 'completed',
          sentAt: new Date(),
          totalRecipients: tokens.length,
          successCount,
          failureCount,
          updatedAt: new Date()
        })
        .where(eq(pushCampaigns.id, campaign.id));

      console.log(`[Push Scheduler] 캠페인 ${campaign.id} 완료 - 성공: ${successCount}, 실패: ${failureCount}`);
    } catch (error) {
      logServerError(`[Push Scheduler] 캠페인 ${campaign.id} 발송 실패:`, error);
      
      await db
        .update(pushCampaigns)
        .set({ status: 'draft', updatedAt: new Date() })
        .where(eq(pushCampaigns.id, campaign.id));
    }
  }

  /**
   * 개별 알림 발송
   */
  private async sendScheduledNotification(notif: typeof scheduledPushNotifications.$inferSelect) {
    try {
      // 사용자의 활성 토큰 조회
      const userTokens = await db
        .select()
        .from(fcmTokens)
        .where(and(
          eq(fcmTokens.userId, notif.userId),
          eq(fcmTokens.isActive, true)
        ));

      if (userTokens.length === 0) {
        await db
          .update(scheduledPushNotifications)
          .set({ 
            status: 'failed', 
            sentAt: new Date(),
            errorMessage: '활성 토큰 없음'
          })
          .where(eq(scheduledPushNotifications.id, notif.id));
        return;
      }

      let anySuccess = false;

      // FCM data payload 은 string key/value 만 허용 → 숫자/불리언 등은 문자열화
      let normalizedData: Record<string, string> | undefined;
      if (notif.data && typeof notif.data === 'object') {
        normalizedData = {};
        for (const [k, v] of Object.entries(notif.data as Record<string, unknown>)) {
          if (v === null || v === undefined) continue;
          normalizedData[k] = typeof v === 'string' ? v : JSON.stringify(v);
        }
      }

      for (const token of userTokens) {
        const result = await fcmService.sendToDevice(
          token.token,
          notif.title,
          notif.message,
          normalizedData
        );

        if (result.success) {
          anySuccess = true;
        } else if (result.error === 'INVALID_TOKEN') {
          await db
            .update(fcmTokens)
            .set({ isActive: false, updatedAt: new Date() })
            .where(eq(fcmTokens.id, token.id));
        }

        // 로그 기록
        await db.insert(pushNotificationLogs).values({
          campaignId: notif.campaignId,
          userId: notif.userId,
          tokenId: token.id,
          title: notif.title,
          message: notif.message,
          status: result.success ? 'success' : 'failed',
          messageId: result.messageId,
          errorMessage: result.error
        });
      }

      await db
        .update(scheduledPushNotifications)
        .set({ 
          status: anySuccess ? 'sent' : 'failed',
          sentAt: new Date(),
          errorMessage: anySuccess ? null : '모든 토큰 발송 실패'
        })
        .where(eq(scheduledPushNotifications.id, notif.id));

    } catch (error: any) {
      logServerError(`[Push Scheduler] 알림 ${notif.id} 발송 실패:`, error);
      
      await db
        .update(scheduledPushNotifications)
        .set({ 
          status: 'failed',
          sentAt: new Date(),
          errorMessage: error.message
        })
        .where(eq(scheduledPushNotifications.id, notif.id));
    }
  }

  /**
   * 대상 토큰 조회 헬퍼
   */
  private async getTargetTokens(
    targetType: string,
    criteria?: { role?: string; petTypes?: string[] }
  ): Promise<{ userId: number; tokenId: number; token: string }[]> {
    let userIds: number[] = [];

    if (targetType === 'all') {
      const allUsers = await db.select({ id: users.id }).from(users).where(eq(users.isActive, true));
      userIds = allUsers.map(u => u.id);
    } else if (targetType === 'role' && criteria?.role) {
      const roleUsers = await db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.isActive, true), eq(users.role, criteria.role)));
      userIds = roleUsers.map(u => u.id);
    }

    if (userIds.length === 0) {
      return [];
    }

    return await db
      .select({
        userId: fcmTokens.userId,
        tokenId: fcmTokens.id,
        token: fcmTokens.token
      })
      .from(fcmTokens)
      .where(and(
        inArray(fcmTokens.userId, userIds),
        eq(fcmTokens.isActive, true)
      ));
  }
}

export const pushSchedulerService = PushSchedulerService.getInstance();
