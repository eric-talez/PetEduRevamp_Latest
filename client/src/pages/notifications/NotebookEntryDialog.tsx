import React, { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { NotebookEntry } from './types';
import { 
  AlertCircle, 
  MessageSquare, 
  ThumbsUp, 
  Bookmark, 
  BookmarkCheck, 
  Printer, 
  Share2, 
  Copy, 
  Edit, 
  Trash,
  Image as ImageIcon,
  Video
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface NotebookEntryDialogProps {
  entry: NotebookEntry;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onToggleFavorite: (entryId: string, isFavorite: boolean) => void;
  onToggleLike: (entryId: string, hasLiked: boolean) => void;
  onEdit?: (entry: NotebookEntry) => void;
  onDelete?: (entryId: string) => void;
  canEdit: boolean;
}

export function NotebookEntryDialog({
  entry,
  open,
  onOpenChange,
  onToggleFavorite,
  onToggleLike,
  onEdit,
  onDelete,
  canEdit
}: NotebookEntryDialogProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<string>('content');
  const [comment, setComment] = useState<string>('');
  
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
  const formattedTime = entry.createdAt ? format(parseISO(entry.createdAt), 'HH:mm', { locale: ko }) : '';
  
  // 텍스트 복사
  const handleCopyText = () => {
    navigator.clipboard.writeText(entry.content);
    toast({
      title: "복사 완료",
      description: "알림장 내용이 클립보드에 복사되었습니다.",
    });
  };
  
  // 댓글 제출
  const handleSubmitComment = () => {
    if (!comment.trim()) {
      toast({
        title: "댓글 내용을 입력하세요",
        variant: "destructive",
      });
      return;
    }
    
    // 댓글 추가 로직 (실제 구현 필요)
    toast({
      title: "댓글이 추가되었습니다",
    });
    setComment('');
  };
  
  // 인쇄
  const handlePrint = () => {
    const printContent = `
      <html>
        <head>
          <title>알림장: ${entry.petName} - ${formattedDate}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
            h1 { font-size: 18px; margin-bottom: 5px; }
            .meta { font-size: 12px; color: hsl(var(--muted-foreground)); margin-bottom: 20px; }
            .content { white-space: pre-line; margin-bottom: 20px; }
            .activities { margin-bottom: 20px; }
            .activity { display: inline-block; padding: 3px 8px; background: hsl(var(--muted)); border-radius: 4px; margin-right: 5px; font-size: 12px; }
          </style>
        </head>
        <body>
          <h1>${entry.petName}의 알림장</h1>
          <div class="meta">
            작성자: ${entry.author.name} | 날짜: ${formattedDate} | 상태: ${entry.status}
          </div>
          <div class="content">${entry.content}</div>
          ${entry.activities.length > 0 ? `
            <div class="activities">
              <strong>진행 활동:</strong>
              ${entry.activities.map(activity => `<span class="activity">${activity}</span>`).join(' ')}
            </div>
          ` : ''}
          <div class="footer">
            * 이 알림장은 ${formattedDate} ${formattedTime}에 ${entry.author.name}에 의해 작성되었습니다.
          </div>
        </body>
      </html>
    `;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 500);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={entry.author.avatar} alt={entry.author.name} />
                <AvatarFallback>{entry.author.name.substring(0, 2)}</AvatarFallback>
              </Avatar>
              <div>
                <DialogTitle className="text-lg flex items-center">
                  <span className="mr-2">{entry.petName}의 알림장</span>
                  {entry.isImportant && <AlertCircle className="h-4 w-4 text-warning" />}
                </DialogTitle>
                <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                  <span className="font-medium">{entry.author.name}</span>
                  <span className="text-gray-400">•</span>
                  <span>{formattedDate}</span>
                  <span className="text-gray-400">•</span>
                  {getStatusBadge()}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-1">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={handleCopyText}
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={handlePrint}
              >
                <Printer className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={(e) => onToggleFavorite(entry.id, !entry.isFavorite)}
              >
                {entry.isFavorite ? (
                  <BookmarkCheck className="h-4 w-4 text-primary" />
                ) : (
                  <Bookmark className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </DialogHeader>
        
        <Tabs defaultValue="content" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-2">
            <TabsTrigger value="content">알림장 내용</TabsTrigger>
            <TabsTrigger value="comments">
              댓글
              {entry.reactions?.comments ? (
                <Badge variant="secondary" className="ml-2 pointer-events-none">
                  {entry.reactions.comments}
                </Badge>
              ) : null}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="content" className="space-y-4">
            {/* 알림장 내용 */}
            <div className="whitespace-pre-line p-4 rounded-md bg-gray-50 dark:bg-gray-900 min-h-[200px]">
              {entry.content}
            </div>
            
            {/* 활동 목록 */}
            {entry.activities.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">진행 활동</h4>
                <div className="flex flex-wrap gap-1.5">
                  {entry.activities.map(activity => (
                    <Badge key={activity} variant="outline">
                      {activity}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
            {/* 미디어 파일 */}
            {entry.media && entry.media.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">첨부 파일</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {entry.media.map((item, index) => (
                    <Card key={index} className="overflow-hidden h-40">
                      <CardContent className="p-2 h-full relative">
                        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
                          {item.type === 'image' ? (
                            <ImageIcon className="h-12 w-12 text-gray-400" />
                          ) : (
                            <Video className="h-12 w-12 text-gray-400" />
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
            
            {/* 태그 */}
            {entry.tags.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">태그</h4>
                <div className="flex flex-wrap gap-1.5">
                  {entry.tags.map(tag => (
                    <Badge key={tag} variant="outline" className="bg-primary/10 dark:bg-primary/20">
                      #{tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
            <div className="pt-4 flex items-center justify-between text-sm text-gray-500">
              <div className="flex items-center space-x-4">
                <button 
                  className={cn(
                    "flex items-center space-x-1", 
                    entry.reactions?.hasLiked && "text-primary"
                  )}
                  onClick={() => onToggleLike(entry.id, !entry.reactions?.hasLiked)}
                >
                  <ThumbsUp className="h-4 w-4" />
                  <span>{entry.reactions?.likes || 0}</span>
                </button>
                
                <button 
                  className="flex items-center space-x-1"
                  onClick={() => setActiveTab('comments')}
                >
                  <MessageSquare className="h-4 w-4" />
                  <span>{entry.reactions?.comments || 0}</span>
                </button>
              </div>
              
              <div className="text-xs text-gray-400">
                작성: {entry.createdAt ? format(parseISO(entry.createdAt), 'yyyy.MM.dd HH:mm') : ''}
                {entry.updatedAt && entry.updatedAt !== entry.createdAt ? 
                  ` · 수정: ${format(parseISO(entry.updatedAt), 'yyyy.MM.dd HH:mm')}` 
                  : ''
                }
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="comments" className="space-y-4">
            {/* 댓글 입력 영역 */}
            <div className="space-y-2">
              <Textarea 
                placeholder="댓글을 입력하세요..." 
                value={comment}
                onChange={e => setComment(e.target.value)}
                className="min-h-[100px]"
              />
              <div className="flex justify-end">
                <Button onClick={handleSubmitComment}>
                  <MessageSquare className="mr-2 h-4 w-4" />
                  댓글 작성
                </Button>
              </div>
            </div>
            
            <Separator />
            
            {/* 댓글 목록 (예시) */}
            <div className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>사용자</AvatarFallback>
                  </Avatar>
                  <div className="space-y-1">
                    <div className="flex items-baseline gap-2">
                      <span className="font-medium">훈련사</span>
                      <span className="text-xs text-gray-400">3일 전</span>
                    </div>
                    <p className="text-sm">
                      훈련 진행이 매우 좋습니다. 다음주에는 좀 더 심화된 내용으로 진행해보겠습니다.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>사용자</AvatarFallback>
                  </Avatar>
                  <div className="space-y-1">
                    <div className="flex items-baseline gap-2">
                      <span className="font-medium">반려인</span>
                      <span className="text-xs text-gray-400">1일 전</span>
                    </div>
                    <p className="text-sm">
                      감사합니다. 집에서도 훈련 내용을 계속 연습하고 있어요.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
        
        <DialogFooter className="sm:justify-between">
          <div className="flex items-center gap-2">
            {canEdit && (
              <>
                {onEdit && (
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      onEdit(entry);
                      onOpenChange(false);
                    }}
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    수정
                  </Button>
                )}
                
                {onDelete && (
                  <Button 
                    variant="destructive"
                    onClick={() => {
                      if (window.confirm('정말로 이 알림장을 삭제하시겠습니까?')) {
                        onDelete(entry.id);
                        onOpenChange(false);
                      }
                    }}
                  >
                    <Trash className="mr-2 h-4 w-4" />
                    삭제
                  </Button>
                )}
              </>
            )}
          </div>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
          >
            닫기
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}