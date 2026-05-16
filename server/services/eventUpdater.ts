import { storage } from '../storage';
import { logServerError } from '../middleware/audit-logger';
import { notificationService, type NotificationData } from '../notifications/notification-service';
import type { InsertPetEvent, PetEvent, PetEventCategory } from '@shared/schema';

interface CrawledEvent {
  title: string;
  description: string | null;
  startDate: Date;
  endDate: Date;
  location: string;
  lat: string;
  lng: string;
  category: PetEventCategory;
  imageUrl: string | null;
  websiteUrl: string | null;
  source: string;
}

export interface SourceStat {
  source: string;
  fetched: number;
  created: number;
  duplicates: number;
  failures: number;
}

export interface ImportFailure {
  source: string;
  message: string;
  link?: string | null;
  title?: string | null;
}

export interface BodyFetchStats {
  /** 본문 페치를 실제로 시도한 횟수 (캐시 히트 제외) */
  attempted: number;
  /** 본문 텍스트를 성공적으로 받은 횟수 */
  succeeded: number;
  /** 본문 페치 후 추출에 성공해 후보가 살아남은 건수 */
  rescued: number;
  /** robots.txt User-agent: * Disallow 로 차단된 횟수 */
  robotsBlocked: number;
  /** HTTP 4xx/5xx 응답으로 실패한 횟수 */
  httpErrors: number;
  /** BODY_FETCH_MAX_PER_RUN 한도에 걸려 시도조차 못한 횟수 */
  limitExceeded: number;
  /** 그 외 스킵 (URL 형식, content-type, SSRF, 리다이렉트, 본문 텍스트 없음 등) */
  otherSkipped: number;
}

export interface ImportResult {
  runId?: number;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  fetched: number;
  created: number;
  duplicates: number;
  failures: ImportFailure[];
  bySource: SourceStat[];
  bodyFetch: BodyFetchStats;
}

export function emptyBodyFetchStats(): BodyFetchStats {
  return {
    attempted: 0,
    succeeded: 0,
    rescued: 0,
    robotsBlocked: 0,
    httpErrors: 0,
    limitExceeded: 0,
    otherSkipped: 0,
  };
}

export interface FailureCandidate {
  runId: number;
  idx: number;
  runStartedAt: string;
  source: string;
  message: string;
  link: string | null;
  title: string | null;
  status: 'open' | 'resolved' | 'dismissed';
  resolvedEventId: number | null;
  note: string | null;
  resolvedAt: string | null;
}

interface AdminLike {
  id: number;
  role?: string | null;
}

const RUN_HOUR_KST = 3;
const SOURCE_TIMEOUT_MS = 15_000;
const PET_KEYWORDS = ['반려', '강아지', '댕댕', '펫', 'pet', 'dog'];

function dedupeKey(title: string, startDate: Date, location: string): string {
  const day = new Date(startDate);
  const ymd = `${day.getUTCFullYear()}-${String(day.getUTCMonth() + 1).padStart(2, '0')}-${String(day.getUTCDate()).padStart(2, '0')}`;
  return `${title.trim().toLowerCase()}|${ymd}|${location.trim().toLowerCase()}`;
}

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`${label} timeout after ${ms}ms`)), ms)),
  ]);
}

function matchesPetKeyword(text: string): boolean {
  const lc = text.toLowerCase();
  return PET_KEYWORDS.some((k) => lc.includes(k.toLowerCase()));
}

function parseTourApiDate(yyyyMMdd: string, endOfDay = false): Date | null {
  if (!/^\d{8}$/.test(yyyyMMdd)) return null;
  const y = yyyyMMdd.slice(0, 4);
  const m = yyyyMMdd.slice(4, 6);
  const d = yyyyMMdd.slice(6, 8);
  const time = endOfDay ? 'T23:59:59+09:00' : 'T00:00:00+09:00';
  const dt = new Date(`${y}-${m}-${d}${time}`);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

interface TourApiItem {
  title?: string;
  eventstartdate?: string;
  eventenddate?: string;
  addr1?: string;
  addr2?: string;
  mapx?: string | number;
  mapy?: string | number;
  firstimage?: string;
  contenttypeid?: string | number;
}

function tourApiItemToEvent(it: TourApiItem, source: string, category: PetEventCategory): CrawledEvent | null {
  const title = String(it.title ?? '').trim();
  if (!title || !matchesPetKeyword(title)) return null;
  const sd = String(it.eventstartdate ?? '');
  const ed = String(it.eventenddate ?? sd);
  const startDate = parseTourApiDate(sd);
  const endDate = parseTourApiDate(ed, true);
  if (!startDate || !endDate) return null;
  const lat = it.mapy != null && String(it.mapy).length > 0 ? String(it.mapy) : '';
  const lng = it.mapx != null && String(it.mapx).length > 0 ? String(it.mapx) : '';
  if (!lat || !lng) return null;
  const location = String(it.addr1 ?? it.addr2 ?? '').trim();
  if (!location) return null;
  return {
    title,
    description: null,
    startDate,
    endDate,
    location,
    lat,
    lng,
    category,
    imageUrl: it.firstimage ? String(it.firstimage) : null,
    websiteUrl: null,
    source,
  };
}

/**
 * Source A: 한국관광공사 TourAPI 4.0 — searchFestival2
 * 오늘 이후 시작하는 축제 중 '반려/펫/강아지' 키워드 매칭 항목만 수집.
 * VISITKOREA_API_KEY 미설정 시 빈 배열 반환.
 */
async function fetchVisitKoreaFestivals(): Promise<CrawledEvent[]> {
  const key = process.env.VISITKOREA_API_KEY;
  if (!key) return [];

  const today = new Date();
  const yyyyMMdd = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
  const url = `https://apis.data.go.kr/B551011/KorService2/searchFestival2?serviceKey=${encodeURIComponent(key)}&MobileOS=ETC&MobileApp=TALEZ&_type=json&numOfRows=100&pageNo=1&arrange=A&eventStartDate=${yyyyMMdd}`;

  const res = await withTimeout(fetch(url, { headers: { Accept: 'application/json' } }), SOURCE_TIMEOUT_MS, 'visitkorea-festival');
  if (!res.ok) throw new Error(`VisitKorea(festival) HTTP ${res.status}`);
  const json = (await res.json()) as { response?: { body?: { items?: { item?: TourApiItem[] | TourApiItem } } } };
  const raw = json?.response?.body?.items?.item;
  const items: TourApiItem[] = Array.isArray(raw) ? raw : raw ? [raw] : [];

  const out: CrawledEvent[] = [];
  for (const it of items) {
    const ev = tourApiItemToEvent(it, 'VisitKorea(축제)', 'festival');
    if (ev) out.push(ev);
  }
  return out;
}

/**
 * Source B: 한국관광공사 TourAPI 4.0 — searchKeyword2 ("반려" 키워드, contentTypeId=15 = 행사/공연/축제)
 * searchFestival2 가 놓치는 일반 행사/입양행사를 보완.
 */
async function fetchVisitKoreaPetKeyword(): Promise<CrawledEvent[]> {
  const key = process.env.VISITKOREA_API_KEY;
  if (!key) return [];

  const url = `https://apis.data.go.kr/B551011/KorService2/searchKeyword2?serviceKey=${encodeURIComponent(key)}&MobileOS=ETC&MobileApp=TALEZ&_type=json&numOfRows=100&pageNo=1&arrange=A&contentTypeId=15&keyword=${encodeURIComponent('반려')}`;

  const res = await withTimeout(fetch(url, { headers: { Accept: 'application/json' } }), SOURCE_TIMEOUT_MS, 'visitkorea-keyword');
  if (!res.ok) throw new Error(`VisitKorea(keyword) HTTP ${res.status}`);
  const json = (await res.json()) as { response?: { body?: { items?: { item?: TourApiItem[] | TourApiItem } } } };
  const raw = json?.response?.body?.items?.item;
  const items: TourApiItem[] = Array.isArray(raw) ? raw : raw ? [raw] : [];

  const out: CrawledEvent[] = [];
  for (const it of items) {
    // 키워드 검색은 시작/종료일이 비어 있는 항목이 섞여 들어옴 → tourApiItemToEvent 가 걸러냄.
    const ev = tourApiItemToEvent(it, 'VisitKorea(키워드)', 'other');
    if (ev) out.push(ev);
  }
  return out;
}

/**
 * 알려진 행사 전시장/공원의 좌표 룩업.
 * HTML/공공 OpenAPI 응답에 좌표가 없을 때 장소명으로 매칭해 lat/lng 를 보완.
 */
const VENUE_COORDS: Array<{ keywords: string[]; lat: string; lng: string; address: string }> = [
  { keywords: ['kintex', '킨텍스'], lat: '37.6709', lng: '126.7409', address: '경기도 고양시 일산서구 킨텍스로 217 (킨텍스)' },
  { keywords: ['coex', '코엑스'], lat: '37.5126', lng: '127.0589', address: '서울특별시 강남구 영동대로 513 (코엑스)' },
  { keywords: ['setec', '세텍'], lat: '37.4929', lng: '127.0648', address: '서울특별시 강남구 남부순환로 3104 (SETEC)' },
  { keywords: ['bexco', '벡스코'], lat: '35.1689', lng: '129.1342', address: '부산광역시 해운대구 APEC로 55 (BEXCO)' },
  { keywords: ['exco', '엑스코'], lat: '35.8839', lng: '128.6094', address: '대구광역시 북구 엑스코로 10 (EXCO)' },
  { keywords: ['at센터', 'at center', '에이티센터', '양재 at'], lat: '37.4684', lng: '127.0388', address: '서울특별시 서초구 강남대로 27 (aT센터)' },
  { keywords: ['마곡', 'magok'], lat: '37.5635', lng: '126.8266', address: '서울특별시 강서구 마곡중앙로 38 (코엑스 마곡전시장)' },
  { keywords: ['송도컨벤시아', 'songdo convensia'], lat: '37.3825', lng: '126.6437', address: '인천광역시 연수구 센트럴로 123 (송도컨벤시아)' },
];

function lookupVenue(text: string): { lat: string; lng: string; address: string } | null {
  const lc = text.toLowerCase();
  for (const v of VENUE_COORDS) {
    if (v.keywords.some((k) => lc.includes(k.toLowerCase()))) return v;
  }
  return null;
}

function parseFlexibleDate(input: string, endOfDay = false): Date | null {
  const s = input.trim();
  if (!s) return null;
  // 2026-05-14, 2026.05.14, 2026/05/14, 20260514
  const m1 = s.match(/(\d{4})[.\-/]?(\d{1,2})[.\-/]?(\d{1,2})/);
  if (!m1) return null;
  const y = m1[1];
  const mo = m1[2].padStart(2, '0');
  const d = m1[3].padStart(2, '0');
  const time = endOfDay ? 'T23:59:59+09:00' : 'T00:00:00+09:00';
  const dt = new Date(`${y}-${mo}-${d}${time}`);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

/**
 * Source C: 케이펫페어 공식 (kpetfair.co.kr) — 정적 HTML 파싱.
 * 사이트 구조 변경/네트워크 실패 시 빈 배열 반환(파싱 단계 실패는 throw 하지 않음).
 * 좌표는 본문에 포함된 전시장명(KINTEX/COEX/SETEC 등)으로 VENUE_COORDS 매칭.
 */
async function fetchKpetfairOfficial(): Promise<CrawledEvent[]> {
  const url = 'https://www.kpetfair.co.kr/';
  let html = '';
  try {
    const res = await withTimeout(
      fetch(url, { headers: { 'User-Agent': 'TALEZ-EventUpdater/1.0', Accept: 'text/html' } }),
      SOURCE_TIMEOUT_MS,
      'kpetfair-html',
    );
    if (!res.ok) throw new Error(`Kpetfair HTTP ${res.status}`);
    html = await res.text();
  } catch (e) {
    throw e instanceof Error ? e : new Error(String(e));
  }

  const out: CrawledEvent[] = [];
  try {
    const { JSDOM } = await import('jsdom');
    const dom = new JSDOM(html);
    const doc = dom.window.document;

    // 후보 1: JSON-LD Event 스키마.
    const ldNodes = Array.from(doc.querySelectorAll('script[type="application/ld+json"]')) as Element[];
    for (const node of ldNodes) {
      try {
        const data = JSON.parse(node.textContent ?? 'null');
        const arr = Array.isArray(data) ? data : [data];
        for (const item of arr) {
          if (!item || typeof item !== 'object') continue;
          if (String(item['@type'] ?? '').toLowerCase() !== 'event') continue;
          const title = String(item.name ?? '').trim();
          const sd = parseFlexibleDate(String(item.startDate ?? ''));
          const ed = parseFlexibleDate(String(item.endDate ?? item.startDate ?? ''), true);
          if (!title || !sd || !ed) continue;
          const locName = String(item.location?.name ?? item.location?.address ?? '').trim();
          const venue = lookupVenue(`${title} ${locName}`);
          if (!venue) continue;
          out.push({
            title,
            description: typeof item.description === 'string' ? item.description.slice(0, 500) : null,
            startDate: sd,
            endDate: ed,
            location: locName || venue.address,
            lat: venue.lat,
            lng: venue.lng,
            category: 'pet_fair',
            imageUrl: typeof item.image === 'string' ? item.image : null,
            websiteUrl: typeof item.url === 'string' ? item.url : url,
            source: '케이펫페어 공식',
          });
        }
      } catch {
        // JSON-LD 단일 블록 파싱 실패는 무시
      }
    }

    // 후보 2: 일정 텍스트 휴리스틱 — "YYYY.MM.DD ~ MM.DD KINTEX" 같은 패턴.
    if (out.length === 0) {
      const text = doc.body?.textContent ?? '';
      const re = /(\d{4}[.\-/]\d{1,2}[.\-/]\d{1,2})\s*[~-]\s*(\d{1,4}[.\-/]?\d{1,2}[.\-/]?\d{1,2})\s*([^\n\r]{0,80})/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(text)) !== null) {
        const sd = parseFlexibleDate(m[1]);
        let ed = parseFlexibleDate(m[2], true);
        if (sd && !ed) {
          // 종료일이 월/일만 표기된 경우 시작일의 연도를 차용.
          const tail = m[2];
          const mm = tail.match(/(\d{1,2})[.\-/](\d{1,2})/);
          if (mm) ed = parseFlexibleDate(`${sd.getUTCFullYear()}-${mm[1]}-${mm[2]}`, true);
        }
        const tail = m[3] ?? '';
        const venue = lookupVenue(tail);
        if (!sd || !ed || !venue) continue;
        const title = `케이펫페어 ${tail.replace(/[\s\u00A0]+/g, ' ').trim().slice(0, 80)}`.trim();
        if (!matchesPetKeyword(title)) continue;
        out.push({
          title,
          description: null,
          startDate: sd,
          endDate: ed,
          location: venue.address,
          lat: venue.lat,
          lng: venue.lng,
          category: 'pet_fair',
          imageUrl: null,
          websiteUrl: url,
          source: '케이펫페어 공식',
        });
      }
    }
  } catch (e) {
    // 파싱 단계 오류는 0건으로 처리해 다른 소스에 영향 주지 않도록 함.
    logServerError('[eventUpdater] kpetfair 파싱 실패:', e);
    return [];
  }

  return out;
}

/**
 * Source D: 농림축산검역본부 동물보호관리시스템(공공데이터포털) — 행사정보(eventInfo).
 * `ANIMAL_PROTECT_API_KEY` 미설정 시 빈 배열 반환.
 * 응답에 좌표가 없으므로 행사장명으로 VENUE_COORDS 매칭, 미매칭 시 스킵.
 */
async function fetchAnimalProtectEvents(): Promise<CrawledEvent[]> {
  const key = process.env.ANIMAL_PROTECT_API_KEY;
  if (!key) return [];

  const today = new Date();
  const yyyyMMdd = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
  const after = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000);
  const yyyyMMddEnd = `${after.getFullYear()}${String(after.getMonth() + 1).padStart(2, '0')}${String(after.getDate()).padStart(2, '0')}`;
  const url =
    `https://apis.data.go.kr/1543061/abandonmentPublicEventSrvc/eventInfo` +
    `?serviceKey=${encodeURIComponent(key)}&_type=json&numOfRows=100&pageNo=1` +
    `&bgnde=${yyyyMMdd}&endde=${yyyyMMddEnd}`;

  const res = await withTimeout(
    fetch(url, { headers: { Accept: 'application/json' } }),
    SOURCE_TIMEOUT_MS,
    'animal-protect',
  );
  if (!res.ok) throw new Error(`AnimalProtect HTTP ${res.status}`);
  const json = (await res.json()) as {
    response?: { body?: { items?: { item?: Array<Record<string, unknown>> | Record<string, unknown> } } };
  };
  const raw = json?.response?.body?.items?.item;
  const items: Array<Record<string, unknown>> = Array.isArray(raw) ? raw : raw ? [raw] : [];

  const out: CrawledEvent[] = [];
  for (const it of items) {
    const title = String(it.eventNm ?? it.eventNm_ko ?? '').trim();
    if (!title) continue;
    const sdRaw = String(it.eventStdde ?? it.eventStartDate ?? '');
    const edRaw = String(it.eventEnddde ?? it.eventEndDate ?? sdRaw);
    const sd = parseFlexibleDate(sdRaw);
    const ed = parseFlexibleDate(edRaw, true);
    if (!sd || !ed) continue;
    const place = String(it.eventPlace ?? it.eventAddr ?? '').trim();
    const venue = lookupVenue(place);
    if (!venue) continue;
    out.push({
      title,
      description: typeof it.eventCn === 'string' ? (it.eventCn as string).slice(0, 500) : null,
      startDate: sd,
      endDate: ed,
      location: place || venue.address,
      lat: venue.lat,
      lng: venue.lng,
      category: 'adoption',
      imageUrl: typeof it.popfile === 'string' ? (it.popfile as string) : null,
      websiteUrl: 'https://www.animal.go.kr/',
      source: '동물보호관리시스템',
    });
  }
  return out;
}

/**
 * Source E: 서울 열린데이터광장 문화행사정보 (culturalEventInfo) — '반려/펫' 키워드 필터.
 * `SEOUL_OPENAPI_KEY` 미설정 시 빈 배열 반환.
 * 응답의 LOT/LAT 좌표를 우선 사용, 없으면 PLACE 텍스트로 VENUE_COORDS 매칭.
 */
async function fetchSeoulPetCulturalEvents(): Promise<CrawledEvent[]> {
  const key = process.env.SEOUL_OPENAPI_KEY;
  if (!key) return [];

  const url = `http://openapi.seoul.go.kr:8088/${encodeURIComponent(key)}/json/culturalEventInfo/1/200/`;
  const res = await withTimeout(
    fetch(url, { headers: { Accept: 'application/json' } }),
    SOURCE_TIMEOUT_MS,
    'seoul-cultural',
  );
  if (!res.ok) throw new Error(`Seoul(culturalEventInfo) HTTP ${res.status}`);
  const json = (await res.json()) as { culturalEventInfo?: { row?: Array<Record<string, unknown>> } };
  const rows = Array.isArray(json?.culturalEventInfo?.row) ? json.culturalEventInfo!.row! : [];

  const out: CrawledEvent[] = [];
  for (const r of rows) {
    const title = String(r.TITLE ?? '').trim();
    if (!title) continue;
    const haystack = `${title} ${String(r.PROGRAM ?? '')} ${String(r.GUNAME ?? '')}`;
    if (!matchesPetKeyword(haystack)) continue;
    const dateStr = String(r.DATE ?? r.STRTDATE ?? '');
    // "2026-05-14~2026-05-15" 또는 "2026-05-14"
    const parts = dateStr.split('~').map((s) => s.trim());
    const sd = parseFlexibleDate(parts[0] ?? '');
    const ed = parseFlexibleDate(parts[1] ?? parts[0] ?? '', true);
    if (!sd || !ed) continue;
    const place = String(r.PLACE ?? '').trim();
    let lat = String(r.LAT ?? '').trim();
    let lng = String(r.LOT ?? '').trim();
    if (!lat || !lng) {
      const venue = lookupVenue(place);
      if (!venue) continue;
      lat = venue.lat;
      lng = venue.lng;
    }
    out.push({
      title,
      description: null,
      startDate: sd,
      endDate: ed,
      location: place,
      lat,
      lng,
      category: 'festival',
      imageUrl: typeof r.MAIN_IMG === 'string' ? (r.MAIN_IMG as string) : null,
      websiteUrl: typeof r.HMPG_ADDR === 'string' ? (r.HMPG_ADDR as string) : null,
      source: '서울 열린데이터광장(문화행사)',
    });
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// Search-engine sources: Google, Naver, Daum
// ─────────────────────────────────────────────────────────────────────────────

const CURRENT_YEAR = new Date().getFullYear();
const SEARCH_KEYWORDS: string[] = [
  `반려견 축제 ${CURRENT_YEAR}`,
  `펫페어 ${CURRENT_YEAR}`,
  `강아지 입양 행사 ${CURRENT_YEAR}`,
  `도그쇼 ${CURRENT_YEAR}`,
  `반려동물 행사 ${CURRENT_YEAR}`,
  `반려견 대회 ${CURRENT_YEAR}`,
];

/** Max API calls per source per run (to protect quotas/billing). */
const MAX_REQUESTS_PER_SEARCH_SOURCE = 6;

const KR_REGIONS = [
  '서울', '부산', '대구', '인천', '광주', '대전', '울산', '세종',
  '경기', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주',
];

/**
 * Approximate city-center coordinates for the 17 Korean 시/도 regions.
 * Used as a fallback when geocoding fails or no Maps API key is set,
 * so that a candidate with a clearly identified region keyword is not discarded.
 */
const KR_REGION_COORDS: Record<string, { lat: string; lng: string; address: string }> = {
  '서울': { lat: '37.5665', lng: '126.9780', address: '서울특별시' },
  '부산': { lat: '35.1796', lng: '129.0756', address: '부산광역시' },
  '대구': { lat: '35.8714', lng: '128.6014', address: '대구광역시' },
  '인천': { lat: '37.4563', lng: '126.7052', address: '인천광역시' },
  '광주': { lat: '35.1595', lng: '126.8526', address: '광주광역시' },
  '대전': { lat: '36.3504', lng: '127.3845', address: '대전광역시' },
  '울산': { lat: '35.5384', lng: '129.3114', address: '울산광역시' },
  '세종': { lat: '36.4801', lng: '127.2890', address: '세종특별자치시' },
  '경기': { lat: '37.4138', lng: '127.5183', address: '경기도' },
  '강원': { lat: '37.8228', lng: '128.1555', address: '강원도' },
  '충북': { lat: '36.6357', lng: '127.4914', address: '충청북도' },
  '충남': { lat: '36.5184', lng: '126.8000', address: '충청남도' },
  '전북': { lat: '35.7175', lng: '127.1530', address: '전라북도' },
  '전남': { lat: '34.8161', lng: '126.4630', address: '전라남도' },
  '경북': { lat: '36.4919', lng: '128.8889', address: '경상북도' },
  '경남': { lat: '35.4606', lng: '128.2132', address: '경상남도' },
  '제주': { lat: '33.4996', lng: '126.5312', address: '제주특별자치도' },
};

/**
 * Helper: build a KST-anchored Date for the given Y/M/D.
 * Returns null on invalid components (e.g. M=13, D=32).
 */
function makeDateKST(year: number, month: number, day: number, endOfDay = false): Date | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const mo = String(month).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  const time = endOfDay ? 'T23:59:59+09:00' : 'T00:00:00+09:00';
  const dt = new Date(`${year}-${mo}-${d}${time}`);
  if (Number.isNaN(dt.getTime())) return null;
  // Reject impossible calendar dates (e.g. 2/30 → JS rolls forward).
  // Compare back the reconstructed parts in KST.
  const kstParts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(dt);
  const reY = Number(kstParts.find((p) => p.type === 'year')?.value);
  const reM = Number(kstParts.find((p) => p.type === 'month')?.value);
  const reD = Number(kstParts.find((p) => p.type === 'day')?.value);
  if (reY !== year || reM !== month || reD !== day) return null;
  return dt;
}

/**
 * Pick the most likely year for a (month, day) without an explicit year:
 * use the current year, but if the resulting date is more than ~30 days in
 * the past, assume next year (typical for forward-looking event listings).
 */
function inferYearForMonthDay(month: number, day: number, today: Date): number {
  const cy = today.getFullYear();
  const candidate = makeDateKST(cy, month, day);
  if (!candidate) return cy;
  const diffDays = (today.getTime() - candidate.getTime()) / 86_400_000;
  return diffDays > 30 ? cy + 1 : cy;
}

function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * 86_400_000);
}

/** KST-aware day-of-week (0=Sun..6=Sat). */
function kstDayOfWeek(d: Date): number {
  const s = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Seoul', weekday: 'short' }).format(d);
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(s);
}

function kstYMD(d: Date): { y: number; m: number; d: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(d);
  return {
    y: Number(parts.find((p) => p.type === 'year')?.value),
    m: Number(parts.find((p) => p.type === 'month')?.value),
    d: Number(parts.find((p) => p.type === 'day')?.value),
  };
}

function kstMidnight(d: Date, endOfDay = false): Date | null {
  const { y, m, d: day } = kstYMD(d);
  return makeDateKST(y, m, day, endOfDay);
}

/**
 * Extract a date range from Korean free text.
 * Handles patterns like:
 *   "2026년 5월 14일~16일", "2026.05.14~2026.05.16", "2026-05-14 ~ 2026-05-16",
 *   "5/14~5/16", "5/14~16", "5월 14일~16일",
 *   "오늘", "내일", "모레", "이번 주말", "다음 주말", "이번 주", "다음 주".
 */
function extractDateRange(
  text: string,
  today: Date = new Date(),
): { startDate: Date; endDate: Date } | null {
  // Priority 1: Partial end-day range — "2026년 5월 14일~16일" or "2026.5.14~16"
  // Must be checked FIRST before the full-date scanner picks up only the start date.
  const partialRe = /(\d{4})[년.\/\-]\s*(\d{1,2})[월.\/\-]\s*(\d{1,2})일?\s*[~\-―]\s*(\d{1,2})일?/;
  const pm = text.match(partialRe);
  if (pm) {
    const sd = parseFlexibleDate(`${pm[1]}-${pm[2]}-${pm[3]}`);
    const ed = parseFlexibleDate(`${pm[1]}-${pm[2]}-${pm[4]}`, true);
    if (sd && ed && ed >= sd) return { startDate: sd, endDate: ed };
  }

  // Priority 2: Two fully-specified dates — "2026.05.14 ~ 2026.05.16"
  const fullDateRe = /(\d{4})[년.\/\-]\s*(\d{1,2})[월.\/\-]\s*(\d{1,2})일?/g;
  const found: Array<{ y: number; m: number; d: number }> = [];
  let m: RegExpExecArray | null;
  while ((m = fullDateRe.exec(text)) !== null) {
    found.push({ y: parseInt(m[1], 10), m: parseInt(m[2], 10), d: parseInt(m[3], 10) });
    if (found.length >= 2) break;
  }
  if (found.length >= 2) {
    const sd = parseFlexibleDate(`${found[0].y}-${found[0].m}-${found[0].d}`);
    const ed = parseFlexibleDate(`${found[1].y}-${found[1].m}-${found[1].d}`, true);
    if (sd && ed) return { startDate: sd, endDate: ed };
  }

  // Priority 3: Single fully-specified date — treat as single-day event.
  if (found.length === 1) {
    const sd = parseFlexibleDate(`${found[0].y}-${found[0].m}-${found[0].d}`);
    const ed = parseFlexibleDate(`${found[0].y}-${found[0].m}-${found[0].d}`, true);
    if (sd) return { startDate: sd, endDate: ed ?? sd };
  }

  // Priority 4: "M월 D일 ~ M월 D일" (no year)
  const koMdMd = text.match(
    /(?<!\d)(\d{1,2})\s*월\s*(\d{1,2})\s*일?\s*[~\-―]\s*(\d{1,2})\s*월\s*(\d{1,2})\s*일?(?!\d)/,
  );
  if (koMdMd) {
    const m1 = parseInt(koMdMd[1], 10), d1 = parseInt(koMdMd[2], 10);
    const m2 = parseInt(koMdMd[3], 10), d2 = parseInt(koMdMd[4], 10);
    const y = inferYearForMonthDay(m1, d1, today);
    // If end month is earlier than start, it likely crosses the year boundary.
    const ey = m2 < m1 ? y + 1 : y;
    const sd = makeDateKST(y, m1, d1);
    const ed = makeDateKST(ey, m2, d2, true);
    if (sd && ed && ed >= sd) return { startDate: sd, endDate: ed };
  }

  // Priority 5: "M월 D일 ~ D일" (no year, same month)
  const koMdd = text.match(/(?<!\d)(\d{1,2})\s*월\s*(\d{1,2})\s*일?\s*[~\-―]\s*(\d{1,2})\s*일(?!\d)/);
  if (koMdd) {
    const mm = parseInt(koMdd[1], 10);
    const d1 = parseInt(koMdd[2], 10);
    const d2 = parseInt(koMdd[3], 10);
    const y = inferYearForMonthDay(mm, d1, today);
    const sd = makeDateKST(y, mm, d1);
    const ed = makeDateKST(y, mm, d2, true);
    if (sd && ed && ed >= sd) return { startDate: sd, endDate: ed };
  }

  // Priority 6: "M/D ~ M/D" (no year)
  const mdmdRe =
    /(?<![\d.\-/])(\d{1,2})[\/\.](\d{1,2})\s*[~\-―]\s*(\d{1,2})[\/\.](\d{1,2})(?!\d)/;
  const mdmd = text.match(mdmdRe);
  if (mdmd) {
    const m1 = parseInt(mdmd[1], 10), d1 = parseInt(mdmd[2], 10);
    const m2 = parseInt(mdmd[3], 10), d2 = parseInt(mdmd[4], 10);
    const y = inferYearForMonthDay(m1, d1, today);
    const ey = m2 < m1 ? y + 1 : y;
    const sd = makeDateKST(y, m1, d1);
    const ed = makeDateKST(ey, m2, d2, true);
    if (sd && ed && ed >= sd) return { startDate: sd, endDate: ed };
  }

  // Priority 7: "M/D ~ D" (no year, same month)
  const mddRe = /(?<![\d.\-/])(\d{1,2})[\/\.](\d{1,2})\s*[~\-―]\s*(\d{1,2})(?!\d)/;
  const mdd = text.match(mddRe);
  if (mdd) {
    const mm = parseInt(mdd[1], 10);
    const d1 = parseInt(mdd[2], 10);
    const d2 = parseInt(mdd[3], 10);
    const y = inferYearForMonthDay(mm, d1, today);
    const sd = makeDateKST(y, mm, d1);
    const ed = makeDateKST(y, mm, d2, true);
    if (sd && ed && ed >= sd) return { startDate: sd, endDate: ed };
  }

  // Priority 8: Single "M월 D일" (no year)
  const koSingle = text.match(/(?<!\d)(\d{1,2})\s*월\s*(\d{1,2})\s*일(?!\d)/);
  if (koSingle) {
    const mm = parseInt(koSingle[1], 10);
    const d1 = parseInt(koSingle[2], 10);
    const y = inferYearForMonthDay(mm, d1, today);
    const sd = makeDateKST(y, mm, d1);
    if (sd) return { startDate: sd, endDate: makeDateKST(y, mm, d1, true) ?? sd };
  }

  // Priority 9: Single "M/D" (no year). Guard against false positives: must be standalone.
  const mdSingle = text.match(/(?<![\d.\-/])(\d{1,2})\/(\d{1,2})(?!\d)/);
  if (mdSingle) {
    const mm = parseInt(mdSingle[1], 10);
    const d1 = parseInt(mdSingle[2], 10);
    const y = inferYearForMonthDay(mm, d1, today);
    const sd = makeDateKST(y, mm, d1);
    if (sd) return { startDate: sd, endDate: makeDateKST(y, mm, d1, true) ?? sd };
  }

  // Priority 10: Relative day expressions.
  const todayMid = kstMidnight(today);
  if (todayMid) {
    if (/오늘/.test(text)) {
      const e = kstMidnight(today, true);
      if (e) return { startDate: todayMid, endDate: e };
    }
    if (/내일/.test(text)) {
      const s = kstMidnight(addDays(today, 1));
      const e = kstMidnight(addDays(today, 1), true);
      if (s && e) return { startDate: s, endDate: e };
    }
    if (/모레/.test(text)) {
      const s = kstMidnight(addDays(today, 2));
      const e = kstMidnight(addDays(today, 2), true);
      if (s && e) return { startDate: s, endDate: e };
    }
    if (/글피/.test(text)) {
      const s = kstMidnight(addDays(today, 3));
      const e = kstMidnight(addDays(today, 3), true);
      if (s && e) return { startDate: s, endDate: e };
    }
  }

  // Priority 11: Weekend / week expressions.
  const dow = kstDayOfWeek(today); // 0=Sun..6=Sat
  if (/이번\s*주말/.test(text)) {
    const daysToSat = (6 - dow + 7) % 7; // 0 if today is Sat
    const sat = addDays(today, daysToSat);
    const sun = addDays(sat, 1);
    const s = kstMidnight(sat);
    const e = kstMidnight(sun, true);
    if (s && e) return { startDate: s, endDate: e };
  }
  if (/다음\s*주말/.test(text)) {
    const daysToSat = (6 - dow + 7) % 7;
    const sat = addDays(today, daysToSat + 7);
    const sun = addDays(sat, 1);
    const s = kstMidnight(sat);
    const e = kstMidnight(sun, true);
    if (s && e) return { startDate: s, endDate: e };
  }
  if (/이번\s*주(?!말)/.test(text)) {
    const daysToSun = (7 - dow) % 7; // remaining days through Sunday (0 if today is Sunday)
    const sunday = addDays(today, daysToSun);
    const s = kstMidnight(today);
    const e = kstMidnight(sunday, true);
    if (s && e) return { startDate: s, endDate: e };
  }
  if (/다음\s*주(?!말)/.test(text)) {
    // Next Mon..Sun (Korean convention: week starts Monday)
    const daysToNextMon = ((1 - dow + 7) % 7) || 7;
    const mon = addDays(today, daysToNextMon);
    const sun = addDays(mon, 6);
    const s = kstMidnight(mon);
    const e = kstMidnight(sun, true);
    if (s && e) return { startDate: s, endDate: e };
  }

  return null;
}

/**
 * Find a Korean 시/도 region keyword in text and return fallback coords.
 * Used when venue lookup and geocoding both fail.
 */
function findRegionFallback(
  text: string,
): { lat: string; lng: string; location: string } | null {
  for (const region of KR_REGIONS) {
    const idx = text.indexOf(region);
    if (idx >= 0) {
      const coords = KR_REGION_COORDS[region];
      if (!coords) continue;
      // Try to capture a 시/구 fragment near the region keyword for a richer label.
      const slice = text.slice(idx, Math.min(text.length, idx + 30));
      const enriched = slice.match(/([가-힣]+(?:특별시|광역시|특별자치시|특별자치도|도))?\s*([가-힣0-9]+(?:시|군|구))?/);
      const subPart = enriched && enriched[2] ? ` ${enriched[2]}` : '';
      return {
        lat: coords.lat,
        lng: coords.lng,
        location: `${coords.address}${subPart}`.trim(),
      };
    }
  }
  return null;
}

/**
 * Extract the first recognizable Korean location from free text.
 * Returns a venue address if found, otherwise a snippet near the first region keyword.
 */
function extractLocationFromText(text: string): string | null {
  const venue = lookupVenue(text);
  if (venue) return venue.address;
  for (const region of KR_REGIONS) {
    const idx = text.indexOf(region);
    if (idx >= 0) {
      return text.slice(idx, idx + 20).trim().split(/[\s,·\n]/)[0] || region;
    }
  }
  return null;
}

/**
 * Geocode a Korean address using Google Maps Geocoding API.
 * Returns null if the Maps key is not set or geocoding fails.
 */
async function geocodeAddress(address: string): Promise<{ lat: string; lng: string } | null> {
  const key = process.env.VITE_GOOGLE_MAPS_API_KEY;
  if (!key) return null;
  try {
    const url =
      `https://maps.googleapis.com/maps/api/geocode/json` +
      `?address=${encodeURIComponent(address)}&language=ko&region=KR&key=${key}`;
    const res = await withTimeout(
      fetch(url, { headers: { Accept: 'application/json' } }),
      SOURCE_TIMEOUT_MS,
      'geocode',
    );
    if (!res.ok) return null;
    const json = (await res.json()) as {
      status: string;
      results?: Array<{ geometry?: { location?: { lat: number; lng: number } } }>;
    };
    if (json.status !== 'OK' || !json.results?.[0]?.geometry?.location) return null;
    const loc = json.results[0].geometry.location;
    return { lat: String(loc.lat), lng: String(loc.lng) };
  } catch {
    return null;
  }
}

type NormalizeResult =
  | { ok: true; event: CrawledEvent }
  | { ok: false; reason: string; link: string | null; title: string | null };

// ── Body-fetch fallback (robots/throttle aware) ──────────────────────────────
//
// 검색엔진의 description 은 한두 문장이라 날짜·장소가 빠져 있는 경우가 많다.
// 후보의 link 로 가볍게 페치해 본문 텍스트를 추가 컨텍스트로 사용한 뒤
// 같은 추출 로직을 한 번 더 돌린다.
//
// 안전장치:
//  - run 1회당 최대 30회만 페치 (search 후보 폭주 방지)
//  - host 별 최소 1.5s 간격
//  - 비-HTTP(S) URL/HTML 외 컨텐츠 스킵
//  - 응답 본문 512KB 까지만 읽음
//  - robots.txt 의 User-agent: * Disallow 규칙 존중 (간이 파싱)
//  - 페치/파싱 실패는 조용히 폴백; 절대 import run 자체를 깨뜨리지 않음.

const BODY_FETCH_DEFAULT_MAX_PER_RUN = 30;
const BODY_FETCH_DEFAULT_MAX_PER_HOST = 10;
const BODY_FETCH_HARD_CAP = 200;
const BODY_FETCH_TIMEOUT_MS = 8_000;
const BODY_FETCH_MAX_BYTES = 512 * 1024;
const HOST_MIN_INTERVAL_MS = 1_500;
const BODY_FETCH_USER_AGENT = 'TALEZ-EventUpdaterBot/1.0 (+https://talez.app/bot)';

let bodyFetchCount = 0;
let bodyFetchMaxPerRun = BODY_FETCH_DEFAULT_MAX_PER_RUN;
let bodyFetchMaxPerHost = BODY_FETCH_DEFAULT_MAX_PER_HOST;
const lastHostFetchAt = new Map<string, number>();
const hostFetchCount = new Map<string, number>();
const robotsCache = new Map<string, Array<string>>(); // host → list of disallowed path prefixes
const bodyTextCache = new Map<string, string>(); // url → extracted text (per run)
let bodyFetchStats: BodyFetchStats = emptyBodyFetchStats();

export function getBodyFetchStatsSnapshot(): BodyFetchStats {
  return { ...bodyFetchStats };
}

export function setBodyFetchLimits(opts: { perRunMax: number; perHostMax: number }): void {
  const clamp = (v: number) => Math.min(BODY_FETCH_HARD_CAP, Math.max(0, Math.floor(v)));
  bodyFetchMaxPerRun = clamp(opts.perRunMax);
  bodyFetchMaxPerHost = clamp(opts.perHostMax);
}

function resetBodyFetchState(): void {
  bodyFetchCount = 0;
  lastHostFetchAt.clear();
  hostFetchCount.clear();
  robotsCache.clear();
  bodyTextCache.clear();
  bodyFetchStats = emptyBodyFetchStats();
}

function safeParseUrl(raw: string): URL | null {
  try {
    const u = new URL(raw);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    return u;
  } catch {
    return null;
  }
}

// ── SSRF guard ────────────────────────────────────────────────────────────────
// Reject any address that points back into the host network or to RFC1918 /
// link-local ranges. Applied to every DNS resolution AND to every redirect hop
// so a public URL cannot trick us into hitting an internal service.

function ipv4ToInt(addr: string): number | null {
  const parts = addr.split('.');
  if (parts.length !== 4) return null;
  let n = 0;
  for (const p of parts) {
    const v = Number(p);
    if (!Number.isInteger(v) || v < 0 || v > 255) return null;
    n = (n << 8) + v;
  }
  return n >>> 0;
}

function isPrivateIPv4(addr: string): boolean {
  const n = ipv4ToInt(addr);
  if (n == null) return false;
  // 0.0.0.0/8, 10/8, 100.64/10 (CGNAT), 127/8, 169.254/16, 172.16/12,
  // 192.0.0/24, 192.0.2/24, 192.168/16, 198.18/15, 198.51.100/24,
  // 203.0.113/24, 224/4 (multicast), 240/4 (reserved/broadcast)
  const ranges: Array<[number, number]> = [
    [0x00000000, 0xff000000],         // 0.0.0.0/8
    [0x0a000000, 0xff000000],         // 10.0.0.0/8
    [0x64400000, 0xffc00000],         // 100.64.0.0/10
    [0x7f000000, 0xff000000],         // 127.0.0.0/8
    [0xa9fe0000, 0xffff0000],         // 169.254.0.0/16
    [0xac100000, 0xfff00000],         // 172.16.0.0/12
    [0xc0000000, 0xffffff00],         // 192.0.0.0/24
    [0xc0000200, 0xffffff00],         // 192.0.2.0/24
    [0xc0a80000, 0xffff0000],         // 192.168.0.0/16
    [0xc6120000, 0xfffe0000],         // 198.18.0.0/15
    [0xc6336400, 0xffffff00],         // 198.51.100.0/24
    [0xcb007100, 0xffffff00],         // 203.0.113.0/24
    [0xe0000000, 0xf0000000],         // 224.0.0.0/4
    [0xf0000000, 0xf0000000],         // 240.0.0.0/4 (incl. 255.255.255.255)
  ];
  for (const [base, mask] of ranges) {
    if ((n & mask) === (base & mask)) return true;
  }
  return false;
}

function isPrivateIPv6(addr: string): boolean {
  const lower = addr.toLowerCase().replace(/^\[|\]$/g, '').split('%')[0];
  if (lower === '::' || lower === '::1') return true;            // unspecified, loopback
  if (lower.startsWith('fe80:') || lower.startsWith('fe80::')) return true; // link-local
  if (lower.startsWith('fc') || lower.startsWith('fd')) return true;        // ULA fc00::/7
  if (lower.startsWith('ff')) return true;                       // multicast
  // IPv4-mapped: ::ffff:a.b.c.d
  const mapped = lower.match(/^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
  if (mapped) return isPrivateIPv4(mapped[1]);
  return false;
}

function isPrivateAddress(addr: string, family: number | string): boolean {
  if (family === 4 || family === '4' || family === 'IPv4') return isPrivateIPv4(addr);
  if (family === 6 || family === '6' || family === 'IPv6') return isPrivateIPv6(addr);
  return false;
}

async function isHostSafeForFetch(hostname: string): Promise<boolean> {
  // Reject literal IPs that decode to private space without bothering DNS.
  if (/^[\d.]+$/.test(hostname) && isPrivateIPv4(hostname)) return false;
  if (hostname.includes(':') && isPrivateIPv6(hostname)) return false;
  try {
    const dns = await import('node:dns/promises');
    const records = await dns.lookup(hostname, { all: true });
    if (!records.length) return false;
    for (const r of records) {
      if (isPrivateAddress(r.address, r.family)) return false;
    }
    return true;
  } catch {
    return false;
  }
}

async function getRobotsDisallow(host: string, origin: string): Promise<Array<string>> {
  const cached = robotsCache.get(host);
  if (cached) return cached;
  const disallow: Array<string> = [];
  try {
    const res = await withTimeout(
      fetch(`${origin}/robots.txt`, { headers: { 'User-Agent': BODY_FETCH_USER_AGENT, Accept: 'text/plain' } }),
      Math.min(BODY_FETCH_TIMEOUT_MS, 4_000),
      'robots',
    );
    if (res.ok) {
      const text = (await res.text()).slice(0, 64 * 1024);
      // Only honour the wildcard User-agent block — keep the parser tiny.
      const lines = text.split(/\r?\n/);
      let inWildcard = false;
      for (const rawLine of lines) {
        const line = rawLine.replace(/#.*$/, '').trim();
        if (!line) continue;
        const m = line.match(/^([A-Za-z-]+)\s*:\s*(.*)$/);
        if (!m) continue;
        const key = m[1].toLowerCase();
        const value = m[2].trim();
        if (key === 'user-agent') {
          inWildcard = value === '*';
        } else if (inWildcard && key === 'disallow' && value) {
          disallow.push(value);
        }
      }
    }
  } catch {
    // Treat fetch failures as "no robots restrictions" — do not block enrichment.
  }
  robotsCache.set(host, disallow);
  return disallow;
}

function isPathAllowed(disallow: Array<string>, path: string): boolean {
  for (const rule of disallow) {
    if (rule === '/') return false;
    if (path.startsWith(rule)) return false;
  }
  return true;
}

async function throttleHost(host: string): Promise<void> {
  const last = lastHostFetchAt.get(host);
  if (last == null) {
    lastHostFetchAt.set(host, Date.now());
    return;
  }
  const wait = last + HOST_MIN_INTERVAL_MS - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastHostFetchAt.set(host, Date.now());
}

function htmlToText(html: string): string {
  // Drop scripts/styles, then strip tags. Cheap but good enough for date/place phrases.
  const stripped = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<[^>]+>/g, ' ');
  // Decode the handful of entities that meaningfully affect Korean date/location matching.
  return stripped
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => {
      const code = parseInt(n, 10);
      return Number.isFinite(code) ? String.fromCharCode(code) : ' ';
    })
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Fetch the body of a candidate page and return a plain-text excerpt.
 * Returns `{ text }` on success, or `{ skipped: <reason> }` to enrich the failure message.
 */
async function fetchPageBodyText(
  link: string,
): Promise<{ text: string } | { skipped: string }> {
  if (bodyFetchCount >= bodyFetchMaxPerRun) {
    bodyFetchStats.limitExceeded++;
    return { skipped: '본문 페치 한도 초과' };
  }
  const url = safeParseUrl(link);
  if (!url) {
    bodyFetchStats.otherSkipped++;
    return { skipped: '본문 페치 불가(URL 형식)' };
  }

  const cached = bodyTextCache.get(url.toString());
  if (cached !== undefined) {
    return cached ? { text: cached } : { skipped: '본문 페치 이전 실패(캐시)' };
  }

  const host = url.host;
  if ((hostFetchCount.get(host) ?? 0) >= bodyFetchMaxPerHost) {
    bodyFetchStats.limitExceeded++;
    return { skipped: '본문 페치 한도 초과(사이트당)' };
  }
  try {
    const disallow = await getRobotsDisallow(host, url.origin);
    if (!isPathAllowed(disallow, url.pathname)) {
      bodyTextCache.set(url.toString(), '');
      bodyFetchStats.robotsBlocked++;
      return { skipped: 'robots.txt 차단' };
    }
  } catch {
    // continue — robots fetch errors should not block enrichment.
  }

  // SSRF guard — refuse before we ever open a socket to a private/loopback IP.
  if (!(await isHostSafeForFetch(url.hostname))) {
    bodyTextCache.set(url.toString(), '');
    bodyFetchStats.otherSkipped++;
    return { skipped: '본문 페치 차단(내부 주소)' };
  }

  await throttleHost(host);
  bodyFetchCount++;
  hostFetchCount.set(host, (hostFetchCount.get(host) ?? 0) + 1);
  bodyFetchStats.attempted++;

  try {
    // Follow up to 3 redirects manually so that every hop is re-validated by
    // safeParseUrl + isHostSafeForFetch — an attacker cannot 302 us into 127.0.0.1.
    let current: URL = url;
    let res: Response | null = null;
    let hops = 0;
    while (true) {
      res = await withTimeout(
        fetch(current.toString(), {
          headers: {
            'User-Agent': BODY_FETCH_USER_AGENT,
            Accept: 'text/html,application/xhtml+xml',
            'Accept-Language': 'ko,en;q=0.8',
          },
          redirect: 'manual',
        }),
        BODY_FETCH_TIMEOUT_MS,
        `body-${current.host}`,
      );
      if (res.status >= 300 && res.status < 400) {
        const loc = res.headers.get('location');
        if (!loc || hops >= 3) {
          bodyTextCache.set(url.toString(), '');
          bodyFetchStats.otherSkipped++;
          return { skipped: `본문 페치 리다이렉트 ${hops >= 3 ? '한도' : '없음'}` };
        }
        try { await res.body?.cancel?.(); } catch { /* ignore */ }
        const next = safeParseUrl(new URL(loc, current).toString());
        if (!next) {
          bodyTextCache.set(url.toString(), '');
          bodyFetchStats.otherSkipped++;
          return { skipped: '본문 페치 리다이렉트 차단(URL 형식)' };
        }
        if (!(await isHostSafeForFetch(next.hostname))) {
          bodyTextCache.set(url.toString(), '');
          bodyFetchStats.otherSkipped++;
          return { skipped: '본문 페치 리다이렉트 차단(내부 주소)' };
        }
        // Each new host gets its own throttle slot.
        await throttleHost(next.host);
        current = next;
        hops++;
        continue;
      }
      break;
    }
    if (!res) {
      bodyTextCache.set(url.toString(), '');
      bodyFetchStats.otherSkipped++;
      return { skipped: '본문 페치 응답 없음' };
    }
    if (!res.ok) {
      bodyTextCache.set(url.toString(), '');
      bodyFetchStats.httpErrors++;
      return { skipped: `본문 페치 HTTP ${res.status}` };
    }
    const ct = (res.headers.get('content-type') ?? '').toLowerCase();
    if (ct && !ct.includes('html') && !ct.includes('xml') && !ct.includes('text/plain')) {
      bodyTextCache.set(url.toString(), '');
      bodyFetchStats.otherSkipped++;
      return { skipped: `본문 페치 스킵(content-type: ${ct.slice(0, 40)})` };
    }

    const reader = res.body?.getReader();
    let html = '';
    if (reader) {
      const decoder = new TextDecoder('utf-8', { fatal: false });
      let received = 0;
      while (received < BODY_FETCH_MAX_BYTES) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value) {
          received += value.byteLength;
          html += decoder.decode(value, { stream: true });
          if (received >= BODY_FETCH_MAX_BYTES) break;
        }
      }
      try { await reader.cancel(); } catch { /* ignore */ }
    } else {
      html = (await res.text()).slice(0, BODY_FETCH_MAX_BYTES);
    }

    const text = htmlToText(html).slice(0, 16_000);
    if (!text) {
      bodyTextCache.set(url.toString(), '');
      bodyFetchStats.otherSkipped++;
      return { skipped: '본문 페치 후 텍스트 없음' };
    }
    bodyTextCache.set(url.toString(), text);
    bodyFetchStats.succeeded++;
    return { text };
  } catch (e) {
    bodyTextCache.set(url.toString(), '');
    bodyFetchStats.otherSkipped++;
    const msg = e instanceof Error ? e.message : String(e);
    return { skipped: `본문 페치 오류: ${msg.slice(0, 80)}` };
  }
}

interface ResolvedFields {
  dates: { startDate: Date; endDate: Date };
  lat: string;
  lng: string;
  location: string;
}

type ResolveOutcome =
  | { ok: true; resolved: ResolvedFields }
  | { ok: false; missing: 'dates' | 'location' };

async function tryResolveFromText(fullText: string): Promise<ResolveOutcome> {
  const dates = extractDateRange(fullText);
  if (!dates) return { ok: false, missing: 'dates' };

  const venue = lookupVenue(fullText);
  if (venue) {
    return { ok: true, resolved: { dates, lat: venue.lat, lng: venue.lng, location: venue.address } };
  }
  const locationText = extractLocationFromText(fullText);
  if (locationText) {
    const coords = await geocodeAddress(locationText);
    if (coords) {
      return { ok: true, resolved: { dates, lat: coords.lat, lng: coords.lng, location: locationText } };
    }
  }
  const region = findRegionFallback(fullText);
  if (region) {
    return { ok: true, resolved: { dates, lat: region.lat, lng: region.lng, location: region.location } };
  }
  return { ok: false, missing: 'location' };
}

/**
 * Normalise a search result (title + snippet + link + image) into a CrawledEvent.
 * Always returns a structured result — callers must check `.ok` to decide whether
 * to keep the event or record the failure reason in ImportResult.failures.
 *
 * If the snippet alone fails to yield a date or location, the candidate's link is
 * fetched (robots/throttle aware) and the body text is fed into a second extraction
 * pass — typically rescues most "날짜/장소 추출 실패" entries.
 */
async function normalizeSearchResult(
  rawTitle: string,
  rawSnippet: string,
  link: string | null,
  image: string | null,
  source: string,
): Promise<NormalizeResult> {
  const title = rawTitle.replace(/<[^>]+>/g, '').trim();
  const snippet = rawSnippet.replace(/<[^>]+>/g, '').trim();
  const fullText = `${title} ${snippet}`;

  const linkTail = link ? ` [${link}]` : '';

  if (!matchesPetKeyword(fullText)) {
    return { ok: false, reason: `반려동물 키워드 미포함: "${title.slice(0, 60)}"${linkTail}`, link, title };
  }

  let outcome = await tryResolveFromText(fullText);
  let bodyContext = '';

  // Body-fetch fallback: only when initial extraction failed AND we have a link.
  if (!outcome.ok && link) {
    const fetched = await fetchPageBodyText(link);
    if ('text' in fetched) {
      bodyContext = ` | 본문 ${fetched.text.length}자`;
      // Off-topic guard: the body itself must mention a pet keyword. Without
      // this, link previews on news aggregators could drag in random pages
      // that happen to share a snippet with the candidate title.
      if (matchesPetKeyword(fetched.text)) {
        outcome = await tryResolveFromText(`${fullText} ${fetched.text}`);
        if (outcome.ok) bodyFetchStats.rescued++;
      } else {
        bodyContext += ' (본문에 반려동물 키워드 없음)';
      }
    } else {
      bodyContext = ` | ${fetched.skipped}`;
    }
  }

  if (!outcome.ok) {
    const label = outcome.missing === 'dates' ? '날짜 추출 실패' : '장소 추출 실패';
    return {
      ok: false,
      reason: `${label}: "${title.slice(0, 60)}"${linkTail}${bodyContext}`,
      link,
      title,
    };
  }

  // Infer category from keywords (title/snippet only — body could be too noisy).
  let category: PetEventCategory = 'other';
  const lc = fullText.toLowerCase();
  if (lc.includes('입양') || lc.includes('분양')) category = 'adoption';
  else if (lc.includes('펫페어') || lc.includes('pet fair') || lc.includes('박람회')) category = 'pet_fair';
  else if (lc.includes('축제') || lc.includes('festival')) category = 'festival';
  else if (lc.includes('대회') || lc.includes('도그쇼') || lc.includes('competition')) category = 'competition';
  else if (lc.includes('훈련') || lc.includes('교육')) category = 'training';

  const { dates, lat, lng, location } = outcome.resolved;
  return {
    ok: true,
    event: {
      title: title.slice(0, 200),
      description: snippet.slice(0, 500) || null,
      startDate: dates.startDate,
      endDate: dates.endDate,
      location,
      lat,
      lng,
      category,
      imageUrl: image,
      websiteUrl: link,
      source,
    },
  };
}

type SearchFetchResult = { events: CrawledEvent[]; failures: ImportResult['failures'] };

// ── Provider status ───────────────────────────────────────────────────────────

type ProviderReason = 'ok' | 'missing_credentials' | 'permission_denied';

export interface ProviderStatus {
  enabled: boolean;
  reason: ProviderReason;
}

/** Module-level flag: set to true when Google returns 403/PERMISSION_DENIED. */
let googlePermissionDenied = false;
/** Module-level flag: set to true when Vertex AI Search returns 403/PERMISSION_DENIED. */
let vertexPermissionDenied = false;

/** Reset at the start of each import run so the flag reflects only the current run. */
function resetRunFlags(): void {
  googlePermissionDenied = false;
  vertexPermissionDenied = false;
  resetBodyFetchState();
}

function hasVertexAiSearchCredentials(): boolean {
  const hasProject = !!process.env.VERTEX_AI_SEARCH_PROJECT;
  const hasDataStore = !!process.env.VERTEX_AI_SEARCH_DATASTORE;
  const hasCreds = !!(
    process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON ||
    process.env.GCP_SERVICE_ACCOUNT_KEY ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS
  );
  return hasProject && hasDataStore && hasCreds;
}

export function getProviderStatuses(): {
  google: ProviderStatus;
  naver: ProviderStatus;
  kakao: ProviderStatus;
  vertex: ProviderStatus;
} {
  const hasGoogleKey = !!(
    process.env.GOOGLE_CUSTOM_SEARCH_API_KEY && process.env.GOOGLE_CUSTOM_SEARCH_CX
  );
  const hasNaverKey = !!(
    process.env.NAVER_SEARCH_CLIENT_ID && process.env.NAVER_SEARCH_CLIENT_SECRET
  );
  const hasKakaoKey = !!process.env.KAKAO_REST_API_KEY;
  const hasVertexKey = hasVertexAiSearchCredentials();

  const google: ProviderStatus = googlePermissionDenied
    ? { enabled: false, reason: 'permission_denied' }
    : hasGoogleKey
      ? { enabled: true, reason: 'ok' }
      : { enabled: false, reason: 'missing_credentials' };

  const naver: ProviderStatus = hasNaverKey
    ? { enabled: true, reason: 'ok' }
    : { enabled: false, reason: 'missing_credentials' };

  const kakao: ProviderStatus = hasKakaoKey
    ? { enabled: true, reason: 'ok' }
    : { enabled: false, reason: 'missing_credentials' };

  const vertex: ProviderStatus = vertexPermissionDenied
    ? { enabled: false, reason: 'permission_denied' }
    : hasVertexKey
      ? { enabled: true, reason: 'ok' }
      : { enabled: false, reason: 'missing_credentials' };

  return { google, naver, kakao, vertex };
}

function logProviderStatuses(): void {
  const { google, naver, kakao, vertex } = getProviderStatuses();
  const labelOf = (s: ProviderStatus, missing = 'missing credentials') =>
    s.reason === 'permission_denied' ? 'permission denied' : s.enabled ? 'active' : missing;
  console.log(`[eventUpdater] Google: ${labelOf(google, 'disabled')}`);
  console.log(`[eventUpdater] Naver: ${labelOf(naver)}`);
  console.log(`[eventUpdater] Kakao: ${labelOf(kakao)}`);
  console.log(`[eventUpdater] Vertex AI Search: ${labelOf(vertex)}`);
}

// ── Search provider implementations ──────────────────────────────────────────

/**
 * Source G (primary): Naver Search API — news + webkr endpoints.
 * Requires NAVER_SEARCH_CLIENT_ID + NAVER_SEARCH_CLIENT_SECRET.
 * Missing keys → returns empty with a status log line, no error thrown.
 */
async function fetchNaverSearchEvents(): Promise<SearchFetchResult> {
  const clientId = process.env.NAVER_SEARCH_CLIENT_ID;
  const clientSecret = process.env.NAVER_SEARCH_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return { events: [], failures: [] };
  }

  const events: CrawledEvent[] = [];
  const failures: ImportResult['failures'] = [];
  const headers = {
    'X-Naver-Client-Id': clientId,
    'X-Naver-Client-Secret': clientSecret,
    Accept: 'application/json',
  };
  const endpoints = ['news', 'webkr'] as const;
  let requestCount = 0;

  for (const keyword of SEARCH_KEYWORDS) {
    if (requestCount >= MAX_REQUESTS_PER_SEARCH_SOURCE) break;
    for (const endpoint of endpoints) {
      if (requestCount >= MAX_REQUESTS_PER_SEARCH_SOURCE) break;
      try {
        const url =
          `https://openapi.naver.com/v1/search/${endpoint}` +
          `?query=${encodeURIComponent(keyword)}&display=10&start=1&sort=date`;
        const res = await withTimeout(
          fetch(url, { headers }),
          SOURCE_TIMEOUT_MS,
          `naver-${endpoint}`,
        );
        requestCount++;
        if (!res.ok) {
          const msg = `HTTP ${res.status} (${endpoint}, 키워드: "${keyword}")`;
          logServerError(`[eventUpdater] Naver ${msg}`);
          failures.push({ source: 'Naver 검색', message: msg });
          continue;
        }
        const json = (await res.json()) as {
          items?: Array<{
            title: string;
            description?: string;
            link?: string;
            originallink?: string;
          }>;
        };
        for (const item of json.items ?? []) {
          const result = await normalizeSearchResult(
            item.title,
            item.description ?? '',
            item.link ?? item.originallink ?? null,
            null,
            'Naver 검색',
          );
          if (result.ok) {
            events.push(result.event);
          } else {
            failures.push({ source: 'Naver 검색', message: result.reason, link: result.link, title: result.title });
          }
        }
      } catch (e) {
        const msg = `요청 오류 (${endpoint}, 키워드: "${keyword}"): ${e instanceof Error ? e.message : String(e)}`;
        logServerError(`[eventUpdater] Naver ${msg}`, e);
        failures.push({ source: 'Naver 검색', message: msg });
      }
    }
  }
  return { events, failures };
}

/**
 * Source H (secondary): Daum/Kakao Search API — web + blog endpoints.
 * Requires KAKAO_REST_API_KEY.
 * Missing key → returns empty, no error thrown.
 */
async function fetchDaumSearchEvents(): Promise<SearchFetchResult> {
  const apiKey = process.env.KAKAO_REST_API_KEY;
  if (!apiKey) {
    return { events: [], failures: [] };
  }

  const events: CrawledEvent[] = [];
  const failures: ImportResult['failures'] = [];
  const headers = {
    Authorization: `KakaoAK ${apiKey}`,
    Accept: 'application/json',
  };
  const searchTypes = ['web', 'blog'] as const;
  let requestCount = 0;

  for (const keyword of SEARCH_KEYWORDS) {
    if (requestCount >= MAX_REQUESTS_PER_SEARCH_SOURCE) break;
    for (const searchType of searchTypes) {
      if (requestCount >= MAX_REQUESTS_PER_SEARCH_SOURCE) break;
      try {
        const url =
          `https://dapi.kakao.com/v2/search/${searchType}` +
          `?query=${encodeURIComponent(keyword)}&size=10&sort=recency`;
        const res = await withTimeout(
          fetch(url, { headers }),
          SOURCE_TIMEOUT_MS,
          `daum-${searchType}`,
        );
        requestCount++;
        if (!res.ok) {
          const msg = `HTTP ${res.status} (${searchType}, 키워드: "${keyword}")`;
          logServerError(`[eventUpdater] Daum ${msg}`);
          failures.push({ source: 'Daum 검색', message: msg });
          continue;
        }
        const json = (await res.json()) as {
          documents?: Array<{
            title: string;
            contents?: string;
            url?: string;
            thumbnail?: string;
          }>;
        };
        for (const doc of json.documents ?? []) {
          const result = await normalizeSearchResult(
            doc.title,
            doc.contents ?? '',
            doc.url ?? null,
            doc.thumbnail ?? null,
            'Daum 검색',
          );
          if (result.ok) {
            events.push(result.event);
          } else {
            failures.push({ source: 'Daum 검색', message: result.reason, link: result.link, title: result.title });
          }
        }
      } catch (e) {
        const msg = `요청 오류 (${searchType}, 키워드: "${keyword}"): ${e instanceof Error ? e.message : String(e)}`;
        logServerError(`[eventUpdater] Daum ${msg}`, e);
        failures.push({ source: 'Daum 검색', message: msg });
      }
    }
  }
  return { events, failures };
}

/**
 * Source F (optional/last): Google Custom Search JSON API.
 * Requires GOOGLE_CUSTOM_SEARCH_API_KEY + GOOGLE_CUSTOM_SEARCH_CX.
 * Missing keys → returns empty immediately (disabled).
 * A 403 or PERMISSION_DENIED body sets the module-level flag and skips
 * remaining keywords without adding entries to `failures`.
 */
async function fetchGoogleSearchEvents(): Promise<SearchFetchResult> {
  const apiKey = process.env.GOOGLE_CUSTOM_SEARCH_API_KEY;
  const cx = process.env.GOOGLE_CUSTOM_SEARCH_CX;
  if (!apiKey || !cx) {
    return { events: [], failures: [] };
  }
  if (googlePermissionDenied) {
    return { events: [], failures: [] };
  }

  const events: CrawledEvent[] = [];
  const failures: ImportResult['failures'] = [];
  let requestCount = 0;

  for (const keyword of SEARCH_KEYWORDS) {
    if (requestCount >= MAX_REQUESTS_PER_SEARCH_SOURCE) break;
    if (googlePermissionDenied) break;
    try {
      const url =
        `https://www.googleapis.com/customsearch/v1` +
        `?key=${encodeURIComponent(apiKey)}&cx=${encodeURIComponent(cx)}` +
        `&q=${encodeURIComponent(keyword)}&num=10&lr=lang_ko&gl=kr`;
      const res = await withTimeout(
        fetch(url, { headers: { Accept: 'application/json' } }),
        SOURCE_TIMEOUT_MS,
        'google-cse',
      );
      requestCount++;
      if (res.status === 403) {
        googlePermissionDenied = true;
        console.log('[eventUpdater] Google: permission denied');
        break;
      }
      if (!res.ok) {
        let body = '';
        try { body = await res.text(); } catch { /* ignore */ }
        if (
          body.includes('PERMISSION_DENIED') ||
          body.includes('This project does not have access to Custom Search JSON API')
        ) {
          googlePermissionDenied = true;
          console.log('[eventUpdater] Google: permission denied');
          break;
        }
        const msg = `HTTP ${res.status} (키워드: "${keyword}")`;
        logServerError(`[eventUpdater] Google CSE ${msg}`);
        failures.push({ source: 'Google 검색', message: msg });
        continue;
      }
      const json = (await res.json()) as {
        items?: Array<{
          title: string;
          snippet?: string;
          link?: string;
          pagemap?: { cse_image?: Array<{ src: string }> };
        }>;
      };
      for (const item of json.items ?? []) {
        const image = item.pagemap?.cse_image?.[0]?.src ?? null;
        const result = await normalizeSearchResult(
          item.title,
          item.snippet ?? '',
          item.link ?? null,
          image,
          'Google 검색',
        );
        if (result.ok) {
          events.push(result.event);
        } else {
          failures.push({ source: 'Google 검색', message: result.reason, link: result.link, title: result.title });
        }
      }
    } catch (e) {
      const msg = `요청 오류 (키워드: "${keyword}"): ${e instanceof Error ? e.message : String(e)}`;
      logServerError(`[eventUpdater] Google CSE ${msg}`, e);
      failures.push({ source: 'Google 검색', message: msg });
    }
  }
  return { events, failures };
}

/**
 * Source I (additional): Vertex AI Search (Discovery Engine).
 * Requires a configured data store + service-account credentials.
 *   - VERTEX_AI_SEARCH_PROJECT  : GCP project ID hosting the Discovery Engine data store
 *   - VERTEX_AI_SEARCH_DATASTORE: data store ID (typically a website search data store
 *                                 indexing Korean pet-event sources)
 *   - VERTEX_AI_SEARCH_LOCATION : data store location (default 'global')
 *   - GOOGLE_APPLICATION_CREDENTIALS_JSON | GCP_SERVICE_ACCOUNT_KEY |
 *     GOOGLE_APPLICATION_CREDENTIALS: service account credentials with the
 *     `roles/discoveryengine.viewer` permission.
 *
 * Missing credentials → returns empty (disabled). 403/PERMISSION_DENIED sets the
 * module-level flag and skips the rest of the run, mirroring Google CSE behaviour.
 *
 * Vertex AI Search returns ranked results; we feed each result's title/snippet/link
 * through the same `normalizeSearchResult()` pipeline used for Naver/Daum/Google CSE
 * so date/location extraction and the body-fetch fallback all work identically.
 */
let vertexAuthClientPromise: Promise<{ getAccessToken(): Promise<{ token?: string | null } | string | null> } | null> | null = null;

async function getVertexAccessToken(): Promise<string | null> {
  if (!vertexAuthClientPromise) {
    vertexAuthClientPromise = (async () => {
      try {
        const { GoogleAuth } = await import('google-auth-library');
        const credsJson =
          process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON || process.env.GCP_SERVICE_ACCOUNT_KEY;
        const opts: { scopes: string[]; credentials?: Record<string, unknown> } = {
          scopes: ['https://www.googleapis.com/auth/cloud-platform'],
        };
        if (credsJson) {
          try {
            opts.credentials = JSON.parse(credsJson);
          } catch (e) {
            logServerError('[eventUpdater] Vertex AI Search: 서비스계정 JSON 파싱 실패', e);
            return null;
          }
        }
        const auth = new GoogleAuth(opts);
        return await auth.getClient();
      } catch (e) {
        logServerError('[eventUpdater] Vertex AI Search OAuth 클라이언트 초기화 실패:', e);
        return null;
      }
    })();
  }
  const client = await vertexAuthClientPromise;
  if (!client) return null;
  try {
    const t = await client.getAccessToken();
    if (typeof t === 'string') return t;
    return t?.token ?? null;
  } catch (e) {
    logServerError('[eventUpdater] Vertex AI Search 액세스 토큰 발급 실패:', e);
    return null;
  }
}

interface VertexSearchResult {
  document?: {
    derivedStructData?: {
      title?: string;
      htmlTitle?: string;
      link?: string;
      snippets?: Array<{ snippet?: string; htmlSnippet?: string }>;
      displayLink?: string;
      pagemap?: { cse_image?: Array<{ src: string }>; metatags?: Array<Record<string, string>> };
    };
    structData?: {
      title?: string;
      description?: string;
      link?: string;
      url?: string;
      imageUrl?: string;
    };
  };
}

async function fetchVertexAiSearchEvents(): Promise<SearchFetchResult> {
  const project = process.env.VERTEX_AI_SEARCH_PROJECT;
  const dataStore = process.env.VERTEX_AI_SEARCH_DATASTORE;
  const location = process.env.VERTEX_AI_SEARCH_LOCATION || 'global';
  if (!project || !dataStore) return { events: [], failures: [] };
  if (vertexPermissionDenied) return { events: [], failures: [] };

  const token = await getVertexAccessToken();
  if (!token) return { events: [], failures: [] };

  const events: CrawledEvent[] = [];
  const failures: ImportResult['failures'] = [];
  const url =
    `https://discoveryengine.googleapis.com/v1/projects/${encodeURIComponent(project)}` +
    `/locations/${encodeURIComponent(location)}` +
    `/collections/default_collection/dataStores/${encodeURIComponent(dataStore)}` +
    `/servingConfigs/default_search:search`;
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  let requestCount = 0;

  for (const keyword of SEARCH_KEYWORDS) {
    if (requestCount >= MAX_REQUESTS_PER_SEARCH_SOURCE) break;
    if (vertexPermissionDenied) break;
    try {
      const res = await withTimeout(
        fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            query: keyword,
            pageSize: 10,
            contentSearchSpec: {
              snippetSpec: { returnSnippet: true },
            },
          }),
        }),
        SOURCE_TIMEOUT_MS,
        'vertex-ai-search',
      );
      requestCount++;
      if (res.status === 403) {
        vertexPermissionDenied = true;
        console.log('[eventUpdater] Vertex AI Search: permission denied');
        break;
      }
      if (!res.ok) {
        let body = '';
        try { body = await res.text(); } catch { /* ignore */ }
        if (body.includes('PERMISSION_DENIED')) {
          vertexPermissionDenied = true;
          console.log('[eventUpdater] Vertex AI Search: permission denied');
          break;
        }
        const msg = `HTTP ${res.status} (키워드: "${keyword}")`;
        logServerError(`[eventUpdater] Vertex AI Search ${msg}`);
        failures.push({ source: 'Vertex AI Search', message: msg });
        continue;
      }
      const json = (await res.json()) as { results?: VertexSearchResult[] };
      for (const r of json.results ?? []) {
        const dsd = r.document?.derivedStructData;
        const sd = r.document?.structData;
        const title = (sd?.title || dsd?.title || dsd?.htmlTitle || '').trim();
        const snippet =
          sd?.description ||
          (dsd?.snippets ?? [])
            .map((s) => s.snippet ?? s.htmlSnippet ?? '')
            .filter(Boolean)
            .join(' ') ||
          '';
        const link = sd?.link || sd?.url || dsd?.link || null;
        const image = sd?.imageUrl || dsd?.pagemap?.cse_image?.[0]?.src || null;
        if (!title) continue;
        const result = await normalizeSearchResult(
          title,
          snippet,
          link,
          image,
          'Vertex AI Search',
        );
        if (result.ok) {
          events.push(result.event);
        } else {
          failures.push({
            source: 'Vertex AI Search',
            message: result.reason,
            link: result.link,
            title: result.title,
          });
        }
      }
    } catch (e) {
      const msg = `요청 오류 (키워드: "${keyword}"): ${e instanceof Error ? e.message : String(e)}`;
      logServerError(`[eventUpdater] Vertex AI Search ${msg}`, e);
      failures.push({ source: 'Vertex AI Search', message: msg });
    }
  }
  return { events, failures };
}

/** Sources that return simple CrawledEvent[]; any thrown error is caught by runImport. */
const SIMPLE_SOURCES: Array<{ name: string; fn: () => Promise<CrawledEvent[]> }> = [
  { name: 'VisitKorea(축제)', fn: fetchVisitKoreaFestivals },
  { name: 'VisitKorea(키워드)', fn: fetchVisitKoreaPetKeyword },
  { name: '케이펫페어 공식', fn: fetchKpetfairOfficial },
  { name: '동물보호관리시스템', fn: fetchAnimalProtectEvents },
  { name: '서울 열린데이터광장(문화행사)', fn: fetchSeoulPetCulturalEvents },
];

/**
 * Search-engine sources: Naver (primary), Kakao (secondary), Google (optional/last).
 * Each provider is isolated — one failure never aborts the others.
 */
const SEARCH_SOURCES: Array<{ name: string; fn: () => Promise<SearchFetchResult> }> = [
  { name: 'Naver 검색', fn: fetchNaverSearchEvents },
  { name: 'Daum 검색', fn: fetchDaumSearchEvents },
  { name: 'Google 검색', fn: fetchGoogleSearchEvents },
  { name: 'Vertex AI Search', fn: fetchVertexAiSearchEvents },
];

async function notifyAdminsOnFailure(failures: ImportResult['failures']): Promise<void> {
  if (failures.length === 0) return;
  try {
    if (typeof storage.getAllUsers !== 'function') return;
    const users = (await storage.getAllUsers()) as AdminLike[];
    const admins = users.filter((u): u is AdminLike => !!u && u.role === 'admin' && typeof u.id === 'number');
    const summary = failures.map((f) => `${f.source}: ${f.message}`).join(' / ');
    for (const admin of admins) {
      const payload: NotificationData = {
        userId: admin.id,
        type: 'system',
        title: '반려견 행사 자동 수집 일부 실패',
        message: summary.slice(0, 300),
        actionUrl: '/admin/pet-events',
      };
      await notificationService.sendNotification(payload);
    }
  } catch (e) {
    logServerError('[eventUpdater] 관리자 알림 발송 실패:', e);
  }
}

const HISTORY_MAX = 100;
// 정리 정책 (관리자 운영 가이드):
//  - HISTORY_RETENTION_DAYS: 수집 실행(run) 자체를 보관하는 최대 기간. 이 기간을 넘긴
//    `petEventImportRuns` 행은 통째로 삭제되며, 자식 `petEventImportFailureResolutions`
//    행도 ON DELETE CASCADE 로 함께 사라진다.
//  - RESOLVED_RETENTION_DAYS: run 자체는 아직 살아 있어도, "처리(resolved)" 또는
//    "숨김(dismissed)" 으로 마킹된 실패 후보는 이 기간이 지나면 정리된다.
//    failuresJson 의 해당 인덱스 위치는 톰스톤(`__pruned`) 으로 치환되어 다른 미처리
//    후보의 idx 매핑이 깨지지 않으면서, 검토 화면/카운트에서는 자동 제외된다.
//  - CLEANUP_INTERVAL_MS: 부팅 직후 1회 + 24시간 주기로 위 두 정리 작업을 함께 실행한다.
const HISTORY_RETENTION_DAYS = 90;
const RESOLVED_RETENTION_DAYS = 90;
const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000;

export class EventUpdaterService {
  private updateTimer: NodeJS.Timeout | null = null;
  private cleanupTimer: NodeJS.Timeout | null = null;
  private running = false;
  private lastResult: ImportResult | null = null;
  private started = false;

  /** 매일 03:00 KST 실행 스케줄 시작 (idempotent) */
  public startScheduler(): void {
    if (this.started) return;
    this.started = true;

    const scheduleNext = () => {
      const now = new Date();
      const kstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
      const next = new Date(kstNow);
      next.setUTCHours(RUN_HOUR_KST, 0, 0, 0);
      if (next.getTime() <= kstNow.getTime()) {
        next.setUTCDate(next.getUTCDate() + 1);
      }
      const delay = next.getTime() - kstNow.getTime();
      this.updateTimer = setTimeout(async () => {
        try {
          await this.runImport();
        } catch (e) {
          logServerError('[eventUpdater] 스케줄 실행 오류:', e);
        }
        scheduleNext();
      }, delay);
    };

    scheduleNext();

    // 90일 이상 이력 정리: 부팅 직후 1회 + 24시간 주기.
    void this.cleanupOldHistory();
    this.cleanupTimer = setInterval(() => {
      void this.cleanupOldHistory();
    }, CLEANUP_INTERVAL_MS);

    // 마지막 실행 결과를 DB에서 복원.
    void this.restoreLastResult();

    console.log('✅ [eventUpdater] 행사 자동 수집 스케줄러 시작 (매일 03:00 KST)');
    logProviderStatuses();
  }

  public stopScheduler(): void {
    if (this.updateTimer) {
      clearTimeout(this.updateTimer);
      this.updateTimer = null;
    }
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.started = false;
  }

  public getLastResult(): ImportResult | null {
    return this.lastResult;
  }

  public async getHistory(limit = HISTORY_MAX): Promise<ImportResult[]> {
    const n = Math.max(1, Math.min(HISTORY_MAX, limit));
    try {
      const rows = await storage.listPetEventImportRuns(n);
      return rows.map((r) => ({
        runId: r.id,
        startedAt: r.startedAt.toISOString(),
        finishedAt: r.finishedAt.toISOString(),
        durationMs: r.durationMs,
        fetched: r.fetched,
        created: r.created,
        duplicates: r.duplicates,
        failures: (Array.isArray(r.failuresJson) ? r.failuresJson : []).filter((f) => f?.source !== '__pruned'),
        bySource: Array.isArray(r.bySourceJson) ? r.bySourceJson : [],
        bodyFetch: { ...emptyBodyFetchStats(), ...(r.bodyFetchJson ?? {}) },
      }));
    } catch (e) {
      logServerError('[eventUpdater] 이력 조회 실패:', e);
      return [];
    }
  }

  /**
   * 최근 N개 실행에서 발생한 실패 후보를 처리 상태와 함께 반환.
   * 'open' / 'resolved' / 'dismissed' 상태가 머지되어 클라이언트가 필터링할 수 있다.
   */
  public async getFailureCandidates(limit = 20): Promise<FailureCandidate[]> {
    const n = Math.max(1, Math.min(HISTORY_MAX, limit));
    try {
      const rows = await storage.listPetEventImportRuns(n);
      const runIds = rows.map((r) => r.id);
      const resolutions = await storage.listPetEventImportFailureResolutions(runIds);
      const resMap = new Map<string, typeof resolutions[number]>();
      for (const r of resolutions) resMap.set(`${r.runId}:${r.idx}`, r);

      const out: FailureCandidate[] = [];
      for (const run of rows) {
        const failures = Array.isArray(run.failuresJson) ? run.failuresJson : [];
        failures.forEach((f, idx) => {
          // 보존 기간 경과로 정리된 톰스톤 항목은 노출하지 않는다.
          if (f?.source === '__pruned') return;
          const res = resMap.get(`${run.id}:${idx}`);
          out.push({
            runId: run.id,
            idx,
            runStartedAt: run.startedAt.toISOString(),
            source: f.source,
            message: f.message,
            link: f.link ?? null,
            title: f.title ?? null,
            status: (res?.status as 'resolved' | 'dismissed' | undefined) ?? 'open',
            resolvedEventId: res?.resolvedEventId ?? null,
            note: res?.note ?? null,
            resolvedAt: res ? res.createdAt.toISOString() : null,
          });
        });
      }
      return out;
    } catch (e) {
      logServerError('[eventUpdater] 실패 후보 조회 실패:', e);
      return [];
    }
  }

  private async restoreLastResult(): Promise<void> {
    try {
      const rows = await storage.listPetEventImportRuns(1);
      if (rows.length === 0) return;
      const r = rows[0];
      this.lastResult = {
        runId: r.id,
        startedAt: r.startedAt.toISOString(),
        finishedAt: r.finishedAt.toISOString(),
        durationMs: r.durationMs,
        fetched: r.fetched,
        created: r.created,
        duplicates: r.duplicates,
        failures: (Array.isArray(r.failuresJson) ? r.failuresJson : []).filter((f) => f?.source !== '__pruned'),
        bySource: Array.isArray(r.bySourceJson) ? r.bySourceJson : [],
        bodyFetch: { ...emptyBodyFetchStats(), ...(r.bodyFetchJson ?? {}) },
      };
    } catch (e) {
      logServerError('[eventUpdater] 마지막 결과 복원 실패:', e);
    }
  }

  private async cleanupOldHistory(): Promise<void> {
    try {
      const cutoff = new Date(Date.now() - HISTORY_RETENTION_DAYS * 24 * 60 * 60 * 1000);
      const removed = await storage.deletePetEventImportRunsOlderThan(cutoff);
      if (removed > 0) {
        console.log(`[eventUpdater] ${HISTORY_RETENTION_DAYS}일 초과 이력 ${removed}건 정리`);
      }
    } catch (e) {
      logServerError('[eventUpdater] 이력 정리 실패:', e);
    }
    try {
      const resolvedCutoff = new Date(Date.now() - RESOLVED_RETENTION_DAYS * 24 * 60 * 60 * 1000);
      const pruned = await storage.pruneResolvedPetEventImportFailures(resolvedCutoff);
      if (pruned > 0) {
        console.log(`[eventUpdater] ${RESOLVED_RETENTION_DAYS}일 초과 처리/숨김 후보 ${pruned}건 정리`);
      }
    } catch (e) {
      logServerError('[eventUpdater] 처리/숨김 후보 정리 실패:', e);
    }
  }

  public isRunning(): boolean {
    return this.running;
  }

  /** 수동/스케줄 단일 실행. 동시 실행 방지. */
  public async runImport(): Promise<ImportResult> {
    if (this.running) {
      throw new Error('이미 실행 중입니다.');
    }
    this.running = true;
    resetRunFlags();
    try {
      const limits = storage.getBodyFetchSettings();
      setBodyFetchLimits({ perRunMax: limits.perRunMax, perHostMax: limits.perHostMax });
    } catch {
      // 설정 로드 실패 시 기본값 유지
    }
    const startedAt = new Date();
    const failures: ImportResult['failures'] = [];
    let fetched = 0;
    let created = 0;
    let duplicates = 0;

    console.log('[eventUpdater] 수집 시작 — 공급자 상태:');
    logProviderStatuses();

    const sourceStats = new Map<string, SourceStat>();
    const ensureStat = (name: string): SourceStat => {
      let s = sourceStats.get(name);
      if (!s) {
        s = { source: name, fetched: 0, created: 0, duplicates: 0, failures: 0 };
        sourceStats.set(name, s);
      }
      return s;
    };
    const recordFailure = (source: string, message: string) => {
      failures.push({ source, message });
      ensureStat(source).failures++;
    };

    try {
      const collected: CrawledEvent[] = [];

      // Simple sources: throw on failure → caught here and recorded.
      for (const source of SIMPLE_SOURCES) {
        ensureStat(source.name);
        try {
          const items = await source.fn();
          fetched += items.length;
          ensureStat(source.name).fetched += items.length;
          collected.push(...items);
        } catch (e) {
          const message = e instanceof Error ? e.message : String(e);
          recordFailure(source.name, message);
          logServerError(`[eventUpdater] 소스 ${source.name} 수집 실패:`, e);
        }
      }

      // Search-engine sources: return structured { events, failures }.
      // Per-item normalization failures are included in the returned failures array.
      for (const source of SEARCH_SOURCES) {
        ensureStat(source.name);
        try {
          const result = await source.fn();
          fetched += result.events.length;
          ensureStat(source.name).fetched += result.events.length;
          collected.push(...result.events);
          for (const f of result.failures) {
            recordFailure(f.source || source.name, f.message);
          }
        } catch (e) {
          const message = e instanceof Error ? e.message : String(e);
          recordFailure(source.name, message);
          logServerError(`[eventUpdater] 소스 ${source.name} 수집 실패:`, e);
        }
      }

      const existing: PetEvent[] = await storage.listPetEvents({});
      const existingKeys = new Set<string>(
        existing.map((e) => dedupeKey(e.title, new Date(e.startDate), e.location))
      );

      const batchKeys = new Set<string>();
      for (const ev of collected) {
        const key = dedupeKey(ev.title, ev.startDate, ev.location);
        if (existingKeys.has(key) || batchKeys.has(key)) {
          duplicates++;
          ensureStat(ev.source).duplicates++;
          continue;
        }
        batchKeys.add(key);
        try {
          const payload: InsertPetEvent = {
            title: ev.title,
            description: ev.description,
            startDate: ev.startDate,
            endDate: ev.endDate,
            location: ev.location,
            lat: ev.lat,
            lng: ev.lng,
            category: ev.category,
            imageUrl: ev.imageUrl,
            websiteUrl: ev.websiteUrl,
            source: ev.source,
            // 검수 전이므로 비활성으로 저장 → 관리자가 토글로 공개
            isActive: false,
          };
          await storage.createPetEvent(payload);
          created++;
          ensureStat(ev.source).created++;
        } catch (e) {
          const message = e instanceof Error ? e.message : String(e);
          recordFailure(ev.source, `저장 실패: ${message}`);
          logServerError('[eventUpdater] 행사 저장 실패:', e);
        }
      }
    } finally {
      this.running = false;
    }

    const finishedAt = new Date();
    const bySource = Array.from(sourceStats.values()).sort((a, b) => a.source.localeCompare(b.source, 'ko'));
    const bodyFetch = getBodyFetchStatsSnapshot();
    const result: ImportResult = {
      startedAt: startedAt.toISOString(),
      finishedAt: finishedAt.toISOString(),
      durationMs: finishedAt.getTime() - startedAt.getTime(),
      fetched,
      created,
      duplicates,
      failures,
      bySource,
      bodyFetch,
    };
    try {
      const saved = await storage.createPetEventImportRun({
        startedAt,
        finishedAt,
        durationMs: result.durationMs,
        fetched: result.fetched,
        created: result.created,
        duplicates: result.duplicates,
        failuresJson: result.failures,
        bySourceJson: result.bySource,
        bodyFetchJson: result.bodyFetch,
      });
      result.runId = saved.id;
    } catch (e) {
      logServerError('[eventUpdater] 이력 저장 실패:', e);
    }
    this.lastResult = result;

    console.log(
      `[eventUpdater] 완료: 수집 ${fetched} / 신규 ${created} / 중복 ${duplicates} / 실패 ${failures.length} ` +
      `/ 본문 페치 ${bodyFetch.attempted}건(성공 ${bodyFetch.succeeded}, 구조 ${bodyFetch.rescued}, robots ${bodyFetch.robotsBlocked}, HTTP ${bodyFetch.httpErrors}, 한도 ${bodyFetch.limitExceeded}) (${result.durationMs}ms)`
    );

    if (failures.length > 0) {
      void notifyAdminsOnFailure(failures);
    }

    return result;
  }
}

export const eventUpdater = new EventUpdaterService();
