import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  AlertCircle, 
  Bell, 
  Calendar, 
  CheckCircle, 
  ChevronDown, 
  ChevronUp, 
  Clock, 
  Info, 
  MessageSquare,
  Package, 
  Settings, 
  Shield, 
  Star, 
  Tag, 
  Trash2 
} from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { AppLayout } from "@/layout/AppLayout";
import NotificationsMenu from "./menu";

// 알림 유형별 아이콘 및 색상 매핑
const notificationTypeMap = {
  system: {
    icon: <div className="w-2 h-2 rounded-full bg-blue-500" />,
    color: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
  },
  training: {
    icon: <div className="w-2 h-2 rounded-full bg-primary/50" />,
    color: "bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary",
  },
  event: {
    icon: <div className="w-2 h-2 rounded-full bg-green-500" />,
    color: "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400",
  },
  payment: {
    icon: <div className="w-2 h-2 rounded-full bg-yellow-500" />,
    color: "bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400",
  },
  security: {
    icon: <div className="w-2 h-2 rounded-full bg-red-500" />,
    color: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
  },
  order: {
    icon: <div className="w-2 h-2 rounded-full bg-indigo-500" />,
    color: "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400",
  },
  pet: {
    icon: <div className="w-2 h-2 rounded-full bg-orange-500" />,
    color: "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400",
  },
};

// 알림 인터페이스
interface Notification {
  id: string;
  title: string;
  content: string;
  timestamp: string;
  type: keyof typeof notificationTypeMap;
  read: boolean;
  link?: string;
}

export default function SystemNotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [expandedNotifications, setExpandedNotifications] = useState<Set<string>>(new Set());
  const [location, setLocation] = useLocation();

  // 샘플 알림 데이터
  useEffect(() => {
    // 실제 애플리케이션에서는 API를 통해 알림 데이터를 가져와야 합니다
    const mockNotifications: Notification[] = [
      {
        id: "notif3",
        title: "수강 신청 마감 임박",
        content: "관심 표시한 '반려견 행동 교정 마스터' 클래스 신청이 내일 마감됩니다. 지금 바로 등록하세요!",
        timestamp: "2024-02-13T10:15:00",
        type: "system",
        read: true,
        link: "/courses"
      },
      {
        id: "notif6",
        title: "시스템 점검 안내",
        content: "내일 새벽 2시부터 4시까지 시스템 점검이 있을 예정입니다. 이 시간 동안 서비스 이용이 제한될 수 있습니다.",
        timestamp: "2024-02-10T09:00:00",
        type: "system",
        read: true
      },
      {
        id: "notif10",
        title: "계정 보안 강화 안내",
        content: "최근 비밀번호가 변경된 지 90일이 지났습니다. 계정 보안을 위해 비밀번호 변경을 권장합니다.",
        timestamp: "2024-02-06T10:00:00",
        type: "security",
        read: false,
        link: "/settings/security"
      }
    ];

    setNotifications(mockNotifications);
  }, []);

  // 알림 확장/축소 토글
  const toggleExpand = (id: string) => {
    setExpandedNotifications(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // 알림을 읽음으로 표시
  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === id ? { ...notif, read: true } : notif
      )
    );
  };

  // 알림 삭제
  const deleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(notif => notif.id !== id));
  };

  // 모든 알림을 읽음으로 표시
  const markAllAsRead = () => {
    setNotifications(prev => prev.map(notif => ({ ...notif, read: true })));
  };

  // 필터링 및 검색된 알림 목록
  const filteredNotifications = notifications.filter(notif => {
    // 검색어 필터링
    if (searchQuery && !notif.title.toLowerCase().includes(searchQuery.toLowerCase()) && 
        !notif.content.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }

    return true;
  });

  // 읽지 않은 알림 개수
  const unreadCount = notifications.filter(notif => !notif.read).length;

  return (
    <AppLayout>
      <div className="container mx-auto py-6 px-4 max-w-6xl">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">시스템 알림</h1>
            <p className="text-gray-500 mt-1">시스템 및 보안 관련 알림을 확인하세요</p>
          </div>
          <div className="flex items-center space-x-2">
            {unreadCount > 0 && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={markAllAsRead}
                className="flex items-center"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                모두 읽음
              </Button>
            )}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setNotifications([])}
              className="flex items-center"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              전체 삭제
            </Button>
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => window.location.href = '/notifications/settings'}
              title="알림 설정"
            >
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="mb-6">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <div className="flex items-start">
              <div className="bg-blue-100 dark:bg-blue-800 rounded-full p-2 mr-4">
                <Info className="h-6 w-6 text-blue-500 dark:text-blue-300" />
              </div>
              <div>
                <h3 className="font-medium text-blue-800 dark:text-blue-300">시스템 알림 정보</h3>
                <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                  시스템 알림은 PetEdu 서비스 업데이트, 점검 일정, 비밀번호 변경 요청 등 중요한 정보를 포함합니다.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="md:col-span-1">
            <NotificationsMenu currentPath="/notifications/system" />
          </div>

          <div className="md:col-span-3">
            <div className="mb-4">
              <Input 
                placeholder="알림 검색..." 
                value={searchQuery}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
              />
            </div>

            <Tabs defaultValue="all">
              <TabsList className="mb-4">
                <TabsTrigger value="all">전체</TabsTrigger>
                <TabsTrigger value="unread">읽지 않음 ({unreadCount})</TabsTrigger>
                <TabsTrigger value="read">읽음 ({notifications.length - unreadCount})</TabsTrigger>
              </TabsList>

              <TabsContent value="all">
                <div className="space-y-4">
                  {filteredNotifications.length > 0 ? (
                    filteredNotifications.map((notification) => (
                      <NotificationCard 
                        key={notification.id} 
                        notification={notification}
                        isExpanded={expandedNotifications.has(notification.id)}
                        onToggleExpand={() => toggleExpand(notification.id)}
                        onMarkAsRead={() => markAsRead(notification.id)}
                        onDelete={() => deleteNotification(notification.id)}
                      />
                    ))
                  ) : (
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
                      <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">알림이 없습니다</h3>
                      <p className="text-gray-500 dark:text-gray-400 mt-2">
                        {searchQuery ? 
                          `'${searchQuery}'에 대한 검색 결과가 없습니다.` : 
                          "이 카테고리에 알림이 없습니다."}
                      </p>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="unread">
                <div className="space-y-4">
                  {filteredNotifications.filter(n => !n.read).length > 0 ? (
                    filteredNotifications
                      .filter(n => !n.read)
                      .map((notification) => (
                        <NotificationCard 
                          key={notification.id} 
                          notification={notification}
                          isExpanded={expandedNotifications.has(notification.id)}
                          onToggleExpand={() => toggleExpand(notification.id)}
                          onMarkAsRead={() => markAsRead(notification.id)}
                          onDelete={() => deleteNotification(notification.id)}
                        />
                      ))
                  ) : (
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
                      <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">읽지 않은 알림이 없습니다</h3>
                      <p className="text-gray-500 dark:text-gray-400 mt-2">
                        모든 알림을 확인했습니다.
                      </p>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="read">
                <div className="space-y-4">
                  {filteredNotifications.filter(n => n.read).length > 0 ? (
                    filteredNotifications
                      .filter(n => n.read)
                      .map((notification) => (
                        <NotificationCard 
                          key={notification.id} 
                          notification={notification}
                          isExpanded={expandedNotifications.has(notification.id)}
                          onToggleExpand={() => toggleExpand(notification.id)}
                          onMarkAsRead={() => markAsRead(notification.id)}
                          onDelete={() => deleteNotification(notification.id)}
                        />
                      ))
                  ) : (
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
                      <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">읽은 알림이 없습니다</h3>
                      <p className="text-gray-500 dark:text-gray-400 mt-2">
                        아직 읽은 알림이 없습니다.
                      </p>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

// 알림 카드 컴포넌트
interface NotificationCardProps {
  notification: Notification;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onMarkAsRead: () => void;
  onDelete: () => void;
}

function NotificationCard({ 
  notification, 
  isExpanded, 
  onToggleExpand, 
  onMarkAsRead, 
  onDelete 
}: NotificationCardProps) {
  const { icon, color } = notificationTypeMap[notification.type];

  // 알림 읽음 표시
  const handleClick = () => {
    if (!notification.read) {
      onMarkAsRead();
    }
    onToggleExpand();
  };

  return (
    <Card className={`p-4 border-l-4 transition-all ${!notification.read ? 'border-l-blue-500' : 'border-l-transparent'}`}>
      <div className="flex items-start">
        <div className={`rounded-full w-10 h-10 flex items-center justify-center mr-4 ${color}`}>
          {icon}
        </div>

        <div className="flex-1">
          <div className="flex items-start justify-between">
            <div>
              <h3 className={`font-semibold ${!notification.read ? 'text-gray-900 dark:text-gray-100' : 'text-gray-700 dark:text-gray-300'}`}>
                {notification.title}
              </h3>
              <div className="flex items-center text-xs text-gray-500 mt-1">
                <Clock className="w-3 h-3 mr-1" />
                <span>
                  {format(new Date(notification.timestamp), 'yyyy년 M월 d일 a h:mm', { locale: ko })}
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-1">
              {!notification.read && (
                <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200">
                  새 알림
                </Badge>
              )}
            </div>
          </div>

          <div className={`text-sm mt-2 ${isExpanded ? '' : 'line-clamp-2'} text-gray-600 dark:text-gray-400`}>
            {notification.content}
          </div>

          <div className="flex items-center justify-between mt-3">
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-xs"
              onClick={handleClick}
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="w-3 h-3 mr-1" />
                  간략히 보기
                </>
              ) : (
                <>
                  <ChevronDown className="w-3 h-3 mr-1" />
                  자세히 보기
                </>
              )}
            </Button>

            <div className="flex items-center space-x-2">
              {notification.link && (
                <Button 
                  variant="outline" 
                  size="sm"
                  className="text-xs h-7 px-2 py-0"
                  asChild
                >
                  <a href={notification.link}>바로 가기</a>
                </Button>
              )}

              {!notification.read && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="text-xs h-7 px-2 py-0"
                  onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                    e.stopPropagation();
                    onMarkAsRead();
                  }}
                >
                  읽음 표시
                </Button>
              )}

              <Button 
                variant="ghost" 
                size="sm"
                className="text-xs h-7 px-2 py-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                  e.stopPropagation();
                  onDelete();
                }}
              >
                삭제
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}