import { type Express, Request as ExpressRequest, Response } from "express";
import { db } from "../db";
import { menuConfigurations } from "@shared/schema";
import { eq, isNull, and } from "drizzle-orm";
import { DEFAULT_MENU_CONFIGURATION } from "@shared/menu-config";
import { logServerError } from '../middleware/audit-logger';

// Express 타입 확장 및 세션 타입 확장
declare module 'express-session' {
  interface SessionData {
    user?: {
      id: number;
      username: string;
      role: string;
      [key: string]: any;
    };
  }
}

// 세션 포함된 요청 타입 정의
interface Request extends ExpressRequest {
  session: any;
  isAuthenticated(): boolean;
  user?: {
    id: number;
    username: string;
    role: string;
    [key: string]: any;
  };
}

export function registerMenuRoutes(app: Express) {
  // 메뉴 설정 가져오기 - 권한별 필터링
  app.get('/api/menu-configuration', async (req: Request, res: Response) => {
    try {
      const userRole = req.user?.role || 'pet-owner';
      
      // 역할에 따른 메뉴 필터링 (간소화)
      const filteredItems = DEFAULT_MENU_CONFIGURATION.items.filter(item => 
        item.isPublic || item.roles.includes(userRole as any)
      );
      
      const filteredGroups = DEFAULT_MENU_CONFIGURATION.groups.filter(group => 
        group.isPublic || group.roles.includes(userRole as any)
      );
      
      // 카테고리별로 정렬
      const sortedItems = filteredItems.sort((a, b) => {
        if (a.category === b.category) {
          return a.orderIndex - b.orderIndex;
        }
        const categoryOrder = ['main', 'learning', 'management', 'tools', 'admin'];
        return categoryOrder.indexOf(a.category) - categoryOrder.indexOf(b.category);
      });
      
      return res.json({
        groups: filteredGroups,
        items: sortedItems,
        lastUpdated: DEFAULT_MENU_CONFIGURATION.lastUpdated,
        updatedBy: DEFAULT_MENU_CONFIGURATION.updatedBy
      });
    } catch (error) {
      logServerError('❌ 메뉴 설정 조회 오류:', error, req);
      res.status(500).json({ error: '메뉴 설정을 가져오는데 실패했습니다.' });
    }
  });
  
  // 메뉴 설정 저장
  app.post('/api/menu-configuration', async (req: Request, res: Response) => {
    try {
      // 관리자 권한 확인
      if (!req.isAuthenticated() || req.user?.role !== 'admin') {
        return res.status(403).json({ error: '권한이 없습니다.' });
      }
      
      const { configuration, instituteId, isActive } = req.body;
      
      // 임시 성공 응답 반환
      return res.json({ 
        success: true, 
        message: '메뉴 설정이 저장되었습니다 (임시 응답)',
        data: {
          configuration,
          instituteId,
          isActive,
          updatedAt: new Date()
        }
      });
    } catch (error) {
      logServerError('메뉴 설정 저장 오류:', error, req);
      res.status(500).json({ error: '메뉴 설정 저장에 실패했습니다.' });
    }
  });
  
  // 기관별 메뉴 설정 목록 조회
  app.get('/api/menu-configurations/institutes', async (req: Request, res: Response) => {
    try {
      // 관리자 권한 확인
      if (!req.isAuthenticated() || req.user?.role !== 'admin') {
        return res.status(403).json({ error: '권한이 없습니다.' });
      }
      
      // 임시 빈 배열 응답 반환
      return res.json([]);
    } catch (error) {
      logServerError('메뉴 설정 목록 조회 오류:', error, req);
      res.status(500).json({ error: '메뉴 설정 목록을 가져오는데 실패했습니다.' });
    }
  });
  
  // 메뉴 설정 삭제 (비활성화)
  app.delete('/api/menu-configuration/:id', async (req: Request, res: Response) => {
    try {
      // 관리자 권한 확인
      if (!req.isAuthenticated() || req.user?.role !== 'admin') {
        return res.status(403).json({ error: '권한이 없습니다.' });
      }
      
      const id = parseInt(req.params.id);
      
      // 임시 성공 응답 반환
      return res.json({ success: true });
    } catch (error) {
      logServerError('메뉴 설정 삭제 오류:', error, req);
      res.status(500).json({ error: '메뉴 설정 삭제에 실패했습니다.' });
    }
  });
}