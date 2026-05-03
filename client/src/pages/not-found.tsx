import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Home, Search, ArrowLeft, PawPrint, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { useState, useEffect } from "react";
import { useTheme } from "@/context/theme-context";

export default function NotFound() {
  const [location, setLocation] = useLocation();
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const { theme } = useTheme();
  const [randomTip, setRandomTip] = useState("");
  
  const dogTips = [
    "강아지가 꼬리를 흔드는 것은 행복함의 표현이에요!",
    "강아지는 평균적으로 사람의 언어를 250단어 정도 이해할 수 있어요",
    "강아지의 코 지문은 사람의 지문처럼 모두 다르답니다",
    "강아지가 사람과 눈을 맞추면 서로 사이가 더 돈독해져요",
    "길을 잃은 강아지는 항상 집으로 돌아갈 방법을 찾아요"
  ];
  
  // 잘못된 URL 분석 후 추천 경로 생성
  useEffect(() => {
    // 기본 추천 경로 목록
    const defaultSuggestions = ["/", "/courses", "/trainers", "/pets"];
    
    // 현재 경로에 따른 추천 알고리즘
    const path = location.toLowerCase();
    const customSuggestions = [];
    
    // 일부 경로 패턴 확인 및 추천
    if (path.includes("train") || path.includes("course")) {
      customSuggestions.push("/courses", "/trainers");
    } else if (path.includes("pet") || path.includes("dog") || path.includes("cat")) {
      customSuggestions.push("/pets", "/pet-care");
    } else if (path.includes("shop") || path.includes("store") || path.includes("buy")) {
      customSuggestions.push("/shop");
    }
    
    // 중복 제거 후 최종 추천 목록 설정
    const allSuggestions = [...customSuggestions, ...defaultSuggestions];
    const uniqueSuggestions = Array.from(new Set(allSuggestions));
    setSuggestions(uniqueSuggestions.slice(0, 4));
    
    // 랜덤 강아지 팁 선택
    const tipIndex = Math.floor(Math.random() * dogTips.length);
    setRandomTip(dogTips[tipIndex]);
  }, [location]);
  
  // 발자국 스타일 클래스 생성
  const pawPrintClass = `
    inline-block transform 
    ${theme === 'dark' ? 'text-warning' : 'text-warning'}
  `;
  
  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
      <Card className="w-full max-w-md shadow-lg border-0 overflow-hidden relative dark:bg-gray-800">
        {/* 발자국 장식 - 왼쪽 상단 */}
        <div className="absolute -top-2 -left-2 opacity-10">
          <PawPrint className="h-20 w-20 transform -rotate-15" />
        </div>
        
        {/* 발자국 장식 - 오른쪽 하단 */}
        <div className="absolute -bottom-4 -right-4 opacity-10">
          <PawPrint className="h-24 w-24 transform rotate-45" />
        </div>
        
        <CardContent className="pt-8 relative z-10">
          <div className="flex flex-col items-center text-center mb-6">
            <div className="relative mb-4">
              <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
                <PawPrint className="h-12 w-12 text-primary" />
              </div>
              <div className="absolute -right-2 bottom-0 bg-warning/10 dark:bg-warning/60 p-2 rounded-full animate-bounce">
                <MapPin className="h-5 w-5 text-warning dark:text-warning" />
              </div>
            </div>
            
            <h1 className="text-2xl font-bold text-primary mb-2">길을 잃으셨나요?</h1>
            <div className="text-6xl font-extrabold text-primary/10 mb-[-1.5rem]">404</div>
            <p className="text-sm text-gray-600 dark:text-gray-400 relative z-10 px-4">
              찾으시는 페이지가 존재하지 않거나, 주소가 변경되었을 수 있어요
            </p>
          </div>

          <div className="bg-warning/10 dark:bg-warning/20 rounded-lg p-4 my-5 border border-warning/30 dark:border-warning/50">
            <div className="flex items-start gap-3">
              <div className="mt-1">
                <PawPrint className={pawPrintClass} />
              </div>
              <p className="text-sm text-warning dark:text-warning italic">
                "{randomTip}"
              </p>
            </div>
          </div>

          <div className="bg-gray-100 dark:bg-gray-700/50 rounded-lg p-4 mt-6">
            <h2 className="text-base font-medium mb-3 text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <Search className="h-4 w-4" />
              이 경로로 가볼까요?
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {suggestions.map((suggestion, index) => (
                <Link 
                  key={index} 
                  href={suggestion}
                  className="text-primary hover:text-primary/90-dark dark:text-primary-light 
                    dark:hover:text-primary-lighter transition-colors p-2 rounded 
                    hover:bg-gray-200 dark:hover:bg-gray-700/50 text-sm flex items-center gap-1.5"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  {suggestion === "/" ? "홈" : 
                    suggestion.replace(/^\//, '').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </Link>
              ))}
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between pt-0 relative z-10">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => window.history.back()}
            className="text-sm"
          >
            이전 페이지로
          </Button>
          <Button 
            variant="default" 
            size="sm"
            onClick={() => setLocation("/")}
            className="text-sm flex items-center gap-1.5"
          >
            <Home className="h-4 w-4" />
            홈으로 이동
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
