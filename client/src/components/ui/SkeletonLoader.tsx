import React from 'react';
import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
  circle?: boolean;
  width?: string | number;
  height?: string | number;
}

/**
 * 기본 스켈레톤 컴포넌트
 * 
 * 콘텐츠 로딩 중에 표시되는 스켈레톤 UI 요소입니다.
 * 다양한 형태와 크기로 조정 가능합니다.
 */
export const Skeleton: React.FC<SkeletonProps> = ({
  className,
  circle = false,
  width,
  height,
}) => {
  return (
    <div
      className={cn(
        'animate-pulse bg-muted rounded-md',
        circle && 'rounded-full',
        className
      )}
      style={{
        width: width !== undefined ? (typeof width === 'number' ? `${width}px` : width) : undefined,
        height: height !== undefined ? (typeof height === 'number' ? `${height}px` : height) : undefined,
      }}
      aria-hidden="true"
      role="presentation"
    />
  );
};

interface SkeletonTextProps {
  lines?: number;
  width?: string | (string | number)[];
  className?: string;
  lineClassName?: string;
}

/**
 * 텍스트 스켈레톤 컴포넌트
 * 
 * 여러 줄의 텍스트 콘텐츠를 로딩 중에 표시하는 스켈레톤 UI입니다.
 * 각 줄의 너비를 개별적으로 조정할 수 있습니다.
 */
export const SkeletonText: React.FC<SkeletonTextProps> = ({
  lines = 3,
  width = ['100%', '80%', '60%'],
  className,
  lineClassName,
}) => {
  const getLineWidth = (index: number) => {
    if (typeof width === 'string' || typeof width === 'number') {
      return width;
    }
    return width[index % width.length];
  };

  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          className={cn('h-4', lineClassName)}
          width={getLineWidth(index)}
        />
      ))}
    </div>
  );
};

interface SkeletonCardProps {
  header?: boolean;
  footer?: boolean;
  image?: boolean;
  imageHeight?: string | number;
  lines?: number;
  className?: string;
}

/**
 * 카드 스켈레톤 컴포넌트
 * 
 * 카드 형태의 콘텐츠를 로딩 중에 표시하는 스켈레톤 UI입니다.
 * 헤더, 이미지, 본문, 푸터 등 다양한 구성 요소를 포함할 수 있습니다.
 */
export const SkeletonCard: React.FC<SkeletonCardProps> = ({
  header = true,
  footer = true,
  image = true,
  imageHeight = 200,
  lines = 3,
  className,
}) => {
  return (
    <div
      className={cn(
        'rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden',
        className
      )}
      aria-hidden="true"
      role="presentation"
    >
      {header && (
        <div className="p-4 border-b">
          <div className="flex items-center space-x-4">
            <Skeleton circle width={40} height={40} />
            <div className="space-y-2">
              <Skeleton className="h-4 w-[120px]" />
              <Skeleton className="h-3 w-[80px]" />
            </div>
          </div>
        </div>
      )}

      {image && (
        <Skeleton
          className="w-full"
          height={imageHeight}
        />
      )}

      <div className="p-4">
        <SkeletonText lines={lines} />
      </div>

      {footer && (
        <div className="p-4 border-t">
          <div className="flex justify-between items-center">
            <Skeleton className="h-9 w-[80px]" />
            <Skeleton className="h-9 w-[120px]" />
          </div>
        </div>
      )}
    </div>
  );
};

interface SkeletonTableProps {
  rows?: number;
  columns?: number;
  showHeader?: boolean;
  className?: string;
}

/**
 * 테이블 스켈레톤 컴포넌트
 * 
 * 테이블 형태의 콘텐츠를 로딩 중에 표시하는 스켈레톤 UI입니다.
 * 행과 열 수를 지정하여 다양한 테이블 크기를 표현할 수 있습니다.
 */
export const SkeletonTable: React.FC<SkeletonTableProps> = ({
  rows = 5,
  columns = 4,
  showHeader = true,
  className,
}) => {
  return (
    <div
      className={cn('w-full overflow-hidden rounded-lg border', className)}
      aria-hidden="true"
      role="presentation"
    >
      <div className="w-full overflow-x-auto">
        <table className="w-full caption-bottom">
          {showHeader && (
            <thead className="border-b bg-muted/50">
              <tr>
                {Array.from({ length: columns }).map((_, index) => (
                  <th key={`header-${index}`} className="p-3">
                    <Skeleton className="h-5 w-full max-w-[120px]" />
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            {Array.from({ length: rows }).map((_, rowIndex) => (
              <tr
                key={`row-${rowIndex}`}
                className="border-b transition-colors hover:bg-muted/50"
              >
                {Array.from({ length: columns }).map((_, colIndex) => (
                  <td key={`cell-${rowIndex}-${colIndex}`} className="p-3">
                    <Skeleton
                      className="h-5"
                      width={`${Math.floor(Math.random() * 50) + 50}%`}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

interface PageSkeletonProps {
  /** 페이지 헤더(제목/필터) 영역 표시 */
  header?: boolean;
  /** 카드 그리드 형태(레이아웃 시프트 방지) */
  variant?: 'list' | 'grid' | 'table' | 'detail';
  /** 표시할 카드/행 개수 */
  count?: number;
  className?: string;
}

/**
 * 페이지 단위 스켈레톤 - admin/trainer/일반 페이지에서 공통으로 사용해
 * 로딩 시 레이아웃 시프트와 빈 화면을 방지합니다.
 */
export const PageSkeleton: React.FC<PageSkeletonProps> = ({
  header = true,
  variant = 'list',
  count = 6,
  className,
}) => {
  return (
    <div
      className={cn('w-full space-y-6 p-4 md:p-6', className)}
      aria-busy="true"
      aria-live="polite"
    >
      {header && (
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-72 max-w-full" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-24" />
          </div>
        </div>
      )}

      {variant === 'table' && (
        <SkeletonTable rows={count} columns={5} />
      )}

      {variant === 'grid' && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: count }).map((_, i) => (
            <SkeletonCard key={i} image lines={2} footer={false} imageHeight={140} />
          ))}
        </div>
      )}

      {variant === 'list' && (
        <div className="space-y-3">
          {Array.from({ length: count }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 rounded-lg border bg-card p-4"
            >
              <Skeleton circle width={48} height={48} />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-2/3" />
              </div>
              <Skeleton className="h-8 w-20" />
            </div>
          ))}
        </div>
      )}

      {variant === 'detail' && (
        <div className="space-y-4">
          <Skeleton className="h-48 w-full" />
          <SkeletonText lines={4} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <SkeletonCard image={false} footer={false} lines={3} />
            <SkeletonCard image={false} footer={false} lines={3} />
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * 데이터 전환(탭/필터 변경) 시 사용할 오버레이 - isFetching 중일 때
 * 이전 데이터 위에 살짝 표시해 잔존 데이터로 인한 혼동을 줄입니다.
 */
interface FetchingOverlayProps {
  isFetching: boolean;
  label?: string;
  className?: string;
  children?: React.ReactNode;
}

export const FetchingOverlay: React.FC<FetchingOverlayProps> = ({
  isFetching,
  label = '불러오는 중...',
  className,
  children,
}) => {
  if (children === undefined) {
    if (!isFetching) return null;
    return (
      <div
        className="pointer-events-none absolute inset-0 z-10 flex items-start justify-center pt-4"
        aria-live="polite"
      >
        <div className="flex items-center gap-2 rounded-full border bg-background/90 px-3 py-1 text-xs text-muted-foreground shadow-sm backdrop-blur">
          <span className="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          {label}
        </div>
      </div>
    );
  }
  return (
    <div className={`relative ${className ?? ''}`} aria-busy={isFetching}>
      <div className={isFetching ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
        {children}
      </div>
      {isFetching && (
        <div
          className="pointer-events-none absolute inset-x-0 top-2 z-10 flex justify-center"
          aria-live="polite"
        >
          <div className="flex items-center gap-2 rounded-full border bg-background/90 px-3 py-1 text-xs text-muted-foreground shadow-sm backdrop-blur">
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            {label}
          </div>
        </div>
      )}
    </div>
  );
};
