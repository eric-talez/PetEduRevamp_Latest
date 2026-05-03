
import type { Express } from "express";
import { WebSocket, WebSocketServer } from 'ws';
import type { Server } from "http";
import { notificationService } from '../notifications/notification-service';
import { db } from '../db';
import { notifications } from '@shared/schema';
import { eq, and, desc } from 'drizzle-orm';
import { logServerError } from '../middleware/audit-logger';

export function registerNotificationRoutes(app: Express, server: Server) {
  console.log('[NotificationRoutes] Registering notification routes');

  // WebSocket 서버 초기화
  const wss = new WebSocketServer({ 
    server: server,
    path: '/ws'
  });

  wss.on('connection', (ws: WebSocket, req) => {
    console.log('[WebSocket] 새로운 연결');
    
    let userId: number | null = null;

    ws.on('message', (message: string) => {
      try {
        const data = JSON.parse(message);
        
        if (data.type === 'authenticate' && data.userId) {
          userId = parseInt(data.userId);
          notificationService.addConnection(userId, ws);
          
          ws.send(JSON.stringify({
            type: 'auth_success',
            message: '실시간 알림 연결 완료'
          }));
          
          console.log(`[WebSocket] 사용자 ${userId} 인증 완료`);
        }
      } catch (error) {
        logServerError('[WebSocket] 메시지 파싱 오류:', error, req);
      }
    });

    ws.on('close', () => {
      if (userId) {
        notificationService.removeConnection(userId, ws);
      }
      console.log('[WebSocket] 연결 종료');
    });

    ws.on('error', (error) => {
      logServerError('[WebSocket] 연결 오류:', error, req);
      if (userId) {
        notificationService.removeConnection(userId, ws);
      }
    });
  });

  // 알림 목록 조회
  app.get('/api/notifications', async (req, res) => {
    const user = req.user || (process.env.NODE_ENV === 'development' ? 
      { id: 1, username: 'testuser', name: '반려인', role: 'pet-owner' } : null);
    
    if (!user) {
      return res.status(401).json({ message: '인증이 필요합니다.' });
    }

    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = (page - 1) * limit;

      const userNotifications = await notificationService.getUserNotifications(user.id, limit, offset);
      
      res.json(userNotifications);
    } catch (error) {
      logServerError('[Notifications] 알림 목록 조회 실패:', error, req);
      res.status(500).json({ error: '알림을 불러올 수 없습니다' });
    }
  });

  // 읽지 않은 알림 수 조회
  app.get('/api/notifications/unread-count', async (req, res) => {
    const user = req.user || (process.env.NODE_ENV === 'development' ? 
      { id: 1, username: 'testuser', name: '반려인', role: 'pet-owner' } : null);
    
    if (!user) {
      return res.status(401).json({ error: '인증이 필요합니다' });
    }

    try {
      const count = await notificationService.getUnreadCount(user.id);
      res.json({ count });
    } catch (error) {
      logServerError('[Notifications] 읽지 않은 알림 수 조회 실패:', error, req);
      res.status(500).json({ error: '알림 정보를 불러올 수 없습니다' });
    }
  });

  // 알림 읽음 처리
  app.patch('/api/notifications/:id/read', async (req, res) => {
    const user = req.user || (process.env.NODE_ENV === 'development' ? 
      { id: 1, username: 'testuser', name: '반려인', role: 'pet-owner' } : null);
    
    if (!user) {
      return res.status(401).json({ error: '인증이 필요합니다' });
    }

    try {
      const notificationId = parseInt(req.params.id);
      await notificationService.markAsRead(notificationId, user.id);
      
      res.json({ success: true });
    } catch (error) {
      logServerError('[Notifications] 알림 읽음 처리 실패:', error, req);
      res.status(500).json({ error: '알림 상태를 업데이트할 수 없습니다' });
    }
  });

  // 모든 알림 읽음 처리
  app.patch('/api/notifications/read-all', async (req, res) => {
    const user = req.user || (process.env.NODE_ENV === 'development' ? 
      { id: 1, username: 'testuser', name: '반려인', role: 'pet-owner' } : null);
    
    if (!user) {
      return res.status(401).json({ error: '인증이 필요합니다' });
    }

    try {
      await notificationService.markAllAsRead(user.id);
      res.json({ success: true });
    } catch (error) {
      logServerError('[Notifications] 모든 알림 읽음 처리 실패:', error, req);
      res.status(500).json({ error: '알림 상태를 업데이트할 수 없습니다' });
    }
  });

  // 알림 삭제
  app.delete('/api/notifications/:id', async (req, res) => {
    const user = req.user || (process.env.NODE_ENV === 'development' ? 
      { id: 1, username: 'testuser', name: '반려인', role: 'pet-owner' } : null);
    
    if (!user) {
      return res.status(401).json({ error: '인증이 필요합니다' });
    }

    try {
      const notificationId = parseInt(req.params.id);
      
      await db.delete(notifications)
        .where(and(
          eq(notifications.id, notificationId),
          eq(notifications.userId, user.id)
        ));
      
      res.json({ success: true });
    } catch (error) {
      logServerError('[Notifications] 알림 삭제 실패:', error, req);
      res.status(500).json({ error: '알림을 삭제할 수 없습니다' });
    }
  });

  // 테스트용 알림 발송 (개발 환경)
  if (process.env.NODE_ENV === 'development') {
    app.post('/api/notifications/test', async (req, res) => {
      const user = req.user || { id: 1, username: 'testuser', name: '반려인', role: 'pet-owner' };

      try {
        const { title, message, type = 'info' } = req.body;
        
        await notificationService.sendNotification({
          userId: user.id,
          type: type as any,
          title: title || '테스트 알림',
          message: message || '테스트 알림 메시지입니다.',
          data: { test: true }
        });

        res.json({ success: true, message: '테스트 알림이 전송되었습니다.' });
      } catch (error) {
        logServerError('[Notifications] 테스트 알림 전송 실패:', error, req);
        res.status(500).json({ error: '알림 전송에 실패했습니다' });
      }
    });
  }

  console.log('[NotificationRoutes] WebSocket 서버 및 알림 라우트 등록 완료');
}
