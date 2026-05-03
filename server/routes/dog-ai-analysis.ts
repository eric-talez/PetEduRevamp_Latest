import express from 'express';
import multer from 'multer';
import OpenAI from 'openai';
import { logServerError } from '../middleware/audit-logger';

const router = express.Router();

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { 
    fileSize: 200 * 1024 * 1024
  }
});

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_TALEZ || process.env.OPENAI_API_KEY 
});

const DEFAULT_MODEL = "gpt-4.1";

function safeJsonParse(text: string): any {
  let jsonText = text.trim();

  if (jsonText.includes('```')) {
    const jsonMatch = jsonText.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
    if (jsonMatch) {
      jsonText = jsonMatch[1];
    } else {
      const startIndex = jsonText.indexOf('{');
      const endIndex = jsonText.lastIndexOf('}') + 1;
      if (startIndex >= 0 && endIndex > startIndex) {
        jsonText = jsonText.substring(startIndex, endIndex);
      }
    }
  }

  if (!jsonText.startsWith('{')) {
    const startIndex = jsonText.indexOf('{');
    if (startIndex >= 0) {
      const endIndex = jsonText.lastIndexOf('}') + 1;
      if (endIndex > startIndex) {
        jsonText = jsonText.substring(startIndex, endIndex);
      }
    }
  }

  return JSON.parse(jsonText.trim());
}

export interface DogBehaviorAnalysis {
  timestamp: number;
  behavior: string;
  confidence: number;
  emotion: string;
  intensity: number;
  bodyLanguage?: {
    tail: string;
    ears: string;
    posture: string;
    eyeContact: string;
  };
  postureAnalysis?: {
    isAbnormal: boolean;
    abnormalityType: string;
    description: string;
    severity: string;
    possibleCauses: string[];
    recommendations: string[];
  };
  detailedBehavior?: {
    primaryAction: string;
    secondaryActions: string[];
    movementPattern: string;
    attentionFocus: string;
    energyLevel: string;
  };
  contextualFactors: {
    environment: string;
    triggers: string[];
    socialContext: string;
  };
  recommendations: string[];
  audioFeatures?: {
    frequency: number;
    amplitude: number;
    pitch: string;
    barType: string;
    duration: number;
  };
}

async function analyzeImageFrame(base64Image: string, timestamp: number): Promise<DogBehaviorAnalysis> {
  try {
    const response = await openai.chat.completions.create({
      model: DEFAULT_MODEL,
      max_tokens: 1500,
      messages: [
        {
          role: "system",
          content: `You are an expert canine behaviorist and veterinary specialist. You MUST respond ONLY with a valid JSON object in Korean. Do not include any markdown formatting, explanations, or additional text. Only respond with the JSON object itself.

IMPORTANT: First determine if the image contains a dog. If NO dog is visible, respond with a minimal JSON indicating no dog found.

If a dog IS visible, provide COMPREHENSIVE analysis including:
1. Posture Analysis (자세 분석): 
   - Normal vs Abnormal posture detection
   - Abnormal postures include: limping, head tilting, hunched back, leg dragging, uneven weight distribution, stiff movement, trembling
   - Severity assessment (경미/중간/심각)

2. Detailed Behavior (상세 행동):
   - Primary action (주요 행동)
   - Secondary actions (부차적 행동들)
   - Movement patterns (움직임 패턴)
   - Attention focus (주의 집중 대상)
   - Energy level (에너지 수준)

3. Body Language (신체 언어):
   - Tail position and movement
   - Ear positioning
   - Eye contact and gaze
   - Overall body tension

4. Health Indicators:
   - Signs of pain or discomfort
   - Mobility issues
   - Stress indicators`
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `이미지를 상세하게 분석하세요. 강아지의 자세, 행동, 이상징후를 포함하여 분석하세요. 정확히 이 JSON 형식으로만 응답하세요:

{
  "behavior": "주요 행동 (예: 앉아있음, 서있음, 걷기, 뛰기) 또는 '강아지가 아님'",
  "confidence": 0.85,
  "emotion": "감정 상태 (예: 편안함, 긴장, 호기심, 불안, 기쁨)",
  "intensity": 7,
  "bodyLanguage": {
    "tail": "꼬리 상태",
    "ears": "귀 상태",
    "posture": "전체 자세",
    "eyeContact": "시선"
  },
  "postureAnalysis": {
    "isAbnormal": false,
    "abnormalityType": "정상 또는 이상 유형",
    "description": "자세에 대한 상세 설명",
    "severity": "정상/경미/중간/심각",
    "possibleCauses": ["가능한 원인들"],
    "recommendations": ["수의사 권고사항"]
  },
  "detailedBehavior": {
    "primaryAction": "주요 행동",
    "secondaryActions": ["부차적 행동들"],
    "movementPattern": "움직임 패턴",
    "attentionFocus": "주의 집중 대상",
    "energyLevel": "에너지 수준"
  },
  "contextualFactors": {
    "environment": "환경 설명",
    "triggers": ["관찰된 자극 요인들"],
    "socialContext": "사회적 상황"
  },
  "recommendations": ["행동 및 건강 관련 제안사항들"]
}`
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`
              }
            }
          ]
        }
      ]
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response content');
    }

    const analysisData = safeJsonParse(content);

    return {
      timestamp,
      behavior: analysisData.behavior,
      confidence: Math.min(Math.max(analysisData.confidence, 0), 1),
      emotion: analysisData.emotion,
      intensity: Math.min(Math.max(analysisData.intensity, 1), 10),
      bodyLanguage: analysisData.bodyLanguage,
      postureAnalysis: analysisData.postureAnalysis,
      detailedBehavior: analysisData.detailedBehavior,
      contextualFactors: analysisData.contextualFactors,
      recommendations: analysisData.recommendations
    };

  } catch (error) {
    logServerError('Image analysis error:', error);
    return {
      timestamp,
      behavior: "분석 실패",
      confidence: 0.1,
      emotion: "분석 불가",
      intensity: 0,
      bodyLanguage: {
        tail: "분석 불가",
        ears: "분석 불가",
        posture: "분석 불가",
        eyeContact: "분석 불가"
      },
      postureAnalysis: {
        isAbnormal: false,
        abnormalityType: "분석 불가",
        description: "이미지 분석에 실패했습니다",
        severity: "분석 불가",
        possibleCauses: [],
        recommendations: []
      },
      detailedBehavior: {
        primaryAction: "분석 불가",
        secondaryActions: [],
        movementPattern: "분석 불가",
        attentionFocus: "분석 불가",
        energyLevel: "분석 불가"
      },
      contextualFactors: {
        environment: "분석 불가",
        triggers: ["이미지 분석 오류"],
        socialContext: "분석 불가"
      },
      recommendations: ["이미지 품질을 확인하고 다시 시도해주세요", "강아지가 선명하게 보이는 이미지를 사용해주세요"]
    };
  }
}

async function analyzeAudioSegment(audioSize: number, timestamp: number, duration: number): Promise<DogBehaviorAnalysis> {
  try {
    const estimatedAmplitude = Math.min(audioSize / 10000, 1);

    const response = await openai.chat.completions.create({
      model: DEFAULT_MODEL,
      max_tokens: 1000,
      messages: [
        {
          role: "system",
          content: `You are an expert in canine vocal communication. You MUST respond ONLY with a valid JSON object in Korean. No markdown formatting or additional text.

Analyze dog vocalizations for:
- Bark type (짖음 유형): warning bark, playful bark, anxious whine, howl, growl
- Emotional state from vocalization
- Intensity and urgency of the sound`
        },
        {
          role: "user",
          content: `음성 분석 정보: 타임스탬프 ${timestamp}초, 지속시간 ${duration}초, 음량 ${Math.round(estimatedAmplitude * 100)}%.

강아지 짖음을 분석하세요. 정확히 이 JSON 형식으로만 응답:

{"behavior": "음성행동 (예: 경고 짖음, 놀이 짖음, 불안 울음)", "confidence": 0.8, "emotion": "감정", "intensity": 6, "audioFeatures": {"frequency": 350, "amplitude": 0.7, "pitch": "중간", "barType": "짖기 유형", "duration": ${duration}}, "contextualFactors": {"environment": "환경", "triggers": ["자극"], "socialContext": "소통"}, "recommendations": ["제안"]}`
        }
      ]
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response content');
    }

    const analysisData = safeJsonParse(content);

    return {
      timestamp,
      behavior: analysisData.behavior,
      confidence: Math.min(Math.max(analysisData.confidence, 0), 1),
      emotion: analysisData.emotion,
      intensity: Math.min(Math.max(analysisData.intensity, 1), 10),
      bodyLanguage: {
        tail: "음성 전용",
        ears: "음성 전용",
        posture: "음성 전용",
        eyeContact: "음성 전용"
      },
      contextualFactors: analysisData.contextualFactors,
      recommendations: analysisData.recommendations,
      audioFeatures: analysisData.audioFeatures
    };

  } catch (error) {
    logServerError('Audio analysis error:', error);
    return {
      timestamp,
      behavior: "음성 분석 오류",
      confidence: 0.1,
      emotion: "알 수 없음",
      intensity: 5,
      bodyLanguage: {
        tail: "음성 전용",
        ears: "음성 전용",
        posture: "음성 전용",
        eyeContact: "음성 전용"
      },
      contextualFactors: {
        environment: "분석 불가",
        triggers: ["음성 분석 오류"],
        socialContext: "분석 불가"
      },
      recommendations: ["다시 시도해주세요"],
      audioFeatures: {
        frequency: 0,
        amplitude: 0,
        pitch: "알 수 없음",
        barType: "알 수 없음",
        duration: duration
      }
    };
  }
}

router.post('/analyze-frame', upload.single('frame'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '이미지 파일이 필요합니다' });
    }

    const { timestamp } = req.body;
    const base64Image = req.file.buffer.toString('base64');
    
    const analysis = await analyzeImageFrame(base64Image, parseFloat(timestamp) || 0);
    res.json(analysis);

  } catch (error) {
    logServerError('Frame analysis error:', error, req);
    res.status(500).json({ error: '프레임 분석 중 오류가 발생했습니다' });
  }
});

router.post('/analyze-audio', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '오디오 파일이 필요합니다' });
    }

    const { timestamp, duration } = req.body;
    
    const analysis = await analyzeAudioSegment(
      req.file.buffer.length, 
      parseFloat(timestamp) || 0,
      parseFloat(duration) || 1
    );
    
    res.json(analysis);

  } catch (error) {
    logServerError('Audio analysis error:', error, req);
    res.status(500).json({ error: '오디오 분석 중 오류가 발생했습니다' });
  }
});

router.post('/analyze-metadata', express.json(), async (req, res) => {
  try {
    const { filename, fileType, duration } = req.body;
    
    if (!filename || !fileType || !duration) {
      return res.status(400).json({ error: '필수 파라미터가 누락되었습니다' });
    }

    const analysis = {
      behavior: "파일 메타데이터 분석",
      confidence: 0.5,
      emotion: "분석 대기",
      intensity: 5,
      contextualFactors: {
        environment: `${fileType} 파일`,
        triggers: [`파일명: ${filename}`, `길이: ${duration}초`],
        socialContext: "파일 업로드"
      },
      recommendations: ["상세 분석을 위해 파일 업로드를 진행해주세요"]
    };

    res.json(analysis);

  } catch (error) {
    logServerError('Metadata analysis error:', error, req);
    res.status(500).json({ error: '메타데이터 분석 중 오류가 발생했습니다' });
  }
});

router.post('/calculate-metrics', express.json(), async (req, res) => {
  try {
    const { analyses } = req.body;
    
    if (!Array.isArray(analyses)) {
      return res.status(400).json({ error: '분석 데이터 배열이 필요합니다' });
    }

    const avgIntensity = analyses.length > 0 
      ? analyses.reduce((sum, a) => sum + (a.intensity || 0), 0) / analyses.length 
      : 5;
    const avgConfidence = analyses.length > 0 
      ? analyses.reduce((sum, a) => sum + (a.confidence || 0), 0) / analyses.length 
      : 0.5;
    
    const metrics = {
      overallMood: analyses.length > 0 ? analyses[analyses.length - 1].emotion : "평가 중",
      stressLevel: Math.round(avgIntensity * 0.6),
      activityLevel: Math.round(avgIntensity * 0.8),
      socialResponsiveness: Math.round(avgConfidence * 10),
      alertness: Math.round(avgIntensity * 0.7)
    };

    res.json(metrics);

  } catch (error) {
    logServerError('Metrics calculation error:', error, req);
    res.status(500).json({ error: '메트릭스 계산 중 오류가 발생했습니다' });
  }
});

router.post('/generate', express.json(), async (req, res) => {
  try {
    const { dogId, surveyData, motionData, behaviorData } = req.body;

    const response = await openai.chat.completions.create({
      model: DEFAULT_MODEL,
      max_tokens: 2000,
      messages: [
        {
          role: "system",
          content: `당신은 반려견 행동 분석 전문가입니다. 수집된 음성/행동 데이터를 분석하여 종합적인 리포트를 생성합니다. JSON 형식으로만 응답하세요.`
        },
        {
          role: "user",
          content: `다음 분석 데이터를 바탕으로 종합 리포트를 생성하세요:

음성 분석 데이터: ${JSON.stringify(motionData || [])}
행동 분석 데이터: ${JSON.stringify(behaviorData || [])}
설문 데이터: ${JSON.stringify(surveyData || {})}

다음 JSON 형식으로 응답하세요:
{
  "executiveSummary": "전반적 요약",
  "overallScore": 75,
  "wellbeingIndex": 7.5,
  "motionAnalysisSummary": {"totalAnalyses": 0, "avgConfidence": 0, "dominantEmotion": "", "patterns": []},
  "behaviorAnalysisSummary": {"totalAnalyses": 0, "avgIntensity": 0, "commonBehaviors": [], "concerns": []},
  "surveyInsights": {"strengths": [], "areasForImprovement": [], "lifestyle": ""},
  "correlationAnalysis": {"patterns": [], "insights": []},
  "aiRecommendations": ["추천사항1", "추천사항2"],
  "healthAlerts": ["경고1"],
  "trainingAdvice": ["조언1", "조언2"]
}`
        }
      ]
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response content');
    }

    const report = safeJsonParse(content);
    res.json(report);

  } catch (error) {
    logServerError('Report generation error:', error, req);
    res.status(500).json({ 
      error: '리포트 생성 중 오류가 발생했습니다',
      executiveSummary: "리포트 생성에 실패했습니다. 다시 시도해주세요.",
      overallScore: 0,
      wellbeingIndex: 0,
      motionAnalysisSummary: {},
      behaviorAnalysisSummary: {},
      surveyInsights: {},
      correlationAnalysis: {},
      aiRecommendations: [],
      healthAlerts: [],
      trainingAdvice: []
    });
  }
});

export default router;
