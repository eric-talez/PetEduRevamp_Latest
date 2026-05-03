import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft,
  ClipboardList,
  PawPrint,
  User,
  Target,
  AlertTriangle,
  Clock,
  Footprints,
  UtensilsCrossed,
  Brain,
  GraduationCap,
  Star,
  Save,
  Loader2
} from 'lucide-react';

const TEMPERAMENT_LEVELS = [
  { value: 'A', label: 'A등급 - 사회성 양호', description: '다른 사람/동물에 대해 우호적이며 안정적', color: 'bg-green-100 text-green-800 border-green-300' },
  { value: 'B', label: 'B등급 - 흥분 조절 필요', description: '흥분 시 자제력이 부족하나 공격성은 없음', color: 'bg-blue-100 text-blue-800 border-blue-300' },
  { value: 'C', label: 'C등급 - 짖음/경계', description: '낯선 자극에 짖거나 경계하는 행동을 보임', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
  { value: 'D', label: 'D등급 - 공격성 주의', description: '특정 상황에서 공격적 행동 가능성 있음', color: 'bg-orange-100 text-orange-800 border-orange-300' },
  { value: 'E', label: 'E등급 - 분리불안', description: '보호자 분리 시 심한 불안 증세를 보임', color: 'bg-red-100 text-red-800 border-red-300' },
];

export default function ConsultationForm() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedOwnerId, setSelectedOwnerId] = useState<string>('');
  const [selectedPetId, setSelectedPetId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [formData, setFormData] = useState({
    visitPurpose: '',
    mainProblemBehavior: '',
    behaviorTiming: '',
    behaviorTarget: '',
    recentChanges: '',
    walkDuration: '',
    mealPattern: '',
    ownerReactionStyle: '',
    previousTrainingExperience: '',
    desiredGoal: '',
    temperamentLevel: '',
    additionalNotes: '',
  });

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const { data: ownerPetsData, isLoading: isOwnerPetsLoading } = useQuery<{ success: boolean; ownerPets: any[] }>({
    queryKey: ['/api/pets/all-owners', debouncedSearch],
    queryFn: async () => {
      if (!debouncedSearch || debouncedSearch.length < 2) return { success: true, ownerPets: [] };
      const res = await fetch(`/api/pets/all-owners?q=${encodeURIComponent(debouncedSearch)}`, { credentials: 'include' });
      if (!res.ok) throw new Error('검색 실패');
      return res.json();
    },
    enabled: debouncedSearch.length >= 2,
  });

  const ownerPets = ownerPetsData?.ownerPets || [];
  const uniqueOwners = Array.from(new Map(ownerPets.map((op: any) => [op.ownerId, { id: op.ownerId, name: op.ownerName }])).values());
  const filteredPets = ownerPets.filter((op: any) => String(op.ownerId) === selectedOwnerId);

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest('POST', '/api/consultation-records', data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "저장 완료", description: "상담 기록이 성공적으로 저장되었습니다." });
      queryClient.invalidateQueries({ queryKey: ['/api/consultation-records'] });
      setLocation('/consultation-records');
    },
    onError: (error: any) => {
      toast({ title: "저장 실패", description: error.message || "상담 기록 저장 중 오류가 발생했습니다.", variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPetId || !selectedOwnerId || !formData.visitPurpose || !formData.mainProblemBehavior) {
      toast({ title: "입력 오류", description: "필수 항목을 모두 입력해주세요.", variant: "destructive" });
      return;
    }
    createMutation.mutate({
      petId: Number(selectedPetId),
      ownerId: Number(selectedOwnerId),
      ...formData,
    });
  };

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="outline" size="sm" onClick={() => setLocation('/consultation-records')}>
          <ArrowLeft className="w-4 h-4 mr-1" />
          뒤로
        </Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-primary" />
            첫 방문 상담 기록지
          </h1>
          <p className="text-sm text-muted-foreground mt-1">반려견의 첫 방문 상담 내용을 기록합니다</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="w-5 h-5 text-blue-500" />
              보호자 및 반려동물 정보
            </CardTitle>
            <CardDescription>상담 대상 보호자와 반려동물을 선택해주세요</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="search">보호자/반려동물 검색 *</Label>
              <Input
                id="search"
                placeholder="보호자 이름 또는 반려동물 이름으로 검색 (2자 이상)"
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setSelectedOwnerId(''); setSelectedPetId(''); }}
              />
              {isOwnerPetsLoading && <p className="text-sm text-muted-foreground mt-1">검색 중...</p>}
            </div>

            {uniqueOwners.length > 0 && (
              <div>
                <Label htmlFor="owner">보호자 선택 *</Label>
                <Select value={selectedOwnerId} onValueChange={(val) => { setSelectedOwnerId(val); setSelectedPetId(''); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="보호자를 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    {uniqueOwners.map((owner: any) => (
                      <SelectItem key={owner.id} value={String(owner.id)}>
                        {owner.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {selectedOwnerId && (
              <div>
                <Label htmlFor="pet">반려동물 선택 *</Label>
                <Select value={selectedPetId} onValueChange={setSelectedPetId}>
                  <SelectTrigger>
                    <SelectValue placeholder="반려동물을 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredPets.map((pet: any) => (
                      <SelectItem key={pet.petId} value={String(pet.petId)}>
                        {pet.petName} ({pet.petBreed || '품종 미등록'}, {pet.petAge || '?'}세)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {filteredPets.length === 0 && (
                  <p className="text-sm text-muted-foreground mt-1">등록된 반려동물이 없습니다.</p>
                )}
              </div>
            )}

            {isOwnerPetsLoading && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">데이터를 불러오는 중...</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="w-5 h-5 text-red-500" />
              방문 목적 및 주요 문제 행동
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="visitPurpose">방문 목적 *</Label>
              <Textarea
                id="visitPurpose"
                value={formData.visitPurpose}
                onChange={(e) => updateField('visitPurpose', e.target.value)}
                placeholder="예: 첫 방문 상담, 행동 교정, 기초 훈련 등"
                className="min-h-[80px]"
              />
            </div>
            <div>
              <Label htmlFor="mainProblemBehavior">주요 문제 행동 *</Label>
              <Textarea
                id="mainProblemBehavior"
                value={formData.mainProblemBehavior}
                onChange={(e) => updateField('mainProblemBehavior', e.target.value)}
                placeholder="예: 다른 개에게 짖음, 산책 시 끌기, 분리 불안 등"
                className="min-h-[80px]"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="w-5 h-5 text-orange-500" />
              행동 세부 정보
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="behaviorTiming">행동 발생 시기/상황</Label>
              <Textarea
                id="behaviorTiming"
                value={formData.behaviorTiming}
                onChange={(e) => updateField('behaviorTiming', e.target.value)}
                placeholder="예: 산책 중 다른 개를 만났을 때, 초인종이 울릴 때 등"
              />
            </div>
            <div>
              <Label htmlFor="behaviorTarget">행동 대상</Label>
              <Input
                id="behaviorTarget"
                value={formData.behaviorTarget}
                onChange={(e) => updateField('behaviorTarget', e.target.value)}
                placeholder="예: 다른 개, 낯선 사람, 가족 등"
              />
            </div>
            <div>
              <Label htmlFor="recentChanges">최근 환경 변화</Label>
              <Textarea
                id="recentChanges"
                value={formData.recentChanges}
                onChange={(e) => updateField('recentChanges', e.target.value)}
                placeholder="예: 최근 이사, 가족 구성원 변화, 새 반려동물 합류 등"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Footprints className="w-5 h-5 text-green-500" />
              일상 패턴
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="walkDuration">산책 시간/빈도</Label>
                <Input
                  id="walkDuration"
                  value={formData.walkDuration}
                  onChange={(e) => updateField('walkDuration', e.target.value)}
                  placeholder="예: 하루 2회, 회당 30분"
                />
              </div>
              <div>
                <Label htmlFor="mealPattern">식사 패턴</Label>
                <Input
                  id="mealPattern"
                  value={formData.mealPattern}
                  onChange={(e) => updateField('mealPattern', e.target.value)}
                  placeholder="예: 하루 2회, 사료 + 간식"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="ownerReactionStyle">보호자 반응 스타일</Label>
              <Textarea
                id="ownerReactionStyle"
                value={formData.ownerReactionStyle}
                onChange={(e) => updateField('ownerReactionStyle', e.target.value)}
                placeholder="예: 문제 행동 시 혼내기, 무시하기, 달래기 등"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-primary" />
              훈련 이력 및 목표
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="previousTrainingExperience">이전 훈련 경험</Label>
              <Textarea
                id="previousTrainingExperience"
                value={formData.previousTrainingExperience}
                onChange={(e) => updateField('previousTrainingExperience', e.target.value)}
                placeholder="예: 없음, 기초 훈련 수료, 다른 훈련소 경험 등"
              />
            </div>
            <div>
              <Label htmlFor="desiredGoal">보호자 희망 목표</Label>
              <Textarea
                id="desiredGoal"
                value={formData.desiredGoal}
                onChange={(e) => updateField('desiredGoal', e.target.value)}
                placeholder="예: 산책 시 끌지 않기, 다른 개와 평화롭게 지내기 등"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-500" />
              성향 등급 평가
            </CardTitle>
            <CardDescription>상담 결과에 따라 반려견의 성향 등급을 평가합니다</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {TEMPERAMENT_LEVELS.map((level) => (
              <label
                key={level.value}
                className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                  formData.temperamentLevel === level.value
                    ? level.color + ' border-current shadow-sm'
                    : 'border-gray-200 hover:border-gray-300 dark:border-gray-700'
                }`}
              >
                <input
                  type="radio"
                  name="temperamentLevel"
                  value={level.value}
                  checked={formData.temperamentLevel === level.value}
                  onChange={(e) => updateField('temperamentLevel', e.target.value)}
                  className="mt-1 w-4 h-4"
                />
                <div>
                  <div className="font-medium">{level.label}</div>
                  <div className="text-sm text-muted-foreground">{level.description}</div>
                </div>
              </label>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Brain className="w-5 h-5 text-indigo-500" />
              추가 메모
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              id="additionalNotes"
              value={formData.additionalNotes}
              onChange={(e) => updateField('additionalNotes', e.target.value)}
              placeholder="기타 상담 내용이나 훈련사 소견을 자유롭게 작성하세요"
              className="min-h-[120px]"
            />
          </CardContent>
        </Card>

        <div className="flex gap-3 justify-end">
          <Button type="button" variant="outline" onClick={() => setLocation('/consultation-records')}>
            취소
          </Button>
          <Button type="submit" disabled={createMutation.isPending} className="min-w-[120px]">
            {createMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                저장 중...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                상담 기록 저장
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
