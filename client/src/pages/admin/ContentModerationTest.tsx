import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Shield, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

interface ContentCheckResult {
  flagged: boolean;
  keywords: string[];
  severity: 'low' | 'medium' | 'high';
}

const ContentModerationTest: React.FC = () => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [result, setResult] = useState<ContentCheckResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const testContent = async () => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/admin/content-moderation/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim()
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const testSamples = [
    {
      title: '정상적인 게시글',
      content: '반려견 훈련에 대한 유익한 정보를 공유하고 싶습니다. 기본 명령어부터 시작해보세요.',
      description: '정상 콘텐츠'
    },
    {
      title: '부적절한 게시글',
      content: '이 글에는 폭행이나 협박 같은 부적절한 내용이 포함되어 있습니다.',
      description: '폭력성 키워드 포함'
    },
    {
      title: '스팸 게시글',
      content: '100%당첨! 무조건적중하는 카지노 사이트입니다! 바카라에서 큰돈을 벌어보세요!',
      description: '스팸 키워드 포함'
    },
    {
      title: '개인정보 유출',
      content: '제 주민등록번호는 123456-1234567이고 계좌번호는 123-456-789입니다.',
      description: '개인정보 키워드 포함'
    }
  ];

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-destructive/10 text-destructive border-destructive/30';
      case 'medium': return 'bg-warning/10 text-warning border-warning/30';
      case 'low': return 'bg-primary/10 text-primary border-primary/30';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'high': return <XCircle className="w-4 h-4" />;
      case 'medium': return <AlertTriangle className="w-4 h-4" />;
      default: return <CheckCircle className="w-4 h-4" />;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Shield className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">콘텐츠 검열 테스트</h1>
          <p className="text-gray-600">콘텐츠 필터링 시스템을 테스트해보세요</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 테스트 입력 섹션 */}
        <Card>
          <CardHeader>
            <CardTitle>콘텐츠 입력</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">제목</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="게시글 제목을 입력하세요"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">내용</label>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="게시글 내용을 입력하세요"
                rows={6}
              />
            </div>

            <Button 
              onClick={testContent}
              disabled={isLoading || (!title.trim() && !content.trim())}
              className="w-full"
            >
              {isLoading ? '검사 중...' : '콘텐츠 검사'}
            </Button>

            {error && (
              <Alert className="border-destructive/30 bg-destructive/10">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <AlertDescription className="text-destructive">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            {result && (
              <Alert className={`border-2 ${result.flagged ? 'border-destructive/30 bg-destructive/10' : 'border-success/30 bg-success/10'}`}>
                <div className="flex items-center gap-2">
                  {getSeverityIcon(result.severity)}
                  <AlertDescription className={result.flagged ? 'text-destructive' : 'text-success'}>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {result.flagged ? '부적절한 콘텐츠 감지됨' : '콘텐츠 검사 통과'}
                        </span>
                        <Badge className={getSeverityColor(result.severity)}>
                          {result.severity.toUpperCase()}
                        </Badge>
                      </div>
                      {result.keywords.length > 0 && (
                        <div>
                          <span className="text-sm font-medium">감지된 키워드: </span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {result.keywords.map((keyword, index) => (
                              <Badge key={index} variant="danger" className="text-xs">
                                {keyword}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </AlertDescription>
                </div>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* 샘플 테스트 섹션 */}
        <Card>
          <CardHeader>
            <CardTitle>샘플 테스트</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {testSamples.map((sample, index) => (
              <div key={index} className="border rounded-lg p-3 hover:bg-gray-50">
                <div className="flex justify-between items-start gap-3">
                  <div className="flex-1">
                    <h4 className="font-medium text-sm">{sample.title}</h4>
                    <p className="text-xs text-gray-600 mt-1 line-clamp-2">{sample.content}</p>
                    <Badge variant="outline" className="text-xs mt-2">
                      {sample.description}
                    </Badge>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setTitle(sample.title);
                      setContent(sample.content);
                      setResult(null);
                      setError(null);
                    }}
                  >
                    사용
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ContentModerationTest;