import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Syringe, Calendar, MapPin, Phone, Clock, CheckCircle, AlertCircle, Ban } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { GoogleMapView } from '@/components/GoogleMapView';

interface Pet {
  id: number;
  name: string;
  breed: string;
  age: number;
  ownerId: number;
}

interface Vaccination {
  id: number;
  userId: number;
  petId: number;
  vaccineName: string;
  vaccineType: string;
  vaccineDate: string;
  status: 'scheduled' | 'completed' | 'overdue' | 'cancelled';
  hospitalName?: string;
  hospitalAddress?: string;
  hospitalLatitude?: number;
  hospitalLongitude?: number;
  hospitalPhone?: string;
  notes?: string;
  nextDueDate?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface Hospital {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  phone?: string;
}

export default function VaccinationSchedulePage() {
  const [selectedPetId, setSelectedPetId] = useState<number | null>(null);
  const [isVaccinationDialogOpen, setIsVaccinationDialogOpen] = useState(false);
  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null);
  const [isHospitalMapOpen, setIsHospitalMapOpen] = useState(false);
  const [nearbyHospitals, setNearbyHospitals] = useState<any[]>([]);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // 현재 사용자 정보 조회
  const { data: userData } = useQuery({
    queryKey: ['/api/auth/me']
  });

  // 반려동물 목록 조회
  const { data: petsData } = useQuery({
    queryKey: ['/api/pets'],
    enabled: !!userData?.user
  });

  const pets = petsData?.pets || [];
  const selectedPet = pets.find((pet: Pet) => pet.id === selectedPetId) || pets[0];

  // 사용자의 모든 예방접종 스케줄 조회
  const { data: vaccinationsData } = useQuery({
    queryKey: ['/api/vaccinations/user', userData?.user?.id],
    enabled: !!userData?.user?.id
  });

  const vaccinations = vaccinationsData?.vaccinations || [];

  // 선택된 반려동물의 예방접종 스케줄 필터링
  const petVaccinations = selectedPet 
    ? vaccinations.filter((v: Vaccination) => v.petId === selectedPet.id)
    : [];

  // 다가오는 예방접종 스케줄 조회
  const { data: upcomingData } = useQuery({
    queryKey: ['/api/vaccinations/upcoming', userData?.user?.id],
    enabled: !!userData?.user?.id
  });

  const upcomingVaccinations = upcomingData?.vaccinations || [];

  // 예방접종 스케줄 생성
  const createVaccinationMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('/api/vaccinations', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/vaccinations/user'] });
      queryClient.invalidateQueries({ queryKey: ['/api/vaccinations/upcoming'] });
      setIsVaccinationDialogOpen(false);
      setSelectedHospital(null);
      toast({ title: "예방접종 스케줄이 등록되었습니다" });
    },
    onError: (error: any) => {
      toast({ 
        title: "예방접종 스케줄 등록 실패", 
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // 예방접종 스케줄 수정
  const updateVaccinationMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: any }) => {
      return await apiRequest(`/api/vaccinations/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/vaccinations/user'] });
      queryClient.invalidateQueries({ queryKey: ['/api/vaccinations/upcoming'] });
      toast({ title: "예방접종 스케줄이 수정되었습니다" });
    }
  });

  // 예방접종 스케줄 삭제
  const deleteVaccinationMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest(`/api/vaccinations/${id}`, {
        method: 'DELETE'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/vaccinations/user'] });
      queryClient.invalidateQueries({ queryKey: ['/api/vaccinations/upcoming'] });
      toast({ title: "예방접종 스케줄이 삭제되었습니다" });
    }
  });

  // 사용자 위치 가져오기
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.error('위치 정보를 가져올 수 없습니다:', error);
        }
      );
    }
  }, []);

  // 주변 동물병원 검색
  const searchNearbyHospitals = async () => {
    if (!userLocation) {
      toast({ 
        title: "위치 정보 필요", 
        description: "현재 위치를 가져올 수 없습니다.",
        variant: "destructive"
      });
      return;
    }

    try {
      const response = await fetch(`/api/locations/search?query=동물병원&lat=${userLocation.lat}&lng=${userLocation.lng}&radius=5000`);
      const data = await response.json();
      
      if (data.success && data.places) {
        setNearbyHospitals(data.places.map((place: any) => ({
          name: place.name,
          address: place.address,
          latitude: place.latitude,
          longitude: place.longitude,
          phone: place.phone
        })));
        setIsHospitalMapOpen(true);
      }
    } catch (error) {
      console.error('병원 검색 오류:', error);
      toast({ 
        title: "병원 검색 실패", 
        description: "주변 병원을 찾을 수 없습니다.",
        variant: "destructive"
      });
    }
  };

  const handleVaccinationSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    if (!selectedPet) {
      toast({ 
        title: "반려동물 선택 필요", 
        description: "먼저 반려동물을 선택해주세요.",
        variant: "destructive"
      });
      return;
    }

    const data = {
      userId: userData?.user?.id,
      petId: selectedPet.id,
      vaccineName: formData.get('vaccineName'),
      vaccineType: formData.get('vaccineType'),
      vaccineDate: formData.get('vaccineDate'),
      status: formData.get('status') || 'scheduled',
      hospitalName: selectedHospital?.name || formData.get('hospitalName'),
      hospitalAddress: selectedHospital?.address || formData.get('hospitalAddress'),
      hospitalLatitude: selectedHospital?.latitude,
      hospitalLongitude: selectedHospital?.longitude,
      hospitalPhone: selectedHospital?.phone || formData.get('hospitalPhone'),
      notes: formData.get('notes'),
      nextDueDate: formData.get('nextDueDate') || null
    };

    createVaccinationMutation.mutate(data);
  };

  const handleStatusChange = (vaccinationId: number, newStatus: string) => {
    updateVaccinationMutation.mutate({
      id: vaccinationId,
      data: { status: newStatus }
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4 text-success" />;
      case 'overdue': return <AlertCircle className="w-4 h-4 text-destructive" />;
      case 'cancelled': return <Ban className="w-4 h-4 text-gray-600" />;
      default: return <Clock className="w-4 h-4 text-primary" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: { [key: string]: { label: string, variant: any } } = {
      scheduled: { label: '예정', variant: 'default' },
      completed: { label: '완료', variant: 'secondary' },
      overdue: { label: '지연', variant: 'destructive' },
      cancelled: { label: '취소', variant: 'outline' }
    };
    const statusInfo = statusMap[status] || statusMap.scheduled;
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">예방접종 스케줄 관리</h1>
        <p className="text-gray-600">반려동물의 예방접종 일정을 관리하고 병원 정보를 저장하세요</p>
      </div>

      {/* 반려동물 선택 */}
      {pets.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Syringe className="w-5 h-5 text-primary" />
              반려동물 선택
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3 flex-wrap">
              {pets.map((pet: Pet) => (
                <Button
                  key={pet.id}
                  variant={selectedPet?.id === pet.id ? "default" : "outline"}
                  onClick={() => setSelectedPetId(pet.id)}
                  className="flex items-center gap-2"
                  data-testid={`button-select-pet-${pet.id}`}
                >
                  {pet.name} ({pet.breed})
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {selectedPet && (
        <Tabs defaultValue="all" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="all" data-testid="tab-all-vaccinations">
              <Calendar className="w-4 h-4 mr-2" />
              전체 스케줄
            </TabsTrigger>
            <TabsTrigger value="upcoming" data-testid="tab-upcoming-vaccinations">
              <Clock className="w-4 h-4 mr-2" />
              다가오는 일정
            </TabsTrigger>
          </TabsList>

          {/* 전체 스케줄 탭 */}
          <TabsContent value="all">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>{selectedPet.name}의 예방접종 스케줄</CardTitle>
                  <Dialog open={isVaccinationDialogOpen} onOpenChange={setIsVaccinationDialogOpen}>
                    <DialogTrigger asChild>
                      <Button data-testid="button-add-vaccination">
                        <Plus className="w-4 h-4 mr-2" />
                        일정 추가
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>예방접종 스케줄 추가</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleVaccinationSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="vaccineName">백신명 *</Label>
                            <Input 
                              id="vaccineName" 
                              name="vaccineName" 
                              required 
                              placeholder="예: DHPPL, 광견병"
                              data-testid="input-vaccine-name"
                            />
                          </div>
                          <div>
                            <Label htmlFor="vaccineType">백신 종류 *</Label>
                            <Select name="vaccineType" required>
                              <SelectTrigger data-testid="select-vaccine-type">
                                <SelectValue placeholder="백신 종류 선택" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="종합백신">종합백신</SelectItem>
                                <SelectItem value="광견병">광견병</SelectItem>
                                <SelectItem value="코로나">코로나</SelectItem>
                                <SelectItem value="켄넬코프">켄넬코프</SelectItem>
                                <SelectItem value="인플루엔자">인플루엔자</SelectItem>
                                <SelectItem value="기타">기타</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="vaccineDate">접종 예정일 *</Label>
                            <Input 
                              id="vaccineDate" 
                              name="vaccineDate" 
                              type="date" 
                              required 
                              data-testid="input-vaccine-date"
                            />
                          </div>
                          <div>
                            <Label htmlFor="nextDueDate">다음 접종 예정일</Label>
                            <Input 
                              id="nextDueDate" 
                              name="nextDueDate" 
                              type="date" 
                              data-testid="input-next-due-date"
                            />
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="status">상태</Label>
                          <Select name="status" defaultValue="scheduled">
                            <SelectTrigger data-testid="select-status">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="scheduled">예정</SelectItem>
                              <SelectItem value="completed">완료</SelectItem>
                              <SelectItem value="overdue">지연</SelectItem>
                              <SelectItem value="cancelled">취소</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="border-t pt-4">
                          <div className="flex justify-between items-center mb-3">
                            <Label className="text-base font-semibold">병원 정보</Label>
                            <Button 
                              type="button" 
                              variant="outline" 
                              size="sm"
                              onClick={searchNearbyHospitals}
                              data-testid="button-search-hospitals"
                            >
                              <MapPin className="w-4 h-4 mr-2" />
                              지도에서 선택
                            </Button>
                          </div>
                          
                          {selectedHospital && (
                            <div className="mb-3 p-3 bg-success/10 dark:bg-success/20 border border-success/30 dark:border-success/50 rounded-lg">
                              <p className="font-medium text-success dark:text-success/70">{selectedHospital.name}</p>
                              <p className="text-sm text-success dark:text-success">{selectedHospital.address}</p>
                              {selectedHospital.phone && (
                                <p className="text-sm text-success dark:text-success">{selectedHospital.phone}</p>
                              )}
                            </div>
                          )}

                          <div className="grid grid-cols-1 gap-3">
                            <div>
                              <Label htmlFor="hospitalName">병원명</Label>
                              <Input 
                                id="hospitalName" 
                                name="hospitalName" 
                                defaultValue={selectedHospital?.name || ''}
                                data-testid="input-hospital-name"
                              />
                            </div>
                            <div>
                              <Label htmlFor="hospitalAddress">병원 주소</Label>
                              <Input 
                                id="hospitalAddress" 
                                name="hospitalAddress" 
                                defaultValue={selectedHospital?.address || ''}
                                data-testid="input-hospital-address"
                              />
                            </div>
                            <div>
                              <Label htmlFor="hospitalPhone">병원 전화번호</Label>
                              <Input 
                                id="hospitalPhone" 
                                name="hospitalPhone" 
                                defaultValue={selectedHospital?.phone || ''}
                                placeholder="02-1234-5678"
                                data-testid="input-hospital-phone"
                              />
                            </div>
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="notes">메모</Label>
                          <Textarea 
                            id="notes" 
                            name="notes" 
                            placeholder="특이사항이나 주의할 점을 메모하세요"
                            data-testid="input-notes"
                          />
                        </div>

                        <Button 
                          type="submit" 
                          className="w-full"
                          disabled={createVaccinationMutation.isPending}
                          data-testid="button-submit-vaccination"
                        >
                          {createVaccinationMutation.isPending ? '등록 중...' : '스케줄 등록'}
                        </Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {petVaccinations.length > 0 ? (
                    petVaccinations.map((vaccination: Vaccination) => (
                      <div 
                        key={vaccination.id} 
                        className="p-4 border rounded-lg hover:shadow-md transition-shadow"
                        data-testid={`vaccination-card-${vaccination.id}`}
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(vaccination.status)}
                            <h3 className="font-semibold text-lg">{vaccination.vaccineName}</h3>
                          </div>
                          <div className="flex gap-2">
                            {getStatusBadge(vaccination.status)}
                            <Badge variant="outline">{vaccination.vaccineType}</Badge>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-600 dark:text-gray-400">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            <span>접종일: {new Date(vaccination.vaccineDate).toLocaleDateString('ko-KR')}</span>
                          </div>
                          
                          {vaccination.nextDueDate && (
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4" />
                              <span>다음 접종: {new Date(vaccination.nextDueDate).toLocaleDateString('ko-KR')}</span>
                            </div>
                          )}

                          {vaccination.hospitalName && (
                            <div className="flex items-center gap-2 col-span-full">
                              <MapPin className="w-4 h-4" />
                              <span>{vaccination.hospitalName}</span>
                            </div>
                          )}

                          {vaccination.hospitalAddress && (
                            <div className="text-xs col-span-full ml-6">
                              {vaccination.hospitalAddress}
                            </div>
                          )}

                          {vaccination.hospitalPhone && (
                            <div className="flex items-center gap-2 col-span-full">
                              <Phone className="w-4 h-4" />
                              <span>{vaccination.hospitalPhone}</span>
                            </div>
                          )}

                          {vaccination.notes && (
                            <div className="col-span-full p-2 bg-gray-50 dark:bg-gray-800 rounded">
                              <p className="text-xs">{vaccination.notes}</p>
                            </div>
                          )}
                        </div>

                        <div className="mt-3 flex gap-2">
                          <Select 
                            value={vaccination.status}
                            onValueChange={(value) => handleStatusChange(vaccination.id, value)}
                          >
                            <SelectTrigger className="w-32" data-testid={`select-status-${vaccination.id}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="scheduled">예정</SelectItem>
                              <SelectItem value="completed">완료</SelectItem>
                              <SelectItem value="overdue">지연</SelectItem>
                              <SelectItem value="cancelled">취소</SelectItem>
                            </SelectContent>
                          </Select>
                          
                          <Button 
                            variant="destructive" 
                            size="sm"
                            onClick={() => {
                              if (confirm('정말 삭제하시겠습니까?')) {
                                deleteVaccinationMutation.mutate(vaccination.id);
                              }
                            }}
                            data-testid={`button-delete-${vaccination.id}`}
                          >
                            삭제
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12">
                      <Syringe className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                      <p className="text-gray-500">등록된 예방접종 스케줄이 없습니다.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 다가오는 일정 탭 */}
          <TabsContent value="upcoming">
            <Card>
              <CardHeader>
                <CardTitle>다가오는 예방접종 일정 (30일 이내)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {upcomingVaccinations.filter((v: Vaccination) => v.petId === selectedPet.id).length > 0 ? (
                    upcomingVaccinations
                      .filter((v: Vaccination) => v.petId === selectedPet.id)
                      .map((vaccination: Vaccination) => {
                        const daysUntil = Math.ceil(
                          (new Date(vaccination.vaccineDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
                        );
                        
                        return (
                          <div 
                            key={vaccination.id} 
                            className={`p-4 border rounded-lg ${
                              daysUntil <= 7 ? 'border-destructive/40 bg-destructive/10 dark:bg-destructive/20' : 'border-warning/40 bg-warning/10 dark:bg-warning/20'
                            }`}
                            data-testid={`upcoming-vaccination-${vaccination.id}`}
                          >
                            <div className="flex justify-between items-start mb-2">
                              <h3 className="font-semibold">{vaccination.vaccineName}</h3>
                              <Badge variant={daysUntil <= 7 ? 'destructive' : 'default'}>
                                D-{daysUntil}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {new Date(vaccination.vaccineDate).toLocaleDateString('ko-KR')} ({vaccination.vaccineType})
                            </p>
                            {vaccination.hospitalName && (
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                {vaccination.hospitalName}
                              </p>
                            )}
                          </div>
                        );
                      })
                  ) : (
                    <div className="text-center py-12">
                      <Clock className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                      <p className="text-gray-500">30일 이내에 예정된 접종이 없습니다.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {pets.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Syringe className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium mb-2">등록된 반려동물이 없습니다</h3>
            <p className="text-gray-500">먼저 반려동물을 등록해 주세요</p>
          </CardContent>
        </Card>
      )}

      {/* 병원 선택 지도 다이얼로그 */}
      <Dialog open={isHospitalMapOpen} onOpenChange={setIsHospitalMapOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>주변 동물병원 선택</DialogTitle>
          </DialogHeader>
          <div className="h-[500px]">
            {userLocation && (
              <GoogleMapView
                center={userLocation}
                zoom={14}
                markers={nearbyHospitals.map((hospital, index) => ({
                  id: `hospital-${index}`,
                  position: { lat: hospital.latitude, lng: hospital.longitude },
                  title: hospital.name,
                  onClick: () => {
                    setSelectedHospital(hospital);
                    setIsHospitalMapOpen(false);
                    toast({ title: `${hospital.name}이(가) 선택되었습니다` });
                  }
                }))}
                userLocation={userLocation}
              />
            )}
          </div>
          <div className="mt-4 max-h-40 overflow-y-auto">
            <h4 className="font-semibold mb-2">검색된 병원 목록:</h4>
            <div className="space-y-2">
              {nearbyHospitals.map((hospital, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setSelectedHospital(hospital);
                    setIsHospitalMapOpen(false);
                    toast({ title: `${hospital.name}이(가) 선택되었습니다` });
                  }}
                  className="w-full text-left p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  data-testid={`hospital-option-${index}`}
                >
                  <p className="font-medium">{hospital.name}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{hospital.address}</p>
                  {hospital.phone && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">{hospital.phone}</p>
                  )}
                </button>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
