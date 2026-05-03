import React, { useState } from 'react';
import { MessageSquare, Printer, Download, Sparkles, Calendar, List, HelpCircle, Filter, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

interface NotebookHeaderProps {
  onPrint: () => void;
  onExport: () => void;
  onShowAIHelper: () => void;
  onCreateEntry: () => void;
  onViewModeChange: (mode: 'list' | 'calendar') => void;
  viewMode: 'list' | 'calendar';
  totalEntries: number;
  activeFilter: boolean;
  onClearFilters?: () => void;
  sortOrder: string;
  onSortOrderChange: (order: string) => void;
}

export function NotebookHeader({
  onPrint,
  onExport,
  onShowAIHelper,
  onCreateEntry,
  onViewModeChange,
  viewMode,
  totalEntries,
  activeFilter,
  onClearFilters,
  sortOrder,
  onSortOrderChange
}: NotebookHeaderProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">알림장</h1>
          <p className="text-sm text-gray-500 mt-1">
            훈련사와 소통하고 반려동물의 훈련 기록을 관리하세요
            {totalEntries > 0 && (
              <span className="ml-2">
                <Badge variant="outline" className="ml-1">{totalEntries}개의 기록</Badge>
              </span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" onClick={onPrint}>
                  <Printer className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>인쇄하기</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" onClick={onExport}>
                  <Download className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>내보내기</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <Select value={sortOrder} onValueChange={onSortOrderChange}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="정렬 방식" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">최신순</SelectItem>
              <SelectItem value="oldest">오래된순</SelectItem>
              <SelectItem value="important">중요도순</SelectItem>
            </SelectContent>
          </Select>
          
          <div className="flex border rounded-md">
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              className="h-9"
              onClick={() => onViewModeChange('list')}
            >
              <List className="h-4 w-4 mr-1" />
              목록
            </Button>
            <Button
              variant={viewMode === 'calendar' ? 'default' : 'ghost'}
              size="sm"
              className="h-9"
              onClick={() => onViewModeChange('calendar')}
            >
              <Calendar className="h-4 w-4 mr-1" />
              캘린더
            </Button>
          </div>
          
          <Button 
            variant="outline" 
            className="bg-primary/10 text-primary hover:bg-primary/10 dark:bg-primary/20 dark:text-primary dark:hover:bg-primary/30 border-primary/30 dark:border-primary/50"
            onClick={onShowAIHelper}
          >
            <Sparkles className="mr-2 h-4 w-4" />
            AI 도우미
          </Button>
          
          <Button onClick={onCreateEntry}>
            <MessageSquare className="mr-2 h-4 w-4" />
            알림장 작성하기
          </Button>
        </div>
      </div>
      
      {activeFilter && onClearFilters && (
        <div className="flex items-center bg-primary/10 dark:bg-primary/20 p-2 rounded-md">
          <HelpCircle className="h-4 w-4 text-primary mr-2" />
          <span className="text-sm text-primary dark:text-primary">필터가 적용되었습니다.</span>
          <Button variant="ghost" size="sm" className="ml-auto" onClick={onClearFilters}>
            <RefreshCw className="h-3 w-3 mr-1" />
            초기화
          </Button>
        </div>
      )}
    </div>
  );
}