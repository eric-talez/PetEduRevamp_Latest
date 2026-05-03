import { storage } from '../storage';
import { logServerError } from '../middleware/audit-logger';

interface CourseData {
  id: string;
  title: string;
  description: string;
  category: string;
  level: string;
  duration: string;
  maxStudents: number;
  price: number;
  status: 'draft' | 'pending' | 'approved' | 'rejected';
  trainerId: string;
  enrollmentCount: number;
  totalRevenue: number;
  commissionRate: number;
  trainerRevenue: number;
}

export class CourseService {
  // 훈련사별 강좌 목록 조회
  async getCoursesByTrainer(trainerId: string): Promise<CourseData[]> {
    try {
      // 실제 데이터베이스에서 강좌 목록을 가져오는 로직
      const courses = await storage.getCoursesByTrainer(trainerId);
      return courses;
    } catch (error) {
      logServerError('강좌 조회 오류:', error);
      throw new Error('강좌 목록을 불러올 수 없습니다.');
    }
  }

  // 강좌 수익 계산
  async calculateCourseRevenue(courseId: string): Promise<{
    totalRevenue: number;
    trainerRevenue: number;
    platformRevenue: number;
    enrollmentCount: number;
  }> {
    try {
      const enrollments = await storage.getEnrollmentsByCourse(courseId);
      const course = await storage.getCourseById(courseId);
      
      const enrollmentCount = enrollments.length;
      const totalRevenue = enrollmentCount * course.price;
      const trainerRevenue = totalRevenue * (course.commissionRate / 100);
      const platformRevenue = totalRevenue - trainerRevenue;

      return {
        totalRevenue,
        trainerRevenue,
        platformRevenue,
        enrollmentCount
      };
    } catch (error) {
      logServerError('수익 계산 오류:', error);
      throw new Error('수익 정보를 계산할 수 없습니다.');
    }
  }

  // 강좌 상태 업데이트
  async updateCourseStatus(courseId: string, status: string, adminId: string): Promise<void> {
    try {
      await storage.updateCourseStatus(courseId, status, adminId);
    } catch (error) {
      logServerError('강좌 상태 업데이트 오류:', error);
      throw new Error('강좌 상태를 업데이트할 수 없습니다.');
    }
  }

  // 강좌 등록
  async createCourse(courseData: Partial<CourseData>): Promise<string> {
    try {
      const courseId = await storage.createCourse(courseData);
      return courseId;
    } catch (error) {
      logServerError('강좌 등록 오류:', error);
      throw new Error('강좌를 등록할 수 없습니다.');
    }
  }

  // 강좌 수정
  async updateCourse(courseId: string, courseData: Partial<CourseData>): Promise<void> {
    try {
      await storage.updateCourse(courseId, courseData);
    } catch (error) {
      logServerError('강좌 수정 오류:', error);
      throw new Error('강좌를 수정할 수 없습니다.');
    }
  }
}

export const courseService = new CourseService();