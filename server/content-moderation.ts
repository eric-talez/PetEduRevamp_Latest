import { Router } from 'express';
import { z } from 'zod';
import { logServerError } from './middleware/audit-logger';

const router = Router();

// 인메모리 저장소 (실제 구현시 데이터베이스 연동)
let filterKeywords: any[] = [];
let moderationLogs: any[] = [];
let pendingPosts: any[] = [];
let keywordIdCounter = 1;
let logIdCounter = 1;

// 스키마 정의
const FilterKeywordSchema = z.object({
  keyword: z.string().min(1, '키워드를 입력해주세요'),
  category: z.enum(['illegal', 'hate', 'spam']),
  isRegex: z.boolean().default(false),
  severity: z.enum(['low', 'medium', 'high']).default('medium'),
  isActive: z.boolean().default(true)
});

const ModeratePostSchema = z.object({
  postId: z.number(),
  action: z.enum(['approved', 'blocked', 'deleted']),
  reason: z.string().min(1, '사유를 입력해주세요')
});

// 기본 필터링 키워드 (정규식 기반)
const defaultKeywords = [
  // 불법·금지 콘텐츠
  { keyword: '\\b(살인|자살|폭탄|총기|마약|대마|필로폰|코카인)\\b', category: 'illegal', isRegex: true, severity: 'high' },
  { keyword: '\\b(불법도박|음란물|아동포르노|도촬|몰카|리벤지포르노)\\b', category: 'illegal', isRegex: true, severity: 'high' },
  { keyword: '\\b(성매매|조건만남|해킹|크래킹|피싱|스미싱)\\b', category: 'illegal', isRegex: true, severity: 'high' },
  { keyword: '\\b(보이스피싱|대출사기|투자사기|유사수신|다단계|피라미드)\\b', category: 'illegal', isRegex: true, severity: 'high' },
  { keyword: '\\b(장기매매|위조지폐|위조상품|불법의약품|스테로이드)\\b', category: 'illegal', isRegex: true, severity: 'high' },
  
  // 혐오·차별·폭력성
  { keyword: '\\b(패드립|가족비하|폭행|살해|협박|테러|참수|린치|구타)\\b', category: 'hate', isRegex: true, severity: 'high' },
  { keyword: '\\b(성희롱|성추행|강간|강제추행)\\b', category: 'hate', isRegex: true, severity: 'high' },
  { keyword: '\\b(여성비하|남성비하|장애인비하|동성애혐오|종교모독)\\b', category: 'hate', isRegex: true, severity: 'medium' },
  { keyword: '충$|년$', category: 'hate', isRegex: true, severity: 'medium' },
  
  // 스팸·광고성
  { keyword: '\\b(바카라|슬롯머신|토토|스포츠베팅|카지노)\\b', category: 'spam', isRegex: true, severity: 'medium' },
  { keyword: '\\b(100%당첨|무조건적중|고수익보장|1일100만원|투자보장)\\b', category: 'spam', isRegex: true, severity: 'medium' },
  { keyword: 'https?://[\\w\\.-]+\\.[a-zA-Z]{2,}(?:/[\\w\\.-]*)*/?(?:\\?[\\w&=%\\.-]*)?(?:#[\\w\\.-]*)?', category: 'spam', isRegex: true, severity: 'low' },
  { keyword: '\\b(주민등록번호|계좌번호|카드번호|CVV|OTP|비밀번호)\\b', category: 'spam', isRegex: true, severity: 'high' }
];

// 필터링 함수
const checkContent = (content: string, title?: string): { flagged: boolean; keywords: string[]; severity: string } => {
  const flaggedKeywords: string[] = [];
  let maxSeverity = 'low';
  
  const textToCheck = (title ? title + ' ' : '') + content;
  console.log(`[Content Check] 검사 텍스트: "${textToCheck}"`);
  console.log(`[Content Check] 활성 키워드 수: ${filterKeywords.filter(k => k.isActive).length}`);
  
  for (const filter of filterKeywords) {
    if (!filter.isActive) continue;
    
    try {
      let isMatched = false;
      
      if (filter.isRegex) {
        // 정규식 패턴 사용
        const regex = new RegExp(filter.keyword, 'gi');
        isMatched = regex.test(textToCheck);
      } else {
        // 간단한 텍스트 포함 검사 (대소문자 무시)
        isMatched = textToCheck.toLowerCase().includes(filter.keyword.toLowerCase());
      }
      
      console.log(`[Content Check] 키워드 "${filter.keyword}" 검사 중... 결과: ${isMatched}`);
      
      if (isMatched) {
        console.log(`[Content Check] 키워드 매칭됨: "${filter.keyword}"`);
        flaggedKeywords.push(filter.keyword);
        
        // 심각도 업데이트
        if (filter.severity === 'high') {
          maxSeverity = 'high';
        } else if (filter.severity === 'medium' && maxSeverity !== 'high') {
          maxSeverity = 'medium';
        }
      }
    } catch (error) {
      logServerError(`[Content Check] 키워드 검사 오류: ${filter.keyword}`, error);
    }
  }
  
  console.log(`[Content Check] 결과: flagged=${flaggedKeywords.length > 0}, keywords=[${flaggedKeywords.join(', ')}], severity=${maxSeverity}`);
  
  return {
    flagged: flaggedKeywords.length > 0,
    keywords: flaggedKeywords,
    severity: maxSeverity
  };
};

// 콘텐츠 실시간 검열 (게시글 등록시 호출)
const moderateContent = (postData: { id: number; title: string; content: string; authorId: number; authorName: string }) => {
  const result = checkContent(postData.content, postData.title);
  
  if (result.flagged) {
    // 대기 목록에 추가
    pendingPosts.push({
      id: postData.id,
      title: postData.title,
      content: postData.content,
      authorId: postData.authorId,
      authorName: postData.authorName,
      flaggedKeywords: result.keywords,
      severity: result.severity,
      createdAt: new Date().toISOString()
    });
    
    // 로그 추가
    moderationLogs.unshift({
      id: logIdCounter++,
      postId: postData.id,
      postTitle: postData.title,
      userId: postData.authorId,
      userName: postData.authorName,
      action: 'flagged',
      reason: `필터링 키워드 감지: ${result.keywords.join(', ')}`,
      createdAt: new Date().toISOString()
    });
    
    return { blocked: true, reason: '부적절한 콘텐츠가 감지되어 검열 대기 상태입니다.' };
  }
  
  return { blocked: false };
};

// 키워드 목록 조회
router.get('/keywords', (req, res) => {
  try {
    res.json(filterKeywords);
  } catch (error) {
    logServerError('키워드 조회 오류:', error, req);
    res.status(500).json({ error: '키워드 조회에 실패했습니다.' });
  }
});

// 키워드 추가
router.post('/keywords', (req, res) => {
  try {
    const keywordData = FilterKeywordSchema.parse(req.body);
    
    const newKeyword = {
      id: keywordIdCounter++,
      ...keywordData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    filterKeywords.push(newKeyword);
    
    console.log(`[Content Moderation] 새 키워드 추가: ${newKeyword.keyword} (${newKeyword.category})`);
    res.status(201).json(newKeyword);
  } catch (error) {
    logServerError('키워드 추가 오류:', error, req);
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: '입력 데이터가 올바르지 않습니다.', details: error.errors });
    } else {
      res.status(500).json({ error: '키워드 추가에 실패했습니다.' });
    }
  }
});

// 키워드 수정
router.put('/keywords/:id', (req, res) => {
  try {
    const keywordId = parseInt(req.params.id);
    const keywordData = FilterKeywordSchema.parse(req.body);
    
    const keywordIndex = filterKeywords.findIndex(k => k.id === keywordId);
    if (keywordIndex === -1) {
      return res.status(404).json({ error: '키워드를 찾을 수 없습니다.' });
    }
    
    filterKeywords[keywordIndex] = {
      ...filterKeywords[keywordIndex],
      ...keywordData,
      updatedAt: new Date().toISOString()
    };
    
    console.log(`[Content Moderation] 키워드 수정: ${filterKeywords[keywordIndex].keyword}`);
    res.json(filterKeywords[keywordIndex]);
  } catch (error) {
    logServerError('키워드 수정 오류:', error, req);
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: '입력 데이터가 올바르지 않습니다.', details: error.errors });
    } else {
      res.status(500).json({ error: '키워드 수정에 실패했습니다.' });
    }
  }
});

// 키워드 삭제
router.delete('/keywords/:id', (req, res) => {
  try {
    const keywordId = parseInt(req.params.id);
    const keywordIndex = filterKeywords.findIndex(k => k.id === keywordId);
    
    if (keywordIndex === -1) {
      return res.status(404).json({ error: '키워드를 찾을 수 없습니다.' });
    }
    
    const deletedKeyword = filterKeywords.splice(keywordIndex, 1)[0];
    console.log(`[Content Moderation] 키워드 삭제: ${deletedKeyword.keyword}`);
    
    res.json({ message: '키워드가 삭제되었습니다.' });
  } catch (error) {
    logServerError('키워드 삭제 오류:', error, req);
    res.status(500).json({ error: '키워드 삭제에 실패했습니다.' });
  }
});

// 대기 중인 게시글 조회
router.get('/pending', (req, res) => {
  try {
    res.json(pendingPosts);
  } catch (error) {
    logServerError('대기 게시글 조회 오류:', error, req);
    res.status(500).json({ error: '대기 게시글 조회에 실패했습니다.' });
  }
});

// 게시글 검열 처리
router.post('/moderate', (req, res) => {
  try {
    const { postId, action, reason } = ModeratePostSchema.parse(req.body);
    
    // 대기 목록에서 해당 게시글 찾기
    const pendingIndex = pendingPosts.findIndex(p => p.id === postId);
    if (pendingIndex === -1) {
      return res.status(404).json({ error: '해당 게시글을 찾을 수 없습니다.' });
    }
    
    const post = pendingPosts[pendingIndex];
    
    // 검열 처리에 따른 액션
    if (action === 'approved') {
      // 승인: 대기 목록에서 제거하고 게시글 활성화
      pendingPosts.splice(pendingIndex, 1);
    } else if (action === 'blocked') {
      // 차단: 대기 목록에서 제거하고 게시글 비활성화
      pendingPosts.splice(pendingIndex, 1);
    } else if (action === 'deleted') {
      // 삭제: 완전 삭제
      pendingPosts.splice(pendingIndex, 1);
    }
    
    // 로그 추가
    moderationLogs.unshift({
      id: logIdCounter++,
      postId: postId,
      postTitle: post.title,
      userId: post.authorId,
      userName: post.authorName,
      action: action,
      reason: reason,
      moderatorId: 1, // 실제로는 req.user.id
      moderatorName: '관리자', // 실제로는 req.user.name
      createdAt: new Date().toISOString()
    });
    
    console.log(`[Content Moderation] 게시글 검열 처리: ${post.title} - ${action}`);
    res.json({ message: '검열 처리가 완료되었습니다.', action });
    
  } catch (error) {
    logServerError('게시글 검열 오류:', error, req);
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: '입력 데이터가 올바르지 않습니다.', details: error.errors });
    } else {
      res.status(500).json({ error: '게시글 검열 처리에 실패했습니다.' });
    }
  }
});

// 검열 로그 조회
router.get('/logs', (req, res) => {
  try {
    // 최근 100개 로그만 반환
    const recentLogs = moderationLogs.slice(0, 100);
    res.json(recentLogs);
  } catch (error) {
    logServerError('검열 로그 조회 오류:', error, req);
    res.status(500).json({ error: '검열 로그 조회에 실패했습니다.' });
  }
});

// 기본 키워드 초기화 (관리자용)
router.post('/initialize-defaults', (req, res) => {
  try {
    let addedCount = 0;
    
    for (const keywordData of defaultKeywords) {
      // 중복 키워드 확인
      const exists = filterKeywords.some(k => k.keyword === keywordData.keyword);
      
      if (!exists) {
        const newKeyword = {
          id: keywordIdCounter++,
          ...keywordData,
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        filterKeywords.push(newKeyword);
        addedCount++;
      }
    }
    
    console.log(`[Content Moderation] 기본 키워드 초기화 완료: ${addedCount}개 추가`);
    res.json({ 
      message: '기본 키워드가 초기화되었습니다.', 
      addedCount,
      totalKeywords: filterKeywords.length 
    });
    
  } catch (error) {
    logServerError('기본 키워드 초기화 오류:', error, req);
    res.status(500).json({ error: '기본 키워드 초기화에 실패했습니다.' });
  }
});

// 콘텐츠 실시간 검사 API (외부에서 호출 가능)
router.post('/check', (req, res) => {
  try {
    const { content, title } = req.body;
    
    if (!content) {
      return res.status(400).json({ error: '검사할 콘텐츠를 입력해주세요.' });
    }
    
    const result = checkContent(content, title);
    res.json(result);
    
  } catch (error) {
    logServerError('콘텐츠 검사 오류:', error, req);
    res.status(500).json({ error: '콘텐츠 검사에 실패했습니다.' });
  }
});

export default router;
export { moderateContent };