import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Calendar as CalendarIcon,
  Clock,
  FileText,
  User,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  Filter,
  Download,
  TrendingUp,
  Users,
  BookOpen,
  MessageCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

interface TrainerStats {
  trainerId: number;
  trainerName: string;
  totalJournals: number;
  sentJournals: number;
  readJournals: number;
  dates: {
    date: string;
    status: string;
    petName: string;
    title: string;
  }[];
}

interface NotebookStatus {
  stats: TrainerStats[];
  totalJournals: number;
}

export default function NotebookMonitorPage() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedTrainer, setSelectedTrainer] = useState<TrainerStats | null>(null);
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [timeRange, setTimeRange] = useState({
    startTime: '00:00',
    endTime: '23:59'
  });
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isTrainerDetailOpen, setIsTrainerDetailOpen] = useState(false);

  // API 호출로 알림장 현황 가져오기
  const { data: notebookStatus, isLoading, refetch } = useQuery<NotebookStatus>({
    queryKey: ['/api/admin/notebook/status', dateRange.start, dateRange.end, timeRange.startTime, timeRange.endTime],
    queryFn: async () => {
      const response = await fetch(`/api/admin/notebook/status?startDate=${dateRange.start}&endDate=${dateRange.end}&startTime=${timeRange.startTime}&endTime=${timeRange.endTime}`);
      const data = await response.json();
      // 데이터 구조 안전성 확인
      return {
        stats: Array.isArray(data.stats) ? data.stats : [],
        totalJournals: data.totalJournals || 0
      };
    }
  });

  const handleDateRangeChange = (field: 'start' | 'end', value: string) => {
    setDateRange(prev => ({ ...prev, [field]: value }));
  };

  const handleTimeRangeChange = (field: 'startTime' | 'endTime', value: string) => {
    setTimeRange(prev => ({ ...prev, [field]: value }));
  };

  const handleTrainerDetail = (trainer: TrainerStats) => {
    setSelectedTrainer(trainer);
    setIsTrainerDetailOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent': return 'bg-primary';
      case 'read': return 'bg-success';
      case 'replied': return 'bg-primary/50';
      case 'draft': return 'bg-warning';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'sent': return '전송됨';
      case 'read': return '읽음';
      case 'replied': return '답장됨';
      case 'draft': return '임시저장';
      default: return '알 수 없음';
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center space-x-2">
          <Clock className="h-5 w-5 animate-spin" />
          <span>알림장 현황을 불러오는 중...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* 헤더 */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">알림장 현황 모니터링</h1>
          <p className="text-gray-600">훈련사별 알림장 작성 및 전송 현황을 확인하세요</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => refetch()}>
            <FileText className="h-4 w-4 mr-2" />
            새로고침
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            내보내기
          </Button>
        </div>
      </div>

      {/* 필터 섹션 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="h-5 w-5 mr-2" />
            기간 필터
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
            <div>
              <Label htmlFor="startDate">시작일</Label>
              <Input
                id="startDate"
                type="date"
                value={dateRange.start}
                onChange={(e) => handleDateRangeChange('start', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="endDate">종료일</Label>
              <Input
                id="endDate"
                type="date"
                value={dateRange.end}
                onChange={(e) => handleDateRangeChange('end', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="startTime">시작 시간</Label>
              <Input
                id="startTime"
                type="time"
                value={timeRange.startTime}
                onChange={(e) => handleTimeRangeChange('startTime', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="endTime">종료 시간</Label>
              <Input
                id="endTime"
                type="time"
                value={timeRange.endTime}
                onChange={(e) => handleTimeRangeChange('endTime', e.target.value)}
              />
            </div>
            <div className="flex space-x-2">
              <Button onClick={() => refetch()}>
                <Filter className="h-4 w-4 mr-2" />
                적용
              </Button>
              <Dialog open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    달력
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>날짜 선택</DialogTitle>
                    <DialogDescription>
                      알림장 모니터링할 날짜를 선택하세요.
                    </DialogDescription>
                  </DialogHeader>
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    locale={ko}
                  />
                </DialogContent>
              </Dialog>
            </div>
          </div>
          
          {/* 빠른 시간 설정 버튼들 */}
          <div className="mt-4 flex flex-wrap gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                setTimeRange({ startTime: '00:00', endTime: '23:59' });
                refetch();
              }}
            >
              전체 시간
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                setTimeRange({ startTime: '09:00', endTime: '18:00' });
                refetch();
              }}
            >
              업무 시간 (09:00-18:00)
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                setTimeRange({ startTime: '06:00', endTime: '12:00' });
                refetch();
              }}
            >
              오전 (06:00-12:00)
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                setTimeRange({ startTime: '12:00', endTime: '18:00' });
                refetch();
              }}
            >
              오후 (12:00-18:00)
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                setTimeRange({ startTime: '18:00', endTime: '23:59' });
                refetch();
              }}
            >
              저녁 (18:00-23:59)
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 통계 요약 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">총 알림장 수</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{notebookStatus?.totalJournals || 0}</div>
            <p className="text-xs text-muted-foreground">전체 기간</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">활성 훈련사</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(notebookStatus?.stats || []).length}</div>
            <p className="text-xs text-muted-foreground">알림장 작성중</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">전송 완료</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(notebookStatus?.stats || []).reduce((acc, curr) => acc + curr.sentJournals, 0)}
            </div>
            <p className="text-xs text-muted-foreground">견주에게 전송됨</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">읽음 완료</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(notebookStatus?.stats || []).reduce((acc, curr) => acc + curr.readJournals, 0)}
            </div>
            <p className="text-xs text-muted-foreground">견주가 확인함</p>
          </CardContent>
        </Card>
      </div>

      {/* 훈련사별 현황 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <User className="h-5 w-5 mr-2" />
            훈련사별 알림장 현황
          </CardTitle>
          <CardDescription>
            각 훈련사의 알림장 작성 및 전송 현황을 확인하세요
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {notebookStatus?.stats.map((trainer) => (
              <div key={trainer.trainerId} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{trainer.trainerName}</h3>
                      <p className="text-sm text-gray-600">훈련사 ID: {trainer.trainerId}</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleTrainerDetail(trainer)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    상세보기
                  </Button>
                </div>
                
                <div className="grid grid-cols-3 gap-4 mb-3">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">{trainer.totalJournals}</div>
                    <div className="text-sm text-gray-600">총 알림장</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-success">{trainer.sentJournals}</div>
                    <div className="text-sm text-gray-600">전송됨</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">{trainer.readJournals}</div>
                    <div className="text-sm text-gray-600">읽음</div>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {trainer.dates.slice(0, 5).map((entry, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {format(new Date(entry.date), 'MM/dd', { locale: ko })} - {entry.petName}
                    </Badge>
                  ))}
                  {trainer.dates.length > 5 && (
                    <Badge variant="outline" className="text-xs">
                      +{trainer.dates.length - 5}개 더
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 훈련사 상세 정보 모달 */}
      <Dialog open={isTrainerDetailOpen} onOpenChange={setIsTrainerDetailOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <User className="h-5 w-5 mr-2" />
              {selectedTrainer?.trainerName} 상세 현황
            </DialogTitle>
          </DialogHeader>
          {selectedTrainer && (
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">총 알림장</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{selectedTrainer.totalJournals}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">전송됨</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-success">{selectedTrainer.sentJournals}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">읽음</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-primary">{selectedTrainer.readJournals}</div>
                  </CardContent>
                </Card>
              </div>
              
              <div>
                <h3 className="font-semibold mb-3">알림장 작성 내역</h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {(selectedTrainer.dates || []).map((entry, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${getStatusColor(entry.status)}`}></div>
                        <div>
                          <div className="font-medium">{entry.title}</div>
                          <div className="text-sm text-gray-600">{entry.petName}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm">{format(new Date(entry.date), 'yyyy-MM-dd', { locale: ko })}</div>
                        <Badge variant="outline" className="text-xs">
                          {getStatusText(entry.status)}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}