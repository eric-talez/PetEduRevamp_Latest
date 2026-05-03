import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Star, Camera, X, Upload } from 'lucide-react';
import { useRef } from 'react';

interface EligibleTarget {
  trainerId: number;
  trainerName?: string;
  petId?: number;
  petName?: string;
  lessonRef?: string;
  completedAt?: string;
}

export default function WriteReviewPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [selectedKey, setSelectedKey] = useState<string>('');
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const remaining = Math.max(0, 5 - photos.length);
      const list = Array.from(files).slice(0, remaining);
      if (list.length === 0) {
        toast({ title: '사진은 최대 5장까지 첨부할 수 있습니다.', variant: 'destructive' });
        return;
      }
      const uploaded: string[] = [];
      for (const file of list) {
        const fd = new FormData();
        fd.append('image', file);
        const res = await fetch('/api/upload/image', { method: 'POST', body: fd, credentials: 'include' });
        const data = await res.json();
        const url = data?.url || data?.imageUrl || data?.file?.url;
        if (!res.ok || !data?.success || !url) {
          throw new Error(data?.message || data?.error || '이미지 업로드 실패');
        }
        uploaded.push(url);
      }
      setPhotos((p) => [...p, ...uploaded]);
    } catch (e) {
      toast({
        title: '업로드 실패',
        description: e instanceof Error ? e.message : '오류가 발생했습니다.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const eligibleQuery = useQuery<{ success: boolean; eligible: EligibleTarget[] }>({
    queryKey: ['/api/trainer-reviews/eligible'],
    queryFn: async () => {
      const res = await fetch('/api/trainer-reviews/eligible', { credentials: 'include' });
      if (!res.ok) throw new Error('failed');
      return res.json();
    },
  });

  const targets = eligibleQuery.data?.eligible || [];
  const selected = targets.find((t) => `${t.trainerId}:${t.lessonRef || ''}` === selectedKey);

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!selected) throw new Error('수업 항목을 선택해주세요.');
      if (!rating) throw new Error('별점을 선택해주세요.');
      if (content.trim().length < 5) throw new Error('후기 내용은 5자 이상 작성해주세요.');
      const res = await apiRequest('POST', '/api/trainer-reviews', {
        trainerId: selected.trainerId,
        petId: selected.petId,
        lessonRef: selected.lessonRef,
        rating,
        title: title.trim() || undefined,
        content: content.trim(),
        photos,
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || '리뷰 등록 실패');
      return data;
    },
    onSuccess: () => {
      toast({ title: '리뷰가 등록되었습니다.', description: '소중한 후기 감사합니다!' });
      queryClient.invalidateQueries({ queryKey: ['/api/trainer-reviews'] });
      setLocation('/');
    },
    onError: (e: unknown) =>
      toast({
        title: '등록 실패',
        description: e instanceof Error ? e.message : '오류가 발생했습니다.',
        variant: 'destructive',
      }),
  });

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6" data-testid="page-write-review">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">트레이너 리뷰 작성</h1>
        <p className="text-muted-foreground">수업 완료 후 14일 이내에 리뷰를 남길 수 있어요.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>리뷰 대상</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {eligibleQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">불러오는 중...</p>
          ) : targets.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              현재 리뷰를 작성할 수 있는 완료된 수업이 없습니다.
            </p>
          ) : (
            <div className="grid gap-2">
              {targets.map((t) => {
                const key = `${t.trainerId}:${t.lessonRef || ''}`;
                const active = key === selectedKey;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedKey(key)}
                    className={`text-left p-3 border rounded-md transition ${active ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}`}
                    data-testid={`target-${t.trainerId}`}
                  >
                    <div className="font-medium">{t.trainerName || `트레이너 #${t.trainerId}`}</div>
                    <div className="text-xs text-muted-foreground">
                      {t.petName ? `${t.petName} · ` : ''}
                      완료일 {t.completedAt ? new Date(t.completedAt).toLocaleDateString('ko-KR') : '-'}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>별점 & 후기</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-1" data-testid="rating-stars">
            {[1, 2, 3, 4, 5].map((i) => (
              <button
                key={i}
                type="button"
                onMouseEnter={() => setHoverRating(i)}
                onMouseLeave={() => setHoverRating(0)}
                onClick={() => setRating(i)}
                data-testid={`star-${i}`}
              >
                <Star
                  className={`h-8 w-8 ${(hoverRating || rating) >= i ? 'text-warning fill-current' : 'text-gray-300'}`}
                />
              </button>
            ))}
            <span className="ml-2 text-sm text-muted-foreground">{rating ? `${rating}점` : '별점을 선택하세요'}</span>
          </div>
          <Input
            placeholder="제목 (선택)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            data-testid="input-title"
          />
          <Textarea
            placeholder="훈련 효과, 친절도, 추천 여부 등을 자세히 적어주세요. (5자 이상)"
            rows={6}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxLength={2000}
            data-testid="textarea-content"
          />

          <div className="space-y-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(e) => handleFiles(e.target.files)}
              data-testid="input-photo-file"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || photos.length >= 5}
              data-testid="button-upload-photo"
            >
              {uploading ? (
                <><Upload className="h-4 w-4 mr-1 animate-pulse" /> 업로드 중...</>
              ) : (
                <><Camera className="h-4 w-4 mr-1" /> 사진 첨부 ({photos.length}/5)</>
              )}
            </Button>
            {photos.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {photos.map((p, i) => (
                  <div key={i} className="relative">
                    <img src={p} alt="첨부 사진" className="h-20 w-20 object-cover rounded border" />
                    <button
                      type="button"
                      onClick={() => setPhotos((arr) => arr.filter((_, idx) => idx !== i))}
                      className="absolute -top-2 -right-2 bg-white border rounded-full p-1 shadow"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setLocation('/')}>취소</Button>
            <Button
              onClick={() => submitMutation.mutate()}
              disabled={submitMutation.isPending || !selected || !rating || content.trim().length < 5}
              data-testid="button-submit-review"
            >
              리뷰 등록하기
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
