import { useAuth } from "../../SimpleApp";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { 
  Users, BookOpen, Building, UserRoundCheck, BarChart3, 
  TrendingUp, DollarSign, Calendar, MapPin 
} from "lucide-react";

interface InstituteAdminDashboardProps {
  onAction: (action: string, data?: any) => void;
}

export default function InstituteAdminDashboard({ onAction }: InstituteAdminDashboardProps) {
  const { userName } = useAuth();
  const { toast } = useToast();

  const handleClick = (action: string, data?: any) => {
    console.log(`Institute Admin action: ${action}`, data);
    onAction(action, data);
  };

  const handleEditInfo = () => {
    toast({
      title: "기관 정보 수정",
      description: "기관 정보 수정 페이지로 이동합니다.",
    });
    // 추후 페이지 이동 구현
    // window.location.href = '/institute/settings';
  };

  const handleAddTrainer = () => {
    toast({
      title: "훈련사 추가",
      description: "새 훈련사를 초대하는 기능이 곧 제공될 예정입니다.",
    });
    // 추후 구현
    // window.location.href = '/institute/trainers/invite';
  };

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8">
      {/* Banner */}
      <div className="relative rounded-xl overflow-hidden h-60 md:h-80 mb-8 bg-gradient-to-r from-primary/80 to-accent/80 shadow-lg">
        <img 
          src="https://images.unsplash.com/photo-1531761535209-180857b9f904?ixlib=rb-4.0.3&auto=format&fit=crop&w=1600&h=400"
          alt="교육 기관 관리"
          className="w-full h-full object-cover absolute mix-blend-overlay"
        />
        
        <div className="absolute inset-0 bg-gradient-to-r from-primary/80 to-accent/30 mix-blend-multiply"></div>
        
        <div className="relative h-full flex flex-col justify-center px-8 md:px-12">
          <h1 className="text-white text-2xl md:text-4xl font-bold mb-2 md:mb-4 max-w-xl">
            행복한 반려견 교육 센터
          </h1>
          <p className="text-white text-sm md:text-lg max-w-xl mb-6">
            더 많은 반려견과 견주들이 최고의 교육 서비스를 받을 수 있도록 기관을 관리하고 성장시켜 보세요.
          </p>
          <div>
            <Button
              className="bg-white text-primary font-semibold hover:bg-gray-50 mr-3"
              onClick={() => window.location.href = '/institute/courses/new'}
            >
              신규 강의 신청하기
            </Button>
            <Button
              variant="outline"
              className="border-2 border-white text-white hover:bg-white/10"
              onClick={() => window.location.href = '/institute/trainers/invite'}
            >
              훈련사 초대하기
            </Button>
          </div>
        </div>
      </div>
      
      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="p-6 border border-gray-100 dark:border-gray-700">
          <div className="flex items-center">
            <div className="flex-shrink-0 h-12 w-12 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center">
              <BookOpen className="h-6 w-6" />
            </div>
            <div className="ml-4">
              <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400">총 강의 수</h2>
              <p className="text-2xl font-semibold text-gray-800 dark:text-white">12개</p>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>지난 분기 +2</span>
              <a href="/institute/courses" className="text-primary hover:text-primary/80">관리</a>
            </div>
          </div>
        </Card>
        
        <Card className="p-6 border border-gray-100 dark:border-gray-700">
          <div className="flex items-center">
            <div className="flex-shrink-0 h-12 w-12 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center">
              <UserRoundCheck className="h-6 w-6" />
            </div>
            <div className="ml-4">
              <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400">소속 훈련사</h2>
              <p className="text-2xl font-semibold text-gray-800 dark:text-white">8명</p>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>지난 달 +1명</span>
              <a href="/institute/trainers" className="text-primary hover:text-primary/80">관리</a>
            </div>
          </div>
        </Card>
        
        <Card className="p-6 border border-gray-100 dark:border-gray-700">
          <div className="flex items-center">
            <div className="flex-shrink-0 h-12 w-12 bg-accent/20 dark:bg-accent/10 text-accent dark:text-accent/90 rounded-full flex items-center justify-center">
              <Users className="h-6 w-6" />
            </div>
            <div className="ml-4">
              <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400">총 수강생</h2>
              <p className="text-2xl font-semibold text-gray-800 dark:text-white">124명</p>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>지난 달 +18명</span>
              <a href="/institute/analytics" className="text-primary hover:text-primary/80">분석</a>
            </div>
          </div>
        </Card>
        
        <Card className="p-6 border border-gray-100 dark:border-gray-700">
          <div className="flex items-center">
            <div className="flex-shrink-0 h-12 w-12 bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary rounded-full flex items-center justify-center">
              <DollarSign className="h-6 w-6" />
            </div>
            <div className="ml-4">
              <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400">월 수익</h2>
              <p className="text-2xl font-semibold text-gray-800 dark:text-white">4,285,000원</p>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>지난 달 +12.5%</span>
              <a href="/institute/revenue" className="text-primary hover:text-primary/80">상세</a>
            </div>
          </div>
        </Card>
      </div>
      
      {/* Performance Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card className="border border-gray-100 dark:border-gray-700">
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white">월별 수강생 추이</h2>
              <Badge variant="info">최근 6개월</Badge>
            </div>
            <div className="h-64 flex items-center justify-center">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-6 w-6 text-primary" />
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  여기에 수강생 추이 차트가 표시됩니다.
                </span>
              </div>
            </div>
          </div>
        </Card>
        
        <Card className="border border-gray-100 dark:border-gray-700">
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white">강의별 수익 분포</h2>
              <Badge variant="success">이번 달</Badge>
            </div>
            <div className="h-64 flex items-center justify-center">
              <div className="flex items-center space-x-2">
                <BarChart3 className="h-6 w-6 text-primary" />
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  여기에 강의별 수익 분포 차트가 표시됩니다.
                </span>
              </div>
            </div>
          </div>
        </Card>
      </div>
      
      {/* Institute Info */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">기관 정보</h2>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleEditInfo}
            data-testid="button-edit-institute-info"
          >
            정보 수정
          </Button>
        </div>
        
        <Card className="border border-gray-100 dark:border-gray-700">
          <div className="p-6">
            <div className="flex flex-col md:flex-row gap-6">
              <div className="w-full md:w-1/3">
                <div className="aspect-video rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
                  <img
                    src="https://images.unsplash.com/photo-1587300003388-59208cc962cb?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=450"
                    alt="행복한 반려견 교육 센터"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="mt-4 flex justify-between">
                  <Badge variant="success" className="px-3 py-1">인증 완료</Badge>
                  <Badge variant="warning" className="px-3 py-1">프리미엄</Badge>
                </div>
              </div>
              
              <div className="w-full md:w-2/3">
                <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">행복한 반려견 교육 센터</h3>
                
                <div className="space-y-3">
                  <div className="flex items-start">
                    <MapPin className="w-5 h-5 text-gray-500 dark:text-gray-400 mt-0.5 mr-2" />
                    <div>
                      <p className="text-sm text-gray-700 dark:text-gray-300">서울시 강남구 테헤란로 123</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">대중교통: 2호선 강남역 3번 출구에서 도보 5분</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <Building className="w-5 h-5 text-gray-500 dark:text-gray-400 mt-0.5 mr-2" />
                    <div>
                      <p className="text-sm text-gray-700 dark:text-gray-300">시설: 실내 훈련장, 야외 훈련장, 대기실, 상담실</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">주차: 건물 내 2시간 무료</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <Calendar className="w-5 h-5 text-gray-500 dark:text-gray-400 mt-0.5 mr-2" />
                    <div>
                      <p className="text-sm text-gray-700 dark:text-gray-300">영업시간: 평일 10:00 - 20:00, 주말 10:00 - 18:00</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">정기 휴무: 매주 월요일</p>
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    2015년에 설립된 행복한 반려견 교육 센터는 체계적인 커리큘럼과 전문 훈련사들의 1:1 맞춤형 교육으로 반려견의 행동 교정과 견주의 올바른 반려견 교육 방법을 안내합니다. 다양한 실내외 시설을 갖추고 있어 날씨와 상관없이 훈련이 가능합니다.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
      
      {/* Trainers */}
      <div>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">소속 훈련사</h2>
          <a href="/institute/trainers" className="text-sm text-primary hover:text-primary/80 font-medium">모두 보기</a>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="overflow-hidden border border-gray-100 dark:border-gray-700 card-hover">
            <div className="p-6 flex flex-col items-center text-center">
              <Avatar 
                src="https://images.unsplash.com/photo-1607990281513-2c110a25bd8c?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&h=200" 
                alt="김훈련" 
                className="w-24 h-24 mb-4"
              />
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white">김훈련</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">수석 훈련사</p>
              
              <div className="flex gap-2 mb-4">
                <Badge variant="info">반려견 행동 전문가</Badge>
                <Badge variant="success">인증</Badge>
              </div>
              
              <div className="text-sm text-gray-700 dark:text-gray-300">
                <p>강의 수: 5개</p>
                <p>수강생: 58명</p>
                <p>평균 평점: 4.9/5</p>
              </div>
            </div>
          </Card>
          
          <Card className="overflow-hidden border border-gray-100 dark:border-gray-700 card-hover">
            <div className="p-6 flex flex-col items-center text-center">
              <Avatar 
                src="https://images.unsplash.com/photo-1548535537-3cfaf1fc327c?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&h=200" 
                alt="박민첩" 
                className="w-24 h-24 mb-4"
              />
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white">박민첩</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">어질리티 전문</p>
              
              <div className="flex gap-2 mb-4">
                <Badge variant="info">어질리티 대회 우승</Badge>
                <Badge variant="success">인증</Badge>
              </div>
              
              <div className="text-sm text-gray-700 dark:text-gray-300">
                <p>강의 수: 3개</p>
                <p>수강생: 22명</p>
                <p>평균 평점: 4.7/5</p>
              </div>
            </div>
          </Card>
          
          <Card className="overflow-hidden border border-gray-100 dark:border-gray-700 card-hover">
            <div className="p-6 flex flex-col items-center text-center">
              <Avatar 
                src="https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&h=200" 
                alt="이사회" 
                className="w-24 h-24 mb-4"
              />
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white">이사회</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">사회화 전문</p>
              
              <div className="flex gap-2 mb-4">
                <Badge variant="info">동물 행동학 석사</Badge>
                <Badge variant="success">인증</Badge>
              </div>
              
              <div className="text-sm text-gray-700 dark:text-gray-300">
                <p>강의 수: 2개</p>
                <p>수강생: 34명</p>
                <p>평균 평점: 4.8/5</p>
              </div>
            </div>
          </Card>
          
          <Card className="overflow-hidden border border-gray-100 dark:border-gray-700 card-hover">
            <div className="p-6 flex flex-col items-center text-center">
              <div className="w-24 h-24 mb-4 rounded-full bg-primary/20 flex items-center justify-center">
                <UserRoundCheck className="h-12 w-12 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white">새 훈련사 추가</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">훈련사를 초대하세요</p>
              
              <Button 
                onClick={handleAddTrainer}
                data-testid="button-add-trainer"
              >
                훈련사 추가
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
