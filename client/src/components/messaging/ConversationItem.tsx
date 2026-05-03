import { memo } from 'react';
import { Conversation } from '@/hooks/useMessaging';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';

interface ConversationItemProps {
  conversation: Conversation;
  isActive: boolean;
  onClick: () => void;
}

// 아바타 색상 생성 (이름 기반)
const getInitialsColor = (name: string) => {
  const colors = [
    'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-primary/50',
    'bg-secondary/100', 'bg-indigo-500', 'bg-yellow-500', 'bg-primary'
  ];
  
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return colors[Math.abs(hash) % colors.length];
};

// 이니셜 생성
const getInitials = (name: string) => {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

// 메시지 미리보기 텍스트 가져오기
const getPreviewText = (conversation: Conversation) => {
  if (!conversation.lastMessage) return '새 대화';
  
  const { messageType, content } = conversation.lastMessage;
  
  if (messageType === 'image') return '🖼️ 이미지';
  if (messageType === 'notification') return '📢 알림';
  
  return content.length > 25 ? content.substring(0, 25) + '...' : content;
};

// 상대적 시간 가져오기
const getRelativeTime = (conversation: Conversation) => {
  if (!conversation.lastMessage?.createdAt) {
    if (conversation.lastMessageAt) {
      return formatDistanceToNow(new Date(conversation.lastMessageAt), {
        addSuffix: true,
        locale: ko
      });
    }
    return '';
  }
  
  return formatDistanceToNow(new Date(conversation.lastMessage.createdAt), {
    addSuffix: true,
    locale: ko
  });
};

function ConversationItemComponent({ conversation, isActive, onClick }: ConversationItemProps) {
  const participant = conversation.participant;
  const participantName = participant?.name || '알 수 없음';
  const participantAvatar = participant?.avatar;

  return (
    <div
      className={`flex items-start p-3 rounded-lg cursor-pointer transition-colors
        ${isActive ? 'bg-secondary' : 'hover:bg-secondary/50'}`}
      onClick={onClick}
      data-testid={`conversation-item-${conversation.id}`}
    >
      <div className="relative flex-shrink-0">
        <Avatar>
          {participantAvatar ? (
            <AvatarImage src={participantAvatar} alt={participantName} />
          ) : (
            <AvatarFallback className={getInitialsColor(participantName)}>
              {getInitials(participantName)}
            </AvatarFallback>
          )}
        </Avatar>
      </div>
      
      <div className="ml-3 flex-1 overflow-hidden">
        <div className="flex justify-between items-center">
          <div className="font-medium">{participantName}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
            {getRelativeTime(conversation)}
          </div>
        </div>
        
        <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
          {getPreviewText(conversation)}
        </div>
      </div>
      
      {conversation.unreadCount > 0 && (
        <div className="ml-2 bg-primary text-primary-foreground text-xs font-bold px-1.5 py-0.5 rounded-full">
          {conversation.unreadCount}
        </div>
      )}
    </div>
  );
}

// 메모이제이션 처리 (불필요한 리렌더링 방지)
export const ConversationItem = memo(ConversationItemComponent, (prevProps, nextProps) => {
  return (
    prevProps.conversation.id === nextProps.conversation.id &&
    prevProps.isActive === nextProps.isActive &&
    prevProps.conversation.unreadCount === nextProps.conversation.unreadCount &&
    prevProps.conversation.lastMessage?.id === nextProps.conversation.lastMessage?.id
  );
});
