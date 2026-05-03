import { useState } from 'react';
import { useGlobalAuth } from '@/hooks/useGlobalAuth';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Heart,
  Calendar,
  Users,
  UserCheck,
  Plus,
  Search,
  Filter,
  AlertTriangle
} from 'lucide-react';

interface Assignment {
  id: number;
  petName: string;
  ownerName: string;
  trainerName: string;
  courseName: string;
  startDate: string;
  status: 'active' | 'completed' | 'pending';
  progress: number;
}

export default function InstitutePetAssignments() {
  const { userName } = useGlobalAuth();
  const { toast } = useToast();

  // API에서 반려견 배정 데이터 로딩
  const { data: assignments = [], isLoading, isError, refetch } = useQuery<Assignment[]>({
    queryKey: ['/api/institute/pet-assignments'],
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="flex flex-col items-center gap-2">
          <Heart className="h-8 w-8 animate-pulse text-primary" />
          <p className="text-sm text-muted-foreground">반려견 배정 정보 로딩 중...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)]">
        <AlertTriangle className="h-10 w-10 text-destructive mb-4" />
        <p className="text-lg font-medium mb-2">데이터를 불러오는데 실패했습니다</p>
        <p className="text-sm text-muted-foreground mb-4">잠시 후 다시 시도해주세요</p>
        <Button onClick={() => refetch()}>다시 시도</Button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">반려견 배정</h1>
          <p className="text-muted-foreground">반려견과 훈련사 배정을 관리하세요</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          새 배정
        </Button>
      </div>

      {assignments.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <Heart className="h-12 w-12 text-muted-foreground" />
            <div>
              <h3 className="text-lg font-semibold">배정된 반려견이 없습니다</h3>
              <p className="text-muted-foreground mt-1">새로운 배정을 추가하여 시작하세요</p>
            </div>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              첫 번째 배정 추가
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {assignments.map((assignment) => (
            <Card key={assignment.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="h-5 w-5 text-destructive" />
                  {assignment.petName}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">보호자</p>
                    <p className="font-medium">{assignment.ownerName}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">담당 훈련사</p>
                    <p className="font-medium">{assignment.trainerName}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">진행률</p>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full" 
                      style={{ width: `${assignment.progress}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{assignment.progress}% 완료</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}