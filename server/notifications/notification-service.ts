import { WebSocket } from 'ws';
import { db } from '../db';
import { notifications, fcmTokens } from '../../shared/schema';
import { eq, and, desc } from 'drizzle-orm';
import { fcmService } from '../services/fcm-service';
import { logServerError } from '../middleware/audit-logger';

export interface NotificationData {
  userId: number;
  type: 'system' | 'course' | 'event' | 'health' | 'payment' | 'message' | 'training' | 'reservation';
  title: string;
  message: string;
  data?: any;
  actionUrl?: string;
}

// 실시간 알림 서비스 (WebSocket)
export class NotificationService {
  private static instance: NotificationService;
  private clients: Map<string, WebSocket> = new Map();
  private wsServer: WebSocket.Server | null = null;

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  // WebSocket 서버 초기화
  initializeWebSocketServer(server: any) {
    this.wsServer = new WebSocket.Server({ 
      server,
      path: '/ws'
    });

    this.wsServer.on('connection', (ws: WebSocket, req: any) => {
      const userId = req.url?.split('userId=')[1] || 'anonymous';
      this.addClient(userId, ws);

      ws.on('close', () => {
        this.removeClient(userId);
      });

      ws.on('error', (error) => {
        logServerError(`[알림] WebSocket 오류:`, error, req);
        this.removeClient(userId);
      });

      // 연결 확인 메시지 발송
      ws.send(JSON.stringify({
        type: 'connected',
        message: '실시간 알림이 활성화되었습니다.'
      }));
    });

    console.log('[알림] WebSocket 서버가 초기화되었습니다.');
  }

  // WebSocket 연결 등록
  addClient(userId: string, ws: WebSocket) {
    this.clients.set(userId, ws);
    console.log(`[알림] 사용자 ${userId} WebSocket 연결됨 (총 ${this.clients.size}개 연결)`);
  }

  // WebSocket 연결 해제
  removeClient(userId: string) {
    this.clients.delete(userId);
    console.log(`[알림] 사용자 ${userId} WebSocket 연결 해제됨 (총 ${this.clients.size}개 연결)`);
  }

  // 실시간 알림 발송
  async sendRealTimeNotification(userId: string, notification: any) {
    const client = this.clients.get(userId);
    if (client && client.readyState === WebSocket.OPEN) {
      try {
        client.send(JSON.stringify({
          type: 'notification',
          data: notification,
          timestamp: new Date().toISOString()
        }));
        console.log(`[알림] 사용자 ${userId}에게 실시간 알림 발송됨`);
        return true;
      } catch (error) {
        logServerError(`[알림] 실시간 알림 발송 실패:`, error);
        this.removeClient(userId);
        return false;
      }
    }
    return false;
  }

  // 대량 알림 발송
  async sendBulkNotification(userIds: string[], notification: any) {
    const results = [];
    for (const userId of userIds) {
      const success = await this.sendRealTimeNotification(userId, notification);
      results.push({ userId, success });
    }
    console.log(`[알림] 대량 알림 발송 완료: ${results.filter(r => r.success).length}/${results.length}`);
    return results;
  }

  // 연결된 클라이언트 수 조회
  getConnectedClientsCount(): number {
    return this.clients.size;
  }

  // 특정 사용자 연결 상태 확인
  isUserConnected(userId: string): boolean {
    const client = this.clients.get(userId);
    return client ? client.readyState === WebSocket.OPEN : false;
  }

  // 푸시 알림 발송 (모의)
  async sendPushNotification(userId: string, notification: any) {
    // 실제 환경에서는 FCM, APNS 등과 연동
    console.log(`[푸시알림] 사용자 ${userId}에게 푸시 알림 발송:`, notification.title);
    return true;
  }

  // 이메일 알림 발송 (모의)
  async sendEmailNotification(userId: string, notification: any) {
    // 실제 환경에서는 이메일 서비스와 연동
    console.log(`[이메일알림] 사용자 ${userId}에게 이메일 알림 발송:`, notification.title);
    return true;
  }

  // SMS 알림 발송 (모의)
  async sendSMSNotification(userId: string, notification: any) {
    // 실제 환경에서는 SMS 서비스와 연동
    console.log(`[SMS알림] 사용자 ${userId}에게 SMS 알림 발송:`, notification.title);
    return true;
  }
  private connections: Map<number, WebSocket[]> = new Map();

  // static getInstance(): NotificationService {
  //   if (!NotificationService.instance) {
  //     NotificationService.instance = new NotificationService();
  //   }
  //   return NotificationService.instance;
  // }

  // WebSocket 연결 등록
  addConnection(userId: number, ws: WebSocket): void {
    if (!this.connections.has(userId)) {
      this.connections.set(userId, []);
    }
    this.connections.get(userId)!.push(ws);

    ws.on('close', () => {
      this.removeConnection(userId, ws);
    });

    ws.on('error', (error) => {
      logServerError(`[Notification] WebSocket error for user ${userId}:`, error);
      this.removeConnection(userId, ws);
    });

    console.log(`[Notification] 사용자 ${userId} WebSocket 연결됨 (총 ${this.connections.get(userId)?.length}개)`);
  }

  // WebSocket 연결 해제
  removeConnection(userId: number, ws: WebSocket): void {
    const userConnections = this.connections.get(userId);
    if (userConnections) {
      const index = userConnections.indexOf(ws);
      if (index > -1) {
        userConnections.splice(index, 1);
      }
      if (userConnections.length === 0) {
        this.connections.delete(userId);
      }
    }
    console.log(`[Notification] 사용자 ${userId} WebSocket 연결 해제됨`);
  }

  // 알림 타입 → 카테고리 매핑
  private getCategoryFromType(type: string): string {
    if (type === 'message') return 'message';
    if (['reservation', 'course', 'training'].includes(type)) return 'reservation';
    if (type === 'payment') return 'payment';
    return 'system';
  }

  // 실시간 알림 발송 (NotificationOrchestrator 패턴)
  async sendNotification(notification: NotificationData): Promise<void> {
    try {
      const category = this.getCategoryFromType(notification.type);

      // 사용자 수신 설정 확인 (인앱/푸시 별도)
      let inAppEnabled = true;
      let pushEnabled = true;
      try {
        const { storage } = await import('../storage');
        if (typeof storage.isNotificationChannelEnabled === 'function') {
          inAppEnabled = await storage.isNotificationChannelEnabled(notification.userId, category, 'inApp');
          pushEnabled = await storage.isNotificationChannelEnabled(notification.userId, category, 'push');
        }
      } catch (e) {
        // 설정 조회 실패 시 기본값 (모두 활성)
      }

      // 인앱 알림이 비활성이면 저장도 하지 않음 (유저가 명시적으로 끔)
      if (!inAppEnabled && !pushEnabled) {
        console.log(`[Notification] 사용자 ${notification.userId} 카테고리 ${category} 수신 거부 - 발송 스킵`);
        return;
      }

      // 1. 인메모리 storage에 알림 저장 (인앱 활성 시) — 사용자 API와 통일된 데이터 소스
      let savedNotification: { id: number; [k: string]: unknown } | null = null;
      if (inAppEnabled) {
        const { storage } = await import('../storage');
        savedNotification = await storage.createNotification({
          userId: notification.userId,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          actionUrl: notification.actionUrl || null,
          metadata: notification.data || null,
          isRead: false,
        });

        // 2. WebSocket으로 실시간 전송 (앱이 열려있는 경우)
        const userConnections = this.connections.get(notification.userId);
        let webSocketSent = false;

        if (userConnections && userConnections.length > 0) {
          const payload = JSON.stringify({
            type: 'notification',
            data: savedNotification
          });

          userConnections.forEach(ws => {
            if (ws.readyState === WebSocket.OPEN) {
              try {
                ws.send(payload);
                webSocketSent = true;
              } catch (error) {
                logServerError(`[Notification] WebSocket 전송 실패:`, error);
                this.removeConnection(notification.userId, ws);
              }
            }
          });

          if (webSocketSent) {
            console.log(`[Notification] ✓ WebSocket - 사용자 ${notification.userId}: ${notification.title}`);
          }
        }
      }

      // 3. FCM 푸시 알림 전송 (푸시 활성 시)
      if (pushEnabled) {
        await this.sendFCMNotification(
          notification.userId,
          notification.title,
          notification.message,
          {
            type: notification.type,
            category,
            actionUrl: notification.actionUrl || '',
            notificationId: savedNotification ? savedNotification.id.toString() : '',
            ...(notification.data || {})
          }
        );
      }

    } catch (error) {
      logServerError('[Notification] 알림 발송 실패:', error);
      throw error;
    }
  }

  // FCM 푸시 알림 전송 (Private Helper)
  private async sendFCMNotification(
    userId: number,
    title: string,
    body: string,
    data: Record<string, string>
  ): Promise<void> {
    if (!fcmService.isReady()) {
      console.log('[FCM] Firebase 미설정 - 푸시 알림 스킵');
      return;
    }

    try {
      // 사용자의 활성 FCM 토큰 조회
      const userTokens = await db
        .select()
        .from(fcmTokens)
        .where(and(
          eq(fcmTokens.userId, userId),
          eq(fcmTokens.isActive, true)
        ));

      if (userTokens.length === 0) {
        console.log(`[FCM] 사용자 ${userId}의 FCM 토큰 없음 - 푸시 알림 스킵`);
        return;
      }

      const tokens = userTokens.map(t => t.token);

      // 여러 기기에 푸시 알림 전송
      const result = await fcmService.sendToMultipleDevices(
        tokens,
        title,
        body,
        data
      );

      console.log(`[FCM] ✓ 푸시 알림 - 사용자 ${userId}: 성공 ${result.successCount}/${tokens.length}`);

      // 무효한 토큰 제거
      if (result.invalidTokens.length > 0) {
        await db
          .update(fcmTokens)
          .set({ isActive: false, updatedAt: new Date() })
          .where(and(
            eq(fcmTokens.userId, userId),
            // Note: Drizzle doesn't support inArray for text columns easily, so we loop
          ));
        
        // 무효한 토큰 개별 비활성화
        for (const invalidToken of result.invalidTokens) {
          await db
            .update(fcmTokens)
            .set({ isActive: false, updatedAt: new Date() })
            .where(eq(fcmTokens.token, invalidToken));
        }

        console.log(`[FCM] ${result.invalidTokens.length}개의 무효한 토큰 비활성화됨`);
      }
    } catch (error) {
      logServerError('[FCM] 푸시 알림 전송 실패:', error);
      // FCM 실패는 전체 알림 발송을 막지 않음 (graceful degradation)
    }
  }

  // 대량 알림 발송
  async sendBulkNotification2(userIds: number[], notification: Omit<NotificationData, 'userId'>): Promise<void> {
    const promises = userIds.map(userId => 
      this.sendNotification({ ...notification, userId })
    );
    await Promise.all(promises);
  }

  // 사용자별 읽지 않은 알림 수 조회
  async getUnreadCount(userId: number): Promise<number> {
    const result = await db.select().from(notifications)
      .where(and(
        eq(notifications.userId, userId),
        eq(notifications.isRead, false)
      ));
    return result.length;
  }

  // 알림 읽음 처리
  async markAsRead(notificationId: number, userId: number): Promise<void> {
    await db.update(notifications)
      .set({ 
        isRead: true,
        readAt: new Date()
      })
      .where(and(
        eq(notifications.id, notificationId),
        eq(notifications.userId, userId)
      ));

    // 실시간으로 읽음 상태 업데이트 전송
    const userConnections = this.connections.get(userId);
    if (userConnections) {
      const payload = JSON.stringify({
        type: 'notification_read',
        data: { notificationId }
      });

      userConnections.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(payload);
        }
      });
    }
  }

  // 모든 알림 읽음 처리
  async markAllAsRead(userId: number): Promise<void> {
    await db.update(notifications)
      .set({ 
        isRead: true,
        readAt: new Date()
      })
      .where(eq(notifications.userId, userId));

    // 실시간으로 모든 읽음 상태 업데이트 전송
    const userConnections = this.connections.get(userId);
    if (userConnections) {
      const payload = JSON.stringify({
        type: 'all_notifications_read'
      });

      userConnections.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(payload);
        }
      });
    }
  }

  // 사용자 알림 목록 조회
  async getUserNotifications(userId: number, limit: number = 20, offset: number = 0): Promise<any[]> {
    const results = await db.select().from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(limit)
      .offset(offset);

    return results.map(notification => ({
      ...notification,
      data: notification.data ? JSON.parse(notification.data) : null
    }));
  }

  // 연결된 사용자 수 확인
  getConnectionsCount(): number {
    let total = 0;
    this.connections.forEach(connections => {
      total += connections.length;
    });
    return total;
  }

  // 특정 사용자 온라인 상태 확인
  isUserOnline(userId: number): boolean {
    const userConnections = this.connections.get(userId);
    return userConnections ? userConnections.length > 0 : false;
  }

  // 시스템 알림 전송 (모든 사용자에게)
  async sendSystemNotification(title: string, message: string, data?: any): Promise<void> {
    // 모든 온라인 사용자에게 시스템 알림 전송
    const onlineUsers = Array.from(this.connections.keys());

    for (const userId of onlineUsers) {
      await this.sendNotification({
        userId,
        type: 'system',
        title,
        message,
        data
      });
    }
  }

  // 특정 이벤트 알림 메서드들
  async notifyEventRegistration(userId: number, eventTitle: string, eventId: number): Promise<void> {
    await this.sendNotification({
      userId,
      type: 'event',
      title: '이벤트 참가 신청 완료',
      message: `"${eventTitle}" 이벤트 참가 신청이 완료되었습니다.`,
      data: { eventId, action: 'registered' }
    });
  }

  async notifyCourseEnrollment(userId: number, courseTitle: string, courseId: number): Promise<void> {
    await this.sendNotification({
      userId,
      type: 'course',
      title: '강좌 등록 완료',
      message: `"${courseTitle}" 강좌 등록이 완료되었습니다.`,
      data: { courseId, action: 'enrolled' }
    });
  }

  async notifyHealthCheckupReminder(userId: number, petName: string, dueDate: Date): Promise<void> {
    await this.sendNotification({
      userId,
      type: 'health',
      title: '건강검진 일정 알림',
      message: `${petName}의 건강검진 일정이 다가왔습니다.`,
      data: { petName, dueDate, action: 'checkup_reminder' }
    });
  }

  async notifyPaymentSuccess(userId: number, amount: number, description: string): Promise<void> {
    await this.sendNotification({
      userId,
      type: 'payment',
      title: '결제 완료',
      message: `${description} 결제가 완료되었습니다. (${amount.toLocaleString()}원)`,
      data: { amount, description, action: 'payment_success' }
    });
  }
}

export const notificationService = NotificationService.getInstance();