import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { 
  Building,
  Calendar,
  Clock,
  Users,
  MapPin,
  Settings,
  Plus,
  Edit,
  Trash2,
  Eye,
  CheckCircle,
  XCircle,
  AlertCircle,
  Search,
  Filter,
  Download,
  Upload,
  Wifi,
  Car,
  Coffee,
  Shield,
  Camera,
  Thermometer,
  Volume2
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';

interface Facility {
  id: number;
  name: string;
  type: 'training_room' | 'outdoor_area' | 'consultation_room' | 'grooming_room' | 'storage';
  description: string;
  capacity: number;
  size: number; // square meters
  location: string;
  amenities: string[];
  status: 'available' | 'maintenance' | 'unavailable';
  hourlyRate: number;
  images: string[];
  equipment: string[];
  rules: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Reservation {
  id: number;
  facilityId: number;
  facility: {
    id: number;
    name: string;
    type: string;
  };
  trainer: {
    id: number;
    name: string;
    email: string;
    avatar?: string;
  };
  student?: {
    id: number;
    name: string;
    pet: {
      name: string;
      breed: string;
    };
  };
  date: string;
  startTime: string;
  endTime: string;
  duration: number; // minutes
  purpose: string;
  status: 'confirmed' | 'pending' | 'cancelled' | 'completed';
  totalCost: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface FacilitySettings {
  id: number;
  operatingHours: {
    weekdays: { start: string; end: string };
    weekends: { start: string; end: string };
  };
  minimumBookingDuration: number; // minutes
  maximumBookingDuration: number; // minutes
  advanceBookingDays: number;
  cancellationPolicy: {
    hours: number;
    refundRate: number;
  };
  autoApproval: boolean;
  requireDeposit: boolean;
  depositRate: number; // percentage
  maintenanceMode: boolean;
  notifications: {
    email: boolean;
    sms: boolean;
    push: boolean;
  };
}

export default function FacilityManagementPage() {
  const { userRole, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [selectedTab, setSelectedTab] = useState('overview');
  const [selectedFacility, setSelectedFacility] = useState<Facility | null>(null);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [isFacilityDetailOpen, setIsFacilityDetailOpen] = useState(false);
  const [isReservationDetailOpen, setIsReservationDetailOpen] = useState(false);
  const [isCreateFacilityOpen, setIsCreateFacilityOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('today');
  const [statusFilter, setStatusFilter] = useState('all');

  // 시설 목록 조회
  const { data: facilities, isLoading: facilitiesLoading } = useQuery({
    queryKey: ['/api/institute/facilities'],
    queryFn: async () => {
      return [
        {
          id: 1,
          name: "메인 훈련장 A",
          type: 'training_room',
          description: "넓은 실내 훈련장으로 기초 복종 훈련에 최적화된 공간입니다.",
          capacity: 8,
          size: 120,
          location: "1층 서쪽",
          amenities: ["에어컨", "히터", "음향시설", "CCTV", "WiFi"],
          status: 'available',
          hourlyRate: 50000,
          images: ["/facilities/room-a-1.jpg", "/facilities/room-a-2.jpg"],
          equipment: ["장애물 세트", "훈련용 매트", "간식 보관함", "물그릇", "청소용품"],
          rules: ["실내화 착용 필수", "펫 배변 처리 책임", "장비 정리 후 퇴실"],
          isActive: true,
          createdAt: "2024-01-15T10:00:00Z",
          updatedAt: "2025-01-20T14:30:00Z"
        },
        {
          id: 2,
          name: "야외 운동장",
          type: 'outdoor_area',
          description: "대형견도 자유롭게 뛸 수 있는 넓은 야외 공간입니다.",
          capacity: 12,
          size: 300,
          location: "건물 뒤편",
          amenities: ["그늘막", "벤치", "정수기", "CCTV"],
          status: 'available',
          hourlyRate: 30000,
          images: ["/facilities/outdoor-1.jpg"],
          equipment: ["어질리티 장비", "프리스비", "공", "로프", "안전 펜스"],
          rules: ["날씨 확인 후 이용", "안전사고 주의", "장비 파손 시 배상"],
          isActive: true,
          createdAt: "2024-01-15T10:00:00Z",
          updatedAt: "2025-01-18T09:00:00Z"
        },
        {
          id: 3,
          name: "상담실 1",
          type: 'consultation_room',
          description: "개별 상담 및 행동 분석을 위한 전용 공간입니다.",
          capacity: 3,
          size: 25,
          location: "2층 동쪽",
          amenities: ["에어컨", "소음차단", "화이트보드", "WiFi"],
          status: 'maintenance',
          hourlyRate: 25000,
          images: ["/facilities/consult-1.jpg"],
          equipment: ["상담 테이블", "의자", "행동 분석 도구", "카메라", "녹음기"],
          rules: ["조용한 환경 유지", "개인정보 보호", "기록 작성 필수"],
          isActive: true,
          createdAt: "2024-01-15T10:00:00Z",
          updatedAt: "2025-01-19T11:00:00Z"
        },
        {
          id: 4,
          name: "그루밍룸",
          type: 'grooming_room',
          description: "전문 그루밍 및 미용을 위한 시설이 완비된 공간입니다.",
          capacity: 2,
          size: 35,
          location: "1층 동쪽",
          amenities: ["온수", "배수시설", "환풍기", "조명"],
          status: 'available',
          hourlyRate: 40000,
          images: ["/facilities/grooming-1.jpg"],
          equipment: ["그루밍 테이블", "드라이어", "가위", "브러시", "샴푸"],
          rules: ["예약제 운영", "도구 소독 필수", "물기 제거 후 퇴실"],
          isActive: true,
          createdAt: "2024-02-01T10:00:00Z",
          updatedAt: "2025-01-15T16:00:00Z"
        }
      ] as Facility[];
    },
    enabled: isAuthenticated
  });

  // 예약 현황 조회
  const { data: reservations, isLoading: reservationsLoading } = useQuery({
    queryKey: ['/api/institute/reservations', dateFilter],
    queryFn: async () => {
      return [
        {
          id: 1,
          facilityId: 1,
          facility: { id: 1, name: "메인 훈련장 A", type: "training_room" },
          trainer: { id: 1, name: "김민수", email: "kim@example.com", avatar: "/avatars/trainer1.jpg" },
          student: { 
            id: 1, 
            name: "홍길동", 
            pet: { name: "멍멍이", breed: "골든 리트리버" }
          },
          date: "2025-01-22",
          startTime: "10:00",
          endTime: "11:00",
          duration: 60,
          purpose: "기초 복종 훈련",
          status: 'confirmed',
          totalCost: 50000,
          notes: "첫 수업이므로 기본 평가 포함",
          createdAt: "2025-01-20T14:30:00Z",
          updatedAt: "2025-01-21T09:00:00Z"
        },
        {
          id: 2,
          facilityId: 2,
          facility: { id: 2, name: "야외 운동장", type: "outdoor_area" },
          trainer: { id: 2, name: "이준호", email: "lee@example.com" },
          student: { 
            id: 2, 
            name: "김영희", 
            pet: { name: "바둑이", breed: "보더 콜리" }
          },
          date: "2025-01-22",
          startTime: "14:00",
          endTime: "15:30",
          duration: 90,
          purpose: "어질리티 훈련",
          status: 'confirmed',
          totalCost: 45000,
          createdAt: "2025-01-21T10:00:00Z",
          updatedAt: "2025-01-21T10:00:00Z"
        },
        {
          id: 3,
          facilityId: 1,
          facility: { id: 1, name: "메인 훈련장 A", type: "training_room" },
          trainer: { id: 3, name: "박지혜", email: "park@example.com" },
          date: "2025-01-22",
          startTime: "16:00",
          endTime: "17:00",
          duration: 60,
          purpose: "행동 교정 상담",
          status: 'pending',
          totalCost: 50000,
          notes: "새로운 학생 상담",
          createdAt: "2025-01-21T15:00:00Z",
          updatedAt: "2025-01-21T15:00:00Z"
        }
      ] as Reservation[];
    },
    enabled: isAuthenticated
  });

  // 시설 설정 조회
  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ['/api/institute/facility-settings'],
    queryFn: async () => {
      return {
        id: 1,
        operatingHours: {
          weekdays: { start: "09:00", end: "18:00" },
          weekends: { start: "10:00", end: "17:00" }
        },
        minimumBookingDuration: 60,
        maximumBookingDuration: 240,
        advanceBookingDays: 30,
        cancellationPolicy: {
          hours: 24,
          refundRate: 80
        },
        autoApproval: false,
        requireDeposit: true,
        depositRate: 30,
        maintenanceMode: false,
        notifications: {
          email: true,
          sms: true,
          push: false
        }
      } as FacilitySettings;
    },
    enabled: isAuthenticated
  });

  // 예약 승인/거부
  const updateReservationMutation = useMutation({
    mutationFn: async ({ id, action, notes }: { id: number; action: 'approve' | 'reject' | 'cancel'; notes?: string }) => {
      console.log('예약 상태 변경:', { id, action, notes });
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/institute/reservations'] });
      toast({
        title: "예약 상태 변경 완료",
        description: "예약 상태가 성공적으로 변경되었습니다."
      });
    }
  });

  // 시설 설정 업데이트
  const updateSettingsMutation = useMutation({
    mutationFn: async (newSettings: Partial<FacilitySettings>) => {
      console.log('시설 설정 업데이트:', newSettings);
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/institute/facility-settings'] });
      toast({
        title: "설정 저장 완료",
        description: "시설 설정이 성공적으로 저장되었습니다."
      });
    }
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'available':
        return <Badge variant="success">이용가능</Badge>;
      case 'maintenance':
        return <Badge variant="warning">점검중</Badge>;
      case 'unavailable':
        return <Badge variant="danger">이용불가</Badge>;
      case 'confirmed':
        return <Badge variant="success">확정</Badge>;
      case 'pending':
        return <Badge variant="warning">대기</Badge>;
      case 'cancelled':
        return <Badge variant="danger">취소</Badge>;
      case 'completed':
        return <Badge variant="outline">완료</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getFacilityTypeIcon = (type: string) => {
    switch (type) {
      case 'training_room':
        return <Building className="h-5 w-5 text-primary" />;
      case 'outdoor_area':
        return <MapPin className="h-5 w-5 text-success" />;
      case 'consultation_room':
        return <Users className="h-5 w-5 text-primary" />;
      case 'grooming_room':
        return <Coffee className="h-5 w-5 text-primary" />;
      default:
        return <Building className="h-5 w-5 text-gray-600" />;
    }
  };

  const getFacilityTypeName = (type: string) => {
    switch (type) {
      case 'training_room': return '훈련실';
      case 'outdoor_area': return '야외 운동장';
      case 'consultation_room': return '상담실';
      case 'grooming_room': return '그루밍룸';
      case 'storage': return '창고';
      default: return type;
    }
  };

  const filteredReservations = reservations?.filter(reservation => {
    const matchesSearch = reservation.trainer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         reservation.facility.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (reservation.student?.name.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || reservation.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">시설 관리</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            시설 현황, 예약 관리 및 설정을 관리하세요
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            예약 내역 다운로드
          </Button>
          <Dialog open={isCreateFacilityOpen} onOpenChange={setIsCreateFacilityOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                새 시설 등록
              </Button>
            </DialogTrigger>
          </Dialog>
        </div>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">시설 현황</TabsTrigger>
          <TabsTrigger value="reservations">예약 현황</TabsTrigger>
          <TabsTrigger value="calendar">예약 캘린더</TabsTrigger>
          <TabsTrigger value="settings">시설 설정</TabsTrigger>
        </TabsList>

        {/* 시설 현황 */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">총 시설</p>
                    <p className="text-2xl font-bold">{facilities?.length || 0}</p>
                  </div>
                  <Building className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">이용 가능</p>
                    <p className="text-2xl font-bold text-success">
                      {facilities?.filter(f => f.status === 'available').length || 0}
                    </p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-success" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">점검 중</p>
                    <p className="text-2xl font-bold text-warning">
                      {facilities?.filter(f => f.status === 'maintenance').length || 0}
                    </p>
                  </div>
                  <AlertCircle className="h-8 w-8 text-warning" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">오늘 예약</p>
                    <p className="text-2xl font-bold text-primary">
                      {reservations?.filter(r => r.date === '2025-01-22').length || 0}
                    </p>
                  </div>
                  <Calendar className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4">
            {facilitiesLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-6">
                      <div className="h-6 bg-gray-200 rounded w-1/3 mb-2"></div>
                      <div className="h-4 bg-gray-200 rounded w-2/3 mb-4"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              facilities?.map((facility: Facility) => (
                <Card 
                  key={facility.id} 
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => {
                    setSelectedFacility(facility);
                    setIsFacilityDetailOpen(true);
                  }}
                >
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {getFacilityTypeIcon(facility.type)}
                          <h3 className="text-xl font-semibold">{facility.name}</h3>
                          {getStatusBadge(facility.status)}
                          <Badge variant="outline">{getFacilityTypeName(facility.type)}</Badge>
                        </div>
                        
                        <p className="text-gray-600 dark:text-gray-400 mb-3">{facility.description}</p>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500">위치:</span>
                            <span className="font-medium ml-1">{facility.location}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">수용 인원:</span>
                            <span className="font-medium ml-1">{facility.capacity}명</span>
                          </div>
                          <div>
                            <span className="text-gray-500">면적:</span>
                            <span className="font-medium ml-1">{facility.size}㎡</span>
                          </div>
                          <div>
                            <span className="text-gray-500">시간당 요금:</span>
                            <span className="font-medium ml-1">{facility.hourlyRate.toLocaleString()}원</span>
                          </div>
                        </div>

                        <div className="mt-3">
                          <span className="text-sm text-gray-500">편의시설:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {facility.amenities.slice(0, 5).map((amenity, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">{amenity}</Badge>
                            ))}
                            {facility.amenities.length > 5 && (
                              <Badge variant="outline" className="text-xs">+{facility.amenities.length - 5}</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-col gap-2 ml-4">
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-2" />
                          상세보기
                        </Button>
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4 mr-2" />
                          편집
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* 예약 현황 */}
        <TabsContent value="reservations" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="훈련사명, 시설명, 학생명으로 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="날짜 필터" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">오늘</SelectItem>
                <SelectItem value="tomorrow">내일</SelectItem>
                <SelectItem value="week">이번 주</SelectItem>
                <SelectItem value="month">이번 달</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="상태 필터" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value="pending">승인대기</SelectItem>
                <SelectItem value="confirmed">확정</SelectItem>
                <SelectItem value="cancelled">취소</SelectItem>
                <SelectItem value="completed">완료</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4">
            {reservationsLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-6">
                      <div className="h-5 bg-gray-200 rounded w-1/3 mb-2"></div>
                      <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredReservations && filteredReservations.length > 0 ? (
              filteredReservations.map((reservation: Reservation) => (
                <Card 
                  key={reservation.id} 
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => {
                    setSelectedReservation(reservation);
                    setIsReservationDetailOpen(true);
                  }}
                >
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {getFacilityTypeIcon(reservation.facility.type)}
                          <h3 className="text-lg font-semibold">{reservation.facility.name}</h3>
                          {getStatusBadge(reservation.status)}
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                          <div>
                            <span className="text-gray-500">훈련사:</span>
                            <span className="font-medium ml-1">{reservation.trainer.name}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">날짜:</span>
                            <span className="font-medium ml-1">{reservation.date}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">시간:</span>
                            <span className="font-medium ml-1">{reservation.startTime} - {reservation.endTime}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">비용:</span>
                            <span className="font-medium ml-1">{reservation.totalCost.toLocaleString()}원</span>
                          </div>
                        </div>

                        {reservation.student && (
                          <div className="mb-2">
                            <span className="text-gray-500 text-sm">수강생:</span>
                            <span className="font-medium ml-1">{reservation.student.name}</span>
                            <span className="text-gray-500 ml-2">({reservation.student.pet.name} - {reservation.student.pet.breed})</span>
                          </div>
                        )}

                        <div>
                          <span className="text-gray-500 text-sm">목적:</span>
                          <span className="ml-1">{reservation.purpose}</span>
                        </div>

                        {reservation.notes && (
                          <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-800 rounded text-sm">
                            <span className="text-gray-500">참고사항:</span> {reservation.notes}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex flex-col gap-2 ml-4">
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-2" />
                          상세보기
                        </Button>
                        {reservation.status === 'pending' && (
                          <>
                            <Button 
                              variant="default" 
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                updateReservationMutation.mutate({ id: reservation.id, action: 'approve' });
                              }}
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              승인
                            </Button>
                            <Button 
                              variant="destructive" 
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                updateReservationMutation.mutate({ id: reservation.id, action: 'reject' });
                              }}
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              거부
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="text-center py-8">
                  <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-600 mb-2">
                    {searchTerm || statusFilter !== 'all' ? 
                      '검색 조건에 맞는 예약이 없습니다' : 
                      '예약이 없습니다'
                    }
                  </h3>
                  <p className="text-gray-500">
                    {searchTerm || statusFilter !== 'all' ? 
                      '다른 검색어나 필터를 시도해보세요' : 
                      '새로운 예약을 기다리고 있습니다'
                    }
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* 예약 캘린더 */}
        <TabsContent value="calendar" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>예약 캘린더</CardTitle>
              <CardDescription>시설별 예약 현황을 한눈에 확인하세요</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-96 flex items-center justify-center text-gray-500">
                캘린더 컴포넌트 (향후 구현)
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 시설 설정 */}
        <TabsContent value="settings" className="space-y-4">
          {settingsLoading ? (
            <Card className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
                <div className="space-y-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-4 bg-gray-200 rounded w-2/3"></div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : settings && (
            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>운영 시간</CardTitle>
                  <CardDescription>시설 이용 가능 시간을 설정하세요</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>평일 운영시간</Label>
                      <div className="flex gap-2 mt-1">
                        <Input 
                          type="time" 
                          defaultValue={settings.operatingHours.weekdays.start}
                          className="flex-1"
                        />
                        <span className="flex items-center">~</span>
                        <Input 
                          type="time" 
                          defaultValue={settings.operatingHours.weekdays.end}
                          className="flex-1"
                        />
                      </div>
                    </div>
                    <div>
                      <Label>주말 운영시간</Label>
                      <div className="flex gap-2 mt-1">
                        <Input 
                          type="time" 
                          defaultValue={settings.operatingHours.weekends.start}
                          className="flex-1"
                        />
                        <span className="flex items-center">~</span>
                        <Input 
                          type="time" 
                          defaultValue={settings.operatingHours.weekends.end}
                          className="flex-1"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>예약 정책</CardTitle>
                  <CardDescription>예약 관련 규정을 설정하세요</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>최소 예약 시간 (분)</Label>
                      <Input 
                        type="number" 
                        defaultValue={settings.minimumBookingDuration}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>최대 예약 시간 (분)</Label>
                      <Input 
                        type="number" 
                        defaultValue={settings.maximumBookingDuration}
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>사전 예약 가능 일수</Label>
                      <Input 
                        type="number" 
                        defaultValue={settings.advanceBookingDays}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>취소 가능 시간 (시간 전)</Label>
                      <Input 
                        type="number" 
                        defaultValue={settings.cancellationPolicy.hours}
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>자동 승인</Label>
                      <p className="text-sm text-gray-500">예약 요청을 자동으로 승인합니다</p>
                    </div>
                    <Switch 
                      checked={settings.autoApproval}
                      onCheckedChange={(checked) => 
                        updateSettingsMutation.mutate({ autoApproval: checked })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>보증금 필요</Label>
                      <p className="text-sm text-gray-500">예약 시 보증금을 받습니다</p>
                    </div>
                    <Switch 
                      checked={settings.requireDeposit}
                      onCheckedChange={(checked) => 
                        updateSettingsMutation.mutate({ requireDeposit: checked })
                      }
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>알림 설정</CardTitle>
                  <CardDescription>예약 관련 알림 방식을 설정하세요</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>이메일 알림</Label>
                      <p className="text-sm text-gray-500">예약 확정/취소 시 이메일로 알림</p>
                    </div>
                    <Switch 
                      checked={settings.notifications.email}
                      onCheckedChange={(checked) => 
                        updateSettingsMutation.mutate({ 
                          notifications: { ...settings.notifications, email: checked }
                        })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>SMS 알림</Label>
                      <p className="text-sm text-gray-500">예약 확정/취소 시 SMS로 알림</p>
                    </div>
                    <Switch 
                      checked={settings.notifications.sms}
                      onCheckedChange={(checked) => 
                        updateSettingsMutation.mutate({ 
                          notifications: { ...settings.notifications, sms: checked }
                        })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>푸시 알림</Label>
                      <p className="text-sm text-gray-500">앱 푸시 알림</p>
                    </div>
                    <Switch 
                      checked={settings.notifications.push}
                      onCheckedChange={(checked) => 
                        updateSettingsMutation.mutate({ 
                          notifications: { ...settings.notifications, push: checked }
                        })
                      }
                    />
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end gap-2">
                <Button variant="outline">
                  <Settings className="h-4 w-4 mr-2" />
                  고급 설정
                </Button>
                <Button>
                  설정 저장
                </Button>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}