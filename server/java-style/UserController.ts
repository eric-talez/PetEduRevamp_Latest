/**
 * Java Spring Boot 스타일의 UserController
 * Node.js/TypeScript로 구현된 Spring Boot 패턴
 */

import { Request, Response } from 'express';
import { userService } from './UserService';
import { createUserSchema } from '@shared/schema';
import { z } from 'zod';
import { logServerError } from '../middleware/audit-logger';

export class UserController {

  /**
   * @GetMapping("/api/spring/users")
   * 모든 사용자 조회
   */
  async findAll(req: Request, res: Response): Promise<void> {
    try {
      console.log('[UserController] GET /api/spring/users');
      const users = await userService.findAll();
      res.json({
        success: true,
        data: users,
        message: 'Spring Boot 스타일로 사용자 목록을 조회했습니다.',
        timestamp: new Date()
      });
    } catch (error) {
      logServerError('[UserController] findAll 오류:', error, req);
      res.status(500).json({
        success: false,
        message: '사용자 목록 조회 중 오류가 발생했습니다.',
        error: error instanceof Error ? error.message : '알 수 없는 오류'
      });
    }
  }

  /**
   * @GetMapping("/api/spring/users/{id}")
   * ID로 사용자 조회
   */
  async findById(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      console.log(`[UserController] GET /api/spring/users/${id}`);
      
      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          message: '유효하지 않은 사용자 ID입니다.'
        });
        return;
      }

      const user = await userService.findById(id);
      
      if (!user) {
        res.status(404).json({
          success: false,
          message: '사용자를 찾을 수 없습니다.'
        });
        return;
      }

      res.json({
        success: true,
        data: user,
        message: 'Spring Boot 스타일로 사용자를 조회했습니다.',
        timestamp: new Date()
      });
    } catch (error) {
      logServerError('[UserController] findById 오류:', error, req);
      res.status(500).json({
        success: false,
        message: '사용자 조회 중 오류가 발생했습니다.',
        error: error instanceof Error ? error.message : '알 수 없는 오류'
      });
    }
  }

  /**
   * @PostMapping("/api/spring/users")
   * 사용자 생성
   */
  async save(req: Request, res: Response): Promise<void> {
    try {
      console.log('[UserController] POST /api/spring/users', req.body);
      
      // 요청 데이터 검증
      const userData = createUserSchema.parse(req.body);
      
      const newUser = await userService.save(userData);
      
      res.status(201).json({
        success: true,
        data: newUser,
        message: 'Spring Boot 스타일로 사용자를 생성했습니다.',
        timestamp: new Date()
      });
    } catch (error) {
      logServerError('[UserController] save 오류:', error, req);
      
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
        message: '사용자 생성 중 오류가 발생했습니다.',
        error: error instanceof Error ? error.message : '알 수 없는 오류'
      });
    }
  }

  /**
   * @GetMapping("/api/spring/users/username/{username}")
   * 사용자명으로 사용자 조회
   */
  async findByUsername(req: Request, res: Response): Promise<void> {
    try {
      const username = req.params.username;
      console.log(`[UserController] GET /api/spring/users/username/${username}`);
      
      const user = await userService.findByUsername(username);
      
      if (!user) {
        res.status(404).json({
          success: false,
          message: '사용자를 찾을 수 없습니다.'
        });
        return;
      }

      res.json({
        success: true,
        data: user,
        message: 'Spring Boot 스타일로 사용자를 조회했습니다.',
        timestamp: new Date()
      });
    } catch (error) {
      logServerError('[UserController] findByUsername 오류:', error, req);
      res.status(500).json({
        success: false,
        message: '사용자 조회 중 오류가 발생했습니다.',
        error: error instanceof Error ? error.message : '알 수 없는 오류'
      });
    }
  }

  /**
   * @GetMapping("/actuator/health")
   * 헬스 체크
   */
  health(req: Request, res: Response): void {
    console.log('[UserController] GET /actuator/health');
    const healthStatus = userService.health();
    res.json(healthStatus);
  }
}

// 싱글톤 패턴 (Spring Boot의 @RestController Bean과 유사)
export const userController = new UserController();