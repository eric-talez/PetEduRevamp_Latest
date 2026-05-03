import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';

// 학생 데이터 타입 정의
interface Student {
  id: number;
  name: string;
  email: string;
  petName: string;
  petBreed: string;
  petAge: number;
  courses: string[];
  status: string;
  lastActivity: string;
  trainer: string;
  attendance: number;
  progress: number;
  notes: string[];
  assignments: {
    title: string;
    dueDate: string;
    status: string;
  }[];
  evaluations: {
    date: string;
    score: number;
    comment: string;
  }[];
}

export default function InstituteStudentsPage() {
  const auth = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('all');
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [activeTab, setActiveTab] = useState('profile');

  // 테스트용 데이터
  const students = [1, 2, 3, 4, 5].map((i) => ({
    id: i,
    name: `김철수${i}`,
    email: `user${i}@example.com`,
    petName: `멍멍이${i}`,
    petBreed: i % 2 === 0 ? '골든 리트리버' : '포메라니안',
    petAge: 2 + i,
    courses: ['기초 복종 훈련', '중급 트릭 훈련'],
    status: i % 3 === 0 ? '수료' : '진행중',
    lastActivity: '2023-09-15',
    trainer: '이훈련',
    attendance: 75 + i,
    progress: 65 + i * 2,
    notes: [
      '2023-09-10: 오늘 수업에서 보통의 진전을 보였습니다.',
      '2023-09-03: 기본 명령어에 매우 잘 반응합니다.'
    ],
    assignments: [
      {
        title: '기본 앉기/엎드리기 훈련',
        dueDate: '2023-09-20',
        status: '완료'
      },
      {
        title: '산책 중 만남 훈련',
        dueDate: '2023-09-25',
        status: '진행중'
      }
    ],
    evaluations: [
      {
        date: '2023-09-01',
        score: 4.2,
        comment: '기본 명령어를 잘 수행하지만 산만할 때가 있습니다.'
      },
      {
        date: '2023-08-15',
        score: 3.8,
        comment: '다른 강아지와의 상호작용에서 개선이 필요합니다.'
      }
    ]
  }));

  // 학생 상세 정보 보기
  const handleViewDetails = (student: Student) => {
    setSelectedStudent(student);
    setIsDetailOpen(true);
  };

  // 검색어 변경 처리
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  // 코스 필터링 변경 처리
  const handleCourseChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedCourse(e.target.value);
  };

  // 학생 필터링 및 검색 함수
  const filteredStudents = students.filter(student => {
    const matchesSearch = student.name.includes(searchTerm) || 
                         student.petName.includes(searchTerm) ||
                         student.email.includes(searchTerm);
    
    const matchesCourse = selectedCourse === 'all' || 
                         student.courses.some(course => course === selectedCourse);
    
    return matchesSearch && matchesCourse;
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">수강생 관리</h1>
      
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-4">수강생 목록</h2>
          <div className="flex justify-between mb-4">
            <div className="relative w-64">
              <input
                type="text"
                placeholder="수강생 검색..."
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white"
                value={searchTerm}
                onChange={handleSearchChange}
              />
              <svg
                className="absolute right-3 top-3 h-4 w-4 text-gray-500 dark:text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <div className="flex space-x-2">
              <select 
                className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white"
                value={selectedCourse}
                onChange={handleCourseChange}
              >
                <option value="all">모든 강의</option>
                <option value="기초 복종 훈련">기초 복종 훈련</option>
                <option value="중급 트릭 훈련">중급 트릭 훈련</option>
                <option value="문제행동 교정">문제행동 교정</option>
              </select>
              <button className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2">
                필터 적용
              </button>
            </div>
          </div>

          {/* 학생 목록 테이블 */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    이름
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    반려견
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    등록 강의
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    진행 상태
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    최근 활동
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    담당 훈련사
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    관리
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
                {filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-700 flex-shrink-0">
                          {/* 프로필 이미지 */}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">{student.name}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">{student.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">{student.petName}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">{student.petBreed} ({student.petAge}세)</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {student.courses.map((course, idx) => (
                        <div key={idx} className="text-sm text-gray-900 dark:text-white">{course}</div>
                      ))}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        student.status === '진행중' 
                          ? 'bg-success/10 text-success dark:bg-success/20 dark:text-success/70' 
                          : 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary/70'
                      }`}>
                        {student.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {student.lastActivity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">{student.trainer}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button 
                        onClick={() => handleViewDetails(student)}
                        className="text-primary hover:text-primary/90 dark:text-primary dark:hover:text-primary/90"
                      >
                        상세보기
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="mt-4 flex justify-between">
            <div>
              <span className="text-sm text-gray-700 dark:text-gray-300">
                총 <span className="font-medium">{filteredStudents.length}</span> 명의 수강생
              </span>
            </div>
            <div className="flex space-x-2">
              <button className="px-3 py-1 border border-gray-300 dark:border-gray-700 rounded-md text-sm">
                이전
              </button>
              <button className="px-3 py-1 bg-primary text-white rounded-md text-sm">
                1
              </button>
              <button className="px-3 py-1 border border-gray-300 dark:border-gray-700 rounded-md text-sm">
                2
              </button>
              <button className="px-3 py-1 border border-gray-300 dark:border-gray-700 rounded-md text-sm">
                3
              </button>
              <button className="px-3 py-1 border border-gray-300 dark:border-gray-700 rounded-md text-sm">
                다음
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 학생 상세 정보 다이얼로그 */}
      {selectedStudent && (
        <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">{selectedStudent.name} 수강생 상세 정보</DialogTitle>
              <DialogDescription>
                수강생 및 반려견 정보와 교육 진행 상황을 확인합니다.
              </DialogDescription>
            </DialogHeader>
            
            <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
              <TabsList className="grid grid-cols-4 mb-4">
                <TabsTrigger value="profile">기본 정보</TabsTrigger>
                <TabsTrigger value="progress">진행 상황</TabsTrigger>
                <TabsTrigger value="notes">훈련 기록</TabsTrigger>
                <TabsTrigger value="assignments">과제 현황</TabsTrigger>
              </TabsList>
              
              <TabsContent value="profile" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                    <h3 className="font-semibold text-lg mb-2">수강생 정보</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">이름:</span>
                        <span>{selectedStudent.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">이메일:</span>
                        <span>{selectedStudent.email}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">담당 훈련사:</span>
                        <span>{selectedStudent.trainer}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">등록 강의:</span>
                        <span>{selectedStudent.courses.join(', ')}</span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                    <h3 className="font-semibold text-lg mb-2">반려견 정보</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">이름:</span>
                        <span>{selectedStudent.petName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">견종:</span>
                        <span>{selectedStudent.petBreed}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">나이:</span>
                        <span>{selectedStudent.petAge}세</span>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="progress" className="space-y-4">
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <h3 className="font-semibold text-lg mb-4">교육 진행 상황</h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>전체 진행률</span>
                        <span>{selectedStudent.progress}%</span>
                      </div>
                      <Progress value={selectedStudent.progress} className="h-2" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>출석률</span>
                        <span>{selectedStudent.attendance}%</span>
                      </div>
                      <Progress value={selectedStudent.attendance} className="h-2" />
                    </div>
                    <div className="mt-4">
                      <h4 className="font-medium mb-2">최근 평가</h4>
                      <div className="space-y-3">
                        {selectedStudent.evaluations.map((evaluation, idx) => (
                          <div key={idx} className="border-l-4 border-primary/50 pl-3 py-1">
                            <div className="flex justify-between">
                              <span className="font-medium">{evaluation.date}</span>
                              <span className="text-warning">
                                {evaluation.score}/5.0
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                              {evaluation.comment}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="notes" className="space-y-4">
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <h3 className="font-semibold text-lg mb-4">훈련 기록</h3>
                  <div className="space-y-3">
                    {selectedStudent.notes.map((note, idx) => {
                      const [date, content] = note.split(': ');
                      return (
                        <div key={idx} className="border-b border-gray-200 dark:border-gray-700 pb-2">
                          <div className="font-medium text-gray-800 dark:text-gray-200">{date}</div>
                          <div className="text-gray-600 dark:text-gray-300 mt-1">{content}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="assignments" className="space-y-4">
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <h3 className="font-semibold text-lg mb-4">과제 현황</h3>
                  <div className="space-y-3">
                    {selectedStudent.assignments.map((assignment, idx) => (
                      <div key={idx} className="border-b border-gray-200 dark:border-gray-700 pb-3 pt-2">
                        <div className="flex justify-between">
                          <span className="font-medium">{assignment.title}</span>
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            assignment.status === '완료' 
                              ? 'bg-success/10 text-success dark:bg-success/20 dark:text-success/70'
                              : 'bg-warning/10 text-warning dark:bg-warning/20 dark:text-warning/70'
                          }`}>
                            {assignment.status}
                          </span>
                        </div>
                        <div className="text-sm text-gray-500 mt-1">
                          마감일: {assignment.dueDate}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <DialogFooter className="flex justify-between items-center">
              <div>
                <Button 
                  variant="outline" 
                  onClick={() => window.open(`/student/${selectedStudent.id}/print`, '_blank')}
                  className="mr-2"
                >
                  교육 리포트 인쇄
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => alert('메시지 보내기 기능 준비 중')}
                >
                  메시지 보내기
                </Button>
              </div>
              <Button onClick={() => setIsDetailOpen(false)}>닫기</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}