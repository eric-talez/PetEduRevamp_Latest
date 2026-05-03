import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { NotificationProvider as RealtimeNotificationProvider } from '@/components/notifications/NotificationProvider';
import { useAuth } from '@/SimpleApp';

interface AuthMeResponse {
  user?: { id?: number } | null;
}

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuth();

  const { data: me } = useQuery<AuthMeResponse>({
    queryKey: ['/api/auth/me'],
    enabled: auth.isAuthenticated,
  });
  const userId = me?.user?.id;

  return (
    <RealtimeNotificationProvider userId={userId}>
      {children}
    </RealtimeNotificationProvider>
  );
}
