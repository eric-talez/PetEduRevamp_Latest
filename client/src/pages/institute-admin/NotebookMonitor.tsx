import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  MessageCircle,
  Search,
  RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useAuth } from '@/lib/auth-compat';

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
  const { userRole } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedTrainer, setSelectedTrainer] = useState<TrainerStats | null>(null);
  const [selectedTrainerFilter, setSelectedTrainerFilter] = useState<string>('all');
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
    queryKey: ['/api/institute/notebook/status', dateRange.start, dateRange.end, timeRange.startTime, timeRange.endTime],
    queryFn: async () => {
      const response = await fetch(`/api/institute/notebook/status?startDate=${dateRange.start}&endDate=${dateRange.end}&startTime=${timeRange.startTime}&endTime=${timeRange.endTime}`);
      const data = await response.json();
      // 데이터 구조 안전성 확인
      return {
        stats: Array.isArray(data.stats) ? data.stats : [],
        totalJournals: data.totalJournals || 0
      };
    }
  });

  // 훈련사 필터링된 데이터
  const filteredStats = notebookStatus?.stats?.filter(stat => {
    if (selectedTrainerFilter === 'all') return true;
    return stat.trainerId.toString() === selectedTrainerFilter;
  }) || [];

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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent': return <MessageCircle className="h-4 w-4" />;
      case 'read': return <CheckCircle className="h-4 w-4" />;
      case 'replied': return <BookOpen className="h-4 w-4" />;
      case 'draft': return <FileText className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">알림장 현황 모니터링</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1">소속 훈련사들의 알림장 작성 현황을 확인하세요</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={() => refetch()} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            새로고침
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            내보내기
          </Button>
        </div>
      </div>

      {/* 필터 섹션 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-lg">
            <Filter className="h-5 w-5 mr-2" />
            필터 및 검색
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 훈련사 필터 */}
            <div className="space-y-2">
              <Label htmlFor="trainer-filter">훈련사 필터</Label>
              <Select value={selectedTrainerFilter} onValueChange={setSelectedTrainerFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="훈련사 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 훈련사</SelectItem>
                  {notebookStatus?.stats?.map(stat => (
                    <SelectItem key={stat.trainerId} value={stat.trainerId.toString()}>
                      {stat.trainerName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 날짜 범위 */}
            <div className="space-y-2">
              <Label htmlFor="start-date">시작 날짜</Label>
              <Input
                id="start-date"
                type="date"
                value={dateRange.start}
                onChange={(e) => handleDateRangeChange('start', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end-date">종료 날짜</Label>
              <Input
                id="end-date"
                type="date"
                value={dateRange.end}
                onChange={(e) => handleDateRangeChange('end', e.target.value)}
              />
            </div>

            {/* 시간 범위 */}
            <div className="space-y-2">
              <Label htmlFor="time-range">시간 범위</Label>
              <div className="flex space-x-2">
                <Input
                  type="time"
                  value={timeRange.startTime}
                  onChange={(e) => handleTimeRangeChange('startTime', e.target.value)}
                  className="flex-1"
                />
                <Input
                  type="time"
                  value={timeRange.endTime}
                  onChange={(e) => handleTimeRangeChange('endTime', e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 통계 요약 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">총 알림장</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{notebookStatus?.totalJournals || 0}</p>
              </div>
              <FileText className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">활성 훈련사</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{filteredStats.length}</p>
              </div>
              <Users className="h-8 w-8 text-success" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">전송된 알림장</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {filteredStats.reduce((sum, stat) => sum + stat.sentJournals, 0)}
                </p>
              </div>
              <MessageCircle className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">읽은 알림장</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {filteredStats.reduce((sum, stat) => sum + stat.readJournals, 0)}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-success" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 훈련사별 알림장 현황 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <User className="h-5 w-5 mr-2" />
            훈련사별 알림장 현황
            {selectedTrainerFilter !== 'all' && (
              <Badge variant="outline" className="ml-2">
                {notebookStatus?.stats?.find(s => s.trainerId.toString() === selectedTrainerFilter)?.trainerName}
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            각 훈련사의 알림장 작성 및 전송 현황을 확인할 수 있습니다
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredStats.length > 0 ? (
              filteredStats.map((trainer) => (
                <div key={trainer.trainerId} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-primary/10 dark:bg-primary/20 rounded-full flex items-center justify-center">
                        <User className="h-5 w-5 text-primary dark:text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">{trainer.trainerName}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          총 {trainer.totalJournals}개 알림장 작성
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="text-primary border-primary/30">
                        전송: {trainer.sentJournals}
                      </Badge>
                      <Badge variant="outline" className="text-success border-success/30">
                        읽음: {trainer.readJournals}
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleTrainerDetail(trainer)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        상세보기
                      </Button>
                    </div>
                  </div>

                  {/* 진행률 표시 */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>전송률</span>
                      <span>{trainer.totalJournals > 0 ? Math.round((trainer.sentJournals / trainer.totalJournals) * 100) : 0}%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all duration-300"
                        style={{ width: `${trainer.totalJournals > 0 ? (trainer.sentJournals / trainer.totalJournals) * 100 : 0}%` }}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>읽음률</span>
                      <span>{trainer.sentJournals > 0 ? Math.round((trainer.readJournals / trainer.sentJournals) * 100) : 0}%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-success h-2 rounded-full transition-all duration-300"
                        style={{ width: `${trainer.sentJournals > 0 ? (trainer.readJournals / trainer.sentJournals) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>선택한 조건에 해당하는 알림장이 없습니다.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 훈련사 상세 정보 다이얼로그 */}
      <Dialog open={isTrainerDetailOpen} onOpenChange={setIsTrainerDetailOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <User className="h-5 w-5 mr-2" />
              {selectedTrainer?.trainerName} 훈련사 상세 현황
            </DialogTitle>
            <DialogDescription>
              알림장 작성 및 전송 상세 내역을 확인할 수 있습니다
            </DialogDescription>
          </DialogHeader>
          
          {selectedTrainer && (
            <div className="space-y-4">
              {/* 요약 통계 */}
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-primary">{selectedTrainer.totalJournals}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">총 알림장</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-success">{selectedTrainer.sentJournals}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">전송됨</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-primary">{selectedTrainer.readJournals}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">읽음</div>
                  </CardContent>
                </Card>
              </div>

              {/* 알림장 목록 */}
              <Card>
                <CardHeader>
                  <CardTitle>알림장 목록</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {selectedTrainer.dates.map((entry, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className={`w-3 h-3 rounded-full ${getStatusColor(entry.status)}`} />
                          <div>
                            <div className="font-medium">{entry.title}</div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              {entry.petName} • {format(new Date(entry.date), 'yyyy-MM-dd', { locale: ko })}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(entry.status)}
                          <Badge variant="outline" className="text-xs">
                            {getStatusText(entry.status)}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}