/**
 * Java Spring Boot 스타일의 CourseController
 * Node.js/TypeScript로 구현된 Spring Boot 패턴
 */

import { Request, Response } from 'express';
import { courseService } from './CourseService';
import { createCourseSchema } from '@shared/schema';
import { z } from 'zod';
import { logServerError } from '../middleware/audit-logger';

export class CourseController {

  /**
   * @GetMapping("/api/spring/courses")
   * 모든 강좌 조회
   */
  async findAll(req: Request, res: Response): Promise<void> {
    try {
      console.log('[CourseController] GET /api/spring/courses');
      const courses = await courseService.findAll();
      res.json({
        success: true,
        data: courses,
        message: 'Spring Boot 스타일로 강좌 목록을 조회했습니다.',
        timestamp: new Date()
      });
    } catch (error) {
      logServerError('[CourseController] findAll 오류:', error, req);
      res.status(500).json({
        success: false,
        message: '강좌 목록 조회 중 오류가 발생했습니다.',
        error: error instanceof Error ? error.message : '알 수 없는 오류'
      });
    }
  }

  /**
   * @GetMapping("/api/spring/courses/{id}")
   * ID로 강좌 조회
   */
  async findById(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      console.log(`[CourseController] GET /api/spring/courses/${id}`);
      
      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          message: '유효하지 않은 강좌 ID입니다.'
        });
        return;
      }

      const course = await courseService.findById(id);
      
      if (!course) {
        res.status(404).json({
          success: false,
          message: '강좌를 찾을 수 없습니다.'
        });
        return;
      }

      res.json({
        success: true,
        data: course,
        message: 'Spring Boot 스타일로 강좌를 조회했습니다.',
        timestamp: new Date()
      });
    } catch (error) {
      logServerError('[CourseController] findById 오류:', error, req);
      res.status(500).json({
        success: false,
        message: '강좌 조회 중 오류가 발생했습니다.',
        error: error instanceof Error ? error.message : '알 수 없는 오류'
      });
    }
  }

  /**
   * @PostMapping("/api/spring/courses")
   * 강좌 생성
   */
  async save(req: Request, res: Response): Promise<void> {
    try {
      console.log('[CourseController] POST /api/spring/courses', req.body);
      
      // 요청 데이터 검증
      const courseData = createCourseSchema.parse(req.body);
      
      const newCourse = await courseService.save(courseData);
      
      res.status(201).json({
        success: true,
        data: newCourse,
        message: 'Spring Boot 스타일로 강좌를 생성했습니다.',
        timestamp: new Date()
      });
    } catch (error) {
      logServerError('[CourseController] save 오류:', error, req);
      
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          message: '입력 데이터가 유효하지 않습니다.',
          errors: error.errors
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: '강좌 생성 중 오류가 발생했습니다.',
        error: error instanceof Error ? error.message : '알 수 없는 오류'
      });
    }
  }

  /**
   * @GetMapping("/api/spring/courses/user/{userId}")
   * 사용자의 강좌 조회
   */
  async findByUserId(req: Request, res: Response): Promise<void> {
    try {
      const userId = parseInt(req.params.userId);
      console.log(`[CourseController] GET /api/spring/courses/user/${userId}`);
      
      if (isNaN(userId)) {
        res.status(400).json({
          success: false,
          message: '유효하지 않은 사용자 ID입니다.'
        });
        return;
      }

      const courses = await courseService.findByUserId(userId);
      
      res.json({
        success: true,
        data: courses,
        message: 'Spring Boot 스타일로 사용자의 강좌를 조회했습니다.',
        timestamp: new Date()
      });
    } catch (error) {
      logServerError('[CourseController] findByUserId 오류:', error, req);
      res.status(500).json({
        success: false,
        message: '사용자 강좌 조회 중 오류가 발생했습니다.',
        error: error instanceof Error ? error.message : '알 수 없는 오류'
      });
    }
  }

  /**
   * @PostMapping("/api/spring/courses/{courseId}/enroll")
   * 강좌 등록
   */
  async enrollUser(req: Request, res: Response): Promise<void> {
    try {
      const courseId = parseInt(req.params.courseId);
      const { userId } = req.body;
      
      console.log(`[CourseController] POST /api/spring/courses/${courseId}/enroll`, { userId });
      
      if (isNaN(courseId) || !userId) {
        res.status(400).json({
          success: false,
          message: '유효하지 않은 강좌 ID 또는 사용자 ID입니다.'
        });
        return;
      }

      const enrollment = await courseService.enrollUser(userId, courseId);
      
      res.status(201).json({
        success: true,
        data: enrollment,
        message: 'Spring Boot 스타일로 강좌에 등록했습니다.',
        timestamp: new Date()
      });
    } catch (error) {
      logServerError('[CourseController] enrollUser 오류:', error, req);
      res.status(500).json({
        success: false,
        message: '강좌 등록 중 오류가 발생했습니다.',
        error: error instanceof Error ? error.message : '알 수 없는 오류'
      });
    }
  }
}

// 싱글톤 패턴 (Spring Boot의 @RestController Bean과 유사)
export const courseController = new CourseController();