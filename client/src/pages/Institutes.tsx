import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Users, GraduationCap, Star } from 'lucide-react';

export default function Institutes() {
  // Mock institutions data
  const institutes = [
    {
      id: 1,
      name: "퍼펙트 펫 아카데미",
      image: "/attached_assets/KakaoTalk_Photo_2025-07-05-22-37-00 001_1751722697059.png",
      description: "최고의 반려견 교육 전문 기관. 다양한 교육 프로그램과 전문 훈련사가 여러분의 반려견을 기다립니다.",
      location: "서울 강남구",
      trainerCount: 12,
      courseCount: 24,
      rating: 4.8,
      reviewCount: 156,
      features: ["실내 훈련장", "야외 훈련장", "수영장", "그루밍 서비스"],
      specialties: ["기초 훈련", "어질리티", "행동 교정"]
    },
    {
      id: 2,
      name: "해피 도그 스쿨",
      image: "/attached_assets/KakaoTalk_Photo_2025-07-05-22-37-00 002_1751722697071.png",
      description: "즐거운 훈련으로 반려견과 견주의 행복한 동행을 지원합니다. 30년 전통의 신뢰할 수 있는 교육 기관입니다.",
      location: "서울 마포구",
      trainerCount: 8,
      courseCount: 15,
      rating: 4.7,
      reviewCount: 124,
      features: ["넓은 실내 공간", "견주 교육 프로그램", "그룹 클래스"],
      specialties: ["사회화 훈련", "문제행동 교정", "펫 스포츠"]
    },
    {
      id: 3,
      name: "캐닌 에듀케이션 센터",
      image: "/attached_assets/KakaoTalk_Photo_2025-07-05-22-37-00 003_1751722697072.png",
      description: "과학적 접근을 기반으로 한 반려견 교육 센터. 행동 분석을 통한 맞춤형 트레이닝 프로그램을 제공합니다.",
      location: "서울 송파구",
      trainerCount: 10,
      courseCount: 18,
      rating: 4.9,
      reviewCount: 98,
      features: ["행동분석 서비스", "온라인 강의 병행", "1:1 맞춤 트레이닝"],
      specialties: ["행동 분석", "특수견 훈련", "노즈워크"]
    },
    {
      id: 4,
      name: "펫 라이프 스쿨",
      image: "/attached_assets/image_1746582251297.png",
      description: "반려견의 전 생애주기를 고려한 교육 프로그램. 강아지부터 노령견까지 모든 연령대 맞춤 교육이 가능합니다.",
      location: "경기 분당구",
      trainerCount: 6,
      courseCount: 12,
      rating: 4.6,
      reviewCount: 86,
      features: ["퍼피 클래스", "노령견 프로그램", "반려견 유치원"],
      specialties: ["유아견 교육", "노령견 케어", "기초 훈련"]
    }
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">교육 기관</h1>
      
      <div className="mb-6">
        <p className="text-gray-600 dark:text-gray-400">
          전문적인 시설과 프로그램을 갖춘 반려견 교육 기관을 찾아보세요.
        </p>
      </div>
      
      <div className="grid grid-cols-1 gap-8">
        {institutes.map((institute) => (
          <Card key={institute.id} className="overflow-hidden border border-gray-100 dark:border-gray-700 card-hover">
            <div className="grid grid-cols-1 lg:grid-cols-3">
              <div className="h-64 lg:h-auto">
                <img
                  src={institute.image}
                  alt={institute.name}
                  className="w-full h-full object-cover"
                />
              </div>
              
              <div className="col-span-2">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-xl font-semibold">{institute.name}</h3>
                      <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mt-1">
                        <MapPin className="w-4 h-4 mr-1" />
                        <span>{institute.location}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center">
                      <div className="flex items-center mr-1">
                        <Star className="w-4 h-4 text-warning fill-warning" />
                        <span className="text-sm font-medium ml-1">{institute.rating}</span>
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400">({institute.reviewCount} 리뷰)</span>
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-3">
                    {institute.description}
                  </p>
                  
                  <div className="mt-4 flex flex-wrap gap-2">
                    {institute.specialties.map((specialty, idx) => (
                      <Badge key={idx} variant="accent" size="sm">{specialty}</Badge>
                    ))}
                  </div>
                  
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="flex items-center text-sm">
                      <Users className="w-4 h-4 mr-2 text-primary" />
                      <span>훈련사 {institute.trainerCount}명</span>
                    </div>
                    <div className="flex items-center text-sm">
                      <GraduationCap className="w-4 h-4 mr-2 text-primary" />
                      <span>강의 {institute.courseCount}개</span>
                    </div>
                  </div>
                  
                  <div className="mt-5 flex flex-wrap gap-2">
                    {institute.features.map((feature, idx) => (
                      <Badge key={idx} variant="outline" size="sm">{feature}</Badge>
                    ))}
                  </div>
                  
                  <div className="mt-5">
                    <Button>기관 자세히 보기</Button>
                  </div>
                </CardContent>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
