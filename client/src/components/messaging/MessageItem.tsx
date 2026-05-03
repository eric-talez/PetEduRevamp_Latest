import { memo } from 'react';
import { Message } from '@/hooks/useMessaging';
import { format, isToday, isYesterday } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface MessageItemProps {
  message: Message;
  isCurrentUser: boolean;
  showAvatar?: boolean;
  showSender?: boolean;
  showDate?: boolean;
  previousMessage?: Message | null;
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

// 날짜 포맷팅 (오늘, 어제, 그 외)
const formatMessageDate = (date: Date) => {
  if (isToday(date)) {
    return '오늘';
  } else if (isYesterday(date)) {
    return '어제';
  } else {
    return format(date, 'yyyy년 M월 d일', { locale: ko });
  }
};

function MessageItemComponent({ 
  message, 
  isCurrentUser, 
  showAvatar = true, 
  showSender = true,
  showDate = false,
  previousMessage = null
}: MessageItemProps) {
  // 타임스탬프를 Date 객체로 변환
  const timestamp = new Date(message.createdAt);
  
  // 시스템 알림 메시지 여부 확인
  const isSystemNotification = message.messageType === 'notification';
  
  // 발신자 정보
  const senderName = message.sender?.name || '알 수 없음';
  const senderAvatar = message.sender?.avatar;
  
  // 이전 메시지와 동일한 발신자인지 확인 (아바타 표시 여부 결정)
  const isSameSender = previousMessage && 
    previousMessage.senderId === message.senderId &&
    !isSystemNotification;
  
  // 이전 메시지와 동일한 날짜인지 확인 (날짜 구분선 표시 여부 결정)
  const isSameDay = previousMessage && 
    new Date(previousMessage.createdAt).toDateString() === timestamp.toDateString();
  
  // 최종 표시 여부 결정
  const shouldShowAvatar = showAvatar && !isCurrentUser && !isSameSender;
  const shouldShowSender = showSender && !isCurrentUser && !isSameSender;
  const shouldShowDate = showDate && !isSameDay;
  
  return (
    <>
      {/* 날짜 구분선 */}
      {shouldShowDate && (
        <div className="flex justify-center my-4">
          <div className="bg-muted px-3 py-1 rounded-full text-xs text-muted-foreground">
            {formatMessageDate(timestamp)}
          </div>
        </div>
      )}
      
      <div 
        className={`flex ${isSystemNotification ? 'justify-center my-3' : isCurrentUser ? 'justify-end' : 'justify-start'} ${!isSystemNotification ? 'mb-2' : ''}`}
        data-testid={`message-item-${message.id}`}
      >
        {/* 시스템 알림 메시지일 경우 */}
        {isSystemNotification ? (
          <div className="bg-muted/50 px-4 py-1.5 rounded-full text-sm text-muted-foreground max-w-[80%] text-center">
            {message.content}
          </div>
        ) : (
          <>
            {/* 일반 메시지 - 아바타 */}
            {shouldShowAvatar && (
              <div className="flex-shrink-0 mr-2 mt-1">
                <Avatar className="w-8 h-8">
                  {senderAvatar ? (
                    <AvatarImage src={senderAvatar} alt={senderName} />
                  ) : (
                    <AvatarFallback className={getInitialsColor(senderName)}>
                      {getInitials(senderName)}
                    </AvatarFallback>
                  )}
                </Avatar>
              </div>
            )}
            
            {/* 아바타를 표시하지 않을 때 여백 처리 */}
            {!isCurrentUser && !shouldShowAvatar && (
              <div className="w-10"></div>
            )}
            
            <div className={`max-w-[75%]`}>
              {/* 발신자 이름 */}
              {shouldShowSender && (
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 ml-1">
                  {senderName}
                </div>
              )}
              
              <div className="flex items-end">
                {/* 현재 사용자가 보낸 메시지의 시간 */}
                {isCurrentUser && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 mr-2">
                    {format(timestamp, 'HH:mm')}
                    {message.isRead && (
                      <span className="ml-1 message-read-tick">✓</span>
                    )}
                  </div>
                )}
                
                {/* 메시지 내용 */}
                <div 
                  className={`rounded-lg px-3 py-1.5 ${
                    isCurrentUser 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {message.messageType === 'image' ? (
                    <img 
                      src={message.content} 
                      alt="Shared" 
                      className="max-w-full rounded cursor-pointer"
                      onClick={() => window.open(message.content, '_blank')}
                    />
                  ) : (
                    <div className="whitespace-pre-wrap break-words">{message.content}</div>
                  )}
                </div>
                
                {/* 상대방이 보낸 메시지의 시간 */}
                {!isCurrentUser && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                    {format(timestamp, 'HH:mm')}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}

// 메모이제이션 처리 (불필요한 리렌더링 방지)
export const MessageItem = memo(
  MessageItemComponent,
  function arePropsEqual(prevProps: MessageItemProps, nextProps: MessageItemProps): boolean {
    const prevMsgId = prevProps.previousMessage ? prevProps.previousMessage.id : null;
    const nextMsgId = nextProps.previousMessage ? nextProps.previousMessage.id : null;
    
    return (
      prevProps.message.id === nextProps.message.id &&
      prevProps.message.isRead === nextProps.message.isRead &&
      prevProps.isCurrentUser === nextProps.isCurrentUser &&
      prevProps.showAvatar === nextProps.showAvatar &&
      prevProps.showSender === nextProps.showSender &&
      prevProps.showDate === nextProps.showDate &&
      prevMsgId === nextMsgId
    );
  }
);
