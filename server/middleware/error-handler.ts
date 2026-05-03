import { Request, Response, NextFunction } from 'express';
import { 
  StandardApiError, 
  ApiErrorCode, 
  standardErrorHandler,
  createErrorResponse,
  ERROR_CODE_TO_HTTP_STATUS,
  HTTP_STATUS
} from './api-standards';
import { logger } from '../monitoring/logger';

// =============================================================================
// 기존 에러 클래스들 (하위 호환성 유지)
// =============================================================================

// 커스텀 에러 클래스 (기존 호환성 유지)
export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

// 비즈니스 로직 에러 (기존 호환성 유지)
export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource}을(를) 찾을 수 없습니다.`, 404);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = '인증이 필요합니다.') {
    super(message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = '접근 권한이 없습니다.') {
    super(message, 403);
  }
}

// =============================================================================
// 통합된 글로벌 에러 핸들러
// =============================================================================

/**
 * 기존 AppError와 새로운 StandardApiError를 모두 처리하는 통합 에러 핸들러
 */
export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Winston 로거로 에러 로깅 (요청 ID + 사용자 컨텍스트 첨부)
  logger.error(`[ErrorHandler] ${error.message}`, {
    stack: error.stack,
    url: req.originalUrl || req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    requestId: (req as any).requestId,
    userId: (req as any).user?.id,
    role: (req as any).user?.role,
    ...(error instanceof StandardApiError && { code: error.code }),
    ...(error instanceof AppError && { statusCode: error.statusCode })
  });

  const isProd = process.env.NODE_ENV === 'production';

  // 표준 API 에러인 경우 새로운 표준 핸들러 사용
  if (error instanceof StandardApiError) {
    return standardErrorHandler(error, req, res, next);
  }

  // 기존 AppError 클래스들 처리 (하위 호환성 유지)
  if (error instanceof AppError) {
    const errorCode = getErrorCodeFromAppError(error);
    // 운영 환경의 5xx AppError 메시지는 절대 노출하지 않는다 (내부 정보 마스킹)
    const safeMessage = (isProd && error.statusCode >= 500)
      ? '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
      : error.message;
    const response = createErrorResponse(
      errorCode,
      safeMessage,
      isProd ? undefined : { stack: error.stack }
    );
    return res.status(error.statusCode).json(response);
  }

  // 특수 에러들 처리
  let statusCode = 500;
  let message = error.message;
  let errorCode = ApiErrorCode.INTERNAL_SERVER_ERROR;
  let exposeMessage = !isProd;

  // 데이터베이스 에러 처리 (DB 메시지는 절대 노출 X)
  if (
    error.name === 'MongoError' ||
    error.name === 'ValidationError' ||
    error.name === 'QueryFailedError' ||
    /^([A-Z]{2}\d{3}|ER_)/i.test((error as any).code || '')
  ) {
    statusCode = HTTP_STATUS.BAD_REQUEST;
    message = '데이터 처리 중 오류가 발생했습니다.';
    errorCode = ApiErrorCode.DATABASE_ERROR;
    exposeMessage = true; // 이 메시지는 안전한 일반 문구
  }

  // JWT 에러 처리
  if (error.name === 'JsonWebTokenError') {
    statusCode = HTTP_STATUS.UNAUTHORIZED;
    message = '유효하지 않은 토큰입니다.';
    errorCode = ApiErrorCode.TOKEN_INVALID;
    exposeMessage = true;
  }

  if (error.name === 'TokenExpiredError') {
    statusCode = HTTP_STATUS.UNAUTHORIZED;
    message = '토큰이 만료되었습니다.';
    errorCode = ApiErrorCode.TOKEN_EXPIRED;
    exposeMessage = true;
  }

  // 운영 환경: 5xx 에러는 항상 일반 메시지로 마스킹, 스택트레이스 절대 노출 X
  const safeMessage = (!exposeMessage && statusCode >= 500)
    ? '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
    : (isProd && statusCode >= 500 ? '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' : message);

  const response = createErrorResponse(
    errorCode,
    safeMessage,
    isProd ? undefined : { stack: error.stack }
  );

  res.status(statusCode).json(response);
};

/**
 * 기존 AppError에서 적절한 ErrorCode 매핑
 */
function getErrorCodeFromAppError(error: AppError): ApiErrorCode {
  if (error instanceof ValidationError) {
    return ApiErrorCode.VALIDATION_ERROR;
  }
  if (error instanceof NotFoundError) {
    return ApiErrorCode.RESOURCE_NOT_FOUND;
  }
  if (error instanceof UnauthorizedError) {
    return ApiErrorCode.AUTHENTICATION_REQUIRED;
  }
  if (error instanceof ForbiddenError) {
    return ApiErrorCode.INSUFFICIENT_PERMISSIONS;
  }
  return ApiErrorCode.INTERNAL_SERVER_ERROR;
}

/**
 * 통합된 404 핸들러 (새로운 표준 사용)
 */
export const notFoundHandler = (req: Request, res: Response) => {
  const response = createErrorResponse(
    ApiErrorCode.RESOURCE_NOT_FOUND,
    `요청하신 경로 ${req.originalUrl}을 찾을 수 없습니다.`
  );
  res.status(HTTP_STATUS.NOT_FOUND).json(response);
};

// 비동기 함수 래퍼
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};