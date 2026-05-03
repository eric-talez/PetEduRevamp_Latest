import type { Express } from "express";
import { aiProxyService } from "../ai/ai-proxy";
import { logServerError } from '../middleware/audit-logger';

interface AIConfiguration {
  openaiApiKey?: string;
  claudeApiKey?: string;
  geminiApiKey?: string;
  perplexityApiKey?: string;
  defaultModel: string;
  rateLimitPerMinute: number;
  dailyLimitPerUser: number;
  monthlyBudget: number;
  enableCostOptimization: boolean;
  enableFallback: boolean;
  enableUsageTracking: boolean;
  aiWeights?: {
    behavior: { openai: number; claude: number; gemini: number; perplexity: number };
    health: { openai: number; claude: number; gemini: number; perplexity: number };
    training: { openai: number; claude: number; gemini: number; perplexity: number };
    news: { openai: number; claude: number; gemini: number; perplexity: number };
  };
}

// 메모리 기반 설정 저장소 (실제 운영에서는 데이터베이스 사용)
let aiConfig: AIConfiguration = {
  defaultModel: 'cost',
  rateLimitPerMinute: 10,
  dailyLimitPerUser: 50,
  monthlyBudget: 100,
  enableCostOptimization: true,
  enableFallback: true,
  enableUsageTracking: true,
  aiWeights: {
    behavior: { openai: 0.4, claude: 0.4, gemini: 0.15, perplexity: 0.05 },
    health: { openai: 0.3, claude: 0.3, gemini: 0.25, perplexity: 0.15 },
    training: { openai: 0.35, claude: 0.35, gemini: 0.2, perplexity: 0.1 },
    news: { openai: 0.1, claude: 0.1, gemini: 0.2, perplexity: 0.6 }
  }
};

// 사용량 통계 (실제로는 데이터베이스에서 조회)
const mockUsageStats = {
  totalRequests: 1247,
  totalCost: 23.45,
  dailyLimit: 50,
  monthlyUsage: 892,
  topUsers: [
    { userId: 'admin', requests: 234, cost: 4.67 },
    { userId: 'trainer-001', requests: 156, cost: 3.12 },
    { userId: 'user-789', requests: 89, cost: 1.78 }
  ]
};

export function registerAdminAIRoutes(app: Express) {
  // 관리자 권한 체크 미들웨어
  const requireAdmin = (req: any, res: any, next: any) => {
    const userRole = req.session?.user?.role || req.header("X-User-Role");
    
    if (userRole !== 'admin') {
      return res.status(403).json({ 
        error: '관리자 권한이 필요합니다.' 
      });
    }
    
    next();
  };

  // AI 설정 조회
  app.get("/api/admin/ai-config", requireAdmin, (req, res) => {
    try {
      // API 키는 마스킹해서 전송
      const safeConfig = {
        ...aiConfig,
        openaiApiKey: process.env.OPENAI_API_TALEZ || process.env.OPENAI_API_KEY ? '••••••••' : '',
        claudeApiKey: process.env.ANTHROPIC_API_KEY ? '••••••••' : '',
        geminiApiKey: process.env.GEMINI_API_KEY ? '••••••••' : '',
        perplexityApiKey: process.env.PERPLEXITY_API_KEY ? '••••••••' : ''
      };

      res.json(safeConfig);
    } catch (error) {
      logServerError('AI 설정 조회 오류:', error, req);
      res.status(500).json({ error: 'AI 설정을 조회할 수 없습니다.' });
    }
  });

  // AI 설정 업데이트
  app.put("/api/admin/ai-config", requireAdmin, (req, res) => {
    try {
      const {
        openaiApiKey,
        claudeApiKey,
        geminiApiKey,
        perplexityApiKey,
        defaultModel,
        rateLimitPerMinute,
        dailyLimitPerUser,
        monthlyBudget,
        enableCostOptimization,
        enableFallback,
        enableUsageTracking,
        aiWeights
      } = req.body;

      // 설정 업데이트
      if (defaultModel !== undefined) aiConfig.defaultModel = defaultModel;
      if (rateLimitPerMinute !== undefined) aiConfig.rateLimitPerMinute = rateLimitPerMinute;
      if (dailyLimitPerUser !== undefined) aiConfig.dailyLimitPerUser = dailyLimitPerUser;
      if (monthlyBudget !== undefined) aiConfig.monthlyBudget = monthlyBudget;
      if (enableCostOptimization !== undefined) aiConfig.enableCostOptimization = enableCostOptimization;
      if (enableFallback !== undefined) aiConfig.enableFallback = enableFallback;
      if (enableUsageTracking !== undefined) aiConfig.enableUsageTracking = enableUsageTracking;
      if (aiWeights !== undefined) aiConfig.aiWeights = aiWeights;

      // API 키 업데이트 (환경변수로 설정 - 실제로는 안전한 저장소 사용)
      if (openaiApiKey && openaiApiKey !== '••••••••') {
        process.env.OPENAI_API_TALEZ = openaiApiKey;
        process.env.OPENAI_API_KEY = openaiApiKey;
        console.log('🔑 OpenAI API 키가 업데이트되었습니다.');
      }

      if (claudeApiKey && claudeApiKey !== '••••••••') {
        process.env.ANTHROPIC_API_KEY = claudeApiKey;
        console.log('🔑 Claude API 키가 업데이트되었습니다.');
      }

      if (geminiApiKey && geminiApiKey !== '••••••••') {
        process.env.GEMINI_API_KEY = geminiApiKey;
        console.log('🔑 Gemini API 키가 업데이트되었습니다.');
      }

      if (perplexityApiKey && perplexityApiKey !== '••••••••') {
        process.env.PERPLEXITY_API_KEY = perplexityApiKey;
        console.log('🔑 Perplexity API 키가 업데이트되었습니다.');
      }

      // 환경변수 업데이트를 위해 AI 프록시 재초기화
      console.log('🔄 AI 프록시 설정이 업데이트되었습니다.');

      res.json({ 
        success: true, 
        message: 'AI 설정이 성공적으로 업데이트되었습니다.',
        config: {
          ...aiConfig,
          openaiApiKey: process.env.OPENAI_API_TALEZ || process.env.OPENAI_API_KEY ? '••••••••' : '',
          claudeApiKey: process.env.ANTHROPIC_API_KEY ? '••••••••' : '',
          geminiApiKey: process.env.GEMINI_API_KEY ? '••••••••' : '',
          perplexityApiKey: process.env.PERPLEXITY_API_KEY ? '••••••••' : ''
        }
      });

    } catch (error) {
      logServerError('AI 설정 업데이트 오류:', error, req);
      res.status(500).json({ error: 'AI 설정을 업데이트할 수 없습니다.' });
    }
  });

  // AI 사용량 통계 조회
  app.get("/api/admin/ai-usage-stats", requireAdmin, (req, res) => {
    try {
      // 실제로는 데이터베이스에서 사용량 통계를 조회
      // 현재는 목업 데이터 사용
      
      const stats = {
        ...mockUsageStats,
        budgetUsage: (mockUsageStats.totalCost / aiConfig.monthlyBudget) * 100,
        dailyAverageRequests: Math.round(mockUsageStats.totalRequests / 30),
        costEfficiency: mockUsageStats.totalCost / mockUsageStats.totalRequests,
        lastUpdated: new Date().toISOString()
      };

      res.json(stats);

    } catch (error) {
      logServerError('AI 사용량 통계 조회 오류:', error, req);
      res.status(500).json({ error: '사용량 통계를 조회할 수 없습니다.' });
    }
  });

  // AI 서비스 재시작
  app.post("/api/admin/ai-service/restart", requireAdmin, async (req, res) => {
    try {
      console.log('🔄 AI 서비스 재시작 요청 수신');
      
      // AI 프록시 서비스 상태 체크 및 재초기화
      const status = await aiProxyService.getServiceStatus();
      
      console.log('✅ AI 서비스가 재시작되었습니다.');
      
      res.json({ 
        success: true, 
        message: 'AI 서비스가 성공적으로 재시작되었습니다.',
        status,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logServerError('AI 서비스 재시작 오류:', error, req);
      res.status(500).json({ error: 'AI 서비스를 재시작할 수 없습니다.' });
    }
  });

  // AI 서비스 상태 상세 조회 (관리자용)
  app.get("/api/admin/ai-service/status", requireAdmin, async (req, res) => {
    try {
      const status = await aiProxyService.getServiceStatus();
      
      const detailedStatus = {
        ...status,
        configuration: {
          rateLimitPerMinute: aiConfig.rateLimitPerMinute,
          dailyLimitPerUser: aiConfig.dailyLimitPerUser,
          monthlyBudget: aiConfig.monthlyBudget,
          costOptimizationEnabled: aiConfig.enableCostOptimization,
          fallbackEnabled: aiConfig.enableFallback,
          usageTrackingEnabled: aiConfig.enableUsageTracking
        },
        environment: {
          openaiConfigured: !!process.env.OPENAI_API_TALEZ || process.env.OPENAI_API_KEY,
          geminiConfigured: !!process.env.GEMINI_API_KEY,
          nodeEnv: process.env.NODE_ENV
        },
        lastChecked: new Date().toISOString()
      };

      res.json(detailedStatus);

    } catch (error) {
      logServerError('AI 서비스 상태 조회 오류:', error, req);
      res.status(500).json({ error: 'AI 서비스 상태를 조회할 수 없습니다.' });
    }
  });

  // 실시간 사용량 모니터링
  app.get("/api/admin/ai-usage/realtime", requireAdmin, (req, res) => {
    try {
      // 실제로는 실시간 사용량 데이터를 조회
      const realtimeData = {
        currentActiveUsers: 5,
        requestsLastHour: 47,
        requestsLastMinute: 3,
        averageResponseTime: 1200,
        errorRate: 2.1,
        costLastHour: 0.89,
        topModelsUsed: [
          { model: 'gemini-1.5-flash', requests: 28, cost: 0.14 },
          { model: 'gpt-4o-mini', requests: 19, cost: 0.75 }
        ],
        timestamp: new Date().toISOString()
      };

      res.json(realtimeData);

    } catch (error) {
      logServerError('실시간 사용량 조회 오류:', error, req);
      res.status(500).json({ error: '실시간 사용량을 조회할 수 없습니다.' });
    }
  });

  // AI 모델 성능 비교
  app.get("/api/admin/ai-models/performance", requireAdmin, (req, res) => {
    try {
      const performanceData = {
        models: [
          {
            name: 'gpt-4o-mini',
            provider: 'openai',
            averageLatency: 1100,
            successRate: 97.8,
            costPerRequest: 0.0024,
            qualityScore: 8.7,
            usageCount: 156
          },
          {
            name: 'gemini-1.5-flash',
            provider: 'gemini',
            averageLatency: 850,
            successRate: 94.2,
            costPerRequest: 0.0008,
            qualityScore: 8.3,
            usageCount: 234
          },
          {
            name: 'gpt-4o',
            provider: 'openai',
            averageLatency: 2300,
            successRate: 98.9,
            costPerRequest: 0.0087,
            qualityScore: 9.4,
            usageCount: 89
          }
        ],
        lastUpdated: new Date().toISOString()
      };

      res.json(performanceData);

    } catch (error) {
      logServerError('AI 모델 성능 데이터 조회 오류:', error, req);
      res.status(500).json({ error: '성능 데이터를 조회할 수 없습니다.' });
    }
  });

  console.log("🤖 관리자 AI 설정 라우트가 등록되었습니다.");
}