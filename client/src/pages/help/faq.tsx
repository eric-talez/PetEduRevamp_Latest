import React from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';

export default function FAQPage() {
  const bannerStyle = {
    backgroundImage: 'linear-gradient(to right, rgba(59, 130, 246, 0.8), rgba(37, 99, 235, 0.8))',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  };

  const faqCategories = [
    { id: 'general', name: '일반' },
    { id: 'account', name: '계정' },
    { id: 'course', name: '강의' },
    { id: 'payment', name: '결제' },
    { id: 'trainer', name: '훈련사' },
    { id: 'technical', name: '기술 지원' },
  ];

  const faqs = [
    {
      category: 'general',
      question: 'Talez란 무엇인가요?',
      answer: 'Talez는 반려동물 교육을 위한 종합 플랫폼입니다. 전문 훈련사의 강의, 1:1 화상 상담, 오프라인 교육 예약, 커뮤니티 활동 등 다양한 기능을 제공합니다.'
    },
    {
      category: 'general',
      question: '어떤 반려동물을 위한 서비스인가요?',
      answer: '현재는 반려견을 중심으로 서비스를 제공하고 있으며, 추후 반려묘 등 다른 반려동물로 확장할 예정입니다.'
    },
    {
      category: 'account',
      question: '회원가입은 어떻게 하나요?',
      answer: '홈페이지 우측 상단의 "로그인" 버튼을 클릭한 후 "회원가입" 옵션을 선택하시면 됩니다. 이메일 인증 후 기본 정보를 입력하면 가입이 완료됩니다.'
    },
    {
      category: 'account',
      question: '아이디/비밀번호를 잊어버렸어요.',
      answer: '로그인 페이지에서 "아이디/비밀번호 찾기" 옵션을 이용해 주세요. 가입 시 등록한 이메일로 인증 후 정보를 찾을 수 있습니다.'
    },
    {
      category: 'course',
      question: '강의는 어떻게 수강하나요?',
      answer: '강의 페이지에서 원하는 강의를 선택하고 결제 후 바로 수강이 가능합니다. 구매한 강의는 "내 강의실"에서 언제든지 다시 볼 수 있습니다.'
    },
    {
      category: 'course',
      question: '수강 기간에 제한이 있나요?',
      answer: '대부분의 강의는 구매 후 평생 수강이 가능합니다. 단, 일부 시즌제 강의나 특별 프로그램은 기간 제한이 있을 수 있으니 강의 상세 페이지에서 확인해 주세요.'
    },
    {
      category: 'payment',
      question: '결제 방법은 어떤 것이 있나요?',
      answer: '신용카드, 체크카드, 계좌이체, 무통장입금, 카카오페이, 네이버페이 등 다양한 결제 방법을 지원합니다.'
    },
    {
      category: 'payment',
      question: '환불 정책은 어떻게 되나요?',
      answer: '강의 구매 후 7일 이내, 수강 진도율 25% 미만인 경우 전액 환불이 가능합니다. 그 이후에는 정해진 환불 규정에 따라 부분 환불이 이루어집니다.'
    },
    {
      category: 'trainer',
      question: '훈련사는 어떤 검증 과정을 거치나요?',
      answer: '모든 훈련사는 전문 자격증, 경력 증명, 인터뷰 등 엄격한 검증 과정을 통과한 분들입니다. 훈련사의 프로필에서 자격증과 경력을 확인할 수 있습니다.'
    },
    {
      category: 'trainer',
      question: '훈련사와 1:1 상담은 어떻게 진행되나요?',
      answer: '훈련사 프로필에서 "상담 예약" 버튼을 클릭하여 원하는 날짜와 시간을 선택할 수 있습니다. 화상 상담은 예약 시간에 맞춰 플랫폼 내 화상회의실에서 진행됩니다.'
    },
    {
      category: 'technical',
      question: '영상이 재생되지 않아요.',
      answer: '먼저 인터넷 연결을 확인해 주세요. 그래도 문제가 지속된다면 다른 브라우저(크롬, 사파리 등)로 시도하거나, 브라우저 캐시를 삭제 후 재접속해 보세요.'
    },
    {
      category: 'technical',
      question: '앱은 없나요?',
      answer: '현재 모바일 앱은 개발 중에 있으며, 웹사이트는 모바일 환경에 최적화되어 있어 모바일 브라우저에서도 편리하게 이용하실 수 있습니다.'
    }
  ];

  const [activeCategory, setActiveCategory] = React.useState('general');
  const [searchQuery, setSearchQuery] = React.useState('');

  const filteredFaqs = faqs.filter(faq => {
    const matchesCategory = activeCategory === 'all' || faq.category === activeCategory;
    const matchesSearch = !searchQuery || 
                          faq.question.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen">
      {/* Banner 영역 */}
      <div className="relative">
        <div className="w-full py-20 px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center text-center" style={bannerStyle}>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-6">자주 묻는 질문</h1>
          <p className="text-lg text-white/90 max-w-3xl mx-auto mb-8">
            Talez에 대한 궁금증을 해결해 드립니다. 원하는 답변을 찾지 못하셨다면 문의하기를 이용해 주세요.
          </p>
          <div className="relative w-full max-w-md">
            <input
              type="text"
              placeholder="질문 검색하기"
              className="w-full px-4 py-3 pl-12 rounded-full bg-white/90 shadow-md border-0 focus:ring-2 focus:ring-primary"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500" size={18} />
          </div>
        </div>
      </div>

      {/* 콘텐츠 영역 */}
      <div className="container mx-auto px-4 py-12">
        <div className="flex flex-wrap gap-2 mb-8 justify-center">
          <Button
            variant={activeCategory === 'all' ? 'default' : 'outline'}
            onClick={() => setActiveCategory('all')}
            className="rounded-full"
          >
            전체
          </Button>
          {faqCategories.map(category => (
            <Button
              key={category.id}
              variant={activeCategory === category.id ? 'default' : 'outline'}
              onClick={() => setActiveCategory(category.id)}
              className="rounded-full"
            >
              {category.name}
            </Button>
          ))}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 max-w-4xl mx-auto">
          <Accordion type="single" collapsible className="space-y-4">
            {filteredFaqs.length > 0 ? (
              filteredFaqs.map((faq, i) => (
                <AccordionItem key={i} value={`item-${i}`} className="border rounded-lg px-4 py-2">
                  <AccordionTrigger className="text-lg font-medium text-left">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-gray-600 dark:text-gray-300 pt-2 pb-4">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <p>검색 결과가 없습니다.</p>
                <p className="mt-2">다른 키워드로 검색하거나 문의하기를 이용해 주세요.</p>
              </div>
            )}
          </Accordion>
        </div>

        <div className="mt-12 text-center">
          <p className="mb-4 text-gray-600 dark:text-gray-300">원하는 답변을 찾지 못하셨나요?</p>
          <Button onClick={() => window.location.href = '/help/contact'}>
            1:1 문의하기
          </Button>
        </div>
      </div>
    </div>
  );
}