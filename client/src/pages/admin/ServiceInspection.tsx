
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, AlertTriangle, XCircle, Clock } from 'lucide-react';

interface ServiceStatus {
  status: string;
  health: number;
}

interface InspectionData {
  timestamp: string;
  status: string;
  features: Record<string, ServiceStatus>;
  performance: {
    responseTime: string;
    uptime: string;
    memoryUsage: string;
    cpuUsage: string;
  };
  recommendations: string[];
}

export default function ServiceInspection() {
  const [inspection, setInspection] = useState<InspectionData | null>(null);
  const [features, setFeatures] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInspectionData();
    fetchFeaturesData();
  }, []);

  const fetchInspectionData = async () => {
    try {
      const response = await fetch('/api/service/inspection');
      const data = await response.json();
      setInspection(data);
    } catch (error) {
      console.error('검수 데이터 로드 실패:', error);
    }
  };

  const fetchFeaturesData = async () => {
    try {
      const response = await fetch('/api/service/features');
      const data = await response.json();
      setFeatures(data);
      setLoading(false);
    } catch (error) {
      console.error('기능 데이터 로드 실패:', error);
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-5 w-5 text-success" />;
      case 'partial':
      case 'limited':
        return <AlertTriangle className="h-5 w-5 text-warning" />;
      case 'inactive':
        return <XCircle className="h-5 w-5 text-destructive" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      active: 'bg-success/10 text-success',
      partial: 'bg-warning/10 text-warning',
      limited: 'bg-warning/10 text-warning',
      inactive: 'bg-destructive/10 text-destructive'
    };

    const labels: Record<string, string> = {
      active: '정상',
      partial: '부분',
      limited: '제한',
      inactive: '비활성'
    };

    return (
      <Badge className={variants[status] || 'bg-gray-100 text-gray-800'}>
        {labels[status] || status}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
          <p className="mt-4 text-lg">서비스 검수 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">서비스 전체 검수</h1>
        <p className="text-gray-600">TALEZ 플랫폼의 전체 서비스 상태를 모니터링합니다</p>
      </div>

      {inspection && (
        <>
          {/* 전체 상태 개요 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">전체 상태</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-success" />
                  <span className="text-2xl font-bold">정상</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">응답 시간</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{inspection.performance.responseTime}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">가동률</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{inspection.performance.uptime}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">메모리 사용률</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{inspection.performance.memoryUsage}</div>
              </CardContent>
            </Card>
          </div>

          {/* 핵심 기능 상태 */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>핵심 기능 상태</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {Object.entries(inspection.features).map(([key, feature]) => (
                  <div key={key} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium capitalize">{key}</span>
                      {getStatusIcon(feature.status)}
                    </div>
                    <div className="mb-2">
                      {getStatusBadge(feature.status)}
                    </div>
                    <Progress value={feature.health} className="h-2" />
                    <span className="text-sm text-gray-500">{feature.health}%</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 카테고리별 기능 상태 */}
          {features && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {Object.entries(features).map(([category, items]: [string, any]) => (
                <Card key={category}>
                  <CardHeader>
                    <CardTitle className="capitalize">{category} 기능</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {items.map((item: any, index: number) => (
                        <div key={index} className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            {getStatusIcon(item.status)}
                            <span>{item.name}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            {getStatusBadge(item.status)}
                            <span className="text-sm text-gray-500">{item.coverage}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* 개선 권장사항 */}
          <Card>
            <CardHeader>
              <CardTitle>개선 권장사항</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {inspection.recommendations.map((recommendation, index) => (
                  <li key={index} className="flex items-start space-x-2">
                    <AlertTriangle className="h-5 w-5 text-warning mt-0.5 flex-shrink-0" />
                    <span>{recommendation}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
