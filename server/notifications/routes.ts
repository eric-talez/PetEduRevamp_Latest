import { Express } from 'express';
import { z } from 'zod';
import { storage } from '../storage';
import { NotificationService } from './service';
import { csrfProtection } from '../middleware/csrf';
import { logServerError } from '../middleware/audit-logger';

// 알림 관련 API 라우트 등록
export function registerNotificationRoutes(app: Express, notificationService: NotificationService) {
  console.log('[NotificationRoutes] Registering notification routes');
  
  // 관리자 페이지 라우트
  app.get('/admin-dashboard', (req, res) => {
    // 실제 구현에서는 관리자 권한 확인 필요
    // if (!req.session.user || req.session.user.role !== 'admin') {
    //   return res.status(403).send('관리자만 접근 가능합니다');
    // }
    res.sendFile(process.cwd() + '/public/admin-dashboard.html');
  });
  
  app.get('/admin-users', (req, res) => {
    // 실제 구현에서는 관리자 권한 확인 필요
    // if (!req.session.user || req.session.user.role !== 'admin') {
    //   return res.status(403).send('관리자만 접근 가능합니다');
    // }
    res.sendFile(process.cwd() + '/public/admin-users.html');
  });
  
  app.get('/admin-notifications', (req, res) => {
    // 실제 구현에서는 관리자 권한 확인 필요
    // if (!req.session.user || req.session.user.role !== 'admin') {
    //   return res.status(403).send('관리자만 접근 가능합니다');
    // }
    res.sendFile(process.cwd() + '/public/admin-notifications.html');
  });
  
  // 알림 목록 가져오기 API
  app.get('/api/notifications', async (req, res) => {
    // 개발환경에서는 기본 사용자 설정
    const user = req.user || (process.env.NODE_ENV === 'development' ? 
      { id: 1, username: 'testuser', name: '반려인', role: 'pet-owner' } : null) as { id: number; username: string; name: string; role: string } | null;
    
    if (!user) {
      return res.status(401).json({ message: '인증이 필요합니다.' });
    }
    
    try {
      // 페이지네이션 파라미터
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const offset = (page - 1) * limit;
      
      // 읽음 여부 필터
      const status = req.query.status as string | undefined;
      const isRead = status === 'read' ? true : status === 'unread' ? false : undefined;
      
      // 실제 구현에서는 데이터베이스에서 알림 목록 조회
      // 임시 데이터 반환
      const sampleNotifications = Array.from({ length: 20 }, (_, index) => ({
        id: index + 1,
        type: ['event', 'course', 'health', 'payment', 'system'][Math.floor(Math.random() * 5)] as 'event' | 'course' | 'health' | 'payment' | 'system',
        title: `알림 제목 ${index + 1}`,
        message: `알림 내용 ${index + 1}입니다.`,
        data: Math.random() > 0.7 ? { category: ['system', 'course', 'pet', 'social', 'payment'][Math.floor(Math.random() * 5)] } : undefined,
        isRead: Math.random() > 0.5, // 50% 확률로 읽음/안읽음
        createdAt: new Date(Date.now() - Math.random() * 86400000 * 7).toISOString(), // 최근 7일 내 랜덤 시간
      }));
      
      // 읽음 여부 필터링
      const filteredNotifications = isRead !== undefined
        ? sampleNotifications.filter(n => n.isRead === isRead)
        : sampleNotifications;
      
      // 페이지네이션 적용
      const paginatedNotifications = filteredNotifications.slice(offset, offset + limit);
      const totalCount = filteredNotifications.length;
      const totalPages = Math.ceil(totalCount / limit);
      
      // Frontend expects array directly, not wrapped in notifications property
      return res.status(200).json(paginatedNotifications);
    } catch (error) {
      logServerError('Error fetching notifications:', error, req);
      return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
  });
  
  // 특정 알림 조회 API
  app.get('/api/notifications/:id', async (req, res) => {
    // 개발환경에서는 기본 사용자 설정
    const user = req.user || (process.env.NODE_ENV === 'development' ? 
      { id: 1, username: 'testuser', name: '반려인', role: 'pet-owner' } : null) as { id: number; username: string; name: string; role: string } | null;
    
    if (!user) {
      return res.status(401).json({ message: '인증이 필요합니다.' });
    }
    
    try {
      const notificationId = req.params.id;
      
      // 실제 구현에서는 데이터베이스에서 알림 조회
      // 임시 데이터 반환
      const notification = {
        id: notificationId,
        title: `알림 제목 ${notificationId}`,
        message: `알림 내용 ${notificationId}입니다.`,
        type: 'info' as const,
        timestamp: new Date(),
        isRead: false,
        userId: (user as any).id,
        linkTo: `/notifications/${notificationId}`,
        metadata: { category: 'system' }
      };
      
      return res.status(200).json(notification);
    } catch (error) {
      logServerError('Error fetching notification:', error, req);
      return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
  });
  
  // 알림 읽음 표시 API
  app.patch('/api/notifications/:id/read', csrfProtection, async (req, res) => {
    // 개발환경에서는 기본 사용자 설정
    const user = req.user || (process.env.NODE_ENV === 'development' ? 
      { id: 1, username: 'testuser', name: '반려인', role: 'pet-owner' } : null) as { id: number; username: string; name: string; role: string } | null;
    
    if (!user) {
      return res.status(401).json({ message: '인증이 필요합니다.' });
    }
    
    try {
      const notificationId = req.params.id;
      
      // 실제 구현에서는 데이터베이스에서 알림 업데이트
      
      return res.status(200).json({ message: '알림이 읽음으로 표시되었습니다.' });
    } catch (error) {
      logServerError('Error marking notification as read:', error, req);
      return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
  });
  
  // 모든 알림 읽음 표시 API
  app.patch('/api/notifications/read-all', csrfProtection, async (req, res) => {
    if (!req.session.user) {
      return res.status(401).json({ message: '인증이 필요합니다.' });
    }
    
    try {
      // 실제 구현에서는 데이터베이스에서 모든 알림 업데이트
      
      return res.status(200).json({ message: '모든 알림이 읽음으로 표시되었습니다.' });
    } catch (error) {
      logServerError('Error marking all notifications as read:', error, req);
      return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
  });
  
  // 알림 삭제 API
  app.delete('/api/notifications/:id', csrfProtection, async (req, res) => {
    if (!req.session.user) {
      return res.status(401).json({ message: '인증이 필요합니다.' });
    }
    
    try {
      const notificationId = req.params.id;
      
      // 실제 구현에서는 데이터베이스에서 알림 삭제
      
      return res.status(200).json({ message: '알림이 삭제되었습니다.' });
    } catch (error) {
      logServerError('Error deleting notification:', error, req);
      return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
  });
  
  // 모든 알림 삭제 API
  app.delete('/api/notifications', csrfProtection, async (req, res) => {
    if (!req.session.user) {
      return res.status(401).json({ message: '인증이 필요합니다.' });
    }
    
    try {
      // 실제 구현에서는 데이터베이스에서 모든 알림 삭제
      
      return res.status(200).json({ message: '모든 알림이 삭제되었습니다.' });
    } catch (error) {
      logServerError('Error deleting all notifications:', error, req);
      return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
  });
  
  // 테스트용 알림 발송 API (개발 환경에서만 활성화)
  if (process.env.NODE_ENV !== 'production') {
    app.post('/api/test/notifications', csrfProtection, async (req, res) => {
      if (!req.session.user) {
        return res.status(401).json({ message: '인증이 필요합니다.' });
      }
      
      try {
        const schema = z.object({
          title: z.string().min(1),
          message: z.string().min(1),
          type: z.enum(['info', 'success', 'warning', 'error', 'system']).optional(),
          linkTo: z.string().optional(),
          metadata: z.any().optional()
        });
        
        const data = schema.parse(req.body);
        
        // 알림 발송
        const notification = await notificationService.sendNotification(
          req.session.user.id,
          data.title,
          data.message,
          data.type || 'info',
          data.linkTo,
          data.metadata
        );
        
        return res.status(201).json({ message: '테스트 알림이 발송되었습니다.', notification });
      } catch (error) {
        logServerError('Error sending test notification:', error, req);
        return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
      }
    });
  }
}