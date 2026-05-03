import { Pool as PgPool, neonConfig } from '@neondatabase/serverless';
import { drizzle as drizzlePg } from 'drizzle-orm/neon-serverless';
import { drizzle as drizzleMaria } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import ws from "ws";
import * as schema from "../shared/schema";
import { logger } from './monitoring/logger';
import { logServerError } from './middleware/audit-logger';

const isProduction = process.env.NODE_ENV === 'production';
const isReplit = process.env.REPLIT_DEV_DOMAIN !== undefined;

const PRODUCTION_DB_CONFIG = {
  host: process.env.MARIADB_HOST || 'localhost',
  port: parseInt(process.env.MARIADB_PORT || '3306', 10),
  user: process.env.MARIADB_USER || 'ft_user',
  password: process.env.MARIADB_PASSWORD || 'Ft_user123#@!',
  database: process.env.MARIADB_DATABASE || 'ft_v1',
  multipleStatements: true,
  ssl: false as const,
};

const PG_POOL_MAX = parseInt(
  process.env.PG_POOL_MAX || (isProduction ? '30' : '15'),
  10,
);
const MARIA_POOL_MAX = parseInt(
  process.env.MARIA_POOL_MAX || '30',
  10,
);

let pool: any;
let db: any;
let isMariaPool = false;

function createPool() {
  if (isProduction && !isReplit) {
    console.log('🎯 운영 환경: MariaDB 연결 설정 (pool max=' + MARIA_POOL_MAX + ')');
    isMariaPool = true;
    return mysql.createPool({
      host: PRODUCTION_DB_CONFIG.host,
      port: PRODUCTION_DB_CONFIG.port,
      user: PRODUCTION_DB_CONFIG.user,
      password: PRODUCTION_DB_CONFIG.password,
      database: PRODUCTION_DB_CONFIG.database,
      multipleStatements: PRODUCTION_DB_CONFIG.multipleStatements,
      waitForConnections: true,
      connectionLimit: MARIA_POOL_MAX,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 10_000,
      idleTimeout: 60_000,
    });
  }
  console.log('🔧 개발 환경: PostgreSQL 연결 설정 (pool max=' + PG_POOL_MAX + ')');
  neonConfig.webSocketConstructor = ws;
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL must be set. Did you forget to provision a database?",
    );
  }
  return new PgPool({
    connectionString: process.env.DATABASE_URL,
    max: PG_POOL_MAX,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });
}

function buildDb(p: any) {
  return isMariaPool
    ? drizzleMaria(p, { schema, mode: 'default' })
    : drizzlePg({ client: p, schema });
}

function attachPoolErrorHandlers() {
  try {
    if (typeof pool?.on === 'function') {
      pool.on('error', (err: any) => {
        logServerError('❌ DB pool error:', err?.message || err);
        // 풀 차원의 connection error 발생 시 적극적 재연결 시도
        scheduleReconnect('pool-error');
      });
      pool.on('connect', () => {
        if (!isProduction) {
          console.log('🔌 DB pool: new connection established');
        }
      });
    }
  } catch (err) {
    console.warn('⚠️ DB pool error handler 등록 실패:', err);
  }
}

pool = createPool();
db = buildDb(pool);
attachPoolErrorHandlers();

// 헬스체크 기반 자동 재연결: SELECT 1 ping 으로 풀 상태를 주기 점검하고
// 지수 백오프(최대 30s)로 재시도. 연속 실패가 RECREATE_THRESHOLD 회 누적되면
// 손상된 풀을 폐기하고 새 풀을 생성한다.
let reconnectInFlight = false;
let reconnectAttempt = 0;
let consecutiveFailures = 0;
const MAX_BACKOFF_MS = 30_000;
const RECREATE_THRESHOLD = 3;

async function recreatePool(reason: string) {
  console.warn(`♻️ DB 풀 재생성 시작 (${reason})`);
  const old = pool;
  try {
    pool = createPool();
    db = buildDb(pool);
    attachPoolErrorHandlers();
    console.log('✅ DB 풀 재생성 완료');
  } catch (err) {
    logServerError('❌ DB 풀 재생성 실패:', err);
  }
  // 이전 풀은 백그라운드에서 정리 (in-flight 쿼리 끝나길 기다리지 않음)
  if (old && typeof old.end === 'function') {
    setTimeout(() => {
      try { void old.end(); } catch { /* noop */ }
    }, 5_000).unref();
  }
}

function scheduleReconnect(reason: string) {
  if (reconnectInFlight || isShuttingDownPool) return;
  reconnectInFlight = true;
  const delay = Math.min(MAX_BACKOFF_MS, 1_000 * Math.pow(2, reconnectAttempt));
  reconnectAttempt += 1;
  console.warn(`♻️ DB 재연결 예약 (${reason}) — ${delay}ms 후 시도 (attempt #${reconnectAttempt})`);
  setTimeout(async () => {
    const ok = await checkDatabaseConnection().catch(() => false);
    reconnectInFlight = false;
    if (ok) {
      console.log('✅ DB 재연결 성공 (헬스체크 통과)');
      reconnectAttempt = 0;
      consecutiveFailures = 0;
    } else {
      consecutiveFailures += 1;
      logger.error(`❌ DB 재연결 실패 (연속 ${consecutiveFailures}회)`);
      if (consecutiveFailures >= RECREATE_THRESHOLD) {
        consecutiveFailures = 0;
        await recreatePool('persistent-failure');
      }
      scheduleReconnect('retry');
    }
  }, delay).unref();
}

let isShuttingDownPool = false;

// 60초 주기 백그라운드 헬스체크
setInterval(() => {
  if (isShuttingDownPool) return;
  void checkDatabaseConnection().then((ok) => {
    if (!ok) scheduleReconnect('healthcheck-failed');
    else if (reconnectAttempt > 0) {
      reconnectAttempt = 0;
      consecutiveFailures = 0;
    }
  });
}, 60_000).unref();

export async function checkDatabaseConnection() {
  if (isMariaPool) {
    let connection: any = null;
    try {
      connection = await pool.getConnection();
      await connection.ping();
      return true;
    } catch (error) {
      logServerError('❌ MariaDB 연결 실패:', error);
      return false;
    } finally {
      if (connection) {
        try { connection.release(); } catch (releaseErr) {
          console.warn('⚠️ MariaDB connection release 실패:', releaseErr);
        }
      }
    }
  } else {
    let client: any = null;
    try {
      client = await pool.connect();
      await client.query('SELECT 1');
      return true;
    } catch (error) {
      logServerError('❌ PostgreSQL 연결 실패:', error);
      return false;
    } finally {
      if (client) {
        try { client.release(); } catch (releaseErr) {
          console.warn('⚠️ PG client release 실패:', releaseErr);
        }
      }
    }
  }
}

export async function closeDatabasePool(): Promise<void> {
  isShuttingDownPool = true;
  try {
    if (pool && typeof pool.end === 'function') {
      await pool.end();
      console.log('✅ DB pool closed');
    }
  } catch (err) {
    logServerError('❌ DB pool close 중 오류:', err);
  }
}

export { pool, db };
