import { Router } from 'express';
import { db } from '../db';
import { users, courses, institutes, pets } from '../../shared/schema';
import { eq, sql, count } from 'drizzle-orm';
import { logServerError } from '../middleware/audit-logger';

const router = Router();

// Database connectivity and schema test endpoint
router.get('/database-test', async (req, res) => {
  try {
    console.log('[Database Test] 데이터베이스 연결 및 스키마 테스트 시작');
    
    const testResults = {
      connectionTest: false,
      schemaTest: false,
      dataTest: false,
      tables: {},
      sampleData: {},
      errors: []
    };

    // 1. 데이터베이스 연결 테스트
    try {
      await db.execute(sql`SELECT 1 as test`);
      testResults.connectionTest = true;
      console.log('[Database Test] ✅ 데이터베이스 연결 성공');
    } catch (error) {
      testResults.errors.push(`Connection Error: ${error}`);
      logServerError('[Database Test] ❌ 데이터베이스 연결 실패:', error, req);
    }

    // 2. 스키마 및 테이블 존재 확인
    try {
      const tableQueries = [
        { name: 'users', query: () => db.select({ count: count() }).from(users) },
        { name: 'courses', query: () => db.select({ count: count() }).from(courses) },
        { name: 'institutes', query: () => db.select({ count: count() }).from(institutes) },
        { name: 'pets', query: () => db.select({ count: count() }).from(pets) }
      ];

      for (const table of tableQueries) {
        try {
          const result = await table.query();
          testResults.tables[table.name] = {
            exists: true,
            count: result[0]?.count || 0
          };
          console.log(`[Database Test] ✅ ${table.name} 테이블: ${result[0]?.count || 0}개 레코드`);
        } catch (error) {
          testResults.tables[table.name] = {
            exists: false,
            error: error.message
          };
          testResults.errors.push(`Table ${table.name} Error: ${error.message}`);
          logServerError(`[Database Test] ❌ ${table.name} 테이블 오류:`, error.message, req);
        }
      }

      testResults.schemaTest = Object.values(testResults.tables).some(t => t.exists);
    } catch (error) {
      testResults.errors.push(`Schema Error: ${error}`);
      logServerError('[Database Test] ❌ 스키마 테스트 실패:', error, req);
    }

    // 3. 실제 데이터 조회 테스트
    try {
      // 사용자 데이터 샘플 조회
      const sampleUsers = await db
        .select({
          id: users.id,
          username: users.username,
          role: users.role,
          createdAt: users.createdAt
        })
        .from(users)
        .limit(3);

      testResults.sampleData.users = sampleUsers;

      // 강의 데이터 샘플 조회
      const sampleCourses = await db
        .select({
          id: courses.id,
          title: courses.title,
          category: courses.category,
          price: courses.price
        })
        .from(courses)
        .limit(3);

      testResults.sampleData.courses = sampleCourses;

      // 기관 데이터 샘플 조회
      const sampleInstitutes = await db
        .select({
          id: institutes.id,
          name: institutes.name,
          businessNumber: institutes.businessNumber,
          capacity: institutes.capacity
        })
        .from(institutes)
        .limit(3);

      testResults.sampleData.institutes = sampleInstitutes;

      testResults.dataTest = true;
      console.log('[Database Test] ✅ 실제 데이터 조회 성공');

    } catch (error) {
      testResults.errors.push(`Data Query Error: ${error}`);
      logServerError('[Database Test] ❌ 데이터 조회 실패:', error, req);
    }

    // 4. 환경 정보
    const environmentInfo = {
      nodeEnv: process.env.NODE_ENV,
      hasDbUrl: !!process.env.DATABASE_URL,
      dbUrlPrefix: process.env.DATABASE_URL?.substring(0, 20) + '...',
      timestamp: new Date().toISOString()
    };

    // 5. 전체 테스트 결과 요약
    const overallSuccess = testResults.connectionTest && testResults.schemaTest && testResults.dataTest;
    
    console.log(`[Database Test] 📊 테스트 완료 - 전체 결과: ${overallSuccess ? '성공' : '실패'}`);
    console.log(`[Database Test] 📊 연결: ${testResults.connectionTest}, 스키마: ${testResults.schemaTest}, 데이터: ${testResults.dataTest}`);

    res.json({
      success: overallSuccess,
      message: overallSuccess ? 
        '데이터베이스 연동이 정상적으로 작동하고 있습니다.' : 
        '데이터베이스 연동에 문제가 있습니다.',
      results: testResults,
      environment: environmentInfo,
      summary: {
        connection: testResults.connectionTest ? '정상' : '실패',
        schema: testResults.schemaTest ? '정상' : '실패',
        data: testResults.dataTest ? '정상' : '실패',
        totalTables: Object.keys(testResults.tables).length,
        workingTables: Object.values(testResults.tables).filter(t => t.exists).length,
        totalRecords: Object.values(testResults.tables)
          .filter(t => t.exists && typeof t.count === 'number')
          .reduce((sum, t) => sum + t.count, 0)
      }
    });

  } catch (error) {
    logServerError('[Database Test] ❌ 테스트 실행 중 심각한 오류:', error, req);
    res.status(500).json({
      success: false,
      message: '데이터베이스 테스트 실행 중 오류가 발생했습니다.',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Menu visibility settings database integration test
router.get('/menu-visibility-db-test', async (req, res) => {
  try {
    console.log('[Menu Visibility DB Test] 메뉴 표시 설정 데이터베이스 연동 테스트');

    // Check if we should store menu visibility in database
    // For now, we'll create a test table structure
    const testMenuSettings = {
      table_exists: false,
      can_create: false,
      sample_data: null
    };

    try {
      // Test if we can create a simple menu settings table for future use
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS menu_visibility_settings (
          id SERIAL PRIMARY KEY,
          role VARCHAR(50) NOT NULL,
          menu_id VARCHAR(100) NOT NULL,
          is_visible BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW(),
          UNIQUE(role, menu_id)
        )
      `);

      testMenuSettings.table_exists = true;
      testMenuSettings.can_create = true;

      // Insert test data
      await db.execute(sql`
        INSERT INTO menu_visibility_settings (role, menu_id, is_visible) 
        VALUES 
          ('admin', 'menu-visibility', true),
          ('admin', 'ai-optimization', true),
          ('trainer', 'ai-analysis', true)
        ON CONFLICT (role, menu_id) DO NOTHING
      `);

      // Query test data
      const sampleData = await db.execute(sql`
        SELECT role, menu_id, is_visible, created_at 
        FROM menu_visibility_settings 
        LIMIT 5
      `);

      testMenuSettings.sample_data = sampleData.rows;

      console.log('[Menu Visibility DB Test] ✅ 데이터베이스 테이블 생성 및 데이터 삽입 성공');

    } catch (error) {
      logServerError('[Menu Visibility DB Test] ❌ 데이터베이스 테이블 테스트 실패:', error, req);
      testMenuSettings.can_create = false;
    }

    res.json({
      success: testMenuSettings.can_create,
      message: testMenuSettings.can_create ? 
        '메뉴 표시 설정 데이터베이스 연동 준비 완료' : 
        '메뉴 표시 설정 데이터베이스 연동 실패',
      menuVisibilityTest: testMenuSettings,
      nextSteps: testMenuSettings.can_create ? [
        '실제 메뉴 설정을 데이터베이스에 저장 가능',
        '관리자가 설정한 메뉴 표시 규칙을 영구 저장',
        '사용자별 맞춤 메뉴 표시 가능'
      ] : [
        '현재는 메모리 기반 설정 사용',
        '데이터베이스 연동을 위한 추가 설정 필요'
      ]
    });

  } catch (error) {
    logServerError('[Menu Visibility DB Test] ❌ 메뉴 표시 설정 DB 테스트 오류:', error, req);
    res.status(500).json({
      success: false,
      message: '메뉴 표시 설정 데이터베이스 테스트 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

export { router as databaseTestRoutes };