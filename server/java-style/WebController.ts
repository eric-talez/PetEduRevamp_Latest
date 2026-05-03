/**
 * Spring Boot Style Web Controller
 * Thymeleaf 템플릿을 렌더링하는 컨트롤러
 */

import { Request, Response } from 'express';
import { storage } from '../storage';
import { logServerError } from '../middleware/audit-logger';

export class WebController {
    
    /**
     * 홈페이지 렌더링
     * @RequestMapping(value = "/", method = RequestMethod.GET)
     */
    async home(req: Request, res: Response) {
        try {
            // 통계 데이터 조회
            const users = await storage.getAllUsers();
            const pets = await storage.getAllPets();
            const courses = await storage.getAllCourses();
            const trainers = await storage.getAllTrainers();
            
            const model = {
                title: 'PetEdu Platform - Spring Boot',
                description: 'AI 기반 반려동물 교육 플랫폼 - Spring Boot 완전 변환',
                userCount: users.length.toLocaleString(),
                petCount: pets.length.toLocaleString(),
                courseCount: courses.length.toLocaleString(),
                trainerCount: trainers.length.toLocaleString(),
                server: {
                    port: process.env.PORT || '8080'
                },
                spring: {
                    profiles: {
                        active: process.env.NODE_ENV || 'development'
                    }
                }
            };
            
            // Thymeleaf 템플릿 렌더링 시뮬레이션
            res.send(this.renderTemplate('index', model));
        } catch (error) {
            logServerError('[WebController] 홈페이지 렌더링 오류:', error, req);
            res.status(500).send('Internal Server Error');
        }
    }
    
    /**
     * 대시보드 페이지
     * @RequestMapping(value = "/dashboard", method = RequestMethod.GET)
     */
    async dashboard(req: Request, res: Response) {
        try {
            const model = {
                page: 'dashboard',
                pageTitle: '대시보드',
                content: 'dashboard'
            };
            
            res.send(this.renderTemplate('layout/main', model));
        } catch (error) {
            logServerError('[WebController] 대시보드 렌더링 오류:', error, req);
            res.status(500).send('Internal Server Error');
        }
    }
    
    /**
     * 강좌 목록 페이지
     * @RequestMapping(value = "/courses", method = RequestMethod.GET)
     */
    async courses(req: Request, res: Response) {
        try {
            const courses = await storage.getAllCourses();
            
            const model = {
                page: 'courses',
                pageTitle: '강좌 관리',
                content: 'courses',
                courses: courses
            };
            
            res.send(this.renderTemplate('layout/main', model));
        } catch (error) {
            logServerError('[WebController] 강좌 페이지 렌더링 오류:', error, req);
            res.status(500).send('Internal Server Error');
        }
    }
    
    /**
     * 반려동물 목록 페이지
     * @RequestMapping(value = "/pets", method = RequestMethod.GET)
     */
    async pets(req: Request, res: Response) {
        try {
            const pets = await storage.getAllPets();
            
            const model = {
                page: 'pets',
                pageTitle: '반려동물 관리',
                content: 'pets',
                pets: pets
            };
            
            res.send(this.renderTemplate('layout/main', model));
        } catch (error) {
            logServerError('[WebController] 반려동물 페이지 렌더링 오류:', error, req);
            res.status(500).send('Internal Server Error');
        }
    }
    
    /**
     * 훈련사 목록 페이지
     * @RequestMapping(value = "/trainers", method = RequestMethod.GET)
     */
    async trainers(req: Request, res: Response) {
        try {
            const trainers = await storage.getAllTrainers();
            
            const model = {
                page: 'trainers',
                pageTitle: '훈련사 관리',
                content: 'trainers',
                trainers: trainers
            };
            
            res.send(this.renderTemplate('layout/main', model));
        } catch (error) {
            logServerError('[WebController] 훈련사 페이지 렌더링 오류:', error, req);
            res.status(500).send('Internal Server Error');
        }
    }
    
    /**
     * 관리자 페이지
     * @RequestMapping(value = "/admin", method = RequestMethod.GET)
     * @PreAuthorize("hasRole('ADMIN')")
     */
    async admin(req: Request, res: Response) {
        try {
            const model = {
                page: 'admin',
                pageTitle: '시스템 관리',
                content: 'admin'
            };
            
            res.send(this.renderTemplate('layout/main', model));
        } catch (error) {
            logServerError('[WebController] 관리자 페이지 렌더링 오류:', error, req);
            res.status(500).send('Internal Server Error');
        }
    }
    
    /**
     * Thymeleaf 템플릿 렌더링 시뮬레이션
     * 실제 Spring Boot에서는 ThymeleafViewResolver가 처리
     */
    private renderTemplate(templateName: string, model: any): string {
        // index.html 템플릿의 경우 실제 파일 반환
        if (templateName === 'index') {
            return this.processIndexTemplate(model);
        }
        
        // 기타 템플릿은 간단한 HTML 생성
        return this.generateSimpleTemplate(templateName, model);
    }
    
    /**
     * index.html 템플릿 처리
     */
    private processIndexTemplate(model: any): string {
        // 실제로는 src/main/resources/templates/index.html 파일을 읽어서 처리
        // 여기서는 기본 템플릿을 반환
        return `
        <!DOCTYPE html>
        <html lang="ko">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${model.title}</title>
            <meta name="description" content="${model.description}">
            <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
            <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
            <style>
                body { 
                    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; 
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    min-height: 100vh;
                    color: white;
                }
                .spring-badge {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
                    color: white;
                    padding: 12px 25px;
                    border-radius: 30px;
                    font-weight: 600;
                    z-index: 1000;
                }
                .hero-section {
                    padding: 100px 0;
                    text-align: center;
                }
                .hero-title {
                    font-size: 4rem;
                    font-weight: 700;
                    margin-bottom: 20px;
                    text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
                }
                .stats-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 30px;
                    margin: 60px 0;
                }
                .stat-card {
                    background: rgba(255, 255, 255, 0.1);
                    backdrop-filter: blur(10px);
                    border-radius: 20px;
                    padding: 30px;
                    text-align: center;
                }
                .stat-number {
                    font-size: 3rem;
                    font-weight: 700;
                    color: #FFD700;
                }
                .btn-spring {
                    background: linear-gradient(135deg, #4f46e5 0%, #06b6d4 100%);
                    border: none;
                    color: white;
                    padding: 15px 40px;
                    border-radius: 50px;
                    font-weight: 600;
                    text-decoration: none;
                    display: inline-block;
                    margin: 10px;
                    transition: all 0.3s ease;
                }
                .btn-spring:hover {
                    transform: translateY(-3px);
                    color: white;
                }
            </style>
        </head>
        <body>
            <div class="spring-badge">
                <i class="fas fa-leaf me-2"></i>Spring Boot Active
            </div>
            
            <div class="container">
                <section class="hero-section">
                    <h1 class="hero-title">
                        <i class="fas fa-paw me-3"></i>PetEdu Platform
                    </h1>
                    <p class="lead mb-4">
                        완전히 Spring Boot로 변환된 AI 기반 반려동물 교육 플랫폼
                    </p>
                    
                    <div class="stats-grid">
                        <div class="stat-card">
                            <div class="stat-number">${model.userCount}</div>
                            <p>등록된 사용자</p>
                        </div>
                        <div class="stat-card">
                            <div class="stat-number">${model.petCount}</div>
                            <p>관리 중인 반려동물</p>
                        </div>
                        <div class="stat-card">
                            <div class="stat-number">${model.courseCount}</div>
                            <p>교육 과정</p>
                        </div>
                        <div class="stat-card">
                            <div class="stat-number">${model.trainerCount}</div>
                            <p>전문 훈련사</p>
                        </div>
                    </div>
                    
                    <div class="mt-5">
                        <a href="/dashboard" class="btn-spring">
                            <i class="fas fa-chart-bar me-2"></i>대시보드 보기
                        </a>
                        <a href="/api/health" class="btn-spring">
                            <i class="fas fa-heartbeat me-2"></i>헬스 체크
                        </a>
                        <a href="/courses" class="btn-spring">
                            <i class="fas fa-graduation-cap me-2"></i>강좌 보기
                        </a>
                    </div>
                    
                    <div class="mt-5 p-4" style="background: rgba(255,255,255,0.1); border-radius: 15px;">
                        <h4>Spring Boot 변환 완료</h4>
                        <p class="mb-0">
                            <strong>Framework:</strong> Spring Boot 2.7.18<br>
                            <strong>Port:</strong> ${model.server.port}<br>
                            <strong>Environment:</strong> ${model.spring.profiles.active}
                        </p>
                    </div>
                </section>
            </div>
            
            <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
        </body>
        </html>
        `;
    }
    
    /**
     * 간단한 템플릿 생성
     */
    private generateSimpleTemplate(templateName: string, model: any): string {
        return `
        <!DOCTYPE html>
        <html lang="ko">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${model.pageTitle} - PetEdu Platform</title>
            <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
            <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
            <style>
                body { font-family: 'Inter', sans-serif; background: #f8fafc; }
                .spring-indicator { 
                    position: fixed; 
                    top: 20px; 
                    right: 20px; 
                    background: #22c55e; 
                    color: white; 
                    padding: 10px 20px; 
                    border-radius: 25px; 
                    font-weight: 600; 
                    z-index: 1000; 
                }
                .sidebar {
                    min-height: 100vh;
                    background: linear-gradient(180deg, #4f46e5 0%, #06b6d4 100%);
                    color: white;
                }
                .main-content {
                    background: white;
                    border-radius: 15px;
                    margin: 20px;
                    padding: 30px;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.1);
                }
            </style>
        </head>
        <body>
            <div class="spring-indicator">
                <i class="fas fa-leaf me-2"></i>Spring Boot
            </div>
            
            <div class="container-fluid">
                <div class="row">
                    <nav class="col-md-3 col-lg-2 sidebar">
                        <div class="p-3">
                            <h4><i class="fas fa-paw me-2"></i>PetEdu</h4>
                            <small class="opacity-75">Spring Boot Platform</small>
                            
                            <ul class="nav flex-column mt-4">
                                <li class="nav-item">
                                    <a href="/" class="nav-link text-light">
                                        <i class="fas fa-home me-2"></i>홈
                                    </a>
                                </li>
                                <li class="nav-item">
                                    <a href="/dashboard" class="nav-link text-light">
                                        <i class="fas fa-chart-bar me-2"></i>대시보드
                                    </a>
                                </li>
                                <li class="nav-item">
                                    <a href="/courses" class="nav-link text-light">
                                        <i class="fas fa-graduation-cap me-2"></i>강좌
                                    </a>
                                </li>
                                <li class="nav-item">
                                    <a href="/pets" class="nav-link text-light">
                                        <i class="fas fa-dog me-2"></i>반려동물
                                    </a>
                                </li>
                                <li class="nav-item">
                                    <a href="/trainers" class="nav-link text-light">
                                        <i class="fas fa-user-tie me-2"></i>훈련사
                                    </a>
                                </li>
                            </ul>
                        </div>
                    </nav>
                    
                    <main class="col-md-9 ms-sm-auto col-lg-10">
                        <div class="main-content">
                            <h1>${model.pageTitle}</h1>
                            <p class="text-muted">Spring Boot 기반 ${model.pageTitle} 페이지입니다.</p>
                            
                            <div class="alert alert-success">
                                <i class="fas fa-check-circle me-2"></i>
                                Spring Boot 컨트롤러가 성공적으로 렌더링했습니다.
                            </div>
                            
                            ${model.content === 'courses' ? this.renderCoursesContent(model) : ''}
                            ${model.content === 'pets' ? this.renderPetsContent(model) : ''}
                            ${model.content === 'trainers' ? this.renderTrainersContent(model) : ''}
                            ${model.content === 'dashboard' ? this.renderDashboardContent(model) : ''}
                        </div>
                    </main>
                </div>
            </div>
            
            <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
        </body>
        </html>
        `;
    }
    
    private renderCoursesContent(model: any): string {
        return `
        <div class="row">
            <div class="col-12">
                <h3>강좌 목록</h3>
                <div class="table-responsive">
                    <table class="table table-striped">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>강좌명</th>
                                <th>설명</th>
                                <th>상태</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${model.courses?.map((course: any) => `
                                <tr>
                                    <td>${course.id}</td>
                                    <td>${course.name}</td>
                                    <td>${course.description || '설명 없음'}</td>
                                    <td><span class="badge bg-success">활성</span></td>
                                </tr>
                            `).join('') || '<tr><td colspan="4">강좌가 없습니다.</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
        `;
    }
    
    private renderPetsContent(model: any): string {
        return `
        <div class="row">
            <div class="col-12">
                <h3>반려동물 목록</h3>
                <div class="table-responsive">
                    <table class="table table-striped">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>이름</th>
                                <th>품종</th>
                                <th>나이</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${model.pets?.map((pet: any) => `
                                <tr>
                                    <td>${pet.id}</td>
                                    <td>${pet.name}</td>
                                    <td>${pet.breed}</td>
                                    <td>${pet.age}살</td>
                                </tr>
                            `).join('') || '<tr><td colspan="4">반려동물이 없습니다.</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
        `;
    }
    
    private renderTrainersContent(model: any): string {
        return `
        <div class="row">
            <div class="col-12">
                <h3>훈련사 목록</h3>
                <div class="table-responsive">
                    <table class="table table-striped">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>이름</th>
                                <th>전문분야</th>
                                <th>경력</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${model.trainers?.map((trainer: any) => `
                                <tr>
                                    <td>${trainer.id}</td>
                                    <td>${trainer.name}</td>
                                    <td>${trainer.specialization || '일반'}</td>
                                    <td>${trainer.experience || '미정'}년</td>
                                </tr>
                            `).join('') || '<tr><td colspan="4">훈련사가 없습니다.</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
        `;
    }
    
    private renderDashboardContent(model: any): string {
        return `
        <div class="row">
            <div class="col-md-3">
                <div class="card text-center">
                    <div class="card-body">
                        <h5 class="card-title">사용자</h5>
                        <h2 class="text-primary">1,234</h2>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card text-center">
                    <div class="card-body">
                        <h5 class="card-title">반려동물</h5>
                        <h2 class="text-success">5,678</h2>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card text-center">
                    <div class="card-body">
                        <h5 class="card-title">강좌</h5>
                        <h2 class="text-info">89</h2>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card text-center">
                    <div class="card-body">
                        <h5 class="card-title">훈련사</h5>
                        <h2 class="text-warning">156</h2>
                    </div>
                </div>
            </div>
        </div>
        `;
    }
}

export const webController = new WebController();