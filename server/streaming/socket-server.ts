import { Server as SocketServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import { db } from '../db';
import { 
  liveStreams, 
  streamViewers, 
  streamChatMessages,
  users 
} from '../../shared/schema';
import { eq, and, sql } from 'drizzle-orm';
import { logServerError } from '../middleware/audit-logger';

interface PeerInfo {
  peerId: string;
  streamId: number;
  userId?: number;
  userName?: string;
  role: 'host' | 'viewer';
  connectionQuality: 'good' | 'fair' | 'poor';
}

interface SignalData {
  type: 'offer' | 'answer' | 'candidate';
  sdp?: string;
  candidate?: RTCIceCandidateInit;
  from: string;
  to: string;
  streamId: number;
}

const connectedPeers = new Map<string, PeerInfo>();
const streamRooms = new Map<number, Set<string>>();

export function setupStreamingSocket(httpServer: HttpServer): SocketServer {
  const io = new SocketServer(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    },
    path: '/streaming-socket'
  });

  const streamingNamespace = io.of('/streaming');

  streamingNamespace.on('connection', (socket) => {
    console.log(`[Streaming] Client connected: ${socket.id}`);

    socket.on('join-stream', async (data: { 
      streamId: number; 
      userId?: number; 
      role: 'host' | 'viewer';
      sessionId: string;
    }) => {
      try {
        const { streamId, userId, role, sessionId } = data;
        
        const [stream] = await db.select()
          .from(liveStreams)
          .where(eq(liveStreams.id, streamId))
          .limit(1);
        
        if (!stream || (stream.status !== 'live' && role === 'viewer')) {
          socket.emit('error', { message: '스트림을 찾을 수 없거나 라이브 중이 아닙니다.' });
          return;
        }

        socket.join(`stream-${streamId}`);
        
        let userName: string | undefined;
        if (userId) {
          const [user] = await db.select({ name: users.name, username: users.username })
            .from(users)
            .where(eq(users.id, userId))
            .limit(1);
          userName = user?.name || user?.username || undefined;
        }

        const peerInfo: PeerInfo = {
          peerId: socket.id,
          streamId,
          userId,
          userName,
          role,
          connectionQuality: 'good'
        };
        
        connectedPeers.set(socket.id, peerInfo);
        
        if (!streamRooms.has(streamId)) {
          streamRooms.set(streamId, new Set());
        }
        streamRooms.get(streamId)!.add(socket.id);

        await db.insert(streamViewers).values({
          streamId,
          userId: userId || null,
          sessionId,
          isActive: true
        });

        await db.update(liveStreams)
          .set({ 
            currentViewers: sql`current_viewers + 1`,
            peakViewers: sql`GREATEST(peak_viewers, current_viewers + 1)`
          })
          .where(eq(liveStreams.id, streamId));

        socket.to(`stream-${streamId}`).emit('peer-joined', {
          peerId: socket.id,
          userId,
          userName,
          role
        });

        const roomPeers = Array.from(streamRooms.get(streamId) || [])
          .filter(id => id !== socket.id)
          .map(id => connectedPeers.get(id))
          .filter(Boolean);

        socket.emit('stream-joined', { 
          streamId, 
          peers: roomPeers,
          isHost: role === 'host'
        });

        console.log(`[Streaming] ${role} ${socket.id} joined stream ${streamId}`);
      } catch (error) {
        logServerError('[Streaming] Error joining stream:', error);
        socket.emit('error', { message: '스트림 참가 중 오류가 발생했습니다.' });
      }
    });

    socket.on('signal', (data: SignalData) => {
      const peer = connectedPeers.get(socket.id);
      if (!peer) {
        socket.emit('error', { message: '피어를 찾을 수 없습니다.' });
        return;
      }

      streamingNamespace.to(data.to).emit('signal', {
        ...data,
        from: socket.id
      });
    });

    socket.on('chat-message', async (data: { 
      streamId: number; 
      userId: number; 
      message: string 
    }) => {
      try {
        const { streamId, userId, message } = data;

        const [user] = await db.select({
          name: users.name,
          username: users.username,
          avatar: users.avatar
        })
          .from(users)
          .where(eq(users.id, userId))
          .limit(1);

        const [chatMessage] = await db.insert(streamChatMessages)
          .values({
            streamId,
            userId,
            message: message.substring(0, 500)
          })
          .returning();

        streamingNamespace.to(`stream-${streamId}`).emit('new-chat-message', {
          id: chatMessage.id,
          streamId,
          userId,
          message: chatMessage.message,
          userName: user?.name || user?.username || '익명',
          userAvatar: user?.avatar,
          createdAt: chatMessage.createdAt
        });
      } catch (error) {
        logServerError('[Streaming] Error sending chat message:', error);
      }
    });

    socket.on('update-quality', (quality: 'good' | 'fair' | 'poor') => {
      const peer = connectedPeers.get(socket.id);
      if (peer) {
        peer.connectionQuality = quality;
      }
    });

    socket.on('leave-stream', async (data: { streamId: number; sessionId: string }) => {
      await handleLeaveStream(socket.id, data.streamId, data.sessionId);
    });

    socket.on('disconnect', async () => {
      const peer = connectedPeers.get(socket.id);
      if (peer) {
        await handleLeaveStream(socket.id, peer.streamId, socket.id);
      }
      console.log(`[Streaming] Client disconnected: ${socket.id}`);
    });

    socket.on('end-stream', async (data: { streamId: number }) => {
      const peer = connectedPeers.get(socket.id);
      if (!peer || peer.role !== 'host') {
        socket.emit('error', { message: '권한이 없습니다.' });
        return;
      }

      try {
        await db.update(liveStreams)
          .set({ 
            status: 'ended',
            endTime: new Date(),
            currentViewers: 0
          })
          .where(eq(liveStreams.id, data.streamId));

        streamingNamespace.to(`stream-${data.streamId}`).emit('stream-ended', {
          streamId: data.streamId,
          reason: 'Host ended the stream'
        });

        const room = streamRooms.get(data.streamId);
        if (room) {
          room.forEach(peerId => {
            connectedPeers.delete(peerId);
          });
          streamRooms.delete(data.streamId);
        }

        console.log(`[Streaming] Stream ${data.streamId} ended by host`);
      } catch (error) {
        logServerError('[Streaming] Error ending stream:', error);
        socket.emit('error', { message: '스트림 종료 중 오류가 발생했습니다.' });
      }
    });
  });

  async function handleLeaveStream(socketId: string, streamId: number, sessionId: string) {
    try {
      const peer = connectedPeers.get(socketId);
      if (!peer) return;

      await db.update(streamViewers)
        .set({ 
          isActive: false,
          leftAt: new Date()
        })
        .where(
          and(
            eq(streamViewers.streamId, streamId),
            eq(streamViewers.sessionId, sessionId)
          )
        );

      await db.update(liveStreams)
        .set({ currentViewers: sql`GREATEST(current_viewers - 1, 0)` })
        .where(eq(liveStreams.id, streamId));

      streamingNamespace.to(`stream-${streamId}`).emit('peer-left', {
        peerId: socketId,
        userId: peer.userId
      });

      const room = streamRooms.get(streamId);
      if (room) {
        room.delete(socketId);
        if (room.size === 0) {
          streamRooms.delete(streamId);
        }
      }

      connectedPeers.delete(socketId);
    } catch (error) {
      logServerError('[Streaming] Error leaving stream:', error);
    }
  }

  console.log('[Streaming] Socket.IO server initialized');
  return io;
}

export { connectedPeers, streamRooms };
