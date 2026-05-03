import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { 
  Sparkles, 
  BookOpen, 
  ShoppingBag, 
  PawPrint, 
  Heart, 
  Dumbbell, 
  Stethoscope, 
  Package,
  ChevronRight,
  ChevronLeft,
  X,
  Check,
  Rocket
} from 'lucide-react';

const ONBOARDING_STORAGE_KEY = 'talez_onboarding_completed';

interface OnboardingModalProps {
  isAuthenticated: boolean;
  onComplete?: () => void;
}

interface Interest {
  id: string;
  label: string;
  icon: React.ReactNode;
  selected: boolean;
}

export function OnboardingModal({ isAuthenticated, onComplete }: OnboardingModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('right');
  const [interests, setInterests] = useState<Interest[]>([
    { id: 'training', label: '행동 훈련', icon: <Dumbbell className="w-5 h-5" />, selected: false },
    { id: 'health', label: '건강 관리', icon: <Stethoscope className="w-5 h-5" />, selected: false },
    { id: 'products', label: '반려용품', icon: <Package className="w-5 h-5" />, selected: false },
    { id: 'nutrition', label: '영양 & 사료', icon: <Heart className="w-5 h-5" />, selected: false },
  ]);

  const totalSteps = 5;

  useEffect(() => {
    if (isAuthenticated) {
      const hasCompleted = localStorage.getItem(ONBOARDING_STORAGE_KEY);
      if (!hasCompleted) {
        const timer = setTimeout(() => {
          setIsOpen(true);
        }, 500);
        return () => clearTimeout(timer);
      }
    }
  }, [isAuthenticated]);

  const handleComplete = () => {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
    setIsOpen(false);
    onComplete?.();
  };

  const handleSkip = () => {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
    setIsOpen(false);
  };

  const goToNext = () => {
    if (currentStep < totalSteps - 1) {
      setSlideDirection('right');
      setCurrentStep(prev => prev + 1);
    } else {
      handleComplete();
    }
  };

  const goToPrev = () => {
    if (currentStep > 0) {
      setSlideDirection('left');
      setCurrentStep(prev => prev - 1);
    }
  };

  const toggleInterest = (id: string) => {
    setInterests(prev => 
      prev.map(interest => 
        interest.id === id 
          ? { ...interest, selected: !interest.selected }
          : interest
      )
    );
  };

  const renderStepContent = () => {
    const baseClasses = cn(
      "transition-all duration-300 ease-out",
      slideDirection === 'right' 
        ? "animate-in slide-in-from-right-5 fade-in-0" 
        : "animate-in slide-in-from-left-5 fade-in-0"
    );

    switch (currentStep) {
      case 0:
        return (
          <div className={cn(baseClasses, "text-center px-2")}>
            <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-primary/20 to-primary/5 rounded-full flex items-center justify-center">
              <PawPrint className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-2xl font-bold mb-3 text-foreground">
              TALEZ에 오신 것을 환영합니다! 🎉
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              반려동물과 함께하는 더 나은 삶을 위한<br />
              스마트 교육 플랫폼입니다.
            </p>
            <div className="mt-6 p-4 bg-primary/5 rounded-xl">
              <p className="text-sm text-muted-foreground">
                AI 기반 맞춤형 교육과 전문 훈련사 연결로<br />
                반려동물의 행복한 성장을 도와드립니다.
              </p>
            </div>
          </div>
        );

      case 1:
        return (
          <div className={cn(baseClasses, "px-2")}>
            <h2 className="text-xl font-bold mb-6 text-center text-foreground">
              TALEZ의 주요 기능
            </h2>
            <div className="space-y-4">
              <div className="flex items-start gap-4 p-4 rounded-xl bg-gradient-to-r from-blue-500/10 to-transparent border border-blue-500/20">
                <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
                  <Sparkles className="w-6 h-6 text-blue-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">AI 행동 분석</h3>
                  <p className="text-sm text-muted-foreground">반려동물의 행동을 분석하고 맞춤 조언을 제공합니다</p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-4 rounded-xl bg-gradient-to-r from-green-500/10 to-transparent border border-green-500/20">
                <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
                  <BookOpen className="w-6 h-6 text-green-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">전문 강의</h3>
                  <p className="text-sm text-muted-foreground">인증된 전문 훈련사의 교육 과정을 수강하세요</p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-4 rounded-xl bg-gradient-to-r from-orange-500/10 to-transparent border border-orange-500/20">
                <div className="w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center shrink-0">
                  <ShoppingBag className="w-6 h-6 text-orange-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">반려용품 쇼핑</h3>
                  <p className="text-sm text-muted-foreground">엄선된 반려용품을 합리적인 가격에 만나보세요</p>
                </div>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className={cn(baseClasses, "text-center px-2")}>
            <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-full flex items-center justify-center">
              <PawPrint className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-xl font-bold mb-3 text-foreground">
              반려동물을 등록해주세요
            </h2>
            <p className="text-muted-foreground mb-6">
              반려동물 프로필을 등록하면<br />
              맞춤형 콘텐츠를 추천받을 수 있어요!
            </p>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 text-left">
                <Check className="w-5 h-5 text-green-500 shrink-0" />
                <span className="text-sm text-foreground">품종별 맞춤 훈련 방법 제공</span>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 text-left">
                <Check className="w-5 h-5 text-green-500 shrink-0" />
                <span className="text-sm text-foreground">나이에 맞는 건강 관리 팁</span>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 text-left">
                <Check className="w-5 h-5 text-green-500 shrink-0" />
                <span className="text-sm text-foreground">AI 기반 행동 분석 리포트</span>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className={cn(baseClasses, "px-2")}>
            <h2 className="text-xl font-bold mb-2 text-center text-foreground">
              관심 분야를 선택해주세요
            </h2>
            <p className="text-sm text-muted-foreground text-center mb-6">
              선택하신 관심사에 맞는 콘텐츠를 추천해드려요
            </p>
            <div className="grid grid-cols-2 gap-3">
              {interests.map((interest) => (
                <button
                  key={interest.id}
                  onClick={() => toggleInterest(interest.id)}
                  className={cn(
                    "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200",
                    interest.selected
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:border-primary/50 text-muted-foreground hover:text-foreground"
                  )}
                >
                  <div className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center transition-colors",
                    interest.selected ? "bg-primary/20" : "bg-muted"
                  )}>
                    {interest.icon}
                  </div>
                  <span className="text-sm font-medium">{interest.label}</span>
                  {interest.selected && (
                    <Check className="w-4 h-4 text-primary absolute top-2 right-2" />
                  )}
                </button>
              ))}
            </div>
          </div>
        );

      case 4:
        return (
          <div className={cn(baseClasses, "text-center px-2")}>
            <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-primary to-primary/60 rounded-full flex items-center justify-center">
              <Rocket className="w-10 h-10 text-primary-foreground" />
            </div>
            <h2 className="text-2xl font-bold mb-3 text-foreground">
              준비가 완료되었습니다!
            </h2>
            <p className="text-muted-foreground mb-6">
              이제 TALEZ의 모든 기능을<br />
              자유롭게 이용해보세요.
            </p>
            <div className="p-4 bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl border border-primary/20">
              <p className="text-sm text-foreground">
                💡 <strong>팁:</strong> 하단 메뉴에서 원하는 기능에<br />
                빠르게 접근할 수 있어요!
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden">
        <div className="absolute top-3 right-3 z-10">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full"
            onClick={handleSkip}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">닫기</span>
          </Button>
        </div>

        <div className="pt-12 pb-6 px-6">
          {renderStepContent()}
        </div>

        <div className="flex items-center justify-center gap-2 py-3">
          {Array.from({ length: totalSteps }).map((_, index) => (
            <button
              key={index}
              onClick={() => {
                setSlideDirection(index > currentStep ? 'right' : 'left');
                setCurrentStep(index);
              }}
              className={cn(
                "w-2 h-2 rounded-full transition-all duration-300",
                currentStep === index
                  ? "w-6 bg-primary"
                  : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
              )}
              aria-label={`${index + 1}단계로 이동`}
            />
          ))}
        </div>

        <div className="flex items-center justify-between p-4 border-t bg-muted/30">
          <div>
            {currentStep > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={goToPrev}
                className="gap-1"
              >
                <ChevronLeft className="w-4 h-4" />
                이전
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {currentStep < totalSteps - 1 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSkip}
                className="text-muted-foreground"
              >
                건너뛰기
              </Button>
            )}
            <Button
              size="sm"
              onClick={goToNext}
              className="gap-1"
            >
              {currentStep === totalSteps - 1 ? (
                <>
                  시작하기
                  <Rocket className="w-4 h-4" />
                </>
              ) : (
                <>
                  다음
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function useOnboardingReset() {
  const resetOnboarding = () => {
    localStorage.removeItem(ONBOARDING_STORAGE_KEY);
  };
  return { resetOnboarding };
}

export default OnboardingModal;
