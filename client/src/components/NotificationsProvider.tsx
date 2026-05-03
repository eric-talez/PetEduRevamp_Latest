import React, { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { NotificationProvider as LegacyNotificationProvider } from '@/hooks/use-notifications';
import { NotificationProvider as RealtimeNotificationProvider } from '@/components/notifications/NotificationProvider';
import { useAuth } from '@/SimpleApp';

interface AuthMeResponse {
  user?: { id?: number } | null;
}

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuth();

  useEffect(() => {
    console.log('NotificationsProvider - Auth Status:', auth.isAuthenticated, auth.userRole);
  }, [auth.isAuthenticated, auth.userRole]);

  // 사용자 ID는 /api/auth/me로 조회 (다른 hook과 동일한 query key 사용)
  const { data: me } = useQuery<AuthMeResponse>({
    queryKey: ['/api/auth/me'],
    enabled: auth.isAuthenticated,
  });
  const userId = me?.user?.id;

  // 레거시 알림 hook과 신규 통합 알림 센터(WebSocket+FCM+서버 백엔드) Provider를 함께 제공.
  // NotificationBell/NotificationProvider 가 unreadCount/배지/실시간 동기화의 source-of-truth.
  return (
    <LegacyNotificationProvider>
      <RealtimeNotificationProvider userId={userId}>
        {children}
      </RealtimeNotificationProvider>
    </LegacyNotificationProvider>
  );
}