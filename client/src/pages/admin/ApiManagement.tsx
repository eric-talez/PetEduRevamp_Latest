import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { 
  Key, 
  Save, 
  Eye, 
  EyeOff, 
  TestTube,
  CheckCircle,
  AlertCircle,
  Settings,
  Globe,
  CreditCard,
  Smartphone,
  MapPin,
  RefreshCw
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ApiConfig {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  fields: {
    key: string;
    label: string;
    type: string;
    placeholder: string;
    required: boolean;
  }[];
  isEnabled: boolean;
  status: 'connected' | 'disconnected' | 'error';
}

export default function ApiManagement() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [showKeys, setShowKeys] = useState<{[key: string]: boolean}>({});
  const [testingApi, setTestingApi] = useState<string | null>(null);
  
  const [apiConfigs, setApiConfigs] = useState<ApiConfig[]>([
    {
      id: 'naver',
      name: '네이버 로그인',
      description: '네이버 계정으로 간편 로그인 서비스',
      icon: <Globe className="w-5 h-5 text-success" />,
      fields: [
        {
          key: 'clientId',
          label: '클라이언트 ID',
          type: 'text',
          placeholder: 'Naver Client ID를 입력하세요',
          required: true
        },
        {
          key: 'clientSecret',
          label: '클라이언트 시크릿',
          type: 'password',
          placeholder: 'Naver Client Secret을 입력하세요',
          required: true
        },
        {
          key: 'redirectUri',
          label: '리다이렉트 URI',
          type: 'text',
          placeholder: 'https://yourdomain.com/auth/naver/callback',
          required: true
        }
      ],
      isEnabled: false,
      status: 'disconnected'
    },
    {
      id: 'kakao',
      name: '카카오 로그인',
      description: '카카오 계정으로 간편 로그인 서비스',
      icon: <Smartphone className="w-5 h-5 text-warning" />,
      fields: [
        {
          key: 'clientId',
          label: '앱 키 (REST API)',
          type: 'text',
          placeholder: 'Kakao REST API Key를 입력하세요',
          required: true
        },
        {
          key: 'clientSecret',
          label: '클라이언트 시크릿',
          type: 'password',
          placeholder: 'Kakao Client Secret을 입력하세요',
          required: true
        },
        {
          key: 'redirectUri',
          label: '리다이렉트 URI',
          type: 'text',
          placeholder: 'https://yourdomain.com/auth/kakao/callback',
          required: true
        }
      ],
      isEnabled: false,
      status: 'disconnected'
    },
    {
      id: 'google',
      name: '구글 로그인',
      description: '구글 계정으로 간편 로그인 서비스',
      icon: <Globe className="w-5 h-5 text-primary" />,
      fields: [
        {
          key: 'clientId',
          label: '클라이언트 ID',
          type: 'text',
          placeholder: 'Google OAuth Client ID를 입력하세요',
          required: true
        },
        {
          key: 'clientSecret',
          label: '클라이언트 시크릿',
          type: 'password',
          placeholder: 'Google OAuth Client Secret을 입력하세요',
          required: true
        },
        {
          key: 'redirectUri',
          label: '리다이렉트 URI',
          type: 'text',
          placeholder: 'https://yourdomain.com/auth/google/callback',
          required: true
        }
      ],
      isEnabled: false,
      status: 'disconnected'
    },
    {
      id: 'toss',
      name: '토스페이먼츠',
      description: '토스페이먼츠 결제 서비스',
      icon: <CreditCard className="w-5 h-5 text-primary" />,
      fields: [
        {
          key: 'clientKey',
          label: '클라이언트 키',
          type: 'text',
          placeholder: 'Toss Payments Client Key를 입력하세요',
          required: true
        },
        {
          key: 'secretKey',
          label: '시크릿 키',
          type: 'password',
          placeholder: 'Toss Payments Secret Key를 입력하세요',
          required: true
        },
        {
          key: 'webhookKey',
          label: '웹훅 키',
          type: 'password',
          placeholder: 'Toss Payments Webhook Key를 입력하세요',
          required: false
        }
      ],
      isEnabled: false,
      status: 'disconnected'
    }
  ]);

  const [apiValues, setApiValues] = useState<{[apiId: string]: {[fieldKey: string]: string}}>({});

  useEffect(() => {
    loadApiConfigs();
  }, []);

  const loadApiConfigs = async () => {
    try {
      const response = await fetch('/api/admin/api-configs');
      const result = await response.json();
      
      if (result.success) {
        // API 설정 로드 및 상태 업데이트
        setApiConfigs(prev => prev.map(config => ({
          ...config,
          isEnabled: result.configs[config.id]?.isEnabled || false,
          status: result.configs[config.id]?.status || 'disconnected'
        })));
        
        // API 키 값들 로드 (보안상 마스킹된 형태로)
        setApiValues(result.values || {});
      }
    } catch (error) {
      console.error('API 설정 로드 오류:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleKeyVisibility = (apiId: string, fieldKey: string) => {
    const key = `${apiId}_${fieldKey}`;
    setShowKeys(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleValueChange = (apiId: string, fieldKey: string, value: string) => {
    setApiValues(prev => ({
      ...prev,
      [apiId]: {
        ...prev[apiId],
        [fieldKey]: value
      }
    }));
  };

  const handleSaveApiConfig = async (apiId: string) => {
    try {
      const config = apiConfigs.find(c => c.id === apiId);
      if (!config) return;

      const values = apiValues[apiId] || {};
      
      // 필수 필드 검증
      const missingFields = config.fields
        .filter(field => field.required && !values[field.key])
        .map(field => field.label);

      if (missingFields.length > 0) {
        toast({
          title: "입력 오류",
          description: `다음 필수 필드를 입력해주세요: ${missingFields.join(', ')}`,
          variant: "destructive",
        });
        return;
      }

      const response = await fetch('/api/admin/api-configs', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apiId,
          values,
          isEnabled: config.isEnabled
        })
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "설정 저장 완료",
          description: `${config.name} API 설정이 저장되었습니다.`,
        });
        
        // 설정 다시 로드
        loadApiConfigs();
      } else {
        throw new Error(result.error || '저장 실패');
      }
    } catch (error) {
      console.error('API 설정 저장 오류:', error);
      toast({
        title: "저장 실패",
        description: "API 설정 저장 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  const handleTestApi = async (apiId: string) => {
    setTestingApi(apiId);
    try {
      const response = await fetch(`/api/admin/api-configs/${apiId}/test`, {
        method: 'POST'
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast({
          title: "연결 테스트 성공",
          description: result.message || "API 연결이 정상적으로 작동합니다.",
        });
        
        // 상태 업데이트
        setApiConfigs(prev => prev.map(config => 
          config.id === apiId 
            ? { ...config, status: 'connected' }
            : config
        ));
      } else {
        toast({
          title: "연결 테스트 실패",
          description: result.error || "API 연결에 실패했습니다.",
          variant: "destructive",
        });
        
        setApiConfigs(prev => prev.map(config => 
          config.id === apiId 
            ? { ...config, status: 'error' }
            : config
        ));
      }
    } catch (error) {
      console.error('API 테스트 오류:', error);
      toast({
        title: "테스트 오류",
        description: "API 테스트 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setTestingApi(null);
    }
  };

  const toggleApiEnabled = (apiId: string) => {
    setApiConfigs(prev => prev.map(config => 
      config.id === apiId 
        ? { ...config, isEnabled: !config.isEnabled }
        : config
    ));
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary/50 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">API 설정을 불러오고 있습니다...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">API 관리</h1>
          <p className="text-gray-600 dark:text-gray-400">외부 서비스 API 키 및 연동 설정을 관리하세요</p>
        </div>
        <Button onClick={loadApiConfigs} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          새로고침
        </Button>
      </div>

      {/* API 설정 탭 */}
      <Tabs defaultValue="oauth" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="oauth">간편 로그인</TabsTrigger>
          <TabsTrigger value="payment">결제 서비스</TabsTrigger>
        </TabsList>

        {/* 간편 로그인 API */}
        <TabsContent value="oauth" className="space-y-4">
          {apiConfigs.filter(config => ['naver', 'kakao', 'google'].includes(config.id)).map((config) => (
            <Card key={config.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {config.icon}
                    <div>
                      <h3 className="text-lg font-semibold">{config.name}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{config.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className={
                      config.status === 'connected' 
                        ? 'bg-success/10 text-success dark:bg-success/20 dark:text-success/70'
                        : config.status === 'error'
                        ? 'bg-destructive/10 text-destructive dark:bg-destructive/20 dark:text-destructive/70'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                    }>
                      {config.status === 'connected' ? (
                        <>
                          <CheckCircle className="w-3 h-3 mr-1" />
                          연결됨
                        </>
                      ) : config.status === 'error' ? (
                        <>
                          <AlertCircle className="w-3 h-3 mr-1" />
                          오류
                        </>
                      ) : (
                        <>
                          <Settings className="w-3 h-3 mr-1" />
                          미연결
                        </>
                      )}
                    </Badge>
                    <Switch
                      checked={config.isEnabled}
                      onCheckedChange={() => toggleApiEnabled(config.id)}
                    />
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  {config.fields.map((field) => (
                    <div key={field.key}>
                      <Label htmlFor={`${config.id}_${field.key}`}>
                        {field.label}
                        {field.required && <span className="text-destructive ml-1">*</span>}
                      </Label>
                      <div className="relative">
                        <Input
                          id={`${config.id}_${field.key}`}
                          type={
                            field.type === 'password' && !showKeys[`${config.id}_${field.key}`]
                              ? 'password'
                              : 'text'
                          }
                          placeholder={field.placeholder}
                          value={apiValues[config.id]?.[field.key] || ''}
                          onChange={(e) => handleValueChange(config.id, field.key, e.target.value)}
                        />
                        {field.type === 'password' && (
                          <button
                            type="button"
                            onClick={() => toggleKeyVisibility(config.id, field.key)}
                            className="absolute right-3 top-3"
                          >
                            {showKeys[`${config.id}_${field.key}`] ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <Separator />

                <div className="flex justify-between">
                  <Button
                    variant="outline"
                    onClick={() => handleTestApi(config.id)}
                    disabled={testingApi === config.id}
                  >
                    {testingApi === config.id ? (
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <TestTube className="w-4 h-4 mr-2" />
                    )}
                    연결 테스트
                  </Button>
                  <Button onClick={() => handleSaveApiConfig(config.id)}>
                    <Save className="w-4 h-4 mr-2" />
                    설정 저장
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* 결제 서비스 API */}
        <TabsContent value="payment" className="space-y-4">
          {apiConfigs.filter(config => config.id === 'toss').map((config) => (
            <Card key={config.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {config.icon}
                    <div>
                      <h3 className="text-lg font-semibold">{config.name}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{config.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className={
                      config.status === 'connected' 
                        ? 'bg-success/10 text-success dark:bg-success/20 dark:text-success/70'
                        : config.status === 'error'
                        ? 'bg-destructive/10 text-destructive dark:bg-destructive/20 dark:text-destructive/70'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                    }>
                      {config.status === 'connected' ? (
                        <>
                          <CheckCircle className="w-3 h-3 mr-1" />
                          연결됨
                        </>
                      ) : config.status === 'error' ? (
                        <>
                          <AlertCircle className="w-3 h-3 mr-1" />
                          오류
                        </>
                      ) : (
                        <>
                          <Settings className="w-3 h-3 mr-1" />
                          미연결
                        </>
                      )}
                    </Badge>
                    <Switch
                      checked={config.isEnabled}
                      onCheckedChange={() => toggleApiEnabled(config.id)}
                    />
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  {config.fields.map((field) => (
                    <div key={field.key}>
                      <Label htmlFor={`${config.id}_${field.key}`}>
                        {field.label}
                        {field.required && <span className="text-destructive ml-1">*</span>}
                      </Label>
                      <div className="relative">
                        <Input
                          id={`${config.id}_${field.key}`}
                          type={
                            field.type === 'password' && !showKeys[`${config.id}_${field.key}`]
                              ? 'password'
                              : 'text'
                          }
                          placeholder={field.placeholder}
                          value={apiValues[config.id]?.[field.key] || ''}
                          onChange={(e) => handleValueChange(config.id, field.key, e.target.value)}
                        />
                        {field.type === 'password' && (
                          <button
                            type="button"
                            onClick={() => toggleKeyVisibility(config.id, field.key)}
                            className="absolute right-3 top-3"
                          >
                            {showKeys[`${config.id}_${field.key}`] ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-4 bg-primary/10 dark:bg-primary/20 rounded-lg">
                  <h4 className="font-medium text-primary dark:text-primary/70 mb-2">토스페이먼츠 설정 안내</h4>
                  <ul className="text-sm text-primary dark:text-primary space-y-1">
                    <li>• 토스페이먼츠 개발자 센터에서 키를 발급받으세요</li>
                    <li>• 테스트 환경에서는 테스트 키를, 운영 환경에서는 라이브 키를 사용하세요</li>
                    <li>• 웹훅 키는 결제 검증을 위해 권장되지만 필수는 아닙니다</li>
                  </ul>
                </div>

                <Separator />

                <div className="flex justify-between">
                  <Button
                    variant="outline"
                    onClick={() => handleTestApi(config.id)}
                    disabled={testingApi === config.id}
                  >
                    {testingApi === config.id ? (
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <TestTube className="w-4 h-4 mr-2" />
                    )}
                    연결 테스트
                  </Button>
                  <Button onClick={() => handleSaveApiConfig(config.id)}>
                    <Save className="w-4 h-4 mr-2" />
                    설정 저장
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}