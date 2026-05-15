import OpenAI from "openai";
import { z } from "zod";
import { logServerError } from '../middleware/audit-logger';

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_TALEZ || process.env.OPENAI_API_KEY });

// 커리큘럼 모듈 스키마
const CurriculumModuleSchema = z.object({
  title: z.string(),
  description: z.string(),
  duration: z.number(), // minutes
  objectives: z.array(z.string()),
  isFree: z.boolean().optional().default(false),
  content: z.string().optional().default(''),
});

// AI 생성 커리큘럼 스키마
const AICurriculumSchema = z.object({
  title: z.string(),
  description: z.string(),
  category: z.string(),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  duration: z.number(), // total duration in minutes
  modules: z.array(CurriculumModuleSchema),
  trainerName: z.string().optional().default(''),
});

// 가격 제안 스키마
const PricingSuggestionSchema = z.object({
  suggestedPrice: z.number(),
  reasoning: z.string(),
  confidence: z.number().min(0).max(1),
  priceRange: z.object({
    min: z.number(),
    max: z.number()
  })
});

export type AICurriculum = z.infer<typeof AICurriculumSchema>;
export type PricingSuggestion = z.infer<typeof PricingSuggestionSchema>;

/**
 * AI를 사용하여 파일 내용을 분석하고 커리큘럼을 생성합니다.
 */
export async function analyzeCurriculumContent(
  fileContent: string,
  fileName: string,
  additionalContext?: string
): Promise<AICurriculum> {
  try {
    const prompt = `
당신은 반려동물 훈련 커리큘럼 전문가입니다. 다음 파일 내용을 분석하여 체계적인 커리큘럼을 생성해주세요.

파일명: ${fileName}
${additionalContext ? `추가 컨텍스트: ${additionalContext}` : ''}

파일 내용:
${fileContent}

다음 JSON 형식으로 커리큘럼을 생성해주세요:
{
  "title": "커리큘럼 제목",
  "description": "커리큘럼 설명 (목표와 대상을 포함)",
  "category": "카테고리 (기초훈련, 문제행동교정, 어질리티, 사회화, 전문가과정, 재활치료 중 하나)",
  "difficulty": "난이도 (beginner, intermediate, advanced 중 하나)",
  "duration": 전체_소요시간_분단위,
  "modules": [
    {
      "title": "모듈 제목",
      "description": "모듈 설명",
      "duration": 모듈_소요시간_분단위,
      "objectives": ["학습목표1", "학습목표2", "학습목표3"],
      "isFree": false,
      "content": "모듈 상세 내용"
    }
  ],
  "trainerName": "강사명 (파일에서 추출 가능한 경우, 없으면 빈 문자열)"
}

주의사항:
- 각 모듈은 15-120분 사이로 설정
- 전체 커리큘럼은 최소 2개, 최대 12개 모듈로 구성
- 난이도에 따라 적절한 모듈 수와 시간 조정
- 실용적이고 체계적인 학습 순서로 모듈 배치
- 한국어로 생성하되, 전문적이고 명확한 표현 사용
`;

    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "system",
          content: "당신은 반려동물 훈련 전문가이며, 체계적이고 실용적인 커리큘럼을 생성하는 것이 전문입니다. 항상 JSON 형식으로 정확하게 응답해주세요."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
    });

    const aiResult = JSON.parse(response.choices[0].message.content || '{}');
    
    // Zod로 유효성 검증
    const validatedCurriculum = AICurriculumSchema.parse(aiResult);
    
    console.log(`[AI 커리큘럼] ${fileName} 분석 완료:`, {
      title: validatedCurriculum.title,
      modules: validatedCurriculum.modules.length,
      duration: validatedCurriculum.duration
    });

    return validatedCurriculum;
  } catch (error) {
    logServerError('[AI 커리큘럼] 분석 실패:', error);
    throw new Error(`AI 커리큘럼 분석에 실패했습니다: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * AI를 사용하여 커리큘럼의 적정 가격을 제안합니다.
 */
export async function suggestCurriculumPricing(
  curriculum: AICurriculum,
  marketContext?: string
): Promise<PricingSuggestion> {
  try {
    const prompt = `
당신은 반려동물 훈련 교육 시장의 가격 책정 전문가입니다. 다음 커리큘럼의 적정 가격을 제안해주세요.

커리큘럼 정보:
- 제목: ${curriculum.title}
- 설명: ${curriculum.description}
- 카테고리: ${curriculum.category}
- 난이도: ${curriculum.difficulty}
- 총 시간: ${curriculum.duration}분 (${Math.round(curriculum.duration / 60)}시간)
- 모듈 수: ${curriculum.modules.length}개

모듈별 상세:
${curriculum.modules.map((module, index) => 
  `${index + 1}. ${module.title} (${module.duration}분) - ${module.description}`
).join('\n')}

${marketContext ? `시장 컨텍스트: ${marketContext}` : ''}

한국 반려동물 훈련 시장 기준으로 다음 JSON 형식으로 가격을 제안해주세요:
{
  "suggestedPrice": 권장가격_원단위,
  "reasoning": "가격 책정 근거 (시간당 비용, 전문성, 시장 평균 등을 고려한 설명)",
  "confidence": 0.0_to_1.0_신뢰도,
  "priceRange": {
    "min": 최소가격_원단위,
    "max": 최대가격_원단위
  }
}

가격 책정 기준:
- 기초/입문: 시간당 15,000-25,000원
- 중급: 시간당 20,000-35,000원  
- 고급/전문: 시간당 30,000-50,000원
- 개인 레슨 vs 그룹 레슨 고려
- 전문성과 자격증 수준 반영
- 최소 가격: 19,000원, 최대 가격: 500,000원
`;

    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "system",
          content: "당신은 반려동물 훈련 교육업계의 가격 책정 전문가입니다. 시장 상황을 잘 알고 있으며, 합리적이고 경쟁력 있는 가격을 제안합니다."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
    });

    const aiResult = JSON.parse(response.choices[0].message.content || '{}');
    
    // Zod로 유효성 검증
    const validatedPricing = PricingSuggestionSchema.parse(aiResult);
    
    console.log(`[AI 가격책정] ${curriculum.title} 분석 완료:`, {
      price: validatedPricing.suggestedPrice,
      confidence: validatedPricing.confidence
    });

    return validatedPricing;
  } catch (error) {
    logServerError('[AI 가격책정] 분석 실패:', error);
    
    // 폴백 가격 계산
    const fallbackPrice = calculateFallbackPrice(curriculum);
    
    return {
      suggestedPrice: fallbackPrice,
      reasoning: "AI 분석에 실패하여 기본 공식으로 계산된 가격입니다. (기본 시간당 20,000원 × 총 시간 × 난이도 배수)",
      confidence: 0.6,
      priceRange: {
        min: Math.round(fallbackPrice * 0.8),
        max: Math.round(fallbackPrice * 1.3)
      }
    };
  }
}

/**
 * 폴백 가격 계산 (AI 실패시 사용)
 */
function calculateFallbackPrice(curriculum: AICurriculum): number {
  const baseRatePerHour = 20000; // 기본 시간당 20,000원
  const totalHours = curriculum.duration / 60;
  
  // 난이도별 배수
  const difficultyMultiplier = {
    beginner: 0.9,
    intermediate: 1.0,
    advanced: 1.2
  };
  
  let price = baseRatePerHour * totalHours * difficultyMultiplier[curriculum.difficulty];
  
  // 모듈 수에 따른 추가 보정
  if (curriculum.modules.length > 6) {
    price *= 1.05; // 5% 추가
  }
  if (curriculum.modules.length > 8) {
    price *= 1.1; // 10% 추가
  }
  
  // 최소/최대 가격 적용
  price = Math.max(19000, Math.min(500000, Math.round(price / 1000) * 1000));
  
  return price;
}

export { CurriculumModuleSchema, AICurriculumSchema, PricingSuggestionSchema };

// 동물등록증 OCR 결과 스키마 (한국 동물보호관리시스템 등록증)
const RegistrationCardOcrSchema = z.object({
  registrationNumber: z.string().nullable(),
  petName: z.string().nullable(),
  breed: z.string().nullable(),
  birthDate: z.string().nullable(),
  gender: z.string().nullable(),
  ownerName: z.string().nullable(),
  confidence: z.number().min(0).max(1),
  rawText: z.string().optional().default(''),
});

export type RegistrationCardOcrResult = z.infer<typeof RegistrationCardOcrSchema>;

/**
 * 동물등록증/외장칩 등록증 사진에서 동물등록번호 등을 OCR로 추출합니다.
 * 한국 동물보호관리시스템(animal.go.kr) 발급 등록증 형식 기준.
 */
export async function extractRegistrationCardInfo(
  imageBase64: string,
  mimeType: string = 'image/jpeg'
): Promise<RegistrationCardOcrResult> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "system",
          content: "당신은 한국 동물보호관리시스템(animal.go.kr) 동물등록증을 정확히 판독하는 OCR 전문가입니다. 반드시 JSON 형식으로만 응답하세요."
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `이 이미지는 한국 농림축산식품부 동물보호관리시스템에서 발급한 동물등록증(또는 외장칩 등록 영수증/등록증)입니다.
다음 항목을 추출해 JSON으로 응답하세요. 보이지 않는 값은 null로 두세요.

{
  "registrationNumber": "동물등록번호 (보통 15자리 숫자, 410으로 시작. 하이픈/공백 제거하고 숫자만)",
  "petName": "반려동물 이름",
  "breed": "품종",
  "birthDate": "생년월일 (YYYY-MM-DD)",
  "gender": "성별 (수컷/암컷/중성화/미상 중 하나)",
  "ownerName": "보호자 이름 (있으면)",
  "confidence": 0.0~1.0 (등록번호 추출 신뢰도),
  "rawText": "이미지에서 읽어낸 주요 텍스트 요약 (디버그용, 200자 이내)"
}

주의:
- registrationNumber는 반드시 숫자만, 보통 15자리. 410으로 시작하지 않거나 자릿수가 크게 다르면 confidence를 0.5 미만으로.
- 등록증이 아니거나 번호가 전혀 안 보이면 registrationNumber를 null, confidence 0.`
            },
            {
              type: "image_url",
              image_url: { url: `data:${mimeType};base64,${imageBase64}` }
            }
          ]
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 600
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    const parsed = RegistrationCardOcrSchema.parse({
      registrationNumber: result.registrationNumber ?? null,
      petName: result.petName ?? null,
      breed: result.breed ?? null,
      birthDate: result.birthDate ?? null,
      gender: result.gender ?? null,
      ownerName: result.ownerName ?? null,
      confidence: typeof result.confidence === 'number' ? result.confidence : 0,
      rawText: result.rawText ?? '',
    });

    // 등록번호 후처리: 숫자만 남기고 형식 검증
    if (parsed.registrationNumber) {
      const digits = parsed.registrationNumber.replace(/\D/g, '');
      parsed.registrationNumber = digits || null;
    }

    return parsed;
  } catch (error) {
    logServerError('[등록증 OCR] 분석 실패:', error);
    throw new Error(`등록증 OCR 분석에 실패했습니다: ${error instanceof Error ? error.message : String(error)}`);
  }
}

const NoseQualitySchema = z.object({
  overallScore: z.number().min(0).max(100),
  isNoseVisible: z.boolean(),
  isFrontal: z.boolean(),
  isSharp: z.boolean(),
  isCloseEnough: z.boolean(),
  failReasons: z.array(z.string()),
  recommendation: z.string(),
});

export type NoseQualityResult = z.infer<typeof NoseQualitySchema>;

export async function evaluateNoseImageQuality(
  imageBase64: string
): Promise<NoseQualityResult> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "system",
          content: "당신은 반려견 코 인식 전문가입니다. 반려견 코 사진의 품질을 정확히 평가해주세요. 반드시 JSON 형식으로 응답해주세요."
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `이 이미지가 반려견 코 인증에 적합한지 평가해주세요.

다음 JSON 형식으로 응답해주세요:
{
  "overallScore": 0~100 (전체 품질 점수),
  "isNoseVisible": true/false (코가 명확히 보이는지),
  "isFrontal": true/false (정면 촬영인지),
  "isSharp": true/false (선명한지),
  "isCloseEnough": true/false (충분히 가까이 촬영했는지),
  "failReasons": ["실패 사유1", "실패 사유2"],
  "recommendation": "개선 권장 사항"
}

평가 기준:
- 코의 주름 패턴이 선명하게 보여야 합니다
- 정면에서 촬영되어야 합니다
- 코가 이미지의 중앙에 크게 위치해야 합니다
- 흐릿하지 않고 선명해야 합니다
- 적절한 조명이 있어야 합니다`
            },
            {
              type: "image_url",
              image_url: { url: `data:image/jpeg;base64,${imageBase64}` }
            }
          ]
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 512
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    return NoseQualitySchema.parse(result);
  } catch (error) {
    logServerError('[코 품질 평가] 실패:', error);
    return {
      overallScore: 50,
      isNoseVisible: true,
      isFrontal: true,
      isSharp: true,
      isCloseEnough: true,
      failReasons: ["AI 분석에 실패하여 기본값으로 평가되었습니다"],
      recommendation: "재촬영을 권장합니다"
    };
  }
}

const NoseSimilaritySchema = z.object({
  similarityScore: z.number().min(0).max(100),
  matched: z.boolean(),
  confidence: z.number().min(0).max(1),
  details: z.string(),
  failReason: z.string().optional(),
});

export type NoseSimilarityResult = z.infer<typeof NoseSimilaritySchema>;

export async function compareNoseImages(
  registeredImageBase64: string,
  capturedImageBase64: string
): Promise<NoseSimilarityResult> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "system",
          content: "당신은 반려견 코 생체인식 전문가입니다. 두 반려견 코 사진을 비교하여 동일한 개체인지 판단해주세요. 반드시 JSON 형식으로 응답해주세요."
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `두 반려견 코 사진을 비교해주세요.

첫 번째 이미지: 등록된 코 사진 (기준)
두 번째 이미지: 방문 시 촬영한 코 사진 (비교 대상)

다음 JSON 형식으로 응답해주세요:
{
  "similarityScore": 0~100 (유사도 점수, 85 이상이면 동일 개체),
  "matched": true/false (동일 개체 여부),
  "confidence": 0.0~1.0 (판단 신뢰도),
  "details": "비교 상세 설명",
  "failReason": "불일치 시 사유 (일치하면 빈 문자열)"
}

비교 기준:
- 코 주름의 패턴과 형태
- 코의 전체적인 모양과 크기 비율
- 콧구멍의 형태와 간격
- 코 표면의 질감과 특징적인 무늬
- similarityScore 85 이상: 자동 승인 (동일 개체)
- similarityScore 75~84: 재촬영 권장
- similarityScore 75 미만: 불일치`
            },
            {
              type: "image_url",
              image_url: { url: `data:image/jpeg;base64,${registeredImageBase64}` }
            },
            {
              type: "image_url",
              image_url: { url: `data:image/jpeg;base64,${capturedImageBase64}` }
            }
          ]
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 512
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    return NoseSimilaritySchema.parse(result);
  } catch (error) {
    logServerError('[코 비교] 실패:', error);
    return {
      similarityScore: 0,
      matched: false,
      confidence: 0,
      details: "AI 분석에 실패했습니다",
      failReason: "AI 분석 오류가 발생했습니다. 관리자에게 문의하세요."
    };
  }
}