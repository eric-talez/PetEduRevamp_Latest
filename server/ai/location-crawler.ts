
import OpenAI from 'openai';
import { JSDOM } from 'jsdom';
import { logServerError } from '../middleware/audit-logger';

interface LocationInfo {
  name: string;
  type: 'training' | 'cafe' | 'hospital' | 'hotel' | 'grooming' | 'park';
  address: string;
  phone?: string;
  hours?: string;
  latitude: number;
  longitude: number;
  description?: string;
  website?: string;
  rating?: number;
  tags: string[];
  lastUpdated: Date;
}

export class AILocationCrawler {
  private openai: OpenAI;
  private kakaoApiKey: string;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_TALEZ || process.env.OPENAI_API_KEY || ''
    });
    this.kakaoApiKey = process.env.VITE_KAKAO_MAPS_API_KEY || '';
  }

  // 카카오 로컬 API로 반려견 관련 장소 검색
  async searchPetLocations(
    keyword: string, 
    type: LocationInfo['type'], 
    region: string = '전국'
  ): Promise<LocationInfo[]> {
    try {
      const searchQuery = `${region} ${keyword}`;
      const response = await fetch(
        `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(searchQuery)}&size=15`,
        {
          headers: {
            'Authorization': `KakaoAK ${this.kakaoApiKey}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('카카오 API 검색 실패');
      }

      const data = await response.json();
      const locations: LocationInfo[] = [];

      for (const place of data.documents) {
        const locationInfo: LocationInfo = {
          name: place.place_name,
          type: type,
          address: place.road_address_name || place.address_name,
          phone: place.phone || undefined,
          latitude: parseFloat(place.y),
          longitude: parseFloat(place.x),
          description: place.category_name,
          website: place.place_url,
          tags: [type, keyword],
          lastUpdated: new Date()
        };

        // AI로 추가 정보 보강
        const enhancedInfo = await this.enhanceWithAI(locationInfo);
        locations.push(enhancedInfo);
      }

      return locations;
    } catch (error) {
      logServerError('장소 검색 오류:', error);
      return [];
    }
  }

  // AI로 장소 정보 보강
  private async enhanceWithAI(location: LocationInfo): Promise<LocationInfo> {
    try {
      const prompt = `
다음 반려견 관련 시설의 정보를 분석하고 보강해주세요:

이름: ${location.name}
종류: ${location.type}
주소: ${location.address}
설명: ${location.description || '없음'}

다음 형식의 JSON으로 응답해주세요:
{
  "description": "시설에 대한 간단한 설명 (50자 이내)",
  "hours": "예상 운영시간 (예: 09:00-18:00)",
  "tags": ["관련", "태그", "3-5개"],
  "rating": 4.5
}
`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.3
      });

      const aiData = JSON.parse(response.choices[0].message.content || '{}');

      return {
        ...location,
        description: aiData.description || location.description,
        hours: aiData.hours || location.hours,
        tags: [...location.tags, ...(aiData.tags || [])],
        rating: aiData.rating || location.rating
      };
    } catch (error) {
      logServerError('AI 정보 보강 오류:', error);
      return location;
    }
  }

  // 전국 주요 지역의 반려견 관련 장소 수집
  async collectNationwideLocations(): Promise<LocationInfo[]> {
    const regions = ['서울', '경기', '인천', '부산', '대구', '대전', '광주', '울산', '세종'];
    const keywords = {
      training: ['애견훈련소', '반려견훈련', '도그트레이닝'],
      cafe: ['애견카페', '반려견카페', '펫카페'],
      hospital: ['동물병원', '수의과'],
      hotel: ['애견호텔', '펫호텔', '반려견호텔'],
      grooming: ['애견미용', '펫미용', '반려견미용'],
      park: ['강아지놀이터', '반려견공원', '애견운동장']
    };

    const allLocations: LocationInfo[] = [];

    for (const region of regions) {
      for (const [type, keywordList] of Object.entries(keywords)) {
        for (const keyword of keywordList) {
          console.log(`[AI 크롤러] ${region} ${keyword} 검색 중...`);
          const locations = await this.searchPetLocations(
            keyword, 
            type as LocationInfo['type'], 
            region
          );
          allLocations.push(...locations);

          // API 호출 제한 대응
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    }

    // 중복 제거 (동일 좌표)
    const uniqueLocations = this.removeDuplicates(allLocations);
    console.log(`[AI 크롤러] 총 ${uniqueLocations.length}개 장소 수집 완료`);

    return uniqueLocations;
  }

  // 중복 제거
  private removeDuplicates(locations: LocationInfo[]): LocationInfo[] {
    const uniqueMap = new Map<string, LocationInfo>();

    for (const location of locations) {
      const key = `${location.latitude.toFixed(6)},${location.longitude.toFixed(6)}`;
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, location);
      }
    }

    return Array.from(uniqueMap.values());
  }

  // 네이버 블로그/뉴스에서 최신 정보 수집
  async collectFromNaverBlog(keyword: string): Promise<any[]> {
    try {
      // 네이버 검색 API 사용 (클라이언트 ID, 시크릿 필요)
      const clientId = process.env.NAVER_CLIENT_ID;
      const clientSecret = process.env.NAVER_CLIENT_SECRET;

      if (!clientId || !clientSecret) {
        console.log('네이버 API 키 없음');
        return [];
      }

      const response = await fetch(
        `https://openapi.naver.com/v1/search/blog.json?query=${encodeURIComponent(keyword)}&display=10`,
        {
          headers: {
            'X-Naver-Client-Id': clientId,
            'X-Naver-Client-Secret': clientSecret
          }
        }
      );

      if (!response.ok) {
        throw new Error('네이버 API 검색 실패');
      }

      const data = await response.json();
      return data.items || [];
    } catch (error) {
      logServerError('네이버 블로그 수집 오류:', error);
      return [];
    }
  }
}

export const aiLocationCrawler = new AILocationCrawler();
