
import React from 'react';
import { Card } from '@/components/ui/card';
import { Brain, Activity, Sparkles } from 'lucide-react';

export default function AIAnalysisPage() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">AI 분석</h1>
      <div className="grid md:grid-cols-3 gap-6">
        <Card className="p-4">
          <div className="flex items-center gap-3 mb-4">
            <Brain className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-semibold">행동 분석</h2>
          </div>
          <div className="space-y-3">
            <div className="p-3 bg-gray-50 rounded-lg">
              <h3 className="font-medium">스트레스 지수</h3>
              <div className="flex items-center justify-between mt-2">
                <span>낮음</span>
                <div className="w-2/3 h-2 bg-success/20 rounded-full" />
              </div>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <h3 className="font-medium">활동성</h3>
              <div className="flex items-center justify-between mt-2">
                <span>높음</span>
                <div className="w-2/3 h-2 bg-primary/40 rounded-full" />
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3 mb-4">
            <Activity className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-semibold">건강 상태</h2>
          </div>
          <div className="space-y-3">
            <div className="p-3 bg-gray-50 rounded-lg">
              <h3 className="font-medium">체중 변화</h3>
              <div className="flex items-center justify-between mt-2">
                <span>정상</span>
                <div className="w-2/3 h-2 bg-success/40 rounded-full" />
              </div>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <h3 className="font-medium">식사량</h3>
              <div className="flex items-center justify-between mt-2">
                <span>적정</span>
                <div className="w-2/3 h-2 bg-success/40 rounded-full" />
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3 mb-4">
            <Sparkles className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-semibold">훈련 진행도</h2>
          </div>
          <div className="space-y-3">
            <div className="p-3 bg-gray-50 rounded-lg">
              <h3 className="font-medium">기본 훈련</h3>
              <div className="flex items-center justify-between mt-2">
                <span>85%</span>
                <div className="w-2/3 h-2 bg-primary rounded-full" />
              </div>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <h3 className="font-medium">특수 훈련</h3>
              <div className="flex items-center justify-between mt-2">
                <span>40%</span>
                <div className="w-2/3 h-2 bg-primary/40 rounded-full" />
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
