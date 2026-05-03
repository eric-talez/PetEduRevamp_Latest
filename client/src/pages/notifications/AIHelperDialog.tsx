import React, { useState } from 'react';
import { Sparkles, Copy, Save, Wand2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Activity } from './types';

interface AIHelperDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedPetName: string | null;
  selectedActivities: string[];
  activities: Activity[];
  onContentGenerated: (content: string) => void;
}

export function AIHelperDialog({
  open,
  onOpenChange,
  selectedPetName,
  selectedActivities,
  activities,
  onContentGenerated
}: AIHelperDialogProps) {
  const { toast } = useToast();
  const [aiSuggestion, setAiSuggestion] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [prompt, setPrompt] = useState('');

  // AI 도우미를 사용하여 알림장 내용 생성
  const generateAIContent = async () => {
    if (!prompt) {
      toast({
        title: "입력이 필요합니다",
        description: "AI 도우미를 사용하려면 간단한 지시사항을 입력해주세요.",
        variant: "destructive",
      });
      return;
    }
    
    setAiGenerating(true);
    
    try {
      // 실제 API 호출은 프로덕션 환경에서 구현 필요
      // 데모를 위한 시뮬레이션된 응답
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      let generatedText = "";
      
      // 선택된 반려동물 정보 활용
      const petName = selectedPetName || "반려동물";
      
      if (prompt.includes("훈련") || prompt.includes("산책")) {
        generatedText = `오늘 ${petName}과(와) 함께 훈련을 진행했습니다. 앉아, 기다려, 엎드려 명령에 잘 따르고 있으며 특히 앉아 명령에 대한 반응이 매우 좋아졌습니다. 산책 중에도 다른 강아지를 만났을 때 흥분을 조절하는 능력이 향상되었습니다. 다음 훈련 목표는 '기다려' 명령을 더 오래 유지하는 것입니다.`;
      } else if (prompt.includes("놀이") || prompt.includes("장난감")) {
        generatedText = `오늘은 ${petName}과(와) 새로운 장난감을 가지고 놀았습니다. 특히 인터랙티브 장난감에 흥미를 보였고, 약 30분 동안 집중하여 놀이에 참여했습니다. 놀이 중간에 간식을 주면서 긍정적인 강화를 시켰고, 피로해 보일 때는 휴식을 취하게 했습니다.`;
      } else if (prompt.includes("식사") || prompt.includes("간식")) {
        generatedText = `오늘 ${petName}의 식사 패턴이 매우 좋았습니다. 아침과 저녁 식사를 모두 잘 먹었으며, 간식은 훈련 중에만 소량 제공했습니다. 물도 충분히 마시고 있어 건강한 상태를 유지하고 있습니다. 소화 상태도 양호해 보입니다.`;
      } else {
        generatedText = `오늘 ${petName}의 상태는 전반적으로 좋았습니다. 활기차게 활동했으며 기분도 좋아 보였습니다. 특별한 행동 문제는 관찰되지 않았고, 일상적인 루틴에 잘 적응하고 있습니다. 계속해서 긍정적인 강화와 일관된 훈련을 유지하는 것이 중요해 보입니다.`;
      }
      
      // 선택된 활동이 있으면 내용에 포함
      if (selectedActivities.length > 0) {
        const activityNames = selectedActivities
          .map(actId => activities.find(a => a.id === actId)?.name || "")
          .filter(name => name !== "");
          
        if (activityNames.length > 0) {
          generatedText += `\n\n오늘 진행한 활동: ${activityNames.join(', ')}`;
        }
      }
      
      setAiSuggestion(generatedText);
    } catch (error) {
      console.error("AI 콘텐츠 생성 오류:", error);
      toast({
        title: "콘텐츠 생성 실패",
        description: "AI 도우미를 사용하는 중 오류가 발생했습니다. 나중에 다시 시도해주세요.",
        variant: "destructive",
      });
    } finally {
      setAiGenerating(false);
    }
  };

  const handleApplyContent = () => {
    onContentGenerated(aiSuggestion);
    onOpenChange(false);
    toast({
      title: "내용 적용 완료",
      description: "AI 생성 내용이 알림장에 적용되었습니다.",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Sparkles className="h-5 w-5 mr-2 text-primary" />
            AI 알림장 도우미
          </DialogTitle>
          <DialogDescription>
            AI 도우미가 알림장 내용 작성을 도와드립니다. 간단한 지시사항을 입력해보세요.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="ai-prompt">지시사항</Label>
            <Textarea
              id="ai-prompt"
              placeholder="오늘의 훈련 내용에 대한 알림장을 작성해줘"
              className="min-h-[80px]"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              예시: "산책 훈련에 대한 알림장 작성", "장난감 놀이 기록 작성" 등
            </p>
          </div>
          
          {aiSuggestion && (
            <div className="mt-4">
              <Label>AI 생성 내용</Label>
              <div className="border rounded-md p-4 bg-primary/10 dark:bg-primary/20 mt-2">
                <div className="whitespace-pre-wrap">{aiSuggestion}</div>
                <div className="flex justify-end mt-4">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(aiSuggestion);
                      toast({
                        title: "복사 완료",
                        description: "AI 생성 내용이 클립보드에 복사되었습니다.",
                      });
                    }}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    복사하기
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="ml-2"
                    onClick={handleApplyContent}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    알림장에 적용
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button 
            variant="secondary" 
            onClick={() => onOpenChange(false)}
          >
            취소
          </Button>
          <Button 
            onClick={generateAIContent}
            disabled={aiGenerating}
          >
            {aiGenerating ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                생성 중...
              </>
            ) : (
              <>
                <Wand2 className="mr-2 h-4 w-4" />
                내용 생성하기
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}