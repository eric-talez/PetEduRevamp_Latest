import React, { useState, useEffect } from 'react';
import { ShoppingBag, Package2, Search, Sun, Moon, ChevronRight, Star } from 'lucide-react';
import { useLocation } from "wouter";
import { useTheme } from "@/context/theme-context";

/**
 * 쇼핑몰 메인 페이지 컴포넌트
 * - React 라우트로 접근 가능한 쇼핑 페이지
 * - 기존의 정적 HTML 페이지 기능을 React 컴포넌트로 구현
 */
export default function ShopPage() {
  const [currentSlide, setCurrentSlide] = useState<number>(0);
  const totalSlides = 3;
  const [, setLocation] = useLocation();
  
  // ThemeProvider의 테마 상태 사용
  const { theme, setTheme } = useTheme();
  
  // 현재 다크 모드 여부 계산
  const isDarkMode = theme === "dark" || 
    (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  
  // 다크 모드 토글
  const toggleDarkMode = () => {
    setTheme(isDarkMode ? "light" : "dark");
  };
  
  // 배너 슬라이더 자동 전환
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % totalSlides);
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);
  
  // 이전 슬라이드로 이동
  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + totalSlides) % totalSlides);
  };
  
  // 다음 슬라이드로 이동
  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % totalSlides);
  };
  
  // 상품 상세 페이지로 이동
  const goToProductDetail = (productId: number) => {
    setLocation(`/shop/product/${productId}`);
  };

  // 메인 서비스로 이동
  const goToMainService = () => {
    setLocation('/');
  };

  // 로그인 페이지로 이동
  const goToLogin = () => {
    setLocation('/auth');
  };

  // 회원가입 페이지로 이동
  const goToSignup = () => {
    setLocation('/auth');
  };

  // 마이페이지로 이동
  const goToMyPage = () => {
    setLocation('/mypage');
  };

  // 고객센터로 이동
  const goToCustomerService = () => {
    alert('고객센터 기능\n\n연락처: 1588-1234\n운영시간: 평일 09:00-18:00\n\n이메일: support@talez.com');
  };

  // 장바구니로 이동
  const goToCart = () => {
    setLocation('/shop/cart');
  };

  // 위시리스트로 이동
  const goToWishlist = () => {
    setLocation('/shop/wishlist');
  };

  // 쇼핑몰 홈으로 이동
  const goToShopHome = () => {
    setLocation('/shop');
  };
  
  // 샘플 카테고리 데이터
  const categories = [
    { id: 1, name: '강아지 사료', icon: '🍗', productCount: 45 },
    { id: 2, name: '강아지 간식', icon: '🦴', productCount: 38 },
    { id: 3, name: '강아지 용품', icon: '🐕', productCount: 67 },
    { id: 4, name: '고양이 사료', icon: '🐟', productCount: 32 },
    { id: 5, name: '고양이 간식', icon: '🍤', productCount: 29 },
    { id: 6, name: '고양이 용품', icon: '🐱', productCount: 52 },
    { id: 7, name: '교육용품', icon: '📚', productCount: 24 },
    { id: 8, name: '생일용품', icon: '🎁', productCount: 18 },
  ];
  
  // 샘플 베스트 상품 데이터
  const bestProducts = [
    {
      id: 1,
      name: '프리미엄 기능성 강아지 훈련 장난감',
      brand: '테일즈',
      price: 29800,
      originalPrice: 38000,
      discountRate: 22,
      image: '/attached_assets/KakaoTalk_Photo_2025-07-05-22-37-00 001_1751722697059.png',
      rating: 4.8,
      reviewCount: 128
    },
    {
      id: 2,
      name: '프리미엄 유기농 반려동물 수제 간식 세트',
      brand: '내추럴코어',
      price: 25500,
      originalPrice: 30000,
      discountRate: 15,
      image: '/attached_assets/KakaoTalk_Photo_2025-07-05-22-37-00 002_1751722697071.png',
      rating: 4.7,
      reviewCount: 96
    },
    {
      id: 3,
      name: '스마트 자동 급식기 - 앱 연동 가능',
      brand: '펫테크',
      price: 75000,
      originalPrice: 75000,
      discountRate: 0,
      image: '/attached_assets/KakaoTalk_Photo_2025-07-05-22-37-00 003_1751722697072.png',
      rating: 4.5,
      reviewCount: 75
    },
    {
      id: 4,
      name: '프리미엄 반려동물 캐리어 - 기내 반입 가능',
      brand: '애니홈',
      price: 48300,
      originalPrice: 69000,
      discountRate: 30,
      image: '/attached_assets/image_1746582251297.png',
      rating: 4.9,
      reviewCount: 154
    }
  ];

  // 메인 서비스로 이동
  const goToMainService = () => {
    setLocation('/');
  };

  return (
    <div className={`shop-page ${isDarkMode ? 'dark-mode' : ''}`}>
      {/* 유틸리티 네비게이션 */}
      <div className="utility-nav">
        <div className="container utility-nav-container">
          <ul className="utility-links">
            <li><a href="#" onClick={(e) => { e.preventDefault(); goToMainService(); }}>메인 서비스</a></li>
            <li><a href="#" onClick={(e) => { e.preventDefault(); goToLogin(); }}>로그인</a></li>
            <li><a href="#" onClick={(e) => { e.preventDefault(); goToSignup(); }}>회원가입</a></li>
            <li><a href="#" onClick={(e) => { e.preventDefault(); goToMyPage(); }}>마이페이지</a></li>
            <li><a href="#" onClick={(e) => { e.preventDefault(); goToCustomerService(); }}>고객센터</a></li>
          </ul>
        </div>
      </div>
      
      {/* 헤더 */}
      <header>
        <div className="container">
          <div className="header-top">
            <a href="#" className="logo" onClick={(e) => { e.preventDefault(); goToShopHome(); }}>
              <div className="logo-icon">
                <ShoppingBag size={24} />
              </div>
              <span className="logo-text">테일즈 샵</span>
            </a>
            
            <div className="search-container">
              <div className="search-input-wrapper">
                <input type="text" className="search-input" placeholder="상품을 검색해보세요" />
                <button type="submit" className="search-button">
                  <Search size={20} />
                </button>
              </div>
              <div className="search-suggestions">
                <div className="suggestion-category">인기 검색어</div>
                <ul className="suggestion-list">
                  <li className="suggestion-item">강아지 사료</li>
                  <li className="suggestion-item">고양이 장난감</li>
                  <li className="suggestion-item">강아지 옷</li>
                  <li className="suggestion-item">반려동물 케리어</li>
                  <li className="suggestion-item">자동급식기</li>
                </ul>
              </div>
            </div>
            
            <div className="user-actions">
              <button className="theme-toggle-btn" onClick={toggleDarkMode}>
                {isDarkMode ? <Moon size={24} /> : <Sun size={24} />}
              </button>
              
              <a href="#" className="action-item" onClick={(e) => { e.preventDefault(); goToMyPage(); }}>
                <div className="action-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                </div>
                <span>마이페이지</span>
              </a>
              
              <a href="#" className="action-item" onClick={(e) => { e.preventDefault(); goToWishlist(); }}>
                <div className="action-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"></path>
                  </svg>
                </div>
                <span>찜</span>
              </a>
              
              <a href="#" className="action-item" onClick={(e) => { e.preventDefault(); goToCart(); }}>
                <div className="action-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="9" cy="21" r="1"></circle>
                    <circle cx="20" cy="21" r="1"></circle>
                    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                  </svg>
                  <span className="badge">0</span>
                </div>
                <span>장바구니</span>
              </a>
            </div>
          </div>
        </div>
        
        {/* 메인 네비게이션 */}
        <div className="main-nav">
          <div className="container nav-container">
            <div className="category-menu">
              <div className="category-menu-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="3" y1="12" x2="21" y2="12"></line>
                  <line x1="3" y1="6" x2="21" y2="6"></line>
                  <line x1="3" y1="18" x2="21" y2="18"></line>
                </svg>
              </div>
              <span>카테고리</span>
              <div className="category-dropdown">
                <ul className="category-list">
                  {categories.map(category => (
                    <li key={category.id} className="category-item" onClick={() => setLocation(`/shop/category/${category.id}`)}>
                      <span>{category.name}</span>
                      <span className="category-item-icon">
                        <ChevronRight size={16} />
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            
            <ul className="nav-menu">
              <li className="nav-menu-item">
                <a href="#" className="nav-menu-link active" onClick={(e) => { e.preventDefault(); goToShopHome(); }}>홈</a>
              </li>
              <li className="nav-menu-item">
                <a href="#" className="nav-menu-link" onClick={(e) => { e.preventDefault(); setLocation('/shop/best'); }}>베스트</a>
              </li>
              <li className="nav-menu-item">
                <a href="#" className="nav-menu-link" onClick={(e) => { e.preventDefault(); setLocation('/shop/new'); }}>신상품</a>
              </li>
              <li className="nav-menu-item">
                <a href="#" className="nav-menu-link" onClick={(e) => { e.preventDefault(); setLocation('/shop/sale'); }}>특가</a>
              </li>
              <li className="nav-menu-item">
                <a href="#" className="nav-menu-link" onClick={(e) => { e.preventDefault(); setLocation('/shop/special'); }}>기획전</a>
              </li>
              <li className="nav-menu-item">
                <a href="#" className="nav-menu-link" onClick={(e) => { e.preventDefault(); setLocation('/shop/events'); }}>이벤트</a>
              </li>
              <li className="nav-menu-item">
                <a href="#" className="nav-menu-link" onClick={(e) => { e.preventDefault(); setLocation('/shop/brands'); }}>브랜드</a>
              </li>
              <li className="nav-menu-item">
                <a href="#" className="nav-menu-link" onClick={(e) => { e.preventDefault(); setLocation('/shop/education'); }}>교육 연계상품</a>
              </li>
            </ul>
          </div>
        </div>
      </header>
      
      <main>
        <div className="container">
          {/* 배너 슬라이더 */}
          <section className="banner-section">
            <div className="banner-container">
              <div className="banner-slider" style={{ transform: `translateX(-${currentSlide * 100}%)` }}>
                <div className="banner-slide">
                  <img src="https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?q=80&w=1200&auto=format&fit=crop&ixlib=rb-4.0.3" alt="반려동물 건강 캠페인" className="banner-image" />
                  <div className="banner-content">
                    <h2 className="banner-title">반려동물 건강 캠페인</h2>
                    <p className="banner-description">건강한 식습관과 정기적인 운동으로 반려동물의 건강을 지켜주세요. 건강 관리 용품 최대 40% 할인!</p>
                    <a href="#" className="banner-button">자세히 보기</a>
                  </div>
                </div>
                <div className="banner-slide">
                  <img src="https://images.unsplash.com/photo-1535930891776-0c2dfb7fda1a?q=80&w=1200&auto=format&fit=crop&ixlib=rb-4.0.3" alt="신상품 소개" className="banner-image" />
                  <div className="banner-content">
                    <h2 className="banner-title">2024 신상품 특별전</h2>
                    <p className="banner-description">올 봄 새롭게 출시된 프리미엄 반려동물 용품을 만나보세요. 론칭 기념 특별 할인!</p>
                    <a href="#" className="banner-button">신상품 보기</a>
                  </div>
                </div>
                <div className="banner-slide">
                  <img src="https://images.unsplash.com/photo-1606225457115-9b0de9c5fb09?q=80&w=1200&auto=format&fit=crop&ixlib=rb-4.0.3" alt="훈련사 추천 상품" className="banner-image" />
                  <div className="banner-content">
                    <h2 className="banner-title">훈련사 추천 상품</h2>
                    <p className="banner-description">전문 훈련사들이 엄선한 교육용 장난감과 훈련 용품을 만나보세요. 효과적인 교육을 위한 필수템!</p>
                    <a href="#" className="banner-button">추천 상품 보기</a>
                  </div>
                </div>
              </div>
              <div className="banner-controls">
                <button className="banner-control" onClick={prevSlide}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 18 9 12 15 6"></polyline>
                  </svg>
                </button>
                <button className="banner-control" onClick={nextSlide}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>
                </button>
              </div>
            </div>
          </section>
          
          {/* 카테고리 아이콘 그리드 */}
          <section className="category-icon-section">
            <div className="category-icon-grid">
              {categories.map(category => (
                <a key={category.id} href="#" className="category-icon-item">
                  <div className="category-icon">
                    <span style={{fontSize: '24px'}}>{category.icon}</span>
                  </div>
                  <div className="category-icon-title">{category.name}</div>
                </a>
              ))}
            </div>
          </section>
          
          {/* 베스트 상품 섹션 */}
          <section className="product-section">
            <div className="section-header">
              <h2 className="section-title">베스트 상품</h2>
              <a href="#" className="section-link">
                더보기
                <ChevronRight size={16} />
              </a>
            </div>
            
            <div className="product-grid">
              {bestProducts.map(product => (
                <div key={product.id} className="product-card" onClick={() => goToProductDetail(product.id)}>
                  <div className="product-image">
                    <img src={product.image} alt={product.name} />
                    {product.discountRate > 0 && (
                      <div className="product-badge">{product.discountRate}%</div>
                    )}
                  </div>
                  <div className="product-content">
                    <div className="product-brand">{product.brand}</div>
                    <div className="product-title">{product.name}</div>
                    <div className="product-price">
                      {product.discountRate > 0 && (
                        <div className="product-discount">{product.discountRate}%</div>
                      )}
                      <div className="product-current">{product.price.toLocaleString()}원</div>
                      {product.discountRate > 0 && (
                        <div className="product-original">{product.originalPrice.toLocaleString()}원</div>
                      )}
                    </div>
                    <div className="product-rating">
                      <div className="product-stars">
                        {[...Array(5)].map((_, i) => (
                          <Star 
                            key={i} 
                            size={16} 
                            fill={i < Math.floor(product.rating) ? 'currentColor' : 'none'} 
                          />
                        ))}
                      </div>
                      <span>리뷰 {product.reviewCount}개</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
      
      <style>{`
        .shop-page {
          --primary-color: hsl(var(--secondary));
          --primary-hover: hsl(var(--secondary));
          --success-color: hsl(var(--success));
          --warning-color: hsl(var(--warning));
          --error-color: hsl(var(--destructive));
          --text-color: hsl(var(--foreground));
          --bg-color: hsl(var(--muted));
          --card-bg: hsl(var(--background));
          --gray-100: hsl(var(--muted));
          --gray-200: hsl(var(--border));
          --gray-300: hsl(var(--border));
          --gray-400: hsl(var(--muted-foreground));
          --gray-500: hsl(var(--muted-foreground));
          --gray-600: hsl(var(--muted-foreground));
          --gray-700: hsl(var(--foreground));
          --gray-800: hsl(var(--foreground));
          --gray-900: hsl(var(--foreground));
          --border-color: hsl(var(--border));
          --border-radius: 0.5rem;
          --shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          --light-bg: hsl(var(--muted));
          color: var(--text-color);
          background-color: var(--bg-color);
          font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
          line-height: 1.5;
        }

        .shop-page.dark-mode {
          --text-color: hsl(var(--muted));
          --bg-color: hsl(var(--foreground));
          --card-bg: hsl(var(--foreground));
          --border-color: hsl(var(--foreground));
          --light-bg: hsl(var(--foreground));
        }
        
        /* 유틸리티 네비게이션 */
        .utility-nav {
          background-color: var(--gray-100);
          font-size: 0.75rem;
          border-bottom: 1px solid var(--border-color);
        }
        
        .dark-mode .utility-nav {
          background-color: var(--gray-800);
          border-color: var(--gray-700);
        }
        
        .utility-nav-container {
          display: flex;
          justify-content: flex-end;
          padding: 0.5rem 1rem;
        }
        
        .utility-links {
          display: flex;
          list-style: none;
          margin: 0;
          padding: 0;
        }
        
        .utility-links li {
          position: relative;
          padding: 0 0.75rem;
        }
        
        .utility-links li:not(:last-child)::after {
          content: '';
          position: absolute;
          right: 0;
          top: 50%;
          transform: translateY(-50%);
          height: 0.75rem;
          width: 1px;
          background-color: var(--gray-300);
        }
        
        .dark-mode .utility-links li:not(:last-child)::after {
          background-color: var(--gray-700);
        }
        
        .utility-links a {
          color: var(--gray-700);
          text-decoration: none;
        }
        
        .dark-mode .utility-links a {
          color: var(--gray-400);
        }
        
        .utility-links a:hover {
          color: var(--primary-color);
        }
        
        /* 헤더 */
        header {
          border-bottom: 1px solid var(--border-color);
          background-color: white;
        }
        
        .dark-mode header {
          background-color: var(--gray-900);
          border-color: var(--gray-700);
        }
        
        .header-top {
          display: flex;
          align-items: center;
          padding: 1rem 0;
          gap: 2rem;
        }
        
        .logo {
          display: flex;
          align-items: center;
          font-weight: 700;
          font-size: 1.25rem;
          color: var(--text-color);
          text-decoration: none;
        }
        
        .dark-mode .logo {
          color: white;
        }
        
        .logo-icon {
          width: 2.5rem;
          height: 2.5rem;
          background-color: var(--primary-color);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          margin-right: 0.75rem;
        }
        
        .search-container {
          flex: 1;
          max-width: 500px;
          position: relative;
        }
        
        .search-input-wrapper {
          position: relative;
        }
        
        .search-input {
          width: 100%;
          padding: 0.75rem 1rem;
          padding-right: 3rem;
          border: 2px solid var(--gray-300);
          border-radius: var(--border-radius);
          font-size: 0.875rem;
          outline: none;
          background-color: white;
          color: var(--text-color);
          transition: border-color 0.2s;
        }
        
        .dark-mode .search-input {
          background-color: var(--gray-800);
          border-color: var(--gray-700);
          color: white;
        }
        
        .search-input:focus {
          border-color: var(--primary-color);
        }
        
        .search-button {
          position: absolute;
          right: 0.5rem;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 2rem;
          height: 2rem;
          cursor: pointer;
          color: var(--gray-500);
        }
        
        .dark-mode .search-button {
          color: var(--gray-400);
        }
        
        .search-button:hover {
          color: var(--primary-color);
        }
        
        .search-suggestions {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          margin-top: 0.5rem;
          background-color: white;
          border: 1px solid var(--gray-300);
          border-radius: var(--border-radius);
          z-index: 10;
          box-shadow: var(--shadow);
          padding: 0.75rem;
          display: none;
        }
        
        .dark-mode .search-suggestions {
          background-color: var(--gray-800);
          border-color: var(--gray-700);
        }
        
        .search-input:focus + .search-suggestions,
        .search-suggestions:hover {
          display: block;
        }
        
        .suggestion-category {
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--gray-500);
          margin-bottom: 0.5rem;
        }
        
        .dark-mode .suggestion-category {
          color: var(--gray-400);
        }
        
        .suggestion-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }
        
        .suggestion-item {
          padding: 0.5rem;
          border-radius: 0.25rem;
          cursor: pointer;
          color: var(--text-color);
          font-size: 0.875rem;
        }
        
        .dark-mode .suggestion-item {
          color: var(--gray-300);
        }
        
        .suggestion-item:hover {
          background-color: var(--gray-100);
          color: var(--primary-color);
        }
        
        .dark-mode .suggestion-item:hover {
          background-color: var(--gray-700);
        }
        
        .user-actions {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        
        .theme-toggle-btn {
          background: none;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--gray-700);
          padding: 0.5rem;
        }
        
        .dark-mode .theme-toggle-btn {
          color: var(--gray-300);
        }
        
        .theme-toggle-btn:hover {
          color: var(--primary-color);
        }
        
        .action-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          cursor: pointer;
          color: var(--gray-700);
          font-size: 0.75rem;
          text-decoration: none;
        }
        
        .dark-mode .action-item {
          color: var(--gray-300);
        }
        
        .action-item:hover {
          color: var(--primary-color);
        }
        
        .action-icon {
          position: relative;
          margin-bottom: 0.25rem;
        }
        
        .badge {
          position: absolute;
          top: -5px;
          right: -5px;
          background-color: var(--error-color);
          color: white;
          font-size: 0.625rem;
          min-width: 1rem;
          height: 1rem;
          border-radius: 0.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 0.25rem;
        }
        
        .main-nav {
          background-color: white;
          border-top: 1px solid var(--gray-200);
        }
        
        .dark-mode .main-nav {
          background-color: var(--gray-900);
          border-color: var(--gray-700);
        }
        
        .nav-container {
          display: flex;
          align-items: center;
          height: 3rem;
        }
        
        .category-menu {
          display: flex;
          align-items: center;
          height: 100%;
          position: relative;
          cursor: pointer;
          padding: 0 1rem;
          background-color: var(--primary-color);
          color: white;
          font-weight: 500;
          border-radius: 0;
        }
        
        .category-menu-icon {
          margin-right: 0.5rem;
        }
        
        .category-dropdown {
          position: absolute;
          top: 100%;
          left: 0;
          width: 240px;
          background-color: white;
          border: 1px solid var(--gray-300);
          border-top: none;
          z-index: 20;
          display: none;
        }
        
        .dark-mode .category-dropdown {
          background-color: var(--gray-800);
          border-color: var(--gray-700);
        }
        
        .category-menu:hover .category-dropdown {
          display: block;
        }
        
        .category-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }
        
        .category-item {
          padding: 0.75rem 1rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid var(--gray-200);
          color: var(--text-color);
          cursor: pointer;
        }
        
        .dark-mode .category-item {
          border-color: var(--gray-700);
          color: var(--gray-300);
        }
        
        .category-item:hover {
          background-color: var(--gray-100);
        }
        
        .dark-mode .category-item:hover {
          background-color: var(--gray-700);
        }
        
        .category-item-icon {
          color: var(--gray-500);
        }
        
        .nav-menu {
          display: flex;
          list-style: none;
          height: 100%;
          padding: 0;
          margin: 0;
        }
        
        .nav-menu-item {
          display: flex;
          align-items: center;
          height: 100%;
        }
        
        .nav-menu-link {
          color: var(--gray-700);
          text-decoration: none;
          font-weight: 500;
          padding: 0 1rem;
          height: 100%;
          display: flex;
          align-items: center;
          transition: color 0.2s ease;
          position: relative;
        }
        
        .dark-mode .nav-menu-link {
          color: var(--gray-300);
        }
        
        .nav-menu-link:hover,
        .nav-menu-link.active {
          color: var(--primary-color);
        }
        
        .nav-menu-link.active::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 3px;
          background-color: var(--primary-color);
        }
        
        /* 배너 슬라이더 */
        .banner-section {
          margin: 1.5rem 0;
        }
        
        .banner-container {
          position: relative;
          border-radius: 0.5rem;
          overflow: hidden;
          height: 300px;
        }
        
        .banner-slider {
          display: flex;
          transition: transform 0.5s ease;
          height: 100%;
        }
        
        .banner-slide {
          flex: 0 0 100%;
          position: relative;
          height: 100%;
        }
        
        .banner-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        
        .banner-content {
          position: absolute;
          bottom: 2rem;
          left: 2rem;
          max-width: 50%;
          background-color: rgba(255, 255, 255, 0.9);
          padding: 1.5rem;
          border-radius: 0.5rem;
        }
        
        .dark-mode .banner-content {
          background-color: rgba(20, 20, 20, 0.9);
        }
        
        .banner-title {
          font-size: 1.5rem;
          font-weight: 700;
          margin-bottom: 0.5rem;
          color: var(--text-color);
        }
        
        .dark-mode .banner-title {
          color: var(--gray-100);
        }
        
        .banner-description {
          font-size: 0.875rem;
          color: var(--gray-700);
          margin-bottom: 1rem;
        }
        
        .dark-mode .banner-description {
          color: var(--gray-300);
        }
        
        .banner-button {
          display: inline-block;
          padding: 0.5rem 1rem;
          background-color: var(--primary-color);
          color: white;
          font-weight: 500;
          border-radius: 0.25rem;
          text-decoration: none;
          transition: background-color 0.2s;
        }
        
        .banner-button:hover {
          background-color: var(--primary-hover);
        }
        
        .banner-controls {
          position: absolute;
          bottom: 1rem;
          right: 1rem;
          display: flex;
          gap: 0.5rem;
        }
        
        .banner-control {
          width: 2rem;
          height: 2rem;
          border-radius: 50%;
          background-color: rgba(255, 255, 255, 0.8);
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background-color 0.2s;
        }
        
        .dark-mode .banner-control {
          background-color: rgba(50, 50, 50, 0.8);
          color: white;
        }
        
        .banner-control:hover {
          background-color: white;
        }
        
        .dark-mode .banner-control:hover {
          background-color: var(--gray-700);
        }

        /* 카테고리 아이콘 그리드 */
        .category-icon-section {
          margin: 2.5rem 0;
        }
        
        .category-icon-grid {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 1.5rem;
        }
        
        .category-icon-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 90px;
          text-align: center;
          text-decoration: none;
          transition: transform 0.2s;
        }
        
        .category-icon-item:hover {
          transform: translateY(-3px);
        }
        
        .category-icon {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background-color: var(--primary-color);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 0.75rem;
          transition: all 0.3s ease;
        }
        
        .category-icon-item:hover .category-icon {
          background-color: var(--primary-hover);
          box-shadow: 0 4px 8px rgba(0,0,0,0.1);
        }
        
        .category-icon-title {
          font-size: 0.875rem;
          color: var(--text-color);
          font-weight: 500;
        }
        
        .dark-mode .category-icon-title {
          color: var(--gray-300);
        }
        
        /* 상품 섹션 */
        .product-section {
          margin: 3rem 0;
        }
        
        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }
        
        .section-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--text-color);
          margin: 0;
        }
        
        .dark-mode .section-title {
          color: var(--gray-100);
        }
        
        .section-link {
          color: var(--primary-color);
          text-decoration: none;
          font-weight: 500;
          font-size: 0.875rem;
          display: flex;
          align-items: center;
        }
        
        .product-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 1.5rem;
        }
        
        .product-card {
          background-color: white;
          border-radius: 0.5rem;
          overflow: hidden;
          transition: transform 0.2s, box-shadow 0.2s;
          cursor: pointer;
          border: 1px solid var(--gray-200);
        }
        
        .dark-mode .product-card {
          background-color: var(--gray-800);
          border-color: var(--gray-700);
        }
        
        .product-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }
        
        .product-image {
          height: 200px;
          overflow: hidden;
          position: relative;
        }
        
        .product-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.3s;
        }
        
        .product-card:hover .product-image img {
          transform: scale(1.05);
        }
        
        .product-badge {
          position: absolute;
          top: 0.5rem;
          left: 0.5rem;
          background-color: var(--error-color);
          color: white;
          padding: 0.25rem 0.5rem;
          font-size: 0.75rem;
          font-weight: 600;
          border-radius: 0.25rem;
        }
        
        .product-content {
          padding: 1rem;
        }
        
        .product-brand {
          font-size: 0.75rem;
          color: var(--gray-600);
          margin-bottom: 0.25rem;
        }
        
        .dark-mode .product-brand {
          color: var(--gray-400);
        }
        
        .product-title {
          font-weight: 500;
          color: var(--text-color);
          margin-bottom: 0.5rem;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          line-height: 1.4;
        }
        
        .dark-mode .product-title {
          color: var(--gray-100);
        }
        
        .product-price {
          display: flex;
          align-items: baseline;
          margin-bottom: 0.5rem;
        }
        
        .product-discount {
          font-weight: 700;
          color: var(--error-color);
          margin-right: 0.5rem;
        }
        
        .product-current {
          font-weight: 700;
          color: var(--text-color);
        }
        
        .dark-mode .product-current {
          color: var(--gray-100);
        }
        
        .product-original {
          font-size: 0.875rem;
          color: var(--gray-500);
          text-decoration: line-through;
          margin-left: 0.5rem;
        }
        
        .product-rating {
          display: flex;
          align-items: center;
          font-size: 0.875rem;
          color: var(--gray-600);
        }
        
        .dark-mode .product-rating {
          color: var(--gray-400);
        }
        
        .product-stars {
          color: hsl(var(--primary));
          margin-right: 0.25rem;
          display: flex;
        }
        
        /* 반응형 컨테이너 */
        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 1rem;
        }
        
        /* 반응형 조정 */
        @media (max-width: 768px) {
          .header-top {
            flex-wrap: wrap;
          }
          
          .search-container {
            order: 3;
            flex: 0 0 100%;
            max-width: 100%;
            margin-top: 1rem;
          }
          
          .banner-content {
            max-width: 80%;
          }
          
          .category-icon-grid {
            gap: 1rem;
          }
          
          .category-icon-item {
            width: 80px;
          }
          
          .category-icon {
            width: 50px;
            height: 50px;
          }
        }
      `}</style>
    </div>
  );
}