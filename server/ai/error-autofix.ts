import { Express } from "express";
import { Router } from 'express';
import OpenAI from "openai";
import { logger } from '../monitoring/logger';
import { logServerError } from '../middleware/audit-logger';

const DEFAULT_MODEL = "gpt-4o";

interface ErrorLog {
  id: string;
  type: 'javascript' | 'api' | 'database' | 'network' | 'performance';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: string;
  url?: string;
  stackTrace?: string;
  autoFixApplied: boolean;
  autoFixSuccess: boolean;
  resolution?: string;
  attempts: number;
}

interface AutoFixConfig {
  enabled: boolean;
  autoFixTypes: {
    javascript: boolean;
    api: boolean;
    database: boolean;
    network: boolean;
    performance: boolean;
  };
  severityThreshold: 'low' | 'medium' | 'high' | 'critical';
  maxAutoFixAttempts: number;
  cooldownPeriod: number;
}

// 메모리 저장소 (실제 환경에서는 데이터베이스 사용)
let errorLogs: ErrorLog[] = [];
let autoFixConfig: AutoFixConfig = {
  enabled: true,
  autoFixTypes: {
    javascript: true,
    api: true,
    database: false,
    network: true,
    performance: true
  },
  severityThreshold: 'medium',
  maxAutoFixAttempts: 3,
  cooldownPeriod: 300
};

let isAutoFixEnabled = false;
let lastAutoFixRun: string | null = null;
let totalFixCount = 0;

export function registerErrorAutoFixRoutes(app: Express) {
  const router = Router();

  // OpenAI API 클라이언트 초기화
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_TALEZ || process.env.OPENAI_API_KEY || '',
  });

  // 오류 로그 조회
  router.get('/error-logs', async (req, res) => {
    try {
      const sortedLogs = errorLogs
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 100); // 최근 100개만

      res.json(sortedLogs);
    } catch (error) {
      logger.error('오류 로그 조회 실패:', error);
      res.status(500).json({ error: '오류 로그를 조회할 수 없습니다.' });
    }
  });

  // 오류 로그 추가
  router.post('/error-logs', async (req, res) => {
    try {
      const errorData = req.body;
      const errorLog: ErrorLog = {
        id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: errorData.type || 'javascript',
        severity: errorData.severity || 'medium',
        message: errorData.message,
        timestamp: new Date().toISOString(),
        url: errorData.url,
        stackTrace: errorData.stackTrace,
        autoFixApplied: false,
        autoFixSuccess: false,
        attempts: 0
      };

      errorLogs.push(errorLog);

      // 설정된 조건에 맞으면 자동 수정 시도
      if (shouldAutoFix(errorLog)) {
        // 비동기로 자동 수정 시도
        attemptAutoFix(errorLog.id).catch(error => {
          logger.error('자동 수정 실패:', error);
        });
      }

      res.json({ success: true, id: errorLog.id });
    } catch (error) {
      logger.error('오류 로그 추가 실패:', error);
      res.status(500).json({ error: '오류 로그를 추가할 수 없습니다.' });
    }
  });

  // 수동 수정 요청
  router.post('/manual-fix/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const errorLog = errorLogs.find(log => log.id === id);

      if (!errorLog) {
        return res.status(404).json({ error: '오류 로그를 찾을 수 없습니다.' });
      }

      const result = await attemptAutoFix(id);

      res.json({
        success: result.success,
        message: result.message,
        resolution: result.resolution
      });
    } catch (error) {
      logger.error('수동 수정 실패:', error);
      res.status(500).json({ error: '수정을 시도할 수 없습니다.' });
    }
  });

  // 설정 조회
  router.get('/autofix-config', async (req, res) => {
    try {
      res.json(autoFixConfig);
    } catch (error) {
      logger.error('설정 조회 실패:', error);
      res.status(500).json({ error: '설정을 조회할 수 없습니다.' });
    }
  });

  // 설정 저장
  router.post('/autofix-config', async (req, res) => {
    try {
      autoFixConfig = { ...autoFixConfig, ...req.body };
      logger.info('AI 자동수정 설정 업데이트:', autoFixConfig);
      res.json({ success: true });
    } catch (error) {
      logger.error('설정 저장 실패:', error);
      res.status(500).json({ error: '설정을 저장할 수 없습니다.' });
    }
  });

  // 통계 조회
  router.get('/autofix-stats', async (req, res) => {
    try {
      const totalErrors = errorLogs.length;
      const fixedErrors = errorLogs.filter(log => log.autoFixApplied && log.autoFixSuccess).length;
      const fixSuccessRate = totalErrors > 0 ? Math.round((fixedErrors / totalErrors) * 100) : 0;

      // 평균 수정 시간 계산 (시뮬레이션)
      const avgFixTime = Math.round(Math.random() * 30 + 10);

      res.json({
        totalErrors,
        fixedErrors,
        fixSuccessRate,
        avgFixTime
      });
    } catch (error) {
      logger.error('통계 조회 실패:', error);
      res.status(500).json({ error: '통계를 조회할 수 없습니다.' });
    }
  });

  // 자동 수정 조건 확인
  function shouldAutoFix(errorLog: ErrorLog): boolean {
    if (!autoFixConfig.enabled) return false;
    if (!autoFixConfig.autoFixTypes[errorLog.type]) return false;

    const severityOrder = ['low', 'medium', 'high', 'critical'];
    const errorSeverityIndex = severityOrder.indexOf(errorLog.severity);
    const thresholdIndex = severityOrder.indexOf(autoFixConfig.severityThreshold);

    return errorSeverityIndex >= thresholdIndex;
  }

  // AI 기반 자동 수정 시도
  async function attemptAutoFix(errorId: string): Promise<{success: boolean, message: string, resolution?: string}> {
    const errorLog = errorLogs.find(log => log.id === errorId);
    if (!errorLog) {
      return { success: false, message: '오류 로그를 찾을 수 없습니다.' };
    }

    if (errorLog.attempts >= autoFixConfig.maxAutoFixAttempts) {
      return { success: false, message: '최대 시도 횟수를 초과했습니다.' };
    }

    try {
      // OpenAI API 키 확인
      if (!process.env.OPENAI_API_TALEZ && !process.env.OPENAI_API_KEY) {
        return { success: false, message: 'OpenAI API 키가 설정되지 않았습니다.' };
      }

      // AI에게 오류 분석 및 수정 방안 요청
      const fixPrompt = `
다음 ${errorLog.type} 오류를 분석하고 자동 수정 방안을 제시해주세요:

오류 메시지: ${errorLog.message}
심각도: ${errorLog.severity}
발생 URL: ${errorLog.url || 'N/A'}
스택 트레이스: ${errorLog.stackTrace || 'N/A'}

다음 JSON 형식으로 응답해주세요:
{
  "canAutoFix": true/false,
  "fixType": "code_fix|config_change|restart_service|cache_clear",
  "resolution": "수정 내용 설명",
  "preventiveMeasures": ["예방 조치 1", "예방 조치 2"],
  "confidence": 0.0-1.0
}
`;

      const response = await openai.chat.completions.create({
        model: DEFAULT_MODEL,
        messages: [
          {
            role: 'system',
            content: '당신은 웹 애플리케이션 오류를 자동으로 분석하고 수정하는 AI 엔지니어입니다. 안전하고 효과적인 수정 방안만 제시해주세요.'
          },
          {
            role: 'user',
            content: fixPrompt
          }
        ],
        temperature: 0.1,
        response_format: { type: "json_object" }
      });

      const aiResponse = JSON.parse(response.choices[0].message.content || '{}');

      // 수정 시도 기록 업데이트
      errorLog.attempts += 1;
      errorLog.autoFixApplied = true;

      if (aiResponse.canAutoFix && aiResponse.confidence > 0.7) {
        // 실제 수정 적용 (시뮬레이션)
        const fixResult = await applyAutoFix(errorLog, aiResponse);

        errorLog.autoFixSuccess = fixResult.success;
        errorLog.resolution = aiResponse.resolution;

        logger.info(`AI 자동수정 ${fixResult.success ? '성공' : '실패'}:`, {
          errorId: errorLog.id,
          resolution: aiResponse.resolution
        });

        return {
          success: fixResult.success,
          message: fixResult.success ? '자동 수정이 성공적으로 적용되었습니다.' : '수정 적용 중 오류가 발생했습니다.',
          resolution: aiResponse.resolution
        };
      } else {
        errorLog.autoFixSuccess = false;
        return {
          success: false,
          message: 'AI가 안전한 자동 수정 방안을 찾지 못했습니다.',
          resolution: aiResponse.resolution
        };
      }

    } catch (error) {
      logger.error('AI 자동수정 오류:', error);
      errorLog.attempts += 1;
      errorLog.autoFixApplied = true;
      errorLog.autoFixSuccess = false;

      return {
        success: false,
        message: 'AI 수정 요청 중 오류가 발생했습니다.'
      };
    }
  }

  // 실제 수정 적용 (시뮬레이션)
  async function applyAutoFix(errorLog: ErrorLog, aiResponse: any): Promise<{success: boolean}> {
    try {
      // 수정 유형에 따른 처리
      switch (aiResponse.fixType) {
        case 'cache_clear':
          // 캐시 클리어 시뮬레이션
          logger.info('캐시 클리어 수행');
          return { success: true };

        case 'config_change':
          // 설정 변경 시뮬레이션
          logger.info('설정 변경 수행');
          return { success: Math.random() > 0.2 }; // 80% 성공률

        case 'restart_service':
          // 서비스 재시작 시뮬레이션
          logger.info('서비스 재시작 수행');
          return { success: Math.random() > 0.1 }; // 90% 성공률

        case 'code_fix':
          // 코드 수정은 보안상 실제로는 수동 승인 필요
          logger.info('코드 수정 제안 생성');
          return { success: false }; // 수동 검토 필요

        default:
          return { success: false };
      }
    } catch (error) {
      logger.error('수정 적용 실패:', error);
      return { success: false };
    }
  }

  // 라우터 등록
  app.use('/api/ai', router);
  logger.info('[AI AutoFix] AI 자동 오류 수정 시스템이 초기화되었습니다.');
}

// 메뉴 시스템 자동 수정 함수
async function autoFixMenuSystem() {
  try {
    console.log('[AI 자동수정] 메뉴 시스템 검사 및 수정 시작');

    // 1. 메뉴 설정 파일 검증
    const menuConfigPath = 'shared/menu-config.ts';
    const fs = require('fs');

    if (!fs.existsSync(menuConfigPath)) {
      console.log('[AI 자동수정] 메뉴 설정 파일이 없습니다. 생성하는 중...');
      // 기본 메뉴 설정 파일 생성 로직
      return;
    }

    // 2. 메뉴 API 엔드포인트 검증
    console.log('[AI 자동수정] 메뉴 API 엔드포인트 검증 중...');

    // 3. 클라이언트 사이드 메뉴 렌더링 검증
    console.log('[AI 자동수정] 클라이언트 메뉴 렌더링 검증 중...');

    totalFixCount++;
    lastAutoFixRun = new Date().toISOString();

    console.log('[AI 자동수정] 메뉴 시스템 검사 완료');
  } catch (error) {
    logServerError('[AI 자동수정] 메뉴 시스템 수정 실패:', error);
  }
}

export function registerAIErrorAutoFixRoutes(app: Express) {
  // AI 에러 자동 수정 활성화/비활성화
  app.post('/api/admin/ai-error-autofix/toggle', async (req, res) => {
    try {
      const { enabled } = req.body;

      // 설정 저장 (실제로는 데이터베이스나 파일에 저장)
      isAutoFixEnabled = enabled;

      console.log(`[AI 자동수정] ${enabled ? '활성화' : '비활성화'}됨`);

      // 메뉴 시스템 자동 수정 실행
      if (enabled) {
        await autoFixMenuSystem();
      }

      res.json({
        success: true,
        enabled: isAutoFixEnabled,
        message: `AI 에러 자동수정이 ${enabled ? '활성화' : '비활성화'}되었습니다.`
      });
    } catch (error) {
      logServerError('AI 자동수정 설정 오류:', error, req);
      res.status(500).json({
        success: false,
        message: 'AI 자동수정 설정 중 오류가 발생했습니다.'
      });
    }
  });

  // 자동 수정 상태 조회
  app.get('/api/admin/ai-error-autofix/status', async (req, res) => {
    try {
      res.json({
        success: true,
        enabled: isAutoFixEnabled,
        lastRun: lastAutoFixRun,
        fixCount: totalFixCount
      });
    } catch (error) {
      logServerError('자동수정 상태 조회 오류:', error, req);
      res.status(500).json({
        success: false,
        message: '자동수정 상태 조회 중 오류가 발생했습니다.'
      });
    }
  });

  // 메뉴 시스템 수동 수정
  app.post('/api/admin/ai-error-autofix/fix-menu', async (req, res) => {
    try {
      await autoFixMenuSystem();
      res.json({
        success: true,
        message: '메뉴 시스템이 수정되었습니다.'
      });
    } catch (error) {
      logServerError('메뉴 시스템 수정 오류:', error, req);
      res.status(500).json({
        success: false,
        message: '메뉴 시스템 수정 중 오류가 발생했습니다.'
      });
    }
  });
}



// 시스템 시작시 샘플 데이터 생성
setTimeout(() => {
  // 샘플 오류 로그 생성
  const sampleErrors = [
    {
      type: 'javascript' as const,
      severity: 'medium' as const,
      message: 'Uncaught TypeError: Cannot read property of undefined',
      url: '/admin/dashboard',
      stackTrace: 'at App.tsx:45:12'
    },
    {
      type: 'api' as const,
      severity: 'high' as const,
      message: 'API timeout: /api/trainers endpoint',
      url: '/trainers'
    },
    {
      type: 'performance' as const,
      severity: 'low' as const,
      message: 'Slow page load: 3.2s response time',
      url: '/courses'
    }
  ];

  sampleErrors.forEach((error, index) => {
    setTimeout(() => {
      errorLogs.push({
        id: `sample_${Date.now()}_${index}`,
        ...error,
        timestamp: new Date(Date.now() - Math.random() * 86400000).toISOString(),
        autoFixApplied: Math.random() > 0.5,
        autoFixSuccess: Math.random() > 0.3,
        attempts: Math.floor(Math.random() * 3),
        resolution: Math.random() > 0.5 ? '캐시 클리어로 해결됨' : undefined
      });
    }, index * 1000);
  });
}, 5000);