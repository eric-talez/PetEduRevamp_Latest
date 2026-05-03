import type { Express } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { csrfProtection } from '../middleware/csrf';
import { notificationService } from '../notifications/notification-service';
import { logServerError } from '../middleware/audit-logger';

// 이벤트 스키마 정의
const eventSchema = z.object({
  title: z.string(),
  description: z.string(),
  image: z.string().optional(),
  date: z.string(),
  time: z.string(),
  locationId: z.number(),
  category: z.string(),
  price: z.union([z.number(), z.literal('무료')]),
  maxAttendees: z.number().optional(),
  organizerId: z.number()
});

export function registerEventRoutes(app: Express) {
  // 모든 이벤트 가져오기 (페이지네이션 지원)
  app.get("/api/events", async (req, res) => {
    try {
      // 페이지네이션 파라미터 처리
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const offset = (page - 1) * limit;
      
      // 총 이벤트 수 조회
      const allEvents = await storage.getAllEvents();
      const totalItems = allEvents.length;
      const totalPages = Math.ceil(totalItems / limit);
      
      // 페이지네이션 적용된 이벤트 목록 가져오기
      const events = allEvents.slice(offset, offset + limit);
      
      // 페이지네이션 메타데이터와 함께 응답
      return res.status(200).json({
        items: events,
        meta: {
          totalItems,
          itemsPerPage: limit,
          currentPage: page,
          totalPages
        }
      });
    } catch (error) {
      logServerError("이벤트 조회 오류:", error, req);
      return res.status(500).json({ 
        message: "이벤트를 불러오는 중 오류가 발생했습니다", 
        code: "EVENT_FETCH_ERROR" 
      });
    }
  });

  // 이벤트 상세 조회
  app.get("/api/events/:id", async (req, res) => {
    try {
      const eventId = parseInt(req.params.id);
      const event = await storage.getEventById(eventId);
      
      if (!event) {
        return res.status(404).json({ 
          message: "이벤트를 찾을 수 없습니다", 
          code: "EVENT_NOT_FOUND" 
        });
      }
      
      return res.status(200).json(event);
    } catch (error) {
      logServerError("이벤트 상세 조회 오류:", error, req);
      return res.status(500).json({ 
        message: "이벤트 상세 정보를 불러오는 중 오류가 발생했습니다", 
        code: "EVENT_DETAIL_FETCH_ERROR" 
      });
    }
  });

  // 이벤트 생성 (관리자 또는 훈련사만 가능)
  app.post("/api/events", csrfProtection, async (req, res) => {
    try {
      if (!req.session.user) {
        return res.status(401).json({ 
          message: "인증이 필요합니다", 
          code: "AUTH_REQUIRED" 
        });
      }
      
      // 권한 체크
      if (!["admin", "institute-admin", "trainer"].includes(req.session.user.role)) {
        return res.status(403).json({ 
          message: "이벤트 생성 권한이 없습니다", 
          code: "PERMISSION_DENIED" 
        });
      }
      
      const eventData = eventSchema.parse(req.body);
      
      // 주최자 ID를 현재 사용자로 설정
      const organizerId = req.session.user.id;
      
      const newEvent = await storage.createEvent({
        ...eventData,
        organizerId
      });
      
      return res.status(201).json(newEvent);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "이벤트 데이터가 유효하지 않습니다", 
          errors: error.errors,
          code: "INVALID_EVENT_DATA" 
        });
      }
      
      logServerError("이벤트 생성 오류:", error, req);
      return res.status(500).json({ 
        message: "이벤트 생성 중 오류가 발생했습니다", 
        code: "EVENT_CREATE_ERROR" 
      });
    }
  });

  // 이벤트 참가 신청
  app.post("/api/events/:id/attend", csrfProtection, async (req, res) => {
    try {
      if (!req.session.user) {
        return res.status(401).json({ 
          message: "인증이 필요합니다", 
          code: "AUTH_REQUIRED" 
        });
      }
      
      const eventId = parseInt(req.params.id);
      const userId = req.session.user.id;
      
      const event = await storage.getEventById(eventId);
      
      if (!event) {
        return res.status(404).json({ 
          message: "이벤트를 찾을 수 없습니다", 
          code: "EVENT_NOT_FOUND" 
        });
      }
      
      // 참가 인원 제한 체크
      if (event.maxAttendees && (event.attendees || 0) >= event.maxAttendees) {
        return res.status(400).json({ 
          message: "이미 참가 인원이 마감되었습니다", 
          code: "EVENT_FULL" 
        });
      }
      
      // 이미 참가 신청했는지 체크
      const isAlreadyAttending = await storage.checkEventAttendance(userId, eventId);
      
      if (isAlreadyAttending) {
        return res.status(400).json({ 
          message: "이미 참가 신청한 이벤트입니다", 
          code: "ALREADY_ATTENDING" 
        });
      }
      
      // 참가 신청 처리
      const attendance = await storage.attendEvent(userId, eventId);
      
      // 사용자에게 이벤트 참가 신청 알림 발송
      try {
        await notificationService.sendNotification({
          userId,
          type: 'event',
          title: '이벤트 참가 신청 완료',
          message: `"${event.title}" 이벤트 참가 신청이 완료되었습니다.`,
          actionUrl: `/events/${eventId}`,
          data: { eventId, eventTitle: event.title }
        });
      } catch (notifyError) {
        logServerError('[이벤트] 알림 발송 실패:', notifyError, req);
      }
      
      return res.status(201).json(attendance);
    } catch (error) {
      logServerError("이벤트 참가 신청 오류:", error, req);
      return res.status(500).json({ 
        message: "이벤트 참가 신청 중 오류가 발생했습니다", 
        code: "EVENT_ATTEND_ERROR" 
      });
    }
  });

  // 지역별 이벤트 조회
  app.get("/api/events/region/:region", async (req, res) => {
    try {
      const { region } = req.params;
      
      if (!region) {
        return res.status(400).json({ 
          message: "지역 정보가 필요합니다", 
          code: "REGION_REQUIRED" 
        });
      }
      
      const events = await storage.getEventsByRegion(region);
      
      return res.status(200).json(events);
    } catch (error) {
      logServerError("지역별 이벤트 조회 오류:", error, req);
      return res.status(500).json({ 
        message: "지역별 이벤트를 불러오는 중 오류가 발생했습니다", 
        code: "REGION_EVENTS_FETCH_ERROR" 
      });
    }
  });

  // 카테고리별 이벤트 조회
  app.get("/api/events/category/:category", async (req, res) => {
    try {
      const { category } = req.params;
      
      if (!category) {
        return res.status(400).json({ 
          message: "카테고리 정보가 필요합니다", 
          code: "CATEGORY_REQUIRED" 
        });
      }
      
      const events = await storage.getEventsByCategory(category);
      
      return res.status(200).json(events);
    } catch (error) {
      logServerError("카테고리별 이벤트 조회 오류:", error, req);
      return res.status(500).json({ 
        message: "카테고리별 이벤트를 불러오는 중 오류가 발생했습니다", 
        code: "CATEGORY_EVENTS_FETCH_ERROR" 
      });
    }
  });

  console.log('[server] 이벤트 API 라우트 등록 완료');
}