import { Router } from 'express';
import { storage } from '../storage';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { logServerError } from '../middleware/audit-logger';

const router = Router();

// 업로드 디렉토리 설정
const uploadDir = path.join(process.cwd(), 'uploads', 'events');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer 설정
const eventStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `event_${Date.now()}_${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const eventUpload = multer({ 
  storage: eventStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('지원되지 않는 파일 형식입니다. JPG, PNG, GIF 파일만 업로드 가능합니다.'));
    }
  }
});

// 이벤트 데이터 타입 정의
interface EventData {
  id: number;
  name: string;
  location: {
    address: string;
    lat: number;
    lng: number;
  };
  startDate: string;
  endDate: string;
  time: string;
  description: string;
  category: string;
  price: string | number;
  attendees: number;
  maxAttendees: number;
  organizer: string;
  status: string;
  tags: string[];
  sourceUrl: string;
  thumbnailUrl: string;
  lastUpdated?: string;
}

// 모든 이벤트 조회
router.get('/events', async (req, res) => {
  try {
    const { category, status, search, sortBy = 'date' } = req.query;
    
    // 실제 데이터베이스에서 이벤트 데이터를 가져오는 로직
    // 현재는 메모리 저장소를 사용하여 구현
    let events = await storage.getAllEvents();
    
    // 필터링
    if (category && category !== 'all') {
      events = events.filter(event => event.category === category);
    }
    
    if (status && status !== 'all') {
      events = events.filter(event => event.status === status);
    }
    
    if (search) {
      const searchTerm = search.toString().toLowerCase();
      events = events.filter(event => 
        event.name.toLowerCase().includes(searchTerm) ||
        event.location.address.toLowerCase().includes(searchTerm) ||
        event.description.toLowerCase().includes(searchTerm) ||
        event.tags.some(tag => tag.toLowerCase().includes(searchTerm))
      );
    }
    
    // 정렬
    events.sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
        case 'name':
          return a.name.localeCompare(b.name);
        case 'price':
          const priceA = a.price === '무료' ? 0 : typeof a.price === 'number' ? a.price : parseInt(a.price.toString().replace(/[^\d]/g, '')) || 0;
          const priceB = b.price === '무료' ? 0 : typeof b.price === 'number' ? b.price : parseInt(b.price.toString().replace(/[^\d]/g, '')) || 0;
          return priceA - priceB;
        case 'attendees':
          return b.maxAttendees - a.maxAttendees;
        default:
          return 0;
      }
    });
    
    res.json(events);
  } catch (error) {
    logServerError('이벤트 조회 오류:', error, req);
    res.status(500).json({ error: '이벤트 데이터를 불러오는데 실패했습니다.' });
  }
});

// 이벤트 썸네일 업로드
router.post('/events/:id/thumbnail', eventUpload.single('thumbnail'), async (req, res) => {
  try {
    const eventId = parseInt(req.params.id);
    const file = req.file;
    
    if (!file) {
      return res.status(400).json({ error: '썸네일 파일이 필요합니다.' });
    }
    
    // 파일 URL 생성
    const thumbnailUrl = `/uploads/events/${file.filename}`;
    
    // 이벤트 정보 업데이트
    await storage.updateEventThumbnail(eventId, thumbnailUrl);
    
    console.log(`이벤트 ${eventId} 썸네일 업로드 완료: ${thumbnailUrl}`);
    
    res.json({ 
      success: true, 
      thumbnailUrl,
      message: '썸네일이 성공적으로 업로드되었습니다.'
    });
  } catch (error) {
    logServerError('썸네일 업로드 오류:', error, req);
    res.status(500).json({ error: '썸네일 업로드에 실패했습니다.' });
  }
});

// 이벤트 썸네일 삭제
router.delete('/events/:id/thumbnail', async (req, res) => {
  try {
    const eventId = parseInt(req.params.id);
    
    // 기존 썸네일 정보 가져오기
    const event = await storage.getEventById(eventId);
    if (!event) {
      return res.status(404).json({ error: '이벤트를 찾을 수 없습니다.' });
    }
    
    // 썸네일 파일 삭제
    if (event.thumbnailUrl && event.thumbnailUrl.startsWith('/uploads/events/')) {
      const filename = event.thumbnailUrl.split('/').pop();
      const filePath = path.join(uploadDir, filename);
      
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`썸네일 파일 삭제됨: ${filePath}`);
      }
    }
    
    // 이벤트 썸네일 URL 제거
    await storage.updateEventThumbnail(eventId, null);
    
    res.json({ success: true, message: '썸네일이 삭제되었습니다.' });
  } catch (error) {
    logServerError('썸네일 삭제 오류:', error, req);
    res.status(500).json({ error: '썸네일 삭제에 실패했습니다.' });
  }
});

// 특정 이벤트 조회
router.get('/events/:id', async (req, res) => {
  try {
    const eventId = parseInt(req.params.id);
    const event = await storage.getEventById(eventId);
    
    if (!event) {
      return res.status(404).json({ error: '이벤트를 찾을 수 없습니다.' });
    }
    
    res.json(event);
  } catch (error) {
    logServerError('이벤트 조회 오류:', error, req);
    res.status(500).json({ error: '이벤트 데이터를 불러오는데 실패했습니다.' });
  }
});

// 새로운 이벤트 추가 (관리자 전용)
router.post('/events', async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: '관리자 권한이 필요합니다.' });
    }
    
    const eventData: EventData = req.body;
    eventData.lastUpdated = new Date().toISOString();
    
    const newEvent = await storage.createEvent(eventData);
    
    res.status(201).json(newEvent);
  } catch (error) {
    logServerError('이벤트 생성 오류:', error, req);
    res.status(500).json({ error: '이벤트 생성에 실패했습니다.' });
  }
});

// 이벤트 업데이트 (관리자 전용)
router.put('/events/:id', async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: '관리자 권한이 필요합니다.' });
    }
    
    const eventId = parseInt(req.params.id);
    const eventData = req.body;
    eventData.lastUpdated = new Date().toISOString();
    
    const updatedEvent = await storage.updateEvent(eventId, eventData);
    
    if (!updatedEvent) {
      return res.status(404).json({ error: '이벤트를 찾을 수 없습니다.' });
    }
    
    res.json(updatedEvent);
  } catch (error) {
    logServerError('이벤트 업데이트 오류:', error, req);
    res.status(500).json({ error: '이벤트 업데이트에 실패했습니다.' });
  }
});

// 이벤트 삭제 (관리자 전용)
router.delete('/events/:id', async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: '관리자 권한이 필요합니다.' });
    }
    
    const eventId = parseInt(req.params.id);
    const deleted = await storage.deleteEvent(eventId);
    
    if (!deleted) {
      return res.status(404).json({ error: '이벤트를 찾을 수 없습니다.' });
    }
    
    res.json({ message: '이벤트가 삭제되었습니다.' });
  } catch (error) {
    logServerError('이벤트 삭제 오류:', error, req);
    res.status(500).json({ error: '이벤트 삭제에 실패했습니다.' });
  }
});

// 이벤트 자동 업데이트 (외부 크롤러용)
router.post('/events/auto-update', async (req, res) => {
  try {
    // API 키 검증 (실제 운영에서는 적절한 인증 구현)
    const apiKey = req.headers['x-api-key'];
    if (!apiKey || apiKey !== process.env.AUTO_UPDATE_API_KEY) {
      return res.status(401).json({ error: '유효하지 않은 API 키입니다.' });
    }
    
    const eventsData = req.body.events as EventData[];
    
    if (!Array.isArray(eventsData)) {
      return res.status(400).json({ error: '잘못된 데이터 형식입니다.' });
    }
    
    const results = [];
    
    for (const eventData of eventsData) {
      try {
        // 기존 이벤트 확인 (sourceUrl 기준)
        const existingEvent = await storage.getEventBySourceUrl(eventData.sourceUrl);
        
        if (existingEvent) {
          // 업데이트
          const updatedEvent = await storage.updateEvent(existingEvent.id, {
            ...eventData,
            lastUpdated: new Date().toISOString()
          });
          results.push({ action: 'updated', event: updatedEvent });
        } else {
          // 새로 생성
          const newEvent = await storage.createEvent({
            ...eventData,
            lastUpdated: new Date().toISOString()
          });
          results.push({ action: 'created', event: newEvent });
        }
      } catch (error) {
        logServerError(`이벤트 처리 오류 (${eventData.name}):`, error, req);
        results.push({ action: 'error', eventName: eventData.name, error: error.message });
      }
    }
    
    res.json({
      message: '이벤트 자동 업데이트 완료',
      results: results,
      totalProcessed: eventsData.length,
      created: results.filter(r => r.action === 'created').length,
      updated: results.filter(r => r.action === 'updated').length,
      errors: results.filter(r => r.action === 'error').length
    });
  } catch (error) {
    logServerError('이벤트 자동 업데이트 오류:', error, req);
    res.status(500).json({ error: '이벤트 자동 업데이트에 실패했습니다.' });
  }
});

// 이벤트 통계 조회
router.get('/events/stats', async (req, res) => {
  try {
    const events = await storage.getAllEvents();
    
    const stats = {
      total: events.length,
      byCategory: {},
      byStatus: {},
      upcoming: events.filter(e => e.status === '예정').length,
      ongoing: events.filter(e => e.status === '진행중').length,
      completed: events.filter(e => e.status === '완료').length,
      totalAttendees: events.reduce((sum, e) => sum + e.attendees, 0),
      totalCapacity: events.reduce((sum, e) => sum + e.maxAttendees, 0),
      averageAttendance: events.length > 0 ? events.reduce((sum, e) => sum + e.attendees, 0) / events.length : 0
    };
    
    // 카테고리별 통계
    events.forEach(event => {
      stats.byCategory[event.category] = (stats.byCategory[event.category] || 0) + 1;
    });
    
    // 상태별 통계
    events.forEach(event => {
      stats.byStatus[event.status] = (stats.byStatus[event.status] || 0) + 1;
    });
    
    res.json(stats);
  } catch (error) {
    logServerError('이벤트 통계 조회 오류:', error, req);
    res.status(500).json({ error: '이벤트 통계를 불러오는데 실패했습니다.' });
  }
});

export const eventRoutes = router;