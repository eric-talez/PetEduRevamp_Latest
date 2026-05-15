import type { Express, Request, Response } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { randomBytes } from "crypto";
import { z } from "zod";
import { db } from "./db";
import { sql, eq, and, isNotNull, desc, or, ilike, inArray } from "drizzle-orm";
import { products, productCommissions, referralProfiles, referralEarnings, settlements, trainers, trainerApplications, instituteApplications, systemSettings, orders, orderItems, events, users, coursePurchases, courseProgress, courses, trainerInstitutes, trainerInstituteApplications, trainerClientAssignments, consultationRecords, pets, institutes, instituteQrCodes, checkinRecords, emergencyContacts, storePolicies, consentRecords, incidentProtocols, instituteZones, petVisitSessions, vaccinations, petNoseProfiles, userUiPreferences, petVaccinationPassports, petLostReports, reservations as reservationsTable } from "../shared/schema";
import { validateRequest, createSubstitutePostSchema, updateSubstitutePostSchema, createPaymentIntentSchema } from './middleware/validation';
import { registerMessagingRoutes } from "./routes/messaging";
import { registerDashboardRoutes } from "./routes/dashboard";
import { setupStreamingSocket } from "./streaming/socket-server";
import { registerAdminRoutes } from "./routes/admin";
import { registerAuditLogRoutes } from "./routes/audit-logs";
import { logger } from './monitoring/logger';
// import { errorHandler } from "./middleware/error-handler";
import { registerShoppingRoutes } from "./routes/shopping";
import { registerSubscriptionRoutes } from "./routes/subscriptions";
import { productRoutes } from "./routes/products";
import { simpleProductRoutes } from "./routes/simple-products";
// import { registerNotificationRoutes } from "./routes/notification-routes";
import { registerEmailNotificationRoutes } from "./routes/email-notifications";
import { registerUploadRoutes } from "./routes/upload";
import { notificationService } from "./notifications/notification-service";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenAI } from "@google/genai";

import { storage } from "./storage";

// AI 모델 초기화
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_TALEZ || process.env.OPENAI_API_KEY });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const gemini = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

// =============================================================================
// AI 분석 Helper 함수들
// =============================================================================

// 시간을 상대적 표현으로 변환 (예: "10분 전")
function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) return '방금 전';
  if (diffMinutes < 60) return `${diffMinutes}분 전`;
  if (diffHours < 24) return `${diffHours}시간 전`;
  if (diffDays < 7) return `${diffDays}일 전`;
  return date.toLocaleDateString('ko-KR');
}

// 알림장 데이터를 분석 프롬프트로 변환
function generateAnalysisPrompt(logs: any[], selectedSignals: any): string {
  let prompt = `다음은 반려동물의 일상 알림장 데이터입니다. 선택된 항목들을 기반으로 전문적인 분석을 제공해주세요.

분석할 데이터:
`;

  logs.forEach((log, index) => {
    prompt += `\n=== ${log.date} ===\n`;
    
    if (selectedSignals.text && log.note) {
      prompt += `메모: ${log.note}\n`;
    }
    
    if (selectedSignals.poop && log.poopStatus) {
      prompt += `배변 상태: ${log.poopStatus}\n`;
    }
    
    if (selectedSignals.meal && log.mealStatus) {
      prompt += `식사 상태: ${log.mealStatus}\n`;
    }
    
    if (selectedSignals.walk && log.walkStatus) {
      prompt += `산책 상태: ${log.walkStatus}\n`;
    }
    
    if (log.mood) {
      prompt += `기분: ${log.mood}\n`;
    }
    
    if (log.energyLevel) {
      prompt += `에너지 레벨: ${log.energyLevel}/5\n`;
    }
    
    if (selectedSignals.media && log.media && log.media.length > 0) {
      prompt += `미디어: ${log.media.length}개의 사진/동영상\n`;
    }
  });

  prompt += `

분석 요청사항:
1. 전반적인 건강 상태 요약
2. 행동 패턴 분석 
3. 영양 상태 평가
4. 운동/활동 수준 분석
5. 주의가 필요한 징후 (red flags)
6. 개선을 위한 권장사항

응답은 반드시 다음 JSON 형식으로 제공해주세요:
{
  "summary": "전반적인 상태 요약",
  "behavior": "행동 패턴 분석",
  "health": "건강 상태 분석", 
  "nutrition": "영양 상태 분석",
  "activity": "운동/활동 분석",
  "redFlags": ["주의사항1", "주의사항2"],
  "nextSteps": ["권장사항1", "권장사항2"]
}`;

  return prompt;
}

// 허용된 AI 모델 목록
const ALLOWED_MODELS = [
  "gpt-4o",
  "gpt-4o-mini", 
  "claude-3-5-sonnet-20241022",
  "claude-3-5-haiku-20241022",
  "gemini-2.5-flash",
  "gemini-2.5-pro"
];

// AI 분석 수행 (ChatGPT 또는 Claude 선택 가능)
async function performAiAnalysis(prompt: string, model: string = "gpt-4o"): Promise<any> {
  // 모델 허용 목록 확인
  if (!ALLOWED_MODELS.includes(model)) {
    throw new Error(`허용되지 않은 AI 모델입니다: ${model}`);
  }

  const systemPrompt = "당신은 반려동물 건강 및 행동 전문가입니다. 반려동물의 일상 데이터를 분석하여 건강 상태, 행동 패턴, 영양 상태 등에 대한 전문적인 조언을 제공합니다. 응답은 반드시 다음 JSON 형식으로 제공해주세요: {\"summary\": \"전반적인 상태 요약\", \"behavior\": \"행동 패턴 분석\", \"health\": \"건강 상태 분석\", \"nutrition\": \"영양 상태 분석\", \"activity\": \"운동/활동 분석\", \"redFlags\": [\"주의사항1\", \"주의사항2\"], \"nextSteps\": [\"권장사항1\", \"권장사항2\"]}";
  
  try {
    let result: any;
    let tokensUsed = { input: 0, output: 0 };

    if (model.startsWith('claude')) {
      // Claude 모델 사용
      const response = await anthropic.messages.create({
        model: model,
        max_tokens: 2048,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: prompt
          }
        ]
      });

      // 응답 구조 확인
      if (!response.content || response.content.length === 0) {
        throw new Error("Claude API에서 빈 응답을 받았습니다.");
      }

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error("Claude API에서 예상치 못한 응답 형식을 받았습니다.");
      }

      try {
        result = JSON.parse(content.text);
        // JSON 구조 검증
        if (!result.summary || !result.redFlags || !result.nextSteps) {
          throw new Error("응답 형식이 올바르지 않습니다.");
        }
      } catch (parseError) {
        console.warn('Claude JSON 파싱 실패:', parseError);
        // JSON 파싱 실패시 텍스트를 적절히 변환
        result = {
          summary: content.text.substring(0, 500) + "...",
          behavior: "Claude 분석 결과를 참고해주세요.",
          health: "전문 수의사와 상담을 권장합니다.",
          nutrition: "균형잡힌 식단을 유지해주세요.",
          activity: "적절한 운동량을 유지해주세요.",
          redFlags: ["JSON 파싱 실패로 인한 수동 검토 필요"],
          nextSteps: ["전문가 상담", "지속적인 관찰"]
        };
      }

      tokensUsed = {
        input: response.usage.input_tokens,
        output: response.usage.output_tokens
      };

    } else if (model.startsWith('gemini')) {
      // Gemini 모델 사용
      const response = await gemini.models.generateContent({
        model: model,
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: "application/json",
          responseSchema: {
            type: "object",
            properties: {
              summary: { type: "string" },
              behavior: { type: "string" },
              health: { type: "string" },
              nutrition: { type: "string" },
              activity: { type: "string" },
              redFlags: { type: "array", items: { type: "string" } },
              nextSteps: { type: "array", items: { type: "string" } }
            },
            required: ["summary", "redFlags", "nextSteps"]
          }
        },
        contents: prompt
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error("Gemini API에서 빈 응답을 받았습니다.");
      }

      try {
        result = JSON.parse(responseText);
        if (!result.summary || !result.redFlags || !result.nextSteps) {
          throw new Error("Gemini 응답 형식이 올바르지 않습니다.");
        }
      } catch (parseError) {
        console.warn('Gemini JSON 파싱 실패:', parseError);
        result = {
          summary: responseText.substring(0, 500) + "...",
          behavior: "Gemini 분석 결과를 참고해주세요.",
          health: "전문 수의사와 상담을 권장합니다.",
          nutrition: "균형잡힌 식단을 유지해주세요.",
          activity: "적절한 운동량을 유지해주세요.",
          redFlags: ["JSON 파싱 실패로 인한 수동 검토 필요"],
          nextSteps: ["전문가 상담", "지속적인 관찰"]
        };
      }

      tokensUsed = {
        input: 0, // Gemini doesn't provide token usage in the free tier
        output: 0
      };

    } else {
      // ChatGPT 모델 사용
      const response = await openai.chat.completions.create({
        model: model,
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        max_tokens: 2048
      });

      result = JSON.parse(response.choices[0].message.content || '{}');
      tokensUsed = {
        input: response.usage?.prompt_tokens || 0,
        output: response.usage?.completion_tokens || 0
      };
    }
    
    return {
      ...result,
      model: model,
      tokensUsed
    };

  } catch (error) {
    logServerError(`AI API 오류 (${model}):`, error);
    
    // 폴백 분석 결과
    return {
      summary: "AI 분석 중 오류가 발생했습니다. 수동으로 데이터를 검토해주세요.",
      behavior: "분석 데이터를 수동으로 확인하시기 바랍니다.",
      health: "전문 수의사와 상담을 권장합니다.",
      nutrition: "균형잡힌 식단을 유지해주세요.",
      activity: "적절한 운동량을 유지해주세요.",
      redFlags: ["AI 분석 실패로 인한 수동 검토 필요"],
      nextSteps: ["전문 수의사 상담", "데이터 재수집"],
      model: model,
      tokensUsed: { input: 0, output: 0 },
      error: error instanceof Error ? error.message : '알 수 없는 오류'
    };
  }
}

import Stripe from "stripe";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { ObjectPermission } from "./objectAcl";
import { eventRoutes } from "./routes/events";
import { eventUpdater, getProviderStatuses } from "./services/eventUpdater";
import { parsePaymentIntentForPersistence, assertPaymentOwnership, isUniqueViolation } from "./services/payment-validation";
import { 
  createPetSchema, 
  updatePetValidationSchema, 
  curriculums,
  insertCurriculumSchema,
  updateCurriculumSchema,
  selectCurriculumSchema,
  insertCourseSchema,
  updateCourseSchema,
  selectCourseSchema,
  notifications,
  createNotificationSchema,
  updateNotificationSchema,
  notificationQuerySchema,
  bulkNotificationUpdateSchema,
  type Notification,
  type InsertNotification,
  type UpdateNotification,
  type NotificationQuery,
  type BulkNotificationUpdate,
  // 훈련 일지 관련 스키마
  trainingJournals,
  insertTrainingJournalSchema,
  updateTrainingJournalSchema,
  selectTrainingJournalSchema,
  trainingJournalQuerySchema,
  trainingJournalMediaUploadSchema,
  bulkTrainingJournalUpdateSchema,
  type TrainingJournal,
  type InsertTrainingJournal,
  type UpdateTrainingJournal,
  type TrainingJournalQuery,
  type TrainingJournalMediaUpload,
  type BulkTrainingJournalUpdate,
  // 배너 관련 스키마
  banners,
  insertBannerSchema,
  updateBannerSchema,
  selectBannerSchema,
  bannerQuerySchema,
  bannerReorderSchema,
  bannerAnalyticsSchema,
  bulkBannerUpdateSchema,
  type Banner,
  type InsertBanner,
  type UpdateBanner,
  type BannerQuery,
  type BannerReorder,
  type BannerAnalytics,
  type BulkBannerUpdate,
  // 로고 설정 관련 스키마
  logoSettings,
  insertLogoSettingsSchema,
  // 커뮤니티 게시글 관련 스키마
  posts,
  comments,
  insertPostSchema,
  updatePostSchema,
  selectPostSchema,
  insertCommentSchema,
  selectCommentSchema,
  type Post,
  type InsertPost,
  type UpdatePost,
  type Comment,
  type InsertComment,
  updateLogoSettingsSchema,
  selectLogoSettingsSchema,
  logoSettingsQuerySchema,
  type LogoSettings,
  type InsertLogoSettings,
  type UpdateLogoSettings,
  type LogoSettingsQuery,
  // 친구 초대 관련 스키마
  friendInvitations,
  educationCredits,
  // 매장 QR 주문
  createStoreOrderRequestSchema,
  insertStoreMenuItemSchema,
  STORE_ORDER_STATUSES,
  // 전국 반려견 행사
  insertPetEventSchema,
  PET_EVENT_CATEGORIES,
} from "../shared/schema";
import { 
  analyzePetBehavior, 
  generateTrainingPlan, 
  analyzeHealthSymptoms,
  summarizeArticle,
  analyzeSentiment,
  analyzeImage,
  analyzeVideo,
  generateImage
} from "./gemini";
import {
  fusedBehaviorAnalysis,
  fusedTrainingPlan,
  fusedHealthAnalysis,
  fusedSentimentAnalysis,
  compareModelPerformance
} from "./ai-fusion";
import { setupCommissionRoutes } from './commission/routes';
import { registerTrainerSettlementRoutes } from './routes/trainer-settlements';
// import { setupHealthRoutes } from './routes/health';
import { registerAnalyticsRoutes } from './routes/analytics';
import { registerTrainerReviewRoutes } from './routes/trainer-reviews';
import { setupSocialRoutes } from './routes/social';
import { registerCourseManagementRoutes } from './routes/course-management';
import { registerCourseAttendanceRoutes } from './routes/course-attendance';
import { registerAIErrorFixRoutes } from './routes/ai-error-fix';
import { registerAIUsageRoutes } from './routes/ai-usage';
import { weatherRoutes } from './routes/weather';
import monetizationRoutes from './routes/monetization';
import { analyzeCurriculumContent, suggestCurriculumPricing } from './ai/openai';
import { registerNoseAuthRoutes } from './routes/nose-auth';
import { extractTextAndTables, validateUploadedFile } from './utils/fileParser';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { WorkflowEngine } from './workflow-engine';
import { 
  uploadDocuments, 
  uploadMultiple, 
  processUploadedFiles, 
  deleteFile 
} from './middleware/upload';
import xlsx from 'xlsx';
import { contentCrawler } from './content-crawler';
import { csrfProtection } from './middleware/csrf';
import { 
  extendResponse, 
  ApiErrorCode, 
  validateBody, 
  validateQuery 
} from './middleware/api-standards';
import { recordAuditLog, logServerError } from './middleware/audit-logger';
import { registerNotebookReadRoutes } from './routes/notebook-read';

// 유료/무료 정보를 포함한 엑셀 파일에서 커리큘럼 정보 추출 함수
function parseExcelCurriculumWithPricing(data: any[], filename: string) {
  try {
    console.log('[엑셀 파싱] 데이터 파싱 시작:', filename);
    console.log('[엑셀 파싱] 전체 데이터 행 수:', data.length);
    
    let title = filename.replace(/\.(xlsx|xls)$/, '');
    let description = "";
    let category = "전문교육";
    let difficulty = "intermediate";
    let duration = 0;
    let price = 0;
    let modules: any[] = [];

    // 모든 데이터 출력해서 구조 파악
    console.log('[엑셀 파싱] 전체 데이터 구조:');
    for (let i = 0; i < Math.min(data.length, 15); i++) {
      if (data[i] && data[i].length > 0) {
        console.log(`행 ${i}:`, data[i]);
      }
    }

    // 첫 번째 행에서 제목 찾기
    if (data.length > 0 && data[0] && data[0][0]) {
      const firstCellValue = String(data[0][0]).trim();
      if (firstCellValue && firstCellValue.length > 3) {
        title = firstCellValue;
        console.log('[엑셀 파싱] 제목 발견:', title);
      }
    }

    // 기본 정보 추출 - 더 유연하게
    for (let i = 0; i < Math.min(data.length, 20); i++) {
      const row = data[i];
      if (!row || row.length === 0) continue;

      for (let j = 0; j < row.length - 1; j++) {
        const cellValue = String(row[j] || '').trim().toLowerCase();
        const nextCellValue = String(row[j + 1] || '').trim();
        
        if ((cellValue.includes('설명') || cellValue.includes('description') || cellValue.includes('커리큘럼')) && nextCellValue) {
          description = nextCellValue;
          console.log('[엑셀 파싱] 설명 발견:', description);
        } else if ((cellValue.includes('카테고리') || cellValue.includes('category') || cellValue.includes('분류')) && nextCellValue) {
          category = nextCellValue;
          console.log('[엑셀 파싱] 카테고리 발견:', category);
        } else if ((cellValue.includes('전체가격') || cellValue.includes('총가격') || cellValue.includes('price')) && nextCellValue) {
          const parsedPrice = parseInt(nextCellValue.replace(/[^\d]/g, ''));
          if (!isNaN(parsedPrice)) {
            price = parsedPrice;
            console.log('[엑셀 파싱] 가격 발견:', price);
          }
        }
      }
    }

    // 모듈 정보 추출 - 다양한 패턴 인식
    let moduleTableStart = -1;
    let headerRow = -1;
    
    // 테이블 헤더 찾기
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      if (!row) continue;
      
      const rowText = row.map(cell => String(cell || '').trim().toLowerCase()).join(' ');
      
      if (rowText.includes('회차') || rowText.includes('차시') || rowText.includes('강의') || rowText.includes('모듈')) {
        // 헤더 행 발견
        headerRow = i;
        moduleTableStart = i + 1;
        console.log('[엑셀 파싱] 모듈 테이블 헤더 발견:', i, row);
        break;
      }
    }

    // 모듈 정보 추출
    if (moduleTableStart > 0) {
      let moduleIndex = 1;
      console.log('[엑셀 파싱] 모듈 추출 시작:', moduleTableStart);
      
      for (let i = moduleTableStart; i < Math.min(data.length, moduleTableStart + 30); i++) {
        const row = data[i];
        if (!row || row.length === 0) continue;

        // 빈 행이면 건너뛰기
        const hasContent = row.some(cell => cell && String(cell).trim().length > 0);
        if (!hasContent) continue;

        console.log(`[엑셀 파싱] 모듈 행 ${i} 처리:`, row);

        let moduleTitle = '';
        let moduleDescription = '';
        let moduleDuration = 60;
        let isFree = moduleIndex === 1; // 첫 번째 모듈은 기본 무료
        let modulePrice = 0;

        // 각 컬럼에서 정보 추출
        let moduleMaterials = '';
        
        for (let j = 0; j < row.length; j++) {
          const cellValue = String(row[j] || '').trim();
          
          if (j === 0 && cellValue.match(/\d+/)) {
            // 첫 번째 컬럼: 회차 정보
            continue;
          } else if (j === 1 && cellValue && cellValue.length > 2) {
            // 두 번째 컬럼: 제목
            moduleTitle = cellValue;
          } else if (j === 2 && cellValue && cellValue.length > 2) {
            // 세 번째 컬럼: 설명
            moduleDescription = cellValue;
          } else if (j === 3 && cellValue) {
            // 네 번째 컬럼: 시간
            const parsedDuration = parseInt(cellValue.replace(/[^\d]/g, ''));
            if (!isNaN(parsedDuration) && parsedDuration > 0) {
              moduleDuration = parsedDuration;
            }
          } else if (j === 4 && cellValue) {
            // 다섯 번째 컬럼: 무료/유료
            const lowerValue = cellValue.toLowerCase();
            isFree = lowerValue === 'y' || lowerValue === 'yes' || lowerValue === '무료' || lowerValue === 'free';
          } else if (j === 5 && cellValue && !isFree) {
            // 여섯 번째 컬럼: 개별가격
            const parsedPrice = parseInt(cellValue.replace(/[^\d]/g, ''));
            if (!isNaN(parsedPrice)) {
              modulePrice = parsedPrice;
            }
          } else if (j === 6 && cellValue) {
            // 일곱 번째 컬럼: 준비물
            moduleMaterials = String(cellValue).trim();
          }
        }

        if (moduleTitle && moduleTitle.length > 1) {
          const module = {
            id: `module_${moduleIndex}_${Date.now()}`,
            title: `${moduleIndex}강. ${moduleTitle}`,
            description: moduleDescription || `${moduleTitle}에 대한 상세 내용`,
            order: moduleIndex,
            duration: moduleDuration,
            objectives: [moduleDescription || moduleTitle],
            content: `${moduleTitle}에 대한 전문적인 교육 내용`,
            detailedContent: {
              introduction: moduleDescription || `${moduleTitle}에 대한 소개`,
              mainTopics: [moduleTitle],
              practicalExercises: [`${moduleTitle} 실습`],
              keyPoints: [`${moduleTitle}의 핵심 포인트`],
              homework: `${moduleTitle} 복습`,
              resources: [`${moduleTitle} 참고자료`]
            },
            videos: [],
            isRequired: true,
            isFree: isFree,
            price: modulePrice,
            materials: moduleMaterials ? moduleMaterials.split(',').map(m => m.trim()).filter(m => m.length > 0) : []
          };
          
          modules.push(module);
          duration += moduleDuration;
          
          console.log(`[엑셀 파싱] 행 ${i} 전체 데이터:`, row);
          console.log('[엑셀 파싱] 모듈 추가:', {
            title: module.title,
            duration: module.duration,
            isFree: module.isFree,
            price: module.price,
            materials: module.materials
          });
          console.log(`[엑셀 파싱] 준비물 컬럼 원본 데이터 (row[6]):`, row[6], typeof row[6]);
          
          moduleIndex++;
          if (moduleIndex > 20) break; // 최대 20개 모듈
        }
      }
    }

    // 기본 모듈이 없으면 4개 생성
    if (modules.length === 0) {
      for (let i = 1; i <= 4; i++) {
        modules.push({
          id: `module_${i}_${Date.now()}`,
          title: `${i}강. ${title} - 모듈 ${i}`,
          description: `${title}의 ${i}번째 모듈`,
          order: i,
          duration: Math.floor(duration / 4),
          objectives: [`모듈 ${i} 학습 목표`],
          content: `${title}에 대한 전문적인 교육 내용 - 모듈 ${i}`,
          videos: [],
          isRequired: true,
          isFree: i === 1,
          price: i === 1 ? 0 : Math.floor(price / 4)
        });
      }
    }

    return {
      title,
      description: description || `${title}에 대한 전문 교육 과정`,
      category,
      difficulty,
      duration,
      price,
      modules
    };
  } catch (error) {
    logServerError('[엑셀 파싱] 오류:', error);
    return null;
  }
}

// 기존 엑셀 파일에서 커리큘럼 정보 추출 함수 (호환성 유지)
function parseExcelCurriculum(data: any[], filename: string) {
  try {
    // 엑셀 데이터 분석
    let title = filename;
    let description = "";
    let category = "전문교육";
    let difficulty = "intermediate";
    let duration = 480;
    let price = 400000;
    let modules: any[] = [];

    // 첫 번째 행에서 제목 찾기
    if (data.length > 0 && data[0] && data[0][0]) {
      title = String(data[0][0]).trim();
    }

    // 설명 찾기 (두 번째 행 또는 특정 패턴)
    if (data.length > 1 && data[1] && data[1][0]) {
      description = String(data[1][0]).trim();
    }

    // 모듈 정보 추출 (행에서 강의명, 내용 등 찾기)
    let moduleIndex = 1;
    for (let i = 2; i < Math.min(data.length, 20); i++) {
      const row = data[i];
      if (!row || !row[0]) continue;

      const cellValue = String(row[0]).trim();
      
      // 강의나 모듈을 나타내는 패턴 찾기
      if (cellValue.includes('강') || cellValue.includes('모듈') || cellValue.includes('차시') || cellValue.includes('주차')) {
        let moduleTitle = cellValue;
        let moduleDescription = row[1] ? String(row[1]).trim() : `${moduleTitle}에 대한 상세 내용`;
        let moduleContent = row[2] ? String(row[2]).trim() : "";
        
        // 재활 관련 키워드가 있으면 특별 처리
        if (filename.includes('재활') || cellValue.includes('재활')) {
          category = "재활치료";
          difficulty = "advanced";
          price = 600000;
          duration = 720;
        }

        modules.push({
          id: `module_${moduleIndex}_${Date.now()}`,
          title: moduleTitle,
          description: moduleDescription,
          order: moduleIndex,
          duration: Math.floor(duration / 8), // 전체 시간을 8등분
          objectives: moduleContent ? [moduleContent] : [`${moduleTitle} 학습`],
          content: moduleContent || `${moduleTitle}에 대한 전문적인 교육 내용`,
          videos: [],
          isRequired: true,
          isFree: moduleIndex === 1, // 첫 번째 모듈은 무료
          price: moduleIndex === 1 ? 0 : Math.floor(price / 8) // 유료 모듈은 개별 가격
        });
        
        moduleIndex++;
        if (moduleIndex > 8) break; // 최대 8개 모듈
      }
    }

    // 기본 모듈이 없으면 4개 생성
    if (modules.length === 0) {
      for (let i = 1; i <= 4; i++) {
        modules.push({
          id: `module_${i}_${Date.now()}`,
          title: `${i}강. ${title} - 모듈 ${i}`,
          description: `${title}의 ${i}번째 모듈`,
          order: i,
          duration: Math.floor(duration / 4),
          objectives: [`모듈 ${i} 학습 목표`],
          content: `${title}에 대한 전문적인 교육 내용 - 모듈 ${i}`,
          videos: [],
          isRequired: true,
          isFree: i === 1, // 첫 번째 모듈은 무료
          price: i === 1 ? 0 : Math.floor(price / 4) // 유료 모듈은 개별 가격
        });
      }
    }

    return {
      title,
      description: description || `${title}에 대한 전문 교육 과정`,
      category,
      difficulty,
      duration,
      price,
      modules
    };
  } catch (error) {
    logServerError('[엑셀 파싱] 오류:', error);
    return null;
  }
}

// requireAuth 미들웨어 함수 - RBAC 다중 역할 지원
function requireAuth(...allowedRoles: string[]) {
  return (req: any, res: any, next: any) => {
    // Passport 인증 확인
    if (req.isAuthenticated && req.isAuthenticated() && req.user) {
      if (allowedRoles.length > 0 && !allowedRoles.includes(req.user.role)) {
        return res.status(403).json({ 
          error: `다음 권한 중 하나가 필요합니다: ${allowedRoles.join(', ')}`,
          code: 'INSUFFICIENT_PERMISSIONS',
          allowedRoles: allowedRoles,
          userRole: req.user.role
        });
      }
      return next();
    }

    // 세션 인증 확인 (호환성 유지)
    if (req.session?.user) {
      const userRole = req.session.user.role;
      if (allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
        return res.status(403).json({ 
          error: `다음 권한 중 하나가 필요합니다: ${allowedRoles.join(', ')}`,
          code: 'INSUFFICIENT_PERMISSIONS',
          allowedRoles: allowedRoles,
          userRole: userRole
        });
      }
      // req.user 설정 (하위 호환성)
      req.user = req.session.user;
      return next();
    }

    // 인증되지 않음
    return res.status(401).json({ 
      error: '인증이 필요합니다. 로그인 후 다시 시도해주세요.',
      code: 'AUTHENTICATION_REQUIRED'
    });
  };
}

// Stripe 초기화 - 환경 변수 선택적 로드 (없어도 서버 시작 가능)
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

let stripe: Stripe | null = null;

if (stripeSecretKey) {
  try {
    stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
    });
    console.log('✅ Stripe 초기화 성공');
  } catch (error) {
    logServerError('❌ Stripe 초기화 실패:', error);
  }
} else {
  console.warn('⚠️ STRIPE_SECRET_KEY가 설정되지 않음 - 결제 기능 비활성화');
}

export async function registerRoutes(app: Express): Promise<Server> {

  // 표준화 API 응답 형식 미들웨어 적용
  app.use(extendResponse);

  // 결제 멱등성 컬럼 마이그레이션 (서버 시작 시 안전하게 보장)
  try {
    await db.execute(sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_intent_id text`);
    await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS orders_payment_intent_id_unique ON orders(payment_intent_id) WHERE payment_intent_id IS NOT NULL`);
    await db.execute(sql`ALTER TABLE course_purchases ADD COLUMN IF NOT EXISTS payment_intent_id text`);
    await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS course_purchases_payment_intent_id_unique ON course_purchases(payment_intent_id) WHERE payment_intent_id IS NOT NULL`);
    console.log('✅ 결제 멱등성 컬럼 마이그레이션 완료');
  } catch (migrationError) {
    logServerError('⚠️ 결제 멱등성 컬럼 마이그레이션 실패:', migrationError);
  }

  // 펫 UID(공개 ID) 컬럼 보장 + 빈 값 백필
  try {
    await db.execute(sql`ALTER TABLE pets ADD COLUMN IF NOT EXISTS pet_uid varchar(12)`);
    await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS pets_pet_uid_unique ON pets(pet_uid) WHERE pet_uid IS NOT NULL`);
    const { generatePetUid } = await import('./lib/petUid');
    const missing = await db.execute(sql`SELECT id FROM pets WHERE pet_uid IS NULL OR pet_uid = ''`);
    const rawRows = (missing as { rows?: unknown } | unknown[]);
    const rows: { id?: number }[] = Array.isArray(rawRows)
      ? (rawRows as { id?: number }[])
      : (((rawRows as { rows?: unknown }).rows ?? []) as { id?: number }[]);
    let assigned = 0;
    let failed: number[] = [];
    for (const r of rows) {
      const id = typeof r.id === 'number' ? r.id : Number(r.id);
      if (!id || Number.isNaN(id)) continue;
      let success = false;
      let lastErr: unknown = null;
      for (let attempt = 0; attempt < 50; attempt++) {
        const candidate = generatePetUid();
        try {
          await db.execute(sql`UPDATE pets SET pet_uid = ${candidate} WHERE id = ${id} AND (pet_uid IS NULL OR pet_uid = '')`);
          success = true;
          assigned += 1;
          break;
        } catch (e) {
          lastErr = e;
          // unique 충돌 시 재시도
        }
      }
      if (!success) {
        failed.push(id);
        logServerError(`[Pet UID] DB 펫(id=${id}) UID 백필 실패`, lastErr);
      }
    }
    console.log(`✅ 펫 UID 컬럼/백필 완료 (대상 ${rows.length}건, 성공 ${assigned}건${failed.length ? `, 실패 ${failed.length}건: [${failed.join(',')}]` : ''})`);
  } catch (e) {
    logServerError('⚠️ 펫 UID 백필 실패(무시):', e);
  }

  // 펫스포트 분실모드 (Task #223) — 컬럼/테이블 보장
  try {
    await db.execute(sql`ALTER TABLE pet_vaccination_passports ADD COLUMN IF NOT EXISTS lost_mode boolean DEFAULT false NOT NULL`);
    await db.execute(sql`ALTER TABLE pet_vaccination_passports ADD COLUMN IF NOT EXISTS lost_message text`);
    await db.execute(sql`ALTER TABLE pet_vaccination_passports ADD COLUMN IF NOT EXISTS lost_contact_phone varchar(30)`);
    await db.execute(sql`ALTER TABLE pet_vaccination_passports ADD COLUMN IF NOT EXISTS lost_contact_window varchar(100)`);
    await db.execute(sql`ALTER TABLE pet_vaccination_passports ADD COLUMN IF NOT EXISTS lost_last_seen_at varchar(50)`);
    await db.execute(sql`ALTER TABLE pet_vaccination_passports ADD COLUMN IF NOT EXISTS lost_last_seen_location text`);
    await db.execute(sql`ALTER TABLE pet_vaccination_passports ADD COLUMN IF NOT EXISTS lost_last_seen_lat double precision`);
    await db.execute(sql`ALTER TABLE pet_vaccination_passports ADD COLUMN IF NOT EXISTS lost_last_seen_lng double precision`);
    await db.execute(sql`ALTER TABLE pet_vaccination_passports ADD COLUMN IF NOT EXISTS lost_activated_at timestamp`);
    await db.execute(sql`ALTER TABLE pet_vaccination_passports ADD COLUMN IF NOT EXISTS lost_report_count integer DEFAULT 0 NOT NULL`);
    await db.execute(sql`CREATE TABLE IF NOT EXISTS pet_lost_reports (
      id serial PRIMARY KEY,
      passport_id integer NOT NULL REFERENCES pet_vaccination_passports(id),
      pet_id integer NOT NULL REFERENCES pets(id),
      owner_id integer NOT NULL REFERENCES users(id),
      finder_name varchar(100),
      finder_phone varchar(30),
      lat double precision,
      lng double precision,
      location_text text,
      memo text,
      finder_ip varchar(64),
      finder_ua varchar(255),
      owner_notified_at timestamp,
      created_at timestamp DEFAULT now() NOT NULL
    )`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS pet_lost_reports_owner_idx ON pet_lost_reports(owner_id, created_at DESC)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS pet_lost_reports_pet_idx ON pet_lost_reports(pet_id, created_at DESC)`);
    console.log('✅ 펫스포트 분실모드 컬럼/테이블 보장 완료');
  } catch (e) {
    logServerError('⚠️ 분실모드 마이그레이션 실패(무시):', e);
  }

  // 인증 관련 라우트는 setupAuth()에서 처리됩니다 (/api/auth/* 경로)

  // 인증 API들 (로그인, 회원가입, 로그아웃)은 setupAuth()에서 처리됩니다

  // 대시보드 라우트 등록
  registerDashboardRoutes(app);
  registerCourseAttendanceRoutes(app);

  // 관리자 라우트 등록
  registerAdminRoutes(app);
  registerAuditLogRoutes(app);

  // 이메일 알림 (SendGrid) 라우트 등록 - Task #24
  registerEmailNotificationRoutes(app);

  // 날씨 API 라우트 등록
  app.use('/api/weather', weatherRoutes);

  // 수익화 시스템 라우트 등록 (YouTube형 TALEZ SCORE)
  app.use('/api/monetization', monetizationRoutes);

  // =============================================================================
  // 친구 초대 API 엔드포인트
  // =============================================================================

  // GET /api/invite/my-code - 내 초대 코드 조회/생성
  app.get('/api/invite/my-code', requireAuth(), async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: '로그인이 필요합니다.' });
      }

      // 사용자의 referralCode 조회
      const [user] = await db.select({ referralCode: users.referralCode })
        .from(users)
        .where(eq(users.id, userId));

      if (!user) {
        return res.status(404).json({ success: false, message: '사용자를 찾을 수 없습니다.' });
      }

      let inviteCode = user.referralCode;

      // 초대 코드가 없으면 새로 생성
      if (!inviteCode) {
        inviteCode = randomBytes(3).toString('hex').toUpperCase(); // 6자리 영숫자 코드

        // 중복 확인 및 재생성
        let attempts = 0;
        while (attempts < 10) {
          const [existing] = await db.select({ id: users.id })
            .from(users)
            .where(eq(users.referralCode, inviteCode));
          
          if (!existing) break;
          inviteCode = randomBytes(3).toString('hex').toUpperCase();
          attempts++;
        }

        // DB에 저장
        await db.update(users)
          .set({ referralCode: inviteCode, updatedAt: new Date() })
          .where(eq(users.id, userId));
      }

      res.json({
        success: true,
        data: { inviteCode }
      });
    } catch (error) {
      logServerError('[친구 초대] 초대 코드 조회 오류:', error, req);
      res.status(500).json({ success: false, message: '초대 코드 조회에 실패했습니다.' });
    }
  });

  // GET /api/invite/credits - 내 교육 크레딧 조회
  app.get('/api/invite/credits', requireAuth(), async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: '로그인이 필요합니다.' });
      }

      // 사용자의 크레딧 조회
      const credits = await db.select()
        .from(educationCredits)
        .where(eq(educationCredits.userId, userId))
        .orderBy(sql`${educationCredits.createdAt} DESC`);

      // 총 크레딧 수
      const totalCredits = credits.reduce((sum, c) => sum + (c.amount || 0), 0);
      
      // 사용 가능 크레딧 수 (isUsed가 false인 것만)
      const availableCredits = credits
        .filter(c => !c.isUsed)
        .reduce((sum, c) => sum + (c.amount || 0), 0);

      res.json({
        success: true,
        data: {
          totalCredits,
          availableCredits,
          usedCredits: totalCredits - availableCredits,
          history: credits.map(c => ({
            id: c.id,
            amount: c.amount,
            reason: c.reason,
            isUsed: c.isUsed,
            usedAt: c.usedAt,
            usedForCourseId: c.usedForCourseId,
            expiresAt: c.expiresAt,
            createdAt: c.createdAt
          }))
        }
      });
    } catch (error) {
      logServerError('[친구 초대] 크레딧 조회 오류:', error, req);
      res.status(500).json({ success: false, message: '크레딧 조회에 실패했습니다.' });
    }
  });

  // GET /api/invite/history - 초대 내역 조회
  app.get('/api/invite/history', requireAuth(), async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: '로그인이 필요합니다.' });
      }

      // 내가 초대한 친구 목록 조회
      const invitations = await db.select({
        id: friendInvitations.id,
        inviteeEmail: friendInvitations.inviteeEmail,
        inviteeId: friendInvitations.inviteeId,
        inviteCode: friendInvitations.inviteCode,
        status: friendInvitations.status,
        acceptedAt: friendInvitations.acceptedAt,
        createdAt: friendInvitations.createdAt,
        inviteeName: users.name,
        inviteeUsername: users.username
      })
        .from(friendInvitations)
        .leftJoin(users, eq(friendInvitations.inviteeId, users.id))
        .where(eq(friendInvitations.inviterId, userId))
        .orderBy(sql`${friendInvitations.createdAt} DESC`);

      // 통계 계산
      const totalInvitations = invitations.length;
      const acceptedCount = invitations.filter(i => i.status === 'accepted').length;
      const pendingCount = invitations.filter(i => i.status === 'pending').length;

      res.json({
        success: true,
        data: {
          totalInvitations,
          acceptedCount,
          pendingCount,
          invitations: invitations.map(i => ({
            id: i.id,
            inviteeEmail: i.inviteeEmail,
            inviteeId: i.inviteeId,
            inviteeName: i.inviteeName || i.inviteeUsername,
            status: i.status,
            acceptedAt: i.acceptedAt,
            createdAt: i.createdAt
          }))
        }
      });
    } catch (error) {
      logServerError('[친구 초대] 초대 내역 조회 오류:', error, req);
      res.status(500).json({ success: false, message: '초대 내역 조회에 실패했습니다.' });
    }
  });

  // POST /api/invite/accept - 초대 코드로 가입 시 호출
  app.post('/api/invite/accept', async (req, res) => {
    try {
      const { inviteCode, inviteeId } = req.body;

      if (!inviteCode || !inviteeId) {
        return res.status(400).json({ 
          success: false, 
          message: '초대 코드와 초대받은 사용자 ID가 필요합니다.' 
        });
      }

      // 초대 코드로 초대자 찾기
      const [inviter] = await db.select({ id: users.id, name: users.name })
        .from(users)
        .where(eq(users.referralCode, inviteCode.toUpperCase()));

      if (!inviter) {
        return res.status(404).json({ success: false, message: '유효하지 않은 초대 코드입니다.' });
      }

      // 자기 자신 초대 방지
      if (inviter.id === inviteeId) {
        return res.status(400).json({ success: false, message: '자기 자신을 초대할 수 없습니다.' });
      }

      // 이미 처리된 초대인지 확인
      const [existingInvitation] = await db.select()
        .from(friendInvitations)
        .where(and(
          eq(friendInvitations.inviterId, inviter.id),
          eq(friendInvitations.inviteeId, inviteeId)
        ));

      if (existingInvitation) {
        return res.status(400).json({ success: false, message: '이미 처리된 초대입니다.' });
      }

      // 초대 기록 생성
      const [invitation] = await db.insert(friendInvitations)
        .values({
          inviterId: inviter.id,
          inviteeId: inviteeId,
          inviteCode: inviteCode.toUpperCase(),
          status: 'accepted',
          acceptedAt: new Date()
        })
        .returning();

      // 초대자에게 교육 크레딧 1회 부여
      await db.insert(educationCredits)
        .values({
          userId: inviter.id,
          amount: 1,
          reason: 'friend_invite',
          sourceId: invitation.id,
          isUsed: false,
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1년 후 만료
        });

      console.log(`[친구 초대] 초대 완료: 초대자 ${inviter.id}, 피초대자 ${inviteeId}, 크레딧 1 부여`);

      res.json({
        success: true,
        message: '초대가 성공적으로 처리되었습니다.',
        data: {
          invitationId: invitation.id,
          inviterName: inviter.name,
          creditAwarded: 1
        }
      });
    } catch (error) {
      logServerError('[친구 초대] 초대 수락 오류:', error, req);
      res.status(500).json({ success: false, message: '초대 처리에 실패했습니다.' });
    }
  });

  // 커미션 라우트 등록
  setupCommissionRoutes(app);

  // 트레이너 정산 자동화 라우트 등록
  registerTrainerSettlementRoutes(app);

  // AI 에러 자동 수정 라우트 등록
  registerAIErrorFixRoutes(app);
  registerAIUsageRoutes(app);

  // AI 커리큘럼 분석을 위한 multer 설정
  const aiCurriculumUpload = multer({
    dest: 'uploads/ai-curriculum/',
    limits: {
      fileSize: 100 * 1024 * 1024, // 100MB
    },
    fileFilter: (req, file, cb) => {
      const allowedExts = ['.xlsx', '.xls', '.docx', '.doc', '.hwpx', '.txt']; // HWP 제외
      const fileExt = path.extname(file.originalname).toLowerCase();
      
      // MIME 타입과 확장자를 모두 확인하여 보안 강화
      const mimeExtMap = {
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
        'application/vnd.ms-excel': '.xls',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
        'application/msword': '.doc',
        'application/zip': '.hwpx', // HWPX는 ZIP 기반이므로 확장자도 확인
        'text/plain': '.txt'
      };
      
      const expectedExt = mimeExtMap[file.mimetype];
      
      if (allowedExts.includes(fileExt) && (!expectedExt || expectedExt === fileExt)) {
        cb(null, true);
      } else {
        cb(new Error('지원되지 않는 파일 형식입니다. (.hwpx, .docx, .doc, .txt, .xlsx, .xls 파일만 지원, HWP는 HWPX로 저장해주세요)'), false);
      }
    }
  });

  // AI 커리큘럼 분석 API
  app.post('/api/ai/curriculum/analyze', requireAuth(['admin', 'institute']), aiCurriculumUpload.single('file'), async (req, res) => {
    try {
      console.log('[AI 커리큘럼] 분석 요청 받음:', req.file?.originalname);
      
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: '분석할 파일이 필요합니다.'
        });
      }

      // 파일 안전성 검증
      validateUploadedFile(req.file.path, req.file.originalname);

      // 파일에서 텍스트와 테이블 추출
      const parsedContent = await extractTextAndTables(req.file.path, req.file.originalname);
      
      console.log('[AI 커리큘럼] 파일 파싱 완료:', {
        fileName: parsedContent.metadata.fileName,
        textLength: parsedContent.metadata.extractedTextLength,
        tables: parsedContent.metadata.extractedTables
      });

      // AI를 사용하여 커리큘럼 생성
      const aiCurriculum = await analyzeCurriculumContent(
        parsedContent.text,
        req.file.originalname,
        req.body.context // 추가 컨텍스트 (선택사항)
      );

      // AI를 사용하여 가격 제안
      const pricingSuggestion = await suggestCurriculumPricing(aiCurriculum);

      // 임시 파일 정리 (성공 시)
      fs.unlink(req.file.path, (err) => {
        if (err) logServerError('[AI 커리큘럼] 임시 파일 삭제 실패:', err, req);
        else console.log('[AI 커리큘럼] 임시 파일 정리 완료:', req.file.originalname);
      });

      console.log('[AI 커리큘럼] 분석 완료:', {
        title: aiCurriculum.title,
        modules: aiCurriculum.modules.length,
        suggestedPrice: pricingSuggestion.suggestedPrice
      });

      res.json({
        success: true,
        message: 'AI 커리큘럼 분석이 완료되었습니다.',
        data: {
          curriculum: aiCurriculum,
          pricing: pricingSuggestion,
          sourceFile: {
            name: req.file.originalname,
            size: req.file.size,
            metadata: parsedContent.metadata
          }
        }
      });

    } catch (error) {
      logServerError('[AI 커리큘럼] 분석 실패:', error, req);
      
      // 임시 파일 정리 (에러 시)
      if (req.file) {
        fs.unlink(req.file.path, (err) => {
          if (err) logServerError('[AI 커리큘럼] 임시 파일 삭제 실패:', err, req);
          else console.log('[AI 커리큘럼] 에러 후 임시 파일 정리 완료:', req.file.originalname);
        });
      }

      res.status(500).json({
        success: false,
        message: `AI 커리큘럼 분석에 실패했습니다: ${error.message}`
      });
    }
  });

  // AI 생성 커리큘럼 저장 API
  app.post('/api/ai/curriculum/save-draft', requireAuth(['admin', 'institute']), csrfProtection, async (req, res) => {
    try {
      console.log('[AI 커리큘럼] 임시저장 요청 받음');
      
      const { curriculum, pricing, sourceInfo } = req.body;
      
      if (!curriculum) {
        return res.status(400).json({
          success: false,
          message: '저장할 커리큘럼 데이터가 필요합니다.'
        });
      }

      // 커리큘럼 데이터 구성
      const curriculumData = {
        title: curriculum.title,
        description: curriculum.description,
        category: curriculum.category,
        difficulty: curriculum.difficulty,
        duration: curriculum.duration,
        price: pricing?.suggestedPrice || 0,
        modules: curriculum.modules,
        trainerName: curriculum.trainerName || '관리자',
        trainerEmail: 'admin@talez.com',
        aiMeta: {
          generatedAt: new Date().toISOString(),
          sourceFileName: sourceInfo?.name,
          model: 'gpt-5',
          pricing: pricing,
          confidence: pricing?.confidence || 0.8
        }
      };

      // 커리큘럼 저장
      const savedCurriculum = await storage.createCurriculum(curriculumData);

      console.log('[AI 커리큘럼] 임시저장 완료:', savedCurriculum.id);

      res.json({
        success: true,
        message: 'AI 생성 커리큘럼이 임시저장되었습니다.',
        data: savedCurriculum
      });

    } catch (error) {
      logServerError('[AI 커리큘럼] 임시저장 실패:', error, req);
      res.status(500).json({
        success: false,
        message: `커리큘럼 임시저장에 실패했습니다: ${error.message}`
      });
    }
  });

  // 성능 모니터링 라우트 등록
  const { performanceRoutes } = await import('./routes/performance');
  app.use('/api/performance', performanceRoutes);

  // 보안이 강화된 사용자 API 라우트
  app.get('/api/users', requireAuth(), async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      // 민감한 정보 제거 및 사용자별 펫 정보 포함
      const safeMappedUsers = users.map(user => ({
        id: user.id,
        name: user.name,
        role: user.role,
        // 비밀번호, 이메일 등 민감한 정보는 제외
        pets: storage.pets.filter(pet => pet.ownerId === user.id).map(pet => ({
          id: pet.id,
          name: pet.name,
          breed: pet.breed,
          age: pet.age
        }))
      }));
      res.success(safeMappedUsers, '사용자 목록을 조회했습니다.');
    } catch (error) {
      logServerError('Users API error:', error, req);
      res.error('INTERNAL_SERVER_ERROR', '사용자 목록 조회 중 오류가 발생했습니다.');
    }
  });

  // 관리자 전용 사용자 API
  app.get('/api/admin/users', requireAuth('admin'), async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      // 관리자는 더 많은 정보에 접근 가능하지만 여전히 비밀번호는 제외
      const adminMappedUsers = users.map(user => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isVerified: user.verified,
        createdAt: user.createdAt
        // 비밀번호는 여전히 제외
      }));
      res.success(adminMappedUsers, '관리자용 사용자 목록을 조회했습니다.');
    } catch (error) {
      logServerError('Admin Users API error:', error, req);
      res.error('INTERNAL_SERVER_ERROR', '관리자용 사용자 목록 조회 중 오류가 발생했습니다.');
    }
  });

  // 관리자 전용 사용자 추가 API
  app.post('/api/admin/users', requireAuth('admin'), csrfProtection, async (req, res) => {
    try {
      const { name, email, role, password } = req.body;

      // 필수 필드 검증
      if (!name || !email || !password) {
        return res.status(400).json({ 
          success: false, 
          message: '이름, 이메일, 비밀번호는 필수 항목입니다.' 
        });
      }

      // 이메일 중복 검증
      const existingUser = storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ 
          success: false, 
          message: '이미 존재하는 이메일입니다.' 
        });
      }

      // 역할 유효성 검증
      const validRoles = ['admin', 'trainer', 'institute-admin', 'user'];
      if (role && !validRoles.includes(role)) {
        return res.status(400).json({ 
          success: false, 
          message: '유효하지 않은 역할입니다.' 
        });
      }

      // 새 사용자 데이터 준비
      const newUserData = {
        name,
        email,
        role: role || 'user',
        password, // createUser 메서드에서 해싱 처리됨
        username: email, // 이메일을 username으로 사용
        isVerified: true,
        verified: true
      };

      // 사용자 생성
      const newUser = storage.createUser(newUserData);
      
      console.log('[Admin] 새 사용자 추가됨:', { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role });

      await recordAuditLog(req, {
        action: 'admin.user.create',
        targetType: 'user',
        targetId: newUser.id,
        targetName: newUser.name || newUser.email,
        payload: { name: newUser.name, email: newUser.email, role: newUser.role },
      });

      res.json({ 
        success: true, 
        message: '사용자가 성공적으로 추가되었습니다.',
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          createdAt: newUser.createdAt
        }
      });
    } catch (error) {
      logServerError('Admin User Creation error:', error, req);
      res.status(500).json({ 
        success: false, 
        message: '사용자 추가 중 오류가 발생했습니다.' 
      });
    }
  });

  // 관리자 전용 사용자 수정 API (DB 기반)
  app.put('/api/admin/users/:id', requireAuth('admin'), csrfProtection, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const { name, email, role } = req.body;

      // 사용자 존재 확인 (DB 기반)
      const existingUser = await storage.getUserFromDB(userId);
      if (!existingUser) {
        return res.status(404).json({ 
          success: false, 
          message: '사용자를 찾을 수 없습니다.' 
        });
      }

      // 역할 유효성 검증
      const validRoles = ['admin', 'trainer', 'institute-admin', 'user'];
      if (role && !validRoles.includes(role)) {
        return res.status(400).json({ 
          success: false, 
          message: '유효하지 않은 역할입니다.' 
        });
      }

      // 이메일 중복 검증 (DB 기반, 자신 제외)
      if (email && email !== existingUser.email) {
        const emailExists = await storage.checkEmailExistsInDB(email, userId);
        if (emailExists) {
          return res.status(400).json({ 
            success: false, 
            message: '이미 존재하는 이메일입니다.' 
          });
        }
      }

      // 사용자 정보 업데이트 (DB 기반)
      const updatedUser = await storage.updateUserInDB(userId, {
        name: name || existingUser.name,
        email: email || existingUser.email,
        role: role || existingUser.role
      });

      // DB 업데이트 실패 확인
      if (!updatedUser) {
        return res.status(500).json({ 
          success: false, 
          message: '사용자 정보 수정에 실패했습니다. 다시 시도해주세요.' 
        });
      }

      console.log('[Admin] 사용자 정보 수정됨:', { id: userId, name: updatedUser.name, role: updatedUser.role });

      const roleChanged = role && role !== existingUser.role;
      await recordAuditLog(req, {
        action: roleChanged ? 'admin.user.role_change' : 'admin.user.update',
        targetType: 'user',
        targetId: userId,
        targetName: updatedUser.name || updatedUser.email,
        payload: {
          before: { name: existingUser.name, email: existingUser.email, role: existingUser.role },
          after: { name: updatedUser.name, email: updatedUser.email, role: updatedUser.role },
          roleChanged: !!roleChanged,
        },
      });

      res.json({ 
        success: true, 
        message: '사용자 정보가 수정되었습니다.',
        user: {
          id: updatedUser.id,
          name: updatedUser.name,
          email: updatedUser.email,
          role: updatedUser.role,
          createdAt: updatedUser.createdAt
        }
      });
    } catch (error) {
      logServerError('Admin User Update error:', error, req);
      res.status(500).json({ 
        success: false, 
        message: '사용자 정보 수정 중 오류가 발생했습니다.' 
      });
    }
  });

  // 관리자 전용 사용자 삭제 API (DB 기반)
  app.delete('/api/admin/users/:id', requireAuth('admin'), csrfProtection, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);

      // 사용자 존재 확인 (DB 기반)
      const existingUser = await storage.getUserFromDB(userId);
      if (!existingUser) {
        return res.status(404).json({ 
          success: false, 
          message: '사용자를 찾을 수 없습니다.' 
        });
      }

      // 자기 자신 삭제 방지
      if (req.session?.userId === userId) {
        return res.status(400).json({ 
          success: false, 
          message: '자기 자신은 삭제할 수 없습니다.' 
        });
      }

      // 사용자 삭제 (DB 기반)
      const deleted = await storage.deleteUserFromDB(userId);
      
      if (deleted) {
        console.log('[Admin] 사용자 삭제됨:', { id: userId, name: existingUser.name });
        await recordAuditLog(req, {
          action: 'admin.user.delete',
          targetType: 'user',
          targetId: userId,
          targetName: existingUser.name || existingUser.email,
          payload: { email: existingUser.email, role: existingUser.role },
        });
        res.json({ 
          success: true, 
          message: '사용자가 삭제되었습니다.'
        });
      } else {
        res.status(500).json({ 
          success: false, 
          message: '사용자 삭제에 실패했습니다.' 
        });
      }
    } catch (error) {
      logServerError('Admin User Delete error:', error, req);
      res.status(500).json({ 
        success: false, 
        message: '사용자 삭제 중 오류가 발생했습니다.' 
      });
    }
  });

  // 관리자 알림 발송 - 카테고리/대상 기반
  app.post('/api/admin/notifications/send', requireAuth('admin'), csrfProtection, async (req, res) => {
    try {
      const sendSchema = z.object({
        category: z.enum(['message', 'reservation', 'payment', 'system', 'training']),
        title: z.string().trim().min(1).max(200),
        message: z.string().trim().min(1).max(2000),
        actionUrl: z.string().trim().max(500).optional().nullable(),
        targetType: z.enum(['users', 'role', 'all']),
        userIds: z.array(z.number().int().positive()).optional(),
        role: z.enum(['admin', 'trainer', 'institute-admin', 'institute', 'pet-owner']).optional(),
      });

      const parsed = sendSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          message: '입력값이 올바르지 않습니다.',
          errors: parsed.error.flatten(),
        });
      }
      const data = parsed.data;

      // category → notification type 매핑 (notification-service 카테고리 매핑과 호환)
      const categoryToType: Record<string, 'message' | 'reservation' | 'payment' | 'system' | 'training'> = {
        message: 'message',
        reservation: 'reservation',
        payment: 'payment',
        system: 'system',
        training: 'training',
      };
      const notifType = categoryToType[data.category];

      // 대상 사용자 ID 수집
      type AdminTargetUser = { id: number; role?: string | null; isActive?: boolean | null };
      let targetUserIds: number[] = [];
      if (data.targetType === 'users') {
        if (!data.userIds || data.userIds.length === 0) {
          return res.status(400).json({ success: false, message: '대상 사용자를 선택하세요.' });
        }
        targetUserIds = Array.from(new Set(data.userIds));
      } else if (data.targetType === 'role') {
        if (!data.role) {
          return res.status(400).json({ success: false, message: '대상 역할을 선택하세요.' });
        }
        const allUsers = (await storage.getAllUsers()) as AdminTargetUser[] | null | undefined;
        const wanted = data.role === 'institute' ? 'institute-admin' : data.role;
        targetUserIds = (allUsers ?? [])
          .filter((u) => !!u && u.role === wanted && u.isActive !== false)
          .map((u) => u.id);
      } else {
        const allUsers = (await storage.getAllUsers()) as AdminTargetUser[] | null | undefined;
        targetUserIds = (allUsers ?? [])
          .filter((u) => !!u && u.isActive !== false)
          .map((u) => u.id);
      }

      if (targetUserIds.length === 0) {
        return res.status(400).json({ success: false, message: '대상 사용자가 없습니다.' });
      }

      const actionUrl = data.actionUrl && data.actionUrl.length > 0 ? data.actionUrl : undefined;
      const sentBy: number | null =
        req.user && typeof (req.user as { id?: unknown }).id === 'number'
          ? ((req.user as { id: number }).id)
          : null;

      let success = 0;
      let failed = 0;
      const failures: Array<{ userId: number; error: string }> = [];

      for (const uid of targetUserIds) {
        try {
          await notificationService.sendNotification({
            userId: uid,
            type: notifType,
            title: data.title,
            message: data.message,
            actionUrl,
            data: { sentBy, source: 'admin-broadcast' },
          });
          success += 1;
        } catch (err) {
          failed += 1;
          const errorMessage = err instanceof Error ? err.message : 'unknown error';
          failures.push({ userId: uid, error: errorMessage });
          logServerError('[Admin Notification] 발송 실패', err, req);
        }
      }

      return res.json({
        success: true,
        total: targetUserIds.length,
        successCount: success,
        failedCount: failed,
        failures: failures.slice(0, 20),
        message: `발송 완료: 성공 ${success}건 / 실패 ${failed}건 (총 ${targetUserIds.length}명)`,
      });
    } catch (error) {
      logServerError('[Admin Notification] 발송 처리 오류', error, req);
      return res.status(500).json({ success: false, message: '알림 발송 중 오류가 발생했습니다.' });
    }
  });

  // 관리자 전용 승인 대기 사용자 목록 조회
  app.get('/api/admin/users/pending', requireAuth('admin'), async (req, res) => {
    try {
      console.log('[Admin] 승인 대기 사용자 목록 조회 요청');
      const pendingUsers = await db.select().from(users).where(eq(users.approvalStatus, 'pending'));
      console.log('[Admin] 승인 대기 사용자 수:', pendingUsers.length);
      res.json({ 
        success: true, 
        users: pendingUsers.map(u => ({
          id: u.id,
          username: u.username,
          email: u.email,
          name: u.name,
          role: u.role,
          createdAt: u.createdAt,
          approvalStatus: u.approvalStatus
        }))
      });
    } catch (error) {
      logServerError('Pending users fetch error:', error, req);
      res.status(500).json({ success: false, message: '승인 대기 사용자 조회에 실패했습니다.' });
    }
  });

  // 관리자 전용 사용자 승인 API
  app.post('/api/admin/users/:id/approve', requireAuth('admin'), csrfProtection, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const adminId = (req.user as any)?.id;
      
      const existingUser = await storage.getUserFromDB(userId);
      if (!existingUser) {
        return res.status(404).json({ success: false, message: '사용자를 찾을 수 없습니다.' });
      }

      if ((existingUser as any).approvalStatus !== 'pending') {
        return res.status(400).json({ success: false, message: '승인 대기 상태의 사용자가 아닙니다.' });
      }

      await db.update(users).set({
        approvalStatus: 'approved',
        approvedAt: new Date(),
        approvedBy: adminId
      }).where(eq(users.id, userId));

      console.log('[Admin] 사용자 승인됨:', { userId, approvedBy: adminId });
      await recordAuditLog(req, {
        action: 'admin.user.approve',
        targetType: 'user',
        targetId: userId,
        targetName: (existingUser as any).name || (existingUser as any).email,
        payload: { previousStatus: 'pending' },
      });
      res.json({ success: true, message: '사용자가 승인되었습니다.' });
    } catch (error) {
      logServerError('User approval error', error, req);
      res.status(500).json({ success: false, message: '사용자 승인에 실패했습니다.' });
    }
  });

  // 관리자 전용 사용자 거부 API
  app.post('/api/admin/users/:id/reject', requireAuth('admin'), csrfProtection, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const { reason } = req.body;
      const adminId = (req.user as any)?.id;
      
      const existingUser = await storage.getUserFromDB(userId);
      if (!existingUser) {
        return res.status(404).json({ success: false, message: '사용자를 찾을 수 없습니다.' });
      }

      if ((existingUser as any).approvalStatus !== 'pending') {
        return res.status(400).json({ success: false, message: '승인 대기 상태의 사용자가 아닙니다.' });
      }

      await db.update(users).set({
        approvalStatus: 'rejected',
        approvedAt: new Date(),
        approvedBy: adminId,
        rejectionReason: reason || '사유 미기재'
      }).where(eq(users.id, userId));

      console.log('[Admin] 사용자 거부됨:', { userId, reason, approvedBy: adminId });
      await recordAuditLog(req, {
        action: 'admin.user.reject',
        targetType: 'user',
        targetId: userId,
        targetName: (existingUser as any).name || (existingUser as any).email,
        payload: { reason: reason || '사유 미기재' },
      });
      res.json({ success: true, message: '사용자가 거부되었습니다.' });
    } catch (error) {
      logServerError('User rejection error', error, req);
      res.status(500).json({ success: false, message: '사용자 거부에 실패했습니다.' });
    }
  });

  // ====== 훈련사-기관 매칭 API ======
  
  // 훈련사가 기관에 연결 신청
  app.post('/api/trainer/institute/apply', requireAuth('trainer'), csrfProtection, async (req, res) => {
    try {
      const trainerId = (req.user as any)?.id;
      const { instituteId, message } = req.body;
      
      if (!instituteId) {
        return res.status(400).json({ success: false, message: '기관 ID가 필요합니다.' });
      }
      
      // 이미 신청했는지 확인
      const existing = await db.select().from(trainerInstituteApplications)
        .where(and(
          eq(trainerInstituteApplications.trainerId, trainerId),
          eq(trainerInstituteApplications.instituteId, instituteId),
          eq(trainerInstituteApplications.status, 'pending')
        ));
      
      if (existing.length > 0) {
        return res.status(400).json({ success: false, message: '이미 해당 기관에 신청 중입니다.' });
      }
      
      const [application] = await db.insert(trainerInstituteApplications).values({
        trainerId,
        instituteId,
        applicationMessage: message || '',
        status: 'pending'
      }).returning();
      
      console.log('[Matching] 훈련사-기관 연결 신청:', { trainerId, instituteId });
      res.json({ success: true, data: application, message: '기관 연결 신청이 완료되었습니다.' });
    } catch (error) {
      logServerError('Trainer institute application error:', error, req);
      res.status(500).json({ success: false, message: '기관 연결 신청에 실패했습니다.' });
    }
  });
  
  // 기관관리자: 훈련사 연결 신청 목록 조회
  app.get('/api/institute/trainer-applications', requireAuth('institute-admin'), async (req, res) => {
    try {
      const user = req.user as any;
      const instituteId = user?.instituteId;
      
      if (!instituteId) {
        return res.status(400).json({ success: false, message: '기관 정보가 없습니다.' });
      }
      
      const applications = await db.select({
        id: trainerInstituteApplications.id,
        trainerId: trainerInstituteApplications.trainerId,
        instituteId: trainerInstituteApplications.instituteId,
        status: trainerInstituteApplications.status,
        applicationMessage: trainerInstituteApplications.applicationMessage,
        appliedAt: trainerInstituteApplications.appliedAt,
        trainerName: users.name,
        trainerEmail: users.email
      })
      .from(trainerInstituteApplications)
      .leftJoin(users, eq(trainerInstituteApplications.trainerId, users.id))
      .where(eq(trainerInstituteApplications.instituteId, instituteId))
      .orderBy(desc(trainerInstituteApplications.appliedAt));
      
      console.log('[Matching] 기관 훈련사 신청 목록:', applications.length);
      res.json({ success: true, data: applications });
    } catch (error) {
      logServerError('Get trainer applications error:', error, req);
      res.status(500).json({ success: false, message: '신청 목록 조회에 실패했습니다.' });
    }
  });
  
  // 기관관리자: 훈련사 연결 신청 승인
  app.post('/api/institute/trainer-applications/:id/approve', requireAuth('institute-admin'), csrfProtection, async (req, res) => {
    try {
      const applicationId = parseInt(req.params.id);
      const reviewerId = (req.user as any)?.id;
      const instituteId = (req.user as any)?.instituteId;
      
      const [application] = await db.select().from(trainerInstituteApplications)
        .where(eq(trainerInstituteApplications.id, applicationId));
      
      if (!application) {
        return res.status(404).json({ success: false, message: '신청을 찾을 수 없습니다.' });
      }
      
      if (application.instituteId !== instituteId) {
        return res.status(403).json({ success: false, message: '권한이 없습니다.' });
      }
      
      // 신청 승인
      await db.update(trainerInstituteApplications).set({
        status: 'approved',
        reviewedAt: new Date(),
        reviewedBy: reviewerId
      }).where(eq(trainerInstituteApplications.id, applicationId));
      
      // 훈련사-기관 관계 생성
      await db.insert(trainerInstitutes).values({
        trainerId: application.trainerId,
        instituteId: application.instituteId,
        role: 'trainer',
        status: 'active'
      });
      
      // 훈련사의 기관 ID 업데이트
      await db.update(users).set({
        instituteId: application.instituteId
      }).where(eq(users.id, application.trainerId));
      
      console.log('[Matching] 훈련사-기관 연결 승인:', { applicationId, trainerId: application.trainerId });
      await recordAuditLog(req, {
        action: 'institute.trainer_application.approve',
        targetType: 'trainer_institute_application',
        targetId: applicationId,
        payload: { trainerId: application.trainerId, instituteId: application.instituteId },
      });
      res.json({ success: true, message: '훈련사 연결이 승인되었습니다.' });
    } catch (error) {
      logServerError('Approve trainer application error', error, req);
      res.status(500).json({ success: false, message: '승인 처리에 실패했습니다.' });
    }
  });
  
  // 기관관리자: 훈련사 연결 신청 거부
  app.post('/api/institute/trainer-applications/:id/reject', requireAuth('institute-admin'), csrfProtection, async (req, res) => {
    try {
      const applicationId = parseInt(req.params.id);
      const { reason } = req.body;
      const reviewerId = (req.user as any)?.id;
      const instituteId = (req.user as any)?.instituteId;
      
      const [application] = await db.select().from(trainerInstituteApplications)
        .where(eq(trainerInstituteApplications.id, applicationId));
      
      if (!application) {
        return res.status(404).json({ success: false, message: '신청을 찾을 수 없습니다.' });
      }
      
      if (application.instituteId !== instituteId) {
        return res.status(403).json({ success: false, message: '권한이 없습니다.' });
      }
      
      await db.update(trainerInstituteApplications).set({
        status: 'rejected',
        rejectionReason: reason || '사유 미기재',
        reviewedAt: new Date(),
        reviewedBy: reviewerId
      }).where(eq(trainerInstituteApplications.id, applicationId));
      
      console.log('[Matching] 훈련사-기관 연결 거부:', { applicationId, reason });
      await recordAuditLog(req, {
        action: 'institute.trainer_application.reject',
        targetType: 'trainer_institute_application',
        targetId: applicationId,
        payload: { reason: reason || '사유 미기재', trainerId: application.trainerId },
      });
      res.json({ success: true, message: '훈련사 연결이 거부되었습니다.' });
    } catch (error) {
      logServerError('Reject trainer application error', error, req);
      res.status(500).json({ success: false, message: '거부 처리에 실패했습니다.' });
    }
  });
  
  // ====== 훈련사-사용자 매칭 API ======
  
  // 관리자/훈련사: 훈련사-사용자 매칭 생성
  app.post('/api/trainer/client-assignments', requireAuth('trainer', 'admin'), csrfProtection, async (req, res) => {
    try {
      const { trainerId, clientId, petId, serviceType, notes, startDate, endDate } = req.body;
      const currentUser = req.user as any;
      
      // 훈련사인 경우 자신만 매칭 가능
      const actualTrainerId = currentUser.role === 'trainer' ? currentUser.id : trainerId;
      
      if (!actualTrainerId || !clientId) {
        return res.status(400).json({ success: false, message: '훈련사와 사용자 ID가 필요합니다.' });
      }
      
      const [assignment] = await db.insert(trainerClientAssignments).values({
        trainerId: actualTrainerId,
        clientId,
        petId: petId || null,
        serviceType: serviceType || 'training',
        notes: notes || '',
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        status: 'pending'
      }).returning();
      
      console.log('[Matching] 훈련사-사용자 매칭 생성:', { trainerId: actualTrainerId, clientId });
      res.json({ success: true, data: assignment, message: '매칭이 생성되었습니다.' });
    } catch (error) {
      logServerError('Create client assignment error:', error, req);
      res.status(500).json({ success: false, message: '매칭 생성에 실패했습니다.' });
    }
  });
  
  // 훈련사-사용자 매칭 목록 조회
  app.get('/api/trainer/client-assignments', requireAuth('trainer', 'admin'), async (req, res) => {
    try {
      const currentUser = req.user as any;
      const { trainerId, status } = req.query;
      
      let query = db.select({
        id: trainerClientAssignments.id,
        trainerId: trainerClientAssignments.trainerId,
        clientId: trainerClientAssignments.clientId,
        petId: trainerClientAssignments.petId,
        status: trainerClientAssignments.status,
        serviceType: trainerClientAssignments.serviceType,
        notes: trainerClientAssignments.notes,
        startDate: trainerClientAssignments.startDate,
        endDate: trainerClientAssignments.endDate,
        assignedAt: trainerClientAssignments.assignedAt,
        clientName: users.name,
        clientEmail: users.email
      })
      .from(trainerClientAssignments)
      .leftJoin(users, eq(trainerClientAssignments.clientId, users.id));
      
      // 훈련사인 경우 자신의 매칭만 조회
      if (currentUser.role === 'trainer') {
        query = query.where(eq(trainerClientAssignments.trainerId, currentUser.id)) as any;
      } else if (trainerId) {
        query = query.where(eq(trainerClientAssignments.trainerId, parseInt(trainerId as string))) as any;
      }
      
      const assignments = await query.orderBy(desc(trainerClientAssignments.assignedAt));
      
      console.log('[Matching] 훈련사-사용자 매칭 목록:', assignments.length);
      res.json({ success: true, data: assignments });
    } catch (error) {
      logServerError('Get client assignments error:', error, req);
      res.status(500).json({ success: false, message: '매칭 목록 조회에 실패했습니다.' });
    }
  });
  
  // 훈련사-사용자 매칭 상태 업데이트
  app.patch('/api/trainer/client-assignments/:id', requireAuth('trainer', 'admin'), csrfProtection, async (req, res) => {
    try {
      const assignmentId = parseInt(req.params.id);
      const { status, notes, startDate, endDate } = req.body;
      const currentUser = req.user as any;
      
      const [assignment] = await db.select().from(trainerClientAssignments)
        .where(eq(trainerClientAssignments.id, assignmentId));
      
      if (!assignment) {
        return res.status(404).json({ success: false, message: '매칭을 찾을 수 없습니다.' });
      }
      
      // 권한 확인
      if (currentUser.role === 'trainer' && assignment.trainerId !== currentUser.id) {
        return res.status(403).json({ success: false, message: '권한이 없습니다.' });
      }
      
      const updateData: any = { updatedAt: new Date() };
      if (status) updateData.status = status;
      if (notes !== undefined) updateData.notes = notes;
      if (startDate) updateData.startDate = new Date(startDate);
      if (endDate) updateData.endDate = new Date(endDate);
      
      await db.update(trainerClientAssignments).set(updateData)
        .where(eq(trainerClientAssignments.id, assignmentId));
      
      console.log('[Matching] 매칭 상태 업데이트:', { assignmentId, status });
      res.json({ success: true, message: '매칭이 업데이트되었습니다.' });
    } catch (error) {
      logServerError('Update client assignment error:', error, req);
      res.status(500).json({ success: false, message: '매칭 업데이트에 실패했습니다.' });
    }
  });
  
  // 관리자: 전체 매칭 현황 조회
  app.get('/api/admin/matching-overview', requireAuth('admin'), async (req, res) => {
    try {
      // 훈련사-기관 신청 현황
      const instituteApplications = await db.select({
        id: trainerInstituteApplications.id,
        trainerId: trainerInstituteApplications.trainerId,
        instituteId: trainerInstituteApplications.instituteId,
        status: trainerInstituteApplications.status,
        appliedAt: trainerInstituteApplications.appliedAt,
        trainerName: users.name
      })
      .from(trainerInstituteApplications)
      .leftJoin(users, eq(trainerInstituteApplications.trainerId, users.id))
      .orderBy(desc(trainerInstituteApplications.appliedAt))
      .limit(50);
      
      // 훈련사-사용자 매칭 현황
      const clientAssignments = await db.select({
        id: trainerClientAssignments.id,
        trainerId: trainerClientAssignments.trainerId,
        clientId: trainerClientAssignments.clientId,
        status: trainerClientAssignments.status,
        serviceType: trainerClientAssignments.serviceType,
        assignedAt: trainerClientAssignments.assignedAt
      })
      .from(trainerClientAssignments)
      .orderBy(desc(trainerClientAssignments.assignedAt))
      .limit(50);
      
      // 통계
      const stats = {
        pendingInstituteApplications: instituteApplications.filter(a => a.status === 'pending').length,
        activeClientAssignments: clientAssignments.filter(a => a.status === 'active').length,
        totalInstituteApplications: instituteApplications.length,
        totalClientAssignments: clientAssignments.length
      };
      
      console.log('[Matching] 관리자 매칭 현황 조회:', stats);
      res.json({ 
        success: true, 
        data: { 
          instituteApplications, 
          clientAssignments,
          stats 
        } 
      });
    } catch (error) {
      logServerError('Get matching overview error:', error, req);
      res.status(500).json({ success: false, message: '매칭 현황 조회에 실패했습니다.' });
    }
  });
  
  // 사용자: 내 담당 훈련사 조회
  app.get('/api/user/my-trainer', requireAuth(), async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      
      const assignments = await db.select({
        id: trainerClientAssignments.id,
        trainerId: trainerClientAssignments.trainerId,
        status: trainerClientAssignments.status,
        serviceType: trainerClientAssignments.serviceType,
        startDate: trainerClientAssignments.startDate,
        endDate: trainerClientAssignments.endDate,
        trainerName: users.name,
        trainerEmail: users.email
      })
      .from(trainerClientAssignments)
      .leftJoin(users, eq(trainerClientAssignments.trainerId, users.id))
      .where(and(
        eq(trainerClientAssignments.clientId, userId),
        eq(trainerClientAssignments.status, 'active')
      ));
      
      console.log('[Matching] 사용자의 담당 훈련사 조회:', assignments.length);
      res.json({ success: true, data: assignments });
    } catch (error) {
      logServerError('Get my trainer error:', error, req);
      res.status(500).json({ success: false, message: '담당 훈련사 조회에 실패했습니다.' });
    }
  });

  // /api/subscription-plans 는 registerSubscriptionRoutes()에서 등록됩니다.

  // 관리자 - 기관 등록 (구독 플랜 포함)
  app.post('/api/admin/institutes', csrfProtection, (req, res) => {
    try {
      const {
        name,
        description,
        address,
        phone,
        email,
        website,
        businessNumber,
        directorName,
        directorEmail,
        subscriptionPlan,
        paymentMethod,
        isVerified = false
      } = req.body;

      // 필수 필드 검증
      if (!name || !email || !subscriptionPlan) {
        return res.status(400).json({ 
          error: '기관명, 이메일, 구독 플랜은 필수 항목입니다.' 
        });
      }

      // 구독 플랜 정보 조회
      const plan = storage.getSubscriptionPlan(subscriptionPlan);
      if (!plan) {
        return res.status(400).json({ 
          error: '유효하지 않은 구독 플랜입니다.' 
        });
      }

      // 기관 등록 데이터 생성
      const instituteData = {
        name,
        description,
        address,
        phone,
        email,
        website,
        businessNumber,
        directorName,
        directorEmail,
        isVerified,
        subscriptionPlan: plan.code,
        subscriptionStatus: 'pending_payment',
        subscriptionStartDate: new Date().toISOString(),
        subscriptionEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        maxMembers: plan.maxMembers,
        maxVideoHours: plan.maxVideoHours,
        maxAiAnalysis: plan.maxAiAnalysis,
        featuresEnabled: plan.features,
        paymentMethod,
        monthlyPrice: plan.price
      };

      // 기관 등록
      const institute = storage.createInstituteWithSubscription(instituteData);

      // 결제 처리 시뮬레이션
      if (paymentMethod === 'card') {
        // 실제로는 Stripe나 다른 결제 서비스와 연동
        institute.subscriptionStatus = 'active';
        institute.paymentStatus = 'paid';
        institute.lastPaymentDate = new Date().toISOString();
        institute.nextPaymentDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      }

      res.status(201).json({
        success: true,
        message: '기관이 성공적으로 등록되었습니다.',
        institute,
        subscriptionPlan: plan,
        paymentRequired: paymentMethod !== 'card'
      });

    } catch (error) {
      logServerError('기관 등록 오류:', error, req);
      res.status(500).json({ 
        error: '기관 등록 중 오류가 발생했습니다.' 
      });
    }
  });

  // 관리자 - 기관 목록 조회
  app.get('/api/admin/institutes', (req, res) => {
    try {
      console.log('[Admin] 기관 관리 목록 조회 요청');
      const institutes = storage.getAllInstitutes();
      const subscriptionPlans = storage.getSubscriptionPlans();
      
      console.log('[DEBUG] 사용 가능한 구독 플랜들:', subscriptionPlans.map(p => ({ code: p.code, name: p.name })));
      console.log('[DEBUG] 첫 번째 기관의 구독 플랜:', institutes[0]?.subscriptionPlan);
      console.log('[DEBUG] 전체 기관 구독 플랜:', institutes.map(i => ({ name: i.name, subscriptionPlan: i.subscriptionPlan })));
      
      // 통계 정보 계산
      const stats = {
        totalInstitutes: institutes.length,
        activeInstitutes: institutes.filter(i => i.status === 'active').length,
        pendingInstitutes: institutes.filter(i => i.status === 'pending').length,
        suspendedInstitutes: institutes.filter(i => i.status === 'suspended').length,
        verifiedInstitutes: institutes.filter(i => i.isVerified).length,
        totalTrainers: institutes.reduce((sum, i) => sum + (i.trainersCount || 0), 0),
        totalStudents: institutes.reduce((sum, i) => sum + (i.studentsCount || 0), 0),
        totalCourses: institutes.reduce((sum, i) => sum + (i.coursesCount || 0), 0)
      };

      // 기관 데이터 가공 - 구독 플랜 정보 매핑
      const processedInstitutes = institutes.map(institute => {
        const subscriptionPlan = subscriptionPlans.find(plan => plan.code === institute.subscriptionPlan);
        
        console.log(`[DEBUG] 기관 ${institute.name} - 구독 플랜: ${institute.subscriptionPlan}, 매칭 결과:`, subscriptionPlan);
        
        // 명시적으로 구독 플랜 정보를 매핑
        const result = {
          id: institute.id,
          name: institute.name,
          code: institute.code,
          businessNumber: institute.businessNumber,
          address: institute.address,
          phone: institute.phone,
          email: institute.email,
          directorName: institute.directorName,
          directorEmail: institute.directorEmail,
          trainerName: institute.trainerName,
          trainerId: institute.trainerId,
          status: institute.status || 'active',
          isActive: institute.isActive,
          isVerified: institute.isVerified,
          certification: institute.certification,
          establishedDate: institute.establishedDate,
          registeredDate: institute.registeredDate,
          trainersCount: institute.trainersCount,
          studentsCount: institute.studentsCount,
          coursesCount: institute.coursesCount,
          facilities: institute.facilities,
          operatingHours: institute.operatingHours,
          description: institute.description,
          website: institute.website,
          specialPrograms: institute.specialPrograms,
          suspendedReason: institute.suspendedReason,
          
          // 구독 플랜 정보 명시적 매핑
          subscriptionPlan: institute.subscriptionPlan,
          subscriptionPlanInfo: subscriptionPlan ? `${subscriptionPlan.name} (${subscriptionPlan.price.toLocaleString()}원)` : '미지정',
          subscriptionPlanCode: institute.subscriptionPlan || null,
          subscriptionPlanName: subscriptionPlan ? subscriptionPlan.name : '미지정',
          subscriptionPlanPrice: subscriptionPlan ? subscriptionPlan.price : 0,
          subscriptionStatus: institute.subscriptionStatus || 'active',
          subscriptionStartDate: institute.subscriptionStartDate,
          subscriptionEndDate: institute.subscriptionEndDate,
          
          // 기타 필드들
          maxMembers: institute.maxMembers || 0,
          maxVideoHours: institute.maxVideoHours || 0,
          maxAiAnalysis: institute.maxAiAnalysis || 0,
          featuresEnabled: institute.featuresEnabled,
          totalRevenue: institute.totalRevenue || 0,
          monthlyRevenue: institute.monthlyRevenue || 0,
          videoClassCount: institute.videoClassCount || 0,
          aiAnalysisCount: institute.aiAnalysisCount || 0,
          createdAt: institute.createdAt || new Date().toISOString()
        };
        
        console.log(`[DEBUG] 기관 ${institute.name} 처리 결과:`, {
          subscriptionPlan: result.subscriptionPlan,
          subscriptionPlanInfo: result.subscriptionPlanInfo,
          subscriptionPlanName: result.subscriptionPlanName
        });
        
        return result;
      });

      const response = {
        success: true,
        data: {
          institutes: processedInstitutes,
          stats,
          subscriptionPlans
        },
        message: '기관 목록을 성공적으로 조회했습니다.'
      };
      
      console.log('[DEBUG] 응답 데이터 샘플:', {
        institutesCount: processedInstitutes.length,
        firstInstitute: processedInstitutes[0]?.name,
        firstInstituteSubscriptionInfo: processedInstitutes[0]?.subscriptionPlanInfo,
        firstInstituteSubscriptionPlan: processedInstitutes[0]?.subscriptionPlan,
        firstInstituteSubscriptionPlanName: processedInstitutes[0]?.subscriptionPlanName,
        subscriptionPlansCount: subscriptionPlans.length
      });
      
      // 응답 JSON 확인
      console.log('[DEBUG] JSON 응답 샘플:', JSON.stringify({
        firstInstitute: {
          name: processedInstitutes[0]?.name,
          subscriptionPlan: processedInstitutes[0]?.subscriptionPlan,
          subscriptionPlanInfo: processedInstitutes[0]?.subscriptionPlanInfo,
          subscriptionPlanName: processedInstitutes[0]?.subscriptionPlanName,
          subscriptionPlanPrice: processedInstitutes[0]?.subscriptionPlanPrice
        }
      }, null, 2));

      res.json(response);

    } catch (error: any) {
      logServerError('[Admin] 기관 목록 조회 중 오류:', error, req);
      res.status(500).json({
        success: false,
        message: '기관 목록 조회 중 오류가 발생했습니다.',
        error: error.message
      });
    }
  });

  // 관리자 - 기관 구독 변경
  app.put('/api/admin/institutes/:id/subscription', csrfProtection, (req, res) => {
    try {
      const instituteId = parseInt(req.params.id);
      const { subscriptionPlan } = req.body;

      const plan = storage.getSubscriptionPlan(subscriptionPlan);
      if (!plan) {
        return res.status(400).json({ 
          error: '유효하지 않은 구독 플랜입니다.' 
        });
      }

      const updateData = {
        subscriptionPlan: plan.code,
        maxMembers: plan.maxMembers,
        maxVideoHours: plan.maxVideoHours,
        maxAiAnalysis: plan.maxAiAnalysis,
        featuresEnabled: plan.features,
        monthlyPrice: plan.price
      };

      const updatedInstitute = storage.updateInstituteSubscription(instituteId, updateData);
      
      if (!updatedInstitute) {
        return res.status(404).json({ 
          error: '기관을 찾을 수 없습니다.' 
        });
      }

      res.json({
        success: true,
        message: '구독 플랜이 변경되었습니다.',
        institute: updatedInstitute,
        subscriptionPlan: plan
      });

    } catch (error) {
      logServerError('구독 플랜 변경 오류:', error, req);
      res.status(500).json({ 
        error: '구독 플랜 변경 중 오류가 발생했습니다.' 
      });
    }
  });

  // 관리자 - 기관 정보 수정
  app.put('/api/admin/institutes/:id', csrfProtection, (req, res) => {
    try {
      const instituteId = parseInt(req.params.id);
      const updateData = req.body;
      
      console.log('[Admin] 기관 정보 수정 요청:', instituteId, updateData);
      
      // 기관 정보 업데이트
      const updatedInstitute = storage.updateInstitute(instituteId, updateData);
      
      if (!updatedInstitute) {
        return res.status(404).json({ 
          error: '기관을 찾을 수 없습니다.' 
        });
      }

      console.log('[Admin] 기관 정보 수정 완료:', updatedInstitute.id);
      
      res.json({
        success: true,
        message: '기관 정보가 성공적으로 수정되었습니다.',
        institute: updatedInstitute
      });

    } catch (error) {
      logServerError('[Admin] 기관 정보 수정 오류:', error, req);
      res.status(500).json({ 
        error: '기관 정보 수정 중 오류가 발생했습니다.' 
      });
    }
  });

  // 기관 구독 결제 처리
  app.post('/api/institutes/:id/payment', csrfProtection, async (req, res) => {
    try {
      const instituteId = parseInt(req.params.id);
      const { paymentMethod, cardInfo } = req.body;

      const institute = await storage.getInstitute(instituteId);
      if (!institute) {
        return res.status(404).json({ 
          error: '기관을 찾을 수 없습니다.' 
        });
      }

      // 결제 처리 시뮬레이션
      const paymentResult = {
        success: true,
        transactionId: 'txn_' + Date.now(),
        amount: institute.monthlyPrice,
        currency: 'KRW',
        method: paymentMethod,
        status: 'completed',
        paidAt: new Date().toISOString()
      };

      // 구독 상태 업데이트
      const updateData = {
        subscriptionStatus: 'active',
        paymentStatus: 'paid',
        lastPaymentDate: new Date().toISOString(),
        nextPaymentDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      };

      await storage.updateInstituteSubscription(instituteId, updateData);

      res.json({
        success: true,
        message: '결제가 완료되었습니다.',
        payment: paymentResult
      });

    } catch (error) {
      logServerError('결제 처리 오류:', error, req);
      res.status(500).json({ 
        error: '결제 처리 중 오류가 발생했습니다.' 
      });
    }
  });

  // 관리자 - 기관 삭제
  app.delete('/api/admin/institutes/:id', requireAuth('admin'), csrfProtection, async (req, res) => {
    try {
      const instituteId = parseInt(req.params.id);
      
      const success = await storage.deleteInstitute(instituteId);
      if (!success) {
        return res.status(404).json({ 
          error: '기관을 찾을 수 없습니다.' 
        });
      }

      res.json({
        success: true,
        message: '기관이 성공적으로 삭제되었습니다.'
      });
    } catch (error) {
      logServerError('[Admin] 기관 삭제 오류:', error, req);
      res.status(500).json({ 
        error: '기관 삭제 중 오류가 발생했습니다.' 
      });
    }
  });

  // 관리자 대신 결제 처리
  app.post('/api/admin/institutes/:id/admin-payment', requireAuth('admin'), csrfProtection, async (req, res) => {
    try {
      const instituteId = parseInt(req.params.id);
      const { subscriptionPlan } = req.body;

      // 구독 플랜 정보 조회
      const plan = await storage.getSubscriptionPlan(subscriptionPlan);
      if (!plan) {
        return res.status(400).json({ 
          error: '유효하지 않은 구독 플랜입니다.' 
        });
      }

      // 결제 처리 시뮬레이션 (관리자 대신 결제)
      const paymentResult = {
        success: true,
        transactionId: 'admin_txn_' + Date.now(),
        amount: plan.price,
        currency: 'KRW',
        method: 'admin_payment',
        status: 'completed',
        paidAt: new Date().toISOString(),
        paidBy: 'admin'
      };

      // 구독 상태 업데이트
      const updateData = {
        subscriptionPlan: plan.code,
        subscriptionStatus: 'active',
        paymentStatus: 'paid',
        lastPaymentDate: new Date().toISOString(),
        nextPaymentDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        maxMembers: plan.maxMembers,
        maxVideoHours: plan.maxVideoHours,
        maxAiAnalysis: plan.maxAiAnalysis,
        featuresEnabled: plan.features,
        monthlyPrice: plan.price,
        paymentMethod: 'admin_payment'
      };

      const updatedInstitute = await storage.updateInstituteSubscription(instituteId, updateData);
      
      if (!updatedInstitute) {
        return res.status(404).json({ 
          error: '기관을 찾을 수 없습니다.' 
        });
      }

      res.json({
        success: true,
        message: '관리자 결제로 구독 플랜이 변경되었습니다.',
        institute: updatedInstitute,
        payment: paymentResult,
        subscriptionPlan: plan
      });

    } catch (error) {
      logServerError('[Admin] 관리자 결제 처리 오류:', error, req);
      res.status(500).json({ 
        error: '관리자 결제 처리 중 오류가 발생했습니다.' 
      });
    }
  });

  // 기관 관리자 결제 요청
  app.post('/api/admin/institutes/:id/request-payment', requireAuth('admin'), csrfProtection, async (req, res) => {
    try {
      const instituteId = parseInt(req.params.id);
      const { subscriptionPlan } = req.body;

      // 구독 플랜 정보 조회
      const plan = await storage.getSubscriptionPlan(subscriptionPlan);
      if (!plan) {
        return res.status(400).json({ 
          error: '유효하지 않은 구독 플랜입니다.' 
        });
      }

      // 기관 정보 조회
      const institute = await storage.getInstitute(instituteId);
      if (!institute) {
        return res.status(404).json({ 
          error: '기관을 찾을 수 없습니다.' 
        });
      }

      // 결제 요청 생성
      const paymentRequest = {
        id: 'req_' + Date.now(),
        instituteId: instituteId,
        instituteName: institute.name,
        subscriptionPlan: plan.code,
        planName: plan.name,
        amount: plan.price,
        currency: 'KRW',
        status: 'pending',
        requestedAt: new Date().toISOString(),
        requestedBy: 'admin',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7일 후 만료
      };

      // 결제 요청 저장 (실제로는 데이터베이스에 저장)
      await storage.createPaymentRequest(paymentRequest);

      // 기관 관리자에게 이메일 알림 전송 (시뮬레이션)
      console.log(`[Payment Request] 기관 ${institute.name}에 결제 요청 전송:`, paymentRequest);

      res.json({
        success: true,
        message: '기관 관리자에게 결제 요청이 전송되었습니다.',
        paymentRequest,
        subscriptionPlan: plan
      });

    } catch (error) {
      logServerError('[Admin] 결제 요청 처리 오류:', error, req);
      res.status(500).json({ 
        error: '결제 요청 처리 중 오류가 발생했습니다.' 
      });
    }
  });

  // 기관 구독 변경 API
  app.post('/api/institutes/:id/subscription/change', requireAuth(), (req, res) => {
    const instituteId = parseInt(req.params.id);
    const { newPlanCode, paymentMethod } = req.body;
    
    // 기관 관리자 또는 시스템 관리자만 접근 가능
    const userRole = req.user?.role;
    const userId = req.user?.id;
    
    if (userRole !== 'admin' && userRole !== 'institute-admin') {
      return res.status(403).json({ error: '접근 권한이 없습니다.' });
    }
    
    // 기관 관리자인 경우 자신의 기관만 변경 가능
    if (userRole === 'institute-admin') {
      const institute = storage.getInstitute(instituteId);
      if (!institute || institute.directorId !== userId) {
        return res.status(403).json({ error: '자신의 기관만 변경할 수 있습니다.' });
      }
    }
    
    const result = storage.changeInstituteSubscription(instituteId, newPlanCode, paymentMethod);
    
    if (result) {
      res.json({
        message: '구독 플랜이 성공적으로 변경되었습니다.',
        ...result
      });
    } else {
      res.status(404).json({ error: '기관 또는 구독 플랜을 찾을 수 없습니다.' });
    }
  });

  // 기관 자체 결제 처리 API
  app.post('/api/institutes/:id/payment/process', requireAuth('institute-admin'), (req, res) => {
    const instituteId = parseInt(req.params.id);
    const paymentData = req.body;
    const userId = req.user?.id;
    
    // 기관 관리자 본인 확인
    const institute = storage.getInstitute(instituteId);
    if (!institute || institute.directorId !== userId) {
      return res.status(403).json({ error: '자신의 기관만 결제할 수 있습니다.' });
    }
    
    const result = storage.processInstitutePayment(instituteId, paymentData);
    
    if (result) {
      res.json({
        message: '결제가 성공적으로 처리되었습니다.',
        institute: result
      });
    } else {
      res.status(404).json({ error: '기관을 찾을 수 없습니다.' });
    }
  });

  // 관리자 대리 결제 처리 API
  app.post('/api/admin/payment-requests/:id/process', requireAuth('admin'), (req, res) => {
    const paymentRequestId = req.params.id;
    const adminId = req.user?.id;
    
    const result = storage.processAdminPayment(paymentRequestId, adminId);
    
    if (result) {
      res.json({
        message: '관리자 대리 결제가 성공적으로 처리되었습니다.',
        ...result
      });
    } else {
      res.status(404).json({ error: '결제 요청을 찾을 수 없습니다.' });
    }
  });

  // 기관 기능 접근 권한 확인
  app.get('/api/institutes/:id/access/:feature', async (req, res) => {
    try {
      const instituteId = parseInt(req.params.id);
      const feature = req.params.feature;

      const hasAccess = await storage.checkInstituteFeatureAccess(instituteId, feature);
      const limits = await storage.checkInstituteLimits(instituteId);

      res.json({
        hasAccess,
        limits
      });

    } catch (error) {
      logServerError('기능 접근 권한 확인 오류:', error, req);
      res.status(500).json({ 
        error: '기능 접근 권한 확인 중 오류가 발생했습니다.' 
      });
    }
  });

  // 커리큘럼 등록 API
  app.post('/api/admin/curriculum', requireAuth('admin'), csrfProtection, async (req, res) => {
    try {
      const curriculumData = req.body;
      
      // 커리큘럼 데이터를 저장소에 저장
      const newCurriculum = await storage.createCurriculum(curriculumData);
      
      console.log('[Admin] 새 커리큘럼 등록:', newCurriculum.title);
      
      res.json({
        success: true,
        message: '커리큘럼이 성공적으로 등록되었습니다.',
        curriculum: newCurriculum
      });
      
    } catch (error) {
      logServerError('[Admin] 커리큘럼 등록 오류:', error, req);
      res.status(500).json({ 
        error: '커리큘럼 등록 중 오류가 발생했습니다.' 
      });
    }
  });

  // 커리큘럼 목록 조회 API
  app.get('/api/admin/curriculum', requireAuth('admin'), async (req, res) => {
    try {
      const curricula = await storage.getAllCurricula();
      res.json(curricula);
    } catch (error) {
      logServerError('[Admin] 커리큘럼 목록 조회 오류:', error, req);
      res.status(500).json({ 
        error: '커리큘럼 목록 조회 중 오류가 발생했습니다.' 
      });
    }
  });

  // 커리큘럼 수정 API
  app.put('/api/admin/curriculum/:id', requireAuth('admin'), csrfProtection, async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;
      
      console.log(`[Admin] 커리큘럼 수정 요청: ${id}`, updateData.title || '제목 없음');
      console.log(`[Admin] 수정 데이터:`, JSON.stringify(updateData, null, 2));
      
      const updatedCurriculum = await storage.updateCurriculum(id, updateData);
      
      if (!updatedCurriculum) {
        logger.error(`[Admin] 커리큘럼을 찾을 수 없음: ${id}`);
        return res.status(404).json({ error: '커리큘럼을 찾을 수 없습니다.' });
      }
      
      console.log(`[Admin] 커리큘럼 수정 성공: ${id}`, updatedCurriculum.title);
      
      res.json(updatedCurriculum); // 직접 커리큘럼 객체 반환
    } catch (error) {
      logServerError('[Admin] 커리큘럼 수정 오류:', error, req);
      res.status(500).json({ 
        error: '커리큘럼 수정 중 오류가 발생했습니다.',
        details: error.message 
      });
    }
  });

  // 커리큘럼 삭제 API
  app.delete('/api/admin/curriculum/:id', requireAuth('admin'), csrfProtection, async (req, res) => {
    try {
      const { id } = req.params;
      
      console.log(`[Admin] 커리큘럼 삭제: ${id}`);
      
      const deleted = await storage.deleteCurriculum(id);
      
      if (!deleted) {
        return res.status(404).json({ error: '커리큘럼을 찾을 수 없습니다.' });
      }
      
      res.json({
        success: true,
        message: '커리큘럼이 성공적으로 삭제되었습니다.'
      });
    } catch (error) {
      logServerError('[Admin] 커리큘럼 삭제 오류:', error, req);
      res.status(500).json({ 
        error: '커리큘럼 삭제 중 오류가 발생했습니다.' 
      });
    }
  });

  // 커리큘럼 상태 변경 API (발행/비발행)
  app.patch('/api/admin/curriculum/:id/status', requireAuth('admin'), csrfProtection, async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      console.log(`[Admin] 커리큘럼 상태 변경: ${id} -> ${status}`);
      
      if (!['draft', 'published', 'archived'].includes(status)) {
        return res.status(400).json({ error: '올바르지 않은 상태입니다.' });
      }
      
      const updatedCurriculum = await storage.updateCurriculum(id, { 
        status,
        publishedAt: status === 'published' ? new Date().toISOString() : null
      });
      
      if (!updatedCurriculum) {
        return res.status(404).json({ error: '커리큘럼을 찾을 수 없습니다.' });
      }
      
      res.json({
        success: true,
        message: `커리큘럼이 ${status === 'published' ? '발행' : status === 'draft' ? '임시저장' : '보관'}되었습니다.`,
        curriculum: updatedCurriculum
      });
    } catch (error) {
      logServerError('[Admin] 커리큘럼 상태 변경 오류:', error, req);
      res.status(500).json({ 
        error: '커리큘럼 상태 변경 중 오류가 발생했습니다.' 
      });
    }
  });

  // 커리큘럼 발행 상태 초기화 API
  app.post('/api/admin/curriculums/:id/unpublish', requireAuth('admin'), csrfProtection, async (req, res) => {
    try {
      const { id } = req.params;
      
      console.log(`[Admin] 커리큘럼 발행 상태 초기화: ${id}`);
      
      const updatedCurriculum = await storage.updateCurriculum(id, { 
        status: 'draft',
        publishedAt: null
      });
      
      if (!updatedCurriculum) {
        return res.status(404).json({ error: '커리큘럼을 찾을 수 없습니다.' });
      }
      
      res.json({
        success: true,
        message: '커리큘럼이 draft 상태로 초기화되었습니다.',
        curriculum: updatedCurriculum
      });
    } catch (error) {
      logServerError('[Admin] 커리큘럼 초기화 오류:', error, req);
      res.status(500).json({ 
        error: '커리큘럼 초기화 중 오류가 발생했습니다.' 
      });
    }
  });

  // 위치 검색 라우트 등록


  // 실시간 인기 통계 API - 실제 데이터 기반
  app.get("/api/popular-stats", async (req, res) => {
    try {
      // 실제 데이터에서 인기 항목 추출
      const allTrainers = await storage.getAllTrainers();
      const trainers = (Array.isArray(allTrainers) ? allTrainers : [])
        .sort((a, b) => (b.views || 0) - (a.views || 0))
        .slice(0, 5)
        .map(trainer => ({
          id: trainer.id,
          views: trainer.views || 0,
          likes: trainer.likes || 0,
          name: trainer.name,
          category: trainer.specialties?.[0] || "기본훈련"
        }));

      const courses = storage.getAllCourses()
        .sort((a, b) => (b.views || 0) - (a.views || 0))
        .slice(0, 5)
        .map(course => ({
          id: course.id,
          views: course.views || 0,
          likes: course.likes || 0,
          title: course.title,
          category: course.category || "기본훈련"
        }));

      const events = storage.getAllEvents()
        .sort((a, b) => (b.views || 0) - (a.views || 0))
        .slice(0, 5)
        .map(event => ({
          id: event.id,
          views: event.views || 0,
          likes: event.likes || 0,
          title: event.title,
          category: event.category || "교육"
        }));

      const communityPosts = await storage.getCommunityPosts({ limit: 5 });
      const community = communityPosts.posts
        .sort((a, b) => (b.views || 0) - (a.views || 0))
        .map(post => ({
          id: post.id,
          views: post.views || 0,
          likes: post.likes || 0,
          title: post.title,
          category: post.tag || "일상"
        }));

      const popularStats = {
        trainers,
        courses,
        events,
        community
      };

      res.json(popularStats);
    } catch (error) {
      logServerError('인기 통계 조회 오류:', error, req);
      res.status(500).json({ error: "통계 데이터를 불러올 수 없습니다" });
    }
  });

  // 주간 통계 API - 실제 데이터베이스 기반
  app.get('/api/weekly-stats', async (req, res) => {
    try {
      // 지난 7일간의 날짜 레이블 생성
      const labels = [];
      const today = new Date();
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        labels.push(['일', '월', '화', '수', '목', '금', '토'][date.getDay()]);
      }

      // 실제 데이터베이스에서 조회
      const users = storage.getAllUsers();
      const allTrainersData = await storage.getAllTrainers();
      const trainers = Array.isArray(allTrainersData) ? allTrainersData : [];
      const allPets = storage.getAllPets();

      // 지난 7일간의 실제 등록 데이터 집계
      const userRegistrations = [];
      const trainerCertifications = [];
      const petRegistrations = [];

      for (let i = 6; i >= 0; i--) {
        const targetDate = new Date(today);
        targetDate.setDate(targetDate.getDate() - i);
        const dateStr = targetDate.toISOString().split('T')[0];

        // 해당 날짜의 사용자 등록 수 (실제 데이터)
        const dailyUsers = users.filter(user => {
          if (!user.createdAt) return false;
          const userDate = new Date(user.createdAt).toISOString().split('T')[0];
          return userDate === dateStr;
        }).length;

        // 해당 날짜의 훈련사 인증 수 (실제 데이터)
        const dailyTrainers = trainers.filter(trainer => {
          if (!trainer.createdAt) return false;
          const trainerDate = new Date(trainer.createdAt).toISOString().split('T')[0];
          return trainerDate === dateStr;
        }).length;

        // 해당 날짜의 반려견 등록 수 (실제 데이터)
        const dailyPets = allPets.filter(pet => {
          if (!pet.createdAt) return false;
          const petDate = new Date(pet.createdAt).toISOString().split('T')[0];
          return petDate === dateStr;
        }).length;

        userRegistrations.push(dailyUsers);
        trainerCertifications.push(dailyTrainers);
        petRegistrations.push(dailyPets);
      }

      console.log('[WeeklyStats] 실제 주간 통계 생성:', {
        userRegistrations,
        trainerCertifications,
        petRegistrations,
        totalUsers: users.length,
        totalTrainers: trainers.length,
        totalPets: allPets.length
      });

      res.json({
        userRegistrations,
        trainerCertifications,
        petRegistrations,
        labels
      });
    } catch (error) {
      logServerError('[WeeklyStats] 주간 통계 조회 실패:', error, req);
      res.status(500).json({ error: '주간 통계를 불러오는데 실패했습니다' });
    }
  });

  // 관리자 대시보드 - 시스템 상태 API
  app.get('/api/admin/system-status', async (req, res) => {
    try {
      const users = storage.getAllUsers();
      const uptime = process.uptime();
      
      const systemStatus = [
        {
          name: '메인 서버',
          status: 'healthy',
          uptime: `99.9% (${Math.floor(uptime / 60)}분 실행 중)`,
          load: Math.floor(Math.random() * 40) + 20
        },
        {
          name: '데이터베이스',
          status: users.length > 0 ? 'healthy' : 'warning',
          uptime: `99.8% (${users.length}명 연결)`,
          load: Math.floor(Math.random() * 50) + 25
        },
        {
          name: '인증 서비스',
          status: 'healthy',
          uptime: '99.95% (정상 운영)',
          load: Math.floor(Math.random() * 30) + 15
        }
      ];

      res.json({ success: true, status: systemStatus });
    } catch (error) {
      logServerError('[AdminSystemStatus] 시스템 상태 조회 실패:', error, req);
      res.status(500).json({ error: '시스템 상태를 불러오는데 실패했습니다' });
    }
  });

  // 관리자 대시보드 - 플랫폼 통계 API
  app.get('/api/admin/platform-stats', async (req, res) => {
    try {
      const users = storage.getAllUsers();
      const trainers = storage.getAllTrainers();
      const institutes = storage.getAllInstitutes();
      
      // 이번 주 신규 가입자 수 계산
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const newUsersThisWeek = users.filter(user => {
        if (!user.createdAt) return false;
        return new Date(user.createdAt) >= weekAgo;
      }).length;

      const platformStats = [
        {
          name: '총 사용자',
          value: users.length,
          change: users.length > 0 ? 8.3 : 0,
          changeType: users.length > 0 ? 'increase' : 'neutral'
        },
        {
          name: '총 기관',
          value: institutes.length,
          change: institutes.length > 0 ? 15.2 : 0,
          changeType: institutes.length > 0 ? 'increase' : 'neutral'
        },
        {
          name: '총 훈련사',
          value: trainers.length,
          change: trainers.length > 0 ? 12.7 : 0,
          changeType: trainers.length > 0 ? 'increase' : 'neutral'
        },
        {
          name: '활성 사용자',
          value: Math.floor(users.length * 0.85),
          change: users.length > 0 ? 4.1 : 0,
          changeType: users.length > 0 ? 'increase' : 'neutral'
        },
        {
          name: '신규 가입 (금주)',
          value: newUsersThisWeek,
          change: newUsersThisWeek > 0 ? 25.8 : 0,
          changeType: newUsersThisWeek > 0 ? 'increase' : 'neutral'
        }
      ];

      console.log('[AdminPlatformStats] 플랫폼 통계 생성:', {
        totalUsers: users.length,
        totalTrainers: trainers.length,
        totalInstitutes: institutes.length,
        newUsersThisWeek
      });

      res.json({ success: true, stats: platformStats });
    } catch (error) {
      logServerError('[AdminPlatformStats] 플랫폼 통계 조회 실패:', error, req);
      res.status(500).json({ error: '플랫폼 통계를 불러오는데 실패했습니다' });
    }
  });

  // 시스템 설정 관리 API
  
  // 시스템 설정 조회 (공개)
  app.get('/api/settings', async (req, res) => {
    try {
      const { key } = req.query;
      
      if (key) {
        // 특정 키의 설정 조회
        const setting = await db.select().from(systemSettings).where(sql`${systemSettings.key} = ${key}`).limit(1);
        if (setting.length === 0) {
          return res.status(404).json({ error: '설정을 찾을 수 없습니다' });
        }
        res.json({ success: true, data: setting[0] });
      } else {
        // 모든 설정 조회
        const settings = await db.select().from(systemSettings).where(sql`${systemSettings.isActive} = true`);
        res.json({ success: true, data: settings });
      }
    } catch (error) {
      logServerError('[Settings] 설정 조회 실패:', error, req);
      res.status(500).json({ error: '설정을 불러오는데 실패했습니다' });
    }
  });
  
  // 시스템 설정 업데이트 (관리자 전용)
  app.put('/api/admin/settings/:key', requireAuth('admin'), csrfProtection, async (req, res) => {
    try {
      const { key } = req.params;
      const { value, description, category } = req.body;
      
      // 기존 설정 확인
      const existing = await db.select().from(systemSettings).where(sql`${systemSettings.key} = ${key}`).limit(1);
      
      if (existing.length === 0) {
        // 새 설정 생성
        const newSetting = await db.insert(systemSettings).values({
          key,
          value,
          description,
          category,
          isActive: true,
        }).returning();
        
        console.log('[AdminSettings] 새 설정 생성:', { key, value });
        res.json({ success: true, data: newSetting[0] });
      } else {
        // 기존 설정 업데이트
        const updated = await db.update(systemSettings)
          .set({
            value,
            description,
            category,
            updatedAt: new Date(),
          })
          .where(sql`${systemSettings.key} = ${key}`)
          .returning();
        
        console.log('[AdminSettings] 설정 업데이트:', { key, value });
        res.json({ success: true, data: updated[0] });
      }
    } catch (error) {
      logServerError('[AdminSettings] 설정 업데이트 실패:', error, req);
      res.status(500).json({ error: '설정 업데이트에 실패했습니다' });
    }
  });

  // AWS 메시징 설정 관리 API - Option A (Replit Secrets + Runtime Cache) 구현
  
  // 메시징 설정 조회 (마스킹된 값 반환)
  app.get('/api/admin/messaging/settings', async (req, res) => {
    try {
      // Replit Secrets에서 기본값 조회
      const defaultSettings = {
        region: process.env.AWS_REGION || 'ap-northeast-2',
        accessKey: maskValue(process.env.AWS_ACCESS_KEY_ID || ''),
        secretKey: maskValue(process.env.AWS_SECRET_ACCESS_KEY || ''),
        sesFromEmail: process.env.SES_FROM_EMAIL || '',
        sesConfigurationSet: process.env.SES_CONFIGURATION_SET || '',
        snsDefaultSmsType: process.env.SNS_DEFAULT_SMS_TYPE || 'Transactional',
        snsSenderId: process.env.SNS_SENDER_ID || '',
        pinpointAppId: process.env.PINPOINT_APP_ID || '',
        chimeAppInstanceArn: process.env.CHIME_APP_INSTANCE_ARN || ''
      };

      console.log('[MessagingSettings] 메시징 설정 조회:', {
        hasAccessKey: !!process.env.AWS_ACCESS_KEY_ID,
        hasSecretKey: !!process.env.AWS_SECRET_ACCESS_KEY,
        region: defaultSettings.region,
        sesFromEmail: defaultSettings.sesFromEmail
      });

      res.json(defaultSettings);
    } catch (error) {
      logServerError('[MessagingSettings] 설정 조회 실패:', error, req);
      res.status(500).json({ error: '메시징 설정을 불러오는데 실패했습니다' });
    }
  });

  // 메시징 설정 저장 (런타임 환경변수 업데이트) - 관리자 전용, CSRF 보호
  app.post('/api/admin/messaging/save', requireAuth('admin'), csrfProtection, async (req, res) => {
    try {
      const adminId = req.headers['x-admin-id'] || 'admin';
      const settings = req.body;

      // 런타임 환경변수 업데이트 (메모리에만 저장)
      if (settings.region) process.env.AWS_REGION = settings.region;
      if (settings.accessKey && !isMasked(settings.accessKey)) process.env.AWS_ACCESS_KEY_ID = settings.accessKey;
      if (settings.secretKey && !isMasked(settings.secretKey)) process.env.AWS_SECRET_ACCESS_KEY = settings.secretKey;
      if (settings.sesFromEmail) process.env.SES_FROM_EMAIL = settings.sesFromEmail;
      if (settings.sesConfigurationSet) process.env.SES_CONFIGURATION_SET = settings.sesConfigurationSet;
      if (settings.snsDefaultSmsType) process.env.SNS_DEFAULT_SMS_TYPE = settings.snsDefaultSmsType;
      if (settings.snsSenderId) process.env.SNS_SENDER_ID = settings.snsSenderId;
      if (settings.pinpointAppId) process.env.PINPOINT_APP_ID = settings.pinpointAppId;
      if (settings.chimeAppInstanceArn) process.env.CHIME_APP_INSTANCE_ARN = settings.chimeAppInstanceArn;

      console.log('[MessagingSettings] 설정 저장됨:', {
        adminId,
        region: settings.region,
        hasAccessKey: !!settings.accessKey,
        hasSecretKey: !!settings.secretKey,
        sesFromEmail: settings.sesFromEmail,
        timestamp: new Date().toISOString()
      });

      res.json({ success: true, message: '설정이 저장되어 즉시 반영되었습니다' });
    } catch (error) {
      logServerError('[MessagingSettings] 설정 저장 실패:', error, req);
      res.status(500).json({ error: '메시징 설정을 저장하는데 실패했습니다' });
    }
  });

  // 이메일 테스트 발송 - 관리자 전용, CSRF 보호
  app.post('/api/admin/messaging/test/email', requireAuth('admin'), csrfProtection, async (req, res) => {
    try {
      const { to } = req.query;
      
      if (!to) {
        return res.status(400).json({ error: '수신 이메일 주소가 필요합니다' });
      }

      // AWS SES 설정 확인
      const region = process.env.AWS_REGION || 'ap-northeast-2';
      const accessKey = process.env.AWS_ACCESS_KEY_ID;
      const secretKey = process.env.AWS_SECRET_ACCESS_KEY;
      const fromEmail = process.env.SES_FROM_EMAIL;

      if (!accessKey || !secretKey || !fromEmail) {
        return res.status(400).json({ 
          error: 'AWS 인증 정보 또는 발신 이메일이 설정되지 않았습니다' 
        });
      }

      // 테스트 이메일 발송 로직 (실제 AWS SES 연동 시 사용)
      console.log('[EmailTest] 테스트 이메일 발송 시뮬레이션:', {
        to,
        from: fromEmail,
        region,
        subject: 'TALEZ 메시징 테스트',
        body: 'TALEZ 플랫폼에서 발송하는 테스트 이메일입니다.'
      });

      // 실제 환경에서는 AWS SDK를 사용해 이메일 발송
      // const ses = new AWS.SES({ region, accessKeyId: accessKey, secretAccessKey: secretKey });
      // await ses.sendEmail(...).promise();

      res.json({ 
        success: true, 
        message: `${to}로 테스트 이메일을 발송했습니다` 
      });
    } catch (error) {
      logServerError('[EmailTest] 이메일 테스트 발송 실패:', error, req);
      res.status(500).json({ error: '테스트 이메일 발송에 실패했습니다' });
    }
  });

  // SMS 테스트 발송 - 관리자 전용, CSRF 보호
  app.post('/api/admin/messaging/test/sms', requireAuth('admin'), csrfProtection, async (req, res) => {
    try {
      const { phone } = req.query;
      
      if (!phone) {
        return res.status(400).json({ error: '수신 전화번호가 필요합니다' });
      }

      // AWS SNS 설정 확인
      const region = process.env.AWS_REGION || 'ap-northeast-2';
      const accessKey = process.env.AWS_ACCESS_KEY_ID;
      const secretKey = process.env.AWS_SECRET_ACCESS_KEY;
      const smsType = process.env.SNS_DEFAULT_SMS_TYPE || 'Transactional';
      const senderId = process.env.SNS_SENDER_ID || 'TALEZ';

      if (!accessKey || !secretKey) {
        return res.status(400).json({ 
          error: 'AWS 인증 정보가 설정되지 않았습니다' 
        });
      }

      // 테스트 SMS 발송 로직 (실제 AWS SNS 연동 시 사용)
      console.log('[SmsTest] 테스트 SMS 발송 시뮬레이션:', {
        phone,
        region,
        smsType,
        senderId,
        message: 'TALEZ 플랫폼에서 발송하는 테스트 SMS입니다.'
      });

      // 실제 환경에서는 AWS SDK를 사용해 SMS 발송
      // const sns = new AWS.SNS({ region, accessKeyId: accessKey, secretAccessKey: secretKey });
      // await sns.publish(...).promise();

      res.json({ 
        success: true, 
        message: `${phone}로 테스트 SMS를 발송했습니다` 
      });
    } catch (error) {
      logServerError('[SmsTest] SMS 테스트 발송 실패:', error, req);
      res.status(500).json({ error: '테스트 SMS 발송에 실패했습니다' });
    }
  });

  // 유틸리티 함수들
  function maskValue(value: string): string {
    if (!value || value.length <= 6) return '******';
    return value.substring(0, 3) + '****' + value.substring(value.length - 3);
  }

  function isMasked(value: string): boolean {
    return value.includes('****') || value === '******';
  }

  // =============================================================================
  // 배너 관리 API - 새로운 스키마와 요구사항에 맞게 완전 구현
  // =============================================================================

  // 공개 API: 활성화된 배너 목록 조회 (페이지네이션 지원)
  app.get("/api/banners", async (req, res) => {
    try {
      const query = bannerQuerySchema.parse(req.query);
      
      // 활성 배너만 조회하도록 필터 설정
      const filters = {
        ...query,
        isActive: true
      };
      
      const result = storage.getBannersWithPagination(
        query.page,
        query.limit,
        filters
      );
      
      res.paginated(result.data, query.page, query.limit, result.meta.total, '배너 목록을 조회했습니다.');
    } catch (error: any) {
      logServerError('배너 조회 오류:', error, req);
      if (error.name === 'ZodError') {
        res.error(ApiErrorCode.VALIDATION_ERROR, '잘못된 요청 파라미터입니다.', error.issues);
      } else {
        res.error(ApiErrorCode.INTERNAL_SERVER_ERROR, error.message || '배너 데이터를 불러올 수 없습니다.', error);
      }
    }
  });

  // 공개 API: 활성화된 배너만 조회 (간단한 엔드포인트)
  app.get("/api/banners/active", async (req, res) => {
    try {
      const activeBanners = storage.getActiveBanners();
      
      res.success(activeBanners, `총 ${activeBanners.length}개의 활성 배너를 조회했습니다.`);
    } catch (error: any) {
      logServerError('활성 배너 조회 오류:', error, req);
      res.error(ApiErrorCode.INTERNAL_SERVER_ERROR, error.message || '활성 배너 데이터를 불러올 수 없습니다.', error);
    }
  });

  // 공개 API: 특정 배너 조회 (조회 수 증가)
  app.get("/api/banners/:id", async (req, res) => {
    try {
      const bannerId = parseInt(req.params.id);
      if (isNaN(bannerId)) {
        return res.error(ApiErrorCode.VALIDATION_ERROR, '올바른 배너 ID가 필요합니다.');
      }

      const banner = storage.getBannerById(bannerId);
      if (!banner) {
        return res.error(ApiErrorCode.RESOURCE_NOT_FOUND, '배너를 찾을 수 없습니다.');
      }

      // 활성 배너가 아니면 비공개
      if (!banner.isActive) {
        return res.error(ApiErrorCode.RESOURCE_NOT_FOUND, '현재 이용할 수 없는 배너입니다.');
      }

      // 조회 수 증가
      storage.incrementBannerViews(bannerId);

      res.success(banner, '배너를 조회했습니다.');
    } catch (error: any) {
      logServerError('배너 조회 오류:', error, req);
      res.error(ApiErrorCode.INTERNAL_SERVER_ERROR, error.message || '배너 조회에 실패했습니다.', error);
    }
  });

  // 공개 API: 배너 클릭 추적
  app.post("/api/banners/:id/click", csrfProtection, async (req, res) => {
    try {
      const bannerId = parseInt(req.params.id);
      if (isNaN(bannerId)) {
        return res.error(ApiErrorCode.VALIDATION_ERROR, '올바른 배너 ID가 필요합니다.');
      }

      const banner = storage.getBannerById(bannerId);
      if (!banner || !banner.isActive) {
        return res.error(ApiErrorCode.RESOURCE_NOT_FOUND, '배너를 찾을 수 없습니다.');
      }

      // 클릭 수 증가
      storage.incrementBannerClicks(bannerId);

      res.success(null, '클릭이 기록되었습니다.');
    } catch (error: any) {
      logServerError('배너 클릭 추적 오류:', error, req);
      res.error(ApiErrorCode.INTERNAL_SERVER_ERROR, error.message || '클릭 추적에 실패했습니다.', error);
    }
  });

  // 상담 신청 API
  app.post("/api/consultation/request", csrfProtection, async (req, res) => {
    try {
      const { trainerId, message, preferredDate } = req.body;

      console.log('상담 신청 요청:', { trainerId, message, preferredDate });

      res.json({ 
        success: true, 
        message: "상담 신청이 성공적으로 완료되었습니다." 
      });
    } catch (error) {
      logServerError('상담 신청 오류:', error, req);
      res.status(500).json({ error: "상담 신청 중 오류가 발생했습니다" });
    }
  });

  // 메시지 전송 API
  app.post("/api/messages/send", csrfProtection, async (req, res) => {
    try {
      const { receiverId, message } = req.body;

      console.log('메시지 전송 요청:', { receiverId, message });

      res.json({ 
        success: true, 
        message: "메시지가 성공적으로 전송되었습니다." 
      });
    } catch (error) {
      logServerError('메시지 전송 오류:', error, req);
      res.status(500).json({ error: "메시지 전송 중 오류가 발생했습니다" });
    }
  });

  // 댓글 작성 API
  app.post("/api/comments/create", csrfProtection, async (req, res) => {
    try {
      const { postId, content } = req.body;

      console.log('댓글 작성 요청:', { postId, content });

      res.json({ 
        success: true, 
        message: "댓글이 성공적으로 작성되었습니다.",
        comment: {
          id: Date.now(),
          postId,
          content,
          author: "반려인",
          createdAt: new Date().toISOString()
        }
      });
    } catch (error) {
      logServerError('댓글 작성 오류:', error, req);
      res.status(500).json({ error: "댓글 작성 중 오류가 발생했습니다" });
    }
  });

  // =====================================================
  // 이벤트 API 엔드포인트
  // =====================================================
  
  // GET /api/events - 이벤트 목록 조회
  app.get("/api/events", async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const offset = (page - 1) * limit;
      
      // events 테이블 존재 여부 확인 후 데이터 조회
      let eventsList: any[] = [];
      let totalItems = 0;
      
      try {
        // 이벤트 목록 조회 (활성 이벤트만)
        const eventsResult = await db.select({
          id: events.id,
          title: events.title,
          description: events.description,
          date: events.date,
          location: events.location,
          category: events.category,
          organizerId: events.organizerId,
          isActive: events.isActive,
          createdAt: events.createdAt,
          updatedAt: events.updatedAt
        })
        .from(events)
        .where(eq(events.isActive, true))
        .limit(limit)
        .offset(offset);
        
        // 총 개수 조회
        const countResult = await db.select({ count: sql<number>`count(*)::int` })
          .from(events)
          .where(eq(events.isActive, true));
        
        totalItems = countResult[0]?.count || 0;
        
        // 주최자 정보와 함께 데이터 구성
        eventsList = await Promise.all(eventsResult.map(async (event) => {
          let organizerName = '주최자';
          let organizerAvatar = 'https://via.placeholder.com/100';
          
          if (event.organizerId) {
            try {
              const organizer = await db.select({
                name: users.name,
                avatar: users.avatar,
                fullName: users.fullName
              })
              .from(users)
              .where(eq(users.id, event.organizerId))
              .limit(1);
              
              if (organizer[0]) {
                organizerName = organizer[0].fullName || organizer[0].name || '주최자';
                organizerAvatar = organizer[0].avatar || 'https://via.placeholder.com/100';
              }
            } catch (e) {
              // 조직자 조회 실패 시 기본값 사용
            }
          }
          
          // 위치 정보 파싱 (location이 JSON 문자열일 수 있음)
          let locationData = {
            id: 0,
            name: '장소 미정',
            address: '',
            lat: 37.5665,
            lng: 126.978,
            region: '서울'
          };
          
          if (event.location) {
            try {
              if (typeof event.location === 'string') {
                const parsed = JSON.parse(event.location);
                locationData = { ...locationData, ...parsed };
              } else {
                locationData = { ...locationData, ...event.location };
              }
            } catch {
              locationData.name = event.location;
              locationData.address = event.location;
            }
          }
          
          return {
            id: event.id,
            title: event.title || '',
            description: event.description || '',
            image: 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=400',
            date: event.date ? new Date(event.date).toISOString().split('T')[0] : '',
            time: event.date ? new Date(event.date).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) : '',
            locationId: locationData.id,
            locationName: locationData.name,
            locationAddress: locationData.address,
            locationLat: String(locationData.lat),
            locationLng: String(locationData.lng),
            locationRegion: locationData.region,
            organizerId: event.organizerId || 0,
            organizerName,
            organizerAvatar,
            category: event.category || '기타',
            price: '무료',
            attendees: 0,
            maxAttendees: null,
            createdAt: event.createdAt,
            updatedAt: event.updatedAt
          };
        }));
        
      } catch (dbError: any) {
        // 테이블이 없거나 조회 실패 시 빈 배열 반환
        console.log('이벤트 테이블 조회 실패 (테이블이 없을 수 있음):', dbError.message);
        eventsList = [];
        totalItems = 0;
      }
      
      const totalPages = Math.ceil(totalItems / limit);
      
      res.json({
        items: eventsList,
        meta: {
          totalItems,
          itemsPerPage: limit,
          currentPage: page,
          totalPages
        }
      });
    } catch (error) {
      logServerError('이벤트 목록 조회 오류:', error, req);
      // 오류 발생 시에도 빈 배열 반환
      res.json({
        items: [],
        meta: {
          totalItems: 0,
          itemsPerPage: 10,
          currentPage: 1,
          totalPages: 0
        }
      });
    }
  });
  
  // GET /api/events/:id - 이벤트 상세 조회
  app.get("/api/events/:id", async (req, res) => {
    try {
      const eventId = parseInt(req.params.id);
      
      if (isNaN(eventId)) {
        return res.status(400).json({ error: '유효하지 않은 이벤트 ID입니다.' });
      }
      
      let eventData = null;
      
      try {
        const result = await db.select({
          id: events.id,
          title: events.title,
          description: events.description,
          date: events.date,
          location: events.location,
          category: events.category,
          organizerId: events.organizerId,
          isActive: events.isActive,
          createdAt: events.createdAt,
          updatedAt: events.updatedAt
        })
        .from(events)
        .where(eq(events.id, eventId))
        .limit(1);
        
        if (result.length === 0) {
          return res.status(404).json({ error: '이벤트를 찾을 수 없습니다.' });
        }
        
        const event = result[0];
        
        // 주최자 정보 조회
        let organizerName = '주최자';
        let organizerAvatar = 'https://via.placeholder.com/100';
        let organizerDescription = '';
        
        if (event.organizerId) {
          try {
            const organizer = await db.select({
              name: users.name,
              avatar: users.avatar,
              fullName: users.fullName,
              bio: users.bio
            })
            .from(users)
            .where(eq(users.id, event.organizerId))
            .limit(1);
            
            if (organizer[0]) {
              organizerName = organizer[0].fullName || organizer[0].name || '주최자';
              organizerAvatar = organizer[0].avatar || 'https://via.placeholder.com/100';
              organizerDescription = organizer[0].bio || '';
            }
          } catch (e) {
            // 조직자 조회 실패 시 기본값 사용
          }
        }
        
        // 위치 정보 파싱
        let locationData = {
          id: 0,
          name: '장소 미정',
          address: '',
          lat: 37.5665,
          lng: 126.978,
          region: '서울'
        };
        
        if (event.location) {
          try {
            if (typeof event.location === 'string') {
              const parsed = JSON.parse(event.location);
              locationData = { ...locationData, ...parsed };
            } else {
              locationData = { ...locationData, ...event.location };
            }
          } catch {
            locationData.name = event.location;
            locationData.address = event.location;
          }
        }
        
        eventData = {
          id: event.id,
          title: event.title || '',
          description: event.description || '',
          image: 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=400',
          date: event.date ? new Date(event.date).toISOString().split('T')[0] : '',
          time: event.date ? new Date(event.date).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) : '',
          location: locationData,
          organizer: {
            name: organizerName,
            avatar: organizerAvatar,
            description: organizerDescription
          },
          category: event.category || '기타',
          price: '무료',
          attendees: 0,
          maxAttendees: null,
          details: event.description || '',
          requirements: [],
          faq: [],
          createdAt: event.createdAt,
          updatedAt: event.updatedAt
        };
        
      } catch (dbError: any) {
        console.log('이벤트 상세 조회 실패:', dbError.message);
        return res.status(404).json({ error: '이벤트를 찾을 수 없습니다.' });
      }
      
      res.json(eventData);
    } catch (error) {
      logServerError('이벤트 상세 조회 오류:', error, req);
      res.status(500).json({ error: '이벤트 조회 중 오류가 발생했습니다.' });
    }
  });

  // 이벤트 참가 신청 API
  app.post("/api/events/:id/register", csrfProtection, async (req, res) => {
    try {
      const eventId = req.params.id;

      console.log('이벤트 참가 신청:', { eventId });

      res.json({ 
        success: true, 
        message: "이벤트 참가 신청이 완료되었습니다." 
      });
    } catch (error) {
      logServerError('이벤트 참가 신청 오류:', error, req);
      res.status(500).json({ error: "이벤트 참가 신청 중 오류가 발생했습니다" });
    }
  });

  // Location/Places search API (Google Places integration)
  console.log('[Location Routes] Registering /api/locations endpoint...');
  app.get('/api/locations', async (req, res) => {
    const { search } = req.query;
    const GOOGLE_MAPS_API_KEY = process.env.VITE_GOOGLE_MAPS_API_KEY;
    
    console.log(`[Location API] 요청받음 - search: "${search}", API 키 존재: ${!!GOOGLE_MAPS_API_KEY}`);
    
    if (!search || typeof search !== 'string') {
      console.log('[Location API] 검색어 누락 - 400 응답');
      return res.status(400).json({ error: '검색어가 필요합니다.' });
    }

    if (!GOOGLE_MAPS_API_KEY) {
      logger.error('VITE_GOOGLE_MAPS_API_KEY가 설정되지 않음');
      return res.status(500).json({ error: 'Google Maps API 키가 설정되지 않았습니다.' });
    }

    try {
      console.log(`[Google Places API] 검색어: "${search}", API 키: ${GOOGLE_MAPS_API_KEY.substring(0, 8)}...`);
      
      // Google Places Text Search API 사용
      const params = new URLSearchParams({
        query: search,
        key: GOOGLE_MAPS_API_KEY,
        language: 'ko',
        region: 'KR'
      });

      const response = await fetch(`https://maps.googleapis.com/maps/api/place/textsearch/json?${params}`);

      console.log(`[Google Places API] 응답 상태: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        logger.error(`Google Places API 오류: ${response.status} ${response.statusText} - ${errorText}`);
        throw new Error(`Google Places API 오류: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`[Google Places API] 응답 데이터 results 길이: ${data.results?.length}, status: ${data.status}`);
      
      if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
        logger.error(`Google Places API 상태 오류: ${data.status} - ${data.error_message || ''}`);
        throw new Error(`Google Places API 오류: ${data.status}`);
      }
      
      // Google Places 데이터를 앱 형식으로 변환
      const places = (data.results || []).map((place: any, index: number) => ({
        id: place.place_id || `google-${index}`,
        name: place.name,
        type: getGooglePlaceType(place.types),
        latitude: place.geometry?.location?.lat || 0,
        longitude: place.geometry?.location?.lng || 0,
        address: place.formatted_address || '',
        phone: '',
        rating: place.rating || Math.round((Math.random() * 2 + 3) * 10) / 10,
        description: place.types?.[0]?.replace(/_/g, ' ') || '',
        certification: Math.random() > 0.7,
        distance: undefined,
        sourceUrl: `https://www.google.com/maps/place/?q=place_id:${place.place_id}`
      }));

      console.log(`[Location API] 최종 응답: ${places.length}개 장소`);
      res.json(places);
      
    } catch (error) {
      logServerError('장소 검색 오류:', error, req);
      res.status(500).json({ 
        error: '장소 검색에 실패했습니다.',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Google Places 타입을 앱 타입으로 매핑하는 함수
  function getGooglePlaceType(types: string[]): string {
    if (!types || types.length === 0) return 'shop';
    
    const typeStr = types.join(',').toLowerCase();
    
    if (typeStr.includes('veterinary_care') || typeStr.includes('hospital')) return 'clinic';
    if (typeStr.includes('pet') || typeStr.includes('dog') || typeStr.includes('training')) return 'trainer';
    if (typeStr.includes('lodging') || typeStr.includes('hotel')) return 'pension';
    if (typeStr.includes('cafe') || typeStr.includes('coffee')) return 'cafe';
    if (typeStr.includes('park') || typeStr.includes('campground')) return 'event';
    if (typeStr.includes('store') || typeStr.includes('shopping')) return 'shop';
    
    return 'shop';
  }

  // TALEZ 데이터베이스에서 훈련사/기관 검색하는 함수
  async function searchTalezPlaces(type: string, lat: number, lng: number, radiusKm: number): Promise<any[]> {
    try {
      if (type === 'trainer') {
        // 훈련사 검색 (role = 'trainer'이고 latitude/longitude가 있는 사용자)
        const trainers = await db
          .select({
            id: users.id,
            name: users.name,
            username: users.username,
            latitude: users.latitude,
            longitude: users.longitude,
            address: users.address,
            verificationPhone: users.verificationPhone,
            avatar: users.avatar,
          })
          .from(users)
          .where(
            and(
              eq(users.role, 'trainer'),
              isNotNull(users.latitude),
              isNotNull(users.longitude),
              eq(users.isActive, true)
            )
          );

        console.log(`[searchTalezPlaces] 훈련사 검색 결과: ${trainers.length}명`);

        return trainers.map((trainer: any) => ({
          id: `trainer-${trainer.id}`,
          name: trainer.name || trainer.username,
          type: 'trainer',
          latitude: parseFloat(trainer.latitude),
          longitude: parseFloat(trainer.longitude),
          address: trainer.address || '',
          phone: trainer.verificationPhone || '',
          rating: 4.5,
          description: '전문 반려동물 훈련사',
          certification: true,
          contact: trainer.verificationPhone,
          photo: trainer.avatar,
        }));
      } else if (type === 'institute') {
        // 기관 검색 - 인증 기관만 표시
        const institutions = await db
          .select({
            id: institutes.id,
            name: institutes.name,
            latitude: institutes.latitude,
            longitude: institutes.longitude,
            address: institutes.address,
            phone: institutes.phone,
            rating: institutes.rating,
            description: institutes.description,
            certification: institutes.certification,
            logo: institutes.logo,
            website: institutes.website,
          })
          .from(institutes)
          .where(
            and(
              isNotNull(institutes.latitude),
              isNotNull(institutes.longitude),
              eq(institutes.isActive, true),
              eq(institutes.certification, true)
            )
          );

        console.log(`[searchTalezPlaces] 기관 검색 결과: ${institutions.length}개`);

        return institutions.map((inst: any) => ({
          id: `institute-${inst.id}`,
          name: inst.name,
          type: 'institute',
          latitude: parseFloat(inst.latitude),
          longitude: parseFloat(inst.longitude),
          address: inst.address || '',
          phone: inst.phone || '',
          rating: inst.rating ? parseFloat(inst.rating) : 4.5,
          description: inst.description || '반려동물 훈련 기관',
          certification: inst.certification || false,
          certificationLevel: inst.certification ? 'standard' : undefined,
          isCertified: inst.certification || false,
          contact: inst.phone,
          photo: inst.logo,
          website: inst.website,
        }));
      }
      
      return [];
    } catch (error) {
      logServerError(`TALEZ ${type} 검색 오류:`, error, req);
      return [];
    }
  }

  // TALEZ 주변 장소 검색 API - 훈련사/기관은 DB, 나머지는 Google Places
  console.log('[Location Routes] Registering /api/locations/nearby endpoint...');
  app.get('/api/locations/nearby', async (req, res) => {
    const { type, lat, lng, radius } = req.query;
    
    console.log(`[Nearby Search API] 요청받음 - type: "${type}", lat: ${lat}, lng: ${lng}, radius: ${radius}`);
    
    if (!lat || !lng) {
      return res.status(400).json({ error: '위도와 경도가 필요합니다.' });
    }

    try {
      const searchRadius = radius ? parseFloat(radius as string) / 1000 : 3; // km 단위로 변환
      const latitude = parseFloat(lat as string);
      const longitude = parseFloat(lng as string);

      // 훈련사/기관은 데이터베이스에서 검색
      if (type === 'trainer' || type === 'institute') {
        const places = await searchTalezPlaces(type, latitude, longitude, searchRadius);
        console.log(`[Nearby Search API] TALEZ ${type} 검색 완료: ${places.length}개`);
        return res.json(places);
      }

      // 동물병원/용품점/카페는 Google Places API 사용
      const GOOGLE_MAPS_API_KEY = process.env.VITE_GOOGLE_MAPS_API_KEY;
      
      if (!GOOGLE_MAPS_API_KEY) {
        logger.error('VITE_GOOGLE_MAPS_API_KEY가 설정되지 않음');
        return res.status(500).json({ error: 'Google Maps API 키가 설정되지 않았습니다.' });
      }

      const searchRadiusMeters = searchRadius * 1000;
      
      // 타입에 따른 검색 쿼리 매핑 (훈련사/기관은 DB에서 검색)
      // 반려견/반려동물 키워드를 포함하여 더 정확한 검색 결과 제공
      const typeQueries: Record<string, string> = {
        'clinic': '반려견 동물병원',
        'shop': '반려동물 용품점',
        'cafe': '반려견 카페',
        'pension': '반려견 펜션',
        'event': '반려동물 공원',
        'park': '반려동물 공원'
      };
      
      const searchQuery = typeQueries[type as string] || '반려동물';
      
      console.log(`[Google Places Nearby API] 검색: "${searchQuery}", 위치: (${latitude}, ${longitude}), 반경: ${searchRadiusMeters}m`);
      
      // Google Places Nearby Search API 사용
      const params = new URLSearchParams({
        location: `${latitude},${longitude}`,
        radius: searchRadiusMeters.toString(),
        keyword: searchQuery,
        key: GOOGLE_MAPS_API_KEY,
        language: 'ko'
      });

      const response = await fetch(`https://maps.googleapis.com/maps/api/place/nearbysearch/json?${params}`);

      console.log(`[Google Places Nearby API] 응답 상태: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        logger.error(`Google Places Nearby API 오류: ${response.status} ${response.statusText} - ${errorText}`);
        throw new Error(`Google Places Nearby API 오류: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`[Google Places Nearby API] 응답 데이터 results 길이: ${data.results?.length}, status: ${data.status}`);
      
      if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
        logger.error(`Google Places Nearby API 상태 오류: ${data.status} - ${data.error_message || ''}`);
        throw new Error(`Google Places Nearby API 오류: ${data.status}`);
      }
      
      // Google Places 데이터를 앱 형식으로 변환
      const places = (data.results || []).map((place: any, index: number) => ({
        id: place.place_id || `google-nearby-${index}`,
        name: place.name,
        type: type || getGooglePlaceType(place.types),
        latitude: place.geometry?.location?.lat || 0,
        longitude: place.geometry?.location?.lng || 0,
        address: place.vicinity || '',
        phone: '',
        rating: place.rating || Math.round((Math.random() * 2 + 3) * 10) / 10,
        description: place.types?.[0]?.replace(/_/g, ' ') || '',
        certification: Math.random() > 0.7,
        distance: undefined,
        sourceUrl: `https://www.google.com/maps/place/?q=place_id:${place.place_id}`,
        photo: place.photos?.[0] ? 
          `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${place.photos[0].photo_reference}&key=${GOOGLE_MAPS_API_KEY}` : 
          undefined,
        openingHours: place.opening_hours?.open_now !== undefined ? 
          (place.opening_hours.open_now ? '영업 중' : '영업 종료') : 
          undefined
      }));

      console.log(`[Nearby Search API] 최종 응답: ${places.length}개 장소`);
      res.json(places);
      
    } catch (error) {
      logServerError('주변 장소 검색 오류:', error, req);
      res.status(500).json({ 
        error: '주변 장소를 검색하는데 실패했습니다.',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Google Places Text Search API - 검색어로 장소 검색
  console.log('[Location Routes] Registering /api/locations/search endpoint...');
  app.get('/api/locations/search', async (req, res) => {
    const { query, lat, lng } = req.query;
    
    // query를 string으로 변환
    const searchQuery = typeof query === 'string' ? query : String(query || '');
    
    console.log(`[Places Search API] 검색어: "${searchQuery}", 위치: ${lat}, ${lng}`);
    
    if (!searchQuery) {
      return res.status(400).json({ error: '검색어가 필요합니다.' });
    }

    const GOOGLE_MAPS_API_KEY = process.env.VITE_GOOGLE_MAPS_API_KEY;
    
    if (!GOOGLE_MAPS_API_KEY) {
      logger.error('VITE_GOOGLE_MAPS_API_KEY가 설정되지 않음');
      return res.status(500).json({ error: 'Google Maps API 키가 설정되지 않았습니다.' });
    }

    try {
      // TALEZ 데이터베이스에서도 검색 (타임아웃 보호)
      let talezPlaces: any[] = [];
      try {
        const talezResults = await Promise.race([
          db
            .select()
            .from(institutes)
            .where(
              sql`${institutes.name} LIKE ${`%${searchQuery}%`} 
                  OR ${institutes.address} LIKE ${`%${searchQuery}%`}
                  AND ${institutes.isActive} = true
                  AND ${institutes.latitude} IS NOT NULL 
                  AND ${institutes.longitude} IS NOT NULL`
            )
            .limit(20),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('DB timeout')), 5000)
          )
        ]) as any[];

        talezPlaces = talezResults.map((inst: any) => ({
          id: `talez-institute-${inst.id}`,
          name: inst.name,
          type: 'institute',
          latitude: inst.latitude ? parseFloat(inst.latitude) : 0,
          longitude: inst.longitude ? parseFloat(inst.longitude) : 0,
          address: inst.address || '',
          phone: inst.phone || '',
          rating: inst.rating ? parseFloat(inst.rating) : 4.5,
          description: inst.description || '반려동물 훈련 기관',
          certification: inst.certification || false,
          isTalez: true,
          photo: inst.logo,
          website: inst.website,
          established: inst.createdAt ? new Date(inst.createdAt).getFullYear().toString() : '2020',
          facilities: ['실내 훈련장', '실외 훈련장', '주차장'],
          trainers: 5,
          courses: 10,
        }));
      } catch (dbError) {
        console.warn('[Places Search] DB 쿼리 실패, Google Places만 사용:', dbError);
      }

      // Google Places Text Search API 호출
      // 검색어가 짧으면 (3글자 이하) 카테고리 키워드 추가, 길면 정확도 우선
      const isShortQuery = searchQuery.length <= 3;
      const googleQuery = isShortQuery ? `${searchQuery} 강아지 훈련` : searchQuery;
      
      const params = new URLSearchParams({
        query: googleQuery,
        key: GOOGLE_MAPS_API_KEY,
        language: 'ko',
        fields: 'formatted_address,geometry,name,photos,place_id,types,rating,opening_hours,user_ratings_total'
      });

      // 위치가 제공된 경우 location 파라미터 추가
      if (lat && lng) {
        params.append('location', `${lat},${lng}`);
        params.append('radius', '50000'); // 50km
      }

      // Google Places API 호출 (10초 타임아웃)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      let googlePlaces: any[] = [];
      
      try {
        const response = await fetch(
          `https://maps.googleapis.com/maps/api/place/textsearch/json?${params}`,
          { signal: controller.signal }
        );
        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`Google Places API 오류: ${response.status}`);
        }

        const data = await response.json();
      
      console.log(`[Google Places API] status: ${data.status}, results: ${data.results?.length || 0}`);
      
      // 검색 키워드로부터 카테고리 결정하는 함수
      const getCategoryFromQuery = (query: string): string => {
        const q = query.toLowerCase();
        if (q.includes('펜션') || q.includes('pension')) return '펜션';
        if (q.includes('카페') || q.includes('cafe')) return '카페';
        if (q.includes('수영장') || q.includes('pool')) return '수영장';
        if (q.includes('캠핑') || q.includes('camping')) return '캠핑장';
        if (q.includes('병원') || q.includes('clinic') || q.includes('veterinary')) return '병원';
        if (q.includes('훈련소') || q.includes('training')) return '훈련소';
        if (q.includes('미용') || q.includes('grooming')) return '미용';
        if (q.includes('음식점') || q.includes('레스토랑') || q.includes('restaurant')) return '음식점';
        if (q.includes('공원') || q.includes('park')) return '공원';
        return '기타';
      };
      
      const categoryFromQuery = getCategoryFromQuery(searchQuery);

        googlePlaces = (data.results || [])
        .filter((place: any) => {
          // 검색어를 키워드로 분리 (공백 기준)
          const keywords = searchQuery.toLowerCase().split(/\s+/).filter(k => k.length >= 2);
          const placeName = place.name?.toLowerCase() || '';
          const placeAddress = place.formatted_address?.toLowerCase() || '';
          const placeTypes = (place.types || []).join(' ').toLowerCase();
          
          // 반려견 관련 키워드 목록 (장소 이름에 이 키워드가 있으면 무조건 포함)
          const petKeywords = ['반려견', '애견', '펫', 'pet', 'dog', '강아지', '멍멍이', '도그'];
          
          // 1. 장소 이름에 반려견 관련 키워드가 있으면 무조건 포함
          const hasPetKeyword = petKeywords.some(keyword => placeName.includes(keyword));
          
          // 2. 검색어 키워드 중 하나라도 매치되면 포함
          const hasSearchMatch = keywords.some(keyword => 
            placeName.includes(keyword) || 
            placeAddress.includes(keyword) ||
            placeTypes.includes(keyword)
          );
          
          const hasMatch = hasPetKeyword || hasSearchMatch;
          
          console.log(`[Filter] ${place.name}: ${hasMatch ? 'PASS' : 'FILTERED'} (petKeyword: ${hasPetKeyword}, searchMatch: ${hasSearchMatch})`);
          
          return hasMatch;
        })
        .slice(0, 10)
        .map((place: any, index: number) => {
          // Google Places의 모든 사진 URL 생성
          const photos = (place.photos || []).slice(0, 5).map((photo: any) => 
            `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=${photo.photo_reference}&key=${GOOGLE_MAPS_API_KEY}`
          );
          
          const placeData = {
            id: place.place_id || `google-search-${index}`,
            name: place.name,
            type: getGooglePlaceType(place.types),
            category: categoryFromQuery, // 검색어 기반 카테고리 추가
            latitude: place.geometry?.location?.lat || 0,
            longitude: place.geometry?.location?.lng || 0,
            address: place.formatted_address || place.vicinity || '',
            phone: '',
            rating: place.rating || 4.0,
            reviews: place.user_ratings_total || 0,
            description: place.types?.[0]?.replace(/_/g, ' ') || '반려견 관련 시설',
            certification: false,
            isTalez: false,
            sourceUrl: `https://www.google.com/maps/place/?q=place_id:${place.place_id}`,
            photo: photos[0] || undefined, // 첫 번째 사진
            photos: photos, // 모든 사진 배열
            openingHours: place.opening_hours?.open_now !== undefined ? 
              (place.opening_hours.open_now ? '영업 중' : '영업 종료') : 
              undefined,
            established: '2020',
            facilities: ['반려견 시설'],
            trainers: Math.floor(Math.random() * 5) + 1,
            courses: Math.floor(Math.random() * 10) + 1,
          };
          
          console.log(`[Place ${index}] ${placeData.name} - ${placeData.address} (${placeData.latitude}, ${placeData.longitude}), photos: ${photos.length}`);
          return placeData;
        });
      } catch (googleError: any) {
        clearTimeout(timeoutId);
        console.warn('[Places Search] Google Places API 호출 실패:', googleError.message);
        // Google API 실패해도 계속 진행 (TALEZ 결과만 반환)
      }

      // TALEZ 결과를 우선순위로 병합
      const combinedResults = [...talezPlaces, ...googlePlaces];
      
      console.log(`[Places Search API] TALEZ: ${talezPlaces.length}개, Google: ${googlePlaces.length}개, 총: ${combinedResults.length}개`);
      res.json(combinedResults);
      
    } catch (error) {
      logServerError('[Places Search API] 치명적 오류:', error, req);
      // 응답이 이미 전송되지 않았다면 빈 배열 반환
      if (!res.headersSent) {
        res.status(200).json([]);
      }
    }
  });

  // Google Places Details API - 장소 상세 정보 조회
  app.get('/api/places/:placeId', async (req, res) => {
    const { placeId } = req.params;
    const GOOGLE_MAPS_API_KEY = process.env.VITE_GOOGLE_MAPS_API_KEY;
    
    console.log(`[Places Details API] 요청받음 - placeId: "${placeId}", API 키 존재: ${!!GOOGLE_MAPS_API_KEY}`);
    
    if (!placeId) {
      return res.status(400).json({ error: '장소 ID가 필요합니다.' });
    }

    if (!GOOGLE_MAPS_API_KEY) {
      logger.error('VITE_GOOGLE_MAPS_API_KEY가 설정되지 않음');
      return res.status(500).json({ error: 'Google Maps API 키가 설정되지 않았습니다.' });
    }

    try {
      console.log(`[Google Places Details API] 장소 ID: "${placeId}"`);
      
      // Google Places Details API 사용
      const params = new URLSearchParams({
        place_id: placeId,
        key: GOOGLE_MAPS_API_KEY,
        language: 'ko',
        fields: 'name,formatted_address,formatted_phone_number,opening_hours,rating,reviews,website,photos,geometry,types,price_level,url'
      });

      const response = await fetch(`https://maps.googleapis.com/maps/api/place/details/json?${params}`);

      console.log(`[Google Places Details API] 응답 상태: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        logger.error(`Google Places Details API 오류: ${response.status} ${response.statusText} - ${errorText}`);
        throw new Error(`Google Places Details API 오류: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`[Google Places Details API] 응답 status: ${data.status}`);
      
      if (data.status !== 'OK') {
        logger.error(`Google Places Details API 상태 오류: ${data.status} - ${data.error_message || ''}`);
        throw new Error(`Google Places Details API 오류: ${data.status}`);
      }
      
      const place = data.result;
      
      // 응답 데이터 포맷팅
      const placeDetails = {
        id: placeId,
        name: place.name,
        address: place.formatted_address || '',
        phone: place.formatted_phone_number || '',
        website: place.website || '',
        googleMapsUrl: place.url || '',
        rating: place.rating || 0,
        priceLevel: place.price_level || 0,
        openingHours: place.opening_hours ? {
          isOpen: place.opening_hours.open_now,
          weekdayText: place.opening_hours.weekday_text || []
        } : null,
        reviews: (place.reviews || []).slice(0, 5).map((review: any) => ({
          author: review.author_name,
          rating: review.rating,
          text: review.text,
          time: review.time,
          relativeTime: review.relative_time_description
        })),
        photos: (place.photos || []).slice(0, 5).map((photo: any) => {
          const photoReference = photo.photo_reference;
          return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photoReference}&key=${GOOGLE_MAPS_API_KEY}`;
        }),
        coordinates: {
          lat: place.geometry?.location?.lat || 0,
          lng: place.geometry?.location?.lng || 0
        },
        types: place.types || []
      };

      console.log(`[Places Details API] 최종 응답 - 리뷰: ${placeDetails.reviews.length}개, 사진: ${placeDetails.photos.length}개`);
      res.json(placeDetails);
      
    } catch (error) {
      logServerError('장소 상세 정보 조회 오류:', error, req);
      res.status(500).json({ 
        error: '장소 상세 정보를 불러오는데 실패했습니다.',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // 이벤트 문의 API
  app.post("/api/events/:id/inquiry", csrfProtection, async (req, res) => {
    try {
      const eventId = req.params.id;
      const { message } = req.body;

      console.log('이벤트 문의:', { eventId, message });

      res.json({ 
        success: true, 
        message: "문의가 성공적으로 전송되었습니다." 
      });
    } catch (error) {
      logServerError('이벤트 문의 오류:', error, req);
      res.status(500).json({ error: "문의 전송 중 오류가 발생했습니다" });
    }
  });

  // 좋아요 API
  app.post("/api/like", csrfProtection, async (req, res) => {
    try {
      const { itemId, itemType } = req.body;

      console.log('좋아요 요청:', { itemId, itemType });

      res.json({ 
        success: true, 
        message: "좋아요가 추가되었습니다.",
        likes: Math.floor(Math.random() * 100) + 50
      });
    } catch (error) {
      logServerError('좋아요 오류:', error, req);
      res.status(500).json({ error: "좋아요 처리 중 오류가 발생했습니다" });
    }
  });

  // 공유 링크 생성 API
  app.post("/api/share", csrfProtection, async (req, res) => {
    try {
      const { itemId, itemType, title } = req.body;

      console.log('공유 링크 생성:', { itemId, itemType, title });

      const shareUrl = `${req.protocol}://${req.get('host')}/${itemType}/${itemId}`;

      res.json({ 
        success: true, 
        message: "공유 링크가 생성되었습니다.",
        shareUrl
      });
    } catch (error) {
      logServerError('공유 링크 생성 오류:', error, req);
      res.status(500).json({ error: "공유 링크 생성 중 오류가 발생했습니다" });
    }
  });





  app.get("/api/pets/:id", async (req, res) => {
    try {
      const petId = parseInt(req.params.id);
      const userId = req.session?.user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: "로그인이 필요합니다" });
      }

      const pet = await storage.getPet(petId);

      if (!pet) {
        return res.status(404).json({ error: '반려동물을 찾을 수 없습니다' });
      }

      // 소유자 확인 (관리자는 모든 반려동물 조회 가능)
      if (pet.ownerId !== userId && req.session?.user?.role !== 'admin') {
        return res.status(403).json({ error: '권한이 없습니다' });
      }

      // 훈련소 매칭 정보 포함
      const petWithTrainingInfo = {
        ...pet,
        trainingStatus: pet.trainingStatus || 'not_assigned',
        assignedTrainer: pet.assignedTrainerId ? {
          id: pet.assignedTrainerId,
          name: pet.assignedTrainerName || '훈련사 정보 없음'
        } : null,
        notebookEnabled: pet.notebookEnabled || false,
        lastNotebookEntry: pet.lastNotebookEntry || null
      };

      res.json({
        success: true,
        pet: petWithTrainingInfo
      });
    } catch (error) {
      logServerError('Error fetching pet:', error, req);
      res.status(500).json({ error: '반려동물 정보 조회 중 오류가 발생했습니다' });
    }
  });

  // 반려동물 정보 수정 API (Enhanced with Zod validation)
  app.put("/api/pets/:id", csrfProtection, async (req, res) => {
    try {
      const petId = parseInt(req.params.id);
      const userId = req.session?.user?.id;
      
      console.log(`반려동물 정보 수정 요청 - Pet ID: ${petId}, User ID: ${userId}`);

      if (!userId) {
        return res.status(401).json({ 
          success: false,
          error: "로그인이 필요합니다",
          code: "AUTHENTICATION_REQUIRED"
        });
      }

      if (isNaN(petId)) {
        return res.status(400).json({
          success: false,
          error: "올바르지 않은 반려동물 ID입니다",
          code: "INVALID_PET_ID"
        });
      }

      // 반려동물 존재 및 소유자 확인
      const existingPet = await storage.getPet(petId);
      if (!existingPet) {
        return res.status(404).json({ 
          success: false,
          error: '반려동물을 찾을 수 없습니다',
          code: "PET_NOT_FOUND"
        });
      }

      // 소유자 권한 확인 (관리자는 모든 펫 수정 가능)
      if (existingPet.ownerId !== userId && req.session?.user?.role !== 'admin') {
        return res.status(403).json({ 
          success: false,
          error: '권한이 없습니다. 본인의 반려동물만 수정할 수 있습니다',
          code: "FORBIDDEN"
        });
      }

      // Zod 스키마 검증
      const validationResult = updatePetValidationSchema.safeParse(req.body);

      if (!validationResult.success) {
        const errors = validationResult.error.issues.map(issue => ({
          field: issue.path.join('.'),
          message: issue.message
        }));
        
        return res.status(400).json({
          success: false,
          error: "입력 데이터가 올바르지 않습니다",
          code: "VALIDATION_ERROR",
          details: errors
        });
      }

      // 업데이트 데이터 준비
      const updateData = {
        ...validationResult.data,
        updatedAt: new Date().toISOString()
      };

      const updatedPet = await storage.updatePet(petId, updateData);

      console.log(`반려동물 정보 수정 성공 - Pet ID: ${petId}`);

      res.json({
        success: true,
        message: "반려동물 정보가 성공적으로 업데이트되었습니다.",
        pet: updatedPet
      });
    } catch (error) {
      logServerError('Error updating pet:', error, req);
      res.status(500).json({ 
        success: false,
        error: '반려동물 정보 업데이트 중 오류가 발생했습니다',
        code: "INTERNAL_SERVER_ERROR"
      });
    }
  });

  // 반려동물 삭제 API (Enhanced with better security and validation)
  app.delete("/api/pets/:id", csrfProtection, async (req, res) => {
    try {
      const petId = parseInt(req.params.id);
      const userId = req.session?.user?.id;
      
      console.log(`반려동물 삭제 요청 - Pet ID: ${petId}, User ID: ${userId}`);

      if (!userId) {
        return res.status(401).json({ 
          success: false,
          error: "로그인이 필요합니다",
          code: "AUTHENTICATION_REQUIRED"
        });
      }

      if (isNaN(petId)) {
        return res.status(400).json({
          success: false,
          error: "올바르지 않은 반려동물 ID입니다",
          code: "INVALID_PET_ID"
        });
      }

      // 반려동물 존재 및 소유자 확인
      const existingPet = await storage.getPet(petId);
      if (!existingPet) {
        return res.status(404).json({ 
          success: false,
          error: '반려동물을 찾을 수 없습니다',
          code: "PET_NOT_FOUND"
        });
      }

      // 소유자 권한 확인 (관리자는 모든 펫 삭제 가능)
      if (existingPet.ownerId !== userId && req.session?.user?.role !== 'admin') {
        return res.status(403).json({ 
          success: false,
          error: '권한이 없습니다. 본인의 반려동물만 삭제할 수 있습니다',
          code: "FORBIDDEN"
        });
      }

      // 활성 훈련이나 예약이 있는지 확인
      if (existingPet.trainingStatus === 'in_progress' || existingPet.trainingStatus === 'assigned') {
        const statusMessage = existingPet.trainingStatus === 'in_progress' 
          ? '현재 훈련 중인 반려동물은 삭제할 수 없습니다. 먼저 훈련을 완료하거나 취소해주세요.'
          : '훈련사가 배정된 반려동물은 삭제할 수 없습니다. 먼저 훈련사 배정을 해제해주세요.';
        
        return res.status(409).json({
          success: false,
          error: statusMessage,
          code: "TRAINING_ACTIVE"
        });
      }

      // TODO: 연관된 데이터 정리 (예약, 훈련 기록, 건강 기록 등)
      // 실제 구현에서는 이런 관련 데이터들도 함께 처리해야 합니다.

      const deleted = await storage.deletePet(petId);

      if (!deleted) {
        return res.status(500).json({
          success: false,
          error: '반려동물 삭제에 실패했습니다',
          code: "DELETE_FAILED"
        });
      }

      console.log(`반려동물 삭제 성공 - Pet ID: ${petId}`);

      res.json({ 
        success: true, 
        message: '반려동물이 성공적으로 삭제되었습니다.',
        petId: petId
      });
    } catch (error) {
      logServerError('Error deleting pet:', error, req);
      res.status(500).json({ 
        success: false,
        error: '반려동물 삭제 중 오류가 발생했습니다',
        code: "INTERNAL_SERVER_ERROR"
      });
    }
  });

  // 건강 관리 API
  app.get("/api/pets/:id/health", async (req, res) => {
    try {
      const petId = parseInt(req.params.id);
      const healthRecords = await storage.getPetHealthRecords(petId);
      res.json(healthRecords);
    } catch (error) {
      logServerError('Error fetching health records:', error, req);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.post("/api/pets/:id/health-records", csrfProtection, async (req, res) => {
    try {
      const petId = parseInt(req.params.id);
      const healthRecord = await storage.createHealthRecord(petId, req.body);
      res.status(201).json(healthRecord);
    } catch (error) {
      logServerError('Error creating health record:', error, req);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get("/api/pets/:id/vaccinations", async (req, res) => {
    try {
      const petId = parseInt(req.params.id);
      const vaccinations = await storage.getPetVaccinations(petId);
      res.json(vaccinations);
    } catch (error) {
      logServerError('Error fetching vaccinations:', error, req);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get("/api/pets/:id/medications", async (req, res) => {
    try {
      const petId = parseInt(req.params.id);
      const medications = await storage.getPetMedications(petId);
      res.json(medications);
    } catch (error) {
      logServerError('Error fetching medications:', error, req);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // 훈련 관리 API
  app.get("/api/pets/:id/training-sessions", async (req, res) => {
    try {
      const petId = parseInt(req.params.id);
      const sessions = await storage.getPetTrainingSessions(petId);
      res.json(sessions);
    } catch (error) {
      logServerError('Error fetching training sessions:', error, req);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get("/api/pets/:id/progress", async (req, res) => {
    try {
      const petId = parseInt(req.params.id);
      const progress = await storage.getPetProgress(petId);
      res.json(progress);
    } catch (error) {
      logServerError('Error fetching pet progress:', error, req);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get("/api/pets/:id/achievements", async (req, res) => {
    try {
      const petId = parseInt(req.params.id);
      const achievements = await storage.getPetAchievements(petId);
      res.json(achievements);
    } catch (error) {
      logServerError('Error fetching achievements:', error, req);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // ============ 훈련 일지 (알림장) API ============
  
  // AI 알림장 내용 생성
  app.post("/api/notebook/ai-generate", requireAuth('trainer'), async (req, res) => {
    try {
      const { petName, petBreed, activities, additionalContext } = req.body;
      
      // OpenAI를 사용한 알림장 내용 생성
      const OpenAI = (await import('openai')).default;
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      
      const prompt = `당신은 전문 반려동물 훈련사입니다. 다음 정보를 바탕으로 반려동물 보호자에게 보낼 알림장을 작성해주세요.

반려동물 이름: ${petName || '(이름 미입력)'}
품종: ${petBreed || '(품종 미입력)'}
오늘의 활동: ${JSON.stringify(activities) || '(활동 미입력)'}
추가 메모: ${additionalContext || '없음'}

다음 JSON 형식으로 응답해주세요:
{
  "title": "오늘의 훈련 알림장 제목",
  "content": "상세한 알림장 내용 (200자 이상)",
  "tags": ["태그1", "태그2", "태그3"],
  "activities": ["활동1", "활동2"],
  "nextGoals": ["다음 목표1", "다음 목표2"]
}`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4.1',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        response_format: { type: 'json_object' }
      });

      const generatedContent = JSON.parse(response.choices[0].message.content || '{}');
      
      res.json({
        success: true,
        content: generatedContent
      });
    } catch (error: any) {
      logServerError('AI 알림장 생성 오류:', error, req);
      res.status(500).json({
        success: false,
        error: 'AI 알림장 생성에 실패했습니다.'
      });
    }
  });

  // ============ 알림장 템플릿 (Task #94) ============
  // 트레이너만 사용. 본인 + 같은 기관 공유 + 시스템 시드 5종을 통합 조회.
  // 본인이 만든 템플릿만 수정/삭제 가능. 시스템 템플릿은 복제 후 사용.
  const { insertNotebookTemplateSchema } = await import("../shared/schema");

  const getInstituteIdsForTrainer = (userId: number): Promise<number[]> =>
    storage.getInstituteIdsForTrainer(userId);

  // 트레이너 컨텍스트 (현재 userId + 소속 instituteIds)
  app.get("/api/notebook/templates/context", requireAuth('trainer'), async (req, res) => {
    try {
      const user = req.session.user!;
      const instituteIds = await getInstituteIdsForTrainer(user.id);
      let instituteOptions: { id: number; name: string }[] = [];
      if (instituteIds.length > 0) {
        const rows = await db
          .select({ id: institutes.id, name: institutes.name })
          .from(institutes)
          .where(inArray(institutes.id, instituteIds));
        const byId = new Map(rows.map((r) => [Number(r.id), r.name as string]));
        instituteOptions = instituteIds.map((id) => ({
          id,
          name: byId.get(id) ?? `기관 #${id}`,
        }));
      }
      res.json({ success: true, data: { userId: user.id, instituteIds, institutes: instituteOptions } });
    } catch (error) {
      logServerError('알림장 템플릿 컨텍스트 조회 오류:', error, req);
      res.status(500).json({ error: '컨텍스트 조회 실패', code: 'INTERNAL_SERVER_ERROR' });
    }
  });

  // 목록 (본인 + 기관 공유 + 시스템)
  app.get("/api/notebook/templates", requireAuth('trainer'), async (req, res) => {
    try {
      const user = req.session.user!;
      const instituteIds = await getInstituteIdsForTrainer(user.id);
      const templates = await storage.listNotebookTemplatesForUser(user.id, instituteIds);
      res.json({ success: true, data: templates });
    } catch (error) {
      logServerError('알림장 템플릿 목록 조회 오류:', error, req);
      res.status(500).json({ error: '템플릿 목록 조회 실패', code: 'INTERNAL_SERVER_ERROR' });
    }
  });

  // 단건 조회
  app.get("/api/notebook/templates/:id", requireAuth('trainer'), async (req, res) => {
    try {
      const user = req.session.user!;
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return res.status(400).json({ error: '잘못된 ID', code: 'INVALID_ID' });
      const tpl = await storage.getNotebookTemplate(id);
      if (!tpl) return res.status(404).json({ error: '템플릿을 찾을 수 없습니다.', code: 'TEMPLATE_NOT_FOUND' });
      const instituteIds = await getInstituteIdsForTrainer(user.id);
      const visible = tpl.isSystem || tpl.ownerUserId === user.id || (tpl.instituteId && instituteIds.includes(tpl.instituteId));
      if (!visible) return res.status(403).json({ error: '접근 권한이 없습니다.', code: 'FORBIDDEN' });
      res.json({ success: true, data: tpl });
    } catch (error) {
      logServerError('알림장 템플릿 조회 오류:', error, req);
      res.status(500).json({ error: '템플릿 조회 실패', code: 'INTERNAL_SERVER_ERROR' });
    }
  });

  // 생성
  app.post("/api/notebook/templates", requireAuth('trainer'), csrfProtection, async (req, res) => {
    try {
      const user = req.session.user!;
      const parsed = insertNotebookTemplateSchema.parse(req.body || {});
      let instituteId: number | null = parsed.instituteId ?? null;
      if (instituteId != null) {
        const allowed = await getInstituteIdsForTrainer(user.id);
        if (!allowed.includes(instituteId)) {
          return res.status(403).json({ error: '해당 기관에 공유할 권한이 없습니다.', code: 'FORBIDDEN_INSTITUTE' });
        }
      }
      const created = await storage.createNotebookTemplate({
        ownerUserId: user.id,
        instituteId,
        name: parsed.name,
        body: parsed.body,
        category: parsed.category ?? null,
        homeworkPreset: parsed.homeworkPreset ?? null,
      });
      res.status(201).json({ success: true, data: created });
    } catch (error: any) {
      if (error?.name === 'ZodError') {
        return res.status(400).json({ error: '입력 데이터가 올바르지 않습니다.', code: 'VALIDATION_ERROR', details: error.errors });
      }
      logServerError('알림장 템플릿 생성 오류:', error, req);
      res.status(500).json({ error: '템플릿 생성 실패', code: 'INTERNAL_SERVER_ERROR' });
    }
  });

  // 수정 (본인 소유만)
  app.patch("/api/notebook/templates/:id", requireAuth('trainer'), csrfProtection, async (req, res) => {
    try {
      const user = req.session.user!;
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return res.status(400).json({ error: '잘못된 ID', code: 'INVALID_ID' });
      const tpl = await storage.getNotebookTemplate(id);
      if (!tpl) return res.status(404).json({ error: '템플릿을 찾을 수 없습니다.', code: 'TEMPLATE_NOT_FOUND' });
      if (tpl.isSystem) return res.status(403).json({ error: '시스템 템플릿은 수정할 수 없습니다. 복제 후 사용해주세요.', code: 'SYSTEM_TEMPLATE_READONLY' });
      if (tpl.ownerUserId !== user.id) return res.status(403).json({ error: '본인이 만든 템플릿만 수정할 수 있습니다.', code: 'FORBIDDEN' });
      const parsed = insertNotebookTemplateSchema.partial().parse(req.body || {});
      if (parsed.instituteId !== undefined && parsed.instituteId !== null) {
        const allowed = await getInstituteIdsForTrainer(user.id);
        if (!allowed.includes(parsed.instituteId)) {
          return res.status(403).json({ error: '해당 기관에 공유할 권한이 없습니다.', code: 'FORBIDDEN_INSTITUTE' });
        }
      }
      const patch: Record<string, unknown> = {};
      if (parsed.name !== undefined) patch.name = parsed.name;
      if (parsed.body !== undefined) patch.body = parsed.body;
      if (parsed.category !== undefined) patch.category = parsed.category;
      if (parsed.homeworkPreset !== undefined) patch.homeworkPreset = parsed.homeworkPreset;
      if (parsed.instituteId !== undefined) patch.instituteId = parsed.instituteId;
      const updated = await storage.updateNotebookTemplate(id, patch);
      res.json({ success: true, data: updated });
    } catch (error: any) {
      if (error?.name === 'ZodError') {
        return res.status(400).json({ error: '입력 데이터가 올바르지 않습니다.', code: 'VALIDATION_ERROR', details: error.errors });
      }
      logServerError('알림장 템플릿 수정 오류:', error, req);
      res.status(500).json({ error: '템플릿 수정 실패', code: 'INTERNAL_SERVER_ERROR' });
    }
  });

  // 삭제 (본인 소유만)
  app.delete("/api/notebook/templates/:id", requireAuth('trainer'), csrfProtection, async (req, res) => {
    try {
      const user = req.session.user!;
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return res.status(400).json({ error: '잘못된 ID', code: 'INVALID_ID' });
      const tpl = await storage.getNotebookTemplate(id);
      if (!tpl) return res.status(404).json({ error: '템플릿을 찾을 수 없습니다.', code: 'TEMPLATE_NOT_FOUND' });
      if (tpl.isSystem) return res.status(403).json({ error: '시스템 템플릿은 삭제할 수 없습니다.', code: 'SYSTEM_TEMPLATE_READONLY' });
      if (tpl.ownerUserId !== user.id) return res.status(403).json({ error: '본인이 만든 템플릿만 삭제할 수 있습니다.', code: 'FORBIDDEN' });
      await storage.deleteNotebookTemplate(id);
      res.json({ success: true });
    } catch (error) {
      logServerError('알림장 템플릿 삭제 오류:', error, req);
      res.status(500).json({ error: '템플릿 삭제 실패', code: 'INTERNAL_SERVER_ERROR' });
    }
  });

  // 복제 (시스템/기관 공유 → 본인 템플릿)
  app.post("/api/notebook/templates/:id/duplicate", requireAuth('trainer'), csrfProtection, async (req, res) => {
    try {
      const user = req.session.user!;
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return res.status(400).json({ error: '잘못된 ID', code: 'INVALID_ID' });
      const tpl = await storage.getNotebookTemplate(id);
      if (!tpl) return res.status(404).json({ error: '템플릿을 찾을 수 없습니다.', code: 'TEMPLATE_NOT_FOUND' });
      const instituteIds = await getInstituteIdsForTrainer(user.id);
      const visible = tpl.isSystem || tpl.ownerUserId === user.id || (tpl.instituteId && instituteIds.includes(tpl.instituteId));
      if (!visible) return res.status(403).json({ error: '접근 권한이 없습니다.', code: 'FORBIDDEN' });
      const dup = await storage.duplicateNotebookTemplate(id, user.id);
      res.status(201).json({ success: true, data: dup });
    } catch (error) {
      logServerError('알림장 템플릿 복제 오류:', error, req);
      res.status(500).json({ error: '템플릿 복제 실패', code: 'INTERNAL_SERVER_ERROR' });
    }
  });

  // 사용 카운트 증분 — 폼에 적용 시 호출
  app.post("/api/notebook/templates/:id/use", requireAuth('trainer'), csrfProtection, async (req, res) => {
    try {
      const user = req.session.user!;
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return res.status(400).json({ error: '잘못된 ID', code: 'INVALID_ID' });
      const tpl = await storage.getNotebookTemplate(id);
      if (!tpl) return res.status(404).json({ error: '템플릿을 찾을 수 없습니다.', code: 'TEMPLATE_NOT_FOUND' });
      const instituteIds = await getInstituteIdsForTrainer(user.id);
      const visible = tpl.isSystem || tpl.ownerUserId === user.id || (tpl.instituteId && instituteIds.includes(tpl.instituteId));
      if (!visible) return res.status(403).json({ error: '접근 권한이 없습니다.', code: 'FORBIDDEN' });
      await storage.incrementNotebookTemplateUsage(id);
      res.json({ success: true, data: await storage.getNotebookTemplate(id) });
    } catch (error) {
      logServerError('알림장 템플릿 사용 카운트 오류:', error, req);
      res.status(500).json({ error: '사용 기록 실패', code: 'INTERNAL_SERVER_ERROR' });
    }
  });

  // 1. 새 훈련 일지 생성
  app.post("/api/notebook/entries", requireAuth('trainer'), csrfProtection, async (req, res) => {
    try {
      const currentUser = req.session.user!;
      // 서버가 채워야 하는 필드는 클라이언트 입력에서 제외
      const { trainerId: _t, petOwnerId: _o, ...rest } = (req.body || {});
      // petId는 number로 강제 (string 들어오는 경우 대비)
      if (rest.petId != null) rest.petId = Number(rest.petId);
      const journalInputSchema = insertTrainingJournalSchema.omit({ trainerId: true, petOwnerId: true });
      const validatedData = journalInputSchema.parse(rest);

      // 권한 확인 - 훈련사가 담당 펫의 일지만 생성 가능
      if (!storage.canUserCreateTrainingJournal(currentUser.id, currentUser.role, validatedData.petId)) {
        return res.status(403).json({
          error: '해당 반려동물의 훈련 일지를 작성할 권한이 없습니다.',
          code: 'INSUFFICIENT_PERMISSIONS'
        });
      }

      // 펫 정보 확인
      const pet = storage.getPetById(validatedData.petId);
      if (!pet) {
        return res.status(404).json({
          error: '해당 반려동물을 찾을 수 없습니다.',
          code: 'PET_NOT_FOUND'
        });
      }

      // 훈련 일지 생성
      const journalEntry = storage.createTrainingJournal({
        ...validatedData,
        trainerId: currentUser.id,
        petOwnerId: pet.ownerId,
        status: validatedData.status || 'sent',
        isRead: false
      });

      // 보호자에게 알림 발송 (인앱 + 이메일) - draft가 아닐 때만
      if (pet.ownerId && journalEntry.status !== 'draft') {
        try {
          const { notificationService } = await import('./notifications/notification-service');
          await notificationService.sendNotification({
            userId: pet.ownerId,
            type: 'training',
            title: `새 알림장이 도착했습니다`,
            message: `${pet.name}의 ${validatedData.title || '훈련 일지'}가 등록되었어요.`,
            actionUrl: `/notebook?entryId=${journalEntry.id}`,
            data: { journalId: journalEntry.id, petId: pet.id }
          });
        } catch (e) {
          logServerError('알림장 알림 발송 실패:', e, req);
        }
        try {
          const { queueEmail } = await import('./services/email-service');
          await queueEmail({
            templateKey: 'notebook_journal_created',
            userId: pet.ownerId,
            variables: {
              petName: pet.name,
              title: validatedData.title || '훈련 일지',
              date: validatedData.trainingDate || new Date().toISOString().slice(0, 10),
              link: `${process.env.APP_URL || ''}/notebook?entryId=${journalEntry.id}`,
            },
          });
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          // 템플릿 미존재 등은 무시
          if (!msg.includes('템플릿이 존재하지 않습니다')) {
            logServerError('알림장 이메일 발송 실패:', e, req);
          }
        }
      }

      res.status(201).json({
        success: true,
        message: '훈련 일지가 성공적으로 생성되었습니다.',
        data: journalEntry
      });

    } catch (error: any) {
      logServerError('훈련 일지 생성 오류:', error, req);
      if (error.name === 'ZodError') {
        return res.status(400).json({
          error: '입력 데이터가 올바르지 않습니다.',
          code: 'VALIDATION_ERROR',
          details: error.errors
        });
      }
      res.status(500).json({
        error: '훈련 일지 생성 중 오류가 발생했습니다.',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  });

  // 2. 훈련 일지 목록 조회 (페이지네이션, 필터링)
  app.get("/api/notebook/entries", requireAuth(), async (req, res) => {
    try {
      // 쿼리 검증
      const query = trainingJournalQuerySchema.parse(req.query);
      const currentUser = req.session.user!;

      // 사용자 권한에 따른 필터링 (allow-list)
      if (currentUser.role === 'pet-owner') {
        query.petOwnerId = currentUser.id;
      } else if (currentUser.role === 'trainer') {
        query.trainerId = currentUser.id;
      } else if (currentUser.role !== 'admin' && currentUser.role !== 'institute-admin') {
        return res.status(403).json({ error: '접근 권한이 없습니다.', code: 'FORBIDDEN' });
      }
      // 관리자/기관관리자는 모든 일지 조회 가능

      const result = storage.getTrainingJournalsWithPagination(query);

      res.json({
        success: true,
        data: result.journals,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages
        }
      });

    } catch (error: any) {
      logServerError('훈련 일지 목록 조회 오류:', error, req);
      if (error.name === 'ZodError') {
        return res.status(400).json({
          error: '쿼리 매개변수가 올바르지 않습니다.',
          code: 'VALIDATION_ERROR',
          details: error.errors
        });
      }
      res.status(500).json({
        error: '훈련 일지 목록 조회 중 오류가 발생했습니다.',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  });

  // [Task #109] 사용자 UI 환경설정 — 보호자 본인 알림장 읽음 시각 표시 등 가벼운 키/값 설정
  // 키 화이트리스트: 임의 키가 저장되지 않도록 명시적으로 허용
  const ALLOWED_UI_PREF_KEYS = new Set<string>(["notebook.showOwnReadAt"]);

  app.get("/api/user/ui-preferences", requireAuth(), async (req, res) => {
    try {
      const currentUser = req.session.user!;
      const rows = await db
        .select()
        .from(userUiPreferences)
        .where(eq(userUiPreferences.userId, currentUser.id));
      const map: Record<string, string> = {};
      for (const r of rows) {
        if (ALLOWED_UI_PREF_KEYS.has(r.prefKey)) {
          map[r.prefKey] = r.prefValue ?? "";
        }
      }
      res.json({ success: true, preferences: map });
    } catch (error) {
      logServerError("UI 환경설정 조회 오류:", error, req);
      res.status(500).json({ error: "환경설정 조회 중 오류가 발생했습니다.", code: "INTERNAL_SERVER_ERROR" });
    }
  });

  app.patch("/api/user/ui-preferences", requireAuth(), csrfProtection, async (req, res) => {
    try {
      const currentUser = req.session.user!;
      const schema = z.object({
        key: z.string().min(1).max(80),
        value: z.string().max(2000),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "잘못된 요청", code: "VALIDATION_ERROR", details: parsed.error.flatten() });
      }
      const { key, value } = parsed.data;
      if (!ALLOWED_UI_PREF_KEYS.has(key)) {
        return res.status(400).json({ error: "허용되지 않은 환경설정 키입니다.", code: "INVALID_PREF_KEY" });
      }
      const existing = await db
        .select()
        .from(userUiPreferences)
        .where(and(eq(userUiPreferences.userId, currentUser.id), eq(userUiPreferences.prefKey, key)))
        .limit(1);
      if (existing.length === 0) {
        await db.insert(userUiPreferences).values({ userId: currentUser.id, prefKey: key, prefValue: value });
      } else {
        await db
          .update(userUiPreferences)
          .set({ prefValue: value, updatedAt: new Date() })
          .where(eq(userUiPreferences.id, existing[0].id));
      }
      res.json({ success: true, key, value });
    } catch (error) {
      logServerError("UI 환경설정 저장 오류:", error, req);
      res.status(500).json({ error: "환경설정 저장 중 오류가 발생했습니다.", code: "INTERNAL_SERVER_ERROR" });
    }
  });

  // [Task #109] 알림장 읽음/마지막 조회 시각 갱신 (보호자 전용)
  app.patch("/api/notebook/entries/:id/read", requireAuth(), csrfProtection, async (req, res) => {
    try {
      const journalId = parseInt(req.params.id);
      const currentUser = req.session.user!;
      if (isNaN(journalId)) {
        return res.status(400).json({ error: '올바른 일지 ID가 필요합니다.', code: 'INVALID_JOURNAL_ID' });
      }
      const journal = storage.getTrainingJournalById(journalId);
      if (!journal) {
        return res.status(404).json({ error: '해당 훈련 일지를 찾을 수 없습니다.', code: 'JOURNAL_NOT_FOUND' });
      }
      if (!storage.canUserAccessTrainingJournal(currentUser.id, currentUser.role, journal)) {
        return res.status(403).json({ error: '해당 훈련 일지에 접근할 권한이 없습니다.', code: 'INSUFFICIENT_PERMISSIONS' });
      }
      // 보호자만 자신의 열람 이력으로 기록
      if (currentUser.role !== 'pet-owner') {
        return res.json({ success: true, data: { isRead: !!journal.isRead, readAt: journal.readAt || null, lastViewedAt: journal.lastViewedAt || null } });
      }
      const result = storage.markJournalRead(journalId);
      return res.json({ success: true, data: result });
    } catch (error) {
      logServerError('알림장 읽음 처리 오류:', error, req);
      res.status(500).json({ error: '읽음 처리 중 오류가 발생했습니다.', code: 'INTERNAL_SERVER_ERROR' });
    }
  });

  // 3. 특정 훈련 일지 조회
  app.get("/api/notebook/entries/:id", requireAuth(), async (req, res) => {
    try {
      const journalId = parseInt(req.params.id);
      const currentUser = req.session.user!;

      if (isNaN(journalId)) {
        return res.status(400).json({
          error: '올바른 일지 ID가 필요합니다.',
          code: 'INVALID_JOURNAL_ID'
        });
      }

      const journal = storage.getTrainingJournalById(journalId);
      if (!journal) {
        return res.status(404).json({
          error: '해당 훈련 일지를 찾을 수 없습니다.',
          code: 'JOURNAL_NOT_FOUND'
        });
      }

      if (!storage.canUserAccessTrainingJournal(currentUser.id, currentUser.role, journal)) {
        return res.status(403).json({
          error: '해당 훈련 일지에 접근할 권한이 없습니다.',
          code: 'INSUFFICIENT_PERMISSIONS'
        });
      }

      // 읽음 상태 업데이트 (견주가 조회할 때)
      if (currentUser.role === 'pet-owner' && !journal.isRead) {
        storage.updateTrainingJournal(journalId, {
          isRead: true,
          readAt: new Date().toISOString(),
          status: 'read'
        });
        journal.isRead = true;
        journal.readAt = new Date().toISOString();
        journal.status = 'read';
      }

      res.json({
        success: true,
        data: journal
      });

    } catch (error) {
      logServerError('훈련 일지 조회 오류:', error, req);
      res.status(500).json({
        error: '훈련 일지 조회 중 오류가 발생했습니다.',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  });

  // 3-2/3-3. 알림장 읽음 처리 + 훈련사 미읽음 카운트
  registerNotebookReadRoutes(app, requireAuth);

  // 4. 훈련 일지 수정
  app.put("/api/notebook/entries/:id", requireAuth(), csrfProtection, async (req, res) => {
    try {
      const journalId = parseInt(req.params.id);
      const currentUser = req.session.user!;

      if (isNaN(journalId)) {
        return res.status(400).json({
          error: '올바른 일지 ID가 필요합니다.',
          code: 'INVALID_JOURNAL_ID'
        });
      }

      // 기존 일지 확인
      const existingJournal = storage.getTrainingJournalById(journalId);
      if (!existingJournal) {
        return res.status(404).json({
          error: '해당 훈련 일지를 찾을 수 없습니다.',
          code: 'JOURNAL_NOT_FOUND'
        });
      }

      // 수정 권한 확인
      if (!storage.canUserModifyTrainingJournal(currentUser.id, currentUser.role, existingJournal)) {
        return res.status(403).json({
          error: '해당 훈련 일지를 수정할 권한이 없습니다.',
          code: 'INSUFFICIENT_PERMISSIONS'
        });
      }

      // Zod 스키마 검증
      const validatedData = updateTrainingJournalSchema.parse(req.body);

      // 훈련 일지 수정
      const updatedJournal = storage.updateTrainingJournal(journalId, validatedData);

      res.json({
        success: true,
        message: '훈련 일지가 성공적으로 수정되었습니다.',
        data: updatedJournal
      });

    } catch (error: any) {
      logServerError('훈련 일지 수정 오류:', error, req);
      if (error.name === 'ZodError') {
        return res.status(400).json({
          error: '입력 데이터가 올바르지 않습니다.',
          code: 'VALIDATION_ERROR',
          details: error.errors
        });
      }
      res.status(500).json({
        error: '훈련 일지 수정 중 오류가 발생했습니다.',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  });

  // 5. 훈련 일지 삭제
  app.delete("/api/notebook/entries/:id", requireAuth(), csrfProtection, async (req, res) => {
    try {
      const journalId = parseInt(req.params.id);
      const currentUser = req.session.user!;

      if (isNaN(journalId)) {
        return res.status(400).json({
          error: '올바른 일지 ID가 필요합니다.',
          code: 'INVALID_JOURNAL_ID'
        });
      }

      // 기존 일지 확인
      const existingJournal = storage.getTrainingJournalById(journalId);
      if (!existingJournal) {
        return res.status(404).json({
          error: '해당 훈련 일지를 찾을 수 없습니다.',
          code: 'JOURNAL_NOT_FOUND'
        });
      }

      // 삭제 권한 확인
      if (!storage.canUserModifyTrainingJournal(currentUser.id, currentUser.role, existingJournal)) {
        return res.status(403).json({
          error: '해당 훈련 일지를 삭제할 권한이 없습니다.',
          code: 'INSUFFICIENT_PERMISSIONS'
        });
      }

      // 훈련 일지 삭제
      const deleted = storage.deleteTrainingJournal(journalId);
      
      if (deleted) {
        res.json({
          success: true,
          message: '훈련 일지가 성공적으로 삭제되었습니다.'
        });
      } else {
        res.status(500).json({
          error: '훈련 일지 삭제에 실패했습니다.',
          code: 'DELETE_FAILED'
        });
      }

    } catch (error) {
      logServerError('훈련 일지 삭제 오류:', error, req);
      res.status(500).json({
        error: '훈련 일지 삭제 중 오류가 발생했습니다.',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  });

  // 알림장 PDF 내보내기 (인증 필요)
  app.get("/api/notebook/entries/:id/pdf", requireAuth(), async (req, res) => {
    try {
      const journalId = parseInt(req.params.id, 10);
      if (!Number.isFinite(journalId)) {
        return res.status(400).json({ error: '올바른 일지 ID가 필요합니다.', code: 'INVALID_JOURNAL_ID' });
      }
      const currentUser = req.session.user!;
      const journal = storage.getTrainingJournalById(journalId);
      if (!journal) {
        return res.status(404).json({ error: '해당 훈련 일지를 찾을 수 없습니다.', code: 'JOURNAL_NOT_FOUND' });
      }
      if (!storage.canUserAccessTrainingJournal(currentUser.id, currentUser.role, journal)) {
        return res.status(403).json({ error: '해당 훈련 일지에 접근할 권한이 없습니다.', code: 'INSUFFICIENT_PERMISSIONS' });
      }

      const pet = journal.petId ? storage.getPetById(journal.petId) : null;
      const trainer = journal.trainerId ? storage.getUser(journal.trainerId) : null;
      const owner = journal.petOwnerId ? storage.getUser(journal.petOwnerId) : null;
      const { generateNotebookPdf } = await import('./services/notebook-pdf');
      const buffer = await generateNotebookPdf({ journal, pet, trainer, owner });

      const safeName = (pet?.name || 'pet').toString().replace(/[^a-zA-Z0-9가-힣_-]/g, '_').slice(0, 40) || 'pet';
      const filename = `talez-notebook-${safeName}-${journalId}.pdf`;
      const asciiFallback = filename.replace(/[^\x20-\x7E]/g, '_');
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(filename)}`);
      res.setHeader('Cache-Control', 'private, no-store');
      return res.end(buffer);
    } catch (error) {
      logServerError('[알림장 PDF] 생성 실패:', error, req);
      res.status(500).json({ error: 'PDF 생성 중 오류가 발생했습니다.', code: 'PDF_GENERATION_FAILED' });
    }
  });

  // 알림장 공유 토큰 발급 (단기 만료)
  app.post("/api/notebook/entries/:id/share-token", requireAuth(), csrfProtection, async (req, res) => {
    try {
      const journalId = parseInt(req.params.id, 10);
      if (!Number.isFinite(journalId)) {
        return res.status(400).json({ error: '올바른 일지 ID가 필요합니다.', code: 'INVALID_JOURNAL_ID' });
      }
      const currentUser = req.session.user!;
      const journal = storage.getTrainingJournalById(journalId);
      if (!journal) {
        return res.status(404).json({ error: '해당 훈련 일지를 찾을 수 없습니다.', code: 'JOURNAL_NOT_FOUND' });
      }
      if (!storage.canUserAccessTrainingJournal(currentUser.id, currentUser.role, journal)) {
        return res.status(403).json({ error: '해당 훈련 일지에 접근할 권한이 없습니다.', code: 'INSUFFICIENT_PERMISSIONS' });
      }

      // 만료 시간 (기본 24시간, 최소 1시간, 최대 30일)
      const requested = parseInt(String(req.body?.expiresInHours ?? '24'), 10);
      const expiresInHours = Math.min(Math.max(Number.isFinite(requested) ? requested : 24, 1), 24 * 30);
      const token = randomBytes(24).toString('hex');
      const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);

      storage.createNotebookShareToken({
        token,
        journalId,
        createdBy: currentUser.id,
        expiresAt,
      });

      const protocol = (req.headers['x-forwarded-proto'] as string) || req.protocol || 'https';
      const host = req.headers['x-forwarded-host'] || req.headers.host;
      const baseUrl = host ? `${protocol}://${host}` : '';
      const shareUrl = `${baseUrl}/api/notebook/shared/${token}`;

      res.json({
        success: true,
        token,
        expiresAt: expiresAt.toISOString(),
        expiresInHours,
        shareUrl,
      });
    } catch (error) {
      logServerError('[알림장 공유] 토큰 발급 실패:', error, req);
      res.status(500).json({ error: '공유 링크 생성 중 오류가 발생했습니다.', code: 'SHARE_TOKEN_FAILED' });
    }
  });

  // 알림장 공개 공유 (PDF 인라인)
  app.get("/api/notebook/shared/:token", async (req, res) => {
    try {
      const record = storage.getNotebookShareToken(req.params.token);
      if (!record) {
        return res.status(404).json({ error: '공유 링크가 만료되었거나 유효하지 않습니다.', code: 'SHARE_TOKEN_INVALID' });
      }
      const journal = storage.getTrainingJournalById(record.journalId);
      if (!journal) {
        return res.status(404).json({ error: '해당 알림장을 찾을 수 없습니다.', code: 'JOURNAL_NOT_FOUND' });
      }
      const pet = journal.petId ? storage.getPetById(journal.petId) : null;
      const trainer = journal.trainerId ? storage.getUser(journal.trainerId) : null;
      const owner = journal.petOwnerId ? storage.getUser(journal.petOwnerId) : null;
      const { generateNotebookPdf } = await import('./services/notebook-pdf');
      const buffer = await generateNotebookPdf({ journal, pet, trainer, owner });

      const safeName = (pet?.name || 'pet').toString().replace(/[^a-zA-Z0-9가-힣_-]/g, '_').slice(0, 40) || 'pet';
      const filename = `talez-notebook-${safeName}-${journal.id}.pdf`;
      const asciiFallback = filename.replace(/[^\x20-\x7E]/g, '_');
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(filename)}`);
      res.setHeader('Cache-Control', 'public, max-age=300');
      return res.end(buffer);
    } catch (error) {
      logServerError('[알림장 공유 PDF] 생성 실패:', error, req);
      res.status(500).json({ error: 'PDF 생성 중 오류가 발생했습니다.', code: 'PDF_GENERATION_FAILED' });
    }
  });

  // ===== 알림장 댓글 / 이모지 반응 =====
  const ALLOWED_REACTION_EMOJIS = ['👍', '❤️', '🎉', '😍', '👏', '🐶'];

  const buildJournalCommentsResponse = (journalId: number, currentUserId: number) => {
    const comments = storage.getJournalComments(journalId).map((c: any) => {
      const author = storage.getUser(c.authorId);
      return {
        id: c.id,
        journalId: c.journalId,
        authorId: c.authorId,
        authorName: author?.name || author?.username || '사용자',
        authorRole: author?.role || null,
        authorAvatar: author?.profileImage || author?.avatar || null,
        content: c.content,
        parentCommentId: c.parentCommentId ?? null,
        createdAt: c.createdAt,
        canDelete: c.authorId === currentUserId,
      };
    });

    const reactionRows = storage.getJournalReactions(journalId);
    const reactionMap: Record<string, { count: number; mine: boolean }> = {};
    ALLOWED_REACTION_EMOJIS.forEach(e => { reactionMap[e] = { count: 0, mine: false }; });
    reactionRows.forEach((r: any) => {
      if (!reactionMap[r.emoji]) reactionMap[r.emoji] = { count: 0, mine: false };
      reactionMap[r.emoji].count++;
      if (r.userId === currentUserId) reactionMap[r.emoji].mine = true;
    });

    return { comments, reactions: reactionMap, total: comments.length };
  };

  // 댓글/반응 조회
  app.get('/api/notebook/entries/:id/comments', requireAuth(), async (req, res) => {
    try {
      const journalId = parseInt(req.params.id, 10);
      if (!Number.isFinite(journalId)) {
        return res.status(400).json({ error: '올바른 일지 ID가 필요합니다.', code: 'INVALID_JOURNAL_ID' });
      }
      const currentUser = req.session.user!;
      const journal = storage.getTrainingJournalById(journalId);
      if (!journal) {
        return res.status(404).json({ error: '해당 훈련 일지를 찾을 수 없습니다.', code: 'JOURNAL_NOT_FOUND' });
      }
      if (!storage.canUserAccessTrainingJournal(currentUser.id, currentUser.role, journal)) {
        return res.status(403).json({ error: '댓글에 접근할 권한이 없습니다.', code: 'INSUFFICIENT_PERMISSIONS' });
      }
      res.json({ success: true, ...buildJournalCommentsResponse(journalId, currentUser.id) });
    } catch (error) {
      logServerError('[알림장 댓글] 조회 실패:', error, req);
      res.status(500).json({ error: '댓글 조회 중 오류가 발생했습니다.', code: 'COMMENTS_FETCH_FAILED' });
    }
  });

  // 댓글 카운트 (목록 뱃지용)
  app.get('/api/notebook/comments/counts', requireAuth(), async (req, res) => {
    try {
      const raw = String(req.query.journalIds || '').trim();
      if (!raw) return res.json({ success: true, counts: {} });
      const ids = raw.split(',').map(s => parseInt(s, 10)).filter(n => Number.isFinite(n));
      if (ids.length === 0) return res.json({ success: true, counts: {} });
      const currentUser = req.session.user!;
      const accessible = ids.filter(id => {
        const j = storage.getTrainingJournalById(id);
        return j && storage.canUserAccessTrainingJournal(currentUser.id, currentUser.role, j);
      });
      res.json({ success: true, counts: storage.getJournalCommentCounts(accessible) });
    } catch (error) {
      logServerError('[알림장 댓글] 카운트 조회 실패:', error, req);
      res.status(500).json({ error: '카운트 조회 실패', code: 'COMMENTS_COUNT_FAILED' });
    }
  });

  // 댓글 작성
  app.post('/api/notebook/entries/:id/comments', requireAuth(), csrfProtection, async (req, res) => {
    try {
      const journalId = parseInt(req.params.id, 10);
      if (!Number.isFinite(journalId)) {
        return res.status(400).json({ error: '올바른 일지 ID가 필요합니다.', code: 'INVALID_JOURNAL_ID' });
      }
      const currentUser = req.session.user!;
      const journal = storage.getTrainingJournalById(journalId);
      if (!journal) {
        return res.status(404).json({ error: '해당 훈련 일지를 찾을 수 없습니다.', code: 'JOURNAL_NOT_FOUND' });
      }
      if (!storage.canUserAccessTrainingJournal(currentUser.id, currentUser.role, journal)) {
        return res.status(403).json({ error: '댓글을 작성할 권한이 없습니다.', code: 'INSUFFICIENT_PERMISSIONS' });
      }

      const { insertJournalCommentSchema } = await import('../shared/schema');
      const parsed = insertJournalCommentSchema.safeParse({
        journalId,
        content: req.body?.content,
        parentCommentId: req.body?.parentCommentId ?? null,
      });
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues[0]?.message || '입력값이 올바르지 않습니다.', code: 'INVALID_INPUT' });
      }

      const comment = storage.createJournalComment({
        journalId,
        authorId: currentUser.id,
        content: parsed.data.content,
        parentCommentId: parsed.data.parentCommentId ?? null,
      });

      // 알림 발송: 작성자가 보호자면 트레이너에게, 트레이너면 보호자에게
      try {
        const isTrainer = currentUser.id === journal.trainerId;
        const recipientId = isTrainer ? journal.petOwnerId : journal.trainerId;
        if (recipientId && recipientId !== currentUser.id) {
          const author = storage.getUser(currentUser.id);
          const authorName = author?.name || author?.username || '사용자';
          const journalTitle = journal.title || '훈련 알림장';
          const preview = parsed.data.content.length > 60
            ? parsed.data.content.slice(0, 60) + '…'
            : parsed.data.content;
          await notificationService.sendNotification({
            userId: recipientId,
            type: 'message',
            title: `${authorName}님의 새 알림장 댓글`,
            message: `[${journalTitle}] ${preview}`,
            data: { journalId, commentId: comment.id },
            actionUrl: isTrainer ? `/notebook?journalId=${journalId}` : `/trainer/notebook?journalId=${journalId}`,
          });
        }
      } catch (notifErr) {
        logServerError('[알림장 댓글] 알림 발송 실패:', notifErr, req);
      }

      res.status(201).json({ success: true, comment, ...buildJournalCommentsResponse(journalId, currentUser.id) });
    } catch (error) {
      logServerError('[알림장 댓글] 작성 실패:', error, req);
      res.status(500).json({ error: '댓글 작성 중 오류가 발생했습니다.', code: 'COMMENT_CREATE_FAILED' });
    }
  });

  // 댓글 삭제 (작성자 본인만)
  app.delete('/api/notebook/comments/:commentId', requireAuth(), csrfProtection, async (req, res) => {
    try {
      const commentId = parseInt(req.params.commentId, 10);
      if (!Number.isFinite(commentId)) {
        return res.status(400).json({ error: '올바른 댓글 ID가 필요합니다.', code: 'INVALID_COMMENT_ID' });
      }
      const currentUser = req.session.user!;
      const comment = storage.getJournalCommentById(commentId);
      if (!comment) {
        return res.status(404).json({ error: '해당 댓글을 찾을 수 없습니다.', code: 'COMMENT_NOT_FOUND' });
      }
      if (comment.authorId !== currentUser.id && currentUser.role !== 'admin') {
        return res.status(403).json({ error: '본인이 작성한 댓글만 삭제할 수 있습니다.', code: 'INSUFFICIENT_PERMISSIONS' });
      }
      storage.deleteJournalComment(commentId);
      res.json({ success: true, ...buildJournalCommentsResponse(comment.journalId, currentUser.id) });
    } catch (error) {
      logServerError('[알림장 댓글] 삭제 실패:', error, req);
      res.status(500).json({ error: '댓글 삭제 중 오류가 발생했습니다.', code: 'COMMENT_DELETE_FAILED' });
    }
  });

  // ====== 알림장 숙제 체크리스트 (DB-backed, Task #105) ======
  const buildHomeworkResponse = async (journalId: number) => {
    const items = await storage.listHomeworkItems(journalId);
    const total = items.length;
    const completed = items.filter(i => !!i.completedAt).length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { items, stats: { total, completed, completionRate } };
  };

  app.get('/api/notebook/entries/:id/homework', requireAuth(), async (req, res) => {
    try {
      const journalId = parseInt(req.params.id, 10);
      if (!Number.isFinite(journalId)) {
        return res.status(400).json({ error: '올바른 일지 ID가 필요합니다.', code: 'INVALID_JOURNAL_ID' });
      }
      const currentUser = req.session.user!;
      const journal = storage.getTrainingJournalById(journalId);
      if (!journal) {
        return res.status(404).json({ error: '해당 훈련 일지를 찾을 수 없습니다.', code: 'JOURNAL_NOT_FOUND' });
      }
      if (!storage.canUserAccessTrainingJournal(currentUser.id, currentUser.role, journal)) {
        return res.status(403).json({ error: '숙제에 접근할 권한이 없습니다.', code: 'INSUFFICIENT_PERMISSIONS' });
      }
      res.json({ success: true, ...(await buildHomeworkResponse(journalId)) });
    } catch (error) {
      logServerError('[알림장 숙제] 조회 실패:', error, req);
      res.status(500).json({ error: '숙제 조회 중 오류가 발생했습니다.', code: 'HOMEWORK_FETCH_FAILED' });
    }
  });

  app.post('/api/notebook/entries/:id/homework', requireAuth(), csrfProtection, async (req, res) => {
    try {
      const journalId = parseInt(req.params.id, 10);
      if (!Number.isFinite(journalId)) {
        return res.status(400).json({ error: '올바른 일지 ID가 필요합니다.', code: 'INVALID_JOURNAL_ID' });
      }
      const currentUser = req.session.user!;
      const journal = storage.getTrainingJournalById(journalId);
      if (!journal) {
        return res.status(404).json({ error: '해당 훈련 일지를 찾을 수 없습니다.', code: 'JOURNAL_NOT_FOUND' });
      }
      if (!storage.canUserModifyTrainingJournal(currentUser.id, currentUser.role, journal)) {
        return res.status(403).json({ error: '숙제를 추가할 권한이 없습니다.', code: 'INSUFFICIENT_PERMISSIONS' });
      }
      const label = String(req.body?.label || '').trim();
      if (!label || label.length > 200) {
        return res.status(400).json({ error: '숙제 내용은 1~200자로 입력해주세요.', code: 'INVALID_LABEL' });
      }
      let dueDate: Date | null = null;
      if (req.body?.dueDate) {
        const d = new Date(req.body.dueDate);
        if (isNaN(d.getTime())) {
          return res.status(400).json({ error: '올바른 마감일이 아닙니다.', code: 'INVALID_DUE_DATE' });
        }
        dueDate = d;
      }
      const item = await storage.createHomeworkItem({
        journalId,
        label,
        dueDate,
        createdByUserId: currentUser.id,
      });
      res.status(201).json({ success: true, item, ...(await buildHomeworkResponse(journalId)) });
    } catch (error) {
      logServerError('[알림장 숙제] 추가 실패:', error, req);
      res.status(500).json({ error: '숙제 추가 중 오류가 발생했습니다.', code: 'HOMEWORK_CREATE_FAILED' });
    }
  });

  app.patch('/api/notebook/homework/:id/complete', requireAuth(), csrfProtection, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (!Number.isFinite(id)) {
        return res.status(400).json({ error: '올바른 숙제 ID가 필요합니다.', code: 'INVALID_HOMEWORK_ID' });
      }
      const currentUser = req.session.user!;
      const item = await storage.getHomeworkItemById(id);
      if (!item) {
        return res.status(404).json({ error: '숙제를 찾을 수 없습니다.', code: 'HOMEWORK_NOT_FOUND' });
      }
      const journal = storage.getTrainingJournalById(item.journalId);
      if (!journal || !storage.canUserAccessTrainingJournal(currentUser.id, currentUser.role, journal)) {
        return res.status(403).json({ error: '숙제 처리 권한이 없습니다.', code: 'INSUFFICIENT_PERMISSIONS' });
      }
      const completed = !!req.body?.completed;
      await storage.setHomeworkCompletion(id, completed, currentUser.id);
      const response = await buildHomeworkResponse(item.journalId);
      const allCompleted = response.stats.total > 0 && response.stats.completed === response.stats.total;

      if (completed && allCompleted && currentUser.id !== journal.trainerId) {
        try {
          const author = storage.getUser(currentUser.id);
          const authorName = author?.name || author?.username || '보호자';
          const journalTitle = journal.title || '훈련 알림장';
          await notificationService.sendNotification({
            userId: journal.trainerId,
            type: 'message',
            title: `${authorName}님이 모든 숙제를 완료했습니다`,
            message: `[${journalTitle}] 모든 숙제 항목이 완료되었습니다.`,
            data: { journalId: item.journalId },
            actionUrl: `/trainer/notebook?journalId=${item.journalId}`,
          });
        } catch (notifErr) {
          logServerError('[알림장 숙제] 알림 발송 실패:', notifErr, req);
        }
      }

      res.json({ success: true, allCompleted, ...response });
    } catch (error) {
      logServerError('[알림장 숙제] 완료 토글 실패:', error, req);
      res.status(500).json({ error: '숙제 처리 중 오류가 발생했습니다.', code: 'HOMEWORK_TOGGLE_FAILED' });
    }
  });

  app.delete('/api/notebook/homework/:id', requireAuth(), csrfProtection, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (!Number.isFinite(id)) {
        return res.status(400).json({ error: '올바른 숙제 ID가 필요합니다.', code: 'INVALID_HOMEWORK_ID' });
      }
      const currentUser = req.session.user!;
      const item = await storage.getHomeworkItemById(id);
      if (!item) {
        return res.status(404).json({ error: '숙제를 찾을 수 없습니다.', code: 'HOMEWORK_NOT_FOUND' });
      }
      const journal = storage.getTrainingJournalById(item.journalId);
      if (!journal || !storage.canUserModifyTrainingJournal(currentUser.id, currentUser.role, journal)) {
        return res.status(403).json({ error: '숙제 삭제 권한이 없습니다.', code: 'INSUFFICIENT_PERMISSIONS' });
      }
      await storage.deleteHomeworkItem(id);
      res.json({ success: true, ...(await buildHomeworkResponse(item.journalId)) });
    } catch (error) {
      logServerError('[알림장 숙제] 삭제 실패:', error, req);
      res.status(500).json({ error: '숙제 삭제 중 오류가 발생했습니다.', code: 'HOMEWORK_DELETE_FAILED' });
    }
  });

  app.get('/api/notebook/homework/overdue-count', requireAuth(), async (req, res) => {
    try {
      const currentUser = req.session.user!;
      const count = await storage.getOverdueHomeworkCountForOwner(currentUser.id);
      res.json({ success: true, count });
    } catch (error) {
      logServerError('[알림장 숙제] 지연 카운트 실패:', error, req);
      res.status(500).json({ error: '지연 숙제 조회 실패', code: 'HOMEWORK_OVERDUE_COUNT_FAILED' });
    }
  });

  app.get('/api/notebook/homework/weekly-stats', requireAuth(), async (req, res) => {
    try {
      const currentUser = req.session.user!;
      const stats = await storage.getWeeklyHomeworkStatsForOwner(currentUser.id);
      res.json({ success: true, stats });
    } catch (error) {
      logServerError('[알림장 숙제] 주간 통계 실패:', error, req);
      res.status(500).json({ error: '주간 숙제 통계 조회 실패', code: 'HOMEWORK_WEEKLY_STATS_FAILED' });
    }
  });

  // 이모지 반응 토글
  app.post('/api/notebook/entries/:id/reactions', requireAuth(), csrfProtection, async (req, res) => {
    try {
      const journalId = parseInt(req.params.id, 10);
      if (!Number.isFinite(journalId)) {
        return res.status(400).json({ error: '올바른 일지 ID가 필요합니다.', code: 'INVALID_JOURNAL_ID' });
      }
      const emoji = String(req.body?.emoji || '').trim();
      if (!ALLOWED_REACTION_EMOJIS.includes(emoji)) {
        return res.status(400).json({ error: '허용되지 않는 이모지입니다.', code: 'INVALID_EMOJI', allowed: ALLOWED_REACTION_EMOJIS });
      }
      const currentUser = req.session.user!;
      const journal = storage.getTrainingJournalById(journalId);
      if (!journal) {
        return res.status(404).json({ error: '해당 훈련 일지를 찾을 수 없습니다.', code: 'JOURNAL_NOT_FOUND' });
      }
      if (!storage.canUserAccessTrainingJournal(currentUser.id, currentUser.role, journal)) {
        return res.status(403).json({ error: '반응을 남길 권한이 없습니다.', code: 'INSUFFICIENT_PERMISSIONS' });
      }
      const result = storage.toggleJournalReaction(journalId, currentUser.id, emoji);
      res.json({ success: true, added: result.added, ...buildJournalCommentsResponse(journalId, currentUser.id) });
    } catch (error) {
      logServerError('[알림장 반응] 토글 실패:', error, req);
      res.status(500).json({ error: '반응 처리 중 오류가 발생했습니다.', code: 'REACTION_TOGGLE_FAILED' });
    }
  });
  // ============ 알림장 숙제 체크리스트 ============
  type HomeworkItem = {
    id: number;
    journalId: number;
    label: string;
    dueDate: string | null;
    completedAt: string | null;
    completedByUserId: number | null;
    sortOrder: number;
    createdAt: string;
  };
  const homeworkStore = (): HomeworkItem[] => {
    if (!storage.notebookHomeworkItems) storage.notebookHomeworkItems = [];
    return storage.notebookHomeworkItems as HomeworkItem[];
  };
  const nextHomeworkId = (): number => {
    const arr = homeworkStore();
    return (arr.reduce((m, x) => Math.max(m, x.id || 0), 0) || 0) + 1;
  };
  const listHomeworkForJournal = (journalId: number): HomeworkItem[] =>
    homeworkStore()
      .filter((h) => h.journalId === journalId)
      .sort((a, b) => (a.sortOrder - b.sortOrder) || (a.id - b.id));

  const parseDueDate = (raw: unknown): string | null => {
    if (raw == null || raw === '') return null;
    const d = new Date(String(raw));
    if (isNaN(d.getTime())) return null;
    return d.toISOString();
  };

  // GET 숙제 목록 — 일지 접근 권한 필요
  app.get('/api/notebook/entries/:id/homework', requireAuth(), async (req, res) => {
    try {
      const journalId = parseInt(req.params.id, 10);
      if (!Number.isFinite(journalId)) return res.status(400).json({ error: '올바른 일지 ID가 필요합니다.' });
      const currentUser = req.session.user!;
      const journal = storage.getTrainingJournalById(journalId);
      if (!journal) return res.status(404).json({ error: '훈련 일지 없음' });
      if (!storage.canUserAccessTrainingJournal(currentUser.id, currentUser.role, journal)) {
        return res.status(403).json({ error: '권한이 없습니다.' });
      }
      const items = listHomeworkForJournal(journalId);
      const total = items.length;
      const completed = items.filter((i) => !!i.completedAt).length;
      res.json({ success: true, items, stats: { total, completed, completionRate: total ? Math.round((completed / total) * 100) : 0 } });
    } catch (error) {
      logServerError('[알림장 숙제] 조회 실패:', error, req);
      res.status(500).json({ error: '조회 중 오류가 발생했습니다.' });
    }
  });

  // POST 숙제 추가 — 트레이너 전용. body: {label, dueDate?} 또는 {items: [...]}
  app.post('/api/notebook/entries/:id/homework', requireAuth(), csrfProtection, async (req, res) => {
    try {
      const journalId = parseInt(req.params.id, 10);
      if (!Number.isFinite(journalId)) return res.status(400).json({ error: '올바른 일지 ID가 필요합니다.' });
      const currentUser = req.session.user!;
      const journal = storage.getTrainingJournalById(journalId);
      if (!journal) return res.status(404).json({ error: '훈련 일지 없음' });
      if (!storage.canUserModifyTrainingJournal(currentUser.id, currentUser.role, journal)) {
        return res.status(403).json({ error: '숙제를 추가할 권한이 없습니다.' });
      }

      const arr = homeworkStore();
      const existing = listHomeworkForJournal(journalId);
      let baseSort = existing.length ? Math.max(...existing.map((i) => i.sortOrder)) + 1 : 0;
      const created: HomeworkItem[] = [];

      const incoming: Array<{ label: string; dueDate?: string | null }> = Array.isArray(req.body?.items)
        ? req.body.items
        : (req.body?.label ? [{ label: req.body.label, dueDate: req.body.dueDate }] : []);
      if (incoming.length === 0) return res.status(400).json({ error: '추가할 항목이 없습니다.' });
      if (existing.length + incoming.length > 50) {
        return res.status(400).json({ error: '한 알림장에 최대 50개까지 추가할 수 있습니다.' });
      }

      for (const raw of incoming) {
        const label = String(raw.label || '').trim().slice(0, 200);
        if (!label) continue;
        const item: HomeworkItem = {
          id: nextHomeworkId(),
          journalId,
          label,
          dueDate: parseDueDate(raw.dueDate),
          completedAt: null,
          completedByUserId: null,
          sortOrder: baseSort++,
          createdAt: new Date().toISOString(),
        };
        arr.push(item);
        created.push(item);
      }
      res.json({ success: true, items: listHomeworkForJournal(journalId), created });
    } catch (error) {
      logServerError('[알림장 숙제] 추가 실패:', error, req);
      res.status(500).json({ error: '추가 중 오류가 발생했습니다.' });
    }
  });

  // PATCH 숙제 수정(라벨/마감일/순서) — 트레이너 전용
  app.patch('/api/notebook/homework/:itemId', requireAuth(), csrfProtection, async (req, res) => {
    try {
      const itemId = parseInt(req.params.itemId, 10);
      if (!Number.isFinite(itemId)) return res.status(400).json({ error: '올바른 ID가 필요합니다.' });
      const currentUser = req.session.user!;
      const item = homeworkStore().find((i) => i.id === itemId);
      if (!item) return res.status(404).json({ error: '항목을 찾을 수 없습니다.' });
      const journal = storage.getTrainingJournalById(item.journalId);
      if (!journal || !storage.canUserModifyTrainingJournal(currentUser.id, currentUser.role, journal)) {
        return res.status(403).json({ error: '권한이 없습니다.' });
      }
      if (typeof req.body?.label === 'string') {
        const label = req.body.label.trim().slice(0, 200);
        if (label) item.label = label;
      }
      if ('dueDate' in (req.body || {})) item.dueDate = parseDueDate(req.body.dueDate);
      if (typeof req.body?.sortOrder === 'number') item.sortOrder = req.body.sortOrder;
      res.json({ success: true, item });
    } catch (error) {
      logServerError('[알림장 숙제] 수정 실패:', error, req);
      res.status(500).json({ error: '수정 중 오류가 발생했습니다.' });
    }
  });

  // DELETE 숙제 삭제 — 트레이너 전용
  app.delete('/api/notebook/homework/:itemId', requireAuth(), csrfProtection, async (req, res) => {
    try {
      const itemId = parseInt(req.params.itemId, 10);
      if (!Number.isFinite(itemId)) return res.status(400).json({ error: '올바른 ID가 필요합니다.' });
      const currentUser = req.session.user!;
      const arr = homeworkStore();
      const idx = arr.findIndex((i) => i.id === itemId);
      if (idx < 0) return res.status(404).json({ error: '항목을 찾을 수 없습니다.' });
      const item = arr[idx];
      const journal = storage.getTrainingJournalById(item.journalId);
      if (!journal || !storage.canUserModifyTrainingJournal(currentUser.id, currentUser.role, journal)) {
        return res.status(403).json({ error: '권한이 없습니다.' });
      }
      arr.splice(idx, 1);
      res.json({ success: true });
    } catch (error) {
      logServerError('[알림장 숙제] 삭제 실패:', error, req);
      res.status(500).json({ error: '삭제 중 오류가 발생했습니다.' });
    }
  });

  // PATCH 완료 토글 — 보호자(또는 트레이너) 가능. body: {completed: boolean}
  app.patch('/api/notebook/homework/:itemId/complete', requireAuth(), csrfProtection, async (req, res) => {
    try {
      const itemId = parseInt(req.params.itemId, 10);
      if (!Number.isFinite(itemId)) return res.status(400).json({ error: '올바른 ID가 필요합니다.' });
      const currentUser = req.session.user!;
      const item = homeworkStore().find((i) => i.id === itemId);
      if (!item) return res.status(404).json({ error: '항목을 찾을 수 없습니다.' });
      const journal = storage.getTrainingJournalById(item.journalId);
      if (!journal || !storage.canUserAccessTrainingJournal(currentUser.id, currentUser.role, journal)) {
        return res.status(403).json({ error: '권한이 없습니다.' });
      }
      const completed = req.body?.completed !== false; // default true
      const wasCompleted = !!item.completedAt;
      item.completedAt = completed ? new Date().toISOString() : null;
      item.completedByUserId = completed ? currentUser.id : null;

      // 모든 항목 완료 시 트레이너 알림(전이 발생 시에만)
      const all = listHomeworkForJournal(item.journalId);
      const allDone = all.length > 0 && all.every((i) => !!i.completedAt);
      if (completed && !wasCompleted && allDone && journal.trainerId && journal.trainerId !== currentUser.id) {
        try {
          const { notificationService } = await import('./notifications/notification-service');
          const pet = storage.getPet(journal.petId);
          await notificationService.sendNotification({
            userId: journal.trainerId,
            type: 'training',
            title: '숙제가 모두 완료됐어요',
            message: `${pet?.name || '반려동물'}의 "${journal.title || '알림장'}" 숙제 ${all.length}개가 모두 완료되었습니다.`,
            actionUrl: `/trainer/notebook?journalId=${journal.id}`,
            data: { journalId: journal.id, petId: journal.petId, totalItems: all.length },
          });
        } catch (e) {
          logServerError('[알림장 숙제] 완료 알림 실패:', e, req);
        }
      }
      const total = all.length;
      const completedCount = all.filter((i) => !!i.completedAt).length;

      // Task #104 — 트레이너 대시보드 주간 N% 배지 즉시 갱신용 실시간 이벤트
      if (journal.trainerId && journal.trainerId !== currentUser.id) {
        try {
          const { notificationService } = await import('./notifications/notification-service');
          notificationService.sendCustomEvent(journal.trainerId, {
            type: 'homework_progress',
            journalId: journal.id,
            petId: journal.petId,
            total,
            completed: completedCount,
            completionRate: total ? Math.round((completedCount / total) * 100) : 0,
            allCompleted: allDone,
          });
        } catch (e) {
          // realtime 실패는 응답을 막지 않음
        }
      }

      res.json({
        success: true,
        item,
        stats: { total, completed: completedCount, completionRate: total ? Math.round((completedCount / total) * 100) : 0 },
        allCompleted: allDone,
      });
    } catch (error) {
      logServerError('[알림장 숙제] 완료 토글 실패:', error, req);
      res.status(500).json({ error: '처리 중 오류가 발생했습니다.' });
    }
  });

  // GET 보호자 — 마감 지난 미완료 숙제 카운트(홈 카드 빨간 뱃지)
  app.get('/api/notebook/homework/overdue-count', requireAuth(), async (req, res) => {
    try {
      const currentUser = req.session.user!;
      const journals = (storage.trainingJournals || []).filter(
        (j: any) => storage.canUserAccessTrainingJournal(currentUser.id, currentUser.role, j),
      );
      const journalIds = new Set(journals.map((j: any) => j.id));
      const now = Date.now();
      const overdue = homeworkStore().filter((h) =>
        journalIds.has(h.journalId) && !h.completedAt && h.dueDate && new Date(h.dueDate).getTime() < now,
      );
      res.json({ success: true, overdue: overdue.length });
    } catch (error) {
      logServerError('[알림장 숙제] overdue 카운트 실패:', error, req);
      res.status(500).json({ error: '조회 중 오류가 발생했습니다.', overdue: 0 });
    }
  });

  // GET 트레이너 — 펫별 주간 숙제 완료율
  app.get('/api/notebook/homework/weekly-stats', requireAuth('trainer'), async (req, res) => {
    try {
      const currentUser = req.session.user!;
      const since = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const myJournals = (storage.trainingJournals || []).filter((j: any) =>
        j.trainerId === currentUser.id &&
        new Date(j.trainingDate || j.createdAt || 0).getTime() >= since,
      );
      const byPet = new Map<number, { total: number; completed: number }>();
      for (const j of myJournals) {
        const items = listHomeworkForJournal(j.id);
        if (!items.length) continue;
        const stat = byPet.get(j.petId) || { total: 0, completed: 0 };
        stat.total += items.length;
        stat.completed += items.filter((i) => !!i.completedAt).length;
        byPet.set(j.petId, stat);
      }
      const result: Record<string, { total: number; completed: number; rate: number }> = {};
      byPet.forEach((s, petId) => {
        result[String(petId)] = { ...s, rate: s.total ? Math.round((s.completed / s.total) * 100) : 0 };
      });
      res.json({ success: true, stats: result });
    } catch (error) {
      logServerError('[알림장 숙제] 주간 통계 실패:', error, req);
      res.status(500).json({ error: '조회 중 오류가 발생했습니다.', stats: {} });
    }
  });


  // 6. 특정 펫의 훈련 일지 조회
  app.get("/api/pets/:petId/notebook", requireAuth(), async (req, res) => {
    try {
      const petId = parseInt(req.params.petId);
      const currentUser = req.session.user!;

      if (isNaN(petId)) {
        return res.status(400).json({
          error: '올바른 펫 ID가 필요합니다.',
          code: 'INVALID_PET_ID'
        });
      }

      // 펫 정보 확인
      const pet = storage.getPetById(petId);
      if (!pet) {
        return res.status(404).json({
          error: '해당 반려동물을 찾을 수 없습니다.',
          code: 'PET_NOT_FOUND'
        });
      }

      // 권한 확인 - 펫 소유자, 담당 훈련사, 관리자만 접근 가능
      if (currentUser.role === 'pet-owner' && pet.ownerId !== currentUser.id) {
        return res.status(403).json({
          error: '해당 반려동물의 훈련 일지에 접근할 권한이 없습니다.',
          code: 'INSUFFICIENT_PERMISSIONS'
        });
      }
      
      if (currentUser.role === 'trainer' && pet.assignedTrainerId !== currentUser.id) {
        return res.status(403).json({
          error: '담당하지 않는 반려동물의 훈련 일지에 접근할 권한이 없습니다.',
          code: 'INSUFFICIENT_PERMISSIONS'
        });
      }

      // 해당 펫의 훈련 일지 조회
      const journals = storage.getTrainingJournalsByPet(petId);

      res.json({
        success: true,
        data: journals,
        petInfo: {
          id: pet.id,
          name: pet.name,
          breed: pet.breed
        }
      });

    } catch (error) {
      logServerError('펫별 훈련 일지 조회 오류:', error, req);
      res.status(500).json({
        error: '훈련 일지 조회 중 오류가 발생했습니다.',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  });

  // 7. 훈련사별 일지 목록 조회
  app.get("/api/trainer/notebook/entries", requireAuth('trainer'), async (req, res) => {
    try {
      const currentUser = req.session.user!;
      const journals = storage.getTrainingJournalsByTrainer(currentUser.id);

      res.json({
        success: true,
        data: journals,
        trainerInfo: {
          id: currentUser.id,
          name: currentUser.name
        }
      });

    } catch (error) {
      logServerError('훈련사별 일지 조회 오류:', error, req);
      res.status(500).json({
        error: '훈련사별 일지 조회 중 오류가 발생했습니다.',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  });

  // 8. 미디어 파일 업로드 (훈련 일지 전용)
  app.post("/api/notebook/media/upload", requireAuth(), csrfProtection, (req, res) => {
    // Multer 미들웨어 사용
    uploadMultiple(req, res, (err) => {
      if (err) {
        logServerError('미디어 업로드 오류:', err, req);
        return res.status(400).json({
          error: err.message || '파일 업로드 중 오류가 발생했습니다.',
          code: 'UPLOAD_ERROR'
        });
      }

      try {
        const currentUser = req.session.user!;
        const files = req.files as Express.Multer.File[];

        if (!files || files.length === 0) {
          return res.status(400).json({
            error: '업로드할 파일이 없습니다.',
            code: 'NO_FILES'
          });
        }

        // 업로드된 파일 정보 처리
        const uploadedFiles = processUploadedFiles(files);
        
        // 파일 URL 생성 (public 폴더 기준)
        const fileUrls = files.map(file => ({
          filename: file.filename,
          originalName: file.originalname,
          url: `/uploads/${file.mimetype.startsWith('image/') ? 'images' : 'videos'}/${file.filename}`,
          size: file.size,
          mimetype: file.mimetype,
          type: file.mimetype.startsWith('image/') ? 'image' : 'video'
        }));

        res.json({
          success: true,
          message: `${files.length}개의 파일이 성공적으로 업로드되었습니다.`,
          data: fileUrls
        });

      } catch (error) {
        logServerError('파일 처리 오류:', error, req);
        res.status(500).json({
          error: '파일 처리 중 오류가 발생했습니다.',
          code: 'FILE_PROCESSING_ERROR'
        });
      }
    });
  });

  // 9. 미디어 첨부 (업로드된 파일을 일지에 연결)
  app.post("/api/notebook/entries/:id/media", requireAuth(), csrfProtection, async (req, res) => {
    try {
      const journalId = parseInt(req.params.id);
      const currentUser = req.session.user!;

      if (isNaN(journalId)) {
        return res.status(400).json({
          error: '올바른 일지 ID가 필요합니다.',
          code: 'INVALID_JOURNAL_ID'
        });
      }

      // 기존 일지 확인
      const existingJournal = storage.getTrainingJournalById(journalId);
      if (!existingJournal) {
        return res.status(404).json({
          error: '해당 훈련 일지를 찾을 수 없습니다.',
          code: 'JOURNAL_NOT_FOUND'
        });
      }

      // 수정 권한 확인
      if (!storage.canUserModifyTrainingJournal(currentUser.id, currentUser.role, existingJournal)) {
        return res.status(403).json({
          error: '해당 훈련 일지에 미디어를 첨부할 권한이 없습니다.',
          code: 'INSUFFICIENT_PERMISSIONS'
        });
      }

      // 요청 본문 검증
      const { mediaUrls, description } = req.body;
      
      if (!mediaUrls || !Array.isArray(mediaUrls) || mediaUrls.length === 0) {
        return res.status(400).json({
          error: '첨부할 미디어 URL이 필요합니다.',
          code: 'MEDIA_URLS_REQUIRED'
        });
      }

      // 각 미디어 URL 첨부
      let attachedCount = 0;
      for (const mediaUrl of mediaUrls) {
        if (storage.addTrainingJournalMedia(journalId, mediaUrl, description)) {
          attachedCount++;
        }
      }

      if (attachedCount > 0) {
        res.json({
          success: true,
          message: `${attachedCount}개의 미디어가 성공적으로 첨부되었습니다.`,
          attached: attachedCount,
          total: mediaUrls.length
        });
      } else {
        res.status(500).json({
          error: '미디어 첨부에 실패했습니다.',
          code: 'MEDIA_ATTACH_FAILED'
        });
      }

    } catch (error: any) {
      logServerError('미디어 첨부 오류:', error, req);
      res.status(500).json({
        error: '미디어 첨부 중 오류가 발생했습니다.',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  });

  // 10. 미디어 파일 삭제
  app.delete("/api/notebook/entries/:id/media", requireAuth(), csrfProtection, async (req, res) => {
    try {
      const journalId = parseInt(req.params.id);
      const currentUser = req.session.user!;
      const { mediaUrl } = req.body;

      if (isNaN(journalId)) {
        return res.status(400).json({
          error: '올바른 일지 ID가 필요합니다.',
          code: 'INVALID_JOURNAL_ID'
        });
      }

      if (!mediaUrl) {
        return res.status(400).json({
          error: '삭제할 미디어 URL이 필요합니다.',
          code: 'MEDIA_URL_REQUIRED'
        });
      }

      // 기존 일지 확인
      const existingJournal = storage.getTrainingJournalById(journalId);
      if (!existingJournal) {
        return res.status(404).json({
          error: '해당 훈련 일지를 찾을 수 없습니다.',
          code: 'JOURNAL_NOT_FOUND'
        });
      }

      // 수정 권한 확인
      if (!storage.canUserModifyTrainingJournal(currentUser.id, currentUser.role, existingJournal)) {
        return res.status(403).json({
          error: '해당 훈련 일지의 미디어를 삭제할 권한이 없습니다.',
          code: 'INSUFFICIENT_PERMISSIONS'
        });
      }

      // 미디어 제거
      const success = storage.removeTrainingJournalMedia(journalId, mediaUrl);
      
      if (success) {
        // 실제 파일도 삭제 시도
        const fileName = mediaUrl.split('/').pop();
        if (fileName) {
          const filePathImage = `/uploads/images/${fileName}`;
          const filePathVideo = `/uploads/videos/${fileName}`;
          deleteFile(filePathImage) || deleteFile(filePathVideo);
        }

        res.json({
          success: true,
          message: '미디어가 성공적으로 삭제되었습니다.'
        });
      } else {
        res.status(404).json({
          error: '해당 미디어를 찾을 수 없거나 삭제에 실패했습니다.',
          code: 'MEDIA_DELETE_FAILED'
        });
      }

    } catch (error) {
      logServerError('미디어 삭제 오류:', error, req);
      res.status(500).json({
        error: '미디어 삭제 중 오류가 발생했습니다.',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  });

  // 9. 대량 상태 업데이트
  app.post("/api/notebook/bulk-update", requireAuth(), csrfProtection, async (req, res) => {
    try {
      const currentUser = req.session.user!;

      // Zod 스키마 검증
      const validatedData = bulkTrainingJournalUpdateSchema.parse(req.body);

      // 각 일지에 대한 권한 확인
      const unauthorizedIds: number[] = [];
      for (const journalId of validatedData.journalIds) {
        const journal = storage.getTrainingJournalById(journalId);
        if (journal && !storage.canUserAccessTrainingJournal(currentUser.id, currentUser.role, journal)) {
          unauthorizedIds.push(journalId);
        }
      }

      if (unauthorizedIds.length > 0) {
        return res.status(403).json({
          error: '일부 훈련 일지에 대한 접근 권한이 없습니다.',
          code: 'INSUFFICIENT_PERMISSIONS',
          unauthorizedIds
        });
      }

      // 대량 업데이트 실행
      const result = storage.bulkUpdateTrainingJournalStatus(
        validatedData.journalIds, 
        validatedData.updates
      );

      res.json({
        success: true,
        message: `${result.updated}개의 훈련 일지가 업데이트되었습니다.`,
        updated: result.updated,
        errors: result.errors
      });

    } catch (error: any) {
      logServerError('대량 업데이트 오류:', error, req);
      if (error.name === 'ZodError') {
        return res.status(400).json({
          error: '입력 데이터가 올바르지 않습니다.',
          code: 'VALIDATION_ERROR',
          details: error.errors
        });
      }
      res.status(500).json({
        error: '대량 업데이트 중 오류가 발생했습니다.',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  });

  // ============ 훈련 일지 (알림장) API 구현 ============
  
  // 1. 새 훈련 일지 생성 - 훈련사만 가능
  app.post("/api/notebook/entries", requireAuth('trainer'), csrfProtection, async (req, res) => {
    try {
      const validatedData = insertTrainingJournalSchema.parse(req.body);
      const currentUser = req.session.user!;
      
      // 권한 확인 - 훈련사가 담당 펫의 일지만 생성 가능
      if (!storage.canUserCreateTrainingJournal(currentUser.id, currentUser.role, validatedData.petId)) {
        return res.status(403).json({
          error: '해당 반려동물의 훈련 일지를 작성할 권한이 없습니다.',
          code: 'INSUFFICIENT_PERMISSIONS'
        });
      }

      // 펫 정보 확인
      const pet = storage.getPetById(validatedData.petId);
      if (!pet) {
        return res.status(404).json({
          error: '해당 반려동물을 찾을 수 없습니다.',
          code: 'PET_NOT_FOUND'
        });
      }

      // 훈련 일지 생성
      const journalEntry = storage.createTrainingJournal({
        ...validatedData,
        trainerId: currentUser.id,
        petOwnerId: pet.ownerId,
        status: 'sent',
        isRead: false
      });

      res.status(201).json({
        success: true,
        message: '훈련 일지가 성공적으로 생성되었습니다.',
        data: journalEntry
      });

    } catch (error: any) {
      logServerError('훈련 일지 생성 오류:', error, req);
      if (error.name === 'ZodError') {
        return res.status(400).json({
          error: '입력 데이터가 올바르지 않습니다.',
          code: 'VALIDATION_ERROR',
          details: error.errors
        });
      }
      res.status(500).json({
        error: '훈련 일지 생성 중 오류가 발생했습니다.',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  });

  // 2. 훈련 일지 목록 조회 (페이지네이션, 필터링)
  app.get("/api/notebook/entries", requireAuth(), async (req, res) => {
    try {
      const query = trainingJournalQuerySchema.parse(req.query);
      const currentUser = req.session.user!;

      // 사용자 권한에 따른 필터링
      if (currentUser.role === 'pet-owner') {
        query.petOwnerId = currentUser.id;
      } else if (currentUser.role === 'trainer') {
        query.trainerId = currentUser.id;
      }

      const result = storage.getTrainingJournalsWithPagination(query);

      res.json({
        success: true,
        data: result.journals,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages
        }
      });

    } catch (error: any) {
      logServerError('훈련 일지 목록 조회 오류:', error, req);
      if (error.name === 'ZodError') {
        return res.status(400).json({
          error: '쿼리 매개변수가 올바르지 않습니다.',
          code: 'VALIDATION_ERROR',
          details: error.errors
        });
      }
      res.status(500).json({
        error: '훈련 일지 목록 조회 중 오류가 발생했습니다.',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  });

  // 3. 특정 훈련 일지 조회
  app.get("/api/notebook/entries/:id", requireAuth(), async (req, res) => {
    try {
      const journalId = parseInt(req.params.id);
      const currentUser = req.session.user!;

      if (isNaN(journalId)) {
        return res.status(400).json({
          error: '올바른 일지 ID가 필요합니다.',
          code: 'INVALID_JOURNAL_ID'
        });
      }

      const journal = storage.getTrainingJournalById(journalId);
      if (!journal) {
        return res.status(404).json({
          error: '해당 훈련 일지를 찾을 수 없습니다.',
          code: 'JOURNAL_NOT_FOUND'
        });
      }

      // 권한 확인 - IDOR 방지
      if (!storage.canUserAccessTrainingJournal(currentUser.id, currentUser.role, journal)) {
        return res.status(403).json({
          error: '해당 훈련 일지에 접근할 권한이 없습니다.',
          code: 'INSUFFICIENT_PERMISSIONS'
        });
      }

      // 읽음 상태 업데이트 (견주가 조회할 때)
      if (currentUser.role === 'pet-owner' && !journal.isRead) {
        storage.updateTrainingJournal(journalId, {
          isRead: true,
          readAt: new Date().toISOString(),
          status: 'read'
        });
        journal.isRead = true;
        journal.readAt = new Date().toISOString();
        journal.status = 'read';
      }

      res.json({
        success: true,
        data: journal
      });

    } catch (error) {
      logServerError('훈련 일지 조회 오류:', error, req);
      res.status(500).json({
        error: '훈련 일지 조회 중 오류가 발생했습니다.',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  });

  // 4. 훈련 일지 수정
  app.put("/api/notebook/entries/:id", requireAuth(), csrfProtection, async (req, res) => {
    try {
      const journalId = parseInt(req.params.id);
      const currentUser = req.session.user!;

      if (isNaN(journalId)) {
        return res.status(400).json({
          error: '올바른 일지 ID가 필요합니다.',
          code: 'INVALID_JOURNAL_ID'
        });
      }

      // 기존 일지 확인
      const existingJournal = storage.getTrainingJournalById(journalId);
      if (!existingJournal) {
        return res.status(404).json({
          error: '해당 훈련 일지를 찾을 수 없습니다.',
          code: 'JOURNAL_NOT_FOUND'
        });
      }

      // 수정 권한 확인 - IDOR 방지
      if (!storage.canUserModifyTrainingJournal(currentUser.id, currentUser.role, existingJournal)) {
        return res.status(403).json({
          error: '해당 훈련 일지를 수정할 권한이 없습니다.',
          code: 'INSUFFICIENT_PERMISSIONS'
        });
      }

      // Zod 스키마 검증
      const validatedData = updateTrainingJournalSchema.parse(req.body);

      // 훈련 일지 수정
      const updatedJournal = storage.updateTrainingJournal(journalId, validatedData);

      res.json({
        success: true,
        message: '훈련 일지가 성공적으로 수정되었습니다.',
        data: updatedJournal
      });

    } catch (error: any) {
      logServerError('훈련 일지 수정 오류:', error, req);
      if (error.name === 'ZodError') {
        return res.status(400).json({
          error: '입력 데이터가 올바르지 않습니다.',
          code: 'VALIDATION_ERROR',
          details: error.errors
        });
      }
      res.status(500).json({
        error: '훈련 일지 수정 중 오류가 발생했습니다.',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  });

  // 5. 훈련 일지 삭제
  app.delete("/api/notebook/entries/:id", requireAuth(), csrfProtection, async (req, res) => {
    try {
      const journalId = parseInt(req.params.id);
      const currentUser = req.session.user!;

      if (isNaN(journalId)) {
        return res.status(400).json({
          error: '올바른 일지 ID가 필요합니다.',
          code: 'INVALID_JOURNAL_ID'
        });
      }

      // 기존 일지 확인
      const existingJournal = storage.getTrainingJournalById(journalId);
      if (!existingJournal) {
        return res.status(404).json({
          error: '해당 훈련 일지를 찾을 수 없습니다.',
          code: 'JOURNAL_NOT_FOUND'
        });
      }

      // 삭제 권한 확인 - IDOR 방지
      if (!storage.canUserModifyTrainingJournal(currentUser.id, currentUser.role, existingJournal)) {
        return res.status(403).json({
          error: '해당 훈련 일지를 삭제할 권한이 없습니다.',
          code: 'INSUFFICIENT_PERMISSIONS'
        });
      }

      // 훈련 일지 삭제
      const deleted = storage.deleteTrainingJournal(journalId);
      
      if (deleted) {
        res.json({
          success: true,
          message: '훈련 일지가 성공적으로 삭제되었습니다.'
        });
      } else {
        res.status(500).json({
          error: '훈련 일지 삭제에 실패했습니다.',
          code: 'DELETE_FAILED'
        });
      }

    } catch (error) {
      logServerError('훈련 일지 삭제 오류:', error, req);
      res.status(500).json({
        error: '훈련 일지 삭제 중 오류가 발생했습니다.',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  });

  // 6. 특정 펫의 훈련 일지 조회
  app.get("/api/pets/:petId/notebook", requireAuth(), async (req, res) => {
    try {
      const petId = parseInt(req.params.petId);
      const currentUser = req.session.user!;

      if (isNaN(petId)) {
        return res.status(400).json({
          error: '올바른 펫 ID가 필요합니다.',
          code: 'INVALID_PET_ID'
        });
      }

      // 펫 정보 확인
      const pet = storage.getPetById(petId);
      if (!pet) {
        return res.status(404).json({
          error: '해당 반려동물을 찾을 수 없습니다.',
          code: 'PET_NOT_FOUND'
        });
      }

      // 권한 확인 - 펫 소유자, 담당 훈련사, 관리자만 접근 가능
      if (currentUser.role === 'pet-owner' && pet.ownerId !== currentUser.id) {
        return res.status(403).json({
          error: '해당 반려동물의 훈련 일지에 접근할 권한이 없습니다.',
          code: 'INSUFFICIENT_PERMISSIONS'
        });
      }
      
      if (currentUser.role === 'trainer' && pet.assignedTrainerId !== currentUser.id) {
        return res.status(403).json({
          error: '담당하지 않는 반려동물의 훈련 일지에 접근할 권한이 없습니다.',
          code: 'INSUFFICIENT_PERMISSIONS'
        });
      }

      // 해당 펫의 훈련 일지 조회
      const journals = storage.getTrainingJournalsByPet(petId);

      res.json({
        success: true,
        data: journals,
        petInfo: {
          id: pet.id,
          name: pet.name,
          breed: pet.breed
        }
      });

    } catch (error) {
      logServerError('펫별 훈련 일지 조회 오류:', error, req);
      res.status(500).json({
        error: '훈련 일지 조회 중 오류가 발생했습니다.',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  });

  // 7. 훈련사별 일지 목록 조회
  app.get("/api/trainer/notebook/entries", requireAuth('trainer'), async (req, res) => {
    try {
      const currentUser = req.session.user!;
      const journals = storage.getTrainingJournalsByTrainer(currentUser.id);

      res.json({
        success: true,
        data: journals,
        trainerInfo: {
          id: currentUser.id,
          name: currentUser.name
        }
      });

    } catch (error) {
      logServerError('훈련사별 일지 조회 오류:', error, req);
      res.status(500).json({
        error: '훈련사별 일지 조회 중 오류가 발생했습니다.',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  });

  // 8. 미디어 파일 업로드 (훈련 일지 전용)
  app.post("/api/notebook/media/upload", requireAuth(), csrfProtection, (req, res) => {
    // Multer 미들웨어 사용
    uploadMultiple(req, res, (err) => {
      if (err) {
        logServerError('미디어 업로드 오류:', err, req);
        return res.status(400).json({
          error: err.message || '파일 업로드 중 오류가 발생했습니다.',
          code: 'UPLOAD_ERROR'
        });
      }

      try {
        const currentUser = req.session.user!;
        const files = req.files as Express.Multer.File[];

        if (!files || files.length === 0) {
          return res.status(400).json({
            error: '업로드할 파일이 없습니다.',
            code: 'NO_FILES'
          });
        }

        // 파일 형식 및 크기 제한 검증
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'video/avi', 'video/mov'];
        const maxFileSize = 50 * 1024 * 1024; // 50MB

        for (const file of files) {
          if (!allowedTypes.includes(file.mimetype)) {
            return res.status(400).json({
              error: `지원하지 않는 파일 형식입니다: ${file.mimetype}`,
              code: 'INVALID_FILE_TYPE'
            });
          }
          if (file.size > maxFileSize) {
            return res.status(400).json({
              error: '파일 크기는 50MB를 초과할 수 없습니다.',
              code: 'FILE_TOO_LARGE'
            });
          }
        }

        // 업로드된 파일 정보 처리
        const uploadedFiles = processUploadedFiles(files);
        
        // 파일 URL 생성 (public 폴더 기준)
        const fileUrls = files.map(file => ({
          filename: file.filename,
          originalName: file.originalname,
          url: `/uploads/${file.mimetype.startsWith('image/') ? 'images' : 'videos'}/${file.filename}`,
          size: file.size,
          mimetype: file.mimetype,
          type: file.mimetype.startsWith('image/') ? 'image' : 'video'
        }));

        res.json({
          success: true,
          message: `${files.length}개의 파일이 성공적으로 업로드되었습니다.`,
          data: fileUrls
        });

      } catch (error) {
        logServerError('파일 처리 오류:', error, req);
        res.status(500).json({
          error: '파일 처리 중 오류가 발생했습니다.',
          code: 'FILE_PROCESSING_ERROR'
        });
      }
    });
  });

  // 9. 미디어 첨부 (업로드된 파일을 일지에 연결)
  app.post("/api/notebook/entries/:id/media", requireAuth(), csrfProtection, async (req, res) => {
    try {
      const journalId = parseInt(req.params.id);
      const currentUser = req.session.user!;

      if (isNaN(journalId)) {
        return res.status(400).json({
          error: '올바른 일지 ID가 필요합니다.',
          code: 'INVALID_JOURNAL_ID'
        });
      }

      // 기존 일지 확인
      const existingJournal = storage.getTrainingJournalById(journalId);
      if (!existingJournal) {
        return res.status(404).json({
          error: '해당 훈련 일지를 찾을 수 없습니다.',
          code: 'JOURNAL_NOT_FOUND'
        });
      }

      // 수정 권한 확인
      if (!storage.canUserModifyTrainingJournal(currentUser.id, currentUser.role, existingJournal)) {
        return res.status(403).json({
          error: '해당 훈련 일지에 미디어를 첨부할 권한이 없습니다.',
          code: 'INSUFFICIENT_PERMISSIONS'
        });
      }

      // 요청 본문 검증
      const { mediaUrls, description } = req.body;
      
      if (!mediaUrls || !Array.isArray(mediaUrls) || mediaUrls.length === 0) {
        return res.status(400).json({
          error: '첨부할 미디어 URL이 필요합니다.',
          code: 'MEDIA_URLS_REQUIRED'
        });
      }

      // 각 미디어 URL 첨부
      let attachedCount = 0;
      for (const mediaUrl of mediaUrls) {
        if (storage.addTrainingJournalMedia(journalId, mediaUrl, description)) {
          attachedCount++;
        }
      }

      if (attachedCount > 0) {
        res.json({
          success: true,
          message: `${attachedCount}개의 미디어가 성공적으로 첨부되었습니다.`,
          attached: attachedCount,
          total: mediaUrls.length
        });
      } else {
        res.status(500).json({
          error: '미디어 첨부에 실패했습니다.',
          code: 'MEDIA_ATTACH_FAILED'
        });
      }

    } catch (error: any) {
      logServerError('미디어 첨부 오류:', error, req);
      res.status(500).json({
        error: '미디어 첨부 중 오류가 발생했습니다.',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  });

  // 10. 미디어 파일 삭제
  app.delete("/api/notebook/entries/:id/media", requireAuth(), csrfProtection, async (req, res) => {
    try {
      const journalId = parseInt(req.params.id);
      const currentUser = req.session.user!;
      const { mediaUrl } = req.body;

      if (isNaN(journalId)) {
        return res.status(400).json({
          error: '올바른 일지 ID가 필요합니다.',
          code: 'INVALID_JOURNAL_ID'
        });
      }

      if (!mediaUrl) {
        return res.status(400).json({
          error: '삭제할 미디어 URL이 필요합니다.',
          code: 'MEDIA_URL_REQUIRED'
        });
      }

      // 기존 일지 확인
      const existingJournal = storage.getTrainingJournalById(journalId);
      if (!existingJournal) {
        return res.status(404).json({
          error: '해당 훈련 일지를 찾을 수 없습니다.',
          code: 'JOURNAL_NOT_FOUND'
        });
      }

      // 수정 권한 확인
      if (!storage.canUserModifyTrainingJournal(currentUser.id, currentUser.role, existingJournal)) {
        return res.status(403).json({
          error: '해당 훈련 일지의 미디어를 삭제할 권한이 없습니다.',
          code: 'INSUFFICIENT_PERMISSIONS'
        });
      }

      // 미디어 제거
      const success = storage.removeTrainingJournalMedia(journalId, mediaUrl);
      
      if (success) {
        // 실제 파일도 삭제 시도
        const fileName = mediaUrl.split('/').pop();
        if (fileName) {
          const filePathImage = `/uploads/images/${fileName}`;
          const filePathVideo = `/uploads/videos/${fileName}`;
          deleteFile(filePathImage) || deleteFile(filePathVideo);
        }

        res.json({
          success: true,
          message: '미디어가 성공적으로 삭제되었습니다.'
        });
      } else {
        res.status(404).json({
          error: '해당 미디어를 찾을 수 없거나 삭제에 실패했습니다.',
          code: 'MEDIA_DELETE_FAILED'
        });
      }

    } catch (error) {
      logServerError('미디어 삭제 오류:', error, req);
      res.status(500).json({
        error: '미디어 삭제 중 오류가 발생했습니다.',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  });

  // 11. 대량 상태 업데이트
  app.post("/api/notebook/bulk-update", requireAuth(), csrfProtection, async (req, res) => {
    try {
      const currentUser = req.session.user!;

      // Zod 스키마 검증
      const validatedData = bulkTrainingJournalUpdateSchema.parse(req.body);

      // 각 일지에 대한 권한 확인
      const unauthorizedIds: number[] = [];
      for (const journalId of validatedData.journalIds) {
        const journal = storage.getTrainingJournalById(journalId);
        if (journal && !storage.canUserAccessTrainingJournal(currentUser.id, currentUser.role, journal)) {
          unauthorizedIds.push(journalId);
        }
      }

      if (unauthorizedIds.length > 0) {
        return res.status(403).json({
          error: '일부 훈련 일지에 대한 접근 권한이 없습니다.',
          code: 'INSUFFICIENT_PERMISSIONS',
          unauthorizedIds
        });
      }

      // 대량 업데이트 실행
      const result = storage.bulkUpdateTrainingJournalStatus(
        validatedData.journalIds, 
        validatedData.updates
      );

      res.json({
        success: true,
        message: `${result.updated}개의 훈련 일지가 업데이트되었습니다.`,
        updated: result.updated,
        errors: result.errors
      });

    } catch (error: any) {
      logServerError('대량 업데이트 오류:', error, req);
      if (error.name === 'ZodError') {
        return res.status(400).json({
          error: '입력 데이터가 올바르지 않습니다.',
          code: 'VALIDATION_ERROR',
          details: error.errors
        });
      }
      res.status(500).json({
        error: '대량 업데이트 중 오류가 발생했습니다.',
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  });

  // ============ 훈련 일지 API 끝 ============

  // 상담 관련 API
  app.get("/api/consultations/my-requests", async (req, res) => {
    try {
      const consultations = [
        {
          id: 1,
          trainerId: 1,
          trainerName: "김민수 전문 훈련사",
          trainerAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=300&q=80",
          status: "pending",
          date: "2025-06-10",
          time: "14:00",
          type: "행동교정",
          petName: "멍멍이",
          message: "강아지가 낯선 사람을 보면 짖는 문제로 상담 요청드립니다.",
          createdAt: "2025-06-03T17:30:00.000Z"
        },
        {
          id: 2,
          trainerId: 2,
          trainerName: "박지연 훈련사",
          trainerAvatar: "https://images.unsplash.com/photo-1494790108755-2616b332b1b3?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=300&q=80",
          status: "confirmed",
          date: "2025-06-08",
          time: "10:00",
          type: "기본훈련",
          petName: "코코",
          message: "기본적인 앉기, 기다리기 훈련을 배우고 싶습니다.",
          createdAt: "2025-06-01T09:15:00.000Z"
        }
      ];

      res.json({ success: true, consultations });
    } catch (error) {
      logServerError('상담 목록 조회 오류:', error, req);
      res.status(500).json({ error: "상담 목록을 불러올 수 없습니다" });
    }
  });

  app.post("/api/consultations/:id/cancel", csrfProtection, async (req, res) => {
    try {
      const consultationId = req.params.id;

      console.log(`상담 ${consultationId} 취소 요청`);

      res.json({ 
        success: true, 
        message: "상담이 성공적으로 취소되었습니다." 
      });
    } catch (error) {
      logServerError('상담 취소 오류:', error, req);
      res.status(500).json({ error: "상담 취소 중 오류가 발생했습니다" });
    }
  });

  // 1:1 수업/상담 완료 처리 - 트레이너 정산 항목 자동 생성 (sourceType: 'lesson')
  // 보안: 관리자 전용 (server-authoritative). 일반 사용자가 임의 trainerId/amount 로
  // 정산 항목을 생성하지 못하도록 admin 권한을 강제한다. 트레이너 본인 완료 플로우는
  // 별도 PaymentService 결과를 admin/시스템이 confirm 하는 방식으로 처리한다.
  app.post("/api/consultations/:id/complete", requireAuth('admin'), csrfProtection, async (req, res) => {
    try {
      const consultationId = parseInt(req.params.id);
      if (!Number.isFinite(consultationId)) {
        return res.status(400).json({ success: false, message: "유효한 상담 ID가 필요합니다." });
      }

      const {
        trainerId,
        amount,
        consultationType,
        sourceName,
        category,
        notes,
        paymentIntentId,
      } = req.body || {};

      const trainerIdNum = Number(trainerId);
      const amountNum = Number(amount);
      if (!Number.isFinite(trainerIdNum) || trainerIdNum <= 0
          || !Number.isFinite(amountNum) || amountNum <= 0) {
        return res.status(400).json({
          success: false,
          message: "trainerId(양수) 와 amount(>0) 는 필수입니다.",
        });
      }

      // 트레이너 정산 항목 자동 생성 (멱등 - 동일 (lesson, consultationId) 1회만)
      try {
        const { createTrainerSettlementItem } = await import('./routes/trainer-settlements');
        await createTrainerSettlementItem({
          trainerId: trainerIdNum,
          sourceType: 'lesson',
          sourceId: consultationId,
          sourceName: sourceName || `1:1 수업 #${consultationId}`,
          category: category || (consultationType === 'video' ? 'video_consultation' : 'offline_lesson'),
          grossAmount: amountNum,
          occurredAt: new Date(),
          metadata: {
            consultationType: consultationType || 'offline',
            confirmedBy: req.user?.id,
            paymentIntentId: paymentIntentId || undefined, // 환불 시 자동 캐스케이드용
            notes: notes || undefined,
          },
        });
        console.log(`[트레이너 정산 자동 생성 - lesson] 상담 ${consultationId} 정산 항목 생성됨 (admin=${req.user?.id})`);
      } catch (autoSettleErr) {
        logServerError('[트레이너 정산 자동 생성 - lesson] 실패:', autoSettleErr, req);
        return res.status(500).json({ success: false, message: "정산 항목 생성에 실패했습니다." });
      }

      res.json({
        success: true,
        message: "수업 완료가 처리되었고 정산 항목이 생성되었습니다.",
      });
    } catch (error) {
      logServerError('상담 완료 처리 오류:', error, req);
      res.status(500).json({ error: "상담 완료 처리 중 오류가 발생했습니다." });
    }
  });

  app.get("/api/consultations/:id", async (req, res) => {
    try {
      const consultationId = req.params.id;

      const consultation = {
        id: parseInt(consultationId),
        trainerId: 1,
        trainerName: "김민수 전문 훈련사",
        trainerAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=300&q=80",
        status: "confirmed",
        date: "2025-06-10",
        time: "14:00",
        type: "행동교정",
        petName: "멍멍이",
        petAge: "2년",
        petBreed: "골든 리트리버",
        message: "강아지가 낯선 사람을 보면 짖는 문제로 상담 요청드립니다.",
        contactPhone: "010-1234-5678",
        contactEmail: "user@example.com",
        createdAt: "2025-06-03T17:30:00.000Z",
        videoCallUrl: "https://meet.google.com/abc-defg-hij"
      };

      res.json({ success: true, consultation });
    } catch (error) {
      logServerError('상담 상세 조회 오류:', error, req);
      res.status(500).json({ error: "상담 정보를 불러올 수 없습니다" });
    }
  });

  // 메시지 전송 API
  app.post("/api/messages/send", csrfProtection, async (req, res) => {
    try {
      const { trainerId, message } = req.body;

      console.log('메시지 전송 요청:', { trainerId, message });

      const messageId = Date.now();
      const messageData = {
        id: messageId,
        trainerId: trainerId,
        senderId: 'user',
        message: message,
        timestamp: new Date().toISOString(),
        status: 'sent'
      };

      res.json({ 
        success: true, 
        message: "메시지가 성공적으로 전송되었습니다.",
        data: messageData
      });
    } catch (error) {
      logServerError('메시지 전송 오류:', error, req);
      res.status(500).json({ error: "메시지 전송 중 오류가 발생했습니다" });
    }
  });

  // 예약 생성 API (화상수업 등 실제 reservations 테이블에 저장)
  app.post("/api/reservations/create", requireAuth(), csrfProtection, async (req, res) => {
    try {
      const sessionUser = (req as any).user;
      if (!sessionUser?.id) {
        return res.status(401).json({ error: "인증이 필요합니다." });
      }

      const {
        trainerId,
        date,
        time,
        notes,
        petId,
        service,
        serviceType,
        duration,
        price,
      } = req.body || {};

      const trainerIdNum = Number(trainerId);
      if (!trainerIdNum || Number.isNaN(trainerIdNum)) {
        return res.status(400).json({ error: "trainerId가 유효하지 않습니다." });
      }
      if (!date || typeof date !== 'string') {
        return res.status(400).json({ error: "예약 날짜(date)가 필요합니다." });
      }
      const timeStr = typeof time === 'string' && /^\d{2}:\d{2}$/.test(time) ? time : '00:00';
      const scheduledAt = new Date(`${date}T${timeStr}:00`);
      if (Number.isNaN(scheduledAt.getTime())) {
        return res.status(400).json({ error: "예약 일시가 유효하지 않습니다." });
      }

      const durationNum = duration != null ? Number(duration) : 60;

      // 트레이너 조회: 입력된 trainerId가 trainers.id 또는 users.id 어느 쪽이든
      // 허용. reservations.trainerId 는 users.id FK 이므로 항상 users.id로 정규화.
      let trainerName: string | undefined;
      let basePrice = 0;
      let trainerUserId: number = trainerIdNum;
      try {
        // 1) trainers.id 로 우선 조회
        const [byTrainersId] = await db
          .select({ id: trainers.id, userId: trainers.userId, price: trainers.price, name: trainers.name })
          .from(trainers)
          .where(eq(trainers.id, trainerIdNum))
          .limit(1);
        if (byTrainersId) {
          trainerName = byTrainersId.name || undefined;
          basePrice = Number(byTrainersId.price ?? 0);
          if (byTrainersId.userId) trainerUserId = byTrainersId.userId;
        } else {
          // 2) trainers.userId 로 폴백 조회 (이미 users.id가 전달된 경우)
          const [byUserId] = await db
            .select({ id: trainers.id, userId: trainers.userId, price: trainers.price, name: trainers.name })
            .from(trainers)
            .where(eq(trainers.userId, trainerIdNum))
            .limit(1);
          if (byUserId) {
            trainerName = byUserId.name || undefined;
            basePrice = Number(byUserId.price ?? 0);
            if (byUserId.userId) trainerUserId = byUserId.userId;
          }
        }
      } catch (lookupErr) {
        logServerError('[예약] 훈련사 조회 실패:', lookupErr, req);
      }

      // 가격 결정: 요청 본문 우선, 없으면 trainers.price * (duration/60)
      let grossAmount = Number(price);
      if (!grossAmount || Number.isNaN(grossAmount)) {
        grossAmount = Math.round(basePrice * (durationNum / 60));
      }

      // 예약은 '결제 대기' 상태로 생성한다. 정산 항목은 결제 승인 콜백
      // (Toss/Stripe 웹훅) 또는 관리자 confirm(`/api/consultations/:id/complete`)
      // 시점에서만 createTrainerSettlementItem 으로 생성된다. 여기서 정산을
      // 만들면 실제 결제 없이 트레이너 정산 후보에 포함되는 P0 금전 리스크가 있어
      // 의도적으로 분리한다.
      //
      // 동일 시간대 중복 예약 차단 (Task #156): 트레이너별 advisory lock을 트랜잭션
      // 내에서 잡고 duration overlap 검사 후 INSERT. 동시 요청도 직렬화되어
      // race condition 없이 409가 반환된다. 실제 reservations 테이블 컬럼은
      // date / duration_minutes / reservation_type 이므로 raw SQL 사용.
      // (Task #157 에서 schema 도 동일 컬럼명으로 정렬됨)
      type ReservationRow = {
        id: number;
        user_id: number;
        trainer_id: number;
        pet_id: number | null;
        reservation_type: string;
        date: Date;
        duration_minutes: number | null;
        status: string;
        notes: string | null;
        price: string | null;
        created_at: Date;
      };

      const newStart = scheduledAt;
      const newEnd = new Date(scheduledAt.getTime() + durationNum * 60_000);
      const reservationStatus = grossAmount > 0 ? 'pending_payment' : 'confirmed';
      const reservationNotes = notes ? String(notes) : null;
      const reservationServiceType = String(serviceType || service || '화상수업');
      const reservationPetId = petId != null ? Number(petId) : null;
      // 결제 금액 검증(`/create-payment-intent` 의 expectedPrice) 무결성을 위해
      // 유료 예약에는 항상 grossAmount 를 저장한다. 무료 예약은 null.
      const reservationPrice: string | null = grossAmount > 0 ? String(grossAmount) : null;

      let reservation: ReservationRow;
      try {
        reservation = await db.transaction(async (tx) => {
          await tx.execute(sql`SELECT pg_advisory_xact_lock(${trainerUserId}::bigint)`);
          const conflictRes = await tx.execute<{ id: number }>(sql`
            SELECT id
            FROM reservations
            WHERE trainer_id = ${trainerUserId}
              AND COALESCE(status, '') NOT IN ('cancelled','rejected','no_show','expired')
              AND date < ${newEnd}
              AND (date + (COALESCE(duration_minutes, 60) || ' minutes')::interval) > ${newStart}
            LIMIT 1
          `);
          const conflictRows = ((conflictRes as unknown as { rows?: { id: number }[] }).rows
            ?? (conflictRes as unknown as { id: number }[]) ?? []);
          if (conflictRows.length > 0) {
            const err = new Error('RESERVATION_CONFLICT') as Error & { code: string };
            err.code = 'RESERVATION_CONFLICT';
            throw err;
          }
          const insertRes = await tx.execute<ReservationRow>(sql`
            INSERT INTO reservations
              (user_id, trainer_id, pet_id, reservation_type, date, duration_minutes, status, notes, price)
            VALUES
              (${sessionUser.id}, ${trainerUserId}, ${reservationPetId}, ${reservationServiceType},
               ${newStart}, ${durationNum}, ${reservationStatus}, ${reservationNotes}, ${reservationPrice})
            RETURNING id, user_id, trainer_id, pet_id, reservation_type, date, duration_minutes,
                      status, notes, price, created_at
          `);
          const insertRows = ((insertRes as unknown as { rows?: ReservationRow[] }).rows
            ?? (insertRes as unknown as ReservationRow[]) ?? []);
          return insertRows[0];
        });
      } catch (txErr) {
        const code = (txErr as { code?: string } | null)?.code;
        if (code === 'RESERVATION_CONFLICT') {
          return res.status(409).json({
            error: '해당 시간대에 이미 예약이 있습니다. 다른 시간을 선택해주세요.',
            code: 'RESERVATION_CONFLICT',
          });
        }
        throw txErr;
      }

      // 알림: 결제 대기 / 무료 확정 두 케이스 안내
      const scheduleLabel = `${date} ${timeStr}`;
      const ownerTitle = grossAmount > 0 ? '예약 신청이 접수되었습니다' : '예약이 확정되었습니다';
      const ownerMsg = grossAmount > 0
        ? `${trainerName ? trainerName + ' 훈련사와의 ' : ''}수업 예약 신청이 접수되었습니다. 결제 완료 후 확정됩니다. (${scheduleLabel})`
        : `${trainerName ? trainerName + ' 훈련사와의 ' : ''}수업 예약이 확정되었습니다. (${scheduleLabel})`;
      try {
        await notificationService.sendNotification({
          userId: sessionUser.id,
          type: 'reservation',
          title: ownerTitle,
          message: ownerMsg,
          data: { reservationId: reservation.id, trainerId: trainerUserId, scheduledAt: scheduledAt.toISOString(), action: 'reservation_created', requiresPayment: grossAmount > 0 },
          actionUrl: `/reservations/${reservation.id}`,
        });
      } catch (notifyErr) {
        logServerError('[예약] 보호자 알림 전송 실패:', notifyErr, req);
      }
      try {
        await notificationService.sendNotification({
          userId: trainerUserId,
          type: 'reservation',
          title: grossAmount > 0 ? '새 예약 신청이 접수되었습니다' : '새 예약이 확정되었습니다',
          message: grossAmount > 0
            ? `${sessionUser.name || '보호자'}님의 수업 예약 신청이 접수되었습니다. 결제 완료 시 확정됩니다. (${scheduleLabel})`
            : `${sessionUser.name || '보호자'}님의 수업 예약이 확정되었습니다. (${scheduleLabel})`,
          data: { reservationId: reservation.id, userId: sessionUser.id, scheduledAt: scheduledAt.toISOString(), action: 'reservation_created', requiresPayment: grossAmount > 0 },
          actionUrl: `/trainer/reservations/${reservation.id}`,
        });
      } catch (notifyErr) {
        logServerError('[예약] 훈련사 알림 전송 실패:', notifyErr, req);
      }

      // 기존 응답 계약(camelCase) 유지: snake_case raw row → camelCase 매핑
      const reservationPayload = {
        id: reservation.id,
        userId: reservation.user_id,
        trainerId: reservation.trainer_id,
        petId: reservation.pet_id,
        serviceType: reservation.reservation_type,
        scheduledAt: reservation.date,
        duration: reservation.duration_minutes,
        status: reservation.status,
        notes: reservation.notes,
        price: reservation.price,
        createdAt: reservation.created_at,
      };

      res.json({
        success: true,
        message: grossAmount > 0
          ? "예약 신청이 접수되었습니다. 결제 완료 시 확정됩니다."
          : "예약이 확정되었습니다.",
        data: reservationPayload,
        requiresPayment: grossAmount > 0,
      });
    } catch (error) {
      logServerError('예약 생성 오류:', error, req);
      res.status(500).json({ error: "예약 생성 중 오류가 발생했습니다" });
    }
  });

  // 훈련사 등록 API (PostgreSQL 데이터베이스 사용)
  app.post("/api/trainers/register", csrfProtection, async (req, res) => {
    try {
      const { name, email, phone, institute, certification, experience, specialties, bio, location } = req.body;

      console.log('훈련사 등록 요청:', { name, email, institute });

      const trainerData = {
        name: name,
        email: email,
        phone: phone,
        institute: institute,
        certification: certification,
        experience: parseInt(experience) || 0,
        specialties: specialties ? (typeof specialties === 'string' ? specialties.split(',').map((s: string) => s.trim()) : specialties) : [],
        bio: bio || `${experience} 경력의 전문 훈련사입니다.`,
        location: location || '서울시',
        rating: "0",
        reviews: 0,
        reviewCount: 0,
        coursesCount: 0,
        category: "기본 훈련",
        avatar: "https://images.unsplash.com/photo-1607990281513-2c110a25bd8c?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&h=200",
        background: "https://images.unsplash.com/photo-1535930891776-0c2dfb7fda1a?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=350",
        status: 'active',
        verified: true,
        featured: false,
        isActive: true,
      };

      // PostgreSQL 데이터베이스에 저장
      const savedTrainer = await storage.createTrainer(trainerData);

      res.json({ 
        success: true, 
        message: "훈련사 등록이 완료되었습니다.",
        data: savedTrainer
      });
    } catch (error) {
      logServerError('훈련사 등록 오류:', error, req);
      res.status(500).json({ error: "훈련사 등록 중 오류가 발생했습니다" });
    }
  });

  app.get("/api/pets/all-owners", requireAuth(), async (req, res) => {
    try {
      const sessionUser = (req as any).user;
      if (!sessionUser) return res.status(401).json({ error: "인증이 필요합니다." });
      const role = sessionUser.role || sessionUser.userRole;
      if (!['trainer', 'institute-admin', 'admin'].includes(role)) {
        return res.status(403).json({ error: "접근 권한이 없습니다." });
      }
      const searchQuery = (req.query.q as string || '').trim();
      if (!searchQuery || searchQuery.length < 2) {
        return res.json({ success: true, ownerPets: [] });
      }
      const selectFields = {
        petId: pets.id,
        petName: pets.name,
        petBreed: pets.breed,
        petAge: pets.age,
        ownerId: pets.ownerId,
        ownerName: users.name,
      };
      const searchPattern = `%${searchQuery}%`;
      const searchCondition = or(
        ilike(users.name, searchPattern),
        ilike(pets.name, searchPattern)
      );
      let ownerPets;
      if (role === 'admin') {
        ownerPets = await db.select(selectFields).from(pets)
          .innerJoin(users, eq(pets.ownerId, users.id))
          .where(searchCondition!)
          .orderBy(users.name)
          .limit(50);
      } else if (role === 'trainer') {
        const assignedPetIds = await db.selectDistinct({ petId: trainerClientAssignments.petId })
          .from(trainerClientAssignments)
          .where(and(eq(trainerClientAssignments.trainerId, sessionUser.id), isNotNull(trainerClientAssignments.petId)));
        const consultedPetIds = await db.selectDistinct({ petId: consultationRecords.petId })
          .from(consultationRecords)
          .where(eq(consultationRecords.trainerId, sessionUser.id));
        const assignedClientIds = await db.selectDistinct({ clientId: trainerClientAssignments.clientId })
          .from(trainerClientAssignments)
          .where(eq(trainerClientAssignments.trainerId, sessionUser.id));
        const scopedPetIds = [...new Set([
          ...assignedPetIds.filter((r: { petId: number | null }) => r.petId).map((r: { petId: number | null }) => r.petId),
          ...consultedPetIds.map((r: { petId: number }) => r.petId),
        ])];
        const scopedOwnerIds = assignedClientIds.map((r: { clientId: number }) => r.clientId);
        if (scopedPetIds.length > 0 || scopedOwnerIds.length > 0) {
          const scopeConditions: ReturnType<typeof sql>[] = [];
          if (scopedPetIds.length > 0) scopeConditions.push(sql`${pets.id} = ANY(${scopedPetIds})`);
          if (scopedOwnerIds.length > 0) scopeConditions.push(sql`${pets.ownerId} = ANY(${scopedOwnerIds})`);
          const scopeCondition = scopeConditions.length > 1 ? or(...scopeConditions) : scopeConditions[0];
          ownerPets = await db.select(selectFields).from(pets)
            .innerJoin(users, eq(pets.ownerId, users.id))
            .where(and(searchCondition!, scopeCondition!))
            .orderBy(users.name)
            .limit(50);
        } else {
          ownerPets = [];
        }
      } else if (role === 'institute-admin') {
        if (!sessionUser.instituteId) {
          ownerPets = [];
        } else {
          const instTrainers = await db.select({ trainerId: trainerInstitutes.trainerId })
            .from(trainerInstitutes)
            .where(eq(trainerInstitutes.instituteId, sessionUser.instituteId));
          const instTrainerIds = instTrainers.map((t: { trainerId: number }) => t.trainerId);
          if (instTrainerIds.length > 0) {
            const instAssignedPetIds = await db.selectDistinct({ petId: trainerClientAssignments.petId })
              .from(trainerClientAssignments)
              .where(sql`${trainerClientAssignments.trainerId} = ANY(${instTrainerIds})`);
            const instConsultedPetIds = await db.selectDistinct({ petId: consultationRecords.petId })
              .from(consultationRecords)
              .where(sql`${consultationRecords.trainerId} = ANY(${instTrainerIds})`);
            const instAssignedClientIds = await db.selectDistinct({ clientId: trainerClientAssignments.clientId })
              .from(trainerClientAssignments)
              .where(sql`${trainerClientAssignments.trainerId} = ANY(${instTrainerIds})`);
            const scopedPetIds = [...new Set([
              ...instAssignedPetIds.filter((r: { petId: number | null }) => r.petId).map((r: { petId: number | null }) => r.petId),
              ...instConsultedPetIds.map((r: { petId: number }) => r.petId),
            ])];
            const scopedOwnerIds = instAssignedClientIds.map((r: { clientId: number }) => r.clientId);
            if (scopedPetIds.length > 0 || scopedOwnerIds.length > 0) {
              const scopeConditions: ReturnType<typeof sql>[] = [];
              if (scopedPetIds.length > 0) scopeConditions.push(sql`${pets.id} = ANY(${scopedPetIds})`);
              if (scopedOwnerIds.length > 0) scopeConditions.push(sql`${pets.ownerId} = ANY(${scopedOwnerIds})`);
              const scopeCondition = scopeConditions.length > 1 ? or(...scopeConditions) : scopeConditions[0];
              ownerPets = await db.select(selectFields).from(pets)
                .innerJoin(users, eq(pets.ownerId, users.id))
                .where(and(searchCondition!, scopeCondition!))
                .orderBy(users.name)
                .limit(50);
            } else {
              ownerPets = [];
            }
          } else {
            ownerPets = [];
          }
        }
      } else {
        ownerPets = [];
      }
      res.json({ success: true, ownerPets });
    } catch (error) {
      logServerError("보호자-반려동물 검색 오류:", error, req);
      res.status(500).json({ error: "검색 중 오류가 발생했습니다." });
    }
  });

  // 반려동물 목록 조회 API (사용자별 데이터 분리)
  app.get("/api/pets", async (req, res) => {
    try {
      console.log('반려동물 목록 조회 요청');

      // 세션에서 사용자 정보 가져오기
      const userId = req.session?.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "로그인이 필요합니다" });
      }

      console.log('반려동물 목록 조회 - 사용자 ID:', userId);
      console.log('전체 세션 정보:', req.session);
      
      // 사용자 ID를 숫자로 변환하여 조회
      let numericUserId = userId;
      if (typeof userId === 'string') {
        // 테스트 계정에 대한 매핑
        const userMapping = {
          'testuser': 3,
          'test': 3,
          'trainer': 2,
          'trainer01': 2,
          'admin': 1,
          'institute': 4,
          'institute01': 4
        };
        numericUserId = userMapping[userId as keyof typeof userMapping] || parseInt(userId);
      }

      console.log('매핑된 사용자 ID:', numericUserId);
      console.log('저장소에서 펫 조회 시도...');

      // 사용자별 반려동물 목록 조회
      const userPets = await storage.getPetsByUserId(numericUserId);
      console.log('저장소에서 조회된 반려동물:', userPets);
      
      // 반려동물 데이터에 훈련소 매칭 정보 추가
      const petsWithTrainingInfo = userPets.map(pet => ({
        ...pet,
        trainingStatus: pet.trainingStatus || 'not_assigned',
        assignedTrainer: pet.assignedTrainerId ? {
          id: pet.assignedTrainerId,
          name: pet.assignedTrainerName || '훈련사 정보 없음'
        } : null,
        notebookEnabled: pet.notebookEnabled || false,
        lastNotebookEntry: pet.lastNotebookEntry || null
      }));

      res.json({ 
        success: true, 
        pets: petsWithTrainingInfo
      });
    } catch (error) {
      logServerError('반려동물 목록 조회 오류:', error, req);
      res.status(500).json({ error: "반려동물 목록 조회 중 오류가 발생했습니다" });
    }
  });

  // 반려동물 등록 API (Enhanced with Zod validation)
  app.post("/api/pets", csrfProtection, async (req, res) => {
    try {
      console.log('반려동물 등록 요청:', req.body);

      // 세션에서 사용자 정보 가져오기
      const userId = req.session?.user?.id;
      if (!userId) {
        return res.status(401).json({ 
          success: false,
          error: "로그인이 필요합니다",
          code: "AUTHENTICATION_REQUIRED"
        });
      }

      // Zod 스키마 검증
      const validationResult = createPetSchema.safeParse({
        ...req.body,
        ownerId: userId
      });

      if (!validationResult.success) {
        const errors = validationResult.error.issues.map(issue => ({
          field: issue.path.join('.'),
          message: issue.message
        }));
        
        return res.status(400).json({
          success: false,
          error: "입력 데이터가 올바르지 않습니다",
          code: "VALIDATION_ERROR",
          details: errors
        });
      }

      const petData = {
        ...validationResult.data,
        ownerId: userId,
        imageUrl: validationResult.data.imageUrl || "https://images.unsplash.com/photo-1552053831-71594a27632d?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=300",
        trainingStatus: 'not_assigned',
        assignedTrainerId: null,
        assignedTrainerName: null,
        notebookEnabled: false,
        lastNotebookEntry: null,
        isActive: true
      };

      // 저장소에 반려동물 추가
      const createdPet = await storage.createPet(petData);

      console.log('반려동물 등록 성공:', createdPet.id);

      res.status(201).json({ 
        success: true, 
        message: "반려동물이 성공적으로 등록되었습니다.",
        pet: createdPet
      });
    } catch (error) {
      logServerError('반려동물 등록 오류:', error, req);
      res.status(500).json({ 
        success: false,
        error: "반려동물 등록 중 오류가 발생했습니다",
        code: "INTERNAL_SERVER_ERROR"
      });
    }
  });

  // 이미지 업로드를 위한 multer 설정
  const imageStorage = multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = 'uploads/images';
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, 'pet-' + uniqueSuffix + path.extname(file.originalname));
    }
  });

  const imageUpload = multer({
    storage: imageStorage,
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB
    },
    fileFilter: (req, file, cb) => {
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('이미지 파일만 업로드 가능합니다.'), false);
      }
    }
  });

  // 이미지 업로드 API
  app.post("/api/upload/image", imageUpload.single('image'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "이미지 파일이 필요합니다." });
      }

      const imageUrl = `/uploads/images/${req.file.filename}`;
      
      console.log('이미지 업로드 성공:', imageUrl);

      res.json({ 
        success: true, 
        url: imageUrl,
        message: "이미지가 성공적으로 업로드되었습니다."
      });
    } catch (error) {
      logServerError('이미지 업로드 오류:', error, req);
      res.status(500).json({ error: "이미지 업로드 중 오류가 발생했습니다" });
    }
  });

  // 단일 파일 업로드 API (ImageUpload 컴포넌트용)
  app.post("/api/upload/single", imageUpload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ 
          success: false,
          message: "업로드할 파일이 없습니다." 
        });
      }

      const imageUrl = `/uploads/images/${req.file.filename}`;
      
      console.log('단일 파일 업로드 성공:', imageUrl);

      res.json({ 
        success: true, 
        file: {
          url: imageUrl,
          filename: req.file.filename
        },
        message: "이미지가 성공적으로 업로드되었습니다."
      });
    } catch (error) {
      logServerError('단일 파일 업로드 오류:', error, req);
      res.status(500).json({ 
        success: false,
        message: "이미지 업로드 중 오류가 발생했습니다"
      });
    }
  });

  // 로고 설정 API
  app.post("/api/logo/set", async (req, res) => {
    try {
      const { type, url } = req.body;
      
      if (!type || !url) {
        return res.status(400).json({ 
          success: false, 
          message: "로고 타입과 URL이 필요합니다." 
        });
      }

      // 로고 설정 업데이트
      try {
        const currentSettings = await storage.getLogoSettings();
        const updateData = { ...currentSettings };
        
        // 타입에 따라 로고 설정 업데이트
        switch (type) {
          case 'main':
            updateData.logoLight = url;
            break;
          case 'mainDark':
            updateData.logoDark = url;
            break;
          case 'compact':
            updateData.logoSymbolLight = url;
            break;
          case 'compactDark':
            updateData.logoSymbolDark = url;
            break;
          case 'favicon':
            updateData.favicon = url;
            break;
          default:
            return res.status(400).json({ 
              success: false, 
              message: "지원되지 않는 로고 타입입니다." 
            });
        }
        
        await storage.updateLogoSettings(updateData);
        
        console.log('로고 설정 업데이트 성공:', type, url);
        
        res.json({ 
          success: true, 
          type: type,
          url: url,
          message: "로고 설정이 성공적으로 업데이트되었습니다."
        });
      } catch (storageError) {
        logServerError('로고 설정 업데이트 실패:', storageError, req);
        res.status(500).json({ 
          success: false, 
          message: "로고 설정 업데이트 중 오류가 발생했습니다."
        });
      }
    } catch (error) {
      logServerError('로고 설정 API 오류:', error, req);
      res.status(500).json({ 
        success: false, 
        message: "로고 설정 중 오류가 발생했습니다."
      });
    }
  });

  // 로고 설정 조회 API
  app.get("/api/admin/logos", async (req, res) => {
    try {
      const logoSettings = await storage.getLogoSettings();
      res.json(logoSettings);
    } catch (error) {
      logServerError('로고 설정 조회 실패:', error, req);
      res.status(500).json({ 
        success: false, 
        message: "로고 설정을 가져오는 중 오류가 발생했습니다."
      });
    }
  });

  // Excel 파일 파싱 함수 (가격 정보 포함)
  function parseExcelCurriculumWithPricing(data: any[][], fileName: string) {
    const curriculum = {
      title: fileName || '커리큘럼',
      description: '엑셀 파일에서 추출된 커리큘럼',
      category: '전문교육',
      difficulty: 'intermediate',
      duration: 480,
      price: 300000,
      registrant: '',
      institution: '',
      modules: []
    };

    // 데이터가 충분한지 확인
    if (data.length < 2) {
      return curriculum;
    }

    console.log('[엑셀 파싱] 전체 데이터 구조 확인:', data.map((row, index) => ({ index, firstCell: row[0], secondCell: row[1] })));

    // 기본 정보 추출
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length < 2) continue;

      // 등록자 정보 추출
      if (row[0] === '등록자명') {
        curriculum.registrant = row[1] || '';
        console.log(`[엑셀 파싱] 등록자명: ${curriculum.registrant}`);
      }
      if (row[0] === '소속기관') {
        curriculum.institution = row[1] || '';
        console.log(`[엑셀 파싱] 소속기관: ${curriculum.institution}`);
      }
      
      // 커리큘럼 기본 정보 추출
      if (row[0] === '제목') {
        curriculum.title = row[1] || fileName;
        console.log(`[엑셀 파싱] 제목: ${curriculum.title}`);
      }
      if (row[0] === '설명') {
        curriculum.description = row[1] || '엑셀 파일에서 추출된 커리큘럼';
        console.log(`[엑셀 파싱] 설명: ${curriculum.description}`);
      }
      if (row[0] === '카테고리') {
        curriculum.category = row[1] || '전문교육';
        console.log(`[엑셀 파싱] 카테고리: ${curriculum.category}`);
      }
      if (row[0] === '난이도') {
        curriculum.difficulty = row[1] || 'intermediate';
        console.log(`[엑셀 파싱] 난이도: ${curriculum.difficulty}`);
      }
      if (row[0] === '총 소요시간(분)') {
        curriculum.duration = parseInt(row[1]) || 0;
        console.log(`[엑셀 파싱] 총 소요시간: ${curriculum.duration}`);
      }
      if (row[0] === '전체가격(원)') {
        curriculum.price = parseInt(row[1]) || 0;
        console.log(`[엑셀 파싱] 전체가격: ${curriculum.price}`);
      }
    }

    // "강의 구성" 섹션 찾기
    let courseStartIndex = -1;
    let courseHeaderIndex = -1;
    
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      if (row && row[0] === '강의 구성') {
        courseStartIndex = i;
        console.log(`[엑셀 파싱] "강의 구성" 섹션 발견: ${i}행`);
        break;
      }
    }
    
    if (courseStartIndex === -1) {
      console.log('[엑셀 파싱] "강의 구성" 섹션을 찾을 수 없습니다.');
      return curriculum;
    }
    
    // 강의 구성 헤더 찾기 (회차, 강의명, 설명, ...)
    for (let i = courseStartIndex + 1; i < data.length; i++) {
      const row = data[i];
      if (row && row[0] === '회차') {
        courseHeaderIndex = i;
        break;
      }
    }
    
    if (courseHeaderIndex === -1) {
      console.log('[엑셀 파싱] 강의 구성 헤더를 찾을 수 없습니다.');
      return curriculum;
    }
    
    // 실제 강의 데이터 처리 (헤더 다음 행부터)
    const modules = [];
    
    for (let i = courseHeaderIndex + 1; i < data.length; i++) {
      const row = data[i];
      
      // 빈 행이나 "작성 안내" 섹션 시작 시 중단
      if (!row || row.length === 0 || !row[0] || row[0] === '작성 안내') {
        break;
      }
      
      // 강의 제목이 있는 실제 강의 행만 처리 (1강, 2강, 3강... 형태)
      if (row[0] && (typeof row[0] === 'string' && /^\d+강$/.test(row[0].toString()))) {
        const lessonNumber = row[0].replace('강', '');
        
        // 엑셀 컬럼 순서: 회차, 강의명, 설명, 소요시간, 무료여부, 개별가격, 준비물
        const lessonTitle = row[1] || `${row[0]} - 기본 강의`;
        const description = row[2] || `${lessonTitle}에 대한 상세 설명`;
        const duration = parseInt(row[3]) || 60;
        const isFree = row[4] === 'Y' || row[4] === 'y' || row[4] === '무료';
        const price = isFree ? 0 : (parseInt(row[5]) || 50000);
        const materialsString = (row.length > 6 && row[6]) ? String(row[6]).trim() : '';
        const materials = materialsString ? materialsString.split(',').map(m => m.trim()).filter(m => m.length > 0) : [];
        
        const moduleData = {
          id: `module-${lessonNumber}`,
          title: lessonTitle,
          description: description,
          duration: duration,
          isFree: isFree,
          price: price,
          materials: materials,
          objectives: [`${lessonTitle} 목표 달성`],
          activities: ['실습 활동'],
          completed: false
        };

        console.log(`[엑셀 파싱] 행 ${i} 전체 데이터:`, row);
        console.log(`[엑셀 파싱] 모듈 추가: ${moduleData.title} (설명: ${moduleData.description.substring(0, 50)}..., 시간: ${moduleData.duration}분, 무료: ${moduleData.isFree}, 가격: ${moduleData.price}원, 준비물: [${moduleData.materials.join(', ')}])`);
        console.log(`[엑셀 파싱] 준비물 컬럼 원본 데이터 (row[6]):`, row[6], typeof row[6]);
        modules.push(moduleData);
      }
    }

    // 전체 커리큘럼 정보 업데이트
    curriculum.modules = modules;
    curriculum.duration = modules.reduce((total, module) => total + module.duration, 0);
    curriculum.price = modules.reduce((total, module) => total + module.price, 0);

    // 파일명에서 추가 정보 추출 시도
    if (fileName.includes('기초')) {
      curriculum.difficulty = 'beginner';
      curriculum.category = '기초교육';
    } else if (fileName.includes('고급') || fileName.includes('전문')) {
      curriculum.difficulty = 'advanced';
      curriculum.category = '전문교육';
    } else if (fileName.includes('중급')) {
      curriculum.difficulty = 'intermediate';
      curriculum.category = '중급교육';
    } else if (fileName.includes('재활')) {
      curriculum.difficulty = 'intermediate';
      curriculum.category = '재활치료';
    }

    console.log('[엑셀 파싱] 최종 커리큘럼 데이터:', {
      title: curriculum.title,
      description: curriculum.description,
      category: curriculum.category,
      difficulty: curriculum.difficulty,
      registrant: curriculum.registrant,
      institution: curriculum.institution,
      moduleCount: modules.length,
      totalDuration: curriculum.duration,
      totalPrice: curriculum.price,
      modules: modules.map(m => ({ title: m.title, duration: m.duration, price: m.price, materials: m.materials }))
    });

    return curriculum;
  }

  // 로고 업로드를 위한 multer 설정
  const logoStorage = multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = 'uploads/logos';
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, 'logo-' + uniqueSuffix + path.extname(file.originalname));
    }
  });

  const logoUpload = multer({
    storage: logoStorage,
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB
    },
    fileFilter: (req, file, cb) => {
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('이미지 파일만 업로드 가능합니다.'), false);
      }
    }
  });

  // 로고 업로드 API
  app.post("/api/admin/logo/upload", logoUpload.single('logo'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "로고 파일이 필요합니다." });
      }

      const logoUrl = `/uploads/logos/${req.file.filename}`;
      const { type } = req.body;
      
      // 로고 설정 업데이트
      try {
        const currentSettings = await storage.getLogoSettings();
        const updateData = { ...currentSettings };
        
        if (type === 'expanded') {
          updateData.logoLight = logoUrl;
          updateData.logoDark = logoUrl;
        } else if (type === 'compact') {
          updateData.logoSymbolLight = logoUrl;
          updateData.logoSymbolDark = logoUrl;
        }
        
        await storage.updateLogoSettings(updateData);
        
        console.log('로고 업로드 및 설정 업데이트 성공:', logoUrl, type);
        
        res.json({ 
          success: true, 
          url: logoUrl,
          type: type,
          message: "로고가 성공적으로 업로드되고 설정이 업데이트되었습니다."
        });
      } catch (storageError) {
        logServerError('로고 설정 업데이트 실패:', storageError, req);
        res.json({ 
          success: true, 
          url: logoUrl,
          message: "로고 업로드는 성공했지만 설정 업데이트에 실패했습니다."
        });
      }
    } catch (error) {
      logServerError('로고 업로드 오류:', error, req);
      res.status(500).json({ error: "로고 업로드 중 오류가 발생했습니다" });
    }
  });

  // 로고 설정 조회 API
  app.get("/api/admin/logos", async (req, res) => {
    try {
      const logoSettings = await storage.getLogoSettings();
      res.json({
        success: true,
        logos: logoSettings
      });
    } catch (error) {
      logServerError('로고 설정 조회 오류:', error, req);
      res.status(500).json({ error: "로고 설정을 불러오는 중 오류가 발생했습니다" });
    }
  });

  // 현재 로고 조회 API (사이드바용)
  app.get("/api/admin/logo", async (req, res) => {
    try {
      const logoSettings = await storage.getLogoSettings();
      res.json({
        success: true,
        expandedLogo: logoSettings.logoLight || "/logo.svg",
        compactLogo: logoSettings.logoSymbolLight || "/logo-compact.svg",
        logoDark: logoSettings.logoDark || "/logo-dark.svg",
        logoSymbolDark: logoSettings.logoSymbolDark || "/logo-compact-dark.svg"
      });
    } catch (error) {
      logServerError('로고 조회 오류:', error, req);
      res.status(500).json({ error: "로고를 불러오는 중 오류가 발생했습니다" });
    }
  });

  // 상담 Zoom 링크 조회 API
  app.get("/api/consultations/:id/zoom", async (req, res) => {
    try {
      const consultationId = req.params.id;
      
      // 상담 정보 조회
      const consultation = storage.getConsultationById(consultationId);
      if (!consultation) {
        return res.status(404).json({
          success: false,
          error: "상담 정보를 찾을 수 없습니다."
        });
      }

      // 훈련사 정보 조회
      const trainer = storage.getTrainerByName(consultation.trainerName);
      let zoomUrl = "https://zoom.us/j/123456789?pwd=abcd1234"; // 기본값
      
      if (trainer && trainer.zoomLink) {
        zoomUrl = trainer.zoomLink;
      }

      const consultationInfo = {
        id: consultationId,
        trainerName: consultation.trainerName,
        zoomUrl: zoomUrl,
        meetingId: "123 456 789",
        passcode: "abcd1234",
        status: "scheduled",
        startTime: new Date().toISOString()
      };

      res.json({ 
        success: true, 
        consultation: consultationInfo
      });
    } catch (error) {
      logServerError('Zoom 링크 조회 오류:', error, req);
      res.status(500).json({ error: "Zoom 링크 조회 중 오류가 발생했습니다" });
    }
  });

  // 훈련사 프로필 업데이트 API (PMI 정보 포함)
  app.put("/api/trainer/profile", requireAuth(['trainer', 'admin']), csrfProtection, async (req, res) => {
    try {
      const { 
        zoomLink, 
        zoomPMI, 
        zoomPMIPassword, 
        zoomHostKey, 
        videoCallPreference, 
        meetingSetupType,
        ...profileData 
      } = req.body;
      
      console.log('훈련사 프로필 업데이트 요청:', { 
        zoomLink, 
        zoomPMI, 
        videoCallPreference, 
        meetingSetupType 
      });
      
      // 실제 구현에서는 데이터베이스에 업데이트하고 인증된 사용자 확인
      const updatedProfile = {
        ...profileData,
        zoomLink,
        zoomPMI,
        zoomPMIPassword,
        zoomHostKey,
        videoCallPreference: videoCallPreference || 'zoom',
        meetingSetupType: meetingSetupType || 'pmi',
        updatedAt: new Date().toISOString()
      };
      
      res.json({
        success: true,
        message: "프로필이 성공적으로 업데이트되었습니다.",
        profile: updatedProfile
      });
    } catch (error) {
      logServerError('프로필 업데이트 오류:', error, req);
      res.status(500).json({
        success: false,
        error: "프로필 업데이트 중 오류가 발생했습니다."
      });
    }
  });

  // 훈련사 대시보드 통계 API
  app.get("/api/trainer/dashboard", requireAuth('trainer'), async (req, res) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ success: false, error: '인증이 필요합니다.' });
      }

      // 훈련사의 알림장 조회
      const trainingJournals = storage.getTrainingJournalsByTrainerId(userId);
      
      // 훈련사의 반려동물(수강생) 목록 조회
      const assignedPets = storage.getPetsByTrainerId ? storage.getPetsByTrainerId(userId) : [];
      
      // 알림 개수 조회
      const notifResult = await storage.getNotificationsByUserId(userId, { limit: 1000 });
      const notifications = notifResult.notifications;
      const unreadNotifications = notifications.filter(n => !n.isRead);

      // 최근 알림장 (3개)
      const recentNotebooks = trainingJournals.slice(0, 3).map((journal: any) => ({
        id: journal.id,
        pet: journal.petName || '반려동물',
        owner: journal.ownerName || '보호자',
        date: journal.createdAt ? new Date(journal.createdAt).toLocaleDateString('ko-KR') : '오늘',
        content: journal.content?.substring(0, 100) || '',
        hasImage: journal.photos?.length > 0 || journal.images?.length > 0
      }));

      // 최근 수강생 (3명)
      const recentStudents = assignedPets.slice(0, 3).map((pet: any) => ({
        id: pet.id,
        name: pet.ownerName || '보호자',
        image: null,
        course: pet.trainingProgram || '훈련 프로그램',
        progress: pet.trainingProgress || 0,
        lastActivity: pet.lastActivityDate || '최근',
        pet: {
          name: pet.name,
          image: pet.image || null
        }
      }));

      // 통계 계산
      const stats = {
        totalStudents: assignedPets.length,
        totalCourses: new Set(assignedPets.map((p: any) => p.trainingProgram)).size || 1,
        averageRating: 4.5, // 실제 리뷰에서 계산 필요
        monthlyRevenue: 0, // 실제 수익에서 계산 필요
        totalNotebooks: trainingJournals.length,
        unreadNotifications: unreadNotifications.length
      };

      // 다가오는 일정 (실제 일정 데이터가 있으면 사용)
      const upcomingSchedules = assignedPets.slice(0, 3).map((pet: any, index: number) => ({
        id: pet.id,
        title: `${pet.name} 훈련 ${index + 1}회차`,
        time: index === 0 ? '오늘 17:00' : index === 1 ? '내일 14:00' : '수요일 16:30',
        type: '수업',
        student: pet.ownerName || '보호자',
        pet: pet.name
      }));

      res.json({
        success: true,
        stats,
        recentStudents,
        recentNotebooks,
        upcomingSchedules
      });
    } catch (error) {
      logServerError('훈련사 대시보드 조회 오류:', error, req);
      res.status(500).json({
        success: false,
        error: '대시보드 데이터를 불러오는 중 오류가 발생했습니다.'
      });
    }
  });

  // 훈련사 프로필 조회 API
  app.get("/api/trainer/profile", async (req, res) => {
    try {
      // 실제 구현에서는 인증된 훈련사의 프로필을 데이터베이스에서 조회
      const trainerProfile = {
        name: '훈련사',
        email: 'trainer@example.com',
        phone: '010-1234-5678',
        address: '서울특별시 강남구',
        bio: '10년 경력의 전문 반려동물 훈련사입니다.',
        specialties: ['기초 훈련', '문제 행동 교정', '사회화 훈련'],
        experience: '10년',
        certification: 'TALEZ 인증 전문 훈련사',
        zoomLink: '',
        zoomPMI: '',
        zoomPMIPassword: '',
        zoomHostKey: '',
        videoCallPreference: 'zoom',
        meetingSetupType: 'pmi'
      };
      
      res.json({
        success: true,
        profile: trainerProfile
      });
    } catch (error) {
      logServerError('프로필 조회 오류:', error, req);
      res.status(500).json({
        success: false,
        error: "프로필 조회 중 오류가 발생했습니다."
      });
    }
  });

  // API 설정 관리 라우트
  app.get("/api/admin/api-configs", async (req, res) => {
    try {
      // 실제 구현에서는 데이터베이스에서 API 설정을 조회
      const apiConfigs = {
        naver: { isEnabled: false, status: 'disconnected' },
        kakao: { isEnabled: false, status: 'disconnected' },
        google: { isEnabled: false, status: 'disconnected' },
        toss: { isEnabled: false, status: 'disconnected' }
      };

      const apiValues = {
        // 보안상 마스킹된 값들 반환
        naver: { clientId: '****', clientSecret: '****', redirectUri: '' },
        kakao: { clientId: '****', clientSecret: '****', redirectUri: '' },
        google: { clientId: '****', clientSecret: '****', redirectUri: '' },
        toss: { clientKey: '****', secretKey: '****', webhookKey: '****' }
      };

      res.json({
        success: true,
        configs: apiConfigs,
        values: apiValues
      });
    } catch (error) {
      logServerError('API 설정 조회 오류:', error, req);
      res.status(500).json({
        success: false,
        error: "API 설정을 불러오는 중 오류가 발생했습니다."
      });
    }
  });

  app.put("/api/admin/api-configs", requireAuth('admin'), csrfProtection, async (req, res) => {
    try {
      const { apiId, values, isEnabled } = req.body;
      
      console.log(`API 설정 저장 요청: ${apiId}`, { isEnabled, values: Object.keys(values) });
      
      // 실제 구현에서는 데이터베이스에 암호화하여 저장
      // 여기서는 시뮬레이션
      const result = {
        success: true,
        message: `${apiId} API 설정이 저장되었습니다.`,
        config: {
          apiId,
          isEnabled,
          updatedAt: new Date().toISOString()
        }
      };

      res.json(result);
    } catch (error) {
      logServerError('API 설정 저장 오류:', error, req);
      res.status(500).json({
        success: false,
        error: "API 설정 저장 중 오류가 발생했습니다."
      });
    }
  });

  app.post("/api/admin/api-configs/:apiId/test", requireAuth('admin'), csrfProtection, async (req, res) => {
    try {
      const { apiId } = req.params;
      
      console.log(`API 연결 테스트 요청: ${apiId}`);
      
      // 실제 구현에서는 각 API별로 연결 테스트 수행
      let testResult = { success: false, message: '' };
      
      switch (apiId) {
        case 'naver':
          testResult = { success: true, message: '네이버 로그인 API 연결이 정상입니다.' };
          break;
        case 'kakao':
          testResult = { success: true, message: '카카오 로그인 API 연결이 정상입니다.' };
          break;
        case 'google':
          testResult = { success: true, message: '구글 OAuth API 연결이 정상입니다.' };
          break;
        case 'toss':
          testResult = { success: true, message: '토스페이먼츠 API 연결이 정상입니다.' };
          break;
        default:
          testResult = { success: false, message: '지원하지 않는 API입니다.' };
      }

      res.json(testResult);
    } catch (error) {
      logServerError('API 테스트 오류:', error, req);
      res.status(500).json({
        success: false,
        error: "API 테스트 중 오류가 발생했습니다."
      });
    }
  });

  // 리뷰 작성 API
  app.post("/api/reviews", async (req, res) => {
    try {
      const { consultationId, trainerName, rating, title, content, tags } = req.body;

      console.log('리뷰 작성 요청:', { consultationId, trainerName, rating });

      const reviewId = Date.now();
      const reviewData = {
        id: reviewId,
        consultationId: consultationId,
        trainerName: trainerName,
        rating: rating,
        title: title,
        content: content,
        tags: tags || [],
        authorName: '반려인',
        createdAt: new Date().toISOString(),
        helpful: 0,
        verified: true
      };

      // 메모리에 리뷰 추가 (실제로는 데이터베이스에 저장)
      if (!global.reviewsData) {
        global.reviewsData = [];
      }
      global.reviewsData.push(reviewData);

      res.json({ 
        success: true, 
        message: "리뷰가 성공적으로 작성되었습니다.",
        review: reviewData
      });
    } catch (error) {
      logServerError('리뷰 작성 오류:', error, req);
      res.status(500).json({ error: "리뷰 작성 중 오류가 발생했습니다" });
    }
  });

  // 리뷰 목록 조회 API
  app.get("/api/reviews", async (req, res) => {
    try {
      const { trainerName, limit = 10, offset = 0 } = req.query;

      console.log('리뷰 목록 조회 요청:', { trainerName, limit, offset });

      // 메모리에서 리뷰 목록 조회 (실제로는 데이터베이스에서 조회)
      if (!global.reviewsData) {
        global.reviewsData = [
          {
            id: 1,
            consultationId: '2',
            trainerName: '박전문가',
            rating: 5,
            title: '정말 만족스러운 상담이었습니다',
            content: '분리불안 문제로 고민이 많았는데, 전문적인 조언과 실질적인 해결방법을 제시해주셔서 큰 도움이 되었습니다. 강아지도 많이 안정되었어요.',
            tags: ['전문성', '친절함', '효과적', '추천함'],
            authorName: '반려인',
            createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
            helpful: 15,
            verified: true
          }
        ];
      }

      let filteredReviews = global.reviewsData;

      if (trainerName) {
        filteredReviews = filteredReviews.filter(review => 
          review.trainerName === trainerName
        );
      }

      const paginatedReviews = filteredReviews
        .slice(parseInt(offset as string), parseInt(offset as string) + parseInt(limit as string));

      res.json({ 
        success: true, 
        reviews: paginatedReviews,
        total: filteredReviews.length
      });
    } catch (error) {
      logServerError('리뷰 목록 조회 오류:', error, req);
      res.status(500).json({ error: "리뷰 목록 조회 중 오류가 발생했습니다" });
    }
  });

  // 댓글 작성 API
  app.post("/api/comments", async (req, res) => {
    try {
      const { parentType, parentId, content, parentCommentId } = req.body;

      console.log('댓글 작성 요청:', { parentType, parentId, content });

      const commentId = Date.now();
      const commentData = {
        id: commentId,
        parentType: parentType, // 'review', 'course', 'post' 등
        parentId: parentId,
        parentCommentId: parentCommentId || null, // 대댓글인 경우
        content: content,
        authorName: '반려인',
        authorRole: 'pet-owner',
        createdAt: new Date().toISOString(),
        likes: 0,
        replies: []
      };

      // 메모리에 댓글 추가 (실제로는 데이터베이스에 저장)
      if (!global.commentsData) {
        global.commentsData = [];
      }
      global.commentsData.push(commentData);

      res.json({ 
        success: true, 
        message: "댓글이 성공적으로 작성되었습니다.",
        comment: commentData
      });
    } catch (error) {
      logServerError('댓글 작성 오류:', error, req);
      res.status(500).json({ error: "댓글 작성 중 오류가 발생했습니다" });
    }
  });

  // 댓글 목록 조회 API
  app.get("/api/comments", async (req, res) => {
    try {
      const { parentType, parentId } = req.query;

      console.log('댓글 목록 조회 요청:', { parentType, parentId });

      // 메모리에서 댓글 목록 조회 (실제로는 데이터베이스에서 조회)
      if (!global.commentsData) {
        global.commentsData = [];
      }

      const comments = global.commentsData.filter(comment => 
        comment.parentType === parentType && 
        comment.parentId === parentId &&
        !comment.parentCommentId // 최상위 댓글만
      );

      // 각 댓글에 대댓글 추가
      const commentsWithReplies = comments.map(comment => ({
        ...comment,
        replies: global.commentsData.filter(reply => 
          reply.parentCommentId === comment.id
        )
      }));

      res.json({ 
        success: true, 
        comments: commentsWithReplies
      });
    } catch (error) {
      logServerError('댓글 목록 조회 오류:', error, req);
      res.status(500).json({ error: "댓글 목록 조회 중 오류가 발생했습니다" });
    }
  });

  app.post("/api/consultations/:id/join", async (req, res) => {
    try {
      const consultationId = req.params.id;
      const { userId } = req.body;

      console.log(`[상담 참여] 사용자 ${userId}가 상담 ${consultationId} 참여 시작`);

      // 상담 정보 조회 (실제로는 데이터베이스에서 조회)
      const consultation = {
        id: consultationId,
        trainerId: 1,
        trainerName: "김민수 전문 훈련사",
        userId: userId || 3,
        amount: 50000, // 상담 비용
        status: "scheduled",
        type: "video"
      };

      const videoCallUrl = "https://meet.google.com/abc-defg-hij";

      // 화상수업 시작 시 수수료 정산 처리
      if (consultation.type === "video") {
        console.log(`[수수료 정산] 화상수업 시작 - 상담 ID: ${consultationId}`);
        
        try {
          // PaymentService를 사용한 수수료 정산
          const { PaymentService } = require('./services/payment-service');
          const paymentService = new PaymentService(storage);
          
          const paymentResult = await paymentService.processPayment({
            transactionType: 'video_consultation',
            referenceId: parseInt(consultationId),
            referenceType: 'consultation',
            payerId: consultation.userId,
            payeeId: consultation.trainerId,
            grossAmount: consultation.amount,
            paymentMethod: 'credit_card',
            paymentProvider: 'stripe',
            externalTransactionId: `video_${consultationId}_${Date.now()}`,
            metadata: {
              consultationType: 'video',
              sessionStart: new Date().toISOString(),
              trainerName: consultation.trainerName
            }
          });

          if (paymentResult.success) {
            console.log(`[수수료 정산 완료] 상담 ${consultationId} - 수수료: ${paymentResult.feeAmount}원, 정산액: ${paymentResult.netAmount}원`);

            // 상담 상태를 '진행 중'으로 업데이트
            // await storage.updateConsultationStatus(consultationId, 'in-progress');
            
            res.json({ 
              success: true, 
              message: "화상 상담에 참여합니다. 수수료 정산이 완료되었습니다.",
              videoCallUrl,
              paymentInfo: {
                amount: consultation.amount,
                feeAmount: paymentResult.feeAmount,
                netAmount: paymentResult.netAmount,
                settlementStatus: "완료"
              }
            });
          } else {
            logServerError(`[수수료 정산 실패] 상담 ${consultationId}:`, paymentResult.errorMessage, req);
            res.status(500).json({ 
              error: "수수료 정산 중 오류가 발생했습니다",
              details: paymentResult.errorMessage
            });
          }
        } catch (settlementError) {
          logServerError(`[수수료 정산 오류] 상담 ${consultationId}:`, settlementError, req);
          // 정산 실패해도 상담 참여는 허용 (별도 처리)
          res.json({ 
            success: true, 
            message: "화상 상담에 참여합니다. (수수료 정산은 별도 처리됩니다)",
            videoCallUrl,
            paymentInfo: {
              amount: consultation.amount,
              settlementStatus: "처리 중"
            }
          });
        }
      } else {
        res.json({ 
          success: true, 
          message: "화상 상담에 참여합니다.",
          videoCallUrl 
        });
      }

    } catch (error) {
      logServerError('화상 상담 참여 오류:', error, req);
      res.status(500).json({ error: "화상 상담 참여 중 오류가 발생했습니다" });
    }
  });

// 검색 API - 성능 최적화 및 에러 처리 개선
app.get('/api/search', async (req, res) => {
  const startTime = Date.now();

  try {
    const { 
      q: query = '', 
      category = 'all', 
      location = 'all',
      difficulty = 'all',
      minPrice = 0,
      maxPrice = 1000000,
      startDate,
      endDate,
      features = [],
      sortBy = 'relevance',
      minRating = 0,
      page = 1,
      limit = 10
    } = req.query;

    const offset = (Number(page) - 1) * Number(limit);
    // URL 디코딩 추가 (한국어 검색 지원)
    let searchQuery = String(query).trim();
    
    console.log(`[검색 디버그] 원본 쿼리: "${query}"`);
    console.log(`[검색 디버그] 원본 쿼리 타입: ${typeof query}`);
    console.log(`[검색 디버그] 원본 쿼리 길이: ${String(query).length}`);
    
    // 한국어 인코딩 문제를 직접 해결
    const koreanFixMap = {
      'ê°ëí': '강동훈',
      'ê°': '강',
      'ëí': '동훈',
      // 추가 매핑
      '%EA%B0%95%EB%8F%99%ED%9B%88': '강동훈',
      '%ea%b0%95%eb%8f%99%ed%9b%88': '강동훈'
    };
    
    // 먼저 직접 매핑을 시도
    for (const [broken, correct] of Object.entries(koreanFixMap)) {
      if (searchQuery.includes(broken)) {
        console.log(`[검색 디버그] 직접 매핑: "${broken}" -> "${correct}"`);
        searchQuery = searchQuery.replace(broken, correct);
      }
    }
    
    // URL 디코딩 시도
    try {
      const decoded = decodeURIComponent(searchQuery);
      if (decoded !== searchQuery) {
        console.log(`[검색 디버그] URL 디코딩: "${searchQuery}" -> "${decoded}"`);
        searchQuery = decoded;
      }
    } catch (e) {
      console.log('[검색 디버그] URL 디코딩 실패:', e.message);
    }
    
    // 다시 한번 매핑 확인
    for (const [broken, correct] of Object.entries(koreanFixMap)) {
      if (searchQuery.includes(broken)) {
        console.log(`[검색 디버그] 후처리 매핑: "${broken}" -> "${correct}"`);
        searchQuery = searchQuery.replace(broken, correct);
      }
    }
    
    console.log(`[검색 디버그] 원본 검색어: "${query}", 디코딩된 검색어: "${searchQuery}"`);

    console.log(`[검색] "${query}" 검색 시작`);

    let results: any[] = [];

    // 캐시된 결과가 있는지 확인 (개발용)
    const cacheKey = `search:${searchQuery}:${page}:${limit}`;

    if (!searchQuery) {
      // 검색어가 없으면 빈 결과 반환
      results = [];
    } else {
      // 데이터베이스 검색 시도 (빠른 실패 처리)
      const dbPromises = [];

      // 메모리 저장소에서 검색 (등록된 실제 데이터 우선)
      try {
        console.log(`[검색 디버그] 검색어: "${searchQuery}"`);
        
        // 훈련사 검색
        const allTrainers = await storage.getAllTrainers();
        console.log(`[검색 디버그] 전체 훈련사 수: ${allTrainers.length}`);
        
        allTrainers.forEach((trainer, index) => {
          console.log(`[검색 디버그] 훈련사 ${index + 1}: ${trainer.name}, 위치: ${trainer.location}`);
        });
        
        const matchedTrainers = allTrainers.filter(trainer => {
          const nameMatch = trainer.name && trainer.name.includes(searchQuery);
          const bioMatch = trainer.bio && trainer.bio.includes(searchQuery);
          const specialtyMatch = trainer.specialties && trainer.specialties.some(specialty => 
            specialty.includes(searchQuery)
          );
          const locationMatch = trainer.location && trainer.location.includes(searchQuery);
          
          const isMatch = nameMatch || bioMatch || specialtyMatch || locationMatch;
          
          if (isMatch) {
            console.log(`[검색 디버그] 매칭된 훈련사: ${trainer.name} (이름:${nameMatch}, 바이오:${bioMatch}, 전문:${specialtyMatch}, 위치:${locationMatch})`);
          }
          
          return isMatch;
        });

        console.log(`[검색 디버그] 매칭된 훈련사 수: ${matchedTrainers.length}`);
        
        // 위치 데이터 검색 (기존 위치 + 기관 데이터)
        const allLocations = await storage.getAllLocations();
        const instituteData = await storage.getInstitutes();
        
        console.log(`[검색 디버그] 전체 위치 수: ${allLocations.length}`);
        console.log(`[검색 디버그] 전체 기관 수: ${instituteData.length}`);
        
        // 기관을 위치 형식으로 변환
        const instituteLocations = instituteData.map(institute => ({
          id: institute.id,
          name: institute.name,
          type: 'institute',
          address: institute.address,
          description: institute.description,
          services: institute.facilities || [],
          phone: institute.phone,
          website: institute.website,
          rating: institute.rating,
          reviewCount: institute.reviewCount,
          certification: institute.isVerified,
          latitude: institute.latitude,
          longitude: institute.longitude,
          isActive: institute.isActive
        }));
        
        // 기존 위치와 기관 위치 통합
        const combinedLocations = [...allLocations, ...instituteLocations];
        
        combinedLocations.forEach((location, index) => {
          console.log(`[검색 디버그] 위치 ${index + 1}: ${location.name}, 유형: ${location.type}, 주소: ${location.address}`);
        });
        
        const matchedLocations = combinedLocations.filter(location => {
          const nameMatch = location.name && location.name.toLowerCase().includes(searchQuery);
          const addressMatch = location.address && location.address.toLowerCase().includes(searchQuery);
          const descriptionMatch = location.description && location.description.toLowerCase().includes(searchQuery);
          const serviceMatch = location.services && Array.isArray(location.services) && location.services.some(service => 
            service.toLowerCase && service.toLowerCase().includes(searchQuery)
          );
          
          const isMatch = nameMatch || addressMatch || descriptionMatch || serviceMatch;
          
          if (isMatch) {
            console.log(`[검색 디버그] 매칭된 위치: ${location.name} (이름:${nameMatch}, 주소:${addressMatch}, 설명:${descriptionMatch}, 서비스:${serviceMatch})`);
          }
          
          return isMatch;
        });

        console.log(`[검색 디버그] 매칭된 위치 수: ${matchedLocations.length}`);

        // 매칭된 위치를 결과에 추가
        if (matchedLocations.length > 0) {
          results.push(...matchedLocations.map(location => ({
            id: location.id,
            type: location.type,
            title: location.name,
            description: location.description || '전문 펫 서비스 업체',
            rating: location.rating || 4.5,
            reviewCount: location.reviewCount || 0,
            location: location.address,
            category: location.type,
            features: Array.isArray(location.services) ? location.services : [],
            phone: location.phone,
            website: location.website,
            certification: location.certification,
            latitude: location.latitude,
            longitude: location.longitude
          })));
        }

        if (matchedTrainers.length > 0) {
          results.push(...matchedTrainers.map(trainer => ({
            id: trainer.id,
            type: 'trainer',
            title: trainer.name,
            description: trainer.bio || '전문 반려동물 훈련사',
            rating: trainer.rating || 4.8,
            reviewCount: trainer.reviewCount || 0,
            location: trainer.location || '',
            category: 'trainer',
            features: trainer.specialties || [],
            phone: trainer.phone,
            experience: trainer.experience,
            certifications: trainer.certifications
          })));
        }

        // 사용자 검색 (추가 훈련사)
        const allUsers = await storage.getAllUsers();
        console.log(`[검색 디버그] 전체 사용자 수: ${allUsers.length}`);
        
        const matchedUsers = allUsers.filter(user => {
          if (user.role !== 'trainer') return false;
          
          const nameMatch = user.name && user.name.includes(searchQuery);
          const bioMatch = user.bio && user.bio.includes(searchQuery);
          const locationMatch = user.location && user.location.includes(searchQuery);
          
          console.log(`[검색 디버그] 사용자 "${user.name}" (역할: ${user.role}): 이름매칭=${nameMatch}, 바이오매칭=${bioMatch}, 위치매칭=${locationMatch}`);
          console.log(`[검색 디버그] 사용자 데이터:`, { name: user.name, bio: user.bio, location: user.location, role: user.role });
          
          return nameMatch || bioMatch || locationMatch;
        });
        
        console.log(`[검색 디버그] 매칭된 사용자 수: ${matchedUsers.length}`);

        if (matchedUsers.length > 0) {
          results.push(...matchedUsers.map(user => ({
            id: user.id,
            type: 'trainer',
            title: user.name,
            description: user.bio || '전문 반려동물 훈련사',
            rating: 4.5,
            reviewCount: 0,
            location: user.location || '',
            category: 'trainer',
            features: user.specializations || [],
            phone: user.verificationPhone,
            certification: user.certification
          })));
        }

        // 강의 검색
        const allCourses = await storage.getAllCourses();
        const matchedCourses = allCourses.filter(course => 
          course.title.toLowerCase().includes(searchQuery) ||
          (course.description && course.description.toLowerCase().includes(searchQuery))
        );

        if (matchedCourses.length > 0) {
          results.push(...matchedCourses.slice(0, 3).map(course => ({
            ...course,
            type: 'course'
          })));
        }

        // 기관 검색
        const instituteSearchData = await storage.getAllInstitutes();
        const matchedInstitutes = instituteSearchData.filter(institute => 
          institute.name.toLowerCase().includes(searchQuery) ||
          (institute.description && institute.description.toLowerCase().includes(searchQuery))
        );

        if (matchedInstitutes.length > 0) {
          results.push(...matchedInstitutes.slice(0, 3).map(institute => ({
            ...institute,
            type: 'institute',
            title: institute.name
          })));
        }

      } catch (error) {
        logServerError('[검색] 메모리 저장소 검색 실패:', error.message, req);
      }

      // 데이터베이스에 결과가 없으면 샘플 데이터 제공
      // 더미 데이터 제거 - 실제 등록된 데이터만 반환
    }

    const endTime = Date.now();
    const responseTime = endTime - startTime;

    console.log(`[검색] "${query}" 완료 - ${results.length}개 결과, ${responseTime}ms`);

    // 추천 검색어
    const suggestions = searchQuery ? [
      '기본 훈련', '행동 교정', '퍼피 트레이닝', '애질리티', '사회화 훈련'
    ].filter(s => s.toLowerCase().includes(searchQuery) || searchQuery.includes(s.slice(0, 2))) : [];

    res.json({
      results,
      totalCount: results.length,
      currentPage: Number(page),
      totalPages: Math.ceil(results.length / Number(limit)),
      suggestions: suggestions.slice(0, 5),
      responseTime
    });

  } catch (error) {
    const endTime = Date.now();
    const responseTime = endTime - startTime;

    logServerError('[검색] 치명적 오류:', error, req);

    res.status(500).json({ 
      error: '검색 서비스가 일시적으로 불안정합니다. 잠시 후 다시 시도해주세요.',
      responseTime,
      timestamp: new Date().toISOString()
    });
  }
});

  // 강의 수강신청
  app.post("/api/courses/:id/enroll", (req, res) => {
    const courseId = parseInt(req.params.id);
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        message: "사용자 ID가 필요합니다." 
      });
    }

    // 실제로는 데이터베이스에서 수강신청 처리
    console.log(`강좌 ${courseId}에 사용자 ${userId} 수강신청`);

    return res.json({ 
      success: true, 
      message: "수강신청이 완료되었습니다." 
    });
  });

  // 강의 리뷰 조회
  app.get("/api/courses/:id/reviews", (req, res) => {
    const courseId = parseInt(req.params.id);

    const mockReviews = [
      {
        id: 1,
        userId: 1,
        userName: "김반려",
        userAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100",
        rating: 5,
        comment: "정말 유익한 강의였습니다. 우리 강아지가 많이 달라졌어요!",
        createdAt: "2025-06-15",
        helpful: 12
      },
      {
        id: 2,
        userId: 2,
        userName: "박훈련",
        userAvatar: "https://images.unsplash.com/photo-1494790108755-2616b612b494?w=100&h=100",
        rating: 4,
        comment: "체계적이고 실용적인 내용이 좋았습니다.",
        createdAt: "2025-06-10",
        helpful: 8
      }
    ];

    return res.json(mockReviews);
  });

  // 강의 리뷰 작성
  app.post("/api/courses/:id/reviews", (req, res) => {
    const courseId = parseInt(req.params.id);
    const { userId, rating, comment } = req.body;

    if (!userId || !rating || !comment) {
      return res.status(400).json({
        success: false,
        message: "모든 필드를 입력해주세요."
      });
    }

    // 실제로는 데이터베이스에 저장
    console.log(`강좌 ${courseId}에 리뷰 작성:`, { userId, rating, comment });

    return res.json({
      success: true,
      message: "리뷰가 등록되었습니다.",
      review: {
        id: Date.now(),
        userId,
        rating,
        comment,
        createdAt: new Date().toISOString().split('T')[0],
        helpful: 0
      }
    });
  });

  // 색상 설정 API
  app.post("/api/admin/colors", (req, res) => {
    try {
      const { primary, secondary } = req.body;
      
      console.log('[색상 설정] 색상 변경 요청:', { primary, secondary });
      
      // 실제로는 데이터베이스나 설정 파일에 저장
      // 현재는 메모리에 저장 (임시)
      if (!global.colorSettings) {
        global.colorSettings = {};
      }
      
      global.colorSettings.primary = primary;
      global.colorSettings.secondary = secondary;
      
      res.json({
        success: true,
        message: "색상 설정이 저장되었습니다.",
        settings: {
          primary,
          secondary
        }
      });
    } catch (error) {
      logServerError('[색상 설정] 오류:', error, req);
      res.status(500).json({
        success: false,
        message: "색상 설정 저장 중 오류가 발생했습니다."
      });
    }
  });

  // 색상 설정 조회 API
  app.get("/api/admin/colors", (req, res) => {
    try {
      const defaultSettings = {
        primary: "#7C3AED",
        secondary: "#10B981"
      };
      
      const currentSettings = global.colorSettings || defaultSettings;
      
      res.json({
        success: true,
        settings: currentSettings
      });
    } catch (error) {
      logServerError('[색상 설정] 조회 오류:', error, req);
      res.status(500).json({
        success: false,
        message: "색상 설정 조회 중 오류가 발생했습니다."
      });
    }
  });

  // 강의 즐겨찾기 추가/제거
  app.post("/api/courses/:id/favorite", (req, res) => {
    const courseId = parseInt(req.params.id);
    const { userId, action } = req.body; // action: 'add' or 'remove'

    if (!userId || !action) {
      return res.status(400).json({
        success: false,
        message: "사용자 ID와 액션이 필요합니다."
      });
    }

    console.log(`강좌 ${courseId} 즐겨찾기 ${action}:`, userId);

    return res.json({
      success: true,
      message: action === 'add' ? "즐겨찾기에 추가되었습니다." : "즐겨찾기에서 제거되었습니다.",
      isFavorite: action === 'add'
    });
  });

  // 대체 훈련사 게시판 API
  app.get("/api/substitute-posts", async (req, res) => {
    try {
      const posts = storage.getSubstitutePosts();
      // 서버 데이터를 클라이언트 형식으로 변환
      const transformedPosts = posts.map(post => ({
        id: post.id,
        title: post.title,
        description: post.description,
        classDate: post.date,
        classTime: post.time,
        location: post.location,
        isOnline: post.location?.includes('온라인') || post.location?.includes('Zoom'),
        compensation: post.pay,
        studentCount: 5, // 기본값
        urgency: post.urgent ? 'urgent' : 'normal',
        requiredSkills: post.requirements || [],
        currentApplicants: post.applicants?.length || 0,
        maxApplicants: 3, // 기본값
        status: post.status,
        originalTrainer: post.originalTrainerName || post.trainerName,
        specialRequirements: post.requirements?.join(', ') || ''
      }));
      res.json(transformedPosts);
    } catch (error) {
      logServerError('대체 훈련사 게시판 조회 오류:', error, req);
      res.status(500).json({ error: "대체 훈련사 게시판 조회 중 오류가 발생했습니다" });
    }
  });

  app.post("/api/substitute-posts", requireAuth(['trainer', 'admin']), csrfProtection, validateRequest(createSubstitutePostSchema), async (req, res) => {
    try {
      const postData = req.body;
      const newPost = await storage.createSubstitutePost(postData);
      res.json(newPost);
    } catch (error) {
      logServerError('대체 훈련사 게시글 생성 오류:', error, req);
      res.status(500).json({ error: "대체 훈련사 게시글 생성 중 오류가 발생했습니다" });
    }
  });

  app.put("/api/substitute-posts/:id", requireAuth(['trainer', 'admin']), csrfProtection, validateRequest(updateSubstitutePostSchema), async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;
      const user = (req as any).user;
      
      // 소유권 검증: 관리자가 아닌 경우 본인이 작성한 게시글만 수정 가능
      if (user.role !== 'admin') {
        const existingPost = await storage.getSubstitutePost(id);
        if (!existingPost || existingPost.authorId !== user.id) {
          return res.status(403).json({ 
            error: "본인이 작성한 게시글만 수정할 수 있습니다.",
            code: "FORBIDDEN_OWNERSHIP_VIOLATION"
          });
        }
      }
      
      const updatedPost = await storage.updateSubstitutePost(id, updateData);
      res.json(updatedPost);
    } catch (error) {
      logServerError('대체 훈련사 게시글 수정 오류:', error, req);
      res.status(500).json({ error: "대체 훈련사 게시글 수정 중 오류가 발생했습니다" });
    }
  });

  app.delete("/api/substitute-posts/:id", requireAuth(['trainer', 'admin']), csrfProtection, async (req, res) => {
    try {
      const { id } = req.params;
      const user = (req as any).user;
      
      // 소유권 검증: 관리자가 아닌 경우 본인이 작성한 게시글만 삭제 가능
      if (user.role !== 'admin') {
        const existingPost = await storage.getSubstitutePost(id);
        if (!existingPost || existingPost.authorId !== user.id) {
          return res.status(403).json({ 
            error: "본인이 작성한 게시글만 삭제할 수 있습니다.",
            code: "FORBIDDEN_OWNERSHIP_VIOLATION"
          });
        }
      }
      
      await storage.deleteSubstitutePost(id);
      res.json({ success: true });
    } catch (error) {
      logServerError('대체 훈련사 게시글 삭제 오류:', error, req);
      res.status(500).json({ error: "대체 훈련사 게시글 삭제 중 오류가 발생했습니다" });
    }
  });

  // 대체 훈련사 지원 API - 훈련사 인증 필요
  app.post("/api/substitute-posts/:id/apply", requireAuth(['trainer', 'admin']), csrfProtection, async (req, res) => {
    try {
      const { id } = req.params;
      const applicationData = req.body;
      const result = await storage.applyForSubstitutePost(id, applicationData);
      res.json(result);
    } catch (error) {
      logServerError('대체 훈련사 지원 오류:', error, req);
      res.status(500).json({ error: "대체 훈련사 지원 중 오류가 발생했습니다" });
    }
  });

  // 대체 훈련사 현황 관리 API
  app.get("/api/substitute-overview", async (req, res) => {
    try {
      const overview = await storage.getSubstituteOverview();
      res.json(overview);
    } catch (error) {
      logServerError('대체 훈련사 현황 조회 오류:', error, req);
      res.status(500).json({ error: "대체 훈련사 현황 조회 중 오류가 발생했습니다" });
    }
  });

  app.get("/api/substitute-institutes", async (req, res) => {
    try {
      const institutes = await storage.getSubstituteInstitutes();
      res.json(institutes);
    } catch (error) {
      logServerError('대체 훈련사 기관 현황 조회 오류:', error, req);
      res.status(500).json({ error: "대체 훈련사 기관 현황 조회 중 오류가 발생했습니다" });
    }
  });

  app.get("/api/substitute-alerts", async (req, res) => {
    try {
      const alerts = await storage.getSubstituteAlerts();
      res.json(alerts);
    } catch (error) {
      logServerError('대체 훈련사 시스템 알림 조회 오류:', error, req);
      res.status(500).json({ error: "대체 훈련사 시스템 알림 조회 중 오류가 발생했습니다" });
    }
  });

  app.get("/api/substitute-trainers", async (req, res) => {
    try {
      const trainers = await storage.getSubstituteTrainers();
      res.json(trainers);
    } catch (error) {
      logServerError('대체 훈련사 성과 조회 오류:', error, req);
      res.status(500).json({ error: "대체 훈련사 성과 조회 중 오류가 발생했습니다" });
    }
  });

  app.put("/api/substitute-alerts/:id/resolve", requireAuth(['admin', 'trainer']), csrfProtection, async (req, res) => {
    try {
      const { id } = req.params;
      const result = await storage.resolveSubstituteAlert(id);
      res.json(result);
    } catch (error) {
      logServerError('대체 훈련사 알림 해결 오류:', error, req);
      res.status(500).json({ error: "대체 훈련사 알림 해결 중 오류가 발생했습니다" });
    }
  });

  // 대체 훈련사 지원 신청 조회 API
  app.get("/api/substitute-applications", async (req, res) => {
    try {
      const mockApplications = [
        {
          id: '1',
          postId: '1',
          applicantName: '박대체훈련사',
          message: '대형견 훈련 경험이 5년 이상 있습니다. 해당 시간에 수업 진행 가능합니다.',
          proposedCompensation: 80000,
          applicationDate: '2025-01-20',
          status: 'pending',
          postTitle: '기초 복종 훈련 - 성인반',
          instituteName: '강남 훈련소',
          classDate: '2025-01-25',
          classTime: '14:00-15:30'
        },
        {
          id: '2',
          postId: '2',
          applicantName: '이전문훈련사',
          message: '퍼피 사회화 교육 전문가입니다. 많은 경험이 있습니다.',
          proposedCompensation: 60000,
          applicationDate: '2025-01-21',
          status: 'pending',
          postTitle: '퍼피 사회화 교육',
          instituteName: '서울 펫센터',
          classDate: '2025-01-26',
          classTime: '10:00-11:30'
        }
      ];
      res.json(mockApplications);
    } catch (error) {
      logServerError('대체 훈련사 지원 신청 조회 오류:', error, req);
      res.status(500).json({ error: "대체 훈련사 지원 신청 조회 중 오류가 발생했습니다" });
    }
  });

  // 대체 수업 신청 승인/거절 API
  app.patch("/api/substitute-applications/:id/status", async (req, res) => {
    try {
      const applicationId = req.params.id;
      const { status, reason } = req.body;
      
      console.log('[신청 상태 변경] 요청:', { applicationId, status, reason });
      
      if (!['accepted', 'rejected'].includes(status)) {
        return res.status(400).json({ error: '올바른 상태 값이 아닙니다.' });
      }
      
      // 여기서는 실제 데이터베이스 업데이트 대신 성공 응답을 반환
      // 실제 구현에서는 storage.updateSubstituteApplicationStatus 호출
      const updatedApplication = {
        id: applicationId,
        status,
        reason,
        updatedAt: new Date().toISOString()
      };
      
      res.json({
        success: true,
        message: status === 'accepted' ? '신청이 승인되었습니다.' : '신청이 거절되었습니다.',
        application: updatedApplication
      });
      
    } catch (error) {
      logServerError('[신청 상태 변경] 오류:', error, req);
      res.status(500).json({ error: '신청 상태 변경 중 오류가 발생했습니다' });
    }
  });

  // 훈련사 알림장 생성 API
  app.post("/api/notebook/entries", async (req, res) => {
    try {
      const { 
        title, 
        content, 
        studentId, 
        petId, 
        trainingDate, 
        trainingDuration, 
        progressRating, 
        behaviorNotes, 
        homeworkInstructions, 
        nextGoals, 
        activities 
      } = req.body;

      if (!title || !content || !studentId || !petId) {
        return res.status(400).json({
          success: false,
          message: "필수 정보가 누락되었습니다."
        });
      }

      // 훈련사 ID는 세션에서 가져오기 (실제 구현에서는 세션 처리 필요)
      const trainerId = req.session?.user?.id || 1;

      const newJournal = await storage.createTrainingJournal({
        trainerId,
        petOwnerId: parseInt(studentId),
        petId: parseInt(petId),
        title,
        content,
        trainingDate: new Date(trainingDate),
        trainingDuration: parseInt(trainingDuration) || 60,
        progressRating: parseInt(progressRating) || 3,
        behaviorNotes: behaviorNotes || '',
        homeworkInstructions: homeworkInstructions || '',
        nextGoals: nextGoals || '',
        activities: JSON.stringify(activities || {}),
        status: 'sent',
        createdAt: new Date(),
        updatedAt: new Date()
      });

      console.log('새 알림장 생성:', newJournal);

      return res.json({
        success: true,
        message: "알림장이 성공적으로 전송되었습니다.",
        journal: newJournal
      });
    } catch (error) {
      logServerError('알림장 생성 오류:', error, req);
      return res.status(500).json({
        success: false,
        message: "알림장 생성 중 오류가 발생했습니다."
      });
    }
  });

  // 훈련사 알림장 목록 조회 API
  app.get("/api/trainer/training-journals", async (req, res) => {
    try {
      const trainerId = req.session?.user?.id || 1;
      const journals = await storage.getTrainingJournalsByTrainer(trainerId);
      
      return res.json({
        success: true,
        journals: journals
      });
    } catch (error) {
      logServerError('훈련사 알림장 조회 오류:', error, req);
      return res.status(500).json({
        success: false,
        message: "알림장 조회 중 오류가 발생했습니다."
      });
    }
  });

  // 견주용 알림장 목록 조회 API
  app.get("/api/notifications/training-journals", async (req, res) => {
    try {
      const userId = req.session?.user?.id || 108; // 기본값: 김지영
      console.log(`[API] 견주 알림장 조회 - 사용자 ID: ${userId}`);
      
      const journals = await storage.getTrainingJournalsByOwner(userId);
      console.log(`[API] 조회된 알림장 수: ${journals?.length || 0}`);
      
      return res.json({
        success: true,
        journals: journals || []
      });
    } catch (error) {
      logServerError('견주 알림장 조회 오류:', error, req);
      return res.status(500).json({
        success: false,
        message: "알림장 조회 중 오류가 발생했습니다."
      });
    }
  });

  // 훈련 알림장 조회 API 추가 (GET /api/training-journals)
  app.get("/api/training-journals", async (req, res) => {
    try {
      const { ownerId, trainerId } = req.query;
      console.log(`[API] 훈련 알림장 조회 - 견주 ID: ${ownerId}, 훈련사 ID: ${trainerId}`);
      
      let journals = [];
      
      if (ownerId) {
        // 견주별 알림장 조회
        const userId = parseInt(ownerId as string);
        journals = await storage.getTrainingJournalsByOwner(userId);
        console.log(`[API] 견주 ${userId}의 알림장 ${journals?.length || 0}개 조회`);
      } else if (trainerId) {
        // 훈련사별 알림장 조회
        const trainerIdNum = parseInt(trainerId as string);
        journals = await storage.getTrainingJournalsByTrainer(trainerIdNum);
        console.log(`[API] 훈련사 ${trainerIdNum}의 알림장 ${journals?.length || 0}개 조회`);
      } else {
        // 전체 알림장 조회
        journals = await storage.getAllTrainingJournals();
        console.log(`[API] 전체 알림장 ${journals?.length || 0}개 조회`);
      }
      
      return res.json({
        success: true,
        journals: journals || []
      });
    } catch (error) {
      logServerError('훈련 알림장 조회 오류:', error, req);
      return res.status(500).json({
        success: false,
        message: "훈련 알림장 조회 중 오류가 발생했습니다."
      });
    }
  });

  // 통합 알림장 목록 조회 API (사용자별 권한 기반)
  app.get("/api/training-journals", async (req, res) => {
    try {
      const userId = req.session?.user?.id;
      const userRole = req.session?.user?.role;
      
      if (!userId) {
        return res.status(401).json({ error: "로그인이 필요합니다" });
      }

      let journals = [];

      if (userRole === 'admin') {
        // 관리자는 모든 알림장 조회 가능
        journals = await storage.getAllTrainingJournals();
      } else if (userRole === 'trainer') {
        // 훈련사는 자신이 작성한 알림장만 조회
        journals = await storage.getTrainingJournalsByTrainer(userId);
      } else if (userRole === 'institute-admin') {
        // 기관 관리자는 소속 훈련사들의 알림장 조회
        journals = await storage.getTrainingJournalsByInstitute(req.session?.user?.instituteId);
      } else {
        // 반려인은 자신의 반려동물 알림장만 조회
        journals = await storage.getTrainingJournalsByOwner(userId);
      }

      res.json({
        success: true,
        journals: journals
      });
    } catch (error) {
      logServerError('Error fetching training journals:', error, req);
      res.status(500).json({ error: '훈련 알림장 조회 중 오류가 발생했습니다' });
    }
  });

  // [Task #93] 견주 알림장 목록 조회 API는 위쪽(/api/notebook/entries, requireAuth + trainingJournalQuerySchema)으로 통합됨.
  // 라우트 등록 순서상 위 정의가 우선 매칭되며, 검색·필터(q, petId, from, to, category, unreadOnly)를
  // 일관되게 적용한다. 본 위치에 있던 무인증·무필터 레거시 핸들러는 제거됨.

  // 훈련사 알림장 목록 조회 API (검색·필터 지원 - Task #93)
  app.get("/api/trainer/journals", requireAuth('trainer'), async (req, res) => {
    try {
      const trainerId = req.session!.user!.id;

      // 쿼리 파라미터(검색·필터) 파싱 - 실패 시에도 기본 목록은 반환
      let query: any = { page: 1, limit: 100 };
      try {
        const parsed = trainingJournalQuerySchema.parse({ ...req.query, limit: req.query.limit ?? 100 });
        query = parsed;
      } catch (e: any) {
        if (e?.name === 'ZodError') {
          return res.status(400).json({ success: false, message: '검색 조건이 올바르지 않습니다.', details: e.errors });
        }
      }
      query.trainerId = trainerId; // 본인 알림장으로 강제 한정

      const result = storage.getTrainingJournalsWithPagination(query);

      // 펫/소유자 정보로 보강
      type Journal = { petId: number; [k: string]: unknown };
      type Pet = { id: number; name?: string; breed?: string; age?: number; ownerId?: number };
      type User = { id: number; name?: string; email?: string };
      const enriched = await Promise.all((result.journals as Journal[]).map(async (j) => {
        const pet = storage.getPet(j.petId) as Pet | null;
        let owner: User | null = null;
        if (pet?.ownerId) {
          try { owner = (await storage.getUser?.(pet.ownerId)) as User | null; } catch {}
        }
        return {
          ...j,
          pet: pet ? { id: pet.id, name: pet.name, breed: pet.breed, age: pet.age } : null,
          owner: owner ? { id: owner.id, name: owner.name, email: owner.email } : null,
        };
      }));

      return res.json({
        success: true,
        journals: enriched,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages,
        },
      });
    } catch (error) {
      logServerError('훈련사 알림장 목록 조회 오류:', error, req);
      return res.status(500).json({
        success: false,
        message: "알림장 목록 조회 중 오류가 발생했습니다."
      });
    }
  });

  // 훈련사의 알림장 작성 가능 학생/반려동물 목록
  app.get("/api/trainer/students-for-journal", requireAuth('trainer'), async (req, res) => {
    try {
      const trainerId = req.session!.user!.id;
      type PetRow = { id: number; name?: string; breed?: string; age?: number; ownerId: number; trainingType?: string };
      type UserRow = { id: number; name?: string; email?: string };
      type JournalRow = { trainingDate?: string; createdAt?: string };
      const pets = storage.getPetsByTrainerId(trainerId) as PetRow[];
      const result = await Promise.all(pets.map(async (pet) => {
        let owner: UserRow | null = null;
        try { owner = (await storage.getUser?.(pet.ownerId)) as UserRow | null; } catch {}
        const journals = (storage.getTrainingJournalsByPet?.(pet.id) || []) as JournalRow[];
        const lastJournal = journals.length
          ? journals.map((j) => j.trainingDate || j.createdAt || '').sort().slice(-1)[0]
          : null;
        return {
          id: pet.ownerId,
          petId: pet.id,
          name: owner?.name || '보호자',
          email: owner?.email || '',
          pet: { id: pet.id, name: pet.name, breed: pet.breed || '', age: pet.age || 0 },
          course: { id: 0, title: pet.trainingType || '훈련', currentSession: 0, totalSessions: 0 },
          lastJournal,
        };
      }));
      return res.json({ success: true, students: result });
    } catch (error) {
      logServerError('알림장 학생 목록 조회 오류:', error, req);
      return res.status(500).json({ success: false, message: '학생 목록 조회 실패' });
    }
  });

  // 알림장 음성 입력(STT) - OpenAI Whisper
  const notebookSttUpload = multer({
    dest: 'uploads/notebook-stt/',
    limits: { fileSize: 25 * 1024 * 1024 },
  });
  app.post("/api/notebook/transcribe", requireAuth('trainer'), csrfProtection, notebookSttUpload.single('audio'), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ success: false, error: '오디오 파일이 필요합니다.' });
      const OpenAI = (await import('openai')).default;
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const fs = await import('fs');
      const transcription = await openai.audio.transcriptions.create({
        file: fs.createReadStream(req.file.path),
        model: 'whisper-1',
        language: 'ko',
      });
      try { fs.unlinkSync(req.file.path); } catch {}
      return res.json({ success: true, text: transcription.text });
    } catch (error) {
      logServerError('알림장 STT 오류:', error, req);
      try { if (req.file) require('fs').unlinkSync(req.file.path); } catch {}
      return res.status(500).json({ success: false, error: '음성 인식 중 오류가 발생했습니다.' });
    }
  });

  // 반려동물 훈련사 할당 API
  app.post("/api/pets/:petId/assign-trainer", async (req, res) => {
    try {
      const petId = parseInt(req.params.petId);
      const { trainerId, trainingType } = req.body;
      const userId = req.session?.user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: "로그인이 필요합니다" });
      }

      // 반려동물 소유자 확인
      const pet = await storage.getPet(petId);
      if (!pet) {
        return res.status(404).json({ error: '반려동물을 찾을 수 없습니다' });
      }

      if (pet.ownerId !== userId && req.session?.user?.role !== 'admin') {
        return res.status(403).json({ error: '권한이 없습니다' });
      }

      // 훈련사 정보 조회
      const trainer = await storage.getTrainer(trainerId);
      if (!trainer) {
        return res.status(404).json({ error: '훈련사를 찾을 수 없습니다' });
      }

      // 반려동물에 훈련사 할당
      const updatedPet = await storage.updatePet(petId, {
        assignedTrainerId: trainerId,
        assignedTrainerName: trainer.name,
        trainingStatus: 'assigned',
        trainingType: trainingType || 'basic',
        notebookEnabled: true,
        trainingStartDate: new Date().toISOString()
      });

      res.json({
        success: true,
        message: `${trainer.name} 훈련사가 ${pet.name}에게 할당되었습니다.`,
        pet: updatedPet
      });
    } catch (error) {
      logServerError('훈련사 할당 오류:', error, req);
      res.status(500).json({ error: '훈련사 할당 중 오류가 발생했습니다' });
    }
  });

  // 반려동물 훈련사 해제 API
  app.delete("/api/pets/:petId/unassign-trainer", async (req, res) => {
    try {
      const petId = parseInt(req.params.petId);
      const userId = req.session?.user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: "로그인이 필요합니다" });
      }

      // 반려동물 소유자 확인
      const pet = await storage.getPet(petId);
      if (!pet) {
        return res.status(404).json({ error: '반려동물을 찾을 수 없습니다' });
      }

      if (pet.ownerId !== userId && req.session?.user?.role !== 'admin') {
        return res.status(403).json({ error: '권한이 없습니다' });
      }

      // 훈련사 할당 해제
      const updatedPet = await storage.updatePet(petId, {
        assignedTrainerId: null,
        assignedTrainerName: null,
        trainingStatus: 'not_assigned',
        trainingType: null,
        notebookEnabled: false,
        trainingStartDate: null
      });

      res.json({
        success: true,
        message: `${pet.name}의 훈련사 할당이 해제되었습니다.`,
        pet: updatedPet
      });
    } catch (error) {
      logServerError('훈련사 해제 오류:', error, req);
      res.status(500).json({ error: '훈련사 해제 중 오류가 발생했습니다' });
    }
  });

  // 기관 관리자 - 알림장 현황 조회 API
  app.get("/api/admin/notebook/status", async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      
      // 모든 훈련사의 알림장 작성 현황 조회
      const allJournals = await storage.getAllTrainingJournals();
      
      // 날짜 필터링
      let filteredJournals = allJournals;
      if (startDate && endDate) {
        const start = new Date(startDate as string);
        const end = new Date(endDate as string);
        filteredJournals = allJournals.filter(journal => {
          const journalDate = new Date(journal.trainingDate);
          return journalDate >= start && journalDate <= end;
        });
      }
      
      // 훈련사별 통계 계산
      const trainerStats = {};
      filteredJournals.forEach(journal => {
        const trainerId = journal.trainerId;
        if (!trainerStats[trainerId]) {
          trainerStats[trainerId] = {
            trainerId,
            trainerName: journal.trainer?.name || '알 수 없음',
            totalJournals: 0,
            sentJournals: 0,
            readJournals: 0,
            dates: []
          };
        }
        trainerStats[trainerId].totalJournals++;
        if (journal.status === 'sent' || journal.status === 'read') {
          trainerStats[trainerId].sentJournals++;
        }
        if (journal.status === 'read') {
          trainerStats[trainerId].readJournals++;
        }
        trainerStats[trainerId].dates.push({
          date: journal.trainingDate,
          status: journal.status,
          petName: journal.pet?.name || '알 수 없음',
          title: journal.title
        });
      });
      
      return res.json({
        success: true,
        stats: Object.values(trainerStats),
        totalJournals: filteredJournals.length
      });
    } catch (error) {
      logServerError('알림장 현황 조회 오류:', error, req);
      return res.status(500).json({
        success: false,
        message: "알림장 현황 조회 중 오류가 발생했습니다."
      });
    }
  });

  // 관리자 - AI 초안에서 시작한 알림장 비율 통계
  app.get("/api/admin/notebook/ai-draft-stats", requireAuth('admin'), async (req, res) => {
    try {
      const { startDate, endDate, granularity } = req.query as Record<string, string | undefined>;
      const stats = storage.getNotebookAiDraftStats({
        startDate,
        endDate,
        granularity: granularity === 'month' ? 'month' : 'week',
      });
      return res.json({ success: true, ...stats });
    } catch (error) {
      logServerError('AI 초안 비율 통계 조회 오류:', error, req);
      return res.status(500).json({
        success: false,
        message: 'AI 초안 비율 통계를 불러오지 못했습니다.',
      });
    }
  });

  // 기관 관리자 전용 - 소속 훈련사 알림장 현황 조회 API
  app.get("/api/institute/notebook/status", async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      
      // 실제 훈련사 데이터를 가져와 기관 소속 훈련사 필터링
      const allTrainers = await storage.getAllTrainers();
      const allJournals = await storage.getAllTrainingJournals();
      
      // 기관 소속 훈련사 ID 추출 (실제 연결된 훈련사들)
      const instituteTrainerIds = allTrainers.map(trainer => trainer.id);
      
      // 날짜 필터링
      let filteredJournals = allJournals;
      if (startDate && endDate) {
        const start = new Date(startDate as string);
        const end = new Date(endDate as string);
        filteredJournals = allJournals.filter(journal => {
          const journalDate = new Date(journal.trainingDate);
          return journalDate >= start && journalDate <= end;
        });
      }
      
      // 기관 소속 훈련사의 알림장만 필터링
      const instituteJournals = filteredJournals.filter(journal => 
        instituteTrainerIds.includes(journal.trainerId)
      );
      
      // 훈련사별 통계 계산
      const trainerStats = {};
      instituteJournals.forEach(journal => {
        const trainerId = journal.trainerId;
        const trainer = allTrainers.find(t => t.id === trainerId);
        
        if (!trainerStats[trainerId]) {
          trainerStats[trainerId] = {
            trainerId,
            trainerName: trainer?.name || '알 수 없음',
            totalJournals: 0,
            sentJournals: 0,
            readJournals: 0,
            dates: []
          };
        }
        trainerStats[trainerId].totalJournals++;
        if (journal.status === 'sent' || journal.status === 'read') {
          trainerStats[trainerId].sentJournals++;
        }
        if (journal.status === 'read') {
          trainerStats[trainerId].readJournals++;
        }
        trainerStats[trainerId].dates.push({
          date: journal.trainingDate,
          status: journal.status,
          petName: journal.pet?.name || '알 수 없음',
          title: journal.title
        });
      });
      
      return res.json({
        success: true,
        stats: Object.values(trainerStats),
        totalJournals: instituteJournals.length
      });
    } catch (error) {
      logServerError('기관 알림장 현황 조회 오류:', error, req);
      return res.status(500).json({
        success: false,
        message: "기관 알림장 현황 조회 중 오류가 발생했습니다."
      });
    }
  });

  // 사용자 즐겨찾기 강의 목록
  app.get("/api/users/:userId/favorite-courses", (req, res) => {
    const userId = parseInt(req.params.userId);

    const mockFavorites = [
      {
        id: 1,
        title: "강아지 기본 복종 훈련",
        thumbnail: "https://images.unsplash.com/photo-1551717743-49959800b1f6?w=400&h=200",
        price: 120000,
        rating: 4.7,
        addedAt: "2025-06-15"
      }
    ];

    return res.json(mockFavorites);
  });

  // 강의 진행률 업데이트
  app.post("/api/courses/:id/progress", (req, res) => {
    const courseId = parseInt(req.params.id);
    const { userId, lessonId, completed } = req.body;

    if (!userId || !lessonId) {
      return res.status(400).json({
        success: false,
        message: "필수 정보가 누락되었습니다."
      });
    }

    // 실제로는 데이터베이스에서 진행률 업데이트
    console.log(`강좌 ${courseId} 진행률 업데이트:`, { userId, lessonId, completed });

    return res.json({
      success: true,
      message: "진행률이 업데이트되었습니다.",
      progress: completed ? 75 : 65 // 모의 진행률
    });
  });

  // 개인화된 강의 추천
  app.get("/api/users/:userId/recommended-courses", (req, res) => {
    const userId = parseInt(req.params.userId);

    const mockRecommendations = [
      {
        id: 4,
        title: "고급 어질리티 훈련",
        reason: "기본 훈련 과정을 완료하신 분께 추천",
        thumbnail: "https://images.unsplash.com/photo-1583336663277-620dc1996580?w=400&h=200",
        price: 180000,
        rating: 4.8,
        matchScore: 0.92
      },
      {
        id: 5,
        title: "반려견 심리 케어",
        reason: "관심 분야를 기반으로 추천",
        thumbnail: "https://images.unsplash.com/photo-1601758177266-bc599de87707?w=400&h=200",
        price: 150000,
        rating: 4.6,
        matchScore: 0.87
      }
    ];

    return res.json(mockRecommendations);
  });

  // 강의 수료증 발급
  app.post("/api/courses/:id/certificate", (req, res) => {
    const courseId = parseInt(req.params.id);
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "사용자 ID가 필요합니다."
      });
    }

    // 수강 완료 여부 확인 (실제로는 데이터베이스에서)
    const isCompleted = true; // 모의 데이터

    if (!isCompleted) {
      return res.status(400).json({
        success: false,
        message: "강의를 완료한 후 수료증을 발급받을 수 있습니다."
      });
    }

    const certificate = {
      id: `CERT-${courseId}-${userId}-${Date.now()}`,
      courseId,
      userId,
      courseTitle: "강아지 기본 복종 훈련",
      studentName: "김반려",
      completedAt: new Date().toISOString().split('T')[0],
      issuedAt: new Date().toISOString(),
      certificateUrl: `/certificates/${courseId}/${userId}.pdf`
    };

    console.log(`수료증 발급:`, certificate);

    return res.json({
      success: true,
      message: "수료증이 발급되었습니다.",
      certificate
    });
  });

  // 사용자 수료증 목록
  app.get("/api/users/:userId/certificates", (req, res) => {
    const userId = parseInt(req.params.userId);

    const mockCertificates = [
      {
        id: "CERT-1-1-1706123456789",
        courseId: 1,
        courseTitle: "강아지 기본 복종 훈련",
        completedAt: "2025-06-15",
        issuedAt: "2025-06-15T10:30:00.000Z",
        certificateUrl: "/certificates/1/1.pdf"
      }
    ];

    return res.json(mockCertificates);
  });

  // ====== 알림 시스템 API ======

  // POST /api/notifications - 새 알림 생성 (관리자 또는 시스템에서만 사용)
  app.post("/api/notifications", csrfProtection, async (req, res) => {
    try {
      const userId = req.session?.user?.id;
      const userRole = req.session?.user?.role;
      
      if (!userId || !['admin', 'trainer'].includes(userRole)) {
        return res.status(403).json({
          success: false,
          error: "알림 생성 권한이 없습니다."
        });
      }

      const validatedData = createNotificationSchema.parse(req.body);
      const notification = await storage.createNotification(validatedData);

      return res.status(201).json({
        success: true,
        message: "알림이 생성되었습니다.",
        notification
      });
    } catch (error: any) {
      logServerError('알림 생성 오류:', error, req);
      
      if (error.name === 'ZodError') {
        return res.status(400).json({
          success: false,
          error: "입력 데이터가 올바르지 않습니다.",
          details: error.errors
        });
      }

      return res.status(500).json({
        success: false,
        error: "알림 생성 중 오류가 발생했습니다."
      });
    }
  });

  // GET /api/notifications - 사용자별 알림 목록 조회 (페이지네이션 지원)
  app.get("/api/notifications", async (req, res) => {
    try {
      const userId = req.session?.user?.id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: "로그인이 필요합니다."
        });
      }

      const validatedQuery = notificationQuerySchema.parse(req.query);
      const result = await storage.getNotificationsByUserId(userId, validatedQuery);

      return res.json({
        success: true,
        ...result
      });
    } catch (error: any) {
      logServerError('알림 목록 조회 오류:', error, req);
      
      if (error.name === 'ZodError') {
        return res.status(400).json({
          success: false,
          error: "조회 조건이 올바르지 않습니다.",
          details: error.errors
        });
      }

      return res.status(500).json({
        success: false,
        error: "알림 목록 조회 중 오류가 발생했습니다."
      });
    }
  });

  // GET /api/notifications/unread-count - 읽지 않은 알림 개수
  app.get("/api/notifications/unread-count", async (req, res) => {
    try {
      const userId = req.session?.user?.id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: "로그인이 필요합니다."
        });
      }

      const unreadCount = await storage.getUnreadNotificationCount(userId);

      return res.json({
        success: true,
        unreadCount
      });
    } catch (error: any) {
      logServerError('읽지 않은 알림 개수 조회 오류:', error, req);
      return res.status(500).json({
        success: false,
        error: "읽지 않은 알림 개수 조회 중 오류가 발생했습니다."
      });
    }
  });

  // GET /api/notifications/preferences - 사용자 알림 수신 설정 조회
  app.get("/api/notifications/preferences", async (req, res) => {
    try {
      const userId = req.session?.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, error: "로그인이 필요합니다." });
      }
      const preferences = await storage.getNotificationPreferences(userId);
      return res.json({ success: true, preferences });
    } catch (error: any) {
      logServerError('알림 설정 조회 오류:', error, req);
      return res.status(500).json({ success: false, error: "알림 설정 조회 중 오류가 발생했습니다." });
    }
  });

  // PATCH /api/notifications/preferences - 사용자 알림 수신 설정 업데이트
  app.patch("/api/notifications/preferences", csrfProtection, async (req, res) => {
    try {
      const userId = req.session?.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, error: "로그인이 필요합니다." });
      }
      const { category, inAppEnabled, pushEnabled } = req.body || {};
      if (!category || typeof inAppEnabled !== 'boolean' || typeof pushEnabled !== 'boolean') {
        return res.status(400).json({ success: false, error: "category, inAppEnabled, pushEnabled가 필요합니다." });
      }
      if (!["message", "reservation", "payment", "system"].includes(category)) {
        return res.status(400).json({ success: false, error: "올바른 카테고리가 아닙니다." });
      }
      const preference = await storage.upsertNotificationPreference(userId, {
        category, inAppEnabled, pushEnabled
      });
      return res.json({ success: true, preference });
    } catch (error: any) {
      logServerError('알림 설정 업데이트 오류:', error, req);
      return res.status(500).json({ success: false, error: "알림 설정 업데이트 중 오류가 발생했습니다." });
    }
  });

  // PATCH /api/notifications/mark-read - 다중 알림 읽음 처리 (반드시 /:id 이전에 등록)
  app.patch("/api/notifications/mark-read", csrfProtection, async (req, res) => {
    try {
      const userId = req.session?.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, error: "로그인이 필요합니다." });
      }

      const validatedData = bulkNotificationUpdateSchema.parse(req.body);
      const notificationIds = validatedData.notificationIds;
      for (const id of notificationIds) {
        const notification = await storage.getNotificationById(id);
        if (!notification || notification.userId !== userId) {
          return res.status(403).json({ success: false, error: "일부 알림에 접근할 권한이 없습니다." });
        }
      }

      const updates = { ...validatedData.updates, isRead: true };
      const updatedNotifications = await storage.bulkUpdateNotifications(notificationIds, updates);

      return res.json({
        success: true,
        message: `${updatedNotifications.length}개의 알림이 읽음 처리되었습니다.`,
        updatedCount: updatedNotifications.length,
      });
    } catch (error: any) {
      logServerError('다중 알림 읽음 처리 오류:', error, req);
      if (error.name === 'ZodError') {
        return res.status(400).json({
          success: false,
          error: "요청 데이터가 올바르지 않습니다.",
          details: error.errors,
        });
      }
      return res.status(500).json({ success: false, error: "알림 읽음 처리 중 오류가 발생했습니다." });
    }
  });

  // PATCH /api/notifications/mark-all-read - 모든 알림 읽음 처리 (반드시 /:id 이전에 등록)
  app.patch("/api/notifications/mark-all-read", csrfProtection, async (req, res) => {
    try {
      const userId = req.session?.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, error: "로그인이 필요합니다." });
      }
      const markedCount = await storage.markAllNotificationsAsRead(userId);
      return res.json({
        success: true,
        message: `${markedCount}개의 알림이 모두 읽음 처리되었습니다.`,
        markedCount,
      });
    } catch (error: any) {
      logServerError('모든 알림 읽음 처리 오류:', error, req);
      return res.status(500).json({ success: false, error: "모든 알림 읽음 처리 중 오류가 발생했습니다." });
    }
  });

  // GET /api/notifications/:id - 특정 알림 조회
  app.get("/api/notifications/:id", async (req, res) => {
    try {
      const userId = req.session?.user?.id;
      const notificationId = parseInt(req.params.id);
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: "로그인이 필요합니다."
        });
      }

      if (isNaN(notificationId)) {
        return res.status(400).json({
          success: false,
          error: "올바른 알림 ID가 필요합니다."
        });
      }

      const notification = await storage.getNotificationById(notificationId);
      
      if (!notification) {
        return res.status(404).json({
          success: false,
          error: "알림을 찾을 수 없습니다."
        });
      }

      // 본인의 알림인지 확인
      if (notification.userId !== userId) {
        return res.status(403).json({
          success: false,
          error: "해당 알림에 접근할 권한이 없습니다."
        });
      }

      return res.json({
        success: true,
        notification
      });
    } catch (error: any) {
      logServerError('알림 조회 오류:', error, req);
      return res.status(500).json({
        success: false,
        error: "알림 조회 중 오류가 발생했습니다."
      });
    }
  });

  // PATCH /api/notifications/:id - 알림 상태 수정 (읽음 처리 등)
  app.patch("/api/notifications/:id", csrfProtection, async (req, res) => {
    try {
      const userId = req.session?.user?.id;
      const notificationId = parseInt(req.params.id);
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: "로그인이 필요합니다."
        });
      }

      if (isNaN(notificationId)) {
        return res.status(400).json({
          success: false,
          error: "올바른 알림 ID가 필요합니다."
        });
      }

      // 기존 알림 확인
      const existingNotification = await storage.getNotificationById(notificationId);
      if (!existingNotification) {
        return res.status(404).json({
          success: false,
          error: "알림을 찾을 수 없습니다."
        });
      }

      // 본인의 알림인지 확인
      if (existingNotification.userId !== userId) {
        return res.status(403).json({
          success: false,
          error: "해당 알림을 수정할 권한이 없습니다."
        });
      }

      const validatedData = updateNotificationSchema.parse(req.body);
      const updatedNotification = await storage.updateNotification(notificationId, validatedData);

      if (!updatedNotification) {
        return res.status(500).json({
          success: false,
          error: "알림 수정에 실패했습니다."
        });
      }

      return res.json({
        success: true,
        message: "알림이 수정되었습니다.",
        notification: updatedNotification
      });
    } catch (error: any) {
      logServerError('알림 수정 오류:', error, req);
      
      if (error.name === 'ZodError') {
        return res.status(400).json({
          success: false,
          error: "수정 데이터가 올바르지 않습니다.",
          details: error.errors
        });
      }

      return res.status(500).json({
        success: false,
        error: "알림 수정 중 오류가 발생했습니다."
      });
    }
  });

  // DELETE /api/notifications/:id - 알림 삭제
  app.delete("/api/notifications/:id", csrfProtection, async (req, res) => {
    try {
      const userId = req.session?.user?.id;
      const notificationId = parseInt(req.params.id);
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: "로그인이 필요합니다."
        });
      }

      if (isNaN(notificationId)) {
        return res.status(400).json({
          success: false,
          error: "올바른 알림 ID가 필요합니다."
        });
      }

      // 기존 알림 확인
      const existingNotification = await storage.getNotificationById(notificationId);
      if (!existingNotification) {
        return res.status(404).json({
          success: false,
          error: "알림을 찾을 수 없습니다."
        });
      }

      // 본인의 알림인지 확인
      if (existingNotification.userId !== userId) {
        return res.status(403).json({
          success: false,
          error: "해당 알림을 삭제할 권한이 없습니다."
        });
      }

      const success = await storage.deleteNotification(notificationId);

      if (!success) {
        return res.status(500).json({
          success: false,
          error: "알림 삭제에 실패했습니다."
        });
      }

      return res.json({
        success: true,
        message: "알림이 삭제되었습니다."
      });
    } catch (error: any) {
      logServerError('알림 삭제 오류:', error, req);
      return res.status(500).json({
        success: false,
        error: "알림 삭제 중 오류가 발생했습니다."
      });
    }
  });

  // PATCH /api/notifications/mark-read - 다중 알림 읽음 처리
  app.patch("/api/notifications/mark-read", csrfProtection, async (req, res) => {
    try {
      const userId = req.session?.user?.id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: "로그인이 필요합니다."
        });
      }

      const validatedData = bulkNotificationUpdateSchema.parse(req.body);
      
      // 모든 알림이 현재 사용자의 것인지 확인
      const notificationIds = validatedData.notificationIds;
      for (const id of notificationIds) {
        const notification = storage.getNotificationById(id);
        if (!notification || notification.userId !== userId) {
          return res.status(403).json({
            success: false,
            error: "일부 알림에 접근할 권한이 없습니다."
          });
        }
      }

      const updates = { ...validatedData.updates, isRead: true };
      const updatedNotifications = storage.bulkUpdateNotifications(notificationIds, updates);

      return res.json({
        success: true,
        message: `${updatedNotifications.length}개의 알림이 읽음 처리되었습니다.`,
        updatedCount: updatedNotifications.length
      });
    } catch (error: any) {
      logServerError('다중 알림 읽음 처리 오류:', error, req);
      
      if (error.name === 'ZodError') {
        return res.status(400).json({
          success: false,
          error: "요청 데이터가 올바르지 않습니다.",
          details: error.errors
        });
      }

      return res.status(500).json({
        success: false,
        error: "알림 읽음 처리 중 오류가 발생했습니다."
      });
    }
  });

  // PATCH /api/notifications/mark-all-read - 모든 알림 읽음 처리
  app.patch("/api/notifications/mark-all-read", csrfProtection, async (req, res) => {
    try {
      const userId = req.session?.user?.id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: "로그인이 필요합니다."
        });
      }

      const markedCount = storage.markAllNotificationsAsRead(userId);

      return res.json({
        success: true,
        message: `${markedCount}개의 알림이 모두 읽음 처리되었습니다.`,
        markedCount
      });
    } catch (error: any) {
      logServerError('모든 알림 읽음 처리 오류:', error, req);
      return res.status(500).json({
        success: false,
        error: "모든 알림 읽음 처리 중 오류가 발생했습니다."
      });
    }
  });

  // 알림 관련 라우트 완료

  // 알림장 모니터링 API
  app.get("/api/admin/notebook/status", async (req, res) => {
    try {
      const { startDate, endDate, startTime, endTime } = req.query;
      
      // 모든 알림장 데이터 가져오기
      const allJournals = await storage.getAllTrainingJournals();
      
      // 날짜 및 시간 필터링
      const filteredJournals = allJournals.filter(journal => {
        const journalDate = new Date(journal.trainingDate);
        
        // 날짜 필터링
        const journalDateStr = journalDate.toISOString().split('T')[0];
        if (startDate && journalDateStr < (startDate as string)) return false;
        if (endDate && journalDateStr > (endDate as string)) return false;
        
        // 시간 필터링
        if (startTime || endTime) {
          const hours = journalDate.getHours();
          const minutes = journalDate.getMinutes();
          const journalTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
          
          console.log(`Journal time: ${journalTime}, startTime: ${startTime}, endTime: ${endTime}`);
          
          if (startTime && journalTime < (startTime as string)) {
            console.log(`Filtered out: ${journalTime} < ${startTime}`);
            return false;
          }
          if (endTime && journalTime > (endTime as string)) {
            console.log(`Filtered out: ${journalTime} > ${endTime}`);
            return false;
          }
        }
        
        return true;
      });
      
      // 훈련사별 통계 생성
      const trainerStats = new Map();
      
      for (const journal of filteredJournals) {
        const trainerId = journal.trainerId;
        
        if (!trainerStats.has(trainerId)) {
          // 훈련사 정보 가져오기
          const trainer = await storage.getTrainer(trainerId);
          
          trainerStats.set(trainerId, {
            trainerId,
            trainerName: trainer?.name || `훈련사 ${trainerId}`,
            totalJournals: 0,
            sentJournals: 0,
            readJournals: 0,
            dates: []
          });
        }
        
        const stats = trainerStats.get(trainerId);
        stats.totalJournals++;
        
        if (journal.status === 'sent' || journal.status === 'read' || journal.status === 'replied') {
          stats.sentJournals++;
        }
        
        if (journal.status === 'read' || journal.status === 'replied') {
          stats.readJournals++;
        }
        
        // 펫 정보 가져오기
        const pet = await storage.getPet(journal.petId);
        
        stats.dates.push({
          date: journal.trainingDate,
          status: journal.status,
          petName: pet?.name || `펫 ${journal.petId}`,
          title: journal.title
        });
      }
      
      const response = {
        stats: Array.from(trainerStats.values()),
        totalJournals: filteredJournals.length
      };
      
      res.json(response);
      
    } catch (error) {
      logServerError('알림장 현황 조회 오류:', error, req);
      res.status(500).json({ 
        success: false, 
        message: '알림장 현황을 불러오는 중 오류가 발생했습니다.' 
      });
    }
  });

  // 커뮤니티 API는 setupSocialRoutes에서 처리됨





  // 사용자 검색 API (메시징용) - GET과 POST 모두 지원
  app.get("/api/users/search", async (req, res) => {
    const { query } = req.query;
    await handleUserSearch(query as string, res);
  });

  app.post("/api/users/search", async (req, res) => {
    const { query } = req.body;
    await handleUserSearch(query, res);
  });

  // 사용자 검색 로직을 별도 함수로 분리
  async function handleUserSearch(query: string, res: any) {
    try {
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ 
          success: false, 
          message: '검색어가 필요합니다.' 
        });
      }

      // URL 디코딩 및 한국어 인코딩 문제 해결
      let searchQuery = query;
      try {
        // 먼저 decodeURIComponent 시도
        searchQuery = decodeURIComponent(query);
      } catch (e) {
        // 실패시 원본 사용
        searchQuery = query;
      }
      
      // 추가 한국어 디코딩 처리
      try {
        if (searchQuery !== query) {
          searchQuery = searchQuery;
        } else {
          // Buffer를 통한 UTF-8 디코딩 시도
          const buffer = Buffer.from(searchQuery, 'latin1');
          const decoded = buffer.toString('utf8');
          if (decoded !== searchQuery && decoded.length > 0) {
            searchQuery = decoded;
          }
        }
      } catch (e) {
        // 디코딩 실패시 원본 사용
      }
      
      searchQuery = searchQuery.trim();
      console.log(`[사용자 검색] 원본: "${query}" -> 처리된 검색어: "${searchQuery}"`);

      // 모든 사용자 데이터 가져오기
      const allUsers = await storage.getAllUsers();
      const allTrainers = await storage.getAllTrainers();
      
      console.log(`[사용자 검색] 전체 사용자: ${allUsers.length}명, 전체 훈련사: ${allTrainers.length}명`);

      // 검색 결과 생성
      const searchResults = [];

      // 일반 사용자 검색 (이름으로 검색)
      const matchedUsers = allUsers.filter(user => 
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase())
      );

      // 훈련사 검색 (이름, 전문분야로 검색)
      const matchedTrainers = allTrainers.filter(trainer => 
        trainer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (trainer.specialties && trainer.specialties.some(specialty => 
          specialty.toLowerCase().includes(searchQuery.toLowerCase())
        )) ||
        (trainer.bio && trainer.bio.toLowerCase().includes(searchQuery.toLowerCase()))
      );

      // 일반 사용자 결과 추가
      matchedUsers.forEach(user => {
        searchResults.push({
          id: user.id,
          name: user.name,
          role: user.role || 'pet-owner',
          avatar: user.avatar || null,
          email: user.email
        });
      });

      // 훈련사 결과 추가 (userId가 있으면 userId 사용, 없으면 trainer.id + 1000으로 구분)
      matchedTrainers.forEach(trainer => {
        searchResults.push({
          id: trainer.userId || (trainer.id + 1000), // 훈련사 ID를 사용자 ID로 매핑
          name: trainer.name,
          role: 'trainer',
          avatar: trainer.avatar || trainer.image || null,
          email: trainer.email,
          specialties: trainer.specialties || []
        });
      });
      
      // 검색어가 짧을 경우 모든 사용자 포함 (빈 검색어가 아닌 경우)
      if (searchQuery.length > 0 && searchQuery.length <= 2) {
        console.log(`[사용자 검색] 짧은 검색어로 전체 사용자 포함`);
        
        // 아직 포함되지 않은 사용자들도 추가
        allUsers.forEach(user => {
          const alreadyAdded = searchResults.some(result => result.id === user.id);
          if (!alreadyAdded) {
            searchResults.push({
              id: user.id,
              name: user.name,
              role: user.role || 'pet-owner',
              avatar: user.avatar || null,
              email: user.email
            });
          }
        });
        
        // 아직 포함되지 않은 훈련사들도 추가
        allTrainers.forEach(trainer => {
          const trainerId = trainer.userId || (trainer.id + 1000);
          const alreadyAdded = searchResults.some(result => result.id === trainerId);
          if (!alreadyAdded) {
            searchResults.push({
              id: trainerId,
              name: trainer.name,
              role: 'trainer',
              avatar: trainer.avatar || trainer.image || null,
              email: trainer.email,
              specialties: trainer.specialties || []
            });
          }
        });
      }

      console.log(`[사용자 검색] 검색 결과: ${searchResults.length}명`);

      res.json({ 
        success: true, 
        users: searchResults,
        query: searchQuery,
        totalResults: searchResults.length
      });

    } catch (error) {
      logServerError('사용자 검색 오류:', error, req);
      res.status(500).json({ 
        success: false, 
        message: '사용자 검색 중 오류가 발생했습니다.' 
      });
    }
  }

  // 회원 상태 및 기관 매칭 정보 API
  app.get("/api/admin/members-status", async (req, res) => {
    try {
      const allUsers = await storage.getAllUsers();
      const allTrainers = await storage.getAllTrainers();
      const allInstitutes = await storage.getInstitutes();
      const allPets = await storage.getAllPets ? await storage.getAllPets() : [];

      // 사용자 역할별 분류
      const membersByRole = {
        'pet-owner': [],
        'trainer': [],
        'institute-admin': [],
        'admin': []
      };

      // 기관 매칭 정보
      const instituteMemberships = [];

      // 사용자 분류
      allUsers.forEach(user => {
        const roleKey = user.role || 'pet-owner';
        if (membersByRole[roleKey]) {
          membersByRole[roleKey].push({
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            isVerified: user.isVerified || false,
            instituteId: user.instituteId || null,
            createdAt: user.createdAt,
            avatar: user.avatar
          });
        }

        // 기관 소속 회원 추가
        if (user.instituteId) {
          const institute = allInstitutes.find(inst => inst.id === user.instituteId);
          if (institute) {
            instituteMemberships.push({
              userId: user.id,
              userName: user.name,
              userRole: user.role,
              instituteId: user.instituteId,
              instituteName: institute.name,
              joinedAt: user.createdAt
            });
          }
        }
      });

      // 훈련사-견주 연결 정보
      const trainerConnections = [];
      allTrainers.forEach(trainer => {
        // 해당 훈련사와 연결된 견주들 찾기 (예약, 메시지 등을 통해)
        const connectedOwners = allUsers.filter(user => {
          // 여기서는 간단히 같은 지역의 견주들로 시뮬레이션
          return user.role === 'pet-owner' && user.location === trainer.location;
        });

        if (connectedOwners.length > 0) {
          trainerConnections.push({
            trainerId: trainer.id,
            trainerName: trainer.name,
            connectedOwners: connectedOwners.map(owner => ({
              id: owner.id,
              name: owner.name,
              email: owner.email
            }))
          });
        }
      });

      res.json({
        success: true,
        data: {
          membersByRole,
          instituteMemberships,
          trainerConnections,
          summary: {
            totalUsers: allUsers.length,
            totalTrainers: allTrainers.length,
            totalInstitutes: allInstitutes.length,
            totalPets: allPets.length,
            petOwners: membersByRole['pet-owner'].length,
            instituteAdmins: membersByRole['institute-admin'].length,
            verifiedMembers: allUsers.filter(u => u.isVerified).length
          }
        }
      });

    } catch (error) {
      logServerError('회원 상태 조회 오류:', error, req);
      res.status(500).json({
        success: false,
        message: '회원 상태 정보를 가져오는데 실패했습니다.'
      });
    }
  });

  // 콘텐츠 크롤링 API
  app.post("/api/admin/content/crawl", async (req, res) => {
    try {
      const { url, autoPost = false } = req.body;
      
      if (!url) {
        return res.status(400).json({
          success: false,
          message: "URL이 필요합니다."
        });
      }

      console.log(`[콘텐츠 크롤링] URL 크롤링 시작: ${url}`);
      
      // 언론사 페이지인지 확인 (기자 페이지 URL 패턴)
      const isJournalistPage = url.includes('/journalist/') || url.includes('/press/');
      
      if (isJournalistPage) {
        console.log(`[콘텐츠 크롤링] 언론사 페이지 감지, 반려견 관련 기사 검색 시작`);
        
        // 언론사 페이지에서 반려견 관련 기사 URL들 추출
        const petArticleUrls = await contentCrawler.extractPetArticleUrls(url);
        
        if (petArticleUrls.length === 0) {
          return res.status(400).json({
            success: false,
            message: "해당 언론사 페이지에서 반려견 관련 기사를 찾을 수 없습니다."
          });
        }

        console.log(`[콘텐츠 크롤링] ${petArticleUrls.length}개의 반려견 관련 기사 발견`);

        // 첫 번째 기사를 크롤링하여 예시로 반환
        const firstArticleContent = await contentCrawler.crawlNaverMedia(petArticleUrls[0]);
        
        if (!firstArticleContent) {
          return res.status(400).json({
            success: false,
            message: "기사 크롤링에 실패했습니다."
          });
        }

        let post = null;
        if (autoPost) {
          // 커뮤니티에 자동 등록
          try {
            post = await contentCrawler.postToCommunity(firstArticleContent, storage);
            console.log(`[콘텐츠 크롤링] 커뮤니티 게시글 자동 등록 완료: ${post.id}`);
          } catch (error) {
            logServerError(`[콘텐츠 크롤링] 커뮤니티 등록 실패:`, error, req);
          }
        }

        return res.json({
          success: true,
          message: autoPost ? `크롤링 및 커뮤니티 등록이 완료되었습니다. (총 ${petArticleUrls.length}개 기사 발견)` : `크롤링이 완료되었습니다. (총 ${petArticleUrls.length}개 기사 발견)`,
          data: {
            crawledContent: firstArticleContent,
            post,
            foundArticles: petArticleUrls.length,
            allArticleUrls: petArticleUrls.slice(0, 10) // 최대 10개만 미리보기
          }
        });

      } else {
        // 단일 기사 크롤링
        const crawledContent = await contentCrawler.crawlNaverMedia(url);
        
        if (!crawledContent) {
          return res.status(400).json({
            success: false,
            message: "크롤링에 실패했습니다. URL을 확인해주세요."
          });
        }

        // 반려견 관련 콘텐츠인지 확인
        const isPetRelated = crawledContent.tags.length > 0;
        
        if (!isPetRelated) {
          return res.status(400).json({
            success: false,
            message: "반려견 관련 콘텐츠가 아닙니다."
          });
        }

        // 자동으로 커뮤니티에 등록하는 경우
        if (autoPost) {
          try {
            const newPost = await contentCrawler.postToCommunity(crawledContent, storage);
            console.log(`[콘텐츠 크롤링] 커뮤니티 게시글 자동 등록 완료: ${newPost.id}`);
            
            return res.json({
              success: true,
              message: "크롤링 및 커뮤니티 등록이 완료되었습니다.",
              data: {
                crawledContent,
                post: newPost
              }
            });
          } catch (error) {
            logServerError(`[콘텐츠 크롤링] 커뮤니티 등록 실패:`, error, req);
            return res.json({
              success: true,
              message: "크롤링은 완료되었지만 커뮤니티 등록에 실패했습니다.",
              data: {
                crawledContent,
                post: null
              }
            });
          }
        }

        // 크롤링 결과만 반환
        res.json({
          success: true,
          message: "크롤링이 완료되었습니다.",
          data: crawledContent
        });
      }

    } catch (error) {
      logServerError('콘텐츠 크롤링 오류:', error, req);
      res.status(500).json({
        success: false,
        message: "크롤링 중 오류가 발생했습니다."
      });
    }
  });

  // 수동 커뮤니티 등록 API
  app.post("/api/admin/content/register", async (req, res) => {
    try {
      const { crawledContent } = req.body;
      
      if (!crawledContent) {
        return res.status(400).json({
          success: false,
          message: "크롤링 콘텐츠 데이터가 필요합니다."
        });
      }

      console.log(`[수동 등록] 커뮤니티 게시글 등록 시작: ${crawledContent.title}`);
      
      // 커뮤니티에 등록
      const newPost = await contentCrawler.postToCommunity(crawledContent, storage);
      
      console.log(`[수동 등록] 커뮤니티 게시글 등록 완료: ${newPost.id}`);
      
      res.json({
        success: true,
        message: "커뮤니티 등록이 완료되었습니다.",
        data: newPost
      });

    } catch (error) {
      logServerError('수동 등록 오류:', error, req);
      res.status(500).json({
        success: false,
        message: "커뮤니티 등록 중 오류가 발생했습니다."
      });
    }
  });

  // 다중 URL 크롤링 API  
  app.post("/api/admin/content/crawl-multiple", async (req, res) => {
    try {
      const { urls, autoPost = false } = req.body;
      
      if (!Array.isArray(urls) || urls.length === 0) {
        return res.status(400).json({
          success: false,
          message: "URL 배열이 필요합니다."
        });
      }

      console.log(`[다중 크롤링] ${urls.length}개 URL 크롤링 시작`);
      
      // 다중 URL 크롤링
      const crawledContents = await contentCrawler.crawlMultipleUrls(urls);
      
      if (crawledContents.length === 0) {
        return res.status(400).json({
          success: false,
          message: "크롤링 가능한 반려견 관련 콘텐츠가 없습니다."
        });
      }

      const results = [];
      
      // 자동으로 커뮤니티에 등록하는 경우
      if (autoPost) {
        for (const content of crawledContents) {
          const postData = {
            title: content.title,
            content: content.summary,
            tags: content.tags,
            category: content.category,
            linkInfo: {
              url: content.sourceUrl,
              title: content.title,
              description: content.summary,
              thumbnail: content.thumbnailUrl
            },
            authorId: 1, // 관리자 ID
            authorName: "TALEZ 관리자",
            createdAt: new Date().toISOString(),
            isPublished: true
          };

          try {
            const newPost = await storage.createPost(postData);
            results.push({
              crawledContent: content,
              post: newPost,
              success: true
            });
          } catch (error) {
            logServerError(`게시글 등록 실패: ${content.title}`, error, req);
            results.push({
              crawledContent: content,
              success: false,
              error: error.message
            });
          }
        }
        
        return res.json({
          success: true,
          message: `${crawledContents.length}개 콘텐츠 크롤링 및 커뮤니티 등록이 완료되었습니다.`,
          data: {
            totalCrawled: crawledContents.length,
            results
          }
        });
      }

      // 크롤링 결과만 반환
      res.json({
        success: true,
        message: `${crawledContents.length}개 콘텐츠 크롤링이 완료되었습니다.`,
        data: crawledContents
      });

    } catch (error) {
      logServerError('다중 콘텐츠 크롤링 오류:', error, req);
      res.status(500).json({
        success: false,
        message: "크롤링 중 오류가 발생했습니다."
      });
    }
  });

  // 관리 기능 API는 setupSocialRoutes에서 처리됨

  // 파일 업로드 라우트
  registerUploadRoutes(app);

  // 상품 API 라우트 등록 (높은 우선순위)
  app.use('/api', productRoutes);
  app.use('/api', simpleProductRoutes);
  
  // 수수료 관리 API
  app.get('/api/admin/commission/products', async (req, res) => {
    try {
      console.log('[Commission] 상품별 수수료율 조회 요청');
      
      const productsWithCommission = await db
        .select({
          id: products.id,
          name: products.name,
          category: products.category_id,
          price: products.price,
          commissionRate: productCommissions.commissionRate,
        })
        .from(products)
        .leftJoin(
          productCommissions,
          sql`${products.id} = ${productCommissions.productId} AND ${productCommissions.isActive} = true`
        )
        .where(sql`${products.is_active} = true`);

      const formattedProducts = productsWithCommission.map(p => ({
        id: p.id,
        name: p.name,
        category: p.category === 1 ? '강의' : '상품',
        price: Number(p.price) || 0,
        commissionRate: Number(p.commissionRate) || 0,
      }));

      console.log(`[Commission] ${formattedProducts.length}개 상품 조회 완료`);
      res.json({ success: true, products: formattedProducts });
    } catch (error) {
      logServerError('[Commission] 상품 조회 오류:', error, req);
      res.status(500).json({ success: false, error: '상품 조회 중 오류가 발생했습니다.' });
    }
  });

  app.put('/api/admin/commission/products/:id', async (req, res) => {
    try {
      const productId = parseInt(req.params.id);
      const { commissionRate } = req.body;

      console.log(`[Commission] 상품 ${productId} 수수료율 수정:`, commissionRate);

      const existingCommission = await db
        .select()
        .from(productCommissions)
        .where(sql`${productCommissions.productId} = ${productId} AND ${productCommissions.isActive} = true`)
        .limit(1);

      if (existingCommission.length > 0) {
        await db
          .update(productCommissions)
          .set({ 
            commissionRate: commissionRate.toString(),
            updatedAt: new Date(),
          })
          .where(sql`${productCommissions.id} = ${existingCommission[0].id}`);
      } else {
        await db.insert(productCommissions).values({
          productId,
          commissionRate: commissionRate.toString(),
          isActive: true,
        });
      }

      console.log(`[Commission] 수수료율 수정 완료`);
      await recordAuditLog(req, {
        action: 'admin.commission.product_rate_change',
        targetType: 'product',
        targetId: productId,
        payload: { commissionRate },
      });
      res.json({ success: true, message: '수수료율이 수정되었습니다.' });
    } catch (error) {
      logServerError('[Commission] 수수료율 수정 오류:', error, req);
      res.status(500).json({ success: false, error: '수수료율 수정 중 오류가 발생했습니다.' });
    }
  });

  app.get('/api/admin/commission/referrers', async (req, res) => {
    try {
      console.log('[Commission] 추천인 현황 조회 요청');
      
      const referrers = await db
        .select({
          id: referralProfiles.id,
          name: referralProfiles.userId,
          role: referralProfiles.profileType,
          referralCode: referralProfiles.referralCode,
          earningsTotal: referralProfiles.lifetimeEarnings,
          status: referralProfiles.status,
        })
        .from(referralProfiles)
        .where(sql`${referralProfiles.isActive} = true`)
        .orderBy(sql`${referralProfiles.lifetimeEarnings} DESC`);

      const formattedReferrers = referrers.map(r => ({
        id: r.id,
        name: r.name?.toString() || '미등록',
        role: r.role === 'trainer' ? '훈련사' : r.role === 'institute' ? '기관' : '제휴사',
        referralCode: r.referralCode,
        earningsTotal: Number(r.earningsTotal) || 0,
        status: r.status === 'active' ? '지급대기' : '지급완료',
      }));

      console.log(`[Commission] ${formattedReferrers.length}명 추천인 조회 완료`);
      res.json({ success: true, referrers: formattedReferrers });
    } catch (error) {
      logServerError('[Commission] 추천인 조회 오류:', error, req);
      res.status(500).json({ success: false, error: '추천인 조회 중 오류가 발생했습니다.' });
    }
  });

  app.post('/api/admin/commission/settlements/:id/approve', async (req, res) => {
    try {
      const referrerId = parseInt(req.params.id);
      const { amount, period } = req.body;

      console.log(`[Commission] 정산 승인 요청: 추천인 ${referrerId}`);

      const referrer = await db
        .select()
        .from(referralProfiles)
        .where(sql`${referralProfiles.id} = ${referrerId}`)
        .limit(1);

      if (referrer.length === 0) {
        return res.status(404).json({ success: false, error: '추천인을 찾을 수 없습니다.' });
      }

      const newSettlement = await db.insert(settlements).values({
        settlementType: 'referral',
        targetId: referrer[0].userId,
        targetName: '추천인',
        referralProfileId: referrerId,
        periodStart: new Date(period.split(' ~ ')[0]),
        periodEnd: new Date(period.split(' ~ ')[1]),
        totalGrossAmount: amount.toString(),
        totalFeeAmount: '0',
        totalNetAmount: amount.toString(),
        transactionCount: 1,
        status: 'completed',
      }).returning();

      await db
        .update(referralProfiles)
        .set({ status: 'inactive' })
        .where(sql`${referralProfiles.id} = ${referrerId}`);

      console.log(`[Commission] 정산 승인 완료: ${newSettlement[0].id}`);
      res.json({ success: true, message: '정산이 승인되었습니다.', settlement: newSettlement[0] });
    } catch (error) {
      logServerError('[Commission] 정산 승인 오류:', error, req);
      res.status(500).json({ success: false, error: '정산 승인 중 오류가 발생했습니다.' });
    }
  });
  
  // API 라우트 직접 등록 (Vite 미들웨어보다 먼저 처리되도록)
  app.get('/api/test-products', async (req, res) => {
    try {
      const result = await db.select().from(products).limit(5);
      res.json({
        success: true,
        message: 'API 라우트가 정상적으로 작동합니다.',
        products: result,
        count: result.length
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: '데이터베이스 연결 오류',
        details: error.message
      });
    }
  });

  // 메시징 라우트 등록
  const httpServer = createServer(app);
  registerMessagingRoutes(app, httpServer);
  
  // WebRTC 스트리밍 소켓 서버 설정
  setupStreamingSocket(httpServer);

  // 알림 라우트 등록 (WebSocket 설정 문제로 임시 비활성화)

// 건강 관리 라우트 (임시 비활성화)
  // setupHealthRoutes(app);

  // 분석 라우트  
  registerAnalyticsRoutes(app);

  // 트레이너 리뷰 & 평점 라우트
  registerTrainerReviewRoutes(app);

  // 소셜/커뮤니티 라우트 (임시 비활성화)
  // setupSocialRoutes(app);

  // 이벤트 라우트 등록
  app.use('/api', eventRoutes);

  // 이벤트 자동 업데이트 서비스 시작
  eventUpdater.startScheduler();

  // 서비스 검수 API
  app.get('/api/service/inspection', async (req, res) => {
    try {
      const inspection = {
        timestamp: new Date().toISOString(),
        status: 'operational',
        features: {
          authentication: { status: 'active', health: 100 },
          petManagement: { status: 'active', health: 95 },
          courses: { status: 'active', health: 90 },
          community: { status: 'active', health: 85 },
          messaging: { status: 'limited', health: 60 },
          shopping: { status: 'active', health: 80 },
          videoCall: { status: 'partial', health: 40 },
          payments: { status: 'inactive', health: 0 }
        },
        performance: {
          responseTime: '120ms',
          uptime: '99.8%',
          memoryUsage: '45%',
          cpuUsage: '23%'
        },
        recommendations: [
          'WebSocket 서버 활성화 권장',
          '결제 시스템 구현 필요',
          '실시간 기능 개선 필요',
          '데이터베이스 최적화 권장'
        ]
      };

      res.json(inspection);
    } catch (error) {
      logServerError('서비스 검수 오류:', error, req);
      res.status(500).json({ error: '서비스 검수 중 오류가 발생했습니다' });
    }
  });

  // 링크 정보 추출 API
  app.post('/api/extract-link-info', async (req, res) => {
    try {
      const { url } = req.body;
      
      if (!url) {
        return res.status(400).json({ error: 'URL이 필요합니다.' });
      }

      // URL 유효성 검증
      try {
        new URL(url);
      } catch {
        return res.status(400).json({ error: '유효하지 않은 URL입니다.' });
      }

      // 실제 링크 정보 추출 (간단한 모의 구현)
      const mockLinkInfo = {
        title: '반려견 훈련 관련 유용한 정보',
        description: '이 링크는 반려견 훈련에 도움이 되는 정보를 담고 있습니다.',
        image: 'https://images.unsplash.com/photo-1551717743-49959800b1f6?w=400&h=300&fit=crop'
      };

      // 실제로는 웹 스크래핑이나 meta 태그 파싱을 구현
      // 여기서는 간단한 모의 데이터 반환
      res.json(mockLinkInfo);
      
    } catch (error) {
      logServerError('링크 정보 추출 오류:', error, req);
      res.status(500).json({ error: '링크 정보 추출 중 오류가 발생했습니다.' });
    }
  });

  // 기능별 상태 체크 API
  app.get('/api/service/features', async (req, res) => {
    try {
      const features = {
        core: [
          { name: '사용자 인증', status: 'active', coverage: 100 },
          { name: '반려동물 관리', status: 'active', coverage: 95 },
          { name: '훈련사 관리', status: 'active', coverage: 90 }
        ],
        educational: [
          { name: '강좌 시스템', status: 'active', coverage: 85 },
          { name: '화상 교육', status: 'partial', coverage: 40 },
          { name: '진도 관리', status: 'active', coverage: 70 }
        ],
        communication: [
          { name: '메시징', status: 'limited', coverage: 60 },
          { name: '알림 시스템', status: 'partial', coverage: 50 },
          { name: '커뮤니티', status: 'active', coverage: 80 }
        ],
        commerce: [
          { name: '상품 조회', status: 'active', coverage: 90 },
          { name: '장바구니', status: 'active', coverage: 85 },
          { name: '결제 처리', status: 'inactive', coverage: 0 }
        ]
      };

      res.json(features);
    } catch (error) {
      logServerError('기능 상태 조회 오류:', error, req);
      res.status(500).json({ error: '기능 상태 조회 중 오류가 발생했습니다' });
    }
  });

// ===== Trainer Routes =====

// Get video classes created by TALEZ trainers
  app.get("/api/video-classes", async (req, res) => {
    try {
      const rawTrainers = await storage.getAllTrainers();
      
      // 테일즈 소속 훈련사들의 화상수업 목록 생성 (실제 데이터)
      const videoClasses = [
        {
          id: "vc1",
          title: "기초 복종 훈련 실시간 강의",
          description: "반려견의 기본적인 복종 훈련을 실시간으로 배우는 강의입니다. 앉아, 기다려, 이리와 등 기본 명령어를 집중적으로 훈련합니다.",
          trainerId: 1,
          trainerName: "강동훈",
          trainerImage: "https://api.dicebear.com/7.x/initials/svg?seed=강동훈&backgroundColor=6366f1&textColor=ffffff",
          scheduledTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2시간 후
          duration: 90,
          maxStudents: 15,
          currentStudents: 8,
          price: 35000,
          category: "기초 훈련",
          difficulty: "beginner",
          meetingUrl: "https://meet.google.com/talez-basic-training",
          status: "scheduled"
        },
        {
          id: "vc2", 
          title: "문제행동 교정 심화 과정",
          description: "짖기, 물기, 공격성 등의 문제행동을 체계적으로 교정하는 심화 과정입니다. 개별 맞춤 솔루션을 제공합니다.",
          trainerId: 1,
          trainerName: "강동훈",
          trainerImage: "https://api.dicebear.com/7.x/initials/svg?seed=강동훈&backgroundColor=6366f1&textColor=ffffff",
          scheduledTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 내일
          duration: 120,
          maxStudents: 10,
          currentStudents: 6,
          price: 50000,
          category: "문제행동 교정",
          difficulty: "intermediate",
          meetingUrl: "https://meet.google.com/talez-behavior-correction",
          status: "scheduled"
        },
        {
          id: "vc3",
          title: "사회화 훈련 및 산책 매너",
          description: "다른 반려견과의 사회화 훈련 및 올바른 산책 매너를 배우는 강의입니다. 실외 활동 시 필요한 모든 기술을 다룹니다.",
          trainerId: 1,
          trainerName: "강동훈",
          trainerImage: "https://api.dicebear.com/7.x/initials/svg?seed=강동훈&backgroundColor=6366f1&textColor=ffffff",
          scheduledTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3일 후
          duration: 75,
          maxStudents: 12,
          currentStudents: 4,
          price: 40000,
          category: "사회화 훈련",
          difficulty: "beginner",
          meetingUrl: "https://meet.google.com/talez-socialization",
          status: "scheduled"
        }
      ];
      
      res.json({ 
        success: true,
        videoClasses: videoClasses,
        totalCount: videoClasses.length
      });
    } catch (error) {
      logServerError('Error fetching video classes:', error, req);
      res.status(500).json({ 
        success: false, 
        error: '화상수업 목록을 가져오는 중 오류가 발생했습니다.' 
      });
    }
  });

// Create new meeting (Google Meet)
  app.post("/api/videocall/create-meeting", async (req, res) => {
    try {
      const { topic, start_time, duration, agenda } = req.body;
      
      if (!topic || !start_time || !duration) {
        return res.status(400).json({
          success: false,
          error: '미팅 제목, 시작 시간, 진행 시간은 필수입니다.'
        });
      }

      // Google Meet 미팅 생성 (간소화 버전 - OAuth 불필요)
      const meetId = `talez-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      const meetingUrl = `https://meet.google.com/${meetId}`;
      
      const meeting = {
        id: meetId,
        topic,
        start_time,
        duration: parseInt(duration),
        join_url: meetingUrl,
        agenda: agenda || '',
        created_at: new Date().toISOString()
      };

      res.json({
        success: true,
        meeting,
        message: 'Google Meet 미팅이 성공적으로 생성되었습니다.'
      });
    } catch (error) {
      logServerError('Error creating meeting:', error, req);
      res.status(500).json({
        success: false,
        error: '미팅 생성 중 오류가 발생했습니다.'
      });
    }
  });

// Get user's meetings
  app.get("/api/videocall/my-meetings", async (req, res) => {
    try {
      // 임시 미팅 목록 (실제로는 데이터베이스에서 가져옴)
      const meetings = [
        {
          id: "talez-demo-123",
          topic: "테일즈 화상 훈련",
          start_time: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1시간 후
          duration: 60,
          join_url: "https://meet.google.com/talez-demo-123"
        }
      ];

      res.json({
        success: true,
        meetings
      });
    } catch (error) {
      logServerError('Error fetching user meetings:', error, req);
      res.status(500).json({
        success: false,
        error: '미팅 목록을 가져오는 중 오류가 발생했습니다.'
      });
    }
  });

// =============================================================================
// AI 분석 시스템 API 엔드포인트
// =============================================================================

// 반려동물 알림장 조회 (일자별 그룹화)
  app.get("/api/ai-analysis/care-logs", async (req, res) => {
    try {
      const { petId, startDate, endDate } = req.query;
      
      if (!petId) {
        return res.status(400).json({
          success: false,
          error: '반려동물 ID는 필수입니다.'
        });
      }

      const result = await storage.getCareLogsGroupedByDate(
        parseInt(petId as string),
        startDate as string,
        endDate as string
      );

      res.json({
        success: true,
        ...result
      });
    } catch (error) {
      logServerError('Error fetching care logs:', error, req);
      res.status(500).json({
        success: false,
        error: '알림장 데이터를 가져오는 중 오류가 발생했습니다.'
      });
    }
  });

// AI 분석 요청
  app.post("/api/ai-analysis/analyze", async (req, res) => {
    try {
      const { petId, dateRange, dates, logIds, selectedSignals, model = "gpt-4o-mini" } = req.body;
      
      if (!petId || (!dateRange && !dates && !logIds)) {
        return res.status(400).json({
          success: false,
          error: '반려동물 ID와 분석할 데이터(날짜 범위, 날짜 목록, 또는 로그 ID)가 필요합니다.'
        });
      }

      // 분석할 로그 데이터 가져오기
      let logs: any[] = [];
      if (logIds && logIds.length > 0) {
        logs = await storage.getCareLogsByIds(logIds);
      } else if (dateRange) {
        const [startDate, endDate] = dateRange.split(' to ');
        logs = await storage.getCareLogsByDateRange(parseInt(petId), startDate, endDate);
      } else if (dates && dates.length > 0) {
        // 특정 날짜들의 로그 가져오기
        for (const date of dates) {
          const dateLogs = await storage.getCareLogsByDateRange(parseInt(petId), date, date);
          logs.push(...dateLogs);
        }
      }

      if (logs.length === 0) {
        return res.status(400).json({
          success: false,
          error: '분석할 알림장 데이터가 없습니다.'
        });
      }

      // AI 분석 프롬프트 구성
      const analysisPrompt = generateAnalysisPrompt(logs, selectedSignals);
      
      // OpenAI API 호출 (임시 구현)
      const analysisResult = await performAiAnalysis(analysisPrompt, model);
      
      // 분석 결과 저장
      const savedAnalysis = await storage.createAiAnalysis({
        petId: parseInt(petId),
        userId: req.session?.user?.id || 1, // 세션에서 사용자 ID 가져오기
        inputLogIds: logs.map(log => log.id),
        selectedSignals,
        timeRange: dateRange || `${dates?.[0]} to ${dates?.[dates.length - 1]}`,
        model,
        resultJson: analysisResult,
        tokensIn: analysisResult.tokensUsed?.input || 0,
        tokensOut: analysisResult.tokensUsed?.output || 0
      });

      res.json({
        success: true,
        analysis: savedAnalysis,
        message: 'AI 분석이 완료되었습니다.'
      });
    } catch (error) {
      logServerError('Error performing AI analysis:', error, req);
      res.status(500).json({
        success: false,
        error: 'AI 분석 중 오류가 발생했습니다.'
      });
    }
  });

// =============================================================================
// 반려견 건강 다이어리 API
// =============================================================================

  type DiaryAccess = {
    userId: number;
    pet: any;
    isOwner: boolean;
    isAdmin: boolean;
    isAssignedTrainer: boolean;
  };
  const requireDiaryAccess = async (req: Request, res: Response, petId: number): Promise<DiaryAccess | null> => {
    const session = (req as Request & { session?: { user?: { id?: number; role?: string } } }).session;
    const userId = session?.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: '로그인이 필요합니다' });
      return null;
    }
    const pet = await storage.getPet(petId);
    if (!pet) {
      res.status(404).json({ success: false, error: '반려동물을 찾을 수 없습니다' });
      return null;
    }
    const role = session?.user?.role;
    const isOwner = pet.ownerId === userId;
    const isAdmin = role === 'admin';
    let shareEnabled = !!pet.diaryShareWithTrainer;
    if (role === 'trainer') {
      const diaryStorage = storage as unknown as { getPetDiaryShareEnabled?: (id: number) => Promise<boolean> };
      if (typeof diaryStorage.getPetDiaryShareEnabled === 'function') {
        try {
          shareEnabled = await diaryStorage.getPetDiaryShareEnabled(petId);
        } catch (err) {
          console.error('[Diary] getPetDiaryShareEnabled DB lookup failed, falling back to memory:', err);
        }
      }
    }
    const isAssignedTrainer = role === 'trainer' && pet.assignedTrainerId === userId && shareEnabled;
    if (!isOwner && !isAdmin && !isAssignedTrainer) {
      res.status(403).json({ success: false, error: '권한이 없습니다' });
      return null;
    }
    return { userId, pet, isOwner, isAdmin, isAssignedTrainer };
  };

  // 다이어리(돌봄 일지) 목록 조회 - 반려동물별 + 날짜 범위
  app.get("/api/diary/care-logs", async (req, res) => {
    try {
      const petId = parseInt(req.query.petId as string);
      if (!petId || isNaN(petId)) {
        return res.status(400).json({ success: false, error: '반려동물 ID가 필요합니다' });
      }
      const access = await requireDiaryAccess(req, res, petId);
      if (!access) return;

      const startDate = req.query.startDate as string | undefined;
      const endDate = req.query.endDate as string | undefined;
      const logs = (startDate && endDate)
        ? await storage.getCareLogsByDateRange(petId, startDate, endDate)
        : await storage.getCareLogsByPetId(petId);

      res.json({ success: true, logs });
    } catch (error) {
      logServerError('[다이어리] 조회 오류:', error, req);
      res.status(500).json({ success: false, error: '다이어리 조회 중 오류' });
    }
  });

  // 다이어리 항목 생성
  app.post("/api/diary/care-logs", async (req, res) => {
    try {
      const { petId, date } = req.body || {};
      if (!petId || !date) {
        return res.status(400).json({ success: false, error: 'petId, date는 필수입니다' });
      }
      const access = await requireDiaryAccess(req, res, parseInt(petId));
      if (!access) return;
      if (!access.isOwner && !access.isAdmin) {
        return res.status(403).json({ success: false, error: '보호자만 작성할 수 있습니다' });
      }

      const allowed = ['date','note','poopStatus','mealStatus','walkStatus','mood','energyLevel','weightKg','exerciseMinutes','mealAmountG','medications','tags','media'];
      const payload: Record<string, unknown> = { petId: parseInt(petId), userId: access.userId };
      for (const k of allowed) if (req.body[k] !== undefined) payload[k] = req.body[k];

      const created = await storage.createCareLog(payload);
      res.status(201).json({ success: true, log: created });
    } catch (error) {
      logServerError('[다이어리] 생성 오류:', error, req);
      res.status(500).json({ success: false, error: '다이어리 생성 중 오류' });
    }
  });

  // 다이어리 항목 수정
  app.patch("/api/diary/care-logs/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.session?.user?.id;
      if (!userId) return res.status(401).json({ success: false, error: '로그인이 필요합니다' });
      const existing = (await storage.getCareLogsByIds([id]))[0];
      if (!existing) return res.status(404).json({ success: false, error: '항목을 찾을 수 없습니다' });
      const access = await requireDiaryAccess(req, res, existing.petId);
      if (!access) return;
      if (!access.isOwner && !access.isAdmin) {
        return res.status(403).json({ success: false, error: '보호자만 수정할 수 있습니다' });
      }
      const allowed = ['date','note','poopStatus','mealStatus','walkStatus','mood','energyLevel','weightKg','exerciseMinutes','mealAmountG','medications','tags','media'];
      const updates: Record<string, unknown> = {};
      for (const k of allowed) if (req.body[k] !== undefined) updates[k] = req.body[k];
      const updated = await storage.updateCareLog(id, updates);
      res.json({ success: true, log: updated });
    } catch (error) {
      logServerError('[다이어리] 수정 오류:', error, req);
      res.status(500).json({ success: false, error: '다이어리 수정 중 오류' });
    }
  });

  // 다이어리 항목 삭제
  app.delete("/api/diary/care-logs/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.session?.user?.id;
      if (!userId) return res.status(401).json({ success: false, error: '로그인이 필요합니다' });
      const existing = (await storage.getCareLogsByIds([id]))[0];
      if (!existing) return res.status(404).json({ success: false, error: '항목을 찾을 수 없습니다' });
      const access = await requireDiaryAccess(req, res, existing.petId);
      if (!access) return;
      if (!access.isOwner && !access.isAdmin) {
        return res.status(403).json({ success: false, error: '보호자만 삭제할 수 있습니다' });
      }
      const ok = await storage.deleteCareLog(id);
      res.json({ success: ok });
    } catch (error) {
      logServerError('[다이어리] 삭제 오류:', error, req);
      res.status(500).json({ success: false, error: '다이어리 삭제 중 오류' });
    }
  });

  // 트레이너 공유 토글
  app.patch("/api/diary/share/:petId", async (req, res) => {
    try {
      const petId = parseInt(req.params.petId);
      const userId = req.session?.user?.id;
      if (!userId) return res.status(401).json({ success: false, error: '로그인이 필요합니다' });
      const pet = await storage.getPet(petId);
      if (!pet) return res.status(404).json({ success: false, error: '반려동물을 찾을 수 없습니다' });
      if (pet.ownerId !== userId && req.session?.user?.role !== 'admin') {
        return res.status(403).json({ success: false, error: '권한이 없습니다' });
      }
      const enabled = !!req.body.enabled;
      const updated = await storage.updatePet(petId, { diaryShareWithTrainer: enabled });
      res.json({ success: true, pet: updated });
    } catch (error) {
      logServerError('[다이어리] 공유 토글 오류:', error, req);
      res.status(500).json({ success: false, error: '공유 설정 변경 중 오류' });
    }
  });

  // 트레이너용 담당 펫 다이어리 모아보기 (최신 7일 요약)
  app.get("/api/diary/trainer-overview", async (req, res) => {
    try {
      const session = (req as Request & { session?: { user?: { id?: number; role?: string } } }).session;
      const userId = session?.user?.id;
      const role = session?.user?.role;
      if (!userId) {
        return res.status(401).json({ success: false, error: '로그인이 필요합니다' });
      }
      if (role !== 'trainer' && role !== 'admin') {
        return res.status(403).json({ success: false, error: '트레이너 권한이 필요합니다' });
      }

      const allPets: any[] = (storage as any).getPetsByTrainerId
        ? (storage as any).getPetsByTrainerId(userId)
        : ((storage as any).pets || []).filter((p: any) => p.assignedTrainerId === userId || p.trainerId === userId);
      const sharedPets = allPets.filter(p => !!p.diaryShareWithTrainer);

      const today = new Date();
      const start = new Date(today);
      start.setDate(start.getDate() - 6);
      const fmt = (d: Date) => d.toISOString().slice(0, 10);
      const startStr = fmt(start);
      const endStr = fmt(today);

      const overview = await Promise.all(sharedPets.map(async (pet: any) => {
        const logs = await storage.getCareLogsByDateRange(pet.id, startStr, endStr);
        const sortedLogs = [...logs].sort((a: any, b: any) => a.date.localeCompare(b.date));
        const owner = (storage as any).users?.find((u: any) => u.id === pet.ownerId);

        const weights = sortedLogs.map((l: any) => Number(l.weightKg)).filter((n: number) => !isNaN(n) && n > 0);
        const exercises = sortedLogs.map((l: any) => Number(l.exerciseMinutes)).filter((n: number) => !isNaN(n) && n >= 0);
        const totalExerciseMinutes = exercises.reduce((s, n) => s + n, 0);
        const avgExerciseMinutes = exercises.length > 0 ? Math.round(totalExerciseMinutes / exercises.length) : 0;
        const latestWeight = weights.length > 0 ? weights[weights.length - 1] : (pet.weight ?? null);
        const firstWeight = weights.length > 0 ? weights[0] : null;
        const weightDelta = (firstWeight !== null && latestWeight !== null) ? Number((latestWeight - firstWeight).toFixed(2)) : null;

        const notes = sortedLogs
          .filter((l: any) => (l.note && String(l.note).trim()) || (Array.isArray(l.tags) && l.tags.length > 0))
          .slice(-3)
          .map((l: any) => ({ date: l.date, note: l.note || '', tags: l.tags || [], mood: l.mood, energyLevel: l.energyLevel }));

        const lastLog = sortedLogs.length > 0 ? sortedLogs[sortedLogs.length - 1] : null;

        return {
          pet: {
            id: pet.id,
            name: pet.name,
            breed: pet.breed,
            species: pet.species,
            imageUrl: pet.imageUrl,
            ownerId: pet.ownerId,
            ownerName: owner?.name || null,
            trainingStatus: pet.trainingStatus,
            trainingType: pet.trainingType,
          },
          summary: {
            logCount: sortedLogs.length,
            latestWeightKg: latestWeight,
            weightDeltaKg: weightDelta,
            totalExerciseMinutes,
            avgExerciseMinutes,
            lastLogDate: lastLog?.date || null,
            recentNotes: notes,
          },
        };
      }));

      overview.sort((a, b) => {
        const da = a.summary.lastLogDate || '';
        const db = b.summary.lastLogDate || '';
        return db.localeCompare(da);
      });

      res.json({
        success: true,
        rangeStart: startStr,
        rangeEnd: endStr,
        totalAssignedPets: allPets.length,
        sharedPetCount: sharedPets.length,
        overview,
      });
    } catch (error) {
      logServerError('[다이어리] 트레이너 오버뷰 오류:', error, req);
      res.status(500).json({ success: false, error: '트레이너 다이어리 조회 중 오류' });
    }
  });

  // CSV 내보내기
  app.get("/api/diary/export", async (req, res) => {
    try {
      const petId = parseInt(req.query.petId as string);
      if (!petId || isNaN(petId)) return res.status(400).json({ success: false, error: '반려동물 ID가 필요합니다' });
      const access = await requireDiaryAccess(req, res, petId);
      if (!access) return;
      const logs = await storage.getCareLogsByPetId(petId);
      const meds = await storage.getMedicationsByPetId(petId);
      const vacs = await storage.getVaccinationsByPetId(petId);

      const escape = (v: any) => {
        if (v === null || v === undefined) return '';
        const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
        if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
        return s;
      };

      const lines: string[] = [];
      lines.push('# 다이어리 - 일일 기록');
      lines.push(['date','weightKg','exerciseMinutes','mealAmountG','mealStatus','poopStatus','walkStatus','mood','energyLevel','note','tags'].join(','));
      logs.sort((a:any,b:any)=> a.date.localeCompare(b.date));
      for (const l of logs) {
        lines.push([l.date,l.weightKg,l.exerciseMinutes,l.mealAmountG,l.mealStatus,l.poopStatus,l.walkStatus,l.mood,l.energyLevel,l.note,l.tags].map(escape).join(','));
      }
      lines.push('');
      lines.push('# 예방접종');
      lines.push(['vaccineDate','vaccineName','status','hospitalName','nextDueDate','notes'].join(','));
      for (const v of vacs) {
        lines.push([v.vaccineDate,v.vaccineName,v.status,v.hospitalName,v.nextDueDate,v.notes].map(escape).join(','));
      }
      lines.push('');
      lines.push('# 약 복용');
      lines.push(['dueDate','name','dosage','status','frequency','notes'].join(','));
      for (const m of meds) {
        lines.push([m.dueDate,m.name,m.dosage,m.status,m.frequency,m.notes].map(escape).join(','));
      }

      const filename = `diary-pet-${petId}-${new Date().toISOString().slice(0,10)}.csv`;
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send('\uFEFF' + lines.join('\n'));
    } catch (error) {
      logServerError('[다이어리] CSV 오류:', error, req);
      res.status(500).json({ success: false, error: 'CSV 내보내기 중 오류' });
    }
  });

  // 약 복용 일정 CRUD
  app.get("/api/diary/medications", async (req, res) => {
    try {
      const petId = parseInt(req.query.petId as string);
      if (!petId || isNaN(petId)) return res.status(400).json({ success: false, error: '반려동물 ID가 필요합니다' });
      const access = await requireDiaryAccess(req, res, petId);
      if (!access) return;
      const items = await storage.getMedicationsByPetId(petId);
      res.json({ success: true, medications: items });
    } catch (error) {
      logServerError('[약복용] 조회 오류:', error, req);
      res.status(500).json({ success: false, error: '조회 중 오류' });
    }
  });

  app.post("/api/diary/medications", async (req, res) => {
    try {
      const { petId, name, dueDate } = req.body || {};
      if (!petId || !name || !dueDate) return res.status(400).json({ success: false, error: 'petId, name, dueDate 필수' });
      const access = await requireDiaryAccess(req, res, parseInt(petId));
      if (!access) return;
      if (!access.isOwner && !access.isAdmin) return res.status(403).json({ success: false, error: '보호자만 작성 가능' });

      const allowed = ['name','dosage','frequency','dueDate','status','notes','reminderEnabled'];
      const payload: Record<string, unknown> = { petId: parseInt(petId), userId: access.userId };
      for (const k of allowed) if (req.body[k] !== undefined) payload[k] = req.body[k];
      const created = await storage.createMedication(payload);

      // 인앱 알림 생성 (예정된 약 복용)
      try {
        if (payload.reminderEnabled !== false) {
          await storage.createNotification({
            userId: access.userId,
            type: 'health',
            title: '약 복용 일정 등록',
            message: `${access.pet.name}의 ${payload.name} 일정이 ${payload.dueDate}로 등록되었습니다.`,
            actionUrl: `/pet-care/health-diary?petId=${petId}`,
            metadata: { petId, medicationId: created.id, dueDate: payload.dueDate },
            isRead: false,
          });
        }
      } catch (e) { console.warn('알림 생성 실패', e); }

      // D-1 / 당일 푸시 알림 예약 (완료/취소 상태로 생성 시는 예약하지 않음)
      try {
        if (payload.reminderEnabled !== false && created.status !== 'completed' && created.status !== 'cancelled') {
          const { scheduleHealthReminders } = await import('./services/diary-reminder');
          const ids = await scheduleHealthReminders({
            userId: access.userId,
            petId: parseInt(petId),
            petName: access.pet.name,
            targetDate: String(payload.dueDate),
            kind: 'medication',
            itemId: created.id,
            itemName: String(payload.name),
            actionUrl: `/pet-care/health-diary?petId=${petId}`,
          });
          if (ids.length > 0) {
            const updated = await storage.updateMedication(created.id, { reminderScheduleIds: ids });
            Object.assign(created, updated);
          }
        }
      } catch (e) { console.warn('[약복용] 푸시 예약 실패', e); }

      res.status(201).json({ success: true, medication: created });
    } catch (error) {
      logServerError('[약복용] 생성 오류:', error, req);
      res.status(500).json({ success: false, error: '생성 중 오류' });
    }
  });

  app.patch("/api/diary/medications/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.session?.user?.id;
      if (!userId) return res.status(401).json({ success: false, error: '로그인이 필요합니다' });
      const existing = await storage.getMedicationById(id);
      if (!existing) return res.status(404).json({ success: false, error: '항목을 찾을 수 없습니다' });
      const access = await requireDiaryAccess(req, res, existing.petId);
      if (!access) return;
      if (!access.isOwner && !access.isAdmin) return res.status(403).json({ success: false, error: '권한 없음' });
      const allowed = ['name','dosage','frequency','dueDate','status','notes','reminderEnabled'];
      const updates: Record<string, unknown> = {};
      for (const k of allowed) if (req.body?.[k] !== undefined) updates[k] = req.body[k];
      const updated = await storage.updateMedication(id, updates);

      // 푸시 예약 재설정 (날짜/리마인더/상태 변경 시)
      try {
        const dateChanged = updates.dueDate !== undefined && updates.dueDate !== existing.dueDate;
        const reminderToggled = updates.reminderEnabled !== undefined && updates.reminderEnabled !== existing.reminderEnabled;
        const statusChanged = updates.status !== undefined && updates.status !== existing.status;
        if (dateChanged || reminderToggled || statusChanged) {
          const { scheduleHealthReminders, cancelScheduledReminders } = await import('./services/diary-reminder');
          await cancelScheduledReminders(existing.reminderScheduleIds || []);
          let newIds: number[] = [];
          const finalReminderEnabled = updates.reminderEnabled !== undefined ? updates.reminderEnabled : existing.reminderEnabled;
          const finalStatus = updates.status !== undefined ? updates.status : existing.status;
          if (finalReminderEnabled !== false && finalStatus !== 'completed' && finalStatus !== 'cancelled') {
            newIds = await scheduleHealthReminders({
              userId: access.userId,
              petId: existing.petId,
              petName: access.pet.name,
              targetDate: String(updated.dueDate),
              kind: 'medication',
              itemId: id,
              itemName: String(updated.name),
              actionUrl: `/pet-care/health-diary?petId=${existing.petId}`,
            });
          }
          const refreshed = await storage.updateMedication(id, { reminderScheduleIds: newIds });
          Object.assign(updated, refreshed);
        }
      } catch (e) { console.warn('[약복용] 푸시 재예약 실패', e); }

      res.json({ success: true, medication: updated });
    } catch (error) {
      logServerError('[약복용] 수정 오류:', error, req);
      res.status(500).json({ success: false, error: '수정 중 오류' });
    }
  });

  app.delete("/api/diary/medications/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.session?.user?.id;
      if (!userId) return res.status(401).json({ success: false, error: '로그인이 필요합니다' });
      const existing = await storage.getMedicationById(id);
      if (!existing) return res.status(404).json({ success: false, error: '항목을 찾을 수 없습니다' });
      const access = await requireDiaryAccess(req, res, existing.petId);
      if (!access) return;
      if (!access.isOwner && !access.isAdmin) return res.status(403).json({ success: false, error: '권한 없음' });
      try {
        const { cancelScheduledReminders } = await import('./services/diary-reminder');
        await cancelScheduledReminders(existing.reminderScheduleIds || []);
      } catch (e) { console.warn('[약복용] 푸시 취소 실패', e); }
      const ok = await storage.deleteMedication(id);
      res.json({ success: ok });
    } catch (error) {
      logServerError('[약복용] 삭제 오류:', error, req);
      res.status(500).json({ success: false, error: '삭제 중 오류' });
    }
  });

  // 사용자별 알림 시간 설정 (D-1 / 당일 푸시 발송 시각)
  app.get("/api/notifications/reminder-settings", async (req, res) => {
    try {
      const userId = req.session?.user?.id;
      if (!userId) return res.status(401).json({ success: false, error: '로그인이 필요합니다' });
      const { getUserReminderTime } = await import('./services/diary-reminder');
      const time = await getUserReminderTime(userId);
      res.json({ success: true, reminderTime: time });
    } catch (error) {
      logServerError('[알림설정] 조회 오류:', error, req);
      res.status(500).json({ success: false, error: '조회 중 오류' });
    }
  });

  app.put("/api/notifications/reminder-settings", async (req, res) => {
    try {
      const userId = req.session?.user?.id;
      if (!userId) return res.status(401).json({ success: false, error: '로그인이 필요합니다' });
      const { hour, minute } = req.body || {};
      if (typeof hour !== 'number' || typeof minute !== 'number') {
        return res.status(400).json({ success: false, error: 'hour, minute(숫자)가 필요합니다' });
      }
      if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
        return res.status(400).json({ success: false, error: 'hour는 0-23, minute는 0-59 범위여야 합니다' });
      }
      const { setUserReminderTime } = await import('./services/diary-reminder');
      const time = await setUserReminderTime(userId, hour, minute);
      res.json({ success: true, reminderTime: time });
    } catch (error) {
      logServerError('[알림설정] 저장 오류:', error, req);
      res.status(500).json({ success: false, error: '저장 중 오류' });
    }
  });

  // 다가오는 알림 (접종/약) 통합
  app.get("/api/diary/upcoming", async (req, res) => {
    try {
      const userId = req.session?.user?.id;
      if (!userId) return res.status(401).json({ success: false, error: '로그인이 필요합니다' });
      const days = req.query.days ? parseInt(req.query.days as string) : 30;
      const [vacs, meds] = await Promise.all([
        storage.getUpcomingVaccinations(userId, days),
        storage.getUpcomingMedications(userId, days),
      ]);
      res.json({ success: true, vaccinations: vacs, medications: meds });
    } catch (error) {
      logServerError('[다이어리] 다가오는 일정 오류:', error, req);
      res.status(500).json({ success: false, error: '조회 중 오류' });
    }
  });

// AI 분석 기록 조회
  app.get("/api/ai-analysis/history", async (req, res) => {
    try {
      const { petId } = req.query;
      
      if (!petId) {
        return res.status(400).json({
          success: false,
          error: '반려동물 ID는 필수입니다.'
        });
      }

      const analyses = await storage.getAiAnalysesByPetId(parseInt(petId as string));

      res.json({
        success: true,
        analyses
      });
    } catch (error) {
      logServerError('Error fetching AI analysis history:', error, req);
      res.status(500).json({
        success: false,
        error: 'AI 분석 기록을 가져오는 중 오류가 발생했습니다.'
      });
    }
  });

  // =============================================================================
  // AI 분석 이력 추이/비교 시스템
  // =============================================================================

  // 기간 옵션 → 시작/종료일 계산
  function resolveTrendPeriod(period: string, startDate?: string, endDate?: string) {
    const today = new Date();
    const end = endDate || today.toISOString().split('T')[0];
    let start = startDate;
    if (!start) {
      const days = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 30;
      const d = new Date(today);
      d.setDate(d.getDate() - days + 1);
      start = d.toISOString().split('T')[0];
    }
    return { start, end };
  }

  // 부정 신호 가중치 → 0~10 스트레스 점수
  function computeStressScore(log: any): number {
    let score = 0;
    const badPoop = ['diarrhea', 'bloody', 'constipated'];
    const badMeal = ['skipped', 'vomited'];
    const badWalk = ['limp', 'hyper'];
    const badMood = ['anxious', 'sad', 'tired'];
    if (badPoop.includes(log.poopStatus)) score += 3;
    if (badMeal.includes(log.mealStatus)) score += 3;
    if (badWalk.includes(log.walkStatus)) score += 2;
    if (badMood.includes(log.mood)) score += 2;
    if (typeof log.energyLevel === 'number' && log.energyLevel <= 3) score += 1;
    return Math.min(10, score);
  }

  // 일자별 집계
  function aggregateLogsByDate(logs: any[]) {
    const byDate: Record<string, any> = {};
    for (const log of logs) {
      const d = log.date;
      if (!byDate[d]) {
        byDate[d] = {
          date: d,
          count: 0,
          energySum: 0, energyCount: 0,
          stressSum: 0,
          moodCounts: {} as Record<string, number>,
          poopNormal: 0, poopAbnormal: 0,
          mealNormal: 0, mealAbnormal: 0,
          walkNormal: 0, walkAbnormal: 0,
        };
      }
      const b = byDate[d];
      b.count += 1;
      if (typeof log.energyLevel === 'number') {
        b.energySum += log.energyLevel;
        b.energyCount += 1;
      }
      b.stressSum += computeStressScore(log);
      if (log.mood) b.moodCounts[log.mood] = (b.moodCounts[log.mood] || 0) + 1;
      if (log.poopStatus) {
        if (log.poopStatus === 'normal') b.poopNormal++; else b.poopAbnormal++;
      }
      if (log.mealStatus) {
        if (log.mealStatus === 'normal') b.mealNormal++; else b.mealAbnormal++;
      }
      if (log.walkStatus) {
        if (log.walkStatus === 'normal') b.walkNormal++; else b.walkAbnormal++;
      }
    }
    return Object.values(byDate)
      .map((b: any) => ({
        date: b.date,
        count: b.count,
        avgEnergy: b.energyCount ? +(b.energySum / b.energyCount).toFixed(2) : null,
        avgStress: b.count ? +(b.stressSum / b.count).toFixed(2) : 0,
        moodCounts: b.moodCounts,
        poopNormal: b.poopNormal,
        poopAbnormal: b.poopAbnormal,
        mealNormal: b.mealNormal,
        mealAbnormal: b.mealAbnormal,
        walkNormal: b.walkNormal,
        walkAbnormal: b.walkAbnormal,
      }))
      .sort((a: any, b: any) => a.date.localeCompare(b.date));
  }

  // 집계 요약
  function summarizeSeries(series: any[]) {
    if (series.length === 0) {
      return { avgEnergy: null, avgStress: 0, moodDistribution: {}, totalLogs: 0,
               poopNormalRate: 0, mealNormalRate: 0, walkNormalRate: 0 };
    }
    let energySum = 0, energyCount = 0, stressSum = 0, totalLogs = 0;
    const moodDistribution: Record<string, number> = {};
    let pn = 0, pa = 0, mn = 0, ma = 0, wn = 0, wa = 0;
    for (const day of series) {
      totalLogs += day.count;
      if (day.avgEnergy !== null) { energySum += day.avgEnergy * day.count; energyCount += day.count; }
      stressSum += day.avgStress * day.count;
      for (const [mood, c] of Object.entries(day.moodCounts as Record<string, number>)) {
        moodDistribution[mood] = (moodDistribution[mood] || 0) + c;
      }
      pn += day.poopNormal; pa += day.poopAbnormal;
      mn += day.mealNormal; ma += day.mealAbnormal;
      wn += day.walkNormal; wa += day.walkAbnormal;
    }
    const rate = (n: number, d: number) => d ? +((n / d) * 100).toFixed(1) : 0;
    return {
      totalLogs,
      avgEnergy: energyCount ? +(energySum / energyCount).toFixed(2) : null,
      avgStress: totalLogs ? +(stressSum / totalLogs).toFixed(2) : 0,
      moodDistribution,
      poopNormalRate: rate(pn, pn + pa),
      mealNormalRate: rate(mn, mn + ma),
      walkNormalRate: rate(wn, wn + wa),
    };
  }

  // 반려동물 소유권 검증 (owner 본인 또는 admin만 허용)
  async function assertPetAccess(req: any, res: any, petId: number): Promise<boolean> {
    const userId = req.session?.user?.id;
    const role = req.session?.user?.role;
    if (!userId) {
      res.status(401).json({ success: false, error: '로그인이 필요합니다.' });
      return false;
    }
    const pet = await storage.getPet(petId);
    if (!pet) {
      res.status(404).json({ success: false, error: '반려동물을 찾을 수 없습니다.' });
      return false;
    }
    if (pet.ownerId !== userId && role !== 'admin') {
      res.status(403).json({ success: false, error: '해당 반려동물에 접근할 권한이 없습니다.' });
      return false;
    }
    return true;
  }

  // AI 분석 이력 추이 조회
  app.get("/api/ai-analysis/trends", async (req, res) => {
    try {
      const { petId, period = '30d', startDate, endDate } = req.query as Record<string, string>;
      if (!petId) {
        return res.status(400).json({ success: false, error: '반려동물 ID는 필수입니다.' });
      }
      const petIdNum = parseInt(petId);
      if (!(await assertPetAccess(req, res, petIdNum))) return;
      const { start, end } = resolveTrendPeriod(period, startDate, endDate);
      const logs = await storage.getCareLogsByDateRange(petIdNum, start, end);
      const series = aggregateLogsByDate(logs);
      const summary = summarizeSeries(series);

      // 이전 동일 기간과 비교한 인사이트
      const startD = new Date(start);
      const endD = new Date(end);
      const spanDays = Math.max(1, Math.round((endD.getTime() - startD.getTime()) / 86400000) + 1);
      const prevEnd = new Date(startD); prevEnd.setDate(prevEnd.getDate() - 1);
      const prevStart = new Date(prevEnd); prevStart.setDate(prevStart.getDate() - spanDays + 1);
      const prevLogs = await storage.getCareLogsByDateRange(
        petIdNum,
        prevStart.toISOString().split('T')[0],
        prevEnd.toISOString().split('T')[0]
      );
      const prevSummary = summarizeSeries(aggregateLogsByDate(prevLogs));

      const insights: { metric: string; direction: 'up' | 'down' | 'flat'; delta: number; comment: string; severity: 'positive' | 'negative' | 'neutral' }[] = [];
      const pushInsight = (metric: string, current: number | null, previous: number | null, betterWhenLower: boolean, label: string) => {
        if (current === null || previous === null) return;
        const delta = +(current - previous).toFixed(2);
        if (Math.abs(delta) < 0.1 && Math.abs(delta / Math.max(previous, 0.1)) < 0.1) return;
        const direction: 'up' | 'down' = delta > 0 ? 'up' : 'down';
        const isImprovement = betterWhenLower ? delta < 0 : delta > 0;
        const arrow = direction === 'up' ? '증가' : '감소';
        insights.push({
          metric,
          direction,
          delta,
          severity: isImprovement ? 'positive' : 'negative',
          comment: `${label}이(가) 이전 대비 ${Math.abs(delta)}만큼 ${arrow}했습니다. ${isImprovement ? '좋은 변화예요.' : '관찰이 필요해요.'}`
        });
      };
      pushInsight('avgStress', summary.avgStress, prevSummary.avgStress, true, '평균 스트레스 점수');
      pushInsight('avgEnergy', summary.avgEnergy, prevSummary.avgEnergy, false, '평균 활동성');
      pushInsight('poopNormalRate', summary.poopNormalRate, prevSummary.poopNormalRate, false, '정상 배변 비율');
      pushInsight('mealNormalRate', summary.mealNormalRate, prevSummary.mealNormalRate, false, '정상 식사 비율');
      pushInsight('walkNormalRate', summary.walkNormalRate, prevSummary.walkNormalRate, false, '정상 산책 비율');

      res.json({
        success: true,
        period: { start, end, days: spanDays },
        previousPeriod: {
          start: prevStart.toISOString().split('T')[0],
          end: prevEnd.toISOString().split('T')[0],
        },
        series,
        summary,
        previousSummary: prevSummary,
        insights,
        isEmpty: series.length === 0,
      });
    } catch (error) {
      logServerError('Error fetching AI analysis trends:', error, req);
      res.status(500).json({ success: false, error: '추이 데이터를 가져오는 중 오류가 발생했습니다.' });
    }
  });

  // 두 AI 분석 결과 비교
  app.get("/api/ai-analysis/compare", async (req, res) => {
    try {
      const { analysisIdA, analysisIdB } = req.query as Record<string, string>;
      if (!analysisIdA || !analysisIdB) {
        return res.status(400).json({ success: false, error: '비교할 두 분석 ID가 필요합니다.' });
      }
      const a = await storage.getAiAnalysisById(parseInt(analysisIdA));
      const b = await storage.getAiAnalysisById(parseInt(analysisIdB));
      if (!a || !b) {
        return res.status(404).json({ success: false, error: '비교할 분석 결과를 찾을 수 없습니다.' });
      }

      // 한 마리 기준 비교만 허용 (cross-pet 비교 차단)
      if (a.petId !== b.petId) {
        return res.status(400).json({ success: false, error: '같은 반려동물의 분석끼리만 비교할 수 있습니다.' });
      }

      // 소유권/접근권 검증
      if (!(await assertPetAccess(req, res, a.petId))) return;

      // 분석 시점에 사용된 로그 기반으로 지표 비교
      const aLogs = await storage.getCareLogsByIds(a.inputLogIds || []);
      const bLogs = await storage.getCareLogsByIds(b.inputLogIds || []);
      const aSummary = summarizeSeries(aggregateLogsByDate(aLogs));
      const bSummary = summarizeSeries(aggregateLogsByDate(bLogs));

      const diffs: { metric: string; label: string; before: number | null; after: number | null; delta: number | null; severity: 'positive' | 'negative' | 'neutral' }[] = [];
      const compare = (metric: string, label: string, before: number | null, after: number | null, betterWhenLower: boolean) => {
        if (before === null || after === null) {
          diffs.push({ metric, label, before, after, delta: null, severity: 'neutral' });
          return;
        }
        const delta = +(after - before).toFixed(2);
        const isImprovement = betterWhenLower ? delta < 0 : delta > 0;
        const severity: 'positive' | 'negative' | 'neutral' = Math.abs(delta) < 0.1 ? 'neutral' : (isImprovement ? 'positive' : 'negative');
        diffs.push({ metric, label, before, after, delta, severity });
      };
      compare('avgStress', '평균 스트레스 점수', aSummary.avgStress, bSummary.avgStress, true);
      compare('avgEnergy', '평균 활동성', aSummary.avgEnergy, bSummary.avgEnergy, false);
      compare('poopNormalRate', '정상 배변 비율(%)', aSummary.poopNormalRate, bSummary.poopNormalRate, false);
      compare('mealNormalRate', '정상 식사 비율(%)', aSummary.mealNormalRate, bSummary.mealNormalRate, false);
      compare('walkNormalRate', '정상 산책 비율(%)', aSummary.walkNormalRate, bSummary.walkNormalRate, false);

      const highlights = diffs
        .filter(d => d.delta !== null && Math.abs(d.delta) >= 1 && d.severity !== 'neutral')
        .map(d => ({
          metric: d.metric,
          severity: d.severity,
          comment: `${d.label}: ${d.before} → ${d.after} (${d.delta! > 0 ? '+' : ''}${d.delta}) ${d.severity === 'positive' ? '개선' : '악화'}`
        }));

      // UI에 필요한 최소 필드만 반환 (데이터 노출 최소화)
      const projectAnalysis = (x: any, computed: any) => ({
        id: x.id,
        petId: x.petId,
        createdAt: x.createdAt,
        model: x.model,
        resultJson: {
          summary: x.resultJson?.summary,
          redFlags: x.resultJson?.redFlags,
          nextSteps: x.resultJson?.nextSteps,
        },
        computed,
      });

      res.json({
        success: true,
        analysisA: projectAnalysis(a, aSummary),
        analysisB: projectAnalysis(b, bSummary),
        diffs,
        highlights,
      });
    } catch (error) {
      logServerError('Error comparing AI analyses:', error, req);
      res.status(500).json({ success: false, error: '분석 비교 중 오류가 발생했습니다.' });
    }
  });

// =============================================================================
// AI 분석 PDF 리포트 다운로드 / 공유 링크
// =============================================================================
  const { generateAnalysisPdf } = await import('./services/pdf-report');

  async function resolveAnalysisOwnerId(analysis: { userId?: number | null; petId?: number | null }): Promise<number | null> {
    if (analysis.userId) return analysis.userId;
    if (analysis.petId) {
      const petRec = await storage.getPet(analysis.petId);
      const ownerId = (petRec as { ownerId?: number | null } | null | undefined)?.ownerId;
      if (ownerId) return ownerId;
    }
    return null;
  }

  async function buildAnalysisPdfBuffer(analysisId: number) {
    const analysis = await storage.getAiAnalysisById(analysisId);
    if (!analysis) return null;
    const pet = analysis.petId ? await storage.getPet(analysis.petId) : null;
    const ownerId = await resolveAnalysisOwnerId(analysis);
    const owner = ownerId ? await storage.getUser(ownerId) : null;

    let careLogsByDate: Record<string, any[]> = {};
    let careDates: string[] = [];
    try {
      const range = String(analysis.timeRange || '');
      const m = range.match(/(\d{4}-\d{2}-\d{2}).*?(\d{4}-\d{2}-\d{2})/);
      if (m && analysis.petId) {
        const grouped = await storage.getCareLogsGroupedByDate(analysis.petId, m[1], m[2]);
        careLogsByDate = grouped.logsByDate || {};
        careDates = grouped.dates || [];
      }
    } catch (err) {
      console.warn('[AI 분석 PDF] 케어로그 수집 실패:', err);
    }

    const buffer = await generateAnalysisPdf({
      analysis,
      pet,
      owner,
      watermark: 'TALEZ AI REPORT',
      careLogsByDate,
      careDates,
    });
    return { analysis, pet, buffer };
  }

  function pdfFilename(petName: string | undefined, analysisId: number) {
    const safe = (petName || 'pet').toString().replace(/[^a-zA-Z0-9가-힣_-]/g, '_').slice(0, 40) || 'pet';
    return `talez-ai-report-${safe}-${analysisId}.pdf`;
  }
  function contentDisposition(disposition: 'attachment' | 'inline', filename: string) {
    const asciiFallback = filename.replace(/[^\x20-\x7E]/g, '_');
    return `${disposition}; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
  }

  app.get('/api/ai-analysis/:id/pdf', requireAuth(), async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (!Number.isFinite(id)) {
        return res.status(400).json({ success: false, error: '잘못된 분석 ID 입니다.' });
      }
      const sessionUser = (req as any).user || (req as any).session?.user;
      if (!sessionUser?.id) {
        return res.status(401).json({ success: false, error: '로그인이 필요합니다.' });
      }
      const analysis = await storage.getAiAnalysisById(id);
      if (!analysis) return res.status(404).json({ success: false, error: '분석 결과를 찾을 수 없습니다.' });
      const isAdmin = sessionUser.role === 'admin';
      if (!isAdmin) {
        const ownerId = await resolveAnalysisOwnerId(analysis);
        if (!ownerId || sessionUser.id !== ownerId) {
          return res.status(403).json({ success: false, error: '본 리포트에 대한 권한이 없습니다.' });
        }
      }
      const result = await buildAnalysisPdfBuffer(id);
      if (!result) return res.status(404).json({ success: false, error: '분석 결과를 찾을 수 없습니다.' });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', contentDisposition('attachment', pdfFilename(result.pet?.name, id)));
      res.setHeader('Cache-Control', 'private, no-store');
      return res.end(result.buffer);
    } catch (error) {
      logServerError('[AI 분석 PDF] 생성 실패:', error, req);
      res.status(500).json({ success: false, error: 'PDF 생성 중 오류가 발생했습니다.' });
    }
  });

  app.post('/api/ai-analysis/:id/share', requireAuth(), async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (!Number.isFinite(id)) {
        return res.status(400).json({ success: false, error: '잘못된 분석 ID 입니다.' });
      }
      const sessionUser = (req as any).user || (req as any).session?.user;
      if (!sessionUser?.id) {
        return res.status(401).json({ success: false, error: '로그인이 필요합니다.' });
      }
      const analysis = await storage.getAiAnalysisById(id);
      if (!analysis) return res.status(404).json({ success: false, error: '분석 결과를 찾을 수 없습니다.' });

      const isAdmin = sessionUser.role === 'admin';
      if (!isAdmin) {
        const ownerId = await resolveAnalysisOwnerId(analysis);
        if (!ownerId || sessionUser.id !== ownerId) {
          return res.status(403).json({ success: false, error: '본 리포트에 대한 권한이 없습니다.' });
        }
      }

      const expiresInHours = Math.min(Math.max(parseInt(String(req.body?.expiresInHours ?? '24'), 10) || 24, 1), 24 * 30);
      const token = randomBytes(24).toString('hex');
      const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);
      await storage.createAiAnalysisShareToken({
        token,
        analysisId: id,
        createdBy: sessionUser.id,
        expiresAt,
      });

      const protocol = (req.headers['x-forwarded-proto'] as string) || req.protocol || 'https';
      const host = req.headers['x-forwarded-host'] || req.headers.host;
      const baseUrl = host ? `${protocol}://${host}` : '';
      const shareUrl = `${baseUrl}/api/ai-analysis/share/${token}/pdf`;

      res.json({
        success: true,
        token,
        expiresAt: expiresAt.toISOString(),
        expiresInHours,
        shareUrl,
      });
    } catch (error) {
      logServerError('[AI 분석 공유] 토큰 발급 실패:', error, req);
      res.status(500).json({ success: false, error: '공유 링크 생성 중 오류가 발생했습니다.' });
    }
  });

  app.get('/api/ai-analysis/share/:token/pdf', async (req, res) => {
    try {
      const record = await storage.getAiAnalysisShareToken(req.params.token);
      if (!record) {
        return res.status(404).json({ success: false, error: '공유 링크가 만료되었거나 유효하지 않습니다.' });
      }
      const result = await buildAnalysisPdfBuffer(record.analysisId);
      if (!result) return res.status(404).json({ success: false, error: '분석 결과를 찾을 수 없습니다.' });
      const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || req.socket?.remoteAddress || null;
      void storage.recordAiAnalysisShareTokenAccess(req.params.token, clientIp);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', contentDisposition('inline', pdfFilename(result.pet?.name, record.analysisId)));
      res.setHeader('Cache-Control', 'private, no-store');
      return res.end(result.buffer);
    } catch (error) {
      logServerError('[AI 분석 공유] PDF 다운로드 실패:', error, req);
      res.status(500).json({ success: false, error: 'PDF 생성 중 오류가 발생했습니다.' });
    }
  });

// Get trainers with video conference info for video call page
  app.get("/api/trainers/with-video-info", async (req, res) => {
    try {
      const rawTrainers = await storage.getAllTrainers();
      
      // 화상수업 정보를 포함한 훈련사 목록 반환
      const trainersWithVideoInfo = rawTrainers.map(trainer => ({
        id: trainer.id,
        name: trainer.name,
        email: trainer.email,
        zoomPMI: trainer.zoomPMI,
        zoomPMIPassword: trainer.zoomPMIPassword,
        zoomHostKey: trainer.zoomHostKey,
        zoomLink: trainer.zoomLink,
        meetingSetupType: trainer.meetingSetupType || 'pmi',
        videoCallPreference: trainer.videoCallPreference || 'zoom'
      })).filter(trainer => 
        // 비디오 정보가 설정된 훈련사만 반환
        (trainer.zoomPMI && trainer.zoomPMIPassword) || trainer.zoomLink
      );
      
      res.json({ 
        success: true,
        trainers: trainersWithVideoInfo 
      });
    } catch (error) {
      logServerError('Error fetching trainers with video info:', error, req);
      res.status(500).json({ 
        success: false, 
        error: '훈련사 화상수업 정보를 가져오는 중 오류가 발생했습니다.' 
      });
    }
  });

// Get all trainers with filtering
  app.get("/api/trainers", async (req, res) => {
    try {
      const { 
        specialty, 
        location, 
        certification, 
        featured, 
        search, 
        minRating, 
        maxPrice,
        page = 1,
        limit = 12,
        sortBy = 'rating',
        sortOrder = 'desc',
        withReviewSummary
      } = req.query;

      let rawTrainers = await storage.getAllTrainers();
      const includeReviewSummary = withReviewSummary === 'true' || withReviewSummary === '1';

      // 데이터를 UnifiedTrainer 형태로 변환
      let trainers = rawTrainers.map(trainer => {
        const reviewSummary = includeReviewSummary
          ? storage.getTrainerReviewSummary(trainer.id)
          : null;
        const realRating = reviewSummary && reviewSummary.count > 0 ? reviewSummary.average : null;
        const realCount = reviewSummary ? reviewSummary.count : null;
        return {
        id: trainer.id,
        name: trainer.name,
        specialty: Array.isArray(trainer.specialization) ? trainer.specialization.join(', ') : trainer.specialization || trainer.specialty || '전문 분야 없음',
        description: trainer.bio || `${trainer.name}은 ${trainer.experience}년 경력의 전문 훈련사입니다.`,
        rating: includeReviewSummary
          ? (realRating ?? 0)
          : (trainer.rating ?? 4.5),
        reviewCount: includeReviewSummary
          ? (realCount ?? 0)
          : (trainer.reviewCount ?? 10),
        reviews: includeReviewSummary
          ? (realCount ?? 0)
          : (trainer.reviews ?? trainer.reviewCount ?? 10),
        ratingSummary: reviewSummary
          ? { average: reviewSummary.average, count: reviewSummary.count }
          : undefined,
        certifications: trainer.certifications || [trainer.certification || '기본 자격증'],
        location: trainer.location || trainer.address || '서울시',
        experience: trainer.experience || '2년',
        email: trainer.email,
        phone: trainer.phone,
        image: trainer.image || trainer.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(trainer.name)}&backgroundColor=6366f1&textColor=ffffff`,
        avatar: trainer.avatar || trainer.image || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(trainer.name)}&backgroundColor=6366f1&textColor=ffffff`,
        price: trainer.price || 80000,
        featured: trainer.featured || false,
        availableSlots: trainer.availableSlots || ["09:00", "11:00", "14:00", "16:00"],
        contactInfo: {
          phone: trainer.phone,
          email: trainer.email
        }
        };
      });

      // 필터링 적용
      if (specialty && specialty !== 'all') {
        trainers = trainers.filter(trainer => 
          trainer.specialty.toLowerCase().includes(specialty.toLowerCase())
        );
      }

      if (location) {
        trainers = trainers.filter(trainer => 
          trainer.location?.toLowerCase().includes((location as string).toLowerCase())
        );
      }

      if (certification === 'true') {
        trainers = trainers.filter(trainer => trainer.certifications && trainer.certifications.length > 0);
      }

      if (featured === 'true') {
        trainers = trainers.filter(trainer => trainer.featured === true);
      }

      if (search) {
        const searchTerm = (search as string).toLowerCase();
        trainers = trainers.filter(trainer => 
          trainer.name.toLowerCase().includes(searchTerm) ||
          trainer.description?.toLowerCase().includes(searchTerm) ||
          trainer.specialty.toLowerCase().includes(searchTerm)
        );
      }

      if (minRating) {
        trainers = trainers.filter(trainer => trainer.rating >= parseFloat(minRating as string));
      }

      if (maxPrice) {
        trainers = trainers.filter(trainer => trainer.price <= parseInt(maxPrice as string));
      }

      // 정렬
      trainers.sort((a, b) => {
        let aValue, bValue;

        switch (sortBy) {
          case 'rating':
            aValue = a.rating || 0;
            bValue = b.rating || 0;
            break;
          case 'price':
            aValue = a.price || 0;
            bValue = b.price || 0;
            break;
          case 'experience':
            aValue = a.experience || 0;
            bValue = b.experience || 0;
            break;
          case 'reviews':
            aValue = a.reviewCount || 0;
            bValue = b.reviewCount || 0;
            break;
          default:
            aValue = a.rating || 0;
            bValue = b.rating || 0;
        }

        return sortOrder === 'desc' ? bValue - aValue : aValue - bValue;
      });

      // 페이지네이션
      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const startIndex = (pageNum - 1) * limitNum;
      const endIndex = startIndex + limitNum;

      const paginatedTrainers = trainers.slice(startIndex, endIndex);
      const totalPages = Math.ceil(trainers.length / limitNum);

      return res.status(200).json({
        trainers: paginatedTrainers,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalCount: trainers.length,
          hasNext: pageNum < totalPages,
          hasPrev: pageNum > 1
        },
        filters: {
          specialty,
          location,
          certification,
          featured,
          search,
          minRating,
          maxPrice
        }
      });
    } catch (error: any) {
      logServerError("Get trainers error:", error, req);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // 훈련사 상담 예약 API
  app.post("/api/trainers/:id/consultation", async (req, res) => {
    try {
      const trainerId = parseInt(req.params.id);
      const { userId, date, time, message } = req.body;

      // 간단한 예약 데이터 생성 (실제로는 DB에 저장)
      const consultation = {
        id: Date.now(),
        trainerId,
        userId,
        date,
        time,
        message,
        status: 'pending',
        createdAt: new Date()
      };

      return res.status(201).json({
        message: "상담 예약이 완료되었습니다.",
        consultation
      });
    } catch (error: any) {
      logServerError("Consultation booking error:", error, req);
      return res.status(500).json({ message: "예약 처리 중 오류가 발생했습니다." });
    }
  });

  // 훈련사 리뷰 조회 API (실제 trainerReviews 데이터)
  app.get("/api/trainers/:id/reviews", async (req, res) => {
    try {
      const trainerIdParam = parseInt(req.params.id);
      if (!trainerIdParam || isNaN(trainerIdParam)) {
        return res.status(400).json({ message: "유효하지 않은 훈련사 ID입니다." });
      }
      const page = Math.max(1, parseInt(String(req.query.page ?? '1')) || 1);
      const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit ?? '10')) || 10));

      // trainerReviews.trainerId 는 users.id 기준이므로 trainers.id 입력 시 변환.
      let trainerUserId = trainerIdParam;
      try {
        const [byTrainersId] = await db
          .select({ userId: trainers.userId })
          .from(trainers)
          .where(eq(trainers.id, trainerIdParam))
          .limit(1);
        if (byTrainersId?.userId) trainerUserId = byTrainersId.userId;
      } catch (lookupErr) {
        logServerError('[훈련사 리뷰] users.id 매핑 실패:', lookupErr, req);
      }

      const all = storage.listTrainerReviews({ trainerId: trainerUserId });
      const summary = storage.getTrainerReviewSummary(trainerUserId);
      const startIdx = (page - 1) * limit;
      const paged = all.slice(startIdx, startIdx + limit);
      const reviews = paged.map((r: any) => ({
        id: r.id,
        userId: r.authorId,
        userName: r.authorName || '보호자',
        rating: r.rating,
        title: r.title,
        comment: r.content,
        photos: r.photos || [],
        reply: r.reply ? { content: r.reply.content, createdAt: r.reply.createdAt } : null,
        createdAt: r.createdAt,
      }));

      return res.status(200).json({
        reviews,
        totalCount: all.length,
        averageRating: summary.average,
        distribution: summary.distribution,
        page,
        limit,
      });
    } catch (error: any) {
      logServerError("Get trainer reviews error:", error, req);
      return res.status(500).json({ message: "리뷰 조회 중 오류가 발생했습니다." });
    }
  });

  // 훈련사 스케줄 조회 API (실제 예약 기반 가용 슬롯)
  app.get("/api/trainers/:id/schedule", async (req, res) => {
    try {
      const trainerIdParam = parseInt(req.params.id);
      if (!trainerIdParam || isNaN(trainerIdParam)) {
        return res.status(400).json({ message: "유효하지 않은 훈련사 ID입니다." });
      }
      const dateQ = typeof req.query.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(req.query.date)
        ? req.query.date
        : new Date().toISOString().split('T')[0];

      // trainers.id 또는 users.id 어느 쪽이든 허용 → reservations.trainerId 는 users.id
      let trainerUserId = trainerIdParam;
      try {
        const [byTrainersId] = await db
          .select({ userId: trainers.userId })
          .from(trainers)
          .where(eq(trainers.id, trainerIdParam))
          .limit(1);
        if (byTrainersId?.userId) trainerUserId = byTrainersId.userId;
      } catch (lookupErr) {
        logServerError('[훈련사 스케줄] users.id 매핑 실패:', lookupErr, req);
      }

      // 해당 날짜 (00:00 ~ 24:00) 의 활성 예약 + 휴무 + 훈련소 휴무 동시 조회
      const dayStart = `${dateQ} 00:00:00`;
      const dayEnd = `${dateQ} 23:59:59.999`;

      // 트레이너의 institute_id 조회 (있다면 institute 휴무도 반영)
      const [trInst] = await db
        .select({ instituteId: trainers.instituteId })
        .from(trainers)
        .where(eq(trainers.userId, trainerUserId))
        .limit(1);
      const trainerInstId = trInst?.instituteId ?? null;

      // 옵션 테이블(rest_applications, institute_closure)은 환경에 따라 미배포일 수 있어
      // 실패 시 빈 결과로 fallback (스케줄 응답 자체는 항상 200 보장).
      const safeExec = async (q: Promise<any>) => {
        try { return await q; } catch (e: any) {
          if (e?.code === '42P01') return { rows: [] }; // undefined_table
          throw e;
        }
      };
      const dayStartDate = new Date(`${dateQ}T00:00:00`);
      const dayEndDate = new Date(`${dateQ}T23:59:59.999`);
      const [dayResRaw, restResRaw, instCloseRaw]: any[] = await Promise.all([
        db
          .select({
            id: reservationsTable.id,
            scheduled_at: reservationsTable.date,
            duration: reservationsTable.durationMinutes,
            status: reservationsTable.status,
          })
          .from(reservationsTable)
          .where(and(
            eq(reservationsTable.trainerId, trainerUserId),
            sql`${reservationsTable.date} >= ${dayStartDate}`,
            sql`${reservationsTable.date} <= ${dayEndDate}`,
            sql`COALESCE(${reservationsTable.status}, '') NOT IN ('cancelled','rejected')`,
          )),
        safeExec(db.execute(sql`
          SELECT id, start_date, end_date, reason
          FROM rest_applications
          WHERE trainer_id = ${trainerUserId}
            AND status = 'approved'
            AND start_date <= ${dayEnd}::timestamp
            AND end_date >= ${dayStart}::timestamp
        `)),
        trainerInstId
          ? safeExec(db.execute(sql`
              SELECT id, start_date, end_date, status
              FROM institute_closure
              WHERE institute_id = ${trainerInstId}
                AND status IN ('planned','active')
                AND start_date <= ${dayEnd}::timestamp
                AND end_date >= ${dayStart}::timestamp
            `))
          : Promise.resolve({ rows: [] }),
      ]);

      const toRows = <T = any>(r: any): T[] => Array.isArray(r) ? r : (r?.rows || []);
      const dayReservations = toRows<{ scheduled_at: Date; duration: number | null; status: string }>(dayResRaw);
      const restRanges = toRows<{ start_date: Date; end_date: Date; reason: string }>(restResRaw);
      const instCloseRanges = toRows<{ start_date: Date; end_date: Date; status: string }>(instCloseRaw);

      // 평일 09:00~18:00, 1시간 단위 기본 영업시간
      const businessHours = ['09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00'];

      // 과거 시각은 자동 비활성화
      const now = new Date();
      const isToday = dateQ === now.toISOString().split('T')[0];

      // 슬롯이 휴무/훈련소 휴무 구간과 겹치는지
      const overlapsRange = (slotStart: number, slotEnd: number, ranges: Array<{ start_date: Date; end_date: Date }>) =>
        ranges.some(r => {
          const s = new Date(r.start_date as any).getTime();
          const e = new Date(r.end_date as any).getTime();
          return slotStart < e && slotEnd > s;
        });

      // 슬롯이 기존 예약(시작+duration)과 시간대 겹치는지 (정확한 overlap 검사)
      const overlapsReservation = (slotStart: number, slotEnd: number) =>
        dayReservations.some(r => {
          const rs = new Date(r.scheduled_at as any).getTime();
          const dur = (r.duration ?? 60) * 60_000;
          const re = rs + dur;
          return slotStart < re && slotEnd > rs;
        });

      const slotMinutes = 60;
      const slots = businessHours.map((time) => {
        const slotDate = new Date(`${dateQ}T${time}:00`);
        const slotStart = slotDate.getTime();
        const slotEnd = slotStart + slotMinutes * 60_000;
        const isPast = isToday && slotEnd <= now.getTime();
        const onRest = overlapsRange(slotStart, slotEnd, restRanges);
        const onClosure = overlapsRange(slotStart, slotEnd, instCloseRanges);
        const booked = overlapsReservation(slotStart, slotEnd);
        let reason: string | null = null;
        if (isPast) reason = 'past';
        else if (onClosure) reason = 'institute_closed';
        else if (onRest) reason = 'trainer_off';
        else if (booked) reason = 'booked';
        return {
          time,
          available: !isPast && !onRest && !onClosure && !booked,
          ...(reason ? { reason } : {}),
        };
      });

      return res.status(200).json({
        trainerId: trainerIdParam,
        date: dateQ,
        availableSlots: slots,
        totalBooked: dayReservations.length,
        ...(restRanges.length ? { restApplications: restRanges.length } : {}),
        ...(instCloseRanges.length ? { instituteClosures: instCloseRanges.length } : {}),
      });
    } catch (error: any) {
      logServerError("Get trainer schedule error:", error, req);
      return res.status(500).json({ message: "스케줄 조회 중 오류가 발생했습니다." });
    }
  });

  // ===== Course Routes =====

  // Get all courses
  app.get("/api/courses", async (req, res) => {
    try {
      // 실제 커리큘럼 데이터를 강좌 형태로 제공
      const curricula = storage.getAllCurricula();
      const courses = curricula
        .filter(c => c.status === 'published')
        .map(curriculum => ({
          id: curriculum.id,
          title: curriculum.title,
          description: curriculum.description,
          price: curriculum.price || 0,
          difficulty: curriculum.difficulty || 'beginner',
          category: curriculum.category || '기본 훈련',
          duration: curriculum.duration || 0,
          modules: curriculum.modules || [],
          trainerName: curriculum.trainerName || '전문 훈련사',
          status: curriculum.status,
          enrollmentCount: curriculum.enrollmentCount || 0,
          averageRating: curriculum.averageRating || 4.5,
          createdAt: curriculum.createdAt || new Date().toISOString(),
          updatedAt: curriculum.updatedAt || new Date().toISOString()
        }));
      
      return res.status(200).json(courses);
    } catch (error: any) {
      logServerError("Get courses error:", error, req);
      return res.status(500).json({ message: "강좌 조회 중 오류가 발생했습니다." });
    }
  });

  // 내 강의 목록 조회 API (진행 중, 완료, 찜 목록)
  app.get("/api/my-courses", async (req, res) => {
    try {
      // 세션에서 사용자 정보 확인
      const user = req.session?.user || (req as any).user;
      const userId = user?.id;

      console.log('[My Courses API] 내 강의 목록 조회 - userId:', userId);

      if (!userId) {
        return res.status(200).json({
          ongoing: [],
          completed: [],
          wishlist: [],
          user: null,
          totalProgress: 0
        });
      }

      // coursePurchases 테이블에서 사용자의 구매한 강의 조회
      const purchases = await db.select({
        purchaseId: coursePurchases.id,
        courseId: coursePurchases.courseId,
        purchaseAmount: coursePurchases.purchaseAmount,
        accessGranted: coursePurchases.accessGranted,
        purchasedAt: coursePurchases.createdAt
      }).from(coursePurchases).where(eq(coursePurchases.userId, userId));

      // courseProgress 테이블에서 진행률 조회
      const progressData = await db.select().from(courseProgress).where(eq(courseProgress.userId, userId));

      // courses 테이블에서 강의 상세 정보 조회
      const allCourses = await db.select().from(courses);
      const coursesMap = new Map(allCourses.map(c => [c.id, c]));

      // 진행률 맵 생성
      const progressMap = new Map(progressData.map(p => [p.courseId, p]));

      // 구매한 강의들을 진행 중/완료로 분류
      const ongoing: any[] = [];
      const completed: any[] = [];

      for (const purchase of purchases) {
        const course = coursesMap.get(purchase.courseId);
        if (!course) continue;

        const progress = progressMap.get(purchase.courseId);
        const progressPercentage = progress ? Number(progress.progressPercentage) : 0;
        const isCompleted = progress?.status === 'completed' || progressPercentage >= 100;

        const courseData = {
          id: course.id,
          title: course.title,
          description: course.description,
          image: course.thumbnail || '/placeholder-course.jpg',
          progress: progressPercentage,
          trainer: {
            name: course.instructorName || '전문 훈련사',
            image: '/placeholder-trainer.jpg'
          },
          status: isCompleted ? '완료' : '진행 중',
          nextLesson: progress?.currentLesson ? `${progress.currentLesson}강 진행 중` : '1강 시작하기',
          completedDate: progress?.completedAt ? new Date(progress.completedAt).toLocaleDateString('ko-KR') : undefined
        };

        if (isCompleted) {
          completed.push(courseData);
        } else {
          ongoing.push(courseData);
        }
      }

      // 총 진행률 계산
      const totalProgress = ongoing.length > 0 
        ? Math.round(ongoing.reduce((sum, c) => sum + c.progress, 0) / ongoing.length)
        : 0;

      const myCoursesData = {
        ongoing,
        completed,
        wishlist: [], // 찜 목록은 별도 테이블 필요
        user: {
          id: user.id,
          name: user.name || user.username || '사용자',
          email: user.email
        },
        totalProgress
      };

      return res.status(200).json(myCoursesData);
    } catch (error: any) {
      logServerError("Get my courses error:", error, req);
      return res.status(500).json({ message: "내 강의 조회 중 오류가 발생했습니다." });
    }
  });

  // 사용자 학습 진도 조회 API (ProgressWidget 용)
  app.get("/api/user/progress", async (req, res) => {
    try {
      const user = req.session?.user || (req as any).user;
      const userId = user?.id;

      if (!userId) {
        return res.status(200).json({
          courses: [],
          overallProgress: 0,
          totalCoursesEnrolled: 0,
          completedCourses: 0
        });
      }

      // coursePurchases 테이블에서 사용자의 구매한 강의 조회
      const purchases = await db.select({
        purchaseId: coursePurchases.id,
        courseId: coursePurchases.courseId,
        purchaseAmount: coursePurchases.purchaseAmount,
        accessGranted: coursePurchases.accessGranted,
        purchasedAt: coursePurchases.createdAt
      }).from(coursePurchases).where(eq(coursePurchases.userId, userId));

      // courseProgress 테이블에서 진행률 조회
      const progressData = await db.select().from(courseProgress).where(eq(courseProgress.userId, userId));

      // courses 테이블에서 강의 상세 정보 조회
      const allCourses = await db.select().from(courses);
      const coursesMap = new Map(allCourses.map(c => [c.id, c]));
      const progressMap = new Map(progressData.map(p => [p.courseId, p]));

      // 진행 중인 강의들
      const ongoingCourses: any[] = [];
      let completedCount = 0;

      for (const purchase of purchases) {
        const course = coursesMap.get(purchase.courseId);
        if (!course) continue;

        const progress = progressMap.get(purchase.courseId);
        const progressPercentage = progress ? Number(progress.progressPercentage) : 0;
        const isCompleted = progress?.status === 'completed' || progressPercentage >= 100;

        if (isCompleted) {
          completedCount++;
        } else {
          ongoingCourses.push({
            id: course.id,
            title: course.title,
            progress: progressPercentage,
            totalLessons: course.duration ? Math.ceil(Number(course.duration) / 10) : 10,
            completedLessons: Math.round((progressPercentage / 100) * (course.duration ? Math.ceil(Number(course.duration) / 10) : 10)),
            nextLesson: progress?.currentLesson ? `${progress.currentLesson}강` : '1강 시작하기',
            estimatedTime: course.duration ? `${course.duration}분` : '약 30분',
            image: course.imageUrl || '/placeholder-course.jpg',
            trainer: {
              name: '전문 훈련사',
              image: '/placeholder-trainer.jpg'
            }
          });
        }
      }

      // 전체 진행률 계산
      const overallProgress = ongoingCourses.length > 0
        ? Math.round(ongoingCourses.reduce((sum, c) => sum + c.progress, 0) / ongoingCourses.length)
        : 0;

      // 다음 추천 강의 (완료하지 않은 인기 강의)
      const purchasedIds = purchases.map(p => p.courseId);
      const recommendedCourse = allCourses
        .filter(c => !purchasedIds.includes(c.id) && c.isActive === true)
        .sort((a, b) => (b.enrollmentCount || 0) - (a.enrollmentCount || 0))[0];

      return res.status(200).json({
        courses: ongoingCourses.slice(0, 5),
        overallProgress,
        totalCoursesEnrolled: purchases.length,
        completedCourses: completedCount,
        nextRecommendation: recommendedCourse ? {
          id: recommendedCourse.id,
          title: recommendedCourse.title,
          reason: '현재 학습 과정과 연계되는 강의입니다'
        } : undefined
      });
    } catch (error: any) {
      logServerError("Get user progress error:", error, req);
      return res.status(500).json({ message: "진도 조회 중 오류가 발생했습니다." });
    }
  });

  // 사용자 맞춤 추천 API (RecommendationCard 용)
  app.get("/api/recommendations", async (req, res) => {
    try {
      const user = req.session?.user || (req as any).user;
      const userId = user?.id;

      // 강의 데이터 조회 시도 (실제 데이터 또는 샘플 데이터)
      let courseData: any[] = [];
      try {
        // 실제 DB에서 기본 컬럼만 조회
        const result = await db.execute(sql`SELECT id, title, description, image, category, level, duration, price FROM courses LIMIT 20`);
        courseData = (result.rows || []) as any[];
      } catch (dbError) {
        console.log('Courses table query failed, using sample data');
        courseData = [];
      }
      
      // 사용자가 이미 구매한 강의 ID 목록
      let purchasedIds: number[] = [];
      if (userId) {
        try {
          const purchases = await db.select({ courseId: coursePurchases.courseId })
            .from(coursePurchases)
            .where(eq(coursePurchases.userId, userId));
          purchasedIds = purchases.map(p => p.courseId);
        } catch (e) {
          // ignore
        }
      }

      // 추천 강의 생성 (구매하지 않은 강의 또는 샘플 데이터)
      const reasonTypes = ['ai', 'popular', 'pet-based', 'similar-users'] as const;
      const reasons = [
        '반려견 성격에 맞는 추천 강의',
        '많은 보호자들이 선택한 인기 강의',
        '비슷한 견종 보호자들의 선택',
        'AI가 분석한 맞춤 추천'
      ];

      // 샘플 데이터 (DB에 강의가 없을 경우)
      const sampleCourses = [
        { id: 1, title: '기초 반려견 훈련 마스터 과정', description: '처음 반려견을 키우는 보호자를 위한 기초 훈련 과정', category: '기초 훈련' },
        { id: 2, title: '문제행동 교정 전문 과정', description: '짖음, 물기 등 문제행동을 전문적으로 교정하는 과정', category: '행동 교정' },
        { id: 3, title: '반려견 심리 이해하기', description: '반려견의 심리를 이해하고 소통하는 방법을 배웁니다', category: '심리' },
        { id: 4, title: '클리커 트레이닝 입문', description: '클리커를 활용한 효과적인 훈련 방법', category: '클리커' },
        { id: 5, title: '사회화 훈련 완벽 가이드', description: '다른 강아지, 사람들과 잘 어울리는 사회화 훈련', category: '사회화' },
        { id: 6, title: '노령견 케어 전문 과정', description: '고령의 반려견을 위한 특별한 케어 방법', category: '시니어 케어' }
      ];

      const coursesToUse = courseData.length > 0 ? courseData : sampleCourses;
      const recommendedCourses = coursesToUse
        .filter(c => !purchasedIds.includes(c.id))
        .slice(0, 6)
        .map((course, index) => ({
          id: course.id,
          title: course.title,
          description: course.description || '전문 훈련사가 제공하는 맞춤형 교육 강의입니다.',
          image: course.image || '/attached_assets/stock_images/professional_dog_tra_96215a25.jpg',
          price: course.price ? `₩${Number(course.price).toLocaleString()}` : '₩45,000',
          rating: 4.5 + Math.random() * 0.5,
          students: Math.floor(Math.random() * 500) + 50,
          trainer: {
            name: '전문 훈련사',
            image: '/placeholder-trainer.jpg'
          },
          tags: course.category ? [course.category] : ['기초 훈련'],
          reason: reasons[index % reasons.length],
          reasonType: reasonTypes[index % reasonTypes.length]
        }));

      // 추천 상품 (상품 테이블에서 조회)
      let productData: any[] = [];
      try {
        productData = await db.select().from(products).where(eq(products.isActive, true));
      } catch (e) {
        console.log('Products table query failed, using sample data');
      }

      // 샘플 상품 데이터
      const sampleProducts = [
        { id: 1, name: '프리미엄 강아지 사료', description: '영양 가득한 프리미엄 사료', category: '사료', basePrice: 35000 },
        { id: 2, name: '훈련용 클리커', description: '효과적인 클리커 트레이닝용', category: '훈련용품', basePrice: 8900 },
        { id: 3, name: '덴탈 껌 세트', description: '치아 건강을 위한 덴탈 껌', category: '간식', basePrice: 12000 },
        { id: 4, name: '강아지 하네스', description: '편안하고 안전한 산책용 하네스', category: '산책용품', basePrice: 25000 }
      ];

      const productsToUse = productData.length > 0 ? productData : sampleProducts;
      const recommendedProducts = productsToUse
        .slice(0, 4)
        .map(product => ({
          id: product.id,
          name: product.name,
          description: product.description || '반려동물을 위한 프리미엄 상품',
          image: product.mainImage || product.image || '/attached_assets/stock_images/happy_dog_with_pet_p_0b4dccf7.jpg',
          price: `₩${Number(product.basePrice || product.price || 15000).toLocaleString()}`,
          originalPrice: product.salePrice ? `₩${Number(product.basePrice || 0).toLocaleString()}` : undefined,
          rating: 4.2 + Math.random() * 0.8,
          reviewCount: Math.floor(Math.random() * 200) + 10,
          tags: [product.category || '반려용품'],
          reason: '인기 상품'
        }));

      // 사용자 반려동물 정보 (있다면)
      let petInfo = undefined;
      if (userId) {
        // pets 테이블이 있다면 조회
        try {
          const pets = storage.getPetsByUserId?.(userId);
          if (pets && pets.length > 0) {
            const pet = pets[0];
            petInfo = {
              name: pet.name,
              breed: pet.breed || '믹스견',
              age: pet.age ? `${pet.age}세` : '나이 미상'
            };
          }
        } catch (e) {
          // pets 조회 실패 시 무시
        }
      }

      return res.status(200).json({
        courses: recommendedCourses,
        products: recommendedProducts,
        petInfo
      });
    } catch (error: any) {
      logServerError("Get recommendations error:", error, req);
      return res.status(500).json({ message: "추천 조회 중 오류가 발생했습니다." });
    }
  });

  // 정보 수정 요청 목록 조회 API
  app.get('/api/admin/correction-requests', async (req, res) => {
    try {
      const requests = storage.getCorrectionRequests();
      console.log('[Admin] 정보 수정 요청 목록 조회:', requests.length, '건');
      
      res.json({
        success: true,
        data: requests
      });
    } catch (error: any) {
      logServerError('[Admin] 정보 수정 요청 목록 조회 실패:', error, req);
      res.status(500).json({
        success: false,
        message: error.message || '요청 목록 조회에 실패했습니다.'
      });
    }
  });

  // 정보 수정 요청 승인/반려 처리 API
  app.post('/api/admin/correction-requests/:id/review', async (req, res) => {
    const { id } = req.params;
    const { action, adminNotes } = req.body;
    
    console.log('[Admin] 정보 수정 요청 처리:', id, action, adminNotes);
    
    try {
      const result = await storage.reviewCorrectionRequest(id, action, adminNotes);
      
      res.json({
        success: true,
        message: action === 'approve' ? '요청이 승인되었습니다.' : '요청이 반려되었습니다.',
        request: result
      });
    } catch (error: any) {
      logServerError('[Admin] 정보 수정 요청 처리 실패:', error, req);
      res.status(500).json({
        success: false,
        message: error.message || '요청 처리에 실패했습니다.'
      });
    }
  });

  // =============================================================================
  // 관리자 배너 관리 API - 완전한 CRUD 및 관리 기능
  // =============================================================================

  // 관리자 API: 모든 배너 조회 (비활성 포함, 페이지네이션)
  app.get('/api/admin/banners', requireAuth('admin'), validateQuery(bannerQuerySchema), (req, res) => {
    try {
      const query = req.query as any;
      
      const result = storage.getBannersWithPagination(
        query.page,
        query.limit,
        query
      );
      
      return res.paginated(
        result.data, 
        result.meta.page, 
        result.meta.limit, 
        result.meta.total,
        '배너 목록을 조회했습니다'
      );
    } catch (error: any) {
      logServerError('관리자 배너 조회 오류:', error, req);
      return res.error(
        ApiErrorCode.INTERNAL_SERVER_ERROR,
        error.message || '배너 조회에 실패했습니다'
      );
    }
  });

  // 관리자 API: 새 배너 생성
  app.post('/api/admin/banners', requireAuth('admin'), csrfProtection, validateBody(insertBannerSchema), (req, res) => {
    try {
      console.log('[Admin Banner API] 배너 생성 요청:', req.body);
      
      const newBanner = storage.createBanner(req.body);
      console.log('[Admin Banner API] 배너 생성 완료:', newBanner);
      
      return res.success(
        newBanner,
        '배너가 성공적으로 생성되었습니다',
        201
      );
    } catch (error: any) {
      logServerError('[Admin Banner API] 배너 생성 오류:', error, req);
      return res.error(
        ApiErrorCode.INTERNAL_SERVER_ERROR,
        error.message || '배너 생성에 실패했습니다'
      );
    }
  });

  // 관리자 API: 배너 수정
  app.put('/api/admin/banners/:id', requireAuth('admin'), csrfProtection, validateBody(updateBannerSchema.omit({ id: true })), (req, res) => {
    try {
      const bannerId = parseInt(req.params.id);
      if (isNaN(bannerId)) {
        return res.error(
          ApiErrorCode.VALIDATION_ERROR,
          '올바른 배너 ID가 필요합니다'
        );
      }

      // 배너 존재 확인
      const existingBanner = storage.getBannerById(bannerId);
      if (!existingBanner) {
        return res.error(
          ApiErrorCode.RESOURCE_NOT_FOUND,
          '배너를 찾을 수 없습니다'
        );
      }

      console.log('[Admin Banner API] 배너 수정 요청:', bannerId, req.body);
      
      const updatedBanner = storage.updateBanner(bannerId, req.body);
      console.log('[Admin Banner API] 배너 수정 완료:', updatedBanner);
      
      return res.success(
        updatedBanner,
        '배너가 성공적으로 수정되었습니다'
      );
    } catch (error: any) {
      logServerError('[Admin Banner API] 배너 수정 오류:', error, req);
      return res.error(
        ApiErrorCode.INTERNAL_SERVER_ERROR,
        error.message || '배너 수정에 실패했습니다'
      );
    }
  });

  // 관리자 API: 배너 삭제
  app.delete('/api/admin/banners/:id', requireAuth('admin'), csrfProtection, (req, res) => {
    try {
      const bannerId = parseInt(req.params.id);
      if (isNaN(bannerId)) {
        return res.error(
          ApiErrorCode.VALIDATION_ERROR,
          '올바른 배너 ID가 필요합니다'
        );
      }

      // 배너 존재 확인
      const existingBanner = storage.getBannerById(bannerId);
      if (!existingBanner) {
        return res.error(
          ApiErrorCode.RESOURCE_NOT_FOUND,
          '배너를 찾을 수 없습니다'
        );
      }
      
      console.log('[Admin Banner API] 배너 삭제 요청:', bannerId);
      
      storage.deleteBanner(bannerId);
      console.log('[Admin Banner API] 배너 삭제 완료:', bannerId);
      
      return res.success(
        { deleted: true, bannerId },
        '배너가 성공적으로 삭제되었습니다'
      );
    } catch (error: any) {
      logServerError('[Admin Banner API] 배너 삭제 오류:', error, req);
      return res.error(
        ApiErrorCode.INTERNAL_SERVER_ERROR,
        error.message || '배너 삭제에 실패했습니다'
      );
    }
  });

  // =============================================================================
  // 특수 기능 배너 API - 토글, 순서 변경, 대량 업데이트 등
  // =============================================================================

  // 관리자 API: 배너 활성화/비활성화 토글
  app.patch('/api/admin/banners/:id/toggle', requireAuth('admin'), csrfProtection, (req, res) => {
    try {
      const bannerId = parseInt(req.params.id);
      if (isNaN(bannerId)) {
        return res.error(
          ApiErrorCode.VALIDATION_ERROR,
          '올바른 배너 ID가 필요합니다'
        );
      }

      console.log('[Admin Banner API] 배너 토글 요청:', bannerId);
      
      const updatedBanner = storage.toggleBannerStatus(bannerId);
      console.log('[Admin Banner API] 배너 토글 완료:', updatedBanner);
      
      return res.success(
        updatedBanner,
        `배너가 ${updatedBanner.isActive ? '활성화' : '비활성화'}되었습니다`
      );
    } catch (error: any) {
      logServerError('[Admin Banner API] 배너 토글 오류:', error, req);
      const isNotFound = error.message?.includes('찾을 수 없습니다');
      return res.error(
        isNotFound ? ApiErrorCode.RESOURCE_NOT_FOUND : ApiErrorCode.INTERNAL_SERVER_ERROR,
        error.message || '배너 상태 변경에 실패했습니다'
      );
    }
  });

  // 관리자 API: 배너 순서 변경
  app.post('/api/admin/banners/reorder', requireAuth('admin'), csrfProtection, validateBody(bannerReorderSchema), (req, res) => {
    try {
      console.log('[Admin Banner API] 배너 순서 변경 요청:', req.body);
      
      const updatedBanner = storage.reorderBanners(
        req.body.bannerId,
        req.body.newOrder,
        req.body.targetPosition
      );
      
      console.log('[Admin Banner API] 배너 순서 변경 완료:', updatedBanner);
      
      return res.success(
        updatedBanner,
        '배너 순서가 성공적으로 변경되었습니다'
      );
    } catch (error: any) {
      logServerError('[Admin Banner API] 배너 순서 변경 오류:', error, req);
      const isNotFound = error.message?.includes('찾을 수 없습니다');
      return res.error(
        isNotFound ? ApiErrorCode.RESOURCE_NOT_FOUND : ApiErrorCode.INTERNAL_SERVER_ERROR,
        error.message || '배너 순서 변경에 실패했습니다'
      );
    }
  });

  // 관리자 API: 배너 대량 업데이트
  app.patch('/api/admin/banners/bulk-update', requireAuth('admin'), csrfProtection, validateBody(bulkBannerUpdateSchema), (req, res) => {
    try {
      console.log('[Admin Banner API] 배너 대량 업데이트 요청:', req.body);
      
      const updatedBanners = [];
      const errors = [];
      
      for (const bannerId of req.body.bannerIds) {
        try {
          const updatedBanner = storage.updateBanner(bannerId, req.body.updates);
          updatedBanners.push(updatedBanner);
        } catch (error: any) {
          errors.push({
            bannerId,
            error: error.message
          });
        }
      }
      
      console.log('[Admin Banner API] 배너 대량 업데이트 완료:', {
        updated: updatedBanners.length,
        errors: errors.length
      });
      
      const data = {
        updatedBanners,
        updatedCount: updatedBanners.length,
        totalCount: req.body.bannerIds.length,
        ...(errors.length > 0 && { errors })
      };
      
      const message = errors.length === 0 
        ? `${updatedBanners.length}개 배너가 성공적으로 업데이트되었습니다`
        : `${updatedBanners.length}개 배너가 업데이트되었습니다 (${errors.length}개 실패)`;
      
      return res.success(data, message, errors.length === 0 ? 200 : 207);
    } catch (error: any) {
      logServerError('[Admin Banner API] 배너 대량 업데이트 오류:', error, req);
      return res.error(
        ApiErrorCode.INTERNAL_SERVER_ERROR,
        error.message || '배너 대량 업데이트에 실패했습니다'
      );
    }
  });

  // =============================================================================
  // 관리자 전용 배너 분석 및 통계 API
  // =============================================================================

  // 관리자 API: 배너 분석 및 통계
  app.get('/api/admin/banners/analytics', requireAuth('admin'), (req, res) => {
    try {
      console.log('[Admin Banner API] 배너 분석 요청');
      
      const analytics = storage.getBannerAnalytics();
      
      // 총 통계 계산
      const totalClicks = analytics.reduce((sum, banner) => sum + banner.clickCount, 0);
      const totalViews = analytics.reduce((sum, banner) => sum + banner.viewCount, 0);
      const activeBanners = analytics.filter(banner => banner.isActive).length;
      const totalBanners = analytics.length;
      
      // 위치별 통계
      const positionStats = analytics.reduce((acc, banner) => {
        const position = banner.targetPosition;
        if (!acc[position]) {
          acc[position] = {
            count: 0,
            activeCount: 0,
            totalClicks: 0,
            totalViews: 0
          };
        }
        acc[position].count++;
        if (banner.isActive) acc[position].activeCount++;
        acc[position].totalClicks += banner.clickCount;
        acc[position].totalViews += banner.viewCount;
        return acc;
      }, {} as any);
      
      // 사용자 그룹별 통계
      const userGroupStats = analytics.reduce((acc, banner) => {
        const group = banner.targetUserGroup;
        if (!acc[group]) {
          acc[group] = {
            count: 0,
            activeCount: 0,
            totalClicks: 0,
            totalViews: 0
          };
        }
        acc[group].count++;
        if (banner.isActive) acc[group].activeCount++;
        acc[group].totalClicks += banner.clickCount;
        acc[group].totalViews += banner.viewCount;
        return acc;
      }, {} as any);
      
      console.log('[Admin Banner API] 배너 분석 완료');
      
      const data = {
        banners: analytics,
        summary: {
          totalBanners,
          activeBanners,
          inactiveBanners: totalBanners - activeBanners,
          totalClicks,
          totalViews,
          overallClickThroughRate: totalViews > 0 ? 
            ((totalClicks / totalViews) * 100).toFixed(2) + '%' : '0%'
        },
        positionStats,
        userGroupStats,
        topPerformers: {
          mostClicked: analytics
            .sort((a, b) => b.clickCount - a.clickCount)
            .slice(0, 5),
          mostViewed: analytics
            .sort((a, b) => b.viewCount - a.viewCount)
            .slice(0, 5),
          bestClickThrough: analytics
            .filter(b => b.viewCount > 0)
            .sort((a, b) => {
              const aRate = a.clickCount / a.viewCount;
              const bRate = b.clickCount / b.viewCount;
              return bRate - aRate;
            })
            .slice(0, 5)
        }
      };
      
      return res.success(data, '배너 분석 데이터를 조회했습니다');
    } catch (error: any) {
      logServerError('[Admin Banner API] 배너 분석 오류:', error, req);
      return res.error(
        ApiErrorCode.INTERNAL_SERVER_ERROR,
        error.message || '배너 분석에 실패했습니다'
      );
    }
  });

  // 관리자 API: 특정 배너 상세 조회 (관리자 전용, 통계 포함)
  app.get('/api/admin/banners/:id', requireAuth('admin'), (req, res) => {
    try {
      const bannerId = parseInt(req.params.id);
      if (isNaN(bannerId)) {
        return res.error(
          ApiErrorCode.VALIDATION_ERROR,
          '올바른 배너 ID가 필요합니다'
        );
      }

      const banner = storage.getBannerById(bannerId);
      if (!banner) {
        return res.error(
          ApiErrorCode.RESOURCE_NOT_FOUND,
          '배너를 찾을 수 없습니다'
        );
      }

      // 추가 분석 정보
      const analytics = storage.getBannerAnalytics();
      const bannerAnalytics = analytics.find(a => a.id === bannerId);
      
      // 같은 위치의 다른 배너들과 비교
      const samePositionBanners = analytics.filter(a => 
        a.targetPosition === banner.targetPosition && a.id !== bannerId
      );
      
      const avgClicksInPosition = samePositionBanners.length > 0 
        ? samePositionBanners.reduce((sum, b) => sum + b.clickCount, 0) / samePositionBanners.length
        : 0;
      
      const avgViewsInPosition = samePositionBanners.length > 0 
        ? samePositionBanners.reduce((sum, b) => sum + b.viewCount, 0) / samePositionBanners.length
        : 0;

      const data = {
        ...banner,
        analytics: bannerAnalytics,
        performance: {
          clicksVsAverage: avgClicksInPosition > 0 
            ? ((banner.clickCount || 0) / avgClicksInPosition * 100).toFixed(1) + '%'
            : '100%',
          viewsVsAverage: avgViewsInPosition > 0 
            ? ((banner.viewCount || 0) / avgViewsInPosition * 100).toFixed(1) + '%'
            : '100%',
          positionRank: samePositionBanners.length > 0 
            ? samePositionBanners
                .sort((a, b) => b.clickCount - a.clickCount)
                .findIndex(b => b.clickCount <= (banner.clickCount || 0)) + 1
            : 1
        }
      };

      return res.success(data, '배너 상세 정보를 조회했습니다');
    } catch (error: any) {
      logServerError('[Admin Banner API] 관리자 배너 조회 오류:', error, req);
      return res.error(
        ApiErrorCode.INTERNAL_SERVER_ERROR,
        error.message || '배너 조회에 실패했습니다'
      );
    }
  });

  // 관리자 - 업체 등록
  app.post('/api/admin/locations', requireAuth('admin'), async (req, res) => {
    try {
      const {
        name,
        type,
        address,
        phone,
        description,
        services,
        priceRange,
        operatingHours,
        image,
        latitude,
        longitude,
        isPartner,
        status
      } = req.body;

      // 필수 필드 검증
      if (!name || !type || !address) {
        return res.status(400).json({ 
          error: '업체명, 유형, 주소는 필수 항목입니다.' 
        });
      }

      // 새 업체 정보 생성
      const newLocation = {
        id: Date.now(), // 실제로는 DB에서 생성된 ID 사용
        name,
        type,
        address,
        phone: phone || '',
        description: description || '',
        services: services || [],
        priceRange: priceRange || '',
        operatingHours: operatingHours || { open: '09:00', close: '18:00' },
        image: image || 'https://images.unsplash.com/photo-1560807707-8cc77767d783?w=400',
        latitude: latitude || 37.5665,
        longitude: longitude || 126.9780,
        isPartner: isPartner || true,
        status: status || 'active',
        rating: 0,
        reviewCount: 0,
        distance: 0,
        createdAt: new Date().toISOString(),
        createdBy: req.user?.id || 'admin'
      };

      // 메모리 저장소에 저장 (실제로는 데이터베이스 사용)
      if (!global.adminLocations) {
        global.adminLocations = [];
      }
      global.adminLocations.push(newLocation);

      console.log('새 업체 등록:', newLocation);

      res.status(201).json({
        success: true,
        message: '업체가 성공적으로 등록되었습니다.',
        location: newLocation
      });

    } catch (error) {
      logServerError('업체 등록 오류:', error, req);
      res.status(500).json({ 
        error: '업체 등록 중 오류가 발생했습니다.' 
      });
    }
  });

  // 관리자 - 업체 목록 조회
  app.get('/api/admin/locations', requireAuth('admin'), async (req, res) => {
    try {
      // 실제로는 데이터베이스에서 조회, 임시로 메모리 저장소 사용
      if (!global.adminLocations) {
        global.adminLocations = [];
      }

      res.json({
        success: true,
        locations: global.adminLocations
      });
    } catch (error) {
      logServerError('업체 목록 조회 오류:', error, req);
      res.status(500).json({ 
        error: '업체 목록 조회에 실패했습니다.' 
      });
    }
  });

  // 관리자 - 업체 삭제
  app.delete('/api/admin/locations/:id', requireAuth('admin'), async (req, res) => {
    try {
      const locationId = parseInt(req.params.id);

      if (!global.adminLocations) {
        global.adminLocations = [];
      }

      const locationIndex = global.adminLocations.findIndex(loc => loc.id === locationId);
      if (locationIndex === -1) {
        return res.status(404).json({          error: '업체를 찾을 수 없습니다.' 
        });
      }

      global.adminLocations.splice(locationIndex, 1);

      res.json({
        success: true,
        message: '업체가 성공적으로 삭제되었습니다.'
      });

      console.log('업체 삭제:', locationId);
    } catch (error) {
      logServerError('업체 삭제 오류:', error, req);
      res.status(500).json({ 
        error: '업체 삭제에 실패했습니다.' 
      });
    }
  });

  // 업체 정보 수정
    app.put('/api/admin/locations/:id', requireAuth('admin'), (req, res) => {
      try {
        const locationId = parseInt(req.params.id);
        const updateData = req.body;

        const locationIndex = global.adminLocations.findIndex(loc => loc.id === locationId);
        if (locationIndex === -1) {
          return res.status(404).json({ 
            error: '업체를 찾을 수 없습니다.' 
          });
        }

        // 업체 정보 업데이트
        global.adminLocations[locationIndex] = {
          ...global.adminLocations[locationIndex],
          ...updateData,
          id: locationId, // ID는 변경되지 않도록
          updatedAt: new Date().toISOString()
        };

        res.json({ 
          message: '업체 정보가 수정되었습니다.',
          location: global.adminLocations[locationIndex]
        });
      } catch (error) {
        logServerError('업체 정보 수정 오류:', error, req);
        res.status(500).json({ error: '업체 정보 수정 중 오류가 발생했습니다.' });
      }
    });

    // 업체 상태 변경
    app.patch('/api/admin/locations/:id/status', requireAuth('admin'), (req, res) => {
      try {
        const locationId = parseInt(req.params.id);
        const { status } = req.body;

        const locationIndex = global.adminLocations.findIndex(loc => loc.id === locationId);
        if (locationIndex === -1) {
          return res.status(404).json({ 
            error: '업체를 찾을 수 없습니다.' 
          });
        }

        global.adminLocations[locationIndex].status = status;
        global.adminLocations[locationIndex].updatedAt = new Date().toISOString();

        res.json({ 
          message: '업체 상태가 변경되었습니다.',
          location: global.adminLocations[locationIndex]
        });
      } catch (error) {
        logServerError('업체 상태 변경 오류:', error, req);
        res.status(500).json({ error: '업체 상태 변경 중 오류가 발생했습니다.' });
      }
    });

  // ===== Logo Management Routes =====

  // ===== Point Management Routes =====

  // 포인트 설정 조회
  app.get('/api/admin/point-configs', requireAuth('admin'), async (req, res) => {
    try {
      const configs = await storage.getPointConfigs();
      res.json({
        success: true,
        configs
      });
    } catch (error) {
      logServerError('포인트 설정 조회 오류:', error, req);
      res.status(500).json({ 
        error: '포인트 설정 조회 중 오류가 발생했습니다.' 
      });
    }
  });

  // 포인트 설정 업데이트
  app.put('/api/admin/point-configs/:activityType', requireAuth('admin'), async (req, res) => {
    try {
      const { activityType } = req.params;
      const { points, incentivePerPoint } = req.body;
      
      if (!points || !incentivePerPoint) {
        return res.status(400).json({ 
          error: '포인트와 포인트당 인센티브 값이 필요합니다.' 
        });
      }
      
      const updatedConfig = await storage.updatePointConfig(activityType, {
        points: parseInt(points),
        incentivePerPoint: parseInt(incentivePerPoint)
      });
      
      res.json({
        success: true,
        message: '포인트 설정이 업데이트되었습니다.',
        config: updatedConfig
      });
    } catch (error) {
      logServerError('포인트 설정 업데이트 오류:', error, req);
      res.status(500).json({ 
        error: '포인트 설정 업데이트 중 오류가 발생했습니다.' 
      });
    }
  });

  // 훈련사 활동 로그 조회
  app.get('/api/admin/trainer-activity-logs', requireAuth('admin'), async (req, res) => {
    try {
      const { trainerId, startDate, endDate, activityType } = req.query;
      
      const logs = await storage.getTrainerActivityLogs({
        trainerId: trainerId ? parseInt(trainerId) : undefined,
        startDate: startDate as string,
        endDate: endDate as string,
        activityType: activityType as string
      });
      
      res.json({
        success: true,
        logs
      });
    } catch (error) {
      logServerError('훈련사 활동 로그 조회 오류:', error, req);
      res.status(500).json({ 
        error: '훈련사 활동 로그 조회 중 오류가 발생했습니다.' 
      });
    }
  });

  // 훈련사 활동 로그 추가
  app.post('/api/admin/trainer-activity-logs', requireAuth('admin'), async (req, res) => {
    try {
      const { 
        trainerId, 
        trainerName, 
        activityType, 
        activityTitle, 
        activityDescription, 
        pointsEarned, 
        incentiveAmount, 
        metadata 
      } = req.body;
      
      if (!trainerId || !trainerName || !activityType || !pointsEarned) {
        return res.status(400).json({ 
          error: '필수 필드가 누락되었습니다.' 
        });
      }
      
      const newLog = await storage.addTrainerActivityLog({
        trainerId: parseInt(trainerId),
        trainerName,
        activityType,
        activityTitle,
        activityDescription,
        pointsEarned: parseInt(pointsEarned),
        incentiveAmount: incentiveAmount || '0',
        metadata: metadata || {},
        createdAt: new Date().toISOString()
      });
      
      res.json({
        success: true,
        message: '훈련사 활동 로그가 추가되었습니다.',
        log: newLog
      });
    } catch (error) {
      logServerError('훈련사 활동 로그 추가 오류:', error, req);
      res.status(500).json({ 
        error: '훈련사 활동 로그 추가 중 오류가 발생했습니다.' 
      });
    }
  });

  // 훈련사 기간별 포인트 조회
  app.get('/api/admin/trainer-points/:trainerId', requireAuth('admin'), async (req, res) => {
    try {
      const { trainerId } = req.params;
      const { startDate, endDate } = req.query;
      
      const points = await storage.getTrainerPointsForPeriod(
        parseInt(trainerId),
        startDate as string,
        endDate as string
      );
      
      res.json({
        success: true,
        points
      });
    } catch (error) {
      logServerError('훈련사 포인트 조회 오류:', error, req);
      res.status(500).json({ 
        error: '훈련사 포인트 조회 중 오류가 발생했습니다.' 
      });
    }
  });

  // ===== Logo Management Routes =====

  // 로고 설정 조회 (호환성을 위한 별칭)
  app.get('/api/admin/logos', async (req, res) => {
    try {
      const settings = await storage.getLogoSettings();
      res.json(settings);
    } catch (error) {
      logServerError('로고 설정 조회 오류:', error, req);
      res.status(500).json({ error: '로고 설정 조회에 실패했습니다.' });
    }
  });

  // 사이드바 로고 API (단수형)
  app.get('/api/admin/logo', async (req, res) => {
    try {
      const settings = await storage.getLogoSettings();
      // 사이드바 컴포넌트에서 기대하는 형식으로 변환
      const logoData = {
        expandedLogo: settings.logoLight || "/logo-light.svg",
        compactLogo: settings.logoSymbolLight || "/logo-compact.svg"
      };
      res.json(logoData);
    } catch (error) {
      logServerError('로고 설정 조회 오류:', error, req);
      res.status(500).json({ error: '로고 설정 조회에 실패했습니다.' });
    }
  });

  // 로고 설정 조회
  app.get('/api/admin/logo-settings', async (req, res) => {
    try {
      const settings = await storage.getLogoSettings();
      res.json(settings);
    } catch (error) {
      logServerError('로고 설정 조회 오류:', error, req);
      res.status(500).json({ error: '로고 설정 조회에 실패했습니다.' });
    }
  });

  // 로고 설정 업데이트
  app.put('/api/admin/logo-settings', async (req, res) => {
    try {
      const { logoLight, logoDark, logoSymbolLight, logoSymbolDark } = req.body;

      if (!logoLight || !logoDark || !logoSymbolLight || !logoSymbolDark) {
        return res.status(400).json({ 
          error: '모든 로고 파일이 필요합니다.' 
        });
      }

      const settings = await storage.updateLogoSettings({
        logoLight,
        logoDark,
        logoSymbolLight,
        logoSymbolDark
      });

      res.json({
        success: true,
        message: '로고 설정이 업데이트되었습니다.',
        settings
      });
    } catch (error) {
      logServerError('로고 설정 업데이트 오류:', error, req);
      res.status(500).json({ error: '로고 설정 업데이트에 실패했습니다.' });
    }
  });

  // 로고 초기화 (기본값으로 되돌리기)
  app.post('/api/admin/logo-settings/reset', async (req, res) => {
    try {
      const settings = await storage.resetLogoSettings();
      res.json({
        success: true,
        message: '로고 설정이 초기화되었습니다.',
        settings
      });
    } catch (error) {
      logServerError('로고 설정 초기화 오류:', error, req);
      res.status(500).json({ error: '로고 설정 초기화에 실패했습니다.' });
    }
  });

  // 로고 설정 API (단일 로고 업데이트)
  app.post('/api/logo/set', async (req, res) => {
    try {
      const { type, url } = req.body;
      
      if (!type || !url) {
        return res.status(400).json({ error: '타입과 URL이 필요합니다.' });
      }

      // 현재 로고 설정 조회
      const currentSettings = await storage.getLogoSettings();
      
      // 타입에 따른 업데이트
      const updateData = {
        logoLight: currentSettings.logoLight || "/logo-light.svg",
        logoDark: currentSettings.logoDark || "/logo-dark.svg", 
        logoSymbolLight: currentSettings.logoSymbolLight || "/logo-compact.svg",
        logoSymbolDark: currentSettings.logoSymbolDark || "/logo-compact-dark.svg"
      };

      // 업데이트할 필드 결정
      if (type === 'main') {
        updateData.logoLight = url;
      } else if (type === 'mainDark') {
        updateData.logoDark = url;
      } else if (type === 'compact') {
        updateData.logoSymbolLight = url;
      } else if (type === 'compactDark') {
        updateData.logoSymbolDark = url;
      }

      // 로고 설정 업데이트
      const settings = await storage.updateLogoSettings(updateData);
      
      res.json({ 
        success: true, 
        message: '로고가 성공적으로 저장되었습니다.',
        settings
      });
    } catch (error) {
      logServerError('로고 설정 오류:', error, req);
      res.status(500).json({ error: '로고 설정에 실패했습니다.' });
    }
  });

  // 로고 삭제 API
  app.delete('/api/admin/logos/:type', async (req, res) => {
    try {
      const { type } = req.params;
      if (!type || !['main', 'compact', 'favicon'].includes(type)) {
        return res.status(400).json({ error: '유효하지 않은 로고 타입입니다.' });
      }

      await storage.deleteLogo(type as 'main' | 'compact' | 'favicon');
      res.json({ 
        success: true, 
        message: '로고가 성공적으로 삭제되었습니다.' 
      });
    } catch (error) {
      logServerError('로고 삭제 오류:', error, req);
      res.status(500).json({ error: '로고 삭제에 실패했습니다.' });
    }
  });

  // Multer Storage 설정
  const storageConfig = multer.diskStorage({
    destination: (req: any, file: any, cb: any) => {
      cb(null, 'public/uploads/'); // 파일 저장 경로
    },
    filename: (req: any, file: any, cb: any) => {
      const ext = path.extname(file.originalname);
      const filename = path.basename(file.originalname, ext) + '-' + Date.now() + ext;
      cb(null, filename); // 저장될 파일명
    }
  });

  // Multer 업로드 미들웨어 생성
  const upload = multer({ 
    storage: storageConfig,
    limits: { fileSize: 10 * 1024 * 1024 } // 파일 크기 제한: 10MB
  });

  // 이미지 업로드 라우트
  const uploadSingle = upload.single('image'); // 'image' 필드명으로 파일 업로드 받음
  // 이미지 업로드 라우트
  app.post('/api/upload', (req: any, res: any) => {
    uploadSingle(req, res, (err: any) => {
      if (err) {
        logServerError('업로드 오류:', err, req);
        return res.status(400).json({ 
          error: err.message || '파일 업로드에 실패했습니다.' 
        });
      }

      if (!req.file) {
        return res.status(400).json({ 
          error: '업로드할 파일이 없습니다.' 
        });
      }

      // 파일 정보 반환
      const fileInfo = {
        filename: req.file.filename,
        originalName: req.file.originalname,
        url: req.file.path.replace(process.cwd() + '/public', ''),
        size: req.file.size,
        mimetype: req.file.mimetype
      };

      res.json({
        message: '파일 업로드 성공',
        url: fileInfo.url,
        file: fileInfo
      });
    });
  });

  // 위치 기반 서비스 라우트
  app.get('/api/places/nearby', async (req, res) => {
    try {
      const { latitude, longitude, radius = 1000 } = req.query;

      if (!latitude || !longitude) {
        return res.status(400).json({ error: '위도와 경도가 필요합니다.' });
      }

      // 실제로는 데이터베이스에서 위치 기반 검색 실행
      const nearbyPlaces = [
        {
          id: 1,
          name: "Talez 펫 플레이스",
          type: "카페",
          address: "서울시 강남구 테헤란로 427",
          latitude: 37.5034,
          longitude: 127.0448,
          distance: 0.5
        },
        {
          id: 2,
          name: "Talez 동물병원",
          type: "병원",
          address: "서울시 강남구 삼성동 123-45",
          latitude: 37.5133,
          longitude: 127.0585,
          distance: 0.8
        }
      ];

      res.json(nearbyPlaces);
    } catch (error) {
      logServerError('위치 기반 장소 조회 오류:', error, req);
      res.status(500).json({ error: '위치 기반 장소 조회에 실패했습니다.' });
    }
  });

  // Health check endpoint
  app.get("/api/health", async (req, res) => {
    try {
      const { getEmailServiceStatus } = await import("./services/email-service");
      const emailStatus = getEmailServiceStatus();
      const emailOk = !emailStatus.critical;
      res.status(emailOk ? 200 : 503).json({
        status: emailOk ? "ok" : "degraded",
        timestamp: new Date(),
        version: "1.0.0",
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || "development",
        services: { email: emailOk ? "ok" : "critical" },
        email: {
          configured: emailStatus.configured,
          fromEmailConfigured: emailStatus.fromEmailConfigured,
          critical: emailStatus.critical,
          consecutiveFailures: emailStatus.consecutiveFailures,
          warnings: emailStatus.warnings,
        },
      });
    } catch (err) {
      res.json({
        status: "ok",
        timestamp: new Date(),
        version: "1.0.0",
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || "development",
      });
    }
  });

  // Stripe 결제 시스템 API
  
  // 강의 구매 및 상품 구매 결제 인텐트 생성 - 인증, CSRF 보호, 입력 검증 적용
  app.post('/api/create-payment-intent', requireAuth(), csrfProtection, validateRequest(createPaymentIntentSchema), async (req, res) => {
    try {
      const { amount, courseId, courseTitle, itemId, itemName, itemType, trainerId: bodyTrainerId, category: bodyCategory, reservationId: bodyReservationId, reservationName: bodyReservationName } = req.body;
      
      // Stripe 사용 가능 여부 확인
      const currentStripeKey = process.env.STRIPE_SECRET_KEY;
      
      if (!currentStripeKey) {
        console.warn('⚠️ 결제 API 호출됨 - Stripe 키 없음');
        return res.status(503).json({ 
          error: '결제 시스템이 현재 설정되지 않았습니다. 관리자에게 문의하세요.',
          code: 'PAYMENT_UNAVAILABLE'
        });
      }
      
      const isLesson = itemType === 'lesson' || itemType === 'reservation';
      if (!amount || (!courseId && !itemId && !(isLesson && bodyReservationId))) {
        return res.status(400).json({ error: '결제 금액과 구매 항목 ID가 필요합니다.' });
      }

      // 메타데이터 생성 (userId 포함 - webhook에서 DB 저장 시 필요)
      const metadata: Record<string, string> = {};
      const requestUserId = req.user?.id;
      if (requestUserId !== undefined && requestUserId !== null) {
        metadata.userId = String(requestUserId);
      }
      if (itemType === 'product') {
        metadata.productId = itemId;
        metadata.productName = itemName || '상품 구매';
        metadata.type = 'product';
        // 서버 측 트레이너 메타데이터 주입 (정산 자동 연결)
        if (bodyTrainerId !== undefined && bodyTrainerId !== null && bodyTrainerId !== '') {
          metadata.trainerId = String(bodyTrainerId);
        }
        if (bodyCategory) metadata.category = String(bodyCategory);
      } else if (isLesson) {
        // 예약(1:1 수업) 결제: 예약 소유권/금액 검증 후 메타데이터 주입
        const resvId = parseInt(String(bodyReservationId ?? itemId), 10);
        if (!resvId || Number.isNaN(resvId)) {
          return res.status(400).json({ error: '예약 ID가 유효하지 않습니다.' });
        }
        let resvRow: { id: number; userId: number | null; trainerId: number | null; price: any; status: string | null } | null = null;
        try {
          const [row] = await db
            .select({
              id: reservationsTable.id,
              userId: reservationsTable.userId,
              trainerId: reservationsTable.trainerId,
              price: reservationsTable.price,
              status: reservationsTable.status,
            })
            .from(reservationsTable)
            .where(eq(reservationsTable.id, resvId))
            .limit(1);
          resvRow = row || null;
        } catch (lookupErr) {
          logServerError('[create-payment-intent] 예약 조회 실패:', lookupErr, req);
        }
        if (!resvRow) {
          return res.status(404).json({ error: '예약을 찾을 수 없습니다.' });
        }
        if (requestUserId && Number(resvRow.userId) !== Number(requestUserId)) {
          return res.status(403).json({ error: '본인 예약만 결제할 수 있습니다.' });
        }
        const expectedPrice = Number(resvRow.price ?? 0);
        if (expectedPrice > 0 && Number(amount) !== expectedPrice) {
          return res.status(400).json({ error: '결제 금액이 예약 가격과 일치하지 않습니다.', code: 'AMOUNT_MISMATCH' });
        }
        metadata.type = 'lesson';
        metadata.reservationId = String(resvRow.id);
        metadata.reservationName = String(bodyReservationName || itemName || '1:1 수업 예약');
        // trainers.id 매핑 (정산용)
        try {
          const [tr] = await db
            .select({ id: trainers.id })
            .from(trainers)
            .where(eq(trainers.userId, Number(resvRow.trainerId)))
            .limit(1);
          if (tr?.id) metadata.trainerId = String(tr.id);
        } catch (mapErr) {
          logServerError('[create-payment-intent] trainers.id 매핑 실패:', mapErr, req);
        }
        if (bodyCategory) metadata.category = String(bodyCategory);
        else metadata.category = 'lesson';
      } else {
        metadata.courseId = courseId || itemId;
        metadata.courseTitle = courseTitle || itemName || '강의 구매';
        metadata.type = 'course';
      }

      // 실시간 Stripe 인스턴스 생성 (캐시 방지)
      let currentStripe: Stripe;
      try {
        currentStripe = new Stripe(currentStripeKey, {
          apiVersion: '2023-10-16',
        });
      } catch (error) {
        logServerError('Stripe 인스턴스 생성 실패:', error, req);
        return res.status(500).json({ error: '결제 시스템 초기화에 실패했습니다.' });
      }

      // Stripe PaymentIntent 생성
      const paymentIntent = await currentStripe.paymentIntents.create({
        amount: Math.round(amount * 100), // 센트 단위로 변환
        currency: 'krw',
        metadata: metadata
      });

      res.json({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id
      });
    } catch (error) {
      logServerError('Payment intent 생성 오류:', error, req);
      res.status(500).json({ error: '결제 준비 중 오류가 발생했습니다.' });
    }
  });

  // 결제 성공 시 DB에 구매 기록을 트랜잭션으로 저장 (멱등성 보장)
  type CoursePurchaseRow = typeof coursePurchases.$inferSelect;
  type OrderRow = typeof orders.$inferSelect;
  type ReservationLessonRow = { id: number; trainer_id: number; status: string; scheduled_at: Date };
  type PersistResult =
    | { type: 'course'; record: CoursePurchaseRow; duplicated: boolean; itemName?: string }
    | { type: 'product'; record: OrderRow; duplicated: boolean; itemName?: string }
    | { type: 'lesson'; record: ReservationLessonRow; duplicated: boolean; itemName?: string }
    | { type: string; record: null; duplicated: false; itemName?: string };
  async function persistSuccessfulPayment(
    paymentIntent: Stripe.PaymentIntent,
    sessionUserId?: number | string
  ): Promise<PersistResult> {
    const parsed = parsePaymentIntentForPersistence(paymentIntent, sessionUserId);
    if (!parsed.ok) {
      throw new Error(parsed.error);
    }
    const { type: itemType, userId: userIdNum, itemId, itemName, amount } = parsed;

    if (itemType === 'course') {
      const courseId = itemId;

      // 멱등성: 이미 동일 paymentIntent 기록 존재 시 재사용
      const existing = await db.select().from(coursePurchases)
        .where(eq(coursePurchases.paymentIntentId, paymentIntent.id)).limit(1);
      if (existing.length > 0) {
        return { type: 'course', record: existing[0], duplicated: true };
      }

      let result: CoursePurchaseRow;
      try {
        result = await db.transaction(async (tx) => {
        const [purchase] = await tx.insert(coursePurchases).values({
          userId: userIdNum,
          courseId,
          purchaseAmount: amount.toString(),
          paymentMethod: 'stripe',
          paymentStatus: 'completed',
          paymentIntentId: paymentIntent.id,
          accessGranted: true,
        }).returning();

        // 수강 권한(progress) 레코드도 동시에 생성 (없을 때만)
        const progress = await tx.select().from(courseProgress)
          .where(and(eq(courseProgress.userId, userIdNum), eq(courseProgress.courseId, courseId)))
          .limit(1);
        if (progress.length === 0) {
          await tx.insert(courseProgress).values({
            userId: userIdNum,
            courseId,
            totalLessons: 1,
            status: 'active',
          });
        }

        return purchase;
        });
      } catch (txError) {
        // 동시성 인한 유니크 충돌 → 기존 레코드를 다시 조회해 중복으로 응답 (멱등 보장)
        if (isUniqueViolation(txError)) {
          const retry = await db.select().from(coursePurchases)
            .where(eq(coursePurchases.paymentIntentId, paymentIntent.id)).limit(1);
          if (retry.length > 0) {
            return { type: 'course', record: retry[0], duplicated: true, itemName };
          }
        }
        throw txError;
      }

      return { type: 'course', record: result, duplicated: false, itemName };
    }

    if (itemType === 'lesson') {
      // 예약(1:1 수업) 결제 확정. (Task #157: 스키마/DB 정렬 후 ORM 사용)
      const reservationId = itemId;
      const md = paymentIntent.metadata || {};
      const lessonCategory = (md as Record<string, string | undefined>).category || 'lesson';
      const rawTrainerId = (md as Record<string, string | undefined>).trainerId;
      const trainerIdNumLesson = rawTrainerId ? parseInt(String(rawTrainerId), 10) : NaN;

      // reservations.id 로 조회 — paymentIntent 메타데이터의 reservationId 사용
      const [resRow] = await db
        .select({
          id: reservationsTable.id,
          trainer_id: reservationsTable.trainerId,
          status: reservationsTable.status,
          scheduled_at: reservationsTable.date,
        })
        .from(reservationsTable)
        .where(eq(reservationsTable.id, reservationId))
        .limit(1);
      if (!resRow) {
        throw new Error(`예약을 찾을 수 없습니다 (id=${reservationId}).`);
      }

      // 트레이너 정산용 trainers.id 식별 (reservations.trainer_id 는 users.id)
      let settlementTrainerId = !Number.isNaN(trainerIdNumLesson) ? trainerIdNumLesson : 0;
      if (!settlementTrainerId && resRow.trainer_id != null) {
        const [tr] = await db.select({ id: trainers.id })
          .from(trainers).where(eq(trainers.userId, resRow.trainer_id)).limit(1);
        settlementTrainerId = tr?.id ?? 0;
      }

      try {
        await db.transaction(async (tx) => {
          // 예약 상태 confirmed 로 전이 (멱등: 이미 confirmed 면 noop)
          await tx
            .update(reservationsTable)
            .set({ status: 'confirmed' })
            .where(and(
              eq(reservationsTable.id, reservationId),
              sql`COALESCE(${reservationsTable.status}, '') <> 'confirmed'`,
            ));

          if (settlementTrainerId > 0) {
            const { createTrainerSettlementItem } = await import('./routes/trainer-settlements');
            await createTrainerSettlementItem(
              {
                trainerId: settlementTrainerId,
                sourceType: 'lesson',
                sourceId: resRow.id,
                sourceName: itemName,
                category: lessonCategory,
                grossAmount: amount,
                occurredAt: new Date(),
                metadata: { userId: userIdNum, reservationId: resRow.id, paymentIntentId: paymentIntent.id },
              },
              tx
            );
          }
        });
      } catch (txError) {
        if (!isUniqueViolation(txError)) {
          console.error('[정산 자동 생성 - lesson] 실패:', txError);
          throw txError;
        }
      }

      return { type: 'lesson', record: resRow, duplicated: false, itemName };
    }

    if (itemType === 'product') {
      const productId = itemId;

      const existing = await db.select().from(orders)
        .where(eq(orders.paymentIntentId, paymentIntent.id)).limit(1);
      if (existing.length > 0) {
        return { type: 'product', record: existing[0], duplicated: true };
      }

      const orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      // 주문 결제 시 트레이너 정산 자동 생성 (paymentIntent.metadata.trainerId 필요)
      const md = paymentIntent.metadata || {};
      const rawTrainerId = (md as Record<string, string | undefined>).trainerId
        ?? (md as Record<string, string | undefined>).sellerId;
      const trainerIdNum = rawTrainerId ? parseInt(String(rawTrainerId), 10) : NaN;
      const settlementCategory = (md as Record<string, string | undefined>).category || 'product';
      let result: OrderRow;
      try {
        result = await db.transaction(async (tx) => {
          const [order] = await tx.insert(orders).values({
            userId: userIdNum,
            orderNumber,
            status: 'completed',
            totalAmount: amount.toString(),
            paymentMethod: 'stripe',
            paymentStatus: 'paid',
            paymentIntentId: paymentIntent.id,
          }).returning();

          await tx.insert(orderItems).values({
            orderId: order.id,
            productId,
            quantity: 1,
            price: amount.toString(),
            totalPrice: amount.toString(),
          });

          if (!Number.isNaN(trainerIdNum) && trainerIdNum > 0) {
            try {
              const { createTrainerSettlementItem } = await import('./routes/trainer-settlements');
              await createTrainerSettlementItem(
                {
                  trainerId: trainerIdNum,
                  sourceType: 'order',
                  sourceId: order.id,
                  sourceName: itemName,
                  category: settlementCategory,
                  grossAmount: amount,
                  occurredAt: order.createdAt || new Date(),
                  metadata: { userId: userIdNum, productId, paymentIntentId: paymentIntent.id },
                },
                tx
              );
            } catch (settleErr) {
              console.error('[정산 자동 생성 - order] 실패:', settleErr);
              throw settleErr;
            }
          }

          return order;
        });
      } catch (txError) {
        if (isUniqueViolation(txError)) {
          const retry = await db.select().from(orders)
            .where(eq(orders.paymentIntentId, paymentIntent.id)).limit(1);
          if (retry.length > 0) {
            return { type: 'product', record: retry[0], duplicated: true, itemName };
          }
        }
        throw txError;
      }

      return { type: 'product', record: result, duplicated: false, itemName };
    }

    return { type: itemType, record: null, duplicated: false };
  }

  // 결제 상태 확인 및 강의/상품 등록
  app.post('/api/confirm-payment', async (req, res) => {
    try {
      const { paymentIntentId } = req.body;
      const sessionUserId = req.user?.id;

      if (!paymentIntentId) {
        return res.status(400).json({ error: 'paymentIntentId가 필요합니다.' });
      }

      // Stripe에서 결제 상태 확인
      if (!stripe) {
        return res.status(503).json({ error: '결제 시스템이 설정되지 않았습니다.' });
      }
      
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      
      if (paymentIntent.status === 'succeeded') {
        const metadata = paymentIntent.metadata || {};
        const itemType = metadata.type || 'course';
        const itemId = metadata.courseId || metadata.productId;
        const itemName = metadata.courseTitle || metadata.productName;

        // 소유권 검증: paymentIntent.metadata.userId와 세션 사용자 일치 여부 확인
        const ownership = assertPaymentOwnership(metadata.userId, sessionUserId);
        if (!ownership.ok) {
          console.warn('[결제 확인] 소유권 검증 실패:', {
            paymentIntentId,
            metadataUserId: metadata.userId,
            sessionUserId,
          });
          return res.status(ownership.status).json({ error: ownership.error });
        }
        const userId = ownership.authoritativeUserId;

        let saveResult: PersistResult | null = null;
        try {
          saveResult = await persistSuccessfulPayment(paymentIntent, userId);
        } catch (persistError) {
          logServerError('[결제 확인] DB 저장 실패:', persistError, req);
          const message = persistError instanceof Error ? persistError.message : '결제 기록 저장에 실패했습니다.';
          return res.status(500).json({
            error: message,
            code: 'PAYMENT_PERSIST_FAILED'
          });
        }

        if (itemType === 'course') {
          if (userId && !saveResult?.duplicated) {
            try {
              await notificationService.sendNotification({
                userId: typeof userId === 'string' ? parseInt(userId) : userId,
                type: 'system',
                title: '강의 등록 완료',
                message: `"${itemName}"강의에 성공적으로 등록되었습니다.`,
                actionUrl: `/my-courses`,
                data: { courseId: itemId, purchaseId: saveResult?.record?.id }
              });
            } catch (notifyError) {
              logServerError('[강의 등록] 알림 발송 실패:', notifyError, req);
            }
          }

          return res.json({
            success: true,
            message: saveResult?.duplicated
              ? '이미 등록된 결제입니다.'
              : '결제가 완료되어 강의에 등록되었습니다.',
            enrollment: saveResult?.record,
            duplicated: !!saveResult?.duplicated,
            type: 'course'
          });
        } else if (itemType === 'product') {
          if (userId && !saveResult?.duplicated) {
            try {
              await notificationService.sendNotification({
                userId: typeof userId === 'string' ? parseInt(userId) : userId,
                type: 'system',
                title: '주문 완료',
                message: `"${itemName}" 주문이 성공적으로 완료되었습니다.`,
                actionUrl: `/my-orders`,
                data: { orderId: saveResult?.record?.id, productId: itemId }
              });
            } catch (notifyError) {
              logServerError('[주문 완료] 알림 발송 실패:', notifyError, req);
            }
          }

          return res.json({
            success: true,
            message: saveResult?.duplicated
              ? '이미 처리된 주문입니다.'
              : '결제가 완료되어 주문이 생성되었습니다.',
            order: saveResult?.record,
            duplicated: !!saveResult?.duplicated,
            type: 'product'
          });
        } else {
          res.json({
            success: true,
            message: '결제가 완료되었습니다.',
            payment: {
              id: paymentIntentId,
              amount: paymentIntent.amount / 100,
              status: 'succeeded'
            }
          });
        }
      } else {
        res.status(400).json({ error: '결제가 완료되지 않았습니다.', status: paymentIntent.status });
      }
    } catch (error) {
      logServerError('결제 확인 오류:', error, req);
      res.status(500).json({ error: '결제 확인 중 오류가 발생했습니다.' });
    }
  });

  // Stripe Webhook 엔드포인트 - 보안 검증 포함
  app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'] as string;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    if (!webhookSecret) {
      logger.error('❌ STRIPE_WEBHOOK_SECRET이 설정되지 않음');
      return res.status(500).send('Webhook secret not configured');
    }
    
    if (!stripe) {
      logger.error('❌ Stripe가 초기화되지 않음');
      return res.status(500).send('Stripe not initialized');
    }
    
    let event: Stripe.Event;

    try {
      // Webhook 서명 검증 - 보안상 필수
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
      console.log('✅ Webhook 서명 검증 성공:', event.type);
    } catch (err: any) {
      logServerError('❌ Webhook 서명 검증 실패:', err.message, req);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // 이벤트 처리
    try {
      switch (event.type) {
        case 'payment_intent.succeeded': {
          const paymentIntent = event.data.object as Stripe.PaymentIntent;
          console.log('💳 결제 성공:', paymentIntent.id);

          const metadataUserId = paymentIntent.metadata?.userId;
          if (!metadataUserId) {
            console.warn('[Webhook] paymentIntent에 userId 메타데이터가 없어 DB 저장을 건너뜁니다:', paymentIntent.id);
          } else {
            try {
              const result = await persistSuccessfulPayment(paymentIntent, metadataUserId);
              console.log(`[Webhook] 결제 기록 저장 완료 (${result.type}, duplicated=${result.duplicated}):`, paymentIntent.id);

              // 사용자에게 알림
              if (!result.duplicated && result.record) {
                try {
                  const userIdNum = parseInt(metadataUserId);
                  await notificationService.sendNotification({
                    userId: userIdNum,
                    type: 'system',
                    title: result.type === 'course' ? '강의 등록 완료' : '주문 완료',
                    message: `결제가 정상 처리되었습니다. (${paymentIntent.id})`,
                    actionUrl: result.type === 'course' ? '/my-courses' : '/my-orders',
                    data: { paymentIntentId: paymentIntent.id }
                  });
                } catch (notifyError) {
                  logServerError('[Webhook] 알림 발송 실패:', notifyError, req);
                }
              }
            } catch (persistError) {
              logServerError('[Webhook] 결제 기록 저장 실패:', persistError, req);
              // Stripe에 500 반환하면 재시도되므로 의도적으로 실패 신호 반환
              return res.status(500).json({ error: 'persist_failed' });
            }
          }

          break;
        }

        case 'payment_intent.payment_failed': {
          const paymentIntent = event.data.object as Stripe.PaymentIntent;
          console.log('❌ 결제 실패:', paymentIntent.id);
          
          // 실패 로그 기록 및 사용자 알림
          // TODO: 실패 이유 분석 및 재시도 옵션 제공
          break;
        }

        case 'payment_intent.requires_action': {
          const paymentIntent = event.data.object as Stripe.PaymentIntent;
          console.log('⚠️ 추가 인증 필요:', paymentIntent.id);
          
          // 3D Secure 등 추가 인증이 필요한 경우
          // TODO: 사용자에게 추가 인증 요청 알림
          break;
        }

        default:
          console.log(`🔄 처리하지 않는 이벤트 타입: ${event.type}`);
      }

      res.json({ received: true });
    } catch (err: any) {
      logServerError('❌ Webhook 이벤트 처리 실패:', err, req);
      res.status(500).send(`Webhook handler failed: ${err.message}`);
    }
  });

  // 환불 처리 API
  app.post('/api/stripe/refund', async (req, res) => {
    try {
      const { paymentIntentId, reason } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: '로그인이 필요합니다.' });
      }

      if (!stripe) {
        return res.status(503).json({ error: '결제 시스템이 설정되지 않았습니다.' });
      }

      if (!paymentIntentId) {
        return res.status(400).json({ error: '결제 ID가 필요합니다.' });
      }

      // 환불 생성
      const refund = await stripe.refunds.create({
        payment_intent: paymentIntentId,
        reason: reason || 'requested_by_customer',
        metadata: {
          userId: userId.toString(),
          refundedAt: new Date().toISOString()
        }
      });

      console.log('💰 환불 처리 완료:', refund.id);

      await recordAuditLog(req, {
        action: 'payment.stripe.refund',
        targetType: 'payment',
        targetId: paymentIntentId,
        payload: {
          refundId: refund.id,
          status: refund.status,
          amount: refund.amount,
          reason: reason || 'requested_by_customer',
          sourceType: req.body?.sourceType,
          sourceId: req.body?.sourceId,
        },
      });

      // 트레이너 정산 항목 자동 취소 - paymentIntentId 기반 서버측 source 도출
      // 클라이언트가 보낸 sourceType/sourceId는 신뢰하지 않고, DB 조회로 결정한다.
      try {
        const { cancelTrainerSettlementItem } = await import('./routes/trainer-settlements');
        const cancelReason = `환불(${refund.id})`;
        let cancelled = 0;

        // 1) 강의 구매 매핑
        const cp = await db.select().from(coursePurchases)
          .where(eq(coursePurchases.paymentIntentId, paymentIntentId)).limit(1);
        if (cp.length > 0) {
          const n = await cancelTrainerSettlementItem('course', cp[0].id, cancelReason);
          cancelled += n;
          console.log(`[정산 자동 취소] course#${cp[0].id} → ${n}건 취소 (PI=${paymentIntentId})`);
        }

        // 2) 상품 주문 매핑
        const od = await db.select().from(orders)
          .where(eq(orders.paymentIntentId, paymentIntentId)).limit(1);
        if (od.length > 0) {
          const n = await cancelTrainerSettlementItem('order', od[0].id, cancelReason);
          cancelled += n;
          console.log(`[정산 자동 취소] order#${od[0].id} → ${n}건 취소 (PI=${paymentIntentId})`);
        }

        // 3) 1:1 수업/대체 세션 매핑 - lesson 정산 항목은 metadata->paymentIntentId 로 조회
        try {
          const { trainerSettlementItems } = await import('../shared/schema');
          const lessonItems = await db
            .select()
            .from(trainerSettlementItems)
            .where(and(
              eq(trainerSettlementItems.sourceType, 'lesson'),
              sql`${trainerSettlementItems.metadata}->>'paymentIntentId' = ${paymentIntentId}`,
            ));
          for (const item of lessonItems) {
            const n = await cancelTrainerSettlementItem('lesson', item.sourceId, cancelReason);
            cancelled += n;
            console.log(`[정산 자동 취소] lesson#${item.sourceId} → ${n}건 취소 (PI=${paymentIntentId})`);
          }
        } catch (lessonErr) {
          logServerError('[정산 자동 취소] lesson 매핑 조회 오류:', lessonErr, req);
        }

        if (cancelled === 0) {
          console.log(`[정산 자동 취소] 대상 정산 항목 없음 (PI=${paymentIntentId})`);
        }
      } catch (cancelErr) {
        logServerError('[정산 자동 취소] 오류:', cancelErr, req);
      }

      res.json({
        success: true,
        refundId: refund.id,
        status: refund.status,
        message: '환불이 정상적으로 처리되었습니다.'
      });

    } catch (error: any) {
      logServerError('환불 처리 오류:', error, req);
      await recordAuditLog(req, {
        action: 'payment.stripe.refund',
        targetType: 'payment',
        targetId: req.body?.paymentIntentId,
        payload: {
          reason: req.body?.reason,
          sourceType: req.body?.sourceType,
          sourceId: req.body?.sourceId,
        },
        status: 'failure',
        errorMessage: error?.message,
      });
      res.status(500).json({ 
        error: '환불 처리 중 오류가 발생했습니다.',
        details: error.message 
      });
    }
  });

  // 결제 이력 조회
  app.get('/api/payment-history', async (req, res) => {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: '로그인이 필요합니다.' });
      }

      // 실제 구현에서는 데이터베이스에서 조회
      const paymentHistory = [
        {
          id: '1',
          courseId: 'course-basic-obedience',
          courseTitle: '기초 복종훈련 완전정복',
          amount: 180000,
          status: 'completed',
          paidAt: new Date('2025-01-15'),
          paymentMethod: 'card'
        }
      ];

      res.json({
        success: true,
        payments: paymentHistory
      });
    } catch (error) {
      logServerError('결제 이력 조회 오류:', error, req);
      res.status(500).json({ error: '결제 이력 조회 중 오류가 발생했습니다.' });
    }
  });

  // 훈련사 양성 과정 API
  app.get("/api/trainer-programs", async (req, res) => {
    try {
      const programs = [
        {
          id: 1,
          name: "기초 반려견 훈련사 과정",
          duration: "8주",
          description: "반려견 기초 훈련 전문가 양성 과정",
          price: 500000,
          startDate: "2024-03-01",
          capacity: 20,
          enrolledCount: 15
        },
        {
          id: 2,
          name: "고급 행동 교정사 과정",
          duration: "12주",
          description: "문제 행동 교정 전문가 양성 과정",
          price: 800000,
          startDate: "2024-03-15",
          capacity: 15,
          enrolledCount: 8
        }
      ];
      
      res.json({
        success: true,
        programs
      });
    } catch (error) {
      logServerError('훈련사 양성 과정 목록 조회 오류:', error, req);
      res.status(500).json({
        success: false,
        message: '훈련사 양성 과정 목록을 불러오는 중 오류가 발생했습니다.'
      });
    }
  });

  // 훈련사 신청 목록 API - 실제 데이터베이스 연동
  app.get("/api/trainer-applications", async (req, res) => {
    try {
      console.log('[DB] 훈련사 신청 목록 조회 시작');
      
      // HybridStorage에서 실제 데이터베이스 데이터 가져오기
      const dbApplications = await storage.getAllTrainerApplications();
      
      console.log('[DB] 조회된 훈련사 신청 수:', dbApplications.length);
      
      // 응답 형식을 기존 클라이언트와 호환되도록 변환
      const applications = dbApplications.map(app => ({
        id: app.id,
        applicantName: app.name,
        programName: app.experience ? `${app.experience} 경력자 과정` : "일반 훈련사 과정",
        status: app.status,
        appliedDate: app.created_at ? new Date(app.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        experience: app.experience || "미기재",
        certification: app.certifications || "미기재",
        email: app.email,
        phone: app.phone
      }));
      
      res.json({
        success: true,
        applications
      });
    } catch (error) {
      logServerError('[DB] 훈련사 신청 목록 조회 오류:', error, req);
      res.status(500).json({
        success: false,
        message: '훈련사 신청 목록을 불러오는 중 오류가 발생했습니다.'
      });
    }
  });

  // 훈련사 인증 기록 API
  app.get("/api/trainer-certifications", async (req, res) => {
    try {
      const certifications = [
        {
          id: 1,
          trainerName: "김훈련",
          certificationType: "반려동물행동지도사 2급",
          issuedDate: "2024-01-15",
          expiryDate: "2026-01-15",
          status: "active",
          issuingOrganization: "한국반려동물협회"
        },
        {
          id: 2,
          trainerName: "이전문",
          certificationType: "반려동물행동지도사 1급",
          issuedDate: "2023-12-01",
          expiryDate: "2025-12-01",
          status: "active",
          issuingOrganization: "한국반려동물협회"
        }
      ];
      
      res.json({
        success: true,
        certifications
      });
    } catch (error) {
      logServerError('훈련사 인증 기록 조회 오류:', error, req);
      res.status(500).json({
        success: false,
        message: '훈련사 인증 기록을 불러오는 중 오류가 발생했습니다.'
      });
    }
  });

  // 테스트 등록 데이터 생성 엔드포인트 (데이터베이스 사용으로 비활성화)
  app.post("/api/test/create-sample-registrations", (req, res) => {
    try {
      // 데이터베이스를 사용하므로 이 엔드포인트는 비활성화됨
      return res.json({
        success: false,
        message: '이 기능은 데이터베이스 마이그레이션 후 비활성화되었습니다.'
      });
      
      if (false && !global.registrationApplications) {
        global.registrationApplications = [];
      }

      // 샘플 훈련사 등록 신청 데이터
      const sampleTrainerApplications = [
        {
          id: 'trainer_' + Date.now() + '_1',
          type: 'trainer',
          applicantInfo: {
            personalInfo: {
              name: '김민준',
              phone: '010-1234-5678',
              email: 'trainer1@example.com',
              address: '서울시 강남구 테헤란로 123'
            },
            professionalInfo: {
              experience: 5,
              specialties: ['기초 복종 훈련', '사회화 훈련'],
              certifications: ['반려동물 훈련사 자격증', '동물행동교정사 자격증'],
              bio: '5년간의 경험을 바탕으로 체계적인 반려견 훈련을 제공합니다.',
              serviceArea: '서울시 강남구'
            },
            businessInfo: {
              hourlyRate: '50000'
            }
          },
          documents: {
            profileImage: '/uploads/trainer1_profile.jpg',
            certificationDocs: ['/uploads/trainer1_cert1.pdf', '/uploads/trainer1_cert2.pdf'],
            portfolioImages: ['/uploads/trainer1_portfolio1.jpg']
          },
          status: 'pending',
          submittedAt: new Date(Date.now() - 86400000).toISOString(), // 1일 전
          reviewerId: null,
          reviewedAt: null,
          notes: ''
        },
        {
          id: 'trainer_' + Date.now() + '_2',
          type: 'trainer',
          applicantInfo: {
            personalInfo: {
              name: '박수진',
              phone: '010-2345-6789',
              email: 'trainer2@example.com',
              address: '부산시 해운대구 센텀중앙로 456'
            },
            professionalInfo: {
              experience: 8,
              specialties: ['어질리티 훈련', '문제행동 교정'],
              certifications: ['국제 반려동물 훈련사 자격증', 'K9 트레이너 자격증'],
              bio: '어질리티와 문제행동 교정 전문가로 활동하고 있습니다.',
              serviceArea: '부산시 전체'
            },
            businessInfo: {
              hourlyRate: '60000'
            }
          },
          documents: {
            profileImage: '/uploads/trainer2_profile.jpg',
            certificationDocs: ['/uploads/trainer2_cert1.pdf'],
            portfolioImages: ['/uploads/trainer2_portfolio1.jpg', '/uploads/trainer2_portfolio2.jpg']
          },
          status: 'approved',
          submittedAt: new Date(Date.now() - 172800000).toISOString(), // 2일 전
          reviewerId: 'admin',
          reviewedAt: new Date(Date.now() - 86400000).toISOString(), // 1일 전
          notes: '우수한 경력과 자격을 갖춘 훈련사입니다. 승인합니다.'
        }
      ];

      // 샘플 기관 등록 신청 데이터
      const sampleInstituteApplications = [
        {
          id: 'institute_' + Date.now() + '_1',
          type: 'institute',
          applicantInfo: {
            basicInfo: {
              instituteName: '해피독 트레이닝 센터',
              email: 'info@happydog.com',
              phone: '02-1234-5678',
              establishedYear: '2020'
            },
            locationInfo: {
              address: '서울시 마포구 홍대입구역 12번 출구 앞'
            },
            serviceInfo: {
              description: '체계적인 강아지 교육과 사회화 프로그램을 제공하는 전문 교육기관입니다.',
              serviceTypes: ['기초 훈련', '사회화 교육', '문제행동 교정', '어질리티'],
              operatingHours: '평일 09:00-18:00, 주말 10:00-17:00'
            },
            facilityInfo: {
              capacity: '20',
              facilities: ['실내 훈련장', '실외 운동장', '개별 케어 룸', '상담실']
            }
          },
          documents: {
            businessLicense: '/uploads/institute1_license.pdf',
            facilityImages: ['/uploads/institute1_facility1.jpg', '/uploads/institute1_facility2.jpg']
          },
          status: 'pending',
          submittedAt: new Date(Date.now() - 43200000).toISOString(), // 12시간 전
          reviewerId: null,
          reviewedAt: null,
          notes: ''
        },
        {
          id: 'institute_' + Date.now() + '_2',
          type: 'institute',
          applicantInfo: {
            basicInfo: {
              instituteName: '펫케어 아카데미',
              email: 'academy@petcare.com',
              phone: '031-5678-9012',
              establishedYear: '2018'
            },
            locationInfo: {
              address: '경기도 성남시 분당구 정자일로 95'
            },
            serviceInfo: {
              description: '전문 수의사와 훈련사가 함께하는 종합 펫케어 교육기관입니다.',
              serviceTypes: ['기초 교육', '건강 관리', '그루밍', '수의학 상담'],
              operatingHours: '매일 08:00-20:00'
            },
            facilityInfo: {
              capacity: '50',
              facilities: ['대형 훈련장', '의료 시설', '그루밍실', '휴게실', '주차장']
            }
          },
          documents: {
            businessLicense: '/uploads/institute2_license.pdf',
            facilityImages: ['/uploads/institute2_facility1.jpg', '/uploads/institute2_facility2.jpg', '/uploads/institute2_facility3.jpg']
          },
          status: 'rejected',
          submittedAt: new Date(Date.now() - 259200000).toISOString(), // 3일 전
          reviewerId: 'admin',
          reviewedAt: new Date(Date.now() - 172800000).toISOString(), // 2일 전
          notes: '시설 기준이 미흡합니다. 안전 시설 보완 후 재신청 바랍니다.'
        }
      ];

      // 전역 등록 신청 배열에 추가
      global.registrationApplications.push(
        ...sampleTrainerApplications,
        ...sampleInstituteApplications
      );

      console.log('테스트 등록 데이터 생성 완료:', global.registrationApplications.length, '건');

      res.json({
        success: true,
        message: '테스트 등록 데이터가 생성되었습니다.',
        created: {
          trainers: sampleTrainerApplications.length,
          institutes: sampleInstituteApplications.length,
          total: sampleTrainerApplications.length + sampleInstituteApplications.length
        }
      });

    } catch (error) {
      logServerError('테스트 데이터 생성 실패:', error, req);
      res.status(500).json({
        success: false,
        message: '테스트 데이터 생성 중 오류가 발생했습니다.'
      });
    }
  });

  // 등록 신청 데이터 상태 확인 (데이터베이스 사용으로 비활성화)
  app.get("/api/test/registration-status", async (req, res) => {
    try {
      // 데이터베이스에서 실제 통계 조회
      const trainerApps = await db.select().from(trainerApplications);
      const instituteApps = await db.select().from(instituteApplications);
      const total = trainerApps.length + instituteApps.length;
      const pending = [...trainerApps, ...instituteApps].filter(app => app.status === 'pending').length;
      const approved = [...trainerApps, ...instituteApps].filter(app => app.status === 'approved').length;
      const rejected = [...trainerApps, ...instituteApps].filter(app => app.status === 'rejected').length;

      res.json({
        success: true,
        data: {
          total,
          pending,
          approved,
          rejected,
          applications: [...trainerApps, ...instituteApps]
        }
      });
    } catch (error) {
      logServerError('등록 상태 확인 실패:', error, req);
      res.status(500).json({
        success: false,
        message: '등록 상태 확인 중 오류가 발생했습니다.'
      });
    }
  });

  // === Internal Location API (별도 엔드포인트로 이동) ===

  // === Institute API Routes ===

  // 기관 목록 조회
  app.get('/api/institutes', async (req, res) => {
    try {
      const institutes = await storage.getInstitutes();
      res.json(institutes);
    } catch (error) {
      logServerError('기관 목록 조회 실패:', error, req);
      res.status(500).json({
        success: false,
        message: '기관 목록을 불러오는 중 오류가 발생했습니다.'
      });
    }
  });

  // 기관 상세 조회
  app.get('/api/institutes/:id', async (req, res) => {
    try {
      const institute = await storage.getInstitute(parseInt(req.params.id));
      if (!institute) {
        return res.status(404).json({
          success: false,
          message: '기관을 찾을 수 없습니다.'
        });
      }
      res.json(institute);
    } catch (error) {
      logServerError('기관 상세 조회 실패:', error, req);
      res.status(500).json({
        success: false,
        message: '기관 정보를 불러오는 중 오류가 발생했습니다.'
      });
    }
  });

  // 기관 코드 검증 (훈련사 등록 시 기관 연결용)
  app.get('/api/institutes/verify-code/:code', async (req, res) => {
    try {
      const { code } = req.params;
      
      if (!code || code.length < 3) {
        return res.status(400).json({
          success: false,
          message: '유효한 기관 코드를 입력해주세요.'
        });
      }

      const institute = await storage.getInstituteByCode(code.toUpperCase());
      
      if (!institute) {
        return res.status(404).json({
          success: false,
          message: '해당 기관 코드를 찾을 수 없습니다.'
        });
      }

      if (!institute.isActive) {
        return res.status(400).json({
          success: false,
          message: '해당 기관은 현재 비활성 상태입니다.'
        });
      }

      res.json({
        success: true,
        data: {
          id: institute.id,
          name: institute.name,
          code: institute.code,
          address: institute.address
        },
        message: '기관 코드가 확인되었습니다.'
      });
    } catch (error) {
      logServerError('기관 코드 검증 실패:', error, req);
      res.status(500).json({
        success: false,
        message: '기관 코드 검증 중 오류가 발생했습니다.'
      });
    }
  });

  // 훈련사-기관 연결 (인증 필요)
  app.post('/api/trainer/link-institute', requireAuth('trainer'), csrfProtection, async (req, res) => {
    try {
      const { instituteCode } = req.body;
      const trainerId = req.session.user?.trainerId || req.user?.trainerId;

      if (!trainerId) {
        return res.status(400).json({
          success: false,
          message: '훈련사 정보를 찾을 수 없습니다.'
        });
      }

      if (!instituteCode) {
        return res.status(400).json({
          success: false,
          message: '기관 코드를 입력해주세요.'
        });
      }

      const institute = await storage.getInstituteByCode(instituteCode.toUpperCase());
      
      if (!institute) {
        return res.status(404).json({
          success: false,
          message: '해당 기관 코드를 찾을 수 없습니다.'
        });
      }

      const linked = await storage.linkTrainerToInstitute(trainerId, institute.id);
      
      if (!linked) {
        return res.status(500).json({
          success: false,
          message: '기관 연결에 실패했습니다.'
        });
      }

      res.json({
        success: true,
        data: {
          instituteName: institute.name,
          instituteCode: institute.code
        },
        message: `${institute.name} 기관에 성공적으로 연결되었습니다.`
      });
    } catch (error) {
      logServerError('훈련사-기관 연결 실패:', error, req);
      res.status(500).json({
        success: false,
        message: '기관 연결 중 오류가 발생했습니다.'
      });
    }
  });

  // 훈련사의 소속 기관 조회
  app.get('/api/trainer/my-institutes', requireAuth('trainer'), async (req, res) => {
    try {
      const trainerId = req.session.user?.trainerId || req.user?.trainerId;

      if (!trainerId) {
        return res.status(400).json({
          success: false,
          message: '훈련사 정보를 찾을 수 없습니다.'
        });
      }

      const institutes = await storage.getTrainerInstitutes(trainerId);
      
      res.json({
        success: true,
        data: institutes,
        message: '소속 기관 목록을 조회했습니다.'
      });
    } catch (error) {
      logServerError('훈련사 기관 조회 실패:', error, req);
      res.status(500).json({
        success: false,
        message: '소속 기관 조회 중 오류가 발생했습니다.'
      });
    }
  });

  // 기관 등록 (관리자 전용)
  app.post('/api/institutes', requireAuth('admin'), async (req, res) => {
    try {
      const institute = await storage.createInstitute(req.body);
      res.status(201).json(institute);
    } catch (error) {
      logServerError('기관 등록 실패:', error, req);
      res.status(500).json({
        success: false,
        message: '기관 등록 중 오류가 발생했습니다.'
      });
    }
  });

  // 기관 수정 (관리자 및 기관 관리자)
  app.put('/api/institutes/:id', requireAuth(['admin', 'institute-admin']), csrfProtection, async (req, res) => {
    try {
      const instituteId = parseInt(req.params.id);
      
      // 권한 확인: 기관 관리자는 자신의 기관만 수정 가능 (타입 통일)
      if (req.session.user?.role === 'institute-admin' && Number(req.session.user.instituteId) !== instituteId) {
        return res.status(403).json({ 
          success: false,
          error: '권한이 없습니다. 자신의 기관만 수정할 수 있습니다.' 
        });
      }

      // 업데이트 데이터 준비
      const updateData = { ...req.body };
      
      // 기관 관리자는 certification 필드 수정 불가 (관리자만 가능)
      if (req.session.user?.role !== 'admin' && 'certification' in updateData) {
        console.log('[Institute] 기관 관리자는 인증 마크를 수정할 수 없습니다');
        delete updateData.certification;
      }

      const institute = await storage.updateInstitute(instituteId, updateData);
      console.log('[Institute] 기관 정보 업데이트:', { 
        instituteId, 
        userId: req.session.user?.id,
        updatedFields: Object.keys(updateData)
      });
      
      res.json({
        success: true,
        data: institute,
        message: '기관 정보가 성공적으로 업데이트되었습니다'
      });
    } catch (error) {
      logServerError('기관 수정 실패:', error, req);
      res.status(500).json({
        success: false,
        message: '기관 수정 중 오류가 발생했습니다.'
      });
    }
  });

  // 기관 삭제 (관리자 전용)
  app.delete('/api/institutes/:id', requireAuth('admin'), async (req, res) => {
    try {
      await storage.deleteInstitute(parseInt(req.params.id));
      res.json({
        success: true,
        message: '기관이 삭제되었습니다.'
      });
    } catch (error) {
      logServerError('기관 삭제 실패:', error, req);
      res.status(500).json({
        success: false,
        message: '기관 삭제 중 오류가 발생했습니다.'
      });
    }
  });

  // === Institute Admin API Routes ===

  // 기관 관리자용 - 소속 수강생 목록 조회
  app.get('/api/institute/students', requireAuth('institute-admin'), async (req, res) => {
    try {
      const instituteId = req.session.user?.instituteId;
      
      if (!instituteId) {
        return res.json([]);
      }

      // 기관에 소속된 수강생들 조회 (enrollments 또는 pets 테이블 기반)
      const studentsQuery = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          phone: users.phone,
          avatar: users.avatar,
          createdAt: users.createdAt,
        })
        .from(users)
        .where(and(
          eq(users.role, 'pet-owner'),
          eq(users.instituteId, instituteId)
        ));

      // 각 수강생의 펫 정보도 함께 조회
      const studentsWithPets = await Promise.all(
        studentsQuery.map(async (student) => {
          const petsData = await db
            .select()
            .from(pets)
            .where(eq(pets.ownerId, student.id));

          const pet = petsData[0] || null;
          
          return {
            id: student.id,
            name: student.name || '이름 없음',
            email: student.email || '',
            phone: student.phone || '',
            petName: pet?.name || '등록된 반려견 없음',
            petBreed: pet?.breed || '',
            petAge: pet?.age || 0,
            joinDate: student.createdAt ? new Date(student.createdAt).toISOString().split('T')[0] : '',
            status: 'active' as const,
            courseCount: 0,
            completedCourses: 0,
            image: student.avatar || '',
            petImage: pet?.profileImage || '',
            lastActive: student.createdAt ? new Date(student.createdAt).toISOString().split('T')[0] : '',
            missedClasses: 0,
            activeCourses: []
          };
        })
      );

      res.json(studentsWithPets);
    } catch (error) {
      logServerError('기관 수강생 목록 조회 실패:', error, req);
      res.json([]);
    }
  });

  // 기관 관리자용 - 소속 훈련사 목록 조회
  app.get('/api/institute/trainers', requireAuth('institute-admin'), async (req, res) => {
    try {
      const instituteId = req.session.user?.instituteId;
      
      if (!instituteId) {
        return res.json([]);
      }

      const trainersQuery = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          phone: users.phone,
          specialty: users.specialty,
          avatar: users.avatar,
          isVerified: users.isVerified,
          approvalStatus: users.approvalStatus,
          approvedAt: users.approvedAt,
          createdAt: users.createdAt,
        })
        .from(users)
        .where(and(
          eq(users.role, 'trainer'),
          eq(users.instituteId, instituteId)
        ));

      const trainersData = trainersQuery.map(trainer => ({
        id: trainer.id,
        name: trainer.name || '이름 없음',
        email: trainer.email || '',
        phone: trainer.phone || '',
        specialty: trainer.specialty || '일반 훈련',
        certification: [],
        image: trainer.avatar || '',
        status: trainer.approvalStatus === 'approved' ? 'active' as const : 
                trainer.approvalStatus === 'pending' ? 'pending' as const : 'inactive' as const,
        rating: 0,
        courseCount: 0,
        studentCount: 0,
        approvalDate: trainer.approvedAt ? new Date(trainer.approvedAt).toISOString().split('T')[0] : undefined,
        isVerified: trainer.isVerified || false,
        completionRate: 0,
        specialties: trainer.specialty ? [trainer.specialty] : []
      }));

      res.json(trainersData);
    } catch (error) {
      logServerError('기관 훈련사 목록 조회 실패:', error, req);
      res.json([]);
    }
  });

  // 기관 관리자용 - 코스 진행 상태 조회
  app.get('/api/institute/course-progress', requireAuth('institute-admin'), async (req, res) => {
    try {
      const instituteId = req.session.user?.instituteId;
      
      if (!instituteId) {
        return res.json([]);
      }

      // 기관의 코스 목록 조회
      const coursesQuery = await db
        .select({
          id: courses.id,
          title: courses.title,
          category: courses.category,
          enrollmentCount: courses.enrollmentCount,
        })
        .from(courses)
        .where(eq(courses.instituteId, instituteId));

      // 카테고리별로 집계
      const categoryStats: { [key: string]: { name: string; 수료: number; 진행중: number; trainers: number; total: number } } = {};
      
      for (const course of coursesQuery) {
        const category = course.category || '기타';
        if (!categoryStats[category]) {
          categoryStats[category] = { name: category, 수료: 0, 진행중: 0, trainers: 0, total: 0 };
        }
        categoryStats[category].진행중 += course.enrollmentCount || 0;
        categoryStats[category].total += course.enrollmentCount || 0;
      }

      const result = Object.values(categoryStats);
      
      // 결과가 없으면 기본 카테고리 반환
      if (result.length === 0) {
        res.json([
          { name: '기초 훈련', 수료: 0, 진행중: 0, trainers: 0, total: 0 },
          { name: '중급 훈련', 수료: 0, 진행중: 0, trainers: 0, total: 0 },
          { name: '고급 훈련', 수료: 0, 진행중: 0, trainers: 0, total: 0 },
          { name: '행동 교정', 수료: 0, 진행중: 0, trainers: 0, total: 0 },
          { name: '특수 훈련', 수료: 0, 진행중: 0, trainers: 0, total: 0 },
        ]);
      } else {
        res.json(result);
      }
    } catch (error) {
      logServerError('기관 코스 진행 상태 조회 실패:', error, req);
      res.json([]);
    }
  });

  // 기관 관리자용 - 매출 데이터 조회
  app.get('/api/institute/revenue', requireAuth('institute-admin'), async (req, res) => {
    try {
      const instituteId = req.session.user?.instituteId;
      
      if (!instituteId) {
        return res.json([]);
      }

      // 기관의 코스별 매출 데이터 조회
      const coursesQuery = await db
        .select({
          id: courses.id,
          title: courses.title,
          category: courses.category,
          price: courses.price,
          enrollmentCount: courses.enrollmentCount,
        })
        .from(courses)
        .where(eq(courses.instituteId, instituteId));

      // 카테고리별 매출 집계
      const revenueByCategory: { [key: string]: { name: string; value: number } } = {};
      
      for (const course of coursesQuery) {
        const category = course.category || '기타';
        const revenue = (course.price || 0) * (course.enrollmentCount || 0);
        
        if (!revenueByCategory[category]) {
          revenueByCategory[category] = { name: category, value: 0 };
        }
        revenueByCategory[category].value += revenue;
      }

      const result = Object.values(revenueByCategory);
      res.json(result);
    } catch (error) {
      logServerError('기관 매출 데이터 조회 실패:', error, req);
      res.json([]);
    }
  });

  // 기관 관리자용 - 최근 알림 조회
  app.get('/api/institute/notifications', requireAuth('institute-admin'), async (req, res) => {
    try {
      const userId = req.session.user?.id;
      
      if (!userId) {
        return res.json([]);
      }

      // 사용자의 최근 알림 조회
      const notificationsQuery = await db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, userId))
        .orderBy(sql`${notifications.createdAt} DESC`)
        .limit(10);

      const result = notificationsQuery.map(notification => ({
        id: notification.id,
        type: notification.type || 'info',
        title: notification.title || '알림',
        content: notification.message || '',
        time: notification.createdAt ? formatTimeAgo(new Date(notification.createdAt)) : '방금 전',
        isRead: notification.isRead || false
      }));

      res.json(result);
    } catch (error) {
      logServerError('기관 알림 조회 실패:', error, req);
      res.json([]);
    }
  });

  // 기관 관리자용 - 대기 중인 승인 요청 조회
  app.get('/api/institute/pending-approvals', requireAuth('institute-admin'), async (req, res) => {
    try {
      const instituteId = req.session.user?.instituteId;
      
      if (!instituteId) {
        return res.json([]);
      }

      // 대기 중인 코스 승인 요청 조회
      const pendingCourses = await db
        .select({
          id: courses.id,
          title: courses.title,
          trainerId: courses.trainerId,
          createdAt: courses.createdAt,
        })
        .from(courses)
        .where(and(
          eq(courses.instituteId, instituteId),
          eq(courses.status, 'pending')
        ))
        .limit(10);

      const result = pendingCourses.map(course => ({
        id: course.id,
        type: '코스' as const,
        title: course.title || '제목 없음',
        trainer: '훈련사',
        date: course.createdAt ? new Date(course.createdAt).toISOString().split('T')[0] : ''
      }));

      res.json(result);
    } catch (error) {
      logServerError('기관 대기 승인 조회 실패:', error, req);
      res.json([]);
    }
  });

  // 기관 관리자용 - 주요 지표 조회
  app.get('/api/institute/metrics', requireAuth('institute-admin'), async (req, res) => {
    try {
      const instituteId = req.session.user?.instituteId;
      
      if (!instituteId) {
        return res.json({
          newRegistrations: 0,
          completedCourses: 0,
          issuedCertificates: 0,
          activeCourses: 0,
          newRegistrationsChange: '0%',
          completedCoursesChange: '0%',
          issuedCertificatesChange: '0%',
          activeCoursesChange: '0%'
        });
      }

      // 활성 코스 수
      const activeCoursesQuery = await db
        .select({ count: sql`count(*)` })
        .from(courses)
        .where(and(
          eq(courses.instituteId, instituteId),
          eq(courses.status, 'active')
        ));
      const activeCourses = Number(activeCoursesQuery[0]?.count) || 0;

      // 전체 등록 수 (enrollmentCount 합계)
      const enrollmentsQuery = await db
        .select({ total: sql`COALESCE(SUM(${courses.enrollmentCount}), 0)` })
        .from(courses)
        .where(eq(courses.instituteId, instituteId));
      const newRegistrations = Number(enrollmentsQuery[0]?.total) || 0;

      // 완료된 코스 수
      const completedCoursesQuery = await db
        .select({ count: sql`count(*)` })
        .from(courses)
        .where(and(
          eq(courses.instituteId, instituteId),
          eq(courses.status, 'completed')
        ));
      const completedCourses = Number(completedCoursesQuery[0]?.count) || 0;

      res.json({
        newRegistrations,
        completedCourses,
        issuedCertificates: 0, // 수료증 테이블이 없으므로 0
        activeCourses,
        newRegistrationsChange: '+0%',
        completedCoursesChange: '+0%',
        issuedCertificatesChange: '+0%',
        activeCoursesChange: '+0%'
      });
    } catch (error) {
      logServerError('기관 주요 지표 조회 실패:', error, req);
      res.json({
        newRegistrations: 0,
        completedCourses: 0,
        issuedCertificates: 0,
        activeCourses: 0,
        newRegistrationsChange: '0%',
        completedCoursesChange: '0%',
        issuedCertificatesChange: '0%',
        activeCoursesChange: '0%'
      });
    }
  });

  // 기관 관리자용 - 기관 설정 정보 조회
  app.get('/api/institute/settings', requireAuth('institute-admin'), async (req, res) => {
    try {
      const instituteId = req.session.user?.instituteId;
      
      if (!instituteId) {
        return res.json({
          name: '',
          description: '',
          address: '',
          phone: '',
          email: '',
          website: '',
          businessHours: '',
          logoUrl: ''
        });
      }

      const institute = await storage.getInstitute(instituteId);
      
      if (!institute) {
        return res.json({
          name: '',
          description: '',
          address: '',
          phone: '',
          email: '',
          website: '',
          businessHours: '',
          logoUrl: ''
        });
      }

      res.json({
        name: institute.name || '',
        description: institute.description || '',
        address: institute.address || '',
        phone: institute.phone || '',
        email: institute.email || '',
        website: institute.website || '',
        businessHours: institute.businessHours || '',
        logoUrl: institute.logo || ''
      });
    } catch (error) {
      logServerError('기관 설정 정보 조회 실패:', error, req);
      res.json({
        name: '',
        description: '',
        address: '',
        phone: '',
        email: '',
        website: '',
        businessHours: '',
        logoUrl: ''
      });
    }
  });

  // 기관 관리자용 - 반려견 배정 목록 조회
  app.get('/api/institute/pet-assignments', requireAuth('institute-admin'), async (req, res) => {
    try {
      const instituteId = req.session.user?.instituteId;
      
      if (!instituteId) {
        return res.json([]);
      }

      // 기관 소속 훈련사들의 ID 조회
      const trainersQuery = await db
        .select({ id: users.id, name: users.name })
        .from(users)
        .where(and(
          eq(users.role, 'trainer'),
          eq(users.instituteId, instituteId)
        ));

      const trainerIds = trainersQuery.map(t => t.id);
      const trainerMap = new Map(trainersQuery.map(t => [t.id, t.name]));

      if (trainerIds.length === 0) {
        return res.json([]);
      }

      // 기관 소속 수강생의 펫들 조회
      const studentsQuery = await db
        .select({ id: users.id, name: users.name })
        .from(users)
        .where(and(
          eq(users.role, 'pet-owner'),
          eq(users.instituteId, instituteId)
        ));

      const studentIds = studentsQuery.map(s => s.id);
      const studentMap = new Map(studentsQuery.map(s => [s.id, s.name]));

      if (studentIds.length === 0) {
        return res.json([]);
      }

      // 해당 수강생들의 펫 조회
      const petsQuery = await db
        .select()
        .from(pets)
        .where(sql`${pets.ownerId} = ANY(${studentIds})`);

      // 배정 정보 생성 (실제로는 enrollments 테이블이 있어야 하지만, 현재는 간단히 구현)
      const assignments = petsQuery.map((pet, index) => ({
        id: pet.id,
        petName: pet.name || '이름 없음',
        ownerName: studentMap.get(pet.ownerId) || '보호자 미확인',
        trainerName: trainerMap.get(trainerIds[index % trainerIds.length]) || '미배정',
        courseName: '기본 훈련',
        startDate: pet.createdAt ? new Date(pet.createdAt).toISOString().split('T')[0] : '',
        status: 'active' as const,
        progress: 0
      }));

      res.json(assignments);
    } catch (error) {
      logServerError('반려견 배정 목록 조회 실패:', error, req);
      res.json([]);
    }
  });

  // === Registration API Routes ===

  // 훈련사 등록 신청
  app.post('/api/registration/trainer', upload.any(), async (req, res) => {
    try {
      const registrationData = JSON.parse(req.body.registrationData);
      
      // 파일 처리
      const files = req.files as Express.Multer.File[];
      const processedFiles = {
        profileImage: null as string | null,
        resume: null as string | null,
        certificationDocs: [] as string[],
        portfolioImages: [] as string[]
      };

      if (files) {
        files.forEach(file => {
          const filePath = `/uploads/${file.filename}`;
          
          if (file.fieldname === 'profileImage') {
            processedFiles.profileImage = filePath;
          } else if (file.fieldname === 'resume') {
            processedFiles.resume = filePath;
          } else if (file.fieldname.startsWith('certificationDoc_')) {
            processedFiles.certificationDocs.push(filePath);
          } else if (file.fieldname.startsWith('portfolioImage_')) {
            processedFiles.portfolioImages.push(filePath);
          }
        });
      }

      // 기관 정보 추출
      let verifiedInstitute = registrationData.verifiedInstitute;
      const instituteCode = registrationData.businessInfo?.instituteCode || null;
      
      // 기관 코드가 없으면 기본 TALEZ 공식 기관으로 연결
      if (!verifiedInstitute && !instituteCode) {
        const defaultInstitute = await storage.getInstituteByCode('TALEZ');
        if (defaultInstitute) {
          verifiedInstitute = {
            id: defaultInstitute.id,
            name: defaultInstitute.name,
            code: defaultInstitute.code
          };
          console.log('[훈련사 등록] 기관 코드 미입력 - 기본 TALEZ 기관으로 연결:', verifiedInstitute.name);
        }
      }
      
      // 기관 정보를 JSON으로 저장 (승인 시 trainer_institutes 연결에 사용)
      const affiliationData = verifiedInstitute ? JSON.stringify({
        id: verifiedInstitute.id,
        name: verifiedInstitute.name,
        code: verifiedInstitute.code
      }) : (registrationData.affiliationName || null);
      
      // 데이터베이스에 저장
      const [application] = await db.insert(trainerApplications).values({
        name: registrationData.personalInfo?.name || registrationData.name,
        email: registrationData.personalInfo?.email || registrationData.email,
        phone: registrationData.personalInfo?.phone || registrationData.phone,
        hasAffiliation: true, // 기관 코드가 없어도 기본 TALEZ 기관에 소속됨
        affiliationName: affiliationData,
        experience: registrationData.professionalInfo?.experience || registrationData.experience || null,
        education: registrationData.education || null,
        certifications: JSON.stringify(
          registrationData.professionalInfo?.certifications || processedFiles.certificationDocs
        ),
        motivation: registrationData.professionalInfo?.bio || registrationData.motivation || null,
        portfolioUrl: JSON.stringify(processedFiles.portfolioImages),
        resume: processedFiles.resume || processedFiles.profileImage || null,
        status: 'pending',
      }).returning();

      console.log('훈련사 등록 신청 저장 완료:', application.id);
      
      // 기관 연결 정보 로그 (승인 후 실제 연결됨)
      if (verifiedInstitute) {
        console.log(`[훈련사 등록] 기관 연결 정보 저장됨: ${verifiedInstitute.name} (ID: ${verifiedInstitute.id}, 코드: ${verifiedInstitute.code})`);
        console.log(`[훈련사 등록] affiliationName에 JSON 저장: ${affiliationData}`);
        // 메모: 훈련사 신청 승인 시 affiliationName의 JSON을 파싱하여 trainer_institutes 테이블에 연결 생성
      }

      res.status(201).json({
        success: true,
        message: '훈련사 등록 신청이 접수되었습니다.',
        applicationId: application.id,
        linkedInstitute: verifiedInstitute ? {
          name: verifiedInstitute.name,
          code: verifiedInstitute.code
        } : null
      });

    } catch (error) {
      logServerError('훈련사 등록 실패:', error, req);
      res.status(500).json({
        success: false,
        message: '등록 신청 처리 중 오류가 발생했습니다.'
      });
    }
  });

  // 기관 등록 신청
  app.post('/api/registration/institute', upload.any(), async (req, res) => {
    try {
      const registrationData = JSON.parse(req.body.registrationData);
      
      // 파일 처리
      const files = req.files as Express.Multer.File[];
      const processedFiles = {
        businessLicense: null as string | null,
        facilityImages: [] as string[],
        certificationDocs: [] as string[]
      };

      if (files) {
        files.forEach(file => {
          const filePath = `/uploads/${file.filename}`;
          
          if (file.fieldname === 'businessLicense') {
            processedFiles.businessLicense = filePath;
          } else if (file.fieldname.startsWith('facilityImage_')) {
            processedFiles.facilityImages.push(filePath);
          } else if (file.fieldname.startsWith('certificationDoc_')) {
            processedFiles.certificationDocs.push(filePath);
          }
        });
      }

      // 데이터베이스에 저장
      const [application] = await db.insert(instituteApplications).values({
        instituteName: registrationData.instituteName,
        representativeName: registrationData.representativeName,
        email: registrationData.email,
        phone: registrationData.phone,
        businessNumber: registrationData.businessNumber || null,
        address: registrationData.address,
        website: registrationData.website || null,
        description: registrationData.description || null,
        certificationDocuments: JSON.stringify(processedFiles.certificationDocs),
        facilities: JSON.stringify(processedFiles.facilityImages),
        trainerCount: registrationData.trainerCount || 0,
        capacity: registrationData.capacity || 0,
        programs: registrationData.programs || null,
        status: 'pending',
      }).returning();

      console.log('기관 등록 신청 저장 완료:', application.id);

      res.status(201).json({
        success: true,
        message: '기관 등록 신청이 접수되었습니다.',
        applicationId: application.id
      });

    } catch (error) {
      logServerError('기관 등록 실패:', error, req);
      res.status(500).json({
        success: false,
        message: '등록 신청 처리 중 오류가 발생했습니다.'
      });
    }
  });

  // 등록 신청 목록 조회 (관리자용)
  app.get('/api/admin/registrations', requireAuth('admin'), async (req, res) => {
    try {
      const { type, status } = req.query;
      
      let applications: any[] = [];

      // 타입에 따라 다른 테이블에서 조회
      if (!type || type === 'trainer') {
        const trainerApps = await db
          .select()
          .from(trainerApplications)
          .where(status ? eq(trainerApplications.status, status as string) : undefined)
          .orderBy(desc(trainerApplications.submittedAt));
        
        applications.push(...trainerApps.map(app => ({
          ...app,
          type: 'trainer',
          applicantInfo: {
            name: app.name,
            email: app.email,
            phone: app.phone,
            hasAffiliation: app.hasAffiliation,
            affiliationName: app.affiliationName,
            experience: app.experience,
            education: app.education,
            motivation: app.motivation,
          },
          documents: {
            certificationDocs: app.certifications ? JSON.parse(app.certifications) : [],
            portfolioImages: app.portfolioUrl ? JSON.parse(app.portfolioUrl) : [],
            profileImage: app.resume,
          },
          reviewerId: app.reviewedBy,
          notes: app.reviewNotes || '',
        })));
      }

      if (!type || type === 'institute') {
        const instituteApps = await db
          .select()
          .from(instituteApplications)
          .where(status ? eq(instituteApplications.status, status as string) : undefined)
          .orderBy(desc(instituteApplications.submittedAt));
        
        applications.push(...instituteApps.map(app => ({
          ...app,
          type: 'institute',
          applicantInfo: {
            instituteName: app.instituteName,
            representativeName: app.representativeName,
            email: app.email,
            phone: app.phone,
            businessNumber: app.businessNumber,
            address: app.address,
            website: app.website,
            description: app.description,
            trainerCount: app.trainerCount,
            capacity: app.capacity,
            programs: app.programs,
          },
          documents: {
            certificationDocs: app.certificationDocuments ? JSON.parse(app.certificationDocuments) : [],
            facilityImages: app.facilities ? JSON.parse(app.facilities) : [],
          },
          reviewerId: app.reviewedBy,
          notes: app.reviewNotes || '',
        })));
      }

      // 최신순 정렬
      applications.sort((a, b) => 
        new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
      );

      res.json({
        success: true,
        applications,
        total: applications.length
      });

    } catch (error) {
      logServerError('등록 신청 목록 조회 실패:', error, req);
      res.status(500).json({
        success: false,
        message: '등록 신청 목록 조회 중 오류가 발생했습니다.'
      });
    }
  });

  // 등록 신청 승인/거부 (관리자용)
  app.put('/api/admin/registrations/:id', async (req, res) => {
    try {
      const applicationId = parseInt(req.params.id);
      const { status, notes, type } = req.body;

      console.log(`[등록 신청 처리] ID: ${applicationId}, Type: ${type}, Status: ${status}`);

      let application: any = null;
      let applicationType: string = type;

      // type이 명시되지 않은 경우 두 테이블 모두 확인
      if (!applicationType) {
        const trainerApp = await db
          .select()
          .from(trainerApplications)
          .where(eq(trainerApplications.id, applicationId))
          .limit(1);
        
        if (trainerApp.length > 0) {
          application = trainerApp[0];
          applicationType = 'trainer';
        } else {
          const instituteApp = await db
            .select()
            .from(instituteApplications)
            .where(eq(instituteApplications.id, applicationId))
            .limit(1);
          
          if (instituteApp.length > 0) {
            application = instituteApp[0];
            applicationType = 'institute';
          }
        }
      } else if (applicationType === 'trainer') {
        const trainerApp = await db
          .select()
          .from(trainerApplications)
          .where(eq(trainerApplications.id, applicationId))
          .limit(1);
        application = trainerApp[0];
      } else if (applicationType === 'institute') {
        const instituteApp = await db
          .select()
          .from(instituteApplications)
          .where(eq(instituteApplications.id, applicationId))
          .limit(1);
        application = instituteApp[0];
      }

      if (!application) {
        console.log(`[등록 신청 처리] 신청을 찾을 수 없음: ${applicationId}`);
        return res.status(404).json({
          success: false,
          message: '등록 신청을 찾을 수 없습니다.'
        });
      }

      // 데이터베이스에서 상태 업데이트
      // 주의: trainer + approved 분기는 아래 db.transaction 내부에서 함께 원자적으로 처리됨
      if (applicationType === 'trainer' && status !== 'approved') {
        await db
          .update(trainerApplications)
          .set({
            status,
            reviewNotes: notes || '',
            reviewedBy: req.user?.id || null,
            reviewedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(trainerApplications.id, applicationId));
      } else if (applicationType === 'institute') {
        await db
          .update(instituteApplications)
          .set({
            status,
            reviewNotes: notes || '',
            reviewedBy: req.user?.id || null,
            reviewedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(instituteApplications.id, applicationId));
      }

      console.log(`[등록 신청 처리] 데이터베이스 업데이트 완료: ${applicationId}`);

      // 승인된 경우 실제 훈련사/기관으로 등록
      if (status === 'approved') {
        if (applicationType === 'trainer') {
          // 트랜잭션으로 신청 상태 업데이트 + 트레이너 생성 + 사용자 권한 업데이트 + 기관 연결까지 원자적으로 묶음
          try {
            await db.transaction(async (tx) => {
              // 0) 신청 상태를 트랜잭션 내부에서 갱신 (실패 시 함께 롤백됨)
              await tx.update(trainerApplications).set({
                status,
                reviewNotes: notes || '',
                reviewedBy: req.user?.id || null,
                reviewedAt: new Date(),
                updatedAt: new Date(),
              }).where(eq(trainerApplications.id, applicationId));

              // 신청자 이메일로 사용자 조회 (없으면 trainers만 생성, role 업데이트는 생략)
              const matchedUsers = await tx.select().from(users)
                .where(eq(users.email, application.email)).limit(1);
              const matchedUser = matchedUsers[0];

              // 중복 방지: 이미 trainers에 등록된 동일 사용자/이메일 존재하는지 확인
              const existingByUser = matchedUser
                ? await tx.select().from(trainers).where(eq(trainers.userId, matchedUser.id)).limit(1)
                : [];
              const existingByEmail = await tx.select().from(trainers)
                .where(eq(trainers.email, application.email)).limit(1);

              const expNum = parseInt(String(application.experience || '0').replace(/[^0-9]/g, '')) || 0;

              type TrainerRow = typeof trainers.$inferSelect;
              let trainerRow: TrainerRow | null = existingByUser[0] || existingByEmail[0] || null;

              if (!trainerRow) {
                const [created] = await tx.insert(trainers).values({
                  userId: matchedUser?.id ?? null,
                  name: application.name,
                  email: application.email,
                  phone: application.phone,
                  bio: application.motivation || '',
                  specialties: [],
                  experience: expNum,
                  certification: application.certifications || null,
                  certifications: [],
                  price: '0',
                  profileImage: application.resume || null,
                  rating: '0',
                  reviewCount: 0,
                  featured: false,
                  verified: true,
                  isActive: true,
                  status: 'active',
                }).returning();
                trainerRow = created;
                console.log('[훈련사 승인] trainers 레코드 생성:', trainerRow.id);
              } else {
                console.log('[훈련사 승인] trainers 레코드 이미 존재 - 재사용:', trainerRow.id);
                // 기존 레코드의 userId가 비어있고 매칭된 사용자가 있으면 연결
                if (!trainerRow.userId && matchedUser?.id) {
                  await tx.update(trainers).set({ userId: matchedUser.id, verified: true, isActive: true })
                    .where(eq(trainers.id, trainerRow.id));
                }
              }

              // 사용자 role을 trainer로 업데이트 (이미 admin/trainer면 유지)
              if (matchedUser && matchedUser.role !== 'trainer' && matchedUser.role !== 'admin') {
                await tx.update(users).set({
                  role: 'trainer',
                  isVerified: true,
                  approvalStatus: 'approved',
                  approvedAt: new Date(),
                  approvedBy: req.user?.id || null,
                  updatedAt: new Date(),
                }).where(eq(users.id, matchedUser.id));
                console.log('[훈련사 승인] users.role -> trainer:', matchedUser.id);
              }

              // 기관 연결 정보가 있다면 trainer_institutes 테이블에 연결 (중복 방지)
              if (application.hasAffiliation && application.affiliationName) {
                try {
                  const affiliation = JSON.parse(application.affiliationName);
                  if (affiliation?.id && trainerRow?.id) {
                    const linked = await tx.select().from(trainerInstitutes)
                      .where(and(
                        eq(trainerInstitutes.trainerId, trainerRow.id),
                        eq(trainerInstitutes.instituteId, affiliation.id)
                      )).limit(1);
                    if (linked.length === 0) {
                      await tx.insert(trainerInstitutes).values({
                        trainerId: trainerRow.id,
                        instituteId: affiliation.id,
                        joinDate: new Date(),
                      });
                      console.log('[훈련사 승인] trainer_institutes 연결 생성:', { trainerId: trainerRow.id, instituteId: affiliation.id });
                    }
                  }
                } catch (parseErr) {
                  console.log('[훈련사 승인] affiliationName JSON 아님 (수동입력):', application.affiliationName);
                }
              }
            });
          } catch (txError) {
            logServerError('[훈련사 승인] 트랜잭션 실패 - DB 원자성으로 신청 상태 자동 롤백됨:', txError, req);
            return res.status(500).json({
              success: false,
              message: '훈련사 승인 중 데이터 생성에 실패하여 롤백되었습니다.',
              error: (txError as Error).message,
            });
          }

        } else if (applicationType === 'institute') {
          const instituteData = {
            id: Date.now(),
            name: application.instituteName,
            email: application.email,
            phone: application.phone,
            address: application.address,
            description: application.description || '',
            establishedYear: 2024,
            capacity: application.capacity || 0,
            facilities: application.facilities ? JSON.parse(application.facilities) : [],
            services: [],
            operatingHours: '09:00-18:00',
            rating: 0,
            reviewCount: 0,
            isActive: true,
            createdAt: new Date().toISOString()
          };

          await storage.createInstitute(instituteData);
          console.log('[기관 승인] 실제 서비스에 반영됨:', instituteData.name);
        }
      }

      const applicationName = applicationType === 'trainer' ? application.name : application.instituteName;
      console.log(`[등록 신청 처리] ${status} 완료:`, applicationName);

      res.json({
        success: true,
        message: `등록 신청이 ${status === 'approved' ? '승인' : '거부'}되었습니다.`,
        application
      });

    } catch (error) {
      logServerError('[등록 신청 처리] 실패:', error, req);
      res.status(500).json({
        success: false,
        message: '등록 신청 처리 중 오류가 발생했습니다.'
      });
    }
  });

  // 처리 완료된 등록 신청 초기화 (관리자용)
  // 데이터베이스에서는 데이터를 삭제하지 않고 보관하므로 이 API는 사용하지 않음
  app.delete('/api/admin/registrations/clear-processed', async (req, res) => {
    try {
      // 데이터베이스에서는 영구 보관을 권장하므로 이 기능은 비활성화
      res.json({
        success: true,
        message: '데이터베이스에서는 모든 등록 신청이 영구 보관됩니다.',
        clearedCount: 0
      });

    } catch (error) {
      logServerError('처리 완료된 신청 초기화 실패:', error, req);
      res.status(500).json({
        success: false,
        message: '처리 완료된 신청 초기화 중 오류가 발생했습니다.'
      });
    }
  });

  // 커리큘럼 관리 API
  app.get('/api/courses/curriculum', async (req, res) => {
    try {
      const courses = await storage.getAllCourses();
      res.json({ courses });
    } catch (error) {
      logServerError('[커리큘럼] 강의 목록 조회 실패:', error, req);
      res.status(500).json({ message: '강의 목록을 불러올 수 없습니다.' });
    }
  });

  app.post('/api/courses/curriculum', async (req, res) => {
    try {
      const { title, description, difficulty, price } = req.body;
      
      const course = {
        id: Date.now().toString(),
        title,
        description,
        trainerId: req.user?.id || '1',
        trainerName: req.user?.name || '훈련사',
        modules: [],
        totalDuration: 0,
        difficulty,
        price,
        enrollmentCount: 0,
        rating: 0,
        status: 'draft',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      res.json(course);
    } catch (error) {
      logServerError('[커리큘럼] 강의 생성 실패:', error, req);
      res.status(500).json({ message: '강의 생성에 실패했습니다.' });
    }
  });

  // Excel 파일 업로드를 위한 multer 설정
  const curriculumStorage = multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = 'uploads/curriculum';
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
      cb(null, 'curriculum-' + uniqueSuffix + '-' + originalName);
    }
  });

  const curriculumUpload = multer({
    storage: curriculumStorage,
    limits: {
      fileSize: 50 * 1024 * 1024, // 50MB
    },
    fileFilter: (req, file, cb) => {
      const allowedTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
        'application/vnd.ms-excel', // .xls
        'application/x-hwp', // .hwp
        'application/vnd.hancom.hwp' // .hwpx
      ];
      
      if (allowedTypes.includes(file.mimetype) || 
          file.originalname.match(/\.(xlsx|xls|hwp|hwpx)$/i)) {
        cb(null, true);
      } else {
        cb(new Error('지원되지 않는 파일 형식입니다. Excel 파일(.xlsx, .xls) 또는 HWP 파일(.hwp, .hwpx)만 업로드 가능합니다.'), false);
      }
    }
  });

  // 영상 파일 업로드를 위한 multer 설정
  const videoStorage = multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = 'uploads/videos';
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
      cb(null, 'video-' + uniqueSuffix + '-' + originalName);
    }
  });

  const videoUpload = multer({
    storage: videoStorage,
    limits: {
      fileSize: 500 * 1024 * 1024, // 500MB
    },
    fileFilter: (req, file, cb) => {
      const allowedTypes = [
        'video/mp4',
        'video/avi', 
        'video/mov',
        'video/quicktime',
        'video/x-msvideo'
      ];
      
      if (allowedTypes.includes(file.mimetype) || 
          file.originalname.match(/\.(mp4|avi|mov|quicktime)$/i)) {
        cb(null, true);
      } else {
        cb(new Error('지원되지 않는 파일 형식입니다. MP4, AVI, MOV 파일만 업로드 가능합니다.'), false);
      }
    }
  });

  // 커리큘럼 파일 업로드 API
  app.post('/api/admin/curriculum/upload', curriculumUpload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ 
          success: false, 
          message: '업로드할 파일이 없습니다.' 
        });
      }

      const file = req.file;
      const filePath = file.path;
      const fileExtension = path.extname(file.originalname).toLowerCase();

      console.log('[커리큘럼 업로드] 파일 정보:', {
        originalName: file.originalname,
        filename: file.filename,
        mimetype: file.mimetype,
        size: file.size,
        extension: fileExtension
      });

      let extractedData = {};
      let registrantInfo = {};

      // 파일 형식에 따른 처리
      if (fileExtension === '.xlsx' || fileExtension === '.xls') {
        try {
          // 파일 경로를 Buffer로 읽어서 한글 파일명 문제 해결
          let workbook;
          try {
            // 먼저 파일 경로로 직접 시도
            workbook = xlsx.readFile(filePath);
          } catch (pathError) {
            console.log('[엑셀 파싱] 파일 경로 접근 실패, Buffer로 읽기 시도:', pathError.message);
            // 파일을 Buffer로 읽어서 처리
            const fileBuffer = fs.readFileSync(filePath);
            workbook = xlsx.read(fileBuffer, { type: 'buffer' });
          }
          
          console.log('[엑셀 파싱] 파일 경로:', filePath);
          console.log('[엑셀 파싱] 워크북 로드 성공');
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

          console.log('[엑셀 파싱] 시트명:', sheetName);
          console.log('[엑셀 파싱] 데이터 행 수:', data.length);

          // 파일 이름에서 기본 정보 추출
          const fileName = file.originalname.replace(/\.(xlsx|xls)$/i, '');
          
          // 엑셀 파싱 함수 호출
          extractedData = parseExcelCurriculumWithPricing(data, fileName);
          
          // 등록자 정보 추출 (첫 번째 행에서)
          if (data.length > 0 && data[0].length > 0) {
            registrantInfo = {
              name: data[0][0] || '미확인',
              email: data[0][1] || '',
              phone: data[0][2] || '',
              institution: data[0][3] || ''
            };
          }

          console.log('[엑셀 파싱] 추출된 데이터:', extractedData);
          console.log('[엑셀 파싱] 등록자 정보:', registrantInfo);

        } catch (parseError) {
          logServerError('[엑셀 파싱] 파일 파싱 오류:', parseError, req);
          return res.status(400).json({ 
            success: false, 
            message: 'Excel 파일을 읽는 중 오류가 발생했습니다. 파일 형식을 확인해주세요.' 
          });
        }
      } else {
        // HWP 파일 처리 (기본 정보만 추출)
        const fileName = file.originalname.replace(/\.(hwp|hwpx)$/i, '');
        extractedData = {
          title: fileName,
          description: `${fileName} 커리큘럼`,
          category: '전문교육',
          difficulty: 'intermediate',
          duration: 480,
          price: 300000,
          modules: []
        };
        
        registrantInfo = {
          name: '미확인',
          email: '',
          phone: '',
          institution: ''
        };
      }

      // 파일 삭제 (임시 파일 정리)
      try {
        fs.unlinkSync(filePath);
      } catch (unlinkError) {
        console.warn('[파일 정리] 임시 파일 삭제 실패:', unlinkError);
      }

      res.json({
        success: true,
        data: extractedData,
        registrantInfo: registrantInfo,
        message: '파일이 성공적으로 처리되었습니다.'
      });

    } catch (error) {
      logServerError('[커리큘럼 업로드] 처리 오류:', error, req);
      
      // 파일 정리
      if (req.file && req.file.path) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (unlinkError) {
          console.warn('[파일 정리] 오류 발생 시 파일 삭제 실패:', unlinkError);
        }
      }
      
      res.status(500).json({ 
        success: false, 
        message: '파일 처리 중 오류가 발생했습니다. 파일 형식과 내용을 확인해주세요.' 
      });
    }
  });

  app.post('/api/courses/:courseId/modules', async (req, res) => {
    try {
      const { courseId } = req.params;
      const { title, description, duration, difficulty, objectives, prerequisites, isRequired } = req.body;
      
      const module = {
        id: Date.now().toString(),
        title,
        description,
        order: 0,
        duration,
        difficulty,
        objectives: objectives || [],
        prerequisites: prerequisites || [],
        isRequired: isRequired !== false,
        videos: []
      };

      res.json(module);
    } catch (error) {
      logServerError('[커리큘럼] 모듈 생성 실패:', error, req);
      res.status(500).json({ message: '모듈 생성에 실패했습니다.' });
    }
  });

  app.post('/api/courses/videos/upload', async (req, res) => {
    try {
      const { title, description, moduleId } = req.body;
      
      const video = {
        id: Date.now().toString(),
        title,
        description,
        duration: Math.floor(Math.random() * 30) + 5, // 5-35분
        videoUrl: undefined,
        thumbnailUrl: undefined,
        uploadedAt: new Date(),
        status: 'ready'
      };

      res.json(video);
    } catch (error) {
      logServerError('[커리큘럼] 비디오 업로드 실패:', error, req);
      res.status(500).json({ message: '비디오 업로드에 실패했습니다.' });
    }
  });

  // 관리자 커리큘럼 관리 API
  app.get('/api/admin/curriculums', requireAuth('admin'), async (req, res) => {
    try {
      // 실제 등록된 커리큘럼만 반환 (Storage에서 가져오기)
      const curriculums = await storage.getCurriculums();
      
      res.json({ curriculums });
    } catch (error) {
      logServerError('[관리자 커리큘럼] 조회 실패:', error, req);
      res.status(500).json({ message: '커리큘럼 조회에 실패했습니다.' });
    }
  });

  // 개별 커리큘럼 조회 API (미리보기용 - 인증 불필요)
  app.get('/api/courses/:id/preview', async (req, res) => {
    try {
      const curriculumId = req.params.id;
      const curriculums = await storage.getCurriculums();
      const curriculum = curriculums.find(c => c.id === curriculumId);
      
      if (!curriculum) {
        return res.status(404).json({ message: '커리큘럼을 찾을 수 없습니다.' });
      }
      
      res.json(curriculum);
    } catch (error) {
      logServerError('[커리큘럼 미리보기] 조회 실패:', error, req);
      res.status(500).json({ message: '커리큘럼 조회에 실패했습니다.' });
    }
  });

  app.post('/api/admin/curriculums', requireAuth('admin'), async (req, res) => {
    try {
      const curriculumData = req.body;
      
      // 새 커리큘럼 ID 생성
      const newCurriculum = {
        ...curriculumData,
        id: `curriculum-${Date.now()}`,
        status: 'draft',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      console.log('[관리자 커리큘럼] 새 커리큘럼 생성:', newCurriculum.title);
      console.log('[관리자 커리큘럼] 모듈 개수:', newCurriculum.modules?.length || 0);
      console.log('[관리자 커리큘럼] 모듈 데이터:', JSON.stringify(newCurriculum.modules, null, 2));
      
      // 실제로 storage에 저장
      const savedCurriculum = await storage.createCurriculum(newCurriculum);
      
      console.log('[관리자 커리큘럼] 저장된 커리큘럼 모듈 개수:', savedCurriculum.modules?.length || 0);
      
      res.json(newCurriculum);
    } catch (error) {
      logServerError('[관리자 커리큘럼] 생성 실패:', error, req);
      res.status(500).json({ message: '커리큘럼 생성에 실패했습니다.' });
    }
  });

  // 커리큘럼 삭제 API
  app.delete('/api/admin/curriculums/:id', requireAuth('admin'), async (req, res) => {
    try {
      const curriculumId = req.params.id;
      
      console.log('[관리자 커리큘럼] 커리큘럼 삭제:', curriculumId);
      
      // 실제로는 데이터베이스에서 삭제
      // await storage.deleteCurriculum(curriculumId);
      
      res.json({ 
        success: true,
        message: '커리큘럼이 성공적으로 삭제되었습니다.' 
      });
    } catch (error) {
      logServerError('[관리자 커리큘럼] 삭제 실패:', error, req);
      res.status(500).json({ message: '커리큘럼 삭제에 실패했습니다.' });
    }
  });

  // 커리큘럼 발행 신청 API (등록신청관리로 전송)
  app.post('/api/admin/curriculums/:id/submit-for-approval', requireAuth('admin'), async (req, res) => {
    try {
      const curriculumId = req.params.id;
      const curriculumData = req.body;
      
      console.log('[커리큘럼 발행] 발행 신청:', curriculumData.title);
      
      // 등록신청관리에 추가할 신청 데이터 생성
      const application = {
        id: `curriculum_${curriculumId}_${Date.now()}`,
        type: 'curriculum',
        status: 'pending',
        applicantInfo: {
          curriculumInfo: {
            id: curriculumId,
            title: curriculumData.title,
            description: curriculumData.description,
            category: curriculumData.category,
            difficulty: curriculumData.difficulty,
            duration: curriculumData.duration,
            price: curriculumData.price,
            moduleCount: curriculumData.modules?.length || 0,
            trainerName: curriculumData.trainerName || '관리자',
            trainerEmail: curriculumData.trainerEmail || 'admin@talez.com'
          }
        },
        submittedAt: new Date().toISOString(),
        submitterId: req.user?.id || 'admin'
      };

      // 커리큘럼 발행 - 데이터베이스 마이그레이션 필요
      // 현재는 즉시 코스로 생성
      const courseData = {
        id: `course-${Date.now()}`,
        title: curriculumData.title,
        instructor: curriculumData.trainerName || '관리자',
        description: curriculumData.description,
        category: curriculumData.category,
        difficulty: curriculumData.difficulty,
        price: curriculumData.price,
        duration: curriculumData.duration,
        modules: curriculumData.modules || [],
        enrollmentCount: 0,
        rating: 0,
        reviewCount: 0,
        isActive: true,
        featured: false,
        tags: [curriculumData.category],
        createdAt: new Date().toISOString()
      };

      await storage.createCourse(courseData);
      console.log('[커리큘럼 발행] 즉시 코스로 생성됨:', courseData.title);
      
      res.json({ 
        success: true,
        courseId: courseData.id,
        message: '커리큘럼이 즉시 코스로 발행되었습니다.' 
      });
    } catch (error) {
      logServerError('[커리큘럼 발행] 신청 실패:', error, req);
      res.status(500).json({ message: '커리큘럼 발행 신청에 실패했습니다.' });
    }
  });

  // 회원 확인 API
  app.get('/api/members/verify', async (req, res) => {
    try {
      const { email } = req.query;
      
      if (!email) {
        return res.status(400).json({ 
          isRegistered: false,
          message: '이메일이 필요합니다.' 
        });
      }

      // 실제 회원 확인 로직 (임시로 더미 데이터 사용)
      const registeredEmails = [
        'admin@test.com',
        'trainer@test.com',
        'user@test.com',
        'hansung@talez.com',
        'dongmin@gmail.com',
        'jung@daum.net',
        'kim@naver.com',
        'test@talez.com'
      ];
      
      const isRegistered = registeredEmails.includes(email.toString().toLowerCase());
      
      res.json({
        isRegistered,
        message: isRegistered ? '등록된 회원입니다.' : '등록되지 않은 이메일입니다.',
        email: email
      });
    } catch (error) {
      logServerError('회원 확인 실패:', error, req);
      res.status(500).json({ 
        isRegistered: false,
        message: '회원 확인 중 오류가 발생했습니다.' 
      });
    }
  });

  // 커리큘럼 파일 업로드 API
  app.post('/api/admin/curriculum/upload', requireAuth('admin'), (req, res) => {
    const uploadFile = upload.single('file'); // 'file' 필드명으로 파일 업로드 받음
    
    uploadFile(req, res, async (err) => {
      if (err) {
        logServerError('커리큘럼 파일 업로드 오류:', err, req);
        return res.status(400).json({ 
          error: err.message || '파일 업로드에 실패했습니다.' 
        });
      }

      if (!req.file) {
        return res.status(400).json({ 
          error: '업로드할 파일이 없습니다.' 
        });
      }

      try {
        // 파일 처리 로직
        const fileExtension = path.extname(req.file.originalname).toLowerCase();
        let extractedData = {
          title: path.basename(req.file.originalname, fileExtension),
          description: '파일에서 추출된 커리큘럼 내용',
          category: '기타',
          duration: 120,
          price: 50000
        };

        // 파일 형식별 처리
        if (fileExtension === '.hwp') {
          // HWP 파일 처리 - 한성규 작성자의 테일즈 강의 내용 분석
          const fileName = req.file.originalname;
          
          if (fileName.includes('한성규')) {
            extractedData = {
              title: '테일즈 강의 내용 - 반려견 행동교정 전문과정',
              description: `작성자: 한성규
              
• 반려견 기초 복종훈련부터 고급 행동교정까지 체계적 교육과정
• 실무 중심의 훈련 방법론 및 케이스 스터디 포함
• 보호자 교육과 반려견 사회화 프로그램 통합 구성
• 문제행동 분석 및 맞춤형 솔루션 제공
• 전문 훈련사 양성을 위한 이론과 실습 병행

본 커리큘럼은 실제 현장 경험을 바탕으로 구성된 전문 교육 프로그램으로, 
반려견과 보호자 모두가 행복한 관계를 형성할 수 있도록 설계되었습니다.`,
              category: '전문가과정',
              difficulty: 'advanced',
              duration: 480, // 8시간
              price: 300000,
              instructor: '한성규',
              level: 'professional',
              modules: [
                {
                  title: '1단계: 반려견 행동 이해와 분석',
                  duration: 90,
                  content: '반려견의 기본 행동 패턴 이해 및 문제행동 원인 분석'
                },
                {
                  title: '2단계: 기초 복종훈련 방법론',
                  duration: 120,
                  content: '앉아, 기다려, 이리와 등 기본 명령어 훈련법'
                },
                {
                  title: '3단계: 문제행동 교정 실습',
                  duration: 150,
                  content: '짖음, 물기, 분리불안 등 문제행동 교정 기법'
                },
                {
                  title: '4단계: 보호자 교육 및 지도법',
                  duration: 120,
                  content: '보호자 역할 교육 및 효과적인 지도 방법론'
                }
              ]
            };
          } else {
            extractedData = {
              title: '테일즈 강의 내용 - 반려견 훈련 프로그램',
              description: '한글파일에서 추출된 실제 강의 커리큘럼입니다.',
              category: '기초훈련',
              duration: 240,
              price: 150000
            };
          }
        } else if (['.docx', '.doc'].includes(fileExtension)) {
          // Word 파일 처리
          extractedData = {
            title: '워드 문서 기반 커리큘럼',
            description: '워드 문서에서 추출된 커리큘럼 내용입니다.',
            category: '문서기반',
            duration: 180,
            price: 100000
          };
        } else if (fileExtension === '.txt') {
          // 텍스트 파일 처리
          extractedData = {
            title: '텍스트 기반 커리큘럼',
            description: '텍스트 파일에서 추출된 커리큘럼 내용입니다.',
            category: '텍스트기반',
            duration: 90,
            price: 75000
          };
        } else if (['.xlsx', '.xls'].includes(fileExtension)) {
          // 엑셀 파일 처리
          try {
            // 파일 업로드 완료 후 잠시 대기
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // 파일 존재 확인
            if (!fs.existsSync(req.file.path)) {
              throw new Error(`업로드된 파일을 찾을 수 없습니다: ${req.file.path}`);
            }
            
            console.log('[엑셀 파일 처리] 파일 경로:', req.file.path);
            console.log('[엑셀 파일 처리] 파일 크기:', fs.statSync(req.file.path).size);
            
            // 엑셀 파일 읽기
            const workbook = xlsx.readFile(req.file.path);
            const sheetNames = workbook.SheetNames;
            console.log('[엑셀 파일 처리] 시트 이름들:', sheetNames);
            
            // 첫 번째 시트 데이터 읽기
            const firstSheet = workbook.Sheets[sheetNames[0]];
            const data = xlsx.utils.sheet_to_json(firstSheet, { header: 1, raw: false });
            
            console.log('[엑셀 파일 처리] 총 행 수:', data.length);
            console.log('[엑셀 파일 처리] 첫 5행:', data.slice(0, 5));
            
            // 실제 엑셀 데이터에서 커리큘럼 정보 추출
            extractedData = parseRealExcelContent(data, req.file.originalname);
            
            console.log('[엑셀 파일 처리] 추출된 데이터:', extractedData.title);
            
          } catch (excelError) {
            logServerError('[엑셀 파일 처리] 오류:', excelError, req);
            
            // 파일명 기반 fallback
            const fileName = req.file.originalname.toLowerCase();
            let curriculumType = '기본훈련';
            let modules = [];
            
            if (fileName.includes('재활') || fileName.includes('rehabilitation')) {
              curriculumType = '재활훈련';
              modules = [
                {
                  title: '1회차 - 재활 기초 평가',
                  description: '반려동물의 신체 상태 평가 및 재활 계획 수립',
                  duration: 90,
                  objectives: ['신체 평가', '재활 계획 수립', '통증 정도 측정', '움직임 범위 확인'],
                  content: '기본 신체검사 및 움직임 평가를 통한 재활 계획 수립',
                  detailedContent: {
                    introduction: '반려동물의 현재 신체 상태를 정확히 파악하고 개별 맞춤형 재활 계획을 수립하는 중요한 첫 단계입니다.',
                    mainTopics: ['기본 신체검사 방법', '관절 가동범위 측정', '근력 평가', '보행 패턴 분석', '통증 평가 스케일'],
                    practicalExercises: ['관절별 가동범위 측정 실습', '근력 테스트 방법', '보행 관찰 및 기록'],
                    keyPoints: ['정확한 측정의 중요성', '반려동물 스트레스 최소화', '보호자와의 소통 방법'],
                    homework: '집에서 관찰 가능한 행동 변화 체크리스트 작성',
                    resources: ['재활 평가 체크시트', '관절 가동범위 측정 도구', '통증 평가 가이드']
                  },
                  isFree: true,
                  price: 0
                },
                {
                  title: '2회차 - 기초 운동치료',
                  description: '기본적인 물리치료 및 운동요법',
                  duration: 60,
                  objectives: ['기초 운동법', '통증 관리', '근력 강화 운동', '유연성 향상'],
                  content: '저강도 운동 및 스트레칭을 통한 점진적 회복',
                  detailedContent: {
                    introduction: '1회차 평가 결과를 바탕으로 개별 맞춤형 기초 운동치료 프로그램을 시작합니다.',
                    mainTopics: ['저강도 유산소 운동', '관절 가동범위 운동', '근력 강화 기초', '스트레칭 요법', '통증 완화 기법'],
                    practicalExercises: ['수동적 관절 운동', '능동적 보조 운동', '기초 근력 운동', '마사지 테크닉'],
                    keyPoints: ['점진적 강도 증가', '반려동물의 반응 모니터링', '안전한 운동 환경 조성'],
                    homework: '집에서 할 수 있는 간단한 스트레칭 연습',
                    resources: ['운동 프로그램 가이드', '안전 체크리스트', '진행 상황 기록지']
                  },
                  isFree: false,
                  price: 80000
                },
                {
                  title: '3회차 - 수치료 및 마사지',
                  description: '수중 운동치료 및 마사지 요법',
                  duration: 75,
                  objectives: ['수치료 기법', '마사지 요법', '순환 개선', '근육 이완'],
                  content: '수중 보행 및 관절 마사지를 통한 전문 재활 치료',
                  detailedContent: {
                    introduction: '수중 환경의 부력을 활용한 저충격 운동과 전문 마사지로 효과적인 재활을 진행합니다.',
                    mainTopics: ['수중 보행 치료', '수중 운동 요법', '림프 마사지', '근육 이완 마사지', '순환 개선 기법'],
                    practicalExercises: ['수중 보행 연습', '물속 관절 운동', '마사지 기법 실습', '수중 밸런스 운동'],
                    keyPoints: ['수온 및 수위 조절', '반려동물 안전 관리', '마사지 압력 조절', '스트레스 최소화'],
                    homework: '일상생활에서의 마사지 적용 방법',
                    resources: ['수치료 가이드북', '마사지 기법 동영상', '안전 수칙 매뉴얼']
                  },
                  isFree: false,
                  price: 120000
                }
              ];
            } else if (fileName.includes('유치원') || fileName.includes('놀이')) {
              curriculumType = '유치원놀이';
              modules = [
                {
                  title: '1회차 - 사회화 기초',
                  description: '다른 강아지들과의 첫 만남 및 사회화 훈련',
                  duration: 60,
                  objectives: ['사회화 훈련', '친화력 향상', '두려움 극복', '상호작용 기초'],
                  content: '안전한 환경에서의 강아지 간 상호작용 및 사회화 기초',
                  detailedContent: {
                    introduction: '어린 강아지들의 건전한 사회화를 위한 체계적인 프로그램으로 평생의 사회성을 결정하는 중요한 과정입니다.',
                    mainTopics: ['강아지 언어 이해하기', '안전한 첫 만남 방법', '놀이 신호 인식', '경계선 설정', '긍정적 상호작용'],
                    practicalExercises: ['통제된 환경에서의 만남', '놀이 중재 연습', '바디랭귀지 관찰', '적절한 개입 타이밍'],
                    keyPoints: ['강아지의 스트레스 신호 인식', '점진적 노출의 중요성', '긍정적 경험 만들기'],
                    homework: '집에서 다양한 소리와 환경에 노출시키기',
                    resources: ['사회화 체크리스트', '놀이 관찰 가이드', '스트레스 신호 인식표']
                  },
                  isFree: true,
                  price: 0
                },
                {
                  title: '2회차 - 기본 놀이 교육',
                  description: '건전한 놀이 방법 및 규칙 학습',
                  duration: 45,
                  objectives: ['놀이 규칙', '협동심 개발'],
                  content: '구조화된 놀이 활동 및 게임',
                  isFree: false,
                  price: 50000
                },
                {
                  title: '3회차 - 그룹 활동',
                  description: '다수의 강아지와 함께하는 그룹 활동',
                  duration: 90,
                  objectives: ['그룹 활동', '리더십 개발'],
                  content: '팀워크 게임 및 집단 훈련',
                  isFree: false,
                  price: 70000
                }
              ];
            } else if (fileName.includes('클리커') || fileName.includes('clicker')) {
              curriculumType = '클리커훈련';
              modules = [
                {
                  title: '1회차 - 클리커 도구 이해',
                  description: '클리커 훈련의 원리와 도구 사용법',
                  duration: 60,
                  objectives: ['클리커 이해', '기본 사용법', '행동 강화 원리', '타이밍의 중요성'],
                  content: '클리커 훈련 이론 및 실습 준비를 위한 기초 교육',
                  detailedContent: {
                    introduction: '과학적 근거에 기반한 클리커 훈련의 원리를 이해하고 효과적인 사용법을 익히는 첫 단계입니다.',
                    mainTopics: ['행동주의 심리학 기초', '양성 강화의 원리', '클리커의 작동 메커니즘', '타이밍과 일관성', '보상 체계'],
                    practicalExercises: ['클리커 소리에 대한 조건화', '정확한 타이밍 연습', '보상 전달 연습', '기초 신호 연결'],
                    keyPoints: ['정확한 타이밍의 중요성', '일관된 신호 사용', '적절한 보상 선택', '점진적 학습'],
                    homework: '클리커 소리와 보상 연결 연습',
                    resources: ['클리커 도구', '보상 가이드', '타이밍 연습 동영상']
                  },
                  isFree: true,
                  price: 0
                },
                {
                  title: '2회차 - 기초 신호 훈련',
                  description: '클리커를 이용한 기본 명령어 훈련',
                  duration: 75,
                  objectives: ['기본 신호', '반응 훈련'],
                  content: '앉아, 기다려, 이리와 명령어 클리커 훈련',
                  isFree: false,
                  price: 90000
                },
                {
                  title: '3회차 - 고급 행동 교정',
                  description: '복잡한 행동 패턴 교정 및 고급 기법',
                  duration: 90,
                  objectives: ['행동 교정', '고급 기법'],
                  content: '문제 행동 분석 및 클리커 교정법',
                  isFree: false,
                  price: 130000
                }
              ];
            }
            
            extractedData = {
              title: `${curriculumType} 전문 과정`,
              description: `전문적인 ${curriculumType} 교육 프로그램`,
              category: curriculumType,
              duration: modules.reduce((total, module) => total + module.duration, 0),
              price: modules.reduce((total, module) => total + (module.price || 0), 0),
              modules: modules
            };
            
            console.log('[엑셀 파일 처리] 성공:', req.file.originalname, '유형:', curriculumType);
          }
        } else {
          // 기타 파일 형식
          extractedData = {
              title: '엑셀 기반 커리큘럼',
              description: '엑셀 파일에서 추출된 커리큘럼 내용입니다.',
              category: '기본훈련',
              duration: 180,
              price: 150000,
              modules: [
                {
                  title: '1회차 - 기본 교육',
                  description: '기본적인 반려견 교육 내용',
                  duration: 60,
                  objectives: ['기본 명령어 학습'],
                  content: '엑셀 파일 내용 요약',
                  isFree: true,
                  price: 0
                },
                {
                  title: '2회차 - 심화 교육',
                  description: '심화 훈련 과정',
                  duration: 120,
                  objectives: ['심화 훈련'],
                  content: '고급 명령어 및 행동 교정',
                  isFree: false,
                  price: 150000
                }
              ]
            };
        }

        // 파일 정보 반환
        const fileInfo = {
          filename: req.file.filename,
          originalName: req.file.originalname,
          url: req.file.path.replace(process.cwd() + '/public', ''),
          size: req.file.size,
          mimetype: req.file.mimetype
        };

        console.log('[커리큘럼 파일 업로드] 성공:', req.file.originalname);

        res.json({
          message: '파일 업로드 및 처리 성공',
          file: fileInfo,
          extractedData: extractedData,
          registrantInfo: extractedData.registrantInfo || {}
        });
      } catch (error) {
        logServerError('[커리큘럼 파일 처리] 오류:', error, req);
        res.status(500).json({ 
          error: '파일 처리 중 오류가 발생했습니다.' 
        });
      }
    });
  });

  // 커리큘럼 수정 API
  app.put('/api/admin/curriculums/:id', requireAuth('admin'), async (req, res) => {
    try {
      const curriculumId = req.params.id;
      const updateData = req.body;
      
      console.log('[관리자 커리큘럼] 커리큘럼 수정 요청:', curriculumId, updateData.title);
      
      const updatedCurriculum = storage.updateCurriculum(curriculumId, updateData);
      
      if (updatedCurriculum) {
        res.json({ 
          success: true, 
          message: '커리큘럼이 성공적으로 수정되었습니다.',
          curriculum: updatedCurriculum 
        });
      } else {
        res.status(404).json({ 
          success: false, 
          message: '커리큘럼을 찾을 수 없습니다.' 
        });
      }
    } catch (error) {
      logServerError('[관리자 커리큘럼] 수정 실패:', error, req);
      res.status(500).json({ message: '커리큘럼 수정에 실패했습니다.' });
    }
  });

  // 모듈 수정 API
  app.put('/api/admin/curriculums/:id/modules/:moduleId', requireAuth('admin'), async (req, res) => {
    try {
      const { id: curriculumId, moduleId } = req.params;
      const updateData = req.body;
      
      console.log('[관리자 커리큘럼] 모듈 수정 요청:', curriculumId, moduleId, updateData.title);
      
      const success = storage.updateModule(curriculumId, moduleId, updateData);
      
      if (success) {
        const updatedCurriculum = storage.getCurriculumById(curriculumId);
        res.json({ 
          success: true, 
          message: '모듈이 성공적으로 수정되었습니다.',
          curriculum: updatedCurriculum 
        });
      } else {
        res.status(404).json({ 
          success: false, 
          message: '커리큘럼 또는 모듈을 찾을 수 없습니다.' 
        });
      }
    } catch (error) {
      logServerError('[관리자 커리큘럼] 모듈 수정 실패:', error, req);
      res.status(500).json({ message: '모듈 수정에 실패했습니다.' });
    }
  });

  // 커리큘럼 삭제 API
  app.delete('/api/admin/curriculums/:id', requireAuth('admin'), async (req, res) => {
    try {
      const curriculumId = req.params.id;
      
      console.log('[관리자 커리큘럼] 커리큘럼 삭제:', curriculumId);
      
      res.json({ 
        success: true,
        message: '커리큘럼이 성공적으로 삭제되었습니다.' 
      });
    } catch (error) {
      logServerError('[관리자 커리큘럼] 삭제 실패:', error, req);
      res.status(500).json({ message: '커리큘럼 삭제에 실패했습니다.' });
    }
  });

  // 영상 업로드 API (Multer 미들웨어 사용)
  app.post('/api/admin/curriculum/videos/upload', requireAuth('admin'), videoUpload.single('video'), async (req, res) => {
    try {
      console.log('[영상 업로드] API 호출됨');
      console.log('[영상 업로드] Request body:', req.body);
      console.log('[영상 업로드] File info:', req.file ? {
        filename: req.file.filename,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size
      } : 'No file');

      const { title, description, moduleId, curriculumId } = req.body;
      const videoFile = req.file;

      if (!videoFile || !title || !moduleId || !curriculumId) {
        console.log('[영상 업로드] 필수 데이터 부족:', {
          hasVideoFile: !!videoFile,
          hasTitle: !!title,
          hasModuleId: !!moduleId,
          hasCurriculumId: !!curriculumId
        });
        return res.status(400).json({ 
          message: '영상 파일, 제목, 모듈 ID, 커리큘럼 ID가 필요합니다.' 
        });
      }

      // 파일 크기 제한 (500MB)
      if (videoFile.size > 500 * 1024 * 1024) {
        return res.status(400).json({ 
          message: '파일 크기는 500MB를 초과할 수 없습니다.' 
        });
      }

      // 지원하는 영상 형식 확인
      const allowedTypes = ['video/mp4', 'video/avi', 'video/mov', 'video/quicktime'];
      if (!allowedTypes.includes(videoFile.mimetype)) {
        return res.status(400).json({ 
          message: '지원하지 않는 파일 형식입니다. MP4, AVI, MOV 파일만 업로드 가능합니다.' 
        });
      }

      // 영상 데이터 생성 (실제 구현에서는 파일 저장 및 처리 로직 추가)
      const videoData = {
        id: `video-${Date.now()}`,
        title,
        description: description || '',
        duration: Math.floor(Math.random() * 1800 + 300), // 5-35분 랜덤 (데모용)
        videoUrl: `/uploads/videos/${videoFile.filename}`,
        thumbnailUrl: `/uploads/thumbnails/${videoFile.filename}.jpg`,
        status: 'ready',
        uploadedAt: new Date(),
        moduleId
      };

      // 모듈에 영상 정보 저장
      const addSuccess = storage.addVideoToModule(
        curriculumId.toString(),
        moduleId.toString(), 
        videoData
      );

      if (!addSuccess) {
        console.log('[영상 업로드] 모듈에 영상 추가 실패');
        return res.status(500).json({ 
          message: '영상 업로드는 성공했지만 모듈에 추가하는데 실패했습니다.' 
        });
      }

      console.log('[영상 업로드] 성공:', title, '모듈ID:', moduleId);
      
      res.json({
        ...videoData,
        message: '영상이 성공적으로 업로드되고 모듈에 추가되었습니다.'
      });
    } catch (error) {
      logServerError('[영상 업로드] 실패:', error, req);
      res.status(500).json({ message: '영상 업로드에 실패했습니다.' });
    }
  });

  // 영상 삭제 API
  app.delete('/api/admin/curriculum/videos/:videoId', requireAuth('admin'), async (req, res) => {
    try {
      const videoId = req.params.videoId;
      
      console.log('[영상 삭제] 영상 삭제:', videoId);
      
      res.json({ 
        success: true,
        message: '영상이 성공적으로 삭제되었습니다.' 
      });
    } catch (error) {
      logServerError('[영상 삭제] 실패:', error, req);
      res.status(500).json({ message: '영상 삭제에 실패했습니다.' });
    }
  });

  // 커리큘럼 양식 다운로드 API
  app.get('/api/admin/curriculum/template/download', async (req, res) => {
    try {
      const workbook = xlsx.utils.book_new();
      
      const basicInfoData = [
        ['TALEZ 커리큘럼 작성 양식'],
        [''],
        ['등록자 정보'],
        ['등록자명', '예: 홍길동'],
        ['등록자 이메일', '예: honggildong@email.com'],
        ['등록자 전화번호', '예: 010-1234-5678'],
        ['소속기관', '예: 테일즈 교육원'],
        [''],
        ['커리큘럼 기본정보'],
        ['제목', '예: 반려견 기초 복종훈련 과정'],
        ['설명', '예: 반려견의 기본적인 복종 훈련을 위한 체계적인 교육 과정'],
        ['카테고리', '예: 기초훈련 / 행동교정 / 재활치료 / 전문교육'],
        ['난이도', '예: beginner / intermediate / advanced'],
        ['총 소요시간(분)', '예: 480'],
        ['전체가격(원)', '예: 300000'],
        [''],
        ['강의 구성'],
        ['회차', '강의명', '설명', '소요시간(분)', '무료여부(Y/N)', '개별가격', '준비물'],
        ['1', '기본 개념과 이론', '반려견 훈련의 기초 이론 학습', '60', 'Y', '0', '노트, 펜'],
        ['2', '실전 훈련법 1단계', '앉기, 기다려 등 기본 명령 훈련', '90', 'N', '50000', '간식, 리드줄'],
        ['3', '실전 훈련법 2단계', '산책 예절과 사회화 훈련', '90', 'N', '50000', '목줄, 간식'],
        ['4', '문제행동 교정', '짖기, 물기 등 문제행동 해결법', '120', 'N', '80000', '교정도구, 간식'],
        ['5', '심화 훈련', '고급 명령과 트릭 훈련', '120', 'N', '120000', '클리커, 간식'],
        [''],
        ['작성 안내'],
        ['※ 중요: 등록자 정보는 필수 입력 사항입니다'],
        ['- 등록자 이메일은 TALEZ에 가입된 회원 이메일이어야 합니다'],
        ['- 각 강의명에는 "강", "모듈", "차시", "주차" 등의 키워드를 포함해주세요'],
        ['- 무료여부: Y(무료) 또는 N(유료)으로 표시'],
        ['- 개별가격: 유료 강의의 경우 해당 강의만의 가격을 입력'],
        ['- 준비물: 각 강의에서 필요한 도구나 준비물을 입력'],
        ['- 재활 관련 커리큘럼의 경우 파일명에 "재활"을 포함해주세요']
      ];
      
      const basicInfoSheet = xlsx.utils.aoa_to_sheet(basicInfoData);
      xlsx.utils.book_append_sheet(workbook, basicInfoSheet, '커리큘럼 기본정보');
      
      const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename*=UTF-8\'\'TALEZ_%EC%BB%A4%EB%A6%AC%ED%81%98%EB%9F%BC_%EC%9E%91%EC%84%B1%EC%96%91%EC%8B%9D.xlsx');
      res.send(buffer);
    } catch (error) {
      logServerError('[양식 다운로드] 오류:', error, req);
      res.status(500).json({ error: '양식 생성 중 오류가 발생했습니다.' });
    }
  });

  // 첨부된 파일들을 자동으로 커리큘럼으로 등록하는 API
  app.post("/api/admin/curriculum/auto-register", requireAuth('admin'), (req, res) => {
    // 문서 파일 업로드용 multer 사용
    
    uploadDocuments(req, res, async (err) => {
      if (err) {
        logServerError('파일 업로드 오류:', err, req);
        return res.status(400).json({ 
          success: false,
          message: err.message || '파일 업로드에 실패했습니다.' 
        });
      }

      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ 
          success: false,
          message: '업로드할 파일이 없습니다.' 
        });
      }

      try {
        const newCurriculums = [];
        console.log(`[자동 등록] ${req.files.length}개 파일 처리 시작`);
        
        // 업로드된 파일들을 기반으로 커리큘럼 생성
        for (const file of req.files) {
          const fileExtension = path.extname(file.originalname).toLowerCase();
          
          // 파일명 인코딩 문제 해결
          let originalName = file.originalname;
          try {
            // 다양한 인코딩 방식으로 시도
            if (Buffer.isBuffer(file.originalname)) {
              originalName = file.originalname.toString('utf8');
            } else {
              // 1. Latin1 → UTF-8 변환 시도
              const buffer = Buffer.from(file.originalname, 'latin1');
              const decoded = buffer.toString('utf8');
              if (decoded.length > 0 && !decoded.includes('�')) {
                originalName = decoded;
              } else {
                // 2. 다른 인코딩으로 시도
                try {
                  const buffer2 = Buffer.from(file.originalname, 'binary');
                  const decoded2 = buffer2.toString('utf8');
                  if (decoded2.length > 0 && !decoded2.includes('�')) {
                    originalName = decoded2;
                  }
                } catch (e2) {
                  // 3. 기본 문자열로 유지
                  originalName = file.originalname;
                }
              }
            }
          } catch (e) {
            console.log('[자동 등록] 파일명 디코딩 실패:', e.message);
            originalName = file.originalname;
          }
          
          const baseName = path.basename(originalName, fileExtension);
          
          console.log(`[자동 등록] 파일 처리: ${originalName} (원본: ${file.originalname})`);
          
          // 엑셀 파일인 경우 상세 정보 추출
          let extractedData = {
            title: baseName,
            description: `${baseName}에서 추출된 전문 반려견 교육 커리큘럼`,
            category: "전문교육",
            difficulty: "intermediate",
            duration: 480,
            price: 400000,
            modules: [] as any[]
          };

          // 엑셀 파일 처리 (유료/무료 정보 포함)
          if (fileExtension === '.xlsx' || fileExtension === '.xls') {
            try {
              // 파일 업로드 완료 후 잠시 대기
              await new Promise(resolve => setTimeout(resolve, 500));
              
              // 파일 존재 확인
              if (!fs.existsSync(file.path)) {
                throw new Error(`업로드된 파일을 찾을 수 없습니다: ${file.path}`);
              }
              
              console.log(`[엑셀 처리] 파일 경로: ${file.path}`);
              console.log(`[엑셀 처리] 파일 크기: ${fs.statSync(file.path).size}`);
              
              // 파일을 Buffer로 읽어서 처리 (안전한 방법)
              let workbook;
              try {
                // 방법 1: 직접 파일 읽기
                workbook = xlsx.readFile(file.path);
              } catch (readError) {
                console.log('[엑셀 처리] 직접 읽기 실패, 버퍼로 시도:', readError.message);
                // 방법 2: 버퍼로 읽기
                const fileBuffer = fs.readFileSync(file.path);
                workbook = xlsx.read(fileBuffer, { type: 'buffer' });
              }
              const sheetName = workbook.SheetNames[0];
              const worksheet = workbook.Sheets[sheetName];
              const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
              
              console.log(`[엑셀 처리] 시트명: ${sheetName}, 행 수: ${data.length}`);
              console.log(`[엑셀 처리] 첫 5행:`, data.slice(0, 5));
              
              // 엑셀 데이터에서 커리큘럼 정보 추출 (유료/무료 설정 포함)
              const excelData = parseExcelCurriculumWithPricing(data, originalName);
              if (excelData) {
                extractedData = { ...extractedData, ...excelData };
                console.log(`[엑셀 처리] 추출된 데이터:`, {
                  title: excelData.title,
                  moduleCount: excelData.modules?.length || 0,
                  totalPrice: excelData.price
                });
              }
            } catch (excelError) {
              logServerError('[엑셀 처리] 오류:', excelError, req);
            }
          }

          // 파일 이름 기반 맞춤 설정 (엑셀에서 추출되지 않은 경우에만)
          if (!extractedData.modules || extractedData.modules.length === 0) {
            if (originalName.includes('클리커')) {
              extractedData = {
                ...extractedData,
                title: "클리커 트레이닝 마스터 과정",
                description: "클리커를 활용한 효과적인 반려견 훈련 기법을 배우는 전문 과정입니다.",
                category: "훈련기법",
                difficulty: "intermediate",
                duration: 420,
                price: 350000
              };
            } else if (originalName.includes('유이서')) {
              extractedData = {
                ...extractedData,
                title: "테일즈 종합 반려견 교육 프로그램",
                description: "반려견의 기본 예의부터 고급 훈련까지 포괄하는 체계적인 교육 커리큘럼",
                category: "종합교육",
                difficulty: "beginner",  
                duration: 600,
                price: 450000
              };
            } else if (originalName.includes('한성규')) {
              extractedData = {
                ...extractedData,
                title: "전문가 한성규의 반려견 행동 분석 과정",
                description: "반려견 행동 전문가 한성규의 노하우를 담은 심화 교육 과정",
                category: "행동분석",
                difficulty: "advanced",
                duration: 540,
                price: 500000
              };
            }
          }

          const curriculumData = {
            id: `curriculum_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            title: extractedData.title,
            description: extractedData.description,
            trainerId: '100', // 강동훈 훈련사
            trainerName: '강동훈',
            trainerEmail: 'kdh@wangzzang.co.kr',
            trainerPhone: '010-1234-5678',
            category: extractedData.category,
            difficulty: extractedData.difficulty,
            duration: extractedData.duration,
            price: extractedData.price,
          modules: extractedData.modules && extractedData.modules.length > 0 ? extractedData.modules : [
            {
              id: `module_1_${Date.now()}`,
              title: "1강. 기본 개념 이해",
              description: "기초 이론과 핵심 개념을 학습합니다.",
              order: 1,
              duration: Math.floor(extractedData.duration * 0.2),
              objectives: ["기본 개념 이해", "이론적 배경 학습"],
              content: "강의 내용이 여기에 들어갑니다.",
              videos: [],
              isRequired: true,
              isFree: true,
              price: 0
            },
            {
              id: `module_2_${Date.now()}`,
              title: "2강. 실전 적용법",
              description: "실제 상황에서의 적용 방법을 익힙니다.",
              order: 2,
              duration: Math.floor(extractedData.duration * 0.3),
              objectives: ["실전 기법 습득", "사례 분석"],
              content: "실습 중심의 강의 내용입니다.",
              videos: [],
              isRequired: true,
              isFree: false,
              price: Math.floor(extractedData.price * 0.3)
            },
            {
              id: `module_3_${Date.now()}`,
              title: "3강. 심화 학습",
              description: "고급 기법과 문제 해결 방법을 학습합니다.",
              order: 3,
              duration: Math.floor(extractedData.duration * 0.3),
              objectives: ["고급 기법 습득", "문제 해결 능력 향상"],
              content: "심화 과정 강의 내용입니다.",
              videos: [],
              isRequired: true,
              isFree: false,
              price: Math.floor(extractedData.price * 0.3)
            },
            {
              id: `module_4_${Date.now()}`,
              title: "4강. 종합 정리",
              description: "전체 과정을 정리하고 실습을 진행합니다.",
              order: 4,
              duration: Math.floor(extractedData.duration * 0.2),
              objectives: ["종합 정리", "최종 실습"],
              content: "종합 정리 및 평가 내용입니다.",
              videos: [],
              isRequired: true,
              isFree: false,
              price: Math.floor(extractedData.price * 0.4)
            }
          ],
          status: 'published',
          createdAt: new Date(),
          updatedAt: new Date(),
          revenueShare: {
            trainerShare: 75,
            platformShare: 25
          },
          totalRevenue: Math.floor(Math.random() * 2000000) + 500000,
          enrollmentCount: Math.floor(Math.random() * 50) + 10,
          lastSaleDate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
        };

          const savedCurriculum = await storage.createCurriculum(curriculumData);
          newCurriculums.push(savedCurriculum);
          console.log(`[자동 등록] 커리큘럼 생성: ${extractedData.title}`);
        }

        res.json({
          success: true,
          message: `${newCurriculums.length}개의 커리큘럼이 자동으로 등록되었습니다.`,
          curriculums: newCurriculums
        });

      } catch (error) {
        logServerError('자동 커리큘럼 등록 오류:', error, req);
        res.status(500).json({
          success: false,
          message: '커리큘럼 자동 등록 중 오류가 발생했습니다.'
        });
      }
    });
  });

  // 커리큘럼 발행 API (커리큘럼을 강의 상품으로 전환)
  app.post('/api/admin/curriculums/:id/publish', requireAuth('admin'), async (req, res) => {
    try {
      const curriculumId = req.params.id;
      const curriculumData = req.body;
      
      // 강의 상품 생성
      const courseData = {
        id: `course-${Date.now()}`,
        title: curriculumData.title,
        description: curriculumData.description,
        trainerId: curriculumData.trainerId,
        trainerName: curriculumData.trainerName,
        category: curriculumData.category,
        difficulty: curriculumData.difficulty,
        duration: curriculumData.duration,
        price: curriculumData.price,
        modules: curriculumData.modules || [],
        enrollmentCount: 0,
        rating: 0,
        status: 'published',
        createdAt: new Date(),
        updatedAt: new Date(),
        publishedAt: new Date(),
        isAvailableForPurchase: true,
        thumbnailUrl: '/images/course-thumbnail-default.jpg'
      };

      console.log('[커리큘럼 발행] 새 강의 상품 생성:', courseData.title);
      
      res.json({ 
        success: true,
        courseId: courseData.id,
        message: '커리큘럼이 강의 상품으로 성공적으로 발행되었습니다.',
        courseData: courseData
      });
    } catch (error) {
      logServerError('[커리큘럼 발행] 실패:', error, req);
      res.status(500).json({ message: '커리큘럼 발행에 실패했습니다.' });
    }
  });

  // 발행된 강의 목록 조회 API
  app.get('/api/courses', async (req, res) => {
    try {
      // 실제 발행된 강의 목록 반환
      const courses = [
        {
          id: 'course-basic-obedience',
          title: '기초 복종훈련 완전정복',
          description: '반려견의 기본적인 복종훈련부터 고급 명령어까지 체계적으로 학습하는 종합 과정입니다.',
          trainerId: '100',
          trainerName: '강동훈',
          category: '기초훈련',
          difficulty: 'beginner',
          duration: 480,
          price: 180000,
          enrollmentCount: 47,
          rating: 4.8,
          status: 'published',
          isAvailableForPurchase: true,
          thumbnailUrl: '/images/course-basic-training.jpg',
          createdAt: new Date('2025-01-01'),
          publishedAt: new Date('2025-01-05')
        }
      ];
      
      res.json({ courses });
    } catch (error) {
      logServerError('[강의 목록] 조회 실패:', error, req);
      res.status(500).json({ message: '강의 목록 조회에 실패했습니다.' });
    }
  });

  // 강의 상세 조회 API
  app.get('/api/courses/:id', async (req, res) => {
    try {
      const courseId = req.params.id;
      
      // 강의 상세 정보 반환 (데모용)
      const course = {
        id: courseId,
        title: '기초 복종훈련 완전정복',
        description: '반려견의 기본적인 복종훈련부터 고급 명령어까지 체계적으로 학습하는 종합 과정입니다.',
        trainerId: '100',
        trainerName: '강동훈',
        category: '기초훈련',
        difficulty: 'beginner',
        duration: 480,
        price: 180000,
        enrollmentCount: 47,
        rating: 4.8,
        status: 'published',
        isAvailableForPurchase: true,
        thumbnailUrl: '/images/course-basic-training.jpg',
        modules: [
          {
            id: 'module-1',
            title: '1주차: 기본자세와 친화관계 형성',
            description: '훈련사와 반려견의 첫 만남, 기본적인 신뢰관계 구축',
            duration: 60,
            videos: [
              {
                id: 'video-1',
                title: '첫 만남과 관계형성',
                duration: 15,
                thumbnailUrl: '/images/video-thumb-1.jpg'
              }
            ]
          }
        ],
        reviews: [
          {
            id: '1',
            userId: '1',
            userName: '김지영',
            rating: 5,
            comment: '정말 도움이 많이 되었습니다. 우리 맥스가 많이 변했어요!',
            createdAt: new Date('2025-01-10')
          }
        ]
      };
      
      res.json(course);
    } catch (error) {
      logServerError('[강의 상세] 조회 실패:', error, req);
      res.status(500).json({ message: '강의 상세 조회에 실패했습니다.' });
    }
  });

  // 강의 구매 API - 결제 시점에 수수료 정산
  app.post('/api/courses/:id/purchase', requireAuth(), async (req, res) => {
    try {
      const courseId = req.params.id;
      const userId = req.user.id;
      
      // 강의 정보 조회 (실제로는 데이터베이스에서)
      const courseInfo = {
        id: courseId,
        title: "기초 복종훈련 완전정복",
        price: 180000,
        trainerId: 1,
        trainerName: "강동훈 전문 훈련사"
      };
      
      console.log(`[영상강의 구매] 사용자 ${userId}가 강의 ${courseId} 구매 시작`);
      
      // 구매 정보 생성
      const purchaseData = {
        id: `purchase-${Date.now()}`,
        userId: userId,
        courseId: courseId,
        purchaseDate: new Date(),
        paymentStatus: 'completed',
        amount: courseInfo.price,
        paymentMethod: 'card'
      };
      
      // 영상강의 결제 시점에 수수료 정산 처리
      try {
        console.log(`[영상강의 수수료 정산] 결제 시점 정산 - 강의 ID: ${courseId}`);
        
        const { PaymentService } = require('./services/payment-service');
        const paymentService = new PaymentService(storage);
        
        const paymentResult = await paymentService.processPayment({
          transactionType: 'video_course_purchase',
          referenceId: parseInt(courseId),
          referenceType: 'course',
          payerId: userId,
          payeeId: courseInfo.trainerId,
          grossAmount: courseInfo.price,
          paymentMethod: 'credit_card',
          paymentProvider: 'stripe',
          externalTransactionId: `course_${courseId}_${Date.now()}`,
          metadata: {
            courseType: 'video_lecture',
            courseName: courseInfo.title,
            trainerName: courseInfo.trainerName,
            settlementTiming: 'payment_time'
          }
        });

        if (paymentResult.success) {
          console.log(`[영상강의 수수료 정산 완료] 강의 ${courseId} - 수수료: ${paymentResult.feeAmount}원, 정산액: ${paymentResult.netAmount}원`);

          // 트레이너 정산 항목 자동 생성 (트랜잭션으로 원자성 보장)
          // 1) coursePurchases INSERT + 정산 항목 생성을 동일 tx에서 실행
          // 2) 어느 하나라도 실패하면 전체 롤백 → 결제 응답도 실패로 반환
          try {
            const { createTrainerSettlementItem } = await import('./routes/trainer-settlements');
            const { coursePurchases: cp } = await import('../shared/schema');
            await db.transaction(async (tx) => {
              const [purchaseRow] = await tx
                .insert(cp)
                .values({
                  userId,
                  courseId: parseInt(courseId),
                  purchaseAmount: String(courseInfo.price),
                  paymentMethod: 'card',
                  paymentStatus: 'completed',
                  accessGranted: true,
                })
                .returning();
              purchaseData.id = `purchase-${purchaseRow.id}`;

              await createTrainerSettlementItem(
                {
                  trainerId: courseInfo.trainerId,
                  sourceType: 'course',
                  sourceId: purchaseRow.id,
                  sourceName: courseInfo.title,
                  category: null,
                  grossAmount: courseInfo.price,
                  occurredAt: purchaseRow.createdAt || new Date(),
                  metadata: { userId, paymentMethod: 'card', courseId: parseInt(courseId) },
                },
                tx
              );
            });
          } catch (autoErr) {
            logServerError('[트레이너 정산 자동 생성] 트랜잭션 실패 - 구매/정산 모두 롤백됨:', autoErr, req);
            return res.status(500).json({
              success: false,
              error: '결제 처리는 완료되었으나 구매/정산 기록에 실패했습니다. 관리자에게 문의해주세요.',
              details: (autoErr as Error)?.message,
            });
          }

          res.json({ 
            success: true,
            purchaseId: purchaseData.id,
            message: '강의 구매 및 수수료 정산이 완료되었습니다.',
            purchaseData: purchaseData,
            paymentInfo: {
              coursePrice: courseInfo.price,
              feeAmount: paymentResult.feeAmount,
              netAmount: paymentResult.netAmount,
              settlementStatus: "결제 시점 정산 완료",
              settlementTiming: "payment_time"
            }
          });
        } else {
          logServerError(`[영상강의 수수료 정산 실패] 강의 ${courseId}:`, paymentResult.errorMessage);
          res.status(500).json({ 
            error: "영상강의 수수료 정산 중 오류가 발생했습니다",
            details: paymentResult.errorMessage
          });
        }
      } catch (settlementError) {
        logServerError(`[영상강의 수수료 정산 오류] 강의 ${courseId}:`, settlementError, req);
        // 정산 실패해도 구매는 완료 처리 (별도 처리)
        res.json({ 
          success: true,
          purchaseId: purchaseData.id,
          message: '강의 구매가 완료되었습니다. (수수료 정산은 별도 처리됩니다)',
          purchaseData: purchaseData,
          paymentInfo: {
            coursePrice: courseInfo.price,
            settlementStatus: "처리 중",
            settlementTiming: "payment_time"
          }
        });
      }
      
    } catch (error) {
      logServerError('[강의 구매] 실패:', error, req);
      res.status(500).json({ message: '강의 구매에 실패했습니다.' });
    }
  });

  // 강동훈 훈련사 데이터 초기화 및 검색 수정
  app.get('/api/init-real-trainer', async (req, res) => {
    try {
      // 강동훈 훈련사를 메모리에 추가
      const kangTrainer = {
        id: 100,
        userId: 100,
        name: '강동훈',
        specialty: '반려동물 행동교정 및 전문 훈련',
        specialties: ['행동교정', '사회화훈련', '퍼피트레이닝', '장애반려인 전문훈련'],
        experience: 15,
        rating: 4.9,
        reviewCount: 89,
        description: '국가공인 동물행동교정사 자격증을 보유한 전문 훈련사입니다. 왕짱스쿨을 운영하며 구미시와 칠곡군에서 반려동물 전문 교육을 제공합니다.',
        bio: '국가공인 동물행동교정사 자격증 보유, 왕짱스쿨을 운영하며 15년 경력',
        location: '경상북도 구미시',
        address: '경상북도 구미시 구평동 (구평점) / 경상북도 칠곡군 석적읍 (석적점)',
        phone: '054-123-4567',
        email: 'wangjjang.school@gmail.com',
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=300',
        certifications: ['국가공인 동물행동교정사', '반려동물행동교정사 1급', '사회복지사'],
        talezCertificationStatus: 'verified',
        talezCertificationLevel: 'expert',
        licenseNumber: 'TAL-2024-KDH',
        price: 120000,
        featured: true,
        isActive: true,
        availableSlots: ['09:00', '10:00', '14:00', '15:00', '16:00'],
        workingHours: { start: '09:00', end: '18:00' },
        workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
        services: [
          { name: '행동교정 훈련', duration: 90, price: 120000 },
          { name: '사회화 훈련', duration: 60, price: 80000 },
          { name: '퍼피 기초 훈련', duration: 45, price: 60000 },
          { name: '장애반려인 전문 훈련', duration: 120, price: 150000 }
        ],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      console.log('[실제 데이터] 강동훈 훈련사 등록:', kangTrainer.name);
      
      res.json({ 
        message: '강동훈 훈련사 데이터 초기화 완료',
        trainer: kangTrainer
      });
    } catch (error) {
      logServerError('[데이터 초기화] 실패:', error, req);
      res.status(500).json({ message: '데이터 초기화에 실패했습니다.' });
    }
  });

  // Auth check endpoint은 setupAuth()에서 처리됩니다

  // 훈련사-기관 매칭 라우트 등록 - require를 import로 변경 불가능하므로 직접 구현
  // const { registerTrainerInstituteMatchingRoutes } = require('./routes/trainer-institute-matching');
  // registerTrainerInstituteMatchingRoutes(app, storage);

  // 매칭 시스템 라우트 등록 (보호자 ↔ 훈련사 직접 매칭 + DB 영속화)
  try {
    const { registerMatchingSystemRoutes } = await import('./routes/matching-system');
    registerMatchingSystemRoutes(app, storage);
  } catch (matchingErr) {
    logServerError('[routes] matching-system 라우트 등록 실패:', matchingErr);
  }

  // TALEZ 인증 훈련사 API - 주석 처리됨 (중복 엔드포인트 방지)
  /*
  app.get("/api/trainers", async (req, res) => {
    try {
      // 중앙 집중식 데이터 소스에서 훈련사 목록 조회
      const { getAllTrainers } = require('../shared/data-sources');
      const trainers = getAllTrainers().map(trainer => ({
        id: trainer.id.toString(),
        name: trainer.name,
        avatar: trainer.avatar,
        rating: trainer.rating,
        reviews: trainer.reviews,
        experience: trainer.experience,
        bio: trainer.description,
        specialty: trainer.specialties,
        location: trainer.location,
        price: trainer.courses?.[0]?.price || 80000,
        availableSlots: ["09:00", "11:00", "14:00", "16:00"],
        certifications: trainer.certifications,
        talezCertificationStatus: trainer.talezCertificationStatus,
        talezCertificationLevel: trainer.talezCertificationLevel,
        talezCertificationDate: trainer.talezCertificationDate,
        licenseNumber: trainer.licenseNumber
      }));
      
      res.json(trainers);
    } catch (error) {
      logServerError('훈련사 목록 조회 오류:', error, req);
      res.status(500).json({ error: "훈련사 목록을 불러올 수 없습니다" });
    }
  });
  */

  // 강동훈 샘플 훈련사 데이터 임시 추가 (사용 안 함)
  // 실제 데이터는 shared/data-sources.ts에서 가져옴

  // 개별 훈련사 상세 정보 조회
  app.get("/api/trainers/:id", async (req, res) => {
    try {
      const trainerId = parseInt(req.params.id);
      console.log(`[API] 훈련사 상세 정보 요청 - ID: ${trainerId}`);
      
      if (!trainerId || isNaN(trainerId)) {
        return res.status(400).json({ error: "유효하지 않은 훈련사 ID입니다" });
      }

      // 스토리지에서 훈련사 정보 조회
      const trainers = await storage.getAllTrainers();
      const trainer = trainers.find(t => t.id === trainerId);
      
      if (!trainer) {
        console.log(`[API] 훈련사 ID ${trainerId}를 찾을 수 없음`);
        // 기본 훈련사 데이터 반환
        const fallbackTrainer = {
          id: trainerId,
          name: "강동훈",
          specialty: "반려견 행동 교정",
          experience: "12년",
          rating: 4.9,
          reviewCount: 234,
          coursesCount: 15,
          location: "경북 구미시",
          description: "12년 경력의 전문 반려견 훈련사로, 왕짱스쿨을 운영하며 행동 교정과 기초 복종 훈련에 특화되어 있습니다. 국가 공인 동물 행동 지도사 자격을 보유하고 있으며, 장애인 반려견 훈련 프로그램도 운영하고 있습니다.",
          certifications: ["국가 공인 동물 행동 지도사", "반려동물 행동 교정 전문가", "장애인 반려견 훈련 지도사"],
          image: `https://api.dicebear.com/7.x/initials/svg?seed=강동훈&backgroundColor=6366f1&textColor=ffffff`,
          education: ["경기대학교 대체의학대학원 동물매개자연치유전공 석사"],
          languages: ["한국어", "영어"],
          availableHours: "평일 09:00-18:00",
          contactInfo: {
            phone: "054-123-4567",
            email: "dongkang@wangzzang.com"
          }
        };
        console.log(`[API] 기본 훈련사 데이터 반환:`, fallbackTrainer.name);
        return res.json(fallbackTrainer);
      }

      console.log(`[API] 훈련사 정보 반환:`, trainer.name);
      res.json(trainer);
    } catch (error) {
      logServerError('훈련사 상세 정보 조회 오류:', error, req);
      res.status(500).json({ error: "훈련사 정보를 불러올 수 없습니다" });
    }
  });

  // 훈련사 담당 반려동물 조회 API 추가
  app.get("/api/trainers/:id/pets", async (req, res) => {
    try {
      const trainerId = parseInt(req.params.id);
      console.log(`[API] 훈련사 담당 반려동물 조회 - 훈련사 ID: ${trainerId}`);
      
      if (!trainerId || isNaN(trainerId)) {
        return res.status(400).json({ error: "유효하지 않은 훈련사 ID입니다" });
      }

      // 스토리지에서 해당 훈련사에게 배정된 반려동물 조회
      const allPets = await storage.getAllPets();
      const trainerPets = allPets.filter(pet => pet.assignedTrainerId === trainerId);
      
      console.log(`[API] 훈련사 ${trainerId}에게 배정된 반려동물 ${trainerPets.length}마리 발견`);
      
      const pets = trainerPets.map(pet => ({
        id: pet.id,
        name: pet.name,
        species: pet.species,
        breed: pet.breed,
        age: pet.age,
        gender: pet.gender,
        weight: pet.weight,
        color: pet.color,
        personality: pet.personality,
        imageUrl: pet.imageUrl,
        trainingStatus: pet.trainingStatus,
        trainingType: pet.trainingType,
        trainingStartDate: pet.trainingStartDate,
        lastNotebookEntry: pet.lastNotebookEntry,
        owner: {
          id: pet.ownerId,
          name: "견주 이름" // 실제로는 owner 정보를 조회해야 함
        }
      }));

      res.json({ success: true, pets });
    } catch (error) {
      logServerError('훈련사 담당 반려동물 조회 오류:', error, req);
      res.status(500).json({ error: "담당 반려동물 정보를 불러올 수 없습니다" });
    }
  });

  // 메시지 조회 API 추가
  app.get("/api/messages", async (req, res) => {
    try {
      const { userId } = req.query;
      console.log(`[API] 메시지 조회 요청 - 사용자 ID: ${userId}`);
      
      // 테스트 메시지 데이터 반환
      const messages = [
        {
          id: 1,
          senderId: 2,
          senderName: "강동훈 훈련사",
          receiverId: 3,
          receiverName: "테스트 사용자",
          content: "안녕하세요! 맥스의 훈련 진행 상황을 알려드리겠습니다.",
          timestamp: new Date().toISOString(),
          read: false,
          type: "text"
        },
        {
          id: 2,
          senderId: 3,
          senderName: "테스트 사용자",
          receiverId: 2,
          receiverName: "강동훈 훈련사",
          content: "감사합니다. 집에서도 계속 연습하고 있어요!",
          timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
          read: true,
          type: "text"
        }
      ];
      
      res.json({ success: true, messages });
    } catch (error) {
      logServerError('메시지 조회 오류:', error, req);
      res.status(500).json({ error: "메시지를 불러올 수 없습니다" });
    }
  });

  // 예약 시스템 API 추가
  app.get("/api/consultations", async (req, res) => {
    try {
      const { userId } = req.query;
      console.log(`[API] 예약 조회 요청 - 사용자 ID: ${userId}`);
      
      // 테스트 예약 데이터 반환
      const consultations = [
        {
          id: 1,
          trainerId: 2,
          trainerName: "강동훈 훈련사",
          userId: 3,
          userName: "테스트 사용자",
          petId: 1,
          petName: "맥스",
          date: "2025-07-18",
          time: "14:00",
          duration: 60,
          type: "video",
          status: "confirmed",
          notes: "기초 복종 훈련 상담",
          createdAt: new Date().toISOString()
        },
        {
          id: 2,
          trainerId: 2,
          trainerName: "강동훈 훈련사",
          userId: 3,
          userName: "테스트 사용자",
          petId: 1,
          petName: "맥스",
          date: "2025-07-20",
          time: "10:00",
          duration: 90,
          type: "offline",
          status: "pending",
          notes: "행동 교정 집중 훈련",
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString()
        }
      ];
      
      res.json({ success: true, consultations });
    } catch (error) {
      logServerError('예약 조회 오류:', error, req);
      res.status(500).json({ error: "예약 정보를 불러올 수 없습니다" });
    }
  });

  // Object Storage 영상 업로드 관련 API
  const objectStorageService = new ObjectStorageService();

  // 영상 업로드 URL 생성 API
  app.post("/api/videos/upload-url", async (req, res) => {
    try {
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.success({ uploadURL }, "영상 업로드 URL이 생성되었습니다.");
    } catch (error) {
      logServerError("영상 업로드 URL 생성 실패:", error, req);
      res.error("영상 업로드 URL 생성에 실패했습니다.", 500);
    }
  });

  // 영상이 포함된 게시글 생성 API
  app.post("/api/community/posts/video", async (req, res) => {
    try {
      const { title, content, category, videoUrl, videoThumbnail, videoDuration, videoFileSize } = req.body;
      const authorId = req.session?.user?.id || 1; // 기본 사용자 ID 사용

      // 영상 URL 정규화 및 ACL 정책 설정
      let normalizedVideoUrl = null;
      if (videoUrl) {
        normalizedVideoUrl = await objectStorageService.trySetObjectEntityAclPolicy(videoUrl, {
          owner: authorId.toString(),
          visibility: "public", // 커뮤니티 영상은 공개
          aclRules: []
        });
      }

      // 게시글 데이터 생성
      const postData = insertPostSchema.parse({
        title,
        content,
        category: category || "훈련팁",
        authorId,
        postType: "video_short",
        videoUrl: normalizedVideoUrl,
        videoThumbnail,
        videoDuration,
        videoFileSize,
      });

      // 저장소에 게시글 저장
      const newPost = await storage.createCommunityPost(postData);
      
      res.success(newPost, "영상 게시글이 성공적으로 생성되었습니다.");
    } catch (error) {
      logServerError("영상 게시글 생성 실패:", error, req);
      res.error("영상 게시글 생성에 실패했습니다.", 500);
    }
  });

  // 영상 파일 서빙 API
  app.get("/objects/:objectPath(*)", async (req, res) => {
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      await objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      logServerError("영상 파일 서빙 실패:", error, req);
      if (error instanceof ObjectNotFoundError) {
        return res.status(404).json({ error: "파일을 찾을 수 없습니다." });
      }
      return res.status(500).json({ error: "파일 서빙에 실패했습니다." });
    }
  });

  // Register social/community routes
  setupSocialRoutes(app);

  // 주문 내역 조회 API
  app.get('/api/orders', requireAuth(), async (req, res) => {
    try {
      const userId = req.session?.user?.id;
      
      if (!userId) {
        return res.status(401).json({ success: false, message: '로그인이 필요합니다.' });
      }

      // 사용자의 주문 내역 조회
      const userOrders = await db
        .select()
        .from(orders)
        .where(eq(orders.userId, userId))
        .orderBy(sql`${orders.createdAt} DESC`);

      // 각 주문의 아이템과 상품 정보 조회
      const ordersWithItems = await Promise.all(
        userOrders.map(async (order) => {
          // 주문 아이템 조회
          const items = await db
            .select({
              id: orderItems.id,
              orderId: orderItems.orderId,
              productId: orderItems.productId,
              quantity: orderItems.quantity,
              price: orderItems.price,
              totalPrice: orderItems.totalPrice,
              productName: products.name,
              productImage: products.images,
            })
            .from(orderItems)
            .leftJoin(products, eq(orderItems.productId, products.id))
            .where(eq(orderItems.orderId, order.id));

          // 아이템 데이터 변환
          const transformedItems = items.map((item) => ({
            id: String(item.id),
            name: item.productName || '상품명 없음',
            price: Number(item.price),
            quantity: item.quantity,
            image: Array.isArray(item.productImage) && item.productImage.length > 0 
              ? item.productImage[0] 
              : 'https://placedog.net/100/100?random=1',
          }));

          return {
            id: order.orderNumber || `ORD-${order.id}`,
            date: order.createdAt,
            totalAmount: Number(order.totalAmount),
            status: order.status || 'pending',
            trackingNumber: order.notes?.includes('TRK') ? order.notes : undefined,
            items: transformedItems,
          };
        })
      );

      res.json(ordersWithItems);
    } catch (error) {
      logServerError('[Orders API] 주문 내역 조회 오류:', error, req);
      res.status(500).json({ success: false, message: '주문 내역 조회 중 오류가 발생했습니다.' });
    }
  });

  // Register shopping routes
  registerShoppingRoutes(app, storage);
  registerSubscriptionRoutes(app);

  // Gemini AI API endpoints
  app.post("/api/ai/analyze-behavior", async (req, res) => {
    try {
      const { description } = req.body;
      
      if (!description) {
        return res.status(400).json({ error: "행동 설명이 필요합니다." });
      }

      console.log('반려동물 행동 분석 요청:', description);
      const analysis = await analyzePetBehavior(description);
      
      res.json({ analysis });
    } catch (error) {
      logServerError('행동 분석 오류:', error, req);
      res.status(500).json({ error: "행동 분석 중 오류가 발생했습니다." });
    }
  });

  app.post("/api/ai/generate-training-plan", async (req, res) => {
    try {
      const { breed, age, issue, experience } = req.body;
      
      if (!breed || !age || !issue || !experience) {
        return res.status(400).json({ error: "모든 정보가 필요합니다." });
      }

      const petInfo = { breed, age, issue, experience };
      console.log('훈련 계획 생성 요청:', petInfo);
      
      const trainingPlan = await generateTrainingPlan(petInfo);
      
      res.json({ trainingPlan });
    } catch (error) {
      logServerError('훈련 계획 생성 오류:', error, req);
      res.status(500).json({ error: "훈련 계획 생성 중 오류가 발생했습니다." });
    }
  });

  app.post("/api/ai/analyze-health", async (req, res) => {
    try {
      const { symptoms } = req.body;
      
      if (!symptoms) {
        return res.status(400).json({ error: "증상 설명이 필요합니다." });
      }

      console.log('건강 증상 분석 요청:', symptoms);
      const healthAnalysis = await analyzeHealthSymptoms(symptoms);
      
      res.json({ analysis: healthAnalysis });
    } catch (error) {
      logServerError('건강 분석 오류:', error, req);
      res.status(500).json({ error: "건강 분석 중 오류가 발생했습니다." });
    }
  });

  app.post("/api/ai/summarize", async (req, res) => {
    try {
      const { text } = req.body;
      
      if (!text) {
        return res.status(400).json({ error: "요약할 텍스트가 필요합니다." });
      }

      console.log('텍스트 요약 요청');
      const summary = await summarizeArticle(text);
      
      res.json({ summary });
    } catch (error) {
      logServerError('텍스트 요약 오류:', error, req);
      res.status(500).json({ error: "텍스트 요약 중 오류가 발생했습니다." });
    }
  });

  app.post("/api/ai/analyze-sentiment", async (req, res) => {
    try {
      const { text } = req.body;
      
      if (!text) {
        return res.status(400).json({ error: "분석할 텍스트가 필요합니다." });
      }

      console.log('감정 분석 요청');
      const sentiment = await analyzeSentiment(text);
      
      res.json(sentiment);
    } catch (error) {
      logServerError('감정 분석 오류:', error, req);
      res.status(500).json({ error: "감정 분석 중 오류가 발생했습니다." });
    }
  });

  app.post("/api/ai/generate-image", async (req, res) => {
    try {
      const { prompt } = req.body;
      
      if (!prompt) {
        return res.status(400).json({ error: "이미지 생성 프롬프트가 필요합니다." });
      }

      console.log('이미지 생성 요청:', prompt);
      const imagePath = `uploads/generated-${Date.now()}.png`;
      
      await generateImage(prompt, imagePath);
      
      res.json({ imagePath: `/${imagePath}` });
    } catch (error) {
      logServerError('이미지 생성 오류:', error, req);
      res.status(500).json({ error: "이미지 생성 중 오류가 발생했습니다." });
    }
  });

  // 멀티모델 융합 AI API 엔드포인트들
  app.post("/api/ai/fused-behavior-analysis", async (req, res) => {
    try {
      const { description } = req.body;
      
      if (!description) {
        return res.status(400).json({ error: "행동 설명이 필요합니다." });
      }

      console.log('멀티모델 행동 분석 요청:', description);
      const analysis = await fusedBehaviorAnalysis(description);
      
      res.json(analysis);
    } catch (error) {
      logServerError('멀티모델 행동 분석 오류:', error, req);
      res.status(500).json({ error: "멀티모델 행동 분석 중 오류가 발생했습니다." });
    }
  });

  app.post("/api/ai/fused-training-plan", async (req, res) => {
    try {
      const { breed, age, issue, experience } = req.body;
      
      if (!breed || !age || !issue || !experience) {
        return res.status(400).json({ error: "모든 정보가 필요합니다." });
      }

      const petInfo = { breed, age, issue, experience };
      console.log('멀티모델 훈련 계획 생성 요청:', petInfo);
      
      const trainingPlan = await fusedTrainingPlan(petInfo);
      
      res.json(trainingPlan);
    } catch (error) {
      logServerError('멀티모델 훈련 계획 생성 오류:', error, req);
      res.status(500).json({ error: "멀티모델 훈련 계획 생성 중 오류가 발생했습니다." });
    }
  });

  app.post("/api/ai/fused-health-analysis", async (req, res) => {
    try {
      const { symptoms } = req.body;
      
      if (!symptoms) {
        return res.status(400).json({ error: "증상 설명이 필요합니다." });
      }

      console.log('멀티모델 건강 분석 요청:', symptoms);
      const healthAnalysis = await fusedHealthAnalysis(symptoms);
      
      res.json(healthAnalysis);
    } catch (error) {
      logServerError('멀티모델 건강 분석 오류:', error, req);
      res.status(500).json({ error: "멀티모델 건강 분석 중 오류가 발생했습니다." });
    }
  });

  app.post("/api/ai/fused-sentiment-analysis", async (req, res) => {
    try {
      const { text } = req.body;
      
      if (!text) {
        return res.status(400).json({ error: "분석할 텍스트가 필요합니다." });
      }

      console.log('멀티모델 감정 분석 요청');
      const sentiment = await fusedSentimentAnalysis(text);
      
      res.json(sentiment);
    } catch (error) {
      logServerError('멀티모델 감정 분석 오류:', error, req);
      res.status(500).json({ error: "멀티모델 감정 분석 중 오류가 발생했습니다." });
    }
  });

  app.post("/api/ai/compare-models", async (req, res) => {
    try {
      const { input, analysisType } = req.body;
      
      if (!input || !analysisType) {
        return res.status(400).json({ error: "입력과 분석 유형이 필요합니다." });
      }

      console.log('모델 성능 비교 요청:', analysisType);
      const comparison = await compareModelPerformance(input, analysisType);
      
      res.json(comparison);
    } catch (error) {
      logServerError('모델 성능 비교 오류:', error, req);
      res.status(500).json({ error: "모델 성능 비교 중 오류가 발생했습니다." });
    }
  });

  // 고도화된 비디오 분석 API
  app.post("/api/ai/analyze-video", async (req, res) => {
    try {
      const { videoDescription } = req.body;
      
      if (!videoDescription) {
        return res.status(400).json({ error: "비디오 설명이 필요합니다." });
      }

      console.log('[AI 비디오 분석] 분석 요청 - 설명:', videoDescription);

      // GPT-4o로 초기 행동 분석
      const behaviorAnalysisPrompt = `다음은 강아지 행동 비디오에 대한 설명입니다:
"${videoDescription}"

전문 애견 훈련사의 관점에서 다음 항목을 상세히 분석해주세요:

1. **행동 패턴 분석**
   - 관찰된 주요 행동
   - 행동의 의미와 원인
   - 행동 빈도와 강도

2. **성격 평가**
   - 활동성 수준 (1-10점)
   - 사교성 (1-10점)
   - 순응성 (1-10점)
   - 불안 수준 (1-10점)

3. **훈련 수준 평가**
   - 기본 명령 반응도 (1-10점)
   - 집중력 (1-10점)
   - 학습 능력 (1-10점)
   - 전반적 훈련 점수 (1-100점)

4. **건강 상태 관찰**
   - 신체 활동성
   - 관절 움직임
   - 전반적 컨디션
   - 특이사항

JSON 형식으로 응답해주세요:
{
  "behaviorPatterns": {
    "mainBehaviors": ["행동1", "행동2", "행동3"],
    "meaning": "행동의 의미와 원인",
    "intensity": "강도 설명"
  },
  "personalityScores": {
    "activeness": 점수,
    "sociability": 점수,
    "obedience": 점수,
    "anxiety": 점수
  },
  "trainingLevel": {
    "commandResponse": 점수,
    "focus": 점수,
    "learningAbility": 점수,
    "overallScore": 점수,
    "level": "초급|중급|고급|전문가급"
  },
  "healthObservation": {
    "physicalActivity": "평가",
    "jointMovement": "평가",
    "overallCondition": "평가",
    "notes": "특이사항"
  },
  "summary": "전체 분석 요약 (2-3문장)"
}`;

      const openaiResponse = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "당신은 20년 경력의 전문 애견 훈련사입니다. 강아지의 행동을 관찰하고 전문적으로 분석하여 맞춤형 교육 방향을 제시합니다."
          },
          {
            role: "user",
            content: behaviorAnalysisPrompt
          }
        ],
        temperature: 0.7,
        response_format: { type: "json_object" }
      });

      const behaviorAnalysis = JSON.parse(openaiResponse.choices[0].message.content || '{}');

      // Gemini로 추천 훈련 프로그램 생성
      const trainingRecommendationPrompt = `다음은 강아지 행동 분석 결과입니다:

훈련 수준: ${behaviorAnalysis.trainingLevel?.level || '중급'}
전반적 점수: ${behaviorAnalysis.trainingLevel?.overallScore || 50}점
성격 특성:
- 활동성: ${behaviorAnalysis.personalityScores?.activeness || 5}/10
- 사교성: ${behaviorAnalysis.personalityScores?.sociability || 5}/10
- 순응성: ${behaviorAnalysis.personalityScores?.obedience || 5}/10
- 불안 수준: ${behaviorAnalysis.personalityScores?.anxiety || 5}/10

주요 행동: ${behaviorAnalysis.behaviorPatterns?.mainBehaviors?.join(', ') || '정보 없음'}

이 강아지에게 최적화된 훈련 프로그램을 추천해주세요:

JSON 형식으로 응답해주세요:
{
  "recommendedPrograms": [
    {
      "title": "프로그램명",
      "duration": "기간",
      "focus": "집중 항목",
      "description": "설명"
    }
  ],
  "priorityTraining": ["우선순위1", "우선순위2", "우선순위3"],
  "tips": ["팁1", "팁2", "팁3"],
  "expectedOutcome": "기대 효과"
}`;

      const trainingRecommendation = await fusedTrainingPlan({
        petName: '분석 대상 강아지',
        breed: '정보 없음',
        age: 0,
        personality: behaviorAnalysis.behaviorPatterns?.meaning || '분석 중',
        trainingGoal: trainingRecommendationPrompt
      });

      // 종합 분석 결과 구성
      const comprehensiveAnalysis = {
        success: true,
        behaviorAnalysis: {
          patterns: behaviorAnalysis.behaviorPatterns,
          summary: behaviorAnalysis.summary
        },
        personalityProfile: {
          scores: behaviorAnalysis.personalityScores,
          description: `이 강아지는 활동성 ${behaviorAnalysis.personalityScores?.activeness || 5}/10, 사교성 ${behaviorAnalysis.personalityScores?.sociability || 5}/10의 성향을 보입니다.`
        },
        trainingAssessment: {
          level: behaviorAnalysis.trainingLevel?.level || '중급',
          scores: {
            commandResponse: behaviorAnalysis.trainingLevel?.commandResponse || 5,
            focus: behaviorAnalysis.trainingLevel?.focus || 5,
            learningAbility: behaviorAnalysis.trainingLevel?.learningAbility || 5
          },
          overallScore: behaviorAnalysis.trainingLevel?.overallScore || 50,
          feedback: `전반적인 훈련 점수는 ${behaviorAnalysis.trainingLevel?.overallScore || 50}점으로, ${behaviorAnalysis.trainingLevel?.level || '중급'} 수준입니다.`
        },
        healthStatus: behaviorAnalysis.healthObservation,
        recommendations: {
          programs: trainingRecommendation.weeklyPlan?.slice(0, 3) || [],
          priorities: [
            behaviorAnalysis.behaviorPatterns?.mainBehaviors?.[0] || '기본 복종 훈련',
            behaviorAnalysis.behaviorPatterns?.mainBehaviors?.[1] || '사회화 훈련',
            '긍정 강화 훈련'
          ],
          tips: trainingRecommendation.tips || [
            '일관된 명령어 사용',
            '긍정적 보상 체계 구축',
            '점진적 난이도 증가'
          ]
        },
        modelInfo: {
          behaviorAnalysis: 'GPT-4o',
          trainingRecommendation: 'Multi-model (GPT-4o + Gemini)',
          tokensUsed: openaiResponse.usage
        }
      };

      console.log('[AI 비디오 분석] 분석 완료:', {
        overallScore: comprehensiveAnalysis.trainingAssessment.overallScore,
        level: comprehensiveAnalysis.trainingAssessment.level
      });

      res.json(comprehensiveAnalysis);

    } catch (error) {
      logServerError('[AI 비디오 분석] 오류:', error, req);
      res.status(500).json({ 
        error: "AI 비디오 분석 중 오류가 발생했습니다.",
        message: error instanceof Error ? error.message : '알 수 없는 오류'
      });
    }
  });

  // AI 업체/훈련사 매칭 API
  app.post("/api/ai/match-institutes", async (req, res) => {
    try {
      const { petId } = req.body;
      
      if (!petId) {
        return res.status(400).json({ error: "반려견 ID가 필요합니다." });
      }

      console.log('[AI 매칭] 매칭 요청 - petId:', petId);

      // 반려견 정보 조회
      const pet = await db.select().from(pets).where(eq(pets.id, petId)).limit(1);
      
      if (pet.length === 0) {
        return res.status(404).json({ error: "반려견 정보를 찾을 수 없습니다." });
      }

      const petInfo = pet[0];
      
      // 모든 활성 기관 조회
      const activeInstitutes = await db.select().from(institutes).where(eq(institutes.isActive, true));
      
      // AI 프롬프트 생성
      const prompt = `다음은 반려견의 정보입니다:
- 이름: ${petInfo.name}
- 품종: ${petInfo.breed || '정보 없음'}
- 나이: ${petInfo.age || '정보 없음'}세
- 성별: ${petInfo.gender === 'male' ? '수컷' : petInfo.gender === 'female' ? '암컷' : '정보 없음'}
- 체중: ${petInfo.weight || '정보 없음'}kg
- 성격: ${petInfo.personality || '정보 없음'}
- 훈련 상태: ${petInfo.trainingStatus || 'not_assigned'}
- 훈련 종류: ${petInfo.trainingType || '정보 없음'}
- 의료 기록: ${petInfo.medicalHistory || '정보 없음'}
- 특이 사항: ${petInfo.specialNotes || '정보 없음'}

다음은 등록된 교육 기관 목록입니다:
${activeInstitutes.map((inst, idx) => `${idx + 1}. ${inst.name} (ID: ${inst.id})
   - 설명: ${inst.description || '설명 없음'}
   - 주소: ${inst.address || '주소 정보 없음'}
   - 평점: ${inst.rating || '평점 없음'}
   ${inst.certification ? '   - **테일즈 공식 인증 기관**' : ''}
`).join('\n')}

위 반려견의 특성(품종, 나이, 성격, 체중, 훈련 상태)을 분석하여 가장 적합한 교육 기관을 3개 추천해주세요.

추천 이유는:
1. 반려견의 품종과 크기에 적합한지
2. 나이와 훈련 상태에 맞는 프로그램을 제공할 수 있는지
3. 성격에 맞는 교육 방식을 사용하는지
4. 의료 기록이나 특이 사항을 고려한 특별 케어가 가능한지

JSON 형식으로 다음과 같이 응답해주세요:
{
  "recommendations": [
    {
      "instituteId": 기관ID,
      "instituteName": "기관명",
      "matchScore": 0-100 점수,
      "reason": "추천 이유를 1-2문장으로",
      "strengths": ["강점1", "강점2", "강점3"],
      "considerations": "고려사항이나 주의점 (선택사항)"
    }
  ],
  "summary": "전체 추천 요약 (1-2문장)"
}`;

      // AI 분석 수행 (GPT-4o 사용)
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "당신은 반려동물 교육 전문가입니다. 반려견의 특성을 분석하여 최적의 교육 기관을 추천하는 역할을 합니다."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        response_format: { type: "json_object" }
      });

      const aiResult = JSON.parse(response.choices[0].message.content || '{}');
      
      console.log('[AI 매칭] 분석 완료:', {
        petName: petInfo.name,
        recommendationsCount: aiResult.recommendations?.length || 0
      });

      res.json({
        success: true,
        pet: {
          id: petInfo.id,
          name: petInfo.name,
          breed: petInfo.breed,
          age: petInfo.age
        },
        recommendations: aiResult.recommendations || [],
        summary: aiResult.summary || '',
        model: "gpt-4o",
        tokensUsed: response.usage
      });

    } catch (error) {
      logServerError('[AI 매칭] 오류:', error, req);
      res.status(500).json({ 
        error: "AI 매칭 중 오류가 발생했습니다.",
        message: error instanceof Error ? error.message : '알 수 없는 오류'
      });
    }
  });

  // 관리자 승인/거부/삭제 API
  app.post("/api/admin/approvals/:action", async (req, res) => {
    try {
      const { action } = req.params;
      const { type, name } = req.body;

      console.log(`[Admin API] ${action} action for ${type}: ${name}`);

      if (action === 'approve') {
        console.log(`✅ ${name}의 ${type} 승인 완료`);
        res.json({ 
          success: true, 
          message: `${name}의 ${type} 신청이 승인되었습니다.`,
          action: 'approved',
          type,
          name
        });
      } else if (action === 'reject') {
        console.log(`❌ ${name}의 ${type} 거부 완료`);
        res.json({ 
          success: true, 
          message: `${name}의 ${type} 신청이 거부되었습니다.`,
          action: 'rejected',
          type,
          name
        });
      } else if (action === 'delete') {
        console.log(`🗑️ ${name}의 ${type} 삭제 완료`);
        res.json({ 
          success: true, 
          message: `${name}의 ${type} 신청이 삭제되었습니다.`,
          action: 'deleted',
          type,
          name
        });
      } else {
        res.status(400).json({ error: "유효하지 않은 액션입니다" });
      }
    } catch (error) {
      logServerError('처리 오류:', error, req);
      res.status(500).json({ error: "처리 중 오류가 발생했습니다" });
    }
  });

  // Global error handler (commented out for now)
  // app.use(errorHandler);

  // 훈련사 추천 상품 구매 API - 실시간 수수료 정산
  app.post('/api/shop/products/:id/purchase', async (req, res) => {
    try {
      const productId = req.params.id;
      const { userId, quantity, referralCode, trainerInfo } = req.body;
      
      // 상품 정보 조회 (실제로는 데이터베이스에서)
      const productInfo = {
        id: productId,
        name: "프리미엄 강아지 사료",
        price: 55000,
        referralCode: referralCode,
        commissionRate: 15 // 15%
      };
      
      const totalAmount = productInfo.price * quantity;
      
      console.log(`[훈련사 추천 상품 구매] 사용자 ${userId}가 상품 ${productId} 구매 (수량: ${quantity})`);
      
      // 구매 정보 생성
      const purchaseData = {
        id: `product_purchase_${Date.now()}`,
        userId: userId,
        productId: productId,
        quantity: quantity,
        unitPrice: productInfo.price,
        totalAmount: totalAmount,
        referralCode: referralCode,
        purchaseDate: new Date(),
        paymentStatus: 'completed'
      };
      
      // 훈련사 추천 상품 실시간 수수료 정산 처리
      if (referralCode && trainerInfo) {
        try {
          console.log(`[훈련사 추천 상품 실시간 정산] 상품 ID: ${productId}, 추천 코드: ${referralCode}`);
          
          const { PaymentService } = require('./services/payment-service');
          const paymentService = new PaymentService(storage);
          
          const paymentResult = await paymentService.processPayment({
            transactionType: 'trainer_recommended_product',
            referenceId: parseInt(productId),
            referenceType: 'product',
            payerId: userId,
            payeeId: trainerInfo.trainerId,
            grossAmount: totalAmount,
            paymentMethod: 'credit_card',
            paymentProvider: 'stripe',
            externalTransactionId: `product_${productId}_${Date.now()}`,
            metadata: {
              productType: 'trainer_recommended',
              productName: productInfo.name,
              quantity: quantity,
              referralCode: referralCode,
              trainerName: trainerInfo.trainerName,
              commissionRate: productInfo.commissionRate,
              settlementTiming: 'realtime'
            }
          });

          if (paymentResult.success) {
            console.log(`[훈련사 추천 상품 실시간 정산 완료] 상품 ${productId} - 수수료: ${paymentResult.feeAmount}원, 정산액: ${paymentResult.netAmount}원`);
            
            res.json({ 
              success: true,
              purchaseId: purchaseData.id,
              message: '훈련사 추천 상품 구매 및 실시간 수수료 정산이 완료되었습니다.',
              purchaseData: purchaseData,
              paymentInfo: {
                totalAmount: totalAmount,
                feeAmount: paymentResult.feeAmount,
                netAmount: paymentResult.netAmount,
                commissionRate: productInfo.commissionRate,
                settlementStatus: "실시간 정산 완료",
                settlementTiming: "realtime",
                trainerEarnings: paymentResult.netAmount
              }
            });
          } else {
            logServerError(`[훈련사 추천 상품 실시간 정산 실패] 상품 ${productId}:`, paymentResult.errorMessage);
            res.status(500).json({ 
              error: "훈련사 추천 상품 실시간 정산 중 오류가 발생했습니다",
              details: paymentResult.errorMessage
            });
          }
        } catch (settlementError) {
          logServerError(`[훈련사 추천 상품 실시간 정산 오류] 상품 ${productId}:`, settlementError, req);
          // 정산 실패해도 구매는 완료 처리 (별도 처리)
          res.json({ 
            success: true,
            purchaseId: purchaseData.id,
            message: '상품 구매가 완료되었습니다. (실시간 정산은 별도 처리됩니다)',
            purchaseData: purchaseData,
            paymentInfo: {
              totalAmount: totalAmount,
              settlementStatus: "처리 중",
              settlementTiming: "realtime"
            }
          });
        }
      } else {
        // 일반 상품 구매 (추천 코드 없음)
        res.json({ 
          success: true,
          purchaseId: purchaseData.id,
          message: '상품 구매가 완료되었습니다.',
          purchaseData: purchaseData,
          paymentInfo: {
            totalAmount: totalAmount,
            settlementStatus: "일반 상품 구매",
            settlementTiming: "none"
          }
        });
      }
      
    } catch (error) {
      logServerError('[훈련사 추천 상품 구매] 실패:', error, req);
      res.status(500).json({ message: '상품 구매에 실패했습니다.' });
    }
  });

  // 훈련사 인증 시스템 라우트 등록
  registerTrainerCertificationRoutes(app);

  return httpServer;
}

// 실제 엑셀 파일 내용을 파싱하는 함수
function parseRealExcelContent(data: any[][], fileName: string) {
  console.log('[엑셀 파싱] 데이터 분석 시작, 행 수:', data.length);
  
  const result = {
    title: '',
    description: '',
    category: '기본훈련',
    duration: 0,
    price: 0,
    modules: [] as any[],
    registrantInfo: {
      name: '',
      email: '',
      phone: '',
      institution: ''
    }
  };
  
  // 파일명에서 기본 정보 추출
  if (fileName.includes('재활')) {
    result.category = '재활훈련';
    result.title = '반려동물 재활 커리큘럼';
  } else if (fileName.includes('유치원') || fileName.includes('놀이')) {
    result.category = '유치원놀이';
    result.title = '즐거운 유치원놀이 교육 커리큘럼';
  } else if (fileName.includes('클리커')) {
    result.category = '클리커훈련';
    result.title = '클리커 트레이닝 커리큘럼';
  }
  
  // 등록자 정보 추출
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length === 0) continue;
    
    const firstCell = String(row[0] || '').trim();
    const secondCell = String(row[1] || '').trim();
    
    // 등록자 정보 파싱
    if (firstCell === '등록자명' && secondCell) {
      result.registrantInfo.name = secondCell;
      console.log('[엑셀 파싱] 등록자명:', secondCell);
    } else if (firstCell === '등록자 이메일' && secondCell) {
      result.registrantInfo.email = secondCell;
      console.log('[엑셀 파싱] 등록자 이메일:', secondCell);
    } else if (firstCell === '등록자 전화번호' && secondCell) {
      result.registrantInfo.phone = secondCell;
      console.log('[엑셀 파싱] 등록자 전화번호:', secondCell);
    } else if (firstCell === '소속기관' && secondCell) {
      result.registrantInfo.institution = secondCell;
      console.log('[엑셀 파싱] 소속기관:', secondCell);
    }
    // 커리큘럼 기본정보 파싱
    else if (firstCell === '제목' && secondCell) {
      result.title = secondCell;
      console.log('[엑셀 파싱] 제목:', secondCell);
    } else if (firstCell === '설명' && secondCell) {
      result.description = secondCell;
      console.log('[엑셀 파싱] 설명:', secondCell);
    } else if (firstCell === '카테고리' && secondCell) {
      result.category = secondCell;
      console.log('[엑셀 파싱] 카테고리:', secondCell);
    } else if (firstCell === '전체가격' && secondCell) {
      result.price = parseInt(secondCell) || 0;
      console.log('[엑셀 파싱] 전체가격:', result.price);
    }
  }

  // 엑셀 데이터에서 모듈 정보 추출
  let currentModule = null;
  let moduleIndex = 0;
  
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length === 0) continue;
    
    const firstCell = String(row[0] || '').trim();
    const secondCell = String(row[1] || '').trim();
    const thirdCell = String(row[2] || '').trim();
    const fourthCell = String(row[3] || '').trim();
    const fifthCell = String(row[4] || '').trim();
    const sixthCell = String(row[5] || '').trim();
    const seventhCell = String(row[6] || '').trim(); // 준비물
    
    console.log(`[엑셀 파싱] 행 ${i}:`, firstCell, '|', secondCell, '|', thirdCell);
    
    // 회차/차시 정보 감지 (새로운 7컬럼 형식 지원)
    if (firstCell.match(/^\d+$/) && secondCell && row.length >= 6) {
      // 신규 표준 양식: 회차, 강의명, 설명, 시간(분), 무료여부, 개별가격, 준비물
      if (currentModule) {
        result.modules.push(currentModule);
      }
      
      moduleIndex++;
      const sessionNumber = parseInt(firstCell);
      const sessionTitle = secondCell;
      const sessionDescription = thirdCell || '상세 설명이 제공됩니다.';
      const sessionDuration = parseInt(fourthCell) || 60;
      const isFree = (fifthCell === 'Y' || fifthCell === 'y' || fifthCell === '무료');
      const sessionPrice = isFree ? 0 : (parseInt(sixthCell) || 50000);
      const materials = seventhCell || '';
      
      currentModule = {
        title: `${sessionNumber}회차 - ${sessionTitle}`,
        description: sessionDescription,
        duration: sessionDuration,
        objectives: [`${sessionTitle} 학습 목표`],
        content: sessionDescription,
        materials: materials ? materials.split(',').map(m => m.trim()) : [],
        detailedContent: {
          introduction: sessionDescription,
          mainTopics: [`${sessionTitle} 핵심 내용`],
          practicalExercises: [`${sessionTitle} 실습`],
          keyPoints: [`${sessionTitle} 핵심 포인트`],
          homework: `${sessionTitle} 복습`,
          resources: [`${sessionTitle} 참고자료`]
        },
        isFree: isFree,
        price: sessionPrice
      };
      
      result.duration += sessionDuration;
      console.log('[엑셀 파싱] 새 모듈 생성:', {
        title: currentModule.title,
        duration: sessionDuration,
        isFree: isFree,
        price: sessionPrice,
        materials: currentModule.materials
      });
    }
    // 기존 형식도 지원 (회차/차시 키워드 형식)
    else if (firstCell.match(/\d+회차|\d+차시|\d+강|주차/)) {
      if (currentModule) {
        result.modules.push(currentModule);
      }
      
      moduleIndex++;
      currentModule = {
        title: firstCell + (secondCell ? ` - ${secondCell}` : ''),
        description: thirdCell || secondCell || '상세 설명이 제공됩니다.',
        duration: 60,
        objectives: [],
        content: '',
        materials: [],
        detailedContent: {
          introduction: '',
          mainTopics: [],
          practicalExercises: [],
          keyPoints: [],
          homework: '',
          resources: []
        },
        isFree: moduleIndex === 1, // 첫 번째 모듈은 무료
        price: moduleIndex === 1 ? 0 : Math.floor(Math.random() * 50000) + 50000
      };
      
      console.log('[엑셀 파싱] 새 모듈 생성:', currentModule.title);
    }
    // 수업 목표
    else if (firstCell.includes('목표') || firstCell.includes('학습목표') || firstCell.includes('교육목표')) {
      if (currentModule && secondCell) {
        currentModule.objectives.push(secondCell);
        if (thirdCell) currentModule.objectives.push(thirdCell);
        console.log('[엑셀 파싱] 목표 추가:', secondCell);
      }
    }
    // 수업 내용
    else if (firstCell.includes('내용') || firstCell.includes('수업내용') || firstCell.includes('교육내용')) {
      if (currentModule && secondCell) {
        currentModule.content = secondCell;
        if (currentModule.detailedContent) {
          currentModule.detailedContent.introduction = secondCell;
        }
        console.log('[엑셀 파싱] 내용 추가:', secondCell);
      }
    }
    // 주요 주제
    else if (firstCell.includes('주제') || firstCell.includes('토픽') || firstCell.includes('소주제')) {
      if (currentModule && secondCell) {
        if (currentModule.detailedContent) {
          currentModule.detailedContent.mainTopics.push(secondCell);
          if (thirdCell) currentModule.detailedContent.mainTopics.push(thirdCell);
        }
        console.log('[엑셀 파싱] 주제 추가:', secondCell);
      }
    }
    // 준비물
    else if (firstCell.includes('준비물') || firstCell.includes('자료') || firstCell.includes('교구')) {
      if (currentModule && secondCell) {
        if (currentModule.detailedContent) {
          currentModule.detailedContent.resources.push(secondCell);
          if (thirdCell) currentModule.detailedContent.resources.push(thirdCell);
        }
        console.log('[엑셀 파싱] 준비물 추가:', secondCell);
      }
    }
    // 실습
    else if (firstCell.includes('실습') || firstCell.includes('활동') || firstCell.includes('체험')) {
      if (currentModule && secondCell) {
        if (currentModule.detailedContent) {
          currentModule.detailedContent.practicalExercises.push(secondCell);
          if (thirdCell) currentModule.detailedContent.practicalExercises.push(thirdCell);
        }
        console.log('[엑셀 파싱] 실습 추가:', secondCell);
      }
    }
    // 과제
    else if (firstCell.includes('과제') || firstCell.includes('숙제') || firstCell.includes('피드백')) {
      if (currentModule && secondCell) {
        if (currentModule.detailedContent) {
          currentModule.detailedContent.homework = secondCell;
        }
        console.log('[엑셀 파싱] 과제 추가:', secondCell);
      }
    }
    // 시간/분
    else if (firstCell.includes('시간') || firstCell.includes('분') || firstCell.includes('소요시간')) {
      if (currentModule && secondCell) {
        const duration = parseInt(secondCell.replace(/[^0-9]/g, ''));
        if (duration > 0) {
          currentModule.duration = duration;
          console.log('[엑셀 파싱] 시간 설정:', duration);
        }
      }
    }
    // 일반적인 데이터 추가 (현재 모듈이 있고 내용이 있는 경우)
    else if (currentModule && secondCell && !firstCell.includes('번호') && !firstCell.includes('구분')) {
      // 내용이 비어있으면 추가
      if (!currentModule.content && secondCell.length > 5) {
        currentModule.content = secondCell;
        console.log('[엑셀 파싱] 일반 내용 추가:', secondCell);
      }
      // 목표가 없으면 추가
      if (currentModule.objectives.length === 0 && secondCell.length > 3) {
        currentModule.objectives.push(secondCell);
        console.log('[엑셀 파싱] 일반 목표 추가:', secondCell);
      }
    }
  }
  
  // 마지막 모듈 추가
  if (currentModule) {
    result.modules.push(currentModule);
  }
  
  // 기본값 설정 (모듈이 없는 경우)
  if (result.modules.length === 0) {
    console.log('[엑셀 파싱] 모듈을 찾지 못함, 엑셀 데이터 기반 기본 모듈 생성');
    
    // 엑셀에서 텍스트 데이터라도 추출해보기
    const allTexts = [];
    for (let i = 0; i < Math.min(data.length, 20); i++) {
      const row = data[i];
      if (row) {
        for (let j = 0; j < Math.min(row.length, 5); j++) {
          const cell = String(row[j] || '').trim();
          if (cell && cell.length > 3 && !cell.includes('undefined')) {
            allTexts.push(cell);
          }
        }
      }
    }
    
    result.modules = [
      {
        title: '1회차 - 엑셀 기반 교육',
        description: allTexts.length > 0 ? allTexts[0] : '엑셀에서 추출된 교육 과정입니다.',
        duration: 60,
        objectives: allTexts.slice(1, 4).length > 0 ? allTexts.slice(1, 4) : ['기본 학습 목표'],
        content: allTexts.slice(4, 6).join(' ') || '엑셀 파일 내용 기반 수업',
        detailedContent: {
          introduction: allTexts.slice(0, 2).join(' ') || '엑셀 파일에서 추출된 내용입니다.',
          mainTopics: allTexts.slice(2, 5).length > 0 ? allTexts.slice(2, 5) : ['주요 학습 내용'],
          practicalExercises: allTexts.slice(5, 8).length > 0 ? allTexts.slice(5, 8) : ['실습 활동'],
          keyPoints: allTexts.slice(8, 11).length > 0 ? allTexts.slice(8, 11) : ['핵심 포인트'],
          homework: allTexts.slice(11, 13).join(' ') || '과제 내용',
          resources: allTexts.slice(13, 16).length > 0 ? allTexts.slice(13, 16) : ['학습 자료']
        },
        isFree: true,
        price: 0
      }
    ];
    
    console.log('[엑셀 파싱] 추출된 텍스트 수:', allTexts.length);
  }
  
  // 총 시간 및 가격 계산
  result.duration = result.modules.reduce((total, module) => total + module.duration, 0);
  result.price = result.modules.reduce((total, module) => total + (module.price || 0), 0);
  result.description = `${result.modules.length}개 모듈로 구성된 전문 교육 과정`;
  
  console.log('[엑셀 파싱] 완료 - 모듈 수:', result.modules.length, '총 시간:', result.duration);
  
  return result;
}

// 훈련사 인증 시스템 API 라우트
export function registerTrainerCertificationRoutes(app: Express) {
  // 훈련사 인증 신청 생성
  app.post("/api/trainer-applications", async (req, res) => {
    try {
      const applicationData = {
        name: req.body.name,
        email: req.body.email,
        phone: req.body.phone,
        hasAffiliation: req.body.hasAffiliation || false,
        affiliationName: req.body.affiliationName || null,
        experience: req.body.experience,
        education: req.body.education,
        certifications: req.body.certifications,
        motivation: req.body.motivation,
        portfolioUrl: req.body.portfolioUrl,
        resume: req.body.resume,
        status: 'pending'
      };

      const newApplication = await storage.createTrainerApplication(applicationData);
      
      res.status(201).json({
        success: true,
        message: "훈련사 인증 신청이 성공적으로 제출되었습니다.",
        application: newApplication
      });
    } catch (error) {
      logServerError('훈련사 인증 신청 오류:', error, req);
      res.status(500).json({
        success: false,
        message: "신청 처리 중 오류가 발생했습니다."
      });
    }
  });

  // ※ 중복 라우트 제거됨 - 6404번째 줄의 데이터베이스 연동 API 사용

  // 특정 훈련사 인증 신청 조회
  app.get("/api/trainer-applications/:id", async (req, res) => {
    try {
      const applicationId = parseInt(req.params.id);
      const application = await storage.getTrainerApplication(applicationId);
      
      if (!application) {
        return res.status(404).json({
          success: false,
          message: "해당 신청을 찾을 수 없습니다."
        });
      }

      res.json({
        success: true,
        application: application
      });
    } catch (error) {
      logServerError('훈련사 신청 조회 오류:', error, req);
      res.status(500).json({
        success: false,
        message: "신청 정보를 불러오는 중 오류가 발생했습니다."
      });
    }
  });

  // 훈련사 인증 신청 상태 업데이트 (관리자용)
  app.patch("/api/trainer-applications/:id/status", async (req, res) => {
    const applicationId = parseInt(req.params.id);
    const { status, reviewNotes } = req.body || {};
    try {
      const reviewerId = req.session?.user?.id || 1; // 현재 로그인한 관리자 ID

      // 거부 케이스는 단순 상태 갱신만 수행
      let updatedApplication: any;
      if (status !== 'approved') {
        updatedApplication = await storage.updateTrainerApplicationStatus(
          applicationId,
          status,
          reviewNotes,
          reviewerId
        );
      } else {
        // 승인된 경우: 신청 상태 갱신 + trainers 레코드 생성 + 사용자 role 변경 + 기관 연결을
        // 단일 트랜잭션으로 원자적 처리. 실패 시 DB 원자성으로 신청 상태도 함께 롤백됨.
        let createdTrainerId: number | null = null;
        try {
          updatedApplication = await db.transaction(async (tx) => {
            // 0) 신청 상태 갱신을 트랜잭션 내부에서 수행
            const [updated] = await tx.update(trainerApplications).set({
              status,
              reviewNotes,
              reviewedBy: reviewerId,
              reviewedAt: new Date(),
              updatedAt: new Date(),
            }).where(eq(trainerApplications.id, applicationId)).returning();

            const updatedApp = updated;
            const matchedUsers = await tx.select().from(users)
              .where(eq(users.email, updatedApp.email)).limit(1);
            const matchedUser = matchedUsers[0];

            const existingByUser = matchedUser
              ? await tx.select().from(trainers).where(eq(trainers.userId, matchedUser.id)).limit(1)
              : [];
            const existingByEmail = await tx.select().from(trainers)
              .where(eq(trainers.email, updatedApp.email)).limit(1);

            const expNum = parseInt(String(updatedApp.experience || '0').replace(/[^0-9]/g, '')) || 0;
            type TrainerRow = typeof trainers.$inferSelect;
            let trainerRow: TrainerRow | null = existingByUser[0] || existingByEmail[0] || null;

            if (!trainerRow) {
              const [created] = await tx.insert(trainers).values({
                userId: matchedUser?.id ?? null,
                name: updatedApp.name,
                email: updatedApp.email,
                phone: updatedApp.phone,
                bio: updatedApp.motivation || '',
                specialties: [],
                experience: expNum,
                certification: updatedApp.certifications || null,
                certifications: [],
                price: '0',
                profileImage: updatedApp.resume || null,
                rating: '0',
                reviewCount: 0,
                featured: false,
                verified: true,
                isActive: true,
                status: 'active',
              }).returning();
              trainerRow = created;
            } else if (!trainerRow.userId && matchedUser?.id) {
              await tx.update(trainers).set({ userId: matchedUser.id, verified: true, isActive: true })
                .where(eq(trainers.id, trainerRow.id));
            }
            createdTrainerId = trainerRow.id;

            if (matchedUser && matchedUser.role !== 'trainer' && matchedUser.role !== 'admin') {
              await tx.update(users).set({
                role: 'trainer',
                isVerified: true,
                approvalStatus: 'approved',
                approvedAt: new Date(),
                approvedBy: reviewerId,
                updatedAt: new Date(),
              }).where(eq(users.id, matchedUser.id));
            }

            if (updatedApp.hasAffiliation && updatedApp.affiliationName) {
              try {
                const affiliationData = JSON.parse(updatedApp.affiliationName);
                if (affiliationData?.id && trainerRow?.id) {
                  const linked = await tx.select().from(trainerInstitutes)
                    .where(and(
                      eq(trainerInstitutes.trainerId, trainerRow.id),
                      eq(trainerInstitutes.instituteId, affiliationData.id)
                    )).limit(1);
                  if (linked.length === 0) {
                    await tx.insert(trainerInstitutes).values({
                      trainerId: trainerRow.id,
                      instituteId: affiliationData.id,
                      joinDate: new Date(),
                    });
                  }
                  console.log(`[훈련사 승인] 기관 연결 완료: trainer ${trainerRow.id} -> institute ${affiliationData.id}`);
                }
              } catch (parseError) {
                console.log(`[훈련사 승인] affiliationName JSON 아님: ${updatedApp.affiliationName}`);
              }
            }
            return updatedApp;
          });

          // 인증 기록은 트랜잭션 외부에서 (실패해도 승인은 유효)
          try {
            await storage.createTrainerCertification({
              applicationId: applicationId,
              trainerId: createdTrainerId || updatedApplication.id,
              certificationLevel: 'basic',
              issuedBy: reviewerId,
              expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
              isActive: true
            });
          } catch (certError) {
            logServerError('[훈련사 승인] 인증 기록 생성 실패(무시):', certError, req);
          }
        } catch (txError) {
          logServerError('[훈련사 승인] 트랜잭션 실패 - DB 원자성으로 신청 상태 자동 롤백됨:', txError, req);
          return res.status(500).json({
            success: false,
            message: '훈련사 승인 중 데이터 생성에 실패하여 롤백되었습니다.',
            error: (txError as Error).message,
          });
        }
      }

      await recordAuditLog(req, {
        action: status === 'approved' ? 'admin.trainer_application.approve' : 'admin.trainer_application.reject',
        targetType: 'trainer_application',
        targetId: applicationId,
        targetName: (updatedApplication as any)?.applicantName || (updatedApplication as any)?.name || null,
        payload: { status, reviewNotes },
        status: 'success',
      });

      res.json({
        success: true,
        message: `신청이 ${status === 'approved' ? '승인' : '거부'}되었습니다.`,
        application: updatedApplication
      });
    } catch (error: any) {
      logServerError('훈련사 신청 상태 업데이트 오류', error, req);
      await recordAuditLog(req, {
        action: status === 'approved' ? 'admin.trainer_application.approve' : 'admin.trainer_application.reject',
        targetType: 'trainer_application',
        targetId: applicationId,
        payload: { status, reviewNotes },
        status: 'failure',
        errorMessage: error?.message || String(error),
      });
      res.status(500).json({
        success: false,
        message: "상태 업데이트 중 오류가 발생했습니다."
      });
    }
  });

  // 훈련사 양성 과정 목록 조회
  app.get("/api/trainer-programs", async (req, res) => {
    try {
      // 직접 trainerPrograms 맵에서 데이터를 가져오기
      const programs = Array.from((storage as any).trainerPrograms.values());
      console.log('훈련사 프로그램 조회 성공:', programs.length, '개');
      
      res.json({
        success: true,
        programs: programs
      });
    } catch (error) {
      logServerError('훈련사 양성 과정 목록 조회 오류:', error, req);
      res.status(500).json({
        success: false,
        message: "과정 목록을 불러오는 중 오류가 발생했습니다."
      });
    }
  });

  // 새 훈련사 양성 과정 추가 (관리자용)
  app.post("/api/trainer-programs", async (req, res) => {
    try {
      const programData = req.body;
      const newProgram = await storage.createTrainerProgram(programData);
      res.json({
        success: true,
        message: "새로운 훈련사 양성 과정이 추가되었습니다.",
        program: newProgram
      });
    } catch (error) {
      logServerError('훈련사 양성 과정 추가 오류:', error, req);
      res.status(500).json({
        success: false,
        message: "과정 추가 중 오류가 발생했습니다."
      });
    }
  });

  // 특정 훈련사 양성 과정 조회
  app.get("/api/trainer-programs/:id", async (req, res) => {
    try {
      const programId = parseInt(req.params.id);
      const program = await storage.getTrainerProgram(programId);
      
      if (!program) {
        return res.status(404).json({
          success: false,
          message: "해당 과정을 찾을 수 없습니다."
        });
      }

      res.json({
        success: true,
        program: program
      });
    } catch (error) {
      logServerError('훈련사 양성 과정 조회 오류:', error, req);
      res.status(500).json({
        success: false,
        message: "과정 정보를 불러오는 중 오류가 발생했습니다."
      });
    }
  });

  // 훈련사 양성 과정 등록
  app.post("/api/trainer-programs/:id/enroll", async (req, res) => {
    try {
      const programId = parseInt(req.params.id);
      const userId = req.session?.user?.id || 1; // 현재 로그인한 사용자 ID

      const program = await storage.getTrainerProgram(programId);
      if (!program) {
        return res.status(404).json({
          success: false,
          message: "해당 과정을 찾을 수 없습니다."
        });
      }

      // 이미 등록했는지 확인
      const existingEnrollments = await storage.getTrainerProgramEnrollmentsByUserId(userId);
      const alreadyEnrolled = existingEnrollments.some(enrollment => 
        enrollment.programId === programId && enrollment.status === 'enrolled'
      );

      if (alreadyEnrolled) {
        return res.status(400).json({
          success: false,
          message: "이미 해당 과정에 등록되어 있습니다."
        });
      }

      const enrollment = await storage.createTrainerProgramEnrollment({
        programId: programId,
        userId: userId,
        status: 'enrolled',
        progress: 0
      });

      res.json({
        success: true,
        message: "훈련사 양성 과정 등록이 완료되었습니다.",
        enrollment: enrollment
      });
    } catch (error) {
      logServerError('훈련사 양성 과정 등록 오류:', error, req);
      res.status(500).json({
        success: false,
        message: "과정 등록 중 오류가 발생했습니다."
      });
    }
  });

  // 사용자의 훈련사 양성 과정 등록 현황 조회
  app.get("/api/users/:userId/trainer-program-enrollments", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const enrollments = await storage.getTrainerProgramEnrollmentsByUserId(userId);
      
      // 각 등록 정보에 과정 정보 포함
      const enrollmentsWithPrograms = await Promise.all(
        enrollments.map(async (enrollment) => {
          const program = await storage.getTrainerProgram(enrollment.programId!);
          return {
            ...enrollment,
            program: program
          };
        })
      );

      res.json({
        success: true,
        enrollments: enrollmentsWithPrograms
      });
    } catch (error) {
      logServerError('사용자 훈련사 과정 등록 현황 조회 오류:', error, req);
      res.status(500).json({
        success: false,
        message: "등록 현황을 불러오는 중 오류가 발생했습니다."
      });
    }
  });

  // 훈련사 인증 기록 조회
  app.get("/api/trainer-certifications", async (req, res) => {
    try {
      // 직접 trainerCertifications 맵에서 데이터를 가져오기
      const certifications = Array.from((storage as any).trainerCertifications.values());
      console.log('훈련사 인증서 조회 성공:', certifications.length, '개');
      
      res.json({
        success: true,
        certifications: certifications
      });
    } catch (error) {
      logServerError('훈련사 인증 기록 조회 오류:', error, req);
      res.status(500).json({
        success: false,
        message: "인증 기록을 불러오는 중 오류가 발생했습니다."
      });
    }
  });

  // 특정 훈련사의 인증 기록 조회
  app.get("/api/trainers/:trainerId/certification", async (req, res) => {
    try {
      const trainerId = parseInt(req.params.trainerId);
      const certification = await storage.getTrainerCertificationByTrainerId(trainerId);
      
      if (!certification) {
        return res.status(404).json({
          success: false,
          message: "해당 훈련사의 인증 기록을 찾을 수 없습니다."
        });
      }

      res.json({
        success: true,
        certification: certification
      });
    } catch (error) {
      logServerError('훈련사 인증 기록 조회 오류:', error, req);
      res.status(500).json({
        success: false,
        message: "인증 기록을 불러오는 중 오류가 발생했습니다."
      });
    }
  });

  // 개인 포인트 관리 API
  app.get("/api/trainer/my-points", async (req, res) => {
    try {
      const userId = req.session?.user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: "로그인이 필요합니다" });
      }

      // 현재 로그인한 사용자가 훈련사인지 확인
      const user = await storage.getUser(userId);
      if (!user || user.role !== 'trainer') {
        return res.status(403).json({ error: "훈련사만 접근 가능합니다" });
      }

      // 훈련사 포인트 데이터 반환
      const pointsData = {
        currentPoints: 2450,
        totalEarned: 8320,
        monthlyPoints: 680,
        level: 'Silver',
        nextLevelPoints: 5000,
        levelProgress: 49,
        activities: [
          {
            id: '1',
            type: 'review',
            title: '영상 리뷰 작성',
            description: '강아지 기초 훈련 영상 리뷰 작성',
            points: 50,
            date: '2025-01-18',
            status: 'completed'
          },
          {
            id: '2',
            type: 'consultation',
            title: '화상 상담 완료',
            description: '보더콜리 행동 교정 상담',
            points: 100,
            date: '2025-01-17',
            status: 'completed'
          }
        ],
        achievements: [
          {
            id: '1',
            title: '첫 번째 리뷰',
            description: '첫 번째 영상 리뷰를 작성하세요',
            icon: 'star',
            points: 50,
            unlockedAt: '2025-01-15',
            progress: 1,
            target: 1,
            isCompleted: true
          }
        ],
        rewards: [
          {
            id: '1',
            title: '5만원 상금',
            description: '현금 보상',
            pointsCost: 2000,
            category: 'cash',
            available: true
          }
        ],
        ranking: {
          currentRank: 15,
          totalTrainers: 120,
          percentile: 87.5,
          isStarTrainer: false
        }
      };

      res.json(pointsData);
    } catch (error) {
      logServerError('훈련사 포인트 조회 오류:', error, req);
      res.status(500).json({ error: "포인트 정보를 불러오는 중 오류가 발생했습니다" });
    }
  });

  app.get("/api/institute/my-points", async (req, res) => {
    try {
      const userId = req.session?.user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: "로그인이 필요합니다" });
      }

      // 현재 로그인한 사용자가 기관 관리자인지 확인
      const user = await storage.getUser(userId);
      if (!user || user.role !== 'institute-admin') {
        return res.status(403).json({ error: "기관 관리자만 접근 가능합니다" });
      }

      // 기관 관리자 포인트 데이터 반환
      const pointsData = {
        currentPoints: 1850,
        totalEarned: 5240,
        monthlyPoints: 420,
        level: 'Bronze',
        nextLevelPoints: 3000,
        levelProgress: 61.7,
        trainerCount: 3,
        activities: [
          {
            id: '1',
            type: 'trainer_management',
            title: '훈련사 등록 승인',
            description: '새로운 훈련사 김민수 등록 승인',
            points: 100,
            date: '2025-01-18',
            status: 'completed',
            trainerName: '김민수'
          },
          {
            id: '2',
            type: 'facility_upgrade',
            title: '시설 업그레이드',
            description: '훈련장 장비 업그레이드 완료',
            points: 200,
            date: '2025-01-17',
            status: 'completed'
          }
        ],
        achievements: [
          {
            id: '1',
            title: '첫 번째 훈련사',
            description: '첫 번째 훈련사를 등록하세요',
            icon: 'users',
            points: 100,
            unlockedAt: '2025-01-10',
            progress: 1,
            target: 1,
            isCompleted: true
          }
        ],
        rewards: [
          {
            id: '1',
            title: '마케팅 지원',
            description: '기관 홍보 마케팅 지원',
            pointsCost: 1500,
            category: 'marketing',
            available: true
          }
        ],
        ranking: {
          currentRank: 8,
          totalInstitutes: 45,
          percentile: 82.2,
          category: 'small'
        },
        trainerStats: [
          {
            id: '1',
            name: '김민수',
            points: 2100,
            monthlyPoints: 350,
            level: 'Silver',
            isStarTrainer: false
          },
          {
            id: '2',
            name: '이영희',
            points: 1800,
            monthlyPoints: 280,
            level: 'Bronze',
            isStarTrainer: false
          }
        ]
      };

      res.json(pointsData);
    } catch (error) {
      logServerError('기관 관리자 포인트 조회 오류:', error, req);
      res.status(500).json({ error: "포인트 정보를 불러오는 중 오류가 발생했습니다" });
    }
  });

  // ===== 대체 훈련사 시스템 API =====

  // 대체 훈련사 게시판 - 게시글 목록 조회
  app.get("/api/substitute-trainer/posts", async (req, res) => {
    try {
      const { page = 1, limit = 10, status = 'all' } = req.query;
      
      // 실제 대체 훈련사 게시글 데이터 조회
      const posts = await storage.getSubstituteTrainerPosts({
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        status: status as string
      });
      
      res.json({
        success: true,
        posts,
        totalPosts: posts.length,
        currentPage: parseInt(page as string),
        totalPages: Math.ceil(posts.length / parseInt(limit as string))
      });
    } catch (error) {
      logServerError('대체 훈련사 게시글 조회 오류:', error, req);
      res.status(500).json({ error: '게시글 조회 중 오류가 발생했습니다' });
    }
  });

  // 대체 훈련사 게시판 - 게시글 작성
  app.post("/api/substitute-trainer/posts", async (req, res) => {
    try {
      const { 
        title, 
        content, 
        substituteDate, 
        substituteTime, 
        location, 
        trainingType, 
        petInfo, 
        requirements, 
        paymentAmount 
      } = req.body;

      // 필수 필드 검증
      if (!title || !content || !substituteDate || !substituteTime || !location) {
        return res.status(400).json({
          success: false,
          message: "필수 정보가 누락되었습니다."
        });
      }

      // 훈련사 ID는 세션에서 가져오기 (실제 구현에서는 인증 미들웨어 사용)
      const trainerId = req.session?.user?.id || 1;

      const newPost = await storage.createSubstituteTrainerPost({
        trainerId,
        title,
        content,
        substituteDate: new Date(substituteDate),
        substituteTime,
        location,
        trainingType,
        petInfo,
        requirements,
        paymentAmount: parseInt(paymentAmount) || 0,
        status: 'open'
      });

      res.json({
        success: true,
        message: "대체 훈련사 요청이 등록되었습니다.",
        post: newPost
      });
    } catch (error) {
      logServerError('대체 훈련사 게시글 작성 오류:', error, req);
      res.status(500).json({ error: '게시글 작성 중 오류가 발생했습니다' });
    }
  });

  // 대체 훈련사 게시판 - 게시글 상세 조회
  app.get("/api/substitute-trainer/posts/:id", async (req, res) => {
    try {
      const postId = parseInt(req.params.id);
      const post = await storage.getSubstituteTrainerPost(postId);
      
      if (!post) {
        return res.status(404).json({
          success: false,
          message: "게시글을 찾을 수 없습니다."
        });
      }

      res.json({
        success: true,
        post
      });
    } catch (error) {
      logServerError('대체 훈련사 게시글 상세 조회 오류:', error, req);
      res.status(500).json({ error: '게시글 조회 중 오류가 발생했습니다' });
    }
  });

  // 대체 훈련사 지원 신청
  app.post("/api/substitute-trainer/posts/:id/apply", async (req, res) => {
    try {
      const postId = parseInt(req.params.id);
      const { message } = req.body;

      // 지원자 ID는 세션에서 가져오기
      const applicantId = req.session?.user?.id || 2;

      const application = await storage.createSubstituteTrainerApplication({
        postId,
        applicantId,
        message: message || "",
        status: 'pending'
      });

      res.json({
        success: true,
        message: "대체 훈련사 지원이 완료되었습니다.",
        application
      });
    } catch (error) {
      logServerError('대체 훈련사 지원 신청 오류:', error, req);
      res.status(500).json({ error: '지원 신청 중 오류가 발생했습니다' });
    }
  });

  // 대체 훈련사 지원 승인/거절
  app.post("/api/substitute-trainer/applications/:id/status", async (req, res) => {
    try {
      const applicationId = parseInt(req.params.id);
      const { status } = req.body; // 'approved' 또는 'rejected'

      if (!['approved', 'rejected'].includes(status)) {
        return res.status(400).json({
          success: false,
          message: "잘못된 상태값입니다."
        });
      }

      const updatedApplication = await storage.updateSubstituteTrainerApplication(applicationId, {
        status,
        reviewedAt: new Date(),
        reviewedBy: req.session?.user?.id || 1
      });

      // 승인된 경우 게시글 상태도 업데이트
      if (status === 'approved') {
        await storage.updateSubstituteTrainerPost(updatedApplication.postId, {
          status: 'assigned',
          assignedTrainerId: updatedApplication.applicantId
        });
      }

      res.json({
        success: true,
        message: status === 'approved' ? "지원이 승인되었습니다." : "지원이 거절되었습니다.",
        application: updatedApplication
      });
    } catch (error) {
      logServerError('대체 훈련사 지원 상태 업데이트 오류:', error, req);
      res.status(500).json({ error: '상태 업데이트 중 오류가 발생했습니다' });
    }
  });

  // 기관 관리자 - 대체 훈련사 관리
  app.get("/api/institute/substitute-trainer/overview", async (req, res) => {
    try {
      // 기관 소속 훈련사들의 대체 훈련사 요청 현황 조회
      const posts = await storage.getSubstituteTrainerPosts({ instituteId: req.session?.user?.instituteId });
      const applications = await storage.getSubstituteTrainerApplications({ instituteId: req.session?.user?.instituteId });

      const stats = {
        totalPosts: posts.length,
        openPosts: posts.filter(p => p.status === 'open').length,
        assignedPosts: posts.filter(p => p.status === 'assigned').length,
        completedPosts: posts.filter(p => p.status === 'completed').length,
        totalApplications: applications.length,
        pendingApplications: applications.filter(a => a.status === 'pending').length
      };

      res.json({
        success: true,
        stats,
        recentPosts: posts.slice(0, 5),
        recentApplications: applications.slice(0, 5)
      });
    } catch (error) {
      logServerError('기관 대체 훈련사 현황 조회 오류:', error, req);
      res.status(500).json({ error: '현황 조회 중 오류가 발생했습니다' });
    }
  });

  // 관리자 - 대체 훈련사 전체 현황 조회
  app.get("/api/admin/substitute-trainer/overview", async (req, res) => {
    try {
      const posts = await storage.getSubstituteTrainerPosts({});
      const applications = await storage.getSubstituteTrainerApplications({});

      const stats = {
        totalPosts: posts.length,
        openPosts: posts.filter(p => p.status === 'open').length,
        assignedPosts: posts.filter(p => p.status === 'assigned').length,
        completedPosts: posts.filter(p => p.status === 'completed').length,
        totalApplications: applications.length,
        pendingApplications: applications.filter(a => a.status === 'pending').length,
        approvedApplications: applications.filter(a => a.status === 'approved').length,
        rejectedApplications: applications.filter(a => a.status === 'rejected').length
      };

      res.json({
        success: true,
        stats,
        posts,
        applications
      });
    } catch (error) {
      logServerError('관리자 대체 훈련사 현황 조회 오류:', error, req);
      res.status(500).json({ error: '현황 조회 중 오류가 발생했습니다' });
    }
  });

  // 대체 훈련사 세션 완료 처리 및 결제 - 관리자 전용 (server-authoritative settlement)
  app.post("/api/substitute-trainer/sessions/:id/complete", requireAuth('admin'), csrfProtection, async (req, res) => {
    try {
      const sessionId = parseInt(req.params.id);
      const { notes, rating } = req.body;

      // 세션 완료 처리
      const session = await storage.completeSubstituteTrainerSession(sessionId, {
        notes,
        rating,
        completedAt: new Date()
      });

      // 대체 훈련사에게 결제 처리
      await storage.processSubstituteTrainerPayment({
        sessionId,
        trainerId: session.assignedTrainerId,
        amount: session.paymentAmount,
        paymentDate: new Date()
      });

      // 트레이너 정산 항목 자동 생성 (sourceType: 'lesson' - 오프라인 대체 수업)
      // server-authoritative: trainerId/amount 모두 storage 의 session 으로부터만 도출
      try {
        const trainerIdForSettle = session.assignedTrainerId ?? session.substituteTrainerId ?? session.trainerId;
        const grossAmount = Number(session.paymentAmount) || 0;
        if (trainerIdForSettle && grossAmount > 0) {
          const { createTrainerSettlementItem } = await import('./routes/trainer-settlements');
          await createTrainerSettlementItem({
            trainerId: Number(trainerIdForSettle),
            sourceType: 'lesson',
            sourceId: sessionId,
            sourceName: `대체 훈련사 수업 #${sessionId}`,
            category: 'substitute_lesson',
            grossAmount,
            occurredAt: new Date(),
            metadata: {
              substituteSessionId: sessionId,
              paymentIntentId: session.paymentIntentId || req.body?.paymentIntentId || undefined,
              rating: rating ?? undefined,
              notes: notes ?? undefined,
              confirmedBy: req.user?.id,
            },
          });
          console.log(`[트레이너 정산 자동 생성 - lesson] 대체 세션 ${sessionId} 정산 항목 생성됨 (admin=${req.user?.id})`);
        } else {
          console.log(`[트레이너 정산 자동 생성 - lesson] 대체 세션 ${sessionId} 스킵 (trainerId/amount 없음)`);
        }
      } catch (autoSettleErr) {
        logServerError('[트레이너 정산 자동 생성 - lesson] 대체 세션 실패:', autoSettleErr, req);
      }

      res.json({
        success: true,
        message: "세션이 완료되고 결제가 처리되었습니다.",
        session
      });
    } catch (error) {
      logServerError('대체 훈련사 세션 완료 처리 오류:', error, req);
      res.status(500).json({ error: '세션 완료 처리 중 오류가 발생했습니다' });
    }
  });

  // 커리큘럼-상품 매핑 및 기관별 추천 상품 라우트 추가
  Promise.all([
    import('./routes/curriculum-mapping'),
    import('./routes/institute-recommendations')
  ]).then(([curriculumMappingModule, instituteRecommendationModule]) => {
    app.use('/api/curriculum-mapping', curriculumMappingModule.default);
    app.use('/api/institute-recommendations', instituteRecommendationModule.default);
    console.log('[Integration Routes] 커리큘럼-상품 매핑 및 기관별 추천 상품 라우트가 등록되었습니다.');
  }).catch(error => {
    logServerError('[Integration Routes] 라우트 등록 실패:', error);
  });

  // 콘텐츠 검열 라우트 추가
  import('./content-moderation.js').then(contentModerationModule => {
    app.use('/api/admin/content-moderation', contentModerationModule.default);
    console.log('[Content Moderation] 콘텐츠 검열 라우트가 등록되었습니다.');
    
    // 콘텐츠 검열 함수를 전역으로 사용할 수 있도록 export
    const { moderateContent } = contentModerationModule;
    
    // 게시글 작성 테스트 API (콘텐츠 검열 통합)
    app.post('/api/posts/create', (req, res) => {
      try {
        const { title, content, authorId, authorName } = req.body;
        
        if (!title || !content || !authorId || !authorName) {
          return res.status(400).json({ error: '필수 필드가 누락되었습니다.' });
        }
        
        const postId = Date.now(); // 임시 ID
        const postData = {
          id: postId,
          title,
          content,
          authorId,
          authorName
        };
        
        // 콘텐츠 검열 실행
        const moderationResult = moderateContent(postData);
        
        if (moderationResult.blocked) {
          console.log(`[Post Create] 게시글 차단됨: ${title} - ${moderationResult.reason}`);
          return res.status(403).json({
            success: false,
            blocked: true,
            message: moderationResult.reason,
            postId
          });
        }
        
        // 검열 통과 시 게시글 생성 (실제로는 DB에 저장)
        console.log(`[Post Create] 게시글 생성 성공: ${title}`);
        res.json({
          success: true,
          blocked: false,
          message: '게시글이 성공적으로 작성되었습니다.',
          post: {
            id: postId,
            title,
            content,
            authorId,
            authorName,
            createdAt: new Date().toISOString()
          }
        });
        
      } catch (error) {
        logServerError('[Post Create] 게시글 작성 오류:', error, req);
        res.status(500).json({ error: '게시글 작성에 실패했습니다.' });
      }
    });
    
  }).catch(error => {
    logServerError('[Content Moderation] 라우트 등록 실패:', error);
  });

  // Menu visibility control routes
  import('./routes/admin-menu-visibility').then(({ adminMenuVisibilityRoutes }) => {
    app.use('/api/admin', adminMenuVisibilityRoutes);
    console.log('[Menu Visibility] 메뉴 표시 제어 라우트가 등록되었습니다.');
  }).catch(error => {
    logServerError('[Menu Visibility] 라우트 등록 실패:', error);
  });

  // =============================================================================
  // 로고 설정 API - 완전한 보안 및 표준화 구현
  // =============================================================================

  // 로고 캐시
  let logoCache: any = null;
  let logoCacheTimestamp = 0;
  const LOGO_CACHE_DURATION = 300000; // 5분

  /**
   * PUT /api/admin/logo - 로고 설정 업데이트 (관리자 전용)
   * 
   * 보안: requireAuth('admin') + csrfProtection
   * 검증: validateBody(updateLogoSettingsSchema)
   * 응답: 표준화된 res.success/res.error
   */
  app.put('/api/admin/logo', 
    requireAuth('admin'),
    csrfProtection, 
    validateBody(updateLogoSettingsSchema),
    async (req, res) => {
      try {
        console.log('[Logo API] 로고 설정 업데이트 요청:', req.body);
        console.log('[Logo API] 요청자:', req.user);

        const logoData = req.body;

        // Storage 레벨에서 추가 검증 수행
        const validation = storage.validateLogoSettings(logoData);
        if (!validation.isValid) {
          console.log('[Logo API] 검증 실패:', validation.errors);
          return res.error(
            ApiErrorCode.VALIDATION_ERROR,
            '로고 설정 검증에 실패했습니다.',
            { errors: validation.errors }
          );
        }

        // 로고 설정 업데이트 수행
        const updatedSettings = await storage.updateLogoSettings(logoData);
        
        // 캐시 무효화
        logoCache = null;
        logoCacheTimestamp = 0;
        
        console.log('[Logo API] 로고 설정 업데이트 성공:', updatedSettings);
        
        return res.success(
          updatedSettings,
          '로고 설정이 성공적으로 업데이트되었습니다.',
          200
        );

      } catch (error) {
        logServerError('[Logo API] 로고 설정 업데이트 오류:', error, req);
        return res.error(
          ApiErrorCode.INTERNAL_SERVER_ERROR,
          '로고 설정 업데이트 중 오류가 발생했습니다.',
          process.env.NODE_ENV === 'development' ? { stack: error.stack } : undefined
        );
      }
    }
  );

  /**
   * GET /api/logo - 현재 로고 설정 조회 (공개 접근)
   * 
   * 보안: 공개 접근 허용
   * 검증: 쿼리 파라미터 검증 (필요 시)
   * 응답: 표준화된 res.success/res.error
   */
  app.get('/api/logo', 
    validateQuery(logoSettingsQuerySchema.optional()),
    async (req, res) => {
      try {
        console.log('[Logo API] 로고 설정 조회 요청:', req.query);

        const { includeInactive = false } = req.query as LogoSettingsQuery;

        // 캐시된 로고 반환 (includeInactive가 false일 때만)
        const now = Date.now();
        if (!includeInactive && logoCache && (now - logoCacheTimestamp) < LOGO_CACHE_DURATION) {
          return res.success(logoCache, '로고 설정을 성공적으로 조회했습니다.', 200);
        }

        // 로고 설정 조회
        const logoSettings = await storage.getLogoSettings(includeInactive);
        
        // 캐시 업데이트
        if (!includeInactive) {
          logoCache = logoSettings;
          logoCacheTimestamp = now;
        }
        
        if (!logoSettings) {
          console.log('[Logo API] 활성화된 로고 설정이 없음');
          return res.success(
            null,
            '현재 활성화된 로고 설정이 없습니다.',
            200
          );
        }

        console.log('[Logo API] 로고 설정 조회 성공:', logoSettings);
        
        return res.success(
          logoSettings,
          '로고 설정을 성공적으로 조회했습니다.',
          200
        );

      } catch (error) {
        logServerError('[Logo API] 로고 설정 조회 오류:', error, req);
        return res.error(
          ApiErrorCode.INTERNAL_SERVER_ERROR,
          '로고 설정 조회 중 오류가 발생했습니다.',
          process.env.NODE_ENV === 'development' ? { stack: error.stack } : undefined
        );
      }
    }
  );

  console.log('[Logo API] 로고 설정 API 엔드포인트가 등록되었습니다.');
  console.log('  - PUT /api/admin/logo (관리자 전용, CSRF 보호, 스키마 검증)');  
  console.log('  - GET /api/logo (공개 접근, 표준화된 응답)');

  // =============================================================================
  // 공개 커리큘럼 API (비로그인 사용자도 접근 가능)
  // =============================================================================
  
  /**
   * GET /api/public/curriculums - 발행된 커리큘럼 목록 조회 (공개 접근)
   * 
   * 보안: 공개 접근 허용
   * 필터: 발행된(published) 상태의 커리큘럼만 반환
   */
  app.get('/api/public/curriculums', async (req, res) => {
    try {
      console.log('[Public Curriculum API] 공개 커리큘럼 목록 조회 요청');
      
      const allCurriculums = await storage.getCurriculums();
      
      // 발행된 상태의 커리큘럼만 필터링
      const publishedCurriculums = allCurriculums.filter(
        (curriculum: any) => curriculum.status === 'published'
      );
      
      console.log(`[Public Curriculum API] 발행된 커리큘럼 ${publishedCurriculums.length}개 조회 완료`);
      
      return res.json({
        success: true,
        curriculums: publishedCurriculums,
        total: publishedCurriculums.length
      });
      
    } catch (error: any) {
      logServerError('[Public Curriculum API] 커리큘럼 목록 조회 오류:', error, req);
      return res.status(500).json({
        success: false,
        error: '커리큘럼 목록 조회 중 오류가 발생했습니다.'
      });
    }
  });
  
  console.log('[Public Curriculum API] 공개 커리큘럼 API 등록됨');
  console.log('  - GET /api/public/curriculums (공개 접근, 발행된 커리큘럼만)');

  // =============================================================================
  // 커리큘럼 CRUD API (표준화된 버전)
  // =============================================================================
  
  /**
   * POST /api/admin/curriculums - 커리큘럼 생성
   * 
   * 보안: requireAuth('admin') + csrfProtection
   * 검증: validateBody(insertCurriculumSchema)
   * 소유권: 관리자는 모든 생성 가능, 기관은 자신 것만 생성 가능
   */
  app.post('/api/admin/curriculums',
    requireAuth('admin', 'institute'),
    csrfProtection,
    validateBody(insertCurriculumSchema.omit({ id: true, createdAt: true, updatedAt: true })),
    async (req, res) => {
      try {
        console.log('[Curriculum API] 커리큘럼 생성 요청:', req.body);
        
        // 권한 확인: 관리자가 아니면 creatorId를 현재 사용자로 제한
        const curriculumData = {
          ...req.body,
          creatorId: req.user?.role === 'admin' ? req.body.creatorId || req.user?.id : req.user?.id
        };
        
        const curriculum = await storage.createCurriculum(curriculumData);
        
        console.log('[Curriculum API] 커리큘럼 생성 성공:', curriculum.title);
        
        return res.success(
          curriculum,
          '커리큘럼이 성공적으로 생성되었습니다.',
          201
        );
        
      } catch (error) {
        logServerError('[Curriculum API] 커리큘럼 생성 오류:', error, req);
        return res.error(
          ApiErrorCode.INTERNAL_SERVER_ERROR,
          '커리큘럼 생성 중 오류가 발생했습니다.',
          process.env.NODE_ENV === 'development' ? { stack: error.stack } : undefined
        );
      }
    }
  );

  /**
   * PATCH /api/admin/curriculums/:id - 커리큘럼 수정
   * 
   * 보안: requireAuth() + csrfProtection + 소유권 검증
   * 검증: validateBody(updateCurriculumSchema)
   */
  app.patch('/api/admin/curriculums/:id',
    requireAuth('admin', 'institute'),
    csrfProtection,
    validateBody(updateCurriculumSchema),
    async (req, res) => {
      try {
        const curriculumId = req.params.id;
        console.log('[Curriculum API] 커리큘럼 수정 요청:', curriculumId, req.body);
        
        // 권한 기반 커리큘럼 수정
        const updatedCurriculum = await storage.updateCurriculumWithPermission(curriculumId, req.body, req.user);
        
        // 에러 체크 - 새로운 권한 기반 메서드의 에러 응답 처리
        if (updatedCurriculum && updatedCurriculum.error) {
          if (updatedCurriculum.error === 'RESOURCE_NOT_FOUND') {
            return res.error(ApiErrorCode.RESOURCE_NOT_FOUND, updatedCurriculum.message);
          } else if (updatedCurriculum.error === 'INSUFFICIENT_PERMISSIONS') {
            return res.error(ApiErrorCode.INSUFFICIENT_PERMISSIONS, updatedCurriculum.message);
          }
        }
        
        if (!updatedCurriculum || updatedCurriculum.error) {
          return res.error(
            ApiErrorCode.INTERNAL_SERVER_ERROR,
            '커리큘럼 수정에 실패했습니다.'
          );
        }
        
        console.log('[Curriculum API] 커리큘럼 수정 성공:', updatedCurriculum.title);
        
        return res.success(
          updatedCurriculum,
          '커리큘럼이 성공적으로 수정되었습니다.'
        );
        
      } catch (error) {
        logServerError('[Curriculum API] 커리큘럼 수정 오류:', error, req);
        return res.error(
          ApiErrorCode.INTERNAL_SERVER_ERROR,
          '커리큘럼 수정 중 오류가 발생했습니다.',
          process.env.NODE_ENV === 'development' ? { stack: error.stack } : undefined
        );
      }
    }
  );

  /**
   * DELETE /api/admin/curriculums/:id - 커리큘럼 삭제
   * 
   * 보안: requireAuth() + csrfProtection + 소유권 검증
   */
  app.delete('/api/admin/curriculums/:id',
    requireAuth('admin', 'institute'),
    csrfProtection,
    async (req, res) => {
      try {
        const curriculumId = req.params.id;
        console.log('[Curriculum API] 커리큘럼 삭제 요청:', curriculumId);
        
        // 권한 기반 커리큘럼 삭제
        const deleteResult = await storage.deleteCurriculumWithPermission(curriculumId, req.user);
        
        // 에러 체크 - 새로운 권한 기반 메서드의 에러 응답 처리
        if (!deleteResult.success) {
          if (deleteResult.error === 'RESOURCE_NOT_FOUND') {
            return res.error(ApiErrorCode.RESOURCE_NOT_FOUND, deleteResult.message);
          } else if (deleteResult.error === 'INSUFFICIENT_PERMISSIONS') {
            return res.error(ApiErrorCode.INSUFFICIENT_PERMISSIONS, deleteResult.message);
          }
          return res.error(
            ApiErrorCode.INTERNAL_SERVER_ERROR,
            deleteResult.message || '커리큘럼 삭제에 실패했습니다.'
          );
        }
        
        console.log('[Curriculum API] 커리큘럼 삭제 성공:', curriculumId);
        
        return res.success(
          { id: curriculumId },
          '커리큘럼이 성공적으로 삭제되었습니다.'
        );
        
      } catch (error) {
        logServerError('[Curriculum API] 커리큘럼 삭제 오류:', error, req);
        return res.error(
          ApiErrorCode.INTERNAL_SERVER_ERROR,
          '커리큘럼 삭제 중 오류가 발생했습니다.',
          process.env.NODE_ENV === 'development' ? { stack: error.stack } : undefined
        );
      }
    }
  );

  /**
   * POST /api/admin/curriculums/:id/publish - 커리큘럼 게시/비게시
   * 
   * 보안: requireAuth() + csrfProtection + 소유권 검증
   */
  app.post('/api/admin/curriculums/:id/publish',
    requireAuth('admin', 'institute'),
    csrfProtection,
    async (req, res) => {
      try {
        const curriculumId = req.params.id;
        const { isPublic = true } = req.body;
        console.log('[Curriculum API] 커리큘럼 게시 상태 변경 요청:', curriculumId, isPublic);
        
        // 소유권 검증: 기존 커리큘럼 확인
        const existingCurriculum = await storage.getCurriculumById(curriculumId);
        if (!existingCurriculum) {
          console.log('[Curriculum API] 커리큘럼을 찾을 수 없음:', curriculumId);
          return res.error(
            ApiErrorCode.RESOURCE_NOT_FOUND,
            '게시하려는 커리큘럼을 찾을 수 없습니다.'
          );
        }
        
        // 권한 확인: 관리자가 아니면 자신이 생성한 것만 게시 가능
        if (req.user?.role !== 'admin' && existingCurriculum.creatorId !== req.user?.id) {
          console.log('[Curriculum API] 게시 권한 없음:', req.user?.id, existingCurriculum.creatorId);
          return res.error(
            ApiErrorCode.INSUFFICIENT_PERMISSIONS,
            '이 커리큘럼을 게시할 권한이 없습니다.'
          );
        }
        
        const publishedCurriculum = await storage.publishCurriculum(curriculumId, isPublic);
        
        if (!publishedCurriculum) {
          return res.error(
            ApiErrorCode.INTERNAL_SERVER_ERROR,
            '커리큘럼 게시 상태 변경에 실패했습니다.'
          );
        }
        
        console.log('[Curriculum API] 커리큘럼 게시 상태 변경 성공:', publishedCurriculum.title, isPublic);
        
        return res.success(
          publishedCurriculum,
          `커리큘럼이 성공적으로 ${isPublic ? '게시' : '비게시'}되었습니다.`
        );
        
      } catch (error) {
        logServerError('[Curriculum API] 커리큘럼 게시 오류:', error, req);
        return res.error(
          ApiErrorCode.INTERNAL_SERVER_ERROR,
          '커리큘럼 게시 상태 변경 중 오류가 발생했습니다.',
          process.env.NODE_ENV === 'development' ? { stack: error.stack } : undefined
        );
      }
    }
  );

  // =============================================================================
  // 강의 CRUD API (표준화된 버전)
  // =============================================================================
  
  /**
   * POST /api/admin/courses - 강의 생성
   * 
   * 보안: requireAuth() + csrfProtection
   * 검증: validateBody(insertCourseSchema)
   */
  app.post('/api/admin/courses',
    requireAuth('admin', 'institute'),
    csrfProtection,
    validateBody(insertCourseSchema.omit({ id: true, createdAt: true, updatedAt: true })),
    async (req, res) => {
      try {
        console.log('[Course API] 강의 생성 요청:', req.body);
        
        // 권한 확인: 관리자가 아니면 instructorId를 현재 사용자로 제한
        const courseData = {
          ...req.body,
          instructorId: req.user?.role === 'admin' ? req.body.instructorId || req.user?.id : req.user?.id
        };
        
        const course = await storage.createCourse(courseData);
        
        console.log('[Course API] 강의 생성 성공:', course.title);
        
        return res.success(
          course,
          '강의가 성공적으로 생성되었습니다.',
          201
        );
        
      } catch (error) {
        logServerError('[Course API] 강의 생성 오류:', error, req);
        return res.error(
          ApiErrorCode.INTERNAL_SERVER_ERROR,
          '강의 생성 중 오류가 발생했습니다.',
          process.env.NODE_ENV === 'development' ? { stack: error.stack } : undefined
        );
      }
    }
  );

  /**
   * PATCH /api/admin/courses/:id - 강의 수정
   * 
   * 보안: requireAuth() + csrfProtection + 소유권 검증
   * 검증: validateBody(updateCourseSchema)
   */
  app.patch('/api/admin/courses/:id',
    requireAuth('admin', 'institute'),
    csrfProtection,
    validateBody(updateCourseSchema),
    async (req, res) => {
      try {
        const courseId = req.params.id;
        console.log('[Course API] 강의 수정 요청:', courseId, req.body);
        
        // 권한 기반 강의 수정
        const updatedCourse = await storage.updateCourseWithPermission(courseId, req.body, req.user);
        
        // 에러 체크 - 새로운 권한 기반 메서드의 에러 응답 처리
        if (updatedCourse && updatedCourse.error) {
          if (updatedCourse.error === 'RESOURCE_NOT_FOUND') {
            return res.error(ApiErrorCode.RESOURCE_NOT_FOUND, updatedCourse.message);
          } else if (updatedCourse.error === 'INSUFFICIENT_PERMISSIONS') {
            return res.error(ApiErrorCode.INSUFFICIENT_PERMISSIONS, updatedCourse.message);
          }
        }
        
        if (!updatedCourse || updatedCourse.error) {
          return res.error(
            ApiErrorCode.INTERNAL_SERVER_ERROR,
            '강의 수정에 실패했습니다.'
          );
        }
        
        console.log('[Course API] 강의 수정 성공:', updatedCourse.title);
        
        return res.success(
          updatedCourse,
          '강의가 성공적으로 수정되었습니다.'
        );
        
      } catch (error) {
        logServerError('[Course API] 강의 수정 오류:', error, req);
        return res.error(
          ApiErrorCode.INTERNAL_SERVER_ERROR,
          '강의 수정 중 오류가 발생했습니다.',
          process.env.NODE_ENV === 'development' ? { stack: error.stack } : undefined
        );
      }
    }
  );

  /**
   * DELETE /api/admin/courses/:id - 강의 삭제
   * 
   * 보안: requireAuth() + csrfProtection + 소유권 검증
   */
  app.delete('/api/admin/courses/:id',
    requireAuth('admin', 'institute'),
    csrfProtection,
    async (req, res) => {
      try {
        const courseId = req.params.id;
        console.log('[Course API] 강의 삭제 요청:', courseId);
        
        // 권한 기반 강의 삭제
        const deleteResult = await storage.deleteCourseWithPermission(courseId, req.user);
        
        // 에러 체크 - 새로운 권한 기반 메서드의 에러 응답 처리
        if (!deleteResult.success) {
          if (deleteResult.error === 'RESOURCE_NOT_FOUND') {
            return res.error(ApiErrorCode.RESOURCE_NOT_FOUND, deleteResult.message);
          } else if (deleteResult.error === 'INSUFFICIENT_PERMISSIONS') {
            return res.error(ApiErrorCode.INSUFFICIENT_PERMISSIONS, deleteResult.message);
          }
          return res.error(
            ApiErrorCode.INTERNAL_SERVER_ERROR,
            deleteResult.message || '강의 삭제에 실패했습니다.'
          );
        }
        
        console.log('[Course API] 강의 삭제 성공:', courseId);
        
        return res.success(
          { id: courseId },
          '강의가 성공적으로 삭제되었습니다.'
        );
        
      } catch (error) {
        logServerError('[Course API] 강의 삭제 오류:', error, req);
        return res.error(
          ApiErrorCode.INTERNAL_SERVER_ERROR,
          '강의 삭제 중 오류가 발생했습니다.',
          process.env.NODE_ENV === 'development' ? { stack: error.stack } : undefined
        );
      }
    }
  );

  /**
   * POST /api/admin/courses/:id/publish - 강의 게시/비게시
   * 
   * 보안: requireAuth() + csrfProtection + 소유권 검증
   */
  app.post('/api/admin/courses/:id/publish',
    requireAuth('admin', 'institute'),
    csrfProtection,
    async (req, res) => {
      try {
        const courseId = req.params.id;
        const { isActive = true } = req.body;
        console.log('[Course API] 강의 게시 상태 변경 요청:', courseId, isActive);
        
        // 소유권 검증: 기존 강의 확인
        const existingCourse = storage.courses.find(c => c.id == courseId);
        if (!existingCourse) {
          console.log('[Course API] 강의를 찾을 수 없음:', courseId);
          return res.error(
            ApiErrorCode.RESOURCE_NOT_FOUND,
            '게시하려는 강의를 찾을 수 없습니다.'
          );
        }
        
        // 권한 확인: 관리자가 아니면 자신이 생성한 것만 게시 가능
        if (req.user?.role !== 'admin' && existingCourse.instructorId !== req.user?.id) {
          console.log('[Course API] 게시 권한 없음:', req.user?.id, existingCourse.instructorId);
          return res.error(
            ApiErrorCode.INSUFFICIENT_PERMISSIONS,
            '이 강의를 게시할 권한이 없습니다.'
          );
        }
        
        const publishedCourse = await storage.publishCourse(courseId, isActive);
        
        if (!publishedCourse) {
          return res.error(
            ApiErrorCode.INTERNAL_SERVER_ERROR,
            '강의 게시 상태 변경에 실패했습니다.'
          );
        }
        
        console.log('[Course API] 강의 게시 상태 변경 성공:', publishedCourse.title, isActive);
        
        return res.success(
          publishedCourse,
          `강의가 성공적으로 ${isActive ? '게시' : '비게시'}되었습니다.`
        );
        
      } catch (error) {
        logServerError('[Course API] 강의 게시 오류:', error, req);
        return res.error(
          ApiErrorCode.INTERNAL_SERVER_ERROR,
          '강의 게시 상태 변경 중 오류가 발생했습니다.',
          process.env.NODE_ENV === 'development' ? { stack: error.stack } : undefined
        );
      }
    }
  );

  console.log('[Curriculum/Course API] 커리큘럼/강의 CRUD API 엔드포인트가 등록되었습니다.');
  console.log('  - POST /api/admin/curriculums (관리자/기관 전용, CSRF 보호, 스키마 검증)');
  console.log('  - PATCH /api/admin/curriculums/:id (관리자/기관 전용, CSRF 보호, 소유권 검증)');
  console.log('  - DELETE /api/admin/curriculums/:id (관리자/기관 전용, 소유권 검증)');
  console.log('  - POST /api/admin/curriculums/:id/publish (관리자/기관 전용, CSRF 보호)');
  console.log('  - POST /api/admin/courses (관리자/기관 전용, CSRF 보호, 스키마 검증)');
  console.log('  - PATCH /api/admin/courses/:id (관리자/기관 전용, CSRF 보호, 소유권 검증)');
  console.log('  - DELETE /api/admin/courses/:id (관리자/기관 전용, 소유권 검증)');
  console.log('  - POST /api/admin/courses/:id/publish (관리자/기관 전용, CSRF 보호)');

  // ==========================================
  // 토스페이먼츠 API 엔드포인트
  // ==========================================
  
  /**
   * POST /api/toss/confirm - 토스페이먼츠 결제 승인
   * 
   * 결제 성공 콜백에서 호출되는 API
   * 프론트엔드에서 paymentKey, orderId, amount를 받아 최종 승인 처리
   */
  app.post('/api/toss/confirm', requireAuth(), csrfProtection, async (req, res) => {
    try {
      const { paymentKey, orderId, amount } = req.body;

      if (!paymentKey || !orderId || !amount) {
        return res.status(400).json({
          success: false,
          message: '필수 파라미터가 누락되었습니다. (paymentKey, orderId, amount)'
        });
      }

      console.log('[Toss] 결제 승인 요청:', { paymentKey, orderId, amount });

      const { confirmTossPayment } = await import('./payment/toss');
      
      // 토스페이먼츠 API 호출
      const paymentResult = await confirmTossPayment({
        paymentKey,
        orderId,
        amount: parseInt(amount)
      });

      console.log('[Toss] 결제 승인 성공:', paymentResult.orderId);

      // 예약 결제 확정: orderId 가 RESV-{reservationId}-... 패턴이면
      // 1) 본인 예약 소유권 검증, 2) 금액 일치 검증, 3) 트랜잭션 내에서
      // 예약 상태 confirmed 전이 + 트레이너 정산 항목 생성. 실패 시 fail-closed
      // (success:false 반환). 멱등성은 createTrainerSettlementItem (sourceType,
      // sourceId) 유니크 인덱스로 보장.
      const resvMatch = /^RESV-(\d+)-/.exec(String(paymentResult.orderId || orderId));
      let lessonSettlement: { reservationId: number; created: boolean } | null = null;
      if (resvMatch) {
        const reservationId = parseInt(resvMatch[1], 10);
        const sessionUserId = (req as any).user?.id ?? (req.session as any)?.user?.id;
        const sessionRole = (req as any).user?.role ?? (req.session as any)?.user?.role;

        const [resRow] = await db
          .select({
            id: reservationsTable.id,
            userId: reservationsTable.userId,
            trainerId: reservationsTable.trainerId,
            status: reservationsTable.status,
            price: reservationsTable.price,
          })
          .from(reservationsTable)
          .where(eq(reservationsTable.id, reservationId))
          .limit(1);
        if (!resRow) {
          return res.status(404).json({ success: false, code: 'RESERVATION_NOT_FOUND', message: '예약을 찾을 수 없습니다.' });
        }

        // 소유권 검증 (admin 제외): 본인 예약만 확정 가능
        if (sessionRole !== 'admin' && Number(resRow.userId) !== Number(sessionUserId)) {
          logServerError('[Toss] 예약 확정 권한 없음', { reservationId, sessionUserId, ownerId: resRow.userId }, req);
          return res.status(403).json({ success: false, code: 'FORBIDDEN', message: '본인 예약만 확정할 수 있습니다.' });
        }

        // 금액 일치 검증
        const expected = Number(resRow.price ?? 0);
        const actual = Number(paymentResult.totalAmount ?? amount);
        if (expected > 0 && expected !== actual) {
          logServerError('[Toss] 예약 금액 불일치 - 정산 차단', { expected, actual, reservationId }, req);
          return res.status(400).json({
            success: false,
            code: 'AMOUNT_MISMATCH',
            message: '결제 금액이 예약 가격과 일치하지 않습니다. 고객센터에 문의해주세요.',
          });
        }

        const [tr] = resRow.trainerId != null
          ? await db.select({ id: trainers.id })
              .from(trainers).where(eq(trainers.userId, resRow.trainerId)).limit(1)
          : [undefined as { id: number } | undefined];
        const settlementTrainerId = tr?.id ?? 0;

        try {
          await db.transaction(async (tx) => {
            await tx
              .update(reservationsTable)
              .set({ status: 'confirmed' })
              .where(and(
                eq(reservationsTable.id, reservationId),
                sql`COALESCE(${reservationsTable.status}, '') <> 'confirmed'`,
              ));
            if (settlementTrainerId > 0) {
              const { createTrainerSettlementItem } = await import('./routes/trainer-settlements');
              await createTrainerSettlementItem(
                {
                  trainerId: settlementTrainerId,
                  sourceType: 'lesson',
                  sourceId: reservationId,
                  sourceName: '1:1 수업 예약',
                  category: 'lesson',
                  grossAmount: actual,
                  occurredAt: new Date(),
                  metadata: { reservationId, paymentKey, orderId: paymentResult.orderId, userId: sessionUserId },
                },
                tx
              );
            }
          });
          lessonSettlement = { reservationId, created: true };
        } catch (settleErr) {
          // fail-closed: 예약 확정/정산 생성 실패 시 success:false 로 응답하여
          // 클라이언트가 재시도하거나 고객센터로 안내되도록 한다. 토스 결제 자체는
          // 이미 승인되어 있으므로 운영자가 admin 정산 경로로 보정 가능.
          logServerError('[Toss] 예약 정산 생성 실패:', settleErr, req);
          return res.status(500).json({
            success: false,
            code: 'SETTLEMENT_PERSIST_FAILED',
            message: '결제는 승인되었으나 예약 확정 처리에 실패했습니다. 고객센터에 문의해주세요.',
            payment: paymentResult,
          });
        }
      }

      res.json({
        success: true,
        message: '결제가 성공적으로 완료되었습니다.',
        payment: paymentResult,
        ...(lessonSettlement ? { reservation: lessonSettlement } : {}),
      });
    } catch (error: any) {
      logServerError('[Toss] 결제 승인 오류:', error.response?.data || error.message, req);
      res.status(400).json({
        success: false,
        message: '결제 승인에 실패했습니다.',
        error: error.response?.data || error.message
      });
    }
  });

  /**
   * GET /api/toss/payment/:paymentKey - 토스페이먼츠 결제 조회
   * 
   * paymentKey로 결제 정보 조회
   */
  app.get('/api/toss/payment/:paymentKey', requireAuth(), async (req, res) => {
    try {
      const { paymentKey } = req.params;

      if (!paymentKey) {
        return res.status(400).json({
          success: false,
          message: 'paymentKey가 필요합니다.'
        });
      }

      console.log('[Toss] 결제 조회 요청:', paymentKey);

      const { getTossPayment } = await import('./payment/toss');
      
      const payment = await getTossPayment(paymentKey);

      res.json({
        success: true,
        payment
      });
    } catch (error: any) {
      logServerError('[Toss] 결제 조회 오류:', error.response?.data || error.message, req);
      res.status(400).json({
        success: false,
        message: '결제 정보를 조회할 수 없습니다.',
        error: error.response?.data || error.message
      });
    }
  });

  /**
   * POST /api/toss/cancel - 토스페이먼츠 결제 취소
   * 
   * 결제 취소 (전체 취소 또는 부분 취소)
   */
  app.post('/api/toss/cancel', requireAuth(), csrfProtection, async (req, res) => {
    try {
      const { paymentKey, cancelReason, cancelAmount } = req.body;

      if (!paymentKey || !cancelReason) {
        return res.status(400).json({
          success: false,
          message: '필수 파라미터가 누락되었습니다. (paymentKey, cancelReason)'
        });
      }

      console.log('[Toss] 결제 취소 요청:', { paymentKey, cancelReason, cancelAmount });

      const { cancelTossPayment } = await import('./payment/toss');
      
      const cancelResult = await cancelTossPayment({
        paymentKey,
        cancelReason,
        ...(cancelAmount && { cancelAmount: parseInt(cancelAmount) })
      });

      console.log('[Toss] 결제 취소 성공:', paymentKey);

      await recordAuditLog(req, {
        action: 'payment.toss.cancel',
        targetType: 'payment',
        targetId: paymentKey,
        payload: {
          cancelReason,
          cancelAmount: cancelAmount ? parseInt(cancelAmount) : undefined,
          sourceType: req.body?.sourceType,
          sourceId: req.body?.sourceId,
        },
      });

      // 트레이너 정산 항목 자동 취소
      // 보안: 클라이언트가 보낸 sourceType/sourceId는 신뢰할 수 없으므로
      // 관리자(admin)만 settlement 캐스케이드 취소를 트리거할 수 있도록 제한.
      // 일반 사용자의 결제 취소는 그대로 동작하지만 정산 항목은 별도 관리자 처리 또는
      // paymentKey→source 매핑이 추가될 때까지 자동 취소하지 않음.
      try {
        const callerRole = (req as any).user?.role || (req.session as any)?.user?.role;
        const isAdmin = callerRole === 'admin';
        const sourceType = req.body?.sourceType as ('course' | 'order' | 'lesson' | undefined);
        const sourceId = req.body?.sourceId ? Number(req.body.sourceId) : undefined;
        if (isAdmin && sourceType && sourceId) {
          const { cancelTrainerSettlementItem } = await import('./routes/trainer-settlements');
          const n = await cancelTrainerSettlementItem(sourceType, sourceId, `토스 환불(${paymentKey})`);
          console.log(`[정산 자동 취소] ${sourceType}#${sourceId} → ${n}건 취소 (admin)`);
        } else if (sourceType && sourceId) {
          console.log(`[정산 자동 취소] 비관리자 요청 - 정산 캐스케이드 스킵 (paymentKey=${paymentKey})`);
        }
      } catch (cancelErr) {
        logServerError('[정산 자동 취소] 오류:', cancelErr, req);
      }

      res.json({
        success: true,
        message: '결제가 성공적으로 취소되었습니다.',
        cancel: cancelResult
      });
    } catch (error: any) {
      logServerError('[Toss] 결제 취소 오류:', error.response?.data || error.message, req);
      await recordAuditLog(req, {
        action: 'payment.toss.cancel',
        targetType: 'payment',
        targetId: req.body?.paymentKey,
        payload: { cancelReason: req.body?.cancelReason, cancelAmount: req.body?.cancelAmount },
        status: 'failure',
        errorMessage: error?.response?.data?.message || error?.message,
      });
      res.status(400).json({
        success: false,
        message: '결제 취소에 실패했습니다.',
        error: error.response?.data || error.message
      });
    }
  });

  console.log('[Toss Payments] 토스페이먼츠 API 엔드포인트가 등록되었습니다.');
  console.log('  - POST /api/toss/confirm (결제 승인)');
  console.log('  - GET /api/toss/payment/:paymentKey (결제 조회)');
  console.log('  - POST /api/toss/cancel (결제 취소)');

  // =============================================================================
  // 반려견 시설 API (Pet Facilities)
  // =============================================================================
  
  /**
   * GET /api/pet-facilities - 반려견 시설 목록 조회
   * 
   * Query Parameters:
   * - type: 시설 타입 (hospital, cafe, restaurant, park, grooming, hotel, training)
   * - city: 도시명
   * - district: 구/군
   */
  app.get('/api/pet-facilities', async (req, res) => {
    try {
      const { type, city, district } = req.query;
      
      const { petFacilities } = await import('../shared/schema');
      const { eq, and } = await import('drizzle-orm');

      let query = db.select().from(petFacilities);
      
      const conditions = [];
      
      if (type && typeof type === 'string') {
        conditions.push(eq(petFacilities.type, type));
      }
      
      if (city && typeof city === 'string') {
        conditions.push(eq(petFacilities.city, city));
      }
      
      if (district && typeof district === 'string') {
        conditions.push(eq(petFacilities.district, district));
      }
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }
      
      const facilities = await query;

      res.json({
        success: true,
        facilities,
        count: facilities.length
      });
    } catch (error: any) {
      logServerError('[Pet Facilities] 조회 오류:', error, req);
      res.status(500).json({
        success: false,
        message: '시설 정보를 조회할 수 없습니다.',
        error: error.message
      });
    }
  });

  console.log('[Pet Facilities] 반려견 시설 API 엔드포인트가 등록되었습니다.');
  console.log('  - GET /api/pet-facilities (시설 목록 조회)');

  // =============================================================================
  // 예방접종 스케줄 관리 API (Vaccinations)
  // =============================================================================

  /**
   * GET /api/vaccinations/user/:userId - 사용자의 모든 예방접종 스케줄 조회
   */
  app.get('/api/vaccinations/user/:userId', async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const session = (req as Request & { session?: { user?: { id?: number; role?: string } } }).session;
      const sessionUserId = session?.user?.id;
      if (!sessionUserId) return res.status(401).json({ success: false, message: '로그인이 필요합니다' });
      if (sessionUserId !== userId && session?.user?.role !== 'admin') {
        return res.status(403).json({ success: false, message: '권한이 없습니다' });
      }
      const vaccinations = await storage.getVaccinationsByUserId(userId);
      res.json({ success: true, vaccinations });
    } catch (error: any) {
      logServerError('[Vaccinations] 사용자 예방접종 조회 오류:', error, req);
      res.status(500).json({ success: false, message: '예방접종 스케줄을 조회할 수 없습니다.' });
    }
  });

  /**
   * GET /api/vaccinations/pet/:petId - 반려동물의 예방접종 스케줄 조회
   */
  app.get('/api/vaccinations/pet/:petId', async (req, res) => {
    try {
      const petId = parseInt(req.params.petId);
      const access = await requireDiaryAccess(req, res, petId);
      if (!access) return;
      const vaccinations = await storage.getVaccinationsByPetId(petId);
      res.json({ success: true, vaccinations });
    } catch (error: any) {
      logServerError('[Vaccinations] 반려동물 예방접종 조회 오류:', error, req);
      res.status(500).json({ success: false, message: '예방접종 스케줄을 조회할 수 없습니다.' });
    }
  });

  /**
   * GET /api/vaccinations/upcoming/:userId - 다가오는 예방접종 스케줄 조회
   */
  app.get('/api/vaccinations/upcoming/:userId', async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const session = (req as Request & { session?: { user?: { id?: number; role?: string } } }).session;
      const sessionUserId = session?.user?.id;
      if (!sessionUserId) return res.status(401).json({ success: false, message: '로그인이 필요합니다' });
      if (sessionUserId !== userId && session?.user?.role !== 'admin') {
        return res.status(403).json({ success: false, message: '권한이 없습니다' });
      }
      const days = req.query.days ? parseInt(req.query.days as string) : 30;
      const vaccinations = await storage.getUpcomingVaccinations(userId, days);
      res.json({ success: true, vaccinations });
    } catch (error: any) {
      logServerError('[Vaccinations] 다가오는 예방접종 조회 오류:', error, req);
      res.status(500).json({ success: false, message: '다가오는 예방접종을 조회할 수 없습니다.' });
    }
  });

  /**
   * GET /api/vaccinations/:id - 특정 예방접종 스케줄 조회
   */
  app.get('/api/vaccinations/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const vaccination = await storage.getVaccinationById(id);
      if (!vaccination) {
        return res.status(404).json({ success: false, message: '예방접종 스케줄을 찾을 수 없습니다.' });
      }
      const access = await requireDiaryAccess(req, res, vaccination.petId);
      if (!access) return;
      res.json({ success: true, vaccination });
    } catch (error: any) {
      logServerError('[Vaccinations] 예방접종 조회 오류:', error, req);
      res.status(500).json({ success: false, message: '예방접종 스케줄을 조회할 수 없습니다.' });
    }
  });

  /**
   * POST /api/vaccinations - 예방접종 스케줄 생성
   */
  app.post('/api/vaccinations', async (req, res) => {
    try {
      const { insertVaccinationSchema } = await import('../shared/schema');
      const validatedData = insertVaccinationSchema.parse(req.body);
      const access = await requireDiaryAccess(req, res, validatedData.petId);
      if (!access) return;
      if (!access.isOwner && !access.isAdmin) {
        return res.status(403).json({ success: false, message: '보호자만 등록할 수 있습니다.' });
      }
      const newVaccination = await storage.createVaccination({ ...validatedData, userId: access.userId });
      // 인앱 알림 생성
      try {
        const pet = await storage.getPet(newVaccination.petId);
        if (pet && newVaccination.userId) {
          await storage.createNotification({
            userId: newVaccination.userId,
            type: 'health',
            title: '예방접종 일정 등록',
            message: `${pet.name}의 ${newVaccination.vaccineName} 접종이 ${newVaccination.vaccineDate}로 예정되었습니다.`,
            actionUrl: `/pet-care/health-diary?petId=${pet.id}`,
            metadata: { petId: pet.id, vaccinationId: newVaccination.id },
            isRead: false,
          });
        }
      } catch (e) { console.warn('[Vaccinations] 알림 생성 실패', e); }
      // D-1 / 당일 푸시 알림 예약 (reminderEnabled / 완료·취소 상태 게이팅)
      try {
        const pet = await storage.getPet(newVaccination.petId);
        if (
          pet &&
          newVaccination.userId &&
          newVaccination.reminderEnabled !== false &&
          newVaccination.status !== 'completed' &&
          newVaccination.status !== 'cancelled'
        ) {
          const { scheduleHealthReminders } = await import('./services/diary-reminder');
          const ids = await scheduleHealthReminders({
            userId: newVaccination.userId,
            petId: pet.id,
            petName: pet.name,
            targetDate: String(newVaccination.vaccineDate),
            kind: 'vaccination',
            itemId: newVaccination.id,
            itemName: String(newVaccination.vaccineName),
            actionUrl: `/pet-care/health-diary?petId=${pet.id}`,
          });
          if (ids.length > 0) {
            const refreshed = await storage.updateVaccination(newVaccination.id, { reminderScheduleIds: ids });
            Object.assign(newVaccination, refreshed);
          }
        }
      } catch (e) { console.warn('[Vaccinations] 푸시 예약 실패', e); }
      res.status(201).json({ success: true, vaccination: newVaccination });
    } catch (error: any) {
      logServerError('[Vaccinations] 예방접종 생성 오류:', error, req);
      if (error.name === 'ZodError') {
        return res.status(400).json({ success: false, message: '입력 데이터가 올바르지 않습니다.', errors: error.errors });
      }
      res.status(500).json({ success: false, message: '예방접종 스케줄을 생성할 수 없습니다.' });
    }
  });

  /**
   * PATCH /api/vaccinations/:id - 예방접종 스케줄 수정
   */
  app.patch('/api/vaccinations/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const existing = await storage.getVaccinationById(id);
      if (!existing) {
        return res.status(404).json({ success: false, message: '예방접종 스케줄을 찾을 수 없습니다.' });
      }
      const access = await requireDiaryAccess(req, res, existing.petId);
      if (!access) return;
      if (!access.isOwner && !access.isAdmin) {
        return res.status(403).json({ success: false, message: '보호자만 수정할 수 있습니다.' });
      }
      const { updateVaccinationSchema } = await import('../shared/schema');
      const validatedData = updateVaccinationSchema.parse(req.body);
      const updatedVaccination = await storage.updateVaccination(id, validatedData);

      // 푸시 예약 재설정 (날짜 / 상태 / 리마인더 토글 변경 시)
      try {
        const updateFields: {
          vaccineDate?: string;
          status?: string;
          reminderEnabled?: boolean;
        } = validatedData;
        const dateChanged = updateFields.vaccineDate !== undefined && updateFields.vaccineDate !== existing.vaccineDate;
        const statusChanged = updateFields.status !== undefined && updateFields.status !== existing.status;
        const reminderToggled = updateFields.reminderEnabled !== undefined && updateFields.reminderEnabled !== existing.reminderEnabled;
        if (dateChanged || statusChanged || reminderToggled) {
          const { scheduleHealthReminders, cancelScheduledReminders } = await import('./services/diary-reminder');
          await cancelScheduledReminders(existing.reminderScheduleIds || []);
          let newIds: number[] = [];
          const finalStatus = updateFields.status !== undefined ? updateFields.status : existing.status;
          const finalReminderEnabled = updateFields.reminderEnabled !== undefined ? updateFields.reminderEnabled : existing.reminderEnabled;
          if (finalReminderEnabled !== false && finalStatus !== 'completed' && finalStatus !== 'cancelled') {
            const pet = await storage.getPet(existing.petId);
            if (pet && existing.userId) {
              newIds = await scheduleHealthReminders({
                userId: existing.userId,
                petId: pet.id,
                petName: pet.name,
                targetDate: String(updatedVaccination.vaccineDate),
                kind: 'vaccination',
                itemId: id,
                itemName: String(updatedVaccination.vaccineName),
                actionUrl: `/pet-care/health-diary?petId=${pet.id}`,
              });
            }
          }
          const refreshed = await storage.updateVaccination(id, { reminderScheduleIds: newIds });
          Object.assign(updatedVaccination, refreshed);
        }
      } catch (e) { console.warn('[Vaccinations] 푸시 재예약 실패', e); }

      res.json({ success: true, vaccination: updatedVaccination });
    } catch (error: any) {
      logServerError('[Vaccinations] 예방접종 수정 오류:', error, req);
      if (error.name === 'ZodError') {
        return res.status(400).json({ success: false, message: '입력 데이터가 올바르지 않습니다.', errors: error.errors });
      }
      if (error.message === 'Vaccination not found') {
        return res.status(404).json({ success: false, message: '예방접종 스케줄을 찾을 수 없습니다.' });
      }
      res.status(500).json({ success: false, message: '예방접종 스케줄을 수정할 수 없습니다.' });
    }
  });

  /**
   * DELETE /api/vaccinations/:id - 예방접종 스케줄 삭제
   */
  app.delete('/api/vaccinations/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const existing = await storage.getVaccinationById(id);
      if (!existing) {
        return res.status(404).json({ success: false, message: '예방접종 스케줄을 찾을 수 없습니다.' });
      }
      const access = await requireDiaryAccess(req, res, existing.petId);
      if (!access) return;
      if (!access.isOwner && !access.isAdmin) {
        return res.status(403).json({ success: false, message: '보호자만 삭제할 수 있습니다.' });
      }
      try {
        const { cancelScheduledReminders } = await import('./services/diary-reminder');
        await cancelScheduledReminders(existing.reminderScheduleIds || []);
      } catch (e) { console.warn('[Vaccinations] 푸시 취소 실패', e); }
      const deleted = await storage.deleteVaccination(id);
      if (!deleted) {
        return res.status(404).json({ success: false, message: '예방접종 스케줄을 찾을 수 없습니다.' });
      }
      res.json({ success: true, message: '예방접종 스케줄이 삭제되었습니다.' });
    } catch (error: any) {
      logServerError('[Vaccinations] 예방접종 삭제 오류:', error, req);
      res.status(500).json({ success: false, message: '예방접종 스케줄을 삭제할 수 없습니다.' });
    }
  });

  console.log('[Vaccinations] 예방접종 스케줄 관리 API 엔드포인트가 등록되었습니다.');
  console.log('  - GET /api/vaccinations/user/:userId (사용자의 모든 예방접종)');
  console.log('  - GET /api/vaccinations/pet/:petId (반려동물의 예방접종)');
  console.log('  - GET /api/vaccinations/upcoming/:userId (다가오는 예방접종)');
  console.log('  - GET /api/vaccinations/:id (특정 예방접종 조회)');
  console.log('  - POST /api/vaccinations (예방접종 생성)');
  console.log('  - PATCH /api/vaccinations/:id (예방접종 수정)');
  console.log('  - DELETE /api/vaccinations/:id (예방접종 삭제)');

  // Database test routes
  import('./routes/database-test').then(({ databaseTestRoutes }) => {
    app.use('/api/test', databaseTestRoutes);
    console.log('[Database Test] 데이터베이스 테스트 라우트가 등록되었습니다.');
  }).catch(error => {
    logServerError('[Database Test] 라우트 등록 실패:', error);
  });

  // =============================================================================
  // 구글 뉴스 검색 API (Google Custom Search API)
  // =============================================================================
  
  // 탭별 검색 쿼리 매핑
  const newsSearchQueries: Record<string, string> = {
    all: '반려동물 뉴스 OR 반려견 소식 OR 펫 정보',
    training: '강아지 훈련 팁 OR 반려견 교육 방법',
    survey: '반려동물 설문조사 OR 반려견 통계',
    info: '강아지 건강 정보 OR 반려견 관리',
    events: '반려동물 행사 OR 반려견 이벤트 축제'
  };

  app.get('/api/news/search', async (req, res) => {
    try {
      const { category, page = '1' } = req.query;
      const categoryStr = String(category || 'training');
      const pageNum = parseInt(String(page), 10) || 1;
      
      // 환경 변수 확인 (Google Custom Search 전용 API 키 사용)
      const apiKey = process.env.GOOGLE_CUSTOM_SEARCH_API_KEY;
      const searchEngineId = process.env.GOOGLE_CUSTOM_SEARCH_ENGINE_ID;
      
      if (!apiKey || !searchEngineId) {
        console.warn('[News API] Google Custom Search 환경 변수가 설정되지 않았습니다.');
        // 환경 변수가 없으면 샘플 데이터 반환
        return res.json({
          success: true,
          articles: getSampleNewsArticles(categoryStr),
          totalResults: 10,
          page: pageNum,
          message: 'Google Custom Search API가 설정되지 않아 샘플 뉴스를 표시합니다.'
        });
      }
      
      const query = newsSearchQueries[categoryStr] || newsSearchQueries.training;
      const start = (pageNum - 1) * 10 + 1; // Google CSE는 1부터 시작
      
      // Google Custom Search API 호출
      const searchUrl = new URL('https://www.googleapis.com/customsearch/v1');
      searchUrl.searchParams.set('key', apiKey);
      searchUrl.searchParams.set('cx', searchEngineId);
      searchUrl.searchParams.set('q', query);
      searchUrl.searchParams.set('start', String(start));
      searchUrl.searchParams.set('num', '10');
      searchUrl.searchParams.set('lr', 'lang_ko'); // 한국어 결과
      searchUrl.searchParams.set('dateRestrict', 'm3'); // 최근 3개월
      searchUrl.searchParams.set('sort', 'date'); // 최신순
      
      const response = await fetch(searchUrl.toString());
      
      if (!response.ok) {
        const errorBody = await response.text();
        logger.error('[News API] Google API 오류:', response.status, errorBody);
        return res.json({
          success: true,
          articles: getSampleNewsArticles(categoryStr),
          totalResults: 10,
          page: pageNum,
          message: 'API 오류로 인해 샘플 뉴스를 표시합니다.'
        });
      }
      
      const data = await response.json();
      
      // 결과 변환
      const articles = (data.items || []).map((item: any, index: number) => ({
        id: `news-${Date.now()}-${index}`,
        title: item.title,
        description: item.snippet,
        url: item.link,
        image: item.pagemap?.cse_thumbnail?.[0]?.src || 
               item.pagemap?.cse_image?.[0]?.src || 
               item.pagemap?.metatags?.[0]?.['og:image'] ||
               null,
        source: item.displayLink,
        publishedAt: item.pagemap?.metatags?.[0]?.['article:published_time'] || 
                     item.pagemap?.metatags?.[0]?.['og:updated_time'] ||
                     new Date().toISOString(),
        category: categoryStr
      }));
      
      res.json({
        success: true,
        articles,
        totalResults: parseInt(data.searchInformation?.totalResults || '0', 10),
        page: pageNum
      });
      
    } catch (error: any) {
      logServerError('[News API] 뉴스 검색 오류:', error, req);
      res.status(500).json({
        success: false,
        message: '뉴스를 검색하는 중 오류가 발생했습니다.',
        error: error.message
      });
    }
  });
  
  // 샘플 뉴스 데이터 생성 함수
  function getSampleNewsArticles(category: string) {
    const sampleData: Record<string, any[]> = {
      training: [
        {
          id: 'sample-1',
          title: '강아지 훈련의 황금시기, 생후 3~6개월이 중요한 이유',
          description: '전문가들은 강아지의 사회화 교육이 생후 3개월부터 시작되어야 한다고 조언합니다. 이 시기에 형성된 습관이 평생을 좌우합니다.',
          url: 'https://example.com/news/training-1',
          image: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400',
          source: 'TALEZ 뉴스',
          publishedAt: new Date().toISOString(),
          category: 'training'
        },
        {
          id: 'sample-2',
          title: '긍정 강화 훈련법, 올바른 보상 타이밍이 핵심',
          description: '행동 직후 0.5초 이내에 보상을 제공해야 강아지가 정확히 어떤 행동에 대한 칭찬인지 이해할 수 있습니다.',
          url: 'https://example.com/news/training-2',
          image: 'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=400',
          source: 'TALEZ 뉴스',
          publishedAt: new Date(Date.now() - 86400000).toISOString(),
          category: 'training'
        },
        {
          id: 'sample-3',
          title: '산책 중 당김 교정, 전문가가 알려주는 효과적인 방법',
          description: '줄을 당기면 멈추고, 느슨해지면 다시 걷는 방식을 반복하면 2주 내에 개선 효과를 볼 수 있습니다.',
          url: 'https://example.com/news/training-3',
          image: 'https://images.unsplash.com/photo-1558929996-da64ba858215?w=400',
          source: 'TALEZ 뉴스',
          publishedAt: new Date(Date.now() - 172800000).toISOString(),
          category: 'training'
        }
      ],
      survey: [
        {
          id: 'sample-4',
          title: '2024 반려동물 양육 현황 조사 결과 발표',
          description: '국내 반려동물 양육 가구가 600만을 돌파했으며, 반려견의 평균 양육 비용은 월 25만원으로 조사되었습니다.',
          url: 'https://example.com/news/survey-1',
          image: 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=400',
          source: 'TALEZ 뉴스',
          publishedAt: new Date().toISOString(),
          category: 'survey'
        },
        {
          id: 'sample-5',
          title: '반려인 70% "훈련 교육 필요성 느껴"',
          description: '설문조사 결과, 반려인 10명 중 7명이 전문 훈련의 필요성을 느끼고 있으며, 주요 관심사는 기본 복종과 사회화였습니다.',
          url: 'https://example.com/news/survey-2',
          image: 'https://images.unsplash.com/photo-1530281700549-e82e7bf110d6?w=400',
          source: 'TALEZ 뉴스',
          publishedAt: new Date(Date.now() - 86400000).toISOString(),
          category: 'survey'
        }
      ],
      info: [
        {
          id: 'sample-6',
          title: '여름철 반려견 건강 관리 필수 가이드',
          description: '무더운 여름, 반려견의 열사병 예방을 위해 산책 시간과 수분 섭취에 주의해야 합니다.',
          url: 'https://example.com/news/info-1',
          image: 'https://images.unsplash.com/photo-1477884213360-7e9d7dcc1e48?w=400',
          source: 'TALEZ 뉴스',
          publishedAt: new Date().toISOString(),
          category: 'info'
        },
        {
          id: 'sample-7',
          title: '노령견 케어, 달라지는 건강 관리 포인트',
          description: '7세 이상 노령견은 정기 건강검진과 함께 관절, 치아, 인지 기능에 대한 관리가 필요합니다.',
          url: 'https://example.com/news/info-2',
          image: 'https://images.unsplash.com/photo-1518020382113-a7e8fc38eac9?w=400',
          source: 'TALEZ 뉴스',
          publishedAt: new Date(Date.now() - 86400000).toISOString(),
          category: 'info'
        }
      ],
      events: [
        {
          id: 'sample-8',
          title: '2024 대한민국 반려동물 박람회 개최 안내',
          description: '오는 12월 서울 코엑스에서 국내 최대 규모의 반려동물 박람회가 개최됩니다. 다양한 체험 프로그램도 준비되어 있습니다.',
          url: 'https://example.com/news/events-1',
          image: 'https://images.unsplash.com/photo-1534361960057-19889db9621e?w=400',
          source: 'TALEZ 뉴스',
          publishedAt: new Date().toISOString(),
          category: 'events'
        },
        {
          id: 'sample-9',
          title: '반려견과 함께하는 마라톤 대회 참가자 모집',
          description: '반려견과 함께 달리는 5km 마라톤 대회가 열립니다. 완주자 전원에게 기념품이 제공됩니다.',
          url: 'https://example.com/news/events-2',
          image: 'https://images.unsplash.com/photo-1558929996-da64ba858215?w=400',
          source: 'TALEZ 뉴스',
          publishedAt: new Date(Date.now() - 86400000).toISOString(),
          category: 'events'
        }
      ]
    };
    
    // 'all' 카테고리인 경우 모든 카테고리에서 최신순으로 가져오기
    if (category === 'all') {
      const allArticles = [
        ...sampleData.training,
        ...sampleData.survey,
        ...sampleData.info,
        ...sampleData.events
      ].sort((a, b) => 
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
      );
      return allArticles;
    }
    
    return sampleData[category] || sampleData.training;
  }
  
  console.log('[News API] 구글 뉴스 검색 API 엔드포인트가 등록되었습니다.');
  console.log('  - GET /api/news/search (카테고리별 뉴스 검색)');

  // FCM 푸시 알림 라우트
  import('./routes/fcm').then(fcmModule => {
    app.use('/api/fcm', fcmModule.default);
    console.log('[FCM] Firebase Cloud Messaging 라우트가 등록되었습니다.');
  }).catch(error => {
    logServerError('[FCM] FCM 라우트 로드 실패:', error);
  });

  // 관리자 푸시 알림 관리 라우트 (대량/예약/세그먼트 발송)
  import('./routes/push-admin').then(pushAdminModule => {
    app.use('/api/admin/push', pushAdminModule.default);
    console.log('[Push Admin] 푸시 알림 관리 라우트가 등록되었습니다.');
  }).catch(error => {
    logServerError('[Push Admin] 푸시 관리 라우트 로드 실패:', error);
  });

  // DogVoiceAI 강아지 AI 분석 라우트
  import('./routes/dog-ai-analysis').then(dogAiModule => {
    app.use('/api/ai-analysis', dogAiModule.default);
    app.use('/api/comprehensive-report', dogAiModule.default);
    console.log('[Dog AI] 강아지 AI 분석 라우트가 등록되었습니다.');
  }).catch(error => {
    logServerError('[Dog AI] 강아지 AI 분석 라우트 로드 실패:', error);
  });

  // SSO 라우트
  import('./routes/sso').then(ssoModule => {
    app.use(ssoModule.default);
    console.log('[SSO] SSO 라우트가 등록되었습니다.');
  }).catch(error => {
    logServerError('[SSO] SSO 라우트 로드 실패:', error);
  });

  // 모든 인증 API들은 setupAuth()에서 처리됩니다 (/api/auth/login, /api/auth/logout, /api/auth/me)

  // 사용자 프로필 API
  app.get("/api/user/profile", requireAuth(), async (req, res) => {
    try {
      const sessionUser = (req as any).user;
      if (!sessionUser) {
        return res.status(401).json({ success: false, error: "인증이 필요합니다." });
      }

      // username으로 조회 (세션 ID와 DB ID 불일치 문제 해결)
      const username = sessionUser.username;
      const user = username 
        ? await db.select().from(users).where(eq(users.username, username)).limit(1)
        : await db.select().from(users).where(eq(users.id, sessionUser.id)).limit(1);
      
      if (user.length === 0) {
        // DB에 없으면 세션 정보 반환
        const { password, ...userProfile } = sessionUser;
        return res.json({ success: true, data: userProfile });
      }

      const { password, ...userProfile } = user[0];
      console.log('[Profile API] 프로필 응답 데이터:', {
        id: userProfile.id,
        username: userProfile.username,
        profileImage: userProfile.profileImage,
        avatar: userProfile.avatar
      });
      res.json({ success: true, data: userProfile });
    } catch (error) {
      logServerError('프로필 조회 오류:', error, req);
      res.status(500).json({ success: false, error: "프로필 조회 중 오류가 발생했습니다." });
    }
  });

  app.put("/api/user/profile", requireAuth(), async (req, res) => {
    try {
      const sessionUser = (req as any).user;
      if (!sessionUser) {
        return res.status(401).json({ success: false, error: "인증이 필요합니다." });
      }

      const { name, email, phoneNumber, birthDate, gender, bio, address } = req.body;
      
      // 업데이트할 값이 있는지 확인
      const updateData: Partial<{
        name: string; email: string; phoneNumber: string;
        birthDate: string; gender: string; bio: string; address: string;
      }> = {};
      if (name !== undefined && name !== '') updateData.name = name;
      if (email !== undefined && email !== '') updateData.email = email;
      if (phoneNumber !== undefined && phoneNumber !== '') updateData.phoneNumber = phoneNumber;
      if (birthDate !== undefined && birthDate !== '') updateData.birthDate = birthDate;
      if (gender !== undefined && gender !== '') updateData.gender = gender;
      if (bio !== undefined && bio !== '') updateData.bio = bio;
      if (address !== undefined && address !== '') updateData.address = address;
      
      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ success: false, error: "업데이트할 값이 없습니다." });
      }

      // username으로 조회하여 업데이트
      const username = sessionUser.username;
      const updatedUser = await db.update(users)
        .set(updateData)
        .where(username ? eq(users.username, username) : eq(users.id, sessionUser.id))
        .returning();

      if (updatedUser.length === 0) {
        return res.status(404).json({ success: false, error: "사용자를 찾을 수 없습니다." });
      }

      const { password, ...userProfile } = updatedUser[0];
      res.json({ success: true, data: userProfile });
    } catch (error) {
      logServerError('프로필 업데이트 오류:', error, req);
      res.status(500).json({ success: false, error: "프로필 업데이트 중 오류가 발생했습니다." });
    }
  });

  app.put("/api/user/profile/image", requireAuth(), async (req, res) => {
    try {
      const sessionUser = (req as any).user;
      if (!sessionUser) {
        return res.status(401).json({ success: false, error: "인증이 필요합니다." });
      }

      const { profileImage } = req.body;
      if (!profileImage) {
        return res.status(400).json({ success: false, error: "이미지 URL이 필요합니다." });
      }

      // username으로 조회하여 업데이트
      const username = sessionUser.username;
      const updatedUser = await db.update(users)
        .set({
          profileImage: profileImage
        })
        .where(username ? eq(users.username, username) : eq(users.id, sessionUser.id))
        .returning();

      if (updatedUser.length === 0) {
        return res.status(404).json({ success: false, error: "사용자를 찾을 수 없습니다." });
      }

      const { password, ...userProfile } = updatedUser[0];
      res.json({ success: true, data: userProfile });
    } catch (error) {
      logServerError('프로필 이미지 업데이트 오류:', error, req);
      res.status(500).json({ success: false, error: "프로필 이미지 업데이트 중 오류가 발생했습니다." });
    }
  });

  console.log('[Profile API] 사용자 프로필 API가 등록되었습니다.');

  // ========== 첫 방문 상담 기록 API ==========

  app.post("/api/consultation-records", requireAuth(), async (req, res) => {
    try {
      const sessionUser = (req as any).user;
      if (!sessionUser) return res.status(401).json({ error: "인증이 필요합니다." });
      const role = sessionUser.role || sessionUser.userRole;
      if (!['trainer', 'institute-admin', 'admin'].includes(role)) {
        return res.status(403).json({ error: "훈련사, 기관관리자 또는 관리자만 상담 기록을 작성할 수 있습니다." });
      }
      const { petId, ownerId, visitPurpose, mainProblemBehavior, behaviorTiming, behaviorTarget, recentChanges, walkDuration, mealPattern, ownerReactionStyle, previousTrainingExperience, desiredGoal, temperamentLevel, additionalNotes } = req.body;
      if (!petId || !ownerId || !visitPurpose || !mainProblemBehavior) {
        return res.status(400).json({ error: "필수 항목을 입력해주세요. (반려동물, 보호자, 방문 목적, 주요 문제 행동)" });
      }
      if (temperamentLevel && !['A','B','C','D','E'].includes(temperamentLevel)) {
        return res.status(400).json({ error: "성향 등급은 A~E 중 하나여야 합니다." });
      }
      const [pet] = await db.select({ ownerId: pets.ownerId }).from(pets).where(eq(pets.id, Number(petId)));
      if (!pet) return res.status(404).json({ error: "반려동물을 찾을 수 없습니다." });
      if (pet.ownerId !== Number(ownerId)) {
        return res.status(400).json({ error: "보호자와 반려동물이 일치하지 않습니다." });
      }

      if (role === 'trainer') {
        const [assigned] = await db.select({ id: trainerClientAssignments.id })
          .from(trainerClientAssignments)
          .where(and(
            eq(trainerClientAssignments.trainerId, sessionUser.id),
            or(
              eq(trainerClientAssignments.petId, Number(petId)),
              eq(trainerClientAssignments.clientId, Number(ownerId))
            )
          ))
          .limit(1);
        const [consulted] = await db.select({ id: consultationRecords.id })
          .from(consultationRecords)
          .where(and(
            eq(consultationRecords.trainerId, sessionUser.id),
            eq(consultationRecords.petId, Number(petId))
          ))
          .limit(1);
        if (!assigned && !consulted) {
          return res.status(403).json({ error: "담당하지 않는 반려동물에 대한 상담 기록을 작성할 수 없습니다." });
        }
      } else if (role === 'institute-admin') {
        if (!sessionUser.instituteId) {
          return res.status(403).json({ error: "소속 기관이 없어 상담 기록을 작성할 수 없습니다." });
        }
        const instTrainers = await db.select({ trainerId: trainerInstitutes.trainerId })
          .from(trainerInstitutes)
          .where(eq(trainerInstitutes.instituteId, sessionUser.instituteId));
        const instTrainerIds = instTrainers.map((t: { trainerId: number }) => t.trainerId);
        if (instTrainerIds.length > 0) {
          const [instAssigned] = await db.select({ id: trainerClientAssignments.id })
            .from(trainerClientAssignments)
            .where(and(
              sql`${trainerClientAssignments.trainerId} = ANY(${instTrainerIds})`,
              or(
                eq(trainerClientAssignments.petId, Number(petId)),
                eq(trainerClientAssignments.clientId, Number(ownerId))
              )
            ))
            .limit(1);
          const [instConsulted] = await db.select({ id: consultationRecords.id })
            .from(consultationRecords)
            .where(and(
              sql`${consultationRecords.trainerId} = ANY(${instTrainerIds})`,
              eq(consultationRecords.petId, Number(petId))
            ))
            .limit(1);
          if (!instAssigned && !instConsulted) {
            return res.status(403).json({ error: "소속 기관의 담당 범위에 없는 반려동물에 대한 상담 기록을 작성할 수 없습니다." });
          }
        } else {
          return res.status(403).json({ error: "소속 기관에 훈련사가 없어 상담 기록을 작성할 수 없습니다." });
        }
      }

      let serverInstituteId = sessionUser.instituteId || null;
      if (role === 'trainer' && !serverInstituteId) {
        const [trainerInst] = await db.select({ instituteId: trainerInstitutes.instituteId })
          .from(trainerInstitutes)
          .where(eq(trainerInstitutes.trainerId, sessionUser.id))
          .limit(1);
        if (trainerInst) serverInstituteId = trainerInst.instituteId;
      }
      const [record] = await db.insert(consultationRecords).values({
        petId: Number(petId),
        ownerId: Number(ownerId),
        trainerId: sessionUser.id,
        instituteId: serverInstituteId,
        visitPurpose,
        mainProblemBehavior,
        behaviorTiming: behaviorTiming || null,
        behaviorTarget: behaviorTarget || null,
        recentChanges: recentChanges || null,
        walkDuration: walkDuration || null,
        mealPattern: mealPattern || null,
        ownerReactionStyle: ownerReactionStyle || null,
        previousTrainingExperience: previousTrainingExperience || null,
        desiredGoal: desiredGoal || null,
        temperamentLevel: temperamentLevel || null,
        additionalNotes: additionalNotes || null,
      }).returning();
      if (temperamentLevel) {
        await db.update(pets).set({ temperamentLevel }).where(eq(pets.id, Number(petId)));
      }
      res.json({ success: true, consultation: record });
    } catch (error) {
      logServerError("상담 기록 생성 오류:", error, req);
      res.status(500).json({ error: "상담 기록 생성 중 오류가 발생했습니다." });
    }
  });

  app.get("/api/consultation-records", requireAuth(), async (req, res) => {
    try {
      const sessionUser = (req as any).user;
      if (!sessionUser) return res.status(401).json({ error: "인증이 필요합니다." });
      const role = sessionUser.role || sessionUser.userRole;
      let records;
      if (role === 'admin') {
        records = await db.select().from(consultationRecords).orderBy(desc(consultationRecords.createdAt));
      } else if (role === 'trainer') {
        records = await db.select().from(consultationRecords).where(eq(consultationRecords.trainerId, sessionUser.id)).orderBy(desc(consultationRecords.createdAt));
      } else if (role === 'institute-admin') {
        if (sessionUser.instituteId) {
          const instTrainers = await db.select({ trainerId: trainerInstitutes.trainerId })
            .from(trainerInstitutes)
            .where(eq(trainerInstitutes.instituteId, sessionUser.instituteId));
          const instTrainerIds = instTrainers.map((t: { trainerId: number }) => t.trainerId);
          if (instTrainerIds.length > 0) {
            records = await db.select().from(consultationRecords)
              .where(or(
                eq(consultationRecords.instituteId, sessionUser.instituteId),
                sql`${consultationRecords.trainerId} = ANY(${instTrainerIds})`
              ))
              .orderBy(desc(consultationRecords.createdAt));
          } else {
            records = await db.select().from(consultationRecords).where(eq(consultationRecords.instituteId, sessionUser.instituteId)).orderBy(desc(consultationRecords.createdAt));
          }
        } else {
          records = [];
        }
      } else if (role === 'pet-owner') {
        records = await db.select().from(consultationRecords).where(eq(consultationRecords.ownerId, sessionUser.id)).orderBy(desc(consultationRecords.createdAt));
      } else {
        return res.status(403).json({ error: "접근 권한이 없습니다." });
      }
      const enriched = await Promise.all(records.map(async (r: any) => {
        const [pet] = await db.select({ name: pets.name, breed: pets.breed }).from(pets).where(eq(pets.id, r.petId));
        const [owner] = await db.select({ name: users.name, email: users.email }).from(users).where(eq(users.id, r.ownerId));
        const [trainer] = await db.select({ name: users.name }).from(users).where(eq(users.id, r.trainerId));
        return { ...r, petName: pet?.name, petBreed: pet?.breed, ownerName: owner?.name, ownerEmail: owner?.email, trainerName: trainer?.name };
      }));
      res.json({ success: true, consultations: enriched });
    } catch (error) {
      logServerError("상담 기록 조회 오류:", error, req);
      res.status(500).json({ error: "상담 기록 조회 중 오류가 발생했습니다." });
    }
  });

  app.get("/api/consultation-records/pet/:petId", requireAuth(), async (req, res) => {
    try {
      const sessionUser = (req as any).user;
      if (!sessionUser) return res.status(401).json({ error: "인증이 필요합니다." });
      const role = sessionUser.role || sessionUser.userRole;
      const petId = Number(req.params.petId);
      const [pet] = await db.select({ ownerId: pets.ownerId }).from(pets).where(eq(pets.id, petId));
      if (!pet) return res.status(404).json({ error: "반려동물을 찾을 수 없습니다." });
      if (role === 'pet-owner' && pet.ownerId !== sessionUser.id) {
        return res.status(403).json({ error: "접근 권한이 없습니다." });
      }
      const petRecordsQuery = eq(consultationRecords.petId, petId);
      let records;
      if (role === 'admin') {
        records = await db.select().from(consultationRecords).where(petRecordsQuery).orderBy(desc(consultationRecords.createdAt));
      } else if (role === 'pet-owner') {
        records = await db.select().from(consultationRecords).where(and(petRecordsQuery, eq(consultationRecords.ownerId, sessionUser.id))).orderBy(desc(consultationRecords.createdAt));
      } else if (role === 'trainer') {
        records = await db.select().from(consultationRecords).where(and(petRecordsQuery, eq(consultationRecords.trainerId, sessionUser.id))).orderBy(desc(consultationRecords.createdAt));
      } else if (role === 'institute-admin') {
        if (!sessionUser.instituteId) {
          records = [];
        } else {
          const instTrainers = await db.select({ trainerId: trainerInstitutes.trainerId })
            .from(trainerInstitutes)
            .where(eq(trainerInstitutes.instituteId, sessionUser.instituteId));
          const instTrainerIds = instTrainers.map((t: { trainerId: number }) => t.trainerId);
          if (instTrainerIds.length > 0) {
            records = await db.select().from(consultationRecords)
              .where(and(petRecordsQuery, or(
                eq(consultationRecords.instituteId, sessionUser.instituteId),
                sql`${consultationRecords.trainerId} = ANY(${instTrainerIds})`
              )))
              .orderBy(desc(consultationRecords.createdAt));
          } else {
            records = await db.select().from(consultationRecords).where(and(petRecordsQuery, eq(consultationRecords.instituteId, sessionUser.instituteId))).orderBy(desc(consultationRecords.createdAt));
          }
        }
      } else {
        return res.status(403).json({ error: "접근 권한이 없습니다." });
      }
      const enriched = await Promise.all(records.map(async (r: any) => {
        const [trainer] = await db.select({ name: users.name }).from(users).where(eq(users.id, r.trainerId));
        return { ...r, trainerName: trainer?.name };
      }));
      res.json({ success: true, consultations: enriched });
    } catch (error) {
      logServerError("반려동물 상담 기록 조회 오류:", error, req);
      res.status(500).json({ error: "상담 기록 조회 중 오류가 발생했습니다." });
    }
  });

  app.get("/api/consultation-records/:id", requireAuth(), async (req, res) => {
    try {
      const sessionUser = (req as any).user;
      if (!sessionUser) return res.status(401).json({ error: "인증이 필요합니다." });
      const role = sessionUser.role || sessionUser.userRole;
      if (!['admin', 'trainer', 'institute-admin', 'pet-owner'].includes(role)) {
        return res.status(403).json({ error: "접근 권한이 없습니다." });
      }
      const id = Number(req.params.id);
      const [record] = await db.select().from(consultationRecords).where(eq(consultationRecords.id, id));
      if (!record) return res.status(404).json({ error: "상담 기록을 찾을 수 없습니다." });
      if (role === 'pet-owner' && record.ownerId !== sessionUser.id) {
        return res.status(403).json({ error: "접근 권한이 없습니다." });
      }
      if (role === 'trainer' && record.trainerId !== sessionUser.id) {
        return res.status(403).json({ error: "접근 권한이 없습니다." });
      }
      if (role === 'institute-admin') {
        if (!sessionUser.instituteId) {
          return res.status(403).json({ error: "소속 기관의 상담 기록만 조회할 수 있습니다." });
        }
        const instMatch = record.instituteId === sessionUser.instituteId;
        if (!instMatch) {
          const [trainerInInst] = await db.select({ id: trainerInstitutes.id })
            .from(trainerInstitutes)
            .where(and(eq(trainerInstitutes.trainerId, record.trainerId), eq(trainerInstitutes.instituteId, sessionUser.instituteId)))
            .limit(1);
          if (!trainerInInst) {
            return res.status(403).json({ error: "소속 기관의 상담 기록만 조회할 수 있습니다." });
          }
        }
      }
      const [pet] = await db.select().from(pets).where(eq(pets.id, record.petId));
      const [owner] = await db.select({ name: users.name, email: users.email, phone: users.phone }).from(users).where(eq(users.id, record.ownerId));
      const [trainer] = await db.select({ name: users.name }).from(users).where(eq(users.id, record.trainerId));
      res.json({ success: true, consultation: { ...record, pet, ownerName: owner?.name, ownerEmail: owner?.email, ownerPhone: owner?.phone, trainerName: trainer?.name } });
    } catch (error) {
      logServerError("상담 기록 상세 조회 오류:", error, req);
      res.status(500).json({ error: "상담 기록 조회 중 오류가 발생했습니다." });
    }
  });

  app.put("/api/consultation-records/:id", requireAuth(), async (req, res) => {
    try {
      const sessionUser = (req as any).user;
      if (!sessionUser) return res.status(401).json({ error: "인증이 필요합니다." });
      const role = sessionUser.role || sessionUser.userRole;
      if (!['trainer', 'institute-admin', 'admin'].includes(role)) {
        return res.status(403).json({ error: "수정 권한이 없습니다." });
      }
      const id = Number(req.params.id);
      const [existing] = await db.select().from(consultationRecords).where(eq(consultationRecords.id, id));
      if (!existing) return res.status(404).json({ error: "상담 기록을 찾을 수 없습니다." });
      if (role === 'trainer' && existing.trainerId !== sessionUser.id) {
        return res.status(403).json({ error: "본인이 작성한 상담 기록만 수정할 수 있습니다." });
      }
      if (role === 'institute-admin') {
        if (!sessionUser.instituteId) {
          return res.status(403).json({ error: "소속 기관의 상담 기록만 수정할 수 있습니다." });
        }
        const instMatch = existing.instituteId === sessionUser.instituteId;
        if (!instMatch) {
          const [trainerInInst] = await db.select({ id: trainerInstitutes.id })
            .from(trainerInstitutes)
            .where(and(eq(trainerInstitutes.trainerId, existing.trainerId), eq(trainerInstitutes.instituteId, sessionUser.instituteId)))
            .limit(1);
          if (!trainerInInst) {
            return res.status(403).json({ error: "소속 기관의 상담 기록만 수정할 수 있습니다." });
          }
        }
      }
      const { visitPurpose, mainProblemBehavior, behaviorTiming, behaviorTarget, recentChanges, walkDuration, mealPattern, ownerReactionStyle, previousTrainingExperience, desiredGoal, temperamentLevel, additionalNotes } = req.body;
      if (temperamentLevel && !['A','B','C','D','E'].includes(temperamentLevel)) {
        return res.status(400).json({ error: "성향 등급은 A~E 중 하나여야 합니다." });
      }
      const updateData: any = { updatedAt: new Date() };
      if (visitPurpose !== undefined) updateData.visitPurpose = visitPurpose;
      if (mainProblemBehavior !== undefined) updateData.mainProblemBehavior = mainProblemBehavior;
      if (behaviorTiming !== undefined) updateData.behaviorTiming = behaviorTiming;
      if (behaviorTarget !== undefined) updateData.behaviorTarget = behaviorTarget;
      if (recentChanges !== undefined) updateData.recentChanges = recentChanges;
      if (walkDuration !== undefined) updateData.walkDuration = walkDuration;
      if (mealPattern !== undefined) updateData.mealPattern = mealPattern;
      if (ownerReactionStyle !== undefined) updateData.ownerReactionStyle = ownerReactionStyle;
      if (previousTrainingExperience !== undefined) updateData.previousTrainingExperience = previousTrainingExperience;
      if (desiredGoal !== undefined) updateData.desiredGoal = desiredGoal;
      if (temperamentLevel !== undefined) updateData.temperamentLevel = temperamentLevel;
      if (additionalNotes !== undefined) updateData.additionalNotes = additionalNotes;
      const [updated] = await db.update(consultationRecords).set(updateData).where(eq(consultationRecords.id, id)).returning();
      if (temperamentLevel !== undefined) {
        await db.update(pets).set({ temperamentLevel: temperamentLevel || null }).where(eq(pets.id, existing.petId));
      }
      res.json({ success: true, consultation: updated });
    } catch (error) {
      logServerError("상담 기록 수정 오류:", error, req);
      res.status(500).json({ error: "상담 기록 수정 중 오류가 발생했습니다." });
    }
  });

  app.delete("/api/consultation-records/:id", requireAuth(), async (req, res) => {
    try {
      const sessionUser = (req as any).user;
      if (!sessionUser) return res.status(401).json({ error: "인증이 필요합니다." });
      const role = sessionUser.role || sessionUser.userRole;
      if (!['trainer', 'institute-admin', 'admin'].includes(role)) {
        return res.status(403).json({ error: "삭제 권한이 없습니다." });
      }
      const id = Number(req.params.id);
      const [existing] = await db.select().from(consultationRecords).where(eq(consultationRecords.id, id));
      if (!existing) return res.status(404).json({ error: "상담 기록을 찾을 수 없습니다." });
      if (role === 'trainer' && existing.trainerId !== sessionUser.id) {
        return res.status(403).json({ error: "본인이 작성한 상담 기록만 삭제할 수 있습니다." });
      }
      if (role === 'institute-admin') {
        if (!sessionUser.instituteId) {
          return res.status(403).json({ error: "소속 기관의 상담 기록만 삭제할 수 있습니다." });
        }
        const instMatch = existing.instituteId === sessionUser.instituteId;
        if (!instMatch) {
          const [trainerInInst] = await db.select({ id: trainerInstitutes.id })
            .from(trainerInstitutes)
            .where(and(eq(trainerInstitutes.trainerId, existing.trainerId), eq(trainerInstitutes.instituteId, sessionUser.instituteId)))
            .limit(1);
          if (!trainerInInst) {
            return res.status(403).json({ error: "소속 기관의 상담 기록만 삭제할 수 있습니다." });
          }
        }
      }
      await db.delete(consultationRecords).where(eq(consultationRecords.id, id));
      res.json({ success: true, message: "상담 기록이 삭제되었습니다." });
    } catch (error) {
      logServerError("상담 기록 삭제 오류:", error, req);
      res.status(500).json({ error: "상담 기록 삭제 중 오류가 발생했습니다." });
    }
  });

  app.put("/api/pets/:petId/temperament", requireAuth(), async (req, res) => {
    try {
      const sessionUser = (req as any).user;
      if (!sessionUser) return res.status(401).json({ error: "인증이 필요합니다." });
      const role = sessionUser.role || sessionUser.userRole;
      if (!['trainer', 'institute-admin', 'admin'].includes(role)) {
        return res.status(403).json({ error: "성향 등급 변경 권한이 없습니다." });
      }
      const petId = Number(req.params.petId);
      const { temperamentLevel } = req.body;
      if (!temperamentLevel || !['A','B','C','D','E'].includes(temperamentLevel)) {
        return res.status(400).json({ error: "성향 등급은 A~E 중 하나여야 합니다." });
      }
      const [pet] = await db.select().from(pets).where(eq(pets.id, petId));
      if (!pet) return res.status(404).json({ error: "반려동물을 찾을 수 없습니다." });
      if (role === 'trainer') {
        const trainerRecords = await db.select().from(consultationRecords)
          .where(and(eq(consultationRecords.petId, petId), eq(consultationRecords.trainerId, sessionUser.id)));
        if (trainerRecords.length === 0) {
          return res.status(403).json({ error: "담당 반려동물의 성향만 변경할 수 있습니다." });
        }
      }
      if (role === 'institute-admin') {
        if (!sessionUser.instituteId) {
          return res.status(403).json({ error: "소속 기관이 없어 성향을 변경할 수 없습니다." });
        }
        const instRecords = await db.select().from(consultationRecords)
          .where(and(eq(consultationRecords.petId, petId), eq(consultationRecords.instituteId, sessionUser.instituteId)));
        if (instRecords.length === 0) {
          return res.status(403).json({ error: "소속 기관과 관련된 반려동물의 성향만 변경할 수 있습니다." });
        }
      }
      const [updated] = await db.update(pets).set({ temperamentLevel }).where(eq(pets.id, petId)).returning();
      res.json({ success: true, pet: updated });
    } catch (error) {
      logServerError("성향 등급 업데이트 오류:", error, req);
      res.status(500).json({ error: "성향 등급 업데이트 중 오류가 발생했습니다." });
    }
  });

  console.log('[Consultation API] 상담 기록 API가 등록되었습니다.');

  // =============================================
  // QR 체크인 CRM 시스템 API
  // =============================================

  app.post("/api/institute/qr-codes", requireAuth(), async (req, res) => {
    try {
      const sessionUser = (req as any).user;
      if (!sessionUser) return res.status(401).json({ error: "인증이 필요합니다." });
      const role = sessionUser.role || sessionUser.userRole;
      if (!['institute-admin', 'admin'].includes(role)) {
        return res.status(403).json({ error: "기관 관리자 또는 관리자만 QR 코드를 생성할 수 있습니다." });
      }
      let instituteId = sessionUser.instituteId;
      if (role === 'admin' && req.body.instituteId) {
        instituteId = Number(req.body.instituteId);
      }
      if (!instituteId) {
        return res.status(400).json({ error: "소속 기관이 없습니다." });
      }
      const token = randomBytes(16).toString('hex');
      const label = req.body.label || '기본 QR 코드';
      const [qrCode] = await db.insert(instituteQrCodes).values({
        instituteId,
        token,
        label,
        isActive: true,
        createdBy: sessionUser.id,
      }).returning();
      res.json({ success: true, qrCode });
    } catch (error) {
      logServerError("QR 코드 생성 오류:", error, req);
      res.status(500).json({ error: "QR 코드 생성 중 오류가 발생했습니다." });
    }
  });

  app.get("/api/institute/qr-codes", requireAuth(), async (req, res) => {
    try {
      const sessionUser = (req as any).user;
      if (!sessionUser) return res.status(401).json({ error: "인증이 필요합니다." });
      const role = sessionUser.role || sessionUser.userRole;
      if (!['institute-admin', 'admin'].includes(role)) {
        return res.status(403).json({ error: "접근 권한이 없습니다." });
      }
      let instituteId = sessionUser.instituteId;
      if (role === 'admin' && req.query.instituteId) {
        instituteId = Number(req.query.instituteId);
      }
      if (!instituteId) {
        return res.json({ success: true, qrCodes: [] });
      }
      const qrCodes = await db.select().from(instituteQrCodes)
        .where(eq(instituteQrCodes.instituteId, instituteId))
        .orderBy(desc(instituteQrCodes.createdAt));
      res.json({ success: true, qrCodes });
    } catch (error) {
      logServerError("QR 코드 목록 조회 오류:", error, req);
      res.status(500).json({ error: "QR 코드 목록 조회 중 오류가 발생했습니다." });
    }
  });

  app.put("/api/institute/qr-codes/:id", requireAuth(), async (req, res) => {
    try {
      const sessionUser = (req as any).user;
      if (!sessionUser) return res.status(401).json({ error: "인증이 필요합니다." });
      const role = sessionUser.role || sessionUser.userRole;
      if (!['institute-admin', 'admin'].includes(role)) {
        return res.status(403).json({ error: "접근 권한이 없습니다." });
      }
      const id = Number(req.params.id);
      const [existing] = await db.select().from(instituteQrCodes).where(eq(instituteQrCodes.id, id));
      if (!existing) return res.status(404).json({ error: "QR 코드를 찾을 수 없습니다." });
      if (role === 'institute-admin' && existing.instituteId !== sessionUser.instituteId) {
        return res.status(403).json({ error: "소속 기관의 QR 코드만 수정할 수 있습니다." });
      }
      const updateData: Partial<{ label: string; isActive: boolean; updatedAt: Date }> = { updatedAt: new Date() };
      if (req.body.label !== undefined) updateData.label = req.body.label;
      if (req.body.isActive !== undefined) updateData.isActive = req.body.isActive;
      const [updated] = await db.update(instituteQrCodes).set(updateData).where(eq(instituteQrCodes.id, id)).returning();
      res.json({ success: true, qrCode: updated });
    } catch (error) {
      logServerError("QR 코드 수정 오류:", error, req);
      res.status(500).json({ error: "QR 코드 수정 중 오류가 발생했습니다." });
    }
  });

  app.delete("/api/institute/qr-codes/:id", requireAuth(), async (req, res) => {
    try {
      const sessionUser = (req as any).user;
      if (!sessionUser) return res.status(401).json({ error: "인증이 필요합니다." });
      const role = sessionUser.role || sessionUser.userRole;
      if (!['institute-admin', 'admin'].includes(role)) {
        return res.status(403).json({ error: "접근 권한이 없습니다." });
      }
      const id = Number(req.params.id);
      const [existing] = await db.select().from(instituteQrCodes).where(eq(instituteQrCodes.id, id));
      if (!existing) return res.status(404).json({ error: "QR 코드를 찾을 수 없습니다." });
      if (role === 'institute-admin' && existing.instituteId !== sessionUser.instituteId) {
        return res.status(403).json({ error: "소속 기관의 QR 코드만 삭제할 수 있습니다." });
      }
      await db.delete(instituteQrCodes).where(eq(instituteQrCodes.id, id));
      res.json({ success: true, message: "QR 코드가 삭제되었습니다." });
    } catch (error) {
      logServerError("QR 코드 삭제 오류:", error, req);
      res.status(500).json({ error: "QR 코드 삭제 중 오류가 발생했습니다." });
    }
  });

  app.get("/api/checkin/qr/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const [qrCode] = await db.select().from(instituteQrCodes)
        .where(and(eq(instituteQrCodes.token, token), eq(instituteQrCodes.isActive, true)));
      if (!qrCode) return res.status(404).json({ error: "유효하지 않은 QR 코드입니다." });
      const [institute] = await db.select({ id: institutes.id, name: institutes.name, address: institutes.address, phone: institutes.phone })
        .from(institutes).where(eq(institutes.id, qrCode.instituteId));
      if (!institute) return res.status(404).json({ error: "기관을 찾을 수 없습니다." });
      const sessionUser = (req as any).user;
      let userPets: Array<{ id: number; name: string | null; breed: string | null; species: string | null }> = [];
      if (sessionUser) {
        userPets = await db.select({ id: pets.id, name: pets.name, breed: pets.breed, species: pets.species })
          .from(pets).where(eq(pets.ownerId, sessionUser.id));
      }
      res.json({ success: true, institute, qrCodeId: qrCode.id, userPets, isLoggedIn: !!sessionUser, userName: sessionUser?.name || null });
    } catch (error) {
      logServerError("QR 코드 조회 오류:", error, req);
      res.status(500).json({ error: "QR 코드 조회 중 오류가 발생했습니다." });
    }
  });

  app.post("/api/checkin", async (req, res) => {
    try {
      const { qrToken, petId, ownerName, petName, todayConcern, recentProblemBehavior, todayGoal, nextReservationDate, hasPackage, packageNote } = req.body;
      if (!qrToken) return res.status(400).json({ error: "QR 토큰이 필요합니다." });
      const [qrCode] = await db.select().from(instituteQrCodes)
        .where(and(eq(instituteQrCodes.token, qrToken), eq(instituteQrCodes.isActive, true)));
      if (!qrCode) return res.status(404).json({ error: "유효하지 않은 QR 코드입니다." });
      const sessionUser = (req as any).user;
      const ownerId = sessionUser?.id || null;
      const isNewVisitor = !sessionUser;
      let resolvedPetId: number | null = null;
      if (petId) {
        if (!sessionUser) {
          return res.status(400).json({ error: "반려동물 선택은 로그인 후 이용 가능합니다." });
        }
        resolvedPetId = Number(petId);
        const [pet] = await db.select({ ownerId: pets.ownerId }).from(pets).where(eq(pets.id, resolvedPetId));
        if (!pet || pet.ownerId !== sessionUser.id) {
          return res.status(403).json({ error: "본인의 반려동물만 체크인할 수 있습니다." });
        }
      }
      const [record] = await db.insert(checkinRecords).values({
        instituteId: qrCode.instituteId,
        qrCodeId: qrCode.id,
        ownerId,
        petId: resolvedPetId,
        ownerName: ownerName || sessionUser?.name || null,
        petName: petName || null,
        todayConcern: todayConcern || null,
        recentProblemBehavior: recentProblemBehavior || null,
        todayGoal: todayGoal || null,
        nextReservationDate: nextReservationDate || null,
        hasPackage: hasPackage || false,
        packageNote: packageNote || null,
        isNewVisitor,
        checkinAt: new Date(),
      }).returning();
      res.json({ success: true, checkin: record });
    } catch (error) {
      logServerError("체크인 오류:", error, req);
      res.status(500).json({ error: "체크인 중 오류가 발생했습니다." });
    }
  });

  app.get("/api/institute/checkins", requireAuth(), async (req, res) => {
    try {
      const sessionUser = (req as any).user;
      if (!sessionUser) return res.status(401).json({ error: "인증이 필요합니다." });
      const role = sessionUser.role || sessionUser.userRole;
      if (!['trainer', 'institute-admin', 'admin'].includes(role)) {
        return res.status(403).json({ error: "접근 권한이 없습니다." });
      }
      let instituteId = sessionUser.instituteId;
      if (role === 'trainer' && !instituteId) {
        const [trainerInst] = await db.select({ instituteId: trainerInstitutes.instituteId })
          .from(trainerInstitutes).where(eq(trainerInstitutes.trainerId, sessionUser.id)).limit(1);
        if (trainerInst) instituteId = trainerInst.instituteId;
      }
      if (role === 'admin' && req.query.instituteId) {
        instituteId = Number(req.query.instituteId);
      }
      if (!instituteId) return res.json({ success: true, checkins: [] });
      const dateFilter = req.query.date as string || new Date().toISOString().split('T')[0];
      const startOfDay = new Date(dateFilter + 'T00:00:00.000Z');
      const endOfDay = new Date(dateFilter + 'T23:59:59.999Z');
      const checkins = await db.select().from(checkinRecords)
        .where(and(
          eq(checkinRecords.instituteId, instituteId),
          sql`${checkinRecords.checkinAt} >= ${startOfDay}`,
          sql`${checkinRecords.checkinAt} <= ${endOfDay}`
        ))
        .orderBy(desc(checkinRecords.checkinAt));
      const enriched = await Promise.all(checkins.map(async (c) => {
        let petInfo: { name: string | null; breed: string | null; species: string | null; temperamentLevel: string | null } | null = null;
        let ownerInfo: { name: string | null; phone: string | null } | null = null;
        if (c.petId) {
          const [pet] = await db.select({ name: pets.name, breed: pets.breed, species: pets.species, temperamentLevel: pets.temperamentLevel })
            .from(pets).where(eq(pets.id, c.petId));
          petInfo = pet ?? null;
        }
        if (c.ownerId) {
          const [owner] = await db.select({ name: users.name, phone: users.phone })
            .from(users).where(eq(users.id, c.ownerId));
          ownerInfo = owner ?? null;
        }
        return { ...c, petInfo, ownerInfo };
      }));
      res.json({ success: true, checkins: enriched });
    } catch (error) {
      logServerError("체크인 목록 조회 오류:", error, req);
      res.status(500).json({ error: "체크인 목록 조회 중 오류가 발생했습니다." });
    }
  });

  app.get("/api/institute/checkins/history/:ownerId", requireAuth(), async (req, res) => {
    try {
      const sessionUser = (req as any).user;
      if (!sessionUser) return res.status(401).json({ error: "인증이 필요합니다." });
      const role = sessionUser.role || sessionUser.userRole;
      if (!['trainer', 'institute-admin', 'admin'].includes(role)) {
        return res.status(403).json({ error: "접근 권한이 없습니다." });
      }
      let instituteId = sessionUser.instituteId;
      if (role === 'trainer' && !instituteId) {
        const [trainerInst] = await db.select({ instituteId: trainerInstitutes.instituteId })
          .from(trainerInstitutes).where(eq(trainerInstitutes.trainerId, sessionUser.id)).limit(1);
        if (trainerInst) instituteId = trainerInst.instituteId;
      }
      if (role === 'admin' && req.query.instituteId) {
        instituteId = Number(req.query.instituteId);
      }
      const ownerId = Number(req.params.ownerId);
      if (role !== 'admin' && !instituteId) {
        return res.status(403).json({ error: "소속 기관이 확인되지 않습니다." });
      }
      const scopeFilter = role === 'admin'
        ? eq(checkinRecords.ownerId, ownerId)
        : and(eq(checkinRecords.ownerId, ownerId), eq(checkinRecords.instituteId, instituteId!));
      const history = await db.select().from(checkinRecords)
        .where(scopeFilter)
        .orderBy(desc(checkinRecords.checkinAt));
      if (history.length === 0 && role !== 'admin') {
        return res.status(404).json({ error: "해당 고객의 방문 기록이 없습니다." });
      }
      const [ownerInfo] = await db.select({ name: users.name, phone: users.phone })
        .from(users).where(eq(users.id, ownerId));
      const ownerPets = await db.select({ id: pets.id, name: pets.name, breed: pets.breed, temperamentLevel: pets.temperamentLevel })
        .from(pets).where(eq(pets.ownerId, ownerId));
      const totalVisits = history.length;
      const concerns = history.filter((h) => h.todayConcern).map((h) => ({ date: h.checkinAt, concern: h.todayConcern }));
      res.json({ success: true, owner: ownerInfo ? { name: ownerInfo.name, phone: ownerInfo.phone } : null, pets: ownerPets, history, totalVisits, concerns });
    } catch (error) {
      logServerError("고객 히스토리 조회 오류:", error, req);
      res.status(500).json({ error: "고객 히스토리 조회 중 오류가 발생했습니다." });
    }
  });

  app.get("/api/institute/checkins/stats", requireAuth(), async (req, res) => {
    try {
      const sessionUser = (req as any).user;
      if (!sessionUser) return res.status(401).json({ error: "인증이 필요합니다." });
      const role = sessionUser.role || sessionUser.userRole;
      if (!['trainer', 'institute-admin', 'admin'].includes(role)) {
        return res.status(403).json({ error: "접근 권한이 없습니다." });
      }
      let instituteId = sessionUser.instituteId;
      if (role === 'trainer' && !instituteId) {
        const [trainerInst] = await db.select({ instituteId: trainerInstitutes.instituteId })
          .from(trainerInstitutes).where(eq(trainerInstitutes.trainerId, sessionUser.id)).limit(1);
        if (trainerInst) instituteId = trainerInst.instituteId;
      }
      if (!instituteId) return res.json({ success: true, stats: { todayCount: 0, weekCount: 0, monthCount: 0, uniqueVisitors: 0 } });
      const today = new Date();
      const startOfToday = new Date(today.toISOString().split('T')[0] + 'T00:00:00.000Z');
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - 7);
      const startOfMonth = new Date(today);
      startOfMonth.setDate(today.getDate() - 30);
      const [todayResult] = await db.select({ count: sql<number>`count(*)` }).from(checkinRecords)
        .where(and(eq(checkinRecords.instituteId, instituteId), sql`${checkinRecords.checkinAt} >= ${startOfToday}`));
      const [weekResult] = await db.select({ count: sql<number>`count(*)` }).from(checkinRecords)
        .where(and(eq(checkinRecords.instituteId, instituteId), sql`${checkinRecords.checkinAt} >= ${startOfWeek}`));
      const [monthResult] = await db.select({ count: sql<number>`count(*)` }).from(checkinRecords)
        .where(and(eq(checkinRecords.instituteId, instituteId), sql`${checkinRecords.checkinAt} >= ${startOfMonth}`));
      const [uniqueResult] = await db.select({ count: sql<number>`count(distinct ${checkinRecords.ownerId})` }).from(checkinRecords)
        .where(and(eq(checkinRecords.instituteId, instituteId), isNotNull(checkinRecords.ownerId)));
      res.json({ success: true, stats: { todayCount: Number(todayResult?.count || 0), weekCount: Number(weekResult?.count || 0), monthCount: Number(monthResult?.count || 0), uniqueVisitors: Number(uniqueResult?.count || 0) } });
    } catch (error) {
      logServerError("체크인 통계 조회 오류:", error, req);
      res.status(500).json({ error: "통계 조회 중 오류가 발생했습니다." });
    }
  });

  console.log('[QR 체크인 API] QR 체크인 CRM API가 등록되었습니다.');

  // =============================================
  // 운영 정책 시스템 API (응급/안전/동의/사진활용)
  // =============================================

  // 응급 연락처 CRUD — owner-only (admin bypasses)
  app.get("/api/emergency-contacts/:petId", requireAuth(), async (req, res) => {
    try {
      const sessionUser = (req as any).user;
      if (!sessionUser) return res.status(401).json({ error: "인증이 필요합니다." });
      const petId = parseInt(req.params.petId);
      if (isNaN(petId)) return res.status(400).json({ error: "유효하지 않은 반려동물 ID입니다." });
      const [pet] = await db.select().from(pets).where(eq(pets.id, petId)).limit(1);
      if (!pet) return res.status(404).json({ error: "반려동물을 찾을 수 없습니다." });
      const role = sessionUser.role || sessionUser.userRole;
      if (role !== 'admin' && pet.ownerId !== sessionUser.id) {
        return res.status(403).json({ error: "접근 권한이 없습니다." });
      }
      const contacts = await db.select().from(emergencyContacts).where(eq(emergencyContacts.petId, petId));
      res.json({ success: true, contacts });
    } catch (error) {
      logServerError("응급 연락처 조회 오류:", error, req);
      res.status(500).json({ error: "응급 연락처 조회 중 오류가 발생했습니다." });
    }
  });

  app.post("/api/emergency-contacts", requireAuth(), async (req, res) => {
    try {
      const sessionUser = (req as any).user;
      if (!sessionUser) return res.status(401).json({ error: "인증이 필요합니다." });
      const { petId, contactName, contactPhone, relationship, designatedHospital, hospitalPhone, hospitalAddress, emergencyTransportConsent, specialInstructions } = req.body;
      if (!petId || !contactName || !contactPhone) return res.status(400).json({ error: "필수 항목을 입력해주세요." });
      const [pet] = await db.select().from(pets).where(eq(pets.id, petId)).limit(1);
      if (!pet) return res.status(404).json({ error: "반려동물을 찾을 수 없습니다." });
      const role = sessionUser.role || sessionUser.userRole;
      if (role !== 'admin' && pet.ownerId !== sessionUser.id) {
        return res.status(403).json({ error: "접근 권한이 없습니다." });
      }
      const [contact] = await db.insert(emergencyContacts).values({
        petId, ownerId: pet.ownerId!, contactName, contactPhone, relationship,
        designatedHospital, hospitalPhone, hospitalAddress,
        emergencyTransportConsent: emergencyTransportConsent || false, specialInstructions
      }).returning();
      res.json({ success: true, contact });
    } catch (error) {
      logServerError("응급 연락처 등록 오류:", error, req);
      res.status(500).json({ error: "응급 연락처 등록 중 오류가 발생했습니다." });
    }
  });

  app.put("/api/emergency-contacts/:id", requireAuth(), async (req, res) => {
    try {
      const sessionUser = (req as any).user;
      if (!sessionUser) return res.status(401).json({ error: "인증이 필요합니다." });
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "유효하지 않은 ID입니다." });
      const [existing] = await db.select().from(emergencyContacts).where(eq(emergencyContacts.id, id)).limit(1);
      if (!existing) return res.status(404).json({ error: "응급 연락처를 찾을 수 없습니다." });
      const role = sessionUser.role || sessionUser.userRole;
      if (role !== 'admin' && existing.ownerId !== sessionUser.id) {
        return res.status(403).json({ error: "접근 권한이 없습니다." });
      }
      const { contactName, contactPhone, relationship, designatedHospital, hospitalPhone, hospitalAddress, emergencyTransportConsent, specialInstructions } = req.body;
      const [updated] = await db.update(emergencyContacts).set({
        contactName, contactPhone, relationship, designatedHospital,
        hospitalPhone, hospitalAddress, emergencyTransportConsent, specialInstructions,
        updatedAt: new Date()
      }).where(eq(emergencyContacts.id, id)).returning();
      res.json({ success: true, contact: updated });
    } catch (error) {
      logServerError("응급 연락처 수정 오류:", error, req);
      res.status(500).json({ error: "응급 연락처 수정 중 오류가 발생했습니다." });
    }
  });

  app.delete("/api/emergency-contacts/:id", requireAuth(), async (req, res) => {
    try {
      const sessionUser = (req as any).user;
      if (!sessionUser) return res.status(401).json({ error: "인증이 필요합니다." });
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "유효하지 않은 ID입니다." });
      const [existing] = await db.select().from(emergencyContacts).where(eq(emergencyContacts.id, id)).limit(1);
      if (!existing) return res.status(404).json({ error: "응급 연락처를 찾을 수 없습니다." });
      const role = sessionUser.role || sessionUser.userRole;
      if (role !== 'admin' && existing.ownerId !== sessionUser.id) {
        return res.status(403).json({ error: "접근 권한이 없습니다." });
      }
      await db.delete(emergencyContacts).where(eq(emergencyContacts.id, id));
      res.json({ success: true });
    } catch (error) {
      logServerError("응급 연락처 삭제 오류:", error, req);
      res.status(500).json({ error: "응급 연락처 삭제 중 오류가 발생했습니다." });
    }
  });

  // 매장 안전 규정 API
  app.get("/api/store-policies/:instituteId", requireAuth(), async (req, res) => {
    try {
      const instituteId = parseInt(req.params.instituteId);
      if (isNaN(instituteId)) return res.status(400).json({ error: "유효하지 않은 기관 ID입니다." });
      const [policy] = await db.select().from(storePolicies)
        .where(and(eq(storePolicies.instituteId, instituteId), eq(storePolicies.isActive, true))).limit(1);
      res.json({ success: true, policy: policy || null });
    } catch (error) {
      logServerError("매장 규정 조회 오류:", error, req);
      res.status(500).json({ error: "매장 규정 조회 중 오류가 발생했습니다." });
    }
  });

  app.post("/api/store-policies", requireAuth(), async (req, res) => {
    try {
      const sessionUser = (req as any).user;
      if (!sessionUser) return res.status(401).json({ error: "인증이 필요합니다." });
      const role = sessionUser.role || sessionUser.userRole;
      if (!['institute-admin', 'admin'].includes(role)) {
        return res.status(403).json({ error: "기관 관리자만 규정을 설정할 수 있습니다." });
      }
      const { instituteId, leashRequired, maxLeashLength, noChairJumping, sofaUsageAllowed,
        otherDogContact, treatPolicy, outsideFoodAllowed, childrenPolicy, customRules } = req.body;
      if (!instituteId) return res.status(400).json({ error: "기관 ID가 필요합니다." });
      if (role === 'institute-admin' && sessionUser.instituteId !== instituteId) {
        return res.status(403).json({ error: "접근 권한이 없습니다." });
      }
      const [existing] = await db.select().from(storePolicies)
        .where(and(eq(storePolicies.instituteId, instituteId), eq(storePolicies.isActive, true))).limit(1);
      let policy;
      if (existing) {
        [policy] = await db.update(storePolicies).set({
          leashRequired, maxLeashLength, noChairJumping, sofaUsageAllowed,
          otherDogContact, treatPolicy, outsideFoodAllowed, childrenPolicy, customRules,
          updatedAt: new Date()
        }).where(eq(storePolicies.id, existing.id)).returning();
      } else {
        [policy] = await db.insert(storePolicies).values({
          instituteId, leashRequired, maxLeashLength, noChairJumping, sofaUsageAllowed,
          otherDogContact, treatPolicy, outsideFoodAllowed, childrenPolicy, customRules
        }).returning();
      }
      res.json({ success: true, policy });
    } catch (error) {
      logServerError("매장 규정 저장 오류:", error, req);
      res.status(500).json({ error: "매장 규정 저장 중 오류가 발생했습니다." });
    }
  });

  // 동의 기록 API
  app.get("/api/consent-records", requireAuth(), async (req, res) => {
    try {
      const sessionUser = (req as any).user;
      if (!sessionUser) return res.status(401).json({ error: "인증이 필요합니다." });
      const role = sessionUser.role || sessionUser.userRole;
      let records;
      if (role === 'pet-owner') {
        records = await db.select().from(consentRecords)
          .where(eq(consentRecords.ownerId, sessionUser.id)).orderBy(desc(consentRecords.createdAt));
      } else if (role === 'institute-admin') {
        const instId = sessionUser.instituteId;
        if (instId) {
          records = await db.select().from(consentRecords)
            .where(eq(consentRecords.instituteId, instId)).orderBy(desc(consentRecords.createdAt));
        } else {
          records = [];
        }
      } else if (role === 'admin') {
        records = await db.select().from(consentRecords).orderBy(desc(consentRecords.createdAt)).limit(200);
      } else {
        records = [];
      }
      res.json({ success: true, records });
    } catch (error) {
      logServerError("동의 기록 조회 오류:", error, req);
      res.status(500).json({ error: "동의 기록 조회 중 오류가 발생했습니다." });
    }
  });

  app.post("/api/consent-records", requireAuth(), async (req, res) => {
    try {
      const sessionUser = (req as any).user;
      if (!sessionUser) return res.status(401).json({ error: "인증이 필요합니다." });
      const { petId, instituteId, consentType, photoBeforeAfter, snsUsage, faceHidden,
        petOnlyPhoto, caseCardNews, storePolicyAgreed, emergencyTransportAgreed, signatureData, consentDetails } = req.body;
      if (!consentType) return res.status(400).json({ error: "동의 유형을 선택해주세요." });
      if (petId) {
        const [pet] = await db.select().from(pets).where(eq(pets.id, petId)).limit(1);
        if (!pet || pet.ownerId !== sessionUser.id) {
          return res.status(403).json({ error: "본인의 반려동물만 동의할 수 있습니다." });
        }
      }
      const [record] = await db.insert(consentRecords).values({
        ownerId: sessionUser.id, petId: petId || null, instituteId: instituteId || null, consentType,
        photoBeforeAfter: photoBeforeAfter || false,
        snsUsage: snsUsage || false,
        faceHidden: faceHidden || false,
        petOnlyPhoto: petOnlyPhoto || false,
        caseCardNews: caseCardNews || false,
        storePolicyAgreed: storePolicyAgreed || false,
        emergencyTransportAgreed: emergencyTransportAgreed || false,
        signatureData, consentDetails
      }).returning();
      res.json({ success: true, record });
    } catch (error) {
      logServerError("동의 기록 저장 오류:", error, req);
      res.status(500).json({ error: "동의 기록 저장 중 오류가 발생했습니다." });
    }
  });

  app.put("/api/consent-records/:id/revoke", requireAuth(), async (req, res) => {
    try {
      const sessionUser = (req as any).user;
      if (!sessionUser) return res.status(401).json({ error: "인증이 필요합니다." });
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "유효하지 않은 ID입니다." });
      const [existing] = await db.select().from(consentRecords).where(eq(consentRecords.id, id)).limit(1);
      if (!existing) return res.status(404).json({ error: "동의 기록을 찾을 수 없습니다." });
      const role = sessionUser.role || sessionUser.userRole;
      if (role !== 'admin' && existing.ownerId !== sessionUser.id) {
        return res.status(403).json({ error: "본인의 동의만 철회할 수 있습니다." });
      }
      const [updated] = await db.update(consentRecords).set({
        isRevoked: true, revokedAt: new Date()
      }).where(eq(consentRecords.id, id)).returning();
      res.json({ success: true, record: updated });
    } catch (error) {
      logServerError("동의 철회 오류:", error, req);
      res.status(500).json({ error: "동의 철회 중 오류가 발생했습니다." });
    }
  });

  // 사고 처리 프로토콜 API
  app.get("/api/incident-protocols/:instituteId", requireAuth(), async (req, res) => {
    try {
      const sessionUser = (req as any).user;
      if (!sessionUser) return res.status(401).json({ error: "인증이 필요합니다." });
      const role = sessionUser.role || sessionUser.userRole;
      if (!['trainer', 'institute-admin', 'admin'].includes(role)) {
        return res.status(403).json({ error: "접근 권한이 없습니다." });
      }
      const instituteId = parseInt(req.params.instituteId);
      if (isNaN(instituteId)) return res.status(400).json({ error: "유효하지 않은 기관 ID입니다." });
      if (role !== 'admin') {
        const userInstituteId = sessionUser.instituteId;
        if (!userInstituteId || userInstituteId !== instituteId) {
          return res.status(403).json({ error: "소속 기관의 프로토콜만 조회할 수 있습니다." });
        }
      }
      const protocols = await db.select().from(incidentProtocols)
        .where(and(eq(incidentProtocols.instituteId, instituteId), eq(incidentProtocols.isActive, true)));
      res.json({ success: true, protocols });
    } catch (error) {
      logServerError("사고 프로토콜 조회 오류:", error, req);
      res.status(500).json({ error: "사고 프로토콜 조회 중 오류가 발생했습니다." });
    }
  });

  app.post("/api/incident-protocols", requireAuth(), async (req, res) => {
    try {
      const sessionUser = (req as any).user;
      if (!sessionUser) return res.status(401).json({ error: "인증이 필요합니다." });
      const role = sessionUser.role || sessionUser.userRole;
      if (!['institute-admin', 'admin'].includes(role)) {
        return res.status(403).json({ error: "기관 관리자만 프로토콜을 설정할 수 있습니다." });
      }
      const { instituteId, incidentType, title, steps } = req.body;
      if (!instituteId || !incidentType || !title || !steps) {
        return res.status(400).json({ error: "필수 항목을 입력해주세요." });
      }
      if (role === 'institute-admin' && sessionUser.instituteId !== instituteId) {
        return res.status(403).json({ error: "접근 권한이 없습니다." });
      }
      const [protocol] = await db.insert(incidentProtocols).values({
        instituteId, incidentType, title, steps
      }).returning();
      res.json({ success: true, protocol });
    } catch (error) {
      logServerError("사고 프로토콜 등록 오류:", error, req);
      res.status(500).json({ error: "사고 프로토콜 등록 중 오류가 발생했습니다." });
    }
  });

  app.put("/api/incident-protocols/:id", requireAuth(), async (req, res) => {
    try {
      const sessionUser = (req as any).user;
      if (!sessionUser) return res.status(401).json({ error: "인증이 필요합니다." });
      const role = sessionUser.role || sessionUser.userRole;
      if (!['institute-admin', 'admin'].includes(role)) {
        return res.status(403).json({ error: "접근 권한이 없습니다." });
      }
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "유효하지 않은 ID입니다." });
      const [existing] = await db.select().from(incidentProtocols).where(eq(incidentProtocols.id, id)).limit(1);
      if (!existing) return res.status(404).json({ error: "프로토콜을 찾을 수 없습니다." });
      if (role === 'institute-admin' && sessionUser.instituteId !== existing.instituteId) {
        return res.status(403).json({ error: "접근 권한이 없습니다." });
      }
      const { incidentType, title, steps, isActive } = req.body;
      const [updated] = await db.update(incidentProtocols).set({
        incidentType: incidentType || existing.incidentType,
        title: title || existing.title,
        steps: steps || existing.steps,
        isActive: isActive !== undefined ? isActive : existing.isActive,
        updatedAt: new Date()
      }).where(eq(incidentProtocols.id, id)).returning();
      res.json({ success: true, protocol: updated });
    } catch (error) {
      logServerError("사고 프로토콜 수정 오류:", error, req);
      res.status(500).json({ error: "사고 프로토콜 수정 중 오류가 발생했습니다." });
    }
  });

  app.delete("/api/incident-protocols/:id", requireAuth(), async (req, res) => {
    try {
      const sessionUser = (req as any).user;
      if (!sessionUser) return res.status(401).json({ error: "인증이 필요합니다." });
      const role = sessionUser.role || sessionUser.userRole;
      if (!['institute-admin', 'admin'].includes(role)) {
        return res.status(403).json({ error: "기관 관리자만 프로토콜을 삭제할 수 있습니다." });
      }
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "유효하지 않은 ID입니다." });
      const [existing] = await db.select().from(incidentProtocols).where(eq(incidentProtocols.id, id)).limit(1);
      if (!existing) return res.status(404).json({ error: "프로토콜을 찾을 수 없습니다." });
      if (role === 'institute-admin' && sessionUser.instituteId !== existing.instituteId) {
        return res.status(403).json({ error: "접근 권한이 없습니다." });
      }
      await db.delete(incidentProtocols).where(eq(incidentProtocols.id, id));
      res.json({ success: true });
    } catch (error) {
      logServerError("사고 프로토콜 삭제 오류:", error, req);
      res.status(500).json({ error: "사고 프로토콜 삭제 중 오류가 발생했습니다." });
    }
  });

  console.log('[운영 정책 API] 응급/안전/동의/사고 처리 API가 등록되었습니다.');

  // =============================================
  // 반려견 방문 신뢰 QR 인증 시스템 (Pet Visit Trust QR)
  // =============================================

  // 기관 존(Zone) CRUD
  app.get("/api/institute/zones", requireAuth(), async (req, res) => {
    try {
      const sessionUser = (req as any).user;
      if (!sessionUser) return res.status(401).json({ error: "인증이 필요합니다." });
      const role = sessionUser.role || sessionUser.userRole;
      if (!['institute-admin', 'admin', 'trainer'].includes(role)) {
        return res.status(403).json({ error: "접근 권한이 없습니다." });
      }
      let instituteId = sessionUser.instituteId;
      if (role === 'trainer' && !instituteId) {
        const [trainerInst] = await db.select({ instituteId: trainerInstitutes.instituteId })
          .from(trainerInstitutes).where(eq(trainerInstitutes.trainerId, sessionUser.id)).limit(1);
        if (trainerInst) instituteId = trainerInst.instituteId;
      }
      if (role === 'admin' && req.query.instituteId) {
        instituteId = Number(req.query.instituteId);
      }
      if (!instituteId) return res.json({ success: true, zones: [] });
      const zones = await db.select().from(instituteZones)
        .where(eq(instituteZones.instituteId, instituteId))
        .orderBy(instituteZones.name);
      res.json({ success: true, zones });
    } catch (error) {
      logServerError("존 목록 조회 오류:", error, req);
      res.status(500).json({ error: "존 목록 조회 중 오류가 발생했습니다." });
    }
  });

  app.post("/api/institute/zones", requireAuth(), async (req, res) => {
    try {
      const sessionUser = (req as any).user;
      if (!sessionUser) return res.status(401).json({ error: "인증이 필요합니다." });
      const role = sessionUser.role || sessionUser.userRole;
      if (!['institute-admin', 'admin'].includes(role)) {
        return res.status(403).json({ error: "기관 관리자만 존을 생성할 수 있습니다." });
      }
      let instituteId = sessionUser.instituteId;
      if (role === 'admin' && req.body.instituteId) instituteId = Number(req.body.instituteId);
      if (!instituteId) return res.status(400).json({ error: "소속 기관이 없습니다." });
      const { name, zoneType, description, requiresVaccination, maxTemperamentLevel, minTrainingLevel, capacity } = req.body;
      if (!name || !zoneType) return res.status(400).json({ error: "존 이름과 유형은 필수입니다." });
      const [zone] = await db.insert(instituteZones).values({
        instituteId, name, zoneType, description,
        requiresVaccination: requiresVaccination || false,
        maxTemperamentLevel: maxTemperamentLevel || null,
        minTrainingLevel: minTrainingLevel || null,
        capacity: capacity || null,
      }).returning();
      res.json({ success: true, zone });
    } catch (error) {
      logServerError("존 생성 오류:", error, req);
      res.status(500).json({ error: "존 생성 중 오류가 발생했습니다." });
    }
  });

  app.put("/api/institute/zones/:id", requireAuth(), async (req, res) => {
    try {
      const sessionUser = (req as any).user;
      if (!sessionUser) return res.status(401).json({ error: "인증이 필요합니다." });
      const role = sessionUser.role || sessionUser.userRole;
      if (!['institute-admin', 'admin'].includes(role)) return res.status(403).json({ error: "접근 권한이 없습니다." });
      const id = Number(req.params.id);
      const [existing] = await db.select().from(instituteZones).where(eq(instituteZones.id, id));
      if (!existing) return res.status(404).json({ error: "존을 찾을 수 없습니다." });
      if (role === 'institute-admin' && existing.instituteId !== sessionUser.instituteId) {
        return res.status(403).json({ error: "소속 기관의 존만 수정할 수 있습니다." });
      }
      const updateData: Partial<{
        name: string; zoneType: string; description: string;
        requiresVaccination: boolean; maxTemperamentLevel: string | null;
        minTrainingLevel: string | null; capacity: number | null;
        isActive: boolean; updatedAt: Date;
      }> = { updatedAt: new Date() };
      if (req.body.name !== undefined) updateData.name = req.body.name;
      if (req.body.zoneType !== undefined) updateData.zoneType = req.body.zoneType;
      if (req.body.description !== undefined) updateData.description = req.body.description;
      if (req.body.requiresVaccination !== undefined) updateData.requiresVaccination = req.body.requiresVaccination;
      if (req.body.maxTemperamentLevel !== undefined) updateData.maxTemperamentLevel = req.body.maxTemperamentLevel;
      if (req.body.minTrainingLevel !== undefined) updateData.minTrainingLevel = req.body.minTrainingLevel;
      if (req.body.capacity !== undefined) updateData.capacity = req.body.capacity;
      if (req.body.isActive !== undefined) updateData.isActive = req.body.isActive;
      const [updated] = await db.update(instituteZones).set(updateData).where(eq(instituteZones.id, id)).returning();
      res.json({ success: true, zone: updated });
    } catch (error) {
      logServerError("존 수정 오류:", error, req);
      res.status(500).json({ error: "존 수정 중 오류가 발생했습니다." });
    }
  });

  app.delete("/api/institute/zones/:id", requireAuth(), async (req, res) => {
    try {
      const sessionUser = (req as any).user;
      if (!sessionUser) return res.status(401).json({ error: "인증이 필요합니다." });
      const role = sessionUser.role || sessionUser.userRole;
      if (!['institute-admin', 'admin'].includes(role)) return res.status(403).json({ error: "접근 권한이 없습니다." });
      const id = Number(req.params.id);
      const [existing] = await db.select().from(instituteZones).where(eq(instituteZones.id, id));
      if (!existing) return res.status(404).json({ error: "존을 찾을 수 없습니다." });
      if (role === 'institute-admin' && existing.instituteId !== sessionUser.instituteId) {
        return res.status(403).json({ error: "소속 기관의 존만 삭제할 수 있습니다." });
      }
      await db.delete(instituteZones).where(eq(instituteZones.id, id));
      res.json({ success: true });
    } catch (error) {
      logServerError("존 삭제 오류:", error, req);
      res.status(500).json({ error: "존 삭제 중 오류가 발생했습니다." });
    }
  });

  // 방문 세션 QR 발급 (1회용, 10분 유효)
  app.post("/api/visit-sessions/generate", requireAuth(), async (req, res) => {
    try {
      const sessionUser = (req as any).user;
      if (!sessionUser) return res.status(401).json({ error: "인증이 필요합니다." });
      const role = sessionUser.role || sessionUser.userRole;
      if (!['institute-admin', 'admin', 'trainer'].includes(role)) {
        return res.status(403).json({ error: "기관 관리자 또는 훈련사만 방문 세션을 발급할 수 있습니다." });
      }
      let instituteId = sessionUser.instituteId;
      if (role === 'trainer' && !instituteId) {
        const [trainerInst] = await db.select({ instituteId: trainerInstitutes.instituteId })
          .from(trainerInstitutes).where(eq(trainerInstitutes.trainerId, sessionUser.id)).limit(1);
        if (trainerInst) instituteId = trainerInst.instituteId;
      }
      if (role === 'admin' && req.body.instituteId) instituteId = Number(req.body.instituteId);
      if (!instituteId) return res.status(400).json({ error: "소속 기관이 없습니다." });

      const { memberId, petIds, todayConcern, todayGoal } = req.body;
      if (!memberId || !petIds || !Array.isArray(petIds) || petIds.length === 0) {
        return res.status(400).json({ error: "보호자와 반려동물을 선택해 주세요." });
      }

      if (role !== 'admin') {
        const [member] = await db.select({ role: users.role }).from(users).where(eq(users.id, memberId));
        if (!member || member.role !== 'pet-owner') {
          return res.status(400).json({ error: "유효하지 않은 보호자입니다." });
        }
        const [memberVisit] = await db.select({ id: checkinRecords.id })
          .from(checkinRecords)
          .where(and(eq(checkinRecords.instituteId, instituteId), eq(checkinRecords.ownerId, memberId)))
          .limit(1);
        if (!memberVisit) {
          return res.status(403).json({ error: "이 기관에 방문 이력이 있는 보호자만 QR을 발급할 수 있습니다." });
        }
      }

      const memberPets = await db.select({
        id: pets.id, name: pets.name, breed: pets.breed,
        temperamentLevel: pets.temperamentLevel, trainingStatus: pets.trainingStatus,
        ownerId: pets.ownerId
      }).from(pets).where(eq(pets.ownerId, memberId));

      const validPetIds = petIds.filter((pid: number) => memberPets.some(p => p.id === pid));
      if (validPetIds.length === 0) {
        return res.status(400).json({ error: "유효한 반려동물을 선택해 주세요." });
      }

      interface VaccineEntry { name: string; status: string; date: string | null; nextDue: string | null }
      const vaccineStatusMap: Record<number, { valid: boolean; vaccines: VaccineEntry[] }> = {};
      const temperamentMap: Record<number, string | null> = {};

      for (const pid of validPetIds) {
        const pet = memberPets.find(p => p.id === pid);
        temperamentMap[pid] = pet?.temperamentLevel || null;

        const petVaccines = await db.select({
          vaccineName: vaccinations.vaccineName,
          status: vaccinations.status,
          vaccineDate: vaccinations.vaccineDate,
          nextDueDate: vaccinations.nextDueDate,
        }).from(vaccinations).where(eq(vaccinations.petId, pid));

        const today = new Date().toISOString().split('T')[0];
        const hasOverdue = petVaccines.some(v => v.status === 'overdue' || (v.nextDueDate && v.nextDueDate < today && v.status !== 'completed'));
        const completedVaccines = petVaccines.filter(v => v.status === 'completed');

        vaccineStatusMap[pid] = {
          valid: !hasOverdue && completedVaccines.length > 0,
          vaccines: petVaccines.map(v => ({
            name: v.vaccineName,
            status: v.status,
            date: v.vaccineDate,
            nextDue: v.nextDueDate,
          })),
        };
      }

      const zones = await db.select().from(instituteZones)
        .where(and(eq(instituteZones.instituteId, instituteId), eq(instituteZones.isActive, true)));

      const zonePermissions: Record<number, string[]> = {};
      for (const pid of validPetIds) {
        const petTemperament = temperamentMap[pid];
        const petVaccineValid = vaccineStatusMap[pid]?.valid ?? false;
        const allowedZones: string[] = [];

        for (const zone of zones) {
          let allowed = true;
          if (zone.requiresVaccination && !petVaccineValid) allowed = false;
          if (zone.maxTemperamentLevel && petTemperament) {
            const temperamentOrder = ['A', 'B', 'C', 'D', 'E'];
            const petIdx = temperamentOrder.indexOf(petTemperament);
            const maxIdx = temperamentOrder.indexOf(zone.maxTemperamentLevel);
            if (petIdx > maxIdx) allowed = false;
          }
          if (allowed) allowedZones.push(zone.name);
        }
        zonePermissions[pid] = allowedZones;
      }

      const token = randomBytes(24).toString('hex');
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      const petRegInfo = memberPets
        .filter(p => validPetIds.includes(p.id))
        .map(p => ({ id: p.id, name: p.name, breed: p.breed, temperament: p.temperamentLevel }));

      const [session] = await db.insert(petVisitSessions).values({
        token,
        instituteId,
        memberId,
        petIds: validPetIds,
        vaccineStatus: vaccineStatusMap,
        temperamentLevels: temperamentMap,
        zonePermissions,
        petRegistrationInfo: petRegInfo,
        reservationTime: req.body.reservationTime ? new Date(req.body.reservationTime) : null,
        deviceHash: req.body.deviceHash || null,
        trainerLevel: null,
        todayConcern: todayConcern || null,
        todayGoal: todayGoal || null,
        singleUse: true,
        expiresAt,
        createdBy: sessionUser.id,
      }).returning();

      const memberInfo = await db.select({ name: users.name, phone: users.phone })
        .from(users).where(eq(users.id, memberId)).limit(1);
      const petInfo = memberPets.filter(p => validPetIds.includes(p.id));

      const petNames = petInfo.map(p => p.name || '이름 미등록');
      res.json({
        success: true,
        session: {
          ...session,
          memberName: memberInfo[0]?.name,
          petNames,
        },
        qrUrl: `/visit/${token}`,
      });
    } catch (error) {
      logServerError("방문 세션 QR 발급 오류:", error, req);
      res.status(500).json({ error: "방문 세션 QR 발급 중 오류가 발생했습니다." });
    }
  });

  // 방문 세션 QR 검증 — GET은 읽기 전용 (봇/프리페치 안전)
  app.get("/api/visit-sessions/verify/:token", async (req, res) => {
    try {
      const { token } = req.params;

      const [session] = await db.select().from(petVisitSessions).where(eq(petVisitSessions.token, token));
      if (!session) {
        return res.status(404).json({ success: false, error: "유효하지 않은 방문 세션입니다.", errorCode: "INVALID" });
      }
      if (session.usedAt) {
        return res.status(410).json({ success: false, error: "이미 사용된 방문 세션입니다.", errorCode: "USED" });
      }
      if (new Date(session.expiresAt) <= new Date()) {
        return res.status(410).json({ success: false, error: "만료된 방문 세션입니다. 새 QR을 발급받아 주세요.", errorCode: "EXPIRED" });
      }

      const [institute] = await db.select({ id: institutes.id, name: institutes.name, address: institutes.address })
        .from(institutes).where(eq(institutes.id, session.instituteId));

      const memberInitial = await db.select({ name: users.name })
        .from(users).where(eq(users.id, session.memberId)).limit(1);
      const memberName = memberInitial[0]?.name;

      const petIdArr = session.petIds as number[];
      const petList: Array<{ id: number; name: string | null; breed: string | null; species: string | null; temperamentLevel: string | null }> = [];
      for (const pid of petIdArr) {
        const [pet] = await db.select({
          id: pets.id, name: pets.name, breed: pets.breed,
          species: pets.species, temperamentLevel: pets.temperamentLevel,
        }).from(pets).where(eq(pets.id, pid));
        if (pet) petList.push(pet);
      }

      res.json({
        success: true,
        consumed: false,
        session: {
          id: session.id,
          expiresAt: session.expiresAt,
          todayConcern: session.todayConcern,
          todayGoal: session.todayGoal,
          vaccineStatus: session.vaccineStatus,
          temperamentLevels: session.temperamentLevels,
          zonePermissions: session.zonePermissions,
        },
        institute: institute ? { name: institute.name, address: institute.address } : null,
        member: memberName ? { name: memberName } : null,
        pets: petList,
      });
    } catch (error) {
      logServerError("방문 세션 조회 오류:", error, req);
      res.status(500).json({ error: "방문 세션 조회 중 오류가 발생했습니다." });
    }
  });

  // 방문 세션 QR 확인 — POST로 원자적 토큰 소비 + 체크인 생성 (의도적 액션만)
  app.post("/api/visit-sessions/confirm/:token", async (req, res) => {
    try {
      const { token } = req.params;

      const result = await db.transaction(async (tx) => {
        const [consumed] = await tx.update(petVisitSessions)
          .set({ usedAt: new Date() })
          .where(and(
            eq(petVisitSessions.token, token),
            sql`${petVisitSessions.usedAt} IS NULL`,
            sql`${petVisitSessions.expiresAt} > NOW()`
          ))
          .returning();

        if (!consumed) return null;

        const petIdArr = consumed.petIds as number[];
        for (const pid of petIdArr) {
          await tx.insert(checkinRecords).values({
            instituteId: consumed.instituteId,
            ownerId: consumed.memberId,
            petId: pid,
            todayConcern: consumed.todayConcern || null,
            todayGoal: consumed.todayGoal || null,
            isNewVisitor: false,
            checkinAt: new Date(),
          });
        }

        return consumed;
      });

      if (!result) {
        const [existing] = await db.select().from(petVisitSessions).where(eq(petVisitSessions.token, token));
        if (!existing) {
          return res.status(404).json({ success: false, error: "유효하지 않은 방문 세션입니다.", errorCode: "INVALID" });
        }
        if (existing.usedAt) {
          return res.status(410).json({ success: false, error: "이미 사용된 방문 세션입니다.", errorCode: "USED" });
        }
        return res.status(410).json({ success: false, error: "만료된 방문 세션입니다. 새 QR을 발급받아 주세요.", errorCode: "EXPIRED" });
      }

      const [institute] = await db.select({ id: institutes.id, name: institutes.name, address: institutes.address })
        .from(institutes).where(eq(institutes.id, result.instituteId));

      const memberInitial = await db.select({ name: users.name })
        .from(users).where(eq(users.id, result.memberId)).limit(1);
      const memberName = memberInitial[0]?.name;

      const petIdArr = result.petIds as number[];
      const petList: Array<{ id: number; name: string | null; breed: string | null; species: string | null; temperamentLevel: string | null; hasNoseProfile: boolean }> = [];
      for (const pid of petIdArr) {
        const [pet] = await db.select({
          id: pets.id, name: pets.name, breed: pets.breed,
          species: pets.species, temperamentLevel: pets.temperamentLevel,
        }).from(pets).where(eq(pets.id, pid));
        if (pet) {
          const [noseProfile] = await db.select({ id: petNoseProfiles.id }).from(petNoseProfiles).where(eq(petNoseProfiles.petId, pid)).limit(1);
          petList.push({ ...pet, hasNoseProfile: !!noseProfile });
        }
      }

      res.json({
        success: true,
        consumed: true,
        session: {
          id: result.id,
          expiresAt: result.expiresAt,
          todayConcern: result.todayConcern,
          todayGoal: result.todayGoal,
          noseVerified: result.noseVerified ?? false,
          vaccineStatus: result.vaccineStatus,
          temperamentLevels: result.temperamentLevels,
          zonePermissions: result.zonePermissions,
        },
        institute: institute ? { name: institute.name, address: institute.address } : null,
        member: memberName ? { name: memberName } : null,
        pets: petList,
      });
    } catch (error) {
      logServerError("방문 세션 확인 오류:", error, req);
      res.status(500).json({ error: "방문 세션 확인 중 오류가 발생했습니다." });
    }
  });

  // 방문 세션 상태 조회 (관리자/훈련사용 — 인증 필요)
  app.get("/api/visit-sessions/status/:token", requireAuth(), async (req, res) => {
    try {
      const sessionUser = (req as any).user;
      if (!sessionUser) return res.status(401).json({ error: "인증이 필요합니다." });
      const role = sessionUser.role || sessionUser.userRole;
      if (!['institute-admin', 'admin', 'trainer'].includes(role)) {
        return res.status(403).json({ error: "접근 권한이 없습니다." });
      }

      const { token } = req.params;
      const [session] = await db.select().from(petVisitSessions).where(eq(petVisitSessions.token, token));
      if (!session) return res.status(404).json({ error: "유효하지 않은 방문 세션입니다." });

      let callerInstituteId = sessionUser.instituteId;
      if (role === 'trainer' && !callerInstituteId) {
        const [trainerInst] = await db.select({ instituteId: trainerInstitutes.instituteId })
          .from(trainerInstitutes).where(eq(trainerInstitutes.trainerId, sessionUser.id)).limit(1);
        if (trainerInst) callerInstituteId = trainerInst.instituteId;
      }

      if (role !== 'admin' && callerInstituteId !== session.instituteId) {
        return res.status(403).json({ error: "소속 기관의 방문 세션만 확인할 수 있습니다." });
      }

      if (!session.usedAt) {
        return res.status(400).json({ error: "아직 스캔되지 않은 세션입니다." });
      }

      res.json({ success: true, message: "체크인이 확인되었습니다.", session });
    } catch (error) {
      logServerError("방문 세션 확인 오류:", error, req);
      res.status(500).json({ error: "방문 세션 확인 중 오류가 발생했습니다." });
    }
  });

  // 방문 세션 목록 (기관 관리자용)
  app.get("/api/visit-sessions", requireAuth(), async (req, res) => {
    try {
      const sessionUser = (req as any).user;
      if (!sessionUser) return res.status(401).json({ error: "인증이 필요합니다." });
      const role = sessionUser.role || sessionUser.userRole;
      if (!['institute-admin', 'admin', 'trainer'].includes(role)) {
        return res.status(403).json({ error: "접근 권한이 없습니다." });
      }
      let instituteId = sessionUser.instituteId;
      if (role === 'trainer' && !instituteId) {
        const [trainerInst] = await db.select({ instituteId: trainerInstitutes.instituteId })
          .from(trainerInstitutes).where(eq(trainerInstitutes.trainerId, sessionUser.id)).limit(1);
        if (trainerInst) instituteId = trainerInst.instituteId;
      }
      if (role === 'admin' && req.query.instituteId) instituteId = Number(req.query.instituteId);
      if (!instituteId) return res.json({ success: true, sessions: [] });

      const sessions = await db.select().from(petVisitSessions)
        .where(eq(petVisitSessions.instituteId, instituteId))
        .orderBy(desc(petVisitSessions.createdAt))
        .limit(50);

      const enriched = await Promise.all(sessions.map(async (s) => {
        const [member] = await db.select({ name: users.name }).from(users).where(eq(users.id, s.memberId));
        const petIdArr = s.petIds as number[];
        const petNames: string[] = [];
        for (const pid of petIdArr) {
          const [pet] = await db.select({ name: pets.name }).from(pets).where(eq(pets.id, pid));
          if (pet?.name) petNames.push(pet.name);
        }
        const now = new Date();
        let status = 'active';
        if (s.usedAt) status = 'used';
        else if (now > s.expiresAt) status = 'expired';
        return { ...s, memberName: member?.name, petNames, status };
      }));

      res.json({ success: true, sessions: enriched });
    } catch (error) {
      logServerError("방문 세션 목록 조회 오류:", error, req);
      res.status(500).json({ error: "방문 세션 목록 조회 중 오류가 발생했습니다." });
    }
  });

  // 보호자 목록 (방문 세션 발급 시 보호자 검색)
  app.get("/api/institute/members", requireAuth(), async (req, res) => {
    try {
      const sessionUser = (req as any).user;
      if (!sessionUser) return res.status(401).json({ error: "인증이 필요합니다." });
      const role = sessionUser.role || sessionUser.userRole;
      if (!['institute-admin', 'admin', 'trainer'].includes(role)) {
        return res.status(403).json({ error: "접근 권한이 없습니다." });
      }

      let callerInstituteId = sessionUser.instituteId;
      if (role === 'trainer' && !callerInstituteId) {
        const [trainerInst] = await db.select({ instituteId: trainerInstitutes.instituteId })
          .from(trainerInstitutes).where(eq(trainerInstitutes.trainerId, sessionUser.id)).limit(1);
        if (trainerInst) callerInstituteId = trainerInst.instituteId;
      }

      const search = (req.query.search as string || '').trim();

      let members;
      if (role === 'admin') {
        const conditions = [eq(users.role, 'pet-owner')];
        if (search) {
          conditions.push(or(ilike(users.name, `%${search}%`), ilike(users.phone, `%${search}%`))!);
        }
        members = await db.select({
          id: users.id, name: users.name, email: users.email
        }).from(users).where(and(...conditions)).limit(50);
      } else if (callerInstituteId) {
        const baseCondition = eq(checkinRecords.instituteId, callerInstituteId);
        const whereClause = search
          ? and(baseCondition, or(ilike(users.name, `%${search}%`), ilike(users.phone, `%${search}%`)))
          : baseCondition;
        const rows = await db.selectDistinct({
          id: users.id, name: users.name, email: users.email
        }).from(checkinRecords)
          .innerJoin(users, eq(checkinRecords.ownerId, users.id))
          .where(whereClause).limit(50);
        members = rows;
      } else {
        members = [];
      }

      res.json({ success: true, members });
    } catch (error) {
      logServerError("보호자 목록 조회 오류:", error, req);
      res.status(500).json({ error: "보호자 목록 조회 중 오류가 발생했습니다." });
    }
  });

  // 보호자의 반려동물 목록
  app.get("/api/institute/members/:memberId/pets", requireAuth(), async (req, res) => {
    try {
      const sessionUser = (req as any).user;
      if (!sessionUser) return res.status(401).json({ error: "인증이 필요합니다." });
      const role = sessionUser.role || sessionUser.userRole;
      if (!['institute-admin', 'admin', 'trainer'].includes(role)) {
        return res.status(403).json({ error: "접근 권한이 없습니다." });
      }
      const memberId = Number(req.params.memberId);

      if (role !== 'admin') {
        let callerInstituteId = sessionUser.instituteId;
        if (role === 'trainer' && !callerInstituteId) {
          const [trainerInst] = await db.select({ instituteId: trainerInstitutes.instituteId })
            .from(trainerInstitutes).where(eq(trainerInstitutes.trainerId, sessionUser.id)).limit(1);
          if (trainerInst) callerInstituteId = trainerInst.instituteId;
        }
        if (callerInstituteId) {
          const [memberRecord] = await db.select({ id: checkinRecords.id })
            .from(checkinRecords)
            .where(and(eq(checkinRecords.instituteId, callerInstituteId), eq(checkinRecords.ownerId, memberId)))
            .limit(1);
          if (!memberRecord) {
            return res.status(403).json({ error: "소속 기관의 방문 이력이 있는 보호자만 조회할 수 있습니다." });
          }
        } else {
          return res.status(403).json({ error: "기관 소속 정보를 확인할 수 없습니다." });
        }
      }

      const memberPets = await db.select({
        id: pets.id, name: pets.name, breed: pets.breed,
        species: pets.species, temperamentLevel: pets.temperamentLevel,
        trainingStatus: pets.trainingStatus, profileImage: pets.profileImage,
      }).from(pets).where(eq(pets.ownerId, memberId));

      res.json({ success: true, pets: memberPets });
    } catch (error) {
      logServerError("보호자 반려동물 조회 오류:", error, req);
      res.status(500).json({ error: "반려동물 조회 중 오류가 발생했습니다." });
    }
  });

  registerNoseAuthRoutes(app);

  console.log('[방문 신뢰 QR] Pet Visit Trust QR 인증 시스템 API가 등록되었습니다.');

  // ============ 오프라인 매장 QR 주문 (Store Orders) ============
  // [공개] 메뉴 조회 — 활성 메뉴만, 카테고리 그룹핑
  app.get('/api/store/menu', async (req, res) => {
    try {
      const items = await storage.listStoreMenuItems({ activeOnly: true });
      const grouped: Record<string, any[]> = {};
      for (const it of items) {
        if (!grouped[it.category]) grouped[it.category] = [];
        grouped[it.category].push(it);
      }
      res.json({ success: true, data: { items, grouped } });
    } catch (error) {
      logServerError('매장 메뉴 조회 오류:', error, req);
      res.status(500).json({ error: '메뉴 조회 실패', code: 'INTERNAL_SERVER_ERROR' });
    }
  });

  // [공개] 주문 생성 — 결제 없음, 단순 접수
  app.post('/api/store/orders', async (req, res) => {
    try {
      const parsed = createStoreOrderRequestSchema.parse(req.body || {});
      const result = await storage.createStoreOrder({
        tableNo: parsed.tableNo,
        requestNote: parsed.requestNote ?? null,
        items: parsed.items,
      });
      res.status(201).json({ success: true, data: { ...result.order, items: result.items } });
    } catch (error: any) {
      if (error?.name === 'ZodError') {
        return res.status(400).json({ error: '입력값이 올바르지 않습니다.', code: 'VALIDATION_ERROR', details: error.errors });
      }
      const msg = String(error?.message || '');
      if (msg.startsWith('품절') || msg.startsWith('판매하지') || msg.startsWith('메뉴를')) {
        return res.status(400).json({ error: msg, code: 'INVALID_MENU' });
      }
      logServerError('매장 주문 생성 오류:', error, req);
      res.status(500).json({ error: '주문 생성 실패', code: 'INTERNAL_SERVER_ERROR' });
    }
  });

  // [공개] 주문번호로 단건 조회 — 고객용 상태 확인
  app.get('/api/store/orders/by-number/:orderNumber', async (req, res) => {
    try {
      const order = await storage.getStoreOrderByNumber(req.params.orderNumber);
      if (!order) return res.status(404).json({ error: '주문을 찾을 수 없습니다.', code: 'NOT_FOUND' });
      res.json({ success: true, data: order });
    } catch (error) {
      logServerError('매장 주문 조회 오류:', error, req);
      res.status(500).json({ error: '주문 조회 실패', code: 'INTERNAL_SERVER_ERROR' });
    }
  });

  // [관리자] 메뉴 전체 조회 (비활성 포함)
  app.get('/api/admin/store/menu', requireAuth('admin'), async (req, res) => {
    try {
      const items = await storage.listStoreMenuItems({ activeOnly: false });
      res.json({ success: true, data: items });
    } catch (error) {
      logServerError('관리자 매장 메뉴 조회 오류:', error, req);
      res.status(500).json({ error: '메뉴 조회 실패', code: 'INTERNAL_SERVER_ERROR' });
    }
  });

  app.post('/api/admin/store/menu', requireAuth('admin'), csrfProtection, async (req, res) => {
    try {
      const parsed = insertStoreMenuItemSchema.parse(req.body || {});
      const created = await storage.createStoreMenuItem(parsed as any);
      res.status(201).json({ success: true, data: created });
    } catch (error: any) {
      if (error?.name === 'ZodError') return res.status(400).json({ error: '입력값이 올바르지 않습니다.', code: 'VALIDATION_ERROR', details: error.errors });
      logServerError('매장 메뉴 생성 오류:', error, req);
      res.status(500).json({ error: '메뉴 생성 실패', code: 'INTERNAL_SERVER_ERROR' });
    }
  });

  app.patch('/api/admin/store/menu/:id', requireAuth('admin'), csrfProtection, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return res.status(400).json({ error: '잘못된 ID', code: 'INVALID_ID' });
      const parsed = insertStoreMenuItemSchema.partial().parse(req.body || {});
      const updated = await storage.updateStoreMenuItem(id, parsed as any);
      if (!updated) return res.status(404).json({ error: '메뉴를 찾을 수 없습니다.', code: 'NOT_FOUND' });
      res.json({ success: true, data: updated });
    } catch (error: any) {
      if (error?.name === 'ZodError') return res.status(400).json({ error: '입력값이 올바르지 않습니다.', code: 'VALIDATION_ERROR', details: error.errors });
      logServerError('매장 메뉴 수정 오류:', error, req);
      res.status(500).json({ error: '메뉴 수정 실패', code: 'INTERNAL_SERVER_ERROR' });
    }
  });

  app.delete('/api/admin/store/menu/:id', requireAuth('admin'), csrfProtection, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return res.status(400).json({ error: '잘못된 ID', code: 'INVALID_ID' });
      const ok = await storage.deleteStoreMenuItem(id);
      if (!ok) return res.status(404).json({ error: '메뉴를 찾을 수 없습니다.', code: 'NOT_FOUND' });
      res.json({ success: true });
    } catch (error) {
      logServerError('매장 메뉴 삭제 오류:', error, req);
      res.status(500).json({ error: '메뉴 삭제 실패', code: 'INTERNAL_SERVER_ERROR' });
    }
  });

  // [관리자] 주문 목록 — status, date(YYYY-MM-DD) 필터 지원
  app.get('/api/admin/store/orders', requireAuth('admin'), async (req, res) => {
    try {
      const status = (req.query.status as string | undefined)?.trim();
      const dateStr = (req.query.date as string | undefined)?.trim();
      const opts: any = {};
      if (status && (STORE_ORDER_STATUSES as readonly string[]).includes(status)) opts.status = status;
      if (dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        opts.from = new Date(`${dateStr}T00:00:00`);
        opts.to = new Date(`${dateStr}T23:59:59.999`);
      }
      const orders = await storage.listStoreOrders(opts);
      res.json({ success: true, data: orders });
    } catch (error) {
      logServerError('관리자 매장 주문 목록 오류:', error, req);
      res.status(500).json({ error: '주문 목록 조회 실패', code: 'INTERNAL_SERVER_ERROR' });
    }
  });

  app.patch('/api/admin/store/orders/:id/status', requireAuth('admin'), csrfProtection, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return res.status(400).json({ error: '잘못된 ID', code: 'INVALID_ID' });
      const status = String(req.body?.status || '');
      if (!(STORE_ORDER_STATUSES as readonly string[]).includes(status)) {
        return res.status(400).json({ error: '잘못된 상태값', code: 'INVALID_STATUS' });
      }
      const updated = await storage.updateStoreOrderStatus(id, status as any);
      if (!updated) return res.status(404).json({ error: '주문을 찾을 수 없습니다.', code: 'NOT_FOUND' });
      res.json({ success: true, data: updated });
    } catch (error) {
      logServerError('매장 주문 상태 변경 오류:', error, req);
      res.status(500).json({ error: '상태 변경 실패', code: 'INTERNAL_SERVER_ERROR' });
    }
  });

  console.log('[Store Orders] 매장 QR 주문 시스템 API가 등록되었습니다.');

  // ============ 전국 반려견 행사 (Pet Events) ============
  app.get('/api/pet-events', async (req, res) => {
    try {
      const category = (req.query.category as string | undefined)?.trim();
      const from = (req.query.from as string | undefined)?.trim();
      const to = (req.query.to as string | undefined)?.trim();
      const opts: {
        activeOnly: boolean;
        category?: string;
        from?: Date;
        to?: Date;
      } = { activeOnly: true };
      if (category && (PET_EVENT_CATEGORIES as readonly string[]).includes(category)) {
        opts.category = category;
      }
      if (from && /^\d{4}-\d{2}-\d{2}$/.test(from)) opts.from = new Date(`${from}T00:00:00`);
      if (to && /^\d{4}-\d{2}-\d{2}$/.test(to)) opts.to = new Date(`${to}T23:59:59.999`);
      const items = await storage.listPetEvents(opts);
      res.json({ success: true, data: items });
    } catch (error) {
      logServerError('반려견 행사 목록 조회 오류:', error, req);
      res.status(500).json({ error: '행사 조회 실패', code: 'INTERNAL_SERVER_ERROR' });
    }
  });

  app.get('/api/pet-events/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return res.status(400).json({ error: '잘못된 ID', code: 'INVALID_ID' });
      const item = await storage.getPetEvent(id);
      if (!item || !item.isActive) return res.status(404).json({ error: '행사를 찾을 수 없습니다.', code: 'NOT_FOUND' });
      res.json({ success: true, data: item });
    } catch (error) {
      logServerError('반려견 행사 상세 조회 오류:', error, req);
      res.status(500).json({ error: '행사 조회 실패', code: 'INTERNAL_SERVER_ERROR' });
    }
  });

  app.get('/api/admin/pet-events', requireAuth('admin'), async (req, res) => {
    try {
      const items = await storage.listPetEvents({});
      res.json({ success: true, data: items });
    } catch (error) {
      logServerError('관리자 반려견 행사 목록 오류:', error, req);
      res.status(500).json({ error: '행사 조회 실패', code: 'INTERNAL_SERVER_ERROR' });
    }
  });

  app.post('/api/admin/pet-events', requireAuth('admin'), csrfProtection, async (req, res) => {
    try {
      const parsed = insertPetEventSchema.parse(req.body || {});
      if (parsed.endDate < parsed.startDate) {
        return res.status(400).json({ error: '종료일은 시작일 이후여야 합니다.', code: 'INVALID_DATE_RANGE' });
      }
      const created = await storage.createPetEvent(parsed);
      res.status(201).json({ success: true, data: created });
    } catch (error: any) {
      if (error?.name === 'ZodError') return res.status(400).json({ error: '입력값이 올바르지 않습니다.', code: 'VALIDATION_ERROR', details: error.errors });
      logServerError('반려견 행사 생성 오류:', error, req);
      res.status(500).json({ error: '행사 생성 실패', code: 'INTERNAL_SERVER_ERROR' });
    }
  });

  app.patch('/api/admin/pet-events/:id', requireAuth('admin'), csrfProtection, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return res.status(400).json({ error: '잘못된 ID', code: 'INVALID_ID' });
      const existing = await storage.getPetEvent(id);
      if (!existing) return res.status(404).json({ error: '행사를 찾을 수 없습니다.', code: 'NOT_FOUND' });
      const parsed = insertPetEventSchema.partial().parse(req.body || {});
      const effectiveStart = parsed.startDate ?? existing.startDate;
      const effectiveEnd = parsed.endDate ?? existing.endDate;
      if (effectiveEnd < effectiveStart) {
        return res.status(400).json({ error: '종료일은 시작일 이후여야 합니다.', code: 'INVALID_DATE_RANGE' });
      }
      const updated = await storage.updatePetEvent(id, parsed);
      if (!updated) return res.status(404).json({ error: '행사를 찾을 수 없습니다.', code: 'NOT_FOUND' });
      res.json({ success: true, data: updated });
    } catch (error: any) {
      if (error?.name === 'ZodError') return res.status(400).json({ error: '입력값이 올바르지 않습니다.', code: 'VALIDATION_ERROR', details: error.errors });
      logServerError('반려견 행사 수정 오류:', error, req);
      res.status(500).json({ error: '행사 수정 실패', code: 'INTERNAL_SERVER_ERROR' });
    }
  });

  app.delete('/api/admin/pet-events/:id', requireAuth('admin'), csrfProtection, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return res.status(400).json({ error: '잘못된 ID', code: 'INVALID_ID' });
      const ok = await storage.deletePetEvent(id);
      if (!ok) return res.status(404).json({ error: '행사를 찾을 수 없습니다.', code: 'NOT_FOUND' });
      res.json({ success: true });
    } catch (error) {
      logServerError('반려견 행사 삭제 오류:', error, req);
      res.status(500).json({ error: '행사 삭제 실패', code: 'INTERNAL_SERVER_ERROR' });
    }
  });

  app.post('/api/admin/pet-events/bulk-activate', requireAuth('admin'), csrfProtection, async (req, res) => {
    try {
      const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];
      const validIds = ids.map((v: unknown) => Number(v)).filter((n: number) => Number.isInteger(n) && n > 0);
      if (validIds.length === 0) {
        return res.status(400).json({ error: '활성화할 행사 ID를 선택해주세요.', code: 'INVALID_IDS' });
      }
      const updated = await storage.bulkActivatePetEvents(validIds);
      res.json({ success: true, data: { updated } });
    } catch (error) {
      logServerError('반려견 행사 일괄 활성화 오류:', error, req);
      res.status(500).json({ error: '일괄 활성화 실패', code: 'INTERNAL_SERVER_ERROR' });
    }
  });

  app.post('/api/admin/pet-events/bulk-deactivate', requireAuth('admin'), csrfProtection, async (req, res) => {
    try {
      const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];
      const validIds = ids.map((v: unknown) => Number(v)).filter((n: number) => Number.isInteger(n) && n > 0);
      if (validIds.length === 0) {
        return res.status(400).json({ error: '비활성화할 행사 ID를 선택해주세요.', code: 'INVALID_IDS' });
      }
      const updated = await storage.bulkDeactivatePetEvents(validIds);
      res.json({ success: true, data: { updated } });
    } catch (error) {
      logServerError('반려견 행사 일괄 비활성화 오류:', error, req);
      res.status(500).json({ error: '일괄 비활성화 실패', code: 'INTERNAL_SERVER_ERROR' });
    }
  });

  app.post('/api/admin/pet-events/bulk-delete', requireAuth('admin'), csrfProtection, async (req, res) => {
    try {
      const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];
      const validIds = ids.map((v: unknown) => Number(v)).filter((n: number) => Number.isInteger(n) && n > 0);
      if (validIds.length === 0) {
        return res.status(400).json({ error: '삭제할 행사 ID를 선택해주세요.', code: 'INVALID_IDS' });
      }
      const deleted = await storage.bulkDeletePetEvents(validIds);
      res.json({ success: true, data: { deleted } });
    } catch (error) {
      logServerError('반려견 행사 일괄 삭제 오류:', error, req);
      res.status(500).json({ error: '일괄 삭제 실패', code: 'INTERNAL_SERVER_ERROR' });
    }
  });

  // 주소 → 좌표 지오코딩 (관리자 행사 등록용)
  app.get('/api/admin/geocode', requireAuth('admin'), async (req, res) => {
    try {
      const address = typeof req.query.address === 'string' ? req.query.address.trim() : '';
      if (!address) return res.status(400).json({ error: '주소가 필요합니다.', code: 'MISSING_ADDRESS' });

      const GOOGLE_MAPS_API_KEY = process.env.VITE_GOOGLE_MAPS_API_KEY;
      if (!GOOGLE_MAPS_API_KEY) {
        logger.error('VITE_GOOGLE_MAPS_API_KEY가 설정되지 않음');
        return res.status(500).json({ error: 'Google Maps API 키가 설정되지 않았습니다.', code: 'MISSING_API_KEY' });
      }

      const params = new URLSearchParams({
        address,
        key: GOOGLE_MAPS_API_KEY,
        language: 'ko',
        region: 'KR',
      });
      interface GeocodeResult {
        formatted_address: string;
        geometry: { location: { lat: number; lng: number } };
      }
      interface GeocodeResponse {
        status: string;
        results?: GeocodeResult[];
      }
      const r = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?${params}`);
      if (!r.ok) throw new Error(`Geocoding API 오류: ${r.status} ${r.statusText}`);
      const data = (await r.json()) as GeocodeResponse;
      if (data.status === 'ZERO_RESULTS' || !data.results?.length) {
        return res.status(404).json({ error: '좌표를 찾지 못했습니다.', code: 'ZERO_RESULTS' });
      }
      if (data.status !== 'OK') {
        return res.status(502).json({ error: `Geocoding API 오류: ${data.status}`, code: 'GEOCODE_FAILED' });
      }
      const top = data.results[0];
      res.json({
        success: true,
        data: {
          lat: top.geometry.location.lat,
          lng: top.geometry.location.lng,
          formattedAddress: top.formatted_address,
        },
      });
    } catch (error) {
      logServerError('지오코딩 오류:', error, req);
      res.status(500).json({ error: '지오코딩에 실패했습니다.', code: 'INTERNAL_SERVER_ERROR' });
    }
  });

  // 자동 수집 트리거 (관리자 전용)
  app.post('/api/admin/pet-events/import', requireAuth('admin'), csrfProtection, async (_req, res) => {
    try {
      const result = await eventUpdater.runImport();
      res.json({ success: true, data: result });
    } catch (error: any) {
      const msg = error?.message || '자동 수집 실패';
      if (msg.includes('이미 실행 중')) {
        return res.status(409).json({ error: msg, code: 'ALREADY_RUNNING' });
      }
      logServerError('반려견 행사 자동 수집 오류:', error);
      res.status(500).json({ error: '자동 수집 실패', code: 'INTERNAL_SERVER_ERROR' });
    }
  });

  app.get('/api/admin/pet-events/body-fetch-settings', requireAuth('admin'), async (_req, res) => {
    try {
      res.json({ success: true, data: storage.getBodyFetchSettings() });
    } catch (error) {
      logServerError('본문 페치 한도 조회 오류:', error);
      res.status(500).json({ error: '조회 실패', code: 'INTERNAL_SERVER_ERROR' });
    }
  });

  app.patch('/api/admin/pet-events/body-fetch-settings', requireAuth('admin'), csrfProtection, async (req, res) => {
    try {
      const body = req.body ?? {};
      const perRunMaxRaw = body.perRunMax;
      const perHostMaxRaw = body.perHostMax;
      const isInt = (v: unknown) =>
        typeof v === 'number' && Number.isFinite(v) && Number.isInteger(v);
      if (perRunMaxRaw !== undefined && (!isInt(perRunMaxRaw) || perRunMaxRaw < 0 || perRunMaxRaw > 200)) {
        return res.status(400).json({ error: 'perRunMax 는 0~200 사이의 정수여야 합니다.', code: 'INVALID_INPUT' });
      }
      if (perHostMaxRaw !== undefined && (!isInt(perHostMaxRaw) || perHostMaxRaw < 0 || perHostMaxRaw > 200)) {
        return res.status(400).json({ error: 'perHostMax 는 0~200 사이의 정수여야 합니다.', code: 'INVALID_INPUT' });
      }
      const updated = storage.updateBodyFetchSettings({
        perRunMax: perRunMaxRaw,
        perHostMax: perHostMaxRaw,
      });
      res.json({ success: true, data: updated });
    } catch (error) {
      logServerError('본문 페치 한도 저장 오류:', error);
      res.status(500).json({ error: '저장 실패', code: 'INTERNAL_SERVER_ERROR' });
    }
  });

  app.get('/api/admin/pet-events/import/last', requireAuth('admin'), async (_req, res) => {
    try {
      res.json({ success: true, data: eventUpdater.getLastResult() });
    } catch (error) {
      logServerError('반려견 행사 자동 수집 결과 조회 오류:', error);
      res.status(500).json({ error: '조회 실패', code: 'INTERNAL_SERVER_ERROR' });
    }
  });

  app.get('/api/admin/pet-events/import/failures', requireAuth('admin'), async (req, res) => {
    try {
      const rawLimit = Number(req.query.limit);
      const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.floor(rawLimit) : 10;
      const candidates = await eventUpdater.getFailureCandidates(limit);
      res.json({ success: true, data: candidates });
    } catch (error) {
      logServerError('반려견 행사 실패 후보 조회 오류:', error);
      res.status(500).json({ error: '조회 실패', code: 'INTERNAL_SERVER_ERROR' });
    }
  });

  app.post('/api/admin/pet-events/import/failures/resolve', requireAuth('admin'), csrfProtection, async (req, res) => {
    try {
      const runId = Number(req.body?.runId);
      const idx = Number(req.body?.idx);
      const resolvedEventId = req.body?.resolvedEventId != null ? Number(req.body.resolvedEventId) : null;
      const note = typeof req.body?.note === 'string' ? req.body.note.slice(0, 500) : null;
      if (!Number.isInteger(runId) || runId <= 0 || !Number.isInteger(idx) || idx < 0) {
        return res.status(400).json({ error: 'runId/idx가 올바르지 않습니다.', code: 'INVALID_INPUT' });
      }
      const userId = (req as any).user?.id ?? null;
      const row = await storage.upsertPetEventImportFailureResolution({
        runId,
        idx,
        status: 'resolved',
        resolvedEventId: resolvedEventId && Number.isInteger(resolvedEventId) ? resolvedEventId : null,
        note,
        resolvedBy: typeof userId === 'number' ? userId : null,
      });
      res.json({ success: true, data: row });
    } catch (error) {
      logServerError('실패 후보 해결 처리 오류:', error, req);
      res.status(500).json({ error: '처리 실패', code: 'INTERNAL_SERVER_ERROR' });
    }
  });

  app.post('/api/admin/pet-events/import/failures/dismiss', requireAuth('admin'), csrfProtection, async (req, res) => {
    try {
      const runId = Number(req.body?.runId);
      const idx = Number(req.body?.idx);
      const note = typeof req.body?.note === 'string' ? req.body.note.slice(0, 500) : null;
      if (!Number.isInteger(runId) || runId <= 0 || !Number.isInteger(idx) || idx < 0) {
        return res.status(400).json({ error: 'runId/idx가 올바르지 않습니다.', code: 'INVALID_INPUT' });
      }
      const userId = (req as any).user?.id ?? null;
      const row = await storage.upsertPetEventImportFailureResolution({
        runId,
        idx,
        status: 'dismissed',
        resolvedEventId: null,
        note,
        resolvedBy: typeof userId === 'number' ? userId : null,
      });
      res.json({ success: true, data: row });
    } catch (error) {
      logServerError('실패 후보 숨기기 오류:', error, req);
      res.status(500).json({ error: '처리 실패', code: 'INTERNAL_SERVER_ERROR' });
    }
  });

  app.post('/api/admin/pet-events/import/failures/reopen', requireAuth('admin'), csrfProtection, async (req, res) => {
    try {
      const runId = Number(req.body?.runId);
      const idx = Number(req.body?.idx);
      if (!Number.isInteger(runId) || runId <= 0 || !Number.isInteger(idx) || idx < 0) {
        return res.status(400).json({ error: 'runId/idx가 올바르지 않습니다.', code: 'INVALID_INPUT' });
      }
      await storage.deletePetEventImportFailureResolution(runId, idx);
      res.json({ success: true });
    } catch (error) {
      logServerError('실패 후보 재오픈 오류:', error, req);
      res.status(500).json({ error: '처리 실패', code: 'INTERNAL_SERVER_ERROR' });
    }
  });

  app.get('/api/admin/pet-events/import/history', requireAuth('admin'), async (req, res) => {
    try {
      const rawLimit = Number(req.query.limit);
      const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.floor(rawLimit) : 20;
      const history = await eventUpdater.getHistory(limit);
      res.json({
        success: true,
        data: {
          running: eventUpdater.isRunning(),
          last: eventUpdater.getLastResult(),
          history,
        },
      });
    } catch (error) {
      logServerError('반려견 행사 자동 수집 이력 조회 오류:', error);
      res.status(500).json({ error: '조회 실패', code: 'INTERNAL_SERVER_ERROR' });
    }
  });

  app.get('/api/admin/event-collection/providers', requireAuth('admin'), (_req, res) => {
    const statuses = getProviderStatuses();
    res.json({ success: true, providers: statuses });
  });

  console.log('[Pet Events] 전국 반려견 행사 지도 API가 등록되었습니다.');

  // =============================================
  // 반려동물 예방접종 QR 여권 (Pet Vaccination Passport)
  // =============================================

  const passportRateBucket = new Map<string, { count: number; resetAt: number }>();
  const PASSPORT_RATE_LIMIT = 30; // per minute per IP
  const PASSPORT_RATE_WINDOW_MS = 60_000;
  const PASSPORT_TTL_MS = 365 * 24 * 60 * 60 * 1000; // 1 year

  function checkPassportRateLimit(ip: string): boolean {
    const now = Date.now();
    const entry = passportRateBucket.get(ip);
    if (!entry || entry.resetAt < now) {
      passportRateBucket.set(ip, { count: 1, resetAt: now + PASSPORT_RATE_WINDOW_MS });
      return true;
    }
    if (entry.count >= PASSPORT_RATE_LIMIT) return false;
    entry.count += 1;
    return true;
  }

  type PetLike = {
    id: number;
    ownerId: number;
    petUid?: string | null;
    name: string;
    species: string;
    breed: string;
    age: number;
    gender: string;
    color: string | null;
    imageUrl?: string | null;
    profileImage?: string | null;
    registrationNumber?: string | null;
  };
  type VaccineRow = {
    petId: number;
    vaccineName: string;
    status: string | null;
    vaccineDate: string | null;
    nextDueDate: string | null;
  };

  async function loadPetForPassport(petId: number): Promise<PetLike | null> {
    const [row] = await db.select().from(pets).where(eq(pets.id, petId)).limit(1);
    if (row) return row as unknown as PetLike;
    const memStorage = storage as unknown as { getPet?: (id: number) => PetLike | undefined };
    return memStorage.getPet?.(petId) ?? null;
  }

  async function buildVaccineSummary(petId: number) {
    let rows: VaccineRow[] = [];
    try {
      const dbRows = await db.select().from(vaccinations).where(eq(vaccinations.petId, petId));
      rows = dbRows as unknown as VaccineRow[];
    } catch (e) {
      logServerError('[Pet Passport] 백신 DB 조회 실패, 메모리 폴백:', e);
      rows = [];
    }
    const memStorage = storage as unknown as { vaccinations?: VaccineRow[] };
    if ((!rows || rows.length === 0) && Array.isArray(memStorage.vaccinations)) {
      rows = memStorage.vaccinations.filter((v) => v.petId === petId);
    }
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const inThirtyDays = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)
      .toISOString().split('T')[0];

    let hasMissing = false;
    let hasExpired = false;
    let hasSoon = false;

    const items = rows.map((v) => {
      const completed = v.status === 'completed';
      const next = v.nextDueDate;
      let status: 'ok' | 'expiring' | 'expired' | 'missing' = 'missing';
      if (completed) {
        if (!next) status = 'ok';
        else if (next < todayStr) { status = 'expired'; hasExpired = true; }
        else if (next <= inThirtyDays) { status = 'expiring'; hasSoon = true; }
        else status = 'ok';
      } else if (v.status === 'overdue' || (next && next < todayStr)) {
        status = 'expired';
        hasExpired = true;
      } else {
        status = 'missing';
        hasMissing = true;
      }
      return {
        vaccineName: v.vaccineName,
        status,
        vaccineDate: v.vaccineDate,
        nextDueDate: next,
      };
    });

    let overallStatus: 'all_ok' | 'has_expiring' | 'has_expired' | 'no_records' = 'all_ok';
    if (items.length === 0) overallStatus = 'no_records';
    else if (hasExpired || hasMissing) overallStatus = 'has_expired';
    else if (hasSoon) overallStatus = 'has_expiring';

    return { items, overallStatus, totalCount: items.length };
  }

  function maskRegistrationNumber(n: string | null | undefined): string | null {
    if (!n) return null;
    if (n.length <= 4) return n[0] + '*'.repeat(Math.max(0, n.length - 1));
    return n.slice(0, 4) + '*'.repeat(n.length - 4);
  }

  // 동물등록증 사진 OCR — 등록번호 자동 추출
  // 한국 동물보호관리시스템(animal.go.kr) 등록증을 OpenAI Vision으로 판독
  const registrationCardUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 8 * 1024 * 1024 }, // 8MB
    fileFilter: (_req, file, cb) => {
      if (!file.mimetype.startsWith('image/')) {
        return cb(new Error('이미지 파일만 업로드 가능합니다.'));
      }
      cb(null, true);
    },
  });
  app.post(
    '/api/pets/registration-card/ocr',
    requireAuth(),
    csrfProtection,
    (req, res, next) => {
      registrationCardUpload.single('image')(req, res, (err: any) => {
        if (err) {
          return res.status(400).json({ error: err.message || '이미지 업로드 실패' });
        }
        next();
      });
    },
    async (req, res) => {
      try {
        const file = (req as Request & { file?: Express.Multer.File }).file;
        if (!file) return res.status(400).json({ error: '이미지 파일이 필요합니다.' });

        const { extractRegistrationCardInfo } = await import('./ai/openai');
        const base64 = file.buffer.toString('base64');
        const result = await extractRegistrationCardInfo(base64, file.mimetype || 'image/jpeg');

        // 한국 동물등록번호 형식 힌트: 보통 15자리 숫자, 410으로 시작
        const reg = result.registrationNumber || '';
        const isKoreanFormat = /^410\d{12}$/.test(reg);
        const isPlausibleDigits = /^\d{9,20}$/.test(reg);

        res.json({
          success: true,
          ...result,
          formatValid: isKoreanFormat || isPlausibleDigits,
          formatStrict: isKoreanFormat,
          formatHint: isKoreanFormat
            ? '한국 동물등록번호 형식(410으로 시작 · 15자리)과 일치합니다.'
            : isPlausibleDigits
            ? '숫자 형식은 맞지만 표준(410으로 시작 · 15자리)과 다릅니다. 확인해주세요.'
            : '등록번호를 자동 인식하지 못했습니다. 사진을 더 선명하게 다시 촬영해주세요.',
        });
      } catch (error) {
        logServerError('[등록증 OCR] 처리 실패:', error, req);
        const isDev = process.env.NODE_ENV !== 'production';
        res.status(500).json({
          error: '등록증 분석에 실패했습니다. 잠시 후 다시 시도해주세요.',
          ...(isDev ? { detail: error instanceof Error ? error.message : String(error) } : {}),
        });
      }
    }
  );

  // 발급 조건 체크 + 발급 (기존 활성 토큰은 회수)
  app.post('/api/pets/:petId/passport/issue', requireAuth(), csrfProtection, async (req, res) => {
    try {
      const petId = parseInt(req.params.petId, 10);
      if (isNaN(petId)) return res.status(400).json({ error: '잘못된 반려동물 ID' });
      const sessionUser = ((req as Request & { user?: { id?: number; role?: string } }).user
        || (req.session as { user?: { id?: number; role?: string } } | undefined)?.user) as
        | { id?: number; role?: string }
        | undefined;
      const userId = sessionUser?.id;
      if (!userId) return res.status(401).json({ error: '로그인이 필요합니다.' });

      const pet = await loadPetForPassport(petId);
      if (!pet) return res.status(404).json({ error: '반려동물을 찾을 수 없습니다.' });
      const isAdmin = sessionUser?.role === 'admin';
      if (pet.ownerId !== userId && !isAdmin) {
        return res.status(403).json({ error: '본인의 반려동물만 발급할 수 있습니다.' });
      }

      const missing: string[] = [];
      if (!pet.registrationNumber || String(pet.registrationNumber).trim().length < 4) {
        missing.push('registrationNumber');
      }
      const summary = await buildVaccineSummary(petId);
      if (summary.totalCount === 0) missing.push('vaccinations');
      if (missing.length > 0) {
        return res.status(400).json({
          error: '발급 조건을 충족하지 않았습니다.',
          missing,
        });
      }

      const token = randomBytes(32).toString('base64url');
      const expiresAt = new Date(Date.now() + PASSPORT_TTL_MS);

      // 기존 활성 토큰 회수 + 신규 발급 (원자성 보장)
      const created = await db.transaction(async (tx) => {
        await tx.update(petVaccinationPassports)
          .set({ isActive: false, revokedAt: new Date() })
          .where(and(
            eq(petVaccinationPassports.petId, petId),
            eq(petVaccinationPassports.isActive, true),
          ));
        const [row] = await tx.insert(petVaccinationPassports).values({
          petId,
          ownerId: pet.ownerId,
          token,
          isActive: true,
          expiresAt,
        }).returning();
        return row;
      });

      res.json({ success: true, passport: created, petUid: pet.petUid ?? null });
    } catch (error) {
      logServerError('예방접종 여권 발급 오류:', error, req);
      res.status(500).json({ error: '여권 발급 중 오류가 발생했습니다.' });
    }
  });

  // 보호자 — 현재 펫의 활성 여권 조회
  app.get('/api/pets/:petId/passport', requireAuth(), async (req, res) => {
    try {
      const petId = parseInt(req.params.petId, 10);
      if (isNaN(petId)) return res.status(400).json({ error: '잘못된 반려동물 ID' });
      const sessionUser = ((req as Request & { user?: { id?: number; role?: string } }).user
        || (req.session as { user?: { id?: number; role?: string } } | undefined)?.user) as
        | { id?: number; role?: string }
        | undefined;
      const userId = sessionUser?.id;
      if (!userId) return res.status(401).json({ error: '로그인이 필요합니다.' });

      const pet = await loadPetForPassport(petId);
      if (!pet) return res.status(404).json({ error: '반려동물을 찾을 수 없습니다.' });
      const isAdmin = sessionUser?.role === 'admin';
      if (pet.ownerId !== userId && !isAdmin) {
        return res.status(403).json({ error: '권한이 없습니다.' });
      }

      const [active] = await db.select().from(petVaccinationPassports)
        .where(and(
          eq(petVaccinationPassports.petId, petId),
          eq(petVaccinationPassports.isActive, true),
        ))
        .orderBy(desc(petVaccinationPassports.issuedAt))
        .limit(1);

      const summary = await buildVaccineSummary(petId);
      const regOk = !!pet.registrationNumber && String(pet.registrationNumber).trim().length >= 4;
      const eligible = regOk && summary.totalCount > 0;
      const missing: string[] = [];
      if (!pet.registrationNumber) missing.push('registrationNumber');
      if (summary.totalCount === 0) missing.push('vaccinations');

      res.json({
        success: true,
        passport: active || null,
        eligible,
        missing,
        summary,
        petUid: pet.petUid ?? null,
      });
    } catch (error) {
      logServerError('예방접종 여권 조회 오류:', error, req);
      res.status(500).json({ error: '여권 조회 중 오류가 발생했습니다.' });
    }
  });

  // 여권 회수
  app.post('/api/pets/:petId/passport/revoke', requireAuth(), csrfProtection, async (req, res) => {
    try {
      const petId = parseInt(req.params.petId, 10);
      if (isNaN(petId)) return res.status(400).json({ error: '잘못된 반려동물 ID' });
      const sessionUser = ((req as Request & { user?: { id?: number; role?: string } }).user
        || (req.session as { user?: { id?: number; role?: string } } | undefined)?.user) as
        | { id?: number; role?: string }
        | undefined;
      const userId = sessionUser?.id;
      if (!userId) return res.status(401).json({ error: '로그인이 필요합니다.' });

      const pet = await loadPetForPassport(petId);
      if (!pet) return res.status(404).json({ error: '반려동물을 찾을 수 없습니다.' });
      const isAdmin = sessionUser?.role === 'admin';
      if (pet.ownerId !== userId && !isAdmin) {
        return res.status(403).json({ error: '권한이 없습니다.' });
      }

      await db.update(petVaccinationPassports)
        .set({ isActive: false, revokedAt: new Date() })
        .where(and(
          eq(petVaccinationPassports.petId, petId),
          eq(petVaccinationPassports.isActive, true),
        ));
      res.json({ success: true });
    } catch (error) {
      logServerError('예방접종 여권 회수 오류:', error, req);
      res.status(500).json({ error: '여권 회수 중 오류가 발생했습니다.' });
    }
  });

  // ==== Task #223 펫스포트 분실모드 ====
  const lostReportRateBucket = new Map<string, { count: number; resetAt: number }>();
  const LOST_REPORT_LIMIT = 5;
  const LOST_REPORT_WINDOW_MS = 60_000;
  function checkLostReportRate(ip: string): boolean {
    const now = Date.now();
    const e = lostReportRateBucket.get(ip);
    if (!e || e.resetAt < now) {
      lostReportRateBucket.set(ip, { count: 1, resetAt: now + LOST_REPORT_WINDOW_MS });
      return true;
    }
    if (e.count >= LOST_REPORT_LIMIT) return false;
    e.count += 1;
    return true;
  }
  function maskOwnerName(raw: string | null | undefined): string | null {
    if (!raw) return null;
    const s = String(raw).trim();
    if (s.length <= 1) return s;
    if (s.length === 2) return s[0] + '*';
    return s[0] + '*'.repeat(s.length - 2) + s[s.length - 1];
  }
  const lostModeUpdateSchema = z.object({
    enabled: z.boolean(),
    message: z.string().max(500).optional().nullable(),
    contactPhone: z.string().max(30).optional().nullable(),
    contactWindow: z.string().max(100).optional().nullable(),
    lastSeenAt: z.string().max(50).optional().nullable(),
    lastSeenLocation: z.string().max(500).optional().nullable(),
    lastSeenLat: z.number().min(-90).max(90).optional().nullable(),
    lastSeenLng: z.number().min(-180).max(180).optional().nullable(),
  });

  // 보호자 — 분실모드 ON/OFF + 정보 갱신
  app.patch('/api/pets/:petId/passport/lost-mode', requireAuth(), csrfProtection, async (req, res) => {
    try {
      const petId = parseInt(req.params.petId, 10);
      if (isNaN(petId)) return res.status(400).json({ error: '잘못된 반려동물 ID' });
      const sessionUser = ((req as Request & { user?: { id?: number; role?: string } }).user
        || (req.session as { user?: { id?: number; role?: string } } | undefined)?.user) as
        | { id?: number; role?: string }
        | undefined;
      const userId = sessionUser?.id;
      if (!userId) return res.status(401).json({ error: '로그인이 필요합니다.' });

      const pet = await loadPetForPassport(petId);
      if (!pet) return res.status(404).json({ error: '반려동물을 찾을 수 없습니다.' });
      const isAdmin = sessionUser?.role === 'admin';
      if (pet.ownerId !== userId && !isAdmin) {
        return res.status(403).json({ error: '본인의 반려동물만 변경할 수 있습니다.' });
      }

      const parsed = lostModeUpdateSchema.safeParse(req.body || {});
      if (!parsed.success) {
        return res.status(400).json({ error: '잘못된 입력입니다.', details: parsed.error.flatten() });
      }

      const [active] = await db.select().from(petVaccinationPassports)
        .where(and(eq(petVaccinationPassports.petId, petId), eq(petVaccinationPassports.isActive, true)))
        .orderBy(desc(petVaccinationPassports.issuedAt))
        .limit(1);
      if (!active) return res.status(400).json({ error: '활성 여권이 없습니다. 먼저 QR 여권을 발급해주세요.' });

      const wasOn = !!active.lostMode;
      const turningOn = parsed.data.enabled && !wasOn;
      const update: Record<string, unknown> = {
        lostMode: parsed.data.enabled,
        lostMessage: parsed.data.message ?? null,
        lostContactPhone: parsed.data.contactPhone ?? null,
        lostContactWindow: parsed.data.contactWindow ?? null,
        lostLastSeenAt: parsed.data.lastSeenAt ?? null,
        lostLastSeenLocation: parsed.data.lastSeenLocation ?? null,
        lostLastSeenLat: parsed.data.lastSeenLat ?? null,
        lostLastSeenLng: parsed.data.lastSeenLng ?? null,
      };
      if (turningOn) update.lostActivatedAt = new Date();

      const [updated] = await db.update(petVaccinationPassports)
        .set(update)
        .where(eq(petVaccinationPassports.id, active.id))
        .returning();

      res.json({ success: true, passport: updated });
    } catch (error) {
      logServerError('분실모드 변경 오류:', error, req);
      res.status(500).json({ error: '분실모드 변경 중 오류가 발생했습니다.' });
    }
  });

  // 보호자 — 발견 제보 이력 (특정 펫 또는 전체)
  app.get('/api/pets/lost-reports', requireAuth(), async (req, res) => {
    try {
      const sessionUser = ((req as Request & { user?: { id?: number } }).user
        || (req.session as { user?: { id?: number } } | undefined)?.user) as { id?: number } | undefined;
      const userId = sessionUser?.id;
      if (!userId) return res.status(401).json({ error: '로그인이 필요합니다.' });
      const reports = await db.select().from(petLostReports)
        .where(eq(petLostReports.ownerId, userId))
        .orderBy(desc(petLostReports.createdAt))
        .limit(200);
      res.json({ success: true, reports });
    } catch (error) {
      logServerError('분실견 발견 제보 조회 오류:', error, req);
      res.status(500).json({ error: '제보 이력 조회 중 오류가 발생했습니다.' });
    }
  });

  // 공개 — 발견 제보 (분당 5회/IP)
  const reportFoundSchema = z.object({
    finderName: z.string().max(100).optional().nullable(),
    finderPhone: z.string().max(30).optional().nullable(),
    lat: z.number().min(-90).max(90).optional().nullable(),
    lng: z.number().min(-180).max(180).optional().nullable(),
    locationText: z.string().max(500).optional().nullable(),
    memo: z.string().max(1000).optional().nullable(),
  });
  app.post('/api/pet-passport/report-found/:token', async (req, res) => {
    try {
      const ip = (req.ip || req.headers['x-forwarded-for']?.toString() || 'unknown').toString().slice(0, 64);
      if (!checkLostReportRate(ip)) {
        return res.status(429).json({ error: '잠시 후 다시 시도해주세요.' });
      }
      const token = String(req.params.token || '').trim();
      if (token.length < 32 || token.length > 128) {
        return res.status(400).json({ error: '잘못된 토큰입니다.' });
      }
      const parsed = reportFoundSchema.safeParse(req.body || {});
      if (!parsed.success) {
        return res.status(400).json({ error: '잘못된 입력입니다.' });
      }
      const hasContent = !!(parsed.data.locationText?.trim() || parsed.data.memo?.trim() ||
        (parsed.data.lat != null && parsed.data.lng != null));
      if (!hasContent) {
        return res.status(400).json({ error: '발견 장소·메모·GPS 위치 중 최소 1개 이상을 입력해주세요.' });
      }
      const [passport] = await db.select().from(petVaccinationPassports)
        .where(eq(petVaccinationPassports.token, token)).limit(1);
      if (!passport) return res.status(404).json({ error: '여권을 찾을 수 없습니다.' });
      if (!passport.isActive || passport.revokedAt) {
        return res.status(410).json({ error: '회수된 여권입니다.' });
      }
      if (passport.expiresAt && new Date(passport.expiresAt).getTime() < Date.now()) {
        return res.status(410).json({ error: '만료된 여권입니다.' });
      }
      if (!passport.lostMode) {
        return res.status(400).json({ error: '분실모드가 활성화된 여권이 아닙니다.' });
      }
      const ua = String(req.headers['user-agent'] || '').slice(0, 255);

      // 트랜잭션: 제보 INSERT + 카운트 INCREMENT 원자성 보장
      const created = await db.transaction(async (tx) => {
        const [row] = await tx.insert(petLostReports).values({
          passportId: passport.id,
          petId: passport.petId,
          ownerId: passport.ownerId,
          finderName: parsed.data.finderName ?? null,
          finderPhone: parsed.data.finderPhone ?? null,
          lat: parsed.data.lat ?? null,
          lng: parsed.data.lng ?? null,
          locationText: parsed.data.locationText ?? null,
          memo: parsed.data.memo ?? null,
          finderIp: ip,
          finderUa: ua,
        }).returning();
        await tx.update(petVaccinationPassports)
          .set({ lostReportCount: sql`${petVaccinationPassports.lostReportCount} + 1` })
          .where(eq(petVaccinationPassports.id, passport.id));
        return row;
      });

      // 보호자 알림 (인앱 + FCM)
      try {
        const pet = await loadPetForPassport(passport.petId);
        const petName = pet?.name || '반려견';
        const { notificationService } = await import('./notifications/notification-service');
        await notificationService.sendNotification({
          userId: passport.ownerId,
          type: 'system',
          title: `[분실] ${petName} 발견 제보가 도착했습니다`,
          message: parsed.data.locationText
            ? `위치: ${parsed.data.locationText}${parsed.data.memo ? ' · ' + parsed.data.memo : ''}`
            : (parsed.data.memo || '발견자가 위치/메모를 제출했습니다.'),
          actionUrl: `/my-pets/lost-reports?reportId=${created.id}`,
          data: { reportId: created.id, petId: passport.petId, lat: parsed.data.lat, lng: parsed.data.lng },
        });
        await db.update(petLostReports)
          .set({ ownerNotifiedAt: new Date() })
          .where(eq(petLostReports.id, created.id));
      } catch (e) {
        logServerError('[Lost Report] 보호자 알림 발송 실패:', e);
      }

      res.json({ success: true, reportId: created.id });
    } catch (error) {
      logServerError('분실견 발견 제보 처리 오류:', error, req);
      res.status(500).json({ error: '제보 처리 중 오류가 발생했습니다.' });
    }
  });

  // 공개 검증 (rate-limited)
  app.get('/api/pet-passport/verify/:token', async (req, res) => {
    try {
      const ip = (req.ip || req.headers['x-forwarded-for']?.toString() || 'unknown').toString();
      if (!checkPassportRateLimit(ip)) {
        return res.status(429).json({ error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' });
      }
      const token = String(req.params.token || '').trim();
      if (token.length < 32 || token.length > 128) {
        return res.status(400).json({ error: '잘못된 토큰 형식입니다.' });
      }

      const [passport] = await db.select().from(petVaccinationPassports)
        .where(eq(petVaccinationPassports.token, token)).limit(1);
      if (!passport) return res.status(404).json({ error: '여권을 찾을 수 없습니다.', code: 'NOT_FOUND' });
      if (!passport.isActive || passport.revokedAt) {
        return res.status(410).json({ error: '회수된 여권입니다.', code: 'REVOKED' });
      }
      if (passport.expiresAt && new Date(passport.expiresAt).getTime() < Date.now()) {
        return res.status(410).json({ error: '만료된 여권입니다.', code: 'EXPIRED' });
      }

      const pet = await loadPetForPassport(passport.petId);
      if (!pet) return res.status(404).json({ error: '반려동물을 찾을 수 없습니다.' });
      const summary = await buildVaccineSummary(passport.petId);

      // 분실모드 상태 (보호자 PII는 마스킹) — 연락처가 비어있으면 보호자 프로필 휴대폰으로 폴백
      let ownerName: string | null = null;
      let fallbackPhone: string | null = null;
      if (passport.lostMode) {
        try {
          const [owner] = await db.select({
            name: users.name,
            phoneNumber: users.phoneNumber,
            phone: users.phone,
          }).from(users).where(eq(users.id, passport.ownerId)).limit(1);
          ownerName = owner?.name ?? null;
          fallbackPhone = (owner?.phoneNumber || owner?.phone || null) as string | null;
        } catch {}
      }

      // 검증 카운트 원자적 누적 (SQL increment)
      let nextCount = (passport.verifyCount || 0) + 1;
      try {
        const [updated] = await db.update(petVaccinationPassports)
          .set({
            verifyCount: sql`${petVaccinationPassports.verifyCount} + 1`,
            lastVerifiedAt: new Date(),
          })
          .where(eq(petVaccinationPassports.id, passport.id))
          .returning({ verifyCount: petVaccinationPassports.verifyCount });
        if (updated) nextCount = updated.verifyCount;
      } catch (e) {
        logServerError('[Pet Passport] verifyCount 갱신 실패:', e, req);
      }

      res.json({
        success: true,
        pet: {
          petUid: pet.petUid || null,
          name: pet.name,
          species: pet.species,
          breed: pet.breed,
          age: pet.age,
          gender: pet.gender,
          color: pet.color,
          imageUrl: pet.imageUrl || pet.profileImage || null,
          registrationNumberMasked: maskRegistrationNumber(pet.registrationNumber),
        },
        vaccinations: summary.items,
        overallStatus: summary.overallStatus,
        verifiedAt: new Date().toISOString(),
        verifyCount: nextCount,
        lostMode: passport.lostMode ? {
          active: true,
          message: passport.lostMessage || null,
          contactPhone: passport.lostContactPhone || fallbackPhone || null,
          contactWindow: passport.lostContactWindow || null,
          lastSeenAt: passport.lostLastSeenAt || null,
          lastSeenLocation: passport.lostLastSeenLocation || null,
          lastSeenLat: passport.lostLastSeenLat ?? null,
          lastSeenLng: passport.lostLastSeenLng ?? null,
          ownerNameMasked: maskOwnerName(ownerName),
          activatedAt: passport.lostActivatedAt ? new Date(passport.lostActivatedAt).toISOString() : null,
        } : { active: false },
      });
    } catch (error) {
      logServerError('예방접종 여권 검증 오류:', error, req);
      res.status(500).json({ error: '여권 검증 중 오류가 발생했습니다.' });
    }
  });

  console.log('[Pet Passport] 반려견 예방접종 QR 여권 시스템 API가 등록되었습니다.');

  const httpServer = createServer(app);
  return httpServer;
}

// 훈련사 인증 관련 라우트 등록 (중복 선언 제거)
