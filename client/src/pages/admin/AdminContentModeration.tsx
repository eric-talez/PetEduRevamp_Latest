import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Button 
} from '@/components/ui/button';
import { 
  Input 
} from '@/components/ui/input';
import { 
  Textarea 
} from '@/components/ui/textarea';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from '@/components/ui/select';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger 
} from '@/components/ui/dialog';
import { 
  Badge 
} from '@/components/ui/badge';
import { 
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger 
} from '@/components/ui/tabs';
import { 
  AlertTriangle,
  Shield,
  Eye,
  EyeOff,
  Trash2,
  Plus,
  Search,
  Flag,
  CheckCircle,
  XCircle,
  Edit,
  Save,
  TestTube
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface FilterKeyword {
  id: number;
  keyword: string;
  category: 'illegal' | 'hate' | 'spam';
  isRegex: boolean;
  severity: 'low' | 'medium' | 'high';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ModerationLog {
  id: number;
  postId: number;
  postTitle: string;
  userId: number;
  userName: string;
  action: 'flagged' | 'blocked' | 'approved' | 'deleted';
  reason: string;
  moderatorId?: number;
  moderatorName?: string;
  createdAt: string;
}

interface ContentCheckResult {
  flagged: boolean;
  keywords: string[];
  severity: 'low' | 'medium' | 'high';
}

interface PendingPost {
  id: number;
  title: string;
  content: string;
  authorId: number;
  authorName: string;
  flaggedKeywords: string[];
  severity: 'low' | 'medium' | 'high';
  createdAt: string;
}

const AdminContentModeration: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('keywords');
  const [newKeyword, setNewKeyword] = useState({
    keyword: '',
    category: 'illegal' as const,
    isRegex: false,
    severity: 'medium' as const
  });
  const [editingKeyword, setEditingKeyword] = useState<FilterKeyword | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // 테스트 관련 상태
  const [testTitle, setTestTitle] = useState('');
  const [testContent, setTestContent] = useState('');
  const [testResult, setTestResult] = useState<ContentCheckResult | null>(null);
  const [isTestLoading, setIsTestLoading] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);

  // 기본 키워드 세트
  const defaultKeywords = {
    illegal: [
      { keyword: '\\b(살인|자살|폭탄|총기|마약|대마|필로폰|코카인)\\b', isRegex: true, severity: 'high' },
      { keyword: '\\b(불법도박|음란물|아동포르노|도촬|몰카|리벤지포르노)\\b', isRegex: true, severity: 'high' },
      { keyword: '\\b(성매매|조건만남|해킹|크래킹|피싱|스미싱)\\b', isRegex: true, severity: 'high' },
      { keyword: '\\b(보이스피싱|대출사기|투자사기|유사수신|다단계|피라미드)\\b', isRegex: true, severity: 'high' },
      { keyword: '\\b(장기매매|위조지폐|위조상품|불법의약품|스테로이드)\\b', isRegex: true, severity: 'high' }
    ],
    hate: [
      { keyword: '\\b(패드립|가족비하|폭행|살해|협박|테러|참수|린치|구타)\\b', isRegex: true, severity: 'high' },
      { keyword: '\\b(성희롱|성추행|강간|강제추행)\\b', isRegex: true, severity: 'high' },
      { keyword: '\\b(여성비하|남성비하|장애인비하|동성애혐오|종교모독)\\b', isRegex: true, severity: 'medium' },
      { keyword: '충$|년$', isRegex: true, severity: 'medium' }
    ],
    spam: [
      { keyword: '\\b(바카라|슬롯머신|토토|스포츠베팅|카지노)\\b', isRegex: true, severity: 'medium' },
      { keyword: '\\b(100%당첨|무조건적중|고수익보장|1일100만원|투자보장)\\b', isRegex: true, severity: 'medium' },
      { keyword: 'https?://[\\w\\.-]+\\.[a-zA-Z]{2,}(?:/[\\w\\.-]*)*/?(?:\\?[\\w&=%\\.-]*)?(?:#[\\w\\.-]*)?', isRegex: true, severity: 'low' },
      { keyword: '\\b(주민등록번호|계좌번호|카드번호|CVV|OTP|비밀번호)\\b', isRegex: true, severity: 'high' }
    ]
  };

  // 필터 키워드 조회
  const { data: keywords = [], isLoading: keywordsLoading } = useQuery({
    queryKey: ['/api/admin/content-moderation/keywords'],
    queryFn: async () => {
      const response = await fetch('/api/admin/content-moderation/keywords');
      if (!response.ok) throw new Error('키워드 조회 실패');
      return response.json();
    }
  });

  // 대기 중인 게시글 조회
  const { data: pendingPosts = [], isLoading: pendingLoading } = useQuery({
    queryKey: ['/api/admin/content-moderation/pending'],
    queryFn: async () => {
      const response = await fetch('/api/admin/content-moderation/pending');
      if (!response.ok) throw new Error('대기 게시글 조회 실패');
      return response.json();
    }
  });

  // 검열 로그 조회
  const { data: moderationLogs = [], isLoading: logsLoading } = useQuery({
    queryKey: ['/api/admin/content-moderation/logs'],
    queryFn: async () => {
      const response = await fetch('/api/admin/content-moderation/logs');
      if (!response.ok) throw new Error('검열 로그 조회 실패');
      return response.json();
    }
  });

  // 키워드 추가/수정
  const keywordMutation = useMutation({
    mutationFn: async (keywordData: Partial<FilterKeyword>) => {
      const url = keywordData.id 
        ? `/api/admin/content-moderation/keywords/${keywordData.id}`
        : '/api/admin/content-moderation/keywords';
      const method = keywordData.id ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(keywordData)
      });
      if (!response.ok) throw new Error('키워드 저장 실패');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/content-moderation/keywords'] });
      setNewKeyword({ keyword: '', category: 'illegal', isRegex: false, severity: 'medium' });
      setEditingKeyword(null);
      toast({ title: '키워드가 저장되었습니다.' });
    },
    onError: () => {
      toast({ title: '키워드 저장에 실패했습니다.', variant: 'destructive' });
    }
  });

  // 키워드 삭제
  const deleteKeywordMutation = useMutation({
    mutationFn: async (keywordId: number) => {
      const response = await fetch(`/api/admin/content-moderation/keywords/${keywordId}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('키워드 삭제 실패');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/content-moderation/keywords'] });
      toast({ title: '키워드가 삭제되었습니다.' });
    }
  });

  // 게시글 승인/차단
  const moderatePostMutation = useMutation({
    mutationFn: async ({ postId, action, reason }: { postId: number; action: string; reason: string }) => {
      const response = await fetch(`/api/admin/content-moderation/moderate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, action, reason })
      });
      if (!response.ok) throw new Error('게시글 검열 실패');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/content-moderation/pending'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/content-moderation/logs'] });
      toast({ title: '게시글 검열이 완료되었습니다.' });
    }
  });

  // 기본 키워드 초기화
  const initializeDefaultKeywords = async () => {
    try {
      for (const [category, keywordList] of Object.entries(defaultKeywords)) {
        for (const keywordData of keywordList) {
          await keywordMutation.mutateAsync({
            keyword: keywordData.keyword,
            category: category as 'illegal' | 'hate' | 'spam',
            isRegex: keywordData.isRegex,
            severity: keywordData.severity as 'low' | 'medium' | 'high',
            isActive: true
          });
        }
      }
      toast({ title: '기본 키워드가 설정되었습니다.' });
    } catch (error) {
      toast({ title: '기본 키워드 설정에 실패했습니다.', variant: 'destructive' });
    }
  };

  const filteredKeywords = keywords.filter((keyword: FilterKeyword) =>
    keyword.keyword.toLowerCase().includes(searchTerm.toLowerCase()) ||
    keyword.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'illegal': return '불법·금지';
      case 'hate': return '혐오·차별';
      case 'spam': return '스팸·광고';
      default: return category;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-destructive';
      case 'medium': return 'bg-warning';
      case 'low': return 'bg-success';
      default: return 'bg-gray-500';
    }
  };

  const getSeverityBadgeColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-destructive/10 text-destructive border-destructive/30';
      case 'medium': return 'bg-warning/10 text-warning border-warning/30';
      case 'low': return 'bg-primary/10 text-primary border-primary/30';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const testContentCheck = async () => {
    setIsTestLoading(true);
    setTestError(null);
    setTestResult(null);

    try {
      const response = await fetch('/api/admin/content-moderation/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: testTitle.trim(),
          content: testContent.trim()
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setTestResult(data);
    } catch (err) {
      setTestError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setIsTestLoading(false);
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

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">콘텐츠 검열 관리</h1>
          <p className="text-gray-600 mt-2">게시글 필터링 및 검열 시스템을 관리합니다</p>
        </div>
        <Button onClick={initializeDefaultKeywords} variant="outline">
          <Shield className="w-4 h-4 mr-2" />
          기본 키워드 설정
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="keywords">필터 키워드</TabsTrigger>
          <TabsTrigger value="pending">대기 게시글</TabsTrigger>
          <TabsTrigger value="logs">검열 로그</TabsTrigger>
          <TabsTrigger value="test">테스트</TabsTrigger>
        </TabsList>

        {/* 필터 키워드 관리 */}
        <TabsContent value="keywords" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>필터 키워드 추가</CardTitle>
              <CardDescription>
                새로운 필터링 키워드를 추가합니다. 정규식을 사용하여 더 정확한 필터링이 가능합니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Input
                  placeholder="키워드 또는 정규식"
                  value={editingKeyword?.keyword || newKeyword.keyword}
                  onChange={(e) => {
                    if (editingKeyword) {
                      setEditingKeyword({ ...editingKeyword, keyword: e.target.value });
                    } else {
                      setNewKeyword({ ...newKeyword, keyword: e.target.value });
                    }
                  }}
                />
                <Select
                  value={editingKeyword?.category || newKeyword.category}
                  onValueChange={(value: string) => {
                    if (editingKeyword) {
                      setEditingKeyword({ ...editingKeyword, category: value as any });
                    } else {
                      setNewKeyword({ ...newKeyword, category: value as any });
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="illegal">불법·금지</SelectItem>
                    <SelectItem value="hate">혐오·차별</SelectItem>
                    <SelectItem value="spam">스팸·광고</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={editingKeyword?.severity || newKeyword.severity}
                  onValueChange={(value: string) => {
                    if (editingKeyword) {
                      setEditingKeyword({ ...editingKeyword, severity: value as any });
                    } else {
                      setNewKeyword({ ...newKeyword, severity: value as any });
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">낮음</SelectItem>
                    <SelectItem value="medium">보통</SelectItem>
                    <SelectItem value="high">높음</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      if (editingKeyword) {
                        keywordMutation.mutate(editingKeyword);
                      } else {
                        keywordMutation.mutate(newKeyword);
                      }
                    }}
                    disabled={!(editingKeyword?.keyword || newKeyword.keyword)}
                  >
                    {editingKeyword ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  </Button>
                  {editingKeyword && (
                    <Button variant="outline" onClick={() => setEditingKeyword(null)}>
                      취소
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>등록된 키워드</CardTitle>
                  <CardDescription>현재 활성화된 필터링 키워드 목록</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Search className="w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="키워드 검색..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-64"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {filteredKeywords.map((keyword: FilterKeyword) => (
                  <div key={keyword.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center gap-3">
                      <code className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-sm">
                        {keyword.keyword}
                      </code>
                      <Badge variant="secondary">{getCategoryLabel(keyword.category)}</Badge>
                      <div className={`w-3 h-3 rounded-full ${getSeverityColor(keyword.severity)}`} />
                      {keyword.isRegex && <Badge variant="outline">정규식</Badge>}
                      {!keyword.isActive && <Badge variant="danger">비활성</Badge>}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingKeyword(keyword)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteKeywordMutation.mutate(keyword.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 대기 중인 게시글 */}
        <TabsContent value="pending" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-warning" />
                검열 대기 게시글
              </CardTitle>
              <CardDescription>
                필터링 키워드에 걸려 검열이 필요한 게시글들입니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {pendingPosts.map((post: PendingPost) => (
                  <div key={post.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold">{post.title}</h3>
                        <p className="text-sm text-gray-600 mt-1">작성자: {post.authorName}</p>
                        <p className="text-sm text-gray-500">{new Date(post.createdAt).toLocaleString()}</p>
                      </div>
                      <div className={`w-3 h-3 rounded-full ${getSeverityColor(post.severity)}`} />
                    </div>
                    
                    <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded">
                      <p className="text-sm line-clamp-3">{post.content}</p>
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                      {post.flaggedKeywords.map((keyword, index) => (
                        <Badge key={index} variant="danger">{keyword}</Badge>
                      ))}
                    </div>
                    
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => moderatePostMutation.mutate({
                          postId: post.id,
                          action: 'approved',
                          reason: '관리자 승인'
                        })}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        승인
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => moderatePostMutation.mutate({
                          postId: post.id,
                          action: 'blocked',
                          reason: '필터링 규정 위반'
                        })}
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        차단
                      </Button>
                    </div>
                  </div>
                ))}
                
                {pendingPosts.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    검열 대기 중인 게시글이 없습니다.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 검열 로그 */}
        <TabsContent value="logs" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Flag className="w-5 h-5" />
                검열 활동 로그
              </CardTitle>
              <CardDescription>
                최근 검열 활동 내역을 확인할 수 있습니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {moderationLogs.map((log: ModerationLog) => (
                  <div key={log.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded">
                    <div className="flex-1">
                      <p className="font-medium">{log.postTitle}</p>
                      <p className="text-sm text-gray-600">
                        작성자: {log.userName} | 조치: {log.action} | 사유: {log.reason}
                      </p>
                      {log.moderatorName && (
                        <p className="text-xs text-gray-500">검열자: {log.moderatorName}</p>
                      )}
                    </div>
                    <div className="text-sm text-gray-500">
                      {new Date(log.createdAt).toLocaleString()}
                    </div>
                  </div>
                ))}
                
                {moderationLogs.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    검열 로그가 없습니다.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 콘텐츠 검열 테스트 */}
        <TabsContent value="test" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 테스트 입력 섹션 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TestTube className="w-5 h-5" />
                  콘텐츠 테스트
                </CardTitle>
                <CardDescription>
                  콘텐츠 필터링 시스템을 테스트해보세요
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">제목</label>
                  <Input
                    value={testTitle}
                    onChange={(e) => setTestTitle(e.target.value)}
                    placeholder="게시글 제목을 입력하세요"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">내용</label>
                  <Textarea
                    value={testContent}
                    onChange={(e) => setTestContent(e.target.value)}
                    placeholder="게시글 내용을 입력하세요"
                    rows={6}
                  />
                </div>

                <Button 
                  onClick={testContentCheck}
                  disabled={isTestLoading || (!testTitle.trim() && !testContent.trim())}
                  className="w-full"
                >
                  {isTestLoading ? '검사 중...' : '콘텐츠 검사'}
                </Button>

                {testError && (
                  <div className="border border-destructive/30 bg-destructive/10 p-3 rounded">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                      <span className="text-destructive text-sm">{testError}</span>
                    </div>
                  </div>
                )}

                {testResult && (
                  <div className={`border-2 p-4 rounded ${testResult.flagged ? 'border-destructive/30 bg-destructive/10' : 'border-success/30 bg-success/10'}`}>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        {testResult.flagged ? (
                          <XCircle className="w-5 h-5 text-destructive" />
                        ) : (
                          <CheckCircle className="w-5 h-5 text-success" />
                        )}
                        <span className={`font-medium ${testResult.flagged ? 'text-destructive' : 'text-success'}`}>
                          {testResult.flagged ? '부적절한 콘텐츠 감지됨' : '콘텐츠 검사 통과'}
                        </span>
                        <Badge className={getSeverityBadgeColor(testResult.severity)}>
                          {testResult.severity.toUpperCase()}
                        </Badge>
                      </div>
                      {testResult.keywords.length > 0 && (
                        <div>
                          <span className="text-sm font-medium">감지된 키워드: </span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {testResult.keywords.map((keyword, index) => (
                              <Badge key={index} variant="danger" className="text-xs">
                                {keyword}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 샘플 테스트 섹션 */}
            <Card>
              <CardHeader>
                <CardTitle>샘플 테스트</CardTitle>
                <CardDescription>
                  미리 준비된 샘플로 빠르게 테스트해보세요
                </CardDescription>
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
                          setTestTitle(sample.title);
                          setTestContent(sample.content);
                          setTestResult(null);
                          setTestError(null);
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
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminContentModeration;