import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Send, Loader2, Coffee, User, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/lib/auth-compat';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// 기본 환영 메시지
const DEFAULT_WELCOME_MESSAGE = {
  id: 'welcome-1',
  role: 'assistant' as const,
  content: '안녕하세요! TALEZ의 AI 전문 어시스턴트입니다. 반려동물의 건강, 훈련, 영양, 행동 문제에 대해 전문적인 조언을 드릴 수 있습니다. 어떤 도움이 필요하신가요?'
};

export function SimpleChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    DEFAULT_WELCOME_MESSAGE
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [position, setPosition] = useState({ x: 24, y: 24 });
  const [size, setSize] = useState({ width: 320, height: 480 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });
  
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatbotRef = useRef<HTMLDivElement>(null);
  const { isAuthenticated } = useAuth();

  // 새 메시지가 추가될 때 스크롤을 아래로 이동
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 드래그 시작
  const handleDragStart = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    
    // 현재 요소의 크기를 고려한 드래그 오프셋 계산
    const currentWidth = isOpen ? size.width : 56; // 버튼: 56px, 창: size.width
    const currentHeight = isOpen ? size.height : 56; // 버튼: 56px, 창: size.height
    
    // 현재 위치에서 마우스 클릭 지점의 상대 위치 계산
    const currentLeft = window.innerWidth - position.x - currentWidth;
    const currentTop = window.innerHeight - position.y - currentHeight;
    
    setDragStart({
      x: e.clientX - currentLeft,
      y: e.clientY - currentTop
    });
    
    e.preventDefault();
    e.stopPropagation();
  }, [position, size, isOpen]);

  // 리사이즈 시작
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    setIsResizing(true);
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: size.width,
      height: size.height
    });
    
    e.preventDefault();
    e.stopPropagation();
  }, [size]);

  // 마우스 이동 처리
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const newX = e.clientX - dragStart.x;
        const newY = e.clientY - dragStart.y;
        
        // 현재 크기에 따른 화면 경계 제한
        const currentWidth = isOpen ? size.width : 56;
        const currentHeight = isOpen ? size.height : 56;
        
        const constrainedX = Math.max(0, Math.min(window.innerWidth - currentWidth, newX));
        const constrainedY = Math.max(0, Math.min(window.innerHeight - currentHeight, newY));
        
        // bottom/right 기준으로 좌표 변환
        const bottomPosition = window.innerHeight - constrainedY - currentHeight;
        const rightPosition = window.innerWidth - constrainedX - currentWidth;
        
        setPosition({ x: rightPosition, y: bottomPosition });
      }
      
      if (isResizing) {
        const deltaX = e.clientX - resizeStart.x;
        const deltaY = e.clientY - resizeStart.y;
        
        const newWidth = Math.max(280, Math.min(600, resizeStart.width + deltaX));
        const newHeight = Math.max(400, Math.min(800, resizeStart.height + deltaY));
        
        setSize({ width: newWidth, height: newHeight });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };

    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = 'none';
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.userSelect = '';
      };
    }
  }, [isDragging, isResizing, dragStart, resizeStart, size]);

  // 메시지 전송 처리 - OpenAI API 사용
  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const currentInput = inputValue.trim();
    
    // 사용자 메시지 생성
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: currentInput
    };

    // UI 업데이트
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      // 대화 기록 준비 (최근 10개 메시지만 전송하여 컨텍스트 유지)
      const conversationHistory = messages.slice(-10).map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      // 현재 사용자 메시지 추가
      conversationHistory.push({
        role: 'user',
        content: currentInput
      });

      // OpenAI API 호출
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: conversationHistory,
          model: 'gpt-4o', // 최신 OpenAI 모델 사용
          maxTokens: 800, // 적절한 응답 길이 제한
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `API 요청 실패: ${response.status}`);
      }

      const data = await response.json();
      
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.response || '응답을 받지 못했습니다.'
      };

      setMessages(prev => [...prev, assistantMessage]);
      setIsLoading(false);
    } catch (error) {
      console.error('AI 응답 오류:', error);
      
      // API 오류 시 사용자 입력에 맞는 지능형 응답 제공
      const fallbackResponse = getIntelligentResponse(currentInput);
      const errorMessage: Message = {
        id: `fallback-${Date.now()}`,
        role: 'assistant',
        content: fallbackResponse
      };
      
      setMessages(prev => [...prev, errorMessage]);
      setIsLoading(false);
    }
  };

  // 지능형 대화 시스템 - 사용자 입력 분석 및 맞춤형 응답
  function getIntelligentResponse(input: string): string {
    const lowerInput = input.toLowerCase().trim();
    
    // 더 복잡한 키워드 매칭과 컨텍스트 분석
    const getRandomElement = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];
    
    // 인사 관련 - 다양한 응답
    const greetingKeywords = ['안녕', '반가워', '처음', '시작', 'hello', 'hi', '안녕하세요'];
    if (greetingKeywords.some(keyword => lowerInput.includes(keyword))) {
      const greetings = [
        '안녕하세요! TALEZ AI 어시스턴트입니다. 반려동물에 대해 어떤 궁금한 점이 있으신가요?',
        '반갑습니다! 반려동물의 건강과 훈련에 대해 도움을 드릴 수 있어요. 무엇이 궁금하신가요?',
        '안녕하세요! 오늘도 우리 반려동물을 위한 좋은 정보를 찾고 계시는군요. 어떤 도움이 필요하신지 알려주세요.',
        '환영합니다! TALEZ에서 반려동물 케어 전문가로 활동하고 있어요. 어떤 상황에 대해 조언이 필요하신가요?'
      ];
      return getRandomElement(greetings);
    }
    
    // 강아지 관련 다양한 키워드 조합 분석
    if (lowerInput.includes('강아지') || lowerInput.includes('개') || lowerInput.includes('댕댕이')) {
      // 짖음 문제
      if (lowerInput.includes('짖') || lowerInput.includes('짓') || lowerInput.includes('소음') || lowerInput.includes('시끄')) {
        const barkingResponses = [
          `강아지가 ${lowerInput.includes('밤') ? '밤에' : lowerInput.includes('아침') ? '아침에' : ''} 짖는 것 때문에 고민이시군요. 짖음의 원인을 파악하는 것이 우선입니다.\n\n가능한 원인:\n• 외부 소음이나 자극에 대한 반응\n• 관심을 끌고 싶어하는 행동\n• 불안하거나 스트레스 받는 상황\n• 영역을 지키려는 본능\n\n즉시 해볼 수 있는 방법:\n• 짖는 순간 주의를 다른 곳으로 돌리기\n• 조용할 때 간식으로 보상하기\n• 충분한 산책과 놀이로 에너지 소모시키기`,
          `짖음 문제는 많은 반려인들이 겪는 고민이에요. 강아지의 나이와 견종에 따라 접근법이 다를 수 있습니다.\n\n효과적인 훈련법:\n• '조용히' 명령어 훈련\n• 짖음을 유발하는 자극 줄이기\n• 규칙적인 일상 루틴 만들기\n• 사회화 훈련으로 외부 자극에 적응시키기\n\n참고로 TALEZ의 전문 훈련사들은 개별 상황에 맞는 맞춤 솔루션을 제공해드려요.`
        ];
        return getRandomElement(barkingResponses);
      }
      
      // 음식 관련
      if (lowerInput.includes('음식') || lowerInput.includes('사료') || lowerInput.includes('먹') || lowerInput.includes('급여')) {
        const feedingResponses = [
          `강아지 급여에 대한 질문이시네요! 나이와 체중, 활동량에 따라 적정량이 달라집니다.\n\n기본 원칙:\n• 퍼피(생후 12개월 미만): 하루 3-4회 소량씩\n• 성견: 하루 2회 규칙적으로\n• 시니어(7세 이상): 소화 잘되는 사료로 2회\n\n주의사항:\n• 사람 음식은 피해주세요 (특히 초콜릿, 양파, 포도)\n• 갑작스런 사료 변경 금지\n• 항상 신선한 물 제공`,
          `올바른 급여는 강아지 건강의 기본이에요. 혹시 특별히 걱정되는 부분이 있으신가요?\n\n건강한 식습관 만들기:\n• 정해진 시간에 정해진 장소에서\n• 15-20분 내에 먹지 않으면 치우기\n• 과도한 간식은 피하기\n• 체중 변화 꾸준히 체크하기\n\n만약 식욕부진이나 소화 문제가 있다면 수의사 상담을 받아보세요.`
        ];
        return getRandomElement(feedingResponses);
      }
      
      // 건강 관련
      if (lowerInput.includes('아프') || lowerInput.includes('병') || lowerInput.includes('증상') || lowerInput.includes('건강')) {
        return `강아지 건강에 대한 우려가 있으시군요. 구체적인 증상을 말씀해주시면 더 정확한 조언을 드릴 수 있어요.\n\n응급상황 체크리스트:\n• 호흡곤란, 계속된 구토나 설사\n• 24시간 이상 식욕부진\n• 평소와 다른 극심한 무기력\n• 경련이나 의식 잃음\n\n이런 증상이 있다면 즉시 응급실로 가세요! 그 외에는 TALEZ 건강관리 기능으로 예방접종 일정을 체크하고, 정기검진을 받으시길 권해요.`;
      }
      
      // 일반적인 강아지 관련 질문
      const generalDogResponses = [
        `강아지에 대한 궁금한 점이 있으시군요! 구체적으로 어떤 부분이 궁금하신가요? 훈련, 건강, 급여, 행동 등 어떤 주제든 도움을 드릴 수 있어요.`,
        `우리 반려견을 위한 정보를 찾고 계시는군요. 견종이나 나이, 현재 상황을 알려주시면 더 맞춤형 조언을 드릴 수 있습니다.`,
        `강아지 키우기는 정말 보람찬 일이지만 때로는 어려움도 있죠. 어떤 고민이 있으신지 자세히 말씀해주세요!`
      ];
      return getRandomElement(generalDogResponses);
    }
    
    // 고양이 관련 다양한 키워드 조합 분석
    if (lowerInput.includes('고양이') || lowerInput.includes('냥이') || lowerInput.includes('야옹')) {
      // 화장실/배변 문제
      if (lowerInput.includes('화장실') || lowerInput.includes('배변') || lowerInput.includes('용변') || lowerInput.includes('모래')) {
        const litterBoxResponses = [
          `고양이 화장실 문제로 고민이시군요. 고양이는 특히 깔끔함을 중요하게 여기는 동물이에요.\n\n체크리스트:\n• 모래는 하루 1-2회 청소, 완전교체는 일주일에 1번\n• 모래 깊이 5-7cm 유지\n• 고양이 수 + 1개의 화장실 준비\n• 조용하고 통풍 잘되는 곳에 배치\n\n갑자기 다른 곳에 용변을 본다면 스트레스나 질병 신호일 수 있으니 수의사 상담을 받아보세요.`,
          `화장실 문제는 고양이와 집사 모두에게 스트레스죠. 원인을 찾는 것이 중요해요.\n\n가능한 원인들:\n• 화장실이 더럽거나 냄새가 날 때\n• 모래 종류 변경에 적응 못함\n• 스트레스나 환경 변화\n• 비뇨기 질환 등 건강 문제\n\n해결책을 단계별로 시도해보시고, 계속 문제가 지속되면 건강검진을 받아보세요.`
        ];
        return getRandomElement(litterBoxResponses);
      }
      
      // 건강 관련
      if (lowerInput.includes('아프') || lowerInput.includes('병') || lowerInput.includes('증상') || lowerInput.includes('건강')) {
        const healthResponses = [
          `고양이 건강이 걱정되시는군요. 고양이는 아픔을 잘 숨기는 동물이라 평소보다 더 세심한 관찰이 필요해요.\n\n주의깊게 봐야 할 신호:\n• 평소보다 많이 숨거나 활동량 급감\n• 식욕 변화나 체중 감소\n• 호흡 패턴 변화\n• 구토나 설사가 지속됨\n\n특히 수컷 고양이가 소변 못 보는 건 응급상황이니 즉시 병원가세요!`,
          `고양이의 미묘한 건강 변화를 캐치하신 것 같네요. 구체적으로 어떤 증상이 나타나고 있나요?\n\n일반적인 건강관리:\n• 연 1-2회 정기검진\n• 예방접종과 구충제 관리\n• 치아 건강 체크\n• 적정 체중 유지\n\nTALEZ 건강관리 기능으로 우리 냥이의 건강 기록을 체계적으로 관리해보세요.`
        ];
        return getRandomElement(healthResponses);
      }
      
      // 행동 관련
      if (lowerInput.includes('행동') || lowerInput.includes('놀이') || lowerInput.includes('스트레스') || lowerInput.includes('새끼')) {
        return `고양이 행동에 대한 궁금증이시군요! 고양이는 환경 변화에 민감하고 각자 고유한 성격을 가지고 있어요.\n\n건강한 행동 패턴:\n• 규칙적인 그루밍과 놀이\n• 적절한 수면 (하루 12-16시간)\n• 사회적 상호작용 (개체차 있음)\n• 영역 표시 행동\n\n스트레스 신호를 보인다면 환경을 점검하고, 충분한 놀이 시간과 안전한 공간을 제공해주세요.`;
      }
      
      // 일반적인 고양이 관련 질문
      const generalCatResponses = [
        `고양이에 대한 질문이시네요! 우리 냥이의 어떤 부분이 궁금하신가요? 건강, 행동, 급여 등 어떤 주제든 도움을 드릴 수 있어요.`,
        `고양이는 정말 신비롭고 매력적인 동물이죠. 구체적으로 어떤 상황에 대해 조언이 필요하신지 알려주세요.`,
        `냥이와 관련된 고민이 있으시군요. 나이, 성별, 현재 상황을 말씀해주시면 더 정확한 조언을 드릴 수 있어요.`
      ];
      return getRandomElement(generalCatResponses);
    }
    
    // 훈련 및 교육 관련
    if (lowerInput.includes('훈련') || lowerInput.includes('교육') || lowerInput.includes('가르치') || lowerInput.includes('배우') || lowerInput.includes('트레이닝')) {
      const trainingResponses = [
        `반려동물 훈련에 관심을 가져주셔서 좋네요! 어떤 종류의 훈련을 생각하고 계신가요?\n\n기본 훈련 과정:\n• 기초 예의교육 (앉아, 기다려, 이리와)\n• 실내 배변 훈련\n• 리드줄 걷기 훈련\n• 사회화 교육\n\n나이나 성격에 따라 접근 방법이 달라지니, TALEZ의 전문 훈련사와 상담받아보시는 걸 추천해요.`,
        `훈련은 반려동물과의 소통을 위한 중요한 과정이에요. 현재 어떤 부분에서 어려움을 겪고 계신가요?\n\n효과적인 훈련 원칙:\n• 일관성 있는 명령어 사용\n• 긍정적 강화 (보상 중심)\n• 짧고 규칙적인 훈련 세션\n• 인내심과 반복\n\n"내 훈련사" 메뉴에서 우리 지역의 전문가를 찾아 개별 맞춤 상담을 받아보세요!`,
        `체계적인 교육 프로그램에 관심이 있으시군요. 반려동물의 나이와 경험 정도가 어떻게 되나요?\n\n TALEZ 전문 프로그램:\n• 퍼피 클래스 (사회화 중심)\n• 성견 기초교육\n• 문제행동 교정\n• 어질리티 및 스포츠 훈련\n\n각 프로그램은 개체의 특성을 고려해서 진행되니, 상담을 통해 최적의 방법을 찾아보세요.`
      ];
      return getRandomElement(trainingResponses);
    }
    
    // 건강 관련
    if (lowerInput.includes('건강') || lowerInput.includes('병원') || lowerInput.includes('아프') || lowerInput.includes('증상') || lowerInput.includes('진료')) {
      return '반려동물의 건강 관리는 예방이 가장 중요합니다.\n\n정기 관리 항목:\n• 연간 종합건강검진\n• 예방접종 (매년)\n• 심장사상충 예방약\n• 구충제 투여\n• 치과 관리\n\n응급 상황 징후:\n• 호흡곤란, 구토, 설사\n• 식욕부진이 24시간 이상 지속\n• 무기력, 고열\n\n이상 증상 발견 시 즉시 수의사와 상담하세요. TALEZ 건강관리 기능으로 접종 일정을 체계적으로 관리할 수 있습니다.';
    }
    
    // 영양 및 사료
    if (lowerInput.includes('사료') || lowerInput.includes('먹이') || lowerInput.includes('영양') || lowerInput.includes('급여') || lowerInput.includes('음식')) {
      return '균형잡힌 영양은 반려동물의 건강한 삶의 기초입니다.\n\n연령별 사료 선택:\n• 퍼피/키튼: 성장기용 고단백 사료\n• 성견/성묘: 활동량에 맞는 유지 사료\n• 시니어: 소화 쉬운 저칼로리 사료\n\n급여 원칙:\n• 정해진 시간에 규칙적으로\n• 적정량 준수 (비만 예방)\n• 충분한 신선한 물 제공\n• 사료 변경 시 점진적으로 (7-10일)\n\n특별한 건강 상태나 알레르기가 있다면 수의사와 상담 후 처방 사료를 고려하세요.';
    }
    
    // 운동 및 산책
    if (lowerInput.includes('산책') || lowerInput.includes('운동') || lowerInput.includes('활동') || lowerInput.includes('놀이')) {
      return '규칙적인 운동은 반려동물의 신체적, 정신적 건강에 필수입니다.\n\n견종별 운동량:\n• 소형견: 1일 30분-1시간\n• 중형견: 1일 1-2시간\n• 대형견: 1일 2시간 이상\n\n운동의 효과:\n• 스트레스 해소 및 문제행동 예방\n• 근육과 뼈 건강 유지\n• 면역력 강화\n• 사회화 기회 제공\n\n날씨가 좋지 않을 때는 실내 놀이나 정신적 자극 활동으로 대체할 수 있습니다. 퍼즐 장난감이나 숨바꼭질 게임을 활용해보세요.';
    }
    
    // 행동 문제
    if (lowerInput.includes('문제') || lowerInput.includes('행동') || lowerInput.includes('교정') || lowerInput.includes('버릇')) {
      return '반려동물의 문제행동은 대부분 환경적 요인이나 스트레스에서 비롯됩니다.\n\n일반적인 문제행동:\n• 분리불안 (울음, 파괴행동)\n• 공격성 (으르렁거림, 물기)\n• 강박행동 (계속 핥기, 돌기)\n• 배변 실수\n\n해결 접근법:\n• 원인 파악이 우선\n• 일관된 규칙과 루틴\n• 긍정적 강화 훈련\n• 충분한 운동과 자극\n\n심각한 문제행동은 TALEZ의 행동 전문 훈련사와 상담하여 체계적인 교정 프로그램을 받으시기를 권합니다.';
    }
    
    // TALEZ 서비스 관련
    if (lowerInput.includes('talez') || lowerInput.includes('테일즈') || lowerInput.includes('서비스') || lowerInput.includes('기능')) {
      return 'TALEZ는 종합 반려동물 케어 플랫폼입니다.\n\n주요 서비스:\n• 전문 훈련사 매칭 및 상담\n• 건강관리 스케줄링\n• 반려동물 프로필 관리\n• 교육 커뮤니티\n• 용품 쇼핑몰\n• AI 상담 서비스\n\n각 메뉴를 통해 맞춤형 서비스를 이용하실 수 있으며, 전문가들의 검증된 정보와 조언을 받을 수 있습니다.';
    }
    
    // 질문의 의도를 더 세밀하게 분석
    const analyzeIntent = (input: string) => {
      const keywords = {
        emergency: ['응급', '급해', '위험', '응급실', '즉시', '빨리'],
        behavior: ['문제', '행동', '버릇', '교정', '습관'],
        nutrition: ['사료', '먹이', '음식', '영양', '급여', '간식'],
        exercise: ['산책', '운동', '활동', '놀이', '에너지'],
        health: ['건강', '병', '아프', '증상', '검진', '예방접종'],
        general: ['어떻게', '방법', '도움', '조언', '궁금', '질문']
      };

      for (const [category, words] of Object.entries(keywords)) {
        if (words.some(keyword => input.includes(keyword))) {
          return category;
        }
      }
      return 'general';
    };

    const intent = analyzeIntent(lowerInput);

    // 의도별 맞춤 응답
    const intentResponses = {
      emergency: [
        `응급 상황이신 것 같네요. 반려동물의 생명이 위급할 수 있는 증상들이 있습니다.\n\n즉시 병원에 가야 하는 경우:\n• 호흡곤란, 의식잃음, 경련\n• 지속적인 구토나 설사\n• 외상으로 인한 출혈\n• 독성 물질 섭취\n\n가까운 24시간 응급 동물병원으로 즉시 이동하세요!`,
        `긴급한 상황이시군요. 우선 침착함을 유지하시고, 증상을 정확히 파악해주세요.\n\n응급처치 전 체크사항:\n• 의식 상태와 호흡 확인\n• 외상 부위 점검\n• 섭취한 물질 확인\n• 증상 발생 시간 기록\n\n이 정보들을 가지고 즉시 수의사에게 연락하세요.`
      ],
      behavior: [
        `행동 문제로 고민이 많으시겠어요. 문제행동의 원인을 파악하는 것이 해결의 첫걸음입니다.\n\n일반적인 접근법:\n• 문제 발생 상황과 패턴 관찰\n• 환경적 요인 점검\n• 스트레스 요인 제거\n• 긍정적 강화 훈련 적용\n\n심각한 공격성이나 강박 행동은 전문가 도움이 필요해요.`,
        `반려동물의 행동 변화는 다양한 원인이 있을 수 있어요. 언제부터 이런 행동을 보이기 시작했나요?\n\n체계적 접근법:\n• 행동 일지 작성으로 패턴 파악\n• 환경 변화 요인 분석\n• 건강 상태 점검\n• 단계적 행동 수정 계획\n\nTALEZ 행동 전문가와 상담하면 더 정확한 진단을 받을 수 있어요.`
      ],
      nutrition: [
        `영양 관리는 반려동물 건강의 핵심이에요. 현재 어떤 부분에서 고민이 있으신가요?\n\n기본 영양 원칙:\n• 생애주기에 맞는 사료 선택\n• 적정 칼로리 섭취량 계산\n• 규칙적인 급여 시간\n• 충분한 수분 공급\n\n특별한 건강 상태나 알레르기가 있다면 처방 사료를 고려해보세요.`,
        `올바른 급여 방법에 대해 관심이 많으시군요. 반려동물의 나이, 체중, 활동량에 따라 필요량이 달라져요.\n\n맞춤 급여 가이드:\n• 체중 대비 적정 칼로리 계산\n• 하루 급여 횟수 조절\n• 간식은 전체 칼로리의 10% 이내\n• 정기적인 체중 모니터링\n\n구체적인 상황을 알려주시면 더 정확한 조언을 드릴 수 있어요.`
      ],
      exercise: [
        `운동과 활동은 반려동물의 신체적, 정신적 건강에 매우 중요해요. 현재 어떤 운동을 시키고 계신가요?\n\n연령별 운동 가이드:\n• 어린 동물: 짧고 재미있는 놀이 중심\n• 성체: 규칙적이고 적절한 강도의 운동\n• 노령: 저강도 운동과 관절 케어\n\n견종이나 개체 특성에 따라 운동량을 조절하는 것이 중요해요.`,
        `활동적인 반려동물 관리에 관심이 있으시군요! 충분한 운동은 많은 행동 문제를 예방할 수 있어요.\n\n효과적인 운동 계획:\n• 매일 일정한 시간 확보\n• 다양한 형태의 활동 조합\n• 날씨에 따른 실내외 운동 조절\n• 운동 후 충분한 휴식\n\n과도한 운동은 오히려 해로울 수 있으니 적절한 강도를 유지하세요.`
      ],
      health: [
        `건강 관리에 대한 관심이 높으시네요. 예방이 치료보다 중요하다는 말이 반려동물에게도 적용돼요.\n\n정기 건강관리:\n• 연간 종합검진 (나이에 따라 조절)\n• 예방접종 스케줄 준수\n• 기생충 예방 및 구충\n• 치과 관리와 정기 청소\n\nTALEZ 건강관리 기능으로 일정을 체계적으로 관리해보세요.`,
        `반려동물의 건강 상태가 걱정되시는군요. 평소와 다른 증상이 있나요?\n\n주의 깊게 관찰할 점들:\n• 식욕과 배변 상태\n• 활동량과 에너지 레벨\n• 호흡과 체온\n• 털과 피부 상태\n\n미묘한 변화도 놓치지 마시고, 의심스럽면 수의사와 상담하세요.`
      ],
      general: [
        `반려동물에 대해 궁금한 점이 있으시군요. 구체적으로 어떤 도움이 필요하신지 알려주세요.\n\n도움을 드릴 수 있는 분야:\n• 일상 케어와 관리법\n• 훈련과 교육 방법\n• 건강과 영양 관리\n• 행동 분석과 문제 해결\n\n더 자세한 상황을 말씀해주시면 맞춤형 조언을 드릴 수 있어요.`,
        `TALEZ AI 어시스턴트가 도움을 드릴 준비가 되어 있어요. 어떤 주제든 편하게 물어보세요.\n\n전문 상담 영역:\n• 종별 특성과 관리법\n• 생애주기별 케어 포인트\n• 응급상황 대처법\n• 예방 의학과 건강관리\n\n경험과 전문 지식을 바탕으로 실용적인 조언을 제공해드려요.`,
        `반려동물과 관련된 어떤 고민이든 함께 해결해보아요. 상황을 자세히 설명해주시면 더 정확한 도움을 드릴 수 있습니다.\n\n상담 가능 분야:\n• 개별 맞춤 케어 방법\n• 문제 상황 해결 전략\n• 전문가 추천과 연결\n• 단계별 실행 계획\n\n우리 반려동물의 행복한 삶을 위해 최선을 다해 도와드릴게요.`
      ]
    };

    return getRandomElement(intentResponses[intent] || intentResponses.general);
  }

  // 엔터 키로 메시지 전송 (Shift+Enter는 줄바꿈)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!isOpen) {
    return (
      <div 
        className="fixed z-[60]"
        style={{
          bottom: `${position.y}px`,
          right: `${position.x}px`
        }}
      >
        <div
          onClick={() => setIsOpen(true)}
          onMouseDown={handleDragStart}
          className="relative cursor-move group"
          data-testid="chatbot-coffee-button"
        >
          {/* 원형 채팅 버튼 */}
          <div 
            className="w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:shadow-2xl"
            style={{ 
              background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--secondary)) 100%)',
              boxShadow: '0 4px 20px rgba(16, 185, 129, 0.5), 0 0 0 4px rgba(16, 185, 129, 0.2)',
            }}
          >
            <MessageSquare className="w-6 h-6 text-white" />
          </div>
          
          {/* 온라인 상태 표시 */}
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white animate-pulse" />
          
          {/* 반짝임 효과 */}
          <div className="absolute inset-0 rounded-full overflow-hidden pointer-events-none">
            <div 
              className="absolute -inset-1 bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12 animate-pulse"
              style={{ animationDuration: '2s' }}
            />
          </div>
        </div>
        
        {/* 툴팁 */}
        <div className="absolute bottom-16 right-0 bg-gray-800 text-white text-sm px-3 py-2 rounded-lg shadow-lg opacity-0 pointer-events-none transition-opacity duration-200 whitespace-nowrap group-hover:opacity-100">
          AI 도우미와 채팅하기
          <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800" />
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={chatbotRef}
      className="fixed bg-white border border-gray-200 rounded-2xl shadow-2xl z-[60] flex flex-col overflow-hidden"
      style={{
        bottom: `${position.y}px`,
        right: `${position.x}px`,
        width: `${size.width}px`,
        height: `${size.height}px`
      }}
    >
      {/* 헤더 - 드래그 가능 */}
      <div 
        className="flex items-center justify-between p-4 bg-gradient-to-r from-primary to-primary/90 text-white cursor-move"
        onMouseDown={handleDragStart}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
            <Coffee size={18} />
          </div>
          <div>
            <span className="font-semibold text-sm">TALEZ AI 도우미</span>
            <div className="flex items-center gap-1 text-xs text-white/80">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              온라인
            </div>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(false);
          }}
          className="text-white hover:bg-white/20 w-8 h-8 p-0 rounded-full"
        >
          <X size={16} />
        </Button>
      </div>

      {/* 메시지 영역 */}
      <ScrollArea className="flex-1 p-4 bg-background/50">
        <div className="space-y-4">
          {messages.filter(m => m.role !== 'system').map(message => (
            <div
              key={message.id}
              className={cn(
                'flex gap-3 mb-4',
                message.role === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              {message.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-primary to-primary/80 flex items-center justify-center text-primary-foreground shadow-sm">
                  <Coffee size={16} />
                </div>
              )}
              <div
                className={cn(
                  'rounded-2xl px-4 py-3 max-w-[75%] text-sm leading-relaxed shadow-sm',
                  message.role === 'user' 
                    ? 'bg-primary text-primary-foreground rounded-br-md' 
                    : 'bg-card text-card-foreground border border-border rounded-bl-md'
                )}
              >
                <div className="whitespace-pre-wrap">
                  {message.content}
                </div>
              </div>
              {message.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                  <User size={16} />
                </div>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
                <Coffee size={18} />
              </div>
              <div className="bg-muted rounded-lg rounded-tl-none px-4 py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* 입력 영역 */}
      <div className="p-4 bg-card border-t border-border">
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <Textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="반려동물에 대해 궁금한 것을 물어보세요..."
              className="resize-none min-h-[44px] max-h-[120px] border-gray-200 rounded-xl focus:border-primary focus:ring-primary/20 text-sm"
              disabled={isLoading}
            />
          </div>
          <Button
            onClick={handleSendMessage}
            size="icon"
            disabled={!inputValue.trim() || isLoading}
            className="w-11 h-11 rounded-xl bg-primary hover:bg-primary/90 shadow-sm"
          >
            <Send size={18} />
          </Button>
        </div>
        <div className="mt-3 text-xs text-gray-500 flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
          {isAuthenticated 
            ? 'AI가 반려동물 케어에 대한 맞춤형 조언을 제공합니다' 
            : '로그인하면 개인화된 반려동물 관리 조언을 받을 수 있습니다'}
        </div>
      </div>

      {/* 리사이즈 핸들 */}
      <div
        className="absolute bottom-0 right-0 w-4 h-4 cursor-nw-resize"
        onMouseDown={handleResizeStart}
      >
        <div className="absolute bottom-1 right-1 w-3 h-3 border-r-2 border-b-2 border-gray-400"></div>
        <div className="absolute bottom-0.5 right-0.5 w-2 h-2 border-r-2 border-b-2 border-gray-300"></div>
      </div>
    </div>
  );
}