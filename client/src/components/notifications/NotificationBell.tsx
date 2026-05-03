import { useState } from 'react';
import { Bell, BellRing, Check, X, ArrowRight } from 'lucide-react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNotification } from './NotificationProvider';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';

interface Notification {
  id: number;
  title: string;
  message: string;
  type: string;
  category?: string;
  isRead: boolean;
  actionUrl?: string | null;
  createdAt: string;
}

interface NotificationListResponse {
  success: boolean;
  notifications: Notification[];
  total: number;
}

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const { unreadCount } = useNotification();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // 알림 목록 조회 (드롭다운 미리보기용)
  const { data, isLoading } = useQuery<NotificationListResponse>({
    queryKey: ['/api/notifications', { limit: 5 }],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/notifications?limit=5');
      return response.json();
    },
    refetchInterval: 30000,
  });

  const notifications = data?.notifications ?? [];

  // 알림 읽음 처리
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      const response = await apiRequest('PATCH', `/api/notifications/${notificationId}`, { isRead: true });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread-count'] });
    },
  });

  // 모든 알림 읽음 처리
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('PATCH', '/api/notifications/mark-all-read');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread-count'] });
      toast({
        title: '모든 알림 읽음',
        description: '모든 알림이 읽음으로 처리되었습니다.',
      });
    },
  });

  // 알림 삭제
  const deleteNotificationMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      const response = await apiRequest('DELETE', `/api/notifications/${notificationId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread-count'] });
    },
  });

  const handleMarkAsRead = (notificationId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    markAsReadMutation.mutate(notificationId);
  };

  const handleDelete = (notificationId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteNotificationMutation.mutate(notificationId);
  };

  const handleNotificationClick = (n: Notification) => {
    if (!n.isRead) markAsReadMutation.mutate(n.id);
    if (n.actionUrl) {
      setIsOpen(false);
      setLocation(n.actionUrl);
    }
  };

  const handleViewAll = () => {
    setIsOpen(false);
    setLocation('/notifications');
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative" data-testid="button-notification-bell">
          {unreadCount > 0 ? (
            <BellRing className="h-5 w-5" />
          ) : (
            <Bell className="h-5 w-5" />
          )}
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
              data-testid="badge-unread-count"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
          <span className="sr-only">
            알림 {unreadCount > 0 ? `(${unreadCount}개 읽지 않음)` : ''}
          </span>
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-3 border-b flex items-center justify-between">
          <h3 className="font-semibold text-sm">알림</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => markAllAsReadMutation.mutate()}
              className="text-xs h-7"
              data-testid="button-bell-mark-all-read"
            >
              모두 읽음
            </Button>
          )}
        </div>

        <ScrollArea className="h-72">
          {isLoading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              알림을 불러오는 중...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              알림이 없습니다
            </div>
          ) : (
            <ul className="divide-y">
              {notifications.map((notification) => (
                <li
                  key={notification.id}
                  className={`p-3 hover:bg-muted/50 cursor-pointer ${
                    !notification.isRead ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                  data-testid={`bell-notification-${notification.id}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h4 className={`text-sm ${!notification.isRead ? 'font-semibold' : 'font-medium'} truncate`}>
                        {notification.title}
                      </h4>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground/70 mt-1">
                        {new Date(notification.createdAt).toLocaleString('ko-KR')}
                      </p>
                    </div>

                    <div className="flex gap-1 flex-shrink-0">
                      {!notification.isRead && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={(e) => handleMarkAsRead(notification.id, e)}
                          title="읽음으로 표시"
                        >
                          <Check className="h-3 w-3" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={(e) => handleDelete(notification.id, e)}
                        title="삭제"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>

        <div className="p-2 border-t">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-between text-sm"
            onClick={handleViewAll}
            data-testid="button-view-all-notifications"
          >
            전체 알림 보기
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
