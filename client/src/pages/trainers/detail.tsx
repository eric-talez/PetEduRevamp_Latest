import { useState, useEffect } from 'react';
import { useRoute } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Star, MapPin, Phone, Mail, Calendar, Award, Users, BookOpen } from 'lucide-react';
import { PublicTrainerReviews } from '@/components/PublicTrainerReviews';

interface TrainerDetailProps {
  trainerId?: string;
}

interface TrainerData {
  id: number;
  name: string;
  title?: string;
  description?: string;
  bio?: string;
  category?: string;
  experience?: string;
  rating?: number;
  reviews?: number;
  students?: number;
  totalCourses?: number;
  location?: string;
  phone?: string;
  email?: string;
  avatar?: string;
  specialties?: string[];
  certifications?: string[];
  schedule?: { day: string; time: string }[];
  courses?: { id: number; title: string; price: number; duration: string }[];
}

export default function TrainerDetail({ trainerId: propTrainerId }: TrainerDetailProps) {
  const [match, routeParams] = useRoute<{ id: string }>('/trainers/:id');
  const trainerId = propTrainerId || (match && routeParams ? routeParams.id : '') || '';
  
  const [trainer, setTrainer] = useState<TrainerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTrainerData = async () => {
      try {
        console.log(`[TrainerDetail] ID ${trainerId}로 훈련사 데이터 요청`);
        
        const response = await fetch(`/api/trainers/${trainerId}`);
        
        if (!response.ok) {
          throw new Error(`훈련사 데이터를 가져올 수 없습니다: ${response.status}`);
        }
        
        const data = await response.json();
        console.log(`[TrainerDetail] 훈련사 데이터 수신:`, data);
        
        setTrainer(data);
      } catch (err) {
        console.error('[TrainerDetail] 오류:', err);
        setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다');
      } finally {
        setLoading(false);
      }
    };

    if (trainerId) {
      fetchTrainerData();
    }
  }, [trainerId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">훈련사 정보를 불러오는 중...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !trainer) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center py-12">
            <p className="text-destructive mb-4">{error || '훈련사 정보를 찾을 수 없습니다'}</p>
            <Button onClick={() => window.history.back()}>돌아가기</Button>
          </div>
        </div>
      </div>
    );
  }

  // 기본값 및 안전한 데이터 접근을 위한 헬퍼 함수
  const getDisplayData = (trainer: TrainerData) => {
    return {
      name: trainer.name || '이름 없음',
      title: trainer.title || trainer.bio || '전문 훈련사',
      description: trainer.description || trainer.bio || '전문적인 반려동물 훈련 서비스를 제공합니다.',
      category: trainer.category || '일반',
      experience: trainer.experience || '경력 정보 없음',
      rating: trainer.rating || 4.5,
      reviews: trainer.reviews || 0,
      students: trainer.students || 0,
      totalCourses: trainer.totalCourses || 0,
      location: trainer.location || '위치 정보 없음',
      phone: trainer.phone || '연락처 정보 없음',
      email: trainer.email || '이메일 정보 없음',
      avatar: trainer.avatar || `https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=300&q=80`,
      specialties: trainer.specialties || ['기본훈련'],
      certifications: trainer.certifications || ['전문 훈련사'],
      schedule: trainer.schedule || [
        { day: "월", time: "09:00-18:00" },
        { day: "화", time: "09:00-18:00" },
        { day: "수", time: "09:00-18:00" },
        { day: "목", time: "09:00-18:00" },
        { day: "금", time: "09:00-18:00" },
        { day: "토", time: "10:00-16:00" }
      ],
      courses: trainer.courses || [
        { id: 1, title: "기본 훈련 과정", price: 150000, duration: "4주" },
        { id: 2, title: "행동 교정 과정", price: 200000, duration: "6주" }
      ]
    };
  };

  const displayData = getDisplayData(trainer);

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* 훈련사 프로필 헤더 */}
      <Card className="mb-6 overflow-hidden">
        {/* 프로필 이미지를 맨 위로 이동 */}
        <div className="w-full h-64 bg-gradient-to-br from-primary to-secondary/5 relative flex items-center justify-center">
          <Avatar className="w-48 h-48 border-4 border-white shadow-xl">
            <AvatarImage 
              src={displayData.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(displayData.name)}&backgroundColor=6366f1&textColor=ffffff`} 
              alt={displayData.name}
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(displayData.name)}&backgroundColor=6366f1&textColor=ffffff`;
              }}
            />
            <AvatarFallback className="text-4xl bg-primary text-white">{displayData.name.charAt(0)}</AvatarFallback>
          </Avatar>
        </div>
        
        <CardContent className="pt-6">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold mb-2">{displayData.name}</h1>
            <p className="text-lg text-muted-foreground mb-3">{displayData.title}</p>
            
            <div className="flex justify-center items-center gap-4 text-sm text-muted-foreground mb-4">
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 text-warning fill-current" />
                <span>{displayData.rating}</span>
                <span>({displayData.reviews}개 리뷰)</span>
              </div>
              <div className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                <span>{displayData.students}명 훈련</span>
              </div>
              <div className="flex items-center gap-1">
                <BookOpen className="w-4 h-4" />
                <span>{displayData.totalCourses}개 과정</span>
              </div>
            </div>
            
            <p className="text-center text-sm mb-6">{displayData.description}</p>
            
            <div className="flex flex-wrap justify-center gap-2 mb-6">
              <Badge variant="secondary">{displayData.category}</Badge>
              <Badge variant="outline">{displayData.experience} 경력</Badge>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button size="lg" className="flex-1 sm:flex-none">
                상담 신청
              </Button>
              <Button variant="outline" size="lg" className="flex-1 sm:flex-none">
                메시지 보내기
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 상세 정보 탭 */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">개요</TabsTrigger>
          <TabsTrigger value="courses">강의</TabsTrigger>
          <TabsTrigger value="reviews">리뷰</TabsTrigger>
          <TabsTrigger value="schedule">스케줄</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 연락처 정보 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="w-5 h-5" />
                  연락처 정보
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <span>{trainer.location}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <span>{trainer.phone}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span>{trainer.email}</span>
                </div>
              </CardContent>
            </Card>

            {/* 전문 분야 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="w-5 h-5" />
                  전문 분야
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {displayData.specialties.map((specialty, index) => (
                    <Badge key={index} variant="outline">
                      {specialty}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* 자격증 */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>자격증 및 인증</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {displayData.certifications.map((cert, index) => (
                    <div key={index} className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                      <Award className="w-5 h-5 text-primary" />
                      <span className="text-sm">{cert}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="courses" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayData.courses.map((course) => (
              <Card key={course.id}>
                <CardHeader>
                  <CardTitle className="text-lg">{course.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">기간:</span>
                      <span>{course.duration}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">가격:</span>
                      <span className="font-semibold">{course.price.toLocaleString()}원</span>
                    </div>
                  </div>
                  <Button className="w-full mt-4" variant="outline">
                    자세히 보기
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="reviews" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>수강생 리뷰</CardTitle>
            </CardHeader>
            <CardContent>
              <PublicTrainerReviews trainerId={Number(displayData.id ?? trainer?.id ?? propTrainerId)} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedule" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                운영 시간
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {displayData.schedule.map((schedule, index) => (
                  <div key={index} className="flex justify-between items-center p-3 bg-muted rounded-lg">
                    <span className="font-medium">{schedule.day}요일</span>
                    <span className="text-muted-foreground">{schedule.time}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}