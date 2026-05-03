import type { Express } from "express";
import type { Server } from "http";
import { WebSocketServer } from 'ws';
import { MessagingService } from '../messaging/service';
import { storage } from '../storage';
import { asyncHandler, AppError } from '../middleware/error-handler';
import { logServerError } from '../middleware/audit-logger';

let messagingService: MessagingService;

export function registerMessagingRoutes(app: Express, server: Server) {
  console.log('[MessagingRoutes] Registering messaging routes');

  // WebSocket 서버 초기화
  const wss = new WebSocketServer({ 
    server, 
    path: '/ws/messaging',
    verifyClient: (info) => {
      return true;
    }
  });

  wss.on('connection', ws => {
    console.log('WebSocket connection established');

    ws.isAlive = true; // Add isAlive property

    ws.on('pong', () => {
      ws.isAlive = true;
    });

    ws.on('error', error => {
      logServerError('WebSocket error:', error);
    });

    ws.on('close', (code, reason) => {
      console.log('WebSocket closed with code %d and reason %s', code, reason);
    });
  });

  // Ping clients regularly to check connection
  setInterval(() => {
    wss.clients.forEach(ws => {
      if (ws.isAlive === false) {
        console.log('Terminating WebSocket due to inactivity');
        return ws.terminate();
      }

      ws.isAlive = false;
      ws.ping(() => {});
    });
  }, 30000); // Check every 30 seconds

  // 메시징 서비스 초기화
  messagingService = new MessagingService(wss, storage);

  // 대화 목록 조회
  app.get('/api/messages/conversations', asyncHandler(async (req: any, res: any) => {
    if (!req.user) {
      throw new AppError('인증이 필요합니다.', 401);
    }

    // 개발환경에서는 더미 데이터 반환
    const conversations = [
      {
        id: 'conv_1',
        participants: [
          { id: 1, name: '반려인', role: 'pet-owner' },
          { id: 2, name: '김민수 훈련사', role: 'trainer' }
        ],
        lastMessage: {
          content: '안녕하세요! 강아지 훈련 상담 받고 싶습니다.',
          timestamp: new Date(),
          senderId: 1
        },
        unreadCount: 2
      },
      {
        id: 'conv_2',
        participants: [
          { id: 1, name: '반려인', role: 'pet-owner' },
          { id: 3, name: '시스템', role: 'admin' }
        ],
        lastMessage: {
          content: '새로운 강좌가 업데이트되었습니다.',
          timestamp: new Date(Date.now() - 1000 * 60 * 30),
          senderId: 3
        },
        unreadCount: 0
      }
    ];

    res.json(successResponse(conversations));
  }));

  // 특정 대화의 메시지 목록 조회
  app.get('/api/messages/conversations/:conversationId', asyncHandler(async (req: any, res: any) => {
    if (!req.user) {
      throw ApiError.unauthorized();
    }

    const { conversationId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    // 개발환경에서는 더미 메시지 반환
    const messages = [
      {
        id: 'msg_1',
        conversationId,
        sender: { id: 1, name: '반려인', role: 'pet-owner' },
        content: '안녕하세요! 강아지 훈련 상담 받고 싶습니다.',
        timestamp: new Date(Date.now() - 1000 * 60 * 10),
        isRead: true,
        type: 'text'
      },
      {
        id: 'msg_2',
        conversationId,
        sender: { id: 2, name: '김민수 훈련사', role: 'trainer' },
        content: '안녕하세요! 어떤 훈련을 원하시나요?',
        timestamp: new Date(Date.now() - 1000 * 60 * 5),
        isRead: false,
        type: 'text'
      }
    ];

    res.json(successResponse({
      messages,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: messages.length
      }
    }));
  }));

  // 메시지 전송
  app.post('/api/messages', asyncHandler(async (req: any, res: any) => {
    if (!req.user) {
      throw ApiError.unauthorized();
    }

    const { receiverId, content, type = 'text', metadata } = req.body;

    if (!receiverId || !content) {
      throw ApiError.badRequest('수신자 ID와 메시지 내용은 필수입니다');
    }

    // 메시징 서비스를 통해 실시간 메시지 전송
    if (messagingService) {
      messagingService.sendDirectMessage(req.user.id, receiverId, content, type, metadata);
    }

    // 성공 응답
    const message = {
      id: `msg_${Date.now()}`,
      sender: { id: req.user.id, name: req.user.name, role: req.user.role },
      receiver: { id: receiverId, name: 'Unknown' },
      content,
      timestamp: new Date(),
      isRead: false,
      type
    };

    res.json(successResponse(message));
  }));

  // 메시지 읽음 처리
  app.patch('/api/messages/:messageId/read', asyncHandler(async (req: any, res: any) => {
    if (!req.user) {
      throw ApiError.unauthorized();
    }

    const { messageId } = req.params;

    // 메시징 서비스를 통해 읽음 처리
    if (messagingService) {
      messagingService.markMessageAsRead(req.user.id, messageId);
    }

    res.json(successResponse({ messageId, isRead: true }));
  }));

  // 대화 읽음 처리 (모든 메시지)
  app.patch('/api/messages/conversations/:conversationId/read', asyncHandler(async (req: any, res: any) => {
    if (!req.user) {
      throw ApiError.unauthorized();
    }

    const { conversationId } = req.params;

    // 메시징 서비스를 통해 대화 읽음 처리
    if (messagingService) {
      messagingService.markConversationAsRead(req.user.id, conversationId);
    }

    res.json(successResponse({ conversationId, allRead: true }));
  }));

  // 온라인 사용자 목록 조회
  app.get('/api/messages/online-users', asyncHandler(async (req: any, res: any) => {
    if (!req.user) {
      throw ApiError.unauthorized();
    }

    const onlineUsers = messagingService ? messagingService.getOnlineUsers() : [];

    res.json(successResponse(onlineUsers));
  }));

  // 새 대화 시작
  app.post('/api/messages/conversations', asyncHandler(async (req: any, res: any) => {
    if (!req.user) {
      throw ApiError.unauthorized();
    }

    const { participantId, initialMessage } = req.body;

    if (!participantId) {
      throw ApiError.badRequest('대화 상대방 ID는 필수입니다');
    }

    const conversationId = `conv_${Math.min(req.user.id, participantId)}_${Math.max(req.user.id, participantId)}`;

    // 초기 메시지가 있다면 전송
    if (initialMessage && messagingService) {
      messagingService.sendDirectMessage(req.user.id, participantId, initialMessage, 'text');
    }

    const conversation = {
      id: conversationId,
      participants: [
        { id: req.user.id, name: req.user.name, role: req.user.role },
        { id: participantId, name: 'Unknown', role: 'unknown' }
      ],
      lastMessage: initialMessage ? {
        content: initialMessage,
        timestamp: new Date(),
        senderId: req.user.id
      } : null,
      unreadCount: 0
    };

    res.json(successResponse(conversation));
  }));

  // 시스템 메시지 전송 (관리자만)
  app.post('/api/messages/system', asyncHandler(async (req: any, res: any) => {
    if (!req.user || req.user.role !== 'admin') {
      throw ApiError.forbidden('시스템 메시지는 관리자만 전송할 수 있습니다');
    }

    const { userIds, content, type = 'notification' } = req.body;

    if (!userIds || !content) {
      throw ApiError.badRequest('수신자 목록과 메시지 내용은 필수입니다');
    }

    // 메시징 서비스를 통해 시스템 메시지 전송
    if (messagingService) {
      userIds.forEach((userId: number) => {
        messagingService.sendSystemNotification(userId, content, { type });
      });
    }

    res.json(successResponse({ 
      message: '시스템 메시지가 전송되었습니다',
      recipients: userIds.length 
    }));
  }));

  console.log('[MessagingRoutes] Messaging routes registered');
}

// 메시징 서비스 인스턴스 접근자
export const getMessagingService = () => messagingService;