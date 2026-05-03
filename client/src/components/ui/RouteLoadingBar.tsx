import React from 'react';
import { cn } from '@/lib/utils';
import { useRouteLoading } from '@/hooks/use-route-loading';

interface RouteLoadingBarProps {
  className?: string;
  height?: number;
  color?: string;
  position?: 'top' | 'bottom';
}

export const RouteLoadingBar: React.FC<RouteLoadingBarProps> = ({ 
  className = '', 
  height = 3, 
  color = 'bg-primary',
  position = 'top' 
}) => {
  const { isLoading, progress } = useRouteLoading();
  
  if (!isLoading) return null;
  
  return (
    <div 
      className={cn(
        'fixed left-0 right-0 z-50 overflow-hidden',
        position === 'top' ? 'top-0' : 'bottom-0',
        className
      )}
      style={{ height: `${height}px` }}
    >
      <div 
        className={cn(
          'h-full transition-all duration-300 ease-out',
          color,
          'shadow-sm'
        )}
        style={{ 
          width: `${progress}%`,
          background: 'linear-gradient(90deg, hsl(var(--primary)) 0%, hsl(var(--secondary)) 100%)'
        }}
      />
      
      {/* 글로우 효과 */}
      <div 
        className="absolute top-0 h-full bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse"
        style={{ 
          width: `${Math.min(progress + 20, 100)}%`,
          left: `${Math.max(progress - 20, 0)}%`
        }}
      />
    </div>
  );
};

// 로딩 메시지 컴포넌트
export const RouteLoadingMessage: React.FC<{
  className?: string;
  showMessage?: boolean;
}> = ({ className = '', showMessage = true }) => {
  const { isLoading, loadingMessage } = useRouteLoading();
  
  if (!isLoading || !showMessage) return null;
  
  return (
    <div 
      className={cn(
        'fixed top-4 left-1/2 transform -translate-x-1/2 z-50',
        'bg-background/95 backdrop-blur-sm border rounded-lg px-4 py-2 shadow-lg',
        'animate-in fade-in-0 slide-in-from-top-2 duration-300',
        className
      )}
    >
      <div className="flex items-center space-x-2">
        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-sm font-medium text-muted-foreground">
          {loadingMessage}
        </span>
      </div>
    </div>
  );
};

// 풀스크린 로딩 오버레이 (필요시)
export const RouteLoadingOverlay: React.FC<{
  className?: string;
  blur?: boolean;
}> = ({ className = '', blur = false }) => {
  const { isLoading, loadingMessage } = useRouteLoading();
  
  if (!isLoading) return null;
  
  return (
    <div 
      className={cn(
        'fixed inset-0 z-40 flex items-center justify-center',
        'bg-background/80',
        blur && 'backdrop-blur-sm',
        'animate-in fade-in-0 duration-300',
        className
      )}
    >
      <div className="flex flex-col items-center space-y-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-lg font-medium text-muted-foreground">
          {loadingMessage}
        </p>
      </div>
    </div>
  );
};

// 스켈레톤 컴포넌트들
export const SkeletonCard: React.FC<{
  className?: string;
  height?: string;
}> = ({ className = '', height = 'h-32' }) => (
  <div className={cn('animate-pulse bg-muted rounded-lg', height, className)} />
);

export const SkeletonText: React.FC<{
  className?: string;
  lines?: number;
}> = ({ className = '', lines = 3 }) => (
  <div className={cn('space-y-2', className)}>
    {Array.from({ length: lines }).map((_, i) => (
      <div 
        key={i} 
        className="animate-pulse bg-muted rounded h-4"
        style={{ width: `${Math.random() * 40 + 60}%` }}
      />
    ))}
  </div>
);

export const SkeletonAvatar: React.FC<{
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}> = ({ className = '', size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16'
  };
  
  return (
    <div className={cn('animate-pulse bg-muted rounded-full', sizeClasses[size], className)} />
  );
};

// 페이지별 스켈레톤 레이아웃
export const DashboardSkeleton: React.FC = () => (
  <div className="space-y-6 p-6">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <SkeletonCard key={i} height="h-24" />
      ))}
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <SkeletonCard height="h-64" />
      <SkeletonCard height="h-64" />
    </div>
  </div>
);

export const CourseSkeleton: React.FC = () => (
  <div className="space-y-6 p-6">
    <div className="flex justify-between items-center">
      <SkeletonText lines={1} className="w-48" />
      <SkeletonCard className="w-32" height="h-10" />
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="space-y-4">
          <SkeletonCard height="h-48" />
          <SkeletonText lines={2} />
        </div>
      ))}
    </div>
  </div>
);

export const TrainerSkeleton: React.FC = () => (
  <div className="space-y-6 p-6">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="space-y-4">
          <div className="flex items-center space-x-4">
            <SkeletonAvatar size="lg" />
            <div className="flex-1">
              <SkeletonText lines={2} />
            </div>
          </div>
          <SkeletonCard height="h-32" />
        </div>
      ))}
    </div>
  </div>
);