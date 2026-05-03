import React from 'react';
import { format, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ThumbsUp, MessageSquare, Bookmark, BookmarkCheck, AlertCircle, Image as ImageIcon, FileText } from 'lucide-react';
import { NotebookEntry } from './types';
import { cn } from '@/lib/utils';

interface NotebookEntryCardProps {
  entry: NotebookEntry;
  onClick: (entry: NotebookEntry) => void;
  onToggleFavorite: (entryId: string, isFavorite: boolean) => void;
  onToggleLike: (entryId: string, hasLiked: boolean) => void;
}

export function NotebookEntryCard({
  entry,
  onClick,
  onToggleFavorite,
  onToggleLike
}: NotebookEntryCardProps) {
  // 상태에 따른 배지 색상 및 텍스트
  const getStatusBadge = () => {
    switch (entry.status) {
      case 'completed':
        return <Badge className="bg-success/10 text-success hover:bg-success/10 dark:bg-success/30 dark:text-success border-success/30 dark:border-success/50">완료됨</Badge>;
      case 'in-progress':
        return <Badge className="bg-primary/10 text-primary hover:bg-primary/10 dark:bg-primary/30 dark:text-primary border-primary/30 dark:border-primary/50">진행중</Badge>;
      case 'planned':
        return <Badge className="bg-warning/10 text-warning hover:bg-warning/10 dark:bg-warning/30 dark:text-warning border-warning/30 dark:border-warning/50">예정됨</Badge>;
      default:
        return null;
    }
  };
  
  // 날짜 포맷팅
  const formattedDate = format(parseISO(entry.date), 'yyyy년 M월 d일 (EEEE)', { locale: ko });
  
  // 내용 전처리 (줄바꿈 유지)
  const formattedContent = entry.content.length > 150 
    ? `${entry.content.substring(0, 150)}...` 
    : entry.content;
  
  return (
    <Card 
      className={cn(
        "transition-shadow hover:shadow-md cursor-pointer relative",
        entry.isImportant && "border-l-4 border-l-amber-500"
      )}
      onClick={() => onClick(entry)}
    >
      {entry.isImportant && (
        <div className="absolute top-2 right-2">
          <AlertCircle className="h-4 w-4 text-warning" />
        </div>
      )}
      
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div className="flex items-center">
            <Avatar className="h-8 w-8 mr-2">
              <AvatarImage src={entry.author.avatar} alt={entry.author.name} />
              <AvatarFallback>{entry.author.name.substring(0, 2)}</AvatarFallback>
            </Avatar>
            <div>
              <div className="font-medium">{entry.author.name}</div>
              <div className="text-xs text-gray-500">{formattedDate}</div>
            </div>
          </div>
          <div className="flex items-center space-x-1">
            {getStatusBadge()}
            <Badge variant="outline">{entry.petName}</Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="whitespace-pre-line text-sm">
          {formattedContent}
        </div>
        
        {/* 활동 태그 */}
        {entry.activities.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {entry.activities.map(activity => (
              <Badge key={activity} variant="outline" className="text-xs px-2 py-0">
                {activity}
              </Badge>
            ))}
          </div>
        )}
        
        {/* 미디어 표시 */}
        {entry.media && entry.media.length > 0 && (
          <div className="mt-3 flex gap-2">
            {entry.media.map((item, index) => (
              <div key={index} className="relative rounded-md overflow-hidden bg-gray-100 dark:bg-gray-800 w-16 h-16">
                {item.type === 'image' ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <ImageIcon className="h-6 w-6 text-gray-400" />
                  </div>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <FileText className="h-6 w-6 text-gray-400" />
                  </div>
                )}
              </div>
            ))}
            {entry.media.length > 3 && (
              <div className="relative rounded-md overflow-hidden bg-gray-100 dark:bg-gray-800 w-16 h-16 flex items-center justify-center text-gray-500">
                +{entry.media.length - 3}
              </div>
            )}
          </div>
        )}
      </CardContent>
      
      <CardFooter className="pt-0 pb-3">
        <div className="flex items-center justify-between w-full text-sm text-gray-500">
          <div className="flex items-center space-x-4">
            <button 
              className={cn(
                "flex items-center space-x-1", 
                entry.reactions?.hasLiked && "text-primary"
              )}
              onClick={(e) => {
                e.stopPropagation();
                onToggleLike(entry.id, !entry.reactions?.hasLiked);
              }}
            >
              <ThumbsUp className="h-4 w-4" />
              <span>{entry.reactions?.likes || 0}</span>
            </button>
            
            <div className="flex items-center space-x-1">
              <MessageSquare className="h-4 w-4" />
              <span>{entry.reactions?.comments || 0}</span>
            </div>
          </div>
          
          <button 
            className="text-gray-400 hover:text-primary"
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(entry.id, !entry.isFavorite);
            }}
          >
            {entry.isFavorite ? (
              <BookmarkCheck className="h-4 w-4" />
            ) : (
              <Bookmark className="h-4 w-4" />
            )}
          </button>
        </div>
      </CardFooter>
    </Card>
  );
}