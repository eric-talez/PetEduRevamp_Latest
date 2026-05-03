import { Express } from "express";
import { Router } from 'express';
import OpenAI from "openai";
import { logServerError } from '../middleware/audit-logger';

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const DEFAULT_MODEL = "gpt-4o";

// AI 관련 API 라우터
export function registerAiRoutes(app: Express) {
  const router = Router();

  // OpenAI API 클라이언트 초기화
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_TALEZ || process.env.OPENAI_API_KEY || '',
  });

  // 채팅 API 엔드포인트
  router.post('/chat', async (req, res) => {
    try {
      const { messages, model = DEFAULT_MODEL, temperature = 0.7, maxTokens = 1000 } = req.body;

      if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: '유효하지 않은 메시지 형식입니다.' });
      }

      // API 키 확인
      if (!process.env.OPENAI_API_TALEZ || process.env.OPENAI_API_KEY) {
        return res.status(500).json({ error: 'API 키가 설정되지 않았습니다.' });
      }

      // 사용자 인증 상태에 따라 컨텍스트 제한
      let isAuthenticated = req.session && req.session.user;
      let messagesForApi = [...messages];
      
      // 비인증 사용자는 요청 제한
      if (!isAuthenticated) {
        // 이전 메시지 개수 제한 (시스템 메시지 + 최근 4개 메시지만 유지)
        const systemMessages = messages.filter(msg => msg.role === 'system');
        const nonSystemMessages = messages.filter(msg => msg.role !== 'system');
        
        // 최근 메시지만 유지 (최대 4개)
        const recentMessages = nonSystemMessages.slice(-4);
        
        // 메시지 배열 재구성
        messagesForApi = [...systemMessages, ...recentMessages];
        
        // 토큰 수 제한 (지역 변수 사용)
        const limitedTokens = Math.min(maxTokens, 500);
        // 요청 시에는 이 제한된 토큰 수를 사용
        req.body.maxTokens = limitedTokens;
      }

      // OpenAI API 호출
      const response = await openai.chat.completions.create({
        model: model,
        messages: messagesForApi,
        max_tokens: maxTokens,
        temperature: temperature,
      });

      const content = response.choices[0].message.content;

      // 응답 반환
      return res.json({
        id: response.id,
        model: response.model,
        content: content,
        usage: {
          promptTokens: response.usage?.prompt_tokens || 0,
          completionTokens: response.usage?.completion_tokens || 0,
        }
      });
      
    } catch (error: any) {
      logServerError('AI API 오류:', error, req);
      
      // 오류 유형에 따른 응답
      if (error.status === 401) {
        return res.status(401).json({ error: 'API 키가 유효하지 않습니다.' });
      } else if (error.status === 429) {
        return res.status(429).json({ error: '요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.' });
      } else if (error.status === 400) {
        return res.status(400).json({ error: '잘못된 요청입니다: ' + error.message });
      } else {
        return res.status(500).json({ error: '서버 오류가 발생했습니다.' });
      }
    }
  });

  // 반려동물 행동 분석 API 엔드포인트 (프리미엄 사용자 전용)
  router.post('/analyze-behavior', async (req, res) => {
    try {
      // 인증 확인
      if (!req.session || !req.session.user) {
        return res.status(401).json({ error: '인증된 사용자만 이용할 수 있습니다.' });
      }
      
      const { description, petType = '강아지' } = req.body;
      
      if (!description) {
        return res.status(400).json({ error: '반려동물 행동 설명이 필요합니다.' });
      }
      
      // API 키 확인
      if (!process.env.OPENAI_API_TALEZ || process.env.OPENAI_API_KEY) {
        return res.status(500).json({ error: 'API 키가 설정되지 않았습니다.' });
      }
      
      // 시스템 프롬프트 구성
      const systemPrompt = `당신은 반려동물 행동 전문가입니다. 사용자가 제공한 ${petType}의 행동 설명을 분석하고, 
다음 형식의 JSON으로 응답해주세요:
{
  "behaviorType": "행동 유형 (예: 공격성, 불안, 놀이 등)",
  "possibleCauses": ["가능한 원인 1", "가능한 원인 2", ...],
  "recommendedActions": ["권장 조치 1", "권장 조치 2", ...],
  "severity": "심각도 (낮음, 중간, 높음)",
  "needsProfessionalHelp": true/false,
  "additionalNotes": "추가 참고사항"
}

결과는 과학적 근거에 기반하고, 반려동물의 복지를 최우선으로 고려해야 합니다.`;

      // OpenAI API 호출
      const response = await openai.chat.completions.create({
        model: DEFAULT_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: description }
        ],
        temperature: 0.2, // 더 결정적인 응답을 위해 낮은 온도 사용
        response_format: { type: "json_object" }
      });
      
      // JSON 응답 구문 분석
      try {
        const analysisResult = JSON.parse(response.choices[0].message.content || '{}');
        return res.json(analysisResult);
      } catch (parseError) {
        logServerError('JSON 파싱 오류:', parseError, req);
        return res.status(500).json({ 
          error: 'AI 응답을 처리하는 중 오류가 발생했습니다.',
          rawResponse: response.choices[0].message.content
        });
      }
      
    } catch (error: any) {
      logServerError('행동 분석 API 오류:', error, req);
      return res.status(500).json({ error: '분석 중 오류가 발생했습니다: ' + error.message });
    }
  });

  // 훈련 계획 생성 API 엔드포인트 (프리미엄 사용자 전용)
  router.post('/generate-training-plan', async (req, res) => {
    try {
      // 인증 확인
      if (!req.session || !req.session.user) {
        return res.status(401).json({ error: '인증된 사용자만 이용할 수 있습니다.' });
      }
      
      const { 
        petName, 
        petType = '강아지',
        petAge,
        petBreed,
        targetBehavior,
        currentSkillLevel,
        timeCommitment
      } = req.body;
      
      if (!petName || !targetBehavior) {
        return res.status(400).json({ error: '반려동물 이름과 목표 행동이 필요합니다.' });
      }
      
      // API 키 확인
      if (!process.env.OPENAI_API_TALEZ || process.env.OPENAI_API_KEY) {
        return res.status(500).json({ error: 'API 키가 설정되지 않았습니다.' });
      }
      
      // 사용자 정보
      const user = req.session.user;
      
      // 시스템 프롬프트 구성
      const systemPrompt = `당신은 반려동물 훈련 전문가입니다. 다음 정보를 바탕으로 개인화된 훈련 계획을 JSON 형식으로 생성해주세요:

반려동물 이름: ${petName}
반려동물 종류: ${petType}
반려동물 나이: ${petAge || '정보 없음'}
반려동물 품종: ${petBreed || '정보 없음'}
목표 행동: ${targetBehavior}
현재 숙련도: ${currentSkillLevel || '초보'}
가능한 훈련 시간: ${timeCommitment || '하루 20분'}
훈련자: ${user?.username || '정보 없음'}

결과는 다음 JSON 형식으로 제공해주세요:
{
  "planName": "훈련 계획 이름",
  "duration": "예상 훈련 기간 (예: 2주)",
  "overview": "훈련 계획 개요",
  "weeklyPlans": [
    {
      "week": 1,
      "goals": ["목표 1", "목표 2"],
      "dailyActivities": [
        {
          "day": 1,
          "activities": ["활동 1", "활동 2"],
          "duration": "예상 소요 시간",
          "tips": "팁과 조언"
        }
      ]
    }
  ],
  "materials": ["필요한 도구 1", "필요한 도구 2"],
  "successMetrics": ["성공 지표 1", "성공 지표 2"]
}

훈련 계획은 긍정적 강화 방법을 사용하고, 과학적 근거에 기반해야 합니다.`;

      // OpenAI API 호출
      const response = await openai.chat.completions.create({
        model: DEFAULT_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `${petName}를 위한 '${targetBehavior}' 훈련 계획을 생성해주세요.` }
        ],
        temperature: 0.3,
        response_format: { type: "json_object" }
      });
      
      // JSON 응답 구문 분석
      try {
        const trainingPlan = JSON.parse(response.choices[0].message.content || '{}');
        return res.json(trainingPlan);
      } catch (parseError) {
        logServerError('JSON 파싱 오류:', parseError, req);
        return res.status(500).json({ 
          error: 'AI 응답을 처리하는 중 오류가 발생했습니다.',
          rawResponse: response.choices[0].message.content
        });
      }
      
    } catch (error: any) {
      logServerError('훈련 계획 생성 API 오류:', error, req);
      return res.status(500).json({ error: '훈련 계획 생성 중 오류가 발생했습니다: ' + error.message });
    }
  });

  // 라우터 등록
  app.use('/api/ai', router);
  console.log('[AI Routes] AI API routes registered');
}