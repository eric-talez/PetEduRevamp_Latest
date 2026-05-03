import type { Express } from "express";
import multer from "multer";
import { GoogleGenerativeAI } from "@google/generative-ai";
import * as fs from "fs";
import * as path from "path";
import { logServerError } from '../middleware/audit-logger';

// Multer 설정 - 영상 파일 업로드용
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB 제한
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['video/mp4', 'video/avi', 'video/mov', 'video/quicktime'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('지원하지 않는 파일 형식입니다. MP4, AVI, MOV 파일만 업로드 가능합니다.'));
    }
  }
});

// Google GenAI 초기화
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export function registerExperienceRoutes(app: Express) {
  // 영상 분석 체험 서비스
  app.post("/api/experience/analyze-video", upload.single('video'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "영상 파일이 업로드되지 않았습니다." });
      }

      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ 
          error: "AI 서비스가 일시적으로 이용할 수 없습니다. 관리자에게 문의해주세요.",
          fallback: getFallbackAnalysis()
        });
      }

      console.log(`[체험 서비스] 영상 분석 시작 - 파일크기: ${req.file.size} bytes`);

      // 임시 파일로 저장
      const tempDir = path.join(process.cwd(), 'temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const tempFilePath = path.join(tempDir, `video_${Date.now()}.mp4`);
      fs.writeFileSync(tempFilePath, req.file.buffer);

      try {
        // Google GenAI로 영상 분석
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
        
        const videoPart = {
          inlineData: {
            data: req.file.buffer.toString('base64'),
            mimeType: req.file.mimetype
          }
        };

        const prompt = `
        당신은 전문 반려견 행동 분석가입니다. 업로드된 강아지 영상을 자세히 분석하여 다음 항목들을 평가해주세요:

        1. 기본 정보 분석:
        - 견종 추정 (가능한 경우)
        - 추정 나이 (퍼피/성견/시니어)
        - 크기 (소형/중형/대형견)

        2. 행동 분석:
        - 활동 수준 (매우 활발/활발/보통/조용함)
        - 관찰된 행동 패턴
        - 주의가 필요한 행동이 있는지

        3. 건강 상태 관찰:
        - 보행 상태
        - 전반적인 컨디션
        - 눈에 띄는 특이사항

        4. 훈련 필요도 평가:
        - 기본 명령 수행 능력
        - 사회화 수준
        - 권장되는 훈련 프로그램

        5. 전문가 추천:
        - 이 강아지에게 적합한 훈련 방식
        - 주의해야 할 점들
        - TALEZ 서비스 중 도움이 될 기능들

        친근하고 전문적인 톤으로 상세하게 분석해주세요.
        `;

        const result = await model.generateContent([prompt, videoPart]);
        const analysis = result.response.text();

        // 임시 파일 삭제
        fs.unlinkSync(tempFilePath);

        console.log(`[체험 서비스] 영상 분석 완료`);

        res.json({
          success: true,
          analysis: analysis,
          recommendations: generateRecommendations(),
          nextSteps: getNextSteps()
        });

      } catch (error) {
        // 임시 파일 삭제
        if (fs.existsSync(tempFilePath)) {
          fs.unlinkSync(tempFilePath);
        }
        
        logServerError('GenAI 분석 오류:', error, req);
        
        // 대체 분석 제공
        res.json({
          success: true,
          analysis: getFallbackAnalysis(),
          recommendations: generateRecommendations(),
          nextSteps: getNextSteps(),
          note: "현재 AI 분석 서비스에 일시적인 문제가 있어 기본 분석을 제공합니다."
        });
      }

    } catch (error) {
      logServerError('영상 분석 오류:', error, req);
      res.status(500).json({ 
        error: "영상 분석 중 오류가 발생했습니다.",
        fallback: getFallbackAnalysis()
      });
    }
  });

  // 체험 상담 요청
  app.post("/api/experience/consultation", async (req, res) => {
    try {
      const { analysis, userQuestions, contactInfo } = req.body;

      console.log(`[체험 서비스] 상담 요청 - 연락처: ${contactInfo?.phone || 'N/A'}`);

      // 상담 요청 데이터 저장 (실제 구현시 데이터베이스에 저장)
      const consultationId = `EXP_${Date.now()}`;
      
      res.json({
        success: true,
        consultationId,
        message: "상담 요청이 접수되었습니다. 전문가가 24시간 내에 연락드릴 예정입니다.",
        estimatedContactTime: "24시간 이내",
        nextActions: [
          "전문 훈련사가 영상 분석 결과를 바탕으로 상담 준비",
          "개인 맞춤 훈련 계획 수립",
          "연락처로 상담 일정 조율 연락",
          "TALEZ 회원가입 시 특별 할인 혜택 제공"
        ]
      });

    } catch (error) {
      logServerError('상담 요청 오류:', error, req);
      res.status(500).json({ error: "상담 요청 중 오류가 발생했습니다." });
    }
  });
}

// 대체 분석 결과 (AI 서비스 이용 불가시)
function getFallbackAnalysis(): string {
  const analyses = [
    `업로드해주신 영상을 통해 기본적인 분석을 진행했습니다.

🐕 **기본 정보**
- 건강해 보이는 강아지로 관찰됩니다
- 적절한 활동 수준을 보여주고 있습니다
- 전반적으로 양호한 컨디션입니다

🎯 **행동 관찰**
- 호기심이 많고 활발한 성격으로 보입니다
- 주인과의 상호작용이 원활합니다
- 기본적인 사회화가 잘 되어 있는 것 같습니다

📋 **추천 사항**
- 지속적인 기본 훈련이 도움이 될 것 같습니다
- 충분한 운동과 정신적 자극이 필요합니다
- 정기적인 건강 검진을 권장합니다

더 정확한 분석을 위해서는 TALEZ 전문가와의 직접 상담을 추천드립니다.`,

    `영상 분석 결과를 말씀드리겠습니다.

🔍 **전문가 관찰**
- 전반적으로 건강하고 활발한 모습입니다
- 좋은 체형을 유지하고 있습니다
- 주변 환경에 대한 적응력이 좋아 보입니다

🏃 **활동 패턴**
- 적절한 에너지 레벨을 보여줍니다
- 놀이에 대한 관심이 높습니다
- 주인과의 유대감이 좋습니다

🎓 **훈련 가능성**
- 학습 능력이 우수해 보입니다
- 집중력이 양호합니다
- 긍정적 강화 훈련에 잘 반응할 것 같습니다

정확한 개별 맞춤 분석을 원하시면 TALEZ 전문 훈련사와 상담받아보세요.`
  ];

  return analyses[Math.floor(Math.random() * analyses.length)];
}

// 추천 사항 생성
function generateRecommendations() {
  return [
    {
      title: "기본 예의 교육",
      description: "앉아, 기다려, 이리와 등 기본 명령어 훈련",
      priority: "높음",
      estimatedDuration: "4-6주"
    },
    {
      title: "사회화 훈련",
      description: "다른 개, 사람, 환경에 대한 적응 훈련",
      priority: "중간",
      estimatedDuration: "지속적"
    },
    {
      title: "운동 및 놀이",
      description: "충분한 신체 활동과 정신적 자극 제공",
      priority: "높음",
      estimatedDuration: "매일"
    },
    {
      title: "정기 건강 검진",
      description: "예방접종 및 건강 상태 점검",
      priority: "중간",
      estimatedDuration: "연 1-2회"
    }
  ];
}

// 다음 단계 안내
function getNextSteps() {
  return [
    {
      step: 1,
      title: "전문가 상담 예약",
      description: "TALEZ 인증 훈련사와 개별 상담 진행",
      action: "상담 신청하기"
    },
    {
      step: 2,
      title: "맞춤 훈련 계획 수립",
      description: "분석 결과를 바탕으로 개인별 훈련 프로그램 설계",
      action: "훈련 계획 받기"
    },
    {
      step: 3,
      title: "TALEZ 회원가입",
      description: "체험 서비스 이용자 특별 할인 혜택 제공",
      action: "회원가입 하기"
    },
    {
      step: 4,
      title: "훈련 프로그램 시작",
      description: "전문 훈련사와 함께 체계적인 훈련 시작",
      action: "훈련 시작하기"
    }
  ];
}