/**
 * API 헬퍼 유틸리티 함수들
 * 반복적인 API 로직을 단순화하는 헬퍼 함수들
 */
import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import { 
  ApiErrorCode, 
  parsePaginationQuery, 
  calculatePaginationOffset,
  validateBody,
  validateQuery
} from '../middleware/api-standards';
import { logServerError } from '../middleware/audit-logger';

// =============================================================================
// 권한 체크 헬퍼
// =============================================================================

/**
 * 사용자 소유권 확인
 */
export function checkOwnership(userId: number, ownerId: number, resourceName: string = '리소스') {
  if (userId !== ownerId) {
    throw new Error(`${resourceName}에 대한 접근 권한이 없습니다.`);
  }
}

/**
 * 관리자 권한 확인
 */
export function checkAdminRole(userRole: string) {
  if (userRole !== 'admin') {
    throw new Error('관리자 권한이 필요합니다.');
  }
}

/**
 * 훈련사 권한 확인
 */
export function checkTrainerRole(userRole: string) {
  if (userRole !== 'trainer' && userRole !== 'admin') {
    throw new Error('훈련사 권한이 필요합니다.');
  }
}

// =============================================================================
// 페이지네이션 헬퍼
// =============================================================================

/**
 * 표준 페이지네이션 응답 생성
 */
export function createPaginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
  message?: string
) {
  return {
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    hasNext: page * limit < total,
    hasPrev: page > 1,
    message: message || '데이터를 성공적으로 조회했습니다.'
  };
}

/**
 * 쿼리에서 페이지네이션 파라미터 추출
 */
export function extractPaginationFromQuery(query: any) {
  return parsePaginationQuery(query);
}

// =============================================================================
// 데이터 변환 헬퍼
// =============================================================================

/**
 * null/undefined 값 필터링
 */
export function filterNullValues<T extends object>(obj: T): Partial<T> {
  const filtered: Partial<T> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (value !== null && value !== undefined) {
      (filtered as any)[key] = value;
    }
  }
  
  return filtered;
}

/**
 * 중첩된 객체에서 특정 필드만 선택
 */
export function selectFields<T, K extends keyof T>(obj: T, fields: K[]): Pick<T, K> {
  const selected: Partial<T> = {};
  
  fields.forEach(field => {
    if (field in obj) {
      selected[field] = obj[field];
    }
  });
  
  return selected as Pick<T, K>;
}

// =============================================================================
// 비동기 에러 처리 헬퍼
// =============================================================================

/**
 * 향상된 asyncHandler - 더 나은 타입 지원
 */
export function asyncHandler<T extends any[], R>(
  fn: (...args: [...T, Request, Response, NextFunction]) => Promise<R>
) {
  return (...args: [...T, Request, Response, NextFunction]) => {
    const req = args[args.length - 3] as Request;
    const res = args[args.length - 2] as Response;
    const next = args[args.length - 1] as NextFunction;
    
    Promise.resolve(fn(...args)).catch(next);
  };
}

/**
 * try-catch를 자동으로 처리하는 서비스 함수 래퍼
 */
export function serviceWrapper<T extends any[], R>(
  serviceFn: (...args: T) => Promise<R>,
  errorMessage: string = '서비스 처리 중 오류가 발생했습니다.'
) {
  return async (...args: T): Promise<R> => {
    try {
      return await serviceFn(...args);
    } catch (error) {
      logServerError(`Service Error: ${errorMessage}`, error);
      throw new Error(errorMessage);
    }
  };
}

// =============================================================================
// 검증 헬퍼
// =============================================================================

/**
 * 복합 검증 헬퍼 (body + query + params)
 */
export function validateRequest(schemas: {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}) {
  return [
    ...(schemas.body ? [validateBody(schemas.body)] : []),
    ...(schemas.query ? [validateQuery(schemas.query)] : []),
    // params 검증은 필요시 추가
  ];
}

// =============================================================================
// 캐싱 헬퍼
// =============================================================================

const cache = new Map<string, { data: any; timestamp: number; ttl: number }>();

/**
 * 메모리 캐시 (개발용, 프로덕션에서는 Redis 등 사용 권장)
 */
export function memoryCache<T>(
  key: string,
  ttlSeconds: number = 300 // 5분 기본값
) {
  return {
    get(): T | null {
      const cached = cache.get(key);
      if (!cached) return null;
      
      if (Date.now() - cached.timestamp > cached.ttl * 1000) {
        cache.delete(key);
        return null;
      }
      
      return cached.data;
    },
    
    set(data: T): void {
      cache.set(key, {
        data,
        timestamp: Date.now(),
        ttl: ttlSeconds
      });
    },
    
    delete(): void {
      cache.delete(key);
    }
  };
}

// =============================================================================
// 응답 데이터 정리 헬퍼
// =============================================================================

/**
 * 사용자 정보에서 민감한 데이터 제거
 */
export function sanitizeUser(user: any) {
  const { password, ...sanitized } = user;
  return sanitized;
}

/**
 * 배열의 각 항목에서 민감한 데이터 제거
 */
export function sanitizeUsers(users: any[]) {
  return users.map(sanitizeUser);
}

/**
 * 반려동물 정보 정리
 */
export function sanitizePet(pet: any) {
  return {
    id: pet.id,
    name: pet.name,
    species: pet.species,
    breed: pet.breed,
    age: pet.age,
    gender: pet.gender,
    imageUrl: pet.imageUrl,
    trainingStatus: pet.trainingStatus,
    assignedTrainerName: pet.assignedTrainerName,
    notebookEnabled: pet.notebookEnabled,
    createdAt: pet.createdAt,
    updatedAt: pet.updatedAt
  };
}

// =============================================================================
// 로깅 헬퍼
// =============================================================================

/**
 * 구조화된 API 로그
 */
export function logApiRequest(req: Request, message: string, data?: any) {
  console.log(`[API] ${req.method} ${req.path}`, {
    message,
    userId: (req as any).user?.id,
    sessionId: req.sessionID,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    ...data
  });
}

/**
 * 에러 로그 with context
 */
export function logApiError(req: Request, error: Error, context?: string) {
  logServerError(`[API Error] ${req.method} ${req.path}`, {
    message: error.message,
    stack: error.stack,
    context,
    userId: (req as any).user?.id,
    sessionId: req.sessionID,
    body: req.body,
    query: req.query,
    params: req.params
  }, req);
}