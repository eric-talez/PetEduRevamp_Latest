import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Loader2, Brain, Heart, PawPrint, FileText, Star, Zap, Target, CheckCircle, TrendingUp } from 'lucide-react';

export default function GeminiTest() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>({});
  const [fusedResults, setFusedResults] = useState<any>({});

  // 반려동물 행동 분석
  const [behaviorDescription, setBehaviorDescription] = useState('');
  
  // 훈련 계획 생성
  const [trainingData, setTrainingData] = useState({
    breed: '',
    age: '',
    issue: '',
    experience: ''
  });

  // 건강 증상 분석
  const [symptoms, setSymptoms] = useState('');
  
  // 텍스트 요약
  const [textToSummarize, setTextToSummarize] = useState('');
  
  // 감정 분석
  const [sentimentText, setSentimentText] = useState('');

  const handleBehaviorAnalysis = async () => {
    if (!behaviorDescription.trim()) {
      toast({
        title: "오류",
        description: "행동 설명을 입력해주세요.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const response = await apiRequest('POST', '/api/ai/analyze-behavior', {
        description: behaviorDescription
      });
      
      setResults(prev => ({ ...prev, behavior: response.analysis }));
      toast({
        title: "분석 완료",
        description: "반려동물 행동 분석이 완료되었습니다."
      });
    } catch (error) {
      toast({
        title: "오류",
        description: "행동 분석 중 오류가 발생했습니다.",
        variant: "danger"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTrainingPlan = async () => {
    if (!trainingData.breed || !trainingData.age || !trainingData.issue || !trainingData.experience) {
      toast({
        title: "오류",
        description: "모든 정보를 입력해주세요.",
        variant: "danger"
      });
      return;
    }

    setLoading(true);
    try {
      const response = await apiRequest('POST', '/api/ai/generate-training-plan', trainingData);
      
      setResults(prev => ({ ...prev, training: response.trainingPlan }));
      toast({
        title: "생성 완료",
        description: "훈련 계획이 생성되었습니다."
      });
    } catch (error) {
      toast({
        title: "오류",
        description: "훈련 계획 생성 중 오류가 발생했습니다.",
        variant: "danger"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleHealthAnalysis = async () => {
    if (!symptoms.trim()) {
      toast({
        title: "오류",
        description: "증상을 입력해주세요.",
        variant: "danger"
      });
      return;
    }

    setLoading(true);
    try {
      const response = await apiRequest('POST', '/api/ai/analyze-health', {
        symptoms: symptoms
      });
      
      setResults(prev => ({ ...prev, health: response.analysis }));
      toast({
        title: "분석 완료",
        description: "건강 증상 분석이 완료되었습니다."
      });
    } catch (error) {
      toast({
        title: "오류",
        description: "건강 분석 중 오류가 발생했습니다.",
        variant: "danger"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTextSummarize = async () => {
    if (!textToSummarize.trim()) {
      toast({
        title: "오류",
        description: "요약할 텍스트를 입력해주세요.",
        variant: "danger"
      });
      return;
    }

    setLoading(true);
    try {
      const response = await apiRequest('POST', '/api/ai/summarize', {
        text: textToSummarize
      });
      
      setResults(prev => ({ ...prev, summary: response.summary }));
      toast({
        title: "요약 완료",
        description: "텍스트 요약이 완료되었습니다."
      });
    } catch (error) {
      toast({
        title: "오류",
        description: "텍스트 요약 중 오류가 발생했습니다.",
        variant: "danger"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSentimentAnalysis = async () => {
    if (!sentimentText.trim()) {
      toast({
        title: "오류",
        description: "분석할 텍스트를 입력해주세요.",
        variant: "danger"
      });
      return;
    }

    setLoading(true);
    try {
      const response = await apiRequest('POST', '/api/ai/analyze-sentiment', {
        text: sentimentText
      });
      
      setResults(prev => ({ ...prev, sentiment: response }));
      toast({
        title: "분석 완료",
        description: "감정 분석이 완료되었습니다."
      });
    } catch (error) {
      toast({
        title: "오류",
        description: "감정 분석 중 오류가 발생했습니다.",
        variant: "danger"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Gemini AI 테스트</h1>
        <p className="text-gray-600">Google Gemini AI 기능을 테스트해보세요</p>
      </div>

      <Tabs defaultValue="behavior" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="behavior" className="flex items-center gap-2">
            <PawPrint className="h-4 w-4" />
            행동 분석
          </TabsTrigger>
          <TabsTrigger value="training" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            훈련 계획
          </TabsTrigger>
          <TabsTrigger value="health" className="flex items-center gap-2">
            <Heart className="h-4 w-4" />
            건강 분석
          </TabsTrigger>
          <TabsTrigger value="summary" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            텍스트 요약
          </TabsTrigger>
          <TabsTrigger value="sentiment" className="flex items-center gap-2">
            <Star className="h-4 w-4" />
            감정 분석
          </TabsTrigger>
        </TabsList>

        <TabsContent value="behavior" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>반려동물 행동 분석</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="behavior">행동 설명</Label>
                  <Textarea
                    id="behavior"
                    placeholder="반려동물의 문제 행동을 자세히 설명해주세요..."
                    value={behaviorDescription}
                    onChange={(e) => setBehaviorDescription(e.target.value)}
                    rows={4}
                  />
                </div>
                <Button 
                  onClick={handleBehaviorAnalysis} 
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      분석 중...
                    </>
                  ) : (
                    '행동 분석하기'
                  )}
                </Button>
              </CardContent>
            </Card>

            {results.behavior && (
              <Card>
                <CardHeader>
                  <CardTitle>분석 결과</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-sm max-w-none">
                    <p className="whitespace-pre-wrap">{results.behavior}</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="training" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>맞춤형 훈련 계획 생성</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="breed">견종</Label>
                  <Input
                    id="breed"
                    placeholder="예: 골든 리트리버"
                    value={trainingData.breed}
                    onChange={(e) => setTrainingData(prev => ({ ...prev, breed: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="age">나이</Label>
                  <Input
                    id="age"
                    placeholder="예: 1살 6개월"
                    value={trainingData.age}
                    onChange={(e) => setTrainingData(prev => ({ ...prev, age: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="issue">문제 행동</Label>
                  <Input
                    id="issue"
                    placeholder="예: 짖음, 분리불안"
                    value={trainingData.issue}
                    onChange={(e) => setTrainingData(prev => ({ ...prev, issue: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="experience">주인 경험</Label>
                  <Input
                    id="experience"
                    placeholder="예: 초보자, 경험자"
                    value={trainingData.experience}
                    onChange={(e) => setTrainingData(prev => ({ ...prev, experience: e.target.value }))}
                  />
                </div>
                <Button 
                  onClick={handleTrainingPlan} 
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      생성 중...
                    </>
                  ) : (
                    '훈련 계획 생성하기'
                  )}
                </Button>
              </CardContent>
            </Card>

            {results.training && (
              <Card>
                <CardHeader>
                  <CardTitle>훈련 계획</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-sm max-w-none">
                    <p className="whitespace-pre-wrap">{results.training}</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="health" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>건강 증상 분석</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="symptoms">증상 설명</Label>
                  <Textarea
                    id="symptoms"
                    placeholder="반려동물의 증상을 자세히 설명해주세요..."
                    value={symptoms}
                    onChange={(e) => setSymptoms(e.target.value)}
                    rows={4}
                  />
                </div>
                <Button 
                  onClick={handleHealthAnalysis} 
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      분석 중...
                    </>
                  ) : (
                    '증상 분석하기'
                  )}
                </Button>
              </CardContent>
            </Card>

            {results.health && (
              <Card>
                <CardHeader>
                  <CardTitle>건강 분석 결과</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-sm max-w-none">
                    <p className="whitespace-pre-wrap">{results.health}</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="summary" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>텍스트 요약</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="text">요약할 텍스트</Label>
                  <Textarea
                    id="text"
                    placeholder="요약할 긴 텍스트를 입력해주세요..."
                    value={textToSummarize}
                    onChange={(e) => setTextToSummarize(e.target.value)}
                    rows={6}
                  />
                </div>
                <Button 
                  onClick={handleTextSummarize} 
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      요약 중...
                    </>
                  ) : (
                    '텍스트 요약하기'
                  )}
                </Button>
              </CardContent>
            </Card>

            {results.summary && (
              <Card>
                <CardHeader>
                  <CardTitle>요약 결과</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-sm max-w-none">
                    <p className="whitespace-pre-wrap">{results.summary}</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="sentiment" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>감정 분석</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="sentiment">분석할 텍스트</Label>
                  <Textarea
                    id="sentiment"
                    placeholder="감정을 분석할 텍스트를 입력해주세요..."
                    value={sentimentText}
                    onChange={(e) => setSentimentText(e.target.value)}
                    rows={4}
                  />
                </div>
                <Button 
                  onClick={handleSentimentAnalysis} 
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      분석 중...
                    </>
                  ) : (
                    '감정 분석하기'
                  )}
                </Button>
              </CardContent>
            </Card>

            {results.sentiment && (
              <Card>
                <CardHeader>
                  <CardTitle>감정 분석 결과</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <Label>감정 평점</Label>
                      <div className="flex items-center gap-2">
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star 
                              key={star} 
                              className={`h-5 w-5 ${star <= results.sentiment.rating ? 'text-warning fill-current' : 'text-gray-300'}`} 
                            />
                          ))}
                        </div>
                        <span className="text-sm text-gray-600">
                          {results.sentiment.rating}/5
                        </span>
                      </div>
                    </div>
                    <div>
                      <Label>신뢰도</Label>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full" 
                          style={{ width: `${results.sentiment.confidence * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-sm text-gray-600">
                        {Math.round(results.sentiment.confidence * 100)}%
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}