import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation, Link } from 'wouter';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  ArrowLeft, 
  Calendar, 
  Weight, 
  Heart, 
  Activity, 
  Syringe,
  Clock,
  MapPin,
  Phone,
  Mail,
  Edit,
  Plus,
  Fingerprint
} from 'lucide-react';

const TEMPERAMENT_BADGE: Record<string, { label: string; color: string }> = {
  A: { label: 'A - 사회성 양호', color: 'bg-green-100 text-green-800' },
  B: { label: 'B - 흥분 조절', color: 'bg-blue-100 text-blue-800' },
  C: { label: 'C - 짖음/경계', color: 'bg-yellow-100 text-yellow-800' },
  D: { label: 'D - 공격성 주의', color: 'bg-orange-100 text-orange-800' },
  E: { label: 'E - 분리불안', color: 'bg-red-100 text-red-800' },
};

interface Pet {
  id: number;
  name: string;
  breed: string;
  age: number;
  ownerId: number;
  gender?: string;
  weight?: number;
  description?: string;
  health?: string;
  temperament?: string;
  temperamentLevel?: string;
  allergies?: string;
  avatar?: string;
}

interface Vaccination {
  id: number;
  petId: number;
  vaccineName: string;
  vaccineType: string;
  vaccineDate: string;
  nextDueDate?: string;
  veterinarian?: string;
  clinicName?: string;
  notes?: string;
}

interface HealthCheckup {
  id: number;
  petId: number;
  checkupDate: string;
  weight?: number;
  temperature?: string;
  diagnosis?: string;
  treatment?: string;
  veterinarian?: string;
  clinicName?: string;
  notes?: string;
  nextCheckupDate?: string;
}

export default function PetDetailPage() {
  const [location] = useLocation();
  const petId = location.split('/').pop();
  const { toast } = useToast();

  // 반려동물 정보 조회
  const { data: petData, isLoading: isPetLoading } = useQuery({
    queryKey: [`/api/pets/${petId}`],
    enabled: !!petId
  });

  // 예방접종 기록 조회
  const { data: vaccinationsData, isLoading: isVaccinationsLoading } = useQuery({
    queryKey: [`/api/pets/${petId}/vaccinations`],
    enabled: !!petId
  });

  // 건강검진 기록 조회
  const { data: checkupsData, isLoading: isCheckupsLoading } = useQuery({
    queryKey: [`/api/pets/${petId}/checkups`],
    enabled: !!petId
  });

  const { data: noseProfileData } = useQuery<{ success: boolean; profile: { representativeImageUrl: string; qualityScore: number; version: number } | null }>({
    queryKey: ["/api/pets", petId, "nose", "profile"],
    queryFn: async () => {
      const res = await fetch(`/api/pets/${petId}/nose/profile`, { credentials: "include" });
      if (!res.ok) return { success: false, profile: null };
      return res.json();
    },
    enabled: !!petId,
  });

  const pet: Pet = petData?.pet;
  const vaccinations: Vaccination[] = vaccinationsData?.vaccinations || [];
  const checkups: HealthCheckup[] = checkupsData?.checkups || [];
  const noseProfile = noseProfileData?.profile;

  if (isPetLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!pet) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">반려동물을 찾을 수 없습니다</h2>
          <Link href="/pet-care/health-record">
            <Button>건강관리 페이지로 돌아가기</Button>
          </Link>
        </div>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR');
  };

  const getVaccinationStatus = (vaccination: Vaccination) => {
    if (!vaccination.nextDueDate) return 'completed';
    const nextDue = new Date(vaccination.nextDueDate);
    const today = new Date();
    const diffDays = Math.ceil((nextDue.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'overdue';
    if (diffDays <= 30) return 'due-soon';
    return 'current';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'overdue':
        return <Badge variant="destructive">기한 초과</Badge>;
      case 'due-soon':
        return <Badge variant="outline" className="border-yellow-500 text-yellow-600">접종 예정</Badge>;
      case 'current':
        return <Badge variant="outline" className="border-green-500 text-green-600">접종 완료</Badge>;
      default:
        return <Badge variant="outline">완료</Badge>;
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      {/* 헤더 */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/pet-care/health-record">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            뒤로가기
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">{pet.name}의 케어일지</h1>
      </div>

      {/* 반려동물 기본 정보 카드 */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex items-start gap-6">
            <Avatar className="w-24 h-24">
              <AvatarFallback className="text-2xl">
                {pet.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-4">
                <h2 className="text-3xl font-bold">{pet.name}</h2>
                <Badge variant="outline" className="text-sm">
                  {pet.age}세
                </Badge>
                {pet.gender && (
                  <Badge variant="outline" className="text-sm">
                    {pet.gender}
                  </Badge>
                )}
                {pet.temperamentLevel && TEMPERAMENT_BADGE[pet.temperamentLevel] && (
                  <Badge className={`text-sm ${TEMPERAMENT_BADGE[pet.temperamentLevel].color}`}>
                    {TEMPERAMENT_BADGE[pet.temperamentLevel].label}
                  </Badge>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Heart className="w-4 h-4 text-red-500" />
                  <span className="font-medium">견종:</span>
                  <span>{pet.breed}</span>
                </div>
                {pet.weight && (
                  <div className="flex items-center gap-2">
                    <Weight className="w-4 h-4 text-blue-500" />
                    <span className="font-medium">체중:</span>
                    <span>{pet.weight}kg</span>
                  </div>
                )}
                {pet.temperament && (
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-green-500" />
                    <span className="font-medium">성격:</span>
                    <span>{pet.temperament}</span>
                  </div>
                )}
                {pet.health && (
                  <div className="flex items-center gap-2">
                    <Heart className="w-4 h-4 text-primary" />
                    <span className="font-medium">건강상태:</span>
                    <span>{pet.health}</span>
                  </div>
                )}
              </div>
              {pet.description && (
                <div className="mt-4">
                  <p className="text-gray-600">{pet.description}</p>
                </div>
              )}
              {pet.allergies && (
                <div className="mt-4">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-red-600">알레르기:</span>
                    <span className="text-red-600">{pet.allergies}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 코 프린트 인증 섹션 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Fingerprint className="w-5 h-5 text-primary" />
            코 프린트 인증
          </CardTitle>
          <Link href={`/institute/nose-enroll/${petId}`}>
            <Button size="sm" variant={noseProfile ? "outline" : "default"}>
              {noseProfile ? "재등록" : "코 등록하기"}
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {noseProfile ? (
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                <Fingerprint className="w-8 h-8 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-green-700">코 프린트 등록 완료</p>
                <p className="text-sm text-muted-foreground">
                  품질 점수: {noseProfile.qualityScore}점 · 버전 {noseProfile.version}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
                <Fingerprint className="w-8 h-8 text-gray-400" />
              </div>
              <div>
                <p className="font-medium text-gray-600">코 프린트 미등록</p>
                <p className="text-sm text-muted-foreground">
                  방문 인증을 위해 코 프린트를 등록해주세요 (3~5장)
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 상세 정보 탭 */}
      <Tabs defaultValue="vaccinations" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="vaccinations" className="flex items-center gap-2">
            <Syringe className="w-4 h-4" />
            예방접종
          </TabsTrigger>
          <TabsTrigger value="checkups" className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            건강검진
          </TabsTrigger>
          <TabsTrigger value="consultations" className="flex items-center gap-2">
            <Edit className="w-4 h-4" />
            상담 이력
          </TabsTrigger>
        </TabsList>

        {/* 예방접종 기록 탭 */}
        <TabsContent value="vaccinations">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>예방접종 기록</CardTitle>
              <Link href="/pet-care/health-record">
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  접종 기록 추가
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {isVaccinationsLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse h-20 bg-gray-200 rounded"></div>
                  ))}
                </div>
              ) : vaccinations.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Syringe className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>예방접종 기록이 없습니다.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {vaccinations.map((vaccination) => (
                    <div
                      key={vaccination.id}
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-medium text-lg">{vaccination.vaccineName}</h3>
                          <p className="text-sm text-gray-600">{vaccination.vaccineType}</p>
                        </div>
                        {getStatusBadge(getVaccinationStatus(vaccination))}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-blue-500" />
                          <span>접종일: {formatDate(vaccination.vaccineDate)}</span>
                        </div>
                        {vaccination.nextDueDate && (
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-orange-500" />
                            <span>다음 접종일: {formatDate(vaccination.nextDueDate)}</span>
                          </div>
                        )}
                        {vaccination.veterinarian && (
                          <div className="flex items-center gap-2">
                            <span className="font-medium">수의사:</span>
                            <span>{vaccination.veterinarian}</span>
                          </div>
                        )}
                        {vaccination.clinicName && (
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-green-500" />
                            <span>{vaccination.clinicName}</span>
                          </div>
                        )}
                      </div>
                      
                      {vaccination.notes && (
                        <div className="mt-3 p-3 bg-gray-50 rounded">
                          <p className="text-sm">{vaccination.notes}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 건강검진 기록 탭 */}
        <TabsContent value="checkups">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>건강검진 기록</CardTitle>
              <Link href="/pet-care/health-record">
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  검진 기록 추가
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {isCheckupsLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse h-20 bg-gray-200 rounded"></div>
                  ))}
                </div>
              ) : checkups.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>건강검진 기록이 없습니다.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {checkups.map((checkup) => (
                    <div
                      key={checkup.id}
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-blue-500" />
                          <span className="font-medium">검진일: {formatDate(checkup.checkupDate)}</span>
                        </div>
                        {checkup.nextCheckupDate && (
                          <Badge variant="outline" className="text-xs">
                            다음 검진: {formatDate(checkup.nextCheckupDate)}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-3">
                        {checkup.weight && (
                          <div className="flex items-center gap-2">
                            <Weight className="w-4 h-4 text-green-500" />
                            <span>체중: {checkup.weight}kg</span>
                          </div>
                        )}
                        {checkup.temperature && (
                          <div className="flex items-center gap-2">
                            <Activity className="w-4 h-4 text-red-500" />
                            <span>체온: {checkup.temperature}°C</span>
                          </div>
                        )}
                        {checkup.veterinarian && (
                          <div className="flex items-center gap-2">
                            <span className="font-medium">수의사:</span>
                            <span>{checkup.veterinarian}</span>
                          </div>
                        )}
                        {checkup.clinicName && (
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-green-500" />
                            <span>{checkup.clinicName}</span>
                          </div>
                        )}
                      </div>
                      
                      {checkup.diagnosis && (
                        <div className="mb-3">
                          <span className="font-medium text-sm">진단:</span>
                          <p className="text-sm mt-1">{checkup.diagnosis}</p>
                        </div>
                      )}
                      
                      {checkup.treatment && (
                        <div className="mb-3">
                          <span className="font-medium text-sm">치료내용:</span>
                          <p className="text-sm mt-1">{checkup.treatment}</p>
                        </div>
                      )}
                      
                      {checkup.notes && (
                        <div className="p-3 bg-gray-50 rounded">
                          <span className="font-medium text-sm">특이사항:</span>
                          <p className="text-sm mt-1">{checkup.notes}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 상담 이력 탭 */}
        <TabsContent value="consultations">
          <ConsultationHistoryTab petId={Number(petId)} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ConsultationHistoryTab({ petId }: { petId: number }) {
  const { data, isLoading } = useQuery<{ success: boolean; consultations: any[] }>({
    queryKey: [`/api/consultation-records/pet/${petId}`],
    enabled: !!petId,
  });

  const consultations = data?.consultations || [];

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const TEMP_LABELS: Record<string, string> = {
    A: 'A - 사회성 양호', B: 'B - 흥분 조절', C: 'C - 짖음/경계',
    D: 'D - 공격성 주의', E: 'E - 분리불안',
  };
  const TEMP_COLORS: Record<string, string> = {
    A: 'bg-green-100 text-green-800', B: 'bg-blue-100 text-blue-800', C: 'bg-yellow-100 text-yellow-800',
    D: 'bg-orange-100 text-orange-800', E: 'bg-red-100 text-red-800',
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>상담 이력</CardTitle>
        <Link href="/consultation-records">
          <Button size="sm" variant="outline">전체 보기</Button>
        </Link>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="animate-pulse h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        ) : consultations.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Edit className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>상담 기록이 없습니다.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {consultations.map((c: any) => (
              <Link key={c.id} href={`/consultation-records/${c.id}`}>
                <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-medium">{c.visitPurpose}</p>
                      <p className="text-sm text-gray-600">훈련사: {c.trainerName || '-'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {c.temperamentLevel && (
                        <Badge className={`text-xs ${TEMP_COLORS[c.temperamentLevel] || ''}`}>
                          {TEMP_LABELS[c.temperamentLevel]}
                        </Badge>
                      )}
                      <span className="text-xs text-gray-500">{formatDate(c.createdAt)}</span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-2">{c.mainProblemBehavior}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}