
import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { 
  requestFCMToken, 
  registerFCMTokenWithBackend, 
  onForegroundMessage,
  isFCMSupported 
} from '@/lib/fcm-service';

interface NotificationContextType {
  isConnected: boolean;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  unreadCount: number;
  sendTestNotification: (data: { title: string; message: string; type?: string }) => void;
  fcmEnabled: boolean;
  requestNotificationPermission: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType>({
  isConnected: false,
  connectionStatus: 'disconnected',
  unreadCount: 0,
  sendTestNotification: () => {},
  fcmEnabled: false,
  requestNotificationPermission: async () => {},
});

export const useNotification = () => useContext(NotificationContext);

interface NotificationProviderProps {
  children: React.ReactNode;
  userId?: number;
}

export function NotificationProvider({ children, userId }: NotificationProviderProps) {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const [fcmEnabled, setFcmEnabled] = useState(false);
  const fcmTokenRef = useRef<string | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // 읽지 않은 알림 수: React Query 단일 source-of-truth (목록 mutation 후 invalidate 시 자동 재조회)
  const { data: unreadCountData } = useQuery<{ unreadCount?: number; count?: number }>({
    queryKey: ['/api/notifications/unread-count'],
    enabled: !!userId,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });
  const unreadCount = unreadCountData?.unreadCount ?? unreadCountData?.count ?? 0;

  const refreshUnreadCount = () => {
    if (!userId) return;
    queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread-count'] });
  };

  // 테스트 알림 전송
  const sendTestNotification = async (data: { title: string; message: string; type?: string }) => {
    try {
      const response = await fetch('/api/notifications/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        toast({
          title: '테스트 알림 전송됨',
          description: '알림이 성공적으로 전송되었습니다',
        });
      }
    } catch (error) {
      toast({
        title: '알림 전송 실패',
        description: '알림 전송 중 오류가 발생했습니다',
        variant: 'destructive',
      });
    }
  };

  // FCM 토큰 등록 및 알림 권한 요청
  const requestNotificationPermission = async () => {
    if (!userId) {
      console.warn('[FCM] 로그인이 필요합니다');
      return;
    }

    if (!isFCMSupported()) {
      console.warn('[FCM] 브라우저가 푸시 알림을 지원하지 않습니다');
      toast({
        title: '알림 미지원',
        description: '이 브라우저는 푸시 알림을 지원하지 않습니다',
        variant: 'destructive',
      });
      return;
    }

    try {
      // FCM 토큰 요청
      const token = await requestFCMToken();
      if (!token) {
        console.warn('[FCM] 토큰을 가져올 수 없습니다');
        return;
      }

      fcmTokenRef.current = token;

      // 백엔드에 토큰 등록
      const success = await registerFCMTokenWithBackend(token);
      if (success) {
        setFcmEnabled(true);
        toast({
          title: '✓ 푸시 알림 활성화됨',
          description: '이제 앱이 닫혀있어도 알림을 받을 수 있습니다',
        });
      }
    } catch (error) {
      console.error('[FCM] 알림 권한 요청 실패:', error);
      toast({
        title: '알림 활성화 실패',
        description: '푸시 알림을 활성화하는 중 오류가 발생했습니다',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    if (!userId) {
      setConnectionStatus('disconnected');
      return;
    }

    // WebSocket 연결 설정
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    console.log('[WebSocket] 연결 시도:', wsUrl);
    setConnectionStatus('connecting');

    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('[WebSocket] 연결 성공');
      setIsConnected(true);
      setConnectionStatus('connected');
      
      // 사용자 인증
      ws.send(JSON.stringify({
        type: 'authenticate',
        userId: userId
      }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('[WebSocket] 메시지 수신:', data);

        if (data.type === 'auth_success') {
          console.log('[WebSocket] 인증 완료');
        } else if (data.type === 'notification') {
          const notification = data.data;
          queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
          refreshUnreadCount();
          toast({
            title: notification.title,
            description: notification.message,
            duration: 5000,
          });
        } else if (data.type === 'notification_read' || data.type === 'all_notifications_read') {
          queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
          refreshUnreadCount();
        }
      } catch (error) {
        console.error('[WebSocket] 메시지 파싱 오류:', error);
      }
    };

    ws.onclose = () => {
      console.log('[WebSocket] 연결 종료');
      setIsConnected(false);
      setConnectionStatus('disconnected');
    };

    ws.onerror = (error) => {
      console.error('[WebSocket] 연결 오류:', error);
      setIsConnected(false);
      setConnectionStatus('error');
    };

    setSocket(ws);

    // 컴포넌트 언마운트 시 연결 해제
    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [userId, queryClient, toast]);

  // FCM 포그라운드 메시지 수신 (앱이 열려있을 때)
  useEffect(() => {
    if (!userId || !fcmEnabled) return;

    const unsubscribe = onForegroundMessage((payload) => {
      console.log('[FCM] 포그라운드 메시지 수신:', payload);
      
      // WebSocket으로 이미 처리된 알림인지 확인 (중복 방지)
      // FCM 메시지는 WebSocket 메시지의 백업 역할
      const notification = payload.notification;
      if (notification) {
        toast({
          title: notification.title || '새 알림',
          description: notification.body || '',
          duration: 5000,
        });
        
        // 알림 목록 갱신
        queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
        refreshUnreadCount();
      }
    });

    return unsubscribe;
  }, [userId, fcmEnabled, toast, queryClient]);

  return (
    <NotificationContext.Provider value={{ 
      isConnected, 
      connectionStatus, 
      unreadCount,
      sendTestNotification,
      fcmEnabled,
      requestNotificationPermission,
    }}>
      {children}
    </NotificationContext.Provider>
  );
}
