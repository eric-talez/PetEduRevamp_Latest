import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Search, MessageSquare, TrendingUp, MessageCircle, Filter } from 'lucide-react';
import { CommunityPostForm } from '@/components/CommunityPostForm';
import { useQuery } from '@tanstack/react-query';
import CommunityBannerImage from '@assets/image_1758608155574.png';

export default function Community() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isPostFormOpen, setIsPostFormOpen] = useState(false);
  
  // API에서 실제 커뮤니티 게시글 데이터를 가져오기
  const { data: communityData, isLoading, error } = useQuery({
    queryKey: ['/api/community/posts'],
    queryFn: async () => {
      console.log('API에서 커뮤니티 게시글 데이터 요청');
      const response = await fetch('/api/community/posts');
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      const data = await response.json();
      console.log('API에서 받은 게시글 데이터:', data);
      return data;
    }
  });

  const posts = communityData?.posts || [];
  console.log('Community 컴포넌트 - posts:', posts);
  console.log('Community 컴포넌트 - posts 길이:', posts.length);
  
  const filteredPosts = posts.filter(post => 
    post.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    post.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
    post.author?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  console.log('Community 컴포넌트 - filteredPosts 길이:', filteredPosts.length);
  console.log('Community 컴포넌트 - filteredPosts 내용:', filteredPosts);

  // 간단한 테스트 렌더링
  if (error) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-6">커뮤니티</h1>
        <div className="bg-destructive/10 p-4 rounded-lg">
          <p className="text-destructive">에러 발생: {error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">커뮤니티</h1>

      {/* 커뮤니티 홍보 배너 */}
      <section className="community-banner bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden mb-6">
        <img 
          src={CommunityBannerImage} 
          alt="커뮤니티 - 반려동물과 함께하는 소통공간" 
          className="w-full h-auto max-h-[250px] object-cover cursor-pointer hover:scale-105 transition-transform duration-300"
          onClick={() => {
            // 게시글 작성 모달 열기
            setIsPostFormOpen(true);
          }}
          data-testid="community-banner"
        />
      </section>
      
      {/* 디버깅 정보 표시 */}
      <div className="mb-4 p-4 bg-warning/10 rounded-lg">
        <p>로딩 상태: {isLoading ? '로딩 중...' : '로딩 완료'}</p>
        <p>전체 게시글 수: {posts.length}</p>
        <p>필터링된 게시글 수: {filteredPosts.length}</p>
        <p>검색어: "{searchTerm}"</p>
        {posts.length > 0 && (
          <div className="mt-4 p-2 bg-primary/10 rounded">
            <p className="font-semibold">첫 번째 게시글:</p>
            <p>제목: {posts[0].title}</p>
            <p>작성자: {posts[0].author?.name || '익명'}</p>
          </div>
        )}
      </div>

      {/* 간단한 게시글 목록 표시 */}
      {posts.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4">게시글 목록 (간단 표시)</h2>
          <div className="space-y-4">
            {posts.map(post => (
              <div key={post.id} className="p-4 border rounded-lg bg-white">
                <h3 className="font-semibold text-lg">{post.title}</h3>
                <p className="text-gray-600">{post.author?.name || '익명'} | {post.tag}</p>
                <p className="text-sm text-gray-500 mt-2">{post.content.substring(0, 100)}...</p>
              </div>
            ))}
          </div>
        </div>
      )}
      
      <div className="mb-8">
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <div className="relative w-full md:w-1/2">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <Input 
              placeholder="커뮤니티 검색" 
              className="pl-10" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex items-center gap-1"
              onClick={() => setIsPostFormOpen(true)}
            >
              <MessageSquare className="w-4 h-4" />
              글쓰기
            </Button>
          </div>
        </div>
      </div>

      <Tabs defaultValue="recent" className="mb-8">
        <TabsList>
          <TabsTrigger value="popular">
            <TrendingUp className="w-4 h-4 mr-2" />
            인기글
          </TabsTrigger>
          <TabsTrigger value="recent">
            <MessageCircle className="w-4 h-4 mr-2" />
            최신글
          </TabsTrigger>
          <TabsTrigger value="filter">
            <Filter className="w-4 h-4 mr-2" />
            태그별
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="popular" className="mt-6">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-600">게시글을 불러오는 중...</p>
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600">등록된 게시글이 없습니다.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...filteredPosts].sort((a, b) => b.likes - a.likes).map((post) => (
                <Card key={post.id} className="p-4 hover:shadow-lg transition-shadow">
                  <CardContent className="p-0">
                    <div className="flex items-start space-x-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-primary font-medium text-sm">
                          {post.author?.name?.charAt(0) || 'U'}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-sm">{post.author?.name || '익명'}</span>
                          <span className="text-xs text-gray-500">
                            {new Date(post.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        {post.tag && (
                          <Badge variant="secondary" className="text-xs mt-1">
                            {post.tag}
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <div className="mb-3">
                      <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                        {post.title}
                      </h3>
                      <p className="text-sm text-gray-600 line-clamp-3 mb-3">
                        {post.content}
                      </p>
                      
                      {post.linkInfo && (
                        <div className="border rounded-lg p-3 bg-gray-50">
                          <div className="flex items-center space-x-3">
                            {post.linkInfo.image && (
                              <img 
                                src={post.linkInfo.image} 
                                alt="링크 이미지" 
                                className="w-16 h-16 object-cover rounded"
                              />
                            )}
                            <div className="flex-1">
                              <h4 className="font-medium text-sm text-gray-900 line-clamp-2">
                                {post.linkInfo.title}
                              </h4>
                              <p className="text-xs text-gray-500 line-clamp-2">
                                {post.linkInfo.description}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <div className="flex items-center space-x-4">
                        <span className="flex items-center gap-1">
                          <MessageSquare className="w-4 h-4" />
                          {post.comments || 0}
                        </span>
                        <span className="flex items-center gap-1">
                          <TrendingUp className="w-4 h-4" />
                          {post.likes || 0}
                        </span>
                      </div>
                      <span>조회 {post.views || 0}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="recent" className="mt-6">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-600">게시글을 불러오는 중...</p>
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600">등록된 게시글이 없습니다.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...filteredPosts].sort((a, b) => b.id - a.id).map((post) => (
                <Card key={post.id} className="p-4 hover:shadow-lg transition-shadow">
                  <CardContent className="p-0">
                    <div className="flex items-start space-x-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-primary font-medium text-sm">
                          {post.author?.name?.charAt(0) || 'U'}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-sm">{post.author?.name || '익명'}</span>
                          <span className="text-xs text-gray-500">
                            {new Date(post.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <Badge 
                          variant="default" 
                          className="text-xs mt-1"
                        >
                          {post.tag}
                        </Badge>
                      </div>
                    </div>
                    
                    <h3 className="font-semibold text-base mb-2 line-clamp-2">
                      {post.title}
                    </h3>
                    
                    <p className="text-sm text-gray-600 mb-3 line-clamp-3">
                      {post.content}
                    </p>
                    
                    {post.linkInfo && (
                      <div className="border rounded-lg p-3 mb-3 bg-gray-50">
                        <div className="flex items-start space-x-3">
                          {post.linkInfo.image && (
                            <img 
                              src={post.linkInfo.image} 
                              alt={post.linkInfo.title}
                              className="w-16 h-16 rounded object-cover flex-shrink-0"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm line-clamp-2 mb-1">
                              {post.linkInfo.title}
                            </h4>
                            <p className="text-xs text-gray-600 line-clamp-2">
                              {post.linkInfo.description}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-1">
                          <span>👍</span>
                          <span>{post.likes}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <MessageCircle className="w-4 h-4" />
                          <span>{post.comments}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="filter" className="mt-6">
          <div className="flex gap-2 mb-6">
            <Badge variant="secondary" className="cursor-pointer py-1">법률정보</Badge>
            <Badge variant="secondary" className="cursor-pointer py-1">여행정보</Badge>
            <Badge variant="secondary" className="cursor-pointer py-1">병원정보</Badge>
            <Badge variant="secondary" className="cursor-pointer py-1">훈련팁</Badge>
            <Badge variant="secondary" className="cursor-pointer py-1">기타</Badge>
          </div>
          
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-600">게시글을 불러오는 중...</p>
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600">등록된 게시글이 없습니다.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPosts.map((post) => (
                <Card key={post.id} className="p-4 hover:shadow-lg transition-shadow">
                  <CardContent className="p-0">
                    <div className="flex items-start space-x-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-primary font-medium text-sm">
                          {post.author?.name?.charAt(0) || 'U'}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-sm">{post.author?.name || '익명'}</span>
                          <span className="text-xs text-gray-500">
                            {new Date(post.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        {post.tag && (
                          <Badge variant="secondary" className="text-xs mt-1">
                            {post.tag}
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <div className="mb-3">
                      <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                        {post.title}
                      </h3>
                      <p className="text-sm text-gray-600 line-clamp-3 mb-3">
                        {post.content}
                      </p>
                      
                      {post.linkInfo && (
                        <div className="border rounded-lg p-3 bg-gray-50">
                          <div className="flex items-center space-x-3">
                            {post.linkInfo.image && (
                              <img 
                                src={post.linkInfo.image} 
                                alt="링크 이미지" 
                                className="w-16 h-16 object-cover rounded"
                              />
                            )}
                            <div className="flex-1">
                              <h4 className="font-medium text-sm text-gray-900 line-clamp-2">
                                {post.linkInfo.title}
                              </h4>
                              <p className="text-xs text-gray-500 line-clamp-2">
                                {post.linkInfo.description}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <div className="flex items-center space-x-4">
                        <span className="flex items-center gap-1">
                          <MessageSquare className="w-4 h-4" />
                          {post.comments || 0}
                        </span>
                        <span className="flex items-center gap-1">
                          <TrendingUp className="w-4 h-4" />
                          {post.likes || 0}
                        </span>
                      </div>
                      <span>조회 {post.views || 0}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="recent" className="mt-6">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-600">게시글을 불러오는 중...</p>
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600">등록된 게시글이 없습니다.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...filteredPosts].sort((a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime()).map((post) => (
                <Card key={post.id} className="p-4 hover:shadow-lg transition-shadow">
                  <CardContent className="p-0">
                    <div className="flex items-start space-x-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-primary font-medium text-sm">
                          {post.author?.name?.charAt(0) || 'U'}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-sm">{post.author?.name || '익명'}</span>
                          <Badge variant="secondary" className="text-xs">
                            {post.tag || '일반'}
                          </Badge>
                        </div>
                        <span className="text-xs text-gray-500">
                          {new Date(post.createdAt || '').toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    
                    <h3 className="font-medium text-lg mb-2 line-clamp-2">{post.title}</h3>
                    <p className="text-gray-600 text-sm mb-3 line-clamp-3">{post.content}</p>
                    
                    {post.linkInfo && (
                      <div className="mb-3 border rounded-lg p-3 bg-gray-50">
                        <div className="flex gap-3">
                          {post.linkInfo.image && (
                            <img 
                              src={post.linkInfo.image} 
                              alt={post.linkInfo.title}
                              className="w-16 h-16 object-cover rounded"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          )}
                          <div className="flex-1">
                            <h4 className="font-medium text-sm text-gray-900 line-clamp-2">
                              {post.linkInfo.title}
                            </h4>
                            <p className="text-xs text-gray-500 line-clamp-2">
                              {post.linkInfo.description}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <div className="flex items-center space-x-4">
                        <span className="flex items-center gap-1">
                          <MessageSquare className="w-4 h-4" />
                          {post.comments || 0}
                        </span>
                        <span className="flex items-center gap-1">
                          <TrendingUp className="w-4 h-4" />
                          {post.likes || 0}
                        </span>
                      </div>
                      <span>조회 {post.views || 0}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="filter" className="mt-6">
          <div className="mb-4">
            <div className="flex flex-wrap gap-2">
              {['훈련 팁', '건강 관리', '영양 정보', '행동 교정', '사회화', '그루밍', '놀이', '응급처치'].map(tag => (
                <Button key={tag} variant="outline" size="sm" className="text-sm">
                  {tag}
                </Button>
              ))}
            </div>
          </div>
          
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-600">게시글을 불러오는 중...</p>
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600">등록된 게시글이 없습니다.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPosts.map((post) => (
                <Card key={post.id} className="p-4 hover:shadow-lg transition-shadow">
                  <CardContent className="p-0">
                    <div className="flex items-start space-x-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-primary font-medium text-sm">
                          {post.author?.name?.charAt(0) || 'U'}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-sm">{post.author?.name || '익명'}</span>
                          <Badge variant="secondary" className="text-xs">
                            {post.tag || '일반'}
                          </Badge>
                        </div>
                        <span className="text-xs text-gray-500">
                          {new Date(post.createdAt || '').toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    
                    <h3 className="font-medium text-lg mb-2 line-clamp-2">{post.title}</h3>
                    <p className="text-gray-600 text-sm mb-3 line-clamp-3">{post.content}</p>
                    
                    {post.linkInfo && (
                      <div className="mb-3 border rounded-lg p-3 bg-gray-50">
                        <div className="flex gap-3">
                          {post.linkInfo.image && (
                            <img 
                              src={post.linkInfo.image} 
                              alt={post.linkInfo.title}
                              className="w-16 h-16 object-cover rounded"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          )}
                          <div className="flex-1">
                            <h4 className="font-medium text-sm text-gray-900 line-clamp-2">
                              {post.linkInfo.title}
                            </h4>
                            <p className="text-xs text-gray-500 line-clamp-2">
                              {post.linkInfo.description}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <div className="flex items-center space-x-4">
                        <span className="flex items-center gap-1">
                          <MessageSquare className="w-4 h-4" />
                          {post.comments || 0}
                        </span>
                        <span className="flex items-center gap-1">
                          <TrendingUp className="w-4 h-4" />
                          {post.likes || 0}
                        </span>
                      </div>
                      <span>조회 {post.views || 0}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
      
      <div className="mt-12">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">인기 훈련사의 꿀팁</h2>
              <Button variant="outline" size="sm">더 보기</Button>
            </div>
            
            <div className="flex flex-col space-y-4">
              <div className="flex gap-4 items-start pb-4 border-b border-gray-100 dark:border-gray-800">
                <div className="w-10 h-10 rounded-full bg-success flex items-center justify-center">
                  <span className="text-white font-medium text-sm">김</span>
                </div>
                <div>
                  <div className="flex items-center mb-1">
                    <span className="font-medium mr-2">김훈련 트레이너</span>
                    <Badge variant="success" className="text-xs">인기 훈련사</Badge>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                    강아지가 소파에 올라가는 문제를 해결하려면 일관성 있게 규칙을 지키는 것이 중요합니다. 
                    소파 근처에 강아지 전용 침대를 마련하고 칭찬과 보상으로 그곳을 사용하도록 유도하세요.
                  </p>
                  <div className="text-xs text-gray-500">어제 작성</div>
                </div>
              </div>
              
              <div className="flex gap-4 items-start">
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                  <span className="text-white font-medium text-sm">박</span>
                </div>
                <div>
                  <div className="flex items-center mb-1">
                    <span className="font-medium mr-2">박민첩 트레이너</span>
                    <Badge variant="info" className="text-xs">어질리티 전문가</Badge>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                    장난감을 이용한 10분 놀이도 좋은 운동이 됩니다. 
                    매일 규칙적인 놀이 시간을 가지면 강아지의 에너지를 발산하고 스트레스를 줄일 수 있어요.
                  </p>
                  <div className="text-xs text-gray-500">3일 전 작성</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 글쓰기 모달 */}
      <CommunityPostForm
        isOpen={isPostFormOpen}
        onOpenChange={setIsPostFormOpen}
        onPostCreated={(newPost) => {
          console.log('커뮤니티 - 새 게시글 추가됨:', newPost);
          
          // 성공 알림
          setTimeout(() => {
            alert('게시글이 성공적으로 작성되었습니다!');
          }, 100);
        }}
      />
    </div>
  );
}
