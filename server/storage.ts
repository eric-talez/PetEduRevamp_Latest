import { db } from "./db";
import { eq, desc, or, and, sql, gte, lte, inArray } from "drizzle-orm";
import {
  logoSettings as logoSettingsTable,
  users as usersTable,
  products as productsTable,
  conversations,
  messages,
  trainers,
  institutes as institutesTable,
  trainerInstitutes,
  contentApprovals,
  trainerApplications,
  curriculums as curriculumsTable,
  orders as ordersTable,
  courses as coursesTable,
  notifications as notificationsTable,
  notificationPreferences as notificationPreferencesTable,
  coursePurchases as coursePurchasesTable,
  reservations as reservationsTable,
  courseProgress as courseProgressTable,
  contentReports as contentReportsTable,
  careLogs as careLogsTable,
  aiAnalyses as aiAnalysesTable,
  type ContentReport,
  type InsertContentReport,
} from "../shared/schema";
import { logServerError } from './middleware/audit-logger';

class Storage {
  users: any[] = [];
  pets: any[] = [];
  courses: any[] = [];
  curriculums: any[] = [];
  notifications: any[] = [];
  contentReports: any[] = [];
  registrations: any[] = [];
  institutes: any[] = [];
  subscriptionPlans: any[] = [];
  paymentRequests: any[] = [];
  products: any[] = [];
  pricingRules: any[] = [];
  trainingJournals: any[] = [];
  notebookShareTokens: any[] = [];
  journalComments: any[] = [];
  journalReactions: any[] = [];
  notebookAttachments: any[] = [];
  posts: any[] = [];
  coursePurchases: any[] = [];
  courseProgress: any[] = [];
  progressSharing: any[] = [];
  lessonSessions: any[] = [];
  courseSessions: any[] = [];
  sessionAttendance: any[] = [];
  trainerActivityLogs: any[] = [];
  pointSettings: any = {};
  logoSettings: any = {};
  banners: any[] = [];
  // AI 분석 시스템 데이터 저장소 (DB로 이전 — 인메모리 배열은 더 이상 사용되지 않음)
  careLogs: any[] = [];
  aiAnalyses: any[] = [];
  vaccinations: any[] = []; // 예방접종 스케줄 저장소
  petMedications: any[] = []; // 약 복용 일정 저장소
  // 대체 훈련사 시스템 데이터 저장소
  substituteClassPosts: any[] = [];
  substituteClassApplications: any[] = [];
  substitutePosts: any[] = [];
  substituteAlerts: any[] = [];
  // 결제 관리 데이터 저장소
  paymentMethods: any[] = [];
  userPaymentPlans: any[] = [];
  paymentHistory: any[] = [];
  events: any[] = [
    {
      id: 1,
      name: "멍룡 썸머 뮤직 피크닉",
      location: {
        address: "전북 익산시 왕궁면 왕궁리 산80-1 (왕궁보석테마관광지 가족공원)",
        lat: 35.948611,
        lng: 126.837500
      },
      startDate: "2025-07-12",
      endDate: "2025-07-12",
      time: "오후 7:00 - 10:00",
      description: "반려인과 비반려인이 함께 즐기는 여름밤 문화행사. 보석 십자수, 자개 열쇠고리 만들기, 반려동물 미로 탐험, 어질리티 체험, 멍BTI 테스트 등 다양한 체험 프로그램과 클래식 4중주, 키즈팝 댄스, 버블쇼 등 공연이 펼쳐집니다.",
      category: "지역축제",
      price: "무료",
      attendees: 150,
      maxAttendees: 300,
      organizer: "익산시청",
      status: "완료",
      tags: ["반려동물", "문화체험", "음악회", "펫티켓", "반려동물 친화관광도시"],
      sourceUrl: "https://www.jjan.kr/article/20250712580069",
      thumbnailUrl: "https://tse3.mm.bing.net/th/id/OIP._D4iSsXD0kjWw4hBbdyX5gHaHa?r=0&pid=Api",
      lastUpdated: new Date().toISOString()
    },
    {
      id: 2,
      name: "2025 케이펫페어 마곡",
      location: {
        address: "서울특별시 강서구 마곡중앙로 38 (코엑스 마곡전시장)",
        lat: 37.5635,
        lng: 126.8266
      },
      startDate: "2025-06-13",
      endDate: "2025-06-15",
      time: "오전 10:00 - 오후 6:00",
      description: "아시아 최대 규모의 반려동물 전시회. 최신 펫 트렌드, 제품 체험, 전문가 강연, 반려동물 동반 입장 가능한 다양한 프로그램이 진행됩니다.",
      category: "전시회",
      price: "5000",
      attendees: 12000,
      maxAttendees: 15000,
      organizer: "케이펫페어 조직위원회",
      status: "완료",
      tags: ["전시회", "펫용품", "전문가강연", "트렌드"],
      sourceUrl: "https://www.kpetfair.co.kr/",
      thumbnailUrl: "https://tse3.mm.bing.net/th/id/OIP._D4iSsXD0kjWw4hBbdyX5gHaHa?r=0&pid=Api",
      lastUpdated: new Date().toISOString()
    },
    {
      id: 3,
      name: "한강 반려동물 동반 피크닉",
      location: {
        address: "서울특별시 마포구 망원동 (망원한강공원)",
        lat: 37.5547,
        lng: 126.8967
      },
      startDate: "2025-05-25",
      endDate: "2025-05-25",
      time: "오전 11:00 - 오후 4:00",
      description: "한강에서 펼쳐지는 반려동물과 함께하는 힐링 피크닉. 반려동물 건강 체크, 훈련 체험, 사진 촬영 등 다양한 프로그램이 준비되어 있습니다.",
      category: "자연체험",
      price: "무료",
      attendees: 800,
      maxAttendees: 1000,
      organizer: "서울특별시",
      status: "완료",
      tags: ["한강", "피크닉", "힐링", "건강체크", "훈련체험"],
      sourceUrl: "https://hangang.seoul.go.kr/",
      thumbnailUrl: "https://tse3.mm.bing.net/th/id/OIP._D4iSsXD0kjWw4hBbdyX5gHaHa?r=0&pid=Api",
      lastUpdated: new Date().toISOString()
    },
    {
      id: 4,
      name: "부산 기장 반려동물 문화축제",
      location: {
        address: "부산광역시 기장군 정관읍 정관로 804 (정관 중앙공원)",
        lat: 35.3105,
        lng: 129.2086
      },
      startDate: "2025-06-07",
      endDate: "2025-06-07",
      time: "오전 10:00 - 오후 6:00",
      description: "정관 중앙공원 잔디광장에서 열리는 반려동물 문화축제. 펫푸드·미용체험, 행동교육, 산책예절 교육 등 다양한 프로그램이 진행됩니다.",
      category: "지역축제",
      price: "무료",
      attendees: 2500,
      maxAttendees: 5000,
      organizer: "부산광역시 기장군",
      status: "완료",
      tags: ["문화축제", "펫미용", "행동교육", "산책예절"],
      sourceUrl: "https://www.instagram.com/p/DJ5hYHMS3v_/",
      thumbnailUrl: "https://tse3.mm.bing.net/th/id/OIP._D4iSsXD0kjWw4hBbdyX5gHaHa?r=0&pid=Api",
      lastUpdated: new Date().toISOString()
    },
    {
      id: 5,
      name: "가평 반려동물 문화행사 '활짝펫'",
      location: {
        address: "경기도 가평군 상면 수목원로 432 (가평 수목원)",
        lat: 37.7447,
        lng: 127.3729
      },
      startDate: "2025-05-15",
      endDate: "2025-05-17",
      time: "오전 10:00 - 오후 5:00",
      description: "산책형 문화 행사로 오프리쉬존, 펫게임, 산책, 행동교육, 체험 마켓 등이 포함된 자연 친화적인 반려동물 축제입니다.",
      category: "자연체험",
      price: "무료",
      attendees: 1200,
      maxAttendees: 3000,
      organizer: "가평군",
      status: "완료",
      tags: ["산책", "자연체험", "오프리쉬존", "펫게임", "행동교육"],
      sourceUrl: "https://korean.visitkorea.or.kr/kfes/detail/fstvlDetail.do?fstvlCntntsId=29ce22e7-6d69-40e4-9d74-1c306a339b16",
      thumbnailUrl: "https://tse3.mm.bing.net/th/id/OIP._D4iSsXD0kjWw4hBbdyX5gHaHa?r=0&pid=Api",
      lastUpdated: new Date().toISOString()
    },
    {
      id: 6,
      name: "궁디팡팡 캣페스타",
      location: {
        address: "서울특별시 서초구 강남대로 27 (aT센터)",
        lat: 37.4848,
        lng: 127.0347
      },
      startDate: "2025-06-13",
      endDate: "2025-06-16",
      time: "오전 10:00 - 오후 6:00",
      description: "고양이 전용 축제로 신제품 체험, 굿즈 증정, 포토존, 행동 전문가 강연, 수의사 Q&A 등 고양이 전문 프로그램이 진행됩니다.",
      category: "전시회",
      price: "8000",
      attendees: 5000,
      maxAttendees: 10000,
      organizer: "캣페스타 조직위원회",
      status: "완료",
      tags: ["고양이", "캣페스타", "전시회", "수의사", "행동전문가"],
      sourceUrl: "https://muhwagwalab.tistory.com/entry/2025-양재-박람회-일정·위치·주차-총정리-궁디팡팡-캣페스타-꿀팁",
      thumbnailUrl: "https://tse3.mm.bing.net/th/id/OIP._D4iSsXD0kjWw4hBbdyX5gHaHa?r=0&pid=Api",
      lastUpdated: new Date().toISOString()
    },
    {
      id: 7,
      name: "춘천 반려동물 페스티벌",
      location: {
        address: "강원도 춘천시 서면 박사로 854 (애니메이션 박물관)",
        lat: 37.8813,
        lng: 127.7298
      },
      startDate: "2025-09-25",
      endDate: "2025-09-27",
      time: "오전 10:00 - 오후 6:00",
      description: "강원정보문화산업진흥원 애니메이션 박물관 일대에서 열리는 반려동물 축제. 다양한 체험 프로그램과 교육 세션이 진행됩니다.",
      category: "지역축제",
      price: "무료",
      attendees: 0,
      maxAttendees: 8000,
      organizer: "춘천시 / 강원정보문화산업진흥원",
      status: "예정",
      tags: ["지역축제", "애니메이션", "교육", "체험"],
      sourceUrl: "https://korean.visitkorea.or.kr/kfes/detail/fstvlDetail.do?fstvlCntntsId=eb8683a5-3ca8-4636-8ad1-0d089533bb87",
      thumbnailUrl: "https://tse3.mm.bing.net/th/id/OIP._D4iSsXD0kjWw4hBbdyX5gHaHa?r=0&pid=Api",
      lastUpdated: new Date().toISOString()
    }
  ];

  constructor() {
    console.log('🔄 운영 환경용 메모리 저장소 초기화...');
    this.initializeData();
    this.initializeSubstituteTrainerData();
    this.initializeLogoSettings();
  }

  private initializeData() {
    // 기본 사용자 데이터
    this.users = [
      {
        id: 1,
        name: '관리자',
        email: 'admin@talez.com',
        username: 'admin',
        password: 'admin123',
        role: 'admin',
        verified: true,
        createdAt: new Date('2025-01-01').toISOString(),
        lastLoginAt: new Date().toISOString()
      },
      {
        id: 2,
        name: '강동훈',
        email: 'donghoong@wangzzang.com',
        role: 'trainer',
        password: 'trainer123',
        isVerified: true,
        certification: '반려동물행동지도사 국가자격증 2급',
        experience: 5,
        specialization: ['기초 훈련', '문제 행동 교정', '사회화 훈련'],
        createdAt: new Date().toISOString()
      },
      {
        id: 3,
        name: '테스트 사용자',
        email: 'test@talez.com',
        username: 'testuser',
        password: 'test123',
        role: 'user',
        verified: true,
        createdAt: new Date('2025-01-10').toISOString(),
        lastLoginAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() // 2일 전
      }
    ];

    // 기본 반려동물 데이터
    this.pets = [
      {
        id: 1,
        name: '맥스',
        species: 'dog',
        breed: '골든리트리버',
        age: 3,
        gender: 'male',
        weight: 25,
        color: '골든',
        personality: '활발하고 친근함',
        medicalHistory: '',
        specialNotes: '',
        imageUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=max',
        ownerId: 3,
        trainingStatus: 'assigned',
        assignedTrainerId: 2,
        assignedTrainerName: '강동훈',
        trainingType: 'basic',
        notebookEnabled: true,
        trainingStartDate: new Date().toISOString(),
        lastNotebookEntry: '오늘 기초 훈련 진행',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 2,
        name: '루이',
        species: 'dog',
        breed: '시바이누',
        age: 2,
        gender: 'male',
        weight: 15,
        color: '갈색',
        personality: '조용하고 독립적',
        medicalHistory: '',
        specialNotes: '',
        imageUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=louis',
        ownerId: 3,
        trainingStatus: 'not_assigned',
        assignedTrainerId: null,
        assignedTrainerName: null,
        trainingType: null,
        notebookEnabled: false,
        trainingStartDate: null,
        lastNotebookEntry: null,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    // 구독 플랜 데이터 초기화
    this.subscriptionPlans = [
      {
        id: 1,
        name: '스타터 플랜',
        code: 'starter',
        description: '소규모 기관을 위한 기본 플랜',
        price: 150000,
        currency: 'KRW',
        billingPeriod: 'monthly',
        maxMembers: 50,
        maxVideoHours: 10,
        maxAiAnalysis: 50,
        features: {
          basicLMS: true,
          basicVideoConsultation: true,
          basicStatistics: true,
          aiRecommendation: false,
          customBranding: false,
          apiIntegration: false,
          dedicatedSupport: false,
          whiteLabel: false
        },
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 2,
        name: '스탠다드 플랜',
        code: 'standard',
        description: '중간 규모 기관을 위한 고급 플랜',
        price: 300000,
        currency: 'KRW',
        billingPeriod: 'monthly',
        maxMembers: 200,
        maxVideoHours: 30,
        maxAiAnalysis: 100,
        features: {
          basicLMS: true,
          basicVideoConsultation: true,
          basicStatistics: true,
          aiRecommendation: true,
          customBranding: true,
          apiIntegration: false,
          dedicatedSupport: false,
          whiteLabel: false
        },
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 3,
        name: '프로페셔널 플랜',
        code: 'professional',
        description: '대규모 기관을 위한 전문 플랜',
        price: 500000,
        currency: 'KRW',
        billingPeriod: 'monthly',
        maxMembers: 500,
        maxVideoHours: -1, // 무제한
        maxAiAnalysis: 200,
        features: {
          basicLMS: true,
          basicVideoConsultation: true,
          basicStatistics: true,
          aiRecommendation: true,
          customBranding: true,
          apiIntegration: true,
          dedicatedSupport: true,
          whiteLabel: false
        },
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 4,
        name: '엔터프라이즈 플랜',
        code: 'enterprise',
        description: '대형 기관을 위한 맞춤형 플랜',
        price: 800000,
        currency: 'KRW',
        billingPeriod: 'monthly',
        maxMembers: -1, // 무제한
        maxVideoHours: -1, // 무제한
        maxAiAnalysis: -1, // 무제한
        features: {
          basicLMS: true,
          basicVideoConsultation: true,
          basicStatistics: true,
          aiRecommendation: true,
          customBranding: true,
          apiIntegration: true,
          dedicatedSupport: true,
          whiteLabel: true
        },
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    // 기관 데이터 초기화 - 왕짱스쿨만 유지
    this.institutes = [
      {
        id: 6,
        name: '왕짱스쿨',
        code: 'WZS001',
        businessNumber: '123-45-67890',
        address: '경북 구미시 구평동 661',
        phone: '010-4765-1909',
        email: 'contact@wangzzang.com',
        directorName: '강동훈',
        directorEmail: 'donghoong@wangzzang.com',
        trainerName: '강동훈',
        trainerId: 2,
        status: 'active',
        isActive: true,
        isVerified: true,
        certification: '반려동물행동지도사 국가자격증 2급',
        establishedDate: '2020-01-01',
        registeredDate: '2024-01-15',
        trainersCount: 1,
        studentsCount: 87,
        coursesCount: 6,
        facilities: ['실내 훈련장', '야외 훈련장', '대기실', '상담실', '애견유치원'],
        // 구독 플랜 정보
        subscriptionPlan: 'standard',
        subscriptionStatus: 'active',
        subscriptionStartDate: new Date().toISOString(),
        subscriptionEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        maxMembers: 200,
        maxVideoHours: 30,
        maxAiAnalysis: 100,
        featuresEnabled: {
          basicLMS: true,
          basicVideoConsultation: true,
          basicStatistics: true,
          aiRecommendation: true,
          customBranding: true,
          apiIntegration: false,
          dedicatedSupport: false,
          whiteLabel: false
        },
        operatingHours: '평일 09:00-18:00, 토요일 09:00-18:00, 일요일 휴무',
        description: '국가자격증 훈련부터 반려동물 교감 교육까지! 반려견과 보호자의 "진짜 관계"를 만들어 드리는 전문 교육기관입니다.',
        website: 'https://wangzzang.com',
        specialPrograms: [
          '구미시 2025 미래교육지구 마을학교 "반려꿈터" 운영',
          '정신건강 및 특수교육 대상자를 위한 교감 활동',
          '경북소방본부, 교육기관 대상 강의 및 상담'
        ],
        createdAt: new Date().toISOString()
      }
    ];

    // 훈련 일지 샘플 데이터 - 다양한 훈련사들의 알림장 포함
    this.trainingJournals = [
      // 강동훈 훈련사 (id: 1)
      {
        id: 1,
        trainerId: 1,
        petId: 1,
        trainerName: "강동훈",
        petName: "맥스",
        title: "기본 복종 훈련 1회차",
        content: "오늘은 맥스와 함께 기본적인 앉기, 기다리기 훈련을 진행했습니다. 처음에는 산만했지만 점차 집중력이 향상되었습니다.",
        trainingDate: "2025-01-10",
        status: "sent",
        createdAt: new Date('2025-01-10').toISOString(),
        sentAt: new Date('2025-01-10T18:00:00').toISOString(),
        trainer: { name: "강동훈" },
        pet: { name: "맥스" }
      },
      {
        id: 2,
        trainerId: 1,
        petId: 1,
        trainerName: "강동훈",
        petName: "맥스",
        title: "기본 복종 훈련 2회차",
        content: "앉기 명령에 대한 반응이 좋아졌습니다. 이제 손신호도 함께 병행하여 훈련하고 있습니다.",
        trainingDate: "2025-01-12",
        status: "read",
        createdAt: new Date('2025-01-12').toISOString(),
        sentAt: new Date('2025-01-12T18:30:00').toISOString(),
        readAt: new Date('2025-01-12T20:15:00').toISOString(),
        trainer: { name: "강동훈" },
        pet: { name: "맥스" }
      },
      {
        id: 3,
        trainerId: 1,
        petId: 2,
        trainerName: "강동훈",
        petName: "루나",
        title: "사회화 훈련 1회차",
        content: "루나는 다른 개들과의 만남에 약간 긴장하는 모습을 보였습니다. 천천히 적응할 수 있도록 도와주겠습니다.",
        trainingDate: "2025-01-13",
        status: "draft",
        createdAt: new Date('2025-01-13').toISOString(),
        trainer: { name: "강동훈" },
        pet: { name: "루나" }
      },
      {
        id: 4,
        trainerId: 1,
        petId: 3,
        trainerName: "강동훈",
        petName: "초코",
        title: "문제 행동 교정 1회차",
        content: "짖는 행동에 대한 교정 훈련을 시작했습니다. 원인을 파악하고 단계별로 접근하고 있습니다.",
        trainingDate: "2025-01-14",
        status: "sent",
        createdAt: new Date('2025-01-14').toISOString(),
        sentAt: new Date('2025-01-14T19:00:00').toISOString(),
        trainer: { name: "강동훈" },
        pet: { name: "초코" }
      },
      {
        id: 5,
        trainerId: 1,
        petId: 1,
        trainerName: "강동훈",
        petName: "맥스",
        title: "기본 복종 훈련 3회차",
        content: "맥스가 '엎드려' 명령을 완전히 습득했습니다. 이제 거리를 두고도 명령을 잘 따릅니다.",
        trainingDate: "2025-01-15",
        status: "read",
        createdAt: new Date('2025-01-15').toISOString(),
        sentAt: new Date('2025-01-15T18:45:00').toISOString(),
        readAt: new Date('2025-01-15T21:30:00').toISOString(),
        trainer: { name: "강동훈" },
        pet: { name: "맥스" }
      },
      // 김민수 훈련사 (id: 2)
      {
        id: 6,
        trainerId: 2,
        petId: 2,
        trainerName: "김민수",
        petName: "루나",
        title: "어질리티 훈련 1회차",
        content: "루나의 운동 능력이 뛰어나서 어질리티 훈련을 시작했습니다. 장애물 뛰어넘기에 자신감을 보입니다.",
        trainingDate: "2025-01-11",
        status: "sent",
        createdAt: new Date('2025-01-11').toISOString(),
        sentAt: new Date('2025-01-11T17:30:00').toISOString(),
        trainer: { name: "김민수" },
        pet: { name: "루나" }
      },
      {
        id: 7,
        trainerId: 2,
        petId: 3,
        trainerName: "김민수",
        petName: "초코",
        title: "산책 훈련 1회차",
        content: "초코가 산책 시 당기는 습관을 교정하는 훈련을 했습니다. 조금씩 개선되고 있어요.",
        trainingDate: "2025-01-12",
        status: "read",
        createdAt: new Date('2025-01-12').toISOString(),
        sentAt: new Date('2025-01-12T16:15:00').toISOString(),
        readAt: new Date('2025-01-12T19:45:00').toISOString(),
        trainer: { name: "김민수" },
        pet: { name: "초코" }
      },
      {
        id: 8,
        trainerId: 2,
        petId: 1,
        trainerName: "김민수",
        petName: "맥스",
        title: "고급 복종 훈련 1회차",
        content: "맥스가 기본 훈련을 완료하여 고급 과정으로 진입했습니다. 원거리 명령 훈련을 시작합니다.",
        trainingDate: "2025-01-13",
        status: "sent",
        createdAt: new Date('2025-01-13').toISOString(),
        sentAt: new Date('2025-01-13T17:00:00').toISOString(),
        trainer: { name: "김민수" },
        pet: { name: "맥스" }
      },
      // 박지혜 훈련사 (id: 3)
      {
        id: 9,
        trainerId: 3,
        petId: 2,
        trainerName: "박지혜",
        petName: "루나",
        title: "반응성 훈련 1회차",
        content: "루나가 다른 개에게 과도한 반응을 보이는 문제를 다루고 있습니다. 진전이 보입니다.",
        trainingDate: "2025-01-10",
        status: "read",
        createdAt: new Date('2025-01-10').toISOString(),
        sentAt: new Date('2025-01-10T15:20:00').toISOString(),
        readAt: new Date('2025-01-10T18:10:00').toISOString(),
        trainer: { name: "박지혜" },
        pet: { name: "루나" }
      },
      {
        id: 10,
        trainerId: 3,
        petId: 3,
        trainerName: "박지혜",
        petName: "초코",
        title: "분리불안 훈련 1회차",
        content: "초코의 분리불안 증상을 완화하기 위한 훈련을 시작했습니다. 단계적으로 접근하고 있습니다.",
        trainingDate: "2025-01-14",
        status: "sent",
        createdAt: new Date('2025-01-14').toISOString(),
        sentAt: new Date('2025-01-14T16:45:00').toISOString(),
        trainer: { name: "박지혜" },
        pet: { name: "초코" }
      },
      // 최예린 훈련사 (id: 4)
      {
        id: 11,
        trainerId: 4,
        petId: 1,
        trainerName: "최예린",
        petName: "맥스",
        title: "트릭 훈련 1회차",
        content: "맥스에게 재미있는 트릭들을 가르치고 있습니다. '하이파이브'를 성공적으로 배웠어요!",
        trainingDate: "2025-01-11",
        status: "read",
        createdAt: new Date('2025-01-11').toISOString(),
        sentAt: new Date('2025-01-11T14:30:00').toISOString(),
        readAt: new Date('2025-01-11T20:15:00').toISOString(),
        trainer: { name: "최예린" },
        pet: { name: "맥스" }
      },
      {
        id: 12,
        trainerId: 4,
        petId: 2,
        trainerName: "최예린",
        petName: "루나",
        title: "노즈워크 훈련 1회차",
        content: "루나의 후각 능력을 활용한 노즈워크 훈련을 시작했습니다. 매우 집중력이 좋아요.",
        trainingDate: "2025-01-15",
        status: "draft",
        createdAt: new Date('2025-01-15').toISOString(),
        trainer: { name: "최예린" },
        pet: { name: "루나" }
      },
      // 정수현 훈련사 (id: 5)
      {
        id: 13,
        trainerId: 5,
        petId: 3,
        trainerName: "정수현",
        petName: "초코",
        title: "기본 매너 훈련 1회차",
        content: "초코에게 기본적인 매너를 가르치고 있습니다. 인사법과 차분히 기다리기를 연습했어요.",
        trainingDate: "2025-01-13",
        status: "sent",
        createdAt: new Date('2025-01-13').toISOString(),
        sentAt: new Date('2025-01-13T13:45:00').toISOString(),
        trainer: { name: "정수현" },
        pet: { name: "초코" }
      },
      {
        id: 14,
        trainerId: 5,
        petId: 1,
        trainerName: "정수현",
        petName: "맥스",
        title: "심화 복종 훈련 1회차",
        content: "맥스의 복종 훈련을 한 단계 더 발전시키고 있습니다. 복잡한 명령 조합을 연습하고 있어요.",
        trainingDate: "2025-01-14",
        status: "read",
        createdAt: new Date('2025-01-14').toISOString(),
        sentAt: new Date('2025-01-14T15:20:00').toISOString(),
        readAt: new Date('2025-01-14T17:55:00').toISOString(),
        trainer: { name: "정수현" },
        pet: { name: "맥스" }
      },
      {
        id: 15,
        trainerId: 5,
        petId: 2,
        trainerName: "정수현",
        petName: "루나",
        title: "사회화 심화 훈련 1회차",
        content: "루나의 사회화 능력을 더욱 발전시키기 위해 다양한 환경에서 훈련을 진행했습니다.",
        trainingDate: "2025-01-15",
        status: "sent",
        createdAt: new Date('2025-01-15').toISOString(),
        sentAt: new Date('2025-01-15T14:10:00').toISOString(),
        trainer: { name: "정수현" },
        pet: { name: "루나" }
      }
    ];

    // courses data - 커리큘럼 가격 정보 포함
    this.courses = [
      {
        id: 1,
        title: "기초 복종 훈련 완전정복",
        description: "반려견의 기본적인 복종 훈련을 체계적으로 배우는 8주 완성 과정입니다. 앉아, 기다려, 이리와 등 기본 명령어부터 산책 매너까지 완전히 마스터할 수 있습니다.",
        trainerId: 1,
        trainerName: "강동훈",
        duration: 8,
        level: "beginner",
        category: "기초 훈련",
        price: 280000,
        maxStudents: 20,
        currentStudents: 15,
        status: "published",
        enrollmentCount: 15,
        averageRating: 4.7,
        reviewCount: 12,
        thumbnailUrl: "https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=400&h=300&fit=crop&crop=center&auto=format", // 강아지 훈련 썸네일
        modules: [
          {
            id: 1,
            title: "기본 자세 훈련",
            description: "앉아, 엎드려, 일어나 등 기본 자세 명령어 훈련",
            duration: 60,
            isFree: false,
            price: 35000,
            order: 1,
            videoUrl: null,
            materials: ['훈련용 간식', '클리커', '타겟 스틱', '매트']
          },
          {
            id: 2,
            title: "호명 반응 훈련",
            description: "이름 부르기에 대한 반응 향상 훈련",
            duration: 60,
            isFree: false,
            price: 35000,
            order: 2,
            videoUrl: null,
            materials: ['고급 간식', '휘슬', '긴 리드줄']
          },
          {
            id: 3,
            title: "기다려 명령 훈련",
            description: "인내심을 기르는 기다려 명령 집중 훈련",
            duration: 60,
            isFree: false,
            price: 35000,
            order: 3,
            videoUrl: null,
            materials: ['훈련용 간식', '타이머', '매트', '장난감']
          },
          {
            id: 4,
            title: "이리와 명령 훈련",
            description: "안전한 호출 훈련과 즉시 반응 훈련",
            duration: 60,
            isFree: false,
            price: 35000,
            order: 4,
            videoUrl: null,
            materials: ['긴 리드줄', '호루라기', '고급 간식', '공']
          },
          {
            id: 5,
            title: "산책 매너 훈련",
            description: "리드줄 당기지 않기와 산책 예절 훈련",
            duration: 60,
            isFree: false,
            price: 35000,
            order: 5,
            videoUrl: null,
            materials: ['목줄', '가슴줄', '짧은 리드줄', '긴 리드줄', '간식 파우치']
          },
          {
            id: 6,
            title: "실외 복종 훈련",
            description: "실외 환경에서의 복종 명령 적용 훈련",
            duration: 60,
            isFree: false,
            price: 35000,
            order: 6,
            videoUrl: null,
            materials: ['실외용 간식', '목줄', '리드줄', '물통', '휴지']
          },
          {
            id: 7,
            title: "사회화 기초 훈련",
            description: "다른 개와 사람에 대한 사회화 훈련",
            duration: 60,
            isFree: false,
            price: 35000,
            order: 7,
            videoUrl: null,
            materials: ['사회성 간식', '장난감', '목줄', '리드줄']
          },
          {
            id: 8,
            title: "종합 평가 및 마무리",
            description: "전체 훈련 과정 종합 평가 및 유지 방법",
            duration: 60,
            isFree: false,
            price: 35000,
            order: 8,
            videoUrl: null,
            materials: ['졸업증서', '기념품', '평가서', '사진']
          }
        ],
        createdAt: new Date('2025-01-10').toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 2,
        title: "퍼피 사회화 전문 과정",
        description: "생후 3-6개월 강아지를 위한 사회화 전문 과정입니다. 사람, 동물, 환경에 대한 적응력을 키우고 건강한 성격 형성을 도움니다.",
        trainerId: 2,
        trainerName: "김민수",
        duration: 6,
        level: "beginner",
        category: "사회화",
        price: 320000,
        maxStudents: 15,
        currentStudents: 8,
        status: "published",
        enrollmentCount: 8,
        averageRating: 4.8,
        reviewCount: 6,
        thumbnailUrl: "https://images.unsplash.com/photo-1552053831-71594a2d55t?w=400&h=300&fit=crop&crop=center&auto=format", // 퍼피 사회화 썸네일
        modules: [
          {
            id: 1,
            title: "사회화 기초 이론",
            description: "퍼피 사회화의 중요성과 기본 원리",
            duration: 45,
            isFree: true,
            price: 0,
            order: 1,
            videoUrl: null,
            materials: ['교육 자료', '사회화 체크리스트', '핸드북']
          },
          {
            id: 2,
            title: "사람에 대한 사회화",
            description: "다양한 연령대와 외모의 사람들과 친화력 기르기",
            duration: 60,
            isFree: false,
            price: 53000,
            order: 2,
            videoUrl: null,
            materials: ['사회화 간식', '인형', '다양한 모자', '장갑']
          },
          {
            id: 3,
            title: "동물 간 사회화",
            description: "다른 강아지들과의 건전한 상호작용 훈련",
            duration: 60,
            isFree: false,
            price: 53000,
            order: 3,
            videoUrl: null,
            materials: ['사회화 간식', '장난감', '목줄', '리드줄']
          },
          {
            id: 4,
            title: "환경 적응 훈련",
            description: "다양한 소리와 환경에 대한 적응 훈련",
            duration: 60,
            isFree: false,
            price: 53000,
            order: 4,
            videoUrl: null,
            materials: ['음향 기기', '다양한 소리 파일', '포상 간식', '장난감']
          },
          {
            id: 5,
            title: "핸들링 적응 훈련",
            description: "목욕, 미용, 건강 체크 등 핸들링 적응",
            duration: 60,
            isFree: false,
            price: 53000,
            order: 5,
            videoUrl: null,
            materials: ['미용 도구', '핸들링 간식', '브러시', '수건']
          },
          {
            id: 6,
            title: "종합 사회화 테스트",
            description: "전체 사회화 과정 평가 및 향후 계획",
            duration: 60,
            isFree: false,
            price: 53000,
            order: 6,
            videoUrl: null,
            materials: ['평가서', '졸업증서', '기념품', '포상 간식']
          }
        ],
        createdAt: new Date('2025-01-08').toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 3,
        title: "문제 행동 교정 마스터 클래스",
        description: "짖음, 물기, 분리불안 등 다양한 문제 행동을 체계적으로 교정하는 전문 과정입니다. 행동 분석부터 교정 방법까지 완전 마스터할 수 있습니다.",
        trainerId: 3,
        trainerName: "박지혜",
        duration: 10,
        level: "advanced",
        category: "행동 교정",
        price: 450000,
        maxStudents: 12,
        currentStudents: 10,
        status: "published",
        enrollmentCount: 10,
        averageRating: 4.9,
        reviewCount: 8,
        thumbnailUrl: "https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=400&h=300&fit=crop&crop=center&auto=format", // 행동 교정 썸네일
        modules: [
          {
            id: 1,
            title: "행동 분석 기초",
            description: "문제 행동의 원인 분석과 평가 방법",
            duration: 90,
            isFree: false,
            price: 45000,
            order: 1,
            videoUrl: null,
            materials: ['행동 분석 체크리스트', '관찰 기록지', '평가 도구', '교육 자료']
          },
          {
            id: 2,
            title: "짖음 교정 훈련",
            description: "짖음 행동의 원인별 교정 방법",
            duration: 90,
            isFree: false,
            price: 45000,
            order: 2,
            videoUrl: null,
            materials: ['무시 훈련 도구', '분산 장난감', '진정 스프레이']
          },
          {
            id: 3,
            title: "물기 행동 교정",
            description: "공격성과 물기 행동 교정 전문 기법",
            duration: 90,
            isFree: false,
            price: 45000,
            order: 3,
            videoUrl: null,
            materials: ['보호장갑', '물기 억제 장난감', '교정 간식', '안전 도구']
          },
          {
            id: 4,
            title: "분리불안 치료",
            description: "분리불안 증상 완화와 독립성 기르기",
            duration: 90,
            isFree: false,
            price: 45000,
            order: 4,
            videoUrl: null,
            materials: ['분리 훈련 도구', '안정화 음악', '퍼즐 장난감']
          },
          {
            id: 5,
            title: "파괴 행동 교정",
            description: "집 안 파괴 행동 예방과 교정 방법",
            duration: 90,
            isFree: false,
            price: 45000,
            order: 5,
            videoUrl: null,
            materials: ['파괴 방지 스프레이', '내구성 장난감', '교정 도구', '보호 용품']
          },
          {
            id: 6,
            title: "식탐 행동 교정",
            description: "음식 보호 행동과 식탐 교정 훈련",
            duration: 90,
            isFree: false,
            price: 45000,
            order: 6,
            videoUrl: null,
            materials: ['급식 도구', '퍼즐 피더', '교정 간식', '슬로우 피더']
          },
          {
            id: 7,
            title: "과잉 활동 조절",
            description: "과도한 활동량과 흥분 조절 훈련",
            duration: 90,
            isFree: false,
            price: 45000,
            order: 7,
            videoUrl: null,
            materials: ['진정 매트', '릴렉스 음악', '진정 간식', '활동 제어 도구']
          },
          {
            id: 8,
            title: "반응성 교정",
            description: "다른 개나 사람에 대한 과도한 반응 교정",
            duration: 90,
            isFree: false,
            price: 45000,
            order: 8,
            videoUrl: null,
            materials: ['헤드컬러', '트레이닝 리드', '분산 간식', '차단 도구']
          },
          {
            id: 9,
            title: "스트레스 관리",
            description: "스트레스 신호 인식과 관리 방법",
            duration: 90,
            isFree: false,
            price: 45000,
            order: 9,
            videoUrl: null,
            materials: ['스트레스 측정 도구', '진정 제품', '휴식 매트', '안정 음악']
          },
          {
            id: 10,
            title: "종합 교정 계획",
            description: "개별 맞춤형 교정 계획 수립 및 실행",
            duration: 90,
            isFree: false,
            price: 45000,
            order: 10,
            videoUrl: null,
            materials: ['종합 평가서', '개별 계획서', '교정 도구 세트', '진행 체크리스트']
          }
        ],
        createdAt: new Date('2025-01-05').toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    // 포인트 설정 초기화
    this.pointSettings = {
      video_upload: { points: 50, incentivePerPoint: 1000 },
      comment: { points: 5, incentivePerPoint: 500 },
      view: { points: 1, incentivePerPoint: 100 },
      member_recruitment: { points: 100, incentivePerPoint: 2000 },
      certification: { points: 200, incentivePerPoint: 5000 },
      consultation: { points: 30, incentivePerPoint: 1500 },
      course_creation: { points: 150, incentivePerPoint: 3000 }
    };

    // 샘플 활동 로그 데이터
    this.trainerActivityLogs = [
      {
        id: 1,
        trainerId: 2,
        trainerName: "강동훈",
        activityType: "video_upload",
        activityTitle: "기초 복종 훈련 영상 업로드",
        activityDescription: "앉아, 기다려 명령어 훈련 영상을 업로드했습니다.",
        pointsEarned: 50,
        incentiveAmount: "50000",
        metadata: { videoId: "v001", duration: "15:30", views: 125 },
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 2,
        trainerId: 2,
        trainerName: "강동훈",
        activityType: "comment",
        activityTitle: "커뮤니티 댓글 작성",
        activityDescription: "반려견 산책 관련 질문에 전문적인 답변을 제공했습니다.",
        pointsEarned: 5,
        incentiveAmount: "2500",
        metadata: { postId: "p123", commentLength: 200 },
        createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 3,
        trainerId: 2,
        trainerName: "강동훈",
        activityType: "view",
        activityTitle: "영상 조회수 달성",
        activityDescription: "기초 복종 훈련 영상이 100회 조회를 달성했습니다.",
        pointsEarned: 100,
        incentiveAmount: "10000",
        metadata: { videoId: "v001", totalViews: 100 },
        createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 4,
        trainerId: 3,
        trainerName: "이미정",
        activityType: "member_recruitment",
        activityTitle: "신규 회원 추천",
        activityDescription: "지인을 통해 신규 회원 1명을 추천하여 가입을 유도했습니다.",
        pointsEarned: 100,
        incentiveAmount: "200000",
        metadata: { newMemberId: "m456", referralCode: "REF001" },
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 5,
        trainerId: 3,
        trainerName: "이미정",
        activityType: "certification",
        activityTitle: "반려동물 행동 교정사 자격증 취득",
        activityDescription: "한국반려동물협회 공인 행동 교정사 자격증을 취득했습니다.",
        pointsEarned: 200,
        incentiveAmount: "1000000",
        metadata: { certificationId: "C789", issueDate: "2025-01-15" },
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 6,
        trainerId: 4,
        trainerName: "박지혜",
        activityType: "consultation",
        activityTitle: "온라인 상담 완료",
        activityDescription: "프렌치 불독 분리불안 상담을 성공적으로 완료했습니다.",
        pointsEarned: 30,
        incentiveAmount: "45000",
        metadata: { consultationId: "cons001", duration: "60분", rating: 5 },
        createdAt: new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 7,
        trainerId: 4,
        trainerName: "박지혜",
        activityType: "course_creation",
        activityTitle: "새로운 강의 생성",
        activityDescription: "소형견 전용 사회화 훈련 강의를 새로 개설했습니다.",
        pointsEarned: 150,
        incentiveAmount: "450000",
        metadata: { courseId: "course789", modules: 8, duration: "4주" },
        createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 8,
        trainerId: 5,
        trainerName: "최예린",
        activityType: "video_upload",
        activityTitle: "트릭 훈련 영상 업로드",
        activityDescription: "반려견 트릭 훈련 시리즈 첫 번째 영상을 업로드했습니다.",
        pointsEarned: 50,
        incentiveAmount: "50000",
        metadata: { videoId: "v002", duration: "12:45", views: 87 },
        createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 9,
        trainerId: 5,
        trainerName: "최예린",
        activityType: "comment",
        activityTitle: "전문가 답변 제공",
        activityDescription: "반려견 트릭 훈련 관련 질문에 상세한 답변을 제공했습니다.",
        pointsEarned: 5,
        incentiveAmount: "2500",
        metadata: { postId: "p456", commentLength: 350 },
        createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 10,
        trainerId: 6,
        trainerName: "정수현",
        activityType: "consultation",
        activityTitle: "화상 상담 완료",
        activityDescription: "골든 리트리버 복종 훈련 화상 상담을 완료했습니다.",
        pointsEarned: 30,
        incentiveAmount: "45000",
        metadata: { consultationId: "cons002", duration: "45분", rating: 4.8 },
        createdAt: new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString()
      }
    ];
  }

  // 커리큘럼 관련 메서드들
  getCurriculums() {
    return this.courses.map(course => ({
      id: course.id,
      title: course.title,
      description: course.description,
      trainerId: course.trainerId,
      trainerName: course.trainerName,
      duration: course.duration,
      level: course.level,
      category: course.category || '기초 훈련',
      price: course.price,
      maxStudents: course.maxStudents,
      currentStudents: 0,
      status: course.status || 'published',
      createdAt: course.createdAt,
      modules: course.modules || [], // 모듈 정보 포함
      difficulty: course.difficulty || course.level || 'beginner' // 난이도 정보 포함
    }));
  }

  // 기관 관련 메서드들
  getInstitutes(): Promise<any[]> | any[] {
    return this.institutes || [];
  }

  createInstitute(instituteData: any) {
    const newInstitute = {
      id: (this.institutes?.length || 0) + 1,
      ...instituteData,
      isActive: true,
      isVerified: false,
      createdAt: new Date().toISOString()
    };

    if (!this.institutes) {
      this.institutes = [];
    }
    this.institutes.push(newInstitute);
    return newInstitute;
  }

  // 사용자 관련 메서드들
  getUsers() {
    return this.users || [];
  }

  getAllUsers() {
    return this.users || [];
  }

  getUser(id: number) {
    return this.users?.find(user => user.id === id);
  }

  getUserByEmail(email: string) {
    return this.users?.find(user => user.email === email);
  }

  async getUserByUsername(usernameOrEmail: string) {
    try {
      // 데이터베이스에서 먼저 조회 (username 또는 email로 검색)
      const selectFields = {
        id: usersTable.id,
        username: usersTable.username,
        email: usersTable.email,
        password: usersTable.password,
        role: usersTable.role,
        name: usersTable.name,
        phone: usersTable.phone,
        avatar: usersTable.avatar,
        bio: usersTable.bio,
        specialty: usersTable.specialty,
        location: usersTable.location,
        isActive: usersTable.isActive,
        emailVerified: usersTable.emailVerified,
        isVerified: usersTable.isVerified,
        approvalStatus: usersTable.approvalStatus,
        instituteId: usersTable.instituteId,
        createdAt: usersTable.createdAt,
        provider: usersTable.provider,
        socialId: usersTable.socialId
      };
      
      // username으로 먼저 검색
      let [user] = await db.select(selectFields)
        .from(usersTable)
        .where(eq(usersTable.username, usernameOrEmail));
      
      // username으로 찾지 못하면 email로 검색
      if (!user) {
        [user] = await db.select(selectFields)
          .from(usersTable)
          .where(eq(usersTable.email, usernameOrEmail));
      }
      
      if (user) {
        return user;
      }
    } catch (error) {
      logServerError('[DB] getUserByUsername 오류:', error);
    }
    
    // 데이터베이스에서 찾지 못하면 메모리에서 검색 (fallback)
    return this.users?.find(user => user.username === usernameOrEmail || user.email === usernameOrEmail);
  }

  getUserBySocialId(provider: string, socialId: string) {
    return this.users?.find(user => user.provider === provider && user.socialId === socialId);
  }

  async createUser(userData: any) {
    try {
      const [newUser] = await db.insert(usersTable).values({
        username: userData.username,
        email: userData.email,
        password: userData.password,
        name: userData.name,
        role: userData.role || 'pet-owner',
        phone: userData.phone,
        phoneNumber: userData.phoneNumber,
        birthDate: userData.birthDate,
        gender: userData.gender,
        age: userData.age,
        provider: userData.provider,
        socialId: userData.socialId,
        verified: userData.verified || false,
        verifiedAt: userData.verifiedAt,
        approvalStatus: userData.approvalStatus || 'pending',
        isActive: true
      }).returning();
      
      console.log('[DB] 사용자 생성됨:', { id: newUser.id, username: newUser.username, approvalStatus: newUser.approvalStatus });
      return newUser;
    } catch (error) {
      logServerError('[DB] createUser 오류:', error);
      
      const newUser = {
        id: (this.users?.length || 0) + 1,
        ...userData,
        createdAt: new Date().toISOString()
      };

      if (!this.users) {
        this.users = [];
      }
      this.users.push(newUser);
      return newUser;
    }
  }

  updateUser(id: number, userData: Partial<any>) {
    const userIndex = this.users?.findIndex(user => user.id === id);
    if (userIndex !== undefined && userIndex !== -1 && this.users) {
      this.users[userIndex] = {
        ...this.users[userIndex],
        ...userData,
        updatedAt: new Date().toISOString()
      };
      return this.users[userIndex];
    }
    return null;
  }

  deleteUser(id: number): boolean {
    const userIndex = this.users?.findIndex(user => user.id === id);
    if (userIndex !== undefined && userIndex !== -1 && this.users) {
      this.users.splice(userIndex, 1);
      return true;
    }
    return false;
  }

  // DB 기반 사용자 조회
  async getUserFromDB(id: number) {
    try {
      const [user] = await db.select({
        id: usersTable.id,
        username: usersTable.username,
        email: usersTable.email,
        role: usersTable.role,
        name: usersTable.name,
        phone: usersTable.phone,
        avatar: usersTable.avatar,
        bio: usersTable.bio,
        isActive: usersTable.isActive,
        isVerified: usersTable.isVerified,
        approvalStatus: usersTable.approvalStatus,
        createdAt: usersTable.createdAt
      }).from(usersTable).where(eq(usersTable.id, id)).limit(1);
      return user || null;
    } catch (error) {
      logServerError('[DB] getUserFromDB 오류:', error);
      return null;
    }
  }

  // DB 기반 사용자 수정
  async updateUserInDB(id: number, userData: { name?: string; email?: string; role?: string }) {
    try {
      const updateData: any = {};
      if (userData.name) updateData.name = userData.name;
      if (userData.email) updateData.email = userData.email;
      if (userData.role) updateData.role = userData.role;
      
      await db.update(usersTable)
        .set(updateData)
        .where(eq(usersTable.id, id));
      
      // 업데이트된 사용자 반환
      return await this.getUserFromDB(id);
    } catch (error) {
      logServerError('[DB] updateUserInDB 오류:', error);
      return null;
    }
  }

  // DB 기반 사용자 삭제
  async deleteUserFromDB(id: number): Promise<boolean> {
    try {
      await db.delete(usersTable).where(eq(usersTable.id, id));
      return true;
    } catch (error) {
      logServerError('[DB] deleteUserFromDB 오류:', error);
      return false;
    }
  }

  // DB 기반 이메일 중복 확인
  async checkEmailExistsInDB(email: string, excludeId?: number): Promise<boolean> {
    try {
      const conditions = [eq(usersTable.email, email)];
      
      let query;
      if (excludeId) {
        const [user] = await db.select({ id: usersTable.id })
          .from(usersTable)
          .where(and(eq(usersTable.email, email), sql`${usersTable.id} != ${excludeId}`))
          .limit(1);
        return !!user;
      } else {
        const [user] = await db.select({ id: usersTable.id })
          .from(usersTable)
          .where(eq(usersTable.email, email))
          .limit(1);
        return !!user;
      }
    } catch (error) {
      logServerError('[DB] checkEmailExistsInDB 오류:', error);
      return false;
    }
  }

  // 펫 관련 메서드들
  getPets() {
    return this.pets || [];
  }

  getPet(id: number) {
    return this.pets.find(pet => pet.id === id);
  }

  getPetsByUserId(userId: number) {
    return this.pets.filter(pet => pet.ownerId === userId);
  }

  createPet(petData: any) {
    const newPet = {
      id: this.pets.length ? Math.max(...this.pets.map(p => p.id)) + 1 : 1,
      ...petData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.pets.push(newPet);
    return newPet;
  }

  updatePet(id: number, updates: any) {
    const petIndex = this.pets.findIndex(pet => pet.id === id);
    if (petIndex !== -1) {
      const prev = this.pets[petIndex];
      const next = {
        ...prev,
        ...updates,
        updatedAt: new Date().toISOString()
      };
      this.pets[petIndex] = next;

      // 훈련 완료 시 보호자에게 리뷰 작성 요청 알림 (인앱 + 이메일, 1회)
      try {
        const becameCompleted =
          (updates.trainingStatus === "completed" && prev.trainingStatus !== "completed") ||
          (updates.status === "completed" && prev.status !== "completed");
        if (becameCompleted && next.ownerId && next.assignedTrainerId) {
          const completedAt =
            next.trainingEndDate || next.completedAt || next.updatedAt;
          // dynamic import 로 순환 의존 회피
          import("./services/review-request-notifier")
            .then(({ triggerReviewRequestNotification }) =>
              triggerReviewRequestNotification({
                ownerId: next.ownerId,
                trainerId: next.assignedTrainerId,
                trainerName: next.assignedTrainerName,
                petId: next.id,
                petName: next.name,
                lessonRef: `pet-${next.id}`,
                completedAt,
                storage: this,
              }),
            )
            .catch(() => {/* noop */});
        }
      } catch { /* noop */ }

      return next;
    }
    return null;
  }

  deletePet(id: number) {
    const petIndex = this.pets.findIndex(pet => pet.id === id);
    if (petIndex !== -1) {
      this.pets.splice(petIndex, 1);
      return true;
    }
    return false;
  }

  getAllPets() {
    return this.pets || [];
  }

  getPetsByOwnerId(ownerId: number) {
    return this.pets?.filter(pet => pet.ownerId === ownerId) || [];
  }

  // 알림 관련 메서드들
  private deriveNotificationCategory(type: string): string {
    if (type === "message") return "message";
    if (["reservation", "course", "training"].includes(type)) return "reservation";
    if (type === "payment") return "payment";
    return "system";
  }

  // 알림 CRUD (DB-backed, source-of-truth)
  async getNotifications() {
    return await db.select().from(notificationsTable).orderBy(desc(notificationsTable.createdAt));
  }

  async getNotificationById(id: number) {
    const [row] = await db.select().from(notificationsTable).where(eq(notificationsTable.id, id));
    return row || null;
  }

  async getNotificationsByUserId(userId: number, query: any = {}) {
    const conds = [eq(notificationsTable.userId, userId)];
    if (query.type) conds.push(eq(notificationsTable.type, query.type));
    if (query.category) conds.push(eq(notificationsTable.category, query.category));
    if (query.isRead !== undefined) conds.push(eq(notificationsTable.isRead, query.isRead));

    const where = conds.length > 1 ? and(...conds) : conds[0];

    const page = query.page || 1;
    const limit = query.limit || 10;
    const offsetVal = (page - 1) * limit;

    // SQL 레벨에서 페이지네이션 + 별도 count 쿼리 (대규모 데이터에서도 효율적)
    const [paginated, countRows] = await Promise.all([
      db
        .select()
        .from(notificationsTable)
        .where(where)
        .orderBy(desc(notificationsTable.createdAt))
        .limit(limit)
        .offset(offsetVal),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(notificationsTable)
        .where(where),
    ]);
    const total = countRows[0]?.count ?? 0;
    return {
      notifications: paginated,
      total,
      page,
      limit,
      hasMore: offsetVal + limit < total,
    };
  }

  async createNotification(notificationData: any) {
    const category = notificationData.category || this.deriveNotificationCategory(notificationData.type);
    const [created] = await db
      .insert(notificationsTable)
      .values({
        userId: notificationData.userId,
        title: notificationData.title,
        message: notificationData.message,
        type: notificationData.type,
        category,
        isRead: notificationData.isRead ?? false,
        actionUrl: notificationData.actionUrl ?? null,
        metadata: notificationData.metadata ?? null,
      })
      .returning();
    return created;
  }

  // 알림 수신 설정 메서드들 (DB-backed, errors propagate to caller)
  async getNotificationPreferences(userId: number): Promise<Array<{
    userId: number;
    category: string;
    inAppEnabled: boolean;
    pushEnabled: boolean;
  }>> {
    const categories = ["message", "reservation", "payment", "system"];
    const rows = await db
      .select()
      .from(notificationPreferencesTable)
      .where(eq(notificationPreferencesTable.userId, userId));
    return categories.map(category => {
      const existing = rows.find(r => r.category === category);
      return {
        userId,
        category,
        inAppEnabled: existing?.inAppEnabled ?? true,
        pushEnabled: existing?.pushEnabled ?? true,
      };
    });
  }

  async upsertNotificationPreference(
    userId: number,
    prefs: { category: string; inAppEnabled: boolean; pushEnabled: boolean }
  ): Promise<{ userId: number; category: string; inAppEnabled: boolean; pushEnabled: boolean }> {
    const existing = await db
      .select()
      .from(notificationPreferencesTable)
      .where(and(
        eq(notificationPreferencesTable.userId, userId),
        eq(notificationPreferencesTable.category, prefs.category),
      ));
    if (existing.length > 0) {
      const [updated] = await db
        .update(notificationPreferencesTable)
        .set({
          inAppEnabled: prefs.inAppEnabled,
          pushEnabled: prefs.pushEnabled,
          updatedAt: new Date(),
        })
        .where(eq(notificationPreferencesTable.id, existing[0].id))
        .returning();
      return {
        userId: updated.userId,
        category: updated.category,
        inAppEnabled: updated.inAppEnabled ?? true,
        pushEnabled: updated.pushEnabled ?? true,
      };
    }
    const [created] = await db
      .insert(notificationPreferencesTable)
      .values({
        userId,
        category: prefs.category,
        inAppEnabled: prefs.inAppEnabled,
        pushEnabled: prefs.pushEnabled,
      })
      .returning();
    return {
      userId: created.userId,
      category: created.category,
      inAppEnabled: created.inAppEnabled ?? true,
      pushEnabled: created.pushEnabled ?? true,
    };
  }

  async isNotificationChannelEnabled(
    userId: number,
    category: string,
    channel: 'inApp' | 'push'
  ): Promise<boolean> {
    const [pref] = await db
      .select()
      .from(notificationPreferencesTable)
      .where(and(
        eq(notificationPreferencesTable.userId, userId),
        eq(notificationPreferencesTable.category, category),
      ));
    if (!pref) return true;
    return channel === 'inApp' ? pref.inAppEnabled !== false : pref.pushEnabled !== false;
  }

  async updateNotification(id: number, updates: any) {
    const allowed: any = {};
    if (updates.isRead !== undefined) allowed.isRead = updates.isRead;
    if (updates.title !== undefined) allowed.title = updates.title;
    if (updates.message !== undefined) allowed.message = updates.message;
    if (updates.actionUrl !== undefined) allowed.actionUrl = updates.actionUrl;
    if (updates.metadata !== undefined) allowed.metadata = updates.metadata;
    if (updates.category !== undefined) allowed.category = updates.category;
    const [updated] = await db
      .update(notificationsTable)
      .set(allowed)
      .where(eq(notificationsTable.id, id))
      .returning();
    return updated || null;
  }

  async deleteNotification(id: number) {
    const result = await db
      .delete(notificationsTable)
      .where(eq(notificationsTable.id, id))
      .returning({ id: notificationsTable.id });
    return result.length > 0;
  }

  async markNotificationAsRead(id: number) {
    return this.updateNotification(id, { isRead: true });
  }

  async markAllNotificationsAsRead(userId: number) {
    const result = await db
      .update(notificationsTable)
      .set({ isRead: true })
      .where(and(
        eq(notificationsTable.userId, userId),
        eq(notificationsTable.isRead, false),
      ))
      .returning({ id: notificationsTable.id });
    return result.length;
  }

  async getUnreadNotificationCount(userId: number) {
    const rows = await db
      .select({ id: notificationsTable.id })
      .from(notificationsTable)
      .where(and(
        eq(notificationsTable.userId, userId),
        eq(notificationsTable.isRead, false),
      ));
    return rows.length;
  }

  async bulkUpdateNotifications(notificationIds: number[], updates: any) {
    if (!notificationIds.length) return [];
    const allowed: any = {};
    if (updates.isRead !== undefined) allowed.isRead = updates.isRead;
    if (updates.category !== undefined) allowed.category = updates.category;
    const updated = await db
      .update(notificationsTable)
      .set(allowed)
      .where(sql`${notificationsTable.id} = ANY(${notificationIds})`)
      .returning();
    return updated;
  }

  // 통계 관련 메서드들
  getUserStats() {
    const users = this.users || [];
    const totalUsers = users.length;
    const activeUsers = users.filter(u => u.isVerified !== false).length;
    const inactiveUsers = totalUsers - activeUsers;

    return {
      totalUsers,
      activeUsers,
      inactiveUsers,
      newUsersToday: 0,
      newUsersThisWeek: 0,
      newUsersThisMonth: 0
    };
  }

  getSystemErrors() {
    return [];
  }

  async getAllTrainers() {
    try {
      const trainers = await db
        .select({
          id: usersTable.id,
          username: usersTable.username,
          email: usersTable.email,
          name: usersTable.name,
          role: usersTable.role,
          avatar: usersTable.avatar,
          bio: usersTable.bio,
          location: usersTable.location,
          specialty: usersTable.specialty,
          institute_id: usersTable.instituteId,
          address: usersTable.address,
          latitude: usersTable.latitude,
          longitude: usersTable.longitude,
          verified: usersTable.verified,
          is_verified: usersTable.isVerified,
          created_at: usersTable.createdAt
        })
        .from(usersTable)
        .where(eq(usersTable.role, 'trainer'));
      
      return trainers;
    } catch (error) {
      logServerError('[Storage] getAllTrainers error:', error);
      // fallback to memory storage
      return this.users?.filter(user => user.role === 'trainer') || [];
    }
  }

  getTrainer(id: number) {
    return this.users?.find(user => user.id === id && user.role === 'trainer');
  }

  // 로고 설정 관련 메서드들 - 데이터베이스 사용
  async initializeLogoSettings() {
    // 데이터베이스에서 로고 설정 조회
    const existingSettings = await db.select().from(logoSettingsTable).limit(1);

    if (existingSettings.length > 0) {
      console.log('[Storage] 데이터베이스에서 로고 설정 로드:', existingSettings[0]);
      return existingSettings[0];
    }

    // 없으면 기본 로고 설정 생성
    const defaultSettings = {
      logoUrl: '/logo.svg',
      logoPosition: 'left',
      logoSize: 'medium',
      altText: '테일즈 로고',
      linkUrl: '/',
      maxWidth: 200,
      maxHeight: 80,
      showOnMobile: true,
      showOnDesktop: true,
      isActive: true
    };

    const [newSettings] = await db.insert(logoSettingsTable).values(defaultSettings).returning();
    console.log('[Storage] 로고 설정 초기화 완료 (DB):', newSettings);
    return newSettings;
  }

  /**
   * 현재 로고 설정 조회
   * @param includeInactive - 비활성화된 설정 포함 여부
   * @returns 로고 설정 객체
   */
  async getLogoSettings(includeInactive: boolean = false) {
    console.log('[Storage] 로고 설정 조회 (DB) - includeInactive:', includeInactive);

    const settings = await db.select().from(logoSettingsTable).limit(1);

    if (settings.length === 0) {
      console.log('[Storage] 로고 설정이 없어서 초기화 실행');
      return await this.initializeLogoSettings();
    }

    const currentSettings = settings[0];

    // 비활성화 설정 제외 로직
    if (!includeInactive && !currentSettings.isActive) {
      console.log('[Storage] 비활성화된 로고 설정으로 인해 기본값 반환');
      return null;
    }

    console.log('[Storage] 로고 설정 조회 결과 (DB):', currentSettings);
    return currentSettings;
  }

  /**
   * 로고 설정 업데이트
   * @param settings - 업데이트할 설정 객체
   * @returns 업데이트된 로고 설정
   */
  async updateLogoSettings(settings: any) {
    console.log('[Storage] 로고 설정 업데이트 요청 (DB):', settings);

    // 기존 설정 조회
    const existingSettings = await db.select().from(logoSettingsTable).limit(1);

    if (existingSettings.length === 0) {
      console.log('[Storage] 기존 로고 설정이 없어서 생성');
      const [newSettings] = await db.insert(logoSettingsTable).values(settings).returning();
      return newSettings;
    }

    // 업데이트
    const [updatedSettings] = await db
      .update(logoSettingsTable)
      .set(settings)
      .where(eq(logoSettingsTable.id, existingSettings[0].id))
      .returning();

    console.log('[Storage] 로고 설정 업데이트 완료 (DB):', updatedSettings);
    return updatedSettings;
  }

  /**
   * 로고 설정 검증
   * @param settings - 검증할 설정 객체
   * @returns 검증 결과
   */
  validateLogoSettings(settings: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // 필수 필드 검증
    if (!settings.logoUrl) {
      errors.push('로고 URL은 필수입니다');
    }

    // URL 형식 검증
    if (settings.logoUrl && !this.isValidUrl(settings.logoUrl)) {
      errors.push('올바른 URL 형식이 아닙니다');
    }

    // 이미지 파일 형식 검증
    if (settings.logoUrl && !this.isImageUrl(settings.logoUrl)) {
      errors.push('이미지 파일 형식만 허용됩니다');
    }

    // 크기 검증
    if (settings.maxWidth && (settings.maxWidth < 50 || settings.maxWidth > 800)) {
      errors.push('로고 너비는 50px~800px 사이여야 합니다');
    }

    if (settings.maxHeight && (settings.maxHeight < 20 || settings.maxHeight > 200)) {
      errors.push('로고 높이는 20px~200px 사이여야 합니다');
    }

    // 위치 및 크기 옵션 검증
    if (settings.logoPosition && !['left', 'center', 'right'].includes(settings.logoPosition)) {
      errors.push('로고 위치는 left, center, right 중 하나여야 합니다');
    }

    if (settings.logoSize && !['small', 'medium', 'large'].includes(settings.logoSize)) {
      errors.push('로고 크기는 small, medium, large 중 하나여야 합니다');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * URL 형식 검증 헬퍼
   * @param url - 검증할 URL
   * @returns 유효성 여부
   */
  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 이미지 URL 검증 헬퍼
   * @param url - 검증할 URL
   * @returns 이미지 형식 여부
   */
  private isImageUrl(url: string): boolean {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp', '.bmp'];
    const lowerUrl = url.toLowerCase();
    return imageExtensions.some(ext => lowerUrl.includes(ext)) || lowerUrl.includes('placeholder');
  }

  // 강좌 관련 메서드들
  getAllCourses() {
    return this.courses || [];
  }

  getCourse(id: number) {
    return this.courses?.find(course => course.id === id);
  }

  // 보안: 권한별 강의 조회
  getCourseByIdWithPermission(id: string | number, user: any): any {
    const course = this.courses?.find(course => course.id == id);
    if (!course) return null;

    // 관리자는 모든 강의 접근 가능
    if (user.role === 'admin') return course;

    // 기관은 자신이 소속된 강의만 접근 가능
    if (user.role === 'institute' && course.instituteId === user.id) return course;

    // 트레이너는 소속 기관의 강의 접근 가능
    if (user.role === 'trainer' && course.instituteId === user.instituteId) return course;

    // 생성자는 항상 접근 가능 (instructorId)
    if (course.instructorId === user.id) return course;

    return null; // 권한 없음
  }

  // 커리큘럼 관련 메서드들
  getAllCurriculums() {
    // 샘플 커리큘럼 데이터 (준비물 포함)
    const sampleCurriculums = [
      {
        id: 'curriculum-sample-1',
        title: '반려견 기초 복종 훈련 과정',
        description: '반려견의 기본적인 복종 훈련을 위한 체계적인 교육 과정',
        category: '기초훈련',
        difficulty: 'beginner',
        duration: 480,
        price: 300000,
        trainerName: '강동훈',
        trainerEmail: 'donghoong@wangzzang.com',
        status: 'published',
        modules: [
          {
            title: '오리엔테이션',
            duration: 60,
            price: 0,
            isFree: true,
            description: '반려견 훈련의 기본 개념과 목표를 설명하는 시간',
            materials: ['노트', '펜', '훈련 일지']
          },
          {
            title: '기본 명령어 - 앉기',
            duration: 90,
            price: 50000,
            isFree: false,
            description: '앉기 명령어 훈련 및 보상 시스템 학습',
            materials: ['클리커', '간식', '리드줄', '훈련용 매트']
          },
          {
            title: '기본 명령어 - 기다려',
            duration: 90,
            price: 50000,
            isFree: false,
            description: '기다려 명령어 훈련 및 충동 조절 학습',
            materials: ['타이머', '간식', '훈련용 콘']
          },
          {
            title: '산책 훈련',
            duration: 120,
            price: 80000,
            isFree: false,
            description: '올바른 산책 방법과 리드 훈련',
            materials: ['하네스', '리드줄', '산책용 가방', '배변봉투']
          },
          {
            title: '사회화 훈련',
            duration: 120,
            price: 80000,
            isFree: false,
            description: '다른 개와의 만남 및 사회화 훈련',
            materials: ['장난감', '간식', '사회화 도구']
          }
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'curriculum-sample-2',
        title: '반려견 문제 행동 교정 과정',
        description: '반려견의 문제 행동을 체계적으로 교정하는 전문 과정',
        category: '행동교정',
        difficulty: 'intermediate',
        duration: 600,
        price: 450000,
        trainerName: '강동훈',
        trainerEmail: 'donghoong@wangzzang.com',
        status: 'published',
        modules: [
          {
            title: '행동 분석 및 진단',
            duration: 120,
            price: 90000,
            isFree: false,
            description: '반려견의 문제 행동 원인 분석 및 진단',
            materials: ['행동 분석표', '카메라', '녹음기', '관찰 일지']
          },
          {
            title: '짖음 교정 훈련',
            duration: 120,
            price: 90000,
            isFree: false,
            description: '과도한 짖음 행동의 원인별 교정 방법',
            materials: ['무시 훈련 도구', '분산 장난감', '진정 스프레이']
          },
          {
            title: '공격성 교정',
            duration: 120,
            price: 90000,
            isFree: false,
            description: '공격성 행동의 단계별 교정 프로그램',
            materials: ['안전 장비', '바디 랩', '안정화 도구']
          },
          {
            title: '분리불안 해소',
            duration: 120,
            price: 90000,
            isFree: false,
            description: '분리불안 증상 완화를 위한 훈련',
            materials: ['분리 훈련 도구', '안정화 음악', '퍼즐 장난감']
          },
          {
            title: '지속적 관리법',
            duration: 120,
            price: 90000,
            isFree: false,
            description: '교정 후 지속적인 관리 방법',
            materials: ['관리 일지', '점검 도구', '유지 훈련 키트']
          }
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    // 기존 courses 배열과 샘플 커리큘럼 합치기
    const allCurriculums = [...(this.courses || []), ...sampleCurriculums];

    return allCurriculums;
  }

  // 기관 관련 메서드들
  getAllInstitutes() {
    return (this.institutes || []).map(institute => ({
      ...institute,
      subscriptionPlan: institute.subscriptionPlan,
      subscriptionStatus: institute.subscriptionStatus,
      subscriptionStartDate: institute.subscriptionStartDate,
      subscriptionEndDate: institute.subscriptionEndDate,
      maxMembers: institute.maxMembers,
      maxVideoHours: institute.maxVideoHours,
      featuresEnabled: institute.featuresEnabled
    }));
  }

  // 구독 플랜 관련 메서드들
  getAllSubscriptionPlans() {
    return this.subscriptionPlans || [];
  }

  getSubscriptionPlans() {
    return this.subscriptionPlans || [];
  }

  getSubscriptionPlan(code: string) {
    return this.subscriptionPlans?.find(plan => plan.code === code);
  }

  getSubscriptionPlanById(id: number) {
    return this.subscriptionPlans?.find(plan => plan.id === id);
  }

  createSubscriptionPlan(data: any) {
    const nextId = (this.subscriptionPlans.reduce((m, p) => Math.max(m, p.id || 0), 0) || 0) + 1;
    const plan = {
      id: nextId,
      audience: 'user',
      benefits: [],
      isActive: true,
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.subscriptionPlans.push(plan);
    return plan;
  }

  updateSubscriptionPlan(id: number, data: any) {
    const idx = this.subscriptionPlans.findIndex(p => p.id === id);
    if (idx === -1) return null;
    this.subscriptionPlans[idx] = {
      ...this.subscriptionPlans[idx],
      ...data,
      updatedAt: new Date().toISOString(),
    };
    return this.subscriptionPlans[idx];
  }

  deactivateSubscriptionPlan(id: number) {
    return this.updateSubscriptionPlan(id, { isActive: false });
  }

  // 사용자 구독 (Stripe 정기 구독) 관련
  userSubscriptions: any[] = [];
  subscriptionInvoices: any[] = [];

  getUserSubscriptionByUserId(userId: number) {
    const rows = this.userSubscriptions.filter(s => s.userId === userId);
    if (rows.length === 0) return undefined;
    const statusRank: Record<string, number> = {
      active: 6,
      trialing: 6,
      past_due: 5,
      unpaid: 4,
      incomplete: 3,
      incomplete_expired: 1,
      canceled: 1,
    };
    const score = (s: any) =>
      (s.stripeSubscriptionId ? 100 : 0) + (statusRank[s.status] ?? 0);
    return rows
      .slice()
      .sort((a, b) => score(b) - score(a) || (b.id || 0) - (a.id || 0))[0];
  }

  getUserSubscriptionByStripeId(stripeSubscriptionId: string) {
    return this.userSubscriptions.find(s => s.stripeSubscriptionId === stripeSubscriptionId);
  }

  upsertUserSubscription(data: any) {
    // 1) Stripe Subscription ID로 정확히 매칭되는 레코드 우선
    if (data.stripeSubscriptionId) {
      const existing = this.getUserSubscriptionByStripeId(data.stripeSubscriptionId);
      if (existing) {
        Object.assign(existing, data, { updatedAt: new Date().toISOString() });
        return existing;
      }
    }
    // 2) 사용자 기준으로 기존 레코드를 찾되, 활성 Stripe 구독을 가진 레코드를
    //    덮어쓰지 않도록 안전하게 매칭
    if (data.userId) {
      const userRows = this.userSubscriptions.filter(s => s.userId === data.userId);
      // 새 데이터에 stripeSubscriptionId가 있으면 → 동일 사용자의 어떤 레코드든 머지 가능
      // 새 데이터가 placeholder(stripeSubscriptionId 없음)면 → placeholder 또는 비어있는 레코드만 머지
      let target;
      if (data.stripeSubscriptionId) {
        target =
          userRows.find(s => !s.stripeSubscriptionId) ||
          userRows.find(s => s.status === 'incomplete' || s.status === 'incomplete_expired');
      } else {
        target = userRows.find(s => !s.stripeSubscriptionId);
      }
      if (target) {
        // placeholder 머지 시에는 활성 구독의 핵심 필드를 덮지 않도록 주의
        Object.assign(target, data, { updatedAt: new Date().toISOString() });
        return target;
      }
      // 새 데이터가 placeholder인데 사용자가 이미 Stripe 활성 구독을 갖고 있다면
      // 새 placeholder 행을 만들지 않고 기존 레코드의 customerId만 보강
      if (!data.stripeSubscriptionId && userRows.length > 0) {
        const active = userRows.find(s => s.stripeSubscriptionId);
        if (active) {
          if (data.stripeCustomerId && !active.stripeCustomerId) {
            active.stripeCustomerId = data.stripeCustomerId;
            active.updatedAt = new Date().toISOString();
          }
          return active;
        }
      }
    }
    const nextId = (this.userSubscriptions.reduce((m, s) => Math.max(m, s.id || 0), 0) || 0) + 1;
    const sub = {
      id: nextId,
      cancelAtPeriodEnd: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...data,
    };
    this.userSubscriptions.push(sub);
    return sub;
  }

  getInvoicesByUserId(userId: number) {
    return this.subscriptionInvoices
      .filter(i => i.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  addSubscriptionInvoice(data: any) {
    const existing = data.stripeInvoiceId
      ? this.subscriptionInvoices.find(i => i.stripeInvoiceId === data.stripeInvoiceId)
      : null;
    if (existing) {
      Object.assign(existing, data);
      return existing;
    }
    const nextId = (this.subscriptionInvoices.reduce((m, i) => Math.max(m, i.id || 0), 0) || 0) + 1;
    const inv = {
      id: nextId,
      createdAt: new Date().toISOString(),
      ...data,
    };
    this.subscriptionInvoices.push(inv);
    return inv;
  }

  // 기관 구독 관련 메서드들
  createInstituteWithSubscription(instituteData: any) {
    const newInstitute = {
      ...instituteData,
      id: this.institutes.length + 1,
      isActive: true,
      isVerified: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.institutes.push(newInstitute);
    return newInstitute;
  }

  updateInstituteSubscription(instituteId: number, subscriptionData: any) {
    const institute = this.institutes.find(inst => inst.id === instituteId);
    if (institute) {
      Object.assign(institute, subscriptionData, {
        updatedAt: new Date().toISOString()
      });
      return institute;
    }
    return null;
  }

  async deleteInstitute(instituteId: number): Promise<boolean> {
    try {
      // 데이터베이스에서 삭제
      const result = await db.delete(institutesTable).where(eq(institutesTable.id, instituteId));
      
      // 메모리 캐시에서도 삭제
      const index = this.institutes.findIndex(i => i.id === instituteId);
      if (index !== -1) {
        this.institutes.splice(index, 1);
      }
      
      console.log('[Storage] 기관 삭제 완료:', instituteId);
      return true;
    } catch (error) {
      logServerError('[Storage] 기관 삭제 오류:', error);
      return false;
    }
  }

  getInstitute(instituteId: number): any {
    return this.institutes.find(i => i.id === instituteId);
  }

  updateInstitute(instituteId: number, updateData: any): any {
    const institute = this.institutes.find(i => i.id === instituteId);
    if (!institute) {
      return null;
    }

    // 데이터 정규화: 위도/경도를 숫자로 변환
    const normalizedData = { ...updateData };
    if ('latitude' in normalizedData && normalizedData.latitude !== null && normalizedData.latitude !== undefined) {
      normalizedData.latitude = typeof normalizedData.latitude === 'string' 
        ? parseFloat(normalizedData.latitude) 
        : normalizedData.latitude;
    }
    if ('longitude' in normalizedData && normalizedData.longitude !== null && normalizedData.longitude !== undefined) {
      normalizedData.longitude = typeof normalizedData.longitude === 'string' 
        ? parseFloat(normalizedData.longitude) 
        : normalizedData.longitude;
    }

    // 기존 정보와 업데이트 데이터 병합
    Object.assign(institute, normalizedData, {
      updatedAt: new Date().toISOString()
    });

    console.log('[Storage] 기관 정보 업데이트 완료:', institute.id, institute.name);
    return institute;
  }

  // 기관 구독 변경 및 결제 관련 메서드들
  changeInstituteSubscription(instituteId: number, newPlanCode: string, paymentMethod: 'self' | 'admin') {
    const institute = this.institutes.find(i => i.id === instituteId);
    const newPlan = this.subscriptionPlans.find(p => p.code === newPlanCode);

    if (!institute || !newPlan) {
      return null;
    }

    // 현재 구독 정보 백업
    const oldSubscription = {
      planCode: institute.subscriptionPlan,
      startDate: institute.subscriptionStartDate,
      endDate: institute.subscriptionEndDate,
      price: institute.subscriptionPrice
    };

    // 새 구독 정보 업데이트
    institute.subscriptionPlan = newPlan.code;
    institute.subscriptionPrice = newPlan.price;
    institute.subscriptionStartDate = new Date().toISOString();
    institute.subscriptionEndDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30일 후
    institute.paymentMethod = paymentMethod;
    institute.updatedAt = new Date().toISOString();

    // 결제 요청 생성 (관리자 결제의 경우)
    if (paymentMethod === 'admin') {
      const paymentRequest = {
        id: `payment-${Date.now()}`,
        instituteId: instituteId,
        instituteName: institute.name,
        oldPlan: oldSubscription,
        newPlan: {
          code: newPlan.code,
          name: newPlan.name,
          price: newPlan.price
        },
        amount: newPlan.price,
        status: 'pending',
        requestedAt: new Date().toISOString(),
        paymentMethod: 'admin',
        notes: `${institute.name} 구독 플랜 변경 요청 (${oldSubscription.planCode} → ${newPlan.code})`
      };

      if (!this.paymentRequests) {
        this.paymentRequests = [];
      }
      this.paymentRequests.push(paymentRequest);
    }

    return {
      institute,
      oldSubscription,
      newSubscription: {
        planCode: newPlan.code,
        planName: newPlan.name,
        price: newPlan.price,
        startDate: institute.subscriptionStartDate,
        endDate: institute.subscriptionEndDate
      }
    };
  }

  // 기관 자체 결제 처리
  processInstitutePayment(instituteId: number, paymentData: any) {
    const institute = this.institutes.find(i => i.id === instituteId);
    if (!institute) {
      return null;
    }

    // 결제 정보 저장
    institute.paymentStatus = 'completed';
    institute.paymentDate = new Date().toISOString();
    institute.paymentTransactionId = paymentData.transactionId || `tx-${Date.now()}`;
    institute.updatedAt = new Date().toISOString();

    return institute;
  }

  // 관리자 대리 결제 처리
  processAdminPayment(paymentRequestId: string, adminId: number) {
    const paymentRequest = this.paymentRequests?.find(pr => pr.id === paymentRequestId);
    if (!paymentRequest) {
      return null;
    }

    const institute = this.institutes.find(i => i.id === paymentRequest.instituteId);
    if (!institute) {
      return null;
    }

    // 결제 요청 상태 업데이트
    paymentRequest.status = 'completed';
    paymentRequest.processedAt = new Date().toISOString();
    paymentRequest.processedBy = adminId;

    // 기관 결제 상태 업데이트
    institute.paymentStatus = 'completed';
    institute.paymentDate = new Date().toISOString();
    institute.paymentTransactionId = `admin-${paymentRequestId}`;
    institute.updatedAt = new Date().toISOString();

    return {
      paymentRequest,
      institute
    };
  }

  createPaymentRequest(paymentRequest: any): Promise<any> {
    if (!this.paymentRequests) {
      this.paymentRequests = [];
    }
    this.paymentRequests.push(paymentRequest);
    return Promise.resolve(paymentRequest);
  }

  getPaymentRequests(): any[] {
    return this.paymentRequests || [];
  }

  updatePaymentRequest(requestId: string, updateData: any): any {
    if (!this.paymentRequests) {
      this.paymentRequests = [];
    }
    const request = this.paymentRequests.find(r => r.id === requestId);
    if (request) {
      Object.assign(request, updateData);
      return request;
    }
    return null;
  }

  // 상품 관리 메서드 (DB 연동)
  async getAllProducts(): Promise<any[]> {
    try {
      console.log('[Storage] getAllProducts 시작');
      
      const productList = await db
        .select()
        .from(productsTable)
        .where(eq(productsTable.is_active, true))
        .orderBy(desc(productsTable.created_at));
      
      console.log(`[Storage] DB에서 ${productList.length}개 상품 조회됨`);
      
      // images가 JSONB 배열이므로 첫 번째 이미지를 image 필드로 변환
      const transformedProducts = productList.map((p: any) => ({
        ...p,
        image: Array.isArray(p.images) && p.images.length > 0 ? p.images[0] : null,
        imageUrl: Array.isArray(p.images) && p.images.length > 0 ? p.images[0] : null,
        inStock: (p.stock || 0) > 0,
        category: `Category ${p.category_id}`,
        discountRate: p.discount_price ? Math.round(((p.price - p.discount_price) / p.price) * 100) : 0
      }));
      
      console.log(`[Storage] ${transformedProducts.length}개 상품 변환 완료`);
      return transformedProducts || [];
    } catch (error) {
      logServerError('[Storage] getAllProducts 에러:', error);
      return [];
    }
  }

  getProduct(id: number): any {
    return this.products.find(p => p.id === id);
  }

  updateProductPricing(id: number, pricingData: any): any {
    const product = this.products.find(p => p.id === id);
    if (product) {
      // 할인 정보 업데이트
      product.originalPrice = pricingData.originalPrice;
      product.discountType = pricingData.discountType;
      product.discountStartDate = pricingData.discountStartDate;
      product.discountEndDate = pricingData.discountEndDate;
      product.isDiscountActive = pricingData.isDiscountActive;
      product.updatedAt = new Date().toISOString();

      // 할인 가격 및 퍼센트 계산
      if (pricingData.discountType === 'percentage') {
        product.discountPercentage = pricingData.discountValue;
        product.discountPrice = Math.round(product.originalPrice * (1 - pricingData.discountValue / 100));
      } else if (pricingData.discountType === 'fixed') {
        product.discountPrice = Math.max(0, product.originalPrice - pricingData.discountValue);
        product.discountPercentage = Math.round(((product.originalPrice - product.discountPrice) / product.originalPrice) * 100);
      } else {
        product.discountPrice = undefined;
        product.discountPercentage = undefined;
      }

      return product;
    }
    return null;
  }

  // 가격 규칙 관리 메서드
  getAllPricingRules(): any[] {
    return this.pricingRules || [];
  }

  createPricingRule(ruleData: any): any {
    const rule = {
      id: this.pricingRules.length + 1,
      ...ruleData,
      createdAt: new Date().toISOString()
    };
    this.pricingRules.push(rule);
    return rule;
  }

  updatePricingRule(id: number, updateData: any): any {
    const rule = this.pricingRules.find(r => r.id === id);
    if (rule) {
      Object.assign(rule, updateData);
      return rule;
    }
    return null;
  }

  deletePricingRule(id: number): boolean {
    const index = this.pricingRules.findIndex(r => r.id === id);
    if (index !== -1) {
      this.pricingRules.splice(index, 1);
      return true;
    }
    return false;
  }

  getInstituteSubscriptionInfo(instituteId: number) {
    const institute = this.institutes.find(inst => inst.id === instituteId);
    if (institute) {
      return {
        subscriptionPlan: institute.subscriptionPlan,
        subscriptionStatus: institute.subscriptionStatus,
        subscriptionStartDate: institute.subscriptionStartDate,
        subscriptionEndDate: institute.subscriptionEndDate,
        maxMembers: institute.maxMembers,
        maxVideoHours: institute.maxVideoHours,
        featuresEnabled: institute.featuresEnabled
      };
    }
    return null;
  }

  checkInstituteFeatureAccess(instituteId: number, featureName: string) {
    const institute = this.institutes.find(inst => inst.id === instituteId);
    if (institute && institute.featuresEnabled) {
      return institute.featuresEnabled[featureName] === true;
    }
    return false;
  }

  checkInstituteLimits(instituteId: number) {
    const institute = this.institutes.find(inst => inst.id === instituteId);
    if (institute) {
      return {
        maxMembers: institute.maxMembers,
        maxVideoHours: institute.maxVideoHours,
        currentMembers: institute.studentsCount || 0,
        currentVideoHours: institute.usedVideoHours || 0
      };
    }
    return null;
  }

  // 알림장 관리 메서드
  getAllTrainingJournals(): any[] {
    return this.trainingJournals || [];
  }

  getTrainingJournalsByTrainer(trainerId: number): any[] {
    return (this.trainingJournals || []).filter(journal => journal.trainerId === trainerId);
  }

  // Alias for API compatibility
  getTrainingJournalsByTrainerId(trainerId: number): any[] {
    return this.getTrainingJournalsByTrainer(trainerId);
  }

  // 훈련사에게 배정된 반려동물 조회
  getPetsByTrainerId(trainerId: number): any[] {
    return (this.pets || []).filter(pet => pet.trainerId === trainerId || pet.assignedTrainerId === trainerId);
  }

  getTrainingJournalsByPet(petId: number): any[] {
    return (this.trainingJournals || []).filter(journal => journal.petId === petId);
  }

  async getTrainingJournalsByOwner(ownerId: number): Promise<any[]> {
    try {
      const ownerPets = await this.getPetsByUserId(ownerId);
      const petIds = ownerPets.map(pet => pet.id);

      return (this.trainingJournals || []).filter(journal =>
        petIds.includes(journal.petId)
      );
    } catch (error) {
      logServerError('getTrainingJournalsByOwner 오류:', error);
      return [];
    }
  }

  async getTrainingJournalsByInstitute(instituteId: number): Promise<any[]> {
    try {
      // 기관에 소속된 훈련사들 찾기
      const allTrainers = await this.getAllTrainers();
      const instituteTrainers = allTrainers.filter(trainer => trainer.instituteId === instituteId);
      const trainerIds = instituteTrainers.map(trainer => trainer.id);

      // 해당 훈련사들이 작성한 알림장 반환
      return (this.trainingJournals || []).filter(journal =>
        trainerIds.includes(journal.trainerId)
      );
    } catch (error) {
      logServerError('getTrainingJournalsByInstitute 오류:', error);
      return [];
    }
  }

  createTrainingJournal(journalData: any): any {
    if (!this.trainingJournals) {
      this.trainingJournals = [];
    }
    const journal = {
      id: this.trainingJournals.length + 1,
      status: 'sent',
      isRead: false,
      ...journalData,
      createdAt: journalData?.createdAt || new Date().toISOString(),
      updatedAt: journalData?.updatedAt || new Date().toISOString(),
    };
    this.trainingJournals.push(journal);
    return journal;
  }

  // getPet 별칭 - 일부 라우트에서 사용
  getPetById(id: number): any {
    return this.getPet(id);
  }

  getTrainingJournalById(id: number): any {
    return (this.trainingJournals || []).find(j => j.id === id) || null;
  }

  updateTrainingJournal(id: number, updateData: any): any {
    const journal = (this.trainingJournals || []).find(j => j.id === id);
    if (journal) {
      Object.assign(journal, {
        ...updateData,
        updatedAt: new Date().toISOString()
      });
      return journal;
    }
    return null;
  }

  deleteTrainingJournal(id: number): boolean {
    const index = (this.trainingJournals || []).findIndex(j => j.id === id);
    if (index !== -1) {
      this.trainingJournals.splice(index, 1);
      return true;
    }
    return false;
  }

  // ====== 알림장 댓글 ======
  journalCommentReports: any[] = [];
  journalCommentReadAt: Map<string, string> = new Map();

  getJournalComments(journalId: number): any[] {
    return (this.journalComments || [])
      .filter(c => c.journalId === journalId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  getJournalCommentById(commentId: number): any | null {
    return (this.journalComments || []).find(c => c.id === commentId) || null;
  }

  getJournalCommentCounts(
    journalIds: number[],
    currentUserId?: number,
  ): Record<number, { total: number; new: number }> {
    const counts: Record<number, { total: number; new: number }> = {};
    journalIds.forEach(id => { counts[id] = { total: 0, new: 0 }; });
    (this.journalComments || []).forEach(c => {
      if (!counts[c.journalId]) return;
      counts[c.journalId].total++;
      if (currentUserId && c.authorId !== currentUserId) {
        const lastRead = this.journalCommentReadAt.get(`${currentUserId}:${c.journalId}`);
        if (!lastRead || new Date(c.createdAt) > new Date(lastRead)) {
          counts[c.journalId].new++;
        }
      }
    });
    return counts;
  }

  markJournalCommentsRead(userId: number, journalId: number): void {
    this.journalCommentReadAt.set(`${userId}:${journalId}`, new Date().toISOString());
  }

  createJournalComment(data: { journalId: number; authorId: number; content: string; parentCommentId?: number | null }): any {
    if (!this.journalComments) this.journalComments = [];
    const id = (this.journalComments.reduce((m, c) => Math.max(m, c.id || 0), 0) || 0) + 1;
    const comment = {
      id,
      journalId: data.journalId,
      authorId: data.authorId,
      content: data.content,
      parentCommentId: data.parentCommentId ?? null,
      createdAt: new Date().toISOString(),
      updatedAt: null as string | null,
    };
    this.journalComments.push(comment);
    return comment;
  }

  updateJournalComment(commentId: number, content: string): any | null {
    const c = (this.journalComments || []).find(x => x.id === commentId);
    if (!c) return null;
    c.content = content;
    c.updatedAt = new Date().toISOString();
    return c;
  }

  deleteJournalComment(commentId: number): boolean {
    const idx = (this.journalComments || []).findIndex(c => c.id === commentId);
    if (idx === -1) return false;
    this.journalComments.splice(idx, 1);
    // 관련 신고도 정리
    this.journalCommentReports = (this.journalCommentReports || []).filter(r => r.commentId !== commentId);
    return true;
  }

  reportJournalComment(data: { commentId: number; reporterId: number; reason?: string }): any | null {
    if (!this.journalCommentReports) this.journalCommentReports = [];
    // 동일 사용자가 동일 댓글 재신고 방지
    const existing = this.journalCommentReports.find(
      r => r.commentId === data.commentId && r.reporterId === data.reporterId,
    );
    if (existing) return existing;
    const id = (this.journalCommentReports.reduce((m, r) => Math.max(m, r.id || 0), 0) || 0) + 1;
    const report = {
      id,
      commentId: data.commentId,
      reporterId: data.reporterId,
      reason: data.reason || null,
      createdAt: new Date().toISOString(),
    };
    this.journalCommentReports.push(report);
    return report;
  }

  // ====== 알림장 이모지 반응 ======
  getJournalReactions(journalId: number): any[] {
    return (this.journalReactions || []).filter(r => r.journalId === journalId);
  }

  addJournalReaction(journalId: number, userId: number, emoji: string): { added: boolean } {
    if (!this.journalReactions) this.journalReactions = [];
    const existing = this.journalReactions.find(
      r => r.journalId === journalId && r.userId === userId && r.emoji === emoji,
    );
    if (existing) return { added: false };
    const id = (this.journalReactions.reduce((m, r) => Math.max(m, r.id || 0), 0) || 0) + 1;
    this.journalReactions.push({
      id, journalId, userId, emoji, createdAt: new Date().toISOString(),
    });
    return { added: true };
  }

  removeJournalReaction(journalId: number, userId: number, emoji: string): { removed: boolean } {
    if (!this.journalReactions) this.journalReactions = [];
    const idx = this.journalReactions.findIndex(
      r => r.journalId === journalId && r.userId === userId && r.emoji === emoji,
    );
    if (idx === -1) return { removed: false };
    this.journalReactions.splice(idx, 1);
    return { removed: true };
  }

  // ====== 알림장 사진/영상 첨부 ======
  getNotebookAttachmentsByJournal(journalId: number): any[] {
    return (this.notebookAttachments || [])
      .filter(a => a.journalId === journalId)
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.id - b.id);
  }

  getNotebookAttachmentById(id: number): any | null {
    return (this.notebookAttachments || []).find(a => a.id === id) || null;
  }

  countNotebookAttachmentsByJournal(journalId: number, kind?: 'image' | 'video'): number {
    return (this.notebookAttachments || []).filter(a => a.journalId === journalId && (!kind || a.kind === kind)).length;
  }

  createNotebookAttachment(data: {
    journalId: number;
    kind: 'image' | 'video';
    storageKey: string;
    thumbnailKey?: string | null;
    sizeBytes: number;
    mimeType: string;
    uploadedBy: number;
  }): any {
    if (!this.notebookAttachments) this.notebookAttachments = [];
    const id = (this.notebookAttachments.reduce((m, a) => Math.max(m, a.id || 0), 0) || 0) + 1;
    const sortOrder = this.countNotebookAttachmentsByJournal(data.journalId);
    const att = {
      id,
      journalId: data.journalId,
      kind: data.kind,
      storageKey: data.storageKey,
      thumbnailKey: data.thumbnailKey || null,
      sizeBytes: data.sizeBytes,
      mimeType: data.mimeType,
      sortOrder,
      uploadedBy: data.uploadedBy,
      createdAt: new Date().toISOString(),
    };
    this.notebookAttachments.push(att);
    return att;
  }

  deleteNotebookAttachment(id: number): any | null {
    const idx = (this.notebookAttachments || []).findIndex(a => a.id === id);
    if (idx === -1) return null;
    const [removed] = this.notebookAttachments.splice(idx, 1);
    return removed;
  }

  // 페이지네이션과 필터링을 지원하는 훈련 일지 조회
  getTrainingJournalsWithPagination(query: any): {
    journals: any[],
    total: number,
    page: number,
    limit: number,
    totalPages: number
  } {
    let filteredJournals = [...(this.trainingJournals || [])];

    // 필터링 적용
    if (query.petId) {
      filteredJournals = filteredJournals.filter(j => j.petId === query.petId);
    }
    if (query.trainerId) {
      filteredJournals = filteredJournals.filter(j => j.trainerId === query.trainerId);
    }
    if (query.petOwnerId) {
      // 펫 소유자 필터링 - 해당 소유자의 모든 펫 찾기
      const ownerPets = this.getPetsByUserId(query.petOwnerId);
      const petIds = ownerPets.map(pet => pet.id);
      filteredJournals = filteredJournals.filter(j => petIds.includes(j.petId));
    }
    if (query.trainingType) {
      filteredJournals = filteredJournals.filter(j => j.trainingType === query.trainingType);
    }
    if (query.status) {
      filteredJournals = filteredJournals.filter(j => j.status === query.status);
    }
    if (query.isRead !== undefined) {
      filteredJournals = filteredJournals.filter(j => j.isRead === query.isRead);
    }
    if (query.fromDate) {
      filteredJournals = filteredJournals.filter(j => j.trainingDate >= query.fromDate);
    }
    if (query.toDate) {
      filteredJournals = filteredJournals.filter(j => j.trainingDate <= query.toDate);
    }

    // 정렬
    const sortBy = query.sortBy || 'trainingDate';
    const sortOrder = query.sortOrder || 'desc';

    filteredJournals.sort((a, b) => {
      const aValue = a[sortBy];
      const bValue = b[sortBy];

      if (sortOrder === 'desc') {
        return bValue > aValue ? 1 : bValue < aValue ? -1 : 0;
      } else {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      }
    });

    // 페이지네이션
    const page = Math.max(1, query.page || 1);
    const limit = Math.max(1, Math.min(100, query.limit || 10));
    const offset = (page - 1) * limit;
    const total = filteredJournals.length;
    const totalPages = Math.ceil(total / limit);

    const journals = filteredJournals.slice(offset, offset + limit);

    return {
      journals,
      total,
      page,
      limit,
      totalPages
    };
  }

  // 권한 확인 메서드들
  canUserAccessTrainingJournal(userId: number, userRole: string, journal: any): boolean {
    if (!journal) return false;

    // 관리자는 모든 일지 접근 가능
    if (userRole === 'admin') return true;

    // 훈련사는 본인이 작성한 일지만 접근 가능
    if (userRole === 'trainer' && journal.trainerId === userId) return true;

    // 반려동물 소유자는 본인 펫의 일지만 접근 가능
    if (userRole === 'pet-owner' && journal.petOwnerId === userId) return true;

    return false;
  }

  canUserCreateTrainingJournal(userId: number, userRole: string, petId: number): boolean {
    // 관리자는 모든 일지 생성 가능
    if (userRole === 'admin') return true;

    // 훈련사는 담당 펫의 일지만 생성 가능
    if (userRole === 'trainer') {
      const pet = this.getPet(petId);
      return !!(pet && (pet.assignedTrainerId === userId || pet.trainerId === userId));
    }

    return false;
  }

  canUserModifyTrainingJournal(userId: number, userRole: string, journal: any): boolean {
    if (!journal) return false;

    // 관리자는 모든 일지 수정 가능
    if (userRole === 'admin') return true;

    // 훈련사는 본인이 작성한 일지만 수정 가능
    if (userRole === 'trainer' && journal.trainerId === userId) return true;

    return false;
  }

  // 미디어 첨부 관련 메서드들
  addTrainingJournalMedia(journalId: number, mediaUrl: string, description?: string): boolean {
    const journal = this.getTrainingJournalById(journalId);
    if (!journal) return false;

    if (!journal.attachments) {
      journal.attachments = [];
    }

    journal.attachments.push(mediaUrl);
    journal.updatedAt = new Date().toISOString();

    return true;
  }

  removeTrainingJournalMedia(journalId: number, mediaUrl: string): boolean {
    const journal = this.getTrainingJournalById(journalId);
    if (!journal || !journal.attachments) return false;

    const index = journal.attachments.indexOf(mediaUrl);
    if (index !== -1) {
      journal.attachments.splice(index, 1);
      journal.updatedAt = new Date().toISOString();
      return true;
    }

    return false;
  }

  // 대량 상태 업데이트
  bulkUpdateTrainingJournalStatus(journalIds: number[], updates: any): { updated: number, errors: string[] } {
    let updated = 0;
    const errors: string[] = [];

    for (const id of journalIds) {
      const journal = this.getTrainingJournalById(id);
      if (journal) {
        Object.assign(journal, updates, { updatedAt: new Date().toISOString() });
        updated++;
      } else {
        errors.push(`일지 ID ${id}를 찾을 수 없습니다`);
      }
    }

    return { updated, errors };
  }

  // 커리큘럼 관리 메서드
  createCurriculum(curriculumData: any): any {
    const curriculum = {
      id: Date.now().toString(),
      ...curriculumData,
      status: curriculumData.status || 'draft', // 기본 상태를 draft로 설정
      isPublic: curriculumData.isPublic || false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (!this.curriculums) {
      this.curriculums = [];
    }
    this.curriculums.push(curriculum);
    console.log(`[Storage] 커리큘럼 생성 완료: ${curriculum.title}`);
    return curriculum;
  }

  getAllCurricula(): any[] {
    return this.curriculums || [];
  }

  getCurriculumById(id: string): any {
    return this.curriculums.find(curriculum => curriculum.id == id);
  }

  // 보안: 권한별 커리큘럼 조회
  getCurriculumByIdWithPermission(id: string, user: any): any {
    const curriculum = this.curriculums.find(curriculum => curriculum.id == id);
    if (!curriculum) return null;

    // 관리자는 모든 커리큘럼 접근 가능
    if (user.role === 'admin') return curriculum;

    // 기관은 자신이 소속된 커리큘럼만 접근 가능
    if (user.role === 'institute' && curriculum.instituteId === user.id) return curriculum;

    // 훈련사는 소속 기관의 커리큘럼 접근 가능
    if (user.role === 'trainer' && curriculum.instituteId === user.instituteId) return curriculum;

    // 생성자는 항상 접근 가능
    if (curriculum.creatorId === user.id) return curriculum;

    return null; // 권한 없음
  }

  updateCurriculum(id: string, updateData: any): any {
    const curriculum = this.curriculums.find(c => c.id == id); // == 사용하여 타입 변환 허용
    if (curriculum) {
      Object.assign(curriculum, updateData, { updatedAt: new Date().toISOString() });
      console.log(`[Storage] 커리큘럼 수정 완료: ${id}`);
      return curriculum;
    }
    console.log(`[Storage] 커리큘럼 수정 실패: ${id} 찾을 수 없음`);
    return null;
  }

  // 보안: 권한 기반 커리큘럼 수정
  updateCurriculumWithPermission(id: string, updateData: any, user: any): any {
    const curriculum = this.curriculums.find(c => c.id == id);
    if (!curriculum) {
      console.log(`[Storage] 커리큘럼 수정 실패: ${id} 찾을 수 없음`);
      return { error: 'RESOURCE_NOT_FOUND', message: '수정하려는 커리큘럼을 찾을 수 없습니다.' };
    }

    // 권한 확인
    const hasPermission = user.role === 'admin' ||
      (user.role === 'institute' && curriculum.instituteId === user.id) ||
      (user.role === 'trainer' && curriculum.instituteId === user.instituteId) ||
      curriculum.creatorId === user.id;

    if (!hasPermission) {
      console.log(`[Storage] 권한 없음: User ${user.id}가 커리큘럼 ${id} 수정 시도`);
      return { error: 'INSUFFICIENT_PERMISSIONS', message: '이 커리큘럼을 수정할 권한이 없습니다.' };
    }

    // 소유권 필드 보호 - creatorId, instituteId는 수정 불가
    const safeUpdateData = { ...updateData };
    delete safeUpdateData.creatorId;
    delete safeUpdateData.instituteId;
    delete safeUpdateData.createdAt;
    delete safeUpdateData.id;

    Object.assign(curriculum, safeUpdateData, { updatedAt: new Date().toISOString() });
    console.log(`[Storage] 커리큘럼 수정 완료: ${id}`);
    return curriculum;
  }

  updateModule(curriculumId: string, moduleId: string, updateData: any): boolean {
    const curriculum = this.curriculums.find(c => c.id == curriculumId);
    if (!curriculum || !curriculum.modules) {
      console.log(`[Storage] 모듈 수정 실패: 커리큘럼 ${curriculumId} 찾을 수 없음`);
      return false;
    }

    const moduleIndex = curriculum.modules.findIndex(m => m.id == moduleId);
    if (moduleIndex === -1) {
      console.log(`[Storage] 모듈 수정 실패: 모듈 ${moduleId} 찾을 수 없음`);
      return false;
    }

    // 모듈 데이터 업데이트
    curriculum.modules[moduleIndex] = {
      ...curriculum.modules[moduleIndex],
      ...updateData,
      updatedAt: new Date().toISOString()
    };

    // 커리큘럼 업데이트 시간도 갱신
    curriculum.updatedAt = new Date().toISOString();

    console.log(`[Storage] 모듈 수정 완료: ${curriculumId}/${moduleId}`);
    return true;
  }

  updateCurriculumModule(curriculumId: number, moduleId: string, updateData: any): any {
    const result = this.updateModule(curriculumId.toString(), moduleId, updateData);
    if (result) {
      // 업데이트된 모듈을 반환
      const curriculum = this.curriculums.find(c => c.id == curriculumId);
      if (curriculum && curriculum.modules) {
        const module = curriculum.modules.find(m => m.id == moduleId);
        return module;
      }
    }
    return null;
  }

  deleteCurriculum(id: string): boolean {
    const index = this.curriculums.findIndex(c => c.id == id);
    if (index !== -1) {
      this.curriculums.splice(index, 1);
      console.log(`[Storage] 커리큘럼 삭제 완료: ${id}`);
      return true;
    }
    console.log(`[Storage] 커리큘럼 삭제 실패: ${id} 찾을 수 없음`);
    return false;
  }

  // 보안: 권한 기반 커리큘럼 삭제
  deleteCurriculumWithPermission(id: string, user: any): { success: boolean; error?: string; message?: string } {
    const curriculumIndex = this.curriculums.findIndex(c => c.id == id);
    if (curriculumIndex === -1) {
      console.log(`[Storage] 커리큘럼 삭제 실패: ${id} 찾을 수 없음`);
      return { success: false, error: 'RESOURCE_NOT_FOUND', message: '삭제하려는 커리큘럼을 찾을 수 없습니다.' };
    }

    const curriculum = this.curriculums[curriculumIndex];

    // 권한 확인
    const hasPermission = user.role === 'admin' ||
      (user.role === 'institute' && curriculum.instituteId === user.id) ||
      (user.role === 'trainer' && curriculum.instituteId === user.instituteId) ||
      curriculum.creatorId === user.id;

    if (!hasPermission) {
      console.log(`[Storage] 권한 없음: User ${user.id}가 커리큘럼 ${id} 삭제 시도`);
      return { success: false, error: 'INSUFFICIENT_PERMISSIONS', message: '이 커리큘럼을 삭제할 권한이 없습니다.' };
    }

    this.curriculums.splice(curriculumIndex, 1);
    console.log(`[Storage] 커리큘럼 삭제 완료: ${id}`);
    return { success: true };
  }

  publishCurriculum(id: string, isPublic: boolean): any {
    const curriculum = this.curriculums.find(c => c.id == id);
    if (curriculum) {
      curriculum.isPublic = isPublic;
      curriculum.status = isPublic ? 'approved' : 'draft';
      curriculum.updatedAt = new Date().toISOString();
      console.log(`[Storage] 커리큘럼 게시 상태 변경: ${id} -> ${isPublic ? '공개' : '비공개'}`);
      return curriculum;
    }
    console.log(`[Storage] 커리큘럼 게시 실패: ${id} 찾을 수 없음`);
    return null;
  }

  // 모듈에 영상 추가 메소드
  addVideoToModule(curriculumId: string, moduleId: string, videoData: any): boolean {
    const curriculum = this.curriculums.find(c => c.id == curriculumId);
    if (!curriculum || !curriculum.modules) {
      console.log(`[Storage] 영상 추가 실패: 커리큘럼 ${curriculumId} 찾을 수 없음`);
      return false;
    }

    const module = curriculum.modules.find(m => m.id == moduleId);
    if (!module) {
      console.log(`[Storage] 영상 추가 실패: 모듈 ${moduleId} 찾을 수 없음`);
      return false;
    }

    // 모듈에 videos 배열이 없으면 생성
    if (!module.videos) {
      module.videos = [];
    }

    // 영상 데이터 추가
    module.videos.push(videoData);

    // 모듈과 커리큘럼 업데이트 시간 갱신
    module.updatedAt = new Date().toISOString();
    curriculum.updatedAt = new Date().toISOString();

    console.log(`[Storage] 영상 추가 완료: ${curriculumId}/${moduleId} - ${videoData.title}`);
    return true;
  }

  // 이벤트 관리 메서드
  getAllEvents(): any[] {
    // 커뮤니티 게시글 중 이벤트 관련 게시글을 이벤트 형태로 변환하여 반환
    const communityPosts = this.posts || [];
    const eventKeywords = ['축제', '이벤트', '박람회', '대회', '행사', '펫페어', '문화축제'];

    const eventPosts = communityPosts.filter((post: any) => {
      return eventKeywords.some(keyword => 
        post.title.includes(keyword) || 
        (post.content && post.content.includes(keyword)) ||
        (post.tag && post.tag.includes(keyword))
      );
    });

    // 커뮤니티 게시글을 이벤트 형태로 변환
    const eventsFromCommunity = eventPosts.map((post: any) => ({
      id: post.id,
      name: post.title,
      description: post.content || post.title,
      startDate: post.createdAt || new Date().toISOString(),
      endDate: post.createdAt || new Date().toISOString(),
      location: {
        name: this.extractLocationFromText(post.title + ' ' + (post.content || '')),
        address: this.extractLocationFromText(post.title + ' ' + (post.content || '')),
        latitude: 37.5665,
        longitude: 126.9780
      },
      category: this.getEventCategory(post.title),
      status: 'active',
      price: '무료',
      maxAttendees: 100,
      currentAttendees: 0,
      organizerId: post.authorId || 1,
      organizer: post.author?.name || '관리자',
      tags: post.tag ? [post.tag] : ['커뮤니티'],
      image: post.linkInfo?.image || '/attached_assets/image_1758608084415.png',
      sourceUrl: post.linkInfo?.url || '',
      featured: false,
      createdAt: post.createdAt || new Date().toISOString(),
      updatedAt: post.updatedAt || new Date().toISOString()
    }));

    // 기존 이벤트 데이터와 커뮤니티 이벤트를 합쳐서 반환
    return [...(this.events || []), ...eventsFromCommunity];
  }

  // 텍스트에서 위치 정보 추출 헬퍼 메서드
  private extractLocationFromText(text: string): string {
    const locationRegex = /(서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주)/;
    const match = text.match(locationRegex);
    return match ? match[0] : '전국';
  }

  // 이벤트 카테고리 결정 헬퍼 메서드  
  private getEventCategory(title: string): string {
    if (title.includes('박람회') || title.includes('펫페어')) return '박람회';
    if (title.includes('대회') || title.includes('경연')) return '대회';
    if (title.includes('문화축제') || title.includes('축제')) return '문화축제';
    if (title.includes('건강검진') || title.includes('의료')) return '의료행사';
    if (title.includes('입양') || title.includes('봉사')) return '사회공헌';
    return '일반이벤트';
  }

  getEventById(id: number): any {
    return this.events.find(event => event.id === id);
  }

  getEventBySourceUrl(sourceUrl: string): any {
    return this.events.find(event => event.sourceUrl === sourceUrl);
  }

  createEvent(eventData: any): any {
    const event = {
      id: this.events.length + 1,
      ...eventData,
      createdAt: new Date().toISOString()
    };
    this.events.push(event);
    return event;
  }

  updateEvent(id: number, updateData: any): any {
    const event = this.events.find(e => e.id === id);
    if (event) {
      Object.assign(event, updateData);
      return event;
    }
    return null;
  }

  // 대체 훈련사 게시판 관리 메서드
  initializeSubstitutePosts(): any[] {
    return [
      {
        id: '1',
        title: '긴급! 오늘 오후 3시 기초 훈련 수업 대체 훈련사 필요',
        description: '강남 펫 아카데미에서 기초 훈련 수업을 담당할 대체 훈련사를 찾고 있습니다.',
        instituteName: '강남 펫 아카데미',
        originalTrainerName: '김주훈련사',
        date: '2025-01-24',
        time: '15:00-16:00',
        subject: '기초 훈련',
        level: '초급',
        pay: 150000,
        location: '서울 강남구 역삼동',
        requirements: ['기초 훈련 경험 2년 이상', '관련 자격증 보유'],
        trainerId: 1,
        trainerName: '김주훈련사',
        urgent: true,
        status: 'open',
        applicants: [],
        createdAt: '2025-01-24T09:00:00Z',
        updatedAt: '2025-01-24T09:00:00Z'
      },
      {
        id: '2',
        title: '내일 아침 반려견 사회화 훈련 수업 대체 훈련사 구해요',
        description: '서울 반려견 훈련소에서 사회화 훈련 수업을 담당할 대체 훈련사를 찾고 있습니다.',
        instituteName: '서울 반려견 훈련소',
        originalTrainerName: '박대훈련사',
        date: '2025-01-25',
        time: '10:00-11:30',
        subject: '사회화 훈련',
        level: '중급',
        pay: 180000,
        location: '서울 마포구 상암동',
        requirements: ['사회화 훈련 경험 3년 이상', '퍼피 스쿨 경험'],
        trainerId: 2,
        trainerName: '박대훈련사',
        urgent: false,
        status: 'open',
        applicants: [],
        createdAt: '2025-01-24T10:30:00Z',
        updatedAt: '2025-01-24T10:30:00Z'
      },
      {
        id: '3',
        title: '다음주 화요일 어질리티 훈련 수업',
        description: '부산 펫 트레이닝 센터에서 어질리티 훈련 수업을 담당할 대체 훈련사를 찾고 있습니다.',
        instituteName: '부산 펫 트레이닝 센터',
        originalTrainerName: '이전문훈련사',
        date: '2025-01-28',
        time: '14:00-15:30',
        subject: '어질리티 훈련',
        level: '고급',
        pay: 220000,
        location: '부산 해운대구 우동',
        requirements: ['어질리티 훈련 전문가', '대회 참가 경험'],
        trainerId: 3,
        trainerName: '이전문훈련사',
        urgent: false,
        status: 'open',
        applicants: [],
        createdAt: '2025-01-24T11:00:00Z',
        updatedAt: '2025-01-24T11:00:00Z'
      },
      {
        id: '4',
        title: '강동훈 훈련사 - 행동 교정 수업',
        description: '강동훈 훈련사가 등록한 개별 행동 교정 수업입니다. 짖음, 물기, 분리불안 등 문제행동 교정에 특화된 수업입니다.',
        instituteName: '왕짱스쿨',
        originalTrainerName: '강동훈',
        date: '2025-01-27',
        time: '16:00-17:30',
        subject: '문제행동 교정',
        level: '전문',
        pay: 120000,
        location: '경북 구미시 왕짱스쿨 구평센터',
        requirements: ['문제행동 교정 경험 필수', '개별 훈련 경험'],
        trainerId: 4,
        trainerName: '강동훈',
        urgent: false,
        status: 'open',
        applicants: [],
        createdAt: '2025-01-24T12:00:00Z',
        updatedAt: '2025-01-24T12:00:00Z'
      },
      {
        id: '5',
        title: '강동훈 훈련사 - 퍼피 기초 교육',
        description: '강동훈 훈련사가 등록한 퍼피 기초 교육 프로그램입니다. 3-6개월 퍼피 대상 기본 예절 교육을 진행합니다.',
        instituteName: '왕짱스쿨',
        originalTrainerName: '강동훈',
        date: '2025-01-28',
        time: '10:00-11:30',
        subject: '퍼피 교육',
        level: '초급',
        pay: 90000,
        location: '경북 칠곡군 왕짱스쿨 석적센터',
        requirements: ['퍼피 교육 경험 선호', '기초 복종 훈련'],
        trainerId: 5,
        trainerName: '강동훈',
        urgent: false,
        status: 'open',
        applicants: [],
        createdAt: '2025-01-24T13:00:00Z',
        updatedAt: '2025-01-24T13:00:00Z'
      }
    ];
  }

  getSubstitutePosts(): any[] {
    // 강제로 초기화 데이터 반환
    return this.initializeSubstitutePosts();
  }

  createSubstitutePost(postData: any): any {
    const newPost = {
      id: Date.now().toString(),
      ...postData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      applicants: []
    };

    if (!this.substitutePosts) {
      this.substitutePosts = [];
    }
    this.substitutePosts.push(newPost);
    return newPost;
  }

  updateSubstitutePost(id: string, updateData: any): any {
    const post = this.substitutePosts?.find(p => p.id === id);
    if (post) {
      Object.assign(post, updateData, { updatedAt: new Date().toISOString() });
      return post;
    }
    return null;
  }

  deleteSubstitutePost(id: string): boolean {
    if (!this.substitutePosts) return false;
    const index = this.substitutePosts.findIndex(p => p.id === id);
    if (index !== -1) {
      this.substitutePosts.splice(index, 1);
      return true;
    }
    return false;
  }

  applyForSubstitutePost(id: string, applicationData: any): any {
    const post = this.substitutePosts?.find(p => p.id === id);
    if (post) {
      if (!post.applicants) {
        post.applicants = [];
      }
      const application = {
        id: Date.now().toString(),
        ...applicationData,
        appliedAt: new Date().toISOString()
      };
      post.applicants.push(application);
      return application;
    }
    return null;
  }

  getSubstituteOverview(): any {
    return {
      totalPosts: this.substitutePosts?.length || 0,
      activePosts: this.substitutePosts?.filter(p => p.status === 'open').length || 0,
      totalApplications: this.substitutePosts?.reduce((sum, p) => sum + (p.applicants?.length || 0), 0) || 0,
      completedSessions: 45,
      monthlyGrowth: 12.5,
      avgResponseTime: 2.3,
      satisfactionRate: 94.8
    };
  }

  getSubstituteInstitutes(): any[] {
    return [
      {
        id: '1',
        name: '강남 펫 아카데미',
        activePosts: 8,
        totalRequests: 25,
        successRate: 92.0,
        averageRating: 4.6,
        totalTrainers: 12,
        availableTrainers: 8,
        lastRequestDate: '2025-01-24'
      },
      {
        id: '2',
        name: '서울 반려견 훈련소',
        activePosts: 6,
        totalRequests: 18,
        successRate: 88.9,
        averageRating: 4.4,
        totalTrainers: 9,
        availableTrainers: 6,
        lastRequestDate: '2025-01-23'
      }
    ];
  }

  getSubstituteAlerts(): any[] {
    return [
      {
        id: '1',
        type: 'urgent',
        title: '긴급 대체 훈련사 필요',
        description: '강남 펫 아카데미에서 오늘 오후 2시 수업 대체 훈련사가 필요합니다.',
        instituteName: '강남 펫 아카데미',
        priority: 'high',
        createdAt: '2025-01-24T09:30:00Z',
        resolved: false
      },
      {
        id: '2',
        type: 'warning',
        title: '대체 훈련사 부족',
        description: '이번 주 대체 훈련사 신청이 평소보다 30% 감소했습니다.',
        instituteName: '전체',
        priority: 'medium',
        createdAt: '2025-01-24T08:15:00Z',
        resolved: false
      }
    ];
  }

  getSubstituteTrainers(): any[] {
    return [
      {
        id: '1',
        name: '박대체훈련사',
        instituteName: '강남 펫 아카데미',
        tier: 'certified',
        totalSubstitutes: 15,
        successRate: 96.7,
        averageRating: 4.9,
        totalEarnings: 1200000,
        lastActiveDate: '2025-01-24'
      },
      {
        id: '2',
        name: '최대체훈련사',
        instituteName: '서울 반려견 훈련소',
        tier: 'semi_certified',
        totalSubstitutes: 12,
        successRate: 91.7,
        averageRating: 4.7,
        totalEarnings: 960000,
        lastActiveDate: '2025-01-23'
      }
    ];
  }

  resolveSubstituteAlert(id: string): any {
    const alert = this.substituteAlerts?.find(a => a.id === id);
    if (alert) {
      alert.resolved = true;
      alert.resolvedAt = new Date().toISOString();
      return alert;
    }
    return null;
  }

  getSubstituteApplications(): any[] {
    // 모든 대체 훈련사 게시글에서 지원 신청 추출
    const allApplications: any[] = [];
    const posts = this.getSubstitutePosts();

    posts.forEach(post => {
      if (post.applicants && Array.isArray(post.applicants)) {
        post.applicants.forEach((applicant: any) => {
          allApplications.push({
            ...applicant,
            postId: post.id,
            postTitle: post.title,
            instituteName: post.instituteName,
            classDate: post.date,
            classTime: post.time
          });
        });
      }
    });

    return allApplications;
  }

  // 커뮤니티 게시글 관리 메서드
  createPost(postData: any): any {
    const newPost = {
      id: (this.posts?.length || 0) + 1,
      ...postData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      likes: 0,
      comments: []
    };

    if (!this.posts) {
      this.posts = [];
    }
    this.posts.push(newPost);
    return newPost;
  }

  getAllPosts(): any[] {
    return this.posts || [];
  }

  getPostById(id: number): any {
    return this.posts?.find(post => post.id === id);
  }

  updatePost(id: number, updateData: any): any {
    const post = this.posts?.find(p => p.id === id);
    if (post) {
      Object.assign(post, updateData);
      post.updatedAt = new Date().toISOString();
      return post;
    }
    return null;
  }

  deletePost(id: number): boolean {
    const index = this.posts?.findIndex(p => p.id === id);
    if (index !== undefined && index !== -1) {
      this.posts?.splice(index, 1);
      return true;
    }
    return false;
  }

  // 커뮤니티 전용 게시글 메서드들
  createCommunityPost(postData: any): any {
    const newPost = {
      id: (this.posts?.length || 0) + 1,
      ...postData,
      likes: 0,
      comments: 0,
      views: 0,
      hidden: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (!this.posts) {
      this.posts = [];
    }
    this.posts.push(newPost);
    console.log('[Storage] 커뮤니티 게시글 생성됨:', newPost.title);
    return newPost;
  }

  getCommunityPosts(options: any = {}): any {
    const { page = 1, limit = 12, category, sort = 'latest', searchQuery } = options;

    let filteredPosts = this.posts?.filter(post => {
      // 숨김 처리된 게시글 제외
      if (post.hidden) return false;

      // 카테고리 필터링
      if (category && post.tag !== category) return false;

      // 검색어 필터링
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return post.title?.toLowerCase().includes(query) || 
               post.content?.toLowerCase().includes(query);
      }

      return true;
    }) || [];

    // 정렬
    switch (sort) {
      case 'popular':
        filteredPosts.sort((a, b) => (b.likes || 0) - (a.likes || 0));
        break;
      case 'views':
        filteredPosts.sort((a, b) => (b.views || 0) - (a.views || 0));
        break;
      case 'comments':
        filteredPosts.sort((a, b) => (b.comments || 0) - (a.comments || 0));
        break;
      case 'latest':
      default:
        filteredPosts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
    }

    // 페이지네이션
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedPosts = filteredPosts.slice(startIndex, endIndex);

    return {
      posts: paginatedPosts,
      totalCount: filteredPosts.length,
      currentPage: page,
      totalPages: Math.ceil(filteredPosts.length / limit),
      hasNextPage: endIndex < filteredPosts.length,
      hasPrevPage: page > 1
    };
  }

  deleteEvent(id: number): boolean {
    const index = this.events.findIndex(e => e.id === id);
    if (index !== -1) {
      this.events.splice(index, 1);
      return true;
    }
    return false;
  }

  updateEventThumbnail(id: number, thumbnailUrl: string): any {
    const event = this.events.find(e => e.id === id);
    if (event) {
      event.thumbnailUrl = thumbnailUrl;
      event.lastUpdated = new Date().toISOString();
      return event;
    }
    return null;
  }

  // 정보 수정 요청 승인/반려 처리
  async reviewCorrectionRequest(requestId: string, action: string, adminNotes: string) {
    console.log('[Storage] 정보 수정 요청 처리:', requestId, action, adminNotes);

    // 임시 데이터 소스에서 정보 수정 요청 찾기
    const correctionRequests = this.getCorrectionRequests();
    const requestIndex = correctionRequests.findIndex(req => req.id === requestId);

    if (requestIndex === -1) {
      throw new Error('정보 수정 요청을 찾을 수 없습니다.');
    }

    const request = correctionRequests[requestIndex];

    // 요청 상태 업데이트
    request.status = action === 'approve' ? 'approved' : 'rejected';
    (request as any).reviewedAt = new Date().toISOString();
    (request as any).reviewedBy = '관리자';
    (request as any).adminNotes = adminNotes;

    // 승인된 경우 실제 업체 정보 업데이트
    if (action === 'approve') {
      await this.updateBusinessInfo(request);
    }

    console.log('[Storage] 정보 수정 요청 처리 완료:', request);
    return request;
  }

  // 업체 정보 업데이트 (승인된 수정 요청 반영)
  async updateBusinessInfo(request: any) {
    console.log('[Storage] 업체 정보 업데이트:', request.businessId, request.correctionType, request.proposedValue);

    // 업체 유형에 따라 적절한 데이터 소스 업데이트
    if (request.businessType === 'institute') {
      await this.updateInstituteField(request.businessId, request.correctionType, request.proposedValue);
    } else if (request.businessType === 'trainer') {
      await this.updateTrainerField(request.businessId, request.correctionType, request.proposedValue);
    } else if (request.businessType === 'business') {
      await this.updateBusinessField(request.businessId, request.correctionType, request.proposedValue);
    }

    console.log('[Storage] 업체 정보 업데이트 완료');
  }

  // 기관 정보 필드 업데이트
  async updateInstituteField(businessId: string, correctionType: string, proposedValue: string) {
    const institute = this.institutes.find(inst => inst.id === parseInt(businessId));
    if (institute) {
      switch (correctionType) {
        case 'address':
          institute.address = proposedValue;
          break;
        case 'phone':
          institute.phone = proposedValue;
          break;
        case 'description':
          institute.description = proposedValue;
          break;
        case 'services':
          institute.services = proposedValue.split(',').map(s => s.trim());
          break;
        default:
          institute[correctionType] = proposedValue;
      }
      console.log('[Storage] 기관 정보 업데이트 완료:', institute.name);
    }
  }

  // 훈련사 정보 필드 업데이트 (PostgreSQL 데이터베이스 사용)
  async updateTrainerField(businessId: string, correctionType: string, proposedValue: string) {
    try {
      const trainerId = parseInt(businessId);
      let updateData: any = {};
      
      switch (correctionType) {
        case 'address':
          updateData.address = proposedValue;
          break;
        case 'phone':
          updateData.phone = proposedValue;
          break;
        case 'description':
          updateData.bio = proposedValue;
          break;
        case 'services':
          updateData.specialties = proposedValue.split(',').map(s => s.trim());
          break;
        default:
          updateData[correctionType] = proposedValue;
      }
      
      const [updatedTrainer] = await db.update(trainers)
        .set({ ...updateData, updatedAt: new Date() })
        .where(eq(trainers.id, trainerId))
        .returning();
      
      if (updatedTrainer) {
        console.log('[Storage] 훈련사 정보 업데이트 완료 (DB):', updatedTrainer.name);
      }
    } catch (error) {
      logServerError('[Storage] 훈련사 정보 업데이트 실패:', error);
    }
  }

  // 일반 업체 정보 필드 업데이트
  async updateBusinessField(businessId: string, correctionType: string, proposedValue: string) {
    // 일반 업체 정보 업데이트 로직 (필요시 구현)
    console.log('[Storage] 일반 업체 정보 업데이트:', businessId, correctionType, proposedValue);
  }

  // 강의 생성
  async createCourse(courseData: any): Promise<any> {
    try {
      const newCourse = {
        id: courseData.id || `course-${Date.now()}`,
        title: courseData.title,
        instructor: courseData.instructor,
        description: courseData.description,
        category: courseData.category,
        difficulty: courseData.difficulty,
        price: courseData.price,
        duration: courseData.duration,
        modules: courseData.modules || [],
        enrollmentCount: courseData.enrollmentCount || 0,
        rating: courseData.rating || 0,
        reviewCount: courseData.reviewCount || 0,
        isActive: courseData.isActive !== false,
        featured: courseData.featured || false,
        tags: courseData.tags || [],
        thumbnailUrl: courseData.thumbnailUrl || null, // 썸네일 URL 필드 추가
        createdAt: courseData.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      this.courses.push(newCourse);
      console.log('[Storage] 새 강의 생성:', newCourse.title);
      return newCourse;
    } catch (error) {
      logServerError('[Storage] 강의 생성 실패:', error);
      throw error;
    }
  }

  // 강의 수정
  async updateCourse(id: string, updateData: any): Promise<any> {
    try {
      const course = this.courses.find(c => c.id == id);
      if (course) {
        Object.assign(course, updateData, { updatedAt: new Date().toISOString() });
        console.log(`[Storage] 강의 수정 완료: ${id}`);
        return course;
      }
      console.log(`[Storage] 강의 수정 실패: ${id} 찾을 수 없음`);
      return null;
    } catch (error) {
      logServerError('[Storage] 강의 수정 실패:', error);
      throw error;
    }
  }

  // 보안: 권한 기반 강의 수정
  async updateCourseWithPermission(id: string, updateData: any, user: any): Promise<any> {
    try {
      const course = this.courses.find(c => c.id == id);
      if (!course) {
        console.log(`[Storage] 강의 수정 실패: ${id} 찾을 수 없음`);
        return { error: 'RESOURCE_NOT_FOUND', message: '수정하려는 강의를 찾을 수 없습니다.' };
      }

      // 권한 확인
      const hasPermission = user.role === 'admin' ||
        (user.role === 'institute' && course.instituteId === user.id) ||
        (user.role === 'trainer' && course.instituteId === user.instituteId) ||
        course.instructorId === user.id;

      if (!hasPermission) {
        console.log(`[Storage] 권한 없음: User ${user.id}가 강의 ${id} 수정 시도`);
        return { error: 'INSUFFICIENT_PERMISSIONS', message: '이 강의를 수정할 권한이 없습니다.' };
      }

      // 소유권 필드 보호 - instructorId, instituteId는 수정 불가
      const safeUpdateData = { ...updateData };
      delete safeUpdateData.instructorId;
      delete safeUpdateData.instituteId;
      delete safeUpdateData.createdAt;
      delete safeUpdateData.id;

      Object.assign(course, safeUpdateData, { updatedAt: new Date().toISOString() });
      console.log(`[Storage] 강의 수정 완료: ${id}`);
      return course;
    } catch (error) {
      logServerError('[Storage] 강의 수정 실패:', error);
      throw error;
    }
  }

  // 강의 삭제
  async deleteCourse(id: string): Promise<boolean> {
    try {
      const index = this.courses.findIndex(c => c.id == id);
      if (index !== -1) {
        this.courses.splice(index, 1);
        console.log(`[Storage] 강의 삭제 완료: ${id}`);
        return true;
      }
      console.log(`[Storage] 강의 삭제 실패: ${id} 찾을 수 없음`);
      return false;
    } catch (error) {
      logServerError('[Storage] 강의 삭제 실패:', error);
      throw error;
    }
  }

  // 보안: 권한 기반 강의 삭제
  async deleteCourseWithPermission(id: string, user: any): Promise<{ success: boolean; error?: string; message?: string }> {
    try {
      const courseIndex = this.courses.findIndex(c => c.id == id);
      if (courseIndex === -1) {
        console.log(`[Storage] 강의 삭제 실패: ${id} 찾을 수 없음`);
        return { success: false, error: 'RESOURCE_NOT_FOUND', message: '삭제하려는 강의를 찾을 수 없습니다.' };
      }

      const course = this.courses[courseIndex];

      // 권한 확인
      const hasPermission = user.role === 'admin' ||
        (user.role === 'institute' && course.instituteId === user.id) ||
        (user.role === 'trainer' && course.instituteId === user.instituteId) ||
        course.instructorId === user.id;

      if (!hasPermission) {
        console.log(`[Storage] 권한 없음: User ${user.id}가 강의 ${id} 삭제 시도`);
        return { success: false, error: 'INSUFFICIENT_PERMISSIONS', message: '이 강의를 삭제할 권한이 없습니다.' };
      }

      this.courses.splice(courseIndex, 1);
      console.log(`[Storage] 강의 삭제 완료: ${id}`);
      return { success: true };
    } catch (error) {
      logServerError('[Storage] 강의 삭제 실패:', error);
      throw error;
    }
  }

  // 강의 게시/비게시
  async publishCourse(id: string, isActive: boolean): Promise<any> {
    try {
      const course = this.courses.find(c => c.id == id);
      if (course) {
        course.isActive = isActive;
        course.updatedAt = new Date().toISOString();
        console.log(`[Storage] 강의 게시 상태 변경: ${id} -> ${isActive ? '공개' : '비공개'}`);
        return course;
      }
      console.log(`[Storage] 강의 게시 실패: ${id} 찾을 수 없음`);
      return null;
    } catch (error) {
      logServerError('[Storage] 강의 게시 실패:', error);
      throw error;
    }
  }

  // 훈련사 생성 (PostgreSQL 데이터베이스 사용)
  async createTrainer(trainerData: any): Promise<any> {
    try {
      const newTrainerData = {
        name: trainerData.name,
        email: trainerData.email,
        phone: trainerData.phone,
        bio: trainerData.bio,
        specialty: trainerData.specialty,
        specialties: trainerData.specialties || [],
        experience: trainerData.experience || 0,
        certification: trainerData.certification,
        certifications: trainerData.certifications || [],
        price: trainerData.price?.toString() || "0",
        location: trainerData.location,
        address: trainerData.address,
        profileImage: trainerData.profileImage,
        avatar: trainerData.avatar,
        background: trainerData.background,
        rating: trainerData.rating?.toString() || "0",
        reviewCount: trainerData.reviewCount || 0,
        reviews: trainerData.reviews || 0,
        coursesCount: trainerData.coursesCount || 0,
        studentsCount: trainerData.studentsCount || 0,
        featured: trainerData.featured || false,
        verified: trainerData.verified || false,
        isActive: trainerData.isActive !== false,
        status: trainerData.status || 'active',
        institute: trainerData.institute,
        instituteId: trainerData.instituteId,
        category: trainerData.category,
        userId: trainerData.userId,
      };

      const [savedTrainer] = await db.insert(trainers).values(newTrainerData).returning();
      console.log('[Storage] 새 훈련사 생성 (DB):', savedTrainer.name);
      return savedTrainer;
    } catch (error) {
      logServerError('[Storage] 훈련사 생성 실패:', error);
      throw error;
    }
  }

  // 훈련사 목록 조회 (PostgreSQL 데이터베이스 사용)
  async getTrainers(options: any = {}): Promise<any[]> {
    try {
      let query = db.select().from(trainers);
      
      if (options.instituteId) {
        query = query.where(eq(trainers.instituteId, options.instituteId)) as any;
      }
      
      if (options.isActive !== undefined) {
        query = query.where(eq(trainers.isActive, options.isActive)) as any;
      }
      
      const result = await query;
      console.log(`[Storage] 훈련사 목록 조회 (DB): ${result.length}명`);
      return result;
    } catch (error) {
      logServerError('[Storage] 훈련사 목록 조회 실패:', error);
      return [];
    }
  }

  // 훈련사 단일 조회 (PostgreSQL 데이터베이스 사용)
  async getTrainerById(trainerId: number): Promise<any> {
    try {
      const [trainer] = await db.select().from(trainers).where(eq(trainers.id, trainerId));
      return trainer || null;
    } catch (error) {
      logServerError('[Storage] 훈련사 조회 실패:', error);
      return null;
    }
  }

  // 훈련사 정보 업데이트 (PostgreSQL 데이터베이스 사용)
  async updateTrainer(trainerId: number, updateData: any): Promise<any> {
    try {
      const [updatedTrainer] = await db.update(trainers)
        .set({ ...updateData, updatedAt: new Date() })
        .where(eq(trainers.id, trainerId))
        .returning();
      console.log('[Storage] 훈련사 정보 업데이트 (DB):', updatedTrainer?.name);
      return updatedTrainer;
    } catch (error) {
      logServerError('[Storage] 훈련사 업데이트 실패:', error);
      throw error;
    }
  }

  // 정보 수정 요청 목록 조회
  getCorrectionRequests() {
    return [
      {
        id: '1',
        businessId: '1',
        businessName: '서울 펫트레이닝 센터',
        businessType: 'institute',
        requesterName: '김철수',
        requesterEmail: 'kimcs@example.com',
        requesterPhone: '010-1234-5678',
        correctionType: 'address',
        currentValue: '서울시 강남구 역삼동 123-45',
        proposedValue: '서울시 강남구 역삼동 678-90',
        reason: '이전으로 인한 주소 변경',
        evidence: ['image1.jpg', 'lease_contract.pdf'],
        status: 'pending',
        submittedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        priority: 'high'
      },
      {
        id: '2',
        businessId: '2',
        businessName: '부산 동물병원',
        businessType: 'business',
        requesterName: '이영희',
        requesterEmail: 'leeyh@example.com',
        correctionType: 'phone',
        currentValue: '051-123-4567',
        proposedValue: '051-987-6543',
        reason: '전화번호 변경',
        status: 'in-review',
        submittedAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
        priority: 'medium'
      }
    ];
  }

  // 상품 관련 메소드들
  async getProducts() {
    try {
      console.log('[Storage] 상품 목록 조회');
      return this.products || [];
    } catch (error) {
      logServerError('[Storage] 상품 목록 조회 실패:', error);
      return [];
    }
  }

  // 강의 구매 관련 메소
  async purchaseCourse(userId: number, courseId: number, purchaseAmount: number, paymentMethod: string) {
    try {
      const purchase = {
        id: this.coursePurchases.length + 1,
        userId,
        courseId,
        purchaseAmount,
        paymentMethod,
        paymentStatus: 'completed',
        accessGranted: true,
        expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1년 후
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      this.coursePurchases.push(purchase);

      // 강의 진행 상황 초기화
      const progress = {
        id: this.courseProgress.length + 1,
        userId,
        courseId,
        currentLesson: 1,
        completedLessons: 0,
        totalLessons: 10, // 기본값
        progressPercentage: 0,
        timeSpent: 0,
        averageScore: 0,
        lastAccessedAt: new Date().toISOString(),
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      this.courseProgress.push(progress);

      return { purchase, progress };
    } catch (error) {
      logServerError('[Storage] 강의 구매 실패:', error);
      throw error;
    }
  }

  // 강의 진행 상황 업데이트
  async updateCourseProgress(userId: number, courseId: number, progressData: any) {
    try {
      const progressIndex = this.courseProgress.findIndex(p => p.userId === userId && p.courseId === courseId);

      if (progressIndex === -1) {
        throw new Error('강의 진행 상황을 찾을 수 없습니다.');
      }

      this.courseProgress[progressIndex] = {
        ...this.courseProgress[progressIndex],
        ...progressData,
        updatedAt: new Date().toISOString()
      };

      return this.courseProgress[progressIndex];
    } catch (error) {
      logServerError('[Storage] 강의 진행 상황 업데이트 실패:', error);
      throw error;
    }
  }

  // 진행 상황 공유
  async shareProgress(userId: number, courseId: number, shareType: string, trainerId?: number, instituteId?: number) {
    try {
      const sharing = {
        id: this.progressSharing.length + 1,
        userId,
        courseId,
        trainerId,
        instituteId,
        shareType,
        sharedAt: new Date().toISOString(),
        permissions: {
          canViewProgress: true,
          canViewDetailedStats: true,
          canReceiveNotifications: true
        },
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      this.progressSharing.push(sharing);
      return sharing;
    } catch (error) {
      logServerError('[Storage] 진행 상황 공유 실패:', error);
      throw error;
    }
  }

  // 사용자별 강의 구매 목록 조회
  async getUserCoursePurchases(userId: number) {
    try {
      return this.coursePurchases.filter(purchase => purchase.userId === userId);
    } catch (error) {
      logServerError('[Storage] 사용자 강의 구매 목록 조회 실패:', error);
      return [];
    }
  }

  // 사용자별 강의 진행 상황 조회
  async getUserCourseProgress(userId: number) {
    try {
      return this.courseProgress.filter(progress => progress.userId === userId);
    } catch (error) {
      logServerError('[Storage] 사용자 강의 진행 상황 조회 실패:', error);
      return [];
    }
  }

  // 훈련사별 공유된 진행 상황 조회
  async getSharedProgressByTrainer(trainerId: number) {
    try {
      const sharedProgress = this.progressSharing.filter(sharing =>
        sharing.trainerId === trainerId && sharing.isActive
      );

      const progressWithDetails = sharedProgress.map(sharing => {
        const progress = this.courseProgress.find(p =>
          p.userId === sharing.userId && p.courseId === sharing.courseId
        );
        const user = this.users.find(u => u.id === sharing.userId);
        const course = this.courses.find(c => c.id === sharing.courseId);

        return {
          ...sharing,
          progress,
          user,
          course
        };
      });

      return progressWithDetails;
    } catch (error) {
      logServerError('[Storage] 훈련사별 공유 진행 상황 조회 실패:', error);
      return [];
    }
  }

  // 기관별 공유된 진행 상황 조회
  async getSharedProgressByInstitute(instituteId: number) {
    try {
      const sharedProgress = this.progressSharing.filter(sharing =>
        sharing.instituteId === instituteId && sharing.isActive
      );

      const progressWithDetails = sharedProgress.map(sharing => {
        const progress = this.courseProgress.find(p =>
          p.userId === sharing.userId && p.courseId === sharing.courseId
        );
        const user = this.users.find(u => u.id === sharing.userId);
        const course = this.courses.find(c => c.id === sharing.courseId);

        return {
          ...sharing,
          progress,
          user,
          course
        };
      });

      return progressWithDetails;
    } catch (error) {
      logServerError('[Storage] 기관별 공유 진행 상황 조회 실패:', error);
      return [];
    }
  }

  // 강의 세션 기록 저장
  async recordLessonSession(userId: number, courseId: number, sessionData: any) {
    try {
      const session = {
        id: this.lessonSessions.length + 1,
        userId,
        courseId,
        ...sessionData,
        createdAt: new Date().toISOString()
      };

      this.lessonSessions.push(session);
      return session;
    } catch (error) {
      logServerError('[Storage] 강의 세션 기록 실패:', error);
      throw error;
    }
  }

  // 포인트 관리 관련 메서드들
  getTrainerActivityLogs(filters: any = {}) {
    return this.trainerActivityLogs.filter(log => {
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        const matchesSearch = log.trainerName.toLowerCase().includes(searchTerm) ||
          log.activityTitle.toLowerCase().includes(searchTerm) ||
          log.activityDescription.toLowerCase().includes(searchTerm);
        if (!matchesSearch) return false;
      }

      if (filters.activityType && filters.activityType !== 'all') {
        if (log.activityType !== filters.activityType) return false;
      }

      if (filters.trainer && filters.trainer !== 'all') {
        if (log.trainerId.toString() !== filters.trainer) return false;
      }

      if (filters.date && filters.date !== 'all') {
        const logDate = new Date(log.createdAt);
        const today = new Date();

        switch (filters.date) {
          case 'today':
            if (logDate.toDateString() !== today.toDateString()) return false;
            break;
          case 'week':
            const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
            if (logDate < weekAgo) return false;
            break;
          case 'month':
            const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
            if (logDate < monthAgo) return false;
            break;
        }
      }

      return true;
    });
  }

  getActivitySummary() {
    const logs = this.trainerActivityLogs;

    const totalActivities = logs.length;
    const totalPoints = logs.reduce((sum, log) => sum + log.pointsEarned, 0);
    const totalIncentives = logs.reduce((sum, log) => sum + Number(log.incentiveAmount), 0);
    const activeTrainers = new Set(logs.map(log => log.trainerId)).size;

    // 활동 타입별 집계
    const activityCounts: Record<string, any> = {};
    logs.forEach(log => {
      if (!activityCounts[log.activityType]) {
        activityCounts[log.activityType] = {
          activityType: log.activityType,
          activityTitle: log.activityTitle,
          count: 0,
          totalPoints: 0
        };
      }
      activityCounts[log.activityType].count++;
      activityCounts[log.activityType].totalPoints += log.pointsEarned;
    });

    const topActivities = Object.values(activityCounts)
      .sort((a, b) => b.totalPoints - a.totalPoints)
      .slice(0, 5);

    return {
      totalActivities,
      totalPoints,
      totalIncentives,
      activeTrainers,
      topActivities
    };
  }

  getTrainerStats() {
    const logs = this.trainerActivityLogs;
    const trainerStats: Record<number, any> = {};

    logs.forEach(log => {
      if (!trainerStats[log.trainerId]) {
        trainerStats[log.trainerId] = {
          trainerId: log.trainerId,
          trainerName: log.trainerName,
          totalActivities: 0,
          totalPoints: 0,
          totalIncentives: 0,
          lastActivity: log.createdAt,
          topActivity: log.activityTitle,
          rank: 0
        };
      }

      trainerStats[log.trainerId].totalActivities++;
      trainerStats[log.trainerId].totalPoints += log.pointsEarned;
      trainerStats[log.trainerId].totalIncentives += Number(log.incentiveAmount);

      if (new Date(log.createdAt) > new Date(trainerStats[log.trainerId].lastActivity)) {
        trainerStats[log.trainerId].lastActivity = log.createdAt;
      }
    });

    const statsArray = Object.values(trainerStats)
      .sort((a, b) => b.totalPoints - a.totalPoints)
      .map((stat, index) => ({
        ...stat,
        rank: index + 1
      }));

    return statsArray;
  }

  deleteTrainerActivityLog(logId: number) {
    const index = this.trainerActivityLogs.findIndex(log => log.id === logId);
    if (index !== -1) {
      this.trainerActivityLogs.splice(index, 1);
      return true;
    }
    return false;
  }

  recalculatePoints() {
    // 포인트 재계산 로직
    console.log('[Storage] 포인트 재계산 시작');

    // 현재는 단순히 로그를 출력하고 성공 반환
    this.trainerActivityLogs.forEach(log => {
      log.pointsEarned = this.calculatePoints(log.activityType, log.metadata);
    });

    console.log('[Storage] 포인트 재계산 완료');
    return true;
  }

  private calculatePoints(activityType: string, metadata: any) {
    // 활동 타입별 포인트 계산 로직
    const pointValues = {
      'video_upload': 50,
      'comment': 5,
      'view': 1,
      'member_recruitment': 100,
      'certification': 200,
      'consultation': 30,
      'course_creation': 150
    };

    return pointValues[activityType as keyof typeof pointValues] || 0;
  }

  // 포인트 설정 관련 메서드들
  getPointSettings() {
    return this.pointSettings;
  }

  updatePointSettings(settings: any) {
    this.pointSettings = { ...this.pointSettings, ...settings };
    return this.pointSettings;
  }

  // ===== 대체 훈련사 시스템 메서드들 =====

  // 대체 훈련사 게시글 조회 (PostgreSQL 데이터베이스 사용)
  async getSubstituteTrainerPosts(options: any = {}) {
    const { page = 1, limit = 10, status = 'all', instituteId } = options;

    let posts = this.substituteClassPosts.filter(post => {
      if (status !== 'all' && post.status !== status) return false;
      if (instituteId && post.instituteId !== instituteId) return false;
      return true;
    });

    // 훈련사 정보 포함 (데이터베이스에서 조회)
    const postsWithTrainers = await Promise.all(posts.map(async post => ({
      ...post,
      trainer: await this.getTrainerById(post.trainerId),
    })));

    // 페이지네이션 적용
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;

    return postsWithTrainers.slice(startIndex, endIndex);
  }

  // 대체 훈련사 게시글 생성
  async createSubstituteTrainerPost(postData: any) {
    const newPost = {
      id: this.substituteClassPosts.length + 1,
      ...postData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.substituteClassPosts.push(newPost);
    return newPost;
  }

  // 대체 훈련사 게시글 단일 조회 (PostgreSQL 데이터베이스 사용)
  async getSubstituteTrainerPost(postId: number) {
    const post = this.substituteClassPosts.find(p => p.id === postId);
    if (!post) return null;

    return {
      ...post,
      trainer: await this.getTrainerById(post.trainerId),
      applications: this.substituteClassApplications.filter(app => app.postId === postId)
    };
  }

  // 대체 훈련사 게시글 업데이트
  async updateSubstituteTrainerPost(postId: number, updateData: any) {
    const postIndex = this.substituteClassPosts.findIndex(p => p.id === postId);
    if (postIndex === -1) throw new Error('게시글을 찾을 수 없습니다.');

    this.substituteClassPosts[postIndex] = {
      ...this.substituteClassPosts[postIndex],
      ...updateData,
      updatedAt: new Date().toISOString()
    };

    return this.substituteClassPosts[postIndex];
  }

  // 대체 훈련사 지원 신청 생성
  async createSubstituteTrainerApplication(applicationData: any) {
    const newApplication = {
      id: this.substituteClassApplications.length + 1,
      ...applicationData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.substituteClassApplications.push(newApplication);
    return newApplication;
  }

  // 대체 훈련사 지원 신청 조회 (PostgreSQL 데이터베이스 사용)
  async getSubstituteTrainerApplications(options: any = {}) {
    const { instituteId } = options;

    let applications = this.substituteClassApplications;

    if (instituteId) {
      // 기관 소속 훈련사들의 지원 신청만 필터링
      const institutePosts = this.substituteClassPosts.filter(p => p.instituteId === instituteId);
      const institutePostIds = institutePosts.map(p => p.id);
      applications = applications.filter(app => institutePostIds.includes(app.postId));
    }

    // 데이터베이스에서 훈련사 정보 조회
    const applicationsWithDetails = await Promise.all(applications.map(async app => ({
      ...app,
      post: this.substituteClassPosts.find(p => p.id === app.postId),
      applicant: await this.getTrainerById(app.applicantId)
    })));

    return applicationsWithDetails;
  }

  // 대체 훈련사 지원 신청 업데이트
  async updateSubstituteTrainerApplication(applicationId: number, updateData: any) {
    const applicationIndex = this.substituteClassApplications.findIndex(a => a.id === applicationId);
    if (applicationIndex === -1) throw new Error('지원 신청을 찾을 수 없습니다.');

    this.substituteClassApplications[applicationIndex] = {
      ...this.substituteClassApplications[applicationIndex],
      ...updateData,
      updatedAt: new Date().toISOString()
    };

    return this.substituteClassApplications[applicationIndex];
  }

  // ===== 결제 관리 시스템 메서드들 =====

  // 결제 수단 조회
  getPaymentMethods() {
    return this.paymentMethods;
  }

  // 결제 수단 생성 (새로 추가)
  createPaymentMethod(methodData: any) {
    const newMethod = {
      ...methodData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.paymentMethods.push(newMethod);
    console.log('[Payment] 새 결제 수단 추가:', newMethod.name);
    return newMethod;
  }

  // 결제 수단 등록
  registerPaymentMethod(methodData: any) {
    const newMethod = {
      id: `payment_${Date.now()}`,
      ...methodData,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.paymentMethods.push(newMethod);
    return newMethod;
  }

  // 결제 수단 업데이트
  updatePaymentMethod(methodId: string, updateData: any) {
    const methodIndex = this.paymentMethods.findIndex(m => m.id === methodId);
    if (methodIndex === -1) throw new Error('결제 수단을 찾을 수 없습니다.');

    this.paymentMethods[methodIndex] = {
      ...this.paymentMethods[methodIndex],
      ...updateData,
      updatedAt: new Date().toISOString()
    };

    return this.paymentMethods[methodIndex];
  }

  // 결제 수단 삭제
  deletePaymentMethod(methodId: string) {
    const methodIndex = this.paymentMethods.findIndex(m => m.id === methodId);
    if (methodIndex === -1) throw new Error('결제 수단을 찾을 수 없습니다.');

    this.paymentMethods.splice(methodIndex, 1);
    return true;
  }

  // 사용자 요금제 조회
  getUserPaymentPlans() {
    return this.userPaymentPlans;
  }

  // 사용자 요금제 업데이트
  updateUserPaymentPlan(role: string, planData: any) {
    const planIndex = this.userPaymentPlans.findIndex(p => p.role === role);

    if (planIndex === -1) {
      // 새로운 요금제 생성
      const newPlan = {
        id: `plan_${Date.now()}`,
        role,
        ...planData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      this.userPaymentPlans.push(newPlan);
      return newPlan;
    } else {
      // 기존 요금제 업데이트
      this.userPaymentPlans[planIndex] = {
        ...this.userPaymentPlans[planIndex],
        ...planData,
        updatedAt: new Date().toISOString()
      };
      return this.userPaymentPlans[planIndex];
    }
  }

  // 결제 내역 조회
  getPaymentHistory(options: any = {}) {
    const { startDate, endDate, status, methodId } = options;

    let history = this.paymentHistory;

    if (startDate) {
      history = history.filter(h => new Date(h.createdAt) >= new Date(startDate));
    }

    if (endDate) {
      history = history.filter(h => new Date(h.createdAt) <= new Date(endDate));
    }

    if (status) {
      history = history.filter(h => h.status === status);
    }

    if (methodId) {
      history = history.filter(h => h.paymentMethod === methodId);
    }

    return history.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  // 결제 내역 추가
  addPaymentHistory(historyData: any) {
    const newHistory = {
      id: `payment_history_${Date.now()}`,
      ...historyData,
      createdAt: new Date().toISOString()
    };

    this.paymentHistory.push(newHistory);
    return newHistory;
  }

  // 대체 훈련사 세션 완료 처리
  async completeSubstituteTrainerSession(sessionId: number, completionData: any) {
    // 세션 완료 처리 로직 (실제 구현에서는 별도 세션 테이블 사용)
    const session = {
      id: sessionId,
      ...completionData,
      status: 'completed'
    };

    return session;
  }

  // 대체 훈련사 결제 처리
  async processSubstituteTrainerPayment(paymentData: any) {
    // 결제 처리 로직 (실제 구현에서는 결제 시스템 연동)
    const payment = {
      id: Date.now(), // 임시 ID
      ...paymentData,
      paymentStatus: 'completed',
      processedAt: new Date().toISOString()
    };

    return payment;
  }

  // 대체 훈련사 시스템 초기 데이터 생성 (데이터베이스에 시드 데이터 추가)
  private async initializeSubstituteTrainerData() {
    // 데이터베이스에 초기 훈련사 데이터 시드 (기존 데이터가 없을 경우에만)
    try {
      const existingTrainers = await db.select().from(trainers);
      if (existingTrainers.length === 0) {
        console.log('[Storage] 훈련사 초기 데이터 시드 시작...');
        const seedTrainers = [
          {
            name: '강동훈',
            email: 'donghoong@wangzzang.com',
            phone: '010-4765-1909',
            certification: '반려동물행동지도사 국가자격증 2급',
            experience: 5,
            specialties: ['기초 훈련', '문제 행동 교정', '사회화 훈련'],
            institute: '왕짱 훈련센터',
            isActive: true,
            status: 'active',
            verified: true,
          },
          {
            name: '김민수',
            email: 'kim@trainingcenter.com',
            phone: '010-1234-5678',
            certification: '반려동물 훈련 전문가 자격증',
            experience: 8,
            specialties: ['사회화 훈련', '분리불안 치료', '기초 복종'],
            institute: '서울 훈련센터',
            isActive: true,
            status: 'active',
            verified: true,
          },
          {
            name: '박지혜',
            email: 'park@behaviorplus.com',
            phone: '010-9876-5432',
            certification: '동물행동 전문가 자격증',
            experience: 6,
            specialties: ['행동 교정', '공격성 치료', '고급 훈련'],
            institute: '행동교정 전문센터',
            isActive: true,
            status: 'active',
            verified: true,
          },
          {
            name: '이수현',
            email: 'lee@puppytraining.com',
            phone: '010-5678-9012',
            certification: '반려동물 훈련사 자격증',
            experience: 4,
            specialties: ['퍼피 훈련', '소형견 전문', '기초 복종'],
            institute: '퍼피 훈련원',
            isActive: true,
            status: 'active',
            verified: true,
          },
          {
            name: '최영진',
            email: 'choi@advancedtraining.com',
            phone: '010-3456-7890',
            certification: '동물행동 치료사 자격증',
            experience: 10,
            specialties: ['고급 훈련', '특수 행동 치료', '전문 트레이닝'],
            institute: '고급 훈련 아카데미',
            isActive: true,
            status: 'active',
            verified: true,
          },
          {
            name: "우하나",
            email: "whn0525@naver.com",
            phone: "010-2447-4900",
            specialty: "행동교정 및 사회화",
            certifications: ["인천광역시고등학교 - 순천부", "서울중앙고등학교 - 반려동물관리학과 졸업", "서울문화예술대학교 - 반려동물관리 전공"],
            experience: 20,
            rating: "4.9",
            reviews: 215,
            institute: "이화목",
            bio: "20년 경력의 행동교정 및 사회화 전문 훈련사입니다.",
            avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=우하나&backgroundColor=ffd1dc",
            status: "active",
            coursesCount: 18,
            studentsCount: 142,
            isActive: true,
            verified: true,
          }
        ];

        await db.insert(trainers).values(seedTrainers);
        console.log('[Storage] 훈련사 초기 데이터 시드 완료:', seedTrainers.length, '명');
      } else {
        console.log('[Storage] 훈련사 데이터가 이미 존재함:', existingTrainers.length, '명');
      }
    } catch (error) {
      logServerError('[Storage] 훈련사 초기 데이터 시드 실패:', error);
    }

    // 샘플 대체 훈련사 게시글 데이터
    this.substituteClassPosts = [
      {
        id: 1,
        trainerId: 1,
        instituteId: 1,
        title: "급하게 대체 훈련사 구합니다 - 골든리트리버 기초 훈련",
        content: "갑작스러운 개인 사정으로 내일 오후 2시 수업을 진행할 수 없게 되었습니다. 골든리트리버 기초 복종 훈련이며, 반려견 경험이 풍부한 훈련사분을 찾습니다.",
        substituteDate: new Date('2025-07-19'),
        substituteTime: "14:00",
        location: "강남구 테헤란로 123",
        trainingType: "기초 복종 훈련",
        petInfo: "골든리트리버, 2살, 수컷, 이름: 맥스",
        requirements: "골든리트리버 훈련 경험 필수, TALEZ 인증 훈련사",
        paymentAmount: 80000,
        status: "open",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 2,
        trainerId: 2,
        instituteId: 1,
        title: "주말 대체 훈련사 모집 - 소형견 사회화 훈련",
        content: "이번 주말 토요일 오전 10시 소형견 사회화 훈련 수업을 대신 진행해주실 훈련사를 찾습니다. 소형견 특화 훈련 경험이 있으신 분 우대합니다.",
        substituteDate: new Date('2025-07-20'),
        substituteTime: "10:00",
        location: "서초구 서초대로 456",
        trainingType: "사회화 훈련",
        petInfo: "요크셔테리어, 1살, 암컷, 이름: 루나",
        requirements: "소형견 훈련 경험, 사회화 훈련 전문성",
        paymentAmount: 60000,
        status: "open",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    // 샘플 대체 훈련사 지원 신청 데이터
    this.substituteClassApplications = [
      {
        id: 1,
        postId: 1,
        applicantId: 3,
        message: "안녕하세요, 골든리트리버 훈련 경험이 5년 이상 있는 전문 훈련사입니다. 기초 복종 훈련에 특화되어 있으며, 해당 시간에 대체 수업 진행 가능합니다.",
        status: "pending",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 2,
        postId: 2,
        applicantId: 4,
        message: "소형견 사회화 훈련 전문가입니다. 특히 요크셔테리어 훈련 경험이 많으며, 주말 수업 진행에 문제없습니다.",
        status: "pending",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    // 결제 수단 초기화
    this.initializePaymentMethods();

    // 사용자 요금제 초기화
    this.initializeUserPaymentPlans();

    // 결제 내역 초기화
    this.initializePaymentHistory();
  }

  // 결제 수단 초기 데이터
  private initializePaymentMethods() {
    this.paymentMethods = [
      {
        id: 'toss',
        name: 'Toss Payments',
        type: 'pg',
        description: '토스페이먼츠 결제 게이트웨이',
        provider: 'TossPayments',
        apiKey: process.env.TOSS_SECRET_KEY || '',
        status: 'active',
        supportedMethods: ['카드', '계좌이체', '가상계좌', '간편결제'],
        commissionRate: 2.9,
        setupFee: 0,
        monthlyFee: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'kakao',
        name: 'KakaoPay',
        type: 'wallet',
        description: '카카오페이 간편결제',
        provider: 'Kakao',
        apiKey: process.env.KAKAO_PAY_API_KEY || '',
        status: 'active',
        supportedMethods: ['간편결제', '카드'],
        commissionRate: 2.5,
        setupFee: 0,
        monthlyFee: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'naver',
        name: 'NaverPay',
        type: 'wallet',
        description: '네이버페이 간편결제',
        provider: 'Naver',
        apiKey: process.env.NAVER_PAY_API_KEY || '',
        status: 'active',
        supportedMethods: ['간편결제', '카드', '포인트'],
        commissionRate: 2.8,
        setupFee: 0,
        monthlyFee: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'stripe',
        name: 'Stripe',
        type: 'pg',
        description: 'Stripe 글로벌 결제 시스템',
        provider: 'Stripe',
        apiKey: process.env.STRIPE_SECRET_KEY || '',
        status: 'active',
        supportedMethods: ['카드', 'Apple Pay', 'Google Pay'],
        commissionRate: 3.4,
        setupFee: 0,
        monthlyFee: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];
  }

  // 사용자 요금제 초기 데이터
  private initializeUserPaymentPlans() {
    this.userPaymentPlans = [
      {
        id: 'plan_pet_owner',
        role: 'pet-owner',
        name: '반려인 기본 요금제',
        description: '반려인을 위한 기본 서비스 이용 요금제',
        monthlyFee: 0,
        features: ['무료 상담 1회', '기본 훈련 콘텐츠 접근', '커뮤니티 참여'],
        limitations: ['프리미엄 콘텐츠 제한', '월 상담 1회 한정'],
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'plan_trainer',
        role: 'trainer',
        name: '훈련사 프리미엄 요금제',
        description: '전문 훈련사를 위한 프리미엄 서비스',
        monthlyFee: 29000,
        features: ['무제한 강의 등록', '수입 정산', '마케팅 지원', '고급 분석 도구'],
        limitations: ['없음'],
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'plan_institute',
        role: 'institute',
        name: '교육기관 엔터프라이즈',
        description: '교육기관을 위한 통합 관리 솔루션',
        monthlyFee: 99000,
        features: ['기관 관리 도구', '다중 훈련사 관리', '통합 정산', '고급 리포팅', '전담 지원'],
        limitations: ['없음'],
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'plan_admin',
        role: 'admin',
        name: '시스템 관리자',
        description: '플랫폼 전체 관리를 위한 관리자 권한',
        monthlyFee: 0,
        features: ['전체 시스템 관리', '모든 기능 접근', '사용자 관리', '결제 관리', '분석 도구'],
        limitations: ['없음'],
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];
  }

  // 결제 내역 초기 데이터
  private initializePaymentHistory() {
    this.paymentHistory = [
      {
        id: 'payment_1',
        orderId: 'order_20250126_001',
        userId: 2,
        userName: '김지영',
        amount: 45000,
        paymentMethod: 'kakao',
        paymentMethodName: 'KakaoPay',
        status: 'completed',
        description: '기초 복종 훈련 강의 구매',
        transactionId: 'kakao_tx_12345',
        createdAt: new Date('2025-01-26T10:30:00').toISOString()
      },
      {
        id: 'payment_2',
        orderId: 'order_20250126_002',
        userId: 3,
        userName: '박민호',
        amount: 29000,
        paymentMethod: 'toss',
        paymentMethodName: 'Toss Payments',
        status: 'completed',
        description: '훈련사 월 구독료',
        transactionId: 'toss_tx_67890',
        createdAt: new Date('2025-01-26T14:15:00').toISOString()
      },
      {
        id: 'payment_3',
        orderId: 'order_20250126_003',
        userId: 4,
        userName: '이수진',
        amount: 15000,
        paymentMethod: 'naver',
        paymentMethodName: 'NaverPay',
        status: 'pending',
        description: '화상 상담 예약',
        transactionId: 'naver_tx_11111',
        createdAt: new Date('2025-01-26T16:45:00').toISOString()
      },
      {
        id: 'payment_4',
        orderId: 'order_20250125_001',
        userId: 2,
        userName: '김지영',
        amount: 99000,
        paymentMethod: 'stripe',
        paymentMethodName: 'Stripe',
        status: 'completed',
        description: '기관 엔터프라이즈 구독',
        transactionId: 'stripe_tx_22222',
        createdAt: new Date('2025-01-25T09:20:00').toISOString()
      }
    ];
  }

  // =============================================================================
  // 트레이너 리뷰 & 평점 (Task #19) — 인메모리 구현
  // =============================================================================
  trainerReviews: any[] = [];
  trainerReviewReplies: any[] = [];
  trainerReviewReports: any[] = [];

  private nextId(arr: any[]): number {
    return arr.length ? Math.max(...arr.map((x: any) => x.id || 0)) + 1 : 1;
  }

  createTrainerReview(data: any, user?: { id: number; name?: string }) {
    const review = {
      id: this.nextId(this.trainerReviews),
      trainerId: Number(data.trainerId),
      authorId: Number(data.authorId),
      authorName: user?.name || (this.users.find((u: any) => u.id === Number(data.authorId))?.name) || "보호자",
      petId: data.petId ?? null,
      courseId: data.courseId ?? null,
      lessonRef: data.lessonRef ?? null,
      rating: Math.max(1, Math.min(5, Number(data.rating))),
      title: data.title ?? null,
      content: String(data.content || ""),
      photos: Array.isArray(data.photos) ? data.photos : [],
      status: "active",
      hiddenReason: null,
      moderatedBy: null,
      moderatedAt: null,
      helpfulCount: 0,
      reportCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.trainerReviews.push(review);
    return review;
  }

  getTrainerReviewById(id: number) {
    return this.trainerReviews.find((r: any) => r.id === id) || null;
  }

  listTrainerReviews(opts: { trainerId?: number; authorId?: number; includeHidden?: boolean }) {
    let list = this.trainerReviews.slice();
    if (!opts.includeHidden) list = list.filter((r: any) => r.status === "active");
    if (typeof opts.trainerId === "number") list = list.filter((r: any) => r.trainerId === opts.trainerId);
    if (typeof opts.authorId === "number") list = list.filter((r: any) => r.authorId === opts.authorId);
    list.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return list.map((r: any) => ({
      ...r,
      reply: this.trainerReviewReplies.find((rep: any) => rep.reviewId === r.id) || null,
    }));
  }

  getTrainerReviewSummary(trainerId: number) {
    const reviews = this.trainerReviews.filter((r: any) => r.trainerId === trainerId && r.status === "active");
    const count = reviews.length;
    const average = count ? reviews.reduce((s: number, r: any) => s + r.rating, 0) / count : 0;
    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviews.forEach((r: any) => { distribution[r.rating] = (distribution[r.rating] || 0) + 1; });
    return {
      trainerId,
      count,
      average: Number(average.toFixed(2)),
      distribution,
    };
  }

  getTrainerReviewReply(reviewId: number) {
    return this.trainerReviewReplies.find((r: any) => r.reviewId === reviewId) || null;
  }

  createTrainerReviewReply(data: any) {
    const reply = {
      id: this.nextId(this.trainerReviewReplies),
      reviewId: Number(data.reviewId),
      trainerId: Number(data.trainerId),
      content: String(data.content || ""),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.trainerReviewReplies.push(reply);
    return reply;
  }

  createTrainerReviewReport(data: any) {
    const report = {
      id: this.nextId(this.trainerReviewReports),
      reviewId: Number(data.reviewId),
      reporterId: Number(data.reporterId),
      reason: data.reason,
      description: data.description ?? null,
      status: "pending",
      resolvedBy: null,
      resolvedAt: null,
      createdAt: new Date().toISOString(),
    };
    this.trainerReviewReports.push(report);
    const review = this.getTrainerReviewById(report.reviewId);
    if (review) {
      review.reportCount = (review.reportCount || 0) + 1;
      review.updatedAt = new Date().toISOString();
    }
    return report;
  }

  adminListTrainerReviews(opts: { status?: string }) {
    let reviews = this.trainerReviews.slice();
    if (opts.status && opts.status !== "all") reviews = reviews.filter((r: any) => r.status === opts.status);
    reviews.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const enriched = reviews.map((r: any) => ({
      ...r,
      trainerName: this.users.find((u: any) => u.id === r.trainerId)?.name || `트레이너#${r.trainerId}`,
      authorName: r.authorName || (this.users.find((u: any) => u.id === r.authorId)?.name) || "보호자",
      reply: this.trainerReviewReplies.find((rep: any) => rep.reviewId === r.id) || null,
      reports: this.trainerReviewReports.filter((rep: any) => rep.reviewId === r.id),
    }));
    return {
      reviews: enriched,
      reports: this.trainerReviewReports.slice().sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
      total: enriched.length,
    };
  }

  adminModerateTrainerReview(id: number, action: "hide" | "restore" | "delete", reason: string | undefined, moderatorId: number) {
    const review = this.getTrainerReviewById(id);
    if (!review) return null;
    if (action === "hide") {
      review.status = "hidden";
      review.hiddenReason = reason || null;
    } else if (action === "restore") {
      review.status = "active";
      review.hiddenReason = null;
    } else if (action === "delete") {
      review.status = "deleted";
    }
    review.moderatedBy = moderatorId;
    review.moderatedAt = new Date().toISOString();
    review.updatedAt = new Date().toISOString();
    return review;
  }

  adminUpdateTrainerReviewReport(id: number, status: "reviewed" | "dismissed", resolverId: number) {
    const report = this.trainerReviewReports.find((r: any) => r.id === id);
    if (!report) return null;
    report.status = status;
    report.resolvedBy = resolverId;
    report.resolvedAt = new Date().toISOString();
    return report;
  }

  // 수업 완료 후 N(=14)일 이내, 아직 리뷰 미작성 항목 추출
  getEligibleReviewTargets(userId: number) {
    const now = Date.now();
    const windowMs = 14 * 24 * 60 * 60 * 1000;
    const written = new Set(
      this.trainerReviews
        .filter((r: any) => r.authorId === userId)
        .map((r: any) => `${r.trainerId}:${r.lessonRef || ""}`)
    );
    const targets: any[] = [];

    (this.pets || [])
      .filter((p: any) => p.ownerId === userId && p.assignedTrainerId)
      .forEach((p: any) => {
        // 완료 상태만 인정
        const isCompleted =
          p.trainingStatus === "completed" || p.status === "completed";
        if (!isCompleted) return;

        // 완료 시각 추출 (trainingEndDate, completedAt, updatedAt 순)
        const completedAtRaw = p.trainingEndDate || p.completedAt || p.updatedAt;
        if (!completedAtRaw) return;
        const completedTs = new Date(completedAtRaw).getTime();
        if (isNaN(completedTs)) return;

        // 완료 후 N일 이내
        if (now - completedTs > windowMs || completedTs > now) return;

        const lessonRef = `pet-${p.id}`;
        const key = `${p.assignedTrainerId}:${lessonRef}`;
        if (written.has(key)) return;

        targets.push({
          trainerId: p.assignedTrainerId,
          trainerName: p.assignedTrainerName,
          petId: p.id,
          petName: p.name,
          lessonRef,
          completedAt: new Date(completedTs).toISOString(),
        });
      });
    return targets;
  }
}

// 개발 환경에서는 데이터베이스 연동을 위해 하이브리드 접근 방식 사용
class HybridStorage extends Storage {
  // 데이터베이스 연동 메서드들 추가

  constructor() {
    super();
    // 다이어리 영구 저장 테이블 초기화 (비동기)
    this.initDiaryTables().catch(err => logServerError('[DB] 다이어리 테이블 초기화 오류:', err));
  }

  // =============================================================================
  // 다이어리(반려견 건강 다이어리) DB 영속화 - 마이그레이션 + CRUD
  // =============================================================================

  private diaryTablesReady: Promise<void> | null = null;

  private async initDiaryTables(): Promise<void> {
    if (this.diaryTablesReady) return this.diaryTablesReady;
    this.diaryTablesReady = (async () => {
      try {
        await db.execute(sql`
          CREATE TABLE IF NOT EXISTS diary_care_logs (
            id SERIAL PRIMARY KEY,
            pet_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            date DATE NOT NULL,
            note TEXT,
            poop_status VARCHAR(20),
            meal_status VARCHAR(20),
            walk_status VARCHAR(20),
            mood VARCHAR(20),
            energy_level INTEGER,
            weight_kg NUMERIC(5,2),
            exercise_minutes INTEGER,
            meal_amount_g INTEGER,
            medications JSONB,
            media JSONB,
            tags JSONB,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
          )
        `);
        await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_diary_care_logs_pet_date ON diary_care_logs(pet_id, date)`);

        await db.execute(sql`
          CREATE TABLE IF NOT EXISTS pet_medications (
            id SERIAL PRIMARY KEY,
            pet_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            name VARCHAR(200) NOT NULL,
            dosage VARCHAR(100),
            frequency VARCHAR(100),
            due_date DATE NOT NULL,
            status VARCHAR(20) DEFAULT 'scheduled',
            notes TEXT,
            reminder_enabled BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
          )
        `);
        await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_pet_medications_pet ON pet_medications(pet_id)`);
        await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_pet_medications_user_due ON pet_medications(user_id, due_date)`);

        await db.execute(sql`ALTER TABLE pets ADD COLUMN IF NOT EXISTS diary_share_with_trainer BOOLEAN DEFAULT FALSE`);

        // 메모리 캐시 하이드레이션
        await this.hydrateDiaryCache();
        console.log('[DB] 다이어리 테이블 초기화 및 캐시 로드 완료');
      } catch (err) {
        logServerError('[DB] 다이어리 테이블 마이그레이션 실패:', err);
      }
    })();
    return this.diaryTablesReady;
  }

  private async hydrateDiaryCache(): Promise<void> {
    try {
      const logsRes: any = await db.execute(sql`SELECT * FROM diary_care_logs ORDER BY id`);
      const logRows = logsRes.rows || logsRes;
      if (Array.isArray(logRows) && logRows.length > 0) {
        this.careLogs = logRows.map((r: any) => this.mapCareLogRow(r));
      }
    } catch (e) { /* noop */ }
    try {
      const medsRes: any = await db.execute(sql`SELECT * FROM pet_medications ORDER BY id`);
      const medRows = medsRes.rows || medsRes;
      if (Array.isArray(medRows)) {
        this.petMedications = medRows.map((r: any) => this.mapMedicationRow(r));
      }
    } catch (e) { /* noop */ }
    try {
      const petsRes: any = await db.execute(sql`SELECT id, diary_share_with_trainer FROM pets`);
      const petRows = petsRes.rows || petsRes;
      if (Array.isArray(petRows)) {
        for (const r of petRows) {
          const idx = this.pets.findIndex(p => p.id === r.id);
          if (idx !== -1) {
            this.pets[idx].diaryShareWithTrainer = !!r.diary_share_with_trainer;
          }
        }
      }
    } catch (e) { /* noop */ }
  }

  private mapCareLogRow(r: any): any {
    return {
      id: r.id,
      petId: r.pet_id,
      userId: r.user_id,
      date: typeof r.date === 'string' ? r.date : (r.date instanceof Date ? r.date.toISOString().slice(0,10) : r.date),
      note: r.note,
      poopStatus: r.poop_status,
      mealStatus: r.meal_status,
      walkStatus: r.walk_status,
      mood: r.mood,
      energyLevel: r.energy_level,
      weightKg: r.weight_kg,
      exerciseMinutes: r.exercise_minutes,
      mealAmountG: r.meal_amount_g,
      medications: r.medications,
      media: r.media,
      tags: r.tags,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  }

  private mapMedicationRow(r: any): any {
    return {
      id: r.id,
      petId: r.pet_id,
      userId: r.user_id,
      name: r.name,
      dosage: r.dosage,
      frequency: r.frequency,
      dueDate: typeof r.due_date === 'string' ? r.due_date : (r.due_date instanceof Date ? r.due_date.toISOString().slice(0,10) : r.due_date),
      status: r.status,
      notes: r.notes,
      reminderEnabled: r.reminder_enabled,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  }

  // ---- Care Logs (DB 영속화) ----
  async getCareLogsByPetId(petId: number): Promise<any[]> {
    await this.initDiaryTables();
    try {
      const res: any = await db.execute(sql`SELECT * FROM diary_care_logs WHERE pet_id = ${petId} ORDER BY date DESC, id DESC`);
      const rows = res.rows || res;
      return (rows as any[]).map(r => this.mapCareLogRow(r));
    } catch (e) {
      logServerError('[DB] care logs 조회 실패, 메모리 폴백:', e);
      return super.getCareLogsByPetId(petId);
    }
  }

  async getCareLogsByDateRange(petId: number, startDate: string, endDate: string): Promise<any[]> {
    await this.initDiaryTables();
    try {
      const res: any = await db.execute(sql`
        SELECT * FROM diary_care_logs
        WHERE pet_id = ${petId} AND date >= ${startDate} AND date <= ${endDate}
        ORDER BY date DESC, id DESC
      `);
      const rows = res.rows || res;
      return (rows as any[]).map(r => this.mapCareLogRow(r));
    } catch (e) {
      logServerError('[DB] care logs 범위 조회 실패, 메모리 폴백:', e);
      return super.getCareLogsByDateRange(petId, startDate, endDate);
    }
  }

  async getCareLogsByIds(logIds: number[]): Promise<any[]> {
    await this.initDiaryTables();
    if (!logIds || logIds.length === 0) return [];
    try {
      const res: any = await db.execute(sql`SELECT * FROM diary_care_logs WHERE id = ANY(${logIds})`);
      const rows = res.rows || res;
      return (rows as any[]).map(r => this.mapCareLogRow(r));
    } catch (e) {
      logServerError('[DB] care logs id 조회 실패, 메모리 폴백:', e);
      return super.getCareLogsByIds(logIds);
    }
  }

  async createCareLog(data: any): Promise<any> {
    await this.initDiaryTables();
    try {
      const res: any = await db.execute(sql`
        INSERT INTO diary_care_logs
          (pet_id, user_id, date, note, poop_status, meal_status, walk_status, mood, energy_level,
           weight_kg, exercise_minutes, meal_amount_g, medications, media, tags)
        VALUES
          (${data.petId}, ${data.userId}, ${data.date}, ${data.note ?? null}, ${data.poopStatus ?? null},
           ${data.mealStatus ?? null}, ${data.walkStatus ?? null}, ${data.mood ?? null}, ${data.energyLevel ?? null},
           ${data.weightKg ?? null}, ${data.exerciseMinutes ?? null}, ${data.mealAmountG ?? null},
           ${data.medications ? JSON.stringify(data.medications) : null}::jsonb,
           ${data.media ? JSON.stringify(data.media) : null}::jsonb,
           ${data.tags ? JSON.stringify(data.tags) : null}::jsonb)
        RETURNING *
      `);
      const rows = res.rows || res;
      const row = (rows as any[])[0];
      const mapped = this.mapCareLogRow(row);
      // 메모리 캐시 갱신 (AI 분석 등 다른 경로 호환)
      this.careLogs.push(mapped);
      return mapped;
    } catch (e) {
      logServerError('[DB] care log 생성 실패, 메모리 폴백:', e);
      return super.createCareLog(data);
    }
  }

  async updateCareLog(id: number, updates: any): Promise<any> {
    await this.initDiaryTables();
    try {
      // 부분 업데이트: COALESCE 사용
      const res: any = await db.execute(sql`
        UPDATE diary_care_logs SET
          date = COALESCE(${updates.date ?? null}, date),
          note = COALESCE(${updates.note ?? null}, note),
          poop_status = COALESCE(${updates.poopStatus ?? null}, poop_status),
          meal_status = COALESCE(${updates.mealStatus ?? null}, meal_status),
          walk_status = COALESCE(${updates.walkStatus ?? null}, walk_status),
          mood = COALESCE(${updates.mood ?? null}, mood),
          energy_level = COALESCE(${updates.energyLevel ?? null}, energy_level),
          weight_kg = COALESCE(${updates.weightKg ?? null}, weight_kg),
          exercise_minutes = COALESCE(${updates.exerciseMinutes ?? null}, exercise_minutes),
          meal_amount_g = COALESCE(${updates.mealAmountG ?? null}, meal_amount_g),
          medications = COALESCE(${updates.medications ? JSON.stringify(updates.medications) : null}::jsonb, medications),
          media = COALESCE(${updates.media ? JSON.stringify(updates.media) : null}::jsonb, media),
          tags = COALESCE(${updates.tags ? JSON.stringify(updates.tags) : null}::jsonb, tags),
          updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `);
      const rows = res.rows || res;
      if (!rows || rows.length === 0) throw new Error('Care log not found');
      const mapped = this.mapCareLogRow(rows[0]);
      const idx = this.careLogs.findIndex((l: any) => l.id === id);
      if (idx !== -1) this.careLogs[idx] = mapped;
      return mapped;
    } catch (e) {
      logServerError('[DB] care log 수정 실패, 메모리 폴백:', e);
      return super.updateCareLog(id, updates);
    }
  }

  async deleteCareLog(id: number): Promise<boolean> {
    await this.initDiaryTables();
    try {
      const res: any = await db.execute(sql`DELETE FROM diary_care_logs WHERE id = ${id} RETURNING id`);
      const rows = res.rows || res;
      const ok = Array.isArray(rows) && rows.length > 0;
      const idx = this.careLogs.findIndex((l: any) => l.id === id);
      if (idx !== -1) this.careLogs.splice(idx, 1);
      return ok;
    } catch (e) {
      logServerError('[DB] care log 삭제 실패, 메모리 폴백:', e);
      return super.deleteCareLog(id);
    }
  }

  // ---- Pet Medications (DB 영속화) ----
  async getMedicationsByPetId(petId: number): Promise<any[]> {
    await this.initDiaryTables();
    try {
      const res: any = await db.execute(sql`SELECT * FROM pet_medications WHERE pet_id = ${petId} ORDER BY due_date ASC`);
      const rows = res.rows || res;
      return (rows as any[]).map(r => this.mapMedicationRow(r));
    } catch (e) {
      logServerError('[DB] medications 조회 실패, 메모리 폴백:', e);
      return super.getMedicationsByPetId(petId);
    }
  }

  async getMedicationById(id: number): Promise<any | null> {
    await this.initDiaryTables();
    try {
      const res: any = await db.execute(sql`SELECT * FROM pet_medications WHERE id = ${id} LIMIT 1`);
      const rows = res.rows || res;
      if (!rows || rows.length === 0) return null;
      return this.mapMedicationRow(rows[0]);
    } catch (e) {
      logServerError('[DB] medication 단건 조회 실패, 메모리 폴백:', e);
      return super.getMedicationById(id);
    }
  }

  async getUpcomingMedications(userId: number, days: number = 30): Promise<any[]> {
    await this.initDiaryTables();
    try {
      const today = new Date(); today.setHours(0,0,0,0);
      const future = new Date(); future.setDate(today.getDate() + days);
      const todayStr = today.toISOString().slice(0,10);
      const futureStr = future.toISOString().slice(0,10);
      const res: any = await db.execute(sql`
        SELECT * FROM pet_medications
        WHERE user_id = ${userId}
          AND status NOT IN ('completed','cancelled')
          AND due_date >= ${todayStr} AND due_date <= ${futureStr}
        ORDER BY due_date ASC
      `);
      const rows = res.rows || res;
      return (rows as any[]).map(r => this.mapMedicationRow(r));
    } catch (e) {
      logServerError('[DB] upcoming medications 조회 실패, 메모리 폴백:', e);
      return super.getUpcomingMedications(userId, days);
    }
  }

  async createMedication(data: any): Promise<any> {
    await this.initDiaryTables();
    try {
      const res: any = await db.execute(sql`
        INSERT INTO pet_medications
          (pet_id, user_id, name, dosage, frequency, due_date, status, notes, reminder_enabled)
        VALUES
          (${data.petId}, ${data.userId}, ${data.name}, ${data.dosage ?? null}, ${data.frequency ?? null},
           ${data.dueDate}, ${data.status ?? 'scheduled'}, ${data.notes ?? null},
           ${data.reminderEnabled !== false})
        RETURNING *
      `);
      const rows = res.rows || res;
      const mapped = this.mapMedicationRow(rows[0]);
      this.petMedications.push(mapped);
      return mapped;
    } catch (e) {
      logServerError('[DB] medication 생성 실패, 메모리 폴백:', e);
      return super.createMedication(data);
    }
  }

  async updateMedication(id: number, updates: any): Promise<any> {
    await this.initDiaryTables();
    try {
      const res: any = await db.execute(sql`
        UPDATE pet_medications SET
          name = COALESCE(${updates.name ?? null}, name),
          dosage = COALESCE(${updates.dosage ?? null}, dosage),
          frequency = COALESCE(${updates.frequency ?? null}, frequency),
          due_date = COALESCE(${updates.dueDate ?? null}, due_date),
          status = COALESCE(${updates.status ?? null}, status),
          notes = COALESCE(${updates.notes ?? null}, notes),
          reminder_enabled = COALESCE(${updates.reminderEnabled ?? null}, reminder_enabled),
          updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `);
      const rows = res.rows || res;
      if (!rows || rows.length === 0) throw new Error('Medication not found');
      const mapped = this.mapMedicationRow(rows[0]);
      const idx = this.petMedications.findIndex((m: any) => m.id === id);
      if (idx !== -1) this.petMedications[idx] = mapped;
      return mapped;
    } catch (e) {
      logServerError('[DB] medication 수정 실패, 메모리 폴백:', e);
      return super.updateMedication(id, updates);
    }
  }

  async deleteMedication(id: number): Promise<boolean> {
    await this.initDiaryTables();
    try {
      const res: any = await db.execute(sql`DELETE FROM pet_medications WHERE id = ${id} RETURNING id`);
      const rows = res.rows || res;
      const ok = Array.isArray(rows) && rows.length > 0;
      const idx = this.petMedications.findIndex((m: any) => m.id === id);
      if (idx !== -1) this.petMedications.splice(idx, 1);
      return ok;
    } catch (e) {
      logServerError('[DB] medication 삭제 실패, 메모리 폴백:', e);
      return super.deleteMedication(id);
    }
  }

  // ---- Pet diary share flag (DB 영속화) ----
  updatePet(id: number, updates: any): any {
    const result = super.updatePet(id, updates);
    if (updates && Object.prototype.hasOwnProperty.call(updates, 'diaryShareWithTrainer')) {
      // DB에도 영속화 (비동기, 실패 시 로깅만)
      const enabled = !!updates.diaryShareWithTrainer;
      this.initDiaryTables()
        .then(() => db.execute(sql`UPDATE pets SET diary_share_with_trainer = ${enabled} WHERE id = ${id}`))
        .catch((e: any) => logServerError('[DB] diary_share_with_trainer 저장 실패:', e));
    }
    return result;
  }

  // 훈련사 공유 권한 검증 시 DB 진실값 조회
  async getPetDiaryShareEnabled(petId: number): Promise<boolean> {
    try {
      await this.initDiaryTables();
      const res: any = await db.execute(sql`SELECT diary_share_with_trainer FROM pets WHERE id = ${petId} LIMIT 1`);
      const rows = res.rows || res;
      if (rows && rows.length > 0) return !!rows[0].diary_share_with_trainer;
    } catch (e) { /* noop */ }
    const memPet = super.getPet(petId);
    return !!(memPet && memPet.diaryShareWithTrainer);
  }

  // 훈련사 신청 관련
  async getTrainerApplication(id: number): Promise<any> {
    try {
      const [application] = await db.select().from(trainerApplications).where(eq(trainerApplications.id, id));
      return application || undefined;
    } catch (error) {
      logServerError('[DB] 훈련사 신청 조회 오류:', error);
      return undefined;
    }
  }

  async getAllTrainerApplications(): Promise<any[]> {
    try {
      return await db.select().from(trainerApplications);
    } catch (error) {
      logServerError('[DB] 모든 훈련사 신청 조회 오류:', error);
      return []; // 빈 배열 반환
    }
  }

  async createTrainerApplication(data: any): Promise<any> {
    try {
      const [application] = await db.insert(trainerApplications).values({
        name: data.name,
        email: data.email,
        phone: data.phone,
        hasAffiliation: data.hasAffiliation || false,
        affiliationName: data.affiliationName,
        experience: data.experience,
        education: data.education,
        certifications: data.certifications,
        motivation: data.motivation,
        portfolioUrl: data.portfolioUrl,
        resume: data.resume,
        status: data.status || 'pending'
      }).returning();
      return application;
    } catch (error) {
      logServerError('[DB] 훈련사 신청 생성 오류:', error);
      throw error;
    }
  }

  async updateTrainerApplicationStatus(id: number, status: string, reviewNotes?: string, reviewerId?: number): Promise<any> {
    try {
      const [updated] = await db.update(trainerApplications)
        .set({
          status,
          reviewNotes,
          reviewedBy: reviewerId,
          reviewedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(trainerApplications.id, id))
        .returning();
      return updated;
    } catch (error) {
      logServerError('[DB] 훈련사 신청 상태 업데이트 오류:', error);
      throw error;
    }
  }

  // 컨텐츠 승인 관련
  async createContentApproval(data: any): Promise<any> {
    try {
      const [approval] = await db.insert(contentApprovals).values({
        contentType: data.contentType,
        contentId: data.contentId,
        submitterId: data.submitterId,
        instituteId: data.instituteId,
        title: data.title,
        description: data.description,
        content: data.content,
        attachments: data.attachments
      }).returning();
      return approval;
    } catch (error) {
      logServerError('[DB] 컨텐츠 승인 생성 오류:', error);
      throw error;
    }
  }

  async getAllContentApprovals(): Promise<any[]> {
    try {
      return await db.select().from(contentApprovals);
    } catch (error) {
      logServerError('[DB] 컨텐츠 승인 조회 오류:', error);
      return [];
    }
  }

  // 커리큘럼 관련
  async createCurriculum(data: any): Promise<any> {
    try {
      const [curriculum] = await db.insert(curriculumsTable).values({
        title: data.title,
        description: data.description,
        creatorId: data.creatorId,
        instituteId: data.instituteId,
        targetLevel: data.targetLevel,
        duration: data.duration,
        sessions: data.sessions,
        prerequisites: data.prerequisites,
        learningObjectives: data.learningObjectives,
        materials: data.materials,
        assessmentMethods: data.assessmentMethods,
        isPublic: data.isPublic || false,
        status: data.status || 'draft'
      }).returning();
      return curriculum;
    } catch (error) {
      logServerError('[DB] 커리큘럼 생성 오류:', error);
      throw error;
    }
  }

  getAllCurriculums(): any[] {
    try {
      // 기본 Storage 클래스의 샘플 데이터 사용 (동기 호환)
      return super.getAllCurriculums();
    } catch (error) {
      logServerError('[DB] 커리큘럼 조회 오류:', error);
      return [];
    }
  }

  // 기관 관련 - 데이터베이스에서 조회
  async getInstitutes(): Promise<any[]> {
    try {
      const result = await db.select().from(institutesTable);
      console.log('[DB] 기관 조회:', result.length + '개');
      return result;
    } catch (error) {
      logServerError('[DB] 기관 조회 오류:', error);
      return [];
    }
  }

  // 기관 코드로 기관 조회 (훈련사 등록 시 기관 연결용)
  async getInstituteByCode(code: string): Promise<any | null> {
    try {
      const result = await db.select().from(institutesTable).where(eq(institutesTable.code, code));
      if (result.length > 0) {
        console.log('[DB] 기관 코드 검증 성공:', code, '->', result[0].name);
        return result[0];
      }
      console.log('[DB] 기관 코드 없음:', code);
      return null;
    } catch (error) {
      logServerError('[DB] 기관 코드 검증 오류:', error);
      return null;
    }
  }

  // 훈련사-기관 연결 생성
  async linkTrainerToInstitute(trainerId: number, instituteId: number): Promise<boolean> {
    try {
      await db.insert(trainerInstitutes).values({
        trainerId,
        instituteId,
        joinDate: new Date()
      });
      console.log('[DB] 훈련사-기관 연결 완료:', { trainerId, instituteId });
      return true;
    } catch (error) {
      logServerError('[DB] 훈련사-기관 연결 오류:', error);
      return false;
    }
  }

  // 훈련사의 기관 정보 조회
  async getTrainerInstitutes(trainerId: number): Promise<any[]> {
    try {
      const result = await db
        .select({
          id: trainerInstitutes.id,
          trainerId: trainerInstitutes.trainerId,
          instituteId: trainerInstitutes.instituteId,
          instituteName: institutesTable.name,
          instituteCode: institutesTable.code,
          joinDate: trainerInstitutes.joinDate
        })
        .from(trainerInstitutes)
        .innerJoin(institutesTable, eq(trainerInstitutes.instituteId, institutesTable.id))
        .where(eq(trainerInstitutes.trainerId, trainerId));
      return result;
    } catch (error) {
      logServerError('[DB] 훈련사 기관 조회 오류:', error);
      return [];
    }
  }

  // 훈련사 인증 관련 (PATCH API 호환성)
  async createTrainerCertification(data: any): Promise<any> {
    try {
      console.log('[DB] 훈련사 인증 생성:', data);
      // 임시로 성공 응답 (실제 테이블 구조에 맞게 나중에 수정 가능)
      return {
        id: Date.now(),
        applicationId: data.applicationId,
        trainerId: data.trainerId || data.applicationId,
        status: 'certified',
        issuedAt: new Date(),
        createdAt: new Date()
      };
    } catch (error) {
      logServerError('[DB] 훈련사 인증 생성 오류:', error);
      throw error;
    }
  }

  // PaymentService에서 필요한 수수료 관리 메서드들
  async getFeePolicies(targetType: string, targetId?: number) {
    try {
      const { feePolicies } = await import('../shared/schema');
      const { eq, and, isNull, or } = await import('drizzle-orm');

      const conditions = [
        eq(feePolicies.targetType, targetType),
        eq(feePolicies.isActive, true)
      ];

      if (targetId) {
        conditions.push(
          or(
            eq(feePolicies.targetId, targetId),
            isNull(feePolicies.targetId)
          )
        );
      } else {
        conditions.push(isNull(feePolicies.targetId));
      }

      const policies = await db.select().from(feePolicies).where(and(...conditions));
      return policies.sort((a, b) => {
        // 특정 대상 > 전체 적용 순서로 정렬
        if (a.targetId && !b.targetId) return -1;
        if (!a.targetId && b.targetId) return 1;
        return 0;
      });
    } catch (error) {
      logServerError('수수료 정책 조회 오류:', error);
      return [];
    }
  }

  async createTransaction(transactionData: any) {
    try {
      const { transactions } = await import('../shared/schema');

      const [result] = await db.insert(transactions).values(transactionData).returning({ id: transactions.id });
      console.log(`[DB] 거래 내역 생성: ID ${result.id}`);
      return result.id;
    } catch (error) {
      logServerError('거래 내역 생성 오류:', error);
      throw error;
    }
  }

  async getTransaction(transactionId: number) {
    try {
      const { transactions } = await import('../shared/schema');
      const { eq } = await import('drizzle-orm');

      const [transaction] = await db.select().from(transactions).where(eq(transactions.id, transactionId));
      return transaction;
    } catch (error) {
      logServerError('거래 내역 조회 오류:', error);
      return null;
    }
  }

  async getTransactionsByPeriod(targetId: number, periodStart: Date, periodEnd: Date) {
    try {
      const { transactions } = await import('../shared/schema');
      const { eq, and, gte, lte } = await import('drizzle-orm');

      const results = await db.select().from(transactions).where(
        and(
          eq(transactions.payeeId, targetId),
          eq(transactions.status, 'completed'),
          gte(transactions.createdAt, periodStart),
          lte(transactions.createdAt, periodEnd)
        )
      );

      return results;
    } catch (error) {
      logServerError('기간별 거래 내역 조회 오류:', error);
      return [];
    }
  }

  async createSettlement(settlementData: any) {
    try {
      const { settlements } = await import('../shared/schema');

      const [result] = await db.insert(settlements).values(settlementData).returning({ id: settlements.id });
      console.log(`[DB] 정산 내역 생성: ID ${result.id}`);
      return result.id;
    } catch (error) {
      logServerError('정산 내역 생성 오류:', error);
      throw error;
    }
  }

  async createSettlementItem(itemData: any) {
    try {
      const { settlementItems } = await import('../shared/schema');

      const [result] = await db.insert(settlementItems).values(itemData).returning({ id: settlementItems.id });
      return result.id;
    } catch (error) {
      logServerError('정산 항목 생성 오류:', error);
      throw error;
    }
  }

  async updateSettlement(settlementId: number, updates: any) {
    try {
      const { settlements } = await import('../shared/schema');
      const { eq } = await import('drizzle-orm');

      await db.update(settlements).set(updates).where(eq(settlements.id, settlementId));
      return true;
    } catch (error) {
      logServerError('정산 내역 수정 오류:', error);
      return false;
    }
  }

  async updateRevenueStats(statsData: any) {
    try {
      // 매출 통계 업데이트 로직 (향후 별도 테이블로 관리 가능)
      console.log('매출 통계 업데이트:', statsData);
      return true;
    } catch (error) {
      logServerError('매출 통계 업데이트 오류:', error);
      return false;
    }
  }

  async createRefund(refundData: any) {
    try {
      // 환불 내역 생성 로직 (향후 별도 테이블로 관리 가능)
      console.log('환불 내역 생성:', refundData);
      return true;
    } catch (error) {
      logServerError('환불 내역 생성 오류:', error);
      return false;
    }
  }

  // =============================================================================
  // 배너 관리 메서드들 - 새로운 스키마에 맞게 구현
  // =============================================================================

  getAllBanners() {
    // 기본 배너가 없으면 생성
    if (this.banners.length === 0) {
      this.banners = [
        {
          id: 1,
          title: "Talez 펫 교육 플랫폼",
          content: "전문 훈련사와 함께하는 AI 기반 맞춤형 반려동물 교육",
          imageUrl: "https://images.unsplash.com/photo-1601758228041-f3b2795255f1?ixlib=rb-4.0.3&auto=format&fit=crop&w=1600&h=280&q=80",
          linkUrl: "/courses",
          targetPosition: "home-hero",
          displayOrder: 1,
          targetUserGroup: "all",
          startDate: null,
          endDate: null,
          clickCount: 0,
          viewCount: 0,
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];
    }
    return this.banners;
  }

  getActiveBanners() {
    const now = new Date();
    return this.banners.filter(banner => {
      if (!banner.isActive) return false;

      // 시작일 체크
      if (banner.startDate && new Date(banner.startDate) > now) return false;

      // 종료일 체크
      if (banner.endDate && new Date(banner.endDate) < now) return false;

      return true;
    }).sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
  }

  createBanner(bannerData: any) {
    const newId = Math.max(0, ...this.banners.map(b => b.id || 0)) + 1;

    // 새로운 배너의 표시 순서 설정 (같은 위치에서 가장 높은 순서 + 1)
    const samePositionBanners = this.banners.filter(b =>
      b.targetPosition === (bannerData.targetPosition || 'home-hero')
    );
    const maxOrder = Math.max(0, ...samePositionBanners.map(b => b.displayOrder || 0));

    const newBanner = {
      id: newId,
      title: bannerData.title,
      content: bannerData.content || bannerData.description,
      imageUrl: bannerData.imageUrl,
      linkUrl: bannerData.linkUrl,
      targetPosition: bannerData.targetPosition || 'home-hero',
      displayOrder: bannerData.displayOrder !== undefined ? bannerData.displayOrder : maxOrder + 1,
      targetUserGroup: bannerData.targetUserGroup || 'all',
      startDate: bannerData.startDate || null,
      endDate: bannerData.endDate || null,
      clickCount: 0,
      viewCount: 0,
      isActive: bannerData.isActive !== undefined ? bannerData.isActive : true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.banners.push(newBanner);
    return newBanner;
  }

  updateBanner(id: number, bannerData: any) {
    const index = this.banners.findIndex(banner => banner.id === id);
    if (index === -1) {
      throw new Error('배너를 찾을 수 없습니다');
    }

    // 표시 순서가 변경되는 경우 다른 배너들의 순서도 조정
    const currentBanner = this.banners[index];
    if (bannerData.displayOrder !== undefined &&
      bannerData.displayOrder !== currentBanner.displayOrder) {
      this.reorderBannersInPosition(
        currentBanner.targetPosition,
        id,
        bannerData.displayOrder
      );
    }

    this.banners[index] = {
      ...this.banners[index],
      ...bannerData,
      updatedAt: new Date().toISOString()
    };

    return this.banners[index];
  }

  deleteBanner(id: number) {
    const index = this.banners.findIndex(banner => banner.id === id);
    if (index === -1) {
      throw new Error('배너를 찾을 수 없습니다');
    }

    const deletedBanner = this.banners[index];
    this.banners.splice(index, 1);

    // 삭제된 배너보다 뒤의 배너들 순서 조정
    this.banners
      .filter(b =>
        b.targetPosition === deletedBanner.targetPosition &&
        b.displayOrder > deletedBanner.displayOrder
      )
      .forEach(b => b.displayOrder--);

    return true;
  }

  getBannerById(id: number) {
    return this.banners.find(banner => banner.id === id);
  }

  getBannersByPosition(position: string) {
    return this.banners
      .filter(banner => banner.targetPosition === position && banner.isActive)
      .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
  }

  getBannersByUserGroup(userGroup: string) {
    return this.banners
      .filter(banner =>
        banner.isActive &&
        (banner.targetUserGroup === 'all' || banner.targetUserGroup === userGroup)
      )
      .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
  }

  // 새로운 배너 관리 메서드들
  toggleBannerStatus(id: number) {
    const banner = this.getBannerById(id);
    if (!banner) {
      throw new Error('배너를 찾을 수 없습니다');
    }

    banner.isActive = !banner.isActive;
    banner.updatedAt = new Date().toISOString();

    return banner;
  }

  reorderBanners(bannerId: number, newOrder: number, targetPosition?: string) {
    const banner = this.getBannerById(bannerId);
    if (!banner) {
      throw new Error('배너를 찾을 수 없습니다');
    }

    const position = targetPosition || banner.targetPosition;
    return this.reorderBannersInPosition(position, bannerId, newOrder);
  }

  private reorderBannersInPosition(position: string, bannerId: number, newOrder: number) {
    const positionBanners = this.banners.filter(b => b.targetPosition === position);
    const targetBanner = positionBanners.find(b => b.id === bannerId);

    if (!targetBanner) {
      throw new Error('배너를 찾을 수 없습니다');
    }

    const oldOrder = targetBanner.displayOrder;

    // 순서 재정렬
    positionBanners.forEach(banner => {
      if (banner.id === bannerId) {
        banner.displayOrder = newOrder;
      } else if (oldOrder < newOrder) {
        // 아래로 이동: 사이의 배너들을 위로 이동
        if (banner.displayOrder > oldOrder && banner.displayOrder <= newOrder) {
          banner.displayOrder--;
        }
      } else {
        // 위로 이동: 사이의 배너들을 아래로 이동
        if (banner.displayOrder >= newOrder && banner.displayOrder < oldOrder) {
          banner.displayOrder++;
        }
      }
      banner.updatedAt = new Date().toISOString();
    });

    return targetBanner;
  }

  incrementBannerViews(id: number) {
    const banner = this.getBannerById(id);
    if (banner) {
      banner.viewCount = (banner.viewCount || 0) + 1;
      banner.updatedAt = new Date().toISOString();
    }
    return banner;
  }

  incrementBannerClicks(id: number) {
    const banner = this.getBannerById(id);
    if (banner) {
      banner.clickCount = (banner.clickCount || 0) + 1;
      banner.updatedAt = new Date().toISOString();
    }
    return banner;
  }

  getBannerAnalytics() {
    return this.banners.map(banner => ({
      id: banner.id,
      title: banner.title,
      targetPosition: banner.targetPosition,
      targetUserGroup: banner.targetUserGroup,
      isActive: banner.isActive,
      clickCount: banner.clickCount || 0,
      viewCount: banner.viewCount || 0,
      clickThroughRate: banner.viewCount > 0 ?
        ((banner.clickCount || 0) / banner.viewCount * 100).toFixed(2) + '%' : '0%',
      createdAt: banner.createdAt,
      updatedAt: banner.updatedAt
    }));
  }

  getBannersWithPagination(page: number = 1, limit: number = 10, filters: any = {}) {
    let filteredBanners = [...this.banners];

    // 필터 적용
    if (filters.targetPosition) {
      filteredBanners = filteredBanners.filter(b => b.targetPosition === filters.targetPosition);
    }
    if (filters.targetUserGroup) {
      filteredBanners = filteredBanners.filter(b => b.targetUserGroup === filters.targetUserGroup);
    }
    if (filters.isActive !== undefined) {
      filteredBanners = filteredBanners.filter(b => b.isActive === filters.isActive);
    }

    // 정렬
    const sortBy = filters.sortBy || 'displayOrder';
    const sortOrder = filters.sortOrder || 'asc';

    filteredBanners.sort((a, b) => {
      const aValue = a[sortBy] || 0;
      const bValue = b[sortBy] || 0;

      if (sortOrder === 'desc') {
        return bValue > aValue ? 1 : -1;
      }
      return aValue > bValue ? 1 : -1;
    });

    // 페이지네이션
    const total = filteredBanners.length;
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;
    const paginatedBanners = filteredBanners.slice(offset, offset + limit);

    return {
      data: paginatedBanners,
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    };
  }

  // 이벤트 관련 메서드들 추가 (event routes에서 사용)
  async checkEventAttendance(userId: number, eventId: number): Promise<boolean> {
    // 실제 구현에서는 데이터베이스에서 참석 여부 확인
    // 임시로 false 반환 (아직 참석하지 않음)
    return false;
  }

  async attendEvent(userId: number, eventId: number): Promise<any> {
    // 실제 구현에서는 데이터베이스에 참석 기록 저장
    // 임시 참석 기록 반환
    return {
      id: Date.now(),
      userId,
      eventId,
      attendedAt: new Date().toISOString(),
      status: 'attending'
    };
  }

  async getEventsByRegion(region: string): Promise<any[]> {
    // 지역별 이벤트 필터링 (location.address 기반)
    return this.events.filter(event =>
      event.location && event.location.address &&
      event.location.address.includes(region)
    );
  }

  async getEventsByCategory(category: string): Promise<any[]> {
    // 카테고리별 이벤트 필터링
    return this.events.filter(event => event.category === category);
  }

  // =============================================================================
  // AI 분석 시스템: AI Analyses 관련 메서드
  // =============================================================================
  // (Care Logs / Pet Medications CRUD는 HybridStorage 상단의 DB 영속화 구현 사용)

  async createAiAnalysis(analysisData: Record<string, unknown>): Promise<any> {
    try {
      const allowed: (keyof typeof aiAnalysesTable.$inferInsert)[] = [
        'petId','userId','inputLogIds','selectedSignals','timeRange',
        'model','resultJson','tokensIn','tokensOut',
      ];
      const payload: typeof aiAnalysesTable.$inferInsert = {
        petId: 0,
        userId: 0,
        inputLogIds: [],
        selectedSignals: {},
        resultJson: {},
      };
      for (const k of allowed) {
        const v = analysisData?.[k as string];
        if (v !== undefined) (payload as Record<string, unknown>)[k as string] = v;
      }
      const [row] = await db.insert(aiAnalysesTable).values(payload).returning();
      return row;
    } catch (err) {
      logServerError('[AI Analysis] createAiAnalysis 실패:', err);
      throw err;
    }
  }

  async getAiAnalysesByPetId(petId: number): Promise<any[]> {
    try {
      const rows = await db.select().from(aiAnalysesTable)
        .where(eq(aiAnalysesTable.petId, petId))
        .orderBy(desc(aiAnalysesTable.createdAt));
      return rows;
    } catch (err) {
      logServerError('[AI Analysis] getAiAnalysesByPetId 실패:', err);
      throw err;
    }
  }

  async getAiAnalysisById(id: number): Promise<any | null> {
    try {
      const [row] = await db.select().from(aiAnalysesTable)
        .where(eq(aiAnalysesTable.id, id))
        .limit(1);
      return row || null;
    } catch (err) {
      logServerError('[AI Analysis] getAiAnalysisById 실패:', err);
      throw err;
    }
  }

  // =============================================================================
  // AI 분석 리포트 공유 토큰 (PDF 공유 링크) - DB 영속화
  // =============================================================================
  async createAiAnalysisShareToken(data: { token: string; analysisId: number; createdBy: number | null; expiresAt: Date; }) {
    try {
      const { aiAnalysisShareTokens } = await import('@shared/schema');
      const [row] = await db.insert(aiAnalysisShareTokens).values({
        token: data.token,
        analysisId: data.analysisId,
        createdBy: data.createdBy ?? undefined,
        expiresAt: data.expiresAt,
      }).returning();
      return row;
    } catch (err) {
      logServerError('[Share Token] DB 저장 실패:', err);
      throw err;
    }
  }

  async getAiAnalysisShareToken(token: string) {
    try {
      const { aiAnalysisShareTokens } = await import('@shared/schema');
      const rows = await db.select().from(aiAnalysisShareTokens).where(eq(aiAnalysisShareTokens.token, token)).limit(1);
      const record = rows[0];
      if (!record) return null;
      if (record.revokedAt) return null;
      if (record.expiresAt && new Date(record.expiresAt).getTime() < Date.now()) return null;
      return record;
    } catch (err) {
      logServerError('[Share Token] DB 조회 실패:', err);
      return null;
    }
  }

  async revokeAiAnalysisShareToken(token: string) {
    try {
      const { aiAnalysisShareTokens } = await import('@shared/schema');
      await db.update(aiAnalysisShareTokens).set({ revokedAt: new Date() }).where(eq(aiAnalysisShareTokens.token, token));
      return true;
    } catch (err) {
      logServerError('[Share Token] DB 철회 실패:', err);
      return false;
    }
  }

  async recordAiAnalysisShareTokenAccess(token: string, ip?: string | null) {
    try {
      const { aiAnalysisShareTokens } = await import('@shared/schema');
      const safeIp = (ip || '').toString().slice(0, 64) || null;
      await db.update(aiAnalysisShareTokens).set({
        accessCount: sql`${aiAnalysisShareTokens.accessCount} + 1`,
        lastAccessedAt: new Date(),
        lastAccessedIp: safeIp,
      }).where(eq(aiAnalysisShareTokens.token, token));
    } catch (err) {
      logServerError('[Share Token] 접근 로그 업데이트 실패:', err);
    }
  }

  async cleanupExpiredAiAnalysisShareTokens(olderThanDays = 7) {
    try {
      const { aiAnalysisShareTokens } = await import('@shared/schema');
      const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
      const result = await db.delete(aiAnalysisShareTokens)
        .where(sql`${aiAnalysisShareTokens.expiresAt} < ${cutoff} OR (${aiAnalysisShareTokens.revokedAt} IS NOT NULL AND ${aiAnalysisShareTokens.revokedAt} < ${cutoff})`);
      return result;
    } catch (err) {
      logServerError('[Share Token] 만료 토큰 정리 실패:', err);
      return null;
    }
  }

  // =============================================================================
  // 알림장 공유 토큰 (PDF 외부 공유 링크) - 인메모리 저장
  // =============================================================================
  createNotebookShareToken(data: { token: string; journalId: number; createdBy: number | null; expiresAt: Date; }) {
    const row = {
      id: this.notebookShareTokens.length + 1,
      token: data.token,
      journalId: data.journalId,
      createdBy: data.createdBy ?? null,
      expiresAt: data.expiresAt,
      revokedAt: null as Date | null,
      createdAt: new Date(),
    };
    this.notebookShareTokens.push(row);
    return row;
  }

  getNotebookShareToken(token: string) {
    const record = this.notebookShareTokens.find(t => t.token === token);
    if (!record) return null;
    if (record.revokedAt) return null;
    if (record.expiresAt && new Date(record.expiresAt).getTime() < Date.now()) return null;
    return record;
  }

  revokeNotebookShareToken(token: string) {
    const record = this.notebookShareTokens.find(t => t.token === token);
    if (record) record.revokedAt = new Date();
    return !!record;
  }

  // Care logs를 날짜별로 그룹화하여 반환
  async getCareLogsGroupedByDate(petId: number, startDate?: string, endDate?: string): Promise<{dates: string[], logsByDate: Record<string, any[]>, counts: Record<string, number>}> {
    const logs = (startDate && endDate)
      ? await this.getCareLogsByDateRange(petId, startDate, endDate)
      : await this.getCareLogsByPetId(petId);

    // 날짜별로 그룹화
    const logsByDate: Record<string, any[]> = {};
    const counts: Record<string, number> = {};

    logs.forEach(log => {
      const date = log.date;
      if (!logsByDate[date]) {
        logsByDate[date] = [];
        counts[date] = 0;
      }
      logsByDate[date].push(log);
      counts[date]++;
    });

    const dates = Object.keys(logsByDate).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    return { dates, logsByDate, counts };
  }

  // =============================================================================
  // 예방접종 스케줄 관리: Vaccinations 관련 메서드
  // =============================================================================

  async getVaccinationsByPetId(petId: number): Promise<any[]> {
    return this.vaccinations.filter(v => v.petId === petId)
      .sort((a, b) => new Date(a.vaccineDate).getTime() - new Date(b.vaccineDate).getTime());
  }

  async getVaccinationsByUserId(userId: number): Promise<any[]> {
    return this.vaccinations.filter(v => v.userId === userId)
      .sort((a, b) => new Date(a.vaccineDate).getTime() - new Date(b.vaccineDate).getTime());
  }

  async getVaccinationById(id: number): Promise<any | null> {
    return this.vaccinations.find(v => v.id === id) || null;
  }

  async createVaccination(vaccinationData: any): Promise<any> {
    const newVaccination = {
      id: this.vaccinations.length + 1,
      ...vaccinationData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.vaccinations.push(newVaccination);
    return newVaccination;
  }

  async updateVaccination(id: number, updateData: any): Promise<any> {
    const index = this.vaccinations.findIndex(v => v.id === id);
    if (index === -1) {
      throw new Error("Vaccination not found");
    }
    this.vaccinations[index] = {
      ...this.vaccinations[index],
      ...updateData,
      updatedAt: new Date().toISOString()
    };
    return this.vaccinations[index];
  }

  async deleteVaccination(id: number): Promise<boolean> {
    const index = this.vaccinations.findIndex(v => v.id === id);
    if (index === -1) {
      return false;
    }
    this.vaccinations.splice(index, 1);
    return true;
  }

  async getUpcomingVaccinations(userId: number, days: number = 30): Promise<any[]> {
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + days);

    return this.vaccinations.filter(v => {
      if (v.userId !== userId) return false;
      if (v.status === 'completed' || v.status === 'cancelled') return false;
      
      const vaccineDate = new Date(v.vaccineDate);
      return vaccineDate >= today && vaccineDate <= futureDate;
    }).sort((a, b) => new Date(a.vaccineDate).getTime() - new Date(b.vaccineDate).getTime());
  }

  // ==================== 메시징 시스템 ====================

  async getOrCreateConversation(participant1Id: number, participant2Id: number): Promise<any> {
    try {
      const [id1, id2] = participant1Id < participant2Id 
        ? [participant1Id, participant2Id] 
        : [participant2Id, participant1Id];
      
      const existing = await db.select().from(conversations).where(
        and(
          eq(conversations.participant1Id, id1),
          eq(conversations.participant2Id, id2)
        )
      ).limit(1);

      if (existing.length > 0) {
        return existing[0];
      }

      const newConversation = await db.insert(conversations).values({
        participant1Id: id1,
        participant2Id: id2,
        lastMessageAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();

      return newConversation[0];
    } catch (error) {
      logServerError('[Storage] getOrCreateConversation 오류:', error);
      throw error;
    }
  }

  async getConversationsForUser(userId: number): Promise<any[]> {
    try {
      const userConversations = await db.select().from(conversations).where(
        or(
          eq(conversations.participant1Id, userId),
          eq(conversations.participant2Id, userId)
        )
      ).orderBy(desc(conversations.lastMessageAt));

      const conversationsWithDetails = await Promise.all(
        userConversations.map(async (conv) => {
          const otherUserId = conv.participant1Id === userId 
            ? conv.participant2Id 
            : conv.participant1Id;

          const otherUser = await db.select({
            id: usersTable.id,
            name: usersTable.name,
            role: usersTable.role,
            avatar: usersTable.avatar
          }).from(usersTable).where(eq(usersTable.id, otherUserId)).limit(1);

          const lastMessage = await db.select().from(messages)
            .where(eq(messages.conversationId, conv.id))
            .orderBy(desc(messages.createdAt))
            .limit(1);

          const unreadCount = await db.select({
            count: sql<number>`count(*)`
          }).from(messages).where(
            and(
              eq(messages.conversationId, conv.id),
              eq(messages.receiverId, userId),
              eq(messages.isRead, false)
            )
          );

          return {
            id: conv.id,
            participant: otherUser[0] || { id: otherUserId, name: '알 수 없음', role: 'user' },
            lastMessage: lastMessage[0] || null,
            unreadCount: Number(unreadCount[0]?.count) || 0,
            lastMessageAt: conv.lastMessageAt,
            createdAt: conv.createdAt
          };
        })
      );

      return conversationsWithDetails;
    } catch (error) {
      logServerError('[Storage] getConversationsForUser 오류:', error);
      return [];
    }
  }

  async getMessagesForConversation(conversationId: number, page: number = 1, limit: number = 50): Promise<any> {
    try {
      const offset = (page - 1) * limit;
      
      const messageList = await db.select().from(messages)
        .where(eq(messages.conversationId, conversationId))
        .orderBy(desc(messages.createdAt))
        .limit(limit)
        .offset(offset);

      const totalResult = await db.select({
        count: sql<number>`count(*)`
      }).from(messages).where(eq(messages.conversationId, conversationId));

      const total = Number(totalResult[0]?.count) || 0;

      const messagesWithSender = await Promise.all(
        messageList.map(async (msg) => {
          const sender = await db.select({
            id: usersTable.id,
            name: usersTable.name,
            role: usersTable.role,
            avatar: usersTable.avatar
          }).from(usersTable).where(eq(usersTable.id, msg.senderId)).limit(1);

          return {
            ...msg,
            sender: sender[0] || { id: msg.senderId, name: '알 수 없음', role: 'user' }
          };
        })
      );

      return {
        messages: messagesWithSender.reverse(),
        pagination: {
          page,
          limit,
          total,
          hasMore: offset + limit < total
        }
      };
    } catch (error) {
      logServerError('[Storage] getMessagesForConversation 오류:', error);
      return { messages: [], pagination: { page, limit, total: 0, hasMore: false } };
    }
  }

  async createMessage(senderId: number, receiverId: number, content: string, messageType: string = 'text'): Promise<any> {
    try {
      const conversation = await this.getOrCreateConversation(senderId, receiverId);

      const newMessage = await db.insert(messages).values({
        senderId,
        receiverId,
        content,
        messageType,
        conversationId: conversation.id,
        isRead: false,
        createdAt: new Date()
      }).returning();

      await db.update(conversations)
        .set({ lastMessageAt: new Date(), updatedAt: new Date() })
        .where(eq(conversations.id, conversation.id));

      const sender = await db.select({
        id: usersTable.id,
        name: usersTable.name,
        role: usersTable.role,
        avatar: usersTable.avatar
      }).from(usersTable).where(eq(usersTable.id, senderId)).limit(1);

      return {
        ...newMessage[0],
        sender: sender[0] || { id: senderId, name: '알 수 없음', role: 'user' },
        conversationId: conversation.id
      };
    } catch (error) {
      logServerError('[Storage] createMessage 오류:', error);
      throw error;
    }
  }

  async markMessageAsRead(messageId: number, userId: number): Promise<boolean> {
    try {
      await db.update(messages)
        .set({ isRead: true })
        .where(
          and(
            eq(messages.id, messageId),
            eq(messages.receiverId, userId)
          )
        );
      return true;
    } catch (error) {
      logServerError('[Storage] markMessageAsRead 오류:', error);
      return false;
    }
  }

  async markAllMessagesAsRead(conversationId: number, userId: number): Promise<boolean> {
    try {
      await db.update(messages)
        .set({ isRead: true })
        .where(
          and(
            eq(messages.conversationId, conversationId),
            eq(messages.receiverId, userId)
          )
        );
      return true;
    } catch (error) {
      logServerError('[Storage] markAllMessagesAsRead 오류:', error);
      return false;
    }
  }

  async getUnreadMessageCount(userId: number): Promise<number> {
    try {
      const result = await db.select({
        count: sql<number>`count(*)`
      }).from(messages).where(
        and(
          eq(messages.receiverId, userId),
          eq(messages.isRead, false)
        )
      );
      return Number(result[0]?.count) || 0;
    } catch (error) {
      logServerError('[Storage] getUnreadMessageCount 오류:', error);
      return 0;
    }
  }

  // ===== Content Reports (Task #50) =====
  async createContentReport(
    input: InsertContentReport & { reporterId?: number | null }
  ): Promise<ContentReport> {
    const now = new Date();
    const base = {
      reporterId: input.reporterId ?? null,
      targetType: input.targetType,
      targetId: input.targetId,
      targetName: input.targetName ?? null,
      reportType: input.reportType ?? 'other',
      reason: input.reason,
      description: input.description ?? null,
      priority: input.priority ?? 'medium',
      metadata: input.metadata ?? null,
    } satisfies Partial<ContentReport>;
    try {
      const [row] = await db.insert(contentReportsTable).values(base).returning();
      return row;
    } catch {
      const id = (this.contentReports.reduce(
        (m: number, r: ContentReport) => Math.max(m, r.id || 0), 0
      ) || 0) + 1;
      const report: ContentReport = {
        id,
        ...base,
        status: 'pending',
        assignedTo: null,
        resolvedBy: null,
        resolvedAt: null,
        resolutionComment: null,
        createdAt: now,
        updatedAt: now,
      };
      this.contentReports.push(report);
      return report;
    }
  }

  async listContentReports(
    opts: { status?: string; targetType?: string; limit?: number } = {}
  ): Promise<ContentReport[]> {
    const { status, targetType, limit } = opts;
    try {
      const conds = [
        status && status !== 'all' ? eq(contentReportsTable.status, status) : undefined,
        targetType && targetType !== 'all' ? eq(contentReportsTable.targetType, targetType) : undefined,
      ].filter((c): c is NonNullable<typeof c> => c !== undefined);
      const where = conds.length ? and(...conds) : undefined;
      const base = db.select().from(contentReportsTable);
      const filtered = where ? base.where(where) : base;
      const ordered = filtered.orderBy(desc(contentReportsTable.createdAt));
      const rows = await (limit ? ordered.limit(limit) : ordered);
      return rows;
    } catch {
      let list: ContentReport[] = this.contentReports.slice();
      if (status && status !== 'all') {
        list = list.filter((r) => (r.status || 'pending') === status);
      }
      if (targetType && targetType !== 'all') {
        list = list.filter((r) => r.targetType === targetType);
      }
      list.sort((a, b) =>
        new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      );
      return limit ? list.slice(0, limit) : list;
    }
  }

  async getContentReport(id: number): Promise<ContentReport | null> {
    try {
      const [row] = await db.select().from(contentReportsTable).where(eq(contentReportsTable.id, id));
      return row ?? null;
    } catch {
      return this.contentReports.find((r: ContentReport) => r.id === id) ?? null;
    }
  }

  async updateContentReportStatus(
    id: number,
    update: {
      status: 'pending' | 'investigating' | 'resolved' | 'dismissed';
      resolverId?: number | null;
      resolutionComment?: string | null;
    }
  ): Promise<ContentReport | null> {
    const isFinal = update.status === 'resolved' || update.status === 'dismissed';
    const patch = {
      status: update.status,
      updatedAt: new Date(),
      resolvedBy: isFinal ? (update.resolverId ?? null) : null,
      resolvedAt: isFinal ? new Date() : null,
      resolutionComment: update.resolutionComment ?? null,
    } satisfies Partial<ContentReport>;
    try {
      const [row] = await db
        .update(contentReportsTable)
        .set(patch)
        .where(eq(contentReportsTable.id, id))
        .returning();
      return row ?? null;
    } catch {
      const idx = this.contentReports.findIndex((r: ContentReport) => r.id === id);
      if (idx === -1) return null;
      this.contentReports[idx] = { ...this.contentReports[idx], ...patch };
      return this.contentReports[idx];
    }
  }

  async getContentReportStats(): Promise<{ pending: number; investigating: number; resolved: number; dismissed: number; urgent: number; total: number }> {
    try {
      const rows = await db.select({
        pending: sql<number>`count(*) filter (where ${contentReportsTable.status} = 'pending')`,
        investigating: sql<number>`count(*) filter (where ${contentReportsTable.status} = 'investigating')`,
        resolved: sql<number>`count(*) filter (where ${contentReportsTable.status} = 'resolved')`,
        dismissed: sql<number>`count(*) filter (where ${contentReportsTable.status} = 'dismissed')`,
        urgent: sql<number>`count(*) filter (where ${contentReportsTable.priority} = 'urgent' and ${contentReportsTable.status} in ('pending','investigating'))`,
        total: sql<number>`count(*)`,
      }).from(contentReportsTable);
      const r = rows[0] || ({} as any);
      return {
        pending: Number(r.pending) || 0,
        investigating: Number(r.investigating) || 0,
        resolved: Number(r.resolved) || 0,
        dismissed: Number(r.dismissed) || 0,
        urgent: Number(r.urgent) || 0,
        total: Number(r.total) || 0,
      };
    } catch {
      const list = this.contentReports;
      return {
        pending: list.filter((r: any) => (r.status || 'pending') === 'pending').length,
        investigating: list.filter((r: any) => r.status === 'investigating').length,
        resolved: list.filter((r: any) => r.status === 'resolved').length,
        dismissed: list.filter((r: any) => r.status === 'dismissed').length,
        urgent: list.filter((r: any) => r.priority === 'urgent' && (r.status === 'pending' || r.status === 'investigating')).length,
        total: list.length,
      };
    }
  }

  async getAdminDashboardAggregates(opts: { startDate?: Date; endDate?: Date } = {}): Promise<{
    totalCourses: number;
    totalOrders: number;
    totalRevenue: number;
    unreadReports: number;
    totalMessages: number;
    activeCourses: number;
    completedOrders: number;
    averageOrderValue: number;
  }> {
    const { startDate, endDate } = opts;

    // courses count (DB → memory fallback)
    let totalCourses = 0;
    let activeCourses = 0;
    try {
      const conditions: any[] = [];
      if (startDate) conditions.push(gte(coursesTable.createdAt, startDate));
      if (endDate) conditions.push(lte(coursesTable.createdAt, endDate));
      const rows = await db.select({
        total: sql<number>`count(*)`,
        active: sql<number>`count(*) filter (where ${coursesTable.isActive} = true)`
      }).from(coursesTable).where(conditions.length ? and(...conditions) : sql`true`);
      totalCourses = Number(rows[0]?.total) || 0;
      activeCourses = Number(rows[0]?.active) || 0;
    } catch {
      const list = (this.courses || []).filter((c: any) => {
        if (!startDate && !endDate) return true;
        const d = c.createdAt ? new Date(c.createdAt) : null;
        if (!d) return false;
        if (startDate && d < startDate) return false;
        if (endDate && d > endDate) return false;
        return true;
      });
      totalCourses = list.length;
      activeCourses = list.filter((c: any) => c.isActive !== false).length;
    }

    // orders aggregates (orders + course purchases)
    let totalOrders = 0;
    let totalRevenue = 0;
    let completedOrders = 0;
    try {
      const conditions: any[] = [];
      if (startDate) conditions.push(gte(ordersTable.createdAt, startDate));
      if (endDate) conditions.push(lte(ordersTable.createdAt, endDate));
      const rows = await db.select({
        total: sql<number>`count(*)`,
        completed: sql<number>`count(*) filter (where ${ordersTable.paymentStatus} = 'completed' or ${ordersTable.status} = 'completed')`,
        revenue: sql<number>`coalesce(sum(case when ${ordersTable.paymentStatus} = 'completed' or ${ordersTable.status} = 'completed' then ${ordersTable.totalAmount} else 0 end), 0)`
      }).from(ordersTable).where(conditions.length ? and(...conditions) : sql`true`);
      totalOrders = Number(rows[0]?.total) || 0;
      completedOrders = Number(rows[0]?.completed) || 0;
      totalRevenue = Number(rows[0]?.revenue) || 0;
    } catch {
      // ignore
    }

    try {
      const conditions: any[] = [];
      if (startDate) conditions.push(gte(coursePurchasesTable.createdAt, startDate));
      if (endDate) conditions.push(lte(coursePurchasesTable.createdAt, endDate));
      const rows = await db.select({
        total: sql<number>`count(*)`,
        revenue: sql<number>`coalesce(sum(case when ${coursePurchasesTable.paymentStatus} = 'completed' then ${coursePurchasesTable.purchaseAmount} else 0 end), 0)`
      }).from(coursePurchasesTable).where(conditions.length ? and(...conditions) : sql`true`);
      totalOrders += Number(rows[0]?.total) || 0;
      totalRevenue += Number(rows[0]?.revenue) || 0;
    } catch {
      // memory fallback for course purchases
      const list = (this.coursePurchases || []).filter((p: any) => {
        if (!startDate && !endDate) return true;
        const d = p.createdAt ? new Date(p.createdAt) : null;
        if (!d) return false;
        if (startDate && d < startDate) return false;
        if (endDate && d > endDate) return false;
        return true;
      });
      totalOrders += list.length;
      totalRevenue += list
        .filter((p: any) => (p.paymentStatus || 'completed') === 'completed')
        .reduce((s: number, p: any) => s + (parseFloat(p.purchaseAmount) || 0), 0);
    }

    // unread reports = open moderation tickets in dedicated content_reports table (Task #50)
    // pending or investigating reports count as "unread" for the admin dashboard.
    let unreadReports = 0;
    try {
      const baseConds: any[] = [
        sql`${contentReportsTable.status} in ('pending','investigating')`,
      ];
      if (startDate) baseConds.push(gte(contentReportsTable.createdAt, startDate));
      if (endDate) baseConds.push(lte(contentReportsTable.createdAt, endDate));

      const rows = await db.select({
        count: sql<number>`count(*)`
      }).from(contentReportsTable).where(and(...baseConds));
      unreadReports = Number(rows[0]?.count) || 0;
    } catch {
      unreadReports = (this.contentReports || []).filter((r: any) => {
        const status = r.status || 'pending';
        if (status !== 'pending' && status !== 'investigating') return false;
        if (!startDate && !endDate) return true;
        const d = r.createdAt ? new Date(r.createdAt) : null;
        if (!d) return false;
        if (startDate && d < startDate) return false;
        if (endDate && d > endDate) return false;
        return true;
      }).length;
    }

    // total messages
    let totalMessages = 0;
    try {
      const conditions: any[] = [];
      if (startDate) conditions.push(gte(messages.createdAt, startDate));
      if (endDate) conditions.push(lte(messages.createdAt, endDate));
      const rows = await db.select({
        count: sql<number>`count(*)`
      }).from(messages).where(conditions.length ? and(...conditions) : sql`true`);
      totalMessages = Number(rows[0]?.count) || 0;
    } catch {
      totalMessages = 0;
    }

    const averageOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

    return {
      totalCourses,
      totalOrders,
      totalRevenue: Math.round(totalRevenue),
      unreadReports,
      totalMessages,
      activeCourses,
      completedOrders,
      averageOrderValue,
    };
  }

  async getAdminDashboardBreakdowns(opts: { startDate?: Date; endDate?: Date } = {}): Promise<{
    users: {
      monthlyGrowth: { label: string; newUsers: number; activeUsers: number }[];
      ageGroups: { label: string; count: number; percentage: number }[];
      hourlyDistribution: { label: string; count: number; percentage: number }[];
      engagement: { label: string; value: number }[];
    };
    revenue: {
      monthlyTrend: { month: string; total: number; training: number; shop: number }[];
      growthRate: number;
      averageOrderValue: number;
      customerLifetimeValue: number;
    };
    training: {
      categoryDistribution: { name: string; count: number; percentage: number }[];
      categoryCompletion: { name: string; completion: number }[];
      topTrainers: { name: string; sessions: number; rating: number }[];
    };
    geography: {
      regions: { region: string; users: number; revenue: number; percentage: number }[];
    };
  }> {
    const { startDate, endDate } = opts;
    const periodConds = (col: any) => {
      const c: any[] = [];
      if (startDate) c.push(gte(col, startDate));
      if (endDate) c.push(lte(col, endDate));
      return c;
    };

    // ----- Users -----
    let allUsers: any[] = [];
    try {
      allUsers = await db.select().from(usersTable);
    } catch {
      allUsers = this.users || [];
    }

    // Age groups
    const ageBuckets = [
      { label: '20세 미만', min: 0, max: 19 },
      { label: '20-30세', min: 20, max: 30 },
      { label: '31-40세', min: 31, max: 40 },
      { label: '41-50세', min: 41, max: 50 },
      { label: '51-60세', min: 51, max: 60 },
      { label: '60세 초과', min: 61, max: 200 },
    ];
    const ageOf = (u: any): number | null => {
      if (typeof u.age === 'number' && u.age > 0) return u.age;
      if (u.birthDate) {
        const y = parseInt(String(u.birthDate).slice(0, 4), 10);
        if (!isNaN(y) && y > 1900) return new Date().getFullYear() - y;
      }
      return null;
    };
    const usersWithAge = allUsers.map(ageOf).filter((a): a is number => a !== null);
    const ageGroups = ageBuckets.map(b => {
      const count = usersWithAge.filter(a => a >= b.min && a <= b.max).length;
      const percentage = usersWithAge.length > 0 ? Math.round((count / usersWithAge.length) * 100) : 0;
      return { label: b.label, count, percentage };
    });

    // Monthly user growth (last 7 months, anchored to endDate when provided)
    const monthlyGrowth: { label: string; newUsers: number; activeUsers: number }[] = [];
    const now = endDate ? new Date(endDate) : new Date();
    for (let i = 6; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const newUsers = allUsers.filter((u: any) => {
        const d = u.createdAt ? new Date(u.createdAt) : null;
        return d && d >= start && d < end;
      }).length;
      const activeUsers = allUsers.filter((u: any) => {
        const d = u.lastLoginAt ? new Date(u.lastLoginAt) : null;
        return d && d >= start && d < end;
      }).length;
      monthlyGrowth.push({ label: `${start.getMonth() + 1}월`, newUsers, activeUsers });
    }

    // Hourly activity distribution from messages.createdAt (fallback to lastLoginAt)
    const hourBuckets = [
      { label: '아침 (06-12시)', from: 6, to: 12 },
      { label: '오후 (12-18시)', from: 12, to: 18 },
      { label: '저녁 (18-24시)', from: 18, to: 24 },
      { label: '새벽 (00-06시)', from: 0, to: 6 },
    ];
    let hourlyDistribution = hourBuckets.map(b => ({ label: b.label, count: 0, percentage: 0 }));
    try {
      const conds = periodConds(messages.createdAt);
      const rows = await db.select({
        hour: sql<number>`extract(hour from ${messages.createdAt})::int`,
        count: sql<number>`count(*)`,
      }).from(messages).where(conds.length ? and(...conds) : sql`true`).groupBy(sql`extract(hour from ${messages.createdAt})`);
      const hourCounts = new Array(24).fill(0);
      for (const r of rows as any[]) {
        const h = Number(r.hour);
        if (h >= 0 && h < 24) hourCounts[h] += Number(r.count) || 0;
      }
      const total = hourCounts.reduce((s, n) => s + n, 0);
      if (total === 0) {
        // fallback: lastLoginAt hours
        for (const u of allUsers) {
          if (u.lastLoginAt) {
            const h = new Date(u.lastLoginAt).getHours();
            if (h >= 0 && h < 24) hourCounts[h]++;
          }
        }
      }
      const total2 = hourCounts.reduce((s, n) => s + n, 0);
      hourlyDistribution = hourBuckets.map(b => {
        let count = 0;
        for (let h = b.from; h < b.to; h++) count += hourCounts[h];
        return { label: b.label, count, percentage: total2 > 0 ? Math.round((count / total2) * 100) : 0 };
      });
    } catch {
      // keep zeroed buckets
    }

    // Engagement metrics
    const totalUsersCount = allUsers.length;
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const weeklyActive = allUsers.filter((u: any) => u.lastLoginAt && new Date(u.lastLoginAt) >= weekAgo).length;
    const monthlyActive = allUsers.filter((u: any) => u.lastLoginAt && new Date(u.lastLoginAt) >= monthAgo).length;
    const trainingUserIds = new Set<number>();
    const buyerUserIds = new Set<number>();
    const purchaseUserIds = new Set<number>();
    try {
      const r = await db.selectDistinct({ userId: reservationsTable.userId }).from(reservationsTable);
      for (const row of r as any[]) if (row.userId != null) trainingUserIds.add(Number(row.userId));
    } catch {}
    try {
      const r = await db.selectDistinct({ userId: courseProgressTable.userId }).from(courseProgressTable);
      for (const row of r as any[]) if (row.userId != null) trainingUserIds.add(Number(row.userId));
    } catch {}
    try {
      const r = await db.selectDistinct({ userId: ordersTable.userId }).from(ordersTable);
      for (const row of r as any[]) if (row.userId != null) buyerUserIds.add(Number(row.userId));
    } catch {}
    try {
      const r = await db.selectDistinct({ userId: coursePurchasesTable.userId }).from(coursePurchasesTable);
      for (const row of r as any[]) {
        if (row.userId != null) {
          buyerUserIds.add(Number(row.userId));
          purchaseUserIds.add(Number(row.userId));
        }
      }
    } catch {}
    const pct = (n: number, d: number) => d > 0 ? Math.min(100, Math.round((n / d) * 100)) : 0;
    const engagement = [
      { label: '주간 활성 사용자', value: pct(weeklyActive, totalUsersCount) },
      { label: '월간 활성 사용자', value: pct(monthlyActive, totalUsersCount) },
      { label: '훈련 참여율', value: pct(trainingUserIds.size, totalUsersCount) },
      { label: '구매 전환율', value: pct(buyerUserIds.size, totalUsersCount) },
      { label: '강좌 수강율', value: pct(purchaseUserIds.size, totalUsersCount) },
      { label: '인증 사용자', value: pct(allUsers.filter((u: any) => u.isVerified || u.emailVerified || u.verified).length, totalUsersCount) },
    ];

    // ----- Revenue: monthly trend last 7 months -----
    const monthlyTrend: { month: string; total: number; training: number; shop: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      let shop = 0;
      let training = 0;
      try {
        const rows = await db.select({
          revenue: sql<number>`coalesce(sum(case when ${ordersTable.paymentStatus} = 'completed' or ${ordersTable.status} = 'completed' then ${ordersTable.totalAmount} else 0 end), 0)`,
        }).from(ordersTable).where(and(gte(ordersTable.createdAt, start), lte(ordersTable.createdAt, end)));
        shop = Number(rows[0]?.revenue) || 0;
      } catch {}
      try {
        const rows = await db.select({
          revenue: sql<number>`coalesce(sum(case when ${coursePurchasesTable.paymentStatus} = 'completed' then ${coursePurchasesTable.purchaseAmount} else 0 end), 0)`,
        }).from(coursePurchasesTable).where(and(gte(coursePurchasesTable.createdAt, start), lte(coursePurchasesTable.createdAt, end)));
        training = Number(rows[0]?.revenue) || 0;
      } catch {}
      monthlyTrend.push({
        month: `${start.getMonth() + 1}월`,
        total: Math.round(shop + training),
        training: Math.round(training),
        shop: Math.round(shop),
      });
    }
    const lastIdx = monthlyTrend.length - 1;
    const cur = monthlyTrend[lastIdx]?.total || 0;
    const prev = monthlyTrend[lastIdx - 1]?.total || 0;
    const growthRate = prev > 0 ? Math.round(((cur - prev) / prev) * 1000) / 10 : 0;

    // average order value & CLV (period-aware)
    let totalOrdersCount = 0;
    let totalRevenue = 0;
    let uniqueBuyers = 0;
    try {
      const conds = periodConds(ordersTable.createdAt);
      const rows = await db.select({
        c: sql<number>`count(*)`,
        rev: sql<number>`coalesce(sum(case when ${ordersTable.paymentStatus} = 'completed' or ${ordersTable.status} = 'completed' then ${ordersTable.totalAmount} else 0 end), 0)`,
        buyers: sql<number>`count(distinct ${ordersTable.userId})`,
      }).from(ordersTable).where(conds.length ? and(...conds) : sql`true`);
      totalOrdersCount += Number(rows[0]?.c) || 0;
      totalRevenue += Number(rows[0]?.rev) || 0;
      uniqueBuyers += Number(rows[0]?.buyers) || 0;
    } catch {}
    try {
      const conds = periodConds(coursePurchasesTable.createdAt);
      const rows = await db.select({
        c: sql<number>`count(*)`,
        rev: sql<number>`coalesce(sum(case when ${coursePurchasesTable.paymentStatus} = 'completed' then ${coursePurchasesTable.purchaseAmount} else 0 end), 0)`,
        buyers: sql<number>`count(distinct ${coursePurchasesTable.userId})`,
      }).from(coursePurchasesTable).where(conds.length ? and(...conds) : sql`true`);
      totalOrdersCount += Number(rows[0]?.c) || 0;
      totalRevenue += Number(rows[0]?.rev) || 0;
      uniqueBuyers += Number(rows[0]?.buyers) || 0;
    } catch {}
    const averageOrderValue = totalOrdersCount > 0 ? Math.round(totalRevenue / totalOrdersCount) : 0;
    const customerLifetimeValue = uniqueBuyers > 0 ? Math.round(totalRevenue / uniqueBuyers) : 0;

    // ----- Training -----
    let categoryDistribution: { name: string; count: number; percentage: number }[] = [];
    try {
      const rows = await db.select({
        category: coursesTable.category,
        count: sql<number>`count(*)`,
      }).from(coursesTable).groupBy(coursesTable.category);
      const total = rows.reduce((s: number, r: any) => s + Number(r.count), 0);
      categoryDistribution = rows
        .map((r: any) => ({
          name: r.category || '기타',
          count: Number(r.count) || 0,
          percentage: total > 0 ? Math.round((Number(r.count) / total) * 100) : 0,
        }))
        .sort((a, b) => b.count - a.count);
    } catch {}

    let categoryCompletion: { name: string; completion: number }[] = [];
    try {
      const rows = await db.select({
        category: coursesTable.category,
        avgProgress: sql<number>`coalesce(avg(${courseProgressTable.progressPercentage}::numeric), 0)`,
      })
        .from(courseProgressTable)
        .leftJoin(coursesTable, eq(courseProgressTable.courseId, coursesTable.id))
        .groupBy(coursesTable.category);
      categoryCompletion = rows
        .map((r: any) => ({
          name: r.category || '기타',
          completion: Math.round(Number(r.avgProgress) || 0),
        }))
        .sort((a, b) => b.completion - a.completion);
    } catch {}

    // Top trainers by completed reservations
    let topTrainers: { name: string; sessions: number; rating: number }[] = [];
    try {
      const rows = await db.select({
        trainerId: reservationsTable.trainerId,
        sessions: sql<number>`count(*) filter (where ${reservationsTable.status} = 'completed')`,
        totalSessions: sql<number>`count(*)`,
      })
        .from(reservationsTable)
        .groupBy(reservationsTable.trainerId)
        .orderBy(sql`count(*) filter (where ${reservationsTable.status} = 'completed') desc`)
        .limit(5);
      const trainerIds = rows.map((r: any) => r.trainerId).filter((x: any) => x != null);
      let trainerMap: Record<number, { name: string; rating: number }> = {};
      if (trainerIds.length > 0) {
        const userRows = await db.select({ id: usersTable.id, name: usersTable.name }).from(usersTable);
        for (const u of userRows as any[]) trainerMap[u.id] = { name: u.name || `훈련사 #${u.id}`, rating: 0 };
        try {
          const tRows = await db.select({ userId: trainers.userId, rating: trainers.rating }).from(trainers);
          for (const t of tRows as any[]) {
            if (t.userId && trainerMap[t.userId]) {
              trainerMap[t.userId].rating = Number(t.rating) || 0;
            }
          }
        } catch {}
      }
      topTrainers = rows
        .filter((r: any) => Number(r.sessions) > 0 || Number(r.totalSessions) > 0)
        .map((r: any) => ({
          name: trainerMap[r.trainerId]?.name || `훈련사 #${r.trainerId}`,
          sessions: Number(r.sessions) || Number(r.totalSessions) || 0,
          rating: trainerMap[r.trainerId]?.rating || 0,
        }));
    } catch {}

    // ----- Geography -----
    const regionKeys = ['서울', '경기', '인천', '부산', '대구', '광주', '대전', '울산', '세종', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주'];
    const regionUserCount: Record<string, number> = {};
    const regionUserIds: Record<string, Set<number>> = {};
    for (const u of allUsers) {
      const text = `${u.address || ''} ${u.location || ''} ${u.workingArea || ''}`;
      const matched = regionKeys.find(k => text.includes(k));
      const key = matched || (text.trim() ? '기타' : null);
      if (!key) continue;
      regionUserCount[key] = (regionUserCount[key] || 0) + 1;
      if (!regionUserIds[key]) regionUserIds[key] = new Set();
      if (u.id) regionUserIds[key].add(u.id);
    }
    // Compute revenue per region by summing orders/purchases of those user ids
    const allUserIds = Object.values(regionUserIds).reduce<number[]>((a, s) => a.concat(Array.from(s)), []);
    let userRevenue: Record<number, number> = {};
    if (allUserIds.length > 0) {
      try {
        const rows = await db.select({
          userId: ordersTable.userId,
          rev: sql<number>`coalesce(sum(case when ${ordersTable.paymentStatus} = 'completed' or ${ordersTable.status} = 'completed' then ${ordersTable.totalAmount} else 0 end), 0)`,
        }).from(ordersTable).groupBy(ordersTable.userId);
        for (const r of rows as any[]) {
          if (r.userId != null) userRevenue[r.userId] = (userRevenue[r.userId] || 0) + (Number(r.rev) || 0);
        }
      } catch {}
      try {
        const rows = await db.select({
          userId: coursePurchasesTable.userId,
          rev: sql<number>`coalesce(sum(case when ${coursePurchasesTable.paymentStatus} = 'completed' then ${coursePurchasesTable.purchaseAmount} else 0 end), 0)`,
        }).from(coursePurchasesTable).groupBy(coursePurchasesTable.userId);
        for (const r of rows as any[]) {
          if (r.userId != null) userRevenue[r.userId] = (userRevenue[r.userId] || 0) + (Number(r.rev) || 0);
        }
      } catch {}
    }
    const totalRegionUsers = Object.values(regionUserCount).reduce((s, n) => s + n, 0);
    const regionsArr = Object.entries(regionUserCount).map(([region, users]) => {
      const ids = Array.from(regionUserIds[region] || []);
      const revenue = ids.reduce((s, id) => s + (userRevenue[id] || 0), 0);
      const percentage = totalRegionUsers > 0 ? Math.round((users / totalRegionUsers) * 100) : 0;
      return { region, users, revenue: Math.round(revenue), percentage };
    }).sort((a, b) => b.users - a.users);

    return {
      users: { monthlyGrowth, ageGroups, hourlyDistribution, engagement },
      revenue: { monthlyTrend, growthRate, averageOrderValue, customerLifetimeValue },
      training: { categoryDistribution, categoryCompletion, topTrainers },
      geography: { regions: regionsArr },
    };
  }

  // 화상수업/세션 예약 생성 (PostgreSQL)
  async createReservation(data: {
    userId: number;
    trainerId: number;
    petId?: number | null;
    serviceType: string;
    scheduledAt: Date;
    duration?: number | null;
    status?: string | null;
    notes?: string | null;
    price?: number | string | null;
  }): Promise<any> {
    try {
      const [row] = await db
        .insert(reservationsTable)
        .values({
          userId: data.userId,
          trainerId: data.trainerId,
          petId: data.petId ?? null,
          serviceType: data.serviceType,
          scheduledAt: data.scheduledAt,
          duration: data.duration ?? 60,
          status: data.status ?? 'pending',
          notes: data.notes ?? null,
          price: data.price != null ? String(data.price) : null,
        })
        .returning();
      return row;
    } catch (error) {
      logServerError('[Storage] 예약 생성 실패:', error);
      throw error;
    }
  }
}

const storage = new HybridStorage();

export type IStorage = typeof storage;
export { storage };
export default storage;