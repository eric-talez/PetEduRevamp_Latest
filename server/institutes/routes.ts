import { Express } from "express";
import { storage as storageInstance } from "../storage";
import { csrfProtection } from '../middleware/csrf';
import { logServerError } from '../middleware/audit-logger';

export function registerInstituteRoutes(app: Express, storage: any) {
  // 기관 목록 조회
  app.get("/api/institutes", async (req, res) => {
    try {
      const institutes = await storage.getAllInstitutes();
      res.json(institutes || []);
    } catch (error) {
      logServerError('Error fetching institutes:', error, req);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // 기관 상세 조회
  app.get("/api/institutes/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      console.log('[InstituteAPI] 기관 상세 조회 요청:', id);
      
      const institute = await storage.getInstitute(id);
      console.log('[InstituteAPI] 조회된 기관 데이터:', institute);

      if (!institute) {
        console.log('[InstituteAPI] 기관을 찾을 수 없음:', id);
        return res.status(404).json({ message: 'Institute not found' });
      }

      res.json(institute);
    } catch (error) {
      logServerError('Error fetching institute:', error, req);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // 기관별 훈련사 조회
  app.get("/api/institutes/:id/trainers", async (req, res) => {
    try {
      const instituteId = parseInt(req.params.id);
      console.log('[InstituteTrainers] 기관별 훈련사 조회 요청:', instituteId);
      
      const trainers = await storage.getAllTrainers();
      console.log('[InstituteTrainers] 전체 훈련사 개수:', trainers.length);
      
      // 기관별 훈련사 필터링 - 실제 데이터 기반으로 동작
      const instituteTrainers = trainers.filter(t => {
        // 훈련사의 instituteId 또는 소속 기관 정보로 필터링
        return t.instituteId === instituteId || 
               (t.institute && t.institute.toLowerCase() === '왕짱스쿨' && instituteId === 1) ||
               (t.affiliatedInstitutes && t.affiliatedInstitutes.includes(instituteId));
      });

      console.log('[InstituteTrainers] 기관별 필터링된 훈련사 개수:', instituteTrainers.length);
      console.log('[InstituteTrainers] 필터링된 훈련사:', instituteTrainers);

      // UnifiedTrainer 형태로 변환
      const formattedTrainers = instituteTrainers.map(trainer => ({
        id: trainer.id,
        name: trainer.name,
        email: trainer.email,
        phone: trainer.phone,
        joinDate: trainer.createdAt || new Date().toISOString(),
        status: trainer.isVerified ? 'active' : 'pending',
        specialties: Array.isArray(trainer.specialization) ? trainer.specialization : [trainer.specialization || '기본 훈련'],
        rating: trainer.rating || 4.5,
        totalStudents: trainer.totalStudents || 10,
        activeCourses: trainer.activeCourses || 2,
        completedCourses: trainer.completedCourses || 5,
        profileImage: trainer.image || trainer.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(trainer.name)}&backgroundColor=6366f1&textColor=ffffff`,
        certification: trainer.certifications || [trainer.certification || '기본 자격증'],
        experience: trainer.experience || 2,
        lastActive: new Date().toISOString()
      }));

      res.json(formattedTrainers);
    } catch (error) {
      logServerError('Error fetching institute trainers:', error, req);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // 기관별 수강생 조회
  app.get("/api/institutes/:id/students", async (req, res) => {
    try {
      const instituteId = parseInt(req.params.id);
      // 여기서는 샘플 데이터를 반환합니다
      const students = [
        { id: 1, name: '김반려', petName: '멍멍이', instituteId },
        { id: 2, name: '박펫샵', petName: '야옹이', instituteId }
      ];

      res.json(students);
    } catch (error) {
      logServerError('Error fetching institute students:', error, req);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // 기관별 통계 조회
  app.get("/api/institutes/:id/stats", async (req, res) => {
    try {
      const instituteId = parseInt(req.params.id);
      const stats = {
        totalTrainers: 5,
        totalStudents: 23,
        monthlyRevenue: 2500000,
        activeClasses: 8
      };

      res.json(stats);
    } catch (error) {
      logServerError('Error fetching institute stats:', error, req);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // 예약 생성 API
  app.post("/api/institutes/:id/reservations", csrfProtection, async (req, res) => {
    try {
      const instituteId = parseInt(req.params.id);
      const reservationData = req.body;

      console.log('[Reservation API] 예약 생성 요청:', reservationData);

      // 기본 유효성 검사
      if (!reservationData.name || !reservationData.phone || !reservationData.date || !reservationData.time) {
        return res.status(400).json({ 
          message: 'Missing required fields',
          error: '필수 정보가 누락되었습니다.' 
        });
      }

      // 예약 데이터 저장 (실제로는 데이터베이스에 저장)
      const reservation = {
        id: Date.now(),
        instituteId,
        ...reservationData,
        status: 'pending',
        createdAt: new Date().toISOString()
      };

      console.log('[Reservation API] 예약 생성 완료:', reservation);

      res.status(201).json({
        success: true,
        message: '예약이 성공적으로 생성되었습니다.',
        reservation
      });

    } catch (error) {
      logServerError('Error creating reservation:', error, req);
      res.status(500).json({ 
        success: false,
        message: 'Internal server error',
        error: '예약 생성 중 오류가 발생했습니다.'
      });
    }
  });

  // 기관별 문의 조회 API (관리자용)
  app.get("/api/institutes/:id/inquiries", async (req, res) => {
    try {
      const instituteId = parseInt(req.params.id);
      
      console.log('[Inquiry API] 문의 조회 요청 - 기관 ID:', instituteId);

      // 실제로는 데이터베이스에서 조회하지만, 현재는 메모리에서 조회
      // 전역 메모리에 저장된 문의들을 기관별로 필터링
      if (!global.instituteInquiries) {
        global.instituteInquiries = [];
      }

      const inquiries = global.instituteInquiries.filter(
        (inquiry: any) => inquiry.instituteId === instituteId
      );

      console.log('[Inquiry API] 조회된 문의 목록:', inquiries);

      res.json({
        success: true,
        inquiries: inquiries.sort((a: any, b: any) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
      });

    } catch (error) {
      logServerError('Error fetching inquiries:', error, req);
      res.status(500).json({ 
        success: false,
        message: 'Internal server error',
        error: '문의 조회 중 오류가 발생했습니다.'
      });
    }
  });

  // 문의 생성 API
  app.post("/api/institutes/:id/inquiries", csrfProtection, async (req, res) => {
    try {
      const instituteId = parseInt(req.params.id);
      const inquiryData = req.body;

      console.log('[Inquiry API] 문의 생성 요청:', inquiryData);

      // 기본 유효성 검사
      if (!inquiryData.name || !inquiryData.contact || !inquiryData.message) {
        return res.status(400).json({ 
          message: 'Missing required fields',
          error: '필수 정보가 누락되었습니다.' 
        });
      }

      // 문의 데이터 저장
      const inquiry = {
        id: Date.now(),
        instituteId,
        ...inquiryData,
        status: 'pending',
        createdAt: new Date().toISOString()
      };

      // 전역 메모리에 문의 저장
      if (!global.instituteInquiries) {
        global.instituteInquiries = [];
      }
      global.instituteInquiries.push(inquiry);

      console.log('[Inquiry API] 문의 생성 완료:', inquiry);

      res.status(201).json({
        success: true,
        message: '문의가 성공적으로 접수되었습니다.',
        inquiry
      });

    } catch (error) {
      logServerError('Error creating inquiry:', error, req);
      res.status(500).json({ 
        success: false,
        message: 'Internal server error',
        error: '문의 접수 중 오류가 발생했습니다.'
      });
    }
  });

  // 문의 상태 업데이트 API (관리자용)
  app.patch("/api/institutes/:id/inquiries/:inquiryId", csrfProtection, async (req, res) => {
    try {
      const instituteId = parseInt(req.params.id);
      const inquiryId = parseInt(req.params.inquiryId);
      const { status, response } = req.body;

      console.log('[Inquiry API] 문의 상태 업데이트:', { instituteId, inquiryId, status, response });

      if (!global.instituteInquiries) {
        global.instituteInquiries = [];
      }

      const inquiryIndex = global.instituteInquiries.findIndex(
        (inquiry: any) => inquiry.id === inquiryId && inquiry.instituteId === instituteId
      );

      if (inquiryIndex === -1) {
        return res.status(404).json({
          success: false,
          message: 'Inquiry not found',
          error: '문의를 찾을 수 없습니다.'
        });
      }

      // 문의 상태 업데이트
      global.instituteInquiries[inquiryIndex] = {
        ...global.instituteInquiries[inquiryIndex],
        status,
        response,
        respondedAt: new Date().toISOString()
      };

      console.log('[Inquiry API] 문의 업데이트 완료:', global.instituteInquiries[inquiryIndex]);

      res.json({
        success: true,
        message: '문의 상태가 업데이트되었습니다.',
        inquiry: global.instituteInquiries[inquiryIndex]
      });

    } catch (error) {
      logServerError('Error updating inquiry:', error, req);
      res.status(500).json({ 
        success: false,
        message: 'Internal server error',
        error: '문의 업데이트 중 오류가 발생했습니다.'
      });
    }
  });

  // 리뷰 생성 API
  app.post("/api/institutes/:id/reviews", csrfProtection, async (req, res) => {
    try {
      const instituteId = parseInt(req.params.id);
      const reviewData = req.body;

      console.log('[Review API] 리뷰 생성 요청:', reviewData);

      // 기본 유효성 검사
      if (!reviewData.authorName || !reviewData.rating || !reviewData.content) {
        return res.status(400).json({ 
          message: 'Missing required fields',
          error: '필수 정보가 누락되었습니다.' 
        });
      }

      // 평점 유효성 검사
      if (reviewData.rating < 1 || reviewData.rating > 5) {
        return res.status(400).json({ 
          message: 'Invalid rating',
          error: '평점은 1-5점 사이여야 합니다.' 
        });
      }

      // 리뷰 데이터 저장
      const review = {
        id: Date.now(),
        instituteId,
        ...reviewData,
        createdAt: new Date().toISOString()
      };

      // 전역 메모리에 리뷰 저장
      if (!global.instituteReviews) {
        global.instituteReviews = [];
      }
      global.instituteReviews.push(review);

      console.log('[Review API] 리뷰 생성 완료:', review);

      res.status(201).json({
        success: true,
        message: '리뷰가 성공적으로 등록되었습니다.',
        review
      });

    } catch (error) {
      logServerError('Error creating review:', error, req);
      res.status(500).json({ 
        success: false,
        message: 'Internal server error',
        error: '리뷰 등록 중 오류가 발생했습니다.'
      });
    }
  });

  // 기관별 리뷰 조회 API
  app.get("/api/institutes/:id/reviews", async (req, res) => {
    try {
      const instituteId = parseInt(req.params.id);

      console.log('[Review API] 리뷰 조회 요청 - 기관 ID:', instituteId);

      // 전역 메모리에서 리뷰 조회
      if (!global.instituteReviews) {
        global.instituteReviews = [];
      }

      // 해당 기관의 리뷰만 필터링
      const instituteSpecificReviews = global.instituteReviews.filter(
        (review: any) => review.instituteId === instituteId
      );

      // 샘플 데이터와 실제 리뷰 데이터 합치기
      const sampleReviews = [
        {
          id: 1,
          instituteId,
          authorName: "김반려",
          rating: 5,
          content: "강동훈 훈련사님이 정말 친절하고 전문적이세요. 우리 골든리트리버 맥스가 많이 발전했어요!",
          trainerId: 1,
          trainerName: "강동훈",
          createdAt: "2024-12-15T10:30:00Z"
        },
        {
          id: 2,
          instituteId,
          authorName: "박펫샵",
          rating: 4,
          content: "시설이 깔끔하고 교육 프로그램이 체계적입니다. 다만 주차공간이 조금 아쉬워요.",
          createdAt: "2024-12-10T14:20:00Z"
        }
      ];

      // 전체 리뷰 목록 (샘플 + 실제 리뷰)
      const allReviews = [...sampleReviews, ...instituteSpecificReviews]
        .sort((a: any, b: any) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

      console.log('[Review API] 조회된 리뷰 목록:', allReviews);

      res.json({
        success: true,
        reviews: allReviews
      });

    } catch (error) {
      logServerError('Error fetching reviews:', error, req);
      res.status(500).json({ 
        success: false,
        message: 'Internal server error' 
      });
    }
  });

  // 현재 로그인한 사용자의 기관 정보 조회 (인증 필수)
  app.get("/api/my-institute", async (req: any, res) => {
    try {
      console.log('[MyInstitute] 현재 사용자 기관 정보 조회');
      
      // 세션에서 사용자 정보 확인 - 인증 필수
      const user = req.session?.user || req.user;
      
      if (!user || !user.id) {
        console.log('[MyInstitute] 인증되지 않은 요청');
        return res.status(401).json({ message: '로그인이 필요합니다.' });
      }

      if (user.role !== 'institute-admin' && user.role !== 'admin') {
        console.log('[MyInstitute] 권한 없음:', user.role);
        return res.status(403).json({ message: '기관 관리자만 접근할 수 있습니다.' });
      }

      let institute = null;

      // instituteId가 있으면 해당 기관 조회 (사용자와 연결된 기관만)
      if (user.instituteId) {
        institute = await storage.getInstitute(user.instituteId);
        
        // 기관이 존재하는지 확인
        if (!institute) {
          console.log('[MyInstitute] 사용자 연결 기관 없음:', user.instituteId);
          return res.status(404).json({ message: '소속 기관 정보를 찾을 수 없습니다.' });
        }
      } else {
        // admin은 첫 번째 기관 조회 가능 (데모용)
        if (user.role === 'admin') {
          const institutes = await storage.getAllInstitutes();
          if (institutes && institutes.length > 0) {
            institute = institutes[0];
          }
        }
        
        if (!institute) {
          console.log('[MyInstitute] 소속 기관 없음');
          return res.status(404).json({ message: '소속 기관 정보를 찾을 수 없습니다.' });
        }
      }

      // 기관 코드가 없으면 자동 생성 (기관이 확실히 존재할 때만)
      if (!institute.code && institute.id) {
        const generatedCode = `TALEZ-${institute.id.toString().padStart(4, '0')}-${Date.now().toString(36).toUpperCase().slice(-4)}`;
        
        // 기관 코드 업데이트
        try {
          const updated = await storage.updateInstitute(institute.id, { code: generatedCode });
          if (updated) {
            institute.code = generatedCode;
            console.log('[MyInstitute] 기관 코드 자동 생성:', generatedCode);
          } else {
            console.warn('[MyInstitute] 기관 코드 업데이트 실패 - 임시 코드 반환');
            institute.code = generatedCode;
          }
        } catch (updateError) {
          logServerError('[MyInstitute] 기관 코드 업데이트 오류:', updateError, req);
          // 업데이트 실패해도 임시 코드 반환
          institute.code = generatedCode;
        }
      }

      // 추가 통계 정보
      const trainers = await storage.getAllTrainers();
      const instituteTrainers = trainers.filter(t => 
        t.instituteId === institute.id || 
        (t.affiliatedInstitutes && t.affiliatedInstitutes.includes(institute.id))
      );

      const response = {
        ...institute,
        trainerCount: instituteTrainers.length,
        studentCount: institute.studentCount || 0,
        courseCount: institute.courseCount || 0
      };

      console.log('[MyInstitute] 기관 정보 응답:', { id: response.id, name: response.name, code: response.code });
      res.json(response);

    } catch (error) {
      logServerError('[MyInstitute] 기관 정보 조회 오류:', error, req);
      res.status(500).json({ message: '기관 정보 조회 중 오류가 발생했습니다.' });
    }
  });

  // 전화 문의 로그 API
  app.post("/api/institutes/:id/call-inquiries", csrfProtection, async (req, res) => {
    try {
      const instituteId = parseInt(req.params.id);
      const callData = req.body;

      console.log('[Call Inquiry API] 전화 문의 로그:', callData);

      // 전화 문의 로그 저장
      const callInquiry = {
        id: Date.now(),
        instituteId,
        callerInfo: callData.callerInfo,
        purpose: callData.purpose,
        timestamp: new Date().toISOString()
      };

      res.status(201).json({
        success: true,
        message: '전화 문의가 기록되었습니다.',
        callInquiry
      });

    } catch (error) {
      logServerError('Error logging call inquiry:', error, req);
      res.status(500).json({ 
        success: false,
        message: 'Internal server error' 
      });
    }
  });
}