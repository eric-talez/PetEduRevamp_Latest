import { Express } from "express";
import type { IStorage } from "../storage";
import { logServerError } from '../middleware/audit-logger';

export function registerTrainerRoutes(app: Express, storage: IStorage) {
  // 훈련사 목록 조회
  app.get("/api/trainers", async (req, res) => {
    try {
      const trainers = await storage.getTrainers();
      res.json(trainers || []);
    } catch (error) {
      logServerError('Error fetching trainers:', error, req);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // 훈련사 상세 조회
  app.get("/api/trainers/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const trainers = await storage.getTrainers();
      const trainer = trainers.find(t => t.id === id);

      if (!trainer) {
        return res.status(404).json({ message: 'Trainer not found' });
      }

      res.json(trainer);
    } catch (error) {
      logServerError('Error fetching trainer:', error, req);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // 훈련사 수익 조회
  app.get("/api/trainers/:id/earnings", async (req, res) => {
    try {
      const trainerId = parseInt(req.params.id);
      const earnings = {
        totalEarnings: 1500000,
        monthlyEarnings: 300000,
        pendingPayments: 50000,
        commissionRate: 0.15
      };

      res.json(earnings);
    } catch (error) {
      logServerError('Error fetching trainer earnings:', error, req);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // 훈련사 상담 예약
  app.post("/api/trainers/:id/consultation", async (req, res) => {
    try {
      const trainerId = parseInt(req.params.id);
      const consultationData = {
        id: Date.now(),
        trainerId,
        ...req.body,
        status: 'pending',
        createdAt: new Date().toISOString()
      };

      // 실제로는 데이터베이스에 저장
      console.log('New consultation request:', consultationData);

      res.status(201).json({
        success: true,
        consultation: consultationData,
        message: '상담 예약이 완료되었습니다.'
      });
    } catch (error) {
      logServerError('Error creating consultation:', error, req);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
}