import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { 
  Users, 
  Search, 
  Calendar,
  Clock,
  Star,
  Eye,
  MessageSquare,
  Award,
  TrendingUp,
  BookOpen,
  FileText,
  Phone,
  Mail,
  MapPin,
  Heart,
  GraduationCap,
  CheckCircle,
  AlertCircle,
  User
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';

interface Student {
  id: number;
  name: string;
  email: string;
  phone: string;
  address: string;
  joinDate: string;
  status: 'active' | 'inactive' | 'graduated';
  pet: {
    id: number;
    name: string;
    breed: string;
    age: number;
    weight: number;
    gender: string;
    healthStatus: string;
    specialNotes: string;
    imageUrl: string;
  };
  trainer: {
    id: number;
    name: string;
    email: string;
  };
  course: {
    id: number;
    title: string;
    startDate: string;
    endDate: string;
    progress: number;
  };
  attendance: {
    totalSessions: number;
    attendedSessions: number;
    attendanceRate: number;
    lastAttendance: string;
  };
  performance: {
    overallRating: number;
    behaviorScore: number;
    learningSpeed: number;
    socialSkills: number;
    notes: string;
  };
  payments: {
    totalAmount: number;
    paidAmount: number;
    pendingAmount: number;
    lastPayment: string;
  };
}

interface TrainerOverview {
  id: number;
  name: string;
  email: string;
  avatar: string;
  specialization: string[];
  totalStudents: number;
  activeStudents: number;
  completedCourses: number;
  averageRating: number;
  monthlyRevenue: number;
  joinDate: string;
  status: 'active' | 'inactive';
}

export default function TrainerStudentsPage() {
  const { userRole, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [selectedTrainer, setSelectedTrainer] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isStudentDetailOpen, setIsStudentDetailOpen] = useState(false);

  // 훈련사 목록 조회 (기관 관리자용)
  const { data: trainers, isLoading: trainersLoading } = useQuery({
    queryKey: ['/api/institute/trainers-overview'],
    queryFn: async () => {
      // 기관 관리자인 경우 모든 훈련사 조회
      if (userRole === 'institute-admin') {
        return [
          {
            id: 1,
            name: "김민수",
            email: "kim@example.com",
            avatar: "/avatars/trainer1.jpg",
            specialization: ["기초 복종", "어질리티", "사회화"],
            totalStudents: 15,
            activeStudents: 12,
            completedCourses: 8,
            averageRating: 4.8,
            monthlyRevenue: 2500000,
            joinDate: "2024-01-15",
            status: 'active'
          },
          {
            id: 2,
            name: "이준호",
            email: "lee@example.com",
            avatar: "/avatars/trainer2.jpg",
            specialization: ["어질리티", "운동 능력", "체력 단련"],
            totalStudents: 18,
            activeStudents: 16,
            completedCourses: 12,
            averageRating: 4.6,
            monthlyRevenue: 3200000,
            joinDate: "2023-11-20",
            status: 'active'
          },
          {
            id: 3,
            name: "박지혜",
            email: "park@example.com",
            avatar: "/avatars/trainer3.jpg",
            specialization: ["행동 교정", "문제 행동", "심리 치료"],
            totalStudents: 10,
            activeStudents: 8,
            completedCourses: 6,
            averageRating: 4.9,
            monthlyRevenue: 1800000,
            joinDate: "2024-03-10",
            status: 'active'
          }
        ] as TrainerOverview[];
      }
      // 개별 훈련사인 경우 자신의 정보만
      return [];
    },
    enabled: isAuthenticated
  });

  // 학생 목록 조회
  const { data: students, isLoading: studentsLoading } = useQuery({
    queryKey: ['/api/trainer/students', selectedTrainer],
    queryFn: async () => {
      const mockStudents: Student[] = [
        {
          id: 1,
          name: "홍길동",
          email: "hong@example.com",
          phone: "010-1234-5678",
          address: "서울시 강남구 역삼동",
          joinDate: "2024-12-01",
          status: 'active',
          pet: {
            id: 1,
            name: "맥스",
            breed: "골든 리트리버",
            age: 3,
            weight: 28,
            gender: "수컷",
            healthStatus: "건강",
            specialNotes: "사회화 훈련 필요",
            imageUrl: `https://api.dicebear.com/7.x/pets/svg?seed=맥스&backgroundColor=ffd700`
          },
          trainer: {
            id: 1,
            name: "김민수",
            email: "kim@example.com"
          },
          course: {
            id: 1,
            title: "기초 복종 훈련",
            startDate: "2024-12-01",
            endDate: "2025-02-28",
            progress: 65
          },
          attendance: {
            totalSessions: 20,
            attendedSessions: 17,
            attendanceRate: 85,
            lastAttendance: "2025-01-15"
          },
          performance: {
            overallRating: 4.2,
            behaviorScore: 4.5,
            learningSpeed: 4.0,
            socialSkills: 3.8,
            notes: "매우 적극적이고 학습 능력이 뛰어남. 다른 개들과의 상호작용에서 약간의 개선이 필요함."
          },
          payments: {
            totalAmount: 450000,
            paidAmount: 300000,
            pendingAmount: 150000,
            lastPayment: "2025-01-10"
          }
        },
        {
          id: 2,
          name: "김미영",
          email: "kim.my@example.com",
          phone: "010-2345-6789",
          address: "서울시 마포구 합정동",
          joinDate: "2024-11-15",
          status: 'active',
          pet: {
            id: 2,
            name: "루나",
            breed: "보더 콜리",
            age: 2,
            weight: 20,
            gender: "암컷",
            healthStatus: "건강",
            specialNotes: "지능이 높아 고급 훈련 가능",
            imageUrl: `https://api.dicebear.com/7.x/pets/svg?seed=루나&backgroundColor=87ceeb`
          },
          trainer: {
            id: 2,
            name: "이준호",
            email: "lee@example.com"
          },
          course: {
            id: 2,
            title: "어질리티 훈련",
            startDate: "2024-11-15",
            endDate: "2025-01-31",
            progress: 80
          },
          attendance: {
            totalSessions: 16,
            attendedSessions: 15,
            attendanceRate: 94,
            lastAttendance: "2025-01-14"
          },
          performance: {
            overallRating: 4.8,
            behaviorScore: 4.7,
            learningSpeed: 4.9,
            socialSkills: 4.6,
            notes: "매우 똑똑하고 훈련을 잘 따름. 어질리티 훈련에 특히 뛰어난 재능을 보임."
          },
          payments: {
            totalAmount: 380000,
            paidAmount: 380000,
            pendingAmount: 0,
            lastPayment: "2024-12-20"
          }
        },
        {
          id: 3,
          name: "박진우",
          email: "park.jw@example.com",
          phone: "010-3456-7890",
          address: "서울시 종로구 인사동",
          joinDate: "2024-10-20",
          status: 'graduated',
          pet: {
            id: 3,
            name: "초코",
            breed: "프렌치 불독",
            age: 4,
            weight: 12,
            gender: "수컷",
            healthStatus: "양호",
            specialNotes: "호흡기 문제로 격한 운동 주의",
            imageUrl: `https://api.dicebear.com/7.x/pets/svg?seed=초코&backgroundColor=8b4513`
          },
          trainer: {
            id: 3,
            name: "박지혜",
            email: "park@example.com"
          },
          course: {
            id: 3,
            title: "행동 교정 훈련",
            startDate: "2024-10-20",
            endDate: "2024-12-31",
            progress: 100
          },
          attendance: {
            totalSessions: 12,
            attendedSessions: 11,
            attendanceRate: 92,
            lastAttendance: "2024-12-28"
          },
          performance: {
            overallRating: 4.3,
            behaviorScore: 4.4,
            learningSpeed: 3.9,
            socialSkills: 4.2,
            notes: "처음에는 공격적인 행동이 있었으나 훈련 후 많이 개선됨. 졸업 후에도 꾸준한 관리 필요."
          },
          payments: {
            totalAmount: 320000,
            paidAmount: 320000,
            pendingAmount: 0,
            lastPayment: "2024-11-25"
          }
        },
        {
          id: 4,
          name: "이서연",
          email: "lee.sy@example.com",
          phone: "010-4567-8901",
          address: "서울시 송파구 잠실동",
          joinDate: "2025-01-05",
          status: 'active',
          pet: {
            id: 4,
            name: "바둑이",
            breed: "믹스견",
            age: 1,
            weight: 15,
            gender: "수컷",
            healthStatus: "건강",
            specialNotes: "퍼피 사회화 훈련 중",
            imageUrl: `https://api.dicebear.com/7.x/pets/svg?seed=바둑이&backgroundColor=90ee90`
          },
          trainer: {
            id: 1,
            name: "김민수",
            email: "kim@example.com"
          },
          course: {
            id: 4,
            title: "퍼피 사회화 훈련",
            startDate: "2025-01-05",
            endDate: "2025-03-05",
            progress: 15
          },
          attendance: {
            totalSessions: 8,
            attendedSessions: 2,
            attendanceRate: 25,
            lastAttendance: "2025-01-12"
          },
          performance: {
            overallRating: 3.5,
            behaviorScore: 3.2,
            learningSpeed: 3.8,
            socialSkills: 3.0,
            notes: "아직 어린 나이라 기본적인 훈련 중. 사회화 훈련에 집중이 필요함."
          },
          payments: {
            totalAmount: 280000,
            paidAmount: 140000,
            pendingAmount: 140000,
            lastPayment: "2025-01-05"
          }
        },
        {
          id: 5,
          name: "최영수",
          email: "choi.ys@example.com",
          phone: "010-5678-9012",
          address: "서울시 강서구 방화동",
          joinDate: "2024-09-10",
          status: 'inactive',
          pet: {
            id: 5,
            name: "뽀삐",
            breed: "말티즈",
            age: 6,
            weight: 8,
            gender: "암컷",
            healthStatus: "양호",
            specialNotes: "노령견으로 부드러운 훈련 필요",
            imageUrl: `https://api.dicebear.com/7.x/pets/svg?seed=뽀삐&backgroundColor=ffe4e1`
          },
          trainer: {
            id: 2,
            name: "이준호",
            email: "lee@example.com"
          },
          course: {
            id: 5,
            title: "시니어 케어 훈련",
            startDate: "2024-09-10",
            endDate: "2024-11-30",
            progress: 40
          },
          attendance: {
            totalSessions: 15,
            attendedSessions: 6,
            attendanceRate: 40,
            lastAttendance: "2024-10-25"
          },
          performance: {
            overallRating: 3.0,
            behaviorScore: 3.5,
            learningSpeed: 2.8,
            socialSkills: 3.2,
            notes: "건강상 문제로 훈련 중단. 집에서 할 수 있는 간단한 훈련으로 전환 필요."
          },
          payments: {
            totalAmount: 200000,
            paidAmount: 80000,
            pendingAmount: 120000,
            lastPayment: "2024-09-10"
          }
        }
      ];

      // 선택된 훈련사에 따라 필터링
      if (selectedTrainer) {
        return mockStudents.filter(student => student.trainer.id === selectedTrainer);
      }
      
      return mockStudents;
    },
    enabled: isAuthenticated
  });

  // 필터링된 학생 목록
  const filteredStudents = students?.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         student.pet.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || student.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleStudentClick = (student: Student) => {
    setSelectedStudent(student);
    setIsStudentDetailOpen(true);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">수강생 관리</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            {userRole === 'institute-admin' 
              ? '기관 전체 수강생 현황 및 관리' 
              : '담당 수강생 현황 및 관리'}
          </p>
        </div>
      </div>

      {/* 기관 관리자용 훈련사 선택 */}
      {userRole === 'institute-admin' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              훈련사 현황
            </CardTitle>
          </CardHeader>
          <CardContent>
            {trainersLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="animate-pulse bg-gray-200 h-32 rounded-lg"></div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                {trainers?.map((trainer: TrainerOverview) => (
                  <Card 
                    key={trainer.id} 
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      selectedTrainer === trainer.id ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => setSelectedTrainer(selectedTrainer === trainer.id ? null : trainer.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={trainer.avatar} />
                          <AvatarFallback>{trainer.name[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-semibold">{trainer.name}</h3>
                          <div className="flex items-center gap-1">
                            <Star className="h-3 w-3 text-warning" />
                            <span className="text-sm text-gray-600">{trainer.averageRating}</span>
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-gray-500">활성 학생:</span>
                          <span className="font-medium ml-1">{trainer.activeStudents}명</span>
                        </div>
                        <div>
                          <span className="text-gray-500">완료 과정:</span>
                          <span className="font-medium ml-1">{trainer.completedCourses}개</span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-gray-500">월 수익:</span>
                          <span className="font-medium ml-1">{trainer.monthlyRevenue.toLocaleString()}원</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
            
            <div className="flex gap-2">
              <Button 
                variant={selectedTrainer ? "outline" : "default"}
                onClick={() => setSelectedTrainer(null)}
              >
                전체 보기
              </Button>
              {selectedTrainer && (
                <Badge variant="secondary">
                  {trainers?.find(t => t.id === selectedTrainer)?.name} 훈련사 선택됨
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 검색 및 필터 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="학생명 또는 반려동물명으로 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="상태 필터" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value="active">수강중</SelectItem>
                <SelectItem value="inactive">휴강중</SelectItem>
                <SelectItem value="graduated">수료</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 수강생 목록 */}
      <div className="grid gap-4">
        {studentsLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-4">
                    <div className="rounded-full bg-gray-300 h-12 w-12"></div>
                    <div className="space-y-2 flex-1">
                      <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                      <div className="h-4 bg-gray-300 rounded w-1/2"></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredStudents?.map((student: Student) => (
              <Card 
                key={student.id} 
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => handleStudentClick(student)}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${student.name}`} />
                        <AvatarFallback>{student.name[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-semibold text-lg">{student.name}</h3>
                        <p className="text-gray-600 dark:text-gray-400">{student.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={student.status === 'active' ? 'default' : 'secondary'}>
                        {student.status === 'active' ? '수강중' : 
                         student.status === 'inactive' ? '휴강중' : '수료'}
                      </Badge>
                      <Eye className="h-4 w-4 text-gray-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!studentsLoading && (!filteredStudents || filteredStudents.length === 0) && (
          <Card>
            <CardContent className="p-12 text-center">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">수강생이 없습니다</h3>
              <p className="text-gray-600 dark:text-gray-400">
                {searchTerm ? '검색 조건에 맞는 수강생이 없습니다.' : '아직 등록된 수강생이 없습니다.'}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* 학생 상세 정보 다이얼로그 */}
      {selectedStudent && (
        <StudentDetailDialog 
          student={selectedStudent}
          open={isStudentDetailOpen}
          onClose={() => setIsStudentDetailOpen(false)}
        />
      )}
    </div>
  );
}

// 학생 상세 정보 다이얼로그 컴포넌트
function StudentDetailDialog({ 
  student, 
  open, 
  onClose 
}: { 
  student: Student; 
  open: boolean; 
  onClose: () => void; 
}) {
  if (!student) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${student.name}`} />
              <AvatarFallback>{student.name[0]}</AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-xl font-bold">{student.name}</h2>
              <p className="text-gray-600 dark:text-gray-400">{student.email}</p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="basic">기본정보</TabsTrigger>
            <TabsTrigger value="pet">반려동물</TabsTrigger>
            <TabsTrigger value="course">수강과정</TabsTrigger>
            <TabsTrigger value="performance">성과</TabsTrigger>
            <TabsTrigger value="payment">결제</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="font-medium">이름:</span>
                <span className="ml-2">{student.name}</span>
              </div>
              <div>
                <span className="font-medium">이메일:</span>
                <span className="ml-2">{student.email}</span>
              </div>
              <div>
                <span className="font-medium">전화번호:</span>
                <span className="ml-2">{student.phone}</span>
              </div>
              <div>
                <span className="font-medium">가입일:</span>
                <span className="ml-2">{student.joinDate}</span>
              </div>
              <div className="col-span-2">
                <span className="font-medium">주소:</span>
                <span className="ml-2">{student.address}</span>
              </div>
              <div>
                <span className="font-medium">상태:</span>
                <Badge variant={student.status === 'active' ? 'default' : 'secondary'} className="ml-2">
                  {student.status === 'active' ? '수강중' : 
                   student.status === 'inactive' ? '휴강중' : '수료'}
                </Badge>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="pet" className="space-y-4">
            <div className="flex items-center gap-4 mb-4">
              <img 
                src={student.pet.imageUrl} 
                alt={student.pet.name}
                className="w-16 h-16 rounded-full object-cover"
              />
              <div>
                <h3 className="font-semibold text-lg">{student.pet.name}</h3>
                <p className="text-gray-600 dark:text-gray-400">{student.pet.breed}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="font-medium">나이:</span>
                <span className="ml-2">{student.pet.age}세</span>
              </div>
              <div>
                <span className="font-medium">체중:</span>
                <span className="ml-2">{student.pet.weight}kg</span>
              </div>
              <div>
                <span className="font-medium">성별:</span>
                <span className="ml-2">{student.pet.gender}</span>
              </div>
              <div>
                <span className="font-medium">건강상태:</span>
                <span className="ml-2">{student.pet.healthStatus}</span>
              </div>
              <div className="col-span-2">
                <span className="font-medium">특이사항:</span>
                <span className="ml-2">{student.pet.specialNotes}</span>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="course" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="font-medium">과정명:</span>
                <span className="ml-2">{student.course.title}</span>
              </div>
              <div>
                <span className="font-medium">담당 훈련사:</span>
                <span className="ml-2">{student.trainer.name}</span>
              </div>
              <div>
                <span className="font-medium">시작일:</span>
                <span className="ml-2">{student.course.startDate}</span>
              </div>
              <div>
                <span className="font-medium">종료일:</span>
                <span className="ml-2">{student.course.endDate}</span>
              </div>
              <div className="col-span-2">
                <span className="font-medium">진행률:</span>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full" 
                      style={{ width: `${student.course.progress}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium">{student.course.progress}%</span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 mt-6">
              <div className="text-center p-4 bg-primary/10 dark:bg-primary/20 rounded-lg">
                <div className="text-2xl font-bold text-primary">
                  {student.attendance.totalSessions}
                </div>
                <div className="text-sm text-gray-600">총 세션</div>
              </div>
              <div className="text-center p-4 bg-success/10 dark:bg-success/20 rounded-lg">
                <div className="text-2xl font-bold text-success">
                  {student.attendance.attendedSessions}
                </div>
                <div className="text-sm text-gray-600">참석</div>
              </div>
              <div className="text-center p-4 bg-warning/10 dark:bg-warning/20 rounded-lg">
                <div className="text-2xl font-bold text-warning">
                  {student.attendance.attendanceRate}%
                </div>
                <div className="text-sm text-gray-600">출석률</div>
              </div>
            </div>
            <div>
              <span className="font-medium">최근 참석:</span>
              <span className="ml-2">{student.attendance.lastAttendance}</span>
            </div>
          </TabsContent>

          <TabsContent value="performance" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-primary/5 dark:bg-primary/15 rounded-lg">
                <div className="text-2xl font-bold text-primary">
                  {student.performance.overallRating}
                </div>
                <div className="text-sm text-gray-600">종합 평점</div>
              </div>
              <div className="text-center p-4 bg-primary/10 dark:bg-primary/20 rounded-lg">
                <div className="text-2xl font-bold text-primary">
                  {student.performance.behaviorScore}
                </div>
                <div className="text-sm text-gray-600">행동 점수</div>
              </div>
              <div className="text-center p-4 bg-secondary/10 dark:bg-secondary/20 rounded-lg">
                <div className="text-2xl font-bold text-primary">
                  {student.performance.learningSpeed}
                </div>
                <div className="text-sm text-gray-600">학습 속도</div>
              </div>
              <div className="text-center p-4 bg-secondary/10 dark:bg-secondary/20 rounded-lg">
                <div className="text-2xl font-bold text-secondary-foreground">
                  {student.performance.socialSkills}
                </div>
                <div className="text-sm text-gray-600">사회성</div>
              </div>
            </div>
            <div>
              <span className="font-medium">평가 노트:</span>
              <p className="mt-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm">
                {student.performance.notes}
              </p>
            </div>
          </TabsContent>

          <TabsContent value="payment" className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-primary/10 dark:bg-primary/20 rounded-lg">
                <div className="text-lg font-bold text-primary">
                  {student.payments.totalAmount.toLocaleString()}원
                </div>
                <div className="text-sm text-gray-600">총 금액</div>
              </div>
              <div className="text-center p-4 bg-success/10 dark:bg-success/20 rounded-lg">
                <div className="text-lg font-bold text-success">
                  {student.payments.paidAmount.toLocaleString()}원
                </div>
                <div className="text-sm text-gray-600">결제완료</div>
              </div>
              <div className="text-center p-4 bg-destructive/10 dark:bg-destructive/20 rounded-lg">
                <div className="text-lg font-bold text-destructive">
                  {student.payments.pendingAmount.toLocaleString()}원
                </div>
                <div className="text-sm text-gray-600">미납금</div>
              </div>
            </div>
            <div>
              <span className="font-medium">최근 결제:</span>
              <span className="ml-2">{student.payments.lastPayment}</span>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            닫기
          </Button>
          <Button>
            <MessageSquare className="h-4 w-4 mr-2" />
            알림장 작성
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
