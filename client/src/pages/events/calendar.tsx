import { useState, useEffect } from 'react';
import { useLocation, Link } from 'wouter';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon,
  MapPin,
  Clock,
  Users,
  Search
} from 'lucide-react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// 임시 데이터 타입 정의
interface EventLocation {
  id: number;
  name: string;
  address: string;
  lat: number;
  lng: number;
  region: string;
}

interface EventItem {
  id: number;
  title: string;
  description: string;
  image: string;
  date: string;
  time: string;
  location: EventLocation;
  organizer: {
    name: string;
    avatar: string;
  };
  category: string;
  price: number | '무료';
  attendees: number;
  maxAttendees?: number;
}

// 임시 데이터
const MOCK_EVENTS: EventItem[] = [
  {
    id: 1,
    title: "강아지 사회화 모임",
    description: "다양한 강아지들과 함께하는 사회화 모임입니다.",
    image: "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=400",
    date: "2025-05-15",
    time: "14:00 - 16:00",
    location: {
      id: 1,
      name: "강남 애견공원",
      address: "서울 강남구 삼성동 159",
      lat: 37.508796,
      lng: 127.061359,
      region: "서울"
    },
    organizer: {
      name: "김훈련",
      avatar: "https://images.unsplash.com/photo-1607990281513-2c110a25bd8c?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100"
    },
    category: "소셜",
    price: '무료',
    attendees: 15,
    maxAttendees: 20
  },
  {
    id: 2,
    title: "반려견 건강 세미나",
    description: "반려견의 건강을 위한 영양과 운동에 대한 전문가 세미나입니다.",
    image: "https://images.unsplash.com/photo-1597633425046-08f5110420b5?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=400",
    date: "2025-05-20",
    time: "19:00 - 21:00",
    location: {
      id: 2,
      name: "펫케어 센터",
      address: "서울 서초구 서초동 1445-3",
      lat: 37.491632,
      lng: 127.007358,
      region: "서울"
    },
    organizer: {
      name: "박수의",
      avatar: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100"
    },
    category: "교육",
    price: 15000,
    attendees: 28,
    maxAttendees: 40
  },
  {
    id: 3,
    title: "반려동물 페스티벌",
    description: "다양한 반려동물 용품과 먹거리, 체험 부스가 준비된 대규모 페스티벌입니다.",
    image: "https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=400",
    date: "2025-06-05",
    time: "10:00 - 18:00",
    location: {
      id: 3,
      name: "올림픽공원",
      address: "서울 송파구 방이동 88",
      lat: 37.520847,
      lng: 127.121674,
      region: "서울"
    },
    organizer: {
      name: "동물사랑협회",
      avatar: "https://images.unsplash.com/photo-1551887196-72e32bfc7bf3?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100"
    },
    category: "축제",
    price: 20000,
    attendees: 120
  },
  {
    id: 4,
    title: "강아지 훈련 워크샵",
    description: "기본 훈련부터 고급 훈련까지, 실전 강아지 훈련 워크샵입니다.",
    image: "https://images.unsplash.com/photo-1583337130417-3346a1be7dee?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=400",
    date: "2025-05-25",
    time: "13:00 - 17:00",
    location: {
      id: 4,
      name: "부산 반려동물 교육센터",
      address: "부산 해운대구 우동 1411",
      lat: 35.162844,
      lng: 129.159608,
      region: "부산"
    },
    organizer: {
      name: "최트레이너",
      avatar: "https://images.unsplash.com/photo-1566492031773-4f4e44671857?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100"
    },
    category: "교육",
    price: 50000,
    attendees: 8,
    maxAttendees: 10
  },
  {
    id: 5,
    title: "반려동물 입양 행사",
    description: "새로운 가족을 찾고 있는 유기동물들을 만나볼 수 있는 입양 행사입니다.",
    image: "https://images.unsplash.com/photo-1541364983171-a8ba01e95cfc?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=400",
    date: "2025-06-10",
    time: "11:00 - 16:00",
    location: {
      id: 5,
      name: "대구 반려동물 문화센터",
      address: "대구 수성구 범어동 178-1",
      lat: 35.859971,
      lng: 128.631049,
      region: "대구"
    },
    organizer: {
      name: "하트펫구조협회",
      avatar: "https://images.unsplash.com/photo-1618077360395-f3068be8e001?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100"
    },
    category: "입양",
    price: '무료',
    attendees: 35
  }
];

// 달력 유틸 함수
const getDaysInMonth = (year: number, month: number) => {
  return new Date(year, month + 1, 0).getDate();
};

const getFirstDayOfMonth = (year: number, month: number) => {
  return new Date(year, month, 1).getDay();
};

const months = ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"];

export default function EventCalendarPage() {
  const [, setLocation] = useLocation();
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [eventsOnSelectedDate, setEventsOnSelectedDate] = useState<EventItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  
  // 현재 달의 날짜수와 1일의 요일 계산
  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDayOfMonth = getFirstDayOfMonth(currentYear, currentMonth);
  
  // 이벤트 날짜별 정리
  const eventsByDate = MOCK_EVENTS.reduce((acc: Record<string, EventItem[]>, event) => {
    const date = event.date;
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(event);
    return acc;
  }, {});
  
  // 날짜 선택 핸들러
  const handleDateSelect = (year: number, month: number, day: number) => {
    const date = new Date(year, month, day);
    setSelectedDate(date);
    
    // 선택한 날짜의 이벤트 찾기
    const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const events = eventsByDate[dateString] || [];
    
    // 검색어가 있으면 필터링 적용
    setEventsOnSelectedDate(filterEventsBySearchTerm(events));
  };
  
  // 이전/다음 달 이동
  const goToPrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
    setSelectedDate(null);
    setEventsOnSelectedDate([]);
  };
  
  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
    setSelectedDate(null);
    setEventsOnSelectedDate([]);
  };
  
  // 특정 연도로 이동
  const handleYearChange = (year: string) => {
    setCurrentYear(parseInt(year));
  };
  
  // 특정 월로 이동
  const handleMonthChange = (month: string) => {
    setCurrentMonth(parseInt(month));
  };
  
  // 검색 필터링
  const filterEventsBySearchTerm = (events: EventItem[]) => {
    if (!searchTerm) return events;
    
    return events.filter(event => 
      event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.location.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.location.region.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };
  
  // 연도 옵션 생성 (현재 연도 +/- 5년)
  const yearOptions = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);
  
  // 날짜에 이벤트가 있는지 확인
  const hasEventOnDate = (year: number, month: number, day: number) => {
    const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return eventsByDate[dateString] && eventsByDate[dateString].length > 0;
  };
  
  // 달력 그리드 셀 생성
  const calendarCells = [];
  
  // 이전 달의 날짜들
  const prevMonthDays = currentMonth === 0 
    ? getDaysInMonth(currentYear - 1, 11) 
    : getDaysInMonth(currentYear, currentMonth - 1);
  
  for (let i = 0; i < firstDayOfMonth; i++) {
    const prevMonthDay = prevMonthDays - firstDayOfMonth + i + 1;
    calendarCells.push(
      <div 
        key={`prev-${i}`} 
        className="h-24 border rounded-md p-1 text-gray-400 dark:text-gray-600 bg-gray-50 dark:bg-gray-800/50"
      >
        <div className="text-right text-sm">{prevMonthDay}</div>
      </div>
    );
  }
  
  // 현재 달의 날짜들
  for (let day = 1; day <= daysInMonth; day++) {
    const isToday = 
      today.getDate() === day && 
      today.getMonth() === currentMonth && 
      today.getFullYear() === currentYear;
    
    const isSelected = 
      selectedDate && 
      selectedDate.getDate() === day && 
      selectedDate.getMonth() === currentMonth && 
      selectedDate.getFullYear() === currentYear;
    
    const hasEvent = hasEventOnDate(currentYear, currentMonth, day);
    
    calendarCells.push(
      <div 
        key={`current-${day}`}
        className={`
          h-24 border rounded-md p-1 cursor-pointer transition-colors
          ${isToday ? 'bg-primary/10 dark:bg-primary/20 border-primary/30 dark:border-primary/50' : ''}
          ${isSelected ? 'ring-2 ring-primary ring-offset-2' : ''}
          ${hasEvent ? 'border-primary/40 dark:border-primary/40' : 'border-gray-200 dark:border-gray-700'}
          hover:bg-gray-50 dark:hover:bg-gray-800/50
        `}
        onClick={() => handleDateSelect(currentYear, currentMonth, day)}
      >
        <div className={`
          text-right text-sm font-medium
          ${isToday ? 'text-primary dark:text-primary' : ''}
        `}>
          {day}
        </div>
        
        {hasEvent && (
          <div className="mt-1">
            {eventsByDate[`${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`]
              .slice(0, 2)
              .map((event, index) => (
                <div 
                  key={index}
                  className="bg-primary/10 text-primary text-xs p-1 rounded mb-1 truncate"
                >
                  {event.title}
                </div>
              ))
            }
            {eventsByDate[`${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`].length > 2 && (
              <div className="text-xs text-gray-500 text-center">
                +{eventsByDate[`${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`].length - 2} 더보기
              </div>
            )}
          </div>
        )}
      </div>
    );
  }
  
  // 다음 달의 날짜들로 나머지 칸 채우기
  const remainingCells = 7 - (calendarCells.length % 7);
  if (remainingCells < 7) {
    for (let i = 1; i <= remainingCells; i++) {
      calendarCells.push(
        <div 
          key={`next-${i}`} 
          className="h-24 border rounded-md p-1 text-gray-400 dark:text-gray-600 bg-gray-50 dark:bg-gray-800/50"
        >
          <div className="text-right text-sm">{i}</div>
        </div>
      );
    }
  }
  
  return (
    <div className="container mx-auto px-4 py-6">
      {/* 배너 영역 */}
      <div className="w-full mb-8 rounded-lg overflow-hidden relative">
        <div className="relative h-64 md:h-80">
          <img 
            src="https://images.unsplash.com/photo-1476743430992-6f0d31713aaa?ixlib=rb-4.0.3&auto=format&fit=crop&w=1500&h=400&q=80"
            alt="이벤트 캘린더 배너" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-primary/80 to-transparent flex items-center">
            <div className="px-6 md:px-10 text-white max-w-xl">
              <h1 className="text-3xl md:text-4xl font-bold mb-4">이벤트 캘린더</h1>
              <p className="text-lg mb-4">
                날짜별로 다양한 반려동물 행사를 확인하세요.
                일정을 미리 체크하고 참여해보세요!
              </p>
              
              {/* 배너 내 검색 영역 추가 */}
              <div className="relative flex w-full max-w-md mb-6">
                <Input
                  className="pl-10 pr-16 py-6 text-black dark:text-white border-2 border-white dark:border-gray-700 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm"
                  placeholder="이벤트 검색..."
                  value={searchTerm}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    setSearchTerm(e.target.value);
                    if (selectedDate) {
                      const dateString = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
                      const events = eventsByDate[dateString] || [];
                      setEventsOnSelectedDate(filterEventsBySearchTerm(events));
                    }
                  }}
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500" />
                <Button 
                  className="absolute right-0 h-full rounded-l-none"
                  type="submit"
                >
                  검색
                </Button>
              </div>
              
              <div className="flex space-x-4">
                <Button 
                  className="bg-white text-primary hover:bg-gray-100"
                  onClick={() => setLocation("/events")}
                >
                  <Users className="h-4 w-4 mr-2" />
                  이벤트 목록 보기
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex justify-between items-center mb-8">
        <Link href="/events">
          <Button variant="outline" className="flex items-center">
            <ChevronLeft className="h-4 w-4 mr-1" />
            이벤트 목록
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">이벤트 캘린더</h1>
        <div className="w-[100px]"></div> {/* 균형을 위한 빈 공간 */}
      </div>
      
      <Card className="p-6 mb-6">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="icon" onClick={goToPrevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <div className="flex items-center space-x-2">
              <Select 
                value={currentYear.toString()} 
                onValueChange={handleYearChange}
              >
                <SelectTrigger className="w-[100px]">
                  <SelectValue placeholder="연도" />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map(year => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}년
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select 
                value={currentMonth.toString()} 
                onValueChange={handleMonthChange}
              >
                <SelectTrigger className="w-[80px]">
                  <SelectValue placeholder="월" />
                </SelectTrigger>
                <SelectContent>
                  {months.map((month, index) => (
                    <SelectItem key={index} value={index.toString()}>
                      {month}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <Button variant="outline" size="icon" onClick={goToNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          
          <Button 
            variant="ghost" 
            className="flex items-center"
            onClick={() => {
              setCurrentYear(today.getFullYear());
              setCurrentMonth(today.getMonth());
              setSelectedDate(today);
            }}
          >
            <CalendarIcon className="h-4 w-4 mr-2" />
            오늘
          </Button>
        </div>
        
        <div className="grid grid-cols-7 gap-2">
          {["일", "월", "화", "수", "목", "금", "토"].map(day => (
            <div key={day} className="text-center font-medium py-2 border-b">
              {day}
            </div>
          ))}
          
          {calendarCells}
        </div>
      </Card>
      
      {/* 선택한 날짜의 이벤트 목록 */}
      {selectedDate && (
        <div className="mt-6">
          <h2 className="text-xl font-semibold mb-4">
            {selectedDate.getFullYear()}년 {selectedDate.getMonth() + 1}월 {selectedDate.getDate()}일 이벤트
          </h2>
          
          {eventsOnSelectedDate.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {eventsOnSelectedDate.map(event => (
                <Card 
                  key={event.id} 
                  className="overflow-hidden hover:shadow-md transition cursor-pointer"
                  onClick={() => setLocation(`/events/${event.id}`)}
                >
                  <div className="h-40">
                    <img 
                      src={event.image} 
                      alt={event.title} 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-lg font-semibold">{event.title}</h3>
                      <Badge>{event.category}</Badge>
                    </div>
                    
                    <div className="flex items-center text-gray-500 mb-2 text-sm">
                      <Clock className="h-4 w-4 mr-2" />
                      <span>{event.time}</span>
                    </div>
                    
                    <div className="flex items-center text-gray-500 text-sm">
                      <MapPin className="h-4 w-4 mr-2" />
                      <span>{event.location.name}</span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-6 text-center">
              <p className="text-gray-500">해당 날짜에 예정된 이벤트가 없습니다.</p>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}