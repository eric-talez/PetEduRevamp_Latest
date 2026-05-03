import winston from 'winston';
import 'winston-daily-rotate-file';
import path from 'path';
import fs from 'fs';
import { Request, Response, NextFunction } from 'express';

// 로그 디렉토리 생성
const logDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// 포맷터 설정 — 모든 메타데이터를 직렬화하여 컨텍스트(requestId/userId/route 등)를 보존
const STANDARD_KEYS = new Set(['level', 'message', 'timestamp', 'stack', 'service', 'splat']);
const formatter = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.printf((info) => {
    const { level, message, timestamp, stack } = info as any;
    const meta: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(info)) {
      if (!STANDARD_KEYS.has(k) && v !== undefined) meta[k] = v;
    }
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    const stackStr = stack ? ` ${stack}` : '';
    return `${timestamp} [${String(level).toUpperCase()}]: ${message}${metaStr}${stackStr}`;
  })
);

// 파일은 JSON 라인 형식으로 저장하여 구조화된 컨텍스트를 보존
const jsonFileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// 콘솔 트랜스포트 설정
const consoleTransport = new winston.transports.Console({
  format: winston.format.combine(
    winston.format.colorize(),
    formatter
  ),
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug'
});

// 파일 트랜스포트 설정 (일별 로테이션)
const fileTransport = new winston.transports.DailyRotateFile({
  filename: path.join(logDir, 'application-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m', // 20MB
  maxFiles: '14d', // 14일간 보관
  level: 'info',
  format: jsonFileFormat
});

// 에러 전용 파일 트랜스포트 설정
const errorFileTransport = new winston.transports.DailyRotateFile({
  filename: path.join(logDir, 'error-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m', // 20MB
  maxFiles: '30d', // 30일간 보관
  level: 'error',
  format: jsonFileFormat
});

// 로거 생성
export const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  defaultMeta: { service: 'talez-api' },
  transports: [
    consoleTransport,
    fileTransport,
    errorFileTransport
  ],
  exitOnError: false
});

// Express 미들웨어
export const loggerMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  
  // 응답 완료 시 로깅
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const logLevel = res.statusCode >= 500 ? 'error' : 
                     res.statusCode >= 400 ? 'warn' : 'info';
    
    const message = `${req.method} ${req.url} ${res.statusCode} ${duration}ms`;
    
    // API 요청과 비정상 상태 코드만 로깅 (정적 자산 제외)
    if (req.path.startsWith('/api/') || res.statusCode >= 400) {
      logger.log({
        level: logLevel,
        message,
        meta: {
          ip: req.ip,
          method: req.method,
          url: req.url,
          statusCode: res.statusCode,
          userAgent: req.headers['user-agent'],
          userId: req.session?.user?.id || 'anonymous',
          responseTime: duration
        }
      });
    }
  });
  
  next();
};

// 로거 초기화 메시지
logger.info('[Logger] 로깅 시스템이 초기화되었습니다.');

// 프로세스 예외 처리 설정
process.on('uncaughtException', (error) => {
  logger.error(`[UncaughtException] ${error.message}`, { stack: error.stack });
  // 10초 후 프로세스 종료 (로그 저장을 위한 시간 확보)
  setTimeout(() => {
    process.exit(1);
  }, 10000);
});

process.on('unhandledRejection', (reason) => {
  logger.error(`[UnhandledRejection] ${reason instanceof Error ? reason.message : String(reason)}`, { 
    stack: reason instanceof Error ? reason.stack : undefined 
  });
});