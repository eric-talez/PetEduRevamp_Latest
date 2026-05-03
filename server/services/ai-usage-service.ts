import { aiUsageLog, aiDailySummary, aiUsageLimits, users } from "../../shared/schema";
import { db } from "../db";
import { eq, gte, lte, and, desc, sql } from "drizzle-orm";
import { logServerError } from '../middleware/audit-logger';

interface UsageTrackingData {
  userId?: number;
  provider: string; // openai, anthropic, gemini, perplexity
  model: string;
  requestType: string; // chat, analysis, training, health
  inputTokens?: number;
  outputTokens?: number;
  cost?: number;
  requestData?: any;
  responseStatus?: string;
  responseTime?: number;
}

interface UsageStats {
  totalRequests: number;
  totalCost: number;
  totalTokens: number;
  avgResponseTime: number;
  errorRate: number;
  byProvider: Record<string, {
    requests: number;
    cost: number;
    tokens: number;
    errors: number;
  }>;
}

interface UserUsageLimit {
  dailyRequestLimit: number;
  dailyCostLimit: number;
  monthlyRequestLimit: number;
  monthlyCostLimit: number;
}

class AIUsageService {
  // AI 사용량 기록
  async logUsage(data: UsageTrackingData): Promise<void> {
    try {
      const totalTokens = (data.inputTokens || 0) + (data.outputTokens || 0);
      
      await db.insert(aiUsageLog).values({
        userId: data.userId,
        provider: data.provider,
        model: data.model,
        requestType: data.requestType,
        inputTokens: data.inputTokens || 0,
        outputTokens: data.outputTokens || 0,
        totalTokens,
        cost: data.cost?.toString() || "0",
        requestData: data.requestData,
        responseStatus: data.responseStatus || "success",
        responseTime: data.responseTime,
      });

      // 일일 집계 업데이트
      await this.updateDailySummary(data, totalTokens);
      
      console.log(`[AI Usage] ${data.provider} ${data.model} - ${data.requestType} logged`);
    } catch (error) {
      logServerError('AI 사용량 로깅 오류:', error);
    }
  }

  // 일일 집계 업데이트
  private async updateDailySummary(data: UsageTrackingData, totalTokens: number): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    
    try {
      // 기존 집계 조회
      const [existingSummary] = await db.select()
        .from(aiDailySummary)
        .where(and(
          eq(aiDailySummary.date, today),
          eq(aiDailySummary.userId, data.userId || 0),
          eq(aiDailySummary.provider, data.provider)
        ));

      if (existingSummary) {
        // 기존 집계 업데이트
        await db.update(aiDailySummary)
          .set({
            totalRequests: existingSummary.totalRequests + 1,
            totalTokens: existingSummary.totalTokens + totalTokens,
            totalCost: (parseFloat(existingSummary.totalCost) + (data.cost || 0)).toString(),
            errorCount: data.responseStatus === 'error' ? existingSummary.errorCount + 1 : existingSummary.errorCount,
            updatedAt: new Date(),
          })
          .where(eq(aiDailySummary.id, existingSummary.id));
      } else {
        // 새 집계 생성
        await db.insert(aiDailySummary).values({
          date: today,
          userId: data.userId,
          provider: data.provider,
          totalRequests: 1,
          totalTokens,
          totalCost: data.cost?.toString() || "0",
          errorCount: data.responseStatus === 'error' ? 1 : 0,
        });
      }
    } catch (error) {
      logServerError('일일 집계 업데이트 오류:', error);
    }
  }

  // 사용자별 사용량 조회
  async getUserUsage(userId: number, startDate?: string, endDate?: string): Promise<UsageStats> {
    try {
      const whereCondition = [eq(aiUsageLog.userId, userId)];
      
      if (startDate) {
        whereCondition.push(gte(aiUsageLog.createdAt, new Date(startDate)));
      }
      if (endDate) {
        whereCondition.push(lte(aiUsageLog.createdAt, new Date(endDate)));
      }

      const logs = await db.select()
        .from(aiUsageLog)
        .where(and(...whereCondition))
        .orderBy(desc(aiUsageLog.createdAt));

      return this.calculateStats(logs);
    } catch (error) {
      logServerError('사용자 사용량 조회 오류:', error);
      return this.getEmptyStats();
    }
  }

  // 전체 사용량 통계 조회 (관리자용)
  async getGlobalUsage(startDate?: string, endDate?: string): Promise<UsageStats & {
    topUsers: Array<{
      userId: number;
      username: string;
      requests: number;
      cost: number;
      tokens: number;
    }>;
  }> {
    try {
      const whereCondition: any[] = [];
      
      if (startDate) {
        whereCondition.push(gte(aiUsageLog.createdAt, new Date(startDate)));
      }
      if (endDate) {
        whereCondition.push(lte(aiUsageLog.createdAt, new Date(endDate)));
      }

      const logs = await db.select()
        .from(aiUsageLog)
        .where(whereCondition.length > 0 ? and(...whereCondition) : undefined)
        .orderBy(desc(aiUsageLog.createdAt));

      const stats = this.calculateStats(logs);

      // 사용량 상위 사용자 조회
      const topUsers = await db.select({
        userId: aiUsageLog.userId,
        username: users.username,
        requests: sql<number>`count(*)`,
        cost: sql<number>`sum(cast(${aiUsageLog.cost} as decimal))`,
        tokens: sql<number>`sum(${aiUsageLog.totalTokens})`,
      })
      .from(aiUsageLog)
      .leftJoin(users, eq(aiUsageLog.userId, users.id))
      .where(whereCondition.length > 0 ? and(...whereCondition) : undefined)
      .groupBy(aiUsageLog.userId, users.username)
      .orderBy(sql`sum(cast(${aiUsageLog.cost} as decimal)) desc`)
      .limit(10);

      return {
        ...stats,
        topUsers: topUsers.map(user => ({
          userId: user.userId || 0,
          username: user.username || 'Unknown',
          requests: Number(user.requests),
          cost: Number(user.cost),
          tokens: Number(user.tokens),
        }))
      };
    } catch (error) {
      logServerError('전체 사용량 조회 오류:', error);
      return {
        ...this.getEmptyStats(),
        topUsers: []
      };
    }
  }

  // 사용자별 제한 설정 조회
  async getUserLimits(userId: number): Promise<UserUsageLimit | null> {
    try {
      const [limits] = await db.select()
        .from(aiUsageLimits)
        .where(eq(aiUsageLimits.userId, userId))
        .limit(1);

      if (limits) {
        return {
          dailyRequestLimit: limits.dailyRequestLimit,
          dailyCostLimit: parseFloat(limits.dailyCostLimit),
          monthlyRequestLimit: limits.monthlyRequestLimit,
          monthlyCostLimit: parseFloat(limits.monthlyCostLimit),
        };
      }

      return null;
    } catch (error) {
      logServerError('사용자 제한 조회 오류:', error);
      return null;
    }
  }

  // 사용량 제한 확인
  async checkUsageLimits(userId: number): Promise<{
    canMakeRequest: boolean;
    dailyUsage: { requests: number; cost: number };
    monthlyUsage: { requests: number; cost: number };
    limits: UserUsageLimit | null;
  }> {
    try {
      const limits = await this.getUserLimits(userId);
      const today = new Date().toISOString().split('T')[0];
      const monthStart = new Date().toISOString().slice(0, 7) + '-01';

      // 일일 사용량
      const dailyUsage = await this.getUserUsage(userId, today, today);
      
      // 월간 사용량
      const monthlyUsage = await this.getUserUsage(userId, monthStart);

      const canMakeRequest = limits ? (
        dailyUsage.totalRequests < limits.dailyRequestLimit &&
        dailyUsage.totalCost < limits.dailyCostLimit &&
        monthlyUsage.totalRequests < limits.monthlyRequestLimit &&
        monthlyUsage.totalCost < limits.monthlyCostLimit
      ) : true;

      return {
        canMakeRequest,
        dailyUsage: {
          requests: dailyUsage.totalRequests,
          cost: dailyUsage.totalCost
        },
        monthlyUsage: {
          requests: monthlyUsage.totalRequests,
          cost: monthlyUsage.totalCost
        },
        limits
      };
    } catch (error) {
      logServerError('사용량 제한 확인 오류:', error);
      return {
        canMakeRequest: true,
        dailyUsage: { requests: 0, cost: 0 },
        monthlyUsage: { requests: 0, cost: 0 },
        limits: null
      };
    }
  }

  // 비용 계산
  calculateCost(provider: string, model: string, usage: any): number {
    // OpenAI 요금표 (예시)
    const pricingTable: Record<string, Record<string, { input: number; output: number }>> = {
      openai: {
        'gpt-4o': { input: 0.03, output: 0.06 }, // per 1K tokens
        'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
        'gpt-4': { input: 0.03, output: 0.06 },
        'gpt-3.5-turbo': { input: 0.001, output: 0.002 },
      },
      anthropic: {
        'claude-3-5-sonnet': { input: 0.003, output: 0.015 },
        'claude-3-haiku': { input: 0.00025, output: 0.00125 },
      },
      gemini: {
        'gemini-1.5-pro': { input: 0.00125, output: 0.005 },
        'gemini-1.5-flash': { input: 0.000075, output: 0.0003 },
      }
    };

    const pricing = pricingTable[provider]?.[model];
    if (!pricing || !usage) return 0;

    const inputCost = (usage.prompt_tokens || usage.input_tokens || 0) * pricing.input / 1000;
    const outputCost = (usage.completion_tokens || usage.output_tokens || 0) * pricing.output / 1000;
    
    return inputCost + outputCost;
  }

  // 통계 계산
  private calculateStats(logs: any[]): UsageStats {
    const stats: UsageStats = {
      totalRequests: logs.length,
      totalCost: 0,
      totalTokens: 0,
      avgResponseTime: 0,
      errorRate: 0,
      byProvider: {}
    };

    let totalResponseTime = 0;
    let errorCount = 0;

    logs.forEach(log => {
      const cost = parseFloat(log.cost) || 0;
      stats.totalCost += cost;
      stats.totalTokens += log.totalTokens || 0;
      
      if (log.responseTime) {
        totalResponseTime += log.responseTime;
      }
      
      if (log.responseStatus === 'error') {
        errorCount++;
      }

      // Provider별 통계
      if (!stats.byProvider[log.provider]) {
        stats.byProvider[log.provider] = {
          requests: 0,
          cost: 0,
          tokens: 0,
          errors: 0
        };
      }
      
      stats.byProvider[log.provider].requests++;
      stats.byProvider[log.provider].cost += cost;
      stats.byProvider[log.provider].tokens += log.totalTokens || 0;
      if (log.responseStatus === 'error') {
        stats.byProvider[log.provider].errors++;
      }
    });

    stats.avgResponseTime = logs.length > 0 ? totalResponseTime / logs.length : 0;
    stats.errorRate = logs.length > 0 ? (errorCount / logs.length) * 100 : 0;

    return stats;
  }

  private getEmptyStats(): UsageStats {
    return {
      totalRequests: 0,
      totalCost: 0,
      totalTokens: 0,
      avgResponseTime: 0,
      errorRate: 0,
      byProvider: {}
    };
  }
}

export const aiUsageService = new AIUsageService();