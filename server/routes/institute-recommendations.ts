import { Router } from 'express';
import { storage } from '../storage';
import { logServerError } from '../middleware/audit-logger';

const router = Router();

// 기관별 추천 상품 목록 조회
router.get('/list', async (req, res) => {
  try {
    const { instituteId, recommendationType, page = 1, limit = 10 } = req.query;

    // 실제 구현에서는 데이터베이스에서 기관별 추천 상품을 조회
    const recommendations = [
      {
        id: 1,
        instituteId: 1,
        instituteName: '서울펫아카데미',
        productId: 1,
        productName: '프리미엄 목줄 세트',
        productPrice: 45000,
        recommendationType: 'essential',
        priority: 8,
        customMessage: '기본 훈련 과정에 필수적인 고품질 목줄입니다.',
        discountRate: 15,
        isActive: true,
        clickCount: 142,
        purchaseCount: 23,
        revenue: 873000,
        startDate: '2024-01-01',
        endDate: null
      },
      {
        id: 2,
        instituteId: 2,
        instituteName: '강남훈련센터',
        productId: 4,
        productName: '훈련용 간식 패키지',
        productPrice: 28000,
        recommendationType: 'popular',
        priority: 6,
        customMessage: '효과적인 긍정 강화를 위한 프리미엄 간식입니다.',
        discountRate: 10,
        isActive: true,
        clickCount: 89,
        purchaseCount: 15,
        revenue: 378000,
        startDate: '2024-02-01',
        endDate: null
      },
      {
        id: 3,
        instituteId: 1,
        instituteName: '서울펫아카데미',
        productId: 7,
        productName: '클리커 트레이닝 세트',
        productPrice: 15000,
        recommendationType: 'featured',
        priority: 9,
        customMessage: '정확한 타이밍 훈련을 위한 전문가 추천 클리커입니다.',
        discountRate: 20,
        isActive: true,
        clickCount: 67,
        purchaseCount: 12,
        revenue: 144000,
        startDate: '2024-01-15',
        endDate: '2024-06-30'
      }
    ];

    let filteredRecommendations = recommendations;
    
    if (instituteId) {
      filteredRecommendations = filteredRecommendations.filter(r => r.instituteId === parseInt(instituteId.toString()));
    }
    
    if (recommendationType) {
      filteredRecommendations = filteredRecommendations.filter(r => r.recommendationType === recommendationType);
    }

    res.json({
      recommendations: filteredRecommendations,
      total: filteredRecommendations.length,
      page: parseInt(page.toString()),
      limit: parseInt(limit.toString())
    });

  } catch (error) {
    logServerError('기관 추천 상품 목록 조회 오류:', error, req);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 기관별 추천 상품 추가
router.post('/add', async (req, res) => {
  try {
    const {
      instituteId,
      productId,
      recommendationType,
      priority,
      customMessage,
      discountRate,
      startDate,
      endDate
    } = req.body;

    // 유효성 검사
    if (!instituteId || !productId || !recommendationType) {
      return res.status(400).json({ 
        error: '기관 ID, 상품 ID, 추천 유형은 필수입니다.' 
      });
    }

    // 실제 구현에서는 데이터베이스에 새 추천 상품 추가
    const newRecommendation = {
      id: Date.now(),
      instituteId,
      productId,
      recommendationType,
      priority: priority || 5,
      customMessage: customMessage || '',
      discountRate: discountRate || 0,
      isActive: true,
      clickCount: 0,
      purchaseCount: 0,
      revenue: 0,
      startDate: startDate || new Date().toISOString().split('T')[0],
      endDate: endDate || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    res.json({
      success: true,
      recommendation: newRecommendation,
      message: '기관별 추천 상품이 추가되었습니다.'
    });

  } catch (error) {
    logServerError('기관 추천 상품 추가 오류:', error, req);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 기관별 추천 상품 수정
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // 실제 구현에서는 데이터베이스에서 추천 상품 수정
    const updatedRecommendation = {
      id: parseInt(id),
      ...updateData,
      updatedAt: new Date().toISOString()
    };

    res.json({
      success: true,
      recommendation: updatedRecommendation,
      message: '기관별 추천 상품이 수정되었습니다.'
    });

  } catch (error) {
    logServerError('기관 추천 상품 수정 오류:', error, req);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 추천 상품 클릭 추적
router.post('/:id/track-click', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, source } = req.body;

    // 실제 구현에서는 클릭 데이터를 데이터베이스에 기록
    const clickData = {
      recommendationId: parseInt(id),
      userId,
      source: source || 'web',
      timestamp: new Date().toISOString()
    };

    res.json({
      success: true,
      message: '클릭이 추적되었습니다.',
      clickData
    });

  } catch (error) {
    logServerError('추천 상품 클릭 추적 오류:', error, req);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 추천 상품 구매 추적
router.post('/:id/track-purchase', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, orderAmount, quantity } = req.body;

    // 실제 구현에서는 구매 데이터를 데이터베이스에 기록
    const purchaseData = {
      recommendationId: parseInt(id),
      userId,
      orderAmount,
      quantity,
      timestamp: new Date().toISOString()
    };

    res.json({
      success: true,
      message: '구매가 추적되었습니다.',
      purchaseData
    });

  } catch (error) {
    logServerError('추천 상품 구매 추적 오류:', error, req);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 기관별 추천 상품 성과 분석
router.get('/analytics/:instituteId', async (req, res) => {
  try {
    const { instituteId } = req.params;
    const { period = '30d' } = req.query;

    // 실제 구현에서는 데이터베이스에서 성과 데이터 분석
    const analytics = {
      instituteId: parseInt(instituteId),
      period,
      totalRecommendations: 12,
      activeRecommendations: 8,
      totalClicks: 298,
      totalPurchases: 67,
      totalRevenue: 1875000,
      conversionRate: 22.5,
      topPerformingProducts: [
        {
          productId: 1,
          productName: '프리미엄 목줄 세트',
          clicks: 142,
          purchases: 23,
          revenue: 873000,
          conversionRate: 16.2
        },
        {
          productId: 4,
          productName: '훈련용 간식 패키지',
          clicks: 89,
          purchases: 15,
          revenue: 378000,
          conversionRate: 16.9
        }
      ],
      recommendationTypePerformance: {
        essential: { clicks: 189, purchases: 35, revenue: 1125000 },
        featured: { clicks: 67, purchases: 12, revenue: 324000 },
        popular: { clicks: 42, purchases: 20, revenue: 426000 }
      }
    };

    res.json(analytics);

  } catch (error) {
    logServerError('기관 추천 상품 성과 분석 오류:', error, req);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 기관 목록 조회 (추천 상품 설정용)
router.get('/institutes', async (req, res) => {
  try {
    // 실제 구현에서는 데이터베이스에서 기관 목록 조회
    const institutes = [
      {
        id: 1,
        name: '서울펫아카데미',
        description: '전문적인 반려동물 교육을 제공하는 서울 소재 교육기관',
        subscriptionPlan: 'professional',
        memberCount: 145,
        activeRecommendations: 8
      },
      {
        id: 2,
        name: '강남훈련센터',
        description: '강남 지역 최고의 반려동물 훈련 전문센터',
        subscriptionPlan: 'standard',
        memberCount: 89,
        activeRecommendations: 5
      },
      {
        id: 3,
        name: '반려동물대학',
        description: '체계적인 커리큘럼을 통한 전문 교육기관',
        subscriptionPlan: 'enterprise',
        memberCount: 267,
        activeRecommendations: 12
      }
    ];

    res.json({
      institutes,
      total: institutes.length
    });

  } catch (error) {
    logServerError('기관 목록 조회 오류:', error, req);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

export default router;