import { useQuery } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Award, Printer, Download } from "lucide-react";

interface CertData {
  certificateNo: string; userName: string; petName?: string | null; courseTitle: string;
  trainerName: string; instituteName: string; completedAt: string; totalSessions: number; completedSessions: number;
}

export default function CertificatePage() {
  const [, params] = useRoute<{ id: string }>("/my-courses/:id/certificate");
  const [, setLocation] = useLocation();
  const courseId = params?.id ? parseInt(params.id) : null;

  const { data, isLoading, error } = useQuery<{ data: CertData }>({
    queryKey: ["/api/courses", courseId, "certificate"],
    queryFn: async () => (await fetch(`/api/courses/${courseId}/certificate`, { credentials: "include" })).json(),
    enabled: !!courseId,
  });

  if (isLoading) return <div className="p-8">불러오는 중...</div>;
  if (error || !data?.data) return <div className="p-8">수료증을 불러올 수 없습니다. 모든 회차가 완료되어야 발급됩니다.</div>;
  const c = data.data;
  const completedDate = new Date(c.completedAt).toLocaleDateString("ko-KR");

  return (
    <div className="container mx-auto p-6 max-w-3xl" data-testid="page-certificate">
      <div className="flex flex-wrap justify-between gap-2 mb-4 print:hidden">
        <Button variant="ghost" onClick={() => setLocation(`/my-courses/${courseId}/progress`)}>← 돌아가기</Button>
        <div className="flex gap-2">
          <Button variant="outline" asChild data-testid="button-download-pdf">
            <a
              href={`/api/courses/${courseId}/certificate.pdf`}
              download={`certificate-${c.certificateNo}.pdf`}
            >
              <Download className="w-4 h-4 mr-2" /> PDF 다운로드
            </a>
          </Button>
          <Button onClick={() => window.print()} data-testid="button-print">
            <Printer className="w-4 h-4 mr-2" /> 인쇄
          </Button>
        </div>
      </div>

      <div className="bg-white border-8 border-double border-warning/50 p-12 print:border-warning/50" id="certificate">
        <div className="text-center">
          <Award className="w-16 h-16 text-warning mx-auto" />
          <h1 className="text-4xl font-bold mt-4 text-warning">수 료 증</h1>
          <p className="mt-2 text-sm text-muted-foreground">Certificate of Completion</p>
          <p className="text-xs text-muted-foreground">No. {c.certificateNo}</p>

          <div className="mt-12 text-lg">
            <p>성명: <span className="font-semibold text-2xl">{c.userName}</span></p>
            {c.petName && <p className="mt-2">반려동물: <span className="font-semibold">{c.petName}</span></p>}
          </div>

          <div className="mt-10 text-base leading-8 max-w-xl mx-auto">
            위 수강생은 <strong>{c.courseTitle}</strong> 과정의 전 {c.totalSessions}회차를 모두 성실히 이수하여 본 수료증을 수여합니다.
          </div>

          <div className="mt-12 text-sm">
            <p>수료일: {completedDate}</p>
          </div>

          <div className="mt-16 flex justify-center gap-16">
            <div className="text-center">
              <div className="text-xs text-muted-foreground">담당 트레이너</div>
              <div className="font-semibold mt-1">{c.trainerName}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-muted-foreground">발급 기관</div>
              <div className="font-semibold mt-1">{c.instituteName}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
