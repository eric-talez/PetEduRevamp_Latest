import React, { useState, useEffect } from 'react';
import { useParams } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { 
  MessageCircle, 
  Phone, 
  Mail, 
  Clock, 
  CheckCircle, 
  XCircle,
  User,
  Calendar,
  MessageSquare,
  PhoneCall
} from 'lucide-react';

interface Inquiry {
  id: number;
  instituteId: number;
  name: string;
  contact: string;
  message: string;
  type: string;
  status: string;
  createdAt: string;
  trainerId?: number;
  trainerName?: string;
  response?: string;
  respondedAt?: string;
}

export default function InquiryManagement() {
  const { instituteId } = useParams<{ instituteId: string }>();
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);
  const [isResponseOpen, setIsResponseOpen] = useState(false);
  const [responseText, setResponseText] = useState('');
  const [responseStatus, setResponseStatus] = useState('responded');
  const { toast } = useToast();

  // 문의 목록 조회
  const fetchInquiries = async () => {
    try {
      setIsLoading(true);
      console.log('[InquiryManagement] 문의 목록 조회 - 기관 ID:', instituteId);

      const response = await fetch(`/api/institutes/${instituteId}/inquiries`);
      const result = await response.json();

      if (response.ok && result.success) {
        console.log('[InquiryManagement] 문의 목록 조회 성공:', result.inquiries);
        setInquiries(result.inquiries);
      } else {
        throw new Error(result.error || '문의 목록 조회에 실패했습니다.');
      }
    } catch (error) {
      console.error('문의 목록 조회 실패:', error);
      toast({
        title: "조회 실패",
        description: "문의 목록을 불러올 수 없습니다.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 문의 응답 처리
  const handleResponseSubmit = async () => {
    if (!selectedInquiry || !responseText.trim()) {
      toast({
        title: "입력 오류",
        description: "응답 내용을 입력해주세요.",
        variant: "destructive"
      });
      return;
    }

    try {
      console.log('[InquiryManagement] 문의 응답 처리:', {
        inquiryId: selectedInquiry.id,
        status: responseStatus,
        response: responseText
      });

      const response = await fetch(`/api/institutes/${instituteId}/inquiries/${selectedInquiry.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: responseStatus,
          response: responseText
        })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        console.log('[InquiryManagement] 문의 응답 성공:', result.inquiry);
        
        toast({
          title: "응답 완료",
          description: "문의에 대한 응답이 등록되었습니다.",
        });

        // 상태 초기화 및 목록 새로고침
        setResponseText('');
        setResponseStatus('responded');
        setIsResponseOpen(false);
        setSelectedInquiry(null);
        fetchInquiries();
      } else {
        throw new Error(result.error || '응답 등록에 실패했습니다.');
      }
    } catch (error) {
      console.error('문의 응답 실패:', error);
      toast({
        title: "응답 실패",
        description: "문의 응답 등록 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    }
  };

  // 문의 응답 팝업 열기
  const openResponseDialog = (inquiry: Inquiry) => {
    setSelectedInquiry(inquiry);
    setResponseText(inquiry.response || '');
    setResponseStatus(inquiry.status === 'pending' ? 'responded' : inquiry.status);
    setIsResponseOpen(true);
  };

  // 상태별 색상 및 아이콘
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="secondary" className="text-warning bg-warning/10">
            <Clock className="h-3 w-3 mr-1" />
            대기중
          </Badge>
        );
      case 'responded':
        return (
          <Badge variant="default" className="text-success bg-success/10">
            <CheckCircle className="h-3 w-3 mr-1" />
            응답완료
          </Badge>
        );
      case 'closed':
        return (
          <Badge variant="outline" className="text-gray-700 bg-gray-100">
            <XCircle className="h-3 w-3 mr-1" />
            종료
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            {status}
          </Badge>
        );
    }
  };

  // 문의 유형별 아이콘
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'trainer_contact':
        return <User className="h-4 w-4" />;
      case 'general_inquiry':
        return <MessageSquare className="h-4 w-4" />;
      case 'phone_inquiry':
        return <PhoneCall className="h-4 w-4" />;
      default:
        return <MessageCircle className="h-4 w-4" />;
    }
  };

  useEffect(() => {
    if (instituteId) {
      fetchInquiries();
    }
  }, [instituteId]);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">문의 관리</h1>
        <p className="text-gray-600">접수된 문의를 확인하고 응답하세요.</p>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">전체 문의</p>
                <p className="text-2xl font-bold">{inquiries.length}</p>
              </div>
              <MessageCircle className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">대기중</p>
                <p className="text-2xl font-bold text-warning">
                  {inquiries.filter(i => i.status === 'pending').length}
                </p>
              </div>
              <Clock className="h-8 w-8 text-warning" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">응답완료</p>
                <p className="text-2xl font-bold text-success">
                  {inquiries.filter(i => i.status === 'responded').length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-success" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">종료</p>
                <p className="text-2xl font-bold text-gray-600">
                  {inquiries.filter(i => i.status === 'closed').length}
                </p>
              </div>
              <XCircle className="h-8 w-8 text-gray-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 문의 목록 */}
      <div className="space-y-4">
        {inquiries.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">접수된 문의가 없습니다.</p>
            </CardContent>
          </Card>
        ) : (
          inquiries.map((inquiry) => (
            <Card key={inquiry.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      {getTypeIcon(inquiry.type)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{inquiry.name}</h3>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {inquiry.contact}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(inquiry.createdAt).toLocaleDateString('ko-KR')} {new Date(inquiry.createdAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {inquiry.trainerName && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {inquiry.trainerName} 훈련사
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(inquiry.status)}
                    <Button 
                      size="sm" 
                      onClick={() => openResponseDialog(inquiry)}
                      variant={inquiry.status === 'pending' ? 'default' : 'outline'}
                    >
                      {inquiry.status === 'pending' ? '응답하기' : '수정하기'}
                    </Button>
                  </div>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <h4 className="font-medium mb-2">문의 내용</h4>
                  <p className="text-gray-700 leading-relaxed">{inquiry.message}</p>
                </div>

                {inquiry.response && (
                  <div className="bg-success/10 rounded-lg p-4 border-l-4 border-success/40">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-success">응답 내용</h4>
                      {inquiry.respondedAt && (
                        <span className="text-sm text-success">
                          {new Date(inquiry.respondedAt).toLocaleDateString('ko-KR')} 응답
                        </span>
                      )}
                    </div>
                    <p className="text-success leading-relaxed">{inquiry.response}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* 응답 작성 팝업 */}
      <Dialog open={isResponseOpen} onOpenChange={setIsResponseOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <MessageSquare className="h-6 w-6 text-primary" />
              <div>
                <div className="font-semibold">문의 응답</div>
                <div className="text-sm text-gray-500 font-normal">
                  {selectedInquiry?.name} - {selectedInquiry?.contact}
                </div>
              </div>
            </DialogTitle>
          </DialogHeader>

          {selectedInquiry && (
            <div className="space-y-4 py-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium mb-2">문의 내용</h4>
                <p className="text-gray-700">{selectedInquiry.message}</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">응답 상태</label>
                <Select value={responseStatus} onValueChange={setResponseStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="상태를 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="responded">응답완료</SelectItem>
                    <SelectItem value="closed">종료</SelectItem>
                    <SelectItem value="pending">대기중</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">응답 내용</label>
                <Textarea
                  value={responseText}
                  onChange={(e) => setResponseText(e.target.value)}
                  placeholder="고객에게 전달할 응답을 작성하세요..."
                  rows={5}
                  className="w-full"
                />
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsResponseOpen(false)} className="flex-1">
              취소
            </Button>
            <Button onClick={handleResponseSubmit} className="flex-1">
              <Mail className="h-4 w-4 mr-2" />
              응답 등록
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}