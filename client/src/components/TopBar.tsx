import { QuickThemeToggle } from "@/components/ThemeSettings";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { 
  Bell, 
  Menu, 
  Search,
  MessageSquare,
  ShoppingCart,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  Package,
  CheckCircle,
  ArrowRight,
  MoreHorizontal,
  X,
  Calendar,
  ShoppingBag,
  CreditCard,
  DollarSign,
  ExternalLink
} from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { useClickAway } from "@/hooks/use-mobile";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth-compat";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";

// Debounce utility function
const debounce = (func: Function, wait: number) => {
  let timeout: NodeJS.Timeout;
  return function executedFunction(...args: any[]) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};
import { format } from "date-fns";
import { ko } from "date-fns/locale";

// 메시지 인터페이스
interface Message {
  id: string;
  sender: string;
  avatar?: string;
  content: string;
  timestamp: string;
  read: boolean;
}

// 알림 인터페이스
interface Notification {
  id: string;
  title: string;
  content: string;
  timestamp: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  link?: string;
}

// 장바구니 아이템 인터페이스
interface CartItem {
  id: number;
  name: string;
  image: string;
  price: number;
  quantity: number;
  discountRate?: number;
}

interface TopBarProps {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
}

export function TopBar({ sidebarOpen, onToggleSidebar }: TopBarProps) {
  // 통합된 인증 상태 관리
  const auth = useAuth();
  const globalAuth = (window as any).__peteduAuthState;

  // 안정적인 상태 추출 (fallback 체인)
  const isAuthenticated = auth?.isAuthenticated ?? globalAuth?.isAuthenticated ?? false;
  const userName = auth?.userName ?? globalAuth?.userName ?? null;
  const userRole = auth?.userRole ?? globalAuth?.userRole ?? null;
  const logout = auth?.logout;
  const [location, setLocation] = useLocation();
  
  // 프로필 이미지 상태
  const [userProfileImage, setUserProfileImage] = useState<string | null>(null);

  // 프로필 이미지 가져오기
  useEffect(() => {
    if (isAuthenticated) {
      fetch('/api/user/profile', { credentials: 'include' })
        .then(res => res.json())
        .then(data => {
          if (data.success && data.data?.profileImage) {
            setUserProfileImage(data.data.profileImage);
          }
        })
        .catch(err => console.error('프로필 이미지 로드 오류:', err));
    }
  }, [isAuthenticated]);

  // 검색 상태
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // 팝업 메뉴 상태
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [messagePopupOpen, setMessagePopupOpen] = useState(false);
  const [notificationPopupOpen, setNotificationPopupOpen] = useState(false);
  const [cartPopupOpen, setCartPopupOpen] = useState(false);

  // 참조 (외부 클릭 감지용)
  const userMenuRef = useClickAway<HTMLDivElement>(() => setUserMenuOpen(false));
  const messagePopupRef = useClickAway<HTMLDivElement>(() => setMessagePopupOpen(false));
  const notificationPopupRef = useClickAway<HTMLDivElement>(() => setNotificationPopupOpen(false));
  const cartPopupRef = useClickAway<HTMLDivElement>(() => setCartPopupOpen(false));

  // 샘플 메시지 데이터
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "msg1",
      sender: "김트레이너",
      avatar: "/attached_assets/KakaoTalk_Photo_2025-07-05-22-37-00 001_1751722697059.png",
      content: "안녕하세요, 다음 훈련 일정 관련해서 문의드립니다.",
      timestamp: "2024-02-15T14:30:00",
      read: false
    },
    {
      id: "msg2",
      sender: "바우멍 훈련소",
      avatar: "/attached_assets/KakaoTalk_Photo_2025-07-05-22-37-00 002_1751722697071.png",
      content: "3월 특별 그룹 클래스 신청이 시작되었습니다!",
      timestamp: "2024-02-14T09:15:00",
      read: false
    },
    {
      id: "msg3",
      sender: "박훈련사",
      avatar: "/attached_assets/KakaoTalk_Photo_2025-07-05-22-37-00 003_1751722697072.png",
      content: "몽이의 훈련 영상을 첨부했습니다. 확인 부탁드립니다.",
      timestamp: "2024-02-13T16:45:00",
      read: false
    },
    {
      id: "msg4",
      sender: "퍼피스쿨",
      content: "반려견 사회화 클래스가 내일 진행됩니다. 참석 여부 확인 부탁드립니다.",
      timestamp: "2024-02-12T13:20:00",
      read: true
    },
    {
      id: "msg5",
      sender: "고객센터",
      content: "문의하신 내용에 대한 답변이 등록되었습니다.",
      timestamp: "2024-02-10T11:05:00",
      read: true
    }
  ]);

  // 샘플 알림 데이터
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: "notif1",
      title: "수업 일정 알림",
      content: "내일 오후 3시 기초 훈련 클래스가 예정되어 있습니다.",
      timestamp: "2024-02-15T09:00:00",
      type: "info",
      read: false,
      link: "/calendar"
    },
    {
      id: "notif2",
      title: "결제 완료",
      content: "프리미엄 반려견 훈련용 클리커 구매가 완료되었습니다.",
      timestamp: "2024-02-14T15:30:00",
      type: "success",
      read: false,
      link: "/shop/orders"
    },
    {
      id: "notif3",
      title: "수강 신청 마감 임박",
      content: "관심 표시한 '반려견 행동 교정 마스터' 클래스 신청이 내일 마감됩니다.",
      timestamp: "2024-02-13T10:15:00",
      type: "warning",
      read: true,
      link: "/courses"
    },
    {
      id: "notif4",
      title: "이벤트 안내",
      content: "서울 강남 지역 반려동물 페스티벌이 이번 주말에 개최됩니다.",
      timestamp: "2024-02-12T13:45:00",
      type: "info",
      read: true,
      link: "/events"
    }
  ]);

  // 샘플 장바구니 데이터
  const [cartItems, setCartItems] = useState<CartItem[]>([
    {
      id: 1,
      name: "프리미엄 반려견 훈련용 클리커",
      image: "/attached_assets/image_1746582251297.png",
      price: 15000,
      quantity: 1
    },
    {
      id: 4,
      name: "유기농 강아지 간식 모음",
      image: "/attached_assets/KakaoTalk_Photo_2025-07-05-22-37-00 001_1751722697059.png",
      price: 28000,
      quantity: 1,
      discountRate: 10
    }
  ]);

  // 읽지 않은 메시지 수
  const unreadMessagesCount = messages.filter(msg => !msg.read).length;

  // 읽지 않은 알림 수
  const unreadNotificationsCount = notifications.filter(notif => !notif.read).length;

  // 장바구니 아이템 총 수량
  const cartItemsCount = cartItems.reduce((total, item) => total + item.quantity, 0);

  // 장바구니 총 금액
  const cartTotal = cartItems.reduce((total, item) => {
    const price = item.discountRate 
      ? item.price * (1 - item.discountRate / 100) 
      : item.price;
    return total + (price * item.quantity);
  }, 0);

  // 메시지를 읽음으로 표시
  const markMessageAsRead = (id: string) => {
    setMessages(messages.map(msg => 
      msg.id === id ? { ...msg, read: true } : msg
    ));
  };

  // 알림을 읽음으로 표시
  const markNotificationAsRead = (id: string) => {
    setNotifications(notifications.map(notif => 
      notif.id === id ? { ...notif, read: true } : notif
    ));
  };

  // 모든 메시지를 읽음으로 표시
  const markAllMessagesAsRead = () => {
    setMessages(messages.map(msg => ({ ...msg, read: true })));
  };

  // 모든 알림을 읽음으로 표시
  const markAllNotificationsAsRead = () => {
    setNotifications(notifications.map(notif => ({ ...notif, read: true })));
  };

  // 장바구니에서 아이템 제거
  const removeFromCart = (id: number) => {
    setCartItems(cartItems.filter(item => item.id !== id));
  };

  // 장바구니 아이템 수량 변경
  const updateCartItemQuantity = (id: number, quantity: number) => {
    if (quantity < 1) return;

    setCartItems(cartItems.map(item => 
      item.id === id ? { ...item, quantity } : item
    ));
  };

  // 검색 기능
  const { toast } = useToast();

  // Debounced search with error handling
  const handleSearch = useCallback(
    debounce(async (query: string) => {
      if (!query.trim()) return;

      setIsSearching(true);
      try {
        // Check if we're on the community page - if so, navigate to community with search
        if (location.startsWith('/community')) {
          // Navigate to community page with search query
          setLocation(`/community?q=${encodeURIComponent(query)}`);
          setSearchQuery('');
          setIsSearching(false);
          return;
        }

        // Navigate to search page with query for non-community pages
        setLocation(`/search?q=${encodeURIComponent(query)}`);
        setSearchQuery('');
      } catch (error) {
        console.error('Search navigation error:', error);
        toast({
          title: "검색 오류",
          description: "검색 중 오류가 발생했습니다. 다시 시도해주세요.",
          variant: "destructive"
        });
      } finally {
        setIsSearching(false);
      }
    }, 300),
    [setLocation, toast, location]
  );

  // Enhanced search with validation
  const handleSearchSubmit = () => {
    if (!searchQuery.trim()) {
      toast({
        title: "검색어를 입력해주세요",
        variant: "destructive"
      });
      return;
    }
    handleSearch(searchQuery);
  };

  // 엔터 키 처리
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearchSubmit();
    }
  };


  const handleLogout = () => {

    // 모든 로컬 스토리지 인증 관련 데이터 제거
    localStorage.removeItem('petedu_auth');
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('userData');

    // 전역 상태 초기화
    if (window.__peteduAuthState) {
      window.__peteduAuthState = {
        isAuthenticated: false,
        userRole: null,
        userName: null
      };
    }

    // 로그아웃 이벤트 발생시켜 다른 컴포넌트에 알림
    window.dispatchEvent(new CustomEvent('logout'));

    // 서버 로그아웃 API 호출 (비동기로 처리)
    fetch('/api/logout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include' // 쿠키 포함
    }).catch(err => console.error('서버 로그아웃 API 호출 실패:', err));

    // 로그아웃 후 홈페이지로 이동
    window.location.href = "/";
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-emerald-100/50 bg-gradient-to-r from-white via-emerald-50/30 to-white dark:from-gray-950 dark:via-emerald-950/20 dark:to-gray-950 backdrop-blur-lg supports-[backdrop-filter]:bg-white/80 dark:supports-[backdrop-filter]:bg-gray-950/80 shadow-sm">
      <div className="container flex h-16 items-center px-2 sm:px-4 lg:px-8">
          {/* Mobile Menu Button - 터치 최적화 */}
          <button
            type="button"
            onClick={onToggleSidebar}
            className="lg:hidden min-w-[44px] min-h-[44px] flex items-center justify-center p-2 sm:p-3 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary transition-all duration-200 active:scale-95"
            aria-label={sidebarOpen ? "사이드바 닫기" : "사이드바 열기"}
            aria-expanded={sidebarOpen}
          >
            <Menu className="h-6 w-6" aria-hidden="true" />
          </button>

          {/* Mobile Logo - 모바일에서만 표시 */}
          <Link href="/" className="lg:hidden flex items-center ml-2" data-testid="mobile-logo">
            <img 
              src="/logo-symbol-new.png" 
              alt="TALEZ" 
              className="h-9 w-9 object-contain"
            />
            <span className="ml-2 text-lg font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
              TALEZ
            </span>
          </Link>

          {/* Search */}
          <div className="hidden lg:flex flex-1 max-w-xl ml-0">
            <div className="w-full relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input 
                type="text" 
                className="block w-full pl-10 pr-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-primary focus:border-primary" 
                placeholder={location.startsWith('/community') ? "커뮤니티 검색" : "강의, 훈련사, 기관 검색"}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyPress}
              />
              {searchQuery.length > 0 && (
                <div className="absolute right-0 top-0 h-full flex items-center pr-3">
                  {isSearching ? (
                    <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full"></div>
                  ) : (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setSearchQuery('')}
                      className="h-6 w-6 p-0"
                      aria-label="검색어 지우기"
                    >
                      <X className="h-3 w-3" aria-hidden="true" />
                    </Button>
                  )}
                </div>
              )}

              {/* 검색 결과 드롭다운 */}
              {searchQuery.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-50">
                  <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      "'{searchQuery}'" 에 대한 검색
                    </div>
                  </div>
                  <div className="p-2">
                    <Link
                      href={`/search?q=${encodeURIComponent(searchQuery)}`}
                      className="flex items-center justify-between w-full p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-md transition-colors"
                      onClick={() => setSearchQuery('')}
                    >
                      <div className="flex items-center">
                        <Search className="h-4 w-4 mr-3 text-primary" />
                        <span className="font-medium">"{searchQuery}" 전체 검색</span>
                      </div>
                      <ArrowRight className="h-4 w-4 text-gray-400" />
                    </Link>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 px-3">
                      강의, 훈련사, 기관을 포함한 상세 검색 결과를 확인하세요
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action buttons - 모바일 터치 최적화 */}
          <div className="flex items-center space-x-1 sm:space-x-2 ml-auto">
            {/* 메시지, 알림, 테마 토글 그룹 */}
            <div className="flex items-center space-x-1 sm:space-x-2 border-r border-gray-200 dark:border-gray-700 pr-1 sm:pr-2 mr-1 sm:mr-2">
              {/* Messages Button & Popup - 44px 터치 타겟 */}
              <div className="relative" ref={messagePopupRef}>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="min-w-[44px] min-h-[44px] w-11 h-11"
                  onClick={() => {
                    if (isAuthenticated) {
                      setMessagePopupOpen(!messagePopupOpen);
                      setNotificationPopupOpen(false);
                      setCartPopupOpen(false);
                    } else {
                      setLocation("/auth");
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape' && messagePopupOpen) {
                      setMessagePopupOpen(false);
                    }
                  }}
                  aria-label="메시지"
                  aria-expanded={messagePopupOpen}
                  aria-controls="messages-popup"
                  aria-haspopup="menu"
                >
                  <MessageSquare className="h-5 w-5" />
                  {isAuthenticated && unreadMessagesCount > 0 && (
                    <Badge 
                      variant="danger" 
                      className="absolute -top-1 -right-1 px-1.5 py-0.5 min-w-4 h-4 flex items-center justify-center"
                    >
                      {unreadMessagesCount}
                    </Badge>
                  )}
                </Button>

                {/* Messages Popup */}
                {messagePopupOpen && isAuthenticated && (
                  <div 
                    id="messages-popup"
                    role="menu"
                    className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-gray-900 rounded-md shadow-lg py-1 z-50 border border-gray-200 dark:border-gray-700"
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        setMessagePopupOpen(false);
                        document.querySelector('[aria-controls="messages-popup"]')?.focus();
                      }
                    }}
                  >
                    <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                      <div className="flex justify-between items-center">
                        <h3 className="text-sm font-semibold">메시지</h3>
                        {unreadMessagesCount > 0 && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={markAllMessagesAsRead}
                            className="text-xs h-7 px-2"
                            aria-label="모든 메시지 읽음 표시하기"
                          >
                            모두 읽음 표시
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="max-h-80 overflow-y-auto py-1">
                      {messages.length > 0 ? (
                        messages.slice(0, 5).map((message) => (
                          <div
                            key={message.id}
                            className={`px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer ${!message.read ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                            onClick={() => {
                              markMessageAsRead(message.id);
                              setMessagePopupOpen(false);
                              setLocation("/messages");
                            }}
                          >
                            <div className="flex items-start">
                              <div className="flex-shrink-0 mr-3">
                                <Avatar className="h-8 w-8">
                                  {message.avatar && <AvatarImage src={message.avatar} />}
                                  <AvatarFallback>{message.sender.substring(0, 1)}</AvatarFallback>
                                </Avatar>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex justify-between">
                                  <p className="text-sm font-medium truncate">{message.sender}</p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {format(new Date(message.timestamp), 'M월 d일', { locale: ko })}
                                  </p>
                                </div>
                                <p className="text-sm text-gray-600 dark:text-gray-300 truncate">
                                  {message.content}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="px-4 py-6 text-center">
                          <p className="text-sm text-gray-500 dark:text-gray-400">메시지가 없습니다</p>
                        </div>
                      )}
                    </div>

                    <div className="border-t border-gray-200 dark:border-gray-700 py-2 px-4">
                      <Button 
                        variant="link" 
                        className="w-full justify-center" 
                        onClick={() => {
                          setMessagePopupOpen(false);
                          setLocation("/messages");
                        }}
                      >
                        모든 메시지 보기
                        <ChevronRight className="ml-1 h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* 통합 알림 센터 (서버 백엔드 + 카테고리 + 읽음 동기화) */}
              {isAuthenticated && <NotificationBell />}

              <QuickThemeToggle />
            </div>

            {isAuthenticated ? (
              <>
                {/* Shopping Cart Button & Popup - 44px 터치 타겟 */}
                <div className="relative" ref={cartPopupRef}>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="min-w-[44px] min-h-[44px] w-11 h-11 relative transition-all duration-200 hover:scale-110 hover:text-primary focus:ring-2 focus:ring-primary focus:ring-offset-1 dark:focus:ring-offset-gray-900"
                    onClick={() => {
                      setCartPopupOpen(!cartPopupOpen);
                      setMessagePopupOpen(false);
                      setNotificationPopupOpen(false);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape' && cartPopupOpen) {
                        setCartPopupOpen(false);
                      }
                    }}
                    aria-label="쇼핑몰 장바구니 보기"
                    aria-expanded={cartPopupOpen}
                    aria-controls="cart-popup"
                    aria-haspopup="menu"
                    tabIndex={0}
                  >
                    <ShoppingCart className={`h-5 w-5 ${cartItemsCount > 0 ? 'text-primary' : ''}`} />
                    {cartItemsCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-primary text-white rounded-full w-4 h-4 text-xs flex items-center justify-center animate-pulse">
                        {cartItemsCount}
                      </span>
                    )}
                  </Button>

                  {/* Cart Popup */}
                  {cartPopupOpen && (
                    <div 
                      id="cart-popup"
                      role="menu"
                      className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-gray-900 rounded-md shadow-lg py-1 z-50 border border-gray-200 dark:border-gray-700"
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                          setCartPopupOpen(false);
                          document.querySelector('[aria-controls="cart-popup"]')?.focus();
                        }
                      }}
                    >
                      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                        <div className="flex justify-between items-center">
                          <h3 className="text-sm font-semibold">장바구니</h3>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {cartItemsCount}개 상품
                          </span>
                        </div>
                      </div>

                      <div className="max-h-80 overflow-y-auto py-1">
                        {cartItems.length > 0 ? (
                          <div className="divide-y divide-gray-200 dark:divide-gray-700">
                            {cartItems.map((item) => (
                              <div key={item.id} className="px-4 py-3">
                                <div className="flex gap-3">
                                  <div className="flex-shrink-0 w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded overflow-hidden">
                                    <img 
                                      src={item.image} 
                                      alt={item.name} 
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                  <div className="flex-1">
                                    <div className="flex justify-between">
                                      <div>
                                        <p className="text-sm font-medium">{item.name}</p>
                                        <div className="flex items-center mt-1">
                                          <Button
                                            variant="outline"
                                            size="icon"
                                            className="h-6 w-6 rounded-full p-0"
                                            onClick={() => updateCartItemQuantity(item.id, item.quantity - 1)}
                                            disabled={item.quantity <= 1}
                                            aria-label="수량 감소"
                                          >
                                            <span className="sr-only">감소</span>
                                            <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                                              <path d="M2.5 7.5H12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                            </svg>
                                          </Button>
                                          <span className="mx-2 text-sm font-medium min-w-[20px] text-center">
                                            {item.quantity}
                                          </span>
                                          <Button
                                            variant="outline"
                                            size="icon"
                                            className="h-6 w-6 rounded-full p-0"
                                            onClick={() => updateCartItemQuantity(item.id, item.quantity + 1)}
                                            aria-label="수량 증가"
                                          >
                                            <span className="sr-only">증가</span>
                                            <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                                              <path d="M7.5 2.5V12.5M2.5 7.5H12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                            </svg>
                                          </Button>
                                        </div>
                                      </div>
                                      <div className="text-right">
                                        {item.discountRate ? (
                                          <>
                                            <p className="text-sm font-medium">
                                              {Math.round(item.price * (1 - item.discountRate / 100)).toLocaleString()}원
                                            </p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 line-through">
                                              {item.price.toLocaleString()}원
                                            </p>
                                          </>
                                        ) : (
                                          <p className="text-sm font-medium">
                                            {item.price.toLocaleString()}원
                                          </p>
                                        )}
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-6 w-6 mt-1 text-gray-500 hover:text-red-500"
                                          onClick={() => removeFromCart(item.id)}
                                        >
                                          <X className="h-4 w-4" />
                                          <span className="sr-only">삭제</span>
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="px-4 py-6 text-center">
                            <ShoppingBag className="h-8 w-8 mx-auto text-gray-400 dark:text-gray-500 mb-2" />
                            <p className="text-sm text-gray-500 dark:text-gray-400">장바구니가 비어있습니다</p>
                            <Button
                              variant="link"
                              className="mt-2"
                              onClick={() => {
                                setCartPopupOpen(false);
                                // 인증 정보를 URL 파라미터로 전달
                                let shopUrl = 'https://store.funnytalez.com/';

                                // 인증 상태 가져오기
                                const authState = window.__peteduAuthState || {
                                  isAuthenticated: isAuthenticated,
                                  userRole: userRole,
                                  userName: userName
                                };

                                // 인증된 사용자인 경우에만 정보 전달
                                if (authState.isAuthenticated && authState.userName) {
                                  const params = new URLSearchParams({
                                    auth: 'true',
                                    role: authState.userRole || 'pet-owner',
                                    name: authState.userName
                                  });
                                  shopUrl += '?' + params.toString();
                                }

                                window.open(shopUrl, '_blank', 'noopener,noreferrer');
                              }}
                            >
                              쇼핑하러 가기
                            </Button>
                          </div>
                        )}
                      </div>

                      {cartItems.length > 0 && (
                        <>
                          <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-3">
                            <div className="flex justify-between mb-2">
                              <span className="text-sm">소계</span>
                              <span className="text-sm font-medium">{cartTotal.toLocaleString()}원</span>
                            </div>
                            <Button 
                              className="w-full"
                              onClick={() => {
                                setCartPopupOpen(false);
                                // 결제 페이지로 직접 이동
                                window.location.href = window.location.origin + "/shop/checkout";
                              }}
                              aria-label="결제 진행하기"
                            >
                              결제하기
                            </Button>
                          </div>
                          <div className="border-t border-gray-200 dark:border-gray-700 py-2 px-4">
                            <Button 
                              variant="outline" 
                              className="w-full transition-all duration-200 hover:bg-primary hover:text-white group" 
                              onClick={() => {
                                setCartPopupOpen(false);
                                window.open('https://store.funnytalez.com/', '_blank', 'noopener,noreferrer');
                              }}
                            >
                              <span className="flex items-center justify-center">
                                장바구니 보기
                                <ExternalLink className="ml-1 h-3 w-3 text-blue-500 group-hover:text-white transition-all" />
                              </span>
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* User menu - 44px 터치 타겟 */}
                <div className="relative" ref={userMenuRef}>
                  <button 
                    className="min-w-[44px] min-h-[44px] flex items-center space-x-1 sm:space-x-2 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:focus:ring-offset-gray-900 rounded-md p-1"
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape' && userMenuOpen) {
                        setUserMenuOpen(false);
                      }
                    }}
                    aria-label={`사용자 메뉴 ${userMenuOpen ? '닫기' : '열기'}`}
                    aria-expanded={userMenuOpen}
                    aria-controls="user-menu"
                    aria-haspopup="menu"
                  >
                    <Avatar className="h-8 w-8 sm:h-9 sm:w-9 border-2 border-primary">
                      <AvatarImage 
                        src={userProfileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(userName || 'U')}&background=2BAA61&color=fff`} 
                        alt={userName || '사용자'} 
                      />
                      <AvatarFallback className="bg-primary text-white">{userName ? userName.substring(0, 1).toUpperCase() : "U"}</AvatarFallback>
                    </Avatar>
                    <span className="hidden sm:flex items-center space-x-1">
                      <span className="text-xs sm:text-sm font-medium">{userName}</span>
                      <ChevronDown className="h-3 w-3" />
                    </span>
                  </button>

                  {userMenuOpen && (
                    <div 
                      id="user-menu"
                      role="menu"
                      className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-900 rounded-md shadow-lg py-1 z-50 border border-gray-200 dark:border-gray-700"
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                          setUserMenuOpen(false);
                          document.querySelector('[aria-controls="user-menu"]')?.focus();
                        }
                      }}
                    >
                      <div className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700">
                        <div className="font-semibold">{userName}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {userRole === 'admin' && '시스템 관리자'}
                          {userRole === 'trainer' && '훈련사'}
                          {userRole === 'institute-admin' && '기관 관리자'}
                          {userRole === 'pet-owner' && '견주 회원'}
                          {userRole === 'user' && '일반 회원'}
                        </div>
                      </div>
                      <a 
                        href={
                          userRole === 'trainer' ? '/trainer/profile' :
                          userRole === 'institute-admin' ? '/institute/profile' :
                          '/profile'
                        } 
                        className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                        onClick={() => {
                          setUserMenuOpen(false);
                        }}
                      >
                        내 프로필
                      </a>
                      <Link href="/my-courses" className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800">
                        내 강의실
                      </Link>
                      <Link href="/my-pets" className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800">
                        내 반려견
                      </Link>
                      <a 
                        href={
                          userRole === 'trainer' ? '/trainer/settings' :
                          userRole === 'institute-admin' ? '/institute/settings' :
                          '/settings'
                        }
                        className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                        onClick={() => {
                          setUserMenuOpen(false);
                        }}
                      >
                        설정
                      </a>
                      <div className="border-t border-gray-200 dark:border-gray-700"></div>
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setUserMenuOpen(false); // 메뉴 닫기
                          handleLogout(); // 로그아웃 처리
                        }}
                        className="block w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-800 font-medium"
                      >
                        로그아웃
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2 sm:gap-3">
                <Link href="/auth">
                  <a
                    aria-label="로그인 페이지로 이동"
                    className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground min-w-[44px] min-h-[44px] h-10 px-4 sm:px-5 sm:text-base transition-all hover:scale-105 cursor-pointer"
                  >
                    로그인
                  </a>
                </Link>
                <Link href="/auth?tab=register">
                  <a
                    aria-label="회원가입 페이지로 이동"
                    className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 min-w-[44px] min-h-[44px] h-10 px-4 sm:px-6 sm:text-base transition-all hover:scale-105 shadow-md hover:shadow-lg cursor-pointer"
                  >
                    회원가입
                  </a>
                </Link>
              </div>
            )}
          </div>
        </div>
    </header>
  );
}