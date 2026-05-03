import { storage } from '../storage';
import * as cheerio from 'cheerio';
import { logServerError } from '../middleware/audit-logger';

/**
 * 이벤트 자동 업데이트 서비스
 * 매일 자정에 실행되어 반려동물 축제 정보를 자동으로 업데이트합니다.
 */
export class EventUpdaterService {
  private readonly updateInterval = 24 * 60 * 60 * 1000; // 24시간
  private updateTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.startScheduler();
  }

  /**
   * 스케줄러 시작
   */
  private startScheduler() {
    // 매일 자정에 실행
    const now = new Date();
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
    const timeUntilMidnight = tomorrow.getTime() - now.getTime();

    // 첫 번째 실행을 자정에 예약
    setTimeout(() => {
      this.updateEvents();
      // 그 후로는 24시간마다 실행
      this.updateTimer = setInterval(() => {
        this.updateEvents();
      }, this.updateInterval);
    }, timeUntilMidnight);

    console.log('✅ 이벤트 자동 업데이트 스케줄러 시작됨');
  }

  /**
   * 스케줄러 중지
   */
  public stopScheduler() {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }
  }

  /**
   * 이벤트 정보 업데이트 실행
   */
  public async updateEvents() {
    try {
      console.log('🔄 이벤트 자동 업데이트 시작...');
      
      const eventSources = [
        'https://www.mk.co.kr/news/culture/11339790', // 케이펫페어
        'https://korean.visitkorea.or.kr/search/search_list.do?keyword=반려동물', // 한국관광공사
        'https://www.instagram.com/explore/tags/반려동물축제/' // 인스타그램
      ];

      let totalUpdated = 0;
      let totalCreated = 0;

      // 각 소스에서 이벤트 정보 수집
      for (const source of eventSources) {
        try {
          const events = await this.fetchEventsFromSource(source);
          
          for (const eventData of events) {
            const existingEvent = await storage.getEventBySourceUrl(eventData.sourceUrl);
            
            if (existingEvent) {
              await storage.updateEvent(existingEvent.id, {
                ...eventData,
                lastUpdated: new Date().toISOString()
              });
              totalUpdated++;
            } else {
              await storage.createEvent({
                ...eventData,
                lastUpdated: new Date().toISOString()
              });
              totalCreated++;
            }
          }
        } catch (error) {
          logServerError(`소스 ${source}에서 이벤트 수집 오류:`, error);
        }
      }

      console.log(`✅ 이벤트 자동 업데이트 완료: 생성 ${totalCreated}개, 업데이트 ${totalUpdated}개`);
      
      // 업데이트 로그 저장
      await this.logUpdateResult(totalCreated, totalUpdated);
      
    } catch (error) {
      logServerError('❌ 이벤트 자동 업데이트 오류:', error);
    }
  }

  /**
   * 특정 소스에서 이벤트 정보 수집
   */
  private async fetchEventsFromSource(sourceUrl: string): Promise<any[]> {
    const events: any[] = [];
    
    try {
      // 실제 웹 크롤링은 복잡하므로 여기서는 시뮬레이션
      // 운영 환경에서는 puppeteer, playwright 등을 사용
      
      if (sourceUrl.includes('mk.co.kr')) {
        // 매일경제 - 케이펫페어 정보
        events.push({
          name: "2025 케이펫페어 마곡",
          location: {
            address: "서울특별시 강서구 마곡중앙로 38 (코엑스 마곡전시장)",
            lat: 37.5635,
            lng: 126.8266
          },
          startDate: "2025-06-13",
          endDate: "2025-06-15",
          time: "오전 10:00 - 오후 6:00",
          description: "국내 대표 반려동물 축제. 121개사 약 250부스 규모로 펫푸드·펫 용품 체험, 샘플링 이벤트, 럭키드로우, 아로마·아이스크림 만들기 등 다양한 프로그램이 진행됩니다.",
          category: "전시회",
          price: "무료",
          attendees: 0,
          maxAttendees: 50000,
          organizer: "한국펫사료협회 / 메쎄이상",
          status: "예정",
          tags: ["펫푸드", "펫용품", "전시회", "체험", "샘플링"],
          sourceUrl: sourceUrl,
          thumbnailUrl: "https://tse3.mm.bing.net/th/id/OIP._D4iSsXD0kjWw4hBbdyX5gHaHa?r=0&pid=Api"
        });
      } else if (sourceUrl.includes('visitkorea.or.kr')) {
        // 한국관광공사 - 지역 축제 정보
        events.push({
          name: "가평 반려동물 문화행사 '활짝펫'",
          location: {
            address: "경기도 가평군 상면 수목원로 432 (가평 수목원)",
            lat: 37.7447,
            lng: 127.3729
          },
          startDate: "2025-05-15",
          endDate: "2025-05-17",
          time: "오전 10:00 - 오후 5:00",
          description: "산책형 문화 행사로 오프리쉬존, 펫게임, 산책, 행동교육, 체험 마켓 등이 포함된 자연 친화적인 반려동물 축제입니다.",
          category: "자연체험",
          price: "무료",
          attendees: 0,
          maxAttendees: 3000,
          organizer: "가평군",
          status: "예정",
          tags: ["산책", "자연체험", "오프리쉬존", "펫게임", "행동교육"],
          sourceUrl: sourceUrl,
          thumbnailUrl: "https://tse3.mm.bing.net/th/id/OIP._D4iSsXD0kjWw4hBbdyX5gHaHa?r=0&pid=Api"
        });
      }
      
    } catch (error) {
      logServerError(`소스 ${sourceUrl}에서 데이터 수집 오류:`, error);
    }
    
    return events;
  }

  /**
   * 업데이트 결과 로그 저장
   */
  private async logUpdateResult(created: number, updated: number) {
    const logData = {
      timestamp: new Date().toISOString(),
      created,
      updated,
      total: created + updated
    };
    
    // 실제 운영에서는 로그 파일이나 데이터베이스에 저장
    console.log('📊 업데이트 결과 로그:', logData);
  }

  /**
   * 수동 업데이트 실행
   */
  public async manualUpdate(): Promise<{ created: number; updated: number }> {
    await this.updateEvents();
    const events = await storage.getAllEvents();
    
    return {
      created: events.filter(e => {
        const today = new Date().toISOString().split('T')[0];
        return e.createdAt && e.createdAt.startsWith(today);
      }).length,
      updated: events.filter(e => {
        const today = new Date().toISOString().split('T')[0];
        return e.lastUpdated && e.lastUpdated.startsWith(today);
      }).length
    };
  }
}

// 싱글톤 인스턴스 생성
export const eventUpdater = new EventUpdaterService();