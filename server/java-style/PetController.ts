/**
 * Java Spring Boot 스타일의 PetController
 * Node.js/TypeScript로 구현된 Spring Boot 패턴
 */

import { Request, Response } from 'express';
import { petService } from './PetService';
import { createPetSchema } from '@shared/schema';
import { z } from 'zod';
import { logServerError } from '../middleware/audit-logger';

export class PetController {

  /**
   * @GetMapping("/api/spring/pets")
   * 모든 반려동물 조회 (관리자용)
   */
  async findAll(req: Request, res: Response): Promise<void> {
    try {
      console.log('[PetController] GET /api/spring/pets');
      const pets = await petService.findAll();
      res.json({
        success: true,
        data: pets,
        message: 'Spring Boot 스타일로 반려동물 목록을 조회했습니다.',
        timestamp: new Date()
      });
    } catch (error) {
      logServerError('[PetController] findAll 오류:', error, req);
      res.status(500).json({
        success: false,
        message: '반려동물 목록 조회 중 오류가 발생했습니다.',
        error: error instanceof Error ? error.message : '알 수 없는 오류'
      });
    }
  }

  /**
   * @GetMapping("/api/spring/pets/{id}")
   * ID로 반려동물 조회
   */
  async findById(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      console.log(`[PetController] GET /api/spring/pets/${id}`);
      
      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          message: '유효하지 않은 반려동물 ID입니다.'
        });
        return;
      }

      const pet = await petService.findById(id);
      
      if (!pet) {
        res.status(404).json({
          success: false,
          message: '반려동물을 찾을 수 없습니다.'
        });
        return;
      }

      res.json({
        success: true,
        data: pet,
        message: 'Spring Boot 스타일로 반려동물을 조회했습니다.',
        timestamp: new Date()
      });
    } catch (error) {
      logServerError('[PetController] findById 오류:', error, req);
      res.status(500).json({
        success: false,
        message: '반려동물 조회 중 오류가 발생했습니다.',
        error: error instanceof Error ? error.message : '알 수 없는 오류'
      });
    }
  }

  /**
   * @GetMapping("/api/spring/pets/user/{userId}")
   * 사용자의 반려동물 조회
   */
  async findByUserId(req: Request, res: Response): Promise<void> {
    try {
      const userId = parseInt(req.params.userId);
      console.log(`[PetController] GET /api/spring/pets/user/${userId}`);
      
      if (isNaN(userId)) {
        res.status(400).json({
          success: false,
          message: '유효하지 않은 사용자 ID입니다.'
        });
        return;
      }

      const pets = await petService.findByUserId(userId);
      
      res.json({
        success: true,
        data: pets,
        message: 'Spring Boot 스타일로 사용자의 반려동물을 조회했습니다.',
        timestamp: new Date()
      });
    } catch (error) {
      logServerError('[PetController] findByUserId 오류:', error, req);
      res.status(500).json({
        success: false,
        message: '사용자 반려동물 조회 중 오류가 발생했습니다.',
        error: error instanceof Error ? error.message : '알 수 없는 오류'
      });
    }
  }

  /**
   * @PostMapping("/api/spring/pets")
   * 반려동물 생성
   */
  async save(req: Request, res: Response): Promise<void> {
    try {
      console.log('[PetController] POST /api/spring/pets', req.body);
      
      // 요청 데이터 검증
      const petData = createPetSchema.parse(req.body);
      
      const newPet = await petService.save(petData);
      
      res.status(201).json({
        success: true,
        data: newPet,
        message: 'Spring Boot 스타일로 반려동물을 생성했습니다.',
        timestamp: new Date()
      });
    } catch (error) {
      logServerError('[PetController] save 오류:', error, req);
      
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
        message: '반려동물 생성 중 오류가 발생했습니다.',
        error: error instanceof Error ? error.message : '알 수 없는 오류'
      });
    }
  }
}

// 싱글톤 패턴 (Spring Boot의 @RestController Bean과 유사)
export const petController = new PetController();