import { ShoppingBag, Search, Star, Filter } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useCart } from '@/context/cart-context';
import { useQuery } from '@tanstack/react-query';

// 상품 타입 정의
interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  discountRate?: number;
  image: string;
  imageUrl?: string;
  category: string;
  categoryId?: number;
  rating?: number;
  reviewCount?: number;
  inStock: boolean;
  isActive?: boolean;
  isNew?: boolean;
  isBestseller?: boolean;
}

export default function SimpleShopPage() {
  const auth = useAuth();
  const { addToCart } = useCart();

  // DB에서 상품 목록 가져오기
  const { data, isLoading } = useQuery<{ success: boolean; products: Product[] }>({
    queryKey: ['/api/shop/products']
  });

  const products = data?.products || [];

  const handleAddToCart = (product: Product) => {
    addToCart({
      productId: product.id,
      name: product.name,
      price: product.price,
      discountedPrice: product.discountRate 
        ? Math.round(product.price * (1 - product.discountRate / 100)) 
        : undefined,
      quantity: 1,
      imageUrl: product.image || product.imageUrl || '',
      inStock: product.inStock ?? true
    });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center">
          <p className="text-lg">상품을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-8">쇼핑</h1>
      
      {/* 상품 검색 필터 */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md mb-8">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input 
              type="text" 
              placeholder="상품 검색..." 
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-700 dark:text-white" 
            />
          </div>
          <div className="flex gap-2">
            <select className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-700 dark:text-white">
              <option value="all">모든 카테고리</option>
              <option value="food">사료/간식</option>
              <option value="toy">장난감</option>
              <option value="fashion">의류/패션</option>
              <option value="health">건강/위생</option>
            </select>
            <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
              <Filter size={20} />
              <span className="hidden md:inline">필터</span>
            </button>
          </div>
        </div>
      </div>
      
      {/* 상품 그리드 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {products.length === 0 && (
          <div className="col-span-full text-center text-gray-500 py-8">
            등록된 상품이 없습니다.
          </div>
        )}
        {products.map(product => (
          <div 
            key={product.id} 
            className="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden flex flex-col h-full"
          >
            <div className="relative h-48 overflow-hidden">
              <img 
                src={product.image || product.imageUrl || '/placeholder.jpg'} 
                alt={product.name} 
                className="w-full h-full object-cover transition-transform hover:scale-105" 
              />
              {product.isNew && (
                <span className="absolute top-2 left-2 bg-success text-white text-xs font-bold px-2 py-1 rounded">
                  NEW
                </span>
              )}
              {product.isBestseller && (
                <span className="absolute top-2 right-2 bg-destructive text-white text-xs font-bold px-2 py-1 rounded">
                  인기
                </span>
              )}
              {product.discountRate && (
                <span className="absolute bottom-2 left-2 bg-warning text-white text-xs font-bold px-2 py-1 rounded">
                  {product.discountRate}% OFF
                </span>
              )}
            </div>
            
            <div className="p-4 flex-1 flex flex-col">
              {product.rating && product.reviewCount && (
                <div className="flex items-center mb-1">
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <Star 
                        key={i} 
                        className={`w-4 h-4 ${
                          i < Math.floor(product.rating || 0) 
                            ? 'fill-warning text-warning' 
                            : 'text-gray-300'
                        }`} 
                      />
                    ))}
                  </div>
                  <span className="text-sm text-gray-500 ml-1">({product.reviewCount})</span>
                </div>
              )}
              
              <h3 className="text-lg font-semibold mb-1">{product.name}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">{product.description}</p>
              
              <div className="flex justify-between items-center mt-auto">
                <div>
                  {product.discountRate ? (
                    <div>
                      <span className="text-gray-500 line-through text-sm">
                        {product.price.toLocaleString()}원
                      </span>
                      <div className="font-bold text-lg">
                        {Math.round(product.price * (1 - product.discountRate / 100)).toLocaleString()}원
                      </div>
                    </div>
                  ) : (
                    <span className="font-bold text-lg">{product.price.toLocaleString()}원</span>
                  )}
                </div>
                
                <button 
                  className={`p-2 rounded-md ${
                    product.inStock 
                      ? 'bg-primary text-white hover:bg-primary/90' 
                      : 'bg-gray-300 text-gray-700 cursor-not-allowed'
                  }`}
                  onClick={() => product.inStock && handleAddToCart(product)}
                  disabled={!product.inStock}
                >
                  <ShoppingBag size={20} />
                </button>
              </div>
              
              {!product.inStock && (
                <p className="text-destructive text-sm mt-2">품절되었습니다</p>
              )}
            </div>
          </div>
        ))}
      </div>
      
      {/* 디버깅 정보 */}
      <div className="mt-8 p-4 text-center">
        <p>쇼핑 페이지가 정상적으로 로드되었습니다!</p>
        <div className="bg-success/10 dark:bg-success/20 p-4 rounded-lg mt-2 inline-block">
          <p>Path: <code>{window.location.pathname}</code></p>
        </div>
      </div>
    </div>
  );
}