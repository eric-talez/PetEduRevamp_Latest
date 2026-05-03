import type { Express, Request, Response } from "express";
import { adaptiveAIManager } from "../ai/adaptive-ai-manager";
import { aiProxyService } from "../ai/ai-proxy";
import { talezAIOptimizer } from "../ai/talez-ai-optimizer";
import { logServerError } from '../middleware/audit-logger';

// 확장된 요청 인터페이스
interface AnalysisRequest extends Request {
  userId?: string;
  body: {
    prompt: string;
    analysisType: string;
    petProfile?: any;
    userPreferences?: any;
    contextData?: any;
    options?: {
      complexity?: 'simple' | 'medium' | 'complex';
      urgency?: 'low' | 'medium' | 'high' | 'critical';
      personalizedNeeded?: boolean;
      realTimeNeeded?: boolean;
      visualAnalysis?: boolean;
      satisfaction?: number;
    };
  };
}

export function registerEnhancedAnalysisRoutes(app: Express) {
  // 사용자 인증 미들웨어
  const authenticateUser = (req: AnalysisRequest, res: Response, next: any) => {
    const userId = req.session?.user?.id || req.header("X-User-Id") || "anonymous";
    req.userId = String(userId);
    next();
  };

  // 관리자 권한 체크
  const requireAdmin = (req: any, res: Response, next: any) => {
    const userRole = req.session?.user?.role || req.header("X-User-Role");
    if (userRole !== 'admin') {
      return res.status(403).json({ error: '관리자 권한이 필요합니다.' });
    }
    next();
  };

  // ==========================================
  // 강화된 AI 분석 엔드포인트
  // ==========================================
  
  app.post("/api/enhanced-analysis/analyze", authenticateUser, async (req: AnalysisRequest, res: Response) => {
    try {
      const { prompt, analysisType, options = {} } = req.body;
      
      if (!prompt) {
        return res.status(400).json({ error: "분석할 내용을 입력해주세요." });
      }

      // 강화된 분석 실행
      const result = await adaptiveAIManager.enhancedAnalysis(
        req.userId!,
        prompt,
        analysisType,
        options
      );

      res.json({
        success: result.success,
        data: result.result,
        metadata: {
          aiUsed: result.aiUsed,
          responseTime: result.responseTime,
          userPreferences: result.userPreferences,
          analysisType,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      logServerError('Enhanced analysis error:', error, req);
      res.status(500).json({
        error: '분석 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // ==========================================
  // 반려견 행동 분석 특화 엔드포인트
  // ==========================================
  
  app.post("/api/enhanced-analysis/dog-behavior", authenticateUser, async (req: AnalysisRequest, res: Response) => {
    try {
      const { prompt, petProfile, options = {} } = req.body;
      
      if (!prompt) {
        return res.status(400).json({ error: "행동 분석할 내용을 입력해주세요." });
      }

      // 반려견 프로필을 포함한 개인화된 프롬프트 생성
      const enhancedPrompt = `
반려견 정보:
${petProfile ? `
- 이름: ${petProfile.name || '정보 없음'}
- 견종: ${petProfile.breed || '정보 없음'}  
- 나이: ${petProfile.age || '정보 없음'}
- 성격: ${petProfile.personality || '정보 없음'}
- 특이사항: ${petProfile.notes || '없음'}
` : '반려견 정보 없음'}

분석 요청:
${prompt}

위 반려견의 특성을 고려하여 다음 사항들을 포함해서 분석해주세요:
1. 행동의 원인 분석
2. 즉시 취할 수 있는 조치
3. 장기적인 훈련 방안
4. 주의사항 및 예방책
5. 수의사 상담이 필요한 경우
`;

      const result = await adaptiveAIManager.enhancedAnalysis(
        req.userId!,
        enhancedPrompt,
        'behavior',
        { ...options, personalizedNeeded: true, complexity: 'complex' }
      );

      res.json({
        success: result.success,
        analysis: result.result,
        petProfile,
        recommendations: {
          immediate: "즉시 조치사항이 분석 결과에 포함되어 있습니다.",
          longTerm: "장기 훈련 계획이 분석 결과에 포함되어 있습니다.",
          veterinaryConsult: "수의사 상담 필요성이 분석 결과에 포함되어 있습니다."
        },
        metadata: {
          aiUsed: result.aiUsed,
          responseTime: result.responseTime,
          analysisType: 'behavior',
          personalized: true
        }
      });

    } catch (error) {
      logServerError('Dog behavior analysis error:', error, req);
      res.status(500).json({
        error: '반려견 행동 분석 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // ==========================================
  // 반려견 건강 분석 특화 엔드포인트
  // ==========================================
  
  app.post("/api/enhanced-analysis/dog-health", authenticateUser, async (req: AnalysisRequest, res: Response) => {
    try {
      const { prompt, petProfile, options = {} } = req.body;
      
      if (!prompt) {
        return res.status(400).json({ error: "건강 분석할 내용을 입력해주세요." });
      }

      // 건강 상태 긴급도 판단
      const urgencyKeywords = ['응급', '피', '호흡곤란', '경련', '의식잃음', '구토', '설사'];
      const isUrgent = urgencyKeywords.some(keyword => prompt.includes(keyword));

      const enhancedPrompt = `
반려견 건강 상태 분석 요청:

반려견 정보:
${petProfile ? `
- 이름: ${petProfile.name || '정보 없음'}
- 견종: ${petProfile.breed || '정보 없음'}  
- 나이: ${petProfile.age || '정보 없음'}
- 체중: ${petProfile.weight || '정보 없음'}
- 기존 질병력: ${petProfile.medicalHistory || '없음'}
- 현재 복용 중인 약물: ${petProfile.medications || '없음'}
` : '반려견 정보 없음'}

증상 및 상황:
${prompt}

다음 사항들을 포함해서 분석해주세요:
1. 증상의 심각도 평가 (1-10 단계)
2. 가능한 원인들
3. 즉시 취할 수 있는 응급조치 (필요한 경우)
4. 수의사 진료 필요성 및 긴급도
5. 모니터링해야 할 추가 증상들
6. 예방을 위한 일상 관리법

⚠️ 중요: 이는 응급상황 대응을 위한 참고용 정보이며, 전문 수의사의 진료를 대체할 수 없습니다.
`;

      const result = await adaptiveAIManager.enhancedAnalysis(
        req.userId!,
        enhancedPrompt,
        'health',
        { 
          ...options, 
          urgency: isUrgent ? 'critical' : 'medium',
          realTimeNeeded: isUrgent,
          complexity: 'complex'
        }
      );

      res.json({
        success: result.success,
        healthAnalysis: result.result,
        urgencyLevel: isUrgent ? 'critical' : 'normal',
        petProfile,
        disclaimer: "이 분석은 참고용이며 전문 수의사의 진료를 대체할 수 없습니다.",
        emergencyContacts: isUrgent ? {
          veterinaryER: "24시간 응급 동물병원에 즉시 연락하세요",
          symptoms: "증상이 악화되면 즉시 병원으로 이동하세요"
        } : null,
        metadata: {
          aiUsed: result.aiUsed,
          responseTime: result.responseTime,
          analysisType: 'health',
          urgencyDetected: isUrgent
        }
      });

    } catch (error) {
      logServerError('Dog health analysis error:', error, req);
      res.status(500).json({
        error: '반려견 건강 분석 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // ==========================================
  // 훈련 계획 생성 엔드포인트
  // ==========================================
  
  app.post("/api/enhanced-analysis/training-plan", authenticateUser, async (req: AnalysisRequest, res: Response) => {
    try {
      const { prompt, petProfile, options = {} } = req.body;
      
      if (!prompt) {
        return res.status(400).json({ error: "훈련 목표를 입력해주세요." });
      }

      const enhancedPrompt = `
반려견 맞춤 훈련 계획 수립:

반려견 정보:
${petProfile ? `
- 이름: ${petProfile.name || '정보 없음'}
- 견종: ${petProfile.breed || '정보 없음'}  
- 나이: ${petProfile.age || '정보 없음'}
- 현재 훈련 수준: ${petProfile.trainingLevel || '초급'}
- 성격 특성: ${petProfile.personality || '정보 없음'}
- 문제 행동: ${petProfile.behaviorIssues || '없음'}
` : '반려견 정보 없음'}

훈련 목표:
${prompt}

다음 형식으로 상세한 훈련 계획을 작성해주세요:

1. 훈련 평가
   - 현재 수준 분석
   - 목표 달성 예상 기간
   - 개인화 요소

2. 단계별 훈련 계획
   - 1주차: 기초 단계
   - 2-4주차: 발전 단계  
   - 5-8주차: 완성 단계

3. 일일 훈련 스케줄
   - 아침 훈련 (10-15분)
   - 오후 훈련 (15-20분)
   - 저녁 복습 (5-10분)

4. 훈련 기법 및 보상
   - 효과적인 훈련 방법
   - 적절한 보상 시스템
   - 주의사항

5. 진행 상황 체크포인트
   - 주간 평가 기준
   - 문제 해결 방법
   - 조정 방안
`;

      const result = await adaptiveAIManager.enhancedAnalysis(
        req.userId!,
        enhancedPrompt,
        'training',
        { ...options, personalizedNeeded: true, complexity: 'complex' }
      );

      res.json({
        success: result.success,
        trainingPlan: result.result,
        petProfile,
        estimatedDuration: "8주 기본 과정",
        difficulty: petProfile?.trainingLevel || 'beginner',
        metadata: {
          aiUsed: result.aiUsed,
          responseTime: result.responseTime,
          analysisType: 'training',
          personalized: true
        }
      });

    } catch (error) {
      logServerError('Training plan generation error:', error, req);
      res.status(500).json({
        error: '훈련 계획 생성 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // ==========================================
  // 사용자 분석 현황 조회 (관리자용)
  // ==========================================
  
  app.get("/api/enhanced-analysis/user-analytics/:userId", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const analytics = adaptiveAIManager.getUserAnalytics(userId);
      
      res.json({
        success: true,
        userId,
        analytics,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logServerError('User analytics error:', error, req);
      res.status(500).json({
        error: '사용자 분석 현황 조회 중 오류가 발생했습니다.'
      });
    }
  });

  // ==========================================
  // 시스템 통계 조회 (관리자용)
  // ==========================================
  
  app.get("/api/enhanced-analysis/system-stats", requireAdmin, async (req: Request, res: Response) => {
    try {
      const stats = adaptiveAIManager.getSystemStats();
      const optimizationStatus = talezAIOptimizer.getCurrentOptimizationStatus();
      
      res.json({
        success: true,
        systemStats: stats,
        optimizationStatus,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logServerError('System stats error:', error, req);
      res.status(500).json({
        error: '시스템 통계 조회 중 오류가 발생했습니다.'
      });
    }
  });

  // ==========================================
  // AI 최적화 관리 (관리자용)
  // ==========================================
  
  app.get("/api/enhanced-analysis/optimization-history", requireAdmin, async (req: Request, res: Response) => {
    try {
      const history = talezAIOptimizer.getOptimizationHistory();
      
      res.json({
        success: true,
        optimizationHistory: history,
        currentStatus: talezAIOptimizer.getCurrentOptimizationStatus(),
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logServerError('Optimization history error:', error, req);
      res.status(500).json({
        error: '최적화 이력 조회 중 오류가 발생했습니다.'
      });
    }
  });

  app.post("/api/enhanced-analysis/force-optimization", requireAdmin, async (req: Request, res: Response) => {
    try {
      const result = await talezAIOptimizer.forceOptimization();
      
      res.json({
        success: true,
        message: '최적화가 강제 실행되었습니다.',
        optimizationResult: result,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logServerError('Force optimization error:', error, req);
      res.status(500).json({
        error: '강제 최적화 실행 중 오류가 발생했습니다.'
      });
    }
  });

  // ==========================================
  // AI 서비스 상태 조회
  // ==========================================
  
  app.get("/api/enhanced-analysis/service-status", async (req: Request, res: Response) => {
    try {
      const status = await aiProxyService.getServiceStatus();
      
      res.json({
        success: true,
        serviceStatus: status,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logServerError('Service status error:', error, req);
      res.status(500).json({
        error: 'AI 서비스 상태 조회 중 오류가 발생했습니다.'
      });
    }
  });

  // ==========================================
  // TALEZ 특화 헬퍼 메서드들
  // ==========================================
  
  function mapAnalysisTypeToTalezService(analysisType: string): any {
    const mapping: Record<string, any> = {
      'behavior': 'petBehaviorAnalysis',
      'health': 'healthMonitoring',
      'training': 'trainingPlanning',
      'nutrition': 'nutritionAdvice',
      'emergency': 'emergencyConsult',
      'general': 'generalChat',
      'image': 'imageAnalysis',
      'course': 'courseRecommendation'
    };
    return mapping[analysisType] || 'generalChat';
  }

  function mapAnalysisTypeToDomain(analysisType: string): any {
    const mapping: Record<string, any> = {
      'behavior': 'behaviorCorrection',
      'health': 'healthPrevention',
      'training': 'adultDogTraining',
      'nutrition': 'nutrition',
      'emergency': 'emergencyHealth',
      'puppy': 'puppyTraining',
      'grooming': 'grooming',
      'social': 'socializing'
    };
    return mapping[analysisType] || 'behaviorCorrection';
  }

  function extractBreedCategory(options: any): any {
    if (!options.petProfile?.breed) return 'unknown';
    
    const breed = options.petProfile.breed.toLowerCase();
    
    // 소형견
    if (['치와와', '푸들', '말티즈', '포메라니안', '요크셔테리어', 'chihuahua', 'poodle', 'maltese'].some(b => breed.includes(b))) {
      return 'smallBreeds';
    }
    
    // 대형견
    if (['골든리트리버', '래브라도', '저먼셰퍼드', 'golden', 'labrador', 'german'].some(b => breed.includes(b))) {
      return 'largeBreeds';
    }
    
    // 작업견
    if (['셰퍼드', '보더콜리', '허스키', 'shepherd', 'collie', 'husky'].some(b => breed.includes(b))) {
      return 'workingDogs';
    }
    
    // 믹스견
    if (['믹스', '잡종', 'mix', 'mixed'].some(b => breed.includes(b))) {
      return 'mixedBreeds';
    }
    
    return 'mediumBreeds'; // 기본값
  }

  console.log("🚀 강화된 AI 분석 라우트가 등록되었습니다.");
}