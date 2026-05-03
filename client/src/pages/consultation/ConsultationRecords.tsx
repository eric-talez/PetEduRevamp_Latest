import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { useAuth } from '@/lib/auth-compat';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import {
  ClipboardList,
  Plus,
  Search,
  Calendar,
  PawPrint,
  User,
  Star,
  Eye,
  Loader2
} from 'lucide-react';

const TEMPERAMENT_COLORS: Record<string, string> = {
  A: 'bg-success/10 text-success',
  B: 'bg-primary/10 text-primary',
  C: 'bg-warning/10 text-warning',
  D: 'bg-primary/10 text-primary',
  E: 'bg-destructive/10 text-destructive',
};

const TEMPERAMENT_LABELS: Record<string, string> = {
  A: '사회성 양호',
  B: '흥분 조절',
  C: '짖음/경계',
  D: '공격성 주의',
  E: '분리불안',
};

export default function ConsultationRecords() {
  const [, setLocation] = useLocation();
  const { userRole } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');

  const { data, isLoading } = useQuery<{ success: boolean; consultations: any[] }>({
    queryKey: ['/api/consultation-records'],
  });

  const consultations = data?.consultations || [];
  const filtered = consultations.filter((c: any) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      c.petName?.toLowerCase().includes(term) ||
      c.ownerName?.toLowerCase().includes(term) ||
      c.trainerName?.toLowerCase().includes(term) ||
      c.visitPurpose?.toLowerCase().includes(term)
    );
  });

  const canCreate = ['trainer', 'institute-admin', 'admin'].includes(userRole || '');

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-primary" />
            첫 방문 상담 기록
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {userRole === 'pet-owner' ? '내 반려동물의 상담 기록을 확인하세요' : '반려견 첫 방문 상담 기록을 관리하세요'}
          </p>
        </div>
        {canCreate && (
          <Button onClick={() => setLocation('/consultation-records/new')} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            새 상담 기록
          </Button>
        )}
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="반려동물, 보호자, 훈련사 이름 또는 방문 목적으로 검색..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="ml-2 text-muted-foreground">상담 기록을 불러오는 중...</span>
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <ClipboardList className="w-16 h-16 text-muted-foreground/30 mb-4" />
            <p className="text-lg font-medium text-muted-foreground mb-2">
              {searchTerm ? '검색 결과가 없습니다' : '상담 기록이 없습니다'}
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              {canCreate ? '새 상담 기록을 작성해보세요.' : '아직 상담 기록이 없습니다.'}
            </p>
            {canCreate && (
              <Button onClick={() => setLocation('/consultation-records/new')}>
                <Plus className="w-4 h-4 mr-2" />
                첫 상담 기록 작성
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filtered.map((c: any) => (
            <Card key={c.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setLocation(`/consultation-records/${c.id}`)}>
              <CardContent className="p-5">
                <div className="flex flex-col sm:flex-row justify-between gap-3">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <PawPrint className="w-4 h-4 text-primary" />
                        <span className="font-semibold text-base">{c.petName || '미등록'}</span>
                      </div>
                      {c.petBreed && (
                        <Badge variant="outline" className="text-xs">{c.petBreed}</Badge>
                      )}
                      {c.temperamentLevel && (
                        <Badge className={`text-xs ${TEMPERAMENT_COLORS[c.temperamentLevel] || ''}`}>
                          {c.temperamentLevel}등급 - {TEMPERAMENT_LABELS[c.temperamentLevel]}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5" />
                        보호자: {c.ownerName || '-'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Star className="w-3.5 h-3.5" />
                        훈련사: {c.trainerName || '-'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {formatDate(c.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-1">
                      <span className="font-medium">방문목적:</span> {c.visitPurpose}
                    </p>
                  </div>
                  <div className="flex items-center">
                    <Button variant="ghost" size="sm" className="text-primary">
                      <Eye className="w-4 h-4 mr-1" />
                      상세보기
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="mt-6 text-sm text-muted-foreground text-center">
        총 {filtered.length}건의 상담 기록
      </div>
    </div>
  );
}
