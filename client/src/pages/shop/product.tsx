import React, { useState, useEffect } from 'react';
import { useLocation, useRoute } from 'wouter';
import { useAuth } from '../../SimpleApp';
import { 
  ShoppingCart, 
  Heart, 
  Share2, 
  Star, 
  Truck, 
  Shield, 
  RotateCcw, 
  Minus, 
  Plus, 
  ChevronRight,
  Check,
  BadgeCheck,
  PawPrint,
  Tag,
  User
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

// 제품 타입 정의 (shop/index.tsx와 일치시켜야 함)
interface Product {
  id: number;
  name: string;
  category: string;
  price: number;
  discountRate?: number;
  rating: number;
  reviewCount: number;
  imageUrl: string;
  description: string;
  isNew?: boolean;
  isBestSeller?: boolean;
  isOnSale?: boolean;
  referralCommission?: number;
  inStock: boolean;
  longDescription?: string;
  specifications?: string[];
  images?: string[];
  features?: { title: string; description: string }[];
  variations?: { color?: string; size?: string; }[];
  relatedProducts?: number[];
  options?: { size?: string[]; color?: string[]; }
}

// 리뷰 타입 정의
interface Review {
  id: number;
  userId: number;
  userName: string;
  userAvatar?: string;
  rating: number;
  comment: string;
  date: string;
  likes: number;
  helpful?: number;
  images?: string[];
  verified: boolean;
}

// 상품 목록 (실제로는 API에서 가져와야 함)
const productList: Product[] = [
  {
    id: 1,
    name: "프리미엄 반려견 훈련용 클리커",
    category: "training",
    price: 15000,
    rating: 4.8,
    reviewCount: 126,
    imageUrl: "https://images.unsplash.com/photo-1598875384021-4a23470c7997?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
    description: "훈련사들이 추천하는 고품질 클리커. 명확한 소리로 반려견 훈련 효과를 높여줍니다.",
    longDescription: "이 프리미엄 클리커는 전문 훈련사들이 추천하는 제품으로, 명확하고 일관된 소리로 반려견에게 정확한 신호를 전달합니다. 인체공학적 디자인으로 오랜 시간 사용해도 손이 아프지 않으며, 포켓에 쉽게 들어가는 컴팩트한 사이즈로 휴대가 간편합니다. 고품질 소재를 사용하여 내구성이 뛰어나며, 초보자부터 전문 훈련사까지 모두 사용할 수 있습니다. 클리커 트레이닝은 반려견의 긍정적인 행동을 강화하는 가장 효과적인 방법 중 하나로, 이 제품과 함께라면 반려견 훈련이 더욱 즐겁고, 효율적으로 진행될 수 있습니다.",
    isBestSeller: true,
    referralCommission: 10,
    inStock: true,
    specifications: [
      "재질: 고품질 ABS 플라스틱, 스테인리스 스틸",
      "크기: 5.5 x 2.5 x 1.5cm",
      "무게: 25g",
      "색상: 블랙/블루",
      "소리 크기: 약 80dB",
      "제조국: 한국"
    ],
    images: [
      "https://images.unsplash.com/photo-1598875384021-4a23470c7997?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
      "https://images.unsplash.com/photo-1546238232-20216dec9f72?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
      "https://images.unsplash.com/photo-1561037404-61cd46aa615b?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3"
    ],
    features: [
      {
        title: "정확한 소리 전달",
        description: "일관된 소리로 훈련 효과 극대화"
      },
      {
        title: "인체공학적 디자인",
        description: "오랜 사용에도 편안한 그립감"
      },
      {
        title: "내구성",
        description: "고품질 소재로 제작되어 오래 사용 가능"
      },
      {
        title: "휴대성",
        description: "가볍고 컴팩트한 사이즈로 어디서든 훈련 가능"
      }
    ],
    relatedProducts: [2, 5, 9]
  },
  {
    id: 2,
    name: "반려견 지능 개발 장난감 세트",
    category: "toys",
    price: 35000,
    discountRate: 15,
    rating: 4.6,
    reviewCount: 89,
    imageUrl: "https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
    description: "반려견의 지능 개발을 돕는 다양한 퍼즐 장난감 세트. 지루함 해소와 두뇌 발달에 효과적입니다.",
    isOnSale: true,
    referralCommission: 15,
    inStock: true
  },
  {
    id: 3,
    name: "프리미엄 가죽 리드줄",
    category: "accessories",
    price: 45000,
    rating: 4.9,
    reviewCount: 203,
    imageUrl: "https://images.unsplash.com/photo-1581434271564-7e273485524c?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
    description: "고급 이탈리안 가죽으로 제작된 내구성 강한 리드줄. 편안한 그립감과 세련된 디자인.",
    isBestSeller: true,
    referralCommission: 12,
    inStock: true,
    options: {
      color: ["브라운", "블랙", "탄색"],
      size: ["S", "M", "L"]
    }
  }
];

// 리뷰 데이터 (실제로는 API에서 가져와야 함)
const reviews: Review[] = [
  {
    id: 1,
    userId: 101,
    userName: "김훈련",
    userAvatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
    rating: 5,
    comment: "정말 훌륭한 클리커입니다! 소리가 정확하고 크기도 적당해서 사용하기 편리합니다. 우리 강아지도 금방 반응하네요. 전문 훈련사로서 강력 추천합니다.",
    date: "2023-10-15",
    likes: 24,
    helpful: 18,
    verified: true
  },
  {
    id: 2,
    userId: 102,
    userName: "박반려",
    userAvatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
    rating: 4,
    comment: "처음 클리커 트레이닝을 시작하는 입문자로서 아주 좋은 선택이었어요. 튼튼하고 사용법도 간단합니다. 별 하나 뺀 이유는 처음에는 좀 소리가 크게 느껴졌기 때문이에요. 하지만 강아지가 빨리 적응해서 만족합니다.",
    date: "2023-11-02",
    likes: 10,
    helpful: 8,
    images: ["https://images.unsplash.com/photo-1591946614720-90a587da4a36?w=300&auto=format&fit=crop&q=60&ixlib=rb-4.0.3"],
    verified: true
  },
  {
    id: 3,
    userId: 103,
    userName: "이멍멍",
    rating: 5,
    comment: "이 클리커로 우리 강아지 훈련시키기 시작한지 2주 됐는데, 놀라운 성과가 있어요! 앉아, 엎드려, 기다려 모두 완벽하게 익혔습니다. 품질도 좋아서 오래 쓸 수 있을 것 같아요.",
    date: "2023-09-20",
    likes: 15,
    verified: false
  }
];

export default function ProductDetailPage() {
  const [match, params] = useRoute<{ id: string }>('/shop/product/:id');
  console.log("ProductDetailPage rendered with params:", params);
  const [location, navigate] = useLocation();
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();

  const [product, setProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedColor, setSelectedColor] = useState<string | undefined>(undefined);
  const [selectedSize, setSelectedSize] = useState<string | undefined>(undefined);
  const [isWishlist, setIsWishlist] = useState(false);
  const [referralCode, setReferralCode] = useState<string>('');
  const [isReferralApplied, setIsReferralApplied] = useState(false);
  const [referralDiscount, setReferralDiscount] = useState(0);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [finalPrice, setFinalPrice] = useState(0);
  const [isImageZoomed, setIsImageZoomed] = useState(false);

  useEffect(() => {
    if (params && params.id) {
      // 실제로는 API 호출을 통해 상품 정보를 가져와야 합니다.
      const foundProduct = productList.find(p => p.id === Number(params.id));
      if (foundProduct) {
        setProduct(foundProduct);
        // 색상과 사이즈 옵션이 있으면 첫 번째 옵션을 기본값으로 설정
        if (foundProduct.options?.color?.length) {
          setSelectedColor(foundProduct.options.color[0]);
        }
        if (foundProduct.options?.size?.length) {
          setSelectedSize(foundProduct.options.size[0]);
        }
      } else {
        // 상품을 찾지 못했을 때 리디렉션
        navigate('/shop');
      }
    }
  }, [params, navigate]);

  // 장바구니에 추가
  const addToCart = async () => {
    if (!isAuthenticated) {
      toast({
        title: "로그인이 필요합니다",
        description: "장바구니에 담으려면 로그인해주세요.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);

      const cartItem = {
        productId: product?.id,
        quantity: quantity,
        selectedColor: selectedColor,
        selectedSize: selectedSize,
        price: finalPrice
      };

      const response = await fetch('/api/shopping/cart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
        body: JSON.stringify(cartItem),
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '장바구니 추가에 실패했습니다');
      }

      const result = await response.json();

      toast({
        title: "장바구니에 추가되었습니다",
        description: `${product?.name} ${quantity}개`,
      });

      // 장바구니 개수 업데이트 이벤트 발생
      window.dispatchEvent(new CustomEvent('cartUpdated', { 
        detail: { cartCount: result.cartCount || 1 }
      }));

    } catch (error) {
      console.error('장바구니 추가 오류:', error);
      toast({
        title: "오류가 발생했습니다",
        description: error.message || "장바구니 추가에 실패했습니다. 다시 시도해주세요.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 수량 증가
  const increaseQuantity = () => {
    setQuantity(prev => prev + 1);
  };

  // 수량 감소
  const decreaseQuantity = () => {
    if (quantity > 1) {
      setQuantity(prev => prev - 1);
    }
  };

  // 위시리스트에 추가/제거
  const toggleWishlist = async () => {
    if (!isAuthenticated) {
      toast({
        title: "로그인이 필요합니다",
        description: "위시리스트를 이용하려면 로그인해주세요.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);
      const newWishlistState = !isWishlist;

      const method = newWishlistState ? 'POST' : 'DELETE';
      const response = await fetch('/api/shopping/wishlist', {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
        body: JSON.stringify({ productId: product?.id }),
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '위시리스트 처리에 실패했습니다');
      }

      setIsWishlist(newWishlistState);
      
      toast({
        title: newWishlistState ? "위시리스트에 추가되었습니다" : "위시리스트에서 제거되었습니다",
        description: product?.name,
      });

      // 위시리스트 업데이트 이벤트 발생
      window.dispatchEvent(new CustomEvent('wishlistUpdated', { 
        detail: { productId: product?.id, isWishlisted: newWishlistState }
      }));

    } catch (error) {
      console.error('위시리스트 오류:', error);
      toast({
        title: "오류가 발생했습니다",
        description: error.message || "위시리스트 처리에 실패했습니다. 다시 시도해주세요.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 추천인 코드 적용
  const applyReferralCode = async () => {
    if (!referralCode.trim()) {
      toast({
        title: "추천인 코드를 입력해주세요",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);

      const response = await fetch('/api/shopping/referral/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
        body: JSON.stringify({ 
          referralCode: referralCode.trim(),
          productId: product?.id 
        }),
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '추천인 코드 확인에 실패했습니다');
      }

      const result = await response.json();
      
      if (result.isValid) {
        setIsReferralApplied(true);
        setReferralDiscount(result.discountPercent || product?.referralCommission || 0);
        toast({
          title: "추천인 코드가 적용되었습니다",
          description: `${result.discountPercent || product?.referralCommission || 0}% 할인이 적용됩니다.`,
        });
      } else {
        toast({
          title: "유효하지 않은 추천인 코드입니다",
          description: result.message || "다시 확인해주세요.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('추천인 코드 확인 오류:', error);
      toast({
        title: "오류가 발생했습니다",
        description: error.message || "추천인 코드 확인에 실패했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 공유 기능
  const handleShare = async (platform: string) => {
    const url = window.location.href;
    const title = `${product?.name} - Talez 쇼핑몰`;
    const description = product?.description || '';

    try {
      switch (platform) {
        case 'copy':
          await navigator.clipboard.writeText(url);
          toast({
            title: "링크가 복사되었습니다",
            description: "클립보드에 상품 링크가 복사되었습니다.",
          });
          break;
          
        case 'kakao':
          if (window.Kakao) {
            window.Kakao.Share.sendDefault({
              objectType: 'commerce',
              content: {
                title: title,
                description: description,
                imageUrl: product?.imageUrl,
                link: {
                  webUrl: url,
                  mobileWebUrl: url,
                },
              },
              commerce: {
                productName: product?.name,
                regularPrice: product?.price,
                discountPrice: finalPrice,
                discountRate: product?.discountRate,
              },
            });
          } else {
            window.open(`https://story.kakao.com/share?url=${encodeURIComponent(url)}`);
          }
          break;
          
        case 'linkedin':
          window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`);
          break;
          
        default:
          break;
      }
      
      // 공유 이벤트 추적
      if (typeof gtag !== 'undefined') {
        gtag('event', 'share', {
          method: platform,
          content_type: 'product',
          item_id: product?.id
        });
      }
    } catch (error) {
      console.error('공유 오류:', error);
      toast({
        title: "공유에 실패했습니다",
        description: "다시 시도해주세요.",
        variant: "destructive",
      });
    }
  };

  // 상품을 찾지 못했을 때 로딩 상태 표시
  if (!product) {
    return (
      <div className="container mx-auto py-10 px-4">
        <div className="flex items-center justify-center h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  // 할인이 적용된 가격 계산
  const discountedPrice = product.discountRate 
    ? Math.round(product.price * (1 - product.discountRate / 100)) 
    : product.price;

  // 추천인 코드 할인이 적용된 최종 가격 계산
  const finalPriceCalculated = isReferralApplied 
    ? Math.round(discountedPrice * (1 - referralDiscount / 100)) 
    : discountedPrice;

  // finalPrice 상태 실시간 업데이트
  React.useEffect(() => {
    setFinalPrice(finalPriceCalculated);
  }, [finalPriceCalculated]);

  return (
    <div className="container mx-auto py-8 px-4">
      {/* 상품 내비게이션 */}
      <div className="flex items-center text-sm text-gray-500 mb-6">
        <a href="/shop" className="hover:text-primary">쇼핑</a>
        <ChevronRight className="w-4 h-4 mx-1" />
        <a href={`/shop?category=${product.category}`} className="hover:text-primary">
          {product.category === 'training' && '훈련용품'}
          {product.category === 'toys' && '장난감'}
          {product.category === 'accessories' && '액세서리'}
          {product.category === 'food' && '사료/간식'}
          {product.category === 'grooming' && '그루밍'}
        </a>
        <ChevronRight className="w-4 h-4 mx-1" />
        <span className="text-gray-700 font-medium">{product.name}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* 왼쪽: 상품 이미지 */}
        <div>
          <div className="bg-gray-50 rounded-lg overflow-hidden mb-4">
            <img 
              src={product.images?.[activeImageIndex] || product.imageUrl} 
              alt={product.name} 
              className="w-full h-auto object-cover"
            />
          </div>

          {/* 이미지 썸네일 */}
          {product.images && product.images.length > 1 && (
            <div className="flex space-x-2 overflow-x-auto">
              {product.images.map((image, index) => (
                <button 
                  key={index}
                  onClick={() => setActiveImageIndex(index)}
                  className={`w-20 h-20 rounded-md overflow-hidden border-2 ${
                    activeImageIndex === index ? 'border-primary' : 'border-transparent'
                  }`}
                >
                  <img 
                    src={image} 
                    alt={`${product.name} ${index + 1}`}
                    className="w-full h-full object-cover" 
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 오른쪽: 상품 정보 */}
        <div>
          <div className="flex flex-wrap gap-2 mb-2">
            {product.isNew && (
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">신상품</Badge>
            )}
            {product.isBestSeller && (
              <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">베스트셀러</Badge>
            )}
            {product.isOnSale && (
              <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">세일</Badge>
            )}
          </div>

          <h1 className="text-2xl font-bold mb-2">{product.name}</h1>

          <div className="flex items-center mb-4">
            <div className="flex">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-4 h-4 ${
                    star <= Math.floor(product.rating)
                      ? 'text-warning fill-warning'
                      : star <= product.rating
                      ? 'text-warning fill-warning opacity-50'
                      : 'text-gray-300'
                  }`}
                />
              ))}
            </div>
            <span className="ml-2 text-sm font-medium">{product.rating}</span>
            <span className="mx-2 text-gray-300">|</span>
            <span className="text-sm text-gray-600">리뷰 {product.reviewCount}개</span>
          </div>

          <div className="mb-6">
            {product.discountRate ? (
              <div className="flex items-center">
                <span className="text-xl font-bold mr-2">{finalPrice.toLocaleString()}원</span>
                <span className="text-gray-500 line-through">{product.price.toLocaleString()}원</span>
                <Badge variant="destructive" className="ml-2">
                  {product.discountRate}% 할인
                </Badge>
              </div>
            ) : (
              <span className="text-xl font-bold">{finalPrice.toLocaleString()}원</span>
            )}

            {isReferralApplied && (
              <div className="mt-1 text-sm text-success flex items-center">
                <Check className="w-4 h-4 mr-1" />
                추천인 코드 {referralDiscount}% 할인 적용됨
              </div>
            )}
          </div>

          <Separator className="my-4" />

          <div className="mb-6">
            <p className="text-gray-700">{product.description}</p>
          </div>

          {/* 색상 선택 */}
          {product.options?.color && (
            <div className="mb-4">
              <Label className="block text-sm font-medium mb-2">색상</Label>
              <div className="flex flex-wrap gap-2">
                {product.options.color.map((color) => (
                  <Button
                    key={color}
                    type="button"
                    onClick={() => setSelectedColor(color)}
                    variant={selectedColor === color ? "default" : "outline"}
                    className="px-4"
                  >
                    {color}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* 사이즈 선택 */}
          {product.options?.size && (
            <div className="mb-4">
              <Label className="block text-sm font-medium mb-2">사이즈</Label>
              <div className="flex flex-wrap gap-2">
                {product.options.size.map((size) => (
                  <Button
                    key={size}
                    type="button"
                    onClick={() => setSelectedSize(size)}
                    variant={selectedSize === size ? "default" : "outline"}
                    className="w-12"
                  >
                    {size}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* 수량 선택 */}
          <div className="mb-6">
            <Label className="block text-sm font-medium mb-2">수량</Label>
            <div className="flex items-center">
              <Button 
                type="button" 
                variant="outline" 
                size="icon" 
                onClick={decreaseQuantity}
                disabled={quantity <= 1}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="w-12 text-center">{quantity}</span>
              <Button 
                type="button" 
                variant="outline" 
                size="icon" 
                onClick={increaseQuantity}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* 추천인 코드 입력 */}
          {product.referralCommission && !isReferralApplied && (
            <div className="mb-6">
              <Label className="block text-sm font-medium mb-2">추천인 코드</Label>
              <div className="flex">
                <Input
                  type="text"
                  placeholder="추천인 코드 입력"
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value)}
                  className="mr-2"
                />
                <Button onClick={applyReferralCode}>적용</Button>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                추천인 코드를 입력하면 {product.referralCommission}% 할인이 적용됩니다.
              </p>
            </div>
          )}

          {/* 주문 정보 */}
          <div className="bg-gray-50 p-4 rounded-lg mb-6">
            <div className="flex justify-between mb-2">
              <span className="text-gray-600">상품 금액</span>
              <span>{product.price.toLocaleString()}원</span>
            </div>

            {product.discountRate && (
              <div className="flex justify-between mb-2 text-destructive">
                <span>상품 할인</span>
                <span>-{Math.round(product.price * product.discountRate / 100).toLocaleString()}원</span>
              </div>
            )}

            {isReferralApplied && (
              <div className="flex justify-between mb-2 text-success">
                <span>추천인 할인</span>
                <span>-{Math.round(discountedPrice * referralDiscount / 100).toLocaleString()}원</span>
              </div>
            )}

            <Separator className="my-2" />

            <div className="flex justify-between font-bold">
              <span>결제 예상 금액</span>
              <span>{(finalPrice * quantity).toLocaleString()}원</span>
            </div>
          </div>

          {/* 주문 버튼 */}
          <div className="flex gap-2 mb-6">
            <Button 
              className="flex-1" 
              onClick={addToCart}
              disabled={!product.inStock}
            >
              <ShoppingCart className="w-4 h-4 mr-2" />
              장바구니에 담기
            </Button>

            <Button 
              variant={isWishlist ? "default" : "outline"} 
              onClick={toggleWishlist}
            >
              <Heart className={`w-4 h-4 ${isWishlist ? "fill-current" : ""}`} />
            </Button>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline">
                  <Share2 className="w-4 h-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto">
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <h4 className="font-medium leading-none">공유하기</h4>
                    <p className="text-sm text-muted-foreground">
                      다양한 플랫폼에 공유하세요.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" className="h-8" onClick={() => handleShare('copy')}>
                      복사
                    </Button>
                    <Button size="sm" variant="outline" className="h-8" onClick={() => handleShare('kakao')}>
                      카카오
                    </Button>
                    <Button size="sm" variant="outline" className="h-8" onClick={() => handleShare('linkedin')}>
                      링크드인
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* 배송 및 반품 정보 */}
          <div className="space-y-2 text-sm">
            <div className="flex items-start">
              <Truck className="w-4 h-4 mr-2 mt-0.5 text-gray-500" />
              <div>
                <p className="font-medium">무료 배송</p>
                <p className="text-gray-600">3만원 이상 구매 시 무료 배송</p>
              </div>
            </div>

            <div className="flex items-start">
              <Shield className="w-4 h-4 mr-2 mt-0.5 text-gray-500" />
              <div>
                <p className="font-medium">안전 결제</p>
                <p className="text-gray-600">모든 결제는 안전하게 보호됩니다</p>
              </div>
            </div>

            <div className="flex items-start">
              <RotateCcw className="w-4 h-4 mr-2 mt-0.5 text-gray-500" />
              <div>
                <p className="font-medium">30일 이내 무료 반품</p>
                <p className="text-gray-600">제품에 만족하지 않으시면 30일 이내에 무료로 반품하세요</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 상품 상세 정보 탭 */}
      <div className="mt-12">
        <Tabs defaultValue="description">
          <TabsList className="w-full justify-start border-b mb-0 rounded-none">
            <TabsTrigger value="description" className="rounded-b-none">상세 설명</TabsTrigger>
            <TabsTrigger value="specifications" className="rounded-b-none">제품 스펙</TabsTrigger>
            <TabsTrigger value="reviews" className="rounded-b-none">리뷰 ({reviews.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="description" className="pt-6">
            <div className="prose prose-lg max-w-none dark:prose-invert">
              <p>{product.longDescription || product.description}</p>

              {product.features && (
                <div className="mt-8 grid md:grid-cols-2 gap-6">
                  {product.features.map((feature, idx) => (
                    <Card key={idx}>
                      <CardContent className="pt-6">
                        <h3 className="text-lg font-medium flex items-center mb-2">
                          <BadgeCheck className="w-5 h-5 mr-2 text-primary" />
                          {feature.title}
                        </h3>
                        <p className="text-gray-600">{feature.description}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="specifications" className="pt-6">
            {product.specifications ? (
              <ul className="space-y-2">
                {product.specifications.map((spec, idx) => (
                  <li key={idx} className="flex items-start">
                    <Check className="w-4 h-4 mr-2 mt-1 text-primary" />
                    <span>{spec}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-600">제품 스펙 정보가 없습니다.</p>
            )}
          </TabsContent>

          <TabsContent value="reviews" className="pt-6">
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-4">고객 리뷰</h3>

              <div className="flex items-center mb-6">
                <div className="flex items-center mr-4">
                  <span className="text-3xl font-bold mr-2">{product.rating}</span>
                  <div className="flex flex-col">
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-4 h-4 ${
                            star <= product.rating
                              ? 'text-warning fill-warning'
                              : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-sm text-gray-600">{product.reviewCount} 리뷰</span>
                  </div>
                </div>

                <Button variant="outline">리뷰 작성하기</Button>
              </div>

              <div className="space-y-6">
                {reviews.map((review) => (
                  <div key={review.id} className="border-b pb-6">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center">
                        <Avatar className="h-8 w-8 mr-2">
                          <AvatarImage src={review.userAvatar} alt={review.userName} />
                          <AvatarFallback>{review.userName[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center">
                            <span className="font-medium mr-2">{review.userName}</span>
                            {review.verified && (
                              <Badge variant="outline" className="bg-success/10 text-success border-success/30 flex items-center h-5">
                                <Check className="w-3 h-3 mr-1" />
                                구매 확인
                              </Badge>
                            )}
                          </div>
                          <div className="flex text-sm text-gray-500">
                            <span>{review.date}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-4 h-4 ${
                              star <= review.rating
                                ? 'text-warning fill-warning'
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                    </div>

                    <p className="text-gray-70 mb-3">{review.comment}</p>

                    {review.images && review.images.length > 0 && (
                      <div className="flex space-x-2 mb-3">
                        {review.images.map((image, idx) => (
                          <div key={idx} className="w-20 h-20 rounded-md overflow-hidden">
                            <img 
                              src={image} 
                              alt={`리뷰 이미지 ${idx + 1}`}
                              className="w-full h-full object-cover" 
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex text-sm">
                      <Button variant="ghost" size="sm" className="h-8 text-xs">
                        도움이 됐어요 ({review.helpful || 0})
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 text-xs">
                        신고
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* 관련 상품 */}
      {product.relatedProducts && product.relatedProducts.length > 0 && (
        <div className="mt-12">
          <h2 className="text-2xl font-bold mb-6">관련 상품</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {productList
              .filter(p => product.relatedProducts?.includes(p.id))
              .map(relatedProduct => (
                <Card key={relatedProduct.id} className="overflow-hidden hover:shadow-md transition-shadow">
                  <a href={`/shop/product/${relatedProduct.id}`} className="block">
                    <div className="aspect-square overflow-hidden">
                      <img 
                        src={relatedProduct.imageUrl} 
                        alt={relatedProduct.name}
                        className="w-full h-full object-cover transition-transform hover:scale-105"  
                      />
                    </div>

                    <CardContent className="p-4">
                      <h3 className="font-medium text-base line-clamp-2 mb-1">{relatedProduct.name}</h3>

                      <div className="flex items-center mb-2">
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`w-3 h-3 ${
                                star <= relatedProduct.rating
                                  ? 'text-warning fill-warning'
                                  : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="ml-1 text-xs text-gray-600">({relatedProduct.reviewCount})</span>
                      </div>

                      <div className="flex items-center">
                        {relatedProduct.discountRate ? (
                          <>
                            <span className="font-bold">{Math.round(relatedProduct.price * (1 - relatedProduct.discountRate / 100)).toLocaleString()}원</span>
                            <span className="ml-1 text-xs text-gray-500 line-through">{relatedProduct.price.toLocaleString()}원</span>
                          </>
                        ) : (
                          <span className="font-bold">{relatedProduct.price.toLocaleString()}원</span>
                        )}
                      </div>
                    </CardContent>
                  </a>
                </Card>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}