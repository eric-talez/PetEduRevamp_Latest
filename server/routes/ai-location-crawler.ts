
import { Router } from 'express';
import { aiLocationCrawler } from '../ai/location-crawler';
import { storage } from '../storage';
import { logServerError } from '../middleware/audit-logger';

const router = Router();

// 관리자 권한 체크 미들웨어
const requireAdmin = (req: any, res: any, next: any) => {
  if (!req.session?.user || req.session.user.role !== 'admin') {
    return res.status(403).json({ error: '관리자 권한이 필요합니다.' });
  }
  next();
};

// AI 크롤링 시작
router.post('/api/admin/ai-crawler/start', requireAdmin, async (req, res) => {
  try {
    const { type, region, keyword } = req.body;

    console.log('[AI 크롤러] 수집 시작:', { type, region, keyword });

    let locations;
    if (keyword) {
      // 특정 키워드로 검색
      locations = await aiLocationCrawler.searchPetLocations(keyword, type, region);
    } else {
      // 전국 수집
      locations = await aiLocationCrawler.collectNationwideLocations();
    }

    // 수집된 정보를 임시 저장 (검토용)
    const crawlId = Date.now();
    await storage.set(`ai_crawl_${crawlId}`, {
      locations,
      status: 'pending',
      createdAt: new Date()
    });

    res.json({
      success: true,
      crawlId,
      count: locations.length,
      locations: locations.slice(0, 10) // 미리보기용 10개만
    });
  } catch (error) {
    logServerError('AI 크롤링 오류:', error, req);
    res.status(500).json({ 
      error: 'AI 크롤링 중 오류가 발생했습니다.',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// 크롤링 결과 조회
router.get('/api/admin/ai-crawler/results/:crawlId', requireAdmin, async (req, res) => {
  try {
    const { crawlId } = req.params;
    const result = await storage.get(`ai_crawl_${crawlId}`);

    if (!result) {
      return res.status(404).json({ error: '크롤링 결과를 찾을 수 없습니다.' });
    }

    res.json(result);
  } catch (error) {
    logServerError('크롤링 결과 조회 오류:', error, req);
    res.status(500).json({ error: '결과 조회 중 오류가 발생했습니다.' });
  }
});

// 크롤링 결과 승인 및 저장
router.post('/api/admin/ai-crawler/approve/:crawlId', requireAdmin, async (req, res) => {
  try {
    const { crawlId } = req.params;
    const { selectedIds } = req.body; // 승인할 장소 ID들

    const crawlResult = await storage.get(`ai_crawl_${crawlId}`);
    if (!crawlResult) {
      return res.status(404).json({ error: '크롤링 결과를 찾을 수 없습니다.' });
    }

    // 기존 장소 목록 가져오기
    let locations = await storage.get('pet_locations') || [];

    // 선택된 장소들만 추가
    const selectedLocations = crawlResult.locations.filter(
      (_: any, index: number) => selectedIds.includes(index)
    );

    // 중복 체크 후 추가
    for (const newLocation of selectedLocations) {
      const exists = locations.some((loc: any) => 
        Math.abs(loc.latitude - newLocation.latitude) < 0.0001 &&
        Math.abs(loc.longitude - newLocation.longitude) < 0.0001
      );

      if (!exists) {
        locations.push({
          ...newLocation,
          id: Date.now() + Math.random(),
          approved: true,
          approvedBy: req.session.user.id,
          approvedAt: new Date()
        });
      }
    }

    await storage.set('pet_locations', locations);

    // 크롤링 결과 상태 업데이트
    await storage.set(`ai_crawl_${crawlId}`, {
      ...crawlResult,
      status: 'approved',
      approvedCount: selectedIds.length,
      approvedAt: new Date()
    });

    res.json({
      success: true,
      message: `${selectedIds.length}개 장소가 승인되었습니다.`,
      totalLocations: locations.length
    });
  } catch (error) {
    logServerError('크롤링 결과 승인 오류:', error, req);
    res.status(500).json({ error: '승인 중 오류가 발생했습니다.' });
  }
});

// 승인된 장소 목록 조회
router.get('/api/locations/approved', async (req, res) => {
  try {
    const { type, region } = req.query;
    let locations = await storage.get('pet_locations') || [];

    // 필터링
    if (type) {
      locations = locations.filter((loc: any) => loc.type === type);
    }
    if (region) {
      locations = locations.filter((loc: any) => loc.address.includes(region as string));
    }

    res.json({
      success: true,
      count: locations.length,
      locations
    });
  } catch (error) {
    logServerError('장소 목록 조회 오류:', error, req);
    res.status(500).json({ error: '장소 목록 조회 중 오류가 발생했습니다.' });
  }
});

// 장소 수동 추가
router.post('/api/admin/locations/manual', requireAdmin, async (req, res) => {
  try {
    const locationData = req.body;
    let locations = await storage.get('pet_locations') || [];

    const newLocation = {
      ...locationData,
      id: Date.now() + Math.random(),
      approved: true,
      approvedBy: req.session.user.id,
      approvedAt: new Date(),
      lastUpdated: new Date()
    };

    locations.push(newLocation);
    await storage.set('pet_locations', locations);

    res.json({
      success: true,
      location: newLocation
    });
  } catch (error) {
    logServerError('장소 수동 추가 오류:', error, req);
    res.status(500).json({ error: '장소 추가 중 오류가 발생했습니다.' });
  }
});

// 장소 삭제
router.delete('/api/admin/locations/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    let locations = await storage.get('pet_locations') || [];

    locations = locations.filter((loc: any) => loc.id != id);
    await storage.set('pet_locations', locations);

    res.json({
      success: true,
      message: '장소가 삭제되었습니다.'
    });
  } catch (error) {
    logServerError('장소 삭제 오류:', error, req);
    res.status(500).json({ error: '장소 삭제 중 오류가 발생했습니다.' });
  }
});

export default router;
