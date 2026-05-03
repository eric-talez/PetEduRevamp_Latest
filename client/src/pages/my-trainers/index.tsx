import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { TalezTrainerCertificationBadge } from '@/components/business/TalezTrainerCertificationBadge';
import { TrainerRatingInline } from '@/components/business/TrainerRatingInline';
import { useToast } from '@/hooks/use-toast';
import { Star, MessageCircle, Calendar, Phone, Mail, MapPin, Send, Clock } from 'lucide-react';

const MyTrainersPage = () => {
  const { toast } = useToast();
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [isReservationModalOpen, setIsReservationModalOpen] = useState(false);
  const [selectedTrainer, setSelectedTrainer] = useState<any>(null);
  const [messageText, setMessageText] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState('');
  const [reservationNotes, setReservationNotes] = useState('');

  // 현재 담당 훈련사 데이터 (실제로는 API에서 가져옴)
  const myTrainers = [
    {
      id: 1,
      name: '김훈련',
      specialty: '기본 훈련, 행동 교정',
      rating: 4.8,
      reviews: 127,
      experience: '5년',
      contact: {
        phone: '010-1234-5678',
        email: 'trainer.kim@petedu.com'
      },
      location: '서울시 강남구',
      avatar: undefined,
      status: 'active',
      nextSession: '2025-06-02 14:00',
      totalSessions: 15,
      completedSessions: 12
    },
    {
      id: 2,
      name: '박전문가',
      specialty: '퍼피 트레이닝, 사회화',
      rating: 4.9,
      reviews: 89,
      experience: '7년',
      contact: {
        phone: '010-9876-5432',
        email: 'trainer.park@petedu.com'
      },
      location: '서울시 서초구',
      avatar: undefined,
      status: 'active',
      nextSession: '2025-06-05 10:00',
      totalSessions: 8,
      completedSessions: 6
    }
  ];

  // 메시지 전송 핸들러
  const handleSendMessage = async () => {
    if (!messageText.trim()) {
      toast({
        title: "메시지를 입력해주세요",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch('/api/messages/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          trainerId: selectedTrainer?.id,
          message: messageText,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "메시지 전송 완료",
          description: `${selectedTrainer?.name}에게 메시지를 전송했습니다.`,
        });
      } else {
        throw new Error(result.error || '메시지 전송에 실패했습니다.');
      }
    } catch (error) {
      toast({
        title: "메시지 전송 실패",
        description: "메시지 전송 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }

    setMessageText('');
    setIsMessageModalOpen(false);
    setSelectedTrainer(null);
  };

  // 예약 요청 핸들러
  const handleCreateReservation = async () => {
    if (!selectedDate || !selectedTime) {
      toast({
        title: "날짜와 시간을 선택해주세요",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch('/api/reservations/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          trainerId: selectedTrainer?.id,
          date: selectedDate.toISOString().split('T')[0],
          time: selectedTime,
          notes: reservationNotes,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "예약 요청 완료",
          description: `${selectedTrainer?.name}에게 예약 요청을 보냈습니다.`,
        });
      } else {
        throw new Error(result.error || '예약 요청에 실패했습니다.');
      }
    } catch (error) {
      toast({
        title: "예약 요청 실패",
        description: "예약 요청 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }

    setSelectedDate(undefined);
    setSelectedTime('');
    setReservationNotes('');
    setIsReservationModalOpen(false);
    setSelectedTrainer(null);
  };

  // 메시지 모달 열기
  const openMessageModal = (trainer: any) => {
    setSelectedTrainer(trainer);
    setIsMessageModalOpen(true);
  };

  // 예약 모달 열기
  const openReservationModal = (trainer: any) => {
    setSelectedTrainer(trainer);
    setIsReservationModalOpen(true);
  };

  // 가능한 시간대
  const availableTimes = [
    '09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00', '18:00'
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* 헤더 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            담당 훈련사
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            현재 나의 반려동물을 담당하고 있는 전문 훈련사들을 관리하고 소통하세요.
          </p>
        </div>

        {/* 훈련사 목록 */}
        <div className="grid gap-6 md:grid-cols-2">
          {myTrainers.map((trainer) => (
            <Card key={trainer.id} className="overflow-hidden">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-4">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={trainer.avatar || undefined} />
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {trainer.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-xl">{trainer.name}</CardTitle>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {trainer.specialty}
                      </p>
                      <div className="flex items-center mt-2 space-x-2">
                        <TrainerRatingInline
                          trainerId={trainer.id}
                          fallbackRating={trainer.rating}
                          fallbackReviews={trainer.reviews}
                          iconClassName="h-4 w-4 fill-yellow-400 text-yellow-400 mr-1"
                          textClassName="text-sm font-medium text-gray-700 dark:text-gray-300"
                        />
                      </div>
                      <div className="mt-2">
                        <TalezTrainerCertificationBadge 
                          trainerData={{
                            id: trainer.id.toString(),
                            name: trainer.name,
                            talezCertificationStatus: 'verified',
                            talezCertificationLevel: 'expert',
                            talezCertificationDate: '2024-01-15',
                            licenseNumber: `TZ-${trainer.id.toString().padStart(4, '0')}`
                          }}
                          size="sm"
                        />
                      </div>
                    </div>
                  </div>
                  <Badge variant="default" className="bg-green-100 text-green-800">
                    활성
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* 기본 정보 */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">경력:</span>
                    <span className="ml-2 font-medium">{trainer.experience}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">완료 세션:</span>
                    <span className="ml-2 font-medium">
                      {trainer.completedSessions}/{trainer.totalSessions}
                    </span>
                  </div>
                </div>

                {/* 연락처 정보 */}
                <div className="space-y-2">
                  <div className="flex items-center text-sm">
                    <Phone className="h-4 w-4 mr-2 text-gray-500" />
                    <span>{trainer.contact.phone}</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <Mail className="h-4 w-4 mr-2 text-gray-500" />
                    <span>{trainer.contact.email}</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <MapPin className="h-4 w-4 mr-2 text-gray-500" />
                    <span>{trainer.location}</span>
                  </div>
                </div>

                {/* 다음 세션 */}
                {trainer.nextSession && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-2 text-blue-600" />
                      <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                        다음 세션: {trainer.nextSession}
                      </span>
                    </div>
                  </div>
                )}

                {/* 액션 버튼들 */}
                <div className="flex space-x-2 pt-4">
                  <Button 
                    variant="default" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => openMessageModal(trainer)}
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    메시지
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => openReservationModal(trainer)}
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    예약
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* 빈 상태 */}
        {myTrainers.length === 0 && (
          <Card className="text-center py-12">
            <CardContent>
              <div className="text-gray-500 dark:text-gray-400 mb-4">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">담당 훈련사가 없습니다</h3>
                <p>아직 배정된 훈련사가 없습니다. 강의를 신청하거나 훈련사를 찾아보세요.</p>
              </div>
              <Button>
                훈련사 찾기
              </Button>
            </CardContent>
          </Card>
        )}

        {/* 메시지 전송 모달 */}
        <Dialog open={isMessageModalOpen} onOpenChange={setIsMessageModalOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>메시지 보내기</DialogTitle>
              <DialogDescription>
                {selectedTrainer?.name}에게 메시지를 보냅니다.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={selectedTrainer?.avatar} />
                  <AvatarFallback>{selectedTrainer?.name?.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <h4 className="font-medium">{selectedTrainer?.name}</h4>
                  <p className="text-sm text-gray-500">{selectedTrainer?.specialty}</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="message">메시지 내용</Label>
                <Textarea
                  id="message"
                  placeholder="훈련사에게 전달할 메시지를 입력하세요..."
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  rows={4}
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button 
                variant="outline" 
                onClick={() => setIsMessageModalOpen(false)}
              >
                취소
              </Button>
              <Button onClick={handleSendMessage}>
                <Send className="h-4 w-4 mr-2" />
                전송
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* 예약 요청 모달 */}
        <Dialog open={isReservationModalOpen} onOpenChange={setIsReservationModalOpen}>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>세션 예약</DialogTitle>
              <DialogDescription>
                {selectedTrainer?.name}와의 훈련 세션을 예약합니다.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
              {/* 훈련사 정보 */}
              <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={selectedTrainer?.avatar} />
                  <AvatarFallback>{selectedTrainer?.name?.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <h4 className="font-medium">{selectedTrainer?.name}</h4>
                  <p className="text-sm text-gray-500">{selectedTrainer?.specialty}</p>
                  {selectedTrainer && (
                    <div className="flex items-center mt-1">
                      <TrainerRatingInline
                        trainerId={selectedTrainer.id}
                        fallbackRating={selectedTrainer.rating}
                        fallbackReviews={selectedTrainer.reviews}
                        iconClassName="h-4 w-4 fill-yellow-400 text-yellow-400 mr-1"
                        textClassName="text-sm text-gray-700 dark:text-gray-300"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* 날짜 선택 */}
              <div className="space-y-2">
                <Label>날짜 선택</Label>
                <CalendarComponent
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  disabled={(date) => date < new Date() || date.getDay() === 0} // 과거 날짜와 일요일 비활성화
                  className="rounded-md border w-full"
                />
              </div>

              {/* 시간 선택 */}
              {selectedDate && (
                <div className="space-y-2">
                  <Label>시간 선택</Label>
                  <div className="grid grid-cols-4 gap-2">
                    {availableTimes.map((time) => (
                      <Button
                        key={time}
                        variant={selectedTime === time ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedTime(time)}
                        className="text-sm"
                      >
                        <Clock className="h-4 w-4 mr-1" />
                        {time}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* 요청 사항 */}
              <div className="space-y-2">
                <Label htmlFor="notes">요청 사항 (선택사항)</Label>
                <Textarea
                  id="notes"
                  placeholder="특별한 요청사항이나 반려동물의 상태에 대해 알려주세요..."
                  value={reservationNotes}
                  onChange={(e) => setReservationNotes(e.target.value)}
                  rows={3}
                />
              </div>

              {/* 예약 정보 요약 */}
              {selectedDate && selectedTime && (
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium mb-2">예약 정보</h4>
                  <div className="space-y-1 text-sm">
                    <p><span className="font-medium">훈련사:</span> {selectedTrainer?.name}</p>
                    <p><span className="font-medium">날짜:</span> {selectedDate.toLocaleDateString('ko-KR')}</p>
                    <p><span className="font-medium">시간:</span> {selectedTime}</p>
                    <p><span className="font-medium">위치:</span> {selectedTrainer?.location}</p>
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-end space-x-2">
              <Button 
                variant="outline" 
                onClick={() => setIsReservationModalOpen(false)}
              >
                취소
              </Button>
              <Button onClick={handleCreateReservation}>
                <Calendar className="h-4 w-4 mr-2" />
                예약 요청
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default MyTrainersPage;