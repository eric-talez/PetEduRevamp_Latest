import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'wouter';
import { 
  ShoppingCart, 
  ShoppingBag, 
  X, 
  Plus, 
  Minus, 
  Truck, 
  Shield, 
  RotateCcw,
  CreditCard,
  Star,
  Gift,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useClickAway } from '@/hooks/use-mobile';

interface CartItem {
  id: number;
  name: string;
  image?: string;
  price: number;
  quantity: number;
  discountRate?: number;
  option?: string;
}

interface MiniCartProps {
  isOpen: boolean;
  onClose: () => void;
  onToggle: () => void;
}

const FREE_SHIPPING_THRESHOLD = 30000;

export function MiniCart({ isOpen, onClose, onToggle }: MiniCartProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const containerRef = useClickAway<HTMLDivElement>(onClose);

  useEffect(() => {
    loadCartItems();
    
    const handleCartUpdate = () => loadCartItems();
    window.addEventListener('cartUpdated', handleCartUpdate);
    window.addEventListener('storage', handleCartUpdate);
    
    return () => {
      window.removeEventListener('cartUpdated', handleCartUpdate);
      window.removeEventListener('storage', handleCartUpdate);
    };
  }, []);

  const loadCartItems = () => {
    try {
      const stored = localStorage.getItem('petedu_cart');
      if (stored) {
        setCartItems(JSON.parse(stored));
      }
    } catch (error) {
      console.error('장바구니 로드 오류:', error);
    }
  };

  const saveCartItems = (items: CartItem[]) => {
    localStorage.setItem('petedu_cart', JSON.stringify(items));
    window.dispatchEvent(new CustomEvent('cartUpdated', { detail: { cartItems: items } }));
  };

  const updateQuantity = (id: number, newQuantity: number) => {
    if (newQuantity < 1) return;
    const updated = cartItems.map(item =>
      item.id === id ? { ...item, quantity: newQuantity } : item
    );
    setCartItems(updated);
    saveCartItems(updated);
  };

  const removeItem = (id: number) => {
    const item = cartItems.find(i => i.id === id);
    const updated = cartItems.filter(i => i.id !== id);
    setCartItems(updated);
    saveCartItems(updated);
    
    if (item) {
      toast({
        title: "상품이 삭제되었습니다",
        description: item.name,
      });
    }
  };

  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  
  const cartTotal = cartItems.reduce((total, item) => {
    const price = item.discountRate 
      ? item.price * (1 - item.discountRate / 100) 
      : item.price;
    return total + (price * item.quantity);
  }, 0);

  const remainingForFreeShipping = Math.max(0, FREE_SHIPPING_THRESHOLD - cartTotal);
  const freeShippingProgress = Math.min(100, (cartTotal / FREE_SHIPPING_THRESHOLD) * 100);

  const handleCheckout = () => {
    onClose();
    setLocation('/shop/checkout');
  };

  const handleViewCart = () => {
    onClose();
    setLocation('/shop/cart');
  };

  return (
    <div className="relative" ref={containerRef}>
      <Button
        variant="ghost"
        size="icon"
        className="min-w-[44px] min-h-[44px] w-11 h-11 relative transition-all duration-200 hover:scale-110 hover:text-primary focus:ring-2 focus:ring-primary focus:ring-offset-1 dark:focus:ring-offset-gray-900"
        onClick={onToggle}
        aria-label="장바구니"
        aria-expanded={isOpen}
      >
        <ShoppingCart className={`h-5 w-5 ${cartCount > 0 ? 'text-primary' : ''}`} />
        {cartCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full min-w-[18px] h-[18px] text-xs flex items-center justify-center font-bold animate-pulse px-1">
            {cartCount > 99 ? '99+' : cartCount}
          </span>
        )}
      </Button>

      {isOpen && (
        <div 
          className="absolute right-0 mt-2 w-[360px] sm:w-[400px] bg-white dark:bg-gray-900 rounded-xl shadow-2xl z-50 border border-gray-200 dark:border-gray-700 overflow-hidden"
          role="dialog"
          aria-label="장바구니 미리보기"
        >
          <div className="bg-gradient-to-r from-primary/10 to-primary/5 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-gray-900 dark:text-white">장바구니</h3>
              </div>
              <Badge variant="secondary" className="text-xs">
                {cartCount}개 상품
              </Badge>
            </div>
          </div>

          {cartItems.length > 0 && (
            <div className="px-4 py-3 bg-gradient-to-r from-primary/5 to-transparent border-b border-gray-100 dark:border-gray-800">
              {remainingForFreeShipping > 0 ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                      <Truck className="h-4 w-4 text-primary" />
                      <span>무료배송까지</span>
                    </div>
                    <span className="font-semibold text-primary">
                      {remainingForFreeShipping.toLocaleString()}원 남음
                    </span>
                  </div>
                  <Progress value={freeShippingProgress} className="h-2" />
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {FREE_SHIPPING_THRESHOLD.toLocaleString()}원 이상 구매 시 무료배송!
                  </p>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                  <Gift className="h-4 w-4" />
                  <span className="font-medium">🎉 무료배송 적용 가능!</span>
                </div>
              )}
            </div>
          )}

          <div className="max-h-[300px] overflow-y-auto">
            {cartItems.length > 0 ? (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {cartItems.slice(0, 5).map((item) => {
                  const finalPrice = item.discountRate 
                    ? item.price * (1 - item.discountRate / 100) 
                    : item.price;
                  
                  return (
                    <div key={item.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <div className="flex gap-3">
                        <div className="flex-shrink-0 w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
                          {item.image ? (
                            <img 
                              src={item.image} 
                              alt={item.name} 
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ShoppingBag className="h-6 w-6 text-gray-400" />
                            </div>
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start">
                            <div className="flex-1 pr-2">
                              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                {item.name}
                              </p>
                              {item.option && (
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                  {item.option}
                                </p>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-gray-400 hover:text-red-500"
                              onClick={() => removeItem(item.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                          
                          <div className="flex justify-between items-center mt-2">
                            <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-full">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
                                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                disabled={item.quantity <= 1}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="w-6 text-center text-sm font-medium">
                                {item.quantity}
                              </span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
                                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                            
                            <div className="text-right">
                              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                {(finalPrice * item.quantity).toLocaleString()}원
                              </span>
                              {item.discountRate && (
                                <span className="block text-xs text-gray-400 line-through">
                                  {(item.price * item.quantity).toLocaleString()}원
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                
                {cartItems.length > 5 && (
                  <div className="p-3 text-center text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50">
                    +{cartItems.length - 5}개 상품 더보기
                  </div>
                )}
              </div>
            ) : (
              <div className="py-12 text-center">
                <ShoppingBag className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                <p className="text-gray-500 dark:text-gray-400 mb-1">장바구니가 비어있습니다</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">
                  마음에 드는 상품을 담아보세요!
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onClose();
                    setLocation('/shop');
                  }}
                >
                  쇼핑하러 가기
                </Button>
              </div>
            )}
          </div>

          {cartItems.length > 0 && (
            <>
              <Separator />
              
              <div className="p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">소계</span>
                  <span className="text-lg font-bold text-gray-900 dark:text-white">
                    {cartTotal.toLocaleString()}원
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    onClick={handleViewCart}
                    className="w-full"
                  >
                    장바구니 보기
                  </Button>
                  <Button
                    onClick={handleCheckout}
                    className="w-full bg-primary hover:bg-primary/90"
                  >
                    <CreditCard className="h-4 w-4 mr-1.5" />
                    결제하기
                  </Button>
                </div>
              </div>

              <div className="px-4 pb-4">
                <div className="flex items-center justify-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                  <div className="flex items-center gap-1">
                    <Shield className="h-3.5 w-3.5 text-green-500" />
                    <span>안전결제</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <RotateCcw className="h-3.5 w-3.5 text-blue-500" />
                    <span>7일 무료반품</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 text-yellow-500" />
                    <span>리뷰 4.8점</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export function FreeShippingProgressBar({ currentTotal }: { currentTotal: number }) {
  const remaining = Math.max(0, FREE_SHIPPING_THRESHOLD - currentTotal);
  const progress = Math.min(100, (currentTotal / FREE_SHIPPING_THRESHOLD) * 100);
  
  if (remaining <= 0) {
    return (
      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
        <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
          <Gift className="h-5 w-5" />
          <span className="font-medium">🎉 무료배송이 적용됩니다!</span>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Truck className="h-5 w-5 text-primary" />
          <span className="font-medium text-gray-900 dark:text-white">무료배송까지</span>
        </div>
        <span className="text-lg font-bold text-primary">
          {remaining.toLocaleString()}원 남음
        </span>
      </div>
      <Progress value={progress} className="h-3" />
      <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
        {FREE_SHIPPING_THRESHOLD.toLocaleString()}원 이상 구매 시 무료배송!
      </p>
    </div>
  );
}

export function TrustBadges() {
  return (
    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 space-y-3">
      <h4 className="text-sm font-semibold text-gray-900 dark:text-white">안심 쇼핑 보장</h4>
      
      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-start gap-2">
          <div className="flex-shrink-0 w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
            <Shield className="h-4 w-4 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">안전결제</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">SSL 암호화 적용</p>
          </div>
        </div>
        
        <div className="flex items-start gap-2">
          <div className="flex-shrink-0 w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
            <RotateCcw className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">7일 반품</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">무료 반품 보장</p>
          </div>
        </div>
        
        <div className="flex items-start gap-2">
          <div className="flex-shrink-0 w-8 h-8 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center">
            <Star className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">고객 리뷰</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">평점 4.8/5.0</p>
          </div>
        </div>
        
        <div className="flex items-start gap-2">
          <div className="flex-shrink-0 w-8 h-8 bg-primary/10 dark:bg-primary/20 rounded-full flex items-center justify-center">
            <Truck className="h-4 w-4 text-primary dark:text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">빠른 배송</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">당일/익일 배송</p>
          </div>
        </div>
      </div>
      
      <Separator />
      
      <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
        <p>• 상품 수령 후 7일 이내 무료 반품 가능</p>
        <p>• 개봉하지 않은 상품에 한해 전액 환불</p>
        <p>• 불량/오배송 시 100% 교환 및 환불</p>
      </div>
    </div>
  );
}

export function RecommendedProducts({ onAddToCart }: { onAddToCart?: (product: any) => void }) {
  const recommendedProducts = [
    { id: 101, name: '프리미엄 강아지 간식', price: 12000, image: '/attached_assets/KakaoTalk_Photo_2025-07-05-22-37-00 001_1751722697059.png' },
    { id: 102, name: '강아지 훈련용 클리커', price: 8000, image: '/attached_assets/image_1746582251297.png' },
    { id: 103, name: '펫 샴푸 세트', price: 25000, image: '/attached_assets/KakaoTalk_Photo_2025-07-05-22-37-00 002_1751722697071.png' },
  ];
  
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
      <h4 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
        <Gift className="h-4 w-4 text-primary" />
        함께 구매하면 좋은 상품
      </h4>
      
      <div className="space-y-3">
        {recommendedProducts.map(product => (
          <div key={product.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden flex-shrink-0">
              <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{product.name}</p>
              <p className="text-sm text-primary font-semibold">{product.price.toLocaleString()}원</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="flex-shrink-0"
              onClick={() => onAddToCart?.(product)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CartAbandonmentNotification() {
  const [show, setShow] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  
  useEffect(() => {
    const checkCart = () => {
      try {
        const stored = localStorage.getItem('petedu_cart');
        if (stored) {
          const items = JSON.parse(stored);
          setCartCount(items.length);
          
          const lastVisit = localStorage.getItem('petedu_cart_last_visit');
          const now = Date.now();
          
          if (items.length > 0 && lastVisit) {
            const timeDiff = now - parseInt(lastVisit);
            if (timeDiff > 24 * 60 * 60 * 1000) {
              setShow(true);
            }
          }
          
          localStorage.setItem('petedu_cart_last_visit', now.toString());
        }
      } catch (error) {
        console.error('장바구니 확인 오류:', error);
      }
    };
    
    const timer = setTimeout(checkCart, 3000);
    return () => clearTimeout(timer);
  }, []);
  
  if (!show || cartCount === 0) return null;
  
  return (
    <div className="fixed bottom-4 right-4 z-50 animate-slide-up">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 p-4 max-w-sm">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
            <ShoppingCart className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-gray-900 dark:text-white">
              장바구니에 상품이 있어요!
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {cartCount}개의 상품이 기다리고 있습니다.
            </p>
            <div className="flex gap-2 mt-3">
              <Link href="/shop/cart">
                <Button size="sm" className="bg-primary hover:bg-primary/90">
                  장바구니 보기
                </Button>
              </Link>
              <Button 
                size="sm" 
                variant="ghost"
                onClick={() => setShow(false)}
              >
                닫기
              </Button>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setShow(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
