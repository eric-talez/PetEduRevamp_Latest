import { WebSocket, WebSocketServer } from 'ws';
import { IStorage } from '../storage';
import { UserRole } from '@shared/schema';
import { logger } from '../monitoring/logger';
import { logServerError } from '../middleware/audit-logger';

// 메시지 타입 정의
export interface Message {
  id: string;
  sender: {
    id: number;
    name: string;
    role: UserRole;
    avatar?: string | null;
  };
  receiver: {
    id: number;
    name: string;
    role?: UserRole;
    avatar?: string | null;
  };
  content: string;
  timestamp: Date;
  isRead: boolean;
  type: 'text' | 'image' | 'notification';
  metadata?: any;
}

// 클라이언트 연결 정보
interface Client {
  userId: number;
  userName: string;
  role: UserRole;
  connection: WebSocket;
}

// 메시지 서비스 클래스
export class MessagingService {
  private wss: WebSocketServer;
  private storage: IStorage;
  private clients: Map<number, Client>;
  private messageHistory: Map<string, Message[]>; // 대화방 ID별 메시지 기록

  constructor(wss: WebSocketServer, storage: IStorage) {
    this.wss = wss;
    this.storage = storage;
    this.clients = new Map();
    this.messageHistory = new Map();

    this.setupWebSocketServer();
  }

  // WebSocket 서버 설정
  private setupWebSocketServer(): void {
    this.wss.on('connection', (ws: WebSocket, req) => {
      console.log('New WebSocket connection established');
      
      let clientId: number | null = null;

      // 연결 시 인증 정보를 기대함
      ws.on('message', (message: string) => {
        try {
          const data = JSON.parse(message);
          
          // 최초 인증 메시지 처리
          if (data.type === 'authenticate' && !clientId) {
            this.handleAuthentication(ws, data);
            clientId = data.userId;
          } 
          // 인증 완료 후 메시지 처리
          else if (clientId) {
            this.handleMessage(clientId, data);
          } 
          // 인증되지 않은 메시지는 무시
          else {
            ws.send(JSON.stringify({
              type: 'error',
              message: 'Authentication required'
            }));
          }
        } catch (error) {
          logServerError('Error processing message:', error, req);
          ws.send(JSON.stringify({
            type: 'error',
            message: 'Invalid message format'
          }));
        }
      });

      // 연결 종료 처리
      ws.on('close', () => {
        if (clientId) {
          this.clients.delete(clientId);
          console.log(`Client ${clientId} disconnected`);
          
          // 상태 변경 알림
          this.broadcastUserStatus(clientId, 'offline');
        }
      });
    });
  }

  // 클라이언트 인증 처리
  private async handleAuthentication(ws: WebSocket, data: any): Promise<void> {
    try {
      const { userId, token, reconnect } = data;
      
      // 실제 구현에서는 토큰 검증 필요
      // 지금은 유저 ID로 사용자 정보 조회로 대체
      const user = await this.storage.getUser(userId);
      
      if (!user) {
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Authentication failed'
        }));
        return;
      }
      
      // 기존 연결이 있는 경우 처리
      const existingClient = this.clients.get(userId);
      if (existingClient) {
        // 이전 연결 종료 처리
        try {
          console.log(`Closing previous connection for user ${userId}`);
          existingClient.connection.close();
        } catch (e) {
          logServerError(`Error closing previous connection for user ${userId}:`, e);
        }
      }
      
      // 클라이언트 정보 저장
      this.clients.set(userId, {
        userId,
        userName: user.name,
        role: user.role,
        connection: ws
      });
      
      // 인증 성공 응답
      ws.send(JSON.stringify({
        type: 'authentication_success',
        user: {
          id: user.id,
          name: user.name,
          role: user.role
        },
        reconnected: !!reconnect
      }));
      
      // 접속 상태 브로드캐스트
      this.broadcastUserStatus(userId, 'online');
      
      // 재연결일 경우 대화 기록 전송
      if (reconnect) {
        console.log(`User ${userId} reconnected, sending conversation history`);
        this.sendConversationHistory(userId);
      }
      
      // 읽지 않은 메시지 전송
      this.sendUnreadMessages(userId);
      
      console.log(`Client ${userId} (${user.name}) ${reconnect ? 're-' : ''}authenticated`);
    } catch (error) {
      logServerError('Authentication error:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Authentication failed'
      }));
    }
  }
  
  // 대화 기록 전송 (재연결 시 필요)
  private sendConversationHistory(userId: number): void {
    try {
      const client = this.clients.get(userId);
      if (!client) return;
      
      // 이 사용자가 포함된 모든 대화 찾기
      const userConversations: Record<string, Message[]> = {};
      
      this.messageHistory.forEach((messages, conversationId) => {
        // 이 대화에 이 사용자가 포함되는지 확인
        const [id1, id2] = this.parseConversationId(conversationId);
        if (id1 === userId || id2 === userId) {
          // 최근 50개 메시지만 전송 (성능 최적화)
          userConversations[conversationId] = messages.slice(-50);
        }
      });
      
      // 대화 기록이 있으면 전송
      if (Object.keys(userConversations).length > 0) {
        client.connection.send(JSON.stringify({
          type: 'conversation_history',
          conversations: userConversations
        }));
        
        console.log(`Sent conversation history to user ${userId} (${Object.keys(userConversations).length} conversations)`);
      }
    } catch (error) {
      logServerError('Error sending conversation history:', error);
    }
  }

  // 메시지 처리
  private async handleMessage(senderId: number, data: any): Promise<void> {
    if (data.type === 'message') {
      await this.processAndDeliverMessage(senderId, data);
    } else if (data.type === 'read_receipt') {
      await this.handleReadReceipt(senderId, data);
    } else if (data.type === 'typing') {
      this.handleTypingIndicator(senderId, data);
    }
  }

  // 메시지 처리 및 전달
  private async processAndDeliverMessage(senderId: number, data: any): Promise<void> {
    try {
      const sender = this.clients.get(senderId);
      if (!sender) {
        logger.error(`Sender ${senderId} not found`);
        return;
      }
      
      const { receiverId, content, type = 'text', metadata } = data;
      
      // 메시지 생성
      const message: Message = {
        id: this.generateMessageId(),
        sender: {
          id: senderId,
          name: sender.userName,
          role: sender.role,
          avatar: null // 실제 구현에서는 사용자 아바타 추가
        },
        receiver: {
          id: receiverId,
          name: '' // 수신자 이름은 아래에서 채움
        },
        content,
        timestamp: new Date(),
        isRead: false,
        type: type as 'text' | 'image' | 'notification',
        metadata
      };
      
      // 수신자 정보 채우기
      const receiverUser = await this.storage.getUser(receiverId);
      if (receiverUser) {
        message.receiver.name = receiverUser.name;
      }
      
      // 대화방 ID 생성 (항상 작은 ID가 앞으로 오도록)
      const conversationId = this.getConversationId(senderId, receiverId);
      
      // 메시지 기록 저장
      if (!this.messageHistory.has(conversationId)) {
        this.messageHistory.set(conversationId, []);
      }
      this.messageHistory.get(conversationId)?.push(message);
      
      // 메시지 전송 (수신자가 온라인 상태인 경우)
      const receiver = this.clients.get(receiverId);
      if (receiver) {
        receiver.connection.send(JSON.stringify({
          type: 'new_message',
          message
        }));
      }
      
      // 발신자에게도 전송 확인
      sender.connection.send(JSON.stringify({
        type: 'message_sent',
        message
      }));
      
      console.log(`Message from ${senderId} to ${receiverId} delivered`);
    } catch (error) {
      logServerError('Error processing message:', error);
    }
  }

  // 읽음 확인 처리
  private async handleReadReceipt(readerId: number, data: any): Promise<void> {
    try {
      const { messageId, senderId } = data;
      
      // 대화방 ID 생성
      const conversationId = this.getConversationId(readerId, senderId);
      
      // 메시지 기록 업데이트
      const conversation = this.messageHistory.get(conversationId);
      if (conversation) {
        const message = conversation.find(m => m.id === messageId);
        if (message) {
          message.isRead = true;
          
          // 발신자가 온라인이라면 읽음 확인 전송
          const sender = this.clients.get(senderId);
          if (sender) {
            sender.connection.send(JSON.stringify({
              type: 'read_receipt',
              messageId,
              readerId,
              timestamp: new Date()
            }));
          }
        }
      }
    } catch (error) {
      logServerError('Error processing read receipt:', error);
    }
  }

  // 타이핑 표시 처리
  private handleTypingIndicator(typerId: number, data: any): void {
    try {
      const { receiverId, isTyping } = data;
      
      // 수신자가 온라인이라면 타이핑 상태 전송
      const receiver = this.clients.get(receiverId);
      if (receiver) {
        receiver.connection.send(JSON.stringify({
          type: 'typing_indicator',
          userId: typerId,
          isTyping
        }));
      }
    } catch (error) {
      logServerError('Error processing typing indicator:', error);
    }
  }

  // 상태 변경 브로드캐스트
  private broadcastUserStatus(userId: number, status: 'online' | 'offline'): void {
    // 모든 연결된 사용자에게 상태 변경 알림
    this.clients.forEach((client) => {
      client.connection.send(JSON.stringify({
        type: 'user_status',
        userId,
        status
      }));
    });
  }

  // 미읽은 메시지 전송
  private async sendUnreadMessages(userId: number): Promise<void> {
    try {
      const client = this.clients.get(userId);
      if (!client) return;
      
      // 이 사용자가 포함된, 미읽은 메시지가 있는 모든 대화 찾기
      const unreadMessages: Message[] = [];
      
      this.messageHistory.forEach((messages, conversationId) => {
        // 이 대화에 이 사용자가 포함되는지 확인
        const [id1, id2] = this.parseConversationId(conversationId);
        if (id1 === userId || id2 === userId) {
          // 이 사용자가 받은 미읽은 메시지 찾기
          messages.forEach(message => {
            if (message.receiver.id === userId && !message.isRead) {
              unreadMessages.push(message);
            }
          });
        }
      });
      
      // 미읽은 메시지가 있으면 전송
      if (unreadMessages.length > 0) {
        client.connection.send(JSON.stringify({
          type: 'unread_messages',
          messages: unreadMessages
        }));
        
        console.log(`Sent ${unreadMessages.length} unread messages to user ${userId}`);
      }
    } catch (error) {
      logServerError('Error sending unread messages:', error);
    }
  }

  // 대화방 ID 생성 (작은 ID가 항상 앞쪽에 위치)
  private getConversationId(id1: number, id2: number): string {
    return id1 < id2 ? `${id1}-${id2}` : `${id2}-${id1}`;
  }
  
  // 대화방 ID 파싱
  private parseConversationId(conversationId: string): [number, number] {
    const [id1Str, id2Str] = conversationId.split('-');
    return [parseInt(id1Str), parseInt(id2Str)];
  }
  
  // 메시지 ID 생성
  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
  }
  
  // 공개 API: 시스템 알림 전송
  public sendSystemNotification(userId: number, content: string, metadata?: any): void {
    const client = this.clients.get(userId);
    if (client) {
      const message: Message = {
        id: this.generateMessageId(),
        sender: {
          id: 0, // 시스템 ID
          name: 'System',
          role: 'admin' as UserRole
        },
        receiver: {
          id: userId,
          name: client.userName
        },
        content,
        timestamp: new Date(),
        isRead: false,
        type: 'notification',
        metadata
      };
      
      client.connection.send(JSON.stringify({
        type: 'system_notification',
        message
      }));
    }
  }
  
  // 공개 API: 그룹 메시지 전송
  public sendGroupMessage(senderUserId: number, receiverUserIds: number[], content: string, type: 'text' | 'image' | 'notification' = 'text', metadata?: any): void {
    const sender = this.clients.get(senderUserId);
    if (!sender) return;
    
    receiverUserIds.forEach(receiverId => {
      const message: Message = {
        id: this.generateMessageId(),
        sender: {
          id: senderUserId,
          name: sender.userName,
          role: sender.role
        },
        receiver: {
          id: receiverId,
          name: this.clients.get(receiverId)?.userName || 'Unknown'
        },
        content,
        timestamp: new Date(),
        isRead: false,
        type,
        metadata
      };
      
      const receiver = this.clients.get(receiverId);
      if (receiver) {
        receiver.connection.send(JSON.stringify({
          type: 'new_message',
          message
        }));
      }
    });
  }

  // 직접 메시지 전송 API
  public sendDirectMessage(senderId: number, receiverId: number, content: string, type: 'text' | 'image' | 'notification' = 'text', metadata?: any): void {
    this.processAndDeliverMessage(senderId, {
      type: 'message',
      receiverId,
      content,
      messageType: type,
      metadata
    });
  }

  // 메시지 읽음 처리 API
  public markMessageAsRead(userId: number, messageId: string): void {
    // 모든 대화에서 해당 메시지 찾기
    this.messageHistory.forEach((messages, conversationId) => {
      const message = messages.find(m => m.id === messageId && m.receiver.id === userId);
      if (message) {
        message.isRead = true;
        
        // 발신자에게 읽음 확인 전송
        const sender = this.clients.get(message.sender.id);
        if (sender) {
          sender.connection.send(JSON.stringify({
            type: 'read_receipt',
            messageId,
            readerId: userId,
            timestamp: new Date()
          }));
        }
      }
    });
  }

  // 대화 읽음 처리 API
  public markConversationAsRead(userId: number, conversationId: string): void {
    const conversation = this.messageHistory.get(conversationId);
    if (conversation) {
      let readCount = 0;
      conversation.forEach(message => {
        if (message.receiver.id === userId && !message.isRead) {
          message.isRead = true;
          readCount++;
        }
      });

      if (readCount > 0) {
        // 발신자들에게 읽음 확인 전송
        const senderIds = new Set(conversation.map(m => m.sender.id));
        senderIds.forEach(senderId => {
          const sender = this.clients.get(senderId);
          if (sender) {
            sender.connection.send(JSON.stringify({
              type: 'conversation_read',
              conversationId,
              readerId: userId,
              readCount,
              timestamp: new Date()
            }));
          }
        });
      }
    }
  }

  // 온라인 사용자 목록 반환
  public getOnlineUsers(): Array<{id: number, name: string, role: string}> {
    const users: Array<{id: number, name: string, role: string}> = [];
    this.clients.forEach((client, userId) => {
      users.push({
        id: userId,
        name: client.userName,
        role: client.role
      });
    });
    return users;
  }

  // 연결된 클라이언트 수 반환
  public getConnectedClientsCount(): number {
    return this.clients.size;
  }
}