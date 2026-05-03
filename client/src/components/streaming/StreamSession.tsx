import { useState, useEffect, useRef, useCallback } from 'react';
import Peer, { Instance as PeerInstance } from 'simple-peer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { 
  useStreamingSocket, 
  type PeerInfo, 
  type SignalData, 
  type ChatMessage,
  type StreamJoinedData,
  type PeerJoinedData,
  type PeerLeftData,
} from './useStreamingSocket';
import { 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  X, 
  Eye, 
  Users, 
  MessageCircle, 
  Send,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  Wifi,
  WifiOff,
  Loader2,
  AlertCircle,
  Radio,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface StreamSessionProps {
  streamId: number;
  userId?: number;
  userName?: string;
  isHost: boolean;
  onExit: () => void;
}

type ConnectionQuality = 'good' | 'fair' | 'poor' | 'disconnected';

interface PeerConnection {
  peerId: string;
  peer: PeerInstance;
  userId?: number;
  userName?: string;
  role: 'host' | 'viewer';
  stream?: MediaStream;
}

export function StreamSession({ 
  streamId, 
  userId, 
  userName, 
  isHost, 
  onExit 
}: StreamSessionProps) {
  const { toast } = useToast();
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [peers, setPeers] = useState<Map<string, PeerConnection>>(new Map());
  
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showChat, setShowChat] = useState(true);
  
  const [connectionQuality, setConnectionQuality] = useState<ConnectionQuality>('disconnected');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewerCount, setViewerCount] = useState(0);
  
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');

  const handleStreamJoined = useCallback((data: StreamJoinedData) => {
    console.log('[StreamSession] Stream joined successfully, peers:', data.peers.length);
    setIsLoading(false);
    setConnectionQuality('good');
    setViewerCount(data.peers.length);
  }, []);

  const handlePeerJoined = useCallback((data: PeerJoinedData) => {
    setViewerCount(prev => prev + 1);
    
    if (isHost || data.role === 'host') {
      createPeerConnection(data.peerId, isHost, {
        peerId: data.peerId,
        streamId,
        userId: data.userId,
        userName: data.userName,
        role: data.role,
        connectionQuality: 'good',
      });
    }
    
    toast({
      title: '참가자 입장',
      description: `${data.userName || '익명'} 님이 참가했습니다.`,
    });
  }, [isHost, streamId, toast]);

  const handlePeerLeft = useCallback((data: PeerLeftData) => {
    setViewerCount(prev => Math.max(0, prev - 1));
    
    setPeers(prev => {
      const newPeers = new Map(prev);
      const peerConn = newPeers.get(data.peerId);
      if (peerConn) {
        peerConn.peer.destroy();
        newPeers.delete(data.peerId);
      }
      return newPeers;
    });
    
    if (peers.get(data.peerId)?.role === 'host') {
      setRemoteStream(null);
    }
  }, [peers]);

  const handleSignal = useCallback((data: SignalData) => {
    const peerConn = peers.get(data.from);
    if (peerConn) {
      peerConn.peer.signal(data as unknown as Peer.SignalData);
    } else {
      createPeerConnection(data.from, false, {
        peerId: data.from,
        streamId,
        role: isHost ? 'viewer' : 'host',
        connectionQuality: 'good',
      }, data);
    }
  }, [peers, streamId, isHost]);

  const handleChatMessage = useCallback((message: ChatMessage) => {
    setChatMessages(prev => [...prev, message]);
    
    if (chatScrollRef.current) {
      setTimeout(() => {
        chatScrollRef.current!.scrollTop = chatScrollRef.current!.scrollHeight;
      }, 100);
    }
  }, []);

  const handleStreamEnded = useCallback(() => {
    toast({
      title: '스트리밍 종료',
      description: '호스트가 스트리밍을 종료했습니다.',
    });
    onExit();
  }, [onExit, toast]);

  const handleError = useCallback((error: { message: string }) => {
    setError(error.message);
    setIsLoading(false);
    toast({
      title: '연결 오류',
      description: error.message,
      variant: 'destructive',
    });
  }, [toast]);

  const handleConnectionChange = useCallback((connected: boolean) => {
    setConnectionQuality(connected ? 'good' : 'disconnected');
  }, []);

  const {
    isConnected,
    connectionError,
    connect,
    disconnect,
    joinStream,
    leaveStream,
    sendSignal,
    sendChatMessage,
    updateQuality,
    endStream,
  } = useStreamingSocket({
    onStreamJoined: handleStreamJoined,
    onPeerJoined: handlePeerJoined,
    onPeerLeft: handlePeerLeft,
    onSignal: handleSignal,
    onChatMessage: handleChatMessage,
    onStreamEnded: handleStreamEnded,
    onError: handleError,
    onConnectionChange: handleConnectionChange,
  });

  const createPeerConnection = useCallback((
    peerId: string, 
    initiator: boolean, 
    peerInfo: PeerInfo,
    initialSignal?: SignalData
  ) => {
    const peer = new Peer({
      initiator,
      trickle: true,
      stream: localStream || undefined,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
        ],
      },
    });

    peer.on('signal', (signalData) => {
      sendSignal({
        ...signalData as any,
        to: peerId,
        streamId,
      });
    });

    peer.on('stream', (stream) => {
      if (peerInfo.role === 'host' || (!isHost && !remoteStream)) {
        setRemoteStream(stream);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = stream;
        }
      }
    });

    peer.on('connect', () => {
      updateQuality('good');
    });

    peer.on('error', (err) => {
      console.error('Peer connection error:', err);
      updateQuality('poor');
    });

    peer.on('close', () => {
      setPeers(prev => {
        const newPeers = new Map(prev);
        newPeers.delete(peerId);
        return newPeers;
      });
    });

    if (initialSignal) {
      peer.signal(initialSignal as unknown as Peer.SignalData);
    }

    const peerConnection: PeerConnection = {
      peerId,
      peer,
      userId: peerInfo.userId,
      userName: peerInfo.userName,
      role: peerInfo.role,
    };

    setPeers(prev => new Map(prev).set(peerId, peerConnection));
    
    return peer;
  }, [localStream, sendSignal, streamId, isHost, remoteStream, updateQuality]);

  const hasJoinedRef = useRef(false);

  useEffect(() => {
    const initMedia = async () => {
      if (!isHost) {
        connect();
        return;
      }

      try {
        console.log('[StreamSession] Requesting camera/mic access...');
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user',
          },
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
          },
        });

        console.log('[StreamSession] Got local stream:', stream.getTracks().map(t => t.kind));
        setLocalStream(stream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        connect();
      } catch (err) {
        console.error('[StreamSession] Failed to get media:', err);
        setError('카메라/마이크 접근 권한이 필요합니다.');
        setIsLoading(false);
      }
    };

    initMedia();

    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      
      peers.forEach(({ peer }) => peer.destroy());
      
      leaveStream(streamId);
      disconnect();
    };
  }, []);

  // Join stream when connected (only once)
  useEffect(() => {
    if (isConnected && !hasJoinedRef.current) {
      console.log('[StreamSession] Socket connected, joining stream:', streamId, 'as', isHost ? 'host' : 'viewer');
      hasJoinedRef.current = true;
      joinStream(streamId, userId, isHost ? 'host' : 'viewer');
    }
  }, [isConnected]);

  const toggleVideo = useCallback(() => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  }, [localStream]);

  const toggleAudio = useCallback(() => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
      }
    }
  }, [localStream]);

  const toggleMute = useCallback(() => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.muted = !remoteVideoRef.current.muted;
      setIsMuted(remoteVideoRef.current.muted);
    }
  }, []);

  const toggleFullscreen = useCallback(async () => {
    if (!containerRef.current) return;
    
    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (err) {
      console.error('Fullscreen error:', err);
    }
  }, []);

  const handleSendChat = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !userId) return;

    sendChatMessage(streamId, userId, chatInput.trim());
    setChatInput('');
  }, [chatInput, streamId, userId, sendChatMessage]);

  const handleEndStream = useCallback(() => {
    endStream(streamId);
    onExit();
  }, [endStream, streamId, onExit]);

  const handleExit = useCallback(() => {
    leaveStream(streamId);
    onExit();
  }, [leaveStream, streamId, onExit]);

  const getQualityIcon = () => {
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

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4" data-testid="stream-error">
        <AlertCircle className="w-16 h-16 text-destructive" />
        <h3 className="text-lg font-semibold">연결 오류</h3>
        <p className="text-muted-foreground text-center max-w-md">{error}</p>
        <Button onClick={onExit} data-testid="btn-exit-error">
          돌아가기
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4" data-testid="stream-loading">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
        <h3 className="text-lg font-semibold">스트리밍 연결 중...</h3>
        <p className="text-muted-foreground">잠시만 기다려주세요</p>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="space-y-4"
      data-testid="stream-session"
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <div className="relative bg-black rounded-xl overflow-hidden aspect-video">
            {isHost ? (
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
                data-testid="video-local"
              />
            ) : (
              <>
                {remoteStream ? (
                  <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    muted={isMuted}
                    className="w-full h-full object-cover"
                    data-testid="video-remote"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-900 to-black">
                    <div className="text-center px-4">
                      <div className="relative mb-6">
                        <div className="absolute inset-0 bg-primary/20 rounded-full blur-3xl animate-pulse" />
                        <Video className="relative w-24 h-24 text-primary mx-auto" />
                      </div>
                      <p className="text-white/70 text-sm">호스트의 영상을 기다리는 중...</p>
                    </div>
                  </div>
                )}
              </>
            )}

            <div className="absolute top-4 left-4 flex items-center gap-2">
              <span className="bg-red-500 text-white text-xs px-3 py-1 rounded-md flex items-center gap-1.5 font-medium">
                <Radio className="w-3 h-3 animate-pulse" />
                LIVE
              </span>
              <span className="bg-black/60 text-white text-xs px-2 py-1 rounded-md flex items-center gap-1">
                <Eye className="w-3 h-3" />
                {viewerCount}명
              </span>
              <span className="bg-black/60 text-white text-xs px-2 py-1 rounded-md flex items-center gap-1">
                {getQualityIcon()}
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
              {!isHost && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="bg-black/60 text-white hover:bg-black/80"
                  onClick={toggleMute}
                  data-testid="btn-mute"
                >
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </Button>
              )}
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
                className={cn(
                  "text-white",
                  isHost ? "bg-red-500/80 hover:bg-red-600" : "bg-black/60 hover:bg-black/80"
                )}
                onClick={isHost ? handleEndStream : handleExit}
                data-testid="btn-exit"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {isHost && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="lg"
                  className={cn(
                    "rounded-full w-12 h-12",
                    isVideoEnabled 
                      ? "bg-white/20 text-white hover:bg-white/30" 
                      : "bg-red-500 text-white hover:bg-red-600"
                  )}
                  onClick={toggleVideo}
                  data-testid="btn-toggle-video"
                >
                  {isVideoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
                </Button>
                <Button
                  variant="ghost"
                  size="lg"
                  className={cn(
                    "rounded-full w-12 h-12",
                    isAudioEnabled 
                      ? "bg-white/20 text-white hover:bg-white/30" 
                      : "bg-red-500 text-white hover:bg-red-600"
                  )}
                  onClick={toggleAudio}
                  data-testid="btn-toggle-audio"
                >
                  {isAudioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                </Button>
              </div>
            )}

            {isHost && (
              <div className="absolute bottom-4 right-4">
                <div className="w-32 h-24 rounded-lg overflow-hidden bg-gray-900 border border-white/20">
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {viewerCount}명 시청 중
              </span>
            </div>
            <div className="flex items-center gap-2">
              {getQualityIcon()}
              <span className="text-sm text-muted-foreground capitalize">
                {connectionQuality === 'good' && '연결 상태 양호'}
                {connectionQuality === 'fair' && '연결 상태 보통'}
                {connectionQuality === 'poor' && '연결 상태 불안정'}
                {connectionQuality === 'disconnected' && '연결 끊김'}
              </span>
            </div>
          </div>
        </div>

        <div className={`lg:col-span-1 ${showChat ? 'block' : 'hidden lg:block'}`}>
          <Card className="h-[500px] lg:h-full flex flex-col">
            <div className="p-3 border-b flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4" />
                <span className="font-medium text-sm">실시간 채팅</span>
              </div>
              <span className="text-xs text-muted-foreground">
                {chatMessages.length}개 메시지
              </span>
            </div>
            
            <ScrollArea className="flex-1 p-3" ref={chatScrollRef}>
              <div className="space-y-3">
                {chatMessages.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    아직 채팅 메시지가 없습니다.
                    <br />첫 번째 메시지를 보내보세요!
                  </div>
                ) : (
                  chatMessages.map((msg) => (
                    <div 
                      key={msg.id} 
                      className="flex gap-2"
                      data-testid={`chat-message-${msg.id}`}
                    >
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex-shrink-0 flex items-center justify-center overflow-hidden">
                        {msg.userAvatar ? (
                          <img src={msg.userAvatar} alt="" className="w-7 h-7 object-cover" />
                        ) : (
                          <Users className="w-4 h-4 text-primary" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-medium">{msg.userName || '익명'}</span>
                        <p className="text-sm text-muted-foreground break-words">{msg.message}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
            
            <div className="p-3 border-t">
              <form onSubmit={handleSendChat} className="flex gap-2">
                <Input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="메시지를 입력하세요..."
                  className="flex-1 text-sm"
                  maxLength={200}
                  disabled={!userId}
                  data-testid="input-chat"
                />
                <Button 
                  type="submit" 
                  size="sm"
                  disabled={!chatInput.trim() || !userId}
                  data-testid="btn-send-chat"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default StreamSession;
