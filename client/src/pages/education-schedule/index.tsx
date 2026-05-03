import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, MapPin, User, Plus, Filter } from 'lucide-react';

const EducationSchedulePage = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');

  // 교육 일정 데이터
  const schedules = [
    {
      id: 1,
      title: '기본 훈련 - 앉기/기다리기',
      trainer: '김훈련사',
      petName: '멍멍이',
      date: '2025-06-02',
      time: '14:00 - 15:00',
      location: '강남 훈련센터',
      status: 'scheduled',
      type: 'individual'
    },
    {
      id: 2,
      title: '사회화 훈련',
      trainer: '박전문가',
      petName: '바둑이',
      date: '2025-06-03',
      time: '10:00 - 11:30',
      location: '서초 반려동물파크',
      status: 'confirmed',
      type: 'group'
    },
    {
      id: 3,
      title: '문제행동 교정',
      trainer: '이훈련사',
      petName: '멍멍이',
      date: '2025-06-05',
      time: '16:00 - 17:00',
      location: '온라인 화상훈련',
      status: 'pending',
      type: 'online'
    },
    {
      id: 4,
      title: '고급 훈련 - 트릭 배우기',
      trainer: '김훈련사',
      petName: '바둑이',
      date: '2025-06-07',
      time: '15:00 - 16:00',
      location: '강남 훈련센터',
      status: 'scheduled',
      type: 'individual'
    }
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <Badge variant="success" className="bg-success/10 text-success">확정</Badge>;
      case 'scheduled':
        return <Badge variant="default" className="bg-primary/10 text-primary">예약됨</Badge>;
      case 'pending':
        return <Badge variant="warning" className="bg-warning/10 text-warning">대기중</Badge>;
      case 'cancelled':
        return <Badge variant="danger" className="bg-destructive/10 text-destructive">취소됨</Badge>;
      default:
        return <Badge variant="outline">알 수 없음</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'individual':
        return <Badge variant="outline">개별</Badge>;
      case 'group':
        return <Badge variant="outline">그룹</Badge>;
      case 'online':
        return <Badge variant="outline">온라인</Badge>;
      default:
        return <Badge variant="outline">기타</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* 헤더 */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              교육 일정
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              반려동물 훈련 일정을 확인하고 관리하세요.
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              필터
            </Button>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              일정 추가
            </Button>
          </div>
        </div>

        {/* 달력 보기 전환 */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Button
              variant={viewMode === 'week' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('week')}
            >
              주간 보기
            </Button>
            <Button
              variant={viewMode === 'month' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('month')}
            >
              월간 보기
            </Button>
          </div>
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {selectedDate.toLocaleDateString('ko-KR', { 
                year: 'numeric', 
                month: 'long' 
              })}
            </span>
          </div>
        </div>

        {/* 일정 목록 */}
        <div className="grid gap-4">
          {schedules.map((schedule) => (
            <Card key={schedule.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {schedule.title}
                      </h3>
                      {getTypeBadge(schedule.type)}
                      {getStatusBadge(schedule.status)}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-gray-600 dark:text-gray-400">
                      <div className="flex items-center">
                        <User className="h-4 w-4 mr-2" />
                        <span>훈련사: {schedule.trainer}</span>
                      </div>
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-2" />
                        <span>{schedule.date}</span>
                      </div>
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-2" />
                        <span>{schedule.time}</span>
                      </div>
                      <div className="flex items-center">
                        <MapPin className="h-4 w-4 mr-2" />
                        <span>{schedule.location}</span>
                      </div>
                    </div>
                    
                    <div className="mt-3 flex items-center text-sm">
                      <span className="text-gray-500 mr-2">반려동물:</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {schedule.petName}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex flex-col space-y-2 ml-4">
                    <Button variant="outline" size="sm">
                      수정
                    </Button>
                    <Button variant="outline" size="sm">
                      취소
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* 빈 상태 */}
        {schedules.length === 0 && (
          <Card className="text-center py-12">
            <CardContent>
              <div className="text-gray-500 dark:text-gray-400 mb-4">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">예정된 교육 일정이 없습니다</h3>
                <p>새로운 훈련 일정을 추가해보세요.</p>
              </div>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                첫 번째 일정 추가하기
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default EducationSchedulePage;