/**
 * API 표준화 미들웨어 및 유틸리티
 * 프로젝트 전체에서 일관된 API 응답 형식과 에러 처리를 제공
 */
import { Request, Response, NextFunction } from 'express';
import { ZodError, ZodSchema } from 'zod';
import { logServerError } from './audit-logger';

// =============================================================================
// 1. 표준 응답 형식 타입 정의
// =============================================================================

export interface ApiSuccessResponse<T = any> {
  success: true;
  data: T;
  message?: string;
  meta?: {
    timestamp: string;
    requestId?: string;
    pagination?: PaginationMeta;
  };
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    timestamp: string;
    requestId?: string;
  };
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// =============================================================================
// 2. 표준 에러 코드 정의
// =============================================================================

export enum ApiErrorCode {
  // 인증 관련
  AUTHENTICATION_REQUIRED = 'AUTHENTICATION_REQUIRED',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  TOKEN_INVALID = 'TOKEN_INVALID',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  
  // 요청 관련
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  INVALID_REQUEST_FORMAT = 'INVALID_REQUEST_FORMAT',
  
  // 리소스 관련
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  RESOURCE_ALREADY_EXISTS = 'RESOURCE_ALREADY_EXISTS',
  RESOURCE_CONFLICT = 'RESOURCE_CONFLICT',
  
  // 서버 관련
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  
  // 비즈니스 로직 관련
  BUSINESS_RULE_VIOLATION = 'BUSINESS_RULE_VIOLATION',
  OPERATION_NOT_ALLOWED = 'OPERATION_NOT_ALLOWED',
}

// =============================================================================
// 3. HTTP 상태 코드 매핑
// =============================================================================

export const HTTP_STATUS = {
  // 성공
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  
  // 클라이언트 에러
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  
  // 서버 에러
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
} as const;

// 에러 코드별 기본 HTTP 상태 코드 매핑
export const ERROR_CODE_TO_HTTP_STATUS: Record<ApiErrorCode, number> = {
  [ApiErrorCode.AUTHENTICATION_REQUIRED]: HTTP_STATUS.UNAUTHORIZED,
  [ApiErrorCode.INVALID_CREDENTIALS]: HTTP_STATUS.UNAUTHORIZED,
  [ApiErrorCode.TOKEN_EXPIRED]: HTTP_STATUS.UNAUTHORIZED,
  [ApiErrorCode.TOKEN_INVALID]: HTTP_STATUS.UNAUTHORIZED,
  [ApiErrorCode.INSUFFICIENT_PERMISSIONS]: HTTP_STATUS.FORBIDDEN,
  
  [ApiErrorCode.VALIDATION_ERROR]: HTTP_STATUS.BAD_REQUEST,
  [ApiErrorCode.MISSING_REQUIRED_FIELD]: HTTP_STATUS.BAD_REQUEST,
  [ApiErrorCode.INVALID_REQUEST_FORMAT]: HTTP_STATUS.BAD_REQUEST,
  
  [ApiErrorCode.RESOURCE_NOT_FOUND]: HTTP_STATUS.NOT_FOUND,
  [ApiErrorCode.RESOURCE_ALREADY_EXISTS]: HTTP_STATUS.CONFLICT,
  [ApiErrorCode.RESOURCE_CONFLICT]: HTTP_STATUS.CONFLICT,
  
  [ApiErrorCode.INTERNAL_SERVER_ERROR]: HTTP_STATUS.INTERNAL_SERVER_ERROR,
  [ApiErrorCode.DATABASE_ERROR]: HTTP_STATUS.INTERNAL_SERVER_ERROR,
  [ApiErrorCode.EXTERNAL_SERVICE_ERROR]: HTTP_STATUS.BAD_GATEWAY,
  
  [ApiErrorCode.BUSINESS_RULE_VIOLATION]: HTTP_STATUS.UNPROCESSABLE_ENTITY,
  [ApiErrorCode.OPERATION_NOT_ALLOWED]: HTTP_STATUS.FORBIDDEN,
};

// =============================================================================
// 4. 응답 헬퍼 함수들
// =============================================================================

/**
 * 성공 응답 생성
 */
export function createSuccessResponse<T>(
  data: T,
  message?: string,
  meta?: Partial<ApiSuccessResponse['meta']>
): ApiSuccessResponse<T> {
  return {
    success: true,
    data,
    message,
    meta: {
      timestamp: new Date().toISOString(),
      ...meta,
    },
  };
}

/**
 * 에러 응답 생성
 */
export function createErrorResponse(
  code: ApiErrorCode | string,
  message: string,
  details?: any,
  meta?: Partial<ApiErrorResponse['meta']>
): ApiErrorResponse {
  return {
    success: false,
    error: {
      code,
      message,
      details,
    },
    meta: {
      timestamp: new Date().toISOString(),
      ...meta,
    },
  };
}

/**
 * 페이지네이션 메타데이터 생성
 */
export function createPaginationMeta(
  page: number,
  limit: number,
  total: number
): PaginationMeta {
  const totalPages = Math.ceil(total / limit);
  
  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

/**
 * 페이지네이션된 성공 응답 생성
 */
export function createPaginatedResponse<T>(
  data: T[],
  page: number,
  limit: number,
  total: number,
  message?: string
): ApiSuccessResponse<T[]> {
  const pagination = createPaginationMeta(page, limit, total);
  
  return createSuccessResponse(data, message, { pagination });
}

// =============================================================================
// 5. Express Response 확장
// =============================================================================

declare global {
  namespace Express {
    interface Response {
      success<T>(data: T, message?: string, statusCode?: number): Response;
      error(code: ApiErrorCode | string, message: string, details?: any, statusCode?: number): Response;
      paginated<T>(data: T[], page: number, limit: number, total: number, message?: string): Response;
    }
  }
}

/**
 * Express Response 객체에 표준 응답 메서드 추가
 */
export function extendResponse(req: Request, res: Response, next: NextFunction) {
  // 성공 응답
  res.success = function<T>(data: T, message?: string, statusCode: number = HTTP_STATUS.OK) {
    const response = createSuccessResponse(data, message);
    return this.status(statusCode).json(response);
  };

  // 에러 응답
  res.error = function(
    code: ApiErrorCode | string, 
    message: string, 
    details?: any, 
    statusCode?: number
  ) {
    const response = createErrorResponse(code, message, details);
    const status = statusCode || ERROR_CODE_TO_HTTP_STATUS[code as ApiErrorCode] || HTTP_STATUS.INTERNAL_SERVER_ERROR;
    return this.status(status).json(response);
  };

  // 페이지네이션 응답
  res.paginated = function<T>(
    data: T[], 
    page: number, 
    limit: number, 
    total: number, 
    message?: string
  ) {
    const response = createPaginatedResponse(data, page, limit, total, message);
    return this.status(HTTP_STATUS.OK).json(response);
  };

  next();
}

// =============================================================================
// 6. Zod 검증 미들웨어
// =============================================================================

/**
 * 요청 본문 검증 미들웨어
 */
export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData = schema.parse(req.body);
      req.body = validatedData;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
        }));
        
        return res.error(
          ApiErrorCode.VALIDATION_ERROR,
          '요청 데이터 검증에 실패했습니다.',
          details,
          HTTP_STATUS.BAD_REQUEST
        );
      }
      
      return res.error(
        ApiErrorCode.INVALID_REQUEST_FORMAT,
        '잘못된 요청 형식입니다.',
        undefined,
        HTTP_STATUS.BAD_REQUEST
      );
    }
  };
}

/**
 * 쿼리 파라미터 검증 미들웨어
 */
export function validateQuery<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedQuery = schema.parse(req.query);
      req.query = validatedQuery as any;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
        }));
        
        return res.error(
          ApiErrorCode.VALIDATION_ERROR,
          '쿼리 파라미터 검증에 실패했습니다.',
          details,
          HTTP_STATUS.BAD_REQUEST
        );
      }
      
      return res.error(
        ApiErrorCode.INVALID_REQUEST_FORMAT,
        '잘못된 쿼리 파라미터 형식입니다.',
        undefined,
        HTTP_STATUS.BAD_REQUEST
      );
    }
  };
}

// =============================================================================
// 7. 페이지네이션 헬퍼
// =============================================================================

/**
 * 페이지네이션 쿼리 파싱 및 검증
 */
export function parsePaginationQuery(query: any): PaginationQuery {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 20)); // 기본 20개, 최대 100개
  const sortBy = query.sortBy || 'createdAt';
  const sortOrder = query.sortOrder === 'desc' ? 'desc' : 'asc';
  
  return { page, limit, sortBy, sortOrder };
}

/**
 * 데이터베이스 쿼리를 위한 OFFSET, LIMIT 계산
 */
export function calculatePaginationOffset(page: number, limit: number) {
  return {
    offset: (page - 1) * limit,
    limit,
  };
}

// =============================================================================
// 8. 공통 에러 클래스들
// =============================================================================

export class StandardApiError extends Error {
  constructor(
    public code: ApiErrorCode,
    public message: string,
    public statusCode: number = ERROR_CODE_TO_HTTP_STATUS[code] || HTTP_STATUS.INTERNAL_SERVER_ERROR,
    public details?: any
  ) {
    super(message);
    this.name = 'StandardApiError';
  }
}

export class ValidationApiError extends StandardApiError {
  constructor(message: string, details?: any) {
    super(ApiErrorCode.VALIDATION_ERROR, message, HTTP_STATUS.BAD_REQUEST, details);
    this.name = 'ValidationApiError';
  }
}

export class NotFoundApiError extends StandardApiError {
  constructor(resource: string) {
    super(
      ApiErrorCode.RESOURCE_NOT_FOUND, 
      `${resource}을(를) 찾을 수 없습니다.`,
      HTTP_STATUS.NOT_FOUND
    );
    this.name = 'NotFoundApiError';
  }
}

export class UnauthorizedApiError extends StandardApiError {
  constructor(message: string = '인증이 필요합니다.') {
    super(ApiErrorCode.AUTHENTICATION_REQUIRED, message, HTTP_STATUS.UNAUTHORIZED);
    this.name = 'UnauthorizedApiError';
  }
}

export class ForbiddenApiError extends StandardApiError {
  constructor(message: string = '접근 권한이 없습니다.') {
    super(ApiErrorCode.INSUFFICIENT_PERMISSIONS, message, HTTP_STATUS.FORBIDDEN);
    this.name = 'ForbiddenApiError';
  }
}

// =============================================================================
// 9. 에러 핸들링 미들웨어
// =============================================================================

/**
 * 표준화된 에러 핸들링 미들웨어
 */
export function standardErrorHandler(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  logServerError('API Error:', {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    body: req.body,
    query: req.query,
    params: req.params,
  }, req);

  // 표준 API 에러인 경우
  if (error instanceof StandardApiError) {
    const isProdEnv = process.env.NODE_ENV === 'production';
    // 운영 환경의 5xx StandardApiError 는 내부 메시지/details 를 절대 노출하지 않는다
    if (isProdEnv && error.statusCode >= 500) {
      return res.error(
        error.code,
        '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
        undefined,
        error.statusCode,
      );
    }
    return res.error(error.code, error.message, error.details, error.statusCode);
  }

  // Zod 검증 에러인 경우
  if (error instanceof ZodError) {
    const details = error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
      code: err.code,
    }));
    
    return res.error(
      ApiErrorCode.VALIDATION_ERROR,
      '데이터 검증에 실패했습니다.',
      details,
      HTTP_STATUS.BAD_REQUEST
    );
  }

  // 기본 에러 처리 (운영: 일반 메시지만, 스택 절대 노출 X)
  const isProd = process.env.NODE_ENV === 'production';
  return res.error(
    ApiErrorCode.INTERNAL_SERVER_ERROR,
    isProd ? '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' : (error.message || '서버 오류가 발생했습니다.'),
    isProd ? undefined : { stack: error.stack },
    HTTP_STATUS.INTERNAL_SERVER_ERROR
  );
}