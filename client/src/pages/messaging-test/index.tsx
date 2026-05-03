import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  MessageSquare, 
  Video, 
  Send, 
  Clock, 
  Users, 
  CheckCircle, 
  XCircle,
  AlertCircle,
  Phone,
  Calendar
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface TestResult {
  name: string;
  status: 'pass' | 'fail' | 'pending';
  message: string;
  timestamp?: Date;
}

export default function MessagingTestPage() {
  const { userRole, userName } = useAuth();
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [wsConnection, setWsConnection] = useState<WebSocket | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [testMessage, setTestMessage] = useState('안녕하세요! 메시지 전송 테스트입니다.');
  const [receiverId, setReceiverId] = useState('2');
  const [messages, setMessages] = useState<any[]>([]);

  // 테스트 항목 정의
  const tests = [
    { id: 'ws-connection', name: 'WebSocket 연결', description: 'WebSocket 서버 연결 테스트' },
    { id: 'authentication', name: '사용자 인증', description: 'WebSocket 사용자 인증 테스트' },
    { id: 'message-send', name: '메시지 전송', description: '실시간 메시지 전송 테스트' },
    { id: 'message-receive', name: '메시지 수신', description: '실시간 메시지 수신 테스트' },
    { id: 'read-receipt', name: '읽음 확인', description: '메시지 읽음 확인 기능 테스트' },
    { id: 'typing-indicator', name: '타이핑 표시', description: '타이핑 상태 표시 테스트' },
    { id: 'online-status', name: '온라인 상태', description: '사용자 온라인 상태 확인' },
    { id: 'video-call-init', name: '화상통화 초기화', description: '화상통화 UI 및 컨트롤 테스트' }
  ];

  // 테스트 결과 업데이트
  const updateTestResult = (testId: string, status: 'pass' | 'fail' | 'pending', message: string) => {
    setTestResults(prev => {
      const existing = prev.find(r => r.name === testId);
      const newResult = { name: testId, status, message, timestamp: new Date() };
      
      if (existing) {
        return prev.map(r => r.name === testId ? newResult : r);
      } else {
        return [...prev, newResult];
      }
    });
  };

  // WebSocket 연결 테스트
  const testWebSocketConnection = () => {
    updateTestResult('ws-connection', 'pending', '연결 시도 중...');
    
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws/messaging`;
      
      console.log('WebSocket 연결 시도:', wsUrl);
      
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        console.log('WebSocket 연결 성공');
        setConnectionStatus('connected');
        setWsConnection(ws);
        updateTestResult('ws-connection', 'pass', 'WebSocket 연결 성공');
        
        // 인증 테스트 자동 실행
        testAuthentication(ws);
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket 연결 실패:', error);
        setConnectionStatus('disconnected');
        updateTestResult('ws-connection', 'fail', 'WebSocket 연결 실패');
      };
      
      ws.onclose = () => {
        console.log('WebSocket 연결 종료');
        setConnectionStatus('disconnected');
        setWsConnection(null);
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleWebSocketMessage(data);
        } catch (error) {
          console.error('메시지 파싱 오류:', error);
        }
      };
      
      setConnectionStatus('connecting');
      
    } catch (error) {
      console.error('WebSocket 초기화 실패:', error);
      updateTestResult('ws-connection', 'fail', `WebSocket 초기화 실패: ${error}`);
    }
  };

  // 인증 테스트
  const testAuthentication = (ws: WebSocket) => {
    updateTestResult('authentication', 'pending', '사용자 인증 중...');
    
    try {
      ws.send(JSON.stringify({
        type: 'authenticate',
        userId: 1,
        token: 'test-token'
      }));
    } catch (error) {
      updateTestResult('authentication', 'fail', `인증 요청 실패: ${error}`);
    }
  };

  // WebSocket 메시지 처리
  const handleWebSocketMessage = (data: any) => {
    console.log('WebSocket 메시지 수신:', data);
    
    switch (data.type) {
      case 'authentication_success':
        updateTestResult('authentication', 'pass', '사용자 인증 성공');
        updateTestResult('online-status', 'pass', '온라인 상태 확인됨');
        break;
        
      case 'new_message':
        updateTestResult('message-receive', 'pass', '메시지 수신 성공');
        setMessages(prev => [...prev, data.message]);
        break;
        
      case 'message_sent':
        updateTestResult('message-send', 'pass', '메시지 전송 성공');
        setMessages(prev => [...prev, data.message]);
        break;
        
      case 'read_receipt':
        updateTestResult('read-receipt', 'pass', '읽음 확인 수신');
        break;
        
      case 'typing_indicator':
        updateTestResult('typing-indicator', 'pass', '타이핑 표시 수신');
        break;
        
      case 'error':
        updateTestResult('authentication', 'fail', `서버 오류: ${data.message}`);
        break;
    }
  };

  // 메시지 전송 테스트
  const testMessageSend = () => {
    if (!wsConnection) {
      updateTestResult('message-send', 'fail', 'WebSocket 연결이 필요합니다');
      return;
    }

    updateTestResult('message-send', 'pending', '메시지 전송 중...');
    
    try {
      wsConnection.send(JSON.stringify({
        type: 'message',
        receiverId: parseInt(receiverId),
        content: testMessage,
        messageType: 'text'
      }));
    } catch (error) {
      updateTestResult('message-send', 'fail', `메시지 전송 실패: ${error}`);
    }
  };

  // 타이핑 표시 테스트
  const testTypingIndicator = () => {
    if (!wsConnection) {
      updateTestResult('typing-indicator', 'fail', 'WebSocket 연결이 필요합니다');
      return;
    }

    updateTestResult('typing-indicator', 'pending', '타이핑 표시 전송 중...');
    
    try {
      wsConnection.send(JSON.stringify({
        type: 'typing',
        receiverId: parseInt(receiverId),
        isTyping: true
      }));
      
      // 3초 후 타이핑 중단
      setTimeout(() => {
        wsConnection.send(JSON.stringify({
          type: 'typing',
          receiverId: parseInt(receiverId),
          isTyping: false
        }));
      }, 3000);
      
    } catch (error) {
      updateTestResult('typing-indicator', 'fail', `타이핑 표시 실패: ${error}`);
    }
  };

  // 화상통화 테스트
  const testVideoCall = () => {
    updateTestResult('video-call-init', 'pending', '화상통화 기능 확인 중...');
    
    try {
      // 미디어 권한 확인
      navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then(() => {
          updateTestResult('video-call-init', 'pass', '화상통화 권한 및 기능 확인됨');
        })
        .catch((error) => {
          updateTestResult('video-call-init', 'fail', `미디어 권한 오류: ${error.message}`);
        });
    } catch (error) {
      updateTestResult('video-call-init', 'fail', `화상통화 초기화 실패: ${error}`);
    }
  };

  // 전체 테스트 실행
  const runAllTests = async () => {
    setIsRunningTests(true);
    setTestResults([]);
    
    // 1. WebSocket 연결 테스트
    testWebSocketConnection();
    
    // 3초 후 메시지 전송 테스트
    setTimeout(() => {
      testMessageSend();
    }, 3000);
    
    // 5초 후 타이핑 표시 테스트
    setTimeout(() => {
      testTypingIndicator();
    }, 5000);
    
    // 7초 후 화상통화 테스트
    setTimeout(() => {
      testVideoCall();
      setIsRunningTests(false);
    }, 7000);
  };

  // 연결 끊기
  const disconnect = () => {
    if (wsConnection) {
      wsConnection.close();
      setWsConnection(null);
      setConnectionStatus('disconnected');
    }
  };

  // 상태별 아이콘
  const getStatusIcon = (status: 'pass' | 'fail' | 'pending') => {
    switch (status) {
      case 'pass': return <CheckCircle className="h-4 w-4 text-success" />;
      case 'fail': return <XCircle className="h-4 w-4 text-destructive" />;
      case 'pending': return <AlertCircle className="h-4 w-4 text-warning" />;
    }
  };

  // 연결 상태 배지
  const getConnectionBadge = () => {
    switch (connectionStatus) {
      case 'connected':
        return <Badge variant="default" className="bg-success">연결됨</Badge>;
      case 'connecting':
        return <Badge variant="secondary">연결 중...</Badge>;
      case 'disconnected':
        return <Badge variant="destructive">연결 끊김</Badge>;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">메시징 & 화상채팅 기능 테스트</h1>
        <p className="text-gray-600">실시간 메시징과 화상채팅 기능의 전체적인 동작을 확인합니다.</p>
      </div>

      {/* 현재 사용자 정보 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            테스트 환경 정보
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-600">현재 사용자</label>
              <p className="text-lg font-semibold">{userName || '게스트'}</p>
              <p className="text-sm text-gray-500">{userRole || 'guest'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">WebSocket 상태</label>
              <div className="mt-1">
                {getConnectionBadge()}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">테스트 시간</label>
              <p className="text-sm text-gray-700">{new Date().toLocaleString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 테스트 컨트롤 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              메시징 테스트 컨트롤
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">수신자 ID</label>
              <Input
                value={receiverId}
                onChange={(e) => setReceiverId(e.target.value)}
                placeholder="수신자 ID 입력"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">테스트 메시지</label>
              <Textarea
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
                placeholder="전송할 메시지 입력"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button 
                onClick={runAllTests}
                disabled={isRunningTests}
                className="w-full"
              >
                {isRunningTests ? '테스트 실행 중...' : '전체 테스트 실행'}
              </Button>
              
              <Button 
                onClick={disconnect}
                variant="outline"
                disabled={connectionStatus === 'disconnected'}
                className="w-full"
              >
                연결 끊기
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button 
                onClick={testMessageSend}
                disabled={!wsConnection}
                variant="secondary"
                size="sm"
              >
                <Send className="h-4 w-4 mr-1" />
                메시지 전송
              </Button>
              
              <Button 
                onClick={testVideoCall}
                variant="secondary"
                size="sm"
              >
                <Video className="h-4 w-4 mr-1" />
                화상통화 테스트
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 테스트 결과 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              테스트 결과
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {tests.map((test) => {
                const result = testResults.find(r => r.name === test.id);
                const status = result?.status || 'pending';
                
                return (
                  <div key={test.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(status)}
                        <span className="font-medium">{test.name}</span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{test.description}</p>
                      {result && (
                        <p className="text-xs text-gray-500 mt-1">{result.message}</p>
                      )}
                    </div>
                    {result?.timestamp && (
                      <div className="text-xs text-gray-400">
                        {result.timestamp.toLocaleTimeString()}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 메시지 로그 */}
      {messages.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              메시지 로그
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {messages.map((message, index) => (
                <div key={index} className="p-2 bg-gray-50 rounded text-sm">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-medium">{message.sender?.name || '알 수 없음'}</span>
                      <span className="text-gray-500 ml-2">→ {message.receiver?.name || '알 수 없음'}</span>
                    </div>
                    <span className="text-xs text-gray-400">
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="mt-1">{message.content}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 화상통화 예약 기능 테스트 */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            화상통화 예약 기능
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">예약 날짜</label>
                <Input type="date" className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">예약 시간</label>
                <Input type="time" className="mt-1" />
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">상담 유형</label>
                <select className="w-full p-2 border rounded-md mt-1">
                  <option>기초 훈련 상담</option>
                  <option>행동 교정 상담</option>
                  <option>건강 상담</option>
                  <option>일반 상담</option>
                </select>
              </div>
              <Button className="w-full">
                <Phone className="h-4 w-4 mr-2" />
                화상 상담 예약하기
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}