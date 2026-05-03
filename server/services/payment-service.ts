import { IStorage } from '../storage';
import { 
  Transaction, 
  Settlement, 
  FeePolicy, 
  InsertTransaction, 
  InsertSettlement,
  InsertSettlementItem 
} from '../../shared/payment-schema';
import { logServerError } from '../middleware/audit-logger';

export interface PaymentProcessingResult {
  success: boolean;
  transactionId?: number;
  errorMessage?: string;
  feeAmount: number;
  netAmount: number;
}

export interface SettlementGenerationResult {
  success: boolean;
  settlementId?: number;
  errorMessage?: string;
  totalAmount: number;
  feeAmount: number;
  itemCount: number;
}

export class PaymentService {
  constructor(private storage: IStorage) {}

  /**
   * 수수료 계산
   */
  async calculateFee(
    amount: number, 
    targetType: 'trainer' | 'institute', 
    targetId?: number
  ): Promise<{ feeAmount: number; netAmount: number; feeRate: number }> {
    try {
      // 적용 가능한 수수료 정책 조회 (특정 대상 > 타입별 > 전체 순서)
      const policies = await this.getFeePoliciessForTarget(targetType, targetId);
      
      if (!policies.length) {
        // 기본 수수료 정책 (10%)
        const defaultFeeRate = 10.0;
        const feeAmount = Math.round(amount * (defaultFeeRate / 100));
        return {
          feeAmount,
          netAmount: amount - feeAmount,
          feeRate: defaultFeeRate
        };
      }

      const policy = policies[0]; // 가장 우선순위가 높은 정책 사용
      let feeAmount = 0;

      switch (policy.feeType) {
        case 'percentage':
          feeAmount = Math.round(amount * (parseFloat(policy.baseRate) / 100));
          break;
          
        case 'fixed':
          feeAmount = parseFloat(policy.baseRate);
          break;
          
        case 'tiered':
          feeAmount = this.calculateTieredFee(amount, policy.tierConfig as any);
          break;
          
        default:
          feeAmount = Math.round(amount * 0.1); // 기본 10%
      }

      // 최소/최대 수수료 적용
      if (policy.minAmount) {
        feeAmount = Math.max(feeAmount, parseFloat(policy.minAmount));
      }
      if (policy.maxAmount) {
        feeAmount = Math.min(feeAmount, parseFloat(policy.maxAmount));
      }

      return {
        feeAmount,
        netAmount: amount - feeAmount,
        feeRate: (feeAmount / amount) * 100
      };

    } catch (error) {
      logServerError('수수료 계산 오류:', error);
      // 오류 시 기본 수수료 적용
      const defaultFeeAmount = Math.round(amount * 0.1);
      return {
        feeAmount: defaultFeeAmount,
        netAmount: amount - defaultFeeAmount,
        feeRate: 10.0
      };
    }
  }

  /**
   * 차등 수수료 계산
   */
  private calculateTieredFee(amount: number, tierConfig: any): number {
    if (!tierConfig || !tierConfig.tiers) {
      return Math.round(amount * 0.1); // 기본 10%
    }

    const tiers = tierConfig.tiers.sort((a: any, b: any) => a.minAmount - b.minAmount);
    
    for (const tier of tiers) {
      if (amount >= tier.minAmount && (!tier.maxAmount || amount <= tier.maxAmount)) {
        return Math.round(amount * (tier.rate / 100));
      }
    }

    // 최고 등급 적용
    const highestTier = tiers[tiers.length - 1];
    return Math.round(amount * (highestTier.rate / 100));
  }

  /**
   * 결제 처리
   */
  async processPayment(paymentData: {
    transactionType: string;
    referenceId: number;
    referenceType: string;
    payerId: number;
    payeeId: number;
    grossAmount: number;
    paymentMethod?: string;
    paymentProvider?: string;
    externalTransactionId?: string;
    instituteId?: number;
    metadata?: any;
  }): Promise<PaymentProcessingResult> {
    try {
      // 수취인 정보 조회하여 타입 결정
      const payee = await this.storage.getUser(paymentData.payeeId);
      if (!payee) {
        return {
          success: false,
          errorMessage: '수취인을 찾을 수 없습니다.',
          feeAmount: 0,
          netAmount: 0
        };
      }

      const targetType = payee.role === 'trainer' ? 'trainer' : 'institute';
      
      // 수수료 계산
      const feeCalculation = await this.calculateFee(
        paymentData.grossAmount, 
        targetType, 
        paymentData.payeeId
      );

      // 적용된 수수료 정책 조회
      const policies = await this.getFeePoliciessForTarget(targetType, paymentData.payeeId);
      const feePolicyId = policies.length > 0 ? policies[0].id : null;

      // 거래 내역 생성
      const transactionData: InsertTransaction = {
        transactionType: paymentData.transactionType,
        referenceId: paymentData.referenceId,
        referenceType: paymentData.referenceType,
        payerId: paymentData.payerId,
        payeeId: paymentData.payeeId,
        grossAmount: paymentData.grossAmount.toString(),
        feeAmount: feeCalculation.feeAmount.toString(),
        netAmount: feeCalculation.netAmount.toString(),
        currency: 'KRW',
        paymentMethod: paymentData.paymentMethod,
        paymentProvider: paymentData.paymentProvider,
        externalTransactionId: paymentData.externalTransactionId,
        status: 'completed',
        feePolicyId,
        instituteId: paymentData.instituteId,
        metadata: paymentData.metadata,
        processedAt: new Date(),
      };

      const transactionId = await this.storage.createTransaction(transactionData);

      // 매출 통계 업데이트 (비동기)
      this.updateRevenueStats(targetType, paymentData.payeeId, paymentData.grossAmount, feeCalculation.feeAmount)
        .catch(error => logServerError('매출 통계 업데이트 오류:', error));

      return {
        success: true,
        transactionId,
        feeAmount: feeCalculation.feeAmount,
        netAmount: feeCalculation.netAmount
      };

    } catch (error) {
      logServerError('결제 처리 오류:', error);
      return {
        success: false,
        errorMessage: `결제 처리 중 오류가 발생했습니다: ${error}`,
        feeAmount: 0,
        netAmount: 0
      };
    }
  }

  /**
   * 정산 생성
   */
  async generateSettlement(
    targetType: 'trainer' | 'institute',
    targetId: number,
    periodStart: Date,
    periodEnd: Date
  ): Promise<SettlementGenerationResult> {
    try {
      // 대상 사용자/기관 정보 조회
      const target = await this.storage.getUser(targetId);
      if (!target) {
        return {
          success: false,
          errorMessage: '정산 대상을 찾을 수 없습니다.',
          totalAmount: 0,
          feeAmount: 0,
          itemCount: 0
        };
      }

      // 해당 기간의 거래 내역 조회
      const transactions = await this.storage.getTransactionsByPeriod(
        targetId, 
        periodStart, 
        periodEnd
      );

      if (!transactions.length) {
        return {
          success: false,
          errorMessage: '정산할 거래 내역이 없습니다.',
          totalAmount: 0,
          feeAmount: 0,
          itemCount: 0
        };
      }

      // 정산 금액 계산
      const totalGrossAmount = transactions.reduce((sum, t) => sum + parseFloat(t.grossAmount), 0);
      const totalFeeAmount = transactions.reduce((sum, t) => sum + parseFloat(t.feeAmount), 0);
      const totalNetAmount = transactions.reduce((sum, t) => sum + parseFloat(t.netAmount), 0);

      // 정산 내역 생성
      const settlementData: InsertSettlement = {
        settlementType: targetType,
        targetId,
        targetName: target.name || target.username,
        periodStart,
        periodEnd,
        totalGrossAmount: totalGrossAmount.toString(),
        totalFeeAmount: totalFeeAmount.toString(),
        totalNetAmount: totalNetAmount.toString(),
        transactionCount: transactions.length,
        status: 'pending',
        settlementDetails: {
          generatedAt: new Date().toISOString(),
          transactionIds: transactions.map(t => t.id)
        }
      };

      const settlementId = await this.storage.createSettlement(settlementData);

      // 정산 항목 생성
      for (const transaction of transactions) {
        const itemData: InsertSettlementItem = {
          settlementId,
          transactionId: transaction.id,
          itemName: `${transaction.referenceType} - ${transaction.referenceId}`,
          itemType: transaction.referenceType,
          quantity: 1,
          unitPrice: transaction.grossAmount,
          grossAmount: transaction.grossAmount,
          feeAmount: transaction.feeAmount,
          netAmount: transaction.netAmount,
          feeRate: ((parseFloat(transaction.feeAmount) / parseFloat(transaction.grossAmount)) * 100).toString()
        };

        await this.storage.createSettlementItem(itemData);
      }

      return {
        success: true,
        settlementId,
        totalAmount: totalNetAmount,
        feeAmount: totalFeeAmount,
        itemCount: transactions.length
      };

    } catch (error) {
      logServerError('정산 생성 오류:', error);
      return {
        success: false,
        errorMessage: `정산 생성 중 오류가 발생했습니다: ${error}`,
        totalAmount: 0,
        feeAmount: 0,
        itemCount: 0
      };
    }
  }

  /**
   * 정산 승인 및 지급 처리
   */
  async approveSettlement(settlementId: number, approvedBy: number): Promise<boolean> {
    try {
      await this.storage.updateSettlement(settlementId, {
        status: 'processing',
        approvedBy,
        processedAt: new Date()
      });

      // 실제 지급 처리 로직 (외부 결제 시스템 연동)
      // 여기서는 시뮬레이션으로 즉시 완료 처리
      setTimeout(async () => {
        try {
          await this.storage.updateSettlement(settlementId, {
            status: 'paid',
            paidAt: new Date()
          });
          console.log(`정산 ${settlementId} 지급 완료`);
        } catch (error) {
          logServerError(`정산 ${settlementId} 지급 실패:`, error);
        }
      }, 5000);

      return true;
    } catch (error) {
      logServerError('정산 승인 오류:', error);
      return false;
    }
  }

  /**
   * 수수료 정책 조회
   */
  private async getFeePoliciessForTarget(
    targetType: 'trainer' | 'institute', 
    targetId?: number
  ): Promise<FeePolicy[]> {
    try {
      return await this.storage.getFeePolicies(targetType, targetId);
    } catch (error) {
      logServerError('수수료 정책 조회 오류:', error);
      return [];
    }
  }

  /**
   * 매출 통계 업데이트
   */
  private async updateRevenueStats(
    targetType: 'trainer' | 'institute',
    targetId: number,
    revenue: number,
    fees: number
  ): Promise<void> {
    try {
      const today = new Date();
      const periodDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

      await this.storage.updateRevenueStats({
        targetType,
        targetId,
        statsPeriod: 'monthly',
        periodDate,
        totalRevenue: revenue,
        totalFees: fees,
        transactionCount: 1
      });
    } catch (error) {
      logServerError('매출 통계 업데이트 오류:', error);
    }
  }

  /**
   * 환불 처리
   */
  async processRefund(
    transactionId: number,
    refundAmount: number,
    reason: string,
    requestedBy: number
  ): Promise<boolean> {
    try {
      const transaction = await this.storage.getTransaction(transactionId);
      if (!transaction) {
        throw new Error('원본 거래를 찾을 수 없습니다.');
      }

      // 환불 수수료 계산 (일반적으로 원래 거래의 수수료 비율로 계산)
      const refundRatio = refundAmount / parseFloat(transaction.grossAmount);
      const refundFeeAmount = Math.round(parseFloat(transaction.feeAmount) * refundRatio);

      // 환불 내역 생성
      await this.storage.createRefund({
        originalTransactionId: transactionId,
        refundAmount: refundAmount.toString(),
        refundFeeAmount: refundFeeAmount.toString(),
        refundReason: reason,
        status: 'pending',
        requestedBy
      });

      return true;
    } catch (error) {
      logServerError('환불 처리 오류:', error);
      return false;
    }
  }
}