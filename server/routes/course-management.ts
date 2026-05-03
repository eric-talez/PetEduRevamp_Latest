import type { Express } from "express";
import { storage } from "../storage";
import { logServerError } from '../middleware/audit-logger';

export function registerCourseManagementRoutes(app: Express) {
  // 강의 구매
  app.post("/api/courses/:courseId/purchase", async (req, res) => {
    try {
      const courseId = parseInt(req.params.courseId);
      const { userId, paymentMethod, amount } = req.body;
      
      console.log(`[Course] 강의 구매 요청: courseId=${courseId}, userId=${userId}`);
      
      const result = await storage.purchaseCourse(userId, courseId, amount, paymentMethod);
      
      res.json({
        success: true,
        message: "강의 구매가 완료되었습니다.",
        data: result
      });
    } catch (error) {
      logServerError('[Course] 강의 구매 오류:', error, req);
      res.status(500).json({
        success: false,
        message: "강의 구매 중 오류가 발생했습니다."
      });
    }
  });

  // 강의 진행 상황 업데이트
  app.put("/api/courses/:courseId/progress", async (req, res) => {
    try {
      const courseId = parseInt(req.params.courseId);
      const { userId, ...progressData } = req.body;
      
      console.log(`[Course] 진행 상황 업데이트: courseId=${courseId}, userId=${userId}`);
      
      const result = await storage.updateCourseProgress(userId, courseId, progressData);
      
      res.json({
        success: true,
        message: "진행 상황이 업데이트되었습니다.",
        data: result
      });
    } catch (error) {
      logServerError('[Course] 진행 상황 업데이트 오류:', error, req);
      res.status(500).json({
        success: false,
        message: "진행 상황 업데이트 중 오류가 발생했습니다."
      });
    }
  });

  // 진행 상황 공유
  app.post("/api/courses/:courseId/share-progress", async (req, res) => {
    try {
      const courseId = parseInt(req.params.courseId);
      const { userId, shareType, trainerId, instituteId } = req.body;
      
      console.log(`[Course] 진행 상황 공유: courseId=${courseId}, shareType=${shareType}`);
      
      const result = await storage.shareProgress(userId, courseId, shareType, trainerId, instituteId);
      
      res.json({
        success: true,
        message: "진행 상황이 공유되었습니다.",
        data: result
      });
    } catch (error) {
      logServerError('[Course] 진행 상황 공유 오류:', error, req);
      res.status(500).json({
        success: false,
        message: "진행 상황 공유 중 오류가 발생했습니다."
      });
    }
  });

  // 사용자별 구매한 강의 목록 조회
  app.get("/api/courses/my-purchases/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      const purchases = await storage.getUserCoursePurchases(userId);
      const progress = await storage.getUserCourseProgress(userId);
      
      // 강의 정보와 함께 결합
      const coursesWithProgress = purchases.map(purchase => {
        const courseProgress = progress.find(p => p.courseId === purchase.courseId);
        const course = storage.courses.find(c => c.id === purchase.courseId);
        
        return {
          ...purchase,
          course,
          progress: courseProgress
        };
      });
      
      res.json({
        success: true,
        data: coursesWithProgress
      });
    } catch (error) {
      logServerError('[Course] 구매 강의 목록 조회 오류:', error, req);
      res.status(500).json({
        success: false,
        message: "구매 강의 목록 조회 중 오류가 발생했습니다."
      });
    }
  });

  // 훈련사별 공유된 진행 상황 조회
  app.get("/api/courses/shared-progress/trainer/:trainerId", async (req, res) => {
    try {
      const trainerId = parseInt(req.params.trainerId);
      
      const sharedProgress = await storage.getSharedProgressByTrainer(trainerId);
      
      res.json({
        success: true,
        data: sharedProgress
      });
    } catch (error) {
      logServerError('[Course] 훈련사별 공유 진행 상황 조회 오류:', error, req);
      res.status(500).json({
        success: false,
        message: "공유 진행 상황 조회 중 오류가 발생했습니다."
      });
    }
  });

  // 기관별 공유된 진행 상황 조회
  app.get("/api/courses/shared-progress/institute/:instituteId", async (req, res) => {
    try {
      const instituteId = parseInt(req.params.instituteId);
      
      const sharedProgress = await storage.getSharedProgressByInstitute(instituteId);
      
      res.json({
        success: true,
        data: sharedProgress
      });
    } catch (error) {
      logServerError('[Course] 기관별 공유 진행 상황 조회 오류:', error, req);
      res.status(500).json({
        success: false,
        message: "공유 진행 상황 조회 중 오류가 발생했습니다."
      });
    }
  });

  // 강의 세션 기록 저장
  app.post("/api/courses/:courseId/session", async (req, res) => {
    try {
      const courseId = parseInt(req.params.courseId);
      const { userId, ...sessionData } = req.body;
      
      const result = await storage.recordLessonSession(userId, courseId, sessionData);
      
      res.json({
        success: true,
        message: "강의 세션이 기록되었습니다.",
        data: result
      });
    } catch (error) {
      logServerError('[Course] 강의 세션 기록 오류:', error, req);
      res.status(500).json({
        success: false,
        message: "강의 세션 기록 중 오류가 발생했습니다."
      });
    }
  });
}

export default registerCourseManagementRoutes;