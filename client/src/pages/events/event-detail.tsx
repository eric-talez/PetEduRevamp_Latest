import { useState } from 'react';
import { useParams, Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { 
  Calendar, 
  MapPin, 
  Clock, 
  Users, 
  CreditCard, 
  Share, 
  ChevronRight,
  ArrowLeft,
  Check,
  AlertCircle
} from 'lucide-react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/SimpleApp';
import { useToast } from '@/hooks/use-toast';
import { NaverMapView } from '@/components/NaverMapView';

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
    description?: string;
  };
  category: string;
  price: number | '무료';
  attendees: number;
  maxAttendees?: number;
  details?: string;
  requirements?: string[];
  faq?: Array<{
    question: string;
    answer: string;
  }>;
}


// 로그인 유도 함수
function promptLogin() {
  const confirmed = window.confirm("이 기능을 사용하려면 로그인이 필요합니다. 로그인 페이지로 이동하시겠습니까?");
  if (confirmed) {
    window.location.href = "/auth";
  }
}

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [isRegistering, setIsRegistering] = useState(false);
  const { toast } = useToast();
  
  const { data: event, isLoading, error } = useQuery<EventItem>({
    queryKey: ['/api/events', id],
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
  
  const auth = useAuth();
  
  const handleRegister = () => {
    if (!auth || !auth.isAuthenticated) {
      promptLogin();
      return;
    }
    
    setIsRegistering(true);
    
    // 실제 구현에서는 API 호출
    setTimeout(() => {
      setIsRegistering(false);
      toast({
        title: "등록 완료",
        description: "이벤트 참가 신청이 완료되었습니다.",
      });
    }, 1000);
  };
  
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
  };
  
  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast({
      title: "링크 복사됨",
      description: "이벤트 링크가 클립보드에 복사되었습니다.",
    });
  };
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (error || (!isLoading && !event)) {
    return (
      <div className="container mx-auto px-4 py-10">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">이벤트를 찾을 수 없습니다</h1>
          <p className="text-gray-500 mb-6">요청하신 이벤트가 존재하지 않거나 삭제되었습니다.</p>
          <Link href="/events">
            <Button>
              <ArrowLeft className="mr-2 h-4 w-4" />
              모든 이벤트 보기
            </Button>
          </Link>
        </div>
      </div>
    );
  }
  
  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-6">
      {/* 배너 영역 */}
      {event.image && (
        <div className="w-full mb-8 rounded-lg overflow-hidden relative">
          <div className="relative h-64 md:h-80">
            <img 
              src={event.image}
              alt={event.title} 
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-primary/80 to-transparent flex items-center">
              <div className="px-6 md:px-10 text-white max-w-xl">
                <Badge className="mb-4 bg-white text-primary">{event.category}</Badge>
                <h1 className="text-3xl md:text-4xl font-bold mb-4">{event.title}</h1>
                <p className="text-lg mb-6">
                  {formatDate(event.date)} · {event.time}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* 뒤로가기 */}
      <div className="mb-4">
        <Link href="/events">
          <Button variant="ghost" className="px-2">
            <ArrowLeft className="mr-2 h-4 w-4" />
            이벤트 목록으로
          </Button>
        </Link>
      </div>
      
      <div className="flex flex-col lg:flex-row gap-8">
        {/* 메인 콘텐츠 */}
        <div className="w-full lg:w-2/3">
          {/* 이미지 */}
          <div className="w-full rounded-lg overflow-hidden mb-6">
            <img 
              src={event.image} 
              alt={event.title} 
              className="w-full max-h-[400px] object-cover"
            />
          </div>
          
          {/* 제목 및 기본 정보 */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold mb-4">{event.title}</h1>
            <div className="flex flex-wrap gap-4 mb-4">
              <Badge className="bg-primary text-white">{event.category}</Badge>
              <Badge variant={event.price === '무료' ? "outline" : "secondary"}>
                {event.price === '무료' ? '무료' : `${event.price.toLocaleString()}원`}
              </Badge>
            </div>
            <p className="text-gray-600 dark:text-gray-300">{event.description}</p>
          </div>
          
          {/* 주최자 정보 */}
          <Card className="mb-6 p-4">
            <div className="flex items-center mb-3">
              <Avatar className="w-12 h-12 mr-4">
                <img 
                  src={event.organizer.avatar} 
                  alt={event.organizer.name} 
                  className="h-full w-full object-cover"
                />
              </Avatar>
              <div>
                <h3 className="font-medium">주최자: {event.organizer.name}</h3>
                {event.organizer.description && (
                  <p className="text-sm text-gray-500">{event.organizer.description}</p>
                )}
              </div>
            </div>
          </Card>
          
          {/* 상세 설명 */}
          {event.details && (
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-3">이벤트 상세</h2>
              <Card className="p-4">
                <div className="whitespace-pre-line">
                  {event.details}
                </div>
              </Card>
            </div>
          )}
          
          {/* 참가 요구사항 */}
          {event.requirements && event.requirements.length > 0 && (
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-3">참가 요구사항</h2>
              <Card className="p-4">
                <ul className="space-y-2">
                  {event.requirements.map((req, index) => (
                    <li key={index} className="flex items-start">
                      <Check className="h-5 w-5 text-success mr-2 flex-shrink-0 mt-0.5" />
                      <span>{req}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          )}
          
          {/* FAQ */}
          {event.faq && event.faq.length > 0 && (
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-3">자주 묻는 질문</h2>
              <Card className="divide-y">
                {event.faq.map((item, index) => (
                  <div key={index} className="p-4">
                    <h3 className="font-medium mb-2">Q: {item.question}</h3>
                    <p className="text-gray-600 dark:text-gray-300 pl-4">A: {item.answer}</p>
                  </div>
                ))}
              </Card>
            </div>
          )}
          
          {/* 위치 정보 */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-3">이벤트 위치</h2>
            <Card className="p-4">
              <div className="flex items-center mb-4">
                <MapPin className="h-5 w-5 text-gray-500 mr-2" />
                <div>
                  <div className="font-medium">{event.location.name}</div>
                  <div className="text-sm text-gray-500">{event.location.address}</div>
                </div>
              </div>
              <div className="h-[300px] rounded-lg overflow-hidden">
                <NaverMapView
                  locations={[{
                    id: event.location.id,
                    name: event.location.name,
                    address: event.location.address,
                    coordinates: {
                      lat: event.location.lat,
                      lng: event.location.lng
                    }
                  }]}
                  center={{
                    lat: event.location.lat,
                    lng: event.location.lng
                  }}
                  height="300px"
                  zoom={15}
                />
              </div>
            </Card>
          </div>
        </div>
        
        {/* 사이드바 - 이벤트 정보 요약 및 신청 */}
        <div className="w-full lg:w-1/3">
          <div className="sticky top-6">
            <Card className="p-5 mb-6">
              <h2 className="text-xl font-semibold mb-4">이벤트 정보</h2>
              
              <div className="space-y-4">
                <div className="flex items-start">
                  <Calendar className="h-5 w-5 text-gray-500 mr-3 mt-0.5" />
                  <div>
                    <h3 className="font-medium">날짜</h3>
                    <p className="text-gray-600 dark:text-gray-300">{formatDate(event.date)}</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <Clock className="h-5 w-5 text-gray-500 mr-3 mt-0.5" />
                  <div>
                    <h3 className="font-medium">시간</h3>
                    <p className="text-gray-600 dark:text-gray-300">{event.time}</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <MapPin className="h-5 w-5 text-gray-500 mr-3 mt-0.5" />
                  <div>
                    <h3 className="font-medium">장소</h3>
                    <p className="text-gray-600 dark:text-gray-300">{event.location.name}</p>
                    <p className="text-sm text-gray-500">{event.location.address}</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <Users className="h-5 w-5 text-gray-500 mr-3 mt-0.5" />
                  <div>
                    <h3 className="font-medium">참가자</h3>
                    <p className="text-gray-600 dark:text-gray-300">
                      {event.attendees}명 
                      {event.maxAttendees ? ` / ${event.maxAttendees}명` : ''}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <CreditCard className="h-5 w-5 text-gray-500 mr-3 mt-0.5" />
                  <div>
                    <h3 className="font-medium">참가비</h3>
                    <p className="text-gray-600 dark:text-gray-300">
                      {event.price === '무료' ? '무료' : `${event.price.toLocaleString()}원`}
                    </p>
                  </div>
                </div>
              </div>
              
              <Separator className="my-5" />
              
              {event.maxAttendees && event.attendees >= event.maxAttendees ? (
                <div className="mb-4 bg-warning/10 dark:bg-warning/20 border border-warning/30 dark:border-warning/50 rounded-md p-3">
                  <p className="text-sm text-warning dark:text-warning flex items-center">
                    <AlertCircle className="h-4 w-4 mr-2" />
                    모집이 마감되었습니다
                  </p>
                </div>
              ) : (
                <Button 
                  className="w-full mb-4" 
                  size="lg"
                  disabled={isRegistering}
                  onClick={handleRegister}
                >
                  {isRegistering ? "처리 중..." : "이벤트 신청하기"}
                </Button>
              )}
              
              <Button 
                variant="outline" 
                className="w-full" 
                onClick={handleShare}
              >
                <Share className="h-4 w-4 mr-2" />
                이벤트 공유하기
              </Button>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}