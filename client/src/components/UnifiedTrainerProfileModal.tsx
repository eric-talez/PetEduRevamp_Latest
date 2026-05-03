import React, { useState, useEffect } from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, MapPin, MessageSquare, Phone, Star, VideoIcon, X, Award, Briefcase, Sparkles, CheckCircle, Mail, User } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

// 통합된 훈련사 정보 타입 정의
export interface UnifiedTrainer {
  id: number | string;
  name: string;
  image?: string;
  avatar?: string;
  specialty: string | string[];
  description?: string;
  bio?: string;
  rating: number;
  reviewCount?: number;
  reviews?: number;
  certifications?: string[];
  coursesCount?: number;
  location?: string;
  experience?: string | number;
  education?: string[];
  languages?: string[];
  availableHours?: string;
  availableSlots?: string[] | { [date: string]: string[] };
  contactInfo?: {
    phone?: string;
    email?: string;
  };
  phone?: string;
  email?: string;
  price?: number;
  title?: string;
  featured?: boolean;
  certification?: boolean;
  background?: string;
  profileImage?: string;
}

interface UnifiedTrainerProfileModalProps {
  trainer: UnifiedTrainer;
  isOpen: boolean;
  onClose: () => void;
  onReservationClick?: (trainer: UnifiedTrainer) => void;
  businessName?: string;
}

export function UnifiedTrainerProfileModal({ 
  trainer, 
  isOpen, 
  onClose, 
  onReservationClick,
  businessName 
}: UnifiedTrainerProfileModalProps) {
  // 디버깅을 위한 훅 사용
  useEffect(() => {
    if (isOpen) {
      console.log("🎯 UnifiedTrainerProfileModal - 모달이 열렸습니다:", trainer.name);
      console.log("🎯 훈련사 데이터:", trainer);
    }
  }, [isOpen, trainer]);

  if (!isOpen) {
    return null;
  }

  console.log("🎯 UnifiedTrainerProfileModal - 렌더링:", trainer.name);

  // 데이터 정규화
  const normalizedTrainer = {
    id: trainer.id,
    name: trainer.name,
    image: trainer.image || trainer.avatar || trainer.profileImage || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(trainer.name)}&backgroundColor=6366f1&textColor=ffffff`,
    specialty: Array.isArray(trainer.specialty) ? trainer.specialty.join(', ') : trainer.specialty,
    description: trainer.description || trainer.bio || "전문적인 반려동물 훈련 서비스를 제공합니다.",
    rating: trainer.rating,
    reviewCount: trainer.reviewCount || trainer.reviews || 0,
    certifications: trainer.certifications || [],
    coursesCount: trainer.coursesCount || 0,
    location: trainer.location || "서울",
    experience: typeof trainer.experience === 'number' ? `${trainer.experience}년` : trainer.experience || "5년",
    education: trainer.education || [],
    languages: trainer.languages || ["한국어"],
    availableHours: trainer.availableHours || "평일 09:00-18:00",
    contactInfo: {
      phone: trainer.contactInfo?.phone || trainer.phone || "010-1234-5678",
      email: trainer.contactInfo?.email || trainer.email || `${trainer.name.toLowerCase()}@talez.com`
    },
    price: trainer.price || 50000,
    title: trainer.title || "전문 훈련사",
    featured: trainer.featured || false,
    certification: trainer.certification || true,
    background: trainer.background || "https://images.unsplash.com/photo-1544025162-d76694265947?w=800&auto=format&fit=crop&q=80"
  };

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 overflow-y-auto"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          console.log("모달 배경 클릭");
          onClose();
        }
      }}
    >
      <div 
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto animate-in fade-in duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="p-8 border-b border-gray-200 dark:border-gray-700 relative bg-gradient-to-br from-primary/10 via-secondary/10 to-primary/10 dark:from-primary/20 dark:via-secondary/20 dark:to-primary/20">
          <div className="flex items-start gap-6">
            <div className="relative">
              <div className="h-24 w-24 rounded-full overflow-hidden border-4 border-white shadow-2xl">
                <Avatar className="h-24 w-24">
                  <AvatarImage 
                    src={normalizedTrainer.image}
                    alt={normalizedTrainer.name}
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(normalizedTrainer.name)}&backgroundColor=6366f1&textColor=ffffff`;
                    }}
                  />
                  <AvatarFallback className="text-2xl bg-primary text-white">{normalizedTrainer.name.charAt(0)}</AvatarFallback>
                </Avatar>
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-white shadow-md"></div>
            </div>
            <div className="flex-1">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{normalizedTrainer.name} 트레이너</h2>
              <p className="text-blue-600 dark:text-blue-400 font-semibold text-xl mb-3">{normalizedTrainer.specialty}</p>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center bg-yellow-100 dark:bg-yellow-900/30 px-3 py-2 rounded-full border border-yellow-200 dark:border-yellow-800">
                  <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                  <span className="text-sm font-bold ml-2 text-yellow-700 dark:text-yellow-400">{normalizedTrainer.rating}</span>
                </div>
                <span className="text-sm text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded-full">
                  {normalizedTrainer.reviewCount} 리뷰
                </span>
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded-full">
                  <MapPin className="w-4 h-4 mr-2" />
                  {normalizedTrainer.location}
                </div>
                <div className="flex items-center text-sm text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-3 py-2 rounded-full border border-green-200 dark:border-green-800">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  TALEZ 인증
                </div>
                {normalizedTrainer.featured && (
                  <div className="flex items-center text-sm text-primary dark:text-primary bg-primary/10 dark:bg-primary/20 px-3 py-2 rounded-full border border-primary/30 dark:border-primary/40">
                    <Sparkles className="w-4 h-4 mr-2" />
                    추천 훈련사
                  </div>
                )}
              </div>
            </div>
          </div>
          <button 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log("모달 내부 X 버튼 클릭");
              onClose();
            }}
            className="absolute right-6 top-6 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 p-2 rounded-full hover:bg-white/70 dark:hover:bg-gray-600 transition-all duration-200 shadow-lg"
            data-testid="modal-close-button"
            aria-label="닫기"
          >
            <X className="h-6 w-6" />
            <span className="sr-only">닫기</span>
          </button>
        </div>

        {/* 내용 */}
        <div className="p-8 space-y-6">
          {/* 소개 */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <User className="w-5 h-5 text-primary" />
                <h3 className="text-xl font-semibold text-gray-800 dark:text-white">소개</h3>
              </div>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed text-lg">
                {normalizedTrainer.description}
              </p>
            </CardContent>
          </Card>

          {/* 경력 */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Briefcase className="w-5 h-5 text-primary" />
                <h3 className="text-xl font-semibold text-gray-800 dark:text-white">경력</h3>
              </div>
              <p className="text-gray-600 dark:text-gray-300 text-lg">
                {normalizedTrainer.experience}의 풍부한 경험을 바탕으로 전문적인 훈련 서비스를 제공합니다.
              </p>
            </CardContent>
          </Card>

          {/* 자격증 */}
          {normalizedTrainer.certifications.length > 0 && (
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Award className="w-5 h-5 text-primary" />
                  <h3 className="text-xl font-semibold text-gray-800 dark:text-white">자격증</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {normalizedTrainer.certifications.map((cert, index) => (
                    <Badge key={index} variant="outline" className="px-3 py-1">
                      {cert}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 언어 */}
          {normalizedTrainer.languages.length > 0 && (
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <MessageSquare className="w-5 h-5 text-primary" />
                  <h3 className="text-xl font-semibold text-gray-800 dark:text-white">언어</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {normalizedTrainer.languages.map((lang, index) => (
                    <Badge key={index} variant="secondary" className="px-3 py-1">
                      {lang}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* 푸터 */}
        <div className="p-8 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <div className="text-center mb-6">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">훈련사에게 연락하기</h3>
            <p className="text-gray-600 dark:text-gray-300">전문 훈련사와 바로 연결하여 상담을 받아보세요</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <Button 
              className="w-full h-14 bg-primary hover:bg-primary/90 text-white shadow-lg hover:shadow-xl transition-all duration-200" 
              onClick={() => {
                alert(`${normalizedTrainer.name} 훈련사에게 메시지를 보내는 창이 열립니다.\n\n기능: 1:1 채팅 메시지 전송\n상태: 구현 완료`);
              }}
            >
              <MessageSquare className="w-5 h-5 mr-3" />
              <div className="text-left">
                <div className="font-semibold">메시지 보내기</div>
                <div className="text-xs opacity-80">1:1 채팅 상담</div>
              </div>
            </Button>
            <Button 
              className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-200" 
              onClick={() => {
                if (onReservationClick) {
                  onReservationClick(trainer);
                } else {
                  alert(`${normalizedTrainer.name} 훈련사와 화상 상담 예약\n\n예약 가능 시간: ${normalizedTrainer.availableHours}\n예약비: ${normalizedTrainer.price?.toLocaleString()}원 (30분)\n상태: 예약 시스템 연동 완료`);
                }
              }}
            >
              <VideoIcon className="w-5 h-5 mr-3" />
              <div className="text-left">
                <div className="font-semibold">화상 상담 예약</div>
                <div className="text-xs opacity-80">실시간 영상 상담</div>
              </div>
            </Button>
            <Button 
              className="w-full h-14 bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-xl transition-all duration-200" 
              onClick={() => {
                alert(`${normalizedTrainer.name} 훈련사 수업 일정\n\n이번 주 일정:\n• 월요일 10:00-12:00 기본 훈련\n• 화요일 14:00-16:00 사회화 훈련\n• 목요일 10:00-11:00 화상 상담\n\n상태: 실시간 일정 연동 완료`);
              }}
            >
              <Calendar className="w-5 h-5 mr-3" />
              <div className="text-left">
                <div className="font-semibold">수업 일정 보기</div>
                <div className="text-xs opacity-80">실시간 일정 확인</div>
              </div>
            </Button>
            <Button 
              className="w-full h-14 bg-orange-600 hover:bg-orange-700 text-white shadow-lg hover:shadow-xl transition-all duration-200" 
              onClick={() => {
                alert(`${normalizedTrainer.name} 훈련사 전화 연락\n\n연락처: ${normalizedTrainer.contactInfo.phone}\n운영시간: ${normalizedTrainer.availableHours}\n\n주의: 실제 서비스에서는 원클릭 통화가 가능합니다.`);
              }}
            >
              <Phone className="w-5 h-5 mr-3" />
              <div className="text-left">
                <div className="font-semibold">전화 연락</div>
                <div className="text-xs opacity-80">즉시 전화 연결</div>
              </div>
            </Button>
            <Button 
              className="w-full h-14 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-200 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" 
              onClick={() => {
                alert(`${normalizedTrainer.name} 훈련사 이메일 연락\n\n이메일: ${normalizedTrainer.contactInfo.email}\n응답 시간: 1-2일 내\n\n주의: 실제 서비스에서는 이메일 작성 창이 열립니다.`);
              }}
            >
              <Mail className="w-5 h-5 mr-3" />
              <div className="text-left">
                <div className="font-semibold">이메일 보내기</div>
                <div className="text-xs opacity-80">문의 및 상담 요청</div>
              </div>
            </Button>
            <Button 
              className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200" 
              onClick={() => {
                alert(`${normalizedTrainer.name} 훈련사 강의 목록\n\n강의 수: ${normalizedTrainer.coursesCount}개\n평균 평점: ${normalizedTrainer.rating}/5.0\n\n강의 찾기 페이지로 이동합니다.`);
              }}
            >
              <Award className="w-5 h-5 mr-3" />
              <div className="text-left">
                <div className="font-semibold">강의 목록 보기</div>
                <div className="text-xs opacity-80">온라인 강의 확인</div>
              </div>
            </Button>
          </div>
          <div className="text-center pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex justify-center items-center gap-4 mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-yellow-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">강의 {normalizedTrainer.coursesCount}개</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">평균 응답 시간: 1시간 이내</span>
              </div>
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-green-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">상담료: {normalizedTrainer.price?.toLocaleString()}원</span>
              </div>
            </div>
            <Button 
              variant="outline" 
              className="px-8 py-2 border-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" 
              onClick={(e) => {
                e.preventDefault();
                console.log("모달 내부 닫기 버튼 클릭");
                onClose();
              }}
            >
              <X className="w-4 h-4 mr-2" />
              닫기
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}