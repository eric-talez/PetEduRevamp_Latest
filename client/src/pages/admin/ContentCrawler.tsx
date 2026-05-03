import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { 
  Globe, 
  Search, 
  Download, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Link as LinkIcon,
  FileText,
  Tags,
  ExternalLink,
  Play,
  Pause,
  RefreshCw
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CrawledContent {
  title: string;
  content: string;
  summary: string;
  tags: string[];
  category: string;
  sourceUrl: string;
  publishedAt: string;
  author?: string;
  thumbnailUrl?: string;
}

interface CrawlResult {
  success: boolean;
  message: string;
  data?: {
    crawledContent: CrawledContent;
    post?: any;
    foundArticles?: number;
    allArticleUrls?: string[];
  };
}

export default function ContentCrawler() {
  const [singleUrl, setSingleUrl] = useState('');
  const [multipleUrls, setMultipleUrls] = useState('');
  const [autoPost, setAutoPost] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<CrawledContent[]>([]);
  const [error, setError] = useState('');
  const [foundArticles, setFoundArticles] = useState<number>(0);
  const [allArticleUrls, setAllArticleUrls] = useState<string[]>([]);
  const [registeringId, setRegisteringId] = useState<number | string | null>(null);
  const { toast } = useToast();

  // 단일 URL 크롤링
  const handleSingleCrawl = async () => {
    if (!singleUrl.trim()) {
      setError('URL을 입력해주세요.');
      return;
    }

    setIsLoading(true);
    setError('');
    setProgress(0);

    try {
      // 언론사 페이지인지 확인
      const isJournalistPage = singleUrl.includes('media.naver.com/journalist/');
      
      if (isJournalistPage) {
        // 언론사 페이지 크롤링 진행률 단계별 업데이트
        setProgress(10); // 페이지 분석 시작
        
        await new Promise(resolve => setTimeout(resolve, 500));
        setProgress(30); // 기사 링크 추출 중
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        setProgress(60); // 반려견 관련 기사 필터링 중
        
        await new Promise(resolve => setTimeout(resolve, 500));
        setProgress(80); // 첫 번째 기사 크롤링 중
      } else {
        // 단일 기사 크롤링
        setProgress(20); // 기사 분석 시작
        await new Promise(resolve => setTimeout(resolve, 300));
        setProgress(60); // 내용 추출 중
        await new Promise(resolve => setTimeout(resolve, 500));
        setProgress(80); // 분석 완료
      }

      const response = await fetch('/api/admin/content/crawl', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: singleUrl.trim(),
          autoPost
        }),
      });

      const result: CrawlResult = await response.json();

      if (result.success && result.data) {
        setResults([result.data.crawledContent]);
        setProgress(100);
        
        // 언론사 페이지 크롤링 결과 저장
        if (result.data.foundArticles) {
          setFoundArticles(result.data.foundArticles);
          setAllArticleUrls(result.data.allArticleUrls || []);
        }
        
        toast({
          title: "크롤링 완료",
          description: result.message,
        });
        
        // 언론사 페이지 크롤링 결과 표시
        if (result.data.foundArticles && result.data.foundArticles > 1) {
          toast({
            title: "언론사 페이지 크롤링",
            description: `총 ${result.data.foundArticles}개의 반려견 관련 기사를 발견했습니다.`,
          });
        }
      } else {
        setError(result.message || '크롤링에 실패했습니다.');
      }
    } catch (error) {
      console.error('크롤링 오류:', error);
      setError('크롤링 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 다중 URL 크롤링
  const handleMultipleCrawl = async () => {
    const urls = multipleUrls.split('\n').filter(url => url.trim());
    
    if (urls.length === 0) {
      setError('URL을 입력해주세요.');
      return;
    }

    setIsLoading(true);
    setError('');
    setProgress(0);

    try {
      // 다중 URL 크롤링 진행률 업데이트
      setProgress(10); // 크롤링 시작
      
      const response = await fetch('/api/admin/content/crawl-multiple', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          urls,
          autoPost
        }),
      });

      setProgress(50); // 서버 응답 대기 중
      
      const result: CrawlResult = await response.json();

      if (result.success && result.data) {
        setResults(result.data as CrawledContent[]);
        setProgress(100);
        toast({
          title: "다중 크롤링 완료",
          description: result.message,
        });
      } else {
        setError(result.message || '크롤링에 실패했습니다.');
      }
    } catch (error) {
      console.error('다중 크롤링 오류:', error);
      setError('크롤링 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 수동 커뮤니티 등록
  const handleManualRegister = async (content: CrawledContent, index: number) => {
    setRegisteringId(index);
    
    try {
      const response = await fetch('/api/admin/content/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          crawledContent: content
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "등록 완료",
          description: "커뮤니티에 성공적으로 등록되었습니다.",
        });
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('수동 등록 오류:', error);
      toast({
        title: "등록 실패",
        description: "커뮤니티 등록 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setRegisteringId(null);
    }
  };

  // 개별 기사 URL 크롤링 후 등록
  const handleArticleUrlCrawl = async (url: string, index: number) => {
    setRegisteringId(`url-${index}`);
    
    try {
      const response = await fetch('/api/admin/content/crawl', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: url.trim(),
          autoPost: true
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "크롤링 및 등록 완료",
          description: "기사가 성공적으로 크롤링되어 커뮤니티에 등록되었습니다.",
        });
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('기사 크롤링 오류:', error);
      toast({
        title: "크롤링 실패",
        description: "기사 크롤링 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setRegisteringId(null);
    }
  };

  // 결과 초기화
  const handleReset = () => {
    setSingleUrl('');
    setMultipleUrls('');
    setResults([]);
    setError('');
    setProgress(0);
    setFoundArticles(0);
    setAllArticleUrls([]);
    setRegisteringId(null);
  };

  // 카테고리별 색상 매핑
  const getCategoryColor = (category: string) => {
    const colors = {
      '건강정보': 'bg-red-100 text-red-800',
      '훈련교육': 'bg-blue-100 text-blue-800',
      '행동분석': 'bg-primary/10 text-primary',
      '생활정보': 'bg-green-100 text-green-800',
      '미용관리': 'bg-secondary/15 text-primary',
      '법률정보': 'bg-yellow-100 text-yellow-800',
      '여행정보': 'bg-indigo-100 text-indigo-800',
      '입양분양': 'bg-orange-100 text-orange-800',
      '품종정보': 'bg-secondary/15 text-secondary-foreground',
      '일반정보': 'bg-gray-100 text-gray-800'
    };
    return colors[category] || colors['일반정보'];
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">콘텐츠 크롤링</h1>
          <p className="text-gray-600 mt-1">
            네이버 미디어 기사를 크롤링하여 반려견 관련 콘텐츠를 커뮤니티에 자동 등록합니다.
          </p>
        </div>
        <Button 
          onClick={handleReset}
          variant="outline"
          className="flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          초기화
        </Button>
      </div>

      <Tabs defaultValue="single" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="single">단일 URL</TabsTrigger>
          <TabsTrigger value="multiple">다중 URL</TabsTrigger>
        </TabsList>
        
        <TabsContent value="single" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                단일 URL 크롤링
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch 
                  id="auto-post-single" 
                  checked={autoPost}
                  onCheckedChange={setAutoPost}
                />
                <Label htmlFor="auto-post-single">자동으로 커뮤니티에 등록</Label>
              </div>
              
              <div className="space-y-2">
                <Label>URL</Label>
                <Input
                  placeholder="https://media.naver.com/journalist/396/81348"
                  value={singleUrl}
                  onChange={(e) => setSingleUrl(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <Button 
                onClick={handleSingleCrawl}
                disabled={isLoading || !singleUrl.trim()}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Pause className="h-4 w-4 mr-2 animate-spin" />
                    크롤링 중...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    크롤링 시작
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="multiple" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                다중 URL 크롤링
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch 
                  id="auto-post-multiple" 
                  checked={autoPost}
                  onCheckedChange={setAutoPost}
                />
                <Label htmlFor="auto-post-multiple">자동으로 커뮤니티에 등록</Label>
              </div>
              
              <div className="space-y-2">
                <Label>URL 목록 (한 줄에 하나씩)</Label>
                <Textarea
                  placeholder="https://media.naver.com/journalist/396/81348&#10;https://media.naver.com/journalist/396/81349&#10;https://media.naver.com/journalist/396/81350"
                  value={multipleUrls}
                  onChange={(e) => setMultipleUrls(e.target.value)}
                  disabled={isLoading}
                  rows={6}
                />
              </div>

              <Button 
                onClick={handleMultipleCrawl}
                disabled={isLoading || !multipleUrls.trim()}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Pause className="h-4 w-4 mr-2 animate-spin" />
                    크롤링 중...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    일괄 크롤링 시작
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 진행 상황 */}
      {isLoading && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>크롤링 진행 상황</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* 오류 메시지 */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* 크롤링 결과 */}
      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              크롤링 결과 ({results.length}개)
              {foundArticles > 0 && (
                <Badge variant="secondary" className="ml-2">
                  총 {foundArticles}개 기사 발견
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {results.map((content, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <h3 className="font-semibold text-lg">{content.title}</h3>
                    <Badge className={getCategoryColor(content.category)}>
                      {content.category}
                    </Badge>
                  </div>
                  
                  <p className="text-gray-600 text-sm line-clamp-3">
                    {content.summary}
                  </p>
                  
                  <div className="flex flex-wrap gap-1">
                    {content.tags.map((tag, tagIndex) => (
                      <Badge key={tagIndex} variant="outline" className="text-xs">
                        <Tags className="h-3 w-3 mr-1" />
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <div className="flex items-center gap-4">
                      {content.author && (
                        <span>작성자: {content.author}</span>
                      )}
                      <span>{new Date(content.publishedAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleManualRegister(content, index)}
                        disabled={registeringId === index}
                        className="text-xs"
                      >
                        {registeringId === index ? (
                          <>
                            <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                            등록 중...
                          </>
                        ) : (
                          <>
                            <Play className="h-3 w-3 mr-1" />
                            커뮤니티 등록
                          </>
                        )}
                      </Button>
                      <a 
                        href={content.sourceUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-blue-600 hover:text-blue-800"
                      >
                        <ExternalLink className="h-3 w-3" />
                        원문 보기
                      </a>
                    </div>
                  </div>
                  
                  {content.thumbnailUrl && (
                    <div className="mt-3">
                      <img 
                        src={content.thumbnailUrl} 
                        alt={content.title}
                        className="w-full h-48 object-cover rounded"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                </div>
              ))}
              
              {/* 발견된 기사 목록 표시 */}
              {allArticleUrls.length > 0 && (
                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    발견된 반려견 관련 기사 ({allArticleUrls.length}개)
                  </h4>
                  <div className="space-y-2">
                    {allArticleUrls.map((url, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-white rounded border">
                        <span className="text-sm text-gray-600">기사 #{index + 1}</span>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleArticleUrlCrawl(url, index)}
                            disabled={registeringId === `url-${index}`}
                            className="text-xs"
                          >
                            {registeringId === `url-${index}` ? (
                              <>
                                <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                                등록 중...
                              </>
                            ) : (
                              <>
                                <Play className="h-3 w-3 mr-1" />
                                크롤링 후 등록
                              </>
                            )}
                          </Button>
                          <a 
                            href={url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm"
                          >
                            <ExternalLink className="h-3 w-3" />
                            기사 보기
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 text-xs text-blue-700">
                    💡 언론사 페이지에서 자동으로 발견한 반려견 관련 기사들입니다. 각 기사를 개별적으로 크롤링하려면 단일 URL 탭에서 해당 기사 링크를 입력하세요.
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}