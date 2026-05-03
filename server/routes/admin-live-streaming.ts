import { Router, Request, Response, NextFunction } from 'express';
import { db } from '../db';
import {
  liveStreams,
  streamViewers,
  streamChatMessages,
  streamPeers,
  streamAnalytics,
} from '../../shared/schema';
import { and, eq, gte, lte, sql, desc, inArray, type SQL } from 'drizzle-orm';
import { logServerError } from '../middleware/audit-logger';

const router = Router();

interface SessionUser {
  id: number;
  role?: string;
}

interface AuthenticatedRequest extends Request {
  user?: SessionUser;
  session?: Request['session'] & { user?: SessionUser };
}

const requireAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const user = req.user || req.session?.user;
  if (!user) {
    return res.status(401).json({
      success: false,
      message: '로그인이 필요합니다.',
      code: 'AUTHENTICATION_REQUIRED',
    });
  }
  if (user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: '관리자 권한이 필요합니다.',
      code: 'ADMIN_ACCESS_REQUIRED',
    });
  }
  next();
};

function parseDate(value: unknown): Date | undefined {
  if (typeof value !== 'string' || !value) return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function combine(filters: SQL[]): SQL | undefined {
  if (filters.length === 0) return undefined;
  if (filters.length === 1) return filters[0];
  return and(...filters);
}

router.get('/metrics', requireAdmin, async (req, res) => {
  try {
    const streamIdRaw = req.query.streamId;
    const from = parseDate(req.query.from);
    const to = parseDate(req.query.to);
    const streamId =
      typeof streamIdRaw === 'string' && streamIdRaw.length > 0 ? Number(streamIdRaw) : undefined;

    if (streamIdRaw !== undefined && streamIdRaw !== '' && (streamId === undefined || Number.isNaN(streamId))) {
      return res.status(400).json({
        success: false,
        message: 'streamId가 올바르지 않습니다.',
        code: 'VALIDATION_ERROR',
      });
    }

    const streamFilters: SQL[] = [];
    if (streamId !== undefined) streamFilters.push(eq(liveStreams.id, streamId));
    if (from) streamFilters.push(gte(liveStreams.createdAt, from));
    if (to) streamFilters.push(lte(liveStreams.createdAt, to));

    const streamsRows = await db
      .select({
        id: liveStreams.id,
        title: liveStreams.title,
        status: liveStreams.status,
        category: liveStreams.category,
        peakViewers: liveStreams.peakViewers,
        currentViewers: liveStreams.currentViewers,
        totalViews: liveStreams.totalViews,
        duration: liveStreams.duration,
        actualStartTime: liveStreams.actualStartTime,
        endTime: liveStreams.endTime,
        createdAt: liveStreams.createdAt,
      })
      .from(liveStreams)
      .where(combine(streamFilters))
      .orderBy(desc(liveStreams.createdAt));

    const streamIds = streamsRows.map((s) => s.id);
    const hasStreams = streamIds.length > 0;

    const viewerWhere: SQL | undefined = streamId !== undefined
      ? eq(streamViewers.streamId, streamId)
      : hasStreams
        ? inArray(streamViewers.streamId, streamIds)
        : undefined;

    const chatBaseFilters: SQL[] = [eq(streamChatMessages.isDeleted, false)];
    if (streamId !== undefined) {
      chatBaseFilters.unshift(eq(streamChatMessages.streamId, streamId));
    } else if (hasStreams) {
      chatBaseFilters.unshift(inArray(streamChatMessages.streamId, streamIds));
    }
    const chatWhere: SQL | undefined =
      streamId !== undefined || hasStreams ? combine(chatBaseFilters) : undefined;

    const peerWhere: SQL | undefined = streamId !== undefined
      ? eq(streamPeers.streamId, streamId)
      : hasStreams
        ? inArray(streamPeers.streamId, streamIds)
        : undefined;

    const analyticsFilters: SQL[] = [];
    if (streamId !== undefined) {
      analyticsFilters.push(eq(streamAnalytics.streamId, streamId));
    } else if (hasStreams) {
      analyticsFilters.push(inArray(streamAnalytics.streamId, streamIds));
    }
    if (from) analyticsFilters.push(gte(streamAnalytics.createdAt, from));
    if (to) analyticsFilters.push(lte(streamAnalytics.createdAt, to));
    const analyticsWhere: SQL | undefined =
      streamId !== undefined || hasStreams ? combine(analyticsFilters) : undefined;

    const emptyViewerStats = { totalViewers: 0, uniqueUsers: 0, avgWatchTime: 0, totalWatchTime: 0 };
    const [viewerStats] = viewerWhere
      ? await db
          .select({
            totalViewers: sql<number>`COUNT(*)::int`,
            uniqueUsers: sql<number>`COUNT(DISTINCT ${streamViewers.userId})::int`,
            avgWatchTime: sql<number>`COALESCE(AVG(NULLIF(${streamViewers.watchTime}, 0)), 0)::float`,
            totalWatchTime: sql<number>`COALESCE(SUM(${streamViewers.watchTime}), 0)::int`,
          })
          .from(streamViewers)
          .where(viewerWhere)
      : [emptyViewerStats];

    const emptyChatStats = { chatMessageCount: 0, chatUserCount: 0 };
    const [chatStats] = chatWhere
      ? await db
          .select({
            chatMessageCount: sql<number>`COUNT(*)::int`,
            chatUserCount: sql<number>`COUNT(DISTINCT ${streamChatMessages.userId})::int`,
          })
          .from(streamChatMessages)
          .where(chatWhere)
      : [emptyChatStats];

    const qualityRows = peerWhere
      ? await db
          .select({
            quality: streamPeers.connectionQuality,
            count: sql<number>`COUNT(*)::int`,
          })
          .from(streamPeers)
          .where(peerWhere)
          .groupBy(streamPeers.connectionQuality)
      : [];

    const eventRows = analyticsWhere
      ? await db
          .select({
            eventType: streamAnalytics.eventType,
            count: sql<number>`COUNT(*)::int`,
          })
          .from(streamAnalytics)
          .where(analyticsWhere)
          .groupBy(streamAnalytics.eventType)
      : [];

    const statusRows = streamsRows.reduce<Record<string, number>>((acc, s) => {
      const key = s.status || 'unknown';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const categoryRows = streamsRows.reduce<Record<string, number>>((acc, s) => {
      const key = s.category || 'general';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const peakViewers = streamsRows.reduce((m, s) => Math.max(m, s.peakViewers || 0), 0);
    const totalViews = streamsRows.reduce((sum, s) => sum + (s.totalViews || 0), 0);
    const avgPeakViewers =
      streamsRows.length > 0
        ? streamsRows.reduce((sum, s) => sum + (s.peakViewers || 0), 0) / streamsRows.length
        : 0;
    const avgDuration =
      streamsRows.length > 0
        ? streamsRows.reduce((sum, s) => sum + (s.duration || 0), 0) / streamsRows.length
        : 0;

    const topStreams = [...streamsRows]
      .sort((a, b) => (b.peakViewers || 0) - (a.peakViewers || 0))
      .slice(0, 10)
      .map((s) => ({
        id: s.id,
        title: s.title,
        peakViewers: s.peakViewers || 0,
        totalViews: s.totalViews || 0,
        duration: s.duration || 0,
        status: s.status,
      }));

    const dailyMap = new Map<string, { date: string; streams: number; views: number }>();
    for (const s of streamsRows) {
      const d = s.createdAt ? new Date(s.createdAt) : null;
      if (!d) continue;
      const key = d.toISOString().slice(0, 10);
      const existing = dailyMap.get(key) || { date: key, streams: 0, views: 0 };
      existing.streams += 1;
      existing.views += s.totalViews || 0;
      dailyMap.set(key, existing);
    }
    const dailyTrend = Array.from(dailyMap.values()).sort((a, b) =>
      a.date.localeCompare(b.date),
    );

    return res.json({
      success: true,
      data: {
        filter: {
          streamId: streamId ?? null,
          from: from ? from.toISOString() : null,
          to: to ? to.toISOString() : null,
        },
        summary: {
          streamCount: streamsRows.length,
          totalViews,
          peakViewers,
          avgPeakViewers: Math.round(avgPeakViewers * 100) / 100,
          avgDurationSeconds: Math.round(avgDuration),
          avgWatchTimeSeconds: Math.round(Number(viewerStats?.avgWatchTime || 0)),
          totalWatchTimeSeconds: Number(viewerStats?.totalWatchTime || 0),
          uniqueViewers: Number(viewerStats?.uniqueUsers || 0),
          totalViewerSessions: Number(viewerStats?.totalViewers || 0),
          chatMessageCount: Number(chatStats?.chatMessageCount || 0),
          chatActiveUsers: Number(chatStats?.chatUserCount || 0),
        },
        statusDistribution: Object.entries(statusRows).map(([status, count]) => ({
          status,
          count,
        })),
        categoryDistribution: Object.entries(categoryRows).map(([category, count]) => ({
          category,
          count,
        })),
        connectionQualityDistribution: qualityRows.map((r) => ({
          quality: r.quality || 'unknown',
          count: Number(r.count),
        })),
        eventDistribution: eventRows.map((r) => ({
          eventType: r.eventType,
          count: Number(r.count),
        })),
        topStreams,
        dailyTrend,
      },
    });
  } catch (error) {
    logServerError('[Admin Live Streaming] metrics error:', error, req);
    return res.status(500).json({
      success: false,
      message: '메트릭을 불러오지 못했습니다.',
      code: 'INTERNAL_SERVER_ERROR',
    });
  }
});

router.get('/streams', requireAdmin, async (req, res) => {
  try {
    const limitRaw = Number(req.query.limit);
    const limit = Math.min(Number.isFinite(limitRaw) && limitRaw > 0 ? limitRaw : 100, 500);
    const rows = await db
      .select({
        id: liveStreams.id,
        title: liveStreams.title,
        status: liveStreams.status,
        peakViewers: liveStreams.peakViewers,
        totalViews: liveStreams.totalViews,
        createdAt: liveStreams.createdAt,
      })
      .from(liveStreams)
      .orderBy(desc(liveStreams.createdAt))
      .limit(limit);

    return res.json({ success: true, data: { streams: rows } });
  } catch (error) {
    logServerError('[Admin Live Streaming] list error:', error, req);
    return res.status(500).json({
      success: false,
      message: '스트림 목록을 불러오지 못했습니다.',
      code: 'INTERNAL_SERVER_ERROR',
    });
  }
});

export default router;
