import { Separator } from "@/components/ui/separator";

export default function TalezRefundPage() {
  return (
    <div className="p-6 max-w-4xl mx-auto text-sm text-gray-800 dark:text-gray-200">
      <h1 className="text-2xl font-bold mb-6">📑 환불 규정</h1>
      
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold mb-3">1. 영상 강의</h2>
          <div className="space-y-2">
            <p><strong>결제 후 7일 이내, 수강 이력 없을 경우:</strong> 100% 환불</p>
            <p><strong>수강 시작 후:</strong> 환불 불가</p>
          </div>
        </div>
        
        <Separator />
        
        <div>
          <h2 className="text-lg font-semibold mb-3">2. 화상 수업</h2>
          <div className="space-y-2">
            <p><strong>24시간 전 취소:</strong> 100% 환불</p>
            <p><strong>24시간~1시간 전 취소:</strong> 50% 환불</p>
            <p><strong>1시간 이내 취소·무단 불참:</strong> 환불 불가</p>
          </div>
        </div>
        
        <Separator />
        
        <div>
          <h2 className="text-lg font-semibold mb-3">3. 훈련사·견주 매칭</h2>
          <div className="space-y-2">
            <p>회사(테일즈)는 개별 상담·수업의 계약 및 환불·취소에 관여하지 않음</p>
            <p className="font-medium">매칭 후 발생하는 환불·취소는 당사자 간 합의로 처리</p>
          </div>
        </div>
        
        <Separator />
        
        <div>
          <h2 className="text-lg font-semibold mb-3">4. 알림장 이용료</h2>
          <div className="space-y-2">
            <p>월 단위 정액 과금, 이용 여부와 관계없이 환불 불가</p>
            <p className="font-medium">단, 시스템 장애 등 회사 책임 사유 발생 시 전액 환불</p>
          </div>
        </div>
        
        <div className="bg-warning/10 dark:bg-warning/20 p-4 rounded-lg">
          <h3 className="font-semibold mb-2 text-warning dark:text-warning/70">환불 처리 절차</h3>
          <div className="text-sm space-y-1">
            <p>• 환불 신청: 고객센터 또는 마이페이지에서 신청</p>
            <p>• 처리 기간: 신청일로부터 3-5 영업일</p>
            <p>• 환불 방법: 결제한 수단으로 자동 환불</p>
            <p>• 문의: support@talez.com</p>
          </div>
        </div>
      </div>
      
      <div className="mt-8 pt-4 border-t text-right text-gray-500">
        <p>시행일: 2025년 1월 26일</p>
      </div>
    </div>
  );
}