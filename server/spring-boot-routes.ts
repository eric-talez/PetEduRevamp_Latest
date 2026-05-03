import { Express, Request, Response } from 'express';
import { storage } from './storage';
import path from 'path';
import { logServerError } from './middleware/audit-logger';

/**
 * Spring Boot 스타일의 웹 라우트 (Thymeleaf 템플릿 렌더링)
 */
export function registerSpringBootRoutes(app: Express) {
  console.log('[SpringBoot] Spring Boot 웹 라우트 등록 중...');

  // 홈 페이지 - index.html 템플릿 렌더링
  app.get('/spring', async (req: Request, res: Response) => {
    try {
      const templateData = {
        pageTitle: 'PetEdu Platform - AI 반려동물 교육 플랫폼',
        userCount: 1250,
        petCount: 3400,
        courseCount: 150,
        trainerCount: 85
      };

      // Thymeleaf 템플릿 대신 HTML 파일 직접 렌더링
      const templatePath = path.join(process.cwd(), 'src', 'main', 'resources', 'templates', 'index.html');
      const fs = require('fs');
      
      if (fs.existsSync(templatePath)) {
        let html = fs.readFileSync(templatePath, 'utf8');
        
        // Thymeleaf 변수 치환
        html = html.replace(/th:text="\$\{pageTitle\}"/g, '');
        html = html.replace(/>PetEdu Platform</g, `>${templateData.pageTitle}<`);
        html = html.replace(/th:text="\$\{userCount\}"/g, '');
        html = html.replace(/>0<\/div>/g, `>${templateData.userCount}</div>`);
        html = html.replace(/th:text="\$\{petCount\}"/g, '');
        html = html.replace(/th:text="\$\{courseCount\}"/g, '');
        html = html.replace(/th:text="\$\{trainerCount\}"/g, '');
        
        // 통계 데이터 삽입
        html = html.replace(/(\d+)<\/div>\s*<div class="text-gray-600 mt-2">등록 사용자/g, `${templateData.userCount}</div><div class="text-gray-600 mt-2">등록 사용자`);
        html = html.replace(/(\d+)<\/div>\s*<div class="text-gray-600 mt-2">등록 반려동물/g, `${templateData.petCount}</div><div class="text-gray-600 mt-2">등록 반려동물`);
        html = html.replace(/(\d+)<\/div>\s*<div class="text-gray-600 mt-2">활성 강좌/g, `${templateData.courseCount}</div><div class="text-gray-600 mt-2">활성 강좌`);
        html = html.replace(/(\d+)<\/div>\s*<div class="text-gray-600 mt-2">전문 훈련사/g, `${templateData.trainerCount}</div><div class="text-gray-600 mt-2">전문 훈련사`);
        
        res.setHeader('Content-Type', 'text/html');
        res.send(html);
      } else {
        res.status(404).send('템플릿을 찾을 수 없습니다.');
      }
    } catch (error) {
      logServerError('[SpringBoot] 홈 페이지 렌더링 오류:', error, req);
      res.status(500).send('서버 오류가 발생했습니다.');
    }
  });

  // 대시보드 페이지
  app.get('/spring/dashboard', async (req: Request, res: Response) => {
    try {
      const templateData = {
        pageTitle: '대시보드 - PetEdu Platform'
      };

      const templatePath = path.join(process.cwd(), 'src', 'main', 'resources', 'templates', 'dashboard.html');
      const fs = require('fs');
      
      if (fs.existsSync(templatePath)) {
        let html = fs.readFileSync(templatePath, 'utf8');
        html = html.replace(/th:text="\$\{pageTitle\}"/g, '');
        html = html.replace(/>대시보드 - PetEdu Platform</g, `>${templateData.pageTitle}<`);
        
        res.setHeader('Content-Type', 'text/html');
        res.send(html);
      } else {
        res.status(404).send('템플릿을 찾을 수 없습니다.');
      }
    } catch (error) {
      logServerError('[SpringBoot] 대시보드 페이지 렌더링 오류:', error, req);
      res.status(500).send('서버 오류가 발생했습니다.');
    }
  });

  // 강좌 페이지
  app.get('/spring/courses', async (req: Request, res: Response) => {
    try {
      const templateData = {
        pageTitle: '강좌 - PetEdu Platform'
      };

      const templatePath = path.join(process.cwd(), 'src', 'main', 'resources', 'templates', 'courses.html');
      const fs = require('fs');
      
      if (fs.existsSync(templatePath)) {
        let html = fs.readFileSync(templatePath, 'utf8');
        html = html.replace(/th:text="\$\{pageTitle\}"/g, '');
        html = html.replace(/>강좌 - PetEdu Platform</g, `>${templateData.pageTitle}<`);
        
        res.setHeader('Content-Type', 'text/html');
        res.send(html);
      } else {
        res.status(404).send('템플릿을 찾을 수 없습니다.');
      }
    } catch (error) {
      logServerError('[SpringBoot] 강좌 페이지 렌더링 오류:', error, req);
      res.status(500).send('서버 오류가 발생했습니다.');
    }
  });

  console.log('[SpringBoot] Spring Boot 웹 라우트 등록 완료');
}

/**
 * Spring Boot 스타일의 REST API 엔드포인트
 */
export function registerSpringBootAPI(app: Express) {
  console.log('[SpringBoot] Spring Boot API 엔드포인트 등록 중...');

  // 헬스 체크
  app.get('/spring/api/health', (req: Request, res: Response) => {
    res.json({
      status: 'UP',
      service: 'PetEdu Spring Boot',
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    });
  });

  // 통계 API
  app.get('/spring/api/stats', async (req: Request, res: Response) => {
    try {
      const users = await storage.getAllUsers();
      const courses = await storage.getAllCourses();
      const trainers = await storage.getAllTrainers();
      const pets = await storage.getAllPets();

      res.json({
        users: users.length,
        pets: pets.length,
        courses: courses.length,
        trainers: trainers.length
      });
    } catch (error) {
      logServerError('[SpringBoot] 통계 API 오류:', error, req);
      res.status(500).json({ error: '통계 데이터를 가져올 수 없습니다.' });
    }
  });

  // 사용자 관리 API
  app.get('/spring/api/users', async (req: Request, res: Response) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      logServerError('[SpringBoot] 사용자 목록 API 오류:', error, req);
      res.status(500).json({ error: '사용자 데이터를 가져올 수 없습니다.' });
    }
  });

  app.get('/spring/api/users/:id', async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.id);
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
      }
      
      res.json(user);
    } catch (error) {
      logServerError('[SpringBoot] 사용자 조회 API 오류:', error, req);
      res.status(500).json({ error: '사용자 데이터를 가져올 수 없습니다.' });
    }
  });

  // 강좌 관리 API
  app.get('/spring/api/courses', async (req: Request, res: Response) => {
    try {
      const courses = await storage.getAllCourses();
      res.json(courses);
    } catch (error) {
      logServerError('[SpringBoot] 강좌 목록 API 오류:', error, req);
      res.status(500).json({ error: '강좌 데이터를 가져올 수 없습니다.' });
    }
  });

  app.get('/spring/api/courses/:id', async (req: Request, res: Response) => {
    try {
      const courseId = parseInt(req.params.id);
      const course = await storage.getCourse(courseId);
      
      if (!course) {
        return res.status(404).json({ error: '강좌를 찾을 수 없습니다.' });
      }
      
      res.json(course);
    } catch (error) {
      logServerError('[SpringBoot] 강좌 조회 API 오류:', error, req);
      res.status(500).json({ error: '강좌 데이터를 가져올 수 없습니다.' });
    }
  });

  // 반려동물 관리 API
  app.get('/spring/api/pets', async (req: Request, res: Response) => {
    try {
      const pets = await storage.getAllPets();
      res.json(pets);
    } catch (error) {
      logServerError('[SpringBoot] 반려동물 목록 API 오류:', error, req);
      res.status(500).json({ error: '반려동물 데이터를 가져올 수 없습니다.' });
    }
  });

  console.log('[SpringBoot] Spring Boot API 엔드포인트 등록 완료');
}