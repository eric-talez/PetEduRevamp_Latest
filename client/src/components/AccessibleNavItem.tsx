import React, { useContext } from 'react';
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { SidebarContext } from "./Sidebar";
import { useLocation } from "wouter";

interface AccessibleNavItemProps {
  href: string;
  icon: React.ReactNode;
  hoverIcon?: React.ReactNode;
  children: React.ReactNode;
  active?: boolean;
  onClick?: (path: string) => void;
  show: boolean;
  highlighted?: boolean;
  badge?: string;
}

/**
 * 접근성이 개선된 네비게이션 아이템 컴포넌트
 * - 사이드바 열림 상태: 아이콘 + 텍스트 표시
 * - 사이드바 닫힘 상태: 아이콘만 표시하되 툴팁으로 제목 표시
 * - 접근성 레이블 추가
 */
export function AccessibleNavItem({ href, icon, hoverIcon, children, active, onClick, show, highlighted, badge }: AccessibleNavItemProps) {
  const { expanded } = useContext(SidebarContext);
  const [, setLocation] = useLocation();
  
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    
    if (onClick) {
      onClick(href);
    } else {
      console.log("기본 네비게이션 시도:", href);
      // wouter를 사용한 라우팅
      setLocation(href);
    }
  };
  
  if (!show) return null;
  
  // 접근성 레이블 생성
  const accessibilityLabel = typeof children === 'string' ? children : children?.toString();
  
  // 닫힌 상태에서는 아이콘만 표시하되 툴팁 제공
  if (!expanded) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <a
              href={href}
              className={cn(
                "sidebar-link flex items-center justify-center py-3 text-xs font-medium rounded-md transition-all duration-200 ease-in-out px-2 group shadow-sm hover:shadow-md focus:ring-2 focus:ring-primary focus:ring-offset-2 min-h-[2.75rem] relative",
                active ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800" : 
                highlighted ? "bg-gradient-to-r from-primary/10 to-secondary/10 dark:from-primary/20 dark:to-secondary/20 text-primary dark:text-primary border border-primary/30 dark:border-primary/40 ring-1 ring-primary/30" :
                "text-gray-700 dark:text-gray-200 hover:text-primary dark:hover:text-primary hover:bg-primary/5 hover:border-primary/20 dark:hover:border-primary/30 border border-transparent hover:scale-105"
              )}
              onClick={handleClick}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  if (onClick) {
                    onClick(href);
                  } else {
                    setLocation(href);
                  }
                }
              }}
              tabIndex={0}
              aria-label={accessibilityLabel}
            >
              <div className="relative w-5 h-5">
                <div className="absolute inset-0 transition-all duration-300 group-hover:scale-0 group-hover:opacity-0">
                  {React.cloneElement(icon as React.ReactElement, { className: cn("w-5 h-5", highlighted && "text-primary dark:text-primary") })}
                </div>
                {hoverIcon && (
                  <div className="absolute inset-0 transition-all duration-300 scale-0 opacity-0 group-hover:scale-110 group-hover:opacity-100 group-hover:rotate-12">
                    {React.cloneElement(hoverIcon as React.ReactElement, { className: "w-5 h-5" })}
                  </div>
                )}
              </div>
              {highlighted && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full animate-pulse" />
              )}
            </a>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>{children}{badge && <span className="ml-1.5 px-1.5 py-0.5 bg-primary/15 dark:bg-primary/25 text-primary dark:text-primary text-[10px] font-medium rounded">{badge}</span>}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  
  // 열린 상태에서는 아이콘 + 텍스트 표시
  return (
    <a
      href={href}
      className={cn(
        "sidebar-link flex items-center py-3 text-xs font-medium rounded-md transition-all duration-200 ease-in-out px-3 group shadow-sm hover:shadow-md min-h-[2.75rem] relative",
        active ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800" : 
        highlighted ? "bg-gradient-to-r from-primary/10 to-secondary/10 dark:from-primary/20 dark:to-secondary/20 text-primary dark:text-primary border border-primary/30 dark:border-primary/40 ring-1 ring-primary/30" :
        "text-gray-700 dark:text-gray-200 hover:text-primary dark:hover:text-primary hover:bg-primary/5 hover:border-primary/20 dark:hover:border-primary/30 border border-transparent hover:scale-105",
        "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
      )}
      onClick={handleClick}
      aria-label={accessibilityLabel}
      aria-current={active ? "page" : undefined}
      tabIndex={0}
      role="menuitem"
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (onClick) {
            onClick(href);
          } else {
            setLocation(href);
          }
        }
      }}
    >
      <div className="relative w-5 h-5 mr-3">
        <div className="absolute inset-0 transition-all duration-300 group-hover:scale-0 group-hover:opacity-0">
          {React.cloneElement(icon as React.ReactElement, { className: cn("w-5 h-5", highlighted && "text-primary dark:text-primary") })}
        </div>
        {hoverIcon && (
          <div className="absolute inset-0 transition-all duration-300 scale-0 opacity-0 group-hover:scale-110 group-hover:opacity-100 group-hover:rotate-12">
            {React.cloneElement(hoverIcon as React.ReactElement, { className: "w-5 h-5" })}
          </div>
        )}
      </div>
      <span className="flex-1 transition-all duration-200 group-hover:translate-x-1">{children}</span>
      {badge && (
        <span className="ml-2 px-1.5 py-0.5 bg-primary/15 dark:bg-primary/25 text-primary dark:text-primary text-[10px] font-medium rounded">
          {badge}
        </span>
      )}
      {highlighted && !badge && (
        <span className="ml-2 w-2 h-2 bg-primary rounded-full animate-pulse" />
      )}
    </a>
  );
}