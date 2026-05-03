import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Award, Download, Share2, FileText, BookOpen } from "lucide-react";

interface CertificateItem {
  courseId: number;
  certificateNo: string;
  courseTitle: string;
  trainerName: string;
  instituteName: string;
  petName: string | null;
  completedAt: string | null;
  totalSessions: number;
  completedSessions: number;
}

export default function Certificates() {
  const [, setLocation] = useLocation();
  const { data, isLoading, isError } = useQuery<{ data: CertificateItem[] }>({
    queryKey: ["/api/my-certificates"],
  });

  const certificates = data?.data ?? [];

  const handleShare = async (cert: CertificateItem) => {
    const url = `${window.location.origin}/my-courses/${cert.courseId}/certificate`;
    const text = `${cert.courseTitle} 수료증을 확인해보세요!`;
    try {
      if (navigator.share) {
        await navigator.share({ title: cert.courseTitle, text, url });
      } else {
        await navigator.clipboard.writeText(url);
        alert("수료증 링크를 복사했습니다.");
      }
    } catch (e) {
      console.warn("share failed", e);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8" data-testid="page-certificates">
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <FileText className="w-6 h-6 text-primary" />
        수료증
      </h1>

      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <Card key={i}>
              <Skeleton className="h-40 w-full" />
              <CardHeader>
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && isError && (
        <div className="text-center py-16 border rounded-lg">
          <p className="text-gray-600">수료증 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.</p>
        </div>
      )}

      {!isLoading && !isError && certificates.length === 0 && (
        <div className="text-center py-16 border rounded-lg" data-testid="certificates-empty">
          <Award className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium mb-2">아직 받은 수료증이 없습니다</h3>
          <p className="text-gray-600 mb-4">강의를 모두 이수하면 수료증이 발급됩니다.</p>
          <Button onClick={() => setLocation("/my-courses")}>
            <BookOpen className="w-4 h-4 mr-2" />내 강의 보기
          </Button>
        </div>
      )}

      {!isLoading && !isError && certificates.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {certificates.map((cert) => (
            <Card key={cert.courseId} className="overflow-hidden" data-testid={`certificate-${cert.courseId}`}>
              <div className="relative h-32 bg-gradient-to-br from-amber-200 to-amber-500 flex items-center justify-center">
                <Award className="w-16 h-16 text-white" />
              </div>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{cert.courseTitle}</CardTitle>
                    <div className="text-xs text-muted-foreground mt-1">No. {cert.certificateNo}</div>
                  </div>
                  <Badge variant="secondary">수료</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-sm space-y-1 mb-4">
                  {cert.petName && <div><span className="font-medium">반려동물:</span> {cert.petName}</div>}
                  <div><span className="font-medium">담당 트레이너:</span> {cert.trainerName}</div>
                  <div><span className="font-medium">발급 기관:</span> {cert.instituteName}</div>
                  <div><span className="font-medium">이수 회차:</span> {cert.completedSessions}/{cert.totalSessions}</div>
                  {cert.completedAt && (
                    <div><span className="font-medium">수료일:</span> {new Date(cert.completedAt).toLocaleDateString("ko-KR")}</div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={() => setLocation(`/my-courses/${cert.courseId}/certificate`)}
                    data-testid={`button-view-${cert.courseId}`}
                  >
                    <Award className="w-4 h-4 mr-2" />
                    수료증 보기
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setLocation(`/my-courses/${cert.courseId}/certificate`)}
                    data-testid={`button-download-${cert.courseId}`}
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleShare(cert)}
                    data-testid={`button-share-${cert.courseId}`}
                  >
                    <Share2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
