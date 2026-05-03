import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, PawPrint, Building, Calendar, ClipboardList } from "lucide-react";

interface PetOption {
  id: number;
  name: string | null;
  breed: string | null;
  species: string | null;
}

interface QrLookupResponse {
  success: boolean;
  institute: { id: number; name: string; address: string | null; phone: string | null } | null;
  qrCodeId: number;
  userPets: PetOption[];
  isLoggedIn: boolean;
  userName: string | null;
}

export default function CheckinPage() {
  const { token } = useParams<{ token: string }>();
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    petId: "",
    ownerName: "",
    petName: "",
    todayConcern: "",
    recentProblemBehavior: "",
    todayGoal: "",
    nextReservationDate: "",
    hasPackage: false,
    packageNote: "",
  });

  const { data, isLoading, error } = useQuery<QrLookupResponse>({
    queryKey: ["/api/checkin/qr", token],
    queryFn: async () => {
      const res = await fetch(`/api/checkin/qr/${token}`);
      if (!res.ok) throw new Error("유효하지 않은 QR 코드입니다.");
      return res.json();
    },
    enabled: !!token,
  });

  useEffect(() => {
    if (data?.userName) {
      setForm((prev) => ({ ...prev, ownerName: data.userName }));
    }
  }, [data]);

  const checkinMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/checkin", { ...form, qrToken: token });
    },
    onSuccess: () => {
      setSubmitted(true);
      toast({ title: "체크인 완료!", description: "오늘도 좋은 시간 보내세요!" });
    },
    onError: () => {
      toast({ title: "오류", description: "체크인에 실패했습니다. 다시 시도해 주세요.", variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-primary to-white">
        <div className="text-center">
          <PawPrint className="w-12 h-12 mx-auto text-primary animate-bounce" />
          <p className="mt-4 text-gray-500">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (error || !data?.success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-primary to-white p-4">
        <Card className="max-w-md w-full">
          <CardContent className="text-center py-8">
            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <PawPrint className="w-8 h-8 text-destructive" />
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">유효하지 않은 QR 코드</h2>
            <p className="text-gray-500">이 QR 코드는 만료되었거나 유효하지 않습니다.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-primary to-white p-4">
        <Card className="max-w-md w-full">
          <CardContent className="text-center py-12">
            <div className="w-20 h-20 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-success" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">체크인 완료!</h2>
            <p className="text-gray-500 mb-2">{data.institute?.name}에 체크인 되었습니다.</p>
            <p className="text-sm text-gray-400">오늘도 좋은 시간 보내세요 🐾</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const institute = data.institute;
  const userPets = data.userPets || [];
  const isLoggedIn = data.isLoggedIn;

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary to-white p-4">
      <div className="max-w-lg mx-auto space-y-4">
        <div className="text-center py-6">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
            <Building className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">{institute?.name}</h1>
          {institute?.address && <p className="text-sm text-gray-500 mt-1">{institute.address}</p>}
          <p className="text-sm text-primary font-medium mt-2">방문 체크인</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ClipboardList className="w-5 h-5" />
              체크인 정보
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>보호자 이름 *</Label>
              <Input
                value={form.ownerName}
                onChange={(e) => setForm({ ...form, ownerName: e.target.value })}
                placeholder="보호자 이름을 입력하세요"
              />
            </div>

            {isLoggedIn && userPets.length > 0 ? (
              <div>
                <Label>반려동물 선택</Label>
                <Select value={form.petId} onValueChange={(v) => setForm({ ...form, petId: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="반려동물을 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    {userPets.map((pet: PetOption) => (
                      <SelectItem key={pet.id} value={String(pet.id)}>
                        {pet.name} ({pet.breed || pet.species || '반려동물'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div>
                <Label>반려동물 이름</Label>
                <Input
                  value={form.petName}
                  onChange={(e) => setForm({ ...form, petName: e.target.value })}
                  placeholder="반려동물 이름을 입력하세요"
                />
              </div>
            )}

            <div>
              <Label>오늘의 고민</Label>
              <Textarea
                value={form.todayConcern}
                onChange={(e) => setForm({ ...form, todayConcern: e.target.value })}
                placeholder="오늘 상담하고 싶은 내용이 있으면 적어주세요"
                rows={2}
              />
            </div>

            <div>
              <Label>최근 문제 행동</Label>
              <Textarea
                value={form.recentProblemBehavior}
                onChange={(e) => setForm({ ...form, recentProblemBehavior: e.target.value })}
                placeholder="최근 반려동물의 문제 행동이 있었다면 적어주세요"
                rows={2}
              />
            </div>

            <div>
              <Label>오늘의 목표</Label>
              <Input
                value={form.todayGoal}
                onChange={(e) => setForm({ ...form, todayGoal: e.target.value })}
                placeholder="오늘 교육 목표를 적어주세요"
              />
            </div>

            <div>
              <Label className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                다음 예약 희망일
              </Label>
              <Input
                type="date"
                value={form.nextReservationDate}
                onChange={(e) => setForm({ ...form, nextReservationDate: e.target.value })}
              />
            </div>

            <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
              <Label className="text-sm">정기권/패키지 보유</Label>
              <Switch
                checked={form.hasPackage}
                onCheckedChange={(checked) => setForm({ ...form, hasPackage: checked })}
              />
            </div>

            {form.hasPackage && (
              <div>
                <Label>패키지 메모</Label>
                <Input
                  value={form.packageNote}
                  onChange={(e) => setForm({ ...form, packageNote: e.target.value })}
                  placeholder="예: 10회 정기권 (3/10 사용)"
                />
              </div>
            )}

            <Button
              className="w-full h-12 text-lg"
              onClick={() => {
                if (!form.ownerName.trim()) {
                  toast({ title: "이름을 입력해 주세요", variant: "destructive" });
                  return;
                }
                checkinMutation.mutate();
              }}
              disabled={checkinMutation.isPending}
            >
              {checkinMutation.isPending ? "체크인 중..." : "체크인 하기"}
            </Button>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-gray-400 pb-4">
          Powered by TALEZ
        </p>
      </div>
    </div>
  );
}
