
import { Express } from "express";
import { csrfProtection } from '../middleware/csrf';
import { db } from '../db';
import { matchingRequests } from '../../shared/schema';
import { eq, desc } from 'drizzle-orm';
import { logServerError } from '../middleware/audit-logger';

export function registerMatchingSystemRoutes(app: Express, storage: any) {
  // 전체 매칭 현황 조회 (관리자용)
  app.get("/api/matching/overview", async (req, res) => {
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
  app.post("/api/matching/request-trainer", csrfProtection, async (req, res) => {
    try {
      const { petId, trainerId, message, preferredDate } = req.body;
      const userId = (req.user as any)?.id || req.session?.user?.id;

      console.log('[MatchingSystem] 훈련사 매칭 요청:', { petId, trainerId, userId });

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: '로그인이 필요합니다.'
        });
      }

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
  app.get("/api/matching/trainer-requests/:trainerId", async (req, res) => {
    try {
      const trainerId = parseInt(req.params.trainerId);

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
  app.patch("/api/matching/requests/:requestId", csrfProtection, async (req, res) => {
    try {
      const requestId = parseInt(req.params.requestId);
      const { status, response } = req.body; // 'approved' 또는 'rejected'

      console.log('[MatchingSystem] 매칭 요청 처리:', { requestId, status });

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
  app.get("/api/matching/user-status/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);

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
  app.get("/api/matching/all-requests", async (req, res) => {
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
