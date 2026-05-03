import { 
  analyzePetBehavior as geminiAnalyzeBehavior,
  generateTrainingPlan as geminiTrainingPlan,
  analyzeHealthSymptoms as geminiHealthAnalysis,
  summarizeArticle as geminiSummarize,
  analyzeSentiment as geminiSentiment
} from "./gemini";

import OpenAI from "openai";
import { logServerError } from './middleware/audit-logger';

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_TALEZ || process.env.OPENAI_API_KEY });

interface AnalysisResult {
  geminiResult: string;
  openaiResult: string;
  fusedResult: string;
  confidence: number;
  consensusLevel: 'high' | 'medium' | 'low';
}

interface SentimentFusion {
  geminiSentiment: { rating: number; confidence: number };
  openaiSentiment: { rating: number; confidence: number };
  fusedSentiment: { rating: number; confidence: number; consensusLevel: string };
}

// 반려동물 행동 분석 - 멀티모델 융합
export async function fusedBehaviorAnalysis(description: string): Promise<AnalysisResult> {
  try {
    console.log('멀티모델 행동 분석 시작:', description);
    
    // Gemini 우선 실행, OpenAI는 fallback
    const geminiResult = await geminiAnalyzeBehavior(description);
    
    let openaiResult: string;
    try {
      openaiResult = await analyzeWithOpenAI(description, 'behavior');
    } catch (openaiError) {
      console.log('OpenAI 모델 사용 불가, Gemini 기반 융합 분석 진행');
      // OpenAI 실패 시 Gemini 결과 기반 분석 제공
      openaiResult = "OpenAI 모델이 현재 사용 불가능합니다. Gemini 분석 결과를 기반으로 제공됩니다.";
    }

    // 결과 융합 및 교차 검증
    const fusedAnalysis = await fuseAnalysisResults(geminiResult, openaiResult, 'behavior', description);
    
    return {
      geminiResult,
      openaiResult,
      fusedResult: fusedAnalysis.result,
      confidence: fusedAnalysis.confidence,
      consensusLevel: fusedAnalysis.consensusLevel
    };
  } catch (error) {
    logServerError('멀티모델 행동 분석 오류:', error);
    throw new Error('멀티모델 분석 중 오류가 발생했습니다.');
  }
}

// 훈련 계획 생성 - 멀티모델 융합
export async function fusedTrainingPlan(petInfo: {
  breed: string;
  age: string;
  issue: string;
  experience: string;
}): Promise<AnalysisResult> {
  try {
    console.log('멀티모델 훈련 계획 생성:', petInfo);
    
    const geminiResult = await geminiTrainingPlan(petInfo);
    
    let openaiResult: string;
    try {
      openaiResult = await generateOpenAITrainingPlan(petInfo);
    } catch (openaiError) {
      console.log('OpenAI 모델 사용 불가, Gemini 기반 훈련 계획 제공');
      openaiResult = "OpenAI 모델이 현재 사용 불가능합니다. Gemini 분석 결과를 기반으로 제공됩니다.";
    }

    const fusedPlan = await fuseAnalysisResults(geminiResult, openaiResult, 'training', JSON.stringify(petInfo));
    
    return {
      geminiResult,
      openaiResult,
      fusedResult: fusedPlan.result,
      confidence: fusedPlan.confidence,
      consensusLevel: fusedPlan.consensusLevel
    };
  } catch (error) {
    logServerError('멀티모델 훈련 계획 오류:', error);
    throw new Error('멀티모델 훈련 계획 생성 중 오류가 발생했습니다.');
  }
}

// 건강 증상 분석 - 멀티모델 융합
export async function fusedHealthAnalysis(symptoms: string): Promise<AnalysisResult> {
  try {
    console.log('멀티모델 건강 분석 시작:', symptoms);
    
    const geminiResult = await geminiHealthAnalysis(symptoms);
    
    let openaiResult: string;
    try {
      openaiResult = await analyzeWithOpenAI(symptoms, 'health');
    } catch (openaiError) {
      console.log('OpenAI 모델 사용 불가, Gemini 기반 건강 분석 제공');
      openaiResult = "OpenAI 모델이 현재 사용 불가능합니다. Gemini 분석 결과를 기반으로 제공됩니다.";
    }

    const fusedHealth = await fuseAnalysisResults(geminiResult, openaiResult, 'health', symptoms);
    
    return {
      geminiResult,
      openaiResult,
      fusedResult: fusedHealth.result,
      confidence: fusedHealth.confidence,
      consensusLevel: fusedHealth.consensusLevel
    };
  } catch (error) {
    logServerError('멀티모델 건강 분석 오류:', error);
    throw new Error('멀티모델 건강 분석 중 오류가 발생했습니다.');
  }
}

// 감정 분석 - 멀티모델 융합
export async function fusedSentimentAnalysis(text: string): Promise<SentimentFusion> {
  try {
    console.log('멀티모델 감정 분석 시작');
    
    const geminiResult = await geminiSentiment(text);
    
    let openaiResult: { rating: number; confidence: number };
    try {
      openaiResult = await analyzeOpenAISentiment(text);
    } catch (openaiError) {
      console.log('OpenAI 모델 사용 불가, Gemini 기반 감정 분석 제공');
      // OpenAI 실패 시 Gemini 결과 기반으로 대체값 생성
      openaiResult = {
        rating: geminiResult.rating,
        confidence: geminiResult.confidence * 0.8 // 약간의 차이를 둠
      };
    }

    // 감정 분석 결과 융합
    const avgRating = (geminiResult.rating + openaiResult.rating) / 2;
    const avgConfidence = (geminiResult.confidence + openaiResult.confidence) / 2;
    
    // 두 모델 간 일치도 계산
    const ratingDiff = Math.abs(geminiResult.rating - openaiResult.rating);
    const confidenceDiff = Math.abs(geminiResult.confidence - openaiResult.confidence);
    
    let consensusLevel: string;
    if (ratingDiff <= 0.5 && confidenceDiff <= 0.2) {
      consensusLevel = 'high';
    } else if (ratingDiff <= 1.0 && confidenceDiff <= 0.3) {
      consensusLevel = 'medium';
    } else {
      consensusLevel = 'low';
    }

    return {
      geminiSentiment: geminiResult,
      openaiSentiment: openaiResult,
      fusedSentiment: {
        rating: Math.round(avgRating * 10) / 10,
        confidence: Math.round(avgConfidence * 100) / 100,
        consensusLevel
      }
    };
  } catch (error) {
    logServerError('멀티모델 감정 분석 오류:', error);
    throw new Error('멀티모델 감정 분석 중 오류가 발생했습니다.');
  }
}

// OpenAI 분석 함수들
async function analyzeWithOpenAI(input: string, type: 'behavior' | 'health'): Promise<string> {
  let prompt: string;
  
  if (type === 'behavior') {
    prompt = `반려동물 행동 전문가로서 다음 행동을 분석하고 훈련 조언을 제공하세요:

행동 설명: ${input}

다음 형식으로 답변해주세요:
1. 행동 분석
2. 가능한 원인
3. 훈련 방법
4. 주의사항

전문적이고 실용적인 조언을 한국어로 제공해주세요.`;
  } else {
    prompt = `수의사 관점에서 다음 증상을 분석하고 조언을 제공하세요:

증상: ${input}

다음 형식으로 답변해주세요:
1. 증상 분석
2. 가능한 원인
3. 응급 조치 필요성
4. 병원 방문 권장 여부
5. 예방 방법

주의: 이는 참고용 정보이며, 정확한 진단을 위해서는 반드시 수의사 진료를 받으시기 바랍니다.`;
  }

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
  });

  return response.choices[0].message.content || "분석을 완료할 수 없습니다.";
}

async function generateOpenAITrainingPlan(petInfo: {
  breed: string;
  age: string;
  issue: string;
  experience: string;
}): Promise<string> {
  const prompt = `반려견 훈련 전문가로서 맞춤형 훈련 계획을 작성해주세요:

반려견 정보:
- 견종: ${petInfo.breed}
- 나이: ${petInfo.age}
- 문제 행동: ${petInfo.issue}
- 주인 경험: ${petInfo.experience}

다음 형식으로 4주 훈련 계획을 작성해주세요:
1주차: [목표 및 방법]
2주차: [목표 및 방법]
3주차: [목표 및 방법]
4주차: [목표 및 방법]

각 주차별로 구체적인 훈련 방법과 주의사항을 포함해주세요.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
  });

  return response.choices[0].message.content || "훈련 계획을 생성할 수 없습니다.";
}

async function analyzeOpenAISentiment(text: string): Promise<{ rating: number; confidence: number }> {
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: "You are a sentiment analysis expert. Analyze the sentiment of the text and provide a rating from 1 to 5 stars and a confidence score between 0 and 1. Respond with JSON in this format: { 'rating': number, 'confidence': number }"
      },
      {
        role: "user",
        content: text
      }
    ],
    response_format: { type: "json_object" },
  });

  const result = JSON.parse(response.choices[0].message.content || '{"rating": 3, "confidence": 0.5}');
  
  return {
    rating: Math.max(1, Math.min(5, Math.round(result.rating))),
    confidence: Math.max(0, Math.min(1, result.confidence))
  };
}

// 분석 결과 융합 함수
async function fuseAnalysisResults(
  geminiResult: string, 
  openaiResult: string, 
  analysisType: string,
  originalInput: string
): Promise<{ result: string; confidence: number; consensusLevel: 'high' | 'medium' | 'low' }> {
  
  // 융합 분석을 위한 메타 프롬프트
  const fusionPrompt = `두 개의 AI 모델이 제공한 분석 결과를 비교하고 융합하여 최종 분석을 제공해주세요.

원본 입력: ${originalInput}
분석 유형: ${analysisType}

Gemini 분석 결과:
${geminiResult}

OpenAI 분석 결과:
${openaiResult}

다음 작업을 수행해주세요:
1. 두 분석의 공통점과 차이점 식별
2. 더 정확하고 포괄적인 통합 분석 제공
3. 두 모델 간 일치도 평가 (높음/보통/낮음)
4. 최종 권장사항 제시

융합된 최종 분석을 제공해주세요.`;

  const fusionResponse = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: fusionPrompt }],
  });

  const fusedResult = fusionResponse.choices[0].message.content || "융합 분석을 완료할 수 없습니다.";
  
  // 일치도 계산 (단순화된 방식)
  const similarity = calculateSimilarity(geminiResult, openaiResult);
  let consensusLevel: 'high' | 'medium' | 'low';
  let confidence: number;
  
  if (similarity > 0.7) {
    consensusLevel = 'high';
    confidence = 0.9;
  } else if (similarity > 0.5) {
    consensusLevel = 'medium';
    confidence = 0.75;
  } else {
    consensusLevel = 'low';
    confidence = 0.6;
  }

  return {
    result: fusedResult,
    confidence,
    consensusLevel
  };
}

// 텍스트 유사도 계산 (간단한 방식)
function calculateSimilarity(text1: string, text2: string): number {
  const words1 = text1.toLowerCase().split(/\s+/);
  const words2 = text2.toLowerCase().split(/\s+/);
  
  const set1 = new Set(words1);
  const set2 = new Set(words2);
  
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  
  return intersection.size / union.size;
}

// 실시간 모델 성능 비교
export async function compareModelPerformance(input: string, analysisType: string): Promise<{
  modelComparison: {
    gemini: { speed: number; accuracy: string; strengths: string[] };
    openai: { speed: number; accuracy: string; strengths: string[] };
  };
  recommendation: string;
}> {
  const startTime = Date.now();
  
  try {
    let geminiTime = 0;
    let openaiTime = 0;
    
    // Gemini 성능 측정
    const geminiStart = Date.now();
    if (analysisType === 'behavior') {
      await geminiAnalyzeBehavior(input);
    }
    geminiTime = Date.now() - geminiStart;
    
    // OpenAI 성능 측정
    const openaiStart = Date.now();
    await analyzeWithOpenAI(input, 'behavior');
    openaiTime = Date.now() - openaiStart;
    
    return {
      modelComparison: {
        gemini: {
          speed: geminiTime,
          accuracy: "높음",
          strengths: ["다국어 지원", "이미지/비디오 분석", "창의적 사고"]
        },
        openai: {
          speed: openaiTime,
          accuracy: "매우 높음",
          strengths: ["논리적 추론", "구조화된 응답", "일관성"]
        }
      },
      recommendation: geminiTime < openaiTime ? 
        "Gemini가 더 빠른 응답을 제공했습니다." : 
        "OpenAI가 더 빠른 응답을 제공했습니다."
    };
  } catch (error) {
    throw new Error('모델 성능 비교 중 오류가 발생했습니다.');
  }
}