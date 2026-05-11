
import { Express, Request, Response, NextFunction } from "express";
import { csrfProtection } from '../middleware/csrf';
import { db } from '../db';
import { matchingRequests, trainers as trainersTable } from '../../shared/schema';
import { eq, desc } from 'drizzle-orm';
import { logServerError } from '../middleware/audit-logger';
import { notificationService } from '../notifications/notification-service';

function getSessionUser(req: Request): { id: number; role?: string } | null {
  const u = (req as any).user || (req as any).session?.user;
  if (!u || typeof u.id !== 'number') return null;
  return { id: u.id, role: u.role };
}

function requireAuth(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const u = getSessionUser(req);
    if (!u) return res.status(401).json({ success: false, message: '로그인이 필요합니다.' });
    if (allowedRoles.length && !allowedRoles.includes(u.role || '')) {
      return res.status(403).json({ success: false, message: '권한이 없습니다.' });
    }
    next();
  };
}

export function registerMatchingSystemRoutes(app: Express, storage: any) {
  // 전체 매칭 현황 조회 (관리자용)
  app.get("/api/matching/overview", requireAuth('admin'), async (req, res) => {
    try {
      console.log('[MatchingSystem] 전체 매칭 현황 조회');

      // 기관-훈련사 매칭 현황
      const institutes = await storage.getAllInstitutes();
      const trainers = await storage.getTrainers();
      const users = await storage.getUsers();
      const pets = await storage.getPets();

      // 매칭 통계 계산
      const stats = {
        totalInstitutes: institutes.length,
        totalTrainers: trainers.length,
        totalPetOwners: users.filter((u: any) => u.role === 'user').length,
        totalPets: pets.length,
        
        // 훈련사 매칭 현황
        assignedTrainers: trainers.filter((t: any) => t.instituteId).length,
        unassignedTrainers: trainers.filter((t: any) => !t.instituteId).length,
        
        // 반려견 매칭 현황
        assignedPets: pets.filter((p: any) => p.assignedTrainerId).length,
        unassignedPets: pets.filter((p: any) => !p.assignedTrainerId).length,
        
        // 기관별 현황
        instituteStats: institutes.map((institute: any) => ({
          id: institute.id,
          name: institute.name,
          trainersCount: trainers.filter((t: any) => t.instituteId === institute.id).length,
          petsCount: pets.filter((p: any) => {
            const trainer = trainers.find((t: any) => t.id === p.assignedTrainerId);
            return trainer && trainer.instituteId === institute.id;
          }).length
        }))
      };

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      logServerError('[MatchingSystem] 매칭 현황 조회 실패:', error, req);
      res.status(500).json({ 
        success: false, 
        message: '매칭 현황 조회 중 오류가 발생했습니다.' 
      });
    }
  });

  // 견주-훈련사 직접 매칭 요청
  app.post("/api/matching/request-trainer", requireAuth('user'), csrfProtection, async (req, res) => {
    try {
      const { petId, trainerId, message, preferredDate } = req.body;
      const sessionUser = getSessionUser(req)!;
      const userId = sessionUser.id;

      console.log('[MatchingSystem] 훈련사 매칭 요청:', { petId, trainerId, userId });

      // 반려견 소유권 확인
      const pets = await storage.getPets();
      const pet = pets.find((p: any) => p.id === parseInt(petId) && p.ownerId === userId);
      
      if (!pet) {
        return res.status(404).json({
          success: false,
          message: '반려견을 찾을 수 없습니다.'
        });
      }

      // 훈련사 존재 확인
      const trainers = await storage.getTrainers();
      const trainer = trainers.find((t: any) => t.id === parseInt(trainerId));
      
      if (!trainer) {
        return res.status(404).json({
          success: false,
          message: '훈련사를 찾을 수 없습니다.'
        });
      }

      // 매칭 요청 생성 - 데이터베이스에 저장
      const [newRequest] = await db.insert(matchingRequests).values({
        petId: parseInt(petId),
        trainerId: parseInt(trainerId),
        petOwnerId: userId,
        petName: pet.name,
        trainerName: trainer.name,
        response: message,
        status: 'pending',
      }).returning();

      console.log('[MatchingSystem] 매칭 요청 생성 완료:', newRequest);

      // 훈련사에게 매칭 요청 알림 (인앱 + FCM)
      // 주의: matching_requests.trainerId 는 trainers.id 이므로 users.id 로 변환 후 알림
      let trainerUserIdForNotify: number | null = null;
      try {
        const [tRow] = await db
          .select({ userId: trainersTable.userId })
          .from(trainersTable)
          .where(eq(trainersTable.id, parseInt(trainerId)))
          .limit(1);
        trainerUserIdForNotify = tRow?.userId ?? null;
      } catch (mapErr) {
        logServerError('[MatchingSystem] 훈련사 userId 매핑 실패:', mapErr, req);
      }
      try {
        await notificationService.sendNotification({
          userId: trainerUserIdForNotify ?? parseInt(trainerId),
          type: 'matching',
          title: '새 매칭 요청이 도착했습니다',
          message: `${pet.name} 보호자님이 매칭 요청을 보냈습니다.${message ? ' "' + String(message).slice(0, 60) + '"' : ''}`,
          data: { matchingRequestId: newRequest.id, petId: pet.id, petName: pet.name, petOwnerId: userId, action: 'matching_requested' },
          actionUrl: `/trainer/matching/${newRequest.id}`,
        });
      } catch (notifyErr) {
        logServerError('[MatchingSystem] 훈련사 알림 전송 실패:', notifyErr, req);
      }

      res.json({
        success: true,
        message: '훈련사 매칭 요청이 전송되었습니다.',
        request: newRequest
      });

    } catch (error) {
      logServerError('[MatchingSystem] 매칭 요청 실패:', error, req);
      res.status(500).json({ 
        success: false, 
        message: '매칭 요청 중 오류가 발생했습니다.' 
      });
    }
  });

  // 훈련사별 매칭 요청 조회
  app.get("/api/matching/trainer-requests/:trainerId", requireAuth('trainer', 'admin'), async (req, res) => {
    try {
      const trainerId = parseInt(req.params.trainerId);
      const sessionUser = getSessionUser(req)!;

      // 본인 trainer 만 조회 가능 (admin 제외)
      if (sessionUser.role === 'trainer') {
        const [own] = await db
          .select({ id: trainersTable.id })
          .from(trainersTable)
          .where(eq(trainersTable.userId, sessionUser.id))
          .limit(1);
        if (!own || own.id !== trainerId) {
          return res.status(403).json({ success: false, message: '본인의 매칭 요청만 조회할 수 있습니다.' });
        }
      }

      console.log('[MatchingSystem] 훈련사 매칭 요청 조회:', trainerId);

      // 데이터베이스에서 조회
      const requests = await db.select()
        .from(matchingRequests)
        .where(eq(matchingRequests.trainerId, trainerId))
        .orderBy(desc(matchingRequests.createdAt));

      res.json({
        success: true,
        requests
      });

    } catch (error) {
      logServerError('[MatchingSystem] 요청 조회 실패:', error, req);
      res.status(500).json({ 
        success: false, 
        message: '매칭 요청 조회 중 오류가 발생했습니다.' 
      });
    }
  });

  // 매칭 요청 승인/거절
  app.patch("/api/matching/requests/:requestId", requireAuth('trainer', 'admin'), csrfProtection, async (req, res) => {
    try {
      const requestId = parseInt(req.params.requestId);
      const { status, response } = req.body; // 'approved' 또는 'rejected'
      const sessionUser = getSessionUser(req)!;

      console.log('[MatchingSystem] 매칭 요청 처리:', { requestId, status });

      // 상태 화이트리스트
      if (!['approved', 'rejected'].includes(status)) {
        return res.status(400).json({ success: false, message: '잘못된 상태값입니다.' });
      }

      // 기존 요청 조회
      const [existingRequest] = await db.select()
        .from(matchingRequests)
        .where(eq(matchingRequests.id, requestId));

      if (!existingRequest) {
        return res.status(404).json({
          success: false,
          message: '매칭 요청을 찾을 수 없습니다.'
        });
      }

      // 본인 trainer 만 처리 가능 (admin 제외)
      if (sessionUser.role === 'trainer') {
        const [own] = await db
          .select({ id: trainersTable.id })
          .from(trainersTable)
          .where(eq(trainersTable.userId, sessionUser.id))
          .limit(1);
        if (!own || own.id !== existingRequest.trainerId) {
          return res.status(403).json({ success: false, message: '본인의 매칭 요청만 처리할 수 있습니다.' });
        }
      }

      // 이미 처리된 요청은 재처리 금지
      if (existingRequest.status && existingRequest.status !== 'pending') {
        return res.status(409).json({ success: false, message: '이미 처리된 요청입니다.' });
      }

      // 요청 상태 업데이트
      const [updatedRequest] = await db.update(matchingRequests)
        .set({
          status,
          response,
          processedAt: new Date(),
          processedBy: (req.user as any)?.id || null
        })
        .where(eq(matchingRequests.id, requestId))
        .returning();

      // 승인된 경우 실제 매칭 처리
      if (status === 'approved') {
        // 반려견에 훈련사 배정
        const pets = await storage.getPets();
        const petIndex = pets.findIndex((p: any) => p.id === existingRequest.petId);
        
        if (petIndex !== -1) {
          pets[petIndex] = {
            ...pets[petIndex],
            assignedTrainerId: existingRequest.trainerId,
            assignedTrainerName: existingRequest.trainerName,
            trainingStatus: 'assigned',
            trainingStartDate: new Date().toISOString(),
            notebookEnabled: true
          };
        }
      }

      console.log('[MatchingSystem] 매칭 요청 처리 완료:', updatedRequest);

      // 보호자에게 매칭 결과 알림
      try {
        if (existingRequest.petOwnerId) {
          const approved = status === 'approved';
          await notificationService.sendNotification({
            userId: existingRequest.petOwnerId,
            type: 'matching',
            title: approved ? '훈련사가 매칭을 수락했습니다' : '매칭 요청이 거절되었습니다',
            message: approved
              ? `${existingRequest.trainerName || '훈련사'}님이 ${existingRequest.petName || '반려견'} 매칭을 수락했습니다.`
              : `${existingRequest.trainerName || '훈련사'}님이 매칭을 거절했습니다.${response ? ' 사유: ' + String(response).slice(0, 80) : ''}`,
            data: { matchingRequestId: updatedRequest.id, status, action: approved ? 'matching_approved' : 'matching_rejected' },
            actionUrl: `/my-trainers`,
          });
        }
      } catch (notifyErr) {
        logServerError('[MatchingSystem] 보호자 결과 알림 전송 실패:', notifyErr, req);
      }

      res.json({
        success: true,
        message: `매칭 요청이 ${status === 'approved' ? '승인' : '거절'}되었습니다.`,
        request: updatedRequest
      });

    } catch (error) {
      logServerError('[MatchingSystem] 요청 처리 실패:', error, req);
      res.status(500).json({ 
        success: false, 
        message: '매칭 요청 처리 중 오류가 발생했습니다.' 
      });
    }
  });

  // 사용자별 매칭 현황 조회
  app.get("/api/matching/user-status/:userId", requireAuth(), async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const sessionUser = getSessionUser(req)!;
      if (sessionUser.role !== 'admin' && sessionUser.id !== userId) {
        return res.status(403).json({ success: false, message: '본인 정보만 조회할 수 있습니다.' });
      }

      console.log('[MatchingSystem] 사용자 매칭 현황 조회:', userId);

      const pets = await storage.getPets();
      const trainers = await storage.getTrainers();
      
      // 사용자의 반려견들
      const userPets = pets.filter((p: any) => p.ownerId === userId);
      
      // 매칭된 반려견-훈련사 정보
      const matchedPets = userPets.map((pet: any) => {
        const trainer = pet.assignedTrainerId 
          ? trainers.find((t: any) => t.id === pet.assignedTrainerId)
          : null;
        
        return {
          pet: {
            id: pet.id,
            name: pet.name,
            species: pet.species,
            breed: pet.breed
          },
          trainer: trainer ? {
            id: trainer.id,
            name: trainer.name,
            specialization: trainer.specialization,
            rating: trainer.rating || 4.5
          } : null,
          trainingStatus: pet.trainingStatus || 'not_assigned',
          trainingStartDate: pet.trainingStartDate,
          notebookEnabled: pet.notebookEnabled || false
        };
      });

      res.json({
        success: true,
        data: {
          totalPets: userPets.length,
          matchedPets: matchedPets.filter((mp: any) => mp.trainer).length,
          unmatchedPets: matchedPets.filter((mp: any) => !mp.trainer).length,
          petTrainerPairs: matchedPets
        }
      });

    } catch (error) {
      logServerError('[MatchingSystem] 사용자 현황 조회 실패:', error, req);
      res.status(500).json({ 
        success: false, 
        message: '매칭 현황 조회 중 오류가 발생했습니다.' 
      });
    }
  });

  // 모든 매칭 요청 조회 (관리자용)
  app.get("/api/matching/all-requests", requireAuth('admin'), async (req, res) => {
    try {
      console.log('[MatchingSystem] 모든 매칭 요청 조회');

      const requests = await db.select()
        .from(matchingRequests)
        .orderBy(desc(matchingRequests.createdAt));

      res.json({
        success: true,
        requests
      });

    } catch (error) {
      logServerError('[MatchingSystem] 전체 요청 조회 실패:', error, req);
      res.status(500).json({ 
        success: false, 
        message: '매칭 요청 조회 중 오류가 발생했습니다.' 
      });
    }
  });
}
