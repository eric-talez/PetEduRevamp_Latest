import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription,
  CardFooter
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  MessageSquare,
  Send,
  User,
  Users,
  Settings,
  ChevronRight
} from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

// 메시지 타입 정의
interface Message {
  id: string;
  sender: {
    id: number;
    name: string;
    role: string;
    avatar?: string;
  };
  receiver: {
    id: number;
    name: string;
    role?: string;
    avatar?: string;
  };
  content: string;
  timestamp: Date;
  isRead: boolean;
}

// 대화 상대 타입 정의
interface Contact {
  id: number;
  name: string;
  role: string;
  avatar?: string;
  status: 'online' | 'offline' | 'away';
  lastSeen?: Date;
  unreadCount: number;
}

export default function MessagingPage() {
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState('messages');
  const [messageInput, setMessageInput] = useState('');
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [uploadingFile, setUploadingFile] = useState(false);

  // 샘플 데이터 로드
  useEffect(() => {
    // 샘플 연락처 데이터
    const sampleContacts: Contact[] = [
      {
        id: 101,
        name: '김철수 훈련사',
        role: 'trainer',
        avatar: '/images/avatars/trainer1.jpg',
        status: 'online',
        unreadCount: 3
      },
      {
        id: 102,
        name: '이영희 훈련사',
        role: 'trainer',
        avatar: '/images/avatars/trainer2.jpg',
        status: 'offline',
        lastSeen: new Date(Date.now() - 1000 * 60 * 30), // 30분 전
        unreadCount: 0
      },
      {
        id: 103,
        name: '박지민 관리자',
        role: 'admin',
        avatar: '/images/avatars/admin1.jpg',
        status: 'away',
        lastSeen: new Date(),
        unreadCount: 1
      },
      {
        id: 104,
        name: '반려동물 케어센터',
        role: 'institute',
        avatar: '/images/avatars/institute1.jpg',
        status: 'online',
        unreadCount: 0
      }
    ];

    setContacts(sampleContacts);
    // 기본으로 첫 번째 연락처 선택
    setSelectedContact(sampleContacts[0]);

    // 샘플 메시지 데이터 (첫 번째 연락처와의 대화)
    const sampleMessages: Message[] = [
      {
        id: '1',
        sender: {
          id: 101,
          name: '김철수 훈련사',
          role: 'trainer',
          avatar: '/images/avatars/trainer1.jpg'
        },
        receiver: {
          id: user?.id || 1,
          name: user?.name || '사용자',
          role: user?.role || 'user'
        },
        content: '안녕하세요! 오늘 훈련은 어떠셨나요?',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2시간 전
        isRead: true
      },
      {
        id: '2',
        sender: {
          id: user?.id || 1,
          name: user?.name || '사용자',
          role: user?.role || 'user'
        },
        receiver: {
          id: 101,
          name: '김철수 훈련사',
          role: 'trainer',
          avatar: '/images/avatars/trainer1.jpg'
        },
        content: '오늘 훈련이 정말 좋았어요! 몇 가지 질문이 있는데요.',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 1), // 1시간 전
        isRead: true
      },
      {
        id: '3',
        sender: {
          id: 101,
          name: '김철수 훈련사',
          role: 'trainer',
          avatar: '/images/avatars/trainer1.jpg'
        },
        receiver: {
          id: user?.id || 1,
          name: user?.name || '사용자',
          role: user?.role || 'user'
        },
        content: '질문 있으시면 언제든지 물어보세요! 도움이 필요하신가요?',
        timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30분 전
        isRead: false
      },
      {
        id: '4',
        sender: {
          id: 101,
          name: '김철수 훈련사',
          role: 'trainer',
          avatar: '/images/avatars/trainer1.jpg'
        },
        receiver: {
          id: user?.id || 1,
          name: user?.name || '사용자',
          role: user?.role || 'user'
        },
        content: '다음 수업은 목요일 오후 3시입니다. 준비해 오실 것은 없습니다.',
        timestamp: new Date(Date.now() - 1000 * 60 * 20), // 20분 전
        isRead: false
      },
      {
        id: '5',
        sender: {
          id: 101,
          name: '김철수 훈련사',
          role: 'trainer',
          avatar: '/images/avatars/trainer1.jpg'
        },
        receiver: {
          id: user?.id || 1,
          name: user?.name || '사용자',
          role: user?.role || 'user'
        },
        content: '그리고 지난번에 말씀드린 강아지 장난감 추천 목록을 보내드립니다.',
        timestamp: new Date(Date.now() - 1000 * 60 * 15), // 15분 전
        isRead: false
      }
    ];

    setMessages(sampleMessages);
  }, [user]);

  // 메시지 전송 처리
  const handleSendMessage = () => {
    if (!messageInput.trim() || !selectedContact) return;

    // 새 메시지 생성
    const newMessage: Message = {
      id: Date.now().toString(),
      sender: {
        id: user?.id || 1,
        name: user?.name || '사용자',
        role: user?.role || 'user'
      },
      receiver: {
        id: selectedContact.id,
        name: selectedContact.name,
        role: selectedContact.role,
        avatar: selectedContact.avatar
      },
      content: messageInput,
      timestamp: new Date(),
      isRead: false
    };

    // 메시지 목록에 추가
    setMessages(prev => [...prev, newMessage]);

    // 입력 필드 초기화
    setMessageInput('');
  };

  // 연락처 선택 처리
  const handleSelectContact = (contact: Contact) => {
    setSelectedContact(contact);

    // 실제 구현에서는 서버에서 해당 연락처와의 메시지 이력을 가져옴
    // 여기서는 샘플 데이터만 표시
  };

  return (
    <div className="container py-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold">메시징</h1>
          <p className="text-muted-foreground mt-1">
            훈련사, 기관 및 다른 사용자와 대화하세요
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button>
            <MessageSquare className="h-4 w-4 mr-2" />
            새 대화
          </Button>
        </div>
      </div>

      <Tabs defaultValue="messages" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="messages">메시지</TabsTrigger>
          <TabsTrigger value="contacts">연락처</TabsTrigger>
          <TabsTrigger value="settings">설정</TabsTrigger>
        </TabsList>

        <TabsContent value="messages" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[calc(100vh-250px)]">
            {/* 연락처 목록 (모바일에서는 숨김) */}
            <Card className="hidden md:block overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle>대화 목록</CardTitle>
                <CardDescription>
                  최근 대화 상대 ({contacts.length})
                </CardDescription>
              </CardHeader>
              <ScrollArea className="h-[calc(100vh-350px)]">
                <CardContent className="p-0">
                  <div className="divide-y">
                    {contacts.map(contact => (
                      <div
                        key={contact.id}
                        className={`
                          p-4 cursor-pointer hover:bg-accent transition-colors
                          ${selectedContact?.id === contact.id ? 'bg-accent' : ''}
                        `}
                        onClick={() => handleSelectContact(contact)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <Avatar>
                              <AvatarImage src={contact.avatar} alt={contact.name} />
                              <AvatarFallback>
                                {contact.name.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <span
                              className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-background
                                ${contact.status === 'online' ? 'bg-success' : 
                                  contact.status === 'away' ? 'bg-warning' : 'bg-gray-400'}
                              `}
                            />
                          </div>
                          <div className="flex-grow min-w-0">
                            <div className="flex justify-between items-center">
                              <h4 className="font-medium truncate">{contact.name}</h4>
                              <span className="text-xs text-muted-foreground">
                                {contact.lastSeen 
                                  ? format(contact.lastSeen, 'p', { locale: ko })
                                  : contact.status === 'online' ? '온라인' : '오프라인'
                                }
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground truncate">
                              {contact.role === 'trainer' ? '훈련사' :
                               contact.role === 'admin' ? '관리자' :
                               contact.role === 'institute' ? '기관' : '사용자'}
                            </p>
                          </div>
                          {contact.unreadCount > 0 && (
                            <span className="bg-primary text-primary-foreground w-5 h-5 flex items-center justify-center rounded-full text-xs">
                              {contact.unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </ScrollArea>
            </Card>

            {/* 메시지 영역 */}
            <Card className="md:col-span-2 flex flex-col h-full">
              {selectedContact ? (
                <>
                  {/* 대화 상대 헤더 */}
                  <CardHeader className="pb-2 border-b">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={selectedContact.avatar} alt={selectedContact.name} />
                        <AvatarFallback>{selectedContact.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-base">{selectedContact.name}</CardTitle>
                        <CardDescription className="text-xs">
                          {selectedContact.status === 'online' ? '온라인' : 
                           selectedContact.lastSeen 
                             ? `마지막 접속: ${format(selectedContact.lastSeen, 'Pp', { locale: ko })}` 
                             : '오프라인'}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>

                  {/* 메시지 목록 */}
                  <ScrollArea className="flex-grow h-[calc(100vh-450px)]">
                    <CardContent className="p-4">
                      <div className="space-y-4">
                        {messages.map(message => (
                          <div 
                            key={message.id}
                            className={`
                              flex 
                              ${message.sender.id === (user?.id || 1) ? 'justify-end' : 'justify-start'}
                            `}
                          >
                            {message.sender.id !== (user?.id || 1) && (
                              <Avatar className="h-8 w-8 mr-2 mt-1">
                                <AvatarImage src={message.sender.avatar} alt={message.sender.name} />
                                <AvatarFallback>{message.sender.name.charAt(0)}</AvatarFallback>
                              </Avatar>
                            )}

                            <div 
                              className={`
                                max-w-[70%] p-3 rounded-lg
                                ${message.sender.id === (user?.id || 1) 
                                  ? 'bg-primary text-primary-foreground' 
                                  : 'bg-muted'
                                }
                              `}
                            >
                              <p className="text-sm break-words">{message.content}</p>
                              <p className="text-xs mt-1 opacity-70 text-right">
                                {format(message.timestamp, 'p', { locale: ko })}
                                {message.sender.id === (user?.id || 1) && (
                                  <span className="ml-1">
                                    {message.isRead ? ' 읽음' : ' 전송됨'}
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </ScrollArea>

                  {/* 메시지 입력 */}
                  <CardFooter className="border-t p-4">
                    <div className="flex w-full gap-2">
                      <Input
                        placeholder="메시지를 입력하세요..."
                        value={messageInput}
                        onChange={e => setMessageInput(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                        className="flex-grow"
                      />
                      <Button 
                        onClick={handleSendMessage}
                        disabled={!messageInput.trim()}
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardFooter>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full p-4">
                  <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">대화가 없습니다</h3>
                  <p className="text-muted-foreground text-center mt-1 mb-4">
                    왼쪽에서 대화 상대를 선택하거나 새 대화를 시작하세요
                  </p>
                  <Button>
                    <MessageSquare className="h-4 w-4 mr-2" />
                    새 대화 시작하기
                  </Button>
                </div>
              )}
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="contacts" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>연락처</CardTitle>
              <CardDescription>
                내 연락처 목록을 관리하세요
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-medium">즐겨찾는 연락처</h3>
                  <Button variant="ghost" size="sm">
                    <User className="h-4 w-4 mr-2" />
                    연락처 추가
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {contacts.slice(0, 3).map(contact => (
                    <Card key={contact.id} className="overflow-hidden">
                      <CardContent className="p-0">
                        <div className="p-4 flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={contact.avatar} alt={contact.name} />
                            <AvatarFallback>{contact.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div className="flex-grow min-w-0">
                            <h4 className="font-medium truncate">{contact.name}</h4>
                            <p className="text-sm text-muted-foreground truncate">
                              {contact.role === 'trainer' ? '훈련사' :
                               contact.role === 'admin' ? '관리자' :
                               contact.role === 'institute' ? '기관' : '사용자'}
                            </p>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => {
                              setSelectedContact(contact);
                              setActiveTab('messages');
                            }}
                          >
                            <MessageSquare className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <Separator className="my-4" />

                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-medium">그룹 및 팀</h3>
                  <Button variant="ghost" size="sm">
                    <Users className="h-4 w-4 mr-2" />
                    그룹 만들기
                  </Button>
                </div>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">반려동물 훈련 그룹</CardTitle>
                    <CardDescription>5명의 멤버</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex -space-x-2 mb-2">
                      {contacts.slice(0, 4).map((contact, index) => (
                        <Avatar key={index} className="border-2 border-background">
                          <AvatarImage src={contact.avatar} alt={contact.name} />
                          <AvatarFallback>{contact.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                      ))}
                      <div className="flex items-center justify-center rounded-full bg-accent text-accent-foreground w-8 h-8 border-2 border-background">
                        <span className="text-xs">+1</span>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      마지막 활동: 오늘 오전 9:30
                    </p>
                  </CardContent>
                  <CardFooter>
                    <Button variant="outline" className="w-full">
                      <MessageSquare className="h-4 w-4 mr-2" />
                      그룹 채팅 참여하기
                    </Button>
                  </CardFooter>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>메시징 설정</CardTitle>
              <CardDescription>
                알림 및 메시지 설정을 관리하세요
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-medium mb-2">알림 설정</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label htmlFor="all-messages" className="text-sm">모든 메시지 알림</label>
                      <Switch id="all-messages" defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <label htmlFor="direct-messages" className="text-sm">1:1 대화 알림만</label>
                      <Switch id="direct-messages" />
                    </div>
                    <div className="flex items-center justify-between">
                      <label htmlFor="group-messages" className="text-sm">그룹 대화 알림</label>
                      <Switch id="group-messages" defaultChecked />
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-base font-medium mb-2">대화 설정</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label htmlFor="read-receipts" className="text-sm">읽음 확인 표시</label>
                      <Switch id="read-receipts" defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <label htmlFor="typing-indicator" className="text-sm">입력 중 표시</label>
                      <Switch id="typing-indicator" defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <label htmlFor="auto-archive" className="text-sm">오래된 대화 자동 보관</label>
                      <Switch id="auto-archive" />
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-base font-medium mb-2">보안 및 개인 정보</h3>
                  <div className="space-y-4">
                    <Card className="bg-card">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="text-sm font-medium">차단된 사용자</h4>
                            <p className="text-xs text-muted-foreground">
                              0명의 차단된 사용자
                            </p>
                          </div>
                          <Button variant="ghost" size="sm">
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-card">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="text-sm font-medium">메시지 보관 기간</h4>
                            <p className="text-xs text-muted-foreground">
                              모든 메시지 영구 보관
                            </p>
                          </div>
                          <Button variant="ghost" size="sm">
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    <Button variant="destructive" className="w-full">
                      모든 대화 기록 삭제
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}