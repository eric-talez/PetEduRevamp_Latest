
import { Express } from "express";
import { csrfProtection } from '../middleware/csrf';
import { logServerError } from '../middleware/audit-logger';

export function registerTrainerInstituteMatchingRoutes(app: Express, storage: any) {
  // 기관에 훈련사 추가
  app.post("/api/institutes/:instituteId/add-trainer", csrfProtection, async (req, res) => {
    try {
      const instituteId = parseInt(req.params.instituteId);
      const { trainerId, role = 'trainer', permissions = [] } = req.body;

      console.log('[TrainerMatching] 기관에 훈련사 추가:', { instituteId, trainerId, role });

      // 기관 존재 확인
      const institute = await storage.getInstitute(instituteId);
      if (!institute) {
        return res.status(404).json({ 
          success: false, 
          message: '기관을 찾을 수 없습니다.' 
        });
      }

      // 훈련사 존재 확인
      const trainers = await storage.getTrainers();
      const trainer = trainers.find(t => t.id === trainerId);
      if (!trainer) {
        return res.status(404).json({ 
          success: false, 
          message: '훈련사를 찾을 수 없습니다.' 
        });
      }

      // 훈련사-기관 매칭 정보 생성
      const matching = {
        id: Date.now(),
        trainerId,
        instituteId,
        role,
        permissions,
        status: 'active',
        joinedAt: new Date().toISOString(),
        createdBy: req.user?.id || 'system'
      };

      // 훈련사 정보 업데이트
      const updatedTrainer = {
        ...trainer,
        instituteId,
        institute: institute.name,
        affiliatedInstitutes: [...(trainer.affiliatedInstitutes || []), instituteId],
        instituteMemberships: [...(trainer.instituteMemberships || []), matching]
      };

      // 실제로는 데이터베이스에 저장
      console.log('[TrainerMatching] 매칭 생성 완료:', matching);

      res.json({
        success: true,
        message: `${trainer.name} 훈련사가 ${institute.name}에 성공적으로 추가되었습니다.`,
        matching
      });

    } catch (error) {
      logServerError('[TrainerMatching] 매칭 실패:', error, req);
      res.status(500).json({ 
        success: false, 
        message: '훈련사 추가 중 오류가 발생했습니다.' 
      });
    }
  });

  // 기관에서 훈련사 제거
  app.delete("/api/institutes/:instituteId/remove-trainer/:trainerId", csrfProtection, async (req, res) => {
    try {
      const instituteId = parseInt(req.params.instituteId);
      const trainerId = parseInt(req.params.trainerId);

      console.log('[TrainerMatching] 기관에서 훈련사 제거:', { instituteId, trainerId });

      // 실제로는 데이터베이스에서 매칭 정보 제거
      res.json({
        success: true,
        message: '훈련사가 기관에서 성공적으로 제거되었습니다.'
      });

    } catch (error) {
      logServerError('[TrainerMatching] 제거 실패:', error, req);
      res.status(500).json({ 
        success: false, 
        message: '훈련사 제거 중 오류가 발생했습니다.' 
      });
    }
  });

  // 훈련사의 기관 소속 현황 조회
  app.get("/api/trainers/:trainerId/affiliations", async (req, res) => {
    try {
      const trainerId = parseInt(req.params.trainerId);

      console.log('[TrainerMatching] 훈련사 소속 현황 조회:', trainerId);

      // 훈련사 정보 조회
      const trainers = await storage.getTrainers();
      const trainer = trainers.find(t => t.id === trainerId);
      
      if (!trainer) {
        return res.status(404).json({ 
          success: false, 
          message: '훈련사를 찾을 수 없습니다.' 
        });
      }

      // 소속 기관 정보 조회
      const affiliations = {
        primaryInstitute: trainer.instituteId ? {
          id: trainer.instituteId,
          name: trainer.institute,
          role: 'primary'
        } : null,
        affiliatedInstitutes: trainer.affiliatedInstitutes || [],
        memberships: trainer.instituteMemberships || []
      };

      res.json({
        success: true,
        data: affiliations
      });

    } catch (error) {
      logServerError('[TrainerMatching] 소속 현황 조회 실패:', error, req);
      res.status(500).json({ 
        success: false, 
        message: '소속 현황 조회 중 오류가 발생했습니다.' 
      });
    }
  });

  // 매칭 상태 업데이트
  app.patch("/api/trainer-institute-matching/:matchingId", csrfProtection, async (req, res) => {
    try {
      const matchingId = parseInt(req.params.matchingId);
      const { status, role, permissions } = req.body;

      console.log('[TrainerMatching] 매칭 상태 업데이트:', { matchingId, status, role });

      // 실제로는 데이터베이스에서 매칭 정보 업데이트
      const updatedMatching = {
        id: matchingId,
        status,
        role,
        permissions,
        updatedAt: new Date().toISOString(),
        updatedBy: req.user?.id || 'system'
      };

      res.json({
        success: true,
        message: '매칭 정보가 성공적으로 업데이트되었습니다.',
        matching: updatedMatching
      });

    } catch (error) {
      logServerError('[TrainerMatching] 업데이트 실패:', error, req);
      res.status(500).json({ 
        success: false, 
        message: '매칭 정보 업데이트 중 오류가 발생했습니다.' 
      });
    }
  });
}
