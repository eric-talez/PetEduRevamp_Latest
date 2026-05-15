
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Edit, Trash2, Heart, Calendar, Weight, Upload, X, User, BookOpen, AlertCircle, Phone, Hospital } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ImageUpload } from '@/components/ImageUpload';
import { PetPassportCard } from '@/components/PetPassportCard';
import { getCSRFToken } from '@/lib/csrf';
import { Loader2, ScanLine } from 'lucide-react';

interface RegistrationCardOcrInfo {
  registrationNumber: string | null;
  petName: string | null;
  breed: string | null;
  birthDate: string | null;
  gender: string | null;
  ownerName: string | null;
  confidence: number;
  formatValid: boolean;
  formatStrict: boolean;
  formatHint: string;
}

function RegistrationCardOcrUploader({
  onExtracted,
}: {
  onExtracted: (info: RegistrationCardOcrInfo) => void;
}) {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [lastResult, setLastResult] = useState<RegistrationCardOcrInfo | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({ title: '이미지 파일만 가능합니다', variant: 'destructive' });
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast({ title: '파일이 너무 큽니다 (최대 8MB)', variant: 'destructive' });
      return;
    }
    setIsUploading(true);
    try {
      const csrf = await getCSRFToken();
      const fd = new FormData();
      fd.append('image', file);
      const res = await fetch('/api/pets/registration-card/ocr', {
        method: 'POST',
        credentials: 'include',
        headers: { 'X-CSRF-Token': csrf },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || '등록증 분석에 실패했습니다');
      }
      setLastResult(data);
      onExtracted(data);
      if (data.registrationNumber) {
        toast({
          title: '등록번호를 자동 입력했습니다',
          description: data.formatHint,
        });
      } else {
        toast({
          title: '등록번호를 인식하지 못했습니다',
          description: data.formatHint,
          variant: 'destructive',
        });
      }
    } catch (e: any) {
      toast({ title: '오류', description: e?.message || '분석 실패', variant: 'destructive' });
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="mb-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
        }}
        data-testid="input-registration-card-photo"
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={isUploading}
        onClick={() => inputRef.current?.click()}
        data-testid="button-ocr-registration-card"
      >
        {isUploading ? (
          <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> 등록증 분석 중…</>
        ) : (
          <><ScanLine className="w-4 h-4 mr-2" /> 등록증 사진으로 자동 입력</>
        )}
      </Button>
      <p className="text-xs text-gray-500 mt-1">
        동물보호관리시스템 발급 등록증을 촬영하면 등록번호를 자동 추출합니다.
      </p>
      {lastResult && (
        <div className="mt-2 text-xs rounded border bg-gray-50 p-2 space-y-0.5">
          <div>인식 신뢰도: <strong>{Math.round((lastResult.confidence || 0) * 100)}%</strong></div>
          {lastResult.registrationNumber && (
            <div className="font-mono">번호: {lastResult.registrationNumber}</div>
          )}
          {lastResult.breed && <div>품종: {lastResult.breed}</div>}
          <div className={lastResult.formatStrict ? 'text-green-700' : 'text-amber-700'}>
            {lastResult.formatHint}
          </div>
        </div>
      )}
    </div>
  );
}

const TEMPERAMENT_BADGE: Record<string, { label: string; color: string }> = {
  A: { label: 'A - 사회성 양호', color: 'bg-success/10 text-success' },
  B: { label: 'B - 흥분 조절', color: 'bg-primary/10 text-primary' },
  C: { label: 'C - 짖음/경계', color: 'bg-warning/10 text-warning' },
  D: { label: 'D - 공격성 주의', color: 'bg-primary/10 text-primary' },
  E: { label: 'E - 분리불안', color: 'bg-destructive/10 text-destructive' },
};

interface Pet {
  id: number;
  name: string;
  species: string;
  breed: string;
  age: number;
  gender: string;
  weight: number;
  color: string;
  personality: string;
  medicalHistory: string;
  specialNotes: string;
  imageUrl?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  temperamentLevel?: string | null;
  trainingStatus: 'not_assigned' | 'assigned' | 'in_progress' | 'completed';
  assignedTrainer?: {
    id: number;
    name: string;
  } | null;
  notebookEnabled: boolean;
  lastNotebookEntry?: string | null;
  trainingType?: string | null;
  trainingStartDate?: string | null;
  registrationNumber?: string | null;
}

interface PetFormData {
  name: string;
  species: string;
  breed: string;
  age: number;
  gender: string;
  weight: number;
  color: string;
  personality: string;
  medicalHistory: string;
  specialNotes: string;
  imageUrl?: string;
  registrationNumber?: string;
}

interface EmergencyFormData {
  contactName: string;
  contactPhone: string;
  designatedHospital: string;
  hospitalPhone: string;
  hospitalAddress: string;
  emergencyTransportConsent: boolean;
}

const defaultEmergencyData: EmergencyFormData = {
  contactName: '',
  contactPhone: '',
  designatedHospital: '',
  hospitalPhone: '',
  hospitalAddress: '',
  emergencyTransportConsent: false,
};

export default function MyPetsPage() {
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPet, setEditingPet] = useState<Pet | null>(null);
  const [emergencyData, setEmergencyData] = useState<EmergencyFormData>({ ...defaultEmergencyData });
  const [existingEmergencyId, setExistingEmergencyId] = useState<number | null>(null);
  const [formData, setFormData] = useState<PetFormData>({
    name: '',
    species: 'dog',
    breed: '',
    age: 0,
    gender: 'male',
    weight: 0,
    color: '',
    personality: '',
    medicalHistory: '',
    specialNotes: '',
    imageUrl: '',
    registrationNumber: ''
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchPets();
  }, []);

  const fetchPets = async () => {
    try {
      const response = await fetch('/api/pets', {
        credentials: 'include'
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          toast({
            title: "인증 오류",
            description: "로그인이 필요합니다.",
            variant: "destructive"
          });
          return;
        }
        throw new Error('Failed to fetch pets');
      }
      
      const data = await response.json();
      setPets(data.pets || []);
    } catch (error) {
      console.error('Error fetching pets:', error);
      toast({
        title: "오류",
        description: "반려동물 목록을 불러오는데 실패했습니다.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const url = editingPet ? `/api/pets/${editingPet.id}` : '/api/pets';
      const method = editingPet ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const result = await response.json();
        console.log('반려동물 등록 성공:', result);
        const petId = editingPet?.id || result.pet?.id;
        if (petId && emergencyData.contactName && emergencyData.contactPhone) {
          try {
            const emergencyUrl = existingEmergencyId
              ? `/api/emergency-contacts/${existingEmergencyId}`
              : '/api/emergency-contacts';
            const emergencyMethod = existingEmergencyId ? 'PUT' : 'POST';
            const emergencyRes = await fetch(emergencyUrl, {
              method: emergencyMethod,
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({ petId, ...emergencyData }),
            });
            if (!emergencyRes.ok) {
              const errData = await emergencyRes.json().catch(() => ({}));
              toast({
                title: "응급 정보 저장 실패",
                description: errData.error || "응급 정보 저장 중 오류가 발생했습니다.",
                variant: "destructive"
              });
            }
          } catch (err) {
            console.error('응급 정보 저장 오류:', err);
            toast({
              title: "응급 정보 저장 오류",
              description: "응급 정보 저장 중 오류가 발생했습니다.",
              variant: "destructive"
            });
          }
        }
        toast({
          title: "성공",
          description: editingPet ? "반려동물 정보가 수정되었습니다." : "새 반려동물이 등록되었습니다."
        });
        setIsDialogOpen(false);
        setEditingPet(null);
        resetForm();
        fetchPets();
      } else {
        const errorData = await response.json();
        console.error('반려동물 등록 실패:', errorData);
        throw new Error(errorData.message || errorData.error || 'Failed to save pet');
      }
    } catch (error: any) {
      console.error('반려동물 저장 오류:', error);
      toast({
        title: "오류",
        description: error.message || "반려동물 정보 저장에 실패했습니다.",
        variant: "destructive"
      });
    }
  };

  const handleEdit = async (pet: Pet) => {
    setEditingPet(pet);
    setFormData({
      name: pet.name,
      species: pet.species,
      breed: pet.breed,
      age: pet.age,
      gender: pet.gender,
      weight: pet.weight,
      color: pet.color,
      personality: pet.personality,
      medicalHistory: pet.medicalHistory,
      specialNotes: pet.specialNotes,
      imageUrl: pet.imageUrl || '',
      registrationNumber: pet.registrationNumber || ''
    });
    try {
      const res = await fetch(`/api/emergency-contacts/${pet.id}`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        const contacts = data.contacts || [];
        if (contacts.length > 0) {
          const c = contacts[0];
          setEmergencyData({
            contactName: c.contactName || '',
            contactPhone: c.contactPhone || '',
            designatedHospital: c.designatedHospital || '',
            hospitalPhone: c.hospitalPhone || '',
            hospitalAddress: c.hospitalAddress || '',
            emergencyTransportConsent: c.emergencyTransportConsent || false,
          });
          setExistingEmergencyId(c.id);
        } else {
          setEmergencyData({ ...defaultEmergencyData });
          setExistingEmergencyId(null);
        }
      }
    } catch {
      setEmergencyData({ ...defaultEmergencyData });
      setExistingEmergencyId(null);
    }
    setIsDialogOpen(true);
  };

  const handleDelete = async (petId: number) => {
    if (!confirm('정말로 이 반려동물을 삭제하시겠습니까?')) return;

    try {
      const response = await fetch(`/api/pets/${petId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        toast({
          title: "성공",
          description: "반려동물이 삭제되었습니다."
        });
        fetchPets();
      }
    } catch (error) {
      toast({
        title: "오류",
        description: "반려동물 삭제에 실패했습니다.",
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setEmergencyData({ ...defaultEmergencyData });
    setExistingEmergencyId(null);
    setFormData({
      name: '',
      species: 'dog',
      breed: '',
      age: 0,
      gender: 'male',
      weight: 0,
      color: '',
      personality: '',
      medicalHistory: '',
      specialNotes: '',
      imageUrl: '',
      registrationNumber: ''
    });
  };

  const openNewPetDialog = () => {
    setEditingPet(null);
    resetForm();
    setIsDialogOpen(true);
  };

  const handleRemoveImage = () => {
    setFormData({ ...formData, imageUrl: '' });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 파일 크기 검증 (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "파일 크기 오류",
        description: "이미지 파일은 5MB 이하여야 합니다.",
        variant: "destructive"
      });
      return;
    }

    // 파일 타입 검증
    if (!file.type.startsWith('image/')) {
      toast({
        title: "파일 형식 오류",
        description: "이미지 파일만 업로드 가능합니다.",
        variant: "destructive"
      });
      return;
    }

    try {
      // FormData로 파일 업로드
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch('/api/upload/image', {
        method: 'POST',
        credentials: 'include',
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        setFormData(prev => ({ ...prev, imageUrl: data.url }));
        toast({
          title: "업로드 성공",
          description: "이미지가 성공적으로 업로드되었습니다."
        });
      } else {
        throw new Error('업로드 실패');
      }
    } catch (error) {
      toast({
        title: "업로드 실패",
        description: "이미지 업로드 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-gray-900 dark:text-white">반려동물 정보를 불러오는 중...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">내 반려동물</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">소중한 반려동물들의 정보를 관리하세요</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNewPetDialog} variant="outline" className="flex items-center gap-2 text-success border-success/40 hover:bg-success/10 hover:text-success/90 hover:border-success/40 transition-all duration-200">
              <Plus className="w-4 h-4" />
              반려동물 등록
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingPet ? '반려동물 정보 수정' : '새 반려동물 등록'}
              </DialogTitle>
              <DialogDescription>
                반려동물의 기본 정보를 입력해주세요.
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* 프로필 이미지 업로드 섹션 */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Label>프로필 사진</Label>
                  <Badge variant="secondary" className="text-xs">선택사항</Badge>
                </div>
                
                <div className="flex items-start gap-4">
                  {/* 이미지 미리보기 */}
                  <div className="flex-shrink-0">
                    {formData.imageUrl ? (
                      <div className="relative">
                        <img 
                          src={formData.imageUrl} 
                          alt="반려동물 프로필 사진" 
                          className="w-32 h-32 object-cover rounded-xl border-2 border-gray-200 shadow-sm"
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          className="absolute -top-2 -right-2 w-7 h-7 p-0 rounded-full shadow-md bg-white hover:bg-gray-100 border"
                          onClick={handleRemoveImage}
                        >
                          <X className="w-4 h-4 text-gray-600" />
                        </Button>
                      </div>
                    ) : (
                      <div className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center bg-gray-50">
                        <Upload className="w-8 h-8 text-gray-400" />
                      </div>
                    )}
                  </div>

                  {/* 업로드 컨트롤 */}
                  <div className="flex-1 space-y-3">
                    {!formData.imageUrl ? (
                      <div className="space-y-2">
                        <Label htmlFor="imageFile">프로필 사진 업로드 (선택사항)</Label>
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-gray-400 transition-colors">
                          <input
                            id="imageFile"
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            className="hidden"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => document.getElementById('imageFile')?.click()}
                            className="flex items-center gap-2"
                          >
                            <Upload className="w-4 h-4" />
                            사진 선택
                          </Button>
                          <p className="text-xs text-gray-500 mt-2">
                            JPG, PNG, GIF 파일 지원 (최대 5MB)
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-sm text-success font-medium">이미지가 업로드되었습니다</p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setFormData({ ...formData, imageUrl: '' })}
                          className="flex items-center gap-2"
                        >
                          <Upload className="w-4 h-4" />
                          다른 사진 선택
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">이름 *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="species">종류 *</Label>
                  <Select value={formData.species} onValueChange={(value) => setFormData({ ...formData, species: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dog">강아지</SelectItem>
                      <SelectItem value="cat">고양이</SelectItem>
                      <SelectItem value="rabbit">토끼</SelectItem>
                      <SelectItem value="bird">새</SelectItem>
                      <SelectItem value="other">기타</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="breed">품종</Label>
                  <Input
                    id="breed"
                    value={formData.breed}
                    onChange={(e) => setFormData({ ...formData, breed: e.target.value })}
                  />
                </div>
                
                <div>
                  <Label htmlFor="age">나이</Label>
                  <Input
                    id="age"
                    type="number"
                    value={formData.age}
                    onChange={(e) => setFormData({ ...formData, age: parseInt(e.target.value) || 0 })}
                  />
                </div>
                
                <div>
                  <Label htmlFor="gender">성별</Label>
                  <Select value={formData.gender} onValueChange={(value) => setFormData({ ...formData, gender: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">수컷</SelectItem>
                      <SelectItem value="female">암컷</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="weight">몸무게 (kg)</Label>
                  <Input
                    id="weight"
                    type="number"
                    step="0.1"
                    value={formData.weight}
                    onChange={(e) => setFormData({ ...formData, weight: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                
                <div className="col-span-2">
                  <Label htmlFor="color">색상</Label>
                  <Input
                    id="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  />
                </div>
                
                <div className="col-span-2">
                  <Label htmlFor="registrationNumber">
                    강아지 등록번호 <span className="text-xs text-gray-500">(예방접종 QR 여권 발급 시 필요)</span>
                  </Label>
                  <RegistrationCardOcrUploader
                    onExtracted={(info) => {
                      setFormData((prev) => ({
                        ...prev,
                        registrationNumber: info.registrationNumber || prev.registrationNumber,
                        breed: !prev.breed && info.breed ? info.breed : prev.breed,
                      }));
                    }}
                  />
                  <Input
                    id="registrationNumber"
                    value={formData.registrationNumber || ''}
                    onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value.toUpperCase() })}
                    placeholder="예: 410123456789012 (등록증 사진을 올리면 자동 입력)"
                    maxLength={30}
                    className="mt-2"
                    data-testid="input-registration-number"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    한국 동물보호관리시스템(animal.go.kr) 발급 등록번호 — 보통 410으로 시작하는 15자리 숫자
                  </p>
                </div>

                <div className="col-span-2">
                  <Label htmlFor="personality">성격</Label>
                  <Textarea
                    id="personality"
                    value={formData.personality}
                    onChange={(e) => setFormData({ ...formData, personality: e.target.value })}
                    placeholder="반려동물의 성격을 설명해주세요"
                  />
                </div>
                
                <div className="col-span-2">
                  <Label htmlFor="medicalHistory">병력</Label>
                  <Textarea
                    id="medicalHistory"
                    value={formData.medicalHistory}
                    onChange={(e) => setFormData({ ...formData, medicalHistory: e.target.value })}
                    placeholder="병력이나 알레르기 등을 기록해주세요"
                  />
                </div>
                
                <div className="col-span-2">
                  <Label htmlFor="specialNotes">특이사항</Label>
                  <Textarea
                    id="specialNotes"
                    value={formData.specialNotes}
                    onChange={(e) => setFormData({ ...formData, specialNotes: e.target.value })}
                    placeholder="특별히 주의할 점이나 기타 사항을 기록해주세요"
                  />
                </div>
              </div>

              <div className="border-t pt-4 mt-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <Hospital className="w-4 h-4" />
                  응급 정보
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="contactName">비상 연락처 이름 *</Label>
                    <Input
                      id="contactName"
                      value={emergencyData.contactName}
                      onChange={(e) => setEmergencyData({ ...emergencyData, contactName: e.target.value })}
                      placeholder="보호자 또는 비상 연락 대상"
                    />
                  </div>
                  <div>
                    <Label htmlFor="contactPhone">비상 연락처 전화번호 *</Label>
                    <Input
                      id="contactPhone"
                      value={emergencyData.contactPhone}
                      onChange={(e) => setEmergencyData({ ...emergencyData, contactPhone: e.target.value })}
                      placeholder="010-0000-0000"
                    />
                  </div>
                  <div>
                    <Label htmlFor="designatedHospital">지정 병원</Label>
                    <Input
                      id="designatedHospital"
                      value={emergencyData.designatedHospital}
                      onChange={(e) => setEmergencyData({ ...emergencyData, designatedHospital: e.target.value })}
                      placeholder="지정 동물병원 이름"
                    />
                  </div>
                  <div>
                    <Label htmlFor="hospitalPhone">병원 전화번호</Label>
                    <Input
                      id="hospitalPhone"
                      value={emergencyData.hospitalPhone}
                      onChange={(e) => setEmergencyData({ ...emergencyData, hospitalPhone: e.target.value })}
                      placeholder="02-1234-5678"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="hospitalAddress">병원 주소</Label>
                    <Input
                      id="hospitalAddress"
                      value={emergencyData.hospitalAddress}
                      onChange={(e) => setEmergencyData({ ...emergencyData, hospitalAddress: e.target.value })}
                      placeholder="병원 주소"
                    />
                  </div>
                  <div className="col-span-2 flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="emergencyTransportConsent"
                      checked={emergencyData.emergencyTransportConsent}
                      onChange={(e) => setEmergencyData({ ...emergencyData, emergencyTransportConsent: e.target.checked })}
                      className="rounded border-gray-300"
                    />
                    <Label htmlFor="emergencyTransportConsent" className="text-sm cursor-pointer">
                      응급 시 지정 병원으로의 이송에 동의합니다
                    </Label>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  취소
                </Button>
                <Button type="submit" variant="outline" className="text-primary border-primary/40 hover:bg-primary/10 hover:text-primary/90 hover:border-primary/40 transition-all duration-200">
                  {editingPet ? '수정' : '등록'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {pets.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Heart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">등록된 반려동물이 없습니다</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">첫 번째 반려동물을 등록해보세요!</p>
            <Button onClick={openNewPetDialog} variant="outline" className="text-success border-success/40 hover:bg-success/10 hover:text-success/90 hover:border-success/40 transition-all duration-200">
              <Plus className="w-4 h-4 mr-2" />
              반려동물 등록
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pets.map((pet) => (
            <Card key={pet.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              {/* 반려동물 프로필 이미지 - 맨 위로 이동 */}
              <div className="w-full h-48 overflow-hidden bg-gradient-to-br from-primary to-secondary/5 relative">
                {pet.imageUrl ? (
                  <img 
                    src={pet.imageUrl} 
                    alt={`${pet.name}의 프로필 사진`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-6xl mb-2">
                        {pet.species === 'dog' ? '🐶' : pet.species === 'cat' ? '🐱' : '🐾'}
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{pet.name}</p>
                    </div>
                  </div>
                )}
                
                {/* 수정/삭제 버튼을 이미지 위에 오버레이로 배치 */}
                <div className="absolute top-2 right-2 flex gap-1">
                  <Button size="sm" variant="outline" className="w-8 h-8 p-0 text-primary border-primary/40 hover:bg-primary/10 hover:text-primary/90 hover:border-primary/40 transition-all duration-200" onClick={() => handleEdit(pet)}>
                    <Edit className="w-3 h-3" />
                  </Button>
                  <Button size="sm" variant="outline" className="w-8 h-8 p-0 text-destructive border-destructive/40 hover:bg-destructive/10 hover:text-destructive/90 hover:border-destructive/40 transition-all duration-200" onClick={() => handleDelete(pet.id)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              
              <CardHeader className="pb-3">
                <div>
                  <CardTitle className="text-xl text-gray-900 dark:text-white">{pet.name}</CardTitle>
                  <CardDescription className="text-gray-600 dark:text-gray-400">
                    {pet.species === 'dog' ? '🐶' : pet.species === 'cat' ? '🐱' : '🐾'} {pet.breed}
                  </CardDescription>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">
                    <Calendar className="w-3 h-3 mr-1" />
                    {pet.age}세
                  </Badge>
                  <Badge variant="secondary">
                    <Weight className="w-3 h-3 mr-1" />
                    {pet.weight}kg
                  </Badge>
                  <Badge variant="outline">
                    {pet.gender === 'male' ? '♂' : '♀'}
                  </Badge>
                  {pet.temperamentLevel && TEMPERAMENT_BADGE[pet.temperamentLevel] && (
                    <Badge className={`text-xs ${TEMPERAMENT_BADGE[pet.temperamentLevel].color}`}>
                      {TEMPERAMENT_BADGE[pet.temperamentLevel].label}
                    </Badge>
                  )}
                </div>
                
                {pet.color && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    <strong>색상:</strong> {pet.color}
                  </p>
                )}
                
                {pet.personality && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    <strong>성격:</strong> {pet.personality}
                  </p>
                )}
                
                {pet.specialNotes && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    <strong>특이사항:</strong> {pet.specialNotes}
                  </p>
                )}
                
                {/* 훈련소 매칭 상태 표시 */}
                <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border">
                  <div className="flex items-center gap-2 text-sm mb-2">
                    <User className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                    <span className="font-medium text-gray-700 dark:text-gray-300">훈련 상태</span>
                  </div>
                  
                  {pet.trainingStatus === 'not_assigned' ? (
                    <div className="space-y-2">
                      <Badge variant="secondary" className="text-xs">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        훈련사 미배정
                      </Badge>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        훈련사를 배정하면 일대일 맞춤 훈련과 정기 알림장 서비스를 받을 수 있습니다.
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="default" className="text-xs">
                          {pet.trainingStatus === 'assigned' && '훈련사 배정완료'}
                          {pet.trainingStatus === 'in_progress' && '훈련 진행중'}
                          {pet.trainingStatus === 'completed' && '훈련 완료'}
                        </Badge>
                        {pet.notebookEnabled && (
                          <Badge variant="outline" className="text-xs">
                            <BookOpen className="h-3 w-3 mr-1" />
                            알림장 활성화
                          </Badge>
                        )}
                      </div>
                      
                      {pet.assignedTrainer && (
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          <strong>담당 훈련사:</strong> {pet.assignedTrainer.name}
                        </div>
                      )}
                      
                      {pet.trainingType && (
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          <strong>훈련 종류:</strong> {pet.trainingType}
                        </div>
                      )}
                      
                      {pet.trainingStartDate && (
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          <strong>훈련 시작일:</strong> {new Date(pet.trainingStartDate).toLocaleDateString()}
                        </div>
                      )}
                      
                      {pet.lastNotebookEntry && (
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          <strong>최근 알림장:</strong> {pet.lastNotebookEntry}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                {pet.registrationNumber && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    <strong>등록번호:</strong> <span className="font-mono">{pet.registrationNumber}</span>
                  </p>
                )}

                <div className="pt-2">
                  <PetPassportCard petId={pet.id} petName={pet.name} />
                </div>

                <div className="text-xs text-gray-500 dark:text-gray-400 pt-2 border-t">
                  등록일: {new Date(pet.createdAt).toLocaleDateString()}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
