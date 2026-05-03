import { Separator } from "@/components/ui/separator";

export default function TalezPrivacyPage() {
  return (
    <div className="p-6 max-w-4xl mx-auto text-sm text-gray-800 dark:text-gray-200">
      <h1 className="text-2xl font-bold mb-6">📑 개인정보 처리방침</h1>
      
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold mb-3">1. 수집 항목</h2>
          <div className="space-y-3">
            <div>
              <p><strong>회원가입:</strong> 이름, 이메일, 휴대전화 번호</p>
            </div>
            <div>
              <p><strong>결제:</strong> 카드/계좌 정보(단, PG사에서 직접 수집)</p>
            </div>
            <div>
              <p><strong>훈련사 등록:</strong> 성명, 연락처, 자격증, 경력 증빙</p>
            </div>
            <div>
              <p><strong>서비스 이용:</strong> 접속 로그, IP, 쿠키, 단말기 정보</p>
            </div>
          </div>
        </div>
        
        <Separator />
        
        <div>
          <h2 className="text-lg font-semibold mb-3">2. 이용 목적</h2>
          <ul className="list-disc ml-6 space-y-1">
            <li>회원 관리 및 본인 인증</li>
            <li>알림장 기능 및 화상 수업 연결 제공</li>
            <li>온라인 서비스 결제 및 환불 처리</li>
            <li>훈련사 인증 및 품질 관리</li>
          </ul>
        </div>
        
        <Separator />
        
        <div>
          <h2 className="text-lg font-semibold mb-3">3. 보관 및 파기</h2>
          <div className="space-y-2">
            <p>회원 탈퇴 시 즉시 파기</p>
            <p className="font-medium">단, 전자상거래법 등 관계 법령에 따른 의무 보관</p>
            <ul className="list-disc ml-6 space-y-1 mt-2">
              <li><strong>결제 기록:</strong> 5년</li>
              <li><strong>소비자 불만 처리:</strong> 3년</li>
            </ul>
          </div>
        </div>
        
        <Separator />
        
        <div>
          <h2 className="text-lg font-semibold mb-3">4. 제3자 제공</h2>
          <div className="space-y-2">
            <p><strong>PG사(토스, 다날 등):</strong> 결제 처리 목적</p>
            <p><strong>화상 수업 제공업체:</strong> 기술적 연결 목적</p>
            <p><strong>법령상 요구 시:</strong> 사법기관</p>
          </div>
        </div>
        
        <Separator />
        
        <div>
          <h2 className="text-lg font-semibold mb-3">5. 보호 조치</h2>
          <ul className="list-disc ml-6 space-y-1">
            <li>SSL 암호화 통신</li>
            <li>비밀번호 암호화 저장</li>
            <li>관리자 권한 분리</li>
          </ul>
        </div>
        
        <div className="bg-primary/10 dark:bg-primary/20 p-4 rounded-lg">
          <h3 className="font-semibold mb-2">개인정보 보호책임자</h3>
          <div className="text-sm">
            <p>이름: 개인정보보호팀장</p>
            <p>연락처: privacy@talez.com</p>
            <p>접수 및 처리 시간: 평일 09:00 ~ 18:00</p>
          </div>
        </div>
      </div>
      
      <div className="mt-8 pt-4 border-t text-right text-gray-500">
        <p>시행일: 2025년 1월 26일</p>
      </div>
    </div>
  );
}