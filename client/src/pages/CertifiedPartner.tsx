import { Separator } from "@/components/ui/separator";

export default function CertifiedPartnerPage() {
  return (
    <div className="p-6 max-w-4xl mx-auto text-sm text-gray-800 dark:text-gray-200">
      <h1 className="text-2xl font-bold mb-6">📑 테일즈 인증 업체 운영 규정 (별도 합의서)</h1>
      
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold mb-3">제1조 (목적)</h2>
          <p className="leading-relaxed">
            본 규정은 테일즈 인증 업체(훈련소·훈련사)가 준수해야 할 서비스 이용 의무와 페널티 기준을 정하는 것을 목적으로 합니다.
          </p>
        </div>
        
        <Separator />
        
        <div>
          <h2 className="text-lg font-semibold mb-3">제2조 (의무)</h2>
          <div className="space-y-3">
            <p>인증 업체는 모든 온라인 상담·수업·알림장 거래를 <strong>반드시 테일즈 플랫폼을 통해 처리</strong>해야 합니다.</p>
            <p className="font-medium text-destructive dark:text-destructive">회사의 사전 서면 동의 없이 플랫폼을 우회한 별도 거래는 금지됩니다.</p>
          </div>
        </div>
        
        <Separator />
        
        <div>
          <h2 className="text-lg font-semibold mb-3">제3조 (단계적 제재)</h2>
          <div className="space-y-4">
            <div className="bg-primary/10 dark:bg-primary/20 p-4 rounded-lg">
              <h3 className="font-semibold mb-2 text-primary dark:text-primary/70">1차 적발</h3>
              <p>경고 및 시정 요구</p>
            </div>
            
            <div className="bg-primary/10 dark:bg-primary/20 p-4 rounded-lg">
              <h3 className="font-semibold mb-2 text-primary dark:text-primary/70">2차 적발</h3>
              <ul className="list-disc ml-4 space-y-1">
                <li>1개월간 알림장 기능 제한</li>
                <li>플랫폼 내 노출 제한</li>
              </ul>
            </div>
            
            <div className="bg-destructive/10 dark:bg-destructive/20 p-4 rounded-lg">
              <h3 className="font-semibold mb-2 text-destructive dark:text-destructive/70">3차 적발</h3>
              <ul className="list-disc ml-4 space-y-1">
                <li><strong>인증 자격 박탈</strong></li>
                <li><strong>서비스 계약 해지</strong></li>
                <li><strong>이미 지급된 수수료의 일부(10~20%) 환수</strong></li>
                <li><strong>6개월~1년간 재가입 제한</strong></li>
              </ul>
            </div>
          </div>
        </div>
        
        <Separator />
        
        <div>
          <h2 className="text-lg font-semibold mb-3">제4조 (예외 협의)</h2>
          <div className="space-y-2">
            <p>지자체 규제, 기존 계약 등 불가피한 사유 발생 시, 회사와 사전 협의 후 예외 인정 가능</p>
            <p className="font-medium">예외 적용은 반드시 서면 합의를 통해야 함</p>
          </div>
        </div>
        
        <div className="bg-success/10 dark:bg-success/20 p-4 rounded-lg">
          <h3 className="font-semibold mb-2 text-success dark:text-success/70">인증 업체 혜택</h3>
          <div className="text-sm space-y-1">
            <p>• 테일즈 공식 인증 마크 사용 권한</p>
            <p>• 우선 노출 및 추천 시스템 혜택</p>
            <p>• 전용 관리 도구 및 분석 리포트 제공</p>
            <p>• 마케팅 지원 및 홍보 협력</p>
          </div>
        </div>
        
        <div className="bg-gray-50 dark:bg-gray-900/20 p-4 rounded-lg">
          <h3 className="font-semibold mb-2">문의 및 신고</h3>
          <div className="text-sm">
            <p>담당 부서: 파트너십팀</p>
            <p>연락처: partner@talez.com</p>
            <p>운영 시간: 평일 09:00 ~ 18:00</p>
          </div>
        </div>
      </div>
      
      <div className="mt-8 pt-4 border-t text-right text-gray-500">
        <p>시행일: 2025년 1월 26일</p>
      </div>
    </div>
  );
}