import React, { useState, useEffect } from 'react';
import { useLocation, useRoute, Link } from 'wouter';
import {
  ShoppingBag,
  Heart,
  Share,
  ChevronRight,
  Star,
  Truck,
  Shield,
  RefreshCw,
  Check,
  ThumbsUp,
  Gift,
  User
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

export default function ProductDetail() {
  // 라우팅 설정
  const [, params] = useRoute('/shop/product/:id');
  const productId = params?.id;
  const [, navigate] = useLocation();
  const { toast } = useToast();

  // 상품 상태
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // 옵션 선택 상태
  const [selectedOption, setSelectedOption] = useState('');
  const [quantity, setQuantity] = useState(1);
  
  // 수량 조절
  const decreaseQuantity = () => {
    if (quantity > 1) setQuantity(quantity - 1);
  };
  
  const increaseQuantity = () => {
    setQuantity(quantity + 1);
  };
  
  // 위시리스트 상태
  const [isInWishlist, setIsInWishlist] = useState(false);
  
  // 리뷰 상태
  const [reviews, setReviews] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('details');
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewForm, setReviewForm] = useState({
    rating: 5,
    content: '',
    images: []
  });
  const [editingReview, setEditingReview] = useState<number | null>(null);
  const [reviewSortBy, setReviewSortBy] = useState<'newest' | 'oldest' | 'rating'>('newest');

  // 추천 코드 상태
  const [referralCode, setReferralCode] = useState('');
  const [referralInfo, setReferralInfo] = useState<any>(null);
  const [referralSource, setReferralSource] = useState<'institute' | 'trainer' | null>(null);
  const [isValidReferral, setIsValidReferral] = useState(false);
  const [isVerifyingReferral, setIsVerifyingReferral] = useState(false);
  const [commissionRate, setCommissionRate] = useState<number | null>(null);

  // 권장 상품 상태
  const [recommendedProducts, setRecommendedProducts] = useState<any[]>([]);

  // 인증 상태 로드
  const [authState, setAuthState] = useState({
    isAuthenticated: false,
    userRole: null as string | null,
    userName: null as string | null,
    instituteId: null as number | null,
    trainerId: null as number | null
  });

  // 상품 정보 가져오기
  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        
        // API 호출 (임시 데이터 사용)
        const mockProduct = {
          id: parseInt(productId || '1'),
          name: '프리미엄 반려견 영양 사료 2kg',
          price: 45000,
          discountPrice: 38000,
          discountRate: 15,
          description: '자연에서 온 최상급 성분으로 만든 프리미엄 반려견 사료입니다. 관절 건강과 피모를 위한 특별한 영양소가 함유되어 있습니다.',
          brand: '네이처펫',
          rating: 4.8,
          reviewCount: 256,
          stock: 50,
          options: [
            { id: 1, name: '2kg 기본' },
            { id: 2, name: '4kg 대용량', extraPrice: 15000 },
            { id: 3, name: '8kg 점보팩', extraPrice: 35000 }
          ],
          images: [
            '/images/pet-food-premium.jpg',
            '/images/pet-food-premium-2.jpg',
            '/images/pet-food-premium-3.jpg'
          ],
          tags: ['프리미엄', '영양사료', '관절건강', '피모관리'],
          features: [
            '천연 단백질 함유',
            '관절 건강을 위한 글루코사민 첨가',
            '피모 개선 효과',
            '알러지 최소화 포뮬러'
          ],
          shipping: {
            isFree: true,
            method: '일반 배송',
            duration: '2-3일 내 배송',
            returnPolicy: '배송 완료 후 7일 이내 교환/반품 가능'
          },
          categoryId: 1,
          categoryName: '사료',
          createdAt: '2023-09-15T10:00:00Z',
          isNew: false,
          isBestseller: true,
          commissionRate: 10 // 기본 수수료율 (%)
        };

        setProduct(mockProduct);
        
        // 위시리스트 상태 체크
        try {
          const storedWishlist = localStorage.getItem('petedu_wishlist');
          if (storedWishlist) {
            const wishlist = JSON.parse(storedWishlist);
            setIsInWishlist(wishlist.includes(parseInt(productId || '1')));
          }
        } catch (err) {
          console.error('위시리스트 확인 오류:', err);
        }
        
        // 리뷰 데이터 로드 (임시 데이터)
        const mockReviews = [
          {
            id: 1,
            user: '김반려',
            rating: 5,
            date: '2023-08-15',
            title: '우리 강아지가 정말 좋아해요',
            content: '처음에는 조금 망설였는데, 강아지가 너무 잘 먹고 피모 상태도 좋아진 것 같아요. 계속 구매할 예정입니다.',
            helpful: 24
          },
          {
            id: 2,
            user: '박멍멍',
            rating: 4,
            date: '2023-08-10',
            title: '품질은 좋지만 가격이...',
            content: '품질은 정말 좋은 것 같아요. 강아지 건강에 신경쓰시는 분들께 추천합니다. 다만 가격이 조금 비싼 편이네요.',
            helpful: 15
          },
          {
            id: 3,
            user: '최펫맘',
            rating: 5,
            date: '2023-07-22',
            title: '최고의 사료입니다',
            content: '알레르기 있는 우리 강아지에게 딱 맞는 사료였어요. 피부 가려움이 많이 좋아졌습니다. 배송도 빠르고 친절하셨어요.',
            helpful: 32
          }
        ];
        
        setReviews(mockReviews);
        
        // 추천 상품 로드 (임시 데이터)
        const mockRecommended = [
          { id: 101, name: '반려견 간식 80g 닭고기맛', price: 12000, discountPrice: 10800, image: '/images/pet-treats.jpg', rating: 4.5 },
          { id: 102, name: '반려견 영양제 관절건강 120정', price: 28000, discountPrice: 25200, image: '/images/pet-supplements.jpg', rating: 4.7 },
          { id: 103, name: '반려견 치석케어 껌 10개입', price: 15000, discountPrice: 15000, image: '/images/pet-dental.jpg', rating: 4.6 }
        ];
        
        setRecommendedProducts(mockRecommended);
        
      } catch (err) {
        console.error('상품 정보 로드 오류:', err);
        setError('상품 정보를 불러오는 데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchProduct();
  }, [productId]);
  
  // 인증 상태 로드
  useEffect(() => {
    const windowAuth = window.__peteduAuthState;
    if (windowAuth) {
      // LSP 오류 방지 및 추가 필드 설정
      const enhancedAuth = {
        isAuthenticated: windowAuth.isAuthenticated || false,
        userRole: windowAuth.userRole || null,
        userName: windowAuth.userName || null,
        instituteId: null as number | null,
        trainerId: null as number | null
      };
      
      // 기관 관리자인 경우 instituteId 설정
      if (enhancedAuth.userRole === 'institute-admin') {
        enhancedAuth.instituteId = 1; // 예시 ID (실제론 API로 가져옴)
      }
      
      // 트레이너인 경우 trainerId 설정
      if (enhancedAuth.userRole === 'trainer') {
        enhancedAuth.trainerId = 1; // 예시 ID (실제론 API로 가져옴)
      }
      
      setAuthState(enhancedAuth);
    }
  }, []);

  // 추천 코드 검증
  const verifyReferralCode = async () => {
    if (!referralCode.trim()) {
      toast({
        title: "추천 코드를 입력해주세요",
        variant: "destructive",
      });
      return;
    }

    setIsVerifyingReferral(true);

    try {
      // 실제 구현에서는 API 요청을 통해 검증
      // 예: const response = await fetch(`/api/referral/verify?code=${referralCode}`);
      
      // 임시 검증 로직 (실제 구현에서는 API로 대체)
      await new Promise(resolve => setTimeout(resolve, 800)); // 로딩 시뮬레이션
      
      const isInstituteCode = referralCode.startsWith('INST-');
      const isTrainerCode = referralCode.startsWith('T-');
      
      if (isInstituteCode || isTrainerCode) {
        setIsValidReferral(true);
        
        // 수수료율 설정 (실제 구현에서는 서버에서 가져옴)
        const rate = isInstituteCode ? 8 : 12; // 기관: 8%, 트레이너: 12% (예시)
        setCommissionRate(rate);
        
        if (isInstituteCode) {
          setReferralSource('institute');
          setReferralInfo({
            id: 123,
            name: '행복한 펫 아카데미',
            code: referralCode,
            commissionRate: rate
          });
        } else {
          setReferralSource('trainer');
          setReferralInfo({
            id: 456,
            name: '김훈련 트레이너',
            code: referralCode,
            commissionRate: rate
          });
        }
        
        toast({
          title: "추천 코드가 적용되었습니다",
          description: `${isInstituteCode ? '기관' : '트레이너'} 추천 코드가 성공적으로 적용되었습니다.`,
        });
      } else {
        setIsValidReferral(false);
        setReferralInfo(null);
        setReferralSource(null);
        setCommissionRate(null);
        
        toast({
          title: "유효하지 않은 추천 코드입니다",
          description: "올바른 추천 코드를 입력해주세요.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('추천 코드 검증 오류:', error);
      toast({
        title: "추천 코드 검증 중 오류가 발생했습니다",
        description: "잠시 후 다시 시도해주세요.",
        variant: "destructive",
      });
    } finally {
      setIsVerifyingReferral(false);
    }
  };
  
  // 장바구니에 추가
  const addToCart = () => {
    if (!selectedOption) {
      toast({
        title: "옵션을 선택해주세요",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // 장바구니 정보 가져오기
      const cartItemsString = localStorage.getItem('petedu_cart') || '[]';
      const cartItems = JSON.parse(cartItemsString);
      
      // 장바구니에 추가할 상품 정보
      const selectedOptionObj = product.options.find((opt: any) => opt.name === selectedOption);
      
      const cartItem = {
        id: product.id,
        name: product.name,
        price: product.discountPrice || product.price,
        image: product.images[0],
        quantity: quantity,
        option: selectedOption,
        optionId: selectedOptionObj?.id,
        extraPrice: selectedOptionObj?.extraPrice || 0,
        referralCode: isValidReferral ? referralCode : null,
        referralSource: referralSource,
        referralInfo: referralInfo,
        commissionRate: commissionRate
      };
      
      // 이미 동일한 상품/옵션이 있는지 확인
      const existingItemIndex = cartItems.findIndex((item: any) => 
        item.id === cartItem.id && item.option === cartItem.option);
      
      if (existingItemIndex >= 0) {
        // 이미 있다면 수량만 증가
        cartItems[existingItemIndex].quantity += quantity;
      } else {
        // 없다면 새로 추가
        cartItems.push(cartItem);
      }
      
      // 로컬 스토리지에 저장
      localStorage.setItem('petedu_cart', JSON.stringify(cartItems));
      
      toast({
        title: "장바구니에 추가되었습니다",
        description: `${product.name} ${quantity}개가 장바구니에 추가되었습니다.`,
      });
      
      // 이벤트 발생 (장바구니 아이콘 업데이트 등을 위함)
      window.dispatchEvent(new CustomEvent('cartUpdated', { detail: { cartItems } }));
      
    } catch (err) {
      console.error('장바구니 추가 오류:', err);
      toast({
        title: "장바구니 추가 실패",
        description: "장바구니에 추가하는 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };
  
  // 위시리스트 토글
  const toggleWishlist = () => {
    try {
      const wishlistString = localStorage.getItem('petedu_wishlist') || '[]';
      let wishlist = JSON.parse(wishlistString);
      
      if (isInWishlist) {
        // 위시리스트에서 제거
        wishlist = wishlist.filter((id: number) => id !== product.id);
        setIsInWishlist(false);
        toast({
          title: "위시리스트에서 제거되었습니다",
        });
      } else {
        // 위시리스트에 추가
        wishlist.push(product.id);
        setIsInWishlist(true);
        toast({
          title: "위시리스트에 추가되었습니다",
        });
      }
      
      localStorage.setItem('petedu_wishlist', JSON.stringify(wishlist));
      
      // 이벤트 발생 (위시리스트 아이콘 업데이트 등을 위함)
      window.dispatchEvent(new CustomEvent('wishlistUpdated', { detail: { wishlist } }));
      
    } catch (err) {
      console.error('위시리스트 토글 오류:', err);
      toast({
        title: "위시리스트 업데이트 실패",
        variant: "destructive",
      });
    }
  };
  
  // 공유하기
  const shareProduct = () => {
    if (navigator.share) {
      navigator.share({
        title: product?.name,
        text: product?.description,
        url: window.location.href,
      })
      .catch((error) => {
        console.error('공유 오류:', error);
        toast({
          title: "공유하기 실패",
          description: "링크를 공유하는 중 오류가 발생했습니다.",
          variant: "destructive",
        });
      });
    } else {
      // Web Share API를 지원하지 않는 경우 클립보드에 복사
      navigator.clipboard.writeText(window.location.href)
        .then(() => {
          toast({
            title: "링크가 클립보드에 복사되었습니다",
          });
        })
        .catch((error) => {
          console.error('클립보드 복사 오류:', error);
          toast({
            title: "링크 복사 실패",
            variant: "destructive",
          });
        });
    }
  };
  
  // 이미지 갤러리 관련 상태 및 함수
  const [currentImage, setCurrentImage] = useState(0);
  
  const selectImage = (index: number) => {
    setCurrentImage(index);
  };
  
  // 자동 추천 코드 적용 (인증된 사용자인 경우)
  useEffect(() => {
    // 기관 관리자이거나 트레이너인 경우 자동 추천 코드 적용
    if (authState.isAuthenticated) {
      if (authState.userRole === 'institute-admin' && authState.instituteId) {
        // 기관 코드 자동 적용
        setReferralCode(`INST-${authState.instituteId}`);
        setReferralSource('institute');
        setIsValidReferral(true);
        setCommissionRate(8); // 예시 수수료율
        
        setReferralInfo({
          id: authState.instituteId,
          name: '내 기관', // 실제 구현에서는 기관명을 가져와야 함
          code: `INST-${authState.instituteId}`,
          commissionRate: 8
        });
        
      } else if (authState.userRole === 'trainer' && authState.trainerId) {
        // 트레이너 코드 자동 적용
        setReferralCode(`T-${authState.trainerId}`);
        setReferralSource('trainer');
        setIsValidReferral(true);
        setCommissionRate(12); // 예시 수수료율
        
        setReferralInfo({
          id: authState.trainerId,
          name: authState.userName || '트레이너',
          code: `T-${authState.trainerId}`,
          commissionRate: 12
        });
      }
    }
  }, [authState]);
  
  // 로딩 중이거나 오류 발생 시 표시
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center items-center min-h-[500px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-[hsl(var(--success))] border-solid"></div>
      </div>
    );
  }
  
  if (error || !product) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center items-center min-h-[500px]">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">상품 정보를 불러올 수 없습니다</h2>
          <p className="text-gray-600 mb-6">{error || '상품을 찾을 수 없습니다.'}</p>
          <Button onClick={() => navigate('/shop')}>쇼핑몰 홈으로 돌아가기</Button>
        </div>
      </div>
    );
  }
  
  // 할인율 포함한 표시 가격 계산
  const originalPrice = product.price;
  const discountPrice = product.discountPrice || product.price;
  const discountRate = product.discountRate || 0;
  
  return (
    <div className="bg-white dark:bg-gray-900">
      {/* 상단 경로 네비게이션 */}
      <div className="container mx-auto px-4 py-4">
        <nav className="flex text-sm text-gray-500 dark:text-gray-400 mb-6">
          <Link href="/shop" className="hover:text-[hsl(var(--success))]">홈</Link>
          <ChevronRight className="h-4 w-4 mx-1 my-auto" />
          <Link href={`/shop/category/${product.categoryId}`} className="hover:text-[hsl(var(--success))]">{product.categoryName}</Link>
          <ChevronRight className="h-4 w-4 mx-1 my-auto" />
          <span className="text-gray-900 dark:text-gray-200">{product.name}</span>
        </nav>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {/* 왼쪽: 이미지 갤러리 */}
          <div>
            <div className="relative mb-4 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
              <img 
                src={product.images[currentImage]} 
                alt={product.name} 
                className="w-full h-auto object-cover"
              />
              
              {product.isBestseller && (
                <div className="absolute top-4 left-4">
                  <Badge variant="default" className="bg-warning hover:bg-warning/90">
                    베스트셀러
                  </Badge>
                </div>
              )}
              
              {product.isNew && (
                <div className="absolute top-4 left-4">
                  <Badge variant="default" className="bg-primary hover:bg-primary/90">
                    신상품
                  </Badge>
                </div>
              )}
              
              {discountRate > 0 && (
                <div className="absolute top-4 right-4">
                  <Badge variant="default" className="bg-destructive hover:bg-destructive/90">
                    {discountRate}% 할인
                  </Badge>
                </div>
              )}
            </div>
            
            {/* 썸네일 이미지 */}
            <div className="flex space-x-2">
              {product.images.map((image: string, idx: number) => (
                <div 
                  key={idx}
                  className={`w-20 h-20 rounded-md overflow-hidden cursor-pointer border-2 ${
                    currentImage === idx 
                      ? 'border-[hsl(var(--success))]' 
                      : 'border-gray-200 dark:border-gray-700'
                  }`}
                  onClick={() => selectImage(idx)}
                >
                  <img 
                    src={image} 
                    alt={`${product.name} 썸네일 ${idx + 1}`} 
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          </div>
          
          {/* 오른쪽: 상품 정보 및 구매 옵션 */}
          <div>
            <div className="mb-2">
              <Link 
                href={`/shop/brand/${product.brand}`}
                className="text-[hsl(var(--success))] text-sm hover:underline"
              >
                {product.brand}
              </Link>
            </div>
            
            <h1 className="text-2xl md:text-3xl font-bold mb-4">{product.name}</h1>
            
            <div className="flex items-center mb-4">
              <div className="flex items-center">
                {Array(5).fill(0).map((_, idx) => (
                  <Star 
                    key={idx} 
                    className={`h-5 w-5 ${
                      idx < Math.floor(product.rating) 
                        ? 'text-warning fill-warning' 
                        : 'text-gray-300'
                    }`} 
                  />
                ))}
              </div>
              <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                {product.rating} ({product.reviewCount} 리뷰)
              </span>
            </div>
            
            {/* 가격 정보 */}
            <div className="mb-6">
              {discountRate > 0 ? (
                <div className="flex items-center">
                  <span className="text-3xl font-bold text-gray-900 dark:text-white">
                    {discountPrice.toLocaleString()}원
                  </span>
                  <span className="ml-2 text-sm line-through text-gray-500">
                    {originalPrice.toLocaleString()}원
                  </span>
                  <span className="ml-2 text-destructive font-semibold">
                    {discountRate}% 할인
                  </span>
                </div>
              ) : (
                <span className="text-3xl font-bold text-gray-900 dark:text-white">
                  {originalPrice.toLocaleString()}원
                </span>
              )}
            </div>
            
            {/* 배송 정보 */}
            <div className="flex items-center mb-6">
              <Truck className="h-5 w-5 text-gray-600 dark:text-gray-400 mr-2" />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {product.shipping.isFree ? '무료배송' : '유료배송'} | {product.shipping.duration}
              </span>
            </div>
            
            {/* 태그 */}
            <div className="flex flex-wrap gap-2 mb-6">
              {product.tags.map((tag: string) => (
                <Badge 
                  key={tag} 
                  variant="outline" 
                  className="text-xs py-1 px-2"
                >
                  #{tag}
                </Badge>
              ))}
            </div>
            
            {/* 상품 옵션 */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">옵션 선택</label>
              <Select value={selectedOption} onValueChange={setSelectedOption}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="옵션을 선택해주세요" />
                </SelectTrigger>
                <SelectContent>
                  {product.options.map((option: any) => (
                    <SelectItem key={option.id} value={option.name}>
                      {option.name}
                      {option.extraPrice > 0 && ` (+${option.extraPrice.toLocaleString()}원)`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* 수량 선택 */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">수량</label>
              <div className="flex items-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={decreaseQuantity}
                  disabled={quantity <= 1}
                  className="rounded-r-none h-10"
                >
                  -
                </Button>
                <Input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                  className="w-16 h-10 text-center rounded-none border-x-0"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={increaseQuantity}
                  className="rounded-l-none h-10"
                >
                  +
                </Button>
              </div>
            </div>
            
            {/* 추천 코드 입력 영역 */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">기관/트레이너 추천 코드</label>
              <div className="flex gap-2">
                <Input
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value)}
                  placeholder="추천 코드를 입력하세요"
                  disabled={isValidReferral}
                />
                <Button 
                  variant="outline" 
                  onClick={verifyReferralCode}
                  disabled={isVerifyingReferral || isValidReferral || !referralCode.trim()}
                >
                  {isVerifyingReferral ? '확인 중...' : isValidReferral ? '확인됨' : '확인'}
                </Button>
              </div>
              
              {isValidReferral && referralInfo && (
                <div className="mt-2 p-3 bg-success/10 dark:bg-success/20 rounded-md border border-success/30 dark:border-success/50">
                  <div className="flex items-start">
                    <Check className="h-5 w-5 text-success dark:text-success mr-2 mt-0.5" />
                    <div>
                      <span className="block text-sm font-medium text-success dark:text-success">
                        {referralSource === 'institute' ? '기관' : '트레이너'} 추천 코드가 적용되었습니다
                      </span>
                      <span className="block text-xs text-success dark:text-success mt-1">
                        {referralInfo.name} ({referralInfo.code})
                      </span>
                      {commissionRate && (
                        <span className="block text-xs text-success dark:text-success mt-1">
                          구매 시 {commissionRate}%의 수수료가 {referralSource === 'institute' ? '기관' : '트레이너'}에게 적립됩니다.
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* 총 가격 */}
            <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-md">
              <div className="flex justify-between">
                <span className="font-medium">총 상품 금액</span>
                <span className="font-bold text-lg">
                  {(
                    (discountPrice + 
                     (selectedOption ? 
                      (product.options.find((o: any) => o.name === selectedOption)?.extraPrice || 0) : 0)
                    ) * quantity
                  ).toLocaleString()}원
                </span>
              </div>
            </div>
            
            {/* 구매 버튼 */}
            <div className="flex gap-2 mb-6">
              <Button 
                className="flex-1 bg-[hsl(var(--success))] hover:bg-[hsl(var(--success))] text-white"
                onClick={addToCart}
              >
                <ShoppingBag className="mr-2 h-5 w-5" />
                장바구니 담기
              </Button>
              
              <Button 
                variant="outline" 
                className={`px-4 ${isInWishlist ? 'text-destructive border-destructive/50' : ''}`}
                onClick={toggleWishlist}
              >
                <Heart className={`h-5 w-5 ${isInWishlist ? 'fill-destructive' : ''}`} />
              </Button>
              
              <Button 
                variant="outline" 
                className="px-4"
                onClick={shareProduct}
              >
                <Share className="h-5 w-5" />
              </Button>
            </div>
            
            {/* 혜택 및 보증 정보 */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-start">
                  <Shield className="h-5 w-5 text-[hsl(var(--success))] mr-3 mt-0.5" />
                  <div>
                    <span className="block text-sm font-semibold">안전 결제</span>
                    <span className="block text-xs text-gray-600 dark:text-gray-400">
                      안전한 결제 시스템을 이용합니다.
                    </span>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <RefreshCw className="h-5 w-5 text-[hsl(var(--success))] mr-3 mt-0.5" />
                  <div>
                    <span className="block text-sm font-semibold">간편 교환/반품</span>
                    <span className="block text-xs text-gray-600 dark:text-gray-400">
                      배송 완료 후 7일 이내 가능합니다.
                    </span>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <ThumbsUp className="h-5 w-5 text-[hsl(var(--success))] mr-3 mt-0.5" />
                  <div>
                    <span className="block text-sm font-semibold">품질 보증</span>
                    <span className="block text-xs text-gray-600 dark:text-gray-400">
                      철저한 품질 관리를 거친 제품입니다.
                    </span>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <Gift className="h-5 w-5 text-[hsl(var(--success))] mr-3 mt-0.5" />
                  <div>
                    <span className="block text-sm font-semibold">선물 포장</span>
                    <span className="block text-xs text-gray-600 dark:text-gray-400">
                      주문 시 선물 포장 옵션을 선택할 수 있습니다.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* 상품 상세 정보 탭 */}
        <div className="mt-12">
          <Tabs defaultValue="details" value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="details">상품 상세</TabsTrigger>
              <TabsTrigger value="reviews">리뷰 ({reviews.length})</TabsTrigger>
              <TabsTrigger value="shipping">배송/환불 정보</TabsTrigger>
            </TabsList>
            
            {/* 상품 상세 내용 */}
            <TabsContent value="details" className="p-6 border rounded-md mt-4">
              <div className="prose dark:prose-invert max-w-none">
                <h3 className="text-xl font-bold mb-4">제품 설명</h3>
                <p>{product.description}</p>
                
                <h4 className="text-lg font-semibold mt-6 mb-3">제품 특징</h4>
                <ul>
                  {product.features.map((feature: string, idx: number) => (
                    <li key={idx} className="mb-2">{feature}</li>
                  ))}
                </ul>
                
                <h4 className="text-lg font-semibold mt-6 mb-3">원재료</h4>
                <p>
                  닭고기, 쌀, 곡물, 비타민, 미네랄, 오메가-3 지방산
                  (실제 제품은 제품 패키지에 표기된 성분을 확인해주세요)
                </p>
                
                <h4 className="text-lg font-semibold mt-6 mb-3">사용 방법</h4>
                <p>
                  반려동물의 체중, 나이, 활동량에 따라 적절한 양을 급여해주세요.
                  자세한 급여량은 제품 패키지의 안내를 참고하시기 바랍니다.
                </p>
                
                <h4 className="text-lg font-semibold mt-6 mb-3">주의 사항</h4>
                <p>
                  개봉 후에는 서늘하고 건조한 곳에 보관하시고, 가급적 빠른 시일 내에 급여해주세요.
                  알레르기가 있는 반려동물에게는 급여 전 소량으로 테스트해보시기 바랍니다.
                </p>
              </div>
            </TabsContent>
            
            {/* 리뷰 내용 */}
            <TabsContent value="reviews" className="p-6 border rounded-md mt-4">
              <div className="mb-8">
                <h3 className="text-xl font-bold mb-2">고객 리뷰</h3>
                <div className="flex items-center">
                  <div className="flex items-center mr-4">
                    {Array(5).fill(0).map((_, idx) => (
                      <Star 
                        key={idx} 
                        className={`h-5 w-5 ${
                          idx < Math.floor(product.rating) 
                            ? 'text-warning fill-warning' 
                            : 'text-gray-300'
                        }`} 
                      />
                    ))}
                  </div>
                  <span className="text-lg font-bold">{product.rating}</span>
                  <span className="mx-2 text-gray-500">|</span>
                  <span className="text-gray-600">{product.reviewCount} 리뷰</span>
                </div>
              </div>
              
              {/* 리뷰 목록 */}
              <div className="space-y-6">
                {reviews.map((review) => (
                  <div key={review.id} className="border-b pb-6">
                    <div className="flex items-center mb-2">
                      <div className="flex items-center">
                        {Array(5).fill(0).map((_, idx) => (
                          <Star 
                            key={idx} 
                            className={`h-4 w-4 ${
                              idx < review.rating 
                                ? 'text-warning fill-warning' 
                                : 'text-gray-300'
                            }`} 
                          />
                        ))}
                      </div>
                    </div>
                    
                    <h4 className="text-lg font-semibold mb-2">{review.title}</h4>
                    <p className="text-gray-700 dark:text-gray-300 mb-3">{review.content}</p>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center text-sm text-gray-500">
                        <User className="h-4 w-4 mr-1" />
                        <span>{review.user}</span>
                        <span className="mx-2">|</span>
                        <span>{review.date}</span>
                      </div>
                      
                      <div className="flex items-center">
                        <Button variant="ghost" size="sm" className="text-xs">
                          <ThumbsUp className="h-3 w-3 mr-1" />
                          도움됨 ({review.helpful})
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
            
            {/* 배송/환불 정보 */}
            <TabsContent value="shipping" className="p-6 border rounded-md mt-4">
              <div className="prose dark:prose-invert max-w-none">
                <h3 className="text-xl font-bold mb-4">배송 정보</h3>
                <ul>
                  <li>주문 후 1-2일 이내 출고됩니다.</li>
                  <li>배송은 출고 후 1-3일 소요됩니다.</li>
                  <li>제주 및 도서산간 지역은 추가 배송비가 발생할 수 있습니다.</li>
                  <li>3만원 이상 구매 시 무료 배송입니다.</li>
                </ul>
                
                <h3 className="text-xl font-bold mt-8 mb-4">교환 및 반품 안내</h3>
                <ul>
                  <li>상품 수령 후 7일 이내에 교환/반품이 가능합니다.</li>
                  <li>고객의 단순 변심으로 인한 교환/반품의 경우 왕복 배송비는 고객 부담입니다.</li>
                  <li>상품의 불량/하자로 인한 교환/반품의 경우 배송비는 판매자 부담입니다.</li>
                  <li>교환/반품 시에는 구매자 센터(1234-5678)로 연락해주세요.</li>
                </ul>
                
                <h3 className="text-xl font-bold mt-8 mb-4">교환/반품이 불가능한 경우</h3>
                <ul>
                  <li>포장을 개봉하여 이미 사용한 경우</li>
                  <li>고객의 부주의로 상품이 훼손된 경우</li>
                  <li>시간이 경과하여 재판매가 어려운 경우</li>
                  <li>복제가 가능한 상품의 포장이 훼손된 경우</li>
                </ul>
              </div>
            </TabsContent>
          </Tabs>
        </div>
        
        {/* 함께 구매하면 좋은 상품 */}
        <div className="mt-16">
          <h3 className="text-xl font-bold mb-6">함께 구매하면 좋은 상품</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {recommendedProducts.map((product) => (
              <div key={product.id} className="border rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
                <Link href={`/shop/product/${product.id}`}>
                  <div className="relative">
                    <img 
                      src={product.image} 
                      alt={product.name} 
                      className="w-full h-48 object-cover"
                    />
                    {product.discountPrice < product.price && (
                      <div className="absolute top-2 right-2">
                        <Badge variant="default" className="bg-destructive">
                          {Math.round((1 - product.discountPrice / product.price) * 100)}% 할인
                        </Badge>
                      </div>
                    )}
                  </div>
                  
                  <div className="p-4">
                    <h4 className="font-medium text-sm mb-1 line-clamp-2">{product.name}</h4>
                    
                    <div className="flex items-center mb-2">
                      <div className="flex items-center">
                        {Array(5).fill(0).map((_, idx) => (
                          <Star 
                            key={idx} 
                            className={`h-3 w-3 ${
                              idx < Math.floor(product.rating) 
                                ? 'text-warning fill-warning' 
                                : 'text-gray-300'
                            }`} 
                          />
                        ))}
                      </div>
                      <span className="text-xs text-gray-500 ml-1">{product.rating}</span>
                    </div>
                    
                    <div>
                      {product.discountPrice < product.price ? (
                        <div className="flex items-baseline">
                          <span className="text-base font-bold">
                            {product.discountPrice.toLocaleString()}원
                          </span>
                          <span className="ml-1 text-xs line-through text-gray-500">
                            {product.price.toLocaleString()}원
                          </span>
                        </div>
                      ) : (
                        <span className="text-base font-bold">
                          {product.price.toLocaleString()}원
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}