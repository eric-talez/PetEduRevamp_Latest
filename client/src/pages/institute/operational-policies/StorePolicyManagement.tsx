import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Shield, Save, AlertTriangle, Dog, Coffee, Baby, Loader2 } from 'lucide-react';

interface StorePolicy {
  id: number;
  instituteId: number;
  leashRequired: boolean;
  maxLeashLength: string | null;
  noChairJumping: boolean;
  sofaUsageAllowed: boolean;
  otherDogContact: string;
  treatPolicy: string;
  outsideFoodAllowed: boolean;
  childrenPolicy: string | null;
  customRules: Array<{ rule: string }> | null;
  isActive: boolean;
}

export default function StorePolicyManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: meData } = useQuery<{ success: boolean; data: { instituteId?: number } }>({
    queryKey: ['/api/auth/me'],
    queryFn: async () => {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
  });
  const instituteId = meData?.data?.instituteId;

  const [form, setForm] = useState({
    leashRequired: true,
    maxLeashLength: '1.5m',
    noChairJumping: true,
    sofaUsageAllowed: false,
    otherDogContact: 'ask_first',
    treatPolicy: 'provided_only',
    outsideFoodAllowed: false,
    childrenPolicy: '',
    customRules: [] as Array<{ rule: string }>,
  });
  const [newRule, setNewRule] = useState('');

  const { data, isLoading } = useQuery<{ success: boolean; policy: StorePolicy | null }>({
    queryKey: ['/api/store-policies', instituteId],
    queryFn: async () => {
      const res = await fetch(`/api/store-policies/${instituteId}`);
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      if (data.policy) {
        setForm({
          leashRequired: data.policy.leashRequired ?? true,
          maxLeashLength: data.policy.maxLeashLength || '1.5m',
          noChairJumping: data.policy.noChairJumping ?? true,
          sofaUsageAllowed: data.policy.sofaUsageAllowed ?? false,
          otherDogContact: data.policy.otherDogContact || 'ask_first',
          treatPolicy: data.policy.treatPolicy || 'provided_only',
          outsideFoodAllowed: data.policy.outsideFoodAllowed ?? false,
          childrenPolicy: data.policy.childrenPolicy || '',
          customRules: (data.policy.customRules as Array<{ rule: string }>) || [],
        });
      }
      return data;
    },
    enabled: !!instituteId,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!instituteId) throw new Error('기관 정보를 찾을 수 없습니다.');
      return apiRequest('POST', '/api/store-policies', {
        instituteId: instituteId,
        ...form,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/store-policies', instituteId] });
      toast({ title: '저장 완료', description: '매장 안전 규정이 저장되었습니다.' });
    },
    onError: () => {
      toast({ title: '오류', description: '저장 중 오류가 발생했습니다.', variant: 'destructive' });
    },
  });

  const addCustomRule = () => {
    if (!newRule.trim()) return;
    setForm(prev => ({ ...prev, customRules: [...prev.customRules, { rule: newRule.trim() }] }));
    setNewRule('');
  };

  const removeCustomRule = (index: number) => {
    setForm(prev => ({ ...prev, customRules: prev.customRules.filter((_, i) => i !== index) }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <Shield className="w-7 h-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">매장 안전 운영 규정</h1>
          <p className="text-gray-500 text-sm">방문 고객과 반려견의 안전을 위한 매장 규정을 설정합니다</p>
        </div>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Dog className="w-5 h-5" />
              리드줄 및 이동 규정
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base">리드줄 착용 필수</Label>
                <p className="text-sm text-gray-500">매장 내 리드줄 착용을 의무화합니다</p>
              </div>
              <Switch checked={form.leashRequired} onCheckedChange={v => setForm(p => ({ ...p, leashRequired: v }))} />
            </div>
            {form.leashRequired && (
              <div>
                <Label>최대 리드줄 길이</Label>
                <Select value={form.maxLeashLength} onValueChange={v => setForm(p => ({ ...p, maxLeashLength: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1m">1m 이하</SelectItem>
                    <SelectItem value="1.5m">1.5m 이하</SelectItem>
                    <SelectItem value="2m">2m 이하</SelectItem>
                    <SelectItem value="free">제한 없음</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base">의자 점프 금지</Label>
                <p className="text-sm text-gray-500">반려견이 의자 위로 뛰어오르는 것을 금지합니다</p>
              </div>
              <Switch checked={form.noChairJumping} onCheckedChange={v => setForm(p => ({ ...p, noChairJumping: v }))} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base">소파 이용 허용</Label>
                <p className="text-sm text-gray-500">반려견의 소파 이용을 허용합니다</p>
              </div>
              <Switch checked={form.sofaUsageAllowed} onCheckedChange={v => setForm(p => ({ ...p, sofaUsageAllowed: v }))} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertTriangle className="w-5 h-5" />
              접촉 및 간식 규정
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>타견 접촉 정책</Label>
              <Select value={form.otherDogContact} onValueChange={v => setForm(p => ({ ...p, otherDogContact: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ask_first">보호자 동의 후 접촉</SelectItem>
                  <SelectItem value="not_allowed">접촉 금지</SelectItem>
                  <SelectItem value="free">자유 접촉</SelectItem>
                  <SelectItem value="supervised">훈련사 감독 하 접촉</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Separator />
            <div>
              <Label>간식 정책</Label>
              <Select value={form.treatPolicy} onValueChange={v => setForm(p => ({ ...p, treatPolicy: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="provided_only">매장 제공 간식만 허용</SelectItem>
                  <SelectItem value="owner_allowed">보호자 간식 허용</SelectItem>
                  <SelectItem value="not_allowed">간식 금지</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base">외부 음식 반입 허용</Label>
                <p className="text-sm text-gray-500">보호자가 외부 음식을 가져올 수 있습니다</p>
              </div>
              <Switch checked={form.outsideFoodAllowed} onCheckedChange={v => setForm(p => ({ ...p, outsideFoodAllowed: v }))} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Baby className="w-5 h-5" />
              기타 규정
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>어린이 동반 정책</Label>
              <Input
                value={form.childrenPolicy}
                onChange={e => setForm(p => ({ ...p, childrenPolicy: e.target.value }))}
                placeholder="예: 만 7세 이상 보호자 동반 시 입장 가능"
              />
            </div>
            <Separator />
            <div>
              <Label>추가 규정</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  value={newRule}
                  onChange={e => setNewRule(e.target.value)}
                  placeholder="추가 규정 입력"
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCustomRule())}
                />
                <Button type="button" variant="outline" onClick={addCustomRule}>추가</Button>
              </div>
              {form.customRules.length > 0 && (
                <div className="mt-3 space-y-2">
                  {form.customRules.map((r, i) => (
                    <div key={i} className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2">
                      <span className="text-sm">{r.rule}</span>
                      <Button variant="ghost" size="sm" onClick={() => removeCustomRule(i)} className="text-destructive hover:text-destructive/90 h-6 px-2">삭제</Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="w-full"
          size="lg"
        >
          {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
          규정 저장
        </Button>
      </div>
    </div>
  );
}
