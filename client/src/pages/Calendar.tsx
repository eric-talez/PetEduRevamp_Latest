import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon, Clock, Plus, PawPrint, User, MapPin } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';

// React DayPicker component for the calendar
import { DayPicker } from 'react-day-picker';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

// Mock calendar events data
const calendarEvents = [
  {
    id: 1,
    title: "기본 훈련 12주차",
    date: new Date(2023, 5, 15, 17, 0),
    type: "lesson",
    location: "퍼펙트 펫 아카데미",
    pet: {
      id: "mongi",
      name: "몽이",
      image: "https://images.unsplash.com/photo-1537151608828-ea2b11777ee8?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100"
    },
    trainer: {
      id: 1,
      name: "김훈련",
      image: "https://images.unsplash.com/photo-1607990281513-2c110a25bd8c?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100"
    }
  },
  {
    id: 2,
    title: "어질리티 훈련 6주차",
    date: new Date(2023, 5, 16, 14, 0),
    type: "lesson",
    location: "해피 도그 스쿨",
    pet: {
      id: "mongi",
      name: "몽이",
      image: "https://images.unsplash.com/photo-1537151608828-ea2b11777ee8?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100"
    },
    trainer: {
      id: 2,
      name: "박민첩",
      image: "https://images.unsplash.com/photo-1548535537-3cfaf1fc327c?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100"
    }
  },
  {
    id: 3,
    title: "사회화 훈련 8주차",
    date: new Date(2023, 5, 17, 15, 30),
    type: "lesson",
    location: "캐닌 에듀케이션 센터",
    pet: {
      id: "tori",
      name: "토리",
      image: "https://images.unsplash.com/photo-1600077106724-946750eeaf3c?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100"
    },
    trainer: {
      id: 3,
      name: "이사회",
      image: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100"
    }
  },
  {
    id: 4,
    title: "정기 건강 검진",
    date: new Date(2023, 5, 22, 14, 0),
    type: "medical",
    location: "행복한 동물병원",
    pet: {
      id: "tori",
      name: "토리",
      image: "https://images.unsplash.com/photo-1600077106724-946750eeaf3c?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100"
    }
  },
  {
    id: 5,
    title: "그루밍 예약",
    date: new Date(2023, 5, 20, 11, 0),
    type: "grooming",
    location: "멍멍살롱",
    pet: {
      id: "tori",
      name: "토리",
      image: "https://images.unsplash.com/photo-1600077106724-946750eeaf3c?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100"
    }
  }
];

export default function Calendar() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedPet, setSelectedPet] = useState<string | undefined>("all");
  
  // Filter events based on selected date and pet
  const eventsForSelectedDate = selectedDate 
    ? calendarEvents.filter(event => 
        format(event.date, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd') && 
        (selectedPet === "all" || event.pet.id === selectedPet)
      )
    : [];
  
  // Function to get event badge color based on type
  const getEventBadge = (type: string) => {
    switch(type) {
      case 'lesson':
        return <Badge variant="blue">강의</Badge>;
      case 'medical':
        return <Badge variant="red">의료</Badge>;
      case 'grooming':
        return <Badge variant="purple">그루밍</Badge>;
      default:
        return <Badge variant="outline">기타</Badge>;
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">교육 일정</h1>
      
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="lg:w-1/2">
          <Card>
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <span>일정 캘린더</span>
                <Button variant="outline" size="sm" className="flex items-center gap-1">
                  <Plus className="w-4 h-4" />
                  일정 추가
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <Select value={selectedPet} onValueChange={(value) => setSelectedPet(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="반려견 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">모든 반려견</SelectItem>
                    <SelectItem value="tori">토리</SelectItem>
                    <SelectItem value="mongi">몽이</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <DayPicker
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                locale={ko}
                className="mx-auto"
                modifiersClassNames={{
                  selected: 'bg-primary text-primary-foreground',
                  today: 'bg-accent/20 text-accent-foreground',
                }}
                styles={{
                  caption: { color: 'var(--primary)' }
                }}
              />
            </CardContent>
          </Card>
        </div>
        
        <div className="lg:w-1/2">
          <Card>
            <CardHeader>
              <CardTitle>
                {selectedDate && (
                  <div className="flex items-center">
                    <CalendarIcon className="w-5 h-5 mr-2 text-primary" />
                    <span>
                      {format(selectedDate, 'PPP', { locale: ko })} 일정
                    </span>
                  </div>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {eventsForSelectedDate.length > 0 ? (
                <div className="space-y-4">
                  {eventsForSelectedDate.map((event) => (
                    <div key={event.id} className="p-4 border border-gray-100 dark:border-gray-700 rounded-lg">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium">{event.title}</h3>
                            {getEventBadge(event.type)}
                          </div>
                          <div className="flex items-center mt-1 text-sm text-gray-600 dark:text-gray-400">
                            <Clock className="w-4 h-4 mr-1" />
                            <span>{format(event.date, 'p', { locale: ko })}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-1">
                          <Avatar 
                            src={event.pet.image} 
                            alt={event.pet.name}
                            size="sm"
                            border
                          />
                        </div>
                      </div>
                      
                      <div className="flex flex-col space-y-2">
                        <div className="flex items-center text-sm">
                          <MapPin className="w-4 h-4 mr-1 text-gray-500" />
                          <span>{event.location}</span>
                        </div>
                        
                        {event.type === 'lesson' && event.trainer && (
                          <div className="flex items-center text-sm">
                            <User className="w-4 h-4 mr-1 text-gray-500" />
                            <span>트레이너: {event.trainer.name}</span>
                          </div>
                        )}
                        
                        <div className="flex items-center text-sm">
                          <PawPrint className="w-4 h-4 mr-1 text-gray-500" />
                          <span>반려견: {event.pet.name}</span>
                        </div>
                      </div>
                      
                      <div className="mt-4 flex gap-2">
                        <Button variant="outline" size="sm">일정 수정</Button>
                        <Button variant="outline" size="sm" className="text-destructive hover:text-destructive/90">취소</Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <CalendarIcon className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-4" />
                  <h3 className="font-medium text-gray-700 dark:text-gray-300 mb-1">일정이 없습니다</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
                    선택한 날짜에 예정된 일정이 없습니다. 새 일정을 추가해보세요.
                  </p>
                  <Button className="mt-4">
                    <Plus className="w-4 h-4 mr-2" />
                    일정 추가
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>다가오는 일정</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {calendarEvents
                  .filter(event => event.date > new Date())
                  .sort((a, b) => a.date.getTime() - b.date.getTime())
                  .slice(0, 3)
                  .map(event => (
                    <div key={event.id} className="flex items-center p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                      <Avatar 
                        src={event.pet.image} 
                        alt={event.pet.name}
                        size="sm"
                        border
                        className="flex-shrink-0"
                      />
                      <div className="ml-3 flex-1">
                        <div className="flex items-center">
                          <div className="font-medium text-sm">{event.title}</div>
                          <div className="ml-2">{getEventBadge(event.type)}</div>
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400 flex items-center mt-1">
                          <CalendarIcon className="w-3 h-3 mr-1" />
                          {format(event.date, 'PPP p', { locale: ko })}
                        </div>
                      </div>
                    </div>
                  ))
                }
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
