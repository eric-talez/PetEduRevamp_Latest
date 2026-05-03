import { Router } from 'express';
import { storage } from '../storage';
import { logServerError } from '../middleware/audit-logger';

const router = Router();

// 커리큘럼-상품 매핑 검색
router.get('/search', async (req, res) => {
  try {
    const { materialName, curriculumId } = req.query;
    
    if (!materialName) {
      return res.status(400).json({ error: '준비물 이름이 필요합니다.' });
    }

    // 실제 구현에서는 데이터베이스에서 매핑 정보를 조회
    const mappings = [
      {
        id: 1,
        curriculumId: 'basic-obedience',
        materialName: '훈련용 목줄',
        mappedProduct: {
          id: 1,
          name: '프리미엄 목줄 세트',
          description: '고품질 훈련용 목줄로 조절 가능한 길이와 편안한 손잡이가 특징입니다.',
          price: 45000,
          images: ['https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=400&h=300&fit=crop'],
          category: '훈련용품',
          brand: 'PetTraining Pro',
          rating: 48, // 50점 만점
          review_count: 156,
          stock: 3,
          low_stock_threshold: 10,
          specifications: {
            '재질': '나일론',
            '길이': '120cm',
            '너비': '2cm',
            '무게': '150g'
          }
        },
        isRequired: true,
        quantity: 1,
        autoOrder: true,
        usageDescription: '기본 복종 훈련 시 목줄 훈련과 리드 컨트롤에 사용됩니다.',
        estimatedUsage: 4,
        suggestedAlternatives: [
          { id: 2, name: '기본 훈련 목줄', price: 25000 },
          { id: 3, name: '조절식 목줄', price: 35000 }
        ]
      },
      {
        id: 2,
        curriculumId: 'basic-obedience',
        materialName: '훈련용 간식',
        mappedProduct: {
          id: 4,
          name: '프리미엄 간식 팩',
          description: '훈련용으로 특별히 제작된 고단백 저칼로리 간식입니다.',
          price: 28000,
          images: ['https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=400&h=300&fit=crop'],
          category: '훈련용품',
          brand: 'DogTrainer',
          rating: 45,
          review_count: 89,
          stock: 15,
          low_stock_threshold: 5,
          specifications: {
            '재질': '천연 원료',
            '크기': '소형',
            '중량': '500g',
            '보관법': '서늘한 곳'
          }
        },
        isRequired: true,
        quantity: 2,
        autoOrder: false,
        usageDescription: '긍정적 강화 훈련을 위한 보상용 간식으로 사용됩니다.',
        estimatedUsage: 8,
        suggestedAlternatives: [
          { id: 5, name: '훈련용 간식', price: 18000 },
          { id: 6, name: '프리미엄 트릿', price: 35000 }
        ]
      }
    ];

    // 준비물 이름으로 매핑 찾기
    const mapping = mappings.find(m => 
      m.materialName.toLowerCase().includes(materialName.toString().toLowerCase()) ||
      materialName.toString().toLowerCase().includes(m.materialName.toLowerCase())
    );

    if (mapping) {
      res.json(mapping);
    } else {
      res.json({ mappedProduct: null, message: '매핑된 상품이 없습니다.' });
    }

  } catch (error) {
    logServerError('커리큘럼 매핑 검색 오류:', error, req);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 커리큘럼-상품 매핑 목록 조회
router.get('/list', async (req, res) => {
  try {
    const { curriculumId, page = 1, limit = 10 } = req.query;

    // 실제 구현에서는 데이터베이스에서 매핑 목록을 조회
    const mappings = [
      {
        id: 1,
        curriculumId: 'basic-obedience',
        curriculumTitle: '기본 복종 훈련',
        moduleId: 'module-1',
        moduleName: '1주차: 기초',
        productId: 1,
        productName: '프리미엄 목줄 세트',
        materialName: '훈련용 목줄',
        quantity: 1,
        isRequired: true,
        isOptional: false,
        currentStock: 3,
        autoOrder: true,
        estimatedDemand: 25
      },
      {
        id: 2,
        curriculumId: 'basic-obedience',
        curriculumTitle: '기본 복종 훈련',
        moduleId: 'module-2',
        moduleName: '2주차: 강화',
        productId: 4,
        productName: '프리미엄 간식 팩',
        materialName: '훈련용 간식',
        quantity: 2,
        isRequired: true,
        isOptional: false,
        currentStock: 15,
        autoOrder: false,
        estimatedDemand: 40
      }
    ];

    let filteredMappings = mappings;
    if (curriculumId) {
      filteredMappings = mappings.filter(m => m.curriculumId === curriculumId);
    }

    res.json({
      mappings: filteredMappings,
      total: filteredMappings.length,
      page: parseInt(page.toString()),
      limit: parseInt(limit.toString())
    });

  } catch (error) {
    logServerError('커리큘럼 매핑 목록 조회 오류:', error, req);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 자동 재고 주문 생성
router.post('/auto-order', async (req, res) => {
  try {
    const { productId, triggerType, requestedQuantity, triggeredBy } = req.body;

    // 실제 구현에서는 데이터베이스에 자동 주문 레코드 생성
    const autoOrder = {
      id: Date.now(),
      productId,
      triggerType,
      triggeredBy,
      requestedQuantity,
      estimatedCost: requestedQuantity * 25000, // 예상 비용 계산
      status: 'pending',
      orderDate: new Date().toISOString(),
      expectedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7일 후
    };

    res.json({
      success: true,
      order: autoOrder,
      message: '자동 주문이 생성되었습니다.'
    });

  } catch (error) {
    logServerError('자동 주문 생성 오류:', error, req);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 재고 부족 알림 조회
router.get('/low-stock-alerts', async (req, res) => {
  try {
    // 실제 구현에서는 데이터베이스에서 재고 부족 상품 조회
    const lowStockItems = [
      {
        id: 1,
        productName: '프리미엄 목줄',
        currentStock: 3,
        threshold: 10,
        urgencyLevel: 'high',
        estimatedDemand: 25,
        suggestedOrderQuantity: 50
      },
      {
        id: 2,
        productName: '훈련용 클리커',
        currentStock: 8,
        threshold: 15,
        urgencyLevel: 'medium',
        estimatedDemand: 15,
        suggestedOrderQuantity: 30
      }
    ];

    res.json({
      alerts: lowStockItems,
      total: lowStockItems.length
    });

  } catch (error) {
    logServerError('재고 부족 알림 조회 오류:', error, req);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

export default router;