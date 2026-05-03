import { Router } from 'express';
import { db } from '../db';
import { liveStreams, streamViewers, streamChatMessages, users, insertLiveStreamSchema, insertStreamChatSchema, liveSessionAttendance, reservations, type LiveSessionAttendance } from '../../shared/schema';
import { eq, desc, and, isNull } from 'drizzle-orm';
import { csrfProtection } from '../middleware/csrf';
import { 
  ApiErrorCode,
  extendResponse
} from '../middleware/api-standards';
import crypto from 'crypto';
import { logServerError } from '../middleware/audit-logger';

const router = Router();
router.use(extendResponse);

function generateStreamKey(): string {
  return crypto.randomBytes(16).toString('hex');
}

function generateMeetingCode(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz';
  const segments = 3;
  const segmentLength = 3;
  
  const code = Array.from({ length: segments }, () => {
    return Array.from({ length: segmentLength }, () => 
      chars.charAt(Math.floor(Math.random() * chars.length))
    ).join('');
  }).join('-');
  
  return code;
}

router.get('/streams', async (req, res) => {
  try {
    const { status, category } = req.query;
    
    let query = db.select({
      id: liveStreams.id,
      hostId: liveStreams.hostId,
      title: liveStreams.title,
      description: liveStreams.description,
      category: liveStreams.category,
      meetingUrl: liveStreams.meetingUrl,
      meetingCode: liveStreams.meetingCode,
      thumbnailUrl: liveStreams.thumbnailUrl,
      status: liveStreams.status,
      isPublic: liveStreams.isPublic,
      currentViewers: liveStreams.currentViewers,
      scheduledStartTime: liveStreams.scheduledStartTime,
      createdAt: liveStreams.createdAt,
      hostName: users.name,
      hostAvatar: users.avatar,
    })
    .from(liveStreams)
    .leftJoin(users, eq(liveStreams.hostId, users.id))
    .where(eq(liveStreams.isPublic, true))
    .orderBy(desc(liveStreams.createdAt));
    
    const streams = await query;
    
    const filteredStreams = streams.filter(stream => {
      if (status && stream.status !== status) return false;
      if (category && stream.category !== category) return false;
      return true;
    });
    
    return res.success({ streams: filteredStreams });
  } catch (error) {
    logServerError('[Live Streaming] Error fetching streams:', error, req);
    return res.error(ApiErrorCode.INTERNAL_SERVER_ERROR, 'Failed to fetch streams');
  }
});

router.get('/streams/live', async (req, res) => {
  try {
    const liveStreamsList = await db.select({
      id: liveStreams.id,
      hostId: liveStreams.hostId,
      title: liveStreams.title,
      description: liveStreams.description,
      category: liveStreams.category,
      meetingUrl: liveStreams.meetingUrl,
      meetingCode: liveStreams.meetingCode,
      thumbnailUrl: liveStreams.thumbnailUrl,
      currentViewers: liveStreams.currentViewers,
      scheduledStartTime: liveStreams.scheduledStartTime,
      actualStartTime: liveStreams.actualStartTime,
      hostName: users.name,
      hostAvatar: users.avatar,
    })
    .from(liveStreams)
    .leftJoin(users, eq(liveStreams.hostId, users.id))
    .where(and(
      eq(liveStreams.status, 'live'),
      eq(liveStreams.isPublic, true)
    ))
    .orderBy(desc(liveStreams.currentViewers));
    
    return res.success({ streams: liveStreamsList });
  } catch (error) {
    logServerError('[Live Streaming] Error fetching live streams:', error, req);
    return res.error(ApiErrorCode.INTERNAL_SERVER_ERROR, 'Failed to fetch live streams');
  }
});

router.get('/streams/:id', async (req, res) => {
  try {
    const streamId = parseInt(req.params.id);
    
    if (isNaN(streamId)) {
      return res.error(ApiErrorCode.VALIDATION_ERROR, 'Invalid stream ID');
    }
    
    const [stream] = await db.select({
      id: liveStreams.id,
      hostId: liveStreams.hostId,
      title: liveStreams.title,
      description: liveStreams.description,
      category: liveStreams.category,
      streamKey: liveStreams.streamKey,
      meetingUrl: liveStreams.meetingUrl,
      meetingCode: liveStreams.meetingCode,
      thumbnailUrl: liveStreams.thumbnailUrl,
      status: liveStreams.status,
      isPublic: liveStreams.isPublic,
      maxViewers: liveStreams.maxViewers,
      currentViewers: liveStreams.currentViewers,
      peakViewers: liveStreams.peakViewers,
      totalViews: liveStreams.totalViews,
      scheduledStartTime: liveStreams.scheduledStartTime,
      actualStartTime: liveStreams.actualStartTime,
      endTime: liveStreams.endTime,
      duration: liveStreams.duration,
      chatEnabled: liveStreams.chatEnabled,
      createdAt: liveStreams.createdAt,
      hostName: users.name,
      hostAvatar: users.avatar,
    })
    .from(liveStreams)
    .leftJoin(users, eq(liveStreams.hostId, users.id))
    .where(eq(liveStreams.id, streamId));
    
    if (!stream) {
      return res.error(ApiErrorCode.RESOURCE_NOT_FOUND, 'Stream not found');
    }
    
    const userId = req.session?.user?.id;
    if (!stream.isPublic && stream.hostId !== userId) {
      return res.error(ApiErrorCode.INSUFFICIENT_PERMISSIONS, 'Access denied to private stream');
    }
    
    return res.success({ stream });
  } catch (error) {
    logServerError('[Live Streaming] Error fetching stream:', error, req);
    return res.error(ApiErrorCode.INTERNAL_SERVER_ERROR, 'Failed to fetch stream');
  }
});

router.post('/streams', csrfProtection, async (req, res) => {
  try {
    const userId = req.session?.user?.id;
    const userRole = req.session?.user?.role;
    
    if (!userId) {
      return res.error(ApiErrorCode.AUTHENTICATION_REQUIRED, 'Please log in to create a stream');
    }
    
    // Role-based authorization: only trainers, institutes, and admins can create streams
    const allowedRoles = ['trainer', 'institute-admin', 'admin'];
    if (!userRole || !allowedRoles.includes(userRole)) {
      return res.error(ApiErrorCode.INSUFFICIENT_PERMISSIONS, '훈련사 또는 관리자만 라이브 스트리밍을 생성할 수 있습니다.');
    }
    
    const validation = insertLiveStreamSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.error(ApiErrorCode.VALIDATION_ERROR, validation.error.errors[0].message);
    }
    
    const streamKey = generateStreamKey();
    const meetingCode = generateMeetingCode();
    const meetingUrl = `https://meet.google.com/${meetingCode}`;
    
    const [newStream] = await db.insert(liveStreams).values({
      ...validation.data,
      hostId: userId,
      streamKey,
      meetingCode,
      meetingUrl,
    }).returning();
    
    console.log('[Live Streaming] Stream created:', { id: newStream.id, title: newStream.title });
    
    return res.success({ stream: newStream }, 'Stream created successfully');
  } catch (error) {
    logServerError('[Live Streaming] Error creating stream:', error, req);
    return res.error(ApiErrorCode.INTERNAL_SERVER_ERROR, 'Failed to create stream');
  }
});

router.patch('/streams/:id/start', csrfProtection, async (req, res) => {
  try {
    const userId = req.session?.user?.id;
    const userRole = req.session?.user?.role;
    const streamId = parseInt(req.params.id);
    
    if (!userId) {
      return res.error(ApiErrorCode.AUTHENTICATION_REQUIRED, 'Please log in');
    }
    
    if (isNaN(streamId)) {
      return res.error(ApiErrorCode.VALIDATION_ERROR, 'Invalid stream ID');
    }
    
    const [stream] = await db.select().from(liveStreams).where(eq(liveStreams.id, streamId));
    
    if (!stream) {
      return res.error(ApiErrorCode.RESOURCE_NOT_FOUND, 'Stream not found');
    }
    
    // Check if user is the host or an admin
    const isAdmin = userRole === 'admin';
    if (stream.hostId !== userId && !isAdmin) {
      return res.error(ApiErrorCode.INSUFFICIENT_PERMISSIONS, 'Only the host can start this stream');
    }
    
    if (stream.status === 'live') {
      return res.error(ApiErrorCode.VALIDATION_ERROR, 'Stream is already live');
    }
    
    const [updatedStream] = await db.update(liveStreams)
      .set({
        status: 'live',
        actualStartTime: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(liveStreams.id, streamId))
      .returning();
    
    console.log('[Live Streaming] Stream started:', { id: streamId });
    
    return res.success({ stream: updatedStream }, 'Stream started');
  } catch (error) {
    logServerError('[Live Streaming] Error starting stream:', error, req);
    return res.error(ApiErrorCode.INTERNAL_SERVER_ERROR, 'Failed to start stream');
  }
});

router.patch('/streams/:id/end', csrfProtection, async (req, res) => {
  try {
    const userId = req.session?.user?.id;
    const userRole = req.session?.user?.role;
    const streamId = parseInt(req.params.id);
    
    if (!userId) {
      return res.error(ApiErrorCode.AUTHENTICATION_REQUIRED, 'Please log in');
    }
    
    if (isNaN(streamId)) {
      return res.error(ApiErrorCode.VALIDATION_ERROR, 'Invalid stream ID');
    }
    
    const [stream] = await db.select().from(liveStreams).where(eq(liveStreams.id, streamId));
    
    if (!stream) {
      return res.error(ApiErrorCode.RESOURCE_NOT_FOUND, 'Stream not found');
    }
    
    // Check if user is the host or an admin
    const isAdmin = userRole === 'admin';
    if (stream.hostId !== userId && !isAdmin) {
      return res.error(ApiErrorCode.INSUFFICIENT_PERMISSIONS, 'Only the host can end this stream');
    }
    
    const endTime = new Date();
    const duration = stream.actualStartTime 
      ? Math.floor((endTime.getTime() - new Date(stream.actualStartTime).getTime()) / 1000)
      : 0;
    
    await db.update(streamViewers)
      .set({
        isActive: false,
        leftAt: endTime,
      })
      .where(and(
        eq(streamViewers.streamId, streamId),
        eq(streamViewers.isActive, true)
      ));

    // 화상수업 출석 마감: 아직 leftAt이 없는 row를 마감하고 totalSeconds 계산
    let attendeeCount = 0;
    try {
      const openAttendances = await db.select().from(liveSessionAttendance).where(and(
        eq(liveSessionAttendance.streamId, streamId),
        isNull(liveSessionAttendance.leftAt),
      ));
      for (const att of openAttendances) {
        const joinedAt = att.joinedAt ? new Date(att.joinedAt) : endTime;
        const seconds = Math.max(0, Math.floor((endTime.getTime() - joinedAt.getTime()) / 1000));
        await db.update(liveSessionAttendance)
          .set({
            leftAt: endTime,
            totalSeconds: (att.totalSeconds || 0) + seconds,
            status: 'ended',
            updatedAt: endTime,
          })
          .where(eq(liveSessionAttendance.id, att.id));
      }
      const allAttendances = await db.select({ userId: liveSessionAttendance.userId })
        .from(liveSessionAttendance)
        .where(eq(liveSessionAttendance.streamId, streamId));
      attendeeCount = new Set(allAttendances.map((a) => a.userId)).size;
    } catch (attErr) {
      logServerError('[Live Streaming] Attendance close failed:', attErr, req);
    }
    
    const [updatedStream] = await db.update(liveStreams)
      .set({
        status: 'ended',
        endTime,
        duration,
        currentViewers: 0,
        updatedAt: new Date(),
      })
      .where(eq(liveStreams.id, streamId))
      .returning();
    
    console.log('[Live Streaming] Stream ended:', { id: streamId, duration });

    // 종료 후 후속 액션: 호스트(훈련사)에게 알림장 작성 알림, 시청자에게 리뷰 요청 알림
    try {
      const { notificationService } = await import('../notifications/notification-service');

      // 1) 호스트에게 알림장 작성 안내
      await notificationService.sendNotification({
        userId: stream.hostId,
        type: 'training',
        title: '수업이 종료되었습니다',
        message: `"${stream.title}" 수업이 종료되었어요. 참여자 ${attendeeCount}명. 알림장을 작성해 보호자에게 공유해보세요.`,
        actionUrl: `/trainer/notebook?streamId=${streamId}`,
        data: { streamId, kind: 'stream_ended_host', attendeeCount },
      });

      // 2) 로그인 시청자에게 리뷰 요청 (중복 userId 제거)
      const viewerRows = await db.select({ userId: streamViewers.userId })
        .from(streamViewers)
        .where(eq(streamViewers.streamId, streamId));
      const viewerIds = Array.from(new Set(
        viewerRows.map((v) => v.userId).filter((id): id is number => typeof id === 'number')
      ));
      for (const viewerId of viewerIds) {
        if (viewerId === stream.hostId) continue;
        try {
          await notificationService.sendNotification({
            userId: viewerId,
            type: 'training',
            title: '수업은 어떠셨나요?',
            message: `"${stream.title}" 라이브 수업에 대한 후기를 남겨주세요.`,
            actionUrl: `/live-streaming/${streamId}/review`,
            data: { streamId, kind: 'stream_ended_viewer_review' },
          });
        } catch (notifyErr) {
          logServerError('[Live Streaming] 시청자 리뷰 알림 실패:', notifyErr, req);
        }
      }
    } catch (notifyErr) {
      logServerError('[Live Streaming] 종료 알림 발송 오류:', notifyErr, req);
    }

    return res.success({ stream: updatedStream }, 'Stream ended');
  } catch (error) {
    logServerError('[Live Streaming] Error ending stream:', error, req);
    return res.error(ApiErrorCode.INTERNAL_SERVER_ERROR, 'Failed to end stream');
  }
});

router.delete('/streams/:id', csrfProtection, async (req, res) => {
  try {
    const userId = req.session?.user?.id;
    const userRole = req.session?.user?.role;
    const streamId = parseInt(req.params.id);
    
    if (!userId) {
      return res.error(ApiErrorCode.AUTHENTICATION_REQUIRED, 'Please log in');
    }
    
    if (isNaN(streamId)) {
      return res.error(ApiErrorCode.VALIDATION_ERROR, 'Invalid stream ID');
    }
    
    const [stream] = await db.select().from(liveStreams).where(eq(liveStreams.id, streamId));
    
    if (!stream) {
      return res.error(ApiErrorCode.RESOURCE_NOT_FOUND, 'Stream not found');
    }
    
    const isAdmin = userRole === 'admin';
    if (stream.hostId !== userId && !isAdmin) {
      return res.error(ApiErrorCode.INSUFFICIENT_PERMISSIONS, 'Only the host can delete this stream');
    }
    
    await db.delete(liveSessionAttendance).where(eq(liveSessionAttendance.streamId, streamId));
    await db.delete(streamViewers).where(eq(streamViewers.streamId, streamId));
    await db.delete(streamChatMessages).where(eq(streamChatMessages.streamId, streamId));
    await db.delete(liveStreams).where(eq(liveStreams.id, streamId));
    
    console.log('[Live Streaming] Stream deleted:', { id: streamId, deletedBy: userId });
    
    return res.success({ deleted: true }, 'Stream deleted');
  } catch (error) {
    logServerError('[Live Streaming] Error deleting stream:', error, req);
    return res.error(ApiErrorCode.INTERNAL_SERVER_ERROR, 'Failed to delete stream');
  }
});

router.post('/streams/:id/join', csrfProtection, async (req, res) => {
  try {
    const streamId = parseInt(req.params.id);
    const userId = req.session?.user?.id;
    const sessionId = req.body.sessionId || crypto.randomBytes(8).toString('hex');
    const reservationIdRaw = req.body.reservationId;
    const reservationId = typeof reservationIdRaw === 'number'
      ? reservationIdRaw
      : (reservationIdRaw ? parseInt(reservationIdRaw, 10) : undefined);
    
    if (isNaN(streamId)) {
      return res.error(ApiErrorCode.VALIDATION_ERROR, 'Invalid stream ID');
    }
    
    const [stream] = await db.select().from(liveStreams).where(eq(liveStreams.id, streamId));
    
    if (!stream) {
      return res.error(ApiErrorCode.RESOURCE_NOT_FOUND, 'Stream not found');
    }
    
    if (stream.status !== 'live' && stream.status !== 'scheduled') {
      return res.error(ApiErrorCode.VALIDATION_ERROR, 'Stream is not available');
    }
    
    const [viewer] = await db.insert(streamViewers).values({
      streamId,
      userId: userId || null,
      sessionId,
      isActive: true,
    }).returning();

    // 화상수업 출석 자동 기록 (로그인 사용자 한정)
    let attendance: LiveSessionAttendance | null = null;
    if (userId) {
      try {
        const normalizedReservationId = reservationId && !isNaN(reservationId) ? reservationId : null;

        // 예약 단위로 활성 row를 분리 관리: (streamId, userId, reservationId, leftAt is null)
        const reservationCond = normalizedReservationId === null
          ? isNull(liveSessionAttendance.reservationId)
          : eq(liveSessionAttendance.reservationId, normalizedReservationId);

        const existingRows = await db.select().from(liveSessionAttendance).where(and(
          eq(liveSessionAttendance.streamId, streamId),
          eq(liveSessionAttendance.userId, userId),
          reservationCond,
          isNull(liveSessionAttendance.leftAt),
        ));
        const existing = existingRows[0];

        if (existing) {
          attendance = existing;
        } else {
          const [created] = await db.insert(liveSessionAttendance).values({
            streamId,
            userId,
            reservationId: normalizedReservationId,
            status: 'joined',
            totalSeconds: 0,
          }).returning();
          attendance = created;
        }
      } catch (attErr) {
        logServerError('[Live Streaming] Attendance create failed:', attErr, req);
      }
    }
    
    const newViewerCount = (stream.currentViewers || 0) + 1;
    const peakViewers = Math.max(stream.peakViewers || 0, newViewerCount);
    const totalViews = (stream.totalViews || 0) + 1;
    
    await db.update(liveStreams)
      .set({
        currentViewers: newViewerCount,
        peakViewers,
        totalViews,
        updatedAt: new Date(),
      })
      .where(eq(liveStreams.id, streamId));
    
    console.log('[Live Streaming] Viewer joined:', { streamId, viewerId: viewer.id, attendanceId: attendance?.id });
    
    return res.success({ 
      viewer,
      attendance,
      stream: {
        ...stream,
        currentViewers: newViewerCount,
      }
    });
  } catch (error) {
    logServerError('[Live Streaming] Error joining stream:', error, req);
    return res.error(ApiErrorCode.INTERNAL_SERVER_ERROR, 'Failed to join stream');
  }
});

router.post('/streams/:id/leave', csrfProtection, async (req, res) => {
  try {
    const streamId = parseInt(req.params.id);
    const { sessionId, viewerId } = req.body;
    
    if (isNaN(streamId)) {
      return res.error(ApiErrorCode.VALIDATION_ERROR, 'Invalid stream ID');
    }
    
    if (!sessionId && !viewerId) {
      return res.error(ApiErrorCode.VALIDATION_ERROR, 'Session ID or Viewer ID required');
    }
    
    let condition;
    if (viewerId) {
      condition = and(
        eq(streamViewers.id, viewerId),
        eq(streamViewers.streamId, streamId)
      );
    } else {
      condition = and(
        eq(streamViewers.sessionId, sessionId),
        eq(streamViewers.streamId, streamId),
        eq(streamViewers.isActive, true)
      );
    }
    
    const [viewer] = await db.select().from(streamViewers).where(condition);
    
    if (viewer) {
      const leftAt = new Date();
      const watchTime = viewer.joinedAt 
        ? Math.floor((leftAt.getTime() - new Date(viewer.joinedAt).getTime()) / 1000)
        : 0;
      
      await db.update(streamViewers)
        .set({
          isActive: false,
          leftAt,
          watchTime,
        })
        .where(eq(streamViewers.id, viewer.id));

      // 출석 row 마감
      if (viewer.userId) {
        try {
          const openRows = await db.select().from(liveSessionAttendance).where(and(
            eq(liveSessionAttendance.streamId, streamId),
            eq(liveSessionAttendance.userId, viewer.userId),
            isNull(liveSessionAttendance.leftAt),
          ));
          for (const att of openRows) {
            const joinedAt = att.joinedAt ? new Date(att.joinedAt) : leftAt;
            const seconds = Math.max(0, Math.floor((leftAt.getTime() - joinedAt.getTime()) / 1000));
            await db.update(liveSessionAttendance)
              .set({
                leftAt,
                totalSeconds: (att.totalSeconds || 0) + seconds,
                status: 'left',
                updatedAt: leftAt,
              })
              .where(eq(liveSessionAttendance.id, att.id));
          }
        } catch (attErr) {
          logServerError('[Live Streaming] Attendance leave update failed:', attErr, req);
        }
      }
      
      const [stream] = await db.select().from(liveStreams).where(eq(liveStreams.id, streamId));
      if (stream && stream.currentViewers && stream.currentViewers > 0) {
        await db.update(liveStreams)
          .set({
            currentViewers: stream.currentViewers - 1,
            updatedAt: new Date(),
          })
          .where(eq(liveStreams.id, streamId));
      }
      
      console.log('[Live Streaming] Viewer left:', { streamId, viewerId: viewer.id, watchTime });
    }
    
    return res.success({ message: 'Left stream' });
  } catch (error) {
    logServerError('[Live Streaming] Error leaving stream:', error, req);
    return res.error(ApiErrorCode.INTERNAL_SERVER_ERROR, 'Failed to leave stream');
  }
});

router.get('/streams/:id/chat', async (req, res) => {
  try {
    const streamId = parseInt(req.params.id);
    const limit = parseInt(req.query.limit as string) || 50;
    const before = req.query.before ? parseInt(req.query.before as string) : undefined;
    
    if (isNaN(streamId)) {
      return res.error(ApiErrorCode.VALIDATION_ERROR, 'Invalid stream ID');
    }
    
    let query = db.select({
      id: streamChatMessages.id,
      streamId: streamChatMessages.streamId,
      userId: streamChatMessages.userId,
      message: streamChatMessages.message,
      isHighlighted: streamChatMessages.isHighlighted,
      isPinned: streamChatMessages.isPinned,
      createdAt: streamChatMessages.createdAt,
      userName: users.name,
      userAvatar: users.avatar,
    })
    .from(streamChatMessages)
    .leftJoin(users, eq(streamChatMessages.userId, users.id))
    .where(and(
      eq(streamChatMessages.streamId, streamId),
      eq(streamChatMessages.isDeleted, false)
    ))
    .orderBy(desc(streamChatMessages.createdAt))
    .limit(limit);
    
    const messages = await query;
    
    return res.success({ messages: messages.reverse() });
  } catch (error) {
    logServerError('[Live Streaming] Error fetching chat:', error, req);
    return res.error(ApiErrorCode.INTERNAL_SERVER_ERROR, 'Failed to fetch chat messages');
  }
});

router.post('/streams/:id/chat', csrfProtection, async (req, res) => {
  try {
    const userId = req.session?.user?.id;
    const streamId = parseInt(req.params.id);
    
    if (!userId) {
      return res.error(ApiErrorCode.AUTHENTICATION_REQUIRED, 'Please log in to chat');
    }
    
    if (isNaN(streamId)) {
      return res.error(ApiErrorCode.VALIDATION_ERROR, 'Invalid stream ID');
    }
    
    const [stream] = await db.select().from(liveStreams).where(eq(liveStreams.id, streamId));
    
    if (!stream) {
      return res.error(ApiErrorCode.RESOURCE_NOT_FOUND, 'Stream not found');
    }
    
    if (!stream.chatEnabled) {
      return res.error(ApiErrorCode.INSUFFICIENT_PERMISSIONS, 'Chat is disabled for this stream');
    }
    
    const validation = insertStreamChatSchema.safeParse({
      streamId,
      userId,
      message: req.body.message,
    });
    
    if (!validation.success) {
      return res.error(ApiErrorCode.VALIDATION_ERROR, validation.error.errors[0].message);
    }
    
    const [user] = await db.select({ name: users.name, avatar: users.avatar })
      .from(users).where(eq(users.id, userId));
    
    const [newMessage] = await db.insert(streamChatMessages).values(validation.data).returning();
    
    return res.success({ 
      message: {
        ...newMessage,
        userName: user?.name,
        userAvatar: user?.avatar,
      }
    });
  } catch (error) {
    logServerError('[Live Streaming] Error sending chat:', error, req);
    return res.error(ApiErrorCode.INTERNAL_SERVER_ERROR, 'Failed to send message');
  }
});

// 화상수업 출석자 조회 (알림장 작성 화면 자동 표시) - 인증/권한 필요
type AttendeeRow = {
  id: number;
  streamId: number;
  reservationId: number | null;
  userId: number;
  joinedAt: Date | null;
  leftAt: Date | null;
  totalSeconds: number | null;
  status: string | null;
  userName: string | null;
  userAvatar: string | null;
};

router.get('/streams/:id/attendees', async (req, res) => {
  try {
    const userId = req.session?.user?.id;
    const userRole = req.session?.user?.role;
    if (!userId) {
      return res.error(ApiErrorCode.AUTHENTICATION_REQUIRED, 'Please log in');
    }

    const streamId = parseInt(req.params.id);
    if (isNaN(streamId)) {
      return res.error(ApiErrorCode.VALIDATION_ERROR, 'Invalid stream ID');
    }

    const [stream] = await db.select().from(liveStreams).where(eq(liveStreams.id, streamId));
    if (!stream) {
      return res.error(ApiErrorCode.RESOURCE_NOT_FOUND, 'Stream not found');
    }

    // 권한: 호스트(훈련사), 관리자, 또는 해당 수업 출석자 본인
    const isAdmin = userRole === 'admin';
    const isHost = stream.hostId === userId;
    let isParticipant = false;
    if (!isHost && !isAdmin) {
      const ownRows = await db.select({ id: liveSessionAttendance.id })
        .from(liveSessionAttendance)
        .where(and(
          eq(liveSessionAttendance.streamId, streamId),
          eq(liveSessionAttendance.userId, userId),
        ));
      isParticipant = ownRows.length > 0;
    }
    if (!isHost && !isAdmin && !isParticipant) {
      return res.error(ApiErrorCode.INSUFFICIENT_PERMISSIONS, 'Not allowed to view attendees');
    }

    const rows: AttendeeRow[] = await db.select({
      id: liveSessionAttendance.id,
      streamId: liveSessionAttendance.streamId,
      reservationId: liveSessionAttendance.reservationId,
      userId: liveSessionAttendance.userId,
      joinedAt: liveSessionAttendance.joinedAt,
      leftAt: liveSessionAttendance.leftAt,
      totalSeconds: liveSessionAttendance.totalSeconds,
      status: liveSessionAttendance.status,
      userName: users.name,
      userAvatar: users.avatar,
    })
      .from(liveSessionAttendance)
      .leftJoin(users, eq(liveSessionAttendance.userId, users.id))
      .where(eq(liveSessionAttendance.streamId, streamId))
      .orderBy(desc(liveSessionAttendance.joinedAt));

    // 사용자별로 합계 (여러 번 join/leave 가능)
    const byUser = new Map<number, AttendeeRow>();
    for (const r of rows) {
      const existing = byUser.get(r.userId);
      if (existing) {
        existing.totalSeconds = (existing.totalSeconds || 0) + (r.totalSeconds || 0);
        if (!existing.leftAt && r.leftAt) existing.leftAt = r.leftAt;
      } else {
        byUser.set(r.userId, { ...r });
      }
    }

    return res.success({ attendees: Array.from(byUser.values()), total: byUser.size });
  } catch (error) {
    logServerError('[Live Streaming] Error fetching attendees:', error, req);
    return res.error(ApiErrorCode.INTERNAL_SERVER_ERROR, 'Failed to fetch attendees');
  }
});

router.get('/my-streams', async (req, res) => {
  try {
    const userId = req.session?.user?.id;
    
    if (!userId) {
      return res.error(ApiErrorCode.AUTHENTICATION_REQUIRED, 'Please log in');
    }
    
    const myStreams = await db.select()
      .from(liveStreams)
      .where(eq(liveStreams.hostId, userId))
      .orderBy(desc(liveStreams.createdAt));
    
    return res.success({ streams: myStreams });
  } catch (error) {
    logServerError('[Live Streaming] Error fetching my streams:', error, req);
    return res.error(ApiErrorCode.INTERNAL_SERVER_ERROR, 'Failed to fetch streams');
  }
});

export default router;
