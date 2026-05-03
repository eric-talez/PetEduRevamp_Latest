import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Upload, 
  BookOpen, 
  Play, 
  ShoppingCart, 
  CreditCard,
  CheckCircle,
  Clock,
  FileText,
  ArrowRight,
  Loader2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface TestResult {
  step: string;
  status: 'pending' | 'running' | 'success' | 'error';
  message: string;
  data?: any;
}

export default function ProcessTest() {
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const { toast } = useToast();

  const updateTestResult = (step: string, status: TestResult['status'], message: string, data?: any) => {
    setTestResults(prev => {
      const existing = prev.find(r => r.step === step);
      if (existing) {
        return prev.map(r => r.step === step ? { ...r, status, message, data } : r);
      } else {
        return [...prev, { step, status, message, data }];
      }
    });
  };

  const runFullProcessTest = async () => {
    setIsRunning(true);
    setTestResults([]);

    try {
      // Step 1: 커리큘럼 업로드 및 자동 채우기 테스트
      updateTestResult('upload', 'running', '한성규 강의 파일 업로드 중...');
      
      const formData = new FormData();
      const testFile = new File(['테일즈 강의 내용(한성규)'], '테일즈 강의 내용(한성규).hwp');
      formData.append('file', testFile);

      const uploadResponse = await fetch('/api/admin/curriculum/upload', {
        method: 'POST',
        body: formData
      });

      if (uploadResponse.ok) {
        const uploadData = await uploadResponse.json();
        updateTestResult('upload', 'success', '파일 업로드 및 자동 채우기 완료', uploadData);
      } else {
        throw new Error('파일 업로드 실패');
      }

      // Step 2: 커리큘럼 생성
      updateTestResult('curriculum', 'running', '커리큘럼 생성 중...');
      
      const curriculumData = {
        title: '테일즈 강의 내용 - 반려견 행동교정 전문과정',
        description: '한성규 작성자의 전문 반려견 훈련 커리큘럼',
        category: '전문가과정',
        difficulty: 'advanced',
        duration: 480,
        price: 300000,
        trainerId: '100',
        trainerName: '한성규',
        modules: [
          { title: '1단계: 반려견 행동 이해와 분석', duration: 90 },
          { title: '2단계: 기초 복종훈련 방법론', duration: 120 },
          { title: '3단계: 문제행동 교정 실습', duration: 150 },
          { title: '4단계: 보호자 교육 및 지도법', duration: 120 }
        ]
      };

      const curriculumResponse = await fetch('/api/admin/curriculum', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(curriculumData)
      });

      if (curriculumResponse.ok) {
        const curriculumResult = await curriculumResponse.json();
        updateTestResult('curriculum', 'success', '커리큘럼 생성 완료', curriculumResult);

        // Step 3: 강의로 발행
        updateTestResult('publish', 'running', '커리큘럼을 강의로 발행 중...');
        
        const publishResponse = await fetch(`/api/admin/curriculums/${curriculumResult.id}/publish`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(curriculumData)
        });

        if (publishResponse.ok) {
          const publishResult = await publishResponse.json();
          updateTestResult('publish', 'success', '강의 발행 완료', publishResult);

          // Step 4: 발행된 강의 조회
          updateTestResult('course', 'running', '발행된 강의 정보 조회 중...');
          
          const courseResponse = await fetch(`/api/courses/${publishResult.courseId}`);
          
          if (courseResponse.ok) {
            const courseData = await courseResponse.json();
            updateTestResult('course', 'success', '강의 정보 조회 완료', courseData);

            // Step 5: 강의 구매 테스트
            updateTestResult('purchase', 'running', '강의 구매 프로세스 테스트 중...');
            
            const purchaseResponse = await fetch(`/api/courses/${publishResult.courseId}/purchase`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' }
            });

            if (purchaseResponse.ok) {
              const purchaseData = await purchaseResponse.json();
              updateTestResult('purchase', 'success', '강의 구매 완료', purchaseData);

              updateTestResult('complete', 'success', '전체 프로세스 테스트 성공!', {
                summary: '커리큘럼 → 강의 → 상품 → 결제 프로세스 완료'
              });

            } else {
              throw new Error('강의 구매 실패');
            }
          } else {
            throw new Error('강의 조회 실패');
          }
        } else {
          throw new Error('강의 발행 실패');
        }
      } else {
        throw new Error('커리큘럼 생성 실패');
      }

    } catch (error) {
      console.error('프로세스 테스트 중 오류:', error);
      updateTestResult('error', 'error', `테스트 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`, { error });
      
      toast({
        title: "테스트 실패",
        description: "전체 프로세스 테스트 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'running':
        return <Loader2 className="w-5 h-5 animate-spin text-primary" />;
      case 'success':
        return <CheckCircle className="w-5 h-5 text-success" />;
      case 'error':
        return <CheckCircle className="w-5 h-5 text-destructive" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'running': return 'info';
      case 'success': return 'success';
      case 'error': return 'danger';
      default: return 'secondary';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary to-secondary p-6">
      <div className="max-w-6xl mx-auto">
        {/* 헤더 */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            커리큘럼-강의-결제 프로세스 테스트
          </h1>
          <p className="text-lg text-muted-foreground">
            .hwp 파일 업로드부터 강의 구매까지의 전체 연동 프로세스를 테스트합니다
          </p>
        </div>

        {/* 프로세스 다이어그램 */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-6 h-6" />
              테스트 프로세스 플로우
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between overflow-x-auto pb-4">
              <div className="flex items-center gap-2">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <Upload className="w-6 h-6 text-primary" />
                </div>
                <span className="text-sm font-medium">파일 업로드</span>
              </div>
              
              <ArrowRight className="w-5 h-5 text-gray-400" />
              
              <div className="flex items-center gap-2">
                <div className="w-12 h-12 bg-success/10 rounded-full flex items-center justify-center">
                  <FileText className="w-6 h-6 text-success" />
                </div>
                <span className="text-sm font-medium">커리큘럼 생성</span>
              </div>
              
              <ArrowRight className="w-5 h-5 text-gray-400" />
              
              <div className="flex items-center gap-2">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <Play className="w-6 h-6 text-primary" />
                </div>
                <span className="text-sm font-medium">강의 발행</span>
              </div>
              
              <ArrowRight className="w-5 h-5 text-gray-400" />
              
              <div className="flex items-center gap-2">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <ShoppingCart className="w-6 h-6 text-primary" />
                </div>
                <span className="text-sm font-medium">상품 등록</span>
              </div>
              
              <ArrowRight className="w-5 h-5 text-gray-400" />
              
              <div className="flex items-center gap-2">
                <div className="w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center">
                  <CreditCard className="w-6 h-6 text-destructive" />
                </div>
                <span className="text-sm font-medium">결제 완료</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 테스트 실행 버튼 */}
        <div className="mb-8 text-center">
          <Button
            onClick={runFullProcessTest}
            disabled={isRunning}
            size="lg"
            className="px-8 py-4 text-lg"
          >
            {isRunning ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                테스트 실행 중...
              </>
            ) : (
              <>
                <Play className="w-5 h-5 mr-2" />
                전체 프로세스 테스트 시작
              </>
            )}
          </Button>
        </div>

        {/* 테스트 결과 */}
        {testResults.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>테스트 결과</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {testResults.map((result, index) => (
                  <div key={index} className="flex items-center gap-4 p-4 border rounded-lg">
                    <div className="flex-shrink-0">
                      {getStatusIcon(result.status)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{result.step}</span>
                        <Badge variant={getStatusColor(result.status)}>
                          {result.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{result.message}</p>
                      {result.data && (
                        <details className="mt-2">
                          <summary className="text-xs text-primary cursor-pointer">
                            상세 데이터 보기
                          </summary>
                          <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto">
                            {JSON.stringify(result.data, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 성공 시 액션 버튼들 */}
        {testResults.some(r => r.step === 'complete' && r.status === 'success') && (
          <Card className="mt-8 border-success/30 bg-success/10">
            <CardHeader>
              <CardTitle className="text-success">🎉 테스트 완료!</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-success mb-4">
                커리큘럼 → 강의 → 상품 → 결제 전체 프로세스가 성공적으로 연동되었습니다.
              </p>
              <div className="flex gap-4">
                <Button 
                  onClick={() => window.open('/admin/curriculum', '_blank')}
                  variant="outline"
                >
                  <BookOpen className="w-4 h-4 mr-2" />
                  커리큘럼 관리
                </Button>
                <Button 
                  onClick={() => window.open('/courses', '_blank')}
                  variant="outline"
                >
                  <Play className="w-4 h-4 mr-2" />
                  강의 목록
                </Button>
                <Button 
                  onClick={() => window.open('/shop', '_blank')}
                  variant="outline"
                >
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  쇼핑몰
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}