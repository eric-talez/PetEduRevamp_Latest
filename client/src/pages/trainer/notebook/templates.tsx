import { useState } from 'react';
import { Link } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Edit, Trash2, Copy, FileText, Users, Sparkles, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { secureRequest } from '@/lib/csrf';

interface NotebookTemplate {
  id: number;
  ownerUserId: number | null;
  instituteId: number | null;
  name: string;
  body: string;
  category: string | null;
  homeworkPreset: { items?: string[]; note?: string | null } | null;
  isSystem: boolean;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

interface FormState {
  id?: number;
  name: string;
  body: string;
  category: string;
  homeworkItems: string;
  homeworkNote: string;
  shareWithInstitute: boolean;
}

const EMPTY_FORM: FormState = {
  name: '',
  body: '',
  category: '',
  homeworkItems: '',
  homeworkNote: '',
  shareWithInstitute: false,
};

const CATEGORY_OPTIONS = ['기본훈련', '행동교정', '사회화', '노즈워크', '어질리티', '기타'];

export default function NotebookTemplatesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editingTpl, setEditingTpl] = useState<NotebookTemplate | null>(null);

  const { data, isLoading } = useQuery<{ data: NotebookTemplate[] }>({
    queryKey: ['/api/notebook/templates'],
  });
  const templates = data?.data ?? [];

  const { data: contextData } = useQuery<{ data: { userId: number; instituteIds: number[] } }>({
    queryKey: ['/api/notebook/templates/context'],
  });
  const myUserId = contextData?.data?.userId ?? null;
  const myInstituteIds = contextData?.data?.instituteIds ?? [];

  const systemTemplates = templates.filter((t) => t.isSystem);
  const myTemplates = templates.filter((t) => !t.isSystem && t.ownerUserId === myUserId && !t.instituteId);
  const sharedTemplates = templates.filter((t) => !t.isSystem && t.instituteId != null);

  const openCreate = () => {
    setEditingTpl(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (tpl: NotebookTemplate) => {
    setEditingTpl(tpl);
    setForm({
      id: tpl.id,
      name: tpl.name,
      body: tpl.body,
      category: tpl.category ?? '',
      homeworkItems: (tpl.homeworkPreset?.items ?? []).join('\n'),
      homeworkNote: tpl.homeworkPreset?.note ?? '',
      shareWithInstitute: tpl.instituteId != null,
    });
    setDialogOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error('템플릿 이름을 입력해주세요.');
      if (!form.body.trim()) throw new Error('본문을 입력해주세요.');
      const items = form.homeworkItems
        .split('\n')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        body: form.body,
        category: form.category || null,
        homeworkPreset: items.length > 0 || form.homeworkNote.trim()
          ? { items, note: form.homeworkNote.trim() || null }
          : null,
      };
      const isEdit = editingTpl != null;
      if (form.shareWithInstitute) {
        if (myInstituteIds.length === 0) {
          throw new Error('소속 기관이 없어 공유할 수 없습니다.');
        }
        payload.instituteId = myInstituteIds[0];
      } else if (isEdit) {
        payload.instituteId = null;
      }
      const url = isEdit ? `/api/notebook/templates/${editingTpl!.id}` : '/api/notebook/templates';
      const method = isEdit ? 'PATCH' : 'POST';
      const res = await secureRequest(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.success === false) {
        throw new Error(json?.error || '저장 실패');
      }
      return json.data as NotebookTemplate;
    },
    onSuccess: () => {
      toast({ title: editingTpl ? '템플릿이 수정되었습니다.' : '템플릿이 생성되었습니다.' });
      setDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['/api/notebook/templates'] });
    },
    onError: (err: Error) => {
      toast({ title: '저장 실패', description: err.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await secureRequest(`/api/notebook/templates/${id}`, { method: 'DELETE' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.success === false) {
        throw new Error(json?.error || '삭제 실패');
      }
    },
    onSuccess: () => {
      toast({ title: '템플릿이 삭제되었습니다.' });
      queryClient.invalidateQueries({ queryKey: ['/api/notebook/templates'] });
    },
    onError: (err: Error) => {
      toast({ title: '삭제 실패', description: err.message, variant: 'destructive' });
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await secureRequest(`/api/notebook/templates/${id}/duplicate`, { method: 'POST' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.success === false) {
        throw new Error(json?.error || '복제 실패');
      }
      return json.data as NotebookTemplate;
    },
    onSuccess: () => {
      toast({ title: '템플릿이 복제되었습니다.' });
      queryClient.invalidateQueries({ queryKey: ['/api/notebook/templates'] });
    },
    onError: (err: Error) => {
      toast({ title: '복제 실패', description: err.message, variant: 'destructive' });
    },
  });

  const renderCard = (tpl: NotebookTemplate) => {
    const canEdit = !tpl.isSystem && (myUserId == null || tpl.ownerUserId === myUserId);
    return (
      <Card key={tpl.id} className="flex flex-col" data-testid={`template-card-${tpl.id}`}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base font-semibold flex-1">{tpl.name}</CardTitle>
            <div className="flex items-center gap-1 flex-wrap">
              {tpl.isSystem && (
                <Badge variant="secondary" className="gap-1"><Sparkles className="h-3 w-3" /> 시스템</Badge>
              )}
              {tpl.instituteId && (
                <Badge variant="outline" className="gap-1"><Users className="h-3 w-3" /> 기관</Badge>
              )}
              {tpl.category && <Badge variant="outline">{tpl.category}</Badge>}
            </div>
          </div>
          <CardDescription className="text-xs">사용 횟수 {tpl.usageCount}회</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col gap-3">
          <p className="text-sm text-gray-600 whitespace-pre-line line-clamp-4">{tpl.body}</p>
          {tpl.homeworkPreset?.items && tpl.homeworkPreset.items.length > 0 && (
            <div className="text-xs text-gray-500">
              <div className="font-medium mb-1">숙제 미리보기</div>
              <ul className="list-disc pl-4 space-y-0.5">
                {tpl.homeworkPreset.items.slice(0, 3).map((it, i) => (
                  <li key={i}>{it}</li>
                ))}
              </ul>
            </div>
          )}
          <div className="flex items-center gap-2 pt-2 mt-auto">
            {canEdit ? (
              <>
                <Button size="sm" variant="outline" onClick={() => openEdit(tpl)} data-testid={`btn-edit-${tpl.id}`}>
                  <Edit className="h-3.5 w-3.5 mr-1" /> 수정
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (confirm('이 템플릿을 삭제하시겠어요?')) deleteMutation.mutate(tpl.id);
                  }}
                  data-testid={`btn-delete-${tpl.id}`}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" /> 삭제
                </Button>
              </>
            ) : null}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => duplicateMutation.mutate(tpl.id)}
              data-testid={`btn-duplicate-${tpl.id}`}
            >
              <Copy className="h-3.5 w-3.5 mr-1" /> 복제
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/trainer/notebook" className="text-sm text-gray-500 inline-flex items-center gap-1 hover:text-gray-700">
            <ArrowLeft className="h-3.5 w-3.5" /> 알림장으로 돌아가기
          </Link>
          <h1 className="text-2xl font-bold mt-1 flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" /> 알림장 템플릿
          </h1>
          <p className="text-sm text-gray-500 mt-1">자주 쓰는 양식을 저장해두고 작성 모달에서 한 번에 불러올 수 있어요.</p>
        </div>
        <Button onClick={openCreate} data-testid="btn-create-template">
          <Plus className="h-4 w-4 mr-1" /> 새 템플릿
        </Button>
      </div>

      {isLoading && <div className="text-center text-gray-500 py-8">불러오는 중…</div>}

      {!isLoading && (
        <div className="space-y-8">
          <section>
            <h2 className="text-lg font-semibold mb-3">내 템플릿 ({myTemplates.length})</h2>
            {myTemplates.length === 0 ? (
              <Card><CardContent className="py-8 text-center text-sm text-gray-500">아직 만든 템플릿이 없어요. 시스템 템플릿을 복제해서 시작해보세요.</CardContent></Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{myTemplates.map(renderCard)}</div>
            )}
          </section>

          {sharedTemplates.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold mb-3">기관 공유 템플릿 ({sharedTemplates.length})</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{sharedTemplates.map(renderCard)}</div>
            </section>
          )}

          <section>
            <h2 className="text-lg font-semibold mb-3">시스템 기본 템플릿 ({systemTemplates.length})</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{systemTemplates.map(renderCard)}</div>
          </section>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTpl ? '템플릿 수정' : '새 템플릿'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="tpl-name">이름</Label>
              <Input
                id="tpl-name"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="예: 기본훈련 1주차"
                data-testid="input-template-name"
              />
            </div>
            <div>
              <Label htmlFor="tpl-category">카테고리</Label>
              <Select value={form.category || 'none'} onValueChange={(v) => setForm((p) => ({ ...p, category: v === 'none' ? '' : v }))}>
                <SelectTrigger id="tpl-category" data-testid="select-template-category">
                  <SelectValue placeholder="선택 안 함" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">선택 안 함</SelectItem>
                  {CATEGORY_OPTIONS.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="tpl-body">본문</Label>
              <Textarea
                id="tpl-body"
                rows={8}
                value={form.body}
                onChange={(e) => setForm((p) => ({ ...p, body: e.target.value }))}
                placeholder="알림장에 자동으로 채워질 본문을 적어주세요."
                data-testid="input-template-body"
              />
            </div>
            <div>
              <Label htmlFor="tpl-homework">숙제 항목 (한 줄에 하나씩)</Label>
              <Textarea
                id="tpl-homework"
                rows={4}
                value={form.homeworkItems}
                onChange={(e) => setForm((p) => ({ ...p, homeworkItems: e.target.value }))}
                placeholder={'예)\n앉아 연습 10회\n간식 보상 5분'}
                data-testid="input-template-homework"
              />
            </div>
            <div>
              <Label htmlFor="tpl-note">숙제 메모</Label>
              <Input
                id="tpl-note"
                value={form.homeworkNote}
                onChange={(e) => setForm((p) => ({ ...p, homeworkNote: e.target.value }))}
                placeholder="보호자에게 전달할 짧은 메모"
                data-testid="input-template-homework-note"
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.shareWithInstitute}
                disabled={myInstituteIds.length === 0}
                onChange={(e) => setForm((p) => ({ ...p, shareWithInstitute: e.target.checked }))}
                data-testid="checkbox-share-institute"
              />
              <span className={myInstituteIds.length === 0 ? 'text-gray-400' : ''}>
                같은 기관 트레이너에게도 공유{myInstituteIds.length === 0 ? ' (소속 기관 없음)' : ''}
              </span>
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>취소</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} data-testid="btn-save-template">
              {saveMutation.isPending ? '저장 중…' : '저장'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
