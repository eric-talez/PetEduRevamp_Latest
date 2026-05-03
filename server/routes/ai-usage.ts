import type { Express } from "express";
import { aiUsageService } from "../services/ai-usage-service";
import { logServerError } from '../middleware/audit-logger';

export function registerAIUsageRoutes(app: Express) {
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

  // 사용자 권한 체크 미들웨어 (본인 또는 관리자)
  const requireUserAccess = (req: any, res: any, next: any) => {
    const userRole = req.session?.user?.role || req.header("X-User-Role");
    const requestedUserId = parseInt(req.params.userId);
    const currentUserId = req.session?.user?.id || parseInt(req.header("X-User-Id") || "0");
    
    if (userRole !== 'admin' && currentUserId !== requestedUserId) {
      return res.status(403).json({ 
        error: '권한이 없습니다.' 
      });
    }
    
    next();
  };

  // 전체 AI 사용량 통계 조회 (관리자용)
  app.get("/api/admin/ai-usage/stats", requireAdmin, async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      
      const stats = await aiUsageService.getGlobalUsage(
        startDate as string,
        endDate as string
      );

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      logServerError('AI 사용량 통계 조회 오류:', error, req);
      res.status(500).json({ 
        error: 'AI 사용량 통계를 조회할 수 없습니다.' 
      });
    }
  });

  // 특정 사용자 AI 사용량 조회
  app.get("/api/admin/ai-usage/user/:userId", requireUserAccess, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const { startDate, endDate } = req.query;
      
      if (isNaN(userId)) {
        return res.status(400).json({ error: '유효하지 않은 사용자 ID입니다.' });
      }

      const usage = await aiUsageService.getUserUsage(
        userId,
        startDate as string,
        endDate as string
      );

      const limits = await aiUsageService.checkUsageLimits(userId);

      res.json({
        success: true,
        data: {
          usage,
          limits: limits.limits,
          currentUsage: {
            daily: limits.dailyUsage,
            monthly: limits.monthlyUsage
          },
          canMakeRequest: limits.canMakeRequest
        }
      });
    } catch (error) {
      logServerError('사용자 AI 사용량 조회 오류:', error, req);
      res.status(500).json({ 
        error: 'AI 사용량을 조회할 수 없습니다.' 
      });
    }
  });

  // 사용자별 사용량 제한 확인
  app.get("/api/ai-usage/limits/check/:userId", requireUserAccess, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      if (isNaN(userId)) {
        return res.status(400).json({ error: '유효하지 않은 사용자 ID입니다.' });
      }

      const limitCheck = await aiUsageService.checkUsageLimits(userId);

      res.json({
        success: true,
        data: limitCheck
      });
    } catch (error) {
      logServerError('사용량 제한 확인 오류:', error, req);
      res.status(500).json({ 
        error: '사용량 제한을 확인할 수 없습니다.' 
      });
    }
  });

  // AI 사용량 수동 로깅 (테스트/관리자용)
  app.post("/api/admin/ai-usage/log", requireAdmin, async (req, res) => {
    try {
      const {
        userId,
        provider,
        model,
        requestType,
        inputTokens,
        outputTokens,
        cost,
        requestData,
        responseStatus,
        responseTime
      } = req.body;

      if (!provider || !model || !requestType) {
        return res.status(400).json({ 
          error: 'provider, model, requestType은 필수입니다.' 
        });
      }

      await aiUsageService.logUsage({
        userId,
        provider,
        model,
        requestType,
        inputTokens,
        outputTokens,
        cost,
        requestData,
        responseStatus,
        responseTime
      });

      res.json({
        success: true,
        message: 'AI 사용량이 기록되었습니다.'
      });
    } catch (error) {
      logServerError('AI 사용량 로깅 오류:', error, req);
      res.status(500).json({ 
        error: 'AI 사용량을 기록할 수 없습니다.' 
      });
    }
  });

  // AI 사용량 요약 보고서 (관리자용)
  app.get("/api/admin/ai-usage/report", requireAdmin, async (req, res) => {
    try {
      const { period = '7d' } = req.query;
      
      let startDate: string;
      const endDate = new Date().toISOString().split('T')[0];
      
      switch (period) {
        case '1d':
          startDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          break;
        case '7d':
          startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          break;
        case '30d':
          startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          break;
        case '90d':
          startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          break;
        default:
          startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      }

      const stats = await aiUsageService.getGlobalUsage(startDate, endDate);

      const report = {
        period: {
          start: startDate,
          end: endDate,
          days: Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (24 * 60 * 60 * 1000))
        },
        summary: {
          totalRequests: stats.totalRequests,
          totalCost: Number(stats.totalCost.toFixed(2)),
          totalTokens: stats.totalTokens,
          avgCostPerRequest: stats.totalRequests > 0 ? Number((stats.totalCost / stats.totalRequests).toFixed(4)) : 0,
          avgResponseTime: Math.round(stats.avgResponseTime),
          errorRate: Number(stats.errorRate.toFixed(2))
        },
        byProvider: stats.byProvider,
        topUsers: stats.topUsers.slice(0, 5),
        insights: this.generateInsights(stats)
      };

      res.json({
        success: true,
        data: report
      });
    } catch (error) {
      logServerError('AI 사용량 보고서 생성 오류:', error, req);
      res.status(500).json({ 
        error: 'AI 사용량 보고서를 생성할 수 없습니다.' 
      });
    }
  });

  // 비용 최적화 제안 (관리자용)
  app.get("/api/admin/ai-usage/optimization", requireAdmin, async (req, res) => {
    try {
      const stats = await aiUsageService.getGlobalUsage();
      
      const suggestions = [];

      // 비용 최적화 제안 로직
      Object.entries(stats.byProvider).forEach(([provider, data]) => {
        const avgCostPerRequest = data.requests > 0 ? data.cost / data.requests : 0;
        
        if (avgCostPerRequest > 0.05) {
          suggestions.push({
            type: 'cost_optimization',
            provider,
            message: `${provider}의 요청당 평균 비용이 높습니다 ($${avgCostPerRequest.toFixed(4)}). 더 저렴한 모델 사용을 고려해보세요.`,
            priority: 'high'
          });
        }

        if (data.errors / data.requests > 0.1) {
          suggestions.push({
            type: 'reliability_improvement',
            provider,
            message: `${provider}의 오류율이 높습니다 (${((data.errors / data.requests) * 100).toFixed(1)}%). 백업 모델 설정을 확인해보세요.`,
            priority: 'high'
          });
        }
      });

      if (stats.totalCost > 100) {
        suggestions.push({
          type: 'budget_alert',
          message: `월간 AI 비용이 $100를 초과했습니다 ($${stats.totalCost.toFixed(2)}). 사용량 제한을 고려해보세요.`,
          priority: 'medium'
        });
      }

      res.json({
        success: true,
        data: {
          suggestions,
          currentStats: {
            totalCost: stats.totalCost,
            totalRequests: stats.totalRequests,
            errorRate: stats.errorRate
          }
        }
      });
    } catch (error) {
      logServerError('AI 최적화 제안 생성 오류:', error, req);
      res.status(500).json({ 
        error: 'AI 최적화 제안을 생성할 수 없습니다.' 
      });
    }
  });

  // 인사이트 생성 함수
  function generateInsights(stats: any): string[] {
    const insights = [];

    if (stats.totalRequests === 0) {
      insights.push("아직 AI 사용 기록이 없습니다.");
      return insights;
    }

    const avgCostPerRequest = stats.totalCost / stats.totalRequests;
    if (avgCostPerRequest > 0.1) {
      insights.push("요청당 평균 비용이 높습니다. 모델 최적화를 고려해보세요.");
    }

    if (stats.errorRate > 5) {
      insights.push("오류율이 높습니다. API 상태와 설정을 확인해보세요.");
    }

    if (stats.avgResponseTime > 3000) {
      insights.push("평균 응답 시간이 느립니다. 네트워크 상태를 확인해보세요.");
    }

    const providers = Object.keys(stats.byProvider);
    if (providers.length === 1) {
      insights.push("단일 AI 제공업체만 사용 중입니다. 다양한 모델을 활용해보세요.");
    }

    if (stats.topUsers.length > 0) {
      const topUser = stats.topUsers[0];
      const usagePercentage = (topUser.cost / stats.totalCost) * 100;
      if (usagePercentage > 50) {
        insights.push(`단일 사용자(${topUser.username})가 전체 비용의 ${usagePercentage.toFixed(1)}%를 차지합니다.`);
      }
    }

    return insights;
  }
}