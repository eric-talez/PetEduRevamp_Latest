import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  RefreshCw,
  Bell,
  AlertTriangle,
  Shield,
  Database,
  Search,
  Check,
  X,
  Filter,
  MoreVertical,
  Clock,
  Eye,
  Trash2
} from 'lucide-react';
import { useLocation } from 'wouter';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose
} from '@/components/ui/dialog';

interface Notification {
  id: number;
  title: string;
  content: string;
  type: 'system' | 'security' | 'user' | 'database' | 'warning';
  status: 'unread' | 'read';
  createdAt: string;
  priority: 'low' | 'medium' | 'high';
  actions?: string[];
}

export default function AdminNotifications() {
  const { userName } = useAuth();
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filteredNotifications, setFilteredNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [filterType, setFilterType] = useState<string | null>(null);
  const [filterPriority, setFilterPriority] = useState<string | null>(null);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  
  // 알림 데이터 로드
  useEffect(() => {
    const loadNotifications = async () => {
      setIsLoading(true);
      try {
        // 실제 API 호출
        const response = await fetch('/api/admin/notifications');
        if (response.ok) {
          const data = await response.json();
          const notificationsData = data.notifications || data || [];
          setNotifications(notificationsData);
          setIsLoading(false);
          return;
        }
        
        // API가 실패하면 임시 데이터 사용
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // 임시 알림 데이터
        const mockNotifications: Notification[] = [
          {
            id: 1,
            title: '스토리지 서버 용량 경고',
            content: '스토리지 서버가 78% 사용 중입니다. 최적화 또는 확장이 필요합니다.',
            type: 'warning',
            status: 'unread',
            createdAt: '2024-05-12 14:30:22',
            priority: 'high',
            actions: ['server_optimize', 'storage_expand']
          },
          {
            id: 2,
            title: '보안 업데이트 완료',
            content: '모든 시스템에 대한 보안 패치가 성공적으로 적용되었습니다.',
            type: 'security',
            status: 'read',
            createdAt: '2024-05-11 09:15:43',
            priority: 'medium'
          },
          {
            id: 3,
            title: '데이터베이스 백업 완료',
            content: '전체 데이터베이스 백업이 성공적으로 완료되었습니다.',
            type: 'database',
            status: 'read',
            createdAt: '2024-05-10 22:45:10',
            priority: 'low'
          },
          {
            id: 4,
            title: '신규 가입자 급증',
            content: '지난 24시간 동안 가입자 수가 평소보다 150% 증가했습니다. 시스템 자원을 모니터링하세요.',
            type: 'system',
            status: 'unread',
            createdAt: '2024-05-12 08:20:15',
            priority: 'medium'
          },
          {
            id: 5,
            title: '신고 접수 알림',
            content: '새로운 신고가 5건 접수되었습니다. 확인이 필요합니다.',
            type: 'user',
            status: 'unread',
            createdAt: '2024-05-12 11:05:33',
            priority: 'high',
            actions: ['view_reports']
          }
        ];
        
        setNotifications(mockNotifications);
      } catch (error) {
        console.error('알림 데이터 로딩 오류:', error);
        toast({
          title: '데이터 로딩 오류',
          description: '알림 정보를 불러오는 중 오류가 발생했습니다.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    loadNotifications();
  }, [toast]);
  
  // 필터링된 알림 목록 업데이트
  useEffect(() => {
    let result = [...notifications];
    
    // 탭 필터링
    if (activeTab === 'unread') {
      result = result.filter(notification => notification.status === 'unread');
    } else if (activeTab === 'read') {
      result = result.filter(notification => notification.status === 'read');
    }
    
    // 검색어 필터링
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        notification => 
          notification.title.toLowerCase().includes(query) ||
          notification.content.toLowerCase().includes(query)
      );
    }
    
    // 유형 필터링
    if (filterType && filterType !== 'all') {
      result = result.filter(notification => notification.type === filterType);
    }
    
    // 우선순위 필터링
    if (filterPriority && filterPriority !== 'all') {
      result = result.filter(notification => notification.priority === filterPriority);
    }
    
    // 정렬 (최신순)
    result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    setFilteredNotifications(result);
  }, [notifications, activeTab, searchQuery, filterType, filterPriority]);
  
  // 페이지네이션 처리
  const totalPages = Math.ceil(filteredNotifications.length / itemsPerPage);
  const paginatedNotifications = filteredNotifications.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  
  // 알림 상세 보기
  const handleViewNotification = (notification: Notification) => {
    setSelectedNotification(notification);
    setShowDetailModal(true);
    
    // 읽음 처리
    if (notification.status === 'unread') {
      setNotifications(prev => prev.map(n => 
        n.id === notification.id ? { ...n, status: 'read' } : n
      ));
    }
  };
  
  // 알림 삭제
  const handleDeleteNotification = (id: number) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    toast({
      title: '알림 삭제',
      description: '알림이 삭제되었습니다.',
    });
    
    if (selectedNotification?.id === id) {
      setShowDetailModal(false);
    }
  };
  
  // 모든 알림 읽음 처리
  const handleMarkAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, status: 'read' })));
    toast({
      title: '모든 알림 읽음 처리',
      description: '모든 알림이 읽음 처리되었습니다.',
    });
  };
  
  // 알림 유형별 아이콘 및 색상
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'system':
        return <Bell className="h-5 w-5 text-blue-600 dark:text-blue-400" />;
      case 'security':
        return <Shield className="h-5 w-5 text-green-600 dark:text-green-400" />;
      case 'database':
        return <Database className="h-5 w-5 text-primary dark:text-primary" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />;
      case 'user':
        return <Bell className="h-5 w-5 text-secondary-foreground dark:text-secondary-foreground" />;
      default:
        return <Bell className="h-5 w-5 text-gray-600 dark:text-gray-400" />;
    }
  };
  
  // 알림 유형별 배지
  const getNotificationBadge = (type: string) => {
    switch (type) {
      case 'system':
        return <Badge className="bg-blue-500">시스템</Badge>;
      case 'security':
        return <Badge className="bg-green-500">보안</Badge>;
      case 'database':
        return <Badge className="bg-primary/50">데이터베이스</Badge>;
      case 'warning':
        return <Badge className="bg-amber-500">경고</Badge>;
      case 'user':
        return <Badge className="bg-secondary/100">사용자</Badge>;
      default:
        return <Badge>{type}</Badge>;
    }
  };
  
  // 우선순위별 배지
  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return <Badge variant="outline" className="border-red-500 text-red-500">높음</Badge>;
      case 'medium':
        return <Badge variant="outline" className="border-amber-500 text-amber-500">중간</Badge>;
      case 'low':
        return <Badge variant="outline" className="border-green-500 text-green-500">낮음</Badge>;
      default:
        return <Badge variant="outline">{priority}</Badge>;
    }
  };
  
  // 알림 액션 처리
  const handleNotificationAction = (action: string, notificationId: number) => {
    // 실제 구현 시 API 호출로 대체
    console.log(`알림 ${notificationId}에 대한 액션 ${action} 실행`);
    
    // 액션 종류에 따른 처리
    switch (action) {
      case 'server_optimize':
        toast({
          title: '서버 최적화',
          description: '서버 최적화 작업이 예약되었습니다.',
        });
        break;
      case 'storage_expand':
        toast({
          title: '스토리지 확장',
          description: '스토리지 확장 요청이 접수되었습니다.',
        });
        break;
      case 'view_reports':
        setLocation('/admin/reports');
        break;
      default:
        toast({
          title: '액션 실행',
          description: `${action} 액션이 실행되었습니다.`,
        });
    }
  };
  
  // 뒤로 가기
  const handleGoBack = () => {
    setLocation('/admin/dashboard');
  };
  
  // 알림 새로고침
  const handleRefresh = () => {
    setIsLoading(true);
    
    // 실제 구현 시 API 호출로 대체
    setTimeout(() => {
      setIsLoading(false);
      toast({
        title: '새로고침 완료',
        description: '알림이 업데이트되었습니다.',
      });
    }, 1000);
  };
  
  return (
    <div className="p-6 space-y-6">
      {/* 알림 상세 모달 */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent>
          {selectedNotification && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-1">
                  {getNotificationBadge(selectedNotification.type)}
                  {getPriorityBadge(selectedNotification.priority)}
                </div>
                <DialogTitle>{selectedNotification.title}</DialogTitle>
                <DialogDescription>
                  {new Date(selectedNotification.createdAt).toLocaleString()}
                </DialogDescription>
              </DialogHeader>
              
              <div className="py-4">
                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">
                  {selectedNotification.content}
                </p>
              </div>
              
              {selectedNotification.actions && selectedNotification.actions.length > 0 && (
                <div className="border-t pt-4">
                  <h4 className="text-sm font-medium mb-2">가능한 작업</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedNotification.actions.map((action) => (
                      <Button
                        key={action}
                        variant="outline"
                        size="sm"
                        onClick={() => handleNotificationAction(action, selectedNotification.id)}
                      >
                        {action === 'server_optimize' && '서버 최적화'}
                        {action === 'storage_expand' && '스토리지 확장'}
                        {action === 'view_reports' && '신고 확인'}
                        {!['server_optimize', 'storage_expand', 'view_reports'].includes(action) && action}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
              
              <DialogFooter className="flex justify-between items-center">
                <Button 
                  variant="outline" 
                  onClick={() => handleDeleteNotification(selectedNotification.id)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  알림 삭제
                </Button>
                <DialogClose asChild>
                  <Button type="button">
                    <Check className="h-4 w-4 mr-2" />
                    확인
                  </Button>
                </DialogClose>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
      
      <div className="flex justify-between items-center">
        <div className="flex items-center">
          <Button variant="ghost" size="sm" onClick={handleGoBack} className="mr-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            돌아가기
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">알림 관리</h1>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            onClick={() => setLocation('/admin/notifications/send')}
            variant="default"
            size="sm"
            data-testid="button-go-send-notification"
          >
            <Bell className="mr-2 h-4 w-4" />
            알림 발송
          </Button>
          <Button onClick={handleRefresh} variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            새로고침
          </Button>
          <Button onClick={handleMarkAllAsRead} variant="default" size="sm">
            <Check className="mr-2 h-4 w-4" />
            모두 읽음 처리
          </Button>
        </div>
      </div>
      
      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="flex justify-between items-center">
          <TabsList>
            <TabsTrigger value="all">전체</TabsTrigger>
            <TabsTrigger value="unread">읽지 않음</TabsTrigger>
            <TabsTrigger value="read">읽음</TabsTrigger>
          </TabsList>
          
          <div className="flex space-x-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="알림 검색..."
                className="pl-8 h-9 md:w-[200px] w-full"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <Select value={filterType || 'all'} onValueChange={setFilterType}>
              <SelectTrigger className="w-[130px] h-9">
                <SelectValue placeholder="알림 유형" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">모든 유형</SelectItem>
                <SelectItem value="system">시스템</SelectItem>
                <SelectItem value="security">보안</SelectItem>
                <SelectItem value="database">데이터베이스</SelectItem>
                <SelectItem value="warning">경고</SelectItem>
                <SelectItem value="user">사용자</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={filterPriority || 'all'} onValueChange={setFilterPriority}>
              <SelectTrigger className="w-[130px] h-9">
                <SelectValue placeholder="우선순위" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">모든 우선순위</SelectItem>
                <SelectItem value="high">높음</SelectItem>
                <SelectItem value="medium">중간</SelectItem>
                <SelectItem value="low">낮음</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <TabsContent value="all" className="space-y-4">
          <Card>
            <CardContent className="p-0">
              <div className="border-b">
                <div className="flex items-center p-4 text-sm font-medium text-muted-foreground">
                  <div className="w-8"></div>
                  <div className="flex-1">알림</div>
                  <div className="w-24 text-right">상태</div>
                  <div className="w-32 text-right">날짜</div>
                  <div className="w-8"></div>
                </div>
              </div>
              
              {isLoading ? (
                <div className="flex justify-center items-center p-8">
                  <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
                </div>
              ) : paginatedNotifications.length === 0 ? (
                <div className="text-center p-8 text-muted-foreground">
                  알림이 없습니다
                </div>
              ) : (
                <ul className="divide-y">
                  {paginatedNotifications.map((notification) => (
                    <li 
                      key={notification.id} 
                      className={`p-4 hover:bg-muted transition-colors ${notification.status === 'unread' ? 'bg-muted/50' : ''}`}
                    >
                      <div className="flex items-center">
                        <div className="w-8 flex-shrink-0">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className={`font-medium truncate ${notification.status === 'unread' ? 'text-foreground' : 'text-muted-foreground'}`}>
                              {notification.title}
                            </p>
                            {getNotificationBadge(notification.type)}
                            {getPriorityBadge(notification.priority)}
                          </div>
                          <p className="text-sm text-muted-foreground truncate mt-1">
                            {notification.content}
                          </p>
                        </div>
                        <div className="w-24 text-right">
                          {notification.status === 'unread' ? (
                            <Badge variant="default" className="bg-blue-500">읽지 않음</Badge>
                          ) : (
                            <Badge variant="outline">읽음</Badge>
                          )}
                        </div>
                        <div className="w-32 text-right text-sm text-muted-foreground">
                          {new Date(notification.createdAt).toLocaleString()}
                        </div>
                        <div className="w-8 flex-shrink-0">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleViewNotification(notification)}>
                                <Eye className="mr-2 h-4 w-4" />
                                상세 보기
                              </DropdownMenuItem>
                              {notification.status === 'unread' && (
                                <DropdownMenuItem onClick={() => {
                                  setNotifications(prev => prev.map(n => 
                                    n.id === notification.id ? { ...n, status: 'read' } : n
                                  ));
                                }}>
                                  <Check className="mr-2 h-4 w-4" />
                                  읽음 표시
                                </DropdownMenuItem>
                              )}
                              {notification.status === 'read' && (
                                <DropdownMenuItem onClick={() => {
                                  setNotifications(prev => prev.map(n => 
                                    n.id === notification.id ? { ...n, status: 'unread' } : n
                                  ));
                                }}>
                                  <Clock className="mr-2 h-4 w-4" />
                                  읽지 않음 표시
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => handleDeleteNotification(notification.id)}
                                className="text-red-500 focus:text-red-500"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                삭제
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              
              {/* 페이지네이션 */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center p-4 border-t">
                  <div className="flex space-x-1">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <Button
                        key={page}
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(page)}
                      >
                        {page}
                      </Button>
                    ))}
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                    >
                      <ArrowLeft className="h-4 w-4 transform rotate-180" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="unread" className="space-y-4">
          {/* 동일한 구조 반복 */}
          <Card>
            <CardContent className="p-0">
              <div className="border-b">
                <div className="flex items-center p-4 text-sm font-medium text-muted-foreground">
                  <div className="w-8"></div>
                  <div className="flex-1">알림</div>
                  <div className="w-24 text-right">상태</div>
                  <div className="w-32 text-right">날짜</div>
                  <div className="w-8"></div>
                </div>
              </div>
              
              {isLoading ? (
                <div className="flex justify-center items-center p-8">
                  <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
                </div>
              ) : paginatedNotifications.length === 0 ? (
                <div className="text-center p-8 text-muted-foreground">
                  읽지 않은 알림이 없습니다
                </div>
              ) : (
                <ul className="divide-y">
                  {paginatedNotifications.map((notification) => (
                    <li 
                      key={notification.id} 
                      className="p-4 hover:bg-muted transition-colors bg-muted/50"
                    >
                      <div className="flex items-center">
                        <div className="w-8 flex-shrink-0">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium truncate text-foreground">
                              {notification.title}
                            </p>
                            {getNotificationBadge(notification.type)}
                            {getPriorityBadge(notification.priority)}
                          </div>
                          <p className="text-sm text-muted-foreground truncate mt-1">
                            {notification.content}
                          </p>
                        </div>
                        <div className="w-24 text-right">
                          <Badge variant="default" className="bg-blue-500">읽지 않음</Badge>
                        </div>
                        <div className="w-32 text-right text-sm text-muted-foreground">
                          {new Date(notification.createdAt).toLocaleString()}
                        </div>
                        <div className="w-8 flex-shrink-0">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleViewNotification(notification)}>
                                <Eye className="mr-2 h-4 w-4" />
                                상세 보기
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => {
                                setNotifications(prev => prev.map(n => 
                                  n.id === notification.id ? { ...n, status: 'read' } : n
                                ));
                              }}>
                                <Check className="mr-2 h-4 w-4" />
                                읽음 표시
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => handleDeleteNotification(notification.id)}
                                className="text-red-500 focus:text-red-500"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                삭제
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="read" className="space-y-4">
          {/* 동일한 구조 반복 */}
          <Card>
            <CardContent className="p-0">
              <div className="border-b">
                <div className="flex items-center p-4 text-sm font-medium text-muted-foreground">
                  <div className="w-8"></div>
                  <div className="flex-1">알림</div>
                  <div className="w-24 text-right">상태</div>
                  <div className="w-32 text-right">날짜</div>
                  <div className="w-8"></div>
                </div>
              </div>
              
              {isLoading ? (
                <div className="flex justify-center items-center p-8">
                  <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
                </div>
              ) : paginatedNotifications.length === 0 ? (
                <div className="text-center p-8 text-muted-foreground">
                  읽은 알림이 없습니다
                </div>
              ) : (
                <ul className="divide-y">
                  {paginatedNotifications.map((notification) => (
                    <li 
                      key={notification.id} 
                      className="p-4 hover:bg-muted transition-colors"
                    >
                      <div className="flex items-center">
                        <div className="w-8 flex-shrink-0">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium truncate text-muted-foreground">
                              {notification.title}
                            </p>
                            {getNotificationBadge(notification.type)}
                            {getPriorityBadge(notification.priority)}
                          </div>
                          <p className="text-sm text-muted-foreground truncate mt-1">
                            {notification.content}
                          </p>
                        </div>
                        <div className="w-24 text-right">
                          <Badge variant="outline">읽음</Badge>
                        </div>
                        <div className="w-32 text-right text-sm text-muted-foreground">
                          {new Date(notification.createdAt).toLocaleString()}
                        </div>
                        <div className="w-8 flex-shrink-0">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleViewNotification(notification)}>
                                <Eye className="mr-2 h-4 w-4" />
                                상세 보기
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => {
                                setNotifications(prev => prev.map(n => 
                                  n.id === notification.id ? { ...n, status: 'unread' } : n
                                ));
                              }}>
                                <Clock className="mr-2 h-4 w-4" />
                                읽지 않음 표시
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => handleDeleteNotification(notification.id)}
                                className="text-red-500 focus:text-red-500"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                삭제
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}