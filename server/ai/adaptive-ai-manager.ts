// ==========================================
// TALEZ Adaptive AI Manager - 적응형 AI 시스템
// ==========================================

import EventEmitter from 'events';
import { aiProxyService } from './ai-proxy';
import { logServerError } from '../middleware/audit-logger';

// ==========================================
// 사용자 패턴 분석기
// ==========================================

interface UserQuery {
  type: 'petBehaviorAnalysis' | 'healthMonitoring' | 'trainingPlanning' | 'nutritionAdvice' | 'emergencyConsult' | 'generalChat' | 'imageAnalysis' | 'courseRecommendation';
  complexity: 'simple' | 'medium' | 'complex';
  domain: 'puppyTraining' | 'adultDogTraining' | 'behaviorCorrection' | 'healthPrevention' | 'emergencyHealth' | 'nutrition' | 'grooming' | 'socializing' | 'specialNeeds';
  urgency: 'routine' | 'concerning' | 'urgent' | 'emergency';
  breedCategory: 'smallBreeds' | 'mediumBreeds' | 'largeBreeds' | 'workingDogs' | 'mixedBreeds' | 'unknown';
  responseTime: number;
  satisfaction?: number; // 1-5 rating
  aiUsed: string;
  tokens: number;
  cost: number;
  timestamp: Date;
  hour: number;
  day: number;
  month: number;
  hasFollowUp?: boolean;          // 후속 질문 있었는지
  adviceImplemented?: boolean;    // 조언이 실제 적용되었는지
  petAge?: 'puppy' | 'adult' | 'senior';
  sessionContext?: string;        // 세션 컨텍스트 (연관 질문들)
}

interface UserSession {
  queries: UserQuery[];
  preferences: {
    preferredComplexity: 'simple' | 'medium' | 'complex';
    preferredDomain: string;
    responseTimeExpectation: number;
    qualityPreference: 'speed' | 'quality' | 'cost' | 'balanced';
    preferredAIEngine: 'openai' | 'claude' | 'gemini' | 'perplexity' | 'auto';
    communicationStyle: 'professional' | 'friendly' | 'detailed' | 'concise';
  };
  petProfile: {
    primaryBreeds: string[];        // 주로 관심있는 견종들
    dogAges: string[];              // 관리하는 반려견 연령대
    experienceLevel: 'beginner' | 'intermediate' | 'expert';  // 견주 경험 수준
    commonConcerns: string[];       // 자주 문의하는 관심사
  };
  patterns: {
    peakHours: number[];
    frequentTopics: string[];
    avgSessionLength: number;
    seasonalTrends: Record<string, number>;  // 계절별 관심사 변화
    urgencyDistribution: Record<string, number>; // 긴급도 분포
  };
  performance: {
    avgSatisfaction: number;
    totalQueries: number;
    avgResponseTime: number;
    totalCost: number;
    followUpQuestions: number;      // 후속 질문 수
    adviceImplemented: number;      // 조언 실행 횟수
    emergencyDetected: number;      // 응급상황 감지 횟수
  };
}

class UserPatternAnalyzer extends EventEmitter {
  private userSessions = new Map<string, UserSession>();
  private globalPatterns = {
    serviceUsage: {
      petBehaviorAnalysis: 0,    // 반려견 행동 분석
      healthMonitoring: 0,       // 건강 모니터링
      trainingPlanning: 0,       // 훈련 계획 수립
      nutritionAdvice: 0,        // 영양 상담
      emergencyConsult: 0,       // 응급 상담
      generalChat: 0,            // 일반 채팅
      imageAnalysis: 0,          // 이미지/영상 분석
      courseRecommendation: 0    // 코스 추천
    },
    complexityDistribution: {
      simple: 0,     // 간단한 질문 (기본 관리법)
      medium: 0,     // 중간 복잡도 (훈련 문제)
      complex: 0     // 복잡한 문제 (행동 교정, 건강 이슈)
    },
    domainPreference: {
      puppyTraining: 0,          // 퍼피 훈련
      adultDogTraining: 0,       // 성견 훈련
      behaviorCorrection: 0,     // 문제 행동 교정
      healthPrevention: 0,       // 예방 의학
      emergencyHealth: 0,        // 응급 상황
      nutrition: 0,              // 영양 관리
      grooming: 0,               // 그루밍
      socializing: 0,            // 사회화 훈련
      specialNeeds: 0            // 특수 요구사항
    },
    breedSpecificity: {
      smallBreeds: 0,            // 소형견
      mediumBreeds: 0,           // 중형견
      largeBreeds: 0,            // 대형견
      workingDogs: 0,            // 작업견
      mixedBreeds: 0,            // 믹스견
      unknown: 0                 // 견종 불명
    },
    timePatterns: {
      hourly: new Array(24).fill(0),
      daily: new Array(7).fill(0),
      seasonal: new Array(12).fill(0)  // 월별 패턴 (계절성)
    },
    responseQuality: {
      satisfaction: 0,
      avgRating: 0,
      totalRatings: 0,
      followUpRate: 0,           // 후속 질문 비율
      implementationRate: 0       // 조언 실행 비율
    },
    urgencyLevels: {
      routine: 0,                // 일상 관리
      concerning: 0,             // 우려사항
      urgent: 0,                 // 긴급
      emergency: 0               // 응급
    }
  };
  
  private recentQueries: UserQuery[] = [];
  private readonly maxRecentQueries = 1000;
  
  constructor() {
    super();
    
    // 패턴 분석 주기 (1시간마다)
    setInterval(() => this.analyzePatterns(), 60 * 60 * 1000);
  }

  // ==========================================
  // 사용자 쿼리 추적
  // ==========================================
  
  trackUserQuery(userId: string, queryData: Omit<UserQuery, 'timestamp' | 'hour' | 'day'>) {
    // 개별 사용자 세션 초기화
    if (!this.userSessions.has(userId)) {
      this.userSessions.set(userId, {
        queries: [],
        preferences: {
          preferredComplexity: 'medium',
          preferredDomain: 'behaviorCorrection',
          responseTimeExpectation: 3000,
          qualityPreference: 'balanced',
          preferredAIEngine: 'auto',
          communicationStyle: 'friendly'
        },
        petProfile: {
          primaryBreeds: [],
          dogAges: [],
          experienceLevel: 'beginner',
          commonConcerns: []
        },
        patterns: {
          peakHours: [],
          frequentTopics: [],
          avgSessionLength: 0,
          seasonalTrends: {},
          urgencyDistribution: {}
        },
        performance: {
          avgSatisfaction: 0,
          totalQueries: 0,
          avgResponseTime: 0,
          totalCost: 0,
          followUpQuestions: 0,
          adviceImplemented: 0,
          emergencyDetected: 0
        }
      });
    }

    const userSession = this.userSessions.get(userId)!;
    
    // 쿼리 추가
    const now = new Date();
    const query: UserQuery = {
      ...queryData,
      timestamp: now,
      hour: now.getHours(),
      day: now.getDay(),
      month: now.getMonth()
    };
    
    userSession.queries.push(query);
    userSession.performance.totalQueries++;
    
    // 최근 쿼리만 유지 (메모리 관리)
    if (userSession.queries.length > 100) {
      userSession.queries = userSession.queries.slice(-50);
    }

    // 글로벌 패턴 업데이트
    this.updateGlobalPatterns(query);
    
    // 개별 사용자 패턴 업데이트
    this.updateUserPatterns(userId, query);
    
    // 최근 쿼리 추가
    this.recentQueries.push(query);
    if (this.recentQueries.length > this.maxRecentQueries) {
      this.recentQueries = this.recentQueries.slice(-this.maxRecentQueries);
    }

    // 실시간 패턴 변화 감지
    this.detectPatternChanges();
  }

  // ==========================================
  // 글로벌 패턴 업데이트
  // ==========================================
  
  private updateGlobalPatterns(query: UserQuery) {
    // 서비스 사용량
    this.globalPatterns.serviceUsage[query.type]++;
    
    // 복잡도 분포
    this.globalPatterns.complexityDistribution[query.complexity]++;
    
    // 도메인 선호도
    this.globalPatterns.domainPreference[query.domain]++;
    
    // 시간대별 패턴
    this.globalPatterns.timePatterns.hourly[query.hour]++;
    this.globalPatterns.timePatterns.daily[query.day]++;
    this.globalPatterns.timePatterns.seasonal[query.month]++;
    
    // 견종별 패턴
    this.globalPatterns.breedSpecificity[query.breedCategory]++;
    
    // 긴급도별 패턴
    this.globalPatterns.urgencyLevels[query.urgency]++;
    
    // 품질 지표
    if (query.satisfaction) {
      const current = this.globalPatterns.responseQuality;
      current.totalRatings++;
      current.avgRating = (current.avgRating * (current.totalRatings - 1) + query.satisfaction) / current.totalRatings;
      
      if (query.satisfaction >= 4) {
        current.satisfaction++;
      }
    }
  }

  // ==========================================
  // 개별 사용자 패턴 업데이트
  // ==========================================
  
  private updateUserPatterns(userId: string, query: UserQuery) {
    const user = this.userSessions.get(userId)!;
    const perf = user.performance;
    
    // 성능 지표 업데이트
    if (query.satisfaction) {
      perf.avgSatisfaction = (perf.avgSatisfaction * (perf.totalQueries - 1) + query.satisfaction) / perf.totalQueries;
    }
    
    if (query.responseTime) {
      perf.avgResponseTime = (perf.avgResponseTime * (perf.totalQueries - 1) + query.responseTime) / perf.totalQueries;
    }
    
    if (query.cost) {
      perf.totalCost += query.cost;
    }

    // 선호도 학습
    this.learnUserPreferences(userId, query);
  }

  // ==========================================
  // 사용자 선호도 학습
  // ==========================================
  
  private learnUserPreferences(userId: string, query: UserQuery) {
    const user = this.userSessions.get(userId)!;
    const prefs = user.preferences;
    
    // 복잡도 선호도 학습
    if (query.satisfaction && query.satisfaction >= 4) {
      prefs.preferredComplexity = query.complexity;
    }
    
    // 도메인 선호도 학습
    const recentQueries = user.queries.slice(-10);
    const domainCounts: Record<string, number> = {};
    recentQueries.forEach(q => {
      domainCounts[q.domain] = (domainCounts[q.domain] || 0) + 1;
    });
    
    if (Object.keys(domainCounts).length > 0) {
      const mostFrequentDomain = Object.keys(domainCounts).reduce((a, b) => 
        domainCounts[a] > domainCounts[b] ? a : b
      );
      prefs.preferredDomain = mostFrequentDomain;
    }
    
    // 품질 vs 속도 선호도 학습
    if (query.responseTime < 2000 && query.satisfaction && query.satisfaction >= 4) {
      prefs.qualityPreference = 'speed';
    } else if (query.responseTime > 5000 && query.satisfaction && query.satisfaction >= 4) {
      prefs.qualityPreference = 'quality';
    } else {
      prefs.qualityPreference = 'balanced';
    }
    
    // 응답 시간 기대치 조정
    if (query.satisfaction && query.satisfaction >= 4) {
      prefs.responseTimeExpectation = query.responseTime;
    }
  }

  // ==========================================
  // 패턴 변화 감지
  // ==========================================
  
  private detectPatternChanges() {
    const recent = this.recentQueries.slice(-100);
    const older = this.recentQueries.slice(-200, -100);
    
    if (recent.length < 50 || older.length < 50) return;
    
    // 서비스 타입 변화 감지
    const recentTypes = this.getDistribution(recent, 'type');
    const olderTypes = this.getDistribution(older, 'type');
    
    const typeChanges = this.calculateDistributionDifference(recentTypes, olderTypes);
    
    // 복잡도 변화 감지
    const recentComplexity = this.getDistribution(recent, 'complexity');
    const olderComplexity = this.getDistribution(older, 'complexity');
    
    const complexityChanges = this.calculateDistributionDifference(recentComplexity, olderComplexity);
    
    // 유의미한 변화 감지시 이벤트 발생
    if (typeChanges > 0.15) { // 15% 이상 변화
      this.emit('patternChange', {
        type: 'serviceUsage',
        change: typeChanges,
        newDistribution: recentTypes,
        oldDistribution: olderTypes
      });
    }
    
    if (complexityChanges > 0.1) { // 10% 이상 변화
      this.emit('patternChange', {
        type: 'complexity',
        change: complexityChanges,
        newDistribution: recentComplexity,
        oldDistribution: olderComplexity
      });
    }
  }

  // ==========================================
  // 패턴 분석 메소드들
  // ==========================================
  
  analyzePatterns() {
    const analysis = {
      timestamp: new Date(),
      globalTrends: this.analyzeGlobalTrends(),
      userSegments: this.analyzeUserSegments(),
      recommendations: this.generateRecommendations()
    };
    
    this.emit('patternAnalysis', analysis);
    return analysis;
  }

  private analyzeGlobalTrends() {
    const trends: any = {};
    const usage = this.globalPatterns.serviceUsage;
    const total = Object.values(usage).reduce((a, b) => a + b, 0);
    
    if (total === 0) return trends;
    
    // 서비스 사용률 계산
    Object.keys(usage).forEach(service => {
      trends[service] = {
        percentage: ((usage as any)[service] / total * 100).toFixed(1),
        count: (usage as any)[service]
      };
    });
    
    // 피크 시간대 분석
    const hourlyUsage = this.globalPatterns.timePatterns.hourly;
    const peakHour = hourlyUsage.indexOf(Math.max(...hourlyUsage));
    trends.peakHour = peakHour;
    
    // 평균 만족도
    trends.avgSatisfaction = this.globalPatterns.responseQuality.avgRating;
    
    return trends;
  }

  private analyzeUserSegments() {
    const segments = {
      powerUsers: [] as string[],     // 높은 사용량
      qualityFocused: [] as string[], // 품질 중시
      speedFocused: [] as string[],   // 속도 중시
      costSensitive: [] as string[]   // 비용 민감
    };
    
    this.userSessions.forEach((session, userId) => {
      const perf = session.performance;
      const prefs = session.preferences;
      
      // Power Users (일 10회 이상)
      if (perf.totalQueries > 300) { // 월 300회 이상
        segments.powerUsers.push(userId);
      }
      
      // Quality Focused (평점 4.5 이상, 응답시간 관대)
      if (perf.avgSatisfaction >= 4.5 && prefs.responseTimeExpectation > 5000) {
        segments.qualityFocused.push(userId);
      }
      
      // Speed Focused (응답시간 3초 이하 선호)
      if (prefs.responseTimeExpectation <= 3000) {
        segments.speedFocused.push(userId);
      }
      
      // Cost Sensitive (저비용 선호도 추론)
      if (prefs.qualityPreference === 'cost') {
        segments.costSensitive.push(userId);
      }
    });
    
    return segments;
  }

  private generateRecommendations() {
    const trends = this.analyzeGlobalTrends();
    const recommendations: any[] = [];
    
    // 서비스별 추천
    Object.keys(trends).forEach(service => {
      if (service === 'peakHour' || service === 'avgSatisfaction') return;
      
      const percentage = parseFloat(trends[service].percentage);
      
      if (percentage > 40) {
        recommendations.push({
          type: 'optimization',
          priority: 'high',
          message: `${service} 서비스가 ${percentage}%로 높은 사용률을 보입니다. 해당 서비스에 최적화된 AI 모델 비중을 늘리는 것을 권장합니다.`,
          action: `increase_${service}_optimization`
        });
      }
    });
    
    // 만족도 기반 추천
    if (trends.avgSatisfaction < 3.5) {
      recommendations.push({
        type: 'quality',
        priority: 'critical',
        message: `평균 만족도가 ${trends.avgSatisfaction}로 낮습니다. 고품질 AI 모델 사용 비중을 늘리세요.`,
        action: 'increase_quality_models'
      });
    }
    
    return recommendations;
  }

  // ==========================================
  // 유틸리티 메소드들
  // ==========================================
  
  private getDistribution(queries: UserQuery[], field: keyof UserQuery) {
    const distribution: Record<string, number> = {};
    queries.forEach(query => {
      const value = String(query[field]);
      distribution[value] = (distribution[value] || 0) + 1;
    });
    
    const total = queries.length;
    Object.keys(distribution).forEach(key => {
      distribution[key] = distribution[key] / total;
    });
    
    return distribution;
  }

  private calculateDistributionDifference(dist1: Record<string, number>, dist2: Record<string, number>) {
    const keys = new Set([...Object.keys(dist1), ...Object.keys(dist2)]);
    let totalDifference = 0;
    
    keys.forEach(key => {
      const val1 = dist1[key] || 0;
      const val2 = dist2[key] || 0;
      totalDifference += Math.abs(val1 - val2);
    });
    
    return totalDifference / 2; // Jensen-Shannon divergence approximation
  }

  // ==========================================
  // 데이터 조회 메소드들
  // ==========================================
  
  getUserPreferences(userId: string) {
    const session = this.userSessions.get(userId);
    return session ? session.preferences : null;
  }

  getGlobalPatterns() {
    return this.globalPatterns;
  }

  getUserPerformance(userId: string) {
    const session = this.userSessions.get(userId);
    return session ? session.performance : null;
  }
}

// ==========================================
// 적응형 AI 관리자
// ==========================================

class AdaptiveAIManager extends EventEmitter {
  private patternAnalyzer: UserPatternAnalyzer;
  private serviceStats = {
    training: { requests: 0, tokens: 0, cost: 0, satisfaction: 0 },
    health: { requests: 0, tokens: 0, cost: 0, satisfaction: 0 },
    nutrition: { requests: 0, tokens: 0, cost: 0, satisfaction: 0 },
    behavior: { requests: 0, tokens: 0, cost: 0, satisfaction: 0 },
    imageAnalysis: { requests: 0, tokens: 0, cost: 0, satisfaction: 0 },
    chatbot: { requests: 0, tokens: 0, cost: 0, satisfaction: 0 }
  };

  constructor() {
    super();
    this.patternAnalyzer = new UserPatternAnalyzer();
    
    // 패턴 변화 이벤트 리스너
    this.patternAnalyzer.on('patternChange', (change) => {
      this.handlePatternChange(change);
    });
    
    this.patternAnalyzer.on('patternAnalysis', (analysis) => {
      this.handlePatternAnalysis(analysis);
    });
  }

  // ==========================================
  // AI 엔진 선택 로직
  // ==========================================
  
  selectOptimalAI(userId: string, serviceType: string, taskDetails: any = {}) {
    const userPrefs = this.patternAnalyzer.getUserPreferences(userId);
    const {
      urgency = 'medium',
      complexity = 'medium',
      dataType = 'text',
      analysisDepth = 'standard',
      personalizedNeeded = true,
      realTimeNeeded = false,
      visualAnalysis = false
    } = taskDetails;

    // 사용자 선호도 반영
    if (userPrefs) {
      if (userPrefs.qualityPreference === 'speed' && !realTimeNeeded) {
        return this.selectSpeedOptimizedAI(serviceType);
      } else if (userPrefs.qualityPreference === 'quality') {
        return this.selectQualityOptimizedAI(serviceType);
      } else if (userPrefs.qualityPreference === 'cost') {
        return this.selectCostOptimizedAI(serviceType);
      }
    }

    // 실시간 정보 필요 (최신 정보, 응급상황 등)
    if (realTimeNeeded || urgency === 'critical') {
      return {
        primary: 'perplexity',
        secondary: 'claude',
        reason: '응급상황 및 최신 정보 검색',
        confidence: 0.95
      };
    }

    // 이미지/비디오 분석
    if (visualAnalysis || dataType !== 'text') {
      return {
        primary: 'openai', // GPT-4V
        secondary: 'gemini',
        reason: '시각적 콘텐츠 분석 특화',
        confidence: 0.9
      };
    }

    // 서비스별 특화 선택
    return this.selectServiceSpecificAI(serviceType, complexity, personalizedNeeded);
  }

  private selectSpeedOptimizedAI(serviceType: string) {
    return {
      primary: 'gemini',
      secondary: 'openai',
      reason: '빠른 응답 속도 최적화',
      confidence: 0.8
    };
  }

  private selectQualityOptimizedAI(serviceType: string) {
    return {
      primary: 'claude',
      secondary: 'openai',
      reason: '고품질 분석 결과 제공',
      confidence: 0.9
    };
  }

  private selectCostOptimizedAI(serviceType: string) {
    return {
      primary: 'gemini',
      secondary: 'openai',
      reason: '비용 효율적인 AI 사용',
      confidence: 0.85
    };
  }

  private selectServiceSpecificAI(serviceType: string, complexity: string, personalizedNeeded: boolean) {
    switch (serviceType) {
      case 'training':
        return complexity === 'complex' || personalizedNeeded ? {
          primary: 'claude',
          secondary: 'openai',
          reason: '개인화된 훈련 계획 수립',
          confidence: 0.9
        } : {
          primary: 'openai',
          secondary: 'gemini',
          reason: '기본 훈련 가이드',
          confidence: 0.85
        };
      
      case 'health':
        return {
          primary: 'claude',
          secondary: 'perplexity',
          reason: '정밀한 건강 분석',
          confidence: 0.95
        };
      
      case 'behavior':
        return {
          primary: 'claude',
          secondary: 'openai',
          reason: '복잡한 행동 패턴 분석',
          confidence: 0.95
        };
      
      default:
        return {
          primary: 'openai',
          secondary: 'gemini',
          reason: '범용 AI 서비스',
          confidence: 0.8
        };
    }
  }

  // ==========================================
  // 강화된 분석 서비스
  // ==========================================
  
  async enhancedAnalysis(userId: string, prompt: string, analysisType: string, options: any = {}) {
    const startTime = Date.now();
    
    try {
      // 최적 AI 선택
      const aiChoice = this.selectOptimalAI(userId, analysisType, options);
      
      // 다중 엔진 분석 실행
      const result = await aiProxyService.analyzeWithMultipleEngines(prompt, analysisType);
      
      const responseTime = Date.now() - startTime;
      
      // 사용량 추적
      this.patternAnalyzer.trackUserQuery(userId, {
        type: 'analysis' as const,
        complexity: options.complexity || 'medium',
        domain: analysisType as any,
        responseTime,
        aiUsed: aiChoice.primary,
        tokens: result.totalTokens || 0,
        cost: result.totalCost || 0,
        satisfaction: options.satisfaction
      });
      
      return {
        success: true,
        result,
        aiUsed: aiChoice.primary,
        responseTime,
        userPreferences: this.patternAnalyzer.getUserPreferences(userId)
      };
      
    } catch (error) {
      logServerError('Enhanced analysis failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // ==========================================
  // 패턴 변화 처리
  // ==========================================
  
  private handlePatternChange(change: any) {
    console.log(`🔄 [Pattern Change] ${change.type}: ${(change.change * 100).toFixed(1)}% 변화 감지`);
    
    // 패턴 변화에 따른 자동 조정
    if (change.type === 'serviceUsage') {
      this.adjustServiceOptimization(change);
    }
    
    if (change.type === 'complexity') {
      this.adjustComplexityHandling(change);
    }
  }

  private handlePatternAnalysis(analysis: any) {
    console.log('📊 [Pattern Analysis] 글로벌 트렌드 분석 완료');
    
    // 추천사항 적용
    analysis.recommendations.forEach((rec: any) => {
      this.applyRecommendation(rec);
    });
  }

  private adjustServiceOptimization(change: any) {
    // 서비스 사용 패턴 변화에 따른 AI 가중치 자동 조정
    console.log('⚙️ [Auto Adjust] 서비스 최적화 조정 중...');
  }

  private adjustComplexityHandling(change: any) {
    // 복잡도 요구사항 변화에 따른 AI 모델 선택 조정
    console.log('⚙️ [Auto Adjust] 복잡도 처리 조정 중...');
  }

  private applyRecommendation(recommendation: any) {
    console.log(`💡 [Recommendation] ${recommendation.priority}: ${recommendation.message}`);
    
    // 추천사항에 따른 자동 조정 실행
    if (recommendation.action.startsWith('increase_')) {
      // 특정 서비스나 모델 비중 증가
    }
  }

  // ==========================================
  // 통계 및 모니터링
  // ==========================================
  
  getSystemStats() {
    return {
      globalPatterns: this.patternAnalyzer.getGlobalPatterns(),
      serviceStats: this.serviceStats,
      activeUsers: this.patternAnalyzer['userSessions'].size,
      totalQueries: Array.from(this.patternAnalyzer['userSessions'].values())
        .reduce((sum, session) => sum + session.performance.totalQueries, 0)
    };
  }

  getUserAnalytics(userId: string) {
    return {
      preferences: this.patternAnalyzer.getUserPreferences(userId),
      performance: this.patternAnalyzer.getUserPerformance(userId),
      recommendations: this.generateUserRecommendations(userId)
    };
  }

  private generateUserRecommendations(userId: string) {
    const userPrefs = this.patternAnalyzer.getUserPreferences(userId);
    const userPerf = this.patternAnalyzer.getUserPerformance(userId);
    
    if (!userPrefs || !userPerf) return [];
    
    const recommendations = [];
    
    if (userPerf.avgSatisfaction < 3.5) {
      recommendations.push({
        type: 'quality_improvement',
        message: '더 정확한 분석을 위해 상세한 정보를 제공해보세요.',
        priority: 'medium'
      });
    }
    
    if (userPerf.avgResponseTime > userPrefs.responseTimeExpectation * 1.5) {
      recommendations.push({
        type: 'speed_optimization',
        message: '더 빠른 응답을 원하시면 간단한 질문으로 나누어 요청해보세요.',
        priority: 'low'
      });
    }
    
    return recommendations;
  }
}

// 싱글톤 인스턴스
export const adaptiveAIManager = new AdaptiveAIManager();
export default adaptiveAIManager;