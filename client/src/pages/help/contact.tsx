import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue
} from '@/components/ui/select';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import { Mail, Phone, MapPin, MessageSquare, Search } from 'lucide-react';

export default function ContactPage() {
  const bannerStyle = {
    backgroundImage: 'linear-gradient(to right, rgba(234, 88, 12, 0.8), rgba(217, 70, 70, 0.8))',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  };

  const [inquiryType, setInquiryType] = React.useState('general');
  const [submitted, setSubmitted] = React.useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // 실제로는 API를 호출하여 문의사항을 서버에 전송합니다.
    // 여기서는 단순히 제출 완료 상태로 변경합니다.
    setSubmitted(true);
    
    // 5초 후에 폼 리셋
    setTimeout(() => {
      setSubmitted(false);
      const form = e.target as HTMLFormElement;
      form.reset();
    }, 5000);
  };

  const faqItems = [
    {
      question: '결제는 어떻게 진행되나요?',
      answer: '신용카드, 실시간 계좌이체, 가상계좌, 간편결제(카카오페이, 네이버페이 등) 등 다양한 결제 방법을 지원합니다. 결제 정보는 안전하게 암호화되어 처리됩니다.'
    },
    {
      question: '강의 환불 정책은 어떻게 되나요?',
      answer: '강의 구매 후 7일 이내, 수강 진도율 25% 미만인 경우 전액 환불이 가능합니다. 그 이후에는 정해진 환불 규정에 따라 부분 환불이 이루어집니다. 자세한 내용은 [환불 정책] 페이지를 참고해 주세요.'
    },
    {
      question: '계정 정보를 변경하고 싶어요.',
      answer: '로그인 후 "설정" 메뉴에서 개인정보, 비밀번호, 알림 설정 등을 변경할 수 있습니다. 이메일 주소 변경 시에는 변경 인증 과정이 필요합니다.'
    },
    {
      question: '강의 수강 중 기술적 문제가 발생했어요.',
      answer: '기기 재시작, 브라우저 캐시 삭제, 다른 브라우저 사용 등의 기본적인 해결책을 시도해 보세요. 문제가 계속되면 화면 녹화나 스크린샷과 함께 문의해 주시면 더 빠른 해결에 도움이 됩니다.'
    },
    {
      question: '훈련사 상담을 예약했는데 취소하고 싶어요.',
      answer: '상담 예약 24시간 전까지는 "내 예약" 메뉴에서 직접 취소가 가능하며 전액 환불됩니다. 그 이후에는 고객센터(1588-0000)로 문의해 주세요.'
    }
  ];

  return (
    <div className="min-h-screen">
      {/* Banner 영역 */}
      <div className="relative">
        <div className="w-full py-20 px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center text-center" style={bannerStyle}>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-6">문의하기</h1>
          <p className="text-lg text-white/90 max-w-3xl mx-auto mb-8">
            Talez 이용 중 궁금한 점이나 도움이 필요하신가요?<br />
            저희 고객센터가 신속하게 도와드리겠습니다.
          </p>
          <div className="relative w-full max-w-md">
            <input
              type="text"
              placeholder="자주 묻는 질문 검색하기"
              className="w-full px-4 py-3 pl-12 rounded-full bg-white/90 shadow-md border-0 focus:ring-2 focus:ring-primary"
            />
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500" size={18} />
          </div>
        </div>
      </div>

      {/* 콘텐츠 영역 */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          <Tabs defaultValue="form" className="space-y-8">
            <div className="flex justify-center mb-8">
              <TabsList className="grid grid-cols-3 w-full max-w-md">
                <TabsTrigger value="form" className="data-[state=active]:bg-primary/10 dark:data-[state=active]:bg-primary/30">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  문의하기
                </TabsTrigger>
                <TabsTrigger value="faq" className="data-[state=active]:bg-primary/10 dark:data-[state=active]:bg-primary/30">
                  <Search className="w-4 h-4 mr-2" />
                  자주 묻는 질문
                </TabsTrigger>
                <TabsTrigger value="info" className="data-[state=active]:bg-primary/10 dark:data-[state=active]:bg-primary/30">
                  <Phone className="w-4 h-4 mr-2" />
                  연락처 정보
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="form" className="space-y-6">
              <Card>
                <CardContent className="p-6">
                  {!submitted ? (
                    <form onSubmit={handleSubmit} className="space-y-6">
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor="name">이름</Label>
                            <Input id="name" required placeholder="홍길동" />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="email">이메일</Label>
                            <Input id="email" type="email" required placeholder="example@email.com" />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="inquiry-type">문의 유형</Label>
                          <Select defaultValue="general" onValueChange={setInquiryType}>
                            <SelectTrigger>
                              <SelectValue placeholder="문의 유형 선택" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="general">일반 문의</SelectItem>
                              <SelectItem value="technical">기술 지원</SelectItem>
                              <SelectItem value="payment">결제 및 환불</SelectItem>
                              <SelectItem value="course">강의 관련</SelectItem>
                              <SelectItem value="account">계정 관련</SelectItem>
                              <SelectItem value="partnership">제휴 및 협업</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {inquiryType === 'technical' && (
                          <div className="space-y-2">
                            <Label htmlFor="device">기기 정보</Label>
                            <Input id="device" placeholder="사용 중인 기기, 브라우저 정보를 입력해 주세요" />
                          </div>
                        )}

                        {inquiryType === 'payment' && (
                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                              <Label htmlFor="order-number">주문 번호</Label>
                              <Input id="order-number" placeholder="주문 번호가 있다면 입력해 주세요" />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="payment-date">결제일</Label>
                              <Input id="payment-date" type="date" />
                            </div>
                          </div>
                        )}

                        <div className="space-y-2">
                          <Label htmlFor="subject">제목</Label>
                          <Input id="subject" required placeholder="문의 제목을 입력해 주세요" />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="message">내용</Label>
                          <Textarea
                            id="message"
                            required
                            placeholder="문의 내용을 자세히 입력해 주세요"
                            className="min-h-[150px]"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="file">첨부 파일 (선택사항)</Label>
                          <Input id="file" type="file" />
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            최대 파일 크기: 10MB (이미지, PDF, 문서 파일 업로드 가능)
                          </p>
                        </div>
                      </div>

                      <Button type="submit" className="w-full" variant="default">
                        문의 보내기
                      </Button>
                    </form>
                  ) : (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 bg-success/10 dark:bg-success/30 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-success dark:text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <h3 className="text-xl font-semibold mb-2">문의가 접수되었습니다</h3>
                      <p className="text-gray-600 dark:text-gray-300 mb-6">
                        빠른 시일 내에 답변 드리겠습니다. 입력하신 이메일로 답변이 발송됩니다.
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        참고 번호: {Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="faq" className="space-y-6">
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-6">
                    <h2 className="text-xl font-semibold mb-4">자주 묻는 질문</h2>
                    <div className="space-y-4">
                      {faqItems.map((item, i) => (
                        <div key={i} className="border rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                          <h3 className="font-medium text-lg mb-2">{item.question}</h3>
                          <p className="text-gray-600 dark:text-gray-300">{item.answer}</p>
                        </div>
                      ))}
                    </div>
                    <div className="text-center pt-4">
                      <Button variant="outline" onClick={() => window.location.href = '/help/faq'}>
                        더 많은 FAQ 보기
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="info" className="space-y-6">
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-8">
                    <h2 className="text-xl font-semibold mb-4">연락처 정보</h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="border rounded-lg p-6 text-center hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                        <Phone className="w-10 h-10 mx-auto mb-4 text-primary" />
                        <h3 className="font-medium text-lg mb-2">전화 문의</h3>
                        <p className="text-gray-600 dark:text-gray-300 mb-4">1588-0000</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          운영시간: 평일 09:00 ~ 18:00<br />
                          (점심시간 12:00 ~ 13:00)
                        </p>
                      </div>
                      
                      <div className="border rounded-lg p-6 text-center hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                        <Mail className="w-10 h-10 mx-auto mb-4 text-primary" />
                        <h3 className="font-medium text-lg mb-2">이메일 문의</h3>
                        <p className="text-gray-600 dark:text-gray-300 mb-4">support@petedu.com</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          24시간 접수 가능<br />
                          (답변은 영업일 기준 1~2일 소요)
                        </p>
                      </div>
                      
                      <div className="border rounded-lg p-6 text-center hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                        <MapPin className="w-10 h-10 mx-auto mb-4 text-primary" />
                        <h3 className="font-medium text-lg mb-2">방문 상담</h3>
                        <p className="text-gray-600 dark:text-gray-300 mb-4">
                          서울특별시 강남구 테헤란로 123<br />
                          펫에듀 타워 8층
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          방문 전 예약 필수<br />
                          (02-123-4567)
                        </p>
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-6 mt-8">
                      <h3 className="font-medium text-lg mb-3">제휴 및 협업 문의</h3>
                      <p className="text-gray-600 dark:text-gray-300 mb-4">
                        기업 교육, 훈련 시설 제휴, 콘텐츠 협업 등 비즈니스 관련 문의는 아래 이메일로 연락 주세요.
                      </p>
                      <p className="font-medium">partnership@petedu.com</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}