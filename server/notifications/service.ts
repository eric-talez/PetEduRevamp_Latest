import { WebSocket, WebSocketServer } from 'ws';
import { IStorage } from '../storage';
import { UserRole } from '@shared/schema';
import { logger } from '../monitoring/logger';
import { logServerError } from '../middleware/audit-logger';

// 알림 타입 정의
export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'system';
  timestamp: Date;
  isRead: boolean;
  userId: number;
  linkTo?: string;
  metadata?: any;
}

// 알림 서비스 클래스
export class NotificationService {
  private wss: WebSocketServer;
  private storage: IStorage;
  private clients: Map<number, WebSocket[]> = new Map();
  
  constructor(wss: WebSocketServer, storage: IStorage) {
    this.wss = wss;
    this.storage = storage;
    
    this.setupWebSocketServer();
  }
  
  private setupWebSocketServer() {
    this.wss.on('connection', (ws: WebSocket) => {
      // 인증 정보를 담을 변수
      let userId: number | null = null;
      
      ws.on('message', async (message: string) => {
        try {
          const data = JSON.parse(message);
          
          // 인증 메시지 처리
          if (data.type === 'authenticate') {
            // 유효한 userId 확인 (null이 아닌지)
            if (data.userId) {
              userId = data.userId;
              
              // 현재 사용자의 클라이언트 목록 가져오기
              const userClients = this.clients.get(userId) || [];
              userClients.push(ws);
              this.clients.set(userId, userClients);
            } else {
              logger.error('[NotificationService] Invalid userId in authentication');
              ws.send(JSON.stringify({
                type: 'authentication_error',
                message: '유효하지 않은 사용자 ID입니다.'
              }));
              return;
            }
            
            console.log(`[NotificationService] User ${userId} authenticated`);
            
            // 인증 성공 응답 전송
            ws.send(JSON.stringify({
              type: 'authentication_success',
              timestamp: new Date(),
              message: '인증 성공'
            }));
            
            // 미읽은 알림 전송
            await this.sendUnreadNotifications(userId);
          }
          
          // 알림 읽음 표시 처리
          if (data.type === 'mark_read' && userId) {
            if (data.notificationId) {
              await this.markAsRead(userId, data.notificationId);
            } else if (data.markAll) {
              await this.markAllAsRead(userId);
            }
          }
        } catch (error) {
          logServerError('[NotificationService] Error processing message:', error);
        }
      });
      
      // 연결 종료 처리
      ws.on('close', () => {
        if (userId) {
          const userClients = this.clients.get(userId) || [];
          const index = userClients.indexOf(ws);
          if (index !== -1) {
            userClients.splice(index, 1);
            this.clients.set(userId, userClients);
          }
          console.log(`[NotificationService] User ${userId} disconnected`);
        }
      });
    });
  }
  
  // 사용자에게 알림 전송
  public async sendNotification(
    userId: number,
    title: string,
    message: string,
    type: 'info' | 'success' | 'warning' | 'error' | 'system' = 'info',
    linkTo?: string,
    metadata?: any
  ) {
    try {
      // 알림 저장 (실제 구현에서는 데이터베이스에 저장)
      const notification: Notification = {
        id: Date.now().toString(),
        title,
        message,
        type,
        timestamp: new Date(),
        isRead: false,
        userId,
        linkTo,
        metadata
      };
      
      // 알림 발송
      const userClients = this.clients.get(userId) || [];
      const payload = JSON.stringify({
        type: 'notification',
        notification
      });
      
      userClients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(payload);
        }
      });
      
      console.log(`[NotificationService] Notification sent to user ${userId}`);
      return notification;
      
    } catch (error) {
      logServerError('[NotificationService] Error sending notification:', error);
      throw error;
    }
  }
  
  // 그룹 알림 전송 (특정 역할의 모든 사용자에게)
  public async sendGroupNotification(
    roles: UserRole[],
    title: string,
    message: string,
    type: 'info' | 'success' | 'warning' | 'error' | 'system' = 'info',
    linkTo?: string,
    metadata?: any
  ) {
    try {
      // 해당 역할의 모든 사용자 ID 가져오기 (실제 구현에서는 데이터베이스에서 조회)
      const userIds: number[] = [];
      
      // 모든 사용자에게 알림 전송
      const notifications = await Promise.all(
        userIds.map(userId => 
          this.sendNotification(userId, title, message, type, linkTo, metadata)
        )
      );
      
      return notifications;
    } catch (error) {
      logServerError('[NotificationService] Error sending group notification:', error);
      throw error;
    }
  }
  
  // 사용자의 미읽은 알림 목록 전송
  private async sendUnreadNotifications(userId: number) {
    try {
      // 미읽은 알림 목록 가져오기 (실제 구현에서는 데이터베이스에서 조회)
      const unreadNotifications: Notification[] = [];
      
      // 알림 전송
      const userClients = this.clients.get(userId) || [];
      const payload = JSON.stringify({
        type: 'unread_notifications',
        notifications: unreadNotifications
      });
      
      userClients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(payload);
        }
      });
      
    } catch (error) {
      logServerError('[NotificationService] Error sending unread notifications:', error);
    }
  }
  
  // 특정 알림을 읽음으로 표시
  private async markAsRead(userId: number, notificationId: string) {
    try {
      // 알림을 읽음으로 업데이트 (실제 구현에서는 데이터베이스에서 업데이트)
      console.log(`[NotificationService] Marking notification ${notificationId} as read for user ${userId}`);
      
      // 업데이트 결과 전송
      const userClients = this.clients.get(userId) || [];
      const payload = JSON.stringify({
        type: 'notification_marked_read',
        notificationId
      });
      
      userClients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(payload);
        }
      });
      
    } catch (error) {
      logServerError('[NotificationService] Error marking notification as read:', error);
    }
  }
  
  // 모든 알림을 읽음으로 표시
  private async markAllAsRead(userId: number) {
    try {
      // 모든 알림을 읽음으로 업데이트 (실제 구현에서는 데이터베이스에서 업데이트)
      console.log(`[NotificationService] Marking all notifications as read for user ${userId}`);
      
      // 업데이트 결과 전송
      const userClients = this.clients.get(userId) || [];
      const payload = JSON.stringify({
        type: 'all_notifications_marked_read'
      });
      
      userClients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(payload);
        }
      });
      
    } catch (error) {
      logServerError('[NotificationService] Error marking all notifications as read:', error);
    }
  }
}