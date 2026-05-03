import React from 'react';
import { useAuth } from '@/hooks/useAuth';

export default function InstituteTrainersPage() {
  const auth = useAuth();

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">훈련사 관리</h1>
      
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <div className="mb-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">훈련사 목록</h2>
            <button className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2">
              + 새 훈련사 추가
            </button>
          </div>
          
          <div className="flex justify-between mb-4">
            <div className="relative w-64">
              <input
                type="text"
                placeholder="훈련사 검색..."
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white"
              />
              <svg
                className="absolute right-3 top-3 h-4 w-4 text-gray-500 dark:text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <div className="flex space-x-2">
              <select className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white">
                <option>모든 전문분야</option>
                <option>복종훈련</option>
                <option>문제행동</option>
                <option>어질리티</option>
              </select>
              <button className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2">
                필터 적용
              </button>
            </div>
          </div>

          {/* 훈련사 카드 그리드 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden shadow-md hover:shadow-lg transition-shadow">
                <div className="p-5">
                  <div className="flex items-center mb-4">
                    <div className="h-12 w-12 rounded-full bg-gray-200 dark:bg-gray-700 flex-shrink-0">
                      {/* 프로필 이미지 */}
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">김훈련</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">trainer{i}@example.com</p>
                    </div>
                    <div className="ml-auto">
                      <span className="px-2 py-1 text-xs rounded-full bg-success/10 text-success dark:bg-success/20 dark:text-success/70">
                        활동중
                      </span>
                    </div>
                  </div>
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">전문 분야:</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">복종훈련, 문제행동</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">자격증:</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">KKC 훈련사 2급</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">평점:</span>
                      <span className="text-sm font-medium text-warning">★★★★★ (4.8)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">수강생:</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">15명</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">총 강의:</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">5개</span>
                    </div>
                  </div>
                  
                  <div className="flex space-x-2 mt-4">
                    <button className="flex-1 px-3 py-2 bg-primary text-white text-sm rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2">
                      상세 정보
                    </button>
                    <button className="flex-1 px-3 py-2 bg-success text-white text-sm rounded-md hover:bg-success/90 focus:outline-none focus:ring-2 focus:ring-success focus:ring-offset-2">
                      수수료 관리
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-6 flex justify-between">
            <div>
              <span className="text-sm text-gray-700 dark:text-gray-300">
                총 <span className="font-medium">12</span> 명의 훈련사
              </span>
            </div>
            <div className="flex space-x-2">
              <button className="px-3 py-1 border border-gray-300 dark:border-gray-700 rounded-md text-sm">
                이전
              </button>
              <button className="px-3 py-1 bg-primary text-white rounded-md text-sm">
                1
              </button>
              <button className="px-3 py-1 border border-gray-300 dark:border-gray-700 rounded-md text-sm">
                2
              </button>
              <button className="px-3 py-1 border border-gray-300 dark:border-gray-700 rounded-md text-sm">
                다음
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}