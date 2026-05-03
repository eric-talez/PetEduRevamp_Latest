import React, { useState, useEffect } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Clock, Calendar as CalendarIcon, Plus, Check, X, Edit, Trash } from "lucide-react";

interface TrainerReservationsPageProps {
  mode?: 'view' | 'create' | 'edit';
}

export default function TrainerReservationsPage({ mode = 'view' }: TrainerReservationsPageProps) {
  // 상태 관리
  const [pendingReservations, setPendingReservations] = useState<any[]>([]);
  const [upcomingReservations, setUpcomingReservations] = useState<any[]>([]);
  const [completedReservations, setCompletedReservations] = useState<any[]>([]);
  const [availabilitySlots, setAvailabilitySlots] = useState<any[]>([]);
  const { toast } = useToast();
  
  // 다이얼로그 상태
  const [addSlotDialogOpen, setAddSlotDialogOpen] = useState(false);
  const [editReservationDialogOpen, setEditReservationDialogOpen] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<any>(null);
  
  // 신규 가용 시간 추가 폼 상태
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('11:00');
  const [slotType, setSlotType] = useState('1:1');
  const [maxParticipants, setMaxParticipants] = useState(1);
  const [price, setPrice] = useState(30000);
  
  // 가용 시간 슬롯 시간 옵션
  const timeOptions = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', 
    '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
    '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
    '18:00', '18:30', '19:00', '19:30', '20:00'
  ];
  
  useEffect(() => {
    // 모의 데이터 로드 (실제로는 API에서 가져와야 함)
    loadMockData();
    
    // 모드가 생성 모드인 경우 자동으로 슬롯 추가 다이얼로그 열기
    if (mode === 'create') {
      setAddSlotDialogOpen(true);
    }
  }, [mode]);
  
  const loadMockData = () => {
    // 예약 데이터
    setPendingReservations([
      {
        id: 1,
        customerName: "김철수",
        petName: "해피",
        petType: "비숑프리제",
        date: "2025-05-26",
        time: "10:00",
        duration: "60분",
        type: "1:1 훈련",
        status: "pending"
      },
      {
        id: 2,
        customerName: "이영희",
        petName: "초코",
        petType: "푸들",
        date: "2025-05-27",
        time: "14:00",
        duration: "60분",
        type: "1:1 훈련",
        status: "pending"
      }
    ]);
    
    setUpcomingReservations([
      {
        id: 3,
        customerName: "박지민",
        petName: "루시",
        petType: "골든리트리버",
        date: "2025-05-28",
        time: "11:00",
        duration: "60분",
        type: "그룹 훈련",
        status: "confirmed"
      },
      {
        id: 4,
        customerName: "최수진",
        petName: "코코",
        petType: "웰시코기",
        date: "2025-05-30",
        time: "15:00",
        duration: "60분",
        type: "1:1 훈련",
        status: "confirmed"
      }
    ]);
    
    setCompletedReservations([
      {
        id: 5,
        customerName: "정민준",
        petName: "바우",
        petType: "보더콜리",
        date: "2025-05-20",
        time: "13:00",
        duration: "60분",
        type: "1:1 훈련",
        status: "completed"
      }
    ]);
    
    // 가용 시간 슬롯
    setAvailabilitySlots([
      {
        id: 1,
        date: "2025-05-25",
        startTime: "10:00",
        endTime: "11:00",
        type: "1:1",
        maxParticipants: 1,
        price: 50000,
        booked: false
      },
      {
        id: 2,
        date: "2025-05-25",
        startTime: "14:00",
        endTime: "15:00",
        type: "그룹",
        maxParticipants: 5,
        price: 30000,
        booked: false
      },
      {
        id: 3,
        date: "2025-05-26",
        startTime: "10:00",
        endTime: "11:00",
        type: "1:1",
        maxParticipants: 1,
        price: 50000,
        booked: true
      }
    ]);
  };
  
  // 가용 시간 슬롯 추가 핸들러
  const handleAddSlot = () => {
    if (!date) {
      toast({
        title: "날짜를 선택해주세요",
        variant: "destructive"
      });
      return;
    }
    
    const newSlot = {
      id: availabilitySlots.length + 1,
      date: date.toISOString().split('T')[0],
      startTime,
      endTime,
      type: slotType,
      maxParticipants,
      price,
      booked: false
    };
    
    setAvailabilitySlots([...availabilitySlots, newSlot]);
    setAddSlotDialogOpen(false);
    
    toast({
      title: "가용 시간이 추가되었습니다",
      description: `${newSlot.date} ${newSlot.startTime}~${newSlot.endTime}`
    });
    
    // 폼 초기화
    setStartTime('10:00');
    setEndTime('11:00');
    setSlotType('1:1');
    setMaxParticipants(1);
    setPrice(30000);
  };
  
  // 예약 상태 변경 핸들러
  const handleReservationStatusChange = (reservation: any, newStatus: string) => {
    if (newStatus === 'confirmed') {
      const updatedPending = pendingReservations.filter(r => r.id !== reservation.id);
      setPendingReservations(updatedPending);
      
      const updatedReservation = { ...reservation, status: 'confirmed' };
      setUpcomingReservations([...upcomingReservations, updatedReservation]);
      
      toast({
        title: "예약이 확정되었습니다",
        description: `${reservation.customerName}님의 예약이 확정되었습니다.`
      });
    } else if (newStatus === 'completed') {
      const updatedUpcoming = upcomingReservations.filter(r => r.id !== reservation.id);
      setUpcomingReservations(updatedUpcoming);
      
      const updatedReservation = { ...reservation, status: 'completed' };
      setCompletedReservations([...completedReservations, updatedReservation]);
      
      toast({
        title: "예약이 완료 처리되었습니다",
        description: `${reservation.customerName}님의 예약이 완료 처리되었습니다.`
      });
    } else if (newStatus === 'canceled') {
      const updatedPending = pendingReservations.filter(r => r.id !== reservation.id);
      setPendingReservations(updatedPending);
      
      toast({
        title: "예약이 취소되었습니다",
        description: `${reservation.customerName}님의 예약이 취소되었습니다.`
      });
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">수업 일정 관리</h1>
          <p className="text-muted-foreground mt-1">예약 관리 및 수업 가용 시간을 설정합니다.</p>
        </div>
        <Button onClick={() => setAddSlotDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          가용 시간 추가
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>대기 중인 예약</CardTitle>
          </CardHeader>
          <CardContent>
            {pendingReservations.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">대기 중인 예약이 없습니다.</p>
            ) : (
              <div className="space-y-4">
                {pendingReservations.map(reservation => (
                  <div key={reservation.id} className="p-4 border rounded-lg">
                    <div className="flex justify-between mb-2">
                      <div>
                        <p className="font-semibold">{reservation.customerName}</p>
                        <p className="text-sm text-muted-foreground">{reservation.petName} ({reservation.petType})</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm">{reservation.date}</p>
                        <p className="text-sm">{reservation.time} ({reservation.duration})</p>
                      </div>
                    </div>
                    <div className="flex justify-between mt-3">
                      <p className="text-sm">{reservation.type}</p>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleReservationStatusChange(reservation, 'confirmed')}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          승인
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="text-destructive hover:text-destructive/90"
                          onClick={() => handleReservationStatusChange(reservation, 'canceled')}
                        >
                          <X className="h-4 w-4 mr-1" />
                          취소
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>예정된 수업</CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingReservations.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">예정된 수업이 없습니다.</p>
            ) : (
              <div className="space-y-4">
                {upcomingReservations.map(reservation => (
                  <div key={reservation.id} className="p-4 border rounded-lg">
                    <div className="flex justify-between mb-2">
                      <div>
                        <p className="font-semibold">{reservation.customerName}</p>
                        <p className="text-sm text-muted-foreground">{reservation.petName} ({reservation.petType})</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm">{reservation.date}</p>
                        <p className="text-sm">{reservation.time} ({reservation.duration})</p>
                      </div>
                    </div>
                    <div className="flex justify-between mt-3">
                      <p className="text-sm">{reservation.type}</p>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleReservationStatusChange(reservation, 'completed')}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        완료
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>완료된 수업</CardTitle>
          </CardHeader>
          <CardContent>
            {completedReservations.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">완료된 수업이 없습니다.</p>
            ) : (
              <div className="space-y-4">
                {completedReservations.map(reservation => (
                  <div key={reservation.id} className="p-4 border rounded-lg">
                    <div className="flex justify-between mb-2">
                      <div>
                        <p className="font-semibold">{reservation.customerName}</p>
                        <p className="text-sm text-muted-foreground">{reservation.petName} ({reservation.petType})</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm">{reservation.date}</p>
                        <p className="text-sm">{reservation.time} ({reservation.duration})</p>
                      </div>
                    </div>
                    <div className="flex justify-between mt-3">
                      <p className="text-sm">{reservation.type}</p>
                      <Button 
                        variant="outline" 
                        size="sm"
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        후기 작성
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>가용 시간 관리</CardTitle>
        </CardHeader>
        <CardContent>
          {availabilitySlots.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">등록된 가용 시간이 없습니다.</p>
          ) : (
            <div className="relative overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs uppercase bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th scope="col" className="px-6 py-3">날짜</th>
                    <th scope="col" className="px-6 py-3">시간</th>
                    <th scope="col" className="px-6 py-3">유형</th>
                    <th scope="col" className="px-6 py-3">최대 인원</th>
                    <th scope="col" className="px-6 py-3">가격</th>
                    <th scope="col" className="px-6 py-3">상태</th>
                    <th scope="col" className="px-6 py-3">관리</th>
                  </tr>
                </thead>
                <tbody>
                  {availabilitySlots.map(slot => (
                    <tr key={slot.id} className="bg-white dark:bg-gray-900 border-b">
                      <td className="px-6 py-4">{slot.date}</td>
                      <td className="px-6 py-4">{slot.startTime} - {slot.endTime}</td>
                      <td className="px-6 py-4">{slot.type}</td>
                      <td className="px-6 py-4">{slot.maxParticipants}명</td>
                      <td className="px-6 py-4">{slot.price.toLocaleString()}원</td>
                      <td className="px-6 py-4">
                        {slot.booked ? (
                          <span className="px-2 py-1 bg-warning/10 text-warning rounded-full text-xs">예약됨</span>
                        ) : (
                          <span className="px-2 py-1 bg-success/10 text-success rounded-full text-xs">가능</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <Button variant="ghost" size="sm" disabled={slot.booked}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-destructive" disabled={slot.booked}>
                          <Trash className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* 가용 시간 추가 다이얼로그 */}
      <Dialog open={addSlotDialogOpen} onOpenChange={setAddSlotDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>가용 시간 추가</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="date">날짜</Label>
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                className="border rounded-md p-3"
                disabled={(date) => date < new Date()}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="startTime">시작 시간</Label>
                <Select value={startTime} onValueChange={setStartTime}>
                  <SelectTrigger>
                    <SelectValue placeholder="시작 시간 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {timeOptions.map(time => (
                      <SelectItem key={`start-${time}`} value={time}>{time}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="endTime">종료 시간</Label>
                <Select value={endTime} onValueChange={setEndTime}>
                  <SelectTrigger>
                    <SelectValue placeholder="종료 시간 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {timeOptions.map(time => (
                      <SelectItem key={`end-${time}`} value={time}>{time}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="slotType">수업 유형</Label>
              <Select value={slotType} onValueChange={setSlotType}>
                <SelectTrigger>
                  <SelectValue placeholder="수업 유형 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1:1">1:1 수업</SelectItem>
                  <SelectItem value="그룹">그룹 수업</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="maxParticipants">최대 참여 인원</Label>
                <Input
                  type="number"
                  id="maxParticipants"
                  value={maxParticipants}
                  onChange={(e) => setMaxParticipants(parseInt(e.target.value))}
                  min={1}
                  max={10}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="price">가격</Label>
                <Input
                  type="number"
                  id="price"
                  value={price}
                  onChange={(e) => setPrice(parseInt(e.target.value))}
                  min={0}
                  step={10000}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddSlotDialogOpen(false)}>취소</Button>
            <Button onClick={handleAddSlot}>추가하기</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}