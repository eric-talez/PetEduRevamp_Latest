import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertTriangle, Plus, Trash2, Edit, CheckSquare, Loader2, Shield } from 'lucide-react';

interface IncidentProtocol {
  id: number;
  instituteId: number;
  incidentType: string;
  title: string;
  steps: Array<{ step: string; order: number }>;
  isActive: boolean;
}

const INCIDENT_TYPES: Record<string, { label: string; color: string; icon: string }> = {
  bite: { label: '물림 사고', color: 'bg-destructive/10 text-destructive', icon: '🦷' },
  dog_fight: { label: '타견 접촉 사고', color: 'bg-primary/10 text-primary', icon: '🐕' },
  injury: { label: '부상/낙상', color: 'bg-warning/10 text-warning', icon: '🩹' },
  escape: { label: '이탈/도주', color: 'bg-primary/10 text-primary', icon: '🏃' },
  health_emergency: { label: '건강 응급', color: 'bg-primary/10 text-primary', icon: '🏥' },
  other: { label: '기타 사고', color: 'bg-gray-100 text-gray-800', icon: '⚠️' },
};

const DEFAULT_STEPS: Record<string, string[]> = {
  bite: [
    '즉시 반려견 분리 및 안전 확보',
    '부상 부위 확인 및 응급 처치',
    '보호자에게 즉시 연락',
    '물림 사고 상황 기록 (시간, 장소, 상황)',
    '필요 시 동물병원 후송',
    '사고 보고서 작성',
    '보호자 면담 및 향후 대응 논의',
  ],
  dog_fight: [
    '즉시 반려견 분리 (안전한 방법으로)',
    '양쪽 반려견 부상 확인',
    '양쪽 보호자에게 상황 설명',
    '부상 시 응급 처치',
    '사고 경위 기록',
    '향후 접촉 관리 방안 논의',
  ],
  injury: [
    '즉시 반려견 안정시키기',
    '부상 부위 및 정도 확인',
    '응급 처치 실시',
    '보호자에게 연락',
    '필요 시 동물병원 후송',
    '사고 경위 기록',
  ],
  escape: [
    '즉시 출입문 폐쇄',
    '매장 주변 수색',
    '보호자에게 즉시 연락',
    '인근 동물병원/보호소에 알림',
    'SNS 및 게시판에 실종 공고',
    '발견 시까지 수색 지속',
  ],
  health_emergency: [
    '반려견 상태 확인 (호흡, 의식)',
    '응급 처치 (CPR 등)',
    '지정 동물병원 연락',
    '보호자에게 즉시 연락',
    '동물병원으로 후송',
    '상황 기록 및 보고',
  ],
  other: [
    '상황 파악 및 안전 확보',
    '관련자에게 연락',
    '필요한 조치 실시',
    '상황 기록',
  ],
};

export default function IncidentProtocols() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: meData } = useQuery<{ success: boolean; data: { role?: string; instituteId?: number } }>({
    queryKey: ['/api/auth/me'],
    queryFn: async () => {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
  });
  const userRole = meData?.data?.role || null;
  const instituteId = meData?.data?.instituteId;
  const isManager = userRole === 'institute-admin' || userRole === 'admin';
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [checkedSteps, setCheckedSteps] = useState<Record<number, Set<number>>>({});

  const { data, isLoading } = useQuery<{ success: boolean; protocols: IncidentProtocol[] }>({
    queryKey: ['/api/incident-protocols', instituteId],
    queryFn: async () => {
      const res = await fetch(`/api/incident-protocols/${instituteId}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    enabled: !!instituteId,
  });

  const protocols = data?.protocols || [];

  const toggleStep = (protocolId: number, stepIndex: number) => {
    setCheckedSteps(prev => {
      const current = new Set(prev[protocolId] || []);
      if (current.has(stepIndex)) current.delete(stepIndex);
      else current.add(stepIndex);
      return { ...prev, [protocolId]: current };
    });
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/incident-protocols/${id}`, undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/incident-protocols', instituteId] });
      toast({ title: '삭제 완료', description: '프로토콜이 삭제되었습니다.' });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-7 h-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">사고 처리 프로토콜</h1>
            <p className="text-gray-500 text-sm">사고 유형별 처리 절차 체크리스트</p>
          </div>
        </div>
        {isManager && (
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 mr-2" />프로토콜 추가</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>사고 처리 프로토콜 추가</DialogTitle>
              </DialogHeader>
              <CreateProtocolForm
                instituteId={instituteId}
                onSuccess={() => {
                  setShowCreateDialog(false);
                  queryClient.invalidateQueries({ queryKey: ['/api/incident-protocols', instituteId] });
                }}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {protocols.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Shield className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium mb-2">등록된 프로토콜이 없습니다</h3>
            <p className="text-gray-500 mb-4">사고 유형별 처리 절차를 등록해주세요.</p>
            {isManager && (
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                기본 프로토콜 생성
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {protocols.map(protocol => {
            const typeInfo = INCIDENT_TYPES[protocol.incidentType] || INCIDENT_TYPES.other;
            const steps = protocol.steps as Array<{ step: string; order: number }>;
            const checked = checkedSteps[protocol.id] || new Set();
            const allChecked = steps.length > 0 && checked.size === steps.length;

            return (
              <Card key={protocol.id} className={allChecked ? 'border-success/40 bg-success/30' : ''}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{typeInfo.icon}</span>
                      <div>
                        <CardTitle className="text-lg">{protocol.title}</CardTitle>
                        <Badge className={`mt-1 ${typeInfo.color}`}>{typeInfo.label}</Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {allChecked && <Badge className="bg-success/10 text-success">완료</Badge>}
                      <span className="text-sm text-gray-500">{checked.size}/{steps.length}</span>
                      {isManager && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive/90"
                          onClick={() => deleteMutation.mutate(protocol.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {steps.map((s, i) => (
                      <div
                        key={i}
                        className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                          checked.has(i) ? 'bg-success/10 dark:bg-success/20' : 'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                        onClick={() => toggleStep(protocol.id, i)}
                      >
                        <Checkbox checked={checked.has(i)} className="mt-0.5" />
                        <div className="flex-1">
                          <span className={`text-sm font-medium mr-2 ${checked.has(i) ? 'text-success' : 'text-primary'}`}>
                            Step {i + 1}.
                          </span>
                          <span className={`text-sm ${checked.has(i) ? 'line-through text-gray-400' : ''}`}>
                            {s.step}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CreateProtocolForm({ instituteId, onSuccess }: { instituteId: number; onSuccess: () => void }) {
  const { toast } = useToast();
  const [incidentType, setIncidentType] = useState('bite');
  const [title, setTitle] = useState('');
  const [steps, setSteps] = useState<string[]>([]);
  const [newStep, setNewStep] = useState('');

  const loadDefaults = (type: string) => {
    setIncidentType(type);
    const defaultSteps = DEFAULT_STEPS[type] || DEFAULT_STEPS.other;
    setSteps(defaultSteps);
    const typeInfo = INCIDENT_TYPES[type];
    if (typeInfo && !title) setTitle(`${typeInfo.label} 처리 절차`);
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', '/api/incident-protocols', {
        instituteId,
        incidentType,
        title: title || `${INCIDENT_TYPES[incidentType]?.label || '사고'} 처리 절차`,
        steps: steps.map((step, i) => ({ step, order: i + 1 })),
      });
    },
    onSuccess: () => {
      toast({ title: '등록 완료', description: '사고 처리 프로토콜이 등록되었습니다.' });
      onSuccess();
    },
    onError: () => {
      toast({ title: '오류', description: '등록 중 오류가 발생했습니다.', variant: 'destructive' });
    },
  });

  const addStep = () => {
    if (!newStep.trim()) return;
    setSteps(prev => [...prev, newStep.trim()]);
    setNewStep('');
  };

  const removeStep = (index: number) => {
    setSteps(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>사고 유형</Label>
        <Select value={incidentType} onValueChange={v => loadDefaults(v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.entries(INCIDENT_TYPES).map(([key, info]) => (
              <SelectItem key={key} value={key}>{info.icon} {info.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>제목</Label>
        <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="프로토콜 제목" />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <Label>처리 절차</Label>
          <Button variant="outline" size="sm" onClick={() => loadDefaults(incidentType)}>
            기본 절차 불러오기
          </Button>
        </div>
        <div className="space-y-2 mb-3">
          {steps.map((step, i) => (
            <div key={i} className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2">
              <span className="text-sm font-medium text-primary min-w-[50px]">Step {i + 1}</span>
              <span className="text-sm flex-1">{step}</span>
              <Button variant="ghost" size="sm" onClick={() => removeStep(i)} className="text-destructive h-6 px-2">삭제</Button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={newStep}
            onChange={e => setNewStep(e.target.value)}
            placeholder="새 절차 추가"
            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addStep())}
          />
          <Button type="button" variant="outline" onClick={addStep}>추가</Button>
        </div>
      </div>

      <Button
        onClick={() => createMutation.mutate()}
        disabled={createMutation.isPending || steps.length === 0}
        className="w-full"
      >
        {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckSquare className="w-4 h-4 mr-2" />}
        프로토콜 등록
      </Button>
    </div>
  );
}
