import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

// 주간 날씨 데이터 타입 정의
type WeatherData = {
  day: string;
  date: string;
  temp: {
    min: number;
    max: number;
  };
  condition: string;
  humidity: number;
  wind: number;
  icon: string;
};

interface WeeklyWeatherModalProps {
  isOpen: boolean;
  onClose: () => void;
  location?: {
    name: string;
    region: string;
  };
}

export function WeeklyWeatherModal({ isOpen, onClose, location = { name: "서울", region: "강남구" } }: WeeklyWeatherModalProps) {
  // 임시 주간 날씨 데이터
  const weeklyWeather: WeatherData[] = [
    {
      day: "오늘",
      date: "11월 15일",
      temp: { min: 18, max: 24 },
      condition: "맑음",
      humidity: 40,
      wind: 3.2,
      icon: "☀️"
    },
    {
      day: "내일",
      date: "11월 16일",
      temp: { min: 16, max: 22 },
      condition: "구름조금",
      humidity: 45,
      wind: 4.1,
      icon: "🌤️"
    },
    {
      day: "수",
      date: "11월 17일",
      temp: { min: 15, max: 21 },
      condition: "흐림",
      humidity: 60,
      wind: 3.5,
      icon: "☁️"
    },
    {
      day: "목",
      date: "11월 18일",
      temp: { min: 14, max: 20 },
      condition: "비",
      humidity: 75,
      wind: 5.2,
      icon: "🌧️"
    },
    {
      day: "금",
      date: "11월 19일",
      temp: { min: 12, max: 18 },
      condition: "구름많음",
      humidity: 65,
      wind: 4.8,
      icon: "🌥️"
    },
    {
      day: "토",
      date: "11월 20일",
      temp: { min: 13, max: 19 },
      condition: "맑음",
      humidity: 50,
      wind: 3.0,
      icon: "☀️"
    },
    {
      day: "일",
      date: "11월 21일",
      temp: { min: 14, max: 20 },
      condition: "맑음",
      humidity: 45,
      wind: 2.8,
      icon: "☀️"
    }
  ];

  // 날씨 상태에 따른 배경색 반환 함수
  const getWeatherBgColor = (condition: string) => {
    switch (condition) {
      case "맑음":
        return "bg-blue-50 dark:bg-blue-900/20";
      case "구름조금":
      case "구름많음":
        return "bg-gray-50 dark:bg-gray-800/50";
      case "비":
        return "bg-indigo-50 dark:bg-indigo-900/20";
      case "눈":
        return "bg-primary/5 dark:bg-primary/15";
      default:
        return "bg-gray-50 dark:bg-gray-800/50";
    }
  };

  // 날씨 상태에 따른 텍스트 색상 반환 함수
  const getWeatherTextColor = (condition: string) => {
    switch (condition) {
      case "맑음":
        return "text-blue-500 dark:text-blue-300";
      case "구름조금":
      case "구름많음":
        return "text-gray-500 dark:text-gray-300";
      case "비":
        return "text-indigo-500 dark:text-indigo-300";
      case "눈":
        return "text-primary dark:text-primary/80";
      default:
        return "text-gray-500 dark:text-gray-300";
    }
  };

  // 오늘의 반려견 산책 적합도 계산 함수 (간단한 알고리즘)
  const getPetWalkScore = (temp: { min: number; max: number }, humidity: number, wind: number, condition: string) => {
    // 최적 조건: 15-25도, 습도 40-60%, 풍속 5m/s 이하, 맑음/구름조금
    let score = 100;
    
    // 온도 점수 (최대 40점)
    const avgTemp = (temp.min + temp.max) / 2;
    if (avgTemp < 5 || avgTemp > 30) score -= 40;
    else if (avgTemp < 10 || avgTemp > 25) score -= 20;
    else if (avgTemp < 15 || avgTemp > 22) score -= 10;
    
    // 습도 점수 (최대 20점)
    if (humidity > 80 || humidity < 30) score -= 20;
    else if (humidity > 70 || humidity < 35) score -= 10;
    
    // 풍속 점수 (최대 20점)
    if (wind > 10) score -= 20;
    else if (wind > 7) score -= 15;
    else if (wind > 5) score -= 10;
    
    // 날씨 상태 점수 (최대 20점)
    if (condition === "비" || condition === "눈") score -= 20;
    else if (condition === "구름많음") score -= 5;
    
    // 점수 범위 제한
    return Math.max(0, Math.min(100, score));
  };
  
  // 점수에 따른 산책 적합도 텍스트 반환
  const getWalkScoreText = (score: number) => {
    if (score >= 80) return "매우 좋음";
    if (score >= 60) return "좋음";
    if (score >= 40) return "보통";
    if (score >= 20) return "좋지 않음";
    return "매우 좋지 않음";
  };
  
  // 점수에 따른 색상 반환
  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-500 dark:text-green-400";
    if (score >= 60) return "text-primary dark:text-primary";
    if (score >= 40) return "text-amber-500 dark:text-amber-400";
    if (score >= 20) return "text-orange-500 dark:text-orange-400";
    return "text-red-500 dark:text-red-400";
  };

  const todayScore = getPetWalkScore(
    weeklyWeather[0].temp,
    weeklyWeather[0].humidity,
    weeklyWeather[0].wind,
    weeklyWeather[0].condition
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open: boolean) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2">
          <div>
            <DialogTitle className="text-xl">주간 날씨 정보</DialogTitle>
            <DialogDescription className="text-sm mt-1">
              {location.name} {location.region} 지역의 7일간 날씨 정보입니다
            </DialogDescription>
          </div>
        </DialogHeader>
        
        {/* 오늘 날씨 요약 */}
        <div className={`px-6 py-4 border-b border-gray-100 dark:border-gray-800 ${getWeatherBgColor(weeklyWeather[0].condition)}`}>
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <div className="text-4xl mr-4">{weeklyWeather[0].icon}</div>
              <div>
                <h3 className="font-bold text-lg">{weeklyWeather[0].day} ({weeklyWeather[0].date})</h3>
                <p className={`font-medium ${getWeatherTextColor(weeklyWeather[0].condition)}`}>
                  {weeklyWeather[0].condition}, {weeklyWeather[0].temp.min}°C ~ {weeklyWeather[0].temp.max}°C
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  습도 {weeklyWeather[0].humidity}%, 풍속 {weeklyWeather[0].wind}m/s
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium mb-1">반려견 산책 적합도</p>
              <div className={`text-lg font-bold ${getScoreColor(todayScore)}`}>
                {getWalkScoreText(todayScore)}
              </div>
              <div className="w-16 h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mt-1">
                <div
                  className={`h-full ${todayScore >= 80 ? 'bg-green-500' : 
                    todayScore >= 60 ? 'bg-primary/50' : 
                    todayScore >= 40 ? 'bg-amber-500' : 
                    todayScore >= 20 ? 'bg-orange-500' : 'bg-red-500'}`}
                  style={{ width: `${todayScore}%` }}
                />
              </div>
            </div>
          </div>
        </div>
        
        {/* 주간 날씨 목록 */}
        <div className="p-6">
          <div className="grid grid-cols-7 gap-2">
            {weeklyWeather.map((day, index) => {
              const walkScore = getPetWalkScore(day.temp, day.humidity, day.wind, day.condition);
              return (
                <div 
                  key={index} 
                  className={`p-3 rounded-lg text-center ${
                    index === 0 ? 'border-2 border-primary/60' : 'border border-gray-100 dark:border-gray-800'
                  } ${getWeatherBgColor(day.condition)}`}
                >
                  <p className="font-medium mb-1">{day.day}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{day.date}</p>
                  <div className="text-2xl mb-2">{day.icon}</div>
                  <p className={`text-sm font-medium ${getWeatherTextColor(day.condition)}`}>{day.condition}</p>
                  <p className="text-xs my-1">
                    {day.temp.min}°C ~ {day.temp.max}°C
                  </p>
                  <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                    <p className="text-xs text-gray-500 dark:text-gray-400">산책 적합도</p>
                    <div className={`text-sm font-medium ${getScoreColor(walkScore)}`}>
                      {getWalkScoreText(walkScore)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        
        {/* 날씨 정보 자료 출처 - 설명 */}
        <div className="px-6 py-3 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-500 dark:text-gray-400">
          * 이 날씨 정보는 반려견 산책에 적합한 환경을 판단하는 참고자료로만 활용해주세요.
        </div>
      </DialogContent>
    </Dialog>
  );
}