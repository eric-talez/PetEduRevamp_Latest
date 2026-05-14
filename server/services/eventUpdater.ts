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

export interface ImportResult {
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  fetched: number;
  created: number;
  duplicates: number;
  failures: Array<{ source: string; message: string }>;
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

const SOURCES: Array<{ name: string; fn: () => Promise<CrawledEvent[]> }> = [
  { name: 'VisitKorea(축제)', fn: fetchVisitKoreaFestivals },
  { name: 'VisitKorea(키워드)', fn: fetchVisitKoreaPetKeyword },
  { name: '케이펫페어 공식', fn: fetchKpetfairOfficial },
  { name: '동물보호관리시스템', fn: fetchAnimalProtectEvents },
  { name: '서울 열린데이터광장(문화행사)', fn: fetchSeoulPetCulturalEvents },
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
const HISTORY_RETENTION_DAYS = 90;
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
        startedAt: r.startedAt.toISOString(),
        finishedAt: r.finishedAt.toISOString(),
        durationMs: r.durationMs,
        fetched: r.fetched,
        created: r.created,
        duplicates: r.duplicates,
        failures: Array.isArray(r.failuresJson) ? r.failuresJson : [],
      }));
    } catch (e) {
      logServerError('[eventUpdater] 이력 조회 실패:', e);
      return [];
    }
  }

  private async restoreLastResult(): Promise<void> {
    try {
      const rows = await storage.listPetEventImportRuns(1);
      if (rows.length === 0) return;
      const r = rows[0];
      this.lastResult = {
        startedAt: r.startedAt.toISOString(),
        finishedAt: r.finishedAt.toISOString(),
        durationMs: r.durationMs,
        fetched: r.fetched,
        created: r.created,
        duplicates: r.duplicates,
        failures: Array.isArray(r.failuresJson) ? r.failuresJson : [],
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
        console.log(`[eventUpdater] 90일 초과 이력 ${removed}건 정리`);
      }
    } catch (e) {
      logServerError('[eventUpdater] 이력 정리 실패:', e);
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
    const startedAt = new Date();
    const failures: ImportResult['failures'] = [];
    let fetched = 0;
    let created = 0;
    let duplicates = 0;

    try {
      const collected: CrawledEvent[] = [];
      for (const source of SOURCES) {
        try {
          const items = await source.fn();
          fetched += items.length;
          collected.push(...items);
        } catch (e) {
          const message = e instanceof Error ? e.message : String(e);
          failures.push({ source: source.name, message });
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
        } catch (e) {
          const message = e instanceof Error ? e.message : String(e);
          failures.push({ source: ev.source, message: `저장 실패: ${message}` });
          logServerError('[eventUpdater] 행사 저장 실패:', e);
        }
      }
    } finally {
      this.running = false;
    }

    const finishedAt = new Date();
    const result: ImportResult = {
      startedAt: startedAt.toISOString(),
      finishedAt: finishedAt.toISOString(),
      durationMs: finishedAt.getTime() - startedAt.getTime(),
      fetched,
      created,
      duplicates,
      failures,
    };
    this.lastResult = result;
    try {
      await storage.createPetEventImportRun({
        startedAt,
        finishedAt,
        durationMs: result.durationMs,
        fetched: result.fetched,
        created: result.created,
        duplicates: result.duplicates,
        failuresJson: result.failures,
      });
    } catch (e) {
      logServerError('[eventUpdater] 이력 저장 실패:', e);
    }

    console.log(
      `[eventUpdater] 완료: 수집 ${fetched} / 신규 ${created} / 중복 ${duplicates} / 실패 ${failures.length} (${result.durationMs}ms)`
    );

    if (failures.length > 0) {
      void notifyAdminsOnFailure(failures);
    }

    return result;
  }
}

export const eventUpdater = new EventUpdaterService();
