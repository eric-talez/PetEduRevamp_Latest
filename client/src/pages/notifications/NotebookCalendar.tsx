import React from 'react';
import { ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, isToday, addMonths, subMonths } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { NotebookEntry } from './types';

interface NotebookCalendarProps {
  currentMonth: Date;
  selectedDate: Date;
  entries: NotebookEntry[];
  onDateSelect: (date: Date) => void;
  onMonthChange: (date: Date) => void;
}

export function NotebookCalendar({
  currentMonth,
  selectedDate,
  entries,
  onDateSelect,
  onMonthChange
}: NotebookCalendarProps) {
  // 달력 네비게이션 핸들러
  const handlePrevMonth = () => {
    onMonthChange(subMonths(currentMonth, 1));
  };
  
  const handleNextMonth = () => {
    onMonthChange(addMonths(currentMonth, 1));
  };
  
  const handleToday = () => {
    onMonthChange(new Date());
    onDateSelect(new Date());
  };
  
  // 캘린더 헤더 (요일)
  const weekDays = ['일', '월', '화', '수', '목', '금', '토'];
  
  // 달력 날짜 계산
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);
  
  const days = eachDayOfInterval({ start: startDate, end: endDate });
  
  // 특정 날짜의 항목 수 계산
  const getEntryCountForDate = (date: Date) => {
    return entries.filter(entry => {
      const entryDate = new Date(entry.date);
      return isSameDay(entryDate, date);
    }).length;
  };
  
  // 특정 날짜의 중요 항목 여부 확인
  const hasImportantEntry = (date: Date) => {
    return entries.some(entry => {
      const entryDate = new Date(entry.date);
      return isSameDay(entryDate, date) && entry.isImportant;
    });
  };
  
  return (
    <div className="border rounded-lg overflow-hidden">
      {/* 캘린더 헤더 */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-4">
          <div className="font-medium">{format(currentMonth, 'yyyy년 M월', { locale: ko })}</div>
          <div className="flex space-x-1">
            <Button variant="outline" size="icon" onClick={handlePrevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleToday}>
              오늘
            </Button>
            <Button variant="outline" size="icon" onClick={handleNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* 요일 헤더 */}
        <div className="grid grid-cols-7 text-center text-xs font-medium text-gray-500 dark:text-gray-400">
          {weekDays.map((day, i) => (
            <div key={i} className="py-1">
              {day}
            </div>
          ))}
        </div>
      </div>
      
      {/* 캘린더 그리드 */}
      <div className="grid grid-cols-7 bg-gray-50 dark:bg-gray-900 text-sm">
        {days.map((day, dayIdx) => {
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isSelectedDay = isSameDay(day, selectedDate);
          const entryCount = getEntryCountForDate(day);
          const hasImportant = hasImportantEntry(day);
          
          return (
            <button
              key={dayIdx}
              onClick={() => onDateSelect(day)}
              className={cn(
                "relative h-14 p-1 flex flex-col border-t border-l",
                dayIdx % 7 === 6 && "border-r",
                Math.floor(dayIdx / 7) === Math.floor(days.length / 7) - 1 && "border-b",
                !isCurrentMonth && "text-gray-400 dark:text-gray-600 bg-gray-100 dark:bg-gray-800/50",
                isSelectedDay && "bg-primary/10 font-semibold",
                isToday(day) && !isSelectedDay && "bg-warning/10 dark:bg-warning/10"
              )}
            >
              <time
                dateTime={format(day, 'yyyy-MM-dd')}
                className={cn(
                  "ml-auto font-semibold text-xs",
                  isToday(day) && "bg-primary text-white rounded-full w-5 h-5 flex items-center justify-center"
                )}
              >
                {format(day, 'd')}
              </time>
              
              {entryCount > 0 && (
                <div className="mt-auto flex items-center justify-between">
                  <span className="text-[10px] bg-primary/10 dark:bg-primary/30 text-primary dark:text-primary px-1 rounded">
                    {entryCount}개
                  </span>
                  
                  {hasImportant && (
                    <AlertCircle className="h-3 w-3 text-warning" />
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}