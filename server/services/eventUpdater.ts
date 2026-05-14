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

const SOURCES: Array<{ name: string; fn: () => Promise<CrawledEvent[]> }> = [
  { name: 'VisitKorea(축제)', fn: fetchVisitKoreaFestivals },
  { name: 'VisitKorea(키워드)', fn: fetchVisitKoreaPetKeyword },
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

export class EventUpdaterService {
  private updateTimer: NodeJS.Timeout | null = null;
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
    console.log('✅ [eventUpdater] 행사 자동 수집 스케줄러 시작 (매일 03:00 KST)');
  }

  public stopScheduler(): void {
    if (this.updateTimer) {
      clearTimeout(this.updateTimer);
      this.updateTimer = null;
    }
    this.started = false;
  }

  public getLastResult(): ImportResult | null {
    return this.lastResult;
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
