import express from 'express';
import { logServerError } from '../middleware/audit-logger';

const router = express.Router();

// 성능 메트릭 수집 엔드포인트
router.post('/metrics', (req, res) => {
  try {
    const { metrics, vitals, url, userAgent, timestamp } = req.body;
    
    // 성능 데이터 로깅 (실제로는 데이터베이스나 분석 서비스로 전송)
    console.log('📊 [Performance Metrics]', {
      url,
      timestamp: new Date(timestamp).toISOString(),
      vitalsCount: vitals?.length || 0,
      metricsCount: metrics?.length || 0,
      userAgent: userAgent?.substring(0, 50) + '...'
    });

    // 중요한 성능 이슈 감지 및 알림
    if (vitals) {
      const poorVitals = vitals.filter((v: any) => v.rating === 'poor');
      if (poorVitals.length > 0) {
        console.warn('⚠️ [Performance Warning] Poor vitals detected:', 
          poorVitals.map((v: any) => `${v.name}: ${v.value.toFixed(2)}`).join(', ')
        );
      }
    }

    res.status(200).json({ success: true, message: 'Metrics received' });
  } catch (error) {
    logServerError('Performance metrics processing failed:', error, req);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// 성능 통계 조회 엔드포인트 (관리자용)
router.get('/stats', (req, res) => {
  // 실제로는 데이터베이스에서 집계된 성능 통계를 반환
  const mockStats = {
    avgFCP: 1200,
    avgLCP: 2800,
    avgFID: 90,
    avgCLS: 0.08,
    avgTTFB: 650,
    slowPages: [
      { url: '/admin/dashboard', avgLoadTime: 3200 },
      { url: '/shop/products', avgLoadTime: 2800 }
    ],
    recommendations: [
      '이미지 최적화를 통해 LCP를 30% 개선할 수 있습니다.',
      'JavaScript 번들 크기를 줄여 FID를 개선하세요.',
      '레이아웃 시프트를 줄이기 위해 이미지 크기를 고정하세요.'
    ]
  };

  res.json(mockStats);
});

export { router as performanceRoutes };