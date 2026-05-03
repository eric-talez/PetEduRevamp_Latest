import type { Express, Request, Response, NextFunction } from "express";
import { aiProxyService, AIProxyService } from "../ai/ai-proxy";
import { logServerError } from '../middleware/audit-logger';

// 커스텀 Request 타입 정의
interface AuthenticatedRequest extends Request {
  userId?: string;
}

export function registerAIProxyRoutes(app: Express) {
  // 레이트 리밋 적용
  const rateLimiter = AIProxyService.createRateLimit();
  app.use("/api/ai-proxy", rateLimiter);

  // 유저 인증 미들웨어
  const authenticateUser = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const userId = req.session?.user?.id || req.header("X-User-Id") || "anonymous";
    req.userId = String(userId);
    next();
  };

  app.use("/api/ai-proxy", authenticateUser);

  // 할당량 체크 미들웨어
  const checkQuota = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const quotaCheck = await aiProxyService.checkUserQuota(req.userId!);
      
      if (!quotaCheck.allowed) {
        return res.status(429).json({
          error: quotaCheck.reason,
          usageStats: aiProxyService.getUserUsageStats(req.userId!)
        });
      }
      
      next();
    } catch (error) {
      logServerError('할당량 체크 오류:', error, req);
      next();
    }
  };

  // OpenAI 프록시 엔드포인트
  app.post("/api/ai-proxy/openai/chat", checkQuota, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { messages, model, maxTokens, temperature } = req.body;

      if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: "메시지가 필요합니다." });
      }

      const response = await aiProxyService.callOpenAI(messages, {
        model,
        maxTokens,
        temperature,
        userId: req.userId!
      });

      res.json({
        response: response.choices[0]?.message?.content,
        usage: response.usage,
        model: response.model,
        usageStats: aiProxyService.getUserUsageStats(req.userId!)
      });

    } catch (error: any) {
      logServerError("OpenAI 프록시 오류:", error, req);
      
      // 구체적인 오류 처리
      if (error.code === 'invalid_api_key') {
        return res.status(401).json({ 
          error: "API 키 오류가 발생했습니다. 관리자에게 문의하세요.",
          code: 'API_KEY_ERROR'
        });
      }
      
      if (error.code === 'insufficient_quota') {
        return res.status(429).json({ 
          error: "서비스 할당량이 초과되었습니다. 잠시 후 다시 시도하세요.",
          code: 'QUOTA_EXCEEDED'
        });
      }

      res.status(500).json({ 
        error: "AI 분석 중 오류가 발생했습니다.",
        code: 'INTERNAL_ERROR'
      });
    }
  });

  // Gemini 프록시 엔드포인트
  app.post("/api/ai-proxy/gemini/generate", checkQuota, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { prompt, model, systemInstruction } = req.body;

      if (!prompt) {
        return res.status(400).json({ error: "프롬프트가 필요합니다." });
      }

      const response = await aiProxyService.callGemini(prompt, {
        model,
        userId: req.userId!,
        systemInstruction
      });

      res.json({
        response: response.text,
        usageStats: aiProxyService.getUserUsageStats(req.userId!)
      });

    } catch (error: any) {
      logServerError("Gemini 프록시 오류:", error, req);
      res.status(500).json({ 
        error: "AI 분석 중 오류가 발생했습니다.",
        code: 'INTERNAL_ERROR'
      });
    }
  });

  // 다중 엔진 분석 엔드포인트 (4-engine AI system)
  app.post("/api/ai-proxy/analyze", checkQuota, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { 
        prompt, 
        analysisType = 'general',
        input, // 호환성을 위해 input도 지원
        priority = 'cost' 
      } = req.body;

      const analysisInput = prompt || input;
      if (!analysisInput) {
        return res.status(400).json({ error: "분석할 내용이 필요합니다." });
      }

      // 입력 검증
      const validTypes = ['behavior', 'health', 'training', 'news', 'research', 'general'];
      if (!validTypes.includes(analysisType)) {
        return res.status(400).json({ 
          error: "올바른 분석 타입을 선택하세요.",
          validTypes
        });
      }

      console.log(`🔍 다중 AI 엔진 분석 요청 - 타입: ${analysisType}, 사용자: ${req.userId}`);

      // 다중 엔진 분석 실행
      const result = await aiProxyService.analyzeWithMultipleEngines(analysisInput, analysisType);

      // 사용량 로깅 (간단한 콘솔 로그)
      console.log(`📊 [Usage] User: ${req.userId}, Engines: ${result.engines?.join(', ')}, Type: ${analysisType}, Length: ${analysisInput.length}`);

      res.json({
        success: true,
        result,
        usageStats: aiProxyService.getUserUsageStats(req.userId!),
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      logServerError("다중 엔진 분석 오류:", error, req);
      res.status(500).json({ 
        error: error.message || "AI 분석 중 오류가 발생했습니다.",
        code: 'MULTI_ENGINE_ERROR'
      });
    }
  });

  // 서비스 상태 확인
  app.get("/api/ai-proxy/status", async (req, res) => {
    try {
      const status = await aiProxyService.getServiceStatus();
      
      res.json({
        status: 'operational',
        services: status,
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
      });

    } catch (error) {
      logServerError("서비스 상태 확인 오류:", error, req);
      res.status(500).json({ 
        status: 'error',
        error: '서비스 상태를 확인할 수 없습니다.'
      });
    }
  });

  // 사용량 통계 조회
  app.get("/api/ai-proxy/usage", authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const stats = aiProxyService.getUserUsageStats(req.userId!);
      
      res.json({
        userId: req.userId,
        stats,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logServerError("사용량 조회 오류:", error, req);
      res.status(500).json({ 
        error: "사용량 정보를 조회할 수 없습니다."
      });
    }
  });

  // 헬스 체크
  app.get("/api/ai-proxy/health", (req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: '1.0.0'
    });
  });

  console.log("🚀 AI 프록시 라우트가 등록되었습니다.");
}