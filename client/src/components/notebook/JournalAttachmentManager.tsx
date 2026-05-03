import { useRef, useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Loader2, Upload, Trash2, Image as ImageIcon, Video as VideoIcon, X, ChevronLeft, ChevronRight, ArrowUp, ArrowDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { secureRequest } from '@/lib/csrf';

export interface NotebookAttachment {
  id: number;
  journalId: number;
  kind: 'image' | 'video';
  mimeType: string;
  sizeBytes: number;
  sortOrder: number;
  createdAt: string;
  url: string;
  thumbnailUrl: string | null;
}

interface Props {
  journalId: number;
  canEdit?: boolean;
}

const MAX_IMAGES = 5;
const MAX_VIDEOS = 1;
const IMAGE_MAX_BYTES = 10 * 1024 * 1024;
const VIDEO_MAX_BYTES = 50 * 1024 * 1024;
const ALLOWED_IMAGE_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_VIDEO_MIME = ['video/mp4', 'video/webm', 'video/quicktime'];

export function JournalAttachmentManager({ journalId, canEdit = false }: Props) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const { data, isLoading } = useQuery<{ success: boolean; attachments: NotebookAttachment[] }>({
    queryKey: ['/api/notebook/entries', journalId, 'attachments'],
    queryFn: async () => {
      const res = await fetch(`/api/notebook/entries/${journalId}/attachments`, { credentials: 'include' });
      if (!res.ok) throw new Error('첨부파일을 불러올 수 없습니다.');
      return res.json();
    },
    enabled: Number.isFinite(journalId) && journalId > 0,
  });

  const attachments = data?.attachments || [];
  const images = attachments.filter(a => a.kind === 'image');
  const videos = attachments.filter(a => a.kind === 'video');

  const uploadMut = useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData();
      fd.append('file', file);
      const res = await secureRequest(`/api/notebook/entries/${journalId}/attachments`, {
        method: 'POST',
        body: fd,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || '업로드 실패');
      return json;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['/api/notebook/entries', journalId, 'attachments'] });
      toast({ title: '업로드 완료', description: '첨부파일이 추가되었습니다.' });
    },
    onError: (err: any) => {
      toast({ title: '업로드 실패', description: err?.message || '오류가 발생했습니다.', variant: 'destructive' });
    },
  });

  const reorderMut = useMutation({
    mutationFn: async (orderedIds: number[]) => {
      const res = await secureRequest(`/api/notebook/entries/${journalId}/attachments/reorder`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedIds }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || '재정렬 실패');
      return json;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['/api/notebook/entries', journalId, 'attachments'] });
    },
    onError: (err: any) => {
      toast({ title: '순서 변경 실패', description: err?.message || '오류', variant: 'destructive' });
    },
  });

  const moveAttachment = (kind: 'image' | 'video', index: number, direction: -1 | 1) => {
    const list = kind === 'image' ? images : videos;
    const newIdx = index + direction;
    if (newIdx < 0 || newIdx >= list.length) return;
    const swapped = [...list];
    [swapped[index], swapped[newIdx]] = [swapped[newIdx], swapped[index]];
    // 전체 첨부 순서: 같은 kind 만 재정렬, 다른 kind 는 원위치 유지
    const newOrder = attachments.map(a => {
      if (a.kind !== kind) return a;
      const idxInKind = list.indexOf(a);
      return swapped[idxInKind];
    });
    reorderMut.mutate(newOrder.map(a => a.id));
  };

  const deleteMut = useMutation({
    mutationFn: async (id: number) => {
      const res = await secureRequest(`/api/notebook/attachments/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.error || '삭제 실패');
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['/api/notebook/entries', journalId, 'attachments'] });
      toast({ title: '삭제 완료' });
    },
    onError: (err: any) => {
      toast({ title: '삭제 실패', description: err?.message || '오류', variant: 'destructive' });
    },
  });

  const validateAndUpload = (file: File) => {
    const mime = file.type.toLowerCase();
    const isImage = ALLOWED_IMAGE_MIME.includes(mime);
    const isVideo = ALLOWED_VIDEO_MIME.includes(mime);
    if (!isImage && !isVideo) {
      toast({ title: '지원하지 않는 파일 형식', description: 'jpeg, png, webp, gif, mp4, webm, mov 만 가능', variant: 'destructive' });
      return;
    }
    if (isImage && file.size > IMAGE_MAX_BYTES) {
      toast({ title: '용량 초과', description: '이미지는 최대 10MB 까지 업로드 가능합니다.', variant: 'destructive' });
      return;
    }
    if (isVideo && file.size > VIDEO_MAX_BYTES) {
      toast({ title: '용량 초과', description: '영상은 최대 50MB 까지 업로드 가능합니다.', variant: 'destructive' });
      return;
    }
    if (isImage && images.length >= MAX_IMAGES) {
      toast({ title: '최대 5장까지 업로드할 수 있습니다.', variant: 'destructive' });
      return;
    }
    if (isVideo && videos.length >= MAX_VIDEOS) {
      toast({ title: '영상은 알림장당 1개만 업로드할 수 있습니다.', variant: 'destructive' });
      return;
    }
    uploadMut.mutate(file);
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (f) validateAndUpload(f);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!canEdit) return;
    const f = e.dataTransfer.files?.[0];
    if (f) validateAndUpload(f);
  };

  // Lightbox keyboard nav
  useEffect(() => {
    if (lightboxIndex === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxIndex(null);
      else if (e.key === 'ArrowLeft') setLightboxIndex(i => (i === null ? null : (i - 1 + images.length) % images.length));
      else if (e.key === 'ArrowRight') setLightboxIndex(i => (i === null ? null : (i + 1) % images.length));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightboxIndex, images.length]);

  return (
    <div className="border-t pt-4 mt-2 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold flex items-center gap-2">
          <ImageIcon className="h-4 w-4" /> 사진·영상 ({attachments.length})
        </h4>
        {canEdit && (
          <div className="flex items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
              hidden
              onChange={onFileChange}
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={uploadMut.isPending}
              onClick={() => fileRef.current?.click()}
              data-testid="button-attach-file"
            >
              {uploadMut.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
              파일 추가
            </Button>
          </div>
        )}
      </div>

      {canEdit && (
        <div
          className="text-xs text-muted-foreground border border-dashed rounded-md px-3 py-2 bg-muted/30"
          onDragOver={e => e.preventDefault()}
          onDrop={onDrop}
        >
          이미지 최대 5장(장당 10MB) · 영상 1개(최대 50MB) — 끌어다 놓거나 “파일 추가”를 누르세요.
        </div>
      )}

      {isLoading ? (
        <div className="text-sm text-muted-foreground py-4 flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" /> 첨부파일을 불러오는 중...
        </div>
      ) : attachments.length === 0 ? (
        <div className="text-sm text-muted-foreground py-4">첨부된 사진이나 영상이 없습니다.</div>
      ) : (
        <>
          {images.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {images.map((a, idx) => (
                <div key={a.id} className="relative group rounded-md overflow-hidden border bg-muted">
                  <button
                    type="button"
                    className="block w-full aspect-square"
                    onClick={() => setLightboxIndex(idx)}
                    data-testid={`button-open-image-${a.id}`}
                  >
                    <img src={a.url} alt="알림장 사진" className="w-full h-full object-cover" loading="lazy" />
                  </button>
                  {canEdit && (
                    <>
                      <div className="absolute top-1 left-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => moveAttachment('image', idx, -1)}
                          disabled={idx === 0 || reorderMut.isPending}
                          className="p-1 rounded-full bg-black/60 text-white disabled:opacity-30"
                          aria-label="앞으로"
                          data-testid={`button-move-up-${a.id}`}
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveAttachment('image', idx, 1)}
                          disabled={idx === images.length - 1 || reorderMut.isPending}
                          className="p-1 rounded-full bg-black/60 text-white disabled:opacity-30"
                          aria-label="뒤로"
                          data-testid={`button-move-down-${a.id}`}
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm('이 첨부파일을 삭제하시겠습니까?')) deleteMut.mutate(a.id);
                        }}
                        className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        data-testid={`button-delete-attachment-${a.id}`}
                        aria-label="삭제"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          {videos.length > 0 && (
            <div className="space-y-2">
              {videos.map((a) => (
                <div key={a.id} className="relative rounded-md overflow-hidden border bg-black">
                  <video
                    src={a.url}
                    poster={a.thumbnailUrl || undefined}
                    controls
                    preload="metadata"
                    className="w-full max-h-[420px] bg-black"
                  >
                    <VideoIcon className="h-4 w-4" /> 영상 재생을 지원하지 않는 브라우저입니다.
                  </video>
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm('이 영상을 삭제하시겠습니까?')) deleteMut.mutate(a.id);
                      }}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 text-white"
                      data-testid={`button-delete-attachment-${a.id}`}
                      aria-label="삭제"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Lightbox */}
      {lightboxIndex !== null && images[lightboxIndex] && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxIndex(null)}
        >
          <button
            type="button"
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20"
            onClick={(e) => { e.stopPropagation(); setLightboxIndex(null); }}
            aria-label="닫기"
            data-testid="button-lightbox-close"
          >
            <X className="h-5 w-5" />
          </button>
          {images.length > 1 && (
            <>
              <button
                type="button"
                className="absolute left-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20"
                onClick={(e) => { e.stopPropagation(); setLightboxIndex((lightboxIndex - 1 + images.length) % images.length); }}
                aria-label="이전"
                data-testid="button-lightbox-prev"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                type="button"
                className="absolute right-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20"
                onClick={(e) => { e.stopPropagation(); setLightboxIndex((lightboxIndex + 1) % images.length); }}
                aria-label="다음"
                data-testid="button-lightbox-next"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          )}
          <img
            src={images[lightboxIndex].url}
            alt="알림장 사진 확대"
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm bg-black/60 px-3 py-1 rounded-full">
            {lightboxIndex + 1} / {images.length}
          </div>
        </div>
      )}
    </div>
  );
}
