import React from 'react';
import { useAuth } from '@/hooks/useAuth';

export default function InstituteReportsPage() {
  const auth = useAuth();

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">데이터 분석</h1>
      
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* 요약 카드 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 shadow">
            <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">수강생 현황</h3>
            <div className="flex justify-between items-center">
              <div>
                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">138</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">총 수강생</p>
              </div>
              <div className="text-green-500 text-sm font-semibold">
                +12.5% <span className="ml-1">지난달 대비</span>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 shadow">
            <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">완료 강의</h3>
            <div className="flex justify-between items-center">
              <div>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400">42</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">이번 달</p>
              </div>
              <div className="text-green-500 text-sm font-semibold">
                +8.3% <span className="ml-1">지난달 대비</span>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 shadow">
            <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">매출</h3>
            <div className="flex justify-between items-center">
              <div>
                <p className="text-3xl font-bold text-primary dark:text-primary">₩4,850,000</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">이번 달</p>
              </div>
              <div className="text-green-500 text-sm font-semibold">
                +15.2% <span className="ml-1">지난달 대비</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* 차트 영역 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 shadow">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">월간 등록 추이</h3>
            <div className="h-64 bg-gray-100 dark:bg-gray-700 rounded flex items-center justify-center">
              <p className="text-gray-500 dark:text-gray-400">차트 영역</p>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 shadow">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">과정별 등록 현황</h3>
            <div className="h-64 bg-gray-100 dark:bg-gray-700 rounded flex items-center justify-center">
              <p className="text-gray-500 dark:text-gray-400">차트 영역</p>
            </div>
          </div>
        </div>
        
        <h2 className="text-xl font-semibold mt-8 mb-4">훈련사 성과</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  훈련사
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  담당 수강생
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  완료된 과정
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  평균 평점
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  총 수익
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  상세 보기
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
              {[1, 2, 3, 4, 5].map((i) => (
                <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-700 flex-shrink-0">
                        {/* 프로필 이미지 */}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">김훈련</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">복종훈련 전문</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white">{15 + i * 2}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white">{8 + i}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-yellow-500">★★★★★ ({(4.5 + i * 0.1).toFixed(1)})</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white">₩{(1500000 + i * 250000).toLocaleString()}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <a href="#" className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300">
                      상세보기
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="flex justify-end mt-6">
          <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
            상세 보고서 다운로드
          </button>
        </div>
      </div>
    </div>
  );
}