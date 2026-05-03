import type { Express, Request, Response, NextFunction } from "express";
import { storage } from "../storage";
import { insertContentReportSchema } from "../../shared/schema";
import { z } from "zod";
import { recordAuditLog, logServerError } from "../middleware/audit-logger";

// 임시 에러 핸들러
const asyncHandler = (fn: Function) => (req: any, res: any, next: any) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

const successResponse = (data: any) => ({ success: true, data });

// 관리자 권한 검사 미들웨어
const requireAdmin = (req: any, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ 
      success: false, 
      message: '로그인이 필요합니다.',
      code: 'AUTHENTICATION_REQUIRED'
    });
  }
  if (req.user.role !== 'admin') {
    return res.status(403).json({ 
      success: false, 
      message: '관리자 권한이 필요합니다.',
      code: 'ADMIN_ACCESS_REQUIRED'
    });
  }
  next();
};

// ApiError 클래스 정의
class ApiError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }

  static forbidden(message: string) {
    return new ApiError(403, message);
  }

  static unauthorized() {
    return new ApiError(401, 'Unauthorized');
  }

  static internal(message: string) {
    return new ApiError(500, message);
  }
}

export function registerAdminRoutes(app: Express) {
  // 회원 현황 조회 API
  app.get('/api/admin/members-status', requireAdmin, asyncHandler(async (req: any, res: any) => {
    console.log('[Admin] 회원 현황 조회 요청');

    try {
      // storage에서 데이터 가져오기
      const users = await storage.getAllUsers() || [];
      const pets = await storage.getAllPets ? await storage.getAllPets() : [];
      const institutes = await storage.getInstitutes ? await storage.getInstitutes() : [];

      console.log('[Admin] 데이터 현황:', {
        usersCount: users.length,
        petsCount: pets.length, 
        institutesCount: institutes.length
      });

      const membersByRole = {
        'pet-owner': users.filter((u: any) => u.role === 'pet-owner'),
        'trainer': users.filter((u: any) => u.role === 'trainer'), 
        'institute-admin': users.filter((u: any) => u.role === 'institute-admin'),
        'admin': users.filter((u: any) => u.role === 'admin')
      };

      const instituteMemberships = institutes.map(inst => ({
        userId: inst.trainerId,
        userName: inst.trainerName || '미지정',
        userRole: 'trainer',
        instituteName: inst.name,
        joinedAt: inst.createdAt || new Date().toISOString()
      })).filter(membership => membership.userId);

      const trainerConnections = institutes.filter(inst => inst.trainerId).map(inst => ({
        trainerId: inst.trainerId,
        trainerName: inst.trainerName || '미지정',
        connectedOwners: users
          .filter(u => u.role === 'pet-owner')
          .slice(0, 2) // 샘플 연결
          .map(owner => ({
            id: owner.id,
            name: owner.name,
            email: owner.email
          }))
      }));

      const summary = {
        totalUsers: users.length,
        totalTrainers: users.filter(u => u.role === 'trainer').length,
        totalInstitutes: institutes.length,
        totalPets: pets.length,
        petOwners: users.filter(u => u.role === 'pet-owner').length,
        instituteAdmins: users.filter(u => u.role === 'institute-admin').length,
        verifiedMembers: users.filter(u => u.isVerified).length
      };

      const result = {
        membersByRole,
        instituteMemberships,
        trainerConnections,
        summary
      };

      console.log('[Admin] 응답 데이터:', {
        summary,
        membersByRoleCount: Object.keys(membersByRole).reduce((acc, role) => {
          acc[role] = membersByRole[role].length;
          return acc;
        }, {} as any)
      });

      res.json(successResponse(result));
    } catch (error) {
      logServerError('회원 현황 조회 오류:', error, req);
      throw ApiError.internal('회원 현황을 불러올 수 없습니다');
    }
  }));

  // 회원 상태 변경 API
  app.patch("/api/admin/members/:id/status", requireAdmin, async (req, res) => {
    try {
      const memberId = parseInt(req.params.id);
      const { status, reason } = req.body;

      console.log(`[Admin] 회원 ${memberId} 상태 변경: ${status}`);

      // 실제로는 데이터베이스 업데이트
      const updatedMember = {
        id: memberId,
        status: status,
        statusReason: reason,
        updatedAt: new Date().toISOString()
      };

      await recordAuditLog(req, {
        action: 'admin.member.status_change',
        targetType: 'user',
        targetId: memberId,
        payload: { status, reason },
      });

      res.json({
        success: true,
        data: updatedMember,
        message: `회원 상태가 ${status}로 변경되었습니다.`
      });
    } catch (error) {
      logServerError('회원 상태 변경 오류', error, req);
      res.status(500).json({ 
        success: false,
        message: '회원 상태 변경 중 오류가 발생했습니다.' 
      });
    }
  });

  // 관리자 승인 대기 목록 조회
  app.get("/api/admin/approvals", requireAdmin, async (req, res) => {
    try {
      const approvals = [
        { id: 1, type: 'trainer', name: '김훈련', status: 'pending', requestDate: '2024-12-15' },
        { id: 2, type: 'institute', name: '펫 아카데미', status: 'pending', requestDate: '2024-12-16' }
      ];
      res.json(approvals);
    } catch (error) {
      logServerError('Error fetching approvals:', error, req);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Spring Boot 연동 사용자 관리
  app.get("/api/spring/users", async (req, res) => {
    try {
      const users = [
        { id: 1, role: 'pet-owner', name: '김반려', email: 'owner@test.com' },
        { id: 2, role: 'trainer', name: '박훈련', email: 'trainer@test.com' },
        { id: 3, role: 'institute-admin', name: '이기관', email: 'admin@test.com' }
      ];
      res.json(users);
    } catch (error) {
      logServerError('Error fetching users:', error, req);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // 관리자 위치 등록 API
  app.post("/api/admin/locations", requireAdmin, async (req, res) => {
    try {
      const { name, type, address, latitude, longitude, description, certification } = req.body;

      const newLocation = {
        id: Date.now(),
        name,
        type, // 'institute', 'trainer', 'clinic', 'shop'
        address,
        coordinates: { latitude, longitude },
        description,
        certification: certification || false,
        status: 'active',
        createdAt: new Date().toISOString(),
        adminApproved: true
      };

      // 실제로는 데이터베이스에 저장
      console.log('새 위치 등록:', newLocation);

      res.status(201).json({
        success: true,
        location: newLocation,
        message: '위치가 성공적으로 등록되었습니다.'
      });
    } catch (error) {
      logServerError('Error creating location:', error, req);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // 기관 관리 목록 조회
  app.get("/api/admin/institutes", requireAdmin, async (req, res) => {
    try {
      console.log('[Admin] 기관 관리 목록 조회 요청');

      // 데이터베이스에서 실제 기관 데이터 조회
      const dbInstitutes = await storage.getInstitutes();
      console.log('[Admin] 데이터베이스 기관 조회 결과:', dbInstitutes.length + '개');

      // 데이터 형식 정규화
      const institutes = dbInstitutes.map((inst: any) => ({
        id: inst.id,
        code: inst.code || inst.instituteCode || null,
        name: inst.name || '이름 없음',
        businessNumber: inst.businessNumber || inst.business_number || null,
        address: inst.address || inst.location || null,
        phone: inst.phone || null,
        email: inst.email || null,
        directorName: inst.directorName || inst.director_name || inst.director || null,
        directorEmail: inst.directorEmail || inst.director_email || null,
        status: inst.isActive ? 'active' : (inst.status || 'inactive'),
        isActive: inst.isActive ?? true,
        isVerified: inst.isVerified ?? false,
        certification: inst.certification || null,
        establishedDate: inst.establishedDate || inst.established_date || null,
        registeredDate: inst.createdAt || inst.created_at || null,
        trainersCount: inst.trainersCount || 0,
        studentsCount: inst.studentsCount || 0,
        coursesCount: inst.coursesCount || 0,
        facilities: inst.facilities || [],
        operatingHours: inst.operatingHours || null,
        description: inst.description || null,
        website: inst.website || null,
        subscriptionPlan: inst.subscriptionPlan || inst.subscription_plan || null,
        subscriptionStatus: inst.subscriptionStatus || inst.subscription_status || 'inactive',
        maxMembers: inst.maxMembers ?? 0,
        maxVideoHours: inst.maxVideoHours ?? 0,
        maxAiAnalysis: inst.maxAiAnalysis ?? 0,
        usedVideoHours: inst.usedVideoHours ?? 0,
        currentAiUsage: inst.currentAiUsage ?? 0,
        trainerId: inst.trainerId || inst.trainer_id || null
      }));

      const stats = {
        totalInstitutes: institutes.length,
        activeInstitutes: institutes.filter((i: any) => i.isActive).length,
        pendingInstitutes: institutes.filter((i: any) => i.status === 'pending').length,
        suspendedInstitutes: institutes.filter((i: any) => i.status === 'suspended').length,
        verifiedInstitutes: institutes.filter((i: any) => i.isVerified).length,
        totalTrainers: institutes.reduce((sum: number, i: any) => sum + (i.trainersCount || 0), 0),
        totalStudents: institutes.reduce((sum: number, i: any) => sum + (i.studentsCount || 0), 0),
        totalCourses: institutes.reduce((sum: number, i: any) => sum + (i.coursesCount || 0), 0)
      };

      res.json({
        success: true,
        data: {
          institutes,
          stats
        },
        message: '기관 목록을 성공적으로 조회했습니다.'
      });
    } catch (error) {
      logServerError('기관 목록 조회 오류:', error, req);
      res.status(500).json({ 
        success: false,
        message: '기관 목록 조회 중 오류가 발생했습니다.' 
      });
    }
  });

  // 기관 상태 변경 API
  app.patch("/api/admin/institutes/:id/status", requireAdmin, async (req, res) => {
    try {
      const instituteId = parseInt(req.params.id);
      const { status, reason } = req.body;

      console.log(`[Admin] 기관 ${instituteId} 상태 변경: ${status}`);

      const updatedInstitute = {
        id: instituteId,
        status: status,
        statusReason: reason,
        updatedAt: new Date().toISOString()
      };

      await recordAuditLog(req, {
        action: 'admin.institute.status_change',
        targetType: 'institute',
        targetId: instituteId,
        payload: { status, reason },
      });

      res.json({
        success: true,
        data: updatedInstitute,
        message: `기관 상태가 ${status}로 변경되었습니다.`
      });
    } catch (error) {
      logServerError('기관 상태 변경 오류', error, req);
      res.status(500).json({ 
        success: false,
        message: '기관 상태 변경 중 오류가 발생했습니다.' 
      });
    }
  });

  // 관리자 위치 목록 조회 (기존 유지)
  app.get("/api/admin/locations", requireAdmin, async (req, res) => {
    try {
      const locations = [
        {
          id: 1,
          name: "서울반려견아카데미",
          type: "institute",
          address: "서울시 강남구 테헤란로 123",
          coordinates: { latitude: 37.5665, longitude: 126.9780 },
          description: "전문 반려견 교육 기관",
          certification: true,
          status: "active",
          createdAt: "2024-01-15T09:00:00Z",
          adminApproved: true
        },
        {
          id: 2,
          name: "김훈련사 개인 훈련소",
          type: "trainer",
          address: "서울시 마포구 홍대로 456",
          coordinates: { latitude: 37.5563, longitude: 126.9239 },
          description: "경력 10년 전문 훈련사",
          certification: true,
          status: "active",
          createdAt: "2024-02-20T10:30:00Z",
          adminApproved: true
        }
      ];

      res.json({
        success: true,
        locations,
        total: locations.length
      });
    } catch (error) {
      logServerError('Error fetching admin locations:', error, req);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // 관리자 위치 승인/거부
  app.patch("/api/admin/locations/:id/approve", requireAdmin, async (req, res) => {
    try {
      const locationId = parseInt(req.params.id);
      const { approved, reason } = req.body;

      // 실제로는 데이터베이스에서 업데이트
      const updatedLocation = {
        id: locationId,
        adminApproved: approved,
        approvalReason: reason,
        approvedAt: new Date().toISOString(),
        status: approved ? 'active' : 'rejected'
      };

      res.json({
        success: true,
        location: updatedLocation,
        message: approved ? '위치가 승인되었습니다.' : '위치가 거부되었습니다.'
      });
    } catch (error) {
      logServerError('Error approving location:', error, req);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // 커리큘럼 목록 조회 API
  app.get('/api/admin/curriculums', requireAdmin, asyncHandler(async (req: any, res: any) => {
    console.log('[Admin] 커리큘럼 목록 조회 요청');

    try {
      const curriculums = storage.getCurriculums() || [];

      console.log('[Admin] 커리큘럼 응답:', curriculums.length + '개');

      res.json({
        success: true,
        curriculums: curriculums,
        total: curriculums.length
      });
    } catch (error) {
      logServerError('커리큘럼 목록 조회 오류:', error, req);
      res.status(500).json({ 
        success: false,
        message: '커리큘럼 목록을 불러올 수 없습니다.' 
      });
    }
  }));

  // 기관 목록 조회 API
  app.get('/api/institutes', asyncHandler(async (req: any, res: any) => {
    console.log('[Admin] 기관 목록 조회 요청');

    try {
      const institutes = await storage.getInstitutes();

      const institutesWithDetails = institutes.map(institute => ({
        ...institute,
        trainersCount: institute.trainerId ? 1 : (institute.trainersCount || 0),
        studentsCount: institute.studentsCount || 0,
        isActive: institute.isActive !== false // 기본값 true
      }));

      console.log('[Admin] 기관 목록 응답:', institutesWithDetails.length + '개');

      res.json(successResponse(institutesWithDetails));
    } catch (error) {
      logServerError('기관 목록 조회 오류:', error, req);
      throw ApiError.internal('기관 목록을 불러올 수 없습니다');
    }
  }));

  // 훈련사 양성 프로그램 관리 API
  app.get('/api/trainer-programs', async (req, res) => {
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
          enrolledCount: 15,
          status: 'active'
        },
        {
          id: 2,
          name: "고급 행동 교정사 과정",
          duration: "12주",
          description: "문제 행동 교정 전문가 양성 과정",
          price: 800000,
          startDate: "2024-03-15",
          capacity: 15,
          enrolledCount: 8,
          status: 'active'
        }
      ];
      
      res.json({
        success: true,
        programs
      });
    } catch (error) {
      logServerError('훈련사 프로그램 조회 오류:', error, req);
      res.status(500).json({
        success: false,
        message: '훈련사 프로그램 조회 중 오류가 발생했습니다.'
      });
    }
  });

  // ※ 중복 라우트 제거됨 - 메인 routes.ts의 데이터베이스 연동 API 사용

  // 훈련사 인증 기록 API
  app.get('/api/trainer-certifications', async (req, res) => {
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
      logServerError('훈련사 인증 조회 오류:', error, req);
      res.status(500).json({
        success: false,
        message: '훈련사 인증 조회 중 오류가 발생했습니다.'
      });
    }
  });

  // ===== 신고 관리 (Task #50) =====
  // 신고 생성 (로그인 사용자 또는 익명)
  app.post('/api/reports', asyncHandler(async (req: any, res: any) => {
    const parsed = insertContentReportSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: '신고 데이터가 올바르지 않습니다.',
        errors: parsed.error.flatten(),
      });
    }
    const reporterId = req.user?.id ?? null;
    const report = await storage.createContentReport({ ...parsed.data, reporterId });
    res.status(201).json(successResponse(report));
  }));

  // 관리자: 신고 목록
  app.get('/api/admin/reports', requireAdmin, asyncHandler(async (req: any, res: any) => {
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const targetType = typeof req.query.targetType === 'string' ? req.query.targetType : undefined;
    const limit = req.query.limit ? Math.min(parseInt(String(req.query.limit), 10) || 200, 500) : 200;
    const reports = await storage.listContentReports({ status, targetType, limit });
    const stats = await storage.getContentReportStats();
    res.json(successResponse({ reports, stats }));
  }));

  // 관리자: 단건 조회
  app.get('/api/admin/reports/:id', requireAdmin, asyncHandler(async (req: any, res: any) => {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ success: false, message: '잘못된 ID입니다.' });
    const report = await storage.getContentReport(id);
    if (!report) return res.status(404).json({ success: false, message: '신고를 찾을 수 없습니다.' });
    res.json(successResponse(report));
  }));

  // 관리자: 신고 처리/상태 변경
  const updateReportSchema = z.object({
    status: z.enum(['pending', 'investigating', 'resolved', 'dismissed']),
    resolutionComment: z.string().max(2000).optional(),
  });
  app.patch('/api/admin/reports/:id', requireAdmin, asyncHandler(async (req: any, res: any) => {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ success: false, message: '잘못된 ID입니다.' });
    const parsed = updateReportSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: '요청 데이터가 올바르지 않습니다.',
        errors: parsed.error.flatten(),
      });
    }
    const updated = await storage.updateContentReportStatus(id, {
      status: parsed.data.status,
      resolverId: req.user?.id ?? null,
      resolutionComment: parsed.data.resolutionComment ?? null,
    });
    if (!updated) return res.status(404).json({ success: false, message: '신고를 찾을 수 없습니다.' });
    res.json(successResponse(updated));
  }));

  return app;
}