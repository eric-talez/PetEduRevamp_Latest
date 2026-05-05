import React, { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

export const NOTEBOOK_PAGE_SIZE_OPTIONS = [20, 50, 100] as const;
export type NotebookPageSize = (typeof NOTEBOOK_PAGE_SIZE_OPTIONS)[number];

export function isNotebookPageSize(value: number): value is NotebookPageSize {
  return (NOTEBOOK_PAGE_SIZE_OPTIONS as readonly number[]).includes(value);
}

export function parseNotebookPageSize(
  raw: string | null | undefined,
  fallback: NotebookPageSize = 20,
): NotebookPageSize {
  const n = Number(raw);
  if (Number.isFinite(n) && isNotebookPageSize(n)) return n;
  return fallback;
}

function buildPageItems(current: number, total: number): Array<number | 'ellipsis-l' | 'ellipsis-r'> {
  const pages: Array<number | 'ellipsis-l' | 'ellipsis-r'> = [];
  if (total <= 7) {
    for (let i = 1; i <= total; i++) pages.push(i);
    return pages;
  }
  const left = Math.max(2, current - 1);
  const right = Math.min(total - 1, current + 1);
  pages.push(1);
  if (left > 2) pages.push('ellipsis-l');
  for (let i = left; i <= right; i++) pages.push(i);
  if (right < total - 1) pages.push('ellipsis-r');
  pages.push(total);
  return pages;
}

interface NotebookPaginationProps {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  isLoading?: boolean;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: NotebookPageSize) => void;
  testIdPrefix: string;
}

export function NotebookPagination({
  page,
  totalPages,
  total,
  limit,
  isLoading,
  onPageChange,
  onLimitChange,
  testIdPrefix,
}: NotebookPaginationProps) {
  const safeTotalPages = Math.max(1, totalPages || 1);
  const safePage = Math.min(Math.max(1, page), safeTotalPages);
  const startItem = total === 0 ? 0 : (safePage - 1) * limit + 1;
  const endItem = Math.min(safePage * limit, total);

  const pageItems = useMemo(() => buildPageItems(safePage, safeTotalPages), [safePage, safeTotalPages]);

  return (
    <div
      className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
      data-testid={`${testIdPrefix}-pagination`}
    >
      <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
        <span>
          전체 {total}개{total > 0 ? ` 중 ${startItem}–${endItem}` : ''}
        </span>
        <div className="flex items-center gap-1.5">
          <span className="whitespace-nowrap">페이지당</span>
          <Select
            value={String(limit)}
            onValueChange={(v) => {
              const next = Number(v);
              if (isNotebookPageSize(next)) onLimitChange(next);
            }}
            disabled={isLoading}
          >
            <SelectTrigger
              className="h-8 w-20"
              data-testid={`${testIdPrefix}-page-size-trigger`}
              aria-label="페이지당 표시 개수"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {NOTEBOOK_PAGE_SIZE_OPTIONS.map((opt) => (
                <SelectItem
                  key={opt}
                  value={String(opt)}
                  data-testid={`${testIdPrefix}-page-size-${opt}`}
                >
                  {opt}개
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1 overflow-x-auto sm:justify-end">
        <Button
          variant="outline"
          size="sm"
          className="h-8 px-2"
          disabled={safePage <= 1 || isLoading}
          onClick={() => onPageChange(Math.max(1, safePage - 1))}
          data-testid={`button-${testIdPrefix}-prev`}
          aria-label="이전 페이지"
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="ml-1 hidden sm:inline">이전</span>
        </Button>

        {pageItems.map((item, idx) => {
          if (item === 'ellipsis-l' || item === 'ellipsis-r') {
            return (
              <span
                key={`${item}-${idx}`}
                className="flex h-8 w-8 items-center justify-center text-gray-400"
                aria-hidden
              >
                <MoreHorizontal className="h-4 w-4" />
              </span>
            );
          }
          const isActive = item === safePage;
          return (
            <Button
              key={item}
              variant={isActive ? 'default' : 'outline'}
              size="sm"
              className={cn('h-8 min-w-8 px-2 tabular-nums', isActive && 'pointer-events-none')}
              onClick={() => onPageChange(item)}
              disabled={isLoading}
              aria-current={isActive ? 'page' : undefined}
              aria-label={`${item} 페이지로 이동`}
              data-testid={`button-${testIdPrefix}-page-${item}`}
            >
              {item}
            </Button>
          );
        })}

        <Button
          variant="outline"
          size="sm"
          className="h-8 px-2"
          disabled={safePage >= safeTotalPages || isLoading}
          onClick={() => onPageChange(Math.min(safeTotalPages, safePage + 1))}
          data-testid={`button-${testIdPrefix}-next`}
          aria-label="다음 페이지"
        >
          <span className="mr-1 hidden sm:inline">다음</span>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
