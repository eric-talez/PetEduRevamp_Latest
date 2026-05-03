import React from 'react';
import { Link } from 'wouter';
import { ShoppingBag, Trash2, Plus, Minus, ArrowLeft, ShoppingCart, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCart } from '@/context/cart-context';

export default function Cart() {
  const { 
    cartItems, 
    removeFromCart, 
    updateQuantity, 
    toggleItemSelection, 
    toggleAllSelection,
    calculateSubtotal,
    calculateTotal,
    selectedItemCount
  } = useCart();
  
  // 전체 선택 상태 계산
  const allSelected = cartItems.length > 0 && cartItems.every(item => item.isSelected);
  
  // 장바구니가 비어있는지 확인
  const isCartEmpty = cartItems.length === 0;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* 상단 헤더 */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold flex items-center">
          <ShoppingCart className="mr-2 h-6 w-6" />
          장바구니
        </h1>
        <Link href="/shop">
          <Button variant="ghost" className="flex items-center">
            <ArrowLeft className="mr-2 h-4 w-4" />
            쇼핑 계속하기
          </Button>
        </Link>
      </div>
      
      {isCartEmpty ? (
        // 빈 장바구니 표시
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="mb-6 flex justify-center">
            <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
              <ShoppingCart className="h-10 w-10 text-gray-400" />
            </div>
          </div>
          <h2 className="text-xl font-medium mb-4">장바구니가 비어있습니다</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-8">상품을 담아 주세요</p>
          <Link href="/shop">
            <Button className="px-6">쇼핑하러 가기</Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-8 lg:grid-cols-3">
          {/* 상품 목록 */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
              {/* 테이블 헤더 */}
              <div className="border-b border-gray-200 dark:border-gray-700 p-4">
                <div className="flex items-center">
                  <label className="inline-flex items-center">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-primary focus:ring-primary"
                      checked={allSelected}
                      onChange={(e) => toggleAllSelection(e.target.checked)}
                    />
                    <span className="ml-2 text-sm font-medium">전체선택 ({selectedItemCount}/{cartItems.length})</span>
                  </label>
                </div>
              </div>
              
              {/* 상품 목록 */}
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {cartItems.map((item) => (
                  <div key={item.id} className="p-4">
                    <div className="flex items-start">
                      <div className="flex items-center h-5 mt-1">
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 text-primary focus:ring-primary"
                          checked={item.isSelected}
                          onChange={(e) => toggleItemSelection(item.id, e.target.checked)}
                        />
                      </div>
                      
                      <div className="ml-4 flex-1 flex flex-col sm:flex-row">
                        {/* 상품 이미지 및 정보 */}
                        <div className="flex-shrink-0 w-full sm:w-auto mb-4 sm:mb-0">
                          <div className="flex items-center">
                            <img 
                              src={item.imageUrl} 
                              alt={item.name}
                              className="w-20 h-20 object-cover rounded-md"
                            />
                            <div className="ml-4">
                              <h3 className="text-sm font-medium">{item.name}</h3>
                              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                {item.discountedPrice ? 
                                  <>
                                    <span className="font-medium">{item.discountedPrice.toLocaleString()}원</span>
                                    <span className="line-through ml-2 text-xs">{item.price.toLocaleString()}원</span>
                                  </> : 
                                  <span className="font-medium">{item.price.toLocaleString()}원</span>
                                }
                              </p>
                              {!item.inStock && (
                                <span className="text-xs text-destructive mt-1">품절</span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {/* 수량 조절 및 가격 */}
                        <div className="flex-1 flex flex-col sm:flex-row sm:items-center sm:justify-end sm:space-x-4">
                          {/* 수량 조절 */}
                          <div className="flex items-center border border-gray-300 dark:border-gray-600 rounded-md mb-4 sm:mb-0">
                            <button
                              className="px-2 py-1 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                              onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                              disabled={!item.inStock}
                            >
                              <Minus className="h-4 w-4" />
                            </button>
                            <span className="px-4 py-1">{item.quantity}</span>
                            <button
                              className="px-2 py-1 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              disabled={!item.inStock}
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          </div>
                          
                          {/* 가격 및 삭제 버튼 */}
                          <div className="flex items-center justify-between sm:justify-end sm:space-x-4">
                            <div className="text-right">
                              <p className="font-medium">
                                {((item.discountedPrice || item.price) * item.quantity).toLocaleString()}원
                              </p>
                            </div>
                            <button
                              className="text-gray-500 hover:text-destructive"
                              onClick={() => removeFromCart(item.id)}
                            >
                              <Trash2 className="h-5 w-5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* 주문 요약 */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 sticky top-4">
              <h2 className="text-lg font-bold mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">주문 요약</h2>
              
              <div className="space-y-3 mb-6">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">상품 금액</span>
                  <span className="font-medium">{calculateSubtotal().toLocaleString()}원</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">배송비</span>
                  <span className="font-medium">3,000원</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">할인</span>
                  <span className="font-medium text-destructive">-2,000원</span>
                </div>
              </div>
              
              <div className="border-t border-b border-gray-200 dark:border-gray-700 py-4 mb-6">
                <div className="flex justify-between items-center">
                  <span className="font-bold">결제 금액</span>
                  <span className="font-bold text-xl">{calculateTotal().toLocaleString()}원</span>
                </div>
              </div>
              
              <Button className="w-full mb-3" size="lg" disabled={selectedItemCount === 0}>
                {selectedItemCount}개 상품 주문하기
              </Button>
              
              <div className="text-xs text-gray-500 dark:text-gray-400">
                주문 시 개인정보 처리방침 및 이용약관에 동의하게 됩니다.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}