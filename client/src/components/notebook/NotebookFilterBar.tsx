import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSearch, useLocation } from 'wouter';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, X, RotateCcw } from 'lucide-react';

export interface NotebookFilters {
  q: string;
  petId: string;
  from: string;
  to: string;
  category: string;
  unreadOnly: boolean;
}

export const EMPTY_FILTERS: NotebookFilters = {
  q: '',
  petId: 'all',
  from: '',
  to: '',
  category: 'all',
  unreadOnly: false,
};

export interface PetOption {
  id: string | number;
  name: string;
}

interface Props {
  filters: NotebookFilters;
  onChange: (next: NotebookFilters) => void;
  pets?: PetOption[];
  categories?: string[];
  basePath?: string; // 라우트 경로 (URL 파라미터 동기화용). 미지정 시 현재 경로 유지
  hideUnread?: boolean;
  className?: string;
}

const DEFAULT_CATEGORIES = ['기본훈련', '행동교정', '사회화', '건강관리', '식습관', '기타'];

function parseFiltersFromSearch(search: string): Partial<NotebookFilters> {
  const params = new URLSearchParams(search);
  const out: Partial<NotebookFilters> = {};
  if (params.get('q')) out.q = params.get('q') || '';
  if (params.get('petId')) out.petId = params.get('petId') || 'all';
  if (params.get('from')) out.from = params.get('from') || '';
  if (params.get('to')) out.to = params.get('to') || '';
  if (params.get('category')) out.category = params.get('category') || 'all';
  if (params.get('unreadOnly')) out.unreadOnly = params.get('unreadOnly') === 'true';
  return out;
}

export function buildFilterSearchString(f: NotebookFilters): string {
  const params = new URLSearchParams();
  if (f.q && f.q.trim()) params.set('q', f.q.trim());
  if (f.petId && f.petId !== 'all') params.set('petId', String(f.petId));
  if (f.from) params.set('from', f.from);
  if (f.to) params.set('to', f.to);
  if (f.category && f.category !== 'all') params.set('category', f.category);
  if (f.unreadOnly) params.set('unreadOnly', 'true');
  const s = params.toString();
  return s ? `?${s}` : '';
}

export function filtersToApiParams(f: NotebookFilters): Record<string, string> {
  const out: Record<string, string> = {};
  if (f.q && f.q.trim()) out.q = f.q.trim();
  if (f.petId && f.petId !== 'all') out.petId = String(f.petId);
  if (f.from) out.from = f.from;
  if (f.to) out.to = f.to;
  if (f.category && f.category !== 'all') out.category = f.category;
  if (f.unreadOnly) out.unreadOnly = 'true';
  return out;
}

export function hasActiveFilters(f: NotebookFilters): boolean {
  return !!(
    (f.q && f.q.trim()) ||
    (f.petId && f.petId !== 'all') ||
    f.from ||
    f.to ||
    (f.category && f.category !== 'all') ||
    f.unreadOnly
  );
}

/**
 * 알림장 검색·필터 바 (훈련사/보호자 공용 - Task #93).
 * - 키워드 입력은 300ms 디바운스 후 onChange 트리거
 * - URL 쿼리 파라미터(q, petId, from, to, category, unreadOnly)와 양방향 동기화
 */
export function NotebookFilterBar({
  filters,
  onChange,
  pets = [],
  categories = DEFAULT_CATEGORIES,
  basePath,
  hideUnread = false,
  className,
}: Props) {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const [keyword, setKeyword] = useState(filters.q);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastUrlSyncRef = useRef<string>('');

  // 외부 filters.q 변경 시 입력값 동기화
  useEffect(() => {
    setKeyword(filters.q);
  }, [filters.q]);

  // 최초 마운트 + URL 변화 시 → 필터 복원
  useEffect(() => {
    if (lastUrlSyncRef.current === search) return;
    lastUrlSyncRef.current = search;
    const fromUrl = parseFiltersFromSearch(search);
    if (Object.keys(fromUrl).length > 0) {
      onChange({ ...EMPTY_FILTERS, ...filters, ...fromUrl });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  // 필터 변경 시 → URL 동기화 (replace)
  useEffect(() => {
    const desired = buildFilterSearchString(filters);
    if (lastUrlSyncRef.current === desired) return;
    lastUrlSyncRef.current = desired;
    if (typeof window !== 'undefined') {
      const path = basePath || window.location.pathname;
      setLocation(path + desired, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.q, filters.petId, filters.from, filters.to, filters.category, filters.unreadOnly]);

  const debouncedKeywordChange = (value: string) => {
    setKeyword(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onChange({ ...filters, q: value });
    }, 300);
  };

  const reset = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setKeyword('');
    onChange({ ...EMPTY_FILTERS });
  };

  const active = hasActiveFilters(filters);

  const chips = useMemo(() => {
    const list: { key: keyof NotebookFilters; label: string; clear: () => void }[] = [];
    if (filters.q && filters.q.trim()) {
      list.push({ key: 'q', label: `키워드: "${filters.q}"`, clear: () => { setKeyword(''); onChange({ ...filters, q: '' }); } });
    }
    if (filters.petId && filters.petId !== 'all') {
      const pet = pets.find((p) => String(p.id) === String(filters.petId));
      list.push({ key: 'petId', label: `반려동물: ${pet?.name || filters.petId}`, clear: () => onChange({ ...filters, petId: 'all' }) });
    }
    if (filters.from) {
      list.push({ key: 'from', label: `시작: ${filters.from}`, clear: () => onChange({ ...filters, from: '' }) });
    }
    if (filters.to) {
      list.push({ key: 'to', label: `종료: ${filters.to}`, clear: () => onChange({ ...filters, to: '' }) });
    }
    if (filters.category && filters.category !== 'all') {
      list.push({ key: 'category', label: `분류: ${filters.category}`, clear: () => onChange({ ...filters, category: 'all' }) });
    }
    if (filters.unreadOnly) {
      list.push({ key: 'unreadOnly', label: '미읽음만', clear: () => onChange({ ...filters, unreadOnly: false }) });
    }
    return list;
  }, [filters, pets, onChange]);

  return (
    <Card className={className} data-testid="notebook-filter-bar">
      <CardContent className="p-4 space-y-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:flex-wrap">
          {/* 키워드 검색 */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="제목·내용 검색"
              value={keyword}
              onChange={(e) => debouncedKeywordChange(e.target.value)}
              className="pl-10"
              aria-label="알림장 키워드 검색"
              data-testid="input-notebook-search"
            />
          </div>

          {/* 반려동물 */}
          {pets.length > 0 && (
            <div className="min-w-[160px]">
              <Label className="text-xs text-gray-500 mb-1 block">반려동물</Label>
              <Select
                value={filters.petId || 'all'}
                onValueChange={(v) => onChange({ ...filters, petId: v })}
              >
                <SelectTrigger data-testid="select-notebook-pet">
                  <SelectValue placeholder="전체" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  {pets.map((p) => (
                    <SelectItem key={String(p.id)} value={String(p.id)}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* 분류 */}
          <div className="min-w-[140px]">
            <Label className="text-xs text-gray-500 mb-1 block">분류</Label>
            <Select
              value={filters.category || 'all'}
              onValueChange={(v) => onChange({ ...filters, category: v })}
            >
              <SelectTrigger data-testid="select-notebook-category">
                <SelectValue placeholder="전체" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 기간 */}
          <div>
            <Label className="text-xs text-gray-500 mb-1 block">시작일</Label>
            <Input
              type="date"
              value={filters.from}
              onChange={(e) => onChange({ ...filters, from: e.target.value })}
              className="w-[150px]"
              data-testid="input-notebook-from"
            />
          </div>
          <div>
            <Label className="text-xs text-gray-500 mb-1 block">종료일</Label>
            <Input
              type="date"
              value={filters.to}
              onChange={(e) => onChange({ ...filters, to: e.target.value })}
              className="w-[150px]"
              data-testid="input-notebook-to"
            />
          </div>

          {/* 미읽음만 */}
          {!hideUnread && (
            <div className="flex items-center gap-2 pb-1">
              <Switch
                id="notebook-unread-only"
                checked={filters.unreadOnly}
                onCheckedChange={(v) => onChange({ ...filters, unreadOnly: !!v })}
                data-testid="switch-notebook-unread"
              />
              <Label htmlFor="notebook-unread-only" className="text-sm cursor-pointer">
                미읽음만
              </Label>
            </div>
          )}

          {/* 초기화 */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={reset}
            disabled={!active}
            data-testid="button-notebook-filter-reset"
          >
            <RotateCcw className="h-4 w-4 mr-1" />
            초기화
          </Button>
        </div>

        {/* 활성 필터 칩 */}
        {chips.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1" data-testid="notebook-filter-chips">
            {chips.map((chip) => (
              <Badge
                key={chip.key}
                variant="secondary"
                className="flex items-center gap-1 pr-1"
                data-testid={`chip-notebook-${chip.key}`}
              >
                <span>{chip.label}</span>
                <button
                  type="button"
                  onClick={chip.clear}
                  className="ml-1 rounded-sm hover:bg-gray-300/40 p-0.5"
                  aria-label={`${chip.label} 제거`}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default NotebookFilterBar;
