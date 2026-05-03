import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth-compat';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { FileText, Camera, Shield, Clock, CheckCircle, XCircle, Plus, Loader2 } from 'lucide-react';

interface ConsentRecord {
  id: number;
  ownerId: number;
  petId: number | null;
  instituteId: number | null;
  consentType: string;
  photoBeforeAfter: boolean;
  snsUsage: boolean;
  faceHidden: boolean;
  petOnlyPhoto: boolean;
  caseCardNews: boolean;
  storePolicyAgreed: boolean;
  emergencyTransportAgreed: boolean;
  signatureData: string | null;
  agreedAt: string;
  isRevoked: boolean;
  revokedAt: string | null;
  createdAt: string;
}

const CONSENT_TYPE_LABELS: Record<string, string> = {
  photo: '사진/영상 활용 동의',
  store_policy: '매장 규정 동의',
  emergency: '응급 후송 동의',
  all: '통합 동의',
};

export default function ConsentManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const auth = useAuth();
  const userRole = auth.userRole;
  const [showNewConsent, setShowNewConsent] = useState(false);
  const [activeTab, setActiveTab] = useState('list');

  const { data, isLoading } = useQuery<{ success: boolean; records: ConsentRecord[] }>({
    queryKey: ['/api/consent-records'],
  });

  const records = data?.records || [];
  const activeRecords = records.filter(r => !r.isRevoked);
  const revokedRecords = records.filter(r => r.isRevoked);

  const revokeMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('PUT', `/api/consent-records/${id}/revoke`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/consent-records'] });
      toast({ title: '철회 완료', description: '동의가 철회되었습니다.' });
    },
    onError: () => {
      toast({ title: '오류', description: '동의 철회 중 오류가 발생했습니다.', variant: 'destructive' });
    },
  });

  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
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
          <FileText className="w-7 h-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">동의 관리</h1>
            <p className="text-gray-500 text-sm">사진 활용, 매장 규정, 응급 후송 동의를 관리합니다</p>
          </div>
        </div>
        {userRole === 'pet-owner' && (
          <Dialog open={showNewConsent} onOpenChange={setShowNewConsent}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 mr-2" />새 동의서</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>동의서 작성</DialogTitle>
              </DialogHeader>
              <NewConsentForm
                onSuccess={() => {
                  setShowNewConsent(false);
                  queryClient.invalidateQueries({ queryKey: ['/api/consent-records'] });
                }}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-primary">{records.length}</p>
            <p className="text-sm text-gray-500">전체 동의</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-success">{activeRecords.length}</p>
            <p className="text-sm text-gray-500">유효 동의</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-destructive">{revokedRecords.length}</p>
            <p className="text-sm text-gray-500">철회된 동의</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="list">유효 동의 ({activeRecords.length})</TabsTrigger>
          <TabsTrigger value="revoked">철회 이력 ({revokedRecords.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="list">
          {activeRecords.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-gray-500">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>등록된 동의 기록이 없습니다.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {activeRecords.map(record => (
                <ConsentCard
                  key={record.id}
                  record={record}
                  onRevoke={() => revokeMutation.mutate(record.id)}
                  isPending={revokeMutation.isPending}
                  canRevoke={userRole === 'pet-owner'}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="revoked">
          {revokedRecords.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-gray-500">
                <XCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>철회된 동의가 없습니다.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {revokedRecords.map(record => (
                <ConsentCard key={record.id} record={record} canRevoke={false} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ConsentCard({ record, onRevoke, isPending, canRevoke }: {
  record: ConsentRecord;
  onRevoke?: () => void;
  isPending?: boolean;
  canRevoke: boolean;
}) {
  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <Card className={record.isRevoked ? 'opacity-60' : ''}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            {record.consentType === 'photo' && <Camera className="w-5 h-5 text-primary" />}
            {record.consentType === 'store_policy' && <Shield className="w-5 h-5 text-success" />}
            {record.consentType === 'emergency' && <Clock className="w-5 h-5 text-destructive" />}
            {record.consentType === 'all' && <FileText className="w-5 h-5 text-primary" />}
            <span className="font-medium">{CONSENT_TYPE_LABELS[record.consentType] || record.consentType}</span>
          </div>
          <div className="flex items-center gap-2">
            {record.isRevoked ? (
              <Badge variant="destructive">철회됨</Badge>
            ) : (
              <Badge className="bg-success/10 text-success">유효</Badge>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm mb-3">
          {record.photoBeforeAfter && <Badge variant="outline">Before/After 촬영</Badge>}
          {record.snsUsage && <Badge variant="outline">SNS 활용</Badge>}
          {record.faceHidden && <Badge variant="outline">얼굴 비노출</Badge>}
          {record.petOnlyPhoto && <Badge variant="outline">반려견만 촬영</Badge>}
          {record.caseCardNews && <Badge variant="outline">사례 카드뉴스</Badge>}
          {record.storePolicyAgreed && <Badge variant="outline">매장 규정 동의</Badge>}
          {record.emergencyTransportAgreed && <Badge variant="outline">응급 후송 동의</Badge>}
        </div>

        <div className="flex items-center justify-between text-sm text-gray-500">
          <div className="flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            <span>동의일: {formatDate(record.agreedAt || record.createdAt)}</span>
          </div>
          {record.isRevoked && record.revokedAt && (
            <div className="flex items-center gap-1">
              <XCircle className="w-3 h-3 text-destructive" />
              <span>철회일: {formatDate(record.revokedAt)}</span>
            </div>
          )}
        </div>

        {canRevoke && !record.isRevoked && onRevoke && (
          <div className="mt-3 pt-3 border-t">
            <Button
              variant="outline"
              size="sm"
              className="text-destructive hover:text-destructive/90"
              onClick={onRevoke}
              disabled={isPending}
            >
              {isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <XCircle className="w-3 h-3 mr-1" />}
              동의 철회
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function NewConsentForm({ onSuccess }: { onSuccess: () => void }) {
  const { toast } = useToast();
  const [consentType, setConsentType] = useState('all');
  const [form, setForm] = useState({
    photoBeforeAfter: false,
    snsUsage: false,
    faceHidden: false,
    petOnlyPhoto: false,
    caseCardNews: false,
    storePolicyAgreed: false,
    emergencyTransportAgreed: false,
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', '/api/consent-records', { consentType, ...form });
    },
    onSuccess: () => {
      toast({ title: '동의 완료', description: '동의서가 저장되었습니다.' });
      onSuccess();
    },
    onError: () => {
      toast({ title: '오류', description: '동의서 저장 중 오류가 발생했습니다.', variant: 'destructive' });
    },
  });

  return (
    <div className="space-y-4">
      <div>
        <Label>동의 유형</Label>
        <Select value={consentType} onValueChange={setConsentType}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">통합 동의</SelectItem>
            <SelectItem value="photo">사진/영상 활용 동의</SelectItem>
            <SelectItem value="store_policy">매장 규정 동의</SelectItem>
            <SelectItem value="emergency">응급 후송 동의</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {(consentType === 'photo' || consentType === 'all') && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Camera className="w-4 h-4" />
              사진/영상 활용 동의
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Before/After 촬영 동의</Label>
              <Switch checked={form.photoBeforeAfter} onCheckedChange={v => setForm(p => ({ ...p, photoBeforeAfter: v }))} />
            </div>
            <div className="flex items-center justify-between">
              <Label>SNS 후기 활용 동의</Label>
              <Switch checked={form.snsUsage} onCheckedChange={v => setForm(p => ({ ...p, snsUsage: v }))} />
            </div>
            <div className="flex items-center justify-between">
              <Label>얼굴 비노출 요청</Label>
              <Switch checked={form.faceHidden} onCheckedChange={v => setForm(p => ({ ...p, faceHidden: v }))} />
            </div>
            <div className="flex items-center justify-between">
              <Label>반려견만 촬영</Label>
              <Switch checked={form.petOnlyPhoto} onCheckedChange={v => setForm(p => ({ ...p, petOnlyPhoto: v }))} />
            </div>
            <div className="flex items-center justify-between">
              <Label>사례 카드뉴스 활용 동의</Label>
              <Switch checked={form.caseCardNews} onCheckedChange={v => setForm(p => ({ ...p, caseCardNews: v }))} />
            </div>
          </CardContent>
        </Card>
      )}

      {(consentType === 'store_policy' || consentType === 'all') && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="w-4 h-4" />
              매장 규정 동의
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <Label>매장 안전 규정에 동의합니다</Label>
              <Switch checked={form.storePolicyAgreed} onCheckedChange={v => setForm(p => ({ ...p, storePolicyAgreed: v }))} />
            </div>
          </CardContent>
        </Card>
      )}

      {(consentType === 'emergency' || consentType === 'all') && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="w-4 h-4" />
              응급 후송 동의
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <Label>응급 상황 시 지정 동물병원으로 후송에 동의합니다</Label>
              <Switch checked={form.emergencyTransportAgreed} onCheckedChange={v => setForm(p => ({ ...p, emergencyTransportAgreed: v }))} />
            </div>
          </CardContent>
        </Card>
      )}

      <Button onClick={() => submitMutation.mutate()} disabled={submitMutation.isPending} className="w-full">
        {submitMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}
        동의서 제출
      </Button>
    </div>
  );
}
