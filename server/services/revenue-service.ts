import { storage } from '../storage';
import { logServerError } from '../middleware/audit-logger';

interface RevenueData {
  courseId: string;
  courseName: string;
  trainerId: string;
  trainerName: string;
  amount: number;
  commissionRate: number;
  trainerRevenue: number;
  platformRevenue: number;
  date: string;
  status: 'completed' | 'pending' | 'processing';
}

interface MonthlyRevenueSummary {
  month: string;
  totalRevenue: number;
  averageCommissionRate: number;
  netEarnings: number;
  transactionCount: number;
}

export class RevenueService {
  // 훈련사별 수익 내역 조회
  async getTrainerRevenue(trainerId: string, dateRange?: { start: string; end: string }): Promise<RevenueData[]> {
    try {
      const revenues = await storage.getRevenueByTrainer(trainerId, dateRange);
      return revenues;
    } catch (error) {
      logServerError('수익 내역 조회 오류:', error);
      throw new Error('수익 내역을 조회할 수 없습니다.');
    }
  }

  // 월별 수익 요약
  async getMonthlyRevenueSummary(trainerId: string): Promise<MonthlyRevenueSummary[]> {
    try {
      const summary = await storage.getMonthlyRevenueSummary(trainerId);
      return summary;
    } catch (error) {
      logServerError('월별 수익 요약 조회 오류:', error);
      throw new Error('월별 수익 요약을 조회할 수 없습니다.');
    }
  }

  // 전체 플랫폼 수익 통계 (관리자용)
  async getPlatformRevenueStats(): Promise<{
    totalRevenue: number;
    totalTrainerRevenue: number;
    totalPlatformRevenue: number;
    totalCourses: number;
    averageCommissionRate: number;
  }> {
    try {
      const stats = await storage.getPlatformRevenueStats();
      return stats;
    } catch (error) {
      logServerError('플랫폼 수익 통계 조회 오류:', error);
      throw new Error('플랫폼 수익 통계를 조회할 수 없습니다.');
    }
  }

  // 수익 정산 처리
  async processRevenueSettlement(trainerId: string, month: string): Promise<void> {
    try {
      await storage.processRevenueSettlement(trainerId, month);
    } catch (error) {
      logServerError('수익 정산 처리 오류:', error);
      throw new Error('수익 정산을 처리할 수 없습니다.');
    }
  }

  // 커리큘럼별 수익 분석
  async getCurriculumRevenueAnalysis(curriculumId: string): Promise<{
    totalRevenue: number;
    enrollmentCount: number;
    averageRevenuePerStudent: number;
    growthRate: number;
    lastMonthRevenue: number;
  }> {
    try {
      const analysis = await storage.getCurriculumRevenueAnalysis(curriculumId);
      return analysis;
    } catch (error) {
      logServerError('커리큘럼 수익 분석 오류:', error);
      throw new Error('커리큘럼 수익 분석을 조회할 수 없습니다.');
    }
  }
}

export const revenueService = new RevenueService();