import { useEffect } from 'react';
import { ConversationList } from '@/components/messaging/ConversationList';
import { MessageList } from '@/components/messaging/MessageList';
import { MessageInput } from '@/components/messaging/MessageInput';
import { MessagingProvider, useMessaging } from '@/hooks/useMessaging';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

// 메시징 페이지 내용
function MessagingContent() {
  const { isConnected, activeConversation } = useMessaging();
  
  if (!isConnected) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <div className="text-muted-foreground">WebSocket 연결 중...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      <div className="w-80 h-full">
        <ConversationList />
      </div>
      
      <div className="flex-1 flex flex-col h-full">
        {activeConversation ? (
          <>
            <div className="p-4 border-b dark:border-gray-700 flex items-center">
              <div className="font-medium">{activeConversation.userName}</div>
              <div className="ml-2 text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                {activeConversation.userRole === 'trainer' ? '훈련사' : 
                 activeConversation.userRole === 'institute-admin' ? '기관 관리자' :
                 activeConversation.userRole === 'admin' ? '관리자' : '반려동물 보호자'}
              </div>
              {activeConversation.isOnline && (
                <div className="ml-2 text-xs px-2 py-1 rounded-full bg-success/10 dark:bg-success/20 text-success dark:text-success/70">
                  온라인
                </div>
              )}
            </div>
            
            <div className="flex-1 overflow-hidden">
              <MessageList />
            </div>
            
            <MessageInput />
          </>
        ) : (
          <div className="flex items-center justify-center h-full p-4 text-center text-gray-500">
            왼쪽에서 대화를 선택하거나 새 메시지를 보내세요
          </div>
        )}
      </div>
    </div>
  );
}

// 메인 페이지 컴포넌트
export default function MessagingPage() {
  const { isAuthenticated, user } = useAuth();
  
  useEffect(() => {
    document.title = "메시지 | 펫에듀 플랫폼";
  }, []);
  
  if (!isAuthenticated || !user) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-gray-500">
          메시징 기능을 사용하려면 로그인이 필요합니다.
        </div>
      </div>
    );
  }
  
  return (
    <div className="h-full container max-w-screen-xl mx-auto my-6">
      <div className="flex flex-col h-full border rounded-lg shadow-sm dark:border-gray-700 overflow-hidden">
        <MessagingProvider>
          <MessagingContent />
        </MessagingProvider>
      </div>
    </div>
  );
}