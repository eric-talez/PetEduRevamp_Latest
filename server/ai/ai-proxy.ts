import express from "express";
import rateLimit from "express-rate-limit";
import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Anthropic } from '@anthropic-ai/sdk';
import fetch from 'node-fetch';
import { logServerError } from '../middleware/audit-logger';
// import { aiUsageService } from "../services/ai-usage-service";

// AI 프록시 서버 - 개선된 AI 분석 기능
export class AIProxyService {
  private openai: OpenAI;
  private claude: Anthropic;
  private gemini: GoogleGenerativeAI;
  private perplexityApiKey: string;
  private usageLog: Map<string, any> = new Map();
  private aiWeights: { [key: string]: number } = {
    openai: 0.3,
    claude: 0.3,
    gemini: 0.2,
    perplexity: 0.2
  };

  constructor() {
    // API 키 검증
    if (!process.env.OPENAI_API_TALEZ && !process.env.OPENAI_API_KEY) {
      console.warn('⚠️ OpenAI API 키가 설정되지 않았습니다.');
    }
    if (!process.env.ANTHROPIC_API_KEY) {
      console.warn('⚠️ Claude API 키가 설정되지 않았습니다.');
    }
    if (!process.env.GEMINI_API_KEY) {
      console.warn('⚠️ Gemini API 키가 설정되지 않았습니다.');
    }
    if (!process.env.PERPLEXITY_API_KEY) {
      console.warn('⚠️ Perplexity API 키가 설정되지 않았습니다.');
    }

    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_TALEZ || process.env.OPENAI_API_KEY,
    });

    this.claude = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY || "",
    });

    this.gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
    this.perplexityApiKey = process.env.PERPLEXITY_API_KEY || "";
  }

  // 레이트 리밋 설정
  static createRateLimit() {
    return rateLimit({
      windowMs: 60 * 1000, // 1분
      max: parseInt(process.env.AI_RATE_LIMIT_PER_MINUTE || '10'), // 분당 10회
      message: {
        error: 'AI 요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.',
        retryAfter: 60
      },
      standardHeaders: true,
      legacyHeaders: false,
    });
  }

  // 유저별 할당량 체크 미들웨어
  async checkUserQuota(userId: string): Promise<{ allowed: boolean; reason?: string }> {
    const dailyLimit = parseInt(process.env.AI_DAILY_LIMIT_PER_USER || '50');
    const todayKey = `${userId}:${new Date().toISOString().split('T')[0]}`;
    
    const todayUsage = this.usageLog.get(todayKey) || 0;
    
    if (todayUsage >= dailyLimit) {
      return {
        allowed: false,
        reason: '일일 AI 분석 한도를 초과했습니다.'
      };
    }

    return { allowed: true };
  }

  // 백오프 유틸리티
  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async withRetry<T>(
    fn: () => Promise<T>,
    options: { max?: number; base?: number } = {}
  ): Promise<T> {
    const { max = 3, base = 1000 } = options;

    for (let i = 0; i <= max; i++) {
      try {
        return await fn();
      } catch (error: any) {
        const status = error?.response?.status;
        
        // 재시도하지 않을 오류들
        if (status && status !== 429 && status < 500) {
          throw error;
        }
        
        if (i === max) {
          throw error;
        }

        // 백오프 계산
        const retryAfter = Number(error?.response?.headers?.['retry-after']);
        const delay = retryAfter ? retryAfter * 1000 : Math.min(base * Math.pow(2, i), 30000);
        
        console.log(`AI 요청 재시도 대기: ${delay}ms (시도 ${i + 1}/${max + 1})`);
        await this.sleep(delay + Math.random() * 1000);
      }
    }

    throw new Error('재시도 한도 초과');
  }

  // 모델 선택 로직 (비용 최적화)
  private selectModel(analysisType: string, priority: 'cost' | 'quality' = 'cost') {
    const models = {
      openai: {
        cost: 'gpt-4o-mini',
        quality: 'gpt-4o'
      },
      gemini: {
        cost: 'gemini-1.5-flash',
        quality: 'gemini-1.5-pro'
      }
    };

    return {
      openai: models.openai[priority],
      gemini: models.gemini[priority]
    };
  }

  // OpenAI 프록시 메서드
  async callOpenAI(
    messages: any[],
    options: {
      model?: string;
      maxTokens?: number;
      temperature?: number;
      userId?: string;
    } = {}
  ): Promise<any> {
    const {
      model = 'gpt-4o-mini',
      maxTokens = 1024,
      temperature = 0.7,
      userId = 'anonymous'
    } = options;

    return this.withRetry(async () => {
      const startTime = Date.now();
      
      const response = await this.openai.chat.completions.create({
        model,
        messages,
        max_tokens: maxTokens,
        temperature,
      });

      const responseTime = Date.now() - startTime;
      
      // 사용량 로깅
      this.logUsage(userId, 'openai', model, {
        inputTokens: response.usage?.prompt_tokens || 0,
        outputTokens: response.usage?.completion_tokens || 0,
        responseTime,
        cost: this.calculateCost('openai', model, response.usage)
      });

      return response;
    });
  }

  // Gemini 프록시 메서드
  async callGemini(
    prompt: string,
    options: {
      model?: string;
      userId?: string;
      systemInstruction?: string;
    } = {}
  ): Promise<any> {
    const {
      model = 'gemini-1.5-flash',
      userId = 'anonymous',
      systemInstruction
    } = options;

    return this.withRetry(async () => {
      const startTime = Date.now();
      
      const config: any = {};
      if (systemInstruction) {
        config.systemInstruction = systemInstruction;
      }

      const model_instance = this.gemini.getGenerativeModel({ 
        model, 
        systemInstruction 
      });
      
      const response = await model_instance.generateContent(prompt);

      const responseTime = Date.now() - startTime;
      
      // 사용량 로깅
      const responseText = response.response?.text() || '';
      this.logUsage(userId, 'gemini', model, {
        inputTokens: prompt.length / 4, // 대략적인 토큰 수
        outputTokens: responseText.length / 4,
        responseTime,
        cost: this.calculateCost('gemini', model, {
          prompt_tokens: prompt.length / 4,
          completion_tokens: responseText.length / 4
        })
      });

      return {
        text: response.response?.text() || '',
        response: response
      };
    });
  }

  // 멀티모델 분석 (비용 최적화된)
  async fusedAnalysis(
    input: string,
    analysisType: 'behavior' | 'health' | 'training',
    userId: string,
    priority: 'cost' | 'quality' = 'cost'
  ): Promise<{
    result: string;
    provider: string;
    model: string;
    confidence: number;
    cost: number;
  }> {
    const models = this.selectModel(analysisType, priority);
    
    try {
      // 1차: 저비용 모델로 시도 (Gemini Flash)
      const prompt = this.createPrompt(analysisType, input);
      
      try {
        console.log(`🔄 Gemini ${models.gemini} 모델로 분석 시작`);
        const geminiResponse = await this.callGemini(prompt, {
          model: models.gemini,
          userId,
          systemInstruction: this.getSystemInstruction(analysisType)
        });

        return {
          result: geminiResponse.text || '분석을 완료할 수 없습니다.',
          provider: 'gemini',
          model: models.gemini,
          confidence: 0.85,
          cost: this.calculateCost('gemini', models.gemini, {
            prompt_tokens: prompt.length / 4,
            completion_tokens: (geminiResponse.text?.length || 0) / 4
          })
        };
      } catch (geminiError) {
        console.log('Gemini 분석 실패, OpenAI로 fallback');
        
        // 2차: OpenAI로 fallback
        const messages = [
          {
            role: 'system',
            content: this.getSystemInstruction(analysisType)
          },
          {
            role: 'user',
            content: prompt
          }
        ];

        const openaiResponse = await this.callOpenAI(messages, {
          model: models.openai,
          userId
        });

        return {
          result: openaiResponse.choices[0]?.message?.content || '분석을 완료할 수 없습니다.',
          provider: 'openai',
          model: models.openai,
          confidence: 0.9,
          cost: this.calculateCost('openai', models.openai, openaiResponse.usage)
        };
      }
    } catch (error) {
      logServerError('멀티모델 분석 실패:', error);
      throw new Error('AI 분석 서비스를 일시적으로 사용할 수 없습니다.');
    }
  }

  // 프롬프트 생성
  private createPrompt(analysisType: string, input: string): string {
    const prompts = {
      behavior: `반려동물 행동 전문가로서 다음 행동을 분석하고 실용적인 훈련 조언을 제공하세요:

행동 설명: ${input}

다음 형식으로 답변해주세요:
1. 행동 분석 (간단명료)
2. 가능한 원인 (2-3가지)
3. 훈련 방법 (구체적인 단계)
4. 주의사항

전문적이지만 이해하기 쉬운 한국어로 답변해주세요.`,

      health: `수의사 관점에서 다음 증상을 분석하고 조언을 제공하세요:

증상: ${input}

다음 형식으로 답변해주세요:
1. 증상 분석
2. 가능한 원인 (주요 2-3가지)
3. 응급성 평가 (긴급/보통/경미)
4. 권장 조치
5. 예방 방법

⚠️ 주의: 이는 참고용 정보이며, 정확한 진단을 위해서는 반드시 수의사 진료를 받으시기 바랍니다.`,

      training: `반려견 훈련 전문가로서 맞춤형 훈련 계획을 작성해주세요:

요청사항: ${input}

다음 형식으로 4주 훈련 계획을 작성해주세요:
1주차: [목표 및 구체적 방법]
2주차: [목표 및 구체적 방법] 
3주차: [목표 및 구체적 방법]
4주차: [목표 및 구체적 방법]

각 주차별로 구체적인 훈련 방법과 주의사항을 포함해주세요.`
    };

    return prompts[analysisType] || prompts.behavior;
  }

  // 시스템 인스트럭션 생성
  private getSystemInstruction(analysisType: string): string {
    const instructions = {
      behavior: '당신은 TALEZ의 반려동물 행동 분석 전문가입니다. 실용적이고 안전한 조언을 제공하며, 한국어로 친근하게 답변합니다.',
      health: '당신은 TALEZ의 수의학 상담 AI입니다. 정확하고 신중한 의료 조언을 제공하되, 항상 전문 수의사 진료의 중요성을 강조합니다.',
      training: '당신은 TALEZ의 반려견 훈련 전문가입니다. 체계적이고 단계적인 훈련 계획을 제공하며, 반려견과 주인 모두의 안전을 최우선으로 합니다.'
    };

    return instructions[analysisType] || instructions.behavior;
  }

  // 비용 계산
  private calculateCost(provider: string, model: string, usage: any): number {
    if (!usage) return 0;

    // 대략적인 토큰당 비용 (USD)
    const pricing = {
      openai: {
        'gpt-4o': { input: 0.000005, output: 0.000015 },
        'gpt-4o-mini': { input: 0.00000015, output: 0.0000006 }
      },
      gemini: {
        'gemini-1.5-pro': { input: 0.000002, output: 0.000006 },
        'gemini-1.5-flash': { input: 0.0000001, output: 0.0000004 }
      }
    };

    const modelPricing = pricing[provider]?.[model];
    if (!modelPricing) return 0;

    const inputCost = (usage.prompt_tokens || 0) * modelPricing.input;
    const outputCost = (usage.completion_tokens || 0) * modelPricing.output;

    return inputCost + outputCost;
  }

  // 사용량 로깅
  private logUsage(userId: string, provider: string, model: string, usage: any): void {
    const todayKey = `${userId}:${new Date().toISOString().split('T')[0]}`;
    const currentUsage = this.usageLog.get(todayKey) || 0;
    
    this.usageLog.set(todayKey, currentUsage + 1);

    // 사용량 통계 로깅
    console.log(`[AI Usage] ${provider}/${model} - User: ${userId}, Tokens: ${usage.inputTokens}+${usage.outputTokens}, Cost: $${usage.cost.toFixed(6)}, Time: ${usage.responseTime}ms`);
  }

  // 사용량 통계 조회
  getUserUsageStats(userId: string): any {
    const todayKey = `${userId}:${new Date().toISOString().split('T')[0]}`;
    const todayUsage = this.usageLog.get(todayKey) || 0;
    const dailyLimit = parseInt(process.env.AI_DAILY_LIMIT_PER_USER || '50');

    return {
      todayUsage,
      dailyLimit,
      remainingQuota: Math.max(0, dailyLimit - todayUsage),
      usagePercentage: (todayUsage / dailyLimit) * 100
    };
  }

  // Perplexity API 호출 메서드
  async callPerplexityAPI(messages: Array<{ role: string; content: string }>, options: any = {}) {
    if (!this.perplexityApiKey) {
      throw new Error('Perplexity API 키가 설정되지 않았습니다.');
    }

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.perplexityApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: options.model || 'llama-3.1-sonar-small-128k-online',
        messages,
        max_tokens: options.max_tokens || 500,
        temperature: options.temperature || 0.2,
        top_p: options.top_p || 0.9,
        return_images: false,
        return_related_questions: false,
        search_recency_filter: 'month',
        stream: false,
        ...options
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Perplexity API 오류: ${response.status} - ${error}`);
    }

    return await response.json();
  }

  // Claude API 호출 메서드
  async callClaudeAPI(messages: Array<{ role: string; content: string }>, options: any = {}) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('Claude API 키가 설정되지 않았습니다.');
    }

    const response = await this.claude.messages.create({
      model: options.model || 'claude-3-haiku-20240307',
      max_tokens: options.max_tokens || 500,
      temperature: options.temperature || 0.7,
      messages: messages.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      })),
      ...options
    });

    return response;
  }

  // 다중 AI 엔진 분석 (가중치 기반)
  async analyzeWithMultipleEngines(prompt: string, analysisType: string = 'general') {
    const weights = this.getOptimalWeights(analysisType);
    const results: any[] = [];

    // 각 엔진에서 분석 수행 (병렬 처리)
    const promises = [];

    if (weights.openai > 0 && process.env.OPENAI_API_TALEZ || process.env.OPENAI_API_KEY) {
      promises.push(this.analyzeWithOpenAI(prompt, analysisType));
    }
    if (weights.claude > 0 && process.env.ANTHROPIC_API_KEY) {
      promises.push(this.analyzeWithClaude(prompt, analysisType));
    }
    if (weights.gemini > 0 && process.env.GEMINI_API_KEY) {
      promises.push(this.analyzeWithGemini(prompt, analysisType));
    }
    if (weights.perplexity > 0 && process.env.PERPLEXITY_API_KEY) {
      promises.push(this.analyzeWithPerplexity(prompt, analysisType));
    }

    const allResults = await Promise.allSettled(promises);
    
    // 성공한 결과만 수집
    allResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      }
    });

    return this.combineAnalysisResults(results, weights, analysisType);
  }

  // 분석 유형에 따른 최적 가중치 조절
  private getOptimalWeights(analysisType: string): { [key: string]: number } {
    switch (analysisType) {
      case 'behavior':
        return { openai: 0.4, claude: 0.4, gemini: 0.15, perplexity: 0.05 };
      case 'health':
        return { openai: 0.3, claude: 0.3, gemini: 0.25, perplexity: 0.15 };
      case 'training':
        return { openai: 0.35, claude: 0.35, gemini: 0.2, perplexity: 0.1 };
      case 'news':
        return { openai: 0.1, claude: 0.1, gemini: 0.2, perplexity: 0.6 };
      case 'research':
        return { openai: 0.2, claude: 0.2, gemini: 0.2, perplexity: 0.4 };
      default:
        return this.aiWeights;
    }
  }

  // 개별 엔진 분석 메서드들
  private async analyzeWithOpenAI(prompt: string, analysisType: string) {
    const systemPrompt = this.getSystemPrompt(analysisType);
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      max_tokens: 500,
      temperature: 0.7
    });
    return { engine: 'openai', content: response.choices[0]?.message?.content || '' };
  }

  private async analyzeWithClaude(prompt: string, analysisType: string) {
    const systemPrompt = this.getSystemPrompt(analysisType);
    const response = await this.callClaudeAPI([
      { role: 'user', content: `${systemPrompt}\n\n${prompt}` }
    ]);
    const content = response.content?.[0];
    const text = content && typeof content === 'object' && 'text' in content ? content.text : '';
    return { engine: 'claude', content: text };
  }

  private async analyzeWithGemini(prompt: string, analysisType: string) {
    const systemPrompt = this.getSystemPrompt(analysisType);
    const model = this.gemini.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const response = await model.generateContent(`${systemPrompt}\n\n${prompt}`);
    return { engine: 'gemini', content: response.response.text() };
  }

  private async analyzeWithPerplexity(prompt: string, analysisType: string) {
    const systemPrompt = this.getSystemPrompt(analysisType);
    const response = await this.callPerplexityAPI([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt }
    ]);
    return { engine: 'perplexity', content: response.choices[0]?.message?.content || '' };
  }

  // 분석 유형별 시스템 프롬프트
  private getSystemPrompt(analysisType: string): string {
    const prompts = {
      behavior: '반려동물 행동 전문가로서 정확하고 실용적인 조언을 제공해주세요.',
      health: '수의학 전문가로서 반려동물의 건강 상태를 분석하고 조언해주세요.',
      training: '반려동물 훈련 전문가로서 효과적인 훈련 방법을 제안해주세요.',
      news: '최신 반려동물 관련 정보와 트렌드를 제공해주세요.',
      research: '과학적 근거를 바탕으로 반려동물 관련 연구 정보를 제공해주세요.',
      general: '반려동물 전문가로서 도움이 되는 정보를 제공해주세요.'
    };
    return prompts[analysisType] || prompts.general;
  }

  // 다중 엔진 결과 통합
  private combineAnalysisResults(results: any[], weights: any, analysisType: string) {
    if (results.length === 0) {
      throw new Error('모든 AI 엔진에서 분석에 실패했습니다.');
    }

    if (results.length === 1) {
      return {
        combinedAnalysis: results[0].content,
        engines: [results[0].engine],
        analysisType,
        confidence: 0.7
      };
    }

    // 가중치 기반 결과 통합
    const combinedContent = results.map((result, index) => 
      `[${result.engine.toUpperCase()}]: ${result.content}`
    ).join('\n\n');

    return {
      combinedAnalysis: combinedContent,
      engines: results.map(r => r.engine),
      analysisType,
      confidence: Math.min(0.95, 0.6 + (results.length * 0.1)),
      individualResults: results
    };
  }

  // 서비스 상태 확인
  async getServiceStatus(): Promise<{
    openai: { available: boolean; latency?: number };
    claude: { available: boolean; latency?: number };
    gemini: { available: boolean; latency?: number };
    perplexity: { available: boolean; latency?: number };
  }> {
    const results = {
      openai: { available: false, latency: 0 },
      claude: { available: false, latency: 0 },
      gemini: { available: false, latency: 0 },
      perplexity: { available: false, latency: 0 }
    };

    try {
      const start = Date.now();
      await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'test' }],
        max_tokens: 1
      });
      results.openai = { available: true, latency: Date.now() - start };
    } catch (error) {
      console.log('OpenAI 서비스 체크 실패:', error);
    }

    try {
      const start = Date.now();
      await this.claude.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'test' }]
      });
      results.claude = { available: true, latency: Date.now() - start };
    } catch (error) {
      console.log('Claude 서비스 체크 실패:', error);
    }

    try {
      const start = Date.now();
      const model = this.gemini.getGenerativeModel({ model: 'gemini-1.5-flash' });
      await model.generateContent('test');
      results.gemini = { available: true, latency: Date.now() - start };
    } catch (error) {
      console.log('Gemini 서비스 체크 실패:', error);
    }

    try {
      const start = Date.now();
      if (this.perplexityApiKey) {
        const response = await fetch('https://api.perplexity.ai/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.perplexityApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'llama-3.1-sonar-small-128k-online',
            messages: [{ role: 'user', content: 'test' }],
            max_tokens: 10
          })
        });
        
        if (response.ok) {
          results.perplexity = { available: true, latency: Date.now() - start };
        }
      }
    } catch (error) {
      console.log('Perplexity 서비스 체크 실패:', error);
    }

    return results;
  }
}

// 싱글톤 인스턴스
export const aiProxyService = new AIProxyService();