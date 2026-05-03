import type { Express } from "express";
import type { Server } from "http";
import { WebSocketServer, WebSocket } from 'ws';
import { storage } from '../storage';
import { asyncHandler, AppError } from '../middleware/error-handler';
import { notificationService } from '../notifications/notification-service';
import { logServerError } from '../middleware/audit-logger';

// WebSocket 클라이언트 관리
interface AuthenticatedWebSocket extends WebSocket {
  userId?: number;
  isAlive?: boolean;
}

const connectedClients = new Map<number, AuthenticatedWebSocket>();

export function registerMessagingRoutes(app: Express, server: Server) {
  console.log('[MessagingRoutes] Registering messaging routes');

  // WebSocket 서버 설정
  const wss = new WebSocketServer({ 
    server,
    path: '/ws',
    perMessageDeflate: false
  });

  // WebSocket 연결 처리
  wss.on('connection', (ws: AuthenticatedWebSocket, request) => {
    console.log('[WS] New WebSocket connection established');
    
    ws.isAlive = true;
    ws.on('pong', () => {
      ws.isAlive = true;
    });

    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        console.log('[WS] Received message:', message.type);
        
        switch (message.type) {
          case 'authenticate':
            if (message.userId) {
              ws.userId = message.userId;
              connectedClients.set(message.userId, ws);
              ws.send(JSON.stringify({
                type: 'authentication_success',
                user: { id: message.userId }
              }));
              console.log(`[WS] User ${message.userId} authenticated`);
            }
            break;

          case 'message':
            if (ws.userId && message.receiverId && message.content) {
              try {
                const newMessage = await storage.createMessage(
                  ws.userId,
                  message.receiverId,
                  message.content,
                  message.messageType || 'text'
                );

                // 발신자에게 확인 전송
                ws.send(JSON.stringify({
                  type: 'message_sent',
                  message: newMessage
                }));

                // 수신자가 연결되어 있으면 실시간 전송
                const receiverWs = connectedClients.get(message.receiverId);
                if (receiverWs && receiverWs.readyState === WebSocket.OPEN) {
                  receiverWs.send(JSON.stringify({
                    type: 'new_message',
                    message: newMessage
                  }));
                }
              } catch (error) {
                logServerError('[WS] Message creation error:', error);
                ws.send(JSON.stringify({
                  type: 'error',
                  message: '메시지 전송에 실패했습니다.'
                }));
              }
            }
            break;

          case 'read_receipt':
            if (ws.userId && message.messageId) {
              await storage.markMessageAsRead(message.messageId, ws.userId);
              
              // 발신자에게 읽음 확인 전송
              if (message.senderId) {
                const senderWs = connectedClients.get(message.senderId);
                if (senderWs && senderWs.readyState === WebSocket.OPEN) {
                  senderWs.send(JSON.stringify({
                    type: 'read_receipt',
                    messageId: message.messageId
                  }));
                }
              }
            }
            break;

          case 'typing_indicator':
            if (ws.userId && message.receiverId) {
              const receiverWs = connectedClients.get(message.receiverId);
              if (receiverWs && receiverWs.readyState === WebSocket.OPEN) {
                receiverWs.send(JSON.stringify({
                  type: 'typing_indicator',
                  userId: ws.userId,
                  userName: message.userName || '사용자'
                }));
              }
            }
            break;

          default:
            console.log('[WS] Unknown message type:', message.type);
        }
      } catch (error) {
        logServerError('[WS] Message parsing error:', error);
      }
    });

    ws.on('close', () => {
      if (ws.userId) {
        connectedClients.delete(ws.userId);
        console.log(`[WS] User ${ws.userId} disconnected`);
      }
    });

    ws.on('error', (error) => {
      logServerError('[WS] WebSocket error:', error);
    });
  });

  // Ping clients regularly to check connection
  setInterval(() => {
    wss.clients.forEach((ws: AuthenticatedWebSocket) => {
      if (ws.isAlive === false) {
        if (ws.userId) {
          connectedClients.delete(ws.userId);
        }
        return ws.terminate();
      }

      ws.isAlive = false;
      ws.ping(() => {});
    });
  }, 30000);

  // ==================== REST API Routes ====================

  // 현재 사용자 ID 가져오기 헬퍼 함수
  const getCurrentUserId = (req: any): number | null => {
    // 세션에서 사용자 정보 확인
    if (req.session?.user?.id) {
      return req.session.user.id;
    }
    if (req.user?.id) {
      return req.user.id;
    }
    // 쿼리 파라미터에서 userId 확인 (개발용)
    if (req.query?.userId) {
      return parseInt(req.query.userId);
    }
    // 바디에서 userId 확인 (개발용)
    if (req.body?.userId) {
      return parseInt(req.body.userId);
    }
    return null;
  };

  // 대화 목록 조회
  app.get('/api/messages/conversations', asyncHandler(async (req: any, res: any) => {
    const userId = getCurrentUserId(req);
    
    if (!userId) {
      throw new AppError('인증이 필요합니다.', 401);
    }

    const conversations = await storage.getConversationsForUser(userId);

    return res.status(200).json({ 
      success: true, 
      data: conversations, 
      message: '대화 목록을 성공적으로 조회했습니다.' 
    });
  }));

  // 특정 대화의 메시지 목록 조회
  app.get('/api/messages/conversations/:conversationId', asyncHandler(async (req: any, res: any) => {
    const userId = getCurrentUserId(req);
    
    if (!userId) {
      throw new AppError('인증이 필요합니다.', 401);
    }

    const { conversationId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const result = await storage.getMessagesForConversation(
      parseInt(conversationId),
      parseInt(page as string),
      parseInt(limit as string)
    );

    // 해당 대화의 모든 메시지를 읽음 처리
    await storage.markAllMessagesAsRead(parseInt(conversationId), userId);

    return res.status(200).json({ 
      success: true, 
      data: result, 
      message: '메시지 목록을 성공적으로 조회했습니다.' 
    });
  }));

  // 메시지 전송
  app.post('/api/messages/send', asyncHandler(async (req: any, res: any) => {
    const userId = getCurrentUserId(req);
    
    if (!userId) {
      throw new AppError('인증이 필요합니다.', 401);
    }

    const { receiverId, content, messageType = 'text' } = req.body;
    
    if (!content || content.trim().length === 0) {
      throw new AppError('메시지 내용이 필요합니다.', 400);
    }

    if (!receiverId) {
      throw new AppError('수신자 ID가 필요합니다.', 400);
    }

    const message = await storage.createMessage(
      userId,
      parseInt(receiverId),
      content.trim(),
      messageType
    );

    // WebSocket을 통해 실시간 전송
    const receiverWs = connectedClients.get(parseInt(receiverId));
    if (receiverWs && receiverWs.readyState === WebSocket.OPEN) {
      receiverWs.send(JSON.stringify({
        type: 'new_message',
        message
      }));
    }

    // 수신자에게 푸시 알림 발송 (오프라인 또는 백그라운드 사용자용)
    try {
      const sender = await storage.getUserById(userId);
      const senderName = sender?.name || sender?.username || '알 수 없는 사용자';
      
      await notificationService.sendNotification({
        userId: parseInt(receiverId),
        type: 'message',
        title: '새 메시지',
        message: `${senderName}님이 메시지를 보냈습니다: ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`,
        actionUrl: '/messages',
        data: { senderId: userId, senderName }
      });
    } catch (notifyError) {
      logServerError('[메시지] 알림 발송 실패:', notifyError, req);
    }

    return res.status(201).json({ 
      success: true, 
      data: message, 
      message: '메시지가 성공적으로 전송되었습니다.' 
    });
  }));

  // 메시지 읽음 처리
  app.put('/api/messages/:messageId/read', asyncHandler(async (req: any, res: any) => {
    const userId = getCurrentUserId(req);
    
    if (!userId) {
      throw new AppError('인증이 필요합니다.', 401);
    }

    const { messageId } = req.params;

    await storage.markMessageAsRead(parseInt(messageId), userId);

    return res.status(200).json({ 
      success: true, 
      message: '메시지를 읽음으로 처리했습니다.' 
    });
  }));

  // 대화 시작/생성
  app.post('/api/messages/conversations', asyncHandler(async (req: any, res: any) => {
    const userId = getCurrentUserId(req);
    
    if (!userId) {
      throw new AppError('인증이 필요합니다.', 401);
    }

    const { participantId } = req.body;
    
    if (!participantId) {
      throw new AppError('대화 상대방 ID가 필요합니다.', 400);
    }

    const conversation = await storage.getOrCreateConversation(userId, parseInt(participantId));

    // 대화 상대 정보 조회
    const conversations = await storage.getConversationsForUser(userId);
    const conversationWithDetails = conversations.find(c => c.id === conversation.id);

    return res.status(201).json({ 
      success: true, 
      data: conversationWithDetails || conversation, 
      message: '대화방이 성공적으로 생성되었습니다.' 
    });
  }));

  // 읽지 않은 메시지 개수 조회
  app.get('/api/messages/unread-count', asyncHandler(async (req: any, res: any) => {
    const userId = getCurrentUserId(req);
    
    if (!userId) {
      throw new AppError('인증이 필요합니다.', 401);
    }

    const count = await storage.getUnreadMessageCount(userId);

    return res.status(200).json({ 
      success: true, 
      data: { count }, 
      message: '읽지 않은 메시지 개수를 조회했습니다.' 
    });
  }));

  // 사용자 목록 조회 (대화 상대 검색용)
  app.get('/api/messages/users', asyncHandler(async (req: any, res: any) => {
    const userId = getCurrentUserId(req);
    
    if (!userId) {
      throw new AppError('인증이 필요합니다.', 401);
    }

    const { search = '', role = '' } = req.query;
    
    let users = storage.getUsers();
    
    // 현재 사용자 제외
    users = users.filter((u: any) => u.id !== userId);

    // 검색어 필터
    if (search) {
      const searchLower = (search as string).toLowerCase();
      users = users.filter((u: any) => 
        u.name?.toLowerCase().includes(searchLower) ||
        u.email?.toLowerCase().includes(searchLower)
      );
    }

    // 역할 필터
    if (role) {
      users = users.filter((u: any) => u.role === role);
    }

    // 민감한 정보 제거
    const safeUsers = users.map((u: any) => ({
      id: u.id,
      name: u.name,
      role: u.role,
      avatar: u.avatar
    }));

    return res.status(200).json({ 
      success: true, 
      data: safeUsers.slice(0, 20), 
      message: '사용자 목록을 조회했습니다.' 
    });
  }));

  console.log('[MessagingRoutes] Messaging routes registered');
  console.log('  - GET /api/messages/conversations (대화 목록)');
  console.log('  - GET /api/messages/conversations/:id (대화 메시지)');
  console.log('  - POST /api/messages/send (메시지 전송)');
  console.log('  - PUT /api/messages/:id/read (읽음 처리)');
  console.log('  - POST /api/messages/conversations (대화 생성)');
  console.log('  - GET /api/messages/unread-count (읽지 않은 개수)');
  console.log('  - GET /api/messages/users (사용자 목록)');
}
