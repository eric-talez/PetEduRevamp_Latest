import React from "react";

export default function ShopPage() {
  console.log("극단적으로 단순화된 ShopPage 컴포넌트 렌더링");
  console.log("Shop-Simple 파일 경로: client/src/pages/shop/simple.tsx");
  console.log("현재 URL:", window.location.href);
  console.log("현재 경로명:", window.location.pathname);
  
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">반려견 용품 쇼핑</h1>
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-8 my-4">
        <p className="text-lg mb-4">쇼핑 페이지 테스트 중</p>
        <p className="mb-2">정상적으로 렌더링되었습니다!</p>
        <p className="text-success dark:text-success font-bold">
          Simple Shop 컴포넌트 (shop/simple.tsx)
        </p>
      </div>
      <div className="bg-primary/10 dark:bg-primary/20 shadow rounded-lg p-4">
        <p>현재 URL: {window.location.href}</p>
        <p>현재 경로명: {window.location.pathname}</p>
      </div>
    </div>
  );
}