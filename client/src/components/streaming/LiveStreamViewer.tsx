import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import Peer, { Instance as PeerInstance } from 'simple-peer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useStreamingSocket, type SignalData, type PeerInfo } from './useStreamingSocket';
import { 
  Video, 
  X, 
  Eye, 
  Users, 
  MessageCircle, 
  Send,
  Maximize2,
  Minimize2,
  Share2,
  Volume2,
  VolumeX,
  Loader2,
  Wifi,
  WifiOff,
  AlertCircle,
} from 'lucide-react';

interface StreamData {
  id: number;
  hostId: number;
  title: string;
  description?: string | null;
  category?: string | null;
  meetingUrl?: string | null;
  thumbnailUrl?: string | null;
  status?: string | null;
  currentViewers?: number | null;
  hostName?: string | null;
  hostAvatar?: string | null;
}

interface LiveStreamViewerProps {
  stream: StreamData;
  onExit: () => void;
}

interface ChatMessage {
  id: number;
  streamId: number;
  userId: number;
  message: string;
  userName?: string | null;
  userAvatar?: string | null;
  isHighlighted?: boolean;
  isPinned?: boolean;
  createdAt: Date;
}

interface PeerConnection {
  peerId: string;
  peer: PeerInstance;
  role: 'host' | 'viewer';
}

export function LiveStreamViewer({ stream, onExit }: LiveStreamViewerProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [chatMessage, setChatMessage] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showChat, setShowChat] = useState(true);
  const [isConnecting, setIsConnecting] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [viewerCount, setViewerCount] = useState(stream.currentViewers || 0);
  const [connectionQuality, setConnectionQuality] = useState<'good' | 'fair' | 'poor' | 'disconnected'>('disconnected');
  
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peersRef = useRef<Map<string, PeerConnection>>(new Map());

  const { data: chatData, refetch: refetchChat } = useQuery<{ messages: ChatMessage[] }>({
    queryKey: ['/api/live-streaming/streams', stream.id, 'chat'],
    refetchInterval: 3000,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      const csrfRes = await fetch('/api/auth/csrf', { credentials: 'include' });
      const csrfData = await csrfRes.json();
      const csrfToken = csrfData.csrfToken || csrfData.data?.token;
      
      const response = await fetch(`/api/live-streaming/streams/${stream.id}/chat`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken 
        },
        body: JSON.stringify({ message }),
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to send message');
      return response.json();
    },
    onSuccess: () => {
      setChatMessage('');
      refetchChat();
    },
    onError: () => {
      toast({
        title: '메시지 전송 실패',
        description: '채팅 메시지를 전송할 수 없습니다.',
        variant: 'destructive',
      });
    },
  });

  const createPeerConnection = useCallback((
    peerId: string, 
    initiator: boolean, 
    peerInfo: PeerInfo,
    initialSignal?: SignalData,
    sendSignalFn?: (data: SignalData) => void
  ) => {
    const peer = new Peer({
      initiator,
      trickle: true,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
        ],
      },
    });

    peer.on('signal', (signalData) => {
      if (sendSignalFn) {
        sendSignalFn({
          ...signalData as any,
          to: peerId,
          streamId: stream.id,
        });
      }
    });

    peer.on('stream', (incomingStream) => {
      console.log('[Viewer] Received stream from host');
      setRemoteStream(incomingStream);
      setIsConnecting(false);
      setConnectionQuality('good');
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = incomingStream;
      }
    });

    peer.on('connect', () => {
      console.log('[Viewer] Peer connected');
      setConnectionQuality('good');
    });

    peer.on('error', (err) => {
      console.error('[Viewer] Peer error:', err);
      setConnectionQuality('poor');
    });

    peer.on('close', () => {
      console.log('[Viewer] Peer closed');
      peersRef.current.delete(peerId);
      if (peerInfo.role === 'host') {
        setRemoteStream(null);
        setConnectionQuality('disconnected');
      }
    });

    if (initialSignal) {
      peer.signal(initialSignal as unknown as Peer.SignalData);
    }

    const peerConnection: PeerConnection = {
      peerId,
      peer,
      role: peerInfo.role,
    };

    peersRef.current.set(peerId, peerConnection);
    return peer;
  }, [stream.id]);

  const handleStreamJoined = useCallback((data: { peers: PeerInfo[] }) => {
    console.log('[Viewer] Joined stream, peers:', data.peers.length);
    setIsConnecting(false);
    setViewerCount(data.peers.length);
    setConnectionQuality('good');
    
    const hostPeer = data.peers.find(p => p.role === 'host');
    if (hostPeer) {
      console.log('[Viewer] Found host, creating peer connection');
    } else {
      console.log('[Viewer] No host broadcasting yet, waiting...');
    }
  }, []);

  const handlePeerJoined = useCallback((data: { peerId: string; role: 'host' | 'viewer'; userId?: number; userName?: string }) => {
    console.log('[Viewer] Peer joined:', data);
    if (data.role !== 'host') {
      setViewerCount(prev => prev + 1);
    }
  }, []);

  const handlePeerLeft = useCallback((data: { peerId: string }) => {
    console.log('[Viewer] Peer left:', data.peerId);
    const peerConn = peersRef.current.get(data.peerId);
    if (peerConn) {
      peerConn.peer.destroy();
      peersRef.current.delete(data.peerId);
      if (peerConn.role === 'host') {
        setRemoteStream(null);
        setConnectionError('호스트가 방송을 종료했습니다.');
      }
    }
    setViewerCount(prev => Math.max(0, prev - 1));
  }, []);

  const handleSignal = useCallback((data: SignalData, sendSignalFn: (d: SignalData) => void) => {
    console.log('[Viewer] Received signal from:', data.from);
    const peerConn = peersRef.current.get(data.from);
    if (peerConn) {
      peerConn.peer.signal(data as unknown as Peer.SignalData);
    } else {
      createPeerConnection(data.from, false, {
        peerId: data.from,
        streamId: stream.id,
        role: 'host',
        connectionQuality: 'good',
      }, data, sendSignalFn);
    }
  }, [createPeerConnection, stream.id]);

  const handleStreamEnded = useCallback(() => {
    toast({
      title: '방송 종료',
      description: '호스트가 방송을 종료했습니다.',
    });
    onExit();
  }, [onExit, toast]);

  const handleError = useCallback((error: { message: string }) => {
    setConnectionError(error.message);
    setIsConnecting(false);
  }, []);

  const handleConnectionChange = useCallback((connected: boolean) => {
    setConnectionQuality(connected ? 'good' : 'disconnected');
    if (!connected) {
      setIsConnecting(true);
    }
  }, []);

  const {
    isConnected,
    connect,
    disconnect,
    joinStream,
    leaveStream,
    sendSignal,
  } = useStreamingSocket({
    onStreamJoined: handleStreamJoined,
    onPeerJoined: handlePeerJoined,
    onPeerLeft: handlePeerLeft,
    onSignal: (data) => handleSignal(data, sendSignal),
    onStreamEnded: handleStreamEnded,
    onError: handleError,
    onConnectionChange: handleConnectionChange,
  });

  useEffect(() => {
    console.log('[Viewer] Connecting to stream:', stream.id);
    connect();

    return () => {
      peersRef.current.forEach(({ peer }) => peer.destroy());
      peersRef.current.clear();
      leaveStream(stream.id);
      disconnect();
    };
  }, []);

  // Join stream when connected (only once)
  const hasJoinedRef = useRef(false);
  useEffect(() => {
    if (isConnected && !hasJoinedRef.current) {
      console.log('[Viewer] Socket connected, joining stream:', stream.id);
      hasJoinedRef.current = true;
      joinStream(stream.id, user?.id, 'viewer');
    }
  }, [isConnected]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (chatMessage.trim()) {
      sendMessageMutation.mutate(chatMessage.trim());
    }
  };

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatData?.messages]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  const toggleFullscreen = useCallback(async () => {
    if (!videoContainerRef.current) return;
    
    try {
      if (!document.fullscreenElement) {
        await videoContainerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (err) {
      console.error('Fullscreen error:', err);
    }
  }, []);

  const handleShare = async () => {
    const shareText = `${stream.title} - 라이브 방송\n${stream.hostName || '훈련사'}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: stream.title, text: shareText });
      } else {
        await navigator.clipboard.writeText(shareText);
        toast({ title: '복사 완료', description: '라이브 정보가 복사되었습니다.' });
      }
    } catch (err) {
      console.log('Share failed:', err);
    }
  };

  const messages = chatData?.messages || [];

  const getConnectionIcon = () => {
    switch (connectionQuality) {
      case 'good':
        return <Wifi className="w-4 h-4 text-green-500" />;
      case 'fair':
        return <Wifi className="w-4 h-4 text-yellow-500" />;
      case 'poor':
        return <Wifi className="w-4 h-4 text-red-500" />;
      default:
        return <WifiOff className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <div className="space-y-4" data-testid="live-stream-viewer">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <div 
            ref={videoContainerRef}
            className="relative bg-black rounded-xl overflow-hidden aspect-video"
          >
            {remoteStream ? (
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                muted={isMuted}
                className="w-full h-full object-cover"
                data-testid="video-remote-stream"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-900 to-black">
                <div className="text-center px-4">
                  {connectionError ? (
                    <>
                      <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
                      <h3 className="text-white text-lg font-bold mb-2">연결 오류</h3>
                      <p className="text-white/70 text-sm mb-4">{connectionError}</p>
                      <Button onClick={onExit} variant="outline" data-testid="btn-error-exit">
                        돌아가기
                      </Button>
                    </>
                  ) : isConnecting ? (
                    <>
                      <div className="relative mb-6">
                        <div className="absolute inset-0 bg-primary/20 rounded-full blur-3xl animate-pulse" />
                        <Loader2 className="relative w-16 h-16 text-primary mx-auto animate-spin" />
                      </div>
                      <h3 className="text-white text-xl font-bold mb-2">{stream.title}</h3>
                      <p className="text-white/70 text-sm mb-2">{stream.hostName || '훈련사'}</p>
                      <p className="text-white/50 text-xs mb-4">
                        {isConnected ? '호스트의 영상을 기다리는 중...' : '스트리밍 서버에 연결 중...'}
                      </p>
                      <div className="flex items-center justify-center gap-2 text-white/50 text-xs">
                        {getConnectionIcon()}
                        <span>{isConnected ? '연결됨' : '연결 중...'}</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <Video className="w-16 h-16 text-primary mx-auto mb-4" />
                      <h3 className="text-white text-lg font-bold mb-2">대기 중</h3>
                      <p className="text-white/70 text-sm">호스트가 방송을 시작하면 영상이 표시됩니다.</p>
                    </>
                  )}
                </div>
              </div>
            )}
            
            <div className="absolute top-4 left-4 flex items-center gap-2">
              <span className="bg-red-500 text-white text-xs px-3 py-1 rounded-md flex items-center gap-1.5 font-medium">
                <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                LIVE
              </span>
              <span className="bg-black/60 text-white text-xs px-2 py-1 rounded-md flex items-center gap-1">
                <Eye className="w-3 h-3" />
                {viewerCount}명
              </span>
              <span className="bg-black/60 text-white text-xs px-2 py-1 rounded-md">
                {getConnectionIcon()}
              </span>
            </div>

            <div className="absolute top-4 right-4 flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="bg-black/60 text-white hover:bg-black/80"
                onClick={toggleFullscreen}
                data-testid="btn-fullscreen"
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="bg-black/60 text-white hover:bg-black/80"
                onClick={() => setIsMuted(!isMuted)}
                data-testid="btn-mute"
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="bg-black/60 text-white hover:bg-black/80 lg:hidden"
                onClick={() => setShowChat(!showChat)}
                data-testid="btn-toggle-chat"
              >
                <MessageCircle className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="bg-red-500/80 text-white hover:bg-red-600"
                onClick={onExit}
                data-testid="btn-close-viewer"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="absolute bottom-4 left-4 right-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden">
                    {stream.hostAvatar ? (
                      <img src={stream.hostAvatar} alt="" className="w-10 h-10 object-cover" />
                    ) : (
                      <Users className="w-5 h-5 text-white" />
                    )}
                  </div>
                  <div className="text-white">
                    <p className="font-medium text-sm">{stream.hostName || '훈련사'}</p>
                    <p className="text-xs text-white/60">{stream.category || '라이브 수업'}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="bg-black/60 text-white hover:bg-black/80"
                  onClick={handleShare}
                  data-testid="btn-share"
                >
                  <Share2 className="w-4 h-4 mr-1" /> 공유
                </Button>
              </div>
            </div>
          </div>

          <div className="hidden lg:block">
            <h2 className="text-lg font-bold mb-2">{stream.title}</h2>
            {stream.description && (
              <p className="text-sm text-muted-foreground">{stream.description}</p>
            )}
          </div>
        </div>

        <div className={`lg:col-span-1 ${showChat ? 'block' : 'hidden lg:block'}`}>
          <Card className="h-[500px] lg:h-full flex flex-col">
            <div className="p-3 border-b flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4" />
                <span className="font-medium text-sm">실시간 채팅</span>
              </div>
              <span className="text-xs text-muted-foreground">{messages.length}개 메시지</span>
            </div>
            
            <ScrollArea className="flex-1 p-3" ref={chatScrollRef}>
              <div className="space-y-3">
                {messages.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    아직 채팅 메시지가 없습니다.
                    <br />첫 번째 메시지를 보내보세요!
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div 
                      key={msg.id} 
                      className={`flex gap-2 ${msg.isPinned ? 'bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded-lg' : ''}`}
                    >
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex-shrink-0 flex items-center justify-center overflow-hidden">
                        {msg.userAvatar ? (
                          <img src={msg.userAvatar} alt="" className="w-7 h-7 object-cover" />
                        ) : (
                          <Users className="w-4 h-4 text-primary" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium">{msg.userName || '익명'}</span>
                          {msg.isHighlighted && (
                            <span className="text-[10px] bg-yellow-200 dark:bg-yellow-800 px-1 rounded">강조</span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground break-words">{msg.message}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
            
            <div className="p-3 border-t">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <Input
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  placeholder="메시지를 입력하세요..."
                  className="flex-1 text-sm"
                  maxLength={200}
                  data-testid="input-chat-message"
                />
                <Button 
                  type="submit" 
                  size="sm"
                  disabled={!chatMessage.trim() || sendMessageMutation.isPending}
                  data-testid="btn-send-message"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </div>
          </Card>
        </div>
      </div>
      
      <Separator className="my-4" />
    </div>
  );
}

export default LiveStreamViewer;
