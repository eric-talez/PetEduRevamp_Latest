import type { Express } from 'express';
import type { IStorage } from '../storage';
import { logServerError } from '../middleware/audit-logger';

export function registerHealthRoutes(app: Express, storage: IStorage) {
  // 반려동물 예방접종 기록 조회
  app.get("/api/pets/:petId/vaccinations", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const petId = parseInt(req.params.petId);
      const vaccinations = await storage.getVaccinationsByPetId(petId);

      res.json(vaccinations);
    } catch (error) {
      logServerError('Error fetching vaccinations:', error, req);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // 예방접종 기록 추가
  app.post("/api/pets/:petId/vaccinations", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const petId = parseInt(req.params.petId);
      const vaccinationData = {
        ...req.body,
        petId,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const vaccination = await storage.createVaccination(vaccinationData);
      res.status(201).json(vaccination);
    } catch (error) {
      logServerError('Error creating vaccination:', error, req);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // 반려동물 건강검진 기록 조회
  app.get("/api/pets/:petId/checkups", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const petId = parseInt(req.params.petId);
      const checkups = await storage.getCheckupsByPetId(petId);

      res.json(checkups);
    } catch (error) {
      logServerError('Error fetching checkups:', error, req);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // 건강검진 기록 추가
  app.post("/api/pets/:petId/checkups", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const petId = parseInt(req.params.petId);
      const checkupData = {
        ...req.body,
        petId,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const checkup = await storage.createCheckup(checkupData);
      res.status(201).json(checkup);
    } catch (error) {
      logServerError('Error creating checkup:', error, req);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // 반려동물 체중 기록 조회
  app.get("/api/pets/:petId/weight-records", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const petId = parseInt(req.params.petId);
      const weightRecords = await storage.getWeightRecordsByPetId(petId);

      res.json(weightRecords);
    } catch (error) {
      logServerError('Error fetching weight records:', error, req);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // 체중 기록 추가
  app.post("/api/pets/:petId/weight-records", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const petId = parseInt(req.params.petId);
      const weightData = {
        ...req.body,
        petId,
        date: req.body.date || new Date().toISOString().split('T')[0]
      };

      const weightRecord = await storage.createWeightRecord(weightData);
      res.status(201).json(weightRecord);
    } catch (error) {
      logServerError('Error creating weight record:', error, req);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // 반려동물 약물 기록 조회
  app.get("/api/pets/:petId/medications", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const petId = parseInt(req.params.petId);
      const medications = await storage.getMedicationsByPetId(petId);

      res.json(medications);
    } catch (error) {
      logServerError('Error fetching medications:', error, req);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // 약물 기록 추가
  app.post("/api/pets/:petId/medications", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const petId = parseInt(req.params.petId);
      const medicationData = {
        ...req.body,
        petId,
        startDate: req.body.startDate || new Date().toISOString().split('T')[0]
      };

      const medication = await storage.createMedication(medicationData);
      res.status(201).json(medication);
    } catch (error) {
      logServerError('Error creating medication:', error, req);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // 반려동물 영양 계획 조회
  app.get("/api/pets/:petId/nutrition-plans", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const petId = parseInt(req.params.petId);
      const nutritionPlans = await storage.getNutritionPlansByPetId(petId);

      res.json(nutritionPlans);
    } catch (error) {
      logServerError('Error fetching nutrition plans:', error, req);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // 영양 계획 추가
  app.post("/api/pets/:petId/nutrition-plans", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const petId = parseInt(req.params.petId);
      const nutritionData = {
        ...req.body,
        petId,
        createdDate: req.body.createdDate || new Date().toISOString().split('T')[0]
      };

      const nutritionPlan = await storage.createNutritionPlan(nutritionData);
      res.status(201).json(nutritionPlan);
    } catch (error) {
      logServerError('Error creating nutrition plan:', error, req);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // 반려동물 건강 리마인더 조회
  app.get("/api/pets/:petId/health-reminders", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const petId = parseInt(req.params.petId);
      const reminders = await storage.getHealthRemindersByPetId(petId);

      res.json(reminders);
    } catch (error) {
      logServerError('Error fetching health reminders:', error, req);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // 건강 리마인더 추가
  app.post("/api/pets/:petId/health-reminders", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const petId = parseInt(req.params.petId);
      const reminderData = {
        ...req.body,
        petId,
        isCompleted: false
      };

      const reminder = await storage.createHealthReminder(reminderData);
      res.status(201).json(reminder);
    } catch (error) {
      logServerError('Error creating health reminder:', error, req);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // 건강 대시보드 데이터 조회
  app.get("/api/pets/:petId/health-dashboard", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const petId = parseInt(req.params.petId);

      // 모든 건강 관련 데이터를 한 번에 조회
      const [
        vaccinations,
        checkups,
        weightRecords,
        medications,
        nutritionPlans,
        healthReminders
      ] = await Promise.all([
        storage.getVaccinationsByPetId(petId),
        storage.getCheckupsByPetId(petId),
        storage.getWeightRecordsByPetId(petId),
        storage.getMedicationsByPetId(petId),
        storage.getNutritionPlansByPetId(petId),
        storage.getHealthRemindersByPetId(petId)
      ]);

      // 건강 상태 요약 계산
      const lastCheckup = checkups.sort((a: any, b: any) => 
        new Date(b.checkupDate).getTime() - new Date(a.checkupDate).getTime()
      )[0];

      const lastWeight = weightRecords.sort((a: any, b: any) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      )[0];

      const activeMedications = medications.filter((med: any) => med.status === 'active');
      const upcomingVaccinations = vaccinations.filter((vac: any) => 
        new Date(vac.nextDueDate) > new Date()
      );

      const healthSummary = {
        lastCheckupDate: lastCheckup?.checkupDate,
        lastWeight: lastWeight?.weight,
        activeMedicationCount: activeMedications.length,
        upcomingVaccinationCount: upcomingVaccinations.length,
        pendingReminderCount: healthReminders.filter((rem: any) => !rem.isCompleted).length
      };

      res.json({
        vaccinations,
        checkups,
        weightRecords,
        medications,
        nutritionPlans,
        healthReminders,
        healthSummary
      });
    } catch (error) {
      logServerError('Error fetching health dashboard:', error, req);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // 건강 통계 조회
  app.get("/api/pets/:petId/health-stats", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const petId = parseInt(req.params.petId);
      const { period = '1year' } = req.query; // 1month, 3months, 6months, 1year

      const endDate = new Date();
      const startDate = new Date();

      switch (period) {
        case '1month':
          startDate.setMonth(endDate.getMonth() - 1);
          break;
        case '3months':
          startDate.setMonth(endDate.getMonth() - 3);
          break;
        case '6months':
          startDate.setMonth(endDate.getMonth() - 6);
          break;
        case '1year':
        default:
          startDate.setFullYear(endDate.getFullYear() - 1);
          break;
      }

      const [weightRecords, checkups, vaccinations] = await Promise.all([
        storage.getWeightRecordsByPetId(petId),
        storage.getCheckupsByPetId(petId),
        storage.getVaccinationsByPetId(petId)
      ]);

      // 기간 내 데이터 필터링
      const filteredWeights = weightRecords.filter((record: any) => {
        const recordDate = new Date(record.date);
        return recordDate >= startDate && recordDate <= endDate;
      });

      const filteredCheckups = checkups.filter((checkup: any) => {
        const checkupDate = new Date(checkup.checkupDate);
        return checkupDate >= startDate && checkupDate <= endDate;
      });

      const filteredVaccinations = vaccinations.filter((vaccination: any) => {
        const vaccinationDate = new Date(vaccination.vaccineDate);
        return vaccinationDate >= startDate && vaccinationDate <= endDate;
      });

      // 체중 변화 계산
      const weightTrend = filteredWeights.length > 1 
        ? filteredWeights[filteredWeights.length - 1].weight - filteredWeights[0].weight
        : 0;

      const stats = {
        period,
        weightRecordsCount: filteredWeights.length,
        checkupsCount: filteredCheckups.length,
        vaccinationsCount: filteredVaccinations.length,
        weightTrend,
        averageWeight: filteredWeights.length > 0 
          ? filteredWeights.reduce((sum: number, record: any) => sum + record.weight, 0) / filteredWeights.length
          : 0,
        weightRecords: filteredWeights,
        checkups: filteredCheckups,
        vaccinations: filteredVaccinations
      };

      res.json(stats);
    } catch (error) {
      logServerError('Error fetching health stats:', error, req);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get('/api/health', async (req, res) => {
    try {
      const { getEmailServiceStatus } = await import('../services/email-service');
      const emailStatus = getEmailServiceStatus();
      const emailOk = !emailStatus.critical;
      const overall = emailOk ? 'ok' : 'degraded';

      const health: any = {
        status: overall,
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
          external: Math.round(process.memoryUsage().external / 1024 / 1024)
        },
        cpu: process.cpuUsage(),
        services: {
          database: 'connected',
          cache: 'active',
          websocket: 'running',
          email: emailOk ? 'ok' : 'critical',
        },
        email: {
          configured: emailStatus.configured,
          fromEmailConfigured: emailStatus.fromEmailConfigured,
          critical: emailStatus.critical,
          consecutiveFailures: emailStatus.consecutiveFailures,
          warnings: emailStatus.warnings,
        },
      };

      // 프로덕션에서는 민감한 정보 제거
      if (process.env.NODE_ENV === 'production') {
        delete health.cpu;
        delete health.memory.external;
      }

      res.status(emailOk ? 200 : 503).json(health);
    } catch (error) {
      res.status(503).json({
        status: 'error',
        timestamp: new Date().toISOString(),
        message: 'Health check failed'
      });
    }
  });

  console.log('[HealthRoutes] Health management routes registered');
}