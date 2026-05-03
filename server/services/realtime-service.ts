import { WebSocket, WebSocketServer } from 'ws';
import { Server } from 'http';
import { v4 as uuidv4 } from 'uuid';
import { ChatMessage, Notification } from '../../shared/realtime-schema';
import { logServerError } from '../middleware/audit-logger';

interface Client {
  id: string;
  userId: string;
  role: string;
  ws: WebSocket;
  lastPing: number;
}

export class RealtimeService {
  private wss: WebSocketServer;
  private clients: Map<string, Client> = new Map();
  private rooms: Map<string, Set<string>> = new Map();

  constructor(server: Server) {
    this.wss = new WebSocketServer({ 
      server, 
      path: '/ws',
      perMessageDeflate: false
    });
    
    this.wss.on('connection', this.handleConnection.bind(this));
    this.startHeartbeat();
  }

  private handleConnection(ws: WebSocket, request: any) {
    const clientId = uuidv4();
    console.log(`[WebSocket] 새 연결: ${clientId}`);

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        this.handleMessage(clientId, message);
      } catch (error) {
        logServerError('[WebSocket] 메시지 파싱 오류:', error);
        this.sendError(ws, '잘못된 메시지 형식입니다.');
      }
    });

    ws.on('close', () => {
      this.handleDisconnection(clientId);
    });

    ws.on('error', (error) => {
      logServerError(`[WebSocket] 연결 오류 ${clientId}:`, error);
      this.handleDisconnection(clientId);
    });

    // 초기 연결 응답
    this.sendMessage(ws, {
      type: 'connection',
      data: { clientId, status: 'connected' }
    });
  }

  private handleMessage(clientId: string, message: any) {
    const client = this.clients.get(clientId);

    switch (message.type) {
      case 'auth':
        this.handleAuth(clientId, message.data);
        break;
      case 'join_room':
        this.handleJoinRoom(clientId, message.data.roomId);
        break;
      case 'leave_room':
        this.handleLeaveRoom(clientId, message.data.roomId);
        break;
      case 'chat_message':
        this.handleChatMessage(clientId, message.data);
        break;
      case 'ping':
        this.handlePing(clientId);
        break;
      default:
        console.warn(`[WebSocket] 알 수 없는 메시지 타입: ${message.type}`);
    }
  }

  private handleAuth(clientId: string, data: { userId: string; role: string; token: string }) {
    // 토큰 검증 로직 (실제 구현에서는 JWT 검증)
    if (!data.token || !data.userId) {
      const client = this.clients.get(clientId);
      if (client) {
        this.sendError(client.ws, '인증 정보가 유효하지 않습니다.');
        return;
      }
    }

    const client: Client = {
      id: clientId,
      userId: data.userId,
      role: data.role,
      ws: this.getClientSocket(clientId)!,
      lastPing: Date.now()
    };

    this.clients.set(clientId, client);
    console.log(`[WebSocket] 사용자 인증 완료: ${data.userId} (${data.role})`);

    this.sendMessage(client.ws, {
      type: 'auth_success',
      data: { userId: data.userId, role: data.role }
    });
  }

  private handleJoinRoom(clientId: string, roomId: string) {
    const client = this.clients.get(clientId);
    if (!client) return;

    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, new Set());
    }
    
    this.rooms.get(roomId)!.add(clientId);
    console.log(`[WebSocket] ${client.userId}가 방 ${roomId}에 참여`);

    this.sendMessage(client.ws, {
      type: 'room_joined',
      data: { roomId }
    });

    // 방의 다른 사용자들에게 알림
    this.broadcastToRoom(roomId, {
      type: 'user_joined',
      data: { userId: client.userId, roomId }
    }, clientId);
  }

  private handleLeaveRoom(clientId: string, roomId: string) {
    const client = this.clients.get(clientId);
    if (!client) return;

    const room = this.rooms.get(roomId);
    if (room) {
      room.delete(clientId);
      if (room.size === 0) {
        this.rooms.delete(roomId);
      }
    }

    console.log(`[WebSocket] ${client.userId}가 방 ${roomId}에서 나감`);

    // 방의 다른 사용자들에게 알림
    this.broadcastToRoom(roomId, {
      type: 'user_left',
      data: { userId: client.userId, roomId }
    });
  }

  private handleChatMessage(clientId: string, data: ChatMessage) {
    const client = this.clients.get(clientId);
    if (!client) return;

    // 메시지 검증
    if (!data.message || data.message.trim().length === 0) {
      this.sendError(client.ws, '메시지가 비어있습니다.');
      return;
    }

    // 수신자에게 메시지 전송
    const receiverClient = this.findClientByUserId(data.receiverId);
    if (receiverClient) {
      this.sendMessage(receiverClient.ws, {
        type: 'new_message',
        data: {
          ...data,
          timestamp: new Date().toISOString()
        }
      });
    }

    // 발신자에게 전송 확인
    this.sendMessage(client.ws, {
      type: 'message_sent',
      data: { messageId: data.id, timestamp: new Date().toISOString() }
    });
  }

  private handlePing(clientId: string) {
    const client = this.clients.get(clientId);
    if (client) {
      client.lastPing = Date.now();
      this.sendMessage(client.ws, { type: 'pong', data: {} });
    }
  }

  private handleDisconnection(clientId: string) {
    const client = this.clients.get(clientId);
    if (client) {
      console.log(`[WebSocket] 연결 해제: ${client.userId}`);
      
      // 모든 방에서 제거
      for (const [roomId, room] of this.rooms.entries()) {
        if (room.has(clientId)) {
          room.delete(clientId);
          this.broadcastToRoom(roomId, {
            type: 'user_left',
            data: { userId: client.userId, roomId }
          });
          
          if (room.size === 0) {
            this.rooms.delete(roomId);
          }
        }
      }
      
      this.clients.delete(clientId);
    }
  }

  // 특정 사용자에게 알림 전송
  public sendNotification(userId: string, notification: Notification) {
    const client = this.findClientByUserId(userId);
    if (client) {
      this.sendMessage(client.ws, {
        type: 'notification',
        data: notification
      });
    }
  }

  // 특정 방의 모든 사용자에게 브로드캐스트
  private broadcastToRoom(roomId: string, message: any, excludeClientId?: string) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    for (const clientId of room) {
      if (excludeClientId && clientId === excludeClientId) continue;
      
      const client = this.clients.get(clientId);
      if (client && client.ws.readyState === WebSocket.OPEN) {
        this.sendMessage(client.ws, message);
      }
    }
  }

  // 특정 역할의 모든 사용자에게 브로드캐스트
  public broadcastToRole(role: string, message: any) {
    for (const client of this.clients.values()) {
      if (client.role === role && client.ws.readyState === WebSocket.OPEN) {
        this.sendMessage(client.ws, message);
      }
    }
  }

  // 유틸리티 메서드들
  private getClientSocket(clientId: string): WebSocket | undefined {
    return Array.from(this.wss.clients).find((ws: any) => ws.clientId === clientId);
  }

  private findClientByUserId(userId: string): Client | undefined {
    for (const client of this.clients.values()) {
      if (client.userId === userId) {
        return client;
      }
    }
    return undefined;
  }

  private sendMessage(ws: WebSocket, message: any) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  private sendError(ws: WebSocket, error: string) {
    this.sendMessage(ws, {
      type: 'error',
      data: { message: error }
    });
  }

  // 하트비트로 비활성 연결 정리
  private startHeartbeat() {
    setInterval(() => {
      const now = Date.now();
      const timeout = 60000; // 60초

      for (const [clientId, client] of this.clients.entries()) {
        if (now - client.lastPing > timeout) {
          console.log(`[WebSocket] 비활성 연결 정리: ${client.userId}`);
          client.ws.terminate();
          this.handleDisconnection(clientId);
        }
      }
    }, 30000); // 30초마다 체크
  }

  // 연결된 클라이언트 수 조회
  public getConnectedClientsCount(): number {
    return this.clients.size;
  }

  // 특정 사용자의 온라인 상태 확인
  public isUserOnline(userId: string): boolean {
    return this.findClientByUserId(userId) !== undefined;
  }
}