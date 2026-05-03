import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft,
  Download,
  Calendar,
  TrendingUp,
  Users,
  School,
  BookOpen,
  ClipboardList,
  Filter,
  RefreshCw,
  FileText
} from 'lucide-react';
import { UserGrowthChart, UserTypeChart, PlatformActivityChart } from '@/components/charts/AdminCharts';
import { useLocation } from 'wouter';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from '@/components/ui/badge';

export default function AnalyticsReportPage() {
  const { userName } = useAuth();
  const [location, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState('overview');
  const [timeRange, setTimeRange] = useState('30days');
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        // 실제 구현 시 API 호출로 대체
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error('데이터 로딩 오류:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [timeRange]);
  
  const handleGoBack = () => {
    setLocation('/admin/dashboard');
  };
  
  const handleDownloadReport = () => {
    // 실제 구현 시 보고서 다운로드 기능 추가
    console.log('전체 분석 보고서 다운로드');
  };
  
  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center">
          <Button variant="ghost" size="sm" onClick={handleGoBack} className="mr-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            돌아가기
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">플랫폼 분석 보고서</h1>
        </div>
        <div className="flex items-center space-x-3">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[180px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue placeholder="기간 선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7days">최근 7일</SelectItem>
              <SelectItem value="30days">최근 30일</SelectItem>
              <SelectItem value="90days">최근 90일</SelectItem>
              <SelectItem value="6months">최근 6개월</SelectItem>
              <SelectItem value="1year">최근 1년</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            새로고침
          </Button>
          <Button variant="default" size="sm" onClick={handleDownloadReport}>
            <Download className="h-4 w-4 mr-2" />
            보고서 다운로드
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">총 사용자</CardTitle>
            <CardDescription>전체 등록 사용자</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12,483명</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-500">+5.2%</span> 전월 대비
            </p>
            <div className="mt-4 h-1 w-full bg-secondary">
              <div className="h-1 bg-primary" style={{ width: '75%' }} />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">총 기관</CardTitle>
            <CardDescription>등록된 교육 기관</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">127개</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-500">+2.8%</span> 전월 대비
            </p>
            <div className="mt-4 h-1 w-full bg-secondary">
              <div className="h-1 bg-primary" style={{ width: '65%' }} />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">총 훈련사</CardTitle>
            <CardDescription>등록된 훈련사</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">542명</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-500">+8.7%</span> 전월 대비
            </p>
            <div className="mt-4 h-1 w-full bg-secondary">
              <div className="h-1 bg-primary" style={{ width: '82%' }} />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">총 강의</CardTitle>
            <CardDescription>등록된 훈련 강의</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,872개</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-500">+12.4%</span> 전월 대비
            </p>
            <div className="mt-4 h-1 w-full bg-secondary">
              <div className="h-1 bg-primary" style={{ width: '88%' }} />
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">개요</TabsTrigger>
          <TabsTrigger value="users">사용자 분석</TabsTrigger>
          <TabsTrigger value="content">콘텐츠 분석</TabsTrigger>
          <TabsTrigger value="engagement">참여도 분석</TabsTrigger>
          <TabsTrigger value="revenue">수익 분석</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
          {/* 사용자 증가 추이 그래프 */}
          <Card>
            <CardHeader>
              <CardTitle>사용자 증가 추이</CardTitle>
              <CardDescription>
                기간: {timeRange === '7days' ? '최근 7일' : 
                      timeRange === '30days' ? '최근 30일' : 
                      timeRange === '90days' ? '최근 90일' : 
                      timeRange === '6months' ? '최근 6개월' : '최근 1년'}
              </CardDescription>
            </CardHeader>
            <CardContent className="h-80 flex flex-col items-center justify-center">
              <div className="mb-4">
                <UserGrowthChart />
              </div>
              <p className="text-center text-muted-foreground">
                사용자 증가 추세 그래프가 여기에 표시됩니다.
              </p>
              <div className="mt-4 grid grid-cols-4 w-full gap-4">
                <div className="text-center">
                  <div className="text-sm font-medium text-muted-foreground">신규 가입</div>
                  <div className="text-xl font-bold mt-1">+187</div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-medium text-muted-foreground">활성 사용자</div>
                  <div className="text-xl font-bold mt-1">4,215</div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-medium text-muted-foreground">방문율</div>
                  <div className="text-xl font-bold mt-1">68.7%</div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-medium text-muted-foreground">이탈율</div>
                  <div className="text-xl font-bold mt-1">22.3%</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* 주간 인기 콘텐츠 */}
          <Card>
            <CardHeader>
              <CardTitle>인기 콘텐츠 분석</CardTitle>
              <CardDescription>
                사용자들이 가장 많이 본 콘텐츠
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <Badge className="mb-2">강의</Badge>
                      <h3 className="text-lg font-medium">초보 견주를 위한 기본 훈련 가이드</h3>
                      <p className="text-sm text-muted-foreground">훈련사: 김철수</p>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold">1,248</div>
                      <p className="text-xs text-muted-foreground">조회수</p>
                    </div>
                  </div>
                  <Progress value={95} className="h-2" />
                </div>
                
                <div className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <Badge className="mb-2">가이드</Badge>
                      <h3 className="text-lg font-medium">반려견 분리불안 해소하기</h3>
                      <p className="text-sm text-muted-foreground">훈련사: 박영희</p>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold">987</div>
                      <p className="text-xs text-muted-foreground">조회수</p>
                    </div>
                  </div>
                  <Progress value={78} className="h-2" />
                </div>
                
                <div className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <Badge className="mb-2">강의</Badge>
                      <h3 className="text-lg font-medium">반려견 사회화 훈련 중급과정</h3>
                      <p className="text-sm text-muted-foreground">훈련사: 이민수</p>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold">842</div>
                      <p className="text-xs text-muted-foreground">조회수</p>
                    </div>
                  </div>
                  <Progress value={67} className="h-2" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* 사용자 역할 분포 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>사용자 역할 분포</CardTitle>
                <CardDescription>역할별 사용자 비율</CardDescription>
              </CardHeader>
              <CardContent className="h-64 flex flex-col justify-center items-center">
                <div className="mb-4 h-10 w-10">
                  <UserTypeChart />
                </div>
                <p className="text-sm text-center text-muted-foreground">사용자 역할 분포 차트가 표시됩니다.</p>
                <div className="mt-4 w-full space-y-2">
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-blue-500 mr-2"></div>
                    <span className="text-sm flex-1">반려인</span>
                    <span className="text-sm font-medium">78%</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
                    <span className="text-sm flex-1">훈련사</span>
                    <span className="text-sm font-medium">12%</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-primary/50 mr-2"></div>
                    <span className="text-sm flex-1">기관 관리자</span>
                    <span className="text-sm font-medium">8%</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-amber-500 mr-2"></div>
                    <span className="text-sm flex-1">기타</span>
                    <span className="text-sm font-medium">2%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>지역별 사용자 분포</CardTitle>
                <CardDescription>지역에 따른 사용자 분포</CardDescription>
              </CardHeader>
              <CardContent className="h-64 flex flex-col justify-center items-center">
                <div className="mb-4 h-10 w-10">
                  <PlatformActivityChart />
                </div>
                <p className="text-sm text-center text-muted-foreground">지역별 사용자 분포 차트가 표시됩니다.</p>
                <div className="mt-4 w-full space-y-2">
                  <div className="flex items-start justify-between">
                    <span className="text-sm">서울</span>
                    <div className="flex-1 mx-4">
                      <div className="h-4 bg-primary rounded" style={{ width: '75%' }}></div>
                    </div>
                    <span className="text-sm">32%</span>
                  </div>
                  <div className="flex items-start justify-between">
                    <span className="text-sm">경기</span>
                    <div className="flex-1 mx-4">
                      <div className="h-4 bg-primary rounded" style={{ width: '62%' }}></div>
                    </div>
                    <span className="text-sm">26%</span>
                  </div>
                  <div className="flex items-start justify-between">
                    <span className="text-sm">부산</span>
                    <div className="flex-1 mx-4">
                      <div className="h-4 bg-primary rounded" style={{ width: '35%' }}></div>
                    </div>
                    <span className="text-sm">15%</span>
                  </div>
                  <div className="flex items-start justify-between">
                    <span className="text-sm">기타</span>
                    <div className="flex-1 mx-4">
                      <div className="h-4 bg-primary rounded" style={{ width: '63%' }}></div>
                    </div>
                    <span className="text-sm">27%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>상세 사용자 분석</CardTitle>
              <CardDescription>
                사용자 행동 패턴과 특성에 대한 자세한 분석입니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="h-64 flex flex-col justify-center items-center">
              <Users className="h-12 w-12 mb-4 text-primary" />
              <p className="text-center text-muted-foreground">
                상세 사용자 분석 내용이 여기에 표시됩니다.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="content" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>상세 콘텐츠 분석</CardTitle>
              <CardDescription>
                콘텐츠 성과와 인기도에 대한 자세한 분석입니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="h-64 flex flex-col justify-center items-center">
              <BookOpen className="h-12 w-12 mb-4 text-primary" />
              <p className="text-center text-muted-foreground">
                상세 콘텐츠 분석 내용이 여기에 표시됩니다.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="engagement" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>상세 참여도 분석</CardTitle>
              <CardDescription>
                사용자 참여도와 활동에 대한 자세한 분석입니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="h-64 flex flex-col justify-center items-center">
              <ClipboardList className="h-12 w-12 mb-4 text-primary" />
              <p className="text-center text-muted-foreground">
                상세 참여도 분석 내용이 여기에 표시됩니다.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="revenue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>상세 수익 분석</CardTitle>
              <CardDescription>
                플랫폼 수익과 재무 성과에 대한 자세한 분석입니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="h-64 flex flex-col justify-center items-center">
              <TrendingUp className="h-12 w-12 mb-4 text-primary" />
              <p className="text-center text-muted-foreground">
                상세 수익 분석 내용이 여기에 표시됩니다.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}