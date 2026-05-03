import React from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Home, ArrowLeft, Search, MapPin, BookOpen, ShoppingBag } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary to-secondary flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardContent className="p-8 text-center">
          {/* 404 아이콘 */}
          <div className="mb-8">
            <div className="text-8xl font-bold text-gray-300 mb-4">404</div>
            <div className="w-24 h-24 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Search className="w-12 h-12 text-gray-400" />
            </div>
          </div>

          {/* 메시지 */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              페이지를 찾을 수 없습니다
            </h1>
            <p className="text-gray-600 text-lg mb-4">
              요청하신 페이지가 존재하지 않거나 이동되었을 수 있습니다.
            </p>
            <p className="text-sm text-gray-500">
              URL을 다시 확인해주시거나 아래 메뉴를 통해 원하는 페이지로 이동해주세요.
            </p>
          </div>

          {/* 빠른 링크 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <Link href="/">
              <Button variant="outline" className="w-full h-16 flex items-center justify-center gap-3">
                <Home className="w-5 h-5" />
                <div className="text-left">
                  <div className="font-medium">홈으로 가기</div>
                  <div className="text-xs text-gray-500">메인 페이지로 이동</div>
                </div>
              </Button>
            </Link>

            <Link href="/institutes">
              <Button variant="outline" className="w-full h-16 flex items-center justify-center gap-3">
                <MapPin className="w-5 h-5" />
                <div className="text-left">
                  <div className="font-medium">훈련소 찾기</div>
                  <div className="text-xs text-gray-500">주변 훈련소 검색</div>
                </div>
              </Button>
            </Link>

            <Link href="/courses">
              <Button variant="outline" className="w-full h-16 flex items-center justify-center gap-3">
                <BookOpen className="w-5 h-5" />
                <div className="text-left">
                  <div className="font-medium">교육 과정</div>
                  <div className="text-xs text-gray-500">훈련 프로그램</div>
                </div>
              </Button>
            </Link>

            <Link href="/shop">
              <Button variant="outline" className="w-full h-16 flex items-center justify-center gap-3">
                <ShoppingBag className="w-5 h-5" />
                <div className="text-left">
                  <div className="font-medium">쇼핑몰</div>
                  <div className="text-xs text-gray-500">펫용품 구매</div>
                </div>
              </Button>
            </Link>
          </div>

          {/* 기본 액션 버튼 */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button 
              onClick={() => window.history.back()}
              variant="outline"
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              이전 페이지로
            </Button>
            
            <Link href="/">
              <Button className="flex items-center gap-2">
                <Home className="w-4 h-4" />
                홈으로 가기
              </Button>
            </Link>
          </div>

          {/* 추가 도움말 */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-500 mb-2">
              계속해서 문제가 발생한다면:
            </p>
            <div className="flex flex-wrap justify-center gap-4 text-xs">
              <Link href="/help/contact">
                <Button variant="link" size="sm" className="text-primary hover:text-primary/90">
                  고객센터 문의
                </Button>
              </Link>
              <Link href="/help/faq">
                <Button variant="link" size="sm" className="text-primary hover:text-primary/90">
                  자주 묻는 질문
                </Button>
              </Link>
              <Link href="/help/about">
                <Button variant="link" size="sm" className="text-primary hover:text-primary/90">
                  서비스 소개
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}