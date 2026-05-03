import { MessagingProvider, useMessaging, Conversation } from '@/hooks/useMessaging';
import { ConversationList } from '@/components/messaging/ConversationList';
import { MessageList } from '@/components/messaging/MessageList';
import { MessageInput } from '@/components/messaging/MessageInput';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useGlobalAuth } from '@/hooks/useGlobalAuth';
import { useState, useEffect } from 'react';
import { MessagesSquare, ArrowLeft, Users, MessageCircle } from 'lucide-react';

interface ConversationHeaderProps {
  onBackClick: () => void;
  activeConversation: Conversation | null;
}

function ConversationHeader({ onBackClick, activeConversation }: ConversationHeaderProps) {
  const participantName = activeConversation?.participant?.name || '알 수 없음';
  
  return (
    <div className="p-3 border-b dark:border-gray-700 flex items-center bg-background">
      <Button 
        variant="ghost" 
        size="icon" 
        onClick={onBackClick} 
        className="mr-2"
        aria-label="대화 목록으로 돌아가기"
        data-testid="button-back"
      >
        <ArrowLeft className="h-5 w-5" />
      </Button>
      
      <div className="flex-1">
        {activeConversation ? (
          <div className="flex items-center">
            <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center mr-2">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="font-medium">{participantName}</div>
            </div>
          </div>
        ) : (
          <div className="text-muted-foreground">대화 선택됨</div>
        )}
      </div>
    </div>
  );
}

function MessagesContent() {
  const { isAuthenticated } = useGlobalAuth();
  const { activeConversation, isConnected } = useMessaging();
  const [isMobile, setIsMobile] = useState(false);
  const [showConversationList, setShowConversationList] = useState(true);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      
      if (!mobile) {
        setShowConversationList(true);
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  useEffect(() => {
    if (isMobile && activeConversation) {
      setShowConversationList(false);
    }
  }, [activeConversation, isMobile]);

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-full p-8 text-center">
        <div>
          <MessagesSquare className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <h2 className="text-xl font-semibold mb-2">로그인이 필요합니다</h2>
          <p className="text-gray-500">
            메시지 기능을 사용하려면 로그인해주세요.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full overflow-hidden">
      <div 
        className={`${
          isMobile ? (showConversationList ? 'w-full' : 'hidden') : 'w-1/3 lg:w-1/4'
        } h-full flex-shrink-0 border-r dark:border-gray-700`}
      >
        <div className="flex items-center justify-between p-3 border-b dark:border-gray-700">
          <h2 className="font-medium flex items-center">
            <MessageCircle className="h-5 w-5 mr-2 text-primary" />
            대화
          </h2>
          
          {!isConnected && (
            <div className="text-xs text-warning flex items-center">
              <span className="relative flex h-2 w-2 mr-1">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-warning/40 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-warning"></span>
              </span>
              연결 중...
            </div>
          )}
        </div>
        <ConversationList />
      </div>
      
      <div 
        className={`${
          isMobile ? (showConversationList ? 'hidden' : 'flex w-full') : 'flex flex-grow'
        } flex-col h-full`}
      >
        {isMobile && (
          <ConversationHeader 
            onBackClick={() => setShowConversationList(true)} 
            activeConversation={activeConversation}
          />
        )}
        
        <div className="flex-grow overflow-hidden">
          <MessageList />
        </div>
        
        <MessageInput />
      </div>
    </div>
  );
}

export default function MessagesPage() {
  return (
    <div className="container mx-auto py-4 px-2 sm:px-4 flex-grow flex flex-col">
      <div className="flex items-center mb-4">
        <h1 className="text-2xl font-bold flex items-center">
          <MessageCircle className="mr-2 h-6 w-6 text-primary" />
          메시지
        </h1>
      </div>
      
      <Card className="flex-grow flex flex-col overflow-hidden h-[calc(100vh-10rem)]">
        <MessagingProvider>
          <MessagesContent />
        </MessagingProvider>
      </Card>
    </div>
  );
}
