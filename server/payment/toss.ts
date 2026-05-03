/**
 * 토스페이먼츠 API 통합
 * 
 * 공식 문서: https://docs.tosspayments.com/
 */

import axios from 'axios';
import { logServerError } from '../middleware/audit-logger';

const TOSS_API_BASE_URL = 'https://api.tosspayments.com/v1';

// 환경 변수에서 키 가져오기 (필수)
export const getTossKeys = () => {
  const secretKey = process.env.TOSS_SECRET_KEY;
  const clientKey = process.env.TOSS_CLIENT_KEY;

  if (!secretKey) {
    throw new Error(
      'TOSS_SECRET_KEY 환경 변수가 설정되지 않았습니다. ' +
      'DEPLOYMENT.md를 참고하여 토스페이먼츠 API 키를 설정하세요.'
    );
  }

  if (!clientKey) {
    console.warn('TOSS_CLIENT_KEY가 설정되지 않았습니다. 프론트엔드에는 VITE_TOSS_CLIENT_KEY를 사용하세요.');
  }

  return {
    clientKey,
    secretKey
  };
};

// Base64 인코딩 (토스페이먼츠 인증 헤더용)
export const encodeAuthHeader = (secretKey: string): string => {
  // 중요: SECRET_KEY 뒤에 콜론(:) 필수!
  return Buffer.from(`${secretKey}:`).toString('base64');
};

// 토스페이먼츠 결제 승인
export interface TossPaymentConfirmRequest {
  paymentKey: string;
  orderId: string;
  amount: number;
}

export interface TossPaymentConfirmResponse {
  paymentKey: string;
  orderId: string;
  orderName: string;
  status: string;
  requestedAt: string;
  approvedAt?: string;
  method: string;
  totalAmount: number;
  balanceAmount: number;
  suppliedAmount: number;
  vat: number;
  card?: {
    company: string;
    number: string;
    installmentPlanMonths: number;
    isInterestFree: boolean;
    approveNo: string;
    cardType: string;
    ownerType: string;
    acquirerCode: string;
  };
  virtualAccount?: {
    accountNumber: string;
    bankCode: string;
    customerName: string;
    dueDate: string;
    refundStatus: string;
  };
  transfer?: {
    bankCode: string;
    settlementStatus: string;
  };
  receipt?: {
    url: string;
  };
  checkout?: {
    url: string;
  };
  currency: string;
  country: string;
}

export const confirmTossPayment = async (
  data: TossPaymentConfirmRequest
): Promise<TossPaymentConfirmResponse> => {
  const { secretKey } = getTossKeys();
  
  try {
    const response = await axios.post(
      `${TOSS_API_BASE_URL}/payments/confirm`,
      {
        paymentKey: data.paymentKey,
        orderId: data.orderId,
        amount: data.amount
      },
      {
        headers: {
          'Authorization': `Basic ${encodeAuthHeader(secretKey)}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    return response.data;
  } catch (error: any) {
    logServerError('토스페이먼츠 결제 승인 오류:', error.response?.data || error.message);
    throw error;
  }
};

// 토스페이먼츠 결제 조회
export const getTossPayment = async (paymentKey: string): Promise<TossPaymentConfirmResponse> => {
  const { secretKey } = getTossKeys();
  
  try {
    const response = await axios.get(
      `${TOSS_API_BASE_URL}/payments/${paymentKey}`,
      {
        headers: {
          'Authorization': `Basic ${encodeAuthHeader(secretKey)}`
        }
      }
    );
    
    return response.data;
  } catch (error: any) {
    logServerError('토스페이먼츠 결제 조회 오류:', error.response?.data || error.message);
    throw error;
  }
};

// 토스페이먼츠 결제 취소
export interface TossCancelRequest {
  paymentKey: string;
  cancelReason: string;
  cancelAmount?: number; // 부분 취소 시 금액
}

export const cancelTossPayment = async (data: TossCancelRequest): Promise<any> => {
  const { secretKey } = getTossKeys();
  
  try {
    const response = await axios.post(
      `${TOSS_API_BASE_URL}/payments/${data.paymentKey}/cancel`,
      {
        cancelReason: data.cancelReason,
        ...(data.cancelAmount && { cancelAmount: data.cancelAmount })
      },
      {
        headers: {
          'Authorization': `Basic ${encodeAuthHeader(secretKey)}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    return response.data;
  } catch (error: any) {
    logServerError('토스페이먼츠 결제 취소 오류:', error.response?.data || error.message);
    throw error;
  }
};

// 주문 ID 생성 헬퍼 함수
export const generateOrderId = (prefix: string = 'ORDER'): string => {
  const timestamp = new Date().getTime();
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}_${timestamp}_${random}`;
};
