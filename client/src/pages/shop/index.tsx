import React, { useEffect, useState } from 'react';
import { ShoppingBag, Search, Menu as MenuIcon, ChevronDown, Heart, User, ShoppingCart, Home, Tag, Truck, Shield, Star, RefreshCw, ArrowRight, ArrowLeft, Bell, X, Bookmark, CreditCard, Gift, Package } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/context/theme-context';
import { useLocation } from 'wouter';
import { TopBar } from '@/components/TopBar';
import { Sidebar } from '@/components/Sidebar';
import { Badge } from '@/components/ui/badge';
import PetcareBannerImage from '@assets/stock_images/eco-friendly_pet_pro_daa059e9.jpg';
import { PageBanner } from '@/components/PageBanner';

/**
 * 테일즈 샵 스타일의 쇼핑몰 메인 컴포넌트
 * - 모든 shop/* 경로 요청의 진입점 
 * - 인증 여부와 관계없이 접근 가능
 * - https://shopping.naver.com/ns/home 디자인 참고 (네이버 쇼핑)
 * - 메인 서비스의 헤더와 사이드바 사용
 */
export default function ShopIndex() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  
  // 최근 검색어
  const [recentSearches] = useState(['강아지 사료', '고양이 장난감', '반려동물 간식', '강아지 하네스']);
  
  // 인기 검색어
  const [popularSearches] = useState([
    { rank: 1, term: '강아지 영양제', change: 'up' },
    { rank: 2, term: '고양이 사료', change: 'same' },
    { rank: 3, term: '강아지 옷', change: 'down' },
    { rank: 4, term: '펫 산책용품', change: 'up' },
    { rank: 5, term: '강아지 간식', change: 'up' },
    { rank: 6, term: '고양이 화장실', change: 'down' },
    { rank: 7, term: '반려동물 장난감', change: 'up' },
    { rank: 8, term: '강아지 목줄', change: 'same' },
    { rank: 9, term: '강아지 샴푸', change: 'up' },
    { rank: 10, term: '반려동물 침대', change: 'new' }
  ]);
  
  const [categories] = useState([
    { id: 1, name: '사료', count: 120, icon: '🍖' },
    { id: 2, name: '간식', count: 85, icon: '🦴' },
    { id: 3, name: '영양제', count: 64, icon: '💊' },
    { id: 4, name: '장난감', count: 92, icon: '🎾' },
    { id: 5, name: '의류', count: 38, icon: '👕' },
    { id: 6, name: '하우스', count: 27, icon: '🏠' },
    { id: 7, name: '미용용품', count: 53, icon: '✂️' },
    { id: 8, name: '목줄/하네스', count: 45, icon: '🔄' },
    { id: 9, name: '화장실/위생', count: 32, icon: '🧹' },
    { id: 10, name: '급식기/급수기', count: 28, icon: '🍽️' },
    { id: 11, name: '이동장/캐리어', count: 21, icon: '🧳' },
    { id: 12, name: '훈련용품', count: 19, icon: '📝' },
  ]);
  
  const [sliders] = useState([
    { id: 1, title: "테일즈 초특가 핫딜", subtitle: "펫케어 특가 모음전 - 한정 수량, 지금만 이 가격", imageUrl: "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=800&h=400&fit=crop" },
    { id: 2, title: "프리미엄 사료 할인전", subtitle: "건강한 영양을 위한 최고급 사료 모음", imageUrl: "https://images.unsplash.com/photo-1568640347023-a616a30bc3bd?w=800&h=400&fit=crop" },
    { id: 3, title: "펫 장난감 특별기획전", subtitle: "활동성 높은 반려동물을 위한 다양한 장난감", imageUrl: "https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=800&h=400&fit=crop" }
  ]);
  
  const [popularProducts] = useState([
    { id: 1, name: '프리미엄 닭고기 사료 대용량', price: 45000, discountRate: 10, imageUrl: 'https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=400&h=400&fit=crop', brand: '네이처스', rating: 4.8, reviews: 256, isFreeShipping: true, isNew: false, targetInfo: { petTypes: ['강아지'], breeds: ['전 품종'], sizes: ['소형', '중형', '대형'], weightRange: '1~40kg' } },
    { id: 2, name: '강아지 덴탈 껌 10개입', price: 12000, discountRate: 0, imageUrl: 'https://images.unsplash.com/photo-1582798244325-e6c375efdddc?w=400&h=400&fit=crop', brand: '펫투데이', rating: 4.5, reviews: 189, isFreeShipping: true, isNew: true, targetInfo: { petTypes: ['강아지'], breeds: ['말티즈', '푸들', '포메라니안'], sizes: ['소형'], weightRange: '1~10kg' } },
    { id: 3, name: '반려견 종합 영양제 120정', price: 35000, discountRate: 15, imageUrl: 'https://images.unsplash.com/photo-1585664811087-47f65abbad64?w=400&h=400&fit=crop', brand: '헬시펫', rating: 4.9, reviews: 312, isFreeShipping: true, isNew: false, targetInfo: { petTypes: ['강아지'], breeds: ['전 품종'], sizes: ['소형', '중형', '대형'], weightRange: '2kg 이상' } },
    { id: 4, name: '인터랙티브 노즈워크 장난감', price: 25000, discountRate: 0, imageUrl: 'https://images.unsplash.com/photo-1535294435445-d7249524ef2e?w=400&h=400&fit=crop', brand: '퍼피플레이', rating: 4.7, reviews: 124, isFreeShipping: false, isNew: false, targetInfo: { petTypes: ['강아지', '고양이'], breeds: ['전 품종'], sizes: ['소형', '중형', '대형'] } },
  ]);
  
  const [trendingProducts] = useState([
    { id: 5, name: '반려견 패딩조끼 겨울용', price: 28000, discountRate: 5, imageUrl: 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=400&h=400&fit=crop', brand: '펫라이프', rating: 4.6, reviews: 95, isFreeShipping: true, isNew: true, targetInfo: { petTypes: ['강아지'], breeds: ['말티즈', '치와와', '요크셔테리어'], sizes: ['소형'], weightRange: '1~5kg' } },
    { id: 6, name: '프리미엄 방석형 하우스 중형', price: 42000, discountRate: 20, imageUrl: 'https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?w=400&h=400&fit=crop', brand: '코지홈', rating: 4.4, reviews: 78, isFreeShipping: true, isNew: false, targetInfo: { petTypes: ['강아지', '고양이'], breeds: ['전 품종'], sizes: ['중형'], weightRange: '5~15kg' } },
    { id: 7, name: '안전 하네스 산책용 (M사이즈)', price: 18000, discountRate: 0, imageUrl: 'https://images.unsplash.com/photo-1601758124096-1fd661873b95?w=400&h=400&fit=crop', brand: '세이프티', rating: 4.8, reviews: 156, isFreeShipping: false, isNew: false, targetInfo: { petTypes: ['강아지'], breeds: ['비글', '코기', '진돗개'], sizes: ['중형'], weightRange: '10~20kg' } },
    { id: 8, name: '저자극 반려견 샴푸 500ml', price: 15000, discountRate: 10, imageUrl: 'https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?w=400&h=400&fit=crop', brand: '퓨어펫', rating: 4.7, reviews: 203, isFreeShipping: true, isNew: true, targetInfo: { petTypes: ['강아지'], breeds: ['전 품종'], sizes: ['소형', '중형'], weightRange: '전 체중' } }
  ]);
  
  // 네이버 쇼핑 인기 기획전
  const [shoppingEvents] = useState([
    { id: 1, title: '여름맞이 반려동물 용품', discount: '최대 40%', imageUrl: 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=600&h=300&fit=crop' },
    { id: 2, title: '프리미엄 사료 모음전', discount: '~30%', imageUrl: 'https://images.unsplash.com/photo-1601758003122-53c40e686a19?w=600&h=300&fit=crop' },
    { id: 3, title: '신상 애견의류 특가', discount: '~25%', imageUrl: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=600&h=300&fit=crop' },
  ]);
  
  // 최근 본 상품 (예시)
  const [recentlyViewed] = useState([
    { id: 101, name: '고양이 캣타워', price: 89000, imageUrl: 'https://images.unsplash.com/photo-1574158622682-e40e69881006?w=400&h=400&fit=crop' },
    { id: 102, name: '강아지 자동급식기', price: 35000, imageUrl: 'https://images.unsplash.com/photo-1601758124277-f0086d5ab253?w=400&h=400&fit=crop' },
  ]);
  
  // 슬라이더 관련 상태 및 함수
  const [currentSlide, setCurrentSlide] = useState(0);
  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % sliders.length);
  };
  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + sliders.length) % sliders.length);
  };
  
  // 자동 슬라이드 기능
  useEffect(() => {
    const interval = setInterval(() => {
      nextSlide();
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);
  
  const { theme } = useTheme();
  
  // 사이드바 상태 관리
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // 장바구니 상태
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [cartItemsCount, setCartItemsCount] = useState(0);
  
  // 위시리스트 상태
  const [wishlist, setWishlist] = useState<number[]>([]);
  
  // 인증 상태 로드
  const [authState, setAuthState] = useState({
    isAuthenticated: false,
    userRole: null as string | null,
    userName: null as string | null
  });
  
  // 컴포넌트 마운트 시 window 객체에서 인증 상태 로드
  useEffect(() => {
    const windowAuth = window.__peteduAuthState;
    if (windowAuth) {
      setAuthState({
        isAuthenticated: windowAuth.isAuthenticated || false,
        userRole: windowAuth.userRole || null,
        userName: windowAuth.userName || null
      });
    }
    
    // 로컬 스토리지에서 장바구니 정보 로드 (있다면)
    try {
      const storedCart = localStorage.getItem('petedu_cart');
      if (storedCart) {
        const parsedCart = JSON.parse(storedCart);
        setCartItems(Array.isArray(parsedCart) ? parsedCart : []);
        setCartItemsCount(Array.isArray(parsedCart) ? parsedCart.length : 0);
      }
      
      // 로컬 스토리지에서 위시리스트 정보 로드
      const storedWishlist = localStorage.getItem('petedu_wishlist');
      if (storedWishlist) {
        const parsedWishlist = JSON.parse(storedWishlist);
        setWishlist(Array.isArray(parsedWishlist) ? parsedWishlist : []);
      }
    } catch (error) {
      console.error('스토리지 데이터 로드 오류:', error);
    }
  }, []);
  
  useEffect(() => {
    console.log("shop/index.tsx가 로드됨:", new Date().toISOString());
    document.title = "테일즈 서비스 쇼핑 - 반려동물 용품 전문몰";
  }, []);
  
  // 장바구니에 상품 추가 함수
  const addToCart = (product: any) => {
    const existingItem = cartItems.find(item => item.id === product.id);
    
    let updatedCart;
    if (existingItem) {
      // 이미 존재하는 상품이면 수량만 증가
      updatedCart = cartItems.map(item => 
        item.id === product.id ? { ...item, quantity: (item.quantity || 1) + 1 } : item
      );
    } else {
      // 새 상품이면 추가
      updatedCart = [...cartItems, { ...product, quantity: 1 }];
    }
    
    setCartItems(updatedCart);
    setCartItemsCount(updatedCart.length);
    
    // 로컬 스토리지에 저장
    localStorage.setItem('petedu_cart', JSON.stringify(updatedCart));
    
    // 실제 앱에서는 API 호출로 서버에 저장하는 코드가 여기에 들어갈 수 있음
  };
  
  // 위시리스트에 상품 추가/제거 함수
  const toggleWishlist = (productId: number) => {
    let updatedWishlist;
    
    if (wishlist.includes(productId)) {
      // 이미 있으면 제거
      updatedWishlist = wishlist.filter(id => id !== productId);
    } else {
      // 없으면 추가
      updatedWishlist = [...wishlist, productId];
    }
    
    setWishlist(updatedWishlist);
    
    // 로컬 스토리지에 저장
    localStorage.setItem('petedu_wishlist', JSON.stringify(updatedWishlist));
  };
  
  // 네이버 쇼핑 스타일 검색바 핸들링
  const handleSearchFocus = () => {
    setShowSearchSuggestions(true);
  };
  
  const handleSearchBlur = () => {
    // 딜레이를 줘서 클릭 이벤트가 처리될 수 있게 함
    setTimeout(() => {
      setShowSearchSuggestions(false);
    }, 200);
  };
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // 검색 쿼리와 함께 검색 결과 페이지로 이동
      setLocation(`/shop/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setShowSearchSuggestions(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* TopBar와 Sidebar는 AppLayout에서 제공되므로 여기서는 중복 렌더링하지 않음 */}
      
      <PageBanner
        imageSrc={PetcareBannerImage}
        imageAlt="반려동물 용품 쇼핑"
        title="반려동물을 위한 모든 것"
        description="건강하고 행복한 반려동물을 위한 프리미엄 용품과 특가 상품을 만나보세요"
        onBannerClick={() => {
          setLocation('/shop/special-deals');
        }}
      />
      
      <div className=""> {/* TopBar 패딩 제거 (AppLayout에서 제공) */}
        {/* FunnyTalez 스타일 검색바 */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 py-3">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between">
              {/* 쇼핑몰 로고 영역 */}
              <div className="mr-4">
                <a href="/shop" className="flex items-center" onClick={(e) => {
                  e.preventDefault();
                  setLocation('/shop');
                }}>
                  <h1 className="text-2xl font-bold text-[#03c75a]">테일즈 쇼핑</h1>
                </a>
              </div>
              
              {/* 검색 영역 */}
              <div className="flex items-center w-full max-w-xl relative">
                <form onSubmit={handleSearch} className="flex w-full relative">
                  <div className="relative flex-1">
                    <Input
                      className="pr-10 rounded-full border-[#03c75a] focus-visible:ring-[#03c75a] h-12 text-base pl-5"
                      placeholder="반려동물 용품을 검색해보세요"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onFocus={handleSearchFocus}
                      onBlur={handleSearchBlur}
                    />
                    <button 
                      type="submit" 
                      className="absolute right-0 top-0 h-full px-4 bg-[#03c75a] hover:bg-[#02b04a] text-white rounded-r-full flex items-center justify-center"
                    >
                      <Search className="h-5 w-5" />
                    </button>
                  </div>
                </form>
                
                {/* 검색어 자동완성/최근 검색어 */}
                {showSearchSuggestions && (
                  <div className="absolute top-full left-0 w-full mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-20">
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-bold">최근 검색어</h3>
                        <button className="text-xs text-gray-500 hover:text-gray-700">
                          전체 삭제
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2 mb-4">
                        {recentSearches.map((term, idx) => (
                          <div key={idx} className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-full px-3 py-1 text-sm">
                            <span className="mr-1">{term}</span>
                            <button className="text-gray-500 hover:text-gray-700">
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                      
                      <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                        <h3 className="text-sm font-bold mb-2">인기 검색어</h3>
                        <div className="grid grid-cols-2 gap-2">
                          {popularSearches.slice(0, 10).map((item) => (
                            <div 
                              key={item.rank} 
                              className="flex items-center group cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 p-1 rounded"
                              onClick={() => {
                                setSearchQuery(item.term);
                                handleSearch(new Event('submit') as any);
                              }}
                            >
                              <span className={`w-5 text-sm font-bold ${item.rank <= 3 ? 'text-[#03c75a]' : 'text-gray-500'}`}>
                                {item.rank}
                              </span>
                              <span className="text-sm flex-1 truncate group-hover:text-[#03c75a]">
                                {item.term}
                              </span>
                              <span className={`text-xs ${item.change === 'up' ? 'text-red-500' : 
                                item.change === 'down' ? 'text-blue-500' : 
                                item.change === 'new' ? 'text-[#03c75a] font-bold' : 'text-gray-400'}`}>
                                {item.change === 'up' ? '↑' : 
                                  item.change === 'down' ? '↓' : 
                                  item.change === 'new' ? 'NEW' : '-'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              {/* 네이버 쇼핑 스타일 우측 아이콘 */}
              <div className="flex items-center space-x-4 ml-6">
                <button className="text-gray-600 dark:text-gray-300 hover:text-[#03c75a] flex flex-col items-center">
                  <Bell className="h-5 w-5" />
                  <span className="text-xs mt-1">알림</span>
                </button>
                <button 
                  className="text-gray-600 dark:text-gray-300 hover:text-[#03c75a] flex flex-col items-center relative"
                  onClick={() => setLocation('/shop/wishlist')}
                >
                  <Heart className="h-5 w-5" />
                  <span className="text-xs mt-1">찜</span>
                  {wishlist.length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                      {wishlist.length}
                    </span>
                  )}
                </button>
                <button 
                  className="text-gray-600 dark:text-gray-300 hover:text-[#03c75a] flex flex-col items-center relative"
                  onClick={() => setLocation('/shop/cart')}
                >
                  <ShoppingCart className="h-5 w-5" />
                  <span className="text-xs mt-1">장바구니</span>
                  {cartItemsCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                      {cartItemsCount}
                    </span>
                  )}
                </button>
                <button 
                  className="text-gray-600 dark:text-gray-300 hover:text-[#03c75a] flex flex-col items-center"
                  onClick={() => authState.isAuthenticated ? setLocation('/my-page') : setLocation('/auth')}
                >
                  <User className="h-5 w-5" />
                  <span className="text-xs mt-1">MY</span>
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* 카테고리 내비게이션 바 - FunnyTalez 스타일 */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="container mx-auto px-4">
            <div className="flex justify-between items-center py-3">
              {/* 주요 카테고리 내비게이션 */}
              <div className="flex items-center space-x-6 overflow-x-auto no-scrollbar">
                <a 
                  href="#" 
                  className="text-sm font-bold text-[#03c75a] border-b-2 border-[#03c75a] pb-2 flex items-center whitespace-nowrap"
                  onClick={(e) => {
                    e.preventDefault();
                    setLocation('/shop');
                  }}
                >
                  <Home className="h-4 w-4 mr-1" />
                  홈
                </a>
                
                {categories.slice(0, 6).map((category) => (
                  <a 
                    key={category.id}
                    href={`/shop/category/${category.id}`}
                    className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-[#03c75a] whitespace-nowrap pb-2 border-b-2 border-transparent hover:border-[#03c75a] transition-colors"
                    onClick={(e) => {
                      e.preventDefault();
                      setLocation(`/shop/category/${category.id}`);
                    }}
                  >
                    {category.name}
                  </a>
                ))}
              </div>
              
              {/* 카테고리 드롭다운 */}
              <div className="relative group">
                <button 
                  className="flex items-center text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-[#03c75a] whitespace-nowrap"
                >
                  전체 카테고리
                  <ChevronDown className="h-4 w-4 ml-1" />
                </button>
                
                <div className="absolute hidden group-hover:block right-0 mt-2 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-20">
                  <div className="grid grid-cols-1 gap-0">
                    {categories.map((category) => (
                      <a 
                        key={category.id}
                        href={`/shop/category/${category.id}`}
                        className="flex items-center p-3 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-[#03c75a]"
                        onClick={(e) => {
                          e.preventDefault();
                          setLocation(`/shop/category/${category.id}`);
                        }}
                      >
                        <span className="text-xl mr-2">{category.icon}</span>
                        <span>{category.name}</span>
                        <span className="ml-auto text-xs text-gray-400">({category.count})</span>
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* 메인 슬라이더 배너 - 네이버 쇼핑 스타일 */}
        <section className="banner-section bg-white dark:bg-gray-800 py-6">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* 메인 배너 (3/4 너비) */}
              <div className="md:col-span-3 relative rounded-md overflow-hidden">
                {sliders.map((slider, index) => (
                  <div 
                    key={slider.id} 
                    className={`transition-all duration-500 ease-in-out ${index === currentSlide ? 'opacity-100' : 'opacity-0 absolute inset-0'}`}
                  >
                    <div className="relative h-[200px] sm:h-[280px] md:h-[350px] rounded-md overflow-hidden">
                      <img 
                        src={slider.imageUrl} 
                        alt={slider.title} 
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-r from-black/40 to-transparent flex items-center">
                        <div className="text-white max-w-lg ml-12">
                          <h2 className="text-xl md:text-3xl font-bold mb-2 md:mb-3">{slider.title}</h2>
                          <p className="text-sm md:text-lg mb-4 md:mb-6">{slider.subtitle}</p>
                          <Button 
                            className="bg-[#03c75a] hover:bg-[#02b04a] text-white rounded-full px-6"
                            onClick={(e) => {
                              e.preventDefault();
                              const categoryMap: { [key: number]: string } = {
                                0: '사료',
                                1: '사료',
                                2: '장난감'
                              };
                              const category = categoryMap[currentSlide] || '전체';
                              setSearchQuery(category);
                            }}
                          >
                            더 알아보기
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* 슬라이더 컨트롤 */}
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white border-none rounded-full z-10"
                  onClick={prevSlide}
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white border-none rounded-full z-10"
                  onClick={nextSlide}
                >
                  <ArrowRight className="h-5 w-5" />
                </Button>
                
                {/* 슬라이더 인디케이터 */}
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
                  {sliders.map((_, index) => (
                    <button
                      key={index}
                      className={`w-2.5 h-2.5 rounded-full ${index === currentSlide ? 'bg-[#03c75a]' : 'bg-gray-300'}`}
                      onClick={() => setCurrentSlide(index)}
                    ></button>
                  ))}
                </div>
              </div>
              
              {/* 우측 콘텐츠 영역 (1/4 너비) - 네이버 쇼핑 스타일 */}
              <div className="hidden md:block md:col-span-1">
                {/* 미니 프로필 영역 */}
                <div className="bg-gray-50 dark:bg-gray-800 rounded-md p-4 mb-4 border border-gray-200 dark:border-gray-700">
                  {authState.isAuthenticated ? (
                    <div>
                      <div className="flex items-center mb-3">
                        <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center mr-3">
                          <User className="h-5 w-5 text-gray-500" />
                        </div>
                        <div>
                          <p className="font-medium">{authState.userName}님</p>
                          <p className="text-xs text-gray-500">반갑습니다!</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <a 
                          href="#" 
                          className="flex flex-col items-center p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                          onClick={(e) => {
                            e.preventDefault();
                            setLocation('/shop/orders');
                          }}
                        >
                          <Package className="h-4 w-4 mb-1" />
                          <span className="text-xs">주문배송</span>
                        </a>
                        <a 
                          href="#" 
                          className="flex flex-col items-center p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                          onClick={(e) => {
                            e.preventDefault();
                            setLocation('/shop/wishlist');
                          }}
                        >
                          <Heart className="h-4 w-4 mb-1" />
                          <span className="text-xs">찜</span>
                        </a>
                        <a 
                          href="#" 
                          className="flex flex-col items-center p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                          onClick={(e) => {
                            e.preventDefault();
                            setLocation('/shop/coupons');
                          }}
                        >
                          <Gift className="h-4 w-4 mb-1" />
                          <span className="text-xs">쿠폰</span>
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">로그인하고 다양한 혜택을 받아보세요!</p>
                      <Button 
                        className="w-full bg-[#03c75a] hover:bg-[#02b04a] text-white"
                        onClick={() => setLocation('/auth')}
                      >
                        로그인 / 회원가입
                      </Button>
                    </div>
                  )}
                </div>
                
                {/* 최근 본 상품 */}
                <div className="bg-white dark:bg-gray-800 rounded-md p-4 border border-gray-200 dark:border-gray-700">
                  <h3 className="text-sm font-medium mb-3">최근 본 상품</h3>
                  {recentlyViewed.length > 0 ? (
                    <div className="space-y-3">
                      {recentlyViewed.map((product) => (
                        <div key={product.id} className="flex items-center">
                          <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded overflow-hidden mr-3">
                            <img 
                              src={product.imageUrl} 
                              alt={product.name} 
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs truncate">{product.name}</p>
                            <p className="text-xs font-medium">{product.price.toLocaleString()}원</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500">최근 본 상품이 없습니다.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
        
        
        {/* 카테고리 아이콘 내비게이션 */}
        <section className="category-section bg-white dark:bg-gray-800 py-8">
          <div className="container mx-auto px-4">
            <h2 className="text-xl font-bold mb-6 flex items-center">
              <Tag className="h-5 w-5 text-[#03c75a] mr-2" />
              인기 카테고리
            </h2>
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-12 gap-4">
              {categories.map((category) => (
                <a 
                  key={category.id}
                  href={`/shop/category/${category.id}`}
                  className="flex flex-col items-center hover:text-[#03c75a] transition-colors"
                  onClick={(e) => {
                    e.preventDefault();
                    setLocation(`/shop/category/${category.id}`);
                  }}
                >
                  <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-2 text-2xl">
                    {category.icon}
                  </div>
                  <span className="text-xs text-center">{category.name}</span>
                </a>
              ))}
            </div>
          </div>
        </section>
        
        {/* 쇼핑 기획전 - 네이버 쇼핑 스타일 */}
        <section className="bg-gray-50 dark:bg-gray-900 py-8">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold flex items-center">
                <Bookmark className="h-5 w-5 text-[#03c75a] mr-2" />
                인기 기획전
              </h2>
              <a href="#" className="text-sm text-[#03c75a] hover:underline flex items-center">
                더보기 <ChevronDown className="h-4 w-4 ml-1 transform rotate-270" />
              </a>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {shoppingEvents.map((event) => (
                <div 
                  key={event.id} 
                  className="relative rounded-md overflow-hidden shadow-sm cursor-pointer group"
                >
                  <div className="aspect-w-16 aspect-h-9">
                    <img 
                      src={event.imageUrl} 
                      alt={event.title} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex flex-col justify-end p-4 text-white">
                    <h3 className="font-bold text-lg mb-1">{event.title}</h3>
                    <p className="text-sm">할인율: {event.discount}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
        
        {/* 오늘의 특가 섹션 */}
        <section className="product-section bg-white dark:bg-gray-800 py-8 border-t border-gray-100 dark:border-gray-700">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold flex items-center">
                <RefreshCw className="h-5 w-5 text-[#03c75a] mr-2" />
                오늘의 특가
              </h2>
              <a href="#" className="text-sm text-[#03c75a] hover:underline flex items-center">
                더보기 <ChevronDown className="h-4 w-4 ml-1 transform rotate-270" />
              </a>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {popularProducts.map((product) => (
                <div 
                  key={product.id} 
                  className="bg-white dark:bg-gray-800 rounded-md overflow-hidden shadow-sm hover:shadow-md transition-shadow border border-gray-200 dark:border-gray-700 group"
                >
                  <div className="relative pb-[100%] overflow-hidden">
                    <img 
                      src={product.imageUrl} 
                      alt={product.name} 
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <button 
                      className="absolute top-3 right-3 bg-white dark:bg-gray-800 rounded-full w-8 h-8 flex items-center justify-center shadow-md"
                      onClick={() => toggleWishlist(product.id)}
                    >
                      <Heart 
                        className={`h-4 w-4 ${wishlist.includes(product.id) ? 'fill-red-500 text-red-500' : 'text-gray-400 hover:text-red-500'}`} 
                      />
                    </button>
                    
                    {/* 배지 영역 */}
                    <div className="absolute top-3 left-3 flex flex-col gap-1">
                      {product.discountRate > 0 && (
                        <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">
                          {product.discountRate}% 할인
                        </span>
                      )}
                      {product.isNew && (
                        <span className="bg-[#03c75a] text-white text-xs font-bold px-2 py-1 rounded">
                          신상품
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="p-4">
                    <div className="text-xs text-[#03c75a] font-medium mb-1">{product.brand}</div>
                    <h3 className="font-medium text-sm mb-2 line-clamp-2 h-10 group-hover:text-[#03c75a]">{product.name}</h3>
                    
                    <div className="mb-2">
                      <div className="flex items-center">
                        {product.discountRate > 0 && (
                          <span className="text-red-500 text-sm font-bold mr-2">{product.discountRate}%</span>
                        )}
                        <span className="text-lg font-bold">{(product.price * (1 - product.discountRate/100)).toLocaleString()}원</span>
                      </div>
                      {product.discountRate > 0 && (
                        <span className="text-gray-400 text-sm line-through">{product.price.toLocaleString()}원</span>
                      )}
                    </div>
                    
                    <div className="flex items-center text-sm text-gray-500 mb-2">
                      <div className="flex items-center">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        <span className="ml-1 text-xs">{product.rating}</span>
                      </div>
                      <span className="mx-1">·</span>
                      <span className="text-xs">리뷰 {product.reviews}</span>
                    </div>
                    
                    {product.isFreeShipping && (
                      <div className="flex items-center mt-2 text-xs text-gray-500">
                        <Truck className="h-3 w-3 mr-1" />
                        <span>무료배송</span>
                      </div>
                    )}
                    
                    {/* 타겟 정보 표시 */}
                    {product.targetInfo && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {product.targetInfo.petTypes?.map((pet: string, idx: number) => (
                          <span key={idx} className="bg-green-50 text-green-700 text-[10px] px-1.5 py-0.5 rounded border border-green-200">
                            {pet}
                          </span>
                        ))}
                        {product.targetInfo.sizes?.slice(0, 2).map((size: string, idx: number) => (
                          <span key={idx} className="bg-blue-50 text-blue-700 text-[10px] px-1.5 py-0.5 rounded border border-blue-200">
                            {size}
                          </span>
                        ))}
                        {product.targetInfo.weightRange && (
                          <span className="bg-primary/5 text-primary text-[10px] px-1.5 py-0.5 rounded border border-primary/30">
                            {product.targetInfo.weightRange}
                          </span>
                        )}
                      </div>
                    )}
                    
                    <Button 
                      className="w-full mt-3 bg-[#03c75a] hover:bg-[#02b04a] text-white"
                      size="sm"
                      onClick={() => addToCart(product)}
                    >
                      장바구니 담기
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
        
        {/* 인기 상품 섹션 */}
        <section className="product-section bg-gray-50 dark:bg-gray-900 py-8">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold flex items-center">
                <Star className="h-5 w-5 text-[#03c75a] mr-2" />
                인기 상품
              </h2>
              <a href="#" className="text-sm text-[#03c75a] hover:underline flex items-center">
                더보기 <ChevronDown className="h-4 w-4 ml-1 transform rotate-270" />
              </a>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {trendingProducts.map((product) => (
                <div 
                  key={product.id} 
                  className="bg-white dark:bg-gray-800 rounded-md overflow-hidden shadow-sm hover:shadow-md transition-shadow border border-gray-200 dark:border-gray-700 group"
                >
                  <div className="relative pb-[100%] overflow-hidden">
                    <img 
                      src={product.imageUrl} 
                      alt={product.name} 
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <button 
                      className="absolute top-3 right-3 bg-white dark:bg-gray-800 rounded-full w-8 h-8 flex items-center justify-center shadow-md"
                      onClick={() => toggleWishlist(product.id)}
                    >
                      <Heart 
                        className={`h-4 w-4 ${wishlist.includes(product.id) ? 'fill-red-500 text-red-500' : 'text-gray-400 hover:text-red-500'}`} 
                      />
                    </button>
                    
                    {/* 배지 영역 */}
                    <div className="absolute top-3 left-3 flex flex-col gap-1">
                      {product.discountRate > 0 && (
                        <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">
                          {product.discountRate}% 할인
                        </span>
                      )}
                      {product.isNew && (
                        <span className="bg-[#03c75a] text-white text-xs font-bold px-2 py-1 rounded">
                          신상품
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="p-4">
                    <div className="text-xs text-[#03c75a] font-medium mb-1">{product.brand}</div>
                    <h3 className="font-medium text-sm mb-2 line-clamp-2 h-10 group-hover:text-[#03c75a]">{product.name}</h3>
                    
                    <div className="mb-2">
                      <div className="flex items-center">
                        {product.discountRate > 0 && (
                          <span className="text-red-500 text-sm font-bold mr-2">{product.discountRate}%</span>
                        )}
                        <span className="text-lg font-bold">{(product.price * (1 - product.discountRate/100)).toLocaleString()}원</span>
                      </div>
                      {product.discountRate > 0 && (
                        <span className="text-gray-400 text-sm line-through">{product.price.toLocaleString()}원</span>
                      )}
                    </div>
                    
                    <div className="flex items-center text-sm text-gray-500 mb-2">
                      <div className="flex items-center">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        <span className="ml-1 text-xs">{product.rating}</span>
                      </div>
                      <span className="mx-1">·</span>
                      <span className="text-xs">리뷰 {product.reviews}</span>
                    </div>
                    
                    {product.isFreeShipping && (
                      <div className="flex items-center mt-2 text-xs text-gray-500">
                        <Truck className="h-3 w-3 mr-1" />
                        <span>무료배송</span>
                      </div>
                    )}
                    
                    {/* 타겟 정보 표시 */}
                    {product.targetInfo && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {product.targetInfo.petTypes?.map((pet: string, idx: number) => (
                          <span key={idx} className="bg-green-50 text-green-700 text-[10px] px-1.5 py-0.5 rounded border border-green-200">
                            {pet}
                          </span>
                        ))}
                        {product.targetInfo.sizes?.slice(0, 2).map((size: string, idx: number) => (
                          <span key={idx} className="bg-blue-50 text-blue-700 text-[10px] px-1.5 py-0.5 rounded border border-blue-200">
                            {size}
                          </span>
                        ))}
                        {product.targetInfo.weightRange && (
                          <span className="bg-primary/5 text-primary text-[10px] px-1.5 py-0.5 rounded border border-primary/30">
                            {product.targetInfo.weightRange}
                          </span>
                        )}
                      </div>
                    )}
                    
                    <Button 
                      className="w-full mt-3 bg-[#03c75a] hover:bg-[#02b04a] text-white"
                      size="sm"
                      onClick={() => addToCart(product)}
                    >
                      장바구니 담기
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
        
        {/* 쇼핑 혜택 정보 */}
        <div className="bg-white dark:bg-gray-800 py-8 border-t border-gray-200 dark:border-gray-700">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex items-center">
                <Shield className="h-10 w-10 text-[#03c75a] mr-4" />
                <div>
                  <h3 className="font-bold mb-1">안전한 결제</h3>
                  <p className="text-sm text-gray-500">다양한 결제 수단과 보안 시스템</p>
                </div>
              </div>
              <div className="flex items-center">
                <Truck className="h-10 w-10 text-[#03c75a] mr-4" />
                <div>
                  <h3 className="font-bold mb-1">빠른 배송</h3>
                  <p className="text-sm text-gray-500">3만원 이상 무료배송</p>
                </div>
              </div>
              <div className="flex items-center">
                <RefreshCw className="h-10 w-10 text-[#03c75a] mr-4" />
                <div>
                  <h3 className="font-bold mb-1">쉬운 교환/반품</h3>
                  <p className="text-sm text-gray-500">고객만족 100% 보장제</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* 고정된 하단 네비게이션 바는 모바일 사용성을 위해 유지하되 레이아웃 문제를 해결하기 위해 z-index 조정 */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 z-20">
          <div className="grid grid-cols-5 h-16">
            <a 
              href="/shop" 
              className="flex flex-col items-center justify-center text-[#03c75a]"
              onClick={(e) => {
                e.preventDefault();
                setLocation('/shop');
              }}
            >
              <Home className="h-5 w-5" />
              <span className="text-xs mt-1">홈</span>
            </a>
            <a 
              href="/shop/categories" 
              className="flex flex-col items-center justify-center text-gray-600 dark:text-gray-300"
              onClick={(e) => {
                e.preventDefault();
                setLocation('/shop/categories');
              }}
            >
              <Tag className="h-5 w-5" />
              <span className="text-xs mt-1">카테고리</span>
            </a>
            <a 
              href="/shop/wishlist" 
              className="flex flex-col items-center justify-center text-gray-600 dark:text-gray-300"
              onClick={(e) => {
                e.preventDefault();
                setLocation('/shop/wishlist');
              }}
            >
              <Heart className="h-5 w-5" />
              <span className="text-xs mt-1">찜</span>
            </a>
            <a 
              href="/shop/cart" 
              className="flex flex-col items-center justify-center text-gray-600 dark:text-gray-300 relative"
              onClick={(e) => {
                e.preventDefault();
                setLocation('/shop/cart');
              }}
            >
              <ShoppingCart className="h-5 w-5" />
              <span className="text-xs mt-1">장바구니</span>
              {cartItemsCount > 0 && (
                <span className="absolute -top-1 right-5 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                  {cartItemsCount}
                </span>
              )}
            </a>
            <a 
              href="/my-page" 
              className="flex flex-col items-center justify-center text-gray-600 dark:text-gray-300"
              onClick={(e) => {
                e.preventDefault();
                authState.isAuthenticated ? setLocation('/my-page') : setLocation('/auth');
              }}
            >
              <User className="h-5 w-5" />
              <span className="text-xs mt-1">MY</span>
            </a>
          </div>
        </div>
        
        {/* 모바일 하단 네비게이션 영역만큼 패딩 추가 */}
        <div className="md:hidden h-16"></div>
      </div>
    </div>
  );
}